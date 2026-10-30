import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(
  new URL("../extensions/widgets/decision-matrix", import.meta.url),
);

test("Decision Matrix release package exists, is verified, and contains valid source files", async () => {
  const pkgPath = path.join(
    root,
    "releases/1.0.0/decision-matrix.pudding-widget.json",
  );
  const raw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw);

  assert.equal(pkg.id, "teatak/pudding-hub/widgets/decision-matrix");
  assert.equal(pkg.version, "1.0.0");
  assert.equal(pkg.preview, undefined);
  assert.equal(pkg.requires.protocolVersion, 24);
  assert.equal(pkg.requires.sdkVersion, "1");

  const requiredFiles = [
    "widget.json",
    "src/App.tsx",
    "src/game.ts",
    "src/matrix.ts",
    "src/types.ts",
    "src/text.ts",
    "src/style.css",
  ];

  for (const file of requiredFiles) {
    assert.ok(pkg.source.files[file], `missing file in package: ${file}`);
  }

  // Ensure game interfaces are exported
  const gameSrc = pkg.source.files["src/game.ts"];
  assert.match(gameSrc, /contribute/);
  assert.match(gameSrc, /synthesize/);
  assert.match(gameSrc, /setDilemma/);
  assert.match(gameSrc, /readMatrix/);
  assert.match(gameSrc, /onResume/);

  // Ensure matrix logic is correct
  const matrixSrc = pkg.source.files["src/matrix.ts"];
  assert.match(matrixSrc, /HAT_ORDER/);
  assert.match(matrixSrc, /addPerspective/);
  assert.match(matrixSrc, /setSynthesis/);
  assert.match(matrixSrc, /generateMarkdownExport/);

  // Ensure App.tsx renders Decision Matrix elements
  const appSrc = pkg.source.files["src/App.tsx"];
  assert.match(appSrc, /useWidgetState/);
  assert.match(appSrc, /useWidgetInteraction/);
  assert.match(appSrc, /dm-container/);
  assert.match(appSrc, /dm-matrix-grid/);
  assert.match(appSrc, /dm-checklist-card/);
});
