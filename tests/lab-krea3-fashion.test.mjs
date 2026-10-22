import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileImagePrompt,AUTO_IMAGE_REINTERPRET_PROMPT} from '../lab/reference-guidance.js';
import {imageQualityGuidance} from '../lab/prompt-quality.js';
import {krea3Parameters,krea3Input,krea3EstimateMicros,krea3Size,KREA3_EDIT,KREA3_TEXT} from '../lab-worker/krea3.mjs';
import {quoteCustomerImageCredits} from '../lab-worker/customer-image-pricing.mjs';
import {imageModelLabel} from '../lab/model-labels.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const make=(referenceRoles=[],resolution='2k')=>krea3Parameters({
 type:'image',mode:'image',engine:'krea3',
 prompt:'Retain the model and garment',resolution,aspectRatio:'16:9'
},{fail,referenceRoles});

test('Photo-only Base preserves scene layout and occluded anatomy across image engines',()=>{
 for(const engine of ['seedream','seedreamlite','flash','qwen3','gemini','gemini21','krea3']){
  const settings={type:'image',engine,mode:'image',referenceMode:'base'};
  const base=[{role:'base',name:'uploaded-image.png'}];
  const preview=compileImagePrompt('',base,settings);
  assert.match(preview,/Refine the supplied image conservatively into a cleaner/);
  assert.match(preview,/the same number of people and their recognizable identities/);
  assert.match(preview,/Do not invent, duplicate, merge, remove or relocate people, faces, limbs or body parts/);
  assert.match(preview,/keep the original occlusion instead of revealing or reconstructing unseen details/);
  assert.match(preview,/Do not assume or change the depicted time of day/);
  assert.match(preview,/If no people are present, preserve the main subject, object count/);
  assert.doesNotMatch(preview,/visibly different result|You may change viewpoint, pose, styling|strong reinterpretation/i);
  const sent=compileImagePrompt(AUTO_IMAGE_REINTERPRET_PROMPT,base,settings);
  assert.match(sent,/PHOTO-ONLY FIDELITY:/);
  assert.match(sent,/Keep overlapping or hidden limbs and faces occluded/);
  assert.doesNotMatch(sent,/Do not change expression, pose, age, outfit or person/);
  assert.ok(sent.length<=(engine==='seedreamlite'?3000:5000));

  const authored=compileImagePrompt('Move the camera high above the scene and change the wardrobe.',base,settings);
  assert.match(authored,/Move the camera high above the scene and change the wardrobe/);
  assert.doesNotMatch(authored,/Refine the supplied image conservatively|PHOTO-ONLY FIDELITY/);
  const referencesOnly=compileImagePrompt('',[{role:'none',name:'example.png'}],{...settings,referenceMode:'references'});
  assert.doesNotMatch(referencesOnly,/Refine the supplied image conservatively/);
 }
});

test('Seedream realism is more detailed, Qwen and Nano remain concise',()=>{
 const refs=[{role:'identity',name:'portrait.png'}];
 const seed=compileImagePrompt('fashion portrait of a woman',refs,{type:'image',engine:'seedream',mode:'image'});
 for(const engine of ['qwen3','gemini','gemini21','krea3']){
  const prompt=compileImagePrompt('fashion portrait of a woman',refs,{type:'image',engine,mode:'image'});
  assert.match(prompt,/NATURAL HUMAN REALISM/);
  assert.ok(seed.length>prompt.length,'Other engines get shorter guidance than Seedream: '+engine);
  assert.equal(imageQualityGuidance('fashion portrait of a woman',refs,{type:'image',engine,mode:'image',exactPrompt:true}),'');
 }
});
test('Krea 3 text and editing models validate references and preserve safety',()=>{
 const p=make([{role:'base'},{role:'identity'}]);
 assert.equal(p.model,KREA3_EDIT);
 const input=krea3Input(p,['https://example.org/one.png','https://example.org/two.png'],'Reference 1 [Base image], Reference 2 [Identity]: keep the face.');
 assert.match(input.prompt,/<image-1>/);
 assert.match(input.prompt,/<image-2>/);
 assert.equal(input.enable_safety_checker,true);
 assert.equal(input.model,'berry');
 assert.deepEqual(input.image_size,{width:2048,height:1152});
 assert.deepEqual(krea3Size('2k','9:16'),{width:1152,height:2048});
 assert.equal(krea3Input(make(),[]).image_urls,undefined);
 assert.equal(make().model,KREA3_TEXT);
 assert.throws(()=>krea3Parameters({prompt:'Hi',resolution:'4k',aspectRatio:'16:9'},{fail}),/1K or 2K/);
 assert.throws(()=>krea3Parameters({prompt:'Hi',resolution:'2k',aspectRatio:'16:9'},{fail,referenceRoles:Array(5).fill({role:'none'})}),/four/);
});
test('Krea 3 reference-adjusted conservative estimate matches customer pricing',()=>{
 const p=make(Array(3).fill({role:'identity'}));
 const micros=krea3EstimateMicros(p,3);
 assert.equal(micros,225000);
 const q=quoteCustomerImageCredits(p,2);
 assert.equal(q.count,2);
 assert.equal(q.estimatedUsd,2*micros/1e6);
 assert.ok(q.credits>0);
 assert.equal(imageModelLabel({engine:'krea3',model:KREA3_EDIT}),'Krea 3');
 assert.equal(imageModelLabel({engine:'krea3',model:KREA3_TEXT}),'Krea 3');
});
test('Studio has Krea 3 selector and its own FAL generation route, not an uncensored badge',()=>{
 const studio=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
 assert.match(studio,/<option value="krea3">Krea 3<\/option>/);
 assert.match(app,/\/api\/fal\/krea-3/);
 assert.match(worker,/\/api\/fal\/krea-3/);
 assert.ok(!app.includes("['seedream','seedreamlite','flash','zspicy','krea3']"));
});
