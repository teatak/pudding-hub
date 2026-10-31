/**
 * ============================================================================
 * 实验台插件 2：抛体运动与平抛/自由落体同屏对比实验台 (`src/benches/projectile.tsx`)
 * ============================================================================
 *
 * 【教学目标】
 * 1. 运动的独立性与合成原理（伽利略平抛分解）：
 *    - 水平方向：不受外力（忽略阻力时），做匀速直线运动 vx(t) = v0 · cos(θ)，x(t) = vx · t
 *    - 竖直方向：只受重力，做匀变速直线运动 vy(t) = v0 · sin(θ) - g · t
 * 2. 平抛 vs 自由落体同屏对照球：
 *    - 当仰角 θ = 0°（平抛）时，左侧同步释放一颗“自由落体对照球”。
 *    - 频闪相机每 0.2s 打点一次并画出水平连接虚线，孩子可直观看到两球在任意时刻始终处于同一高度！
 * 3. 斜抛射程与星球重力对比：
 *    - 在无阻力平地条件下，45° 仰角射程最大；月球 (g=1.6 m/s²) 射程是地球的 6 倍。
 *
 * 【插件独立性保证】
 * 本文件只依赖 `../types` 的 `ExperimentBench` 契约，与其他实验台完全解耦。
 */

import React from "react";
import type {
  ExperimentBench,
  EnergyBreakdown,
  TelemetryItem,
  BenchStepResult,
  BenchStageProps,
} from "../types";

export interface ProjectileParams extends Record<string, number> {
  /** 发射仰角 θ (°)，0° 即为水平平抛 */
  launchAngleDeg: number;
  /** 发射初速度 v0 (m/s) */
  initialSpeed: number;
  /** 发射台离地高度 h0 (m) */
  towerHeight: number;
  /** 重力加速度 g (m/s²) */
  gravity: number;
  /** 靶心水平距离 targetX (m) */
  targetDistance: number;
}

export interface ProjectilePoint {
  t: number;
  x: number;
  y: number;
  freeFallY: number;
}

export interface ProjectileState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  freeFallY: number;
  freeFallVy: number;
  maxHeight: number;
  trail: ProjectilePoint[];
  strobes: ProjectilePoint[];
  lastStrobeAt: number;
  hitTarget: boolean;
  completed: boolean;
}

const BALL_MASS = 1.0; // 1.0 kg 标准实验球

export const projectileBench: ExperimentBench<
  ProjectileParams,
  ProjectileState
> = {
  id: "projectile",
  title: {
    "zh-CN": "2. 抛体与平抛对比",
    "zh-TW": "2. 拋體與平拋對比",
    en: "2. Projectile & Free-Fall",
    ja: "2. 水平投射と自由落下",
    ko: "2. 투사체와 자유 낙하",
    es: "2. Proyectil y caída libre",
    de: "2. Wurf & freier Fall",
    fr: "2. Projectile et chute libre",
  },
  subtitle: {
    "zh-CN": "同屏对比平抛与自由落体等高同步，频闪观测水平匀速与竖直匀加速",
    "zh-TW": "同屏對比平拋與自由落體等高同步，頻閃觀測水平勻速與豎直勻加速",
    en: "Compare horizontal projectile vs. simultaneous free-fall with strobe photography",
    ja: "水平投射と自由落下の同時降下を比較し、ストロボ撮影で独立性を観察",
    ko: "수평 투사와 자유 낙하의 동일 높이 낙하를 스트로보 촬영으로 비교",
    es: "Compara el tiro horizontal con la caída libre simultánea mediante luz estroboscópica",
    de: "Vergleicht waagerechten Wurf und freien Fall im Stroboskop-Verfahren",
    fr: "Compare le tir horizontal et la chute libre simultanée par stroboscopie",
  },
  formulaBadge: "x(t) = v₀·cosθ·t , y(t) = h₀ + v₀·sinθ·t - ½gt²",
  principleNote: {
    "zh-CN":
      "曲线运动可分解为两个相互独立的直线运动：水平方向不受力，保持匀速（频闪点水平间距相等）；竖直方向只受重力，加速度恒为 g。当仰角 θ = 0°（平抛）时，平抛球与同时释放的自由落体球在每一瞬间高度完全相同，证明水平速度不影响下落快慢！",
    "zh-TW":
      "曲線運動可分解為兩個相互獨立的直線運動：水平方向不受力，保持勻速（頻閃點水平間距相等）；豎直方向只受重力，加速度恆為 g。當仰角 θ = 0°（平拋）時，平拋球與同時釋放的自由落體球在每一瞬間高度完全相同，證明水平速度不影響下落快慢！",
    en:
      "Projectile motion is the superposition of constant horizontal velocity (vx = v0·cosθ) and vertical gravitational acceleration (ay = -g). A horizontal projectile (θ = 0°) and a dropped ball hit the ground at the exact same instant!",
  },
  waveformLabels: {
    primary: {
      "zh-CN": "抛体高度 y (m)",
      "zh-TW": "拋體高度 y (m)",
      en: "Height y (m)",
    },
    secondary: {
      "zh-CN": "竖直速度 vy (m/s)",
      "zh-TW": "豎直速度 vy (m/s)",
      en: "Vertical vy (m/s)",
    },
    unit: "m , m/s",
  },
  paramSpecs: [
    {
      key: "launchAngleDeg",
      label: { "zh-CN": "发射仰角", "zh-TW": "發射仰角", en: "Launch Angle" },
      symbol: "θ",
      unit: "°",
      min: 0,
      max: 75,
      step: 5,
      defaultValue: 0,
    },
    {
      key: "initialSpeed",
      label: { "zh-CN": "发射初速度", "zh-TW": "發射初速度", en: "Initial Speed" },
      symbol: "v₀",
      unit: "m/s",
      min: 5,
      max: 28,
      step: 1,
      defaultValue: 16,
    },
    {
      key: "towerHeight",
      label: { "zh-CN": "发射台高度", "zh-TW": "發射台高度", en: "Tower Height" },
      symbol: "h₀",
      unit: "m",
      min: 0,
      max: 25,
      step: 1,
      defaultValue: 20,
    },
    {
      key: "gravity",
      label: { "zh-CN": "星球重力", "zh-TW": "星球重力", en: "Gravity" },
      symbol: "g",
      unit: "m/s²",
      min: 1.6,
      max: 20,
      step: 0.2,
      defaultValue: 9.8,
    },
    {
      key: "targetDistance",
      label: { "zh-CN": "地面靶心距离", "zh-TW": "地面靶心距離", en: "Target Dist" },
      symbol: "X_靶",
      unit: "m",
      min: 10,
      max: 60,
      step: 1,
      defaultValue: 32,
    },
  ],
  presets: [
    {
      id: "horizontal_vs_freefall",
      title: {
        "zh-CN": "平抛 vs 自由落体同高实验 (θ = 0°)",
        "zh-TW": "平拋 vs 自由落體同高實驗 (θ = 0°)",
        en: "Horizontal vs. Free-Fall (θ = 0°)",
      },
      description: {
        "zh-CN": "20m 高台平抛 (v0=16m/s)，与自由落体球同时落地且精确命中 32m 靶心",
        "zh-TW": "20m 高台平拋 (v0=16m/s)，與自由落體球同時落地且精確命中 32m 靶心",
        en: "20m tower horizontal launch (16m/s); matches free-fall drop height at every strobe instant",
      },
      params: {
        launchAngleDeg: 0,
        initialSpeed: 16,
        towerHeight: 20,
        gravity: 9.8,
        targetDistance: 32,
      },
    },
    {
      id: "max_range_45",
      title: {
        "zh-CN": "平地 45° 最大射程角",
        "zh-TW": "平地 45° 最大射程角",
        en: "45° Maximum Range Launch",
      },
      description: {
        "zh-CN": "地面高度 h0=0m，仰角 45°，初速度 22m/s，射程达 R = v₀²/g ≈ 49.4m",
        "zh-TW": "地面高度 h0=0m，仰角 45°，初速度 22m/s，射程達 R = v₀²/g ≈ 49.4m",
        en: "Ground-level 45° launch achieves maximum horizontal range R = v0²/g ≈ 49.4m",
      },
      params: {
        launchAngleDeg: 45,
        initialSpeed: 22,
        towerHeight: 0,
        gravity: 9.8,
        targetDistance: 49,
      },
    },
    {
      id: "moon_low_gravity",
      title: {
        "zh-CN": "月球低重力远射 (g = 1.6 m/s²)",
        "zh-TW": "月球低重力遠射 (g = 1.6 m/s²)",
        en: "Lunar Gravity Launch (g = 1.6 m/s²)",
      },
      description: {
        "zh-CN": "月球表面重力仅为地球 1/6，较小初速度即可飞出超远抛物线",
        "zh-TW": "月球表面重力僅為地球 1/6，較小初速度即可飛出超遠拋物線",
        en: "In lunar gravity (1.6 m/s²), a gentle 10m/s launch travels 54 meters",
      },
      params: {
        launchAngleDeg: 30,
        initialSpeed: 10,
        towerHeight: 5,
        gravity: 1.6,
        targetDistance: 54,
      },
    },
  ],

  getDefaultParams(): ProjectileParams {
    return {
      launchAngleDeg: 0,
      initialSpeed: 16,
      towerHeight: 20,
      gravity: 9.8,
      targetDistance: 32,
    };
  },

  createInitialState(params: ProjectileParams): ProjectileState {
    const rad = (params.launchAngleDeg * Math.PI) / 180;
    const vx = params.initialSpeed * Math.cos(rad);
    const vy = params.initialSpeed * Math.sin(rad);
    const pt0: ProjectilePoint = {
      t: 0,
      x: 0,
      y: params.towerHeight,
      freeFallY: params.towerHeight,
    };
    return {
      t: 0,
      x: 0,
      y: params.towerHeight,
      vx,
      vy,
      freeFallY: params.towerHeight,
      freeFallVy: 0,
      maxHeight: params.towerHeight,
      trail: [pt0],
      strobes: [pt0],
      lastStrobeAt: 0,
      hitTarget: false,
      completed: false,
    };
  },

  stepPhysics(
    state: ProjectileState,
    params: ProjectileParams,
    dt: number,
  ): BenchStepResult<ProjectileState> {
    if (state.completed) return { state };

    const soundEvents: BenchStepResult<ProjectileState>["soundEvents"] = [];
    if (state.t === 0) {
      soundEvents.push({ kind: "launch" });
    }

    const rad = (params.launchAngleDeg * Math.PI) / 180;
    const vx0 = params.initialSpeed * Math.cos(rad);
    const vy0 = params.initialSpeed * Math.sin(rad);

    let nextT = state.t + dt;
    let nextX = vx0 * nextT;
    let nextY =
      params.towerHeight + vy0 * nextT - 0.5 * params.gravity * nextT * nextT;
    let nextVy = vy0 - params.gravity * nextT;

    let nextFreeY = Math.max(
      0,
      params.towerHeight - 0.5 * params.gravity * nextT * nextT,
    );
    let nextFreeVy = nextFreeY > 0 ? -params.gravity * nextT : 0;

    let completed = false;
    let hitTarget = state.hitTarget;

    if (nextY <= 0 && nextT > 0.02) {
      // 精确求解落地时刻 t_land: h0 + vy0*t - 0.5*g*t^2 = 0
      const disc = Math.max(
        0,
        vy0 * vy0 + 2 * params.gravity * params.towerHeight,
      );
      const tLand = (vy0 + Math.sqrt(disc)) / params.gravity;
      nextT = tLand;
      nextX = vx0 * tLand;
      nextY = 0;
      nextVy = vy0 - params.gravity * tLand;
      nextFreeY = 0;
      nextFreeVy = 0;
      completed = true;

      if (Math.abs(nextX - params.targetDistance) <= 2.2) {
        hitTarget = true;
        soundEvents.push({ kind: "targetHit" });
      } else {
        soundEvents.push({ kind: "collision", intensity: 0.7 });
      }
    }

    const pt: ProjectilePoint = {
      t: nextT,
      x: nextX,
      y: nextY,
      freeFallY: nextFreeY,
    };

    const nextStrobes = [...state.strobes];
    let lastStrobeAt = state.lastStrobeAt;
    if (nextT - lastStrobeAt >= 0.25 || completed) {
      nextStrobes.push(pt);
      lastStrobeAt = nextT;
    }

    return {
      state: {
        ...state,
        t: nextT,
        x: nextX,
        y: nextY,
        vx: vx0,
        vy: nextVy,
        freeFallY: nextFreeY,
        freeFallVy: nextFreeVy,
        maxHeight: Math.max(state.maxHeight, nextY),
        trail: [...state.trail.slice(-80), pt],
        strobes: nextStrobes.slice(-20),
        lastStrobeAt,
        hitTarget,
        completed,
      },
      soundEvents,
    };
  },

  computeEnergy(
    state: ProjectileState,
    params: ProjectileParams,
  ): EnergyBreakdown {
    const speedSq = state.vx * state.vx + state.vy * state.vy;
    const kinetic = 0.5 * BALL_MASS * speedSq;
    const potential = BALL_MASS * params.gravity * Math.max(0, state.y);
    return {
      kinetic,
      potential,
      thermal: 0,
      total: kinetic + potential,
    };
  },

  computeTelemetry(
    state: ProjectileState,
    params: ProjectileParams,
  ): TelemetryItem[] {
    return [
      {
        id: "flightTime",
        label: { "zh-CN": "飞行时间", "zh-TW": "飛行時間", en: "Flight Time" },
        symbol: "t",
        value: state.t.toFixed(2),
        unit: "s",
        highlight: "cyan",
      },
      {
        id: "rangeX",
        label: { "zh-CN": "水平位移", "zh-TW": "水平位移", en: "Horizontal x" },
        symbol: "x",
        value: state.x.toFixed(1),
        unit: "m",
        highlight: "emerald",
      },
      {
        id: "heightY",
        label: { "zh-CN": "当前高度", "zh-TW": "目前高度", en: "Altitude y" },
        symbol: "y",
        value: state.y.toFixed(1),
        unit: "m",
        highlight: "amber",
      },
      {
        id: "vx",
        label: { "zh-CN": "水平分速度", "zh-TW": "水平分速度", en: "Horiz. vx" },
        symbol: "vx",
        value: state.vx.toFixed(1),
        unit: "m/s",
      },
      {
        id: "vy",
        label: { "zh-CN": "竖直分速度", "zh-TW": "豎直分速度", en: "Vert. vy" },
        symbol: "vy",
        value: state.vy.toFixed(1),
        unit: "m/s",
        highlight: state.hitTarget ? "emerald" : "rose",
      },
    ];
  },

  sampleWaveform(state: ProjectileState) {
    return {
      t: Number(state.t.toFixed(2)),
      primary: Number(state.y.toFixed(2)),
      secondary: Number(state.vy.toFixed(2)),
    };
  },

  isCompleted(state: ProjectileState): boolean {
    return state.completed;
  },

  summarizeForAI(state: ProjectileState, params: ProjectileParams) {
    return {
      bench: "projectile",
      flightTimeS: Number(state.t.toFixed(2)),
      horizontalDistanceM: Number(state.x.toFixed(2)),
      currentAltitudeM: Number(state.y.toFixed(2)),
      maxAltitudeM: Number(state.maxHeight.toFixed(2)),
      vxMS: Number(state.vx.toFixed(2)),
      vyMS: Number(state.vy.toFixed(2)),
      targetDistanceM: params.targetDistance,
      hitTarget: state.hitTarget,
    };
  },

  renderStage({
    params,
    state,
    showVectors,
    showGrid,
  }: BenchStageProps<ProjectileParams, ProjectileState>) {
    const originX = 95;
    const groundY = 345;
    const scale = 9.2; // 1m = 9.2px (65m = 598px, 32m = 294px)

    const toPxX = (m: number) => originX + m * scale;
    const toPxY = (m: number) => groundY - m * scale;

    const ballPxX = toPxX(state.x);
    const ballPxY = toPxY(state.y);
    const freeFallPxX = originX - 38;
    const freeFallPxY = toPxY(state.freeFallY);
    const towerTopY = toPxY(params.towerHeight);
    const targetPxX = toPxX(params.targetDistance);

    const trailPath =
      state.trail.length > 1
        ? state.trail
            .map(
              (pt, i) =>
                `${i === 0 ? "M" : "L"} ${toPxX(pt.x).toFixed(1)} ${toPxY(
                  pt.y,
                ).toFixed(1)}`,
            )
            .join(" ")
        : "";

    return (
      <g>
        {/* 坐标网格与米制标尺 */}
        {showGrid && (
          <g>
            {Array.from({ length: 7 }, (_, i) => {
              const m = i * 10;
              const px = toPxX(m);
              return (
                <g key={`gx-${m}`}>
                  <line
                    x1={px}
                    y1={20}
                    x2={px}
                    y2={groundY}
                    stroke="var(--ml-canvas-grid)"
                  />
                  <text
                    x={px}
                    y={groundY + 18}
                    textAnchor="middle"
                    fill="var(--ml-text-dim)"
                    fontSize="10"
                  >
                    {m}m
                  </text>
                </g>
              );
            })}
            {Array.from({ length: 4 }, (_, i) => {
              const m = (i + 1) * 10;
              const py = toPxY(m);
              return (
                <g key={`gy-${m}`}>
                  <line
                    x1={40}
                    y1={py}
                    x2={730}
                    y2={py}
                    stroke="var(--ml-canvas-grid)"
                  />
                  <text
                    x={32}
                    y={py + 4}
                    textAnchor="end"
                    fill="var(--ml-text-dim)"
                    fontSize="10"
                  >
                    {m}m
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* 地面 */}
        <line
          x1={25}
          y1={groundY}
          x2={735}
          y2={groundY}
          stroke="var(--ml-canvas-ground)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* 发射高台 */}
        {params.towerHeight > 0 && (
          <rect
            x={originX - 18}
            y={towerTopY}
            width={36}
            height={groundY - towerTopY}
            rx={3}
            fill="var(--ml-ramp-surface)"
            stroke="var(--ml-ramp-edge)"
            strokeWidth="2"
          />
        )}

        {/* 地面靶标 */}
        <g transform={`translate(${targetPxX}, ${groundY})`}>
          <ellipse
            cx={0}
            cy={0}
            rx={20}
            ry={5}
            fill={state.hitTarget ? "rgba(34, 197, 94, 0.45)" : "rgba(239, 68, 68, 0.35)"}
            stroke={state.hitTarget ? "#4ade80" : "#f87171"}
            strokeWidth="2"
          />
          <circle
            cx={0}
            cy={0}
            r={4}
            fill={state.hitTarget ? "#fde047" : "#ef4444"}
          />
          <text
            x={0}
            y={32}
            textAnchor="middle"
            fill={state.hitTarget ? "#86efac" : "#fca5a5"}
            fontSize="10.5"
            fontWeight="700"
          >
            🎯 靶心 {params.targetDistance}m {state.hitTarget ? "（命中!）" : ""}
          </text>
        </g>

        {/* 平抛模式 (θ = 0°) 时展示同步自由落体对照球与等高水平虚线 */}
        {params.launchAngleDeg === 0 && params.towerHeight > 0 && (
          <g>
            <line
              x1={freeFallPxX}
              y1={towerTopY}
              x2={freeFallPxX}
              y2={groundY}
              stroke="rgba(168, 85, 247, 0.35)"
              strokeDasharray="3 3"
            />
            {state.strobes.map((st, idx) => (
              <g key={`ff-st-${idx}`}>
                <line
                  x1={freeFallPxX}
                  y1={toPxY(st.freeFallY)}
                  x2={toPxX(st.x)}
                  y2={toPxY(st.y)}
                  stroke="rgba(168, 85, 247, 0.28)"
                  strokeDasharray="4 4"
                />
                <circle
                  cx={freeFallPxX}
                  cy={toPxY(st.freeFallY)}
                  r={4}
                  fill="rgba(192, 132, 252, 0.55)"
                />
              </g>
            ))}
            <circle
              cx={freeFallPxX}
              cy={freeFallPxY}
              r={8}
              fill="#a855f7"
              stroke="#f3e8ff"
              strokeWidth="1.8"
            />
          </g>
        )}

        {/* 抛物线连续轨迹与频闪相机点 */}
        {trailPath && (
          <path
            d={trailPath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.2"
            strokeOpacity="0.8"
          />
        )}
        {state.strobes.map((st, idx) => (
          <circle
            key={`pr-st-${idx}`}
            cx={toPxX(st.x)}
            cy={toPxY(st.y)}
            r={3.8}
            fill="#fde047"
            fillOpacity="0.8"
          />
        ))}

        {/* 抛体主球与速度正交分解矢量 (vx, vy, v) */}
        <g transform={`translate(${ballPxX}, ${ballPxY})`}>
          <circle
            cx={0}
            cy={0}
            r={9}
            fill="#f59e0b"
            stroke="#fef08a"
            strokeWidth="2"
          />
          {showVectors && (
            <g>
              {/* 水平分速度 vx (恒定不变) */}
              <line
                x1={0}
                y1={0}
                x2={state.vx * 2.8}
                y2={0}
                stroke="#22c55e"
                strokeWidth="2.4"
              />
              <polygon
                points={`${state.vx * 2.8},0 ${state.vx * 2.8 - 6},-3.5 ${
                  state.vx * 2.8 - 6
                },3.5`}
                fill="#22c55e"
              />
              <text
                x={state.vx * 2.8 + 5}
                y={4}
                fill="#86efac"
                fontSize="10"
                fontWeight="700"
              >
                vx={state.vx.toFixed(1)}
              </text>

              {/* 竖直分速度 vy */}
              {Math.abs(state.vy) > 0.3 && (
                <>
                  <line
                    x1={0}
                    y1={0}
                    x2={0}
                    y2={-state.vy * 2.4}
                    stroke="#f43f5e"
                    strokeWidth="2.4"
                  />
                  <text
                    x={8}
                    y={-state.vy * 2.4}
                    fill="#fda4af"
                    fontSize="10"
                    fontWeight="700"
                  >
                    vy={state.vy.toFixed(1)}
                  </text>
                </>
              )}
            </g>
          )}
        </g>

        {/* 顶部实验说明铭牌 */}
        <g transform="translate(20, 22)">
          <rect
            x={0}
            y={0}
            width={295}
            height={30}
            rx={6}
            fill="rgba(15, 23, 42, 0.85)"
            stroke="rgba(56, 189, 248, 0.35)"
          />
          <text x={12} y={19} fill="#e2e8f0" fontSize="11.5" fontWeight="700">
            {params.launchAngleDeg === 0
              ? "🟣 紫球：自由落体对照 | 🟠 橙球：平抛（时刻等高）"
              : `🚀 斜抛仰角 ${params.launchAngleDeg}° · 最大高度 ${state.maxHeight.toFixed(1)}m`}
          </text>
        </g>
      </g>
    );
  },
};
