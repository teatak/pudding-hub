import type {
  Seat,
  Suit,
  Rank,
  Card,
  Combo,
  DoudizhuLobby,
  DoudizhuPosition,
  BidDecision,
} from "./types";

export const seats: Seat[] = ["South", "East", "West"];

export const ranks: Rank[] = [
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
  "2",
  "BJ",
  "RJ",
];

export const rankValues: Record<Rank, number> = {
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
  "2": 15,
  BJ: 16,
  RJ: 17,
};

const suitOrder: Record<Suit, number> = {
  J: 5,
  S: 4,
  H: 3,
  C: 2,
  D: 1,
};

export function nextSeat(seat: Seat): Seat {
  if (seat === "South") return "East";
  if (seat === "East") return "West";
  return "South";
}

export function prevSeat(seat: Seat): Seat {
  if (seat === "South") return "West";
  if (seat === "West") return "East";
  return "South";
}

export function isBotParticipant(id: string | null | undefined): boolean {
  return Boolean(id && id.startsWith("@bot:"));
}

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    return suitOrder[b.suit] - suitOrder[a.suit];
  });
}

export function createDeck(): Card[] {
  const suits: Suit[] = ["S", "H", "C", "D"];
  const normalRanks: Rank[] = [
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
    "2",
  ];
  const deck: Card[] = [];
  for (const r of normalRanks) {
    for (const s of suits) {
      deck.push({
        id: `${s}${r}`,
        suit: s,
        rank: r,
        value: rankValues[r],
      });
    }
  }
  deck.push({ id: "BJ", suit: "J", rank: "BJ", value: 16 });
  deck.push({ id: "RJ", suit: "J", rank: "RJ", value: 17 });
  return deck;
}

export function shuffleDeck(deck: Card[], seedFn = Math.random): Card[] {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(seedFn() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function dealDeck(seedFn = Math.random): {
  hands: Record<Seat, Card[]>;
  bottomCards: Card[];
} {
  const deck = shuffleDeck(createDeck(), seedFn);
  return {
    hands: {
      South: sortCards(deck.slice(0, 17)),
      East: sortCards(deck.slice(17, 34)),
      West: sortCards(deck.slice(34, 51)),
    },
    bottomCards: sortCards(deck.slice(51, 54)),
  };
}

export function initialLobby(): DoudizhuLobby {
  return {
    round: 0,
    phase: "lobby",
    seats: {
      South: null,
      East: null,
      West: null,
    },
    ready: [],
    startsAt: null,
  };
}

export function initialPosition(firstBidder: Seat = "South"): DoudizhuPosition {
  const dealt = dealDeck();
  return {
    turn: firstBidder,
    turnStartedAt: Date.now(),
    landlord: null,
    hands: dealt.hands,
    bottomCards: dealt.bottomCards,
    bidding: {
      firstBidder,
      calledBy: null,
      highestBidder: null,
      robCount: 0,
      passedCallSeats: [],
      actedAfterCallSeats: [],
      finalCallerPending: false,
    },
    multiplier: 1,
    bombCount: 0,
    spring: null,
    currentPlay: null,
    passCount: 0,
    lastActions: { South: null, East: null, West: null },
    comments: { South: null, East: null, West: null },
    playCounts: { South: 0, East: 0, West: 0 },
    stepCount: 0,
    winner: null,
    winningSeat: null,
  };
}

export function normalizeCardToken(raw: string): {
  exactId?: string;
  rank: Rank;
} {
  const token = raw.trim().toUpperCase();
  if (token === "BJ" || token === "小王" || token === "BLACK_JOKER" || token === "SJ") {
    return { exactId: "BJ", rank: "BJ" };
  }
  if (token === "RJ" || token === "大王" || token === "RED_JOKER" || token === "BG") {
    return { exactId: "RJ", rank: "RJ" };
  }
  const suitMap: Record<string, Suit> = {
    "♠": "S",
    "♥": "H",
    "♣": "C",
    "♦": "D",
    S: "S",
    H: "H",
    C: "C",
    D: "D",
  };
  if (token.length >= 2 && suitMap[token[0]]) {
    const s = suitMap[token[0]];
    const rPart = token.slice(1) === "T" ? "10" : token.slice(1);
    if ((ranks as string[]).includes(rPart)) {
      return { exactId: `${s}${rPart}`, rank: rPart as Rank };
    }
  }
  const normalizedRank = token === "T" ? "10" : token;
  if ((ranks as string[]).includes(normalizedRank)) {
    return { rank: normalizedRank as Rank };
  }
  throw new Error(`Invalid card token: ${raw}`);
}

export function matchCardsFromHand(hand: Card[], requested: string[]): Card[] {
  if (!requested.length) throw new Error("Select at least one card to play");
  const parsed = requested.map(normalizeCardToken);
  const usedIndices = new Set<number>();
  const matched: Card[] = [];

  // Pass 1: exact ID matches
  const pendingRanks: Rank[] = [];
  for (const item of parsed) {
    if (item.exactId) {
      const idx = hand.findIndex(
        (c, i) => !usedIndices.has(i) && c.id === item.exactId,
      );
      if (idx >= 0) {
        usedIndices.add(idx);
        matched.push(hand[idx]);
      } else {
        pendingRanks.push(item.rank);
      }
    } else {
      pendingRanks.push(item.rank);
    }
  }

  // Pass 2: rank matches (pick lowest suit first to preserve higher visual suits if any)
  for (const r of pendingRanks) {
    const idx = hand.findIndex((c, i) => !usedIndices.has(i) && c.rank === r);
    if (idx < 0) {
      throw new Error(`Card ${r} is not in your hand`);
    }
    usedIndices.add(idx);
    matched.push(hand[idx]);
  }

  return sortCards(matched);
}

function rankByValue(val: number): Rank {
  return (ranks.find((r) => rankValues[r] === val) || "3") as Rank;
}

export function classifyCards(cards: Card[]): Combo | null {
  const n = cards.length;
  if (n === 0) return null;

  const counts = new Map<number, number>();
  for (const c of cards) {
    counts.set(c.value, (counts.get(c.value) || 0) + 1);
  }
  const uniqueValues = [...counts.keys()].sort((a, b) => a - b);

  // 1. Single
  if (n === 1) {
    const val = cards[0].value;
    return {
      type: "single",
      mainRank: rankByValue(val),
      mainValue: val,
      length: 1,
      chainLength: 1,
    };
  }

  // 2. Rocket or Pair
  if (n === 2) {
    if (counts.has(16) && counts.has(17)) {
      return {
        type: "rocket",
        mainRank: "RJ",
        mainValue: 17,
        length: 2,
        chainLength: 1,
      };
    }
    if (uniqueValues.length === 1) {
      const val = uniqueValues[0];
      return {
        type: "pair",
        mainRank: rankByValue(val),
        mainValue: val,
        length: 2,
        chainLength: 1,
      };
    }
    return null;
  }

  // 3. Triple
  if (n === 3) {
    if (uniqueValues.length === 1) {
      const val = uniqueValues[0];
      return {
        type: "triple",
        mainRank: rankByValue(val),
        mainValue: val,
        length: 3,
        chainLength: 1,
      };
    }
    return null;
  }

  // 4. Bomb or Triple + Single
  if (n === 4) {
    if (uniqueValues.length === 1) {
      const val = uniqueValues[0];
      return {
        type: "bomb",
        mainRank: rankByValue(val),
        mainValue: val,
        length: 4,
        chainLength: 1,
      };
    }
    for (const [val, cnt] of counts.entries()) {
      if (cnt === 3) {
        return {
          type: "triple_single",
          mainRank: rankByValue(val),
          mainValue: val,
          length: 4,
          chainLength: 1,
        };
      }
    }
    return null;
  }

  // 5. Triple + Pair (5 cards)
  if (n === 5) {
    let tripleVal: number | null = null;
    let hasPair = false;
    for (const [val, cnt] of counts.entries()) {
      if (cnt === 3) tripleVal = val;
      if (cnt === 2) hasPair = true;
    }
    if (tripleVal !== null && hasPair) {
      return {
        type: "triple_pair",
        mainRank: rankByValue(tripleVal),
        mainValue: tripleVal,
        length: 5,
        chainLength: 1,
      };
    }
  }

  // 6. Straight (n >= 5, all count === 1, all values <= 14)
  if (
    n >= 5 &&
    uniqueValues.length === n &&
    uniqueValues[n - 1] <= 14 &&
    uniqueValues[n - 1] - uniqueValues[0] === n - 1
  ) {
    const hi = uniqueValues[n - 1];
    return {
      type: "straight",
      mainRank: rankByValue(hi),
      mainValue: hi,
      length: n,
      chainLength: n,
    };
  }

  // 7. Pair Straight (n >= 6, even, all count === 2, all values <= 14)
  if (n >= 6 && n % 2 === 0) {
    const chainLen = n / 2;
    if (
      uniqueValues.length === chainLen &&
      uniqueValues.every((v) => counts.get(v) === 2 && v <= 14) &&
      uniqueValues[chainLen - 1] - uniqueValues[0] === chainLen - 1
    ) {
      const hi = uniqueValues[chainLen - 1];
      return {
        type: "pair_straight",
        mainRank: rankByValue(hi),
        mainValue: hi,
        length: n,
        chainLength: chainLen,
      };
    }
  }

  // 8. Airplane without wings (n >= 6, multiple of 3, all count === 3, all values <= 14)
  if (n >= 6 && n % 3 === 0) {
    const chainLen = n / 3;
    if (
      uniqueValues.length === chainLen &&
      uniqueValues.every((v) => counts.get(v) === 3 && v <= 14) &&
      uniqueValues[chainLen - 1] - uniqueValues[0] === chainLen - 1
    ) {
      const hi = uniqueValues[chainLen - 1];
      return {
        type: "airplane",
        mainRank: rankByValue(hi),
        mainValue: hi,
        length: n,
        chainLength: chainLen,
      };
    }
  }

  // 9. Four + Two Singles (n === 6)
  if (n === 6) {
    for (const [val, cnt] of counts.entries()) {
      if (cnt === 4) {
        // Remaining 2 cards cannot be both BJ and RJ
        if (!(counts.has(16) && counts.has(17))) {
          return {
            type: "four_two_single",
            mainRank: rankByValue(val),
            mainValue: val,
            length: 6,
            chainLength: 1,
          };
        }
      }
    }
  }

  // 10. Four + Two Pairs (n === 8)
  if (n === 8) {
    const quads = uniqueValues.filter((v) => counts.get(v) === 4);
    if (quads.length === 2) {
      const hi = Math.max(quads[0], quads[1]);
      return {
        type: "four_two_pair",
        mainRank: rankByValue(hi),
        mainValue: hi,
        length: 8,
        chainLength: 1,
      };
    }
    if (quads.length === 1) {
      const quadVal = quads[0];
      const others = uniqueValues.filter((v) => v !== quadVal);
      if (others.every((v) => counts.get(v) === 2)) {
        return {
          type: "four_two_pair",
          mainRank: rankByValue(quadVal),
          mainValue: quadVal,
          length: 8,
          chainLength: 1,
        };
      }
    }
  }

  // 11. Airplane with Single Wings (n >= 8, n % 4 === 0)
  if (n >= 8 && n % 4 === 0) {
    const chainLen = n / 4;
    const tripleCandidates = uniqueValues.filter(
      (v) => v <= 14 && (counts.get(v) || 0) >= 3,
    );
    let bestHi: number | null = null;
    for (let i = 0; i + chainLen <= tripleCandidates.length; i++) {
      const slice = tripleCandidates.slice(i, i + chainLen);
      if (slice[chainLen - 1] - slice[0] === chainLen - 1) {
        // Check remaining cards don't contain both jokers
        const remCounts = new Map(counts);
        for (const v of slice) {
          remCounts.set(v, (remCounts.get(v) || 0) - 3);
        }
        const hasBothJokers =
          (remCounts.get(16) || 0) > 0 && (remCounts.get(17) || 0) > 0;
        if (!hasBothJokers) {
          bestHi = slice[chainLen - 1];
        }
      }
    }
    if (bestHi !== null) {
      return {
        type: "airplane_single",
        mainRank: rankByValue(bestHi),
        mainValue: bestHi,
        length: n,
        chainLength: chainLen,
      };
    }
  }

  // 12. Airplane with Pair Wings (n >= 10, n % 5 === 0)
  if (n >= 10 && n % 5 === 0) {
    const chainLen = n / 5;
    const tripleCandidates = uniqueValues.filter(
      (v) => v <= 14 && (counts.get(v) || 0) >= 3,
    );
    let bestHi: number | null = null;
    for (let i = 0; i + chainLen <= tripleCandidates.length; i++) {
      const slice = tripleCandidates.slice(i, i + chainLen);
      if (slice[chainLen - 1] - slice[0] === chainLen - 1) {
        const remCounts = new Map(counts);
        for (const v of slice) {
          remCounts.set(v, (remCounts.get(v) || 0) - 3);
        }
        let allPairs = true;
        for (const c of remCounts.values()) {
          if (c % 2 !== 0) {
            allPairs = false;
            break;
          }
        }
        if (allPairs) {
          bestHi = slice[chainLen - 1];
        }
      }
    }
    if (bestHi !== null) {
      return {
        type: "airplane_pair",
        mainRank: rankByValue(bestHi),
        mainValue: bestHi,
        length: n,
        chainLength: chainLen,
      };
    }
  }

  return null;
}

export function canBeat(challenger: Combo, target: Combo | null): boolean {
  if (!target) return true;
  if (challenger.type === "rocket") return true;
  if (target.type === "rocket") return false;
  if (challenger.type === "bomb") {
    if (target.type !== "bomb") return true;
    return challenger.mainValue > target.mainValue;
  }
  if (target.type === "bomb") return false;
  return (
    challenger.type === target.type &&
    challenger.length === target.length &&
    challenger.chainLength === target.chainLength &&
    challenger.mainValue > target.mainValue
  );
}

function groupHandByValue(hand: Card[]): Map<number, Card[]> {
  const map = new Map<number, Card[]>();
  for (const c of hand) {
    const list = map.get(c.value) || [];
    list.push(c);
    map.set(c.value, list);
  }
  return map;
}

/**
 * Generates candidate legal plays from `hand` that beat `target` (or lead if `target === null`),
 * ordered from lowest/most natural plays to bombs/rocket.
 */
export function findLegalPlays(hand: Card[], target: Combo | null): Card[][] {
  const byVal = groupHandByValue(hand);
  const valuesAsc = [...byVal.keys()].sort((a, b) => a - b);
  const results: Card[][] = [];

  const addIfBeats = (cards: Card[]) => {
    const combo = classifyCards(cards);
    if (combo && canBeat(combo, target)) {
      results.push(sortCards(cards));
    }
  };

  // Helper: non-bomb single/pair kickers sorted ascending (prefer pure singles/pairs over breaking triples/bombs)
  const singleKickers = (excludeVals: Set<number>): Card[] => {
    const pureSingles = valuesAsc
      .filter((v) => !excludeVals.has(v) && byVal.get(v)!.length === 1)
      .map((v) => byVal.get(v)![0]);
    const otherSingles = valuesAsc
      .filter((v) => !excludeVals.has(v) && byVal.get(v)!.length > 1 && byVal.get(v)!.length < 4)
      .map((v) => byVal.get(v)![0]);
    return [...pureSingles, ...otherSingles];
  };

  const pairKickers = (excludeVals: Set<number>): Card[][] => {
    const purePairs = valuesAsc
      .filter((v) => !excludeVals.has(v) && byVal.get(v)!.length === 2)
      .map((v) => byVal.get(v)!.slice(0, 2));
    const triplePairs = valuesAsc
      .filter((v) => !excludeVals.has(v) && byVal.get(v)!.length === 3)
      .map((v) => byVal.get(v)!.slice(0, 2));
    return [...purePairs, ...triplePairs];
  };

  const wantType = target?.type;

  // 1. Singles (prefer non-bomb singles first)
  if (!wantType || wantType === "single") {
    for (const v of valuesAsc) {
      if (byVal.get(v)!.length < 4) addIfBeats([byVal.get(v)![0]]);
    }
  }

  // 2. Pairs
  if (!wantType || wantType === "pair") {
    for (const v of valuesAsc) {
      const grp = byVal.get(v)!;
      if (grp.length >= 2 && grp.length < 4) addIfBeats(grp.slice(0, 2));
    }
  }

  // 3. Triples, Triple + Single, Triple + Pair
  const triples = valuesAsc.filter((v) => byVal.get(v)!.length === 3);
  if (!wantType || wantType === "triple") {
    for (const v of triples) addIfBeats(byVal.get(v)!.slice(0, 3));
  }
  if (!wantType || wantType === "triple_single") {
    for (const v of triples) {
      const kickers = singleKickers(new Set([v]));
      if (kickers.length > 0) {
        addIfBeats([...byVal.get(v)!.slice(0, 3), kickers[0]]);
      }
    }
  }
  if (!wantType || wantType === "triple_pair") {
    for (const v of triples) {
      const kickers = pairKickers(new Set([v]));
      if (kickers.length > 0) {
        addIfBeats([...byVal.get(v)!.slice(0, 3), ...kickers[0]]);
      }
    }
  }

  // 4. Straights
  if (!wantType || wantType === "straight") {
    const seqVals = valuesAsc.filter((v) => v <= 14);
    const minLen = target?.type === "straight" ? target.length : 5;
    const maxLen = target?.type === "straight" ? target.length : 12;
    for (let len = minLen; len <= maxLen; len++) {
      for (let i = 0; i + len <= seqVals.length; i++) {
        const slice = seqVals.slice(i, i + len);
        if (slice[len - 1] - slice[0] === len - 1) {
          addIfBeats(slice.map((v) => byVal.get(v)![0]));
        }
      }
    }
  }

  // 5. Pair Straights
  if (!wantType || wantType === "pair_straight") {
    const pairVals = valuesAsc.filter((v) => v <= 14 && byVal.get(v)!.length >= 2);
    const minChain = target?.type === "pair_straight" ? target.chainLength : 3;
    const maxChain = target?.type === "pair_straight" ? target.chainLength : 10;
    for (let cl = minChain; cl <= maxChain; cl++) {
      for (let i = 0; i + cl <= pairVals.length; i++) {
        const slice = pairVals.slice(i, i + cl);
        if (slice[cl - 1] - slice[0] === cl - 1) {
          addIfBeats(slice.flatMap((v) => byVal.get(v)!.slice(0, 2)));
        }
      }
    }
  }

  // 6. Airplanes (without wings, with single wings, with pair wings)
  if (
    !wantType ||
    wantType === "airplane" ||
    wantType === "airplane_single" ||
    wantType === "airplane_pair"
  ) {
    const tripVals = valuesAsc.filter((v) => v <= 14 && byVal.get(v)!.length >= 3);
    const minChain =
      target && target.type.startsWith("airplane") ? target.chainLength : 2;
    const maxChain =
      target && target.type.startsWith("airplane") ? target.chainLength : 5;
    for (let cl = minChain; cl <= maxChain; cl++) {
      for (let i = 0; i + cl <= tripVals.length; i++) {
        const slice = tripVals.slice(i, i + cl);
        if (slice[cl - 1] - slice[0] === cl - 1) {
          const core = slice.flatMap((v) => byVal.get(v)!.slice(0, 3));
          const excl = new Set(slice);
          if (!wantType || wantType === "airplane") {
            addIfBeats(core);
          }
          if (!wantType || wantType === "airplane_single") {
            const sKickers = singleKickers(excl);
            if (sKickers.length >= cl) {
              const chosen = sKickers.slice(0, cl);
              const hasRocket =
                chosen.some((c) => c.value === 16) &&
                chosen.some((c) => c.value === 17);
              if (!hasRocket) addIfBeats([...core, ...chosen]);
            }
          }
          if (!wantType || wantType === "airplane_pair") {
            const pKickers = pairKickers(excl);
            if (pKickers.length >= cl) {
              addIfBeats([...core, ...pKickers.slice(0, cl).flat()]);
            }
          }
        }
      }
    }
  }

  // 7. Four + Two
  const bombs = valuesAsc.filter((v) => byVal.get(v)!.length === 4);
  if (wantType === "four_two_single") {
    for (const v of bombs) {
      const sKickers = singleKickers(new Set([v]));
      if (sKickers.length >= 2) {
        addIfBeats([...byVal.get(v)!, sKickers[0], sKickers[1]]);
      }
    }
  }
  if (wantType === "four_two_pair") {
    for (const v of bombs) {
      const pKickers = pairKickers(new Set([v]));
      if (pKickers.length >= 2) {
        addIfBeats([...byVal.get(v)!, ...pKickers[0], ...pKickers[1]]);
      }
    }
  }

  // 8. Bombs & Rocket (always valid against non-rocket or smaller bomb)
  for (const v of bombs) {
    addIfBeats(byVal.get(v)!);
  }
  if (byVal.has(16) && byVal.has(17)) {
    addIfBeats([byVal.get(16)![0], byVal.get(17)![0]]);
  }

  return results;
}

/**
 * Finalizes Landlord assignment, reveals the 3 hole cards into Landlord's hand, and starts play.
 */
export function finalizeLandlord(
  lobby: DoudizhuLobby,
  pos: DoudizhuPosition,
  landlord: Seat,
): { lobby: DoudizhuLobby; position: DoudizhuPosition } {
  const updatedHands: Record<Seat, Card[]> = {
    ...pos.hands,
    [landlord]: sortCards([...pos.hands[landlord], ...pos.bottomCards]),
  };
  return {
    lobby: {
      ...lobby,
      phase: "playing",
    },
    position: {
      ...pos,
      landlord,
      hands: updatedHands,
      turn: landlord,
      turnStartedAt: Date.now(),
      currentPlay: null,
      passCount: 0,
      lastActions: { South: null, East: null, West: null },
    },
  };
}

/**
 * Applies a Call / Rob Landlord decision during `phase === "bidding"`.
 */
export function applyBid(
  lobby: DoudizhuLobby,
  pos: DoudizhuPosition,
  seat: Seat,
  decision: BidDecision,
  comment?: string,
): { lobby: DoudizhuLobby; position: DoudizhuPosition } {
  if (lobby.phase !== "bidding") {
    throw new Error("Bidding phase has already finished");
  }
  if (pos.turn !== seat) {
    throw new Error("Not your turn to bid");
  }

  const stepCount = pos.stepCount + 1;
  const trimmedComment = comment?.trim() || undefined;
  const comments = trimmedComment
    ? { ...pos.comments, [seat]: { step: stepCount, text: trimmedComment } }
    : pos.comments;

  const b = pos.bidding;

  // Sub-phase 1: Nobody has called Landlord yet
  if (!b.calledBy) {
    const wantsLandlord = decision === "call" || decision === "rob";
    if (wantsLandlord) {
      const nextBidding = {
        ...b,
        calledBy: seat,
        highestBidder: seat,
      };
      const lastActions = {
        ...pos.lastActions,
        [seat]: { kind: "call" as const, comment: trimmedComment },
      };
      // Find eligible seats after `seat` that haven't passed yet
      const orderAfter: Seat[] = [nextSeat(seat), nextSeat(nextSeat(seat))];
      const eligible = orderAfter.filter(
        (s) => !b.passedCallSeats.includes(s),
      );
      const nextPos: DoudizhuPosition = {
        ...pos,
        bidding: nextBidding,
        lastActions,
        comments,
        stepCount,
        turnStartedAt: Date.now(),
      };
      if (eligible.length === 0) {
        return finalizeLandlord(lobby, nextPos, seat);
      }
      return {
        lobby,
        position: {
          ...nextPos,
          turn: eligible[0],
        },
      };
    } else {
      // Player chose "不叫"
      const passedCallSeats = [...b.passedCallSeats, seat];
      const lastActions = {
        ...pos.lastActions,
        [seat]: { kind: "no_call" as const, comment: trimmedComment },
      };
      const nextPos: DoudizhuPosition = {
        ...pos,
        bidding: {
          ...b,
          passedCallSeats,
        },
        lastActions,
        comments,
        stepCount,
        turnStartedAt: Date.now(),
      };
      if (passedCallSeats.length >= 3) {
        // All 3 passed -> firstBidder becomes Landlord at 1x multiplier
        return finalizeLandlord(lobby, nextPos, b.firstBidder);
      }
      return {
        lobby,
        position: {
          ...nextPos,
          turn: nextSeat(seat),
        },
      };
    }
  }

  // Sub-phase 2: Someone already called Landlord (Robbing phase)
  const wantsRob = decision === "rob" || decision === "call";
  const robCount = wantsRob ? b.robCount + 1 : b.robCount;
  const multiplier = wantsRob ? pos.multiplier * 2 : pos.multiplier;
  const highestBidder = wantsRob ? seat : b.highestBidder;
  const lastActions = {
    ...pos.lastActions,
    [seat]: {
      kind: (wantsRob ? "rob" : "no_rob") as "rob" | "no_rob",
      comment: trimmedComment,
    },
  };

  // If this is the original caller's final rob decision, bidding finishes now!
  if (seat === b.calledBy) {
    const nextPos: DoudizhuPosition = {
      ...pos,
      multiplier,
      bidding: {
        ...b,
        robCount,
        highestBidder,
        finalCallerPending: false,
      },
      lastActions,
      comments,
      stepCount,
      turnStartedAt: Date.now(),
    };
    return finalizeLandlord(lobby, nextPos, highestBidder || b.calledBy);
  }

  const actedAfterCallSeats = [...b.actedAfterCallSeats, seat];
  const orderAfterCaller: Seat[] = [
    nextSeat(b.calledBy),
    nextSeat(nextSeat(b.calledBy)),
  ];
  const remainingOtherSeats = orderAfterCaller.filter(
    (s) =>
      !b.passedCallSeats.includes(s) && !actedAfterCallSeats.includes(s),
  );

  const nextPos: DoudizhuPosition = {
    ...pos,
    multiplier,
    bidding: {
      ...b,
      robCount,
      highestBidder,
      actedAfterCallSeats,
      finalCallerPending: remainingOtherSeats.length === 0 && robCount > 0,
    },
    lastActions,
    comments,
    stepCount,
    turnStartedAt: Date.now(),
  };

  if (remainingOtherSeats.length > 0) {
    return {
      lobby,
      position: {
        ...nextPos,
        turn: remainingOtherSeats[0],
      },
    };
  }

  // All non-caller eligible seats have acted:
  // If anyone robbed, the original caller gets 1 final chance to rob back!
  if (robCount > 0) {
    return {
      lobby,
      position: {
        ...nextPos,
        turn: b.calledBy,
      },
    };
  }

  // Nobody robbed -> original caller is Landlord!
  return finalizeLandlord(lobby, nextPos, b.calledBy);
}

/**
 * Applies playing cards during `phase === "playing"`.
 */
export function applyPlayCards(
  lobby: DoudizhuLobby,
  pos: DoudizhuPosition,
  seat: Seat,
  requestedCards: string[],
  comment?: string,
): { lobby: DoudizhuLobby; position: DoudizhuPosition } {
  if (lobby.phase !== "playing" || pos.winner) {
    throw new Error("Game is not in the playing phase");
  }
  if (pos.turn !== seat) {
    throw new Error("Not your turn");
  }

  const hand = pos.hands[seat];
  const selectedCards = matchCardsFromHand(hand, requestedCards);
  const combo = classifyCards(selectedCards);
  if (!combo) {
    throw new Error("Invalid Dou Dizhu card combination");
  }

  const targetCombo =
    pos.currentPlay && pos.currentPlay.seat !== seat
      ? pos.currentPlay.combo
      : null;

  if (!canBeat(combo, targetCombo)) {
    throw new Error("Selected cards cannot beat the current play on table");
  }

  const selectedIds = new Set(selectedCards.map((c) => c.id));
  const remainingHand = hand.filter((c) => !selectedIds.has(c.id));

  const isBomb = combo.type === "bomb" || combo.type === "rocket";
  let multiplier = isBomb ? pos.multiplier * 2 : pos.multiplier;
  const bombCount = isBomb ? pos.bombCount + 1 : pos.bombCount;
  const stepCount = pos.stepCount + 1;
  const trimmedComment = comment?.trim() || undefined;
  const comments = trimmedComment
    ? { ...pos.comments, [seat]: { step: stepCount, text: trimmedComment } }
    : pos.comments;

  const playCounts = {
    ...pos.playCounts,
    [seat]: pos.playCounts[seat] + 1,
  };

  // Starting a fresh lead clears previous trick's pass tags on other seats
  const baseLastActions =
    targetCombo === null
      ? { South: null, East: null, West: null }
      : { ...pos.lastActions };

  const lastActions = {
    ...baseLastActions,
    [seat]: {
      kind: "play" as const,
      cards: selectedCards,
      combo,
      comment: trimmedComment,
    },
  };

  const hands = {
    ...pos.hands,
    [seat]: remainingHand,
  };

  // Check if player emptied their hand (Win!)
  if (remainingHand.length === 0) {
    const landlord = pos.landlord!;
    const winner: "Landlord" | "Peasant" =
      seat === landlord ? "Landlord" : "Peasant";
    const peasants = seats.filter((s) => s !== landlord);
    let spring: "spring" | "anti_spring" | null = null;
    if (
      winner === "Landlord" &&
      peasants.every((pSeat) => playCounts[pSeat] === 0)
    ) {
      spring = "spring";
      multiplier *= 2;
    } else if (winner === "Peasant" && playCounts[landlord] <= 1) {
      spring = "anti_spring";
      multiplier *= 2;
    }

    return {
      lobby: {
        ...lobby,
        phase: "finished",
      },
      position: {
        ...pos,
        hands,
        multiplier,
        bombCount,
        spring,
        currentPlay: { seat, cards: selectedCards, combo },
        passCount: 0,
        lastActions,
        comments,
        playCounts,
        stepCount,
        turn: null,
        turnStartedAt: null,
        winner,
        winningSeat: seat,
      },
    };
  }

  return {
    lobby,
    position: {
      ...pos,
      hands,
      multiplier,
      bombCount,
      currentPlay: { seat, cards: selectedCards, combo },
      passCount: 0,
      lastActions,
      comments,
      playCounts,
      stepCount,
      turn: nextSeat(seat),
      turnStartedAt: Date.now(),
    },
  };
}

/**
 * Applies passing ("不出" / "要不起") during `phase === "playing"`.
 */
export function applyPass(
  lobby: DoudizhuLobby,
  pos: DoudizhuPosition,
  seat: Seat,
  comment?: string,
): { lobby: DoudizhuLobby; position: DoudizhuPosition } {
  if (lobby.phase !== "playing" || pos.winner) {
    throw new Error("Game is not in the playing phase");
  }
  if (pos.turn !== seat) {
    throw new Error("Not your turn");
  }
  if (!pos.currentPlay || pos.currentPlay.seat === seat) {
    throw new Error("You are leading this trick and must play cards (cannot pass)");
  }

  const nextPassCount = pos.passCount + 1;
  const stepCount = pos.stepCount + 1;
  const trimmedComment = comment?.trim() || undefined;
  const comments = trimmedComment
    ? { ...pos.comments, [seat]: { step: stepCount, text: trimmedComment } }
    : pos.comments;

  const nextTurn = nextSeat(seat);
  const trickEnded = nextPassCount >= 2;

  return {
    lobby,
    position: {
      ...pos,
      currentPlay: trickEnded ? null : pos.currentPlay,
      passCount: trickEnded ? 0 : nextPassCount,
      lastActions: {
        ...pos.lastActions,
        [seat]: { kind: "pass", comment: trimmedComment },
      },
      comments,
      stepCount,
      turn: nextTurn,
      turnStartedAt: Date.now(),
    },
  };
}

/**
 * Built-in rule AI decision for Call / Rob Landlord.
 */
export function chooseBotBid(pos: DoudizhuPosition, seat: Seat): BidDecision {
  const hand = pos.hands[seat];
  const byVal = groupHandByValue(hand);
  let score = 0;
  if (byVal.has(17)) score += 4; // Red Joker
  if (byVal.has(16)) score += 3; // Black Joker
  score += (byVal.get(15)?.length || 0) * 2; // 2s
  score += (byVal.get(14)?.length || 0) * 1; // Aces
  for (const grp of byVal.values()) {
    if (grp.length === 4) score += 5; // Bomb
  }

  if (!pos.bidding.calledBy) {
    return score >= 5 ? "call" : "pass";
  }
  return score >= 7 ? "rob" : "pass";
}

/**
 * Built-in rule AI decision for Playing / Passing.
 */
export function chooseBotPlay(
  pos: DoudizhuPosition,
  seat: Seat,
): { action: "play"; cards: string[] } | { action: "pass" } {
  const hand = pos.hands[seat];
  const target =
    pos.currentPlay && pos.currentPlay.seat !== seat
      ? pos.currentPlay.combo
      : null;

  const legal = findLegalPlays(hand, target);
  if (legal.length === 0) {
    return { action: "pass" };
  }

  // Leading a trick
  if (!target) {
    // If we can play the entire hand in 1 move, do it immediately!
    const fullCombo = classifyCards(hand);
    if (fullCombo) {
      return { action: "play", cards: hand.map((c) => c.id) };
    }
    // Prefer multi-card non-bomb combos first (airplane, straight, pair_straight, triple_*)
    const nonBombs = legal.filter((cards) => {
      const c = classifyCards(cards)!;
      return c.type !== "bomb" && c.type !== "rocket";
    });
    const multiCard = nonBombs.filter((cards) => cards.length >= 4);
    if (multiCard.length > 0) {
      return { action: "play", cards: multiCard[0].map((c) => c.id) };
    }
    const chosen = nonBombs[0] || legal[0];
    return { action: "play", cards: chosen.map((c) => c.id) };
  }

  // Following a trick
  const currentSeat = pos.currentPlay!.seat;
  const isTeammate =
    seat !== pos.landlord &&
    currentSeat !== pos.landlord &&
    pos.landlord !== null;

  // If we can finish our hand in one play, always win immediately!
  const winningPlay = legal.find((cards) => cards.length === hand.length);
  if (winningPlay) {
    return { action: "play", cards: winningPlay.map((c) => c.id) };
  }

  const nonBombs = legal.filter((cards) => {
    const c = classifyCards(cards)!;
    return c.type !== "bomb" && c.type !== "rocket";
  });

  if (isTeammate) {
    const teammateRemaining = pos.hands[currentSeat].length;
    // Let peasant teammate keep the lead if they have few cards or played a high card
    if (teammateRemaining <= 5 || target.mainValue >= 13 || nonBombs.length === 0) {
      return { action: "pass" };
    }
  }

  if (nonBombs.length > 0) {
    return { action: "play", cards: nonBombs[0].map((c) => c.id) };
  }

  // Only use a bomb/rocket if enemy has <= 6 cards left or we have <= 6 cards left
  const enemyRemaining = pos.hands[currentSeat].length;
  if (!isTeammate && (enemyRemaining <= 6 || hand.length <= 6)) {
    return { action: "play", cards: legal[0].map((c) => c.id) };
  }

  return { action: "pass" };
}
