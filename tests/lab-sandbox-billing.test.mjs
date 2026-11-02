import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import worker,{VERSION} from '../sandbox/stripe-billing/worker.mjs';
import {ensureCustomer,customerRoute} from '../lab-worker/customer-billing.mjs';

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


test('€3 pack uses one-time Checkout with server-controlled 300 cents and no early credit',async t=>{
  const {db,env}=setup(t);
  Object.assign(env,{LAB_CHECKOUT_ENABLED:'true',LAB_PUBLIC_GENERATION_ENABLED:'true',LAB_CUSTOMER_SPICY_API_KEY:'mock_not_used'});
  await ensureCustomer(env,'user_SandboxABC1');
  db.prepare('UPDATE lab_customers SET stripe_customer_id=? WHERE id=?').run('cus_sandbox001','user_SandboxABC1');
  const previous=globalThis.fetch;t.after(()=>{globalThis.fetch=previous;});
  const forms=[];
  globalThis.fetch=async(url,init)=>{
    assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');
    assert.equal(init.headers['Stripe-Version'],'2026-09-30.endive');
    forms.push(new URLSearchParams(init.body));
    return Response.json({id:'cs_test_Topup300',url:'https://checkout.stripe.com/c/pay/cs_test_Topup300'});
  };
  const catalog=await (await customerRoute(new Request('https://lab.test/api/customer/catalog'),env,'user_SandboxABC1')).json();
  assert.deepEqual(catalog.products.find(p=>p.id==='topup3'),{id:'topup3',type:'payment',priceEur:3,credits:300,title:'PV Lab · 300 credits'});
  const request=new Request('https://lab.test/api/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sku:'topup3',cents:1,credits:999999,mode:'subscription'})});
  const result=await customerRoute(request,env,'user_SandboxABC1');
  assert.equal(result.status,200);assert.equal(forms.length,1);
  const form=forms[0];
  assert.equal(form.get('mode'),'payment');
  assert.equal(form.get('line_items[0][price_data][unit_amount]'),'300');
  assert.equal(form.get('line_items[0][price_data][currency]'),'eur');
  assert.equal(form.get('adaptive_pricing[enabled]'),'true');
  assert.match(form.get('integration_identifier'),/^pv_lab_hosted_[a-z]{8}$/);
  assert.equal(form.get('metadata[lab_sku]'),'topup3');
  assert.equal(form.get('line_items[0][price_data][recurring][interval]'),null);
  assert.equal(form.get('subscription_data[metadata][lab_sku]'),null);
  assert.equal(balance(db),0,'Opening Checkout never awards credits');
});

test('€3 payment delivers 300 credits once, rejects invalid payment facts and remains nonrecurring',async t=>{
  const {db,env}=setup(t);await ensureCustomer(env,'user_SandboxABC1');
  const event=(id,overrides={})=>{
    const e=checkoutEvent({id,amount:300});e.data.object.metadata.lab_sku='topup3';
    Object.assign(e.data.object,overrides);return e;
  };
  for(const [name,overrides] of Object.entries({underpaid:{amount_total:299},overpaid:{amount_total:301},currency:{currency:'usd'},unpaid:{payment_status:'unpaid'},mode:{mode:'subscription'},identity:{client_reference_id:'user_Other'}})){
    assert.equal((await worker.fetch(sign(env,event('evt_Topup3Bad'+name,overrides)),env)).status,200);
    assert.equal(balance(db),0,name+' must not credit the wallet');
  }
  const paid=event('evt_Topup3Paid',{presentment_details:{presentment_currency:'brl',presentment_amount:1860}});
  assert.equal((await worker.fetch(sign(env,paid),env)).status,200);assert.equal(balance(db),300);
  assert.equal((await worker.fetch(sign(env,paid),env)).status,200);assert.equal(balance(db),300);
  const asyncPaid=event('evt_Topup3Async');asyncPaid.type='checkout.session.async_payment_succeeded';
  assert.equal((await worker.fetch(sign(env,asyncPaid),env)).status,200);assert.equal(balance(db),300);
  const invoice={id:'evt_Topup3Invoice',type:'invoice.paid',livemode:false,data:{object:{id:'in_Topup3',status:'paid',currency:'eur',amount_paid:300,billing_reason:'manual',customer:'cus_sandbox001',metadata:{lab_customer_id:'user_SandboxABC1',lab_sku:'topup3'}}}};
  assert.equal((await worker.fetch(sign(env,invoice),env)).status,200);assert.equal(balance(db),300);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lab_subscriptions').get().n,0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE kind='purchase'").get().n,1);
  assert.equal(db.prepare('SELECT SUM(amount_cents) AS amount FROM lab_revenue_events').get().amount,300);
});
