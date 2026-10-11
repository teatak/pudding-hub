import {
  pudding,
  type InteractionContext,
  type JSONValue,
} from "@pudding/widget";
import { z } from "zod";
import { initial, place, describePosition, type Position } from "./rules";
import {
  newLobby,
  joinSeat,
  setReady,
  leaveSeat,
  beginPlay,
  roles,
  type Lobby,
} from "./lobby";
import { text } from "./text";

export const position = () =>
  (pudding.state.read().data.position as unknown as Position) || initial();
export const lobby = () =>
  (pudding.state.read().data.lobby as unknown as Lobby) || newLobby(0);
let changing = false;
async function change<T>(fn: () => Promise<T>) {
  if (changing)
    throw new Error(text("An operation is in progress", "当前操作尚未完成"));
  changing = true;
  try {
    return await fn();
  } finally {
    changing = false;
  }
}
function actor(context: InteractionContext) {
  const run = pudding.interaction.read();
  const participant = run?.participants.find(
    (p) => p.id === context.actor?.participantID,
  );
  if (!run || context.actor?.runID !== run.id || !participant)
    throw new Error("Connect to this game first");
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
      position: p as unknown as JSONValue,
    },
  });
}
export function readBoard(context: InteractionContext) {
  const l = lobby(),
    p = position(),
    run = pudding.interaction.read();
  const self =
    run && run.id === context.actor?.runID
      ? run.participants.find((p) => p.id === context.actor?.participantID)
      : undefined;
  const turn = l.phase === "playing" && !p.winner ? p.turn : null;
  return {
    ...describePosition(p),
    round: l.round,
    phase: p.winner ? "finished" : l.phase,
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
                name: run?.participants.find((p) => p.id === id)?.name,
                ready: l.ready.includes(id),
              }
            : null,
        ];
      }),
    ),
    turn,
    yourTurn: turn !== null && !!self && l.seats[turn] === self.id,
  };
}
export class NotificationError extends Error {}
export async function publish() {
  const run = pudding.interaction.read();
  if (!run) throw new Error("Connect to the game first");
  const l = lobby(),
    p = position();
  const waiting = l.phase !== "playing";
  const id =
    "round-" +
    l.round +
    "-" +
    (waiting ? "invite" : p.winner ? "result" : "move-" + p.move);
  try {
    await pudding.interaction.setRequests(
      run.receipts.flatMap((n) =>
        n.id === id
          ? n.deliveries
              .filter((d) => d.active)
              .map((d) => ({
                notificationID: n.id,
                participantID: d.participantID,
              }))
          : [],
      ),
    );
    if (l.phase === "countdown") return;
    if (l.phase === "lobby") {
      await pudding.interaction.notify({
        id,
        audience: { kind: "selected", participantIDs: l.players },
        delivery: "request-action",
        topic: "invitation",
        summary: text(
          "Game invitation: choose a side and get ready",
          "棋局邀请：请选边并准备",
        ),
        message:
          "You are invited to Gomoku, not assigned a side. Read readBoard, choose an available Black or White seat via joinSeat, then call ready. Never choose for another participant. Once both are ready there is a 3-second countdown. Wait for your move notification; do not place a stone during the countdown.",
      });
    } else if (p.winner) {
      const name =
        run.participants.find((player) => player.id === l.seats[p.winner!])
          ?.name || p.winner;
      await pudding.interaction.notify({
        id,
        audience: { kind: "all" },
        delivery: "request-action",
        topic: "result",
        summary:
          p.winner === "draw"
            ? text("Match drawn", "本局平局")
            : text(
                "Match finished: " + name + " wins",
                "本局结束，" + name + "获胜",
              ),
        message:
          "The match has finished: " +
          p.winner +
          ". Briefly acknowledge the result. Do not place more stones.",
        data: { winner: p.winner },
      });
    } else {
      await pudding.interaction.notify({
        id,
        audience: { kind: "selected", participantIDs: [l.seats[p.turn]] },
        delivery: "request-action",
        topic: "move",
        summary: text(
          p.turn + " to move",
          "等待" + (p.turn === "Black" ? "黑方" : "白方") + "落子",
        ),
        message:
          p.turn +
          " to move. Use placeStone with 1-based row/column: row 1 is BOTTOM, row 15 is TOP, columns 1–15 (A–O) go left to right. Include an optional short comment (max 40 characters) in the SAME call to display one line of banter on your player card. The notification already contains the current board and stateVersion; read more only if needed. Never play for the other side.",
        data: { ...describePosition(p), round: l.round, color: p.turn },
      });
    }
  } catch (error) {
    throw new NotificationError(String(error));
  }
}
export const start = (sessionIDs: string[], includeMe: boolean) =>
  change(async () => {
    if (
      sessionIDs.length + Number(includeMe) !== 2 ||
      new Set(sessionIDs).size !== sessionIDs.length
    )
      throw new Error("Choose exactly two players");
    const round = lobby().round + 1;
    const run = await pudding.interaction.connect({ sessionIDs });
    const players = run.participants
      .filter((p) => p.kind === "session" || includeMe)
      .map((p) => p.id);
    await save(newLobby(round, players), initial());
    if (run.status === "paused") await pudding.interaction.resume();
    await publish();
  });
export const changeSeat = (
  action: "join" | "ready" | "unready" | "leave",
  role: string | undefined,
  context: InteractionContext,
) =>
  change(async () => {
    const who = actor(context),
      old = lobby();
    const next =
      action === "join"
        ? joinSeat(old, role!, who.id)
        : action === "leave"
          ? leaveSeat(old, who.id)
          : setReady(old, who.id, action === "ready");
    if (next !== old) await save(next, position());
    return readBoard(context);
  });
export const finishCountdown = () =>
  change(async () => {
    if (pudding.interaction.read()?.status !== "running") return;
    await save(beginPlay(lobby()), position());
    await publish();
  });
export const move = (
  input: { row: number; column: number; comment?: string },
  context: InteractionContext,
) =>
  change(async () => {
    const who = actor(context),
      l = lobby(),
      p = position();
    if (l.phase !== "playing")
      throw new Error(
        "Wait until both players are ready and the countdown finishes",
      );
    if (l.seats[p.turn] !== who.id) throw new Error("Not your turn");
    await save(l, place(p, input.row, input.column, p.turn, input.comment));
    await publish();
    return readBoard(context);
  });
export const resign = (context: InteractionContext) =>
  change(async () => {
    const who = actor(context),
      l = lobby(),
      p = position();
    if (l.phase !== "playing" || p.winner) throw new Error("No ongoing match");
    const role = roles.find((r) => l.seats[r] === who.id);
    if (!role) throw new Error("You have no seat");
    await save(l, {
      ...p,
      winner: role === "Black" ? "White" : "Black",
      last: null,
    });
    await publish();
  });
pudding.defineInterface({
  name: "joinSeat",
  description: "Choose your own available Black or White seat.",
  input: z.object({ role: z.enum(roles) }).strict(),
  run: (i, c) => changeSeat("join", i.role, c),
});
pudding.defineInterface({
  name: "ready",
  description:
    "Mark your own seat ready, or cancel with ready:false before play. Both players ready starts a 3-second countdown.",
  input: z.object({ ready: z.boolean().optional() }).strict(),
  run: (i, c) =>
    changeSeat(i.ready === false ? "unready" : "ready", undefined, c),
});
pudding.defineInterface({
  name: "leaveSeat",
  description:
    "Leave your own seat before play. This also cancels the countdown.",
  input: z.object({}).strict(),
  run: (_, c) => changeSeat("leave", undefined, c),
});
pudding.defineInterface({
  name: "placeStone",
  description:
    "Play your own turn at row/column 1–15. Row 1 is bottom; row 15 is top. Columns increase left to right. Optionally include one short comment for your card.",
  input: z
    .object({
      row: z.number().int().min(1).max(15),
      column: z.number().int().min(1).max(15),
      comment: z.string().trim().max(40).optional(),
    })
    .strict(),
  run: move,
});
pudding.defineInterface({
  name: "readBoard",
  description:
    "Read the board (rows 15 down to 1), stones, turn, seats, readiness, countdown deadline and your identity. Row 1 is bottom; columns 1–15 (A–O) increase left to right.",
  input: z.object({}).strict(),
  run: (_, c) => readBoard(c),
});
pudding.defineInterface({
  name: "resign",
  description: "Resign your own seat in the current game.",
  input: z.object({}).strict(),
  run: (_, c) => resign(c),
});
pudding.interaction.onResume(async () => {
  // The mounted countdown effect owns its single deadline transition, including
  // restoration. A new-round transaction publishes after resume acknowledges.
  if (
    changing ||
    !lobby().round ||
    position().winner ||
    lobby().phase === "countdown"
  )
    return;
  await change(publish);
});
