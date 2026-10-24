import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOODS,moodById,prepareMoodPrompt,preparePersonalMoodPrompt} from '../lab/moods.js';
import {EIGHTIES_TAPE_RECIPE} from '../lab/80s-film-recipe.js';
import {compileImagePrompt,normalizeReferenceLabel} from '../lab/reference-guidance.js';
import {moodReferencePlan} from '../lab/mood-references.js';

const engines=['seedream','seedreamlite','gemini','gemini21','krea3','qwen3','zspicy'];
const direction='Keep the same person and cafe. Preserve my white shirt and do not change any signs.';

test('80s Film keeps its identity and original card assets while using the approved early-tape recipe',()=>{
  const mood=moodById('80s-film');
  assert.equal(MOODS.length,17);
  assert.equal(mood.name,'80s Film');assert.equal(mood.category,'Analog');
  assert.equal(mood.preview,'/lab/mood-previews/hd/80s-film-20261011.jpg');
  assert.equal(mood.previewFull,'/lab/mood-bank/2026-10-11/80s-film/originals/80s-film.png');
  assert.equal(mood.defaultIntensity,undefined,'Do not introduce a new default');
  assert.equal(moodById('dream-blur').defaultIntensity,80);
  for(const [key,value] of Object.entries(EIGHTIES_TAPE_RECIPE))assert.equal(mood[key],value,key);
  assert.match(mood.direction,/1981-1984/);assert.match(mood.direction,/35mm/);
  assert.match(mood.direction,/well-preserved PAL analog videotape/);
  assert.match(mood.direction,/NOT arbitrary blur or tape damage/);
  assert.doesNotMatch(mood.direction,/mid-1980s|late-1980s|HIGH-FASHION FEATURE CINEMA/);
});

test('all 100 strengths preserve original direction, metadata, identity and real-place instructions',()=>{
  for(const engine of engines)for(let amount=1;amount<=100;amount++){
    const recipe=prepareMoodPrompt(direction,'80s-film',amount,{engine,referenceCount:1,referenceMode:'base'});
    assert.equal(recipe.error,'',engine+'/'+amount);
    assert.ok(recipe.prompt.startsWith(direction+'\n\n'));
    assert.deepEqual(recipe.metadata,{moodId:'80s-film',moodIntensity:amount,moodOriginalPrompt:direction});
    assert.match(recipe.prompt,/1981-1984/);assert.match(recipe.prompt,/identity/i);
    assert.match(recipe.prompt,/pose/);assert.match(recipe.prompt,/actual place/);
    assert.match(recipe.prompt,/Explicit user instructions and assigned roles take priority/);
    assert.match(recipe.prompt,/crop|framing/);
    assert.ok(recipe.prompt.length<=(engine==='seedreamlite'?3000:5000));
    if(amount<70){
      assert.match(recipe.prompt,/Keep clothes and environmental details unchanged/);
      assert.match(recipe.prompt,/No period restyling/);
      assert.doesNotMatch(recipe.prompt,/Only small period clothing details/);
    }else{
      assert.match(recipe.prompt,/Only small period clothing details and already-visible modern objects/);
      assert.match(recipe.prompt,/retain garment category, colors, material and coverage/);
    }
  }
});

test('full and Lite provider prompts retain assigned roles and fit the normal Base-photo budget',()=>{
  for(const engine of ['seedream','seedreamlite','gemini','gemini21','krea3','qwen3']){
    for(const amount of [1,34,35,69,70,89,90,99,100]){
      const labels=[normalizeReferenceLabel({name:'my-photo.jpg',role:'base',note:'Keep the white shirt.'}),normalizeReferenceLabel({name:'face.jpg',role:'identity',note:'Use only this identity.'})];
      const recipe=prepareMoodPrompt(direction,'80s-film',amount,{engine,referenceCount:labels.length});
      const settings={type:'image',mode:'image',engine,referenceMode:'base',resolution:'2k',aspectRatio:'16:9',prompt:recipe.prompt,...recipe.metadata,referenceRoles:labels};
      const plan=moodReferencePlan(settings);
      assert.equal(plan.references.length,0,'80s Film gains no hidden reference pack');
      assert.equal(plan.settings,settings);
      const compiled=compileImagePrompt(recipe.prompt,labels,settings);
      assert.ok(compiled.includes(recipe.prompt),'Never shorten or replace the authored recipe');
      assert.ok(compiled.includes('Keep the white shirt.'));
      assert.ok(compiled.includes('Use only this identity.'));
      assert.ok(compiled.length<=(engine==='seedreamlite'?3000:5000),engine+'/'+amount+': '+compiled.length);
      assert.equal(settings.aspectRatio,'16:9');assert.equal(settings.resolution,'2k');
    }
  }
});

test('text-only and References Only still follow the customer subject rather than a forced Base',()=>{
  const subject='An empty coastal cafe interior, no people.';
  for(const engine of engines)for(const amount of [20,60,80,100]){
    const text=prepareMoodPrompt(subject,'80s-film',amount,{engine,referenceCount:0});
    assert.equal(text.error,'');assert.ok(text.prompt.startsWith(subject+'\n\n'));
    assert.match(text.prompt,/No Base: use the written subject/);
    assert.doesNotMatch(text.prompt,/The first reference is the base photograph/);
    const refs=prepareMoodPrompt(subject,'80s-film',amount,{engine,referenceCount:2,referenceMode:'references'});
    assert.equal(refs.error,'');assert.match(refs.prompt,/Reference-only: follow requested output and explicitly assigned roles/);
    assert.doesNotMatch(refs.prompt,/The first reference is the base photograph/);
  }
  assert.match(prepareMoodPrompt('','80s-film',100).error,/Describe a subject or add an image/);
});

test('long directions are rejected intact, not truncated or switched to a smaller recipe',()=>{
  for(const engine of ['seedream','seedreamlite']){
    const text='Preserve this exact customer instruction. '.repeat(180);
    const long=prepareMoodPrompt(text,'80s-film',100,{engine,referenceCount:1});
    assert.match(long.error,/exceed/);assert.equal(long.metadata.moodOriginalPrompt,text.trim());
    assert.ok(long.prompt.startsWith(text.trim()+'\n\n'));
    const short=prepareMoodPrompt('Same image','80s-film',100,{engine,referenceCount:1});
    assert.equal(long.prompt.slice(text.trim().length),short.prompt.slice('Same image'.length));
    const board={id:'10000000-0000-4000-8000-000000000081',name:'My early tape',baseMoodId:'80s-film',direction:'Preserve the original white shirt.'};
    const saved=preparePersonalMoodPrompt(direction,board,100,{engine,referenceCount:1});
    assert.equal(saved.error,'');assert.ok(saved.prompt.includes(board.direction));
    assert.equal(saved.metadata.moodOriginalPrompt,direction);
  }
});

test('other Moods never inherit the new tape direction and both web/native imports refresh',()=>{
  for(const mood of MOODS.filter(m=>m.id!=='80s-film')){
    for(const amount of [20,60,80,100])for(const referenceCount of [0,1]){
      const recipe=prepareMoodPrompt('Same original person and place.',mood.id,amount,{engine:'seedream',referenceCount});
      assert.doesNotMatch(recipe.prompt,/EARLY 1980S FILM-TO-TAPE|MAXIMUM 100% \/ EARLY-80S TAPE/);
    }
  }
  for(const path of ['lab/lab.js','lab/app-moods.js','lab/app-mood-generation.js','lab/explore-moods.js','lab/mood-creator.js']){
    assert.match(readFileSync(new URL('../'+path,import.meta.url),'utf8'),/moods\.js\?[^'\n]*eightiesTape=20261024v1/,path);
  }
  for(const path of ['lab/studio.html','lab/moods.html','lab/app-moods.html','lab/mood-creator.html']){
    assert.match(readFileSync(new URL('../'+path,import.meta.url),'utf8'),/eightiesTape=20261024v1/,path);
  }
});
