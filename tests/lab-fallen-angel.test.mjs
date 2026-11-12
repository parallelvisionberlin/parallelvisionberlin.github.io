import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOODS,moodById,moodPreviewURL,prepareMoodPrompt} from '../lab/moods.js';
import {moodReferencePlan,isMoodStyleReference} from '../lab/mood-references.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';

const base={name:'my-photo.jpg',role:'base',note:''};
const settingsFor=(engine='seedream',roles=[base])=>{
  const recipe=prepareMoodPrompt('Keep the subject recognizable.','fallen-angel',85,{
    engine,referenceCount:roles.length,referenceMode:'base'
  });
  assert.equal(recipe.error,'',engine);
  return {type:'image',mode:'image',engine,referenceMode:'base',prompt:recipe.prompt,
    ...recipe.metadata,referenceRoles:roles,aspectRatio:'auto'};
};

test('Fallen Angel is a curated Mood with the approved cinematic cover and mobile fallback',()=>{
  const m=moodById('fallen-angel');
  assert.ok(m);
  assert.equal(m.category,'Cinema');
  assert.equal(m.defaultIntensity,85);
  assert.equal(m.mobilePreview,false);
  assert.ok(m.preview.includes('b259ac39-d73c-4853-b591-f82809e699ea'));
  assert.equal(moodPreviewURL(m),m.preview);
  assert.equal(MOODS.filter(x=>x.id==='fallen-angel').length,1);
  const html=readFileSync(new URL('../lab/moods.html',import.meta.url),'utf8');
  assert.match(html,/data-mood-id="fallen-angel"/);
  assert.match(html,/All 18 curated visual Moods/);
  assert.match(html,/Colossal wings\. A world on fire\./);
});

test('user photo controls identity while scene and clothing intentionally transform',()=>{
  for(const engine of ['seedream','seedreamlite','gemini','gemini21','qwen3','krea3']){
    const recipe=prepareMoodPrompt('Keep the subject recognizable.','fallen-angel',85,{
      engine,referenceCount:1,referenceMode:'base'
    });
    assert.equal(recipe.error,'',engine);
    assert.match(recipe.prompt,/REFERENCE 1 IS THE REAL PERSON/);
    assert.match(recipe.prompt,/rooftop/i);
    assert.match(recipe.prompt,/wings/i);
    assert.match(recipe.prompt,/original hair|hair color/i);
    assert.doesNotMatch(recipe.prompt,/preserve original background/i);
    assert.equal(recipe.metadata.moodOriginalPrompt,'Keep the subject recognizable.');
  }
});

test('automatic reference plan adds two internal scene and feather sources after customer Base',()=>{
  for(const engine of ['seedream','seedreamlite','gemini','gemini21','qwen3','krea3']){
    const settings=settingsFor(engine);
    const original=structuredClone(settings);
    const plan=moodReferencePlan(settings);
    assert.deepEqual(settings,original);
    assert.equal(plan.references.length,2);
    assert.deepEqual(plan.settings.referenceRoles.map(x=>x.role),['base','style','style']);
    for(const ref of plan.references){
      assert.ok(isMoodStyleReference(ref.label));
      assert.ok(ref.url.startsWith('https://'));
      assert.doesNotMatch(ref.label.note,/copy her face/i);
    }
    const compiled=compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings);
    assert.match(compiled,/SCENE AND LIGHT ONLY/);
    assert.match(compiled,/WINGS ONLY/);
    assert.match(compiled,/not the customer|NOT the red-haired/i);
    assert.ok(compiled.length<=(engine==='seedreamlite'?3000:5000),'prompt budget '+engine);
  }
});

test('duplicate curated references are not reattached; low-limit model rejects extra inputs',()=>{
  const first=moodReferencePlan(settingsFor());
  const again=moodReferencePlan(settingsFor('seedream',first.settings.referenceRoles));
  assert.equal(again.references.length,0);
  assert.throws(()=>moodReferencePlan(settingsFor('qwen3',[base,
    {name:'extra.jpg',role:'identity',note:''}])),/Fallen Angel includes 2 curated references/);
  assert.equal(moodReferencePlan(settingsFor('zspicy')).references.length,0);
});

test('Worker accepts the new Mood id; internal references remain filtered',()=>{
  const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  assert.match(worker,/IMAGE_MOOD_IDS=new Set\(\[[^\]]*'fallen-angel'/);
  const internal=readFileSync(new URL('../lab/image-detail-references.js',import.meta.url),'utf8');
  assert.match(internal,/isMoodStyleReference/);
});
