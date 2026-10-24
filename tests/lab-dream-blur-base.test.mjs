import test from 'node:test';
import assert from 'node:assert/strict';
import {moodById,prepareMoodPrompt} from '../lab/moods.js';
import {prepareDreamBlurBasePrompt} from '../lab/dream-blur-base.js';
import {moodReferencePlan,createMoodReferenceLoader} from '../lab/mood-references.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';

const marker='MAXIMUM BASE EXPOSURE';
const engines=['seedream','seedreamlite','gemini','gemini21'];
const base={name:'original-cafe.jpg',role:'base',note:'Keep this person and the same cafe.'};
function recipeSettings(engine='seedream',intensity=100,input='',extra=[]){
  const roles=[base,...extra];
  const recipe=prepareMoodPrompt(input,'dream-blur',intensity,{engine,referenceCount:roles.length,referenceMode:'base'});
  assert.equal(recipe.error,'');
  return {type:'image',mode:'image',engine,referenceMode:'base',aspectRatio:'auto',resolution:'2k',
    prompt:recipe.prompt,...recipe.metadata,referenceRoles:roles};
}

test('maximum Base exposure changes atmosphere while retaining identity, anatomy and the actual place',()=>{
  for(const engine of engines){
    const recipe=prepareMoodPrompt('','dream-blur',100,{engine,referenceCount:1,referenceMode:'base'});
    assert.equal(recipe.error,'');
    assert.ok(recipe.prompt.includes(marker));
    for(const expression of [/IDENTITY FIRST/,/same people/,/face|facial identity/,/anatomy/,/pose/,/wardrobe|outfit/,/skin coverage/,/place/,/camera/,/crop/,/DO NOT zoom into a headshot/,/35mm/,/Style photographs/])
      assert.match(recipe.prompt,expression,engine+' '+expression);
    assert.match(recipe.prompt,/subject AND/);
    assert.match(recipe.prompt,/not just add blue streaks|not a sharp unchanged photograph/);
    assert.match(recipe.prompt,/radial/);
    assert.match(recipe.prompt,/recognizable/);
    assert.deepEqual(recipe.metadata,{moodId:'dream-blur',moodIntensity:100,moodOriginalPrompt:''});
  }
});

test('text-only, References Only, lower strengths and all other Moods do not enter the new route',()=>{
  for(const engine of engines){
    for(const amount of [1,25,34,35,60,69,70,78,80,89,90,99]){
      const recipe=prepareMoodPrompt('Keep the original scene.','dream-blur',amount,{engine,referenceCount:1});
      assert.ok(!recipe.prompt.includes(marker));
      assert.equal(recipe.metadata.moodIntensity,amount);
    }
    for(const [referenceCount,referenceMode] of [[0,'base'],[0,'references'],[1,'references'],[4,'references']]){
      const recipe=prepareMoodPrompt('An original night photograph.','dream-blur',100,{engine,referenceCount,referenceMode});
      assert.ok(!recipe.prompt.includes(marker));
      assert.equal(recipe.metadata.moodIntensity,100);
    }
    for(const moodId of ['hong-kong-nights','midnight-reverie','fisheye-2000','dreamcore','synthetic-romance']){
      const recipe=prepareMoodPrompt('Keep the same person.',moodId,100,{engine,referenceCount:1});
      assert.ok(!recipe.prompt.includes(marker),moodId);
    }
  }
  assert.equal(moodById('dream-blur').defaultIntensity,80);
});

test('a written direction and the photo-only fallback are preserved, never silently rewritten',()=>{
  for(const input of ['Keep her face and the cafe; no extra people.',
    'Create a natural photographic variation of the base image, preserving its subject and overall composition.']){
    for(const engine of engines){
      const recipe=prepareMoodPrompt(input,'dream-blur',100,{engine,referenceCount:1});
      assert.equal(recipe.metadata.moodOriginalPrompt,input);
      assert.ok(recipe.prompt.startsWith(input+'\n\n'));
      assert.equal(recipe.prompt,prepareDreamBlurBasePrompt(input,{engine}));
    }
  }
});

test('the same four optical photos and their exact notes are used at 80 and 100; no input mutation',()=>{
  for(const engine of engines){
    const high=recipeSettings(engine),original=structuredClone(high);
    const highPlan=moodReferencePlan(high),lowPlan=moodReferencePlan(recipeSettings(engine,80));
    assert.deepEqual(high,original);
    assert.deepEqual(highPlan.references,lowPlan.references);
    assert.equal(highPlan.references.length,4);
    assert.deepEqual(highPlan.references.map(ref=>ref.file),[
      '01-blue-eye-light-memory.jpg','02-silhouette-blue-room.jpg',
      '03-city-light-trails.jpg','04-abstract-cyan-exposure.jpg'
    ]);
    assert.deepEqual(highPlan.settings.referenceRoles,lowPlan.settings.referenceRoles);
    assert.equal(highPlan.settings.aspectRatio,'auto');
    assert.equal(highPlan.settings.resolution,'2k');
    assert.equal(moodReferencePlan(highPlan.settings).references.length,0);
    for(const ref of highPlan.references)assert.match(ref.label.note,/OPTICS ONLY/);
  }
});

test('complete provider prompts fit full and Lite budgets with the original Base and optional Identity',()=>{
  for(const engine of engines)
  for(const resolution of ['1k','2k'])
  for(const extra of [[],[{name:'face.jpg',role:'identity',note:'The same person, not another model.'}]]){
    const settings={...recipeSettings(engine,100,'Keep the same original photograph.',extra),resolution};
    const plan=moodReferencePlan(settings);
    const prompt=compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings);
    assert.ok(prompt.includes(marker));
    assert.ok(prompt.length<=(engine==='seedreamlite'?3000:5000),engine+' '+prompt.length);
    assert.ok(prompt.includes(base.note));
    for(const ref of plan.references)assert.ok(prompt.includes(ref.label.note));
    if(extra.length)assert.ok(prompt.includes(extra[0].note));
    assert.equal(plan.settings.moodOriginalPrompt,'Keep the same original photograph.');
  }
});

test('overlong customer direction is rejected intact before reference uploads',async()=>{
  const input='Keep every deliberate detail. '.repeat(220);
  const recipe=prepareMoodPrompt(input,'dream-blur',100,{referenceCount:1});
  assert.ok(recipe.error);
  assert.ok(recipe.prompt.startsWith(input.trim()+'\n\n'));
  assert.equal(recipe.metadata.moodOriginalPrompt,input.trim());
  let uploads=0;
  const loader=createMoodReferenceLoader({upload:async()=>{uploads++;throw Error('Unexpected upload');}});
  await assert.rejects(loader.prepare({type:'image',mode:'image',engine:'seedream',referenceMode:'base',
    prompt:recipe.prompt,...recipe.metadata,referenceRoles:[base]},{sessionKey:'test'}),/exceed 5,000/);
  assert.equal(uploads,0);
});
