import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareMoodPrompt} from '../lab/moods.js';
import {moodReferencePlan} from '../lab/mood-references.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';
test('Hong Kong face and motivated-light constraints survive all prompt routes',()=>{
 for(const engine of ['seedream','gemini'])for(const intensity of [1,34,35,75,76,100])
 for(const compact of [false,true])for(const filmFinish of [undefined,null]){
  const recipe=prepareMoodPrompt('Keep the same person and place.','hong-kong-nights',intensity,{engine,referenceCount:1,compact,filmFinish});
  assert.equal(recipe.error,'');
  assert.match(recipe.prompt,/IDENTITY FIRST/);
  assert.match(recipe.prompt,/facial geometry/);
  assert.match(recipe.prompt,/existing lamps, windows and specular reflections/);
  assert.match(recipe.prompt,/backdrop patch/);
  assert.doesNotMatch(recipe.prompt,/dim ambient side\/back light|dim emerald ambient side\/back light|broad fading halos/);
 }
});
test('Hong Kong final provider budget retains identity constraints and authored direction',()=>{
 for(const engine of ['seedream','gemini'])for(const count of [0,1,6])for(const intensity of [21,70,100]){
  const original='Keep the same face, cafe, table and outfit. '.repeat(2).trim();
  const recipe=prepareMoodPrompt(original,'hong-kong-nights',intensity,{engine,referenceCount:count});
  const settings={type:'image',mode:'image',engine,aspectRatio:'auto',prompt:recipe.prompt,...recipe.metadata,
   referenceRoles:Array.from({length:count},(_,i)=>({name:'source-'+i+'.png',role:i?'identity':'base',note:''}))};
  const plan=moodReferencePlan(settings);
  assert.equal(plan.settings.prompt,recipe.prompt,'Style photos must not rewrite the Mood');
  const prompt=compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings);
  assert.ok(prompt.length<=5000,prompt.length);
  assert.ok(plan.settings.prompt.startsWith(original));
  assert.match(prompt,/IDENTITY FIRST/);
  assert.match(prompt,/no body outline|no body halo/);
 }
});
test('Hong Kong generation recipe never changes with Film Finish',()=>{
 for(const engine of ['seedream','gemini'])for(const intensity of [34,70,100])for(const count of [1,3]){
  const base={engine,referenceCount:count};
  const on=prepareMoodPrompt('Keep the room and person.','hong-kong-nights',intensity,{...base,filmFinish:{version:1,grain:100,glow:100}});
  const off=prepareMoodPrompt('Keep the room and person.','hong-kong-nights',intensity,{...base,filmFinish:null});
  assert.equal(on.prompt,off.prompt);
  assert.match(off.prompt,/atmospheric emerald haze/i);
  assert.match(off.prompt,/IDENTITY FIRST/);
  assert.match(off.prompt,/WET \/ GLOSS/);
  assert.match(off.prompt,/HALATION:/);
  if(intensity===100)assert.match(off.prompt,/black letterbox bars/);
 }
});

test('Hong Kong cinematographer scene routing across all prompt strengths and budgets',()=>{
 for(const engine of ['seedream','gemini'])
 for(const intensity of [1,34,35,69,70,90,100])
 for(const options of [{},{compact:true},{ultraCompact:true}]){
  const result=prepareMoodPrompt('Keep the same real location and face.','hong-kong-nights',intensity,{engine,referenceCount:1,...options});
  assert.equal(result.error,'');
  assert.match(result.prompt,/INTERIOR/);
  assert.match(result.prompt,/STREET|EXTERIOR/);
  assert.match(result.prompt,/DIRECT FLASH/);
  assert.match(result.prompt,/IDENTITY FIRST/);
  assert.match(result.prompt,/facial geometry/);
  assert.match(result.prompt,/atmospheric emerald haze/i);
  if(intensity===100)assert.match(result.prompt,/black letterbox bars/);
 }
});
test('scene-aware relighting survives final provider compile without truncating original request',()=>{
 for(const engine of ['seedream','gemini'])for(const count of [0,1,3,6]){
  const author='Keep the same person, original rock and camera angle.';
  const recipe=prepareMoodPrompt(author,'hong-kong-nights',100,{engine,referenceCount:count});
  const roles=Array.from({length:count},(_,i)=>({name:'source-'+i+'.png',role:i?'identity':'base',note:''}));
  const plan=moodReferencePlan({type:'image',mode:'image',engine,aspectRatio:'auto',prompt:recipe.prompt,...recipe.metadata,referenceRoles:roles});
  const compiled=compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings);
  assert.ok(compiled.length<=5000,compiled.length);
  assert.ok(plan.settings.prompt.startsWith(author));
  assert.match(compiled,/DIRECT FLASH/);
  assert.match(compiled,/IDENTITY FIRST/);
  assert.match(compiled,/rock|setting/);
 }
});

test('Hong Kong defaults and direction cover source-faithful mixed practical lighting',()=>{
  const recipe=prepareMoodPrompt('Keep the photograph and person.','hong-kong-nights',85,{engine:'gemini',referenceCount:1});
  assert.equal(recipe.error,'');
  assert.match(recipe.prompt,/ruby-red practical spill/i);
  assert.match(recipe.prompt,/skin, hair, hands and fabrics/i);
  assert.match(recipe.prompt,/contact with ground or furniture/i);
  assert.match(recipe.prompt,/DAYLIGHT OUTDOORS/);
  assert.match(recipe.prompt,/without moving them onto a street/i);
});
