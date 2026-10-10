import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {creditsForUsd,PACKS,SOUL_ID_TRAINING_CREDITS} from '../lab-worker/customer-billing.mjs';
import {higgsfieldRoute,SOUL2_CUSTOMER_MAX_QUOTE_MICROS} from '../lab-worker/higgsfield.mjs';

const read = path => readFileSync(new URL(path,import.meta.url),'utf8');
function sqliteFixture(t){
  let DatabaseSync;
  try {({DatabaseSync}=requireSqlite());} catch {t.skip('node:sqlite unavailable');return null;}
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  db.exec(read('../lab-worker/schema.sql'));
  db.exec(read('../lab-worker/migrations/0006-customers-billing.sql'));
  return db;
}
function requireSqlite(){
  // In supported Node test runners node:sqlite is built in.
  return {DatabaseSync:nodeSqlite.DatabaseSync};
}
let nodeSqlite;
try{nodeSqlite=await import('node:sqlite');}catch{}

test('Soul ID launch price offers a character and 85 images from the unchanged EUR 10 pack',()=>{
  assert.equal(SOUL_ID_TRAINING_CREDITS,400);
  assert.equal(PACKS.topup10.cents,1000);
  assert.equal(PACKS.topup10.credits,1000);
  assert.equal(creditsForUsd(.0032),7);
  assert.equal(creditsForUsd(.0057),7);
  assert.equal(creditsForUsd(.015),7);
  assert.equal(SOUL2_CUSTOMER_MAX_QUOTE_MICROS,15000);
  assert.equal(Math.floor((PACKS.topup10.credits-SOUL_ID_TRAINING_CREDITS)/7),85);
  assert.equal(PACKS.topup10.credits-SOUL_ID_TRAINING_CREDITS-85*7,5);
});
test('migration charges Soul ID only 400 credits, preserves generic jobs and refunds exactly once',t=>{
  const db=sqliteFixture(t);if(!db)return;
  const sql=(q,...args)=>db.prepare(q).run(...args);
  const get=(q,...args)=>db.prepare(q).get(...args);
  const migration=read('../lab-worker/migrations/0008-soul-id-launch-credits.sql');
  db.exec(migration);db.exec(migration); // Repeat safe during every deployment.
  sql('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,1,1)','user_customer','user_customer');
  sql("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('p1','user_customer',1000,'purchase','checkout:cs_offer',1)");
  const makeJob=(id,owner,params,estimate)=>sql(
    "INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'queued',?,2,2)",
    id,owner,JSON.stringify(params),estimate);
  const training={provider:'higgsfield',engine:'soulpro',mode:'soul-id-training',model:'soul-id'};
  makeJob('training1','user_customer',training,2500000);
  assert.equal(get("SELECT delta_credits AS n FROM lab_credit_entries WHERE reference='job:training1'").n,-400);
  assert.equal(get("SELECT balance_credits AS n FROM lab_customers WHERE id='user_customer'").n,600);
  const image={provider:'higgsfield',mode:'identity-edit',model:'higgsfield-ai/soul/v2/image-to-image'};
  for(let i=0;i<85;i++)makeJob('image'+i,'user_customer',image,5700);
  assert.equal(get("SELECT balance_credits AS n FROM lab_customers WHERE id='user_customer'").n,5);
  assert.throws(()=>makeJob('image86','user_customer',image,5700),/Insufficient PV Lab credits/);
  assert.equal(get("SELECT COUNT(*) AS n FROM jobs WHERE id='image86'").n,0);
  sql("UPDATE jobs SET state='failed' WHERE id='training1'");
  assert.equal(get("SELECT balance_credits AS n FROM lab_customers WHERE id='user_customer'").n,405);
  sql("UPDATE jobs SET state='failed' WHERE id='training1'");
  assert.equal(get("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference='refund:job:training1'").n,1);
  makeJob('different-model','user_customer',{provider:'fal',mode:'upscale'},450000);
  assert.equal(get("SELECT delta_credits AS n FROM lab_credit_entries WHERE reference='job:different-model'").n,-207);
  makeJob('private-owner','private-owner',training,2500000);
  assert.equal(get("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference='job:private-owner'").n,0);
});
test('customer Soul 2 quote over 7-credit ceiling fails before reservation; owner remains unmodified',async t=>{
  const db=sqliteFixture(t);if(!db)return;
  let customer=true,estimate='0.016',calls=0;
  const first=async(env,q,...params)=>db.prepare(q).get(...params);
  const run=async(env,q,...params)=>({meta:{changes:db.prepare(q).run(...params).changes}});
  const fail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};
  const env={HF_CREDENTIALS:'test:key'};
  const deps={fail,first,run,body:r=>r.json(),now:()=>Date.now(),isLabCustomer:async()=>customer};
  const quote=()=>higgsfieldRoute(
    new Request('https://lab.test/api/higgsfield/quote',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({settings:{type:'image',prompt:'A fashion portrait in a studio',resolution:'1080p'}})
    }),env,'user_customer',new URL('https://lab.test/api/higgsfield/quote'),deps
  );
  const prev=globalThis.fetch;
  globalThis.fetch=async()=>{calls++;return Response.json({usd:estimate});};
  try{
    await assert.rejects(quote,/above the 7-credit launch price/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM quotes').get().n,0);
    estimate='0.0057';
    const priced=await quote();
    assert.equal(creditsForUsd(priced.maxUsd),7);
    assert.equal(priced.settings.provider,'higgsfield');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,0);
    customer=false;estimate='0.016';
    const ownerQuote=await quote();
    assert.equal(ownerQuote.estimatedUsd,.016);
    assert.equal(calls,3);
  }finally{globalThis.fetch=prev;}
});
test('site copy and customer training panel show credits without editing owner provider estimates',()=>{
  const studio=read('../lab/studio.html'),landing=read('../lab/index.html'),ui=read('../lab/higgsfield-ui.js'),app=read('../lab/lab.js');
  assert.match(studio,/id="hf-training-consent-copy"/);
  assert.match(studio,/id="hf-training-offer-note"/);
  assert.match(ui,/setCustomerPricing\(price\)/);
  assert.match(ui,/customerTrainingCredits\+' credits'/);
  assert.match(app,/hf\.setCustomerPricing\(customerMode\?/);
  assert.match(app,/customerMode\?wallet\.describe\(q\.maxUsd\):money\(q\.estimatedUsd\)/);
  assert.match(landing,/Soul ID for <strong>400 credits<\/strong>/);
  assert.match(landing,/up to 85 Soul 2 images/);
});
