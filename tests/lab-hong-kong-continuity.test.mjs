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
  const original='Keep the same face, cafe, table and outfit. '.repeat(28).trim();
  const recipe=prepareMoodPrompt(original,'hong-kong-nights',intensity,{engine,referenceCount:count});
  const settings={type:'image',mode:'image',engine,aspectRatio:'auto',prompt:recipe.prompt,...recipe.metadata,
   referenceRoles:Array.from({length:count},(_,i)=>({name:'source-'+i+'.png',role:i?'identity':'base',note:''}))};
  const plan=moodReferencePlan(settings);
  const prompt=compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles);
  assert.ok(prompt.length<=5000,prompt.length);
  assert.ok(plan.settings.prompt.startsWith(original));
  assert.match(prompt,/IDENTITY FIRST/);
  assert.match(prompt,/no body outline|no body halo/);
 }
});