import { useState } from "react";
import {
  pudding,
  useWidgetInteraction,
  useWidgetState,
  type InteractionContext,
} from "@pudding/widget";
import { z } from "zod";
import { initial, place, size, type Position } from "./rules";
import { text } from "./text";
import "./style.css";
let changing = false;
function position(): Position {
  return (
    (pudding.state.read().data.position as unknown as Position) || initial()
  );
}
async function publish() {
  const run = pudding.interaction.read();
  if (!run || run.status !== "running")
    throw new Error("Start or resume the match");
  const p = position(),
    noticeID = p.winner ? "result-" + p.move : "move-" + p.move;
  await pudding.interaction.setRequests(
    run.receipts.flatMap((n) =>
      n.id === noticeID
        ? n.deliveries
            .filter((d) => d.active)
            .map((d) => ({
              notificationID: n.id,
              participantID: d.participantID,
            }))
        : [],
    ),
  );
  if (p.winner) {
    const winnerName =
      run.participants.find((player) => player.roles.includes(p.winner!))
        ?.name || p.winner;
    await pudding.interaction.notify({
      id: `result-${p.move}`,
      audience: { kind: "all" },
      delivery: "request-action",
      topic: "result",
      summary:
        p.winner === "draw"
          ? text("Match drawn", "本局平局")
          : text(
              `Match finished: ${winnerName} wins`,
              `本局结束，${winnerName}获胜`,
            ),
      message: `The match has finished: ${p.winner}. Briefly acknowledge the result in this conversation. Do not place any more stones.`,
      data: { winner: p.winner },
    });
    return;
  }
  const player = run.participants.find((p) =>
    p.roles.includes(position().turn),
  );
  if (!player) throw new Error("Missing participant");
  await pudding.interaction.notify({
    id: `move-${p.move}`,
    audience: { kind: "selected", participantIDs: [player.id] },
    delivery: "request-action",
    topic: "move",
    summary: text(
      `${p.turn} to move`,
      `等待${p.turn === "Black" ? "黑方" : "白方"}落子`,
    ),
    message: `${p.turn} to move. Observe the current board, then click an empty cell or call placeStone with 1-based row and column.`,
    data: { move: p.move, color: p.turn },
  });
}
async function move(
  input: { row: number; column: number },
  context: InteractionContext,
) {
  if (changing) throw new Error("An operation is in progress");
  changing = true;
  try {
    const run = pudding.interaction.read(),
      p = position(),
      old = pudding.state.read();
    if (
      !run ||
      run.status !== "running" ||
      context.actor?.runID !== run.id
    )
      throw new Error("No active match for this participant");
    if (!context.actor.roles.includes(p.turn)) throw new Error("Not your turn");
    if (context.signal.aborted) throw new Error("Cancelled");
    const next = place(p, input.row, input.column, p.turn);
    await pudding.state.write({
      expectedVersion: old.version,
      data: { position: { ...next } },
    });
    await publish();
    return next;
  } finally {
    changing = false;
  }
}
pudding.defineInterface({
  name: "placeStone",
  description:
    "Place a stone on an empty cell. Coordinates are 1-based; your role and turn are checked by the widget.",
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
  description: "Read the full 15 by 15 board: 0 empty, 1 black, 2 white.",
  input: z.object({}).strict(),
  run: () => position(),
});
pudding.interaction.onResume(async () => { if (!position().winner) await publish(); });
export default function App() {
  useWidgetState();
  const run = useWidgetInteraction(),
    p = position(),
    [error, setError] = useState(""),
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
  async function start() {
    await pudding.interaction.start({ roles: ["Black", "White"] });
    const old = pudding.state.read();
    await pudding.state.write({
      expectedVersion: old.version,
      data: { position: { ...initial() } },
    });
    await publish();
  }
  const human = run?.participants.find((p) => p.kind === "human"),
    humanTurn = !!human?.roles.includes(p.turn);
  return (
    <main>
      <h1>{text("Gomoku", "五子棋")}</h1>
      <p className="hint">
        {text(
          "Five in a row wins. This match resets when the page closes.",
          "连成五子获胜。关闭页面后本局重置。",
        )}
      </p>
      <div className="toolbar">
        {!run ? (
          <button
            id="start"
            className="primary"
            disabled={busy}
            onClick={() => void perform(start)}
          >
            {text("Start match", "发起棋局")}
          </button>
        ) : (
          <strong>
            {p.winner
              ? `${p.winner === "draw" ? text("Draw", "平局") : p.winner + " " + text("wins", "获胜")}`
              : `${p.turn} · ${text("Move", "步数")} ${p.move + 1}`}
          </strong>
        )}
        {run?.participants.map((player) => (
          <span key={player.id}>
            {player.roles.join("/")} · {player.name}
          </span>
        ))}
      </div>
      {error ? (
        <p role="alert" className="error">
          {error}{" "}
          {run?.status === "running" ? (
            <button onClick={() => void perform(publish)}>
              {text("Retry notification", "重试通知")}
            </button>
          ) : null}
        </p>
      ) : null}
      <div className="board" role="group" aria-label="Gomoku board">
        {p.board.map((stone, index) => (
          <button
            key={index}
            data-row={Math.floor(index / size) + 1}
            data-column={(index % size) + 1}
            aria-label={`Row ${Math.floor(index / size) + 1} Column ${(index % size) + 1}: ${stone === 1 ? "Black" : stone === 2 ? "White" : "empty"}`}
            className={p.last === index ? "last" : ""}
            disabled={
              busy || !run || run.status !== "running" || !!p.winner || !!stone
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
      {run && human && !humanTurn && !p.winner ? (
        <p className="hint">
          {text("Waiting for the other participant.", "等待对方落子。")}
        </p>
      ) : null}
    </main>
  );
}
