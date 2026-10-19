import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  initial,
  place,
  describePosition,
  letters,
} from "../widgets/gomoku/source/src/rules.ts";
import {
  packageWidget,
  sourceFiles,
  widgetIcon,
} from "../scripts/package-widget.mjs";
test("Gomoku enforces turns, occupancy, edges and horizontal/vertical/diagonal wins", () => {
  const old = initial(),
    next = place(old, 1, "A", "Black");
  assert.equal(old.board[0], 0);
  assert.equal(next.board[0], 1);
  assert.throws(() => place(next, 2, "A", "Black"), /turn/);
  assert.throws(() => place(next, 1, "A", "White"), /occupied/);
  assert.throws(() => place(old, 0, "A", "Black"), /A–O/);
  for (const [dy, dx] of [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]) {
    let state = initial();
    for (let i = 0; i < 5; i++) {
      state = place(state, 1 + i * dy, letters[4 + i * dx], "Black");
      if (i < 4) state = place(state, 15, letters[i * 2], "White");
    }
    assert.equal(state.winner, "Black");
    assert.throws(() => place(state, 14, "N", "White"), /finished/);
  }
});
test("Gomoku tool view preserves row/column orientation, history and last move without exposing flat indices", () => {
  const empty = describePosition(initial());
  assert.equal(empty.board.text.split("\n").length, 16);
  assert.match(empty.board.text.split("\n")[0], /A B C.*O$/);
  assert.equal("history" in empty, false);
  assert.equal(empty.lastMove, null);
  let state = initial();
  for (const [row, column] of [
    [8, 8],
    [9, 9],
    [9, 8],
    [10, 8],
    [8, 9],
  ])
    state = place(state, row, letters[column - 1], state.turn);
  const saved = JSON.stringify(state);
  const view = describePosition(state);
  assert.deepEqual(state.history, [
    { row: 8, column: "H", stone: "B" },
    { row: 9, column: "I", stone: "W" },
    { row: 9, column: "H", stone: "B" },
    { row: 10, column: "H", stone: "W" },
    { row: 8, column: "I", stone: "B" },
  ]);
  assert.deepEqual(view.lastMove, { row: 8, column: "I", stone: "B" });
  assert.equal(view.turn, "White");
  assert.equal(view.moveCount, 5);
  assert.equal(view.last, undefined);
  assert.equal(Array.isArray(view.board), false);
  assert.deepEqual(
    view.board.text.split("\n")[8].trim().split(/\s+/).slice(8, 10),
    ["B", "B"],
  );
  assert.equal(view.board.text.split("\n")[7].trim().split(/\s+/)[8], "B");
  assert.equal(view.board.text.split("\n")[7].trim().split(/\s+/)[9], "W");
  assert.equal(view.board.text.split("\n")[6].trim().split(/\s+/)[8], "W");
  const edges = describePosition(
    place(place(initial(), 1, "O", "Black"), 15, "A", "White"),
  );
  assert.equal(edges.board.text.split("\n")[15].trim().split(/\s+/)[15], "B");
  assert.equal(edges.board.text.split("\n")[1].trim().split(/\s+/)[1], "W");
  assert.equal(
    JSON.stringify(state),
    saved,
    "formatting never changes persisted game state",
  );
});
test("packages use Core validation and releases cannot be overwritten", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "pudding-hub-package-"));
  try {
    await fs.mkdir(path.join(root, "widgets"), { recursive: true });
    await fs.cp(
      new URL("../widgets/shared-todo", import.meta.url),
      path.join(root, "widgets/shared-todo"),
      { recursive: true, filter: (file) => !file.includes("/releases") },
    );
    await fs.writeFile(
      path.join(root, "widgets/registry.json"),
      JSON.stringify({
        kind: "pudding.widget.registry",
        schemaVersion: 2,
        name: "test",
        title: { en: "test" },
        items: [],
      }),
    );
    const one = await packageWidget("shared-todo", { root });
    const two = await packageWidget("shared-todo", { root });
    assert.equal(one.packageHash, two.packageHash);
    const svg = await fs.readFile(
      path.join(root, "widgets/shared-todo/assets/icon.svg"),
    );
    assert.equal(
      one.pkg.icon,
      "data:image/svg+xml;base64," + svg.toString("base64"),
    );
    await assert.rejects(
      widgetIcon(path.join(root, "widgets/shared-todo"), "../icon.svg"),
      /Widget icon/,
    );
    await fs.appendFile(
      path.join(root, "widgets/shared-todo/source/src/App.tsx"),
      "\n// local edit\n",
    );
    await assert.rejects(
      packageWidget("shared-todo", { root }),
      /Immutable release/,
    );
    const dev = await packageWidget("shared-todo", { root, dev: true });
    assert.notEqual(dev.packageHash, one.packageHash);
    let registry = JSON.parse(
      await fs.readFile(path.join(root, "widgets/registry.json")),
    );
    assert.equal(registry.items[0].releases[0].packageHash, one.packageHash);
    assert.equal(registry.items[0].icon, one.pkg.icon);
    const manifestPath = path.join(root, "widgets/shared-todo/manifest.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    await fs.writeFile(
      manifestPath,
      JSON.stringify({
        ...manifest,
        version: "1.1.0-preview.1",
        preview: true,
        channel: "preview",
      }),
    );
    const preview = await packageWidget("shared-todo", { root });
    assert.equal(preview.pkg.preview, true);
    assert.equal(preview.pkg.channel, "preview");
    registry = JSON.parse(
      await fs.readFile(path.join(root, "widgets/registry.json"), "utf8"),
    );
    assert.equal(registry.items[0].releases.length, 2);
    assert.equal(registry.items[0].releases[0].preview, true);
    assert.equal(registry.items[0].releases[0].channel, "preview");
    assert.equal(registry.items[0].releases[1].packageHash, one.packageHash);
    await fs.writeFile(
      manifestPath,
      JSON.stringify({ ...manifest, preview: "true" }),
    );
    await assert.rejects(
      packageWidget("shared-todo", { root }),
      /preview must be a boolean/,
    );
    await fs.symlink(
      "/tmp",
      path.join(root, "widgets/shared-todo/source/link"),
    );
    await assert.rejects(
      sourceFiles(path.join(root, "widgets/shared-todo/source")),
      /Symlinks/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("packaging rejects type and bundling errors without writing packages or registry", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "pudding-hub-compile-"));
  try {
    const dir = path.join(root, "widgets/shared-todo");
    await fs.cp(new URL("../widgets/shared-todo", import.meta.url), dir, {
      recursive: true, filter: (file) => !file.includes("/releases") && !file.includes("/dev"),
    });
    const registryPath = path.join(root, "widgets/registry.json");
    const registry = '{"items":[]}\n';
    await fs.writeFile(registryPath, registry);
    const app = path.join(dir, "source/src/App.tsx");
    for (const code of [
      'const messages = {title:"Title"}; function t(key:keyof typeof messages){return messages[key]} export default function App(){return <div>{t("cancelled")}</div>}',
      'const failure:unknown = {}; export default function App(){return <div>{failure && <p>Error</p>}</div>}',
      'import "./missing.css"; export default function App(){return <p>Ready</p>}',
    ]) {
      await fs.writeFile(app, code);
      for (const dev of [false, true]) {
        await assert.rejects(packageWidget("shared-todo", { root, dev }), /Widget compilation failed.*\n.*(?:App.tsx|missing.css)/s);
        assert.equal(await fs.readFile(registryPath, "utf8"), registry);
        for (const output of ["releases", "dev"])
          await assert.rejects(fs.access(path.join(dir, output)), { code: "ENOENT" });
      }
    }
    await fs.writeFile(app, 'export default function App(){return <p>Ready</p>}');
    const valid = await packageWidget("shared-todo", { root, dev: true });
    assert.ok(valid.packageHash);
    await fs.access(path.join(dir, "dev/shared-todo.pudding-widget.json"));
    assert.equal(await fs.readFile(registryPath, "utf8"), registry);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
