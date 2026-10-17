import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertPermittedLabSignup} from '../lab-worker/clerk-migration.mjs';
import {LEGACY_ISSUER,STUDIO_ISSUER} from '../lab-worker/clerk-issuer-policy.mjs';

const id='user_3KnownSigner';
function fixture(email,{verified=true,clerkId=id,status=200}={}){
  const env={LAB_BLOCK_SIGNUP_DOMAINS_ENABLED:'true',
    LAB_CLERK_V2_SECRET_KEY:'sk_test_example_not_real',
    LAB_CLERK_SECRET_KEY:'sk_test_legacy_not_real'};
  const calls=[];
  const fetcher=async (url,opts)=>{
    calls.push({url,opts});
    return Response.json({id:clerkId,primary_email_address_id:'id_primary',
      email_addresses:[{id:'id_primary',email_address:email,
        verification:{status:verified?'verified':'unverified'}}]},{status});
  };
  return {env,calls,fetcher};
}
for(const email of ['first@yournike.com','other@weekprime.com','UPPER@YOURNIKE.COM']){
  test('PV LAB blocks verified registration email '+email,async()=>{
    const f=fixture(email);
    await assert.rejects(
      ()=>assertPermittedLabSignup(f.env,id,STUDIO_ISSUER,{fetcher:f.fetcher}),
      e=>e.status===403&&/email domain cannot be used/.test(e.message)
    );
    assert.equal(f.calls.length,1);
    assert.equal(new URL(f.calls[0].url).pathname,'/v1/users/'+id);
    assert.equal(f.calls[0].opts.redirect,'manual');
    assert.equal(f.calls[0].opts.headers.Authorization,'Bearer '+f.env.LAB_CLERK_V2_SECRET_KEY);
  });
}
test('PV LAB permits verified legitimate email on both Clerk issuers',async()=>{
 const f=fixture('legitimate@example.com');
 await assertPermittedLabSignup(f.env,id,STUDIO_ISSUER,{fetcher:f.fetcher});
 await assertPermittedLabSignup(f.env,id,LEGACY_ISSUER,{fetcher:f.fetcher});
 assert.equal(f.calls.length,2);
 assert.equal(f.calls[1].opts.headers.Authorization,'Bearer '+f.env.LAB_CLERK_SECRET_KEY);
});
test('PV LAB refuses unverified or mismatched Clerk identity before provisioning',async()=>{
 const f=fixture('new@example.com',{verified:false});
 await assert.rejects(()=>assertPermittedLabSignup(f.env,id,STUDIO_ISSUER,{fetcher:f.fetcher}),e=>e.status===403);
 const different=fixture('new@example.com',{clerkId:'user_Else'});
 await assert.rejects(()=>assertPermittedLabSignup(different.env,id,STUDIO_ISSUER,{fetcher:different.fetcher}),e=>e.status===503);
});
test('registration policy fails closed on missing key or upstream failure',async()=>{
 const f=fixture('new@example.com');
 delete f.env.LAB_CLERK_V2_SECRET_KEY;
 await assert.rejects(()=>assertPermittedLabSignup(f.env,id,STUDIO_ISSUER,{fetcher:f.fetcher}),e=>e.status===503);
 assert.equal(f.calls.length,0);
 const denied=fixture('new@example.com',{status:429});
 await assert.rejects(()=>assertPermittedLabSignup(denied.env,id,STUDIO_ISSUER,{fetcher:denied.fetcher}),e=>e.status===503);
});
test('signup verification applies before both primary wallet creation paths',()=>{
 const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
 const migration=readFileSync(new URL('../lab-worker/clerk-migration.mjs',import.meta.url),'utf8');
 assert.match(migration,/await assertPermittedLabSignup\(env,identity.subject,identity.issuer\);/);
 assert.match(worker,/if\(!await isLabCustomer\(env,p.sub\)\)await assertPermittedLabSignup\(env,p.sub,p.iss\);/);
});
