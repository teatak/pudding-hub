import { useState } from "react";
import {
  pudding,
  useWidgetState,
  useWidgetInteraction,
  type InteractionContext,
  type JSONValue,
} from "@pudding/widget";
import { z } from "zod";
import { gestures, winner, type Gesture } from "./rules";
import { text } from "./text";
import "./style.css";
// Page state is durable but is not exposed by inspection tools. Only project the
// submitted flags until both choices are present; do not render/return secrets.
let changing = false;
function snapshot() {
  return pudding.state.read();
}
async function publish() {
  const run = pudding.interaction.read();
  if (!run || run.status !== "running")
    throw new Error("Start or resume the round");
  const state = snapshot().data,
    submitted = (state.submitted || []) as string[];
  const noticeID =
    submitted.length === 2 ? "result" : `choose-${submitted.length}`;
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
  if (submitted.length === 2) {
    const winnerName =
      run.participants.find((p) => p.roles.includes(String(state.result)))
        ?.name || state.result;
    await pudding.interaction.notify({
      id: noticeID,
      audience: { kind: "all" },
      delivery: "request-action",
      topic: "result",
      summary:
        state.result === "draw"
          ? text("Round drawn", "本轮平局")
          : text(
              `Round finished: ${winnerName} wins`,
              `本轮结束，${winnerName}获胜`,
            ),
      message: `The round has finished: ${state.result}. Briefly acknowledge the revealed result in this conversation. Do not submit another gesture.`,
      data: { result: state.result, choices: state.choices },
    });
    return;
  }
  const pending = run.participants
    .filter((p) => p.roles.some((role) => !submitted.includes(role)))
    .map((p) => p.id);
  await pudding.interaction.notify({
    id: noticeID,
    audience: { kind: "selected", participantIDs: pending },
    delivery: "request-action",
    topic: "choose",
    summary: text("Waiting for your choice", "等待出拳"),
    message:
      "Choose rock, paper or scissors for each of your unsubmitted roles (A or B). Call chooseGesture, or select your role then click a gesture. Choices are revealed together.",
  });
}
async function choose(
  input: { role: "A" | "B"; gesture: Gesture },
  context: InteractionContext,
) {
  if (changing) throw new Error("An operation is in progress");
  changing = true;
  try {
    const run = pudding.interaction.read(),
      old = snapshot();
    if (
      !run ||
      run.status !== "running" ||
      context.actor?.runID !== run.id
    )
      throw new Error("No active round for this participant");
    if (!context.actor.roles.includes(input.role))
      throw new Error("This role belongs to another participant");
    const choices=(old.data.choices || {}) as Partial<Record<"A" | "B", Gesture>>;
    if (choices[input.role]) throw new Error("This role has already submitted");
    if (context.signal.aborted) throw new Error("Cancelled");
    const next = { ...choices, [input.role]: input.gesture },
      submitted = Object.keys(next),
      finished = next.A && next.B;
    const data: Record<string, JSONValue> = finished
      ? {
          submitted,
          result: winner(next.A!, next.B!),
          choices: { A: next.A!, B: next.B! },
        }
      : { submitted, choices: next };
    await pudding.state.write({ expectedVersion: old.version, data });
    await publish();
    return {
      accepted: true,
      submitted,
      ...(finished ? { result: data.result, choices: data.choices } : {}),
    };
  } finally {
    changing = false;
  }
}
pudding.defineInterface({
  name: "chooseGesture",
  description:
    "Submit an unrevealed gesture for one of your assigned roles. Each role submits once; the result is revealed after both submit.",
  input: z
    .object({ role: z.enum(["A", "B"]), gesture: z.enum(gestures) })
    .strict(),
  run: choose,
});
pudding.interaction.onResume(async () => { if (!snapshot().data.result) await publish(); });
export default function App() {
  const state = useWidgetState(),
    run = useWidgetInteraction(),
    [role, setRole] = useState<"A" | "B">("A"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submitted = (state.data.submitted || []) as string[];
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
    await pudding.interaction.start({ roles: ["A", "B"] });
    const old = snapshot();
    await pudding.state.write({
      expectedVersion: old.version,
      data: { submitted: [], choices: {} },
    });
    await publish();
  }
  return (
    <main>
      <h1>{text("Rock Paper Scissors", "猜拳")}</h1>
      <p className="hint">
        {text(
          "Submit independently. Choices are only revealed after both players submit. Closing the page resets the round.",
          "独立出拳，双方提交后揭晓。关闭页面后本局重置。",
        )}
      </p>
      {!run ? (
        <button
          id="start"
          className="primary"
          disabled={busy}
          onClick={() => void perform(start)}
        >
          {text("Start round", "发起一局")}
        </button>
      ) : (
        <>
          <div className="players">
            {["A", "B"].map((r) => (
              <div className="player" key={r}>
                <h2>
                  {r} ·{" "}
                  {run.participants.find((p) => p.roles.includes(r))?.name}
                </h2>
                <p>
                  {submitted.includes(r)
                    ? text("Submitted", "已提交")
                    : text("Waiting", "等待提交")}
                </p>
              </div>
            ))}
          </div>
          {state.data.result ? (
            <section>
              <h2>
                {state.data.result === "draw"
                  ? text("Draw", "平局")
                  : `${state.data.result} ${text("wins", "获胜")}`}
              </h2>
              <p>
                {Object.entries(
                  (state.data.choices || {}) as Record<string, string>,
                )
                  .map(([r, c]) => `${r}: ${c}`)
                  .join(" · ")}
              </p>
            </section>
          ) : (
            <>
              <div className="toolbar" role="group" aria-label="Role">
                {(["A", "B"] as const).map((r) => (
                  <button
                    key={r}
                    aria-label={`Select role ${r}`}
                    aria-pressed={role === r}
                    onClick={() => setRole(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="choices">
                {gestures.map((g) => (
                  <button
                    key={g}
                    aria-label={`Choose ${g}`}
                    disabled={
                      busy ||
                      run.status !== "running" ||
                      submitted.includes(role)
                    }
                    onClick={() =>
                      void perform(() =>
                        pudding.interaction.handle((c) =>
                          choose({ role, gesture: g }, c),
                        ),
                      )
                    }
                  >
                    {{ rock: "✊", paper: "✋", scissors: "✌️" }[g]} {g}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
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
    </main>
  );
}
