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
        const nextSteps = {
          ...bar.steps,
          [action.trackKey]: action.steps.slice(0, 16)
        };
        const nextPitches = bar.pitches ? { ...bar.pitches } : {};
        if (action.pitches) {
          nextPitches[action.trackKey] = action.pitches.slice(0, 16);
        }
        const nextDurations = bar.durations ? { ...bar.durations } : {};
        if (action.durations) {
          nextDurations[action.trackKey] = action.durations.slice(0, 16);
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

    default:
      return current;
  }
}

export async function edit(action: EditAction, signal?: AbortSignal) {
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
      description: "【首选查询接口】读取音乐工坊的完整状态：包含速度 BPM、小节总数、所有音轨列表（trackKey、instId）以及所有小节的当前音符步进矩阵。无需调用 widget_observe。",
      input: z.object({}).strict(),
      run: wrap(async (_input: Record<string, never>, signal) => {
        const old = await pudding.storage.read({ signal });
        const song = readSong(old.data);
        return {
          bpm: song.bpm,
          totalBars: song.bars.length,
          tracks: song.tracks,
          bars: song.bars,
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
      description: "加载经典预设曲目：mario (超级马里奥主题曲), donkeyKong (1981街机大金刚主题曲), oriental (国风五声), lofi (Lo-Fi慢摇)",
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
      description: "添加一个新的小节（最多支持 16 小节，可选复制已有小节）",
      input: z
        .object({
          copyFrom: z.number().int().min(0).max(15).optional().describe("可选：从指定小节复制节奏")
        })
        .strict(),
      run: wrap((input: { copyFrom?: number }, signal) =>
        edit({ action: "addBar", copyFrom: input.copyFrom }, signal)
      )
    }),

    pudding.defineInterface({
      name: "removeBar",
      description: "删除指定小节（至少保留 1 小节，默认删除最后一小节）",
      input: z
        .object({
          barIndex: z.number().int().min(0).max(15).optional().describe("要删除的小节索引，默认最后一节")
        })
        .strict(),
      run: wrap((input: { barIndex?: number }, signal) =>
        edit({ action: "removeBar", barIndex: input.barIndex }, signal)
      )
    }),

    pudding.defineInterface({
      name: "setTrackPattern",
      description: "批量设置指定小节内某音轨的 16 步进节奏（16位布尔数组）及可选音高频率",
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
            .describe("16步进音高频率数组 (Hz，选填)")
        })
        .strict(),
      run: wrap(
        (
          input: {
            barIndex: number;
            trackKey: string;
            steps: boolean[];
            pitches?: (number | null)[];
          },
          signal
        ) =>
          edit(
            {
              action: "setTrackPattern",
              barIndex: input.barIndex,
              trackKey: input.trackKey,
              steps: input.steps,
              pitches: input.pitches
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
      description: "清空指定小节内的所有音符步进",
      input: z.object({ barIndex: z.number().int().min(0).max(15).describe("小节索引 (0起)") }).strict(),
      run: wrap((input: { barIndex: number }, signal) =>
        edit({ action: "clearBar", barIndex: input.barIndex }, signal)
      )
    })
  ];
}

let interfaces = register();
pudding.locale.subscribe(() => {
  interfaces.forEach((remove) => remove());
  interfaces = register();
});
