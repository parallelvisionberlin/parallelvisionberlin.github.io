import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {assertCustomerOpen,customerPromotionalReview} from '../lab-worker/customer-lifecycle.mjs';
import {customerSession,ensureCustomer} from '../lab-worker/customer-billing.mjs';
import {grantVerifiedWelcome} from '../lab-worker/welcome-guard.mjs';

const read=path=>readFileSync(new URL('../lab-worker/'+path,import.meta.url),'utf8');
function fixture(t){
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  db.exec(read('schema.sql'));
  for(const migration of [
    '0006-customers-billing','0011-customer-lifecycle','0015-lab-promotional-credits',
    '0023-welcome-guard','0025-promo-generation-holds','0029-pause-welcome-promotion'
  ]) db.exec(read('migrations/'+migration+'.sql'));
  const env={
    LAB_WELCOME_CREDITS_ENABLED:'false',LAB_FREE_TRIAL_PAUSED:'true',
    LAB_PROMO_HOLDS_ENABLED:'true',
    LAB_PUBLIC_GENERATION_ENABLED:'true',LAB_CHECKOUT_ENABLED:'true',
    LAB_STRIPE_SECRET_KEY:'sk_test_synthetic_not_a_real_key',
    LAB_STRIPE_WEBHOOK_SECRET:'whsec_synthetic_not_a_real_key',
    LAB_CUSTOMER_SPICY_API_KEY:'synthetic-test-api-key-not-a-real-secret',
    LAB_SECRET:'synthetic-test-secret-12345678901234567890123',
    LAB_DB:{prepare(sql){return {bind(...values){const stmt=db.prepare(sql);return {
      async first(){return stmt.get(...values)||null;},
      async all(){return {results:stmt.all(...values)};},
      async run(){const r=stmt.run(...values);return {meta:{changes:r.changes}};}
    };}};}}
  };
  const run=(sql,...values)=>db.prepare(sql).run(...values);
  const one=(sql,...values)=>db.prepare(sql).get(...values);
  const create=async id=>{await ensureCustomer(env,id);return id;};
  const verified=(id,email)=>run(
    'INSERT INTO lab_customer_contacts(customer_id,email,verified_at,synced_at) VALUES(?,?,?,?)',
    id,email,100,100
  );
  const addCredits=(id,kind,n,ref)=>run(
    'INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,?,?,?,?)',
    ref,id,n,kind,ref,1000
  );
  const submit=(id,job='job_test_unpaid')=>run(
    "INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'queued',36000,1001,1001)",
    job,id,JSON.stringify({type:'image',prompt:'PROTECTED TEST PROMPT'})
  );
  return {db,env,run,one,create,verified,addCredits,submit};
}

test('disabled welcome offer awards zero credits even with a verified customer',async t=>{
  const f=fixture(t),id=await f.create('user_TrialNew');
  f.verified(id,'new.customer@example.com');
  assert.equal(await grantVerifiedWelcome(f.env,id),false);
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,0);
  assert.equal(f.one('SELECT COUNT(*) AS n FROM lab_welcome_claims').n,0);
  assert.equal((await customerSession(f.env,id)).trialGenerationPaused,true);
  assert.equal((await customerSession(f.env,id)).welcomeCreditsPaused,true);
  assert.equal((await customerSession(f.env,id)).generationReady,false);
});

test('database silently rejects a stale Worker trying to grant new welcome credits',async t=>{
  const f=fixture(t),id=await f.create('user_StaleWorker');
  f.verified(id,'stale.worker@example.com');
  f.env.LAB_WELCOME_CREDITS_ENABLED='true';
  assert.equal(await grantVerifiedWelcome(f.env,id),false);
  assert.equal(f.one('SELECT COUNT(*) AS n FROM lab_welcome_claims').n,0);
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,0);
});

test('previously granted promotional balance remains intact and cannot fund a new job',async t=>{
  const f=fixture(t),id=await f.create('user_PreviouslyFree');
  f.addCredits(id,'adjustment',200,'welcome:'+id);
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,200);
  assert.equal((await customerSession(f.env,id)).generationReady,false);
  assert.equal((await customerPromotionalReview(f.env,id)).reason,'trial-paused');
  await assert.rejects(()=>assertCustomerOpen(f.env,id,{promotion:true}),/Complimentary generation is paused/);
  await assertCustomerOpen(f.env,id,{spending:true}); // Purchased checkout remains possible.
  assert.throws(()=>f.submit(id),/complimentary generation is paused/i);
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,200);
  assert.equal(f.one('SELECT COUNT(*) AS n FROM jobs WHERE owner_id=?',id).n,0);
});

test('purchasing credits restores all generation access without altering welcome receipts',async t=>{
  const f=fixture(t),id=await f.create('user_Buyer');
  f.addCredits(id,'adjustment',200,'welcome:'+id);
  f.addCredits(id,'purchase',1000,'checkout:testbuyer');
  assert.equal((await customerSession(f.env,id)).generationReady,true);
  assert.equal((await customerSession(f.env,id)).trialGenerationPaused,false);
  assert.equal((await customerPromotionalReview(f.env,id)).held,false);
  await assertCustomerOpen(f.env,id,{spending:true,promotion:true});
  f.submit(id,'job_paid_generating');
  assert.equal(f.one('SELECT COUNT(*) AS n FROM jobs WHERE owner_id=?',id).n,1);
  assert.ok(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits<1200);
  assert.equal(f.one("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE kind='purchase' AND customer_id=?",id).n,1);
});

test('owners are unaffected, and old jobs can complete without generating a new submission',async t=>{
  const f=fixture(t),id=await f.create('user_UnpaidDraft');
  assert.throws(()=>f.submit(id),/complimentary generation is paused/i);
  f.submit('user_OwnerOnly','job_owner_is_not_a_customer');
  assert.equal(f.one('SELECT COUNT(*) AS n FROM jobs WHERE id=?','job_owner_is_not_a_customer').n,1);
  // Non-customer owner jobs remain available while trial accounts are paused.
});

test('unpaid existing drafts cannot activate and the temporary pause is reversible',async t=>{
  const f=fixture(t),id=await f.create('user_Resumable');
  // Insert a draft while policy is explicitly lifted, then pause it again.
  f.run('UPDATE lab_trial_program_controls SET free_generation_enabled=1 WHERE id=1');
  f.run("INSERT INTO jobs(id,owner_id,params,state,created_at,updated_at) VALUES(?,?,?,?,?,?)",
    'job_old_draft',id,'{}','draft',80,80);
  f.run('UPDATE lab_trial_program_controls SET free_generation_enabled=0 WHERE id=1');
  assert.throws(()=>f.run("UPDATE jobs SET state='queued' WHERE id='job_old_draft'"),/complimentary generation is paused/i);
  f.run("UPDATE jobs SET state='failed' WHERE id='job_old_draft'"); // cancellation is permitted
  f.run('UPDATE lab_trial_program_controls SET free_generation_enabled=1,welcome_enabled=1 WHERE id=1');
  f.env.LAB_FREE_TRIAL_PAUSED='false';
  f.env.LAB_WELCOME_CREDITS_ENABLED='true';
  f.verified(id,'resume@example.com');
  assert.equal(await grantVerifiedWelcome(f.env,id),true);
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,200);
  assert.equal((await customerSession(f.env,id)).generationReady,true);
  f.submit(id,'job_after_resume');
  assert.equal(f.one('SELECT COUNT(*) AS n FROM jobs WHERE id=?','job_after_resume').n,1);
});

test('paused welcome gifts cannot make authenticated /api/session await a Clerk email lookup',()=>{
  const worker=read('worker.mjs');
  const start=worker.indexOf("if(customer&&path==='/api/session'");
  const end=worker.indexOf("  if(customer&&!['/api/session'",start);
  assert.ok(start>=0&&end>start,'Production session route is present');
  const block=worker.slice(start,end);
  assert.match(block,/env\.LAB_WELCOME_CREDITS_ENABLED==='true'/,
    'Welcome sync is gated off when the welcome promotion is paused');
  assert.match(block,/await syncCustomerEmail\(env,owner\)/,
    'Verified welcome sync still runs when the promotion is deliberately re-enabled');
});
