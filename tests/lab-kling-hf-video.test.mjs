import test from 'node:test';
import assert from 'node:assert/strict';
import {KLING_HF_PRO,klingHfParameters,klingHfInput,quoteKlingHf,submitKlingHf} from '../lab-worker/kling-hf.mjs';
import {VIDEO_MODELS,engineFor} from '../lab/video-models.js';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const config=(mode,extra={})=>klingHfParameters({type:'video',engine:'klinghf',mode,prompt:'Slow camera move',duration:10,resolution:'1080p',aspectRatio:mode==='start'?'auto':'16:9',audio:false,seed:null,...extra},{fail});
test('Kling Pro route and request never invent resolution or Soul Elements',()=>{
  assert.equal(engineFor({model:KLING_HF_PRO.start}),'klinghf');
  assert.equal(VIDEO_MODELS.klinghf.maxSeconds,15);
  const v=klingHfInput(config('start'),{imageUrl:'https://example.com/a.png',lastImageUrl:'https://example.com/b.png'});
  assert.equal(v.image_url,'https://example.com/a.png');
  assert.equal(v.last_image_url,'https://example.com/b.png');
  assert.equal(v.sound,'off');
  assert.equal(v.duration,10);
  assert.equal(v.resolution,undefined);
  assert.equal(v.elements,undefined);
  assert.equal(v.aspect_ratio,undefined);
  const text=klingHfInput(config('text',{audio:true,aspectRatio:'9:16'}));
  assert.equal(text.sound,'on');
  assert.equal(text.aspect_ratio,'9:16');
  assert.equal(text.image_url,undefined);
  assert.throws(()=>config('start',{duration:16}),/3 to 15/);
  assert.throws(()=>config('start',{seed:8}),/manual seed/);
  assert.throws(()=>config('start',{elements:['unknown']}),/Elements/);
  assert.throws(()=>klingHfInput(config('start')),/start frame/);
});
test('live quote cannot submit a video; explicit confirmation is single-use',async()=>{
  const old=globalThis.fetch,quotes=new Map(),jobs=new Map(),env={HF_CREDENTIALS:'synthetic:test'};
  let paid=0,estimates=0,posted;
  const dependencies={
    fail,now:()=>Date.now(),config:async()=>({daily_limit_microusd:10000000}),
    source:async(e,owner,id)=>({id,mime:'image/png'}),
    signedInput:async(e,url,id)=>'https://lab.example/input/'+id,
    first:async(e,sql,...a)=>sql.includes('FROM jobs WHERE quote_id')?[...jobs.values()].find(j=>j.quote_id===a[0]&&j.owner_id===a[1]):jobs.get(a[0]),
    run:async(e,sql,...a)=>{
      if(sql.startsWith('INSERT INTO quotes'))quotes.set(a[0],{id:a[0],owner_id:a[1],source_id:a[2],params:a[3],estimate_microusd:a[4],expires_at:a[5],vendor_quote_id:a[6],payload:a[8]});
      else if(sql.startsWith('INSERT INTO jobs'))jobs.set(a[0],{id:a[0],owner_id:a[1],source_id:a[2],quote_id:a[3],params:a[4],estimate_microusd:a[5],state:'submitting'});
      else if(sql.startsWith("UPDATE jobs SET provider_id")){const j=jobs.get(a[3]);Object.assign(j,{provider_id:a[0],params:a[1],state:'queued'});}
      return {meta:{changes:1}};
    }
  };
  globalThis.fetch=async(url,options)=>{
    posted=JSON.parse(options.body);
    if(String(url).includes('/estimate/')){estimates++;return Response.json({usd:'0.56'});}
    paid++;return Response.json({request_id:'c0f563e2-97ee-4b12-931f-0307400c7381',status_url:'https://api.higgsfield.ai/requests/c0f563e2-97ee-4b12-931f-0307400c7381/status'});
  };
  try{
    await assert.rejects(()=>quoteKlingHf(env,'owner',{sourceId:'photo',referenceSourceIds:['extra']},config('start'),new URL('https://lab.example'),dependencies),/extra/);
    const q=await quoteKlingHf(env,'owner',{sourceId:'photo',lastSourceId:'last'},config('start'),new URL('https://lab.example'),dependencies);
    assert.equal(q.estimatedUsd,0.56);assert.equal(paid,0);assert.equal(estimates,1);
    assert.equal(posted.resolution,undefined);
    const saved=quotes.get(q.id),params=JSON.parse(saved.params),payload=JSON.parse(saved.payload);
    await assert.rejects(()=>submitKlingHf(env,'owner',{...saved,vendor_quote_id:'wrong'},params,payload,dependencies),/fresh/);
    const first=await submitKlingHf(env,'owner',saved,params,payload,dependencies);
    assert.equal(first.state,'queued');assert.equal(paid,1);
    const second=await submitKlingHf(env,'owner',saved,params,payload,dependencies);
    assert.equal(second.id,first.id);assert.equal(paid,1);
    await assert.rejects(()=>quoteKlingHf(env,'owner',{sourceId:'photo'},config('text'),new URL('https://lab.example'),dependencies),/does not use/);
  }finally{globalThis.fetch=old;}
});
