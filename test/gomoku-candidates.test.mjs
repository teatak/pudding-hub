import test from 'node:test';
import assert from 'node:assert/strict';
import { fillCandidates } from '../widgets/gomoku/source/src/candidates.ts';
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
