import test from 'node:test';
import assert from 'node:assert/strict';
import {compileImagePrompt,referenceRoleAdvisories} from '../lab/reference-guidance.js';
import {imageQualityGuidance} from '../lab/prompt-quality.js';
const s=(more={})=>({type:'image',mode:'image',engine:'seedream',referenceMode:'references',...more});
test('photographic identity and body guidance preserves the written direction',()=>{
 const p=compileImagePrompt('Nina lying on her side in yellow underwear on the bed',[{role:'identity',name:'nina.png'},{role:'body',name:'body.png'}],s());
 assert.match(p,/IDENTITY FIRST/);assert.match(p,/NATURAL HUMAN REALISM/);
 assert.match(p,/yellow underwear/);assert.match(p,/iris texture/);
});
test('exact mode preserves reference mapping but disables optional polish',()=>{
 const p=compileImagePrompt('Nina lying on the bed',[{role:'identity',name:'nina.png'}],s({exactPrompt:true}));
 assert.match(p,/REQUESTED IMAGE: Nina lying/);assert.match(p,/Reference 1 \[Identity\]/);
 assert.doesNotMatch(p,/IDENTITY FIRST|NATURAL HUMAN REALISM/);
});
test('art and product directions remain separate',()=>{
 const a=compileImagePrompt('watercolor painting of a woman',[],s());
 assert.match(a,/ART DIRECTION/);assert.doesNotMatch(a,/NATURAL HUMAN REALISM/);
 const b=compileImagePrompt('product photograph of a perfume bottle',[],s());
 assert.match(b,/PRODUCT DIRECTION/);assert.doesNotMatch(b,/NATURAL HUMAN REALISM/);
});
test('no extra detail is invented for abstract or empty prompts',()=>{
 assert.equal(compileImagePrompt('',[],s()),'');
 assert.equal(compileImagePrompt('vivid green hills',[],s()),'vivid green hills');
});
test('optional improvements never exceed the provider prompt budget',()=>{
 const p='fashion portrait of a woman. '+('x'.repeat(4800));
 assert.equal(compileImagePrompt(p,[],s()),p);
 const q=compileImagePrompt('fashion portrait of a woman '+('x'.repeat(2850)),[],s({engine:'seedreamlite'}));
 assert.ok(q.length<=3000);
});
test('reference warnings allow matching multiple identity views',()=>{
 assert.deepEqual(referenceRoleAdvisories([{role:'identity'},{role:'identity'}]),[]);
 assert.match(referenceRoleAdvisories([{role:'pose'},{role:'pose'}]).join(' '),/Multiple Pose/);
 assert.match(referenceRoleAdvisories([{role:'body'},{role:'body'}]).join(' '),/Multiple Body/);
});
test('video prompts are untouched',()=>assert.equal(imageQualityGuidance('portrait of a woman',[],{type:'video',mode:'image',engine:'seedream'}),''));

test('Base plus Character respects a targeted identity replacement',()=>{
 const direction='iamge 1 intact replace woman left red hair using alma with provided images. keep mood and filter and adapt, real photography asian nostalgia.';
 const prompt=compileImagePrompt(direction,[{role:'base',name:'street.png'},{role:'identity',name:'Alma'}],s());
 assert.ok(prompt.includes(direction));
 assert.match(prompt,/Preserve other people in the Base/);
 assert.doesNotMatch(prompt,/No beautification, face swapping|Do not change expression, pose, age, outfit or person|Keep the reference face and anatomy intact/);
});

test('Seedream 5.5 adds contextual body-contact geometry without changing a two-person direction',()=>{
 const direction='Candid photograph of a man and a woman embracing on a sofa.';
 const p=compileImagePrompt(direction,[{role:'identity',name:'face.png'},{role:'body',name:'physique.png'}],s({engine:'seedream55'}));
 assert.ok(p.includes(direction));
 assert.match(p,/MULTI-PERSON GEOMETRY/);
 assert.match(p,/ownership of every visible arm, leg, hand and joint/);
 assert.match(p,/concealed behind another body/);
 assert.match(p,/Keep the referenced silhouette, waist, chest, hips, glutes/);
 assert.match(p,/EDITORIAL LIGHT COHERENCE/);
 assert.ok(p.length<=5000);
});
test('single-person editorial images retain identity and lighting without a multi-person intervention',()=>{
 const p=compileImagePrompt('Candid hotel photograph of a woman reclining on a bed.',[{role:'identity',name:'face.png'},{role:'body',name:'body.png'}],s({engine:'seedream55'}));
 assert.match(p,/IDENTITY FIRST/);
 assert.match(p,/EDITORIAL LIGHT COHERENCE/);
 assert.doesNotMatch(p,/MULTI-PERSON GEOMETRY/);
});
test('couples, authored lighting, moods and exact prompts keep their own priorities',()=>{
 const direction='A couple kissing under harsh red neon light in a bedroom.';
 const pair=compileImagePrompt(direction,[],s({engine:'seedream55'}));
 assert.match(pair,/MULTI-PERSON GEOMETRY/);
 assert.doesNotMatch(pair,/EDITORIAL LIGHT COHERENCE/);
 const mood=compileImagePrompt('A couple embracing in a portrait.',[],s({engine:'seedream55',moodId:'night-flash'}));
 assert.match(mood,/MULTI-PERSON GEOMETRY/);
 assert.doesNotMatch(mood,/EDITORIAL LIGHT COHERENCE/);
 const exact=compileImagePrompt(direction,[],s({engine:'seedream55',exactPrompt:true}));
 assert.equal(exact,direction);
});
test('artwork, products and full prompt budgets receive no extra realistic scene styling',()=>{
 for(const direction of ['Watercolor painting of a couple','Product photograph of two perfume bottles']){
  const prompt=compileImagePrompt(direction,[],s({engine:'seedream55'}));
  assert.doesNotMatch(prompt,/MULTI-PERSON GEOMETRY|EDITORIAL LIGHT COHERENCE/);
 }
 const direction='Photograph of a man and a woman together. '+('x'.repeat(4850));
 assert.equal(compileImagePrompt(direction,[],s({engine:'seedream55'})),direction);
 const lite=compileImagePrompt('Candid photograph of two people hugging.',[],s({engine:'seedreamlite'}));
 assert.ok(lite.length<=3000);
 assert.match(lite,/MULTI-PERSON GEOMETRY/);
});
