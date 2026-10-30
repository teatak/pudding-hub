import {
  type HatColor,
  type MatrixLobby,
  type MatrixPosition,
  type PerspectiveItem,
  type SynthesisResult,
  type ActionItem,
} from "./types";
import { t } from "./text";

export const HAT_ORDER: HatColor[] = [
  "white",
  "yellow",
  "black",
  "red",
  "green",
  "blue",
];

export interface HatMeta {
  id: HatColor;
  label: string;
  short: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
  accent: string;
}

export function getHatMeta(hat: HatColor): HatMeta {
  switch (hat) {
    case "white":
      return {
        id: "white",
        label: t("hatWhite"),
        short: t("hatWhiteShort"),
        desc: t("hatWhiteDesc"),
        color: "#F1F5F9",
        bg: "rgba(241, 245, 249, 0.06)",
        border: "rgba(241, 245, 249, 0.24)",
        accent: "#CBD5E1",
      };
    case "yellow":
      return {
        id: "yellow",
        label: t("hatYellow"),
        short: t("hatYellowShort"),
        desc: t("hatYellowDesc"),
        color: "#FBBF24",
        bg: "rgba(251, 191, 36, 0.08)",
        border: "rgba(251, 191, 36, 0.3)",
        accent: "#F59E0B",
      };
    case "black":
      return {
        id: "black",
        label: t("hatBlack"),
        short: t("hatBlackShort"),
        desc: t("hatBlackDesc"),
        color: "#CBD5E1",
        bg: "rgba(30, 41, 59, 0.7)",
        border: "rgba(100, 116, 139, 0.4)",
        accent: "#94A3B8",
      };
    case "red":
      return {
        id: "red",
        label: t("hatRed"),
        short: t("hatRedShort"),
        desc: t("hatRedDesc"),
        color: "#FB7185",
        bg: "rgba(251, 113, 133, 0.08)",
        border: "rgba(251, 113, 133, 0.3)",
        accent: "#F43F5E",
      };
    case "green":
      return {
        id: "green",
        label: t("hatGreen"),
        short: t("hatGreenShort"),
        desc: t("hatGreenDesc"),
        color: "#34D399",
        bg: "rgba(52, 211, 153, 0.08)",
        border: "rgba(52, 211, 153, 0.3)",
        accent: "#10B981",
      };
    case "blue":
      return {
        id: "blue",
        label: t("hatBlue"),
        short: t("hatBlueShort"),
        desc: t("hatBlueDesc"),
        color: "#60A5FA",
        bg: "rgba(96, 165, 250, 0.08)",
        border: "rgba(96, 165, 250, 0.35)",
        accent: "#3B82F6",
      };
  }
}

export function initialLobby(): MatrixLobby {
  return {
    topic: "",
    contextDesc: "",
    phase: "setup",
    seats: {
      white: null,
      yellow: null,
      black: null,
      red: null,
      green: null,
      blue: null,
    },
    ready: [],
    startsAt: null,
  };
}

export function initialPosition(): MatrixPosition {
  return {
    perspectives: [],
    synthesis: null,
    activeHat: "white",
    updatedAt: Date.now(),
  };
}

export function addPerspective(
  pos: MatrixPosition,
  lobby: MatrixLobby,
  item: Omit<PerspectiveItem, "id" | "timestamp">,
): { pos: MatrixPosition; lobby: MatrixLobby } {
  const newPerspective: PerspectiveItem = {
    ...item,
    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };

  // 移出同 hat 的历史观点（每个帽子保留最新的深度立论，也可并列，但保持精炼）
  const filtered = pos.perspectives.filter((p) => p.hat !== item.hat);
  const updatedPerspectives = [...filtered, newPerspective];

  // 自动顺延到下一个尚未发言的帽子
  const currentIdx = HAT_ORDER.indexOf(item.hat);
  let nextHat: HatColor = "blue";
  for (let i = 1; i <= HAT_ORDER.length; i++) {
    const candidate = HAT_ORDER[(currentIdx + i) % HAT_ORDER.length];
    if (!updatedPerspectives.some((p) => p.hat === candidate) && candidate !== "blue") {
      nextHat = candidate;
      break;
    }
  }

  return {
    pos: {
      ...pos,
      perspectives: updatedPerspectives,
      activeHat: nextHat,
      updatedAt: Date.now(),
    },
    lobby,
  };
}

export function setSynthesis(
  pos: MatrixPosition,
  lobby: MatrixLobby,
  synthesis: Omit<SynthesisResult, "synthesizedAt">,
): { pos: MatrixPosition; lobby: MatrixLobby } {
  const finalSynthesis: SynthesisResult = {
    ...synthesis,
    synthesizedAt: Date.now(),
  };
  return {
    pos: {
      ...pos,
      synthesis: finalSynthesis,
      activeHat: "blue",
      updatedAt: Date.now(),
    },
    lobby: {
      ...lobby,
      phase: "completed",
    },
  };
}

export function toggleActionItem(
  pos: MatrixPosition,
  actionId: string,
): MatrixPosition {
  if (!pos.synthesis) return pos;
  const actions = pos.synthesis.actions.map((act) =>
    act.id === actionId ? { ...act, completed: !act.completed } : act,
  );
  return {
    ...pos,
    synthesis: {
      ...pos.synthesis,
      actions,
    },
    updatedAt: Date.now(),
  };
}

export function generateMarkdownExport(
  lobby: MatrixLobby,
  pos: MatrixPosition,
): string {
  const lines: string[] = [];
  lines.push(`# 决策罗盘推演报告：${lobby.topic || "未命名决策议题"}`);
  if (lobby.contextDesc) {
    lines.push(`> **背景与约束**：${lobby.contextDesc}`);
  }
  lines.push("");

  if (pos.synthesis) {
    const recText =
      pos.synthesis.recommendation === "strongly_recommend"
        ? "✅ 强烈建议推进"
        : pos.synthesis.recommendation === "recommend_with_caution"
          ? "⚠️ 审慎试行推进"
          : pos.synthesis.recommendation === "neutral"
            ? "⚖️ 保持中立 / 待补充验证"
            : "🛑 暂不建议推进";

    lines.push("## 蓝帽裁决结论 (Blue Hat Verdict)");
    lines.push(`- **决策定调**：${recText}`);
    lines.push(`- **综合推荐指数**：${pos.synthesis.score} / 100`);
    lines.push(`- **综述说明**：${pos.synthesis.summary}`);
    lines.push("");

    if (pos.synthesis.actions.length > 0) {
      lines.push("### 落地行动清单 (Action Checklist)");
      for (const act of pos.synthesis.actions) {
        lines.push(`- [${act.completed ? "x" : " "}] ${act.title}`);
      }
      lines.push("");
    }
  }

  lines.push("## 六顶思考帽多视角论述");
  for (const hat of HAT_ORDER) {
    const p = pos.perspectives.find((item) => item.hat === hat);
    const meta = getHatMeta(hat);
    lines.push(`### ${meta.label}`);
    if (p) {
      lines.push(`**论点**：${p.headline}`);
      lines.push(`${p.content}`);
      if (p.keyPoints && p.keyPoints.length > 0) {
        lines.push("**关键要点**：");
        for (const kp of p.keyPoints) {
          lines.push(`  - ${kp}`);
        }
      }
    } else {
      lines.push("*（本视角暂无观点）*");
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(`*报告生成时间: ${new Date().toLocaleString()} · Pudding 决策罗盘*`);
  return lines.join("\n");
}

export function createDemoData(): { lobby: MatrixLobby; pos: MatrixPosition } {
  const topic = "是否应该将核心后端架构用 Rust 重构以替代现有 Node.js？";
  const contextDesc = "背景：Node.js 单机在千万级 WebSocket 长连接下内存吃紧且偶发 GC 抖动；团队 5 人仅 1 人熟悉 Rust，季度有重要商业交付。";

  const perspectives: PerspectiveItem[] = [
    {
      id: "p-white",
      hat: "white",
      headline: "Node.js 存在高并发 GC 延迟，但全量重构需 3~4 个月且团队认知缺口大",
      content: "数据统计显示当前单机内存峰值 6.8GB，每次 GC 引起 80~120ms 网络排队。全仓代码约 6 万行。目前仅 1 位核心开发有 Rust 生产经验，其他成员处于入门阶段。",
      keyPoints: ["单机内存压力确属事实", "全员 Rust 熟练度不足", "核心重构周期预估超 90 天"],
      speakerName: "客观事实 Agent",
      timestamp: Date.now() - 300000,
    },
    {
      id: "p-yellow",
      hat: "yellow",
      headline: "极限内存节省可达 70%，消除 GC 停顿，长远降低 50% 算力服务器开支",
      content: "重构后可彻底消除异步内存泄漏和垃圾回收抖动，SLA 稳定性大幅增强；单机承载能力翻倍，服务器成本每年预估减少约 15 万元，同时树立强健的技术壁垒。",
      keyPoints: ["服务器成本锐减", "SLA 达成率提升至 99.99%", "单机连接容量提升 3 倍"],
      speakerName: "收益机遇 Agent",
      timestamp: Date.now() - 240000,
    },
    {
      id: "p-black",
      hat: "black",
      headline: "致命风险在于学习曲线陡峭与商业交付延期，团队可能陷入借用检查黑洞",
      content: "若全面推倒重来，现有业务需求将停滞 3 个月以上，且一旦熟悉 Rust 的唯一骨干离职，项目将直接烂尾；且初期开发速度至少下降 50%，易引发内部军心涣散。",
      keyPoints: ["单点人员风险过高", "业务开发直接停摆", "交期拖延无法向管理层交代"],
      speakerName: "审慎风险 Agent",
      timestamp: Date.now() - 180000,
    },
    {
      id: "p-red",
      hat: "red",
      headline: "一线工程师对前沿语言有兴奋感，但对强行背负交付军令状深感焦虑",
      content: "团队内部私下交流表明，大家很想学习 Rust，但极度抗拒“一边学新技术一边还要按时交差”的高压环境，普遍觉得压力过大容易崩溃。",
      keyPoints: ["学习热情在，但抗拒高压军令状", "心理安全感不足"],
      speakerName: "直觉体验 Agent",
      timestamp: Date.now() - 120000,
    },
    {
      id: "p-green",
      hat: "green",
      headline: "不搞全量重写，将最瓶颈的网络包解包网关拆为独立微模块用 Rust 试点",
      content: "方案解耦：保持业务主逻辑在 Node.js 中不作大动，仅把吃内存和产生 GC 的纯网关/协议层（约 2000 行）用 Rust 编写并通过 FFI 或独立 Sidecar 挂载，既控风险又享红利。",
      keyPoints: ["只改 5% 关键瓶颈代码", "风险收敛至局部", "提供团队练手孵化期"],
      speakerName: "突破对策 Agent",
      timestamp: Date.now() - 60000,
    },
  ];

  const actions: ActionItem[] = [
    { id: "act-1", title: "圈定网关层协议解析为 Rust 试点微模块（限时 2 周 POC）", completed: true, sourceHat: "green" },
    { id: "act-2", title: "对现有 Node.js 进行一次专门的堆内存泄漏与 GC 调优，解燃眉之急", completed: false, sourceHat: "white" },
    { id: "act-3", title: "由骨干组织 3 次内部分享，消除借用检查与生命周期的认知恐惧", completed: false, sourceHat: "red" },
    { id: "act-4", title: "明确禁令：禁止在未完成 POC 前擅自重构任何核心业务逻辑", completed: true, sourceHat: "black" },
  ];

  const synthesis: SynthesisResult = {
    recommendation: "recommend_with_caution",
    score: 72,
    summary: "否定“全面推倒重构”，肯定“局部试点突破”。采用绿帽提出的方案——仅对高并发协议接入层进行 Rust 化抽离，既解决 GC 瓶颈，又将工期与团队崩溃风险降至最低。",
    actions,
    synthesizedAt: Date.now(),
  };

  return {
    lobby: {
      topic,
      contextDesc,
      phase: "completed",
      seats: {
        white: "agent-white",
        yellow: "agent-yellow",
        black: "agent-black",
        red: "agent-red",
        green: "agent-green",
        blue: "agent-blue",
      },
      ready: ["agent-white", "agent-yellow", "agent-black", "agent-red", "agent-green", "agent-blue"],
      startsAt: Date.now() - 360000,
    },
    pos: {
      perspectives,
      synthesis,
      activeHat: "blue",
      updatedAt: Date.now(),
    },
  };
}
