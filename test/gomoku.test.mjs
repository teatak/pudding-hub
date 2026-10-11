import test from "node:test";
import assert from "node:assert/strict";
import {
  newLobby,
  joinSeat,
  setReady,
  leaveSeat,
  beginPlay,
} from "../widgets/gomoku/source/src/lobby.ts";
import {
  initial,
  place,
  describePosition,
  winningLine,
  letters,
  derive,
  record,
  pauseClock,
  resumeClock,
  thinkingMS,
} from "../widgets/gomoku/source/src/rules.ts";
test("only selected players can seat; every player owns at most one side", () => {
  let l = newLobby(1, ["a", "b"]);
  assert.throws(() => joinSeat(l, "Black", "observer"), /observing/);
  assert.throws(() => setReady(l, "a"), /Choose/);
  l = joinSeat(l, "Black", "a");
  assert.throws(() => joinSeat(l, "White", "a"), /Leave/);
  assert.throws(() => joinSeat(l, "Black", "b"), /occupied/);
  assert.equal(joinSeat(l, "Black", "a"), l);
});
test("readiness persists a three-second deadline, supports cancellation and survives restoration", () => {
  let l = joinSeat(
    joinSeat(newLobby(1, ["a", "b"]), "Black", "a"),
    "White",
    "b",
  );
  l = setReady(l, "a", true, 1000);
  assert.equal(l.phase, "lobby");
  l = setReady(l, "b", true, 1100);
  assert.equal(l.phase, "countdown");
  assert.equal(l.startsAt, 4100);
  assert.equal(
    setReady(l, "a", true, 2000),
    l,
    "duplicate ready cannot restart countdown",
  );
  assert.throws(() => beginPlay(l, 4099), /countdown/);
  assert.equal(beginPlay(JSON.parse(JSON.stringify(l)), 4100).phase, "playing");
  const cancelled = setReady(l, "a", false, 4000);
  assert.equal(cancelled.phase, "lobby");
  assert.equal(cancelled.startsAt, null);
  assert.deepEqual(cancelled.ready, ["b"]);
  assert.throws(() => beginPlay(cancelled, 9999), /countdown/);
  assert.equal(setReady(cancelled, "a", true, 5000).startsAt, 8000);
  const left = leaveSeat(l, "b");
  assert.equal(left.phase, "lobby");
  assert.equal(left.seats.White, undefined);
  assert.throws(() => leaveSeat(beginPlay(l, 4100), "b"), /new round/);
});
test("coordinates match bottom-up display and each valid move commits exactly one comment", () => {
  const before = initial(),
    p = place(before, 1, "A", "Black", "  先占角落  ");
  assert.equal(before.board[0], 0);
  assert.deepEqual(before.comments, {});
  assert.deepEqual(p.comments.Black, { text: "先占角落", moveNumber: 1 });
  const view = describePosition(p);
  assert.match(view.board.coordinates, /Row 1 is the BOTTOM/);
  assert.match(view.board.text.split("\n")[1], /^15/);
  assert.match(view.board.text.split("\n")[15], /^ 1.*B/);
  assert.throws(() => place(p, 1, "A", "White", "失败的发言"), /occupied/);
  assert.equal(p.comments.White, undefined);
  const p2 = place(p, 15, "O", "White", "顶角");
  assert.deepEqual(describePosition(p2).lastMove, {
    row: 15,
    column: "O",
    stone: "W",
    comment: "顶角",
  });
  assert.equal(
    describePosition(p2).board.text.split("\n")[1].trim().split(/\s+/).at(-1),
    "W",
  );
  const next = place(p2, 1, "B", "Black");
  assert.equal(
    next.comments.Black.text,
    "",
    "a silent move replaces the previous comment",
  );
  assert.throws(() => place(next, 14, "O", "White", "长".repeat(41)), /40/);
});
test("winning highlight follows the actual five intersections", () => {
  let p = initial();
  for (let c = 1; c <= 5; c++) {
    p = place(p, 1, letters[c - 1], "Black");
    if (c < 5) p = place(p, 15, letters[c * 2 - 1], "White");
  }
  assert.deepEqual(
    winningLine(p).sort((a, b) => a - b),
    [0, 1, 2, 3, 4],
  );
});
test("a legal move persists the next turn's clock and rejects moves without resetting it", () => {
  assert.equal(initial().turnStartedAt, null);
  const p = place(initial(), 1, "A", "Black", "", 1000);
  assert.equal(p.turnStartedAt, 1000);
  assert.throws(() => place(p, 1, "A", "White", "", 2000), /occupied/);
  assert.equal(p.turnStartedAt, 1000);
  assert.equal(JSON.parse(JSON.stringify(p)).turnStartedAt, 1000);
  assert.equal(place(p, 15, "O", "White", "", 3000).turnStartedAt, 3000);
  let win = initial();
  for (let c = 1; c <= 5; c++) {
    win = place(win, 1, letters[c - 1], "Black", "", c * 1000);
    if (c < 5)
      win = place(win, 15, letters[c * 2 - 1], "White", "", c * 1000 + 500);
  }
  assert.equal(win.winner, "Black");
  assert.equal(win.turnStartedAt, null);
});

test("letter columns and chronological history are canonical, numeric columns are rejected", () => {
  const first = place(initial(), 8, "H", "Black", "center", 1000);
  const next = place(first, 9, "H", "White", "reply", 2000);
  const saved = record(next);
  assert.deepEqual(Object.keys(saved), [
    "history",
    "resigned",
    "turnStartedAt",
    "turnElapsedMS",
  ]);
  assert.deepEqual(derive(JSON.parse(JSON.stringify(saved))), next);
  const view = describePosition(next);
  assert.equal(view.moveCount, 2);
  assert.deepEqual(view.history, [
    { column: "H", row: 8, stone: "B", comment: "center" },
    { column: "H", row: 9, stone: "W", comment: "reply" },
  ]);
  assert.equal(
    view.board.text.split("\n")[0].trim(),
    "A B C D E F G H I J K L M N O",
  );
  assert.equal("stones" in view, false);
  assert.equal("move" in view, false);
  assert.equal("rows" in view.board, false);
  for (const column of [8, "h", "P", ""])
    assert.throws(() => place(next, 1, column, "Black"), /A–O/);
});
test("pause freezes accumulated thinking time and continuation excludes the pause", () => {
  const p = place(initial(), 8, "H", "Black", "", 1000);
  const paused = pauseClock(p, 4500);
  assert.equal(thinkingMS(paused, 99999), 3500);
  const continued = resumeClock(derive(record(paused)), 10000);
  assert.equal(thinkingMS(continued, 11500), 5000);
  assert.deepEqual(continued.history, p.history);
  const moved = place(continued, 9, "H", "White", "", 12000);
  assert.equal(thinkingMS(moved, 13000), 1000);
});

test("a full board with 40-character comments fits notification limits without losing its score", () => {
  const full = derive({
    history: Array.from({ length: 225 }, (_, i) => ({
      column: letters[i % 15],
      row: Math.floor(i / 15) + 1,
      stone: i % 2 ? "W" : "B",
      comment: "好".repeat(40),
    })),
    resigned: null,
    turnStartedAt: null,
    turnElapsedMS: 0,
  });
  const complete = describePosition(full),
    notice = describePosition(full, false);
  assert.ok(Buffer.byteLength(JSON.stringify(complete)) > 32768);
  assert.ok(Buffer.byteLength(JSON.stringify(notice)) < 16000);
  assert.equal(notice.history.length, 225);
  assert.equal(complete.history[0].comment, "好".repeat(40));
  assert.deepEqual(notice.history[0], { column: "A", row: 1, stone: "B" });
});
