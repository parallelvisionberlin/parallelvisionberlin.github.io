import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VIDEO_MODELS} from '../lab/video-models.js';
import {seedanceParameters} from '../lab-worker/seedance.mjs';
import {
  TRANSFORM_MODEL,TRANSFORM_MAX_ESTIMATE_MICROS,characterTransformPrompt,
  prepareCharacterTransform,quoteCharacterTransform,submitCharacterTransform
} from '../lab-worker/higgsfield-video-transform.mjs';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const clip={id:'private-video',mime:'video/mp4',bytes:128*1024};
const photos=[{id:'character-1',mime:'image/jpeg',bytes:2024},{id:'character-2',mime:'image/png',bytes:4096}];
const selected={
  type:'video',engine:'seedance',mode:'transform',model:TRANSFORM_MODEL,
  transformType:'replace-character',provider:'higgsfield',
  prompt:'Keep the source outfit and original performance',
  resolution:'720p',aspectRatio:'auto',duration:8,seed:null,audio:true,
  referenceVideos:[{name:'source.mp4',seconds:8,note:''}],
  referenceAudio:[],referenceRoles:[
    {name:'profile',note:'Same identity, natural features'},
    {name:'side',note:'Profile view'}
  ]
};
const data={sourceId:clip.id,referenceVideoIds:[clip.id],referenceSourceIds:photos.map(x=>x.id)};
const deps={
  fail,
  source:async(_env,_owner,id)=>{assert.equal(id,clip.id);return clip;},
  sources:async(_env,_owner,ids,max)=>{assert.ok(max>=ids.length);return ids.map(id=>photos.find(x=>x.id===id));}
};

test('Transform is a real separate Seedance mode; Create and Extend endpoints stay unchanged',()=>{
  assert.deepEqual(VIDEO_MODELS.seedance.modes,['start','reference','text','extend','transform']);
  assert.equal(VIDEO_MODELS.seedance.endpoints.start,'bytedance/seedance-2.5/image-to-video');
  assert.equal(VIDEO_MODELS.seedance.endpoints.reference,'bytedance/seedance-2.5/reference-to-video');
  assert.equal(VIDEO_MODELS.seedance.endpoints.extend,'bytedance/seedance-2.5/video-extend');
  assert.equal(VIDEO_MODELS.seedance.endpoints.transform,TRANSFORM_MODEL);
  const p=seedanceParameters({mode:'transform',duration:8,resolution:'720p',aspectRatio:'auto',
    referenceVideos:selected.referenceVideos,referenceAudio:[],referenceRoles:selected.referenceRoles},
    {fail,referenceLabels:values=>values||[]});
  assert.equal(p.mode,'transform');
  assert.equal(p.provider,'higgsfield');
  assert.equal(p.transformType,'replace-character');
  assert.equal(p.model,TRANSFORM_MODEL);
  assert.equal(p.referenceVideos[0].seconds,8);
  assert.equal(TRANSFORM_MAX_ESTIMATE_MICROS,20000000);
});

test('identity-transfer instruction preserves the film scene, camera and performance',()=>{
  const prompt=characterTransformPrompt({...selected,referenceSourceIds:data.referenceSourceIds});
  for(const phrase of ['Replace only the subject','original video timeline','camera movement',
    'wardrobe','background','character identity','Identity reference 1','Profile view','Additional direction'])
    assert.match(prompt,new RegExp(phrase,'i'));
  assert.doesNotMatch(prompt,/https:\/\/|data:image/);
  assert.throws(()=>characterTransformPrompt({...selected,referenceSourceIds:data.referenceSourceIds,prompt:'x'.repeat(5001)}),/too long/i);
});

test('source video and identity photographs are validated before any paid action',async()=>{
  const p=structuredClone(selected),result=await prepareCharacterTransform({},'owner',data,p,deps);
  assert.equal(result.original.id,clip.id);
  assert.deepEqual(p.referenceSourceIds,photos.map(x=>x.id));
  assert.deepEqual(p.referenceVideoIds,[clip.id]);
  assert.equal(p.duration,8);
  assert.equal(p.sourceDurationSeconds,8);
  assert.equal(p.provider,'higgsfield');
  assert.equal(p.aspectRatio,'source');
  const bad=[
    [{...data,referenceVideoIds:[]},selected,/exactly one/i],
    [{...data,referenceVideoIds:[clip.id,clip.id]},selected,/exactly one/i],
    [{...data,referenceSourceIds:[]},selected,/1 to 8/i],
    [{...data,referenceSourceIds:[photos[0].id,photos[0].id]},selected,/different/i],
    [{...data,lastSourceId:'unexpected'},selected,/end frame/i],
    [data,{...selected,referenceVideos:[{name:'short.mp4',seconds:3}]},/4 and 30/i],
    [data,{...selected,transformType:'anything-else'},/Replace Character/i]
  ];
  for(const [d,p,pattern] of bad)
    await assert.rejects(prepareCharacterTransform({},'owner',d,structuredClone(p),deps),pattern);
});

test('Transform quotes a bound estimate, never submits without explicit confirmation',async()=>{
  const original=globalThis.fetch;
  const network=[],database=[];
  globalThis.fetch=async (url,init)=>{
    network.push({url:String(url),init});
    assert.equal(new URL(url).hostname,'api.higgsfield.ai');
    assert.equal(new URL(url).pathname,'/estimate/'+TRANSFORM_MODEL);
    assert.equal(init.method,'POST');
    assert.equal(init.headers.Authorization,'Key synthetic-test-credentials');
    const payload=JSON.parse(init.body);
    assert.equal(payload.video_url,'https://signed.example/video');
    assert.deepEqual(payload.image_urls,['https://signed.example/character-1','https://signed.example/character-2']);
    assert.equal(payload.output_format,'mp4');
    assert.equal(payload.resolution,'720p');
    assert.equal(payload.duration,undefined,'Video Edit derives its duration from the original video');
    assert.match(payload.prompt,/original video timeline/i);
    return Response.json({usd:'1.35'});
  };
  try{
    const d={
      ...deps,now:()=>1000000,
      signedInput:async(_env,_url,id)=>'https://signed.example/'+(id===clip.id?'video':id),
      run:async(_env,sql,...values)=>{database.push({sql,values});return {meta:{changes:1}};},
      isLabCustomer:async()=>false
    };
    const quote=await quoteCharacterTransform({HF_CREDENTIALS:'synthetic-test-credentials'},
      'owner',data,structuredClone(selected),new URL('https://site.example'),d);
    assert.equal(quote.provider,'Higgsfield');
    assert.equal(quote.priceIsEstimate,true);
    assert.equal(quote.estimatedUsd,1.35);
    assert.equal(quote.maxUsd,1.35);
    assert.ok(Number.isSafeInteger(quote.creditCost)&&quote.creditCost>0);
    assert.equal(quote.expiresAt,1290000);
    assert.equal(network.length,1,'quote sends only an estimate to Higgsfield');
    assert.equal(database.length,1,'quote only creates a bound quote, no job or charge');
    assert.match(database[0].sql,/INSERT INTO quotes/);
    assert.doesNotMatch(database[0].sql,/INSERT INTO jobs|spend/i);
    const payload=JSON.parse(database[0].values[8]);
    assert.equal(payload.model,TRANSFORM_MODEL);
    assert.equal(payload.input.video_url,'https://signed.example/video');
  }finally{globalThis.fetch=original;}
});

test('retail Transform requires its own explicit enable flag, never borrowing Soul/Extend access',async()=>{
  const customerDeps={...deps,isLabCustomer:async()=>true};
  await assert.rejects(
    quoteCharacterTransform({HF_CREDENTIALS:'synthetic',LAB_CUSTOMER_HIGGSFIELD_ENABLED:'true'},
      'customer',data,structuredClone(selected),new URL('https://site.example'),customerDeps),
    /not enabled/i);
  await assert.rejects(
    submitCharacterTransform({HF_CREDENTIALS:'synthetic',LAB_CUSTOMER_HIGGSFIELD_ENABLED:'true'},
      'customer',{vendor_quote_id:'higgsfield-video-transform-character-v1',estimate_microusd:100000},
      structuredClone(selected),{model:TRANSFORM_MODEL,input:{video_url:'synthetic',image_urls:['one','two']}},customerDeps),
    /not enabled/i);
});

test('a mismatched Transform job quote is rejected without provider submission',async()=>{
  const d={fail,isLabCustomer:async()=>false};
  await assert.rejects(
    submitCharacterTransform({HF_CREDENTIALS:'synthetic-test-credentials'},'owner',
      {vendor_quote_id:'different-feature',estimate_microusd:400000},
      structuredClone(selected),{model:TRANSFORM_MODEL,input:{video_url:'private',image_urls:['one','two']}},d),
    /invalid or expired/i
  );
});

test('Video Transform has its own entry and keeps the existing source-only film artwork',()=>{
  const read=path=>readFileSync(new URL('../lab/'+path,import.meta.url),'utf8');
  const html=read('studio.html'),app=read('lab.js'),css=read('video-transform.css'),scene=read('video-scene-states.js');
  for(const id of ['mode-transform','pv-transform-source-duration','video-reference-heading','video-transform-compare',
    'video-transform-original','video-transform-result']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' exists only once');
  }
  assert.match(html,/video-transform\.css\?v=20261106-viewport-fit2/);
  assert.match(css,/video-transform-active[\s\S]*?#pv-video-prompt-box textarea#prompt/);
  assert.match(css,/flex:1 1 145px!important/);
  assert.match(css,/min-height:78px!important/);
  assert.doesNotMatch(html,/id="pv-transform-source-settings"/);
  assert.match(app,/\$\('duration'\)\.hidden=mode==='transform'/);
  assert.match(read('video-input-action.js'),/if\(mode==='transform'\)return null/);
  assert.match(app,/\$\('video-media-title'\)\.textContent=mode==='transform'\?'Drop video or browse'/);
  assert.match(app,/\$\('scene-video-open'\)\.querySelector\('span'\)/);
  assert.match(css,/video-transform-active[^\n]*#video-media-drop/);
  assert.match(css,/video-transform-active[^\n]*#reference-drop/);
  assert.doesNotMatch(html,/VIDEO TRANSFORM \/ 01|Bring a video and your character references|id="transform-help"/);
  assert.match(app,/\$\('pv-transform-source-duration'\)\.hidden=!isVideo\|\|mode!=='transform'/);
  assert.match(app,/mode==='transform'/);
  assert.match(app,/quote\.settings\.mode==='transform'|q\.settings\.mode==='transform'/);
  assert.match(app,/showTransformComparison\(job\)/);
  assert.match(app,/transformVideoSwitch\(true\)/);
  assert.match(app,/transformVideoSwitch\(false\)/);
  assert.match(scene,/video-transform-active/);
  assert.match(css,/#app\.video-studio-active\.video-transform-active/);
  assert.match(read('scene-library.js'),/\['reference','extend','transform'\]/);
  assert.match(html,/id="pv-transform-reference-strip"/);
  assert.match(html,/id="pv-transform-inspector"/);
  assert.doesNotMatch(css,/#history\s*\{|#video-feed-center\s*\{|grid-template-columns:\s*clamp\(310px/,'Transform must not override the existing video deck or History geometry');
  assert.doesNotMatch(css,/\bfetch\s*\(|\/api\/jobs|\/api\/quotes|providerKey/);
  assert.match(read('video-compact-studio.css'),/visuals\/video-android-trio-original\.png/);
  assert.doesNotThrow(()=>new Function(scene),'scene presentation code remains valid JavaScript');
});
