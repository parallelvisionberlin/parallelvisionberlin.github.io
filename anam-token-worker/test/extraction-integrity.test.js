import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { assessExtractionIntegrity, completeExtractionShape, makeExtractionRepairInstructions } from '../src/extraction-integrity.js';
import { applyMemoryExtraction, filterConsolidationExtraction, loadConsolidationInput, resolvePinnedDecision } from '../src/memory.js';

const complete = fields => ({ summary_items: [], pinned_memories: [], open_threads: [], resolved_threads: [], ...fields });
const summary = (content, evidence = 'source') => ({ content, evidence_message_ids: [evidence] });
const pin = (content, decision = 'NEW', extra = {}) => ({ ...summary(content), category: 'preference', decision, ...extra });
const accepted = () => ({ accepted: true });

test('complete empty extraction deliberately advances, but missing arrays remain invalid', () => {
  const result = assessExtractionIntegrity(complete());
  assert.equal(result.valid, true);
  assert.equal(result.empty, true);
  assert.equal(result.diagnostics.invalid, 0);
  for (const invalid of [null, [], {}, { summary_items: [] }, complete({ open_threads: null })]) {
    assert.equal(completeExtractionShape(invalid), false);
    assert.equal(assessExtractionIntegrity(invalid).reason, 'invalid_extraction');
  }
});

test('actual subjectless extraction rejection cannot hide behind a deterministic preference', () => {
  const messages = [{ message_id: 'source', role: 'user', content: 'I like jazz.' }];
  const extraction = complete({ summary_items: [summary('Likes jazz and prefers calmer music.')] });
  const aggregate = filterConsolidationExtraction(extraction, messages);
  assert.equal(aggregate.summaryItems.length, 0);
  assert.equal(aggregate.pinned.length, 1);
  const result = assessExtractionIntegrity(extraction, {
    inspectCandidate(collection, candidate) {
      assert.equal(collection, 'summary_items');
      const candidateResult = filterConsolidationExtraction({ summary_items: [candidate] }, messages);
      return { accepted: candidateResult.summaryItems.length === 1 };
    }
  });
  assert.equal(result.valid, false);
  assert.equal(result.diagnostics.invalid, 1);
});

test('one rejected candidate makes a partly successful extraction retryable across collections', () => {
  const extraction = complete({
    summary_items: [summary('Alejandro prefers concise answers.')],
    pinned_memories: [pin('Alejandro likes synths.')],
    open_threads: [summary('An unattributed fragment about a studio.')]
  });
  const result = assessExtractionIntegrity(extraction, {
    inspectCandidate: collection => ({ accepted: collection !== 'open_threads' })
  });
  assert.equal(result.valid, false);
  assert.equal(result.diagnostics.accepted, 2);
  assert.equal(result.diagnostics.invalid, 1);
  assert.equal(result.diagnostics.byCollection.open_threads.invalid, 1);
});

test('explicit REJECT is a verified intentional omission, not a failed actionable item', () => {
  const extraction = complete({ pinned_memories: [pin('Alejandro said hello to Nina.', 'REJECT')] });
  const result = assessExtractionIntegrity(extraction, { inspectCandidate: accepted });
  assert.equal(result.valid, true);
  assert.equal(result.empty, false);
  assert.equal(result.diagnostics.intentionallyRejected, 1);
  assert.equal(result.diagnostics.accepted, 0);
  assert.equal(assessExtractionIntegrity(extraction, {
    inspectCandidate: () => ({ accepted: false, reason: 'missing_evidence' })
  }).valid, false);
});

test('reviewed legacy pins without a decision retain implicit NEW compatibility', () => {
  const candidate = { ...summary('Alejandro likes jazz.'), category: 'preference' };
  const result = assessExtractionIntegrity(complete({ pinned_memories: [candidate] }), { inspectCandidate: accepted });
  assert.equal(result.valid, true);
  assert.equal(result.diagnostics.accepted, 1);
});

test('a model DUPLICATE label cannot silently discard a fact without a verified stored target', () => {
  const candidate = pin('Alejandro likes jazz.', 'DUPLICATE');
  const inspectCandidate = (_collection, item) => {
    const resolved = resolvePinnedDecision(item, []);
    return { accepted: true, existingTargetVerified: Boolean(resolved.existing) };
  };
  const invalid = assessExtractionIntegrity(complete({ pinned_memories: [candidate] }), { inspectCandidate });
  assert.equal(invalid.valid, false);
  assert.equal(invalid.diagnostics.reasons.unknown_target, 1);
  const valid = assessExtractionIntegrity(complete({ pinned_memories: [candidate] }), {
    inspectCandidate: () => ({ accepted: true, existingTargetVerified: true })
  });
  assert.equal(valid.valid, true);
});

test('updates need a target ID and verified membership in this visitor memory', () => {
  const withoutId = pin('Alejandro now likes ambient music.', 'UPDATE_EXISTING');
  const foreign = { ...withoutId, existing_memory_id: 'another-visitors-memory' };
  assert.equal(assessExtractionIntegrity(complete({ pinned_memories: [withoutId] }), {
    inspectCandidate: () => ({ accepted: true, existingTargetVerified: true })
  }).valid, false);
  assert.equal(assessExtractionIntegrity(complete({ pinned_memories: [foreign] }), {
    inspectCandidate: accepted
  }).valid, false);
  assert.equal(assessExtractionIntegrity(complete({ pinned_memories: [{ ...foreign, existing_memory_id: 'owned-memory' }] }), {
    inspectCandidate: () => ({ accepted: true, existingTargetVerified: true })
  }).valid, true);
});

test('malformed candidates, missing evidence, oversized content and unknown operations cannot disappear', () => {
  const invalid = complete({
    summary_items: [null, summary('Alejandro has a project.', ''), summary('x'.repeat(501))],
    pinned_memories: [pin('Alejandro likes music.', 'DELETE_ALL')],
    resolved_threads: [{ evidence_message_ids: ['source'] }]
  });
  const result = assessExtractionIntegrity(invalid, { inspectCandidate: accepted });
  assert.equal(result.valid, false);
  assert.equal(result.diagnostics.candidates, 5);
  assert.equal(result.diagnostics.invalid, 5);
  assert.deepEqual(result.diagnostics.reasons, {
    invalid_shape: 2, missing_evidence: 1, output_limit: 1, unsupported_operation: 1
  });
});

test('diagnostics contain fixed codes and counts without private text, IDs or thrown errors', () => {
  const extraction = complete({ summary_items: [summary('Alejandro private secret one.', 'private-source-id'), summary('Alejandro private secret two.')] });
  const result = assessExtractionIntegrity(extraction, {
    inspectCandidate(_collection, _item, index) {
      if (index) throw new Error('private provider failure');
      return { accepted: false, reason: 'private provider content' };
    }
  });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /private|Alejandro|provider|source-id/);
  assert.equal(result.diagnostics.reasons.validation_failed, 2);
});

test('repair instructions use sanitized numeric failure counts without echoing rejected output', () => {
  const prompt = makeExtractionRepairInstructions({
    byCollection: { summary_items: { invalid: 2 }, pinned_memories: { invalid: 'private source text' } },
    reasons: { unknown_target: 1, invalid_shape: Infinity, 'private provider text': 1 },
    content: 'private invented memory', error: 'private upstream response'
  });
  assert.match(prompt, /summary_items: 2/);
  assert.match(prompt, /pinned_memories: 0/);
  assert.match(prompt, /unknown_target: 1/);
  assert.match(prompt, /Return all-empty arrays only when/);
  assert.doesNotMatch(prompt, /private|Infinity|upstream|invented/);
});

function databaseFixture(t, content = 'I prefer concise answers from Nina.') {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  for (const file of readdirSync(new URL('../migrations/', import.meta.url)).filter(name => name.endsWith('.sql')).sort())
    sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  sqlite.exec(`INSERT INTO visitors VALUES('v','Test','owner','2026-01-01','2026-01-01');
    INSERT INTO users(id,auth_provider,auth_subject,display_name,role,memory_visitor_id,created_at,updated_at)
      VALUES('u','clerk','test-subject','Test','owner','v','2026-01-01','2026-01-01');
    INSERT INTO conversations VALUES('c','v','2026-01-01','2026-01-02');`);
  sqlite.prepare('INSERT INTO messages VALUES(?,?,?,?,?,?)').run('source','c','v','user',content,'2026-01-01T12:00:00Z');
  const db = {
    prepare(sql) {
      let params = [];
      return {
        bind(...values) { params = values; return this; },
        async first() { return sqlite.prepare(sql).get(...params) || null; },
        async all() { return { results: sqlite.prepare(sql).all(...params) }; },
        async run() { return { meta: sqlite.prepare(sql).run(...params) }; }
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
  return { sqlite, env: { NINA_MEMORY_DB: db, NINA_WORKSPACE_ENABLED: 'true' } };
}

function assertNoDerivedWrites(sqlite) {
  for (const table of ['memory_summaries', 'pinned_memories', 'open_threads', 'nina_journal_entries'])
    assert.equal(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0, table);
}

test('actual transaction preserves source eligibility after invalid output and a later retry saves it', async t => {
  const { sqlite, env } = databaseFixture(t, 'I like jazz.');
  const input = await loadConsolidationInput(env, 'v');
  const invalid = complete({ summary_items: [summary('Likes jazz and calmer music.')] });
  const failed = await applyMemoryExtraction(env, 'v', input, invalid);
  assert.equal(failed.reason, 'invalid_extraction');
  assertNoDerivedWrites(sqlite);
  assert.equal((await loadConsolidationInput(env, 'v')).messages[0].message_id, 'source');
  const retried = await applyMemoryExtraction(env, 'v', await loadConsolidationInput(env, 'v'), complete({
    summary_items: [summary('Alejandro likes jazz.')]
  }));
  assert.equal(retried.consolidated, true);
  assert.equal(sqlite.prepare('SELECT messages_summarized_through FROM memory_summaries').get().messages_summarized_through, 'source');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM pinned_memories').get().n, 1);
});

test('actual transaction does not partially save valid siblings while losing an invalid candidate', async t => {
  const { sqlite, env } = databaseFixture(t);
  const extraction = complete({
    summary_items: [summary('Alejandro prefers concise answers from Nina.')],
    pinned_memories: [pin('Alejandro prefers concise answers from Nina.', 'UPDATE_EXISTING', { existing_memory_id: 'foreign-memory-id' })]
  });
  const result = await applyMemoryExtraction(env, 'v', await loadConsolidationInput(env, 'v'), extraction);
  assert.equal(result.reason, 'invalid_extraction');
  assertNoDerivedWrites(sqlite);
});

test('actual transaction checkpoints a legitimately empty extraction without manufacturing memories', async t => {
  const { sqlite, env } = databaseFixture(t, 'Hello.');
  const result = await applyMemoryExtraction(env, 'v', await loadConsolidationInput(env, 'v'), complete());
  assert.equal(result.consolidated, true);
  const record = sqlite.prepare('SELECT summary,messages_summarized_through FROM memory_summaries').get();
  assert.equal(record.summary, '');
  assert.equal(record.messages_summarized_through, 'source');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM pinned_memories').get().n, 0);
});
