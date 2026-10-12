import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {moodReferencePlan,createMoodReferenceLoader,isMoodStyleReference} from '../lab/mood-references.js';
import {prepareMoodPrompt} from '../lab/moods.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';

const base=(intensity=70,count=1)=>{
  const recipe=prepareMoodPrompt('Portrait by a window','hong-kong-nights',intensity,{referenceCount:count});
  return {type:'image',mode:'image',engine:'seedream',aspectRatio:'auto',prompt:recipe.prompt,...recipe.metadata,
    referenceRoles:Array.from({length:count},(_,i)=>({name:'source-'+i+'.png',role:i?'identity':'base',note:''}))};
};

test('four real style images follow the Base, fit the prompt budget and survive history reuse without duplication',()=>{
  for(const intensity of [1,34,35,70,75,76,100]){
    const settings=base(intensity),plan=moodReferencePlan(settings);
    assert.deepEqual(plan.settings.referenceRoles.map(r=>r.role),['base','style','style','style','style']);
    assert.equal(settings.referenceRoles.length,1,'snapshot is not mutated');
    assert.equal(plan.settings.aspectRatio,'auto');
    assert.ok(compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles).length<=5000);
    assert.equal(moodReferencePlan(plan.settings).references.length,0,'restored jobs do not double-attach');
    assert.deepEqual(plan.settings.referenceRoles.filter(label=>!isMoodStyleReference(label)),settings.referenceRoles);
    assert.equal(plan.references.length,4);
    for(const ref of plan.references)assert.ok(readFileSync(new URL('..'+ref.url,import.meta.url)).length>1000);
  }
  assert.notEqual(base(65).prompt,base(70).prompt);
  assert.match(base().prompt,/GRAIN:.*BLOOM:.*HALATION:/);
});

test('limits and prompt overflow fail before any upload; other moods and models retain their inputs',async()=>{
  let calls=0;
  const loader=createMoodReferenceLoader({upload:()=>{calls++;},fetchFile:()=>{calls++;}});
  for(const settings of [base(70,7),{...base(),prompt:'x'.repeat(5000)}])
    await assert.rejects(loader.prepare(settings,{sessionKey:'a'}),/six|5,000/);
  assert.equal(calls,0);
  for(const settings of [{...base(),moodId:'night-flash'},{...base(),moodId:'custom'}, {...base(),engine:'kling'},{...base(),mode:'upscale'}]){
    const result=await loader.prepare(settings,{sessionKey:'a'});
    assert.equal(result.settings,settings);assert.deepEqual(result.references,[]);
  }
  assert.equal(moodReferencePlan(base(70,6)).settings.referenceRoles.length,10);
  const text=moodReferencePlan(base(70,0));
  assert.equal(text.settings.aspectRatio,'1:1');
  assert.ok(text.settings.referenceRoles.every(r=>r.role==='style'));
  assert.match(compileImagePrompt(text.settings.prompt,text.settings.referenceRoles),/There is no base image/);
});

test('reference uploads retain order, reuse IDs within a session and cannot cross accounts',async()=>{
  let seq=0,downloads=0;
  const loader=createMoodReferenceLoader({
    fetchFile:async()=>{downloads++;return new Response(new Blob(['reference'],{type:'image/png'}));},
    upload:async file=>({id:'upload-'+(++seq),name:file.name})
  });
  const first=await loader.prepare(base(),{sessionKey:0});
  assert.deepEqual(first.references.map(r=>r.id),['upload-1','upload-2','upload-3','upload-4']);
  assert.deepEqual((await loader.prepare(base(),{sessionKey:0})).references.map(r=>r.id),first.references.map(r=>r.id));
  assert.equal(downloads,4);
  assert.deepEqual((await loader.prepare(base(),{sessionKey:'b'})).references.map(r=>r.id),['upload-5','upload-6','upload-7','upload-8']);
  loader.clear();
  await loader.prepare(base(),{sessionKey:'b'});assert.equal(seq,12);
});

test('failed downloads are retriable and cancellation prevents upload',async()=>{
  let fail=true,cancelled=false,uploads=0;
  const loader=createMoodReferenceLoader({fetchFile:async()=>new Response('image',{status:fail?404:200}),upload:async()=>({id:String(++uploads)})});
  await assert.rejects(loader.prepare(base(),{sessionKey:'a'}),/could not load/);
  assert.equal(uploads,0);fail=false;
  assert.equal((await loader.prepare(base(),{sessionKey:'a'})).references.length,4);
  const stopped=createMoodReferenceLoader({fetchFile:async()=>{cancelled=true;return new Response('image');},upload:async()=>{throw Error('must not upload');}});
  await assert.rejects(stopped.prepare(base(),{sessionKey:'a',check(){if(cancelled)throw Error('Session changed');}}),/Session changed/);
});
