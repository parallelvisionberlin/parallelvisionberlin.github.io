import test from 'node:test';
import assert from 'node:assert/strict';
import {KLING_SPICY_MODELS,klingSpicyParameters,klingSpicyInput,prepareKlingSpicyInput} from '../lab-worker/kling-spicy.mjs';
import {VIDEO_MODELS,engineFor,videoLabel} from '../lab/video-models.js';
import {creditsForJobMicros} from '../lab-worker/job-pricing.mjs';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
function config(mode='start',extra={}){
  return klingSpicyParameters({type:'video',engine:'kling3',mode,prompt:'A slow handheld push-in',
    duration:5,resolution:'1080p',aspectRatio:mode==='start'?'auto':'16:9',
    audio:false,seed:null,...extra},{fail});
}

test('public Kling 3.0 selects SpicyAPI endpoints and retains legacy history label',()=>{
  const p=config(),model=VIDEO_MODELS.kling3;
  assert.equal(p.provider,'spicy');
  assert.equal(p.model,'kling/3.0/image-to-video');
  assert.equal(model.label,'Kling 3.0');
  assert.deepEqual(model.modes,['start','text']);
  assert.equal(engineFor({model:KLING_SPICY_MODELS.text}),'kling3');
  assert.equal(videoLabel({engine:'klinghf',model:'kling-video/v3.0/pro/image-to-video'}),'Kling 3.0 Pro · legacy Higgsfield');
});
test('SpicyAPI payload exactly matches the published text/start field schema',()=>{
  const start=klingSpicyInput(config('start'),{imageUrl:'https://media.example/start.png',lastImageUrl:'https://media.example/end.png'});
  assert.deepEqual(start,{prompt:'A slow handheld push-in',duration_seconds:5,resolution:'1080p',generate_audio:false,
    shot_type:'single',guidance_scale:0.5,image_url:'https://media.example/start.png',last_image_url:'https://media.example/end.png'});
  assert.equal(start.sound,undefined);
  assert.equal(start.duration,undefined);
  assert.equal(start.cfg_scale,undefined);
  const text=klingSpicyInput(config('text',{aspectRatio:'9:16',audio:true}));
  assert.equal(text.aspect_ratio,'9:16');
  assert.equal(text.generate_audio,true);
  assert.equal(text.image_url,undefined);
  assert.equal(text.last_image_url,undefined);
  assert.throws(()=>klingSpicyInput(config('start')),/start frame/);
  assert.throws(()=>klingSpicyInput(config('text'),{imageUrl:'https://media.example/start.png'}),/does not use/);
});
test('Kling 3.0 rejects unsupported settings before quoting or spending',()=>{
  for(const extra of [{duration:16},{duration:2},{resolution:'4k'},{seed:7},{provider:'higgsfield'},
    {referenceRoles:[{role:'identity'}]},{referenceVideos:[{name:'movie'}]},{elements:['x']},{prompt:'x'.repeat(2501)}])
    assert.throws(()=>config('start',extra));
  assert.throws(()=>config('text',{aspectRatio:'auto'}),/Choose 16:9/);
  assert.throws(()=>config('start',{aspectRatio:'9:16'}),/follows the source framing/);
});
test('Kling Spicy preparation securely binds start/end image IDs and blocks extraneous media',async()=>{
  const assets={
    start:{id:'a',mime:'image/png',bytes:6543},
    end:{id:'b',mime:'image/jpeg',bytes:7888}
  };
  let signed=[];
  const deps={fail,source:async(_env,_owner,id)=>assets[id]||fail(404,'Image not found'),
    signedInput:async(_env,_url,id)=>{signed.push(id);return 'https://pv.example/private/'+id;}};
  const p=config();
  const {primary,input}=await prepareKlingSpicyInput({},'customer',{sourceId:'start',lastSourceId:'end'},p,new URL('https://pv.example'),deps);
  assert.equal(primary.id,'a');assert.deepEqual(signed,['a','b']);
  assert.equal(p.lastSourceId,'b');
  assert.equal(input.image_url,'https://pv.example/private/a');
  assert.equal(input.last_image_url,'https://pv.example/private/b');
  await assert.rejects(()=>prepareKlingSpicyInput({},'customer',{sourceId:'start',referenceSourceIds:['end']},config(),new URL('https://pv.example'),deps),/additional/);
  await assert.rejects(()=>prepareKlingSpicyInput({},'customer',{sourceId:'start'},config('text'),new URL('https://pv.example'),deps),/does not use/);
  assets.start={...assets.start,bytes:10000001};
  await assert.rejects(()=>prepareKlingSpicyInput({},'customer',{sourceId:'start'},config(),new URL('https://pv.example'),deps),/10 MB/);
});
test('customer quote pricing uses the existing default multiplier; no hardcoded video price',()=>{
  const p=config();
  assert.equal(creditsForJobMicros(448000,p),207); // $0.448 vendor maximum, 5 sec 1080p silent.
  assert.equal(creditsForJobMicros(672000,config('start',{audio:true})),310);
});
