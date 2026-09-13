import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { applyMemoryExtraction, loadConsolidationInput, mergeSummary, buildConsolidationPrompt, buildOwnerMemoryContext, consolidateMemory, resolvePinnedDecision } from '../src/memory.js';
import { singleValueProperty, summaryRecords } from '../src/memory-reconciliation.js';

function fixture(t) {
  const sqlite = new DatabaseSync(':memory:'); t.after(() => sqlite.close());
  for (const file of readdirSync(new URL('../migrations/', import.meta.url)).filter(f => f.endsWith('.sql')).sort())
    sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  const db = { prepare(sql) { let args=[]; return { bind(...values){args=values;return this;},
    async first(){return sqlite.prepare(sql).get(...args)||null;}, async all(){return {results:sqlite.prepare(sql).all(...args)};},
    async run(){return {meta:sqlite.prepare(sql).run(...args)};} }; },
    async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}} };
  sqlite.exec(`INSERT INTO visitors VALUES ('v','Test','visitor','2026-01-01','2026-01-01');
    INSERT INTO users(id,auth_provider,auth_subject,display_name,role,memory_visitor_id,created_at,updated_at)
    VALUES('u','clerk','test-subject','Test','user','v','2026-01-01','2026-01-01');
    INSERT INTO conversations VALUES('c','v','2026-01-01','2026-01-02');`);
  return {sqlite, env:{NINA_MEMORY_DB:db,NINA_WORKSPACE_ENABLED:'true'},
    message(id,content){sqlite.prepare('INSERT INTO messages VALUES (?,?,?,?,?,?)').run(id,'c','v','user',content,'2026-01-01T12:00:00Z');},
    pin(id,content,category='user_fact'){sqlite.prepare('INSERT INTO pinned_memories VALUES (?,?,?,?,?,?)').run(id,'v',category,content,'2026-01-01','2026-01-01');},
    summary(content){sqlite.prepare('INSERT INTO memory_summaries VALUES (?,?,?,?)').run('v',content,'2026-01-01',null);} };
}
const complete = (summary=[],pins=[]) => ({summary_items:summary,pinned_memories:pins,open_threads:[],resolved_threads:[]});

test('studio correction replaces current property but preserves dated history and other projects', () => {
  const result = mergeSummary('Alejandro works in a studio called North Room.\nAlejandro previously worked in North Room in 2024.\nAlejandro is working on a project called Glass Archive.', [
    {content:'Alejandro now works in a studio called East Room.'}
  ]);
  assert.doesNotMatch(result,/Alejandro works in a studio called North Room/);
  assert.match(result,/now works.*East Room/); assert.match(result,/previously worked.*2024/); assert.match(result,/Glass Archive/);
  assert.equal(singleValueProperty("The visitor's preferred instrument is a synthesizer."), 'the visitor:preferred instrument');
});

test('arbitrary sourced summary correction replaces linked pin without requiring a hardcoded property', async t => {
  const f=fixture(t), old='The visitor routes percussion through the Ember compressor.';
  f.summary(old+'\nThe visitor likes jazz.');f.pin('routing',old);
  f.message('correction','Correction: I now route percussion through the Quartz compressor instead of Ember.');
  const input=await loadConsolidationInput(f.env,'v');
  assert.match(buildConsolidationPrompt(input),/supersedes_summary_ids/);
  const result=await applyMemoryExtraction(f.env,'v',input,complete([{content:'The visitor routes percussion through the Quartz compressor.',evidence_message_ids:['correction'],supersedes_summary_ids:['summary-0']}]));
  assert.equal(result.consolidated,true);
  const summary=f.sqlite.prepare('SELECT summary FROM memory_summaries').get().summary;
  assert.match(summary,/Quartz/);assert.doesNotMatch(summary,/Ember/);assert.match(summary,/likes jazz/);
  assert.match(f.sqlite.prepare('SELECT content FROM pinned_memories WHERE memory_id=?').get('routing').content,/Quartz/);
});

test('pin-only update reconciles its summary copy and latest source wins within the batch', async t => {
  const f=fixture(t), old='The visitor routes percussion through Ember.';f.summary(old);f.pin('routing',old);
  f.message('earlier','I route percussion through Quartz.');f.message('later','Correction, I now route percussion through Jade.');
  const pins=['earlier','later'].map((id,i)=>({category:'user_fact',content:`The visitor routes percussion through ${i?'Jade':'Quartz'}.`,decision:'UPDATE_EXISTING',existing_memory_id:'routing',evidence_message_ids:[id]}));
  assert.equal((await applyMemoryExtraction(f.env,'v',await loadConsolidationInput(f.env,'v'),complete([],pins))).consolidated,true);
  assert.equal(f.sqlite.prepare('SELECT content FROM pinned_memories').get().content,'The visitor routes percussion through Jade.');
  assert.equal(f.sqlite.prepare('SELECT summary FROM memory_summaries').get().summary,'The visitor routes percussion through Jade.');
});

test('unknown summary target cannot remove facts or advance the cursor', async t => {
  const f=fixture(t);f.summary('The visitor likes jazz.');f.message('correction','My favorite color is violet.');
  const result=await applyMemoryExtraction(f.env,'v',await loadConsolidationInput(f.env,'v'),complete([{content:"The visitor's favorite color is violet.",evidence_message_ids:['correction'],supersedes_summary_ids:['summary-9']}]));
  assert.equal(result.reason,'invalid_extraction');
  assert.equal(f.sqlite.prepare('SELECT messages_summarized_through FROM memory_summaries').get().messages_summarized_through,null);
  assert.equal(summaryRecords('The visitor likes jazz.')[0].id,'summary-0');
});

test('a changed single-property value cannot disappear behind DUPLICATE', () => {
  const existing=[{memory_id:'genre',category:'preference',content:"The visitor's preferred genre is techno."}];
  assert.equal(resolvePinnedDecision({category:'preference',decision:'DUPLICATE',existing_memory_id:'genre',content:"The visitor's preferred genre is ambient."},existing).decision,'UPDATE_EXISTING');
});

test('a correction updates all legacy copies of one current property', async t => {
  const f=fixture(t);f.pin('old-1','The visitor works in a studio called North Room.');f.pin('old-2','The visitor works in a studio called South Room.');
  f.message('correction','I now work in a studio called East Room.');
  const result=await applyMemoryExtraction(f.env,'v',await loadConsolidationInput(f.env,'v'),complete([],[{
    category:'user_fact',content:'The visitor works in a studio called East Room.',decision:'UPDATE_EXISTING',existing_memory_id:'old-1',evidence_message_ids:['correction']
  }]));
  assert.equal(result.consolidated,true);
  const rows=f.sqlite.prepare('SELECT content FROM pinned_memories').all();assert.equal(rows.length,2);
  assert.ok(rows.every(row=>row.content==='The visitor works in a studio called East Room.'));
});

test('session loads old durable pins beyond 20 and never loads another account', async t => {
  const f=fixture(t);f.pin('lasting','The visitor prefers concise explanations.','preference');
  for(let i=0;i<24;i++){f.pin(`temporary-${i}`,`The visitor is smoking a joint, reference ${i}.`);f.sqlite.prepare('UPDATE pinned_memories SET updated_at=? WHERE memory_id=?').run('2026-09-13',`temporary-${i}`);}
  f.sqlite.exec("INSERT INTO visitors VALUES ('other','Other','visitor','2026-01-01','2026-01-01'); INSERT INTO pinned_memories VALUES ('secret','other','preference','A different account private fact.','2026-01-01','2026-09-13');");
  const result=await buildOwnerMemoryContext(f.env,{user_id:'u',visitor_id:'v',display_name:'Test',profile_type:'user'});
  assert.match(result.context,/prefers concise explanations/);assert.doesNotMatch(result.context,/different account private fact/);
  assert.equal(result.diagnostics.eligiblePinnedMemoryCount,25);
  assert.ok(result.context.indexOf('prefers concise explanations') < result.context.indexOf('is smoking a joint'));
  assert.equal((await loadConsolidationInput({...f.env},'v')).existingPinned.length,0); // No new messages: no extraction input.
});

test('automatic repair uses original evidence, saves corrected output, and is bounded to two calls', async t => {
  const f=fixture(t);f.message('m','I prefer concise explanations.');let calls=0;
  f.env.AI={async run(_model,request){calls++;if(calls===1)return {response:complete([{content:'Prefers concise explanations.',evidence_message_ids:['m']}])};
    assert.match(request.messages[1].content,/previous extraction failed validation/);
    return {response:complete([{content:'The visitor prefers concise explanations.',evidence_message_ids:['m']}])};}};
  assert.equal((await consolidateMemory(f.env,'v')).consolidated,true);assert.equal(calls,2);
  assert.match(f.sqlite.prepare('SELECT summary FROM memory_summaries').get().summary,/The visitor prefers/);
  f.message('m2','I like tea.');calls=0;f.env.AI={async run(){calls++;return {response:complete([{content:'Likes tea.',evidence_message_ids:['m2']}])};}};
  assert.equal((await consolidateMemory(f.env,'v')).reason,'invalid_extraction');assert.equal(calls,2);
  assert.equal(f.sqlite.prepare('SELECT messages_summarized_through FROM memory_summaries').get().messages_summarized_through,'m');
});
