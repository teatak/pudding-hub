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
import { text, errorText } from "./text";
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
  role === "Black"
    ? text("Black · first", "黑棋 · 先手")
    : text("White · second", "白棋 · 后手");
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
        {text(
          "Move " + moveNumber,
          "第 " + moveNumber + " 手",
          "第 " + moveNumber + " 手",
        )}{" "}
        ·{" "}
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
        name: text("Play on the board", "在棋盘上落子"),
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
                  ? text("Play on the board", "在棋盘上落子")
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
      ? text("Game paused", "对局已暂停")
      : !l.round
        ? text("Ready for a game", "等待开局")
        : p.winner
          ? p.winner === "draw"
            ? text("Draw", "本局平局")
            : text(
                p.winner + " wins",
                (p.winner === "Black" ? "黑方" : "白方") + "获胜",
                (p.winner === "Black" ? "黑方" : "白方") + "獲勝",
              )
          : l.phase === "countdown"
            ? text("Starting soon", "即将开始")
            : l.phase === "lobby"
              ? text("Waiting for players", "等待就绪")
              : text(
                  p.turn + " to move",
                  p.turn === "Black" ? "黑方回合" : "白方回合",
                );
  const line = winningLine(p);
  return (
    <main className="gd-product">
      <div className="gd-content">
        <header className="gd-gamebar">
          <div className="gd-game-title">
            <strong aria-live="polite">{title}</strong>
            <small>
              {text("Round", "第")} {l.round || 1} {text("·", "局 ·")}{" "}
              {p.moveCount
                ? text(
                    p.moveCount + " moves",
                    p.moveCount + " 手",
                    p.moveCount + " 手",
                  )
                : text("15 × 15 · freestyle", "15 × 15 · 自由规则")}
            </small>
          </div>
          <div className="gd-game-actions">
            <button
              className="gd-button gd-danmaku-toggle"
              aria-label={text("Toggle player comments", "开关卡片弹幕")}
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
                {text("Continue", "继续对局")}
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
                {text("Pause", "暂停对局")}
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
                  ? text("Play", "开一局")
                  : run?.status === "paused"
                    ? text("New game", "重新开局")
                    : text("Rematch", "再来一局")}
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
                {text("Retry", "重试")}
              </button>
            )}
            <button
              className="gd-button is-text"
              onClick={() => setError(null)}
            >
              {text("Dismiss", "关闭")}
            </button>
          </div>
        )}
        <div className="gd-arena">
          <section
            className="gd-players"
            aria-label={text("Players", "两位棋手")}
          >
            {[0, 1].map((index) => {
              const player = players[index],
                role = player && roles.find((r) => l.seats[r] === player.id),
                ready = !!player && l.ready.includes(player.id);
              const turn =
                l.phase === "playing" && !p.winner && role === p.turn;
              const quote = role && danmaku ? p.comments[role] : undefined;
              const status = !l.round
                ? text("Not invited", "待邀请")
                : p.winner
                  ? p.winner === role
                    ? text("Winner", "本局获胜")
                    : text("Finished", "本局结束")
                  : run?.status === "paused"
                    ? text("Paused", "已暂停")
                    : turn
                      ? text("Thinking", "思考中")
                      : l.phase === "playing"
                        ? text("Waiting", "等待对手")
                        : ready
                          ? text("Ready", "已准备")
                          : role
                            ? text("Not ready", "等待准备")
                            : text("Choosing", "等待选边");
              const openingHint = run?.status === "paused"
                ? text(
                    "Game paused; continue to act",
                    "对局已暂停，继续后可操作",
                    "對局已暫停，繼續後可操作",
                  )
                : l.phase === "countdown"
                  ? text(
                      "Both players ready; starting soon",
                      "双方已准备，即将开局",
                      "雙方已準備，即將開局",
                    )
                  : ready
                    ? text(
                        "This player is ready; waiting for the opponent",
                        "本方已准备，等待对手就绪",
                        "本方已準備，等待對手就緒",
                      )
                    : role
                      ? text(
                          "This player has a side; waiting for readiness",
                          "本方已选边，等待准备",
                          "本方已選邊，等待準備",
                        )
                      : text(
                          "Waiting for this player to choose a side",
                          "等待本方选择黑棋或白棋",
                          "等待本方選擇黑棋或白棋",
                        );
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
                          ? text("You", "我")
                          : player?.model?.name ||
                            text(
                              player ? "Loading model" : "Choose a player",
                              player ? "读取模型信息" : "等待棋手",
                            )}
                      </strong>
                      <small title={player?.name}>
                        {player?.name ||
                          text("Conversation or you", "可选会话，也可选自己")}
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
                      {role ? sideName(role) : text("Undecided", "待定")}
                    </span>
                    <span
                      className={
                        "gd-player-status" + (ready ? " is-ready" : "")
                      }
                    >
                      {player ? status : text("Open", "空位")}
                      {turn &&
                        (p.turnStartedAt !== null || p.turnElapsedMS > 0) && (
                          <time
                            className="gd-think-time"
                            aria-label={text("Thinking time", "思考用时")}
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
                                {r === "Black"
                                  ? text("Black", "执黑")
                                  : text("White", "执白")}
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
                                {ready
                                  ? text("Cancel ready", "取消准备")
                                  : text("Ready", "准备")}
                              </button>
                              <button
                                className="gd-button is-text"
                                disabled={busy || run?.status !== "running"}
                                id="leave"
                                onClick={() => void act("leave")}
                              >
                                {text("Leave", "离座")}
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
                            text(
                              "Add a comment with your move",
                              "落子时，也可以说一句",
                            )
                          )}
                        </p>
                        <label className="gd-comment-compose">
                          <input
                            data-comment
                            aria-label={text(
                              "Comment on your next move",
                              "随下一手发言",
                            )}
                            maxLength={40}
                            value={draft}
                            disabled={busy || !myTurn}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder={text(
                              "Say something…",
                              "这手想说什么？",
                            )}
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
                            ? text(
                                "Choose a conversation or yourself",
                                "补选会话或“我”",
                              )
                            : !l.round
                              ? text(
                                  "Invite this conversation on start",
                                  "开局后，邀请当前会话",
                                )
                              : l.phase !== "playing"
                                ? openingHint
                                : !danmaku
                                  ? text("Comments off", "弹幕已关闭")
                                  : p.winner
                                    ? text("Match complete", "对局已结束")
                                    : text(
                                        "One comment with each move",
                                        "落子时可以留一句话",
                                      )}
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
          <section className="gd-board-area" aria-label={text("Board", "棋盘")}>
            <div className="gd-board-wrap">
              <div
                className="gd-wood"
                role="group"
                aria-label={text(
                  "Gomoku, row 1 at bottom",
                  "五子棋棋盘，最下面为第 1 行",
                )}
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
                          ? text("Black", "黑棋")
                          : stone === 2
                            ? text("White", "白棋")
                            : text("Empty", "空位"))
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
                    <span>{text("Both players ready", "双方就绪")}</span>
                    <strong>
                      {Math.max(
                        1,
                        Math.ceil(((l.startsAt || now) - now) / 1000),
                      )}
                    </strong>
                    <span>{text("Black plays first", "黑棋先行")}</span>
                    {humanRole && (
                      <button
                        className="gd-button"
                        disabled={busy}
                        onClick={() => void act("unready")}
                      >
                        {text("Cancel ready", "取消准备")}
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
                    ? text(
                        "Current conversations · invite on start",
                        "当前两个会话 · 开局后直接邀请",
                      )
                    : text(
                        "Choose the missing player on start",
                        "开局时补齐两位棋手",
                      )
                  : p.winner
                    ? text(
                        "Match complete · board retained",
                        "本局结束 · 棋盘保留供查看",
                      )
                    : myTurn
                      ? text(
                          "Your turn · click an intersection",
                          "轮到你了，点击交叉点落子",
                        )
                      : text(
                          "Watching · players act in their conversations",
                          "观战中 · 棋手在各自会话中行动",
                        )}
              </p>
              {humanRole && l.phase === "playing" && !p.winner && (
                <button
                  className="gd-button is-text"
                  disabled={busy || run?.status !== "running"}
                  onClick={() =>
                    void perform(() => pudding.interaction.handle(resign))
                  }
                >
                  {text("Resign", "认输")}
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
      <h3 id="picker-title">{text("Choose two players", "补齐两位棋手")}</h3>
      <p>
        {text("Selected", "已选")} {selected.length} / 2 ·{" "}
        {text("You can join too", "也可以自己上场")}
      </p>
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
                {player.human ? text("You", "我") : player.model?.name}
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
          {text("Invite and play", "邀请并开局")}
        </button>
        <button className="gd-button" onClick={close}>
          {text("Back", "返回")}
        </button>
      </div>
    </dialog>
  );
}
