import test from 'node:test';
import assert from 'node:assert/strict';
import {settledProviderCostMicros} from '../lab-worker/spicy-settlement-cost.mjs';

test('settled cost parser accepts precise USD and harmless provider floating point tails',()=>{
  for(const [input,expected] of [
    ['0',0],['2.7',2700000],['3.483900',3483900],
    ['3.4839000000000002',3483900],[3.4839,3483900],
    ['0.00000049',0],['0.00000051',1]
  ])assert.equal(settledProviderCostMicros(input),expected,String(input));
});
test('missing or malformed provider cost is UNKNOWN, never a made-up settlement',()=>{
  for(const v of [null,undefined,'',false,{},'NaN','Infinity','-1','foo','$3.50',
    '10000000000000','1;DROP TABLE jobs','2.7 USD'])
    assert.equal(settledProviderCostMicros(v),null,String(v));
});
