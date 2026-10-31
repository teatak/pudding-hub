/**
 * ============================================================================
 * 经典力学实验室 (Mechanics Lab) — Web Audio 物理声学合成引擎 (`src/sound.ts`)
 * ============================================================================
 * 将实验台触发的 `BenchSoundEvent` 映射为实时合成的物理声学反馈：
 * - `collision`：根据碰撞冲量强度合成钢球清脆敲击声或非弹性闷响；
 * - `launch`：抛体发射器气压弹射音效；
 * - `targetHit`：抛体命中靶心的清脆三和弦铃音；
 * - `equilibriumTick`：振子/单摆经过平衡位置时的精密节拍器滴答声；
 * - `uiClick`：切换实验台、单步定格或加载预设时的轻触反馈。
 */

import type { BenchSoundEvent } from "./types";

let audioCtx: AudioContext | null = null;
let muted = false;

export function isSoundMuted(): boolean {
  return muted;
}

export function toggleSoundMute(): boolean {
  muted = !muted;
  return muted;
}

function getCtx(): AudioContext | null {
  if (muted || typeof window === "undefined") return null;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) {
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function playPartial(
  ctx: AudioContext,
  freq: number,
  endFreq: number,
  duration: number,
  startTime: number,
  gainPeak: number,
  type: OscillatorType = "sine",
  attack = 0.001,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (endFreq !== freq) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(24, endFreq),
      startTime + duration,
    );
  }
  gain.gain.setValueAtTime(0.0005, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0005, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.008);
}

export function playUiClick(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  playPartial(ctx, 540, 490, 0.022, now, 0.09, "sine", 0.0005);
  playPartial(ctx, 1320, 1260, 0.01, now, 0.04, "triangle", 0.0004);
}

export function playBenchSoundEvent(ev: BenchSoundEvent): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  if (ev.kind === "collision") {
    const amp = Math.max(0.08, Math.min(0.35, ev.intensity * 0.25));
    // Modal steel/wood impact (1 : 2.42 : 4.38)
    playPartial(ctx, 320, 260, 0.045, now, amp, "sine", 0.0004);
    playPartial(ctx, 775, 740, 0.025, now, amp * 0.7, "triangle", 0.0004);
    playPartial(ctx, 1410, 1360, 0.014, now, amp * 0.45, "sine", 0.0003);
    return;
  }

  if (ev.kind === "launch") {
    playPartial(ctx, 220, 680, 0.085, now, 0.14, "triangle", 0.004);
    playPartial(ctx, 440, 960, 0.065, now + 0.01, 0.08, "sine", 0.004);
    return;
  }

  if (ev.kind === "targetHit") {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      playPartial(ctx, f, f, 0.22, now + idx * 0.045, 0.13, "triangle", 0.002);
    });
    return;
  }

  if (ev.kind === "equilibriumTick") {
    playPartial(ctx, 880, 880, 0.018, now, 0.06, "sine", 0.0005);
  }
}
