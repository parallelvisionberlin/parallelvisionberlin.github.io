import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {creditsForJobMicros,isFixedTransformRetail} from '../lab-worker/job-pricing.mjs';
const sql=p=>readFileSync(new URL('../lab-worker/'+p,import.meta.url),'utf8');
const customer='user_FixedRetailTransform';
const init=Date.UTC(2026,10,19,8);
const model='bytedance/seedance-2.5/video-edit';
function settings(seconds=13, fixed=true){
 return {type:'video',provider:'spicy',engine:'seedance',mode:'transform',
  transformType:'replace-character',model,resolution:'720p',
  sourceDurationSeconds:seconds===13?12.5:seconds,
  ...(fixed?{transformFixedChargeVersion:'source-seconds-v1',
   transformBillableSeconds:seconds}:{})};
}
function fixture(t){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 db.exec(sql('schema.sql'));
 for(const file of ['0006-customers-billing','0011-customer-lifecycle',
  '0015-lab-promotional-credits','0024-owner-acquisition','0025-promo-generation-holds',
  '0020-wan-seedance-budget-pricing','0021-spicy-image-credit-steps',
  '0028-generation-finance-ledger','0029-pricing-debit-parity',
  '0062-transform-seedance-credit-parity','0063-transform-final-credit-settlement',
  '0064-transform-source-seconds-retail'])db.exec(sql('migrations/'+file+'.sql'));
 db.prepare('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)')
   .run(customer,customer,init,init);
 db.prepare("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('purchase',?,10000,'purchase','checkout:test',?)").run(customer,init);
 const run=(s,...v)=>db.prepare(s).run(...v);
 const get=(s,...v)=>db.prepare(s).get(...v);
 const balance=()=>get('SELECT balance_credits AS n FROM lab_customers WHERE id=?',customer).n;
 function job(id='edit',s=settings(),price=creditsForJobMicros(13680000,s)){
  run("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'submitting',?,?,?)",
    id,customer,JSON.stringify({...s,customerChargeCredits:price}),13680000,init+1,init+1);
  return id;
 }
 const charged=id=>get("SELECT -delta_credits AS n FROM lab_credit_entries WHERE kind='generation' AND reference='job:'||?",id)?.n;
 return {db,run,get,balance,job,charged};
}
test('source 12.5s rounds to 13s and debits exactly 949 PV credits with no customer hold',t=>{
 const f=fixture(t),s=settings();
 assert.equal(isFixedTransformRetail(s),true);
 assert.equal(creditsForJobMicros(13680000,s),949);
 f.job('fixed');
 assert.equal(f.balance(),9051);
 assert.equal(f.charged('fixed'),949);
 assert.equal(f.get("SELECT COUNT(*) AS n FROM lab_transform_credit_holds WHERE job_id='fixed'").n,0);
 f.run("UPDATE jobs SET state='running',settled_cost=5.928 WHERE id='fixed'");
 f.run("UPDATE jobs SET state='completed' WHERE id='fixed'");
 f.run("UPDATE jobs SET settled_cost=5.928 WHERE id='fixed'");
 assert.equal(f.balance(),9051,'provider hold release must NEVER credit the customer twice');
 assert.equal(f.get("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference='settlement:job:fixed'").n,0);
});
test('fixed price stays fixed even if provider later settles above or below the estimate',t=>{
 const f=fixture(t);f.job('higher',settings());
 f.run("UPDATE jobs SET state='completed',settled_cost=8 WHERE id='higher'");
 assert.equal(f.balance(),9051);
 f.job('lower',settings());
 f.run("UPDATE jobs SET state='completed',settled_cost=5.5 WHERE id='lower'");
 assert.equal(f.balance(),8102);
 assert.equal(f.get("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE kind='refund'").n,0);
});
test('new failed Transform refunds its exact fixed 949 credits once',t=>{
 const f=fixture(t);f.job('failed');
 assert.equal(f.balance(),9051);
 f.run("UPDATE jobs SET state='failed' WHERE id='failed'");
 assert.equal(f.balance(),10000);
 f.run("UPDATE jobs SET state='queued' WHERE id='failed'");
 f.run("UPDATE jobs SET state='failed' WHERE id='failed'");
 assert.equal(f.balance(),10000);
 assert.equal(f.get("SELECT delta_credits AS n FROM lab_credit_entries WHERE reference='refund:job:failed'").n,949);
});
test('legacy Transform paid the full 30s hold and still receives its correct partial refund',t=>{
 const f=fixture(t);const s=settings(13,false);
 assert.equal(creditsForJobMicros(13680000,s),2189);
 f.job('legacy',s);
 assert.equal(f.balance(),7811);
 assert.equal(f.get("SELECT credits_held AS n FROM lab_transform_credit_holds WHERE job_id='legacy'").n,2189);
 f.run("UPDATE jobs SET state='completed',settled_cost=5.928 WHERE id='legacy'");
 assert.equal(f.balance(),9051);
 assert.equal(f.get("SELECT delta_credits AS n FROM lab_credit_entries WHERE reference='settlement:job:legacy'").n,1240);
});
test('price/debit tampering and invalid fixed metadata reject before a vendor job exists',t=>{
 const f=fixture(t),s=settings(),before=f.balance();
 assert.throws(()=>f.job('tampered',s,2189),/quote and debit disagree/);
 assert.throws(()=>f.job('invalid',{...s,transformBillableSeconds:31},949),/Invalid Transform fixed retail quote/);
 assert.equal(f.balance(),before);
 assert.equal(f.get("SELECT COUNT(*) AS n FROM jobs").n,0);
});
test('4s and 30s fixed retail bounds match integer DB calculations',t=>{
 const f=fixture(t);
 for(const seconds of [4,5,13,29,30]){
  const s=settings(seconds),expected=Math.ceil(13680000*seconds*160/30000000);
  assert.equal(creditsForJobMicros(13680000,s),expected);
  const id='duration'+seconds;f.job(id,s);
  assert.equal(f.charged(id),expected);
 }
});
