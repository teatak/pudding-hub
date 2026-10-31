export type Direction = 'right' | 'down' | 'left' | 'up';
export type Tilt = '/' | '\\';
export type Mirror = { cell: string; tilt: Tilt };
export type Level = {
  id: string;
  title: string;
  source: { cell: string; direction: Direction };
  target: string;
  mirrors: Mirror[];
  walls: string[];
};
export type Trace = {
  outcome: 'solved' | 'wall' | 'edge' | 'loop' | 'source';
  path: { x: number; y: number }[];
  visited: string[];
};
export type Game = {
  level: Level;
  mirrors: Mirror[];
  history: string[];
  mode: 'play' | 'edit';
  draft: Level | null;
  highlight: string | null;
  sound: boolean;
};
export class RuleError extends Error {
  code: string;
  constructor(code: string) { super(code); this.code = code; }
}
export const directions: Direction[] = ['right', 'down', 'left', 'up'];
const vectors = [[1, 0], [0, 1], [-1, 0], [0, -1]];
export const cells = Array.from({ length: 36 }, (_, i) => String.fromCharCode(65 + i % 6) + (Math.floor(i / 6) + 1));
export function xy(cell: string) { return { x: cell.charCodeAt(0) - 65, y: Number(cell[1]) - 1 }; }
export function reflect(direction: Direction, tilt: Tilt): Direction {
  const i = directions.indexOf(direction);
  return directions[(tilt === '/' ? [3, 2, 1, 0] : [1, 0, 3, 2])[i]];
}
export function validateLayout(level: Level): void {
  const occupied = [level.source.cell, level.target, ...level.mirrors.map(m => m.cell), ...level.walls];
  if (occupied.some(c => !/^[A-F][1-6]$/.test(c))) throw new RuleError('coordinates');
  if (new Set(occupied).size !== occupied.length) throw new RuleError('overlap');
  if (level.mirrors.length > 8) throw new RuleError('mirrorLimit');
}
export function trace(level: Level, mirrors = level.mirrors): Trace {
  let { x, y } = xy(level.source.cell);
  let direction = level.source.direction;
  const path = [{ x, y }], visited: string[] = [];
  const seen = new Set<string>();
  const at = new Map(mirrors.map(m => [m.cell, m.tilt]));
  const walls = new Set(level.walls);
  for (;;) {
    const [dx, dy] = vectors[directions.indexOf(direction)];
    x += dx; y += dy;
    if (x < 0 || x > 5 || y < 0 || y > 5) {
      path.push({ x: x - dx / 2, y: y - dy / 2 });
      return { outcome: 'edge', path, visited };
    }
    const cell = String.fromCharCode(65 + x) + (y + 1);
    path.push({ x, y }); visited.push(cell);
    if (cell === level.target) return { outcome: 'solved', path, visited };
    if (walls.has(cell)) return { outcome: 'wall', path, visited };
    if (cell === level.source.cell) return { outcome: 'source', path, visited };
    const key = cell + ':' + direction;
    if (seen.has(key)) return { outcome: 'loop', path, visited };
    seen.add(key);
    const tilt = at.get(cell);
    if (tilt) direction = reflect(direction, tilt);
  }
}
// Exhaustive search is bounded by 2^8. Solutions stay inside the rules module.
export function analyze(level: Level) {
  validateLayout(level);
  let solutions = 0, minimumMoves = Infinity;
  for (let bits = 0; bits < 2 ** level.mirrors.length; bits++) {
    const mirrors = level.mirrors.map((m, i) => ({ ...m, tilt: (bits & (1 << i) ? '/' : '\\') as Tilt }));
    if (trace(level, mirrors).outcome !== 'solved') continue;
    solutions++;
    minimumMoves = Math.min(minimumMoves, mirrors.filter((m, i) => m.tilt !== level.mirrors[i].tilt).length);
  }
  return { solvable: solutions > 0, solutions, minimumMoves: solutions ? minimumMoves : null, initiallySolved: trace(level).outcome === 'solved' };
}
export function playable(level: Level) {
  const result = analyze(level);
  if (!result.solvable) throw new RuleError('unsolvable');
  if (result.initiallySolved) throw new RuleError('alreadyLit');
  return result;
}
export function createGame(level: Level, sound = true): Game {
  return { level, mirrors: level.mirrors.map(m => ({ ...m })), history: [], mode: 'play', draft: null, highlight: null, sound };
}
export function rotate(game: Game, cell: string): Game {
  if (game.mode !== 'play') throw new RuleError('editing');
  if (trace(game.level, game.mirrors).outcome === 'solved') throw new RuleError('finished');
  if (!game.mirrors.some(m => m.cell === cell)) throw new RuleError('notMirror');
  if (game.history.length >= 512) throw new RuleError('moveLimit');
  return { ...game, mirrors: game.mirrors.map(m => m.cell === cell ? { ...m, tilt: m.tilt === '/' ? '\\' : '/' } : m), history: [...game.history, cell], highlight: null };
}
export function undo(game: Game): Game {
  if (!game.history.length || game.mode !== 'play') throw new RuleError('noUndo');
  const cell = game.history[game.history.length - 1];
  return { ...game, mirrors: game.mirrors.map(m => m.cell === cell ? { ...m, tilt: m.tilt === '/' ? '\\' : '/' } : m), history: game.history.slice(0, -1), highlight: null };
}
export type Brush = 'mirror' | 'wall' | 'source' | 'target' | 'erase';
export function paint(level: Level, cell: string, brush: Brush, direction: Direction): Level {
  const next: Level = { ...level, source: { ...level.source }, mirrors: level.mirrors.filter(m => m.cell !== cell), walls: level.walls.filter(c => c !== cell) };
  if (cell === level.source.cell && brush !== 'source' || cell === level.target && brush !== 'target') throw new RuleError('occupied');
  if (brush === 'source') next.source = { cell, direction };
  if (brush === 'target') next.target = cell;
  if (brush === 'wall') next.walls.push(cell);
  if (brush === 'mirror') {
    const old = level.mirrors.find(m => m.cell === cell);
    next.mirrors.push({ cell, tilt: old?.tilt === '/' ? '\\' : '/' });
  }
  validateLayout(next);
  return next;
}
export function describe(game: Game) {
  const board = game.mode === 'edit' ? game.draft! : { ...game.level, mirrors: game.mirrors };
  const light = trace(board);
  return {
    phase: game.mode === 'edit' ? 'editing' : light.outcome === 'solved' ? 'solved' : 'playing',
    board, light, moves: game.history.length, lastMove: game.history.at(-1) || null,
    highlight: game.highlight,
    coordinates: 'Columns A–F left to right; rows 1–6 top to bottom. Only mirrors rotate while playing.',
  };
}
// Curated layouts. Their intended solutions are not sent to the model.
export const levels: Level[] = [
  { id: 'first-light', title: '', source: { cell: 'A4', direction: 'right' }, target: 'F2', mirrors: [{cell:'D4',tilt:'\\'},{cell:'D2',tilt:'\\'}], walls: [] },
  { id: 'detour', title: '', source: {cell:'A5',direction:'right'},target:'F2',mirrors:[{cell:'C5',tilt:'\\'},{cell:'C2',tilt:'\\'},{cell:'E5',tilt:'/'}],walls:['D5','B2'] },
  { id: 'staircase', title: '', source:{cell:'A6',direction:'right'},target:'F1',mirrors:[{cell:'C6',tilt:'\\'},{cell:'C4',tilt:'\\'},{cell:'E4',tilt:'\\'},{cell:'E1',tilt:'\\'}],walls:['D6','D2','F4'] },
  { id: 'long-way', title:'',source:{cell:'A2',direction:'right'},target:'F3',mirrors:[{cell:'D2',tilt:'/'},{cell:'D5',tilt:'\\'},{cell:'B5',tilt:'/'},{cell:'B3',tilt:'\\'},{cell:'F5',tilt:'\\'}],walls:['E2','A5','C1','F4'] },
  { id: 'switchback',title:'',source:{cell:'F6',direction:'up'},target:'A3',mirrors:[{cell:'F4',tilt:'/'},{cell:'D4',tilt:'/'},{cell:'D1',tilt:'/'},{cell:'B1',tilt:'\\'},{cell:'B3',tilt:'\\'},{cell:'E2',tilt:'\\'}],walls:['F3','C4','E6','B5'] },
  { id: 'ribbon',title:'',source:{cell:'A6',direction:'up'},target:'F6',mirrors:[{cell:'A2',tilt:'\\'},{cell:'E2',tilt:'/'},{cell:'E4',tilt:'\\'},{cell:'C4',tilt:'/'},{cell:'C1',tilt:'\\'},{cell:'F1',tilt:'/'},{cell:'B5',tilt:'/'},{cell:'D5',tilt:'\\'}],walls:['A1','B4','C5','D6'] },
];
