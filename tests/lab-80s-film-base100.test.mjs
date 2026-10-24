import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {moodById,prepareMoodPrompt} from '../lab/moods.js';

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
