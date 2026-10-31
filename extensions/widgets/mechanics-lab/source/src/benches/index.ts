/**
 * ============================================================================
 * 经典力学实验室 (Mechanics Lab) — 实验台插件注册中心 (`src/benches/index.ts`)
 * ============================================================================
 *
 * 【可维护性与扩展验证记录】
 * - Phase 1 初始注册了 `rampBench`（斜面）与 `projectileBench`（抛体）。
 * - Phase 2 扩展验证时，仅新建了 `collision.tsx` 与 `harmonic.tsx`，并在此注册表数组追加两项；
 *   `ramp.tsx`、`projectile.tsx`、`App.tsx` 与 `game.ts` 均保持 **0 行修改**！
 */

import type { ExperimentBench } from "../types";
import { rampBench } from "./ramp";
import { projectileBench } from "./projectile";
import { collisionBench } from "./collision";
import { harmonicBench } from "./harmonic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BENCH_REGISTRY: ExperimentBench<any, any>[] = [
  rampBench,
  projectileBench,
  collisionBench,
  harmonicBench,
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getBenchById(id: string): ExperimentBench<any, any> {
  return BENCH_REGISTRY.find((b) => b.id === id) ?? BENCH_REGISTRY[0];
}
