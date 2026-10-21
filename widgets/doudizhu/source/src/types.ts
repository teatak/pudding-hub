export type Seat = "South" | "East" | "West";

export type Suit = "S" | "H" | "C" | "D" | "J";

export type Rank =
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A"
  | "2"
  | "BJ"
  | "RJ";

export interface Card {
  id: string; // e.g., "S3", "H10", "BJ", "RJ"
  suit: Suit;
  rank: Rank;
  value: number; // 3..17
}

export type ComboType =
  | "single"
  | "pair"
  | "triple"
  | "triple_single"
  | "triple_pair"
  | "straight"
  | "pair_straight"
  | "airplane"
  | "airplane_single"
  | "airplane_pair"
  | "four_two_single"
  | "four_two_pair"
  | "bomb"
  | "rocket";

export interface Combo {
  type: ComboType;
  mainRank: Rank;
  mainValue: number;
  length: number;
  chainLength: number; // >1 for straight, pair_straight, airplane*
}

export type GamePhase = "lobby" | "bidding" | "playing" | "finished";

export type BidDecision = "call" | "rob" | "pass";

export interface SeatLastAction {
  kind: "call" | "rob" | "no_call" | "no_rob" | "play" | "pass";
  cards?: Card[];
  combo?: Combo;
  comment?: string;
}

export interface BiddingState {
  firstBidder: Seat;
  calledBy: Seat | null;
  highestBidder: Seat | null;
  robCount: number;
  passedCallSeats: Seat[]; // Seats that chose "不叫" before anyone called
  actedAfterCallSeats: Seat[]; // Seats that already answered rob/no_rob after calledBy
  finalCallerPending: boolean; // Whether calledBy still has 1 final rob/no_rob chance
}

export interface TablePlay {
  seat: Seat;
  cards: Card[];
  combo: Combo;
}

export interface DoudizhuLobby {
  round: number;
  phase: GamePhase;
  seats: Record<Seat, string | null>; // participantID or "@bot:South" | "@bot:East" | "@bot:West"
  ready: string[];
  startsAt: number | null;
}

export interface DoudizhuPosition {
  turn: Seat | null;
  turnStartedAt: number | null;
  landlord: Seat | null;
  hands: Record<Seat, Card[]>;
  bottomCards: Card[];
  bidding: BiddingState;
  multiplier: number;
  bombCount: number;
  spring: "spring" | "anti_spring" | null;
  currentPlay: TablePlay | null;
  passCount: number;
  lastActions: Record<Seat, SeatLastAction | null>;
  comments: Record<Seat, { step: number; text: string } | null>;
  playCounts: Record<Seat, number>;
  stepCount: number;
  winner: "Landlord" | "Peasant" | null;
  winningSeat: Seat | null;
}
