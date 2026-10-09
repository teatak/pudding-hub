import { useEffect, useState } from "react";
import { pudding, type WidgetRun } from "@pudding/widget";
import type { Lobby } from "./lobby";
import { text } from "./text";

type Candidates = Awaited<ReturnType<typeof pudding.interaction.candidates>>;
export function LobbyControls({
  run,
  lobby,
  roles,
  busy,
  perform,
  start,
  act,
}: {
  run: WidgetRun | null;
  lobby: Lobby;
  roles: readonly string[];
  busy: boolean;
  perform: (fn: () => Promise<unknown>) => Promise<void>;
  start: (ids: string[]) => Promise<unknown>;
  act: (action: "join" | "ready" | "leave", role?: string) => Promise<unknown>;
}) {
  const [candidates, setCandidates] = useState<Candidates | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    pudding.interaction
      .candidates()
      .then((value) => {
        if (!live) return;
        setCandidates(value);
        setSelected(value.connectedSessionIDs ?? value.preferredSessionIDs);
      })
      .catch((e) => {
        if (live) setError(String(e));
      });
    return () => {
      live = false;
    };
  }, []);
  return (
    <div className="lobby">
      <details open={!run}>
        <summary>{text("Conversations", "连接会话")}</summary>
        <p className="hint">
          {text(
            "Invite conversations; players choose their own seats. You can also play locally.",
            "邀请会话后，由参与者自行选边和准备。也可以直接在这里双人对弈。",
          )}
        </p>
        <div id="connections">
          {candidates?.sessions.map((session) => (
            <label key={session.id}>
              <input
                type="checkbox"
                data-session={session.id}
                checked={selected.includes(session.id)}
                disabled={
                  busy ||
                  (!selected.includes(session.id) &&
                    selected.length >= candidates.maxSessions)
                }
                onChange={(e) =>
                  setSelected((ids) =>
                    e.target.checked
                      ? [...ids, session.id]
                      : ids.filter((id) => id !== session.id),
                  )
                }
              />
              {session.name}
            </label>
          ))}
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button
          id="start"
          className="primary"
          disabled={busy || !candidates}
          onClick={() => void perform(() => start(selected))}
        >
          {run
            ? text("New round with these conversations", "用所选会话发起新一局")
            : text("Invite players", "发起邀请")}
        </button>
      </details>
      {run && (
        <>
          {run.status === "paused" && (
            <button
              id="resume"
              disabled={busy}
              onClick={() => void perform(() => pudding.interaction.resume())}
            >
              {text("Continue conversation participation", "继续会话参与")}
            </button>
          )}
          <div className="players">
            {roles.map((role) => {
              const id = lobby.seats[role],
                player = run.participants.find((p) => p.id === id);
              return (
                <div className="player" key={role}>
                  <strong>
                    {role} ·{" "}
                    {player
                      ? player.kind === "human"
                        ? text("You", "我")
                        : player.name
                      : text("Open seat", "空位")}
                  </strong>
                  <p>
                    {id
                      ? lobby.ready.includes(id)
                        ? text("Ready", "已准备")
                        : text("Not ready", "未准备")
                      : text("Choose a seat to join", "选边后加入")}
                  </p>
                  {lobby.phase === "lobby" && (
                    <button
                      data-seat={role}
                      disabled={busy}
                      onClick={() => void perform(() => act("join", role))}
                    >
                      {text("Join", "落座")} {role}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {lobby.phase === "lobby" && (
            <div className="toolbar">
              <button
                id="ready"
                disabled={busy}
                onClick={() => void perform(() => act("ready"))}
              >
                {text("Ready", "准备")}
              </button>
              <button
                id="leave"
                disabled={busy}
                onClick={() => void perform(() => act("leave"))}
              >
                {text("Leave seat", "离座")}
              </button>
              <span className="hint">
                {text(
                  "The game starts when both seats are ready.",
                  "双方落座并准备后开始。",
                )}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
