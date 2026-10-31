import { setLocale } from "./text";
import {
  pudding,
  type InteractionContext,
  type JSONValue,
} from "@pudding/widget";
import { z } from "zod";
import type {
  Seat,
  WordCategory,
  UndercoverLobby,
  UndercoverPosition,
} from "./types";
import {
  allSeats,
  seatsForCount,
  initialLobby,
  createInitialPosition,
  isBotParticipant,
  eligibleVoteTargetsFor,
  applySpeak,
  applyVote,
  chooseBotSpeech,
  chooseBotVote,
} from "./rules";
import { t, seatLabel, seatShortLabel, botNameForSeat } from "./text";

/**
 * Recursively converts any `undefined` values to `null` so objects strictly conform
 * to `@pudding/widget` host's `jsonValue` Zod schema.
 */
export function sanitizeJsonValue<T>(value: T): JSONValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonValue(item));
  }
  if (typeof value === "object") {
    const out: Record<string, JSONValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeJsonValue(v);
    }
    return out;
  }
  return null;
}

export const lobby = (): UndercoverLobby =>
  (pudding.state.read().data.lobby as unknown as UndercoverLobby) ||
  initialLobby();

export const position = (): UndercoverPosition => {
  const saved = pudding.state.read().data.position as unknown as
    | UndercoverPosition
    | undefined;
  return saved || createInitialPosition(0, 4, 1, "all");
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

function actor(context: InteractionContext) {
  const run = pudding.interaction.read();
  const participant = run?.participants.find(
    (p) => p.id === context.actor?.participantID,
  );
  if (!run || context.actor?.runID !== run.id || !participant)
    throw new Error("Connect to this Who is the Undercover game first");
  if (run.status !== "running") throw new Error("Game is paused");
  if (context.signal.aborted) throw new Error("Cancelled");
  return participant;
}

function seatForParticipant(
  l: UndercoverLobby,
  participantID: string | null | undefined,
): Seat | null {
  if (!participantID) return null;
  const active = seatsForCount(l.playerCount);
  return active.find((s) => l.seats[s] === participantID) || null;
}

async function save(l: UndercoverLobby, p: UndercoverPosition) {
  await pudding.state.write({
    expectedVersion: pudding.state.read().version,
    data: {
      lobby: sanitizeJsonValue(l),
      position: sanitizeJsonValue(p),
    },
  });
}

/**
 * Strictly privacy-isolated view of the interrogation table.
 * - While the game is in progress, each player ONLY receives their own secret word (`yourWord`).
 * - Players do NOT know whether they are Civilian or Undercover (`yourRole: "unknown"`) unless they have been eliminated or the game has finished!
 * - Other alive players' words and roles are NEVER exposed in `readBoard` or `notify`.
 */
export function describeTableFor(
  l: UndercoverLobby,
  p: UndercoverPosition,
  actorParticipantID: string | null | undefined,
) {
  const run = pudding.interaction.read();
  const mySeat = seatForParticipant(l, actorParticipantID);
  const isFinished = l.phase === "finished" && Boolean(p.winner);

  const myEliminatedRecord = mySeat
    ? p.eliminated.find((e) => e.seat === mySeat) || null
    : null;

  const snapshot = {
    round: l.round,
    phase: l.phase,
    cycle: p.cycle,
    isPkTieBreak: p.pkRound > 0,
    pkCandidates: p.pkCandidates,
    turn: p.turn ?? null,
    yourSeat: mySeat ?? null,
    yourTurn: Boolean(mySeat && p.turn === mySeat && !p.winner),
    yourWord: mySeat ? p.words[mySeat] || null : null,
    yourRole:
      mySeat && (isFinished || myEliminatedRecord)
        ? p.roles[mySeat]
        : mySeat
          ? "unknown"
          : null,
    eligibleVoteTargets:
      mySeat && l.phase === "voting" && p.turn === mySeat
        ? eligibleVoteTargetsFor(p, mySeat)
        : null,
    aliveSeats: p.aliveSeats,
    speakingOrder: p.speakingOrder,
    winner: p.winner ?? null,
    winReason: p.winner ? t(p.winner === "Civilian" ? "winnerCivilian" : "winnerUndercover") : null,
    revealedWords: isFinished
      ? {
          civilianWord: p.civilianWord,
          undercoverWord: p.undercoverWord,
        }
      : null,
    seats: Object.fromEntries(
      p.activeSeats.map((s) => {
        const pid = l.seats[s];
        const isBot = isBotParticipant(pid);
        const partName = isBot
          ? botNameForSeat(s)
          : run?.participants.find((part) => part.id === pid)?.name ||
            seatShortLabel(s);
        const isAlive = p.aliveSeats.includes(s);
        const elim = p.eliminated.find((e) => e.seat === s) || null;
        const lastAct = p.lastActions[s];
        return [
          s,
          {
            seat: s,
            name: partName,
            isBot,
            alive: isAlive,
            revealedRole: isFinished
              ? p.roles[s]
              : elim
                ? elim.role
                : null,
            revealedWord: isFinished ? p.words[s] : null,
            lastAction: lastAct
              ? {
                  kind: lastAct.kind,
                  cycle: lastAct.cycle,
                  text: lastAct.text ?? null,
                  target: lastAct.target ?? null,
                  reason: lastAct.reason ?? null,
                }
              : null,
          },
        ];
      }),
    ),
    speeches: p.speeches.map((sp) => ({
      step: sp.step,
      cycle: sp.cycle,
      isPk: sp.isPk,
      seat: sp.seat,
      text: sp.text,
    })),
    votes: p.votes.map((vt) => ({
      step: vt.step,
      cycle: vt.cycle,
      isPk: vt.isPk,
      voter: vt.voter,
      target: vt.target,
      reason: vt.reason ?? null,
    })),
    eliminated: p.eliminated.map((el) => ({
      cycle: el.cycle,
      seat: el.seat,
      role: el.role,
      voteCount: el.voteCount,
    })),
  };

  return sanitizeJsonValue(snapshot);
}

export function readBoard(context: InteractionContext) {
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

  if (
    !isFinished &&
    l.phase !== "lobby" &&
    isBotParticipant(activeParticipantID)
  ) {
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
      : l.phase === "speaking"
        ? "speak"
        : "vote";

  const base = `round-${l.round}-cycle-${p.cycle}-${l.phase}-step-${p.stepCount}`;

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
          ? allSeats.find((s) => l.seats[s] === participantIDs[0])
          : activeSeat || undefined;

      const groupBase = assignedSeat ? `${base}-${assignedSeat}` : base;
      const attempts = previous.filter(
        (n) => n.id === groupBase || n.id.startsWith(`${groupBase}-retry-`),
      );
      const id = attempts.length
        ? `${groupBase}-retry-${attempts.length}`
        : groupBase;

      const sName = assignedSeat ? seatLabel(assignedSeat) : "";
      const winnerText =
        p.winner === "Civilian" ? t("winnerCivilian") : t("winnerUndercover");

      const summary =
        topic === "invitation"
          ? t("notifyInviteSummary", { seat: sName })
          : topic === "result"
            ? t("notifyResultSummary", { winner: winnerText })
            : topic === "speak"
              ? t("notifySpeakSummary", { seat: sName, cycle: p.cycle })
              : t("notifyVoteSummary", { seat: sName, cycle: p.cycle });

      const message =
        topic === "invitation"
          ? t("notifyInviteMessage", { seat: sName })
          : topic === "result"
            ? t("notifyResultMessage", {
                winner: winnerText,
                civWord: p.civilianWord,
                undWord: p.undercoverWord,
              })
            : topic === "speak"
              ? t("notifySpeakMessage", { seat: sName, cycle: p.cycle })
              : t("notifyVoteMessage", { seat: sName, cycle: p.cycle });

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
        data: publicData,
      });
    }
  } catch (error) {
    throw new NotificationError(
      error instanceof Error ? error.message : String(error),
    );
  }
}

export interface StartGameOptions {
  playerCount: 4 | 6;
  undercoverCount: 1 | 2;
  category: WordCategory;
  customCivilianWord?: string | null;
  customUndercoverWord?: string | null;
  assignments: Record<Seat, string>;
  locale?: string;
}

export const start = (options: StartGameOptions) =>
  change(async () => {
    const previous = lobby();
    const activeSeats = seatsForCount(options.playerCount);

    if (options.category === "custom") {
      const cWord = options.customCivilianWord?.trim() || "";
      const uWord = options.customUndercoverWord?.trim() || "";
      if (!cWord || !uWord || cWord === uWord) {
        throw new Error(t("customWordError"));
      }
    }

    const activeAssignments = activeSeats.map((s) => options.assignments[s]);
    const nonBots = activeAssignments.filter(
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

    const resolvedSeats: Record<Seat, string | null> = {
      Seat1: participantFor("Seat1", options.assignments.Seat1),
      Seat2: participantFor("Seat2", options.assignments.Seat2),
      Seat3: participantFor("Seat3", options.assignments.Seat3),
      Seat4: participantFor("Seat4", options.assignments.Seat4),
      Seat5:
        options.playerCount === 6
          ? participantFor("Seat5", options.assignments.Seat5)
          : null,
      Seat6:
        options.playerCount === 6
          ? participantFor("Seat6", options.assignments.Seat6)
          : null,
    };

    await pudding.interaction.setRequests([]);
    const nextRound = previous.round + 1;
    const actualUndercoverCount: 1 | 2 =
      options.playerCount === 4 ? 1 : options.undercoverCount;

    const nextLobby: UndercoverLobby = {
      round: nextRound,
      phase: "speaking",
      playerCount: options.playerCount,
      undercoverCount: actualUndercoverCount,
      category: options.category,
      customCivilianWord: options.customCivilianWord?.trim() || null,
      customUndercoverWord: options.customUndercoverWord?.trim() || null,
      seats: resolvedSeats,
      ready: Object.values(resolvedSeats).filter((v): v is string => Boolean(v)),
      startsAt: Date.now(),
    };

    const nextPos = createInitialPosition(
      nextRound,
      options.playerCount,
      actualUndercoverCount,
      options.category,
      nextLobby.customCivilianWord,
      nextLobby.customUndercoverWord,
      undefined,
      options.locale,
    );

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

export const speak = (
  input: { clue: string },
  context: InteractionContext,
) =>
  change(async () => {
    const who = actor(context);
    const l = lobby();
    const p = position();
    const mySeat = seatForParticipant(l, who.id);
    if (!mySeat) throw new Error("You do not occupy an active seat in this round");
    const res = applySpeak(l, p, mySeat, input.clue);
    await save(res.lobby, res.position);
    await publish();
    return describeTableFor(res.lobby, res.position, who.id);
  });

export const vote = (
  input: { target: Seat; reason?: string },
  context: InteractionContext,
) =>
  change(async () => {
    const who = actor(context);
    const l = lobby();
    const p = position();
    const mySeat = seatForParticipant(l, who.id);
    if (!mySeat) throw new Error("You do not occupy an active seat in this round");
    const res = applyVote(l, p, mySeat, input.target, input.reason);
    await save(res.lobby, res.position);
    await publish();
    return describeTableFor(res.lobby, res.position, who.id);
  });

export const stepBotTurn = () =>
  change(async () => {
    const run = pudding.interaction.read();
    if (run && run.status === "paused") return false;
    const l = lobby();
    const p = position();
    if (l.phase !== "speaking" && l.phase !== "voting") return false;
    if (!p.turn || p.winner) return false;

    const pid = l.seats[p.turn];
    if (!isBotParticipant(pid)) return false;

    let res: { lobby: UndercoverLobby; position: UndercoverPosition };
    if (l.phase === "speaking") {
      const clue = chooseBotSpeech(p, p.turn);
      res = applySpeak(l, p, p.turn, clue);
    } else {
      const { target, reason } = chooseBotVote(p, p.turn);
      res = applyVote(l, p, p.turn, target, reason);
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
  setLocale(pudding.locale.read());
  return [
    pudding.defineInterface({
      name: "ready",
      description: t("descReady"),
      input: z.object({ ready: z.boolean().optional() }).strict(),
      run: (i, c) => changeReadiness(i.ready !== false, c),
    }),
    pudding.defineInterface({
      name: "readBoard",
      description: t("descReadBoard"),
      input: z.object({}).strict(),
      run: (_, c) => readBoard(c),
    }),
    pudding.defineInterface({
      name: "speak",
      description: t("descSpeak"),
      input: z
        .object({
          clue: z.string().trim().min(1).max(120),
        })
        .strict(),
      run: speak,
    }),
    pudding.defineInterface({
      name: "vote",
      description: t("descVote"),
      input: z
        .object({
          target: z.enum(["Seat1", "Seat2", "Seat3", "Seat4", "Seat5", "Seat6"]),
          reason: z.string().trim().max(80).optional(),
        })
        .strict(),
      run: vote,
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
