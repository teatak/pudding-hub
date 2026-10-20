export type Role = "Pro" | "Con" | "Judge";

export type DebatePhase =
  | "lobby"
  | "round1_pro"
  | "round1_con"
  | "round2_pro"
  | "round2_con"
  | "round3_pro"
  | "round3_con"
  | "verdict";

export interface ArgumentItem {
  id: string;
  role: Role;
  round: number; // 1: 立论, 2: 攻辩, 3: 结辩
  headline: string;
  content: string;
  comment?: string;
  timestamp: number;
  speakerName?: string;
}

export interface VerdictData {
  winner: "Pro" | "Con" | "Draw";
  proScore: number;
  conScore: number;
  summary: string;
  keyPoints?: string[];
}

export interface DebateLobby {
  round: number;
  phase: DebatePhase;
  topic: string;
  seats: Record<Role, string | null>;
  ready: string[];
  startsAt: number | null;
}

export interface DebatePosition {
  arguments: ArgumentItem[];
  verdict: VerdictData | null;
  proAdvantage: number; // 0–100, 50 表示势均力敌
  turnStartedAt: number | null;
  turnElapsedMS: number;
}
