import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = file => readFileSync(file,'utf8');

test('Model policy display preference defaults off and is scoped to each account in the browser', async()=>{
  const source=read('lab/model-policy-preferences.js');
  const {readProviderPolicyDetails,setProviderPolicyDetails}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const values=new Map();
  const previous=globalThis.localStorage;
  globalThis.localStorage={
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>{values.set(key,value);},
    removeItem:key=>{values.delete(key);}
  };
  try{
    assert.equal(readProviderPolicyDetails('customer-one'),false);
    assert.equal(readProviderPolicyDetails('customer-two'),false);
    assert.equal(readProviderPolicyDetails(''),false);
    assert.equal(setProviderPolicyDetails('customer-one',true),true);
    assert.equal(readProviderPolicyDetails('customer-one'),true);
    assert.equal(readProviderPolicyDetails('customer-two'),false,'a separate account cannot inherit an opt-in');
    assert.equal(setProviderPolicyDetails('customer-one',false),true);
    assert.equal(readProviderPolicyDetails('customer-one'),false);
  }finally{
    if(previous===undefined)delete globalThis.localStorage;
    else globalThis.localStorage=previous;
  }
});

test('Studio keeps all models, hides promotion badges, and preserves subtle Video dots',()=>{
  const lab=read('lab/lab.js'),video=read('lab/video-model-picker.js');
  const account=read('lab/account.html');
  assert.doesNotMatch(lab,/Artistic Freedom|composer-model-freedom/);
  assert.match(lab,/readProviderPolicyDetails\(userId\)/);
  assert.match(video,/pv-video-model-moderation-dot/);
  assert.match(video,/filterRow.hidden=!policyDetails/);
  assert.match(video,/Extend uses Higgsfield\. Provider policies still apply\./);
  assert.match(account,/id="settings-model-policy-details"/);
  assert.match(account,/saved in this browser for your account/);
});
