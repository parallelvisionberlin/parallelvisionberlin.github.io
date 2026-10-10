import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {higgsfieldRoute,refreshHiggsfield} from '../lab-worker/higgsfield.mjs';
import {soul2Ratio,soul2Parameters,soul2Input,hfRequest,higgsfieldApiUrl} from '../lab-worker/higgsfield.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const id='a0f563e2-97ee-4b12-931f-0307400c7381';
test('source and optional identity stay distinct, strength zero survives',()=>{
  const p=soul2Parameters({type:'image',characterId:id,identityStrength:0,resolution:'1080p',seed:42},fail);p.aspectRatio=soul2Ratio(1776,2368);
  const input=soul2Input(p,'https://example.com/base.png',id);
  assert.equal(input.image_url,'https://example.com/base.png');assert.equal(input.custom_reference_id,id);assert.equal(input.custom_reference_strength,0);assert.equal(input.aspect_ratio,'3:4');assert.equal(input.seed,42);assert.equal(input.batch_size,1);
  assert.throws(()=>soul2Input(p,null,id));assert.throws(()=>soul2Parameters({type:'image',characterId:id,identityStrength:1.7},fail));assert.throws(()=>soul2Parameters({type:'image',characterId:id,seed:0},fail));
});
test('photo reinterpretation needs no character and respects an explicit ratio',()=>{
  const p=soul2Parameters({type:'image',aspectRatio:'16:9'},fail);
  const input=soul2Input(p,'https://example.com/photo.png');
  assert.equal(input.aspect_ratio,'16:9');assert.equal(input.custom_reference_id,undefined);
  assert.equal(input.custom_reference_strength,undefined);assert.ok(!input.prompt.includes('trained character'));
  assert.throws(()=>soul2Parameters({type:'image',characterId:'invalid'},fail));
});
test('default ratio and nearest source aspect ratio',()=>{assert.equal(soul2Ratio(0,0),'16:9');assert.equal(soul2Ratio(1920,1080),'16:9');assert.equal(soul2Ratio(1080,1920),'9:16');});
test('credential-bearing requests stay on the official API host',async()=>{
  assert.throws(()=>higgsfieldApiUrl('https://attacker.example/requests/test/status'));assert.throws(()=>higgsfieldApiUrl('https://api.higgsfield.ai@attacker.example/'));
  const previous=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url,opts)=>{calls++;assert.equal(new URL(url).origin,'https://api.higgsfield.ai');assert.equal(opts.headers.Authorization,'Key test:secret');assert.equal(opts.headers['Idempotency-Key'],id);assert.equal(opts.redirect,'manual');return Response.json({request_id:id});};
  try{await assert.rejects(()=>hfRequest({},'/x'),/not connected|Connect/);assert.equal(calls,0);await hfRequest({HF_CREDENTIALS:'test:secret'},'/higgsfield-ai/soul/v2/image-to-image',{input:{prompt:'test'},idempotencyKey:id});assert.equal(calls,1);}finally{globalThis.fetch=previous;}
});
test('ambiguous server errors never become definite failures; validation failures do',async()=>{
  const previous=globalThis.fetch;
  try{for(const [status,definite] of [[503,false],[408,false],[409,false],[422,true],[401,true]]){globalThis.fetch=async()=>new Response('sensitive body',{status});await assert.rejects(()=>hfRequest({HF_CREDENTIALS:'test:secret'},'/x',{input:{}}),e=>e.definite===definite&&!e.message.includes('sensitive'));}}finally{globalThis.fetch=previous;}
});
test('live Soul 2 price is quoted without charging and paid generation requires explicit consent',async()=>{
  const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../lab-worker/schema.sql',import.meta.url),'utf8'));
  const asset='b0f563e2-97ee-4b12-931f-0307400c7381',reference='c0f563e2-97ee-4b12-931f-0307400c7381';
  db.prepare('INSERT INTO assets VALUES(?,?,?,?,?,?,?,?)').run(asset,'owner','base.png','source','image/png','base.png',100,Date.now());
  const first=async(e,sql,...args)=>db.prepare(sql).get(...args),run=async(e,sql,...args)=>({meta:{changes:db.prepare(sql).run(...args).changes}}),rows=async(e,sql,...args)=>db.prepare(sql).all(...args);
  let budget=10_000_000,copied=false;
  const deps={first,run,rows,fail,now:()=>Date.now(),config:async()=>({daily_limit_microusd:budget}),body:r=>r.json(),jobView:j=>j,source:async(e,owner,assetId)=>{const a=await first(e,'SELECT * FROM assets WHERE id=? AND owner_id=?',assetId,owner);if(!a)fail(404,'source');return a;},sources:async(e,owner,ids)=>Promise.all(ids.map(i=>deps.source(e,owner,i))),signedInput:async()=> 'https://lab.example/input/base',storedImageDimensions:()=>({width:1776,height:2368}),safeVideoUrl:x=>x,copyResult:async()=>{copied=true;}};
  const env={HF_CREDENTIALS:'test:secret',LAB_MEDIA:{get:async()=>({arrayBuffer:async()=>new ArrayBuffer(100)})}};
  const invoke=(path,data,owner='owner')=>higgsfieldRoute(new Request('https://lab.example'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}),env,owner,new URL('https://lab.example'+path),deps);
  const previous=globalThis.fetch;let posts=0,estimateUsd='0.006',sent;
  const mock=async(url,options)=>{
    const address=String(url);
    if(address.includes('/estimate/'))return Response.json({usd:estimateUsd});
    if(options.method==='POST'){posts++;sent=JSON.parse(options.body);return Response.json(address.endsWith('/v1/custom-references')?{id:reference,status:'queued'}:{request_id:id,status_url:'https://api.higgsfield.ai/requests/'+id+'/status'});}
    return Response.json({status:'completed',id:reference,images:[{url:'https://example.com/output.png'}]});
  };
  try{
    globalThis.fetch=mock;
    const {job:training}=await invoke('/api/higgsfield/characters',{name:'Nina',referenceSourceIds:[asset],confirmTraining:true});
    assert.equal(training.state,'queued');assert.equal(sent.model_version,'v2');assert.equal(posts,1);
    assert.equal(db.prepare('SELECT SUM(estimate_microusd) AS n FROM spend').get().n,2500000);
    await refreshHiggsfield(env,training,JSON.parse(training.params),deps);
    const done=await first(env,'SELECT * FROM jobs WHERE id=?',training.id);assert.equal(done.state,'completed');
    const input={sourceId:asset,settings:{type:'image',characterId:training.id,identityStrength:.8,resolution:'1080p'}};
    await assert.rejects(()=>invoke('/api/higgsfield/generate',input),/explicitly confirm/);
    await assert.rejects(()=>invoke('/api/higgsfield/quote',{...input,referenceSourceIds:[asset]}),/one base image/);
    await assert.rejects(()=>invoke('/api/higgsfield/quote',{sourceId:asset,settings:{type:'image',characterId:asset,resolution:'1080p'}}),/completed Soul 2 identity/);
    const quoted=await invoke('/api/higgsfield/quote',input);
    assert.equal(quoted.estimatedUsd,0.006);assert.equal(quoted.priceIsEstimate,true);
    assert.equal(quoted.settings.characterName,'Nina');assert.equal(quoted.settings.aspectRatio,'3:4');
    assert.equal(posts,1,'A live $0.006 price check never generates or charges');
    assert.equal(db.prepare('SELECT SUM(estimate_microusd) AS n FROM spend').get().n,2500000);
    await assert.rejects(()=>invoke('/api/higgsfield/generate',{quoteId:quoted.id}),/explicitly confirm/);
    await assert.rejects(()=>invoke('/api/higgsfield/generate',{quoteId:quoted.id,confirm:true},'different-owner'),/Review a new Higgsfield price/);
    budget=2500100;await assert.rejects(()=>invoke('/api/higgsfield/generate',{quoteId:quoted.id,confirm:true}),/daily spending limit/);
    assert.equal(posts,1,'Exceeded budget does not send a provider job');
    budget=10_000_000;
    const {job:generation}=await invoke('/api/higgsfield/generate',{quoteId:quoted.id,confirm:true});
    assert.equal(generation.state,'queued');assert.equal(sent.image_url,'https://lab.example/input/base');
    assert.equal(sent.custom_reference_id,reference);assert.equal(sent.aspect_ratio,'3:4');assert.equal(posts,2);
    const {job:duplicate}=await invoke('/api/higgsfield/generate',{quoteId:quoted.id,confirm:true});
    assert.equal(duplicate.id,generation.id);assert.equal(posts,2,'Quote replay cannot charge a second time');
    await refreshHiggsfield(env,generation,JSON.parse(generation.params),deps);assert.equal(copied,true);
    const {id:expired}=await invoke('/api/higgsfield/quote',input);
    await run(env,'UPDATE quotes SET expires_at=? WHERE id=?',Date.now()-1,expired);
    await assert.rejects(()=>invoke('/api/higgsfield/generate',{quoteId:expired,confirm:true}),/expired/);assert.equal(posts,2);
    const untrained=await invoke('/api/higgsfield/quote',{sourceId:asset,settings:{type:'image',aspectRatio:'16:9'}});
    assert.match(untrained.notice,/NO SOUL ID/);
    const {job:plain}=await invoke('/api/higgsfield/generate',{quoteId:untrained.id,confirm:true});
    assert.equal(plain.state,'queued');assert.equal(sent.custom_reference_id,undefined);assert.equal(sent.aspect_ratio,'16:9');
    await run(env,"UPDATE jobs SET state='completed' WHERE id=?",plain.id);
    await assert.rejects(()=>invoke('/api/higgsfield/quote',{settings:{type:'image',prompt:'   '}}),/Write a prompt/);
    const textQuote=await invoke('/api/higgsfield/quote',{settings:{type:'image',prompt:'A quiet room',characterId:training.id}});
    assert.match(textQuote.settings.model,/standard$/);
    const {job:text}=await invoke('/api/higgsfield/generate',{quoteId:textQuote.id,confirm:true});
    assert.equal(text.source_id,null);assert.equal(sent.image_url,undefined);
    assert.equal(sent.custom_reference_id,reference);assert.equal(sent.prompt,'A quiet room');
    await run(env,"UPDATE jobs SET state='completed' WHERE id=?",text.id);
    estimateUsd='0.5';await assert.rejects(()=>invoke('/api/higgsfield/quote',input),/safety ceiling/);
    estimateUsd='0.006';
    globalThis.fetch=async(url,options)=>{if(String(url).includes('/estimate/'))return Response.json({usd:estimateUsd});posts++;throw new Error('network timeout');};
    const uncertainQuote=await invoke('/api/higgsfield/quote',input);
    const {job:uncertain}=await invoke('/api/higgsfield/generate',{quoteId:uncertainQuote.id,confirm:true});
    assert.equal(uncertain.state,'uncertain');const count=posts;
    const replay=await invoke('/api/higgsfield/generate',{quoteId:uncertainQuote.id,confirm:true});
    assert.equal(replay.job.id,uncertain.id);assert.equal(posts,count);
    const blocked=await invoke('/api/higgsfield/quote',input);
    await assert.rejects(()=>invoke('/api/higgsfield/generate',{quoteId:blocked.id,confirm:true}),/interrupted/);
    assert.equal(posts,count,'Unknown-status generation blocks a second charge');
  }finally{globalThis.fetch=previous;db.close();}
});

test('Higgsfield redirects are rejected without following credentials',async()=>{const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://attacker.example'}});};try{await assert.rejects(()=>hfRequest({HF_CREDENTIALS:'test:secret'},'/test',{input:{}}),e=>e.definite===true);assert.equal(calls,1);}finally{globalThis.fetch=original;}});
