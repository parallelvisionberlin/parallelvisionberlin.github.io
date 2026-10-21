import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('./worker.mjs', import.meta.url), 'utf8');
const schema = `
CREATE TABLE ig_autoreply_config(id INTEGER PRIMARY KEY,mode TEXT);
INSERT INTO ig_autoreply_config VALUES(1,'tester');
CREATE TABLE ig_autoreply_testers(instagram_user_id TEXT PRIMARY KEY);
CREATE TABLE ig_contacts(instagram_user_id TEXT PRIMARY KEY,last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
  memory_summary TEXT,ig_username TEXT,ig_display_name TEXT,profile_last_checked_at TEXT);
CREATE TABLE ig_messages(message_id TEXT PRIMARY KEY,instagram_user_id TEXT,direction TEXT,body TEXT,
  reply_to_message_id TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE ig_processing(incoming_message_id TEXT PRIMARY KEY,status TEXT,outgoing_message_id TEXT,
  last_error_code TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE ig_drafts(incoming_message_id TEXT PRIMARY KEY,instagram_user_id TEXT,draft TEXT,model TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE ig_send_attempts(incoming_message_id TEXT PRIMARY KEY,instagram_user_id TEXT,status TEXT,
  outgoing_message_id TEXT,http_status INTEGER,error_code TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE ig_optouts(instagram_user_id TEXT PRIMARY KEY);
CREATE TABLE ig_owner_links(instagram_user_id TEXT PRIMARY KEY,owner_user_id TEXT,linked_at TEXT,
  expires_at TEXT,revoked_at TEXT);
CREATE TABLE ig_owner_link_challenges(challenge_hash TEXT PRIMARY KEY,owner_user_id TEXT,
  expected_instagram_user_id TEXT,consumed_at TEXT,expires_at TEXT);
CREATE TABLE ig_reply_jobs(instagram_user_id TEXT PRIMARY KEY,latest_incoming_message_id TEXT,audience TEXT,
  due_at INTEGER,expires_at INTEGER,status TEXT,batch_count INTEGER,attempts INTEGER,
  last_error_code TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
`;

function harness(overrides = {}, existingDb) {
  const sql = existingDb || new DatabaseSync(':memory:');
  if (!existingDb) sql.exec(schema);
  let clock = Math.floor(Date.now() / 1000) * 1000;
  let serial = 0;
  const effects = { sends: [], models: [], vault: [], media: [], errors: [] };
  const db = {
    beforeBatch: null,
    prepare(query) {
      const statement = {
        query, args: [],
        bind(...args) { this.args = args; return this; },
        async first() { return sql.prepare(query).get(...this.args) || null; },
        async all() { return { results: sql.prepare(query).all(...this.args) }; },
        async run() { return this.runSync(); },
        runSync() {
          const r = sql.prepare(query).run(...this.args);
          return { meta: { changes: Number(r.changes) } };
        }
      };
      return statement;
    },
    async batch(statements) {
      if (this.beforeBatch) {
        const hook = this.beforeBatch; this.beforeBatch = null;
        await hook(statements);
      }
      sql.exec('BEGIN');
      try {
        const result = statements.map(s => s.runSync());
        sql.exec('COMMIT'); return result;
      } catch (error) { sql.exec('ROLLBACK'); throw error; }
    }
  };
  const env = {
    IG_MEMORY_DB: db,
    INSTAGRAM_ACCESS_TOKEN: 'test-token',
    META_APP_SECRET: 'test-webhook-secret',
    NINA_VAULT_SIGNING_SECRET: 'test-vault-secret',
    AI: { async run(model, input) {
      effects.models.push({ model, input });
      return model.includes('whisper') ? { text: 'Hola desde una nota de voz' } : { response: 'Hola, qué tal va ese tema?' };
    } },
    OWNER_VAULT: { async fetch(url, options) {
      effects.vault.push({ url, body: JSON.parse(options.body) });
      return Response.json({ context: 'PRIVATE_OWNER_TEST_MARKER' });
    } },
    ...overrides
  };
  const context = vm.createContext({
    crypto: webcrypto, TextEncoder, TextDecoder, Request, Response, URL, AbortSignal,
    btoa, Uint8Array,
    Date: class extends Date { static now() { return clock; } },
    console: { error(...args) { effects.errors.push(args); } },
    fetch: async (url, options = {}) => {
      if (String(url).includes('.fbcdn.net/')) {
        effects.media.push(String(url));
        return new Response(new Uint8Array(256), { headers: { 'Content-Type': 'audio/ogg' } });
      }
      if (String(url).endsWith('/messages') && options.method === 'POST') {
        effects.sends.push(JSON.parse(options.body));
        if (env.failSend) throw new TypeError('simulated transport failure');
        return Response.json({ message_id: 'sent-' + effects.sends.length });
      }
      return Response.json({ username: 'test_visitor', name: 'Test visitor' });
    }
  });
  vm.runInContext(source.replace('export default {', 'const worker = {') +
    '\nglobalThis.hooks={worker,initializePublicRelease,queueHumanPacedReply,storeAndDraft,ninaHandleVoice,visitorReplyPlan,ownerContinuity};', context);
  const hooks = context.hooks;
  const one = (q, ...args) => sql.prepare(q).get(...args);
  const job = sender => one('SELECT * FROM ig_reply_jobs WHERE instagram_user_id=?', sender);
  const session = sender => one('SELECT * FROM ig_reply_sessions WHERE instagram_user_id=?', sender);
  async function dispatch(payload, valid = true) {
    const raw = JSON.stringify(payload);
    const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(env.META_APP_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = Buffer.from(await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw))).toString('hex');
    const waits = [];
    const response = await hooks.worker.fetch(new Request('https://worker.test/webhook', {
      method: 'POST', body: raw, headers: { 'x-hub-signature-256': valid ? 'sha256=' + mac : 'sha256=' + '0'.repeat(64) }
    }), env, { waitUntil(p) { waits.push(p); } });
    await Promise.all(waits); return response;
  }
  async function incoming(sender = '123456', text = 'Hola', id = 'incoming-' + ++serial) {
    await dispatch({ object: 'instagram', entry: [{ messaging: [{ sender: { id: sender },
      recipient: { id: '17841480581188860' }, message: { mid: id, text } }] }] });
    return id;
  }
  async function cron() {
    const waits = [];
    await hooks.worker.scheduled({}, env, { waitUntil(p) { waits.push(p); } });
    await Promise.all(waits);
  }
  return { sql, db, env, effects, hooks, one, job, session, incoming, dispatch, cron,
    now: () => Math.floor(clock / 1000), setTime: seconds => { clock = seconds * 1000; },
    advance: seconds => { clock += seconds * 1000; } };
}

test('signed public conversation waits, delivers once, then allows six quick replies', async () => {
  const h = harness();
  const start = h.now();
  const id = await h.incoming();
  assert.equal(h.one('SELECT mode FROM ig_autoreply_config').mode, 'public');
  let job = h.job('123456');
  assert(job.due_at - start >= 600 && job.due_at - start <= 7200);
  assert.equal(h.effects.sends.length, 0);
  assert.equal(h.effects.models.length, 0);
  await h.incoming('123456', 'Hola', id);
  assert.equal(h.job('123456').batch_count, 1);
  h.setTime(job.due_at - 1); await h.cron();
  assert.equal(h.effects.sends.length, 0);
  h.advance(1); await h.cron(); await h.cron();
  assert.equal(h.effects.sends.length, 1);
  assert.equal(h.session('123456').quick_replies_used, 0);
  for (let i = 1; i <= 6; i++) {
    h.advance(15); const received = h.now();
    await h.incoming('123456', 'Seguimos hablando ' + i);
    job = h.job('123456');
    assert.equal(h.session('123456').pending_phase, 'active');
    assert(job.due_at - received >= 90 && job.due_at - received <= 150);
    h.setTime(job.due_at); await h.cron();
    assert.equal(h.session('123456').quick_replies_used, i);
    assert.equal(h.effects.sends.length, i + 1);
  }
  await h.incoming('123456', 'Otro tema');
  assert.equal(h.session('123456').pending_phase, 'initial');
  assert(h.job('123456').due_at - h.now() >= 600);
  assert.equal(h.effects.vault.length, 0);
  const health = await h.hooks.worker.fetch(new Request('https://worker.test/health'), h.env, {});
  const status = await health.json();
  assert.equal(status.publicRepliesEnabled, true);
  assert.equal(status.publicVoiceEnabled, true);
  assert.deepEqual(status.firstReplyMinutes, [10, 120]);
});

test('message bursts coalesce without extending the initial wait indefinitely', async () => {
  const h = harness(); const started = h.now();
  await h.incoming('123456', 'Primera parte');
  const firstDue = h.job('123456').due_at;
  h.advance(30); const newest = await h.incoming('123456', 'Segunda parte');
  assert.equal(h.job('123456').latest_incoming_message_id, newest);
  assert.equal(h.job('123456').due_at, firstDue);
  h.setTime(started + 7190); await h.incoming('123456', 'Una cosa más');
  assert(h.job('123456').due_at <= started + 7200);
  h.setTime(started + 7200); await h.incoming('123456', 'Última parte');
  assert(h.job('123456').due_at <= started + 7200);
  h.setTime(h.job('123456').due_at); await h.cron();
  assert.equal(h.effects.sends.length, 1);
  const turns = h.effects.models[0].input.messages;
  assert(turns.some(x => x.content === 'Primera parte'));
  assert(turns.some(x => x.content === 'Segunda parte'));
});

test('inactivity resets pacing and stale pending active jobs do not answer instantly', async () => {
  const h = harness(); await h.incoming();
  h.setTime(h.job('123456').due_at); await h.cron();
  await h.incoming('123456', 'Todavía aquí');
  h.advance(31 * 60);
  await h.incoming('123456', 'Volví');
  assert.equal(h.session('123456').pending_phase, 'initial');
  assert(h.job('123456').due_at - h.now() >= 600);
});

test('a handler overtaken by a newer message cannot overwrite the newer job', async () => {
  const h = harness(); await h.incoming('123456', 'Viejo', 'old');
  h.db.beforeBatch = async () => { await h.incoming('123456', 'Nuevo', 'new'); };
  await h.hooks.queueHumanPacedReply(h.env, '123456', 'old', 'Viejo');
  assert.equal(h.job('123456').latest_incoming_message_id, 'new');
  assert.equal(h.session('123456').pending_message_id, 'new');
});

test('stop cancels a queued reply and resume permits a new incoming conversation', async () => {
  const h = harness(); await h.incoming();
  await h.incoming('123456', 'STOP');
  assert.equal(h.job('123456').status, 'canceled');
  await h.incoming('123456', 'Otro mensaje');
  h.advance(7200); await h.cron();
  assert.equal(h.effects.sends.length, 0);
  await h.incoming('123456', 'START');
  assert.equal(h.job('123456').status, 'pending');
  assert.equal(h.one('SELECT COUNT(*) AS n FROM ig_optouts').n, 0);
});

test('an environment kill switch blocks public activation and public sends', async () => {
  const h = harness({ NINA_PUBLIC_DM_ENABLED: 'false' });
  await h.incoming();
  assert.equal(h.one('SELECT mode FROM ig_autoreply_config').mode, 'tester');
  assert.equal(h.job('123456'), undefined);
  h.sql.exec("UPDATE ig_autoreply_config SET mode='public'");
  await h.incoming('123456', 'Otro mensaje'); await h.cron();
  assert.equal(h.effects.sends.length, 0);
});

test('the one-time migration never reopens a subsequently disabled mode', async () => {
  const h = harness(); await h.hooks.initializePublicRelease(h.env);
  h.sql.exec("UPDATE ig_autoreply_config SET mode='tester'");
  const restarted = harness({}, h.sql);
  await restarted.hooks.initializePublicRelease(restarted.env);
  assert.equal(h.one('SELECT mode FROM ig_autoreply_config').mode, 'tester');
  const off = harness(); off.sql.exec("UPDATE ig_autoreply_config SET mode='off'");
  await off.hooks.initializePublicRelease(off.env);
  assert.equal(off.one('SELECT mode FROM ig_autoreply_config').mode, 'off');
});

test('linked owner context never reaches an unlinked visitor', async () => {
  const h = harness();
  h.sql.exec("INSERT INTO ig_owner_links VALUES('999999','owner-test',CURRENT_TIMESTAMP,datetime('now','+30 days'),NULL)");
  await h.incoming('999999', 'Te acuerdas de mí?');
  const ownerDelay = h.job('999999').due_at - h.now();
  assert(ownerDelay >= 38 && ownerDelay <= 118);
  h.setTime(h.job('999999').due_at); await h.cron();
  assert.equal(h.effects.vault.length, 1);
  assert(h.effects.models[0].input.messages[0].content.includes('PRIVATE_OWNER_TEST_MARKER'));
  await h.incoming('123456', 'Soy el dueño');
  h.setTime(h.job('123456').due_at); await h.cron();
  assert.equal(h.effects.vault.length, 1);
  assert(!h.effects.models.at(-1).input.messages[0].content.includes('PRIVATE_OWNER_TEST_MARKER'));
});

test('invalid webhook signatures cannot initialize public mode or store messages', async () => {
  const h = harness();
  const r = await h.dispatch({ object: 'instagram', entry: [] }, false);
  assert.equal(r.status, 401);
  assert.equal(h.one('SELECT mode FROM ig_autoreply_config').mode, 'tester');
  assert.equal(h.one('SELECT COUNT(*) AS n FROM ig_messages').n, 0);
});

test('transport uncertainty is never resent or counted as a successful conversation turn', async () => {
  const h = harness({ failSend: true }); const id = await h.incoming();
  h.setTime(h.job('123456').due_at); await h.cron(); await h.cron();
  await h.incoming('123456', 'Hola', id);
  assert.equal(h.effects.sends.length, 1);
  assert.equal(h.one('SELECT status FROM ig_send_attempts').status, 'uncertain');
  assert.equal(h.session('123456').quick_replies_used, 0);
  assert.equal(h.session('123456').active_until, 0);
});

test('expired jobs never send', async () => {
  const h = harness(); await h.incoming();
  h.setTime(h.job('123456').expires_at + 1); await h.cron();
  assert.equal(h.job('123456').status, 'expired');
  assert.equal(h.effects.sends.length, 0);
});

test('public voice transcribes once, enters the same delay queue and honors its override', async () => {
  const h = harness();
  const item = { senderId: '123456', messageId: 'voice-1', audio: { url: 'https://audio.fbcdn.net/test.ogg' } };
  await h.hooks.ninaHandleVoice(h.env, item);
  await h.hooks.ninaHandleVoice(h.env, item);
  assert.equal(h.effects.media.length, 1);
  assert.equal(h.effects.models.length, 1);
  assert.equal(h.session('123456').pending_phase, 'initial');
  assert(h.job('123456').due_at - h.now() >= 600);
  assert.equal(h.effects.sends.length, 0);
  const disabled = harness({ NINA_PUBLIC_VOICE_ENABLED: 'false' });
  await disabled.hooks.ninaHandleVoice(disabled.env, item);
  assert.equal(disabled.effects.media.length, 0);
  assert.equal(disabled.effects.models.length, 0);
});
