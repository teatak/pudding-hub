/**
 * ============================================================================
 * 经典力学实验室 (Mechanics Lab) — 零耦合公共外壳视图 (`src/App.tsx`)
 * ============================================================================
 *
 * 【信息层级与布局设计】
 * 1. 第一眼看实验：顶部仅保留标题与实验台切换；主画布紧随其下成为视觉中心。
 * 2. 第二眼找操作：画布正下方集中放置唯一主按钮（开始/暂停）与轻量辅助控制（单步、重置、倍速、视图开关）；
 *    右侧栏精简为紧凑预设选择器（选中后展示单条说明）与对齐良好的参数滑杆列表。
 * 3. 最后读解释：画布下方以无边框大字号数字展示关键物理量读数；能量分布、公式与原理解析置于次级可折叠区。
 */

import React, { useEffect, useState } from "react";
import { useWidgetState, useWidgetLocale } from "@pudding/widget";
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Volume2,
  VolumeX,
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
  const [activePresetId, setActivePresetId] = useState<string>("");

  useEffect(() => {
    setLab(readLabPersistedState());
  }, [
    persisted.activeBenchId,
    persisted.running,
    persisted.slowMotion,
    persisted.showVectors,
    persisted.showVectorDetails,
    persisted.showGrid,
    JSON.stringify(persisted.paramsByBench),
  ]);

  const activeBench = getBenchById(lab.activeBenchId);
  const activeParams =
    lab.paramsByBench[activeBench.id] ?? activeBench.getDefaultParams();
  const activeState =
    lab.stateByBench[activeBench.id] ??
    activeBench.createInitialState(activeParams);
  const activeWave = lab.waveformByBench[activeBench.id] ?? [];

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
    setActivePresetId("");
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
    setActivePresetId("");
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

  function handleSelectPreset(presetId: string) {
    if (!presetId) {
      setActivePresetId("");
      return;
    }
    const preset = activeBench.presets.find((p) => p.id === presetId);
    if (!preset) return;
    playUiClick();
    setActivePresetId(preset.id);
    const nextParams = { ...preset.params };
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
          activeBench.sampleWaveform(freshState, nextParamsOrDefault(activeParams)),
        ],
      },
    });
  }

  function nextParamsOrDefault(p: Record<string, number>) {
    return p;
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

  const selectedPreset = activeBench.presets.find(
    (p) => p.id === activePresetId,
  );
  const detailLabel =
    locale === "zh-TW"
      ? "分力與數值"
      : locale === "en"
      ? "Components & Values"
      : "分力与数值";
  const customPresetPlaceholder =
    locale === "zh-TW"
      ? "選擇教學預設場景…"
      : locale === "en"
      ? "Select a preset scenario…"
      : "选择经典教学预设…";

  return (
    <div className="ml-app">
      {/* 1. 极简顶栏：仅保留标题与实验台切换 */}
      <header className="ml-topbar">
        <h1 className="ml-title">{t("appTitle")}</h1>

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
      </header>

      {/* 2. 主工作区：左侧实验画布与分层数据，右侧精简参数栏 */}
      <main className="ml-workspace">
        <section className="ml-stage-column">
          {/* 实验画布主角区 */}
          <div className="ml-canvas-surface">
            <svg
              viewBox="0 0 760 400"
              className="ml-stage-svg"
              preserveAspectRatio="xMidYMid meet"
            >
              {activeBench.renderStage({
                params: activeParams,
                state: activeState,
                showVectors: lab.showVectors,
                showVectorDetails: lab.showVectorDetails,
                showGrid: lab.showGrid,
                locale,
                onChangeParam: handleChangeParam,
              })}
            </svg>

            {/* 画布下方集中控制栏：左侧主操作+回放控制，右侧轻量视图开关 */}
            <div className="ml-transport-bar">
              <div className="ml-transport-main">
                <button
                  type="button"
                  className={`ml-play-btn ${lab.running ? "is-running" : ""}`}
                  onClick={handleTogglePlay}
                >
                  {lab.running ? <Pause size={14} /> : <Play size={14} />}
                  <span>{lab.running ? t("btnPause") : t("btnPlay")}</span>
                </button>

                <button
                  type="button"
                  className="ml-ghost-btn"
                  onClick={handleStepOnce}
                  disabled={lab.running}
                >
                  <StepForward size={14} />
                  <span>{t("btnStep")}</span>
                </button>

                <button
                  type="button"
                  className="ml-ghost-btn"
                  onClick={handleReset}
                >
                  <RotateCcw size={14} />
                  <span>{t("btnReset")}</span>
                </button>

                <button
                  type="button"
                  className={`ml-ghost-btn ${lab.slowMotion ? "is-active" : ""}`}
                  onClick={() => {
                    playUiClick();
                    commitLab({ ...lab, slowMotion: !lab.slowMotion });
                  }}
                >
                  <span>
                    {lab.slowMotion ? t("speedSlow") : t("speedNormal")}
                  </span>
                </button>
              </div>

              <div className="ml-transport-toggles">
                <button
                  type="button"
                  className={`ml-toggle-pill ${lab.showVectors ? "is-on" : ""}`}
                  onClick={() => {
                    playUiClick();
                    commitLab({ ...lab, showVectors: !lab.showVectors });
                  }}
                >
                  {t("toggleVectors")}
                </button>

                {lab.showVectors && (
                  <button
                    type="button"
                    className={`ml-toggle-pill ${
                      lab.showVectorDetails ? "is-on" : ""
                    }`}
                    onClick={() => {
                      playUiClick();
                      commitLab({
                        ...lab,
                        showVectorDetails: !lab.showVectorDetails,
                      });
                    }}
                  >
                    {detailLabel}
                  </button>
                )}

                <button
                  type="button"
                  className={`ml-toggle-pill ${lab.showGrid ? "is-on" : ""}`}
                  onClick={() => {
                    playUiClick();
                    commitLab({ ...lab, showGrid: !lab.showGrid });
                  }}
                >
                  {t("toggleGrid")}
                </button>

                <button
                  type="button"
                  className={`ml-toggle-pill is-icon ${!muted ? "is-on" : ""}`}
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
            </div>
          </div>

          {/* 3. 关键读数区：大字号数字 + 弱化单位，无边框平铺 */}
          <div className="ml-readout-strip" aria-label={t("panelTelemetry")}>
            {telemetry.map((item) => (
              <div key={item.id} className="ml-readout-item">
                <span className="ml-readout-label">
                  {loc(item.label, locale)}{" "}
                  <var className="ml-readout-sym">{item.symbol}</var>
                </span>
                <div className="ml-readout-val">
                  <strong>{item.value}</strong>
                  {item.unit && <small>{item.unit}</small>}
                </div>
              </div>
            ))}
          </div>

          {/* 4. 次级解释区：能量分布条 + 公式 + 可折叠原理推导 */}
          <div className="ml-secondary-area">
            <div className="ml-energy-row">
              <div className="ml-energy-meta">
                <span className="ml-energy-item is-ek">
                  <i></i>
                  {t("energyKinetic")} {energy.kinetic.toFixed(1)} J
                </span>
                <span className="ml-energy-item is-ep">
                  <i></i>
                  {t("energyPotential")} {energy.potential.toFixed(1)} J
                </span>
                {energy.thermal > 0.05 && (
                  <span className="ml-energy-item is-q">
                    <i></i>
                    {t("energyThermal")} {energy.thermal.toFixed(1)} J
                  </span>
                )}
                <span className="ml-energy-total">
                  {t("energyTotal")} {energy.total.toFixed(1)} J
                </span>
              </div>
              <div className="ml-energy-track">
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

            <details className="ml-principle-details">
              <summary className="ml-principle-summary">
                <span className="ml-summary-title">{t("panelPrinciple")}</span>
                <code className="ml-summary-formula">
                  {activeBench.formulaBadge}
                </code>
              </summary>
              <p className="ml-principle-body">
                {loc(activeBench.principleNote, locale)}
              </p>
            </details>
          </div>
        </section>

        {/* 右侧精简侧栏：紧凑预设选择器 + 统一对齐参数滑杆 */}
        <aside className="ml-sidebar">
          <div className="ml-sidebar-group">
            <label className="ml-section-label" htmlFor="ml-preset-select">
              {t("panelPresets")}
            </label>
            <select
              id="ml-preset-select"
              className="ml-preset-select"
              value={activePresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
            >
              <option value="">{customPresetPlaceholder}</option>
              {activeBench.presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {loc(preset.title, locale)}
                </option>
              ))}
            </select>
            {selectedPreset && (
              <p className="ml-preset-caption">
                {loc(selectedPreset.description, locale)}
              </p>
            )}
          </div>

          <div className="ml-sidebar-group">
            <div className="ml-section-label">{t("panelParams")}</div>
            <div className="ml-sliders-list">
              {activeBench.paramSpecs.map((spec) => {
                const val = activeParams[spec.key] ?? spec.defaultValue;
                return (
                  <label key={spec.key} className="ml-slider-row">
                    <div className="ml-slider-top">
                      <span className="ml-param-name">
                        {loc(spec.label, locale)}{" "}
                        <var className="ml-param-sym">{spec.symbol}</var>
                      </span>
                      <span className="ml-param-val">
                        <strong>{val}</strong>
                        {spec.unit && <small> {spec.unit}</small>}
                      </span>
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
        </aside>
      </main>
    </div>
  );
}
