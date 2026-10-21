import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDeck,
  dealDeck,
  matchCardsFromHand,
  classifyCards,
  canBeat,
  findLegalPlays,
  initialLobby,
  initialPosition,
  applyBid,
  applyPlayCards,
  applyPass,
  chooseBotBid,
  chooseBotPlay,
} from "../widgets/doudizhu/source/src/rules.ts";

const root = fileURLToPath(new URL("../widgets/doudizhu", import.meta.url));

test("Dou Dizhu 1.0.0-preview.1 release package exists and contains verified source files", async () => {
  const pkgPath = path.join(
    root,
    "releases/1.0.0-preview.1/doudizhu.pudding-widget.json",
  );
  const raw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw);

  assert.equal(pkg.id, "teatak/pudding-hub/widgets/doudizhu");
  assert.equal(pkg.version, "1.0.0-preview.1");
  assert.equal(pkg.preview, true);
  assert.equal(pkg.channel, "preview");
  assert.equal(pkg.requires.protocolVersion, 24);
  assert.equal(pkg.requires.sdkVersion, "1");

  const requiredFiles = [
    "widget.json",
    "src/App.tsx",
    "src/game.ts",
    "src/rules.ts",
    "src/types.ts",
    "src/text.ts",
    "src/style.css",
  ];
  for (const file of requiredFiles) {
    assert.ok(pkg.source.files[file], `missing file in package: ${file}`);
  }

  // Ensure interfaces and privacy rules are present and played-card history is not exposed
  const gameSrc = pkg.source.files["src/game.ts"];
  assert.match(gameSrc, /callLandlord/);
  assert.match(gameSrc, /playCards/);
  assert.match(gameSrc, /readTable/);
  assert.match(gameSrc, /stepBotTurn/);
  assert.doesNotMatch(gameSrc, /playedHistory|discardPile|cardTracker/);
});

test("Dou Dizhu deck, card combinations, and comparison rules work accurately", () => {
  const deck = createDeck();
  assert.equal(deck.length, 54);
  const dealt = dealDeck();
  assert.equal(dealt.hands.South.length, 17);
  assert.equal(dealt.hands.East.length, 17);
  assert.equal(dealt.hands.West.length, 17);
  assert.equal(dealt.bottomCards.length, 3);

  const pick = (tokens) => matchCardsFromHand(deck, tokens);

  const rocket = classifyCards(pick(["BJ", "RJ"]));
  assert.equal(rocket?.type, "rocket");

  const bombA = classifyCards(pick(["A", "A", "A", "A"]));
  const bomb3 = classifyCards(pick(["3", "3", "3", "3"]));
  assert.equal(bombA?.type, "bomb");
  assert.equal(canBeat(bombA, bomb3), true);
  assert.equal(canBeat(rocket, bombA), true);
  assert.equal(canBeat(bombA, rocket), false);

  const straight5 = classifyCards(pick(["10", "J", "Q", "K", "A"]));
  assert.equal(straight5?.type, "straight");
  assert.equal(straight5?.mainRank, "A");

  // 2 cannot be in a straight
  assert.equal(classifyCards(pick(["J", "Q", "K", "A", "2"])), null);

  const pairStraight = classifyCards(pick(["3", "3", "4", "4", "5", "5"]));
  assert.equal(pairStraight?.type, "pair_straight");

  const airplaneSingle = classifyCards(
    pick(["7", "7", "7", "8", "8", "8", "3", "5"]),
  );
  assert.equal(airplaneSingle?.type, "airplane_single");
  assert.equal(airplaneSingle?.mainRank, "8");

  const airplanePair = classifyCards(
    pick(["9", "9", "9", "10", "10", "10", "4", "4", "6", "6"]),
  );
  assert.equal(airplanePair?.type, "airplane_pair");
  assert.equal(airplanePair?.mainRank, "10");

  const fourTwoSingle = classifyCards(pick(["K", "K", "K", "K", "3", "9"]));
  assert.equal(fourTwoSingle?.type, "four_two_single");
  assert.equal(canBeat(bomb3, fourTwoSingle), true);
});

test("Call / Rob Landlord multiplier doubling, built-in Bot, and no played-card history exposure", () => {
  let l = {
    ...initialLobby(),
    round: 1,
    phase: "bidding",
    seats: {
      South: "human-1",
      East: "@bot:East",
      West: "@bot:West",
    },
  };
  let p = initialPosition("South");

  // South calls Landlord (1x)
  ({ lobby: l, position: p } = applyBid(l, p, "South", "call", "这牌我叫了"));
  assert.equal(l.phase, "bidding");
  assert.equal(p.bidding.calledBy, "South");
  assert.equal(p.turn, "East");
  assert.equal(p.multiplier, 1);

  // East robs Landlord (multiplier -> 2x)
  ({ lobby: l, position: p } = applyBid(l, p, "East", "rob"));
  assert.equal(p.multiplier, 2);
  assert.equal(p.bidding.highestBidder, "East");
  assert.equal(p.turn, "West");

  // West passes rob (multiplier stays 2x), South (original caller) gets 1 final rob chance!
  ({ lobby: l, position: p } = applyBid(l, p, "West", "pass"));
  assert.equal(l.phase, "bidding");
  assert.equal(p.turn, "South");

  // South robs back! (multiplier -> 4x, South immediately becomes Landlord with 20 cards)
  ({ lobby: l, position: p } = applyBid(l, p, "South", "rob"));
  assert.equal(l.phase, "playing");
  assert.equal(p.landlord, "South");
  assert.equal(p.multiplier, 4);
  assert.equal(p.hands.South.length, 20);
  assert.equal(p.turn, "South");

  // Verify no played-card history field exists on position state
  assert.equal("history" in p, false);
  assert.equal("playedCards" in p, false);

  // Built-in bot decision helper works on current state
  const leadPlay = chooseBotPlay(p, "South");
  assert.equal(leadPlay.action, "play");
  assert.ok(leadPlay.cards.length >= 1);

  ({ lobby: l, position: p } = applyPlayCards(l, p, "South", leadPlay.cards));
  assert.equal(p.currentPlay?.seat, "South");
  assert.equal(p.turn, "East");

  // East and West pass -> trick resets cleanly so South leads again and previous trick is cleared
  ({ lobby: l, position: p } = applyPass(l, p, "East"));
  ({ lobby: l, position: p } = applyPass(l, p, "West"));
  assert.equal(p.currentPlay, null);
  assert.equal(p.turn, "South");
  assert.ok(findLegalPlays(p.hands.South, null).length > 0);
  assert.ok(["call", "rob", "pass"].includes(chooseBotBid(initialPosition("South"), "South")));
});
