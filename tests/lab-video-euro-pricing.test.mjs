import test from 'node:test';
import assert from 'node:assert/strict';
import {
  euroEquivalentFromCredits, videoCustomerQuoteLabels,
  STANDARD_PACK_CREDITS, STANDARD_PACK_EUR
} from '../lab/video-euro-pricing.mjs';

test('video customer quotes lead with euro-equivalent value without hiding the credit debit',()=>{
  assert.equal(STANDARD_PACK_CREDITS,1000);
  assert.equal(STANDARD_PACK_EUR,10);
  assert.equal(euroEquivalentFromCredits(73),'€0.73');
  assert.equal(euroEquivalentFromCredits(444),'€4.44');
  assert.equal(euroEquivalentFromCredits(1092),'€10.92');
  const q=videoCustomerQuoteLabels(370);
  assert.equal(q.primary,'≈ €3.70 equivalent');
  assert.match(q.detail,/370 PV credits reserved/);
  assert.match(q.detail,/€10 \/ 1,000-credit pack/);
  assert.match(q.detail,/free credits require no new payment/i);
  assert.equal(q.confirm,'Generate · 370 PV credits');
});

test('invalid charges never produce a fake euro price',()=>{
  for(const n of [null,undefined,NaN,Infinity,-1,12.5,'370']) {
    assert.equal(euroEquivalentFromCredits(n),null);
    assert.equal(videoCustomerQuoteLabels(n),null);
  }
});
