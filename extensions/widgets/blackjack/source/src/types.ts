export type Suit = "S" | "H" | "C" | "D"; // 黑桃 ♠, 红桃 ♥, 梅花 ♣, 方块 ♦

export type Rank =
  | "2"
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
  | "A";

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export interface HandValue {
  total: number;
  isSoft: boolean;
  isBlackjack: boolean;
  isBust: boolean;
}

export type GamePhase =
  | "betting"     // 待下注与发牌
  | "player_turn" // 玩家行动中 (Hit / Stand / Double)
  | "dealer_turn" // 庄家翻牌补牌中
  | "settled";    // 结算完成

export type GameResult =
  | "none"
  | "blackjack_win"   // 玩家天王天成 21 点 (3:2 赔率)
  | "player_win"      // 玩家点数胜出 (1:1 赔率)
  | "dealer_bust_win" // 庄家爆牌 (1:1 赔率)
  | "push"            // 平局打和 (返还下注)
  | "player_bust"     // 玩家爆牌负
  | "dealer_win";     // 庄家点数胜出

export interface GameStats {
  handsPlayed: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
}

export interface BlackjackLobby {
  dealerName: string;
  playerName: string;
  playerParticipantId: string | null;
  dealerParticipantId: string | null;
}

export interface BlackjackPosition {
  phase: GamePhase;
  chips: number;
  currentBet: number;
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  result: GameResult;
  winAmount: number;
  dealerSpeech: string;
  stats: GameStats;
  updatedAt: number;
}
