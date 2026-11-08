import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {samClickCandidate,preferSamCandidate} from '../lab/sam-click-mask.js';
import {precisionEditRoute} from '../lab-worker/precision-edit.mjs';

const W=100,H=80,left={x:25,y:25},right={x:70,y:25};
function mask(rects,alpha=false){
 const d=new Uint8ClampedArray(W*H*4);
 for(let i=0;i<W*H;i++)d[i*4+3]=alpha?0:255;
 for(const [x,y,w,h] of rects)for(let j=y;j<y+h;j++)for(let k=x;k<x+w;k++){
  const i=(j*W+k)*4;d[i]=d[i+1]=d[i+2]=alpha?0:255;d[i+3]=255;
 }
 return d;
}
test('the wrong face cannot be accepted and is never inverted into the background',()=>{
 const wrong=mask([[60,10,25,30]]);
 assert.equal(samClickCandidate(wrong,W,H,left,{scope:'face'}),null);
 assert.ok(samClickCandidate(wrong,W,H,right,{scope:'face'}));
});
test('Whole person chooses the clicked instance regardless of provider order',()=>{
 const a=mask([[12,10,28,65]]),b=mask([[60,10,27,65]]);
 for(const ordered of [[a,b],[b,a]]){
  let chosen=null;for(const d of ordered)chosen=preferSamCandidate(chosen,samClickCandidate(d,W,H,left,{scope:'person'}));
  assert.ok(chosen);assert.equal(chosen.values[left.y*W+left.x],255);assert.equal(chosen.values[right.y*W+right.x],0);
  assert.equal(chosen.values[0],0);
 }
});
test('large opposite-person mask is rejected rather than inverted',()=>{
 const other=mask([[50,0,45,78]]);assert.equal(samClickCandidate(other,W,H,left,{scope:'person'}),null);
});
test('background-like masks cannot be treated as a face or person',()=>{
 const d=mask([[0,0,W,H]]);for(let y=10;y<70;y++)for(let x=55;x<90;x++)d[(y*W+x)*4]=d[(y*W+x)*4+1]=d[(y*W+x)*4+2]=0;
 assert.equal(samClickCandidate(d,W,H,left,{scope:'person'}),null);
});
test('foreground holes and transparent-alpha masks are not inverted or filled',()=>{
 const d=mask([[12,10,28,55]],true);d[(30*W+25)*4+3]=0;
 const c=samClickCandidate(d,W,H,left,{scope:'face'});assert.ok(c);assert.equal(c.values[30*W+25],0);
 assert.equal(c.values[right.y*W+right.x],0);
});
test('Outfit and Object masks remain valid at the clicked foreground',()=>{
 const d=mask([[10,35,30,35]]);for(const scope of ['clothing',''])assert.ok(samClickCandidate(d,W,H,{x:20,y:45},{scope}));
});
test('candidates preserve authored pixels and smaller clicked instance beats a merged union',()=>{
 const exact=samClickCandidate(mask([[12,10,28,55]]),W,H,left);
 const union=samClickCandidate(mask([[12,10,28,55],[60,10,27,60]]),W,H,left);
 assert.equal(preferSamCandidate(union,exact),exact);assert.equal(preferSamCandidate(exact,union),exact);
});
test('empty, full, tiny, malformed and out-of-image selections fail closed',()=>{
 assert.equal(samClickCandidate(mask([]),W,H,left),null);
 assert.equal(samClickCandidate(mask([[0,0,W,H]]),W,H,left),null);
 assert.equal(samClickCandidate(mask([[25,25,2,2]]),W,H,left),null);
 assert.throws(()=>samClickCandidate(new Uint8Array(10),W,H,left),/dimensions/);
 assert.throws(()=>samClickCandidate(mask([]),W,H,{x:100,y:20}),/inside/);
});

const sourceId='d37bb74d-ec39-4aba-9b92-a240da9cf256';
function harness(){
 const fetchBefore=globalThis.fetch,calls=[],assets=new Map(),puts=[];
 let reserved=0,submitted=0;
 const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
 const env={FAL_KEY:'fixture-not-a-real-key',LAB_SECRET:'fixture-only',LAB_MEDIA:{put:async(key)=>puts.push(key)}};
 const d={customer:true,fail,body:r=>r.json(),source:async(_,owner,id)=>{if(owner!=='owner'||id!==sourceId)fail(404,'Not your image');return {id,mime:'image/png'};},
  falImageBytes:async()=>new Uint8Array([1]),storedImageDimensions:()=>({width:640,height:480}),
  config:async()=>({daily_limit_microusd:1000000}),signedInput:async()=> 'https://private.invalid/signed-fixture',
  first:async(_,sql,id)=>sql.includes('balance_credits')?{balance_credits:200}:assets.get(id)||null,
  run:async(_,sql,...args)=>{if(sql.includes('INSERT INTO spend')){reserved++;return {meta:{changes:1}};}if(sql.includes('INSERT OR IGNORE INTO assets')){assets.set(args[0],{id:args[0],bytes:args[4]});return {meta:{changes:1}};}throw Error(sql);},
  json:(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}}),
  limitedBody:async r=>new Uint8Array(await r.arrayBuffer()),sniff:()=>true};
 globalThis.fetch=async(input,options={})=>{
  const url=String(input);calls.push({url,options});
  if(url==='https://queue.fal.run/fal-ai/sam-3/image'){submitted++;return new Response(JSON.stringify({request_id:'test-request-id-123456'}),{status:200});}
  if(url.includes('/status?'))return new Response(JSON.stringify({status:'COMPLETED'}));
  if(url.includes('/requests/'))return new Response(JSON.stringify({masks:[{url:'https://fal.media/test/right.png'},{url:'https://fal.media/test/left.png'}]}));
  if(url.startsWith('https://fal.media/'))return new Response(new Uint8Array([137,80,78,71]),{headers:{'Content-Type':'image/png'}});
  throw Error('Unexpected network: '+url);
 };
 const route=async(body,owner='owner')=>{
  const request=new Request('https://lab.invalid/api/precision/segment',{method:'POST',body:JSON.stringify(body)});
  return precisionEditRoute(request,env,owner,new URL(request.url),d);
 };
 const poll=async(q,owner='owner',override={})=>{
  const qs=new URLSearchParams({sourceId,requestId:q.requestId,expires:String(q.expires),ticket:q.ticket,...(q.candidateMasks?{candidateMasks:'1'}:{}),...override});
  const req=new Request('https://lab.invalid/api/precision/segment?'+qs);return precisionEditRoute(req,env,owner,new URL(req.url),d);
 };
 return {route,poll,calls,puts,assets,get submitted(){return submitted},get reserved(){return reserved},restore:()=>{globalThis.fetch=fetchBefore;}};
}
test('Face and person make exactly one bounded candidate request with no guessed detection id',async()=>{
 const h=harness();try{
  for(const targetPrompt of ['face','person']){
   const r=await h.route({sourceId,point:{x:125,y:120},targetPrompt,candidateMasks:true});assert.equal(r.status,202);
   const q=await r.json();assert.equal(q.candidateMasks,true);
   const payload=JSON.parse(h.calls.at(-1).options.body);
   assert.deepEqual(payload.point_prompts,[]);assert.equal(payload.prompt,targetPrompt);
   assert.equal(payload.return_multiple_masks,true);assert.equal(payload.max_masks,8);
  }
  assert.equal(h.submitted,2);assert.equal(h.reserved,2);
 }finally{h.restore()}
});
test('candidate retrieval preserves private ownership, tamper-proof tickets, cached masks and quota',async()=>{
 const h=harness();try{
  const q=await (await h.route({sourceId,point:{x:125,y:120},targetPrompt:'person',candidateMasks:true})).json();
  await assert.rejects(h.poll(q,'owner',{candidateMasks:'0'}),e=>e.status===403);
  await assert.rejects(h.poll(q,'different-user'),e=>e.status===403);
  const first=await(await h.poll(q)).json();assert.equal(first.maskSourceIds.length,2);assert.notEqual(...first.maskSourceIds);
  assert.equal(first.maskSourceId,first.maskSourceIds[0]);assert.ok(h.puts.every(x=>x.startsWith('owner/sources/')));
  const puts=h.puts.length,downloads=h.calls.filter(x=>x.url.startsWith('https://fal.media/')).length;
  const next=await(await h.poll(q)).json();assert.deepEqual(next,first);assert.equal(h.puts.length,puts);
  assert.equal(h.calls.filter(x=>x.url.startsWith('https://fal.media/')).length,downloads);
  assert.equal(h.submitted,1);assert.equal(h.reserved,1,'Polling and trying other masks do not purchase a second segmentation');
 }finally{h.restore()}
});
test('Outfit and Object retain their exact existing single-mask requests',async()=>{
 const h=harness();try{
  for(const targetPrompt of ['clothing','']){
   const q=await (await h.route({sourceId,point:{x:25,y:30},targetPrompt})).json();
   const body=JSON.parse(h.calls.at(-1).options.body);
   assert.deepEqual(body.point_prompts,[{x:25,y:30,label:1,object_id:1}]);assert.equal(body.return_multiple_masks,false);assert.equal(body.max_masks,1);
   assert.equal(q.candidateMasks,undefined);
   const response=await(await h.poll(q)).json();assert.ok(response.maskSourceId);assert.equal(response.maskSourceIds,undefined);
  }
 }finally{h.restore()}
});
test('unsupported candidate requests fail before reserving a paid selection',async()=>{
 const h=harness();try{
  await assert.rejects(h.route({sourceId,targetPrompt:'person',candidateMasks:true}),e=>e.status===400);
  await assert.rejects(h.route({sourceId,point:{x:25,y:30},targetPrompt:'clothing',candidateMasks:true}),e=>e.status===400);
  assert.equal(h.reserved,0);assert.equal(h.submitted,0);
 }finally{h.restore()}
});
test('client no longer guesses inverse foreground or requests detection id 1 for Character',()=>{
 const source=readFileSync('lab/precision-edit.js','utf8');
 assert.doesNotMatch(source,/255-values\[i\]|if\(!hit&&count/);
 assert.match(source,/if\(!best\)throw Error\(SAM_CLICK_MISS\)/);
 assert.match(source,/candidateMasks\?\{candidateMasks:true\}/);
});
