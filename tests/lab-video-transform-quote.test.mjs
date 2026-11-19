import test from 'node:test';
import assert from 'node:assert/strict';
import {transformEditQuoteEstimate} from '../lab/video-transform-quote.js';
const quote=(duration,maxUsd=13.68)=>({
 provider:'SpicyAPI',maxUsd,creditCost:2189,
 settings:{provider:'spicy',engine:'seedance',mode:'transform',
 model:'bytedance/seedance-2.5/video-edit',sourceDurationSeconds:duration}
});
test('12-second 720p edit displays actual-length estimate, preserving the full 30-second max',()=>{
 const estimate=transformEditQuoteEstimate(quote(12));
 assert.deepEqual(estimate,{billedSeconds:12,estimatedUsd:5.472,maxUsd:13.68,estimatedCredits:876,creditHold:2189});
});
test('fractional seconds bill upward, but never exceed the 30-second hold',()=>{
 assert.equal(transformEditQuoteEstimate(quote(12.01)).billedSeconds,13);
 assert.equal(transformEditQuoteEstimate(quote(30)).estimatedUsd,13.68);
});
test('unknown models, providers and invalid durations never get a fabricated estimate',()=>{
 assert.equal(transformEditQuoteEstimate({...quote(12),provider:'Higgsfield'}),null);
 assert.equal(transformEditQuoteEstimate(quote(31)),null);
 assert.equal(transformEditQuoteEstimate(quote(0)),null);
 assert.equal(transformEditQuoteEstimate({...quote(12),settings:{...quote(12).settings,model:'other'}}),null);
});
