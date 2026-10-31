import { setLocale } from "./text";
import {
  pudding,
  type InteractionContext,
  type JSONValue,
} from "@pudding/widget";
import { z } from "zod";
import {
  initial,
  derive,
  record,
  pauseClock,
  resumeClock,
  place,
  describePosition,
  summarizePosition,
  type Position,
  type PositionState,
} from "./rules";
import {
  newLobby,
  emptyLobby,
  setReady,
  beginPlay,
  roles,
  type Lobby,
} from "./lobby";
import { t, errorText } from "./text";

export const position = () => {
  const saved = pudding.state.read().data.position as unknown as
    | PositionState
    | undefined;
  return saved ? derive(saved) : initial();
};

export const lobby = () =>
  (pudding.state.read().data.lobby as unknown as Lobby) || emptyLobby();

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
    throw new Error("Connect to this game first");
  if (run.status !== "running") throw new Error("Game is paused");
  if (context.signal.aborted) throw new Error("Cancelled");
  if (!lobby().players.includes(participant.id))
    throw new Error("You are observing this round");
  return participant;
}

async function save(l: Lobby, p: Position) {
  await pudding.state.write({
    expectedVersion: pudding.state.read().version,
    data: {
      lobby: l as unknown as JSONValue,
      position: record(p) as unknown as JSONValue,
    },
  });
}

export function readBoard(context: InteractionContext, includeHistory = false) {
  const l = lobby();
  const p = position();
  const run = pudding.interaction.read();
  const self =
    run && run.id === context.actor?.runID
      ? run.participants.find((part) => part.id === context.actor?.participantID)
      : undefined;
  const turn = l.phase === "playing" && !p.winner ? p.turn : null;

  return {
    ...describePosition(p),
    ...(includeHistory ? { history: p.history } : {}),
    round: l.round,
    phase: p.winner ? "finished" : l.phase,
    paused: run?.status === "paused",
    startsAt: l.startsAt,
    self: self
      ? {
          participantID: self.id,
          name: self.name,
          seats: roles.filter((r) => l.seats[r] === self.id),
          ready: l.ready.includes(self.id),
        }
      : null,
    seats: Object.fromEntries(
      roles.map((role) => {
        const id = l.seats[role];
        return [
          role,
          id
            ? {
                participantID: id,
                name: run?.participants.find((part) => part.id === id)?.name,
                ready: l.ready.includes(id),
              }
            : null,
        ];
      }),
    ),
    turn,
    yourTurn:
      run?.status === "running" &&
      turn !== null &&
      !!self &&
      l.seats[turn] === self.id,
  };
}

function actionResult() {
  const l = lobby();
  const p = position();
  return {
    ...summarizePosition(p),
    round: l.round,
    phase: p.winner ? "finished" : l.phase,
  };
}

export class NotificationError extends Error {}

export async function publish(retry = false) {
  const run = pudding.interaction.read();
  if (!run) throw new Error("Connect to this game first");
  const l = lobby();
  const p = position();

  const topic = p.winner
    ? "result"
    : l.phase === "playing"
      ? "move"
      : "invitation";

  const base = `round-${l.round}-${topic}-${p.moveCount}`;
  const recipients =
    l.phase === "countdown"
      ? []
      : p.winner
        ? run.participants.map((player) => player.id)
        : l.phase === "lobby"
          ? l.players.filter((id) => !l.ready.includes(id))
          : p.turn ? [l.seats[p.turn]] : [];

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
      const assignedColor =
        topic === "invitation"
          ? roles.find((role) => l.seats[role] === participantIDs[0])
          : undefined;

      const groupBase = assignedColor ? `${base}-${assignedColor}` : base;
      const attempts = previous.filter(
        (n) => n.id === groupBase || n.id.startsWith(`${groupBase}-retry-`),
      );
      const id = attempts.length
        ? `${groupBase}-retry-${attempts.length}`
        : groupBase;

      const color = p.turn === "Black" ? t("colorBlack") : t("colorWhite");
      const name =
        run.participants.find((player) => player.id === (p.winner ? l.seats[p.winner] : undefined))
          ?.name || (p.winner === "Black" ? t("colorBlack") : t("colorWhite"));

      const summary =
        topic === "invitation"
          ? t("notifyInviteSummary", {
              color:
                assignedColor === "Black" ? t("stoneBlack") : t("stoneWhite"),
            })
          : topic === "result"
            ? p.winner === "draw"
              ? t("notifyMatchDrawn")
              : t("notifyMatchFinished", { name: name || "" })
            : t("notifyWaitingMoveSummary", { color });

      const message =
        topic === "invitation"
          ? t("notifyInviteMessage", {
              color:
                assignedColor === "Black" ? t("stoneBlack") : t("stoneWhite"),
            })
          : topic === "result"
            ? t("notifyResultSummary", { result: summary })
            : t("notifyMoveMessage", { color });

      await pudding.interaction.notify({
        id,
        audience: p.winner
          ? { kind: "all" }
          : { kind: "selected", participantIDs },
        delivery: "request-action",
        topic,
        summary,
        message,
        data: {
          ...describePosition(p),
          ...(assignedColor ? { assignedColor } : {}),
          round: l.round,
          phase: p.winner ? "finished" : l.phase,
          turn: l.phase === "playing" && !p.winner ? p.turn : null,
        },
      });
    }
  } catch (error) {
    throw new NotificationError(
      error instanceof Error ? error.message : String(error),
    );
  }
}

export const pause = async () => {
  if (!lobby().round || position().winner) throw new Error("No ongoing match");
  await pudding.interaction.pause();
  await mutation?.catch(() => {});
  await change(() => save(lobby(), pauseClock(position())));
};

export const start = (sessionIDs: string[], includeMe: boolean) =>
  change(async () => {
    if (
      sessionIDs.length + Number(includeMe) !== 2 ||
      new Set(sessionIDs).size !== sessionIDs.length
    )
      throw new Error("Choose exactly two players");
    const previous = lobby();
    const run = await pudding.interaction.connect({ sessionIDs });
    const players = run.participants
      .filter((p) => p.kind === "session" || includeMe)
      .map((p) => p.id);
    await pudding.interaction.setRequests([]);
    await save(newLobby(previous, players), initial());
    if (run.status === "paused") await pudding.interaction.resume();
    await publish();
  });

export const changeReadiness = (ready: boolean, context: InteractionContext) =>
  change(async () => {
    const who = actor(context);
    const old = lobby();
    const next = setReady(old, who.id, ready);
    if (next !== old) await save(next, position());
    return readBoard(context);
  });

export const finishCountdown = () =>
  change(async () => {
    if (pudding.interaction.read()?.status !== "running") return;
    const now = Date.now();
    await save(beginPlay(lobby(), now), { ...position(), turnStartedAt: now });
    await publish();
  });

export const move = (
  input: { row: number; column: string; comment?: string },
  context: InteractionContext,
) =>
  change(async () => {
    const who = actor(context);
    const l = lobby();
    const p = position();
    if (l.phase !== "playing")
      throw new Error(
        "Wait until both players are ready and the countdown finishes",
      );
    if (!p.turn || l.seats[p.turn] !== who.id) throw new Error("Not your turn");
    await save(l, place(p, input.row, input.column, p.turn, input.comment));
    await publish();
    return actionResult();
  });

export const resign = (context: InteractionContext) =>
  change(async () => {
    const who = actor(context);
    const l = lobby();
    const p = position();
    if (l.phase !== "playing" || p.winner) throw new Error("No ongoing match");
    const role = roles.find((r) => l.seats[r] === who.id);
    if (!role) throw new Error("You have no seat");
    await save(l, {
      ...p,
      resigned: role,
      turnStartedAt: null,
    });
    await publish();
    return actionResult();
  });

function defineGameInterface<T>(
  definition: Parameters<typeof pudding.defineInterface<T>>[0],
) {
  return pudding.defineInterface({
    ...definition,
    async run(input, context) {
      try {
        return await definition.run(input, context);
      } catch (error) {
        throw new Error(errorText(error));
      }
    },
  });
}

function registerInterfaces() {
  setLocale(pudding.locale.read());
  const coordinates = { error: errorText("Use columns A–H and rows 1–8") };
  return [
    defineGameInterface({
      name: "ready",
      description: t("descReady"),
      input: z.object({ ready: z.boolean().optional() }).strict(),
      run: (i, c) => changeReadiness(i.ready !== false, c),
    }),
    defineGameInterface({
      name: "placeDisc",
      description: t("descPlaceDisc"),
      input: z
        .object({
          row: z
            .number(coordinates)
            .int(coordinates)
            .min(1, coordinates)
            .max(8, coordinates),
          column: z.string(coordinates).regex(/^[A-H]$/, coordinates),
          comment: z
            .string()
            .trim()
            .max(40, errorText("Keep your comment within 40 characters"))
            .optional(),
        })
        .strict(),
      run: move,
    }),
    defineGameInterface({
      name: "readBoard",
      description: t("descReadBoard"),
      input: z.object({ includeHistory: z.boolean().optional() }).strict(),
      run: (i, c) => readBoard(c, i.includeHistory),
    }),
    defineGameInterface({
      name: "resign",
      description: t("descResign"),
      input: z.object({}).strict(),
      run: (_, c) => resign(c),
    }),
  ];
}

let interfaces = registerInterfaces();
pudding.locale.subscribe(() => {
  interfaces.forEach((remove) => remove());
  interfaces = registerInterfaces();
});

pudding.interaction.onResume(async () => {
  if (changing || !lobby().round || position().winner) return;
  await change(async () => {
    const l = lobby();
    await save(
      l.phase === "countdown" ? { ...l, startsAt: Date.now() + 3000 } : l,
      l.phase === "playing" ? resumeClock(position()) : position(),
    );
    await publish(true);
  });
});
