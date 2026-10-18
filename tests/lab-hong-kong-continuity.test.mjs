import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareMoodPrompt,moodById} from '../lab/moods.js';
import {moodReferencePlan} from '../lab/mood-references.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';
import {HONG_KONG_VARIANTS} from '../lab/hong-kong-variants.js';

test('original October 10 Hong Kong photo direction is restored verbatim at 60%',()=>{
  const mood=moodById('hong-kong-nights');
  assert.equal(mood.defaultIntensity,60);
  assert.equal(mood.direction,'Dreamlike 1990s Hong Kong night-film photography: humid urban darkness, atmospheric emerald haze, softened practical neon, diffused city lights, rain-wet reflections, organic 35mm grain, optical halation and nocturnal melancholy. Respect the original scene and lighting. Emerald green is an atmospheric possibility, not a mandatory color overlay.');
  const user='Keep the same person and real scene.';
  const recipe=prepareMoodPrompt(user,mood.id,60,{referenceCount:1});
  const expected=user+'\n\nPV LAB MOOD / '+mood.name+': '+mood.direction+
    ' The first reference is the base photograph. Preserve face, identity, real body proportions, pose, camera, wardrobe and composition unless the user specifically asks to change them. Preservation is guidance, not a guarantee. Avoid: '+mood.avoid+'.';
  assert.equal(recipe.prompt,expected);
  assert.equal(recipe.metadata.moodIntensity,60);
  assert.equal(recipe.metadata.moodVariant,'original');
  assert.equal(recipe.error,'');
});
test('all Hong Kong tiers protect subjects without mandatory scene reconstruction',()=>{
  for(const engine of ['seedream','seedreamlite','gemini','gemini21'])
  for(const intensity of [1,34,35,60,75,76,90,100]){
    const recipe=prepareMoodPrompt('Keep the original person and room.','hong-kong-nights',intensity,{engine,referenceCount:1});
    assert.equal(recipe.error,'',engine+'/'+intensity);
    assert.match(recipe.prompt,/Preserve face, identity, real body proportions, pose, camera, wardrobe and composition/);
    assert.match(recipe.prompt,/Avoid: forced all-green tint/);
    assert.doesNotMatch(recipe.prompt,/reconstruct cinematic scene lighting|off-axis light modeling|Relight whole Base|MAXIMUM 100%: strong scene-aware/);
    assert.deepEqual(recipe.metadata.filmFinish,{version:2,grain:0,haze:0,halation:0,film:0});
    assert.ok(recipe.prompt.length<(engine==='seedreamlite'?3000:5000));
  }
});
test('low, medium and high intensity retain the approved original natural photography language',()=>{
  const low=prepareMoodPrompt('Portrait','hong-kong-nights',20,{referenceCount:1});
  const medium=prepareMoodPrompt('Portrait','hong-kong-nights',60,{referenceCount:1});
  const high=prepareMoodPrompt('Portrait','hong-kong-nights',100,{referenceCount:1});
  assert.match(low.prompt,/Gentle night-film diffusion/);
  assert.match(medium.prompt,/Dreamlike 1990s Hong Kong night-film photography/);
  assert.doesNotMatch(medium.prompt,/Immersive humid nighttime atmosphere, thick/);
  assert.match(high.prompt,/Immersive humid nighttime atmosphere, thick but realistic haze/);
  assert.notEqual(low.prompt,medium.prompt);
  assert.notEqual(medium.prompt,high.prompt);
});
test('optional Deep Green and Slow Shutter alter atmosphere without introducing competing photos',()=>{
  const user='My portrait in the same setting.';
  for(const variant of ['original','deep-green','slow-shutter']){
    const r=prepareMoodPrompt(user,'hong-kong-nights',60,{referenceCount:1,moodVariant:variant});
    assert.equal(r.error,'');assert.equal(r.metadata.moodVariant,variant);
    assert.ok(r.prompt.startsWith(user+'\n\n'));
    if(variant==='original')assert.doesNotMatch(r.prompt,/variation:/i);
    else assert.ok(r.prompt.includes(HONG_KONG_VARIANTS[variant].direction));
    const settings={type:'image',mode:'image',engine:'seedream',
      referenceMode:'base',referenceRoles:[{name:'portrait.png',role:'base'}],
      prompt:r.prompt,...r.metadata};
    const plan=moodReferencePlan(settings);
    assert.equal(plan.references.length,0);
    assert.deepEqual(plan.settings.referenceRoles.map(x=>x.role),['base']);
  }
});
test('Film Finish is optional and independent of the generation prompt',()=>{
  for(const engine of ['seedream','gemini'])for(const intensity of [20,60,100]){
    const a=prepareMoodPrompt('Original woman in room','hong-kong-nights',intensity,
      {engine,referenceCount:1,filmFinish:{version:2,grain:70,haze:60,halation:55,film:80}});
    const b=prepareMoodPrompt('Original woman in room','hong-kong-nights',intensity,
      {engine,referenceCount:1,filmFinish:null});
    const c=prepareMoodPrompt('Original woman in room','hong-kong-nights',intensity,
      {engine,referenceCount:1});
    assert.equal(a.prompt,b.prompt);
    assert.equal(b.prompt,c.prompt);
    assert.equal(b.metadata.filmFinish,undefined);
    assert.deepEqual(c.metadata.filmFinish,{version:2,grain:0,haze:0,halation:0,film:0});
    assert.equal(a.metadata.filmFinish.film,80);
  }
});
test('original prompt and assigned user roles survive final provider assembly without truncation',()=>{
  for(const engine of ['seedream','gemini'])
  for(const count of [0,1,3,6,10]){
    const user='Keep the same face, real cafe, original table and camera.';
    const r=prepareMoodPrompt(user,'hong-kong-nights',60,{engine,referenceCount:count});
    const roles=Array.from({length:count},(_,i)=>({name:'photo-'+i+'.png',role:i?'identity':'base',note:''}));
    const settings={type:'image',mode:'image',engine,referenceMode:'base',aspectRatio:'auto',prompt:r.prompt,...r.metadata,referenceRoles:roles};
    const plan=moodReferencePlan(settings);
    const compiled=compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings);
    assert.ok(compiled.includes(user),'user direction must survive');
    assert.equal(plan.references.length,0);
    assert.equal(plan.settings.prompt,r.prompt);
    assert.equal(plan.settings.referenceRoles.length,count);
    assert.ok(compiled.length<=5000,engine+'/'+count+' '+compiled.length);
    if(count)assert.match(compiled,/Base|base/);
  }
});
test('reference-only routing and no-Base subject do not inherit unrelated Hong Kong photos',()=>{
  for(const referenceMode of ['base','references']){
    const r=prepareMoodPrompt('New realistic portrait','hong-kong-nights',60,{engine:'seedream',referenceCount:0,referenceMode});
    assert.equal(r.error,'');
    const plan=moodReferencePlan({type:'image',mode:'image',engine:'seedream',
      referenceMode,aspectRatio:'16:9',prompt:r.prompt,...r.metadata,referenceRoles:[]});
    assert.equal(plan.references.length,0);
    assert.match(r.prompt,/Honor the requested subject and composition/);
  }
});
