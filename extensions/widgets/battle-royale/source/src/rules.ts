import type {
  Seat,
  TerrainType,
  CrateType,
  WeaponId,
  WeaponSpec,
  TileState,
  AgentState,
  ActionInput,
  BattleEvent,
  BattleRoyaleLobby,
  BattleRoyalePosition,
  GamePhase,
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

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  fists: {
    id: "fists",
    nameKey: "weapon_fists",
    damage: 25,
    range: 1,
  },
  rifle: {
    id: "rifle",
    nameKey: "weapon_rifle",
    damage: 35,
    range: 2,
  },
  sniper: {
    id: "sniper",
    nameKey: "weapon_sniper",
    damage: 50,
    range: 3,
  },
};

export function parseCoord(raw: string): { x: number; y: number; coord: string } {
  const clean = raw.trim().toUpperCase();
  if (clean.length < 2) {
    throw new Error(`Invalid coordinate: "${raw}"`);
  }
  const colLetter = clean[0];
  const rowStr = clean.slice(1);
  const colIdx = COL_LETTERS.indexOf(colLetter as (typeof COL_LETTERS)[number]);
  const rowNum = parseInt(rowStr, 10);
  if (colIdx < 0 || isNaN(rowNum) || rowNum < 1 || rowNum > GRID_HEIGHT) {
    throw new Error(`Coordinate out of bounds (A1..H8): "${raw}"`);
  }
  return {
    x: colIdx,
    y: rowNum - 1,
    coord: `${COL_LETTERS[colIdx]}${rowNum}`,
  };
}

export function toCoord(x: number, y: number): string {
  const cx = Math.max(0, Math.min(GRID_WIDTH - 1, x));
  const cy = Math.max(0, Math.min(GRID_HEIGHT - 1, y));
  return `${COL_LETTERS[cx]}${cy + 1}`;
}

export function chebyshevDist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

export function isInStorm(
  x: number,
  y: number,
  center: { x: number; y: number },
  radius: number,
): boolean {
  return chebyshevDist(x, y, center.x, center.y) > radius;
}

export function canAgentSeeTile(
  p: BattleRoyalePosition,
  observerSeat: Seat | null,
  targetX: number,
  targetY: number,
): boolean {
  if (!observerSeat) return true;
  const ag = p.agents[observerSeat];
  if (!ag || !ag.alive || ag.x === null || ag.y === null) return true;
  return chebyshevDist(ag.x, ag.y, targetX, targetY) <= 3;
}

export function canAgentSeeAgent(
  p: BattleRoyalePosition,
  observerSeat: Seat | null,
  targetSeat: Seat,
): boolean {
  if (!observerSeat || observerSeat === targetSeat) return true;
  const obs = p.agents[observerSeat];
  const tar = p.agents[targetSeat];
  if (!obs || !obs.alive || obs.x === null || obs.y === null) return true;
  if (!tar || !tar.alive || tar.x === null || tar.y === null) return false;

  const dist = chebyshevDist(obs.x, obs.y, tar.x, tar.y);
  if (dist > 3) return false;

  // Bush Stealth: if target is in a bush and dist > 1, concealed from afar
  const tile = p.tiles.find((t) => t.x === tar.x && t.y === tar.y);
  if (tile && tile.terrain === "bush" && dist > 1) {
    return false;
  }
  return true;
}

export function initialLobby(): BattleRoyaleLobby {
  return {
    round: 0,
    phase: "lobby",
    playerCount: 4,
    seats: {
      Seat1: "@me",
      Seat2: "@bot",
      Seat3: "@bot",
      Seat4: "@bot",
      Seat5: null,
      Seat6: null,
    },
    ready: [],
    startsAt: null,
  };
}

export function createInitialPosition(
  round: number,
  playerCount: 4 | 6,
  seed = 42,
): BattleRoyalePosition {
  const activeSeats = seatsForCount(playerCount);

  // Symmetric Bush tiles
  const bushCoords = new Set([
    "C3", "D3", "E3", "F3",
    "C6", "D6", "E6", "F6",
    "C4", "C5", "F4", "F5",
  ]);

  // Symmetric Supply Crate locations
  const crateCoords = new Set([
    "B2", "G2", "B7", "G7",
    "D4", "E4", "D5", "E5",
  ]);

  const tiles: TileState[] = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const coord = toCoord(x, y);
      const isBush = bushCoords.has(coord);
      const isCrate = crateCoords.has(coord);
      tiles.push({
        coord,
        x,
        y,
        terrain: isBush ? "bush" : "plain",
        crate: isCrate ? "supply" : "none",
      });
    }
  }

  const agents: Record<Seat, AgentState> = {
    Seat1: makeAgent("Seat1", activeSeats.includes("Seat1")),
    Seat2: makeAgent("Seat2", activeSeats.includes("Seat2")),
    Seat3: makeAgent("Seat3", activeSeats.includes("Seat3")),
    Seat4: makeAgent("Seat4", activeSeats.includes("Seat4")),
    Seat5: makeAgent("Seat5", activeSeats.includes("Seat5")),
    Seat6: makeAgent("Seat6", activeSeats.includes("Seat6")),
  };

  return {
    cycle: 1,
    turn: activeSeats[0] ?? null,
    turnOrder: [...activeSeats],
    activeSeats: [...activeSeats],
    aliveSeats: [...activeSeats],
    stormCenter: { x: 3, y: 3, coord: "D4" },
    stormRadius: 4,
    tiles,
    agents,
    stepCount: 0,
    lastEvent: {
      step: 0,
      kind: "start",
      actor: null,
      targetSeat: null,
      fromCoord: null,
      toCoord: null,
      weapon: null,
      damage: null,
      winner: null,
      summary: "孤岛空降开始！全员盲降跳伞，避开毒圈，存活至最后吃鸡！",
    },
    history: [],
    winner: null,
  };
}

function makeAgent(seat: Seat, active: boolean): AgentState {
  return {
    seat,
    alive: active,
    dropped: false,
    coord: null,
    x: null,
    y: null,
    hp: 100,
    maxHp: 100,
    weapon: "fists",
    kills: 0,
    damageDealt: 0,
    placement: null,
    eliminatedBy: null,
    eliminatedCycle: null,
    lastActionSummary: null,
  };
}

export function applyDropIn(
  l: BattleRoyaleLobby,
  p: BattleRoyalePosition,
  seat: Seat,
  rawCoord: string,
): { lobby: BattleRoyaleLobby; position: BattleRoyalePosition } {
  if (l.phase !== "dropping") {
    throw new Error("当前不是跳伞降落阶段");
  }
  if (p.turn !== seat) {
    throw new Error(`当前尚未轮到 ${seat} 跳伞`);
  }
  const dest = parseCoord(rawCoord);
  const nextAgents = { ...p.agents };
  const ag = { ...nextAgents[seat] };

  ag.dropped = true;
  ag.coord = dest.coord;
  ag.x = dest.x;
  ag.y = dest.y;

  // Auto-loot if landing on a crate
  const nextTiles = p.tiles.map((t) => ({ ...t }));
  const tileIdx = nextTiles.findIndex((t) => t.coord === dest.coord);
  let lootMsg = "";
  if (tileIdx >= 0 && nextTiles[tileIdx].crate !== "none") {
    const cType = nextTiles[tileIdx].crate;
    nextTiles[tileIdx].crate = "none";
    if (cType === "airdrop") {
      ag.weapon = "sniper";
      ag.hp = 100;
      lootMsg = "（获得狙击步枪）";
    } else {
      ag.weapon = "rifle";
      lootMsg = "（获得突击步枪）";
    }
  }

  ag.lastActionSummary = `降落 ${dest.coord} ${lootMsg}`;
  nextAgents[seat] = ag;

  // Next dropper
  const dropIdx = p.turnOrder.indexOf(seat);
  const nextDropSeat = dropIdx + 1 < p.turnOrder.length ? p.turnOrder[dropIdx + 1] : null;

  let nextPhase: GamePhase = l.phase;
  let nextTurn: Seat | null = nextDropSeat;
  let nextCycle = p.cycle;

  if (!nextDropSeat) {
    // All landed! Move to combat phase round 1
    nextPhase = "combat";
    nextTurn = p.aliveSeats[0] ?? null;
    nextCycle = 1;
  }

  const ev: BattleEvent = {
    step: p.stepCount + 1,
    kind: "drop",
    actor: seat,
    targetSeat: null,
    fromCoord: null,
    toCoord: dest.coord,
    weapon: ag.weapon,
    damage: null,
    winner: null,
    summary: `${seat} 空降落点 ${dest.coord} ${lootMsg}`,
  };

  return {
    lobby: { ...l, phase: nextPhase },
    position: {
      ...p,
      cycle: nextCycle,
      turn: nextTurn,
      tiles: nextTiles,
      agents: nextAgents,
      stepCount: p.stepCount + 1,
      lastEvent: ev,
      history: [...p.history.slice(-15), ev],
    },
  };
}

export function applyCombatAction(
  l: BattleRoyaleLobby,
  p: BattleRoyalePosition,
  seat: Seat,
  action: ActionInput,
): { lobby: BattleRoyaleLobby; position: BattleRoyalePosition } {
  if (l.phase !== "combat") {
    throw new Error("当前不是战斗交火阶段");
  }
  if (p.turn !== seat) {
    throw new Error(`当前尚未轮到 ${seat} 行动`);
  }

  let nextAgents = { ...p.agents };
  let nextTiles = p.tiles.map((t) => ({ ...t }));
  const ag = { ...nextAgents[seat] };
  if (!ag.alive || ag.x === null || ag.y === null) {
    throw new Error(`${seat} 无法行动`);
  }

  let ev: BattleEvent;

  if (action.kind === "move") {
    const dest = parseCoord(action.to);
    const dist = chebyshevDist(ag.x, ag.y, dest.x, dest.y);
    if (dist !== 1) {
      throw new Error(`移动只能前往相邻 1 格（目标 ${dest.coord} 距离为 ${dist}）`);
    }

    const fromCoord = ag.coord;
    ag.coord = dest.coord;
    ag.x = dest.x;
    ag.y = dest.y;

    // Auto-loot crate on destination tile
    const tileIdx = nextTiles.findIndex((t) => t.coord === dest.coord);
    let lootSummary = "";
    if (tileIdx >= 0 && nextTiles[tileIdx].crate !== "none") {
      const cType = nextTiles[tileIdx].crate;
      nextTiles[tileIdx].crate = "none";
      if (cType === "airdrop") {
        ag.weapon = "sniper";
        ag.hp = 100;
        lootSummary = "，拾取黄金空投获得【狙击步枪】并回复满生命";
      } else {
        ag.weapon = "rifle";
        lootSummary = "，拾取物资箱获得【突击步枪】";
      }
    }

    ag.lastActionSummary = `移动 ${fromCoord} → ${dest.coord}${lootSummary}`;
    nextAgents[seat] = ag;

    ev = {
      step: p.stepCount + 1,
      kind: "move",
      actor: seat,
      targetSeat: null,
      fromCoord,
      toCoord: dest.coord,
      weapon: ag.weapon,
      damage: null,
      winner: null,
      summary: `${seat} 转移至 ${dest.coord}${lootSummary}`,
    };
  } else if (action.kind === "attack") {
    const targetSeat = action.target as Seat;
    const targetAg = { ...nextAgents[targetSeat] };
    if (!targetAg.alive || targetAg.x === null || targetAg.y === null) {
      throw new Error(`目标 ${targetSeat} 已被淘汰或不可攻击`);
    }

    const dist = chebyshevDist(ag.x, ag.y, targetAg.x, targetAg.y);
    const wep = WEAPONS[ag.weapon];
    if (dist > wep.range) {
      throw new Error(`目标超出射程（当前武器射程 ${wep.range} 格，目标距离 ${dist} 格）`);
    }

    // Bush stealth check: if enemy is in bush and dist > 1, concealed
    const enemyTile = nextTiles.find((t) => t.coord === targetAg.coord);
    if (enemyTile && enemyTile.terrain === "bush" && dist > 1) {
      throw new Error(`目标潜伏在草丛中，无法在远程射程直接锁定`);
    }

    const dmg = wep.damage;
    targetAg.hp = Math.max(0, targetAg.hp - dmg);
    ag.damageDealt += dmg;

    let killed = false;
    if (targetAg.hp === 0) {
      targetAg.alive = false;
      targetAg.eliminatedBy = seat;
      targetAg.eliminatedCycle = p.cycle;
      targetAg.placement = p.aliveSeats.length;
      ag.kills += 1;
      killed = true;
    }

    ag.lastActionSummary = `攻击 ${targetSeat} 造成 ${dmg} 伤害${killed ? " 并淘汰" : ""}`;
    nextAgents[seat] = ag;
    nextAgents[targetSeat] = targetAg;

    ev = {
      step: p.stepCount + 1,
      kind: killed ? "kill" : "attack",
      actor: seat,
      targetSeat,
      fromCoord: ag.coord,
      toCoord: targetAg.coord,
      weapon: ag.weapon,
      damage: dmg,
      winner: null,
      summary: killed
        ? `【击杀】${seat} 使用 ${ag.weapon} 淘汰了 ${targetSeat}！`
        : `${seat} 攻击 ${targetSeat} 命中造成 ${dmg} 伤害`,
    };
  } else {
    throw new Error(`未知行动类型`);
  }

  // Update alive seats
  let nextAlive = p.activeSeats.filter((s) => nextAgents[s].alive);

  // Victory check
  if (nextAlive.length <= 1) {
    const winnerSeat = nextAlive[0] ?? null;
    if (winnerSeat) {
      nextAgents[winnerSeat].placement = 1;
    }
    const winEv: BattleEvent = {
      step: p.stepCount + 2,
      kind: "victory",
      actor: winnerSeat,
      targetSeat: null,
      fromCoord: null,
      toCoord: null,
      weapon: null,
      damage: null,
      winner: winnerSeat,
      summary: `大吉大利，今晚吃鸡！${winnerSeat} 赢得最终胜利！`,
    };
    return {
      lobby: { ...l, phase: "finished" },
      position: {
        ...p,
        turn: null,
        aliveSeats: nextAlive,
        agents: nextAgents,
        tiles: nextTiles,
        stepCount: p.stepCount + 2,
        lastEvent: winEv,
        history: [...p.history.slice(-15), ev, winEv],
        winner: winnerSeat,
      },
    };
  }

  // Turn progression
  const currentAliveIdx = nextAlive.indexOf(seat);
  const isRoundEnd = currentAliveIdx === nextAlive.length - 1;

  let nextCycle = p.cycle;
  let nextStormRadius = p.stormRadius;
  let nextTurn: Seat | null = isRoundEnd ? nextAlive[0] : nextAlive[currentAliveIdx + 1];

  // If round ended: shrink storm and apply radiation damage
  if (isRoundEnd) {
    nextCycle += 1;
    if (nextStormRadius > 1) {
      nextStormRadius -= 1;
    }

    // Spawn an airdrop on cycle 3 in safe zone if available
    if (nextCycle === 3) {
      const safeTiles = nextTiles.filter(
        (t) => !isInStorm(t.x, t.y, p.stormCenter, nextStormRadius) && t.crate === "none",
      );
      if (safeTiles.length > 0) {
        const dropTile = safeTiles[safeTiles.length - 1];
        dropTile.crate = "airdrop";
      }
    }

    // Apply storm radiation damage (20 dmg)
    for (const aSeat of nextAlive) {
      const aAg = { ...nextAgents[aSeat] };
      if (aAg.alive && aAg.x !== null && aAg.y !== null) {
        if (isInStorm(aAg.x, aAg.y, p.stormCenter, nextStormRadius)) {
          aAg.hp = Math.max(0, aAg.hp - 20);
          if (aAg.hp === 0) {
            aAg.alive = false;
            aAg.eliminatedBy = "storm";
            aAg.eliminatedCycle = nextCycle;
            aAg.placement = nextAlive.length;
          }
          nextAgents[aSeat] = aAg;
        }
      }
    }

    // Recheck alive seats after storm damage
    nextAlive = p.activeSeats.filter((s) => nextAgents[s].alive);
    if (nextAlive.length <= 1) {
      const winnerSeat = nextAlive[0] ?? null;
      if (winnerSeat) {
        nextAgents[winnerSeat].placement = 1;
      }
      const winEv: BattleEvent = {
        step: p.stepCount + 2,
        kind: "victory",
        actor: winnerSeat,
        targetSeat: null,
        fromCoord: null,
        toCoord: null,
        weapon: null,
        damage: null,
        winner: winnerSeat,
        summary: `大吉大利，今晚吃鸡！${winnerSeat} 赢得最终胜利！`,
      };
      return {
        lobby: { ...l, phase: "finished" },
        position: {
          ...p,
          cycle: nextCycle,
          stormRadius: nextStormRadius,
          turn: null,
          aliveSeats: nextAlive,
          agents: nextAgents,
          tiles: nextTiles,
          stepCount: p.stepCount + 2,
          lastEvent: winEv,
          history: [...p.history.slice(-15), ev, winEv],
          winner: winnerSeat,
        },
      };
    }
    nextTurn = nextAlive[0];
  }

  return {
    lobby: { ...l, phase: "combat" },
    position: {
      ...p,
      cycle: nextCycle,
      stormRadius: nextStormRadius,
      turn: nextTurn,
      aliveSeats: nextAlive,
      agents: nextAgents,
      tiles: nextTiles,
      stepCount: p.stepCount + 1,
      lastEvent: ev,
      history: [...p.history.slice(-15), ev],
    },
  };
}

export function chooseBotDrop(p: BattleRoyalePosition, seat: Seat): { coord: string } {
  // Prioritize landing on supply crates near safe zone
  const safeCrates = p.tiles.filter(
    (t) => t.crate !== "none" && !isInStorm(t.x, t.y, p.stormCenter, p.stormRadius),
  );
  if (safeCrates.length > 0) {
    const idx = (p.stepCount + seat.charCodeAt(4)) % safeCrates.length;
    return { coord: safeCrates[idx].coord };
  }
  // Otherwise land near safe center
  const centerCoord = p.stormCenter.coord;
  return { coord: centerCoord };
}

export function chooseBotCombatAction(
  p: BattleRoyalePosition,
  seat: Seat,
): ActionInput {
  const ag = p.agents[seat];
  if (!ag.alive || ag.x === null || ag.y === null) {
    return { kind: "move", to: "D4" };
  }

  const wep = WEAPONS[ag.weapon];

  // 1. Attack any enemy in range
  const enemiesInRange = p.aliveSeats
    .filter((s) => s !== seat)
    .map((s) => p.agents[s])
    .filter((e) => {
      if (!e.alive || e.x === null || e.y === null) return false;
      const d = chebyshevDist(ag.x!, ag.y!, e.x, e.y);
      if (d > wep.range) return false;
      // Bush check
      const tile = p.tiles.find((t) => t.coord === e.coord);
      if (tile && tile.terrain === "bush" && d > 1) return false;
      return true;
    });

  if (enemiesInRange.length > 0) {
    // Attack lowest HP enemy
    enemiesInRange.sort((a, b) => a.hp - b.hp);
    return { kind: "attack", target: enemiesInRange[0].seat };
  }

  // 2. Move towards nearest crate or safe center
  const crates = p.tiles.filter((t) => t.crate !== "none");
  let targetX = p.stormCenter.x;
  let targetY = p.stormCenter.y;

  if (crates.length > 0) {
    crates.sort((a, b) => chebyshevDist(ag.x!, ag.y!, a.x, a.y) - chebyshevDist(ag.x!, ag.y!, b.x, b.y));
    targetX = crates[0].x;
    targetY = crates[0].y;
  }

  // Choose adjacent step minimizing distance to target
  const dx = Math.sign(targetX - ag.x);
  const dy = Math.sign(targetY - ag.y);

  const nextX = Math.max(0, Math.min(GRID_WIDTH - 1, ag.x + dx));
  const nextY = Math.max(0, Math.min(GRID_HEIGHT - 1, ag.y + dy));

  if (nextX === ag.x && nextY === ag.y) {
    // Stay or step right
    const altX = Math.min(GRID_WIDTH - 1, ag.x + 1);
    return { kind: "move", to: toCoord(altX, ag.y) };
  }

  return { kind: "move", to: toCoord(nextX, nextY) };
}
