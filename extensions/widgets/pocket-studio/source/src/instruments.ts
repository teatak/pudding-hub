import { getAudioContext, createVoiceOutput, playSquareWave, playTriangleBass, playKick, playSnare, playHat, playAnalogBass, playSoftPluck, playRhodes, playMarimba } from "./audio";

export function resolvePitch(id: string, step: number, raw?: number | null): number | null {
  if (["kick", "snare", "hat"].includes(id)) return null;
  if (typeof raw === "number" && raw > 0) return raw;
  if (id === "marioLead") return 659.25;
  if (id === "kongLead") return 349.23;
  if (id === "marioBass") return 130.81;
  if (id === "lead") return [261.63, 293.66, 329.63, 392, 440, 523.25][step % 6];
  if (id === "bass") return [65.41, 87.31, 98, 110][Math.floor(step / 16) % 4];
  if (id === "epiano") return [261.63, 329.63, 392, 493.88, 523.25][step % 5];
  return 440;
}

export function soundDuration(id: string, duration: number) {
  return id === "kick" ? 0.35 : id === "snare" ? 0.18 : id === "hat" ? 0.04 : id === "epiano" ? duration + 0.1 : duration;
}

export function getDefaultReverb(id: string): number {
  switch (id) {
    case "epiano": return 0.35;
    case "lead": return 0.30;
    case "marimba": return 0.25;
    case "snare": return 0.18;
    case "hat": return 0.12;
    case "marioLead":
    case "kongLead": return 0.15;
    case "bass": return 0.06;
    case "marioBass": return 0.04;
    case "kick": return 0.0;
    default: return 0.2;
  }
}

export function playInstrument(
  id: string,
  time: number,
  step: number,
  pitch?: number | null,
  duration: number | undefined = undefined,
  ctx: BaseAudioContext = getAudioContext(),
  volume = 1,
  reverb?: number
) {
  const effectiveReverb = reverb !== undefined ? reverb : getDefaultReverb(id);
  const output = createVoiceOutput(ctx, volume, effectiveReverb);
  const frequency = resolvePitch(id, step, pitch) ?? 440;
  duration ??= ({ marioLead: 0.12, kongLead: 0.16, marioBass: 0.18, bass: 0.32, lead: 0.38, epiano: 0.5, marimba: 0.22 } as Record<string, number>)[id] ?? 0.12;
  switch (id) {
    case "marioLead": case "kongLead": playSquareWave(frequency, time, duration, ctx, output); break;
    case "marioBass": playTriangleBass(frequency, time, duration, ctx, output); break;
    case "kick": playKick(time, ctx, output); break;
    case "snare": playSnare(time, ctx, output); break;
    case "hat": playHat(time, ctx, output); break;
    case "bass": playAnalogBass(frequency, time, duration, ctx, output); break;
    case "lead": playSoftPluck(frequency, time, duration, ctx, output); break;
    case "epiano": playRhodes(frequency, time, duration, ctx, output); break;
    case "marimba": playMarimba(frequency, time, duration, ctx, output); break;
  }
}
