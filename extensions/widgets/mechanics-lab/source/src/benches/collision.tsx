/**
 * ============================================================================
 * 实验台插件 3：动量守恒与一维弹性/非弹性碰撞实验台 (`src/benches/collision.tsx`)
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

export interface CollisionParams extends Record<string, number> {
  mass1: number;
  mass2: number;
  v1Init: number;
  v2Init: number;
  restitution: number;
}

export interface CollisionState {
  t: number;
  x1: number;
  x2: number;
  v1: number;
  v2: number;
  collided: boolean;
  thermalLoss: number;
  initialKinetic: number;
  initialMomentum: number;
  completed: boolean;
}

const TRACK_MIN_X = -6.0;
const TRACK_MAX_X = 6.0;

function radiusForMass(m: number): number {
  return 0.35 + Math.sqrt(m) * 0.1;
}

function renderHorizVector(
  x1: number,
  y: number,
  dx: number,
  color: string,
  label: string,
) {
  if (Math.abs(dx) < 5) return null;
  const x2 = x1 + dx;
  const dir = Math.sign(dx);
  const headLen = 7;
  const bx = x2 - dir * headLen;
  return (
    <g>
      <line
        x1={x1}
        y1={y}
        x2={bx}
        y2={y}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <polygon
        points={`${x2},${y} ${bx},${y - 3.2} ${bx},${y + 3.2}`}
        fill={color}
      />
      <text
        x={x1 + dx * 0.5}
        y={y - 8}
        textAnchor="middle"
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

export const collisionBench: ExperimentBench<CollisionParams, CollisionState> =
  {
    id: "collision",
    title: {
      "zh-CN": "3. 动量守恒碰撞台",
      "zh-TW": "3. 動量守恆碰撞台",
      en: "3. Momentum & Collisions",
      ja: "3. 運動量保存と衝突",
      ko: "3. 운동량 보존과 충돌",
      es: "3. Momento lineal y colisiones",
      de: "3. Impulserhaltung & Stöße",
      fr: "3. Quantité de mouvement et collisions",
    },
    subtitle: {
      "zh-CN": "探索弹性碰撞交换速度、小撞大反弹、完全非弹性粘合与动量守恒定律",
      "zh-TW": "探索彈性碰撞交換速度、小撞大反彈、完全非彈性黏合與動量守恆定律",
      en: "Explore elastic velocity exchange, inelastic sticking, and conservation of momentum",
      ja: "弾性衝突での速度交換、非弾性合体、運動量保存則を検証",
      ko: "탄성 충돌 속도 교환, 비탄성 결합, 운동량 보존 법칙 검증",
      es: "Explora el intercambio de velocidad elástico, choque inelástico y conservación de momento",
      de: "Untersucht elastischen Geschwindigkeitsaustausch, inelastisches Zusammenkleben und Impulserhaltung",
      fr: "Explore l'échange de vitesse élastique, le choc inélastique et la conservation de quantité de mouvement",
    },
    formulaBadge: "m₁v₁ + m₂v₂ = m₁v₁' + m₂v₂' , e = |v₂' − v₁'| / |v₁ − v₂|",
    principleNote: {
      "zh-CN":
        "在光滑水平气垫导轨上，两球系统不受外力，无论发生完全弹性碰撞（e=1，机械能守恒）还是完全非弹性碰撞（e=0，两球粘在一起，损失动能转化为内能 Q），碰撞前后的总动量 p_总 = m₁v₁ + m₂v₂ 永远严格不变。当两球质量相等 (m₁=m₂) 且 e=1 时，两球直接交换速度。",
      "zh-TW":
        "在光滑水平氣墊導軌上，兩球系統不受外力，無論發生完全彈性碰撞（e=1，機械能守恆）還是完全非彈性碰撞（e=0，兩球黏在一起，損失動能轉化為內能 Q），碰撞前後的總動量 p_總 = m₁v₁ + m₂v₂ 永遠嚴格不變。當兩球質量相等 (m₁=m₂) 且 e=1 時，兩球直接交換速度。",
      en:
        "On a frictionless air track, total linear momentum p = m1·v1 + m2·v2 is strictly conserved for any restitution e ∈ [0, 1]. When m1 = m2 and e = 1, the two spheres exchange velocities upon impact.",
    },
    waveformLabels: {
      primary: {
        "zh-CN": "A球速度 v₁ (m/s)",
        "zh-TW": "A球速度 v₁ (m/s)",
        en: "Ball A v1 (m/s)",
      },
      secondary: {
        "zh-CN": "B球速度 v₂ (m/s)",
        "zh-TW": "B球速度 v₂ (m/s)",
        en: "Ball B v2 (m/s)",
      },
      unit: "m/s",
    },
    paramSpecs: [
      {
        key: "mass1",
        label: { "zh-CN": "左球 A 质量", "zh-TW": "左球 A 質量", en: "Ball A Mass" },
        symbol: "m₁",
        unit: "kg",
        min: 0.5,
        max: 8,
        step: 0.5,
        defaultValue: 2,
      },
      {
        key: "mass2",
        label: { "zh-CN": "右球 B 质量", "zh-TW": "右球 B 質量", en: "Ball B Mass" },
        symbol: "m₂",
        unit: "kg",
        min: 0.5,
        max: 8,
        step: 0.5,
        defaultValue: 2,
      },
      {
        key: "v1Init",
        label: { "zh-CN": "左球 A 初速", "zh-TW": "左球 A 初速", en: "Ball A Init v₁" },
        symbol: "v₁",
        unit: "m/s",
        min: 1,
        max: 8,
        step: 0.5,
        defaultValue: 4,
      },
      {
        key: "v2Init",
        label: { "zh-CN": "右球 B 初速", "zh-TW": "右球 B 初速", en: "Ball B Init v₂" },
        symbol: "v₂",
        unit: "m/s",
        min: -6,
        max: 3,
        step: 0.5,
        defaultValue: 0,
      },
      {
        key: "restitution",
        label: { "zh-CN": "弹性恢复系数", "zh-TW": "彈性恢復係數", en: "Restitution" },
        symbol: "e",
        unit: "",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 1,
      },
    ],
    presets: [
      {
        id: "equal_mass_exchange",
        title: {
          "zh-CN": "等质量完全弹性：交换速度 (m₁=m₂, e=1)",
          "zh-TW": "等質量完全彈性：交換速度 (m₁=m₂, e=1)",
          en: "Equal Mass Elastic: Velocity Swap (e=1)",
        },
        description: {
          "zh-CN": "牛顿摆原理：A 球撞击静止等质量 B 球后立即静止，B 球以 A 球原速飞出",
          "zh-TW": "牛頓擺原理：A 球撞擊靜止等質量 B 球後立即靜止，B 球以 A 球原速飛出",
          en: "Ball A stops dead on impact while Ball B departs with A's exact initial velocity",
        },
        params: { mass1: 2, mass2: 2, v1Init: 4, v2Init: 0, restitution: 1 },
      },
      {
        id: "light_hits_heavy",
        title: {
          "zh-CN": "小球撞大球反弹 (m₁=1kg, m₂=7kg, e=1)",
          "zh-TW": "小球撞大球反彈 (m₁=1kg, m₂=7kg, e=1)",
          en: "Light Hits Heavy Rebound (1kg vs 7kg)",
        },
        description: {
          "zh-CN": "1kg 小球撞击 7kg 静止大球后反向弹回 (v₁' = -3m/s)，大球缓慢前移",
          "zh-TW": "1kg 小球撞擊 7kg 靜止大球後反向彈回 (v₁' = -3m/s)，大球緩慢前移",
          en: "Light ball rebounds backward while the heavy ball moves forward slowly",
        },
        params: { mass1: 1, mass2: 7, v1Init: 4, v2Init: 0, restitution: 1 },
      },
      {
        id: "inelastic_stick",
        title: {
          "zh-CN": "完全非弹性碰撞：粘合共速 (e = 0)",
          "zh-TW": "完全非彈性碰撞：黏合共速 (e = 0)",
          en: "Completely Inelastic Stick (e = 0)",
        },
        description: {
          "zh-CN": "两球碰撞后粘在一起以共同速度 v' = (m₁v₁+m₂v₂)/(m₁+m₂) 运动，动能损失最大",
          "zh-TW": "兩球碰撞後黏在一起以共同速度 v' = (m₁v₁+m₂v₂)/(m₁+m₂) 運動，動能損失最大",
          en: "Balls stick together after impact at shared velocity; maximum kinetic energy converts to heat",
        },
        params: { mass1: 2, mass2: 2, v1Init: 5, v2Init: -1, restitution: 0 },
      },
    ],

    getDefaultParams(): CollisionParams {
      return { mass1: 2, mass2: 2, v1Init: 4, v2Init: 0, restitution: 1 };
    },

    createInitialState(params: CollisionParams): CollisionState {
      const ek0 =
        0.5 * params.mass1 * params.v1Init * params.v1Init +
        0.5 * params.mass2 * params.v2Init * params.v2Init;
      const p0 = params.mass1 * params.v1Init + params.mass2 * params.v2Init;
      return {
        t: 0,
        x1: -2.4,
        x2: 1.4,
        v1: params.v1Init,
        v2: params.v2Init,
        collided: false,
        thermalLoss: 0,
        initialKinetic: ek0,
        initialMomentum: p0,
        completed: false,
      };
    },

    stepPhysics(
      state: CollisionState,
      params: CollisionParams,
      dt: number,
    ): BenchStepResult<CollisionState> {
      if (state.completed) return { state };

      const r1 = radiusForMass(params.mass1);
      const r2 = radiusForMass(params.mass2);
      const minDist = r1 + r2;

      let nextX1 = state.x1 + state.v1 * dt;
      let nextX2 = state.x2 + state.v2 * dt;
      let nextV1 = state.v1;
      let nextV2 = state.v2;
      let collided = state.collided;
      let thermalLoss = state.thermalLoss;
      const soundEvents: BenchStepResult<CollisionState>["soundEvents"] = [];

      if (!collided && nextX2 - nextX1 <= minDist && state.v1 > state.v2) {
        const m1 = params.mass1;
        const m2 = params.mass2;
        const u1 = state.v1;
        const u2 = state.v2;
        const e = params.restitution;

        nextV1 = (m1 * u1 + m2 * u2 - m2 * e * (u1 - u2)) / (m1 + m2);
        nextV2 = (m1 * u1 + m2 * u2 + m1 * e * (u1 - u2)) / (m1 + m2);

        const mid = 0.5 * (state.x1 + state.x2);
        nextX1 = mid - 0.5 * minDist;
        nextX2 = mid + 0.5 * minDist;

        const ekAfter = 0.5 * m1 * nextV1 * nextV1 + 0.5 * m2 * nextV2 * nextV2;
        thermalLoss = Math.max(0, state.initialKinetic - ekAfter);
        collided = true;

        soundEvents.push({
          kind: "collision",
          intensity: Math.min(1.5, Math.abs(u1 - u2) / 4),
        });
      }

      let completed = false;
      if (
        nextX1 <= TRACK_MIN_X ||
        nextX2 >= TRACK_MAX_X ||
        state.t + dt >= 4.0
      ) {
        completed = true;
      }

      return {
        state: {
          ...state,
          t: state.t + dt,
          x1: nextX1,
          x2: nextX2,
          v1: nextV1,
          v2: nextV2,
          collided,
          thermalLoss,
          completed,
        },
        soundEvents,
      };
    },

    computeEnergy(
      state: CollisionState,
      params: CollisionParams,
    ): EnergyBreakdown {
      const kinetic =
        0.5 * params.mass1 * state.v1 * state.v1 +
        0.5 * params.mass2 * state.v2 * state.v2;
      const thermal = state.thermalLoss;
      return {
        kinetic,
        potential: 0,
        thermal,
        total: kinetic + thermal,
      };
    },

    computeTelemetry(
      state: CollisionState,
      params: CollisionParams,
    ): TelemetryItem[] {
      const p1 = params.mass1 * state.v1;
      const p2 = params.mass2 * state.v2;
      const pTotal = p1 + p2;
      return [
        {
          id: "pTotal",
          label: {
            "zh-CN": "系统总动量",
            "zh-TW": "系統總動量",
            en: "Total Momentum",
          },
          symbol: "p",
          value: pTotal.toFixed(2),
          unit: "kg·m/s",
          highlight: "amber",
        },
        {
          id: "v1",
          label: { "zh-CN": "左球 A 速度", "zh-TW": "左球 A 速度", en: "Ball A Vel" },
          symbol: "v₁",
          value: state.v1.toFixed(2),
          unit: "m/s",
          highlight: "cyan",
        },
        {
          id: "v2",
          label: { "zh-CN": "右球 B 速度", "zh-TW": "右球 B 速度", en: "Ball B Vel" },
          symbol: "v₂",
          value: state.v2.toFixed(2),
          unit: "m/s",
          highlight: "emerald",
        },
        {
          id: "p1",
          label: { "zh-CN": "A 球动量", "zh-TW": "A 球動量", en: "Momentum p₁" },
          symbol: "p₁",
          value: p1.toFixed(1),
          unit: "N·s",
        },
        {
          id: "p2",
          label: { "zh-CN": "B 球动量", "zh-TW": "B 球動量", en: "Momentum p₂" },
          symbol: "p₂",
          value: p2.toFixed(1),
          unit: "N·s",
        },
      ];
    },

    sampleWaveform(state: CollisionState) {
      return {
        t: Number(state.t.toFixed(2)),
        primary: Number(state.v1.toFixed(2)),
        secondary: Number(state.v2.toFixed(2)),
      };
    },

    isCompleted(state: CollisionState): boolean {
      return state.completed;
    },

    summarizeForAI(state: CollisionState, params: CollisionParams) {
      const p1 = params.mass1 * state.v1;
      const p2 = params.mass2 * state.v2;
      return {
        bench: "collision",
        collided: state.collided,
        v1MS: Number(state.v1.toFixed(2)),
        v2MS: Number(state.v2.toFixed(2)),
        momentum1: Number(p1.toFixed(2)),
        momentum2: Number(p2.toFixed(2)),
        totalMomentumConserved: Number((p1 + p2).toFixed(2)),
        thermalEnergyLostJ: Number(state.thermalLoss.toFixed(2)),
      };
    },

    renderStage({
      params,
      state,
      showVectors,
      showVectorDetails = false,
      showGrid,
    }: BenchStageProps<CollisionParams, CollisionState>) {
      const centerX = 380;
      const trackY = 248;
      const pxPerMeter = 52;

      const r1Px = radiusForMass(params.mass1) * pxPerMeter;
      const r2Px = radiusForMass(params.mass2) * pxPerMeter;
      const x1Px = centerX + state.x1 * pxPerMeter;
      const x2Px = centerX + state.x2 * pxPerMeter;

      const p1 = params.mass1 * state.v1;
      const p2 = params.mass2 * state.v2;
      const pTotal = p1 + p2;

      return (
        <g>
          {showGrid && (
            <g stroke="var(--ml-canvas-grid)" strokeWidth="1">
              {Array.from({ length: 13 }, (_, i) => {
                const m = i - 6;
                const px = centerX + m * pxPerMeter;
                return (
                  <g key={`cm-${m}`}>
                    <line x1={px} y1={40} x2={px} y2={trackY + 26} />
                    <text
                      x={px}
                      y={trackY + 46}
                      textAnchor="middle"
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

          {/* 轻量水平导轨 */}
          <rect
            x={55}
            y={trackY + 22}
            width={650}
            height={8}
            rx={2}
            fill="var(--ml-ramp-surface)"
            stroke="var(--ml-ramp-edge)"
            strokeWidth="1.25"
          />

          {/* 左球 A */}
          <g>
            <circle
              cx={x1Px}
              cy={trackY - r1Px + 22}
              r={r1Px}
              fill="var(--ml-primary)"
              stroke="var(--ml-canvas-bg)"
              strokeWidth="1.5"
            />
            <text
              x={x1Px}
              y={trackY - r1Px + 26}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11"
              fontWeight="700"
            >
              A · {params.mass1}kg
            </text>
            {showVectors &&
              Math.abs(state.v1) > 0.05 &&
              renderHorizVector(
                x1Px,
                trackY - r1Px * 2 + 6,
                state.v1 * 14,
                "var(--ml-primary)",
                showVectorDetails ? `v₁ = ${state.v1.toFixed(1)} m/s` : "v₁",
              )}
          </g>

          {/* 右球 B */}
          <g>
            <circle
              cx={x2Px}
              cy={trackY - r2Px + 22}
              r={r2Px}
              fill="var(--ml-block-fill)"
              stroke="var(--ml-block-stroke)"
              strokeWidth="1.5"
            />
            <text
              x={x2Px}
              y={trackY - r2Px + 26}
              textAnchor="middle"
              fill="var(--ml-block-text)"
              fontSize="11"
              fontWeight="700"
            >
              B · {params.mass2}kg
            </text>
            {showVectors &&
              Math.abs(state.v2) > 0.05 &&
              renderHorizVector(
                x2Px,
                trackY - r2Px * 2 + 6,
                state.v2 * 14,
                "var(--ml-force-g)",
                showVectorDetails ? `v₂ = ${state.v2.toFixed(1)} m/s` : "v₂",
              )}
          </g>

          {/* 左上角轻量动量守恒文字 */}
          <g transform="translate(24, 28)">
            <circle cx={0} cy={-4} r={3.5} fill="var(--ml-primary)" />
            <text
              x={10}
              y={0}
              fill="var(--ml-text-muted)"
              fontSize="12"
              fontWeight="500"
            >
              动量守恒：p₁ ({p1.toFixed(1)}) + p₂ ({p2.toFixed(1)}) = {pTotal.toFixed(1)} kg·m/s
            </text>
          </g>
        </g>
      );
    },
  };
