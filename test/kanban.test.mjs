import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../widgets/kanban", import.meta.url));

test("Kanban release package exists, is verified, and contains valid source files", async () => {
  const pkgPath = path.join(root, "releases/1.0.0-preview.1/kanban.pudding-widget.json");
  const raw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw);

  assert.equal(pkg.id, "teatak/pudding-hub/widgets/kanban");
  assert.equal(pkg.version, "1.0.0-preview.1");
  assert.equal(pkg.preview, true);
  assert.equal(pkg.channel, "preview");
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

  // Ensure clearCompleted is exported and handled
  const apiSrc = pkg.source.files["src/api.ts"];
  assert.match(apiSrc, /clearCompleted/);
  assert.match(apiSrc, /addCards/);
  assert.match(apiSrc, /moveCard/);
  assert.match(apiSrc, /updateCards/);
  assert.match(apiSrc, /deleteCards/);
  assert.match(apiSrc, /listBoard/);

  // Ensure types.ts supports clear_completed action
  const typesSrc = pkg.source.files["src/types.ts"];
  assert.match(typesSrc, /action === "clear_completed"/);

  // Ensure App.tsx renders clearCompleted button
  const appSrc = pkg.source.files["src/App.tsx"];
  assert.match(appSrc, /clearCompleted/);
  assert.match(appSrc, /t\("clearCompleted"\)/);
});
