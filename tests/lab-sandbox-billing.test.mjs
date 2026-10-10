import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import worker,{VERSION} from '../sandbox/stripe-billing/worker.mjs';
import {ensureCustomer} from '../lab-worker/customer-billing.mjs';

function setup(t){
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  for(const path of ['../lab-worker/schema.sql',
    '../lab-worker/migrations/0004-pv-soul.sql',
    '../lab-worker/migrations/0006-customers-billing.sql',
    '../lab-worker/migrations/0007-lab-referrals.sql',
    '../lab-worker/migrations/0008-soul-id-launch-credits.sql'])
    db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
  const LAB_DB={prepare(sql){return {bind(...args){
    return {
      async first(){return db.prepare(sql).get(...args)||null;},
      async run(){return db.prepare(sql).run(...args);},
      async all(){return {results:db.prepare(sql).all(...args)};}
    };
  }};}};
  const env={LAB_DB,LAB_SANDBOX_MODE:'true',LAB_STRIPE_SECRET_KEY:'sk_test_sandboxdummy12345',
    LAB_STRIPE_WEBHOOK_SECRET:'whsec_sandboxdummy12345'};
  return {db,env};
}
function sign(env,event){
  const body=JSON.stringify(event),t=Math.floor(Date.now()/1000);
  const signature=createHmac('sha256',env.LAB_STRIPE_WEBHOOK_SECRET)
    .update(t+'.'+body).digest('hex');
  return new Request('https://parallel-vision-lab-sandbox.parallelvision.workers.dev/api/stripe/webhook',{
    method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':'t='+t+',v1='+signature},body
  });
}
function checkoutEvent({id='evt_TestABC1',amount=1000,livemode=false}={}){
  return {id,type:'checkout.session.completed',livemode,data:{object:{
    id:'cs_test_Sandbox001',metadata:{lab_customer_id:'user_SandboxABC1',lab_sku:'topup10'},
    client_reference_id:'user_SandboxABC1',currency:'eur',mode:'payment',
    payment_status:'paid',amount_total:amount,customer:'cus_sandbox001'
  }}};
}
function balance(db){return db.prepare("SELECT balance_credits AS amount FROM lab_customers WHERE id='user_SandboxABC1'").get()?.amount||0;}
test('sandbox exposes no generative routes, owner DB, live keys or images',async()=>{
  const {env}=setup({after:()=>{}});
  const health=await worker.fetch(new Request('https://test/health'),env);
  assert.equal(health.status,200);
  const info=await health.json();
  assert.equal(info.testOnly,true);
  assert.equal(info.version,VERSION);
  for(const path of ['/api/jobs','/api/fashion/quote','/api/uploads','/api/higgsfield/generate']){
    const result=await worker.fetch(new Request('https://test'+path,{method:'POST'}),env);
    assert.equal(result.status,404);
  }
});
test('test-mode paid webhook awards 1000 exactly once; invalid amounts do not credit',async t=>{
  const {env,db}=setup(t);
  await ensureCustomer(env,'user_SandboxABC1');
  assert.equal(balance(db),0);
  const request=sign(env,checkoutEvent());
  const response=await worker.fetch(request,env);
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{received:true});
  assert.equal(balance(db),1000);
  const replay=await worker.fetch(sign(env,checkoutEvent()),env);
  assert.equal(replay.status,200);
  assert.deepEqual(await replay.json(),{received:true,duplicate:true});
  assert.equal(balance(db),1000);
  const tampered=await worker.fetch(sign(env,checkoutEvent({id:'evt_BadAmount1',amount:10})),env);
  assert.equal(tampered.status,200);
  assert.equal(balance(db),1000);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE kind='purchase'").get().n,1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lab_stripe_events").get().n,2);
});
test('never accept LIVE signed events or live API keys on the sandbox Worker',async t=>{
  const {env,db}=setup(t);
  await ensureCustomer(env,'user_SandboxABC1');
  const live=await worker.fetch(sign(env,checkoutEvent({livemode:true})),env);
  assert.equal(live.status,403);
  assert.equal(balance(db),0);
  const wrongKey=await worker.fetch(sign({...env,LAB_STRIPE_SECRET_KEY:'sk_live_badlive'},checkoutEvent()),
    {...env,LAB_STRIPE_SECRET_KEY:'sk_live_badlive'});
  assert.equal(wrongKey.status,503);
  assert.equal(balance(db),0);
  const invalid=await worker.fetch(new Request('https://test/api/stripe/webhook',{
    method:'POST',body:JSON.stringify(checkoutEvent())}),env);
  assert.equal(invalid.status,400);
  assert.equal(balance(db),0);
});
test('billing endpoints require real Clerk identity; false sandbox flags prevent billing',async t=>{
  const {env}=setup(t);
  const noToken=await worker.fetch(new Request('https://test/api/session'),env);
  assert.equal(noToken.status,401);
  const unsafe=await worker.fetch(new Request('https://test/api/session',{headers:{Origin:'https://not-pv-lab.test'}}),env);
  assert.equal(unsafe.status,403);
  const noEnv=await worker.fetch(new Request('https://test/api/session',{headers:{Authorization:'Bearer foo'}}),{...env,LAB_SANDBOX_MODE:'false'});
  assert.equal(noEnv.status,503);
});
