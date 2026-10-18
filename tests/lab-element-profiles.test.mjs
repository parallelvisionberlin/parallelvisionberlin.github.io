import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {elementCategoryFromName,normalizeElementProfile,analyzeElementProfile,
  elementAnalysisInstruction} from '../lab-worker/element-profiles.mjs';
import {selectElementViews} from '../lab/scene-library.js';
import {compileImagePrompt,normalizeReferenceLabel} from '../lab/reference-guidance.js';
import {referenceRoleAdvisories} from '../lab/prompt-quality.js';

const ID='ad4b7111-39f4-47a9-898b-45a1cf07a030';
const A='ad4b7111-39f4-47a9-898b-45a1cf07a101';
const B='ad4b7111-39f4-47a9-898b-45a1cf07a102';
const WEBP=new Uint8Array([82,73,70,70,8,0,0,0,87,69,66,80,86,80,56,32,1,2,3,4]);
const PNG=new Uint8Array([137,80,78,71,13,10,26,10,0]);

const profile={summary:'A consistent lived-in apartment with a bookshelf and a wooden bedroom door.',
  signature:'Retain the original room proportions, the shelves and the placement of the door and bed in one consistent spatial layout.',
  landmarks:['wooden door','bed','bookcase'],
  shots:[
    {index:0,description:'View from entrance showing a doorway and bookshelf.',keywords:['door','bookshelf','entrance']},
    {index:1,description:'View toward the window and bed.',keywords:['bed','window']}
  ]};

test('visual profiles validate an actual multi-view Element and reject malformed shots',()=>{
 assert.deepEqual(elementCategoryFromName('PVSCENE1|locations|MyRoom'),{category:'locations',name:'MyRoom'});
 assert.equal(elementCategoryFromName('PHOTO PACK|Elsewhere'),null);
 const normalized=normalizeElementProfile(profile,'locations',2);
 assert.equal(normalized.version,1);
 assert.equal(normalized.shots.length,2);
 assert.deepEqual(normalized.landmarks,['wooden door','bed','bookcase']);
 assert.deepEqual(normalizeElementProfile({...profile,shots:[{index:1,description:'Window'},...profile.shots]},'locations',2).shots.map(s=>s.index),[0,1]);
 assert.match(elementAnalysisInstruction('locations','MyRoom',2),/ONE entity|One physical location/);
 assert.throws(()=>normalizeElementProfile({summary:'ok',shots:[]},'locations',2));
});

test('Elements choose prompt-relevant photographs without changing stored reference order',()=>{
 const item={title:'MyRoom',category:'locations',profile,refs:[{id:A,name:'entry.jpg'},{id:B,name:'window.jpg'}]};
 const original=JSON.stringify(item.refs);
 assert.deepEqual(selectElementViews(item,'Photograph Nina by the window',1),[1]);
 assert.deepEqual(selectElementViews(item,'Nina sitting in front of the bookcase',1),[0]);
 assert.deepEqual(selectElementViews({...item,profile:null},'',2),[0,1]);
 assert.deepEqual(selectElementViews(item,'',0),[]);
 assert.equal(JSON.stringify(item.refs),original);
});

test('one Element passes through both compact and full prompt maps with consistent identity metadata',()=>{
 const ref={name:'room.png',role:'room',note:'The same room, use a real viewpoint.',
   elementId:ID,elementName:'MyRoom',elementCategory:'locations',elementView:1,elementCount:4};
 const first=normalizeReferenceLabel(ref),second=normalizeReferenceLabel({...ref,name:'room2.png',elementView:2});
 assert.equal(first.elementId,ID);
 assert.equal(first.elementName,'MyRoom');
 assert.equal(referenceRoleAdvisories([first,second]).length,0);
 assert.ok(referenceRoleAdvisories([first,{name:'other.jpg',role:'room'}]).some(s=>s.includes('Multiple Environment')));
 const settings={type:'image',mode:'image',engine:'seedream',referenceMode:'references',exactPrompt:true};
 const compiled=compileImagePrompt('Nina sitting on the bed',[first,second],settings);
 assert.match(compiled,/ELEMENT CONTINUITY/);
 assert.match(compiled,/@MyRoom/);
 assert.match(compiled,/ONE actual place/);
 assert.match(compiled,/Reference 1/);
 const regular=compileImagePrompt('Nina sitting on the bed',[{role:'room',name:'r.jpg'}],settings);
 assert.doesNotMatch(regular,/ELEMENT CONTINUITY/);
});

test('private one-time Gemini analysis is cached and does not modify or upload full originals',async()=>{
 let saved=null,providerCalls=0,originalReads=0,quota=0;
 const objectMap=new Map([['private/a',PNG],['private/b',PNG]]);
 const pack={id:ID,name:'PVSCENE1|locations|MyRoom',refs:JSON.stringify([{id:A},{id:B}])};
 const assets={
   [A]:{id:A,owner_id:'owner-one',mime:'image/png',bytes:PNG.length,object_key:'private/a'},
   [B]:{id:B,owner_id:'owner-one',mime:'image/png',bytes:PNG.length,object_key:'private/b'}
 };
 const env={GEMINI_API_KEY:'redacted-test-secret',IMAGES:{
   input(stream){assert.ok(stream);return {
     transform(){return this;},
     output(){return {response:()=>new Response(WEBP,{headers:{'Content-Type':'image/webp'}})};}
   };}
 },LAB_MEDIA:{
   async get(key){if(key.startsWith('private/'))originalReads++;const b=objectMap.get(key);return b?{body:new Response(b).body,size:b.length}:null;},
   async put(key,body){objectMap.set(key,new Uint8Array(body));}
 }};
 const first=async(_env,sql,...args)=>{
   if(sql.includes('FROM packs'))return args[0]===ID&&args[1]==='owner-one'
     ?{...pack,element_profile:saved?JSON.stringify(saved):null}:null;
   if(sql.includes('FROM assets'))return assets[args[0]]?.owner_id===args[1]?assets[args[0]]:null;
   throw Error('Unexpected private lookup: '+sql);
 };
 const run=async(_env,sql,...args)=>{
   if(sql.includes('element_analysis_')){quota++;return {meta:{changes:1}};}
   if(sql.includes('INTO element_visual_profiles')){saved=JSON.parse(args[2]);return {meta:{changes:1}};}
   throw Error('Unexpected write: '+sql);
 };
 const errors=(status,message)=>{const e=Error(message);e.status=status;throw e;};
 const fetchImpl=async(url,opts)=>{
   providerCalls++;
   assert.ok(url.includes('generativelanguage.googleapis.com'));
   assert.equal(opts.method,'POST');
   assert.equal(opts.headers['x-goog-api-key'],'redacted-test-secret');
   const request=JSON.parse(opts.body);
   const images=request.contents[0].parts.filter(x=>x.inlineData);
   assert.equal(images.length,2);
   assert.equal(images[0].inlineData.mimeType,'image/webp');
   assert.equal(images[0].inlineData.data,Buffer.from(WEBP).toString('base64'));
   return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(profile)}]}}]}),{
     status:200,headers:{'Content-Type':'application/json'}
   });
 };
 const dependencies={first,run,now:()=>Date.UTC(2026,9,18),fail:errors,fetchImpl};
 const waits=[],ctx={waitUntil:x=>waits.push(x)};
 const firstResult=await analyzeElementProfile(env,'owner-one',ID,ctx,dependencies);
 assert.equal(firstResult.cached,false);
 assert.equal(saved.category,'locations');
 assert.equal(providerCalls,1);
 assert.equal(quota,2);
 assert.equal(originalReads,2);
 await Promise.all(waits);
 const again=await analyzeElementProfile(env,'owner-one',ID,ctx,dependencies);
 assert.equal(again.cached,true);
 assert.equal(providerCalls,1);
 assert.equal(originalReads,2);
 await assert.rejects(()=>analyzeElementProfile(env,'owner-two',ID,ctx,dependencies),/Element not found/);
 assert.equal(objectMap.get('private/a'),PNG);
});

test('UI keeps Elements grouped and offers @ mentions without changing Photo Packs',()=>{
 const script=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
 const library=readFileSync(new URL('../lab/scene-library.js',import.meta.url),'utf8');
 const markup=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
 assert.match(library,/selectElementViews\(item,context.prompt\|\|'',count\)/);
 assert.match(library,/elementId:item.id/);
 assert.match(script,/composer-element-tile/);
 assert.match(script,/scene-element-suggestions/);
 assert.match(script,/elementId:labels\[i\]\?\.elementId/);
 assert.match(script,/elementId:r\.elementId/);
 assert.match(markup,/id="scene-smart-analyze"/);
 assert.match(markup,/id="scene-element-suggestions"/);
 assert.match(markup,/scene-hero-art|scene-library-dialog/);
 assert.doesNotMatch(library,/await api\('\/api\/jobs'/);
});
