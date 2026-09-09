import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, NOW, PUBLIC_CALL } from './fixture.js';
import { runAuditTool, rangeFor, readOnlyEnvironment, TOOLS } from '../src/read.js';

test('Every advertised tool is read only and no SQL tool is exposed',()=>{
 assert.ok(TOOLS.length>=4);assert.ok(TOOLS.every(t=>t.annotations.readOnlyHint===true));
 assert.ok(TOOLS.every(t=>!('sql' in t.inputSchema.properties)));
});
test('Berlin midnight and 23/25-hour calendar days differ from rolling windows',()=>{
 assert.equal(rangeFor({day:'2026-09-09'},NOW).start,'2026-09-08T22:00:00.000Z');
 const spring=rangeFor({day:'2026-03-29'},NOW);assert.equal(Date.parse(spring.end)-Date.parse(spring.start),23*3600000);
 const autumn=rangeFor({day:'2026-10-25'},Date.parse('2026-11-01'));assert.equal(Date.parse(autumn.end)-Date.parse(autumn.start),25*3600000);
 for(const args of [{day:'2026-02-31'},{from:'2026-09-08',to:'2026-09-09'}, {day:'2026-09-09',to:'2026-09-09T10:00Z'}, {from:'2026-01-01T00:00Z',to:'2026-09-01T00:00Z'}])assert.throws(()=>rangeFor(args,NOW));
});
test('Search defaults to public records, all pages are retrievable, and a name finds its account',async()=>{
 const f=fixture();try{
 const first=await runAuditTool(f.env,'search',{day:'2026-09-09',limit:1},NOW);
 assert.equal(first.results.length,1);assert.equal(first.nextOffset,1);
 const second=await runAuditTool(f.env,'search',{day:'2026-09-09',limit:1,offset:first.nextOffset},NOW);
 assert.equal(second.results.length,1);assert.equal(second.nextOffset,null);assert.notEqual(first.results[0].id,second.results[0].id);
 const all=await runAuditTool(f.env,'search',{include_owner:true},NOW);assert.equal(all.results.length,3);
 const one=await runAuditTool(f.env,'search',{query:'public-a'},NOW);assert.equal(one.results[0].user_id,'public-a');
 const evil=await runAuditTool(f.env,'search',{query:"%' OR 1=1 --"},NOW);assert.equal(evil.results.length,0);
 }finally{f.sqlite.close();}
});
test('Full verbatim transcript across pages, original roles and no cross-user records',async()=>{
 const f=fixture();try{
 let offset=0,m=[];
 do{const d=await runAuditTool(f.env,'fetch',{id:'conversation:conversation-public-a',offset,limit:2},NOW);m.push(...d.records);offset=d.nextOffset;assert.equal(d.totalMessages,5);}while(offset!==null);
 assert.equal(m.length,5);assert.equal(new Set(m.map(r=>r.message_id)).size,5);assert.ok(m.every(r=>r.content.startsWith('public-a')));assert.equal(m[0].role,'persona');
 }finally{f.sqlite.close();}
});
test('Calls, linked dossier and raw billing/ledger/checkout preserve their different meanings',async()=>{
 const f=fixture();try{
 const calls=await runAuditTool(f.env,'list_calls',{user_id:'public-a'},NOW);assert.equal(calls.records.length,1);
 const d=await runAuditTool(f.env,'fetch',{id:'call:'+PUBLIC_CALL},NOW);assert.equal(d.transcript.length,5);assert.equal(d.live.creditsDebited,10);
 const bill=await runAuditTool(f.env,'account_activity',{user_id:'public-a',kind:'billing_sessions'},NOW);assert.equal(bill.records[0].credits_debited,10);
 const credits=await runAuditTool(f.env,'account_activity',{user_id:'public-a',kind:'credits'},NOW);assert.equal(credits.records.length,2);
 const purchases=await runAuditTool(f.env,'account_activity',{user_id:'public-a',kind:'purchases'},NOW);assert.equal(purchases.records.length,0);
 assert.ok(f.queries.every(q=>/^\s*(SELECT|WITH)/.test(q)));
 }finally{f.sqlite.close();}
});
test('No arbitrary writes, unknown tool/table or malformed IDs; reads leave the database unchanged',async()=>{
 const f=fixture();try{
 const before=f.sqlite.prepare('SELECT total_changes() AS n').get().n;
 const ro=readOnlyEnvironment(f.env).NINA_MEMORY_DB;
 assert.throws(()=>ro.prepare('DELETE FROM users'));
 assert.equal(ro.prepare('SELECT 1').run,undefined);assert.equal(ro.exec,undefined);assert.equal(ro.batch,undefined);
 for(const [name,args] of [['delete',{}],['fetch',{id:"conversation:x' OR 1=1"}],['account_activity',{user_id:'public-a',kind:'users;DELETE FROM users'}],['fetch',{id:'conversation:missing'}]])await assert.rejects(runAuditTool(f.env,name,args,NOW));
 await runAuditTool(f.env,'search',{},NOW);assert.equal(f.sqlite.prepare('SELECT total_changes() AS n').get().n,before);
 }finally{f.sqlite.close();}
});
test('Absent ancillary schema cannot turn a saved call into no transcript',async()=>{
 const f=fixture({drop:'nina_qualified_conversations'});try{
 const d=await runAuditTool(f.env,'fetch',{id:'call:'+PUBLIC_CALL},NOW);assert.equal(d.transcript.length,5);assert.equal(d.qualified,null);
 }finally{f.sqlite.close();}
});
