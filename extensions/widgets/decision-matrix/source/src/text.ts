export type Locale = "zh-CN" | "zh-TW" | "en";

let currentLocale: Locale = "zh-CN";

export function setLocale(locale: string) {
  if (locale === "zh-TW" || locale === "zh-HK") {
    currentLocale = "zh-TW";
  } else if (locale.startsWith("zh")) {
    currentLocale = "zh-CN";
  } else {
    currentLocale = "en";
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

const DICTIONARY: Record<Locale, Record<string, string>> = {
  "zh-CN": {
    appTitle: "决策罗盘",
    appSubtitle: "六顶思考帽多视角决策矩阵",
    phaseSetup: "议题设定",
    phaseDeliberating: "思辨推演中",
    phaseCompleted: "决策已收敛",

    // Hats
    hatWhite: "白帽 · 客观事实",
    hatWhiteShort: "事实 (白)",
    hatWhiteDesc: "梳理已知数据、现状基线、资源边界与客观约束",
    hatYellow: "黄帽 · 收益机遇",
    hatYellowShort: "收益 (黄)",
    hatYellowDesc: "发掘长远价值、最佳预期、增长空间与核心优势",
    hatBlack: "黑帽 · 审慎风险",
    hatBlackShort: "风险 (黑)",
    hatBlackDesc: "指出致命死穴、隐蔽代价、稳定性隐患与最坏后果",
    hatRed: "红帽 · 直觉体感",
    hatRedShort: "直觉 (红)",
    hatRedDesc: "表达第一直觉、团队士气、审美好恶与心理阻力",
    hatGreen: "绿帽 · 突破对策",
    hatGreenShort: "对策 (绿)",
    hatGreenDesc: "针对风险探索替代路径、避险方案与创新思路",
    hatBlue: "蓝帽 · 裁决综述",
    hatBlueShort: "综述 (蓝)",
    hatBlueDesc: "统揽各方权衡，计算得失比，提炼行动清单与定论",

    // Recommendations
    recStrongly: "建议果断推进",
    recCaution: "建议审慎试行",
    recNeutral: "中立 · 需补充验证",
    recNot: "暂不建议推行",

    // Matrix Layout
    tabMatrix: "决策矩阵 & 行动清单",
    tabPerspectives: "思考帽研判流",
    quadrantGains: "核心收益与机会 (Value)",
    quadrantRisks: "风险死穴与代价 (Risks)",
    quadrantFacts: "客观事实与底线 (Facts)",
    quadrantIntuition: "直觉体感与士气 (Gut)",
    actionChecklistTitle: "蓝帽行动清单 (Action Items)",
    overallScore: "综合推荐指数",
    verdictSummary: "最终综述与决策定调",

    // Form & Buttons
    btnStart: "启动多视角研判",
    btnDemo: "载入示例推演",
    btnReset: "重新立项",
    btnSynthesize: "蓝帽收敛结论",
    btnExportMd: "导出 Markdown",
    btnExportCopied: "已复制到剪贴板",
    btnSubmitView: "提交观点",
    topicInputPlaceholder: "请输入需要集体推演的决策难题（如：是否应将旧系统全面重构为微服务？）",
    contextInputPlaceholder: "补充背景信息、团队现状或外部限制（选填）",
    headlinePlaceholder: "一句话核心论点（80字以内）",
    argumentPlaceholder: "详细推演逻辑与佐证分析...",
    presetTopicsLabel: "经典决策参考：",

    // Notifications
    notifyInvite: "邀请加入决策罗盘",
    notifyYourTurn: "轮到思考帽阐述观点",
    notifyVerdict: "蓝帽已生成综合决策矩阵",
  },
  "zh-TW": {
    appTitle: "決策羅盤",
    appSubtitle: "六頂思考帽多視角決策矩陣",
    phaseSetup: "議題設定",
    phaseDeliberating: "思辨推演中",
    phaseCompleted: "決策已收斂",

    hatWhite: "白帽 · 客觀事實",
    hatWhiteShort: "事實 (白)",
    hatWhiteDesc: "梳理已知數據、現狀基線、資源邊界與客觀約束",
    hatYellow: "黃帽 · 收益機遇",
    hatYellowShort: "收益 (黃)",
    hatYellowDesc: "發掘長遠價值、最佳預期、增長空間與核心優勢",
    hatBlack: "黑帽 · 審慎風險",
    hatBlackShort: "風險 (黑)",
    hatBlackDesc: "指出致命死穴、隱蔽代價、穩定性隱患與最壞後果",
    hatRed: "紅帽 · 直覺體感",
    hatRedShort: "直覺 (紅)",
    hatRedDesc: "表達第一直覺、團隊士氣、審美好惡與心理阻力",
    hatGreen: "綠帽 · 突破對策",
    hatGreenShort: "對策 (綠)",
    hatGreenDesc: "針對風險探索替代路徑、避險方案與創新思路",
    hatBlue: "藍帽 · 裁決綜述",
    hatBlueShort: "綜述 (藍)",
    hatBlueDesc: "統攬各方權衡，計算得失比，提煉行動清單與定論",

    recStrongly: "建議果斷推進",
    recCaution: "建議審慎試行",
    recNeutral: "中立 · 需補充驗證",
    recNot: "暫不建議推行",

    tabMatrix: "決策矩陣 & 行動清單",
    tabPerspectives: "思考帽研判流",
    quadrantGains: "核心收益與機會 (Value)",
    quadrantRisks: "風險死穴與代價 (Risks)",
    quadrantFacts: "客觀事實與底線 (Facts)",
    quadrantIntuition: "直覺體感與士氣 (Gut)",
    actionChecklistTitle: "藍帽行動清單 (Action Items)",
    overallScore: "綜合推薦指數",
    verdictSummary: "最終綜述與決策定調",

    btnStart: "啟動多視角研判",
    btnDemo: "載入示例推演",
    btnReset: "重新立項",
    btnSynthesize: "藍帽收斂結論",
    btnExportMd: "匯出 Markdown",
    btnExportCopied: "已複製到剪貼板",
    btnSubmitView: "提交觀點",
    topicInputPlaceholder: "請輸入需要集體推演的決策難題（如：是否應將舊系統全面重構為微服務？）",
    contextInputPlaceholder: "補充背景資訊、團隊現狀或外部限制（選填）",
    headlinePlaceholder: "一句話核心論點（80字以內）",
    argumentPlaceholder: "詳細推演邏輯與佐證分析...",
    presetTopicsLabel: "經典決策參考：",

    notifyInvite: "邀請加入決策羅盤",
    notifyYourTurn: "輪到思考帽闡述觀點",
    notifyVerdict: "藍帽已生成綜合決策矩陣",
  },
  en: {
    appTitle: "Decision Matrix",
    appSubtitle: "Six Thinking Hats Compass",
    phaseSetup: "Topic Setup",
    phaseDeliberating: "Deliberating",
    phaseCompleted: "Synthesized",

    hatWhite: "White Hat · Facts & Data",
    hatWhiteShort: "Facts",
    hatWhiteDesc: "Objective baseline, known facts, hard constraints & unknowns",
    hatYellow: "Yellow Hat · Gains & Value",
    hatYellowShort: "Benefits",
    hatYellowDesc: "Positive potentials, best scenarios, strategic upsides",
    hatBlack: "Black Hat · Critical Risks",
    hatBlackShort: "Risks",
    hatBlackDesc: "Critical pitfalls, edge failures, downside costs & barriers",
    hatRed: "Red Hat · Gut & Culture",
    hatRedShort: "Gut Feeling",
    hatRedDesc: "Intuition, team morale, friction & subjective sentiment",
    hatGreen: "Green Hat · Alternatives",
    hatGreenShort: "Solutions",
    hatGreenDesc: "Creative workarounds, mitigations & pivot options",
    hatBlue: "Blue Hat · Synthesis",
    hatBlueShort: "Synthesis",
    hatBlueDesc: "Holistic evaluation, score balance & actionable checklist",

    recStrongly: "Strongly Recommended",
    recCaution: "Proceed with Caution",
    recNeutral: "Neutral · Needs More Data",
    recNot: "Not Recommended",

    tabMatrix: "Decision Matrix & Actions",
    tabPerspectives: "Thinking Hats Stream",
    quadrantGains: "Key Benefits & Upsides (Value)",
    quadrantRisks: "Risks & Pitfalls (Risks)",
    quadrantFacts: "Facts & Boundaries (Facts)",
    quadrantIntuition: "Gut & Morale (Intuition)",
    actionChecklistTitle: "Action Checklist (Blue Hat)",
    overallScore: "Recommendation Index",
    verdictSummary: "Synthesis & Final Verdict",

    btnStart: "Begin Deliberation",
    btnDemo: "Load Demo Dilemma",
    btnReset: "New Topic",
    btnSynthesize: "Synthesize Matrix",
    btnExportMd: "Export Markdown",
    btnExportCopied: "Copied to clipboard",
    btnSubmitView: "Add Perspective",
    topicInputPlaceholder: "What critical dilemma needs multi-perspective deliberation?",
    contextInputPlaceholder: "Additional background, team context, or budget constraints (optional)",
    headlinePlaceholder: "One-line core premise (within 80 chars)",
    argumentPlaceholder: "Elaborate arguments, trade-offs and rationale...",
    presetTopicsLabel: "Sample dilemmas:",

    notifyInvite: "Invitation to Decision Compass",
    notifyYourTurn: "Your turn to present perspective",
    notifyVerdict: "Blue Hat published final synthesis",
  },
};

export function t(key: string): string {
  return DICTIONARY[currentLocale]?.[key] || DICTIONARY["zh-CN"][key] || key;
}

export const PRESET_TOPICS = [
  {
    topic: "是否应当将核心后端服务用 Rust 全面重构？",
    context: "现状：现有 Node.js/Python 服务支撑良好，但在高并发内存占用大；团队仅 1 人熟悉 Rust，有交付周期压力。",
  },
  {
    topic: "产品下个版本是否应当全面转向订阅制（SaaS），取消买断？",
    context: "现状：买断制现金流波动大；老用户口碑良好但新获客成本攀升；竞品大多已转向年费订阅制。",
  },
  {
    topic: "团队是否应该强制要求所有 PR 代码合并前必须通过 AI Agent 自动化审查？",
    context: "现状：人工 Code Review 耗时长造成排队；初级工程师期待快速反馈，但资深工程师担忧误报干扰开发节奏。",
  },
];
