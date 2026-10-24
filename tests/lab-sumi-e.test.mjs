import test from 'node:test';
import assert from 'node:assert/strict';
import {MOODS,moodById,prepareMoodPrompt,preparePersonalMoodPrompt} from '../lab/moods.js';
import {compileImagePrompt} from '../lab/reference-guidance.js';

const id='sumi-ink';
const scenes=[
  'Fashion portrait of the same woman in her black leather jacket.',
  'Same woman sitting at a European cafe, with its bicycle, table and windows.',
  'Full-body fashion photograph of the same person with visible street architecture.'
];
const recipe=(direction,intensity,options={})=>prepareMoodPrompt(direction,id,intensity,{engine:'seedream',referenceCount:1,referenceMode:'base',...options});

test('Sumi-e retains its original single catalogue entry, preview and public identity',()=>{
  const mood=moodById(id);
  assert.equal(MOODS.length,17);
  assert.equal(MOODS.at(-1),mood);
  assert.equal(mood.name,'Japanese Sumi-e');
  assert.equal(mood.preview,'/lab/mood-previews/hd/japanese-sumi-e-20261011.jpg');
  assert.match(mood.previewFull,/sumi-ink\/originals\//);
  assert.match(mood.direction,/realistic|photographic/);
  assert.doesNotMatch(mood.intense,/recreate the whole scene/i);
});

test('30/60/100 preserve user text, source scene, body and wardrobe while scaling ink',()=>{
  for(const direction of scenes)for(const intensity of [30,60,100]){
    const r=recipe(direction,intensity);
    assert.equal(r.error,'',direction+' '+intensity);
    assert.ok(r.prompt.startsWith(direction+'\n\n'));
    assert.deepEqual(r.metadata,{moodId:id,moodIntensity:intensity,moodOriginalPrompt:direction});
    assert.match(r.prompt,/EDIT IMAGE 1, not a new scene/);
    assert.match(r.prompt,/Preserve facial identity/);
    assert.match(r.prompt,/pose, orientation, viewpoint, framing, crop and perspective/);
    assert.match(r.prompt,/retain the original garment type/i);
    assert.match(r.prompt,/Never force a kimono/);
    assert.match(r.prompt,/Yohji Yamamoto-inspired/);
    assert.match(r.prompt,new RegExp('ARTISTIC STRENGTH '+intensity+'\\/100'));
    assert.ok(r.prompt.includes('simplify about '+Math.round(intensity*.4)+'%'));
    assert.match(r.prompt,/unimportant peripheral strokes may dissolve/);
    assert.match(r.prompt,/user edits/);
    const expanded=compileImagePrompt(r.prompt,[{name:'source.jpg',role:'base'}],{...r.metadata,engine:'seedream',referenceMode:'base'});
    assert.ok(expanded.length<=5000,expanded.length+' characters '+intensity);
    assert.ok(expanded.includes(direction));
  }
});

test('Continuous 1-100 intensity never switches to a new scene recipe',()=>{
  let previous=-1;
  for(let intensity=1;intensity<=100;intensity++){
    const r=recipe(scenes[1],intensity);
    assert.equal(r.error,'');
    assert.ok(r.prompt.includes('ARTISTIC STRENGTH '+intensity+'/100'));
    assert.match(r.prompt,/EDIT IMAGE 1, not a new scene/);
    assert.match(r.prompt,/WARDROBE:/);
    const reduction=Number(r.prompt.match(/simplify about (\d+)%/)?.[1]);
    assert.equal(reduction,Math.round(intensity*.4));
    assert.ok(reduction>=previous&&reduction-previous<=1);
    previous=reduction;
  }
});

test('Lite provider uses the fixed concise variant within its 3000-character budget',()=>{
  for(const intensity of [30,60,100]){
    const direction=scenes[1];
    const r=recipe(direction,intensity,{engine:'seedreamlite'});
    assert.equal(r.error,'');
    assert.match(r.prompt,/EDIT IMAGE 1, not a new scene/);
    assert.match(r.prompt,/No forced costumes/);
    const expanded=compileImagePrompt(r.prompt,[{name:'source.jpg',role:'base'}],{...r.metadata,engine:'seedreamlite',referenceMode:'base'});
    assert.ok(expanded.length<=3000,'Lite compiled prompt length '+expanded.length);
  }
});

test('References Only and text-only preserve user authorship without inventing a Base',()=>{
  const text=prepareMoodPrompt('An editorial model in Paris wearing a red coat',id,100,{engine:'seedream',referenceCount:0});
  assert.equal(text.error,'');
  assert.match(text.prompt,/NO BASE:/);
  assert.doesNotMatch(text.prompt,/EDIT IMAGE 1/);
  assert.match(text.prompt,/Never force a Japanese location/);
  const refs=prepareMoodPrompt('Portrait in a Berlin cafe',id,60,{engine:'seedream',referenceCount:2,referenceMode:'references'});
  assert.equal(refs.error,'');
  assert.match(refs.prompt,/REFERENCES ONLY:/);
  assert.doesNotMatch(refs.prompt,/EDIT IMAGE 1/);
  assert.ok(refs.prompt.startsWith('Portrait in a Berlin cafe\n\n'));
  assert.match(prepareMoodPrompt('',id,100).error,/Describe a subject/);
  assert.equal(prepareMoodPrompt('',id,100,{referenceCount:1}).error,'');
});

test('Explicit outfit request, My Moods and other recipes remain compatible',()=>{
  const own='Keep the exact brown leather jacket and existing European cafe; no kimono.';
  const result=recipe(own,100);
  assert.ok(result.prompt.startsWith(own+'\n\n'));
  assert.match(result.prompt,/Explicit wardrobe instructions take priority/);
  const saved=preparePersonalMoodPrompt(own,{id:'30000000-0000-4000-8000-000000000090',name:'My Sumi',baseMoodId:id,direction:'Very fine ink wash'},60,{engine:'seedream',referenceCount:1});
  assert.equal(saved.error,'');
  assert.match(saved.prompt,/PV LAB MY MOOD \/ My Sumi/);
  assert.match(saved.prompt,/PV LAB MOOD \/ Japanese Sumi-e/);
  assert.ok(saved.prompt.startsWith(own+'\n\n'));
  assert.match(prepareMoodPrompt('portrait','kodak-gold',100).prompt,/visibly organic 35mm grain/);
  assert.match(prepareMoodPrompt('portrait','hong-kong-nights',60).prompt,/selective petrol-green light/);
});
