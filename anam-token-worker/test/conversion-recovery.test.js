import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/nina-access.js', import.meta.url), 'utf8');
function functionSource(name) {
  const result = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
  assert.ok(result, `Production function ${name} is present`);
  return result[0];
}
const tick = () => new Promise(setImmediate);

function microphoneFixture() {
  const calls = [];
  const track = new EventTarget();
  Object.assign(track, { readyState: 'live', enabled: true, muted: false, stop() { calls.push('track-stopped'); this.readyState = 'ended'; } });
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  const state = {
    ninaMicrophoneSequence: 0, ninaMicrophoneStream: null, ninaMicrophoneCleanup() {},
    navigator: { mediaDevices: { getUserMedia: async () => stream } },
    ninaClient: {}, ninaConnecting: false, ninaOverlay: { classList: { contains: () => true } },
    ninaMicrophoneStatus: {}, setTimeout, clearTimeout, Error, Promise,
    async stopNinaSession() { calls.push('call-stopped'); state.ninaClient = null; state.stopNinaMicrophone(); },
    showNinaFailure(message) { calls.push(message); }
  };
  vm.createContext(state);
  vm.runInContext(['microphoneConstraints', 'stopNinaMicrophone', 'handleNinaMicrophoneInterruption', 'acquireNinaMicrophone'].map(functionSource).join('\n'), state);
  return { state, stream, track, calls };
}

test('an ended microphone stops media and billing and offers a recoverable state', async () => {
  const f = microphoneFixture();
  await f.state.acquireNinaMicrophone('usb');
  f.track.dispatchEvent(new Event('ended'));
  await tick();
  assert.equal(f.state.ninaClient, null);
  assert.equal(f.state.ninaMicrophoneStream, null);
  assert.ok(f.calls.includes('call-stopped'));
  assert.ok(f.calls.includes('track-stopped'));
  assert.ok(f.calls.some(c => c.includes('Unused credits remain')));
});

test('microphone permission resolving after closing cannot reopen capture', async () => {
  const f = microphoneFixture(); let grant;
  f.state.navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { grant = resolve; });
  const acquire = f.state.acquireNinaMicrophone();
  f.state.stopNinaMicrophone();
  grant(f.stream);
  await assert.rejects(acquire, e => e.name === 'AbortError');
  assert.equal(f.state.ninaMicrophoneStream, null);
  assert.ok(f.calls.includes('track-stopped'));
});

test('an accounting request keeps its original session while authentication is pending', async () => {
  let authenticate; let requested;
  const state = {
    ninaUsageSessionId: 'old-session', ANAM_SESSION_TOKEN_ENDPOINT: 'https://worker.example/session-token',
    authenticationHeaders: () => new Promise(resolve => { authenticate = resolve; }),
    AbortSignal, Error, setTimeout, clearTimeout,
    fetch: async (url, options) => { requested = { url, ...options }; return { ok: true, json: async () => ({ status: 'ended' }) }; }
  };
  vm.createContext(state); vm.runInContext(functionSource('withNinaDeadline') + '\n' + functionSource('requestNinaUsage'), state);
  const result = state.requestNinaUsage('end', true);
  state.ninaUsageSessionId = 'new-session';
  authenticate({}); await result;
  assert.equal(JSON.parse(requested.body).sessionId, 'old-session');
  assert.equal(requested.keepalive, true);
});

test('zero remaining grace uses the bounded silent recovery window', async () => {
  const client = {}, timers = [];
  const state = {
    ninaAttempt: 1, ninaClient: client, ninaTrialActivationPending: true,
    ninaTrialGraceReadyPromise: null, ninaTrialGraceTimer: null, ninaUsageActive: false,
    ninaUsageActivationPromise: null, NINA_WEB_FLOW: true, NINA_SIGNUP_TRIAL_GRACE_MS: 60000,
    ninaWebAudio: { show() {} }, ninaOverlay: { classList: { contains: () => true } },
    markNinaOnline() {}, requestNinaUsage: async () => ({ trialActivationPending: true, graceSeconds: 0, recoverySeconds: 10 }),
    setTimeout(fn, ms) { timers.push({ fn, ms }); return 1; },
    async stopNinaSession() { state.stopped = true; }, showNinaFailure() {}, logDevelopmentError() {}, Promise
  };
  vm.createContext(state); vm.runInContext(functionSource('beginNinaTrialGrace'), state);
  await state.beginNinaTrialGrace(1, client);
  await state.beginNinaTrialGrace(1, client);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].ms, 10000);
  state.ninaUsageActivationPromise = Promise.resolve();
  await timers[0].fn();
  assert.equal(state.stopped, undefined, 'Do not cancel speech already being activated');
  state.ninaUsageActivationPromise = null;
  await timers[0].fn();
  assert.equal(state.stopped, true);
});

test('closing releases the microphone and video before final accounting and serializes cleanup', async () => {
  const calls = []; let finishAccounting;
  const state = {
    ninaStoppingPromise: null, NINA_WEB_FLOW: true, ninaAttempt: 1,
    ninaConnecting: true, ninaTokenAbortController: { abort() { calls.push('aborted'); } },
    ninaMemoryListenerCleanup() { calls.push('unbound'); },
    ninaMemoryLoadedForSession: true, ninaSessionMessageKeys: new Set(),
    ninaClient: { async stopStreaming() { calls.push('media-stopped'); } },
    ninaVideo: { srcObject: {}, pause() { calls.push('video-paused'); } },
    ninaUsageSessionId: 'session', ninaUsageActive: true,
    ninaTrialActivationPending: false, ninaTrialGraceReadyPromise: null,
    ninaUsageRemainingSeconds: 10, ninaUsageSettlementSeconds: 6,
    ninaUsageActivationPromise: null, ninaUsageSettlementFailures: 0,
    ninaServerConversationId: '',
    clearNinaWebSession() {}, clearNinaLiveCountdown() {}, endNinaAnalyticsSession() {},
    clearNinaUsageTimer() {}, clearNinaUsageWarning() {}, clearNinaTrialGraceTimer() {},
    stopNinaMicrophone() { calls.push('microphone-stopped'); },
    settleNinaUsage(end, keepalive) {
      assert.equal(end, true); assert.equal(keepalive, true); calls.push('accounting');
      return new Promise(resolve => { finishAccounting = resolve; });
    }, logDevelopmentError() {}, Promise, Set, setTimeout, clearTimeout
  };
  vm.createContext(state);
  vm.runInContext(functionSource('withNinaDeadline') + '\n' + functionSource('stopNinaSession'), state);
  const first = state.stopNinaSession(), second = state.stopNinaSession();
  assert.equal(state.ninaClient, null);
  assert.equal(state.ninaVideo.srcObject, null);
  assert.ok(calls.indexOf('microphone-stopped') < calls.indexOf('accounting'));
  assert.equal(calls.filter(c => c === 'accounting').length, 1);
  finishAccounting(); await Promise.all([first, second]);
  assert.equal(state.ninaUsageSessionId, '');
  assert.equal(state.ninaStoppingPromise, null);
});

test('an exhausted final settlement completes without recursively waiting for another stop', async () => {
  const state = {
    ninaUsageSessionId: 'session', ninaUsageEnding: false, ninaUsageSettlementFailures: 0,
    ninaCreditsUserId: 'user', ninaCreditsBalance: 0, ninaUsageRemainingSeconds: 0,
    ninaSignalCredits: null, ninaLiveTime: null, ninaUsageSettlementSeconds: 6,
    clearNinaUsageTimer() {}, clearNinaTrialGraceTimer() {}, writeSignalCreditSnapshot() {},
    requestNinaUsage: async () => ({ status: 'exhausted', balance: 0, remainingSeconds: 0 }),
    stopNinaSession() { assert.fail('Final settlement must not recursively stop'); },
    logDevelopmentError() { assert.fail('Final settlement should succeed'); }, Number
  };
  vm.createContext(state); vm.runInContext(functionSource('settleNinaUsage'), state);
  assert.equal((await state.settleNinaUsage(true, true)).status, 'exhausted');
  assert.equal(state.ninaUsageEnding, false);
});
