import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localCurrency,parseRates} from '../lab-worker/local-currency.mjs';
const time=Date.parse('2026-11-02T10:00:00Z');
const xml="<Cube time='2026-10-30'><Cube currency='USD' rate='1.10'/><Cube currency='BRL' rate='6.20'/><Cube currency='MXN' rate='21.10'/><Cube currency='JPY' rate='170'/></Cube>";
const verified=parseRates(xml,time);
function request(country,url='https://lab.test/api/public/local-currency'){
  const req=new Request(url,{headers:{'CF-IPCountry':'BR'}});
  if(country)Object.defineProperty(req,'cf',{value:{country}});
  return req;
}
test('Brazil and Mexico use edge country and verified ECB rates, never browser overrides',async()=>{
  for(const [country,currency,rate] of [['BR','BRL',6.2],['MX','MXN',21.1],['JP','JPY',170]]){
    const response=await localCurrency(request(country,'https://lab.test/api/public/local-currency?country=US&rate=0.01'),{getRates:async()=>verified});
    const data=await response.json();
    assert.equal(data.currency,currency);assert.equal(data.rate,rate);assert.equal(data.approximate,true);
    assert.equal(data.rateDate,'2026-10-30');assert.equal(response.headers.get('cache-control'),'private, no-store');
    assert.equal(data.customer,undefined);
  }
});
test('Eurozone, missing country and unsupported countries do not call a rate provider',async()=>{
  for(const country of ['DE','FR','XX','AR',undefined]){
    const data=await (await localCurrency(request(country),{getRates:async()=>{throw Error('Must not fetch');}})).json();
    assert.deepEqual(data,{currency:'EUR',locale:'en-IE',rate:1,approximate:false});
  }
});
test('unavailable or missing local exchange rates retain the real EUR price',async()=>{
  for(const getRates of [async()=>{throw Error('Timeout');},async()=>({rates:{},date:'2026-10-30'})]){
    assert.equal((await (await localCurrency(request('BR'),{getRates})).json()).currency,'EUR');
  }
});
test('stale, future, incomplete and invalid exchange data cannot fabricate local prices',()=>{
  assert.equal(verified.rates.BRL,6.2);
  for(const value of [xml.replace('2026-10-30','2026-10-01'),xml.replace('2026-10-30','2026-11-06'),xml.replace("rate='6.20'","rate='0'"),'<html>Error</html>'])assert.throws(()=>parseRates(value,time));
});
