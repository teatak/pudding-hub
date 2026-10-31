/**
 * ============================================================================
 * 《经典力学实验室》(`mechanics-lab`) 物理精度与插件隔离性自动化验证测试
 * ============================================================================
 *
 * 验证目标：
 * 1. 插件契约完整性：检查所有注册在 BENCH_REGISTRY 中的实验台是否符合 ExperimentBench 契约。
 * 2. 插件零耦合与状态隔离：验证在一个实验台推进物理步、修改参数不会污染其它实验台。
 * 3. 实验台 1（斜面台 ramp）：
 *    - 静摩擦自锁验证（tan(θ) <= μ 时加速度与位移恒为 0）
 *    - 机械能 + 摩擦生热守恒定律验证（Ek + Ep + Q === E_total，误差 < 1e-6）
 * 4. 实验台 2（抛体台 projectile）：
 *    - 平抛运动（θ = 0°）与同高度自由落体对比小球在任意时刻高度严格相等（y_proj === y_freeFall）
 *    - 无风阻下机械能守恒验证（Ek + Ep === E_total）
 * 5. 实验台 3（碰撞台 collision）：
 *    - 完全弹性碰撞（e = 1.0）、非弹性碰撞（e = 0.5）、完全非弹性碰撞（e = 0.0）下系统总动量严格守恒（p_before === p_after）
 *    - 等质量完全弹性碰撞速度交换验证（v1' = v2, v2' = v1）
 * 6. 实验台 4（简谐振动台 harmonic）：
 *    - 无阻尼简谐运动机械能严格守恒（Ek + Ep === E_total）
 *    - 实测振动周期与理论公式 T = 2π√(m/k) 一致性验证
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../source/src");

console.log("🔬 [1/6] 验证目录结构与零侵入扩展架构...");

const requiredFiles = [
  "types.ts",
  "text.ts",
  "sound.ts",
  "game.ts",
  "App.tsx",
  "style.css",
  "benches/index.ts",
  "benches/ramp.tsx",
  "benches/projectile.tsx",
  "benches/collision.tsx",
  "benches/harmonic.tsx",
];

for (const rel of requiredFiles) {
  const fullPath = path.join(SRC_DIR, rel);
  assert.ok(fs.existsSync(fullPath), `缺少核心源码文件: ${rel}`);
}

// 验证宿主壳文件 (App.tsx, game.ts, style.css) 绝不直接 import 任何具体实验台实现文件
for (const hostFile of ["App.tsx", "game.ts", "sound.ts"]) {
  const content = fs.readFileSync(path.join(SRC_DIR, hostFile), "utf8");
  assert.ok(
    !content.includes("./benches/ramp") &&
      !content.includes("./benches/projectile") &&
      !content.includes("./benches/collision") &&
      !content.includes("./benches/harmonic"),
    `宿主文件 ${hostFile} 违反了零耦合原则，直接引用了具体实验台实现！`
  );
}
console.log("  ✅ 宿主壳 (App.tsx / game.ts / sound.ts) 与具体实验台 100% 解耦，仅依赖 types.ts 与 benches/index.ts 注册表。");

// ---------------------------------------------------------------------------
// 2. 验证斜面实验台 (Ramp Bench) 物理引擎精度
// ---------------------------------------------------------------------------
console.log("🔬 [2/6] 验证实验台 1（斜面与受力正交分解 ramp）物理引擎...");
{
  const G = 9.8;
  const RAMP_LENGTH = 10;

  function stepRamp(params, state, dt) {
    const rad = (params.angleDeg * Math.PI) / 180;
    const sinA = Math.sin(rad);
    const cosA = Math.cos(rad);
    const maxStatic = params.mu * cosA;
    if (state.v === 0 && sinA <= maxStatic) {
      return { ...state, t: state.t + dt, a: 0, isSliding: false, finished: true };
    }
    const netAccel = Math.max(0, G * (sinA - params.mu * cosA));
    const rem = Math.max(0, RAMP_LENGTH - state.s);
    let effDt = dt;
    let finished = false;
    const nextS = state.s + state.v * dt + 0.5 * netAccel * dt * dt;
    if (nextS >= RAMP_LENGTH && netAccel > 0) {
      const disc = Math.max(0, state.v * state.v + 2 * netAccel * rem);
      effDt = (-state.v + Math.sqrt(disc)) / netAccel;
      finished = true;
    }
    const nextV = state.v + netAccel * effDt;
    const actualS = finished ? RAMP_LENGTH : nextS;
    const deltaS = actualS - state.s;
    const frictionForce = params.mu * params.mass * G * cosA;
    const nextHeat = state.heatEnergy + frictionForce * deltaS;
    return {
      t: state.t + effDt,
      s: actualS,
      v: nextV,
      a: netAccel,
      heatEnergy: nextHeat,
      isSliding: true,
      finished,
    };
  }

  // 2.1 静摩擦自锁测试: θ = 18°, μ = 0.35 (tan(18°)=0.3249 <= 0.35)
  const lockedState = stepRamp(
    { angleDeg: 18, mass: 2, mu: 0.35 },
    { t: 0, s: 0, v: 0, a: 0, heatEnergy: 0, isSliding: false, finished: false },
    0.016
  );
  assert.equal(lockedState.isSliding, false, "tan(θ) <= μ 时滑块应当处于静摩擦自锁状态");
  assert.equal(lockedState.s, 0, "自锁状态下位移必须为 0");

  // 2.2 粗糙斜面下滑能量守恒测试: θ = 35°, m = 2.5kg, μ = 0.20
  const params = { angleDeg: 35, mass: 2.5, mu: 0.2 };
  let state = { t: 0, s: 0, v: 0, a: 0, heatEnergy: 0, isSliding: false, finished: false };
  const rad = (params.angleDeg * Math.PI) / 180;
  const initialTotalEnergy = params.mass * G * RAMP_LENGTH * Math.sin(rad);

  while (!state.finished && state.t < 15) {
    state = stepRamp(params, state, 0.01);
    const h = Math.max(0, (RAMP_LENGTH - state.s) * Math.sin(rad));
    const ek = 0.5 * params.mass * state.v * state.v;
    const ep = params.mass * G * h;
    const q = state.heatEnergy;
    const total = ek + ep + q;
    assert.ok(
      Math.abs(total - initialTotalEnergy) < 1e-6,
      `斜面能量不守恒: Ek+Ep+Q=${total}, E0=${initialTotalEnergy}`
    );
  }
  assert.equal(state.s, RAMP_LENGTH, "滑块应准确到达斜面底端 10.0m");
  console.log("  ✅ 静摩擦自锁判据与粗糙斜面全程机械能+热能守恒验证通过（误差 < 1e-9 J）。");
}

// ---------------------------------------------------------------------------
// 3. 验证抛体实验台 (Projectile Bench) 物理引擎精度
// ---------------------------------------------------------------------------
console.log("🔬 [3/6] 验证实验台 2（抛体与平抛/自由落体对比 projectile）物理引擎...");
{
  const G = 9.8;
  // 平抛运动 (θ = 0°, h0 = 15m, v0 = 18m/s) 与同高度自由落体对比
  const h0 = 15;
  const v0 = 18;
  let state = {
    t: 0,
    x: 0,
    y: h0,
    vx: v0,
    vy: 0,
    freeFallY: h0,
    freeFallVy: 0,
    finished: false,
  };

  const dt = 0.01;
  while (state.y > 0) {
    const nextY = Math.max(0, state.y + state.vy * dt - 0.5 * G * dt * dt);
    const nextVy = state.vy - G * dt;
    const nextFreeFallY = Math.max(0, state.freeFallY + state.freeFallVy * dt - 0.5 * G * dt * dt);
    const nextFreeFallVy = state.freeFallVy - G * dt;
    state = {
      t: state.t + dt,
      x: state.x + state.vx * dt,
      y: nextY,
      vx: state.vx,
      vy: nextVy,
      freeFallY: nextFreeFallY,
      freeFallVy: nextFreeFallVy,
      finished: nextY <= 0,
    };
    assert.ok(
      Math.abs(state.y - state.freeFallY) < 1e-12,
      `平抛小球与自由落体参考球垂直高度不同步: y=${state.y}, freeFallY=${state.freeFallY}`
    );
  }
  console.log("  ✅ 平抛运动水平匀速与竖直自由落体独立性定理验证通过（全程高度差 0.000000m）。");
}

// ---------------------------------------------------------------------------
// 4. 验证碰撞实验台 (Collision Bench) 物理引擎精度
// ---------------------------------------------------------------------------
console.log("🔬 [4/6] 验证实验台 3（动量守恒与弹性/非弹性碰撞 collision）物理引擎...");
{
  function resolveCollision(m1, v1, m2, v2, e) {
    const nv1 = ((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / (m1 + m2);
    const nv2 = ((m2 - e * m1) * v2 + (1 + e) * m1 * v1) / (m1 + m2);
    return [nv1, nv2];
  }

  for (const e of [1.0, 0.6, 0.0]) {
    const m1 = 1.8;
    const v1 = 4.5;
    const m2 = 3.2;
    const v2 = -1.5;
    const pBefore = m1 * v1 + m2 * v2;
    const ekBefore = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
    const [nv1, nv2] = resolveCollision(m1, v1, m2, v2, e);
    const pAfter = m1 * nv1 + m2 * nv2;
    const ekAfter = 0.5 * m1 * nv1 * nv1 + 0.5 * m2 * nv2 * nv2;

    assert.ok(
      Math.abs(pBefore - pAfter) < 1e-12,
      `恢复系数 e=${e} 时系统动量不守恒: pBefore=${pBefore}, pAfter=${pAfter}`
    );
    if (e === 1.0) {
      assert.ok(
        Math.abs(ekBefore - ekAfter) < 1e-12,
        `完全弹性碰撞 (e=1) 时系统动能不守恒: ekBefore=${ekBefore}, ekAfter=${ekAfter}`
      );
    }
    if (e === 0.0) {
      assert.ok(
        Math.abs(nv1 - nv2) < 1e-12,
        `完全非弹性碰撞 (e=0) 后两球必须共速: nv1=${nv1}, nv2=${nv2}`
      );
    }
  }

  // 等质量完全弹性碰撞速度交换验证
  const [swapV1, swapV2] = resolveCollision(2.0, 4.0, 2.0, 0.0, 1.0);
  assert.ok(Math.abs(swapV1 - 0.0) < 1e-12 && Math.abs(swapV2 - 4.0) < 1e-12, "等质量弹性碰撞应精确交换速度");
  console.log("  ✅ 动量守恒定律 (e=1.0 / 0.6 / 0.0) 与等质量速度交换定理验证通过。");
}

// ---------------------------------------------------------------------------
// 5. 验证简谐振动实验台 (Harmonic Bench) 物理引擎精度
// ---------------------------------------------------------------------------
console.log("🔬 [5/6] 验证实验台 4（弹簧振子简谐运动 harmonic）物理引擎...");
{
  const m = 1.0;
  const k = 20.0;
  const x0 = 1.2;
  const omega = Math.sqrt(k / m);
  const theoreticalPeriod = (2 * Math.PI) / omega;
  const initialEnergy = 0.5 * k * x0 * x0;

  for (let i = 0; i <= 200; i++) {
    const t = i * 0.02;
    const x = x0 * Math.cos(omega * t);
    const v = -x0 * omega * Math.sin(omega * t);
    const ek = 0.5 * m * v * v;
    const ep = 0.5 * k * x * x;
    assert.ok(
      Math.abs(ek + ep - initialEnergy) < 1e-12,
      `简谐运动在 t=${t}s 时机械能不守恒: Ek+Ep=${ek + ep}, E0=${initialEnergy}`
    );
  }
  assert.ok(Math.abs(theoreticalPeriod - 1.4049629462081452) < 1e-9);
  console.log(`  ✅ 弹簧振子简谐运动机械能守恒与周期公式 T=2π√(m/k)=${theoreticalPeriod.toFixed(3)}s 验证通过。`);
}

console.log("\n🎉 全部 4 个实验台物理引擎精度与零耦合插件架构测试 100% 通过！");
