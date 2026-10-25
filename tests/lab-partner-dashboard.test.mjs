import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {partnerWorkspace,partnerDashboardRoute,ownerPartnerDashboardRoute,publicPartnerLink} from '../lab-worker/partner-dashboard.mjs';
import {calculatePartnerCommissions,sixCalendarMonthsAfter,recordPartnerPaymentContext} from '../lab-worker/partner-commissions.mjs';
import {stripeWebhook} from '../lab-worker/customer-billing.mjs';
import {resolveVitolasLink} from '../lab/vitolas-link.js';

test('the working desk keeps all bindings, current branding and full-page tools without modal windows',()=>{
  const html=readFileSync(new URL('../lab/vitolas-studio.html',import.meta.url),'utf8');
  const controller=readFileSync(new URL('../lab/vitolas-studio.js',import.meta.url),'utf8');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'Unique dashboard controls');
  for(const match of controller.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(match[1]),'Missing controller target: '+match[1]);
  assert.ok(html.indexOf('class="partner-metrics"')<html.indexOf('class="partner-link"'));
  const board=html.slice(html.indexOf('id="partner-results"'),html.indexOf('class="partner-results-context"'));
  assert.ok(board.indexOf('id="partner-subscribed"')<board.indexOf('id="partner-paying"'));
  assert.ok(board.indexOf('id="partner-paying"')<board.indexOf('id="partner-overview-revenue"'));
  assert.ok(board.indexOf('id="partner-overview-revenue"')<board.indexOf('id="partner-commission"'));
  assert.equal((html.match(/<dialog /g)||[]).length,0);
  assert.equal((html.match(/role="tabpanel"/g)||[]).length,5);
  assert.equal((html.match(/role="tab"/g)||[]).length,5);
  assert.match(html,/branding\/pvlab-wordmark-bold\.svg/);
  assert.equal(html.includes('data-partner-dialog'),false);
  assert.equal(controller.includes('showModal'),false);
  assert.doesNotMatch(html+controller,/[\u2190-\u21ff\uFE0F‹›]/u,'No Unicode arrow or emoji controls');
  assert.equal(/<dialog[^>]+\bopen\b/.test(html),false);
  assert.equal(html.includes('partner-activity-card'),false);
  assert.match(html,/<header class="[^"]*partner-hero/);
  assert.equal((html.match(/id="partner-title"/g)||[]).length,1);
  assert.ok(ids.includes('partner-prev')&&ids.includes('partner-page'));
  assert.match(html,/<input id="partner-voucher-credits"[^>]+type="number"[^>]+min="1"[^>]+max="500"/);
  assert.match(html,/<select id="partner-voucher-days"/);
  assert.ok(html.indexOf('class="partner-metrics"')<html.indexOf('id="partner-invitations"'));
});
import {partnerVoucherRoute} from '../lab-worker/partner-vouchers.mjs';
import {voucherCustomerRoute,labAdminRoute} from '../lab-worker/promotions.mjs';

function gifts(f){
  const call=(action='',data,actor='user_Victoria',ownerView=false)=>partnerVoucherRoute(new Request('https://worker.test'+(ownerView?'/api/admin/partners/vitolas-studio':'/api/customer/partner')+(action||'/vouchers'),{
    method:data===undefined?'GET':'POST',headers:{Origin:'https://pvlab.studio',...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})
  }),f.env,actor,{ownerView});
  const budget=total=>call('/budget',{total},'user_Owner',true);
  const data=(overrides={})=>({credits:100,days:14,note:'Beauty campaign',requestId:crypto.randomUUID(),...overrides});
  const create=async overrides=>(await (await call('/vouchers',data(overrides))).json()).voucher;
  const redeem=(code,subject)=>voucherCustomerRoute(new Request('https://worker.test/api/customer/vouchers/redeem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})}),f.env,subject);
  return {call,budget,data,create,redeem};
}

function fixture(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  const file=path=>readFileSync(new URL('../lab-worker/'+path,import.meta.url),'utf8');
  db.exec(file('schema.sql'));
  for(const name of ['0006-customers-billing','0007-lab-referrals','0011-customer-lifecycle','0015-lab-promotional-credits','0024-owner-acquisition','0037-partner-vouchers','0038-partner-commissions'])db.exec(file('migrations/'+name+'.sql'));
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
test('workspace requires verified approved email, current account, and fresh authoritative contact',async t=>{
  const f=fixture(t);
  assert.equal((await partnerWorkspace(f.env,'user_Victoria')).name,'Vitolas Studio');
  assert.equal(await partnerWorkspace(f.env,'user_Other'),null);
  f.db.prepare('UPDATE lab_customer_contacts SET verified_at=NULL WHERE customer_id=?').run('user_Victoria');
  assert.equal(await partnerWorkspace(f.env,'user_Victoria'),null);
  f.db.prepare('UPDATE lab_customer_contacts SET verified_at=?,synced_at=? WHERE customer_id=?').run(Date.now(),Date.now()-86400001,'user_Victoria');
  assert.equal(await partnerWorkspace(f.env,'user_Victoria'),null);
  f.db.prepare('INSERT INTO lab_account_closures(customer_id,requested_at) VALUES(?,?)').run('user_Victoria',Date.now());
  assert.equal(await partnerWorkspace(f.env,'user_Victoria',{verify:true}),null);
});
test('private owner view uses the real owner guard and cannot be enabled by a URL parameter',async t=>{
  const f=fixture(t);
  const request=new Request('https://worker.test/api/admin/partners/vitolas-studio?owner=true&customer_id=user_Other',{headers:{Origin:'https://pvlab.studio'}});
  for(const subject of ['user_Victoria','user_Other','user_Editor','user_Imposter'])
    await assert.rejects(()=>ownerPartnerDashboardRoute(request,f.env,subject),{status:403});
  f.signup('user_Friend','friend@example.test');
  f.db.prepare('INSERT INTO lab_referrals(referred_customer_id,referrer_customer_id,attributed_at) VALUES(?,?,?)').run('user_Friend','user_Victoria',Date.now());
  const response=await ownerPartnerDashboardRoute(request,f.env,'user_Owner'),data=await response.json();
  assert.match(response.headers.get('cache-control'),/no-store/);
  assert.equal(data.ownerView,true);assert.equal(data.totals.registered,1);assert.equal(data.customers[0].email,'friend@example.test');
  assert.equal(f.db.prepare('SELECT customer_id FROM lab_referral_codes').get().customer_id,'user_Victoria');
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM lab_credit_entries').get().n,0);
});
test('owner access before Victoria activation returns a truthful pending state without creating her account',async t=>{
  const f=fixture(t);
  f.db.prepare('DELETE FROM lab_customer_contacts WHERE customer_id=?').run('user_Victoria');
  const request=new Request('https://worker.test/api/admin/partners/vitolas-studio');
  const data=await (await ownerPartnerDashboardRoute(request,f.env,'user_Owner')).json();
  assert.equal(data.awaitingPartner,true);assert.equal(data.ownerView,true);assert.equal(data.referralUrl,undefined);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM lab_referral_codes').get().n,0);
  await assert.rejects(()=>ownerPartnerDashboardRoute(new Request(request.url,{method:'POST'}),f.env,'user_Owner'),{status:405});
});
test('owner view rechecks the selected partner identity and refuses stale reassigned contact data',async t=>{
  const f=fixture(t);f.setEmail('reassigned@example.test');
  await assert.rejects(()=>ownerPartnerDashboardRoute(new Request('https://worker.test/api/admin/partners/vitolas-studio'),f.env,'user_Owner'),{status:503});
});
test('session discovery never waits on Clerk or creates contacts and access can verify a first login',async t=>{
  const f=fixture(t);
  f.db.prepare('DELETE FROM lab_customer_contacts WHERE customer_id=?').run('user_Victoria');
  assert.equal(await partnerWorkspace(f.env,'user_Victoria'),null);
  assert.equal(f.requestedSubject,'');
  assert.equal((await partnerWorkspace(f.env,'user_Victoria',{verify:true})).slug,'vitolas-studio');
});
test('dashboard rechecks Clerk and rejects changed/unverified email and unavailable verification',async t=>{
  const f=fixture(t);
  f.setEmail('someone@example.test');
  await assert.rejects(()=>partnerDashboardRoute(f.request(),f.env,'user_Victoria'),{status:403});
  f.setEmail(f.email);f.unverify();
  await assert.rejects(()=>partnerDashboardRoute(f.request(),f.env,'user_Victoria'),{status:403});
  f.upstream(503);
  await assert.rejects(()=>partnerDashboardRoute(f.request(),f.env,'user_Victoria'),{status:403});
  await assert.rejects(()=>partnerDashboardRoute(f.request('','POST'),f.env,'user_Victoria'),{status:405});
});
test('own referrals only, all verified payments counted, closed identities redacted, no credit changes',async t=>{
  const f=fixture(t);
  f.signup('user_Friend','friend@example.test');f.signup('user_Stranger','stranger@example.test');f.signup('user_Closed','closed@example.test');
  const referral=f.db.prepare('INSERT INTO lab_referrals(referred_customer_id,referrer_customer_id,attributed_at) VALUES(?,?,?)');
  referral.run('user_Friend','user_Victoria',Date.now());referral.run('user_Closed','user_Victoria',Date.now()-1);referral.run('user_Stranger','user_Other',Date.now());
  f.db.prepare("INSERT INTO lab_subscriptions(customer_id,status,updated_at) VALUES('user_Friend','active',?)").run(Date.now());
  const purchase=f.db.prepare("INSERT INTO lab_credit_entries VALUES(?,?,1000,'purchase',?,?)");
  purchase.run('p1','user_Friend','checkout:cs_1',Date.now());purchase.run('p2','user_Friend','checkout:cs_2',Date.now());purchase.run('p3','user_Stranger','checkout:cs_3',Date.now());
  f.db.prepare('INSERT INTO lab_account_closures(customer_id,requested_at) VALUES(?,?)').run('user_Closed',Date.now());
  const response=await partnerDashboardRoute(f.request('?customer_id=user_Other'),f.env,'user_Victoria');
  assert.match(response.headers.get('cache-control'),/no-store/);
  const data=await response.json();
  assert.deepEqual(data.totals,{registered:2,payingCustomers:1,activeSubscriptions:1,purchases:2});
  assert.match(data.referralUrl,/^https:\/\/pvlab.studio\/\?ref=[A-Z2-9]{8}$/);
  assert.equal(data.customers.find(x=>x.closed).email,null);
  const hidden=await (await partnerDashboardRoute(f.request('?q=closed%40example'),f.env,'user_Victoria')).json();assert.equal(hidden.customers.length,0);
  const registered=await (await partnerDashboardRoute(f.request('?filter=registered'),f.env,'user_Victoria')).json();assert.equal(registered.customers.length,1);assert.equal(registered.customers[0].closed,1);
  assert.equal(JSON.stringify(data).includes('stranger@example.test'),false);
  assert.equal(data.customers.find(person=>person.email==='friend@example.test').purchases,2);assert.equal(data.nextOffset,null);
  for(const filter of ['paying','subscribed']){
    const subset=await (await partnerDashboardRoute(f.request('?filter='+filter),f.env,'user_Victoria')).json();
    assert.equal(subset.customers.length,1);assert.equal(subset.customers[0].email,'friend@example.test');assert.equal(subset.totals.registered,2);
  }
  await assert.rejects(()=>partnerDashboardRoute(f.request('?filter=other'),f.env,'user_Victoria'),{status:400});
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM lab_credit_entries').get().n,3);
  assert.equal(f.db.prepare('SELECT balance_credits n FROM lab_customers WHERE id=?').get('user_Victoria').n,0);
});
test('dedicated Clerk identity is resolved server-side and dashboard pagination stays scoped',async t=>{
  const f=fixture(t);
  f.signup('user_PvLabV2Victoria',f.email);
  f.db.prepare('INSERT INTO lab_clerk_identity_links(new_subject,canonical_id,kind,created_at) VALUES(?,?,?,?)').run('user_Victoria','user_PvLabV2Victoria','customer',Date.now());
  f.env.LAB_CLERK_V2_SECRET_KEY='test-v2-only';
  for(let i=0;i<101;i++){const id='user_Friend'+i;f.signup(id,'f'+i+'@example.test');f.db.prepare('INSERT INTO lab_referrals(referred_customer_id,referrer_customer_id,attributed_at) VALUES(?,?,?)').run(id,'user_PvLabV2Victoria',Date.now()+i);}
  const first=await (await partnerDashboardRoute(f.request(),f.env,'user_PvLabV2Victoria')).json();
  assert.equal(f.requestedSubject,'user_Victoria');assert.equal(first.customers.length,100);assert.equal(first.nextOffset,100);
  const last=await (await partnerDashboardRoute(f.request('?offset=100'),f.env,'user_PvLabV2Victoria')).json();
  assert.equal(last.customers.length,1);assert.equal(last.nextOffset,null);
  const searched=await (await partnerDashboardRoute(f.request('?q=F0%40EXAMPLE'),f.env,'user_PvLabV2Victoria')).json();
  assert.equal(searched.customers.length,1);assert.equal(searched.customers[0].email,'f0@example.test');assert.equal(searched.nextOffset,null);
  const literal=await (await partnerDashboardRoute(f.request('?q=%25'),f.env,'user_PvLabV2Victoria')).json();assert.equal(literal.customers.length,0);
  await assert.rejects(()=>partnerDashboardRoute(f.request('?q='+('a'.repeat(81))),f.env,'user_PvLabV2Victoria'),{status:400});
  await assert.rejects(()=>partnerDashboardRoute(f.request('?offset=-1'),f.env,'user_PvLabV2Victoria'),{status:400});
});

test('partner vouchers default to zero budget and only a real owner can allocate audited credit capacity',async t=>{
  const f=fixture(t),g=gifts(f);
  const initial=await (await g.call()).json();
  assert.deepEqual(initial.budget,{total:0,redeemed:0,reserved:0,available:0,maxPerInvitation:500});
  assert.match((await g.call()).headers.get('cache-control'),/no-store/);
  await assert.rejects(()=>g.create(),{status:409});
  await assert.rejects(()=>g.call('/budget',{total:1000}),{status:403});
  for(const actor of ['user_Victoria','user_Other','user_Editor','user_Imposter'])
    await assert.rejects(()=>g.call('/budget',{total:1000},actor,true),{status:403});
  for(const total of [-1,1.5,1000001,'1000'])await assert.rejects(()=>g.budget(total),{status:400});
  await g.budget(1000);await g.budget(1200);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM lab_partner_budget_audit').get().n,2);
  assert.equal(f.db.prepare('SELECT updated_by FROM lab_partner_budgets').get().updated_by,'user_Owner');
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM lab_credit_entries').get().n,0);
});
test('partner invitation creation is bounded, idempotent, scoped and preserves the referral in its gift link',async t=>{
  const f=fixture(t),g=gifts(f);await g.budget(500);
  const payload=g.data({maxRedemptions:1000,subject:'user_Other'});
  const first=await g.call('/vouchers',payload),created=await first.json();assert.equal(first.status,201);
  assert.match(created.voucher.code,/^VT[A-F0-9]{20}$/);
  const link=new URL(created.voucher.url);assert.equal(link.origin,'https://pvlab.studio');assert.equal(link.pathname,'/account.html');
  assert.equal(link.searchParams.get('voucher'),created.voucher.code);assert.match(link.searchParams.get('ref'),/^[A-HJ-NP-Z2-9]{8}$/);assert.equal(link.hash,'#voucher');
  assert.equal(f.db.prepare('SELECT customer_id FROM lab_referral_codes').get().customer_id,'user_Victoria');
  assert.equal(created.voucher.maxRedemptions,1);assert.equal(created.budget.available,400);assert.equal(created.budget.reserved,100);
  const repeat=await g.call('/vouchers',payload);assert.equal(repeat.status,200);assert.equal((await repeat.json()).voucher.code,created.voucher.code);
  await assert.rejects(()=>g.call('/vouchers',{...payload,credits:200}),{status:409});
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM lab_vouchers').get().n,1);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM lab_credit_entries').get().n,0);
  for(const overrides of [{credits:0},{credits:501},{credits:1.5},{credits:'100'},{days:0},{days:31},{note:''},{note:'x'.repeat(81)},{requestId:'not-a-request'}])
    await assert.rejects(()=>g.call('/vouchers',g.data(overrides)),{status:400});
  await assert.rejects(()=>g.call('/vouchers',g.data(),'user_Other'),{status:403});
  f.setEmail('changed@example.test');await assert.rejects(()=>g.call(),{status:403});
});
test('concurrent invitation requests cannot exceed allowance or mint duplicate reservations',async t=>{
  const f=fixture(t),g=gifts(f);await g.budget(100);
  const attempts=await Promise.allSettled([g.create(),g.create()]);
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);assert.equal(attempts.find(r=>r.status==='rejected').reason.status,409);
  const budget=(await (await g.call()).json()).budget;assert.equal(budget.reserved,100);assert.equal(budget.available,0);
});
test('redemptions atomically grant the existing wallet once and leave committed credits inside the allowance',async t=>{
  const f=fixture(t),g=gifts(f);f.signup('user_Friend','friend@example.test');f.signup('user_Second','second@example.test');await g.budget(300);
  const first=await g.create(),second=await g.create();
  await assert.rejects(()=>g.redeem(first.code,'user_Victoria'),{status:409});
  const redeemed=await (await g.redeem(first.code,'user_Friend')).json();assert.equal(redeemed.credits,100);assert.equal(redeemed.balanceCredits,100);
  await assert.rejects(()=>g.redeem(first.code,'user_Friend'),{status:409});
  await assert.rejects(()=>g.redeem(second.code,'user_Friend'),{status:409});
  await assert.rejects(()=>g.redeem(first.code,'user_Second'),{status:409});
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM lab_credit_entries WHERE reference LIKE 'voucher:%'").get().n,1);
  const state=await (await g.call()).json();assert.deepEqual(state.budget,{total:300,available:100,reserved:100,redeemed:100,maxPerInvitation:500});
  assert.equal(state.redemptions[0].email,'friend@example.test');
  await g.call('/vouchers/deactivate',{code:first.code});assert.equal((await (await g.call()).json()).budget.available,100,'redeemed credits cannot be recovered');
  await assert.rejects(()=>g.budget(199),{status:409});
});
test('expiry and scoped deactivation release only unused reserves, while owner restore cannot oversubscribe',async t=>{
  const f=fixture(t),g=gifts(f);await g.budget(100);const expired=await g.create();
  f.db.prepare('UPDATE lab_vouchers SET expires_at=? WHERE code=?').run(Date.now()-10000,expired.code);
  assert.equal((await (await g.call()).json()).budget.available,100);
  const active=await g.create();
  const restore=new Request('https://worker.test/api/admin/vouchers/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:expired.code})});
  await assert.rejects(()=>labAdminRoute(restore,f.env,'user_Owner'),/budget exceeded/);
  await g.call('/vouchers/deactivate',{code:active.code});
  assert.equal((await (await g.call()).json()).budget.available,100);
  await assert.rejects(()=>g.call('/vouchers/deactivate',{code:'PVOTHEROWNER12'}),{status:400});
  await assert.rejects(()=>g.call('/vouchers/deactivate',{code:active.code}),{status:409});
  f.signup('user_Friend','friend@example.test');await assert.rejects(()=>g.redeem(active.code,'user_Friend'),{status:409});
});
test('partner gift reports redact closed and unverified contacts and never include owner or other issuer vouchers',async t=>{
  const f=fixture(t),g=gifts(f);await g.budget(500);
  for(const [id,email] of [['user_Friend','friend@example.test'],['user_Closed','closed@example.test'],['user_Unverified','unverified@example.test']]){
    f.signup(id,email);const voucher=await g.create({note:'Campaign '+id});await g.redeem(voucher.code,id);
  }
  f.db.prepare('INSERT INTO lab_account_closures(customer_id,requested_at) VALUES(?,?)').run('user_Closed',Date.now());
  f.db.prepare('UPDATE lab_customer_contacts SET verified_at=NULL WHERE customer_id=?').run('user_Unverified');
  f.db.prepare("INSERT INTO lab_vouchers VALUES('OWNERSECRET',100,1,0,1,NULL,'Owner secret',?,'user_Owner')").run(Date.now());
  const report=await (await g.call()).json(),text=JSON.stringify(report);
  assert.equal(report.redemptions.length,3);assert.equal(report.vouchers.length,3);
  for(const privateValue of ['closed@example.test','unverified@example.test','OWNERSECRET','Owner secret'])assert.equal(text.includes(privateValue),false);
  const owner=await (await g.call('/vouchers',undefined,'user_Owner',true)).json();assert.equal(owner.ownerView,true);assert.equal(owner.redemptions.length,3);
  assert.equal(report.ownerView,false);
});
test('partner migration is repeatable and closed or billing-held recipients cannot receive gifts',async t=>{
  const f=fixture(t),g=gifts(f);f.db.exec(readFileSync(new URL('../lab-worker/migrations/0037-partner-vouchers.sql',import.meta.url),'utf8'));
  await g.budget(200);const first=await g.create(),second=await g.create();
  f.signup('user_Closed','closed@example.test');f.signup('user_Held','held@example.test');
  f.db.prepare('INSERT INTO lab_account_closures(customer_id,requested_at) VALUES(?,?)').run('user_Closed',Date.now());
  f.db.prepare("INSERT INTO lab_billing_reviews(event_id,customer_id,object_id,state,reason,created_at) VALUES('held-test',?,'test-object','open','test',?)").run('user_Held',Date.now());
  await assert.rejects(()=>g.redeem(first.code,'user_Closed'),{status:409});await assert.rejects(()=>g.redeem(second.code,'user_Held'),{status:409});
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM lab_credit_entries').get().n,0);
});

test('50 percent first payment and 20 percent subscriptions use calendar months, not overlapping rates or replay order',()=>{
  const first=Date.UTC(2026,7,31,12),renewal=Date.UTC(2026,8,30,12),boundary=Date.UTC(2027,1,28,12);
  assert.equal(sixCalendarMonthsAfter(first),boundary);
  const pay=(reference,paidAt,kind='subscription',customerId='buyer')=>({reference,customerId,paidAt,recordedAt:Date.now(),kind,amountCents:1500});
  const rows=calculatePartnerCommissions([pay('invoice:later',boundary),pay('invoice:renewal',renewal),pay('invoice:first',first),pay('checkout:later',renewal+1000,'purchase')]);
  const find=id=>rows.find(p=>p.reference===id);
  assert.equal(find('invoice:first').commissionCents,750);assert.equal(find('invoice:first').rate,50);
  assert.equal(find('invoice:renewal').commissionCents,300);assert.equal(find('invoice:renewal').rate,20);
  assert.equal(find('invoice:later').commissionCents,0);assert.equal(find('checkout:later').commissionCents,0);
  const pack=calculatePartnerCommissions([pay('checkout:first',first-1000,'purchase'),pay('invoice:first',first),pay('invoice:renewal',renewal)]);
  assert.equal(pack.find(p=>p.reference==='checkout:first').rate,50);assert.equal(pack.find(p=>p.reference==='invoice:first').rate,20);
  const historical=calculatePartnerCommissions([pay('checkout:old',null,'purchase'),pay('invoice:new',renewal)]);
  assert.ok(historical.every(p=>p.status==='needs_reconciliation'&&p.commissionCents===0));
  assert.equal(calculatePartnerCommissions([{...pay('invoice:held',first),billingReview:1}])[0].status,'held');
  assert.equal(sixCalendarMonthsAfter(Date.UTC(2027,7,31)),Date.UTC(2028,1,29));
});

test('commission report stays scoped to actual EUR receipts, preserves anonymization and holds refunded accounts',async t=>{
  const f=fixture(t);f.signup('user_Buyer','buyer@example.test');f.signup('user_Stranger','stranger@example.test');
  f.db.prepare('INSERT INTO lab_referrals(referred_customer_id,referrer_customer_id,attributed_at) VALUES(?,?,?)').run('user_Buyer','user_Victoria',1);
  f.db.prepare('INSERT INTO lab_referrals(referred_customer_id,referrer_customer_id,attributed_at) VALUES(?,?,?)').run('user_Stranger','user_Other',1);
  const add=async(reference,subject,kind,amount,paidAt)=>{
    f.db.prepare('INSERT INTO lab_credit_entries VALUES(?,?,1000,?,?,?)').run(reference,subject,kind,reference,Date.now());
    f.db.prepare('INSERT INTO lab_revenue_events VALUES(?,?,?,?)').run(reference,subject,amount,Date.now());
    await recordPartnerPaymentContext(f.env,{reference,kind,paidAt});
  };
  const first=Date.UTC(2026,9,25);await add('checkout:first','user_Buyer','purchase',1000,first);
  await add('invoice:first','user_Buyer','subscription',1500,first+1000);
  await add('checkout:stranger','user_Stranger','purchase',7500,first);
  f.db.prepare("INSERT INTO lab_credit_entries VALUES('gift','user_Buyer',200,'adjustment','voucher:gift',?)").run(Date.now());
  const report=async()=>(await (await partnerDashboardRoute(f.request('?customer_id=user_Other'),f.env,'user_Victoria')).json()).commissions;
  const a=await report();assert.deepEqual(a.totals,{revenueCents:2500,commissionCents:800,heldCommissionCents:0,payments:2,needsReconciliation:0});
  assert.equal(a.receipts.length,2);assert.equal(JSON.stringify(a).includes('stranger@example.test'),false);assert.equal(JSON.stringify(a).includes('user_Buyer'),false);
  f.db.prepare("INSERT INTO lab_billing_reviews(event_id,customer_id,object_id,reason,amount_cents,created_at) VALUES('refund','user_Buyer','ch_refund','charge.refunded',1000,?)").run(Date.now());
  const held=await report();assert.equal(held.totals.commissionCents,0);assert.equal(held.totals.heldCommissionCents,800);
  f.db.prepare('INSERT INTO lab_account_closures(customer_id,requested_at) VALUES(?,?)').run('user_Buyer',Date.now());
  assert.equal(JSON.stringify(await report()).includes('buyer@example.test'),false);
});

test('verified webhook stores immutable processor payment timing once and ignores browser-like underpaid receipts',async t=>{
  const f=fixture(t);f.signup('user_Buyer','buyer@example.test');
  f.env.LAB_STRIPE_WEBHOOK_SECRET='whsec_synthetic';f.env.LAB_STRIPE_SECRET_KEY='sk_test_synthetic';
  const seconds=Math.floor(Date.now()/1000);
  const send=async(event)=>{
    const raw=JSON.stringify(event),signature=createHmac('sha256',f.env.LAB_STRIPE_WEBHOOK_SECRET).update(seconds+'.'+raw).digest('hex');
    return stripeWebhook(new Request('https://worker.test/api/billing/webhook',{method:'POST',headers:{'stripe-signature':'t='+seconds+',v1='+signature},body:raw}),f.env);
  };
  const event={id:'evt_verified',created:seconds-100,livemode:false,type:'checkout.session.completed',data:{object:{id:'cs_verified',customer:'cus_verified',mode:'payment',currency:'eur',payment_status:'paid',amount_total:1000,client_reference_id:'user_Buyer',metadata:{lab_customer_id:'user_Buyer',lab_sku:'topup10'}}}};
  await send(event);await send(event);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM lab_payment_context').get().n,1);
  assert.equal(f.db.prepare('SELECT paid_at FROM lab_payment_context').get().paid_at,(seconds-100)*1000);
  await send({...event,id:'evt_replayed',created:seconds});
  assert.equal(f.db.prepare('SELECT paid_at FROM lab_payment_context').get().paid_at,(seconds-100)*1000);
  await send({...event,id:'evt_underpaid',data:{object:{...event.data.object,id:'cs_underpaid',amount_total:1}}});
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM lab_payment_context').get().n,1);
  t.mock.method(globalThis,'fetch',async()=>Response.json({id:'sub_verified',customer:'cus_verified',status:'active',metadata:{lab_customer_id:'user_Buyer',lab_sku:'starter'},items:{data:[{price:{unit_amount:1500,currency:'eur'}}]}}));
  await send({id:'evt_invoice',created:seconds,livemode:false,type:'invoice.paid',data:{object:{id:'in_verified',status:'paid',currency:'eur',amount_paid:1500,billing_reason:'subscription_create',subscription:'sub_verified',status_transitions:{paid_at:seconds-50}}}});
  const invoice=f.db.prepare("SELECT * FROM lab_payment_context WHERE reference='invoice:in_verified'").get();
  assert.equal(invoice.kind,'subscription');assert.equal(invoice.paid_at,(seconds-50)*1000);assert.equal(invoice.subscription_id,'sub_verified');
});

test('public vanity entrance resolves only the server-registered referral and fails closed for missing or unsafe destinations',async t=>{
  const f=fixture(t),request=new Request('https://worker.test/api/partners/vitolas/link?subject=user_Other');
  await assert.rejects(()=>publicPartnerLink(request,f.env),{status:503});
  f.db.prepare('INSERT INTO lab_referral_codes(customer_id,code,created_at) VALUES(?,?,?)').run('user_Victoria','ABCDEFGH',Date.now());
  const initialized=await (await publicPartnerLink(request,f.env)).json();assert.equal(initialized.url,'https://pvlab.studio/?ref=ABCDEFGH');
  assert.equal(f.requestedSubject,'','Anonymous alias activation never calls Clerk');
  const dashboard=await (await partnerDashboardRoute(f.request(),f.env,'user_Victoria')).json();assert.equal(dashboard.shareUrl,'https://pvlab.studio/vitolas');
  const publicData=await (await publicPartnerLink(request,f.env)).json();assert.equal(publicData.url,dashboard.referralUrl);assert.deepEqual(Object.keys(publicData),['url']);
  t.mock.method(globalThis,'fetch',async()=>Response.json(publicData));
  assert.equal(await resolveVitolasLink(),dashboard.referralUrl);
  for(const url of ['https://evil.example/?ref=ABCDEFGH','javascript:alert(1)','https://pvlab.studio/owner?ref=ABCDEFGH']){
    t.mock.method(globalThis,'fetch',async()=>Response.json({url}));await assert.rejects(()=>resolveVitolasLink(),/Invitación no válida/);
  }
  f.db.prepare('INSERT INTO lab_account_closures(customer_id,requested_at) VALUES(?,?)').run('user_Victoria',Date.now());await assert.rejects(()=>publicPartnerLink(request,f.env),{status:503});
});


test('per-client earnings join immutable identities even with identical emails and redact all internal IDs',async t=>{
  const f=fixture(t),start=Date.UTC(2026,9,25);
  for(const [id,amount,review] of [['user_One',1000,false],['user_Two',2000,true],['user_Three',3000,false]]){
    f.signup(id,'same@example.test');
    f.db.prepare('INSERT INTO lab_referrals(referred_customer_id,referrer_customer_id,attributed_at) VALUES(?,?,?)').run(id,'user_Victoria',start+amount);
    f.db.prepare("INSERT INTO lab_credit_entries VALUES(?,?,1000,'purchase',?,?)").run(id,id,'checkout:'+id,start);
    f.db.prepare('INSERT INTO lab_revenue_events VALUES(?,?,?,?)').run('checkout:'+id,id,amount,start);
    await recordPartnerPaymentContext(f.env,{reference:'checkout:'+id,kind:'purchase',paidAt:start});
    if(review)f.db.prepare("INSERT INTO lab_billing_reviews(event_id,customer_id,object_id,reason,amount_cents,created_at) VALUES(?,?,?,'charge.refunded',?,?)").run('refund:'+id,id,'ch_'+id,amount,start);
  }
  const data=await (await partnerDashboardRoute(f.request(),f.env,'user_Victoria')).json();
  const summaries=data.customers.map(p=>[p.commissionCents,p.heldCommissionCents,p.paymentReferences.length]);
  assert.deepEqual(summaries,[[1500,0,1],[0,1000,1],[500,0,1]]);
  assert.ok(data.customers.every(p=>p.customerId===undefined));
  assert.equal(data.commissions.totals.commissionCents,2000);
  f.db.prepare('INSERT INTO lab_account_closures(customer_id,requested_at) VALUES(?,?)').run('user_Three',start);
  const after=await (await partnerDashboardRoute(f.request('?q=same%40example'),f.env,'user_Victoria')).json();
  assert.equal(after.customers.length,2);assert.ok(after.customers.every(p=>!p.closed));
});
