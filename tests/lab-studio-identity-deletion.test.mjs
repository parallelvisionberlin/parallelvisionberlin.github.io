import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {ensureCustomer} from '../lab-worker/customer-billing.mjs';
import {requestAccountClosure,processAccountClosures,assertCustomerOpen} from '../lab-worker/customer-lifecycle.mjs';
import {banClosedStudioIdentity,processStudioIdentityDeletions,
  rejectDeletedStudioSubject,finishClosedStudioIdentity} from '../lab-worker/studio-identity-deletion.mjs';
import {syncCustomerEmail} from '../lab-worker/promotions.mjs';
import {migrationRoute} from '../lab-worker/clerk-migration.mjs';
import {STUDIO_ISSUER} from '../lab-worker/clerk-issuer-policy.mjs';
import {grantVerifiedWelcome} from '../lab-worker/welcome-guard.mjs';
import worker from '../lab-worker/worker.mjs';

const migrations=['schema.sql','migrations/0006-customers-billing.sql',
  'migrations/0007-lab-referrals.sql','migrations/0011-customer-lifecycle.sql',
  'migrations/0015-lab-promotional-credits.sql','migrations/0017-clerk-domain-links.sql',
  'migrations/0023-welcome-guard.sql','migrations/0030-studio-account-identity-deletion.sql','migrations/0035-studio-identity-cleanup-attempts.sql'];
function fixture(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  for(const file of migrations)
    db.exec(readFileSync(new URL('../lab-worker/'+file,import.meta.url),'utf8'));
  const objects=new Map(),calls=[];let remoteError=0,deleteError=0;
  const oldFetch=globalThis.fetch;
  t.after(()=>{globalThis.fetch=oldFetch;});
  globalThis.fetch=async(url,options)=>{
    calls.push({url,method:options?.method,auth:options?.headers?.Authorization});
    if(!url.startsWith('https://api.clerk.com/v1/users/'))throw Error('Untrusted Clerk endpoint.');
    const subject=url.split('/users/')[1].replace('/ban','');
    if(options?.method==='POST'&&url.endsWith('/ban')){
      if(remoteError)return new Response('{}',{status:remoteError});
      return Response.json({id:subject,object:'user'});
    }
    if(options?.method==='DELETE'){
      if(deleteError)return new Response('{}',{status:deleteError});
      return Response.json({id:subject,object:'user',deleted:true});
    }
    return new Response('{}',{status:404});
  };
  const env={
    LAB_SECRET:'test-only-pv-lab-key-not-real-over-40-characters-abcdef0123456789',
    LAB_CLERK_V2_SECRET_KEY:'sk_test_studio_only_not_real',
    LAB_CLERK_SECRET_KEY:'sk_test_legacy_must_never_be_used',
    LAB_DB:{
      prepare(sql){return {bind(...args){return {
        first:async()=>db.prepare(sql).get(...args)||null,
        all:async()=>({results:db.prepare(sql).all(...args)}),
        run:async()=>({meta:{changes:db.prepare(sql).run(...args).changes}})
      };}};},
      async batch(statements){
        db.exec('BEGIN');
        try{const all=[];for(const statement of statements)all.push(await statement.run());db.exec('COMMIT');return all;}
        catch(error){db.exec('ROLLBACK');throw error;}
      }
    },
    LAB_MEDIA:{
      list:async({prefix,limit})=>({objects:[...objects.keys()].filter(key=>key.startsWith(prefix))
        .slice(0,limit).map(key=>({key})),truncated:false}),
      delete:async key=>{objects.delete(key);}
    }
  };
  return {env,db,objects,calls,remoteError:x=>{remoteError=x;},deleteError:x=>{deleteError=x;}};
}
const subject='user_StudioDelete01',internal='user_PvLabV2StudioDelete01';
async function account(f,{id=internal,clerk=subject,linked=true,makeWelcome=false}={}){
  const {env,db}=f,now=Date.now();
  await ensureCustomer(env,id);
  if(linked)db.prepare(`INSERT INTO lab_clerk_identity_links(new_subject,canonical_id,kind,created_at)
    VALUES(?,?,'customer',?)`).run(clerk,id,now);
  db.prepare('INSERT INTO lab_customer_contacts(customer_id,email,verified_at,synced_at) VALUES(?,?,?,?)')
    .run(id,id+'@example.test',now,now);
  if(makeWelcome)db.prepare(`INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at)
    VALUES(?,?,200,'adjustment',?,?)`).run('welcome:'+id,id,'welcome:'+id,now);
}
async function close(f,id=internal){
  assert.deepEqual(await requestAccountClosure(f.env,id,'DELETE MY PV LAB ACCOUNT'),{accepted:true});
  f.db.prepare('UPDATE lab_account_closures SET requested_at=1 WHERE customer_id=?').run(id);
}
async function cleanup(f){
  // A paginated R2 removal run precedes the empty-prefix and SQL cleanup run.
  await processAccountClosures(f.env);
  await processAccountClosures(f.env);
}
test('PV LAB deletes creative records and V2 identity, retains financial receipts and HMAC only',async t=>{
  const f=fixture(t),{db,env,objects,calls}=f;
  await account(f,{makeWelcome:true});
  await account(f,{id:'user_LegacyKeep',clerk:'user_StudioKeep'});
  objects.set(internal+'/sources/photo.png','private');
  objects.set(internal+'/thumbnails/photo.webp','derivative');
  objects.set('user_LegacyKeep/sources/other.png','other');
  db.prepare("INSERT INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,'source','image/png','x.png',7,1)")
    .run('asset-delete',internal,internal+'/sources/photo.png');
  db.prepare("INSERT INTO jobs(id,owner_id,params,state,created_at,updated_at) VALUES(?,?,?,'draft',1,1)")
    .run('job-delete',internal,'{"prompt":"my private photo"}');
  db.prepare("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('cash','user_PvLabV2StudioDelete01',1000,'purchase','checkout:cash',1)").run();
  await close(f);
  await banClosedStudioIdentity(env,internal);
  assert.equal(calls.length,1);
  assert.equal(calls[0].method,'POST');
  assert.equal(calls[0].url,'https://api.clerk.com/v1/users/'+subject+'/ban');
  assert.equal(calls[0].auth,'Bearer '+env.LAB_CLERK_V2_SECRET_KEY);
  await assert.rejects(()=>assertCustomerOpen(env,internal),/closed/);
  await processStudioIdentityDeletions(env);
  assert.equal(calls.filter(x=>x.method==='DELETE').length,0,'Never delete Clerk until R2 and D1 are clean');
  await cleanup(f);
  assert.equal(db.prepare('SELECT state FROM lab_account_closures WHERE customer_id=?').get(internal).state,'deleted');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM jobs WHERE owner_id=?').get(internal).n,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM assets WHERE owner_id=?').get(internal).n,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lab_customer_contacts WHERE customer_id=?').get(internal).n,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lab_welcome_claims WHERE customer_id=?').get(internal).n,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lab_credit_entries WHERE customer_id=?').get(internal).n,2);
  await processStudioIdentityDeletions(env);
  assert.equal(calls.filter(x=>x.method==='DELETE').length,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lab_clerk_identity_links WHERE canonical_id=?').get(internal).n,0);
  const task=db.prepare('SELECT state,new_subject FROM lab_studio_identity_deletions WHERE customer_id=?').get(internal);
  assert.equal(task.state,'complete');
  assert.equal(task.new_subject,null);
  assert.deepEqual([...objects.keys()],['user_LegacyKeep/sources/other.png']);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lab_clerk_identity_links WHERE canonical_id='user_LegacyKeep'").get().n,1);
  await assert.rejects(()=>rejectDeletedStudioSubject(env,subject),/deleted/);
  await processStudioIdentityDeletions(env);
  assert.equal(calls.filter(x=>x.method==='DELETE').length,1,'Completed task cannot delete again');
});
test('shared legacy-only Clerk account is never banned or deleted by PV LAB closure',async t=>{
  const f=fixture(t),id='user_LegacyOnly';
  await account(f,{id,linked:false});
  await close(f,id);await cleanup(f);await processStudioIdentityDeletions(f.env);
  assert.equal(f.calls.length,0);
  assert.equal(f.db.prepare('SELECT state FROM lab_account_closures WHERE customer_id=?').get(id).state,'deleted');
});
test('missing dedicated PV LAB secret cannot fall back to shared Clerk and is retried',async t=>{
  const f=fixture(t);await account(f);await close(f);
  delete f.env.LAB_CLERK_V2_SECRET_KEY;
  await assert.rejects(()=>processStudioIdentityDeletions(f.env),/cleanup is pending/);
  assert.equal(f.calls.length,0);
  assert.equal(f.db.prepare('SELECT state FROM lab_studio_identity_deletions WHERE customer_id=?').get(internal).state,'pending');
  f.env.LAB_CLERK_V2_SECRET_KEY='sk_test_studio_only_not_real';
  await processStudioIdentityDeletions(f.env);await cleanup(f);await processStudioIdentityDeletions(f.env);
  assert.equal(f.db.prepare('SELECT state FROM lab_studio_identity_deletions WHERE customer_id=?').get(internal).state,'complete');
});
test('remote Clerk deletion failures cannot erase the login mapping and are retryable',async t=>{
  const f=fixture(t);await account(f);await close(f);await cleanup(f);
  f.deleteError(503);
  await assert.rejects(()=>processStudioIdentityDeletions(f.env),/cleanup is pending/);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM lab_clerk_identity_links WHERE canonical_id=?').get(internal).n,1);
  f.deleteError(0);await processStudioIdentityDeletions(f.env);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM lab_clerk_identity_links WHERE canonical_id=?').get(internal).n,0);
});
test('closing a customer prevents asynchronous email-sync from restoring its PII',async t=>{
  const f=fixture(t);await account(f);await close(f);await cleanup(f);
  assert.equal(await syncCustomerEmail(f.env,internal),false);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM lab_customer_contacts WHERE customer_id=?').get(internal).n,0);
});

test('returning closed customer completes only its own pending identity and can onboard a fresh subject with the same verified email',async t=>{
  const f=fixture(t),{env,db}=f;
  await account(f,{makeWelcome:true});
  const email=db.prepare('SELECT email FROM lab_customer_contacts WHERE customer_id=?').get(internal).email;
  await account(f,{id:'user_KeepCustomer',clerk:'user_KeepStudio'});
  await close(f);await cleanup(f);
  assert.equal(await finishClosedStudioIdentity(env,internal),true);
  assert.equal(db.prepare('SELECT state FROM lab_studio_identity_deletions WHERE customer_id=?').get(internal).state,'complete');
  assert.ok(f.calls.every(x=>x.url.includes(subject)),'No other customer or legacy identity is touched');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lab_clerk_identity_links WHERE canonical_id=?').get('user_KeepCustomer').n,1);
  const request=new Request('https://test/api/migration/new',{method:'POST'});
  await assert.rejects(()=>migrationRoute(request,env,{id:null,kind:null,issuer:STUDIO_ISSUER,subject}),/deleted/);
  const freshSubject='user_StudioRecreated02',freshId='user_PvLabV2StudioRecreated02';
  assert.equal((await migrationRoute(request,env,{id:null,kind:null,issuer:STUDIO_ISSUER,subject:freshSubject})).status,201);
  const now=Date.now();
  db.prepare('INSERT INTO lab_customer_contacts(customer_id,email,verified_at,synced_at) VALUES(?,?,?,?)').run(freshId,email,now,now);
  env.LAB_WELCOME_CREDITS_ENABLED='true';
  await grantVerifiedWelcome(env,freshId);
  assert.equal(db.prepare('SELECT balance_credits FROM lab_customers WHERE id=?').get(freshId).balance_credits,0,'No old balance or repeated free grant');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lab_account_closures WHERE customer_id=?').get(freshId).n,0,'Fresh account is open');
  await assertCustomerOpen(env,freshId);
  await assert.rejects(()=>assertCustomerOpen(env,internal),/closed/);
});
test('retry diagnostics retain only a bounded error category and never erase an unverified identity',async t=>{
  const f=fixture(t);await account(f);await close(f);await cleanup(f);
  f.remoteError(401);
  await assert.rejects(()=>finishClosedStudioIdentity(f.env,internal),/HTTP 401/);
  assert.equal(f.db.prepare('SELECT issue FROM lab_studio_identity_cleanup_attempts WHERE customer_id=?').get(internal).issue,'clerk_http_401');
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM lab_clerk_identity_links WHERE canonical_id=?').get(internal).n,1);
  f.remoteError(0);
  await finishClosedStudioIdentity(f.env,internal);
  assert.equal(f.db.prepare('SELECT issue FROM lab_studio_identity_cleanup_attempts WHERE customer_id=?').get(internal).issue,null);
});
test('scheduled account erasure completes even when unrelated generation maintenance fails first',async t=>{
  const f=fixture(t);await account(f);await close(f);
  const prepare=f.env.LAB_DB.prepare;
  f.env.LAB_DB.prepare=sql=>{
    if(sql.includes("state='failed' AND provider_id"))throw Error('Synthetic generation-maintenance outage');
    return prepare(sql);
  };
  const tasks=[];
  await worker.scheduled({},f.env,{waitUntil(p){tasks.push(p);}});
  const outcomes=await Promise.allSettled(tasks);
  assert.ok(outcomes.some(x=>x.status==='rejected'&&x.reason.message==='Synthetic generation-maintenance outage'));
  assert.equal(f.db.prepare('SELECT state FROM lab_account_closures WHERE customer_id=?').get(internal).state,'deleted');
  assert.equal(f.db.prepare('SELECT state FROM lab_studio_identity_deletions WHERE customer_id=?').get(internal).state,'complete');
});
