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
  db.exec(read('migrations/0052-spend-all-image-trial-credits.sql'));
  const env={
    LAB_WELCOME_CREDITS_ENABLED:'false',
    LAB_IMAGE_TRIAL_ENABLED:'true',
    LAB_FREE_TRIAL_PAUSED:'true',LAB_PROMO_HOLDS_ENABLED:'true',
    LAB_PUBLIC_GENERATION_ENABLED:'true',LAB_CHECKOUT_ENABLED:'true',
    LAB_STRIPE_SECRET_KEY:'sk_test_synthetic',LAB_STRIPE_WEBHOOK_SECRET:'whsec_synthetic',
    LAB_CUSTOMER_SPICY_API_KEY:'synthetic-test-api-key',
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

test('40-credit trial grants once and lets customers keep their unspent 2K-image balance',async t=>{
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
  assert.equal((await customerSession(f.env,id)).generationReady,true);
  assert.throws(()=>f.addJob(id,'image_second'),/Insufficient PV Lab credits/i);
  assert.throws(()=>f.addJob(id,'video_after',{type:'video',mode:'image-to-video'},36000),
    /complimentary generation is paused/i);
});

test('Two affordable 1K photos spend the entire 40-credit balance without a second award',async t=>{
  const f=fixture(t),id='user_TwoImages';
  await ensureCustomer(f.env,id);f.verify(id,'twoimages@example.com');await ensureCustomer(f.env,id);
  const image={type:'image',mode:'image',provider:'spicy',engine:'seedream',
    model:'bytedance/seedream-5.0-pro/edit',resolution:'1k'};
  f.addJob(id,'first_1k',image,36000);
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,20);
  assert.equal((await customerSession(f.env,id)).generationReady,true);
  assert.throws(()=>f.addJob(id,'trial_video_between',{type:'video',mode:'image-to-video'},10000),
    /complimentary generation is paused/i);
  f.addJob(id,'second_1k',image,36000);
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,0);
  assert.equal((await customerSession(f.env,id)).generationReady,false);
  assert.throws(()=>f.addJob(id,'third_1k',image,36000),/Insufficient PV Lab credits/i);
  assert.equal(f.one('SELECT COUNT(*) AS n FROM lab_welcome_claims WHERE customer_id=?',id).n,1);
});

test('The paid wallet remains additive and other free generation modes never consume trial credits',async t=>{
  const f=fixture(t),id='user_TopupAfterTrial';
  await ensureCustomer(f.env,id);f.verify(id,'topuptrial@example.com');await ensureCustomer(f.env,id);
  const image={type:'image',mode:'image',provider:'spicy',engine:'seedream',
    model:'bytedance/seedream-5.0-pro/edit',resolution:'1k'};
  f.addJob(id,'topup_first',image,36000);
  const balance=f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits;
  assert.equal(balance,20);
  assert.throws(()=>f.addJob(id,'trial_upscale',{type:'image',mode:'upscale',provider:'fal'},10000),
    /complimentary generation is paused/i);
  f.run('INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,?,?,?,?)',
    'checkout:trial',id,1000,'purchase','checkout:trial',2000);
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,1020);
  assert.equal((await customerSession(f.env,id)).generationReady,true);
  f.addJob(id,'paid_after_40',image,36000);
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,1000);
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

test('campaign signups made before the deployment on November 1 still receive 40',async t=>{
  const f=fixture(t),id='user_CampaignAlreadySignedUp';
  // Account existed on the campaign day before migration 0051 could deploy.
  const signup=Date.parse('2026-11-01T15:00:00Z');
  f.run('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)',
    id,id,signup,signup);
  f.verify(id,'campaign-first@example.com');
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,0);
  await ensureCustomer(f.env,id);
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,40);
  f.addJob(id,'campaign_image');
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,5);
});

test('previous-day signups are excluded even if the email verifies after launch',async t=>{
  const f=fixture(t),id='user_CampaignYesterday';
  const yesterday=Date.parse('2026-10-31T20:00:00Z');
  f.run('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)',
    id,id,yesterday,yesterday);
  f.verify(id,'yesterday@example.com');
  await ensureCustomer(f.env,id);
  assert.equal(f.one('SELECT balance_credits FROM lab_customers WHERE id=?',id).balance_credits,0);
  assert.equal((await customerSession(f.env,id)).generationReady,false);
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

test('Berlin Rave quote shows exact balance and Add credits instead of unusable credits',()=>{
  const quote=read('..'+'/lab/app-mood-generation.js');
  const moods=read('..'+'/lab/explore-moods.js');
  assert.match(quote,/imageCredits>session\.balanceCredits/);
  assert.match(quote,/error\.code='INSUFFICIENT_CREDITS'/);
  assert.match(moods,/error\.code==='INSUFFICIENT_CREDITS'/);
});
