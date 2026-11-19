import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seedanceReferenceOwnerEstimate} from '../lab/video-reference-owner-quote.js';

const quote=(seconds=13,output=8)=>({
  provider:'SpicyAPI',maxUsd:6.3042,estimatedUsd:6.3042,
  settings:{
    type:'video',engine:'seedance',mode:'reference',
    model:'bytedance/seedance-2.5/reference-to-video',
    referenceFixedChargeVersion:'reference-seconds-v1',
    referenceBillableVideoSeconds:seconds,
    referenceVideoIds:['motion-reference'],duration:output,resolution:'720p',audio:true
  }
});

test('owner sees expected 13s input plus 8s output, not the full 38s provider hold',()=>{
  const r=seedanceReferenceOwnerEstimate(quote());
  assert.deepEqual(r,{
    estimatedUsd:3.4839,maxUsd:6.3042,estimatedReleaseUsd:2.8203,
    billableVideoSeconds:13,outputSeconds:8
  });
});

test('owner reference quote at 5s output uses corresponding supplier maximum',()=>{
  const q=quote(13,5);q.maxUsd=5.8065;
  const r=seedanceReferenceOwnerEstimate(q);
  assert.equal(r.estimatedUsd,2.9862);
  assert.equal(r.estimatedReleaseUsd,2.8203);
});

test('display estimation fails closed without verified reference and for other video modes',()=>{
  const q=quote();
  const cases=[
    {...q,provider:'Higgsfield'},
    {...q,maxUsd:0},
    {...q,maxUsd:NaN},
    {...q,priceIsEstimate:true},
    {...q,settings:{...q.settings,referenceFixedChargeVersion:''}},
    {...q,settings:{...q.settings,referenceVideoIds:[]}},
    {...q,settings:{...q.settings,referenceBillableVideoSeconds:31}},
    {...q,settings:{...q.settings,referenceBillableVideoSeconds:12.4}},
    {...q,settings:{...q.settings,duration:31}},
    {...q,settings:{...q.settings,mode:'transform'}},
    {...q,settings:{...q.settings,engine:'wan'}}
  ];
  cases.forEach(x=>assert.equal(seedanceReferenceOwnerEstimate(x),null));
});

test('owner-only quote presentation keeps the PV credit charges and provider bounds unchanged',()=>{
  const source=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const helper=readFileSync(new URL('../lab/video-reference-owner-quote.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  assert.match(source,/referenceOwnerEstimate=!customerMode\?seedanceReferenceOwnerEstimate\(q\):null/);
  assert.match(source,/referenceOwnerEstimate\?money\(referenceOwnerEstimate\.estimatedUsd\)/);
  assert.match(source,/SpicyAPI temporarily reserves/);
  assert.match(html,/id="quote-provider-caution"/);
  assert.doesNotMatch(helper,/fetch\(|creditCost|\/api\/jobs/);
});
