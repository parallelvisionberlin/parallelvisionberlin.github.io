import assert from 'node:assert/strict';
import test from 'node:test';
import { rankMemoryCandidates, selectPinnedMemories, selectPinnedMemoriesForExtraction } from '../src/memory-selection.js';

const now = Date.parse('2026-09-13T12:00:00Z');
const old = '2026-08-01T12:00:00Z';
const recent = '2026-09-13T11:00:00Z';
const fact = (id, category, content, updated_at = old) => ({ memory_id: id, category, content, updated_at });

test('considers preferences older than the newest twenty pins before recent temporary states', () => {
  const pins = Array.from({ length: 23 }, (_, i) => fact(`temporary-${i}`, 'user_fact', `The visitor is smoking a joint (${i}).`, recent));
  const preference = fact('lasting-preference', 'preference', 'The visitor prefers a relaxed conversation pace.');
  const project = fact('lasting-project', 'project', 'The visitor is working on Fashion After Fabric.');
  const selected = selectPinnedMemories([...pins, preference, project], { now, characterBudget: 300 });
  assert.deepEqual(selected.items.slice(0, 2), [preference, project]);
  assert.equal(selected.candidateCount, 25);
  assert.equal(selected.omittedCount, 25 - selected.count);
  assert.ok(selected.used <= 300);
});

test('keeps stable user facts and real relationships above old symptoms and trivial calls', () => {
  const rows = [
    fact('sleep', 'user_fact', "The visitor is having trouble sleeping and it's 3am."),
    fact('greeting', 'user_fact', 'The visitor and Nina greeted each other.', recent),
    fact('health', 'user_fact', "The visitor's throat is better."),
    fact('partner', 'user_fact', 'The visitor has a girlfriend named Eva.'),
    fact('home', 'user_fact', 'The visitor lives in Berlin.'),
    fact('allergy', 'user_fact', 'The visitor is allergic to penicillin.'),
    fact('studio', 'user_fact', "The visitor's studio is East Room.")
  ];
  const selected = rankMemoryCandidates(rows, { now });
  assert.equal(selected[0].memory_id, 'partner');
  const durable = selected.slice(0, 4).map(row => row.memory_id).sort();
  assert.deepEqual(durable, ['allergy', 'home', 'partner', 'studio']);
  assert.equal(selected.at(-1).memory_id, 'greeting');
});

test('temporary states lose priority with age but durable facts and fictional history do not expire', () => {
  const rows = [
    fact('older', 'user_fact', 'The visitor was sick.'),
    fact('newer', 'user_fact', 'The visitor was sick.', recent),
    fact('life', 'nina_autobiography', 'Nina spent an evening tracing a visual-sync issue to a cable.'),
    fact('preference', 'preference', 'The visitor prefers quiet music when unable to sleep.')
  ];
  assert.deepEqual(rankMemoryCandidates(rows, { now }).map(row => row.memory_id), ['preference', 'life', 'newer', 'older']);
});

test('whole-fact packing skips oversized candidates and reports actual included counts', () => {
  const huge = fact('large', 'identity', `The visitor has a biography: ${'complete words '.repeat(100)}.`);
  const small = fact('small', 'preference', 'The visitor prefers tacos.');
  const selected = selectPinnedMemories([huge, small], { now, characterBudget: 150 });
  assert.deepEqual(selected.items, [small]);
  assert.equal(selected.text, `PINNED MEMORIES\n[preference; recorded ${old}] ${small.content}`);
  assert.equal(selected.used, selected.text.length);
  assert.equal(selected.count, 1);
  assert.equal(selected.omittedCount, 1);
  assert.equal(selectPinnedMemories([small], { now, characterBudget: 10 }).text, '');
});

test('selection does not mutate, rewrite, or invent source facts', () => {
  const rows = Object.freeze([
    Object.freeze(fact('b', 'preference', 'The visitor prefers minimal drums.')),
    Object.freeze(fact('a', 'preference', 'The visitor prefers spacious mixes.'))
  ]);
  const snapshot = JSON.stringify(rows);
  const selected = selectPinnedMemories(rows, { now });
  assert.deepEqual(selected.items.map(row => row.memory_id), ['a', 'b']);
  assert.equal(JSON.stringify(rows), snapshot);
  assert.ok(selected.items.every(row => rows.includes(row)));
});

test('extraction retrieves old property evidence relevant to new messages within a whole JSON budget', () => {
  const studio = fact('old-studio', 'user_fact', "The visitor's studio is North Room.");
  const others = Array.from({ length: 24 }, (_, i) => fact(`pref-${i}`, 'preference', `The visitor prefers instrument ${i}.`, recent));
  const selected = selectPinnedMemoriesForExtraction([...others, studio], {
    now, messages: [{ content: 'Correction: my studio is East Room now.' }], characterBudget: 180
  });
  assert.deepEqual(selected.items, [studio]);
  assert.deepEqual(JSON.parse(selected.text), [{ memory_id: studio.memory_id, category: studio.category, content: studio.content }]);
  assert.ok(selected.used <= 180);
  assert.equal(selected.used, selected.text.length);
});

test('one relevant historic temporary fact can be recalled without treating all temporary facts as current', () => {
  const sleep = fact('sleep', 'user_fact', "The visitor was having trouble sleeping and it's 3am.");
  const preference = fact('music', 'preference', 'The visitor likes hypnotic electronic music.');
  const selected = selectPinnedMemories([preference, sleep], { now, query: 'trouble sleeping' });
  assert.equal(selected.items[0], sleep);
  assert.ok(selected.text.includes(`recorded ${old}`));
  assert.ok(selected.text.includes(sleep.content));
});
