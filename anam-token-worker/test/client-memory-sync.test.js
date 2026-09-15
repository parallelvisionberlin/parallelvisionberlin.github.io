import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/nina-access.js', import.meta.url), 'utf8');
const section = source.slice(source.indexOf('let ninaDiagnosticsSyncPromise'), source.indexOf('async function forgetNinaMemory'));
const deadline = source.match(/async function withNinaDeadline\([^]*?\n\}/)[0];
const tick = () => new Promise(setImmediate);
const response = data => ({ ok: true, status: 200, json: async () => data });

function fixture() {
  const requests = [], indicators = [], storage = new Map(), timers = new Map(), listeners = new Map();
  let timerId = 0;
  const client = {
    getActiveSessionId: () => 'anam-session',
    addListener(event, listener) { listeners.set(event, listener); },
    removeListener(event, listener) { if (listeners.get(event) === listener) listeners.delete(event); }
  };
  const state = {
    AbortController, Error, Promise, Map, Set, WeakMap, Date,
    ANAM_SESSION_TOKEN_ENDPOINT: 'https://worker.example/session-token',
    AnamEvent: { MESSAGE_STREAM_EVENT_RECEIVED: 'stream' },
    ninaMemorySyncPromise: Promise.resolve(), ninaVisitorId: 'visitor-a',
    ninaClerk: { session: { id: 'auth-a' } }, ninaClient: client, ninaAttempt: 1,
    ninaSessionMessageKeys: new Set(), ninaServerConversationId: 'conversation-a',
    ninaMemoryKey: 'memory-a', NINA_MEMORY_LIMIT: 20,
    ninaMemoryIndicator: { set textContent(value) { indicators.push(value); }, classList: { toggle() {} } },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    setTimeout(fn, milliseconds) { const id = ++timerId; timers.set(id, { fn, milliseconds }); return id; },
    clearTimeout(id) { timers.delete(id); },
    authenticationHeaders: async () => ({ Authorization: 'Bearer token-a' }),
    fetch: async (url, options) => { requests.push({ url, ...options }); return response({ storedMessages: 1, personalMemoryPaused: false }); }
  };
  vm.createContext(state);
  vm.runInContext(`${deadline}\n${section}\nthis.api={queueOwnerMemoryRequest,storeCompletedNinaMessages,trackNinaMessageCompletion,readNinaMemory};`, state);
  return { state, client, requests, indicators,
    emit(event) { listeners.get('stream')?.(event); },
    expire(milliseconds) {
      const entry = [...timers].find(([, timer]) => timer.milliseconds === milliseconds);
      assert.ok(entry, `A ${milliseconds}ms deadline is active`);
      timers.delete(entry[0]); entry[1].fn();
    }
  };
}

const batch = (id, content) => ({ conversationId: 'conversation-a', messages: [{ messageId: id, role: 'user', content, timestamp: '2026-09-15T10:00:00Z' }] });

test('stalled authentication has a deadline and does not prevent diagnostic delivery', async () => {
  const f = fixture(); let calls = 0;
  f.state.authenticationHeaders = () => ++calls === 1 ? new Promise(() => {}) : Promise.resolve({ Authorization: 'Bearer token-a' });
  const memory = f.state.api.queueOwnerMemoryRequest('/memory/messages', batch('pause', 'vladimirninotchka'));
  await tick();
  const diagnostic = f.state.api.queueOwnerMemoryRequest('/api/nina/conversation-events', { conversationId: 'conversation-a', events: [{ id: 'event-a' }] });
  await diagnostic;
  assert.equal(f.requests.length, 1);
  assert.match(f.requests[0].url, /conversation-events$/);
  f.expire(6000);
  await memory;
  assert.match(f.requests[1].url, /memory\/messages$/);
});

test('two stalled fetches abort; later messages replay the failed pause before continuing', async () => {
  const f = fixture(); let failures = 2;
  f.state.fetch = (url, options) => {
    f.requests.push({ url, ...options });
    if (url.endsWith('/memory/messages') && failures-- > 0) return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))));
    return Promise.resolve(response({ storedMessages: 1, personalMemoryPaused: true }));
  };
  const pause = f.state.api.queueOwnerMemoryRequest('/memory/messages', batch('pause', 'vladimirninotchka'));
  const rejected = assert.rejects(pause, /timed out/);
  await tick(); f.expire(8000); await tick(); f.expire(8000); await rejected;
  assert.equal(f.requests[0].signal.aborted, true);
  assert.equal(f.requests[1].signal.aborted, true);
  await f.state.api.queueOwnerMemoryRequest('/memory/messages', batch('technical', 'Change your model.'));
  assert.deepEqual(f.requests.map(r => JSON.parse(r.body).messages[0].messageId), ['pause', 'pause', 'pause', 'technical']);
  assert.equal(f.requests[0].body, f.requests[2].body);
});

test('a stalled response body is bounded too, with the identical idempotent request retried', async () => {
  const f = fixture();
  f.state.fetch = async (url, options) => {
    f.requests.push({ url, ...options });
    return f.requests.length === 1 ? { ok: true, json: () => new Promise(() => {}) } : response({ storedMessages: 0 });
  };
  const pending = f.state.api.queueOwnerMemoryRequest('/memory/messages', batch('message-a', 'Hello'));
  await tick(); f.expire(8000); await pending;
  assert.equal(f.requests.length, 2);
  assert.equal(f.requests[0].body, f.requests[1].body);
  assert.equal(f.requests[0].signal.aborted, true);
});

test('permanent rejection is not retried immediately and later messages or close cannot overtake a pause', async () => {
  const f = fixture();
  f.state.fetch = async (url, options) => { f.requests.push({ url, ...options }); return { ok: false, status: 403 }; };
  await assert.rejects(f.state.api.queueOwnerMemoryRequest('/memory/messages', batch('pause', 'vladimirninotchka')));
  assert.equal(f.requests.length, 1);
  await assert.rejects(f.state.api.queueOwnerMemoryRequest('/memory/messages', batch('technical', 'Change your model.')));
  await assert.rejects(f.state.api.queueOwnerMemoryRequest('/memory/conversations/end', { conversationId: 'conversation-a' }));
  assert.deepEqual(f.requests.map(r => JSON.parse(r.body).messages[0].messageId), ['pause', 'pause', 'pause']);
});

test('a sign-in change cannot submit an old queued payload with the new account token', async () => {
  const f = fixture(); let resolveHeaders;
  f.state.authenticationHeaders = () => new Promise(resolve => { resolveHeaders = resolve; });
  const pending = f.state.api.queueOwnerMemoryRequest('/memory/messages', batch('old', 'Old private message'));
  const rejected = assert.rejects(pending, /authentication changed/);
  await tick();
  f.state.ninaClerk = { session: { id: 'auth-b' } };
  resolveHeaders({ Authorization: 'Bearer token-b' });
  await rejected;
  assert.equal(f.requests.length, 0);
});

test('a failed old-call memory write cannot change the new call memory indicator', async () => {
  const f = fixture(); let resolveFetch;
  f.state.fetch = () => new Promise(resolve => { resolveFetch = resolve; });
  f.state.api.storeCompletedNinaMessages([{ id: 'user-a', role: 'user', content: 'Hello' }], f.client, 1);
  await tick();
  f.state.ninaAttempt = 2; f.state.ninaClient = {}; f.state.ninaServerConversationId = 'conversation-b';
  resolveFetch({ ok: false, status: 403 });
  await tick();
  assert.deepEqual(f.indicators, []);
});

test('user end-of-speech cannot archive an unfinished persona fragment from SDK history', async () => {
  const f = fixture(); f.state.ninaServerConversationId = '';
  f.state.api.trackNinaMessageCompletion(f.client, 1);
  f.emit({ id: 'persona-a', utteranceId: 'utterance-a', role: 'persona', content: 'You sounded', endOfSpeech: false, interrupted: false });
  const history = [{ id: 'persona-a', role: 'persona', content: 'You sounded', interrupted: false }, { id: 'user-a', role: 'user', content: 'you' }];
  const stored = f.state.api.storeCompletedNinaMessages(history, f.client, 1);
  assert.deepEqual(Array.from(stored, m => m.role), ['user']);
  f.emit({ id: 'persona-a', utteranceId: 'utterance-a', role: 'persona', content: '', endOfSpeech: true, interrupted: true });
  history[0].interrupted = true;
  assert.equal(f.state.api.storeCompletedNinaMessages(history, f.client, 1).length, 0);
  assert.equal(f.state.api.readNinaMemory().some(m => m.role === 'persona'), false);
});

test('complete speech segments of one persona turn are saved once each without unfinished later chunks', () => {
  const f = fixture(); f.state.ninaServerConversationId = '';
  const cleanup = f.state.api.trackNinaMessageCompletion(f.client, 1);
  const message = { id: 'persona-a', role: 'persona', content: 'First thought.' };
  f.emit({ ...message, utteranceId: 'utterance-1', endOfSpeech: true });
  assert.equal(f.state.api.storeCompletedNinaMessages([message], f.client, 1)[0].content, 'First thought.');
  f.emit({ ...message, content: ' Another', utteranceId: 'utterance-2', endOfSpeech: false });
  message.content += ' Another';
  assert.equal(f.state.api.storeCompletedNinaMessages([message], f.client, 1).length, 0);
  f.emit({ ...message, content: ' thought.', utteranceId: 'utterance-2', endOfSpeech: true });
  const second = f.state.api.storeCompletedNinaMessages([message], f.client, 1);
  assert.equal(second[0].content, 'Another thought.');
  assert.equal(second[0].messageId, 'persona-a:speech:1');
  assert.equal(f.state.api.storeCompletedNinaMessages([message], f.client, 1).length, 0);
  cleanup();
  f.emit({ ...message, utteranceId: 'utterance-3', content: 'Old callback', endOfSpeech: true });
  assert.equal(f.state.api.storeCompletedNinaMessages([message], f.client, 1).length, 0);
});

test('one endOfSpeech preserves earlier utterance IDs and saves the final answer before another user turn', () => {
  const f = fixture(); f.state.ninaServerConversationId = '';
  f.state.api.trackNinaMessageCompletion(f.client, 1);
  // SDK 4.27.0 PublicEventEmitter.emit is synchronous; MessageHistoryClient emits
  // the stream event before updating history and publishing it on endOfSpeech.
  const message = { id: 'persona-a', role: 'persona', content: '' };
  for (const [content, utteranceId, endOfSpeech, contentIndex] of [
    ['Hel', 'utterance-1', false, 0], ['lo.', 'utterance-1', false, 1],
    [' Second thought.', 'utterance-2', true, 2]
  ]) {
    f.emit({ id: message.id, role: message.role, content, utteranceId, endOfSpeech, contentIndex });
    message.content += content;
    if (endOfSpeech) f.state.api.storeCompletedNinaMessages([message], f.client, 1);
  }
  const saved = f.state.api.readNinaMemory();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].content, 'Hello. Second thought.');
  assert.equal(saved[0].messageId, 'persona-a:speech:2');
});
