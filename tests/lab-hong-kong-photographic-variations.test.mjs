import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {prepareMoodPrompt,imageHistoryCaption} from '../lab/moods.js';
import {moodReferencePlan} from '../lab/mood-references.js';
import {HONG_KONG_VARIANTS,hongKongVariant} from '../lab/hong-kong-variants.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';

const ids=['original','deep-green','slow-shutter'];
test('single curated Hong Kong Mood exposes exactly three stable variations',()=>{
  assert.deepEqual(Object.keys(HONG_KONG_VARIANTS),ids);
  assert.equal(hongKongVariant('bad'),'original');
  assert.equal(imageHistoryCaption({moodId:'hong-kong-nights',moodVariant:'slow-shutter',moodIntensity:85,moodOriginalPrompt:'Portrait'}),'Hong Kong Nights · Slow Shutter · 85% · Portrait');
});
test('all variation references are original-quality photos, not screenshots or AI crops',()=>{
  for(const id of ids){
    const files=HONG_KONG_VARIANTS[id].files;
    assert.equal(files.length,4);
    assert.equal(new Set(files).size,4);
    for(const file of files){
      assert.match(file,/\.(jpg|png|webp)$/i);
      assert.doesNotMatch(file,/\.svg|screen|crop|generated/i);
      const p=new URL('../lab/mood-references/hong-kong-nights/'+file,import.meta.url);
      assert.ok(statSync(p).size>40000,file+' is unexpectedly small');
      const b=readFileSync(p);
      if(file.endsWith('.png'))assert.deepEqual([...b.subarray(0,8)],[137,80,78,71,13,10,26,10]);
      else if(file.endsWith('.webp')){assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');}
      else{assert.equal(b[0],255);assert.equal(b[1],216);}
    }
  }
});
test('every variation follows its own optics but protects the source and prompt budget',()=>{
  const signatures=new Set();
  for(const id of ids)for(const engine of ['seedream','gemini']){
    for(const intensity of [34,70,85,100])for(const count of [0,1,6]){
      const author='Maintain original identity, skin, clothing, pose, camera and location.';
      const recipe=prepareMoodPrompt(author,'hong-kong-nights',intensity,{engine,referenceCount:count,moodVariant:id});
      assert.equal(recipe.error,'',id+' '+engine+' '+intensity+' '+count+': '+recipe.error);
      assert.equal(recipe.metadata.moodVariant,id);
      assert.ok(recipe.prompt.startsWith(author));
      assert.match(recipe.prompt,/Honor the requested subject and composition|EDIT IMAGE 1, the existing photograph/);
      assert.doesNotMatch(recipe.prompt,/Relight whole Base|reconstruct cinematic scene lighting/);
      assert.ok(recipe.prompt.includes(HONG_KONG_VARIANTS[id].direction));
      const labels=Array.from({length:count},(_,i)=>({name:'customer-'+i+'.jpg',role:i?'identity':'base',note:''}));
      const settings={type:'image',mode:'image',engine,prompt:recipe.prompt,...recipe.metadata,aspectRatio:'auto',referenceRoles:labels};
      const plan=moodReferencePlan(settings);
      assert.deepEqual(plan.references,[],'Hong Kong source photos are look previews, not provider input');
      assert.equal(plan.settings.referenceRoles.length,count);
      assert.deepEqual(plan.settings.referenceRoles,labels,'user reference identity and order remain unchanged');
      const compiled=compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings);
      assert.ok(compiled.length<=5000,id+' '+engine+' '+intensity+' '+count+' length '+compiled.length);
      if(engine==='seedream'&&intensity===85&&count===1)signatures.add(recipe.prompt);
    }
  }
  assert.equal(signatures.size,3,'Each variation needs a different real creative direction');
});
test('old Hong Kong photos remain readable in reused History without adding extra Style shots',()=>{
  const original=prepareMoodPrompt('Original portrait','hong-kong-nights',85,{referenceCount:1});
  const settings={type:'image',mode:'image',engine:'seedream',prompt:original.prompt,...original.metadata,referenceRoles:[
    {role:'base',name:'photo.jpg'},
    {role:'style',name:'Hong Kong Nights style - 02-city-haze.jpg'}
  ]};
  const plan=moodReferencePlan(settings);
  assert.equal(plan.references.length,0);
  assert.equal(plan.settings.referenceRoles.length,2);
});
test('three variation pills live only inside the existing Mood overlay, not the main deck',()=>{
  const mood=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../lab/hong-kong-variations.css',import.meta.url),'utf8');
  const app=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(mood,/hk-variation-bar/);
  assert.match(mood,/variationBar\.hidden=finishPanel\.hidden/);
  assert.match(css,/\.moods-controls\.has-film-finish>\.hk-variation-bar/);
  assert.match(app,/hong-kong-variations\.css/);
});
