import type { PlayerRole } from "./types";

let soundEnabled = true;
let audioCtx: AudioContext | null = null;
let masterBus: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(val: boolean): void {
  soundEnabled = val;
}

function getAudioGraph(): { ctx: AudioContext; out: AudioNode } | null {
  if (!soundEnabled || typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();

      // Noir Studio Mastering Bus: High-Shelf Presence + Punchy Dynamics Compressor
      const presence = audioCtx.createBiquadFilter();
      presence.type = "highshelf";
      presence.frequency.value = 2200;
      presence.gain.value = 5.5;

      const comp = audioCtx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 10;
      comp.ratio.value = 3.5;
      comp.attack.value = 0.002;
      comp.release.value = 0.14;

      masterBus = audioCtx.createGain();
      masterBus.gain.value = 0.92;

      masterBus.connect(presence);
      presence.connect(comp);
      comp.connect(audioCtx.destination);
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
    return { ctx: audioCtx, out: masterBus || audioCtx.destination };
  } catch {
    return null;
  }
}

function getWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer;
  }
  const length = ctx.sampleRate * 1.5;
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buf;
  return buf;
}

function playTone(
  freqStart: number,
  freqEnd: number,
  duration: number,
  type: OscillatorType = "triangle",
  gainPeak = 0.2,
  delay = 0,
) {
  const g = getAudioGraph();
  if (!g) return;
  const { ctx, out } = g;
  const now = ctx.currentTime + delay;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, freqStart), now);
  if (freqEnd !== freqStart) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, freqEnd),
      now + duration,
    );
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(out);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playNoiseBurst(
  duration: number,
  filterType: BiquadFilterType,
  freqStart: number,
  freqEnd: number,
  qValue: number,
  gainPeak: number,
  delay = 0,
) {
  const g = getAudioGraph();
  if (!g) return;
  const { ctx, out } = g;
  const now = ctx.currentTime + delay;

  const src = ctx.createBufferSource();
  src.buffer = getWhiteNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.Q.value = qValue;
  filter.frequency.setValueAtTime(Math.max(40, freqStart), now);
  if (freqEnd !== freqStart) {
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(40, freqEnd),
      now + duration,
    );
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(out);

  src.start(now);
  src.stop(now + duration + 0.02);
}

/**
 * Crisp metallic folder/target click when selecting seats or toggling UI.
 */
export function playSelectSound(): void {
  playNoiseBurst(0.025, "bandpass", 3400, 1800, 2.2, 0.24, 0);
  playTone(1350, 2200, 0.04, "sine", 0.16, 0);
}

/**
 * Dossier deal & wax seal stamp + Noir Vibraphone Cm9 mystery chord.
 */
export function playDealSound(): void {
  // 4 rapid crisp paper dossier slides
  for (let i = 0; i < 4; i++) {
    const d = i * 0.055;
    playNoiseBurst(0.042, "bandpass", 2800 + i * 280, 1400, 1.8, 0.28, d);
    playTone(680 + i * 95, 1180 + i * 110, 0.048, "triangle", 0.14, d);
  }
  // Wax seal thump + Noir vibraphone Cm9 chord (C5, Eb5, G5, Bb5, D6)
  playTone(130, 48, 0.18, "sine", 0.35, 0.24);
  const noirNotes = [523.25, 622.25, 783.99, 932.33, 1174.66];
  noirNotes.forEach((n, idx) => {
    playTone(n, n * 1.002, 0.42, "sine", 0.13, 0.24 + idx * 0.035);
    playTone(n * 2, n * 2, 0.22, "triangle", 0.05, 0.24 + idx * 0.035);
  });
}

/**
 * Vintage mechanical typewriter burst + carriage bell ding when a testimony is submitted.
 */
export function playSpeakSound(): void {
  // 3 rapid mechanical typewriter strikes
  for (let i = 0; i < 3; i++) {
    const d = i * 0.042;
    playNoiseBurst(0.022, "highpass", 2600, 4200, 1.6, 0.28, d);
    playTone(920 + i * 140, 460, 0.03, "square", 0.1, d);
  }
  // Crisp brass desk bell ding!
  playTone(1567.98, 1567.98, 0.26, "sine", 0.22, 0.13);
  playTone(3135.96, 3135.96, 0.15, "triangle", 0.08, 0.13);
}

/**
 * Tense low heartbeat pulse + radar target lock-on double-beep when casting an accusation vote.
 */
export function playVoteSound(): void {
  // Low heartbeat lub-dub
  playTone(95, 44, 0.11, "sine", 0.38, 0);
  playTone(85, 40, 0.14, "sine", 0.32, 0.11);
  // Crisp radar reticle lock-on double-pip
  playTone(1318.5, 1318.5, 0.065, "sine", 0.22, 0.04);
  playTone(1760.0, 1760.0, 0.11, "triangle", 0.26, 0.12);
  playNoiseBurst(0.03, "bandpass", 3800, 2600, 2.5, 0.18, 0.12);
}

/**
 * Suspenseful rising dual-tone alert when a tie-break PK defense round is triggered.
 */
export function playPkTieSound(): void {
  const notes = [440, 554.37, 659.25, 880];
  notes.forEach((n, idx) => {
    playTone(n, n * 1.03, 0.14, "sawtooth", 0.15, idx * 0.065);
    playTone(n * 1.5, n * 1.5, 0.12, "triangle", 0.12, idx * 0.065);
  });
}

/**
 * Heavy iron stamp slam impact + dramatic role reveal chord when a suspect is eliminated.
 */
export function playEliminateSound(eliminatedRole: PlayerRole | null): void {
  // Stage 1: Heavy iron stamp slam (sub-bass drop + crisp paper/wood crack)
  playNoiseBurst(0.06, "highpass", 1800, 4800, 1.4, 0.55, 0);
  playNoiseBurst(0.28, "bandpass", 900, 180, 1.2, 0.48, 0.01);
  playTone(180, 34, 0.34, "sawtooth", 0.45, 0);
  playTone(110, 28, 0.38, "sine", 0.5, 0);

  // Stage 2: Role reveal stinger
  if (eliminatedRole === "Undercover") {
    // Caught an Undercover! Bright triumphant detective breakthrough chord
    const notes = [587.33, 739.99, 880, 1174.66];
    notes.forEach((n, idx) => {
      playTone(n, n, 0.36, "triangle", 0.2, 0.16 + idx * 0.045);
      playTone(n * 2, n * 2, 0.22, "sine", 0.09, 0.16 + idx * 0.045);
    });
  } else {
    // Eliminated an innocent Civilian! Tense noir minor suspense chord
    const notes = [440, 523.25, 659.25, 415.3];
    notes.forEach((n, idx) => {
      playTone(n, n * 0.99, 0.38, "sawtooth", 0.14, 0.16 + idx * 0.055);
      playTone(n, n, 0.42, "triangle", 0.18, 0.16 + idx * 0.055);
    });
  }
}

/**
 * Full cinematic finale fanfare when Civilians or Undercovers win the game.
 */
export function playVictorySound(winner: PlayerRole | null): void {
  // Stamp impact first
  playNoiseBurst(0.055, "highpass", 2000, 4500, 1.5, 0.48, 0);
  playTone(150, 38, 0.28, "sine", 0.42, 0);

  const notes =
    winner === "Civilian"
      ? [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98] // Bright C Major 9th fanfare
      : [440, 523.25, 659.25, 830.61, 987.77, 1318.5]; // Sleek Noir Spy Master chord

  notes.forEach((n, idx) => {
    const d = 0.12 + idx * 0.075;
    const dur = idx === notes.length - 1 ? 0.65 : 0.22;
    playTone(n, n, dur, "triangle", 0.24, d);
    playTone(n * 1.5, n * 1.5, dur * 0.8, "sine", 0.1, d);
    playTone(n * 2, n * 2, dur * 0.6, "sawtooth", 0.07, d);
  });
}
