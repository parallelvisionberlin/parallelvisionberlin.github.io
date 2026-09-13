import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { buildLivePersonaConfig, scheduleCompletedMemoryConsolidation, scheduleCompletedRelationshipEvaluation } from '../src/index.js';
import {
  mergeSummary, consolidateMemory, buildOwnerMemoryContext,
  filterConsolidationExtraction, isCompleteMemoryExtraction,
} from '../src/memory.js';
import {
  buildRelationshipContext, DEFAULT_RELATIONSHIP_SUMMARY,
} from '../src/relationship.js';

function memoryEnv(response, options = {}) {
  const writes = [];
  const db = {
    prepare(sql) {
      return {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          if (sql.includes('SELECT 1 AS valid')) return {valid:1};
          if (sql.includes('SELECT role FROM users')) return {role:'owner'};
          if (sql.includes('memory_summaries')) return options.summaryRow || null;
          return null;
        },
        async all() {
          if (sql.includes('FROM messages')) return { results: options.messages || [] };
          if (sql.includes('FROM pinned_memories')) return { results: options.pins || [] };
          return { results: [] };
        },
      };
    },
    async batch(statements) { writes.push(...statements); return []; },
  };
  return { env: { NINA_MEMORY_DB: db, AI: { async run() { return response; } } }, writes };
}

test('a newly evidenced correction survives a nearly full summary without partial items', () => {
  const facts = Array.from({ length: 32 }, (_, i) =>
    `Alejandro keeps documented reference ${i} for the current creative project and its planned artwork.`);
  const prior = facts.slice(0, 30).join(' ');
  const correction = 'Alejandro prefers Nina to stop making psychological guesses about him.';
  const result = mergeSummary(prior, [{ content: correction }]);
  assert.ok(result.startsWith(correction));
  assert.ok(result.length <= 3000);
  assert.ok(result.split('\n').every(line => line.endsWith('.')));
  assert.ok(result.includes(facts[0]));
});

test('legacy multi-sentence summaries retain content beyond the former per-item 500-character cut', () => {
  const facts = Array.from({ length: 15 }, (_, i) =>
    `Alejandro keeps reference ${i} for the documented creative project.`);
  const result = mergeSummary(facts.join(' '), []);
  for (const fact of facts) assert.ok(result.includes(fact));
  assert.equal(mergeSummary(result, []), result);
});

test('an explicitly corrected value replaces the previous value for a known property', () => {
  const result = mergeSummary('Alejandro has a girlfriend named ExampleOld.', [
    { content: 'Alejandro has a girlfriend named ExampleNew.' },
  ]);
  assert.ok(result.includes('ExampleNew'));
  assert.ok(!result.includes('ExampleOld'));
});

test('repeated consolidation does not duplicate the same supported item', () => {
  const item = { content: 'Alejandro prefers a relaxed conversational pace.' };
  const first = mergeSummary('', [item]);
  assert.equal(mergeSummary(first, [item]), first);
});

test('incomplete or malformed extraction never advances the message cursor', async () => {
  for (const response of ['{"summary_items":[', '{}', '{"summary_items":[]}']) {
    const { env, writes } = memoryEnv(response, {
      messages: [{ message_id: 'test-user-1', role: 'user', content: 'I prefer a relaxed conversation.' }],
    });
    const result = await consolidateMemory(env, 'test-visitor');
    assert.equal(result.consolidated, false);
    assert.equal(result.reason, 'invalid_extraction');
    assert.equal(writes.length, 0);
  }
});

test('a complete empty extraction can legitimately mark an uninformative batch as processed', async () => {
  const extraction = { summary_items: [], pinned_memories: [], open_threads: [], resolved_threads: [] };
  assert.equal(isCompleteMemoryExtraction(extraction), true);
  const { env, writes } = memoryEnv(JSON.stringify(extraction), {
    messages: [{ message_id: 'test-user-1', role: 'user', content: 'Hello.' }],
  });
  assert.equal((await consolidateMemory(env, 'test-visitor')).consolidated, true);
  assert.equal(writes[0].values[3], 'test-user-1');
});

test('saved temporary facts include the actual recorded date in the live context', async () => {
  const { env } = memoryEnv('', { pins: [{
    category: 'user_fact', content: 'Example is awake at 3am', updated_at: '2026-09-10T01:00:00.000Z',
  }] });
  const { context } = await buildOwnerMemoryContext(env, {
    visitor_id: 'test-visitor', display_name: 'Example', profile_type: 'owner',
  });
  assert.ok(context.includes('recorded 2026-09-10T01:00:00.000Z'));
  assert.ok(context.includes('historical unless the current conversation confirms them'));
});

test('a grounded preference correction is retained while an unsupported claim is rejected', () => {
  const correction = { content: 'Alejandro prefers Nina to stop making psychological guesses about him.', evidence_message_ids: ['test-correction'] };
  const extraction = { summary_items: [correction, { content: 'Alejandro prefers to discuss football.', evidence_message_ids: ['missing-message'] }] };
  const messages = [{ message_id: 'test-correction', role: 'user', content: 'Stop making psychological guesses about me. Ask directly.' }];
  assert.deepEqual(filterConsolidationExtraction(extraction, messages).summaryItems, [correction]);
});

function relationshipEnv(summary) {
  return { NINA_MEMORY_DB: { prepare() {
    return { bind() { return this; }, async run() {}, async first() { return { relationship_summary: summary }; } };
  } } };
}

test('the owner receives no contradictory generic first-acquaintance instruction', async () => {
  assert.equal(await buildRelationshipContext(relationshipEnv(DEFAULT_RELATIONSHIP_SUMMARY), 'owner', { establishedOwner: true }), '');
});

test('the default posture is retained for ordinary accounts', async () => {
  const context = await buildRelationshipContext(relationshipEnv(DEFAULT_RELATIONSHIP_SUMMARY), 'user');
  assert.ok(context.includes(DEFAULT_RELATIONSHIP_SUMMARY));
});

test('learned owner relationship context is retained', async () => {
  const summary = 'They prefer an easy conversational pace and have discussed music together.';
  const context = await buildRelationshipContext(relationshipEnv(summary), 'owner', { establishedOwner: true });
  assert.ok(context.includes(summary));
});

test('the existing microphone capture requests supported speech processing and keeps device selection', async () => {
  const source = await readFile(new URL('../../js/nina-access.js', import.meta.url), 'utf8');
  const start = source.indexOf('function microphoneConstraints(');
  const end = source.indexOf('\nasync function listMicrophones', start);
  const box = vm.createContext({ navigator: { mediaDevices: { getSupportedConstraints: () => ({
    echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: true,
  }) } } });
  vm.runInContext(source.slice(start, end), box);
  const value = JSON.parse(JSON.stringify(vm.runInContext('microphoneConstraints("test-mic")', box)));
  assert.deepEqual(value, { audio: {
    deviceId: { exact: 'test-mic' }, echoCancellation: { ideal: true }, noiseSuppression: { ideal: true },
    autoGainControl: { ideal: true }, channelCount: { ideal: 1 },
  }, video: false });
  box.navigator.mediaDevices = {};
  assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext('microphoneConstraints()', box))), { audio: true, video: false });
});

test('the live persona mapping preserves configured delivery settings and attached non-knowledge tools', async () => {
  const persona = { name: 'Test', avatar: { id: 'avatar' }, voice: { id: 'voice' }, llmId: 'model',
    brain: { systemPrompt: 'Test prompt' }, avatarModel: 'cara-4', languageCode: 'en',
    directorNotes: { presetStyle: 'warm', expressivity: 0.3 }, tools: [
      { id: 'pause-id', type: 'system', name: 'pause_conversation' },
      { id: 'old-knowledge-id', type: 'server', subtype: 'knowledge', name: 'old_knowledge' },
    ],
  };
  const value = buildLivePersonaConfig(persona, "canon-folder");
  assert.equal(value.languageCode, 'en');
  assert.deepEqual(value.directorNotes, { presetStyle: 'warm', expressivity: 0.3 });
  assert.deepEqual(value.toolIds, ['pause-id']);
  assert.equal(value.tools[0].documentFolderIds[0], 'canon-folder');
});

test('background failures are observable without exposing the original error or private content', async t => {
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  const scheduled = [];
  const ctx = { waitUntil(promise) { scheduled.push(promise); } };
  const identity = { visitor_id: 'test-visitor', user_id: 'test-user', account_authenticated: true };
  scheduleCompletedMemoryConsolidation(ctx, {}, { ...identity, account_authenticated: false }, true, async () => ({ consolidated: false, reason: 'invalid_extraction' }));
  scheduleCompletedRelationshipEvaluation(ctx, {}, identity, 'test-conversation', true, () => { throw new Error('private synthetic model output'); });
  await Promise.all(scheduled);
  assert.deepEqual(warnings.map(([, detail]) => [detail.job, detail.code]).sort(([a], [b]) => a.localeCompare(b)), [
    ['memory', 'invalid_extraction'], ['relationship', 'execution_failed'],
  ]);
  assert.ok(!JSON.stringify(warnings).includes('private synthetic'));
});
