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
    '../lab-worker/migrations/0008-soul-id-launch-credits.sql',
    '../lab-worker/migrations/0024-owner-acquisition.sql'])
    db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
  const LAB_DB={
    prepare(sql){return {bind(...args){
      return {
        async first(){return db.prepare(sql).get(...args)||null;},
        async run(){const result=db.prepare(sql).run(...args);return {meta:{changes:result.changes}};},
        async all(){return {results:db.prepare(sql).all(...args)};}
      };
    }};},
    async batch(statements){
      // Match D1's atomic batch behavior for exactly-once referral rewards.
      const results=[];db.exec('BEGIN');
      try{
        for(const statement of statements)results.push(await statement.run());
        db.exec('COMMIT');return results;
      }catch(error){db.exec('ROLLBACK');throw error;}
    }
  };
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
test('sandbox exposes no generative routes, owner DB, live keys or images',async t=>{
  const {env}=setup(t);
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
test('post-payment invoice event never adds a second credit grant for a top-up',async t=>{
  const {env,db}=setup(t);await ensureCustomer(env,'user_SandboxABC1');
  await worker.fetch(sign(env,checkoutEvent()),env);
  const invoice={id:'evt_TopupInvoice',type:'invoice.paid',livemode:false,data:{object:{
    id:'in_TopupInvoice',status:'paid',currency:'eur',amount_paid:1000,billing_reason:'manual',
    customer:'cus_sandbox001',metadata:{lab_customer_id:'user_SandboxABC1',lab_sku:'topup10'}
  }}};
  assert.equal((await worker.fetch(sign(env,invoice),env)).status,200);
  assert.equal((await worker.fetch(sign(env,invoice),env)).status,200);
  assert.equal(balance(db),1000);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lab_credit_entries').get().n,1);
});
test('concurrent event replay, async success and mismatched customer links never duplicate or misroute credits',async t=>{
  const {env,db}=setup(t);await ensureCustomer(env,'user_SandboxABC1');await ensureCustomer(env,'user_Other');
  const responses=await Promise.all([worker.fetch(sign(env,checkoutEvent()),env),worker.fetch(sign(env,checkoutEvent()),env)]);
  assert.ok(responses.every(r=>r.status===200));assert.equal(balance(db),1000);
  const asyncPaid=checkoutEvent({id:'evt_AsyncSuccess'});asyncPaid.type='checkout.session.async_payment_succeeded';
  assert.equal((await worker.fetch(sign(env,asyncPaid),env)).status,200);assert.equal(balance(db),1000);
  const wrong=checkoutEvent({id:'evt_WrongCustomer'});wrong.data.object.id='cs_test_other';wrong.data.object.client_reference_id='user_Other';wrong.data.object.metadata.lab_customer_id='user_Other';
  assert.equal((await worker.fetch(sign(env,wrong),env)).status,409);assert.equal(db.prepare("SELECT balance_credits FROM lab_customers WHERE id='user_Other'").get().balance_credits,0);
});
test('verified refunds create a durable spending hold once; no negative balance or arbitrary wallet adjustment',async t=>{
  const {env,db}=setup(t);await ensureCustomer(env,'user_SandboxABC1');await worker.fetch(sign(env,checkoutEvent()),env);
  const refund={id:'evt_RefundABC',type:'charge.refunded',livemode:false,data:{object:{id:'ch_refundABC',customer:'cus_sandbox001',amount_refunded:1000}}};
  assert.equal((await worker.fetch(sign(env,refund),env)).status,200);assert.equal((await worker.fetch(sign(env,refund),env)).status,200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lab_billing_reviews').get().n,1);assert.equal(balance(db),1000);
  assert.throws(()=>db.prepare("INSERT INTO jobs(id,owner_id,params,state,created_at,updated_at) VALUES('held','user_SandboxABC1','{}','queued',1,1)").run(),/billing review required/);
});
test('subscriptions grant the exact plan credits per paid billing cycle, ignore prorations and read current cancellation state',async t=>{
  const {env,db}=setup(t);await ensureCustomer(env,'user_SandboxABC1');
  let status='active';const old=globalThis.fetch;t.after(()=>{globalThis.fetch=old;});
  globalThis.fetch=async url=>{
    assert.equal(url,'https://api.stripe.com/v1/subscriptions/sub_planABC');
    return Response.json({id:'sub_planABC',customer:'cus_sandbox001',status,metadata:{lab_customer_id:'user_SandboxABC1',lab_sku:'starter'},items:{data:[{price:{unit_amount:1500,currency:'eur'}}]}});
  };
  const invoice=(id,reason='subscription_cycle',amount=1500)=>({id:'evt_'+id,type:'invoice.paid',livemode:false,data:{object:{id:'in_'+id,status:'paid',currency:'eur',amount_paid:amount,billing_reason:reason,subscription:'sub_planABC'}}});
  assert.equal((await worker.fetch(sign(env,invoice('first','subscription_create')),env)).status,200);assert.equal(balance(db),1600);
  const results=await Promise.all([worker.fetch(sign(env,invoice('renewal')),env),worker.fetch(sign(env,invoice('renewal')),env)]);assert.ok(results.every(r=>r.status===200));assert.equal(balance(db),3200);
  await worker.fetch(sign(env,invoice('proration','subscription_update')),env);
  await worker.fetch(sign(env,invoice('underpaid','subscription_cycle',500)),env);assert.equal(balance(db),3200);
  status='canceled';
  const stale={id:'evt_staleActive',type:'customer.subscription.updated',livemode:false,data:{object:{id:'sub_planABC',status:'active'}}};
  assert.equal((await worker.fetch(sign(env,stale),env)).status,200);
  assert.equal(db.prepare('SELECT status FROM lab_subscriptions').get().status,'canceled');
});
test('a signed dispute resolves the Stripe charge customer before pausing that wallet',async t=>{
  const {env,db}=setup(t);await ensureCustomer(env,'user_SandboxABC1');await worker.fetch(sign(env,checkoutEvent()),env);
  const old=globalThis.fetch;t.after(()=>{globalThis.fetch=old;});
  globalThis.fetch=async url=>{assert.equal(url,'https://api.stripe.com/v1/charges/ch_disputedABC');return Response.json({id:'ch_disputedABC',customer:'cus_sandbox001'});};
  const dispute={id:'evt_disputeABC',type:'charge.dispute.created',livemode:false,data:{object:{id:'dp_testABC',charge:'ch_disputedABC',amount:1000}}};
  assert.equal((await worker.fetch(sign(env,dispute),env)).status,200);
  assert.equal(db.prepare('SELECT customer_id FROM lab_billing_reviews').get().customer_id,'user_SandboxABC1');
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
