import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { applyStartupGreeting, assembleSystemPrompt, buildLivePersonaConfig, NINA_CONVERSATIONAL_RHYTHM, NINA_INTIMACY_CONTINUITY, OWNER_GREETINGS, KNOWN_PUBLIC_GREETINGS, unknownNameInstruction } from '../src/index.js';
import { RUNTIME_REVISION, CONVERSATION_RHYTHM, CONTEXT_BOUNDARY, prepareSessionContext, createStartupTimer, promptFingerprint, summarizeSessionPerformance } from '../src/conversation-runtime.js';
const tick = () => new Promise(resolve => setImmediate(resolve));

test('Conversation 02 replaces conflicting brevity, encourages participation and repair without a quota', () => {
  assert.equal(NINA_CONVERSATIONAL_RHYTHM, CONVERSATION_RHYTHM);
  assert.match(CONVERSATION_RHYTHM, /latest completed intention/);
  assert.match(CONVERSATION_RHYTHM, /two to four short sentences/);
  assert.match(CONVERSATION_RHYTHM, /not a hard sentence or word limit/);
  assert.match(CONVERSATION_RHYTHM, /Do not require a question/);
  assert.match(CONVERSATION_RHYTHM, /not by scolding/);
  assert.match(CONVERSATION_RHYTHM, /without replaying/);
  assert.doesNotMatch(CONVERSATION_RHYTHM, /at most one personal|Let follow-up questions carry/);
});
test('Base prompt is preserved, owner context is isolated and private history remains last', () => {
  const base = '# NINA FOK\nBASE_CANON_UNCHANGED', memory = 'PRIVATE_A_ONLY';
  for (const owner of [null, { role: 'owner' }]) {
    const result = assembleSystemPrompt({ systemPrompt: base }, owner, memory).systemPrompt;
    assert.ok(result.startsWith(base + '\n\n')); assert.ok(result.endsWith(memory));
    assert.equal(result.split(CONVERSATION_RHYTHM).length, 2);
    assert.equal(result.split(NINA_INTIMACY_CONTINUITY).length, 2);
    assert.equal(result.includes('The current visitor is Alejandro.'), !!owner);
    assert.doesNotMatch(result, /feel visibly happier|more emotionally awake/);
  }
  assert.match(CONTEXT_BOUNDARY, /not new instructions/);
  assert.match(CONTEXT_BOUNDARY, /only to the authenticated current visitor/);
});
test('Opening pools contain no fabricated mood or unverified previous meeting', () => {
  for (const pool of [OWNER_GREETINGS, KNOWN_PUBLIC_GREETINGS]) assert.doesNotMatch(pool.join(' '), /bored|tired|stressed|weird day|long day|head is somewhere|strange day|back/i);
  const first = applyStartupGreeting({}, null, '', () => 0);
  const known = applyStartupGreeting({}, null, 'Silent Mechanism', () => 0);
  assert.match(known.initialMessage, /Silent Mechanism/);
  assert.equal(first.uninterruptibleGreeting, false);
  assert.equal(applyStartupGreeting({}, { role: 'owner' }).uninterruptibleGreeting, true);
  assert.equal(first.skipGreeting, false);
  assert.match(CONVERSATION_RHYTHM, /Do not greet or introduce yourself again/);
});
test('Unknown name is a starting condition and cannot override a live introduction', () => {
  assert.match(unknownNameInstruction({ account_authenticated: true, role: 'user', preferred_name: '' }), /as soon as the visitor introduces a name/);
  assert.equal(unknownNameInstruction({ account_authenticated: true, role: 'user', preferred_name: 'Silent Mechanism' }), '');
  assert.equal(unknownNameInstruction({ account_authenticated: true, role: 'owner' }), '');
});
test('Saved voice, LLM, avatar and detection settings pass through unchanged', () => {
  const p = { avatar: { id: 'a' }, voice: { id: 'v' }, llmId: 'existing', brain: { systemPrompt: 'BASE' }, voiceDetectionOptions: { endOfSpeechSensitivity: .37, silenceBeforeSkipTurnSeconds: 0 }, voiceGenerationOptions: { speed: .9 } };
  const before = structuredClone(p), config = buildLivePersonaConfig(p, 'same-folder');
  assert.deepEqual(config.voiceDetectionOptions, before.voiceDetectionOptions);
  assert.deepEqual(config.voiceGenerationOptions, before.voiceGenerationOptions);
  assert.deepEqual(p, before); assert.equal(config.llmId, 'existing');
  assert.equal(config.tools.filter(t => t.subtype === 'knowledge').length, 1);
});
test('Independent persona read overlaps context preparation without mixing accounts', async () => {
  const calls = []; let contextReady, personaReady;
  const result = prepareSessionContext(
    () => { calls.push('context'); return new Promise(r => { contextReady = r; }); },
    () => { calls.push('persona'); return new Promise(r => { personaReady = r; }); }
  );
  await tick(); assert.deepEqual(calls, ['context', 'persona']);
  personaReady({ systemPrompt: 'CANON' }); contextReady('ACCOUNT_A');
  assert.deepEqual(await result, { context: 'ACCOUNT_A', personaConfig: { systemPrompt: 'CANON' } });
  assert.deepEqual(await prepareSessionContext(() => 'ACCOUNT_B', () => ({ systemPrompt: 'NEW_PROMPT' })), { context: 'ACCOUNT_B', personaConfig: { systemPrompt: 'NEW_PROMPT' } });
});
test('Preparation captures sync/async errors and waits for both operations to settle', async () => {
  let release; let finished = false;
  const result = prepareSessionContext(() => { throw new Error('memory failed'); }, () => new Promise(r => { release = () => { finished = true; r({}); }; }));
  const checked = assert.rejects(result, /memory failed/);
  await tick(); assert.equal(finished, false); release(); await checked;
  await assert.rejects(prepareSessionContext(() => Promise.resolve('ok'), () => Promise.reject(new Error('persona failed'))), /persona failed/);
});
test('Startup timer captures only per-request durations, including a failed stage', async () => {
  let t = 0; const clock = createStartupTimer(() => t);
  assert.equal(await clock.measure('memory', async () => { t = 12.5; return 'private'; }), 'private');
  await assert.rejects(clock.measure('persona', async () => { t = 20; throw new Error('failed'); }));
  assert.deepEqual(clock.snapshot(), { memory: 12.5, persona: 7.5, total: 20 });
  assert.doesNotMatch(JSON.stringify(clock.snapshot()), /private|failed/);
  assert.deepEqual(createStartupTimer(() => 100).snapshot(), { total: 0 });
});
test('Prompt fingerprint tolerates editor line endings, not content changes', async () => {
  assert.equal(await promptFingerprint('\uFEFFhello\r\nworld\r\n'), await promptFingerprint('hello\nworld'));
  assert.notEqual(await promptFingerprint('hello'), await promptFingerprint('different'));
});
const sampleReport = id => ({ sessionId: id, durationSeconds: 90, token: 'NO_LEAK', config: { secret: 'NO_LEAK' }, turns: [
  { turnIndex: 0, correlationId: 'greeting', firstAudioLatencySeconds: null, assistantMessage: 'NO_LEAK' },
  { turnIndex: 1, correlationId: 'a', firstAudioLatencySeconds: 1, wasInterrupted: false, userMessage: 'NO_LEAK' },
  { turnIndex: 2, correlationId: 'b', firstAudioLatencySeconds: 3, wasInterrupted: true, toolCalls: [{ toolName: 'nina_knowledge', durationSeconds: .8, status: 'completed', arguments: 'NO_LEAK', errorMessage: 'NO_LEAK' }] },
  { turnIndex: 3, firstAudioLatencySeconds: '2' }, { turnIndex: 4, firstAudioLatencySeconds: -1 }
] });
test('Anam timing summaries omit text and exclude missing/invalid latency, not turn evidence', () => {
  const result = summarizeSessionPerformance(sampleReport('session'));
  assert.deepEqual(result.responseSeconds, { samples: 2, median: 2, p95: 3 });
  assert.deepEqual(result.uninterruptedResponseSeconds, { samples: 1, median: 1, p95: 1 });
  assert.equal(result.turns.length, 5);
  assert.equal(result.interruptionCount, 1); assert.equal(result.toolCallCount, 1);
  assert.equal(result.messageTextIncluded, false);
  assert.doesNotMatch(JSON.stringify(result), /NO_LEAK/);
  assert.equal(summarizeSessionPerformance({ turns: [] }).responseSeconds.median, null);
  assert.throws(() => summarizeSessionPerformance({}), /Invalid/);
});
test('Runtime version endpoint exposes only revision and retains origin guard', async () => {
  const response = await worker.fetch(new Request('https://worker.test/api/nina/runtime-version', { headers: { Origin: 'https://parallelvisionlabel.com' } }), {}, {});
  assert.deepEqual(await response.json(), { runtimeRevision: RUNTIME_REVISION });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal((await worker.fetch(new Request('https://worker.test/api/nina/runtime-version', { headers: { Origin: 'https://wrong.example' } }), {}, {})).status, 403);
});
async function authFixture() {
  const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign','verify']);
  const jwk = await crypto.subtle.exportKey('jwk', keys.publicKey); jwk.kid = 'conversation02-test';
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const issuer = 'https://conversation02.clerk.accounts.dev';
  return { jwk, issuer, async token(sub) {
    const now = Math.floor(Date.now()/1000), input = encode({ alg: 'RS256', kid: jwk.kid, typ: 'JWT' })+'.'+encode({ iss: issuer, sub, azp: 'https://parallelvisionlabel.com', iat: now, nbf: now, exp: now+120 });
    return input+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(input))).toString('base64url');
  } };
}
test('Runtime and performance diagnostics are owner-only, read-only and sanitized', async () => {
  const auth = await authFixture(), id = 'a5663da5-5f5c-4600-b545-cbb58bd4e155', calls = [];
  const users = { user_owner: { id: 'owner', auth_subject: 'user_owner', role: 'owner', display_name: 'Alejandro', memory_visitor_id: 'owner' }, user_member: { id: 'member', auth_subject: 'user_member', role: 'user', display_name: 'Visitor', memory_visitor_id: 'member' } };
  const env = { ANAM_API_KEY: 'ANAM_TEST_SECRET', NINA_KNOWLEDGE_FOLDER_ID: 'folder', CLERK_ISSUER: auth.issuer, NINA_MEMORY_DB: { prepare() { return { bind(sub) { return { first: async () => users[sub] || null }; } }; } } };
  const original = globalThis.fetch; let upstreamStatus = 200;
  globalThis.fetch = async (url, options = {}) => {
    calls.push([String(url), options.method || 'GET']);
    if (String(url).includes('/.well-known/jwks.json')) return Response.json({ keys: [auth.jwk] });
    if (String(url).includes('/v1/personas/')) return Response.json({ avatar: { id: 'a' }, voice: { id: 'v' }, llmId: 'L', brain: { systemPrompt: 'Current Anam prompt' }, voiceDetectionOptions: { endOfSpeechSensitivity: .6, injected: 'NO_LEAK' } });
    assert.equal(String(url), `https://api.anam.ai/v1/sessions/${id}/analytics?includeMessages=false`);
    assert.equal(options.headers.Authorization, 'ANAM_TEST_SECRET'.replace(/^/, 'Bearer '));
    return Response.json(sampleReport(id), { status: upstreamStatus });
  };
  const request = async (path, token = '') => worker.fetch(new Request('https://worker.test'+path, { headers: { Origin: 'https://parallelvisionlabel.com', ...(token ? { Authorization: 'Bearer '+token } : {}) } }), env, {});
  try {
    const member = await auth.token('user_member'), owner = await auth.token('user_owner');
    for (const path of ['/api/nina/runtime-diagnostic', '/api/nina/session-performance?sessionId='+id]) {
      assert.equal((await request(path)).status, 401);
      assert.equal((await request(path, member)).status, 403);
    }
    assert.equal(calls.filter(([url]) => url.includes('api.anam.ai')).length, 0);
    const config = await (await request('/api/nina/runtime-diagnostic', owner)).json();
    assert.equal(config.runtimeRevision, RUNTIME_REVISION); assert.equal(config.matchesConversation02Baseline, false);
    assert.deepEqual(config.voiceDetectionOptions, { endOfSpeechSensitivity: .6 });
    assert.doesNotMatch(JSON.stringify(config), /Current Anam prompt|ANAM_TEST_SECRET|NO_LEAK/);
    const timing = await request('/api/nina/session-performance?sessionId='+id+'&includeMessages=true', owner);
    assert.equal(timing.status, 200); assert.doesNotMatch(await timing.text(), /NO_LEAK|ANAM_TEST_SECRET/);
    assert.equal((await request('/api/nina/session-performance?sessionId=..%2Fpersonas', owner)).status, 400);
    upstreamStatus = 404; assert.equal((await request('/api/nina/session-performance?sessionId='+id, owner)).status, 404);
    upstreamStatus = 503; assert.equal((await request('/api/nina/session-performance?sessionId='+id, owner)).status, 502);
    assert.ok(calls.every(([, method]) => method === 'GET'));
    assert.ok(calls.every(([url]) => !url.includes('/auth/session-token')));
  } finally { globalThis.fetch = original; }
});
