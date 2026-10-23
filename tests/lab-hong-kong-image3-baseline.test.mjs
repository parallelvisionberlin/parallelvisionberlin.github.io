import test from 'node:test';
import assert from 'node:assert/strict';
import * as moods from '../lab/moods.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';
import {moodReferencePlan} from '../lab/mood-references.js';
import {HONG_KONG_REFERENCE_MANIFEST} from '../lab/hong-kong-reference-policy.js';

test('Hong Kong updated canon: 1-100% retains user direction, scene and one continuous optical recipe',()=>{
 for(const engine of moods.MOOD_MODELS)for(const referenceMode of ['base','references'])
 for(const n of [0,1])for(const intensity of [1,34,60,70,90,91,95,99,100]){
  const r=moods.prepareMoodPrompt('Preserve the person, wardrobe, camera and room.','hong-kong-nights',intensity,
   {engine,referenceMode,referenceCount:n});
  assert.equal(r.error,'',engine+' '+referenceMode+' '+n+' '+intensity+': '+r.error);
  assert.ok(r.prompt.startsWith('Preserve the person, wardrobe, camera and room.'));
  assert.ok(r.prompt.includes('MOOD STRENGTH '+intensity+'/100'));
  assert.doesNotMatch(r.prompt,/MAXIMUM ATMOSPHERE|STRONG ATMOSPHERE|VISIBLE ATMOSPHERE/);
  assert.equal(r.metadata.moodIntensity,intensity);
  if(n&&referenceMode==='base')assert.match(r.prompt,/EDIT IMAGE 1, not a new scene/);
 }
});

test('At 90-91 and 99-100, the instructions change only in the displayed intensity number',()=>{
 for(const engine of moods.MOOD_MODELS){
  const norm=x=>x.replace(/MOOD STRENGTH \d+\/100/,'MOOD STRENGTH N/100');
  for(const [a,b] of [[90,91],[99,100]]){
   const p=moods.prepareMoodPrompt('Portrait','hong-kong-nights',a,{engine,referenceCount:1}).prompt;
   const q=moods.prepareMoodPrompt('Portrait','hong-kong-nights',b,{engine,referenceCount:1}).prompt;
   assert.equal(norm(p),norm(q),engine+' '+a+' '+b);
  }
 }
});

test('Current Hong Kong pack has only two real photographic style inputs, never the artwork',()=>{
 assert.deepEqual(HONG_KONG_REFERENCE_MANIFEST.map(x=>x.file),['02-city-haze.jpg','03-shop-reflections.jpg']);
 assert.equal(moods.moodById('hong-kong-nights').preview,'/lab/mood-references/hong-kong-nights/supervalu.jpg');
});

test('Hong Kong Film Finish remains separate and the browser does not duplicate Worker refs',async()=>{
 const finish=await import('../lab/film-finish.js');
 assert.equal(finish.FILM_FINISH_RENDER_REVISION,10);
 for(const intensity of [90,91,95,100]){
  const r=moods.prepareMoodPrompt('Preserve this room.','hong-kong-nights',intensity,{engine:'seedream',referenceCount:1});
  const settings={type:'image',mode:'image',engine:'seedream',referenceMode:'base',
   referenceRoles:[{role:'base',name:'room.png',note:''}],prompt:r.prompt,...r.metadata};
  assert.deepEqual(moodReferencePlan(settings).references,[]);
  assert.deepEqual(r.metadata.filmFinish,{version:2,grain:0,haze:0,halation:0,film:0});
 }
 const a=moods.prepareMoodPrompt('Preserve the portrait.','hong-kong-nights',100,{engine:'seedream',referenceCount:1});
 const b=moods.prepareMoodPrompt('Preserve the portrait.','hong-kong-nights',100,
   {engine:'seedream',referenceCount:1,filmFinish:{version:2,grain:29,haze:100,halation:100,film:100}});
 assert.equal(a.prompt,b.prompt);
 assert.equal(b.metadata.filmFinish.grain,29);
});

test('Portrait, room and street remain within provider prompt budgets at high intensity',()=>{
 const anchors=[
 'Portrait: keep the same person, face, pose, clothing and camera.',
 'Interior: preserve the same room, furniture, dry floor and light sources.',
 'Street: preserve the same architecture, perspective, subject and framing.'
 ];
 for(const engine of moods.MOOD_MODELS)for(const input of anchors)for(const intensity of [90,91,95,100]){
  const r=moods.prepareMoodPrompt(input,'hong-kong-nights',intensity,{engine,referenceCount:1});
  assert.equal(r.error,'',engine+' '+intensity);
  assert.ok(r.prompt.startsWith(input+'\n\n'));
  assert.match(r.prompt,/natural|warm skin|real skin/);
  assert.doesNotMatch(r.prompt,/global green wash|whole-frame green cast/);
  const roles=[{role:'base',name:'source.jpg',note:''}];
  const p={type:'image',mode:'image',engine,referenceMode:'base',referenceRoles:roles,prompt:r.prompt,...r.metadata};
  assert.deepEqual(moodReferencePlan(p).references,[]);
  const compiled=compileImagePrompt(r.prompt,roles,p);
  assert.ok(compiled.length<=(engine==='seedreamlite'?3000:5000),engine+' '+intensity+' '+compiled.length);
 }
});
