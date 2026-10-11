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
    p = place(before, 1, 1, "Black", "  先占角落  ");
  assert.equal(before.board[0], 0);
  assert.deepEqual(before.comments, {});
  assert.deepEqual(p.comments.Black, { text: "先占角落", move: 1 });
  const view = describePosition(p);
  assert.match(view.board.coordinates, /Row 1 is the BOTTOM/);
  assert.match(view.board.rows[1], /^15/);
  assert.match(view.board.rows[15], /^ 1.*B/);
  assert.throws(() => place(p, 1, 1, "White", "失败的发言"), /occupied/);
  assert.equal(p.comments.White, undefined);
  const p2 = place(p, 15, 15, "White", "顶角");
  assert.deepEqual(describePosition(p2).lastMove, {
    row: 15,
    column: 15,
    color: "White",
  });
  assert.equal(
    describePosition(p2).board.rows[1].trim().split(/\s+/).at(-1),
    "W",
  );
  const next = place(p2, 1, 2, "Black");
  assert.equal(
    next.comments.Black.text,
    "",
    "a silent move replaces the previous comment",
  );
  assert.throws(() => place(next, 14, 15, "White", "长".repeat(41)), /40/);
});
test("winning highlight follows the actual five intersections", () => {
  let p = initial();
  for (let c = 1; c <= 5; c++) {
    p = place(p, 1, c, "Black");
    if (c < 5) p = place(p, 15, c * 2, "White");
  }
  assert.deepEqual(
    winningLine(p).sort((a, b) => a - b),
    [0, 1, 2, 3, 4],
  );
});
