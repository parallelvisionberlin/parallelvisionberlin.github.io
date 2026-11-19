import test from 'node:test';
import assert from 'node:assert/strict';
import {transformVideoEditPreview} from '../lab/transform-quote-preview.js';
const quote=(duration=12,maxUsd=13.68)=>({provider:'SpicyAPI',maxUsd,settings:{type:'video',engine:'seedance',mode:'transform',model:'bytedance/seedance-2.5/video-edit',resolution:'720p',sourceDurationSeconds:duration}});
test('12s edit: 5.472 USD estimate, 13.68 USD maximum reservation',()=>{
 assert.deepEqual(transformVideoEditPreview(quote()),{seconds:12,estimatedUsd:5.472,maxUsd:13.68});
});
test('Fractional source duration rounds up to billed whole seconds',()=>{
 assert.deepEqual(transformVideoEditPreview(quote(12.1)),{seconds:13,estimatedUsd:5.928,maxUsd:13.68});
});
test('Mismatch, other provider, other model and full-length source fall back to authoritative quote',()=>{
 assert.equal(transformVideoEditPreview(quote(30)),null);
 assert.equal(transformVideoEditPreview(quote(12,9.99)),null);
 assert.equal(transformVideoEditPreview({...quote(),provider:'Higgsfield'}),null);
 assert.equal(transformVideoEditPreview({...quote(),settings:{...quote().settings,model:'bytedance/seedance-2.5-flash/video-edit'}}),null);
 assert.equal(transformVideoEditPreview({...quote(),settings:{...quote().settings,sourceDurationSeconds:NaN}}),null);
});
