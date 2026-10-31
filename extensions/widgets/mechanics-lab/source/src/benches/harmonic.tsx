/**
 * ============================================================================
 * 实验台插件 4：弹簧振子与简谐运动实验台 (`src/benches/harmonic.tsx`)
 * ============================================================================
 *
 * 【可维护性验证（Phase 2 新增插件）】
 * 本文件同样作为独立插件加入，无需改动已有实验台或公共外壳，仅在 `src/benches/index.ts` 注册。
 *
 * 【教学目标】
 * 1. 胡克定律与回复力：F = -k · x，加速度 a = -(k/m) · x 始终指向平衡位置 (x = 0)。
 * 2. 简谐运动固有周期公式：T = 2π · √(m / k)，验证固有周期只由质量 m 和劲度系数 k 决定，
 *    与初始振幅 A 无关（等时性）！
 * 3. 动能与弹性势能的周期性交替转化：
 *    - 在最大位移处 (x = ±A)：速度 v = 0，动能 Ek = 0，弹性势能 Ep = ½kA² 最大；
 *    - 在平衡位置处 (x = 0)：势能 Ep = 0，速度达到最大，动能 Ek 最大。
 */

import React from "react";
import type {
  ExperimentBench,
  EnergyBreakdown,
  TelemetryItem,
  BenchStepResult,
  BenchStageProps,
} from "../types";

export interface HarmonicParams extends Record<string, number> {
  /** 弹簧劲度系数 k (N/m) */
  stiffness: number;
  /** 振子质量 m (kg) */
  mass: number;
  /** 初始拉伸位移振幅 x0 (m) */
  amplitude: number;
  /** 阻尼系数 c (N·s/m，0 表示无阻尼理想简谐振动) */
  damping: number;
}

export interface HarmonicState {
  t: number;
  x: number;
  v: number;
  a: number;
  thermalEnergy: number;
  initialEnergy: number;
  waveTrail: { t: number; x: number }[];
  completed: boolean;
}

export const harmonicBench: ExperimentBench<HarmonicParams, HarmonicState> = {
  id: "harmonic",
  title: {
    "zh-CN": "4. 弹簧振子简谐台",
    "zh-TW": "4. 彈簧振子簡諧台",
    en: "4. Harmonic Oscillator",
    ja: "4. 単振動とばね振り子",
    ko: "4. 조화 진동자와 용수철",
    es: "4. Oscilador armónico",
    de: "4. Harmonischer Oszillator",
    fr: "4. Oscillateur harmonique",
  },
  subtitle: {
    "zh-CN": "验证胡克定律 F = -kx、周期公式 T = 2π√(m/k) 与动势能周期互换",
    "zh-TW": "驗證虎克定律 F = -kx、週期公式 T = 2π√(m/k) 與動勢能週期互換",
    en: "Verify Hooke's Law F = -kx, period T = 2π√(m/k), and cyclic energy conversion",
    ja: "フックの法則、周期公式、運動エネルギーと弾性ポテンシャルエネルギーの交換を検証",
    ko: "훅의 법칙, 주기 공식, 운동·탄성 위치 에너지의 주기적 변환 검증",
    es: "Verifica la ley de Hooke, el periodo T = 2π√(m/k) y la conversión cíclica de energía",
    de: "Verifiziert Hookesches Gesetz, Periodenformel und periodische Energieumwandlung",
    fr: "Vérifie la loi de Hooke, la formule de période et la conversion cyclique d'énergie",
  },
  formulaBadge: "F = -k·x - c·v , T = 2π·√(m / k) , E = ½mv² + ½kx²",
  principleNote: {
    "zh-CN":
      "弹簧振子受到的回复力 F = -kx 大小与位移成正比、方向始终指向平衡位置 O。在无阻尼 (c=0) 情况下，振子在平衡位置速度最大（动能 Ek 最大、势能 Ep=0），在两端最大位移处速度为零（动能 Ek=0、势能 Ep 最大），固有周期 T = 2π√(m/k) 与振幅无关！",
    "zh-TW":
      "彈簧振子受到的回復力 F = -kx 大小與位移成正比、方向始終指向平衡位置 O。在無阻尼 (c=0) 情況下，振子在平衡位置速度最大（動能 Ek 最大、勢能 Ep=0），在兩端最大位移處速度為零（動能 Ek=0、勢能 Ep 最大），固有週期 T = 2π√(m/k) 與振幅無關！",
    en:
      "Restoring force F = -kx points toward equilibrium O (x = 0). Kinetic energy Ek and elastic potential energy Ep = ½kx² trade places twice every period T = 2π√(m/k), which is independent of amplitude!",
  },
  waveformLabels: {
    primary: {
      "zh-CN": "位移 x (m)",
      "zh-TW": "位移 x (m)",
      en: "Displacement x (m)",
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
      key: "stiffness",
      label: { "zh-CN": "弹簧劲度系数", "zh-TW": "彈簧勁度係數", en: "Spring k" },
      symbol: "k",
      unit: "N/m",
      min: 5,
      max: 60,
      step: 5,
      defaultValue: 20,
    },
    {
      key: "mass",
      label: { "zh-CN": "振子质量", "zh-TW": "振子質量", en: "Mass m" },
      symbol: "m",
      unit: "kg",
      min: 0.5,
      max: 8,
      step: 0.5,
      defaultValue: 2,
    },
    {
      key: "amplitude",
      label: { "zh-CN": "初始拉伸振幅", "zh-TW": "初始拉伸振幅", en: "Amplitude A" },
      symbol: "A",
      unit: "m",
      min: 0.5,
      max: 2.5,
      step: 0.25,
      defaultValue: 2.0,
    },
    {
      key: "damping",
      label: { "zh-CN": "空气/摩擦阻尼", "zh-TW": "空氣/摩擦阻尼", en: "Damping c" },
      symbol: "c",
      unit: "N·s/m",
      min: 0,
      max: 3,
      step: 0.2,
      defaultValue: 0,
    },
  ],
  presets: [
    {
      id: "ideal_undamped",
      title: {
        "zh-CN": "理想无阻尼简谐运动 (c = 0)",
        "zh-TW": "理想無阻尼簡諧運動 (c = 0)",
        en: "Ideal Undamped SHM (c = 0)",
      },
      description: {
        "zh-CN": "k=20N/m, m=2kg，周期 T ≈ 1.99s，动能与弹性势能无损交替转换",
        "zh-TW": "k=20N/m, m=2kg，週期 T ≈ 1.99s，動能與彈性勢能無損交替轉換",
        en: "k=20N/m, m=2kg, period T ≈ 1.99s; perpetual sinusoidal oscillation",
      },
      params: { stiffness: 20, mass: 2, amplitude: 2.0, damping: 0 },
    },
    {
      id: "high_freq_stiff",
      title: {
        "zh-CN": "高频硬弹簧轻振子 (k=50, m=1)",
        "zh-TW": "高頻硬彈簧輕振子 (k=50, m=1)",
        en: "High-Frequency Stiff Spring (k=50, m=1)",
      },
      description: {
        "zh-CN": "增大劲度系数 k 并减小质量 m，周期缩短至 T ≈ 0.89s",
        "zh-TW": "增大勁度係數 k 並減小質量 m，週期縮短至 T ≈ 0.89s",
        en: "Higher k and smaller m shorten the oscillation period to T ≈ 0.89s",
      },
      params: { stiffness: 50, mass: 1, amplitude: 1.75, damping: 0 },
    },
    {
      id: "underdamped_decay",
      title: {
        "zh-CN": "阻尼振动振幅衰减 (c = 0.8)",
        "zh-TW": "阻尼振動振幅衰減 (c = 0.8)",
        en: "Damped Oscillation Decay (c = 0.8)",
      },
      description: {
        "zh-CN": "存在阻力做负功，振幅按指数包络线逐渐衰减，机械能转化为内能 Q",
        "zh-TW": "存在阻力做負功，振幅按指數包絡線逐漸衰減，機械能轉化為內能 Q",
        en: "Damping gradually converts mechanical energy into thermal energy Q",
      },
      params: { stiffness: 25, mass: 2, amplitude: 2.25, damping: 0.8 },
    },
  ],

  getDefaultParams(): HarmonicParams {
    return { stiffness: 20, mass: 2, amplitude: 2.0, damping: 0 };
  },

  createInitialState(params: HarmonicParams): HarmonicState {
    const e0 = 0.5 * params.stiffness * params.amplitude * params.amplitude;
    const a0 = -(params.stiffness * params.amplitude) / params.mass;
    return {
      t: 0,
      x: params.amplitude,
      v: 0,
      a: a0,
      thermalEnergy: 0,
      initialEnergy: e0,
      waveTrail: [{ t: 0, x: params.amplitude }],
      completed: false,
    };
  },

  stepPhysics(
    state: HarmonicState,
    params: HarmonicParams,
    dt: number,
  ): BenchStepResult<HarmonicState> {
    if (state.completed) return { state };

    // 当无阻尼 (c = 0) 时使用精确解析解保证长时间运行能量 100% 守恒无数值漂移；
    // 有阻尼时使用 Velocity-Verlet 对称积分
    const omega0 = Math.sqrt(params.stiffness / params.mass);
    const nextT = state.t + dt;
    let nextX: number;
    let nextV: number;
    let nextA: number;
    let nextThermal = state.thermalEnergy;

    if (params.damping === 0) {
      nextX = params.amplitude * Math.cos(omega0 * nextT);
      nextV = -params.amplitude * omega0 * Math.sin(omega0 * nextT);
      nextA = -omega0 * omega0 * nextX;
    } else {
      const a1 =
        (-params.stiffness * state.x - params.damping * state.v) / params.mass;
      const vHalf = state.v + 0.5 * a1 * dt;
      nextX = state.x + vHalf * dt;
      const a2 =
        (-params.stiffness * nextX - params.damping * vHalf) / params.mass;
      nextV = vHalf + 0.5 * a2 * dt;
      nextA = a2;
      const currentMech =
        0.5 * params.mass * nextV * nextV +
        0.5 * params.stiffness * nextX * nextX;
      nextThermal = Math.max(0, state.initialEnergy - currentMech);
    }

    const soundEvents: BenchStepResult<HarmonicState>["soundEvents"] = [];
    // 经过平衡位置 x = 0 时触发节拍器轻响
    if (
      (state.x > 0 && nextX <= 0) ||
      (state.x < 0 && nextX >= 0)
    ) {
      soundEvents.push({ kind: "equilibriumTick" });
    }

    const completed = nextT >= 8.0;

    return {
      state: {
        ...state,
        t: nextT,
        x: nextX,
        v: nextV,
        a: nextA,
        thermalEnergy: nextThermal,
        waveTrail: [...state.waveTrail.slice(-110), { t: nextT, x: nextX }],
        completed,
      },
      soundEvents,
    };
  },

  computeEnergy(
    state: HarmonicState,
    params: HarmonicParams,
  ): EnergyBreakdown {
    const kinetic = 0.5 * params.mass * state.v * state.v;
    const potential = 0.5 * params.stiffness * state.x * state.x;
    const thermal = state.thermalEnergy;
    return {
      kinetic,
      potential,
      thermal,
      total: kinetic + potential + thermal,
    };
  },

  computeTelemetry(
    state: HarmonicState,
    params: HarmonicParams,
  ): TelemetryItem[] {
    const period = 2 * Math.PI * Math.sqrt(params.mass / params.stiffness);
    const restoringForce = -params.stiffness * state.x;
    return [
      {
        id: "period",
        label: { "zh-CN": "固有周期", "zh-TW": "固有週期", en: "Period T" },
        symbol: "T",
        value: period.toFixed(2),
        unit: "s",
        highlight: "amber",
      },
      {
        id: "dispX",
        label: { "zh-CN": "当前位移", "zh-TW": "目前位移", en: "Displacement" },
        symbol: "x",
        value: state.x.toFixed(2),
        unit: "m",
        highlight: "cyan",
      },
      {
        id: "velV",
        label: { "zh-CN": "当前速度", "zh-TW": "目前速度", en: "Velocity" },
        symbol: "v",
        value: state.v.toFixed(2),
        unit: "m/s",
        highlight: "emerald",
      },
      {
        id: "forceF",
        label: { "zh-CN": "胡克回复力", "zh-TW": "虎克回復力", en: "Restoring F" },
        symbol: "-kx",
        value: restoringForce.toFixed(1),
        unit: "N",
        highlight: "rose",
      },
    ];
  },

  sampleWaveform(state: HarmonicState) {
    return {
      t: Number(state.t.toFixed(2)),
      primary: Number(state.x.toFixed(2)),
      secondary: Number(state.v.toFixed(2)),
    };
  },

  isCompleted(state: HarmonicState): boolean {
    return state.completed;
  },

  summarizeForAI(state: HarmonicState, params: HarmonicParams) {
    const period = 2 * Math.PI * Math.sqrt(params.mass / params.stiffness);
    return {
      bench: "harmonic",
      naturalPeriodS: Number(period.toFixed(3)),
      displacementM: Number(state.x.toFixed(2)),
      velocityMS: Number(state.v.toFixed(2)),
      restoringForceN: Number((-params.stiffness * state.x).toFixed(2)),
    };
  },

  renderStage({
    params,
    state,
    showVectors,
  }: BenchStageProps<HarmonicParams, HarmonicState>) {
    const wallX = 75;
    const eqX = 390;
    const trackY = 175;
    const pxPerMeter = 85;
    const blockX = eqX + state.x * pxPerMeter;
    const restoringForce = -params.stiffness * state.x;

    // 生成弹簧锯齿折线路径
    const coils = 14;
    const startSpringX = wallX + 12;
    const endSpringX = blockX - 28;
    const springSpan = Math.max(40, endSpringX - startSpringX);
    const coilPts: string[] = [`M ${wallX} ${trackY}`, `L ${startSpringX} ${trackY}`];
    for (let i = 0; i < coils; i++) {
      const cx = startSpringX + ((i + 0.5) / coils) * springSpan;
      const cy = trackY + (i % 2 === 0 ? -15 : 15);
      coilPts.push(`L ${cx.toFixed(1)} ${cy}`);
    }
    coilPts.push(`L ${endSpringX.toFixed(1)} ${trackY}`);

    // 底部实时滚动 x-t 纸带正弦轨迹
    const waveBaseY = 325;
    const waveRightX = 680;
    const wavePoints = state.waveTrail
      .map((pt, idx) => {
        const dtAgo = state.t - pt.t;
        const wx = waveRightX - dtAgo * 115;
        const wy = waveBaseY - pt.x * 24;
        return `${idx === 0 ? "M" : "L"} ${wx.toFixed(1)} ${wy.toFixed(1)}`;
      })
      .join(" ");

    return (
      <g>
        {/* 左侧固定墙面与光滑导轨 */}
        <rect x={wallX - 10} y={105} width={10} height={115} rx={2} fill="#475569" />
        <line x1={wallX} y1={220} x2={710} y2={220} stroke="#475569" strokeWidth="3" />

        {/* 平衡位置 O (x = 0) 基准虚线 */}
        <line
          x1={eqX}
          y1={85}
          x2={eqX}
          y2={245}
          stroke="#fbbf24"
          strokeWidth="1.8"
          strokeDasharray="5 4"
        />
        <text
          x={eqX}
          y={76}
          textAnchor="middle"
          fill="#fde047"
          fontSize="11.5"
          fontWeight="800"
        >
          平衡位置 O (x = 0)
        </text>

        {/* 弹簧折线 */}
        <path
          d={coilPts.join(" ")}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />

        {/* 振子滑块 */}
        <g transform={`translate(${blockX}, ${trackY})`}>
          <rect
            x={-28}
            y={-28}
            width={56}
            height={56}
            rx={8}
            fill="#0284c7"
            stroke="#7dd3fc"
            strokeWidth="2.5"
          />
          <text
            x={0}
            y={5}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="12"
            fontWeight="800"
          >
            {params.mass}kg
          </text>

          {showVectors && (
            <g>
              {/* 回复力 F = -kx (红色箭头，始终指向平衡位置 O) */}
              {Math.abs(restoringForce) > 0.5 && (
                <>
                  <line
                    x1={0}
                    y1={-40}
                    x2={restoringForce * 2.2}
                    y2={-40}
                    stroke="#f43f5e"
                    strokeWidth="3"
                  />
                  <text
                    x={restoringForce * 1.1}
                    y={-48}
                    textAnchor="middle"
                    fill="#fda4af"
                    fontSize="10.5"
                    fontWeight="700"
                  >
                    F={restoringForce.toFixed(1)}N
                  </text>
                </>
              )}

              {/* 瞬时速度 v (绿色箭头) */}
              {Math.abs(state.v) > 0.1 && (
                <>
                  <line
                    x1={0}
                    y1={42}
                    x2={state.v * 14}
                    y2={42}
                    stroke="#22c55e"
                    strokeWidth="3"
                  />
                  <text
                    x={state.v * 7}
                    y={58}
                    textAnchor="middle"
                    fill="#86efac"
                    fontSize="10.5"
                    fontWeight="700"
                  >
                    v={state.v.toFixed(1)}m/s
                  </text>
                </>
              )}
            </g>
          )}
        </g>

        {/* 底部纸带正弦轨迹记录区 */}
        <rect
          x={65}
          y={265}
          width={635}
          height={115}
          rx={8}
          fill="rgba(15, 23, 42, 0.85)"
          stroke="rgba(56, 189, 248, 0.25)"
        />
        <line
          x1={75}
          y1={waveBaseY}
          x2={685}
          y2={waveBaseY}
          stroke="rgba(148, 163, 184, 0.25)"
          strokeDasharray="4 4"
        />
        <text x={82} y={284} fill="#7dd3fc" fontSize="10.5" fontWeight="700">
          📈 实时简谐波形记录 x(t) = A·cos(ωt)
        </text>
        {wavePoints && (
          <path
            d={wavePoints}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.4"
          />
        )}
      </g>
    );
  },
};
