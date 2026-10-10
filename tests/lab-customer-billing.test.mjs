import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {creditsForUsd,PACKS,verifyStripeEvent} from '../lab-worker/customer-billing.mjs';

test('credit price uses one fixed multiplier, rounds up and never sells a zero-credit job',()=>{
  assert.equal(creditsForUsd(.018),9);
  assert.equal(creditsForUsd(.45),207);
  assert.equal(creditsForUsd(.0057),7);
  assert.throws(()=>creditsForUsd(-1),/Invalid/);
  assert.equal(PACKS.topup10.cents,1000);
  assert.equal(PACKS.topup10.credits,1000);
  assert.equal(PACKS.studio.credits,12000);
});
test('signed Stripe events require HMAC SHA256 over the exact raw payload and a fresh timestamp',async()=>{
  const secret='whsec_example_not_a_real_key',payload=JSON.stringify({id:'evt_abc123',type:'checkout.session.completed',data:{object:{}}});
  const stamp=String(Math.floor(Date.now()/1000)),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(stamp+'.'+payload))),n=>n.toString(16).padStart(2,'0')).join('');
  const request=(body,t=stamp,s=signature)=>new Request('https://example.com/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':'t='+t+',v1='+s},body});
  assert.equal((await verifyStripeEvent({LAB_STRIPE_WEBHOOK_SECRET:secret},request(payload))).type,'checkout.session.completed');
  await assert.rejects(()=>verifyStripeEvent({LAB_STRIPE_WEBHOOK_SECRET:secret},request(payload+' ')),/Invalid Stripe signature/);
  await assert.rejects(()=>verifyStripeEvent({LAB_STRIPE_WEBHOOK_SECRET:secret},request(payload,String(Number(stamp)-601))),/Invalid Stripe signature/);
});
test('SQLite wallet debits and refund happen atomically across job routes and webhook ledger',async(t)=>{
  let sqlite;try{sqlite=await import('node:sqlite');}catch{t.skip('node:sqlite not installed');return;}
  const db=new sqlite.DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../lab-worker/schema.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../lab-worker/migrations/0006-customers-billing.sql',import.meta.url),'utf8'));
  const sql=(q,...args)=>db.prepare(q).run(...args);
  const get=(q,...args)=>db.prepare(q).get(...args);
  sql('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,1,1)','user_abc','user_abc');
  sql("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('p1','user_abc',1000,'purchase','checkout:cs_1',1)");
  assert.equal(get("SELECT balance_credits AS n FROM lab_customers WHERE id='user_abc'").n,1000);
  // Retry of the same Stripe session is ignored by the unique receipt reference.
  sql("INSERT OR IGNORE INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('p2','user_abc',1000,'purchase','checkout:cs_1',2)");
  assert.equal(get("SELECT balance_credits AS n FROM lab_customers WHERE id='user_abc'").n,1000);
  sql("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES('job-1','user_abc','{}','queued',450000,3,3)");
  assert.equal(get("SELECT balance_credits AS n FROM lab_customers WHERE id='user_abc'").n,793);
  assert.equal(get("SELECT delta_credits AS n FROM lab_credit_entries WHERE reference='job:job-1'").n,-207);
  assert.throws(()=>sql("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES('job-2','user_abc','{}','queued',999000000,4,4)"),/Insufficient PV Lab credits/);
  assert.equal(get("SELECT COUNT(*) AS n FROM jobs WHERE id='job-2'").n,0);
  sql("UPDATE jobs SET state='failed' WHERE id='job-1'");
  assert.equal(get("SELECT balance_credits AS n FROM lab_customers WHERE id='user_abc'").n,1000);
  sql("UPDATE jobs SET state='failed' WHERE id='job-1'");
  assert.equal(get("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference='refund:job:job-1'").n,1);
  sql("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES('owner-job','private-owner-id','{}','queued',450000,5,5)");
  assert.equal(get("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference='job:owner-job'").n,0);
  db.close();
});
