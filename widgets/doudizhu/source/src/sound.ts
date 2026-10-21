import type { ComboType } from "./types";

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

function getContext(): AudioContext | null {
  if (!soundEnabled || typeof window === "undefined") return null;
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
}

function playTone(
  ctx: AudioContext,
  freq: number,
  endFreq: number,
  duration: number,
  startTime: number,
  gainPeak = 0.12,
  type: OscillatorType = "triangle",
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (endFreq !== freq) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(endFreq, 20),
      startTime + duration,
    );
  }
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

function playNoiseBurst(
  ctx: AudioContext,
  duration: number,
  startTime: number,
  filterFreq: number,
  gainPeak = 0.14,
  filterType: BiquadFilterType = "bandpass",
) {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.45));
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreq, startTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainPeak, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(startTime);
  src.stop(startTime + duration);
}

/**
 * Crisp card-tick sound when selecting/deselecting a card in hand.
 */
export function playSelectSound(): void {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playNoiseBurst(ctx, 0.028, now, 2400, 0.08, "bandpass");
  playTone(ctx, 680, 420, 0.025, now, 0.06, "sine");
}

/**
 * Rapid card-riffle sound when dealing a new round.
 */
export function playDealSound(): void {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (let i = 0; i < 6; i++) {
    const t = now + i * 0.045;
    playNoiseBurst(ctx, 0.035, t, 1800 + i * 160, 0.09, "bandpass");
    playTone(ctx, 420 + i * 45, 300, 0.03, t, 0.04, "triangle");
  }
}

/**
 * Sound effect for Call Landlord, Rob Landlord, or No Call / No Rob / Pass.
 */
export function playBidSound(
  kind: "call" | "rob" | "no_call" | "no_rob" | "pass",
): void {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  if (kind === "call") {
    playTone(ctx, 523.25, 523.25, 0.11, now, 0.12, "triangle"); // C5
    playTone(ctx, 659.25, 659.25, 0.16, now + 0.09, 0.14, "triangle"); // E5
    return;
  }
  if (kind === "rob") {
    playTone(ctx, 587.33, 587.33, 0.09, now, 0.13, "sawtooth"); // D5
    playTone(ctx, 783.99, 783.99, 0.1, now + 0.08, 0.14, "sawtooth"); // G5
    playTone(ctx, 1046.5, 1046.5, 0.18, now + 0.16, 0.16, "triangle"); // C6
    return;
  }
  // Pass / No call / No rob: muted wood knock
  playTone(ctx, 240, 130, 0.08, now, 0.09, "sine");
}

/**
 * Sound effect for playing a card combination on the felt table.
 */
export function playComboSound(comboType: ComboType): void {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  if (comboType === "rocket" || comboType === "bomb") {
    // Deep explosion boom + shockwave noise
    playNoiseBurst(ctx, 0.38, now, 420, 0.26, "lowpass");
    playTone(ctx, 140, 32, 0.36, now, 0.24, "sawtooth");
    playTone(ctx, 90, 28, 0.4, now + 0.02, 0.22, "sine");
    return;
  }

  if (
    comboType === "straight" ||
    comboType === "pair_straight" ||
    comboType.startsWith("airplane")
  ) {
    // Sweeping whoosh + ascending chord
    playNoiseBurst(ctx, 0.18, now, 1600, 0.12, "bandpass");
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((f, idx) => {
      playTone(ctx, f, f * 1.04, 0.12, now + idx * 0.04, 0.09, "triangle");
    });
    return;
  }

  // Standard crisp card snap on felt
  playNoiseBurst(ctx, 0.055, now, 1500, 0.14, "bandpass");
  playTone(ctx, 360, 180, 0.06, now, 0.1, "triangle");
}

/**
 * Victory / round-finish fanfare.
 */
export function playFinishSound(): void {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const chord = [523.25, 659.25, 783.99, 1046.5];
  chord.forEach((freq, i) => {
    playTone(ctx, freq, freq, 0.24, now + i * 0.07, 0.13, "triangle");
  });
}
