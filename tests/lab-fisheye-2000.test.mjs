import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {MOODS,moodById,prepareMoodPrompt,userFacingImagePrompt,imageHistoryCaption} from '../lab/moods.js';
import {moodReferencePlan,createMoodReferenceLoader,isMoodStyleReference} from '../lab/mood-references.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';

const id='fisheye-2000';
function recipe(engine='seedream',count=1,mode='base',intensity=75,user='A candid fashion portrait.'){
  const r=prepareMoodPrompt(user,id,intensity,{engine,referenceCount:count,referenceMode:mode});
  const settings={type:'image',mode:'image',engine,aspectRatio:'auto',referenceMode:mode,
    prompt:r.prompt,...r.metadata,
    referenceRoles:Array.from({length:count},(_,i)=>({name:'user-photo-'+i+'.png',role:mode==='base'&&!i?'base':'identity',note:''}))};
  return {r,settings};
}
test('Fisheye 2000 is the seventeenth curated Mood with only the owner-supplied photos',()=>{
  const mood=moodById(id);
  assert.ok(mood);
  assert.equal(MOODS.length,17);
  assert.equal(MOODS.filter(m=>m.id===id).length,1);
  assert.equal(mood.category,'Fashion');
  assert.equal(mood.defaultIntensity,75);
  assert.match(mood.direction,/Canon EOS 5D Mark IV/);
  assert.match(mood.direction,/15mm fisheye/);
  assert.match(mood.direction,/grey hoodie/);
  assert.match(mood.direction,/stacked rings/);
  assert.match(mood.direction,/power lines/);
  assert.match(mood.direction,/Kodak Portra/);
  assert.match(mood.baseDirection,/USER PHOTO FIRST/);
  assert.match(mood.avoid,/AI-plastic skin/);
  for(const path of [mood.preview,mood.previewFull,
    '/lab/mood-references/fisheye-2000/01-analog-daylight.webp',
    '/lab/mood-references/fisheye-2000/02-fisheye-flash.webp',
    '/lab/mood-previews/mobile/v1/fisheye-2000.jpg',
    '/lab/mood-previews/mobile/v1/fisheye-2000-detail.jpg']){
    assert.ok(path.startsWith('/lab/'));
    assert.ok(statSync(new URL('..'+path,import.meta.url)).size>5000,path);
  }
  const html=readFileSync(new URL('../lab/moods.html',import.meta.url),'utf8');
  assert.equal((html.match(/data-mood-id="fisheye-2000"/g)||[]).length,1);
  assert.match(html,/All 17 curated visual Moods/);
  const backend=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  const boards=readFileSync(new URL('../lab-worker/moodboards.mjs',import.meta.url),'utf8');
  assert.match(backend,/IMAGE_MOOD_IDS=new Set\([^\n]+fisheye-2000/);
  assert.match(boards,/MOODBOARD_BUILTINS=new Set\([^\n]+fisheye-2000/);
});
test('Full hidden provider prompt keeps user direction but History never reveals the Mood recipe',()=>{
  for(const engine of ['seedream','seedreamlite','gemini','gemini21','qwen3','zspicy']){
    const user='Keep the same person. Original city location.';
    const {r,settings}=recipe(engine,1,'base',75,user);
    assert.equal(r.error,'',engine+': '+r.error);
    assert.equal(r.metadata.moodOriginalPrompt,user);
    assert.equal(r.metadata.moodId,id);
    assert.match(r.prompt,/PV LAB MOOD \/ Fisheye 2000:/);
    const plan=moodReferencePlan(settings);
    const compiled=compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings);
    assert.ok(compiled.includes(user));
    assert.equal(userFacingImagePrompt({...plan.settings}),user);
    assert.ok(imageHistoryCaption({...plan.settings}).includes(user));
    assert.doesNotMatch(imageHistoryCaption({...plan.settings}),/flash sync|Style optics|reference map|PV LAB MOOD/i);
  }
});
test('Two fixed Style photographs never replace faces, subject count, outfits or source location',()=>{
  for(const engine of ['seedream','seedreamlite','gemini','gemini21']){
    for(const mode of ['base','references']){
      for(const count of [0,1,3,6]){
        for(const intensity of [10,75,100]){
          const {r,settings}=recipe(engine,count,mode,intensity);
          assert.equal(r.error,'');
          const plan=moodReferencePlan(settings);
          assert.equal(plan.references.length,2);
          assert.equal(plan.settings.referenceRoles.length,count+2);
          const styles=plan.settings.referenceRoles.slice(count);
          assert.deepEqual(styles.map(s=>s.role),['style','style']);
          for(const label of styles){
            assert.ok(isMoodStyleReference(label));
            assert.match(label.note,/OPTICS ONLY/);
          }
          const compiled=compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings);
          assert.ok(compiled.length<=(engine==='seedreamlite'?3000:5000),
            engine+' '+mode+' '+count+' '+intensity+' '+compiled.length);
          assert.equal(plan.settings.prompt,r.prompt,'Never truncate authored text or fixed recipe');
          assert.equal(moodReferencePlan(plan.settings).references.length,0,'No duplicate hidden uploads on quote refresh');
          assert.match(compiled,/15mm fisheye/);
          if(count&&mode==='base'){
            assert.match(compiled,/USER PHOTO FIRST|BASE LOCK/);
            assert.match(compiled,/original place|original street\/interior\/room|scene/i);
          }
          for(const ref of plan.references)
            assert.ok(statSync(new URL('..'+ref.url,import.meta.url)).size>10000);
        }
      }
    }
  }
});
test('Reference cap and prompt budget reject before any style-photo upload, without shortening text',async()=>{
  const {settings}=recipe('seedream',9,'base');
  assert.throws(()=>moodReferencePlan(settings),/8 of your own images/);
  let touched=0;
  const loader=createMoodReferenceLoader({
    fetchFile:async()=>{touched++;throw Error('unexpected download');},
    upload:async()=>{touched++;throw Error('unexpected upload');}
  });
  const {settings:overflow,r}=recipe('seedreamlite',1,'base',75,'Do exactly what I requested. '.repeat(110));
  assert.ok(r.error||overflow.prompt.length>3000);
  await assert.rejects(loader.prepare(overflow,{sessionKey:'user-a'}),/exceed 3,000 characters/);
  assert.equal(touched,0);
  assert.equal(overflow.moodOriginalPrompt,'Do exactly what I requested. '.repeat(110).trim());
});
test('Other Moods remain unchanged: Hong Kong has zero injected photos and Dream Blur has four',()=>{
  const common={type:'image',mode:'image',engine:'seedream',referenceMode:'base',aspectRatio:'auto',
    referenceRoles:[{name:'base',role:'base',note:''}]};
  for(const [moodId,expected] of [['hong-kong-nights',0],['dream-blur',4],['night-flash',0]]){
    const recipe=prepareMoodPrompt('My photo.',moodId,60,{engine:'seedream',referenceCount:1});
    const planned=moodReferencePlan({...common,...recipe.metadata,prompt:recipe.prompt});
    assert.equal(planned.references.length,expected,moodId);
  }
  const unsupported=recipe('qwen3',1,'base');
  assert.equal(moodReferencePlan(unsupported.settings).references.length,0);
});

