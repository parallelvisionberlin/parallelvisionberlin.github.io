import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as moods from '../lab/moods.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';
import {moodReferencePlan} from '../lab/mood-references.js';
const digest=x=>createHash('sha256').update(x).digest('hex');
const lock={
  "lower": "b44d4352a36a0ce414f6ec3dcd3df5a7187087b23aad18dbd257a9065124b345",
  "other": "3e7165368b237a4d33e73b0a2826a56aac77f48e84d2d10e4bf1c3e32e8c5196",
  "files": {
    "lab/film-finish.js": "181706b818d8a2836d23e2a213122c18fb1e1a96eaac1ce305cd78075f7b15b2",
    "lab-worker/film-finish.mjs": "f5a262fcab65217e953f6e463fee552d27af794e11c3e2fb05724874fc48fcd9",
    "lab-worker/film-engine-v3.mjs": "789de73c9e24e4b1c0c1bc384575c90ab2460a843165b4d0c716368bb65ecd6a",
    "lab/mood-references.js": "733447cbb3c3bd99e018896467d334bf87685cbb9ee43f55b2d1e5687396b4be",
    "lab/hong-kong-variants.js": "f26d51fd75607d6c65b68cf02f492eaa27432b65c581508d230ba02866e610ff",
    "lab-worker/worker.mjs": "f5ea44cc2d66227edfc6535885e6e8c05cd995b5be3e25d830a3cd00c554263f"
  }
};
function lower(mod){const rows=[];for(const engine of mod.MOOD_MODELS)for(const referenceMode of ['base','references'])for(const n of [0,1])for(const intensity of [1,34,60,70,90])rows.push(mod.prepareMoodPrompt('Preserve the person, wardrobe, camera and room.','hong-kong-nights',intensity,{engine,referenceMode,referenceCount:n}));return digest(JSON.stringify(rows));}
function other(mod){const rows=[];for(const m of mod.MOODS.filter(m=>m.id!=='hong-kong-nights'))for(const engine of mod.MOOD_MODELS)for(const intensity of [34,60,90,100])rows.push(mod.prepareMoodPrompt('Preserve the original photograph.',m.id,intensity,{engine,referenceCount:1}));return digest(JSON.stringify(rows));}
test('Image 3: existing 1-90% Hong Kong recipes stay exact across every model and input mode',()=>assert.equal(lower(moods),lock.lower));
test('Image 3: atmosphere activates only above 90 on canonical Hong Kong',()=>{
    for(const engine of moods.MOOD_MODELS){
      for(const intensity of [1,34,60,90])assert.doesNotMatch(moods.prepareMoodPrompt('Portrait','hong-kong-nights',intensity,{engine,referenceCount:1}).prompt,/subtle veiling flare/);
      for(const intensity of [91,95,100])assert.match(moods.prepareMoodPrompt('Portrait','hong-kong-nights',intensity,{engine,referenceCount:1}).prompt,/subtle veiling flare/);
      for(const moodVariant of ['deep-green','slow-shutter'])assert.doesNotMatch(moods.prepareMoodPrompt('Portrait','hong-kong-nights',100,{engine,referenceCount:1,moodVariant}).prompt,/Increase atmospheric diffusion slightly/);
    }
  });
test('Image 3: approved finish and original reference routing remain intact',async()=>{
    const finish=await import('../lab/film-finish.js');
    assert.equal(finish.FILM_FINISH_RENDER_REVISION,8);
    for(const intensity of [90,95,100]){
      const result=moods.prepareMoodPrompt('Preserve this room.','hong-kong-nights',intensity,{engine:'seedream',referenceCount:1});
      const settings={type:'image',mode:'image',engine:'seedream',referenceMode:'base',referenceRoles:[{role:'base',name:'room.png',note:''}],prompt:result.prompt,...result.metadata};
      assert.deepEqual(moodReferencePlan(settings).references,[]);
      assert.deepEqual(result.metadata.filmFinish,{version:2,grain:0,haze:0,halation:0,film:0});
    }
  });
test('Image 3: portrait, interior and street high atmosphere stay within provider budgets',()=>{
 const anchors=['Portrait: keep the same person, face, pose, clothing and camera.','Interior: preserve the same room, furniture, dry floor and light sources.','Street: preserve the same architecture, perspective, subject and framing.'];
 for(const engine of moods.MOOD_MODELS)for(const anchor of anchors)for(const intensity of [90,95,100]){
  const r=moods.prepareMoodPrompt(anchor,'hong-kong-nights',intensity,{engine,referenceCount:1});
  assert.equal(r.error,'',engine+' '+intensity);assert.ok(r.prompt.startsWith(anchor+'\n\n'));
  const roles=[{role:'base',name:'approved-base.png',note:''}];
  const settings={type:'image',mode:'image',engine,referenceMode:'base',referenceRoles:roles,prompt:r.prompt,...r.metadata};
  assert.deepEqual(moodReferencePlan(settings).references,[],'Do not silently inject new photographs');
  assert.ok(compileImagePrompt(r.prompt,roles,settings).length<=(engine==='seedreamlite'?3000:5000));
  assert.deepEqual(r.metadata.filmFinish,{version:2,grain:0,haze:0,halation:0,film:0});
  if(intensity>90){for(const cue of ['atmospheric diffusion','suspended humidity','localized halation','veiling flare','uniform green wash'])assert.ok(r.prompt.includes(cue),cue);assert.match(r.prompt,/dry rooms|dry interiors/);}
 }
});
test('Image 3: finishing controls do not silently change the creative request',()=>{
 const a=moods.prepareMoodPrompt('Preserve the portrait.','hong-kong-nights',100,{engine:'seedream',referenceCount:1});
 const b=moods.prepareMoodPrompt('Preserve the portrait.','hong-kong-nights',100,{engine:'seedream',referenceCount:1,filmFinish:{version:2,grain:29,haze:100,halation:100,film:100}});
 assert.equal(a.prompt,b.prompt);assert.equal(b.metadata.filmFinish.grain,29);
});
