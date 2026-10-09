import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { initial, place } from "../widgets/gomoku/source/src/rules.ts";
import { winner } from "../widgets/rps-decider/source/src/rules.ts";
import { packageWidget, sourceFiles, widgetIcon } from "../scripts/package-widget.mjs";
test("Gomoku enforces turns, occupancy, edges and horizontal/vertical/diagonal wins", () => {
  const old = initial(),
    next = place(old, 1, 1, "Black");
  assert.equal(old.board[0], 0);
  assert.equal(next.board[0], 1);
  assert.throws(() => place(next, 2, 1, "Black"), /turn/);
  assert.throws(() => place(next, 1, 1, "White"), /occupied/);
  assert.throws(() => place(old, 0, 1, "Black"), /Coordinates/);
  for (const [dy, dx] of [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]) {
    let state = initial();
    for (let i = 0; i < 5; i++) {
      state = place(state, 1 + i * dy, 5 + i * dx, "Black");
      if (i < 4) state = place(state, 15, 1 + i * 2, "White");
    }
    assert.equal(state.winner, "Black");
    assert.throws(() => place(state, 14, 14, "White"), /finished/);
  }
});
test("RPS resolves all nine pairs without turn ordering", () => {
  for (const a of ["rock", "paper", "scissors"])
    for (const b of ["rock", "paper", "scissors"]) {
      const result = winner(a, b);
      if (a === b) assert.equal(result, "draw");
      else assert.equal(winner(b, a), result === "A" ? "B" : "A");
    }
  assert.equal(winner("rock", "scissors"), "A");
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
    const svg = await fs.readFile(path.join(root, "widgets/shared-todo/assets/icon.svg"));
    assert.equal(one.pkg.icon, "data:image/svg+xml;base64," + svg.toString("base64"));
    await assert.rejects(widgetIcon(path.join(root, "widgets/shared-todo"), "../icon.svg"), /Widget icon/);
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
    const registry = JSON.parse(
      await fs.readFile(path.join(root, "widgets/registry.json")),
    );
    assert.equal(registry.items[0].releases[0].packageHash, one.packageHash);
    assert.equal(registry.items[0].icon, one.pkg.icon);
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

for (const widget of ["gomoku", "rps-decider"]) {
  const { newLobby, joinSeat, setReady, leaveSeat } = await import(`../widgets/${widget}/source/src/lobby.ts`);
  test(`${widget}: invitation has no assigned seats, participants choose and ready themselves`, () => {
    const roles = widget === "gomoku" ? ["Black", "White"] : ["A", "B"];
    let lobby = newLobby(1);
    assert.deepEqual(lobby.seats, {});
    assert.throws(() => setReady(lobby, roles, "first"), /Choose a seat/);
    lobby = joinSeat(lobby, roles, roles[0], "first", false);
    assert.throws(() => joinSeat(lobby, roles, roles[0], "second", false), /occupied/);
    assert.throws(() => joinSeat(lobby, roles, roles[1], "first", false), /Leave/);
    lobby = setReady(lobby, roles, "first");
    assert.equal(lobby.phase, "lobby");
    lobby = leaveSeat(lobby, "first");
    assert.deepEqual(lobby.ready, []);
    lobby = joinSeat(lobby, roles, roles[0], "first", false);
    lobby = joinSeat(lobby, roles, roles[1], "second", false);
    lobby = setReady(lobby, roles, "second");
    assert.equal(lobby.phase, "lobby");
    lobby = setReady(lobby, roles, "first");
    assert.equal(lobby.phase, "playing");
    assert.throws(() => leaveSeat(lobby, "first"), /new round/);
    assert.deepEqual(JSON.parse(JSON.stringify(lobby)), lobby, "author state survives serialization");
  });
}
