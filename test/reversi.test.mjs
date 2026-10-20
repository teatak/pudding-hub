import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../widgets/reversi", import.meta.url));

test("Reversi release package exists, is verified, and contains valid source files", async () => {
  const pkgPath = path.join(
    root,
    "releases/1.0.1/reversi.pudding-widget.json",
  );
  const raw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw);

  assert.equal(pkg.id, "teatak/pudding-hub/widgets/reversi");
  assert.equal(pkg.version, "1.0.1");
  assert.equal(pkg.preview, undefined);
  assert.equal(pkg.requires.protocolVersion, 24);
  assert.equal(pkg.requires.sdkVersion, "1");

  const requiredFiles = [
    "widget.json",
    "src/App.tsx",
    "src/game.ts",
    "src/lobby.ts",
    "src/rules.ts",
    "src/text.ts",
    "src/style.css",
  ];

  for (const file of requiredFiles) {
    assert.ok(pkg.source.files[file], `missing file in package: ${file}`);
  }

  // Ensure game interfaces are exported
  const gameSrc = pkg.source.files["src/game.ts"];
  assert.match(gameSrc, /placeDisc/);
  assert.match(gameSrc, /readBoard/);
  assert.match(gameSrc, /ready/);
  assert.match(gameSrc, /resign/);

  // Ensure rules are correct
  const rulesSrc = pkg.source.files["src/rules.ts"];
  assert.match(rulesSrc, /export const size = 8;/);
  assert.match(rulesSrc, /getFlippedDiscs/);
  assert.match(rulesSrc, /getLegalMovesFor/);
  assert.match(rulesSrc, /Row 1 is the TOP; row 8 is the BOTTOM/);

  // Ensure App.tsx renders Reversi board, player speech danmaku and right-side player seats
  const appSrc = pkg.source.files["src/App.tsx"];
  assert.match(appSrc, /useWidgetInteraction/);
  assert.match(appSrc, /rv-board/);
  assert.match(appSrc, /rv-players/);
  assert.match(appSrc, /rv-speech/);
  assert.match(appSrc, /const rowNum = visualRow \+ 1/);
});
