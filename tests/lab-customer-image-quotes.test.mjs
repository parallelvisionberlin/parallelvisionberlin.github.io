import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quoteCustomerImageCredits} from '../lab-worker/customer-image-pricing.mjs';
import {creditsForUsd} from '../lab-worker/customer-billing.mjs';
import {customerImagePriceKey,pricedBoundQuotes,imageAutoRatio} from '../lab/image-credit-preview.js';
import {createCustomerImagePricing} from '../lab/customer-image-pricing.js';

test('backend-rated image quote uses current model costs and counts, never client prices',()=>{
  const flash=quoteCustomerImageCredits({type:'image',engine:'flash'},4);
  assert.equal(flash.credits,creditsForUsd(.018)*4);
  assert.equal(flash.kind,'server-estimate');
  assert.equal(flash.source,'backend-model-rate');
  const kling=quoteCustomerImageCredits({type:'image',engine:'kling'},3);
  assert.equal(kling.credits,creditsForUsd(.028)*3);
  const gemini=quoteCustomerImageCredits({type:'image',engine:'gemini',processing:'normal'},4,{geminiEstimateMicros:()=>134000});
  assert.equal(gemini.credits,creditsForUsd(.134)*4);
  const batch=quoteCustomerImageCredits({type:'image',engine:'gemini',processing:'batch'},20,{geminiEstimateMicros:()=>67000});
  assert.equal(batch.credits,creditsForUsd(.067)*20);
  assert.throws(()=>quoteCustomerImageCredits({type:'image',engine:'gemini',processing:'normal'},20,{geminiEstimateMicros:()=>134000}),/four normal/);
  assert.throws(()=>quoteCustomerImageCredits({type:'image',engine:'seedream'},1),/bound provider quote/);
  assert.throws(()=>quoteCustomerImageCredits({type:'image',engine:'flash'},0),/supported image count/);
});
test('bound quotes sum individual server-confirmed credit charges, including batches',()=>{
  const future=Date.now()+180000,quote=(id,usd)=>({id,provider:'SpicyAPI',maxUsd:usd,creditCost:creditsForUsd(usd),expiresAt:future});
  const result=pricedBoundQuotes({quotes:[quote('a',.018),quote('b',.045)]},2,'SpicyAPI');
  assert.equal(result.credits,creditsForUsd(.018)+creditsForUsd(.045));
  assert.deepEqual(result.quotes.map(x=>x.id),['a','b']);
  assert.throws(()=>pricedBoundQuotes({...quote('z',.01),creditCost:undefined},1,'SpicyAPI'),/Price quote/);
  assert.throws(()=>pricedBoundQuotes({quotes:[quote('a',.01),quote('a',.01)]},2,'SpicyAPI'),/Price quote/);
  assert.throws(()=>pricedBoundQuotes({quotes:[quote('a',.01)]},2,'SpicyAPI'),/Incomplete/);
  assert.throws(()=>pricedBoundQuotes(quote('a',.01),1,'Higgsfield'),/Price quote/);
  assert.throws(()=>pricedBoundQuotes({...quote('a',.01),expiresAt:Date.now()+1000},1,'SpicyAPI'),/expired/);
});
test('16:9 is default without a base and base-photo ratio follows Auto unless manually overridden',()=>{
  const values=['auto','16:9','9:16','1:1','4:3','3:4'];
  assert.equal(imageAutoRatio({values,reference:null,current:'auto'}),'16:9');
  assert.equal(imageAutoRatio({values,reference:{width:900,height:1200}}),'auto');
  assert.equal(imageAutoRatio({values,reference:{width:900,height:1200},explicit:true,current:'1:1'}),'1:1');
  assert.equal(imageAutoRatio({values:['16:9','1:1','3:4'],reference:{width:900,height:1200}}),'3:4');
  assert.equal(imageAutoRatio({values,reference:null,explicit:true,current:'9:16'}),'9:16');
});
test('snapshot fingerprint invalidates on prompt, resolution, count, order, role and source photo',()=>{
  const base={sessionEpoch:4,settings:{engine:'seedream',prompt:'Photographic studio',resolution:'1k',aspectRatio:'16:9'},count:1,images:[],source:null};
  const k=customerImagePriceKey(base);
  for(const mutation of [
    {...base,count:2},
    {...base,settings:{...base.settings,resolution:'2k'}},
    {...base,settings:{...base.settings,prompt:'Rainy street'}},
    {...base,images:[{url:'blob:a',role:'identity'}]},
    {...base,source:{url:'blob:one',width:600,height:900}}
  ])assert.notEqual(customerImagePriceKey(mutation),k);
  const photos=[{url:'blob:a',role:'base'},{url:'blob:b',role:'identity'}];
  assert.notEqual(customerImagePriceKey({...base,images:photos}),customerImagePriceKey({...base,images:photos.toReversed()}));
});
test('outdated asynchronous quotes never replace a changed customer selection or survive sign-out',async()=>{
  let current={key:'first'},resolveFirst,refreshes=0,checks=0;
  const first=new Promise(resolve=>{resolveFirst=resolve;});
  const quote=async(s,check)=>{checks++;if(s.key==='first'){await first;check();}return {kind:'server-estimate',credits:s.key==='first'?10:32,expiresAt:Date.now()+120000};};
  const controller=createCustomerImagePricing({snapshot:()=>current,quote,changed:()=>refreshes++,delay:0});
  controller.sync(true);
  await new Promise(resolve=>setTimeout(resolve,20));
  current={key:'second'};controller.sync(true);
  resolveFirst();
  await new Promise(resolve=>setTimeout(resolve,25));
  assert.equal(controller.current().key,'second');
  assert.equal(controller.current().credits,32);
  assert.ok(checks>=2);
  controller.reset();
  assert.equal(controller.current().status,'idle');
  assert.equal(controller.consume('second'),null);
});
test('customer preview is read-only and customer generation remains behind deployment flags',()=>{
  const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  const config=readFileSync(new URL('../lab-worker/wrangler.toml',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  const lab=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(worker,/path==='\/api\/customer\/image-price'&&method==='POST'/);
  assert.match(worker,/quoteCustomerImageCredits\(p,Number\(data.count\?\?1\)/);
  assert.match(config,/LAB_PUBLIC_GENERATION_ENABLED = "false"/);
  assert.match(config,/LAB_CHECKOUT_ENABLED = "false"/);
  assert.match(studio,/lab\.js\?v=[^"']+&wallet=1/);
  assert.match(lab,/customerImagePricing\?\.consume/);
  assert.match(lab,/\.kind==='bound'&&customerPriced\.provider==='spicy'/);
  assert.match(lab,/button\.textContent='Generate · '/);
});
