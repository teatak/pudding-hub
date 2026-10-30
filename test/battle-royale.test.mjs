import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GRID_WIDTH,
  GRID_HEIGHT,
  WEAPONS,
  computeWeaponDamage,
  computeCycleTurnOrder,
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

  const gameSrc = pkg.source.files["src/game.ts"];
  assert.match(gameSrc, /sanitizeJsonValue/);
  assert.match(gameSrc, /privateWhispers/);
  assert.match(gameSrc, /tacticalNote/);
  assert.match(gameSrc, /turnOrderInfo/);
});

test("Grid symmetry, Fog of War bush concealment, and weapon distance counter-play work accurately", () => {
  const p = createInitialPosition(1, 4, 42);
  assert.equal(p.tiles.length, GRID_WIDTH * GRID_HEIGHT);
  assert.deepEqual(parseCoord("d3"), { x: 3, y: 2, coord: "D3" });
  assert.equal(toCoord(7, 5), "H6");
  assert.equal(toCoord(7, 7), "H8");
  assert.equal(chebyshevDist(0, 0, 2, 1), 2);

  // Verify 180-degree rotational symmetry of terrain and initial supply crates
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const t1 = p.tiles[y * GRID_WIDTH + x];
      const t2 =
        p.tiles[(GRID_HEIGHT - 1 - y) * GRID_WIDTH + (GRID_WIDTH - 1 - x)];
      assert.equal(t1.terrain, t2.terrain, `Terrain asymmetry at ${t1.coord}`);
      assert.equal(t1.crate, t2.crate, `Crate asymmetry at ${t1.coord}`);
    }
  }

  // Distance counter-play: Shotgun dominates at dist=1 (45 dmg), while Sniper/AWM suffer 50% CQB penalty at dist=1
  assert.equal(computeWeaponDamage("shotgun", 1).baseDamage, 45);
  assert.equal(computeWeaponDamage("sniper", 1).baseDamage, 25);
  assert.equal(computeWeaponDamage("sniper", 1).cqbPenaltyApplied, true);
  assert.equal(computeWeaponDamage("sniper", 2).baseDamage, 50);
  assert.equal(computeWeaponDamage("sniper", 2).isOptimalRange, true);
  assert.equal(computeWeaponDamage("awm", 1).baseDamage, 33);
  assert.equal(computeWeaponDamage("awm", 3).baseDamage, 66);

  // Place Seat1 at C4 (2,3) and Seat2 in a Stealth Bush at C6 (2,5 - dist 2)
  p.agents.Seat1 = { ...p.agents.Seat1, dropped: true, coord: "C4", x: 2, y: 3 };
  p.agents.Seat2 = { ...p.agents.Seat2, dropped: true, coord: "C6", x: 2, y: 5 };

  assert.equal(canAgentSeeTile(p, "Seat1", 2, 5), true);
  assert.equal(canAgentSeeAgent(p, "Seat1", "Seat2"), false);

  p.agents.Seat1 = { ...p.agents.Seat1, coord: "C5", x: 2, y: 4 };
  assert.equal(canAgentSeeAgent(p, "Seat1", "Seat2"), true);
});

test("Anti-first-mover balance (Snake turn order + Spawn Shield), ammo economy, encrypted whispers, and tactical notes work end-to-end", () => {
  let l = {
    ...initialLobby(),
    round: 1,
    phase: "dropping",
    playerCount: 4,
  };
  let p = createInitialPosition(1, 4, 42);
  assertStrictJsonValue(l, "lobby.initial");
  assertStrictJsonValue(p, "position.initial");

  // Drop order in Round 1 is Seat1 -> Seat2 -> Seat3 -> Seat4
  assert.deepEqual(p.dropOrder, ["Seat1", "Seat2", "Seat3", "Seat4"]);

  const drops = ["D3", "E3", "D4", "E4"];
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
      `私人战术备忘：死守 ${drops[i]}`,
    ));
    assertStrictJsonValue(p, `position.afterDrop.${seat}`);
  }

  // Transitioned to Combat Cycle 1:
  // Because Seat1 dropped first and Seat4 dropped last, Cycle 1 turnOrder is REVERSED: Seat4 -> Seat3 -> Seat2 -> Seat1!
  assert.equal(l.phase, "combat");
  assert.deepEqual(p.turnOrder, ["Seat4", "Seat3", "Seat2", "Seat1"]);
  assert.equal(p.turn, "Seat4");
  assert.equal(p.turnAp, 2);

  // All 4 operatives start Cycle 1 with spawnProtected = true
  for (const s of ["Seat1", "Seat2", "Seat3", "Seat4"]) {
    assert.equal(p.agents[s].spawnProtected, true);
    assert.ok(p.agents[s].tacticalNote?.includes("私人战术备忘"));
  }

  // Seat4 attacks Seat3 (who still has spawnProtected = true -> 40% damage reduction)
  // and sends a private encrypted whisper to Seat1 + updates tacticalNote
  const ammoBefore = p.agents.Seat4.ammo;
  ({ lobby: l, position: p } = applyCombatAction(
    l,
    p,
    "Seat4",
    [
      { kind: "loot" },
      { kind: "attack", target: "Seat3" },
    ],
    "全频广播：D4区域已控制！",
    true,
    { to: "Seat1", message: "密电：我们先别互打，一起夹击Seat2！" },
    "已向Seat1发送结盟密电，注意保留弹药",
  ));
  assertStrictJsonValue(p, "position.afterSeat4Turn");

  // Seat4 has now finished their first turn (and attacked), so Seat4's spawnProtected is false,
  // while Seat3 still has spawnProtected = true until Seat3 finishes their turn!
  assert.equal(p.agents.Seat4.spawnProtected, false);
  assert.equal(p.agents.Seat3.spawnProtected, true);
  assert.equal(p.whisperLogs.length, 1);
  assert.equal(p.whisperLogs[0].fromSeat, "Seat4");
  assert.equal(p.whisperLogs[0].toSeat, "Seat1");
  assert.equal(p.agents.Seat4.tacticalNote, "已向Seat1发送结盟密电，注意保留弹药");
  assert.ok(p.agents.Seat4.tacticalScore > 0);
  assert.ok(ammoBefore > 0);

  // Verify Cycle 2 turn order rotates and snakes fairly
  const cycle2Order = computeCycleTurnOrder(
    p.dropOrder,
    ["Seat1", "Seat2", "Seat3", "Seat4"],
    2,
  );
  assert.deepEqual(cycle2Order, ["Seat2", "Seat3", "Seat4", "Seat1"]);

  // Simulate Bot turns across multiple cycles
  let safetyCounter = 0;
  while (l.phase === "combat" && !p.winner && safetyCounter < 45) {
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
      botAct.whisper,
      botAct.note,
    ));
    assertStrictJsonValue(p, `position.step.${safetyCounter}`);
  }

  assert.ok(p.stepCount > 5);
});
