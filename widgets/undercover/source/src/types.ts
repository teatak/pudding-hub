export type Seat = "Seat1" | "Seat2" | "Seat3" | "Seat4" | "Seat5" | "Seat6";

export type PlayerRole = "Civilian" | "Undercover";

export type GamePhase = "lobby" | "speaking" | "voting" | "finished";

export type WordCategory = "all" | "tech" | "food" | "culture" | "daily" | "custom";

export interface WordPair {
  id: string;
  category: Exclude<WordCategory, "all" | "custom">;
  civilianWord: string;
  undercoverWord: string;
  civilianClues: string[];
  undercoverClues: string[];
}

export interface SpeechRecord {
  step: number;
  cycle: number;
  isPk: boolean;
  seat: Seat;
  text: string;
}

export interface VoteRecord {
  step: number;
  cycle: number;
  isPk: boolean;
  voter: Seat;
  target: Seat;
  reason: string | null;
}

export interface EliminationRecord {
  cycle: number;
  seat: Seat;
  role: PlayerRole;
  word: string;
  voteCount: number;
}

export interface LastAction {
  kind: "speak" | "vote";
  cycle: number;
  text: string | null;
  target: Seat | null;
  reason: string | null;
}

export interface DramaticEvent {
  step: number;
  kind: "deal" | "speak" | "vote" | "pk_tie" | "eliminated" | "victory";
  seat: Seat | null;
  target: Seat | null;
  role: PlayerRole | null;
  winner: PlayerRole | null;
}

export interface UndercoverLobby {
  round: number;
  phase: GamePhase;
  playerCount: 4 | 6;
  undercoverCount: 1 | 2;
  category: WordCategory;
  customCivilianWord: string | null;
  customUndercoverWord: string | null;
  seats: Record<Seat, string | null>; // participantID or "@bot:Seat1" etc.
  ready: string[];
  startsAt: number | null;
}

export interface UndercoverPosition {
  cycle: number; // 1, 2, 3...
  pkRound: number; // 0 = normal cycle, 1 = PK tie-break cycle
  pkCandidates: Seat[]; // non-empty when pkRound > 0
  turn: Seat | null;
  turnStartedAt: number | null;
  activeSeats: Seat[];
  aliveSeats: Seat[];
  speakingOrder: Seat[];
  spokenSeats: Seat[];
  votingOrder: Seat[];
  currentVotes: Record<Seat, { target: Seat; reason: string | null } | null>;
  roles: Record<Seat, PlayerRole>;
  words: Record<Seat, string>;
  civilianWord: string;
  undercoverWord: string;
  wordPairId: string;
  speeches: SpeechRecord[];
  votes: VoteRecord[];
  eliminated: EliminationRecord[];
  lastActions: Record<Seat, LastAction | null>;
  lastEvent: DramaticEvent | null;
  stepCount: number;
  winner: PlayerRole | null;
  winReason: string | null;
}
