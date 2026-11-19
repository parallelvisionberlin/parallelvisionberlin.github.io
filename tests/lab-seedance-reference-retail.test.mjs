import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {creditsForJobMicros,isFixedReferenceRetail} from '../lab-worker/job-pricing.mjs';
const sql=p=>readFileSync(new URL('../lab-worker/'+p,import.meta.url),'utf8');
const user='user_ReferenceRetail';
const model='bytedance/seedance-2.5/reference-to-video';
const now=Date.UTC(2026,10,19,15);
function settings(input=13,output=5,fixed=true){
 return {type:'video',engine:'seedance',mode:'reference',model,resolution:'720p',
   duration:output,audio:true,referenceVideoIds:['source-mp4'],referenceSourceIds:['one','two','three','four','five'],
   ...(fixed?{referenceFixedChargeVersion:'reference-seconds-v1',referenceBillableVideoSeconds:input}:{})};
}
function fixture(t){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 db.exec(sql('schema.sql'));
 for(const file of ['0006-customers-billing','0011-customer-lifecycle',
   '0015-lab-promotional-credits','0024-owner-acquisition','0025-promo-generation-holds',
   '0020-wan-seedance-budget-pricing','0021-spicy-image-credit-steps',
   '0028-generation-finance-ledger','0029-pricing-debit-parity',
   '0062-transform-seedance-credit-parity','0063-transform-final-credit-settlement',
   '0064-transform-source-seconds-retail','0065-reference-video-source-seconds-retail'])
   db.exec(sql('migrations/'+file+'.sql'));
 const run=(s,...v)=>db.prepare(s).run(...v);
 const get=(s,...v)=>db.prepare(s).get(...v);
 run('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)',user,user,now,now);
 run("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('seed-funds',?,10000,'purchase','checkout:seed',?)",user,now);
 const balance=()=>get('SELECT balance_credits AS n FROM lab_customers WHERE id=?',user).n;
 function job(id,params=settings(),maximum=5806500,charge=creditsForJobMicros(maximum,params)){
  run("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'submitting',?,?,?)",
    id,user,JSON.stringify({...params,customerChargeCredits:charge}),maximum,now+1,now+1);
 }
 const charged=id=>get("SELECT -delta_credits AS n FROM lab_credit_entries WHERE reference='job:'||?",id)?.n;
 return {db,run,get,balance,job,charged};
}
test('12.38s source rounds to 13s; five image references cost no extra seconds',t=>{
 const f=fixture(t),p=settings();
 assert.equal(isFixedReferenceRetail(p),true);
 assert.equal(creditsForJobMicros(5806500,p),478);
 f.job('video');
 assert.equal(f.charged('video'),478);
 assert.equal(f.balance(),9522);
 assert.equal(f.get("SELECT COUNT(*) AS n FROM lab_transform_credit_holds WHERE job_id='video'").n,0);
 f.run("UPDATE jobs SET state='completed',settled_cost=2.9862 WHERE id='video'");
 assert.equal(f.balance(),9522,'No customer refund on owner preauthorization settlement');
});
test('failed reference job refunds its fixed retail charge once',t=>{
 const f=fixture(t);f.job('failed');
 f.run("UPDATE jobs SET state='failed' WHERE id='failed'");
 assert.equal(f.balance(),10000);
 f.run("UPDATE jobs SET state='queued' WHERE id='failed'");
 f.run("UPDATE jobs SET state='failed' WHERE id='failed'");
 assert.equal(f.balance(),10000);
 assert.equal(f.get("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference='refund:job:failed'").n,1);
});
test('tampered browser price and invalid fixed metadata fail closed',t=>{
 const f=fixture(t);
 assert.throws(()=>f.job('wrong-price',settings(),5806500,930),/quote and debit disagree/);
 assert.throws(()=>f.job('invalid-seconds',settings(31)),/Invalid Reference video fixed retail quote/);
 assert.throws(()=>f.job('missing-refs',{...settings(),referenceVideoIds:[]}),/Invalid Reference video fixed retail quote/);
 assert.equal(f.balance(),10000);
 assert.equal(f.get("SELECT COUNT(*) AS n FROM jobs").n,0);
});
test('provider reservation bounds and output durations retain exact JS to SQLite parity',t=>{
 const f=fixture(t);
 for(const [resolution,rate] of [['480p',73800],['720p',165900],['1080p',408200]]){
  for(const seconds of [4,5,12,30]){
   const input=13,max=(30+seconds)*rate,p={...settings(input,seconds),resolution};
   const expected=Math.ceil((input+seconds)*rate*160/1000000);
   assert.equal(creditsForJobMicros(max,p),expected);
   const id=resolution+'-'+seconds;f.job(id,p,max);assert.equal(f.charged(id),expected);
  }
 }
});
test('Reference without motion video keeps its original quote behavior',t=>{
 const f=fixture(t),p={...settings(13,5,false),referenceVideoIds:[],referenceSourceIds:['one','two']};
 assert.equal(isFixedReferenceRetail(p),false);
 assert.equal(creditsForJobMicros(2773000,p),444);
 f.job('image-only',p,2773000);
 assert.equal(f.charged('image-only'),444);
});
