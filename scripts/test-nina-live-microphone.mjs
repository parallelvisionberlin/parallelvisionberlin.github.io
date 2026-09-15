import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { speechConstraints } from '../js/nina-audio-input.js';

const code = fs.readFileSync(new URL('../js/nina-access.js', import.meta.url), 'utf8');
const source = ['switchLiveNinaMicrophone', 'adoptNinaMicrophoneStream', 'microphoneConstraints',
  'handleNinaMicrophoneInterruption', 'stopNinaMicrophone'].map(name => {
  const match = code.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `Production function ${name} is present`);
  return match[0];
}).join('\n');

function setup(change) {
  const calls = [], listeners = new Set();
  const replacementTrack = new EventTarget();
  Object.assign(replacementTrack, { readyState: 'live', enabled: true, muted: false,
    stop() { this.readyState = 'ended'; calls.push('stop-replacement'); } });
  const replacement = { getAudioTracks: () => [replacementTrack], getTracks: () => [replacementTrack] };
  const context = {
    ninaClient: {
      addListener(event, fn) { listeners.add(fn); }, removeListener(event, fn) { listeners.delete(fn); },
      async changeAudioInputDevice(id) {
        await change(id);
        for (const listener of listeners) listener(replacement);
      }
    },
    AnamEvent: { INPUT_AUDIO_STREAM_STARTED: 'input' }, ninaMicrophoneSwitch: null,
    ninaAttempt: 1, ninaConnecting: false, ninaMicrophoneSequence: 0,
    ninaMicrophoneStatus: {}, ninaMicrophoneCleanup: () => calls.push('detach'),
    listMicrophones: async () => [{ deviceId: 'default', label: 'Computer' }],
    withNinaDeadline: promise => promise, speechConstraints,
    navigator: { mediaDevices: { getSupportedConstraints: () => ({}) } },
    ninaMicrophoneStream: { getTracks: () => [{ stop: () => calls.push('stop-old') }] },
    savePreferredMicrophone: id => calls.push(id), renderMicrophones() {}, logDevelopmentError() {},
    stopNinaSession: async () => calls.push('hangup'),
    ninaOverlay: { classList: { contains: () => true } }, showNinaFailure: () => calls.push('failure'),
    setTimeout, clearTimeout, Promise, Error
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, calls, replacement, listeners };
}

test('successful fallback preserves the session and tracks SDK replacement capture', async () => {
  const selected = [];
  const { context, calls, replacement, listeners } = setup(async id => selected.push(id));
  await context.switchLiveNinaMicrophone();
  assert.deepEqual(selected, ['default']);
  assert.ok(!calls.includes('hangup'));
  assert.equal(context.ninaMicrophoneStream, replacement);
  assert.equal(replacement.getAudioTracks()[0].readyState, 'live');
  assert.equal(context.ninaMicrophoneStatus.textContent, 'MICROPHONE READY');
  assert.equal(listeners.size, 0);
});

test('concurrent device events perform one switch', async () => {
  let resolve, count = 0;
  const { context } = setup(() => { count++; return new Promise(r => { resolve = r; }); });
  const first = context.switchLiveNinaMicrophone(), second = context.switchLiveNinaMicrophone();
  await new Promise(setImmediate);
  resolve();
  await Promise.all([first, second]);
  assert.equal(count, 1);
});

test('failed replacement ends the session instead of charging indefinitely without input', async () => {
  const { context, calls } = setup(async () => { throw new Error('unavailable'); });
  await context.switchLiveNinaMicrophone();
  assert.ok(calls.includes('hangup'));
  assert.ok(calls.includes('failure'));
});

test('late failure cannot close a newer call', async () => {
  let reject;
  const { context, calls } = setup(() => new Promise((resolve, fail) => { reject = fail; }));
  const pending = context.switchLiveNinaMicrophone();
  await new Promise(setImmediate);
  context.ninaAttempt++;
  reject(new Error('late'));
  await pending;
  assert.ok(!calls.includes('hangup'));
});
