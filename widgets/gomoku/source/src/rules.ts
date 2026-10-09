export const size = 15;
export type Color = "Black" | "White";
export type Position = {
  board: number[];
  turn: Color;
  move: number;
  winner: Color | "draw" | null;
  last: number | null;
};
export function initial(): Position {
  return {
    board: Array(size * size).fill(0),
    turn: "Black",
    move: 0,
    winner: null,
    last: null,
  };
}

// A derived tool view; the persisted numeric board remains the rules' source of truth.
export function describePosition(position: Position) {
  const coordinates = (index: number) => ({
    row: Math.floor(index / size) + 1,
    column: (index % size) + 1,
  });
  const symbols = [".", "B", "W"];
  const stones = { Black: [] as { row: number; column: number }[], White: [] as { row: number; column: number }[] };
  position.board.forEach((stone, index) => {
    if (stone === 1) stones.Black.push(coordinates(index));
    if (stone === 2) stones.White.push(coordinates(index));
  });
  return {
    board: {
      coordinates: "1-based (row, column). Rows increase top to bottom; columns increase left to right.",
      legend: ". = empty, B = Black, W = White",
      rows: [
        "    " + Array.from({ length: size }, (_, column) => String(column + 1).padStart(2)).join(" "),
        ...Array.from({ length: size }, (_, row) =>
          String(row + 1).padStart(2) + "  " +
          position.board.slice(row * size, (row + 1) * size).map(stone => symbols[stone].padStart(2)).join(" "),
        ),
      ],
    },
    stones,
    move: position.move,
    turn: position.turn,
    winner: position.winner,
    lastMove: position.last === null ? null : {
      ...coordinates(position.last),
      color: position.board[position.last] === 1 ? "Black" : "White",
    },
  };
}

export function place(
  old: Position,
  row: number,
  column: number,
  color: Color,
): Position {
  if (old.winner) throw new Error("Match is finished");
  if (color !== old.turn) throw new Error("Not your turn");
  if (
    !Number.isInteger(row) ||
    !Number.isInteger(column) ||
    row < 1 ||
    row > size ||
    column < 1 ||
    column > size
  )
    throw new Error("Coordinates must be 1–15");
  const r = row - 1,
    c = column - 1,
    index = r * size + c,
    stone = color === "Black" ? 1 : 2;
  if (old.board[index]) throw new Error("Cell is occupied");
  const board = [...old.board];
  board[index] = stone;
  const count = (dr: number, dc: number) => {
    let n = 0,
      y = r + dr,
      x = c + dc;
    while (
      y >= 0 &&
      y < size &&
      x >= 0 &&
      x < size &&
      board[y * size + x] === stone
    ) {
      n++;
      y += dr;
      x += dc;
    }
    return n;
  };
  const won = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ].some(([dr, dc]) => 1 + count(dr, dc) + count(-dr, -dc) >= 5);
  return {
    board,
    move: old.move + 1,
    turn: color === "Black" ? "White" : "Black",
    winner: won ? color : old.move + 1 === size * size ? "draw" : null,
    last: index,
  };
}
