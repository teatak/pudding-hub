import { useState } from "react";
import {
  useWidgetLocale,
  useWidgetState,
  useWidgetInteraction,
} from "@pudding/widget";
import {
  Compass,
  Sparkles,
  RotateCcw,
  FileDown,
  Check,
  CheckSquare,
  Square,
  TrendingUp,
  AlertTriangle,
  Info,
  Heart,
  Lightbulb,
  ListChecks,
  Play,
  Layers,
} from "lucide-react";
import {
  type HatColor,
  type MatrixPhase,
  type PerspectiveItem,
  type RecommendationLevel,
} from "./types";
import {
  HAT_ORDER,
  getHatMeta,
  generateMarkdownExport,
} from "./matrix";
import {
  lobby,
  position,
  setTopic,
  startDeliberation,
  resetSession,
  loadDemo,
  submitPerspective,
  submitSynthesis,
  toggleAction,
} from "./game";
import { t, setLocale, PRESET_TOPICS } from "./text";
import "./style.css";

export default function App() {
  useWidgetState();
  const locale = useWidgetLocale();
  if (locale) setLocale(locale);

  const l = lobby();
  const p = position();
  const run = useWidgetInteraction();

  // 视图 Tab
  const [activeTab, setActiveTab] = useState<"matrix" | "stream">("matrix");
  const [selectedHatFilter, setSelectedHatFilter] = useState<HatColor | "all">("all");

  // 表单状态 (Setup)
  const [draftTopic, setDraftTopic] = useState("");
  const [draftContext, setDraftContext] = useState("");

  // 手动录入观点 (Deliberating)
  const [manualHat, setManualHat] = useState<HatColor>("white");
  const [manualHeadline, setManualHeadline] = useState("");
  const [manualContent, setManualContent] = useState("");

  // 蓝帽手动裁决弹窗/表单
  const [showSynthesisModal, setShowSynthesisModal] = useState(false);
  const [synthRec, setSynthRec] = useState<RecommendationLevel>("recommend_with_caution");
  const [synthScore, setSynthScore] = useState(75);
  const [synthSummary, setSynthSummary] = useState("");
  const [synthActions, setSynthActions] = useState("");

  // 复制反馈
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 一键填充预设
  function selectPreset(preset: (typeof PRESET_TOPICS)[0]) {
    setDraftTopic(preset.topic);
    setDraftContext(preset.context);
  }

  // 启动研判
  async function handleStart() {
    if (!draftTopic.trim()) {
      setErrorMsg("请先输入决策议题");
      return;
    }
    setErrorMsg(null);
    try {
      await setTopic(draftTopic, draftContext);
      await startDeliberation();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }

  // 导出 Markdown
  async function handleExport() {
    const md = generateMarkdownExport(l, p);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级兜底提示
    }
  }

  // 手工提交单帽观点
  async function handleManualSubmit() {
    if (!manualHeadline.trim() || !manualContent.trim()) return;
    try {
      await submitPerspective(
        manualHat,
        manualHeadline,
        manualContent,
        undefined,
        "人类决策员",
      );
      setManualHeadline("");
      setManualContent("");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }

  // 蓝帽收敛定论
  async function handleSynthesize() {
    if (!synthSummary.trim()) return;
    const actions = synthActions
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await submitSynthesis(
        synthRec,
        synthScore,
        synthSummary,
        actions.length > 0 ? actions : ["执行第一阶段试运行评估"],
      );
      setShowSynthesisModal(false);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }

  const phaseClass =
    l.phase === "setup"
      ? "dm-phase-setup"
      : l.phase === "deliberating"
        ? "dm-phase-deliberating"
        : "dm-phase-completed";

  const phaseLabel =
    l.phase === "setup"
      ? t("phaseSetup")
      : l.phase === "deliberating"
        ? t("phaseDeliberating")
        : t("phaseCompleted");

  // 辅助四象限提取
  const whitePerspectives = p.perspectives.filter((item) => item.hat === "white");
  const yellowPerspectives = p.perspectives.filter((item) => item.hat === "yellow");
  const blackPerspectives = p.perspectives.filter((item) => item.hat === "black");
  const redPerspectives = p.perspectives.filter((item) => item.hat === "red");
  const greenPerspectives = p.perspectives.filter((item) => item.hat === "green");

  return (
    <div className="dm-container">
      {/* 顶部通用导航栏 */}
      <header className="dm-header">
        <div className="dm-brand">
          <Compass className="dm-logo-icon" style={{ color: "#38BDF8" }} />
          <div className="dm-brand-info">
            <div className="dm-title-row">
              <span className="dm-app-title">{t("appTitle")}</span>
              <span className={`dm-phase-pill ${phaseClass}`}>{phaseLabel}</span>
            </div>
            {l.topic && <span className="dm-topic-badge" title={l.topic}>{l.topic}</span>}
          </div>
        </div>

        <div className="dm-header-actions">
          {l.phase === "setup" ? (
            <button
              className="dm-btn dm-btn-gold"
              onClick={async () => {
                await loadDemo();
              }}
            >
              <Sparkles size={14} />
              {t("btnDemo")}
            </button>
          ) : (
            <>
              <button
                className="dm-btn dm-btn-secondary"
                onClick={handleExport}
                title="导出为 Markdown 结构化文档"
              >
                {copied ? <Check size={14} color="#34D399" /> : <FileDown size={14} />}
                {copied ? t("btnExportCopied") : t("btnExportMd")}
              </button>
              {l.phase === "deliberating" && (
                <button
                  className="dm-btn dm-btn-primary"
                  onClick={() => setShowSynthesisModal(true)}
                >
                  <Sparkles size={14} />
                  {t("btnSynthesize")}
                </button>
              )}
              <button
                className="dm-btn dm-btn-secondary"
                onClick={async () => {
                  await resetSession();
                }}
              >
                <RotateCcw size={14} />
                {t("btnReset")}
              </button>
            </>
          )}
        </div>
      </header>

      {/* 错误提示条 */}
      {errorMsg && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            borderBottom: "1px solid rgba(239, 68, 68, 0.4)",
            color: "#FCA5A5",
            fontSize: "12px",
            padding: "6px 18px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{errorMsg}</span>
          <span style={{ cursor: "pointer" }} onClick={() => setErrorMsg(null)}>✕</span>
        </div>
      )}

      {/* 阶段 1：立项与准备 (Setup) */}
      {l.phase === "setup" ? (
        <div className="dm-setup-wrap">
          <div className="dm-setup-card">
            <div className="dm-setup-header">
              <h2>提出待研判的决策难题</h2>
              <p>输入你的业务、技术或架构疑惑，六顶思考帽将从事实、收益、风险与直觉全面剖析。</p>
            </div>

            <div className="dm-form-group">
              <label>决策议题 (Dilemma Topic) *</label>
              <input
                className="dm-input"
                placeholder={t("topicInputPlaceholder")}
                value={draftTopic}
                onChange={(e) => setDraftTopic(e.target.value)}
              />
            </div>

            <div className="dm-form-group">
              <label>背景与约束说明 (Context & Constraints)</label>
              <textarea
                className="dm-textarea"
                placeholder={t("contextInputPlaceholder")}
                value={draftContext}
                onChange={(e) => setDraftContext(e.target.value)}
              />
            </div>

            <div>
              <div className="dm-presets-label">{t("presetTopicsLabel")}</div>
              <div className="dm-presets-list">
                {PRESET_TOPICS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="dm-preset-item"
                    onClick={() => selectPreset(preset)}
                  >
                    💡 {preset.topic}
                  </button>
                ))}
              </div>
            </div>

            <div className="dm-hats-roster">
              <div className="dm-roster-title">
                <Layers size={14} />
                六顶思考帽推演视角
              </div>
              <div className="dm-hats-grid">
                {HAT_ORDER.map((hat) => {
                  const meta = getHatMeta(hat);
                  return (
                    <div key={hat} className="dm-hat-card">
                      <div className="dm-hat-card-top" style={{ color: meta.color }}>
                        <span className="dm-hat-dot" style={{ backgroundColor: meta.color }} />
                        {meta.short}
                      </div>
                      <div className="dm-hat-desc">{meta.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="dm-setup-actions">
              <button
                className="dm-btn dm-btn-primary"
                style={{ padding: "8px 20px", fontSize: "14px" }}
                onClick={handleStart}
              >
                <Play size={16} />
                {t("btnStart")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 阶段 2 & 3：研判推演与收敛矩阵 (Deliberating & Completed) */
        <div className="dm-main-body">
          {/* 蓝帽已定论：顶部大 Banner */}
          {p.synthesis ? (
            <div className="dm-verdict-banner">
              <div className="dm-verdict-left">
                <div className="dm-score-badge">
                  <span className="dm-score-num">{p.synthesis.score}</span>
                  <span className="dm-score-label">推荐分</span>
                </div>
                <div className="dm-verdict-content">
                  <div className="dm-verdict-rec">
                    <span className={`dm-rec-tag dm-rec-${p.synthesis.recommendation}`}>
                      {p.synthesis.recommendation === "strongly_recommend"
                        ? t("recStrongly")
                        : p.synthesis.recommendation === "recommend_with_caution"
                          ? t("recCaution")
                          : p.synthesis.recommendation === "neutral"
                            ? t("recNeutral")
                            : t("recNot")}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--dm-text-muted)" }}>
                      蓝帽终审定论
                    </span>
                  </div>
                  <div className="dm-verdict-summary">{p.synthesis.summary}</div>
                </div>
              </div>
            </div>
          ) : (
            /* 尚在推演中：活跃指示条 */
            <div className="dm-deliberating-banner">
              <div className="dm-active-hat-hint">
                <Sparkles size={16} color="#38BDF8" />
                <span>
                  当前正在推动{" "}
                  <strong style={{ color: getHatMeta(p.activeHat).color }}>
                    {getHatMeta(p.activeHat).label}
                  </strong>{" "}
                  进行深度推演...
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--dm-text-sub)" }}>
                已收录 {p.perspectives.length} 个独立视角
              </div>
            </div>
          )}

          {/* 标签栏切换 */}
          <div className="dm-tab-bar">
            <div className="dm-tabs">
              <button
                className={`dm-tab ${activeTab === "matrix" ? "active" : ""}`}
                onClick={() => setActiveTab("matrix")}
              >
                <Compass size={15} />
                {t("tabMatrix")}
              </button>
              <button
                className={`dm-tab ${activeTab === "stream" ? "active" : ""}`}
                onClick={() => setActiveTab("stream")}
              >
                <Layers size={15} />
                {t("tabPerspectives")} ({p.perspectives.length})
              </button>
            </div>
          </div>

          {/* 内容区 */}
          <div className="dm-view-content">
            {activeTab === "matrix" ? (
              /* A. 决策四象限 + 行动清单 */
              <>
                <div className="dm-matrix-grid">
                  {/* 象限 1：收益机遇 (Yellow & Green) */}
                  <div className="dm-quadrant" style={{ borderColor: "rgba(251, 191, 36, 0.25)" }}>
                    <div className="dm-quadrant-header" style={{ color: "#FBBF24" }}>
                      <TrendingUp size={16} />
                      {t("quadrantGains")}
                    </div>
                    <div className="dm-quadrant-points">
                      {[...yellowPerspectives, ...greenPerspectives].length === 0 ? (
                        <div className="dm-empty-hint">暂无收益与机会论点</div>
                      ) : (
                        [...yellowPerspectives, ...greenPerspectives].map((item) => (
                          <div key={item.id} className="dm-quadrant-item">
                            <div className="dm-q-headline">{item.headline}</div>
                            <div className="dm-q-content">{item.content}</div>
                            {item.keyPoints && item.keyPoints.length > 0 && (
                              <div className="dm-q-tags">
                                {item.keyPoints.map((kp, i) => (
                                  <span key={i} className="dm-q-tag">
                                    ✓ {kp}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 象限 2：风险死穴 (Black) */}
                  <div className="dm-quadrant" style={{ borderColor: "rgba(239, 68, 68, 0.25)" }}>
                    <div className="dm-quadrant-header" style={{ color: "#F87171" }}>
                      <AlertTriangle size={16} />
                      {t("quadrantRisks")}
                    </div>
                    <div className="dm-quadrant-points">
                      {blackPerspectives.length === 0 ? (
                        <div className="dm-empty-hint">暂无风险挑刺论点</div>
                      ) : (
                        blackPerspectives.map((item) => (
                          <div key={item.id} className="dm-quadrant-item">
                            <div className="dm-q-headline">{item.headline}</div>
                            <div className="dm-q-content">{item.content}</div>
                            {item.keyPoints && item.keyPoints.length > 0 && (
                              <div className="dm-q-tags">
                                {item.keyPoints.map((kp, i) => (
                                  <span key={i} className="dm-q-tag" style={{ color: "#FCA5A5" }}>
                                    ⚠ {kp}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 象限 3：客观事实与边界 (White) */}
                  <div className="dm-quadrant" style={{ borderColor: "rgba(241, 245, 249, 0.2)" }}>
                    <div className="dm-quadrant-header" style={{ color: "#E2E8F0" }}>
                      <Info size={16} />
                      {t("quadrantFacts")}
                    </div>
                    <div className="dm-quadrant-points">
                      {whitePerspectives.length === 0 ? (
                        <div className="dm-empty-hint">暂无事实基线论点</div>
                      ) : (
                        whitePerspectives.map((item) => (
                          <div key={item.id} className="dm-quadrant-item">
                            <div className="dm-q-headline">{item.headline}</div>
                            <div className="dm-q-content">{item.content}</div>
                            {item.keyPoints && item.keyPoints.length > 0 && (
                              <div className="dm-q-tags">
                                {item.keyPoints.map((kp, i) => (
                                  <span key={i} className="dm-q-tag">
                                    • {kp}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 象限 4：直觉体感与士气 (Red) */}
                  <div className="dm-quadrant" style={{ borderColor: "rgba(251, 113, 133, 0.25)" }}>
                    <div className="dm-quadrant-header" style={{ color: "#FB7185" }}>
                      <Heart size={16} />
                      {t("quadrantIntuition")}
                    </div>
                    <div className="dm-quadrant-points">
                      {redPerspectives.length === 0 ? (
                        <div className="dm-empty-hint">暂无直觉心理论点</div>
                      ) : (
                        redPerspectives.map((item) => (
                          <div key={item.id} className="dm-quadrant-item">
                            <div className="dm-q-headline">{item.headline}</div>
                            <div className="dm-q-content">{item.content}</div>
                            {item.keyPoints && item.keyPoints.length > 0 && (
                              <div className="dm-q-tags">
                                {item.keyPoints.map((kp, i) => (
                                  <span key={i} className="dm-q-tag">
                                    ♥ {kp}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* 蓝帽行动清单 (Action Checklist) */}
                {p.synthesis && p.synthesis.actions.length > 0 && (
                  <div className="dm-checklist-card">
                    <div className="dm-checklist-header">
                      <div className="dm-checklist-title">
                        <ListChecks size={18} color="#38BDF8" />
                        {t("actionChecklistTitle")}
                      </div>
                      <span style={{ fontSize: "12px", color: "var(--dm-text-sub)" }}>
                        {p.synthesis.actions.filter((a) => a.completed).length} /{" "}
                        {p.synthesis.actions.length} 已落实
                      </span>
                    </div>

                    <div className="dm-checklist-items">
                      {p.synthesis.actions.map((act) => (
                        <div
                          key={act.id}
                          className="dm-check-row"
                          onClick={() => toggleAction(act.id)}
                        >
                          <div className={`dm-checkbox ${act.completed ? "checked" : ""}`}>
                            {act.completed ? <Check size={12} color="#fff" /> : null}
                          </div>
                          <span className={`dm-check-text ${act.completed ? "done" : ""}`}>
                            {act.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* B. 思考帽研判流 (Perspective Stream) */
              <div className="dm-stream-wrap">
                {/* 筛选 Chip */}
                <div className="dm-hat-filter-row">
                  <button
                    className={`dm-filter-chip ${selectedHatFilter === "all" ? "active" : ""}`}
                    onClick={() => setSelectedHatFilter("all")}
                  >
                    全部帽子 ({p.perspectives.length})
                  </button>
                  {HAT_ORDER.map((hat) => {
                    const meta = getHatMeta(hat);
                    const count = p.perspectives.filter((item) => item.hat === hat).length;
                    return (
                      <button
                        key={hat}
                        className={`dm-filter-chip ${selectedHatFilter === hat ? "active" : ""}`}
                        onClick={() => setSelectedHatFilter(hat)}
                        style={{
                          color: selectedHatFilter === hat ? meta.color : undefined,
                        }}
                      >
                        {meta.short} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* 论述列表 */}
                <div className="dm-perspectives-list">
                  {p.perspectives
                    .filter((item) => selectedHatFilter === "all" || item.hat === selectedHatFilter)
                    .map((item) => {
                      const meta = getHatMeta(item.hat);
                      return (
                        <div
                          key={item.id}
                          className="dm-perspective-card"
                          style={{
                            borderLeftColor: meta.color,
                            backgroundColor: meta.bg,
                          }}
                        >
                          <div className="dm-card-meta">
                            <span
                              className="dm-hat-badge"
                              style={{
                                color: meta.color,
                                backgroundColor: "rgba(0,0,0,0.3)",
                              }}
                            >
                              <span
                                className="dm-hat-dot"
                                style={{ backgroundColor: meta.color }}
                              />
                              {meta.label}
                            </span>
                            <span className="dm-speaker-label">
                              {item.speakerName || "特工"} ·{" "}
                              {new Date(item.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <div className="dm-card-headline">{item.headline}</div>
                          <div className="dm-card-body">{item.content}</div>

                          {item.keyPoints && item.keyPoints.length > 0 && (
                            <div className="dm-q-tags">
                              {item.keyPoints.map((kp, i) => (
                                <span key={i} className="dm-q-tag">
                                  {kp}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* 人工补充阐述框 */}
                <div className="dm-manual-box">
                  <div className="dm-manual-title">
                    <Lightbulb size={14} color="#FBBF24" />
                    作为人类决策员，补充某个思考帽视角的观点：
                  </div>
                  <div className="dm-manual-hat-select">
                    {HAT_ORDER.filter((h) => h !== "blue").map((hat) => {
                      const meta = getHatMeta(hat);
                      return (
                        <button
                          key={hat}
                          type="button"
                          className={`dm-radio-hat ${manualHat === hat ? "active" : ""}`}
                          onClick={() => setManualHat(hat)}
                          style={{
                            borderColor: manualHat === hat ? meta.color : undefined,
                            color: manualHat === hat ? meta.color : undefined,
                          }}
                        >
                          {meta.short}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    className="dm-input"
                    placeholder={t("headlinePlaceholder")}
                    value={manualHeadline}
                    onChange={(e) => setManualHeadline(e.target.value)}
                  />
                  <textarea
                    className="dm-textarea"
                    placeholder={t("argumentPlaceholder")}
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      className="dm-btn dm-btn-primary"
                      onClick={handleManualSubmit}
                    >
                      {t("btnSubmitView")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 蓝帽收敛定论 Modal */}
      {showSynthesisModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "var(--dm-surface)",
              border: "1px solid var(--dm-border)",
              borderRadius: "12px",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>
              蓝帽综合裁决与矩阵定论
            </div>

            <div className="dm-form-group">
              <label>决策定调倾向</label>
              <select
                className="dm-input"
                value={synthRec}
                onChange={(e) => setSynthRec(e.target.value as RecommendationLevel)}
              >
                <option value="strongly_recommend">强烈建议推进 (Strongly Recommend)</option>
                <option value="recommend_with_caution">建议审慎试行 (Recommend with Caution)</option>
                <option value="neutral">保持中立·待验证 (Neutral)</option>
                <option value="not_recommended">暂不建议推进 (Not Recommended)</option>
              </select>
            </div>

            <div className="dm-form-group">
              <label>综合推荐指数 (0 - 100): {synthScore} 分</label>
              <input
                type="range"
                min="0"
                max="100"
                value={synthScore}
                onChange={(e) => setSynthScore(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div className="dm-form-group">
              <label>蓝帽综合结论阐述 *</label>
              <textarea
                className="dm-textarea"
                placeholder="权衡收益与风险后的核心综述..."
                value={synthSummary}
                onChange={(e) => setSynthSummary(e.target.value)}
              />
            </div>

            <div className="dm-form-group">
              <label>建议落地行动项 (每行一条待办)</label>
              <textarea
                className="dm-textarea"
                placeholder="1. 进行为期两周的局部原型验证&#10;2. 设立性能回滚熔断阈值"
                value={synthActions}
                onChange={(e) => setSynthActions(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                className="dm-btn dm-btn-secondary"
                onClick={() => setShowSynthesisModal(false)}
              >
                取消
              </button>
              <button
                className="dm-btn dm-btn-primary"
                onClick={handleSynthesize}
              >
                生成决策矩阵
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
