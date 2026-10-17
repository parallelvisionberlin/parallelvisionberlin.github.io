import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {creditsForJobMicros,creditsForJobUsd,creditsPerUsdForJob,SOUL_ID_TRAINING_CREDITS} from '../lab-worker/job-pricing.mjs';
import {PACKS,creditsForUsd,CREDIT_MULTIPLIER} from '../lab-worker/customer-billing.mjs';

const migration=path=>readFileSync(new URL('../lab-worker/'+path,import.meta.url),'utf8');
const user='user_PricingIntegrity';
const t0=Date.UTC(2026,9,17,16);
function fixture(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  db.exec(migration('schema.sql'));
  for(const file of ['0006-customers-billing','0020-wan-seedance-budget-pricing',
    '0021-spicy-image-credit-steps','0029-pricing-debit-parity'])
    db.exec(migration('migrations/'+file+'.sql'));
  db.prepare('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)')
    .run(user,user,t0,t0);
  db.prepare("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,3000000,'purchase','billing:fixture',?)")
    .run('funding',user,t0);
  let seq=0;
  const insert=(p,micros,quotedPrice=creditsForJobMicros(micros,p),owner=user)=>{
    const id='pricing-'+(++seq);
    db.prepare("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'submitting',?,?,?)")
      .run(id,owner,JSON.stringify({...p,customerChargeCredits:quotedPrice}),micros,t0+seq,t0+seq);
    return id;
  };
  const charge=id=>db.prepare("SELECT -delta_credits AS credits FROM lab_credit_entries WHERE reference=?").get('job:'+id)?.credits;
  const balance=()=>db.prepare('SELECT balance_credits AS n FROM lab_customers WHERE id=?').get(user).n;
  return {db,insert,charge,balance};
}

test('all published packs retain their exact euro/credit value; no SKU or markup change',()=>{
  assert.equal(CREDIT_MULTIPLIER,460);
  assert.deepEqual(Object.fromEntries(Object.entries(PACKS).map(([id,p])=>[id,[p.cents,p.credits]])),{
    topup10:[1000,1000],topup29:[2900,3000],topup75:[7500,8000],
    starter:[1500,1600],creator:[3900,4500],studio:[9900,12000]
  });
  assert.equal(Math.min(...Object.values(PACKS).map(p=>p.cents/100/p.credits)),.00825);
  for(const micros of [0,18000,50000,72000,80000,113000,2500000])
    assert.equal(creditsForUsd(micros/1e6),creditsForJobMicros(micros));
  assert.equal(SOUL_ID_TRAINING_CREDITS,400);
});

test('JavaScript price equals atomic SQLite debit for all provider exceptions and boundaries',t=>{
  const f=fixture(t),base={type:'image',provider:'spicy',mode:'image',engine:'seedream',model:'bytedance/seedream-5.0-pro/text-to-image',resolution:'2k'};
  const cases=[
    ['Vinyl Heat 2K',base,72000,35],
    ['Cloud Spa illustrative refs',base,80000,40],
    ['minimum 10 Spicy',base,18000,10],
    ['spicy 1K', {...base,resolution:'1k'},36000,20],
    ['rounding below threshold',base,76086,35],
    ['rounding above threshold',base,76087,40],
    ['image upscale variable', {...base,mode:'upscale'},50000,23],
    ['image gemini variable',{type:'image',provider:'gemini',engine:'gemini',mode:'image'},50000,23],
    ['Nano 2.1 1K',{type:'image',provider:'gemini',engine:'gemini21',model:'gemini-nano-banana-2.1',processing:'normal',resolution:'1k'},33600,8],
    ['Nano 2.1 2K',{type:'image',provider:'gemini',engine:'gemini21',model:'gemini-nano-banana-2.1',processing:'normal',resolution:'2k'},50400,10],
    ['Nano 2.1 4K',{type:'image',provider:'gemini',engine:'gemini21',model:'gemini-nano-banana-2.1',processing:'normal',resolution:'4k'},113000,20],
    ['SeedVR 2x',{type:'image',provider:'fal',mode:'upscale',upscaleEngine:'seedvr2',model:'fal-ai/seedvr/upscale/image',scale:2},42000,10],
    ['SeedVR 4x',{type:'image',provider:'fal',mode:'upscale',upscaleEngine:'seedvr2',model:'fal-ai/seedvr/upscale/image',scale:4},42000,18],
    ['Higgsfield Soul ID training',{type:'image',provider:'higgsfield',mode:'soul-id-training',model:'soul-id'},2500000,400],
    ['Seedance15 720p silent',{type:'video',provider:'spicy',engine:'seedance15',model:'bytedance/seedance-1.5-pro/image-to-video',resolution:'720p',audio:false},227000,69],
    ['Seedance15 720p sound',{type:'video',provider:'spicy',engine:'seedance15',model:'bytedance/seedance-1.5-pro/text-to-video',resolution:'720p',audio:true},227000,73],
    ['Seedance15 fal exclusion',{type:'video',provider:'fal',engine:'seedance15',model:'bytedance/seedance-1.5-pro/image-to-video',resolution:'720p',audio:true},227000,105],
    ['Seedance25 normal',{type:'video',provider:'spicy',engine:'seedance',model:'bytedance/seedance-2.5/reference-to-video',resolution:'720p'},2773000,444],
    ['Seedance25 fal exclusion',{type:'video',provider:'fal',engine:'seedance',model:'bytedance/seedance-2.5/reference-to-video',resolution:'720p'},100000,46],
    ['Seedance25 higgsfield exclusion',{type:'video',provider:'higgsfield',engine:'seedance',model:'bytedance/seedance-2.5/text-to-video',resolution:'480p'},100000,46],
    ['Seedance4k normal',{type:'video',provider:'spicy',engine:'seedance4k',model:'bytedance/seedance-2.5-spicy/image-to-video'},100000,19],
    ['Seedance4k fal exclusion',{type:'video',provider:'fal',engine:'seedance4k',model:'bytedance/seedance-2.5-spicy/image-to-video'},100000,46],
    ['Wan 3.0 1080p',{type:'video',provider:'spicy',engine:'wan',model:'alibaba/wan-3.0/image-to-video',resolution:'1080p'},1800000,699],
    ['Wan 3.0 720p',{type:'video',provider:'spicy',engine:'wan',model:'alibaba/wan-3.0/image-to-video',resolution:'720p'},100000,46],
    ['Wan 3.0 fal exclusion',{type:'video',provider:'fal',engine:'wan',model:'alibaba/wan-3.0/image-to-video',resolution:'1080p'},100000,46],
    ['General video',{type:'video',provider:'spicy',engine:'other',model:'other'},50000,23]
  ];
  for(const [label,p,micros,expected] of cases){
    assert.equal(creditsForJobMicros(micros,p),expected,label+' expected quote');
    assert.equal(creditsForJobUsd(micros/1000000,p),expected,label+' USD entrypoint');
    const id=f.insert(p,micros,expected);
    assert.equal(f.charge(id),expected,label+' database debit');
  }
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE kind='generation'").get().n,cases.length);
  assert.equal(creditsPerUsdForJob({type:'video',provider:'fal',engine:'seedance15',model:'bytedance/seedance-1.5-pro/image-to-video'}),460);
});

test('quote/debit disagreement aborts the job, preserves balance and prevents a vendor submission',t=>{
  const f=fixture(t),balance=f.balance();
  const settings={type:'image',mode:'image',provider:'spicy',engine:'seedream',resolution:'2k'};
  assert.throws(()=>f.insert(settings,72000,40),/quote and debit disagree/);
  assert.equal(f.balance(),balance);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM jobs").get().n,0);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE kind='generation'").get().n,0);
  assert.throws(()=>f.insert(settings,72000,'35'),/quote and debit disagree/);
  assert.equal(f.balance(),balance);
});

test('customer zero-cost generation is blocked, non-customer owner work is untouched',t=>{
  const f=fixture(t),balance=f.balance(),settings={type:'image',provider:'spicy',mode:'image'};
  assert.throws(()=>f.insert(settings,0,10),/unpriced customer generation/);
  assert.equal(f.balance(),balance);
  const owner=f.insert(settings,0,10,'owner_internal');
  assert.equal(f.charge(owner),undefined);
});

test('failed generation refunds exactly the quoted debit once',t=>{
  const f=fixture(t),balance=f.balance(),p={type:'image',provider:'spicy',engine:'seedream',mode:'image'};
  const id=f.insert(p,72000,35);
  assert.equal(f.balance(),balance-35);
  f.db.prepare("UPDATE jobs SET state='failed' WHERE id=?").run(id);
  assert.equal(f.balance(),balance);
  f.db.prepare("UPDATE jobs SET state='queued' WHERE id=?").run(id);
  f.db.prepare("UPDATE jobs SET state='failed' WHERE id=?").run(id);
  assert.equal(f.balance(),balance,'idempotent refund on repeat transition');
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference=?").get('refund:job:'+id).n,1);
});
