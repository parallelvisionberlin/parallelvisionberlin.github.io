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
    '../lab-worker/migrations/0013-nano-banana-21-pricing.sql'
  ])db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
  const env={
    LAB_WELCOME_CREDITS_ENABLED:welcomeEnabled,
    LAB_DB:{prepare(sql){return {bind(...args){const stmt=db.prepare(sql);return {
      first:async()=>stmt.get(...args)||null,
      run:async()=>{const result=stmt.run(...args);return {meta:{changes:result.changes}};},
      all:async()=>({results:stmt.all(...args)})
    };}};}}
  };
  const balance=id=>db.prepare('SELECT balance_credits FROM lab_customers WHERE id=?').get(id)?.balance_credits;
  const count=id=>db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE customer_id=? AND reference=?")
    .get(id,'welcome:'+id).n;
  return {db,env,balance,count};
}

test('verified customers receive 200 normal credits, including earlier unfunded accounts, exactly once',async t=>{
  const {db,env,balance,count}=fixture(t);
  const existing='user_PreLaunch1',fresh='user_NewLaunch1';
  db.prepare('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,1,1)')
    .run(existing,existing);
  assert.equal(balance(existing),0);
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
  const {db,env,balance,count}=fixture(t);
  const id='user_VideoGift1';
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
  const {db,env,balance,count}=fixture(t,'false');
  const eligible='user_PilotOnly1',closed='user_Closed1';
  await ensureCustomer(env,eligible);
  await ensureCustomer(env,closed);
  assert.equal(balance(eligible),0);
  db.prepare('INSERT INTO lab_account_closures(customer_id,requested_at) VALUES(?,1)').run(closed);
  env.LAB_WELCOME_CREDITS_ENABLED='true';
  await ensureCustomer(env,eligible);
  await ensureCustomer(env,closed);
  assert.equal(balance(eligible),200);
  assert.equal(balance(closed),0);
  assert.equal(count(closed),0);
});
