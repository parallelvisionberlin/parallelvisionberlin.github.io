import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {NANO21_MODEL,NANO21_CREDITS,NANO21_STANDARD_MICROS,isNano21Job,nano21Request,nano21ImagePart} from '../lab-worker/nano-banana-21.mjs';
import {creditsForJobUsd} from '../lab-worker/job-pricing.mjs';
const model={type:'image',provider:'gemini',engine:'gemini21',model:NANO21_MODEL,processing:'normal',resolution:'2k',aspectRatio:'16:9'};
test('Google Interactions request preserves photos, reference instructions and response image',()=>{
  assert.deepEqual(nano21Request(model,[{text:'Portrait'},{inlineData:{mimeType:'image/png',data:'dGVzdA=='}}]),
    {model:NANO21_MODEL,input:[{type:'text',text:'Portrait'},{type:'image',mime_type:'image/png',data:'dGVzdA=='}],
     response_format:{type:'image',image_size:'2K',aspect_ratio:'16:9'}});
  assert.deepEqual(nano21ImagePart({status:'completed',steps:[{type:'model_output',content:[{type:'image',mime_type:'image/png',data:'dGVzdA=='}]}]}),{mime:'image/png',data:'dGVzdA=='});
  assert.throws(()=>nano21ImagePart({status:'in_progress'}),/did not confirm/);
  assert.equal(isNano21Job({...model,provider:'spicy'}),false);
});
test('2.1 credits are fixed only for exact model, and existing models retain prices',()=>{
  for(const [res,credits] of Object.entries(NANO21_CREDITS))
    assert.equal(creditsForJobUsd(NANO21_STANDARD_MICROS[res]/1e6,{...model,resolution:res}),credits);
  assert.equal(creditsForJobUsd(.134,{...model,model:'gemini-3-pro-image'}),62);
  assert.equal(creditsForJobUsd(.134,{...model,provider:'spicy'}),62);
});
test('D1 future customer generation charges, Pro fallback and refunds match quoted amounts',t=>{
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  for(const name of ['schema.sql','migrations/0006-customers-billing.sql','migrations/0008-soul-id-launch-credits.sql',
    'migrations/0012-video-tiered-pricing.sql','migrations/0013-nano-banana-21-pricing.sql']){
    db.exec(readFileSync(new URL('../lab-worker/'+name,import.meta.url),'utf8'));
  }
  const migration=readFileSync(new URL('../lab-worker/migrations/0013-nano-banana-21-pricing.sql',import.meta.url),'utf8');
  db.exec(migration);
  const now=Date.now(),user='user_NanoTest';
  db.prepare('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)').run(user,user,now,now);
  db.prepare("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('funds',?,10000,'purchase','checkout:nano',?)").run(user,now);
  const put=(id,p,cost,owner=user)=>db.prepare("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'submitting',?,?,?)").run(id,owner,JSON.stringify(p),cost,now,now);
  const debit=id=>db.prepare("SELECT delta_credits AS n FROM lab_credit_entries WHERE reference='job:'||?").get(id)?.n;
  for(const [res,cost,credits] of [['1k',33600,8],['2k',50400,10],['4k',113000,20]]){
    put(res,{...model,resolution:res},cost);assert.equal(debit(res),-credits);
  }
  put('pro',{...model,engine:'gemini',model:'gemini-3-pro-image'},134000);assert.equal(debit('pro'),-62);
  put('spoof',{...model,provider:'spicy'},50400);assert.equal(debit('spoof'),-24);
  put('owner',model,50400,'private-owner');assert.equal(debit('owner'),undefined);
  assert.equal(db.prepare('SELECT balance_credits AS n FROM lab_customers WHERE id=?').get(user).n,9876);
  db.prepare("UPDATE jobs SET state='failed' WHERE id='2k'").run();
  assert.equal(db.prepare('SELECT balance_credits AS n FROM lab_customers WHERE id=?').get(user).n,9886);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference='refund:job:2k'").get().n,1);
});
