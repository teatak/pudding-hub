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

function renderForceTag(
  x: number,
  y: number,
  text: string,
  color: string,
  align: "start" | "middle" | "end" = "middle",
) {
  const charLen = text.length;
  const w = charLen * 7 + 10;
  const h = 18;
  const rectX = align === "start" ? 0 : align === "end" ? -w : -w / 2;
  const textX = align === "start" ? w / 2 : align === "end" ? -w / 2 : 0;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={rectX}
        y={-h / 2}
        width={w}
        height={h}
        rx={4}
        fill="rgba(11, 19, 36, 0.95)"
        stroke={color}
        strokeWidth="1.2"
      />
      <text
        x={textX}
        y={3.8}
        textAnchor="middle"
        fill={color}
        fontSize="10.5"
        fontWeight="800"
      >
        {text}
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
    showGrid,
    locale,
  }: BenchStageProps<RampParams, RampState>) {
    const f = computeRampForces(params, state.v);
    const rad = f.rad;
    const sinA = Math.sin(rad);
    const cosA = Math.cos(rad);

    // 画布标准视口 760 x 400
    const baseBottomY = 345;
    const maxUsableHeight = 265; // y 保持在 80 ~ 345 之间，杜绝大角度冲顶！
    const maxUsableWidth = 610; // x 保持在 65 ~ 675 之间

    // 动态像素缩放：无论倾角多大或多小，斜面都自适应展开且安全留在屏幕内
    const naturalHeight = RAMP_LENGTH * sinA;
    const naturalWidth = RAMP_LENGTH * cosA;
    const scaleY = naturalHeight > 0.08 ? maxUsableHeight / naturalHeight : 74;
    const scaleX = naturalWidth > 0.08 ? maxUsableWidth / naturalWidth : 74;
    const pxPerMeter = Math.max(38, Math.min(74, Math.min(scaleX, scaleY)));

    const rampPxLen = RAMP_LENGTH * pxPerMeter;
    const rampPxH = rampPxLen * sinA;
    const rampPxW = rampPxLen * cosA;

    // 斜面主体居中偏左分布
    const topX = 65 + Math.max(0, (maxUsableWidth - rampPxW) * 0.2);
    const topY = baseBottomY - rampPxH;
    const bottomX = topX + rampPxW;
    const bottomY = baseBottomY;

    // 滑块在斜面上的像素坐标
    const blockCenterS = state.s * pxPerMeter;
    const blockSurfaceX = topX + blockCenterS * cosA;
    const blockSurfaceY = topY + blockCenterS * sinA;

    // 滑块尺寸随质量自适应 (46 ~ 56px)
    const blockW = Math.round(44 + Math.min(12, params.mass * 1.2));
    const blockH = Math.round(28 + Math.min(8, params.mass * 0.8));
    const halfW = blockW / 2;
    const halfH = blockH / 2;

    // 矢量长度：确保力存在时稳稳伸出滑块边缘，随受力成比例延长，彻底杜绝所有箭头缩在滑块内挤压
    const scaleForce = (val: number, minExt: number, maxTotal: number) => {
      const abs = Math.abs(val);
      if (abs < 0.05) return 0;
      const len = Math.min(maxTotal, minExt + abs * 2.3);
      return Math.sign(val) * len;
    };

    const gxPx = scaleForce(f.gx, halfW + 14, 94);
    const frictionPx = scaleForce(f.friction, -(halfW + 14), 86);
    const normalPx = Math.abs(scaleForce(f.normal, halfH + 24, 96));
    const gyPx = Math.abs(scaleForce(f.gy, halfH + 18, 88));
    const maxWeightDist = Math.max(35, 395 - blockSurfaceY);
    const weightPx = Math.min(maxWeightDist, Math.max(halfH + 26, f.weight * 2.3));

    // 精细状态流转判断
    let statusText = "";
    let statusBorder = "rgba(56, 189, 248, 0.4)";

    if (state.completed) {
      statusBorder = "var(--ml-ek)";
      if (state.s >= RAMP_LENGTH - 0.4) {
        statusText =
          locale === "zh-TW"
            ? `🏁 已到達底端擋板 (末速 v = ${(state.finalVelocity ?? 0).toFixed(2)} m/s)`
            : locale === "en"
            ? `🏁 Reached bottom buffer (v_end = ${(state.finalVelocity ?? 0).toFixed(2)} m/s)`
            : `🏁 已到达底端挡板 (末速 v = ${(state.finalVelocity ?? 0).toFixed(2)} m/s)`;
      } else if (state.s <= 0.4) {
        statusText =
          locale === "zh-TW"
            ? "🏁 已到達頂端"
            : locale === "en"
            ? "🏁 Reached ramp top"
            : "🏁 已到达斜面顶端";
      } else {
        statusText =
          locale === "zh-TW"
            ? "⏸ 滑塊已靜止"
            : locale === "en"
            ? "⏸ Block stopped"
            : "⏸ 滑块已静止";
      }
    } else if (f.isStatic && Math.abs(state.v) < 1e-4) {
      statusBorder = "var(--ml-etotal)";
      statusText =
        locale === "zh-TW"
          ? `🔒 靜摩擦自鎖平衡 (θ=${params.angleDeg}° ≤ θc=${f.criticalAngleDeg.toFixed(1)}°)`
          : locale === "en"
          ? `🔒 Static friction locked (θ=${params.angleDeg}° ≤ θc=${f.criticalAngleDeg.toFixed(1)}°)`
          : `🔒 静摩擦自锁平衡 (θ=${params.angleDeg}° ≤ θc=${f.criticalAngleDeg.toFixed(1)}°)`;
    } else if (Math.abs(state.v) > 0.02) {
      statusBorder = "var(--ml-primary)";
      const isDown = state.v > 0;
      statusText = isDown
        ? locale === "zh-TW"
          ? `⚡ 加速下滑中 (a = ${state.a.toFixed(2)} m/s²)`
          : locale === "en"
          ? `⚡ Accelerating down (a = ${state.a.toFixed(2)} m/s²)`
          : `⚡ 加速下滑中 (a = ${state.a.toFixed(2)} m/s²)`
        : locale === "zh-TW"
        ? `⚡ 逆坡滑行中 (a = ${state.a.toFixed(2)} m/s²)`
        : locale === "en"
        ? `⚡ Sliding uphill (a = ${state.a.toFixed(2)} m/s²)`
        : `⚡ 逆坡滑行中 (a = ${state.a.toFixed(2)} m/s²)`;
    } else {
      statusText =
        locale === "zh-TW"
          ? "⏸ 準備就緒，點擊開始實驗"
          : locale === "en"
          ? "⏸ Ready, click Play to run"
          : "⏸ 准备就绪，点击开始实验";
    }

    return (
      <g>
        {/* 背景标尺工程网格 */}
        {showGrid && (
          <g stroke="var(--ml-canvas-grid)" strokeWidth="1">
            {Array.from({ length: 15 }, (_, i) => (
              <line key={`vx-${i}`} x1={i * 54} y1={0} x2={i * 54} y2={400} />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`hy-${i}`} x1={0} y1={i * 50} x2={760} y2={i * 50} />
            ))}
          </g>
        )}

        {/* 地面基准线 */}
        <line
          x1={30}
          y1={baseBottomY}
          x2={730}
          y2={baseBottomY}
          stroke="#475569"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* 斜面主体：当 θ = 0° 时渲染为水平精密导轨；θ > 0° 时渲染实心科技斜面 */}
        {params.angleDeg === 0 ? (
          <g>
            <rect
              x={topX}
              y={baseBottomY - 14}
              width={rampPxLen}
              height={14}
              rx={3}
              fill="rgba(30, 41, 59, 0.85)"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            {/* 导轨精密标尺刻度 */}
            {Array.from({ length: Math.floor(RAMP_LENGTH) + 1 }, (_, m) => (
              <line
                key={`m-${m}`}
                x1={topX + m * pxPerMeter}
                y1={baseBottomY - 14}
                x2={topX + m * pxPerMeter}
                y2={baseBottomY - 8}
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
            ))}
          </g>
        ) : (
          <polygon
            points={`${topX},${topY} ${bottomX},${bottomY} ${topX},${bottomY}`}
            fill="rgba(30, 41, 59, 0.78)"
            stroke="#38bdf8"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        )}

        {/* 倾角 θ 标注：置于底角右下安全区 */}
        {params.angleDeg > 0 ? (
          <g>
            <path
              d={`M ${bottomX - 44 * cosA} ${bottomY - 44 * sinA} A 44 44 0 0 1 ${
                bottomX - 44
              } ${bottomY}`}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
            />
            <g transform={`translate(${bottomX + 12}, ${bottomY + 18})`}>
              <rect
                x={-4}
                y={-14}
                width={56}
                height={18}
                rx={4}
                fill="rgba(15, 23, 42, 0.9)"
                stroke="#fbbf24"
                strokeWidth="1"
              />
              <text
                x={24}
                y={-1}
                textAnchor="middle"
                fill="#fde047"
                fontSize="11"
                fontWeight="700"
              >
                θ = {params.angleDeg}°
              </text>
            </g>
          </g>
        ) : (
          <g transform={`translate(${bottomX + 12}, ${bottomY + 18})`}>
            <rect
              x={-4}
              y={-14}
              width={64}
              height={18}
              rx={4}
              fill="rgba(15, 23, 42, 0.9)"
              stroke="#38bdf8"
              strokeWidth="1"
            />
            <text
              x={28}
              y={-1}
              textAnchor="middle"
              fill="#38bdf8"
              fontSize="10.5"
              fontWeight="650"
            >
              θ = 0° 水平
            </text>
          </g>
        )}

        {/* 斜面频闪残影点 */}
        {state.strobePositions.map((pos, idx) => {
          const sx = topX + pos * pxPerMeter * cosA;
          const sy = topY + pos * pxPerMeter * sinA;
          return (
            <circle
              key={`st-${idx}`}
              cx={sx}
              cy={sy}
              r={3}
              fill="#38bdf8"
              opacity="0.5"
            />
          );
        })}

        {/* 底端缓冲挡板（工业缓冲胶垫，杜绝突兀色彩） */}
        <g transform={`translate(${bottomX}, ${bottomY}) rotate(${params.angleDeg})`}>
          <rect
            x={-12}
            y={-24}
            width={8}
            height={24}
            rx={2}
            fill="#334155"
            stroke="#64748b"
            strokeWidth="1.5"
          />
        </g>

        {/* 滑块与旋转坐标系 */}
        <g transform={`translate(${blockSurfaceX}, ${blockSurfaceY}) rotate(${params.angleDeg})`}>
          {/* 滑块主体：高饱和金属琥珀色，质感厚实醒目 */}
          <rect
            x={-blockW / 2}
            y={-blockH}
            width={blockW}
            height={blockH}
            rx={5}
            fill="rgba(245, 158, 11, 0.92)"
            stroke="#fef08a"
            strokeWidth="1.8"
          />

          {/* 滑块质量文字标签：移至滑块内顶部，带深色独立衬底，彻底避开质心与所有受力箭头 */}
          <g transform={`translate(0, ${-blockH + 11})`}>
            <rect
              x={-16}
              y={-8}
              width={32}
              height={15}
              rx={3}
              fill="rgba(15, 23, 42, 0.88)"
            />
            <text
              x={0}
              y={3.5}
              textAnchor="middle"
              fill="#fef08a"
              fontSize="10.5"
              fontWeight="800"
            >
              {params.mass}kg
            </text>
          </g>

          {/* 受力分析正交分解矢量图：全高对比鲜艳矢量配色 + 独立徽章标签防遮挡 */}
          {showVectors && (
            <g transform={`translate(0, ${-blockH / 2})`}>
              {/* 质心交汇小锚点 */}
              <circle cx={0} cy={0} r={2.5} fill="#fef08a" stroke="#0f172a" strokeWidth="1" />

              {/* 正交分解平行四边形虚线 */}
              <line
                x1={gxPx}
                y1={0}
                x2={gxPx}
                y2={gyPx}
                stroke="rgba(251, 191, 36, 0.55)"
                strokeWidth="1.4"
                strokeDasharray="3 3"
              />
              <line
                x1={0}
                y1={gyPx}
                x2={gxPx}
                y2={gyPx}
                stroke="rgba(251, 191, 36, 0.55)"
                strokeWidth="1.4"
                strokeDasharray="3 3"
              />

              {/* Gx = mg sinθ (沿斜面向下分力，向右延伸至滑块外开阔区) */}
              {Math.abs(gxPx) > 1.5 && (
                <g>
                  <line x1={0} y1={0} x2={gxPx} y2={0} stroke="#fbbf24" strokeWidth="2.5" />
                  <polygon
                    points={`${gxPx},0 ${gxPx - 6},-3.5 ${gxPx - 6},3.5`}
                    fill="#fbbf24"
                  />
                  {renderForceTag(gxPx + 6, 0, `Gx=${f.gx.toFixed(1)}N`, "#fbbf24", "start")}
                </g>
              )}

              {/* Gy = mg cosθ (垂直斜面分力，向下延伸至滑块下方) */}
              <g>
                <line x1={0} y1={0} x2={0} y2={gyPx} stroke="#94a3b8" strokeWidth="1.8" strokeDasharray="3 2" />
                {renderForceTag(8, gyPx + 8, `Gy=${f.gy.toFixed(1)}N`, "#cbd5e1", "start")}
              </g>

              {/* 支持力 N (垂直斜面向上，向上延伸至滑块上方开阔区) */}
              <g>
                <line x1={0} y1={0} x2={0} y2={-normalPx} stroke="#22c55e" strokeWidth="2.6" />
                <polygon
                  points={`0,${-normalPx} -3.5,${-normalPx + 6} 3.5,${-normalPx + 6}`}
                  fill="#22c55e"
                />
                {renderForceTag(8, -normalPx - 2, `N=${f.normal.toFixed(1)}N`, "#22c55e", "start")}
              </g>

              {/* 摩擦力 f (沿斜面向上，向左延伸至滑块左侧开阔区，与 Gx 彻底分离) */}
              {Math.abs(frictionPx) > 2 && (
                <g>
                  <line x1={0} y1={0} x2={frictionPx} y2={0} stroke="#f97316" strokeWidth="2.4" />
                  <polygon
                    points={`${frictionPx},0 ${frictionPx - Math.sign(frictionPx) * 6},-3.5 ${
                      frictionPx - Math.sign(frictionPx) * 6
                    },3.5`}
                    fill="#f97316"
                  />
                  {renderForceTag(frictionPx - 6, 0, `f=${Math.abs(f.friction).toFixed(1)}N`, "#f97316", "end")}
                </g>
              )}

              {/* 竖直向下的重力 G = mg (地面防穿透，在尖端左下方清晰标注) */}
              <g transform={`rotate(${-params.angleDeg})`}>
                <line x1={0} y1={0} x2={0} y2={weightPx} stroke="#eab308" strokeWidth="2.6" />
                <polygon
                  points={`0,${weightPx} -4,${weightPx - 6} 4,${weightPx - 6}`}
                  fill="#eab308"
                />
                {renderForceTag(-8, weightPx + 8, `G=${f.weight.toFixed(1)}N`, "#fde047", "end")}
              </g>
            </g>
          )}
        </g>

        {/* 左上角精细状态铭牌 */}
        <g transform="translate(18, 20)">
          <rect
            x={0}
            y={0}
            width={statusText.length * 11 + 32}
            height={26}
            rx={6}
            fill="rgba(15, 23, 42, 0.88)"
            stroke={statusBorder}
            strokeWidth="1.2"
          />
          <text x={10} y={17} fill="#e2e8f0" fontSize="11" fontWeight="650">
            {statusText}
          </text>
        </g>
      </g>
    );
  },
};
