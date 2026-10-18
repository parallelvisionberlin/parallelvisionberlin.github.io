import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../lab/header-credits.js',import.meta.url),'utf8');
const {creditHeaderState,renderHeaderCredits}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('credit badge uses only a verified balance for the current customer',()=>{
  for(const value of [0,1,2850]){
    const state=creditHeaderState({signed:true,profile:{customer:true,balanceCredits:value}});
    assert.equal(state.visible,true);
    assert.equal(state.status,'verified');
    assert.equal(state.label,value.toLocaleString('en-GB'));
    assert.equal(state.unit,true);
  }
  for(const value of [undefined,null,'100',Number.NaN,-1,1.5,Number.MAX_SAFE_INTEGER+1]){
    const state=creditHeaderState({signed:true,profile:{customer:true,balanceCredits:value}});
    assert.equal(state.status,'unavailable');
    assert.equal(state.unit,false);
    assert.equal(state.label,'Credits');
  }
});
test('unlinked, owner, failed and closed sessions never claim a numeric wallet',()=>{
  for(const profile of [null,{},{owner:true,customer:false,balanceCredits:650},{customer:false,balanceCredits:650}]){
    const state=creditHeaderState({signed:true,profile});
    assert.equal(state.visible,true);
    assert.equal(state.label,'Credits');
    assert.equal(state.unit,false);
  }
  const deleted=creditHeaderState({signed:true,profile:{customer:true,balanceCredits:200,accountClosed:{state:'deleted'}}});
  assert.equal(deleted.label,'Account closed');
  assert.equal(deleted.unit,false);
  assert.equal(creditHeaderState({signed:false}).visible,false);
  assert.equal(creditHeaderState({signed:false,guestVisible:true}).label,'Get credits');
});
test('switching and signout clear a previously visible credit value',()=>{
  const copy={textContent:''},unit={hidden:true};
  const link={
    hidden:true,href:'',dataset:{},title:'',attributes:{},
    querySelector(selector){return selector==='.lab-home-credit-copy'?copy:selector==='.lab-home-credit-unit'?unit:null;},
    setAttribute(key,value){this.attributes[key]=value;}
  };
  renderHeaderCredits(link,{signed:true,profile:{customer:true,balanceCredits:400}});
  assert.equal(copy.textContent,'400');
  assert.equal(unit.hidden,false);
  renderHeaderCredits(link,{signed:true,profile:null});
  assert.equal(copy.textContent,'Credits');
  assert.equal(unit.hidden,true);
  assert.match(link.attributes['aria-label'],/unavailable/i);
  assert.equal(link.href,'./account.html#balance');
  renderHeaderCredits(link,{signed:true,profile:{customer:true,balanceCredits:0}});
  assert.equal(copy.textContent,'0');
  assert.equal(unit.hidden,false);
  renderHeaderCredits(link,{signed:false});
  assert.equal(link.hidden,true);
  assert.equal(copy.textContent,'Get credits');
});
