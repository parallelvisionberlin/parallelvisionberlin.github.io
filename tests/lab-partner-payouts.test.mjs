import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {partnerPayoutRoute,nextPartnerPayDate} from '../lab-worker/partner-payouts.mjs';
import {partnerCommissionReport,recordPartnerPaymentContext} from '../lab-worker/partner-commissions.mjs';
import {reconcilePartnerFees} from '../lab-worker/partner-fees.mjs';
import {partnerVoucherRoute} from '../lab-worker/partner-vouchers.mjs';
const call=(f,path='/api/customer/partner/payouts',data,actor='user_Bellini',ownerView=false)=>partnerPayoutRoute(new Request('https://worker.test'+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:'https://pvlab.studio'},...(data===undefined?{}:{body:JSON.stringify(data.requestId?{expectedAmountCents:5800,...data}:data)})}),f.env,actor,{ownerView});
const admin=(f,suffix,data)=>call(f,'/api/admin/partners/bellini-studio/payouts'+suffix,data,'user_Owner',true);
async function sale(f,{buyer='user_Buyer',reference='checkout:cs_A',amount=12000,fee=400,tax=0,facts=true,kind='purchase',at=Date.now()}={}){
 if(!f.db.prepare('SELECT id FROM lab_customers WHERE id=?').get(buyer))f.signup(buyer,buyer+'@example.test');
 f.db.prepare('UPDATE lab_customers SET stripe_customer_id=? WHERE id=?').run('cus_'+buyer,buyer);
 f.db.prepare('INSERT OR IGNORE INTO lab_referrals(referred_customer_id,referrer_customer_id,attributed_at) VALUES(?,?,?)').run(buyer,'user_Bellini',at-1000);
 f.db.prepare('INSERT INTO lab_credit_entries VALUES(?,?,1000,?,?,?)').run('credit:'+reference,buyer,kind,reference,at);
 f.db.prepare('INSERT INTO lab_revenue_events VALUES(?,?,?,?)').run(reference,buyer,amount,at);
 await recordPartnerPaymentContext(f.env,{reference,paidAt:at,kind});
 if(facts)f.db.prepare('INSERT INTO lab_partner_payment_facts VALUES(?,?,?,?,?,?,?)').run(reference,'ch_'+reference.replace(/\W/g,''),'txn_'+reference.replace(/\W/g,''),amount,fee,tax,at);
}

test('Berlin payout dates are 15/30, with February month end and no nonexistent dates',()=>{
 for(const [at,date] of [['2026-10-14T22:30:00Z','2026-10-15'],['2026-10-16T12:00:00Z','2026-10-30'],['2026-10-31T12:00:00Z','2026-11-15'],['2026-02-16T12:00:00Z','2026-02-28'],['2028-02-16T12:00:00Z','2028-02-29']])assert.equal(nextPartnerPayDate(Date.parse(at)),date);
});
test('Bellini cannot request unverified fees or provide a client-chosen amount',async t=>{
 const f=fixture(t);bellini(f,t);await sale(f,{facts:false});
 const before=await(await call(f)).json();assert.equal(before.availableCents,0);assert.equal(before.feePending,1);
 await assert.rejects(()=>call(f,undefined,{requestId:crypto.randomUUID(),amountCents:99999}),{status:409});
 f.db.prepare('INSERT INTO lab_partner_payment_facts VALUES(?,?,?,?,?,?,?)').run('checkout:cs_A','ch_A','txn_A',12000,400,0,Date.now());
 await assert.rejects(()=>call(f,undefined,{requestId:crypto.randomUUID(),expectedAmountCents:99999}),{status:409});
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM lab_partner_payouts').get().n,0);
 const id=crypto.randomUUID();const requested=await(await call(f,undefined,{requestId:id,amountCents:99999})).json();
 assert.equal(requested.requestedCents,5800);assert.equal(requested.availableCents,0);
 assert.equal((await(await call(f,undefined,{requestId:id})).json()).history.length,1);
 assert.equal(f.db.prepare("SELECT balance_credits n FROM lab_customers WHERE id='user_Bellini'").get().n,0);
});
test('payout requests and owner queue have strict partner and real Owner boundaries',async t=>{
 const f=fixture(t),b=bellini(f,t);await sale(f);
 await assert.rejects(()=>call(f,undefined,undefined,'user_Victoria'),{status:403});
 await assert.rejects(()=>call(f,'/api/admin/partner-payouts',undefined,'user_Editor',true),{status:403});
 await assert.rejects(()=>call(f,'/api/customer/partner/payouts/confirm',{id:crypto.randomUUID(),transferReference:'x'}),{status:403});
 await call(f,undefined,{requestId:crypto.randomUUID()});
 const queue=await(await call(f,'/api/admin/partner-payouts',undefined,'user_Owner',true)).json();
 assert.equal(queue.requests.length,1);assert.equal(queue.requests[0].amountCents,5800);
 b.unverify();await assert.rejects(()=>call(f),{status:403});
});
test('the 50 EUR net minimum is enforced by the server at the cent boundary',async t=>{
 for(const [amount,net] of [[10098,4999],[10100,5000]])await t.test(String(net),async st=>{
  const f=fixture(st);bellini(f,st);await sale(f,{amount,fee:100});
  const data=await(await call(f)).json();assert.equal(data.minimumCents,5000);assert.equal(data.availableCents,net);
  if(net<5000)await assert.rejects(()=>call(f,undefined,{requestId:crypto.randomUUID(),expectedAmountCents:net}),{status:409});
  else assert.equal((await(await call(f,undefined,{requestId:crypto.randomUUID(),expectedAmountCents:net})).json()).requestedCents,5000);
 });
});
test('concurrent requests reserve a payment once; cancellation releases only pending claims',async t=>{
 const f=fixture(t);bellini(f,t);await sale(f);
 const results=await Promise.allSettled([call(f,undefined,{requestId:crypto.randomUUID()}),call(f,undefined,{requestId:crypto.randomUUID()})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM lab_partner_payout_claims').get().n,1);
 const {id}=f.db.prepare("SELECT id FROM lab_partner_payouts WHERE status='pending'").get();
 const cancelled=await(await admin(f,'/cancel',{id})).json();assert.equal(cancelled.availableCents,5800);assert.equal(cancelled.history[0].status,'cancelled');
 await call(f,undefined,{requestId:crypto.randomUUID()});assert.equal(f.db.prepare('SELECT COUNT(*) n FROM lab_partner_payout_items').get().n,2);
});
test('only actual confirmed transfers become paid; reviews block confirmation and paid claims never reopen',async t=>{
 const f=fixture(t);bellini(f,t);await sale(f);const id=crypto.randomUUID();await call(f,undefined,{requestId:id});
 await assert.rejects(()=>admin(f,'/confirm',{id}),{status:400});
 f.db.prepare('INSERT INTO lab_billing_reviews(event_id,customer_id,object_id,reason,amount_cents,created_at) VALUES(?,?,?,?,?,?)').run('evt_A','user_Buyer','ch_A','charge.refunded',1000,Date.now());
 await assert.rejects(()=>admin(f,'/confirm',{id,transferReference:'BANK-1'}),{status:409});
 f.db.prepare('DELETE FROM lab_billing_reviews').run();
 const paid=await(await admin(f,'/confirm',{id,transferReference:'BANK-1'})).json();
 assert.equal(paid.paidCents,5800);assert.equal(paid.requestedCents,0);assert.equal(paid.availableCents,0);
 await assert.rejects(()=>admin(f,'/confirm',{id,transferReference:'BANK-1'}),{status:409});
 await assert.rejects(()=>admin(f,'/cancel',{id}),{status:409});
 await assert.rejects(()=>call(f,undefined,{requestId:crypto.randomUUID()}),{status:409});
 assert.throws(()=>f.db.prepare('DELETE FROM lab_partner_payout_claims').run(),/Settled/);
});
test('net rounding, recurring policy, and gross Vitolas accounting remain distinct',async t=>{
 const f=fixture(t);bellini(f,t);const at=Date.now()-10000;
 await sale(f,{amount:1000,fee:17,tax:40,at});
 await sale(f,{reference:'checkout:cs_B',amount:5000,fee:100,tax:0,at:at+1000});
 await sale(f,{reference:'invoice:in_C',amount:3900,fee:84,tax:0,kind:'subscription',at:at+2000});
 const net=await partnerCommissionReport(f.env,'user_Bellini',new Map(),{netOfFees:true});
 assert.equal(net.receipts.find(p=>p.reference==='checkout:cs_A').commissionCents,472);
 assert.equal(net.receipts.find(p=>p.reference==='checkout:cs_B').rate,0);
 assert.equal(net.receipts.find(p=>p.reference==='invoice:in_C').commissionCents,763);
 const gross=await partnerCommissionReport(f.env,'user_Bellini');assert.equal(gross.receipts.find(p=>p.reference==='checkout:cs_A').commissionCents,500);
});
test('a late earlier payment cannot leave a stale first-payment commission payable',async t=>{
 const f=fixture(t);bellini(f,t);const at=Date.now()-1000;
 await sale(f,{at});const id=crypto.randomUUID();await call(f,undefined,{requestId:id});
 await sale(f,{reference:'checkout:cs_Earlier',amount:1000,fee:40,at:at-10000});
 await assert.rejects(()=>admin(f,'/confirm',{id,transferReference:'BANK-LATE'}),{status:409});
 assert.equal(f.db.prepare('SELECT status FROM lab_partner_payouts WHERE id=?').get(id).status,'pending');
});
test('many payments request atomically in one bounded D1 batch and migration replay preserves claims',async t=>{
 const f=fixture(t);bellini(f,t);
 for(let i=0;i<75;i++)await sale(f,{buyer:'user_B'+i,reference:'checkout:cs_'+i});
 const id=crypto.randomUUID(),result=await(await call(f,undefined,{requestId:id,expectedAmountCents:75*5800})).json();
 assert.equal(result.requestedCents,75*5800);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM lab_partner_payout_claims').get().n,75);
 f.db.exec(readFileSync(new URL('../lab-worker/migrations/0043-partner-payouts.sql',import.meta.url),'utf8'));
 assert.equal((await(await call(f)).json()).requestedCents,75*5800);
});
test('actual Stripe fees reconcile through read-only calls; delayed, foreign and invalid facts never become zero fees',async t=>{
 const f=fixture(t);bellini(f,t);await sale(f,{facts:false,amount:1000,fee:40});f.env.LAB_STRIPE_SECRET_KEY='sk_test_synthetic';
 const earlier=globalThis.fetch;let variant='valid',calls=0;
 t.mock.method(globalThis,'fetch',async(url,options={})=>{
  const u=new URL(url);if(u.hostname!=='api.stripe.com')return earlier(url,options);
  calls++;assert.equal(options.method||'GET','GET');
  if(u.pathname.includes('checkout/sessions/'))return Response.json({id:'cs_A',currency:'eur',customer:'cus_user_Buyer',mode:'payment',payment_status:'paid',amount_total:1000,total_details:{amount_tax:0},payment_intent:'pi_A'});
  if(u.pathname.includes('payment_intents/'))return Response.json({id:'pi_A',currency:'eur',customer:'cus_user_Buyer',status:'succeeded',amount_received:1000,latest_charge:'ch_A'});
  return Response.json({id:'ch_A',currency:'eur',amount:1000,paid:true,captured:true,refunded:false,disputed:false,amount_refunded:0,customer:'cus_user_Buyer',livemode:false,
   balance_transaction:variant==='delayed'?null:{id:'txn_A',source:'ch_A',currency:variant==='foreign'?'usd':'eur',amount:1000,fee:variant==='invalid'?-1:40,net:960}});
 });
 for(const v of ['delayed','foreign','invalid']){variant=v;assert.equal((await reconcilePartnerFees(f.env,'user_Bellini')).reconciled,0);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM lab_partner_payment_facts').get().n,0);}
 variant='valid';assert.equal((await reconcilePartnerFees(f.env,'user_Bellini')).reconciled,1);
 assert.equal((await(await call(f)).json()).availableCents,480);
 const before=calls;await reconcilePartnerFees(f.env,'user_Bellini');assert.equal(calls,before);
});
test('legacy and current invoice payments both use verified Stripe fees and recorded taxes',async t=>{
 for(const modern of [false,true])await t.test(modern?'invoice payments':'legacy invoice',async st=>{
  const f=fixture(st);bellini(f,st);await sale(f,{facts:false,reference:'invoice:in_A',kind:'subscription'});f.env.LAB_STRIPE_SECRET_KEY='sk_test_synthetic';
  const earlier=globalThis.fetch;
  st.mock.method(globalThis,'fetch',async(url,options={})=>{
   const u=new URL(url);if(u.hostname!=='api.stripe.com')return earlier(url,options);
   assert.equal(options.method||'GET','GET');
   if(u.pathname==='/v1/invoices/in_A')return Response.json({id:'in_A',currency:'eur',customer:'cus_user_Buyer',status:'paid',amount_paid:12000,
    ...(modern?{total_taxes:[{amount:1000}]}:{payment_intent:'pi_A',total_tax_amounts:[]})});
   if(u.pathname==='/v1/invoice_payments')return Response.json({has_more:false,data:[{invoice:'in_A',status:'paid',amount_paid:12000,payment:{type:'payment_intent',payment_intent:'pi_A'}}]});
   if(u.pathname==='/v1/payment_intents/pi_A')return Response.json({id:'pi_A',currency:'eur',customer:'cus_user_Buyer',status:'succeeded',amount_received:12000,latest_charge:'ch_A'});
   return Response.json({id:'ch_A',currency:'eur',amount:12000,paid:true,captured:true,refunded:false,disputed:false,amount_refunded:0,customer:'cus_user_Buyer',livemode:false,
    balance_transaction:{id:'txn_A',source:'ch_A',currency:'eur',amount:12000,fee:400,net:11600}});
  });
  assert.equal((await reconcilePartnerFees(f.env,'user_Bellini')).reconciled,1);
  assert.equal((await(await call(f)).json()).availableCents,modern?5300:5800);
 });
});
function fixture(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  const file=path=>readFileSync(new URL('../lab-worker/'+path,import.meta.url),'utf8');
  db.exec(file('schema.sql'));
  for(const name of ['0006-customers-billing','0007-lab-referrals','0011-customer-lifecycle','0015-lab-promotional-credits','0024-owner-acquisition','0037-partner-vouchers','0038-partner-commissions','0042-partner-workspaces','0043-partner-payouts'])db.exec(file('migrations/'+name+'.sql'));
  const env={LAB_CLERK_SECRET_KEY:'test-only',LAB_PUBLIC_APP_URL:'https://pvlab.studio/studio.html',LAB_DB:{prepare(sql){return {bind(...args){return {
    async first(){return db.prepare(sql).get(...args)||null;},
    async all(){return {results:db.prepare(sql).all(...args)};},
    async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};}
  };}};}}};
  env.LAB_DB.batch=async statements=>{db.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}};
  const signup=(id,email)=>{
    db.prepare('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)').run(id,id,Date.now(),Date.now());
    if(email)db.prepare('INSERT INTO lab_customer_contacts VALUES(?,?,?,?)').run(id,email,Date.now(),Date.now());
  };
  db.exec("CREATE TABLE users(id TEXT PRIMARY KEY,role TEXT,auth_provider TEXT);INSERT INTO users VALUES('user_Owner','owner','clerk'),('user_Editor','admin','clerk'),('user_Imposter','owner','password')");
  env.OWNER_DB=env.LAB_DB;
  // Use a synthetic address and mock its digest; public CI needs no private email.
  const email='vitolas@example.test';
  const original=crypto.subtle.digest.bind(crypto.subtle);
  t.mock.method(crypto.subtle,'digest',async (algorithm,data)=>{
    if(algorithm==='SHA-256'&&new TextDecoder().decode(data)===email)
      return Uint8Array.from('e502c5f0d08298cb39182f9711784dd5f468d3a1eb721699c0acf061a642445a'.match(/../g),v=>parseInt(v,16)).buffer;
    return original(algorithm,data);
  });
  let primary=email,verified=true,upstream=200,requestedSubject='';
  t.mock.method(globalThis,'fetch',async url=>{
    requestedSubject=decodeURIComponent(new URL(url).pathname.split('/').at(-1));
    return new Response(JSON.stringify({id:requestedSubject,primary_email_address_id:'primary',email_addresses:[{id:'primary',email_address:requestedSubject==='user_Victoria'?primary:'other@example.test',verification:{status:verified?'verified':'unverified'}}]}),{status:upstream});
  });
  signup('user_Victoria',email);signup('user_Other','other@example.test');
  const request=(query='',method='GET')=>new Request('https://worker.test/api/customer/partner'+query,{method,headers:{Origin:'https://pvlab.studio'}});
  return {db,env,email,signup,request,setEmail(value){primary=value;},unverify(){verified=false;},upstream(value){upstream=value;},get requestedSubject(){return requestedSubject;}};
}

// Both approved accounts use synthetic addresses; private emails stay out of CI.
function bellini(f,t){
  const email='bellini@example.test',digest=crypto.subtle.digest.bind(crypto.subtle),fetcher=globalThis.fetch;
  t.mock.method(crypto.subtle,'digest',async(algorithm,data)=>{
    if(algorithm==='SHA-256'&&new TextDecoder().decode(data)===email)
      return Uint8Array.from('c484790dd1d02365be89451c4917401abe80da73d059b7f159995a59dac5aefd'.match(/../g),v=>parseInt(v,16)).buffer;
    return digest(algorithm,data);
  });
  let primary=email,verified=true;
  t.mock.method(globalThis,'fetch',async(url,...args)=>{
    if(new URL(url).pathname.endsWith('/user_Bellini'))return Response.json({id:'user_Bellini',primary_email_address_id:'primary',email_addresses:[{id:'primary',email_address:primary,verification:{status:verified?'verified':'unverified'}}]});
    return fetcher(url,...args);
  });
  f.signup('user_Bellini',email);
  const call=(action='/vouchers',data,actor='user_Bellini',ownerView=false)=>partnerVoucherRoute(new Request('https://worker.test'+(ownerView?'/api/admin/partners/bellini-studio':'/api/customer/partner')+action,{
    method:data===undefined?'GET':'POST',headers:{Origin:'https://pvlab.studio',...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})
  }),f.env,actor,{ownerView});
  return {call,email,setEmail(value){primary=value;},unverify(){verified=false;},budget:total=>call('/budget',{total},'user_Owner',true),
    create:async(overrides={})=>(await(await call('/vouchers',{credits:200,days:14,note:'Bellini campaign',requestId:crypto.randomUUID(),...overrides})).json()).voucher};
}

