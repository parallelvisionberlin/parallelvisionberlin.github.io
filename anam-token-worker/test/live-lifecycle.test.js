import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createConversationProgress } from '../../js/nina-web-flow.js';

const source = readFileSync(new URL('../../js/nina-access.js', import.meta.url), 'utf8');
function extract(name) {
  const match = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `Production function ${name} exists`);
  return match[0];
}

test('connection signalling cannot activate billing before the first video frame', async () => {
  const handlers = new Map(), actions = [];
  const client = { addListener: (name, fn) => handlers.set(name, fn), removeListener: name => handlers.delete(name) };
  const state = {
    ninaClient: client, ninaAttempt: 1, ninaVideoReady: false,
    ninaMemoryListenerCleanup: null, ninaTrialActivationPending: false,
    NINA_WEB_FLOW: true, ninaWebProgress: { hasSpeech: () => true },
    beginNinaTrialGrace: async () => actions.push('trial-ready'),
    trackNinaMessageCompletion: () => () => actions.push('tracking-cleanup'),
    ninaDiagnostics: { record: kind => actions.push(kind) },
    AnamEvent: Object.fromEntries(['CONNECTION_ESTABLISHED', 'VIDEO_PLAY_STARTED', 'CONNECTION_CLOSED', 'MESSAGE_HISTORY_UPDATED', 'INPUT_AUDIO_STREAM_STARTED'].map(name => [name, name])),
    activateNinaUsage: async () => actions.push('billing'),
    adoptNinaMicrophoneStream: stream => actions.push(stream),
    endNinaAnalyticsSession: async () => {},
  };
  vm.createContext(state); vm.runInContext(extract('bindAnamLifecycle'), state);
  state.bindAnamLifecycle(client, 1);
  handlers.get('CONNECTION_ESTABLISHED')();
  assert.equal(state.ninaVideoReady, false);
  assert.ok(!actions.includes('billing'));
  handlers.get('VIDEO_PLAY_STARTED')();
  assert.equal(state.ninaVideoReady, true);
  assert.equal(actions.filter(x => x === 'billing').length, 1);
  const input = handlers.get('INPUT_AUDIO_STREAM_STARTED');
  const stream = { getTracks: () => [{ stop: () => actions.push('stale-stopped') }] };
  input(stream);
  assert.ok(actions.includes(stream));
  state.ninaAttempt = 2;
  input(stream);
  assert.ok(actions.includes('stale-stopped'));
  state.ninaMemoryListenerCleanup();
  assert.equal(handlers.size, 0);
  assert.ok(actions.includes('tracking-cleanup'));
});

test('trial speech before the first video frame starts billing once when the frame arrives', async () => {
  const handlers = new Map(), requests = [], errors = [];
  const client = { addListener: (name, fn) => handlers.set(name, fn), removeListener: name => handlers.delete(name) };
  const state = {
    ninaClient: client, ninaAttempt: 1, ninaVideoReady: false,
    ninaMemoryListenerCleanup: null, ninaTrialActivationPending: true,
    ninaUsageSessionId: 'trial-session', ninaUsageActive: false,
    ninaUsageActivationPromise: null, ninaUsageSettlementSeconds: 30,
    NINA_WEB_FLOW: true, ninaWebProgress: createConversationProgress(), ninaWebAudio: null,
    ninaDiagnostics: null,
    AnamEvent: Object.fromEntries(['CONNECTION_ESTABLISHED', 'VIDEO_PLAY_STARTED', 'CONNECTION_CLOSED', 'MESSAGE_HISTORY_UPDATED', 'INPUT_AUDIO_STREAM_STARTED'].map(name => [name, name])),
    beginNinaTrialGrace: async () => true,
    trackNinaMessageCompletion: () => () => {},
    storeCompletedNinaMessages: history => history,
    requestNinaUsage: async action => {
      requests.push(action);
      return { status: 'active', remainingSeconds: 180, settlementSeconds: 30 };
    },
    clearNinaTrialGraceTimer() {}, markNinaOnline() {}, scheduleNinaUsageSettlement() {},
    logDevelopmentError: (...args) => errors.push(args),
    reportAppConnectionError: (...args) => errors.push(args),
    stopNinaSession: async () => {}, ninaOverlay: { classList: { contains: () => false } },
  };
  vm.createContext(state);
  vm.runInContext(`${extract('activateNinaUsage')}\n${extract('bindAnamLifecycle')}`, state);
  state.bindAnamLifecycle(client, 1);
  handlers.get('CONNECTION_ESTABLISHED')();
  handlers.get('MESSAGE_HISTORY_UPDATED')([{ role: 'user', content: 'Hello Nina.' }]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.ninaWebProgress.hasSpeech(), true);
  assert.equal(state.ninaVideoReady, false);
  assert.equal(state.ninaUsageActive, false);
  assert.deepEqual(requests, [], 'A received utterance cannot start billing without video');

  handlers.get('VIDEO_PLAY_STARTED')();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.ninaVideoReady, true);
  assert.equal(state.ninaUsageActive, true);
  assert.equal(state.ninaTrialActivationPending, false);
  assert.deepEqual(requests, ['activate'], 'Previously received speech does not require a second utterance');

  handlers.get('VIDEO_PLAY_STARTED')();
  handlers.get('MESSAGE_HISTORY_UPDATED')([{ role: 'user', content: 'Hello again.' }]);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(requests, ['activate'], 'Repeated video/history events do not activate billing twice');
  assert.deepEqual(errors, []);
});

test('an early activation request remains unpaid even with an eligible account', async () => {
  const client = {}, calls = [];
  const state = { ninaClient: client, ninaAttempt: 1, ninaVideoReady: false,
    requestNinaUsage: () => { calls.push('activate'); throw new Error('Must wait for video'); } };
  vm.createContext(state); vm.runInContext(extract('activateNinaUsage'), state);
  assert.equal(await state.activateNinaUsage(1, client), false);
  assert.deepEqual(calls, []);
});

test('lost billing verification preserves the session ID for final cleanup', async () => {
  const stopped = [];
  const state = {
    ninaUsageSessionId: 'session', ninaUsageEnding: false, ninaUsageActive: true,
    ninaUsageSettlementFailures: 1, clearNinaUsageTimer() {}, clearNinaTrialGraceTimer() {},
    requestNinaUsage: async () => { throw new Error('offline'); }, logDevelopmentError() {},
    stopNinaSession: async () => stopped.push(state.ninaUsageSessionId),
    ninaOverlay: { classList: { contains: () => true } }, showNinaFailure() {},
  };
  vm.createContext(state); vm.runInContext(extract('settleNinaUsage'), state);
  await state.settleNinaUsage(false);
  assert.deepEqual(stopped, ['session']);
  assert.equal(state.ninaUsageActive, false);
});
