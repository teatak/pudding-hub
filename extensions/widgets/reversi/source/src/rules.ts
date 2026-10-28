export const size = 8;
export const letters = "ABCDEFGH";
export type Color = "Black" | "White";

export type Move = {
  column: string;
  row: number;
  stone: "B" | "W";
  comment?: string;
};

// 记录下每一步的只读历史与时间
export type PositionState = {
  history: Move[];
  resigned: Color | null;
  turnStartedAt: number | null;
  turnElapsedMS: number;
};

export type Position = PositionState & {
  board: number[]; // 0: empty, 1: Black, 2: White
  turn: Color | null;
  blackCount: number;
  whiteCount: number;
  legalMoves: string[]; // 坐标列表例如 ["C4", "D3", "E6", "F5"]
  winner: Color | "draw" | null;
  last: number | null;
  passedColor: Color | null;
  moveCount: number;
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

export const indexOf = (colIndex: number, rowIndex: number) =>
  rowIndex * size + colIndex;

export const moveToIndex = (m: { column: string; row: number }) =>
  (m.row - 1) * size + letters.indexOf(m.column);

const directions = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1],
];

// 计算若在 (col, row) 落子，能翻转的对手棋子索引数组
export function getFlippedDiscs(
  board: number[],
  col: number,
  row: number,
  colorNumber: number,
): number[] {
  if (board[indexOf(col, row)] !== 0) return [];
  const opp = colorNumber === 1 ? 2 : 1;
  const flips: number[] = [];

  for (const [dc, dr] of directions) {
    let c = col + dc;
    let r = row + dr;
    const ray: number[] = [];

    while (c >= 0 && c < size && r >= 0 && r < size) {
      const idx = indexOf(c, r);
      if (board[idx] === opp) {
        ray.push(idx);
        c += dc;
        r += dr;
      } else if (board[idx] === colorNumber) {
        if (ray.length > 0) {
          flips.push(...ray);
        }
        break;
      } else {
        break; // 遇到空位
      }
    }
  }

  return flips;
}

// 获取某个颜色当前的所有合法落子点
export function getLegalMovesFor(
  board: number[],
  color: Color,
): Array<{ column: string; row: number; coord: string; flipsCount: number }> {
  const colorNumber = color === "Black" ? 1 : 2;
  const legal: Array<{ column: string; row: number; coord: string; flipsCount: number }> = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const flips = getFlippedDiscs(board, c, r, colorNumber);
      if (flips.length > 0) {
        legal.push({
          column: letters[c],
          row: r + 1,
          coord: `${letters[c]}${r + 1}`,
          flipsCount: flips.length,
        });
      }
    }
  }

  return legal;
}

// 初始棋盘：中央 4 子交叉
export function createInitialBoard(): number[] {
  const b = Array<number>(size * size).fill(0);
  // D4: White (2), E4: Black (1)
  // D5: Black (1), E5: White (2)
  b[indexOf(3, 3)] = 2; // D4
  b[indexOf(4, 3)] = 1; // E4
  b[indexOf(3, 4)] = 1; // D5
  b[indexOf(4, 4)] = 2; // E5
  return b;
}

export function derive(state: PositionState): Position {
  const board = createInitialBoard();
  const comments: Position["comments"] = {};

  let currentTurn: Color = "Black";
  let lastIndex: number | null = null;
  let passedColor: Color | null = null;

  for (let i = 0; i < state.history.length; i++) {
    const m = state.history[i];
    const col = letters.indexOf(m.column);
    const row = m.row - 1;
    const colorNum = m.stone === "B" ? 1 : 2;
    const flips = getFlippedDiscs(board, col, row, colorNum);

    board[indexOf(col, row)] = colorNum;
    for (const f of flips) {
      board[f] = colorNum;
    }

    lastIndex = indexOf(col, row);
    comments[m.stone === "B" ? "Black" : "White"] = {
      text: m.comment || "",
      moveNumber: i + 1,
    };

    const nextTurn: Color = m.stone === "B" ? "White" : "Black";
    const nextLegals = getLegalMovesFor(board, nextTurn);
    if (nextLegals.length > 0) {
      currentTurn = nextTurn;
      passedColor = null;
    } else {
      const currentLegals = getLegalMovesFor(board, m.stone === "B" ? "Black" : "White");
      if (currentLegals.length > 0) {
        currentTurn = m.stone === "B" ? "Black" : "White";
        passedColor = nextTurn;
      } else {
        // 双方均无走步，对局结束
        passedColor = null;
      }
    }
  }

  // 统计黑白棋子数
  let blackCount = 0;
  let whiteCount = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i] === 1) blackCount++;
    else if (board[i] === 2) whiteCount++;
  }

  // 判断当前合法步与胜者
  const currentLegals = getLegalMovesFor(board, currentTurn);
  const otherTurn: Color = currentTurn === "Black" ? "White" : "Black";
  const otherLegals = getLegalMovesFor(board, otherTurn);
  const isFinished =
    state.resigned !== null ||
    blackCount === 0 ||
    whiteCount === 0 ||
    blackCount + whiteCount === size * size ||
    (currentLegals.length === 0 && otherLegals.length === 0);

  let winner: Color | "draw" | null = null;
  if (state.resigned) {
    winner = state.resigned === "Black" ? "White" : "Black";
  } else if (isFinished) {
    if (blackCount > whiteCount) winner = "Black";
    else if (whiteCount > blackCount) winner = "White";
    else winner = "draw";
  }

  const turn = winner ? null : currentTurn;
  const legalMoves = winner
    ? []
    : currentLegals.map((m) => m.coord);

  return {
    ...state,
    board,
    turn,
    blackCount,
    whiteCount,
    legalMoves,
    winner,
    last: lastIndex,
    passedColor,
    moveCount: state.history.length,
    comments,
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

export function replayPosition(p: Position, moveCount: number): Position {
  return derive({
    history: p.history.slice(0, moveCount),
    resigned: moveCount === p.moveCount ? p.resigned : null,
    turnStartedAt: null,
    turnElapsedMS: 0,
  });
}

export function summarizePosition(p: Position) {
  const lastMove = p.history.at(-1);
  return {
    turn: p.turn,
    winner: p.winner,
    moveCount: p.moveCount,
    blackCount: p.blackCount,
    whiteCount: p.whiteCount,
    passedColor: p.passedColor,
    legalMoves: p.legalMoves,
    lastMove: lastMove
      ? {
          column: lastMove.column,
          row: lastMove.row,
          color: lastMove.stone === "B" ? ("Black" as const) : ("White" as const),
          ...(lastMove.comment ? { comment: lastMove.comment } : {}),
        }
      : null,
  };
}

export function describePosition(p: Position) {
  const symbols = [".", "B", "W"];
  return {
    board: {
      coordinates:
        "Columns A–H run left to right. Row 1 is the TOP; row 8 is the BOTTOM. Use column letters and numeric rows directly, e.g. column D, row 3.",
      legend: ". = empty, B = Black, W = White",
      text: [
        "   " + [...letters].join(" "),
        ...Array.from({ length: size }, (_, visualRow) => {
          const row = visualRow + 1;
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
    !letters.includes(column)
  ) {
    throw new Error("Use columns A–H and rows 1–8");
  }

  const colIdx = letters.indexOf(column);
  const rowIdx = row - 1;
  const colorNum = color === "Black" ? 1 : 2;
  const flips = getFlippedDiscs(old.board, colIdx, rowIdx, colorNum);

  if (flips.length === 0) {
    throw new Error(
      `Illegal move at ${column}${row}: must flank and flip at least one opponent disc`,
    );
  }

  const trimmedComment = comment.trim().slice(0, 40);
  const nextHistory: Move[] = [
    ...old.history,
    {
      column,
      row,
      stone: color === "Black" ? "B" : "W",
      ...(trimmedComment ? { comment: trimmedComment } : {}),
    },
  ];

  return derive({
    history: nextHistory,
    resigned: null,
    turnStartedAt: now,
    turnElapsedMS: 0,
  });
}

export function pauseClock(p: Position, now = Date.now()): Position {
  if (!p.turnStartedAt) return p;
  return {
    ...p,
    turnStartedAt: null,
    turnElapsedMS: p.turnElapsedMS + Math.max(0, now - p.turnStartedAt),
  };
}

export function resumeClock(p: Position, now = Date.now()): Position {
  if (p.winner || p.turnStartedAt) return p;
  return {
    ...p,
    turnStartedAt: now,
  };
}

export function thinkingMS(p: Position, now = Date.now()): number {
  return p.turnElapsedMS + (p.turnStartedAt ? Math.max(0, now - p.turnStartedAt) : 0);
}
