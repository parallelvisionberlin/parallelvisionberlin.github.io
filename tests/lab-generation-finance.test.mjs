import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {labAdminRoute} from '../lab-worker/promotions.mjs';

const oldDay=Date.UTC(2026,9,16,17,0);
const read=p=>readFileSync(new URL('../lab-worker/'+p,import.meta.url),'utf8');
function fixture(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  db.exec(read('schema.sql'));
  for(const m of [
    '0006-customers-billing','0011-customer-lifecycle',
    '0015-lab-promotional-credits','0024-owner-acquisition',
    '0025-promo-generation-holds'
  ])db.exec(read('migrations/'+m+'.sql'));
  const prepare=sql=>({bind(...args){const stmt=db.prepare(sql);return {
    first:async()=>stmt.get(...args)||null,
    all:async()=>({results:stmt.all(...args)}),
    run:async()=>({meta:{changes:stmt.run(...args).changes}})
  };}});
  const env={LAB_DB:{prepare},OWNER_DB:{prepare(){return {bind(owner){
    return {first:async()=>owner==='owner_live'?{id:owner}:null};
  }};}}};
  const insert=(sql,...args)=>db.prepare(sql).run(...args);
  const get=(sql,...args)=>db.prepare(sql).get(...args);
  const account=(id,createdAt=Date.now())=>
    insert('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)',id,id,createdAt,createdAt);
  const admin=(route,owner='owner_live')=>labAdminRoute(
    new Request('https://parallel-vision-lab.parallelvision.workers.dev'+route),env,owner
  );
  return {db,env,insert,get,account,admin,install:()=>db.exec(read('migrations/0028-generation-finance-ledger.sql'))};
}

test('deleting job, prompt and generated asset never deletes observed provider cost and count',async t=>{
  const f=fixture(t),id='user_Durable';
  f.account(id);
  f.install();
  const now=Date.now(),job='job-durable-00001';
  f.insert('INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,?,?,?,?)',
    'welcome:'+id,id,200,'adjustment','welcome:'+id,now);
  const aid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  f.insert('INSERT INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,?,?,?,?,?)',
    aid,id,id+'/results/result.png','source','image/png','file.png',42,now);
  f.insert('INSERT INTO jobs(id,owner_id,output_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',
    job,id,aid,JSON.stringify({provider:'spicy',type:'image',prompt:'DELETE THIS SECRET PROMPT',
      sourceUrl:'https://private.example/secret/reference.jpg'}),'queued',36000,now,now);
  assert.equal(f.get('SELECT last_state FROM lab_generation_finance WHERE job_id=?',job).last_state,'queued');
  f.insert('UPDATE jobs SET state=?,settled_cost=?,updated_at=? WHERE id=?','completed',0.028,now+10,job);
  let report=await (await f.admin('/api/admin/acquisition?days=7')).json();
  assert.equal(report.summary.completedJobs,1);
  assert.equal(report.summary.providerExposureUsd,0.028);
  assert.equal(report.summary.archivedJobs,0);
  f.insert('DELETE FROM jobs WHERE id=?',job);
  f.insert('DELETE FROM assets WHERE id=?',aid);
  assert.equal(f.get('SELECT COUNT(*) AS n FROM jobs WHERE owner_id=?',id).n,0);
  assert.equal(f.get('SELECT COUNT(*) AS n FROM assets WHERE owner_id=?',id).n,0);
  report=await (await f.admin('/api/admin/acquisition?days=7')).json();
  assert.equal(report.summary.completedJobs,1,'Completion survives creative deletion');
  assert.equal(report.summary.providerExposureUsd,0.028,'Settled cost survives creative deletion');
  assert.equal(report.summary.archivedJobs,1);
  assert.equal(report.summary.archivedExposureUsd,0.028);
  assert.equal(report.customers.find(x=>x.id===id).completedJobs,1);
  assert.equal(report.customers.find(x=>x.id===id).archivedJobs,1);
  const activity=await (await f.admin('/api/admin/customers/activity?customerId='+id)).json();
  assert.equal(activity.summary.completedJobs,1);
  assert.equal(activity.summary.archivedJobs,1);
  assert.equal(activity.jobs.length,0,'Deleted creative job cannot be reopened');
  assert.equal(activity.archivedFinance.length,1);
  assert.deepEqual(activity.archivedFinance[0].state,'completed');
  assert.equal(activity.archivedFinance[0].exposureUsd,0.028);
  assert.equal(activity.archivedFinance[0].costKind,'settled');
  assert.ok(!JSON.stringify(activity).includes('DELETE THIS SECRET PROMPT'));
  assert.ok(!JSON.stringify(activity).includes('https://private.example/'));
  const snapshot=f.get('SELECT * FROM lab_generation_finance WHERE job_id=?',job);
  assert.equal(snapshot.provider,'spicy');
  assert.equal(snapshot.tool_kind,'image');
  assert.equal(snapshot.last_state,'completed');
  assert.ok(Number(snapshot.deleted_at)>0);
  assert.ok(!JSON.stringify(snapshot).includes('DELETE THIS SECRET PROMPT'));
  assert.ok(!JSON.stringify(snapshot).includes('/results/result.png'));
});

test('reconstructs only the seven verified 16 October completions, excluding refunded jobs',async t=>{
  const f=fixture(t),id='user_Archived',other='user_Other';
  f.account(id,oldDay);f.account(other,oldDay);
  f.insert('INSERT INTO lab_promo_generation_holds(customer_id,reason,created_at) VALUES(?,?,?)',
    id,'disposable-email',oldDay);
  f.insert('INSERT INTO spend(job_id,owner_id,estimate_microusd,created_at) VALUES(?,?,?,?)',
    'gone_success',id,36000,oldDay);
  f.insert('INSERT INTO spend(job_id,owner_id,estimate_microusd,created_at) VALUES(?,?,?,?)',
    'gone_refund',id,36000,oldDay);
  f.insert('INSERT INTO spend(job_id,owner_id,estimate_microusd,created_at) VALUES(?,?,?,?)',
    'other_unknown',other,48000,oldDay);
  f.insert('INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,?,?,?,?)',
    'welcome:'+id,id,200,'adjustment','welcome:'+id,oldDay);
  f.insert('INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,?,?,?,?)',
    'bill_success',id,-20,'generation','job:gone_success',oldDay);
  f.insert('INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,?,?,?,?)',
    'bill_failed',id,-20,'generation','job:gone_refund',oldDay);
  f.insert('INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,?,?,?,?)',
    'refund_failed',id,20,'refund','refund:job:gone_refund',oldDay);
  f.install();f.install();
  const a=f.get('SELECT last_state,estimated_microusd,origin FROM lab_generation_finance WHERE job_id=?','gone_success');
  const b=f.get('SELECT last_state FROM lab_generation_finance WHERE job_id=?','gone_refund');
  const otherRow=f.get('SELECT last_state FROM lab_generation_finance WHERE job_id=?','other_unknown');
  assert.deepEqual({...a},{last_state:'reconstructed_completed',estimated_microusd:36000,origin:'reconstructed'});
  assert.equal(b.last_state,'failed');
  assert.equal(otherRow.last_state,'unknown','Unrelated deleted job must not be asserted completed');
  assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_generation_finance').n,3,'Migration is repeat-safe');
  const activity=await (await f.admin('/api/admin/customers/activity?customerId='+id)).json();
  assert.equal(activity.summary.totalJobs,2);
  assert.equal(activity.summary.completedJobs,1);
  assert.equal(activity.summary.failedJobs,1);
  assert.equal(activity.summary.providerExposureUsd,0.036);
  assert.equal(activity.summary.reconstructedCompleted,1);
  assert.equal(activity.archivedFinance.length,2);
  assert.equal(activity.jobs.length,0);
  await assert.rejects(()=>f.admin('/api/admin/customers/activity?customerId='+id,'user_Attacker'),
    /owner access required/i);
});

test('failed jobs do not create fictional vendor exposure after deletion',async t=>{
  const f=fixture(t),id='user_Failure';
  f.account(id);
  f.install();
  const now=Date.now();
  f.insert('INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,?,?,?,?)',
    'gift:'+id,id,200,'adjustment','gift:'+id,now);
  f.insert('INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',
    'job_failed_current',id,'{"type":"video","prompt":"NEVER LEAK"}','queued',35000,now,now);
  f.insert('UPDATE jobs SET state=?,updated_at=? WHERE id=?','failed',now+2,'job_failed_current');
  f.insert('DELETE FROM jobs WHERE id=?','job_failed_current');
  const result=await (await f.admin('/api/admin/acquisition?days=7')).json();
  assert.equal(result.summary.completedJobs,0);
  assert.equal(result.summary.providerExposureUsd,0);
  assert.equal(result.summary.archivedJobs,1);
  assert.equal(result.customers.find(c=>c.id===id).failedJobs,1);
});

test('failed generation with confirmed provider cost stays visible after credit restoration and deletion',async t=>{
 const f=fixture(t),id='user_PaidFailure';f.account(id);f.install();const at=Date.now();
 f.insert('INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,?,?,?,?)','audit_credit',id,1000,'adjustment','audit_credit',at);
 f.insert('INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,?,?,?,?)','audit_job',id,'{"provider":"spicy","type":"video"}','queued',250000,at,at);
 f.insert('UPDATE jobs SET state=?,settled_cost=?,updated_at=? WHERE id=?','failed',0.25,at+1,'audit_job');
 assert.equal(f.get('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,1000);
 f.insert('DELETE FROM jobs WHERE id=?','audit_job');
 const report=await(await f.admin('/api/admin/acquisition?days=7')).json();assert.equal(report.summary.providerExposureUsd,0.25);
 const activity=await(await f.admin('/api/admin/customers/activity?customerId='+id)).json();assert.equal(activity.summary.providerExposureUsd,0.25);assert.equal(activity.archivedFinance[0].costKind,'settled');
});
