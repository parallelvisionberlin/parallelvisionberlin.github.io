import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifySpicyCallback,spicyWakeToken,equalWakeToken} from '../lab-worker/spicy-webhook.mjs';

const secret='synthetic-spicy-webhook-secret-not-used-in-production';
const time=1792160000000;
async function signedRequest(event,{timestamp=Math.floor(time/1000),body=JSON.stringify(event),key=secret,version='2'}={}){
  const bytes=new TextEncoder().encode(body);
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),
    b=>b.toString(16).padStart(2,'0')).join('');
  const signed=new TextEncoder().encode(event.data.taskId+'.'+timestamp+'.'+digest);
  const hmac=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=Buffer.from(await crypto.subtle.sign('HMAC',hmac,signed)).toString('base64');
  return new Request('https://parallel-vision-lab.parallelvision.workers.dev/api/webhooks/spicy',{
    method:'POST',headers:{'Content-Type':'application/json','X-Webhook-Timestamp':String(timestamp),
      'X-Webhook-Signature':signature,'X-Webhook-Payload-Version':version},body
  });
}
const event={
  code:200,msg:'success',request_id:'whd_synthetic_1',
  data:{taskId:'job_synthetic_1',state:'succeeded',settled:true,cost:'0.072',
    output:{assets:[{mime:'image/png',url:'https://cdn.spicyapi.ai/test.png'}]}}
};

test('Spicy v2 signed terminal callback verifies raw bytes and task ID',async()=>{
  const req=await signedRequest(event);
  const verified=await verifySpicyCallback(req,secret,{now:()=>time});
  assert.equal(verified.taskId,'job_synthetic_1');
  assert.equal(verified.deliveryId,'whd_synthetic_1');
  assert.equal(verified.event.state,'succeeded');
});
test('webhook rejects forged body, wrong key, expired event and unsupported version',async()=>{
  const legitimate=await signedRequest(event);
  const altered=new Request(legitimate.url,{method:'POST',headers:legitimate.headers,
    body:JSON.stringify({...event,data:{...event.data,state:'failed'}})});
  await assert.rejects(verifySpicyCallback(altered,secret,{now:()=>time}),/mismatch/);
  await assert.rejects(verifySpicyCallback(await signedRequest(event,{key:'different-secret-forged-delivery'}),secret,{now:()=>time}),/mismatch/);
  await assert.rejects(verifySpicyCallback(await signedRequest(event,{timestamp:Math.floor(time/1000)-301}),secret,{now:()=>time}),/metadata/);
  await assert.rejects(verifySpicyCallback(await signedRequest(event,{version:'1'}),secret,{now:()=>time}),/version/);
});
test('webhook rejects oversized bodies and bad task shape',async()=>{
  const large=JSON.stringify({...event,data:{...event.data,input:{prompt:'x'.repeat(270000)}}});
  await assert.rejects(verifySpicyCallback(await signedRequest(event,{body:large}),secret,{now:()=>time}),/too large/);
  const bad={code:200,data:{taskId:null,state:'succeeded'}};
  await assert.rejects(verifySpicyCallback(await signedRequest({...event,data:{...event.data,taskId:'x'}},{body:JSON.stringify(bad)}),secret,{now:()=>time}),/task/);
});
test('Mood Photobooth pipeline uses 1K bound quotes, verified previews and private quality settings',()=>{
  const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  const client=readFileSync(new URL('../lab/app-mood-generation.js',import.meta.url),'utf8');
  const mood=readFileSync(new URL('../lab/explore-moods.js',import.meta.url),'utf8');
  const pricing=readFileSync(new URL('../lab-worker/customer-image-pricing.mjs',import.meta.url),'utf8');
  assert.match(client,/resolution:'1k',aspectRatio:imageAutoRatio/);
  assert.match(worker,/p\.engine==='seedream'&&p\.model===STILL_EDIT\?\{enable_thinking:true\}/);
  assert.match(worker,/const callBackUrl=callbackEnabled/);
  assert.match(worker,/spicyWakeToken\(env\.LAB_SECRET,wakeQuoteId\)/);
  assert.match(worker,/wakeQuoteId\|\|crypto\.randomUUID\(\)/);
  assert.match(worker,/receiveSpicyMoodCallback\(request,env,ctx\)/);
  assert.match(worker,/function privateMoodEarlyPreview/);
  assert.match(worker,/state==='saving'/);
  assert.match(worker,/first_preview_at/);
  assert.match(worker,/lab_spicy_reference_cache/);
  assert.match(pricing,/maxUsd|estimate|microusd/);
  assert.match(mood,/client\.previewBlob\(id\)/);
  assert.doesNotMatch(mood,/setTimeout\(resolve,600\)/);
  assert.equal((client.match(/confirm:true/g)||[]).length,1,'one confirmed paid submission');
});

test('server-derived wake token is deterministic, quote-bound and unforgeable',async()=>{
  const stored='existing-private-LAB_SECRET-from-fixture-not-production';
  const idA='11111111-1111-4111-8111-111111111111';
  const idB='22222222-2222-4222-8222-222222222222';
  const first=await spicyWakeToken(stored,idA);
  assert.match(first,/^[A-Za-z0-9_-]{43}$/);
  assert.equal(await spicyWakeToken(stored,idA),first);
  assert.equal(equalWakeToken(first,first),true);
  assert.equal(equalWakeToken(first,await spicyWakeToken(stored,idB)),false);
  assert.equal(equalWakeToken(first,await spicyWakeToken(stored+'x',idA)),false);
  assert.equal(equalWakeToken(first,'A'.repeat(42)),false);
  await assert.rejects(spicyWakeToken('short',idA),/unavailable/);
  await assert.rejects(spicyWakeToken(stored,'not-a-uuid'),/binding/);
});
test('wake-up callback never uses the request body as job authority',()=>{
  const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  const section=worker.slice(worker.indexOf('async function receiveSpicyMoodWakeup('),worker.indexOf('async function receiveSpicyMoodCallback('));
  assert.match(section,/spicyWakeToken\(env\.LAB_SECRET,quoteId\)/);
  assert.match(section,/refreshJob\(env,job,ctx,true\)/);
  assert.doesNotMatch(section,/request\.json\(/);
  assert.doesNotMatch(section,/remote_url=\?/);
  assert.doesNotMatch(section,/vendorRequest\(|\/jobs\/createTask|\/api\/jobs\//);
});
