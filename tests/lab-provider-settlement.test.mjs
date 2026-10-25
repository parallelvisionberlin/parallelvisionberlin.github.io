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


import {reconcileProviderSettlements} from '../lab-worker/provider-settlement.mjs';
function pendingFixture(t){const f=fixture(t);f.account('user_Pending');f.install();f.db.exec(read('migrations/0041-provider-settlement.sql'));f.db.exec(read('migrations/0041-provider-settlement.sql'));f.env.LAB_DB.batch=async statements=>{f.db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());f.db.exec('COMMIT');return results;}catch(e){f.db.exec('ROLLBACK');throw e;}};return f;}
function terminal(f,id){const at=Date.now();f.insert('INSERT INTO jobs(id,owner_id,params,state,provider_id,estimate_microusd,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',id,'user_Pending','{"provider":"spicy","type":"video"}','queued','task_'+id,0,at,at);f.insert('UPDATE jobs SET state=? WHERE id=?','failed',id);}
test('late positive settlement survives deletion, preserves failed state and never changes credits',async t=>{
 const f=pendingFixture(t);terminal(f,'late');f.insert('DELETE FROM jobs WHERE id=?','late');let calls=0;
 const fetchSettlement=async job=>{calls++;assert.equal(job.provider_task_id,'task_late');return {settled:true,cost:0.25};};
 await reconcileProviderSettlements(f.env,{fetchSettlement,at:100});await reconcileProviderSettlements(f.env,{fetchSettlement,at:200});
 assert.equal(calls,1);assert.equal(f.get('SELECT settled_cost_usd FROM lab_generation_finance WHERE job_id=?','late').settled_cost_usd,0.25);
 assert.equal(f.get('SELECT last_state FROM lab_generation_finance WHERE job_id=?','late').last_state,'failed');assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_credit_entries').n,0);
});
test('unconfirmed costs back off and zero is accepted only with authoritative final settlement',async t=>{
 const f=pendingFixture(t);terminal(f,'zero');let calls=0;const fetchSettlement=async()=>{calls++;return calls===1?{settled:false,cost:0}:{settled:true,cost:0};};
 await reconcileProviderSettlements(f.env,{fetchSettlement,at:100});assert.equal(f.get('SELECT settled_cost_usd FROM lab_provider_settlements').settled_cost_usd,null);
 await reconcileProviderSettlements(f.env,{fetchSettlement,at:200});assert.equal(calls,1);
 await reconcileProviderSettlements(f.env,{fetchSettlement,at:30101});assert.equal(calls,2);assert.equal(f.get('SELECT settled_cost FROM jobs').settled_cost,0);
});
test('provider errors do not refund, resubmit or fabricate free failures',async t=>{
 const f=pendingFixture(t);terminal(f,'error');await reconcileProviderSettlements(f.env,{fetchSettlement:async()=>{throw Error('offline');},at:100});
 assert.equal(f.get('SELECT settled_cost_usd FROM lab_provider_settlements').settled_cost_usd,null);assert.equal(f.get('SELECT state FROM jobs').state,'failed');assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_credit_entries').n,0);
});
