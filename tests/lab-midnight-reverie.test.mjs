import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {moodById,prepareMoodPrompt} from '../lab/moods.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';

const selected=moodById('midnight-reverie');
test('Midnight Reverie V2 defaults to vivid 82 percent cobalt flash-memory capture',()=>{
  assert.equal(selected.defaultIntensity,82);
  assert.match(selected.description,/cobalt afterglow/i);
  assert.match(selected.preview,/midnight-reverie-original-20261011/);
  const low=prepareMoodPrompt('Person by the same window','midnight-reverie',20,{referenceCount:1});
  const normal=prepareMoodPrompt('Person by the same window','midnight-reverie',65,{referenceCount:1});
  const hero=prepareMoodPrompt('Person by the same window','midnight-reverie',82,{referenceCount:1});
  const maximum=prepareMoodPrompt('Person by the same window','midnight-reverie',100,{referenceCount:1});
  for(const recipe of [low,normal,hero,maximum]){
    assert.equal(recipe.error,'');
    assert.match(recipe.prompt,/flash/i);
    assert.match(recipe.prompt,/ambient/i);
    assert.match(recipe.prompt,/cobalt/i);
    assert.match(recipe.prompt,/IDENTITY FIRST/);
    assert.match(recipe.prompt,/eyes/i);
    assert.match(recipe.prompt,/location|setting|place/i);
  }
  assert.match(normal.prompt,/35–69%: obvious flash-frozen subject/);
  assert.match(hero.prompt,/70–89%: voluptuous electric cobalt memory/);
  assert.match(maximum.prompt,/100%: sublime cobalt flash dream/);
  assert.notEqual(normal.prompt,hero.prompt);
  assert.notEqual(hero.prompt,maximum.prompt);
});
test('Midnight Reverie combines flash-imprint and dragged cyan ambient in one generation, not two paid calls',()=>{
  for(const engine of ['seedream','gemini'])for(const strength of [1,34,35,65,82,90,100])
    for(const opts of [{},{compact:true},{ultraCompact:true}]){
      const recipe=prepareMoodPrompt('Same original person and bedroom','midnight-reverie',strength,
        {engine,referenceCount:1,...opts});
      assert.equal(recipe.error,'');
      assert.match(recipe.prompt,/flash/i);
      assert.match(recipe.prompt,/cobalt/i);
      assert.match(recipe.prompt,/ambient/i);
      assert.match(recipe.prompt,/one generation|ONE real-looking exposure|one image/i);
      assert.match(recipe.prompt,/IDENTITY FIRST/i);
      assert.match(recipe.prompt,/eyes/i);
      assert.match(recipe.prompt,/face/i);
      assert.doesNotMatch(recipe.prompt,/replace the person with the preview subject/i);
    }
});
test('Midnight Reverie prompt budget protects user instructions and all reference roles',()=>{
  let max=0;
  for(const engine of ['seedream','gemini'])
    for(const strength of [1,34,35,65,69,70,82,89,90,99,100])
      for(const count of [0,1,3,6,10])
        for(const size of [25,800,1500,2000]){
          const author='Keep the same person, clothing and camera. '.repeat(Math.ceil(size/43)).slice(0,size).trim();
          const refs=Array.from({length:count},(_,i)=>({name:'ref-'+i+'.png',role:i?'identity':'base',note:''}));
          const result=prepareMoodPrompt(author,'midnight-reverie',strength,{engine,referenceCount:count});
          const provider=compileImagePrompt(result.prompt,refs);
          assert.equal(result.error,'');
          assert.ok(result.prompt.startsWith(author));
          assert.ok(provider.length<=5000,'provider budget exceeded: '+JSON.stringify({engine,strength,count,size,length:provider.length}));
          assert.match(provider,/IDENTITY FIRST/);
          assert.match(provider,/cobalt/i);
          max=Math.max(max,provider.length);
        }
  assert.ok(max>3500);
});
test('Midnight Reverie never injects a preview person or changes other established Moods',()=>{
 const ids=['night-flash','hong-kong-nights','dreamcore','80s-film','90s-cinema'];
 for(const id of ids){
   const recipe=prepareMoodPrompt('Original portrait',''+id,78,{referenceCount:1});
   assert.equal(recipe.metadata.moodId,id);
   assert.doesNotMatch(recipe.prompt,/MIDNIGHT REVERIE V2/);
 }
 const mood=prepareMoodPrompt('Same person','midnight-reverie',100,{referenceCount:1});
 assert.deepEqual(mood.metadata,{moodId:'midnight-reverie',moodIntensity:100,moodOriginalPrompt:'Same person'});
});
test('Midnight Reverie V2 module versions propagate through Studio and Mood discovery',()=>{
 const files=['studio.html','lab.js','moods.html','explore-moods.js','app-moods.html','app-moods.js',
   'app-mood-generation.js','mood-creator.html','mood-creator.js','my-moods.js','mood-references.js'];
 for(const file of files){
   const source=readFileSync(new URL('../lab/'+file,import.meta.url),'utf8');
   assert.match(source,/midnightFlashV2=1/,'stale mood version in '+file);
 }
 const source=readFileSync(new URL('../lab/moods.js',import.meta.url),'utf8');
 assert.match(source,/Flash-frozen, cobalt afterglow/);
 assert.match(source,/if\(selected&&mood.defaultIntensity\)intensity=mood.defaultIntensity/);
});
