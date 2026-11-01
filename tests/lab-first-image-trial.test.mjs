import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {ensureCustomer,customerSession} from '../lab-worker/customer-billing.mjs';
import {customerPromotionalReview} from '../lab-worker/customer-lifecycle.mjs';

const read=path=>readFileSync(new URL('../lab-worker/'+path,import.meta.url),'utf8');
function fixture(t){
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  db.exec(read('schema.sql'));
  for(const name of [
    '0006-customers-billing','0011-customer-lifecycle','0015-lab-promotional-credits',
    '0021-spicy-image-credit-steps',
    '0023-welcome-guard','0025-promo-generation-holds','0028-generation-finance-ledger',
    '0029-pause-welcome-promotion',
    '0033-owner-voucher-generation'
  ])db.exec(read('migrations/'+name+'.sql'));
  db.prepare('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,1,1)')
    .run('user_LegacyTrial','user_LegacyTrial');
  db.exec(read('migrations/0051-first-image-40-credit-trial.sql'));
  const env={
    LAB_WELCOME_CREDITS_ENABLED:'false',
    LAB_IMAGE_TRIAL_ENABLED:'true',
    LAB_FREE_TRIAL_PAUSED:'true',LAB_PROMO_HOLDS_ENABLED:'true',
    LAB_SECRET:'synthetic-image-trial-key-1234567890123456789012345',
    LAB_DB:{prepare(sql){return {bind(...args){const stmt=db.prepare(sql);return {
      first:async()=>stmt.get(...args)||null,
      run:async()=>{const result=stmt.run(...args);return {meta:{changes:result.changes}};},
      all:async()=>({results:stmt.all(...args)})
    };}};}}
  };
  const run=(sql,...params)=>db.prepare(sql).run(...params);
  const one=(sql,...params)=>db.prepare(sql).get(...params);
  const verify=(id,email)=>run(
    'INSERT INTO lab_customer_contacts(customer_id,email,verified_at,synced_at) VALUES(?,?,?,?)',
    id,email,100,100);
  const addJob=(id,job,params={type:'image',mode:'image',provider:'spicy',engine:'seedream',
    model:'bytedance/seedream-5.0-pro/edit',resolution:'2k'},micros=72000)=>
    run("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'queued',?,1001,1001)",
      job,id,JSON.stringify(params),micros);
  return {db,env,run,one,verify,addJob};
}

test('40-credit trial grants once to new verified identities and one 2K image leaves 5',async t=>{
  const f=fixture(t),id='user_ImageTrial';
  await ensureCustomer(f.env,id);
  f.verify(id,'image.trial+main@gmail.com');
  await ensureCustomer(f.env,id);
  await ensureCustomer(f.env,id);
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,40);
  assert.equal(f.one('SELECT COUNT(*) AS n FROM lab_welcome_claims WHERE customer_id=?',id).n,1);
  assert.equal((await customerSession(f.env,id)).generationReady,true);
  f.addJob(id,'image_first');
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,5);
  assert.equal((await customerSession(f.env,id)).generationReady,false);
  assert.throws(()=>f.addJob(id,'image_second'),/complimentary generation is paused/i);
  assert.throws(()=>f.addJob(id,'video_after',{type:'video',mode:'image-to-video'},36000),
    /complimentary generation is paused/i);
});

test('video cannot spend trial before the first image; failed image can retry after refund',async t=>{
  const f=fixture(t),id='user_ImageRetry';
  await ensureCustomer(f.env,id);f.verify(id,'retry@example.com');await ensureCustomer(f.env,id);
  assert.throws(()=>f.addJob(id,'trial_video',{type:'video',mode:'text-to-video'},10000),
    /complimentary generation is paused/i);
  f.addJob(id,'first_attempt');
  f.run("UPDATE jobs SET state='failed' WHERE id='first_attempt'");
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,40);
  assert.equal((await customerPromotionalReview(f.env,id)).held,false);
  f.addJob(id,'second_attempt');
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,5);
});

test('old 200 credit accounts stay blocked, old accounts are never backfilled',async t=>{
  const f=fixture(t),id='user_LegacyTrial';
  f.verify(id,'legacy@example.com');
  await ensureCustomer(f.env,id);
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,0);
  f.run('INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,?,?,?,?)',
    'welcome:'+id,id,200,'adjustment','welcome:'+id,100);
  assert.equal((await customerSession(f.env,id)).generationReady,false);
  assert.throws(()=>f.addJob(id,'legacy_blocked'),/complimentary generation is paused/i);
});

test('Gmail aliases cannot claim another image; paid customers retain generation',async t=>{
  const f=fixture(t),a='user_ClaimOne',b='user_ClaimTwo';
  await ensureCustomer(f.env,a);await ensureCustomer(f.env,b);
  f.verify(a,'Name.Test+001@gmail.com');f.verify(b,'nametest+002@googlemail.com');
  await ensureCustomer(f.env,a);await ensureCustomer(f.env,b);
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',a).balance_credits,40);
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',b).balance_credits,0);
  f.run('INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,?,?,?,?)',
    'checkout:testpaid',b,1000,'purchase','checkout:testpaid',100);
  assert.equal((await customerSession(f.env,b)).generationReady,true);
  f.addJob(b,'paid_image');
});
