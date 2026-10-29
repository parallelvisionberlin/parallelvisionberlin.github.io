import test from 'node:test';
import assert from 'node:assert/strict';
import {videoCustomerQuoteLabels,videoCreditPreview} from '../lab/video-euro-pricing.js';

test('customer video quotes use only the authoritative PV credit amount',()=>{
  for (const [credits,label] of [[0,'0'],[73,'73'],[222,'222'],[1092,'1,092']]) {
    const q=videoCustomerQuoteLabels(credits);
    assert.equal(q.primary,label+' PV credits');
    assert.equal(q.detail,'Reserved from your balance when you confirm.');
    assert.equal(q.confirm,'Generate · '+label+' PV credits');
    assert.doesNotMatch(Object.values(q).join(' '),/[€$]|EUR|USD|equivalent|pack/i);
  }
});

test('invalid charges never produce a payable credit amount',()=>{
  for(const n of [null,undefined,NaN,Infinity,-1,12.5,'370',Number.MAX_SAFE_INTEGER+1])
    assert.equal(videoCustomerQuoteLabels(n),null);
});


test('Generate preview rejects invalid charges and quotes for another selection',()=>{
  const selected={type:'video',engine:'seedance',mode:'start',duration:5,resolution:'720p',audio:true,prompt:'A train'};
  const q={id:'server-quote',settings:{...selected},creditCost:73,expiresAt:Date.now()+290000,priceIsEstimate:true};
  assert.equal(videoCreditPreview(q,selected).credits,73);
  assert.equal(videoCreditPreview(q,selected).quote,q);
  assert.equal(videoCreditPreview(q,selected).estimated,true);
  for(const creditCost of [0,-1,NaN,Infinity,12.5,'73',undefined])assert.throws(()=>videoCreditPreview({...q,creditCost},selected));
  for(const [key,value] of Object.entries({engine:'wan',mode:'text',duration:10,resolution:'1080p',audio:false,prompt:'Changed'}))
    assert.throws(()=>videoCreditPreview({...q,settings:{...selected,[key]:value}},selected));
});
