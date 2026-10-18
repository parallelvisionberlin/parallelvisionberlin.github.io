import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HONG_KONG_VARIATIONS,hongKongFinishPreset,normalizeHongKongVariation,HONG_KONG_REFERENCE_FILES} from '../lab/hong-kong-presets.js';
import {prepareMoodPrompt,imageHistoryCaption} from '../lab/moods.js';
import {moodReferencePlan,isMoodStyleReference} from '../lab/mood-references.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';

test('Hong Kong Nights remains a single mood with three stable, keyboard-selectable treatments',()=>{
  assert.deepEqual(HONG_KONG_VARIATIONS.map(x=>x.id),['original','deep-green','slow-shutter']);
  assert.equal(normalizeHongKongVariation('untrusted'),'original');
  const js=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../lab/film-finish.css',import.meta.url),'utf8');
  assert.match(js,/option\.setAttribute\('aria-pressed'/);
  assert.match(js,/treatmentPanel\.setAttribute\('role','group'\)/);
  assert.match(js,/finishControls\.set\(hongKongFinishPreset\(choice\.id\)\)/);
  assert.match(js,/variation=normalizeHongKongVariation\(settings\?\.moodVariation\)/);
  assert.match(css,/\.moods-controls\.has-hk-variation/);
});

test('selected treatments change optical instructions and 35mm finish while preserving user subject',()=>{
  const subject='The same woman reading in her original bedroom at night.';
  const prompts=[];
  for(const option of HONG_KONG_VARIATIONS){
    const recipe=prepareMoodPrompt(subject,'hong-kong-nights',85,{
      engine:'seedream',referenceCount:1,moodVariation:option.id,filmFinish:hongKongFinishPreset(option.id)
    });
    assert.equal(recipe.error,'',option.label);
    assert.ok(recipe.prompt.startsWith(subject+'\n\n'));
    assert.match(recipe.prompt,/IDENTITY FIRST/);
    assert.match(recipe.prompt,/existing lamps, windows and specular reflections/);
    assert.match(recipe.prompt,/Style references/);
    assert.equal(recipe.metadata.moodId,'hong-kong-nights');
    assert.equal(recipe.metadata.filmFinish.grain,hongKongFinishPreset(option.id).grain);
    assert.equal(recipe.metadata.moodVariation,option.id==='original'?undefined:option.id);
    prompts.push(recipe.prompt);
  }
  assert.equal(new Set(prompts).size,3);
  assert.match(prompts[1],/fluorescent emerald contamination/);
  assert.match(prompts[2],/1\/8-1\/15-second shutter drag/);
  assert.equal(hongKongFinishPreset('original').grain,58);
  assert.ok(hongKongFinishPreset('deep-green').grain>hongKongFinishPreset('original').grain);
  assert.equal(imageHistoryCaption({moodId:'hong-kong-nights',moodVariation:'deep-green',moodIntensity:85,moodOriginalPrompt:subject}),'Hong Kong Nights · Deep Green · 85% · '+subject);
});

test('all treatments select exactly four existing, valid style photos without stealing identity',()=>{
  for(const option of HONG_KONG_VARIATIONS){
    const recipe=prepareMoodPrompt('Keep the same portrait and scene','hong-kong-nights',75,{engine:'seedream',referenceCount:1,moodVariation:option.id});
    const settings={type:'image',mode:'image',engine:'seedream',aspectRatio:'auto',referenceRoles:[{role:'base',name:'portrait.jpg'}],prompt:recipe.prompt,...recipe.metadata};
    const plan=moodReferencePlan(settings);
    assert.equal(plan.references.length,4);
    assert.deepEqual(plan.references.map(r=>r.file),HONG_KONG_REFERENCE_FILES[option.id]);
    assert.deepEqual(plan.settings.referenceRoles.map(x=>x.role),['base','style','style','style','style']);
    assert.equal(plan.settings.referenceRoles.filter(x=>!isMoodStyleReference(x)).length,1);
    assert.ok(compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings).length<=5000);
    for(const ref of plan.references)assert.ok(readFileSync(new URL('..'+ref.url,import.meta.url)).length>1000);
    assert.equal(moodReferencePlan(plan.settings).references.length,0);
  }
});
test('Lite prompt budget and input reference limits fail explicitly, without hidden trimming',()=>{
  for(const option of HONG_KONG_VARIATIONS){
    const recipe=prepareMoodPrompt('Portrait','hong-kong-nights',85,{engine:'seedreamlite',referenceCount:1,moodVariation:option.id});
    assert.equal(recipe.error,'',option.label);
    const settings={type:'image',mode:'image',engine:'seedreamlite',aspectRatio:'auto',referenceRoles:[{role:'base',name:'portrait.jpg'}],prompt:recipe.prompt,...recipe.metadata};
    const plan=moodReferencePlan(settings);
    assert.ok(compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings).length<=3000);
    assert.throws(()=>moodReferencePlan({...settings,referenceRoles:Array.from({length:7},(_,i)=>({role:'base',name:'p'+i}))}),/six/);
  }
});
