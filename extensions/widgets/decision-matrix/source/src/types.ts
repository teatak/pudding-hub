export type HatColor =
  | "white"  // 客观事实与数据
  | "yellow" // 乐观收益与价值
  | "black"  // 审慎风险与漏洞
  | "red"    // 直觉感受与士气
  | "green"  // 创新对策与备选
  | "blue";  // 中立主持与综述

export type MatrixPhase = "setup" | "deliberating" | "completed";

export type RecommendationLevel =
  | "strongly_recommend"       // 强烈推荐推进
  | "recommend_with_caution"   // 审慎推荐推进
  | "neutral"                  // 保持中立 / 需补充验证
  | "not_recommended";         // 暂不建议推进

export interface ActionItem {
  id: string;
  title: string;
  completed: boolean;
  sourceHat?: HatColor;
}

export interface PerspectiveItem {
  id: string;
  hat: HatColor;
  headline: string;
  content: string;
  keyPoints?: string[];
  speakerName?: string;
  timestamp: number;
}

export interface SynthesisResult {
  recommendation: RecommendationLevel;
  score: number; // 0 - 100 综合推荐指数
  summary: string;
  actions: ActionItem[];
  synthesizedAt: number;
}

export interface MatrixLobby {
  topic: string;
  contextDesc: string;
  phase: MatrixPhase;
  seats: Record<HatColor, string | null>; // participantId or null
  ready: string[];
  startsAt: number | null;
}

export interface MatrixPosition {
  perspectives: PerspectiveItem[];
  synthesis: SynthesisResult | null;
  activeHat: HatColor;
  updatedAt: number;
}
