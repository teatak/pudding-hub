export type Seat = "Seat1" | "Seat2" | "Seat3" | "Seat4" | "Seat5" | "Seat6";

export type GamePhase = "lobby" | "dropping" | "combat" | "finished";

export type TerrainType = "plain" | "bush";

export type CrateType = "none" | "supply" | "airdrop";

export type WeaponId = "fists" | "rifle" | "sniper";

export interface WeaponSpec {
  id: WeaponId;
  nameKey: string;
  damage: number;
  range: number;
}

export interface TileState {
  coord: string; // "A1" .. "H8"
  x: number; // 0..7
  y: number; // 0..7
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
  weapon: WeaponId;
  kills: number;
  damageDealt: number;
  placement: number | null;
  eliminatedBy: string | null;
  eliminatedCycle: number | null;
  lastActionSummary: string | null;
}

export interface BattleEvent {
  step: number;
  kind: "start" | "drop" | "move" | "attack" | "storm" | "airdrop" | "kill" | "victory";
  actor: Seat | null;
  targetSeat: Seat | null;
  fromCoord: string | null;
  toCoord: string | null;
  weapon: WeaponId | "storm" | null;
  damage: number | null;
  winner: Seat | null;
  summary: string;
}

export type ActionInput =
  | { kind: "move"; to: string }
  | { kind: "attack"; target: string };

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
  turnOrder: Seat[];
  activeSeats: Seat[];
  aliveSeats: Seat[];
  stormCenter: { x: number; y: number; coord: string };
  stormRadius: number;
  tiles: TileState[];
  agents: Record<Seat, AgentState>;
  stepCount: number;
  lastEvent: BattleEvent | null;
  history: BattleEvent[];
  winner: Seat | null;
}
