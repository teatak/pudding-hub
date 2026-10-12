export const size = 15;
export const letters = "ABCDEFGHIJKLMNO";
export type Color = "Black" | "White";
export type Move = {
  column: string;
  row: number;
  stone: "B" | "W";
  comment?: string;
};
// The ordered score is the only source of board, turn, count and comments.
export type PositionState = {
  history: Move[];
  resigned: Color | null;
  turnStartedAt: number | null;
  turnElapsedMS: number;
};
export type Position = PositionState & {
  board: number[];
  turn: Color;
  moveCount: number;
  winner: Color | "draw" | null;
  last: number | null;
  comments: Partial<Record<Color, { text: string; moveNumber: number }>>;
};
export function record(p: PositionState): PositionState {
  return {
    history: p.history,
    resigned: p.resigned,
    turnStartedAt: p.turnStartedAt,
    turnElapsedMS: p.turnElapsedMS,
  };
}
export function initial(): Position {
  return derive({
    history: [],
    resigned: null,
    turnStartedAt: null,
    turnElapsedMS: 0,
  });
}
const indexOf = (m: Move) => (m.row - 1) * size + letters.indexOf(m.column);
function lineThrough(board: number[], index: number): number[] {
  const stone = board[index];
  if (!stone) return [];
  for (const [dr, dc] of [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ]) {
    const line = [index];
    for (const sign of [-1, 1]) {
      let r = Math.floor(index / size) + dr * sign,
        c = (index % size) + dc * sign;
      while (
        r >= 0 &&
        r < size &&
        c >= 0 &&
        c < size &&
        board[r * size + c] === stone
      ) {
        line.push(r * size + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= 5) return line;
  }
  return [];
}
export function derive(state: PositionState): Position {
  const board = Array<number>(size * size).fill(0);
  const comments: Position["comments"] = {};
  state.history.forEach((m, i) => {
    board[indexOf(m)] = m.stone === "B" ? 1 : 2;
    comments[m.stone === "B" ? "Black" : "White"] = {
      text: m.comment || "",
      moveNumber: i + 1,
    };
  });
  const lastMove = state.history.at(-1),
    last = lastMove ? indexOf(lastMove) : null;
  const winner = state.resigned
    ? state.resigned === "Black"
      ? "White"
      : "Black"
    : last !== null && lineThrough(board, last).length
      ? lastMove!.stone === "B"
        ? "Black"
        : "White"
      : state.history.length === size * size
        ? "draw"
        : null;
  return {
    ...state,
    board,
    comments,
    last,
    winner,
    moveCount: state.history.length,
    turn: state.history.length % 2 ? "White" : "Black",
  };
}
export function summarizePosition(p: Position) {
  return {
    moveCount: p.moveCount,
    turn: p.winner ? null : p.turn,
    winner: p.winner,
    lastMove: p.history.at(-1) || null,
  };
}
// A local replay view never changes the saved score or runs a game action.
export function replayPosition(p: Position, moveCount: number): Position {
  return derive({
    history: p.history.slice(0, moveCount),
    resigned: moveCount === p.moveCount ? p.resigned : null,
    turnStartedAt: null,
    turnElapsedMS: 0,
  });
}
export function describePosition(p: Position) {
  const symbols = [".", "B", "W"];
  return {
    board: {
      coordinates:
        "Columns A–O run left to right. Row 1 is the BOTTOM; row 15 is the TOP. Use column letters and numeric rows directly, e.g. column H, row 8.",
      legend: ". = empty, B = Black, W = White",
      text: [
        "   " + [...letters].join(" "),
        ...Array.from({ length: size }, (_, visualRow) => {
          const row = size - visualRow;
          return (
            String(row).padStart(2) +
            " " +
            p.board
              .slice((row - 1) * size, row * size)
              .map((s) => symbols[s])
              .join(" ")
          );
        }),
      ].join("\n"),
    },
    ...summarizePosition(p),
  };
}
export function place(
  old: Position,
  row: number,
  column: string,
  color: Color,
  comment = "",
  now = Date.now(),
): Position {
  if (old.winner) throw new Error("Match is finished");
  if (color !== old.turn) throw new Error("Not your turn");
  if (
    !Number.isInteger(row) ||
    row < 1 ||
    row > size ||
    typeof column !== "string" ||
    !/^[A-O]$/.test(column)
  )
    throw new Error("Use columns A–O and rows 1–15");
  if (old.board[(row - 1) * size + letters.indexOf(column)])
    throw new Error("Cell is occupied");
  if (comment.trim().length > 40)
    throw new Error("Keep your comment within 40 characters");
  const p = derive({
    ...record(old),
    history: [
      ...old.history,
      {
        column,
        row,
        stone: color === "Black" ? "B" : "W",
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      },
    ],
    turnStartedAt: now,
    turnElapsedMS: 0,
  });
  if (p.winner) p.turnStartedAt = null;
  return p;
}
export const thinkingMS = (p: PositionState, now: number) =>
  p.turnElapsedMS +
  (p.turnStartedAt === null ? 0 : Math.max(0, now - p.turnStartedAt));
export const pauseClock = (p: Position, now = Date.now()): Position => ({
  ...p,
  turnElapsedMS: thinkingMS(p, now),
  turnStartedAt: null,
});
export const resumeClock = (p: Position, now = Date.now()): Position => ({
  ...p,
  turnStartedAt: p.winner ? null : now,
});
export const winningLine = (p: Position) =>
  !p.resigned && p.winner && p.last !== null
    ? lineThrough(p.board, p.last)
    : [];
