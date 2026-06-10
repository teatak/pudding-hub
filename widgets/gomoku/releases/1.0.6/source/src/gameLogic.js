import { SIZE, EMPTY, BLACK, WHITE, BLACK_SIDE, WHITE_SIDE } from "./constants.js";
import { t, command, isHuman, side_label, inBounds, emptyBoard, toStone, sideForStone, public_row, public_col, toInternalCoord, displayCoord, formatBoardText, getRawSessionID, participantID } from "./utils.js";

export function buildActionSchema() {
  return {
    join_game: {
      description: t("action_join_desc"),
      action: { type: "join_game", side: "black" }
    },
    leave_game: {
      description: t("action_leave_desc"),
      action: { type: "leave_game" }
    },
    ready: {
      description: t("action_ready_desc"),
      action: { type: "ready" }
    },
    place_stone: {
      description: t("action_place_desc"),
      action: { type: "place_stone", row: "integer 1-15 (1 at bottom, 15 at top)", col: "string A-O (A at left, O at right)", message: "string (optional)" }
    }
  };
}

export function buildGuide() {
  return t("guide");
}

export function freshState() {
  const board = emptyBoard();
  return {
    status: "idle",
    board: board,
    board_text: formatBoardText(board),
    history: [],
    turn: null,
    black_player: null,
    white_player: null,
    black_ready: false,
    white_ready: false,
    last_move: null,
    winning_line: null,
    score: {},
    actions_schema: buildActionSchema(),
    guide: buildGuide(),
    next_action: null
  };
}

export function boardFromHistory(history) {
  const board = emptyBoard();
  if (!Array.isArray(history)) return board;
  history.forEach(function (move) {
    if (!move || !inBounds(move.row, move.col)) return;
    board[move.row][move.col] = toStone(move.stone);
  });
  return board;
}

export function normalizeState(raw) {
  const defaultState = freshState();
  if (!raw || typeof raw !== "object") return defaultState;

  const state = JSON.parse(JSON.stringify(raw));
  if (!Array.isArray(state.history)) state.history = [];

  state.history = state.history.map((move) => {
    if (move && typeof move.col === "string") {
      const coord = toInternalCoord(move.row, move.col);
      if (coord) {
        return {
          row: coord.row,
          col: coord.col,
          public_row: move.row,
          public_col: move.col,
          stone: move.stone,
          display: move.display,
          message: move.message
        };
      }
    }
    return move;
  });

  // 将 last_move 从公开坐标还原为内部坐标
  if (state.last_move && typeof state.last_move.col === "string") {
    const coord = toInternalCoord(state.last_move.row, state.last_move.col);
    if (coord) {
      state.last_move = { row: coord.row, col: coord.col, message: state.last_move.message };
    }
  }

  if (!state.board) state.board = boardFromHistory(state.history);

  if (!state.score) state.score = {};
  for (const name in state.score) {
    const entry = state.score[name];
    if (typeof entry === "number") {
      state.score[name] = { win: entry, lose: 0, draw: 0, total: entry };
    } else if (entry && typeof entry === "object") {
      entry.win = entry.win || 0;
      entry.lose = entry.lose || 0;
      entry.draw = entry.draw || 0;
      entry.total = entry.total || 0;
    }
  }

  if (state.black_player === undefined) state.black_player = null;
  if (state.white_player === undefined) state.white_player = null;
  if (state.black_ready === undefined) state.black_ready = false;
  if (state.white_ready === undefined) state.white_ready = false;
  if (state.status === undefined) state.status = "idle";

  if (state.black_player == null || state.white_player == null) {
    if (state.status === "countdown" || state.status === "ready_checking" || state.status === "playing" || state.status === "game_over") {
      state.status = "idle";
      state.black_ready = false;
      state.white_ready = false;
      state.turn = null;
    }
  }
  // 当 game_over 且 winning_line 丢失时，从棋盘重新计算
  if (state.status === "game_over" && !Array.isArray(state.winning_line) && state.history.length > 0) {
    const lastMove = state.history[state.history.length - 1];
    if (lastMove) {
      const stone = toStone(lastMove.stone);
      state.winning_line = checkWin(state.board, stone);
    }
  }

  return withDerivedState(state);
}

export function normalizeScore(raw) {
  const score = raw && typeof raw === "object" && !Array.isArray(raw) ? JSON.parse(JSON.stringify(raw)) : {};
  for (const name in score) {
    const entry = score[name];
    if (typeof entry === "number") {
      score[name] = { win: entry, lose: 0, draw: 0, total: entry };
    } else if (entry && typeof entry === "object") {
      entry.win = entry.win || 0;
      entry.lose = entry.lose || 0;
      entry.draw = entry.draw || 0;
      entry.total = entry.total || 0;
    } else {
      delete score[name];
    }
  }
  return score;
}

export function withDerivedState(state) {
  if (state.board) {
    state.board_text = formatBoardText(state.board);
  }
  state.actions_schema = buildActionSchema();
  state.guide = buildGuide();
  state.next_action = nextModelActionForState(state);
  return state;
}

export function nextModelActionForState(state) {
  if (state.status === "idle") {
    if (state.black_player && !state.white_player) {
      return {
        tool: "canvas_widget_dispatch",
        action: { type: "join_game", side: "white" }
      };
    }
    if (state.white_player && !state.black_player) {
      return {
        tool: "canvas_widget_dispatch",
        action: { type: "join_game", side: "black" }
      };
    }
    return null;
  }
  if (state.status === "ready_checking") {
    if (state.black_player && !isHuman(state.black_player.session_id) && !state.black_ready) {
      return {
        tool: "canvas_widget_dispatch",
        action: { type: "ready" }
      };
    }
    if (state.white_player && !isHuman(state.white_player.session_id) && !state.white_ready) {
      return {
        tool: "canvas_widget_dispatch",
        action: { type: "ready" }
      };
    }
    return null;
  }
  if (state.status === "playing" && state.turn) {
    const currentTurnSide = state.turn;
    const activePlayer = state[currentTurnSide + "_player"];
    if (activePlayer && !isHuman(activePlayer.session_id)) {
      return {
        tool: "canvas_widget_dispatch",
        action: { type: "place_stone", row: "1-15 (1 at bottom, 15 at top)", col: "A-O (A at left, O at right)" },
        example: { type: "place_stone", row: 8, col: "H" }
      };
    }
  }
  return null;
}

export function publicState(state) {
  const p = JSON.parse(JSON.stringify(state));
  delete p.board;
  delete p.winning_line;

  if (p.last_move) {
    p.last_move = {
      row: public_row(p.last_move.row),
      col: public_col(p.last_move.col),
      message: p.last_move.message
    };
  }

  if (Array.isArray(p.history)) {
    p.history = p.history.map((move) => {
      return {
        row: move.public_row,
        col: move.public_col,
        stone: move.stone,
        display: move.display,
        message: move.message
      };
    });
  }
  return p;
}

export function checkWin(board, stone) {
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] !== stone) continue;
      for (let d = 0; d < dirs.length; d++) {
        const dr = dirs[d][0];
        const dc = dirs[d][1];
        const line = [{ row: row, col: col }];
        let nextRow = row + dr;
        let nextCol = col + dc;
        while (inBounds(nextRow, nextCol) && board[nextRow][nextCol] === stone) {
          line.push({ row: nextRow, col: nextCol });
          nextRow += dr;
          nextCol += dc;
        }
        if (line.length >= 5) return line;
      }
    }
  }
  return null;
}

export function innerOnAction(action, currState, context) {
  const nextState = normalizeState(currState || freshState());
  if (action && action.type === "init") {
    return { ok: true, state: nextState };
  }
  const ctx = context || {};

  const actor = ctx.actor || {};
  const callerID = participantID(actor);
  let callerTitle = "";
  if (actor.role === "human") {
    callerTitle = t("human_judge");
  } else {
    callerTitle = actor.name || t("smart_ai");
  }

  const getOtherRecipients = () => {
    const recipients = new Set();
    const rawCaller = getRawSessionID(callerID);

    if (ctx && Array.isArray(ctx.visible_sessions)) {
      ctx.visible_sessions.forEach(function (sess) {
        if (sess && sess.session_id) {
          recipients.add(sess.session_id);
        }
      });
    }

    [nextState.black_player, nextState.white_player].forEach(function (p) {
      if (p && p.session_id && !isHuman(p.session_id)) {
        recipients.add(getRawSessionID(p.session_id));
      }
    });

    if (actor && actor.role === "assistant") {
      recipients.delete(rawCaller);
    }
    return Array.from(recipients);
  };

  // 1. 选座加入对局
  if (action.type === "join_game") {
    const side = action.side;
    if (side !== BLACK_SIDE && side !== WHITE_SIDE) return { ok: false, error: "invalid side type" };
    if (nextState[side + "_player"] !== null) {
      return { ok: false, error: t("err_seat_taken", { side: side_label(side) }) };
    }

    const otherSide = side === BLACK_SIDE ? WHITE_SIDE : BLACK_SIDE;
    if (nextState[otherSide + "_player"] && nextState[otherSide + "_player"].session_id === callerID) {
      return { ok: false, error: t("err_already_seated") };
    }

    nextState[side + "_player"] = { session_id: callerID, title: callerTitle };
    if (!nextState.score[callerTitle] || typeof nextState.score[callerTitle] === "number") {
      nextState.score[callerTitle] = { win: 0, lose: 0, draw: 0, total: 0 };
    }

    if (nextState.black_player !== null && nextState.white_player !== null) {
      nextState.status = "ready_checking";
      nextState.black_ready = false;
      nextState.white_ready = false;

      const rawCaller = actor && actor.role === "assistant" ? getRawSessionID(callerID) : null;
      const recipients = [];
      if (nextState.black_player && !isHuman(nextState.black_player.session_id)) {
        const raw = getRawSessionID(nextState.black_player.session_id);
        if (raw !== rawCaller) recipients.push(raw);
      }
      if (nextState.white_player && !isHuman(nextState.white_player.session_id)) {
        const raw = getRawSessionID(nextState.white_player.session_id);
        if (raw !== rawCaller) recipients.push(raw);
      }

      if (recipients.length > 0) {
        window.pudding?.send({
          type: "ready_check",
          data: {
            instruction: t("instruction_ready_check")
          },
          to: { sessions: recipients }
        });
        return {
          ok: true,
          state: nextState
        };
      }
      return { ok: true, state: nextState };
    } else {
      nextState.status = "idle";
      const otherSide = side === BLACK_SIDE ? WHITE_SIDE : BLACK_SIDE;
      const recipients = getOtherRecipients();
      if (recipients.length > 0) {
        window.pudding?.send({
          type: "player_joined",
          data: {
            side: side,
            player: nextState[side + "_player"],
            status: nextState.status,
            instruction: t("announce_join_waiting", {
              player: callerTitle,
              side: side_label(side),
              other_side: side_label(otherSide)
            }) + t("instruct_join_dispatch") + "```json\n" + JSON.stringify({
              id: window.pudding?.id || "",
              action: {
                type: "join_game",
                side: otherSide
              }
            }, null, 2) + "\n```"
          },
          to: { sessions: recipients }
        });
        return {
          ok: true,
          state: nextState
        };
      }
      return { ok: true, state: nextState };
    }
  }

  // 新增：邀请 AI 席位
  if (action.type === "invite_ai") {
    const side = action.side;
    if (side !== BLACK_SIDE && side !== WHITE_SIDE) return { ok: false, error: "invalid side type" };
    if (nextState[side + "_player"] !== null) {
      return { ok: false, error: t("err_seat_taken", { side: side_label(side) }) };
    }

    const recipients = getOtherRecipients();
    if (recipients.length > 0) {
      window.pudding?.send({
        type: "player_joined",
        data: {
          side: side,
          player: null,
          status: nextState.status,
          instruction: t("announce_invite_ai", {
            side: side_label(side)
          }) + t("instruct_invite_dispatch") + "```json\n" + JSON.stringify({
            id: window.pudding?.id || "",
            action: {
              type: "join_game",
              side: side
            }
          }, null, 2) + "\n```"
        },
        to: { sessions: recipients }
      });
      return {
        ok: true,
        state: nextState
      };
    }
    return { ok: true, state: nextState };
  }

  // 2. 离席重置
  if (action.type === "leave_game") {
    let leftSide = null;
    if (nextState.black_player && nextState.black_player.session_id === callerID) leftSide = BLACK_SIDE;
    else if (nextState.white_player && nextState.white_player.session_id === callerID) leftSide = WHITE_SIDE;

    if (!leftSide) return { ok: false, error: t("err_not_seated") };

    const leftPlayer = nextState[leftSide + "_player"];
    nextState[leftSide + "_player"] = null;
    nextState.black_ready = false;
    nextState.white_ready = false;

    nextState.status = "idle";
    nextState.turn = null;

    const recipients = getOtherRecipients();
    if (recipients.length > 0) {
      window.pudding?.send({
        type: "player_left",
        data: {
          side: leftSide,
          player: leftPlayer,
          status: nextState.status,
          instruction: t("announce_left", { player: callerTitle })
        },
        to: { sessions: recipients }
      });
      return {
        ok: true,
        state: nextState
      };
    }
    return { ok: true, state: nextState };
  }

  // 3. 请离席位（踢人）
  if (action.type === "kick_player") {
    const kickSide = action.side;
    if (kickSide !== BLACK_SIDE && kickSide !== WHITE_SIDE) return { ok: false, error: "invalid side type" };
    if (nextState[kickSide + "_player"] === null) return { ok: false, error: t("err_empty_seat") };

    const kickedPlayer = nextState[kickSide + "_player"];
    const kickedPlayerTitle = kickedPlayer ? kickedPlayer.title : t("unknown");
    nextState[kickSide + "_player"] = null;
    nextState.black_ready = false;
    nextState.white_ready = false;

    nextState.status = "idle";
    nextState.turn = null;

    const recipients = getOtherRecipients();
    const rawKickedSession = kickedPlayer ? getRawSessionID(kickedPlayer.session_id) : null;
    if (rawKickedSession && rawKickedSession !== getRawSessionID(callerID) && !recipients.includes(rawKickedSession)) {
      recipients.push(rawKickedSession);
    }

    if (recipients.length > 0) {
      window.pudding?.send({
        type: "player_kicked",
        data: {
          side: kickSide,
          player: kickedPlayer,
          status: nextState.status,
          instruction: t("announce_kicked", { player: kickedPlayerTitle })
        },
        to: { sessions: recipients }
      });
      return {
        ok: true,
        state: nextState
      };
    }
    return { ok: true, state: nextState };
  }

  // 5. 准备确认
  if (action.type === "ready") {
    if (nextState.status !== "ready_checking" && nextState.status !== "countdown") return { ok: false, error: t("err_not_ready_checking") };

    if (nextState.black_player && nextState.black_player.session_id === callerID) {
      nextState.black_ready = true;
    }
    else if (nextState.white_player && nextState.white_player.session_id === callerID) {
      nextState.white_ready = true;
    } else {
      return { ok: false, error: t("err_not_player") };
    }

    if (nextState.black_ready && nextState.white_ready) {
      nextState.status = "playing";
      nextState.turn = BLACK_SIDE;
      nextState.board = emptyBoard();
      nextState.history = [];
      nextState.last_move = null;
      nextState.winning_line = null;

      if (!isHuman(nextState.black_player.session_id)) {
        window.pudding?.send({
          type: "place_stone",
          data: {
            board_text: formatBoardText(nextState.board),
            instruction: t("instruction_first_move")
          },
          to: { sessions: [getRawSessionID(nextState.black_player.session_id)] }
        });
        return {
          ok: true,
          state: nextState
        };
      }
    }

    return { ok: true, state: nextState };
  }

  // 6. 落子动作
  if (action.type === "place_stone") {
    if (nextState.status !== "playing") return { ok: false, error: t("err_not_playing") };

    const currentTurnSide = nextState.turn;
    const expectedPlayer = nextState[currentTurnSide + "_player"];
    if (!expectedPlayer || expectedPlayer.session_id !== callerID) {
      return { ok: false, error: t("err_not_your_turn") };
    }

    const coord = toInternalCoord(action.row, action.col);
    if (!coord) return { ok: false, error: t("err_invalid_coord") };
    if (nextState.board[coord.row][coord.col] !== EMPTY) {
      return { ok: false, error: t("err_occupied") };
    }

    const msg = (action.message && typeof action.message === "string") ? action.message.trim() : "";
    const stone = currentTurnSide === BLACK_SIDE ? BLACK : WHITE;

    nextState.board[coord.row][coord.col] = stone;
    nextState.history.push({
      row: coord.row,
      col: coord.col,
      public_row: public_row(coord.row),
      public_col: public_col(coord.col),
      stone: stone,
      display: displayCoord(coord.row, coord.col),
      message: msg
    });
    nextState.last_move = { row: coord.row, col: coord.col, message: msg };

    // 胜负判定
    const winLine = checkWin(nextState.board, stone);
    if (winLine) {
      nextState.status = "game_over";
      nextState.winning_line = winLine;
      nextState.turn = null;

      const winner_title = expectedPlayer.title;
      const loserSide = currentTurnSide === BLACK_SIDE ? WHITE_SIDE : BLACK_SIDE;
      const loserPlayer = nextState[loserSide + "_player"];
      const loserTitle = loserPlayer ? loserPlayer.title : t("unknown");

      if (!nextState.score[winner_title] || typeof nextState.score[winner_title] === "number") {
        nextState.score[winner_title] = { win: 0, lose: 0, draw: 0, total: 0 };
      }
      nextState.score[winner_title].win += 1;
      nextState.score[winner_title].total += 1;

      if (!nextState.score[loserTitle] || typeof nextState.score[loserTitle] === "number") {
        nextState.score[loserTitle] = { win: 0, lose: 0, draw: 0, total: 0 };
      }
      nextState.score[loserTitle].lose += 1;
      nextState.score[loserTitle].total += 1;

      const recipients = getOtherRecipients();
      if (recipients.length > 0) {
        window.pudding?.send({
          type: "game_over",
          data: {
            winner: currentTurnSide,
            winner_title: winner_title,
            instruction: t("instruction_game_over", {
              winner: winner_title,
              stone: currentTurnSide === BLACK_SIDE ? t("black_stone") : t("white_stone")
            })
          },
          to: { sessions: recipients }
        });
        return {
          ok: true,
          state: nextState
        };
      }
      return { ok: true, state: nextState };
    }

    // 和局判定
    if (nextState.history.length >= SIZE * SIZE) {
      nextState.status = "game_over";
      nextState.winning_line = null;
      nextState.turn = null;

      const p1Title = nextState.black_player ? nextState.black_player.title : t("unknown");
      const p2Title = nextState.white_player ? nextState.white_player.title : t("unknown");

      if (!nextState.score[p1Title] || typeof nextState.score[p1Title] === "number") {
        nextState.score[p1Title] = { win: 0, lose: 0, draw: 0, total: 0 };
      }
      nextState.score[p1Title].draw += 1;
      nextState.score[p1Title].total += 1;

      if (!nextState.score[p2Title] || typeof nextState.score[p2Title] === "number") {
        nextState.score[p2Title] = { win: 0, lose: 0, draw: 0, total: 0 };
      }
      nextState.score[p2Title].draw += 1;
      nextState.score[p2Title].total += 1;

      const recipients = getOtherRecipients();
      if (recipients.length > 0) {
        window.pudding?.send({
          type: "game_over",
          data: {
            winner: "draw",
            instruction: t("instruction_draw")
          },
          to: { sessions: recipients }
        });
        return {
          ok: true,
          state: nextState
        };
      }
      return { ok: true, state: nextState };
    }

    // 切换回合
    const nextTurnSide = currentTurnSide === BLACK_SIDE ? WHITE_SIDE : BLACK_SIDE;
    nextState.turn = nextTurnSide;
    const nextPlayer = nextState[nextTurnSide + "_player"];

    if (nextPlayer && !isHuman(nextPlayer.session_id)) {
      window.pudding?.send({
        type: "place_stone",
        data: {
          board_text: formatBoardText(nextState.board),
          opponent_last_move: {
            row: public_row(coord.row),
            col: public_col(coord.col)
          },
          instruction: t("instruction_next_move", {
            hint: "",
            side: nextTurnSide === BLACK_SIDE ? t("black_stone") : t("white_stone")
          })
        },
        to: { sessions: [getRawSessionID(nextPlayer.session_id)] }
      });
      return {
        ok: true,
        state: nextState
      };
    }

    return { ok: true, state: nextState };
  }

  // 7. 悔棋动作
  if (action.type === "undo") {
    if (nextState.status !== "playing") return { ok: false, error: t("err_undo_not_playing") };
    if (nextState.history.length === 0) return { ok: false, error: t("err_no_history") };

    let undoCount = 1;
    const isPve = (nextState.black_player && isHuman(nextState.black_player.session_id) && nextState.white_player && !isHuman(nextState.white_player.session_id)) ||
      (nextState.white_player && isHuman(nextState.white_player.session_id) && nextState.black_player && !isHuman(nextState.black_player.session_id));

    if (isPve && nextState.history.length >= 2) {
      undoCount = 2;
    }

    for (let i = 0; i < undoCount; i++) {
      const move = nextState.history.pop();
      if (move) nextState.board[move.row][move.col] = EMPTY;
    }

    nextState.last_move = nextState.history.length ? { row: nextState.history[nextState.history.length - 1].row, col: nextState.history[nextState.history.length - 1].col } : null;
    nextState.winning_line = null;

    const nextTurnSide = nextState.history.length % 2 === 0 ? BLACK_SIDE : WHITE_SIDE;
    nextState.turn = nextTurnSide;

    const nextPlayer = nextState[nextTurnSide + "_player"];
    if (nextPlayer && !isHuman(nextPlayer.session_id)) {
      window.pudding?.send({
        type: "place_stone",
        data: {
          board_text: formatBoardText(nextState.board),
          instruction: t("instruction_next_move", {
            hint: "",
            side: nextTurnSide === BLACK_SIDE ? t("black_side") : t("white_side")
          })
        },
        to: { sessions: [getRawSessionID(nextPlayer.session_id)] }
      });
      return {
        ok: true,
        state: nextState
      };
    }

    return { ok: true, state: nextState };
  }

  // 8. 重置对局
  if (action.type === "reset") {
    nextState.board = emptyBoard();
    nextState.history = [];
    nextState.turn = null;
    nextState.black_ready = false;
    nextState.white_ready = false;
    nextState.last_move = null;
    nextState.winning_line = null;

    if (nextState.black_player !== null && nextState.white_player !== null) {
      nextState.status = "ready_checking";

      const rawCaller = actor && actor.role === "assistant" ? getRawSessionID(callerID) : null;
      const recipients = [];
      if (nextState.black_player && !isHuman(nextState.black_player.session_id)) {
        const raw = getRawSessionID(nextState.black_player.session_id);
        if (raw !== rawCaller) recipients.push(raw);
      }
      if (nextState.white_player && !isHuman(nextState.white_player.session_id)) {
        const raw = getRawSessionID(nextState.white_player.session_id);
        if (raw !== rawCaller) recipients.push(raw);
      }

      if (recipients.length > 0) {
        window.pudding?.send({
          type: "ready_check",
          data: {
            instruction: t("instruction_ready_check")
          },
          to: { sessions: recipients }
        });
        return {
          ok: true,
          state: nextState
        };
      }
    } else {
      nextState.status = "idle";
    }

    const recipients = getOtherRecipients();
    if (recipients.length > 0) {
      window.pudding?.send({
        type: "reset",
        data: {
          status: nextState.status,
          instruction: t("system_reset")
        },
        to: { sessions: recipients }
      });
      return {
        ok: true,
        state: nextState
      };
    }
    return { ok: true, state: nextState };
  }

  // 9. 清空积分
  if (action.type === "clear_score") {
    nextState.score = {};
    return { ok: true, state: nextState };
  }

  return { ok: false, error: "unknown action type: " + action.type };
}
