import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareMoodPrompt,moodById} from '../lab/moods.js';
import {moodReferencePlan} from '../lab/mood-references.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';
import {HONG_KONG_VARIANTS} from '../lab/hong-kong-variants.js';

test('the October 10 cinematic inspiration stays available for compositions, while Base edits lock the actual photograph',()=>{
  const mood=moodById('hong-kong-nights');
  assert.equal(mood.defaultIntensity,60);
  assert.match(mood.direction,/Dreamlike 1990s Hong Kong night-film photography/);
  const user='Keep the same person and real scene.';
  const edit=prepareMoodPrompt(user,mood.id,60,{referenceCount:1,referenceMode:'base'});
  assert.equal(edit.error,'');
  assert.ok(edit.prompt.startsWith(user+'\n\n'));
  assert.match(edit.prompt,/EDIT IMAGE 1, not a new scene/);
  assert.match(edit.prompt,/not a new scene/);
  assert.match(edit.prompt,/not an instruction to move anyone to Asia or add neon/);
  assert.match(edit.prompt,/natural expressive beauty/);
  assert.match(edit.prompt,/photographic light-and-air treatment/);
  assert.match(edit.prompt,/SCENE ADAPTATION, only what IMAGE 1 visibly supports/);
  for(const route of ['FASHION PORTRAIT','STREET OR TRANSIT','BEDROOM OR INTERIOR'])
    assert.ok(edit.prompt.includes(route),'Missing scene pathway: '+route);
  for(const primary of ['green taxi city','rain-polished exterior ground','lime-gold restaurant','fluorescent tunnel'])
    assert.ok(edit.prompt.includes(primary),'Primary reference DNA must shape the light: '+primary);
  assert.match(edit.prompt,/no new scene|not a new scene/);
  assert.equal(edit.metadata.moodIntensity,60);
  assert.equal(edit.metadata.moodVariant,'original');
  const text=prepareMoodPrompt('Woman in a Hong Kong street',mood.id,60,{referenceCount:0});
  assert.match(text.prompt,/Dreamlike 1990s Hong Kong night-film photography/);
  assert.doesNotMatch(text.prompt,/EDIT IMAGE 1/);
  const refsOnly=prepareMoodPrompt('Independent styled fashion portrait',mood.id,60,{referenceCount:1,referenceMode:'references'});
  assert.match(refsOnly.prompt,/Dreamlike 1990s Hong Kong night-film photography/);
  assert.doesNotMatch(refsOnly.prompt,/EDIT IMAGE 1/);
});
test('every supported engine and Mood strength preserves face, flattering skin exposure, clothing and actual street',()=>{
  for(const engine of ['seedream','seedreamlite','gemini','gemini21'])
  for(const intensity of [1,34,35,60,75,76,90,100]){
    const recipe=prepareMoodPrompt('Preserve her face and original street.','hong-kong-nights',intensity,{engine,referenceCount:1});
    assert.equal(recipe.error,'',engine+'/'+intensity);
    assert.match(recipe.prompt,/not a new scene/);
    assert.match(recipe.prompt,/natural expressive beauty/);
    assert.match(recipe.prompt,/softly visible eyes/);
    assert.match(recipe.prompt,/every background building, sign and street element/);
    assert.match(recipe.prompt,/Fine pushed 35mm color-negative shadow texture/);
    assert.match(recipe.prompt,/User direction takes priority/);
    assert.match(recipe.prompt,/practicals|practical lights|light sources/);
    assert.match(recipe.prompt,/warm lamps/);
    assert.match(recipe.prompt,/not an instruction to move anyone to Asia or add neon/);
    assert.doesNotMatch(recipe.prompt,/reconstruct cinematic scene lighting|off-axis light modeling|Relight whole Base/);
    assert.deepEqual(recipe.metadata.filmFinish,{version:2,grain:0,haze:0,halation:0,film:0});
    assert.ok(recipe.prompt.length<(engine==='seedreamlite'?3000:5000));
  }
});
test('increasing the strength changes existing light only, never scene identity or excessive generated grain',()=>{
  const low=prepareMoodPrompt('Portrait','hong-kong-nights',20,{referenceCount:1}).prompt;
  const medium=prepareMoodPrompt('Portrait','hong-kong-nights',60,{referenceCount:1}).prompt;
  const high=prepareMoodPrompt('Portrait','hong-kong-nights',100,{referenceCount:1}).prompt;
  assert.match(low,/Subtle: quiet warm\/cool film response/);
  assert.match(medium,/Editorial: luminous flattering skin/);
  const approved=prepareMoodPrompt('Portrait','hong-kong-nights',90,{referenceCount:1}).prompt;
  assert.match(approved,/Expressive: richer emerald night ambience/);
  assert.doesNotMatch(approved,/Make atmospheric diffusion clearly visible/);
  assert.ok(high.includes('Keep existing emerald/petrol shadows, warm tungsten light, natural skin and contrast'));
  assert.match(high,/Make atmospheric diffusion clearly visible/);
  assert.match(high,/localized halation/);
  assert.match(high,/subtle veiling flare/);
  assert.match(high,/No extra grain, muddy blacks, blanket blur or new lamps/);
  assert.match(high,/Wet reflections only outdoors; dry interiors/);
  assert.doesNotMatch(high,/automatically import style photos|replace background buildings/);
  assert.notEqual(low,medium);
  assert.notEqual(medium,high);
  assert.match(medium,/softly visible eyes/);
  assert.match(high,/Keep natural expressive beauty, warm healthy skin and softly visible eyes/);
});
test('Deep Green and Slow Shutter are optical treatments, not alternate characters or locations',()=>{
  const prompts=[];
  for(const variant of ['original','deep-green','slow-shutter']){
    const r=prepareMoodPrompt('Original portrait.','hong-kong-nights',60,{referenceCount:1,moodVariant:variant});
    assert.equal(r.error,'');
    assert.equal(r.metadata.moodVariant,variant);
    assert.ok(r.prompt.startsWith('Original portrait.\n\n'));
    assert.match(r.prompt,/EDIT IMAGE 1/);
    assert.match(r.prompt,/not a new scene/);
    if(variant!=='original')assert.ok(r.prompt.includes(HONG_KONG_VARIANTS[variant].direction));
    const settings={type:'image',mode:'image',engine:'seedream',referenceMode:'base',
      referenceRoles:[{name:'portrait.png',role:'base'}],prompt:r.prompt,...r.metadata};
    const plan=moodReferencePlan(settings);
    assert.deepEqual(plan.references,[]);
    assert.deepEqual(plan.settings.referenceRoles.map(x=>x.role),['base']);
    prompts.push(r.prompt);
  }
  assert.equal(new Set(prompts).size,3);
  assert.match(prompts[1],/ONLY in the existing background shadows/);
  assert.match(prompts[2],/If there are no moving practical lights/);
});
test('the Film Finish stays opt-in and cannot change the paid image edit prompt',()=>{
  for(const engine of ['seedream','gemini'])for(const intensity of [20,60,100]){
    const opt=prepareMoodPrompt('Original woman in room','hong-kong-nights',intensity,
      {engine,referenceCount:1,filmFinish:{version:2,grain:70,haze:60,halation:55,film:80}});
    const disabled=prepareMoodPrompt('Original woman in room','hong-kong-nights',intensity,
      {engine,referenceCount:1,filmFinish:null});
    const clean=prepareMoodPrompt('Original woman in room','hong-kong-nights',intensity,
      {engine,referenceCount:1});
    assert.equal(opt.prompt,disabled.prompt);
    assert.equal(disabled.prompt,clean.prompt);
    assert.equal(disabled.metadata.filmFinish,undefined);
    assert.deepEqual(clean.metadata.filmFinish,{version:2,grain:0,haze:0,halation:0,film:0});
    assert.equal(opt.metadata.filmFinish.film,80);
  }
});
test('the final provider prompt respects assigned user photos and the 5K prompt budget',()=>{
  for(const engine of ['seedream','gemini'])
  for(const count of [0,1,3,6,7]){
    const user='Keep original face, coat, real street and camera.';
    const r=prepareMoodPrompt(user,'hong-kong-nights',60,{engine,referenceCount:count});
    const roles=Array.from({length:count},(_,i)=>({name:'photo-'+i+'.png',role:i?'identity':'base',note:''}));
    const settings={type:'image',mode:'image',engine,referenceMode:'base',aspectRatio:'auto',
      prompt:r.prompt,...r.metadata,referenceRoles:roles};
    const plan=moodReferencePlan(settings);
    const compiled=compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings);
    assert.ok(compiled.includes(user));
    assert.equal(plan.references.length,0);
    assert.equal(plan.settings.prompt,r.prompt);
    assert.equal(plan.settings.referenceRoles.length,count);
    assert.ok(compiled.length<=5000,engine+'/'+count+' '+compiled.length);
  }
});
test('changing the look after completion hides a stale output instead of presenting it as Deep Green',()=>{
  const explore=readFileSync(new URL('../lab/explore-moods.js',import.meta.url),'utf8');
  assert.match(explore,/if\(!result\.hidden\)clearResult\(\);\s*moodVariant=choice;renderVariation\(\);schedulePrice\(0\);/);
  assert.match(explore,/resultURL=null;resultBlob=null;resultOutputId=null/);
});

test('three anchor photographs share one coherent source-preserving reference-led treatment',()=>{
  const anchors=[
    {name:'exterior fashion portrait',prompt:'Keep this woman in the same courtyard wearing her leather jacket.'},
    {name:'intimate bedroom',prompt:'Keep every object, bed and lamp in this lived-in interior.'},
    {name:'city street transit',prompt:'Keep the exact tram street and figures from the Base.'}
  ];
  for(const anchor of anchors)for(const engine of ['seedream','seedreamlite']){
    const result=prepareMoodPrompt(anchor.prompt,'hong-kong-nights',100,
      {engine,referenceCount:1,referenceMode:'base',moodVariant:'original'});
    assert.equal(result.error,'',anchor.name+' '+engine+': '+result.error);
    assert.ok(result.prompt.startsWith(anchor.prompt+'\n\n'));
    assert.match(result.prompt,/EDIT IMAGE 1, not a new scene/);
    assert.match(result.prompt,/emerald|green/i);
    assert.match(result.prompt,/existing|same/i);
    assert.match(result.prompt,/no new objects|no new scene|not a new scene|preserve/i);
    assert.deepEqual(result.metadata.filmFinish,{version:2,grain:0,haze:0,halation:0,film:0});
    const labels=[{role:'base',name:anchor.name+'.jpg',note:''}];
    const plan=moodReferencePlan({type:'image',mode:'image',engine,referenceMode:'base',
      prompt:result.prompt,...result.metadata,referenceRoles:labels});
    assert.deepEqual(plan.references,[],"Do not import external scene photographs into the user's Base");
    const compiled=compileImagePrompt(plan.settings.prompt,labels,plan.settings);
    assert.ok(compiled.length<=(engine==='seedreamlite'?3000:5000),
      anchor.name+' '+engine+' '+compiled.length);
  }
});
