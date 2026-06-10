import GOMOKU_I18N from "./i18n.js";
import { SIZE, EMPTY, BLACK, WHITE, BLACK_SIDE, WHITE_SIDE } from "./constants.js";

let currentLocale = "zh-CN";

export function normalizeLocale(value) {
  return value === "zh-CN" || value === "zh-TW" || value === "en" ? value : "zh-CN";
}

export function setGlobalLocale(locale) {
  currentLocale = locale;
}

export function t(key, params) {
  const dict = (GOMOKU_I18N && GOMOKU_I18N[currentLocale]) || (GOMOKU_I18N && GOMOKU_I18N["zh-CN"]) || {};
  const fallback = (GOMOKU_I18N && GOMOKU_I18N["zh-CN"]) || {};
  let text = dict[key] || fallback[key] || key;
  if (params) {
    Object.keys(params).forEach(function (name) {
      text = text.replace(new RegExp("\\{" + name + "\\}", "g"), String(params[name]));
    });
  }
  return text;
}

export function command(action) {
  const widgetId = (window.pudding && window.pudding.id) || "gomoku";
  return JSON.stringify({ id: widgetId, action: action });
}

export function participantID(actor) {
  const role = actor && actor.role === "assistant" ? "assistant" : "human";
  const session_id = actor && typeof actor.session_id === "string" && actor.session_id.trim()
    ? actor.session_id.trim()
    : "local";
  return `${role}:${session_id}`;
}

export function getRawSessionID(id) {
  if (!id) return id;
  if (id.startsWith("human:")) return id.substring(6);
  if (id.startsWith("assistant:")) return id.substring(10);
  return id;
}

export function isHuman(session_id) {
  return typeof session_id === "string" && session_id.startsWith("human:");
}

export function side_label(side) {
  return side === BLACK_SIDE ? t("black_side") : t("white_side");
}

export function applyPuddingTheme(theme) {
  const mode = theme && theme.mode === "light" ? "light" : "dark";
  document.documentElement.dataset.puddingTheme = mode;
}

export function inPublicBounds(row, col) {
  const r = Number(row);
  if (!Number.isInteger(r) || r < 1 || r > SIZE) return false;
  if (typeof col !== "string" || col.length !== 1) return false;
  const code = col.toUpperCase().charCodeAt(0);
  return code >= 65 && code < 65 + SIZE;
}

export function inBounds(row, col) {
  return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

export function emptyBoard() {
  return Array.from({ length: SIZE }, function () {
    return Array(SIZE).fill(EMPTY);
  });
}

export function toStone(value) {
  if (value === BLACK || value === "black" || value === "b" || value === 1) return BLACK;
  if (value === WHITE || value === "white" || value === "w" || value === 2) return WHITE;
  return EMPTY;
}

export function sideForStone(stone) {
  return stone === WHITE ? WHITE_SIDE : BLACK_SIDE;
}

export function stoneClass(value) {
  if (value === BLACK) return "black";
  if (value === WHITE) return "white";
  return "";
}

export function public_row(row) {
  return SIZE - row;
}

export function public_col(col) {
  return String.fromCharCode(65 + col);
}

export function toInternalCoord(row, col) {
  if (!inPublicBounds(row, col)) return null;
  const r = Number(row);
  const c = col.toUpperCase().charCodeAt(0) - 65;
  return { row: SIZE - r, col: c };
}

export function displayCoord(row, col) {
  return public_col(col) + public_row(row);
}

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatBoardText(board) {
  const lines = [];
  for (let row = 0; row < SIZE; row++) {
    const cells = [];
    for (let col = 0; col < SIZE; col++) {
      const value = board[row][col];
      cells.push(value === EMPTY ? "＋" : value);
    }
    const publicRow = SIZE - row;
    lines.push(cells.join(" ") + " " + pad2(publicRow));
  }
  const colHeaders = Array.from({ length: SIZE }, function (_, i) {
    return String.fromCharCode(65 + i);
  }).join("  ");
  lines.push(colHeaders);
  return lines.join("\n");
}

export function getBattleLogs(state) {
  if (!state || !Array.isArray(state.history)) return [];
  const logs = [];

  state.history.forEach((move) => {
    const side = sideForStone(move.stone);
    const player = state[side + "_player"];
    const playerName = player ? player.title : (side === BLACK_SIDE ? t("black_stone") : t("white_stone"));
    const sideLabel = side === BLACK_SIDE ? t("black_side") + " ●" : t("white_side") + " ○";
    
    let text = t("system_move", { side: sideLabel, player: playerName, coord: move.display });
    if (move.message) {
      text += " 💬 \"" + move.message + "\"";
    }
    
    logs.push({
      type: side,
      text: text
    });
  });

  if (state.status === "game_over") {
    if (Array.isArray(state.winning_line) && state.winning_line.length > 0) {
      const lastMove = state.history[state.history.length - 1];
      if (lastMove) {
        const side = sideForStone(lastMove.stone);
        const player = state[side + "_player"];
        const winnerName = player ? player.title : t("unknown");
        logs.push({
          type: "win",
          text: t("system_win", { winner: winnerName })
        });
      }
    } else if (state.history.length >= SIZE * SIZE) {
      logs.push({
        type: "system",
        text: t("system_draw")
      });
    }
  }

  return logs;
}

