import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../widgets/debate", import.meta.url));

test("Debate release package exists, is verified, and contains valid source files", async () => {
  const pkgPath = path.join(
    root,
    "releases/1.0.0-preview.2/debate.pudding-widget.json",
  );
  const raw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw);

  assert.equal(pkg.id, "teatak/pudding-hub/widgets/debate");
  assert.equal(pkg.version, "1.0.0-preview.2");
  assert.equal(pkg.preview, true);
  assert.equal(pkg.channel, "preview");
  assert.equal(pkg.requires.protocolVersion, 24);
  assert.equal(pkg.requires.sdkVersion, "1");

  const requiredFiles = [
    "widget.json",
    "src/App.tsx",
    "src/game.ts",
    "src/tribunal.ts",
    "src/types.ts",
    "src/text.ts",
    "src/style.css",
  ];

  for (const file of requiredFiles) {
    assert.ok(pkg.source.files[file], `missing file in package: ${file}`);
  }

  // Ensure game interfaces are exported
  const gameSrc = pkg.source.files["src/game.ts"];
  assert.match(gameSrc, /argue/);
  assert.match(gameSrc, /giveVerdict/);
  assert.match(gameSrc, /ready/);
  assert.match(gameSrc, /setTopic/);
  assert.match(gameSrc, /onResume/);

  // Ensure tribunal logic is correct
  const rulesSrc = pkg.source.files["src/tribunal.ts"];
  assert.match(rulesSrc, /PRESET_TOPICS/);
  assert.match(rulesSrc, /addArgument/);
  assert.match(rulesSrc, /submitVerdict/);

  // Ensure App.tsx renders Debate tribunal elements
  const appSrc = pkg.source.files["src/App.tsx"];
  assert.match(appSrc, /useWidgetState/);
  assert.match(appSrc, /useWidgetInteraction/);
  assert.match(appSrc, /db-scale-card/);
  assert.match(appSrc, /db-topic-bar/);
  assert.match(appSrc, /db-stream/);
});
