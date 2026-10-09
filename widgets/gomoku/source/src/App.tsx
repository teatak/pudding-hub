import { useState } from "react";
import {
  pudding,
  useWidgetInteraction,
  useWidgetState,
  type InteractionContext,
  type JSONValue,
} from "@pudding/widget";
import { z } from "zod";
import { initial, place, size, describePosition, type Position } from "./rules";
import { newLobby, joinSeat, setReady, leaveSeat, type Lobby } from "./lobby";
import { LobbyControls } from "./Connections";
import { text } from "./text";
import "./style.css";
const roles = ["Black", "White"] as const;
let changing = false;
function position(): Position {
  return (
    (pudding.state.read().data.position as unknown as Position) || initial()
  );
}
function lobby(): Lobby {
  return (pudding.state.read().data.lobby as unknown as Lobby) || newLobby(0);
}
function actor(context: InteractionContext) {
  const run = pudding.interaction.read();
  const participant = run?.participants.find(
    (p) => p.id === context.actor?.participantID,
  );
  if (!run || context.actor?.runID !== run.id || !participant)
    throw new Error("Connect to this game first");
  if (context.signal.aborted) throw new Error("Cancelled");
  return participant;
}
function describeLobby(context: InteractionContext) {
  const l = lobby(), run = pudding.interaction.read();
  const self = run?.id === context.actor?.runID
    ? run?.participants.find(p => p.id === context.actor?.participantID)
    : undefined;
  return {
    round: l.round,
    phase: l.phase,
    self: self ? {
      participantID: self.id,
      name: self.name,
      seats: roles.filter(role => l.seats[role] === self.id),
      ready: l.ready.includes(self.id),
    } : null,
    seats: Object.fromEntries(roles.map(role => {
      const id = l.seats[role];
      return [role, id ? {
        participantID: id,
        name: run?.participants.find(p => p.id === id)?.name ?? null,
        ready: l.ready.includes(id),
      } : null];
    })),
  };
}
function readBoard(context: InteractionContext) {
  const l = describeLobby(context), p = position();
  const turn = l.phase === "playing" && !p.winner ? p.turn : null;
  return {
    ...l,
    ...describePosition(p),
    turn,
    yourTurn: turn !== null && Boolean(l.self?.seats.includes(turn)),
  };
}
async function save(l: Lobby, p: Position) {
  const old = pudding.state.read();
  await pudding.state.write({
    expectedVersion: old.version,
    data: {
      lobby: l as unknown as JSONValue,
      position: p as unknown as JSONValue,
    },
  });
}
async function publish() {
  const run = pudding.interaction.read();
  if (!run) throw new Error("Connect to the game first");
  const l = lobby(),
    p = position();
  const id = `round-${l.round}-${l.phase === "lobby" ? "invite" : p.winner ? "result" : "move-" + p.move}`;
  await pudding.interaction.setRequests(
    run.receipts.flatMap((n) =>
      n.id === id
        ? n.deliveries
            .filter(
              (d) =>
                d.active &&
                (l.phase !== "lobby" || !l.ready.includes(d.participantID)),
            )
            .map((d) => ({
              notificationID: n.id,
              participantID: d.participantID,
            }))
        : [],
    ),
  );
  if (l.phase === "lobby") {
    await pudding.interaction.notify({
      id,
      audience: { kind: "all" },
      delivery: "request-action",
      topic: "invitation",
      summary: text(
        "Game invitation: choose a side and get ready",
        "棋局邀请：请选边并准备",
      ),
      message:
        "You are invited to Gomoku, not assigned a side. Read readBoard or observe the page, choose an available Black or White seat via joinSeat (or click its Join button), then call ready. If both seats are taken, observe. The game starts only when both players are ready. Never choose a seat for another participant.",
    });
    return;
  }
  if (p.winner) {
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
          : text(`Match finished: ${name} wins`, `本局结束，${name}获胜`),
      message: `The match has finished: ${p.winner}. Briefly acknowledge the result. Do not place more stones.`,
      data: { winner: p.winner },
    });
    return;
  }
  await pudding.interaction.notify({
    id,
    audience: { kind: "selected", participantIDs: [l.seats[p.turn]] },
    delivery: "request-action",
    topic: "move",
    summary: text(
      `${p.turn} to move`,
      `等待${p.turn === "Black" ? "黑方" : "白方"}落子`,
    ),
    message: `${p.turn} to move. Observe the board, then click an empty cell or call placeStone with 1-based row and column.`,
    data: { move: p.move, color: p.turn },
  });
}
async function changeSeat(
  action: "join" | "ready" | "leave",
  role: string | undefined,
  context: InteractionContext,
) {
  if (changing) throw new Error("An operation is in progress");
  changing = true;
  try {
    const who = actor(context),
      old = lobby();
    const next =
      action === "join"
        ? joinSeat(old, roles, role!, who.id, who.kind === "human")
        : action === "ready"
          ? setReady(old, roles, who.id)
          : leaveSeat(old, who.id);
    await save(next, position());
    if (next.phase === "playing") await publish();
    return describeLobby(context);
  } finally {
    changing = false;
  }
}
async function move(
  input: { row: number; column: number },
  context: InteractionContext,
) {
  if (changing) throw new Error("An operation is in progress");
  changing = true;
  try {
    const who = actor(context),
      l = lobby(),
      p = position();
    if (l.phase !== "playing")
      throw new Error("Both players must choose seats and get ready");
    if (l.seats[p.turn] !== who.id) throw new Error("Not your turn");
    const next = place(p, input.row, input.column, p.turn);
    await save(l, next);
    await publish();
    return readBoard(context);
  } finally {
    changing = false;
  }
}
pudding.defineInterface({
  name: "joinSeat",
  description:
    "Choose your own available Black or White seat. Connection does not assign a seat.",
  input: z.object({ role: z.enum(roles) }).strict(),
  run: (input, context) => changeSeat("join", input.role, context),
});
pudding.defineInterface({
  name: "ready",
  description:
    "Mark your own seat ready. Both sides must be ready before playing.",
  input: z.object({}).strict(),
  run: (_, context) => changeSeat("ready", undefined, context),
});
pudding.defineInterface({
  name: "leaveSeat",
  description:
    "Leave your seat before the game starts; your conversation stays connected.",
  input: z.object({}).strict(),
  run: (_, context) => changeSeat("leave", undefined, context),
});
pudding.defineInterface({
  name: "placeStone",
  description:
    "Place a stone at 1-based coordinates. The widget checks your seat and turn.",
  input: z
    .object({
      row: z.number().int().min(1).max(15),
      column: z.number().int().min(1).max(15),
    })
    .strict(),
  run: move,
});
pudding.defineInterface({
  name: "readBoard",
  description:
    "Read a coordinate-labelled 15×15 board (. empty, B Black, W White), stone coordinates, last move, named seats and your own identity/turn. All row/column coordinates are 1-based.",
  input: z.object({}).strict(),
  run: (_, context) => readBoard(context),
});
pudding.interaction.onResume(async () => {
  if (!position().winner) await publish();
});
export default function App() {
  useWidgetState();
  const run = useWidgetInteraction(),
    p = position(),
    l = lobby();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function perform(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function start(sessionIDs: string[]) {
    await pudding.interaction.connect({ sessionIDs });
    await save(newLobby(lobby().round + 1), initial());
    if (pudding.interaction.read()?.status === "paused")
      await pudding.interaction.resume();
    else await publish();
  }
  const human = run?.participants.find((p) => p.kind === "human");
  return (
    <main>
      <h1>{text("Gomoku", "五子棋")}</h1>
      <p className="hint">
        {text(
          "Choose sides, get ready, then connect five stones to win. Closing the tab ends this board.",
          "选边并准备后开局，连成五子获胜。关闭标签页后本局重置。",
        )}
      </p>
      <LobbyControls
        run={run}
        lobby={l}
        roles={roles}
        busy={busy}
        perform={perform}
        start={start}
        act={(a, r) => pudding.interaction.handle((c) => changeSeat(a, r, c))}
      />
      {l.phase === "playing" && (
        <p>
          {p.winner
            ? `${p.winner} ${text("wins", "获胜")}`
            : `${p.turn} · ${text("Move", "步数")} ${p.move + 1}`}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}{" "}
          <button onClick={() => void perform(publish)}>
            {text("Retry notification", "重试通知")}
          </button>
        </p>
      )}
      <div className="board" role="group" aria-label="Gomoku board">
        {p.board.map((stone, index) => (
          <button
            key={index}
            data-row={Math.floor(index / size) + 1}
            data-column={(index % size) + 1}
            aria-label={`Row ${Math.floor(index / size) + 1} Column ${(index % size) + 1}: ${stone === 1 ? "Black" : stone === 2 ? "White" : "empty"}`}
            className={p.last === index ? "last" : ""}
            disabled={
              busy || !run || l.phase !== "playing" || !!p.winner || !!stone
            }
            onClick={() =>
              void perform(() =>
                pudding.interaction.handle((c) =>
                  move(
                    {
                      row: Math.floor(index / size) + 1,
                      column: (index % size) + 1,
                    },
                    c,
                  ),
                ),
              )
            }
          >
            {stone ? (
              <span className={`stone ${stone === 1 ? "black" : "white"}`} />
            ) : null}
          </button>
        ))}
      </div>
      {run &&
        l.phase === "playing" &&
        human?.id !== l.seats[p.turn] &&
        !p.winner && (
          <p className="hint">
            {text("Waiting for the other participant.", "等待对方落子。")}
          </p>
        )}
    </main>
  );
}
