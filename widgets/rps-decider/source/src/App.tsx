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
import { newLobby, joinSeat, setReady, leaveSeat, type Lobby } from "./lobby";
import { LobbyControls } from "./Connections";
import { text } from "./text";
import "./style.css";
const roles = ["A", "B"] as const;
let changing = false;
function lobby(): Lobby {
  return (pudding.state.read().data.lobby as unknown as Lobby) || newLobby(0);
}
function actor(context: InteractionContext) {
  const run = pudding.interaction.read(),
    who = run?.participants.find((p) => p.id === context.actor?.participantID);
  if (!run || context.actor?.runID !== run.id || !who)
    throw new Error("Connect to this round first");
  if (context.signal.aborted) throw new Error("Cancelled");
  return who;
}
// Hidden choices stay in page state; interfaces/DOM expose only submission flags
// until both gestures are committed.
function view() {
  const data = pudding.state.read().data;
  return {
    lobby: lobby(),
    submitted: data.submitted || [],
    ...(data.result ? { result: data.result, choices: data.choices } : {}),
  };
}
async function publish() {
  const run = pudding.interaction.read();
  if (!run) throw new Error("Connect to the round first");
  const data = pudding.state.read().data,
    l = lobby(),
    submitted = (data.submitted || []) as string[];
  const id = `round-${l.round}-${l.phase === "lobby" ? "invite" : data.result ? "result" : "choose-" + submitted.length}`;
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
        "Round invitation: choose a seat and get ready",
        "猜拳邀请：请选边并准备",
      ),
      message:
        "You are invited to Rock Paper Scissors, not assigned a seat. Read readRound or observe the page, choose an available A or B seat via joinSeat (or its Join button), then call ready. If both seats are taken, observe. The round starts only when both players are ready. Never choose a seat for someone else.",
    });
    return;
  }
  if (data.result) {
    const name =
      run.participants.find((p) => p.id === l.seats[String(data.result)])
        ?.name || data.result;
    await pudding.interaction.notify({
      id,
      audience: { kind: "all" },
      delivery: "request-action",
      topic: "result",
      summary:
        data.result === "draw"
          ? text("Round drawn", "本轮平局")
          : text(`Round finished: ${name} wins`, `本轮结束，${name}获胜`),
      message: `The round has finished: ${data.result}. Briefly acknowledge the revealed result. Do not submit another gesture.`,
      data: { result: data.result, choices: data.choices },
    });
    return;
  }
  await pudding.interaction.notify({
    id,
    audience: {
      kind: "selected",
      participantIDs: [
        ...new Set(
          roles.filter((r) => !submitted.includes(r)).map((r) => l.seats[r]),
        ),
      ],
    },
    delivery: "request-action",
    topic: "choose",
    summary: text("Waiting for your choice", "等待出拳"),
    message:
      "Choose rock, paper or scissors for your seated role (A or B). Call chooseGesture, or select your role and click a gesture. Choices are revealed only after both submit.",
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
      old = pudding.state.read(),
      l = lobby();
    const next =
      action === "join"
        ? joinSeat(l, roles, role!, who.id, who.kind === "human")
        : action === "ready"
          ? setReady(l, roles, who.id)
          : leaveSeat(l, who.id);
    await pudding.state.write({
      expectedVersion: old.version,
      data: { ...old.data, lobby: next as unknown as JSONValue },
    });
    if (next.phase === "playing") await publish();
    return next;
  } finally {
    changing = false;
  }
}
async function choose(
  input: { role: "A" | "B"; gesture: Gesture },
  context: InteractionContext,
) {
  if (changing) throw new Error("An operation is in progress");
  changing = true;
  try {
    const who = actor(context),
      old = pudding.state.read(),
      l = lobby();
    if (l.phase !== "playing")
      throw new Error("Both players must choose seats and get ready");
    if (l.seats[input.role] !== who.id)
      throw new Error("This seat belongs to another participant");
    const choices = (old.data.choices || {}) as Partial<
      Record<"A" | "B", Gesture>
    >;
    if (choices[input.role]) throw new Error("This seat has already submitted");
    const next = { ...choices, [input.role]: input.gesture },
      submitted = Object.keys(next);
    const data = {
      ...old.data,
      submitted,
      choices: next,
      ...(next.A && next.B ? { result: winner(next.A, next.B) } : {}),
    };
    await pudding.state.write({ expectedVersion: old.version, data });
    await publish();
    return view();
  } finally {
    changing = false;
  }
}
pudding.defineInterface({
  name: "joinSeat",
  description:
    "Choose your own available A or B seat. Connection does not assign a seat.",
  input: z.object({ role: z.enum(roles) }).strict(),
  run: (input, context) => changeSeat("join", input.role, context),
});
pudding.defineInterface({
  name: "ready",
  description:
    "Mark your own seat ready. Both players must be ready before submitting gestures.",
  input: z.object({}).strict(),
  run: (_, context) => changeSeat("ready", undefined, context),
});
pudding.defineInterface({
  name: "leaveSeat",
  description:
    "Leave your seat before play; your conversation stays connected.",
  input: z.object({}).strict(),
  run: (_, context) => changeSeat("leave", undefined, context),
});
pudding.defineInterface({
  name: "readRound",
  description:
    "Read seats, readiness and submitted flags. Choices are returned only after both submit.",
  input: z.object({}).strict(),
  run: view,
});
pudding.defineInterface({
  name: "chooseGesture",
  description:
    "Submit a private gesture for your own seat once both players are ready.",
  input: z.object({ role: z.enum(roles), gesture: z.enum(gestures) }).strict(),
  run: choose,
});
pudding.interaction.onResume(async () => {
  if (!pudding.state.read().data.result) await publish();
});
export default function App() {
  const state = useWidgetState(),
    run = useWidgetInteraction(),
    l = lobby();
  const [role, setRole] = useState<"A" | "B">("A"),
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
  async function start(sessionIDs: string[]) {
    await pudding.interaction.connect({ sessionIDs });
    const old = pudding.state.read();
    await pudding.state.write({
      expectedVersion: old.version,
      data: {
        lobby: newLobby(lobby().round + 1) as unknown as JSONValue,
        submitted: [],
        choices: {},
      },
    });
    if (pudding.interaction.read()?.status === "paused")
      await pudding.interaction.resume();
    else await publish();
  }
  return (
    <main>
      <h1>{text("Rock Paper Scissors", "猜拳")}</h1>
      <p className="hint">
        {text(
          "Choose seats and get ready, then submit independently. Both choices are revealed together.",
          "选边并准备后独立出拳，双方提交后共同揭晓。",
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
        <>
          <div className="players">
            {roles.map((r) => (
              <div className="player" data-submitted={r} key={r}>
                <h2>{r}</h2>
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
                {Object.entries(state.data.choices as Record<string, string>)
                  .map(([r, c]) => `${r}: ${c}`)
                  .join(" · ")}
              </p>
            </section>
          ) : (
            <>
              <div className="toolbar" role="group" aria-label="Role">
                {roles.map((r) => (
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
                    disabled={busy || !run || submitted.includes(role)}
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
      {error && (
        <p role="alert" className="error">
          {error}{" "}
          <button onClick={() => void perform(publish)}>
            {text("Retry notification", "重试通知")}
          </button>
        </p>
      )}
    </main>
  );
}
