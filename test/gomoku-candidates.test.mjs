import test from 'node:test';
import assert from 'node:assert/strict';
import { fillCandidates, playerIdentities, retainedPlayer } from '../extensions/widgets/gomoku/source/src/candidates.ts';
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
