import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {ensureCustomer,customerRoute,WELCOME_CREDITS} from '../lab-worker/customer-billing.mjs';

function fixture(t, welcomeEnabled='true'){
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  for(const path of [
    '../lab-worker/schema.sql',
    '../lab-worker/migrations/0006-customers-billing.sql',
    '../lab-worker/migrations/0008-soul-id-launch-credits.sql',
    '../lab-worker/migrations/0011-customer-lifecycle.sql',
    '../lab-worker/migrations/0012-video-tiered-pricing.sql',
    '../lab-worker/migrations/0013-nano-banana-21-pricing.sql',
    '../lab-worker/migrations/0015-lab-promotional-credits.sql',
    '../lab-worker/migrations/0023-welcome-guard.sql'
  ])db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
  const env={
    LAB_WELCOME_CREDITS_ENABLED:welcomeEnabled,
    LAB_SECRET:'synthetic-welcome-guard-key-only-for-unit-tests-123456789',
    LAB_DB:{prepare(sql){return {bind(...args){const stmt=db.prepare(sql);return {
      first:async()=>stmt.get(...args)||null,
      run:async()=>{const result=stmt.run(...args);return {meta:{changes:result.changes}};},
      all:async()=>({results:stmt.all(...args)})
    };}};}}
  };
  const balance=id=>db.prepare('SELECT balance_credits FROM lab_customers WHERE id=?').get(id)?.balance_credits;
  const count=id=>db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE customer_id=? AND reference=?")
    .get(id,'welcome:'+id).n;
  const verify=(id,email)=>db.prepare('INSERT OR REPLACE INTO lab_customer_contacts(customer_id,email,verified_at,synced_at) VALUES(?,?,?,?)')
    .run(id,email,Date.now(),Date.now());
  return {db,env,balance,count,verify};
}

test('verified customers receive 200 normal credits, including earlier unfunded accounts, exactly once',async t=>{
  const {db,env,balance,count,verify}=fixture(t);
  const existing='user_PreLaunch1',fresh='user_NewLaunch1';
  db.prepare('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,1,1)')
    .run(existing,existing);
  assert.equal(balance(existing),0);
  await ensureCustomer(env,fresh);
  verify(existing,'earlier@example.com');
  verify(fresh,'fresh@example.com');
  await Promise.all(Array.from({length:8},()=>ensureCustomer(env,fresh)));
  await ensureCustomer(env,existing);
  await ensureCustomer(env,existing);
  assert.equal(WELCOME_CREDITS,200);
  assert.equal(balance(fresh),200);
  assert.equal(balance(existing),200);
  assert.equal(count(fresh),1);
  assert.equal(count(existing),1);
  const response=await customerRoute(new Request('https://lab.test/api/customer/wallet'),env,existing);
  assert.equal(response.status,200);
  const wallet=await response.json();
  assert.equal(wallet.balanceCredits,200);
  assert.equal(wallet.activity.length,1);
  assert.deepEqual([wallet.activity[0].delta_credits,wallet.activity[0].kind,wallet.activity[0].reference],
    [200,'adjustment','welcome:'+existing]);
});

test('the normal video job debit can consume all 200 gift credits in one generation',async t=>{
  const {db,env,balance,count,verify}=fixture(t);
  const id='user_VideoGift1';
  await ensureCustomer(env,id);
  verify(id,'video@example.com');
  await ensureCustomer(env,id);
  // Seedance 1.5 Pro is quoted at 320 credits/USD. 625,000 micro-USD = 200 credits.
  const params=JSON.stringify({type:'video',engine:'seedance15',provider:'spicyapi',
    model:'bytedance/seedance-1.5-pro/text-to-video'});
  const addJob=(job,estimate)=>db.prepare(
    'INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,\'queued\',?,1,1)'
  ).run(job,id,params,estimate);
  addJob('welcome-video',625000);
  assert.equal(balance(id),0);
  assert.equal(db.prepare("SELECT delta_credits FROM lab_credit_entries WHERE reference='job:welcome-video'").get().delta_credits,-200);
  assert.throws(()=>addJob('welcome-second',10000),/Insufficient PV Lab credits/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE id='welcome-second'").get().n,0);
  db.prepare("UPDATE jobs SET state='failed' WHERE id='welcome-video'").run();
  assert.equal(balance(id),200,'a definitively failed video refunds the gift balance');
  assert.equal(count(id),1);
});

test('a disabled environment gets no automatic bonus and closed customers are excluded',async t=>{
  const {db,env,balance,count,verify}=fixture(t,'false');
  const eligible='user_PilotOnly1',closed='user_Closed1';
  await ensureCustomer(env,eligible);
  await ensureCustomer(env,closed);
  assert.equal(balance(eligible),0);
  db.prepare('INSERT INTO lab_account_closures(customer_id,requested_at) VALUES(?,1)').run(closed);
  verify(eligible,'eligible@example.com');
  verify(closed,'closed@example.com');
  env.LAB_WELCOME_CREDITS_ENABLED='true';
  await ensureCustomer(env,eligible);
  await ensureCustomer(env,closed);
  assert.equal(balance(eligible),200);
  assert.equal(balance(closed),0);
  assert.equal(count(closed),0);
});

test('temporary email identities receive no welcome grant and remain available for paid use',async t=>{
  const {env,balance,count,verify}=fixture(t);
  for(const [id,email] of [['user_TempOne','anon@yournike.com'],['user_TempTwo','anon@weekprime.com']]){
    await ensureCustomer(env,id);
    verify(id,email);
    await ensureCustomer(env,id);
    assert.equal(balance(id),0);
    assert.equal(count(id),0);
  }
});

test('verified email aliases cannot harvest multiple grants across new Clerk accounts',async t=>{
  const {env,balance,verify}=fixture(t);
  const first='user_GmailOne',second='user_GmailTwo',third='user_Independent';
  for(const id of [first,second,third])await ensureCustomer(env,id);
  verify(first,'A.Test+1@gmail.com');
  verify(second,'atest+2@googlemail.com');
  verify(third,'separate@example.com');
  await ensureCustomer(env,first);
  await ensureCustomer(env,second);
  await ensureCustomer(env,third);
  assert.equal(balance(first),200);
  assert.equal(balance(second),0);
  assert.equal(balance(third),200);
  await ensureCustomer(env,second);
  assert.equal(balance(second),0,'returning new identity still cannot claim a second gift');
});

test('welcome bonus requires verified email before granting and never changes existing paid funds',async t=>{
  const {db,env,balance,verify}=fixture(t);
  const id='user_Waiting';
  await ensureCustomer(env,id);
  assert.equal(balance(id),0,'unverified signups should not receive a costly credit grant');
  db.prepare("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('paid',?,1000,'purchase','checkout:paid',1)").run(id);
  verify(id,'ready@example.com');
  await ensureCustomer(env,id);
  assert.equal(balance(id),1200);
  await ensureCustomer(env,id);
  assert.equal(balance(id),1200,'no repeat gifts or paid-balance mutation');
});
