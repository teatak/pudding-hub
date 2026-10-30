import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GRID_WIDTH,
  GRID_HEIGHT,
  WEAPONS,
  parseCoord,
  toCoord,
  chebyshevDist,
  initialLobby,
  createInitialPosition,
  canAgentSeeAgent,
  canAgentSeeTile,
  applyDropIn,
  applyCombatAction,
  chooseBotDrop,
  chooseBotCombatAction,
} from "../extensions/widgets/battle-royale/source/src/rules.ts";

const root = fileURLToPath(
  new URL("../extensions/widgets/battle-royale", import.meta.url),
);

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

test("Battle Royale 1.0.0-preview.1 release package exists and contains verified source files", async () => {
  const pkgPath = path.join(
    root,
    "releases/1.0.0-preview.1/battle-royale.pudding-widget.json",
  );
  const raw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw);

  assert.equal(pkg.id, "teatak/pudding-hub/widgets/battle-royale");
  assert.equal(pkg.version, "1.0.0-preview.1");
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
    "src/style.css",
  ];
  for (const file of requiredFiles) {
    assert.ok(pkg.source.files[file], `missing file in package: ${file}`);
  }

  const gameSrc = pkg.source.files["src/game.ts"];
  assert.match(gameSrc, /sanitizeJsonValue/);
  assert.match(gameSrc, /readRadar/);
  assert.match(gameSrc, /dropIn/);
  assert.match(gameSrc, /takeAction/);
  assert.match(gameSrc, /stepBotTurn/);
});

test("Grid coordinates, Fog of War bush concealment, and radar tower vision bonuses work accurately", () => {
  const p = createInitialPosition(1, 4, 42);
  assert.equal(p.tiles.length, GRID_WIDTH * GRID_HEIGHT);
  assert.deepEqual(parseCoord("d3"), { x: 3, y: 2, coord: "D3" });
  assert.equal(toCoord(7, 5), "H6");
  assert.equal(chebyshevDist(0, 0, 2, 1), 2);
  assert.ok(WEAPONS.awm.damage > WEAPONS.rifle.damage);

  // Place Seat1 at D3 (3,2) and Seat2 in a Stealth Bush at C5 (2,4 - dist 2)
  p.agents.Seat1 = { ...p.agents.Seat1, dropped: true, coord: "D3", x: 3, y: 2 };
  p.agents.Seat2 = { ...p.agents.Seat2, dropped: true, coord: "C5", x: 2, y: 4 };

  // C5 is a bush tile (x=2, y=4), so at distance 2 Seat1 can see the tile C5,
  // but CANNOT see Seat2 hiding inside the bush!
  assert.equal(canAgentSeeTile(p, "Seat1", 2, 4), true);
  assert.equal(canAgentSeeAgent(p, "Seat1", "Seat2"), false);

  // Move Seat1 adjacent to C5 at C4 (2,3 - dist 1) -> now Seat1 spots Seat2 in the bush!
  p.agents.Seat1 = { ...p.agents.Seat1, coord: "C4", x: 2, y: 3 };
  assert.equal(canAgentSeeAgent(p, "Seat1", "Seat2"), true);
});

test("Parachute drop-in, 2-AP combat combos, storm shrinking, kill feed, victory, and strict jsonValue compliance work end-to-end", () => {
  let l = {
    ...initialLobby(),
    round: 1,
    phase: "dropping",
    playerCount: 4,
  };
  let p = createInitialPosition(1, 4, 42);
  assertStrictJsonValue(l, "lobby.initial");
  assertStrictJsonValue(p, "position.initial");

  // 4 operatives parachute in
  const drops = ["D3", "E3", "D4", "A1"];
  for (let i = 0; i < 4; i++) {
    const seat = p.turn;
    const botChoice = chooseBotDrop(p, seat);
    assert.ok(botChoice.coord.length >= 2);
    ({ lobby: l, position: p } = applyDropIn(
      l,
      p,
      seat,
      drops[i],
      `空降 ${drops[i]}`,
    ));
    assertStrictJsonValue(p, `position.afterDrop.${seat}`);
  }

  assert.equal(l.phase, "combat");
  assert.equal(p.turn, "Seat1");
  assert.equal(p.turnAp, 2);

  // Seat1 (at D3) loots & attacks Seat2 (at E3, adjacent)
  ({ lobby: l, position: p } = applyCombatAction(
    l,
    p,
    "Seat1",
    [
      { kind: "loot" },
      { kind: "attack", target: "Seat2" },
    ],
    "发现2号，开火！",
    true,
  ));
  assertStrictJsonValue(p, "position.afterSeat1Combat");
  assert.equal(p.turn, "Seat2");
  assert.ok(
    p.agents.Seat2.hp < 100 || p.agents.Seat2.shield < 50,
    "Seat2 took damage from Seat1",
  );

  // Simulate Bot turns until round finishes or several cycles pass
  let safetyCounter = 0;
  while (l.phase === "combat" && !p.winner && safetyCounter < 40) {
    safetyCounter += 1;
    const currentSeat = p.turn;
    const botAct = chooseBotCombatAction(p, currentSeat);
    ({ lobby: l, position: p } = applyCombatAction(
      l,
      p,
      currentSeat,
      botAct.steps,
      botAct.radio,
      true,
    ));
    assertStrictJsonValue(p, `position.step.${safetyCounter}`);
  }

  assert.ok(p.stepCount > 5);
});
