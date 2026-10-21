import { z } from "zod";
import type { SongState } from "./types";
import { INSTRUMENT_IDS } from "./song";
import { t } from "./text";

export const projectFormat = "pudding.pocket-studio";
export const maxProjectBytes = 256 * 1024;
const key = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const songSchema = z.object({
  bpm: z.number().int().min(60).max(180),
  tracks: z.array(z.object({ trackKey: key, instId: z.enum(INSTRUMENT_IDS), volume: z.number().min(0).max(1).optional() }).strict()).min(1).max(8),
  bars: z.array(z.object({
    steps: z.record(key, z.array(z.boolean()).length(16)),
    pitches: z.record(key, z.array(z.number().min(20).max(10000).nullable()).length(16)).optional(),
    durations: z.record(key, z.array(z.number().int().min(1).max(32).nullable()).length(16)).optional(),
  }).strict()).min(1).max(16),
}).strict().superRefine((song, context) => {
  const keys = song.tracks.map(track => track.trackKey);
  if (new Set(keys).size !== keys.length) context.addIssue({ code: "custom", path: ["tracks"], message: "Duplicate track keys" });
  song.bars.forEach((bar, barIndex) => {
    for (const field of ["steps", "pitches", "durations"] as const) {
      const record = bar[field];
      if (record && (Object.keys(record).some(key => !keys.includes(key)) || field === "steps" && keys.some(key => !Object.hasOwn(record, key)))) {
        context.addIssue({ code: "custom", path: ["bars", barIndex, field], message: "Track keys do not match the track list" });
      }
    }
  });
});

export function normalizeSong(value: unknown): SongState {
  const result = songSchema.safeParse(value);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map(issue => {
      const field = "song." + issue.path.map((key, index) => typeof key === "number" ? `[${key}]` : (index ? "." : "") + String(key)).join("");
      return field.length > 140 ? field.slice(0, 139) + "…" : field;
    }))];
    throw new Error(t("projectInvalid").replace("{field}", () => fields.slice(0, 3).join(", ") + (fields.length > 3 ? ", …" : "")));
  }
  const song = result.data;
  return {
    bpm: song.bpm, tracks: song.tracks,
    bars: song.bars.map(bar => ({
      steps: Object.fromEntries(song.tracks.map(({ trackKey }) => [trackKey, [...bar.steps[trackKey]]])),
      pitches: Object.fromEntries(song.tracks.map(({ trackKey }) => [trackKey, bar.steps[trackKey].map((on, i) => on ? bar.pitches?.[trackKey]?.[i] ?? null : null)])),
      durations: Object.fromEntries(song.tracks.map(({ trackKey }) => [trackKey, bar.steps[trackKey].map((on, i) => on ? bar.durations?.[trackKey]?.[i] ?? 1 : null)])),
    })),
  };
}

export function encodeProject(song: SongState) {
  const content = JSON.stringify({ format: projectFormat, version: 1, song: normalizeSong(song) }, null, 2) + "\n";
  if (new TextEncoder().encode(content).length > maxProjectBytes) throw new Error(t("projectTooLarge"));
  return content;
}

export function parseProject(content: string) {
  if (new TextEncoder().encode(content).length > maxProjectBytes) throw new Error(t("projectTooLarge"));
  let raw: unknown;
  try { raw = JSON.parse(content); } catch { throw new Error(t("projectMalformed")); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(t("projectMalformed"));
  const data = raw as Record<string, unknown>;
  if (data.format !== projectFormat || data.version !== 1) throw new Error(t("projectVersionError"));
  if (Object.keys(data).some(key => !["format", "version", "song"].includes(key))) throw new Error(t("projectMalformed"));
  return { format: projectFormat, version: 1, song: normalizeSong(data.song) };
}
