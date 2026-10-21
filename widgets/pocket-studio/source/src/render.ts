import type { SongState } from "./types";
import { normalizeSong } from "./project";
import { playInstrument, soundDuration } from "./instruments";
import { encodeWav } from "./wav";

export async function renderSongWav(input: SongState) {
  const song = normalizeSong(input), stepSeconds = 60 / song.bpm / 4, sampleRate = 44100;
  let end = song.bars.length * 16 * stepSeconds;
  const notes: Array<{ id: string; step: number; pitch: number | null; duration: number; volume: number }> = [];
  song.bars.forEach((bar, barIndex) => song.tracks.forEach(track => bar.steps[track.trackKey].forEach((on, stepIndex) => {
    if (!on) return;
    const step = barIndex * 16 + stepIndex, duration = (bar.durations?.[track.trackKey]?.[stepIndex] ?? 1) * stepSeconds;
    notes.push({ id: track.instId, step, pitch: bar.pitches?.[track.trackKey]?.[stepIndex] ?? null, duration, volume: track.volume ?? 1 });
    end = Math.max(end, step * stepSeconds + soundDuration(track.instId, duration));
  })));
  const ctx = new OfflineAudioContext(1, Math.ceil((end + 0.05) * sampleRate), sampleRate);
  for (const note of notes) playInstrument(note.id, note.step * stepSeconds, note.step, note.pitch, note.duration, ctx, note.volume);
  const buffer = await ctx.startRendering();
  return { bytes: encodeWav(buffer.getChannelData(0), sampleRate), durationSeconds: buffer.duration, sampleRate };
}
