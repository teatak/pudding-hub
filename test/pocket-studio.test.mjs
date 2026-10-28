import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../extensions/widgets/pocket-studio", import.meta.url));

test("Pocket Studio release package exists, is verified, and contains Mario & Donkey Kong presets", async () => {
  const pkgPath = path.join(
    root,
    "releases/1.0.1/pocket-studio.pudding-widget.json",
  );
  const raw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw);

  assert.equal(pkg.id, "teatak/pudding-hub/widgets/pocket-studio");
  assert.equal(pkg.version, "1.0.1");
  assert.equal(pkg.preview, undefined);
  assert.equal(pkg.channel, undefined);
  assert.equal(pkg.requires.protocolVersion, 24);
  assert.equal(pkg.requires.sdkVersion, "1");

  const requiredFiles = [
    "widget.json",
    "src/App.tsx",
    "src/api.ts",
    "src/song.ts",
    "src/audio.ts",
    "src/instruments.ts",
    "src/project.ts",
    "src/render.ts",
    "src/wav.ts",
    "src/demoTracks.ts",
    "src/types.ts",
    "src/text.ts",
    "src/style.css",
  ];

  for (const file of requiredFiles) {
    assert.ok(pkg.source.files[file], `missing file in package: ${file}`);
  }

  // Ensure Mario & Donkey Kong presets are defined in demoTracks.ts
  const demoSrc = pkg.source.files["src/demoTracks.ts"];
  assert.match(demoSrc, /createMarioSong/);
  assert.match(demoSrc, /createDonkeyKongSong/);

  // Ensure Audio synth features exist
  const audioSrc = pkg.source.files["src/audio.ts"];
  assert.match(audioSrc, /playSquareWave/);
  assert.match(audioSrc, /playTriangleBass/);
  assert.match(audioSrc, /playKick/);
  assert.match(audioSrc, /playSnare/);
  assert.match(audioSrc, /playHat/);
  assert.match(audioSrc, /playMarimba/);

  // Ensure API definitions exist and are subscribed
  const apiSrc = pkg.source.files["src/api.ts"];
  assert.match(apiSrc, /pudding\.defineInterface/);
  assert.match(apiSrc, /getSong/);
  assert.match(apiSrc, /addBar/);
  assert.match(apiSrc, /removeBar/);
  assert.match(apiSrc, /setNoteDuration/);
  assert.match(apiSrc, /setNotePitch/);
  assert.match(apiSrc, /setTrackPattern/);
  assert.match(apiSrc, /toggleStep/);
  assert.match(apiSrc, /loadPreset/);
  assert.match(apiSrc, /changeInstrument/);
  assert.match(apiSrc, /clearBar/);
  assert.match(apiSrc, /clearSong/);
  assert.match(apiSrc, /play/);
  assert.match(apiSrc, /pause/);
  assert.match(apiSrc, /getPlaybackStatus/);
  assert.match(apiSrc, /pudding\.locale\.subscribe/);

  // Ensure App.tsx renders Pocket Studio elements
  const appSrc = pkg.source.files["src/App.tsx"];
  assert.match(appSrc, /StudioBrandIcon/);
  assert.match(appSrc, /presetMario/);
  assert.match(appSrc, /presetDonkeyKong/);
  assert.match(appSrc, /ps-timeline-viewport/);
  assert.match(appSrc, /ps-note-handle/);
  assert.match(appSrc, /startDrag/);
  assert.match(appSrc, /ps-pitch-popover/);
  assert.match(appSrc, /ps-mini-piano/);
});

test("Pocket Studio release matches the exact shipped source and file hashes", async () => {
  const { createHash } = await import("node:crypto");
  const pkg = JSON.parse(await fs.readFile(path.join(root, "releases/1.0.1/pocket-studio.pudding-widget.json"), "utf8"));
  for (const [file, content] of Object.entries(pkg.source.files)) {
    assert.equal(await fs.readFile(path.join(root, "source", file), "utf8"), content, file);
    assert.equal(createHash("sha256").update(content).digest("hex"), pkg.fileHashes[file]);
  }
});
