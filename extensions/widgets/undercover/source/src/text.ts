import auxiliary from "./extra-ui.json" with { type: "json" };
import extra from "./locales.json" with { type: "json" };
export type WidgetLocale = "en" | "zh-CN" | "zh-TW" | "ja" | "ko" | "es" | "de" | "fr";
export function normalizeLocale(raw?: string): WidgetLocale {
  const locale = (raw || "en").toLowerCase();
  if (/^zh-(tw|hk|mo|hant)(-|$)/.test(locale)) return "zh-TW";
  if (locale === "zh" || locale.startsWith("zh-")) return "zh-CN";
  const language = locale.split("-")[0];
  return language === "ja" || language === "ko" || language === "es" || language === "de" || language === "fr" ? language : "en";
}

import type { Seat, WordCategory } from "./types";

type LocaleKey = WidgetLocale;

let currentLocale: LocaleKey = "en";

export function setLocale(raw?: string) { currentLocale = normalizeLocale(raw); }

const dict: Record<WidgetLocale, Record<string, string>> = {
  "zh-CN": {
    appTitle: "谁是卧底",
    godViewOn: "上帝视角",
    godViewOff: "退出透视",
    toggleSound: "音效开关",
    pause: "暂停",
    resume: "继续",
    configure: "设局配置",
    newRound: "新开一局",
    phaseLobby: "待开局",
    phaseSpeaking: "第 {cycle} 轮 · 线索陈述",
    phasePkSpeaking: "第 {cycle} 轮 · 平票加赛辩护",
    phaseVoting: "第 {cycle} 轮 · 锁定指认",
    phasePkVoting: "第 {cycle} 轮 · 加赛终极表决",
    phaseFinished: "档案揭晓 · 对局结束",
    aliveCount: "存活 {alive}/{total}",
    undercoverRemain: "潜伏卧底 {count} 人",
    playerYou: "我 (侦探主视角)",
    playerBot: "内置探员",
    humanSubTag: "人类玩家 · 亲自发言与指认",
    botTag: "内置 AI 探员 · 自动推理博弈",
    roleCivilian: "平民",
    roleUndercover: "卧底",
    roleSecret: "身份未知",
    statusAlive: "在场",
    statusOut: "已出局",
    secretCardTitle: "机密词条档案",
    secretCardHint: "仅你知道词条字面，不知自己是否卧底",
    holdToHide: "隐蔽词条",
    revealWord: "显露词条",
    wordHiddenMask: "•••• (已掩蔽)",
    godWordComparison: "机密底牌对照",
    civilianWordLabel: "平民词",
    undercoverWordLabel: "卧底词",
    dossierTitle: "圆桌审讯卷宗 · 历史发言与指认记录",
    dossierEmpty: "点击「设局配置」或「开始审讯」发放机密词条，开启多模型推理博弈。",
    welcomeTitle: "暗金圆桌 · 谁是卧底",
    welcomeSub:
      "每位探员将秘密领受一个近义词条。没人知道自己是平民还是潜伏的卧底——唯有从只言片语中捕捉破绽，指认真正的异类。",
    startInterrogation: "发放词条 · 开始审讯",
    thinking: "正在斟酌证词...",
    votingThinking: "正在审视嫌疑人...",
    speakPlaceholder: "输入你的本轮线索描述（严禁直接包含词条字面）...",
    submitSpeech: "发表证词",
    votePrompt: "请点击席位卡片或下方号码锁定怀疑对象：",
    voteReasonPlaceholder: "附上一句指认理由（可选）...",
    submitVote: "锁定指认",
    voteTargetBadge: "指认 {seat}",
    eliminatedStamp: "出局 · {role}",
    winnerCivilian: "平民阵营获胜 · 卧底全部落网",
    winnerUndercover: "卧底阵营获胜 · 成功潜伏控场",
    modalTitle: "圆桌席位与词库配置",
    playerCountLabel: "牌桌人数规模",
    mode4Players: "4 人精锐局 (3 平民 + 1 卧底)",
    mode6Players1U: "6 人标准局 (5 平民 + 1 卧底)",
    mode6Players2U: "6 人双谍局 (4 平民 + 2 卧底)",
    categoryLabel: "机密词库分类",
    catAll: "全部分类随机",
    catTech: "科技数码 & AI",
    catFood: "美食与饮品",
    catCulture: "影视文化 & 娱乐",
    catDaily: "日常百态",
    catCustom: "自定义词条对",
    customCivPlaceholder: "输入平民词（如：拿铁）",
    customUndPlaceholder: "输入卧底词（如：卡布奇诺）",
    confirmStart: "发牌开局",
    cancel: "取消",
    seatConflictError: "同一个 AI 会话不能同时坐两个席位",
    customWordError: "自定义模式下请填写两个不同的平民词与卧底词",
    wordLeakError: "违规警告：你的发言不能直接包含机密词条「{word}」的字面本身！",
    descReady: "确认准备就绪",
    descReadBoard: "读取你的专属机密词条、场上存活状态、历史发言与投票记录",
    descSpeak: "在你的发言回合提交一条线索描述（不能直接说出你的词条字面）",
    descVote: "在投票阶段指认一名你怀疑是卧底的在场席位，并附上简短理由",
    notifyInviteSummary: "请你入座《谁是卧底》{seat}",
    notifyInviteMessage: "你已入座 {seat}，请调用 readBoard 查看你的专属机密词条。",
    notifySpeakSummary: "轮到 {seat} 发表第 {cycle} 轮词条线索",
    notifySpeakMessage:
      "当前是第 {cycle} 轮发言阶段，轮到你（{seat}）发言。请先调用 readBoard 查看你的专属词条（注意：你不知道自己是平民还是卧底），然后调用 speak 发表一句既能向同伴暗示、又不会直接暴露词条字面的描述。",
    notifyVoteSummary: "轮到 {seat} 进行第 {cycle} 轮指认投票",
    notifyVoteMessage:
      "第 {cycle} 轮全员发言完毕！请调用 readBoard 分析所有人的历史证词破绽，然后调用 vote 投出你最怀疑的卧底席位（不可投自己）。",
    notifyResultSummary: "《谁是卧底》对局结束：{winner}",
    notifyResultMessage:
      "本局结束，{winner}！平民词为「{civWord}」，卧底词为「{undWord}」。",
  },
  "zh-TW": {
    appTitle: "誰是臥底",
    godViewOn: "上帝視角",
    godViewOff: "退出透視",
    toggleSound: "音效開關",
    pause: "暫停",
    resume: "繼續",
    configure: "設局配置",
    newRound: "新開一局",
    phaseLobby: "待開局",
    phaseSpeaking: "第 {cycle} 輪 · 線索陳述",
    phasePkSpeaking: "第 {cycle} 輪 · 平票加賽辯護",
    phaseVoting: "第 {cycle} 輪 · 鎖定指認",
    phasePkVoting: "第 {cycle} 輪 · 加賽終極表決",
    phaseFinished: "檔案揭曉 · 對局結束",
    aliveCount: "存活 {alive}/{total}",
    undercoverRemain: "潛伏臥底 {count} 人",
    playerYou: "我 (偵探主視角)",
    playerBot: "內置探員",
    humanSubTag: "人類玩家 · 親自發言與指認",
    botTag: "內置 AI 探員 · 自動推理博弈",
    roleCivilian: "平民",
    roleUndercover: "臥底",
    roleSecret: "身份未知",
    statusAlive: "在場",
    statusOut: "已出局",
    secretCardTitle: "機密詞條檔案",
    secretCardHint: "僅你知道詞條字面，不知自己是否臥底",
    holdToHide: "隱蔽詞條",
    revealWord: "顯露詞條",
    wordHiddenMask: "•••• (已掩蔽)",
    godWordComparison: "機密底牌對照",
    civilianWordLabel: "平民詞",
    undercoverWordLabel: "臥底詞",
    dossierTitle: "圓桌審訊卷宗 · 歷史發言與指認記錄",
    dossierEmpty: "點擊「設局配置」或「開始審訊」發放機密詞條，開啟多模型推理博弈。",
    welcomeTitle: "暗金圓桌 · 誰是臥底",
    welcomeSub:
      "每位探員將秘密領受一個近義詞條。沒人知道自己是平民還是潛伏的臥底——唯有從隻言片語中捕捉破綻，指認真正的異類。",
    startInterrogation: "發放詞條 · 開始審訊",
    thinking: "正在斟酌證詞...",
    votingThinking: "正在審視嫌疑人...",
    speakPlaceholder: "輸入你的本輪線索描述（嚴禁直接包含詞條字面）...",
    submitSpeech: "發表證詞",
    votePrompt: "請點擊席位卡片或下方號碼鎖定懷疑對象：",
    voteReasonPlaceholder: "附上一句指認理由（可選）...",
    submitVote: "鎖定指認",
    voteTargetBadge: "指認 {seat}",
    eliminatedStamp: "出局 · {role}",
    winnerCivilian: "平民陣營獲勝 · 臥底全部落網",
    winnerUndercover: "臥底陣營獲勝 · 成功潛伏控場",
    modalTitle: "圓桌席位與詞庫配置",
    playerCountLabel: "牌桌人數規模",
    mode4Players: "4 人精銳局 (3 平民 + 1 臥底)",
    mode6Players1U: "6 人標準局 (5 平民 + 1 臥底)",
    mode6Players2U: "6 人雙諜局 (4 平民 + 2 臥底)",
    categoryLabel: "機密詞庫分類",
    catAll: "全部分類隨機",
    catTech: "科技數碼 & AI",
    catFood: "美食與飲品",
    catCulture: "影視文化 & 娛樂",
    catDaily: "日常百態",
    catCustom: "自定義詞條對",
    customCivPlaceholder: "輸入平民詞（如：拿鐵）",
    customUndPlaceholder: "輸入臥底詞（如：卡布奇諾）",
    confirmStart: "發牌開局",
    cancel: "取消",
    seatConflictError: "同一個 AI 會話不能同時坐兩個席位",
    customWordError: "自定義模式下請填寫兩個不同的平民詞與臥底詞",
    wordLeakError: "違規警告：你的發言不能直接包含機密詞條「{word}」的字面本身！",
    descReady: "確認準備就緒",
    descReadBoard: "讀取你的專屬機密詞條、場上存活狀態、歷史發言與投票記錄",
    descSpeak: "在你的發言回合提交一條線索描述（不能直接說出你的詞條字面）",
    descVote: "在投票階段指認一名你懷疑是臥底的在場席位，並附上簡短理由",
    notifyInviteSummary: "請你入座《誰是臥底》{seat}",
    notifyInviteMessage: "你已入座 {seat}，請調用 readBoard 查看你的專屬機密詞條。",
    notifySpeakSummary: "輪到 {seat} 發表第 {cycle} 輪詞條線索",
    notifySpeakMessage:
      "當前是第 {cycle} 輪發言階段，輪到你（{seat}）發言。請先調用 readBoard 查看你的專屬詞條（注意：你不知道自己是平民還是臥底），然後調用 speak 發表一句既能向同伴暗示、又不會直接暴露詞條字面的描述。",
    notifyVoteSummary: "輪到 {seat} 進行第 {cycle} 輪指認投票",
    notifyVoteMessage:
      "第 {cycle} 輪全員發言完畢！請調用 readBoard 分析所有人的歷史證詞破綻，然後調用 vote 投出你最懷疑的臥底席位（不可投自己）。",
    notifyResultSummary: "《誰是臥底》對局結束：{winner}",
    notifyResultMessage:
      "本局結束，{winner}！平民詞為「{civWord}」，臥底詞為「{undWord}」。",
  },
  en: {
    appTitle: "Who is the Undercover",
    godViewOn: "God View",
    godViewOff: "Hide Roles",
    toggleSound: "Toggle Audio",
    pause: "Pause",
    resume: "Resume",
    configure: "Setup Table",
    newRound: "New Case",
    phaseLobby: "Standby",
    phaseSpeaking: "Round {cycle} · Testimonies",
    phasePkSpeaking: "Round {cycle} · Tie-Break Defense",
    phaseVoting: "Round {cycle} · Accusation Vote",
    phasePkVoting: "Round {cycle} · Tie-Break Vote",
    phaseFinished: "Case Closed",
    aliveCount: "Alive {alive}/{total}",
    undercoverRemain: "Undercover {count}",
    playerYou: "Me (Lead Detective)",
    playerBot: "Agent Bot",
    humanSubTag: "Human Player · Direct Control",
    botTag: "Built-in Detective Bot",
    roleCivilian: "Civilian",
    roleUndercover: "Undercover",
    roleSecret: "Classified",
    statusAlive: "Active",
    statusOut: "Eliminated",
    secretCardTitle: "Classified Word Dossier",
    secretCardHint: "Only you see your word; your role remains unknown",
    holdToHide: "Mask Word",
    revealWord: "Reveal Word",
    wordHiddenMask: "•••• (Masked)",
    godWordComparison: "Secret Word Pair",
    civilianWordLabel: "Civilian Word",
    undercoverWordLabel: "Undercover Word",
    dossierTitle: "Interrogation Dossier · Testimony & Vote Timeline",
    dossierEmpty: "Click Setup Table or Start Interrogation to deal secret words.",
    welcomeTitle: "Noir Round Table · Who is the Undercover",
    welcomeSub:
      "Every agent receives a secret word. Nobody knows whether they hold the Civilian or Undercover word—listen closely to every clue and expose the infiltrator.",
    startInterrogation: "Deal Dossiers · Start Case",
    thinking: "Formulating testimony...",
    votingThinking: "Analyzing suspects...",
    speakPlaceholder: "Enter your clue (never state your exact word verbatim)...",
    submitSpeech: "Submit Clue",
    votePrompt: "Select a suspect seat to accuse:",
    voteReasonPlaceholder: "Optional accusation reason...",
    submitVote: "Confirm Accusation",
    voteTargetBadge: "Voted {seat}",
    eliminatedStamp: "OUT · {role}",
    winnerCivilian: "Civilians Win · All Undercovers Exposed",
    winnerUndercover: "Undercovers Win · Infiltration Complete",
    modalTitle: "Table Seats & Word Bank Setup",
    playerCountLabel: "Table Size",
    mode4Players: "4 Players (3 Civilians + 1 Undercover)",
    mode6Players1U: "6 Players (5 Civilians + 1 Undercover)",
    mode6Players2U: "6 Players (4 Civilians + 2 Undercovers)",
    categoryLabel: "Word Bank Category",
    catAll: "All Categories",
    catTech: "Tech & AI",
    catFood: "Food & Drinks",
    catCulture: "Pop Culture & Mystery",
    catDaily: "Daily Life",
    catCustom: "Custom Word Pair",
    customCivPlaceholder: "Civilian word (e.g., Latte)",
    customUndPlaceholder: "Undercover word (e.g., Cappuccino)",
    confirmStart: "Start Interrogation",
    cancel: "Cancel",
    seatConflictError: "The same AI session cannot occupy multiple seats",
    customWordError: "Please enter two distinct words for Civilian and Undercover",
    wordLeakError: "Rule violation: Your clue cannot contain your exact word \"{word}\"!",
    descReady: "Mark readiness",
    descReadBoard: "Read your secret word, alive seats, testimonies, and vote history",
    descSpeak: "Submit a 1-sentence clue during your speaking turn without saying your word",
    descVote: "Cast an accusation vote against a suspect seat during the voting phase",
    notifyInviteSummary: "Seated at {seat} in Who is the Undercover",
    notifyInviteMessage: "You are seated at {seat}. Call readBoard to view your secret word.",
    notifySpeakSummary: "{seat}'s turn to give Round {cycle} clue",
    notifySpeakMessage:
      "Round {cycle} speaking phase: It is your turn ({seat}). Call readBoard to check your secret word and prior clues, then call speak with a clever clue that does not directly contain your secret word.",
    notifyVoteSummary: "{seat}'s turn to vote in Round {cycle}",
    notifyVoteMessage:
      "Round {cycle} voting phase: Call readBoard to review all testimonies, then call vote to accuse the most suspicious seat (cannot vote for yourself).",
    notifyResultSummary: "Case Closed: {winner}",
    notifyResultMessage:
      "Game over—{winner}! Civilian word: \"{civWord}\", Undercover word: \"{undWord}\".",
  },

  ja: extra.ja.messages,
  ko: extra.ko.messages,
  es: extra.es.messages,
  de: extra.de.messages,
  fr: extra.fr.messages,
};

export function t(key: string, params?: Record<string, string | number>): string {
  const table = dict[currentLocale] || dict.en;
  let raw = table[key] || dict.en[key] || key;
  raw = raw.replace(/\{(\w+)\}/g, (token, key) => params && Object.hasOwn(params, key) ? String(params[key]) : token);
  return raw;
}

export function seatLabel(seat: Seat): string {
  const num = seat.replace("Seat", "");
  if (currentLocale === "zh-CN") return `${num}号探员`;
  if (currentLocale === "zh-TW") return `${num}號探員`;
  const labels = { en: "Agent", ja: "エージェント", ko: "요원", es: "Agente", de: "Agent", fr: "Agent" };
  return `${labels[currentLocale]} #${num}`;
}

export function seatShortLabel(seat: Seat): string {
  const num = seat.replace("Seat", "");
  return currentLocale === "zh-CN" ? `${num}号` : currentLocale === "zh-TW" ? `${num}號` : `#${num}`;
}

export function getLocale(): LocaleKey {
  return currentLocale;
}

export function botNameForSeat(seat: Seat): string {
  const names: Record<"en" | "zh-CN" | "zh-TW", Record<Seat, string>> = {
    "zh-CN": {
      Seat1: "探长·福尔摩斯",
      Seat2: "神探·波洛",
      Seat3: "怪盗·基德",
      Seat4: "密探·零号",
      Seat5: "特工·夜莺",
      Seat6: "顾问·莫里亚蒂",
    },
    "zh-TW": {
      Seat1: "探長·福爾摩斯",
      Seat2: "神探·白羅",
      Seat3: "怪盜·基德",
      Seat4: "密探·零號",
      Seat5: "特工·夜鶯",
      Seat6: "顧問·莫里亞蒂",
    },
    en: {
      Seat1: "Insp. Holmes",
      Seat2: "Det. Poirot",
      Seat3: "Phantom Kid",
      Seat4: "Agent Zero",
      Seat5: "Agent Nightingale",
      Seat6: "Prof. Moriarty",
    },
  };
  const table = currentLocale === "en" || currentLocale === "zh-CN" || currentLocale === "zh-TW" ? names[currentLocale] : extra[currentLocale].botNames;
  return table[seat] || names.en[seat] || seatLabel(seat);
}

export function categoryLabel(cat: WordCategory): string {
  if (cat === "tech") return t("catTech");
  if (cat === "food") return t("catFood");
  if (cat === "culture") return t("catCulture");
  if (cat === "daily") return t("catDaily");
  if (cat === "custom") return t("catCustom");
  return t("catAll");
}

export function ui(key: keyof typeof auxiliary.en, params?: Record<string, string | number>): string {
  const value = auxiliary[currentLocale][key] ?? auxiliary.en[key] ?? key;
  return value.replace(/\{(\w+)\}/g, (token, name) => params && Object.hasOwn(params, name) ? String(params[name]) : token);
}
