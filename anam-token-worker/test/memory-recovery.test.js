import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { consolidateMemory, loadConsolidationInput, applyMemoryExtraction } from '../src/memory.js';

function fixture(t) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  for (const file of readdirSync(new URL('../migrations/', import.meta.url)).filter(f => f.endsWith('.sql')).sort())
    sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  const db = {
    prepare(sql) { let args=[]; return { bind(...values){args=values;return this;},
      async first(){return sqlite.prepare(sql).get(...args)||null;},
      async all(){return {results:sqlite.prepare(sql).all(...args)};},
      async run(){return {meta:sqlite.prepare(sql).run(...args)};} }; },
    async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}
  };
  sqlite.exec(`INSERT INTO visitors VALUES ('v','Test','owner','2026-01-01','2026-01-01');
    INSERT INTO users(id,auth_provider,auth_subject,display_name,role,memory_visitor_id,created_at,updated_at)
    VALUES('u','clerk','test-subject','Test','owner','v','2026-01-01','2026-01-01');
    INSERT INTO conversations VALUES('c','v','2026-01-01','2026-01-02');`);
  return {sqlite,env:{NINA_MEMORY_DB:db,NINA_WORKSPACE_ENABLED:'true'},
    message(id,role,content,call='c'){sqlite.prepare('INSERT INTO messages VALUES (?,?,?,?,?,?)').run(id,call,'v',role,content,'2026-01-01T12:00:00.000Z');}};
}
const complete = (pins=[],summary=[]) => ({summary_items:summary,pinned_memories:pins,open_threads:[],resolved_threads:[]});

test('complete extraction atomically saves summary, two distinct journal facts and final cursor',async t=>{
  const f=fixture(t);
  f.message('user','user','I prefer concise answers about your daily life.');
  f.message('life','persona','I fixed a loose cable before the set. I have apartment automation. How was your evening?');
  const pins=[
    {category:'nina_autobiography',content:'Nina fixed a loose cable before the set.',evidence_message_ids:['life'],decision:'NEW'},
    {category:'nina_autobiography',content:'Nina has apartment automation.',evidence_message_ids:['life'],decision:'NEW'}
  ];
  const extraction=complete(pins,[{content:'Alejandro prefers concise answers about Nina’s daily life.',evidence_message_ids:['user']}]);
  f.env.AI={async run(_model,options){assert.equal(options.max_tokens,2400);assert.equal(options.response_format.type,'json_object');return {response:extraction};}};
  const r=await consolidateMemory(f.env,'v');
  assert.equal(r.consolidated,true);assert.equal(r.hasMore,false);
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM nina_journal_entries').get().n,2);
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM pinned_memories').get().n,2);
  assert.match(f.sqlite.prepare('SELECT summary FROM memory_summaries').get().summary,/concise answers/);
  assert.equal(f.sqlite.prepare('SELECT messages_summarized_through FROM memory_summaries').get().messages_summarized_through,'life');
  assert.equal((await consolidateMemory(f.env,'v')).reason,'no_messages');
});

test('truncated model output cannot move the checkpoint or create partial journal facts',async t=>{
  const f=fixture(t);f.message('life','persona','I fixed a cable before my show.');
  f.env.AI={async run(){return {choices:[{finish_reason:'length'}],response:complete([{category:'nina_autobiography',content:'Nina fixed a cable before a show.',evidence_message_ids:['life']}])};}};
  assert.equal((await consolidateMemory(f.env,'v')).reason,'invalid_extraction');
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM memory_summaries').get().n,0);
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM nina_journal_entries').get().n,0);
});

test('a concurrent newer checkpoint prevents every stale derived-memory write',async t=>{
  const f=fixture(t);f.message('user','user','I like jazz.');
  const input=await loadConsolidationInput(f.env,'v');
  f.sqlite.prepare('INSERT INTO memory_summaries VALUES (?,?,?,?)').run('v','A newer reviewed summary.','2026-01-03','user');
  const r=await applyMemoryExtraction(f.env,'v',input,complete());
  assert.equal(r.reason,'stale');
  assert.equal(f.sqlite.prepare('SELECT summary FROM memory_summaries').get().summary,'A newer reviewed summary.');
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM pinned_memories').get().n,0);
});

test('input batches preserve whole messages and do not skip over an active call',async t=>{
  const f=fixture(t);for(let i=0;i<10;i++)f.message(`m${i}`,'user',`Synthetic documented fact ${i}. ${'x'.repeat(2000)}`);
  const first=await loadConsolidationInput(f.env,'v');
  assert.ok(first.messages.length<10);assert.ok(first.messages.every(m=>m.content.length>2000));
  f.sqlite.exec("DELETE FROM messages; INSERT INTO conversations VALUES ('active','v','2026-01-02',NULL);");
  f.message('open','user','I am still talking.','active');f.message('closed','user','A later call has finished.');
  assert.equal((await loadConsolidationInput(f.env,'v')).messages.length,0);
});

test('rejected autobiography never leaks into the journal',async t=>{
  const f=fixture(t);f.message('life','persona','I fixed a cable before my show.');
  const input=await loadConsolidationInput(f.env,'v');
  await applyMemoryExtraction(f.env,'v',input,complete([{category:'nina_autobiography',content:'Nina fixed a cable before a show.',evidence_message_ids:['life'],decision:'REJECT'}]));
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM nina_journal_entries').get().n,0);
});


test('excluded-only technical batches checkpoint without model calls or personal-memory writes', async t=>{
 const f=fixture(t);
 f.sqlite.prepare('INSERT INTO memory_summaries VALUES (?,?,?,?)').run('v','Alejandro enjoys cooking tacos.','2026-01-01',null);
 f.message('pause','user','vladimirninotchka');f.message('tech','user','My real name is Backend Debugger.');f.message('reply','persona','I fixed my system prompt.');
 f.env.AI={async run(){assert.fail('excluded data must never be sent to the archivist');}};
 const input=await loadConsolidationInput(f.env,'v');
 assert.equal(input.messages.length,3);assert.equal(input.safeMessages.length,0);
 const result=await consolidateMemory(f.env,'v');
 assert.equal(result.consolidated,true);assert.equal(result.messageCount,3);
 assert.equal(f.sqlite.prepare('SELECT summary FROM memory_summaries').get().summary,'Alejandro enjoys cooking tacos.');
 assert.equal(f.sqlite.prepare('SELECT messages_summarized_through FROM memory_summaries').get().messages_summarized_through,'reply');
 for(const table of ['pinned_memories','open_threads','nina_journal_entries']) assert.equal(f.sqlite.prepare(`SELECT count(*) n FROM ${table}`).get().n,0);
 assert.equal(f.sqlite.prepare('SELECT count(*) n FROM messages').get().n,3);
 assert.equal((await consolidateMemory(f.env,'v')).reason,'no_messages');
});
test('consolidation resets construction exclusion at the actual conversation boundary', async t=>{
 const f=fixture(t);f.message('technical','persona',"I'm an AI.");
 f.sqlite.exec("INSERT INTO conversations VALUES('next','v','2026-01-02','2026-01-03')");
 f.message('life','persona','I repaired a studio cable.','next');
 const input=await loadConsolidationInput(f.env,'v');
 assert.deepEqual(input.safeMessages.map(m=>m.message_id),['life']);
});
