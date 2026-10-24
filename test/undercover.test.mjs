import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  WORD_PAIRS,
  selectWordPair,
  initialLobby,
  createInitialPosition,
  containsOwnSecretWord,
  eligibleVoteTargetsFor,
  applySpeak,
  applyVote,
  chooseBotSpeech,
  chooseBotVote,
} from "../widgets/undercover/source/src/rules.ts";

const root = fileURLToPath(new URL("../widgets/undercover", import.meta.url));

function assertStrictJsonValue(val, pathPrefix = "root") {
  assert.notEqual(
    val,
    undefined,
    `Value at ${pathPrefix} must not be undefined (violates jsonValue schema)`,
  );
  if (val === null || typeof val === "string" || typeof val === "boolean") {
    return;
  }
  if (typeof val === "number") {
    assert.equal(
      Number.isFinite(val),
      true,
      `Non-finite number at ${pathPrefix}`,
    );
    return;
  }
  if (Array.isArray(val)) {
    val.forEach((item, idx) =>
      assertStrictJsonValue(item, `${pathPrefix}[${idx}]`),
    );
    return;
  }
  if (typeof val === "object") {
    for (const [k, v] of Object.entries(val)) {
      assertStrictJsonValue(v, `${pathPrefix}.${k}`);
    }
    return;
  }
  assert.fail(`Unsupported type ${typeof val} at ${pathPrefix}`);
}

test("Undercover 1.0.0-preview.10 release package exists and contains verified source files", async () => {
  const pkgPath = path.join(
    root,
    "releases/1.0.0-preview.10/undercover.pudding-widget.json",
  );
  const raw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw);

  assert.equal(pkg.id, "teatak/pudding-hub/widgets/undercover");
  assert.equal(pkg.version, "1.0.0-preview.10");
  assert.equal(pkg.requires.protocolVersion, 24);
  assert.equal(pkg.requires.sdkVersion, "1");

  const requiredFiles = [
    "widget.json",
    "src/App.tsx",
    "src/game.ts",
    "src/rules.ts",
    "src/sound.ts",
    "src/types.ts",
    "src/text.ts",
    "src/words.ts",
    "src/style.css",
  ];
  for (const file of requiredFiles) {
    assert.ok(pkg.source.files[file], `missing file in package: ${file}`);
  }

  const gameSrc = pkg.source.files["src/game.ts"];
  assert.match(gameSrc, /sanitizeJsonValue/);
  assert.match(gameSrc, /readBoard/);
  assert.match(gameSrc, /speak/);
  assert.match(gameSrc, /vote/);
  assert.match(gameSrc, /stepBotTurn/);
});

test("Word bank, custom word pairs, secret word leak guard, and bot clues work accurately", () => {
  assert.ok(WORD_PAIRS.length >= 20);
  for (const pair of WORD_PAIRS) {
    assert.ok(pair.civilianWord.length > 0);
    assert.ok(pair.undercoverWord.length > 0);
    assert.notEqual(pair.civilianWord, pair.undercoverWord);
    assert.ok(pair.civilianClues.length >= 4);
    assert.ok(pair.undercoverClues.length >= 4);
    for (const clue of pair.civilianClues) {
      assert.equal(
        containsOwnSecretWord(clue, pair.civilianWord),
        false,
        `Civilian clue "${clue}" leaked "${pair.civilianWord}"`,
      );
    }
    for (const clue of pair.undercoverClues) {
      assert.equal(
        containsOwnSecretWord(clue, pair.undercoverWord),
        false,
        `Undercover clue "${clue}" leaked "${pair.undercoverWord}"`,
      );
    }
  }

  const customPair = selectWordPair(
    "custom",
    1,
    "手冲咖啡",
    "挂耳咖啡",
  );
  assert.equal(customPair.civilianWord, "手冲咖啡");
  assert.equal(customPair.undercoverWord, "挂耳咖啡");
});

test("Speaking, PK tie-break defense, voting elimination, victory conditions, and strict jsonValue compliance work end-to-end", () => {
  let l = {
    ...initialLobby(),
    round: 1,
    phase: "speaking",
    playerCount: 4,
    undercoverCount: 1,
  };
  let p = createInitialPosition(
    1,
    4,
    1,
    "custom",
    "拿铁",
    "卡布奇诺",
    ["Seat3"], // Seat3 is the Undercover
  );

  assertStrictJsonValue(l, "lobby.initial");
  assertStrictJsonValue(p, "position.initial");
  assert.equal(p.roles.Seat1, "Civilian");
  assert.equal(p.roles.Seat2, "Civilian");
  assert.equal(p.roles.Seat3, "Undercover");
  assert.equal(p.roles.Seat4, "Civilian");
  assert.equal(p.words.Seat1, "拿铁");
  assert.equal(p.words.Seat3, "卡布奇诺");

  // Reject speaking if player leaks their own secret word verbatim
  assert.throws(() => {
    applySpeak(l, p, "Seat1", "我手里拿的是拿铁咖啡");
  }, /不能直接包含机密词条/);

  // All 4 seats speak in Round 1
  for (const seat of ["Seat1", "Seat2", "Seat3", "Seat4"]) {
    const clue = chooseBotSpeech(p, seat);
    assert.equal(containsOwnSecretWord(clue, p.words[seat]), false);
    ({ lobby: l, position: p } = applySpeak(l, p, seat, clue));
    assertStrictJsonValue(p, `position.afterSpeak.${seat}`);
  }

  assert.equal(l.phase, "voting");
  assert.equal(p.turn, "Seat1");

  // Cannot vote for oneself
  assert.throws(() => {
    applyVote(l, p, "Seat1", "Seat1", "投自己");
  }, /不能投票指认自己/);

  // Trigger a 2 vs 2 tie between Seat2 and Seat3 -> triggers PK tie-break!
  ({ lobby: l, position: p } = applyVote(l, p, "Seat1", "Seat3", "3号可疑"));
  ({ lobby: l, position: p } = applyVote(l, p, "Seat2", "Seat3", "跟投3号"));
  ({ lobby: l, position: p } = applyVote(l, p, "Seat3", "Seat2", "反投2号"));
  ({ lobby: l, position: p } = applyVote(l, p, "Seat4", "Seat2", "我也怀疑2号"));

  assertStrictJsonValue(p, "position.afterTieVote");
  assert.equal(l.phase, "speaking");
  assert.equal(p.pkRound, 1);
  assert.deepEqual(p.pkCandidates, ["Seat2", "Seat3"]);
  assert.equal(p.turn, "Seat2");

  // PK defense speeches by Seat2 and Seat3
  ({ lobby: l, position: p } = applySpeak(
    l,
    p,
    "Seat2",
    chooseBotSpeech(p, "Seat2"),
  ));
  ({ lobby: l, position: p } = applySpeak(
    l,
    p,
    "Seat3",
    chooseBotSpeech(p, "Seat3"),
  ));

  assert.equal(l.phase, "voting");
  assert.deepEqual(eligibleVoteTargetsFor(p, "Seat1"), ["Seat2", "Seat3"]);

  // Now majority votes out Seat3 (the Undercover) -> Civilians win immediately!
  ({ lobby: l, position: p } = applyVote(l, p, "Seat1", "Seat3", "锁定3号"));
  ({ lobby: l, position: p } = applyVote(l, p, "Seat2", "Seat3", "就是3号"));
  ({ lobby: l, position: p } = applyVote(l, p, "Seat3", "Seat2", "挣扎一下"));
  ({ lobby: l, position: p } = applyVote(l, p, "Seat4", "Seat3", "投3号出局"));

  assertStrictJsonValue(p, "position.afterVictory");
  assert.equal(l.phase, "finished");
  assert.equal(p.winner, "Civilian");
  assert.equal(p.eliminated.length, 1);
  assert.equal(p.eliminated[0].seat, "Seat3");
  assert.equal(p.eliminated[0].role, "Undercover");

  // Also verify bot vote helper
  const p2 = createInitialPosition(2, 6, 2, "tech");
  const botVote = chooseBotVote(p2, "Seat1");
  assert.notEqual(botVote.target, "Seat1");
  assert.ok(botVote.reason.length > 0);
});
