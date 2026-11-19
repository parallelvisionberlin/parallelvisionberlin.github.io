import test from 'node:test';
import assert from 'node:assert/strict';
import {beautySettings,beautyAutoRatio,validateBeautyQuote} from '../lab/beauty-settings.js';
import {beautyLookCatalog} from '../lab/beauty-look-catalog.js';
import {FLASH_RATIOS} from '../lab-worker/seedream-flash.mjs';
test('Beauty controls compile an identity-preserving edit and never borrow the example styling',()=>{
 const p=beautySettings({makeup:'bold',hair:'waves',skin:'dewy',strength:75,direction:'Copper eyes, soft gloss.'});
 assert.equal(p.engine,'seedream');assert.equal(p.mode,'image');assert.equal(p.resolution,'1k');assert.equal(p.referenceRoles[0].role,'base');assert.equal(p.referenceRoles[1].role,'custom');
 assert.match(p.prompt,/Preserve their identity/);assert.match(p.prompt,/Bold fashion makeup/);assert.match(p.prompt,/soft waves/);assert.match(p.prompt,/dewy/);assert.match(p.prompt,/75\/100/);assert.match(p.prompt,/Copper eyes/);assert.match(p.prompt,/Do not add a veil/);
 assert.doesNotMatch(beautySettings({strength:0}).prompt,/Editorial makeup/);
 assert.equal(beautySettings({model:'flash'}).engine,'flash');
 for(const options of [{strength:101},{strength:-1},{makeup:'bad'},{model:'unknown'},{aspectRatio:'bad'},{direction:'x'.repeat(1501)}])assert.throws(()=>beautySettings(options));
});
test('ALTER defaults only Seedream 5.5 to 1.5K and preserves explicit resolution choices',()=>{
 const seedream55=(resolution)=>beautySettings({model:'seedream55',aspectRatio:'auto',...(resolution?{resolution}:{})});
 assert.equal(seedream55().resolution,'1.5k');
 assert.equal(beautySettings({model:'seedream'}).resolution,'1k');
 assert.equal(beautySettings({model:'flash'}).resolution,'1k');
 for(const resolution of ['1k','1.5k','2k'])assert.equal(seedream55(resolution).resolution,resolution);
 for(const model of ['seedream','flash'])assert.throws(()=>beautySettings({model,resolution:'1.5k'}),/valid image settings/);
});
test('Beauty Auto derives provider-supported aspect ratio from uploaded photo',()=>{
 for(const model of ['seedream','seedream-pro','flash']){
  const settings=beautySettings({model,aspectRatio:'auto',sourceWidth:800,sourceHeight:1200,filename:'portrait.webp'});
  assert.equal(settings.aspectRatio,'2:3','Auto should match the source photo portrait shape');
  assert.equal(settings.referenceMode,'references');
  const accepted={id:'q',creditCost:23,expiresAt:2000,settings:{...settings,referenceSourceIds:['photo-1','makeup-1']}};
  assert.equal(validateBeautyQuote(accepted,settings,'photo-1',1000,'makeup-1'),accepted);
  assert.throws(()=>validateBeautyQuote({...accepted,settings:{...accepted.settings,aspectRatio:'4:5'}},settings,'photo-1',1000,'makeup-1'));
  assert.throws(()=>validateBeautyQuote({...accepted,settings:{...accepted.settings,referenceSourceIds:['other-photo','makeup-1']}},settings,'photo-1',1000,'makeup-1'));
 }
 assert.equal(beautyAutoRatio(1920,1080),'16:9');
 assert.equal(beautyAutoRatio(4000,3000),'4:3');
 assert.equal(beautyAutoRatio(3000,4000),'3:4');
 for(const ratio of FLASH_RATIOS){
  const [w,h]=ratio.split(':').map(Number);
  assert.equal(beautyAutoRatio(w*600,h*600),ratio,'An exactly supported photograph shape must not be approximated');
 }
 assert.equal(beautyAutoRatio(810,1200),'2:3','A nonstandard portrait uses the nearest proportional match');
 assert.equal(beautyAutoRatio(1200,810),'3:2','Rotation produces the reciprocal match');
 for(const [w,h] of [[NaN,100],[100,Infinity],[-1,100],[100,0]])assert.equal(beautyAutoRatio(w,h),'16:9');
 assert.equal(beautyAutoRatio(0,0),'16:9','Unloaded photo uses a safe reference fallback');
 for(const ratio of ['4:5','1:1','3:4','9:16'])assert.equal(beautySettings({aspectRatio:ratio}).aspectRatio,ratio,'Explicit aspect ratio must remain unchanged');
});
test('Beauty accepts only unexpired integer-credit quotes bound to the exact photo and settings',()=>{
 const settings=beautySettings({makeup:'keep'}),quote={id:'quoted-job',creditCost:23,expiresAt:2000,settings:{...settings,referenceSourceIds:['photo-1']}};
 assert.equal(validateBeautyQuote(quote,settings,'photo-1',1000),quote);
 for(const changed of [{creditCost:0},{creditCost:'23'},{creditCost:1.5},{id:{}},{expiresAt:900},{settings:{...quote.settings,prompt:'A different edit'}},{settings:{...quote.settings,engine:'flash'}},{settings:{...quote.settings,resolution:'2k'}},{settings:{...quote.settings,referenceSourceIds:['different-photo']}}])assert.throws(()=>validateBeautyQuote({...quote,...changed},settings,'photo-1',1000));
});

test('Fifteen makeup photos are quoted as exact two-reference edits; Original and zero strength remain single-reference',()=>{
 for(const choice of beautyLookCatalog.makeup.slice(1)){
  const settings=beautySettings({makeup:choice.id,model:'seedream55',aspectRatio:'auto',sourceWidth:900,sourceHeight:1200});
  assert.equal(settings.engine,'seedream55');assert.equal(settings.aspectRatio,'3:4');
  assert.deepEqual(settings.referenceRoles.map(r=>r.role),['base','custom']);
  assert.match(settings.referenceRoles[1].note,/only the precise makeup/i);
  const q={id:'q',creditCost:32,expiresAt:2000,settings:{...settings,referenceSourceIds:['source','curated-makeup']}};
  assert.equal(validateBeautyQuote(q,settings,'source',1000,'curated-makeup'),q);
  assert.throws(()=>validateBeautyQuote(q,settings,'source',1000,'wrong-makeup'));
  assert.throws(()=>validateBeautyQuote(q,settings,'source',1000));
 }
 for(const props of [{makeup:'keep'},{makeup:'bold',strength:0}])assert.equal(beautySettings(props).referenceRoles.length,1);
 assert.equal(beautyAutoRatio(800,1000,'seedream55'),'3:4');
 assert.throws(()=>beautySettings({model:'seedream55',aspectRatio:'4:5'}),/does not support 4:5/);
});
