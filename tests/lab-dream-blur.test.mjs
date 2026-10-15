import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {moodById,MOODS,prepareMoodPrompt} from '../lab/moods.js';
import {moodReferencePlan,createMoodReferenceLoader,isMoodStyleReference} from '../lab/mood-references.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';

test('Dream Blur is a curated Mood with actual user reference photography and a card',()=>{
  const mood=moodById('dream-blur');
  assert.ok(mood);
  assert.equal(mood.defaultIntensity,78);
  assert.equal(mood.category,'Analog');
  assert.match(mood.direction,/shutter|exposure/i);
  assert.match(mood.direction,/ADAPT colors/);
  assert.equal(MOODS.length,16);
  const photo=statSync(new URL('..'+mood.preview,import.meta.url));
  assert.ok(photo.size>100000);
  const html=readFileSync(new URL('../lab/moods.html',import.meta.url),'utf8');
  assert.equal((html.match(/data-mood-id="dream-blur"/g)||[]).length,1);
  assert.match(html,/LIGHT LEAKS\. MOTION\. FEELINGS\./);
  assert.match(html,/All 16 curated visual Moods/);
});
test('Dream Blur stays physically photographic and retains identity across intensity',()=>{
  for(const engine of ['seedream','seedreamlite','gemini','gemini21']){
    for(const intensity of [10,45,78,98,100]){
      const recipe=prepareMoodPrompt('Keep the same person and place.','dream-blur',intensity,{engine,referenceCount:1});
      assert.equal(recipe.error,'',engine+' '+intensity+': '+recipe.error);
      assert.match(recipe.prompt,/shutter|exposure/i);
      assert.match(recipe.prompt,/light/i);
      assert.match(recipe.prompt,/IDENTITY FIRST/i);
      assert.match(recipe.prompt,/Style/i);
      assert.match(recipe.prompt,/face|eye/i);
      assert.equal(recipe.metadata.moodId,'dream-blur');
    }
  }
  assert.notEqual(prepareMoodPrompt('Portrait','dream-blur',25,{referenceCount:1}).prompt,
    prepareMoodPrompt('Portrait','dream-blur',90,{referenceCount:1}).prompt);
});
test('the four supplied images attach as Style, without copying people or changing the Base',()=>{
  const original=prepareMoodPrompt('Same original woman indoors.','dream-blur',78,{referenceCount:1});
  const settings={type:'image',mode:'image',engine:'seedream',aspectRatio:'auto',prompt:original.prompt,...original.metadata,
    referenceRoles:[{name:'my-base.jpg',role:'base',note:''}]};
  const plan=moodReferencePlan(settings);
  assert.equal(plan.references.length,4);
  assert.deepEqual(plan.settings.referenceRoles.map(ref=>ref.role),['base','style','style','style','style']);
  assert.equal(moodReferencePlan(plan.settings).references.length,0);
  assert.equal(plan.settings.aspectRatio,'auto');
  for(const ref of plan.references){
    assert.ok(ref.label.name.startsWith('Dream Blur style - '));
    assert.ok(isMoodStyleReference(ref.label));
    assert.match(ref.label.note,/OPTICS ONLY/);
    assert.ok(statSync(new URL('..'+ref.url,import.meta.url)).size>100000);
  }
  assert.ok(compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings).length<=5000);
  assert.throws(()=>moodReferencePlan({...settings,referenceRoles:[...settings.referenceRoles,...Array.from({length:6},(_,i)=>({name:'other'+i,role:'identity',note:''}))]}),/six of your own/);
});
test('reference loader uploads all four photos once per account session',async()=>{
  let uploaded=0;
  const photo=new Blob(['fake-photo'],{type:'image/jpeg'});
  const loader=createMoodReferenceLoader({fetchFile:async()=>new Response(photo,{status:200}),
    upload:async()=>({id:'file-'+(++uploaded)})});
  const prepared=prepareMoodPrompt('Portrait.','dream-blur',78,{referenceCount:1});
  const settings={type:'image',mode:'image',engine:'seedream',aspectRatio:'auto',prompt:prepared.prompt,...prepared.metadata,
    referenceRoles:[{name:'base',role:'base',note:''}]};
  const first=await loader.prepare(settings,{sessionKey:'user-a'});
  assert.deepEqual(first.references.map(x=>x.id),['file-1','file-2','file-3','file-4']);
  assert.deepEqual((await loader.prepare(settings,{sessionKey:'user-a'})).references.map(x=>x.id),first.references.map(x=>x.id));
  assert.equal(uploaded,4);
  const other=await loader.prepare(settings,{sessionKey:'user-b'});
  assert.equal(other.references[0].id,'file-5');
});
test('backend allows Dream Blur jobs and saves it as a My Moods foundation',()=>{
 const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
 const boards=readFileSync(new URL('../lab-worker/moodboards.mjs',import.meta.url),'utf8');
 assert.match(worker,/IMAGE_MOOD_IDS=new Set\([^\n]+dream-blur/);
 assert.match(boards,/MOODBOARD_BUILTINS=new Set\([^\n]+dream-blur/);
});
