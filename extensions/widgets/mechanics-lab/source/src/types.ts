/**
 * ============================================================================
 * 经典力学实验室 (Mechanics Lab) — 插件化实验台核心架构契约 (`src/types.ts`)
 * ============================================================================
 *
 * 【设计目标：零耦合、开闭原则 (Open-Closed Principle)】
 * 1. 实验室宿主外壳 (`App.tsx` / `game.ts`) 只依赖本文件定义的 `ExperimentBench` 接口，
 *    完全不知道具体有哪些实验台，也不知道任何具体物理公式。
 * 2. 每个实验台（如斜面 `ramp`、抛体 `projectile`、碰撞 `collision`、简谐振动 `harmonic`）
 *    各自封装在独立的 `src/benches/<id>.tsx` 文件中。
 * 3. 当未来升级需要新增第 5、第 6 个实验台（例如“阿基米德浮力台”或“圆周向心力台”）时：
 *    - 只需新建 `src/benches/<new-bench>.tsx` 实现 `ExperimentBench` 接口；
 *    - 在 `src/benches/index.ts` 的 `BENCH_REGISTRY` 数组中追加一行；
 *    - 对已有实验台、UI 外壳、能量监控器、波形仪及大模型 MCP 接口实现 **0 行修改**。
 */

import type React from "react";
import type { LocaleKey } from "./text";

export type LocalizedText = Partial<Record<LocaleKey, string>> & {
  en?: string;
  "zh-CN"?: string;
  [k: string]: string | undefined;
};

/**
 * 单个可调物理参数的声明式元数据。
 * 宿主外壳根据此数组自动渲染右侧滑块控制面板，并在大模型调用 `configureExperiment` 时自动校验范围。
 */
export interface BenchParamSpec {
  /** 参数唯一键名（如 "angleDeg", "mu", "mass1"） */
  key: string;
  /** 多语言名称 */
  label: LocalizedText;
  /** 物理符号（如 "θ", "μ", "m₁"），用于在滑块旁展示标准物理记号 */
  symbol: string;
  /** 单位字符串（如 "°", "kg", "m/s", "N/m"） */
  unit: string;
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** 调节步长 */
  step: number;
  /** 默认初始值 */
  defaultValue: number;
}

/**
 * 经典教学预设场景（如“冰面无摩擦下滑”、“临界静摩擦角测试”、“平抛 vs 自由落体同高对比”）。
 */
export interface BenchPresetSpec<TParams extends Record<string, number> = Record<string, number>> {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  /** 预设对应的参数键值对 */
  params: TParams;
}

/**
 * 机械能与热损耗实时分解（单位：焦耳 J）。
 * 宿主外壳使用此结构自动渲染顶部的“机械能守恒实时柱状图”。
 */
export interface EnergyBreakdown {
  /** 动能 Ek (J) */
  kinetic: number;
  /** 势能 Ep（重力势能 + 弹性势能，J） */
  potential: number;
  /** 摩擦/非弹性碰撞转化的内能/热能 Q (J) */
  thermal: number;
  /** 总机械能 + 内能 E_total (J) */
  total: number;
}

/**
 * 底部或侧边仪表盘展示的单条实时物理量读数。
 */
export interface TelemetryItem {
  id: string;
  label: LocalizedText;
  symbol: string;
  value: string;
  unit: string;
  highlight?: "cyan" | "amber" | "emerald" | "rose";
}

/**
 * 实时示波器 / 纸带打点记录仪的数据点。
 */
export interface WaveformSample {
  /** 实验时间 t (s) */
  t: number;
  /** 主曲线数值（如位移 x、速度 v 或高度 y） */
  primary: number;
  /** 对比副曲线数值（可选，如自由落体对照球高度或第二物体速度） */
  secondary?: number;
}

/**
 * 实验台在物理步进时可触发的声学事件类型，由宿主统一交由 `sound.ts` 合成音效。
 */
export type BenchSoundEvent =
  | { kind: "collision"; intensity: number }
  | { kind: "launch" }
  | { kind: "targetHit" }
  | { kind: "equilibriumTick" }
  | { kind: "slide"; speed: number; roughness: number };

/**
 * 物理单步推进的返回结果。
 */
export interface BenchStepResult<TState> {
  state: TState;
  soundEvents?: BenchSoundEvent[];
}

/**
 * 传递给实验台专属 SVG 渲染组件的标准 Props。
 */
export interface BenchStageProps<
  TParams extends Record<string, number>,
  TState,
> {
  params: TParams;
  state: TState;
  showVectors: boolean;
  showGrid: boolean;
  locale: LocaleKey;
  /** 允许实验台在画布内直接回调更新某个参数（例如拖拽改变倾角或初位置） */
  onChangeParam: (key: keyof TParams & string, value: number) => void;
}

/**
 * ============================================================================
 * 核心插件接口：`ExperimentBench`
 * ============================================================================
 * 每一个物理实验台都必须且只需实现此接口。
 */
export interface ExperimentBench<
  TParams extends Record<string, number> = Record<string, number>,
  TState = unknown,
> {
  /** 实验台唯一 ID（如 "ramp" | "projectile" | "collision" | "harmonic"） */
  id: string;
  /** 实验台简短名称（用于顶部 Tab 切换栏） */
  title: LocalizedText;
  /** 实验台一句话教学副标题 */
  subtitle: LocalizedText;
  /** 核心物理公式说明（展示在实验台公式铭牌上） */
  formulaBadge: string;
  /** 面向孩子的通俗原理解析卡片文案 */
  principleNote: LocalizedText;
  /** 示波器曲线标签 */
  waveformLabels: {
    primary: LocalizedText;
    secondary?: LocalizedText;
    unit: string;
  };
  /** 声明式参数滑块列表 */
  paramSpecs: BenchParamSpec[];
  /** 经典教学预设列表 */
  presets: BenchPresetSpec<TParams>[];
  /** 获取默认参数对象 */
  getDefaultParams(): TParams;
  /** 根据参数创建初始物理状态（t = 0） */
  createInitialState(params: TParams): TState;
  /** 纯函数物理步进：输入当前状态与步长 dt (秒)，返回新状态及可选声学事件 */
  stepPhysics(state: TState, params: TParams, dt: number): BenchStepResult<TState>;
  /** 计算当前时刻的能量分解（动能、势能、热能、总能量） */
  computeEnergy(state: TState, params: TParams): EnergyBreakdown;
  /** 计算当前时刻的实时物理量读数（用于仪表盘和 AI `readLab` 接口） */
  computeTelemetry(state: TState, params: TParams): TelemetryItem[];
  /** 提取当前时刻的示波器采样点 */
  sampleWaveform(state: TState, params: TParams): WaveformSample;
  /** 判断当前单次实验是否已自然结束（如滑到底部、落地静止），用于自动暂停 */
  isCompleted(state: TState, params: TParams): boolean;
  /** 生成供大模型 `readLab` 接口读取的结构化教学诊断摘要 */
  summarizeForAI(state: TState, params: TParams, locale: LocaleKey): Record<string, unknown>;
  /** 渲染实验台专属的 SVG 物理画布内容（视口统一为 viewBox="0 0 760 400"） */
  renderStage(props: BenchStageProps<TParams, TState>): React.ReactNode;
}
