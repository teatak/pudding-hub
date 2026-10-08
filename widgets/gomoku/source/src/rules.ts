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
