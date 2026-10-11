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
  type Position,
  type PositionState,
} from "./rules";
import {
  newLobby,
  joinSeat,
  setReady,
  leaveSeat,
  beginPlay,
  roles,
  type Lobby,
} from "./lobby";
import { text, errorText } from "./text";

export const position = () => {
  const saved = pudding.state.read().data.position as unknown as
    PositionState | undefined;
  return saved ? derive(saved) : initial();
};
export const lobby = () =>
  (pudding.state.read().data.lobby as unknown as Lobby) || newLobby(0);
let changing = false;
let mutation: Promise<unknown> | null = null;
async function change<T>(fn: () => Promise<T>) {
  if (changing)
    throw new Error(text("An operation is in progress", "当前操作尚未完成"));
  changing = true;
  try {
    mutation = fn();
    return (await mutation) as T;
  } catch (error) {
    if (error instanceof NotificationError) throw error;
    throw new Error(errorText(error));
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
                name: run?.participants.find((p) => p.id === id)?.name,
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
export class NotificationError extends Error {}
export async function publish(retry = false) {
  const run = pudding.interaction.read();
  if (!run) throw new Error(errorText("Connect to this game first"));
  const l = lobby(),
    p = position();
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
          : [l.seats[p.turn]];
  const previous = run.receipts.filter(
    (n) => n.id === base || n.id.startsWith(base + "-retry-"),
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
    // A receipt is immutable, including its localized text. Reuse pending work;
    // only an explicit continuation creates a fresh wake-up for ended attempts.
    const id = previous.length ? base + "-retry-" + previous.length : base;
    const color =
      p.turn === "Black"
        ? text("Black", "黑方", "黑方")
        : text("White", "白方", "白方");
    const name =
      run.participants.find((player) => player.id === l.seats[p.winner!])
        ?.name || p.winner;
    const summary =
      topic === "invitation"
        ? text(
            "Game invitation: choose a side and get ready",
            "棋局邀请：请选边并准备",
            "棋局邀請：請選邊並準備",
          )
        : topic === "result"
          ? p.winner === "draw"
            ? text("Match drawn", "本局平局", "本局和局")
            : text(
                `Match finished: ${name} wins`,
                `本局结束，${name}获胜`,
                `本局結束，${name}獲勝`,
              )
          : text(`${color} to move`, `等待${color}落子`, `等待${color}落子`);
    const message =
      topic === "invitation"
        ? text(
            "You are invited to Gomoku. Read readBoard, choose your own available Black or White seat with joinSeat, then call ready. Never act for the other player. Both ready starts a 3-second countdown; wait for your move notification before placing a stone.",
            "邀请你参加五子棋。通过 readBoard 查看局面，用 joinSeat 选择自己的空闲 Black 或 White 席位，然后调用 ready。不要替对手操作。双方准备后读秒 3 秒，收到落子通知再下棋。",
            "邀請你參加五子棋。透過 readBoard 查看局面，用 joinSeat 選擇自己的空閒 Black 或 White 席位，然後呼叫 ready。不要替對手操作。雙方準備後倒數 3 秒，收到落子通知再下棋。",
          )
        : topic === "result"
          ? text(
              `The match finished: ${p.winner}. Briefly acknowledge the result. Do not place more stones.`,
              `本局结束：${p.winner}。简短回应结果，不要再落子。`,
              `本局結束：${p.winner}。簡短回應結果，不要再落子。`,
            )
          : text(
              `${color} to move. Call placeStone with column A–O (letter) and row 1–15 (number). Row 1 is bottom. Example: {"column":"H","row":8,"comment":"Center opening"}. Add an optional comment of at most 40 characters in the same call. The current board and stateVersion are attached. Only play your own side.`,
              `轮到${color}。调用 placeStone，column 为 A–O 字母，row 为 1–15 数字，第 1 行在底部。例如 {"column":"H","row":8,"comment":"天元开局"}。同一次调用可以附带最多 40 字的弹幕。通知已附当前棋盘和 stateVersion，只能替自己落子。`,
              `輪到${color}。呼叫 placeStone，column 為 A–O 字母，row 為 1–15 數字，第 1 行在底部。例如 {"column":"H","row":8,"comment":"天元開局"}。同一次呼叫可以附帶最多 40 字的彈幕。通知已附目前棋盤和 stateVersion，只能替自己落子。`,
            );
    await pudding.interaction.notify({
      id,
      audience: p.winner
        ? { kind: "all" }
        : { kind: "selected", participantIDs: needed },
      delivery: "request-action",
      topic,
      summary,
      message,
      // Past banter remains in readBoard history; keep even a 225-move
      // notification within the host's 32 KiB limit.
      data: { ...describePosition(p, false), round: l.round, color: p.turn },
    });
  } catch (error) {
    throw new NotificationError(errorText(error));
  }
}
export const pause = async () => {
  if (!lobby().round || position().winner)
    throw new Error(errorText("No ongoing match"));
  // Pausing must not be rejected just because the last stone is publishing its
  // notification. Stop model work first, then freeze the committed position.
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
    const round = lobby().round + 1;
    const run = await pudding.interaction.connect({ sessionIDs });
    const players = run.participants
      .filter((p) => p.kind === "session" || includeMe)
      .map((p) => p.id);
    await pudding.interaction.setRequests([]);
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
    const now = Date.now();
    await save(beginPlay(lobby(), now), { ...position(), turnStartedAt: now });
    await publish();
  });
export const move = (
  input: { row: number; column: string; comment?: string },
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
      resigned: role,
      turnStartedAt: null,
    });
    await publish();
  });
function registerInterfaces() {
  return [
    pudding.defineInterface({
      name: "joinSeat",
      description: text(
        "Choose your own available Black or White seat.",
        "选择自己空闲的 Black 或 White 席位。",
        "選擇自己空閒的 Black 或 White 席位。",
      ),
      input: z.object({ role: z.enum(roles) }).strict(),
      run: (i, c) => changeSeat("join", i.role, c),
    }),
    pudding.defineInterface({
      name: "ready",
      description: text(
        "Ready your own seat; ready:false cancels readiness before play. Both ready starts a 3-second countdown.",
        "准备自己的席位；开局前 ready:false 取消准备。双方准备后读秒 3 秒。",
        "準備自己的席位；開局前 ready:false 取消準備。雙方準備後倒數 3 秒。",
      ),
      input: z.object({ ready: z.boolean().optional() }).strict(),
      run: (i, c) =>
        changeSeat(i.ready === false ? "unready" : "ready", undefined, c),
    }),
    pudding.defineInterface({
      name: "leaveSeat",
      description: text(
        "Leave your own seat before play, cancelling the countdown.",
        "开局前离开自己的席位，同时取消倒计时。",
        "開局前離開自己的席位，同時取消倒數。",
      ),
      input: z.object({}).strict(),
      run: (_, c) => changeSeat("leave", undefined, c),
    }),
    pudding.defineInterface({
      name: "placeStone",
      description: text(
        "Place your stone at a real board coordinate: column A–O (letter), row 1–15 (number, bottom to top), e.g. {column:'H',row:8}. Include an optional comment (max 40 characters).",
        "按棋盘真实坐标落子：column 为 A–O 字母列，row 为 1–15 数字行（由下向上），例如 {column:'H',row:8}。可附最多 40 字弹幕。",
        "按棋盤實際座標落子：column 為 A–O 字母欄，row 為 1–15 數字列（由下向上），例如 {column:'H',row:8}。可附最多 40 字彈幕。",
      ),
      input: z
        .object({
          row: z
            .number({ error: errorText("Use columns A–O and rows 1–15") })
            .int()
            .min(1)
            .max(15),
          column: z
            .string({ error: errorText("Use columns A–O and rows 1–15") })
            .regex(/^[A-O]$/, errorText("Use columns A–O and rows 1–15")),
          comment: z
            .string()
            .trim()
            .max(40, errorText("Keep your comment within 40 characters"))
            .optional(),
        })
        .strict(),
      run: move,
    }),
    pudding.defineInterface({
      name: "readBoard",
      description: text(
        "Read board.text, ordered history, moveCount, turn, seats, readiness, countdown and your identity. Columns A–O; rows 1–15 bottom to top.",
        "读取棋盘多行文本、history 棋谱、moveCount 手数、回合、席位、准备状态、倒计时和你的身份。字母列 A–O，数字行 1–15 由下向上。",
        "讀取棋盤多行文字、history 棋譜、moveCount 手數、回合、席位、準備狀態、倒數和你的身分。字母欄 A–O，數字列 1–15 由下向上。",
      ),
      input: z.object({}).strict(),
      run: (_, c) => readBoard(c),
    }),
    pudding.defineInterface({
      name: "resign",
      description: text(
        "Resign your own seat in the current game.",
        "以自己的席位认输。",
        "以自己的席位認輸。",
      ),
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
    // Restored countdowns start from three again; an in-game clock keeps only
    // active thinking time that was committed before the explicit pause.
    await save(
      l.phase === "countdown" ? { ...l, startsAt: Date.now() + 3000 } : l,
      l.phase === "playing" ? resumeClock(position()) : position(),
    );
    await publish(true);
  });
});
