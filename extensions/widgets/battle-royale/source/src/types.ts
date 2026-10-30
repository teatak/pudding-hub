export type Seat = "Seat1" | "Seat2" | "Seat3" | "Seat4" | "Seat5" | "Seat6";

export type GamePhase = "lobby" | "dropping" | "combat" | "finished";

export type TerrainType = "plain" | "base" | "tower" | "bush" | "bunker";

export type CrateType = "none" | "supply" | "airdrop" | "deathbox";

export type WeaponId =
  | "fists"
  | "shotgun"
  | "smg"
  | "rifle"
  | "sniper"
  | "awm";

export interface WeaponSpec {
  id: WeaponId;
  damage: number;
  range: number;
  visionBonus: number;
  soundRange: number;
  tier: number;
}

export interface TileState {
  coord: string; // "A1" .. "H6"
  x: number; // 0..7
  y: number; // 0..5
  terrain: TerrainType;
  crate: CrateType;
}

export interface AgentState {
  seat: Seat;
  alive: boolean;
  dropped: boolean;
  coord: string | null;
  x: number | null;
  y: number | null;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  armorLevel: 0 | 1 | 2 | 3;
  weapon: WeaponId;
  medkits: number;
  grenades: number;
  guarding: boolean;
  kills: number;
  damageDealt: number;
  placement: number | null; // 1 = Winner, 2..6
  eliminatedBy: string | null; // Seat or "storm"
  eliminatedCycle: number | null;
  lastRadio: string | null;
  lastActionSummary: string | null;
}

export interface SoundPing {
  step: number;
  cycle: number;
  sourceSeat: Seat | null;
  coord: string;
  x: number;
  y: number;
  kind: "gunfire" | "sniper" | "explosion" | "airdrop" | "drop";
}

export interface KillFeedItem {
  step: number;
  cycle: number;
  killerSeat: Seat | null; // null if storm
  victimSeat: Seat;
  weapon: WeaponId | "grenade" | "storm";
  placement: number;
}

export interface RadioLogItem {
  step: number;
  cycle: number;
  seat: Seat;
  text: string;
}

export interface BattleEvent {
  step: number;
  kind:
    | "start"
    | "drop"
    | "move"
    | "loot"
    | "attack"
    | "grenade"
    | "heal"
    | "guard"
    | "storm"
    | "airdrop"
    | "kill"
    | "victory";
  actor: Seat | null;
  targetSeat: Seat | null;
  fromCoord: string | null;
  toCoord: string | null;
  weapon: WeaponId | "grenade" | "storm" | null;
  damage: number | null;
  winner: Seat | null;
  summary: string;
}

export type ActionStepInput =
  | { kind: "move"; to: string }
  | { kind: "loot" }
  | { kind: "attack"; target: string; useGrenade?: boolean }
  | { kind: "heal" }
  | { kind: "guard" };

export interface BattleRoyaleLobby {
  round: number;
  phase: GamePhase;
  playerCount: 4 | 6;
  seats: Record<Seat, string | null>;
  ready: string[];
  startsAt: number | null;
}

export interface BattleRoyalePosition {
  cycle: number;
  turn: Seat | null;
  turnAp: number; // Remaining AP for current turn (starts at 2 in combat)
  turnStartedAt: number | null;
  activeSeats: Seat[];
  aliveSeats: Seat[];
  turnOrder: Seat[];
  completedTurnSeats: Seat[];
  gridWidth: number; // 8 (A..H)
  gridHeight: number; // 6 (1..6)
  tiles: TileState[];
  agents: Record<Seat, AgentState>;
  stormCenter: { x: number; y: number; coord: string };
  stormRadius: number; // Chebyshev radius around stormCenter; tiles with dist > stormRadius are in storm
  nextStormRadius: number;
  soundPings: SoundPing[];
  killFeed: KillFeedItem[];
  radioLogs: RadioLogItem[];
  lastEvent: BattleEvent | null;
  stepCount: number;
  winner: Seat | null;
}
