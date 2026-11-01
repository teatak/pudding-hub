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
  /** 到达底端瞬间的末速度 (m/s) */
  finalVelocity?: number;
}

export const RAMP_LENGTH = 8.0; // 斜面总长度 8.0 m
export const INITIAL_S = 1.2; // 初始放置位置距离斜面顶端 1.2 m

/**
 * 渲染统一粗细 (2px) 的物理向量箭头与水平清晰标注（无黑底彩边、无旋转文字）
 */
function renderCleanVector(opts: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  label: string;
  dashed?: boolean;
  labelOffsetX?: number;
  labelOffsetY?: number;
  textAnchor?: "start" | "middle" | "end";
}) {
  const {
    x1,
    y1,
    x2,
    y2,
    color,
    label,
    dashed = false,
    labelOffsetX = 0,
    labelOffsetY = 0,
    textAnchor = "middle",
  } = opts;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 4) return null;

  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const headLen = 7.5;
  const headHalfW = 3.4;

  const baseX = x2 - ux * headLen;
  const baseY = y2 - uy * headLen;
  const leftX = baseX + px * headHalfW;
  const leftY = baseY + py * headHalfW;
  const rightX = baseX - px * headHalfW;
  const rightY = baseY - py * headHalfW;

  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={baseX}
        y2={baseY}
        stroke={color}
        strokeWidth="2"
        strokeDasharray={dashed ? "4 3" : undefined}
        strokeLinecap="round"
      />
      <polygon
        points={`${x2},${y2} ${leftX},${leftY} ${rightX},${rightY}`}
        fill={color}
      />
      <text
        x={x2 + labelOffsetX}
        y={y2 + labelOffsetY}
        textAnchor={textAnchor}
        fill={color}
        fontSize="11.5"
        fontWeight="600"
        style={{
          paintOrder: "stroke",
          stroke: "var(--ml-canvas-bg)",
          strokeWidth: "4px",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
      >
        {label}
      </text>
    </g>
  );
}

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
  formulaBadge: "F_合 = mg·sinθ + F_推 − μ·mg·cosθ = m·a",
  principleNote: {
    "zh-CN":
      "斜面上滑块的重力 G = mg 可正交分解为沿斜面向下的分力 Gx = mg·sinθ 和垂直斜面的分力 Gy = mg·cosθ。当未施加外推力时，滑块开始下滑的条件是 mg·sinθ > μ·mg·cosθ，两边消去质量 m 和 g 可得 tanθ > μ（即临界角 θc = arctan(μ) 与物体质量无关）。",
    "zh-TW":
      "斜面上滑塊的重力 G = mg 可正交分解為沿斜面向下的分力 Gx = mg·sinθ 和垂直斜面的分力 Gy = mg·cosθ。當未施加外推力時，滑塊開始下滑的條件是 mg·sinθ > μ·mg·cosθ，兩邊消去質量 m 和 g 可得 tanθ > μ（即臨界角 θc = arctan(μ) 與物體質量無關）。",
    en:
      "Gravity G = mg decomposes into a down-slope component Gx = mg·sinθ and a normal component Gy = mg·cosθ. Sliding begins when tanθ > μ, meaning the critical angle θc = arctan(μ) is independent of mass m.",
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
      min: 0,
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
      id: "horizontal_pull",
      title: {
        "zh-CN": "水平地面匀加速 (θ = 0°)",
        "zh-TW": "水平地面勻加速 (θ = 0°)",
        en: "Horizontal Floor Pull (θ = 0°)",
      },
      description: {
        "zh-CN": "倾角 0°，施加 12N 外力拉动滑块克服水平滑动摩擦力向前加速",
        "zh-TW": "傾角 0°，施加 12N 外力拉動滑塊克服水平滑動摩擦力向前加速",
        en: "0° flat surface; 12N applied force overcomes friction to accelerate",
      },
      params: { angleDeg: 0, mass: 2, mu: 0.2, pushForce: 12, gravity: 9.8 },
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

    let impactEk = 0;
    let finalVelocity = state.finalVelocity;

    if (nextS >= RAMP_LENGTH - 0.35) {
      nextS = RAMP_LENGTH - 0.35;
      if (Math.abs(nextV) > 0.2) {
        soundEvents.push({
          kind: "collision",
          intensity: Math.min(1.5, Math.abs(nextV) / 4),
        });
      }
      finalVelocity = Math.abs(nextV);
      impactEk = 0.5 * params.mass * nextV * nextV;
      nextV = 0;
      completed = true;
    } else if (nextS <= 0.35) {
      nextS = 0.35;
      finalVelocity = Math.abs(nextV);
      impactEk = 0.5 * params.mass * nextV * nextV;
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
        thermalEnergy: state.thermalEnergy + dThermal + impactEk,
        strobePositions: nextStrobes.slice(-16),
        lastStrobeAt,
        completed,
        finalVelocity,
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
    showVectorDetails = false,
    showGrid,
    locale,
  }: BenchStageProps<RampParams, RampState>) {
    const f = computeRampForces(params, state.v);
    const rad = f.rad;
    const sinA = Math.sin(rad);
    const cosA = Math.cos(rad);

    // 画布标准视口 760 x 400，保持充足留白
    const baseBottomY = 338;
    const maxUsableHeight = 236;
    const maxUsableWidth = 560;

    const naturalHeight = RAMP_LENGTH * sinA;
    const naturalWidth = RAMP_LENGTH * cosA;
    const scaleY = naturalHeight > 0.08 ? maxUsableHeight / naturalHeight : 68;
    const scaleX = naturalWidth > 0.08 ? maxUsableWidth / naturalWidth : 68;
    const pxPerMeter = Math.max(38, Math.min(68, Math.min(scaleX, scaleY)));

    const rampPxLen = RAMP_LENGTH * pxPerMeter;
    const rampPxH = rampPxLen * sinA;
    const rampPxW = rampPxLen * cosA;

    const topX = 95 + Math.max(0, (maxUsableWidth - rampPxW) * 0.25);
    const topY = baseBottomY - rampPxH;
    const bottomX = topX + rampPxW;
    const bottomY = baseBottomY;

    // 滑块在斜面上的接触点与质心世界坐标（用于在世界坐标系下绘制水平标签）
    const blockCenterS = state.s * pxPerMeter;
    const blockSurfaceX = topX + blockCenterS * cosA;
    const blockSurfaceY = topY + blockCenterS * sinA;

    const blockW = Math.round(46 + Math.min(10, params.mass * 1.1));
    const blockH = Math.round(28 + Math.min(6, params.mass * 0.7));
    const halfW = blockW / 2;
    const halfH = blockH / 2;

    // 滑块质心在世界坐标系中的精确位置
    const cmX = blockSurfaceX + sinA * halfH;
    const cmY = blockSurfaceY - cosA * halfH;

    // 统一比例尺：将物理力映射为干净的向量长度
    const scaleForce = (val: number, minExt: number, maxTotal: number) => {
      const abs = Math.abs(val);
      if (abs < 0.05) return 0;
      const len = Math.min(maxTotal, minExt + abs * 2.1);
      return Math.sign(val) * len;
    };

    const gxLen = scaleForce(f.gx, halfW + 18, 86);
    const pushLen = scaleForce(params.pushForce, halfW + 18, 86);
    const frictionLen = scaleForce(f.friction, -(halfW + 16), 80);
    const normalLen = Math.abs(scaleForce(f.normal, halfH + 26, 86));
    const gyLen = Math.abs(scaleForce(f.gy, halfH + 22, 80));
    const weightLen = Math.min(
      Math.max(40, 386 - cmY),
      Math.max(halfH + 28, f.weight * 2.1),
    );

    // 各向量终点在画布世界坐标系下的位置 (沿斜面单位向量 u_t = (cosA, sinA)，法向向上 u_n = (sinA, -cosA))
    const gxEndX = cmX + gxLen * cosA;
    const gxEndY = cmY + gxLen * sinA;

    const gyEndX = cmX - gyLen * sinA;
    const gyEndY = cmY + gyLen * cosA;

    const gRectCornerX = cmX + gxLen * cosA - gyLen * sinA;
    const gRectCornerY = cmY + gxLen * sinA + gyLen * cosA;

    const nEndX = cmX + normalLen * sinA;
    const nEndY = cmY - normalLen * cosA;

    const fEndX = cmX + frictionLen * cosA;
    const fEndY = cmY + frictionLen * sinA;

    const pushEndX = cmX + pushLen * cosA;
    const pushEndY = cmY + pushLen * sinA;

    // 极简状态说明文字
    let statusDotColor = "var(--ml-primary)";
    let statusText = "";
    if (state.completed) {
      statusDotColor = "var(--ml-ek)";
      if (state.s >= RAMP_LENGTH - 0.4) {
        statusText =
          locale === "zh-TW"
            ? `已到達底端 · 末速度 v = ${(state.finalVelocity ?? 0).toFixed(2)} m/s`
            : locale === "en"
            ? `Reached bottom · v = ${(state.finalVelocity ?? 0).toFixed(2)} m/s`
            : `已到达底端 · 末速度 v = ${(state.finalVelocity ?? 0).toFixed(2)} m/s`;
      } else {
        statusText =
          locale === "zh-TW"
            ? "滑塊已靜止"
            : locale === "en"
            ? "Block stopped"
            : "滑块已静止";
      }
    } else if (f.isStatic && Math.abs(state.v) < 1e-4) {
      statusDotColor = "#d97706";
      statusText =
        locale === "zh-TW"
          ? `靜摩擦自鎖平衡 (θ = ${params.angleDeg}° ≤ θc = ${f.criticalAngleDeg.toFixed(1)}°)`
          : locale === "en"
          ? `Static friction locked (θ = ${params.angleDeg}° ≤ θc = ${f.criticalAngleDeg.toFixed(1)}°)`
          : `静摩擦自锁平衡 (θ = ${params.angleDeg}° ≤ θc = ${f.criticalAngleDeg.toFixed(1)}°)`;
    } else if (Math.abs(state.v) > 0.02) {
      statusDotColor = "var(--ml-primary)";
      statusText =
        state.v > 0
          ? locale === "zh-TW"
            ? `加速下滑中 · a = ${state.a.toFixed(2)} m/s²`
            : locale === "en"
            ? `Accelerating down · a = ${state.a.toFixed(2)} m/s²`
            : `加速下滑中 · a = ${state.a.toFixed(2)} m/s²`
          : locale === "zh-TW"
          ? `逆坡上滑中 · a = ${state.a.toFixed(2)} m/s²`
          : locale === "en"
          ? `Moving uphill · a = ${state.a.toFixed(2)} m/s²`
          : `逆坡上滑中 · a = ${state.a.toFixed(2)} m/s²`;
    } else {
      statusDotColor = "var(--ml-text-dim)";
      statusText =
        locale === "zh-TW"
          ? "準備就緒"
          : locale === "en"
          ? "Ready"
          : "准备就绪";
    }

    const fmtLabel = (sym: string, valN: number) =>
      showVectorDetails ? `${sym} = ${valN.toFixed(1)} N` : sym;

    return (
      <g>
        {/* 极淡背景网格（默认隐藏，开启后仅作为微弱视觉参考） */}
        {showGrid && (
          <g stroke="var(--ml-canvas-grid)" strokeWidth="1">
            {Array.from({ length: 14 }, (_, i) => (
              <line key={`vx-${i}`} x1={(i + 1) * 54} y1={16} x2={(i + 1) * 54} y2={384} />
            ))}
            {Array.from({ length: 7 }, (_, i) => (
              <line key={`hy-${i}`} x1={24} y1={(i + 1) * 52} x2={736} y2={(i + 1) * 52} />
            ))}
          </g>
        )}

        {/* 地面基准线 */}
        <line
          x1={48}
          y1={baseBottomY}
          x2={712}
          y2={baseBottomY}
          stroke="var(--ml-canvas-ground)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* 斜面主体：浅色低对比填充，弱化轮廓 */}
        {params.angleDeg === 0 ? (
          <rect
            x={topX}
            y={baseBottomY - 10}
            width={rampPxLen}
            height={10}
            rx={2}
            fill="var(--ml-ramp-surface)"
            stroke="var(--ml-ramp-edge)"
            strokeWidth="1.25"
          />
        ) : (
          <polygon
            points={`${topX},${topY} ${bottomX},${bottomY} ${topX},${bottomY}`}
            fill="var(--ml-ramp-surface)"
            stroke="var(--ml-ramp-edge)"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
        )}

        {/* 倾角 θ 轻量标注 */}
        {params.angleDeg > 0 ? (
          <g>
            <path
              d={`M ${bottomX - 42 * cosA} ${bottomY - 42 * sinA} A 42 42 0 0 1 ${
                bottomX - 42
              } ${bottomY}`}
              fill="none"
              stroke="var(--ml-text-muted)"
              strokeWidth="1.25"
              strokeOpacity="0.65"
            />
            <text
              x={bottomX - 52}
              y={bottomY - 8}
              textAnchor="end"
              fill="var(--ml-text-muted)"
              fontSize="11"
              fontWeight="500"
            >
              θ = {params.angleDeg}°
            </text>
          </g>
        ) : (
          <text
            x={bottomX}
            y={bottomY + 18}
            textAnchor="end"
            fill="var(--ml-text-muted)"
            fontSize="11"
            fontWeight="500"
          >
            θ = 0°
          </text>
        )}

        {/* 斜面频闪打点轨迹 */}
        {state.strobePositions.map((pos, idx) => {
          const sx = topX + pos * pxPerMeter * cosA;
          const sy = topY + pos * pxPerMeter * sinA;
          return (
            <circle
              key={`st-${idx}`}
              cx={sx}
              cy={sy}
              r={2.5}
              fill="var(--ml-primary)"
              opacity="0.35"
            />
          );
        })}

        {/* 底端轻量挡板 */}
        <g transform={`translate(${bottomX}, ${bottomY}) rotate(${params.angleDeg})`}>
          <rect
            x={-10}
            y={-18}
            width={5}
            height={18}
            rx={1.5}
            fill="var(--ml-text-dim)"
            opacity="0.6"
          />
        </g>

        {/* 滑块本体 */}
        <g transform={`translate(${blockSurfaceX}, ${blockSurfaceY}) rotate(${params.angleDeg})`}>
          <rect
            x={-blockW / 2}
            y={-blockH}
            width={blockW}
            height={blockH}
            rx={5}
            fill="var(--ml-block-fill)"
            stroke="var(--ml-block-stroke)"
            strokeWidth="1.5"
          />
          <text
            x={0}
            y={-blockH / 2 + 4}
            textAnchor="middle"
            fill="var(--ml-block-text)"
            fontSize="10.5"
            fontWeight="700"
          >
            {params.mass} kg
          </text>
        </g>

        {/* 受力分析向量（统一在水平世界坐标系绘制标注，杜绝黑底彩边与大角度旋转文字） */}
        {showVectors && (
          <g>
            {/* 按需显示的正交分解辅助分力 (Gx, Gy) 与平行四边形虚线 */}
            {showVectorDetails && (
              <g>
                {Math.abs(gxLen) > 4 && (
                  <>
                    <line
                      x1={gxEndX}
                      y1={gxEndY}
                      x2={gRectCornerX}
                      y2={gRectCornerY}
                      stroke="var(--ml-force-comp)"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      opacity="0.55"
                    />
                    <line
                      x1={gyEndX}
                      y1={gyEndY}
                      x2={gRectCornerX}
                      y2={gRectCornerY}
                      stroke="var(--ml-force-comp)"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      opacity="0.55"
                    />
                  </>
                )}

                {Math.abs(gxLen) > 4 &&
                  renderCleanVector({
                    x1: cmX,
                    y1: cmY,
                    x2: gxEndX,
                    y2: gxEndY,
                    color: "var(--ml-force-comp)",
                    label: `Gx = ${f.gx.toFixed(1)} N`,
                    dashed: true,
                    labelOffsetX: 8,
                    labelOffsetY: 4,
                    textAnchor: "start",
                  })}

                {gyLen > 4 &&
                  renderCleanVector({
                    x1: cmX,
                    y1: cmY,
                    x2: gyEndX,
                    y2: gyEndY,
                    color: "var(--ml-force-comp)",
                    label: `Gy = ${f.gy.toFixed(1)} N`,
                    dashed: true,
                    labelOffsetX: -8,
                    labelOffsetY: 12,
                    textAnchor: "end",
                  })}
              </g>
            )}

            {/* 主力 1：竖直向下的重力 G */}
            {renderCleanVector({
              x1: cmX,
              y1: cmY,
              x2: cmX,
              y2: cmY + weightLen,
              color: "var(--ml-force-g)",
              label: fmtLabel("G", f.weight),
              labelOffsetX: 0,
              labelOffsetY: 14,
              textAnchor: "middle",
            })}

            {/* 主力 2：垂直斜面向上的支持力 N */}
            {renderCleanVector({
              x1: cmX,
              y1: cmY,
              x2: nEndX,
              y2: nEndY,
              color: "var(--ml-force-n)",
              label: fmtLabel("N", f.normal),
              labelOffsetX: 6,
              labelOffsetY: -6,
              textAnchor: "start",
            })}

            {/* 主力 3：沿斜面阻碍运动的摩擦力 f */}
            {Math.abs(frictionLen) > 4 &&
              renderCleanVector({
                x1: cmX,
                y1: cmY,
                x2: fEndX,
                y2: fEndY,
                color: "var(--ml-force-f)",
                label: fmtLabel("f", Math.abs(f.friction)),
                labelOffsetX: frictionLen < 0 ? -8 : 8,
                labelOffsetY: -6,
                textAnchor: frictionLen < 0 ? "end" : "start",
              })}

            {/* 主力 4：外加沿斜面推力/拉力 F */}
            {Math.abs(params.pushForce) > 0.1 &&
              renderCleanVector({
                x1: cmX,
                y1: cmY,
                x2: pushEndX,
                y2: pushEndY,
                color: "var(--ml-force-ext)",
                label: fmtLabel("F", Math.abs(params.pushForce)),
                labelOffsetX: pushLen >= 0 ? 8 : -8,
                labelOffsetY: 14,
                textAnchor: pushLen >= 0 ? "start" : "end",
              })}

            {/* 质心锚点 */}
            <circle
              cx={cmX}
              cy={cmY}
              r={2.8}
              fill="var(--ml-canvas-bg)"
              stroke="var(--ml-text)"
              strokeWidth="1.5"
            />
          </g>
        )}

        {/* 左上角轻量状态文字（无边框、无黑底） */}
        <g transform="translate(24, 28)">
          <circle cx={0} cy={-4} r={3.5} fill={statusDotColor} />
          <text
            x={10}
            y={0}
            fill="var(--ml-text-muted)"
            fontSize="12"
            fontWeight="500"
          >
            {statusText}
          </text>
        </g>
      </g>
    );
  },
};
