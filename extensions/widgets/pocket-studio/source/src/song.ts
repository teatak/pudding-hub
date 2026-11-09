import type { SongState, EditAction, BarData, ReadOptions, ExtraNote } from "./types";
import { createMarioSong, createDonkeyKongSong, createOrientalSong, createLofiSong } from "./demoTracks";
import { resolvePitch } from "./instruments";
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

function sameMidi(f1: number, f2: number): boolean {
  if (!f1 || !f2 || f1 <= 0 || f2 <= 0) return false;
  return Math.round(69 + 12 * Math.log2(f1 / 440)) === Math.round(69 + 12 * Math.log2(f2 / 440));
}

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
  if ("fromPitch" in action && action.fromPitch !== undefined) checkPitch(action.fromPitch);
  if ("toPitch" in action && action.toPitch !== undefined) checkPitch(action.toPitch);
  if ("duration" in action && action.duration !== undefined) integer(action.duration, 1, 32, "duration");
  if ("instId" in action && !(INSTRUMENT_IDS as readonly string[]).includes(action.instId)) fail("invalidInstrument");
  switch (action.action) {
    case "setBpm": integer(action.bpm, 60, 180, "bpm"); break;
    case "setTrackReverb":
      if (typeof action.reverb !== "number" || !Number.isFinite(action.reverb) || action.reverb < 0 || action.reverb > 1) {
        fail("invalidRange", "reverb", { min: 0, max: 1 });
      }
      break;
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
  if (action.action === "toggleMuteTrack" || action.action === "setTrackMute") {
    result.muted = Boolean(after.tracks.find(t => t.trackKey === action.trackKey)?.muted);
  }
  if (action.action === "setTrackReverb") {
    result.reverb = after.tracks.find(t => t.trackKey === action.trackKey)?.reverb ?? null;
  }
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

    case "toggleMuteTrack":
      return {
        ...current,
        tracks: current.tracks.map((t) =>
          t.trackKey === action.trackKey ? { ...t, muted: !t.muted } : t
        )
      };

    case "setTrackMute":
      return {
        ...current,
        tracks: current.tracks.map((t) =>
          t.trackKey === action.trackKey ? { ...t, muted: action.muted } : t
        )
      };

    case "setTrackReverb":
      return {
        ...current,
        tracks: current.tracks.map((t) =>
          t.trackKey === action.trackKey
            ? { ...t, reverb: Math.max(0, Math.min(1, Number(action.reverb.toFixed(2)))) }
            : t
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
        const nextExtra = bar.extraNotes ? { ...bar.extraNotes } : undefined;
        if (nextExtra) delete nextExtra[action.trackKey];
        return {
          steps: nextSteps,
          pitches: nextPitches,
          durations: nextDurations,
          ...(nextExtra && Object.keys(nextExtra).length > 0 ? { extraNotes: nextExtra } : {}),
        };
      });
      return { ...current, tracks: newTracks, bars: newBars };
    }

    case "clearTrack": {
      const newBars = current.bars.map((bar) => {
        const nextSteps = { ...bar.steps, [action.trackKey]: new Array(16).fill(false) };
        const nextPitches = bar.pitches ? { ...bar.pitches, [action.trackKey]: new Array(16).fill(null) } : undefined;
        const nextDurations = bar.durations ? { ...bar.durations, [action.trackKey]: new Array(16).fill(null) } : undefined;
        const nextExtra = bar.extraNotes ? { ...bar.extraNotes } : undefined;
        if (nextExtra) delete nextExtra[action.trackKey];
        return {
          steps: nextSteps,
          pitches: nextPitches,
          durations: nextDurations,
          ...(nextExtra && Object.keys(nextExtra).length > 0 ? { extraNotes: nextExtra } : {}),
        };
      });
      return { ...current, bars: newBars };
    }

    case "addBar": {
      if (current.bars.length >= 16) return current;
      const steps: Record<string, boolean[]> = {};
      const pitches: Record<string, (number | null)[]> = {};
      const durations: Record<string, (number | null)[]> = {};
      let extraNotes: Record<string, ExtraNote[]> | undefined;
      if (action.copyFrom !== undefined && current.bars[action.copyFrom]) {
        const src = current.bars[action.copyFrom];
        current.tracks.forEach((t) => {
          steps[t.trackKey] = [...(src.steps[t.trackKey] || new Array(16).fill(false))];
          pitches[t.trackKey] = [...(src.pitches?.[t.trackKey] || new Array(16).fill(null))];
          durations[t.trackKey] = [...(src.durations?.[t.trackKey] || new Array(16).fill(null))];
        });
        if (src.extraNotes) {
          extraNotes = JSON.parse(JSON.stringify(src.extraNotes)) as Record<string, ExtraNote[]>;
        }
      } else {
        current.tracks.forEach((t) => {
          steps[t.trackKey] = new Array(16).fill(false);
          pitches[t.trackKey] = new Array(16).fill(null);
          durations[t.trackKey] = new Array(16).fill(null);
        });
      }
      return {
        ...current,
        bars: [...current.bars, { steps, pitches, durations, ...(extraNotes ? { extraNotes } : {}) }],
      };
    }

    case "removeBar": {
      if (current.bars.length <= 1) return current;
      const targetIdx =
        action.barIndex !== undefined && action.barIndex >= 0 && action.barIndex < current.bars.length
          ? action.barIndex
          : current.bars.length - 1;
      return { ...current, bars: current.bars.filter((_, idx) => idx !== targetIdx) };
    }

    case "togglePitchStep": {
      const bIdx = action.barIndex;
      const sIdx = action.stepIndex;
      const targetFreq = Number(action.pitch.toFixed(2));
      const dur = action.duration ?? 1;
      const instId = current.tracks.find((t) => t.trackKey === action.trackKey)?.instId || "lead";

      const newBars = current.bars.map((bar, idx) => {
        if (idx !== bIdx) return bar;
        const trackSteps = [...(bar.steps[action.trackKey] || new Array(16).fill(false))];
        const trackPitches = [...(bar.pitches?.[action.trackKey] || new Array(16).fill(null))];
        const trackDurations = [...(bar.durations?.[action.trackKey] || new Array(16).fill(null))];
        const trackExtras = [...(bar.extraNotes?.[action.trackKey] || [])];

        const primaryOn = Boolean(trackSteps[sIdx]);
        const primaryPitch = primaryOn ? (resolvePitch(instId, sIdx, trackPitches[sIdx]) ?? 440) : null;

        if (!primaryOn) {
          // 当前步进还没有主音符：直接写入主音符槽
          trackSteps[sIdx] = true;
          trackPitches[sIdx] = targetFreq;
          trackDurations[sIdx] = dur;
        } else if (primaryPitch !== null && sameMidi(primaryPitch, targetFreq)) {
          // 点击的是当前主音符所在的音高行：若同位置还有其他音高的附加音块，则提升第一个附加音块为主音符；否则关闭主音符
          const sameStepExtraIdx = trackExtras.findIndex((e) => e.step === sIdx);
          if (sameStepExtraIdx >= 0) {
            const promoted = trackExtras[sameStepExtraIdx];
            trackExtras.splice(sameStepExtraIdx, 1);
            trackSteps[sIdx] = true;
            trackPitches[sIdx] = promoted.pitch;
            trackDurations[sIdx] = promoted.duration;
          } else {
            trackSteps[sIdx] = false;
            trackPitches[sIdx] = null;
            trackDurations[sIdx] = null;
          }
        } else {
          // 当前步进已有其他音高的主音符：在 extraNotes 中独立开关该音高的音块（支持同位置多音块/和弦）
          const existingIdx = trackExtras.findIndex((e) => e.step === sIdx && sameMidi(e.pitch, targetFreq));
          if (existingIdx >= 0) {
            trackExtras.splice(existingIdx, 1);
          } else {
            trackExtras.push({ step: sIdx, pitch: targetFreq, duration: dur });
          }
        }

        const nextExtraNotes = { ...(bar.extraNotes || {}) };
        if (trackExtras.length > 0) {
          nextExtraNotes[action.trackKey] = trackExtras;
        } else {
          delete nextExtraNotes[action.trackKey];
        }

        return {
          steps: { ...bar.steps, [action.trackKey]: trackSteps },
          pitches: { ...(bar.pitches || {}), [action.trackKey]: trackPitches },
          durations: { ...(bar.durations || {}), [action.trackKey]: trackDurations },
          ...(Object.keys(nextExtraNotes).length > 0 ? { extraNotes: nextExtraNotes } : {}),
        };
      });
      return { ...current, bars: newBars };
    }

    case "setPitchNoteDuration": {
      const bIdx = action.barIndex;
      const sIdx = action.stepIndex;
      const targetFreq = Number(action.pitch.toFixed(2));
      const instId = current.tracks.find((t) => t.trackKey === action.trackKey)?.instId || "lead";

      const newBars = current.bars.map((bar, idx) => {
        if (idx !== bIdx) return bar;
        const primaryOn = Boolean(bar.steps[action.trackKey]?.[sIdx]);
        const primaryPitch = primaryOn ? (resolvePitch(instId, sIdx, bar.pitches?.[action.trackKey]?.[sIdx]) ?? 440) : null;

        if (primaryOn && primaryPitch !== null && sameMidi(primaryPitch, targetFreq)) {
          const trackDurations = [...(bar.durations?.[action.trackKey] || new Array(16).fill(null))];
          trackDurations[sIdx] = action.duration;
          return {
            ...bar,
            durations: { ...(bar.durations || {}), [action.trackKey]: trackDurations },
          };
        }

        const trackExtras = [...(bar.extraNotes?.[action.trackKey] || [])];
        const existingIdx = trackExtras.findIndex((e) => e.step === sIdx && sameMidi(e.pitch, targetFreq));
        if (existingIdx >= 0) {
          trackExtras[existingIdx] = { ...trackExtras[existingIdx], duration: action.duration };
          return {
            ...bar,
            extraNotes: { ...(bar.extraNotes || {}), [action.trackKey]: trackExtras },
          };
        }
        return bar;
      });
      return { ...current, bars: newBars };
    }

    case "changePitchNote": {
      const bIdx = action.barIndex;
      const sIdx = action.stepIndex;
      const fromFreq = Number(action.fromPitch.toFixed(2));
      const toFreq = Number(action.toPitch.toFixed(2));
      const instId = current.tracks.find((t) => t.trackKey === action.trackKey)?.instId || "lead";

      const newBars = current.bars.map((bar, idx) => {
        if (idx !== bIdx) return bar;
        const primaryOn = Boolean(bar.steps[action.trackKey]?.[sIdx]);
        const primaryPitch = primaryOn ? (resolvePitch(instId, sIdx, bar.pitches?.[action.trackKey]?.[sIdx]) ?? 440) : null;

        if (primaryOn && primaryPitch !== null && sameMidi(primaryPitch, fromFreq)) {
          const trackPitches = [...(bar.pitches?.[action.trackKey] || new Array(16).fill(null))];
          trackPitches[sIdx] = toFreq;
          return {
            ...bar,
            pitches: { ...(bar.pitches || {}), [action.trackKey]: trackPitches },
          };
        }

        const trackExtras = [...(bar.extraNotes?.[action.trackKey] || [])];
        const existingIdx = trackExtras.findIndex((e) => e.step === sIdx && sameMidi(e.pitch, fromFreq));
        if (existingIdx >= 0) {
          trackExtras[existingIdx] = { ...trackExtras[existingIdx], pitch: toFreq };
          return {
            ...bar,
            extraNotes: { ...(bar.extraNotes || {}), [action.trackKey]: trackExtras },
          };
        }
        return bar;
      });
      return { ...current, bars: newBars };
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

        return {
          ...bar,
          steps: nextSteps,
          pitches: nextPitches,
          durations: nextDurations,
        };
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
        return {
          ...bar,
          steps: nextSteps,
          pitches: nextPitches,
          durations: nextDurations,
        };
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
            : undefined,
          ...(sourceBar.extraNotes
            ? { extraNotes: JSON.parse(JSON.stringify(sourceBar.extraNotes)) as Record<string, ExtraNote[]> }
            : {}),
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
