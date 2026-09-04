import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../../js/nina-access.js', import.meta.url), 'utf8');
const tracking = source.slice(source.indexOf('function clearNinaAnalyticsHeartbeat()'), source.indexOf('function clearNinaUsageTimer()'));

function client() {
  let token = 'initial';
  let heartbeat;
  let resolveAuth;
  let delayAuth = false;
  const requests = [];
  const errors = [];
  const ctx = vm.createContext({
    ANAM_SESSION_TOKEN_ENDPOINT: 'https://worker.example/session-token',
    NINA_ANALYTICS_HEARTBEAT_MS: 10000,
    ninaVisitorId: 'visitor-test', ninaAnalyticsEntryId: 'entry-test',
    ninaAnalyticsSessionId: '', ninaAnalyticsStartPromise: null,
    ninaAnalyticsHeaders: null, ninaAnalyticsHeartbeatTimer: null,
    authenticationHeaders: async () => {
      if (delayAuth) await new Promise(resolve => { resolveAuth = resolve; });
      return { Authorization: token, 'Content-Type': 'application/json' };
    },
    fetch: async (url, options) => {
      requests.push({ url, ...options });
      if (url.endsWith('/start')) return { ok: true, json: async () => ({ sessionId: 'session-test' }) };
      return { ok: options.headers.Authorization === token, status: options.headers.Authorization === token ? 200 : 401 };
    },
    setInterval: fn => { heartbeat = fn; return 1; }, clearInterval() {},
    logDevelopmentError: (...args) => errors.push(args)
  });
  vm.runInContext(tracking, ctx);
  return { ctx, requests, errors, rotate: () => { token = 'renewed'; },
    beat: async () => { heartbeat(); await new Promise(resolve => setImmediate(resolve)); },
    defer: () => { delayAuth = true; }, release: () => resolveAuth() };
}

test('analytics heartbeats and final keepalive use the renewed credential after expiry', async () => {
  const c = client();
  await c.ctx.startNinaAnalyticsSession();
  c.rotate();
  await c.beat();
  await c.ctx.endNinaAnalyticsSession();
  assert.equal(c.requests.length, 3);
  assert.equal(c.requests[1].headers.Authorization, 'renewed');
  assert.equal(c.requests[2].headers.Authorization, 'renewed');
  assert.equal(c.requests[2].keepalive, true);
  assert.equal(c.errors.length, 0);
});

test('a heartbeat waiting for authentication cannot restart a closed session', async () => {
  const c = client();
  await c.ctx.startNinaAnalyticsSession();
  c.defer();
  await c.beat();
  await c.ctx.endNinaAnalyticsSession();
  c.release();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(c.requests.filter(r => r.url.endsWith('/heartbeat')).length, 0);
  assert.equal(c.ctx.ninaAnalyticsSessionId, '');
});
