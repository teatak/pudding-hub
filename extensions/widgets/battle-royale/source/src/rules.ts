import type {
  Seat,
  TerrainType,
  WeaponId,
  WeaponSpec,
  TileState,
  AgentState,
  ActionStepInput,
  WhisperInput,
  BattleRoyaleLobby,
  BattleRoyalePosition,
} from "./types";

export const GRID_WIDTH = 8; // Columns A..H (0..7)
export const GRID_HEIGHT = 8; // Rows 1..8 (0..7)
export const COL_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export const allSeats: Seat[] = [
  "Seat1",
  "Seat2",
  "Seat3",
  "Seat4",
  "Seat5",
  "Seat6",
];

export function seatsForCount(count: 4 | 6): Seat[] {
  return count === 4 ? allSeats.slice(0, 4) : allSeats.slice(0, 6);
}

export function isBotParticipant(id: string | null | undefined): boolean {
  return !id || id.startsWith("@bot");
}

/**
 * Weapon specs with Distance Counter-Play (距离克制) & Ammo Economy (弹药限制):
 * - Shotgun (S12K): Lethal at dist=1 (45 dmg), range 1, 4 shells.
 * - SMG (UMP45): Reliable at dist=1..2 (30 dmg), 6 rounds.
 * - Rifle (M416): Optimal at dist=2..3 (36 dmg), CQB penalty at dist=1 (0.75x = 27 dmg), 5 rounds.
 * - Sniper (98K): Optimal at dist=2..3 (+1 on Tower) (50 dmg), severe CQB penalty at dist=1 (0.5x = 25 dmg), 4 rounds.
 * - AWM: Optimal at dist=2..4 (+1 on Tower) (66 dmg), severe CQB penalty at dist=1 (0.5x = 33 dmg), 3 rounds.
 */
export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  fists: {
    id: "fists",
    damage: 20,
    range: 1,
    optimalMinRange: 1,
    closeRangeMultiplier: 1.0,
    maxAmmo: 99,
    visionBonus: 0,
    soundRange: 1,
    tier: 0,
  },
  shotgun: {
    id: "shotgun",
    damage: 45,
    range: 1,
    optimalMinRange: 1,
    closeRangeMultiplier: 1.0,
    maxAmmo: 4,
    visionBonus: 0,
    soundRange: 3,
    tier: 2,
  },
  smg: {
    id: "smg",
    damage: 30,
    range: 2,
    optimalMinRange: 1,
    closeRangeMultiplier: 1.0,
    maxAmmo: 6,
    visionBonus: 0,
    soundRange: 3,
    tier: 1,
  },
  rifle: {
    id: "rifle",
    damage: 36,
    range: 3,
    optimalMinRange: 2,
    closeRangeMultiplier: 0.75,
    maxAmmo: 5,
    visionBonus: 0,
    soundRange: 4,
    tier: 3,
  },
  sniper: {
    id: "sniper",
    damage: 50,
    range: 3,
    optimalMinRange: 2,
    closeRangeMultiplier: 0.5,
    maxAmmo: 4,
    visionBonus: 1,
    soundRange: 6,
    tier: 4,
  },
  awm: {
    id: "awm",
    damage: 66,
    range: 4,
    optimalMinRange: 2,
    closeRangeMultiplier: 0.5,
    maxAmmo: 3,
    visionBonus: 1,
    soundRange: 7,
    tier: 5,
  },
};

/**
 * Computes weapon base damage at a given Chebyshev distance, applying close-quarters scope penalty
 * when a long-range rifle/sniper is fired at point-blank range (`dist < optimalMinRange`).
 */
export function computeWeaponDamage(
  weapon: WeaponId,
  dist: number,
): { baseDamage: number; isOptimalRange: boolean; cqbPenaltyApplied: boolean } {
  const spec = WEAPONS[weapon];
  if (dist < spec.optimalMinRange) {
    return {
      baseDamage: Math.round(spec.damage * spec.closeRangeMultiplier),
      isOptimalRange: false,
      cqbPenaltyApplied: spec.closeRangeMultiplier < 1,
    };
  }
  return {
    baseDamage: spec.damage,
    isOptimalRange: true,
    cqbPenaltyApplied: false,
  };
}

/**
 * Computes fair Snake + Rotated combat turn order for each cycle so no seat monopolizes first-move initiative:
 * - Cycle 1: Exact reverse of `dropOrder` (the operative who dropped last acts first in Cycle 1).
 * - Cycle c >= 2: Rotates the starting operative by `(c - 1) % N` and alternates direction (Snake order).
 */
export function computeCycleTurnOrder(
  dropOrder: Seat[],
  aliveSeats: Seat[],
  cycle: number,
): Seat[] {
  const n = dropOrder.length;
  if (n === 0) return [];
  const shift = (cycle - 1) % n;
  const rotated = [...dropOrder.slice(shift), ...dropOrder.slice(0, shift)];
  const ordered = cycle % 2 === 1 ? [...rotated].reverse() : rotated;
  return ordered.filter((s) => aliveSeats.includes(s));
}

export function toCoord(x: number, y: number): string {
  return `${COL_LETTERS[x] || "A"}${y + 1}`;
}

export function parseCoord(raw: string): { x: number; y: number; coord: string } {
  const clean = raw.trim().toUpperCase();
  const match = clean.match(/^([A-H])([1-8])$/);
  if (!match) {
    throw new Error(`Invalid coordinate "${raw}" (use A1–H8, e.g. D4)`);
  }
  const x = COL_LETTERS.indexOf(match[1] as (typeof COL_LETTERS)[number]);
  const y = Number(match[2]) - 1;
  return { x, y, coord: `${match[1]}${match[2]}` };
}

export function chebyshevDist(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

export function compassDirection(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): string {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (dx === 0 && dy === 0) return "同格";
  const ns = dy < 0 ? "北" : dy > 0 ? "南" : "";
  const ew = dx > 0 ? "东" : dx < 0 ? "西" : "";
  return `${ew}${ns}方向`;
}

export function initialLobby(): BattleRoyaleLobby {
  return {
    round: 0,
    phase: "lobby",
    playerCount: 6,
    seats: {
      Seat1: "@bot:Seat1",
      Seat2: "@bot:Seat2",
      Seat3: "@bot:Seat3",
      Seat4: "@bot:Seat4",
      Seat5: "@bot:Seat5",
      Seat6: "@bot:Seat6",
    },
    ready: [],
    startsAt: null,
  };
}

/**
 * Generates a 180-degree rotationally symmetric 8×6 tactical battlefield island:
 * - Central Military Base tiles ("base") with high supply density
 * - 4 Symmetric Radar High Towers ("tower") for vision/range advantage
 * - 6 Symmetric Stealth Bushes ("bush") for concealment
 * - 4 Symmetric Concrete Bunkers ("bunker") for cover
 */
export function createInitialPosition(
  round: number,
  playerCount: 4 | 6 = 6,
  deterministicSeed?: number,
): BattleRoyalePosition {
  const activeSeats = seatsForCount(playerCount);
  const seed = deterministicSeed ?? (round * 131 + 17);

  const tiles: TileState[] = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const coord = toCoord(x, y);
      let terrain: TerrainType = "plain";
      let crate: TileState["crate"] = "none";

      // Symmetrical canon coordinates for 180-degree rotational fairness
      const canonX = y < 4 ? x : GRID_WIDTH - 1 - x;
      const canonY = y < 4 ? y : GRID_HEIGHT - 1 - y;

      // Central military base cluster (4x central tiles D4, E4, D5, E5)
      if ((x === 3 || x === 4) && (y === 3 || y === 4)) {
        terrain = "base";
        crate = "supply";
      } else if (
        (x === 1 && y === 1) ||
        (x === 6 && y === 1) ||
        (x === 1 && y === 6) ||
        (x === 6 && y === 6)
      ) {
        terrain = "tower";
        crate = "supply";
      } else if (
        (x === 2 && y === 2) ||
        (x === 5 && y === 5) ||
        (x === 5 && y === 2) ||
        (x === 2 && y === 5) ||
        (x === 0 && y === 3) ||
        (x === 7 && y === 4) ||
        (x === 0 && y === 4) ||
        (x === 7 && y === 3) ||
        (x === 3 && y === 2) ||
        (x === 4 && y === 5)
      ) {
        terrain = "bush";
      } else if (
        (x === 3 && y === 1) ||
        (x === 4 && y === 6) ||
        (x === 4 && y === 1) ||
        (x === 3 && y === 6) ||
        (x === 1 && y === 3) ||
        (x === 6 && y === 4) ||
        (x === 1 && y === 4) ||
        (x === 6 && y === 3)
      ) {
        terrain = "bunker";
        crate = "supply";
      } else if ((canonX * 7 + canonY * 13 + seed) % 5 === 0) {
        crate = "supply";
      }

      tiles.push({ coord, x, y, terrain, crate });
    }
  }

  const makeAgent = (seat: Seat): AgentState => ({
    seat,
    alive: activeSeats.includes(seat),
    dropped: false,
    coord: null,
    x: null,
    y: null,
    hp: 100,
    maxHp: 100,
    shield: 25,
    maxShield: 25,
    armorLevel: 1,
    weapon: "fists",
    ammo: 99,
    maxAmmo: 99,
    medkits: 1,
    grenades: 0,
    guarding: false,
    spawnProtected: true,
    kills: 0,
    damageDealt: 0,
    tacticalScore: 0,
    placement: null,
    eliminatedBy: null,
    eliminatedCycle: null,
    lastRadio: null,
    tacticalNote: null,
    lastActionSummary: null,
  });

  const agents: Record<Seat, AgentState> = {
    Seat1: makeAgent("Seat1"),
    Seat2: makeAgent("Seat2"),
    Seat3: makeAgent("Seat3"),
    Seat4: makeAgent("Seat4"),
    Seat5: makeAgent("Seat5"),
    Seat6: makeAgent("Seat6"),
  };

  // Safe zone center slightly randomized near center (D4, E4, D5, E5)
  const centerX = 3 + (seed % 2);
  const centerY = 3 + (Math.floor(seed / 2) % 2);
  const stormCenter = {
    x: centerX,
    y: centerY,
    coord: toCoord(centerX, centerY),
  };

  const shift = round > 0 ? (round - 1) % activeSeats.length : 0;
  const dropOrder = [
    ...activeSeats.slice(shift),
    ...activeSeats.slice(0, shift),
  ];

  return {
    cycle: 1,
    turn: round > 0 ? dropOrder[0] : null,
    turnAp: 1,
    turnStartedAt: round > 0 ? Date.now() : null,
    activeSeats,
    aliveSeats: [...activeSeats],
    dropOrder,
    turnOrder: [...dropOrder],
    completedTurnSeats: [],
    gridWidth: GRID_WIDTH,
    gridHeight: GRID_HEIGHT,
    tiles,
    agents,
    stormCenter,
    stormRadius: 4,
    nextStormRadius: 3,
    soundPings: [],
    killFeed: [],
    radioLogs: [],
    whisperLogs: [],
    lastEvent:
      round > 0
        ? {
            step: 0,
            kind: "start",
            actor: dropOrder[0],
            targetSeat: null,
            fromCoord: null,
            toCoord: null,
            weapon: null,
            damage: null,
            winner: null,
            summary:
              "运输机进入孤岛航线（盲降模式：全员跳伞落地前坐标相互保密，后跳伞者将在第1轮优先行动）！",
          }
        : null,
    stepCount: 0,
    winner: null,
  };
}

export function getTile(
  p: BattleRoyalePosition,
  x: number,
  y: number,
): TileState | null {
  if (x < 0 || x >= p.gridWidth || y < 0 || y >= p.gridHeight) return null;
  return p.tiles[y * p.gridWidth + x] || null;
}

export function isInStorm(
  p: BattleRoyalePosition,
  x: number,
  y: number,
): boolean {
  return (
    chebyshevDist(x, y, p.stormCenter.x, p.stormCenter.y) > p.stormRadius
  );
}

/**
 * Computes the effective vision radius for an agent (Default 2, +1 on Radar Tower, +1 with Sniper/AWM).
 */
export function visionRadiusFor(
  p: BattleRoyalePosition,
  seat: Seat,
): number {
  const ag = p.agents[seat];
  if (!ag || !ag.alive || ag.x === null || ag.y === null) return 2;
  const tile = getTile(p, ag.x, ag.y);
  const terrainBonus = tile?.terrain === "tower" ? 1 : 0;
  const weaponBonus = WEAPONS[ag.weapon]?.visionBonus || 0;
  return 2 + terrainBonus + weaponBonus;
}

/**
 * Computes effective weapon range (weapon base range + 1 if standing on Radar Tower; falls back to range 1 if out of ammo).
 */
export function attackRangeFor(
  p: BattleRoyalePosition,
  seat: Seat,
  useGrenade = false,
): number {
  const ag = p.agents[seat];
  if (!ag || !ag.alive || ag.x === null || ag.y === null) return 1;
  if (useGrenade) return 2;
  if (ag.weapon !== "fists" && ag.ammo <= 0) return 1;
  const tile = getTile(p, ag.x, ag.y);
  const terrainBonus = tile?.terrain === "tower" ? 1 : 0;
  return WEAPONS[ag.weapon].range + terrainBonus;
}

/**
 * True Fog-of-War visibility test:
 * Can `observerSeat` see `targetSeat`?
 * - If `targetSeat === observerSeat`, always true.
 * - Distance must be <= `visionRadiusFor(observerSeat)`.
 * - If target is standing in a Stealth Bush ("bush"), observer must be within distance <= 1!
 */
export function canAgentSeeAgent(
  p: BattleRoyalePosition,
  observerSeat: Seat,
  targetSeat: Seat,
): boolean {
  if (observerSeat === targetSeat) return true;
  const obs = p.agents[observerSeat];
  const tgt = p.agents[targetSeat];
  if (
    !obs ||
    !tgt ||
    !obs.alive ||
    !tgt.alive ||
    obs.x === null ||
    obs.y === null ||
    tgt.x === null ||
    tgt.y === null
  ) {
    return false;
  }
  const dist = chebyshevDist(obs.x, obs.y, tgt.x, tgt.y);
  const tgtTile = getTile(p, tgt.x, tgt.y);
  if (tgtTile?.terrain === "bush") {
    return dist <= 1;
  }
  return dist <= visionRadiusFor(p, observerSeat);
}

export function canAgentSeeTile(
  p: BattleRoyalePosition,
  observerSeat: Seat,
  x: number,
  y: number,
): boolean {
  const obs = p.agents[observerSeat];
  if (!obs || !obs.alive || obs.x === null || obs.y === null) return false;
  const dist = chebyshevDist(obs.x, obs.y, x, y);
  return dist <= visionRadiusFor(p, observerSeat);
}

/**
 * Handles the Parachute Drop-In (`dropping` phase) for a seat.
 * - Anti-first-mover-advantage:
 *   1. Drop coordinates are kept blind from other agents until everyone lands.
 *   2. Once all players land, Cycle 1 combat order is set to the REVERSE of `dropOrder`
 *      (`computeCycleTurnOrder(dropOrder, aliveSeats, 1)`), so the last dropper acts first!
 *   3. All operatives start with `spawnProtected: true` (-40% incoming damage until they complete their first combat turn).
 */
export function applyDropIn(
  l: BattleRoyaleLobby,
  p: BattleRoyalePosition,
  seat: Seat,
  rawCoord: string,
  rawRadio?: string | null,
  rawNote?: string | null,
): { lobby: BattleRoyaleLobby; position: BattleRoyalePosition } {
  if (l.phase !== "dropping") {
    throw new Error("当前不是跳伞降落阶段");
  }
  if (p.turn !== seat) {
    throw new Error(`当前尚未轮到 ${seat} 跳伞`);
  }
  const { x, y, coord } = parseCoord(rawCoord);
  const nextStep = p.stepCount + 1;
  const radio = rawRadio?.trim() ? rawRadio.trim().slice(0, 80) : null;
  const note = rawNote?.trim() ? rawNote.trim().slice(0, 200) : null;

  const tile = getTile(p, x, y)!;
  let weapon: WeaponId = "smg";
  let armorLevel: 0 | 1 | 2 | 3 = 1;
  let shield = 25;
  let maxShield = 25;
  let medkits = 1;
  let grenades = 0;
  const nextTiles = [...p.tiles];

  // Auto-loot landing tile if it has a supply crate!
  if (tile.crate !== "none") {
    if (tile.terrain === "base") {
      weapon = (x + y + nextStep) % 2 === 0 ? "rifle" : "sniper";
      armorLevel = 2;
      shield = 50;
      maxShield = 50;
      grenades = 1;
    } else {
      weapon = (x + y) % 2 === 0 ? "rifle" : "shotgun";
      armorLevel = 2;
      shield = 50;
      maxShield = 50;
    }
    nextTiles[y * p.gridWidth + x] = { ...tile, crate: "none" };
  }

  const maxAmmo = WEAPONS[weapon].maxAmmo;

  const nextAgent: AgentState = {
    ...p.agents[seat],
    dropped: true,
    coord,
    x,
    y,
    weapon,
    ammo: maxAmmo,
    maxAmmo,
    armorLevel,
    shield,
    maxShield,
    medkits,
    grenades,
    spawnProtected: true,
    tacticalScore:
      p.agents[seat].tacticalScore +
      (tile.terrain !== "plain" ? 5 : 0) +
      (note ? 3 : 0),
    lastRadio: radio ?? p.agents[seat].lastRadio,
    tacticalNote: note ?? p.agents[seat].tacticalNote,
    lastActionSummary: `空降落点 ${coord}`,
  };

  const nextAgents = { ...p.agents, [seat]: nextAgent };
  const nextCompleted = [...p.completedTurnSeats, seat];
  const nextRadioLogs = radio
    ? [...p.radioLogs, { step: nextStep, cycle: p.cycle, seat, text: radio }].slice(-20)
    : p.radioLogs;
  const nextPings = [
    ...p.soundPings,
    {
      step: nextStep,
      cycle: p.cycle,
      sourceSeat: seat,
      coord,
      x,
      y,
      kind: "drop" as const,
    },
  ].slice(-18);

  const baseDropOrder = p.dropOrder?.length ? p.dropOrder : p.turnOrder;
  const remainingDroppers = baseDropOrder.filter(
    (s) => !nextCompleted.includes(s),
  );

  if (remainingDroppers.length > 0) {
    return {
      lobby: l,
      position: {
        ...p,
        turn: remainingDroppers[0],
        turnAp: 1,
        turnStartedAt: Date.now(),
        completedTurnSeats: nextCompleted,
        tiles: nextTiles,
        agents: nextAgents,
        soundPings: nextPings,
        radioLogs: nextRadioLogs,
        lastEvent: {
          step: nextStep,
          kind: "drop",
          actor: seat,
          targetSeat: null,
          fromCoord: null,
          toCoord: coord,
          weapon: null,
          damage: null,
          winner: null,
          summary: `${seat} 已锁定盲降航线坐标`,
        },
        stepCount: nextStep,
      },
    };
  }

  // All players have parachuted in -> Transition to Combat Cycle 1 with REVERSE Snake Turn Order!
  const cycle1Order = computeCycleTurnOrder(baseDropOrder, p.aliveSeats, 1);

  return {
    lobby: {
      ...l,
      phase: "combat",
    },
    position: {
      ...p,
      cycle: 1,
      turn: cycle1Order[0],
      turnAp: 2,
      turnStartedAt: Date.now(),
      turnOrder: cycle1Order,
      completedTurnSeats: [],
      tiles: nextTiles,
      agents: nextAgents,
      soundPings: nextPings,
      radioLogs: nextRadioLogs,
      lastEvent: {
        step: nextStep,
        kind: "drop",
        actor: seat,
        targetSeat: null,
        fromCoord: null,
        toCoord: coord,
        weapon: null,
        damage: null,
        winner: null,
        summary: `全员空降完毕！后跳伞者 ${cycle1Order[0]} 率先进攻（未行动干员享有空降护盾减伤）！`,
      },
      stepCount: nextStep,
    },
  };
}

/**
 * Executes a single 1-AP step for `seat` during the `combat` phase, returning the updated position
 * and whether the turn should end immediately.
 */
function executeSingleStep(
  p: BattleRoyalePosition,
  seat: Seat,
  stepInput: ActionStepInput,
): { position: BattleRoyalePosition; endTurnNow: boolean } {
  const ag = p.agents[seat];
  if (!ag || !ag.alive || ag.x === null || ag.y === null || !ag.coord) {
    throw new Error(`${seat} 已淘汰或尚未降落`);
  }

  const nextStep = p.stepCount + 1;
  const nextTiles = [...p.tiles];
  const nextAgents = { ...p.agents };
  let nextAlive = [...p.aliveSeats];
  let nextPings = [...p.soundPings];
  let nextKills = [...p.killFeed];
  let lastEv: BattleRoyalePosition["lastEvent"] = p.lastEvent;
  let endTurnNow = false;

  if (stepInput.kind === "move") {
    const dest = parseCoord(stepInput.to);
    const dist = chebyshevDist(ag.x, ag.y, dest.x, dest.y);
    if (dist === 0) {
      throw new Error(`你已经在坐标 ${dest.coord} 上了`);
    }
    if (dist > 1) {
      throw new Error(
        `单步移动只能前往相邻 1 格的坐标（当前在 ${ag.coord}，目标 ${dest.coord} 距离为 ${dist}）`,
      );
    }
    const fromCoord = ag.coord;
    const destTile = getTile(p, dest.x, dest.y);
    const moveTacticalBonus =
      (isInStorm(p, ag.x, ag.y) && !isInStorm(p, dest.x, dest.y) ? 8 : 0) +
      (destTile?.terrain === "bush" ||
      destTile?.terrain === "bunker" ||
      destTile?.terrain === "tower"
        ? 4
        : 0);

    nextAgents[seat] = {
      ...ag,
      coord: dest.coord,
      x: dest.x,
      y: dest.y,
      guarding: false,
      tacticalScore: ag.tacticalScore + moveTacticalBonus,
      lastActionSummary: `移动 ${fromCoord} → ${dest.coord}`,
    };
    lastEv = {
      step: nextStep,
      kind: "move",
      actor: seat,
      targetSeat: null,
      fromCoord,
      toCoord: dest.coord,
      weapon: null,
      damage: null,
      winner: null,
      summary: `${seat} 机动转移至 ${dest.coord}`,
    };
  } else if (stepInput.kind === "loot") {
    const tileIdx = ag.y * p.gridWidth + ag.x;
    const tile = nextTiles[tileIdx];
    let summaryText = `${seat} 搜索了 ${ag.coord}`;
    let newWeapon = ag.weapon;
    let newArmor = ag.armorLevel;
    let newShield = ag.shield;
    let newMaxShield = ag.maxShield;
    let newMedkits = ag.medkits;
    let newGrenades = ag.grenades;
    let newMaxAmmo = ag.maxAmmo;
    let newAmmo = ag.ammo;
    let lootScoreBonus = 4;

    if (tile.crate === "airdrop") {
      newWeapon = "awm";
      newMaxAmmo = WEAPONS.awm.maxAmmo;
      newAmmo = newMaxAmmo;
      newArmor = 3;
      newMaxShield = 75;
      newShield = 75;
      newMedkits = Math.min(3, ag.medkits + 2);
      newGrenades = Math.min(3, ag.grenades + 1);
      lootScoreBonus = 15;
      nextTiles[tileIdx] = { ...tile, crate: "none" };
      summaryText = `${seat} 开启黄金空投！获得 [AWM重狙(3发) + 三级甲 + 急救包]`;
    } else if (tile.crate === "supply" || tile.crate === "deathbox") {
      const roll = (ag.x * 3 + ag.y * 5 + nextStep) % 3;
      const candidateWeapon: WeaponId =
        roll === 0 ? "sniper" : roll === 1 ? "rifle" : "shotgun";
      if (WEAPONS[candidateWeapon].tier > WEAPONS[ag.weapon].tier) {
        newWeapon = candidateWeapon;
      }
      newMaxAmmo = WEAPONS[newWeapon].maxAmmo;
      newAmmo = newMaxAmmo;
      if (ag.armorLevel < 2) {
        newArmor = 2;
        newMaxShield = 50;
        newShield = Math.max(ag.shield, 50);
      } else {
        newShield = Math.min(newMaxShield, ag.shield + 25);
      }
      newMedkits = Math.min(3, ag.medkits + 1);
      if (roll !== 2) {
        newGrenades = Math.min(3, ag.grenades + 1);
      }
      lootScoreBonus = 8;
      nextTiles[tileIdx] = { ...tile, crate: "none" };
      summaryText = `${seat} 搜刮物资箱，装备 [${newWeapon.toUpperCase()} · 弹药满(${newAmmo})]`;
    } else {
      // Even on a tile without a crate, scavenging finds minor shield + 2 ammo rounds
      newShield = Math.min(ag.maxShield, ag.shield + 15);
      newAmmo =
        newWeapon === "fists"
          ? 99
          : Math.min(newMaxAmmo, ag.ammo + 2);
      summaryText = `${seat} 在 ${ag.coord} 搜索零散补给（护甲+15，弹药+2）`;
    }

    nextAgents[seat] = {
      ...ag,
      weapon: newWeapon,
      ammo: newAmmo,
      maxAmmo: newMaxAmmo,
      armorLevel: newArmor,
      shield: newShield,
      maxShield: newMaxShield,
      medkits: newMedkits,
      grenades: newGrenades,
      tacticalScore: ag.tacticalScore + lootScoreBonus,
      lastActionSummary: summaryText,
    };
    lastEv = {
      step: nextStep,
      kind: "loot",
      actor: seat,
      targetSeat: null,
      fromCoord: ag.coord,
      toCoord: ag.coord,
      weapon: newWeapon,
      damage: null,
      winner: null,
      summary: summaryText,
    };
  } else if (stepInput.kind === "heal") {
    if (ag.medkits <= 0 && ag.hp >= ag.maxHp && ag.shield >= ag.maxShield) {
      throw new Error("当前没有可用急救包或状态已满");
    }
    const useKit = ag.medkits > 0;
    const healHp = useKit ? 45 : 15;
    const healShield = useKit ? 25 : 10;
    const nextHp = Math.min(ag.maxHp, ag.hp + healHp);
    const nextShield = Math.min(ag.maxShield, ag.shield + healShield);
    nextAgents[seat] = {
      ...ag,
      hp: nextHp,
      shield: nextShield,
      medkits: useKit ? ag.medkits - 1 : 0,
      tacticalScore: ag.tacticalScore + (ag.hp <= 60 ? 8 : 3),
      lastActionSummary: `使用医疗补给 (HP ${nextHp}, 护甲 ${nextShield})`,
    };
    lastEv = {
      step: nextStep,
      kind: "heal",
      actor: seat,
      targetSeat: null,
      fromCoord: ag.coord,
      toCoord: ag.coord,
      weapon: null,
      damage: null,
      winner: null,
      summary: `${seat} 使用急救包恢复生命与护甲`,
    };
  } else if (stepInput.kind === "guard") {
    nextAgents[seat] = {
      ...ag,
      guarding: true,
      tacticalScore: ag.tacticalScore + 5,
      lastActionSummary: `在 ${ag.coord} 架枪警戒 (-35%受伤)`,
    };
    endTurnNow = true;
    lastEv = {
      step: nextStep,
      kind: "guard",
      actor: seat,
      targetSeat: null,
      fromCoord: ag.coord,
      toCoord: ag.coord,
      weapon: null,
      damage: null,
      winner: null,
      summary: `${seat} 进入架枪警戒姿态`,
    };
  } else if (stepInput.kind === "attack") {
    const rawTarget = stepInput.target.trim();
    const useGrenade = Boolean(stepInput.useGrenade && ag.grenades > 0);
    const outOfAmmo = !useGrenade && ag.weapon !== "fists" && ag.ammo <= 0;

    // Resolve target by Seat name (e.g. "Seat2") or coordinate (e.g. "E4")
    let targetAgent: AgentState | null = null;
    if (allSeats.includes(rawTarget as Seat)) {
      const candidate = nextAgents[rawTarget as Seat];
      if (candidate && candidate.alive && candidate.seat !== seat) {
        targetAgent = candidate;
      }
    } else {
      const parsed = parseCoord(rawTarget);
      const victimsOnTile = nextAlive
        .filter((s) => s !== seat)
        .map((s) => nextAgents[s])
        .filter((a) => a.alive && a.x === parsed.x && a.y === parsed.y);
      targetAgent = victimsOnTile[0] || null;
    }

    if (
      !targetAgent ||
      targetAgent.x === null ||
      targetAgent.y === null ||
      !targetAgent.coord
    ) {
      throw new Error(`目标 "${rawTarget}" 上没有可攻击的存活敌人`);
    }

    const dist = chebyshevDist(ag.x, ag.y, targetAgent.x, targetAgent.y);
    if (outOfAmmo && dist > 1) {
      throw new Error(
        `当前枪械 [${ag.weapon.toUpperCase()}] 弹药已耗尽（0发），无法远程射击距离 ${dist} 的目标；请先执行 loot 补充弹药或贴近至 1 格使用战术匕首`,
      );
    }

    const maxRange = attackRangeFor(p, seat, useGrenade);
    if (dist > maxRange) {
      throw new Error(
        `目标 ${targetAgent.seat} (${targetAgent.coord}) 距离为 ${dist}，超出你当前射程 (${maxRange})`,
      );
    }

    const attackerTile = getTile(p, ag.x, ag.y);
    const tgtTile = getTile(p, targetAgent.x, targetAgent.y);
    const effectiveWeapon: WeaponId = outOfAmmo ? "fists" : ag.weapon;
    const dmgCalc = computeWeaponDamage(effectiveWeapon, dist);
    let rawDmg = useGrenade ? 44 : dmgCalc.baseDamage;

    // Cover & Guard mitigation (Grenades ignore bunker cover!)
    if (!useGrenade && tgtTile?.terrain === "bunker") {
      rawDmg = Math.round(rawDmg * 0.75);
    }
    if (targetAgent.guarding) {
      rawDmg = Math.round(rawDmg * 0.65);
    }
    // Anti-First-Mover Spawn Protection: 40% damage reduction & cannot be one-shot if target has not completed their first combat turn!
    const targetSpawnShieldActive = Boolean(targetAgent.spawnProtected);
    if (targetSpawnShieldActive) {
      rawDmg = Math.round(rawDmg * 0.6);
    }

    // Apply damage to shield first, then HP
    const shieldAbsorbed = Math.min(targetAgent.shield, rawDmg);
    const hpDamage = rawDmg - shieldAbsorbed;
    const nextTargetShield = targetAgent.shield - shieldAbsorbed;
    let nextTargetHp = Math.max(0, targetAgent.hp - hpDamage);
    if (targetSpawnShieldActive && nextTargetHp === 0 && targetAgent.hp > 15) {
      nextTargetHp = 15;
    }
    const killed = nextTargetHp === 0;

    // Calculate tactical intelligence bonus for attacker
    let tacticalGain = Math.round(rawDmg / 2);
    if (dmgCalc.isOptimalRange && dist >= 2) tacticalGain += 10;
    if (effectiveWeapon === "shotgun" && dist === 1) tacticalGain += 10;
    if (attackerTile?.terrain === "tower" || attackerTile?.terrain === "bush") {
      tacticalGain += 8;
    }
    if (killed) tacticalGain += 25;

    const nextAmmo =
      useGrenade || effectiveWeapon === "fists"
        ? ag.ammo
        : Math.max(0, ag.ammo - 1);

    const updatedAttacker: AgentState = {
      ...nextAgents[seat],
      ammo: nextAmmo,
      grenades: useGrenade ? ag.grenades - 1 : ag.grenades,
      kills: killed ? ag.kills + 1 : ag.kills,
      damageDealt: ag.damageDealt + rawDmg,
      tacticalScore: ag.tacticalScore + tacticalGain,
      guarding: false,
      spawnProtected: false, // Attacking immediately drops your own spawn protection
      lastActionSummary: `${
        useGrenade
          ? "投掷手雷轰炸"
          : dmgCalc.cqbPenaltyApplied
            ? "贴脸受限开火"
            : "精准开火命中"
      } ${targetAgent.seat} (-${rawDmg}${
        targetSpawnShieldActive ? "·空降护盾减伤" : ""
      })`,
    };
    nextAgents[seat] = updatedAttacker;

    // Defender gains tacticalScore if they mitigated damage via Bunker or Guard
    const defenderMitigationBonus =
      (!useGrenade && tgtTile?.terrain === "bunker" ? 6 : 0) +
      (targetAgent.guarding ? 8 : 0);

    const placementIfKilled = nextAlive.length;
    nextAgents[targetAgent.seat] = {
      ...targetAgent,
      hp: nextTargetHp,
      shield: nextTargetShield,
      tacticalScore: targetAgent.tacticalScore + defenderMitigationBonus,
      alive: !killed,
      placement: killed ? placementIfKilled : null,
      eliminatedBy: killed ? seat : null,
      eliminatedCycle: killed ? p.cycle : null,
    };

    const pingKind = useGrenade
      ? ("explosion" as const)
      : effectiveWeapon === "sniper" || effectiveWeapon === "awm"
        ? ("sniper" as const)
        : ("gunfire" as const);

    nextPings = [
      ...nextPings,
      {
        step: nextStep,
        cycle: p.cycle,
        sourceSeat: seat,
        coord: ag.coord,
        x: ag.x,
        y: ag.y,
        kind: pingKind,
      },
    ].slice(-18);

    const weaponUsed: WeaponId | "grenade" = useGrenade
      ? "grenade"
      : effectiveWeapon;

    if (killed) {
      nextAlive = nextAlive.filter((s) => s !== targetAgent!.seat);
      // Drop a deathbox on victim's tile
      const vIdx = targetAgent.y * p.gridWidth + targetAgent.x;
      if (nextTiles[vIdx].crate === "none") {
        nextTiles[vIdx] = { ...nextTiles[vIdx], crate: "deathbox" };
      }
      nextKills = [
        ...nextKills,
        {
          step: nextStep,
          cycle: p.cycle,
          killerSeat: seat,
          victimSeat: targetAgent.seat,
          weapon: weaponUsed,
          placement: placementIfKilled,
        },
      ];
      lastEv = {
        step: nextStep,
        kind: "kill",
        actor: seat,
        targetSeat: targetAgent.seat,
        fromCoord: ag.coord,
        toCoord: targetAgent.coord,
        weapon: weaponUsed,
        damage: rawDmg,
        winner: nextAlive.length === 1 ? nextAlive[0] : null,
        summary: `[击杀] ${seat} 使用 [${weaponUsed.toUpperCase()}] 淘汰了 ${
          targetAgent.seat
        }！`,
      };
    } else {
      lastEv = {
        step: nextStep,
        kind: useGrenade ? "grenade" : "attack",
        actor: seat,
        targetSeat: targetAgent.seat,
        fromCoord: ag.coord,
        toCoord: targetAgent.coord,
        weapon: weaponUsed,
        damage: rawDmg,
        winner: null,
        summary: `[交火] ${seat} 攻击 ${targetAgent.seat} 造成 ${rawDmg} 点伤害${
          dmgCalc.cqbPenaltyApplied ? "（远距枪贴脸衰减）" : ""
        }`,
      };
    }
  }

  return {
    position: {
      ...p,
      tiles: nextTiles,
      agents: nextAgents,
      aliveSeats: nextAlive,
      soundPings: nextPings,
      killFeed: nextKills,
      lastEvent: lastEv,
      stepCount: nextStep,
    },
    endTurnNow,
  };
}

/**
 * Advances to the next player's turn or resolves end-of-cycle Storm & Airdrop events!
 */
function advanceTurnOrCycle(
  l: BattleRoyaleLobby,
  p: BattleRoyalePosition,
  actorSeat: Seat,
): { lobby: BattleRoyaleLobby; position: BattleRoyalePosition } {
  // Actor has now completed their combat turn, so their first-turn spawn protection ends
  const actorClearedAgents = {
    ...p.agents,
    [actorSeat]: {
      ...p.agents[actorSeat],
      spawnProtected: false,
    },
  };
  const pWithCleared = { ...p, agents: actorClearedAgents };

  // Check immediate victory if only 1 (or 0) alive
  if (pWithCleared.aliveSeats.length <= 1) {
    const winSeat = pWithCleared.aliveSeats[0] || actorSeat;
    const nextAgents = { ...pWithCleared.agents };
    if (nextAgents[winSeat]) {
      nextAgents[winSeat] = {
        ...nextAgents[winSeat],
        placement: 1,
        tacticalScore: nextAgents[winSeat].tacticalScore + 35,
      };
    }
    return {
      lobby: { ...l, phase: "finished" },
      position: {
        ...pWithCleared,
        turn: null,
        turnAp: 0,
        turnStartedAt: null,
        agents: nextAgents,
        winner: winSeat,
        lastEvent: {
          step: pWithCleared.stepCount,
          kind: "victory",
          actor: winSeat,
          targetSeat: null,
          fromCoord: nextAgents[winSeat]?.coord || null,
          toCoord: null,
          weapon: null,
          damage: null,
          winner: winSeat,
          summary: `[胜出] 大吉大利，今晚吃鸡！${winSeat} 成为最终幸存冠军！`,
        },
      },
    };
  }

  const nextCompleted = pWithCleared.completedTurnSeats.includes(actorSeat)
    ? pWithCleared.completedTurnSeats
    : [...pWithCleared.completedTurnSeats, actorSeat];

  const remainingInCycle = pWithCleared.turnOrder.filter(
    (s) => pWithCleared.aliveSeats.includes(s) && !nextCompleted.includes(s),
  );

  if (remainingInCycle.length > 0) {
    const nextTurn = remainingInCycle[0];
    // Reset guarding status at the start of the next player's own turn
    const nextAgents = {
      ...pWithCleared.agents,
      [nextTurn]: { ...pWithCleared.agents[nextTurn], guarding: false },
    };
    return {
      lobby: l,
      position: {
        ...pWithCleared,
        turn: nextTurn,
        turnAp: 2,
        turnStartedAt: Date.now(),
        completedTurnSeats: nextCompleted,
        agents: nextAgents,
      },
    };
  }

  // End of Cycle! Resolve Storm Damage, Storm Shrinking, and Golden Airdrop!
  const nextCycle = pWithCleared.cycle + 1;
  let nextRadius = pWithCleared.stormRadius;
  if (nextCycle === 2) nextRadius = 3;
  else if (nextCycle === 3) nextRadius = 2;
  else if (nextCycle === 4) nextRadius = 1;
  else if (nextCycle >= 5) nextRadius = 0;

  const nextNextRadius = Math.max(0, nextRadius - 1);
  const stormDmg = 12 + pWithCleared.cycle * 6;
  const nextAgents = { ...pWithCleared.agents };
  let nextAlive = [...pWithCleared.aliveSeats];
  const nextKills = [...pWithCleared.killFeed];
  const nextTiles = [...pWithCleared.tiles];
  let nextPings = [...pWithCleared.soundPings];

  // Clear any leftover spawnProtected flags at end of Cycle 1 and apply Storm damage
  for (const s of [...nextAlive]) {
    const ag = { ...nextAgents[s], spawnProtected: false };
    nextAgents[s] = ag;
    if (ag.x !== null && ag.y !== null && isInStorm(pWithCleared, ag.x, ag.y)) {
      if (nextAlive.length <= 1) break;
      const newHp = Math.max(0, ag.hp - stormDmg);
      const died = newHp === 0;
      const rank = nextAlive.length;
      nextAgents[s] = {
        ...ag,
        hp: newHp,
        tacticalScore: Math.max(0, ag.tacticalScore - 6),
        alive: !died,
        placement: died ? rank : null,
        eliminatedBy: died ? "storm" : null,
        eliminatedCycle: died ? pWithCleared.cycle : null,
        lastActionSummary: died
          ? `在 ${ag.coord} 被电磁毒圈吞噬出局`
          : `在毒圈外受损 (-${stormDmg} HP)`,
      };
      if (died) {
        nextAlive = nextAlive.filter((id) => id !== s);
        nextKills.push({
          step: pWithCleared.stepCount,
          cycle: pWithCleared.cycle,
          killerSeat: null,
          victimSeat: s,
          weapon: "storm",
          placement: rank,
        });
      }
    } else if (ag.x !== null && ag.y !== null) {
      // Safe zone survival bonus
      nextAgents[s] = {
        ...ag,
        tacticalScore: ag.tacticalScore + 4,
      };
    }
  }

  if (nextAlive.length <= 1) {
    const winSeat = nextAlive[0] || actorSeat;
    if (nextAgents[winSeat]) {
      nextAgents[winSeat] = {
        ...nextAgents[winSeat],
        placement: 1,
        tacticalScore: nextAgents[winSeat].tacticalScore + 35,
      };
    }
    return {
      lobby: { ...l, phase: "finished" },
      position: {
        ...pWithCleared,
        cycle: nextCycle,
        turn: null,
        turnAp: 0,
        turnStartedAt: null,
        aliveSeats: nextAlive,
        agents: nextAgents,
        killFeed: nextKills,
        winner: winSeat,
        lastEvent: {
          step: pWithCleared.stepCount,
          kind: "victory",
          actor: winSeat,
          targetSeat: null,
          fromCoord: nextAgents[winSeat]?.coord || null,
          toCoord: null,
          weapon: null,
          damage: null,
          winner: winSeat,
          summary: `[胜出] 大吉大利，今晚吃鸡！${winSeat} 赢得最终胜利！`,
        },
      },
    };
  }

  // Spawn a Golden Airdrop near the Safe Zone center on cycles 2 and 4
  if (nextCycle === 2 || nextCycle === 4) {
    const dropX = pWithCleared.stormCenter.x;
    const dropY = pWithCleared.stormCenter.y;
    const dropCoord = toCoord(dropX, dropY);
    const idx = dropY * pWithCleared.gridWidth + dropX;
    nextTiles[idx] = { ...nextTiles[idx], crate: "airdrop" };
    nextPings = [
      ...nextPings,
      {
        step: pWithCleared.stepCount,
        cycle: nextCycle,
        sourceSeat: null,
        coord: dropCoord,
        x: dropX,
        y: dropY,
        kind: "airdrop" as const,
      },
    ].slice(-18);
  }

  // Fair Snake + Rotated turn order for the new cycle!
  const baseDropOrder = pWithCleared.dropOrder?.length
    ? pWithCleared.dropOrder
    : pWithCleared.activeSeats;
  const nextTurnOrder = computeCycleTurnOrder(
    baseDropOrder,
    nextAlive,
    nextCycle,
  );
  const firstTurn = nextTurnOrder[0];
  nextAgents[firstTurn] = { ...nextAgents[firstTurn], guarding: false };

  return {
    lobby: l,
    position: {
      ...pWithCleared,
      cycle: nextCycle,
      turn: firstTurn,
      turnAp: 2,
      turnStartedAt: Date.now(),
      aliveSeats: nextAlive,
      turnOrder: nextTurnOrder,
      completedTurnSeats: [],
      tiles: nextTiles,
      agents: nextAgents,
      stormRadius: nextRadius,
      nextStormRadius: nextNextRadius,
      soundPings: nextPings,
      killFeed: nextKills,
    },
  };
}

/**
 * Applies a 1-to-2 step tactical action for `seat` during `combat` phase,
 * including optional public `radio`, private encrypted `whisper`, and private `tacticalNote`.
 */
export function applyCombatAction(
  l: BattleRoyaleLobby,
  p: BattleRoyalePosition,
  seat: Seat,
  steps: ActionStepInput[],
  rawRadio?: string | null,
  finishTurn = true,
  rawWhisper?: WhisperInput | null,
  rawNote?: string | null,
): { lobby: BattleRoyaleLobby; position: BattleRoyalePosition } {
  if (l.phase !== "combat") {
    throw new Error("当前不是战术交火阶段");
  }
  if (p.turn !== seat) {
    throw new Error(`当前尚未轮到 ${seat} 行动`);
  }
  if (steps.length < 1 || steps.length > p.turnAp) {
    throw new Error(`可执行动作步数必须在 1～${p.turnAp} 之间`);
  }

  let currPos = p;
  let usedAp = 0;
  let forceEnd = false;

  const radio = rawRadio?.trim() ? rawRadio.trim().slice(0, 80) : null;
  const note = rawNote?.trim() ? rawNote.trim().slice(0, 200) : null;
  const whisperMsg = rawWhisper?.message?.trim()
    ? rawWhisper.message.trim().slice(0, 100)
    : null;
  const whisperTo =
    rawWhisper?.to &&
    allSeats.includes(rawWhisper.to) &&
    rawWhisper.to !== seat
      ? rawWhisper.to
      : null;

  if (radio || note || (whisperMsg && whisperTo)) {
    const prevAg = currPos.agents[seat];
    const noteBonus = note && note !== prevAg.tacticalNote ? 3 : 0;
    const whisperBonus = whisperMsg && whisperTo ? 3 : 0;
    currPos = {
      ...currPos,
      agents: {
        ...currPos.agents,
        [seat]: {
          ...prevAg,
          lastRadio: radio ?? prevAg.lastRadio,
          tacticalNote: note ?? prevAg.tacticalNote,
          tacticalScore: prevAg.tacticalScore + noteBonus + whisperBonus,
        },
      },
      radioLogs: radio
        ? [
            ...currPos.radioLogs,
            {
              step: currPos.stepCount + 1,
              cycle: currPos.cycle,
              seat,
              text: radio,
            },
          ].slice(-20)
        : currPos.radioLogs,
      whisperLogs:
        whisperMsg && whisperTo
          ? [
              ...(currPos.whisperLogs || []),
              {
                step: currPos.stepCount + 1,
                cycle: currPos.cycle,
                fromSeat: seat,
                toSeat: whisperTo,
                text: whisperMsg,
              },
            ].slice(-24)
          : currPos.whisperLogs || [],
    };
  }

  for (const st of steps) {
    try {
      const res = executeSingleStep(currPos, seat, st);
      currPos = res.position;
      usedAp += 1;
      if (res.endTurnNow || currPos.aliveSeats.length <= 1) {
        forceEnd = true;
        break;
      }
    } catch (err) {
      if (usedAp > 0) {
        forceEnd = true;
        break;
      }
      throw err;
    }
  }

  const remainingAp = Math.max(0, p.turnAp - usedAp);
  if (!finishTurn && !forceEnd && remainingAp > 0) {
    return {
      lobby: l,
      position: {
        ...currPos,
        turnAp: remainingAp,
      },
    };
  }

  return advanceTurnOrCycle(l, currPos, seat);
}

/**
 * Smart Tactical Bot AI for Parachute Drop:
 * Picks a high-value supply crate or military base coordinate and writes an initial tactical note.
 */
export function chooseBotDrop(
  p: BattleRoyalePosition,
  seat: Seat,
): { coord: string; radio: string; note: string } {
  const occupied = new Set(
    Object.values(p.agents)
      .filter((a) => a.dropped && a.coord)
      .map((a) => a.coord!),
  );

  const candidates = p.tiles.filter((t) => !occupied.has(t.coord));
  const scored = candidates.map((t) => {
    let score = 10;
    if (t.terrain === "base") score += 35;
    if (t.crate === "supply") score += 25;
    if (t.terrain === "tower") score += 18;
    const distCenter = chebyshevDist(t.x, t.y, p.stormCenter.x, p.stormCenter.y);
    score -= distCenter * 4;
    const hash = (allSeats.indexOf(seat) * 11 + t.x * 7 + t.y * 13) % 15;
    return { coord: t.coord, score: score + hash };
  });

  scored.sort((a, b) => b.score - a.score);
  const chosen = scored[0]?.coord || "D3";

  const dropRadios = [
    `直接跳 ${chosen} 搜高阶枪，谁敢抢点？`,
    `降落 ${chosen} 稳一手发育，决赛圈见！`,
    `航线不错，落 ${chosen} 先拿二级甲！`,
    `特种兵就位，准备清空这片区域！`,
  ];
  const radio =
    dropRadios[(p.stepCount + allSeats.indexOf(seat)) % dropRadios.length];
  const note = `空降 ${chosen}，优先搜集高阶步枪/狙击枪并向安全区中心 ${p.stormCenter.coord} 靠拢。`;
  return { coord: chosen, radio, note };
}

/**
 * High-IQ Tactical Bot AI for Combat Turn (2 AP):
 * - Evaluates optimal weapon range (kites away to dist>=2 when holding Sniper/AWM/Rifle; closes in to dist=1 with Shotgun)
 * - Checks ammo depletion and prioritizes looting crates when ammo <= 1
 * - Sends strategic encrypted whispers to propose temporary alliances against the current kill/HP leader
 * - Maintains a private `tacticalNote`
 */
export function chooseBotCombatAction(
  p: BattleRoyalePosition,
  seat: Seat,
): {
  steps: ActionStepInput[];
  radio: string;
  whisper?: WhisperInput;
  note: string;
} {
  const ag = p.agents[seat];
  if (!ag || !ag.alive || ag.x === null || ag.y === null || !ag.coord) {
    return {
      steps: [{ kind: "guard" }],
      radio: "原地警戒！",
      note: "待命状态",
    };
  }

  const steps: ActionStepInput[] = [];
  let simX = ag.x;
  let simY = ag.y;
  let simHp = ag.hp;
  let simMedkits = ag.medkits;
  let simGrenades = ag.grenades;
  let simAmmo = ag.ammo;
  const simDamageTaken: Record<string, number> = {};

  const getNeighbors = (cx: number, cy: number) => {
    const list: TileState[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const t = getTile(p, cx + dx, cy + dy);
        if (t) list.push(t);
      }
    }
    return list;
  };

  const visibleEnemiesFrom = (cx: number, cy: number) => {
    const tile = getTile(p, cx, cy);
    const vRad =
      2 +
      (tile?.terrain === "tower" ? 1 : 0) +
      (WEAPONS[ag.weapon]?.visionBonus || 0);
    return p.aliveSeats
      .filter((s) => s !== seat)
      .map((s) => p.agents[s])
      .filter((e) => {
        if (!e.alive || e.x === null || e.y === null) return false;
        const alreadyDealt = simDamageTaken[e.seat] || 0;
        if (e.hp + e.shield - alreadyDealt <= 0) return false;
        const d = chebyshevDist(cx, cy, e.x, e.y);
        const eTile = getTile(p, e.x, e.y);
        if (eTile?.terrain === "bush") return d <= 1;
        return d <= vRad;
      });
  };

  for (let ap = 0; ap < 2; ap++) {
    const currTile = getTile(p, simX, simY)!;
    const inDangerZone = isInStorm(p, simX, simY);

    // Priority 1: If outside Safe Zone, move toward stormCenter immediately!
    if (inDangerZone) {
      const neighbors = getNeighbors(simX, simY);
      neighbors.sort(
        (a, b) =>
          chebyshevDist(a.x, a.y, p.stormCenter.x, p.stormCenter.y) -
          chebyshevDist(b.x, b.y, p.stormCenter.x, p.stormCenter.y),
      );
      if (neighbors[0]) {
        steps.push({ kind: "move", to: neighbors[0].coord });
        simX = neighbors[0].x;
        simY = neighbors[0].y;
        continue;
      }
    }

    // Priority 2: If HP <= 55 and has medkit, heal!
    if (simHp <= 55 && simMedkits > 0) {
      steps.push({ kind: "heal" });
      simHp = Math.min(100, simHp + 45);
      simMedkits -= 1;
      continue;
    }

    // Priority 3: If standing on a crate (or low on ammo on a crate) and haven't looted it yet, loot!
    if (
      currTile.crate !== "none" &&
      !steps.some((st) => st.kind === "loot")
    ) {
      steps.push({ kind: "loot" });
      simAmmo = WEAPONS[ag.weapon].maxAmmo;
      continue;
    }

    // Priority 4: Range-Aware Combat Kiting & Attack!
    const enemies = visibleEnemiesFrom(simX, simY);
    const wRange =
      (ag.weapon !== "fists" && simAmmo <= 0 ? 1 : WEAPONS[ag.weapon].range) +
      (currTile.terrain === "tower" ? 1 : 0);
    const optMin = WEAPONS[ag.weapon].optimalMinRange;

    // If holding a Sniper/AWM/Rifle (optMin >= 2), still have 2 AP (ap === 0), and an enemy is at point-blank dist=1,
    // kite back to a tile at dist=2 so we get full Sniper/Rifle damage on the second AP!
    if (
      ap === 0 &&
      optMin >= 2 &&
      simAmmo > 0 &&
      enemies.some(
        (e) =>
          e.x !== null &&
          e.y !== null &&
          chebyshevDist(simX, simY, e.x, e.y) === 1,
      )
    ) {
      const closeEnemy = enemies.find(
        (e) =>
          e.x !== null &&
          e.y !== null &&
          chebyshevDist(simX, simY, e.x, e.y) === 1,
      )!;
      const kiteCandidates = getNeighbors(simX, simY).filter(
        (t) =>
          !isInStorm(p, t.x, t.y) &&
          chebyshevDist(t.x, t.y, closeEnemy.x!, closeEnemy.y!) === 2,
      );
      if (kiteCandidates.length > 0) {
        kiteCandidates.sort((a, b) => {
          const scoreT = (t: TileState) =>
            (t.terrain === "tower" ? 15 : 0) +
            (t.terrain === "bunker" ? 12 : 0) +
            (t.terrain === "bush" ? 10 : 0);
          return scoreT(b) - scoreT(a);
        });
        steps.push({ kind: "move", to: kiteCandidates[0].coord });
        simX = kiteCandidates[0].x;
        simY = kiteCandidates[0].y;
        continue;
      }
    }

    const attackable = enemies.filter((e) => {
      const d = chebyshevDist(simX, simY, e.x!, e.y!);
      const maxR = simGrenades > 0 ? Math.max(wRange, 2) : wRange;
      return d <= maxR;
    });

    if (attackable.length > 0) {
      // Pick lowest HP+shield target
      attackable.sort(
        (a, b) =>
          a.hp +
          a.shield -
          (simDamageTaken[a.seat] || 0) -
          (b.hp + b.shield - (simDamageTaken[b.seat] || 0)),
      );
      const tgt = attackable[0];
      const d = chebyshevDist(simX, simY, tgt.x!, tgt.y!);
      const useGrenade =
        simGrenades > 0 &&
        d <= 2 &&
        (getTile(p, tgt.x!, tgt.y!)?.terrain === "bunker" ||
          WEAPONS[ag.weapon].damage < 40);
      if (useGrenade) simGrenades -= 1;
      else if (ag.weapon !== "fists" && simAmmo > 0) simAmmo -= 1;

      const estDmg = useGrenade
        ? 44
        : computeWeaponDamage(simAmmo >= 0 ? ag.weapon : "fists", d).baseDamage;
      simDamageTaken[tgt.seat] = (simDamageTaken[tgt.seat] || 0) + estDmg;
      steps.push({
        kind: "attack",
        target: tgt.seat,
        ...(useGrenade ? { useGrenade: true } : {}),
      });
      continue;
    }

    // Priority 5: If first AP, move toward nearest supply/airdrop crate or safe zone center
    if (ap === 0) {
      const neighbors = getNeighbors(simX, simY).filter(
        (t) => !isInStorm(p, t.x, t.y),
      );
      const pool = neighbors.length > 0 ? neighbors : getNeighbors(simX, simY);
      const scored = pool.map((t) => {
        let s = 0;
        if (t.crate === "airdrop") s += 50;
        else if (t.crate === "supply" || t.crate === "deathbox") s += 25;
        if (t.terrain === "tower") s += 12;
        if (t.terrain === "bunker") s += 10;
        if (t.terrain === "bush") s += 8;
        const dCenter = chebyshevDist(
          t.x,
          t.y,
          p.stormCenter.x,
          p.stormCenter.y,
        );
        s -= dCenter * 5;
        return { tile: t, s };
      });
      scored.sort((a, b) => b.s - a.s);
      if (scored[0]) {
        steps.push({ kind: "move", to: scored[0].tile.coord });
        simX = scored[0].tile.x;
        simY = scored[0].tile.y;
        continue;
      }
    }

    // Priority 6: End turn with Guard (Overwatch)
    steps.push({ kind: "guard" });
    break;
  }

  const hasAttack = steps.some((st) => st.kind === "attack");
  const hasHeal = steps.some((st) => st.kind === "heal");
  const hasLoot = steps.some((st) => st.kind === "loot");

  const radio = hasAttack
    ? "锁定目标，拉开最佳射程火力压制！"
    : hasHeal
      ? "掩体后打药修甲，谁也别想偷袭我！"
      : hasLoot
        ? "装备与弹药补给完毕，向安全区中心推进！"
        : "卡住安全区有利地形架枪警戒！";

  // Propose a private whisper alliance if 3+ players are alive
  let whisper: WhisperInput | undefined;
  const rivals = p.aliveSeats.filter((s) => s !== seat);
  if (rivals.length >= 2) {
    const sortedByThreat = [...rivals].sort(
      (a, b) =>
        p.agents[b].hp +
        p.agents[b].shield +
        p.agents[b].kills * 30 -
        (p.agents[a].hp + p.agents[a].shield + p.agents[a].kills * 30),
    );
    const leader = sortedByThreat[0];
    const allyCandidate = sortedByThreat[sortedByThreat.length - 1];
    if (allyCandidate && leader && allyCandidate !== leader) {
      whisper = {
        to: allyCandidate,
        message: `${leader} 目前状态最强，我们先互不侵犯，优先集火淘汰 ${leader}！`,
      };
    }
  }

  const note = `当前坐标 ${toCoord(simX, simY)}，武器 ${ag.weapon.toUpperCase()}(余弹 ${simAmmo})，安全区中心 ${p.stormCenter.coord}(R=${p.stormRadius})。`;

  return { steps, radio, whisper, note };
}
