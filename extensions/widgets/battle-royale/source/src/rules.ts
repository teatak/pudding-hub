import type {
  Seat,
  TerrainType,
  WeaponId,
  WeaponSpec,
  TileState,
  AgentState,
  ActionStepInput,
  BattleRoyaleLobby,
  BattleRoyalePosition,
} from "./types";

export const GRID_WIDTH = 8; // Columns A..H (0..7)
export const GRID_HEIGHT = 6; // Rows 1..6 (0..5)
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

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  fists: {
    id: "fists",
    damage: 18,
    range: 1,
    visionBonus: 0,
    soundRange: 1,
    tier: 0,
  },
  shotgun: {
    id: "shotgun",
    damage: 44,
    range: 1,
    visionBonus: 0,
    soundRange: 3,
    tier: 2,
  },
  smg: {
    id: "smg",
    damage: 30,
    range: 2,
    visionBonus: 0,
    soundRange: 3,
    tier: 1,
  },
  rifle: {
    id: "rifle",
    damage: 36,
    range: 2,
    visionBonus: 0,
    soundRange: 4,
    tier: 3,
  },
  sniper: {
    id: "sniper",
    damage: 48,
    range: 3,
    visionBonus: 1,
    soundRange: 6,
    tier: 4,
  },
  awm: {
    id: "awm",
    damage: 66,
    range: 4,
    visionBonus: 1,
    soundRange: 7,
    tier: 5,
  },
};

export function toCoord(x: number, y: number): string {
  return `${COL_LETTERS[x] || "A"}${y + 1}`;
}

export function parseCoord(raw: string): { x: number; y: number; coord: string } {
  const clean = raw.trim().toUpperCase();
  const match = clean.match(/^([A-H])([1-6])$/);
  if (!match) {
    throw new Error(`Invalid coordinate "${raw}" (use A1–H6, e.g. D3)`);
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
 * Generates an 8×6 tactical battlefield island with balanced POIs:
 * - Central Military Base tiles ("base") with high supply density
 * - Radar High Towers ("tower") for vision/range advantage
 * - Stealth Bushes ("bush") for concealment
 * - Concrete Bunkers ("bunker") for cover
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

      // Central military base cluster
      if ((x === 3 || x === 4) && (y === 2 || y === 3)) {
        terrain = "base";
        crate = "supply";
      } else if (
        (x === 1 && y === 1) ||
        (x === 6 && y === 1) ||
        (x === 1 && y === 4) ||
        (x === 6 && y === 4)
      ) {
        terrain = "tower";
        if ((x + y + seed) % 2 === 0) crate = "supply";
      } else if (
        (x === 2 && y === 2) ||
        (x === 5 && y === 3) ||
        (x === 2 && y === 4) ||
        (x === 5 && y === 1) ||
        (x === 0 && y === 3) ||
        (x === 7 && y === 2)
      ) {
        terrain = "bush";
      } else if (
        (x === 3 && y === 1) ||
        (x === 4 && y === 4) ||
        (x === 1 && y === 2) ||
        (x === 6 && y === 3)
      ) {
        terrain = "bunker";
        crate = "supply";
      } else if ((x * 7 + y * 13 + seed) % 5 === 0) {
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
    medkits: 1,
    grenades: 0,
    guarding: false,
    kills: 0,
    damageDealt: 0,
    placement: null,
    eliminatedBy: null,
    eliminatedCycle: null,
    lastRadio: null,
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

  // Safe zone center slightly randomized near center (D3, E3, D4, E4)
  const centerX = 3 + (seed % 2);
  const centerY = 2 + (Math.floor(seed / 2) % 2);
  const stormCenter = {
    x: centerX,
    y: centerY,
    coord: toCoord(centerX, centerY),
  };

  const shift = round > 0 ? (round - 1) % activeSeats.length : 0;
  const turnOrder = [
    ...activeSeats.slice(shift),
    ...activeSeats.slice(0, shift),
  ];

  return {
    cycle: 1,
    turn: round > 0 ? turnOrder[0] : null,
    turnAp: 1,
    turnStartedAt: round > 0 ? Date.now() : null,
    activeSeats,
    aliveSeats: [...activeSeats],
    turnOrder,
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
    lastEvent:
      round > 0
        ? {
            step: 0,
            kind: "start",
            actor: turnOrder[0],
            targetSeat: null,
            fromCoord: null,
            toCoord: null,
            weapon: null,
            damage: null,
            winner: null,
            summary: "运输机已进入孤岛航线，请各特工选择空降坐标！",
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
 * Computes effective weapon range (weapon base range + 1 if standing on Radar Tower).
 */
export function attackRangeFor(
  p: BattleRoyalePosition,
  seat: Seat,
  useGrenade = false,
): number {
  const ag = p.agents[seat];
  if (!ag || !ag.alive || ag.x === null || ag.y === null) return 1;
  if (useGrenade) return 2;
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
 */
export function applyDropIn(
  l: BattleRoyaleLobby,
  p: BattleRoyalePosition,
  seat: Seat,
  rawCoord: string,
  rawRadio?: string | null,
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

  const nextAgent: AgentState = {
    ...p.agents[seat],
    dropped: true,
    coord,
    x,
    y,
    weapon,
    armorLevel,
    shield,
    maxShield,
    medkits,
    grenades,
    lastRadio: radio ?? p.agents[seat].lastRadio,
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

  const remainingDroppers = p.turnOrder.filter(
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
          summary: `${seat} 空降落入 ${coord}`,
        },
        stepCount: nextStep,
      },
    };
  }

  // All players have parachuted in -> Transition to Combat Round 1!
  return {
    lobby: {
      ...l,
      phase: "combat",
    },
    position: {
      ...p,
      cycle: 1,
      turn: p.turnOrder[0],
      turnAp: 2,
      turnStartedAt: Date.now(),
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
        summary: `全员空降完毕，第 1 轮战术交火正式开始！`,
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
    nextAgents[seat] = {
      ...ag,
      coord: dest.coord,
      x: dest.x,
      y: dest.y,
      guarding: false,
      lastActionSummary: `移动 ${fromCoord} ➔ ${dest.coord}`,
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

    if (tile.crate === "airdrop") {
      newWeapon = "awm";
      newArmor = 3;
      newMaxShield = 75;
      newShield = 75;
      newMedkits = Math.min(3, ag.medkits + 2);
      newGrenades = Math.min(3, ag.grenades + 1);
      nextTiles[tileIdx] = { ...tile, crate: "none" };
      summaryText = `${seat} 开启黄金空投！获得 [AWM重狙 + 三级甲 + 急救包]`;
    } else if (tile.crate === "supply" || tile.crate === "deathbox") {
      const roll = (ag.x * 3 + ag.y * 5 + nextStep) % 3;
      const candidateWeapon: WeaponId =
        roll === 0 ? "sniper" : roll === 1 ? "rifle" : "shotgun";
      if (WEAPONS[candidateWeapon].tier > WEAPONS[ag.weapon].tier) {
        newWeapon = candidateWeapon;
      }
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
      nextTiles[tileIdx] = { ...tile, crate: "none" };
      summaryText = `${seat} 搜刮物资箱，装备升级为 [${newWeapon.toUpperCase()}]`;
    } else {
      // Even on a tile without a crate, scavenging finds minor shield/bandage
      newShield = Math.min(ag.maxShield, ag.shield + 15);
      summaryText = `${seat} 在 ${ag.coord} 搜索零散补给（护甲+15）`;
    }

    nextAgents[seat] = {
      ...ag,
      weapon: newWeapon,
      armorLevel: newArmor,
      shield: newShield,
      maxShield: newMaxShield,
      medkits: newMedkits,
      grenades: newGrenades,
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
    const maxRange = attackRangeFor(p, seat, useGrenade);

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

    if (!targetAgent || targetAgent.x === null || targetAgent.y === null || !targetAgent.coord) {
      throw new Error(`目标 "${rawTarget}" 上没有可攻击的存活敌人`);
    }

    const dist = chebyshevDist(ag.x, ag.y, targetAgent.x, targetAgent.y);
    if (dist > maxRange) {
      throw new Error(
        `目标 ${targetAgent.seat} (${targetAgent.coord}) 距离为 ${dist}，超出你当前武器射程 (${maxRange})`,
      );
    }

    const tgtTile = getTile(p, targetAgent.x, targetAgent.y);
    let rawDmg = useGrenade ? 44 : WEAPONS[ag.weapon].damage;

    // Cover & Guard mitigation (Grenades ignore bunker cover!)
    if (!useGrenade && tgtTile?.terrain === "bunker") {
      rawDmg = Math.round(rawDmg * 0.75);
    }
    if (targetAgent.guarding) {
      rawDmg = Math.round(rawDmg * 0.65);
    }

    // Apply damage to shield first, then HP
    const shieldAbsorbed = Math.min(targetAgent.shield, rawDmg);
    const hpDamage = rawDmg - shieldAbsorbed;
    const nextTargetShield = targetAgent.shield - shieldAbsorbed;
    const nextTargetHp = Math.max(0, targetAgent.hp - hpDamage);
    const killed = nextTargetHp === 0;

    const updatedAttacker: AgentState = {
      ...nextAgents[seat],
      grenades: useGrenade ? ag.grenades - 1 : ag.grenades,
      kills: killed ? ag.kills + 1 : ag.kills,
      damageDealt: ag.damageDealt + rawDmg,
      guarding: false,
      lastActionSummary: `${useGrenade ? "投掷手雷轰炸" : "开火命中"} ${
        targetAgent.seat
      } (-${rawDmg})`,
    };
    nextAgents[seat] = updatedAttacker;

    const placementIfKilled = nextAlive.length;
    nextAgents[targetAgent.seat] = {
      ...targetAgent,
      hp: nextTargetHp,
      shield: nextTargetShield,
      alive: !killed,
      placement: killed ? placementIfKilled : null,
      eliminatedBy: killed ? seat : null,
      eliminatedCycle: killed ? p.cycle : null,
    };

    const pingKind = useGrenade
      ? ("explosion" as const)
      : ag.weapon === "sniper" || ag.weapon === "awm"
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

    const weaponUsed: WeaponId | "grenade" = useGrenade ? "grenade" : ag.weapon;

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
        summary: `🔥 ${seat} 使用 [${weaponUsed.toUpperCase()}] 击杀淘汰了 ${
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
        summary: `💥 ${seat} 攻击 ${targetAgent.seat} 造成 ${rawDmg} 点伤害`,
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
  // Check immediate victory if only 1 (or 0) alive
  if (p.aliveSeats.length <= 1) {
    const winSeat = p.aliveSeats[0] || actorSeat;
    const nextAgents = { ...p.agents };
    if (nextAgents[winSeat]) {
      nextAgents[winSeat] = { ...nextAgents[winSeat], placement: 1 };
    }
    return {
      lobby: { ...l, phase: "finished" },
      position: {
        ...p,
        turn: null,
        turnAp: 0,
        turnStartedAt: null,
        agents: nextAgents,
        winner: winSeat,
        lastEvent: {
          step: p.stepCount,
          kind: "victory",
          actor: winSeat,
          targetSeat: null,
          fromCoord: nextAgents[winSeat]?.coord || null,
          toCoord: null,
          weapon: null,
          damage: null,
          winner: winSeat,
          summary: `🏆 大吉大利，今晚吃鸡！${winSeat} 成为最终幸存冠军！`,
        },
      },
    };
  }

  const nextCompleted = p.completedTurnSeats.includes(actorSeat)
    ? p.completedTurnSeats
    : [...p.completedTurnSeats, actorSeat];

  const remainingInCycle = p.turnOrder.filter(
    (s) => p.aliveSeats.includes(s) && !nextCompleted.includes(s),
  );

  if (remainingInCycle.length > 0) {
    const nextTurn = remainingInCycle[0];
    // Reset guarding status at the start of the next player's own turn
    const nextAgents = {
      ...p.agents,
      [nextTurn]: { ...p.agents[nextTurn], guarding: false },
    };
    return {
      lobby: l,
      position: {
        ...p,
        turn: nextTurn,
        turnAp: 2,
        turnStartedAt: Date.now(),
        completedTurnSeats: nextCompleted,
        agents: nextAgents,
      },
    };
  }

  // End of Cycle! Resolve Storm Damage, Storm Shrinking, and Golden Airdrop!
  const nextCycle = p.cycle + 1;
  let nextRadius = p.stormRadius;
  if (nextCycle === 2) nextRadius = 3;
  else if (nextCycle === 3) nextRadius = 2;
  else if (nextCycle === 4) nextRadius = 1;
  else if (nextCycle >= 5) nextRadius = 0;

  const nextNextRadius = Math.max(0, nextRadius - 1);
  const stormDmg = 12 + p.cycle * 6;
  const nextAgents = { ...p.agents };
  let nextAlive = [...p.aliveSeats];
  const nextKills = [...p.killFeed];
  const nextTiles = [...p.tiles];
  let nextPings = [...p.soundPings];

  // Apply Storm damage to anyone standing outside current stormRadius
  for (const s of [...nextAlive]) {
    const ag = nextAgents[s];
    if (ag.x !== null && ag.y !== null && isInStorm(p, ag.x, ag.y)) {
      // Don't eliminate the very last survivor by storm if only 1 left
      if (nextAlive.length <= 1) break;
      const newHp = Math.max(0, ag.hp - stormDmg);
      const died = newHp === 0;
      const rank = nextAlive.length;
      nextAgents[s] = {
        ...ag,
        hp: newHp,
        alive: !died,
        placement: died ? rank : null,
        eliminatedBy: died ? "storm" : null,
        eliminatedCycle: died ? p.cycle : null,
        lastActionSummary: died
          ? `在 ${ag.coord} 被电磁毒圈吞噬出局`
          : `在毒圈外受损 (-${stormDmg} HP)`,
      };
      if (died) {
        nextAlive = nextAlive.filter((id) => id !== s);
        nextKills.push({
          step: p.stepCount,
          cycle: p.cycle,
          killerSeat: null,
          victimSeat: s,
          weapon: "storm",
          placement: rank,
        });
      }
    }
  }

  if (nextAlive.length <= 1) {
    const winSeat = nextAlive[0] || actorSeat;
    if (nextAgents[winSeat]) {
      nextAgents[winSeat] = { ...nextAgents[winSeat], placement: 1 };
    }
    return {
      lobby: { ...l, phase: "finished" },
      position: {
        ...p,
        cycle: nextCycle,
        turn: null,
        turnAp: 0,
        turnStartedAt: null,
        aliveSeats: nextAlive,
        agents: nextAgents,
        killFeed: nextKills,
        winner: winSeat,
        lastEvent: {
          step: p.stepCount,
          kind: "victory",
          actor: winSeat,
          targetSeat: null,
          fromCoord: nextAgents[winSeat]?.coord || null,
          toCoord: null,
          weapon: null,
          damage: null,
          winner: winSeat,
          summary: `🏆 大吉大利，今晚吃鸡！${winSeat} 赢得最终胜利！`,
        },
      },
    };
  }

  // Spawn a Golden Airdrop near the Safe Zone center on cycles 2 and 4
  if (nextCycle === 2 || nextCycle === 4) {
    const dropX = p.stormCenter.x;
    const dropY = p.stormCenter.y;
    const dropCoord = toCoord(dropX, dropY);
    const idx = dropY * p.gridWidth + dropX;
    nextTiles[idx] = { ...nextTiles[idx], crate: "airdrop" };
    nextPings = [
      ...nextPings,
      {
        step: p.stepCount,
        cycle: nextCycle,
        sourceSeat: null,
        coord: dropCoord,
        x: dropX,
        y: dropY,
        kind: "airdrop" as const,
      },
    ].slice(-18);
  }

  // Rotate turn order slightly each cycle among alive players
  const nextTurnOrder = [...nextAlive];
  const firstTurn = nextTurnOrder[0];
  nextAgents[firstTurn] = { ...nextAgents[firstTurn], guarding: false };

  return {
    lobby: l,
    position: {
      ...p,
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
 * Applies a 1-to-2 step tactical action for `seat` during `combat` phase.
 * Also supports executing a single 1-AP step from the UI (`finishTurn = false`) so human players
 * can click to move (1 AP) and then click to fire/loot (1 AP)!
 */
export function applyCombatAction(
  l: BattleRoyaleLobby,
  p: BattleRoyalePosition,
  seat: Seat,
  steps: ActionStepInput[],
  rawRadio?: string | null,
  finishTurn = true,
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
  if (radio) {
    currPos = {
      ...currPos,
      agents: {
        ...currPos.agents,
        [seat]: { ...currPos.agents[seat], lastRadio: radio },
      },
      radioLogs: [
        ...currPos.radioLogs,
        {
          step: currPos.stepCount + 1,
          cycle: currPos.cycle,
          seat,
          text: radio,
        },
      ].slice(-20),
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
 * Picks a high-value supply crate or military base coordinate not already occupied.
 */
export function chooseBotDrop(
  p: BattleRoyalePosition,
  seat: Seat,
): { coord: string; radio: string } {
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
  const radio = dropRadios[(p.stepCount + allSeats.indexOf(seat)) % dropRadios.length];
  return { coord: chosen, radio };
}

/**
 * Smart Tactical Bot AI for Combat Turn (2 AP):
 * - Heals if HP <= 55 and has medkit;
 * - Moves into Safe Zone if outside stormRadius;
 * - Loots airdrop/supply crate if standing on one;
 * - Attacks visible enemy in range (or moves toward closest crate/safe center and attacks/loots/guards).
 */
export function chooseBotCombatAction(
  p: BattleRoyalePosition,
  seat: Seat,
): { steps: ActionStepInput[]; radio: string } {
  const ag = p.agents[seat];
  if (!ag || !ag.alive || ag.x === null || ag.y === null || !ag.coord) {
    return { steps: [{ kind: "guard" }], radio: "原地警戒！" };
  }

  const steps: ActionStepInput[] = [];
  let simX = ag.x;
  let simY = ag.y;
  let simHp = ag.hp;
  let simMedkits = ag.medkits;
  const simDamageTaken: Record<string, number> = {};
  let radio = "保持战术机动，搜索目标！";

  for (let apIndex = 0; apIndex < p.turnAp; apIndex++) {
    // 1. Emergency heal if low HP
    if (simHp <= 55 && simMedkits > 0) {
      steps.push({ kind: "heal" });
      simHp += 45;
      simMedkits -= 1;
      radio = "先打个急救包回口血，谁也别想偷袭我！";
      continue;
    }

    // 2. If outside Safe Zone, move toward stormCenter immediately!
    if (isInStorm(p, simX, simY)) {
      const dx = Math.sign(p.stormCenter.x - simX);
      const dy = Math.sign(p.stormCenter.y - simY);
      const nextX = Math.max(0, Math.min(p.gridWidth - 1, simX + dx));
      const nextY = Math.max(0, Math.min(p.gridHeight - 1, simY + dy));
      if (nextX !== simX || nextY !== simY) {
        simX = nextX;
        simY = nextY;
        steps.push({ kind: "move", to: toCoord(simX, simY) });
        radio = "毒圈刷了，赶紧进安全区！";
        continue;
      }
    }

    // 3. Check if standing on an unlooted crate
    const currTile = getTile(p, simX, simY);
    if (
      currTile &&
      currTile.crate !== "none" &&
      !steps.some((s) => s.kind === "loot")
    ) {
      steps.push({ kind: "loot" });
      radio =
        currTile.crate === "airdrop"
          ? "黄金空投归我了，AWM 在手天下我有！"
          : "搜刮物资箱，火力全面升级！";
      continue;
    }

    // 4. Check for enemies within weapon range from current simulated position
    const weaponRange =
      WEAPONS[ag.weapon].range + (currTile?.terrain === "tower" ? 1 : 0);
    const enemiesInRange = p.aliveSeats
      .filter((s) => s !== seat)
      .map((s) => p.agents[s])
      .filter(
        (e) =>
          e.alive &&
          e.x !== null &&
          e.y !== null &&
          e.hp + e.shield - (simDamageTaken[e.seat] || 0) > 0 &&
          chebyshevDist(simX, simY, e.x, e.y) <= weaponRange &&
          canAgentSeeAgent(p, seat, e.seat),
      )
      .sort(
        (a, b) =>
          a.hp +
          a.shield -
          (simDamageTaken[a.seat] || 0) -
          (b.hp + b.shield - (simDamageTaken[b.seat] || 0)),
      );

    if (enemiesInRange.length > 0) {
      const target = enemiesInRange[0];
      const useGrenade = ag.grenades > 0 && apIndex === 0;
      const estDmg = useGrenade ? 44 : WEAPONS[ag.weapon].damage;
      simDamageTaken[target.seat] =
        (simDamageTaken[target.seat] || 0) + estDmg;
      steps.push({
        kind: "attack",
        target: target.seat,
        useGrenade,
      });
      radio =
        target.hp <= 40
          ? `锁定残血 ${target.seat}，直接带走！`
          : `发现 ${target.seat}，果断压枪开火！`;
      continue;
    }

    // 5. Move toward nearest Airdrop, Supply Crate inside safe zone, or stormCenter
    const targetTiles = p.tiles.filter(
      (t) =>
        !isInStorm(p, t.x, t.y) &&
        (t.x !== simX || t.y !== simY) &&
        (t.crate === "airdrop" || t.crate === "supply" || t.terrain === "base"),
    );

    let goalX = p.stormCenter.x;
    let goalY = p.stormCenter.y;
    if (targetTiles.length > 0) {
      targetTiles.sort(
        (a, b) =>
          chebyshevDist(simX, simY, a.x, a.y) -
          chebyshevDist(simX, simY, b.x, b.y),
      );
      goalX = targetTiles[0].x;
      goalY = targetTiles[0].y;
    }

    const dx = Math.sign(goalX - simX);
    const dy = Math.sign(goalY - simY);
    const nextX = Math.max(0, Math.min(p.gridWidth - 1, simX + dx));
    const nextY = Math.max(0, Math.min(p.gridHeight - 1, simY + dy));

    if (nextX !== simX || nextY !== simY) {
      simX = nextX;
      simY = nextY;
      steps.push({ kind: "move", to: toCoord(simX, simY) });
    } else {
      steps.push({ kind: "guard" });
      radio = "占住有利地形架枪，坐山观虎斗！";
      break;
    }
  }

  if (steps.length === 0) {
    steps.push({ kind: "guard" });
  }
  return { steps, radio };
}
