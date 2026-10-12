import { useEffect, useRef, useState } from "react";
import {
  pudding,
  useWidgetInteraction,
  useWidgetState,
  useWidgetLocale,
  type SessionCandidate,
} from "@pudding/widget";
import {
  Check,
  MessageSquareOff,
  MessagesSquare,
  Play,
  Pause,
  Swords,
  UserRound,
} from "lucide-react";
import { roles } from "./lobby";
import { size, letters, thinkingMS, winningLine, type Color } from "./rules";
import {
  changeSeat,
  finishCountdown,
  lobby,
  move,
  NotificationError,
  position,
  pause,
  publish,
  resign,
  start,
} from "./game";
import { t, errorText } from "./text";
import "./style.css";

type Candidates = Awaited<ReturnType<typeof pudding.interaction.candidates>>;
type Player = {
  id: string;
  name: string;
  human: boolean;
  model?: SessionCandidate["model"];
};
const me = "@me";
const sideName = (role: Color) =>
  role === "Black" ? t("sideBlackFirst") : t("sideWhiteSecond");
const elapsedTime = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return (
    String(Math.floor(seconds / 60)).padStart(2, "0") +
    ":" +
    String(seconds % 60).padStart(2, "0")
  );
};
function Comment({
  text: comment,
  moveNumber,
}: {
  text: string;
  moveNumber: number;
}) {
  return (
    <>
      <span className="gd-speech-prefix">
        {t("commentPrefix", { number: moveNumber })}
      </span>
      {comment}
    </>
  );
}
function Avatar({ player }: { player?: Player }) {
  return (
    <span className="gd-avatar">
      {player?.human ? (
        <UserRound size={22} />
      ) : player?.model ? (
        <img src={player.model.icon} alt="" />
      ) : (
        <Swords size={20} />
      )}
    </span>
  );
}
export default function App() {
  useWidgetState();
  useWidgetLocale();
  const run = useWidgetInteraction(),
    p = position(),
    l = lobby();
  const [candidates, setCandidates] = useState<Candidates | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{
    message: string;
    retry?: "candidates" | "notification";
  } | null>(null);
  const [danmaku, setDanmaku] = useState(true),
    [draft, setDraft] = useState("");
  const [now, setNow] = useState(Date.now());
  const members = run?.participants.map((p) => p.id).join(",") || "";
  const human = run?.participants.find((p) => p.kind === "human");
  const humanRole = human && roles.find((role) => l.seats[role] === human.id);
  const myTurn =
    run?.status === "running" &&
    !!humanRole &&
    l.phase === "playing" &&
    !p.winner &&
    p.turn === humanRole;
  async function perform(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError({
        message: errorText(e),
        retry: e instanceof NotificationError ? "notification" : undefined,
      });
    } finally {
      setBusy(false);
    }
  }
  async function loadCandidates(isLive = () => true) {
    try {
      const value = await pudding.interaction.candidates();
      if (!isLive()) return;
      setCandidates(value);
      if (!lobby().round)
        setSelected(
          (value.connectedSessionIDs ?? value.preferredSessionIDs).slice(0, 2),
        );
    } catch (e) {
      if (isLive()) setError({ message: String(e), retry: "candidates" });
    }
  }
  useEffect(() => {
    let live = true;
    void loadCandidates(() => live);
    return () => {
      live = false;
    };
  }, [members, l.round]);
  useEffect(() => {
    if (
      l.phase !== "countdown" ||
      l.startsAt === null ||
      run?.status !== "running"
    )
      return;
    setNow(Date.now());
    const clock = setInterval(() => setNow(Date.now()), 100);
    const startTimer = setTimeout(
      () => void perform(finishCountdown),
      Math.max(0, l.startsAt - Date.now()),
    );
    return () => {
      clearInterval(clock);
      clearTimeout(startTimer);
    };
  }, [l.phase, l.startsAt, run?.status]);
  useEffect(() => {
    if (l.phase !== "playing" || p.winner || run?.status !== "running") return;
    setNow(Date.now());
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, [l.phase, p.turnStartedAt, p.winner, run?.status]);
  const chosenPlayer = (id: string): Player | undefined => {
    if (id === me)
      return {
        id,
        name: t("playOnBoard"),
        human: true,
      };
    const candidate = candidates?.sessions.find((s) => s.id === id);
    return candidate
      ? { id, name: candidate.name, human: false, model: candidate.model }
      : undefined;
  };
  const players = l.round
    ? l.players.map((id) => {
        const participant = run?.participants.find((p) => p.id === id);
        return participant
          ? {
              id,
              name:
                participant.kind === "human"
                  ? t("playOnBoard")
                  : participant.name,
              human: participant.kind === "human",
              model: candidates?.sessions.find((s) => s.participantID === id)
                ?.model,
            }
          : undefined;
      })
    : selected.map(chosenPlayer);
  const act = (action: "join" | "ready" | "unready" | "leave", role?: string) =>
    perform(() =>
      pudding.interaction.handle((c) => changeSeat(action, role, c)),
    );
  function openRound() {
    const choice = l.round
      ? l.players.flatMap((id) =>
          id === human?.id
            ? [me]
            : candidates!.sessions
                .filter((s) => s.participantID === id)
                .map((s) => s.id),
        )
      : selected;
    if (choice.length !== 2) {
      setSelected(choice);
      setPicker(true);
      return;
    }
    void perform(() =>
      start(
        choice.filter((id) => id !== me),
        choice.includes(me),
      ),
    );
  }
  const title =
    run?.status === "paused"
      ? t("gamePaused")
      : !l.round
        ? t("waitingToStart")
        : p.winner
          ? p.winner === "draw"
            ? t("draw")
            : t("winnerNotice", {
                winner:
                  p.winner === "Black" ? t("colorBlack") : t("colorWhite"),
              })
          : l.phase === "countdown"
            ? t("startingSoon")
            : l.phase === "lobby"
              ? t("waitingForPlayers")
              : t("turnToMove", {
                  color:
                    p.turn === "Black" ? t("colorBlack") : t("colorWhite"),
                });
  const line = winningLine(p);
  return (
    <main className="gd-product">
      <div className="gd-content">
        <header className="gd-gamebar">
          <div className="gd-game-title">
            <strong aria-live="polite">{title}</strong>
            <small>
              {t("roundDetail", {
                round: l.round || 1,
                detail: p.moveCount
                  ? t("movesCount", { count: p.moveCount })
                  : t("freestyleRule"),
              })}
            </small>
          </div>
          <div className="gd-game-actions">
            <button
              className="gd-button gd-danmaku-toggle"
              aria-label={t("toggleComments")}
              aria-pressed={danmaku}
              onClick={() => setDanmaku((v) => !v)}
            >
              {danmaku ? (
                <MessagesSquare size={16} />
              ) : (
                <MessageSquareOff size={16} />
              )}
            </button>
            {run?.status === "paused" && (
              <button
                className="gd-button is-primary gd-main-action"
                disabled={busy}
                id="resume"
                onClick={() => void perform(() => pudding.interaction.resume())}
              >
                <Play size={14} />
                {t("continueGame")}
              </button>
            )}
            {run?.status === "running" && !!l.round && !p.winner && (
              <button
                className="gd-button gd-main-action"
                disabled={busy}
                id="pause"
                onClick={() => void perform(pause)}
              >
                <Pause size={14} />
                {t("pauseGame")}
              </button>
            )}
            {(!l.round || p.winner || run?.status === "paused") && (
              <button
                className="gd-button gd-main-action"
                id="start"
                disabled={busy || !candidates}
                onClick={openRound}
              >
                <Play size={14} />
                {!l.round
                  ? t("play")
                  : run?.status === "paused"
                    ? t("newGame")
                    : t("rematch")}
              </button>
            )}
          </div>
        </header>
        {error && (
          <div className="gd-alert" role="alert">
            <span>{error.message}</span>
            {error.retry && (
              <button
                className="gd-button"
                disabled={busy}
                onClick={() =>
                  void perform(
                    error.retry === "candidates"
                      ? () => loadCandidates()
                      : publish,
                  )
                }
              >
                {t("retry")}
              </button>
            )}
            <button
              className="gd-button is-text"
              onClick={() => setError(null)}
            >
              {t("dismiss")}
            </button>
          </div>
        )}
        <div className="gd-arena">
          <section
            className="gd-players"
            aria-label={t("playersSection")}
          >
            {[0, 1].map((index) => {
              const player = players[index],
                role = player && roles.find((r) => l.seats[r] === player.id),
                ready = !!player && l.ready.includes(player.id);
              const turn =
                l.phase === "playing" && !p.winner && role === p.turn;
              const quote = role && danmaku ? p.comments[role] : undefined;
              const status = !l.round
                ? t("notInvited")
                : p.winner
                  ? p.winner === role
                    ? t("statusWinner")
                    : t("statusFinished")
                  : run?.status === "paused"
                    ? t("statusPaused")
                    : turn
                      ? t("statusThinking")
                      : l.phase === "playing"
                        ? t("statusWaiting")
                        : ready
                          ? t("statusReady")
                          : role
                            ? t("statusNotReady")
                            : t("statusChoosing");
              const openingHint = run?.status === "paused"
                ? t("hintPaused")
                : l.phase === "countdown"
                  ? t("hintBothReady")
                  : ready
                    ? t("hintWaitingOpponent")
                    : role
                      ? t("hintWaitingReadiness")
                      : t("hintWaitingSide");
              return (
                <article
                  className={
                    "gd-player" +
                    (turn && run?.status === "running" ? " is-turn" : "")
                  }
                  key={index}
                  data-player-id={player?.id || ""}
                >
                  <div className="gd-player-head">
                    <Avatar player={player} />
                    <div className="gd-player-identity">
                      <strong
                        className="gd-player-name"
                        title={player?.model?.name}
                      >
                        {player?.human
                          ? t("you")
                          : player?.model?.name ||
                            (player ? t("loadingModel") : t("choosePlayer"))}
                      </strong>
                      <small title={player?.name}>
                        {player?.name || t("conversationOrYou")}
                      </small>
                    </div>
                  </div>
                  <div className="gd-player-top">
                    <span className="gd-side-badge">
                      <span
                        className={
                          "gd-color-dot " +
                          (role ? "gd-" + role.toLowerCase() : "gd-undecided")
                        }
                      />
                      {role ? sideName(role) : t("statusUndecided")}
                    </span>
                    <span
                      className={
                        "gd-player-status" + (ready ? " is-ready" : "")
                      }
                    >
                      {player ? status : t("statusOpen")}
                      {turn &&
                        (p.turnStartedAt !== null || p.turnElapsedMS > 0) && (
                          <time
                            className="gd-think-time"
                            aria-label={t("thinkingTime")}
                          >
                            {elapsedTime(thinkingMS(p, now))}
                          </time>
                        )}
                    </span>
                  </div>
                  <div className="gd-card-body">
                    {player?.human && l.round && l.phase !== "playing" ? (
                      <div className="gd-card-wait">
                        <small>{openingHint}</small>
                        <div className="gd-player-actions">
                          {!role ? (
                            roles.map((r) => (
                              <button
                                className="gd-button"
                                key={r}
                                data-seat={r}
                                disabled={
                                  busy ||
                                  run?.status !== "running" ||
                                  !!l.seats[r]
                                }
                                onClick={() => void act("join", r)}
                              >
                                {r === "Black" ? t("chooseBlack") : t("chooseWhite")}
                              </button>
                            ))
                          ) : (
                            <>
                              <button
                                className={
                                  "gd-button" + (!ready ? " is-primary" : "")
                                }
                                id="ready"
                                disabled={busy || run?.status !== "running"}
                                onClick={() =>
                                  void act(ready ? "unready" : "ready")
                                }
                              >
                                {ready ? t("actionCancelReady") : t("actionReady")}
                              </button>
                              <button
                                className="gd-button is-text"
                                disabled={busy || run?.status !== "running"}
                                id="leave"
                                onClick={() => void act("leave")}
                              >
                                {t("actionLeave")}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : player?.human && l.phase === "playing" && !p.winner ? (
                      <div className="gd-human-body">
                        <p
                          className="gd-human-last"
                          title={quote?.text}
                          data-speech-move={
                            quote?.text ? quote.moveNumber : undefined
                          }
                        >
                          {quote?.text ? (
                            <Comment {...quote} />
                          ) : (
                            t("commentHint")
                          )}
                        </p>
                        <label className="gd-comment-compose">
                          <input
                            data-comment
                            aria-label={t("commentAria")}
                            maxLength={40}
                            value={draft}
                            disabled={busy || !myTurn}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder={t("commentPlaceholder")}
                          />
                        </label>
                      </div>
                    ) : quote?.text ? (
                      <div
                        className="gd-speech is-new"
                        key={quote.moveNumber}
                        data-speech-move={quote.moveNumber}
                      >
                        <span className="gd-speech-text" title={quote.text}>
                          <Comment {...quote} />
                        </span>
                      </div>
                    ) : (
                      <div className="gd-card-wait">
                        {ready && l.phase !== "playing" ? (
                          <Check size={18} />
                        ) : (
                          <Swords size={18} />
                        )}
                        <span>
                          {!player
                            ? t("cardChooseFallback")
                            : !l.round
                              ? t("cardInviteOnStart")
                              : l.phase !== "playing"
                                ? openingHint
                                : !danmaku
                                  ? t("cardCommentsOff")
                                  : p.winner
                                    ? t("cardMatchComplete")
                                    : t("cardLeaveComment")}
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
          <section className="gd-board-area" aria-label={t("boardSectionAria")}>
            <div className="gd-board-wrap">
              <div
                className="gd-wood"
                role="group"
                aria-label={t("boardAria")}
              >
                <svg
                  className="gd-grid"
                  viewBox="0 0 1000 1000"
                  aria-hidden="true"
                >
                  {Array.from({ length: size }, (_, i) => (
                    <g key={i}>
                      <line
                        x1="80"
                        x2="920"
                        y1={80 + i * 60}
                        y2={80 + i * 60}
                      />
                      <line
                        y1="80"
                        y2="920"
                        x1={80 + i * 60}
                        x2={80 + i * 60}
                      />
                    </g>
                  ))}
                  {[
                    [3, 3],
                    [3, 11],
                    [7, 7],
                    [11, 3],
                    [11, 11],
                  ].map(([r, c]) => (
                    <circle
                      key={r + "-" + c}
                      cx={80 + c * 60}
                      cy={80 + r * 60}
                      r="5"
                    />
                  ))}
                </svg>
                <div className="gd-letters" aria-hidden="true">
                  {[...letters].map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
                <div className="gd-numbers" aria-hidden="true">
                  {Array.from({ length: size }, (_, i) => (
                    <span key={i}>{size - i}</span>
                  ))}
                </div>
                {p.board.map((stone, index) => {
                  const row = Math.floor(index / size) + 1,
                    column = (index % size) + 1;
                  return (
                    <button
                      key={index}
                      className="gd-spot"
                      data-row={row}
                      data-column={letters[column - 1]}
                      style={{
                        left: 8 + (column - 1) * 6 + "%",
                        bottom: 8 + (row - 1) * 6 + "%",
                      }}
                      aria-label={
                        letters[column - 1] +
                        row +
                        " · " +
                        (stone === 1
                          ? t("stoneBlack")
                          : stone === 2
                            ? t("stoneWhite")
                            : t("stoneEmpty"))
                      }
                      disabled={busy || !myTurn || !!stone}
                      onClick={() =>
                        void perform(async () => {
                          const previous = position().moveCount;
                          try {
                            await pudding.interaction.handle((c) =>
                              move(
                                {
                                  row,
                                  column: letters[column - 1],
                                  comment: draft,
                                },
                                c,
                              ),
                            );
                          } finally {
                            if (position().moveCount > previous) setDraft("");
                          }
                        })
                      }
                    >
                      {!!stone && (
                        <span
                          className={
                            "gd-stone gd-" +
                            (stone === 1 ? "black" : "white") +
                            (p.last === index ? " is-last" : "") +
                            (line.includes(index) ? " is-win" : "")
                          }
                        />
                      )}
                    </button>
                  );
                })}
                {l.phase === "countdown" && run?.status === "running" && (
                  <div className="gd-overlay" aria-live="polite">
                    <span>{t("overlayBothReady")}</span>
                    <strong>
                      {Math.max(
                        1,
                        Math.ceil(((l.startsAt || now) - now) / 1000),
                      )}
                    </strong>
                    <span>{t("overlayBlackFirst")}</span>
                    {humanRole && (
                      <button
                        className="gd-button"
                        disabled={busy}
                        onClick={() => void act("unready")}
                      >
                        {t("actionCancelReady")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <footer className="gd-board-footer">
              <p>
                {!l.round
                  ? selected.length === 2
                    ? t("footerInviteDirect")
                    : t("footerChooseMissing")
                  : p.winner
                    ? t("footerMatchRetained")
                    : myTurn
                      ? t("footerYourTurn")
                      : t("footerWatching")}
              </p>
              {humanRole && l.phase === "playing" && !p.winner && (
                <button
                  className="gd-button is-text"
                  disabled={busy || run?.status !== "running"}
                  onClick={() =>
                    void perform(() => pudding.interaction.handle(resign))
                  }
                >
                  {t("actionResign")}
                </button>
              )}
            </footer>
          </section>
        </div>
        {picker && (
          <CandidatePicker
            candidates={candidates?.sessions || []}
            selected={selected}
            setSelected={setSelected}
            close={() => setPicker(false)}
            start={() => {
              setPicker(false);
              void perform(() =>
                start(
                  selected.filter((id) => id !== me),
                  selected.includes(me),
                ),
              );
            }}
            chosenPlayer={chosenPlayer}
          />
        )}
      </div>
    </main>
  );
}
function CandidatePicker({
  candidates,
  selected,
  setSelected,
  close,
  start,
  chosenPlayer,
}: {
  candidates: SessionCandidate[];
  selected: string[];
  setSelected: (ids: string[]) => void;
  close: () => void;
  start: () => void;
  chosenPlayer: (id: string) => Player | undefined;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="gd-picker-card"
      aria-labelledby="picker-title"
      onCancel={close}
    >
      <h3 id="picker-title">{t("pickerTitle")}</h3>
      <p>{t("pickerSubtitle", { count: selected.length })}</p>
      <div className="gd-picker-options">
        {[me, ...candidates.map((s) => s.id)].map((id) => {
          const player = chosenPlayer(id)!;
          return (
            <label className="gd-picker-row" key={id}>
              <input
                type="checkbox"
                data-session={id}
                checked={selected.includes(id)}
                disabled={!selected.includes(id) && selected.length >= 2}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, id]
                      : selected.filter((p) => p !== id),
                  )
                }
              />
              <Avatar player={player} />
              <span>
                {player.human ? t("you") : player.model?.name}
                <small>{player.name}</small>
              </span>
            </label>
          );
        })}
      </div>
      <div className="gd-picker-actions">
        <button
          className="gd-button is-primary"
          disabled={selected.length !== 2}
          onClick={start}
        >
          {t("pickerInviteAndPlay")}
        </button>
        <button className="gd-button" onClick={close}>
          {t("pickerBack")}
        </button>
      </div>
    </dialog>
  );
}
