import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  enqueueMemoryJob, processMemoryJob, drainMemoryJobs, memoryJobStatus,
  memoryRetryDelay, MEMORY_JOB_LEASE_MS, MEMORY_JOB_RETRY_BASE_MS, MEMORY_JOB_RETRY_MAX_MS, MEMORY_JOBS_PER_TICK
} from '../src/memory-jobs.js';
import { scheduleCompletedMemoryConsolidation } from '../src/index.js';

const baseTime = Date.parse('2026-09-13T10:00:00.000Z');
const iso = value => new Date(value).toISOString();
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function fixture(t, people = ['a', 'b']) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  for (const file of readdirSync(new URL('../migrations/', import.meta.url)).filter(file => file.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  }
  const db = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async first() { return sqlite.prepare(sql).get(...values) || null; },
        async all() { return { results: sqlite.prepare(sql).all(...values) }; },
        async run() { return { meta: sqlite.prepare(sql).run(...values) }; }
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    }
  };
  for (const person of people) {
    sqlite.prepare("INSERT INTO visitors VALUES (?,?,'visitor',?,?)").run(person, person, iso(baseTime), iso(baseTime));
    sqlite.prepare("INSERT INTO users (id,auth_provider,auth_subject,display_name,role,memory_visitor_id,created_at,updated_at) VALUES (?,'clerk',?,?,'user',?,?,?)")
      .run(person, `user_${person}`, person, person, iso(baseTime), iso(baseTime));
    sqlite.prepare('INSERT INTO conversations VALUES (?,?,?,?)').run(`call-${person}`, person, iso(baseTime - 60000), iso(baseTime));
    sqlite.prepare("INSERT INTO messages VALUES (?,?,?,'user',?,?)").run(`message-${person}`, `call-${person}`, person, 'Synthetic private preference', iso(baseTime - 10000));
  }
  return {
    sqlite, env: { NINA_MEMORY_DB: db },
    identity: person => ({ user_id: person, visitor_id: person, account_authenticated: true }),
    job: person => sqlite.prepare('SELECT * FROM nina_memory_jobs WHERE visitor_id=?').get(person),
    enqueue(person, options = {}) { return enqueueMemoryJob({ NINA_MEMORY_DB: db }, this.identity(person), { now: baseTime, ...options }); }
  };
}

test('queue requires the authenticated account and a closed conversation belonging to it', async t => {
  const f = fixture(t);
  assert.equal((await enqueueMemoryJob(f.env, { ...f.identity('a'), account_authenticated: false })).queued, false);
  assert.equal((await enqueueMemoryJob(f.env, { ...f.identity('a'), visitor_id: 'b' })).queued, false);
  assert.equal((await f.enqueue('a', { conversationId: 'call-b' })).queued, false);
  f.sqlite.prepare('UPDATE conversations SET ended_at=NULL WHERE conversation_id=?').run('call-a');
  assert.equal((await f.enqueue('a')).queued, false);
  f.sqlite.prepare('UPDATE conversations SET ended_at=? WHERE conversation_id=?').run(iso(baseTime), 'call-a');
  assert.equal((await f.enqueue('a')).queued, true);
  assert.equal(f.job('a').status, 'queued');
  assert.equal(f.job('b'), undefined);
});

test('a durable queued request survives until one exclusive worker claims it', async t => {
  const f = fixture(t);
  await f.enqueue('a');
  const entered = deferred(), release = deferred();
  let calls = 0;
  const consolidator = async (_env, visitor, options) => {
    calls++;
    assert.equal(visitor, 'a');
    assert.equal(options.memoryJobLease, f.job('a').lease_token);
    entered.resolve();
    await release.promise;
    return { consolidated: true, summarizedThrough: 'message-a', messageCount: 1, pinnedCount: 1, journalCount: 1 };
  };
  const first = processMemoryJob(f.env, 'a', { consolidator, clock: () => baseTime });
  await entered.promise;
  assert.deepEqual(await processMemoryJob(f.env, 'a', { consolidator, clock: () => baseTime }), { processed: false, reason: 'not_due' });
  release.resolve();
  assert.equal((await first).consolidated, true);
  assert.equal(calls, 1);
  const job = f.job('a');
  assert.equal(job.status, 'complete');
  assert.equal(job.attempts, 1);
  assert.equal(job.last_cursor, 'message-a');
  assert.equal(job.last_pinned_count, 1);
  assert.equal(job.last_journal_count, 1);
  assert.equal(job.lease_token, null);
});

test('invalid extraction is visible and retried with bounded backoff without advancing the cursor', async t => {
  const f = fixture(t);
  await f.enqueue('a');
  const invalid = async () => ({ consolidated: false, reason: 'invalid_extraction' });
  await processMemoryJob(f.env, 'a', { consolidator: invalid, clock: () => baseTime });
  assert.equal(f.job('a').status, 'invalid_extraction');
  assert.equal(f.job('a').last_error_code, 'invalid_extraction');
  assert.equal(f.job('a').last_cursor, null);
  assert.equal(f.job('a').next_attempt_at, iso(baseTime + MEMORY_JOB_RETRY_BASE_MS));
  assert.equal((await processMemoryJob(f.env, 'a', { consolidator: invalid, clock: () => baseTime + 1 })).reason, 'not_due');
  await processMemoryJob(f.env, 'a', { consolidator: async () => ({ consolidated: true }), clock: () => baseTime + MEMORY_JOB_RETRY_BASE_MS });
  assert.equal(f.job('a').status, 'complete');
  assert.equal(f.job('a').consecutive_failures, 0);
  assert.equal(f.job('a').last_error_code, null);
  assert.equal(f.job('a').attempts, 2);
  assert.equal(memoryRetryDelay(20), MEMORY_JOB_RETRY_MAX_MS);
});

test('provider errors retain only a fixed error code', async t => {
  const f = fixture(t);
  await f.enqueue('a');
  const result = await processMemoryJob(f.env, 'a', {
    clock: () => baseTime,
    consolidator: async () => { throw new Error('private transcript or provider credential must never persist'); }
  });
  assert.equal(result.reason, 'execution_failed');
  assert.equal(f.job('a').status, 'error');
  assert.equal(f.job('a').last_error_code, 'execution_failed');
  assert.doesNotMatch(JSON.stringify(f.job('a')), /private transcript|credential/);
});

test('an expired lease is reclaimed and the earlier worker cannot overwrite retry status', async t => {
  const f = fixture(t);
  await f.enqueue('a');
  const entered = deferred(), release = deferred();
  let now = baseTime;
  const first = processMemoryJob(f.env, 'a', { clock: () => now, consolidator: async () => {
    entered.resolve(); await release.promise; return { consolidated: false, reason: 'invalid_extraction' };
  } });
  await entered.promise;
  const oldToken = f.job('a').lease_token;
  now += MEMORY_JOB_LEASE_MS + 1;
  await processMemoryJob(f.env, 'a', { clock: () => now, consolidator: async (_env, _visitor, options) => {
    assert.notEqual(options.memoryJobLease, oldToken);
    return { consolidated: true };
  } });
  release.resolve();
  assert.equal((await first).reason, 'lease_lost');
  assert.equal(f.job('a').status, 'complete');
  assert.equal(f.job('a').attempts, 2);
});

test('another close during extraction and additional batches remain queued', async t => {
  const f = fixture(t);
  await f.enqueue('a');
  await processMemoryJob(f.env, 'a', { clock: () => baseTime, consolidator: async () => {
    await f.enqueue('a');
    assert.equal(f.job('a').status, 'running');
    return { consolidated: true };
  } });
  assert.equal(f.job('a').status, 'queued');
  assert.equal(f.job('a').requested_generation, 2);
  assert.equal(f.job('a').processed_generation, 1);
  await processMemoryJob(f.env, 'a', { clock: () => baseTime, consolidator: async () => ({ consolidated: true, hasMore: true }) });
  assert.equal(f.job('a').status, 'queued');
  await processMemoryJob(f.env, 'a', { clock: () => baseTime, consolidator: async () => ({ consolidated: false, reason: 'no_messages' }) });
  assert.equal(f.job('a').status, 'complete');
});

test('cron is bounded and never discovers or replays unqueued private history', async t => {
  const f = fixture(t, ['a', 'b', 'c', 'd', 'e']);
  for (const person of ['a', 'b', 'c', 'd']) await f.enqueue(person);
  const called = [];
  const result = await drainMemoryJobs(f.env, { clock: () => baseTime, consolidator: async (_env, person) => {
    called.push(person); return { consolidated: true };
  } });
  assert.equal(result.attempted, MEMORY_JOBS_PER_TICK);
  assert.deepEqual(called, ['a', 'b', 'c']);
  assert.equal(f.job('d').status, 'queued');
  assert.equal(f.job('e'), undefined);
});

test('Forget removes a queued or running job and prevents its completion record from returning', async t => {
  const f = fixture(t);
  await f.enqueue('a');
  await f.enqueue('b');
  const result = await processMemoryJob(f.env, 'a', { clock: () => baseTime, consolidator: async () => {
    f.sqlite.prepare('DELETE FROM conversations WHERE visitor_id=?').run('a');
    return { consolidated: true };
  } });
  assert.equal(result.reason, 'lease_lost');
  assert.equal(f.job('a'), undefined);
  assert.equal(f.job('b').status, 'queued');
  f.sqlite.prepare('DELETE FROM users WHERE id=?').run('b');
  assert.equal(f.job('b'), undefined);
});

test('private status exposes dormant closed-message backlog and never another account', async t => {
  const f = fixture(t);
  assert.equal(await memoryJobStatus(f.env, 'a', 'b'), null);
  const initial = await memoryJobStatus(f.env, 'a', 'a');
  assert.equal(initial.status, 'not_scheduled');
  assert.equal(initial.pending_messages, 1);
  f.sqlite.prepare('INSERT INTO conversations VALUES (?,?,?,NULL)').run('active-a', 'a', iso(baseTime));
  f.sqlite.prepare("INSERT INTO messages VALUES (?,?,?,'user',?,?)").run('active-message', 'active-a', 'a', 'Synthetic unfinished call', iso(baseTime));
  assert.equal((await memoryJobStatus(f.env, 'a', 'a')).pending_messages, 1);
  f.sqlite.prepare('INSERT INTO memory_summaries VALUES (?,?,?,?)').run('a', 'Synthetic summary', iso(baseTime), 'message-a');
  assert.equal((await memoryJobStatus(f.env, 'a', 'a')).pending_messages, 0);
  await f.enqueue('a');
  assert.equal((await memoryJobStatus(f.env, 'a', 'a')).status, 'queued');
  assert.doesNotMatch(JSON.stringify(await memoryJobStatus(f.env, 'a', 'a')), /Synthetic private preference|lease_token/);
});

test('authenticated close scheduling uses the durable job and executes only one batch', async t => {
  const f = fixture(t);
  await f.enqueue('a');
  const scheduled = [];
  const ctx = { waitUntil: promise => scheduled.push(promise) };
  let calls = 0;
  const consolidator = async (_env, person, options) => {
    assert.equal(person, 'a');
    assert.ok(options.memoryJobLease);
    calls++;
    return { consolidated: true };
  };
  assert.equal(scheduleCompletedMemoryConsolidation(ctx, f.env, f.identity('a'), true, consolidator), true);
  assert.equal(scheduleCompletedMemoryConsolidation(ctx, f.env, f.identity('a'), false, consolidator), false);
  await Promise.all(scheduled);
  assert.equal(calls, 1);
  assert.equal(f.job('a').status, 'complete');
});

test('the real extraction transaction cannot repopulate memories after Forget during inference', async t => {
  const f = fixture(t);
  await f.enqueue('a');
  f.sqlite.prepare('UPDATE messages SET content=? WHERE message_id=?').run('I prefer concise answers.', 'message-a');
  f.env.AI = { run: async () => {
    f.sqlite.prepare('DELETE FROM conversations WHERE visitor_id=?').run('a');
    return { response: {
      summary_items: [{ content: 'A prefers concise answers.', evidence_message_ids: ['message-a'] }],
      pinned_memories: [{ category: 'preference', content: 'A prefers concise answers.', evidence_message_ids: ['message-a'], decision: 'NEW' }],
      open_threads: [], resolved_threads: []
    } };
  } };
  assert.equal((await processMemoryJob(f.env, 'a')).reason, 'lease_lost');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM memory_summaries WHERE visitor_id=?').get('a').n, 0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM pinned_memories WHERE visitor_id=?').get('a').n, 0);
  assert.equal(f.job('a'), undefined);
});

test('the real extraction transaction rejects an expired lease before any memory write', async t => {
  const f = fixture(t);
  await f.enqueue('a');
  f.sqlite.prepare('UPDATE messages SET content=? WHERE message_id=?').run('I prefer concise answers.', 'message-a');
  f.env.AI = { run: async () => {
    f.sqlite.prepare('UPDATE nina_memory_jobs SET lease_until=? WHERE visitor_id=?').run('2000-01-01T00:00:00.000Z', 'a');
    return { response: {
      summary_items: [{ content: 'A prefers concise answers.', evidence_message_ids: ['message-a'] }],
      pinned_memories: [{ category: 'preference', content: 'A prefers concise answers.', evidence_message_ids: ['message-a'], decision: 'NEW' }],
      open_threads: [], resolved_threads: []
    } };
  } };
  assert.equal((await processMemoryJob(f.env, 'a')).reason, 'lease_lost');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM memory_summaries WHERE visitor_id=?').get('a').n, 0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM pinned_memories WHERE visitor_id=?').get('a').n, 0);
  assert.equal(f.job('a').status, 'running');
});
