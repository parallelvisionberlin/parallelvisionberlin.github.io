import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/nina-access.js', import.meta.url), 'utf8');
const fn = source.match(/async function activateNinaUsage\(attempt, client\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(fn, 'Test the actual production activation function');
function fixture({ speech = true, web = true, trial = true, activate } = {}) {
  const client = {};
  const calls = [];
  const state = {
    ninaAttempt: 1, ninaClient: client, NINA_WEB_FLOW: web,
    ninaTrialActivationPending: trial, ninaWebProgress: { hasSpeech: () => speech },
    ninaWebAudio: { confirmed: () => false, active() { calls.push('audio-ui-active'); } },
    ninaUsageSessionId: 'test-session', ninaUsageActive: false,
    ninaUsageActivationPromise: null, ninaUsageSettlementFailures: 0,
    ninaUsageRemainingSeconds: null, ninaUsageSettlementSeconds: 30,
    beginNinaTrialGrace: async () => true,
    requestNinaUsage: async action => {
      calls.push(action);
      return activate ? activate() : { status: 'active', remainingSeconds: 180, settlementSeconds: 30 };
    },
    markNinaOnline() { calls.push('online'); },
    clearNinaTrialGraceTimer() { calls.push('clear-grace'); },
    scheduleNinaUsageSettlement() { calls.push('schedule-billing'); }
  };
  vm.createContext(state);
  vm.runInContext(fn, state);
  return { state, calls, run: (attempt = 1, c = client) => state.activateNinaUsage(attempt, c) };
}

test('first completed speech activates without audio confirmation, microphone locking or a click', async () => {
  const f = fixture();
  assert.equal(await f.run(), true);
  assert.equal(f.state.ninaUsageActive, true);
  assert.equal(f.state.ninaTrialActivationPending, false);
  assert.equal(f.state.ninaUsageRemainingSeconds, 180);
  assert.ok(f.calls.includes('clear-grace'), 'cancel the setup timeout after activation');
  assert.ok(f.calls.includes('schedule-billing'));
  assert.equal(f.calls.filter(v => v === 'activate').length, 1);
});
test('connection, greeting and microphone permission alone cannot start the trial', async () => {
  const f = fixture({ speech: false });
  assert.equal(await f.run(), false);
  assert.equal(f.state.ninaUsageActive, false);
  assert.equal(f.calls.length, 0);
});
test('concurrent speech updates share one activation request', async () => {
  let finish;
  const response = new Promise(resolve => { finish = resolve; });
  const f = fixture({ activate: () => response });
  const a = f.run(); const b = f.run();
  await new Promise(setImmediate);
  assert.equal(f.calls.filter(v => v === 'activate').length, 1);
  finish({ status: 'active', remainingSeconds: 180, settlementSeconds: 30 });
  assert.deepEqual(await Promise.all([a, b]), [true, true]);
  await f.run();
  assert.equal(f.calls.filter(v => v === 'activate').length, 1);
});
test('stale attempt or a different client cannot activate a new call', async () => {
  const f = fixture();
  assert.equal(await f.run(0), false);
  assert.equal(await f.run(1, {}), false);
  assert.equal(f.calls.length, 0);
});
test('failed server activation is not presented as a running trial', async () => {
  const f = fixture({ activate: async () => { throw new Error('Synthetic server failure'); } });
  await assert.rejects(f.run(), /Synthetic server failure/);
  assert.equal(f.state.ninaUsageActive, false);
  assert.equal(f.state.ninaUsageActivationPromise, null);
  assert.ok(!f.calls.includes('schedule-billing'));
});
test('native and paid-session activation retain their existing behavior', async () => {
  for (const opts of [{ web: false, speech: false }, { trial: false, speech: false }]) {
    const f = fixture(opts);
    assert.equal(await f.run(), true);
    assert.equal(f.calls.filter(v => v === 'activate').length, 1);
  }
});
