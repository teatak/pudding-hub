import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  pudding,
  useWidgetInteraction,
  useWidgetState,
  useWidgetLocale,
  type SessionCandidate as SDKSessionCandidate,
} from "@pudding/widget";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  ListOrdered,
  MessageSquareOff,
  MessagesSquare,
  Play,
  Pause,
  Swords,
  UserRound,
  UsersRound,
} from "lucide-react";
import { roles } from "./lobby";
import { fillCandidates } from "./candidates";
import {
  size,
  letters,
  replayPosition,
  thinkingMS,
  totalThinkingMS,
  winningLine,
  type Color,
} from "./rules";
import {
  changeReadiness,
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

// New host metadata and subscription methods are optional on older SDK 1 hosts.
type SessionCandidate = SDKSessionCandidate & { kind?: "session" | "external"; connected?: boolean };
type Candidates = Omit<Awaited<ReturnType<typeof pudding.interaction.candidates>>, "sessions"> & { sessions: SessionCandidate[] };
const interaction = pudding.interaction as typeof pudding.interaction & {
  onCandidatesChanged?: (listener: () => void) => () => void;
  removeCandidate?: (input: { id: string }) => Promise<null>;
};
const removeCandidate = interaction.removeCandidate;
type Player = {
  id: string;
  name: string;
  human: boolean;
  model?: SessionCandidate["model"];
  external?: boolean;
  connected?: boolean;
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
function BoardComment({ player, role, quote }: {
  player: Player;
  role: Color;
  quote: { text: string; moveNumber: number };
}) {
  const track = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);
  useEffect(() => {
    const measure = () => setOverflow(Math.max(0, text.current!.scrollWidth - track.current!.clientWidth));
    const observer = new ResizeObserver(measure);
    observer.observe(track.current!);
    observer.observe(text.current!);
    measure();
    return () => observer.disconnect();
  }, []);
  const identity = `${player.human ? t("you") : player.model?.name || player.name} · ${sideName(role)}`;
  return (
    <div className="gd-board-comment" data-speech-move={quote.moveNumber} data-color={role}
      title={`${identity} · ${t("commentPrefix", { number: quote.moveNumber })}${quote.text}`}>
      <span className="gd-comment-author" role="img" aria-label={identity}>
        <Avatar player={player} />
        <span className={`gd-color-dot gd-${role.toLowerCase()}`} />
      </span>
      <span ref={track} className="gd-comment-track" tabIndex={overflow > 0 ? 0 : undefined}>
        <span ref={text} className={"gd-comment-text" + (overflow > 0 ? " is-scrolling" : "")}
          style={{ "--gd-scroll-distance": `-${overflow}px`, "--gd-scroll-duration": `${Math.max(8, overflow / 20)}s` } as CSSProperties}>
          <Comment {...quote} />
        </span>
      </span>
    </div>
  );
}
export default function App() {
  useWidgetState();
  useWidgetLocale();
  const run = useWidgetInteraction(),
    p = position(),
    l = lobby();
  const [candidates, setCandidates] = useState<Candidates | null>(null);
  // Keep display metadata on the retained board after a connection is removed.
  const knownPlayers = useRef(new Map<string, SessionCandidate>());
  const candidatesRequest = useRef(0);
  const seenAgents = useRef(new Set<string>());
  const [selected, setSelected] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{
    cause: unknown;
    retry?: "candidates" | "notification";
  } | null>(null);
  const [danmaku, setDanmaku] = useState(true),
    [draft, setDraft] = useState("");
  const [showNumbers, setShowNumbers] = useState(false);
  const [replay, setReplay] = useState<{
    round: number;
    moveCount: number;
  } | null>(null);
  const replaying = !!p.winner && replay?.round === l.round;
  const view = replaying ? replayPosition(p, replay!.moveCount) : p;
  const moveNumbers = new Map(
    view.history.map((m, i) => [
      (m.row - 1) * size + letters.indexOf(m.column),
      i + 1,
    ]),
  );
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
      // Keep asynchronous page actions in the host's caller scope as well as
      // interface calls, so an agent cannot become the human after an await.
      await pudding.interaction.handle(() => fn());
    } catch (e) {
      setError({
        cause: e,
        retry: e instanceof NotificationError ? "notification" : undefined,
      });
    } finally {
      setBusy(false);
    }
  }
  async function loadCandidates(isLive = () => true) {
    const requestID = ++candidatesRequest.current;
    try {
      const value: Candidates = await pudding.interaction.candidates();
      if (!isLive() || requestID !== candidatesRequest.current) return;
      value.sessions.forEach((s) => { if (s.participantID) knownPlayers.current.set(s.participantID, s); });
      setCandidates(value);
      const seen = new Set(seenAgents.current);
      setSelected((current) => fillCandidates(current, value.sessions, seen));
      value.sessions.filter(s => s.kind === "external" && s.connected !== false).forEach(s => seenAgents.current.add(s.id));
    } catch (e) {
      if (isLive()) setError({ cause: e, retry: "candidates" });
    }
  }
  useEffect(() => {
    let live = true;
    void loadCandidates(() => live);
    const unsubscribe = interaction.onCandidatesChanged?.(() => void loadCandidates(() => live));
    return () => {
      live = false;
      unsubscribe?.();
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
      ? { id, name: candidate.name, human: false, model: candidate.model, external: candidate.kind === "external", connected: candidate.connected }
      : undefined;
  };
  const players = l.round
    ? l.players.map((id) => {
        const participant = run?.participants.find((p) => p.id === id);
        const candidate = candidates?.sessions.find((s) => s.participantID === id);
        const external = (candidate ?? knownPlayers.current.get(id))?.kind === "external";
        return participant
          ? {
              id,
              name:
                participant.kind === "human"
                  ? t("playOnBoard")
                  : participant.name,
              human: participant.kind === "human",
              model: candidate?.model ?? knownPlayers.current.get(id)?.model,
              external,
              connected: external ? candidate?.connected ?? false : undefined,
            }
          : undefined;
      })
    : selected.map(chosenPlayer);
  const commentIndex = view.history.map(move => !!move.comment).lastIndexOf(true);
  const commentMove = view.history[commentIndex];
  const latestComment = commentMove?.comment ? {
    role: (commentMove.stone === "B" ? "Black" : "White") as Color,
    quote: { text: commentMove.comment, moveNumber: commentIndex + 1 },
  } : undefined;
  const commenter = latestComment && players.find(player => player?.id === l.seats[latestComment.role]);
  const act = (ready: boolean) =>
    perform(() => pudding.interaction.handle((c) => changeReadiness(ready, c)));
  function openRound(choosePlayers = false) {
    void perform(async () => {
      // Connections may arrive after the board opened. Refresh only the picker;
      // participant identity and game state still come from the shared run.
      const current: Candidates = await pudding.interaction.candidates();
      setCandidates(current);
      const available = new Set([me, ...current.sessions.filter((s) => s.connected !== false).map((s) => s.id)]);
      const previous = (l.round
        ? l.players.flatMap((id) =>
            id === human?.id
              ? [me]
              : current.sessions
                  .filter((s) => s.participantID === id)
                  .map((s) => s.id),
          )
        : selected).filter((id) => available.has(id));
      const choice = fillCandidates(previous, current.sessions, seenAgents.current);
      current.sessions.filter(s => s.kind === "external" && s.connected !== false).forEach(s => seenAgents.current.add(s.id));
      setSelected(choice);
      if (choosePlayers || choice.length !== 2) {
        setSelected(choice);
        setPicker(true);
        return;
      }
      await start(choice.filter((id) => id !== me), choice.includes(me));
    });
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
                  color: p.turn === "Black" ? t("colorBlack") : t("colorWhite"),
                });
  const line = winningLine(view);
  return (
    <main className="gd-product">
      <div className="gd-content">
        <header className="gd-gamebar">
          <div className="gd-game-title">
            <strong aria-live="polite">
              {replaying ? t("replay") : title}
            </strong>
            <small>
              {t("roundDetail", {
                round: l.round || 1,
                detail: replaying
                  ? t("replayProgress", {
                      current: view.moveCount,
                      total: p.moveCount,
                    })
                  : p.moveCount
                    ? t("movesCount", { count: p.moveCount })
                    : t("freestyleRule"),
              })}
            </small>
          </div>
          <div className="gd-game-actions">
            <button
              className="gd-button gd-icon-toggle"
              id="move-numbers"
              title={t("showMoveNumbers")}
              aria-label={t("showMoveNumbers")}
              aria-pressed={showNumbers}
              onClick={() => setShowNumbers((v) => !v)}
            >
              <ListOrdered size={16} />
            </button>
            <button
              className="gd-button gd-icon-toggle gd-danmaku-toggle"
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
            {!!l.round && (p.winner || run?.status === "paused") && (
              <button
                className="gd-button gd-icon-toggle"
                id="change-players"
                title={t("changePlayers")}
                aria-label={t("changePlayers")}
                disabled={busy || !candidates}
                onClick={() => openRound(true)}
              >
                <UsersRound size={16} />
              </button>
            )}
            {(!l.round || p.winner || run?.status === "paused") && (
              <button
                className="gd-button gd-main-action"
                id="start"
                disabled={busy || !candidates}
                onClick={() => openRound()}
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
            <span>{errorText(error.cause)}</span>
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
          <section className="gd-players" aria-label={t("playersSection")}>
            {[0, 1].map((index) => {
              const player = players[index],
                role = player && roles.find((r) => l.seats[r] === player.id),
                ready = !!player && l.ready.includes(player.id);
              const won = !replaying && !!role && p.winner === role;
              const turn =
                !replaying &&
                l.phase === "playing" &&
                !p.winner &&
                role === p.turn;
              const totalMS = role ? totalThinkingMS(p, role, now) : null;
              const showBody = !player || !l.round || (!p.winner && (l.phase !== "playing" || player.human));
              const status = replaying
                ? t("replay")
                : !l.round
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
                            : t("statusNotReady");
              const openingHint =
                run?.status === "paused"
                  ? t("hintPaused")
                  : l.phase === "countdown"
                    ? t("hintBothReady")
                    : ready
                      ? t("hintWaitingOpponent")
                      : t("hintWaitingReadiness");
              return (
                <article
                  className={
                    "gd-player" +
                    (turn && run?.status === "running" ? " is-turn" : "") +
                    (won ? " is-winner" : "")
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
                        {player?.connected === false && ` · ${t("connectionOffline")}`}
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
                      {won ? (
                        <span className="gd-win-stamp" aria-label={t("statusWinner")}>
                          {t("winStamp")}
                        </span>
                      ) : player ? status : t("statusOpen")}
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
                  {showBody ? <div className="gd-card-body">
                    {player?.human && l.round && l.phase !== "playing" ? (
                      <div className="gd-card-wait">
                        <small>{openingHint}</small>
                        <div className="gd-player-actions">
                          <button
                            className={
                              "gd-button" + (!ready ? " is-primary" : "")
                            }
                            id="ready"
                            disabled={busy || run?.status !== "running"}
                            onClick={() => void act(!ready)}
                          >
                            {ready ? t("actionCancelReady") : t("actionReady")}
                          </button>
                        </div>
                      </div>
                    ) : player?.human && l.phase === "playing" && !p.winner ? (
                      <div className="gd-human-body">
                        <small>{t("commentHint")}</small>
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
                              : replaying
                                ? t(
                                    danmaku
                                      ? "replayNoComment"
                                      : "cardCommentsOff",
                                  )
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
                  </div> : role && (
                    <div className="gd-card-body">
                      <div className="gd-total-time">
                        <span>{t("totalThinkingTime")}</span>
                        <time title={totalMS === null ? t("totalTimeUnavailable") : undefined}>
                          {totalMS === null ? "—" : elapsedTime(totalMS)}
                        </time>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
          <section className="gd-board-area" aria-label={t("boardSectionAria")}>
            <div className="gd-board-wrap">
              <div className="gd-board-comments" role="region" aria-label={t("playerComments")} aria-live="polite">
                {danmaku && latestComment?.quote?.text && commenter && (
                  <BoardComment
                    key={`${l.round}-${latestComment.role}-${latestComment.quote.moveNumber}`}
                    player={commenter}
                    role={latestComment.role}
                    quote={latestComment.quote}
                  />
                )}
              </div>
              <div
                className="gd-wood"
                data-replaying={replaying}
                role="group"
                aria-label={t("boardAria")}
              >
                <div className="gd-board-surface">
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
                {view.board.map((stone, index) => {
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
                            : t("stoneEmpty")) +
                        (stone && showNumbers
                          ? " · " +
                            t("stoneMoveNumber", {
                              number: moveNumbers.get(index)!,
                            })
                          : "")
                      }
                      disabled={replaying || busy || !myTurn || !!stone}
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
                            (view.last === index ? " is-last" : "") +
                            (showNumbers ? " has-number" : "") +
                            (line.includes(index) ? " is-win" : "")
                          }
                        >
                          {showNumbers && (
                            <span
                              className="gd-stone-number"
                              data-move-number={moveNumbers.get(index)}
                              aria-hidden="true"
                            >
                              {moveNumbers.get(index)}
                            </span>
                          )}
                        </span>
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
                        onClick={() => void act(false)}
                      >
                        {t("actionCancelReady")}
                      </button>
                    )}
                  </div>
                )}
                </div>
              </div>
            </div>
            <footer className="gd-board-footer">
              {replaying ? (
                <div
                  className="gd-replay"
                  role="group"
                  aria-label={t("replay")}
                >
                  <div className="gd-replay-heading">
                    <span>
                      {t("replayProgress", {
                        current: view.moveCount,
                        total: p.moveCount,
                      })}
                    </span>
                    <button
                      className="gd-button is-text"
                      id="replay-exit"
                      onClick={() => setReplay(null)}
                    >
                      {t("returnToResult")}
                    </button>
                  </div>
                  <div className="gd-replay-controls">
                    <button
                      className="gd-button gd-icon-toggle"
                      id="replay-previous"
                      title={t("previousMove")}
                      aria-label={t("previousMove")}
                      disabled={view.moveCount === 0}
                      onClick={() =>
                        setReplay({
                          round: l.round,
                          moveCount: view.moveCount - 1,
                        })
                      }
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <input
                      id="replay-progress"
                      type="range"
                      min={0}
                      max={p.moveCount}
                      step={1}
                      value={view.moveCount}
                      aria-label={t("replay")}
                      aria-valuetext={t("replayProgress", {
                        current: view.moveCount,
                        total: p.moveCount,
                      })}
                      onChange={(e) =>
                        setReplay({
                          round: l.round,
                          moveCount: Number(e.target.value),
                        })
                      }
                    />
                    <button
                      className="gd-button gd-icon-toggle"
                      id="replay-next"
                      title={t("nextMove")}
                      aria-label={t("nextMove")}
                      disabled={view.moveCount === p.moveCount}
                      onClick={() =>
                        setReplay({
                          round: l.round,
                          moveCount: view.moveCount + 1,
                        })
                      }
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
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
                  {!!p.winner && p.moveCount > 0 && (
                    <button
                      className="gd-button"
                      id="replay-start"
                      onClick={() =>
                        setReplay({ round: l.round, moveCount: 0 })
                      }
                    >
                      <History size={14} />
                      {t("replay")}
                    </button>
                  )}
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
                </>
              )}
            </footer>
          </section>
        </div>
        {picker && (
          <CandidatePicker
            candidates={candidates?.sessions || []}
            selected={selected}
            setSelected={setSelected}
            busy={busy}
            remove={removeCandidate ? (id) => void perform(async () => {
              await removeCandidate({ id });
              setSelected((current) => current.filter((value) => value !== id));
              await loadCandidates();
            }) : undefined}
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
  busy,
  remove,
}: {
  candidates: SessionCandidate[];
  selected: string[];
  setSelected: (ids: string[]) => void;
  close: () => void;
  start: () => void;
  chosenPlayer: (id: string) => Player | undefined;
  busy: boolean;
  remove?: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [showConversations, setShowConversations] = useState(selected.length < 2 || selected.some(id => id === me || candidates.some(c => c.id === id && c.kind !== "external")));
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
      <button className="gd-button" aria-expanded={showConversations} onClick={() => setShowConversations(v => !v)}>{t("pickerSupplement")}</button>
      <div className="gd-picker-options">
        {[...candidates.filter(s => s.kind === "external").map(s => s.id), ...(showConversations ? [me, ...candidates.filter(s => s.kind !== "external").map(s => s.id)] : [])].map((id) => {
          const player = chosenPlayer(id)!;
          return (
            <div className="gd-picker-row" key={id}>
              <label>
              <input
                type="checkbox"
                data-session={id}
                checked={selected.includes(id)}
                disabled={busy || (!selected.includes(id) && (player.connected === false || selected.length >= 2))}
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
                <small>{player.name}{player.connected === false && ` · ${t("connectionOffline")}`}</small>
              </span>
              </label>
              {player.external && remove && <button className="gd-button" disabled={busy}
                aria-label={t("removeConnectionNamed", { name: player.name })}
                onClick={() => remove(id)}>{t("removeConnection")}</button>}
            </div>
          );
        })}
      </div>
      <div className="gd-picker-actions">
        <button
          className="gd-button is-primary"
          disabled={busy || selected.length !== 2 || selected.some((id) => !chosenPlayer(id) || chosenPlayer(id)?.connected === false)}
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
