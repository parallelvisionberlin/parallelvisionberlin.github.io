import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {moodCreatorInputValidation,moodCreatorImageCheck} from '../lab/mood-creator.js';
import {moodCreatorRoute} from '../lab-worker/mood-creator-service.mjs';

const mockFail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};
const url='https://parallel-vision-lab.parallelvision.workers.dev';
function testRig(){
 const db=new DatabaseSync(':memory:');
 db.exec("CREATE TABLE moodboard_analysis_quota(owner_id TEXT NOT NULL,day_key INTEGER NOT NULL,used INTEGER NOT NULL,PRIMARY KEY(owner_id,day_key)); CREATE TABLE moodboard_analysis_global(day_key INTEGER PRIMARY KEY,used INTEGER NOT NULL);");
 db.exec("CREATE TABLE assets(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,object_key TEXT NOT NULL,kind TEXT NOT NULL,mime TEXT NOT NULL,filename TEXT NOT NULL,bytes INTEGER NOT NULL,created_at INTEGER NOT NULL);");
 const objects=new Map();
 const env={GEMINI_API_KEY:'synthetic-test-only',LAB_MEDIA:{
   async put(key,bytes){objects.set(key,bytes);},
   async delete(key){objects.delete(key);}
 }};
 const deps={
  fail:mockFail,json:(x,status=200)=>Response.json(x,{status}),now:()=>Date.UTC(2026,9,11,12),
  limitedBody:async(request,max)=>{const b=new Uint8Array(await request.arrayBuffer());if(b.length>max)mockFail(413,'Too big');return b;},
  first:async(_env,sql,...args)=>db.prepare(sql).get(...args)||null,
  rows:async(_env,sql,...args)=>db.prepare(sql).all(...args),
  run:async(_env,sql,...args)=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}}),
  sniff:(bytes,mime)=>mime==='image/png'&&bytes.length>8&&bytes[0]===137&&bytes[1]===80,
  maxStorage:60*1024*1024,
 };
 const invoke=(path,method='POST',body={concept:'Vintage pearl and analog soft reflections'},type='application/json',owner='owner-A')=>{
  const request=new Request(url+path,{method,headers:{'Content-Type':type},body:typeof body==='string'||body instanceof Uint8Array?body:JSON.stringify(body)});
  return moodCreatorRoute(request,env,owner,new URL(request.url),deps);
 };
 return {db,env,invoke,objects};
}
test('Mood Creator gallery handoff accepts saved board UUIDs and preserves an optional idea',()=>{
  const lab=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const creator=readFileSync(new URL('../lab/mood-creator.js',import.meta.url),'utf8');
  const homepage=readFileSync(new URL('../lab/index.html',import.meta.url),'utf8');
  const page=readFileSync(new URL('../lab/mood-creator.html',import.meta.url),'utf8');
  const goodId='30000000-0000-4000-8000-000000000001';
  assert.match(lab,/if\(boardId&&!\/\^\[a-f0-9\]\{8\}/);
  const reg=lab.match(/if\(boardId&&!((?:\/\^.*?\/i))\.test\(boardId\)\)/)?.[1];
  assert.ok(reg,'Studio board link must have a UUID validator');
  assert.equal(Function('return '+reg)().test(goodId),true,'Saved Mood UUID must be accepted');
  assert.match(creator,/const mood=selectedLook,photo=lookPhoto,idea=lookDirection\.value\.trim\(\)/);
  assert.match(creator,/if\(idea\)concept\.value=idea/);
  assert.match(page,/href="#my-moods">My Moods/);
  assert.match(homepage,/mood-creator\.html#discover/);
});
test('Mood Creator validates original ideas, image inputs and optional curated base',()=>{
 assert.equal(moodCreatorInputValidation({name:'Liquid Memory',direction:'Pearlescent light, real film grain',baseMoodId:null,imageCount:2}),'');
 assert.equal(moodCreatorInputValidation({name:'Liquid Memory',direction:'',baseMoodId:'dreamcore',imageCount:0}),'');
 assert.match(moodCreatorInputValidation({name:'',direction:'wet photographic sheen',baseMoodId:null,imageCount:1}),/name/);
 assert.match(moodCreatorInputValidation({name:'Liquid Memory',direction:'',baseMoodId:null,imageCount:0}),/aesthetic/);
 assert.equal(moodCreatorImageCheck({type:'image/jpeg',size:1234}),'');
 assert.match(moodCreatorImageCheck({type:'image/svg+xml',size:1234}),/JPG/);
 assert.match(moodCreatorImageCheck({type:'image/png',size:21*1024*1024}),/20 MB/);
});
test('The editor is a distinct page, preserves Image prices and has two entry points',()=>{
 const home=readFileSync(new URL('../lab/index.html',import.meta.url),'utf8');
 const page=readFileSync(new URL('../lab/mood-creator.html',import.meta.url),'utf8');
 const style=readFileSync(new URL('../lab/mood-creator.css',import.meta.url),'utf8');
 const js=readFileSync(new URL('../lab/mood-creator.js',import.meta.url),'utf8');
 const studio=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
 assert.match(home,/id="mood-creator"/);
 assert.match(home,/href="\.\/mood-creator.html"/);
 assert.match(home,/href="\.\/mood-creator.html#discover"/);
 assert.match(page,/id="mc-start-image"/);
 assert.match(page,/id="mc-start-idea"/);
 assert.match(page,/id="mc-board"/);
 assert.match(page,/id="mc-analysis-note"/);
 assert.match(page,/id="mc-use-idea"/);
 assert.match(page,/id="mc-direction"/);
 assert.match(page,/id="mc-library-grid"/);
 assert.match(js,/await call\('\/api\/moodboards\/analyze'/);
 assert.match(js,/await call\('\/api\/moodboards\/image'/);
 assert.match(js,/signInFallbackRedirectUrl:location\.href/);
 assert.match(js,/location\.assign\('\.\/studio\.html\?tool=image&moodboard='/);
 assert.match(studio,/moodUI\.restore\(\{moodId:'custom',customMoodBoardId:boardId,moodIntensity:personal\.intensity\}/);
 assert.doesNotMatch(js,/fetch\('https:\/\/api\.spicyapi\.ai/);
 assert.match(style,/\.mc-look-grid/);
 assert.match(style,/\.mc-workspace-body/);
 assert.match(style,/\.mc-library-grid/);
});
test('AI style analysis is explicit, account-scoped and capped at six per day',async()=>{
 const {db,invoke}=testRig();
 const input={concept:'Muted melancholy in film, silver speculars, atmospheric depth'};
 let calls=0;
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async(_url,options)=>{
  calls++;const req=JSON.parse(options.body);
  assert.ok(req.contents[0].parts[0].text.includes('Analyze AESTHETIC STYLE only'));
  assert.equal(options.headers['x-goog-api-key'],'synthetic-test-only');
  return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({
    name:'Liquid Memory',direction:'Tactile film softness, physically coherent pearls of light on wet materials, long-focus atmospheric depth, imperfect darkroom diffusion and true surface grain.',
    palette:['#e2d4da','#526b70'],qualities:['wet pearlescence','film halation']
  })}]}}]});
 };
 try{
  for(let i=0;i<6;i++){
   const response=await invoke('/api/moodboards/analyze','POST',input);
   assert.equal(response.status,200);
   const data=await response.json();assert.equal(data.name,'Liquid Memory');
  }
  assert.equal(calls,6,'never exceed daily account API budget');
  await assert.rejects(()=>invoke('/api/moodboards/analyze','POST',input),/six style analyses/);
  assert.equal(calls,6,'blocked call does not reach Gemini');
  assert.equal(db.prepare('SELECT used FROM moodboard_analysis_quota WHERE owner_id=?').get('owner-A').used,6);
 }finally{globalThis.fetch=oldFetch;}
});
test('Moodboard image uploads use private small copies without generation charges',async()=>{
 const {env,invoke,objects}=testRig();
 const bytes=new Uint8Array(256);bytes.set([137,80,78,71,13,10,26,10],0);
 const res=await invoke('/api/moodboards/image','POST',bytes,'image/png');
 assert.equal(res.status,201);
 const data=await res.json();assert.ok(data.id);
 assert.equal(data.bytes,256);assert.equal(objects.size,1);
 assert.ok([...objects.keys()][0].includes('/moodboards/'));
 env.GEMINI_API_KEY='';
 await assert.rejects(()=>invoke('/api/moodboards/analyze','POST',{concept:'vintage photo'}),/not configured/);
});

test('Art Direction keeps settings and Save actions in one visible deck footer',()=>{
  const page=readFileSync(new URL('../lab/mood-creator.html',import.meta.url),'utf8');
  const css=readFileSync(new URL('../lab/mood-creator.css',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/mood-creator.js',import.meta.url),'utf8');
  const start=page.indexOf('<aside class="mc-direction"');
  const aside=page.slice(start,page.indexOf('</aside>',start));
  assert.ok(start>=0);
  assert.match(aside,/class="mc-direction-main" id="mc-direction-main"/);
  assert.match(aside,/class="mc-direction-footer" aria-label="Finish and save your Mood"/);
  const footerStart=aside.indexOf('class="mc-direction-footer"');
  for(const id of ['mc-name','mc-idea','mc-analyze','mc-analysis-note','mc-use-idea','mc-direction'])
    assert.ok(aside.indexOf('id="'+id+'"')>0&&aside.indexOf('id="'+id+'"')<footerStart,'Art direction field '+id);
  for(const id of ['mc-base','mc-intensity','mc-message','mc-save','mc-use','mc-saved-actions'])
    assert.ok(aside.indexOf('id="'+id+'"')>footerStart,'Final action '+id);
  assert.match(css,/\.mc-direction\{\s*display:grid;grid-template-rows:auto minmax\(0,1fr\) auto/);
  assert.match(css,/\.mc-direction-main\{[\s\S]*?overflow-y:auto;overflow-x:hidden/);
  assert.match(css,/\.mc-direction-footer\{[\s\S]*?border-top:1px solid #4e5850/);
  assert.match(css,/@media\(max-width:820px\)\{[\s\S]*?\.mc-direction\{display:flex;flex-direction:column;height:auto/);
  assert.match(page,/mood-creator\.css\?v=20261011-direction-deck1/);
  assert.match(page,/selected photo and\/or idea are sent to Google's AI service/);
  assert.match(js,/save\.onclick=\(\)=>void saveMood\(\)/);
  assert.match(js,/use\.onclick=\(\)=>void \(async\(\)=>\{/);
});
