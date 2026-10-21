import { pudding } from "@pudding/widget";
import { z } from "zod";
import { type SongState, type EditAction, type BarData } from "./types";
import {
  createMarioSong,
  createDonkeyKongSong,
  createOrientalSong,
  createLofiSong
} from "./demoTracks";
import { t, errorText } from "./text";

export const INSTRUMENT_IDS = [
  "marioLead",
  "kongLead",
  "marioBass",
  "kick",
  "snare",
  "hat",
  "lead",
  "bass",
  "epiano",
  "marimba"
] as const;

export function getDefaultSong(): SongState {
  return createMarioSong();
}

export function readSong(data: unknown): SongState {
  if (!data || typeof data !== "object") return getDefaultSong();
  const raw =
    (data as { data?: { song?: unknown } }).data?.song ??
    (data as { song?: unknown }).song ??
    data;
  if (!raw || typeof raw !== "object") return getDefaultSong();
  const songData = raw as Partial<SongState>;
  if (!songData.tracks || !Array.isArray(songData.tracks) || songData.tracks.length === 0) {
    return getDefaultSong();
  }
  return {
    bpm: typeof songData.bpm === "number" && songData.bpm >= 60 && songData.bpm <= 180 ? songData.bpm : 120,
    tracks: songData.tracks,
    bars: Array.isArray(songData.bars) && songData.bars.length >= 1 ? songData.bars : getDefaultSong().bars
  };
}

export function editSong(current: SongState, action: EditAction): SongState {
  const maxBarIdx = Math.max(0, current.bars.length - 1);

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
        pitches: bar.pitches ? { ...bar.pitches, [newKey]: new Array(16).fill(null) } : undefined,
        durations: bar.durations ? { ...bar.durations, [newKey]: new Array(16).fill(null) } : undefined
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
        const nextDurations = bar.durations ? { ...bar.durations } : undefined;
        if (nextDurations) delete nextDurations[action.trackKey];
        return { steps: nextSteps, pitches: nextPitches, durations: nextDurations };
      });
      return { ...current, tracks: newTracks, bars: newBars };
    }

    case "addBar": {
      if (current.bars.length >= 16) return current;
      const steps: Record<string, boolean[]> = {};
      const pitches: Record<string, (number | null)[]> = {};
      const durations: Record<string, (number | null)[]> = {};
      if (action.copyFrom !== undefined && current.bars[action.copyFrom]) {
        const src = current.bars[action.copyFrom];
        current.tracks.forEach((t) => {
          steps[t.trackKey] = [...(src.steps[t.trackKey] || new Array(16).fill(false))];
          pitches[t.trackKey] = [...(src.pitches?.[t.trackKey] || new Array(16).fill(null))];
          durations[t.trackKey] = [...(src.durations?.[t.trackKey] || new Array(16).fill(null))];
        });
      } else {
        current.tracks.forEach((t) => {
          steps[t.trackKey] = new Array(16).fill(false);
          pitches[t.trackKey] = new Array(16).fill(null);
          durations[t.trackKey] = new Array(16).fill(null);
        });
      }
      return { ...current, bars: [...current.bars, { steps, pitches, durations }] };
    }

    case "removeBar": {
      if (current.bars.length <= 1) return current;
      const targetIdx =
        action.barIndex !== undefined && action.barIndex >= 0 && action.barIndex < current.bars.length
          ? action.barIndex
          : current.bars.length - 1;
      return { ...current, bars: current.bars.filter((_, idx) => idx !== targetIdx) };
    }

    case "toggleStep": {
      const bIdx = Math.max(0, Math.min(maxBarIdx, action.barIndex));
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

        let nextDurations = bar.durations;
        if (action.duration !== undefined) {
          const trackDurations = [...(bar.durations?.[action.trackKey] || new Array(16).fill(null))];
          trackDurations[sIdx] = trackSteps[sIdx] ? Math.max(1, action.duration) : null;
          nextDurations = { ...bar.durations, [action.trackKey]: trackDurations };
        } else if (!trackSteps[sIdx] && bar.durations?.[action.trackKey]) {
          const trackDurations = [...bar.durations[action.trackKey]];
          trackDurations[sIdx] = null;
          nextDurations = { ...bar.durations, [action.trackKey]: trackDurations };
        }

        return { steps: nextSteps, pitches: nextPitches, durations: nextDurations };
      });
      return { ...current, bars: newBars };
    }

    case "setNoteDuration": {
      const bIdx = Math.max(0, Math.min(maxBarIdx, action.barIndex));
      const sIdx = Math.max(0, Math.min(15, action.stepIndex));
      const newBars = current.bars.map((bar, idx) => {
        if (idx !== bIdx) return bar;
        const trackDurations = [...(bar.durations?.[action.trackKey] || new Array(16).fill(null))];
        trackDurations[sIdx] = Math.max(1, Math.min(32, action.duration));
        const nextDurations = { ...(bar.durations || {}), [action.trackKey]: trackDurations };
        return { ...bar, durations: nextDurations };
      });
      return { ...current, bars: newBars };
    }

    case "setNotePitch": {
      const bIdx = Math.max(0, Math.min(maxBarIdx, action.barIndex));
      const sIdx = Math.max(0, Math.min(15, action.stepIndex));
      const newBars = current.bars.map((bar, idx) => {
        if (idx !== bIdx) return bar;
        const trackPitches = [...(bar.pitches?.[action.trackKey] || new Array(16).fill(null))];
        trackPitches[sIdx] = Math.max(20, Math.min(10000, Number(action.pitch.toFixed(2))));
        const nextPitches = { ...(bar.pitches || {}), [action.trackKey]: trackPitches };
        return { ...bar, pitches: nextPitches };
      });
      return { ...current, bars: newBars };
    }

    case "setTrackPattern": {
      const bIdx = Math.max(0, Math.min(maxBarIdx, action.barIndex));
      const newBars = current.bars.map((bar, idx) => {
        if (idx !== bIdx) return bar;
        const rawSteps = action.steps.slice(0, 16);
        const nextSteps = {
          ...bar.steps,
          [action.trackKey]: rawSteps
        };
        const nextPitches = bar.pitches ? { ...bar.pitches } : {};
        if (action.pitches) {
          nextPitches[action.trackKey] = action.pitches.slice(0, 16);
        } else {
          const oldP = bar.pitches?.[action.trackKey] || new Array(16).fill(null);
          nextPitches[action.trackKey] = rawSteps.map((on, i) => (on ? oldP[i] : null));
        }

        const nextDurations = bar.durations ? { ...bar.durations } : {};
        if (action.durations) {
          nextDurations[action.trackKey] = action.durations.slice(0, 16);
        } else {
          // 未显式指定 durations 时，默认激活音符为 1，非音符为 null，绝不残留旧预设时值
          nextDurations[action.trackKey] = rawSteps.map((on) => (on ? 1 : null));
        }
        return { steps: nextSteps, pitches: nextPitches, durations: nextDurations };
      });
      return { ...current, bars: newBars };
    }

    case "copyBar": {
      const from = Math.max(0, Math.min(maxBarIdx, action.fromBar));
      const to = Math.max(0, Math.min(maxBarIdx, action.toBar));
      const newBars = current.bars.map((bar, idx) => {
        if (idx !== to) return bar;
        const sourceBar = current.bars[from];
        return {
          steps: JSON.parse(JSON.stringify(sourceBar.steps)) as Record<string, boolean[]>,
          pitches: sourceBar.pitches
            ? (JSON.parse(JSON.stringify(sourceBar.pitches)) as Record<string, (number | null)[]>)
            : undefined,
          durations: sourceBar.durations
            ? (JSON.parse(JSON.stringify(sourceBar.durations)) as Record<string, (number | null)[]>)
            : undefined
        };
      });
      return { ...current, bars: newBars };
    }

    case "clearBar": {
      const bIdx = Math.max(0, Math.min(maxBarIdx, action.barIndex));
      const newBars = current.bars.map((bar, idx) => {
        if (idx !== bIdx) return bar;
        const clearedSteps: Record<string, boolean[]> = {};
        const clearedPitches: Record<string, (number | null)[]> = {};
        const clearedDurations: Record<string, (number | null)[]> = {};
        current.tracks.forEach((t) => {
          clearedSteps[t.trackKey] = new Array(16).fill(false);
          clearedPitches[t.trackKey] = new Array(16).fill(null);
          clearedDurations[t.trackKey] = new Array(16).fill(null);
        });
        return { steps: clearedSteps, pitches: clearedPitches, durations: clearedDurations };
      });
      return { ...current, bars: newBars };
    }

    case "clearSong": {
      const targetCount = action.barsCount ? Math.max(1, Math.min(16, action.barsCount)) : current.bars.length;
      const newBars: BarData[] = [];
      for (let i = 0; i < targetCount; i++) {
        const steps: Record<string, boolean[]> = {};
        const pitches: Record<string, (number | null)[]> = {};
        const durations: Record<string, (number | null)[]> = {};
        current.tracks.forEach((t) => {
          steps[t.trackKey] = new Array(16).fill(false);
          pitches[t.trackKey] = new Array(16).fill(null);
          durations[t.trackKey] = new Array(16).fill(null);
        });
        newBars.push({ steps, pitches, durations });
      }
      return { ...current, bars: newBars };
    }

    default:
      return current;
  }
}

// 内部异步互斥队列：严格串行化所有写操作，彻底杜绝并行丢写与版本冲突
let writeQueue: Promise<any> = Promise.resolve();

export async function edit(action: EditAction, signal?: AbortSignal) {
  const execute = async () => {
    if (signal?.aborted) throw new Error(t("cancelled"));
    const old = await pudding.storage.read({ signal });
    const currentSong = readSong(old.data);
    const updatedSong = editSong(currentSong, action);

    if (signal?.aborted) throw new Error(t("cancelled"));

    const saved = await pudding.storage.write({
      expectedVersion: old.version,
      data: { ...(old.data || {}), song: updatedSong }
    });

    return {
      song: updatedSong,
      storageVersion: saved.version
    };
  };

  const nextPromise = writeQueue.then(execute, execute);
  writeQueue = nextPromise.then(() => {}, () => {});
  return nextPromise;
}

export type PlaybackController = {
  play: () => void;
  pause: () => void;
  isPlaying: () => boolean;
  getStep: () => number;
};

let playbackController: PlaybackController | null = null;

export function registerPlaybackController(controller: PlaybackController) {
  playbackController = controller;
  return () => {
    if (playbackController === controller) playbackController = null;
  };
}

// 注册向外部宿主 AI 会话暴露的工具接口
function register() {
  const wrap =
    <T, R>(run: (input: T, signal?: AbortSignal) => Promise<R>) =>
    async (input: T, c?: { signal?: AbortSignal }) => {
      try {
        return await run(input, c?.signal);
      } catch (error) {
        throw new Error(errorText(error));
      }
    };

  const instEnum = z.enum(INSTRUMENT_IDS);

  return [
    pudding.defineInterface({
      name: "getSong",
      description: t("descGetSong"),
      input: z.object({}).strict(),
      run: wrap(async (_input: Record<string, never>, signal) => {
        const old = await pudding.storage.read({ signal });
        const song = readSong(old.data);
        return {
          bpm: song.bpm,
          totalBars: song.bars.length,
          tracks: song.tracks,
          bars: song.bars,
          isPlaying: playbackController ? playbackController.isPlaying() : false,
          availableInstruments: INSTRUMENT_IDS,
          storageVersion: old.version
        };
      })
    }),

    pudding.defineInterface({
      name: "setBpm",
      description: t("descSetBpm"),
      input: z.object({ bpm: z.number().int().min(60).max(180) }).strict(),
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
      name: "addBar",
      description: t("descAddBar"),
      input: z
        .object({
          copyFrom: z.number().int().min(0).max(15).optional().describe("copyFrom bar index")
        })
        .strict(),
      run: wrap((input: { copyFrom?: number }, signal) =>
        edit({ action: "addBar", copyFrom: input.copyFrom }, signal)
      )
    }),

    pudding.defineInterface({
      name: "removeBar",
      description: t("descRemoveBar"),
      input: z
        .object({
          barIndex: z.number().int().min(0).max(15).optional().describe("barIndex")
        })
        .strict(),
      run: wrap((input: { barIndex?: number }, signal) =>
        edit({ action: "removeBar", barIndex: input.barIndex }, signal)
      )
    }),

    pudding.defineInterface({
      name: "setTrackPattern",
      description: t("descSetTrackPattern"),
      input: z
        .object({
          barIndex: z.number().int().min(0).max(15).describe("小节索引 (0起)"),
          trackKey: z.string().describe("音轨键 (如 t_lead, t_bass 等，通过 getSong 获取)"),
          steps: z.array(z.boolean()).min(16).max(16).describe("16步进开关布尔值数组"),
          pitches: z
            .array(z.number().nullable())
            .min(16)
            .max(16)
            .optional()
            .describe("16步进音高频率数组 (Hz，选填)"),
          durations: z
            .array(z.number().int().min(1).max(32).nullable())
            .min(16)
            .max(16)
            .optional()
            .describe("16步进音符持续时长数组（步数，如 1 为标准单步，2 为两步长音，4 为一拍；非音符处传 null；不传时默认重置为1步，消除旧时值残留）")
        })
        .strict(),
      run: wrap(
        (
          input: {
            barIndex: number;
            trackKey: string;
            steps: boolean[];
            pitches?: (number | null)[];
            durations?: (number | null)[];
          },
          signal
        ) =>
          edit(
            {
              action: "setTrackPattern",
              barIndex: input.barIndex,
              trackKey: input.trackKey,
              steps: input.steps,
              pitches: input.pitches,
              durations: input.durations
            },
            signal
          )
      )
    }),

    pudding.defineInterface({
      name: "toggleStep",
      description: t("descToggleStep"),
      input: z
        .object({
          barIndex: z.number().int().min(0).max(15).describe("小节索引 (0起)"),
          trackKey: z.string(),
          stepIndex: z.number().int().min(0).max(15),
          pitch: z.number().optional(),
          duration: z.number().int().min(1).max(32).optional().describe("音符持续步长 (选填，默认为 1)")
        })
        .strict(),
      run: wrap(
        (
          input: { barIndex: number; trackKey: string; stepIndex: number; pitch?: number; duration?: number },
          signal
        ) =>
          edit(
            {
              action: "toggleStep",
              barIndex: input.barIndex,
              trackKey: input.trackKey,
              stepIndex: input.stepIndex,
              pitch: input.pitch,
              duration: input.duration
            },
            signal
          )
      )
    }),

    pudding.defineInterface({
      name: "setNoteDuration",
      description: t("descSetNoteDuration"),
      input: z
        .object({
          barIndex: z.number().int().min(0).max(15).describe("小节索引 (0起)"),
          trackKey: z.string().describe("音轨键"),
          stepIndex: z.number().int().min(0).max(15).describe("步进索引 (0-15)"),
          duration: z.number().int().min(1).max(32).describe("持续时长（步数，如 2、3、4 等）")
        })
        .strict(),
      run: wrap(
        (
          input: { barIndex: number; trackKey: string; stepIndex: number; duration: number },
          signal
        ) =>
          edit(
            {
              action: "setNoteDuration",
              barIndex: input.barIndex,
              trackKey: input.trackKey,
              stepIndex: input.stepIndex,
              duration: input.duration
            },
            signal
          )
      )
    }),

    pudding.defineInterface({
      name: "setNotePitch",
      description: t("descSetNotePitch"),
      input: z
        .object({
          barIndex: z.number().int().min(0).max(15).describe("小节索引 (0起)"),
          trackKey: z.string().describe("音轨键"),
          stepIndex: z.number().int().min(0).max(15).describe("步进索引 (0-15)"),
          pitch: z.number().min(20).max(10000).describe("音符频率 (Hz，如 440、523.25 等)")
        })
        .strict(),
      run: wrap(
        (
          input: { barIndex: number; trackKey: string; stepIndex: number; pitch: number },
          signal
        ) =>
          edit(
            {
              action: "setNotePitch",
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
      description: "更换指定音轨的乐器音色",
      input: z
        .object({
          trackKey: z.string(),
          instId: instEnum
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
      description: "向音乐工坊添加新的乐器音轨 (最多 8 条)",
      input: z.object({ instId: instEnum }).strict(),
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
    }),

    pudding.defineInterface({
      name: "clearBar",
      description: t("descClearBar"),
      input: z.object({ barIndex: z.number().int().min(0).max(15).describe("barIndex") }).strict(),
      run: wrap((input: { barIndex: number }, signal) =>
        edit({ action: "clearBar", barIndex: input.barIndex }, signal)
      )
    }),

    pudding.defineInterface({
      name: "clearSong",
      description: t("descClearSong"),
      input: z
        .object({
          barsCount: z
            .number()
            .int()
            .min(1)
            .max(16)
            .optional()
            .describe("清空后保留的小节数量 (1-16，选填，默认保留当前小节数)")
        })
        .strict(),
      run: wrap((input: { barsCount?: number }, signal) =>
        edit({ action: "clearSong", barsCount: input.barsCount }, signal)
      )
    }),

    pudding.defineInterface({
      name: "play",
      description: t("descPlay"),
      input: z.object({}).strict(),
      run: wrap(async () => {
        playbackController?.play();
        return { isPlaying: true };
      })
    }),

    pudding.defineInterface({
      name: "pause",
      description: t("descPause"),
      input: z.object({}).strict(),
      run: wrap(async () => {
        playbackController?.pause();
        return { isPlaying: false };
      })
    }),

    pudding.defineInterface({
      name: "getPlaybackStatus",
      description: t("descGetPlaybackStatus"),
      input: z.object({}).strict(),
      run: wrap(async () => {
        const isPlaying = playbackController ? playbackController.isPlaying() : false;
        const playStep = playbackController ? playbackController.getStep() : 0;
        return { isPlaying, playStep };
      })
    })
  ];
}

let interfaces = register();
pudding.locale.subscribe(() => {
  interfaces.forEach((remove) => remove());
  interfaces = register();
});
