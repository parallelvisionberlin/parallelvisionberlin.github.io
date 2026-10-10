import test from 'node:test';
import assert from 'node:assert/strict';
import {compileImagePrompt,normalizeReferenceLabel,referenceGuidanceError} from '../lab/reference-guidance.js';
test('reference-only composition has no inherited base instructions',()=>{
 const roles=[{role:'identity'},{role:'body'},{role:'detail',target:'hair'}].map(normalizeReferenceLabel);
 assert.equal(referenceGuidanceError(roles),'');assert.equal(roles[1].role,'body');
 const prompt=compileImagePrompt('Full body, front view, new studio setting',roles);
 assert.match(prompt,/There is no base image/);assert.match(prompt,/body proportions/);assert.match(prompt,/REQUESTED IMAGE/);
 assert.doesNotMatch(prompt,/Base supplies|base photograph|base perspective|REQUESTED EDIT/);
});
test('base editing and plain text retain their original behavior',()=>{
 const prompt=compileImagePrompt('Change the jacket',[{role:'base'},{role:'outfit'}]);
 assert.match(prompt,/Base supplies everything else/);assert.match(prompt,/REQUESTED IMAGE/);
 assert.equal(compileImagePrompt('A quiet room',[]),'A quiet room');
});
