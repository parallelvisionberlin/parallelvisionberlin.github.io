import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeImageReplacement,validateImageReplacement,imageReplacementRoute} from '../lab-worker/image-replacement.mjs';
import {compileImagePrompt} from '../lab/reference-guidance.js';
const original='d37bb74d-ec39-4aba-9b92-a240da9cf256';
const mask='d37bb74d-ec39-4aba-9b92-a240da9cf257';
const character='d37bb74d-ec39-4aba-9b92-a240da9cf258';
const jobId='d37bb74d-ec39-4aba-9b92-a240da9cf259';
const raw='d37bb74d-ec39-4aba-9b92-a240da9cf260';
const final='d37bb74d-ec39-4aba-9b92-a240da9cf261';
const plan=()=>({version:1,originalSourceId:original,maskSourceId:mask,scope:'person',referenceSourceIds:[character]});
const settings=()=>({type:'image',mode:'image',engine:'seedream',referenceMode:'base',aspectRatio:'auto',prompt:'replace the woman on the left with Alma',
  referenceRoles:[{role:'base'},{role:'identity'}],referenceSourceIds:[original,character]});
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
function validationFixture(){
 const assets=new Map([[original,{id:original,mime:'image/jpeg',width:1536,height:2048}],
   [mask,{id:mask,mime:'image/png',width:768,height:1024}],
   [character,{id:character,mime:'image/png',width:1024,height:1024}]]);
 const accessed=[];
 const d={fail,source:async(env,owner,id)=>{accessed.push(id);if(!assets.has(id))fail(404,'Source image not found');return assets.get(id);},
   falImageBytes:async(env,asset)=>asset,storedImageDimensions:asset=>({width:asset.width,height:asset.height})};
 return {assets,accessed,d};
}

test('replacement metadata keeps the chosen supported model and strips client completion flags',()=>{
 const input={...plan(),replacementFinalized:true,replacementRawOutputId:raw};
 const p=settings(),normalized=normalizeImageReplacement(input,p);
 assert.deepEqual(normalized,plan());
 assert.equal(p.engine,'seedream');
 assert.throws(()=>normalizeImageReplacement(input,{...p,engine:'kling'}),/supported Image model/);
 assert.throws(()=>normalizeImageReplacement({...input,maskSourceId:original},p),/separate reviewed selection/);
 assert.throws(()=>normalizeImageReplacement({...input,referenceSourceIds:[character,character]},p),/Choose the replacement references/);
 assert.throws(()=>normalizeImageReplacement(input,{...p,referenceMode:'references'}),/Base image editing/);
});

test('reviewed masks and original reference association are validated before a paid request',async()=>{
 const {d,accessed}=validationFixture(),p={...settings(),replacement:plan()};
 await validateImageReplacement({},'customer',{referenceSourceIds:[original,character]},p,d);
 assert.deepEqual(accessed,[character,original,mask]);
 assert.equal(p.replacementFinalized,false);
 await assert.rejects(validateImageReplacement({},'customer',{referenceSourceIds:[character,original]},p,d),e=>e.status===409);
 await assert.rejects(validateImageReplacement({},'customer',{referenceSourceIds:[original]},p,d),e=>e.status===409);
});

test('private destination reference ownership is checked and saved Custom Characters are accepted',async()=>{
 const {d,assets}=validationFixture(),p={...settings(),replacement:plan()};
 p.referenceRoles[1]={role:'custom',elementCategory:'characters',note:'Use this person including clothing'};
 await validateImageReplacement({},'customer',{referenceSourceIds:[original,character]},p,d);
 assets.delete(character);
 await assert.rejects(validateImageReplacement({},'customer',{referenceSourceIds:[original,character]},p,d),e=>e.status===404);
});

test('garment and object scope require the matching destination references',async()=>{
 const {d}=validationFixture();
 for(const [scope,role] of [['garment','outfit'],['outfit','outfit'],['object','object']]){
   const p={...settings(),replacement:{...plan(),scope},referenceRoles:[{role:'base'},{role}]};
   await validateImageReplacement({},'customer',{referenceSourceIds:[original,character]},p,d);
   p.referenceRoles[1]={role:'identity'};
   await assert.rejects(validateImageReplacement({},'customer',{referenceSourceIds:[original,character]},p,d),e=>e.status===409);
 }
});

test('replacement refuses distorted masks, lossy selections and a changed image crop',async()=>{
 const {d,assets}=validationFixture(),p={...settings(),replacement:plan()};
 assets.get(mask).width=800;
 await assert.rejects(validateImageReplacement({},'customer',{referenceSourceIds:[original,character]},p,d),/aspect ratio/);
 assets.get(mask).width=768;assets.get(mask).mime='image/jpeg';
 await assert.rejects(validateImageReplacement({},'customer',{referenceSourceIds:[original,character]},p,d),/PNG selection/);
 assets.get(mask).mime='image/png';p.aspectRatio='16:9';
 await assert.rejects(validateImageReplacement({},'customer',{referenceSourceIds:[original,character]},p,d),/Base aspect ratio/);
 p.aspectRatio='3:4';await validateImageReplacement({},'customer',{referenceSourceIds:[original,character]},p,d);
});

function commitFixture(){
 const {d,assets}=validationFixture();
 assets.set(final,{id:final,mime:'image/png',width:1536,height:2048});
 let job={id:jobId,owner_id:'customer',state:'completed',output_id:raw,params:JSON.stringify({...settings(),replacement:plan(),replacementFinalized:false})};
 let body={jobId,compositeSourceId:final,expectedOutputId:raw};let updates=0;
 const routeDeps={...d,body:async()=>body,json:Response.json,jobView:row=>({id:row.id,outputId:row.output_id,settings:JSON.parse(row.params)}),
   first:async()=>job,
   run:async(env,query,outputId,params,time,id,owner,expected)=>{
     assert.equal(owner,'customer');assert.equal(id,jobId);if(expected!==job.output_id)return {meta:{changes:0}};
     updates++;job={...job,output_id:outputId,params};return {meta:{changes:1}};
   }};
 const request=new Request('https://example.com/api/replacement/commit',{method:'POST'});
 return {assets,routeDeps,request,call:()=>imageReplacementRoute(request,{},'customer',new URL(request.url),routeDeps),
   setBody:value=>{body=value;},setJob:value=>{job=value;},getJob:()=>job,updates:()=>updates};
}

test('finishing a replacement retains the raw paid result and is idempotent',async()=>{
 const f=commitFixture();
 const finished=await (await f.call()).json();
 assert.equal(finished.job.outputId,final);
 assert.equal(finished.job.settings.replacementRawOutputId,raw);
 assert.equal(finished.job.settings.replacementFinalized,true);
 await f.call();assert.equal(f.updates(),1);
});

test('a failed finalization keeps the raw job recoverable and refuses lossy or mismatched output',async()=>{
 const f=commitFixture();
 f.assets.get(final).mime='image/jpeg';
 await assert.rejects(f.call(),e=>e.status===415);
 assert.equal(f.getJob().output_id,raw);assert.equal(f.updates(),0);
 f.assets.get(final).mime='image/png';f.assets.get(final).width=1024;
 await assert.rejects(f.call(),e=>e.status===400);
 f.assets.get(final).width=1536;f.setBody({jobId,compositeSourceId:final,expectedOutputId:character});
 await assert.rejects(f.call(),e=>e.status===409);
});

test('request-specific body or face guidance retains authored text and saved notes',()=>{
 const labels=[{role:'base'},{role:'custom',elementCategory:'characters',note:'Saved full appearance and clothes.'}];
 for(const [scope,expected] of [['person',/build supported by full-body reference views/],['face',/facial identity only/],['garment',/selected garment/],['object',/design, shape and materials/]]){
   const p={...settings(),replacement:{...plan(),scope}};
   const prompt=compileImagePrompt(p.prompt,labels,p);
   assert.ok(prompt.includes(p.prompt));assert.match(prompt,/Saved full appearance and clothes/);
   assert.match(prompt,expected);assert.match(prompt,/References 2/);
 }
});

test('all eight full Character notes survive scoped replacement within Seedream budget',()=>{
 const ids=Array.from({length:8},(_,index)=>'d37bb74d-ec39-4aba-9b92-a240da9cf26'+index);
 const labels=[{role:'base'},...ids.map((id,index)=>({role:'identity',elementId:character,elementCategory:'characters',elementView:index,elementCount:8,note:('Character note '+index+' ').padEnd(300,'x')}))];
 const p={...settings(),referenceSourceIds:[original,...ids],replacement:{...plan(),referenceSourceIds:ids}};
 const prompt=compileImagePrompt(p.prompt,labels,p);
 assert.ok(prompt.length<=5000);
 for(const label of labels.slice(1))assert.ok(prompt.includes(label.note));
 assert.match(prompt,/Face-only views do not establish a new physique/);
});
