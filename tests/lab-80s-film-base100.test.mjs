import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {moodById,prepareMoodPrompt} from '../lab/moods.js';
import {moodReferencePlan,isMoodStyleReference} from '../lab/mood-references.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';
import {moodReferencePlan,isMoodStyleReference} from '../lab/mood-references.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';

const studio=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
const recipe=readFileSync(new URL('../lab/80s-film-recipe.js',import.meta.url),'utf8');

test('80s Film at 100% with Base strongly reinterprets optics but preserves identity and place',()=>{
  const result=prepareMoodPrompt('', '80s-film',100,{engine:'seedream',referenceCount:1,referenceMode:'base'});
  assert.equal(result.error,'');
  assert.equal(result.metadata.moodIntensity,100);
  assert.match(result.prompt,/BASE PHOTO \/ 100% PRIORITY/);
  assert.match(result.prompt,/ENTIRE image/);
  assert.match(result.prompt,/film-to-PAL-tape/);
  assert.match(result.prompt,/face, expression, body, pose, camera, crop/);
  assert.match(result.prompt,/no scene replacement|No invented scene/i);
  assert.ok(result.prompt.length<5000,'Seedream prompt must fit its 5000-char budget');
});

test('100% Base also fits Seedream Lite and leaves explicit user directions intact',()=>{
  const original='Keep the exact black leather jacket and all existing street signs.';
  for(const engine of ['seedream','seedreamlite']){
    const result=prepareMoodPrompt(original,'80s-film',100,{engine,referenceCount:1,referenceMode:'base'});
    assert.equal(result.error,'',engine);
    assert.ok(result.prompt.includes(original),engine);
    assert.ok(result.prompt.includes(engine==='seedream'?'BASE PHOTO / 100% PRIORITY':'100% / EARLY-80S TAPE'),engine);
    assert.ok(result.prompt.length<(engine==='seedreamlite'?3000:5000),engine);
  }
});

test('Lower 80s strengths and references-only do not receive the new Base 100 override',()=>{
  for(const intensity of [1,60,69,70,80,99]){
    const result=prepareMoodPrompt('', '80s-film',intensity,{engine:'seedream',referenceCount:1,referenceMode:'base'});
    assert.equal(result.error,'',String(intensity));
    assert.doesNotMatch(result.prompt,/BASE PHOTO \/ 100% PRIORITY/);
  }
  const refs=prepareMoodPrompt('Portrait in 1982','80s-film',100,{engine:'seedream',referenceCount:1,referenceMode:'references'});
  assert.equal(refs.error,'');
  assert.doesNotMatch(refs.prompt,/BASE PHOTO \/ 100% PRIORITY/);
  const textOnly=prepareMoodPrompt('An empty street','80s-film',100,{engine:'seedream',referenceCount:0,referenceMode:'base'});
  assert.equal(textOnly.error,'');
  assert.doesNotMatch(textOnly.prompt,/BASE PHOTO \/ 100% PRIORITY/);
});

test('Other moods and existing images are not affected by the new 80s Base instruction',()=>{
  for(const id of ['dream-blur','90s-cinema','soft-pastel-film','berlin-rave']){
    const mood=moodById(id);
    const result=prepareMoodPrompt('',id,100,{engine:'seedream',referenceCount:1,referenceMode:'base'});
    assert.equal(result.error,'',id);
    assert.doesNotMatch(result.prompt,/BASE PHOTO \/ 100% PRIORITY/,id);
    assert.ok(mood,id);
  }
});

test('Studio no-prompt Base path does not insert the contradictory natural-variation fallback at 100%',()=>{
  assert.match(studio,/if\(moodUI\.active\(\)\)return moodUI\.selected\(\)==='80s-film'&&moodUI\.intensity\(\)===100\?'':'Create a natural photographic variation/);
  assert.match(recipe,/baseClimax:'BASE PHOTO \/ 100% PRIORITY/);
});

test('100% Base on Seedream Pro adds only the approved analog reference with no identity substitution',()=>{
  const result=prepareMoodPrompt('','80s-film',100,{engine:'seedream',referenceCount:1,referenceMode:'base'});
  const settings={type:'image',mode:'image',engine:'seedream',referenceMode:'base',resolution:'2k',aspectRatio:'16:9',
    prompt:result.prompt,...result.metadata,referenceRoles:[{name:'owner-photo.jpg',role:'base',note:''}]};
  const plan=moodReferencePlan(settings);
  assert.equal(plan.references.length,1);
  const ref=plan.references[0];
  assert.equal(ref.url,'/lab/mood-previews/hd/80s-film-20261011.jpg');
  assert.ok(readFileSync(new URL('..'+ref.url,import.meta.url)).length>1000);
  assert.deepEqual(plan.settings.referenceRoles.map(r=>r.role),['base','style']);
  assert.ok(isMoodStyleReference(ref.label));
  assert.match(ref.label.note,/OPTICS ONLY/);
  assert.match(ref.label.note,/Do NOT borrow its person/);
  assert.equal(plan.settings.aspectRatio,'16:9');
  assert.equal(plan.settings.resolution,'2k');
  const compiled=compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings);
  assert.ok(compiled.length<=5000,'Provider prompt is '+compiled.length+' characters');
  assert.match(compiled,/1981-1984/);
  assert.match(compiled,/The user Base controls subject/);
  assert.deepEqual(moodReferencePlan(plan.settings).references,[],'No double-attaching to saved results');
});

test('80s optical reference does not change lower intensity, text-only or other model behavior',()=>{
  for(const amount of [1,30,60,80,90,99]){
    const recipe=prepareMoodPrompt('','80s-film',amount,{engine:'seedream',referenceCount:1,referenceMode:'base'});
    const settings={type:'image',mode:'image',engine:'seedream',referenceMode:'base',prompt:recipe.prompt,
      ...recipe.metadata,referenceRoles:[{name:'source.jpg',role:'base'}]};
    assert.deepEqual(moodReferencePlan(settings).references,[],String(amount));
  }
  for(const engine of ['seedreamlite','gemini','gemini21','qwen3']){
    const recipe=prepareMoodPrompt('','80s-film',100,{engine,referenceCount:1,referenceMode:'base'});
    const settings={type:'image',mode:'image',engine,referenceMode:'base',prompt:recipe.prompt,
      ...recipe.metadata,referenceRoles:[{name:'source.jpg',role:'base'}]};
    assert.deepEqual(moodReferencePlan(settings).references,[],engine);
  }
  const recipe=prepareMoodPrompt('An empty station','80s-film',100,{engine:'seedream',referenceCount:0});
  assert.deepEqual(moodReferencePlan({type:'image',mode:'image',engine:'seedream',referenceMode:'base',
    prompt:recipe.prompt,...recipe.metadata,referenceRoles:[]}).references,[]);
  const referencesOnly=prepareMoodPrompt('New scene','80s-film',100,{engine:'seedream',referenceCount:1,referenceMode:'references'});
  assert.deepEqual(moodReferencePlan({type:'image',mode:'image',engine:'seedream',referenceMode:'references',
    prompt:referencesOnly.prompt,...referencesOnly.metadata,referenceRoles:[{name:'reference.jpg',role:'identity'}]}).references,[]);
});

test('100% Base on Seedream Pro adds only the approved analog reference with no identity substitution',()=>{
  const result=prepareMoodPrompt('','80s-film',100,{engine:'seedream',referenceCount:1,referenceMode:'base'});
  const settings={type:'image',mode:'image',engine:'seedream',referenceMode:'base',resolution:'2k',aspectRatio:'16:9',
    prompt:result.prompt,...result.metadata,referenceRoles:[{name:'owner-photo.jpg',role:'base',note:''}]};
  const plan=moodReferencePlan(settings);
  assert.equal(plan.references.length,1);
  const ref=plan.references[0];
  assert.equal(ref.url,'/lab/mood-previews/hd/80s-film-20261011.jpg');
  assert.ok(readFileSync(new URL('..'+ref.url,import.meta.url)).length>1000);
  assert.deepEqual(plan.settings.referenceRoles.map(r=>r.role),['base','style']);
  assert.ok(isMoodStyleReference(ref.label));
  assert.match(ref.label.note,/OPTICS ONLY/);
  assert.match(ref.label.note,/Do NOT borrow its person/);
  assert.equal(plan.settings.aspectRatio,'16:9');
  assert.equal(plan.settings.resolution,'2k');
  const compiled=compileImagePrompt(plan.settings.prompt,plan.settings.referenceRoles,plan.settings);
  assert.ok(compiled.length<=5000,'Provider prompt is '+compiled.length+' characters');
  assert.match(compiled,/1981-1984/);
  assert.match(compiled,/The user Base controls subject/);
  assert.deepEqual(moodReferencePlan(plan.settings).references,[],'No double-attaching to saved results');
});

test('80s optical reference does not change lower intensity, text-only or other model behavior',()=>{
  for(const amount of [1,30,60,80,90,99]){
    const recipe=prepareMoodPrompt('','80s-film',amount,{engine:'seedream',referenceCount:1,referenceMode:'base'});
    const settings={type:'image',mode:'image',engine:'seedream',referenceMode:'base',prompt:recipe.prompt,
      ...recipe.metadata,referenceRoles:[{name:'source.jpg',role:'base'}]};
    assert.deepEqual(moodReferencePlan(settings).references,[],String(amount));
  }
  for(const engine of ['seedreamlite','gemini','gemini21','qwen3']){
    const recipe=prepareMoodPrompt('','80s-film',100,{engine,referenceCount:1,referenceMode:'base'});
    const settings={type:'image',mode:'image',engine,referenceMode:'base',prompt:recipe.prompt,
      ...recipe.metadata,referenceRoles:[{name:'source.jpg',role:'base'}]};
    assert.deepEqual(moodReferencePlan(settings).references,[],engine);
  }
  const recipe=prepareMoodPrompt('An empty station','80s-film',100,{engine:'seedream',referenceCount:0});
  assert.deepEqual(moodReferencePlan({type:'image',mode:'image',engine:'seedream',referenceMode:'base',
    prompt:recipe.prompt,...recipe.metadata,referenceRoles:[]}).references,[]);
  const referencesOnly=prepareMoodPrompt('New scene','80s-film',100,{engine:'seedream',referenceCount:1,referenceMode:'references'});
  assert.deepEqual(moodReferencePlan({type:'image',mode:'image',engine:'seedream',referenceMode:'references',
    prompt:referencesOnly.prompt,...referencesOnly.metadata,referenceRoles:[{name:'reference.jpg',role:'identity'}]}).references,[]);
});
