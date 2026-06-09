(function () {
  "use strict";

  var SIZE = 15;
  var EMPTY = " ";
  var BLACK = "●";
  var WHITE = "○";
  var BLACK_SIDE = "black";
  var WHITE_SIDE = "white";
  var DESIGN_BOARD_SIZE = 420;
  var STARS = [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]];

  var boardEl = document.getElementById("gomoku-board");
  var svgEl = document.getElementById("board-svg");
  var spotsEl = document.getElementById("spots-layer");
  var logEl = document.getElementById("battle-log");

  var readyBtn = document.getElementById("ready-btn");
  var undoBtn = document.getElementById("undo-btn");
  var leaderboardBtn = document.getElementById("leaderboard-btn");
  var leaderboardModal = document.getElementById("leaderboard-modal");
  var modalCloseBtn = document.getElementById("modal-close-btn");
  var leaderboardTbody = document.getElementById("leaderboard-tbody");
  var arenaTitleEl = document.getElementById("arena-title-id");
  var leaderboardTitleEl = document.getElementById("leaderboard-title");
  var thRank = document.getElementById("th-rank");
  var thPlayer = document.getElementById("th-player");
  var thTotal = document.getElementById("th-total");
  var thWin = document.getElementById("th-win");
  var thLose = document.getElementById("th-lose");
  var thDraw = document.getElementById("th-draw");
  var thWinRate = document.getElementById("th-winRate");
  var resetBtn = document.getElementById("reset-btn");
  var clearScoreBtn = document.getElementById("clear-score-btn");

  var currentSortKey = "win"; // 默认按胜利场次排序
  var LEADERBOARD_DATA_KEY = "leaderboard";

  var isCountdownTimerStarted = false; 
  var lastRenderedHistoryLength = 0; 
  var bubbleTimerBlack = null;
  var bubbleTimerWhite = null;
  var currentLocale = "zh-CN";

  function normalizeLocale(value) {
    return value === "zh-CN" || value === "zh-TW" || value === "en" ? value : "zh-CN";
  }

  function t(key, params) {
    var dict = (window.GOMOKU_I18N && window.GOMOKU_I18N[currentLocale]) || (window.GOMOKU_I18N && window.GOMOKU_I18N["zh-CN"]) || {};
    var fallback = (window.GOMOKU_I18N && window.GOMOKU_I18N["zh-CN"]) || {};
    var text = dict[key] || fallback[key] || key;
    if (params) {
      Object.keys(params).forEach(function (name) {
        text = text.replace(new RegExp("\\{" + name + "\\}", "g"), String(params[name]));
      });
    }
    return text;
  }

  function command(action) {
    return '{ "id": "gomoku", "action": ' + JSON.stringify(action) + " }";
  }

  function side_label(side) {
    return side === BLACK_SIDE ? t("black_side") : t("white_side");
  }

  function applyPuddingTheme(theme) {
    var mode = theme && theme.mode === "light" ? "light" : "dark";
    document.documentElement.dataset.puddingTheme = mode;
  }

  function buildActionSchema() {
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

  function buildGuide() {
    return t("guide");
  }

  function localizeStatic() {
    if (arenaTitleEl) arenaTitleEl.textContent = t("title");
    document.title = t("title");
    if (readyBtn) readyBtn.textContent = t("ready");
    if (undoBtn) undoBtn.textContent = t("undo");
    if (leaderboardBtn) leaderboardBtn.textContent = "🏆 " + t("leaderboard");
    if (resetBtn) resetBtn.textContent = t("reset_board");
    if (clearScoreBtn) clearScoreBtn.textContent = t("clear_score");
    if (leaderboardTitleEl) leaderboardTitleEl.textContent = t("leaderboard_title");
    if (thRank) thRank.textContent = t("rank");
    if (thPlayer) thPlayer.textContent = t("player");
    if (thTotal) thTotal.textContent = t("total");
    if (thWin) thWin.textContent = t("win");
    if (thLose) thLose.textContent = t("lose");
    if (thDraw) thDraw.textContent = t("draw");
    if (thWinRate) thWinRate.textContent = t("win_rate");
  }

  function applyPuddingLocale(next) {
    currentLocale = normalizeLocale(next && typeof next === "object" ? next.locale : next);
    document.documentElement.lang = currentLocale;
    localizeStatic();
    ACTION_SCHEMA = buildActionSchema();
    GUIDE = buildGuide();
    if (state) {
      withDerivedState(state);
      render();
    }
  }

  if (window.pudding) {
    applyPuddingTheme(window.pudding.theme);
    if (typeof window.pudding.onTheme === "function") {
      window.pudding.onTheme(applyPuddingTheme);
    }
    applyPuddingLocale(window.pudding.locale);
    if (typeof window.pudding.onLocale === "function") {
      window.pudding.onLocale(applyPuddingLocale);
    }
  }

  var ACTION_SCHEMA = buildActionSchema();
  var GUIDE = buildGuide();

  function inPublicBounds(row, col) {
    return Number.isInteger(row) && Number.isInteger(col) && row >= 1 && row <= SIZE && col >= 1 && col <= SIZE;
  }

  function inBounds(row, col) {
    return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < SIZE && col >= 0 && col < SIZE;
  }

  function emptyBoard() {
    return Array.from({ length: SIZE }, function () {
      return Array(SIZE).fill(EMPTY);
    });
  }

  function toStone(value) {
    if (value === BLACK || value === "black" || value === "b" || value === 1) return BLACK;
    if (value === WHITE || value === "white" || value === "w" || value === 2) return WHITE;
    return EMPTY;
  }

  function sideForStone(stone) {
    return stone === WHITE ? WHITE_SIDE : BLACK_SIDE;
  }

  function stoneClass(value) {
    if (value === BLACK) return "black";
    if (value === WHITE) return "white";
    return "";
  }

  function public_row(row) {
    return row + 1;
  }

  function public_col(col) {
    return col + 1;
  }

  function toInternalCoord(row, col) {
    var r = Number(row);
    var c = Number(col);
    if (!Number.isInteger(r) || !Number.isInteger(c)) return null;
    if (!inPublicBounds(r, c)) return null;
    return { row: r - 1, col: c - 1 };
  }

  // 辅助函数，测试环境需要 formatBoardText 否则报错
  window.formatBoardText = formatBoardText;
  window.normalizeState = normalizeState;

  function displayCoord(row, col) {
    return "(" + (row + 1) + ", " + (col + 1) + ")";
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatBoardText(board) {
    var lines = [];
    lines.push("    " + Array.from({ length: SIZE }, function (_, i) { return pad2(i + 1); }).join(" "));
    for (var row = 0; row < SIZE; row++) {
      var cells = [];
      for (var col = 0; col < SIZE; col++) {
        var value = board[row][col];
        cells.push(value === EMPTY ? " ＋" : " " + value);
      }
      lines.push(" " + pad2(row + 1) + " " + cells.join(" "));
    }
    return lines.join("\n");
  }

  function freshState() {
    var board = emptyBoard();
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
      actions_schema: ACTION_SCHEMA,
      guide: GUIDE,
      next_action: null
    };
  }

  function boardFromHistory(history) {
    var board = emptyBoard();
    if (!Array.isArray(history)) return board;
    history.forEach(function (move) {
      if (!move || !inBounds(move.row, move.col)) return;
      board[move.row][move.col] = toStone(move.stone);
    });
    return board;
  }

  function normalizeState(raw) {
    var defaultState = freshState();
    if (!raw || typeof raw !== "object") return defaultState;

    var state = JSON.parse(JSON.stringify(raw));
    if (!Array.isArray(state.history)) state.history = [];
    if (!state.board) state.board = boardFromHistory(state.history);
    
    if (!state.score) state.score = {};
    for (var name in state.score) {
      var entry = state.score[name];
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
    if (state.black_ready === undefined) state.black_ready = false;
    if (state.white_ready === undefined) state.white_ready = false;
    if (state.status === undefined) state.status = "idle";

    return withDerivedState(state);
  }

  function normalizeScore(raw) {
    var score = raw && typeof raw === "object" && !Array.isArray(raw) ? JSON.parse(JSON.stringify(raw)) : {};
    for (var name in score) {
      var entry = score[name];
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

  function scoreHasEntries(score) {
    return !!score && typeof score === "object" && Object.keys(score).length > 0;
  }

  async function loadLeaderboardData() {
    if (!window.pudding || typeof window.pudding.getData !== "function") return;
    try {
      var stored = normalizeScore(await window.pudding.getData(LEADERBOARD_DATA_KEY));
      if (scoreHasEntries(stored)) {
        state.score = stored;
        publishState();
        renderLeaderboard();
        render();
      } else if (scoreHasEntries(state.score)) {
        await saveLeaderboardData(state.score);
      }
    } catch (err) {
      // Leaderboard persistence should not block the board.
    }
  }

  async function saveLeaderboardData(score) {
    if (!window.pudding || typeof window.pudding.setData !== "function") return;
    try {
      await window.pudding.setData(LEADERBOARD_DATA_KEY, normalizeScore(score));
    } catch (err) {
      // Ignore persistence failures; the current match state is still valid.
    }
  }

  async function deleteLeaderboardData() {
    if (!window.pudding || typeof window.pudding.deleteData !== "function") return;
    try {
      await window.pudding.deleteData(LEADERBOARD_DATA_KEY);
    } catch (err) {
      // Ignore persistence failures; the UI still clears local score.
    }
  }

  function withDerivedState(state) {
    if (state.board) {
      state.board_text = formatBoardText(state.board);
    }
    state.actions_schema = ACTION_SCHEMA;
    state.guide = GUIDE;
    state.next_action = nextModelActionForState(state);
    return state;
  }

  function nextModelActionForState(state) {
    if (state.status === "ready_checking") {
      var mySide = getMySide(state);
      if (mySide === BLACK_SIDE && !state.black_ready) {
        return { tool: "canvas_widget_dispatch", action: { type: "ready" } };
      }
      if (mySide === WHITE_SIDE && !state.white_ready) {
        return { tool: "canvas_widget_dispatch", action: { type: "ready" } };
      }
    }
    if (state.status === "playing" && state.turn) {
      var currentTurnSide = state.turn;
      var activePlayer = state[currentTurnSide + "_player"];
      if (activePlayer && activePlayer.session_id !== "human") {
        return {
          tool: "canvas_widget_dispatch",
          action: { type: "place_stone", row: "1-15", col: "1-15" },
          example: { type: "place_stone", row: 8, col: 8 }
        };
      }
    }
    if (state.status === "game_over") {
      var mySide = getMySide(state);
      if (mySide) {
        return { tool: "canvas_widget_dispatch", action: { type: "leave_game" } };
      }
    }
    return null;
  }

  function getMySide(state) {
    return null;
  }

  function publicState() {
    withDerivedState(state);
    var p = JSON.parse(JSON.stringify(state));
    delete p.board;
    return p;
  }

  function publishState() {
    if (window.pudding && typeof window.pudding.setState === "function") {
      window.pudding.setState(publicState());
    }
  }

  function boardMetrics() {
    var size = boardEl.clientWidth || DESIGN_BOARD_SIZE;
    var edge = Math.max(12, Math.min(18, Math.round(size * 0.038)));
    return { size: size, edge: edge, grid: (size - edge * 2) / (SIZE - 1) };
  }

  function cellX(col, metrics) {
    var m = metrics || boardMetrics();
    return m.edge + col * m.grid;
  }

  function cellY(row, metrics) {
    var m = metrics || boardMetrics();
    return m.edge + row * m.grid;
  }

  function drawGrid() {
    var metrics = boardMetrics();
    svgEl.innerHTML = "";
    svgEl.setAttribute("viewBox", "0 0 " + metrics.size + " " + metrics.size);
    for (var i = 0; i < SIZE; i++) {
      var h = document.createElementNS("http://www.w3.org/2000/svg", "line");
      h.setAttribute("x1", metrics.edge);
      h.setAttribute("y1", cellY(i, metrics));
      h.setAttribute("x2", metrics.size - metrics.edge);
      h.setAttribute("y2", cellY(i, metrics));
      h.setAttribute("class", "board-line");
      svgEl.appendChild(h);

      var v = document.createElementNS("http://www.w3.org/2000/svg", "line");
      v.setAttribute("x1", cellX(i, metrics));
      v.setAttribute("y1", metrics.edge);
      v.setAttribute("x2", cellX(i, metrics));
      v.setAttribute("y2", metrics.size - metrics.edge);
      v.setAttribute("class", "board-line");
      svgEl.appendChild(v);
    }
    STARS.forEach(function (point) {
      var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", cellX(point[1], metrics));
      dot.setAttribute("cy", cellY(point[0], metrics));
      dot.setAttribute("r", "3");
      dot.setAttribute("class", "board-star");
      svgEl.appendChild(dot);
    });
  }

  function isWinningPoint(row, col) {
    return Array.isArray(state.winning_line) && state.winning_line.some(function (point) {
      return point.row === row && point.col === col;
    });
  }

  function runReadyCountdown() {
    isCountdownTimerStarted = true;
    var counts = [3, 2, 1];
    var index = 0;
    
    if (navigator.vibrate) navigator.vibrate(15);

    var timer = setInterval(function() {
      index++;
      if (index < counts.length) {
        if (navigator.vibrate) navigator.vibrate(15);
      } else {
        clearInterval(timer);
        isCountdownTimerStarted = false;
        if (window.pudding && typeof window.pudding.dispatch === "function") {
          window.pudding.dispatch({ type: "start_ready_check" });
        }
      }
    }, 1000);
  }

  function getGeminiSVG() {
    return '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">' +
           '<path d="M12 2C12 2 12.5 8.5 14 10C15.5 11.5 22 12 22 12C22 12 15.5 12.5 14 14C12.5 15.5 12 22 12 22C12 22 11.5 15.5 10 14C8.5 12.5 2 12 2 12C2 12 8.5 11.5 10 10C11.5 8.5 12 2 12 2Z" fill="url(#gemini-grad)" />' +
           '<defs><linearGradient id="gemini-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">' +
           '<stop offset="0%" stop-color="#38bdf8" /><stop offset="50%" stop-color="#818cf8" /><stop offset="100%" stop-color="#c084fc" />' +
           '</linearGradient></defs></svg>';
  }

  function getGPTSVG() {
    return '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="color: #10a37f;">' +
           '<path d="M21.7 11.2c0-.4-.1-.8-.3-1.1-.3-.6-.7-1-1.3-1.2l.2-1.3c.1-.4 0-.8-.2-1.2-.3-.6-.8-.9-1.4-1l-.5-1.2c-.2-.4-.5-.7-.9-.8-.7-.2-1.3 0-1.7.5l-1.1-.7c-.4-.2-.8-.3-1.2-.2-.7.1-1.2.6-1.5 1.2l-1.2-.5c-.4-.1-.8-.1-1.2.1-.6.3-1 .8-1.1 1.4l-1.3-.2c-.4-.1-.8 0-1.2.2-.6.3-.9.8-1 1.4L4.8 7c-.2.4-.3.8-.2 1.2 0 .7.4 1.2 1 1.5l-.5 1.2c-.1.4-.1.8.1 1.2.3.6.8 1 1.4 1.1l.2 1.3c.1.4.3.7.6.9.5.4 1.2.4 1.7.2l.7 1.1c.2.4.6.6 1 .7.7.2 1.3-.1 1.7-.6l1.2.5c.4.2.8.2 1.2.1.6-.2 1.1-.7 1.3-1.3l1.2.5c.4.1.8.1 1.2-.1.6-.3.9-.8 1-1.4l1.3.2c.4.1.8 0 1.2-.2.6-.3.9-.8 1-1.4l1.2.5c.2.1.5.1.8 0 .3-.1.5-.3.6-.5.4-.5.4-1.2.1-1.7zm-9.7 4.1l-2.4-1.4 2.4-1.4 2.4 1.4-2.4 1.4z" />' +
           '</svg>';
  }

  function getClaudeSVG() {
    return '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #d97706;" xmlns="http://www.w3.org/2000/svg">' +
           '<path d="M12 3v18M12 12h9M12 12H3" />' +
           '<circle cx="12" cy="12" r="7" stroke-dasharray="2 2" />' +
           '</svg>';
  }

  function getDeepSeekSVG() {
    return '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">' +
           '<rect width="24" height="24" rx="5" fill="#4D6BFE" />' +
           '<g transform="translate(4.8 4.8) scale(0.6)">' +
           '<path d="M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45" fill="#ffffff" />' +
           '</g></svg>';
  }

  function getQwenSVG() {
    return '<svg viewBox="0 0 24 24" width="26" height="26" xmlns="http://www.w3.org/2000/svg">' +
           '<rect width="24" height="24" rx="5" fill="#615CED" />' +
           '<g transform="translate(4.8 4.8) scale(0.6)">' +
           '<path d="M23.919 14.545 20.817 9.17l1.47-2.544a.56.56 0 0 0 0-.566l-1.633-2.83a.57.57 0 0 0-.49-.283h-6.207L12.487.402a.57.57 0 0 0-.49-.284H8.732a.56.56 0 0 0-.49.284L5.139 5.775h-2.94a.56.56 0 0 0-.49.284L.077 8.887a.56.56 0 0 0 0 .567L3.18 14.83l-1.47 2.545a.56.56 0 0 0 0 .566l1.634 2.83a.57.57 0 0 0 .49.283h6.205l1.47 2.545a.57.57 0 0 0 .49.284h3.266a.57.57 0 0 0 .49-.284l3.104-5.375h2.94a.57.57 0 0 0 .49-.283l1.634-2.828a.55.55 0 0 0-.004-.568M8.733.686l1.634 2.828-1.634 2.828H21.8L20.164 9.17H7.425L5.63 6.06Zm1.306 19.801-6.205-.002 1.634-2.83h3.265L2.201 6.344h3.267q3.182 5.517 6.367 11.032zm10.124-5.66L18.53 12l-6.532 11.315-1.634-2.83c2.129-3.673 4.25-7.351 6.373-11.028h3.592l3.102 5.374z" fill="#ffffff" />' +
           '</g></svg>';
  }

  function getZhipuSVG() {
    return '<svg viewBox="0 0 24 24" width="26" height="26" xmlns="http://www.w3.org/2000/svg">' +
           '<rect width="24" height="24" rx="5" fill="#3859FF" />' +
           '<text x="12" y="17.5" text-anchor="middle" font-family="system-ui, -apple-system, \'PingFang SC\', \'Microsoft YaHei\', sans-serif" font-size="14" font-weight="700" fill="#ffffff">智</text>' +
           '</svg>';
  }

  function getKimiSVG() {
    return '<svg viewBox="0 0 24 24" width="26" height="26" xmlns="http://www.w3.org/2000/svg">' +
           '<rect width="24" height="24" rx="5" fill="#1A237E" />' +
           '<text x="12" y="17" text-anchor="middle" font-family="system-ui, -apple-system, \'Helvetica Neue\', sans-serif" font-size="13" font-weight="700" fill="#ffffff">K</text>' +
           '</svg>';
  }

  function getGrokSVG() {
    return '<svg viewBox="0 0 24 24" width="26" height="26" xmlns="http://www.w3.org/2000/svg">' +
           '<rect width="24" height="24" rx="5" fill="#000000" />' +
           '<g transform="translate(4.8 4.8) scale(0.6)">' +
           '<path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" fill="#ffffff" />' +
           '</g></svg>';
  }

  function getMimoSVG() {
    return '<svg viewBox="0 0 24 24" width="26" height="26" xmlns="http://www.w3.org/2000/svg">' +
           '<rect width="24" height="24" rx="5" fill="#FF6900" />' +
           '<text x="12" y="17" text-anchor="middle" font-family="system-ui, -apple-system, \'Helvetica Neue\', sans-serif" font-size="13" font-weight="700" fill="#ffffff">Mi</text>' +
           '</svg>';
  }

  function getHumanSVG() {
    return '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">' +
           '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />' +
           '<circle cx="12" cy="7" r="4" />' +
           '</svg>';
  }

  function getRobotSVG(session_id) {
    var hash = 0;
    if (session_id) {
      for (var i = 0; i < session_id.length; i++) {
        hash = session_id.charCodeAt(i) + ((hash << 5) - hash);
      }
    }
    var hue = Math.abs(hash % 360);
    var color = "hsl(" + hue + ", 75%, 65%)";
    
    return '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">' +
           '<rect x="3" y="11" width="18" height="10" rx="2" />' +
           '<path d="M12 2v4M8 5h8M7 11V9a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2M9 15h.01M15 15h.01" />' +
           '</svg>';
  }

  function renderAvatar(session_id, title) {
    var t = (title || "").toLowerCase();
    if (session_id === "human") return getHumanSVG();
    if (t.indexOf("gemini") !== -1) return getGeminiSVG();
    if (t.indexOf("gpt") !== -1 || t.indexOf("openai") !== -1 || t.indexOf("chatgpt") !== -1) return getGPTSVG();
    if (t.indexOf("claude") !== -1 || t.indexOf("anthropic") !== -1) return getClaudeSVG();
    if (t.indexOf("deepseek") !== -1) return getDeepSeekSVG();
    if (t.indexOf("qwen") !== -1 || t.indexOf("tongyi") !== -1) return getQwenSVG();
    if (t.indexOf("glm") !== -1 || t.indexOf("zhipu") !== -1) return getZhipuSVG();
    if (t.indexOf("kimi") !== -1 || t.indexOf("moonshot") !== -1) return getKimiSVG();
    if (t.indexOf("grok") !== -1 || t.indexOf("xai") !== -1) return getGrokSVG();
    if (t.indexOf("mimo") !== -1 || t.indexOf("xiaomi") !== -1) return getMimoSVG();
    return getRobotSVG(session_id);
  }

  function renderScoreboard() {
    var panelBlack = document.getElementById("panel-black").querySelector(".player-card");
    var panelWhite = document.getElementById("panel-white").querySelector(".player-card");
    
    panelBlack.classList.remove("ready-state", "active-turn");
    panelWhite.classList.remove("ready-state", "active-turn");

    // 1. 黑方卡片渲染
    var avatarBlackEl = document.getElementById("avatar-black-container");
    var nameBlackEl = document.getElementById("name-black");
    var badgeBlackEl = document.getElementById("status-badge-black");
    var actionBlackEl = document.getElementById("action-black-btn-container");
    var scoreBlackEl = document.getElementById("score-black-display");

    if (state.black_player) {
      // 只有加入了，加入按钮隐藏才有状态
      badgeBlackEl.style.display = "inline-flex";
      
      var blackTitle = state.black_player.session_id === "human" ? t("human_judge") : state.black_player.title;
      avatarBlackEl.innerHTML = renderAvatar(state.black_player.session_id, blackTitle);
      nameBlackEl.textContent = blackTitle;
      scoreBlackEl.textContent = (state.score[blackTitle] && typeof state.score[blackTitle] === "object") ? state.score[blackTitle].win : 0;
      
      if (state.status === "ready_checking") {
        if (state.black_ready) {
          badgeBlackEl.textContent = t("ready_status");
          badgeBlackEl.className = "player-status-badge ready";
          panelBlack.classList.add("ready-state");
        } else {
          badgeBlackEl.textContent = t("preparing");
          badgeBlackEl.className = "player-status-badge";
        }
      } else if (state.status === "playing") {
        if (state.turn === BLACK_SIDE) {
          badgeBlackEl.textContent = t("thinking");
          badgeBlackEl.className = "player-status-badge thinking";
          panelBlack.classList.add("active-turn");
        } else {
          badgeBlackEl.textContent = t("waiting");
          badgeBlackEl.className = "player-status-badge";
        }
      } else {
        badgeBlackEl.textContent = t("seated");
        badgeBlackEl.className = "player-status-badge";
      }

      if (state.black_player.session_id === "human") {
        actionBlackEl.innerHTML = '<button class="seat-btn leave-btn" data-side="black">' + t("leave") + '</button>';
      } else {
        actionBlackEl.innerHTML = '<button class="seat-btn kick-btn" data-side="black">' + t("kick") + '</button>';
      }
    } else {
      // 没加入时隐藏状态 badge
      badgeBlackEl.style.display = "none";
      
      avatarBlackEl.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9"/></svg>';
      nameBlackEl.textContent = t("waiting_join");
      badgeBlackEl.textContent = t("empty");
      badgeBlackEl.className = "player-status-badge";
      scoreBlackEl.textContent = "0";
      if (state.status === "idle") {
        actionBlackEl.innerHTML = '<button class="seat-btn join-btn" data-side="black">' + t("join_black") + '</button>';
      } else {
        actionBlackEl.innerHTML = "";
      }
    }

    // 2. 白方卡片渲染
    var avatarWhiteEl = document.getElementById("avatar-white-container");
    var nameWhiteEl = document.getElementById("name-white");
    var badgeWhiteEl = document.getElementById("status-badge-white");
    var actionWhiteEl = document.getElementById("action-white-btn-container");
    var scoreWhiteEl = document.getElementById("score-white-display");

    if (state.white_player) {
      // 只有加入了，加入按钮隐藏才有状态
      badgeWhiteEl.style.display = "inline-flex";

      var whiteTitle = state.white_player.session_id === "human" ? t("human_judge") : state.white_player.title;
      avatarWhiteEl.innerHTML = renderAvatar(state.white_player.session_id, whiteTitle);
      nameWhiteEl.textContent = whiteTitle;
      scoreWhiteEl.textContent = (state.score[whiteTitle] && typeof state.score[whiteTitle] === "object") ? state.score[whiteTitle].win : 0;
      
      if (state.status === "ready_checking") {
        if (state.white_ready) {
          badgeWhiteEl.textContent = t("ready_status");
          badgeWhiteEl.className = "player-status-badge ready";
          panelWhite.classList.add("ready-state");
        } else {
          badgeWhiteEl.textContent = t("preparing");
          badgeWhiteEl.className = "player-status-badge";
        }
      } else if (state.status === "playing") {
        if (state.turn === WHITE_SIDE) {
          badgeWhiteEl.textContent = t("thinking");
          badgeWhiteEl.className = "player-status-badge thinking";
          panelWhite.classList.add("active-turn");
        } else {
          badgeWhiteEl.textContent = t("waiting");
          badgeWhiteEl.className = "player-status-badge";
        }
      } else {
        badgeWhiteEl.textContent = t("seated");
        badgeWhiteEl.className = "player-status-badge";
      }

      if (state.white_player.session_id === "human") {
        actionWhiteEl.innerHTML = '<button class="seat-btn leave-btn" data-side="white">' + t("leave") + '</button>';
      } else {
        actionWhiteEl.innerHTML = '<button class="seat-btn kick-btn" data-side="white">' + t("kick") + '</button>';
      }
    } else {
      // 没加入时隐藏状态 badge
      badgeWhiteEl.style.display = "none";

      avatarWhiteEl.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9"/></svg>';
      nameWhiteEl.textContent = t("waiting_join");
      badgeWhiteEl.textContent = t("empty");
      badgeWhiteEl.className = "player-status-badge";
      scoreWhiteEl.textContent = "0";
      if (state.status === "idle") {
        actionWhiteEl.innerHTML = '<button class="seat-btn join-btn" data-side="white">' + t("join_white") + '</button>';
      } else {
        actionWhiteEl.innerHTML = "";
      }
    }

    var buttons = document.querySelectorAll(".seat-btn");
    buttons.forEach(function(btn) {
      btn.addEventListener("click", function(e) {
        var actionType = "";
        if (btn.classList.contains("join-btn")) actionType = "join_game";
        else if (btn.classList.contains("leave-btn")) actionType = "leave_game";
        else if (btn.classList.contains("kick-btn")) actionType = "kick_player";

        var side = btn.getAttribute("data-side");
        
        if (window.pudding && typeof window.pudding.dispatch === "function") {
          window.pudding.dispatch({ type: actionType, side: side });
        }
      });
    });
  }

  function renderBoard() {
    var metrics = boardMetrics();
    spotsEl.innerHTML = "";
    var gridPx = Math.round(metrics.grid);
    for (var row = 0; row < SIZE; row++) {
      for (var col = 0; col < SIZE; col++) {
        var spot = document.createElement("button");
        spot.type = "button";
        spot.className = "spot";
        spot.style.left = cellX(col, metrics) + "px";
        spot.style.top = cellY(row, metrics) + "px";
        spot.style.width = gridPx + "px";
        spot.style.height = gridPx + "px";
        spot.setAttribute("data-row", String(row));
        spot.setAttribute("data-col", String(col));
        spot.setAttribute("aria-label", "row " + public_row(row) + " col " + public_col(col));
        
        var isMyTurn = false;
        if (state.status === "playing" && state.turn) {
          var currentPlayer = state[state.turn + "_player"];
          if (currentPlayer && currentPlayer.session_id === "human") {
            isMyTurn = true;
          }
        }
        
        if (state.board[row][col] !== EMPTY || !isMyTurn) {
          spot.disabled = true;
        }
        spot.addEventListener("click", onBoardClick);

        var value = state.board[row][col];
        if (value !== EMPTY) {
          var stone = document.createElement("div");
          var isLastMove = state.last_move && state.last_move.row === row && state.last_move.col === col;
          var shouldAnimate = isLastMove && !state.last_move_animated;
          stone.className = "stone " + stoneClass(value) + (shouldAnimate ? " animate" : "");
          if (isWinningPoint(row, col)) stone.className += " winning";
          spot.appendChild(stone);
          if (isLastMove) {
            var marker = document.createElement("div");
            marker.className = "last-move-marker";
            spot.appendChild(marker);
          }
        }
        spotsEl.appendChild(spot);
      }
    }
  }

  function renderLog() {
    logEl.innerHTML = "";
    state.battle_log.forEach(function (item) {
      var line = document.createElement("div");
      line.textContent = item.text;
      if (item.type === "system") line.className = "log-system";
      else if (item.type === "black") line.className = "log-black";
      else if (item.type === "white") line.className = "log-white";
      else if (item.type === "win") line.className = "log-win";
      else if (item.type === "error") line.className = "log-error";
      logEl.appendChild(line);
    });
    logEl.scrollTop = logEl.scrollHeight;
  }

  function render() {
    withDerivedState(state);
    
    // 准备就绪表态逻辑
    var isHumanReadyCheck = false;
    if (state.status === "ready_checking") {
      if (state.black_player && state.black_player.session_id === "human" && !state.black_ready) isHumanReadyCheck = true;
      if (state.white_player && state.white_player.session_id === "human" && !state.white_ready) isHumanReadyCheck = true;
    }
    
    undoBtn.style.display = "block";
    if (isHumanReadyCheck) {
      readyBtn.style.display = "block";
      readyBtn.disabled = false;
    } else {
      readyBtn.style.display = "none";
    }

    // 悔棋控制
    var currentTurnIsHuman = false;
    if (state.status === "playing" && state.turn) {
      var activeP = state[state.turn + "_player"];
      if (activeP && activeP.session_id === "human") currentTurnIsHuman = true;
    }
    if (state.status === "playing" && currentTurnIsHuman && state.history.length > 0) {
      undoBtn.disabled = false;
    } else {
      undoBtn.disabled = true;
    }

    // 倒计时拉起逻辑（恢复倒计时判定）
    if (state.status === "countdown") {
      if (!isCountdownTimerStarted) {
        runReadyCountdown();
      }
    }



    drawGrid();
    renderScoreboard();
    renderBoard();
    renderLog();

    // 气泡逻辑与避让
    if (state.history.length > lastRenderedHistoryLength) {
      var latestMove = state.history[state.history.length - 1];
      if (latestMove && latestMove.message) {
        var side = sideForStone(latestMove.stone);
        var bubbleEl = document.getElementById("bubble-" + side);
        if (bubbleEl) {
          bubbleEl.textContent = latestMove.message;
          bubbleEl.classList.add("show");
          
          if (side === BLACK_SIDE) {
            if (bubbleTimerBlack) clearTimeout(bubbleTimerBlack);
            bubbleTimerBlack = setTimeout(function() {
              bubbleEl.classList.remove("show");
            }, 4000);
          } else {
            if (bubbleTimerWhite) clearTimeout(bubbleTimerWhite);
            bubbleTimerWhite = setTimeout(function() {
              bubbleEl.classList.remove("show");
            }, 4000);
          }
        }
      }
      lastRenderedHistoryLength = state.history.length;
    } else if (state.history.length === 0) {
      lastRenderedHistoryLength = 0;
      var bEl = document.getElementById("bubble-black");
      var wEl = document.getElementById("bubble-white");
      if (bEl) bEl.classList.remove("show");
      if (wEl) wEl.classList.remove("show");
    }

    state.last_move_animated = true;
  }

  function checkWin(board, stone) {
    var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (var row = 0; row < SIZE; row++) {
      for (var col = 0; col < SIZE; col++) {
        if (board[row][col] !== stone) continue;
        for (var d = 0; d < dirs.length; d++) {
          var dr = dirs[d][0];
          var dc = dirs[d][1];
          var line = [{ row: row, col: col }];
          var nextRow = row + dr;
          var nextCol = col + dc;
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

  function onBoardClick(event) {
    var row = Number(event.currentTarget.getAttribute("data-row"));
    var col = Number(event.currentTarget.getAttribute("data-col"));
    if (window.pudding && typeof window.pudding.dispatch === "function") {
      window.pudding.dispatch({ type: "place_stone", row: public_row(row), col: public_col(col) });
    }
  }

  readyBtn.addEventListener("click", function () {
    if (window.pudding && typeof window.pudding.dispatch === "function") {
      window.pudding.dispatch({ type: "ready" });
    }
  });

  undoBtn.addEventListener("click", function () {
    if (window.pudding && typeof window.pudding.dispatch === "function") {
      window.pudding.dispatch({ type: "undo" });
    }
  });

  resetBtn.addEventListener("click", function () {
    if (window.pudding && typeof window.pudding.dispatch === "function") {
      window.pudding.dispatch({ type: "reset" });
    }
  });

  clearScoreBtn.addEventListener("click", function () {
    if (window.pudding && typeof window.pudding.dispatch === "function") {
      window.pudding.dispatch({ type: "clear_score" });
    }
  });

  var rawState = window.pudding && typeof window.pudding.getState === "function" ? window.pudding.getState() : null;
  var state = normalizeState(rawState);
  drawGrid();

  if (window.pudding) {
    window.pudding.onState(function (nextState) {
      if (!nextState) return;
      var nextNormalized = normalizeState(nextState);
      
      if (nextNormalized.status !== "countdown") {
        isCountdownTimerStarted = false;
      }
      
      state = nextNormalized;
      render();
      if (leaderboardModal && leaderboardModal.classList.contains("show")) {
        renderLeaderboard();
      }
    });

    function _innerOnAction(action, currState, context) {
      var nextState = normalizeState(currState || freshState());
      var ctx = context || {};
      
      if (currState) {
        nextState.black_player = currState.black_player;
        nextState.white_player = currState.white_player;
        nextState.black_ready = currState.black_ready;
        nextState.white_ready = currState.white_ready;
        nextState.score = currState.score || {};
        nextState.battle_log = currState.battle_log || [];
      }

      var actor = ctx.actor || {};
      var callerID = actor.session_id || "human";
      var callerTitle = "";
      if (actor.role === "human") {
        callerTitle = t("human_judge");
      } else {
        callerTitle = actor.name || t("smart_ai");
      }

      // 1. 选座加入对局
      if (action.type === "join_game") {
        var side = action.side; 
        if (side !== BLACK_SIDE && side !== WHITE_SIDE) return { ok: false, error: "invalid side type" };
        if (nextState[side + "_player"] !== null) {
          return { ok: false, error: t("err_seat_taken", { side: side_label(side) }) };
        }
        
        nextState[side + "_player"] = { session_id: callerID, title: callerTitle };
        if (!nextState.score[callerTitle] || typeof nextState.score[callerTitle] === "number") {
          nextState.score[callerTitle] = { win: 0, lose: 0, draw: 0, total: 0 };
        }
        var logText = t("system_joined", { player: callerTitle, side: side_label(side) });
        nextState.battle_log.push({ type: "system", text: logText });
        
        var isFull = false;
        if (nextState.black_player !== null && nextState.white_player !== null) {
          nextState.status = "countdown";
          nextState.black_ready = false;
          nextState.white_ready = false;
          isFull = true;
        } else {
          nextState.status = "idle";
        }
        
        var broadcastMsg = "";
        if (isFull) {
          broadcastMsg = t("announce_join_full", { black: nextState.black_player.title, white: nextState.white_player.title });
        } else {
          var otherSide = side === BLACK_SIDE ? WHITE_SIDE : BLACK_SIDE;
          broadcastMsg = t("announce_join_waiting", {
            player: callerTitle,
            side: side_label(side),
            other_side: side_label(otherSide),
            command: command({ type: "join_game", side: otherSide })
          });
        }

        return { 
          ok: true, 
          state: nextState,
          send: {
            type: "player_joined",
            data: {
              side: side,
              player: nextState[side + "_player"],
              status: nextState.status,
              instruction: broadcastMsg
            }
          }
        };
      }

      // 2. 离席重置
      if (action.type === "leave_game") {
        var leftSide = null;
        if (nextState.black_player && nextState.black_player.session_id === callerID) leftSide = BLACK_SIDE;
        else if (nextState.white_player && nextState.white_player.session_id === callerID) leftSide = WHITE_SIDE;
        
        if (!leftSide) return { ok: false, error: t("err_not_seated") };
        
        var leftPlayerName = nextState[leftSide + "_player"].title;
        nextState.battle_log.push({ type: "system", text: t("system_left", { player: leftPlayerName }) });
        nextState[leftSide + "_player"] = null;
        nextState.black_ready = false;
        nextState.white_ready = false;
        
        nextState.status = "idle";
        nextState.turn = null;
        
        var broadcastMsg = t("announce_left", { player: leftPlayerName, command: command({ type: "join_game", side: "black | white" }) });

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
        var kickSide = action.side; 
        if (kickSide !== BLACK_SIDE && kickSide !== WHITE_SIDE) return { ok: false, error: "invalid side type" };
        if (nextState[kickSide + "_player"] === null) return { ok: false, error: t("err_empty_seat") };
        
        var kickedPlayerName = nextState[kickSide + "_player"].title;
        nextState.battle_log.push({ type: "system", text: t("system_kicked", { player: kickedPlayerName }) });
        nextState[kickSide + "_player"] = null;
        nextState.black_ready = false;
        nextState.white_ready = false;
        
        nextState.status = "idle";
        nextState.turn = null;
        
        var broadcastMsg = t("announce_kicked", { player: kickedPlayerName, command: command({ type: "join_game", side: "black | white" }) });

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
        if (currState.status !== "countdown") return { ok: true, state: currState };
        nextState.status = "ready_checking";
        nextState.black_ready = false;
        nextState.white_ready = false;
        nextState.battle_log.push({ type: "system", text: t("system_ready_check") });
        
        var recipients = [];
        if (nextState.black_player && nextState.black_player.session_id !== "human") recipients.push(nextState.black_player.session_id);
        if (nextState.white_player && nextState.white_player.session_id !== "human") recipients.push(nextState.white_player.session_id);
        
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
        if (nextState.status !== "ready_checking") return { ok: false, error: t("err_not_ready_checking") };
        
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
          
          if (nextState.black_player.session_id !== "human") {
            return {
              ok: true,
              state: nextState,
              send: {
                type: "place_stone",
                data: {
                  board_text: formatBoardText(nextState.board),
                  instruction: t("instruction_first_move", { command: command({ type: "place_stone", row: 8, col: 8 }) })
                },
                to: { sessions: [nextState.black_player.session_id] },
                lock_until_done: true
              }
            };
          }
        }
        
        return { ok: true, state: nextState };
      }

      // 6. 落子动作
      if (action.type === "place_stone") {
        if (nextState.status !== "playing") return { ok: false, error: t("err_not_playing") };
        
        var currentTurnSide = nextState.turn;
        var expectedPlayer = nextState[currentTurnSide + "_player"];
        if (!expectedPlayer || expectedPlayer.session_id !== callerID) {
          return { ok: false, error: t("err_not_your_turn") };
        }
        
        var coord = toInternalCoord(action.row, action.col);
        if (!coord) return { ok: false, error: t("err_invalid_coord") };
        if (nextState.board[coord.row][coord.col] !== EMPTY) {
          return { ok: false, error: t("err_occupied") };
        }
        
        var msg = (action.message && typeof action.message === "string") ? action.message.trim() : "";
        var stone = currentTurnSide === BLACK_SIDE ? BLACK : WHITE;
        
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
        
        var sideLabel = currentTurnSide === BLACK_SIDE ? t("black_side") + " ●" : t("white_side") + " ○";
        var logText = t("system_move", { side: sideLabel, player: expectedPlayer.title, coord: displayCoord(coord.row, coord.col) });
        if (msg) {
          logText += " 💬 \"" + msg + "\"";
        }
        nextState.battle_log.push({
          type: currentTurnSide,
          text: logText
        });

        // 胜负判定
        var winLine = checkWin(nextState.board, stone);
        if (winLine) {
          nextState.status = "game_over";
          nextState.winning_line = winLine;
          nextState.turn = null;
          
          var winner_title = expectedPlayer.title;
          var loserSide = currentTurnSide === BLACK_SIDE ? WHITE_SIDE : BLACK_SIDE;
          var loserPlayer = nextState[loserSide + "_player"];
          var loserTitle = loserPlayer ? loserPlayer.title : t("unknown");
          
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
          
          var gameOverRecipients = [];
          if (nextState.black_player && nextState.black_player.session_id !== "human") gameOverRecipients.push(nextState.black_player.session_id);
          if (nextState.white_player && nextState.white_player.session_id !== "human") gameOverRecipients.push(nextState.white_player.session_id);
          
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
                    stone: currentTurnSide === BLACK_SIDE ? t("black_stone") : t("white_stone"),
                    command: command({ type: "leave_game" })
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
          
          var p1Title = nextState.black_player ? nextState.black_player.title : t("unknown");
          var p2Title = nextState.white_player ? nextState.white_player.title : t("unknown");
          
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
          
          var drawRecipients = [];
          if (nextState.black_player && nextState.black_player.session_id !== "human") drawRecipients.push(nextState.black_player.session_id);
          if (nextState.white_player && nextState.white_player.session_id !== "human") drawRecipients.push(nextState.white_player.session_id);
          
          if (drawRecipients.length > 0) {
            return {
              ok: true,
              state: nextState,
              send: {
                type: "game_over",
                data: {
                  winner: "draw",
                  instruction: t("instruction_draw", { command: command({ type: "leave_game" }) })
                },
                to: { sessions: drawRecipients }
              }
            };
          }
          
          return { ok: true, state: nextState };
        }

        // 切换回合
        var nextTurnSide = currentTurnSide === BLACK_SIDE ? WHITE_SIDE : BLACK_SIDE;
        nextState.turn = nextTurnSide;
        var nextPlayer = nextState[nextTurnSide + "_player"];
        
        if (nextPlayer && nextPlayer.session_id !== "human") {
          var opponentMsgHint = "";
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
              to: { sessions: [nextPlayer.session_id] },
              lock_until_done: true
            }
          };
        }
        
        return { ok: true, state: nextState };
      }

      // 7. 悔棋动作
      if (action.type === "undo") {
        if (nextState.status !== "playing") return { ok: false, error: t("err_undo_not_playing") };
        if (nextState.history.length === 0) return { ok: false, error: t("err_no_history") };
        
        var undoCount = 1;
        var isPve = (nextState.black_player && nextState.black_player.session_id === "human" && nextState.white_player && nextState.white_player.session_id !== "human") ||
                     (nextState.white_player && nextState.white_player.session_id === "human" && nextState.black_player && nextState.black_player.session_id !== "human");
        
        if (isPve && nextState.history.length >= 2) {
          undoCount = 2;
        }
        
        for (var i = 0; i < undoCount; i++) {
          var move = nextState.history.pop();
          if (move) nextState.board[move.row][move.col] = EMPTY;
        }
        
        nextState.last_move = nextState.history.length ? { row: nextState.history[nextState.history.length - 1].row, col: nextState.history[nextState.history.length - 1].col } : null;
        nextState.winning_line = null;
        
        var nextTurnSide = nextState.history.length % 2 === 0 ? BLACK_SIDE : WHITE_SIDE;
        nextState.turn = nextTurnSide;
        nextState.battle_log.push({ type: "system", text: t("system_undo") });
        
        var nextPlayer = nextState[nextTurnSide + "_player"];
        if (nextPlayer && nextPlayer.session_id !== "human") {
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
              to: { sessions: [nextPlayer.session_id] },
              lock_until_done: true
            }
          };
        }
        
        return { ok: true, state: nextState };
      }

      // 8. 重置对局（仅重置棋盘，保留选手席位与积分记录，满人则重开，非满人归 idle）
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

    window.pudding.onAction(async function (action, context) {
      var currState = window.pudding.getState();
      var result = _innerOnAction(action, currState, context);
      if (result && result.ok && result.state) {
        withDerivedState(result.state);
        if (action && action.type === "clear_score") {
          await deleteLeaderboardData();
        } else if (action && action.type === "place_stone" && result.state.status === "game_over") {
          await saveLeaderboardData(result.state.score);
        }
        delete result.state.board;
      }
      return result;
    });

    loadLeaderboardData();
    publishState();
  }

  // 1. 转义工具
  function escapeHtml(str) {
    return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // 2. 渲染排行榜函数
  function renderLeaderboard() {
    var list = [];
    for (var name in state.score) {
      var entry = state.score[name];
      if (entry && typeof entry === "object") {
        var win = entry.win || 0;
        var lose = entry.lose || 0;
        var draw = entry.draw || 0;
        var total = entry.total || 0;
        var winRate = total > 0 ? (win / total) : 0;
        list.push({
          name: name,
          win: win,
          lose: lose,
          draw: draw,
          total: total,
          winRate: winRate
        });
      }
    }

    // 根据 currentSortKey 排序
    list.sort(function (a, b) {
      if (currentSortKey === "win") {
        if (b.win !== a.win) return b.win - a.win;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return a.total - b.total;
      } else if (currentSortKey === "total") {
        if (b.total !== a.total) return b.total - a.total;
        if (b.win !== a.win) return b.win - a.win;
        return b.winRate - a.winRate;
      } else if (currentSortKey === "winRate") {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.win !== a.win) return b.win - a.win;
        return a.total - b.total;
      }
      return 0;
    });

    // 高亮当前选中的排序列
    if (thTotal && thWin && thWinRate) {
      thTotal.className = "sortable" + (currentSortKey === "total" ? " active-sort" : "");
      thWin.className = "sortable" + (currentSortKey === "win" ? " active-sort" : "");
      thWinRate.className = "sortable" + (currentSortKey === "winRate" ? " active-sort" : "");

      thTotal.innerHTML = t("total") + (currentSortKey === "total" ? " ↓" : "");
      thWin.innerHTML = t("win") + (currentSortKey === "win" ? " ↓" : "");
      thWinRate.innerHTML = t("win_rate") + (currentSortKey === "winRate" ? " ↓" : "");
    }

    if (leaderboardTbody) {
      leaderboardTbody.innerHTML = "";
      if (list.length === 0) {
        leaderboardTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: hsl(var(--muted-foreground)); padding: 24px 0;">' + t("empty_leaderboard") + '</td></tr>';
      } else {
        list.forEach(function (item, index) {
          var tr = document.createElement("tr");
          var rankClass = "rank-other";
          if (index === 0) rankClass = "rank-1";
          else if (index === 1) rankClass = "rank-2";
          else if (index === 2) rankClass = "rank-3";

          var rankDisplay = '<span class="rank-badge ' + rankClass + '">' + (index + 1) + '</span>';
          var pct = (item.winRate * 100).toFixed(0) + "%";

          tr.innerHTML = '<td>' + rankDisplay + '</td>' +
                         '<td style="font-weight: 700;">' + escapeHtml(item.name) + '</td>' +
                         '<td style="text-align: center;">' + item.total + '</td>' +
                         '<td style="text-align: center; color: #22c55e; font-weight: 700;">' + item.win + '</td>' +
                         '<td style="text-align: center; color: #ef4444;">' + item.lose + '</td>' +
                         '<td style="text-align: center; color: #a1a1aa;">' + item.draw + '</td>' +
                         '<td style="text-align: center; color: #eab308; font-weight: 700;">' + pct + '</td>';
          leaderboardTbody.appendChild(tr);
        });
      }
    }
  }

  // 3. 事件绑定
  if (leaderboardBtn && leaderboardModal) {
    leaderboardBtn.addEventListener("click", function() {
      renderLeaderboard();
      leaderboardModal.classList.add("show");
    });
  }

  if (modalCloseBtn && leaderboardModal) {
    modalCloseBtn.addEventListener("click", function() {
      leaderboardModal.classList.remove("show");
    });
  }

  if (leaderboardModal) {
    leaderboardModal.addEventListener("click", function(e) {
      if (e.target === leaderboardModal) {
        leaderboardModal.classList.remove("show");
      }
    });
  }

  if (thTotal) {
    thTotal.addEventListener("click", function() {
      currentSortKey = "total";
      renderLeaderboard();
    });
  }

  if (thWin) {
    thWin.addEventListener("click", function() {
      currentSortKey = "win";
      renderLeaderboard();
    });
  }

  if (thWinRate) {
    thWinRate.addEventListener("click", function() {
      currentSortKey = "winRate";
      renderLeaderboard();
    });
  }

  window.addEventListener("resize", render);

  render();
})();
