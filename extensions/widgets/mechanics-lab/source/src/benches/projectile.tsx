/**
 * ============================================================================
 * 实验台插件 2：抛体运动与平抛/自由落体同屏对比实验台 (`src/benches/projectile.tsx`)
 * ============================================================================
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
  launchAngleDeg: number;
  initialSpeed: number;
  towerHeight: number;
  gravity: number;
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

const BALL_MASS = 1.0;

function renderArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  label: string,
  offsetX: number,
  offsetY: number,
  anchor: "start" | "middle" | "end" = "start",
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 4) return null;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const headLen = 7;
  const headW = 3.2;
  const bx = x2 - ux * headLen;
  const by = y2 - uy * headLen;

  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={bx}
        y2={by}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <polygon
        points={`${x2},${y2} ${bx + px * headW},${by + py * headW} ${
          bx - px * headW
        },${by - py * headW}`}
        fill={color}
      />
      <text
        x={x2 + offsetX}
        y={y2 + offsetY}
        textAnchor={anchor}
        fill={color}
        fontSize="11"
        fontWeight="600"
        style={{
          paintOrder: "stroke",
          stroke: "var(--ml-canvas-bg)",
          strokeWidth: "3.5px",
        }}
      >
        {label}
      </text>
    </g>
  );
}

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
  formulaBadge: "x(t) = v₀·cosθ·t , y(t) = h₀ + v₀·sinθ·t − ½gt²",
  principleNote: {
    "zh-CN":
      "曲线运动可分解为两个相互独立的直线运动：水平方向不受力，保持匀速（频闪点水平间距相等）；竖直方向只受重力，加速度恒为 g。当仰角 θ = 0°（平抛）时，平抛球与同时释放的自由落体球在每一瞬间高度完全相同，证明水平速度不影响下落快慢。",
    "zh-TW":
      "曲線運動可分解為兩個相互獨立的直線運動：水平方向不受力，保持勻速（頻閃點水平間距相等）；豎直方向只受重力，加速度恆為 g。當仰角 θ = 0°（平拋）時，平拋球與同時釋放的自由落體球在每一瞬間高度完全相同，證明水平速度不影響下落快慢。",
    en:
      "Projectile motion is the superposition of constant horizontal velocity (vx = v0·cosθ) and vertical gravitational acceleration (ay = -g). A horizontal projectile (θ = 0°) and a dropped ball hit the ground at the exact same instant.",
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
      symbol: "X",
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
    showVectorDetails = false,
    showGrid,
  }: BenchStageProps<ProjectileParams, ProjectileState>) {
    const originX = 100;
    const groundY = 338;
    const scale = 9.2;

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
        {showGrid && (
          <g>
            {Array.from({ length: 7 }, (_, i) => {
              const m = i * 10;
              const px = toPxX(m);
              return (
                <g key={`gx-${m}`}>
                  <line
                    x1={px}
                    y1={24}
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
            {Array.from({ length: 3 }, (_, i) => {
              const m = (i + 1) * 10;
              const py = toPxY(m);
              return (
                <g key={`gy-${m}`}>
                  <line
                    x1={48}
                    y1={py}
                    x2={712}
                    y2={py}
                    stroke="var(--ml-canvas-grid)"
                  />
                  <text
                    x={40}
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

        <line
          x1={48}
          y1={groundY}
          x2={712}
          y2={groundY}
          stroke="var(--ml-canvas-ground)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {params.towerHeight > 0 && (
          <rect
            x={originX - 16}
            y={towerTopY}
            width={32}
            height={groundY - towerTopY}
            rx={2}
            fill="var(--ml-ramp-surface)"
            stroke="var(--ml-ramp-edge)"
            strokeWidth="1.25"
          />
        )}

        {/* 地面靶标 */}
        <g transform={`translate(${targetPxX}, ${groundY})`}>
          <ellipse
            cx={0}
            cy={0}
            rx={18}
            ry={4.5}
            fill={state.hitTarget ? "rgba(16, 185, 129, 0.25)" : "rgba(225, 29, 72, 0.16)"}
            stroke={state.hitTarget ? "var(--ml-force-n)" : "var(--ml-force-f)"}
            strokeWidth="1.5"
          />
          <circle
            cx={0}
            cy={0}
            r={3}
            fill={state.hitTarget ? "var(--ml-force-n)" : "var(--ml-force-f)"}
          />
          <text
            x={0}
            y={22}
            textAnchor="middle"
            fill="var(--ml-text-muted)"
            fontSize="11"
            fontWeight="500"
          >
            {params.targetDistance} m {state.hitTarget ? "✓" : ""}
          </text>
        </g>

        {/* 平抛 vs 自由落体同屏对比 */}
        {params.launchAngleDeg === 0 && params.towerHeight > 0 && (
          <g>
            <line
              x1={freeFallPxX}
              y1={towerTopY}
              x2={freeFallPxX}
              y2={groundY}
              stroke="var(--ml-text-dim)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.4"
            />
            {state.strobes.map((st, idx) => (
              <g key={`ff-st-${idx}`}>
                <line
                  x1={freeFallPxX}
                  y1={toPxY(st.freeFallY)}
                  x2={toPxX(st.x)}
                  y2={toPxY(st.y)}
                  stroke="var(--ml-text-dim)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.32"
                />
                <circle
                  cx={freeFallPxX}
                  cy={toPxY(st.freeFallY)}
                  r={3}
                  fill="var(--ml-text-muted)"
                  opacity="0.45"
                />
              </g>
            ))}
            <circle
              cx={freeFallPxX}
              cy={freeFallPxY}
              r={7}
              fill="var(--ml-text-muted)"
              stroke="var(--ml-canvas-bg)"
              strokeWidth="1.5"
            />
          </g>
        )}

        {trailPath && (
          <path
            d={trailPath}
            fill="none"
            stroke="var(--ml-primary)"
            strokeWidth="1.8"
            strokeOpacity="0.75"
          />
        )}
        {state.strobes.map((st, idx) => (
          <circle
            key={`pr-st-${idx}`}
            cx={toPxX(st.x)}
            cy={toPxY(st.y)}
            r={3}
            fill="var(--ml-primary)"
            fillOpacity="0.65"
          />
        ))}

        {/* 抛体主球与速度分解箭头 */}
        <g>
          {showVectors && (
            <g>
              {renderArrow(
                ballPxX,
                ballPxY,
                ballPxX + state.vx * 2.5,
                ballPxY,
                "var(--ml-force-n)",
                showVectorDetails ? `vx = ${state.vx.toFixed(1)} m/s` : "vx",
                6,
                4,
                "start",
              )}
              {Math.abs(state.vy) > 0.3 &&
                renderArrow(
                  ballPxX,
                  ballPxY,
                  ballPxX,
                  ballPxY - state.vy * 2.2,
                  "var(--ml-force-f)",
                  showVectorDetails ? `vy = ${state.vy.toFixed(1)} m/s` : "vy",
                  8,
                  4,
                  "start",
                )}
            </g>
          )}
          <circle
            cx={ballPxX}
            cy={ballPxY}
            r={8}
            fill="var(--ml-block-fill)"
            stroke="var(--ml-block-stroke)"
            strokeWidth="1.5"
          />
        </g>

        {/* 左上角轻量说明文字 */}
        <g transform="translate(24, 28)">
          <circle cx={0} cy={-4} r={3.5} fill="var(--ml-primary)" />
          <text
            x={10}
            y={0}
            fill="var(--ml-text-muted)"
            fontSize="12"
            fontWeight="500"
          >
            {params.launchAngleDeg === 0
              ? `平抛与左侧自由落体对照球时刻等高 · y = ${state.y.toFixed(1)} m`
              : `斜抛仰角 ${params.launchAngleDeg}° · 最高点 ${state.maxHeight.toFixed(1)} m`}
          </text>
        </g>
      </g>
    );
  },
};
