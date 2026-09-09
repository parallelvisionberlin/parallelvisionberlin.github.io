import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
// Synthetic records only. Execute production SQL against the actual migrations.
export const NOW = Date.parse('2026-09-09T10:00:00.000Z');
export const PUBLIC_CALL = '11111111-1111-4111-8111-111111111111';
export const OWNER_CALL = '22222222-2222-4222-8222-222222222222';
const OTHER_CALL = '33333333-3333-4333-8333-333333333333';
const at = offset => new Date(NOW + offset).toISOString();
const subject = id => 'user_' + id.replace(/-/g, '');

export function fixture({ fail = null, drop = null } = {}) {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0001_nina_memory.sql', '0002_authenticated_users.sql', '0003_signal_credits.sql',
    '0004_signal_credit_purchases.sql', '0006_live_nina_sessions.sql', '0010_nina_analytics.sql', '20260909_nina_web_conversations.sql']) {
    sqlite.exec(readFileSync(new URL('../../anam-token-worker/migrations/' + name, import.meta.url), 'utf8'));
  }
  const start = at(-600000), end = at(-410000), created = at(-610000);
  for (const [id, role, callId] of [['public-a', 'user', PUBLIC_CALL], ['owner-a', 'owner', OWNER_CALL], ['public-b', 'user', OTHER_CALL]]) {
    const memory = 'memory-' + id;
    sqlite.prepare('INSERT INTO visitors VALUES (?, ?, ?, ?, ?)').run(memory, id, role === 'owner' ? 'owner' : 'visitor', created, created);
    sqlite.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, 'clerk', subject(id), id + '@example.invalid', id, role, memory, created, created);
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
