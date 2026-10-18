import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quoteCustomerImageCredits} from '../lab-worker/customer-image-pricing.mjs';
import {creditsForUsd} from '../lab-worker/customer-billing.mjs';
import {customerImagePriceKey,pricedBoundQuotes,imageAutoRatio} from '../lab/image-credit-preview.js';
import {createCustomerImagePricing} from '../lab/customer-image-pricing.js';

test('backend-rated image quote uses current model costs and counts, never client prices',()=>{
  assert.throws(()=>quoteCustomerImageCredits({type:'image',engine:'flash'},4),/bound provider quote/);
  const kling=quoteCustomerImageCredits({type:'image',engine:'kling'},3);
  assert.equal(kling.credits,creditsForUsd(.028)*3);
  const gemini=quoteCustomerImageCredits({type:'image',engine:'gemini',processing:'normal'},4,{geminiEstimateMicros:()=>134000});
  assert.equal(gemini.credits,creditsForUsd(.134)*4);
  const batch=quoteCustomerImageCredits({type:'image',engine:'gemini',processing:'batch'},20,{geminiEstimateMicros:()=>67000});
  assert.equal(batch.credits,creditsForUsd(.067)*20);
  assert.throws(()=>quoteCustomerImageCredits({type:'image',engine:'gemini',processing:'normal'},20,{geminiEstimateMicros:()=>134000}),/four normal/);
  for(const [res,cost,credits] of [['1k',33600,8],['2k',50400,10],['4k',113000,20]]){
    const p={type:'image',provider:'gemini',engine:'gemini21',model:'gemini-nano-banana-2.1',processing:'normal',resolution:res};
    const q=quoteCustomerImageCredits(p,2,{geminiEstimateMicros:()=>cost});
    assert.equal(q.credits,2*credits);
    assert.equal(q.perImageCredits,credits);
  }
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
test('Image ratio inherits first uploaded photo, stays 16:9 without an image, and honors manual choices',()=>{
  const values=['auto','16:9','9:16','1:1','4:3','3:4'];
  assert.equal(imageAutoRatio({values,reference:null,current:'auto'}),'16:9');
  assert.equal(imageAutoRatio({values,reference:{width:900,height:1200}}),'3:4');
  assert.equal(imageAutoRatio({values,reference:{width:1080,height:1920}}),'9:16');
  assert.equal(imageAutoRatio({values,reference:{width:1920,height:1080}}),'16:9');
  assert.equal(imageAutoRatio({values,reference:{width:1024,height:1024}}),'1:1');
  assert.equal(imageAutoRatio({values,reference:{width:900,height:1200},explicit:true,current:'1:1'}),'1:1');
  assert.equal(imageAutoRatio({values,reference:{width:900,height:1200},explicit:true,current:'auto'}),'auto');
  assert.equal(imageAutoRatio({values:['16:9','1:1','3:4'],reference:{width:900,height:1200}}),'3:4');
  assert.equal(imageAutoRatio({values,reference:null,explicit:true,current:'9:16'}),'9:16');
  assert.equal(imageAutoRatio({values,reference:{width:900,height:1200},resolveSourceRatio:false}),'auto',
    'Video mode can retain a genuine provider-managed Auto ratio');
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
test('customer preview is read-only and public generation switches are deliberately enabled',()=>{
  const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  const config=readFileSync(new URL('../lab-worker/wrangler.toml',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  const lab=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(worker,/path==='\/api\/customer\/image-price'&&method==='POST'/);
  assert.match(worker,/quoteCustomerImageCredits\(p,Number\(data.count\?\?1\)/);
  assert.match(config,/LAB_PUBLIC_GENERATION_ENABLED = "true"/);
  assert.match(config,/LAB_CHECKOUT_ENABLED = "true"/);
  assert.match(studio,/lab\.js\?v=[^"']+&wallet=1/);
  assert.match(lab,/customerImagePricing\?\.consume/);
  assert.match(lab,/\.kind==='bound'&&customerPriced\.provider==='spicy'/);
  // The compact deck has an independent label. Assert the real label handoff, not a retired textContent assignment.
  assert.match(lab,/generate\.querySelector\('\.composer-generate-label'\)\.textContent=generateActionLabel/);
});

test('first-image Generate clicks through the pricing debounce and reuses one bound quote',async()=>{
  let requested=0,released;const gate=new Promise(resolve=>{released=resolve;});
  const draft={key:'welcome-dream-blur'};
  const preview=createCustomerImagePricing({
    snapshot:()=>draft,
    quote:async(s,check)=>{requested++;await gate;check();return {kind:'bound',credits:25,expiresAt:Date.now()+120000};},
    changed:()=>{},delay:850
  });
  assert.equal(preview.sync(true).status,'checking');
  const click=preview.readyForClick(draft.key);
  assert.equal(requested,1,'Click must start quote immediately, without an 850ms timer');
  assert.equal(preview.current().status,'checking');
  released();const price=await click;
  assert.equal(price.credits,25);
  assert.equal(preview.consume(draft.key)?.credits,25);
  assert.equal(requested,1,'Preview and paid click share the same one quote');
  assert.equal(preview.consume(draft.key),null,'A quote cannot be consumed twice');
});

test('curated cards immediately prime live pricing, but stale quotes can never be consumed',async()=>{
  let calls=0,released;const gate=new Promise(resolve=>{released=resolve;});
  let draft={key:'green-haze'};
  const preview=createCustomerImagePricing({
    snapshot:()=>draft,
    quote:async(s,check)=>{
      calls++;
      if(s.key==='green-haze'){await gate;check();}
      return {kind:'bound',credits:25,expiresAt:Date.now()+120000};
    },changed:()=>{},delay:850
  });
  preview.prime();
  assert.equal(calls,1,'Card click starts pricing without the typing debounce');
  const firstClick=preview.readyForClick('green-haze');
  draft={key:'sun-fade'};preview.sync(true);
  released();
  await assert.rejects(firstClick,/changed|confirmed/i);
  assert.equal(preview.consume('green-haze'),null,'No stale provider price can be paid');
  preview.prime();
  const latest=await preview.readyForClick('sun-fade');
  assert.equal(latest.credits,25);
  assert.equal(calls,2);
  preview.reset(); // Do not keep the Node test runner alive with the quote expiry timer.
});

test('signed-in first-image page has one boot reveal and a selected-only Mood highlight',()=>{
  const lab=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const welcome=readFileSync(new URL('../lab/image-welcome-editorial.css',import.meta.url),'utf8');
  const guest=readFileSync(new URL('../lab/studio-guest-image.css',import.meta.url),'utf8');
  const guestPrompt=readFileSync(new URL('../lab/studio-guest-image.js',import.meta.url),'utf8');
  const priceStyle=readFileSync(new URL('../lab/studio-finish-v2.css',import.meta.url),'utf8');
  const marker=lab.indexOf('const historyReady=loadHistory()');
  assert.ok(marker>0);
  const onHistorySettled=lab.indexOf("document.body.classList.contains('lab-ready'))showWelcomeStart(data)",marker);
  const grace=lab.indexOf('await Promise.race([historyReady,',marker);
  const firstImage=lab.indexOf('if(historyResolved)showWelcomeStart(data);',grace);
  const reveal=lab.indexOf('finishLabBoot();',firstImage);
  assert.ok(marker<onHistorySettled&&onHistorySettled<grace&&grace<firstImage&&firstImage<reveal,
    'First-image welcome must await real History while a delayed private fetch cannot freeze the signed-in workspace');
  assert.match(welcome,/\.lab-welcome-preset\[aria-pressed="true"\]/);
  assert.doesNotMatch(welcome,/\.lab-welcome-preset:first-child/);
  assert.doesNotMatch(guest,/\.pv-guest-card:first-child/);
  assert.match(priceStyle,/\.composer-generate:not\(\.is-submitting\)::after/);
  assert.match(lab,/customerImagePricing\?\.prime\(\)/);
  assert.match(lab,/customerImagePricing\.readyForClick\(snapshot\.key\)/);
  const sharedPrompts=readFileSync(new URL('../lab/inspiration-looks.js',import.meta.url),'utf8');
  assert.match(lab,/const welcomePrompts=INSPIRATION_VARIATIONS/);
  assert.match(guestPrompt,/createInspirationRotation\(sessionStorage\)/);
  assert.match(lab,/inspirationRotation\.select\(id,\$\('prompt'\)\.value\)/);
  assert.match(sharedPrompts,/jade-green-lit corner shop/);
  assert.match(sharedPrompts,/older dark sedan/);
  assert.match(lab,/disableAutoMoodReferences/);
  assert.match(lab,/preserveWorkspace/);
});
