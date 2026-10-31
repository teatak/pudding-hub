import test, {beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks,createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {analyze,createGame,describe,directions,levels,paint,playable,reflect,rotate,trace,undo,validateLayout} from '../extensions/widgets/light-workshop/source/src/rules.ts';

test('all eight mirror reflections follow the optical rule',()=>{
  assert.deepEqual(directions.map(d=>reflect(d,'/')),['up','left','down','right']);
  assert.deepEqual(directions.map(d=>reflect(d,'\\')),['down','right','up','left']);
});
test('tutorial follows A4 → D4 → D2 → F2, with immediate terminal feedback and undo',()=>{
  let game=createGame(levels[0]); const before=JSON.stringify(game);
  const first=rotate(game,'D4'); assert.equal(JSON.stringify(game),before);
  assert.equal(trace(first.level,first.mirrors).outcome,'edge');
  game=rotate(first,'D2'); const light=trace(game.level,game.mirrors);
  assert.equal(light.outcome,'solved');
  assert.deepEqual(light.visited,['B4','C4','D4','D3','D2','E2','F2']);
  assert.equal(describe(game).phase,'solved');
  assert.throws(()=>rotate(game,'D4'),/finished/);
  assert.deepEqual(undo(game),first);
  assert.throws(()=>rotate(createGame(levels[0]),'A1'),/notMirror/);
});
test('six curated puzzles are unsolved and provably solvable, with increasing challenge',()=>{
  assert.equal(levels.length,6);
  assert.deepEqual(levels.map(l=>analyze(l).minimumMoves),[2,2,4,4,5,6]);
  for(const level of levels){const before=JSON.stringify(level);const result=playable(level);assert.ok(result.solvable);assert.ok(!result.initiallySolved);assert.equal(JSON.stringify(level),before);assert.ok(!('solution' in result));}
});
test('walls, edges and a return to the source terminate the ray',()=>{
  assert.equal(trace({...levels[0],walls:['B4']}).outcome,'wall');
  const loop={id:'loop',title:'',source:{cell:'B2',direction:'right'},target:'F6',mirrors:[{cell:'D2',tilt:'\\'},{cell:'D4',tilt:'/'},{cell:'B4',tilt:'\\'}],walls:[]};
  assert.equal(trace(loop).outcome,'source');
  assert.ok(trace(loop).path.length<36*4+2);
  assert.equal(analyze({...levels[0],walls:['B4']}).solvable,false);
});
test('layout checks reject overlapping pieces, invalid coordinates, excess mirrors and solved starts',()=>{
  assert.throws(()=>validateLayout({...levels[0],target:'D4'}),/overlap/);
  assert.throws(()=>validateLayout({...levels[0],target:'G2'}),/coordinates/);
  assert.throws(()=>validateLayout({...levels[0],mirrors:['A1','B1','C1','D1','E1','F1','A2','B2','C2'].map(cell=>({cell,tilt:'/'}))}),/mirrorLimit/);
  assert.throws(()=>playable({...levels[0],mirrors:levels[0].mirrors.map(m=>({...m,tilt:'/'}))}),/alreadyLit/);
});
test('editor replaces pieces, rotates mirrors, moves source and protects required pieces',()=>{
  let draft=paint(levels[0],'B3','wall','right');
  draft=paint(draft,'B3','mirror','right'); assert.ok(!draft.walls.includes('B3'));
  draft=paint(draft,'B3','mirror','right'); assert.equal(draft.mirrors.find(m=>m.cell==='B3').tilt,'\\');
  draft=paint(draft,'B3','source','up');assert.deepEqual(draft.source,{cell:'B3',direction:'up'});assert.ok(!draft.mirrors.some(m=>m.cell==='B3'));
  assert.throws(()=>paint(draft,'B3','erase','up'),/occupied/);
});

const desktop=process.env.PUDDING_DESKTOP_DIR||fileURLToPath(new URL('../../pudding-desktop',import.meta.url));
const require=createRequire(path.join(desktop,'web/package.json'));
const source=new URL('../extensions/widgets/light-workshop/source/src/',import.meta.url);
const interfaces=new Map();
let state,store,failStorage,writeGate;
globalThis.__lightSDK={
  state:{read:()=>structuredClone(state),write:async input=>{
    if(writeGate)await writeGate;
    if(input.expectedVersion!==state.version)throw new Error('widget_state_conflict');
    state={version:state.version+1,data:structuredClone(input.data)};return structuredClone(state);
  }},
  storage:{read:async()=>{if(failStorage)throw new Error('storage unavailable');return structuredClone(store);},write:async input=>{
    if(input.expectedVersion!==store.version)throw new Error('storage_conflict');store={version:store.version+1,data:structuredClone(input.data)};return structuredClone(store);
  }},
  // Ordinary widgets do not need any interaction connect, participant or notification API.
  defineInterface:d=>{interfaces.set(d.name,d);return()=>interfaces.delete(d.name);},
};
const hook=registerHooks({resolve(specifier,context,next){
  if(specifier==='@pudding/widget')return{url:'data:text/javascript,export const pudding=globalThis.__lightSDK',shortCircuit:true};
  if(specifier==='zod')return{url:pathToFileURL(require.resolve('zod')).href,shortCircuit:true};
  if(context.parentURL?.startsWith(source.href)&&specifier.startsWith('./')&&!path.extname(specifier))return next(specifier+'.ts',context);
  return next(specifier,context);
}});
const api=await import(new URL('game.ts',source));hook.deregister();
const signal=()=>new AbortController().signal;
const human=()=>({callID:'human-click',signal:signal()});
const model=(sessionID='session-1')=>({callID:'model-call',sessionID,signal:signal()});
const invoke=(name,input={},context=model())=>{const d=interfaces.get(name);return d.run(d.input.parse(input),context);};
beforeEach(()=>{
  state={version:0,data:{}};store={version:0,data:{unrelated:42}};failStorage=false;writeGate=null;
  api.registerInterfaces();
});
test('readBoard is read-only without joining and remains readable after completion',async()=>{
  assert.equal((await invoke('readBoard')).phase,'playing');assert.equal(state.version,0);
  await api.rotateMirror('D4',human());await api.rotateMirror('D2',human());
  const result=await invoke('readBoard',{},model('another-session'));
  assert.equal(result.phase,'solved');assert.equal(state.version,2);
  assert.ok(!('task' in result));assert.ok(!('assistant' in result));
});
test('different ordinary sessions read and operate the same board without seats or task grants',async()=>{
  const first=await invoke('rotateMirror',{cell:'D4'},model('session-a'));
  assert.equal(first.ok,true);assert.equal(first.moves,1);
  const observed=await invoke('readBoard',{},model('session-b'));
  assert.equal(observed.lastMove,'D4');assert.equal(observed.stateVersion,first.stateVersion);
  const second=await invoke('rotateMirror',{cell:'D2'},model('session-b'));
  assert.equal(second.phase,'solved');assert.equal(second.moves,2);
  assert.equal(second.stateVersion,state.version);
});
test('completion is synchronous and further rotations return a structured finished result',async()=>{
  await invoke('rotateMirror',{cell:'D4'});const completed=await invoke('rotateMirror',{cell:'D2'});
  assert.equal(completed.phase,'solved');
  const version=state.version;const denied=await invoke('rotateMirror',{cell:'D4'});
  assert.equal(denied.executed,false);assert.equal(denied.code,'finished');assert.equal(denied.phase,'solved');assert.equal(state.version,version);
});
test('board highlights do not rotate mirrors, store chat text or require a selected model',async()=>{
  const before=JSON.stringify(api.current().mirrors);
  const highlighted=await invoke('highlightMirror',{cell:'D4'},model('other-session'));
  assert.equal(highlighted.highlight,'D4');assert.equal(highlighted.moves,0);assert.equal(JSON.stringify(api.current().mirrors),before);
  assert.ok(!('hint' in state.data.game));assert.ok(!('assistant' in state.data.game));
  const version=state.version;assert.equal((await invoke('highlightMirror',{cell:'A1'})).code,'notMirror');assert.equal(state.version,version);
  assert.equal((await invoke('highlightMirror',{cell:null})).highlight,null);
});
test('manual and model page actions share the same rules and clear stale highlights',async()=>{
  await invoke('highlightMirror',{cell:'D4'});await api.rotateMirror('D4',model());
  assert.equal(api.current().highlight,null);await api.rotateMirror('D2',human());assert.equal(api.readBoard().phase,'solved');
  await api.undoMove(model());assert.equal(api.readBoard().phase,'playing');assert.equal(api.readBoard().moves,1);
});
test('cancelled model actions cannot mutate state; old notification metadata is not an authorization gate',async()=>{
  const controller=new AbortController();controller.abort();
  assert.equal((await invoke('rotateMirror',{cell:'D4'},{...model(),signal:controller.signal})).code,'cancelled');assert.equal(state.version,0);
  const oldContext={...model('library'),actor:{runID:'old-run',participantID:'old-participant',notificationID:'old-notice'}};
  assert.equal((await invoke('rotateMirror',{cell:'D4'},oldContext)).ok,true);
});
test('conversation can validate and submit a new puzzle without opening the editor or assigning a designer',async()=>{
  const version=state.version;const check=await invoke('validatePuzzle',{level:levels[2]});
  assert.equal(check.minimumMoves,4);assert.deepEqual(Object.keys(check).sort(),['initiallySolved','minimumMoves','solutions','solvable']);assert.equal(state.version,version);
  assert.equal((await invoke('submitPuzzle',{level:{...levels[0],walls:['B4']}})).code,'unsolvable');assert.equal(state.version,version);
  const result=await invoke('submitPuzzle',{level:{...levels[2],title:'A new path'}},model('second-session'));
  assert.equal(result.ok,true);assert.equal(result.phase,'playing');assert.equal(result.moves,0);assert.equal(result.board.title,'A new path');
});
test('editing blocks rotation while keeping observation and validation available',async()=>{
  await api.startEditor(false,human());const version=state.version;
  assert.equal((await invoke('readBoard')).phase,'editing');
  assert.equal((await invoke('rotateMirror',{cell:'D4'})).code,'editing');
  assert.equal((await invoke('validatePuzzle',{level:levels[0]})).solvable,true);assert.equal(state.version,version);
});
test('concurrent edits reject without silently overwriting the in-flight move',async()=>{
  let release;writeGate=new Promise(resolve=>{release=resolve;});
  const first=api.rotateMirror('D4',human());
  const second=await invoke('rotateMirror',{cell:'D2'},model('second-session'));assert.equal(second.code,'busy');assert.equal(second.executed,false);
  release();await first;assert.deepEqual(state.data.game.history,['D4']);
});
test('state version conflicts are surfaced without replaying an outdated operation',async()=>{
  let release;writeGate=new Promise(resolve=>{release=resolve;});
  const first=api.rotateMirror('D4',model());state={version:1,data:{game:createGame(levels[1])}};
  release();await assert.rejects(first,/widget_state_conflict/);assert.equal(api.current().level.id,levels[1].id);assert.deepEqual(api.current().history,[]);
});
test('saved puzzles survive page resets and preserve unrelated storage; failed reads do not erase data',async()=>{
  await api.startEditor(false,human());await api.saveLevel(human(),'Custom title');
  assert.equal(store.data.levels[0].title,'Custom title');assert.equal(store.data.unrelated,42);
  state={version:0,data:{}};assert.equal(store.data.levels.length,1);
  failStorage=true;const before=JSON.stringify(store);await assert.rejects(api.saveLevel(human()),/storage unavailable/);assert.equal(JSON.stringify(store),before);
  failStorage=false;await api.deleteLevel(store.data.levels[0].id,human());assert.equal(store.data.levels.length,0);
});
test('model input boundaries reject oversized layouts, invalid directions and extra fields',()=>{
  assert.throws(()=>api.levelSchema.parse({...levels[0],solution:['D4','D2']}));
  assert.throws(()=>api.levelSchema.parse({...levels[0],source:{cell:'A1',direction:'diagonal'}}));
  const tooManyMirrors = {...levels[0], mirrors: Array(9).fill({cell:'B1',tilt:'/'})};
  assert.throws(()=>api.levelSchema.parse(tooManyMirrors));
  assert.throws(()=>invoke('highlightMirror',{cell:'D4',text:'Chat belongs in the conversation'}));
});
