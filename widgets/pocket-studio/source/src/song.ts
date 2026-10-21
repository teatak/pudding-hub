import type { SongState, EditAction, BarData, ReadOptions } from "./types";
import { createMarioSong, createDonkeyKongSong, createOrientalSong, createLofiSong } from "./demoTracks";
import { t } from "./text";

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

function fail(key: string, field = "", values: Record<string, string | number> = {}): never {
  const params: Record<string, string | number> = { field, ...values };
  throw new Error(t(key).replace(/\{(\w+)\}/g, (token, name: string) => params[name] === undefined ? token : String(params[name])));
}

function integer(value: number, min: number, max: number, field: string) {
  if (!Number.isInteger(value) || value < min || value > max) fail("invalidRange", field, { min, max });
}

function checkBar(song: SongState, index: number, field = "barIndex") {
  integer(index, 0, song.bars.length - 1, field);
}

function checkTrack(song: SongState, key: string) {
  if (!song.tracks.some((track) => track.trackKey === key)) fail("invalidTrack", key, { allowed: song.tracks.map(track => track.trackKey).join(", ") });
}

function checkPitch(value: number) {
  if (!Number.isFinite(value) || value < 20 || value > 10000) fail("invalidPitch");
}

function validateAction(song: SongState, action: EditAction) {
  if ("barIndex" in action && action.barIndex !== undefined) checkBar(song, action.barIndex);
  if ("trackKey" in action) checkTrack(song, action.trackKey);
  if ("stepIndex" in action) integer(action.stepIndex, 0, 15, "stepIndex");
  if ("pitch" in action && action.pitch !== undefined) checkPitch(action.pitch);
  if ("duration" in action && action.duration !== undefined) integer(action.duration, 1, 32, "duration");
  if ("instId" in action && !(INSTRUMENT_IDS as readonly string[]).includes(action.instId)) fail("invalidInstrument");
  switch (action.action) {
    case "setBpm": integer(action.bpm, 60, 180, "bpm"); break;
    case "addTrack": if (song.tracks.length >= 8) fail("trackLimit"); break;
    case "removeTrack": if (song.tracks.length <= 1) fail("lastTrack"); break;
    case "addBar":
      if (song.bars.length >= 16) fail("barLimit");
      if (action.copyFrom !== undefined) checkBar(song, action.copyFrom, "copyFrom");
      break;
    case "removeBar": if (song.bars.length <= 1) fail("lastBar"); break;
    case "copyBar": checkBar(song, action.fromBar, "fromBar"); checkBar(song, action.toBar, "toBar"); break;
    case "clearSong": if (action.barsCount !== undefined) integer(action.barsCount, 1, 16, "barsCount"); break;
    case "setTrackPattern":
      if (action.steps.length !== 16 || action.steps.some((v) => typeof v !== "boolean")) fail("invalidPattern");
      if (action.pitches) {
        if (action.pitches.length !== 16) fail("invalidPattern");
        action.pitches.forEach((pitch) => { if (pitch !== null) checkPitch(pitch); });
      }
      if (action.durations) {
        if (action.durations.length !== 16) fail("invalidPattern");
        action.durations.forEach((duration) => { if (duration !== null) integer(duration, 1, 32, "duration"); });
      }
      break;
    case "setNotePitch":
    case "setNoteDuration":
      if (!song.bars[action.barIndex].steps[action.trackKey]?.[action.stepIndex]) fail("inactiveNote");
      break;
  }
}

// The same pure reducer validates previews, UI edits and committed batches.
export function applyEdits(song: SongState, actions: EditAction[]) {
  if (actions.length < 1 || actions.length > 100) fail("batchLimit");
  let next = song;
  const changes = actions.map((action, index) => {
    try {
      const before = next;
      next = editSong(before, action);
      return editSummary(before, next, action);
    } catch (error) {
      throw new Error(`actions[${index}]: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  return { song: next, changes, changed: JSON.stringify(song) !== JSON.stringify(next) };
}

export function editSummary(before: SongState, after: SongState, action: EditAction) {
  const result: Record<string, string | number | boolean | null> = { action: action.action };
  for (const key of ["barIndex", "trackKey", "stepIndex", "fromBar", "toBar"] as const) {
    if (key in action) {
      const value = (action as unknown as Record<string, unknown>)[key];
      if (typeof value === "string" || typeof value === "number") result[key] = value;
    }
  }
  if ("stepIndex" in action) {
    const bar = after.bars[action.barIndex];
    result.enabled = Boolean(bar.steps[action.trackKey]?.[action.stepIndex]);
    result.pitch = bar.pitches?.[action.trackKey]?.[action.stepIndex] ?? null;
    result.duration = result.enabled ? bar.durations?.[action.trackKey]?.[action.stepIndex] ?? 1 : null;
  }
  if (action.action === "setTrackPattern") result.enabledSteps = action.steps.filter(Boolean).length;
  if (action.action === "setBpm" || action.action === "loadPreset") result.bpm = after.bpm;
  if (action.action === "addTrack") {
    result.trackKey = after.tracks.find((track) => !before.tracks.some((old) => old.trackKey === track.trackKey))!.trackKey;
  }
  if (action.action === "addTrack" || action.action === "changeInstrument") result.instId = action.instId;
  if (action.action === "addBar") result.barIndex = after.bars.length - 1;
  if (action.action === "removeBar") result.barIndex = action.barIndex ?? before.bars.length - 1;
  return result;
}

export function readSongView(song: SongState, options: ReadOptions = {}) {
  const barIndices = options.barIndices ?? song.bars.map((_, index) => index);
  const trackKeys = options.trackKeys ?? song.tracks.map((track) => track.trackKey);
  if (!barIndices.length || new Set(barIndices).size !== barIndices.length || !trackKeys.length || new Set(trackKeys).size !== trackKeys.length) fail("invalidSelection");
  barIndices.forEach((index) => checkBar(song, index));
  trackKeys.forEach((key) => checkTrack(song, key));
  const includePatterns = options.includePatterns ?? Boolean(options.barIndices || options.trackKeys);
  return {
    bpm: song.bpm, totalBars: song.bars.length, stepsPerBar: 16,
    tracks: song.tracks.filter((track) => trackKeys.includes(track.trackKey)),
    ...(includePatterns ? { bars: barIndices.map((barIndex) => {
      const bar = song.bars[barIndex];
      return {
        barIndex,
        steps: Object.fromEntries(trackKeys.map((key) => [key, [...(bar.steps[key] ?? new Array(16).fill(false))]])),
        pitches: Object.fromEntries(trackKeys.map((key) => [key, [...(bar.pitches?.[key] ?? new Array(16).fill(null))]])),
        durations: Object.fromEntries(trackKeys.map((key) => [key, (bar.steps[key] ?? new Array(16).fill(false)).map((on, index) => on ? bar.durations?.[key]?.[index] ?? 1 : null)])),
      };
    }) } : {}),
  };
}

export function editSong(current: SongState, action: EditAction): SongState {
  validateAction(current, action);

  switch (action.action) {
    case "setBpm":
      return {
        ...current,
        bpm: action.bpm
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
      let index = 1;
      while (current.tracks.some((track) => track.trackKey === `t_${index}`)) index++;
      const newKey = `t_${index}`;
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

    case "setStep":
    case "toggleStep": {
      const bIdx = action.barIndex;
      const sIdx = action.stepIndex;
      const newBars = current.bars.map((bar, idx) => {
        if (idx !== bIdx) return bar;
        const trackSteps = [...(bar.steps[action.trackKey] || new Array(16).fill(false))];
        trackSteps[sIdx] = action.action === "setStep" ? action.enabled : !trackSteps[sIdx];
        const nextSteps = { ...bar.steps, [action.trackKey]: trackSteps };

        let nextPitches = bar.pitches;
        if (action.pitch !== undefined || !trackSteps[sIdx]) {
          const trackPitches = [...(bar.pitches?.[action.trackKey] || new Array(16).fill(null))];
          trackPitches[sIdx] = trackSteps[sIdx] ? action.pitch ?? null : null;
          nextPitches = { ...bar.pitches, [action.trackKey]: trackPitches };
        }

        let nextDurations = bar.durations;
        if (action.duration !== undefined) {
          const trackDurations = [...(bar.durations?.[action.trackKey] || new Array(16).fill(null))];
          trackDurations[sIdx] = trackSteps[sIdx] ? action.duration : null;
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
      const bIdx = action.barIndex;
      const sIdx = action.stepIndex;
      const newBars = current.bars.map((bar, idx) => {
        if (idx !== bIdx) return bar;
        const trackDurations = [...(bar.durations?.[action.trackKey] || new Array(16).fill(null))];
        trackDurations[sIdx] = action.duration;
        const nextDurations = { ...(bar.durations || {}), [action.trackKey]: trackDurations };
        return { ...bar, durations: nextDurations };
      });
      return { ...current, bars: newBars };
    }

    case "setNotePitch": {
      const bIdx = action.barIndex;
      const sIdx = action.stepIndex;
      const newBars = current.bars.map((bar, idx) => {
        if (idx !== bIdx) return bar;
        const trackPitches = [...(bar.pitches?.[action.trackKey] || new Array(16).fill(null))];
        trackPitches[sIdx] = Number(action.pitch.toFixed(2));
        const nextPitches = { ...(bar.pitches || {}), [action.trackKey]: trackPitches };
        return { ...bar, pitches: nextPitches };
      });
      return { ...current, bars: newBars };
    }

    case "setTrackPattern": {
      const bIdx = action.barIndex;
      const newBars = current.bars.map((bar, idx) => {
        if (idx !== bIdx) return bar;
        const rawSteps = action.steps.slice(0, 16);
        const nextSteps = {
          ...bar.steps,
          [action.trackKey]: rawSteps
        };
        const nextPitches = bar.pitches ? { ...bar.pitches } : {};
        if (action.pitches) {
          nextPitches[action.trackKey] = rawSteps.map((on, i) => on ? action.pitches![i] : null);
        } else {
          const oldP = bar.pitches?.[action.trackKey] || new Array(16).fill(null);
          nextPitches[action.trackKey] = rawSteps.map((on, i) => (on ? oldP[i] : null));
        }

        const nextDurations = bar.durations ? { ...bar.durations } : {};
        if (action.durations) {
          nextDurations[action.trackKey] = rawSteps.map((on, i) => on ? action.durations![i] ?? 1 : null);
        } else {
          // 未显式指定 durations 时，默认激活音符为 1，非音符为 null，绝不残留旧预设时值
          nextDurations[action.trackKey] = rawSteps.map((on) => (on ? 1 : null));
        }
        return { steps: nextSteps, pitches: nextPitches, durations: nextDurations };
      });
      return { ...current, bars: newBars };
    }

    case "copyBar": {
      const from = action.fromBar;
      const to = action.toBar;
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
      const bIdx = action.barIndex;
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
      const targetCount = action.barsCount ?? current.bars.length;
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

