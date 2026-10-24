import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {partnerWorkspace,partnerDashboardRoute} from '../lab-worker/partner-dashboard.mjs';

function fixture(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  const file=path=>readFileSync(new URL('../lab-worker/'+path,import.meta.url),'utf8');
  db.exec(file('schema.sql'));
  for(const name of ['0006-customers-billing','0007-lab-referrals','0011-customer-lifecycle','0015-lab-promotional-credits'])db.exec(file('migrations/'+name+'.sql'));
  const env={LAB_CLERK_SECRET_KEY:'test-only',LAB_PUBLIC_APP_URL:'https://pvlab.studio/studio.html',LAB_DB:{prepare(sql){return {bind(...args){return {
    async first(){return db.prepare(sql).get(...args)||null;},
    async all(){return {results:db.prepare(sql).all(...args)};},
    async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};}
  };}};}}};
  const signup=(id,email)=>{
    db.prepare('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)').run(id,id,Date.now(),Date.now());
    if(email)db.prepare('INSERT INTO lab_customer_contacts VALUES(?,?,?,?)').run(id,email,Date.now(),Date.now());
  };
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
    return new Response(JSON.stringify({id:requestedSubject,primary_email_address_id:'primary',email_addresses:[{id:'primary',email_address:primary,verification:{status:verified?'verified':'unverified'}}]}),{status:upstream});
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
  assert.equal(JSON.stringify(data).includes('stranger@example.test'),false);
  assert.equal(data.customers[0].purchases,2);assert.equal(data.nextOffset,null);
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
  await assert.rejects(()=>partnerDashboardRoute(f.request('?offset=-1'),f.env,'user_PvLabV2Victoria'),{status:400});
});
