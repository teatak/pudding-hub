/**
 * ============================================================================
 * 经典力学实验室 (Mechanics Lab) — 零耦合公共外壳视图 (`src/App.tsx`)
 * ============================================================================
 *
 * 【宿主外壳职责】
 * 1. 动态读取 `BENCH_REGISTRY` 渲染顶部实验台切换栏（无论注册了 2 个、4 个还是 N 个实验台）。
 * 2. 提供统一的物理仿真时钟循环（常速 1.0x / 慢镜 0.25x / 单步 +0.02s / 重置）。
 * 3. 自动渲染当前实验台的能量守恒柱状图（动能 Ek、势能 Ep、摩擦热能 Q）。
 * 4. 自动渲染右侧声明式参数滑块、经典教学预设卡片、底部实时物理量仪表盘与示波器曲线。
 */

import React, { useEffect, useState } from "react";
import { useWidgetState, useWidgetLocale } from "@pudding/widget";
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Compass,
  Grid,
  Volume2,
  VolumeX,
  Gauge,
  Sparkles,
  Activity,
  BookOpen,
  Sliders,
} from "lucide-react";
import { BENCH_REGISTRY, getBenchById } from "./benches";
import {
  readLabPersistedState,
  writeLabPersistedState,
  type LabPersistedState,
} from "./game";
import { getLocale, setLocale, t, loc } from "./text";
import {
  isSoundMuted,
  toggleSoundMute,
  playUiClick,
  playBenchSoundEvent,
} from "./sound";
import "./style.css";

export default function App() {
  useWidgetState();
  const hostLocale = useWidgetLocale();
  if (hostLocale) setLocale(hostLocale);
  const locale = getLocale();

  const persisted = readLabPersistedState();
  const [lab, setLab] = useState<LabPersistedState>(persisted);
  const [muted, setMuted] = useState(isSoundMuted());
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // 同步外部 MCP 接口（如 AI 导师调用 configureExperiment / loadPreset）引起的状态变更
  useEffect(() => {
    setLab(readLabPersistedState());
  }, [
    persisted.activeBenchId,
    persisted.running,
    persisted.slowMotion,
    persisted.showVectors,
    JSON.stringify(persisted.paramsByBench),
  ]);

  const activeBench = getBenchById(lab.activeBenchId);
  const activeParams =
    lab.paramsByBench[activeBench.id] ?? activeBench.getDefaultParams();
  const activeState =
    lab.stateByBench[activeBench.id] ??
    activeBench.createInitialState(activeParams);
  const activeWave = lab.waveformByBench[activeBench.id] ?? [];

  // 统一物理仿真时钟循环 (50Hz tick = 20ms)
  useEffect(() => {
    if (!lab.running) return;
    const dt = lab.slowMotion ? 0.005 : 0.02;
    const timer = setInterval(() => {
      setLab((prev) => {
        if (!prev.running) return prev;
        const bench = getBenchById(prev.activeBenchId);
        const params =
          prev.paramsByBench[bench.id] ?? bench.getDefaultParams();
        const curState =
          prev.stateByBench[bench.id] ?? bench.createInitialState(params);

        if (bench.isCompleted(curState, params)) {
          const stopped = { ...prev, running: false };
          void writeLabPersistedState(stopped);
          return stopped;
        }

        const stepRes = bench.stepPhysics(curState, params, dt);
        if (stepRes.soundEvents) {
          stepRes.soundEvents.forEach((ev) => playBenchSoundEvent(ev));
        }

        const completedNow = bench.isCompleted(stepRes.state, params);
        const prevWave = prev.waveformByBench[bench.id] ?? [];
        const sample = bench.sampleWaveform(stepRes.state, params);
        const lastSample = prevWave[prevWave.length - 1];
        const shouldRecordSample =
          !lastSample || sample.t - lastSample.t >= 0.06 || completedNow;

        const nextLab: LabPersistedState = {
          ...prev,
          running: !completedNow,
          stateByBench: {
            ...prev.stateByBench,
            [bench.id]: stepRes.state,
          },
          waveformByBench: shouldRecordSample
            ? {
                ...prev.waveformByBench,
                [bench.id]: [...prevWave.slice(-72), sample],
              }
            : prev.waveformByBench,
        };

        if (completedNow) {
          void writeLabPersistedState(nextLab);
        }
        return nextLab;
      });
    }, 20);

    return () => clearInterval(timer);
  }, [lab.running, lab.slowMotion, lab.activeBenchId]);

  function commitLab(next: LabPersistedState) {
    setLab(next);
    void writeLabPersistedState(next);
  }

  function handleSelectBench(benchId: string) {
    playUiClick();
    setActivePresetId(null);
    const target = getBenchById(benchId);
    const params =
      lab.paramsByBench[target.id] ?? target.getDefaultParams();
    const state =
      lab.stateByBench[target.id] ?? target.createInitialState(params);
    commitLab({
      ...lab,
      activeBenchId: target.id,
      running: false,
      paramsByBench: { ...lab.paramsByBench, [target.id]: params },
      stateByBench: { ...lab.stateByBench, [target.id]: state },
    });
  }

  function handleChangeParam(key: string, value: number) {
    setActivePresetId(null);
    const nextParams = { ...activeParams, [key]: value };
    const freshState = activeBench.createInitialState(nextParams);
    commitLab({
      ...lab,
      running: false,
      paramsByBench: {
        ...lab.paramsByBench,
        [activeBench.id]: nextParams,
      },
      stateByBench: {
        ...lab.stateByBench,
        [activeBench.id]: freshState,
      },
      waveformByBench: {
        ...lab.waveformByBench,
        [activeBench.id]: [
          activeBench.sampleWaveform(freshState, nextParams),
        ],
      },
    });
  }

  function handleLoadPreset(presetId: string, presetParams: Record<string, number>) {
    playUiClick();
    setActivePresetId(presetId);
    const nextParams = { ...presetParams };
    const freshState = activeBench.createInitialState(nextParams);
    commitLab({
      ...lab,
      running: true,
      paramsByBench: {
        ...lab.paramsByBench,
        [activeBench.id]: nextParams,
      },
      stateByBench: {
        ...lab.stateByBench,
        [activeBench.id]: freshState,
      },
      waveformByBench: {
        ...lab.waveformByBench,
        [activeBench.id]: [
          activeBench.sampleWaveform(freshState, nextParams),
        ],
      },
    });
  }

  function handleTogglePlay() {
    playUiClick();
    if (lab.running) {
      commitLab({ ...lab, running: false });
      return;
    }
    const isDone = activeBench.isCompleted(activeState, activeParams);
    const startState = isDone
      ? activeBench.createInitialState(activeParams)
      : activeState;
    const startWave = isDone
      ? [activeBench.sampleWaveform(startState, activeParams)]
      : activeWave;
    commitLab({
      ...lab,
      running: true,
      stateByBench: {
        ...lab.stateByBench,
        [activeBench.id]: startState,
      },
      waveformByBench: {
        ...lab.waveformByBench,
        [activeBench.id]: startWave,
      },
    });
  }

  function handleReset() {
    playUiClick();
    const freshState = activeBench.createInitialState(activeParams);
    commitLab({
      ...lab,
      running: false,
      stateByBench: {
        ...lab.stateByBench,
        [activeBench.id]: freshState,
      },
      waveformByBench: {
        ...lab.waveformByBench,
        [activeBench.id]: [
          activeBench.sampleWaveform(freshState, activeParams),
        ],
      },
    });
  }

  function handleStepOnce() {
    playUiClick();
    const res = activeBench.stepPhysics(activeState, activeParams, 0.02);
    if (res.soundEvents) {
      res.soundEvents.forEach((ev) => playBenchSoundEvent(ev));
    }
    commitLab({
      ...lab,
      running: false,
      stateByBench: {
        ...lab.stateByBench,
        [activeBench.id]: res.state,
      },
      waveformByBench: {
        ...lab.waveformByBench,
        [activeBench.id]: [
          ...activeWave.slice(-72),
          activeBench.sampleWaveform(res.state, activeParams),
        ],
      },
    });
  }

  const energy = activeBench.computeEnergy(activeState, activeParams);
  const telemetry = activeBench.computeTelemetry(activeState, activeParams);
  const safeTotalE = Math.max(0.01, energy.total);
  const ekPct = Math.min(100, (energy.kinetic / safeTotalE) * 100);
  const epPct = Math.min(100, (energy.potential / safeTotalE) * 100);
  const qPct = Math.min(100, (energy.thermal / safeTotalE) * 100);

  return (
    <div className="ml-app">
      {/* 顶部导航栏：标题 + 动态实验台切换 Tab + 全局视图开关 */}
      <header className="ml-topbar">
        <div className="ml-brand">
          <span className="ml-logo-dot" />
          <div>
            <h1>{t("appTitle")}</h1>
            <small>{loc(activeBench.subtitle, locale)}</small>
          </div>
        </div>

        {/* 实验台插件切换 Tabs（完全由 BENCH_REGISTRY 动态驱动） */}
        <nav className="ml-bench-tabs" aria-label="Experiment Benches">
          {BENCH_REGISTRY.map((bench) => (
            <button
              key={bench.id}
              type="button"
              className={`ml-tab-btn ${
                bench.id === activeBench.id ? "is-active" : ""
              }`}
              onClick={() => handleSelectBench(bench.id)}
            >
              {loc(bench.title, locale)}
            </button>
          ))}
        </nav>

        <div className="ml-view-toggles">
          <button
            type="button"
            className={`ml-chip-btn ${lab.showVectors ? "is-on" : ""}`}
            onClick={() => {
              playUiClick();
              commitLab({ ...lab, showVectors: !lab.showVectors });
            }}
            title={t("toggleVectors")}
          >
            <Compass size={14} />
            <span>{t("toggleVectors")}</span>
          </button>

          <button
            type="button"
            className={`ml-chip-btn ${lab.showGrid ? "is-on" : ""}`}
            onClick={() => {
              playUiClick();
              commitLab({ ...lab, showGrid: !lab.showGrid });
            }}
            title={t("toggleGrid")}
          >
            <Grid size={14} />
            <span>{t("toggleGrid")}</span>
          </button>

          <button
            type="button"
            className={`ml-chip-btn is-icon ${!muted ? "is-on" : ""}`}
            onClick={() => {
              const nextMuted = toggleSoundMute();
              setMuted(nextMuted);
              if (!nextMuted) playUiClick();
            }}
            title={t("toggleSound")}
            aria-label={t("toggleSound")}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </header>

      {/* 主工作区：左侧物理实验舞台与仪表，右侧参数滑块与经典预设 */}
      <main className="ml-workspace">
        <section className="ml-stage-column">
          {/* 实验台顶部公式铭牌 + 机械能守恒实时进度条 */}
          <div className="ml-stage-hud">
            <div className="ml-formula-pill">
              <span className="ml-formula-tag">FORMULA</span>
              <code>{activeBench.formulaBadge}</code>
            </div>

            <div className="ml-energy-monitor">
              <div className="ml-energy-labels">
                <span className="is-ek">
                  {t("energyKinetic")}: {energy.kinetic.toFixed(1)}J
                </span>
                <span className="is-ep">
                  {t("energyPotential")}: {energy.potential.toFixed(1)}J
                </span>
                {energy.thermal > 0.05 && (
                  <span className="is-q">
                    {t("energyThermal")}: {energy.thermal.toFixed(1)}J
                  </span>
                )}
                <strong className="is-total">
                  {t("energyTotal")}: {energy.total.toFixed(1)}J
                </strong>
              </div>
              <div className="ml-energy-bar-track">
                <div
                  className="ml-energy-seg is-ek"
                  style={{ width: `${ekPct}%` }}
                />
                <div
                  className="ml-energy-seg is-ep"
                  style={{ width: `${epPct}%` }}
                />
                <div
                  className="ml-energy-seg is-q"
                  style={{ width: `${qPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* 物理实验主画布 (760x400 标准坐标系) */}
          <div className="ml-canvas-box">
            <svg
              viewBox="0 0 760 400"
              className="ml-stage-svg"
              preserveAspectRatio="xMidYMid meet"
            >
              {activeBench.renderStage({
                params: activeParams,
                state: activeState,
                showVectors: lab.showVectors,
                showGrid: lab.showGrid,
                locale,
                onChangeParam: handleChangeParam,
              })}
            </svg>

            {/* 播放 / 暂停 / 单步 / 慢动作 控制浮动台 */}
            <div className="ml-transport-bar">
              <button
                type="button"
                className={`ml-play-btn ${lab.running ? "is-running" : ""}`}
                onClick={handleTogglePlay}
              >
                {lab.running ? <Pause size={15} /> : <Play size={15} />}
                <span>{lab.running ? t("btnPause") : t("btnPlay")}</span>
              </button>

              <button
                type="button"
                className="ml-ctrl-btn"
                onClick={handleStepOnce}
                disabled={lab.running}
              >
                <StepForward size={14} />
                <span>{t("btnStep")}</span>
              </button>

              <button
                type="button"
                className="ml-ctrl-btn"
                onClick={handleReset}
              >
                <RotateCcw size={14} />
                <span>{t("btnReset")}</span>
              </button>

              <button
                type="button"
                className={`ml-ctrl-btn ${lab.slowMotion ? "is-active" : ""}`}
                onClick={() => {
                  playUiClick();
                  commitLab({ ...lab, slowMotion: !lab.slowMotion });
                }}
              >
                <Gauge size={14} />
                <span>
                  {lab.slowMotion ? t("speedSlow") : t("speedNormal")}
                </span>
              </button>
            </div>
          </div>

          {/* 底部双栏：实时物理量测量仪 + 纸带打点波形记录仪 */}
          <div className="ml-bottom-grid">
            <div className="ml-telemetry-card">
              <div className="ml-card-head">
                <Activity size={13} />
                <span>{t("panelTelemetry")}</span>
              </div>
              <div className="ml-telemetry-items">
                {telemetry.map((item) => (
                  <div
                    key={item.id}
                    className={`ml-stat-box is-${item.highlight || "default"}`}
                  >
                    <small>{loc(item.label, locale)}</small>
                    <strong>
                      <em>{item.symbol} = </em>
                      {item.value}
                      <span> {item.unit}</span>
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="ml-waveform-card">
              <div className="ml-card-head">
                <BookOpen size={13} />
                <span>{t("panelPrinciple")}</span>
              </div>
              <p className="ml-principle-text">
                {loc(activeBench.principleNote, locale)}
              </p>
            </div>
          </div>
        </section>

        {/* 右侧控制栏：声明式参数滑块 + 经典预设场景 */}
        <aside className="ml-sidebar">
          <div className="ml-side-card">
            <div className="ml-card-head">
              <Sliders size={13} />
              <span>{t("panelParams")}</span>
            </div>
            <div className="ml-sliders-list">
              {activeBench.paramSpecs.map((spec) => {
                const val = activeParams[spec.key] ?? spec.defaultValue;
                return (
                  <label key={spec.key} className="ml-slider-row">
                    <div className="ml-slider-top">
                      <span>
                        {loc(spec.label, locale)} (<code>{spec.symbol}</code>)
                      </span>
                      <strong>
                        {val} {spec.unit}
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={spec.min}
                      max={spec.max}
                      step={spec.step}
                      value={val}
                      onChange={(e) =>
                        handleChangeParam(spec.key, Number(e.target.value))
                      }
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="ml-side-card">
            <div className="ml-card-head">
              <Sparkles size={13} />
              <span>{t("panelPresets")}</span>
            </div>
            <div className="ml-presets-list">
              {activeBench.presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`ml-preset-btn ${
                    preset.id === activePresetId ? "is-active" : ""
                  }`}
                  onClick={() => handleLoadPreset(preset.id, preset.params)}
                >
                  <strong>{loc(preset.title, locale)}</strong>
                  <small>{loc(preset.description, locale)}</small>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
