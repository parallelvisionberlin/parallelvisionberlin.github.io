import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {labAdminRoute,voucherCustomerRoute,voucherLink,syncCustomerEmail,scheduledClerkBackfill} from '../lab-worker/promotions.mjs';

async function setup(t) {
  let sqlite;
  try{sqlite=await import('node:sqlite');}catch{t.skip('SQLite unavailable');return null;}
  const db=new sqlite.DatabaseSync(':memory:');
  t.after(()=>db.close());
  const file=name=>readFileSync(new URL(name,import.meta.url),'utf8');
  db.exec(file('../lab-worker/schema.sql'));
  for(const migration of ['0006-customers-billing','0007-lab-referrals','0011-customer-lifecycle','0015-lab-promotional-credits','0016-clerk-sync-diagnostics','0023-welcome-guard','0024-owner-acquisition','0025-promo-generation-holds','0036-clerk-contact-hold-upsert','0028-generation-finance-ledger'])db.exec(file('../lab-worker/migrations/'+migration+'.sql'));
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
test('owner customer activity shows actual job states, net credit usage, and refunds without exposing prompts',async t=>{
  const f=await setup(t);if(!f)return;
  await assert.rejects(()=>f.admin('/api/admin/customers/activity?customerId=user_ALICE',null,'GET','user_ALICE'),/owner access required/);
  await assert.rejects(()=>f.admin('/api/admin/customers/activity?customerId=%27%3Bdrop',null,'GET'),/Invalid customer/);
  await assert.rejects(()=>f.admin('/api/admin/customers/activity?customerId=user_MISSING',null,'GET'),/Customer not found/);
  const at=Date.now();
  f.insert("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES (?,?,?,?,?,?)",
    'welcome:user_ALICE','user_ALICE',200,'adjustment','welcome:user_ALICE',at);
  f.insert("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
    'job_completed','user_ALICE',JSON.stringify({type:'image',provider:'spicy',model:'seedream-5',prompt:'private customer prompt',sourceUrl:'https://private.example/image'}),'completed',52173,at+1,at+1);
  f.insert("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
    'job_refunded','user_ALICE',JSON.stringify({type:'video',model:'wan-video'}),'queued',20000,at+2,at+2);
  f.insert("UPDATE jobs SET state='failed',updated_at=? WHERE id='job_refunded'",at+3);
  const response=await f.admin('/api/admin/customers/activity?customerId=user_ALICE',null,'GET');
  assert.equal(response.status,200);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  const activity=await response.json();
  assert.equal(activity.customer.balanceCredits,176);
  assert.equal(activity.summary.totalJobs,2);
  assert.equal(activity.summary.completedJobs,1);
  assert.equal(activity.summary.failedJobs,1);
  assert.equal(activity.summary.creditsCharged,34);
  assert.equal(activity.summary.creditsRefunded,10);
  assert.equal(activity.summary.netCreditsSpent,24);
  assert.deepEqual(activity.jobs.map(job=>job.state),['failed','completed']);
  assert.equal(activity.jobs[0].type,'video');
  assert.equal(activity.jobs[0].chargedCredits,10);
  assert.equal(activity.jobs[0].refundedCredits,10);
  assert.equal(activity.jobs[1].model,'seedream-5');
  assert.equal(activity.jobs[1].chargedCredits,24);
  assert.ok(activity.entries.some(entry=>entry.description==='Welcome credits'&&entry.credits===200));
  assert.ok(activity.entries.some(entry=>entry.kind==='refund'&&entry.credits===10));
  assert.ok(!JSON.stringify(activity).includes('private customer prompt'));
  assert.ok(!JSON.stringify(activity).includes('private.example'));
  const other=await (await f.admin('/api/admin/customers/activity?customerId=user_BOB',null,'GET')).json();
  assert.equal(other.summary.totalJobs,0);
  assert.equal(other.customer.balanceCredits,0);
  assert.equal(other.jobs.length,0);
  assert.equal(other.entries.length,0);
});

test('invalid administrative voucher values are rejected and do not create credits',async t=>{
  const f=await setup(t);if(!f)return;
  for(const body of [{credits:0,maxRedemptions:1},{credits:200,maxRedemptions:0},{credits:200,maxRedemptions:2000},{credits:200,maxRedemptions:1,code:'bad code!'}, {credits:200,maxRedemptions:1,expiresAt:Date.now()-1}]){
    await assert.rejects(()=>f.admin('/api/admin/vouchers',body),/credits|redemptions|letters|expiration/);
  }
  assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_vouchers').n,0);
});
test('Clerk UPSERT refresh retains existing disposable holds without database constraints',async t=>{
  const f=await setup(t);if(!f)return;
  f.env.LAB_CLERK_SECRET_KEY='sk_test_mockonly';
  f.env.LAB_WELCOME_CREDITS_ENABLED='false';
  const previous=globalThis.fetch;
  globalThis.fetch=async url=>{
    const id=new URL(url).pathname.split('/').pop();
    const address=id==='user_ALICE'?'private@yournike.com':
      id==='user_BOB'?'private@weekprime.com':'ordinary@example.com';
    return Response.json({id,primary_email_address_id:'primary',
      email_addresses:[{id:'primary',email_address:address,verification:{status:'verified'}}]});
  };
  try{
    assert.equal(await syncCustomerEmail(f.env,'user_ALICE',{force:true}),true);
    assert.equal(await syncCustomerEmail(f.env,'user_BOB',{force:true}),true);
    const holdsBefore=f.db.prepare('SELECT customer_id,reason,created_at,released_at FROM lab_promo_generation_holds ORDER BY customer_id').all();
    assert.equal(holdsBefore.length,2);
    assert.ok(holdsBefore.every(row=>row.reason==='disposable-email'&&row.released_at===null));
    // Make the two existing verified contact snapshots due for owner refresh.
    f.insert("UPDATE lab_customer_contacts SET synced_at=? WHERE customer_id IN ('user_ALICE','user_BOB')",Date.now()-90000000);
    const report=await (await f.admin('/api/admin/customers/sync')).json();
    assert.equal(report.requested,3);
    assert.equal(report.checked,3);
    assert.equal(report.verified,3);
    assert.equal(report.issues.storageError,0,'Refreshing held accounts must not abort a Clerk batch');
    assert.deepEqual(f.db.prepare('SELECT customer_id,reason,created_at,released_at FROM lab_promo_generation_holds ORDER BY customer_id').all(),holdsBefore,'Existing holds remain immutable');
    assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_customer_contacts WHERE email IS NOT NULL').n,3);
    assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_credit_entries').n,0,'Paused welcome credits remain paused');
    f.db.exec(readFileSync(new URL('../lab-worker/migrations/0036-clerk-contact-hold-upsert.sql',import.meta.url),'utf8'));
    assert.equal(await syncCustomerEmail(f.env,'user_ALICE',{force:true}),true,'Migration must remain repeatable');
    assert.deepEqual(f.db.prepare('SELECT customer_id,reason,created_at,released_at FROM lab_promo_generation_holds ORDER BY customer_id').all(),holdsBefore);
  }finally{globalThis.fetch=previous;}
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


test('scheduled Clerk backfill verifies emails, records only sanitized outcomes and limits repeated reads',async t=>{
  const f=await setup(t);if(!f)return;
  f.env.LAB_CLERK_SECRET_KEY='sk_live_private_never_in_db';
  const previous=globalThis.fetch;let calls=0;
  globalThis.fetch=async (url,options)=>{
    calls++;
    assert.equal(options?.method,'GET');
    assert.equal(options?.redirect,'manual');
    assert.equal(options?.headers.Authorization,'Bearer sk_live_private_never_in_db');
    const id=new URL(url).pathname.split('/').pop();
    return new Response(JSON.stringify({
      id,primary_email_address_id:'em_primary',
      email_addresses:[{id:'em_primary',email_address:id+'@example.com',verification:{status:'verified'}}]
    }),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const one=await scheduledClerkBackfill(f.env);
    assert.equal(one.requested,3);
    assert.equal(one.verified,3);
    assert.equal(calls,3);
    assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_customer_contacts WHERE email IS NOT NULL').n,3);
    const record=f.get('SELECT source,checked_at,result_json FROM lab_clerk_sync_diagnostics WHERE id=1');
    assert.equal(record.source,'scheduled');
    const data=JSON.parse(record.result_json);
    assert.equal(data.verified,3);
    assert.ok(record.checked_at>0);
    assert.ok(!record.result_json.includes('sk_live_'));
    assert.ok(!record.result_json.includes('@example.com'));
    assert.ok(!record.result_json.includes('user_ALICE'));
    assert.equal(await scheduledClerkBackfill(f.env),null,'Cron cooldown prevents repeated provider requests');
    assert.equal(calls,3);
    const owner=(await (await f.admin('/api/admin/overview',null,'GET')).json());
    assert.equal(owner.clerkSyncDiagnostic.verified,3);
    assert.equal(owner.clerkSyncDiagnostic.source,'scheduled');
    assert.ok(!JSON.stringify(owner.clerkSyncDiagnostic).includes('@example.com'));
  }finally{globalThis.fetch=previous;}
});
test('Clerk diagnostics identify wrong app, never invent an email, and allow forced owner retry',async t=>{
  const f=await setup(t);if(!f)return;
  f.env.LAB_CLERK_SECRET_KEY='sk_live_private_wrong_app';
  const previous=globalThis.fetch;let called=0;
  globalThis.fetch=async()=>{called++;return new Response('{}',{status:404});};
  try{
    const first=await scheduledClerkBackfill(f.env);
    assert.equal(first.issues.missingUser,3);
    assert.equal(first.verified,0);
    assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_customer_contacts').n,0);
    assert.equal(called,3);
    assert.equal(await scheduledClerkBackfill(f.env),null);
    const current=(await (await f.admin('/api/admin/overview',null,'GET')).json()).clerkSyncDiagnostic;
    assert.equal(current.issues.missingUser,3);
    assert.equal(current.source,'scheduled');
    // The explicit owner retry bypasses the scheduled throttling.
    const retried=await (await f.admin('/api/admin/customers/sync')).json();
    assert.equal(retried.issues.missingUser,3);
    assert.equal(called,6);
    assert.equal(f.get('SELECT source FROM lab_clerk_sync_diagnostics WHERE id=1').source,'owner');
    assert.ok(!JSON.stringify(retried).includes('sk_live_'));
    await assert.rejects(()=>f.admin('/api/admin/customers/sync',null,'POST','user_ALICE'),/owner access required/);
  }finally{globalThis.fetch=previous;}
});
test('missing Clerk secret is recorded as aggregate-only diagnostics, not a fabricated success',async t=>{
  const f=await setup(t);if(!f)return;
  const summary=await scheduledClerkBackfill(f.env);
  assert.equal(summary.verified,0);
  assert.equal(summary.issues.missingKey,1);
  assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_customer_contacts').n,0);
  assert.equal(f.get('SELECT source FROM lab_clerk_sync_diagnostics WHERE id=1').source,'scheduled');
});

test('V2-only deployments sync the mapped Studio identity while welcome credits remain paused',async t=>{
  const f=await setup(t);if(!f)return;
  f.env.LAB_CLERK_V2_SECRET_KEY='sk_test_v2_only';
  f.env.LAB_WELCOME_CREDITS_ENABLED='false';
  f.insert('INSERT INTO lab_account_closures(customer_id,requested_at) SELECT id,? FROM lab_customers',Date.now());
  f.signup('user_PvLabV2NEW');
  f.insert("INSERT INTO lab_clerk_identity_links(new_subject,canonical_id,kind,created_at) VALUES('user_NEW','user_PvLabV2NEW','customer',?)",Date.now());
  const previous=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{
    assert.equal(String(url),'https://api.clerk.com/v1/users/user_NEW');
    assert.equal(options.headers.Authorization,'Bearer sk_test_v2_only');
    return Response.json({id:'user_NEW',primary_email_address_id:'primary',email_addresses:[
      {id:'primary',email_address:'new@example.com',verification:{status:'verified'}}]});
  };
  try{
    const report=await scheduledClerkBackfill(f.env);
    assert.equal(report.requested,1);assert.equal(report.verified,1);assert.equal(report.issues.missingKey,0);
    assert.equal(f.get("SELECT email FROM lab_customer_contacts WHERE customer_id='user_PvLabV2NEW'").email,'new@example.com');
    assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_credit_entries').n,0);
    const overview=await (await f.admin('/api/admin/overview',null,'GET')).json();
    assert.equal(overview.emailSyncConfigured,true);
  }finally{globalThis.fetch=previous;}
});

test('closed accounts remain in history but do not inflate active accounts or appear pending sync',async t=>{
  const f=await setup(t);if(!f)return;
  f.insert("INSERT INTO lab_account_closures(customer_id,requested_at) VALUES('user_ALICE',?)",Date.now());
  const overview=await (await f.admin('/api/admin/overview',null,'GET')).json();
  assert.equal(overview.summary.accounts,2);assert.equal(overview.summary.totalAccounts,3);
  assert.equal(overview.customers.find(c=>c.id==='user_ALICE').accountClosed,1);
  assert.equal(overview.customers.find(c=>c.id==='user_BOB').accountClosed,0);
  const acquisition=await (await f.admin('/api/admin/acquisition?days=7',null,'GET')).json();
  assert.equal(acquisition.customers.find(c=>c.id==='user_ALICE').accountClosed,1);
  assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_customers').n,3);
});

test('a contact storage failure records a safe failure outcome instead of leaving stale success',async t=>{
  const f=await setup(t);if(!f)return;
  f.env.LAB_CLERK_SECRET_KEY='sk_test_mockonly';
  const binding=f.env.LAB_DB;
  f.env.LAB_DB={prepare(sql){
    if(sql.includes('INSERT INTO lab_customer_contacts'))throw new Error('private database detail');
    return binding.prepare(sql);
  }};
  const previous=globalThis.fetch;
  globalThis.fetch=async url=>Response.json({id:new URL(url).pathname.split('/').pop(),
    primary_email_address_id:'primary',email_addresses:[{id:'primary',email_address:'safe@example.com',verification:{status:'verified'}}]});
  try{
    const report=await scheduledClerkBackfill(f.env);
    assert.equal(report.checked,2);assert.equal(report.verified,0);assert.equal(report.issues.storageError,2);
    assert.equal(report.issues.storage.stages.contact_write,2);
    assert.equal(report.issues.storage.kinds.unknown,2);
    const stored=f.get('SELECT result_json FROM lab_clerk_sync_diagnostics WHERE id=1').result_json;
    assert.equal(JSON.parse(stored).issues.storageError,2);
    assert.ok(!stored.includes('private database'));assert.ok(!stored.includes('safe@example.com'));
  }finally{globalThis.fetch=previous;}
});

test('a transient D1 contact write is retried once and preserves verified contacts',async t=>{
  const f=await setup(t);if(!f)return;
  f.env.LAB_CLERK_SECRET_KEY='sk_test_mockonly';
  const binding=f.env.LAB_DB;
  let failures=0;
  f.env.LAB_DB={prepare(sql){
    return {bind(...values){
      if(sql.includes('INSERT INTO lab_customer_contacts')&&failures++===0)
        throw new Error('D1_ERROR: SQLITE_BUSY: database is locked');
      return binding.prepare(sql).bind(...values);
    }};
  }};
  const previous=globalThis.fetch;
  globalThis.fetch=async url=>Response.json({id:new URL(url).pathname.split('/').pop(),
    primary_email_address_id:'primary',email_addresses:[
      {id:'primary',email_address:'safe@example.com',verification:{status:'verified'}}]});
  try{
    const report=await scheduledClerkBackfill(f.env);
    assert.equal(report.checked,3);assert.equal(report.verified,3);
    assert.equal(report.issues.storageError,0);
    assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_customer_contacts WHERE email IS NOT NULL').n,3);
    assert.equal(failures,4,'one bounded D1 retry plus three successful contact writes');
  }finally{globalThis.fetch=previous;}
});

test('one contact constraint failure does not starve unrelated customer syncs',async t=>{
  const f=await setup(t);if(!f)return;
  f.env.LAB_CLERK_SECRET_KEY='sk_test_mockonly';
  const binding=f.env.LAB_DB;
  f.env.LAB_DB={prepare(sql){
    return {bind(...values){
      if(sql.includes('INSERT INTO lab_customer_contacts')&&values[0]==='user_ALICE')
        throw new Error('D1_ERROR: FOREIGN KEY constraint failed, private detail must not escape');
      return binding.prepare(sql).bind(...values);
    }};
  }};
  const previous=globalThis.fetch;
  globalThis.fetch=async url=>Response.json({id:new URL(url).pathname.split('/').pop(),
    primary_email_address_id:'primary',email_addresses:[
      {id:'primary',email_address:'safe@example.com',verification:{status:'verified'}}]});
  try{
    const report=await scheduledClerkBackfill(f.env);
    assert.equal(report.checked,3);assert.equal(report.verified,2);
    assert.equal(report.issues.storageError,1);
    assert.equal(report.issues.storage.stages.contact_write,1);
    assert.equal(report.issues.storage.kinds.constraint,1);
    assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_customer_contacts WHERE email IS NOT NULL').n,2);
    assert.ok(!JSON.stringify(report).includes('private detail'));
    assert.ok(!JSON.stringify(report).includes('user_ALICE'));
  }finally{globalThis.fetch=previous;}
});

test('owner acquisition counts new users, activation, credit debits, checkout starts and true euro receipts',async t=>{
  const f=await setup(t);if(!f)return;
  await assert.rejects(()=>f.admin('/api/admin/acquisition?days=7',null,'GET','user_ALICE'),/owner access required/);
  await assert.rejects(()=>f.admin('/api/admin/acquisition?days=3',null,'GET'),/Choose 7 or 30 days/);
  const now=Date.now();
  f.insert('INSERT INTO lab_customer_contacts(customer_id,email,verified_at,synced_at) VALUES(?,?,?,?)',
    'user_ALICE','random@yournike.com',now,now);
  f.insert("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('funds',?,500,'purchase','checkout:funds',?)",
    'user_ALICE',now);
  f.insert("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'completed',30000,?,?)",
    'completed-1','user_ALICE',JSON.stringify({type:'image',provider:'spicy',prompt:'private data'}),now,now);
  f.insert("INSERT INTO lab_checkout_attempts(session_id,customer_id,sku,amount_cents,created_at) VALUES('cs_live_testone','user_ALICE','topup10',1000,?)",now);
  f.insert("INSERT INTO lab_checkout_attempts(session_id,customer_id,sku,amount_cents,created_at,paid_at) VALUES('cs_live_testtwo','user_ALICE','starter',1500,?,?)",now,now);
  f.insert("INSERT INTO lab_revenue_events(reference,customer_id,amount_cents,created_at) VALUES('invoice:paid','user_ALICE',1500,?)",now);
  const res=await f.admin('/api/admin/acquisition?days=7',null,'GET');
  assert.equal(res.status,200);
  const report=await res.json();
  assert.equal(report.summary.newUsers,3);
  assert.equal(report.summary.activatedUsers,1);
  assert.equal(report.summary.completedJobs,1);
  assert.equal(report.summary.checkoutStarts,2);
  assert.equal(report.summary.checkoutPaid,1);
  assert.equal(report.summary.revenueCents,1500);
  assert.equal(report.summary.providerExposureUsd,.03);
  assert.ok(report.summary.netCreditsSpent>0);
  const account=report.customers.find(x=>x.id==='user_ALICE');
  assert.equal(account.reviewFlag,'disposable-email');
  assert.equal(account.completedJobs,1);
  assert.equal(account.checkoutStarts,2);
  assert.equal(account.revenueCents,1500);
  assert.ok(!JSON.stringify(report).includes('private data'),'no creative prompts returned from acquisition');
});
