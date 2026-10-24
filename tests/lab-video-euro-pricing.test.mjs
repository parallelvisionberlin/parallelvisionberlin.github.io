import test from 'node:test';
import assert from 'node:assert/strict';
import {videoCustomerQuoteLabels} from '../lab/video-euro-pricing.js';

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
