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
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.0015);
  gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  src.start(startTime);
  src.stop(startTime + duration + 0.01);
}

/**
 * Crisp, tight porcelain/agate stone click on the board (清脆利落的云子落盘声，无拖沓滑音).
 */
export function playStoneSound(color: "Black" | "White"): void {
  const audio = getAudio();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  const isBlack = color === "Black";

  // 1. Ultra-tight porcelain/slate contact click (8ms high-Q resonant impulse)
  playNoise(
    ctx,
    out,
    0.009,
    now,
    isBlack ? 2450 : 2750,
    isBlack ? 1950 : 2200,
    0.34,
    "bandpass",
    3.2,
  );
  playNoise(
    ctx,
    out,
    0.006,
    now,
    4600,
    3200,
    0.18,
    "highpass",
    1.4,
  );

  // 2. Short, solid board thud (22ms fast decay, gives weight without any synth "boing")
  playTone(
    ctx,
    out,
    isBlack ? 250 : 275,
    isBlack ? 95 : 108,
    0.024,
    now,
    0.28,
    "sine",
  );

  // 3. Crisp agate/shell ring transient (14ms fixed harmonic)
  playTone(
    ctx,
    out,
    isBlack ? 1180 : 1320,
    isBlack ? 1180 : 1320,
    0.015,
    now,
    0.11,
    "triangle",
  );
}

/**
 * Subtle, clean micro-tick for UI button toggles.
 */
export function playTapSound(): void {
  const audio = getAudio();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;
  playTone(ctx, out, 1046.5, 1046.5, 0.018, now, 0.07, "sine");
}

/**
 * Crisp two-note chime when a player confirms readiness (kept as approved).
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
 * Clean, pure crystal chime beep for countdown (3, 2, 1) — no woodblock/wooden-fish knock!
 */
export function playCountdownTickSound(secondsLeft = 3): void {
  const audio = getAudio();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;
  const freq = secondsLeft === 1 ? 987.77 : 783.99; // B5 on final second, G5 on 3 & 2
  playTone(ctx, out, freq, freq, 0.095, now, 0.13, "sine");
  playTone(ctx, out, freq * 2, freq * 2, 0.06, now, 0.035, "triangle");
}

/**
 * Resonant pentatonic cadence when the match begins (kept as approved).
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
 * Celebratory Oriental pentatonic fanfare when Five-in-a-Row is achieved (kept as approved).
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
 * Pure, in-tune pentatonic resolution when a player resigns or the match draws.
 */
export function playEndSound(kind: "resign" | "draw"): void {
  const audio = getAudio();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;
  const notes =
    kind === "resign"
      ? [880, 659.25, 587.33] // A5 -> E5 -> D5 clean descending triad
      : [523.25, 587.33, 783.99]; // C5 -> D5 -> G5 calm neutral resolution
  notes.forEach((f, i) => {
    const t = now + i * 0.075;
    playTone(ctx, out, f, f, 0.2, t, 0.14, "triangle");
    playTone(ctx, out, f * 2, f * 2, 0.12, t, 0.04, "sine");
  });
}
