import test from 'node:test';
import assert from 'node:assert/strict';
import {kling4Parameters,prepareKling4,kling4EstimateMicros} from '../lab-worker/kling4-fal.mjs';
import {engineFor,VIDEO_MODELS} from '../lab/video-models.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const params=(mode='reference',extra={})=>kling4Parameters({type:'video',engine:'kling4',mode,prompt:'Follow @Element1 through the room',duration:5,resolution:'720p',aspectRatio:mode==='start'?'auto':'16:9',...extra},{fail,referenceLabels:x=>x||[]});
const deps={fail,source:async(_,owner,id)=>{if(id==='foreign')fail(404,'Source not found');return {id,owner_id:owner,mime:id.startsWith('v')?'video/mp4':'image/png',bytes:1000};},signedInput:async(_,__,id)=>'https://private.example/'+id,
  readImage:async()=>({width:1024,height:1024}),readVideo:async()=>({duration:5,width:1280,height:720,fps:24})};
test('Kling 4 remains distinct from Kling 3 and uses only canonical fal endpoints',()=>{
  assert.equal(engineFor({model:'kling/v4/reference-to-video'}),'kling4');
  assert.deepEqual(VIDEO_MODELS.kling4.modes,['start','reference','text','transform']);
  assert.equal(params('transform').model,'kling/v4/video-to-video/edit');
  for(const extra of [{duration:31},{resolution:'4k'},{seed:42},{provider:'spicy'},{model:'kling/4.0/image-to-video'},{referenceAudio:[{}]}])assert.throws(()=>params('reference',extra));
});
test('image references, Element views and shot sequences arrive at fal without safety overrides',async()=>{
  const p=params('reference',{kling4:{shots:[{duration:2,prompt:'Close-up'},{duration:3,prompt:'Wide shot'}],elements:[{name:'Alma',kind:'image'}],voiceIds:['voice_1']}});
  const data={referenceSourceIds:['a','b'],kling4Media:{elements:[{imageSourceIds:['c','d','e','f']}]}};
  const result=await prepareKling4({},'owner',data,p,'https://lab.example',deps);
  assert.equal(result.input.image_urls.length,2);
  assert.deepEqual(result.input.elements[0],{frontal_image_url:'https://private.example/c',reference_image_urls:['https://private.example/d','https://private.example/e','https://private.example/f']});
  assert.equal(result.input.multi_prompt.length,2);assert.deepEqual(result.input.voice_ids,['voice_1']);
  assert.equal(result.input.enable_safety_checker,undefined);assert.equal(result.input.seed,undefined);
  assert.equal(p.provider,'fal');assert.equal(kling4EstimateMicros(p),785000);
});
test('Frames preserve start, intermediate ordering and last frame',async()=>{
  const p=params('start');const r=await prepareKling4({},'owner',{sourceId:'a',lastSourceId:'b',kling4Media:{middleSourceIds:['c','d']}},p,'https://lab.example',deps);
  assert.equal(r.input.start_image_url,'https://private.example/a');assert.deepEqual(r.input.middle_image_urls,['https://private.example/c','https://private.example/d']);assert.equal(r.input.end_image_url,'https://private.example/b');assert.equal(r.input.aspect_ratio,undefined);
});
test('video edit prices measured source plus output and preserves private source IDs',async()=>{
  const p=params('transform');await prepareKling4({},'owner',{sourceId:'v1',referenceVideoIds:['v1']},p,'https://lab.example',deps);
  assert.equal(p.kling4VideoSeconds,5);assert.equal(kling4EstimateMicros(p),940000);
  assert.deepEqual(p.referenceVideoIds,['v1']);assert.equal(p.referenceVideos[0].seconds,5);
  p.duration=10;assert.equal(kling4EstimateMicros(p),1880000);
  p.resolution='1080p';assert.equal(kling4EstimateMicros(p),2820000);
});
test('private ownership, total video time, element alignment and shot totals fail before spending',async()=>{
  await assert.rejects(prepareKling4({},'owner',{referenceSourceIds:['foreign']},params(),'https://lab.example',deps),/Source not found/);
  await assert.rejects(prepareKling4({},'owner',{referenceSourceIds:['a'],kling4Media:{elements:[{imageSourceIds:['b']}]}},params(),'https://lab.example',deps),/does not match/);
  await assert.rejects(prepareKling4({},'owner',{referenceVideoIds:['v1','v2']},params(),'https://lab.example',{...deps,readVideo:async()=>({duration:20,width:1280,height:720,fps:24})}),/thirty seconds/);
  assert.throws(()=>params('text',{kling4:{shots:[{duration:3,prompt:'One shot'}]}}),/add up/);
});
