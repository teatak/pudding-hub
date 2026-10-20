import { useEffect, useState } from "react";
import {
  pudding,
  useWidgetInteraction,
  useWidgetState,
  useWidgetLocale,
  type SessionCandidate,
} from "@pudding/widget";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  Play,
  Pause,
  Swords,
  UserRound,
  UsersRound,
  X,
  RotateCcw,
  MessagesSquare,
  MessageSquareOff,
} from "lucide-react";
import { roles } from "./lobby";
import {
  size,
  letters,
  replayPosition,
  thinkingMS,
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
  resign,
  start,
} from "./game";
import { t, setLocale, errorText } from "./text";
import "./style.css";

type Candidates = Awaited<ReturnType<typeof pudding.interaction.candidates>>;
type Player = {
  id: string;
  name: string;
  human: boolean;
  model?: SessionCandidate["model"];
};

const me = "@me";

function elapsedTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return (
    String(Math.floor(seconds / 60)).padStart(2, "0") +
    ":" +
    String(seconds % 60).padStart(2, "0")
  );
}

function ReversiEmblemIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="128" height="128" rx="20" fill="#2e8b57" />
      <g stroke="#ffffff" strokeOpacity="0.25" strokeWidth="3">
        <line x1="20" y1="64" x2="108" y2="64" />
        <line x1="64" y1="20" x2="64" y2="108" />
        <rect x="24" y="24" width="80" height="80" rx="8" fill="none" strokeWidth="3" />
      </g>
      <circle cx="48" cy="64" r="22" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
      <circle cx="80" cy="64" r="22" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />
    </svg>
  );
}

function PlayerAvatar({ player }: { player?: Player }) {
  return (
    <span className="rv-avatar">
      {player?.human ? (
        <UserRound size={20} />
      ) : player?.model?.icon ? (
        <img src={player.model.icon} alt="" className="rv-avatar-img" />
      ) : (
        <Swords size={18} />
      )}
    </span>
  );
}

export default function App() {
  useWidgetState();
  const locale = useWidgetLocale();
  if (locale) setLocale(locale);

  const run = useWidgetInteraction();
  const p = position();
  const l = lobby();

  const [candidates, setCandidates] = useState<Candidates | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [danmaku, setDanmaku] = useState(true);
  const [error, setError] = useState<{
    cause: unknown;
    retry?: "candidates" | "notification";
  } | null>(null);

  const [draftComment, setDraftComment] = useState("");
  const [replay, setReplay] = useState<{
    round: number;
    moveCount: number;
  } | null>(null);

  const replaying = !!p.winner && replay?.round === l.round;
  const view = replaying ? replayPosition(p, replay!.moveCount) : p;

  const [now, setNow] = useState(Date.now());
  const members = run?.participants.map((part) => part.id).join(",") || "";
  const human = run?.participants.find((part) => part.kind === "human");
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
        cause: e,
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
      if (!lobby().round) {
        const initial = (
          value.connectedSessionIDs ?? value.preferredSessionIDs
        ).slice(0, 2);
        setSelected(initial);
      }
    } catch (e) {
      if (isLive()) setError({ cause: e, retry: "candidates" });
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

  const getPlayerForRole = (role: Color): Player | undefined => {
    const participantID = l.seats[role];
    if (!participantID) return undefined;
    const participant = run?.participants.find((part) => part.id === participantID);
    if (!participant) return undefined;
    const isHuman = participant.kind === "human";
    const sessionModel = candidates?.sessions.find((s) => s.participantID === participantID)?.model;
    return {
      id: participantID,
      name: isHuman ? t("pickerYou") : participant.name,
      human: isHuman,
      model: sessionModel,
    };
  };

  function openRound(choosePlayers = false) {
    const choice = l.round
      ? l.players.flatMap((id) =>
          id === human?.id
            ? [me]
            : candidates?.sessions
                .filter((s) => s.participantID === id)
                .map((s) => s.id) ?? [],
        )
      : selected;

    if (choosePlayers || choice.length !== 2) {
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

  const blackPlayer = getPlayerForRole("Black");
  const whitePlayer = getPlayerForRole("White");

  const countdownSeconds =
    l.startsAt && l.startsAt > now
      ? Math.ceil((l.startsAt - now) / 1000)
      : 0;

  return (
    <div className="rv-app">
      {/* 头部：与看板和便签完全一致的布局标准 */}
      <header className="rv-header">
        <div className="rv-heading">
          <div className="rv-emblem" aria-hidden="true">
            <ReversiEmblemIcon size={24} />
          </div>
          <div>
            <h1>{t("appTitle")}</h1>
          </div>
        </div>

        <div className="rv-header-actions">
          {l.round > 0 && (
            <div className="rv-score-badge">
              {p.winner
                ? p.winner === "draw"
                  ? t("matchDraw")
                  : p.winner === "Black"
                    ? t("winnerBlack")
                    : t("winnerWhite")
                : t("scoreText", {
                    black: String(view.blackCount),
                    white: String(view.whiteCount),
                  })}
            </div>
          )}

          {/* 弹幕开关按钮（类似五子棋） */}
          <button
            type="button"
            className={`rv-btn rv-icon-btn ${danmaku ? "is-active" : ""}`}
            title={t("toggleDanmaku")}
            aria-label={t("toggleDanmaku")}
            aria-pressed={danmaku}
            onClick={() => setDanmaku(!danmaku)}
          >
            {danmaku ? <MessagesSquare size={16} /> : <MessageSquareOff size={16} />}
          </button>

          {run?.status === "paused" && (
            <button
              type="button"
              className="rv-btn is-primary"
              disabled={busy}
              onClick={() => void perform(() => pudding.interaction.resume())}
            >
              <Play size={14} />
              <span>{t("continueGame")}</span>
            </button>
          )}

          {run?.status === "running" && l.phase === "playing" && !p.winner && (
            <button
              type="button"
              className="rv-btn"
              disabled={busy}
              onClick={() => void perform(pause)}
              title={t("pauseGame")}
            >
              <Pause size={14} />
              <span>{t("pauseGame")}</span>
            </button>
          )}

          {l.round > 0 && p.winner && (
            <button
              type="button"
              className={`rv-btn ${replaying ? "is-active" : ""}`}
              onClick={() => {
                if (replaying) {
                  setReplay(null);
                } else {
                  setReplay({ round: l.round, moveCount: p.moveCount });
                }
              }}
            >
              <History size={14} />
              <span>{replaying ? t("exitReplay") : t("showReplay")}</span>
            </button>
          )}

          {l.round > 0 && (p.winner || run?.status === "paused") && (
            <button
              type="button"
              className="rv-btn"
              disabled={busy}
              onClick={() => openRound(true)}
              title={t("changePlayers")}
            >
              <UsersRound size={14} />
              <span>{t("changePlayers")}</span>
            </button>
          )}

          {(!l.round || p.winner || run?.status === "paused") && (
            <button
              type="button"
              className="rv-btn is-primary"
              disabled={busy || !candidates}
              onClick={() => openRound()}
            >
              <RotateCcw size={14} />
              <span>{l.round ? t("newRound") : t("pickerStart")}</span>
            </button>
          )}
        </div>
      </header>

      {/* 错误提示 */}
      {!!error && (
        <div className="rv-error-banner" role="alert">
          <span>{errorText(error.cause)}</span>
          <button
            type="button"
            className="rv-icon-btn is-danger"
            onClick={() => setError(null)}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 主对弈竞技场：棋盘在左，席位固定在右 */}
      <div className="rv-arena">
        {/* 棋盘主区域 */}
        <div className="rv-board-area">
          <div className="rv-board-wrapper">
            {/* 自动让步浮动提示（不占外部高度） */}
            {l.phase === "playing" && p.passedColor && (
              <div className="rv-board-toast">
                {t("autoPassed", {
                  color:
                    p.passedColor === "Black"
                      ? t("colorBlack")
                      : t("colorWhite"),
                })}
              </div>
            )}

            {/* 8×8 绿呢绒棋盘 */}
            <div className="rv-board">
              {/* 顶部列坐标 A–H */}
              <div className="rv-col-labels">
                <span className="rv-coord-corner" />
                {[...letters].map((letter) => (
                  <span key={letter} className="rv-coord-label">
                    {letter}
                  </span>
                ))}
                <span className="rv-coord-corner" />
              </div>

              {/* 8 个行 (由上至下 1–8) */}
              {Array.from({ length: size }, (_, visualRow) => {
                const rowNum = visualRow + 1; // 1 to 8 (top to bottom)
                return (
                  <div key={rowNum} className="rv-board-row">
                    <span className="rv-row-label">{rowNum}</span>
                    {Array.from({ length: size }, (_, colIdx) => {
                      const colLetter = letters[colIdx];
                      const coord = `${colLetter}${rowNum}`;
                      const cellIdx = (rowNum - 1) * size + colIdx;
                      const disc = view.board[cellIdx]; // 0: empty, 1: Black, 2: White
                      const isLegal =
                        !replaying &&
                        myTurn &&
                        p.legalMoves.includes(coord);
                      const isLast = !replaying && p.last === cellIdx;

                      return (
                        <button
                          key={coord}
                          type="button"
                          className={`rv-cell ${isLegal ? "is-legal" : ""}`}
                          disabled={busy || replaying || !isLegal}
                          onClick={() => {
                            if (!isLegal) return;
                            void perform(async () => {
                              await pudding.interaction.handle((c) =>
                                move(
                                  {
                                    row: rowNum,
                                    column: colLetter,
                                    comment: draftComment.trim() || undefined,
                                  },
                                  c,
                                ),
                              );
                              setDraftComment("");
                            });
                          }}
                          aria-label={`${coord}: ${
                            disc === 1
                              ? t("colorBlack")
                              : disc === 2
                                ? t("colorWhite")
                                : isLegal
                                  ? t("legalMoveHint")
                                  : ""
                          }`}
                        >
                          {/* 4 个天元星位点 (C3, F3, C6, F6) */}
                          {((colIdx === 2 || colIdx === 5) &&
                            (rowNum === 3 || rowNum === 6)) && (
                            <span className="rv-star-point" />
                          )}

                          {disc === 1 && (
                            <span
                              className={`rv-disc is-black ${
                                isLast ? "is-last-move" : ""
                              }`}
                            />
                          )}
                          {disc === 2 && (
                            <span
                              className={`rv-disc is-white ${
                                isLast ? "is-last-move" : ""
                              }`}
                            />
                          )}

                          {disc === 0 && isLegal && (
                            <span className="rv-legal-dot" />
                          )}
                        </button>
                      );
                    })}
                    <span className="rv-row-label">{rowNum}</span>
                  </div>
                );
              })}

              {/* 底部列坐标 A–H */}
              <div className="rv-col-labels">
                <span className="rv-coord-corner" />
                {[...letters].map((letter) => (
                  <span key={letter} className="rv-coord-label">
                    {letter}
                  </span>
                ))}
                <span className="rv-coord-corner" />
              </div>
            </div>

            {/* 倒计时浮层（棋盘中心覆盖，绝不额外占高度导致棋盘跳动） */}
            {l.phase === "countdown" && run?.status === "running" && (
              <div className="rv-board-overlay" aria-live="polite">
                <span className="rv-overlay-title">{t("countdownTitle")}</span>
                <strong className="rv-overlay-number">
                  {Math.max(1, countdownSeconds)}
                </strong>
                <span className="rv-overlay-hint">{t("sideBlackFirst")}</span>
                {humanRole && (
                  <button
                    type="button"
                    className="rv-btn"
                    disabled={busy}
                    onClick={() =>
                      void perform(() =>
                        pudding.interaction.handle((c) =>
                          changeReadiness(false, c),
                        ),
                      )
                    }
                  >
                    {t("cancelReady")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 复盘控制栏 */}
          {replaying && (
            <div className="rv-replay-bar">
              <button
                type="button"
                className="rv-btn"
                disabled={replay!.moveCount <= 0}
                onClick={() =>
                  setReplay({
                    round: l.round,
                    moveCount: Math.max(0, replay!.moveCount - 1),
                  })
                }
              >
                <ChevronLeft size={16} />
                <span>{t("stepPrev")}</span>
              </button>

              <span className="rv-replay-counter">
                {t("replayStep", {
                  step: String(replay!.moveCount),
                  total: String(p.moveCount),
                })}
              </span>

              <button
                type="button"
                className="rv-btn"
                disabled={replay!.moveCount >= p.moveCount}
                onClick={() =>
                  setReplay({
                    round: l.round,
                    moveCount: Math.min(p.moveCount, replay!.moveCount + 1),
                  })
                }
              >
                <span>{t("stepNext")}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* 席位全部位于右侧（垂直并列，固定 192px 高度，保证内容不撑高卡片） */}
        <div className="rv-players">
          {renderPlayerCard("Black", blackPlayer)}
          {renderPlayerCard("White", whitePlayer)}
        </div>
      </div>

      {/* 选手选择弹窗 */}
      {picker && renderPickerModal()}
    </div>
  );

  function renderPlayerCard(role: Color, player?: Player) {
    const isCurrentTurn = l.phase === "playing" && !p.winner && p.turn === role;
    const isWinner = p.winner === role;
    const isReady = player && l.ready.includes(player.id);
    const isMe = player?.id === human?.id;
    const elapsed = isCurrentTurn ? thinkingMS(p, now) : 0;
    const comment = p.comments[role];

    return (
      <article
        key={role}
        className={`rv-player-card is-${role.toLowerCase()} ${
          isCurrentTurn ? "is-turn" : ""
        } ${isWinner ? "is-winner" : ""}`}
      >
        {/* 第一行 (20px): 执棋身份 + 思考用时/状态 */}
        <div className="rv-player-top">
          <span className="rv-side-badge">
            <span className={`rv-color-dot is-${role.toLowerCase()}`} />
            <span>
              {role === "Black" ? t("sideBlackFirst") : t("sideWhiteSecond")}
            </span>
          </span>

          <span className="rv-player-status">
            {l.phase === "lobby" ? (
              isReady ? (
                <span className="rv-status-ready">
                  <Check size={12} /> {t("readyBtn")}
                </span>
              ) : (
                <span className="rv-status-waiting">{t("waitingReady")}</span>
              )
            ) : isCurrentTurn ? (
              <span className="rv-think-time">
                {t("thinking")} {elapsedTime(elapsed)}
              </span>
            ) : (
              <span className="rv-status-idle">{t("opponentTurn")}</span>
            )}
          </span>
        </div>

        {/* 第二行 (44px): 头像 + 名字 + 大号比分 */}
        <div className="rv-player-head">
          <div className="rv-avatar-and-name">
            <PlayerAvatar player={player} />
            <div className="rv-player-identity">
              <strong className="rv-player-name">
                {player?.name || t("undecided")}
                {isMe ? <span className="rv-you-tag">{t("youIndicator")}</span> : null}
              </strong>
              <small className="rv-player-sub">
                {player?.model?.name ||
                  (player?.human ? t("playerHuman") : t("playerSlot"))}
              </small>
            </div>
          </div>

          <div className="rv-player-score">
            {role === "Black" ? view.blackCount : view.whiteCount}
          </div>
        </div>

        {/* 第三行: 卡片正文主体 (严格定高，绝对不撑开卡片高度) */}
        <div className="rv-card-body">
          {isMe && l.phase === "lobby" ? (
            <div className="rv-action-row">
              <button
                type="button"
                className={`rv-btn ${isReady ? "" : "is-primary"}`}
                disabled={busy}
                onClick={() =>
                  void perform(() =>
                    pudding.interaction.handle((c) =>
                      changeReadiness(!isReady, c),
                    ),
                  )
                }
              >
                {isReady ? t("cancelReady") : t("readyBtn")}
              </button>
            </div>
          ) : isMe && l.phase === "playing" && !p.winner ? (
            <div className="rv-human-controls">
              <input
                type="text"
                className="rv-comment-input"
                placeholder={t("commentPlaceholder")}
                value={draftComment}
                maxLength={40}
                disabled={busy || !myTurn}
                onChange={(e) => setDraftComment(e.target.value)}
              />
              <button
                type="button"
                className="rv-btn is-danger is-compact"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(t("resignConfirm"))) {
                    void perform(() => pudding.interaction.handle(resign));
                  }
                }}
              >
                {t("actionResign")}
              </button>
            </div>
          ) : danmaku && comment && comment.text ? (
            <div className="rv-speech" title={comment.text}>
              <span className="rv-speech-prefix">
                {t("commentPrefix", { number: comment.moveNumber })}
              </span>
              <span className="rv-speech-text">{comment.text}</span>
            </div>
          ) : (
            <div className="rv-card-placeholder">
              <span className="rv-placeholder-text">
                {p.winner
                  ? t("cardNoComment")
                  : l.phase === "playing"
                    ? isCurrentTurn
                      ? t("thinking")
                      : t("waitingMove", { name: player?.name || "" })
                    : t("waitingReady")}
              </span>
            </div>
          )}
        </div>
      </article>
    );
  }

  function renderPickerModal() {
    return (
      <div className="rv-modal-overlay">
        <div className="rv-modal">
          <div className="rv-modal-header">
            <h3>{t("pickerTitle")}</h3>
            <p className="rv-modal-subtitle">{t("pickerSubtitle")}</p>
          </div>

          <div className="rv-candidate-list">
            <label className="rv-candidate-item">
              <input
                type="checkbox"
                checked={selected.includes(me)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelected([...selected, me].slice(-2));
                  } else {
                    setSelected(selected.filter((id) => id !== me));
                  }
                }}
              />
              <UserRound size={18} className="rv-candidate-icon" />
              <div className="rv-candidate-info">
                <strong>{t("pickerYou")}</strong>
              </div>
            </label>

            {candidates?.sessions.map((s) => (
              <label key={s.id} className="rv-candidate-item">
                <input
                  type="checkbox"
                  checked={selected.includes(s.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected([...selected, s.id].slice(-2));
                    } else {
                      setSelected(selected.filter((id) => id !== s.id));
                    }
                  }}
                />
                {s.model?.icon ? (
                  <img src={s.model.icon} alt="" className="rv-candidate-icon-img" />
                ) : (
                  <Swords size={18} className="rv-candidate-icon" />
                )}
                <div className="rv-candidate-info">
                  <strong>{s.name}</strong>
                  {s.model?.name && <span>{s.model.name}</span>}
                </div>
              </label>
            ))}
          </div>

          <div className="rv-modal-actions">
            <button
              type="button"
              className="rv-btn"
              onClick={() => setPicker(false)}
            >
              {t("pickerCancel")}
            </button>
            <button
              type="button"
              className="rv-btn is-primary"
              disabled={selected.length !== 2}
              onClick={() => {
                setPicker(false);
                void perform(() =>
                  start(
                    selected.filter((id) => id !== me),
                    selected.includes(me),
                  ),
                );
              }}
            >
              {t("pickerStart")} ({selected.length}/2)
            </button>
          </div>
        </div>
      </div>
    );
  }
}
