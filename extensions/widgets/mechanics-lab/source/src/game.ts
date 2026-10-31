/**
 * ============================================================================
 * 经典力学实验室 (Mechanics Lab) — 状态同步与 AI 导师 MCP 接口层 (`src/game.ts`)
 * ============================================================================
 *
 * 【解耦设计】
 * 本文件完全不依赖任何具体实验台的内部实现，所有状态创建、参数校验、预设加载、
 * 能量计算与 AI 诊断摘要全部通过 `getBenchById(benchId)` 多态分发。
 */

import { pudding, type JSONValue } from "@pudding/widget";
import { z } from "zod";
import { BENCH_REGISTRY, getBenchById } from "./benches";
import { getLocale, t, loc } from "./text";
import type { WaveformSample } from "./types";

export interface LabPersistedState {
  activeBenchId: string;
  running: boolean;
  slowMotion: boolean;
  showVectors: boolean;
  showGrid: boolean;
  paramsByBench: Record<string, Record<string, number>>;
  stateByBench: Record<string, unknown>;
  waveformByBench: Record<string, WaveformSample[]>;
}

export function sanitizeJson<T>(val: T): JSONValue {
  if (val === undefined || val === null) return null;
  if (typeof val === "string" || typeof val === "boolean") return val;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (Array.isArray(val)) return val.map((item) => sanitizeJson(item));
  if (typeof val === "object") {
    const out: Record<string, JSONValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[k] = sanitizeJson(v);
    }
    return out;
  }
  return null;
}

export function createDefaultLabState(): LabPersistedState {
  const paramsByBench: Record<string, Record<string, number>> = {};
  const stateByBench: Record<string, unknown> = {};
  const waveformByBench: Record<string, WaveformSample[]> = {};

  for (const bench of BENCH_REGISTRY) {
    const defParams = bench.getDefaultParams();
    const initState = bench.createInitialState(defParams);
    paramsByBench[bench.id] = defParams;
    stateByBench[bench.id] = initState;
    waveformByBench[bench.id] = [bench.sampleWaveform(initState, defParams)];
  }

  return {
    activeBenchId: BENCH_REGISTRY[0].id,
    running: false,
    slowMotion: false,
    showVectors: true,
    showGrid: true,
    paramsByBench,
    stateByBench,
    waveformByBench,
  };
}

export function readLabPersistedState(): LabPersistedState {
  const raw = pudding.state.read().data.lab as unknown as
    | LabPersistedState
    | undefined;
  if (!raw || !raw.activeBenchId) {
    return createDefaultLabState();
  }
  // 动态补齐后续升级新增的实验台默认状态，确保旧存档无缝兼容新实验台插件！
  const defaults = createDefaultLabState();
  return {
    ...defaults,
    ...raw,
    paramsByBench: { ...defaults.paramsByBench, ...(raw.paramsByBench || {}) },
    stateByBench: { ...defaults.stateByBench, ...(raw.stateByBench || {}) },
    waveformByBench: {
      ...defaults.waveformByBench,
      ...(raw.waveformByBench || {}),
    },
  };
}

export async function writeLabPersistedState(
  next: LabPersistedState,
): Promise<void> {
  await pudding.state.write({
    expectedVersion: pudding.state.read().version,
    data: {
      lab: sanitizeJson(next),
    },
  });
}

export function describeLabSnapshot(lab = readLabPersistedState()): JSONValue {
  const locale = getLocale();
  const bench = getBenchById(lab.activeBenchId);
  const params = lab.paramsByBench[bench.id] ?? bench.getDefaultParams();
  const state =
    lab.stateByBench[bench.id] ?? bench.createInitialState(params);
  const energy = bench.computeEnergy(state, params);
  const telemetry = bench.computeTelemetry(state, params);

  return sanitizeJson({
    activeBenchId: bench.id,
    availableBenches: BENCH_REGISTRY.map((b) => ({
      id: b.id,
      title: loc(b.title, locale),
      formula: b.formulaBadge,
      presets: b.presets.map((p) => ({
        id: p.id,
        title: loc(p.title, locale),
        params: p.params,
      })),
    })),
    running: lab.running,
    slowMotion: lab.slowMotion,
    showVectors: lab.showVectors,
    params,
    energy: {
      kineticJ: Number(energy.kinetic.toFixed(2)),
      potentialJ: Number(energy.potential.toFixed(2)),
      thermalJ: Number(energy.thermal.toFixed(2)),
      totalJ: Number(energy.total.toFixed(2)),
    },
    telemetry: telemetry.map((item) => ({
      id: item.id,
      label: loc(item.label, locale),
      symbol: item.symbol,
      value: `${item.value}${item.unit ? " " + item.unit : ""}`,
    })),
    aiSummary: bench.summarizeForAI(state, params, locale),
  });
}

function registerLabInterfaces() {
  return [
    pudding.defineInterface({
      name: "readLab",
      description: t("descReadLab"),
      input: z.object({}).strict(),
      run: () => describeLabSnapshot(),
    }),
    pudding.defineInterface({
      name: "configureExperiment",
      description: t("descConfigureExperiment"),
      input: z
        .object({
          benchId: z.string().optional(),
          params: z.record(z.string(), z.number()).optional(),
          autoPlay: z.boolean().optional(),
          showVectors: z.boolean().optional(),
        })
        .strict(),
      run: async (input) => {
        const current = readLabPersistedState();
        const targetBench = getBenchById(
          input.benchId || current.activeBenchId,
        );
        const oldParams =
          current.paramsByBench[targetBench.id] ??
          targetBench.getDefaultParams();
        const nextParams = { ...oldParams };

        if (input.params) {
          for (const spec of targetBench.paramSpecs) {
            if (typeof input.params[spec.key] === "number") {
              const clamped = Math.max(
                spec.min,
                Math.min(spec.max, input.params[spec.key]),
              );
              nextParams[spec.key] = clamped;
            }
          }
        }

        const freshState = targetBench.createInitialState(nextParams);
        const nextLab: LabPersistedState = {
          ...current,
          activeBenchId: targetBench.id,
          running: input.autoPlay ?? false,
          showVectors: input.showVectors ?? current.showVectors,
          paramsByBench: {
            ...current.paramsByBench,
            [targetBench.id]: nextParams,
          },
          stateByBench: {
            ...current.stateByBench,
            [targetBench.id]: freshState,
          },
          waveformByBench: {
            ...current.waveformByBench,
            [targetBench.id]: [
              targetBench.sampleWaveform(freshState, nextParams),
            ],
          },
        };
        await writeLabPersistedState(nextLab);
        return describeLabSnapshot(nextLab);
      },
    }),
    pudding.defineInterface({
      name: "loadPreset",
      description: t("descLoadPreset"),
      input: z
        .object({
          benchId: z.string().optional(),
          presetId: z.string(),
          autoPlay: z.boolean().optional(),
        })
        .strict(),
      run: async (input) => {
        const current = readLabPersistedState();
        const targetBench = getBenchById(
          input.benchId || current.activeBenchId,
        );
        const preset =
          targetBench.presets.find((p) => p.id === input.presetId) ??
          targetBench.presets[0];
        const nextParams = { ...preset.params };
        const freshState = targetBench.createInitialState(nextParams);

        const nextLab: LabPersistedState = {
          ...current,
          activeBenchId: targetBench.id,
          running: input.autoPlay ?? true,
          paramsByBench: {
            ...current.paramsByBench,
            [targetBench.id]: nextParams,
          },
          stateByBench: {
            ...current.stateByBench,
            [targetBench.id]: freshState,
          },
          waveformByBench: {
            ...current.waveformByBench,
            [targetBench.id]: [
              targetBench.sampleWaveform(freshState, nextParams),
            ],
          },
        };
        await writeLabPersistedState(nextLab);
        return describeLabSnapshot(nextLab);
      },
    }),
    pudding.defineInterface({
      name: "controlSimulation",
      description: t("descControlSimulation"),
      input: z
        .object({
          action: z.enum(["play", "pause", "reset", "step"]),
          slowMotion: z.boolean().optional(),
        })
        .strict(),
      run: async (input) => {
        const current = readLabPersistedState();
        const bench = getBenchById(current.activeBenchId);
        const params =
          current.paramsByBench[bench.id] ?? bench.getDefaultParams();
        let nextState =
          current.stateByBench[bench.id] ?? bench.createInitialState(params);
        let nextWave = current.waveformByBench[bench.id] ?? [];
        let running = current.running;

        if (input.action === "reset") {
          nextState = bench.createInitialState(params);
          nextWave = [bench.sampleWaveform(nextState, params)];
          running = false;
        } else if (input.action === "play") {
          if (bench.isCompleted(nextState, params)) {
            nextState = bench.createInitialState(params);
            nextWave = [bench.sampleWaveform(nextState, params)];
          }
          running = true;
        } else if (input.action === "pause") {
          running = false;
        } else if (input.action === "step") {
          running = false;
          const res = bench.stepPhysics(nextState, params, 0.02);
          nextState = res.state;
          nextWave = [
            ...nextWave.slice(-60),
            bench.sampleWaveform(nextState, params),
          ];
        }

        const nextLab: LabPersistedState = {
          ...current,
          running,
          slowMotion: input.slowMotion ?? current.slowMotion,
          stateByBench: {
            ...current.stateByBench,
            [bench.id]: nextState,
          },
          waveformByBench: {
            ...current.waveformByBench,
            [bench.id]: nextWave,
          },
        };
        await writeLabPersistedState(nextLab);
        return describeLabSnapshot(nextLab);
      },
    }),
  ];
}

let activeInterfaces = registerLabInterfaces();
pudding.locale.subscribe(() => {
  activeInterfaces.forEach((off) => off());
  activeInterfaces = registerLabInterfaces();
});
