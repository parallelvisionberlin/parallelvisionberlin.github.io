import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {ensureCustomer,customerRoute,verifyClosureBilling} from '../lab-worker/customer-billing.mjs';
import {requestAccountClosure,processAccountClosures,assertCustomerOpen,customerAccount} from '../lab-worker/customer-lifecycle.mjs';
function fixture(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  for(const file of ['schema.sql','migrations/0006-customers-billing.sql','migrations/0007-lab-referrals.sql','migrations/0011-customer-lifecycle.sql'])db.exec(readFileSync(new URL('../lab-worker/'+file,import.meta.url),'utf8'));
  const objects=new Map();let storageFailure=false;
  const env={LAB_DB:{prepare(sql){return {bind(...args){return {
    first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:db.prepare(sql).run(...args).changes}})
  };}};},async batch(statements){db.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}},LAB_MEDIA:{
    list:async({prefix,limit})=>{if(storageFailure)throw Error('storage unavailable');return {objects:[...objects.keys()].filter(k=>k.startsWith(prefix)).slice(0,limit).map(key=>({key})),truncated:false};},
    delete:async key=>objects.delete(key)
  }};
  return {env,db,objects,failStorage:()=>{storageFailure=true;},restoreStorage:()=>{storageFailure=false;}};
}
test('closure confirms identity, blocks concurrent writes, retries storage and deletes only customer creative data',async t=>{
  const f=fixture(t),{env,db,objects}=f;await ensureCustomer(env,'user_Close');await ensureCustomer(env,'user_Keep');
  for(const id of ['user_Close','user_Keep']){
    const key=id+'/sources/photo.png';objects.set(key,'image');objects.set(id+'/thumbnails/v2/photo.webp','preview');
    db.prepare("INSERT INTO assets VALUES(?,?,?,'source','image/png','photo.png',10,1)").run(id+'asset',id,key);
    db.prepare("INSERT INTO jobs(id,owner_id,source_id,params,state,created_at,updated_at) VALUES(?,?,?,'{\"prompt\":\"private\"}','draft',1,1)").run(id+'job',id,id+'asset');
  }
  db.prepare("INSERT INTO lab_credit_entries VALUES('receipt','user_Close',1000,'purchase','checkout:receipt',1)").run();
  assert.equal((await customerAccount(env,'user_Close')).storage.bytes,10);
  await assert.rejects(()=>requestAccountClosure(env,'owner-internal','DELETE MY PV LAB ACCOUNT'),/Only a customer/);
  await assert.rejects(()=>requestAccountClosure(env,'user_Close','DELETE'),/Type DELETE/);
  db.prepare("UPDATE jobs SET state='uncertain' WHERE owner_id='user_Close'").run();
  await assert.rejects(()=>requestAccountClosure(env,'user_Close','DELETE MY PV LAB ACCOUNT'),/running or needs reconciliation/);
  db.prepare("UPDATE jobs SET state='failed' WHERE owner_id='user_Close'").run();
  assert.deepEqual(await requestAccountClosure(env,'user_Close','DELETE MY PV LAB ACCOUNT'),{accepted:true});
  assert.deepEqual(await requestAccountClosure(env,'user_Close','DELETE MY PV LAB ACCOUNT'),{accepted:true});
  await assert.rejects(()=>assertCustomerOpen(env,'user_Close'),/account is closed/);
  assert.throws(()=>db.prepare("INSERT INTO jobs(id,owner_id,params,state,created_at,updated_at) VALUES('late','user_Close','{}','queued',1,1)").run(),/account is closed/);
  db.prepare('UPDATE lab_account_closures SET requested_at=1').run();
  f.failStorage();await assert.rejects(()=>processAccountClosures(env),/storage or billing verification unavailable/);f.restoreStorage();
  await processAccountClosures(env);await processAccountClosures(env);
  assert.equal(db.prepare("SELECT state FROM lab_account_closures WHERE customer_id='user_Close'").get().state,'deleted');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM assets WHERE owner_id='user_Close'").get().n,0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE owner_id='user_Close'").get().n,0);
  assert.equal(db.prepare("SELECT balance_credits FROM lab_customers WHERE id='user_Close'").get().balance_credits,1000);
  assert.deepEqual([...objects.keys()],['user_Keep/sources/photo.png','user_Keep/thumbnails/v2/photo.webp']);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM assets WHERE owner_id='user_Keep'").get().n,1);
  await ensureCustomer(env,'user_Close');await assert.rejects(()=>assertCustomerOpen(env,'user_Close'),/account is closed/);
});
test('billing review blocks atomic paid jobs and subscriptions block closure',async t=>{
  const {env,db}=fixture(t);await ensureCustomer(env,'user_Close');
  db.prepare("INSERT INTO lab_billing_reviews VALUES('evt_review','user_Close','ch_test','charge.refunded',1000,'open',1)").run();
  await assert.rejects(()=>assertCustomerOpen(env,'user_Close',{spending:true}),/under review|being reviewed/);
  assert.throws(()=>db.prepare("INSERT INTO jobs(id,owner_id,params,state,created_at,updated_at) VALUES('paid','user_Close','{}','queued',1,1)").run(),/billing review required/);
  db.prepare("INSERT INTO lab_subscriptions VALUES('user_Close','sub_test','cus_test','starter','active',1)").run();
  await assert.rejects(()=>requestAccountClosure(env,'user_Close','DELETE MY PV LAB ACCOUNT'),/Cancel your subscription/);
});
test('billing portal remains available with sales disabled; deletion requires authoritative billing clearance',async t=>{
  const {env,db,objects}=fixture(t);await ensureCustomer(env,'user_Close');
  db.prepare("UPDATE lab_customers SET stripe_customer_id='cus_test' WHERE id='user_Close'").run();
  env.LAB_STRIPE_SECRET_KEY='sk_test_synthetic';let active=true;const calls=[];
  const old=globalThis.fetch;t.after(()=>{globalThis.fetch=old;});
  globalThis.fetch=async(url,init)=>{calls.push({url,init});
    if(url.includes('billing_portal/sessions'))return Response.json({url:'https://billing.stripe.com/p/session/test'});
    if(url.includes('checkout/sessions?'))return Response.json({data:[{id:'cs_test_open'}],has_more:false});
    if(url.endsWith('/expire'))return Response.json({status:'expired'});
    if(url.includes('subscriptions?'))return Response.json({data:[{status:active?'active':'canceled'}],has_more:false});
    throw Error('Unexpected Stripe call');
  };
  assert.equal((await customerRoute(new Request('https://test/api/billing/portal',{method:'POST'}),env,'user_Close')).status,200);
  await requestAccountClosure(env,'user_Close','DELETE MY PV LAB ACCOUNT');db.prepare('UPDATE lab_account_closures SET requested_at=1').run();objects.set('user_Close/results/image.png','image');
  await processAccountClosures(env);assert.equal(objects.size,1,'No verification callback means no destructive cleanup');
  await processAccountClosures(env,verifyClosureBilling);assert.equal(objects.size,1,'Active Stripe subscription blocks cleanup despite absent local subscription');
  active=false;await processAccountClosures(env,verifyClosureBilling);await processAccountClosures(env,verifyClosureBilling);
  assert.equal(objects.size,0);assert.ok(calls.some(c=>c.url.endsWith('/expire')&&c.init.method==='POST'));
});
