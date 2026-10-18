// Diagnostic only: this does not submit AI jobs or change production defaults.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareMoodPrompt} from '../lab/moods.js';
import {moodReferencePlan,createMoodReferenceLoader} from '../lab/mood-references.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';

const recipe=prepareMoodPrompt('Keep the same person and scene.','hong-kong-nights',85,{referenceCount:1,moodVariant:'original'});
const base={type:'image',mode:'image',engine:'seedream',referenceMode:'base',aspectRatio:'auto',
  prompt:recipe.prompt,...recipe.metadata,referenceRoles:[{name:'my-photo.jpg',role:'base',note:''}]};

test('ordinary production Hong Kong Base continues receiving its four Style photographs',()=>{
  const plan=moodReferencePlan(base);
  assert.equal(plan.references.length,4);
  assert.deepEqual(plan.settings.referenceRoles.map(r=>r.role),['base','style','style','style','style']);
});
test('URL-opt-in Hong Kong diagnostic isolates the original Base and retains its full photographic prompt',()=>{
  const original=moodReferencePlan(base);
  const plan=moodReferencePlan({...base,hkBaseFidelityPilot:true});
  assert.equal(plan.references.length,0);
  assert.deepEqual(plan.settings.referenceRoles.map(r=>r.role),['base']);
  assert.equal(plan.settings.referenceRoles[0].name,'my-photo.jpg');
  assert.equal(plan.settings.prompt,original.settings.prompt);
  assert.deepEqual(plan.settings.filmFinish,original.settings.filmFinish);
  assert.equal(plan.settings.moodVariant,'original');
  assert.equal(plan.settings.aspectRatio,'auto');
  assert.match(compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings),/IDENTITY FIRST/);
  assert.ok(compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings).length<=5000);
});
test('References-only and no-Base do not silently drop curated Hong Kong Style images',()=>{
  assert.equal(moodReferencePlan({...base,hkBaseFidelityPilot:true,referenceMode:'references',
    referenceRoles:[{name:'identity.jpg',role:'identity'}]}).references.length,4);
  assert.equal(moodReferencePlan({...base,hkBaseFidelityPilot:true,referenceMode:'references'}).references.length,4);
  assert.equal(moodReferencePlan({...base,hkBaseFidelityPilot:true,referenceRoles:[]}).references.length,4);
});
test('saved historical Style references remain on reuse without duplication',()=>{
  const historic={...base,hkBaseFidelityPilot:true,referenceRoles:[
    ...base.referenceRoles,{name:'Hong Kong Nights style - 02-city-haze.jpg',role:'style'}]};
  const plan=moodReferencePlan(historic);
  assert.equal(plan.references.length,0);
  assert.equal(plan.settings.referenceRoles.length,2);
});
test('other Moods cannot enable the Base-only pilot accidentally',()=>{
  for(const moodId of ['dream-blur','night-flash','dreamcore']){
    const current=moodReferencePlan({...base,hkBaseFidelityPilot:true,moodId});
    const standard=moodReferencePlan({...base,moodId});
    assert.deepEqual(current.references.map(r=>r.file),standard.references.map(r=>r.file));
  }
});
test('Base-only pilot does not fetch or upload any automatic photos',async()=>{
  let calls=0;
  const loader=createMoodReferenceLoader({
    fetchFile:async()=>{calls++;throw Error('No fetch expected');},
    upload:async()=>{calls++;throw Error('No upload expected');}
  });
  const plan=await loader.prepare({...base,hkBaseFidelityPilot:true},{sessionKey:'test-session'});
  assert.equal(plan.references.length,0);
  assert.equal(calls,0);
});
test('Studio exposes pilot only by explicit URL request and supplies it in both preview and bound quote',()=>{
  const studio=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(studio,/get\('hkBaseFidelity'\)==='1'/);
  assert.equal((studio.match(/hkBaseFidelityPilot&&mood\.metadata\?\.moodId==='hong-kong-nights'/g)||[]).length,2);
});
