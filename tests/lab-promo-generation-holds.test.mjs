import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {assertCustomerOpen} from '../lab-worker/customer-lifecycle.mjs';
import {customerSession,ensureCustomer} from '../lab-worker/customer-billing.mjs';
function setup(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  const read=file=>readFileSync(new URL('../lab-worker/'+file,import.meta.url),'utf8');
  for(const file of ['schema.sql','migrations/0006-customers-billing.sql','migrations/0011-customer-lifecycle.sql','migrations/0015-lab-promotional-credits.sql'])db.exec(read(file));
  const env={LAB_PROMO_HOLDS_ENABLED:'true',LAB_WELCOME_CREDITS_ENABLED:'false',
    LAB_CHECKOUT_ENABLED:'true',LAB_PUBLIC_GENERATION_ENABLED:'true',
    LAB_STRIPE_SECRET_KEY:'placeholder',LAB_STRIPE_WEBHOOK_SECRET:'placeholder',
    LAB_CUSTOMER_SPICY_API_KEY:'placeholder',
    LAB_DB:{prepare(sql){return {bind(...args){const s=db.prepare(sql);return {
      first:async()=>s.get(...args)||null,run:async()=>({meta:{changes:s.run(...args).changes}}),
      all:async()=>({results:s.all(...args)})
    };}};}}};
  return {db,env,read};
}
test('existing disposable trial cannot spend remaining free credits after migration',async t=>{
  const {db,env,read}=setup(t),id='user_Temporary';
  await ensureCustomer(env,id);
  db.prepare("INSERT INTO lab_credit_entries VALUES('welcome:user_Temporary',?,200,'adjustment','welcome:user_Temporary',1)").run(id);
  db.prepare("INSERT INTO lab_customer_contacts VALUES(?,?,?,?)").run(id,'alias@yournike.com',1,1);
  db.exec(read('migrations/0025-promo-generation-holds.sql'));
  db.exec(read('migrations/0025-promo-generation-holds.sql'));
  db.exec(read('migrations/0036-clerk-contact-hold-upsert.sql'));
  db.exec(read('migrations/0036-clerk-contact-hold-upsert.sql'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lab_promo_generation_holds').get().n,1);
  assert.equal((await customerSession(env,id)).generationReady,false);
  assert.equal((await customerSession(env,id)).billingReady,true);
  await assert.rejects(()=>assertCustomerOpen(env,id,{promotion:true}),/Free trial generation/);
  assert.throws(()=>db.prepare("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES('job',?,'{}','queued',10000,2,2)").run(id),/promotional generation paused/);
  assert.equal(db.prepare('SELECT balance_credits FROM lab_customers WHERE id=?').get(id).balance_credits,200);
  db.prepare("UPDATE lab_customer_contacts SET email='changed@gmail.com' WHERE customer_id=?").run(id);
  await assert.rejects(()=>assertCustomerOpen(env,id,{promotion:true}),/Free trial generation/);
});
test('paid verified credits release promotional generation restriction without deleting work',async t=>{
  const {db,env,read}=setup(t),id='user_TempPay';
  await ensureCustomer(env,id);
  db.exec(read('migrations/0025-promo-generation-holds.sql'));
  db.exec(read('migrations/0036-clerk-contact-hold-upsert.sql'));
  db.prepare('INSERT INTO lab_customer_contacts VALUES(?,?,?,?)').run(id,'paid@weekprime.com',1,1);
  await assert.rejects(()=>assertCustomerOpen(env,id,{promotion:true}),/Free trial generation/);
  db.prepare("INSERT INTO lab_credit_entries VALUES('paid',?,1000,'purchase','checkout:testpaid',2)").run(id);
  await assertCustomerOpen(env,id,{promotion:true});
  assert.equal((await customerSession(env,id)).generationReady,true);
  db.prepare("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES('paidjob',?,'{}','queued',10000,2,2)").run(id);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE owner_id=?").get(id).n,1);
});
