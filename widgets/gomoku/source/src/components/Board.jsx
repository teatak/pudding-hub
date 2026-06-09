import { Fragment } from "preact";
import { SIZE, EMPTY, STARS } from "../constants.js";
import { stoneClass, isHuman } from "../utils.js";

export function Board({ boardWidth, state, lastMoveAnimated, onBoardClick }) {
  const edge = Math.max(12, Math.min(18, Math.round(boardWidth * 0.038)));
  const grid = (boardWidth - edge * 2) / (SIZE - 1);

  const isWinningPoint = (row, col) => {
    return Array.isArray(state.winning_line) && state.winning_line.some(function (point) {
      return point.row === row && point.col === col;
    });
  };

  return (
    <div id="gomoku-board">
      <svg id="board-svg" width={boardWidth} height={boardWidth} viewBox={`0 0 ${boardWidth} ${boardWidth}`} aria-hidden="true">
        {Array.from({ length: SIZE }).map((_, i) => {
          const lineCoord = edge + i * grid;
          return (
            <Fragment key={i}>
              <line x1={edge} y1={lineCoord} x2={boardWidth - edge} y2={lineCoord} className="board-line" />
              <line x1={lineCoord} y1={edge} x2={lineCoord} y2={boardWidth - edge} className="board-line" />
            </Fragment>
          );
        })}
        {STARS.map((point, idx) => (
          <circle key={idx} cx={edge + point[1] * grid} cy={edge + point[0] * grid} r="3" className="board-star" />
        ))}
      </svg>
      <div id="spots-layer">
        {Array.from({ length: SIZE }).map((_, row) =>
          Array.from({ length: SIZE }).map((_, col) => {
            const val = state.board[row][col];
            const isLastMove = state.last_move && state.last_move.row === row && state.last_move.col === col;
            const shouldAnimate = isLastMove && !lastMoveAnimated;
            const isWinning = isWinningPoint(row, col);

            let isMyTurn = false;
            if (state.status === "playing" && state.turn) {
              const currentPlayer = state[state.turn + "_player"];
              if (currentPlayer && isHuman(currentPlayer.session_id)) {
                isMyTurn = true;
              }
            }

            const isDisabled = val !== EMPTY || !isMyTurn;
            const gridPx = Math.round(grid);
            const spotLeft = edge + col * grid;
            const spotTop = edge + row * grid;

            return (
              <button
                key={`${row}-${col}`}
                type="button"
                className="spot"
                style={{
                  left: `${spotLeft}px`,
                  top: `${spotTop}px`,
                  width: `${gridPx}px`,
                  height: `${gridPx}px`
                }}
                disabled={isDisabled}
                onClick={() => onBoardClick(row, col)}
                aria-label={`row ${row + 1} col ${col + 1}`}
              >
                {val !== EMPTY && (
                  <div className={`stone ${stoneClass(val)}${shouldAnimate ? " animate" : ""}${isWinning ? " winning" : ""}`} />
                )}
                {isLastMove && <div className="last-move-marker" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
