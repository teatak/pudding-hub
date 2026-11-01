import test from 'node:test';
import assert from 'node:assert/strict';
import { fillCandidates, playerIdentities, retainedPlayer, roundCandidates } from '../extensions/widgets/gomoku/source/src/candidates.ts';
import { createRequire, Module } from 'node:module';
import { fileURLToPath } from 'node:url';
import { initial, place, record } from '../extensions/widgets/gomoku/source/src/rules.ts';
import { emptyLobby, newLobby } from '../extensions/widgets/gomoku/source/src/lobby.ts';
const agent = (id, connected = true) => ({ id, kind: 'external', connected });
const session = { id: 'conversation', kind: 'session' };
test('agents fill vacancies; conversations and human require manual choice', () => {
  assert.deepEqual(fillCandidates([], [session], new Set()), []);
  assert.deepEqual(fillCandidates([], [session, agent('a')], new Set()), ['a']);
  assert.deepEqual(fillCandidates(['a', '@me'], [session, agent('a'), agent('b')], new Set(['a'])), ['a', '@me']);
  assert.deepEqual(fillCandidates(['a'], [session, agent('a'), agent('b')], new Set(['a'])), ['a', 'b']);
  assert.deepEqual(fillCandidates([], [agent('a'), agent('b'), agent('c')], new Set()), ['a', 'b']);
});
test('manual deselection is retained; removal and offline status free the slot', () => {
  assert.deepEqual(fillCandidates(['b'], [agent('a'), agent('b')], new Set(['a', 'b'])), ['b']);
  assert.deepEqual(fillCandidates(['a'], [agent('b')], new Set(['a'])), ['b']);
  assert.deepEqual(fillCandidates(['a', 'conversation'], [agent('a', false), session, agent('b')], new Set(['a'])), ['conversation', 'b']);
});

test('rematches retain the original players and never substitute newly joined agents', () => {
  const candidates = [
    { ...agent('external-a'), participantID:'black' },
    { ...agent('external-b'), participantID:'white' },
    { ...agent('new-agent'), participantID:'new' },
  ];
  assert.deepEqual(roundCandidates(['black','white'],candidates),['external-a','external-b']);
  assert.deepEqual(roundCandidates(['human','white'],candidates,'human'),['@me','external-b']);
  assert.deepEqual(roundCandidates(['black','white'],candidates.map(c=>({...c,connected:c.id!=='external-a'}))),['external-b']);
  assert.deepEqual(roundCandidates(['black','white'],candidates.slice(1)),['external-b']);
  assert.deepEqual(roundCandidates(['missing','white'],candidates),['external-b']);
  assert.deepEqual(roundCandidates(['black','white'],[]),[]);
});

test('round identities retain player names and profiles after disconnect, removal and JSON reload', () => {
  const participants = [{ id: 'black', name: 'Agent A', kind: 'external' }, { id: 'white', name: 'Human', kind: 'human' }];
  const model = { id: 'flash', name: 'DeepSeek Flash (MCP)', icon: 'data:image/svg+xml;base64,icon' };
  const candidates = [{ id: 'external-a', participantID: 'black', name: 'Agent A', kind: 'external', model }];
  const saved = JSON.parse(JSON.stringify(playerIdentities(participants, candidates)));
  assert.deepEqual(saved.black, { id: 'black', name: 'Agent A', human: false, external: true, model });
  assert.equal(saved.white.human, true);
  assert.deepEqual(retainedPlayer('black', undefined, undefined, saved.black), saved.black);
  assert.deepEqual(retainedPlayer('white', undefined, undefined, saved.white), saved.white);
  assert.equal(retainedPlayer('new', undefined, undefined, undefined), undefined);
  const current = { ...candidates[0], model: { ...model, name: 'New profile' } };
  assert.equal(retainedPlayer('black', participants[0], current, saved.black).model.name, 'New profile');
  assert.equal(saved.black.model.name, model.name, 'display refresh does not mutate the committed round');
});

test('the actual terminal board retains both cards, colors and profiles without a live run after reload', async () => {
  const require = createRequire(new URL('../../pudding-desktop/web/package.json', import.meta.url));
  const { build } = require('esbuild');
  const { createElement } = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { JSDOM } = require('jsdom');
  const participants = [{id:'black',name:'Player A',kind:'external'}, {id:'white',name:'Player B',kind:'external'}];
  const identities = playerIdentities(participants, participants.map(p => ({
    id: 'external-'+p.id, participantID: p.id, name: p.name, kind: 'external',
    model: { id: p.id, name: 'Profile '+p.id, icon: 'data:image/svg+xml;base64,aWNvbg==' },
  })));
  const lobby = { ...newLobby(emptyLobby(), ['black','white'], () => 0), phase:'playing', identities };
  let position = initial();
  for(let i=0;i<5;i++) {
    position = place(position,1,String.fromCharCode(65+i),'Black');
    if(i<4) position = place(position,15,String.fromCharCode(65+i*2),'White');
  }
  const fixture = { state: {version:20,data:JSON.parse(JSON.stringify({lobby,position:record(position)}))}, run:null };
  globalThis.__gomokuDisplayFixture = fixture;
  const built = await build({
    entryPoints:[fileURLToPath(new URL('../extensions/widgets/gomoku/source/src/App.tsx',import.meta.url))],
    bundle:true, platform:'node', format:'cjs', write:false, jsx:'automatic', external:['react'],
    nodePaths:[fileURLToPath(new URL('../../pudding-desktop/web/node_modules',import.meta.url))], loader:{'.css':'empty'},
    plugins:[{name:'display-host',setup(build){
      build.onResolve({filter:/^@pudding\/widget$/},()=>({path:'sdk',namespace:'fixture'}));
      build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`
        const f=globalThis.__gomokuDisplayFixture;
        export const pudding={state:{read:()=>f.state},locale:{read:()=> 'en',subscribe:()=>()=>{}},
          interaction:{read:()=>f.run,onResume:()=>()=>{}},defineInterface:()=>()=>{}};
        export const useWidgetState=()=>f.state,useWidgetInteraction=()=>f.run,useWidgetLocale=()=> 'en';
      `}));
    }}],
  });
  const module = new Module(require.resolve('react'));
  module.paths = require.resolve.paths('react');
  module._compile(built.outputFiles[0].text,'gomoku-display-fixture.cjs');
  try {
    for(const run of [null,...['connection_lost','restored'].map(reason=>({id:'restored',status:'paused',reason,participants,receipts:[]}))]) {
      fixture.run = run;
      const dom = new JSDOM(renderToStaticMarkup(createElement(module.exports.default)));
      try {
        for(const id of ['black','white']) {
          const card=dom.window.document.querySelector(`[data-player-id="${id}"]`);
          assert.ok(card,'retained player '+id);
          assert.ok(card.textContent.includes(identities[id].name));
          assert.ok(card.textContent.includes(identities[id].model.name));
          assert.equal(card.querySelector('img').getAttribute('src'),identities[id].model.icon);
        }
        assert.equal(dom.window.document.querySelector('header strong').textContent,'Black wins');
        assert.equal(dom.window.document.querySelector('#resume'),null,'a finished game cannot be resumed');
        assert.equal(dom.window.document.querySelector('[data-connection-paused]'),null,'finished games never show connection warnings');
        assert.equal(fixture.state.data.position.history.length,9);
      } finally { dom.window.close(); }
    }
    fixture.state.data.position = record(place(initial(),8,'H','Black'));
    for(const reason of ['connection_lost','restored','']) {
      fixture.run = {id:'active',status:'paused',reason,participants,receipts:[]};
      const dom = new JSDOM(renderToStaticMarkup(createElement(module.exports.default)));
      try {
        assert.equal(!!dom.window.document.querySelector('[data-connection-paused]'),reason!=='',reason);
        assert.equal(dom.window.document.querySelector('#resume').disabled,reason==='connection_lost');
      } finally { dom.window.close(); }
    }
  } finally { delete globalThis.__gomokuDisplayFixture; }
});
