import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { speechConstraints, openSpeechMicrophone } from '../../js/nina-audio-input.js';

const source = readFileSync(new URL('../../js/nina-access.js', import.meta.url), 'utf8');
function functionSource(name) {
  const result = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
  assert.ok(result, `Production function ${name} is present`);
  return result[0];
}
const tick = () => new Promise(setImmediate);

function microphoneFixture() {
  const calls = [], replacements = [], inputListeners = new Set();
  function makeStream() {
    const track = new EventTarget();
    Object.assign(track, { readyState: 'live', enabled: true, muted: false, stop() { calls.push('track-stopped'); this.readyState = 'ended'; } });
    return { getTracks: () => [track], getAudioTracks: () => [track] };
  }
  const stream = makeStream(), track = stream.getAudioTracks()[0];
  const state = {
    speechConstraints, openSpeechMicrophone,
    AnamEvent: { INPUT_AUDIO_STREAM_STARTED: 'input' },
    ninaMicrophoneSequence: 0, ninaMicrophoneStream: null, ninaMicrophoneCleanup() {}, ninaMicrophoneSwitch: null,
    navigator: { mediaDevices: {
      getUserMedia: async () => stream,
      enumerateDevices: async () => [{ kind: 'audioinput', deviceId: 'default', label: 'Computer microphone' }]
    } },
    ninaClient: {
      addListener(event, listener) { assert.equal(event, 'input'); inputListeners.add(listener); },
      removeListener(event, listener) { assert.equal(event, 'input'); inputListeners.delete(listener); },
      async changeAudioInputDevice(id) {
      calls.push(`switched:${id}`);
      const replacement = makeStream();
      replacements.push(replacement);
      // The SDK emits INPUT_AUDIO_STREAM_STARTED before the switch resolves.
      for (const listener of inputListeners) listener(replacement);
    } },
    ninaAttempt: 1, ninaConnecting: false, ninaOverlay: { classList: { contains: () => true } },
    ninaMicrophoneSetupPromise: null, ninaMicrophoneSelect: { value: 'default', replaceChildren() {} },
    startNina: {}, readPreferredMicrophone: () => 'default', updateNinaMicrophoneName() {},
    microphoneFailure: error => error.message, Option: function () {},
    ninaMicrophoneStatus: {}, setTimeout, clearTimeout, Error, Promise,
    async stopNinaSession() { calls.push('call-stopped'); state.ninaAttempt += 1; state.ninaClient = null; state.stopNinaMicrophone(); },
    savePreferredMicrophone(id) { calls.push(`saved:${id}`); },
    renderMicrophones(devices, id) { calls.push(`selected:${id}`); },
    showNinaFailure(message) { calls.push(message); }, logDevelopmentError() {}
  };
  vm.createContext(state);
  vm.runInContext(['microphoneConstraints', 'listMicrophones', 'withNinaDeadline', 'stopNinaMicrophone',
    'switchLiveNinaMicrophone', 'handleNinaMicrophoneInterruption', 'adoptNinaMicrophoneStream',
    'acquireNinaMicrophone', 'setupNinaMicrophones', 'refreshNinaMicrophones'].map(functionSource).join('\n'), state);
  return { state, stream, track, calls, replacements, makeStream, inputListeners };
}

test('an unplugged microphone switches to the system input without ending the live call', async () => {
  const f = microphoneFixture();
  const client = f.state.ninaClient;
  await f.state.acquireNinaMicrophone('usb');
  f.track.readyState = 'ended';
  f.track.dispatchEvent(new Event('ended'));
  await tick();
  assert.equal(f.state.ninaClient, client);
  assert.equal(f.state.ninaMicrophoneStream, f.replacements[0]);
  assert.equal(f.replacements[0].getAudioTracks()[0].readyState, 'live', 'The switch must not stop the SDK replacement');
  assert.equal(f.state.ninaMicrophoneStatus.textContent, 'MICROPHONE READY');
  assert.equal(f.state.ninaMicrophoneSwitch, null);
  assert.deepEqual(f.calls.filter(c => c.startsWith('switched:')), ['switched:default']);
  assert.ok(!f.calls.includes('call-stopped'));
  assert.ok(f.calls.includes('track-stopped'));
  f.track.dispatchEvent(new Event('ended'));
  await tick();
  assert.equal(f.calls.filter(c => c.startsWith('switched:')).length, 1, 'Old track events are detached');
});

test('an SDK replacement remains monitored and unrelated device changes do not recapture it', async () => {
  const f = microphoneFixture();
  await f.state.acquireNinaMicrophone('usb');
  await f.state.switchLiveNinaMicrophone();
  const replacement = f.replacements[0], replacementTrack = replacement.getAudioTracks()[0];
  f.state.adoptNinaMicrophoneStream(replacement);
  assert.equal(replacementTrack.readyState, 'live', 'Repeated SDK input events are idempotent');
  await f.state.refreshNinaMicrophones();
  assert.equal(f.calls.filter(c => c.startsWith('switched:')).length, 1, 'An unchanged microphone must not be reopened');
  replacementTrack.readyState = 'ended';
  replacementTrack.dispatchEvent(new Event('ended'));
  await tick();
  assert.equal(f.calls.filter(c => c.startsWith('switched:')).length, 2, 'A later interruption of the replacement is recovered');
  assert.equal(f.state.ninaMicrophoneStream, f.replacements[1]);
  assert.ok(!f.calls.includes('call-stopped'));
});

test('switching input while deliberately muted preserves both the call and mute state', async () => {
  const f = microphoneFixture(), client = f.state.ninaClient;
  await f.state.acquireNinaMicrophone('usb');
  f.track.enabled = false;
  const replacement = f.makeStream(), replacementTrack = replacement.getAudioTracks()[0];
  replacementTrack.enabled = false;
  let switches = 0;
  client.changeAudioInputDevice = async () => {
    switches += 1;
    for (const listener of f.inputListeners) listener(replacement);
  };
  await f.state.switchLiveNinaMicrophone();
  await f.state.refreshNinaMicrophones();
  assert.equal(f.state.ninaClient, client);
  assert.equal(f.state.ninaMicrophoneStream, replacement);
  assert.equal(replacementTrack.readyState, 'live');
  assert.equal(replacementTrack.enabled, false, 'Switching must not unmute the user');
  assert.equal(switches, 1, 'Muted input must not trigger another device recovery');
  assert.ok(!f.calls.includes('call-stopped'));
});

test('fresh permission capture still rejects a disabled input before starting a call', async () => {
  const f = microphoneFixture();
  f.track.enabled = false;
  await assert.rejects(f.state.acquireNinaMicrophone(), /No active microphone/);
  assert.equal(f.state.ninaMicrophoneStream, null);
  assert.equal(f.track.readyState, 'ended');
});

test('SDK replacement reapplies optional speech settings without waiting to resume the call', async () => {
  const f = microphoneFixture(); let applied;
  f.state.navigator.mediaDevices.getSupportedConstraints = () => ({ autoGainControl: true, noiseSuppression: true });
  const replacement = f.makeStream();
  replacement.getAudioTracks()[0].applyConstraints = constraints => {
    applied = constraints;
    return new Promise(() => {});
  };
  f.state.ninaClient.changeAudioInputDevice = async () => {
    for (const listener of f.inputListeners) listener(replacement);
  };
  await f.state.acquireNinaMicrophone('usb');
  await f.state.switchLiveNinaMicrophone();
  assert.equal(f.state.ninaMicrophoneStream, replacement);
  assert.equal(f.state.ninaMicrophoneStatus.textContent, 'MICROPHONE READY');
  assert.deepEqual(applied, { noiseSuppression: { ideal: true }, autoGainControl: { ideal: false } });
});

test('a microphone that cannot be replaced closes capture and the call once', async () => {
  const f = microphoneFixture();
  f.state.ninaClient.changeAudioInputDevice = async () => { throw new Error('Input unavailable'); };
  await f.state.acquireNinaMicrophone('usb');
  f.track.dispatchEvent(new Event('ended'));
  await tick();
  assert.equal(f.state.ninaClient, null);
  assert.equal(f.state.ninaMicrophoneStream, null);
  assert.equal(f.calls.filter(c => c === 'call-stopped').length, 1);
  assert.ok(f.calls.includes('track-stopped'));
  assert.ok(f.calls.some(c => c.startsWith('Could not switch microphones.')));
});

test('microphone switching is serialized and cannot update a closed or replacement call', async () => {
  const f = microphoneFixture(); let finishSwitch;
  f.state.ninaClient.changeAudioInputDevice = () => new Promise(resolve => { finishSwitch = resolve; });
  await f.state.acquireNinaMicrophone('usb');
  const first = f.state.switchLiveNinaMicrophone();
  const second = f.state.switchLiveNinaMicrophone();
  await tick();
  await f.state.stopNinaSession();
  const replacement = { getTracks: () => [{ stop() { assert.fail('An old switch must not stop new capture'); } }] };
  f.state.ninaMicrophoneStream = replacement;
  f.state.ninaClient = {};
  f.state.ninaMicrophoneStatus.textContent = 'NEW CALL';
  finishSwitch();
  await Promise.all([first, second]);
  assert.equal(f.state.ninaMicrophoneStream, replacement);
  assert.equal(f.state.ninaMicrophoneStatus.textContent, 'NEW CALL');
  assert.ok(!f.calls.some(c => c.startsWith('saved:')));
  assert.equal(f.calls.filter(c => c === 'call-stopped').length, 1);
});

test('a replacement capture arriving after close is stopped even when normal session listeners are gone', async () => {
  const f = microphoneFixture(); let finishSwitch;
  f.state.ninaClient.changeAudioInputDevice = () => new Promise(resolve => { finishSwitch = resolve; });
  await f.state.acquireNinaMicrophone('usb');
  const change = f.state.switchLiveNinaMicrophone();
  await tick();
  await f.state.stopNinaSession();
  assert.equal(f.inputListeners.size, 1, 'Pending SDK capture retains a scoped cleanup listener');
  const lateStream = f.makeStream();
  for (const listener of f.inputListeners) listener(lateStream);
  finishSwitch();
  await change;
  assert.equal(lateStream.getAudioTracks()[0].readyState, 'ended');
  assert.equal(f.state.ninaMicrophoneStream, null);
  assert.equal(f.inputListeners.size, 0, 'The temporary listener is removed when SDK capture settles');
});

test('microphone loss during connection stops the incomplete call instead of switching an unready client', async () => {
  const f = microphoneFixture();
  f.state.ninaConnecting = true;
  await f.state.acquireNinaMicrophone();
  f.track.dispatchEvent(new Event('ended'));
  await tick();
  assert.equal(f.state.ninaClient, null);
  assert.equal(f.calls.filter(c => c === 'call-stopped').length, 1);
  assert.ok(!f.calls.some(c => c.startsWith('switched:')));
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

test('a stale automatic permission result cannot stop microphone capture in a newer call', async t => {
  for (const result of ['accepted', 'rejected']) await t.test(result, async () => {
    const f = microphoneFixture(); let oldGrant, oldReject;
    f.state.navigator.mediaDevices.getUserMedia = () => new Promise((resolve, reject) => { oldGrant = resolve; oldReject = reject; });
    const oldSetup = f.state.setupNinaMicrophones();
    f.state.stopNinaMicrophone();
    const replacement = f.makeStream();
    f.state.navigator.mediaDevices.getUserMedia = async () => replacement;
    await f.state.acquireNinaMicrophone();
    if (result === 'accepted') oldGrant(f.stream);
    else oldReject(Object.assign(new Error('Old request denied'), { name: 'NotAllowedError' }));
    await oldSetup;
    assert.equal(f.state.ninaMicrophoneStream, replacement);
    assert.equal(replacement.getAudioTracks()[0].readyState, 'live');
    assert.equal(f.state.ninaMicrophoneStatus.textContent, 'MICROPHONE READY');
  });
});

test('a device enumeration started before closing cannot stop a newer call', async () => {
  const f = microphoneFixture(); let oldEnumeration;
  f.state.navigator.mediaDevices.enumerateDevices = () => new Promise(resolve => { oldEnumeration = resolve; });
  const refresh = f.state.refreshNinaMicrophones();
  f.state.stopNinaMicrophone();
  const replacement = f.makeStream();
  f.state.adoptNinaMicrophoneStream(replacement);
  oldEnumeration([]);
  await refresh;
  assert.equal(f.state.ninaMicrophoneStream, replacement);
  assert.equal(replacement.getAudioTracks()[0].readyState, 'live');
  assert.ok(!f.calls.includes('call-stopped'));
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
    ninaVideoReady: true, ninaLiveMedia: { dispose() { calls.push('media-guard-disposed'); } },
    ninaConnecting: true, ninaTokenAbortController: { abort() { calls.push('aborted'); } },
    ninaDiagnostics: {stop(){calls.push("diagnostics-stopped");}},
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
  assert.equal(state.ninaVideoReady, false);
  assert.ok(calls.indexOf('media-guard-disposed') < calls.indexOf('video-paused'));
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
