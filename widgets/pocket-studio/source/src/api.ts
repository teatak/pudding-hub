import { pudding } from "@pudding/widget";
import { z } from "zod";
import { type SongState, type EditAction } from "./types";
import {
  createMarioSong,
  createDonkeyKongSong,
  createOrientalSong,
  createLofiSong
} from "./demoTracks";
import { t, errorText } from "./text";

export function getDefaultSong(): SongState {
  return createMarioSong();
}

export function readSong(data: unknown): SongState {
  if (!data || typeof data !== "object") return getDefaultSong();
  const raw = data as Partial<SongState>;
  if (!raw.tracks || !Array.isArray(raw.tracks) || raw.tracks.length === 0) {
    return getDefaultSong();
  }
  return {
    bpm: typeof raw.bpm === "number" && raw.bpm >= 60 && raw.bpm <= 180 ? raw.bpm : 120,
    tracks: raw.tracks,
    bars: Array.isArray(raw.bars) && raw.bars.length === 4 ? raw.bars : getDefaultSong().bars
  };
}

export function editSong(current: SongState, action: EditAction): SongState {
  switch (action.action) {
    case "setBpm":
      return {
        ...current,
        bpm: Math.max(60, Math.min(180, action.bpm))
      };

    case "loadPreset":
      if (action.presetName === "donkeyKong") return createDonkeyKongSong();
      if (action.presetName === "oriental") return createOrientalSong();
      if (action.presetName === "lofi") return createLofiSong();
      return createMarioSong();

    case "changeInstrument":
      return {
        ...current,
        tracks: current.tracks.map((t) =>
          t.trackKey === action.trackKey ? { ...t, instId: action.instId } : t
        )
      };

    case "addTrack": {
      if (current.tracks.length >= 8) return current;
      const newKey = "t_" + Date.now();
      const newTracks = [...current.tracks, { trackKey: newKey, instId: action.instId }];
      const newBars = current.bars.map((bar) => ({
        ...bar,
        steps: { ...bar.steps, [newKey]: new Array(16).fill(false) },
        pitches: bar.pitches ? { ...bar.pitches, [newKey]: new Array(16).fill(null) } : undefined
      }));
      return { ...current, tracks: newTracks, bars: newBars };
    }

    case "removeTrack": {
      if (current.tracks.length <= 1) return current;
      const newTracks = current.tracks.filter((t) => t.trackKey !== action.trackKey);
      const newBars = current.bars.map((bar) => {
        const nextSteps = { ...bar.steps };
        delete nextSteps[action.trackKey];
        const nextPitches = bar.pitches ? { ...bar.pitches } : undefined;
        if (nextPitches) delete nextPitches[action.trackKey];
        return { steps: nextSteps, pitches: nextPitches };
      });
      return { ...current, tracks: newTracks, bars: newBars };
    }

    case "toggleStep": {
      const bIdx = Math.max(0, Math.min(3, action.barIndex));
      const sIdx = Math.max(0, Math.min(15, action.stepIndex));
      const newBars = current.bars.map((bar, idx) => {
        if (idx !== bIdx) return bar;
        const trackSteps = [...(bar.steps[action.trackKey] || new Array(16).fill(false))];
        trackSteps[sIdx] = !trackSteps[sIdx];
        const nextSteps = { ...bar.steps, [action.trackKey]: trackSteps };

        let nextPitches = bar.pitches;
        if (action.pitch !== undefined) {
          const trackPitches = [...(bar.pitches?.[action.trackKey] || new Array(16).fill(null))];
          trackPitches[sIdx] = trackSteps[sIdx] ? action.pitch : null;
          nextPitches = { ...bar.pitches, [action.trackKey]: trackPitches };
        }
        return { steps: nextSteps, pitches: nextPitches };
      });
      return { ...current, bars: newBars };
    }

    case "copyBar": {
      const from = Math.max(0, Math.min(3, action.fromBar));
      const to = Math.max(0, Math.min(3, action.toBar));
      const newBars = current.bars.map((bar, idx) => {
        if (idx !== to) return bar;
        const sourceBar = current.bars[from];
        return {
          steps: JSON.parse(JSON.stringify(sourceBar.steps)) as Record<string, boolean[]>,
          pitches: sourceBar.pitches
            ? (JSON.parse(JSON.stringify(sourceBar.pitches)) as Record<string, (number | null)[]>)
            : undefined
        };
      });
      return { ...current, bars: newBars };
    }

    case "clearBar": {
      const bIdx = Math.max(0, Math.min(3, action.barIndex));
      const newBars = current.bars.map((bar, idx) => {
        if (idx !== bIdx) return bar;
        const clearedSteps: Record<string, boolean[]> = {};
        const clearedPitches: Record<string, (number | null)[]> = {};
        current.tracks.forEach((t) => {
          clearedSteps[t.trackKey] = new Array(16).fill(false);
          clearedPitches[t.trackKey] = new Array(16).fill(null);
        });
        return { steps: clearedSteps, pitches: clearedPitches };
      });
      return { ...current, bars: newBars };
    }

    default:
      return current;
  }
}

export async function edit(action: EditAction, signal?: AbortSignal) {
  const old = await pudding.storage.read({ signal });
  const currentSong = readSong(old.data?.song);
  const updatedSong = editSong(currentSong, action);

  if (signal?.aborted) throw new Error(t("cancelled"));

  const saved = await pudding.storage.write({
    expectedVersion: old.version,
    data: { ...old.data, song: updatedSong }
  });

  return {
    song: updatedSong,
    storageVersion: saved.version
  };
}

// 注册向外部宿主 AI 会话暴露的工具接口
function register() {
  const wrap =
    <T, R>(run: (input: T, signal: AbortSignal) => Promise<R>) =>
    async (input: T, c: { signal: AbortSignal }) => {
      try {
        return await run(input, c.signal);
      } catch (error) {
        throw new Error(errorText(error));
      }
    };

  return [
    pudding.defineInterface({
      name: "setBpm",
      description: t("descSetBpm"),
      input: z.object({ bpm: z.number().min(60).max(180) }).strict(),
      run: wrap((input: { bpm: number }, signal) =>
        edit({ action: "setBpm", bpm: input.bpm }, signal)
      )
    }),

    pudding.defineInterface({
      name: "loadPreset",
      description: t("descLoadPreset"),
      input: z
        .object({
          presetName: z.enum(["mario", "donkeyKong", "oriental", "lofi"])
        })
        .strict(),
      run: wrap(
        (input: { presetName: "mario" | "donkeyKong" | "oriental" | "lofi" }, signal) =>
          edit({ action: "loadPreset", presetName: input.presetName }, signal)
      )
    }),

    pudding.defineInterface({
      name: "toggleStep",
      description: t("descToggleStep"),
      input: z
        .object({
          barIndex: z.number().min(0).max(3),
          trackKey: z.string(),
          stepIndex: z.number().min(0).max(15),
          pitch: z.number().optional()
        })
        .strict(),
      run: wrap(
        (
          input: { barIndex: number; trackKey: string; stepIndex: number; pitch?: number },
          signal
        ) =>
          edit(
            {
              action: "toggleStep",
              barIndex: input.barIndex,
              trackKey: input.trackKey,
              stepIndex: input.stepIndex,
              pitch: input.pitch
            },
            signal
          )
      )
    }),

    pudding.defineInterface({
      name: "changeInstrument",
      description: t("descChangeInstrument"),
      input: z
        .object({
          trackKey: z.string(),
          instId: z.string()
        })
        .strict(),
      run: wrap((input: { trackKey: string; instId: string }, signal) =>
        edit(
          {
            action: "changeInstrument",
            trackKey: input.trackKey,
            instId: input.instId
          },
          signal
        )
      )
    }),

    pudding.defineInterface({
      name: "addTrack",
      description: t("descAddTrack"),
      input: z.object({ instId: z.string() }).strict(),
      run: wrap((input: { instId: string }, signal) =>
        edit({ action: "addTrack", instId: input.instId }, signal)
      )
    }),

    pudding.defineInterface({
      name: "removeTrack",
      description: t("descRemoveTrack"),
      input: z.object({ trackKey: z.string() }).strict(),
      run: wrap((input: { trackKey: string }, signal) =>
        edit({ action: "removeTrack", trackKey: input.trackKey }, signal)
      )
    })
  ];
}

export const interfaces = register();
