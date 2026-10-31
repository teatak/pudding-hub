let audioCtx: AudioContext | null = null;
let masterBus: GainNode | null = null;
let muted = false;

export function isSoundMuted(): boolean {
  return muted;
}

export function toggleSoundMute(): boolean {
  muted = !muted;
  return muted;
}

function getAudio(): { ctx: AudioContext; out: AudioNode } | null {
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
    if (!masterBus && audioCtx) {
      const shelf = audioCtx.createBiquadFilter();
      shelf.type = "highshelf";
      shelf.frequency.value = 2200;
      shelf.gain.value = 3.5;

      const comp = audioCtx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 10;
      comp.ratio.value = 3.5;
      comp.attack.value = 0.002;
      comp.release.value = 0.1;

      masterBus = audioCtx.createGain();
      masterBus.gain.value = 0.9;

      masterBus.connect(shelf);
      shelf.connect(comp);
      comp.connect(audioCtx.destination);
    }
    return audioCtx && masterBus ? { ctx: audioCtx, out: masterBus } : null;
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  out: AudioNode,
  startFreq: number,
  endFreq: number,
  duration: number,
  startTime: number,
  peakGain = 0.16,
  type: OscillatorType = "triangle",
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, startTime);
  if (endFreq !== startFreq) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(24, endFreq),
      startTime + duration,
    );
  }
  gain.gain.setValueAtTime(0.0008, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

  osc.connect(gain);
  gain.connect(out);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

function playNoise(
  ctx: AudioContext,
  out: AudioNode,
  duration: number,
  startTime: number,
  startFreq: number,
  endFreq: number,
  peakGain = 0.22,
  filterType: BiquadFilterType = "bandpass",
  q = 1.6,
) {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const env = Math.pow(1 - i / length, 0.7);
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
      Math.max(60, endFreq),
      startTime + duration,
    );
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  src.start(startTime);
  src.stop(startTime + duration + 0.01);
}

/**
 * Authentic Kaya wood board + Slate/Clamshell stone placement sound (榧木棋盘落子声).
 */
export function playStoneSound(color: "Black" | "White"): void {
  const audio = getAudio();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  const isBlack = color === "Black";
  const bodyFreq = isBlack ? 415 : 455;
  const bodyEnd = isBlack ? 168 : 188;
  const woodHarmonic = isBlack ? 890 : 960;

  // 1. Crisp slate/shell strike transient against lacquered wood
  playNoise(ctx, out, 0.018, now, 3600, 1750, 0.28, "bandpass", 1.5);
  playTone(ctx, out, 1850, 720, 0.022, now, 0.14, "sine");

  // 2. Warm Kaya wooden board hollow cavity resonance
  playTone(ctx, out, bodyFreq, bodyEnd, 0.085, now, 0.26, "triangle");
  playTone(ctx, out, woodHarmonic, bodyFreq, 0.048, now, 0.11, "sine");

  // 3. Subtle secondary micro-rebound as the convex stone settles
  playNoise(ctx, out, 0.012, now + 0.025, 2400, 1200, 0.09, "bandpass", 1.8);
  playTone(ctx, out, bodyFreq * 1.35, bodyFreq * 0.85, 0.032, now + 0.025, 0.06, "sine");
}

/**
 * Lighter wooden tap for replay step navigation or UI toggles.
 */
export function playTapSound(): void {
  const audio = getAudio();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;
  playNoise(ctx, out, 0.014, now, 3200, 1800, 0.15, "bandpass", 1.6);
  playTone(ctx, out, 680, 340, 0.038, now, 0.12, "triangle");
}

/**
 * Crisp two-note wooden chime when a player confirms readiness.
 */
export function playReadySound(): void {
  const audio = getAudio();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;
  playNoise(ctx, out, 0.015, now, 2800, 1600, 0.12, "bandpass", 1.5);
  playTone(ctx, out, 587.33, 587.33, 0.08, now, 0.14, "triangle");
  playTone(ctx, out, 880, 880, 0.13, now + 0.06, 0.16, "triangle");
}

/**
 * Subtle woodblock tick for each countdown second (3, 2, 1).
 */
export function playCountdownTickSound(): void {
  const audio = getAudio();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;
  playNoise(ctx, out, 0.014, now, 2400, 1400, 0.12, "bandpass", 2.0);
  playTone(ctx, out, 784, 520, 0.055, now, 0.13, "sine");
}

/**
 * Resonant wooden clapper + pentatonic cadence when the match begins.
 */
export function playGameStartSound(): void {
  const audio = getAudio();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;
  playNoise(ctx, out, 0.024, now, 3000, 1400, 0.2, "bandpass", 1.4);
  const notes = [587.33, 880, 1174.66];
  notes.forEach((f, idx) => {
    const t = now + idx * 0.055;
    playTone(ctx, out, f, f, 0.16, t, 0.15, "triangle");
    playTone(ctx, out, f * 2, f * 2, 0.1, t, 0.05, "sine");
  });
}

/**
 * Celebratory Oriental pentatonic fanfare when Five-in-a-Row is achieved.
 */
export function playWinSound(): void {
  const audio = getAudio();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;
  const scale = [523.25, 587.33, 659.25, 783.99, 1046.5, 1318.51];
  scale.forEach((f, i) => {
    const t = now + i * 0.06;
    playTone(ctx, out, f, f, 0.28, t, 0.16, "triangle");
    playTone(ctx, out, f * 2, f * 2, 0.18, t, 0.06, "sine");
  });
}

/**
 * Descending wooden cadence when a player resigns or the board draws.
 */
export function playEndSound(kind: "resign" | "draw"): void {
  const audio = getAudio();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;
  const notes = kind === "resign" ? [659.25, 440] : [523.25, 659.25];
  notes.forEach((f, i) => {
    const t = now + i * 0.085;
    playTone(ctx, out, f, f * 0.96, 0.16, t, 0.15, "triangle");
  });
}
