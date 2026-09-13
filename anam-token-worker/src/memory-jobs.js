import { consolidateMemory } from './memory.js';

export const MEMORY_JOB_LEASE_MS = 4 * 60 * 1000;
export const MEMORY_JOB_RETRY_BASE_MS = 5 * 60 * 1000;
export const MEMORY_JOB_RETRY_MAX_MS = 60 * 60 * 1000;
export const MEMORY_JOBS_PER_TICK = 3;

const iso = time => new Date(time).toISOString();
const count = value => Math.max(0, Math.trunc(Number(value) || 0));
const changes = result => Number(result?.meta?.changes || 0);

export function memoryRetryDelay(failures) {
  return Math.min(MEMORY_JOB_RETRY_MAX_MS, MEMORY_JOB_RETRY_BASE_MS * 2 ** Math.min(4, Math.max(0, failures - 1)));
}

// Called only after an authenticated close, never by a global transcript scan.
export async function enqueueMemoryJob(env, identity, { conversationId, now = Date.now() } = {}) {
  if (!identity?.account_authenticated || !identity.user_id || !identity.visitor_id) return { queued: false };
  const at = iso(now);
  const result = await env.NINA_MEMORY_DB.prepare(`
    INSERT INTO nina_memory_jobs (visitor_id,user_id,conversation_id,status,next_attempt_at,created_at,updated_at)
    SELECT u.memory_visitor_id,u.id,c.conversation_id,'queued',?,?,?
    FROM users u JOIN conversations c ON c.visitor_id=u.memory_visitor_id
    WHERE u.id=? AND u.memory_visitor_id=? AND c.ended_at IS NOT NULL
      AND (? IS NULL OR c.conversation_id=?)
    ORDER BY c.ended_at DESC,c.conversation_id DESC LIMIT 1
    ON CONFLICT(visitor_id) DO UPDATE SET
      conversation_id=excluded.conversation_id,
      requested_generation=nina_memory_jobs.requested_generation+1,
      status=CASE WHEN nina_memory_jobs.status='running' THEN 'running' ELSE 'queued' END,
      next_attempt_at=excluded.next_attempt_at,updated_at=excluded.updated_at
    WHERE nina_memory_jobs.user_id=excluded.user_id
  `).bind(at, at, at, identity.user_id, identity.visitor_id, conversationId || null, conversationId || null).run();
  return { queued: changes(result) > 0 };
}

async function claimMemoryJob(env, visitorId, now) {
  const token = crypto.randomUUID();
  const at = iso(now);
  const job = await env.NINA_MEMORY_DB.prepare(`
    UPDATE nina_memory_jobs SET status='running',lease_token=?,lease_until=?,
      attempts=attempts+1,last_attempted_at=?,updated_at=?
    WHERE visitor_id=? AND (
      (status IN ('queued','invalid_extraction','error') AND next_attempt_at<=?)
      OR (status='running' AND lease_until<=?)
    )
    RETURNING user_id,visitor_id,requested_generation,consecutive_failures,lease_token
  `).bind(token, iso(now + MEMORY_JOB_LEASE_MS), at, at, visitorId, at, at).first();
  return job || null;
}

async function finishMemoryJob(env, job, result, now) {
  const at = iso(now);
  if (result?.consolidated || result?.reason === 'no_messages') {
    const written = await env.NINA_MEMORY_DB.prepare(`
      UPDATE nina_memory_jobs SET
        status=CASE WHEN requested_generation>? OR ? THEN 'queued' ELSE 'complete' END,
        processed_generation=?,lease_token=NULL,lease_until=NULL,consecutive_failures=0,
        last_error_code=NULL,last_success_at=?,next_attempt_at=?,updated_at=?,
        last_cursor=COALESCE(?,last_cursor),last_message_count=?,last_pinned_count=?,last_journal_count=?
      WHERE visitor_id=? AND lease_token=? AND lease_until>?
    `).bind(job.requested_generation, result.hasMore ? 1 : 0, job.requested_generation,
      at, at, at, result.summarizedThrough || null, count(result.messageCount), count(result.pinnedCount), count(result.journalCount),
      job.visitor_id, job.lease_token, at).run();
    return changes(written) ? { ...result, processed: true } : { processed: false, reason: 'lease_lost' };
  }
  // Store a fixed code, never a provider error, prompt, result, or transcript.
  const code = result?.reason === 'invalid_extraction' ? 'invalid_extraction'
    : result?.reason === 'unavailable' ? 'unavailable'
    : result?.reason === 'stale' || result?.reason === 'lease_lost' ? 'stale'
    : 'execution_failed';
  const failures = count(job.consecutive_failures) + 1;
  const written = await env.NINA_MEMORY_DB.prepare(`
    UPDATE nina_memory_jobs SET status=?,lease_token=NULL,lease_until=NULL,
      consecutive_failures=?,last_error_code=?,next_attempt_at=?,updated_at=?
    WHERE visitor_id=? AND lease_token=? AND lease_until>?
  `).bind(code === 'invalid_extraction' ? 'invalid_extraction' : 'error', failures, code,
    iso(now + memoryRetryDelay(failures)), at, job.visitor_id, job.lease_token, at).run();
  return changes(written)
    ? { processed: true, consolidated: false, reason: code }
    : { processed: false, reason: 'lease_lost' };
}

// One bounded extraction per invocation. If waitUntil is killed, the lease expires
// and cron retries the still-durable job. The consolidator fences its atomic writes
// with this token, so a superseded worker cannot write after retry or Forget.
export async function processMemoryJob(env, visitorId, { consolidator = consolidateMemory, clock = Date.now } = {}) {
  const job = await claimMemoryJob(env, visitorId, clock());
  if (!job) return { processed: false, reason: 'not_due' };
  let result;
  try {
    result = await consolidator(env, visitorId, { memoryJobLease: job.lease_token });
  } catch {
    result = { consolidated: false, reason: 'execution_failed' };
  }
  return finishMemoryJob(env, job, result, clock());
}

export async function drainMemoryJobs(env, { consolidator = consolidateMemory, clock = Date.now } = {}) {
  const at = iso(clock());
  // Only explicit close requests are eligible. Never discover or replay legacy
  // private history merely because a deployment installed a cron trigger.
  const due = await env.NINA_MEMORY_DB.prepare(`
    SELECT visitor_id FROM nina_memory_jobs
    WHERE (status IN ('queued','invalid_extraction','error') AND next_attempt_at<=?)
      OR (status='running' AND lease_until<=?)
    ORDER BY next_attempt_at ASC,visitor_id ASC LIMIT ?
  `).bind(at, at, MEMORY_JOBS_PER_TICK).all();
  const results = [];
  for (const job of due.results || []) results.push(await processMemoryJob(env, job.visitor_id, { consolidator, clock }));
  return { attempted: results.length, completed: results.filter(result => result.consolidated).length };
}

export async function memoryJobStatus(env, userId, visitorId) {
  const db = env.NINA_MEMORY_DB;
  // Both identifiers are checked even for callers that already authenticated.
  const owner = await db.prepare('SELECT id FROM users WHERE id=? AND memory_visitor_id=?').bind(userId, visitorId).first();
  if (!owner) return null;
  const [job, backlog] = await Promise.all([
    db.prepare(`SELECT status,attempts,consecutive_failures,last_error_code,last_attempted_at,last_success_at,
      next_attempt_at,lease_until,last_cursor,last_message_count,last_pinned_count,last_journal_count,updated_at
      FROM nina_memory_jobs WHERE user_id=? AND visitor_id=?`).bind(userId, visitorId).first(),
    db.prepare(`SELECT COUNT(*) AS pending_messages FROM messages m
      JOIN conversations c ON c.conversation_id=m.conversation_id AND c.visitor_id=m.visitor_id
      WHERE m.visitor_id=? AND c.ended_at IS NOT NULL AND m.rowid>COALESCE((
        SELECT cursor.rowid FROM memory_summaries s JOIN messages cursor ON cursor.message_id=s.messages_summarized_through
        AND cursor.visitor_id=s.visitor_id WHERE s.visitor_id=?),0)`).bind(visitorId, visitorId).first()
  ]);
  return { ...(job || { status: 'not_scheduled', attempts: 0 }), pending_messages: count(backlog?.pending_messages) };
}
