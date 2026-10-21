import {
  pudding,
  type InteractionContext,
  type JSONValue,
} from "@pudding/widget";
import { z } from "zod";
import {
  type Seat,
  type BidDecision,
  type DoudizhuLobby,
  type DoudizhuPosition,
} from "./types";
import {
  seats,
  initialLobby,
  initialPosition,
  isBotParticipant,
  applyBid,
  applyPlayCards,
  applyPass,
  findLegalPlays,
  chooseBotBid,
  chooseBotPlay,
} from "./rules";
import { t, seatLabel, botNameForSeat, comboLabel } from "./text";

export const position = (): DoudizhuPosition => {
  const saved = pudding.state.read().data.position as unknown as
    | DoudizhuPosition
    | undefined;
  return saved || initialPosition();
};

export const lobby = (): DoudizhuLobby =>
  (pudding.state.read().data.lobby as unknown as DoudizhuLobby) ||
  initialLobby();

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

function actor(context: InteractionContext) {
  const run = pudding.interaction.read();
  const participant = run?.participants.find(
    (p) => p.id === context.actor?.participantID,
  );
  if (!run || context.actor?.runID !== run.id || !participant)
    throw new Error("Connect to this Dou Dizhu game first");
  if (run.status !== "running") throw new Error("Game is paused");
  if (context.signal.aborted) throw new Error("Cancelled");
  return participant;
}

function seatForParticipant(
  l: DoudizhuLobby,
  participantID: string | null | undefined,
): Seat | null {
  if (!participantID) return null;
  return seats.find((s) => l.seats[s] === participantID) || null;
}

async function save(l: DoudizhuLobby, p: DoudizhuPosition) {
  await pudding.state.write({
    expectedVersion: pudding.state.read().version,
    data: {
      lobby: l as unknown as JSONValue,
      position: p as unknown as JSONValue,
    },
  });
}

/**
 * Strictly privacy-isolated view of the table.
 * - Never exposes other players' unplayed hands during bidding/playing.
 * - Never exposes unrevealed hole cards (`bottomCards`) during bidding.
 * - Never exposes historical played-card records (no card tracker / 记牌器).
 */
export function describeTableFor(
  l: DoudizhuLobby,
  p: DoudizhuPosition,
  actorParticipantID: string | null | undefined,
) {
  const run = pudding.interaction.read();
  const mySeat = seatForParticipant(l, actorParticipantID);
  const holeRevealed = l.phase === "playing" || l.phase === "finished";

  const targetCombo =
    mySeat && p.currentPlay && p.currentPlay.seat !== mySeat
      ? p.currentPlay.combo
      : null;

  const isMyPlayTurn =
    l.phase === "playing" && !p.winner && mySeat !== null && p.turn === mySeat;

  const legalHints = isMyPlayTurn
    ? findLegalPlays(p.hands[mySeat], targetCombo)
        .slice(0, 16)
        .map((cards) => cards.map((c) => c.rank))
    : undefined;

  return {
    round: l.round,
    phase: l.phase,
    turn: p.turn,
    yourSeat: mySeat,
    yourTurn: Boolean(mySeat && p.turn === mySeat && !p.winner),
    landlord: p.landlord,
    multiplier: p.multiplier,
    bombCount: p.bombCount,
    spring: p.spring,
    winner: p.winner,
    winningSeat: p.winningSeat,
    // Hole cards are strictly hidden during bidding, revealed once Landlord is decided
    bottomCards: holeRevealed ? p.bottomCards.map((c) => c.rank) : null,
    bidding:
      l.phase === "bidding"
        ? {
            mode: p.bidding.calledBy ? ("rob" as const) : ("call" as const),
            calledBy: p.bidding.calledBy,
            highestBidder: p.bidding.highestBidder,
            robCount: p.bidding.robCount,
            allowedDecisions: p.bidding.calledBy
              ? ["rob", "pass"]
              : ["call", "pass"],
          }
        : null,
    // Only the current active play on the table (never full played-card history)
    currentPlay: p.currentPlay
      ? {
          seat: p.currentPlay.seat,
          cards: p.currentPlay.cards.map((c) => c.rank),
          comboType: p.currentPlay.combo.type,
          mainRank: p.currentPlay.combo.mainRank,
          length: p.currentPlay.combo.length,
        }
      : null,
    seats: Object.fromEntries(
      seats.map((s) => {
        const pid = l.seats[s];
        const isBot = isBotParticipant(pid);
        const partName = isBot
          ? botNameForSeat(s)
          : run?.participants.find((part) => part.id === pid)?.name || s;
        const lastAct = p.lastActions[s];
        return [
          s,
          {
            seat: s,
            name: partName,
            isBot,
            role: p.landlord
              ? p.landlord === s
                ? "Landlord"
                : "Peasant"
              : "undecided",
            cardCount: p.hands[s].length,
            lastAction: lastAct
              ? {
                  kind: lastAct.kind,
                  cards: lastAct.cards?.map((c) => c.rank),
                  comboType: lastAct.combo?.type,
                  comment: lastAct.comment,
                }
              : null,
          },
        ];
      }),
    ),
    // Caller's private hand ONLY
    myHand: mySeat
      ? {
          seat: mySeat,
          role: p.landlord
            ? p.landlord === mySeat
              ? "Landlord"
              : "Peasant"
            : "undecided",
          cardCount: p.hands[mySeat].length,
          cards: p.hands[mySeat].map((c) => c.rank),
          cardIds: p.hands[mySeat].map((c) => c.id),
          ...(isMyPlayTurn
            ? {
                canPass: Boolean(p.currentPlay && p.currentPlay.seat !== mySeat),
                legalPlays: legalHints,
              }
            : {}),
        }
      : null,
  };
}

export function readTable(context: InteractionContext) {
  const run = pudding.interaction.read();
  const actorID =
    run && run.id === context.actor?.runID
      ? context.actor?.participantID
      : null;
  return describeTableFor(lobby(), position(), actorID);
}

export class NotificationError extends Error {}

export async function publish(retry = false) {
  const run = pudding.interaction.read();
  if (!run) return;
  const l = lobby();
  const p = position();

  const isFinished = l.phase === "finished" && Boolean(p.winner);
  const activeSeat = p.turn;
  const activeParticipantID = activeSeat ? l.seats[activeSeat] : null;

  // If it's a built-in Bot's turn, clear pending session requests and let the Bot timer execute locally
  if (!isFinished && l.phase !== "lobby" && isBotParticipant(activeParticipantID)) {
    try {
      await pudding.interaction.setRequests([]);
    } catch {
      /* ignore if no active run requests */
    }
    return;
  }

  const topic = isFinished
    ? "result"
    : l.phase === "lobby"
      ? "invitation"
      : l.phase === "bidding"
        ? "bid"
        : "play";

  const base = `round-${l.round}-${l.phase}-step-${p.stepCount}`;

  const realParticipants = run.participants.map((part) => part.id);
  const recipients = isFinished
    ? realParticipants
    : l.phase === "lobby"
      ? (Object.values(l.seats).filter(
          (id): id is string =>
            Boolean(id) &&
            !isBotParticipant(id) &&
            !l.ready.includes(id as string),
        ) as string[])
      : activeParticipantID && !isBotParticipant(activeParticipantID)
        ? [activeParticipantID]
        : [];

  const previous = run.receipts.filter(
    (n) => n.id === base || n.id.startsWith(base + "-"),
  );

  const latest = (id: string) =>
    previous
      .flatMap((n) =>
        n.deliveries
          .filter((d) => d.participantID === id)
          .map((d) => ({ n, d })),
      )
      .at(-1);

  const needed = recipients.filter((id) => {
    const old = latest(id);
    return (
      !old ||
      (retry &&
        (!old.d.active ||
          !["pending", "queued", "running"].includes(old.d.status)))
    );
  });

  try {
    await pudding.interaction.setRequests(
      recipients.flatMap((id) => {
        const old = latest(id);
        return old?.d.active && !needed.includes(id)
          ? [{ notificationID: old.n.id, participantID: id }]
          : [];
      }),
    );

    if (!needed.length) return;

    const groups = topic === "invitation" ? needed.map((id) => [id]) : [needed];
    for (const participantIDs of groups) {
      const assignedSeat =
        topic === "invitation"
          ? seats.find((s) => l.seats[s] === participantIDs[0])
          : activeSeat || undefined;

      const groupBase = assignedSeat ? `${base}-${assignedSeat}` : base;
      const attempts = previous.filter(
        (n) => n.id === groupBase || n.id.startsWith(`${groupBase}-retry-`),
      );
      const id = attempts.length
        ? `${groupBase}-retry-${attempts.length}`
        : groupBase;

      const sName = assignedSeat ? seatLabel(assignedSeat) : "";
      const bidActionName = p.bidding.calledBy ? t("actRob") : t("actCall");
      const roleName =
        assignedSeat && p.landlord
          ? p.landlord === assignedSeat
            ? t("roleLandlord")
            : t("rolePeasant")
          : t("roleUndecided");

      const winnerText =
        p.winner === "Landlord" ? t("winnerLandlord") : t("winnerPeasant");

      const tableDesc =
        p.currentPlay && assignedSeat && p.currentPlay.seat !== assignedSeat
          ? `${t("followHint", {
              combo: `${comboLabel(
                p.currentPlay.combo.type,
                p.currentPlay.combo.mainRank,
              )} [${p.currentPlay.cards.map((c) => c.rank).join(", ")}]`,
            })}。`
          : `${t("leadHint")}。`;

      const summary =
        topic === "invitation"
          ? t("notifyInviteSummary", { seat: sName })
          : topic === "result"
            ? t("notifyResultSummary", { winner: winnerText })
            : topic === "bid"
              ? t("notifyBidSummary", { seat: sName, action: bidActionName })
              : t("notifyPlaySummary", { seat: sName });

      const message =
        topic === "invitation"
          ? t("notifyInviteMessage", { seat: sName })
          : topic === "result"
            ? t("notifyResultMessage", {
                winner: winnerText,
                multiplier: p.multiplier,
              })
            : topic === "bid"
              ? t("notifyBidMessage", { seat: sName, action: bidActionName })
              : t("notifyPlayMessage", {
                  seat: sName,
                  role: roleName,
                  tableDesc,
                });

      // Public snapshot ONLY — never put private hands or played-card history in notify.data
      const publicData = describeTableFor(l, p, null);

      await pudding.interaction.notify({
        id,
        audience: isFinished
          ? { kind: "all" }
          : { kind: "selected", participantIDs },
        delivery: "request-action",
        topic,
        summary,
        message,
        data: publicData as unknown as JSONValue,
      });
    }
  } catch (error) {
    throw new NotificationError(
      error instanceof Error ? error.message : String(error),
    );
  }
}

export const start = (assignments: Record<Seat, string>) =>
  change(async () => {
    const previous = lobby();
    const nonBots = Object.values(assignments).filter(
      (id) => id && !id.startsWith("@bot"),
    );
    if (new Set(nonBots).size !== nonBots.length) {
      throw new Error(t("seatConflictError"));
    }

    const sessionCandidates = (await pudding.interaction.candidates()).sessions;
    const sessionIDs = nonBots.filter((id) => id !== "@me");
    const run = await pudding.interaction.connect({ sessionIDs });

    const humanPart = run.participants.find((p) => p.kind === "human");
    const sessionParts = run.participants.filter((p) => p.kind === "session");

    const participantFor = (
      seat: Seat,
      chosenID: string | null | undefined,
    ): string => {
      if (!chosenID || chosenID.startsWith("@bot")) {
        return `@bot:${seat}`;
      }
      if (chosenID === "@me") {
        return humanPart?.id || `@bot:${seat}`;
      }
      const byDirectSessionID = run.participants.find(
        (p) =>
          (p as unknown as { sessionID?: string }).sessionID === chosenID,
      );
      if (byDirectSessionID) return byDirectSessionID.id;

      const byPartID = run.participants.find((p) => p.id === chosenID);
      if (byPartID) return byPartID.id;

      const sessionIndex = sessionIDs.indexOf(chosenID);
      if (sessionIndex >= 0 && sessionIndex < sessionParts.length) {
        return sessionParts[sessionIndex].id;
      }

      const match = sessionCandidates.find(
        (s) => s.id === chosenID || s.participantID === chosenID,
      );
      if (match) {
        const fromRun = run.participants.find(
          (p) =>
            (match.participantID && p.id === match.participantID) ||
            p.name === match.name,
        );
        if (fromRun) return fromRun.id;
      }
      return `@bot:${seat}`;
    };

    const resolvedSeats: Record<Seat, string> = {
      South: participantFor("South", assignments.South),
      East: participantFor("East", assignments.East),
      West: participantFor("West", assignments.West),
    };

    await pudding.interaction.setRequests([]);
    const nextRound = previous.round + 1;
    const firstBidder = seats[(nextRound - 1) % 3];
    const nextLobby: DoudizhuLobby = {
      round: nextRound,
      phase: "bidding",
      seats: resolvedSeats,
      ready: Object.values(resolvedSeats),
      startsAt: Date.now(),
    };
    const nextPos = initialPosition(firstBidder);
    await save(nextLobby, nextPos);
    if (pudding.interaction.read()?.status === "paused") {
      await pudding.interaction.resume();
    }
    await publish();
  });

export const changeReadiness = (ready: boolean, context: InteractionContext) =>
  change(async () => {
    const who = actor(context);
    const l = lobby();
    const readyList = ready
      ? Array.from(new Set([...l.ready, who.id]))
      : l.ready.filter((id) => id !== who.id);
    const nextLobby = { ...l, ready: readyList };
    await save(nextLobby, position());
    return describeTableFor(nextLobby, position(), who.id);
  });

export const callLandlord = (
  input: { decision: BidDecision; comment?: string },
  context: InteractionContext,
) =>
  change(async () => {
    const who = actor(context);
    const l = lobby();
    const p = position();
    const mySeat = seatForParticipant(l, who.id);
    if (!mySeat) throw new Error("You do not occupy a seat in this round");
    const res = applyBid(l, p, mySeat, input.decision, input.comment);
    await save(res.lobby, res.position);
    await publish();
    return describeTableFor(res.lobby, res.position, who.id);
  });

export const playCards = (
  input: { cards: string[]; comment?: string },
  context: InteractionContext,
) =>
  change(async () => {
    const who = actor(context);
    const l = lobby();
    const p = position();
    const mySeat = seatForParticipant(l, who.id);
    if (!mySeat) throw new Error("You do not occupy a seat in this round");
    const res = applyPlayCards(l, p, mySeat, input.cards, input.comment);
    await save(res.lobby, res.position);
    await publish();
    return describeTableFor(res.lobby, res.position, who.id);
  });

export const passTurn = (
  input: { comment?: string },
  context: InteractionContext,
) =>
  change(async () => {
    const who = actor(context);
    const l = lobby();
    const p = position();
    const mySeat = seatForParticipant(l, who.id);
    if (!mySeat) throw new Error("You do not occupy a seat in this round");
    const res = applyPass(l, p, mySeat, input.comment);
    await save(res.lobby, res.position);
    await publish();
    return describeTableFor(res.lobby, res.position, who.id);
  });

/**
 * Executes a single built-in Bot turn if the active turn belongs to a `@bot:*` seat.
 */
export const stepBotTurn = () =>
  change(async () => {
    const run = pudding.interaction.read();
    if (run && run.status === "paused") return false;
    const l = lobby();
    const p = position();
    if (l.phase !== "bidding" && l.phase !== "playing") return false;
    if (!p.turn || p.winner) return false;

    const pid = l.seats[p.turn];
    if (!isBotParticipant(pid)) return false;

    let res: { lobby: DoudizhuLobby; position: DoudizhuPosition };
    if (l.phase === "bidding") {
      const decision = chooseBotBid(p, p.turn);
      res = applyBid(l, p, p.turn, decision);
    } else {
      const choice = chooseBotPlay(p, p.turn);
      if (choice.action === "play") {
        res = applyPlayCards(l, p, p.turn, choice.cards);
      } else {
        res = applyPass(l, p, p.turn);
      }
    }

    await save(res.lobby, res.position);
    await publish();
    return true;
  });

export const pause = async () => {
  const l = lobby();
  const p = position();
  if (l.phase === "lobby" || p.winner) throw new Error("No ongoing game");
  await pudding.interaction.pause();
  await mutation?.catch(() => {});
};

export const resume = async () => {
  await pudding.interaction.resume();
};

function registerInterfaces() {
  return [
    pudding.defineInterface({
      name: "ready",
      description: t("descReady"),
      input: z.object({ ready: z.boolean().optional() }).strict(),
      run: (i, c) => changeReadiness(i.ready !== false, c),
    }),
    pudding.defineInterface({
      name: "readTable",
      description: t("descReadTable"),
      input: z.object({}).strict(),
      run: (_, c) => readTable(c),
    }),
    pudding.defineInterface({
      name: "callLandlord",
      description: t("descCallLandlord"),
      input: z
        .object({
          decision: z.enum(["call", "rob", "pass"]),
          comment: z.string().trim().max(40).optional(),
        })
        .strict(),
      run: callLandlord,
    }),
    pudding.defineInterface({
      name: "playCards",
      description: t("descPlayCards"),
      input: z
        .object({
          cards: z.array(z.string().min(1)).min(1).max(20),
          comment: z.string().trim().max(40).optional(),
        })
        .strict(),
      run: playCards,
    }),
    pudding.defineInterface({
      name: "pass",
      description: t("descPass"),
      input: z
        .object({
          comment: z.string().trim().max(40).optional(),
        })
        .strict(),
      run: passTurn,
    }),
  ];
}

let interfaces = registerInterfaces();
pudding.locale.subscribe(() => {
  interfaces.forEach((remove) => remove());
  interfaces = registerInterfaces();
});

pudding.interaction.onResume(async () => {
  if (changing || lobby().phase === "lobby" || position().winner) return;
  await change(async () => {
    await publish(true);
  });
});
