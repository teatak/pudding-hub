import type { ComboType, Seat } from "./types";

export type Locale = "zh-CN" | "zh-TW" | "en";

let currentLocale: Locale = "zh-CN";

export function setLocale(raw: string) {
  const norm = raw.toLowerCase();
  if (norm.startsWith("zh-tw") || norm.startsWith("zh-hk")) {
    currentLocale = "zh-TW";
  } else if (norm.startsWith("en")) {
    currentLocale = "en";
  } else {
    currentLocale = "zh-CN";
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

const dict = {
  "zh-CN": {
    appTitle: "斗地主",
    startMatch: "开始牌局",
    newRound: "重新洗牌",
    changeSeats: "调整席位",
    pauseGame: "暂停",
    continueGame: "继续",
    toggleDanmaku: "弹幕开关",
    toggleSound: "音效开关",
    godViewOn: "上帝透视视角 (全员明牌)",
    godViewOff: "退出透视视角 (恢复暗牌)",
    holeCardsLabel: "底牌",
    holeHidden: "叫地主后揭晓",
    baseScoreLabel: "底分",
    multiplierLabel: "倍数",
    bombCountLabel: "炸弹",
    robTag: "抢地主",
    phaseLobby: "等待发牌开局",
    phaseBidding: "叫 / 抢地主阶段",
    phasePlaying: "出牌博弈中",
    phaseFinished: "本局已结算",
    roleLandlord: "地主",
    rolePeasant: "农民",
    roleUndecided: "待定",
    relUpper: "上家",
    relLower: "下家",
    relSelf: "主视角",
    seatSouth: "南席（下家主位）",
    seatEast: "东席（右侧下家）",
    seatWest: "西席（左侧上家）",
    seatSouthShort: "南席",
    seatEastShort: "东席",
    seatWestShort: "西席",
    playerYou: "我（人类玩家）",
    playerBot: "内置机器人",
    playerBotEast: "机器人·阿东",
    playerBotWest: "机器人·阿西",
    playerBotSouth: "机器人·阿南",
    youTag: "（我）",
    botTag: "内置 AI",
    humanSubTag: "本地玩家",
    cardsLeft: "{count} 张",
    readyBtn: "准备",
    cancelReady: "取消准备",
    waitingReady: "等待准备",
    thinking: "思考中…",
    waitingTurn: "等待其他家行动…",
    actCall: "叫地主",
    actNoCall: "不叫",
    actRob: "抢地主 ×2",
    actNoRob: "不抢",
    actPass: "不出",
    actHint: "智能提示",
    actClear: "重选",
    actPlay: "出牌",
    tagCalled: "叫地主",
    tagNoCall: "不叫",
    tagRobbed: "抢地主!",
    tagNoRob: "不抢",
    tagPassed: "不出",
    revealHandBtn: "亮牌查看",
    hideHandBtn: "暗牌防透视",
    handHiddenHint: "轮到你行动时自动亮牌，也可点击上方透视视角查看",
    spectatorHiddenHint: "暗牌对局中，可点击右上角「上帝透视视角」查看三家手牌",
    commentPlaceholder: "输入牌桌喊话 / 弹幕（可选）…",
    winnerLandlord: "地主大获全胜！",
    winnerPeasant: "农民联手获胜！",
    springBadge: "春天 ×2",
    antiSpringBadge: "反春天 ×2",
    lobbyWelcomeSub: "三人经典扑克对局，叫抢地主翻倍博弈。",
    pickerTitle: "配置牌桌席位",
    pickerSubtitle: "为南、东、西三席选择入座牌手，发牌开启对局。",
    pickerCancel: "取消",
    pickerConfirm: "发牌开局",
    seatConflictError: "同一位玩家或会话不能同时坐两个席位。",
    leadHint: "当前由你首发出牌（不可不出）",
    followHint: "需要管上：{combo}",
    noLegalPlayHint: "手牌中没有能管上的牌，请选择「不出」",
    descReady: "准备或取消准备当前斗地主对局。",
    descReadTable:
      "读取当前牌桌公共状态与你自己的私有手牌。",
    descCallLandlord:
      "在叫/抢地主阶段做出决定：decision 传 'call'（叫地主）、'rob'（抢地主，倍数×2）或 'pass'（不叫/不抢），可附带牌桌弹幕 comment。",
    descPlayCards:
      "在出牌阶段打出你手中的牌，cards 可传牌面点数如 ['3','3','3','4'] 或带花色 ID 如 ['S3','H3','C3','D4']，可附带牌桌弹幕 comment。",
    descPass: "在出牌阶段选择「不出 / 要不起」（首发出牌时不可调用），可附带牌桌弹幕 comment。",
    notifyInviteSummary: "邀请入座斗地主（{seat}）",
    notifyInviteMessage:
      "你已入座斗地主【{seat}】。请调用 widget_invoke 执行 ready 准备，或待发牌后调用 readTable 查看手牌。",
    notifyBidSummary: "轮到 {seat} {action}",
    notifyBidMessage:
      "当前处于斗地主【{action}】阶段，轮到你（{seat}）。请直接通过 widget_invoke 调用 readTable 查看你自己的 17 张手牌，然后调用 callLandlord（decision: 'call' | 'rob' | 'pass'，并带上简短有趣的牌桌喊话 comment）做出决定。",
    notifyPlaySummary: "轮到 {seat} 出牌",
    notifyPlayMessage:
      "轮到你（{seat}，身份：{role}）行动。{tableDesc}请直接通过 widget_invoke 调用 readTable 查看你自己的手牌与合法推荐牌型，然后调用 playCards 或 pass，并附带一句简短有趣的牌桌弹幕 comment。",
    notifyResultSummary: "斗地主牌局结束：{winner}",
    notifyResultMessage:
      "本局斗地主结束，{winner}（最终倍数 ×{multiplier}）。你可以调用或直接发表本局复盘感言。",
  },
  "zh-TW": {
    appTitle: "鬥地主",
    startMatch: "開始牌局",
    newRound: "重新洗牌",
    changeSeats: "調整席位",
    pauseGame: "暫停",
    continueGame: "繼續",
    toggleDanmaku: "彈幕開關",
    toggleSound: "音效開關",
    godViewOn: "上帝透視視角 (全員明牌)",
    godViewOff: "退出透視視角 (恢復暗牌)",
    holeCardsLabel: "底牌",
    holeHidden: "叫地主後揭曉",
    baseScoreLabel: "底分",
    multiplierLabel: "倍數",
    bombCountLabel: "炸彈",
    robTag: "搶地主",
    phaseLobby: "等待發牌開局",
    phaseBidding: "叫 / 搶地主階段",
    phasePlaying: "出牌博弈中",
    phaseFinished: "本局已結算",
    roleLandlord: "地主",
    rolePeasant: "農民",
    roleUndecided: "待定",
    relUpper: "上家",
    relLower: "下家",
    relSelf: "主視角",
    seatSouth: "南席（下家主位）",
    seatEast: "東席（右側下家）",
    seatWest: "西席（左側上家）",
    seatSouthShort: "南席",
    seatEastShort: "東席",
    seatWestShort: "西席",
    playerYou: "我（人類玩家）",
    playerBot: "內建機器人",
    playerBotEast: "機器人·阿東",
    playerBotWest: "機器人·阿西",
    playerBotSouth: "機器人·阿南",
    youTag: "（我）",
    botTag: "內建 AI",
    humanSubTag: "本地玩家",
    cardsLeft: "{count} 張",
    readyBtn: "準備",
    cancelReady: "取消準備",
    waitingReady: "等待準備",
    thinking: "思考中…",
    waitingTurn: "等待其他家行動…",
    actCall: "叫地主",
    actNoCall: "不叫",
    actRob: "搶地主 ×2",
    actNoRob: "不搶",
    actPass: "不出",
    actHint: "智能提示",
    actClear: "重選",
    actPlay: "出牌",
    tagCalled: "叫地主",
    tagNoCall: "不叫",
    tagRobbed: "搶地主!",
    tagNoRob: "不搶",
    tagPassed: "不出",
    revealHandBtn: "亮牌查看",
    hideHandBtn: "暗牌防透視",
    handHiddenHint: "輪到你行動時自動亮牌，也可點擊上方透視視角查看",
    spectatorHiddenHint: "暗牌對局中，可點擊右上角「上帝透視視角」查看三家手牌",
    commentPlaceholder: "輸入牌桌喊話 / 彈幕（可選）…",
    winnerLandlord: "地主大獲全勝！",
    winnerPeasant: "農民聯手獲勝！",
    springBadge: "春天 ×2",
    antiSpringBadge: "反春天 ×2",
    lobbyWelcomeSub: "三人經典撲克對局，叫搶地主翻倍博弈。",
    pickerTitle: "配置牌桌席位",
    pickerSubtitle: "為南、東、西三席選擇入座牌手，發牌開啟對局。",
    pickerCancel: "取消",
    pickerConfirm: "發牌開局",
    seatConflictError: "同一位玩家或會話不能同時坐兩個席位。",
    leadHint: "當前由你首發出牌（不可不出）",
    followHint: "需要管上：{combo}",
    noLegalPlayHint: "手牌中沒有能管上的牌，請選擇「不出」",
    descReady: "準備或取消準備當前鬥地主對局。",
    descReadTable:
      "讀取當前牌桌公共狀態與你自己的私有手牌。",
    descCallLandlord:
      "在叫/搶地主階段做出決定：decision 傳 'call'（叫地主）、'rob'（搶地主，倍數×2）或 'pass'（不叫/不搶），可附帶牌桌彈幕 comment。",
    descPlayCards:
      "在出牌階段打出你手中的牌，cards 可傳牌面點數如 ['3','3','3','4'] 或帶花色 ID 如 ['S3','H3','C3','D4']，可附帶牌桌彈幕 comment。",
    descPass: "在出牌階段選擇「不出 / 要不起」（首發出牌時不可調用），可附帶牌桌彈幕 comment。",
    notifyInviteSummary: "邀請入座鬥地主（{seat}）",
    notifyInviteMessage:
      "你已入座鬥地主【{seat}】。請調用 widget_invoke 執行 ready 準備，或待發牌後調用 readTable 查看手牌。",
    notifyBidSummary: "輪到 {seat} {action}",
    notifyBidMessage:
      "當前處於鬥地主【{action}】階段，輪到你（{seat}）。請直接透過 widget_invoke 調用 readTable 查看你自己的 17 張手牌，然後調用 callLandlord（decision: 'call' | 'rob' | 'pass'，並帶上簡短有趣的牌桌喊話 comment）做出決定。",
    notifyPlaySummary: "輪到 {seat} 出牌",
    notifyPlayMessage:
      "輪到你（{seat}，身份：{role}）行動。{tableDesc}請直接透過 widget_invoke 調用 readTable 查看你自己的手牌與合法推薦牌型，然後調用 playCards 或 pass，並附帶一句簡短有趣的牌桌彈幕 comment。",
    notifyResultSummary: "鬥地主牌局結束：{winner}",
    notifyResultMessage:
      "本局鬥地主結束，{winner}（最終倍數 ×{multiplier}）。你可以調用或直接發表本局復盤感言。",
  },
  en: {
    appTitle: "Dou Dizhu",
    startMatch: "Start Game",
    newRound: "Redeal",
    changeSeats: "Seats",
    pauseGame: "Pause",
    continueGame: "Resume",
    toggleDanmaku: "Toggle Table Talk",
    toggleSound: "Toggle Sound Effects",
    godViewOn: "God View (Reveal All Hands)",
    godViewOff: "Exit God View (Hide Hands)",
    holeCardsLabel: "Hole Cards",
    holeHidden: "Hidden",
    baseScoreLabel: "Base",
    multiplierLabel: "Multiplier",
    bombCountLabel: "Bombs",
    robTag: "Rob",
    phaseLobby: "Waiting for Deal",
    phaseBidding: "Call / Rob Landlord",
    phasePlaying: "Playing",
    phaseFinished: "Round Finished",
    roleLandlord: "Landlord",
    rolePeasant: "Peasant",
    roleUndecided: "TBD",
    relUpper: "Upper",
    relLower: "Lower",
    relSelf: "Bottom",
    seatSouth: "South Seat (Bottom)",
    seatEast: "East Seat (Right)",
    seatWest: "West Seat (Left)",
    seatSouthShort: "South",
    seatEastShort: "East",
    seatWestShort: "West",
    playerYou: "Me (Human)",
    playerBot: "Built-in Bot",
    playerBotEast: "Bot East",
    playerBotWest: "Bot West",
    playerBotSouth: "Bot South",
    youTag: " (You)",
    botTag: "Built-in AI",
    humanSubTag: "Local Player",
    cardsLeft: "{count} cards",
    readyBtn: "Ready",
    cancelReady: "Unready",
    waitingReady: "Waiting",
    thinking: "Thinking…",
    waitingTurn: "Waiting for other players…",
    actCall: "Call Landlord",
    actNoCall: "Pass",
    actRob: "Rob Landlord ×2",
    actNoRob: "Don't Rob",
    actPass: "Pass",
    actHint: "Smart Hint",
    actClear: "Clear",
    actPlay: "Play",
    tagCalled: "Called!",
    tagNoCall: "No Call",
    tagRobbed: "Robbed ×2!",
    tagNoRob: "No Rob",
    tagPassed: "Pass",
    revealHandBtn: "Show Hand",
    hideHandBtn: "Hide Hand",
    handHiddenHint: "Reveals on your turn, or toggle God View above",
    spectatorHiddenHint: "Hands hidden during play (toggle God View above to inspect hands)",
    commentPlaceholder: "Table talk / comment (optional)…",
    winnerLandlord: "Landlord Wins!",
    winnerPeasant: "Peasants Win!",
    springBadge: "Spring ×2",
    antiSpringBadge: "Anti-Spring ×2",
    lobbyWelcomeSub: "Classic 3-player poker with Call/Rob Landlord multipliers.",
    pickerTitle: "Configure Table Seats",
    pickerSubtitle: "Choose players for the South, East, and West seats to deal.",
    pickerCancel: "Cancel",
    pickerConfirm: "Deal Cards",
    seatConflictError: "Each player or session can occupy only one seat.",
    leadHint: "You lead this trick (must play cards)",
    followHint: "Beat on table: {combo}",
    noLegalPlayHint: "No legal combination beats the current play — choose Pass",
    descReady: "Mark yourself ready or unready for the Dou Dizhu game.",
    descReadTable:
      "Read public table state and your own private hand.",
    descCallLandlord:
      "During the bidding phase, decide whether to call or rob Landlord: 'call', 'rob' (multiplier ×2), or 'pass', with an optional fun table comment.",
    descPlayCards:
      "Play cards from your hand on your turn, e.g. ['3','3','3','4'] or ['S3','H3','C3','D4'], with an optional fun table comment.",
    descPass: "Pass on your turn when following another player's play, with an optional fun table comment.",
    notifyInviteSummary: "Dou Dizhu seat invitation ({seat})",
    notifyInviteMessage:
      "You are seated at [{seat}] in Dou Dizhu. Use widget_invoke to call readTable and act when it is your turn.",
    notifyBidSummary: "{seat}'s turn to {action}",
    notifyBidMessage:
      "It is your turn ({seat}) in the [{action}] phase. Call widget_invoke `readTable` to inspect your 17 private cards, then call `callLandlord` with decision 'call', 'rob', or 'pass' and a fun short `comment`.",
    notifyPlaySummary: "{seat}'s turn to play",
    notifyPlayMessage:
      "It is your turn ({seat}, role: {role}). {tableDesc}Call widget_invoke `readTable` to inspect your private hand and legal hints, then call `playCards` or `pass` with a fun short `comment`.",
    notifyResultSummary: "Dou Dizhu finished: {winner}",
    notifyResultMessage:
      "Dou Dizhu round finished: {winner} (final multiplier ×{multiplier}).",
  },
};

export type TextKey = keyof (typeof dict)["zh-CN"];

export function t(
  key: TextKey,
  params?: Record<string, string | number>,
): string {
  const table = dict[currentLocale] || dict["zh-CN"];
  let str = table[key] || dict["zh-CN"][key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

export function seatLabel(seat: Seat): string {
  if (seat === "South") return t("seatSouthShort");
  if (seat === "East") return t("seatEastShort");
  return t("seatWestShort");
}

export function botNameForSeat(seat: Seat): string {
  if (seat === "East") return t("playerBotEast");
  if (seat === "West") return t("playerBotWest");
  return t("playerBotSouth");
}

const comboNames: Record<Locale, Record<ComboType, string>> = {
  "zh-CN": {
    single: "单张",
    pair: "对子",
    triple: "三不带",
    triple_single: "三带一",
    triple_pair: "三带一对",
    straight: "顺子",
    pair_straight: "连对",
    airplane: "飞机",
    airplane_single: "飞机带单",
    airplane_pair: "飞机带对",
    four_two_single: "四带二单",
    four_two_pair: "四带两对",
    bomb: "炸弹",
    rocket: "王炸",
  },
  "zh-TW": {
    single: "單張",
    pair: "對子",
    triple: "三不帶",
    triple_single: "三帶一",
    triple_pair: "三帶一對",
    straight: "順子",
    pair_straight: "連對",
    airplane: "飛機",
    airplane_single: "飛機帶單",
    airplane_pair: "飛機帶對",
    four_two_single: "四帶二單",
    four_two_pair: "四帶兩對",
    bomb: "炸彈",
    rocket: "王炸",
  },
  en: {
    single: "Single",
    pair: "Pair",
    triple: "Triple",
    triple_single: "Triple + Single",
    triple_pair: "Triple + Pair",
    straight: "Straight",
    pair_straight: "Pair Straight",
    airplane: "Airplane",
    airplane_single: "Airplane + Singles",
    airplane_pair: "Airplane + Pairs",
    four_two_single: "Four + 2 Singles",
    four_two_pair: "Four + 2 Pairs",
    bomb: "Bomb",
    rocket: "Rocket",
  },
};

export function comboLabel(type: ComboType, mainRank: string): string {
  const label = (comboNames[currentLocale] || comboNames["zh-CN"])[type];
  if (type === "rocket") return label;
  const displayRank =
    mainRank === "BJ" ? "小王" : mainRank === "RJ" ? "大王" : mainRank;
  return `${label} (${displayRank})`;
}
