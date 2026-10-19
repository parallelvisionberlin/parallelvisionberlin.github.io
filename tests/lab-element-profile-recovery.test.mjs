import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzeElementProfile} from '../lab-worker/element-profiles.mjs';

const ID='ad4b7111-39f4-47a9-898b-45a1cf07a030';
const WEBP=new Uint8Array([82,73,70,70,8,0,0,0,87,69,66,80,86,80,56,32,1,2,3,4]);
const PNG=new Uint8Array([137,80,78,71,13,10,26,10,0]);

function fixture(fetchImpl,count=2){
  const ids=Array.from({length:count},(_,i)=>'ad4b7111-39f4-47a9-898b-45a1cf07a'+String(101+i));
  const assets=new Set(ids);
  const pack={id:ID,name:'PVSCENE1|characters|NINA FULL BODY',
    refs:JSON.stringify(ids.map(id=>({id,role:'identity',note:'Preserve the character identity'})))};
  let stored=null,quota=0;
  const env={GEMINI_API_KEY:'test-secret-only',IMAGES:{
    input(stream){assert.ok(stream);return {
      transform(){return this;},
      output(){return {response:()=>new Response(WEBP,{headers:{'Content-Type':'image/webp'}})};}
    };}
  },LAB_MEDIA:{
    async get(){return {body:new Response(PNG).body,size:PNG.length};},
    async put(){}
  }};
  const first=async(_env,sql,...args)=>{
    if(sql.includes('FROM packs'))return args[0]===ID&&args[1]==='owner'
      ?{...pack,element_profile:stored?JSON.stringify(stored):null}:null;
    if(sql.includes('FROM assets'))return assets.has(args[0])&&args[1]==='owner'
      ?{id:args[0],owner_id:'owner',mime:'image/png',bytes:PNG.length,object_key:'private/a'}:null;
    throw Error('Unexpected query: '+sql);
  };
  const run=async(_env,sql,...args)=>{
    if(sql.includes('element_analysis_')){quota++;return {meta:{changes:1}};}
    if(sql.includes('INTO element_visual_profiles')){stored=JSON.parse(args[2]);return {meta:{changes:1}};}
    throw Error('Unexpected write: '+sql);
  };
  const fail=(status,message)=>{const error=Error(message);error.status=status;throw error;};
  return {env,get stored(){return stored;},get quota(){return quota;},
    dependencies:{first,run,now:()=>Date.UTC(2026,9,20),fail,fetchImpl}};
}

const profile=count=>({
  summary:'Photographic views of one consistent character with recognizable facial features and hair.',
  signature:'Preserve the same facial geometry, hairline and recognizable appearance while allowing different poses and environments.',
  landmarks:['hairline','facial geometry'],
  shots:Array.from({length:count},(_,index)=>({
    index,description:'A photographic angle '+(index+1)+' showing the same character.',
    keywords:['face','body','portrait','angle']
  }))
});

test('Eight saved Nina photos index with Flash-Lite when primary Gemini quota fails',async()=>{
  const calls=[];
  const f=fixture(async(url,options)=>{
    calls.push(url);
    assert.equal(options.headers['x-goog-api-key'],'test-secret-only');
    const request=JSON.parse(options.body);
    assert.equal(request.contents[0].parts.filter(p=>p.inlineData).length,8);
    assert.equal(request.generationConfig.thinkingConfig.thinkingBudget,0);
    assert.equal(request.generationConfig.maxOutputTokens,2600);
    if(calls.length===1)return new Response(JSON.stringify({error:{status:'RESOURCE_EXHAUSTED'}}),{status:429});
    return new Response(JSON.stringify({candidates:[{content:{parts:[
      {text:JSON.stringify(profile(8))}
    ]}}]}),{status:200});
  },8);
  const result=await analyzeElementProfile(f.env,'owner',ID,{},f.dependencies);
  assert.equal(result.profile.shots.length,8);
  assert.equal(f.stored.shots.length,8);
  assert.equal(f.quota,2,'The two providers share one single analysis quota reservation');
  assert.equal(calls.length,2);
  assert.match(calls[0],/gemini-2\.5-flash:generateContent/);
  assert.match(calls[1],/gemini-2\.5-flash-lite:generateContent/);
  await analyzeElementProfile(f.env,'owner',ID,{},f.dependencies);
  assert.equal(calls.length,2,'Successful profiles are cached');
});

test('Google HTTP 403 is surfaced safely without retrying or exposing provider data',async()=>{
  const calls=[];
  const f=fixture(async url=>{
    calls.push(url);
    return new Response(JSON.stringify({error:{
      status:'PERMISSION_DENIED',message:'Private billing details and test-secret-only'
    }}),{status:403});
  });
  await assert.rejects(
    ()=>analyzeElementProfile(f.env,'owner',ID,{},f.dependencies),
    error=>error.status===503&&/access or billing.*HTTP 403/.test(error.message)
      &&!error.message.includes('Private billing')&&!error.message.includes('test-secret-only')
  );
  assert.equal(calls.length,1);
  assert.equal(f.stored,null);
});

test('Malformed Gemini JSON retries on Flash-Lite without corrupting saved photos',async()=>{
  let calls=0;
  const f=fixture(async()=>{
    calls++;
    const text=calls===1?'{not valid JSON':JSON.stringify(profile(2));
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text}]}}]}),{status:200});
  });
  const result=await analyzeElementProfile(f.env,'owner',ID,{},f.dependencies);
  assert.equal(result.profile.category,'characters');
  assert.equal(calls,2);
});

test('Elements UI offers retry for existing packs and clears failed in-flight promises',()=>{
  const ui=readFileSync(new URL('../lab/scene-library.js',import.meta.url),'utf8');
  assert.match(ui,/function analyzeSavedElement\(/);
  assert.match(ui,/pendingProfiles\.delete\(item\.id\)/);
  assert.match(ui,/void analyzeSavedElement\(savedElement,true\)/);
  assert.match(ui,/retry\.textContent=pendingProfiles\.has\(item\.id\)/);
  assert.match(ui,/const profile=await analyzeSavedElement\(item\)/);
});
