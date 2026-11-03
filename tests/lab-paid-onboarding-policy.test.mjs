import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {ensureCustomer,customerSession} from '../lab-worker/customer-billing.mjs';

const read=path=>readFileSync(new URL('../lab-worker/'+path,import.meta.url),'utf8');
function fixture(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  db.exec(read('schema.sql'));
  for(const name of [
    '0006-customers-billing','0011-customer-lifecycle','0015-lab-promotional-credits',
    '0021-spicy-image-credit-steps','0023-welcome-guard','0025-promo-generation-holds',
    '0028-generation-finance-ledger','0029-pause-welcome-promotion',
    '0033-owner-voucher-generation','0051-first-image-40-credit-trial',
    '0052-spend-all-image-trial-credits','0053-single-image-trial',
    '0056-use-image-credit-balance'
  ])db.exec(read('migrations/'+name+'.sql'));
  const env={
    LAB_WELCOME_CREDITS_ENABLED:'false',LAB_IMAGE_TRIAL_ENABLED:'false',
    LAB_FREE_TRIAL_PAUSED:'false',LAB_PROMO_HOLDS_ENABLED:'true',
    LAB_PUBLIC_GENERATION_ENABLED:'true',LAB_CHECKOUT_ENABLED:'true',
    LAB_STRIPE_SECRET_KEY:'sk_test_synthetic',LAB_STRIPE_WEBHOOK_SECRET:'whsec_synthetic',
    LAB_SECRET:'synthetic-paid-onboarding-secret-abcdefghijklmnopqrstuvwxyz0123456789',
    LAB_DB:{prepare(sql){return {bind(...args){const statement=db.prepare(sql);return {
      first:async()=>statement.get(...args)||null,
      run:async()=>{const r=statement.run(...args);return {meta:{changes:r.changes}};},
      all:async()=>({results:statement.all(...args)})
    };}};}}
  };
  const run=(sql,...args)=>db.prepare(sql).run(...args);
  const one=(sql,...args)=>db.prepare(sql).get(...args);
  const verified=(id,email)=>run('INSERT INTO lab_customer_contacts(customer_id,email,verified_at,synced_at) VALUES(?,?,?,?)',id,email,100,100);
  const job=(id,j)=>run(
    "INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'queued',36000,1001,1001)",
    j,id,JSON.stringify({type:'image',mode:'image',provider:'spicy',engine:'seedream',
      model:'bytedance/seedream-5.0-pro/edit',resolution:'1k'}));
  db.exec(read('migrations/0060-paid-signup-existing-wallets.sql'));
  return {db,env,run,one,verified,job};
}
test('new verified signups cannot receive gift or bypass disabled policy',async t=>{
  const f=fixture(t),id='user_NewNoGift';
  await ensureCustomer(f.env,id);
  f.verified(id,'new.user@example.com');
  await ensureCustomer(f.env,id);
  await ensureCustomer(f.env,id);
  assert.equal(f.one('SELECT balance_credits AS n FROM lab_customers WHERE id=?',id).n,0);
  assert.equal(f.one('SELECT COUNT(*) AS n FROM lab_welcome_claims').n,0);
  f.env.LAB_IMAGE_TRIAL_ENABLED='true';
  await ensureCustomer(f.env,id);
  assert.equal(f.one('SELECT balance_credits AS n FROM lab_customers WHERE id=?',id).n,0);
  assert.equal(f.one('SELECT COUNT(*) AS n FROM lab_welcome_claims').n,0);
  await assert.doesNotReject(async()=>customerSession(f.env,id));
  assert.throws(()=>f.job(id,'job_new_zero'),/Insufficient PV Lab credits/i);
});
test('legacy 40 and 200 credit balances remain usable and are debited',async t=>{
  const f=fixture(t);
  for(const [id,n] of [['user_Legacy40',40],['user_Legacy200',200]]){
    await ensureCustomer(f.env,id);
    f.run('INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,?,?,?,?)',
      'welcome:'+id,id,n,'adjustment','welcome:'+id,100);
    const state=await customerSession(f.env,id);
    assert.equal(state.balanceCredits,n);
    assert.equal(state.generationReady,true);
    f.job(id,'job_'+id);
    assert.ok(f.one('SELECT balance_credits AS n FROM lab_customers WHERE id=?',id).n<n);
    assert.equal(f.one('SELECT COUNT(*) AS n FROM lab_credit_entries WHERE customer_id=? AND reference=?',id,'welcome:'+id).n,1);
  }
});
test('migration is repeatable and keeps welcome claims closed',async t=>{
  const f=fixture(t);
  f.db.exec(read('migrations/0060-paid-signup-existing-wallets.sql'));
  const p=f.one('SELECT welcome_enabled,free_generation_enabled FROM lab_trial_program_controls WHERE id=1');
  assert.equal(p.welcome_enabled,0);assert.equal(p.free_generation_enabled,1);
  const id='user_Retry';await ensureCustomer(f.env,id);f.verified(id,'retry@example.com');
  f.env.LAB_IMAGE_TRIAL_ENABLED='true';await ensureCustomer(f.env,id);
  assert.equal(f.one('SELECT COUNT(*) AS n FROM lab_welcome_claims WHERE customer_id=?',id).n,0);
});
