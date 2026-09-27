import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionRequest, LabSignInError} from '../lab/session-request.js';
const baseUrl='https://private-lab.example';
const now=1800000000000;
// Unsigned fixtures for the CLIENT freshness helper only. No production credentials or access.
const token=(offset,id='old')=>['test',Buffer.from(JSON.stringify({exp:(now+offset)/1000,nonce:id})).toString('base64url'),'fixture'].join('.');
const denied=()=>Response.json({error:'Sign-in expired or invalid. Please sign in again.'},{status:401});
const good=()=>Response.json({ok:true});
const fresh=token(60000,'fresh'),cached=token(30000);
function fixture({cachedToken=cached,refreshToken=fresh,responses=[good()],getToken,fetchImpl}={}){
  const calls=[],options=[];
  const session={id:'test-session',getToken:async o=>{options.push(o);return getToken?getToken(o):o?.skipCache?refreshToken:cachedToken;}};
  let current=session;
  const request=createSessionRequest({baseUrl,clock:()=>now,getSession:()=>current,fetchImpl:async(url,init)=>{calls.push({url,init});return fetchImpl?fetchImpl(url,init,calls.length):responses[Math.min(calls.length-1,responses.length-1)];}});
  return {request,calls,options,session,setSession:s=>{current=s;}};
}
test('fresh tokens do not cause an unnecessary Clerk network refresh',async()=>{
 const f=fixture();assert.equal((await f.request('/api/jobs')).status,200);assert.equal(f.calls.length,1);assert.deepEqual(f.options,[undefined]);
 assert.equal(f.calls[0].init.headers.get('Authorization'),'Bearer '+cached);
});
test('expired and nearly expired tokens refresh before sending any request',async()=>{
 for(const offset of [-1000,0,15000]){const f=fixture({cachedToken:token(offset)});await f.request('/api/session');assert.deepEqual(f.options,[undefined,{skipCache:true}]);assert.equal(f.calls.length,1);assert.equal(f.calls[0].init.headers.get('Authorization'),'Bearer '+fresh);}
});
test('one authentication rejection renews the token and replays only the identical request',async()=>{
 const f=fixture({responses:[denied(),good()]});const body=JSON.stringify({quoteId:'same-quote',confirm:true});
 assert.equal((await f.request('/api/jobs',{method:'POST',body,headers:{'Content-Type':'application/json'}})).status,200);
 assert.equal(f.calls.length,2);assert.equal(f.options.filter(x=>x?.skipCache).length,1);
 assert.equal(f.calls[0].init.body,body);assert.equal(f.calls[1].init.body,body);assert.equal(f.calls[1].init.headers.get('Authorization'),'Bearer '+fresh);
});
test('a file upload is replayed byte-for-byte only after pre-handler authentication rejection',async()=>{
 const f=fixture({responses:[denied(),good()]});const body=new Blob(['synthetic-input'],{type:'image/png'});
 await f.request('/api/uploads',{method:'POST',body});assert.equal(f.calls[0].init.body,body);assert.equal(f.calls[1].init.body,body);
});
test('renewal does not loop if the new token is also rejected',async()=>{
 const f=fixture({fetchImpl:()=>denied()});await assert.rejects(f.request('/api/jobs'),LabSignInError);assert.equal(f.calls.length,2);assert.equal(f.options.filter(x=>x?.skipCache).length,1);
});
test('network timeouts and server failures never resubmit a potentially paid request',async()=>{
 const f=fixture({fetchImpl:()=>{throw new Error('network failed');}});await assert.rejects(f.request('/api/jobs',{method:'POST',body:'same-quote'}),/network failed/);assert.equal(f.calls.length,1);
 for(const status of [403,408,422,429,500,502,503,504]){const x=fixture({responses:[Response.json({error:'unavailable'},{status})]});assert.equal((await x.request('/api/jobs',{method:'POST',body:'same-quote'})).status,status);assert.equal(x.calls.length,1);assert.equal(x.options.length,1);}
});
test('an unrelated 401 is not treated as permission to resubmit',async()=>{
 const f=fixture({responses:[Response.json({error:'provider authentication failed'},{status:401})]});assert.equal((await f.request('/api/jobs',{method:'POST',body:'same-quote'})).status,401);assert.equal(f.calls.length,1);
});
test('parallel image and History requests share a single refresh',async()=>{
 const f=fixture({getToken:async o=>{if(o?.skipCache){await new Promise(r=>setTimeout(r,10));return fresh;}return cached;},fetchImpl:(_url,init)=>init.headers.get('Authorization')==='Bearer '+fresh?good():denied()});
 const results=await Promise.all(Array.from({length:8},(_,i)=>f.request('/api/assets/'+i)));assert.ok(results.every(r=>r.ok));assert.equal(f.options.filter(x=>x?.skipCache).length,1);assert.equal(f.calls.length,16);
});
test('a session switch during token renewal cannot send the old draft under another account',async()=>{
 let release;const f=fixture({responses:[denied()],getToken:o=>o?.skipCache?new Promise(r=>{release=r;}):cached});
 const p=f.request('/api/jobs',{method:'POST',body:'private-draft'});while(!release)await new Promise(r=>setTimeout(r,1));f.setSession({id:'different-session',getToken:async()=>fresh});release(fresh);
 await assert.rejects(p,/Session changed/);assert.equal(f.calls.length,1);
});
test('epoch changes stop requests after sign-out even when a token is arriving',async()=>{
 let release,epoch=1;const f=fixture({getToken:()=>new Promise(r=>{release=r;})});
 const p=f.request('/api/jobs',{},()=>{if(epoch!==1)throw new Error('Session changed.');});while(!release)await new Promise(r=>setTimeout(r,1));epoch++;release(fresh);await assert.rejects(p,/Session changed/);assert.equal(f.calls.length,0);
});
test('aborted requests stop promptly during token renewal and never send late',async()=>{
 let release;const controller=new AbortController();const f=fixture({cachedToken:token(-1),getToken:o=>o?.skipCache?new Promise(r=>{release=r;}):token(-1)});
 const p=f.request('/api/uploads',{method:'POST',body:new Blob(['file']),signal:controller.signal});while(!release)await new Promise(r=>setTimeout(r,1));controller.abort();await assert.rejects(p,{name:'AbortError'});release(fresh);await new Promise(r=>setTimeout(r,1));assert.equal(f.calls.length,0);
});
test('true signed-out sessions do not issue requests or silently invent tokens',async()=>{
 const f=fixture();f.setSession(null);await assert.rejects(f.request('/api/session'),LabSignInError);assert.equal(f.calls.length,0);
 const g=fixture({cachedToken:null});await assert.rejects(g.request('/api/session'),LabSignInError);assert.equal(g.calls.length,0);
});
test('sign-in tokens are never sent to another origin or forwarded by redirects',async()=>{
 const f=fixture();for(const path of ['https://other.example/api/jobs','//other.example/api/jobs','/input/test'])await assert.rejects(f.request(path),/Invalid private API destination/);
 assert.equal(f.calls.length,0);await f.request('/api/session');assert.equal(f.calls[0].init.redirect,'error');
});
