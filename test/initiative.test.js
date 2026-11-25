import test from 'node:test';
import assert from 'node:assert/strict';
import { decideInitiative, mayExecute } from '../lib/initiative.js';
const now = 1000000;
const state = { enabled: true, lastSpeechAt: 0, lastActivityAt: now - 10000, screenConsent: true, observationChanged: true };
test('contextual suggestion only with consent', () => {
  assert.equal(decideInitiative(state, now), 'contextual-tip');
  assert.equal(decideInitiative({...state, screenConsent:false}, now), null);
});
test('quiet, sensitive, listening or repeated unanswered interactions are suppressed', () => {
  for (const key of ['quiet','locked','sensitive','speaking','listening','busy']) assert.equal(decideInitiative({...state,[key]:true}, now), null);
  assert.equal(decideInitiative({...state,unanswered:2},now),null);
});
test('cursor play only when idle and opted in', () => {
  assert.equal(mayExecute('cursor-nudge',{cursorPlay:true,idle:true}),true);
  assert.equal(mayExecute('cursor-nudge',{cursorPlay:true,idle:false}),false);
  assert.equal(mayExecute('click',{click:true},false),false);
  assert.equal(mayExecute('run-command',{ 'run-command':true },true),true);
  assert.equal(mayExecute('speak',{initiative:true,paused:true}),false);
});
