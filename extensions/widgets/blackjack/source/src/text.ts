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
    appTitle: "21点",
    appSubtitle: "经典赌场黑杰克牌桌",
    dealerTitle: "庄家 (Dealer)",
    playerTitle: "玩家 (Player)",
    points: "点",
    soft: "软",
    chips: "筹码",
    currentBet: "当前下注",
    btnHit: "要牌 (Hit)",
    btnStand: "停牌 (Stand)",
    btnDouble: "加倍 (Double)",
    btnDeal: "发牌 (Deal)",
    btnNextHand: "下一局",
    btnResetBankroll: "补满筹码 (1000)",

    resBlackjack: "🎉 天王 21 点 (Blackjack)！",
    resPlayerWin: "🏆 您赢了！",
    resDealerBust: "💥 庄家爆牌，您赢了！",
    resPush: "🤝 打和平局 (Push)",
    resPlayerBust: "💀 爆牌出局 (Bust)",
    resDealerWin: "庄家胜出",

    statsTitle: "牌桌战绩",
    statsHands: "局数",
    statsWins: "胜场",
    statsLosses: "负场",
    statsPushes: "平局",
    statsBJ: "天王21点",

    notifyYourTurn: "轮到您决策 (要牌/停牌/加倍)",
    notifyResult: "对局结算完成",
  },
  "zh-TW": {
    appTitle: "21點",
    appSubtitle: "經典賭場黑傑克牌桌",
    dealerTitle: "莊家 (Dealer)",
    playerTitle: "玩家 (Player)",
    points: "點",
    soft: "軟",
    chips: "籌碼",
    currentBet: "當前下注",
    btnHit: "要牌 (Hit)",
    btnStand: "停牌 (Stand)",
    btnDouble: "加倍 (Double)",
    btnDeal: "發牌 (Deal)",
    btnNextHand: "下一局",
    btnResetBankroll: "補滿籌碼 (1000)",

    resBlackjack: "🎉 天王 21 點 (Blackjack)！",
    resPlayerWin: "🏆 您贏了！",
    resDealerBust: "💥 莊家爆牌，您贏了！",
    resPush: "🤝 打和平局 (Push)",
    resPlayerBust: "💀 爆牌出局 (Bust)",
    resDealerWin: "莊家勝出",

    statsTitle: "牌桌戰績",
    statsHands: "局數",
    statsWins: "勝場",
    statsLosses: "負場",
    statsPushes: "平局",
    statsBJ: "天王21點",

    notifyYourTurn: "輪到您決策 (要牌/停牌/加倍)",
    notifyResult: "對局結算完成",
  },
  en: {
    appTitle: "Blackjack",
    appSubtitle: "Classic Casino Blackjack Table",
    dealerTitle: "Dealer",
    playerTitle: "Player",
    points: "pts",
    soft: "Soft",
    chips: "Chips",
    currentBet: "Bet",
    btnHit: "Hit",
    btnStand: "Stand",
    btnDouble: "Double Down",
    btnDeal: "Deal",
    btnNextHand: "Next Hand",
    btnResetBankroll: "Refill Chips (1000)",

    resBlackjack: "🎉 BLACKJACK! Pays 3:2",
    resPlayerWin: "🏆 YOU WIN!",
    resDealerBust: "💥 DEALER BUST, YOU WIN!",
    resPush: "🤝 PUSH (TIE)",
    resPlayerBust: "💀 BUST!",
    resDealerWin: "Dealer Wins",

    statsTitle: "Table Records",
    statsHands: "Hands",
    statsWins: "Wins",
    statsLosses: "Losses",
    statsPushes: "Pushes",
    statsBJ: "Blackjacks",

    notifyYourTurn: "Your turn to act (Hit/Stand/Double)",
    notifyResult: "Hand settled",
  },
};

export function t(key: string): string {
  return DICTIONARY[currentLocale]?.[key] || DICTIONARY["zh-CN"][key] || key;
}
