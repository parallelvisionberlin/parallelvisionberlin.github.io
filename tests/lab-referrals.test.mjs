import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {referralRoute,attributeReferral,rewardQualifiedReferral,normalizeReferralCode,
        REFERRAL_BONUS_CREDITS} from '../lab-worker/referrals.mjs';
import {stripeWebhook} from '../lab-worker/customer-billing.mjs';
import {captureReferralCode,claimReferral} from '../lab/referral-capture.js';

async function fixture(t) {
  let sqlite;
  try { sqlite = await import('node:sqlite'); }
  catch { t.skip('node:sqlite unavailable'); return null; }
  const db = new sqlite.DatabaseSync(':memory:');
  t.after(() => db.close());
  const sqlfile = path => readFileSync(new URL(path, import.meta.url), 'utf8');
  db.exec(sqlfile('../lab-worker/schema.sql'));
  db.exec(sqlfile('../lab-worker/migrations/0006-customers-billing.sql'));
  const referralMigration = sqlfile('../lab-worker/migrations/0007-lab-referrals.sql');
  db.exec(referralMigration);
  db.exec(referralMigration); // safe and repeatable during deployment
  function prepare(query) {
    return { bind(...params) {
      const s = db.prepare(query);
      return {
        async first() { return s.get(...params) || null; },
        async run() { const r = s.run(...params); return {meta:{changes:r.changes}}; },
        async all() { return {results:s.all(...params)}; }
      };
    }};
  }
  const env = {
    LAB_DB:{
      prepare,
      async batch(items) {
        db.exec('BEGIN IMMEDIATE');
        try {
          const results = [];
          for (const stmt of items) results.push(await stmt.run());
          db.exec('COMMIT');return results;
        } catch (error) {
          db.exec('ROLLBACK');throw error;
        }
      }
    },
    LAB_PUBLIC_APP_URL:'https://parallelvisionlabel.com/lab/studio.html',
    LAB_CHECKOUT_ENABLED:'true',LAB_PUBLIC_GENERATION_ENABLED:'true',
    LAB_STRIPE_WEBHOOK_SECRET:'whsec_test_referral_secret'
  };
  const query = (q,...params) => db.prepare(q).get(...params);
  const insert = (q,...params) => db.prepare(q).run(...params);
  const signup = (id, createdAt=Date.now()) => insert(
    'INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)',
    id,id,createdAt,createdAt);
  const link = async id => (await (await referralRoute(
    new Request('https://parallel-vision-lab.parallelvision.workers.dev/api/customer/referrals'),
    env,id)).json());
  return {db,env,query,insert,signup,link};
}
async function signedCheckout(env, eventId, sessionId, subject) {
  const event = {id:eventId,type:'checkout.session.completed',data:{object:{
    id:sessionId,metadata:{lab_customer_id:subject,lab_sku:'topup10'},
    client_reference_id:subject,currency:'eur',mode:'payment',
    payment_status:'paid',amount_total:1000,customer:'cus_'+subject
  }}};
  const payload = JSON.stringify(event),stamp = String(Math.floor(Date.now()/1000));
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(env.LAB_STRIPE_WEBHOOK_SECRET),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,
    new TextEncoder().encode(stamp+'.'+payload))),v=>v.toString(16).padStart(2,'0')).join('');
  return new Request('https://parallel-vision-lab.parallelvision.workers.dev/api/stripe/webhook',{
    method:'POST',headers:{'Stripe-Signature':'t='+stamp+',v1='+signature},body:payload
  });
}
test('unique invite links remain stable and use the separate Lab URL',async t=>{
  const f=await fixture(t);if(!f)return;
  f.signup('user_inviter');
  const a=await f.link('user_inviter'),b=await f.link('user_inviter');
  assert.equal(a.code,b.code);
  assert.equal(normalizeReferralCode(a.code.toLowerCase()),a.code);
  assert.match(a.url,/^https:\/\/parallelvisionlabel\.com\/lab\/\?ref=[A-Z2-9]{8}$/);
  assert.equal(a.bonusCredits,200);
  assert.equal(a.qualifyingPurchaseEur,10);
  assert.equal(a.invited,0);
});
test('referral attribution is first-account only, one-time, never self',async t=>{
  const f=await fixture(t);if(!f)return;
  f.signup('user_inviter');f.signup('user_friend');f.signup('user_other');
  f.signup('user_old',Date.now()-3*86400000);
  f.signup('user_buyer');
  const inviter=(await f.link('user_inviter')).code;
  const other=(await f.link('user_other')).code;
  await assert.rejects(()=>attributeReferral(f.env,'user_inviter',inviter),/cannot refer yourself/);
  await assert.rejects(()=>attributeReferral(f.env,'user_friend','INVALID'),/valid referral code/);
  await assert.rejects(()=>attributeReferral(f.env,'user_old',inviter),/first joining/);
  f.insert("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('prior','user_buyer',1000,'purchase','checkout:cs_prior',?)",Date.now());
  await assert.rejects(()=>attributeReferral(f.env,'user_buyer',inviter),/before your first purchase/);
  assert.deepEqual(await attributeReferral(f.env,'user_friend',inviter),{attributed:true,status:'attributed'});
  assert.deepEqual(await attributeReferral(f.env,'user_friend',other),{attributed:false,status:'already_attributed'});
  assert.equal(f.query("SELECT referrer_customer_id AS n FROM lab_referrals WHERE referred_customer_id='user_friend'").n,'user_inviter');
  const stats=await f.link('user_inviter');
  assert.equal(stats.invited,1);assert.equal(stats.rewarded,0);
});
test('signed first EUR 10 Stripe purchase credits both users exactly once',async t=>{
  const f=await fixture(t);if(!f)return;
  f.signup('user_inviter');f.signup('user_friend');
  const inviter=(await f.link('user_inviter')).code;
  await attributeReferral(f.env,'user_friend',inviter);
  assert.equal((await rewardQualifiedReferral(f.env,'user_friend','checkout:cs_referral',1000)).rewarded,false);
  assert.equal(f.query("SELECT balance_credits AS n FROM lab_customers WHERE id='user_inviter'").n,0);
  const event=()=>signedCheckout(f.env,'evt_referral1','cs_referral','user_friend');
  assert.equal((await (await stripeWebhook(await event(),f.env)).json()).received,true);
  assert.equal(f.query("SELECT balance_credits AS n FROM lab_customers WHERE id='user_inviter'").n,REFERRAL_BONUS_CREDITS);
  assert.equal(f.query("SELECT balance_credits AS n FROM lab_customers WHERE id='user_friend'").n,1000+REFERRAL_BONUS_CREDITS);
  assert.equal((await f.link('user_inviter')).rewarded,1);
  assert.equal((await (await stripeWebhook(await event(),f.env)).json()).duplicate,true);
  const different=await signedCheckout(f.env,'evt_referral2','cs_referral','user_friend');
  await stripeWebhook(different,f.env); // retried same checkout under a different webhook event id
  assert.equal(f.query("SELECT balance_credits AS n FROM lab_customers WHERE id='user_inviter'").n,200);
  assert.equal(f.query("SELECT balance_credits AS n FROM lab_customers WHERE id='user_friend'").n,1200);
  assert.equal(f.query("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference LIKE 'referral:%'").n,2);
});
test('subscription receipts are eligible, but low-value or unfunded receipts pay nothing',async t=>{
  const f=await fixture(t);if(!f)return;
  f.signup('user_inviter');f.signup('user_friend');
  const invite=(await f.link('user_inviter')).code;
  await attributeReferral(f.env,'user_friend',invite);
  f.insert("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('subscription1','user_friend',1600,'subscription','invoice:in_first',?)",Date.now());
  assert.equal((await rewardQualifiedReferral(f.env,'user_friend','invoice:in_first',999)).rewarded,false);
  assert.equal((await rewardQualifiedReferral(f.env,'user_friend','invoice:in_other',1500)).rewarded,false);
  assert.equal((await rewardQualifiedReferral(f.env,'user_friend','invoice:in_first',1500)).rewarded,true);
  assert.equal((await rewardQualifiedReferral(f.env,'user_friend','invoice:in_first',1500)).rewarded,false);
  assert.equal(f.query("SELECT balance_credits AS n FROM lab_customers WHERE id='user_inviter'").n,200);
  assert.equal(f.query("SELECT balance_credits AS n FROM lab_customers WHERE id='user_friend'").n,1800);
});
test('browser capture preserves an invite through sign-in and clears it only after attribution',async()=>{
  const map=new Map(),store={
    setItem:(k,v)=>map.set(k,v),getItem:k=>map.get(k)||null,removeItem:k=>map.delete(k)
  };
  assert.equal(captureReferralCode('?ref=abcd2345',store),'ABCD2345');
  let captured='';
  assert.equal(await claimReferral(async code=>{captured=code;},store),true);
  assert.equal(captured,'ABCD2345');
  assert.equal(await claimReferral(async()=>{throw Error('must not submit twice');},store),false);
  assert.equal(captureReferralCode('?ref=not-valid',store),'');
});
