import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {webcrypto} from 'node:crypto';
import {createCustomerImagePricing} from '../lab/customer-image-pricing.js';

const source=readFileSync('lab/lab.js','utf8');
function section(start,end){const a=source.indexOf(start),b=end?source.indexOf(end,a):source.length;assert.ok(a>=0&&b>a);return source.slice(a,b);}
const apiCode=section('async function api(path,options={}) {','async function action(fn)');
const feedbackCode=section('function beginImageFeedback(count,selected,ratio){','let assetLibrary=null;');
const submitCode=section('async function submitImageSnapshot(){');

function fixture({balance=100,response='credit',explicit=true,intent=null,reviewResult=true,issue=''}={}){
  const calls=[],notices=[],opened=[],pending=new Map(),reviews=[];let refreshes=0,priceConsumes=0;
  const controls=new Map(['generate','image-count','prompt'].map(id=>[id,{value:id==='image-count'?'1':'A photographic portrait',dataset:{}}]));
  const settings={type:'image',mode:'image',engine:'seedream',prompt:'A photographic portrait',resolution:'1k',aspectRatio:'16:9'};
  const priced={kind:'bound',provider:'spicy',count:1,credits:35,inputs:{sourceId:null,referenceSourceIds:[]},quotes:[{id:'q',settings,maxUsd:.1,expiresAt:Date.now()+90000}]};
  const env={console,Error,TypeError,JSON,Date,Number,Math,Set,Map,Array,Blob,ArrayBuffer,AbortController,setTimeout,clearTimeout,setInterval,clearInterval,structuredClone,crypto:webcrypto,
    owner:true,epoch:1,userId:'customer',customerMode:true,customerBillingReady:true,customerGenerationReady:true,customerTrialGenerationPaused:false,
    customerCreditBalance:balance,tool:'image',busy:false,imageSubmissionPending:explicit,customerPriceIntentPending:false,imageSubmissionStage:'Sending…',
    imageEngine:'seedream',imageProcessing:'normal',fashionActive:false,activeJobs:[],slotStates:new Set(['submitting','queued','running','uncertain']),
    window:{__PV_LAB_NATIVE__:0},config:{enabled:true},sourceId:null,file:null,poseMapSourceId:null,references:[],inspirationMoodId:'',sourceWidth:900,sourceHeight:1200,
    pendingImageCards:pending,requestControllers:new Set(),assetLibrary:{active:()=>false},
    $:id=>controls.get(id),notify:(...args)=>notices.push(args),
    sessionRequest:async(path,options)=>{
      calls.push({path,method:options.method});
      if(response==='network')throw new TypeError('Failed to fetch');
      if(response==='provider')return {ok:false,status:402,json:async()=>({error:'Higgsfield: Add API credit in Higgsfield.'})};
      if(response==='credit')return {ok:false,status:402,json:async()=>({error:'Insufficient PV Lab credits. Add credits before generating.'})};
      return {ok:true,json:async()=>({job:{id:'accepted-job',settings,status:'queued'}})};
    },
    wallet:{refresh:()=>{refreshes++;}},pricingOverlay:{open:options=>opened.push(options)},
    fastImageHandoff:{has:()=>false,slots:()=>0},currentImageSubmissionKey:()=>'',hasInput:()=>true,submissionBlocked:()=>false,
    replacementIntentIssue:()=>issue,imageReferenceMode:'base',referenceRoles:()=>[],currentReplacementIntent:()=>intent,reviewedReplacement:()=>env.reviewedSelection||null,
    replacementReviewPending:false,replacementDraftKey:()=> 'replacement-draft',preserveReplacementRatio:()=>{},
    imageReplacement:{review:async context=>{reviews.push(context);if(env.reviewBarrier)await env.reviewBarrier;if(reviewResult)env.reviewedSelection={scope:'person'};return reviewResult;}},usesReferenceGuidance:()=>false,currentProvider:()=> 'spicy',jobProvider:()=> 'spicy',
    imageCreditQuoteSnapshot:()=>({key:'draft'}),customerImagePricing:{consume:()=>{priceConsumes++;return priced;},reset:()=>{}},
    settings:()=>settings,shouldOmitAutomaticMoodReferencesForInspiration:()=>false,
    isReinterpret:()=>false,imageInputReferences:()=>[],limitFor:()=>4,modelImageInputIssue:()=>null,
    moodReferences:{prepare:async selected=>({settings:selected,references:[]})},prepareQuoteInputs:async inputs=>inputs,
    syncImageGalleryEmpty:()=>{},renderPendingImageCards:()=>{},detailModelName:()=> 'Seedream 5 Pro',
    update:()=>{},clearImageComposerNotice:()=>{},setActive:()=>{},surfaceHistoryJob:()=>{},refreshHistorySoon:()=>{},moodDiscoveryOpen:false
  };
  new Script(apiCode+'\n'+feedbackCode+'\n'+submitCode+'\nthis.submit=submitImageSnapshot;this.request=api;').runInNewContext(env);
  return {env,calls,notices,opened,pending,reviews,priceConsumes:()=>priceConsumes,refreshes:()=>refreshes,resetReady(){env.imageSubmissionPending=false;}};
}

test('19 credits against a verified 35-credit price opens plans before any job or local card',async()=>{
  const f=fixture({balance:19});f.resetReady();await f.env.submit();
  assert.equal(f.opened.length,1);assert.equal(f.calls.length,0);assert.equal(f.pending.size,0);assert.equal(f.notices.length,0);
  assert.equal(f.env.$('prompt').value,'A photographic portrait');
});
test('a definitive server wallet rejection removes preparation without a failure toast or unknown job',async()=>{
  const f=fixture();f.resetReady();await f.env.submit();
  assert.deepEqual(f.calls.map(c=>c.path),['/api/jobs']);assert.equal(f.opened.length,1);
  assert.equal(f.pending.size,0);assert.equal(f.notices.length,0);assert.equal(f.refreshes(),1);
  assert.equal(f.env.imageSubmissionPending,false);
});
test('unknown paid submission transport failures keep their review card and never retry automatically',async()=>{
  const f=fixture({response:'network'});f.resetReady();await f.env.submit();
  assert.equal(f.calls.length,1);assert.equal(f.opened.length,0);assert.equal(f.notices.length,1);
  assert.equal([...f.pending.values()][0].title,'Request not confirmed');
});
test('provider HTTP 402 is not misrepresented as a customer credit purchase',async()=>{
  const f=fixture({response:'provider'});f.resetReady();await f.env.submit();
  assert.equal(f.opened.length,0);assert.equal(f.notices.length,1);assert.equal(f.calls.length,1);
  assert.match(f.notices[0][0],/Higgsfield/);assert.equal(f.pending.size,1);
});
test('background funding rejection never opens plans before an explicit Generate click',async()=>{
  const f=fixture({explicit:false});
  await assert.rejects(f.env.request('/api/quotes',{method:'POST'}),e=>e.code==='PV_LAB_CREDITS_REQUIRED');
  assert.equal(f.opened.length,0);assert.equal(f.notices.length,0);
});
test('customer pricing preserves the credit outcome even when refreshing the wallet invalidates the snapshot',async()=>{
  const error=Object.assign(new Error('Insufficient PV Lab credits'),{code:'PV_LAB_CREDITS_REQUIRED'});
  let current={key:'draft'},controller;
  controller=createCustomerImagePricing({snapshot:()=>current,quote:async()=>{current=null;controller.reset();throw error;},changed:()=>{},delay:500});
  await assert.rejects(controller.readyForClick('draft'),e=>e===error);
});
test('customer pricing preserves the typed rejection from an ordinary price failure',async()=>{
  const error=Object.assign(new Error('Insufficient PV Lab credits'),{code:'PV_LAB_CREDITS_REQUIRED'});
  const controller=createCustomerImagePricing({snapshot:()=>({key:'draft'}),quote:async()=>{throw error;},changed:()=>{},delay:500});
  await assert.rejects(controller.readyForClick('draft'),e=>e===error);controller.reset();
});

const walletSource=readFileSync('lab/customer-wallet.js','utf8');
const purchaseCode=walletSource.slice(walletSource.indexOf('  async function purchase(sku'),walletSource.indexOf('  function open(){'));
function checkoutFixture(before){
  const events=[];const env={account:true,billingReady:true,accountClosed:false,billingReview:false,purchasing:false,accountEpoch:1,
    URL,setTimeout,state:{},update(){},beforeCheckout:async()=>{events.push('save');await before?.(env);},
    api:async()=>{events.push('checkout');return {url:'https://checkout.stripe.com/c/pay/mock'};},
    metaConsentGranted:()=>false,trackLabEvent:()=>false,location:{assign(){events.push('navigate');}},notify(){events.push('notice');}};
  new Script(purchaseCode+'\nthis.purchase=purchase;').runInNewContext(env);return {env,events};
}
test('private draft is saved before checkout creation or leaving Studio',async()=>{
  const f=checkoutFixture();assert.equal(await f.env.purchase('topup3'),true);
  assert.deepEqual(f.events,['save','checkout','navigate']);
});
test('draft storage failure keeps the user in Studio and never creates checkout',async()=>{
  const f=checkoutFixture(()=>{throw Error('Draft storage unavailable');});
  assert.equal(await f.env.purchase('topup3'),false);assert.deepEqual(f.events,['save','notice']);
});
test('account switch during draft save cannot start checkout for the next account',async()=>{
  const f=checkoutFixture(env=>{env.accountEpoch++;});
  assert.equal(await f.env.purchase('topup3'),false);assert.deepEqual(f.events,['save']);
});


test('replacement review completes before any price consumption or paid submission',async()=>{
  const intent={scope:'person',targetPrompt:'woman on the left',referenceIndex:1};
  const f=fixture({response:'accepted',intent});f.resetReady();
  await f.env.submit();
  assert.equal(f.reviews.length,1);
  assert.equal(f.priceConsumes(),0);
  assert.equal(f.calls.length,0);
  assert.equal(f.pending.size,0);
  assert.equal(f.env.replacementReviewPending,false);
  await f.env.submit();
  assert.equal(f.reviews.length,1);
  assert.equal(f.priceConsumes(),1);
  assert.equal(f.calls.filter(call=>call.path==='/api/jobs').length,1);
});
test('double click during selection review prepares exactly one review and no paid job',async()=>{
  const f=fixture({response:'accepted',intent:{scope:'face',targetPrompt:'face',referenceIndex:1}});f.resetReady();
  let release;f.env.reviewBarrier=new Promise(resolve=>{release=resolve;});
  const first=f.env.submit();
  await f.env.submit();
  assert.equal(f.reviews.length,1);
  assert.equal(f.priceConsumes(),0);
  release();await first;
  assert.equal(f.calls.length,0);
});
test('cancelled or ambiguous replacement requests never consume a generation price',async()=>{
  const cancelled=fixture({response:'accepted',intent:{scope:'object',targetPrompt:'phone',referenceIndex:1},reviewResult:false});cancelled.resetReady();
  await cancelled.env.submit();
  assert.equal(cancelled.priceConsumes(),0);assert.equal(cancelled.calls.length,0);
  assert.equal(cancelled.env.reviewedSelection,undefined);
  const ambiguous=fixture({response:'accepted',issue:'Name the Character to use.'});ambiguous.resetReady();
  await ambiguous.env.submit();
  assert.equal(ambiguous.reviews.length,0);assert.equal(ambiguous.priceConsumes(),0);assert.equal(ambiguous.calls.length,0);
  assert.match(ambiguous.notices[0][0],/Name the Character/);
});
