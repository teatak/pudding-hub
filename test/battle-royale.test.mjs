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

test("Battle Royale 1.0.0-preview.2 release package exists and contains verified source files", async () => {
  const pkgPath = path.join(
    root,
    "releases/1.0.0-preview.2/battle-royale.pudding-widget.json",
  );
  const raw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw);

  assert.equal(pkg.id, "teatak/pudding-hub/widgets/battle-royale");
  assert.equal(pkg.version, "1.0.0-preview.2");
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
});

test("Grid layout, weapon specs, and bush stealth work accurately in streamlined rules", () => {
  const p = createInitialPosition(1, 4, 42);
  assert.equal(p.tiles.length, GRID_WIDTH * GRID_HEIGHT);
  assert.deepEqual(parseCoord("d3"), { x: 3, y: 2, coord: "D3" });
  assert.equal(toCoord(7, 5), "H6");
  assert.equal(toCoord(7, 7), "H8");
  assert.equal(chebyshevDist(0, 0, 2, 1), 2);

  // Weapon specs: fists (1/25), rifle (2/35), sniper (3/50)
  assert.equal(WEAPONS.fists.range, 1);
  assert.equal(WEAPONS.fists.damage, 25);
  assert.equal(WEAPONS.rifle.range, 2);
  assert.equal(WEAPONS.rifle.damage, 35);
  assert.equal(WEAPONS.sniper.range, 3);
  assert.equal(WEAPONS.sniper.damage, 50);

  // Place Seat1 at C4 (2,3) and Seat2 in a Stealth Bush at C6 (2,5 - dist 2)
  p.agents.Seat1 = { ...p.agents.Seat1, dropped: true, coord: "C4", x: 2, y: 3 };
  p.agents.Seat2 = { ...p.agents.Seat2, dropped: true, coord: "C6", x: 2, y: 5 };

  assert.equal(canAgentSeeTile(p, "Seat1", 2, 5), true);
  assert.equal(canAgentSeeAgent(p, "Seat1", "Seat2"), false);

  // Approaching to dist 1 reveals agent in bush
  p.agents.Seat1 = { ...p.agents.Seat1, coord: "C5", x: 2, y: 4 };
  assert.equal(canAgentSeeAgent(p, "Seat1", "Seat2"), true);
});

test("Streamlined Battle Royale: drop -> auto-loot move -> attack kill -> storm shrink -> victory", () => {
  let l = {
    ...initialLobby(),
    round: 1,
    phase: "dropping",
    playerCount: 4,
  };
  let p = createInitialPosition(1, 4, 42);
  assertStrictJsonValue(l, "lobby.initial");
  assertStrictJsonValue(p, "position.initial");

  // Drop phase for 4 players (land on plains without crates)
  const drops = ["D3", "E3", "D2", "E2"];
  for (let i = 0; i < 4; i++) {
    const seat = p.turn;
    const botChoice = chooseBotDrop(p, seat);
    assert.ok(botChoice.coord.length >= 2);
    ({ lobby: l, position: p } = applyDropIn(l, p, seat, drops[i]));
    assertStrictJsonValue(p, `position.afterDrop.${seat}`);
  }

  // All landed -> transition to combat round 1
  assert.equal(l.phase, "combat");
  assert.equal(p.turn, "Seat1");

  // Seat1 is at D3, moves to adjacent D4 (which has a supply crate)
  // Stepping on crate automatically equips rifle!
  ({ lobby: l, position: p } = applyCombatAction(l, p, "Seat1", {
    kind: "move",
    to: "D4",
  }));
  assert.equal(p.agents.Seat1.coord, "D4");
  assert.equal(p.agents.Seat1.weapon, "rifle");

  // Simulate combat flow until victory
  let safety = 0;
  while (l.phase === "combat" && !p.winner && safety < 50) {
    safety += 1;
    const currentSeat = p.turn;
    const act = chooseBotCombatAction(p, currentSeat);
    ({ lobby: l, position: p } = applyCombatAction(l, p, currentSeat, act));
    assertStrictJsonValue(p, `position.combat.step.${safety}`);
  }

  assert.equal(l.phase, "finished");
  assert.ok(p.winner);
  assert.equal(p.agents[p.winner].placement, 1);
});
