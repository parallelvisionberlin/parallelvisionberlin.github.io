import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {
  isPrivateLivePilot,canCustomerGenerate,canCustomerCheckout,isPermittedPilotPurchase
} from '../lab-worker/customer-rollout.mjs';
import {customerSession,customerRoute,ensureCustomer} from '../lab-worker/customer-billing.mjs';

const PILOT='user_PilotTester1',OTHER='user_OtherTester1';
const secrets={
  LAB_STRIPE_SECRET_KEY:'rk_live_dummy_nobody_has_this',
  LAB_STRIPE_WEBHOOK_SECRET:'whsec_dummy_fake',
  LAB_CUSTOMER_SPICY_API_KEY:'dummy_provider_not_used'
};
const flags={LAB_PUBLIC_GENERATION_ENABLED:'false',LAB_CHECKOUT_ENABLED:'false'};
const pilotEnv={...secrets,...flags,LAB_LIVE_PILOT_CUSTOMER_ID:PILOT};
const j=(data)=>new Request('https://lab.test/api/billing/checkout',{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)
});
function fixture(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  for(const src of ['../lab-worker/schema.sql','../lab-worker/migrations/0006-customers-billing.sql',
    '../lab-worker/migrations/0007-lab-referrals.sql','../lab-worker/migrations/0008-soul-id-launch-credits.sql'])
    db.exec(readFileSync(new URL(src,import.meta.url),'utf8'));
  const LAB_DB={
    prepare(sql){return {bind(...p){
      return {
        first:async()=>db.prepare(sql).get(...p)||null,
        run:async()=>{const x=db.prepare(sql).run(...p);return {meta:{changes:x.changes}};},
        all:async()=>({results:db.prepare(sql).all(...p)})
      };
    }};},
    batch:async(statements)=>{db.exec('BEGIN');try{
      const r=[];for(const statement of statements)r.push(await statement.run());
      db.exec('COMMIT');return r;
    }catch(e){db.exec('ROLLBACK');throw e;}}
  };
  return {db,env:{...pilotEnv,LAB_DB,LAB_PUBLIC_APP_URL:'https://parallelvisionlabel.com/lab/studio.html'}};
}
test('production stays entirely closed until a real exact customer ID is deliberately whitelisted',()=>{
  assert.equal(canCustomerCheckout({...secrets,...flags},PILOT),false);
  assert.equal(canCustomerGenerate({...secrets,...flags},PILOT),false);
  assert.equal(isPrivateLivePilot({...secrets,...flags,LAB_LIVE_PILOT_CUSTOMER_ID:'junk'},PILOT),false);
  assert.equal(isPrivateLivePilot(pilotEnv,OTHER),false);
  assert.equal(canCustomerGenerate(pilotEnv,OTHER),false);
  assert.equal(canCustomerCheckout(pilotEnv,OTHER),false);
  assert.equal(isPrivateLivePilot(pilotEnv,PILOT),true);
  assert.equal(canCustomerGenerate(pilotEnv,PILOT),true);
  assert.equal(canCustomerCheckout(pilotEnv,PILOT),true);
  assert.equal(canCustomerCheckout({...pilotEnv,LAB_STRIPE_WEBHOOK_SECRET:''},PILOT),false);
  assert.equal(canCustomerGenerate({...pilotEnv,LAB_CUSTOMER_SPICY_API_KEY:''},PILOT),false);
  assert.equal(canCustomerCheckout({...pilotEnv,LAB_CHECKOUT_ENABLED:'true'},PILOT),false);
  assert.equal(canCustomerGenerate({...pilotEnv,LAB_PUBLIC_GENERATION_ENABLED:'true'},PILOT),false);
  assert.equal(canCustomerGenerate({...pilotEnv,LAB_LIVE_PILOT_CUSTOMER_ID:OTHER},PILOT),false);
  assert.equal(canCustomerCheckout({
    ...secrets,LAB_PUBLIC_GENERATION_ENABLED:'true',LAB_CHECKOUT_ENABLED:'false'},OTHER),false);
  assert.equal(canCustomerCheckout({
    ...secrets,LAB_PUBLIC_GENERATION_ENABLED:'false',LAB_CHECKOUT_ENABLED:'true'},OTHER),false);
  assert.equal(canCustomerCheckout({
    ...secrets,LAB_PUBLIC_GENERATION_ENABLED:'true',LAB_CHECKOUT_ENABLED:'true'},OTHER),true);
});
test('pilot offers the €10 top-up or Starter subscription, no higher packs',()=>{
  assert.equal(isPermittedPilotPurchase(pilotEnv,PILOT,'topup10'),true);
  assert.equal(isPermittedPilotPurchase(pilotEnv,PILOT,'starter'),true);
  for(const sku of ['topup29','topup75','creator','studio'])
    assert.equal(isPermittedPilotPurchase(pilotEnv,PILOT,sku),false);
  assert.equal(isPermittedPilotPurchase(pilotEnv,OTHER,'starter'),true);
});
test('authenticated pilot sees wallet and can open mocked real Checkout, while other users stay blocked',async t=>{
  const {db,env}=fixture(t);
  await ensureCustomer(env,PILOT);
  await ensureCustomer(env,OTHER);
  const pilot=await customerSession(env,PILOT);
  const outsider=await customerSession(env,OTHER);
  assert.equal(pilot.billingReady,true);
  assert.equal(pilot.generationReady,true);
  assert.equal(outsider.billingReady,false);
  assert.equal(outsider.generationReady,false);
  await assert.rejects(()=>customerRoute(j({sku:'topup10'}),env,OTHER),/not enabled/);
  assert.deepEqual(pilot.products.map(p=>p.id),['topup10','starter']);
  for(const sku of ['topup29','creator'])
    await assert.rejects(()=>customerRoute(j({sku}),env,PILOT),/pilot permits one/);
  let calls=0;
  const prev=globalThis.fetch;
  globalThis.fetch=async(url,init)=>{
    if(url==='https://api.stripe.com/v1/customers'){
      assert.equal(init.headers['Idempotency-Key'],'pv-lab-customer:'+PILOT);
      assert.equal(new URLSearchParams(init.body).get('metadata[lab_customer_id]'),PILOT);
      return Response.json({id:'cus_pilotTest'});
    }
    assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');
    assert.equal(init.method,'POST');
    assert.equal(init.headers.Authorization,'Bearer '+secrets.LAB_STRIPE_SECRET_KEY);
    const data=new URLSearchParams(init.body);
    assert.equal(data.get('line_items[0][price_data][unit_amount]'),'1000');
    assert.equal(data.get('line_items[0][price_data][currency]'),'eur');
    assert.equal(data.get('metadata[lab_customer_id]'),PILOT);
    assert.equal(data.get('metadata[lab_sku]'),'topup10');
    assert.equal(data.get('mode'),'payment');
    assert.equal(data.get('customer'),'cus_pilotTest');
    assert.equal(data.has('invoice_creation[enabled]'),false,'no added invoice fee without explicit opt-in');
    calls++;
    return Response.json({id:'cs_live_mockPilot1',url:'https://checkout.stripe.com/c/pay/cs_live_mockPilot1'});
  };
  try{
    const response=await customerRoute(j({sku:'topup10'}),env,PILOT);
    assert.equal(response.status,200);
    const payload=await response.json();
    assert.equal(payload.checkoutId,'cs_live_mockPilot1');
    assert.match(payload.url,/^https:\/\/checkout\.stripe\.com\//);
    assert.equal(calls,1);
    assert.equal(db.prepare('SELECT balance_credits AS balance FROM lab_customers WHERE id=?').get(PILOT).balance,0);
    // Once signed Stripe webhook confirms a payment, no further pilot checkout.
    db.prepare("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('pilotpaid',?,1000,'purchase','checkout:cs_live_mockPilot1',1)").run(PILOT);
    await assert.rejects(()=>customerRoute(j({sku:'topup10'}),env,PILOT),/already completed/);
    assert.equal(calls,1);
  }finally{globalThis.fetch=prev;}
});
test('whitelisted account can prepare a single Starter monthly subscription without charging or granting credits',async t=>{
  const {db,env}=fixture(t);
  await ensureCustomer(env,PILOT);
  await ensureCustomer(env,OTHER);
  db.prepare('UPDATE lab_customers SET stripe_customer_id=? WHERE id=?').run('cus_starterPilot',PILOT);
  const before=globalThis.fetch;t.after(()=>{globalThis.fetch=before;});
  const forms=[];
  globalThis.fetch=async(url,init)=>{
    assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');
    const form=new URLSearchParams(init.body);forms.push(form);
    return Response.json({id:'cs_live_starterPilot',url:'https://checkout.stripe.com/c/pay/cs_live_starterPilot'});
  };
  await assert.rejects(()=>customerRoute(j({sku:'starter'}),env,OTHER),/not enabled/);
  const response=await customerRoute(j({sku:'starter'}),env,PILOT);
  assert.equal(response.status,200);
  assert.equal(forms.length,1);
  const form=forms[0];
  assert.equal(form.get('mode'),'subscription');
  assert.equal(form.get('client_reference_id'),PILOT);
  assert.equal(form.get('customer'),'cus_starterPilot');
  assert.equal(form.get('line_items[0][price_data][unit_amount]'),'1500');
  assert.equal(form.get('line_items[0][price_data][recurring][interval]'),'month');
  assert.equal(form.get('metadata[lab_sku]'),'starter');
  assert.equal(form.get('subscription_data[metadata][lab_customer_id]'),PILOT);
  assert.equal(form.get('subscription_data[metadata][lab_sku]'),'starter');
  assert.ok([...form.keys()].every(key=>!key.startsWith('invoice_creation')));
  assert.equal(db.prepare('SELECT balance_credits FROM lab_customers WHERE id=?').get(PILOT).balance_credits,0);
  // A verified paid invoice is the only path to a subscription credit grant.
  db.prepare("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('starterpaid',?,1600,'subscription','invoice:in_starterPilot',1)").run(PILOT);
  await assert.rejects(()=>customerRoute(j({sku:'starter'}),env,PILOT),/already completed/);
  await assert.rejects(()=>customerRoute(j({sku:'topup10'}),env,PILOT),/already completed/);
  assert.equal(forms.length,1);
});
test('customer Higgsfield generation remains disabled until separately licensed',()=>{
  const source=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  assert.match(source,/customer&&env\.LAB_CUSTOMER_HIGGSFIELD_ENABLED!=='true'/);
  assert.match(source,/higgsfieldEnabled:ready&&!!env\.HF_CREDENTIALS&&env\.LAB_CUSTOMER_HIGGSFIELD_ENABLED==='true'/);
});
test('one-time invoice settings are server-controlled, optional, and never sent to subscriptions',async t=>{
  const {db,env}=fixture(t);await ensureCustomer(env,PILOT);
  db.prepare('UPDATE lab_customers SET stripe_customer_id=? WHERE id=?').run('cus_invoiceTest',PILOT);
  const footer='PV LAB · Alejandro Molinari\nUmsatzsteuerbefreit gemäß § 19 UStG.';
  Object.assign(env,{LAB_CHECKOUT_ENABLED:'true',LAB_PUBLIC_GENERATION_ENABLED:'true',
    LAB_STRIPE_INVOICES_ENABLED:'true',LAB_STRIPE_INVOICE_FOOTER:footer});
  const previous=globalThis.fetch;t.after(()=>{globalThis.fetch=previous;});
  const forms=[];
  globalThis.fetch=async(url,init)=>{
    assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');
    forms.push(new URLSearchParams(init.body));
    return Response.json({id:'cs_test_invoice',url:'https://checkout.stripe.com/c/pay/cs_test_invoice'});
  };
  await customerRoute(j({sku:'topup10',invoiceFooter:'UNTRUSTED',invoice_creation:{enabled:false}}),env,PILOT);
  const form=forms[0];
  assert.equal(form.get('invoice_creation[enabled]'),'true');
  assert.equal(form.get('invoice_creation[invoice_data][footer]'),footer);
  assert.equal(form.get('invoice_creation[invoice_data][metadata][lab_customer_id]'),PILOT);
  assert.equal(form.get('invoice_creation[invoice_data][metadata][lab_sku]'),'topup10');
  assert.equal(form.get('customer_update[name]'),'auto');
  assert.equal(form.get('customer_update[address]'),'auto');
  assert.equal(db.prepare('SELECT balance_credits FROM lab_customers WHERE id=?').get(PILOT).balance_credits,0);
  await customerRoute(j({sku:'starter'}),env,PILOT);
  assert.equal(forms[1].get('mode'),'subscription');
  assert.ok([...forms[1].keys()].every(key=>!key.startsWith('invoice_creation')));
  for(const bad of ['', ' '.repeat(2), 'x'.repeat(1001)]){
    env.LAB_STRIPE_INVOICE_FOOTER=bad;
    await assert.rejects(()=>customerRoute(j({sku:'topup10'}),env,PILOT),/Invoice details are not configured/);
  }
  assert.equal(forms.length,2,'invalid invoice configuration must not initiate payment');
});
test('public launch switches are explicit, keys stay out of source and pilot does not override global rollout',()=>{
  const vars=readFileSync(new URL('../lab-worker/wrangler.toml',import.meta.url),'utf8');
  assert.match(vars,/LAB_PUBLIC_GENERATION_ENABLED = "true"/);
  assert.match(vars,/LAB_CHECKOUT_ENABLED = "true"/);
  assert.match(vars,/LAB_CUSTOMER_HIGGSFIELD_ENABLED = "true"/);
  assert.doesNotMatch(vars,/LAB_LIVE_PILOT_CUSTOMER_ID\s*=/);
  const frontend=readFileSync(new URL('../lab/customer-entry.js',import.meta.url),'utf8');
  assert.match(frontend,/profile\.billingReady/);
});
