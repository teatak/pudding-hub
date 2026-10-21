import { pudding } from "@pudding/widget";
import { z } from "zod";
import type { EditAction, EditOptions, ReadOptions } from "./types";
import { INSTRUMENT_IDS, readSong, applyEdits, readSongView } from "./song";
import { t, errorText, setLocale } from "./text";
export { INSTRUMENT_IDS, getDefaultSong, readSong, editSong } from "./song";

// One widget instance serializes read/modify/write. Storage CAS still protects
// other open instances; an explicit version also protects a model's earlier read.
let writeQueue: Promise<unknown> = Promise.resolve();
export function editBatch(actions: EditAction[], options: EditOptions = {}, signal?: AbortSignal) {
  const execute = async () => {
    if (signal?.aborted) throw new Error(t("cancelled"));
    const old = await pudding.storage.read({ signal });
    if (options.expectedStorageVersion !== undefined && options.expectedStorageVersion !== old.version) {
      throw new Error(t("storageConflict").replace("{version}", String(old.version)));
    }
    const result = applyEdits(readSong(old.data), actions);
    if (signal?.aborted) throw new Error(t("cancelled"));
    const committed = !options.dryRun && result.changed;
    const saved = committed ? await pudding.storage.write({
      expectedVersion: old.version,
      data: { ...old.data, song: result.song },
    }) : old;
    return {
      dryRun: Boolean(options.dryRun), committed, changed: result.changed,
      changes: result.changes, totalBars: result.song.bars.length,
      trackCount: result.song.tracks.length, storageVersion: saved.version,
    };
  };
  const next = writeQueue.then(execute, execute);
  writeQueue = next.then(() => {}, () => {});
  return next;
}

export function edit(action: EditAction, signal?: AbortSignal, options: EditOptions = {}) {
  return editBatch([action], options, signal);
}

export type PlaybackController = {
  play: () => void;
  pause: () => void;
  isPlaying: () => boolean;
  getStep: () => number;
  getAudioState?: () => string;
};
let playbackController: PlaybackController | null = null;
export function registerPlaybackController(controller: PlaybackController) {
  playbackController = controller;
  return () => { if (playbackController === controller) playbackController = null; };
}
function playbackStatus() {
  return {
    isPlaying: playbackController?.isPlaying() ?? false,
    playStep: playbackController?.getStep() ?? 0,
    audioState: playbackController?.getAudioState?.() ?? "unavailable",
  };
}

function register() {
  setLocale(pudding.locale.read());
  const barIndex = z.number().int().min(0).max(15).describe(t("paramBar"));
  const trackKey = z.string().min(1).describe(t("paramTrack"));
  const stepIndex = z.number().int().min(0).max(15).describe(t("paramStep"));
  const pitch = z.number().min(20).max(10000).describe(t("paramPitch"));
  const duration = z.number().int().min(1).max(32).describe(t("paramDuration"));
  const instId = z.enum(INSTRUMENT_IDS);
  const options = {
    dryRun: z.boolean().optional().describe(t("paramDryRun")),
    expectedStorageVersion: z.number().int().nonnegative().optional().describe(t("paramVersion")),
  };
  const schemas = {
    setStep: z.object({ action: z.literal("setStep"), barIndex, trackKey, stepIndex, enabled: z.boolean(), pitch: pitch.optional(), duration: duration.optional() }).strict(),
    toggleStep: z.object({ action: z.literal("toggleStep"), barIndex, trackKey, stepIndex, pitch: pitch.optional(), duration: duration.optional() }).strict(),
    setNotePitch: z.object({ action: z.literal("setNotePitch"), barIndex, trackKey, stepIndex, pitch }).strict(),
    setNoteDuration: z.object({ action: z.literal("setNoteDuration"), barIndex, trackKey, stepIndex, duration }).strict(),
    setTrackPattern: z.object({ action: z.literal("setTrackPattern"), barIndex, trackKey,
      steps: z.array(z.boolean()).length(16).describe(t("paramSteps")),
      pitches: z.array(pitch.nullable()).length(16).optional(),
      durations: z.array(duration.nullable()).length(16).optional().describe(t("paramDurations")),
    }).strict(),
    copyBar: z.object({ action: z.literal("copyBar"), fromBar: barIndex, toBar: barIndex }).strict(),
    clearBar: z.object({ action: z.literal("clearBar"), barIndex }).strict(),
    clearSong: z.object({ action: z.literal("clearSong"), barsCount: z.number().int().min(1).max(16).optional() }).strict(),
    setBpm: z.object({ action: z.literal("setBpm"), bpm: z.number().int().min(60).max(180) }).strict(),
    addBar: z.object({ action: z.literal("addBar"), copyFrom: barIndex.optional() }).strict(),
    removeBar: z.object({ action: z.literal("removeBar"), barIndex: barIndex.optional() }).strict(),
    addTrack: z.object({ action: z.literal("addTrack"), instId }).strict(),
    removeTrack: z.object({ action: z.literal("removeTrack"), trackKey }).strict(),
    changeInstrument: z.object({ action: z.literal("changeInstrument"), trackKey, instId }).strict(),
    loadPreset: z.object({ action: z.literal("loadPreset"), presetName: z.enum(["mario", "donkeyKong", "oriental", "lofi"]) }).strict(),
  };
  const batchAction = z.discriminatedUnion("action", [
    schemas.setStep, schemas.setTrackPattern, schemas.copyBar, schemas.clearBar,
    schemas.setNotePitch, schemas.setNoteDuration, schemas.setBpm, schemas.addBar,
    schemas.removeBar, schemas.addTrack, schemas.removeTrack, schemas.changeInstrument,
    schemas.clearSong, schemas.loadPreset,
  ]);
  const wrap = <T, R>(run: (input: T, signal?: AbortSignal) => Promise<R>) =>
    async (input: T, context?: { signal?: AbortSignal }) => {
      try { return await run(input, context?.signal); }
      catch (error) { throw new Error(errorText(error)); }
    };
  const mutation = (name: keyof typeof schemas, description: string) => {
    const { action: _action, ...fields } = schemas[name].shape;
    return pudding.defineInterface({
      name, description: t(description) + " " + t("mutationHint"),
      input: z.object({ ...fields, ...options }).strict(),
      run: wrap(async (input: Record<string, unknown>, signal) => {
        const { dryRun, expectedStorageVersion, ...fields } = input;
        const action = schemas[name].parse({ ...fields, action: name }) as EditAction;
        return edit(action, signal, { dryRun: dryRun as boolean | undefined, expectedStorageVersion: expectedStorageVersion as number | undefined });
      }),
    });
  };
  return [
    pudding.defineInterface({
      name: "getSong", description: t("descGetSong"),
      input: z.object({
        includePatterns: z.boolean().optional().describe(t("paramIncludePatterns")),
        barIndices: z.array(barIndex).min(1).max(16).optional(),
        trackKeys: z.array(trackKey).min(1).max(8).optional(),
      }).strict(),
      run: wrap(async (input: ReadOptions, signal) => {
        const old = await pudding.storage.read({ signal });
        return { ...readSongView(readSong(old.data), input), ...playbackStatus(), availableInstruments: INSTRUMENT_IDS, storageVersion: old.version };
      }),
    }),
    pudding.defineInterface({
      name: "editSong", description: t("descEditSong"),
      input: z.object({ actions: z.array(batchAction).min(1).max(100), ...options }).strict(),
      run: wrap(async (input: { actions: EditAction[] } & EditOptions, signal) => editBatch(input.actions, input, signal)),
    }),
    mutation("setStep", "descSetStep"), mutation("copyBar", "descCopyBar"),
    mutation("setBpm", "descSetBpm"), mutation("loadPreset", "descLoadPreset"),
    mutation("addBar", "descAddBar"), mutation("removeBar", "descRemoveBar"),
    mutation("setTrackPattern", "descSetTrackPattern"), mutation("toggleStep", "descToggleStep"),
    mutation("setNoteDuration", "descSetNoteDuration"), mutation("setNotePitch", "descSetNotePitch"),
    mutation("changeInstrument", "descChangeInstrument"), mutation("addTrack", "descAddTrack"),
    mutation("removeTrack", "descRemoveTrack"), mutation("clearBar", "descClearBar"), mutation("clearSong", "descClearSong"),
    pudding.defineInterface({
      name: "play", description: t("descPlay"), input: z.object({}).strict(),
      run: wrap(async () => {
        if (!playbackController) throw new Error(t("playbackUnavailable"));
        playbackController.play(); return playbackStatus();
      }),
    }),
    pudding.defineInterface({
      name: "pause", description: t("descPause"), input: z.object({}).strict(),
      run: wrap(async () => {
        if (!playbackController) throw new Error(t("playbackUnavailable"));
        playbackController.pause(); return playbackStatus();
      }),
    }),
    pudding.defineInterface({
      name: "getPlaybackStatus", description: t("descGetPlaybackStatus"), input: z.object({}).strict(),
      run: wrap(async () => playbackStatus()),
    }),
  ];
}
let interfaces = register();
pudding.locale.subscribe(() => { interfaces.forEach((remove) => remove()); interfaces = register(); });
