import test from 'node:test';
import assert from 'node:assert/strict';
import {allocateGenerationCosts,parseEcbRates} from '../lab-worker/partner-generation-costs.mjs';
const at=Date.parse('2026-10-27T10:00:00Z');
const entry=(reference,deltaCredits,kind,offset)=>({id:reference,reference,deltaCredits:kind==='generation'?-Math.abs(deltaCredits):deltaCredits,kind,createdAt:at+offset});
const job=(jobId,settledCostUsd,state='completed')=>({jobId,createdAt:at+100,state,settledCostUsd});
const rates=[{day:'2026-10-27',usdPerEurMicros:1000000}];
test('FIFO keeps free gifts and later purchases out of the first purchase cost',()=>{
 const ledger=[entry('welcome:gift',100,'adjustment',0),entry('checkout:first',1000,'purchase',10),entry('job:mixed',200,'generation',20),entry('checkout:second',1000,'purchase',30),entry('job:rest',900,'generation',40),entry('job:second',1000,'generation',50)];
 const result=allocateGenerationCosts(ledger,[job('mixed',20),job('rest',20),job('second',500)],rates);
 assert.equal(result.get('welcome:gift').costCents,1000);
 assert.equal(result.get('checkout:first').costCents,3000);
 assert.equal(result.get('checkout:first').remainingCredits,0);assert.equal(result.get('checkout:first').final,true);
 assert.equal(result.get('checkout:second').costCents,50000);
});
test('a refunded failed job restores its original funding while its real cost is counted once',()=>{
 const ledger=[entry('checkout:first',1000,'purchase',0),entry('job:failed',1000,'generation',10),entry('refund:job:failed',1000,'refund',20),entry('job:retry',1000,'generation',30)];
 const result=allocateGenerationCosts(ledger,[job('failed',3,'failed'),job('retry',50)],rates).get('checkout:first');
 assert.equal(result.costCents,5300);assert.equal(result.remainingCredits,0);assert.equal(result.final,true);
});
test('settled zero is confirmed zero; failed-without-cost is never assumed free',()=>{
 const entries=[entry('checkout:first',1000,'purchase',0),entry('job:a',1000,'generation',10)];
 assert.equal(allocateGenerationCosts(entries,[job('a',0)],[]).get('checkout:first').final,true);
 assert.equal(allocateGenerationCosts(entries,[job('a',null,'failed')],rates).get('checkout:first').final,false);
 assert.equal(allocateGenerationCosts(entries,[job('a',2)],[]).get('checkout:first').final,false);
 assert.equal(allocateGenerationCosts(entries,[],rates).get('checkout:first').final,false);
});
test('partial consumption and pending providers keep the reserve open',()=>{
 const ledger=[entry('checkout:first',1000,'purchase',0),entry('job:a',100,'generation',10)];
 let lot=allocateGenerationCosts(ledger,[job('a',2)],rates).get('checkout:first');assert.equal(lot.remainingCredits,900);assert.equal(lot.final,false);
 ledger.push(entry('job:b',900,'generation',20));lot=allocateGenerationCosts(ledger,[job('a',2),job('b',2,'running')],rates).get('checkout:first');assert.equal(lot.final,false);
});
test('currency conversion uses dated USD-per-EUR quotes, including previous working day; missing or future quotes stay pending',()=>{
 const entries=[entry('checkout:first',1000,'purchase',0),entry('job:a',1000,'generation',10)];
 const result=allocateGenerationCosts(entries,[job('a',106)],[{day:'2026-10-26',usdPerEurMicros:2000000}]).get('checkout:first');assert.equal(result.costCents,5300);assert.equal(result.final,true);
 for(const date of ['2026-10-28','2026-10-01'])assert.equal(allocateGenerationCosts(entries,[job('a',106)],[{day:date,usdPerEurMicros:2000000}]).get('checkout:first').final,false);
});
test('orphan refunds or insufficient credit history never release a guessed final balance',()=>{
 const entries=[entry('checkout:first',1000,'purchase',0),entry('refund:job:missing',10,'refund',10),entry('job:a',1010,'generation',20)];
 const result=allocateGenerationCosts(entries,[job('a',0)],rates).get('checkout:first');assert.equal(result.final,false);assert.equal(result.allocationIncomplete,true);
});
test('ECB parser validates source, dated USD quotes, duplicates, stale feeds and absence of invented exchange rates',()=>{
 const feed=(date='2026-10-27',rate='1.1150')=>`<gesmes:Envelope xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref"><Cube><Cube time='${date}'><Cube currency='USD' rate='${rate}'/></Cube></Cube></gesmes:Envelope>`;
 assert.deepEqual(parseEcbRates(feed(),at),[{day:'2026-10-27',usdPerEurMicros:1115000}]);
 assert.throws(()=>parseEcbRates(feed().replace('ecb.int','wrong.invalid'),at));
 assert.throws(()=>parseEcbRates(feed('2026-10-01'),at));
 assert.throws(()=>parseEcbRates(feed('2026-10-28'),at));
 assert.throws(()=>parseEcbRates(feed('2026-10-27','0'),at));
 assert.throws(()=>parseEcbRates(feed()+feed(),at));
});
