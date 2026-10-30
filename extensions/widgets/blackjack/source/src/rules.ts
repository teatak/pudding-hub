import type {
  Card,
  HandValue,
  Suit,
  Rank,
  BlackjackLobby,
  BlackjackPosition,
} from "./types";

const SUITS: Suit[] = ["S", "H", "C", "D"];
const RANKS: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

export function createDeck(deckCount = 2): Card[] {
  const cards: Card[] = [];
  let idCounter = 1;
  for (let d = 0; d < deckCount; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `c-${idCounter++}-${suit}-${rank}`,
          suit,
          rank,
          faceUp: true,
        });
      }
    }
  }
  return shuffleDeck(cards);
}

export function shuffleDeck(cards: Card[]): Card[] {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function getRankValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (rank === "K" || rank === "Q" || rank === "J" || rank === "10") return 10;
  return parseInt(rank, 10);
}

export function calculateHand(cards: Card[], onlyVisible = false): HandValue {
  const activeCards = onlyVisible ? cards.filter((c) => c.faceUp) : cards;
  if (activeCards.length === 0) {
    return { total: 0, isSoft: false, isBlackjack: false, isBust: false };
  }

  let total = 0;
  let aces = 0;

  for (const card of activeCards) {
    if (card.rank === "A") {
      aces++;
      total += 11;
    } else {
      total += getRankValue(card.rank);
    }
  }

  // 超过 21 点时，将 Ace 由 11 降为 1
  let isSoft = aces > 0;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  // 软点指仍然至少有一个 Ace 被计为 11 点
  isSoft = aces > 0;

  const isBlackjack =
    activeCards.length === 2 && total === 21 && !onlyVisible;
  const isBust = total > 21;

  return { total, isSoft, isBlackjack, isBust };
}

export function initialLobby(): BlackjackLobby {
  return {
    dealerName: "荷官特工",
    playerName: "玩家",
    playerParticipantId: null,
    dealerParticipantId: null,
  };
}

export function initialPosition(): BlackjackPosition {
  return {
    phase: "betting",
    chips: 1000,
    currentBet: 50,
    deck: createDeck(2),
    playerHand: [],
    dealerHand: [],
    result: "none",
    winAmount: 0,
    dealerSpeech: "欢迎入座 21 点牌桌，请选择下注额开始发牌！",
    stats: {
      handsPlayed: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      blackjacks: 0,
    },
    updatedAt: Date.now(),
  };
}

export function dealRound(
  pos: BlackjackPosition,
  betAmount: number,
): BlackjackPosition {
  if (pos.chips < betAmount) {
    throw new Error("筹码不足，无法下注");
  }

  let deck = [...pos.deck];
  // 牌堆剩余不足 15 张则重新洗牌
  if (deck.length < 15) {
    deck = createDeck(2);
  }

  const pCard1 = { ...deck.pop()!, faceUp: true };
  const dCard1 = { ...deck.pop()!, faceUp: true };
  const pCard2 = { ...deck.pop()!, faceUp: true };
  const dCard2 = { ...deck.pop()!, faceUp: false }; // 庄家底牌暂不亮出

  const playerHand = [pCard1, pCard2];
  const dealerHand = [dCard1, dCard2];

  const chipsLeft = pos.chips - betAmount;
  const pVal = calculateHand(playerHand);

  // 玩家直接天王 21 点 (Blackjack)
  if (pVal.isBlackjack) {
    // 立即翻开庄家底牌
    const revealedDealer = dealerHand.map((c) => ({ ...c, faceUp: true }));
    const dVal = calculateHand(revealedDealer);

    if (dVal.isBlackjack) {
      // 双方天王打和
      return {
        ...pos,
        phase: "settled",
        chips: chipsLeft + betAmount,
        currentBet: betAmount,
        deck,
        playerHand,
        dealerHand: revealedDealer,
        result: "push",
        winAmount: betAmount,
        dealerSpeech: "不可思议！双方同时拿到天王 21 点，打和平局！",
        stats: {
          ...pos.stats,
          handsPlayed: pos.stats.handsPlayed + 1,
          pushes: pos.stats.pushes + 1,
          blackjacks: pos.stats.blackjacks + 1,
        },
        updatedAt: Date.now(),
      };
    } else {
      // 玩家天王获胜：1.5 倍赔率
      const profit = Math.floor(betAmount * 1.5);
      const totalPayout = betAmount + profit;
      return {
        ...pos,
        phase: "settled",
        chips: chipsLeft + totalPayout,
        currentBet: betAmount,
        deck,
        playerHand,
        dealerHand: revealedDealer,
        result: "blackjack_win",
        winAmount: totalPayout,
        dealerSpeech: `天王 21 点！恭喜赢得 1.5 倍高额大奖 +${profit} 筹码！`,
        stats: {
          ...pos.stats,
          handsPlayed: pos.stats.handsPlayed + 1,
          wins: pos.stats.wins + 1,
          blackjacks: pos.stats.blackjacks + 1,
        },
        updatedAt: Date.now(),
      };
    }
  }

  return {
    ...pos,
    phase: "player_turn",
    chips: chipsLeft,
    currentBet: betAmount,
    deck,
    playerHand,
    dealerHand,
    result: "none",
    winAmount: 0,
    dealerSpeech: `发牌完毕，您起手点数为 ${pVal.total} 点。请选择要牌、停牌或加倍！`,
    updatedAt: Date.now(),
  };
}

export function playerHit(pos: BlackjackPosition): BlackjackPosition {
  if (pos.phase !== "player_turn") {
    throw new Error("当前非玩家行动回合");
  }

  let deck = [...pos.deck];
  if (deck.length === 0) deck = createDeck(2);

  const newCard = { ...deck.pop()!, faceUp: true };
  const playerHand = [...pos.playerHand, newCard];
  const pVal = calculateHand(playerHand);

  // 爆牌 (Bust)
  if (pVal.isBust) {
    const revealedDealer = pos.dealerHand.map((c) => ({ ...c, faceUp: true }));
    return {
      ...pos,
      phase: "settled",
      deck,
      playerHand,
      dealerHand: revealedDealer,
      result: "player_bust",
      winAmount: 0,
      dealerSpeech: `爆牌了！点数达到 ${pVal.total} 点，遗憾出局。`,
      stats: {
        ...pos.stats,
        handsPlayed: pos.stats.handsPlayed + 1,
        losses: pos.stats.losses + 1,
      },
      updatedAt: Date.now(),
    };
  }

  // 满 21 点自动进入庄家回合
  if (pVal.total === 21) {
    return dealerPlay({
      ...pos,
      deck,
      playerHand,
      dealerSpeech: "漂亮！刚好 21 点！移交庄家行动。",
    });
  }

  return {
    ...pos,
    deck,
    playerHand,
    dealerSpeech: `要牌成功，当前手牌总计 ${pVal.total} 点。`,
    updatedAt: Date.now(),
  };
}

export function playerDouble(pos: BlackjackPosition): BlackjackPosition {
  if (pos.phase !== "player_turn") throw new Error("当前非玩家行动回合");
  if (pos.playerHand.length !== 2) throw new Error("只有起手前两张牌允许加倍");
  if (pos.chips < pos.currentBet) throw new Error("筹码不足以支持加倍下注");

  const chipsLeft = pos.chips - pos.currentBet;
  const newBet = pos.currentBet * 2;

  let deck = [...pos.deck];
  if (deck.length === 0) deck = createDeck(2);

  const newCard = { ...deck.pop()!, faceUp: true };
  const playerHand = [...pos.playerHand, newCard];
  const pVal = calculateHand(playerHand);

  if (pVal.isBust) {
    const revealedDealer = pos.dealerHand.map((c) => ({ ...c, faceUp: true }));
    return {
      ...pos,
      phase: "settled",
      chips: chipsLeft,
      currentBet: newBet,
      deck,
      playerHand,
      dealerHand: revealedDealer,
      result: "player_bust",
      winAmount: 0,
      dealerSpeech: `加倍后爆牌！点数达到 ${pVal.total} 点。`,
      stats: {
        ...pos.stats,
        handsPlayed: pos.stats.handsPlayed + 1,
        losses: pos.stats.losses + 1,
      },
      updatedAt: Date.now(),
    };
  }

  // 加倍后摸一张牌即自动停牌移交庄家
  return dealerPlay({
    ...pos,
    chips: chipsLeft,
    currentBet: newBet,
    deck,
    playerHand,
    dealerSpeech: `下注加倍至 ${newBet}！最终定点 ${pVal.total} 点，移交庄家。`,
  });
}

export function playerStand(pos: BlackjackPosition): BlackjackPosition {
  if (pos.phase !== "player_turn") throw new Error("当前非玩家行动回合");
  return dealerPlay(pos);
}

export function dealerPlay(pos: BlackjackPosition): BlackjackPosition {
  let deck = [...pos.deck];
  let dealerHand = pos.dealerHand.map((c) => ({ ...c, faceUp: true }));
  let dVal = calculateHand(dealerHand);
  const pVal = calculateHand(pos.playerHand);

  // 经典赌场规则：庄家点数小于 17 必须持续抽牌
  while (dVal.total < 17) {
    if (deck.length === 0) deck = createDeck(2);
    const card = { ...deck.pop()!, faceUp: true };
    dealerHand = [...dealerHand, card];
    dVal = calculateHand(dealerHand);
  }

  // 结算判定
  if (dVal.isBust) {
    const payout = pos.currentBet * 2;
    return {
      ...pos,
      phase: "settled",
      chips: pos.chips + payout,
      deck,
      dealerHand,
      result: "dealer_bust_win",
      winAmount: payout,
      dealerSpeech: `庄家点数 ${dVal.total} 爆牌了！恭喜您赢得对局 +${pos.currentBet}！`,
      stats: {
        ...pos.stats,
        handsPlayed: pos.stats.handsPlayed + 1,
        wins: pos.stats.wins + 1,
      },
      updatedAt: Date.now(),
    };
  }

  if (pVal.total > dVal.total) {
    const payout = pos.currentBet * 2;
    return {
      ...pos,
      phase: "settled",
      chips: pos.chips + payout,
      deck,
      dealerHand,
      result: "player_win",
      winAmount: payout,
      dealerSpeech: `您的点数（${pVal.total}点）大于庄家（${dVal.total}点），获胜！`,
      stats: {
        ...pos.stats,
        handsPlayed: pos.stats.handsPlayed + 1,
        wins: pos.stats.wins + 1,
      },
      updatedAt: Date.now(),
    };
  } else if (pVal.total < dVal.total) {
    return {
      ...pos,
      phase: "settled",
      deck,
      dealerHand,
      result: "dealer_win",
      winAmount: 0,
      dealerSpeech: `庄家点数（${dVal.total}点）高于您的点数（${pVal.total}点），庄家胜。`,
      stats: {
        ...pos.stats,
        handsPlayed: pos.stats.handsPlayed + 1,
        losses: pos.stats.losses + 1,
      },
      updatedAt: Date.now(),
    };
  } else {
    // 平手打和
    return {
      ...pos,
      phase: "settled",
      chips: pos.chips + pos.currentBet,
      deck,
      dealerHand,
      result: "push",
      winAmount: pos.currentBet,
      dealerSpeech: `双方同为 ${pVal.total} 点，打和平局，退还下注筹码。`,
      stats: {
        ...pos.stats,
        handsPlayed: pos.stats.handsPlayed + 1,
        pushes: pos.stats.pushes + 1,
      },
      updatedAt: Date.now(),
    };
  }
}
