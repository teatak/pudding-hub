import { SIZE, EMPTY, BLACK, WHITE, BLACK_SIDE, WHITE_SIDE } from "./constants.js";
import { t, command, isHuman, side_label, inBounds, emptyBoard, toStone, sideForStone, public_row, public_col, toInternalCoord, displayCoord, formatBoardText, getRawSessionID, participantID } from "./utils.js";

export function buildActionSchema() {
  return {
    join_game: {
      description: t("action_join_desc"),
      action: { type: "join_game", side: "black | white" }
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
      action: { type: "place_stone", row: "integer 1-15", col: "integer 1-15", message: "string (optional)" }
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
    battle_log: [{ type: "system", text: t("system_ready") }],
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

  if (!state.battle_log) state.battle_log = [{ type: "system", text: t("system_ready") }];
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
    if (state.white_player && isHuman(state.white_player.session_id) && !state.black_player) {
      return {
        tool: "canvas_widget_dispatch",
        action: { type: "join_game", side: "black" }
      };
    }
    if (state.black_player && isHuman(state.black_player.session_id) && !state.white_player) {
      return {
        tool: "canvas_widget_dispatch",
        action: { type: "join_game", side: "white" }
      };
    }
    return null;
  }
  if (state.status === "ready_checking") {
    return null;
  }
  if (state.status === "playing" && state.turn) {
    const currentTurnSide = state.turn;
    const activePlayer = state[currentTurnSide + "_player"];
    if (activePlayer && !isHuman(activePlayer.session_id)) {
      return {
        tool: "canvas_widget_dispatch",
        action: { type: "place_stone", row: "1-15", col: "1-15" },
        example: { type: "place_stone", row: 8, col: 8 }
      };
    }
  }
  return null;
}

export function publicState(state) {
  withDerivedState(state);
  const p = JSON.parse(JSON.stringify(state));
  delete p.board;
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
  const ctx = context || {};

  const actor = ctx.actor || {};
  const callerID = participantID(actor);
  let callerTitle = "";
  if (actor.role === "human") {
    callerTitle = t("human_judge");
  } else {
    callerTitle = actor.name || t("smart_ai");
  }

  // 1. 选座加入对局
  if (action.type === "join_game") {
    const side = action.side;
    if (side !== BLACK_SIDE && side !== WHITE_SIDE) return { ok: false, error: "invalid side type" };
    if (nextState[side + "_player"] !== null) {
      return { ok: false, error: t("err_seat_taken", { side: side_label(side) }) };
    }

    nextState[side + "_player"] = { session_id: callerID, title: callerTitle };
    if (!nextState.score[callerTitle] || typeof nextState.score[callerTitle] === "number") {
      nextState.score[callerTitle] = { win: 0, lose: 0, draw: 0, total: 0 };
    }
    const logText = t("system_joined", { player: callerTitle, side: side_label(side) });
    nextState.battle_log.push({ type: "system", text: logText });

    let isFull = false;
    if (nextState.black_player !== null && nextState.white_player !== null) {
      nextState.status = "countdown";
      nextState.black_ready = false;
      nextState.white_ready = false;
      isFull = true;
    } else {
      nextState.status = "idle";
    }

    if (isFull) {
      return { ok: true, state: nextState };
    } else {
      const otherSide = side === BLACK_SIDE ? WHITE_SIDE : BLACK_SIDE;
      return {
        ok: true,
        state: nextState,
        send: {
          type: "player_joined",
          data: {
            side: side,
            player: nextState[side + "_player"],
            status: nextState.status,
            instruction: t("announce_join_waiting", {
              player: callerTitle,
              side: side_label(side),
              other_side: side_label(otherSide),
              command: command({ type: "join_game", side: otherSide })
            })
          }
        }
      };
    }
  }

  // 新增：邀请 AI 席位
  if (action.type === "invite_ai") {
    const side = action.side;
    if (side !== BLACK_SIDE && side !== WHITE_SIDE) return { ok: false, error: "invalid side type" };
    if (nextState[side + "_player"] !== null) {
      return { ok: false, error: t("err_seat_taken", { side: side_label(side) }) };
    }

    const logText = t("system_invite_ai", { side: side_label(side) });
    nextState.battle_log.push({ type: "system", text: logText });

    return {
      ok: true,
      state: nextState,
      send: {
        type: "player_joined",
        data: {
          side: side,
          player: null,
          status: nextState.status,
          instruction: t("announce_invite_ai", {
            side: side_label(side),
            command: command({ type: "join_game", side: side })
          })
        }
      }
    };
  }

  // 2. 离席重置
  if (action.type === "leave_game") {
    let leftSide = null;
    if (nextState.black_player && nextState.black_player.session_id === callerID) leftSide = BLACK_SIDE;
    else if (nextState.white_player && nextState.white_player.session_id === callerID) leftSide = WHITE_SIDE;

    if (!leftSide) return { ok: false, error: t("err_not_seated") };

    const leftPlayerName = nextState[leftSide + "_player"].title;
    nextState.battle_log.push({ type: "system", text: t("system_left", { player: leftPlayerName }) });
    nextState[leftSide + "_player"] = null;
    nextState.black_ready = false;
    nextState.white_ready = false;

    nextState.status = "idle";
    nextState.turn = null;

    const broadcastMsg = t("announce_left", { player: leftPlayerName, command: command({ type: "join_game", side: "black | white" }) });

    return {
      ok: true,
      state: nextState,
      send: {
        type: "player_left",
        data: {
          side: leftSide,
          player_title: leftPlayerName,
          status: nextState.status,
          instruction: broadcastMsg
        }
      }
    };
  }

  // 3. 请离席位（踢人）
  if (action.type === "kick_player") {
    const kickSide = action.side;
    if (kickSide !== BLACK_SIDE && kickSide !== WHITE_SIDE) return { ok: false, error: "invalid side type" };
    if (nextState[kickSide + "_player"] === null) return { ok: false, error: t("err_empty_seat") };

    const kickedPlayerName = nextState[kickSide + "_player"].title;
    nextState.battle_log.push({ type: "system", text: t("system_kicked", { player: kickedPlayerName }) });
    nextState[kickSide + "_player"] = null;
    nextState.black_ready = false;
    nextState.white_ready = false;

    nextState.status = "idle";
    nextState.turn = null;

    const broadcastMsg = t("announce_kicked", { player: kickedPlayerName, command: command({ type: "join_game", side: "black | white" }) });

    return {
      ok: true,
      state: nextState,
      send: {
        type: "player_kicked",
        data: {
          side: kickSide,
          player_title: kickedPlayerName,
          status: nextState.status,
          instruction: broadcastMsg
        }
      }
    };
  }

  // 4. 准备就绪制造阶段拉起
  if (action.type === "start_ready_check") {
    if (nextState.status !== "countdown") return { ok: true, state: nextState };
    nextState.status = "ready_checking";
    nextState.battle_log.push({ type: "system", text: t("system_ready_check") });

    const recipients = [];
    if (nextState.black_player && !isHuman(nextState.black_player.session_id) && !nextState.black_ready) recipients.push(getRawSessionID(nextState.black_player.session_id));
    if (nextState.white_player && !isHuman(nextState.white_player.session_id) && !nextState.white_ready) recipients.push(getRawSessionID(nextState.white_player.session_id));

    if (recipients.length > 0) {
      return {
        ok: true,
        state: nextState,
        send: {
          type: "ready_check",
          data: {
            instruction: t("instruction_ready_check", { command: command({ type: "ready" }) })
          },
          to: { sessions: recipients }
        }
      };
    }

    return { ok: true, state: nextState };
  }

  // 5. 准备确认
  if (action.type === "ready") {
    if (nextState.status !== "ready_checking" && nextState.status !== "countdown") return { ok: false, error: t("err_not_ready_checking") };

    if (nextState.black_player && nextState.black_player.session_id === callerID) {
      nextState.black_ready = true;
      nextState.battle_log.push({ type: "system", text: t("system_player_ready", { player: nextState.black_player.title, side: t("black_side") }) });
    }
    else if (nextState.white_player && nextState.white_player.session_id === callerID) {
      nextState.white_ready = true;
      nextState.battle_log.push({ type: "system", text: t("system_player_ready", { player: nextState.white_player.title, side: t("white_side") }) });
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
      nextState.battle_log.push({ type: "system", text: t("system_game_start") });

      if (!isHuman(nextState.black_player.session_id)) {
        return {
          ok: true,
          state: nextState,
          send: {
            type: "place_stone",
            data: {
              board_text: formatBoardText(nextState.board),
              instruction: t("instruction_first_move", { command: command({ type: "place_stone", row: 8, col: 8 }) })
            },
            to: { sessions: [getRawSessionID(nextState.black_player.session_id)] }
          }
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

    const sideLabel = currentTurnSide === BLACK_SIDE ? t("black_side") + " ●" : t("white_side") + " ○";
    let logText = t("system_move", { side: sideLabel, player: expectedPlayer.title, coord: displayCoord(coord.row, coord.col) });
    if (msg) {
      logText += " 💬 \"" + msg + "\"";
    }
    nextState.battle_log.push({
      type: currentTurnSide,
      text: logText
    });

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

      nextState.battle_log.push({ type: "win", text: t("system_win", { winner: winner_title }) });

      const gameOverRecipients = [];
      if (nextState.black_player && !isHuman(nextState.black_player.session_id)) gameOverRecipients.push(getRawSessionID(nextState.black_player.session_id));
      if (nextState.white_player && !isHuman(nextState.white_player.session_id)) gameOverRecipients.push(getRawSessionID(nextState.white_player.session_id));

      if (gameOverRecipients.length > 0) {
        return {
          ok: true,
          state: nextState,
          send: {
            type: "game_over",
            data: {
              winner: currentTurnSide,
              winner_title: winner_title,
              instruction: t("instruction_game_over", {
                winner: winner_title,
                stone: currentTurnSide === BLACK_SIDE ? t("black_stone") : t("white_stone")
              })
            },
            to: { sessions: gameOverRecipients }
          }
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

      nextState.battle_log.push({ type: "system", text: t("system_draw") });

      const drawRecipients = [];
      if (nextState.black_player && !isHuman(nextState.black_player.session_id)) drawRecipients.push(getRawSessionID(nextState.black_player.session_id));
      if (nextState.white_player && !isHuman(nextState.white_player.session_id)) drawRecipients.push(getRawSessionID(nextState.white_player.session_id));

      if (drawRecipients.length > 0) {
        return {
          ok: true,
          state: nextState,
          send: {
            type: "game_over",
            data: {
              winner: "draw",
              instruction: t("instruction_draw")
            },
            to: { sessions: drawRecipients }
          }
        };
      }

      return { ok: true, state: nextState };
    }

    // 切换回合
    const nextTurnSide = currentTurnSide === BLACK_SIDE ? WHITE_SIDE : BLACK_SIDE;
    nextState.turn = nextTurnSide;
    const nextPlayer = nextState[nextTurnSide + "_player"];

    if (nextPlayer && !isHuman(nextPlayer.session_id)) {
      let opponentMsgHint = "";
      if (msg) {
        opponentMsgHint = t("opponent_message", { message: msg });
      }
      return {
        ok: true,
        state: nextState,
        send: {
          type: "place_stone",
          data: {
            board_text: formatBoardText(nextState.board),
            opponent_last_move: {
              row: public_row(coord.row),
              col: public_col(coord.col),
              message: msg
            },
            instruction: t("instruction_next_move", {
              hint: opponentMsgHint,
              side: nextTurnSide === BLACK_SIDE ? t("black_side") : t("white_side"),
              command: command({ type: "place_stone", row: 8, col: 8, message: "..." })
            })
          },
          to: { sessions: [getRawSessionID(nextPlayer.session_id)] }
        }
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
    nextState.battle_log.push({ type: "system", text: t("system_undo") });

    const nextPlayer = nextState[nextTurnSide + "_player"];
    if (nextPlayer && !isHuman(nextPlayer.session_id)) {
      return {
        ok: true,
        state: nextState,
        send: {
          type: "place_stone",
          data: {
            board_text: formatBoardText(nextState.board),
            instruction: t("instruction_undo_move", {
              side: nextTurnSide === BLACK_SIDE ? t("black_side") : t("white_side"),
              command: command({ type: "place_stone", row: 8, col: 8 })
            })
          },
          to: { sessions: [getRawSessionID(nextPlayer.session_id)] }
        }
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
      nextState.status = "countdown";
    } else {
      nextState.status = "idle";
    }

    nextState.battle_log.push({ type: "system", text: t("system_reset") });
    return { ok: true, state: nextState };
  }

  // 9. 清空积分
  if (action.type === "clear_score") {
    nextState.score = {};
    nextState.battle_log.push({ type: "system", text: t("system_clear_score") });
    return { ok: true, state: nextState };
  }

  return { ok: false, error: "unknown action type: " + action.type };
}
