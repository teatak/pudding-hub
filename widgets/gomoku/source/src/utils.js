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
  return '{ "id": "gomoku", "action": ' + JSON.stringify(action) + " }";
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
  return Number.isInteger(row) && Number.isInteger(col) && row >= 1 && row <= SIZE && col >= 1 && col <= SIZE;
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
  return row + 1;
}

export function public_col(col) {
  return col + 1;
}

export function toInternalCoord(row, col) {
  const r = Number(row);
  const c = Number(col);
  if (!Number.isInteger(r) || !Number.isInteger(c)) return null;
  if (!inPublicBounds(r, c)) return null;
  return { row: r - 1, col: c - 1 };
}

export function displayCoord(row, col) {
  return "(" + (row + 1) + ", " + (col + 1) + ")";
}

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatBoardText(board) {
  const lines = [];
  lines.push("    " + Array.from({ length: SIZE }, function (_, i) { return pad2(i + 1); }).join(" "));
  for (let row = 0; row < SIZE; row++) {
    const cells = [];
    for (let col = 0; col < SIZE; col++) {
      const value = board[row][col];
      cells.push(value === EMPTY ? " ＋" : " " + value);
    }
    lines.push(" " + pad2(row + 1) + " " + cells.join(" "));
  }
  return lines.join("\n");
}
