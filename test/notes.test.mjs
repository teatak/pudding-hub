import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../extensions/widgets/notes", import.meta.url));

test("Sticky Notes release package exists, is verified, and contains valid source files", async () => {
  const pkgPath = path.join(root, "releases/1.0.0/notes.pudding-widget.json");
  const raw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw);

  assert.equal(pkg.id, "teatak/pudding-hub/widgets/notes");
  assert.equal(pkg.version, "1.0.0");
  assert.equal(pkg.preview, undefined);
  assert.equal(pkg.requires.protocolVersion, 24);
  assert.equal(pkg.requires.sdkVersion, "1");

  const requiredFiles = [
    "widget.json",
    "src/App.tsx",
    "src/api.ts",
    "src/types.ts",
    "src/text.ts",
    "src/style.css",
  ];

  for (const file of requiredFiles) {
    assert.ok(pkg.source.files[file], `missing file in package: ${file}`);
  }

  const apiSrc = pkg.source.files["src/api.ts"];
  assert.match(apiSrc, /addNotes/);
  assert.match(apiSrc, /updateNotes/);
  assert.match(apiSrc, /togglePin/);
  assert.match(apiSrc, /reorderNotes/);
  assert.match(apiSrc, /deleteNotes/);
  assert.match(apiSrc, /clearNotes/);

  const typesSrc = pkg.source.files["src/types.ts"];
  assert.match(typesSrc, /case "reorder":/);

  const appSrc = pkg.source.files["src/App.tsx"];
  assert.match(appSrc, /handleDragStart/);
  assert.match(appSrc, /handleDrop/);
  assert.doesNotMatch(appSrc, /draftTitle/);
});
