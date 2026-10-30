import type { WeaponId } from "./types";

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

      const presence = audioCtx.createBiquadFilter();
      presence.type = "highshelf";
      presence.frequency.value = 2400;
      presence.gain.value = 5.5;

      const comp = audioCtx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 10;
      comp.ratio.value = 4.0;
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
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.005);
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

export function playSelectSound(): void {
  playNoiseBurst(0.022, "bandpass", 3600, 2000, 2.2, 0.22, 0);
  playTone(1480, 2220, 0.038, "sine", 0.15, 0);
}

/**
 * Parachute wind rush + landing thud + metallic bolt rack.
 */
export function playDropSound(): void {
  playNoiseBurst(0.22, "bandpass", 1600, 420, 1.4, 0.34, 0);
  playTone(130, 42, 0.16, "sine", 0.38, 0.14);
  // Metallic weapon cocking double-clack
  playNoiseBurst(0.03, "highpass", 3200, 5200, 2.0, 0.28, 0.22);
  playTone(1850, 950, 0.035, "square", 0.12, 0.22);
  playNoiseBurst(0.035, "highpass", 3600, 4800, 2.0, 0.3, 0.28);
}

/**
 * Crisp two-step tactical boot footsteps.
 */
export function playMoveSound(): void {
  playNoiseBurst(0.04, "bandpass", 950, 420, 1.8, 0.24, 0);
  playTone(140, 55, 0.05, "sine", 0.2, 0);
  playNoiseBurst(0.04, "bandpass", 1100, 480, 1.8, 0.24, 0.08);
  playTone(155, 60, 0.05, "sine", 0.2, 0.08);
}

/**
 * Supply crate metallic latch + bright upgrade arpeggio.
 */
export function playLootSound(): void {
  playNoiseBurst(0.035, "highpass", 2800, 4600, 1.8, 0.28, 0);
  const notes = [587.33, 880, 1174.66, 1760];
  notes.forEach((n, idx) => {
    playTone(n, n * 1.01, 0.12, "triangle", 0.18, 0.04 + idx * 0.045);
  });
}

/**
 * Medical syringe hiss + restorative harmonic chord.
 */
export function playHealSound(): void {
  playNoiseBurst(0.12, "bandpass", 4200, 2400, 2.4, 0.18, 0);
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((n, idx) => {
    playTone(n, n, 0.22, "sine", 0.16, 0.05 + idx * 0.05);
  });
}

/**
 * Weapon-specific ballistic fire & explosion synthesizer.
 */
export function playAttackSound(
  weapon: WeaponId | "grenade" | "storm" | null,
): void {
  if (weapon === "grenade") {
    // Grenade whistle + heavy concussive explosion
    playTone(1200, 380, 0.14, "sine", 0.18, 0);
    playNoiseBurst(0.42, "lowpass", 1600, 140, 1.2, 0.65, 0.14);
    playTone(160, 28, 0.42, "sawtooth", 0.5, 0.14);
    playTone(95, 24, 0.46, "sine", 0.55, 0.14);
    return;
  }

  if (weapon === "sniper" || weapon === "awm") {
    // Piercing supersonic sniper crack + deep sub-bass punch + brass shell ping
    playNoiseBurst(0.05, "highpass", 2600, 6200, 1.5, 0.6, 0);
    playNoiseBurst(0.28, "bandpass", 1400, 240, 1.1, 0.52, 0.01);
    playTone(280, 36, 0.3, "sawtooth", 0.48, 0);
    playTone(120, 28, 0.34, "sine", 0.52, 0);
    // Brass shell casing hitting ground
    playTone(3520, 3320, 0.08, "sine", 0.14, 0.28);
    playTone(3720, 3520, 0.09, "sine", 0.12, 0.35);
    return;
  }

  if (weapon === "shotgun") {
    // Heavy close-quarters shotgun blast + pump rack
    playNoiseBurst(0.18, "bandpass", 1800, 280, 1.0, 0.58, 0);
    playTone(190, 38, 0.22, "sawtooth", 0.45, 0);
    playNoiseBurst(0.04, "highpass", 3000, 4800, 2.0, 0.26, 0.22);
    return;
  }

  // Default: Assault Rifle / SMG 3-round burst
  for (let i = 0; i < 3; i++) {
    const d = i * 0.065;
    playNoiseBurst(0.055, "bandpass", 2400, 520, 1.3, 0.42, d);
    playTone(240, 52, 0.065, "sawtooth", 0.32, d);
  }
}

/**
 * Elimination K.I.A impact stinger.
 */
export function playKillSound(
  weapon: WeaponId | "grenade" | "storm" | null,
): void {
  playAttackSound(weapon);
  // Crisp kill confirmation chime + sub impact
  playTone(880, 1318.5, 0.14, "triangle", 0.28, 0.22);
  playTone(1760, 1760, 0.24, "sine", 0.24, 0.29);
}

/**
 * "Winner Winner Chicken Dinner" triumphant brass & synth fanfare.
 */
export function playVictorySound(): void {
  playNoiseBurst(0.06, "highpass", 2200, 5000, 1.5, 0.45, 0);
  playTone(140, 36, 0.3, "sine", 0.45, 0);

  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093.0];
  notes.forEach((n, idx) => {
    const d = 0.1 + idx * 0.072;
    const dur = idx === notes.length - 1 ? 0.7 : 0.22;
    playTone(n, n, dur, "triangle", 0.25, d);
    playTone(n * 1.5, n * 1.5, dur * 0.8, "sine", 0.11, d);
    playTone(n * 0.5, n * 0.5, dur * 0.9, "sawtooth", 0.08, d);
  });
}
