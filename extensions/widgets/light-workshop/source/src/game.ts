import { pudding, type InteractionContext, type JSONValue } from '@pudding/widget';
import { z } from 'zod';
import { analyze, createGame, describe, levels, paint, playable, rotate, RuleError, undo, type Brush, type Direction, type Game, type Level } from './rules';
import { errorText, t } from './text';

const cellSchema = z.string().regex(/^[A-F][1-6]$/);
export const levelSchema = z.object({
  id: z.string().min(1).max(64), title: z.string().max(60),
  source: z.object({cell: cellSchema, direction: z.enum(['right','down','left','up'])}).strict(),
  target: cellSchema,
  mirrors: z.array(z.object({cell: cellSchema, tilt: z.enum(['/','\\'])}).strict()).max(8),
  walls: z.array(cellSchema).max(34),
}).strict();
export function current(): Game { return pudding.state.read().data.game as unknown as Game || createGame(levels[0]); }
let changing = false;
async function exclusive<T>(fn: () => Promise<T>) {
  if (changing) throw new RuleError('busy');
  changing = true;
  try { return await fn(); } finally { changing = false; }
}
function cancelled(context?: InteractionContext) { if (context?.signal.aborted) throw new RuleError('cancelled'); }
async function write(game: Game, version: number, context?: InteractionContext) {
  cancelled(context);
  return pudding.state.write({ expectedVersion: version, data: { game: game as unknown as JSONValue } });
}
export function readBoard() { return { ...describe(current()), stateVersion: pudding.state.read().version }; }
export async function changeGame(change: (game: Game) => Game, context: InteractionContext) {
  return exclusive(async () => {
    cancelled(context);
    const snapshot = pudding.state.read(), old = current();
    const next = change(old);
    await write(next, snapshot.version, context);
    return readBoard();
  });
}
// Host authorization and state versions apply equally to UI and conversation tools.
export const rotateMirror = (cell: string, context: InteractionContext) => changeGame(game => rotate(game, cell), context);
export const undoMove = (context: InteractionContext) => changeGame(undo, context);
export const reset = (context: InteractionContext) => changeGame(game => createGame(game.level, game.sound), context);
export const loadLevel = (level: Level, context: InteractionContext) => changeGame(game => {
  playable(level); return createGame(level, game.sound);
}, context);
export const startEditor = (fresh: boolean, context: InteractionContext) => changeGame(game => ({
  ...game, mode: 'edit', highlight: null,
  draft: fresh ? { id: crypto.randomUUID(), title: '', source: {cell:'A4',direction:'right'}, target:'F2', mirrors:[], walls:[] }
    : { ...game.level, id: crypto.randomUUID(), title: game.level.title, mirrors: game.mirrors.map(m => ({...m})) },
}), context);
export const paintCell = (cell: string, brush: Brush, direction: Direction, context: InteractionContext) => changeGame(game => {
  if (!game.draft || game.mode !== 'edit') throw new RuleError('editing');
  return { ...game, draft: paint(game.draft, cell, brush, direction), highlight: null };
}, context);
export const cancelEditor = (context: InteractionContext) => changeGame(game => ({ ...game, mode: 'play', draft: null }), context);
export const launchDraft = (context: InteractionContext, title?: string) => changeGame(game => {
  if (!game.draft) throw new RuleError('editing');
  const level = {...game.draft,title:title === undefined ? game.draft.title : title.trim().slice(0,60)};
  playable(level); return createGame(level, game.sound);
}, context);

export async function saveLevel(context: InteractionContext, title?: string) {
  return exclusive(async () => {
    cancelled(context);
    const game = current(), original = game.mode === 'edit' ? game.draft! : game.level;
    const level = {...original,title:title === undefined ? original.title : title.trim().slice(0,60)};
    playable(level);
    const saved = await pudding.storage.read({signal: context.signal});
    const library = saved.data.levels as unknown as Level[] || [];
    const next = library.filter(l => l.id !== level.id);
    if (next.length >= 30) throw new RuleError('libraryFull');
    cancelled(context);
    await pudding.storage.write({expectedVersion: saved.version, data: {...saved.data, levels: [...next, level] as unknown as JSONValue}});
  });
}
export async function deleteLevel(id: string, context: InteractionContext) {
  cancelled(context);
  const saved = await pudding.storage.read({signal: context.signal});
  const library = saved.data.levels as unknown as Level[] || [];
  cancelled(context);
  await pudding.storage.write({expectedVersion: saved.version, data: {...saved.data, levels: library.filter(l => l.id !== id) as unknown as JSONValue}});
}

export const highlightMirror = (cell: string | null, context: InteractionContext) => changeGame(game => {
  if (game.mode !== 'play') throw new RuleError('editing');
  if (cell && !game.mirrors.some(m => m.cell === cell)) throw new RuleError('notMirror');
  return {...game, highlight:cell};
}, context);
async function submitLevel(level: Level, context: InteractionContext) {
  const check = playable(level);
  const board = await changeGame(game => createGame({...level,id:crypto.randomUUID()},game.sound),context);
  return {ok:true,...board,validation:check};
}
export function registerInterfaces() {
  function define<T>(definition: Parameters<typeof pudding.defineInterface<T>>[0]) {
    return pudding.defineInterface({...definition, async run(input,context) {
      try { return await definition.run(input,context); }
      catch (error) {
        if (!(error instanceof RuleError)) throw error;
        return {ok:false,executed:false,code:error.code,message:errorText(error),...readBoard()};
      }
    }});
  }
  return [
    define({name:'readBoard',description:t('readDescription'),input:z.object({}).strict(),run:readBoard}),
    define({name:'rotateMirror',description:t('rotateDescription'),input:z.object({cell:cellSchema}).strict(),run:async ({cell},context) => ({ok:true,...await rotateMirror(cell,context)})}),
    define({name:'highlightMirror',description:t('highlightDescription'),input:z.object({cell:cellSchema.nullable()}).strict(),run:async ({cell},context) => ({ok:true,...await highlightMirror(cell,context)})}),
    define({name:'validatePuzzle',description:t('validateDescription'),input:z.object({level:levelSchema}).strict(),run:({level},context) => {cancelled(context);return analyze(level);}}),
    define({name:'submitPuzzle',description:t('submitDescription'),input:z.object({level:levelSchema}).strict(),run:({level},context) => submitLevel(level,context)}),
  ];
}
