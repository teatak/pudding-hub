import { useEffect, useState } from "react";
import {
  pudding,
  useWidgetLocale,
  useWidgetState,
} from "@pudding/widget";
import {
  Scale,
  Gavel,
  Users,
  Check,
  RotateCcw,
  Sparkles,
  MessageSquare,
  ShieldAlert,
  Flame,
  Award,
  BookOpen,
} from "lucide-react";
import {
  type Role,
  type DebatePhase,
  type ArgumentItem,
} from "./types";
import {
  PRESET_TOPICS,
  getActiveRoleForPhase,
  getRoundForPhase,
  roles,
} from "./tribunal";
import {
  lobby,
  position,
  start,
  changeReadiness,
  argue,
  giveVerdict,
  setTopic,
  NotificationError,
} from "./game";
import { t, setLocale } from "./text";
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
      <rect width="128" height="128" rx="20" fill="#4F46E5" />
      <circle cx="64" cy="68" r="46" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="2" />
      <path d="M62 40h4v54h-4z" fill="#F8FAFC" />
      <path d="M48 94h32v6H48z" fill="#E2E8F0" rx="2" />
      <circle cx="64" cy="38" r="6" fill="#FBBF24" />
      <path d="M28 46 L100 42" stroke="#F8FAFC" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 46 L20 68 M30 46 L40 68" stroke="#CBD5E1" strokeWidth="1.5" />
      <path d="M16 68 C16 76 44 76 44 68 Z" fill="#60A5FA" />
      <path d="M98 42 L88 64 M98 42 L108 64" stroke="#CBD5E1" strokeWidth="1.5" />
      <path d="M84 64 C84 72 112 72 112 64 Z" fill="#F87171" />
    </svg>
  );
}

export default function App() {
  useWidgetState();
  const locale = useWidgetLocale();
  if (locale) setLocale(locale);

  const l = lobby();
  const p = position();
  const run = pudding.interaction.read();

  const [candidates, setCandidates] = useState<Candidates | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const [topicModal, setTopicModal] = useState(false);
  const [customTopic, setCustomTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 人类输入
  const [draftHeadline, setDraftHeadline] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftComment, setDraftComment] = useState("");

  // 裁判裁决输入
  const [verdictWinner, setVerdictWinner] = useState<"Pro" | "Con" | "Draw">("Pro");
  const [verdictProScore, setVerdictProScore] = useState(55);
  const [verdictSummary, setVerdictSummary] = useState("");

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

  async function loadCandidates() {
    try {
      const value = await pudding.interaction.candidates();
      setCandidates(value);
      setSelected(value.preferredSessionIDs.slice(0, 3));
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    if (!l.round && !run) {
      void loadCandidates();
    }
  }, [l.round, run]);

  const getPlayerForRole = (role: Role): Player | undefined => {
    const participantID = l.seats[role];
    if (!participantID) return undefined;
    const participant = run?.participants.find((part) => part.id === participantID);
    if (!participant) return undefined;
    const isHuman = participant.kind === "human";
    const sessionModel = candidates?.sessions.find((s) => s.participantID === participantID)?.model;
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
          {l.phase === "lobby" ? (
            <button
              type="button"
              className="db-btn is-primary"
              disabled={busy}
              onClick={() => {
                void loadCandidates();
                setPicker(true);
              }}
            >
              <Users size={16} />
              <span>{t("startDebate")}</span>
            </button>
          ) : (
            <button
              type="button"
              className="db-btn"
              disabled={busy}
              onClick={() => {
                void loadCandidates();
                setPicker(true);
              }}
            >
              <RotateCcw size={16} />
              <span>{t("pickerTitle")}</span>
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

      {/* 思辨胜负天平 (Debate Scale) */}
      <div className="db-scale-card">
        <div className="db-scale-header">
          <span className="db-scale-label-pro">
            <Flame size={16} />
            <span>
              {t("roleProShort")} {p.proAdvantage}%
            </span>
          </span>

          <span className="db-scale-balance-badge">
            {p.proAdvantage === 50
              ? t("scaleTie")
              : p.proAdvantage > 50
                ? `${t("scaleProAdvantage")} +${p.proAdvantage - 50}%`
                : `${t("scaleConAdvantage")} +${50 - p.proAdvantage}%`}
          </span>

          <span className="db-scale-label-con">
            <span>
              {100 - p.proAdvantage}% {t("roleConShort")}
            </span>
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
          <div className="db-scale-pivot" />
        </div>
      </div>

      {/* 竞技场主区：左侧交锋长廊 + 右侧席位 */}
      <div className="db-arena">
        {/* 左侧观点长廊 */}
        <div className="db-stream">
          {p.arguments.length === 0 && !p.verdict ? (
            <div className="db-arg-card" style={{ textAlign: "center", padding: "40px 20px" }}>
              <BookOpen size={36} style={{ margin: "0 auto 12px auto", opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: 14, color: "var(--db-muted)" }}>
                {t("noArgumentsYet")}
              </p>
            </div>
          ) : null}

          {/* 渲染各轮辩词 */}
          {[1, 2, 3].map((roundNum) => {
            const roundArgs = p.arguments.filter((a) => a.round === roundNum);
            if (roundArgs.length === 0) return null;

            const roundTitle =
              roundNum === 1
                ? t("round1Title")
                : roundNum === 2
                  ? t("round2Title")
                  : t("round3Title");

            return (
              <div key={roundNum} className="space-y-4">
                <div className="db-round-divider">
                  <div className="db-round-line" />
                  <span className="db-round-badge">{roundTitle}</span>
                  <div className="db-round-line" />
                </div>

                {roundArgs.map((arg) => (
                  <article
                    key={arg.id}
                    className={`db-arg-card is-${arg.role.toLowerCase()}`}
                  >
                    <div className="db-arg-header">
                      <span className="db-arg-role-tag">
                        {arg.role === "Pro"
                          ? t("roleProShort")
                          : arg.role === "Con"
                            ? t("roleConShort")
                            : t("roleJudgeShort")}
                        <span>· {arg.speakerName || t("playerModel")}</span>
                      </span>
                      <span className="db-arg-time">
                        {new Date(arg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <h3 className="db-arg-headline">{arg.headline}</h3>
                    <div className="db-arg-content">{arg.content}</div>

                    {arg.comment && (
                      <div className="db-arg-comment">
                        💬 {arg.comment}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            );
          })}

          {/* 终局裁决书展示 */}
          {p.verdict && (
            <div className="db-verdict-card">
              <Award size={40} style={{ margin: "0 auto 12px auto", color: "var(--db-judge)" }} />
              <div className="db-verdict-banner">
                {t("winnerNotice", {
                  winner:
                    p.verdict.winner === "Pro"
                      ? t("winnerPro")
                      : p.verdict.winner === "Con"
                        ? t("winnerCon")
                        : t("winnerDraw"),
                })}
              </div>

              <div className="db-verdict-scores">
                <span style={{ color: "var(--db-pro)" }}>
                  {t("roleProShort")} {p.verdict.proScore}分
                </span>
                <span style={{ opacity: 0.4 }}>vs</span>
                <span style={{ color: "var(--db-con)" }}>
                  {p.verdict.conScore}分 {t("roleConShort")}
                </span>
              </div>

              <div className="db-verdict-summary">
                <strong>法庭结案综述：</strong>
                <p style={{ margin: "8px 0 0 0" }}>{p.verdict.summary}</p>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div style={{ color: "#ef4444", fontSize: 13, padding: "8px 12px", background: "#fee2e2", borderRadius: 8 }}>
              {error}
            </div>
          )}
        </div>

        {/* 右侧席位与操作区 */}
        <aside className="db-seats">
          {/* 裁判席 */}
          {l.seats.Judge && renderSeat("Judge", judgePlayer)}

          {/* 正方席位 */}
          {renderSeat("Pro", proPlayer)}

          {/* 反方席位 */}
          {renderSeat("Con", conPlayer)}

          {/* 人类辩手发言面板 */}
          {myTurn && l.phase !== "verdict" && (
            <div className="db-human-panel">
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {t("submitArgBtn")}
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
              <input
                type="text"
                className="db-human-input"
                placeholder={t("commentPlaceholder")}
                maxLength={40}
                value={draftComment}
                onChange={(e) => setDraftComment(e.target.value)}
              />
              <button
                type="button"
                className="db-btn is-primary"
                disabled={busy || !draftHeadline.trim() || !draftContent.trim()}
                onClick={() =>
                  void perform(async () => {
                    await pudding.interaction.handle((c) =>
                      argue(
                        {
                          headline: draftHeadline,
                          content: draftContent,
                          comment: draftComment.trim() || undefined,
                        },
                        c,
                      ),
                    );
                    setDraftHeadline("");
                    setDraftContent("");
                    setDraftComment("");
                  })
                }
              >
                <span>{t("submitArgBtn")}</span>
              </button>
            </div>
          )}

          {/* 人类裁判敲锤宣判面板 */}
          {myTurn && l.phase === "verdict" && (
            <div className="db-human-panel">
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                <Gavel size={16} style={{ display: "inline", marginRight: 6 }} />
                {t("deliverVerdictBtn")}
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
                  正方胜
                </button>
                <button
                  type="button"
                  className={`db-btn ${verdictWinner === "Con" ? "is-con" : ""}`}
                  onClick={() => {
                    setVerdictWinner("Con");
                    setVerdictProScore(42);
                  }}
                >
                  反方胜
                </button>
                <button
                  type="button"
                  className={`db-btn ${verdictWinner === "Draw" ? "is-primary" : ""}`}
                  onClick={() => {
                    setVerdictWinner("Draw");
                    setVerdictProScore(50);
                  }}
                >
                  平局
                </button>
              </div>
              <textarea
                className="db-human-textarea"
                placeholder="审判长结案综述与判决评语..."
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
        </aside>
      </div>

      {/* 辩题更换弹窗 */}
      {topicModal && renderTopicModal()}

      {/* 辩手选择弹窗 */}
      {picker && renderPickerModal()}
    </div>
  );

  function renderSeat(role: Role, player?: Player) {
    const isCurrent = l.phase !== "lobby" && activeRole === role;
    const isMe = player?.id === human?.id;
    const isReady = player && l.ready.includes(player.id);

    return (
      <article
        key={role}
        className={`db-seat-card ${isCurrent ? "is-active" : ""}`}
      >
        <div className="db-seat-header">
          <span
            style={{
              color:
                role === "Pro"
                  ? "var(--db-pro)"
                  : role === "Con"
                    ? "var(--db-con)"
                    : "var(--db-judge)",
            }}
          >
            {role === "Pro"
              ? t("rolePro")
              : role === "Con"
                ? t("roleCon")
                : t("roleJudge")}
          </span>

          <span className="db-seat-status">
            {l.phase === "lobby" ? (
              isReady ? (
                <span style={{ color: "#16a34a", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Check size={12} /> {t("readyBtn")}
                </span>
              ) : (
                <span style={{ color: "var(--db-muted)" }}>未准备</span>
              )
            ) : isCurrent ? (
              <span className="db-seat-status is-thinking">{t("thinking")}</span>
            ) : (
              <span style={{ color: "var(--db-muted)" }}>{t("waitingTurn")}</span>
            )}
          </span>
        </div>

        <div className="db-seat-info">
          <div className="db-avatar">
            {player?.human ? (
              "你"
            ) : player?.model?.icon ? (
              <img src={player.model.icon} alt="" className="db-avatar-img" />
            ) : (
              role.slice(0, 1)
            )}
          </div>
          <div className="db-seat-names">
            <strong>
              {player?.name || "待入座"}
              {isMe ? t("youIndicator") : null}
            </strong>
            <small>{player?.model?.name || (player?.human ? t("playerHuman") : t("playerModel"))}</small>
          </div>
        </div>

        {isMe && l.phase === "lobby" && (
          <button
            type="button"
            className={`db-btn ${isReady ? "" : "is-primary"}`}
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
        )}
      </article>
    );
  }

  function renderTopicModal() {
    return (
      <div className="db-modal-overlay" onClick={() => setTopicModal(false)}>
        <div className="db-modal" onClick={(e) => e.stopPropagation()}>
          <h2 className="db-modal-title">{t("changeTopic")}</h2>
          <p className="db-modal-sub">{t("presetTopicSelect")}</p>

          <div className="db-candidate-list">
            {PRESET_TOPICS.map((topic) => (
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
                placeholder="输入想要探讨的议题..."
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
                设定
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderPickerModal() {
    const list = candidates?.sessions || [];
    const includeMe = true;

    return (
      <div className="db-modal-overlay" onClick={() => setPicker(false)}>
        <div className="db-modal" onClick={(e) => e.stopPropagation()}>
          <h2 className="db-modal-title">{t("pickerTitle")}</h2>
          <p className="db-modal-sub">{t("pickerSubtitle")}</p>

          <div className="db-candidate-list">
            {list.map((sess) => {
              const isChosen = selected.includes(sess.id);
              return (
                <div
                  key={sess.id}
                  className={`db-candidate-item ${isChosen ? "is-selected" : ""}`}
                  onClick={() => {
                    if (isChosen) {
                      setSelected(selected.filter((id) => id !== sess.id));
                    } else if (selected.length < 3) {
                      setSelected([...selected, sess.id]);
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="db-avatar">
                      {sess.model.icon ? (
                        <img src={sess.model.icon} alt="" className="db-avatar-img" />
                      ) : (
                        "AI"
                      )}
                    </div>
                    <div>
                      <strong style={{ fontSize: 13 }}>{sess.name}</strong>
                      <small style={{ color: "var(--db-muted)", display: "block" }}>
                        {sess.model.name}
                      </small>
                    </div>
                  </div>
                  {isChosen && <Check size={16} color="var(--db-primary)" />}
                </div>
              );
            })}
          </div>

          <div className="db-modal-actions">
            <button
              type="button"
              className="db-btn"
              onClick={() => setPicker(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="db-btn is-primary"
              disabled={selected.length < 1 || busy}
              onClick={() =>
                void perform(async () => {
                  await start(selected, includeMe, l.topic);
                  setPicker(false);
                })
              }
            >
              确认开庭 (已选 {selected.length + 1} 人)
            </button>
          </div>
        </div>
      </div>
    );
  }
}
