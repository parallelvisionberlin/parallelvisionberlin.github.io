import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {QWEN3_TEXT,QWEN3_EDIT,Z_IMAGE_SPICY,experimentalImageParameters,
  buildExperimentalImageInput,zImageDimensions} from '../lab-worker/experimental-image-models.mjs';
import {prepareMoodPrompt,MOOD_MODELS} from '../lab/moods.js';
import {modelImageInputIssue} from '../lab/image-model-limits.js';

const fail=(code,message)=>{throw Error(message);};
const model=(engine,overrides={})=>experimentalImageParameters({
 type:'image',engine,mode:'image',prompt:'An editorial campaign photograph',aspectRatio:'16:9',
 resolution:engine==='zspicy'?'1.5k':'2k',...overrides
},{fail,referenceRoles:overrides.referenceRoles||[]});

test('Qwen Image 3.0 is the 2K-capable SpicyAPI model with real text/edit routes',()=>{
 const p=model('qwen3');
 assert.equal(p.model,QWEN3_TEXT);
 assert.equal(p.provider,'spicy');
 assert.deepEqual(buildExperimentalImageInput(p,0),{
   resolution:'2k',aspect_ratio:'16:9',num_outputs:1,enable_prompt_expansion:false
 });
 assert.equal(QWEN3_EDIT,'alibaba/qwen-image-3.0/edit');
 const a=model('qwen3',{referenceRoles:[{role:'base'},{role:'identity'}]});
 assert.equal(a.referenceRoles.length,2);
 assert.deepEqual(buildExperimentalImageInput(a,2),buildExperimentalImageInput(p,0));
 assert.throws(()=>model('qwen3',{referenceRoles:Array.from({length:4},()=>({role:'none'}))}),/three reference/);
 assert.throws(()=>model('qwen3',{resolution:'4k'}),/1K or 2K/);
});

test('Z-Image Spicy is text only and every supported size is within 1536px',()=>{
 const p=model('zspicy');
 assert.equal(p.model,Z_IMAGE_SPICY);
 assert.equal(p.resolution,'1.5k');
 assert.deepEqual(buildExperimentalImageInput(p,0),{
   width:1536,height:864,enable_prompt_expansion:false
 });
 for(const ratio of ['1:1','16:9','9:16','4:3','3:4','3:2','2:3','21:9']){
   for(const size of ['1k','1.5k']){
     const dims=zImageDimensions(size,ratio);
     assert.ok(dims.width>=256&&dims.width<=1536&&dims.height>=256&&dims.height<=1536);
   }
 }
 assert.throws(()=>model('zspicy',{referenceRoles:[{role:'base'}]}),/text-to-image only/);
 assert.throws(()=>model('zspicy',{resolution:'2k'}),/1536/);
 assert.throws(()=>buildExperimentalImageInput(p,1),/does not accept/);
});
test('Qwen and Z-Image can use curated text Moods without promising unavailable photo edits',()=>{
 for(const engine of ['qwen3','zspicy']){
   assert.ok(MOOD_MODELS.includes(engine));
   const result=prepareMoodPrompt('One model, editorial portrait', 'midnight-reverie', 72,{engine,referenceCount:0});
   assert.equal(result.error,'');
   assert.match(result.prompt,/MIDNIGHT REVERIE/);
 }
 assert.equal(modelImageInputIssue('zspicy',[{file:{name:'base.png',size:1000}}])?.includes('text-to-image'),true);
 assert.equal(modelImageInputIssue('qwen3',Array.from({length:4},()=>({file:{name:'base.png',size:1000}})))?.includes('three'),true);
});
test('Studio model menu has both models and their dedicated local icons',()=>{
 const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
 const client=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
 assert.match(html,/<option value="qwen3">Qwen Image 3\.0<\/option>/);
 assert.match(html,/<option value="zspicy">Z-Image Spicy<\/option>/);
 assert.match(client,/qwen3:'qwen\.svg'/);
 assert.match(client,/zspicy:'z-image\.svg'/);
 for(const file of ['qwen.svg','z-image.svg']){
   const svg=readFileSync(new URL('../lab/branding/'+file,import.meta.url),'utf8');
   assert.match(svg,/<svg/);assert.match(svg,/<path/);
 }
});
