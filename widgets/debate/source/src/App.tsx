import { useEffect, useState } from "react";
import {
  pudding,
  useWidgetLocale,
  useWidgetState,
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
  BookOpen,
  User,
  ChevronDown,
  X,
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
  const run = pudding.interaction.read();

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

  // 轮次导航状态 (自动跟随最新活跃轮次，亦可手动回看)
  const maxRoundWithArgs = p.arguments.reduce((max, a) => Math.max(max, a.round), 1);
  const debateActiveRound =
    p.verdict || l.phase === "verdict"
      ? 4
      : l.phase === "round1_pro" || l.phase === "round1_con"
        ? 1
        : l.phase === "round2_pro" || l.phase === "round2_con"
          ? 2
          : l.phase === "round3_pro" || l.phase === "round3_con"
            ? 3
            : maxRoundWithArgs;

  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  useEffect(() => {
    setSelectedRound(null);
  }, [debateActiveRound]);

  const currentViewRound = selectedRound ?? debateActiveRound;

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
    const sessions = c.sessions || [];
    if (sessions.length >= 2) {
      setPickerSlots({
        Pro: sessions[0].id,
        Con: sessions[1].id,
        Judge: "",
      });
    } else if (sessions.length === 1) {
      setPickerSlots({
        Pro: "@me",
        Con: sessions[0].id,
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
      if (val) initPickerFromSessions(val);
    });
  }, []);

  const getPlayerForRole = (role: Role): Player | undefined => {
    const participantID = l.seats[role];
    if (!participantID) return undefined;
    const participant = run?.participants.find((part) => part.id === participantID);
    if (!participant) return undefined;
    const isHuman = participant.kind === "human";
    const sessionModel = candidates?.sessions.find(
      (s) => s.participantID === participantID || s.id === participantID,
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
                if (candidates) initPickerFromSessions(candidates);
                void loadCandidates().then((val) => {
                  if (val && !candidates) initPickerFromSessions(val);
                });
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
                if (candidates) initPickerFromSessions(candidates);
                void loadCandidates().then((val) => {
                  if (val && !candidates) initPickerFromSessions(val);
                });
                setPicker(true);
              }}
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
      <section className="db-versus-banner db-scale-card">
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
                <span>{t("roleJudgeShort")}: {judgePlayer.name}</span>
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

        {/* 辩方卡片置于能量槽下方 (格斗对决舞台) */}
        <div className="db-fighters-grid">
          {/* 正方辩手卡片 */}
          <div
            className={`db-fighter-card is-pro ${
              l.phase !== "lobby" && activeRole === "Pro" ? "is-active" : ""
            }`}
          >
            <div className="db-fighter-role-tag">{t("rolePro")}</div>
            <div className="db-fighter-main">
              <div className="db-fighter-avatar is-pro">
                {proPlayer?.human ? (
                  <User size={20} />
                ) : proPlayer?.model?.icon ? (
                  <img src={proPlayer.model.icon} alt="" className="db-avatar-img" />
                ) : (
                  <Flame size={20} />
                )}
              </div>
              <div className="db-fighter-info">
                <strong className="db-fighter-name">
                  {proPlayer?.name || t("unseatedPro")}
                  {isProMe && (
                    <span className="db-you-badge">{t("youIndicator")}</span>
                  )}
                </strong>
                <small className="db-fighter-model">
                  {proPlayer?.model?.name || (proPlayer?.human ? t("playerHuman") : t("unseated"))}
                </small>
              </div>
            </div>

            <div className="db-fighter-state">
              {l.phase === "lobby" ? (
                !proPlayer ? (
                  <span className="db-tag-waiting">{t("statusWaitingSeat")}</span>
                ) : l.ready.includes(proPlayer.id) ? (
                  <span className="db-tag-ready">
                    <Check size={12} /> {t("readyBtn")}
                  </span>
                ) : (
                  <span className="db-tag-waiting">{t("statusWaitingReady")}</span>
                )
              ) : activeRole === "Pro" ? (
                <span className="db-tag-thinking">{t("thinking")}</span>
              ) : (
                <span className="db-tag-idle">{t("waitingTurn")}</span>
              )}

              {proPlayer && isProMe && l.phase === "lobby" && (
                <button
                  type="button"
                  className={`db-btn db-btn-sm ${
                    l.ready.includes(proPlayer.id) ? "" : "is-primary"
                  }`}
                  disabled={busy}
                  onClick={() => {
                    const pid = proPlayer.id;
                    void perform(() =>
                      pudding.interaction.handle((c) =>
                        changeReadiness(!l.ready.includes(pid), c),
                      ),
                    );
                  }}
                >
                  {l.ready.includes(proPlayer.id) ? t("cancelReady") : t("readyBtn")}
                </button>
              )}
            </div>
          </div>

          {/* 反方辩手卡片 */}
          <div
            className={`db-fighter-card is-con ${
              l.phase !== "lobby" && activeRole === "Con" ? "is-active" : ""
            }`}
          >
            <div className="db-fighter-role-tag">{t("roleCon")}</div>
            <div className="db-fighter-main is-reverse">
              <div className="db-fighter-avatar is-con">
                {conPlayer?.human ? (
                  <User size={20} />
                ) : conPlayer?.model?.icon ? (
                  <img src={conPlayer.model.icon} alt="" className="db-avatar-img" />
                ) : (
                  <ShieldAlert size={20} />
                )}
              </div>
              <div className="db-fighter-info is-reverse">
                <strong className="db-fighter-name">
                  {conPlayer?.name || t("unseatedCon")}
                  {isConMe && (
                    <span className="db-you-badge">{t("youIndicator")}</span>
                  )}
                </strong>
                <small className="db-fighter-model">
                  {conPlayer?.model?.name || (conPlayer?.human ? t("playerHuman") : t("unseated"))}
                </small>
              </div>
            </div>

            <div className="db-fighter-state is-reverse">
              {l.phase === "lobby" ? (
                !conPlayer ? (
                  <span className="db-tag-waiting">{t("statusWaitingSeat")}</span>
                ) : l.ready.includes(conPlayer.id) ? (
                  <span className="db-tag-ready">
                    <Check size={12} /> {t("readyBtn")}
                  </span>
                ) : (
                  <span className="db-tag-waiting">{t("statusWaitingReady")}</span>
                )
              ) : activeRole === "Con" ? (
                <span className="db-tag-thinking">{t("thinking")}</span>
              ) : (
                <span className="db-tag-idle">{t("waitingTurn")}</span>
              )}

              {conPlayer && isConMe && l.phase === "lobby" && (
                <button
                  type="button"
                  className={`db-btn db-btn-sm ${
                    l.ready.includes(conPlayer.id) ? "" : "is-primary"
                  }`}
                  disabled={busy}
                  onClick={() => {
                    const pid = conPlayer.id;
                    void perform(() =>
                      pudding.interaction.handle((c) =>
                        changeReadiness(!l.ready.includes(pid), c),
                      ),
                    );
                  }}
                >
                  {l.ready.includes(conPlayer.id) ? t("cancelReady") : t("readyBtn")}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 辩论轮次切换与左右双列对垒舞台 (无全文长廊，单轮聚焦) */}
      <main className="db-stream">
        {p.arguments.length === 0 && !p.verdict && l.phase === "lobby" ? (
          <div className="db-arg-card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <BookOpen size={36} style={{ margin: "0 auto 12px auto", opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: 14, color: "var(--db-muted)" }}>
              {t("noArgumentsYet")}
            </p>
          </div>
        ) : (
          <>
            {/* 轮次 Tab 控制条 */}
            <div className="db-round-tabs">
              {[1, 2, 3].map((r) => {
                const isRoundActive = currentViewRound === r;
                const roundArgs = p.arguments.filter((a) => a.round === r);
                const isDone = roundArgs.length >= 2 || debateActiveRound > r;
                const title =
                  r === 1
                    ? t("round1Title")
                    : r === 2
                      ? t("round2Title")
                      : t("round3Title");

                return (
                  <button
                    key={r}
                    type="button"
                    className={`db-round-tab ${isRoundActive ? "is-active" : ""}`}
                    onClick={() => setSelectedRound(r)}
                  >
                    <span>{title}</span>
                    {isDone && <Check size={13} className="db-round-done-check" />}
                  </button>
                );
              })}

              <button
                type="button"
                className={`db-round-tab is-verdict ${currentViewRound === 4 ? "is-active" : ""}`}
                onClick={() => setSelectedRound(4)}
              >
                <Award size={14} />
                <span>{t("verdictTitle")}</span>
                {Boolean(p.verdict) && <Check size={13} className="db-round-done-check" />}
              </button>
            </div>

            {/* 辩论稿双列对垒展示 (蓝方左，红方右) */}
            {currentViewRound >= 1 && currentViewRound <= 3 && (
              <div className="db-round-versus-grid">
                {/* 左列：正方（蓝方） */}
                {(() => {
                  const proArg = p.arguments.find(
                    (a) => a.round === currentViewRound && a.role === "Pro",
                  );
                  if (proArg) {
                    return (
                      <article className="db-arg-card is-pro">
                        <div className="db-arg-header">
                          <span className="db-arg-role-tag">
                            <Flame size={14} />
                            <span>{t("roleProShort")} · {proArg.speakerName || t("playerModel")}</span>
                          </span>
                          <span className="db-arg-time">
                            {new Date(proArg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <h3 className="db-arg-headline">{proArg.headline}</h3>
                        <div className="db-arg-content">{proArg.content}</div>
                      </article>
                    );
                  }
                  return (
                    <div className="db-arg-card is-pro is-placeholder">
                      <div className="db-arg-header">
                        <span className="db-arg-role-tag">
                          <Flame size={14} />
                          <span>{t("roleProShort")}</span>
                        </span>
                      </div>
                      <div className="db-arg-placeholder-body">
                        {l.phase === `round${currentViewRound}_pro` ? (
                          <>
                            <span className="db-versus-phase-dot" />
                            <span>{t("thinking")}</span>
                          </>
                        ) : (
                          <span>{t("waitingTurn")}</span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 右列：反方（红方） */}
                {(() => {
                  const conArg = p.arguments.find(
                    (a) => a.round === currentViewRound && a.role === "Con",
                  );
                  if (conArg) {
                    return (
                      <article className="db-arg-card is-con">
                        <div className="db-arg-header is-reverse">
                          <span className="db-arg-role-tag">
                            <ShieldAlert size={14} />
                            <span>{t("roleConShort")} · {conArg.speakerName || t("playerModel")}</span>
                          </span>
                          <span className="db-arg-time">
                            {new Date(conArg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <h3 className="db-arg-headline">{conArg.headline}</h3>
                        <div className="db-arg-content">{conArg.content}</div>
                      </article>
                    );
                  }
                  return (
                    <div className="db-arg-card is-con is-placeholder">
                      <div className="db-arg-header is-reverse">
                        <span className="db-arg-role-tag">
                          <ShieldAlert size={14} />
                          <span>{t("roleConShort")}</span>
                        </span>
                      </div>
                      <div className="db-arg-placeholder-body">
                        {l.phase === `round${currentViewRound}_con` ? (
                          <>
                            <span className="db-versus-phase-dot" />
                            <span>{t("thinking")}</span>
                          </>
                        ) : (
                          <span>{t("waitingTurn")}</span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 终局裁决书展示 */}
            {currentViewRound === 4 && (
              p.verdict ? (
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
              ) : (
                <div className="db-arg-card is-judge is-placeholder" style={{ textAlign: "center", padding: "40px 20px" }}>
                  <Gavel size={36} style={{ margin: "0 auto 12px auto", color: "var(--db-judge)" }} />
                  <p style={{ margin: 0, fontSize: 14, color: "var(--db-muted)" }}>
                    {l.phase === "verdict" ? t("phaseVerdict") : t("waitingTurn")}
                  </p>
                </div>
              )
            )}
          </>
        )}

        {/* 人类辩手发言面板 */}
        {myTurn && l.phase !== "verdict" && (
          <div className="db-human-panel">
            <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <MessageSquare size={16} />
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
              className="db-btn is-primary"
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

        {/* 人类裁判敲锤宣判面板 */}
        {myTurn && l.phase === "verdict" && (
          <div className="db-human-panel">
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
          <div style={{ color: "#ef4444", fontSize: 13, padding: "8px 12px", background: "#fee2e2", borderRadius: 8 }}>
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
            <div className="db-slot-alert" style={{ background: "#fee2e2", color: "#dc2626" }}>
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
