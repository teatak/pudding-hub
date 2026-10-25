import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../widgets/synology-files/", import.meta.url));
const readJSON = async (file) => JSON.parse(await fs.readFile(file, "utf8"));

test("synology-files manifest, widget.json and release package are valid and verifiable", async () => {
  const manifest = await readJSON(path.join(root, "manifest.json"));
  assert.equal(manifest.id, "teatak/pudding-hub/widgets/synology-files");
  assert.equal(manifest.version, "1.0.2");
  assert.ok(manifest.title["zh-CN"]);
  assert.ok(manifest.title.en);

  const widgetJson = await readJSON(path.join(root, "source", "widget.json"));
  assert.equal(widgetJson.schemaVersion, 1);
  assert.equal(widgetJson.entry, "src/App.tsx");

  const releasePkg = await readJSON(
    path.join(root, "releases", manifest.version, "synology-files.pudding-widget.json"),
  );
  assert.equal(releasePkg.id, manifest.id);
  assert.equal(releasePkg.version, manifest.version);
  assert.ok(releasePkg.source.files["src/App.tsx"]);
  assert.ok(releasePkg.source.files["src/types.ts"]);
  assert.ok(releasePkg.source.files["src/text.ts"]);
  assert.ok(releasePkg.source.files["src/api.ts"]);
  assert.ok(releasePkg.source.files["src/style.css"]);
});

test("synology-files types, formatting and translations are complete", async () => {
  const textModuleContent = await fs.readFile(path.join(root, "source", "src", "text.ts"), "utf8");
  assert.ok(textModuleContent.includes('"zh-CN":'));
  assert.ok(textModuleContent.includes('"zh-TW":'));
  assert.ok(textModuleContent.includes('en:'));

  const typesContent = await fs.readFile(path.join(root, "source", "src", "types.ts"), "utf8");
  assert.ok(typesContent.includes("function getFileCategory"));
  assert.ok(typesContent.includes("function formatBytes"));
  assert.ok(typesContent.includes("function formatDate"));
});
