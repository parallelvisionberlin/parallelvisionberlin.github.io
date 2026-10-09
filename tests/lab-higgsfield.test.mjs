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
  globalThis.fetch=async(url,opts)=>{calls++;assert.equal(new URL(url).origin,'https://api.higgsfield.ai');assert.equal(opts.headers.Authorization,'Key test:secret');assert.equal(opts.headers['Idempotency-Key'],id);assert.equal(opts.redirect,'error');return Response.json({request_id:id});};
  try{await assert.rejects(()=>hfRequest({},'/x'),/not connected|Connect/);assert.equal(calls,0);await hfRequest({HF_CREDENTIALS:'test:secret'},'/higgsfield-ai/soul/v2/image-to-image',{input:{prompt:'test'},idempotencyKey:id});assert.equal(calls,1);}finally{globalThis.fetch=previous;}
});
test('ambiguous server errors never become definite failures; validation failures do',async()=>{
  const previous=globalThis.fetch;
  try{for(const [status,definite] of [[503,false],[408,false],[409,false],[422,true],[401,true]]){globalThis.fetch=async()=>new Response('sensitive body',{status});await assert.rejects(()=>hfRequest({HF_CREDENTIALS:'test:secret'},'/x',{input:{}}),e=>e.definite===definite&&!e.message.includes('sensitive'));}}finally{globalThis.fetch=previous;}
});
test('training, owned identity, source generation, budget and ambiguous submission lifecycle',async()=>{
  const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../lab-worker/schema.sql',import.meta.url),'utf8'));
  const asset='b0f563e2-97ee-4b12-931f-0307400c7381',reference='c0f563e2-97ee-4b12-931f-0307400c7381';
  db.prepare('INSERT INTO assets VALUES(?,?,?,?,?,?,?,?)').run(asset,'owner','base.png','source','image/png','base.png',100,Date.now());
  const first=async(e,sql,...args)=>db.prepare(sql).get(...args),run=async(e,sql,...args)=>({meta:{changes:db.prepare(sql).run(...args).changes}}),rows=async(e,sql,...args)=>db.prepare(sql).all(...args);
  let budget=10_000_000,copied=false;
  const deps={first,run,rows,fail,now:()=>Date.now(),config:async()=>({daily_limit_microusd:budget}),body:r=>r.json(),jobView:j=>j,source:async(e,owner,assetId)=>{const a=await first(e,'SELECT * FROM assets WHERE id=? AND owner_id=?',assetId,owner);if(!a)fail(404,'source');return a;},sources:async(e,owner,ids)=>Promise.all(ids.map(i=>deps.source(e,owner,i))),signedInput:async()=> 'https://lab.example/input/base',storedImageDimensions:()=>({width:1776,height:2368}),safeVideoUrl:x=>x,copyResult:async()=>{copied=true;}};
  const env={HF_CREDENTIALS:'test:secret',LAB_MEDIA:{get:async()=>({arrayBuffer:async()=>new ArrayBuffer(100)})}};
  const invoke=(path,data)=>higgsfieldRoute(new Request('https://lab.example'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}),env,'owner',new URL('https://lab.example'+path),deps);
  const previous=globalThis.fetch;let posts=0,sent;
  try{
    globalThis.fetch=async(url,options)=>{if(String(url).includes('/estimate/'))return Response.json({usd:'0.0057'});if(options.method==='POST'){posts++;sent=JSON.parse(options.body);return Response.json({id:reference,status:'queued'});}return Response.json({status:'completed',id:reference});};
    const {job:training}=await invoke('/api/higgsfield/characters',{name:'Nina',referenceSourceIds:[asset],confirmTraining:true});
    assert.equal(training.state,'queued');assert.equal(sent.model_version,'v2');assert.equal(posts,1);assert.equal(db.prepare('SELECT SUM(estimate_microusd) AS n FROM spend').get().n,2500000);
    await refreshHiggsfield(env,training,JSON.parse(training.params),deps);
    const done=await first(env,'SELECT * FROM jobs WHERE id=?',training.id);assert.equal(done.state,'completed');
    let input={sourceId:asset,settings:{type:'image',characterId:training.id,identityStrength:.8,resolution:'1080p'}};
    budget=2500100;await assert.rejects(()=>invoke('/api/higgsfield/generate',input),/spending/);assert.equal(posts,1);
    budget=10000000;
    globalThis.fetch=async()=>Response.json({usd:'0.094'});await assert.rejects(()=>invoke('/api/higgsfield/generate',input),/above the displayed rate/);assert.equal(posts,1);
    globalThis.fetch=async(url,options)=>{if(String(url).includes('/estimate/'))return Response.json({usd:'0.0057'});if(options.method==='POST'){posts++;sent=JSON.parse(options.body);return Response.json({request_id:id,status_url:'https://api.higgsfield.ai/requests/'+id+'/status'});}return Response.json({request_id:id,status:'completed',images:[{url:'https://example.com/output.png'}]});};
    const {job:generation}=await invoke('/api/higgsfield/generate',input);assert.equal(sent.image_url,'https://lab.example/input/base');assert.equal(sent.custom_reference_id,reference);assert.equal(sent.aspect_ratio,'3:4');assert.equal(generation.state,'queued');
    await refreshHiggsfield(env,generation,JSON.parse(generation.params),deps);assert.equal(copied,true);
    const {job:plain}=await invoke('/api/higgsfield/generate',{sourceId:asset,settings:{type:'image',aspectRatio:'16:9'}});
    assert.equal(plain.state,'queued');assert.equal(sent.custom_reference_id,undefined);assert.equal(sent.aspect_ratio,'16:9');
    await run(env,"UPDATE jobs SET state='completed' WHERE id=?",plain.id);
    await assert.rejects(()=>invoke('/api/higgsfield/generate',{settings:{type:'image',prompt:'   '}}),/Write a prompt/);
    let urls=[];
    globalThis.fetch=async(url,options)=>{urls.push(String(url));if(String(url).includes('/estimate/'))return Response.json({usd:'0.0057'});sent=JSON.parse(options.body);return Response.json({request_id:id,status_url:'https://api.higgsfield.ai/requests/'+id+'/status'});};
    for(const characterId of [undefined,training.id]){
      const {job:text}=await invoke('/api/higgsfield/generate',{settings:{type:'image',prompt:'A sunlit room',characterId}});
      assert.equal(text.source_id,null);assert.equal(sent.image_url,undefined);assert.equal(sent.prompt,'A sunlit room');assert.equal(sent.aspect_ratio,'16:9');assert.equal(sent.custom_reference_id,characterId?reference:undefined);
      assert.equal(JSON.parse(text.params).model,'higgsfield-ai/soul/v2/standard');
      await run(env,"UPDATE jobs SET state='completed' WHERE id=?",text.id);
    }
    assert.ok(urls.every(u=>u.endsWith('/higgsfield-ai/soul/v2/standard')),'Both quote and submit use text endpoint');
    globalThis.fetch=async(url)=>{if(String(url).includes('/estimate/'))return Response.json({usd:'0.0057'});posts++;throw new Error('network timeout');};
    const {job:uncertain}=await invoke('/api/higgsfield/generate',input);assert.equal(uncertain.state,'uncertain');const count=posts;
    await assert.rejects(()=>invoke('/api/higgsfield/generate',input),/Nothing submitted/);assert.equal(posts,count);
    const other={...input,settings:{...input.settings,characterId:asset}};await assert.rejects(()=>invoke('/api/higgsfield/generate',other),/completed Soul 2/);
  }finally{globalThis.fetch=previous;db.close();}
});
