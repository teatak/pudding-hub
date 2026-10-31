/**
 * ============================================================================
 * 实验台插件 1：斜面与受力正交分解实验台 (`src/benches/ramp.tsx`)
 * ============================================================================
 *
 * 【教学目标】
 * 1. 直观展示重力 G = mg 在斜面上的正交分解：
 *    - 沿斜面向下的下滑分力：F_x = mg · sin(θ)
 *    - 垂直斜面向下的正压力：F_y = mg · cos(θ)，支持力 N = F_y
 * 2. 直观演示静摩擦与动摩擦临界角：
 *    - 当 |F_x + F_push| <= μ · N 且初速度 v = 0 时，滑块保持静止，静摩擦力 f = -(F_x + F_push)
 *    - 临界滑动倾角满足 tan(θ_c) = μ，即 θ_c = arctan(μ)
 * 3. 验证能量守恒定律：
 *    - 重力势能减少量 ΔEp = 平动动能增加量 ΔEk + 摩擦生热 Q (Q = f_k · s)
 *
 * 【插件独立性保证】
 * 本文件只依赖 `../types` 的 `ExperimentBench` 契约，不引用任何其他实验台或全局可变状态。
 */

import React from "react";
import type {
  ExperimentBench,
  EnergyBreakdown,
  TelemetryItem,
  BenchStepResult,
  BenchStageProps,
} from "../types";

export interface RampParams extends Record<string, number> {
  /** 斜面倾角 θ (°) */
  angleDeg: number;
  /** 滑块质量 m (kg) */
  mass: number;
  /** 动/静摩擦系数 μ */
  mu: number;
  /** 沿斜面外加推力 F_push (N，正值为沿斜面向下推，负值为沿斜面向上拉) */
  pushForce: number;
  /** 重力加速度 g (m/s²) */
  gravity: number;
}

export interface RampState {
  /** 仿真时间 t (s) */
  t: number;
  /** 沿斜面从顶端起算的位移 s (m)，斜面总长 L = 8.0m */
  s: number;
  /** 沿斜面向下的速度 v (m/s) */
  v: number;
  /** 沿斜面向下的瞬时加速度 a (m/s²) */
  a: number;
  /** 摩擦累积生热 Q (J) */
  thermalEnergy: number;
  /** 初始总势能基准 E0 (J) */
  initialPotential: number;
  /** 历史轨迹打点 s 坐标（每隔 0.25s 记录一次，展示匀加速位移差 Δs = aT²） */
  strobePositions: number[];
  lastStrobeAt: number;
  completed: boolean;
}

export const RAMP_LENGTH = 8.0; // 斜面总长度 8.0 m
export const INITIAL_S = 1.2; // 初始放置位置距离斜面顶端 1.2 m

function computeRampForces(params: RampParams, v: number) {
  const rad = (params.angleDeg * Math.PI) / 180;
  const weight = params.mass * params.gravity;
  const gx = weight * Math.sin(rad); // 下滑分力 mg sinθ
  const gy = weight * Math.cos(rad); // 垂直分力 mg cosθ
  const normal = gy; // 支持力 N = mg cosθ
  const maxFriction = params.mu * normal; // 最大静摩擦 / 滑动摩擦力 μmg cosθ
  const driveForce = gx + params.pushForce;

  let friction = 0; // 正方向定义为沿斜面向下，因此阻碍下滑的摩擦力为负
  let netForce = 0;
  let isStatic = false;

  if (Math.abs(v) < 1e-4) {
    if (Math.abs(driveForce) <= maxFriction) {
      // 处于静摩擦平衡状态
      friction = -driveForce;
      netForce = 0;
      isStatic = true;
    } else {
      const dir = Math.sign(driveForce);
      friction = -dir * maxFriction;
      netForce = driveForce + friction;
    }
  } else {
    const dir = Math.sign(v);
    friction = -dir * maxFriction;
    netForce = driveForce + friction;
  }

  const accel = netForce / params.mass;
  const criticalAngleDeg = (Math.atan(params.mu) * 180) / Math.PI;

  return {
    rad,
    weight,
    gx,
    gy,
    normal,
    maxFriction,
    friction,
    driveForce,
    netForce,
    accel,
    isStatic,
    criticalAngleDeg,
  };
}

export const rampBench: ExperimentBench<RampParams, RampState> = {
  id: "ramp",
  title: {
    "zh-CN": "1. 斜面与受力分解",
    "zh-TW": "1. 斜面與受力分解",
    en: "1. Inclined Plane & Forces",
    ja: "1. 斜面と力の分解",
    ko: "1. 경사면과 힘의 분해",
    es: "1. Plano inclinado y fuerzas",
    de: "1. Schiefe Ebene & Kräfte",
    fr: "1. Plan incliné et forces",
  },
  subtitle: {
    "zh-CN": "正交分解重力 (mg·sinθ / mg·cosθ)，探索静摩擦临界角与牛顿第二定律",
    "zh-TW": "正交分解重力 (mg·sinθ / mg·cosθ)，探索靜摩擦臨界角與牛頓第二定律",
    en: "Decompose gravity into orthogonal components and explore the critical angle of friction",
    ja: "重力を直交分解し、摩擦の臨界角とニュートンの運動方程式を検証",
    ko: "중력을 직교 성분으로 분해하고 마찰의 임계각과 뉴턴 운동 법칙 관찰",
    es: "Descompone el peso en componentes ortogonales y analiza el ángulo crítico de rozamiento",
    de: "Zerlegt die Gewichtskraft orthogonal und untersucht den Reibungswinkel",
    fr: "Décompose le poids en composantes orthogonales et étudie l'angle critique de frottement",
  },
  formulaBadge: "F_合 = mg·sinθ + F_推 - μ·mg·cosθ = m·a",
  principleNote: {
    "zh-CN":
      "斜面上滑块的重力 G = mg 可正交分解为沿斜面向下的分力 Gx = mg·sinθ 和垂直斜面的分力 Gy = mg·cosθ。当未施加外推力时，滑块开始下滑的条件是 mg·sinθ > μ·mg·cosθ，两边消去质量 m 和 g 可得 tanθ > μ（即临界角 θc = arctan(μ) 与物体质量无关！）。",
    "zh-TW":
      "斜面上滑塊的重力 G = mg 可正交分解為沿斜面向下的分力 Gx = mg·sinθ 和垂直斜面的分力 Gy = mg·cosθ。當未施加外推力時，滑塊開始下滑的條件是 mg·sinθ > μ·mg·cosθ，兩邊消去質量 m 和 g 可得 tanθ > μ（即臨界角 θc = arctan(μ) 與物體質量無關！）。",
    en:
      "Gravity G = mg decomposes into a down-slope component Gx = mg·sinθ and a normal component Gy = mg·cosθ. Sliding begins when tanθ > μ, meaning the critical angle θc = arctan(μ) is independent of mass m!",
  },
  waveformLabels: {
    primary: {
      "zh-CN": "位移 s (m)",
      "zh-TW": "位移 s (m)",
      en: "Displacement s (m)",
    },
    secondary: {
      "zh-CN": "速度 v (m/s)",
      "zh-TW": "速度 v (m/s)",
      en: "Velocity v (m/s)",
    },
    unit: "m , m/s",
  },
  paramSpecs: [
    {
      key: "angleDeg",
      label: { "zh-CN": "斜面倾角", "zh-TW": "斜面傾角", en: "Ramp Angle" },
      symbol: "θ",
      unit: "°",
      min: 5,
      max: 55,
      step: 1,
      defaultValue: 30,
    },
    {
      key: "mass",
      label: { "zh-CN": "滑块质量", "zh-TW": "滑塊質量", en: "Block Mass" },
      symbol: "m",
      unit: "kg",
      min: 1,
      max: 10,
      step: 0.5,
      defaultValue: 2,
    },
    {
      key: "mu",
      label: { "zh-CN": "摩擦系数", "zh-TW": "摩擦係數", en: "Friction Coeff" },
      symbol: "μ",
      unit: "",
      min: 0,
      max: 0.8,
      step: 0.05,
      defaultValue: 0.25,
    },
    {
      key: "pushForce",
      label: { "zh-CN": "沿斜面推力", "zh-TW": "沿斜面推力", en: "Applied Force" },
      symbol: "F",
      unit: "N",
      min: -25,
      max: 25,
      step: 1,
      defaultValue: 0,
    },
    {
      key: "gravity",
      label: { "zh-CN": "重力加速度", "zh-TW": "重力加速度", en: "Gravity" },
      symbol: "g",
      unit: "m/s²",
      min: 1.6,
      max: 20,
      step: 0.2,
      defaultValue: 9.8,
    },
  ],
  presets: [
    {
      id: "ice_free_slide",
      title: {
        "zh-CN": "冰面无摩擦匀加速 (μ = 0)",
        "zh-TW": "冰面無摩擦勻加速 (μ = 0)",
        en: "Frictionless Ice Slide (μ = 0)",
      },
      description: {
        "zh-CN": "倾角 30°，a = g·sin30° = 4.9 m/s²，机械能 100% 守恒",
        "zh-TW": "傾角 30°，a = g·sin30° = 4.9 m/s²，機械能 100% 守恆",
        en: "30° ramp with zero friction; a = g·sin30° = 4.9 m/s²",
      },
      params: { angleDeg: 30, mass: 2, mu: 0, pushForce: 0, gravity: 9.8 },
    },
    {
      id: "static_equilibrium",
      title: {
        "zh-CN": "静摩擦自锁静止 (tanθ < μ)",
        "zh-TW": "靜摩擦自鎖靜止 (tanθ < μ)",
        en: "Static Friction Lock (tanθ < μ)",
      },
      description: {
        "zh-CN": "倾角 20° 小于临界角 26.6° (μ=0.5)，静摩擦力刚好抵消下滑力",
        "zh-TW": "傾角 20° 小於臨界角 26.6° (μ=0.5)，靜摩擦力剛好抵消下滑力",
        en: "20° angle is below critical angle 26.6° (μ=0.5); block stays at rest",
      },
      params: { angleDeg: 20, mass: 3, mu: 0.5, pushForce: 0, gravity: 9.8 },
    },
    {
      id: "uphill_pull",
      title: {
        "zh-CN": "外力拉动上坡 (F = -22N)",
        "zh-TW": "外力拉動上坡 (F = -22N)",
        en: "Uphill Pull Force (F = -22N)",
      },
      description: {
        "zh-CN": "施加沿斜面向上的拉力克服重力分力与摩擦力，滑块逆坡加速上升",
        "zh-TW": "施加沿斜面向上的拉力克服重力分力與摩擦力，滑塊逆坡加速上升",
        en: "Up-slope pull overcomes gravity and friction to accelerate uphill",
      },
      params: { angleDeg: 25, mass: 2, mu: 0.2, pushForce: -22, gravity: 9.8 },
    },
  ],

  getDefaultParams(): RampParams {
    return { angleDeg: 30, mass: 2, mu: 0.25, pushForce: 0, gravity: 9.8 };
  },

  createInitialState(params: RampParams): RampState {
    const f = computeRampForces(params, 0);
    const startS = params.pushForce < -12 ? 6.4 : INITIAL_S;
    const h0 = Math.max(0, (RAMP_LENGTH - startS) * Math.sin(f.rad));
    return {
      t: 0,
      s: startS,
      v: 0,
      a: f.accel,
      thermalEnergy: 0,
      initialPotential: params.mass * params.gravity * h0,
      strobePositions: [startS],
      lastStrobeAt: 0,
      completed: false,
    };
  },

  stepPhysics(
    state: RampState,
    params: RampParams,
    dt: number,
  ): BenchStepResult<RampState> {
    if (state.completed) return { state };
    const f = computeRampForces(params, state.v);
    if (f.isStatic && Math.abs(state.v) < 1e-4) {
      return {
        state: { ...state, a: 0, v: 0, completed: true },
      };
    }

    let nextV = state.v + f.accel * dt;
    // 如果没有外力反向驱动且速度过零（由摩擦减速停止）
    if (state.v !== 0 && Math.sign(nextV) !== Math.sign(state.v)) {
      const fZero = computeRampForces(params, 0);
      if (fZero.isStatic) {
        nextV = 0;
      }
    }

    const ds = ((state.v + nextV) * 0.5) * dt;
    let nextS = state.s + ds;
    const dThermal = Math.abs(f.friction * ds);
    let completed = false;
    const soundEvents: BenchStepResult<RampState>["soundEvents"] = [];

    if (nextS >= RAMP_LENGTH - 0.35) {
      nextS = RAMP_LENGTH - 0.35;
      if (Math.abs(nextV) > 0.2) {
        soundEvents.push({
          kind: "collision",
          intensity: Math.min(1.5, Math.abs(nextV) / 4),
        });
      }
      nextV = 0;
      completed = true;
    } else if (nextS <= 0.35) {
      nextS = 0.35;
      nextV = 0;
      completed = true;
    }

    const nextT = state.t + dt;
    const nextStrobes = [...state.strobePositions];
    let lastStrobeAt = state.lastStrobeAt;
    if (nextT - lastStrobeAt >= 0.25 && !completed) {
      nextStrobes.push(nextS);
      lastStrobeAt = nextT;
    }

    return {
      state: {
        ...state,
        t: nextT,
        s: nextS,
        v: nextV,
        a: completed ? 0 : f.accel,
        thermalEnergy: state.thermalEnergy + dThermal,
        strobePositions: nextStrobes.slice(-16),
        lastStrobeAt,
        completed,
      },
      soundEvents,
    };
  },

  computeEnergy(state: RampState, params: RampParams): EnergyBreakdown {
    const rad = (params.angleDeg * Math.PI) / 180;
    const height = Math.max(0, (RAMP_LENGTH - state.s - 0.35) * Math.sin(rad));
    const kinetic = 0.5 * params.mass * state.v * state.v;
    const potential = params.mass * params.gravity * height;
    const thermal = state.thermalEnergy;
    return {
      kinetic,
      potential,
      thermal,
      total: kinetic + potential + thermal,
    };
  },

  computeTelemetry(state: RampState, params: RampParams): TelemetryItem[] {
    const f = computeRampForces(params, state.v);
    return [
      {
        id: "accel",
        label: { "zh-CN": "瞬时加速度", "zh-TW": "瞬時加速度", en: "Acceleration" },
        symbol: "a",
        value: state.a.toFixed(2),
        unit: "m/s²",
        highlight: "cyan",
      },
      {
        id: "velocity",
        label: { "zh-CN": "当前速度", "zh-TW": "目前速度", en: "Velocity" },
        symbol: "v",
        value: state.v.toFixed(2),
        unit: "m/s",
        highlight: "emerald",
      },
      {
        id: "gx",
        label: { "zh-CN": "重力下滑分力", "zh-TW": "重力下滑分力", en: "Down-Slope Gx" },
        symbol: "mg·sinθ",
        value: f.gx.toFixed(1),
        unit: "N",
        highlight: "amber",
      },
      {
        id: "friction",
        label: { "zh-CN": "摩擦力大小", "zh-TW": "摩擦力大小", en: "Friction |f|" },
        symbol: "f",
        value: Math.abs(f.friction).toFixed(1),
        unit: "N",
        highlight: "rose",
      },
      {
        id: "crit",
        label: { "zh-CN": "静摩擦临界角", "zh-TW": "靜摩擦臨界角", en: "Critical Angle" },
        symbol: "θc",
        value: f.criticalAngleDeg.toFixed(1),
        unit: "°",
      },
    ];
  },

  sampleWaveform(state: RampState) {
    return {
      t: Number(state.t.toFixed(2)),
      primary: Number(state.s.toFixed(2)),
      secondary: Number(state.v.toFixed(2)),
    };
  },

  isCompleted(state: RampState): boolean {
    return state.completed;
  },

  summarizeForAI(state: RampState, params: RampParams) {
    const f = computeRampForces(params, state.v);
    return {
      bench: "ramp",
      isStaticEquilibrium: f.isStatic,
      criticalAngleDeg: Number(f.criticalAngleDeg.toFixed(2)),
      downSlopeGravityN: Number(f.gx.toFixed(2)),
      normalForceN: Number(f.normal.toFixed(2)),
      frictionForceN: Number(f.friction.toFixed(2)),
      netForceN: Number(f.netForce.toFixed(2)),
      accelerationMS2: Number(state.a.toFixed(2)),
      displacementM: Number(state.s.toFixed(2)),
      velocityMS: Number(state.v.toFixed(2)),
    };
  },

  renderStage({
    params,
    state,
    showVectors,
    showGrid,
  }: BenchStageProps<RampParams, RampState>) {
    const f = computeRampForces(params, state.v);
    const baseLeftX = 110;
    const baseBottomY = 345;
    const pxPerMeter = 62; // 8m = 496px
    const rampPxLen = RAMP_LENGTH * pxPerMeter;
    const topX = baseLeftX;
    const topY = baseBottomY - rampPxLen * Math.sin(f.rad);
    const bottomX = baseLeftX + rampPxLen * Math.cos(f.rad);
    const bottomY = baseBottomY;

    // 滑块在斜面上的像素坐标
    const blockCenterS = state.s * pxPerMeter;
    const blockSurfaceX = topX + blockCenterS * Math.cos(f.rad);
    const blockSurfaceY = topY + blockCenterS * Math.sin(f.rad);

    // 矢量缩放因子 (1 N = 2.2 px)
    const vScale = 2.2;
    const weightPx = Math.min(115, f.weight * vScale);
    const gxPx = Math.min(100, f.gx * vScale);
    const gyPx = Math.min(100, f.gy * vScale);
    const normalPx = gyPx;
    const frictionPx = Math.max(-100, Math.min(100, f.friction * vScale));

    return (
      <g>
        {/* 背景标尺网格 */}
        {showGrid && (
          <g stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1">
            {Array.from({ length: 14 }, (_, i) => (
              <line key={`vx-${i}`} x1={i * 60} y1={0} x2={i * 60} y2={400} />
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <line key={`hy-${i}`} x1={0} y1={i * 55} x2={760} y2={i * 55} />
            ))}
          </g>
        )}

        {/* 地面基准线 */}
        <line
          x1={50}
          y1={baseBottomY}
          x2={710}
          y2={baseBottomY}
          stroke="#475569"
          strokeWidth="3"
        />

        {/* 斜面三角形主体 */}
        <polygon
          points={`${topX},${topY} ${bottomX},${bottomY} ${topX},${bottomY}`}
          fill="rgba(30, 41, 59, 0.82)"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* 斜面倾角 θ 圆弧标注 */}
        <path
          d={`M ${bottomX - 52} ${bottomY} A 52 52 0 0 1 ${
            bottomX - 52 * Math.cos(f.rad)
          } ${bottomY - 52 * Math.sin(f.rad)}`}
          fill="none"
          stroke="#fbbf24"
          strokeWidth="2"
        />
        <text
          x={bottomX - 82}
          y={bottomY - 12}
          fill="#fde047"
          fontSize="12"
          fontWeight="700"
        >
          θ = {params.angleDeg}°
        </text>

        {/* 斜面刻度与频闪残影点 */}
        {state.strobePositions.map((pos, idx) => {
          const sx = topX + pos * pxPerMeter * Math.cos(f.rad);
          const sy = topY + pos * pxPerMeter * Math.sin(f.rad);
          return (
            <circle
              key={`st-${idx}`}
              cx={sx}
              cy={sy}
              r={3.5}
              fill="rgba(56, 189, 248, 0.55)"
            />
          );
        })}

        {/* 底端缓冲挡板 */}
        <g
          transform={`translate(${bottomX}, ${bottomY}) rotate(${params.angleDeg})`}
        >
          <rect
            x={-22}
            y={-26}
            width={8}
            height={26}
            rx={2}
            fill="#ef4444"
          />
        </g>

        {/* 滑块与旋转局部坐标系（原点在滑块底面中心，X轴沿斜面向下，Y轴垂直斜面向下） */}
        <g
          transform={`translate(${blockSurfaceX}, ${blockSurfaceY}) rotate(${params.angleDeg})`}
        >
          {/* 滑块本体 */}
          <rect
            x={-26}
            y={-36}
            width={52}
            height={36}
            rx={6}
            fill="rgba(245, 158, 11, 0.92)"
            stroke="#fef08a"
            strokeWidth="2"
          />
          <text
            x={0}
            y={-14}
            textAnchor="middle"
            fill="#0f172a"
            fontSize="11.5"
            fontWeight="800"
          >
            {params.mass}kg
          </text>

          {/* 受力分析正交分解矢量图（以滑块质心 (0, -18) 为起点） */}
          {showVectors && (
            <g transform="translate(0, -18)">
              {/* 正交分解平行四边形虚线 */}
              <line
                x1={gxPx}
                y1={0}
                x2={gxPx}
                y2={gyPx}
                stroke="rgba(251, 191, 36, 0.55)"
                strokeWidth="1.4"
                strokeDasharray="4 3"
              />
              <line
                x1={0}
                y1={gyPx}
                x2={gxPx}
                y2={gyPx}
                stroke="rgba(251, 191, 36, 0.55)"
                strokeWidth="1.4"
                strokeDasharray="4 3"
              />

              {/* Gx = mg sinθ (沿斜面向下分力) */}
              <line
                x1={0}
                y1={0}
                x2={gxPx}
                y2={0}
                stroke="#fbbf24"
                strokeWidth="2.5"
              />
              <polygon
                points={`${gxPx},0 ${gxPx - 7},-4 ${gxPx - 7},4`}
                fill="#fbbf24"
              />
              <text
                x={gxPx + 6}
                y={4}
                fill="#fde047"
                fontSize="10.5"
                fontWeight="700"
              >
                Gx={f.gx.toFixed(1)}N
              </text>

              {/* Gy = mg cosθ (垂直斜面分力) */}
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={gyPx}
                stroke="#94a3b8"
                strokeWidth="2"
                strokeDasharray="3 2"
              />
              <text
                x={8}
                y={gyPx + 10}
                fill="#cbd5e1"
                fontSize="10"
                fontWeight="600"
              >
                Gy={f.gy.toFixed(1)}N
              </text>

              {/* 支持力 N (垂直斜面向上) */}
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={-normalPx}
                stroke="#22c55e"
                strokeWidth="2.8"
              />
              <polygon
                points={`0,${-normalPx} -4.5,${-normalPx + 8} 4.5,${
                  -normalPx + 8
                }`}
                fill="#22c55e"
              />
              <text
                x={8}
                y={-normalPx + 4}
                fill="#86efac"
                fontSize="10.5"
                fontWeight="700"
              >
                N={f.normal.toFixed(1)}N
              </text>

              {/* 摩擦力 f */}
              {Math.abs(frictionPx) > 2 && (
                <>
                  <line
                    x1={0}
                    y1={0}
                    x2={frictionPx}
                    y2={0}
                    stroke="#f43f5e"
                    strokeWidth="2.8"
                  />
                  <polygon
                    points={`${frictionPx},0 ${
                      frictionPx - Math.sign(frictionPx) * 7
                    },-4 ${frictionPx - Math.sign(frictionPx) * 7},4`}
                    fill="#f43f5e"
                  />
                  <text
                    x={frictionPx - (frictionPx < 0 ? 48 : -6)}
                    y={-7}
                    fill="#fda4af"
                    fontSize="10.5"
                    fontWeight="700"
                  >
                    f={Math.abs(f.friction).toFixed(1)}N
                  </text>
                </>
              )}

              {/* 竖直向下的总重力 G = mg (逆向旋转 -angleDeg 保持竖直向下) */}
              <g transform={`rotate(${-params.angleDeg})`}>
                <line
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={weightPx}
                  stroke="#38bdf8"
                  strokeWidth="3"
                />
                <polygon
                  points={`0,${weightPx} -5,${weightPx - 8} 5,${weightPx - 8}`}
                  fill="#38bdf8"
                />
                <text
                  x={-52}
                  y={weightPx + 4}
                  fill="#7dd3fc"
                  fontSize="11"
                  fontWeight="800"
                >
                  G={f.weight.toFixed(1)}N
                </text>
              </g>
            </g>
          )}
        </g>

        {/* 左上角状态提示 */}
        <g transform="translate(20, 26)">
          <rect
            x={0}
            y={0}
            width={255}
            height={30}
            rx={6}
            fill="rgba(15, 23, 42, 0.85)"
            stroke="rgba(56, 189, 248, 0.35)"
          />
          <text x={12} y={19} fill="#e2e8f0" fontSize="11.5" fontWeight="700">
            {f.isStatic
              ? `🔒 静摩擦自锁静止 (θ=${params.angleDeg}° ≤ θc=${f.criticalAngleDeg.toFixed(1)}°)`
              : `⚡ 匀变速滑动中 (a = ${state.a.toFixed(2)} m/s²)`}
          </text>
        </g>
      </g>
    );
  },
};
