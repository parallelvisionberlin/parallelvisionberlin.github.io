import test from 'node:test';
import assert from 'node:assert/strict';
import {beautySettings,beautyAutoRatio,validateBeautyQuote} from '../lab/beauty-settings.js';
test('Beauty controls compile an identity-preserving edit and never borrow the example styling',()=>{
 const p=beautySettings({makeup:'bold',hair:'waves',skin:'dewy',strength:75,direction:'Copper eyes, soft gloss.'});
 assert.equal(p.engine,'seedream');assert.equal(p.mode,'image');assert.equal(p.resolution,'1k');assert.equal(p.referenceRoles[0].role,'identity');
 assert.match(p.prompt,/Preserve their identity/);assert.match(p.prompt,/Bold fashion makeup/);assert.match(p.prompt,/soft waves/);assert.match(p.prompt,/dewy/);assert.match(p.prompt,/75\/100/);assert.match(p.prompt,/Copper eyes/);assert.match(p.prompt,/Do not add a veil/);
 assert.doesNotMatch(beautySettings({strength:0}).prompt,/Editorial makeup/);
 assert.equal(beautySettings({model:'flash'}).engine,'flash');
 for(const options of [{strength:101},{strength:-1},{makeup:'bad'},{model:'unknown'},{aspectRatio:'bad'},{direction:'x'.repeat(1501)}])assert.throws(()=>beautySettings(options));
});
test('Beauty Auto derives provider-supported aspect ratio from uploaded photo',()=>{
 for(const model of ['seedream','seedream-pro','flash']){
  const settings=beautySettings({model,aspectRatio:'auto',sourceWidth:800,sourceHeight:1200,filename:'portrait.webp'});
  assert.equal(settings.aspectRatio,'2:3','Auto should match the source photo portrait shape');
  assert.equal(settings.referenceMode,'references');
  const accepted={id:'q',creditCost:23,expiresAt:2000,settings:{...settings,referenceSourceIds:['photo-1']}};
  assert.equal(validateBeautyQuote(accepted,settings,'photo-1',1000),accepted);
  assert.throws(()=>validateBeautyQuote({...accepted,settings:{...accepted.settings,aspectRatio:'4:5'}},settings,'photo-1',1000));
  assert.throws(()=>validateBeautyQuote({...accepted,settings:{...accepted.settings,referenceSourceIds:['other-photo']}},settings,'photo-1',1000));
 }
 assert.equal(beautyAutoRatio(1920,1080),'16:9');
 assert.equal(beautyAutoRatio(4000,3000),'4:3');
 assert.equal(beautyAutoRatio(3000,4000),'3:4');
 assert.equal(beautyAutoRatio(0,0),'16:9','Unloaded photo uses a safe reference fallback');
 for(const ratio of ['4:5','1:1','3:4','9:16'])assert.equal(beautySettings({aspectRatio:ratio}).aspectRatio,ratio,'Explicit aspect ratio must remain unchanged');
});
test('Beauty accepts only unexpired integer-credit quotes bound to the exact photo and settings',()=>{
 const settings=beautySettings(),quote={id:'quoted-job',creditCost:23,expiresAt:2000,settings:{...settings,referenceSourceIds:['photo-1']}};
 assert.equal(validateBeautyQuote(quote,settings,'photo-1',1000),quote);
 for(const changed of [{creditCost:0},{creditCost:'23'},{creditCost:1.5},{id:{}},{expiresAt:900},{settings:{...quote.settings,prompt:'A different edit'}},{settings:{...quote.settings,engine:'flash'}},{settings:{...quote.settings,resolution:'2k'}},{settings:{...quote.settings,referenceSourceIds:['different-photo']}}])assert.throws(()=>validateBeautyQuote({...quote,...changed},settings,'photo-1',1000));
});
