import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/nina-access.js', import.meta.url), 'utf8');
const start = source.indexOf('function bindAnamLifecycle');
const end = source.indexOf('\nfunction reportAppConnectionError', start);
const bindSource = source.slice(start, end);

function fixture() {
  const listeners = new Map(), timers = new Map(), talks = [];
  let timerId = 0;
  const client = {
    interrupts: 0,
    addListener(name, fn) { listeners.set(name, fn); },
    removeListener(name, fn) { if (listeners.get(name) === fn) listeners.delete(name); },
    interruptPersona() { this.interrupts++; },
    async talk(content) { talks.push(content); }
  };
  const state = {
    setTimeout(fn, ms) { const id=++timerId; timers.set(id,{fn,ms}); return id; },
    clearTimeout(id) { timers.delete(id); },
    ninaMemoryListenerCleanup: null,
    trackNinaMessageCompletion: () => () => {},
    NINA_WEB_FLOW: true, ninaOwnerBypass: false,
    ninaAttempt: 1, ninaClient: client,
    ninaStatus: { textContent: 'NINA ONLINE' },
    ninaDiagnostics: null,
    ninaVideoReady: true,
    ninaTrialActivationPending: false,
    ninaWebProgress: { observe() {}, hasSpeech() { return true; } },
    storeCompletedNinaMessages: history => history,
    activateNinaUsage: async () => true,
    logDevelopmentError() {},
    reportAppConnectionError() {},
    stopNinaSession: async () => {},
    ninaOverlay: { classList: { contains: () => true } },
    showNoSignalCredits() {}, showNinaFailure() {}, showNinaCannotHear() {},
    adoptNinaMicrophoneStream() {},
    endNinaAnalyticsSession() {},
    AnamEvent: {
      CONNECTION_ESTABLISHED:'open', VIDEO_PLAY_STARTED:'video', CONNECTION_CLOSED:'closed',
      MESSAGE_HISTORY_UPDATED:'history', MESSAGE_STREAM_EVENT_RECEIVED:'stream', INPUT_AUDIO_STREAM_STARTED:'input'
    }
  };
  vm.createContext(state);
  vm.runInContext(bindSource+'\nthis.bind=bindAnamLifecycle;',state);
  state.bind(client,1);
  return {
    state,client,talks,listeners,timers,
    expire(ms){const item=[...timers].find(([,v])=>v.ms===ms);assert.ok(item);timers.delete(item[0]);return item[1].fn();}
  };
}

test('web first-reply recovery answers can-you-hear-me if no persona output arrives', async () => {
  const f=fixture();
  f.listeners.get('history')([{id:'u1',role:'user',content:'Hi Nina, can you hear me?'}]);
  assert.equal(f.state.ninaStatus.textContent,'NINA RESPONDING');
  await f.expire(4500);
  assert.deepEqual(f.talks,['Yes. I can hear you.']);
  assert.equal(f.client.interrupts,1);
});

test('real persona output cancels the can-you-hear-me recovery', async () => {
  const f=fixture();
  f.listeners.get('history')([{id:'u1',role:'user',content:'Can you hear me?'}]);
  f.listeners.get('stream')({id:'p1',role:'persona',content:'Yes'});
  assert.equal(f.timers.size,0);
  assert.equal(f.state.ninaStatus.textContent,'NINA ONLINE');
  assert.deepEqual(f.talks,[]);
});
