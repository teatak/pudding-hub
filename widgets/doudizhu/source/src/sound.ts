import type { ComboType } from "./types";

let audioCtx: AudioContext | null = null;
let masterBus: GainNode | null = null;
let soundEnabled = true;

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

function getContext(): { ctx: AudioContext; out: AudioNode } | null {
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
  if (!masterBus && audioCtx) {
    // High-shelf presence boost (+5dB above 2.4kHz) + compressor for crisp, bright clarity
    const shelf = audioCtx.createBiquadFilter();
    shelf.type = "highshelf";
    shelf.frequency.value = 2400;
    shelf.gain.value = 5.5;

    const comp = audioCtx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.002;
    comp.release.value = 0.12;

    masterBus = audioCtx.createGain();
    masterBus.gain.value = 0.95;

    masterBus.connect(shelf);
    shelf.connect(comp);
    comp.connect(audioCtx.destination);
  }
  return audioCtx && masterBus ? { ctx: audioCtx, out: masterBus } : null;
}

function makeDistortionCurve(amount = 40): Float32Array<ArrayBuffer> {
  const n = 8192;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  const k = amount;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

function playBrightTone(
  ctx: AudioContext,
  out: AudioNode,
  freq: number,
  endFreq: number,
  duration: number,
  startTime: number,
  gainPeak = 0.18,
  type: OscillatorType = "triangle",
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (endFreq !== freq) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(endFreq, 24),
      startTime + duration,
    );
  }
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);
  osc.connect(gain);
  gain.connect(out);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

function playCrispNoise(
  ctx: AudioContext,
  out: AudioNode,
  duration: number,
  startTime: number,
  startFreq: number,
  endFreq: number,
  gainPeak = 0.25,
  filterType: BiquadFilterType = "bandpass",
  q = 1.2,
  distort = false,
) {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const env = Math.pow(1 - i / length, 0.55);
    data[i] = (Math.random() * 2 - 1) * env;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.Q.setValueAtTime(q, startTime);
  filter.frequency.setValueAtTime(startFreq, startTime);
  if (endFreq !== startFreq) {
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(endFreq, 60),
      startTime + duration,
    );
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  src.connect(filter);
  if (distort) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDistortionCurve(65);
    shaper.oversample = "2x";
    filter.connect(shaper);
    shaper.connect(gain);
  } else {
    filter.connect(gain);
  }
  gain.connect(out);
  src.start(startTime);
  src.stop(startTime + duration + 0.01);
}

/**
 * Crisp card-tick sound when selecting/deselecting a card in hand.
 */
export function playSelectSound(): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;
  playCrispNoise(ctx, out, 0.022, now, 4200, 2800, 0.16, "highpass", 0.9);
  playBrightTone(ctx, out, 1350, 1950, 0.022, now, 0.09, "sine");
}

/**
 * Rapid crisp card-riffle sound when dealing a new round.
 */
export function playDealSound(): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;
  for (let i = 0; i < 8; i++) {
    const t = now + i * 0.036;
    playCrispNoise(
      ctx,
      out,
      0.028,
      t,
      3400 + i * 240,
      2000,
      0.16,
      "bandpass",
      1.1,
    );
    playBrightTone(ctx, out, 900 + i * 95, 580, 0.024, t, 0.07, "triangle");
  }
}

/**
 * Sound effect for Call Landlord, Rob Landlord, or No Call / No Rob / Pass.
 */
export function playBidSound(
  kind: "call" | "rob" | "no_call" | "no_rob" | "pass",
): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  if (kind === "call") {
    // Bright rising triad (G5 -> B5 -> D6)
    const notes = [783.99, 987.77, 1174.66];
    notes.forEach((f, idx) => {
      const t = now + idx * 0.065;
      playBrightTone(ctx, out, f, f, 0.16, t, 0.18, "triangle");
      playBrightTone(ctx, out, f * 2, f * 2, 0.1, t, 0.06, "sine");
    });
    return;
  }

  if (kind === "rob") {
    // Urgent high-energy 4-note brass/bell sting (A5 -> C#6 -> E6 -> A6)
    const notes = [880, 1108.73, 1318.51, 1760];
    notes.forEach((f, idx) => {
      const t = now + idx * 0.055;
      playBrightTone(ctx, out, f, f * 1.01, 0.16, t, 0.19, "sawtooth");
      playBrightTone(ctx, out, f * 1.5, f * 1.5, 0.12, t, 0.08, "triangle");
    });
    playCrispNoise(ctx, out, 0.05, now, 4500, 2200, 0.14, "highpass", 1.0);
    return;
  }

  // Pass / No call / No rob: crisp double woodblock pop (clear mid-high percussion)
  playBrightTone(ctx, out, 760, 480, 0.045, now, 0.14, "triangle");
  playBrightTone(ctx, out, 580, 360, 0.055, now + 0.048, 0.12, "triangle");
  playCrispNoise(ctx, out, 0.02, now, 2800, 1600, 0.1, "bandpass", 1.4);
}

/**
 * Sound effect for playing a card combination on the felt table.
 */
export function playComboSound(comboType: ComboType): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  if (comboType === "rocket") {
    // Stage 1: Supersonic jet/missile launch whistle (0.00s -> 0.18s)
    playBrightTone(ctx, out, 380, 2600, 0.18, now, 0.2, "sawtooth");
    playBrightTone(ctx, out, 570, 3900, 0.18, now, 0.14, "triangle");
    playCrispNoise(ctx, out, 0.18, now, 1200, 7200, 0.22, "bandpass", 1.8);

    // Stage 2: Sky-shattering twin detonation crack + broadband roar (0.17s)
    const impact = now + 0.17;
    playCrispNoise(ctx, out, 0.06, impact, 4800, 1800, 0.48, "highpass", 1.2, true);
    playCrispNoise(ctx, out, 0.55, impact, 8500, 420, 0.42, "lowpass", 2.2, true);
    playCrispNoise(ctx, out, 0.28, impact + 0.09, 5600, 900, 0.3, "bandpass", 1.1, true);

    // Punchy upper-bass + mid-range body (audible on all speakers)
    playBrightTone(ctx, out, 360, 48, 0.42, impact, 0.36, "sawtooth");
    playBrightTone(ctx, out, 220, 42, 0.45, impact, 0.34, "square");

    // Golden shockwave fanfare chord
    const fanfare = [1046.5, 1318.51, 1567.98, 2093];
    fanfare.forEach((f, i) => {
      playBrightTone(
        ctx,
        out,
        f,
        f,
        0.32,
        impact + 0.06 + i * 0.035,
        0.14,
        "sawtooth",
      );
    });
    return;
  }

  if (comboType === "bomb") {
    // Stage 1: Fast incoming whistle + fuse spark (0.00s -> 0.09s)
    playBrightTone(ctx, out, 2400, 340, 0.09, now, 0.18, "sawtooth");
    playCrispNoise(ctx, out, 0.08, now, 5200, 2400, 0.18, "bandpass", 2.0);

    // Stage 2: Sharp explosive crack + distorted broadband blast (0.08s)
    const bang = now + 0.08;
    // Ultra-crisp high-frequency snap transient so it never sounds muffled
    playCrispNoise(ctx, out, 0.045, bang, 3600, 1400, 0.5, "highpass", 1.4, true);
    // Sweeping resonant lowpass from 8000Hz down to 360Hz with waveshaper grit
    playCrispNoise(ctx, out, 0.46, bang, 8200, 360, 0.4, "lowpass", 2.4, true);
    // Secondary crackle tail
    playCrispNoise(ctx, out, 0.22, bang + 0.08, 4800, 1100, 0.26, "bandpass", 1.3, true);

    // Mid-bass & harmonic punch (180Hz-340Hz down to 50Hz so laptop speakers punch hard)
    playBrightTone(ctx, out, 340, 52, 0.35, bang, 0.34, "sawtooth");
    playBrightTone(ctx, out, 190, 44, 0.38, bang, 0.32, "square");

    // Bright brass impact sting (G5 + D6)
    playBrightTone(ctx, out, 783.99, 783.99, 0.2, bang + 0.02, 0.14, "sawtooth");
    playBrightTone(ctx, out, 1174.66, 1174.66, 0.24, bang + 0.04, 0.14, "triangle");
    return;
  }

  if (comboType.startsWith("airplane")) {
    // Jet/propeller high-clarity sweep + bright ascending chord
    playCrispNoise(ctx, out, 0.24, now, 900, 5400, 0.22, "bandpass", 1.8);
    const notes = [659.25, 830.61, 987.77, 1318.51];
    notes.forEach((f, idx) => {
      const t = now + idx * 0.045;
      playBrightTone(ctx, out, f, f * 1.02, 0.16, t, 0.16, "sawtooth");
      playBrightTone(ctx, out, f * 2, f * 2, 0.1, t, 0.07, "sine");
    });
    return;
  }

  if (comboType === "straight" || comboType === "pair_straight") {
    // Sparkling cascading glissando + crisp card riffle
    const scale = [587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
    scale.forEach((f, idx) => {
      const t = now + idx * 0.032;
      playBrightTone(ctx, out, f, f, 0.12, t, 0.13, "triangle");
      playBrightTone(ctx, out, f * 2, f * 2, 0.08, t, 0.06, "sine");
    });
    playCrispNoise(ctx, out, 0.16, now, 3800, 5800, 0.16, "bandpass", 1.2);
    return;
  }

  // Crisp casino poker card snap on felt (high-frequency flick + bright slap)
  playCrispNoise(ctx, out, 0.025, now, 4200, 2200, 0.26, "highpass", 1.1);
  playCrispNoise(ctx, out, 0.048, now + 0.008, 2600, 900, 0.24, "bandpass", 1.0);
  playBrightTone(ctx, out, 880, 290, 0.055, now, 0.18, "triangle");

  if (comboType !== "single") {
    // Extra crisp double-snap & harmonic accent for pairs, triples, and four-with-two
    playCrispNoise(
      ctx,
      out,
      0.035,
      now + 0.032,
      3600,
      1600,
      0.22,
      "highpass",
      1.1,
    );
    playBrightTone(ctx, out, 1174.66, 659.25, 0.075, now + 0.025, 0.14, "triangle");
  }
}

/**
 * Bright celebratory victory fanfare.
 */
export function playFinishSound(): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;
  const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
  chord.forEach((freq, i) => {
    const t = now + i * 0.06;
    playBrightTone(ctx, out, freq, freq, 0.28, t, 0.17, "triangle");
    playBrightTone(ctx, out, freq * 2, freq * 2, 0.18, t, 0.07, "sine");
  });
}
