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

export function isSoundMuted(): boolean {
  return !soundEnabled;
}

export function toggleSoundMute(): boolean {
  soundEnabled = !soundEnabled;
  return !soundEnabled;
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

      // Subtle high-shelf air + punchy dynamics compressor for crisp tactical audio
      const presence = audioCtx.createBiquadFilter();
      presence.type = "highshelf";
      presence.frequency.value = 2600;
      presence.gain.value = 5.0;

      const comp = audioCtx.createDynamicsCompressor();
      comp.threshold.value = -15;
      comp.knee.value = 10;
      comp.ratio.value = 4.2;
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
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.004);
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
 * Crisp UI button / tile selection click.
 */
export function playSelectSound(): void {
  playNoiseBurst(0.02, "bandpass", 3800, 2100, 2.4, 0.2, 0);
  playTone(1560, 2340, 0.036, "sine", 0.14, 0);
}

/**
 * Parachute wind rush + canopy snap + landing thud + metallic bolt rack.
 */
export function playDropSound(withLoot = false): void {
  // High-altitude wind rush
  playNoiseBurst(0.22, "bandpass", 1800, 420, 1.4, 0.34, 0);
  // Boots hitting ground thud
  playTone(135, 42, 0.16, "sine", 0.4, 0.14);
  // Metallic bolt rack double-clack
  playNoiseBurst(0.028, "highpass", 3400, 5400, 2.0, 0.28, 0.22);
  playTone(1900, 960, 0.035, "square", 0.11, 0.22);
  playNoiseBurst(0.032, "highpass", 3800, 5000, 2.0, 0.3, 0.28);

  if (withLoot) {
    playLootSound(0.28);
  }
}

/**
 * Crisp two-step tactical footsteps (with optional foliage rustle or crate auto-loot).
 */
export function playMoveSound(inBush = false, withLoot = false): void {
  playNoiseBurst(0.042, "bandpass", 960, 440, 1.8, 0.24, 0);
  playTone(142, 56, 0.05, "sine", 0.2, 0);
  playNoiseBurst(0.042, "bandpass", 1120, 500, 1.8, 0.24, 0.085);
  playTone(158, 62, 0.05, "sine", 0.2, 0.085);

  if (inBush) {
    // Leaf & branch stealth rustle
    playNoiseBurst(0.11, "bandpass", 2800, 1600, 1.5, 0.18, 0.04);
  }
  if (withLoot) {
    playLootSound(0.14);
  }
}

export function playStepSound(): void {
  playMoveSound(false, false);
}

/**
 * Supply crate / Golden Airdrop metallic latch + weapon equip chime.
 */
export function playLootSound(delayOffset = 0): void {
  // Crate latch pop + metallic slide
  playNoiseBurst(0.035, "highpass", 3000, 5200, 1.9, 0.28, delayOffset);
  playTone(1200, 620, 0.04, "square", 0.1, delayOffset + 0.02);
  // Shimmering tactical upgrade arpeggio
  const notes = [587.33, 880, 1174.66, 1760];
  notes.forEach((n, idx) => {
    playTone(
      n,
      n * 1.01,
      0.13,
      "triangle",
      0.17,
      delayOffset + 0.05 + idx * 0.042,
    );
  });
}

/**
 * Combat Knife (战术匕首): metallic blade slash swoosh + armor impact thud.
 */
export function playKnifeSound(): void {
  // High-velocity blade air slash
  playNoiseBurst(0.085, "bandpass", 4800, 1400, 2.2, 0.42, 0);
  playTone(1800, 320, 0.08, "sawtooth", 0.22, 0);
  // Heavy close-combat impact thud + metallic ring
  playTone(165, 38, 0.14, "sine", 0.46, 0.045);
  playTone(2640, 1980, 0.09, "triangle", 0.15, 0.045);
}

/**
 * M416 Assault Rifle (突击步枪): crisp 3-round automatic burst + brass shell pings.
 */
export function playRifleSound(): void {
  for (let i = 0; i < 3; i++) {
    const d = i * 0.068;
    // Muzzle blast + mechanical bolt click
    playNoiseBurst(0.055, "bandpass", 2500, 540, 1.2, 0.45, d);
    playNoiseBurst(0.02, "highpass", 4200, 6000, 2.0, 0.25, d);
    playTone(255, 52, 0.068, "sawtooth", 0.34, d);
    playTone(115, 36, 0.075, "sine", 0.36, d);
  }
  // Ejected brass shell casings hitting ground
  playTone(3480, 3260, 0.06, "sine", 0.11, 0.22);
  playTone(3680, 3440, 0.07, "sine", 0.1, 0.28);
}

/**
 * Kar98k Sniper Rifle (98K 狙击步枪): supersonic crack + deep chamber boom + bolt-action cycle.
 */
export function playSniperSound(): void {
  // Supersonic crack
  playNoiseBurst(0.055, "highpass", 2800, 6800, 1.5, 0.62, 0);
  // Reverberant canyon gunshot body
  playNoiseBurst(0.32, "bandpass", 1450, 220, 1.1, 0.54, 0.01);
  playTone(290, 34, 0.32, "sawtooth", 0.5, 0);
  playTone(125, 26, 0.36, "sine", 0.55, 0);
  // Bolt-action pull & lock ("clack-clack") + brass shell ping
  playNoiseBurst(0.03, "highpass", 3600, 5400, 2.2, 0.24, 0.26);
  playTone(3560, 3340, 0.08, "sine", 0.14, 0.29);
  playNoiseBurst(0.032, "highpass", 3900, 5800, 2.2, 0.26, 0.36);
}

export function playShotgunSound(): void {
  playRifleSound();
}

export function playHitSound(): void {
  playKnifeSound();
}

/**
 * Electromagnetic Storm shrink & radiation pulse.
 */
export function playExplosionSound(): void {
  playNoiseBurst(0.36, "lowpass", 1400, 120, 1.3, 0.52, 0);
  playTone(150, 32, 0.38, "sawtooth", 0.42, 0);
  playTone(92, 26, 0.42, "sine", 0.48, 0);
}

/**
 * Weapon-specific attack sound dispatcher.
 */
export function playAttackSound(weapon: WeaponId | "storm" | null): void {
  if (weapon === "sniper") {
    playSniperSound();
  } else if (weapon === "rifle") {
    playRifleSound();
  } else if (weapon === "storm") {
    playExplosionSound();
  } else {
    playKnifeSound();
  }
}

/**
 * Elimination K.I.A impact stinger: plays weapon fire + crisp helmet-ping elimination chime.
 */
export function playKillSound(weapon: WeaponId | "storm" | null): void {
  playAttackSound(weapon);
  // Crisp tactical elimination double chime + sub impact
  playTone(987.77, 1318.5, 0.14, "triangle", 0.3, 0.22);
  playTone(1975.5, 1975.5, 0.26, "sine", 0.26, 0.29);
  playTone(110, 35, 0.22, "sine", 0.35, 0.22);
}

/**
 * "Winner Winner Chicken Dinner" triumphant brass & synth fanfare.
 */
export function playVictorySound(): void {
  playNoiseBurst(0.06, "highpass", 2200, 5200, 1.5, 0.45, 0);
  playTone(140, 36, 0.3, "sine", 0.45, 0);

  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093.0];
  notes.forEach((n, idx) => {
    const d = 0.1 + idx * 0.072;
    const dur = idx === notes.length - 1 ? 0.72 : 0.22;
    playTone(n, n, dur, "triangle", 0.25, d);
    playTone(n * 1.5, n * 1.5, dur * 0.8, "sine", 0.11, d);
    playTone(n * 0.5, n * 0.5, dur * 0.9, "sawtooth", 0.08, d);
  });
}
