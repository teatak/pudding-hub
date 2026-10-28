import test from "node:test";
import assert from "node:assert/strict";
import {
  newLobby,
  emptyLobby,
  setReady,
  beginPlay,
} from "../widgets/gomoku/source/src/lobby.ts";
import {
  initial,
  place,
  describePosition,
  summarizePosition,
  winningLine,
  letters,
  derive,
  replayPosition,
  record,
  pauseClock,
  resumeClock,
  thinkingMS,
  totalThinkingMS,
} from "../widgets/gomoku/source/src/rules.ts";
test("replay seeks derive only visible stones, comments and winning lines without changing the game", () => {
  let p = initial();
  for (let c = 0; c < 5; c++) {
    p = place(p, 1, letters[c], "Black", c === 0 ? "Opening" : "");
    if (c < 4) p = place(p, 15, letters[c * 2], "White", "Reply " + c);
  }
  const saved = JSON.stringify(p);
  for (const count of [9, 3, 0, 2, 8, 1, 9]) {
    const view = replayPosition(p, count);
    assert.equal(view.moveCount, count);
    assert.equal(view.board.filter(Boolean).length, count);
    assert.deepEqual(view.history, p.history.slice(0, count));
    assert.equal(view.winner, count === 9 ? "Black" : null);
    assert.equal(winningLine(view).length, count === 9 ? 5 : 0);
    assert.equal(view.turnStartedAt, null);
    assert.equal(thinkingMS(view, Date.now()), 0);
  }
  assert.deepEqual(replayPosition(p, 0).comments, {});
  assert.deepEqual(replayPosition(p, 1).comments, {
    Black: { text: "Opening", moveNumber: 1 },
  });
  assert.deepEqual(replayPosition(p, 2).comments.White, {
    text: "Reply 0",
    moveNumber: 2,
  });
  assert.equal(
    replayPosition(p, 3).comments.Black.text,
    "",
    "silent moves do not retain an older comment",
  );
  assert.equal(replayPosition(p, 1).last, 0, "A1 stays at the bottom left");
  assert.equal(replayPosition(p, 2).last, 210, "A15 stays at the top left");
  assert.equal(JSON.stringify(p), saved);
});

test("replay exposes resignation only at the final position, without a winning line", () => {
  const p = derive({
    ...record(place(place(initial(), 8, "H", "Black"), 9, "H", "White")),
    resigned: "Black",
  });
  const saved = JSON.stringify(p);
  assert.equal(replayPosition(p, 0).winner, null);
  assert.equal(replayPosition(p, 1).winner, null);
  assert.equal(replayPosition(p, 2).winner, "White");
  assert.deepEqual(winningLine(replayPosition(p, 2)), []);
  assert.equal(JSON.stringify(p), saved);
});

test("full-board draw replays through 225 moves and back to the empty opening", () => {
  // Alternating rows of BBWW prevent five in every direction.
  const cells = { B: [], W: [] };
  for (let row = 1; row <= 15; row++)
    for (let column = 0; column < 15; column++) {
      const stone = (row - 1 + Math.floor(column / 2)) % 2 ? "W" : "B";
      cells[stone].push({ row, column: letters[column], stone });
    }
  let p = initial();
  for (let i = 0; i < 225; i++) {
    const cell = cells[i % 2 ? "W" : "B"].shift();
    p = place(p, cell.row, cell.column, p.turn);
  }
  assert.equal(p.winner, "draw");
  assert.equal(replayPosition(p, 224).winner, null);
  assert.equal(replayPosition(p, 225).winner, "draw");
  assert.equal(replayPosition(p, 0).moveCount, 0);
  assert.equal(p.moveCount, 225);
});

test("first game assigns either color once; the same pair swaps independent of ordering", () => {
  const empty = emptyLobby();
  for (const [random, black] of [
    [0, "a"],
    [0.499, "a"],
    [0.5, "b"],
    [0.999, "b"],
  ]) {
    const first = newLobby(empty, ["a", "b"], () => random);
    assert.equal(first.seats.Black, black);
    assert.notEqual(first.seats.White, black);
    assert.deepEqual(first.ready, []);
    assert.equal(first.phase, "lobby");
    assert.equal(first.startsAt, null);
    const noDraw = () => {
      throw new Error("Rematches must not draw again");
    };
    const second = newLobby(first, ["b", "a"], noDraw);
    assert.deepEqual(second.seats, {
      Black: first.seats.White,
      White: first.seats.Black,
    });
    assert.deepEqual(newLobby(second, ["a", "b"], noDraw).seats, first.seats);
    assert.deepEqual(first.players, ["a", "b"]);
  }
  assert.deepEqual(empty.seats, {});
  for (const players of [[], ["a"], ["a", "a"], ["a", "b", "c"]])
    assert.throws(() => newLobby(empty, players), /exactly two/);
});
test("changing either player, including the human, starts a new draw", () => {
  const first = newLobby(emptyLobby(), ["a", "b"], () => 0);
  for (const players of [
    ["a", "c"],
    ["c", "b"],
    ["a", "human"],
    ["c", "d"],
  ]) {
    let draws = 0;
    const next = newLobby(first, players, () => {
      draws++;
      return 0.9;
    });
    assert.equal(draws, 1);
    assert.deepEqual(next.seats, { Black: players[1], White: players[0] });
    assert.deepEqual(next.ready, []);
  }
});
test("assigned players prepare independently; cancellation and restoration retain colors and the three-second deadline", () => {
  let l = newLobby(emptyLobby(), ["a", "b"], () => 0);
  const seats = { ...l.seats };
  assert.throws(() => setReady(l, "observer"), /observing/);
  l = setReady(l, "a", true, 1000);
  assert.equal(l.phase, "lobby");
  l = setReady(l, "b", true, 1100);
  assert.equal(l.phase, "countdown");
  assert.equal(l.startsAt, 4100);
  assert.equal(setReady(l, "a", true, 2000), l);
  assert.throws(() => beginPlay(l, 4099), /countdown/);
  const playing = beginPlay(JSON.parse(JSON.stringify(l)), 4100);
  assert.equal(playing.phase, "playing");
  assert.deepEqual(playing.seats, seats);
  assert.throws(() => setReady(playing, "a", false), /already started/);
  const cancelled = setReady(l, "a", false, 4000);
  assert.equal(cancelled.phase, "lobby");
  assert.equal(cancelled.startsAt, null);
  assert.deepEqual(cancelled.ready, ["b"]);
  assert.deepEqual(cancelled.seats, seats);
  assert.throws(() => beginPlay(cancelled, 9999), /countdown/);
  assert.equal(setReady(cancelled, "a", true, 5000).startsAt, 8000);
  const rematch = newLobby(playing, ["a", "b"]);
  assert.deepEqual(rematch.seats, { Black: seats.White, White: seats.Black });
  assert.deepEqual(rematch.ready, []);
  assert.equal(rematch.startsAt, null);
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
    "totalElapsedMS",
  ]);
  assert.deepEqual(derive(JSON.parse(JSON.stringify(saved))), next);
  const view = describePosition(next);
  assert.equal(view.moveCount, 2);
  assert.equal("history" in view, false);
  assert.deepEqual(saved.history, [
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

test("board snapshots and action receipts stay bounded while canonical history keeps all comments", () => {
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
  const notice = describePosition(full),
    receipt = summarizePosition(full);
  assert.ok(Buffer.byteLength(JSON.stringify(record(full))) > 32768);
  assert.ok(Buffer.byteLength(JSON.stringify(notice)) < 1200);
  assert.ok(Buffer.byteLength(JSON.stringify(receipt)) < 350);
  assert.equal("history" in notice, false);
  assert.equal("history" in receipt, false);
  assert.equal("board" in receipt, false);
  assert.equal(receipt.moveCount, 225);
  assert.equal(receipt.turn, null);
  assert.equal(record(full).history.length, 225);
  assert.equal(record(full).history[0].comment, "好".repeat(40));
  assert.deepEqual(notice.lastMove, full.history.at(-1));
});


test("player totals survive serialization and exclude pauses without double-counting the current turn", () => {
  const ready = resumeClock(initial(), 1000);
  assert.equal(totalThinkingMS(ready, "Black", 2500), 1500);
  assert.equal(totalThinkingMS(ready, "White", 2500), 0);
  const black = place(ready, 8, "H", "Black", "", 4000);
  const before = record(black);
  assert.equal(totalThinkingMS(black, "Black", 6000), 3000);
  assert.equal(totalThinkingMS(black, "White", 6000), 2000);
  assert.deepEqual(record(black), before, "reading a clock never writes game state");
  const paused = pauseClock(black, 6000);
  assert.equal(totalThinkingMS(paused, "White", 99999), 2000);
  const resumed = resumeClock(derive(JSON.parse(JSON.stringify(record(paused)))), 10000);
  const white = place(resumed, 9, "H", "White", "", 11000);
  const restored = derive(JSON.parse(JSON.stringify(record(white))));
  assert.equal(totalThinkingMS(restored, "White", 13000), 3000);
  assert.equal(totalThinkingMS(restored, "Black", 13000), 5000);
  assert.deepEqual(restored.totalElapsedMS, { Black: 3000, White: 3000 });
});

test("totals stop on a winning move or resignation and a fresh round resets them", () => {
  let win = resumeClock(initial(), 1000);
  for (let c = 1; c <= 5; c++) {
    win = place(win, 1, letters[c - 1], "Black", "", c * 2000);
    if (c < 5) win = place(win, 15, letters[c * 2 - 1], "White", "", c * 2000 + 500);
  }
  assert.equal(win.winner, "Black");
  assert.equal(totalThinkingMS(win, "Black", 999999), 7000);
  assert.equal(totalThinkingMS(win, "White", 999999), 2000);
  const active = place(resumeClock(initial(), 1000), 8, "H", "Black", "", 4000);
  const resigned = derive({ ...record(pauseClock(active, 4600)), resigned: "Black" });
  assert.equal(totalThinkingMS(resigned, "Black", 999999), 3000);
  assert.equal(totalThinkingMS(resigned, "White", 999999), 600);
  assert.equal(totalThinkingMS(initial(), "Black", 999999), 0);
  assert.equal(totalThinkingMS(initial(), "White", 999999), 0);
});

test("legacy scores remain playable without fabricating missing thinking totals", () => {
  const legacy = derive({ history: [{ row: 8, column: "H", stone: "B" }], resigned: null, turnStartedAt: 1000, turnElapsedMS: 0 });
  assert.equal(totalThinkingMS(legacy, "Black", 5000), null);
  assert.equal(totalThinkingMS(legacy, "White", 5000), null);
  const next = place(legacy, 9, "H", "White", "", 5000);
  assert.equal(next.moveCount, 2);
  assert.equal(totalThinkingMS(next, "White", 6000), null);
  assert.equal(Object.hasOwn(record(next), "totalElapsedMS"), false);
});
