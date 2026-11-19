import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
const sql=p=>readFileSync(new URL('../lab-worker/'+p,import.meta.url),'utf8');
const person='user_TransformSettlement';
const ts=Date.UTC(2026,10,19,1);
const transform={type:'video',provider:'spicy',engine:'seedance',mode:'transform',
 model:'bytedance/seedance-2.5/video-edit',resolution:'720p',sourceDurationSeconds:12};
function fixture(t){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 db.exec(sql('schema.sql'));
 for(const id of ['0006-customers-billing','0020-wan-seedance-budget-pricing',
   '0021-spicy-image-credit-steps','0028-generation-finance-ledger',
   '0029-pricing-debit-parity','0062-transform-seedance-credit-parity',
   '0063-transform-final-credit-settlement']){
  db.exec(sql('migrations/'+id+'.sql'));
 }
 db.prepare('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)')
  .run(person,person,ts,ts);
 db.prepare("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('purchase',?,10000,'purchase','purchase',?)").run(person,ts);
 const write=(query,...args)=>db.prepare(query).run(...args);
 const get=(query,...args)=>db.prepare(query).get(...args);
 const balance=()=>get('SELECT balance_credits AS b FROM lab_customers WHERE id=?',person).b;
 function job(id='transform',p=transform){
  write("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'submitting',?,?,?)",
   id,person,JSON.stringify({...p,customerChargeCredits:p.mode==='transform'&&p.provider==='spicy'?2189:6293}),13680000,ts,ts);
  return id;
 }
 return {db,write,get,balance,job};
}
test('12s edit reserves 2189 credits but returns 1313 after confirmed $5.472 completed charge',t=>{
 const f=fixture(t);f.job();
 assert.equal(f.balance(),7811);
 assert.equal(f.get("SELECT credits_held AS held FROM lab_transform_credit_holds WHERE job_id='transform'").held,2189);
 f.write("UPDATE jobs SET state='running',settled_cost=5.472 WHERE id='transform'");
 assert.equal(f.balance(),7811,'settled data alone must not release before completion');
 f.write("UPDATE jobs SET state='completed' WHERE id='transform'");
 assert.equal(f.balance(),9124);
 assert.equal(f.get("SELECT delta_credits AS c FROM lab_credit_entries WHERE reference='settlement:job:transform'").c,1313);
 f.write("UPDATE jobs SET settled_cost=5.472 WHERE id='transform'");
 f.write("UPDATE jobs SET state='completed' WHERE id='transform'");
 f.write("UPDATE jobs SET settled_cost=5.472 WHERE id='transform'");
 assert.equal(f.balance(),9124,'repeated INSERT OR REPLACE finance snapshots must never recredit wallet');
 assert.equal(f.get("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference='settlement:job:transform'").n,1);
});
test('survives deleting History: final provider readback credits completed job with durable claim',t=>{
 const f=fixture(t);f.job('deleted');
 f.write("UPDATE jobs SET state='completed' WHERE id='deleted'");
 assert.equal(f.balance(),7811);
 f.write("DELETE FROM jobs WHERE id='deleted'");
 f.write("UPDATE lab_generation_finance SET settled_cost_usd=5.472 WHERE job_id='deleted'");
 assert.equal(f.balance(),9124);
 assert.equal(f.get("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference='settlement:job:deleted'").n,1);
});
test('unknown or failed jobs retain safeguards and never receive early/double refund',t=>{
 const f=fixture(t);f.job('fail');
 f.write("UPDATE jobs SET state='failed' WHERE id='fail'");
 assert.equal(f.balance(),10000);
 f.write("UPDATE lab_generation_finance SET settled_cost_usd=0 WHERE job_id='fail'");
 assert.equal(f.balance(),10000);
 assert.equal(f.get("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference='settlement:job:fail'").n,0);
});
test('rare completed-then-failed state refunds remaining hold rather than full debit twice',t=>{
 const f=fixture(t);f.job('latefail');
 f.write("UPDATE jobs SET settled_cost=5.472,state='completed' WHERE id='latefail'");
 assert.equal(f.balance(),9124);
 f.write("UPDATE jobs SET state='failed' WHERE id='latefail'");
 assert.equal(f.balance(),10000);
 assert.equal(f.get("SELECT delta_credits AS c FROM lab_credit_entries WHERE reference='refund:job:latefail'").c,876);
});
test('unrelated providers/models never gain Transform settlement rebates',t=>{
 const f=fixture(t);
 const p={...transform,mode:'reference',model:'bytedance/seedance-2.5/reference-to-video'};
 f.write("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'submitting',?,?,?)",
  'other',person,JSON.stringify({...p,customerChargeCredits:2189}),13680000,ts,ts);
 f.write("UPDATE jobs SET state='completed',settled_cost=5.472 WHERE id='other'");
 assert.equal(f.balance(),7811);
 assert.equal(f.get("SELECT COUNT(*) AS n FROM lab_transform_credit_holds WHERE job_id='other'").n,0);
});
