import { useEffect, useState } from "react";
import {
  pudding,
  useWidgetLocale,
  useWidgetState,
  useWidgetInteraction,
} from "@pudding/widget";
import {
  Cpu,
  Gavel,
  Users,
  Check,
  RotateCcw,
  Sparkles,
  MessageSquare,
  ShieldAlert,
  Flame,
  Award,
  User,
  ChevronDown,
  X,
  Pause,
  Play,
} from "lucide-react";
import {
  type Role,
  type DebatePhase,
  type ArgumentItem,
} from "./types";
import {
  getActiveRoleForPhase,
  getRoundForPhase,
  roles,
} from "./tribunal";
import {
  lobby,
  position,
  start,
  forceStart,
  changeReadiness,
  argue,
  giveVerdict,
  setTopic,
  NotificationError,
  pause,
  resume,
} from "./game";
import { t, setLocale, getPresetTopics } from "./text";
import "./style.css";

type Candidates = Awaited<ReturnType<typeof pudding.interaction.candidates>>;
type SessionCandidate = Candidates["sessions"][number];
type Player = {
  id: string;
  name: string;
  human: boolean;
  model?: SessionCandidate["model"];
};

function DebateEmblemIcon({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="128" height="128" rx="24" fill="#4F46E5" />
      <circle cx="64" cy="64" r="44" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="2" />
      <path d="M24 30 C24 24 28 20 34 20 H78 C84 20 88 24 88 30 V56 C88 62 84 66 78 66 H50 L34 78 V66 H34 C28 66 24 62 24 56 Z" fill="#38BDF8" />
      <rect x="36" y="32" width="38" height="4.5" rx="2.25" fill="#FFFFFF" />
      <rect x="36" y="42" width="28" height="4.5" rx="2.25" fill="#FFFFFF" fillOpacity="0.85" />
      <rect x="36" y="52" width="20" height="4.5" rx="2.25" fill="#FFFFFF" fillOpacity="0.85" />
      <path d="M104 98 C104 104 100 108 94 108 H50 C44 108 40 104 40 98 V72 C40 66 44 62 50 62 H78 L94 50 V62 H94 C100 62 104 66 104 72 Z" fill="#F87171" />
      <rect x="52" y="74" width="38" height="4.5" rx="2.25" fill="#FFFFFF" />
      <rect x="52" y="84" width="28" height="4.5" rx="2.25" fill="#FFFFFF" fillOpacity="0.85" />
      <rect x="52" y="94" width="18" height="4.5" rx="2.25" fill="#FFFFFF" fillOpacity="0.85" />
      <g transform="translate(64, 64)">
        <path d="M0 -14 Q0 0 -14 0 Q0 0 0 14 Q0 0 14 0 Q0 0 0 -14 Z" fill="#FBBF24" />
        <circle cx="0" cy="0" r="3" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

export default function App() {
  useWidgetState();
  const locale = useWidgetLocale();
  if (locale) setLocale(locale);

  const l = lobby();
  const p = position();
  const run = useWidgetInteraction();

  const [candidates, setCandidates] = useState<Candidates | null>(null);
  const [pickerSlots, setPickerSlots] = useState<{
    Pro: string;
    Con: string;
    Judge: string;
  }>({ Pro: "", Con: "", Judge: "" });
  const [picker, setPicker] = useState(false);
  const [topicModal, setTopicModal] = useState(false);
  const [customTopic, setCustomTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 人类输入
  const [draftHeadline, setDraftHeadline] = useState("");
  const [draftContent, setDraftContent] = useState("");

  // 裁判裁决输入
  const [verdictWinner, setVerdictWinner] = useState<"Pro" | "Con" | "Draw">("Pro");
  const [verdictProScore, setVerdictProScore] = useState(55);
  const [verdictSummary, setVerdictSummary] = useState("");

  // 历史老轮次左右联动展开状态集合 (例如 [1] 表示双方的第 1 轮均联动展开)
  const [expandedRounds, setExpandedRounds] = useState<number[]>([]);

  function toggleRound(roundNum: number) {
    setExpandedRounds((prev) =>
      prev.includes(roundNum)
        ? prev.filter((r) => r !== roundNum)
        : [...prev, roundNum],
    );
  }

  const human = run?.participants.find((part) => part.kind === "human");
  const humanRole = human && roles.find((role) => l.seats[role] === human.id);

  const activeRole = getActiveRoleForPhase(l.phase, Boolean(l.seats.Judge));
  const myTurn =
    run?.status === "running" &&
    !!humanRole &&
    l.phase !== "lobby" &&
    activeRole === humanRole;

  async function perform(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function initPickerFromSessions(c: Candidates) {
    // 首次默认选择：优先采用当前分屏推荐的 preferredSessionIDs，其余按会话最近活跃时间（原始 sessions 顺序）选取
    const sessions = c.sessions || [];
    const preferred = (c.preferredSessionIDs || []).filter((id) =>
      sessions.some((s) => s.id === id),
    );
    const pool = [
      ...preferred,
      ...sessions.map((s) => s.id).filter((id) => !preferred.includes(id)),
    ];

    if (pool.length >= 2) {
      setPickerSlots({
        Pro: pool[0],
        Con: pool[1],
        Judge: "",
      });
    } else if (pool.length === 1) {
      setPickerSlots({
        Pro: "@me",
        Con: pool[0],
        Judge: "",
      });
    } else {
      setPickerSlots({
        Pro: "@me",
        Con: "",
        Judge: "",
      });
    }
  }

  function resolveSessionChoice(participantID: string | null | undefined): string {
    if (!participantID) return "";
    if (human?.id && participantID === human.id) return "@me";
    const session = candidates?.sessions.find(
      (s) =>
        s.participantID === participantID ||
        s.id === participantID ||
        (run?.participants.find((p) => p.id === participantID) as unknown as { sessionID?: string })?.sessionID === s.id ||
        run?.participants.find((p) => p.id === participantID)?.name === s.name,
    );
    return session ? session.id : participantID;
  }

  function openPickerModal() {
    if (l.seats.Pro || l.seats.Con) {
      // 保持当前已有辩手席位，红蓝严格对应不乱反转
      setPickerSlots({
        Pro: resolveSessionChoice(l.seats.Pro),
        Con: resolveSessionChoice(l.seats.Con),
        Judge: resolveSessionChoice(l.seats.Judge),
      });
    } else if (candidates && (!pickerSlots.Pro || !pickerSlots.Con)) {
      initPickerFromSessions(candidates);
    }
    setPicker(true);
  }

  async function loadCandidates(): Promise<Candidates | null> {
    try {
      const value = await pudding.interaction.candidates();
      setCandidates(value);
      return value;
    } catch (e) {
      setError(String(e));
      return null;
    }
  }

  useEffect(() => {
    void loadCandidates().then((val) => {
      if (val && !l.seats.Pro && !l.seats.Con) initPickerFromSessions(val);
    });
  }, []);

  // 当运行状态或参与者列表变化时，刷新候选以保持模型信息和图标映射最新
  useEffect(() => {
    void loadCandidates();
  }, [run?.status, run?.participants?.map((part) => `${part.id}:${part.name}`).join(",")]);

  const getPlayerForRole = (role: Role): Player | undefined => {
    const participantID = l.seats[role];
    if (!participantID) return undefined;
    const participant = run?.participants.find((part) => part.id === participantID);
    if (!participant) return undefined;
    const isHuman = participant.kind === "human";

    // 强健的多层匹配策略：participantID、sessionID 属性、会话名字双向映射
    const sessionModel = candidates?.sessions.find(
      (s) =>
        (s.participantID && s.participantID === participantID) ||
        s.id === participantID ||
        (participant as unknown as { sessionID?: string }).sessionID === s.id ||
        (participant.name && s.name === participant.name),
    )?.model;

    return {
      id: participantID,
      name: isHuman ? t("playerHuman") : participant.name,
      human: isHuman,
      model: sessionModel,
    };
  };

  const proPlayer = getPlayerForRole("Pro");
  const conPlayer = getPlayerForRole("Con");
  const judgePlayer = getPlayerForRole("Judge");

  const isProMe = Boolean(proPlayer?.id && human?.id && proPlayer.id === human.id);
  const isConMe = Boolean(conPlayer?.id && human?.id && conPlayer.id === human.id);
  const isJudgeMe = Boolean(judgePlayer?.id && human?.id && judgePlayer.id === human.id);

  function renderDebaterCard(role: "Pro" | "Con") {
    const player = role === "Pro" ? proPlayer : conPlayer;
    const isMe = role === "Pro" ? isProMe : isConMe;
    const isRoleActive = l.phase !== "lobby" && activeRole === role;
    const isHumanTurn = myTurn && activeRole === role;

    const roleArgs = p.arguments.filter((a) => a.role === role);
    const oldArgs = roleArgs.slice(0, -1);
    const latestArg = roleArgs[roleArgs.length - 1];

    const currentRoundNum = getRoundForPhase(l.phase);
    const hasCurrentRoundArg = roleArgs.some((a) => a.round === currentRoundNum);

    return (
      <div
        className={`db-fighter-card is-${role.toLowerCase()} ${
          isRoleActive ? "is-active" : ""
        }`}
      >
        {/* 顶部辩手信息栏 */}
        <div className="db-fighter-header">
          <div className="db-fighter-role-tag">
            {role === "Pro" ? t("rolePro") : t("roleCon")}
          </div>
          <div className="db-fighter-state">
            {l.phase === "lobby" ? (
              !player ? (
                <span className="db-tag-waiting">{t("statusWaitingSeat")}</span>
              ) : l.ready.includes(player.id) ? (
                <span className="db-tag-ready">
                  <Check size={12} />
                  <span>{t("readyBtn")}</span>
                </span>
              ) : (
                <span className="db-tag-waiting">{t("statusWaitingReady")}</span>
              )
            ) : run?.status === "paused" ? (
              <span className="db-tag-idle">{t("statusPaused")}</span>
            ) : isRoleActive ? (
              <span className="db-tag-thinking">{t("thinking")}</span>
            ) : (
              <span className="db-tag-idle">{t("waitingTurn")}</span>
            )}

            {player && isMe && l.phase === "lobby" && (
              <button
                type="button"
                className={`db-btn db-btn-sm ${
                  l.ready.includes(player.id) ? "" : "is-primary"
                }`}
                disabled={busy}
                onClick={() => {
                  const pid = player.id;
                  void perform(() =>
                    pudding.interaction.handle((c) =>
                      changeReadiness(!l.ready.includes(pid), c),
                    ),
                  );
                }}
              >
                {l.ready.includes(player.id) ? t("cancelReady") : t("readyBtn")}
              </button>
            )}
          </div>
        </div>

        {/* 辩手头像与名称 */}
        <div className="db-fighter-main">
          <div className={`db-fighter-avatar is-${role.toLowerCase()}`}>
            {player?.human ? (
              <User size={22} />
            ) : player?.model?.icon ? (
              <img src={player.model.icon} alt="" className="db-avatar-img" />
            ) : role === "Pro" ? (
              <Flame size={22} />
            ) : (
              <ShieldAlert size={22} />
            )}
          </div>
          <div className="db-fighter-info">
            <strong className="db-fighter-name">
              {player?.name || (role === "Pro" ? t("unseatedPro") : t("unseatedCon"))}
              {isMe && <span className="db-you-badge">{t("youIndicator")}</span>}
            </strong>
            <small className="db-fighter-model">
              {player?.model?.name || (player?.human ? t("playerHuman") : player ? t("playerModel") : t("unseated"))}
            </small>
          </div>
        </div>

        {/* 辩词陈述区域 (内嵌于辩手卡片内部) */}
        <div className="db-fighter-debates">
          {/* 1. 历史老轮次折叠 (左右同轮次联动展开) */}
          {oldArgs.map((arg) => {
            const roundTitle =
              arg.round === 1
                ? t("round1Title")
                : arg.round === 2
                  ? t("round2Title")
                  : t("round3Title");
            const isOpen = expandedRounds.includes(arg.round);
            return (
              <div key={arg.id} className={`db-arg-fold ${isOpen ? "is-open" : ""}`}>
                <button
                  type="button"
                  className="db-arg-fold-summary"
                  onClick={() => toggleRound(arg.round)}
                >
                  <div className="db-arg-fold-title">
                    <ChevronDown
                      size={14}
                      className={`db-arg-fold-icon ${isOpen ? "is-open" : ""}`}
                    />
                    <span className="db-arg-fold-badge">{roundTitle}</span>
                    <span className="db-arg-fold-headline" title={arg.headline}>
                      {arg.headline}
                    </span>
                  </div>
                  <span className="db-arg-time">
                    {new Date(arg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </button>
                {isOpen && (
                  <div className="db-arg-fold-body">
                    <div className="db-arg-content">{arg.content}</div>
                  </div>
                )}
              </div>
            );
          })}

          {/* 2. 最新一轮辩词：直接完整展开展示 */}
          {latestArg && (
            <div className={`db-arg-latest is-${role.toLowerCase()}`}>
              <div className="db-arg-latest-header">
                <span className="db-arg-latest-badge">
                  {role === "Pro" ? <Flame size={13} /> : <ShieldAlert size={13} />}
                  <span>
                    {latestArg.round === 1
                      ? t("round1Title")
                      : latestArg.round === 2
                        ? t("round2Title")
                        : t("round3Title")}
                  </span>
                </span>
                <span className="db-arg-time">
                  {new Date(latestArg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <h4 className="db-arg-latest-headline">{latestArg.headline}</h4>
              <div className="db-arg-latest-content">{latestArg.content}</div>
            </div>
          )}

          {/* 3. 正在思考：当前轮到该辩手，且本轮辩词尚未生成，且非人类发言回合 */}
          {isRoleActive && !hasCurrentRoundArg && !isHumanTurn && (
            <div className="db-debater-thinking">
              <span className="db-versus-phase-dot" />
              <span>{t("thinking")}</span>
            </div>
          )}

          {/* 4. 人类玩家直接在此卡片内输入陈词 */}
          {isHumanTurn && !hasCurrentRoundArg && (
            <div className="db-human-card-panel">
              <div className="db-human-card-header">
                <MessageSquare size={14} />
                <span>{t("submitArgBtn")}</span>
              </div>
              <input
                type="text"
                className="db-human-input"
                placeholder={t("headlinePlaceholder")}
                maxLength={60}
                value={draftHeadline}
                onChange={(e) => setDraftHeadline(e.target.value)}
              />
              <textarea
                className="db-human-textarea"
                placeholder={t("contentPlaceholder")}
                maxLength={400}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
              />
              <button
                type="button"
                className="db-btn is-primary db-btn-sm"
                disabled={busy || !draftHeadline.trim() || !draftContent.trim()}
                onClick={() =>
                  void perform(async () => {
                    await pudding.interaction.handle((c) =>
                      argue(
                        {
                          headline: draftHeadline,
                          content: draftContent,
                        },
                        c,
                      ),
                    );
                    setDraftHeadline("");
                    setDraftContent("");
                  })
                }
              >
                <span>{t("submitArgBtn")}</span>
              </button>
            </div>
          )}

          {/* 5. 初始空闲等待状态 */}
          {roleArgs.length === 0 && !isRoleActive && (
            <div className="db-debater-idle">
              <span>{l.phase === "lobby" ? t("statusWaitingReady") : t("waitingTurn")}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="db-app">
      {/* 头部导航与状态 */}
      <header className="db-header">
        <div className="db-heading">
          <div className="db-emblem">
            <DebateEmblemIcon size={24} />
          </div>
          <div>
            <h1>{t("appTitle")}</h1>
          </div>
        </div>

        <div className="db-header-actions">
          {l.phase === "lobby" && (
            <button
              type="button"
              className="db-btn is-primary"
              disabled={busy}
              onClick={openPickerModal}
            >
              <Users size={16} />
              <span>{t("startDebate")}</span>
            </button>
          )}

          {l.phase !== "lobby" && !p.verdict && run?.status !== "paused" && (
            <button
              type="button"
              className="db-btn"
              disabled={busy}
              onClick={() => void perform(pause)}
              title={t("pauseDebate")}
            >
              <Pause size={16} />
              <span>{t("pauseDebate")}</span>
            </button>
          )}

          {l.phase !== "lobby" && !p.verdict && run?.status === "paused" && (
            <>
              <button
                type="button"
                className="db-btn is-primary"
                disabled={busy}
                onClick={() => void perform(resume)}
              >
                <Play size={16} />
                <span>{t("continueDebate")}</span>
              </button>
              <button
                type="button"
                className="db-btn"
                disabled={busy}
                onClick={openPickerModal}
              >
                <RotateCcw size={16} />
                <span>{t("newDebate")}</span>
              </button>
            </>
          )}

          {Boolean(p.verdict) && (
            <button
              type="button"
              className="db-btn is-primary"
              disabled={busy}
              onClick={openPickerModal}
            >
              <RotateCcw size={16} />
              <span>{t("newDebate")}</span>
            </button>
          )}
        </div>
      </header>

      {/* 辩题展示横幅 */}
      <div className="db-topic-bar">
        <div className="db-topic-left">
          <span className="db-topic-tag">{t("topicLabel")}</span>
          <span className="db-topic-text" title={l.topic}>
            {l.topic}
          </span>
        </div>
        {l.phase === "lobby" && (
          <button
            type="button"
            className="db-btn"
            disabled={busy}
            onClick={() => setTopicModal(true)}
          >
            <span>{t("changeTopic")}</span>
          </button>
        )}
      </div>

      {/* 辩方卡片与思辨交锋对决横幅 (Debate Versus & Momentum Banner) */}
      <main className="db-versus-banner db-scale-card db-stream">
        {/* 顶部阶段状态与审判席信息 */}
        <div className="db-versus-header">
          <div className="db-versus-phase">
            <span className="db-versus-phase-dot" />
            <span className="db-versus-phase-text">
              {l.phase === "lobby"
                ? t("phaseWaiting")
                : l.phase === "verdict"
                  ? t("phaseVerdict")
                  : l.phase === "round1_pro"
                    ? t("phaseRound1Pro")
                    : l.phase === "round1_con"
                      ? t("phaseRound1Con")
                      : l.phase === "round2_pro"
                        ? t("phaseRound2Pro")
                        : l.phase === "round2_con"
                          ? t("phaseRound2Con")
                          : l.phase === "round3_pro"
                            ? t("phaseRound3Pro")
                            : l.phase === "round3_con"
                              ? t("phaseRound3Con")
                              : t("thinking")}
            </span>
          </div>

          <div className="db-versus-judge-info">
            {judgePlayer ? (
              <span className="db-versus-judge-tag">
                {judgePlayer.human ? (
                  <User size={13} />
                ) : judgePlayer.model?.icon ? (
                  <img src={judgePlayer.model.icon} alt="" className="db-judge-logo-img" />
                ) : (
                  <Gavel size={13} />
                )}
                <span>
                  {t("roleJudgeShort")}: {judgePlayer.name}
                  {judgePlayer.model?.name ? ` (${judgePlayer.model.name})` : ""}
                </span>
                {isJudgeMe && (
                  <span className="db-you-badge">{t("youIndicator")}</span>
                )}
              </span>
            ) : (
              <span className="db-versus-judge-tag is-auto">
                <Cpu size={13} />
                <span>{t("seatAutoJudge")}</span>
              </span>
            )}
          </div>
        </div>

        {/* 格斗对决能量槽 (顶部横贯全宽) */}
        <div className="db-versus-scale-core">
          <div className="db-versus-score-row">
            <span className="db-scale-score is-pro">
              <Flame size={16} />
              <span>{t("roleProShort")} {p.proAdvantage}%</span>
            </span>

            <span className="db-scale-pill">
              {p.proAdvantage === 50
                ? t("scaleTie")
                : p.proAdvantage > 50
                  ? `${t("scaleProAdvantage")} +${p.proAdvantage - 50}%`
                  : `${t("scaleConAdvantage")} +${50 - p.proAdvantage}%`}
            </span>

            <span className="db-scale-score is-con">
              <span>{100 - p.proAdvantage}% {t("roleConShort")}</span>
              <ShieldAlert size={16} />
            </span>
          </div>

          <div className="db-scale-track">
            <div
              className="db-scale-bar-pro"
              style={{ width: `${p.proAdvantage}%` }}
            />
            <div
              className="db-scale-bar-con"
              style={{ width: `${100 - p.proAdvantage}%` }}
            />
            <div
              className="db-scale-pivot"
              style={{ left: `${p.proAdvantage}%` }}
            />
          </div>
        </div>

        {/* 双方辩手对垒舞台 (辩词直接内嵌于卡片内：最新展开，老轮折叠) */}
        <div className="db-fighters-grid">
          {renderDebaterCard("Pro")}
          {renderDebaterCard("Con")}
        </div>

        {/* 终局裁决书展示 */}
        {p.verdict && (
          <div className="db-verdict-card">
            <Award size={40} style={{ margin: "0 auto 12px auto", color: "var(--db-judge)" }} />
            <div className="db-verdict-banner">
              {p.verdict.winner === "Draw"
                ? t("winnerDraw")
                : t("winnerNotice", {
                    winner:
                      p.verdict.winner === "Pro"
                        ? t("winnerPro")
                        : t("winnerCon"),
                  })}
            </div>

            <div className="db-verdict-scores">
              <span style={{ color: "var(--db-pro)" }}>
                {t("roleProShort")} {p.verdict.proScore}{t("scoreUnit")}
              </span>
              <span style={{ opacity: 0.4 }}>vs</span>
              <span style={{ color: "var(--db-con)" }}>
                {p.verdict.conScore}{t("scoreUnit")} {t("roleConShort")}
              </span>
            </div>

            <div className="db-verdict-summary">
              <strong>{t("verdictSummaryLabel")}</strong>
              <p style={{ margin: "8px 0 0 0" }}>{p.verdict.summary}</p>
            </div>
          </div>
        )}

        {/* 人类裁判敲锤宣判面板 */}
        {myTurn && l.phase === "verdict" && !p.verdict && (
          <div className="db-human-panel" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <Gavel size={16} />
              <span>{t("deliverVerdictBtn")}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className={`db-btn ${verdictWinner === "Pro" ? "is-pro" : ""}`}
                onClick={() => {
                  setVerdictWinner("Pro");
                  setVerdictProScore(58);
                }}
              >
                {t("btnVerdictPro")}
              </button>
              <button
                type="button"
                className={`db-btn ${verdictWinner === "Con" ? "is-con" : ""}`}
                onClick={() => {
                  setVerdictWinner("Con");
                  setVerdictProScore(42);
                }}
              >
                {t("btnVerdictCon")}
              </button>
              <button
                type="button"
                className={`db-btn ${verdictWinner === "Draw" ? "is-primary" : ""}`}
                onClick={() => {
                  setVerdictWinner("Draw");
                  setVerdictProScore(50);
                }}
              >
                {t("btnVerdictDraw")}
              </button>
            </div>
            <textarea
              className="db-human-textarea"
              placeholder={t("verdictSummaryPlaceholder")}
              value={verdictSummary}
              onChange={(e) => setVerdictSummary(e.target.value)}
            />
            <button
              type="button"
              className="db-btn is-judge"
              disabled={busy || !verdictSummary.trim()}
              onClick={() =>
                void perform(async () => {
                  await pudding.interaction.handle((c) =>
                    giveVerdict(
                      {
                        winner: verdictWinner,
                        proScore: verdictProScore,
                        conScore: 100 - verdictProScore,
                        summary: verdictSummary,
                      },
                      c,
                    ),
                  );
                })
              }
            >
              <span>{t("deliverVerdictBtn")}</span>
            </button>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="db-slot-alert" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}
      </main>

      {/* 辩题更换弹窗 */}
      {topicModal && renderTopicModal()}

      {/* 辩手选择弹窗 */}
      {picker && renderPickerModal()}
    </div>
  );

  function renderTopicModal() {
    return (
      <div className="db-modal-overlay" onClick={() => setTopicModal(false)}>
        <div className="db-modal" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="db-modal-title" style={{ margin: 0 }}>{t("changeTopic")}</h2>
            <button
              type="button"
              className="db-btn"
              style={{ padding: "4px 8px" }}
              onClick={() => setTopicModal(false)}
            >
              <X size={16} />
            </button>
          </div>
          <p className="db-modal-sub" style={{ marginTop: 8 }}>{t("presetTopicSelect")}</p>

          <div className="db-candidate-list">
            {getPresetTopics().map((topic) => (
              <div
                key={topic}
                className={`db-candidate-item ${l.topic === topic ? "is-selected" : ""}`}
                onClick={() => {
                  void perform(() => setTopic(topic));
                  setTopicModal(false);
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500 }}>{topic}</span>
                {l.topic === topic && <Check size={16} color="var(--db-primary)" />}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <p className="db-modal-sub" style={{ marginBottom: 6 }}>
              {t("customTopicInput")}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                className="db-human-input"
                placeholder={t("topicInputPlaceholder")}
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
              />
              <button
                type="button"
                className="db-btn is-primary"
                disabled={!customTopic.trim() || busy}
                onClick={() => {
                  void perform(() => setTopic(customTopic));
                  setCustomTopic("");
                  setTopicModal(false);
                }}
              >
                {t("btnSetTopic")}
              </button>
            </div>
          </div>

          <div className="db-modal-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="db-btn"
              onClick={() => setTopicModal(false)}
            >
              {t("btnCancel")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderPickerModal() {
    const list = candidates?.sessions || [];
    const proChoice = pickerSlots.Pro;
    const conChoice = pickerSlots.Con;
    const judgeChoice = pickerSlots.Judge;

    const missingDebaters = !proChoice || !conChoice;
    const debaterConflict = Boolean(proChoice && conChoice && proChoice === conChoice);
    const judgeConflict = Boolean(
      judgeChoice && (judgeChoice === proChoice || judgeChoice === conChoice),
    );
    const canSubmit = !missingDebaters && !debaterConflict && !judgeConflict && !busy;

    return (
      <div className="db-modal-overlay" onClick={() => setPicker(false)}>
        <div className="db-modal" onClick={(e) => e.stopPropagation()}>
          <h2 className="db-modal-title">{t("pickerTitle")}</h2>
          <p className="db-modal-sub">{t("pickerSubtitle")}</p>

          <div className="db-slot-config-list">
            {/* 正方席位 */}
            <div className="db-slot-card is-pro">
              <div className="db-slot-header">
                <span className="db-slot-badge is-pro">{t("seatProTitle")}</span>
                <span className="db-slot-desc">{t("seatProDesc")}</span>
              </div>
              <CustomSeatSelect
                value={proChoice}
                onChange={(val) => setPickerSlots((prev) => ({ ...prev, Pro: val }))}
                sessions={list}
                placeholder={t("selectProPlaceholder")}
              />
            </div>

            {/* 反方席位 */}
            <div className="db-slot-card is-con">
              <div className="db-slot-header">
                <span className="db-slot-badge is-con">{t("seatConTitle")}</span>
                <span className="db-slot-desc">{t("seatConDesc")}</span>
              </div>
              <CustomSeatSelect
                value={conChoice}
                onChange={(val) => setPickerSlots((prev) => ({ ...prev, Con: val }))}
                sessions={list}
                placeholder={t("selectConPlaceholder")}
              />
            </div>

            {/* 审判长席位 */}
            <div className="db-slot-card is-judge">
              <div className="db-slot-header">
                <span className="db-slot-badge is-judge">{t("seatJudgeTitle")}</span>
                <span className="db-slot-desc">{t("seatJudgeDesc")}</span>
              </div>
              <CustomSeatSelect
                value={judgeChoice}
                onChange={(val) => setPickerSlots((prev) => ({ ...prev, Judge: val }))}
                sessions={list}
                placeholder={t("seatSelectAutoJudge")}
                allowAutoJudge
              />
            </div>
          </div>

          {/* 校验冲突提示 */}
          {error && (
            <div className="db-slot-alert">
              {error}
            </div>
          )}
          {debaterConflict && (
            <div className="db-slot-alert">{t("seatConflictError")}</div>
          )}
          {judgeConflict && (
            <div className="db-slot-alert">{t("seatConflictJudgeError")}</div>
          )}
          {missingDebaters && !debaterConflict && (
            <div className="db-slot-alert">{t("seatNeedBothDebaters")}</div>
          )}

          <div className="db-modal-actions">
            <button
              type="button"
              className="db-btn"
              disabled={busy}
              onClick={() => setPicker(false)}
            >
              {t("btnCancel")}
            </button>
            <button
              type="button"
              className="db-btn is-primary"
              disabled={!canSubmit}
              onClick={() =>
                void perform(async () => {
                  await start(
                    {
                      Pro: proChoice,
                      Con: conChoice,
                      Judge: judgeChoice || null,
                    },
                    l.topic,
                  );
                  setPicker(false);
                })
              }
            >
              {busy ? t("startingDebate") : t("confirmStartDebate")}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

function CustomSeatSelect({
  value,
  onChange,
  sessions,
  placeholder,
  allowAutoJudge = false,
}: {
  value: string;
  onChange: (val: string) => void;
  sessions: SessionCandidate[];
  placeholder: string;
  allowAutoJudge?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const isMe = value === "@me";
  const isAuto = allowAutoJudge && value === "";
  const current = sessions.find((s) => s.id === value || s.participantID === value);

  return (
    <div className="db-custom-select-box">
      <button
        type="button"
        className="db-custom-select-trigger"
        onClick={() => setOpen(!open)}
      >
        <div className="db-custom-select-current">
          {isMe ? (
            <div className="db-select-avatar is-human">
              <User size={15} />
            </div>
          ) : isAuto ? (
            <div className="db-select-avatar is-auto">
              <Cpu size={15} />
            </div>
          ) : current?.model?.icon ? (
            <img src={current.model.icon} alt="" className="db-select-logo-img" />
          ) : (
            <div className="db-select-avatar is-model">
              <Sparkles size={15} />
            </div>
          )}

          <div className="db-select-texts">
            <span className="db-select-name">
              {isMe
                ? t("seatSelectPlayerMe")
                : isAuto
                  ? t("seatSelectAutoJudge")
                  : current
                    ? current.name
                    : placeholder}
            </span>
            {current?.model?.name && (
              <span className="db-select-model-badge">{current.model.name}</span>
            )}
          </div>
        </div>
        <ChevronDown size={15} className={`db-select-chevron ${open ? "is-open" : ""}`} />
      </button>

      {open && (
        <>
          <div
            className="db-custom-select-backdrop"
            onClick={() => setOpen(false)}
          />
          <div className="db-custom-select-menu">
            {allowAutoJudge && (
              <div
                className={`db-custom-select-option ${value === "" ? "is-chosen" : ""}`}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                <div className="db-option-left">
                  <div className="db-select-avatar is-auto">
                    <Cpu size={15} />
                  </div>
                  <div className="db-select-texts">
                    <span className="db-select-name">{t("seatSelectAutoJudge")}</span>
                  </div>
                </div>
                {value === "" && <Check size={15} className="db-option-check" />}
              </div>
            )}

            <div
              className={`db-custom-select-option ${value === "@me" ? "is-chosen" : ""}`}
              onClick={() => {
                onChange("@me");
                setOpen(false);
              }}
            >
              <div className="db-option-left">
                <div className="db-select-avatar is-human">
                  <User size={15} />
                </div>
                <div className="db-select-texts">
                  <span className="db-select-name">{t("seatSelectPlayerMe")}</span>
                </div>
              </div>
              {value === "@me" && <Check size={15} className="db-option-check" />}
            </div>

            {sessions.map((s) => {
              const active = value === s.id || value === s.participantID;
              return (
                <div
                  key={s.id}
                  className={`db-custom-select-option ${active ? "is-chosen" : ""}`}
                  onClick={() => {
                    onChange(s.id);
                    setOpen(false);
                  }}
                >
                  <div className="db-option-left">
                    {s.model?.icon ? (
                      <img src={s.model.icon} alt="" className="db-select-logo-img" />
                    ) : (
                      <div className="db-select-avatar is-model">
                        <Sparkles size={15} />
                      </div>
                    )}
                    <div className="db-select-texts">
                      <span className="db-select-name">{s.name}</span>
                      <span className="db-select-model-badge">{s.model?.name}</span>
                    </div>
                  </div>
                  {active && <Check size={15} className="db-option-check" />}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
