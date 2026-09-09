import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { getNinaAnalyticsSessionDetail, readAnalyticsCalls, berlinTodayStart } from '../src/analytics.js';

// Synthetic records only. Execute the production SQL against the actual migrations,
// not an adapter that returns canned results regardless of query validity.
const NOW = Date.parse('2026-09-09T10:00:00.000Z');
const PUBLIC_CALL = '11111111-1111-4111-8111-111111111111';
const OWNER_CALL = '22222222-2222-4222-8222-222222222222';
const OTHER_CALL = '33333333-3333-4333-8333-333333333333';
const at = offset => new Date(NOW + offset).toISOString();

function fixture({ fail = null, drop = null } = {}) {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0001_nina_memory.sql', '0002_authenticated_users.sql', '0003_signal_credits.sql',
    '0004_signal_credit_purchases.sql', '0006_live_nina_sessions.sql', '0010_nina_analytics.sql', '20260909_nina_web_conversations.sql']) {
    sqlite.exec(readFileSync(new URL('../migrations/' + name, import.meta.url), 'utf8'));
  }
  const start = at(-600000), end = at(-410000), created = at(-610000);
  for (const [id, role, callId] of [['public-a', 'user', PUBLIC_CALL], ['owner-a', 'owner', OWNER_CALL], ['public-b', 'user', OTHER_CALL]]) {
    const memory = 'memory-' + id;
    sqlite.prepare('INSERT INTO visitors VALUES (?, ?, ?, ?, ?)').run(memory, id, role === 'owner' ? 'owner' : 'visitor', created, created);
    sqlite.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, 'clerk', id, id + '@example.invalid', id, role, memory, created, created);
    sqlite.prepare('INSERT INTO conversations VALUES (?, ?, ?, ?)').run('conversation-' + id, memory, created, end);
    sqlite.prepare('INSERT INTO nina_analytics_sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      callId, callId, 'browser-' + id, id, 'user:' + id, 1, role === 'owner' ? 'owner' : 'public', 0, 'ended', start, end, end, 190, start.slice(0, 10));
    for (const [i, speaker] of ['persona', 'user', 'persona', 'user', 'persona'].entries()) {
      sqlite.prepare('INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)').run('message-' + id + '-' + i, 'conversation-' + id, memory,
        speaker, id + ' synthetic message ' + i, at(-590000 + i * 10000));
    }
    sqlite.prepare('INSERT INTO signal_credit_accounts VALUES (?, 0, 0, 0, ?, ?)').run(id, created, created);
    if (role !== 'owner') {
      sqlite.prepare('INSERT INTO signal_credit_transactions VALUES (?, ?, 30, ?, ?, ?, ?, ?)').run('trial-' + id, id, 'credit', 'signup_trial', 'trial:' + id, 'Synthetic trial', created);
      sqlite.prepare('INSERT INTO live_nina_sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('live-' + id, id, 'ended', start, end, end, end, 30, 10, created, end);
      sqlite.prepare('INSERT INTO signal_credit_transactions VALUES (?, ?, -10, ?, ?, ?, ?, ?)').run('debit-' + id, id, 'debit', 'anam_usage', 'anam-session:live-' + id + ':through:60', 'Synthetic debit', end);
    }
  }
  if (drop) sqlite.exec('DROP TABLE ' + drop);
  const queries = [];
  const binding = { prepare(sql) {
    queries.push(sql);
    const execute = (kind, values) => {
      if (fail?.(sql, values, kind)) throw new Error('D1_ERROR: injected metadata failure (private@example.invalid)');
      try {
        const statement = sqlite.prepare(sql);
        if (kind === 'all') return { results: statement.all(...values) };
        if (kind === 'first') return statement.get(...values) || null;
        return { meta: statement.run(...values) };
      } catch (cause) { throw new Error('D1_ERROR: ' + cause.message, { cause }); }
    };
    let values = [];
    return { bind(...args) { values = args; return this; },
      async all() { return execute('all', values); }, async first() { return execute('first', values); }, async run() { return execute('run', values); } };
  } };
  return { sqlite, queries, env: { NINA_MEMORY_DB: binding } };
}

async function withFixture(options, run) {
  const f = fixture(options);
  try { return await run(f); } finally { f.sqlite.close(); }
}

test('public account: transcript, live session and credit ledger load together', () => withFixture({}, async ({ env }) => {
  const detail = await getNinaAnalyticsSessionDetail(env, PUBLIC_CALL, NOW);
  assert.equal(detail.session.displayName, 'public-a');
  assert.equal(detail.transcript.length, 5);
  assert.equal(detail.userMessages, 2);
  assert.equal(detail.ninaMessages, 3);
  assert.ok(detail.transcript.every(m => m.content.startsWith('public-a')));
  assert.equal(detail.live.creditsAtStart, 30);
  assert.equal(detail.live.creditsDebited, 10);
  assert.equal(detail.creditAccount.balance, 20);
  assert.equal(detail.creditEvents.length, 1);
  assert.equal(detail.creditEvents[0].amount, -10);
  assert.deepEqual(detail.warnings, []);
  assert.equal(detail.detailAvailability.creditEvents, true);
  assert.equal(detail.qualified, false);
}));

test('owner and a second public account each receive their own transcript', () => withFixture({}, async ({ env }) => {
  const owner = await getNinaAnalyticsSessionDetail(env, OWNER_CALL, NOW);
  const other = await getNinaAnalyticsSessionDetail(env, OTHER_CALL, NOW);
  assert.equal(owner.live, null);
  assert.ok(owner.transcript.every(m => m.content.startsWith('owner-a')));
  assert.ok(other.transcript.every(m => m.content.startsWith('public-b')));
  assert.equal(other.live.id, 'live-public-b');
}));

for (const [section, pattern] of [
  ['creditEvents', /FROM signal_credit_transactions/], ['live', /FROM live_nina_sessions/],
  ['credits', /FROM signal_credit_accounts/], ['purchases', /FROM signal_credit_purchases/],
  ['history', /FROM nina_analytics_sessions WHERE user_id/], ['qualification', /FROM nina_qualified_conversations/]
]) {
  test(`a failing ${section} read cannot hide a public user's saved transcript`, () => withFixture({ fail: sql => pattern.test(sql) }, async ({ env }) => {
    const detail = await getNinaAnalyticsSessionDetail(env, PUBLIC_CALL, NOW);
    assert.equal(detail.transcript.length, 5);
    assert.equal(detail.session.userId, 'public-a');
    assert.equal(detail.detailAvailability[section], false);
    assert.ok(detail.warnings.some(item => item.section === section && item.code === 'read_failed'));
    assert.ok(!JSON.stringify(detail.warnings).includes('private@'));
    if (section === 'qualification') { assert.equal(detail.qualified, null); assert.equal(detail.qualificationAvailable, false); }
  }));
}

test('missing optional qualification table remains unknown, not a negative event', () => withFixture({ drop: 'nina_qualified_conversations' }, async ({ env }) => {
  const detail = await getNinaAnalyticsSessionDetail(env, PUBLIC_CALL, NOW);
  assert.equal(detail.transcript.length, 5);
  assert.equal(detail.qualificationAvailable, false);
  assert.equal(detail.qualified, null);
  assert.deepEqual(detail.warnings, [{ section: 'qualification', code: 'schema_unavailable' }]);
}));

test('existing qualification record is read without changing it', () => withFixture({}, async ({ env, sqlite }) => {
  sqlite.prepare('INSERT INTO nina_qualified_conversations VALUES (?, ?, ?, ?, ?, ?)').run('public-a', 'conversation-public-a', 'live-public-a', 'synthetic-event', at(-410000), at(-400000));
  const detail = await getNinaAnalyticsSessionDetail(env, PUBLIC_CALL, NOW);
  assert.equal(detail.qualified, true);
  assert.equal(detail.metaSentAt, at(-400000));
}));

test('all supplementary reads can fail without losing a transcript', () => withFixture({ fail: sql => !sql.includes('WITH selected AS') && !sql.includes('FROM messages') }, async ({ env }) => {
  const detail = await getNinaAnalyticsSessionDetail(env, PUBLIC_CALL, NOW);
  assert.equal(detail.transcript.length, 5);
  assert.equal(detail.warnings.length, 5); // ledger is not queried when no live link is available
  assert.equal(detail.qualified, null);
}));

test('an essential transcript read error is not disguised as an empty conversation', () => withFixture({ fail: sql => sql.includes('SELECT role, content, created_at FROM messages') }, async ({ env }) => {
  await assert.rejects(getNinaAnalyticsSessionDetail(env, PUBLIC_CALL, NOW), /D1_ERROR/);
}));

test('invalid and missing call IDs return no detail; detail reads never write D1', () => withFixture({}, async ({ env, queries }) => {
  assert.equal(await getNinaAnalyticsSessionDetail(env, "x' OR 1=1--", NOW), null);
  assert.equal(queries.length, 0);
  assert.equal(await getNinaAnalyticsSessionDetail(env, '99999999-9999-4999-8999-999999999999', NOW), null);
  await getNinaAnalyticsSessionDetail(env, PUBLIC_CALL, NOW);
  assert.ok(queries.every(sql => /^\s*(?:SELECT|WITH)\b/.test(sql)));
}));

test('dashboard counts and detail transcript use the same authenticated memory identity', () => withFixture({}, async ({ env }) => {
  const [row] = await readAnalyticsCalls(env, PUBLIC_CALL);
  const detail = await getNinaAnalyticsSessionDetail(env, PUBLIC_CALL, NOW);
  assert.notEqual(row.visitor_id, row.message_visitor_id);
  assert.equal(Number(row.user_messages), detail.userMessages);
  assert.equal(Number(row.persona_messages), detail.ninaMessages);
}));

test('an ambiguous historical match stays unlinked rather than exposing a different call', () => withFixture({}, async ({ env, sqlite }) => {
  sqlite.prepare('INSERT INTO conversations VALUES (?, ?, ?, ?)').run('second-candidate', 'memory-public-a', at(-615000), at(-410000));
  const detail = await getNinaAnalyticsSessionDetail(env, PUBLIC_CALL, NOW);
  assert.equal(detail.session.transcriptMatch, 'ambiguous');
  assert.equal(detail.conversation, null);
  assert.equal(detail.userMessages, null);
  assert.deepEqual(detail.transcript, []);
}));

test('Berlin day boundary is preserved in summer, winter and DST transition', () => {
  assert.equal(berlinTodayStart(Date.parse('2026-09-09T00:30:00Z')), '2026-09-08T22:00:00.000Z');
  assert.equal(berlinTodayStart(Date.parse('2026-12-09T00:30:00Z')), '2026-12-08T23:00:00.000Z');
  assert.equal(berlinTodayStart(Date.parse('2026-10-25T12:00:00Z')), '2026-10-24T22:00:00.000Z');
});

const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
async function authFixture(origin) {
  const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', keys.publicKey);
  jwk.kid = 'admin-call-recovery';
  const issuer = 'https://admin-call-recovery.clerk.accounts.dev';
  return { issuer, jwk, async token(sub) {
    const now = Math.floor(Date.now() / 1000);
    const input = `${encode({ alg: 'RS256', typ: 'JWT', kid: jwk.kid })}.${encode({ iss: issuer, sub, azp: origin, iat: now, nbf: now, exp: now + 300 })}`;
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(input));
    return `${input}.${Buffer.from(sig).toString('base64url')}`;
  } };
}

test('API: owner-only access and CORS-safe failures for public call details', async () => {
  const { default: worker } = await import('../src/index.js');
  const origin = 'http://127.0.0.1:4173';
  const auth = await authFixture(origin);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => String(url).includes('/.well-known/jwks.json')
    ? new Response(JSON.stringify({ keys: [auth.jwk] })) : Promise.reject(new Error('Unexpected external request'));
  const good = fixture();
  const bad = fixture({ fail: sql => sql.includes('SELECT role, content, created_at FROM messages') });
  const partial = fixture({ fail: sql => sql.includes('FROM signal_credit_transactions') });
  const request = (token, f) => worker.fetch(new Request(`https://worker.example/api/nina/analytics/dashboard?session=${PUBLIC_CALL}`, {
    headers: { Origin: origin, ...(token ? { Authorization: 'Bearer ' + token } : {}) }
  }), { ...f.env, CLERK_ISSUER: auth.issuer }, { waitUntil() {} });
  try {
    assert.equal((await request(null, good)).status, 401);
    const regular = await request(await auth.token('public-a'), good);
    assert.equal(regular.status, 403);
    assert.ok(!(await regular.text()).includes('synthetic message'));
    const token = await auth.token('owner-a');
    const success = await request(token, good);
    assert.equal(success.status, 200);
    assert.equal((await success.json()).session.userId, 'public-a');
    const degraded = await request(token, partial);
    assert.equal(degraded.status, 200);
    assert.equal((await degraded.json()).transcript.length, 5);
    const failure = await request(token, bad);
    assert.equal(failure.status, 503);
    assert.equal(failure.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal(failure.headers.get('Cache-Control'), 'no-store');
    const body = await failure.json();
    assert.equal(body.code, 'call_detail_unavailable');
    assert.ok(!JSON.stringify(body).includes('private@'));
  } finally {
    globalThis.fetch = originalFetch;
    good.sqlite.close(); bad.sqlite.close(); partial.sqlite.close();
  }
});
