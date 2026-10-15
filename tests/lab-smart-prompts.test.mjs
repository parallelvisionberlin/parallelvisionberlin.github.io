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
