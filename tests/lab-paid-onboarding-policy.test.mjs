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
    LAB_CUSTOMER_SPICY_API_KEY:'synthetic-image-provider-key',
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
test('read-only production audit detects ineligible gift after reopening',async t=>{
  const f=fixture(t);
  f.db.exec(read('migrations/0061-resume-40-credit-image-trial.sql'));
  const source=readFileSync(new URL('../.github/scripts/verify-lab-image-trial-live.mjs',import.meta.url),'utf8');
  const sql=source.match(/const results=await api\([^,]+,`([\s\S]*?)`\);/)[1];
  assert.match(sql.trim(),/^SELECT\b/);
  assert.ok(Object.values(f.one(sql)).every(value=>value===1));
  const id='user_UnexpectedGift';await ensureCustomer(f.env,id);
  const closed=f.one("SELECT applied_at FROM lab_migrations WHERE id='0060-paid-signup-existing-wallets'").applied_at;
  // Simulate an erroneous writer without ever changing a production wallet.
  f.run('INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,?,?,?,?)',
    'welcome:'+id,id,40,'adjustment','welcome:'+id,closed+1);
  const audit=f.one(sql);
  assert.equal(audit.only_eligible_40_credit_grants_after_pause,0);
  assert.equal(audit.wallet_ledger_reconciles,1,'Reconciliation alone does not detect a wrongly granted gift');
});

test('reopened image trial grants 40 once, excludes old signups and verified email aliases',async t=>{
  const f=fixture(t);
  f.db.exec(read('migrations/0061-resume-40-credit-image-trial.sql'));
  f.env.LAB_IMAGE_TRIAL_ENABLED='true';
  const old='user_BeforeNovemberCampaign';
  const oldTime=Date.parse('2026-10-31T22:00:00Z');
  f.run('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)',old,old,oldTime,oldTime);
  f.verified(old,'old-trial@example.com');await ensureCustomer(f.env,old);
  assert.equal(f.one('SELECT balance_credits n FROM lab_customers WHERE id=?',old).n,0);
  const fresh='user_ResumedNovemberTrial';
  await ensureCustomer(f.env,fresh);
  f.verified(fresh,'campaign.plus+first@gmail.com');
  await ensureCustomer(f.env,fresh);await ensureCustomer(f.env,fresh);
  assert.equal(f.one('SELECT balance_credits n FROM lab_customers WHERE id=?',fresh).n,40);
  assert.equal(f.one('SELECT COUNT(*) n FROM lab_welcome_claims WHERE customer_id=?',fresh).n,1);
  f.job(fresh,'new_trial_image');
  assert.equal(f.one('SELECT balance_credits n FROM lab_customers WHERE id=?',fresh).n,20);
  f.job(fresh,'new_trial_image_two');
  assert.equal(f.one('SELECT balance_credits n FROM lab_customers WHERE id=?',fresh).n,0);
  assert.throws(()=>f.job(fresh,'third_trial_image'),/Insufficient PV Lab credits/i);
  const alias='user_ResumedAlias';
  await ensureCustomer(f.env,alias);
  f.verified(alias,'campaignplus+second@googlemail.com');await ensureCustomer(f.env,alias);
  assert.equal(f.one('SELECT balance_credits n FROM lab_customers WHERE id=?',alias).n,0);
});
