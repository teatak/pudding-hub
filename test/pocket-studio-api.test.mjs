import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks, createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const desktop = process.env.PUDDING_DESKTOP_DIR || fileURLToPath(new URL("../../pudding-desktop", import.meta.url));
const require = createRequire(path.join(desktop, "web/package.json"));
const source = new URL("../widgets/pocket-studio/source/src/", import.meta.url);
const interfaces = new Map();
let stored, writes, locale = "en", localeChanged, failWrite = false, readGate;
let exported = [], exportSaved = true;
globalThis.__musicSDK = {
  exportFile: async request => { exported.push(request); return { saved: exportSaved }; },
  storage: {
    async read({ signal } = {}) { if (readGate) await readGate; signal?.throwIfAborted(); return structuredClone(stored); },
    async write(input) {
      if (failWrite) { failWrite = false; throw new Error("storage temporarily unavailable"); }
      if (input.expectedVersion !== stored.version) throw new Error("widget_data_conflict");
      stored = { version: stored.version + 1, data: JSON.parse(JSON.stringify(input.data)) };
      writes++;
      return structuredClone(stored);
    },
  },
  locale: { read: () => locale, subscribe: (fn) => { localeChanged = fn; return () => {}; } },
  defineInterface(definition) { interfaces.set(definition.name, definition); return () => interfaces.delete(definition.name); },
};
const sdkURL = "data:text/javascript,export const pudding=globalThis.__musicSDK";
const hook = registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@pudding/widget") return { url: sdkURL, shortCircuit: true };
  if (specifier === "zod") return { url: pathToFileURL(require.resolve("zod")).href, shortCircuit: true };
  if (context.parentURL?.startsWith(source.href) && specifier.startsWith("./") && !path.extname(specifier)) {
    return next(specifier + ".ts", context);
  }
  return next(specifier, context);
} });
const api = await import(new URL("api.ts", source));
const { encodeProject, parseProject, normalizeSong, maxProjectBytes } = await import(new URL("project.ts", source));
const { encodeWav, bytesToBase64 } = await import(new URL("wav.ts", source));
const { applyEdits } = await import(new URL("song.ts", source));
const { DICT } = await import(new URL("text.ts", source));
const { toJSONSchema } = await import(pathToFileURL(require.resolve("zod")).href);
hook.deregister();
const invoke = (name, input = {}, signal) => {
  const definition = interfaces.get(name);
  return definition.run(definition.input.parse(input), { signal });
};
const track = "t_lead";
const step = (barIndex = 0, stepIndex = 4) => ({ action: "setStep", barIndex, trackKey: track, stepIndex, enabled: true, pitch: 440, duration: 2 });
let removePlayback;
beforeEach(() => {
  removePlayback?.(); removePlayback = null;
  locale = "en"; localeChanged(); writes = 0; exported = []; exportSaved = true; readGate = null; failWrite = false;
  delete globalThis.__musicSDK.capabilities;
  stored = { version: 7, data: { song: api.getDefaultSong(), unrelated: { preserve: true } } };
});

test("summary and selected patterns are read on demand without mutation", async () => {
  const summary = await invoke("getSong");
  assert.equal(summary.bars, undefined);
  assert.equal(summary.stepsPerBar, 16);
  assert.equal(summary.storageVersion, 7);
  const selection = await invoke("getSong", { barIndices: [2, 0], trackKeys: [track] });
  assert.deepEqual(selection.bars.map(b => b.barIndex), [2, 0]);
  assert.deepEqual(Object.keys(selection.bars[0].steps), [track]);
  assert.deepEqual(selection.tracks.map(t => t.trackKey), [track]);
  const all = await invoke("getSong", { includePatterns: true });
  assert.equal(all.bars.length, stored.data.song.bars.length);
  await assert.rejects(async () => invoke("getSong", { barIndices: [15] }), /range/);
  await assert.rejects(async () => invoke("getSong", { trackKeys: ["missing"] }), /does not exist/);
  await assert.rejects(async () => invoke("getSong", { barIndices: [0, 0] }), /duplicates/);
  assert.equal(writes, 0);
});

test("single-cell mutations return bounded normalized receipts and preserve other notes", async () => {
  await invoke("clearSong", { barsCount: 8 });
  const before = structuredClone(stored.data.song);
  const { action, ...input } = step();
  const result = await invoke("setStep", input);
  assert.equal(result.song, undefined);
  assert.equal(result.bars, undefined);
  assert.deepEqual(result.changes[0], { ...step(), duration: 2 });
  assert.equal(result.committed, true);
  assert.ok(JSON.stringify(result).length < 500);
  assert.equal(stored.data.song.bars[0].steps[track][4], true);
  assert.deepEqual(stored.data.song.bars[1], before.bars[1]);
  const fullBytes = JSON.stringify({ song: stored.data.song, storageVersion: stored.version }).length;
  assert.ok(fullBytes > JSON.stringify(result).length * 20);
  const pitchResult = await invoke("setNotePitch", { barIndex: 0, trackKey: track, stepIndex: 4, pitch: 523.25 });
  assert.equal(pitchResult.changes[0].pitch, 523.25);
});

test("batch edits and copy commit exactly once, with independent deep copies and preserved data", async () => {
  const result = await invoke("editSong", { expectedStorageVersion: 7, actions: [
    { action: "clearSong", barsCount: 8 }, step(), { action: "copyBar", fromBar: 0, toBar: 3 },
    { ...step(3, 4), pitch: 523.25 },
  ] });
  assert.equal(writes, 1); assert.equal(stored.version, 8);
  assert.equal(result.changes.length, 4);
  assert.equal(stored.data.song.bars[0].pitches[track][4], 440);
  assert.equal(stored.data.song.bars[3].pitches[track][4], 523.25);
  assert.deepEqual(stored.data.unrelated, { preserve: true });
  const result2 = await invoke("copyBar", { fromBar: 3, toBar: 2 });
  assert.equal(result2.totalBars, 8);
  assert.deepEqual(stored.data.song.bars[2], stored.data.song.bars[3]);
});

test("invalid later actions reject the entire batch without mutating the input or storage", async () => {
  const before = structuredClone(stored);
  await assert.rejects(invoke("editSong", { actions: [step(), { ...step(), trackKey: "missing" }] }), /actions\[1\].*does not exist/);
  assert.deepEqual(stored, before); assert.equal(writes, 0);
  assert.throws(() => applyEdits(stored.data.song, [step(), { ...step(15), enabled: false }]), /actions\[1\].*range/);
  assert.deepEqual(stored, before);
  await assert.rejects(async () => invoke("editSong", { actions: [step(), { ...step(), pitch: -1 }] }));
  assert.equal(writes, 0);
});

test("all mutation paths reject invalid ranges, missing tracks and invalid frequencies", async () => {
  for (const [name, input] of [
    ["setStep", { barIndex: 15, trackKey: track, stepIndex: 0, enabled: true }],
    ["toggleStep", { barIndex: 0, trackKey: "missing", stepIndex: 0 }],
    ["setNotePitch", { barIndex: 0, trackKey: track, stepIndex: 0, pitch: -440 }],
    ["toggleStep", { barIndex: 0, trackKey: track, stepIndex: 0, pitch: Infinity }],
    ["setTrackPattern", { barIndex: 0, trackKey: track, steps: Array(16).fill(true), pitches: Array(16).fill(10001) }],
    ["setTrackPattern", { barIndex: 0, trackKey: "missing", steps: Array(16).fill(true) }],
    ["copyBar", { fromBar: 15, toBar: 0 }], ["copyBar", { fromBar: 0, toBar: 15 }],
    ["addBar", { copyFrom: 15 }], ["removeBar", { barIndex: 15 }],
    ["removeTrack", { trackKey: "missing" }], ["changeInstrument", { trackKey: "missing", instId: "hat" }],
  ]) await assert.rejects(async () => invoke(name, input), undefined, name);
  assert.equal(writes, 0);
});

test("business errors identify the field, current bounds and valid track keys in each language", async () => {
  for (const lang of ["zh-CN", "zh-TW", "en"]) {
    locale = lang; localeChanged();
    await assert.rejects(invoke("copyBar", { fromBar: 0, toBar: 15 }), error =>
      /actions\[0\]: toBar/.test(error.message) && error.message.includes("0–3") && error.message.length < 150);
    const missing = "$& {allowed}";
    await assert.rejects(invoke("setStep", { barIndex: 0, trackKey: missing, stepIndex: 0, enabled: true }), error =>
      error.message.includes("trackKey") && error.message.includes(missing) &&
      error.message.includes(stored.data.song.tracks.map(track => track.trackKey).join(", ")));
  }
  assert.equal(writes, 0);
});

test("dry-run and commit share normalized results; dry-run never saves or touches playback", async () => {
  let playing = true, paused = 0;
  removePlayback = api.registerPlaybackController({ play() { playing = true; }, pause() { paused++; playing = false; }, isPlaying: () => playing, getStep: () => 6 });
  const input = { expectedStorageVersion: 7, actions: [step(), { action: "copyBar", fromBar: 0, toBar: 2 }] };
  const before = structuredClone(stored);
  const preview = await invoke("editSong", { ...input, dryRun: true });
  assert.deepEqual(stored, before); assert.equal(writes, 0);
  assert.equal(preview.committed, false); assert.equal(preview.dryRun, true);
  assert.equal(preview.storageVersion, 7);
  const committed = await invoke("editSong", input);
  assert.deepEqual(committed.changes, preview.changes);
  assert.equal(writes, 1);
  assert.equal((await invoke("getPlaybackStatus")).isPlaying, true);
  assert.equal(paused, 0);
  const single = await invoke("setBpm", { bpm: 100, dryRun: true });
  assert.equal(single.changes[0].bpm, 100); assert.equal(writes, 1);
});

test("deterministic retries, no-op edits and empty-net-change batches do not write", async () => {
  const input = { barIndex: 0, trackKey: track, stepIndex: 4, enabled: true, pitch: 440, duration: 2 };
  await invoke("setStep", input);
  const version = stored.version;
  const result = await invoke("setStep", input);
  assert.equal(result.changed, false); assert.equal(result.committed, false);
  assert.equal(result.storageVersion, version); assert.equal(writes, 1);
  const result2 = await invoke("editSong", { actions: [{ action: "setBpm", bpm: 100 }, { action: "setBpm", bpm: stored.data.song.bpm }] });
  assert.equal(result2.changed, false); assert.equal(writes, 1);
});

test("version conflicts, cancellation and write failures leave storage intact and the queue usable", async () => {
  const before = structuredClone(stored);
  await assert.rejects(invoke("editSong", { actions: [step()], expectedStorageVersion: 6 }), /storageVersion is 7/);
  assert.deepEqual(stored, before);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(invoke("setBpm", { bpm: 100 }, controller.signal));
  failWrite = true;
  await assert.rejects(invoke("setBpm", { bpm: 100 }), /temporarily unavailable/);
  assert.deepEqual(stored, before);
  await Promise.all([invoke("setBpm", { bpm: 100 }), invoke("setStep", { barIndex: 0, trackKey: track, stepIndex: 4, enabled: true })]);
  assert.equal(writes, 2); assert.equal(stored.data.song.bpm, 100);
  assert.equal(stored.data.song.bars[0].steps[track][4], true);
});

test("pattern resets durations, normalizes disabled notes, and reads legacy optional arrays", async () => {
  const steps = Array(16).fill(false); steps[4] = true;
  const pitches = Array(16).fill(440), durations = Array(16).fill(4);
  await invoke("setTrackPattern", { barIndex: 0, trackKey: track, steps, pitches, durations });
  assert.equal(stored.data.song.bars[0].pitches[track][0], null);
  assert.equal(stored.data.song.bars[0].durations[track][0], null);
  await invoke("setTrackPattern", { barIndex: 0, trackKey: track, steps });
  assert.equal(stored.data.song.bars[0].durations[track][4], 1);
  await invoke("setStep", { barIndex: 0, trackKey: track, stepIndex: 4, enabled: false });
  assert.equal(stored.data.song.bars[0].pitches[track][4], null);
  assert.equal(stored.data.song.bars[0].durations[track][4], null);
  delete stored.data.song.bars[0].pitches; delete stored.data.song.bars[0].durations;
  const selected = await invoke("getSong", { barIndices: [0] });
  assert.equal(selected.bars[0].pitches[track].length, 16);
  assert.equal(selected.bars[0].durations[track].length, 16);
});

test("playback reports unavailability and actual controller status without editing song", async () => {
  await assert.rejects(invoke("play"), /not ready/);
  let playing = false;
  removePlayback = api.registerPlaybackController({ play() { playing = true; }, pause() { playing = false; }, isPlaying: () => playing, getStep: () => 3, getAudioState: () => "running" });
  assert.equal((await invoke("play")).isPlaying, true);
  assert.equal((await invoke("getPlaybackStatus")).audioState, "running");
  assert.equal((await invoke("pause")).isPlaying, false);
  assert.equal(writes, 0);
});

test("three locales have complete placeholders, localized interface schemas and host-sized definitions", async () => {
  for (const values of Object.values(DICT)) {
    assert.deepEqual(Object.keys(values).sort(), ["en", "zh-CN", "zh-TW"]);
    const parameters = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
    for (const value of Object.values(values)) assert.deepEqual(parameters(value), parameters(values.en));
  }
  for (const lang of ["zh-CN", "zh-TW", "en"]) {
    locale = lang; localeChanged();
    assert.equal(interfaces.get("editSong").description, DICT.descEditSong[lang]);
    await assert.rejects(invoke("setStep", { barIndex: 0, trackKey: "missing", stepIndex: 0, enabled: true }), error => error.message === "actions[0]: " + DICT.invalidTrack[lang].replace("{field}", "missing").replace("{allowed}", stored.data.song.tracks.map(track => track.trackKey).join(", ")));
    for (const definition of interfaces.values()) {
      assert.ok(definition.description.length < 2000);
      assert.ok(JSON.stringify(toJSONSchema(definition.input, { io: "input" })).length <= 16000, definition.name);
    }
  }
});

test("project export round-trips every track and note; import commits once and can be edited afterwards", async () => {
  const song = normalizeSong(api.getDefaultSong());
  song.tracks[0].volume = 0.5;
  const content = encodeProject(song);
  assert.deepEqual(parseProject(content).song, song);
  const preview = await api.importSong(content, { dryRun: true, expectedStorageVersion: 7 });
  assert.equal(preview.committed, false); assert.equal(writes, 0);
  await api.importSong(content, { expectedStorageVersion: 7 });
  assert.equal(writes, 1); assert.deepEqual(stored.data.unrelated, { preserve: true });
  await invoke("setStep", { barIndex: 0, trackKey: track, stepIndex: 0, enabled: true, pitch: 523.25, duration: 4 });
  assert.equal(stored.data.song.bars[0].pitches[track][0], 523.25);
  assert.equal(stored.data.song.bars[0].durations[track][0], 4);
  assert.equal(stored.data.song.tracks[0].volume, 0.5);
});

test("malformed, oversized, future-version and inconsistent projects never overwrite song data", async () => {
  const project = JSON.parse(encodeProject(api.getDefaultSong())), before = structuredClone(stored);
  const invalid = change => { const copy = structuredClone(project); change(copy); return JSON.stringify(copy); };
  for (const content of ["not JSON", "null", " ".repeat(maxProjectBytes + 1),
    invalid(p => { p.version = 99; }),
    invalid(p => { p.song.tracks.push({ ...p.song.tracks[0] }); }),
    invalid(p => { delete p.song.bars[0].steps[track]; }),
    invalid(p => { p.song.bars[0].steps.missing = Array(16).fill(false); }),
    invalid(p => { p.song.bars[0].pitches[track][0] = -440; }),
    invalid(p => { p.song.bars[0].durations[track][0] = 33; }),
    invalid(p => { p.song.tracks[0].instId = "unknown"; }),
    invalid(p => { p.song.bars[0].steps[track] = [true]; }),
    invalid(p => { p.script = "do not execute"; }),
  ]) await assert.rejects(api.importSong(content));
  assert.equal(writes, 0); assert.deepEqual(stored, before);
  await assert.rejects(api.importSong(JSON.stringify(project), { expectedStorageVersion: 6 }), /storageVersion is 7/);
  assert.equal(writes, 0);
});

test("project export saves editable JSON without mutating or pausing; cancellation is reported", async () => {
  let paused = 0;
  removePlayback = api.registerPlaybackController({ play() {}, pause() { paused++; }, isPlaying: () => true, getStep: () => 4 });
  const result = await api.exportSong("project");
  assert.equal(result.saved, true); assert.equal(result.format, "project");
  assert.equal(exported[0].filename, "pocket-studio.pudding-music.json");
  assert.deepEqual(parseProject(exported[0].content).song, normalizeSong(stored.data.song));
  exportSaved = false;
  assert.equal((await api.exportSong("project")).saved, false);
  assert.equal(writes, 0); assert.equal(paused, 0);
  stored.data.song.bpm = 100;
  await api.importSong(exported[0].content);
  assert.equal(paused, 1);
});

test("older hosts keep project export and editing; WAV requests fail early with a localized upgrade hint", async () => {
  let paused = 0;
  removePlayback = api.registerPlaybackController({ play() {}, pause() { paused++; }, isPlaying: () => true, getStep: () => 4 });
  for (const language of ["zh-CN", "zh-TW", "en"]) {
    locale = language; localeChanged();
    for (const capabilities of [undefined, {}, { binaryFileExport: false }, { binaryFileExport: "true" }]) {
      if (capabilities) globalThis.__musicSDK.capabilities = capabilities;
      else delete globalThis.__musicSDK.capabilities;
      assert.equal(api.canExportWav(), false);
      const before = structuredClone(stored), calls = exported.length;
      await assert.rejects(invoke("exportSong", { format: "wav" }), { message: DICT.wavRequiresUpdate[language] });
      assert.equal(exported.length, calls, "unsupported WAV never sends a host request");
      assert.deepEqual(stored, before);
      assert.equal(paused, 0);
    }
  }
  assert.equal((await api.exportSong("project")).saved, true);
  await invoke("setBpm", { bpm: 100 });
  await api.importSong(exported[0].content);
  assert.equal(stored.data.song.bpm, 128);
  assert.equal(writes, 2);
  globalThis.__musicSDK.capabilities = { binaryFileExport: true };
  assert.equal(api.canExportWav(), true, "only explicit host support enables WAV");
});

test("WAV encoding has valid PCM16 mono headers, correct duration and normalized finite samples", () => {
  const bytes = encodeWav(new Float32Array([-0.5, 0, 0.5, NaN]), 44100), view = new DataView(bytes.buffer);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "RIFF");
  assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), "WAVE");
  assert.equal(view.getUint32(4, true), bytes.length - 8);
  assert.equal(view.getUint16(20, true), 1); assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 44100); assert.equal(view.getUint32(28, true), 88200);
  assert.equal(view.getUint16(34, true), 16); assert.equal(view.getUint32(40, true), 8);
  assert.equal(view.getInt16(44, true), -16384); assert.equal(view.getInt16(48, true), 16384); assert.equal(view.getInt16(50, true), 0);
  const loud = encodeWav(new Float32Array([-4, 4]), 44100), loudView = new DataView(loud.buffer);
  assert.ok(Math.abs(loudView.getInt16(44, true)) < 32768); assert.ok(loudView.getInt16(46, true) < 32767);
  assert.deepEqual(Uint8Array.from(atob(bytesToBase64(bytes)), c => c.charCodeAt(0)), bytes);
  assert.throws(() => encodeWav(new Float32Array(1), 0));
});
