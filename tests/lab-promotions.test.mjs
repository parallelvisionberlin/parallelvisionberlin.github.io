import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {labAdminRoute,voucherCustomerRoute,voucherLink,syncCustomerEmail} from '../lab-worker/promotions.mjs';

async function setup(t) {
  let sqlite;
  try{sqlite=await import('node:sqlite');}catch{t.skip('SQLite unavailable');return null;}
  const db=new sqlite.DatabaseSync(':memory:');
  t.after(()=>db.close());
  const file=name=>readFileSync(new URL(name,import.meta.url),'utf8');
  db.exec(file('../lab-worker/schema.sql'));
  for(const migration of ['0006-customers-billing','0007-lab-referrals','0011-customer-lifecycle','0015-lab-promotional-credits'])db.exec(file('../lab-worker/migrations/'+migration+'.sql'));
  db.exec(file('../lab-worker/migrations/0015-lab-promotional-credits.sql')); // safely applied more than once
  const dbBinding={
    prepare(sql){return {bind(...values){const stmt=db.prepare(sql);return {
      async first(){return stmt.get(...values)||null;},
      async run(){const x=stmt.run(...values);return {meta:{changes:x.changes}};},
      async all(){return {results:stmt.all(...values)};}
    };}};}
  };
  const env={LAB_DB:dbBinding,OWNER_DB:{
    prepare(){return {bind(subject){return {async first(){return subject==='owner_live'?{id:subject}:null;}};}};}
  },LAB_PUBLIC_APP_URL:'https://parallelvisionlabel.com/lab/studio.html'};
  const insert=(query,...args)=>db.prepare(query).run(...args);
  const get=(query,...args)=>db.prepare(query).get(...args);
  const signup=id=>insert('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)',id,id,Date.now(),Date.now());
  for(const id of ['user_ALICE','user_BOB','user_CHARLIE'])signup(id);
  const req=(path,body,method='POST')=>new Request('https://parallel-vision-lab.parallelvision.workers.dev'+path,{
    method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined
  });
  const admin=(path,body,method='POST',subject='owner_live')=>labAdminRoute(req(path,body,method),env,subject);
  const redeem=(id,code)=>voucherCustomerRoute(req('/api/customer/vouchers/redeem',{code}),env,id);
  return {db,env,insert,get,signup,req,admin,redeem};
}
test('voucher migration is repeatable and generated gift link remains on PV LAB',async t=>{
  const f=await setup(t);if(!f)return;
  assert.equal(voucherLink(f.env,'PVABC123'),'https://parallelvisionlabel.com/lab/account.html?voucher=PVABC123#voucher');
  const response=await f.admin('/api/admin/vouchers',{credits:200,maxRedemptions:1,note:'Creator invitation'});
  assert.equal(response.status,201);
  const created=await response.json();
  assert.match(created.voucher.code,/^PV[A-Z2-9]{12}$/);
  assert.ok(created.voucher.url.includes(created.voucher.code));
  assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_vouchers').n,1);
});
test('one redemption credits the ledger once and does not oversubscribe the gift link',async t=>{
  const f=await setup(t);if(!f)return;
  const voucher=(await (await f.admin('/api/admin/vouchers',{credits:200,maxRedemptions:1,code:'FRIEND200'})).json()).voucher;
  const response=await f.redeem('user_ALICE',voucher.code);
  assert.deepEqual(await response.json(),{redeemed:true,credits:200,balanceCredits:200});
  await assert.rejects(()=>f.redeem('user_ALICE',voucher.code),/already redeemed|unavailable/);
  await assert.rejects(()=>f.redeem('user_BOB',voucher.code),/unavailable/);
  assert.equal(f.get("SELECT balance_credits AS balance FROM lab_customers WHERE id='user_ALICE'").balance,200);
  assert.equal(f.get("SELECT balance_credits AS balance FROM lab_customers WHERE id='user_BOB'").balance,0);
  assert.equal(f.get("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference LIKE 'voucher:%'").n,1);
  assert.equal(f.get("SELECT redeemed_count AS n FROM lab_vouchers WHERE code='FRIEND200'").n,1);
});
test('voucher expiration, revocation, account closure and billing holds block grants',async t=>{
  const f=await setup(t);if(!f)return;
  await f.admin('/api/admin/vouchers',{credits:125,maxRedemptions:10,code:'CAMPAIGN2026'});
  f.insert("UPDATE lab_vouchers SET expires_at=? WHERE code='CAMPAIGN2026'",Date.now()-100);
  await assert.rejects(()=>f.redeem('user_ALICE','CAMPAIGN2026'),/expired|unavailable/);
  f.insert("UPDATE lab_vouchers SET expires_at=NULL WHERE code='CAMPAIGN2026'");
  f.insert("INSERT INTO lab_account_closures(customer_id,requested_at) VALUES('user_ALICE',?)",Date.now());
  await assert.rejects(()=>f.redeem('user_ALICE','CAMPAIGN2026'),/cannot be redeemed/);
  f.insert("INSERT INTO lab_billing_reviews(event_id,customer_id,object_id,reason,created_at) VALUES('evt_1','user_BOB','pi_1','dispute',?)",Date.now());
  await assert.rejects(()=>f.redeem('user_BOB','CAMPAIGN2026'),/cannot be redeemed/);
  const disabled=await f.admin('/api/admin/vouchers/deactivate',{code:'CAMPAIGN2026'});
  assert.equal((await disabled.json()).deactivated,true);
  await assert.rejects(()=>f.redeem('user_CHARLIE','CAMPAIGN2026'),/unavailable/);
  assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_voucher_redemptions').n,0);
});
test('owner-only dashboard reads verified ledger payments without treating vouchers as revenue',async t=>{
  const f=await setup(t);if(!f)return;
  await assert.rejects(()=>f.admin('/api/admin/overview',null,'GET','user_ALICE'),/owner access required/);
  const overview=await (await f.admin('/api/admin/overview',null,'GET')).json();
  assert.equal(overview.summary.accounts,3);
  assert.equal(overview.summary.payingCustomers,0);
  assert.equal(overview.customers.length,3);
  await f.admin('/api/admin/vouchers',{credits:50,maxRedemptions:5});
  const code=f.get('SELECT code FROM lab_vouchers LIMIT 1').code;
  await f.redeem('user_ALICE',code);
  let result=await (await f.admin('/api/admin/overview',null,'GET')).json();
  assert.equal(result.summary.payingCustomers,0);
  assert.equal(result.summary.voucherClaims,1);
  f.insert("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('checkout:cs_verified','user_ALICE',1000,'purchase','checkout:cs_verified',?)",Date.now());
  result=await (await f.admin('/api/admin/overview',null,'GET')).json();
  assert.equal(result.summary.payingCustomers,1);
  assert.equal(result.payments.length,1);
  assert.equal(result.payments[0].credits,1000);
});
test('invalid administrative voucher values are rejected and do not create credits',async t=>{
  const f=await setup(t);if(!f)return;
  for(const body of [{credits:0,maxRedemptions:1},{credits:200,maxRedemptions:0},{credits:200,maxRedemptions:2000},{credits:200,maxRedemptions:1,code:'bad code!'}, {credits:200,maxRedemptions:1,expiresAt:Date.now()-1}]){
    await assert.rejects(()=>f.admin('/api/admin/vouchers',body),/credits|redemptions|letters|expiration/);
  }
  assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_vouchers').n,0);
});
test('only verified Clerk primary email can be stored as a customer contact',async t=>{
  const f=await setup(t);if(!f)return;
  assert.equal(await syncCustomerEmail(f.env,'user_ALICE'),false);
  f.env.LAB_CLERK_SECRET_KEY='sk_test_mockonly';
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({
    id:'user_ALICE',primary_email_address_id:'em_1',
    email_addresses:[{id:'em_1',email_address:'Alice@Example.com',verification:{status:'verified'}}]
  }),{status:200,headers:{'content-type':'application/json'}});
  try{assert.equal(await syncCustomerEmail(f.env,'user_ALICE'),true);}
  finally{globalThis.fetch=previous;}
  const customer=f.get("SELECT email FROM lab_customer_contacts WHERE customer_id='user_ALICE'");
  assert.equal(customer.email,'alice@example.com');
  const overview=await (await f.admin('/api/admin/overview?search=alice%40example.com',null,'GET')).json();
  assert.equal(overview.customers.length,1);
  assert.equal(overview.customers[0].id,'user_ALICE');
});

test('manual email sync reveals a rejected Clerk backend key without exposing it',async t=>{
  const f=await setup(t);if(!f)return;
  f.env.LAB_CLERK_SECRET_KEY='sk_live_fake_for_test';
  const previous=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response('{}',{status:401});};
  try{
    const result=await (await f.admin('/api/admin/customers/sync')).json();
    assert.equal(result.requested,3);
    assert.equal(result.checked,1);
    assert.equal(result.synced,0);
    assert.equal(result.issues.invalidKey,1);
    assert.equal(calls,1);
    assert.ok(!JSON.stringify(result).includes('sk_live_'));
  }finally{globalThis.fetch=previous;}
});
test('manual email sync retries an unverified account despite the seven-day cache',async t=>{
  const f=await setup(t);if(!f)return;
  f.env.LAB_CLERK_SECRET_KEY='sk_live_fake_for_test';
  const previous=globalThis.fetch;
  let verified=false;
  globalThis.fetch=async (url,options)=>{
    assert.equal(options?.method,'GET');
    assert.equal(options?.redirect,'manual','Workers must use manual redirect handling for Clerk requests');
    assert.equal(options?.headers?.Authorization,'Bearer sk_live_fake_for_test');
    const id=new URL(url).pathname.split('/').pop();
    return new Response(JSON.stringify({
      id,primary_email_address_id:'em_primary',
      email_addresses:[{id:'em_primary',email_address:id+'@example.com',verification:{status:verified?'verified':'unverified'}}]
    }),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    assert.equal(await syncCustomerEmail(f.env,'user_ALICE'),true);
    assert.equal(f.get("SELECT email FROM lab_customer_contacts WHERE customer_id='user_ALICE'").email,null);
    verified=true;
    const result=await (await f.admin('/api/admin/customers/sync')).json();
    assert.equal(result.requested,3);
    assert.equal(result.checked,3);
    assert.equal(result.verified,3);
    assert.equal(result.unverified,0);
    assert.equal(f.get("SELECT email FROM lab_customer_contacts WHERE customer_id='user_ALICE'").email,'user_alice@example.com');
  }finally{globalThis.fetch=previous;}
});

test('Clerk sync refuses redirect responses without fetching a second URL or storing an email',async t=>{
  const f=await setup(t);if(!f)return;
  f.env.LAB_CLERK_SECRET_KEY='sk_live_fake_for_test';
  const original=globalThis.fetch;let requestCount=0;
  globalThis.fetch=async (url,options)=>{
    requestCount++;
    assert.ok(String(url).startsWith('https://api.clerk.com/v1/users/'));
    assert.equal(options?.method,'GET');
    assert.equal(options?.redirect,'manual');
    return new Response(null,{status:302,headers:{Location:'https://example.invalid/steal'}});
  };
  try{
    const report=await (await f.admin('/api/admin/customers/sync')).json();
    assert.equal(report.verified,0);
    assert.equal(report.issues.transient,3);
    assert.equal(requestCount,3,'No redirects followed and only three known accounts checked');
    assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_customer_contacts').n,0);
    assert.ok(!JSON.stringify(report).includes('sk_live_'));
  }finally{globalThis.fetch=original;}
});
