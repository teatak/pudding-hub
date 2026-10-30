import {
  pudding,
  type InteractionContext,
  type JSONValue,
} from "@pudding/widget";
import { z } from "zod";
import {
  type BlackjackLobby,
  type BlackjackPosition,
} from "./types";
import {
  initialLobby,
  initialPosition,
  dealRound,
  playerHit,
  playerStand,
  playerDouble,
  calculateHand,
} from "./rules";
import {
  playDealSound,
  playChipSound,
  playWinSound,
  playBlackjackSound,
  playBustSound,
} from "./sound";
import { t } from "./text";

export const position = (): BlackjackPosition => {
  const saved = pudding.state.read().data.position as unknown as
    | BlackjackPosition
    | undefined;
  return saved || initialPosition();
};

export const lobby = (): BlackjackLobby => {
  const saved = pudding.state.read().data.lobby as unknown as
    | BlackjackLobby
    | undefined;
  return saved || initialLobby();
};

let changing = false;
let mutation: Promise<unknown> | null = null;

async function change<T>(fn: () => Promise<T>): Promise<T> {
  if (changing) throw new Error("An operation is in progress");
  changing = true;
  try {
    mutation = fn();
    return (await mutation) as T;
  } finally {
    changing = false;
    mutation = null;
  }
}

async function save(l: BlackjackLobby, p: BlackjackPosition) {
  await pudding.state.write({
    expectedVersion: pudding.state.read().version,
    data: {
      lobby: l as unknown as JSONValue,
      position: p as unknown as JSONValue,
    },
  });
}

function actor(context: InteractionContext) {
  const run = pudding.interaction.read();
  const participant = run?.participants.find(
    (p) => p.id === context.actor?.participantID,
  );
  if (!run || context.actor?.runID !== run.id || !participant) {
    throw new Error("Connect to this Blackjack table first");
  }
  if (run.status !== "running") throw new Error("Game is paused");
  if (context.signal.aborted) throw new Error("Cancelled");
  return participant;
}

export async function publish() {
  const run = pudding.interaction.read();
  if (!run || run.status !== "running") return;
  const l = lobby();
  const p = position();

  try {
    if (p.phase === "settled") {
      await pudding.interaction.notify({
        id: `result-${Date.now()}`,
        audience: { kind: "all" },
        delivery: "inform",
        topic: "hand_result",
        summary: t("notifyResult"),
        message: `${p.dealerSpeech} (余额: ${p.chips} 筹码)`,
        data: {
          phase: p.phase,
          result: p.result,
          chips: p.chips,
          winAmount: p.winAmount,
        } as unknown as JSONValue,
      });
      return;
    }

    if (p.phase === "player_turn") {
      const pVal = calculateHand(p.playerHand);
      await pudding.interaction.notify({
        id: `turn-player-${Date.now()}`,
        audience: { kind: "all" },
        delivery: "request-action",
        topic: "player_turn",
        summary: t("notifyYourTurn"),
        message: `当前点数: ${pVal.total}点。可执行要牌 (hit)、停牌 (stand) 或加倍 (doubleDown)。`,
        data: {
          phase: p.phase,
          playerTotal: pVal.total,
          isSoft: pVal.isSoft,
          dealerVisibleCard: p.dealerHand.find((c) => c.faceUp),
        } as unknown as JSONValue,
      });
    }
  } catch {}
}

// ================= 动作执行 =================

export async function deal(betAmount?: number) {
  return change(async () => {
    const l = lobby();
    const p = position();
    const bet = betAmount || p.currentBet;
    const nextPos = dealRound(p, bet);
    playDealSound();
    playChipSound();

    if (nextPos.result === "blackjack_win") {
      playBlackjackSound();
    }

    await save(l, nextPos);
    await publish();
    return { success: true, phase: nextPos.phase, result: nextPos.result };
  });
}

export async function hit(context?: InteractionContext) {
  return change(async () => {
    if (context) actor(context);
    const l = lobby();
    const p = position();
    const nextPos = playerHit(p);
    playDealSound();

    if (nextPos.result === "player_bust") {
      playBustSound();
    } else if (nextPos.phase === "settled") {
      if (nextPos.result === "player_win" || nextPos.result === "dealer_bust_win") {
        playWinSound();
      }
    }

    await save(l, nextPos);
    await publish();
    return { success: true, phase: nextPos.phase, result: nextPos.result };
  });
}

export async function stand(context?: InteractionContext) {
  return change(async () => {
    if (context) actor(context);
    const l = lobby();
    const p = position();
    const nextPos = playerStand(p);
    playDealSound();

    if (nextPos.result === "player_win" || nextPos.result === "dealer_bust_win") {
      playWinSound();
    } else if (nextPos.result === "dealer_win") {
      playBustSound();
    }

    await save(l, nextPos);
    await publish();
    return { success: true, result: nextPos.result, winAmount: nextPos.winAmount };
  });
}

export async function doubleDown(context?: InteractionContext) {
  return change(async () => {
    if (context) actor(context);
    const l = lobby();
    const p = position();
    const nextPos = playerDouble(p);
    playDealSound();
    playChipSound();

    if (nextPos.result === "player_bust" || nextPos.result === "dealer_win") {
      playBustSound();
    } else if (nextPos.result === "player_win" || nextPos.result === "dealer_bust_win") {
      playWinSound();
    }

    await save(l, nextPos);
    await publish();
    return { success: true, result: nextPos.result, winAmount: nextPos.winAmount };
  });
}

export async function refillChips() {
  return change(async () => {
    const l = lobby();
    const p = position();
    const nextPos: BlackjackPosition = {
      ...p,
      chips: Math.max(p.chips, 1000),
      dealerSpeech: "已为您补充 1000 筹码，祝好运！",
      updatedAt: Date.now(),
    };
    playChipSound();
    await save(l, nextPos);
  });
}

export function readTable() {
  const p = position();
  const pVal = calculateHand(p.playerHand);
  const dVal = calculateHand(p.dealerHand, p.phase !== "settled");

  return {
    phase: p.phase,
    chips: p.chips,
    currentBet: p.currentBet,
    playerHand: p.playerHand,
    playerTotal: pVal.total,
    playerSoft: pVal.isSoft,
    dealerHand: p.dealerHand.map((c) => (c.faceUp ? c : { ...c, rank: "?", suit: "?" })),
    dealerTotal: dVal.total,
    dealerSpeech: p.dealerSpeech,
    result: p.result,
    winAmount: p.winAmount,
    stats: p.stats,
  };
}

function registerInterfaces() {
  return [
    pudding.defineInterface({
      name: "deal",
      description: "Start a new hand with the specified chip bet (or default current bet)",
      input: z
        .object({
          bet: z.number().min(10).max(1000).optional(),
        })
        .strict(),
      run: (input) => deal(input.bet),
    }),
    pudding.defineInterface({
      name: "hit",
      description: "Draw one additional card to player's hand",
      input: z.object({}).strict(),
      run: (_, context) => hit(context),
    }),
    pudding.defineInterface({
      name: "stand",
      description: "End player turn and let dealer play out their hand",
      input: z.object({}).strict(),
      run: (_, context) => stand(context),
    }),
    pudding.defineInterface({
      name: "doubleDown",
      description: "Double the bet, take exactly one card, and automatically stand",
      input: z.object({}).strict(),
      run: (_, context) => doubleDown(context),
    }),
    pudding.defineInterface({
      name: "refillChips",
      description: "Refill bankroll back to 1000 chips",
      input: z.object({}).strict(),
      run: () => refillChips(),
    }),
    pudding.defineInterface({
      name: "readTable",
      description: "Get full visible Blackjack table state, hands, totals, and chips",
      input: z.object({}).strict(),
      run: () => readTable(),
    }),
  ];
}

registerInterfaces();

pudding.interaction.onResume(async () => {
  if (changing || position().phase !== "player_turn") return;
  await change(async () => {
    await publish();
  });
});
