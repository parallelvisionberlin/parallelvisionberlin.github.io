import test from 'node:test';
import assert from 'node:assert/strict';
import {labMetaPurchasePayload,sendLabMetaPurchase,PV_LAB_META_PIXEL_ID} from '../lab-worker/meta-capi.mjs';

test('PV LAB uses its own Pixel ID, separate from Nina',()=>{
  assert.equal(PV_LAB_META_PIXEL_ID,'1087722353874433');
  assert.notEqual(PV_LAB_META_PIXEL_ID,'1746851780072706');
});
test('No Purchase signal without recorded consent',async()=>{
  const x=await labMetaPurchasePayload({subject:'user_Test123',transactionId:'cs_live_Ab123',amountCents:1000,consented:false});
  assert.equal(x,null);
  let called=false;
  const result=await sendLabMetaPurchase({LAB_META_CAPI_ACCESS_TOKEN:'test'},{subject:'user_Test123',transactionId:'cs_live_Ab123',amountCents:1000,consented:false},async()=>{called=true;});
  assert.equal(called,false);assert.equal(result.sent,false);
});
test('Generates a single EUR purchase with stable event ID and hashed subject',async()=>{
  const purchase={subject:'user_Test123',transactionId:'cs_live_Ab123',amountCents:1000,consented:true};
  const x=await labMetaPurchasePayload(purchase,1791843760000);
  const y=await labMetaPurchasePayload(purchase,1791843760000);
  assert.equal(x.data.length,1);
  assert.equal(x.data[0].event_id,y.data[0].event_id);
  assert.equal(x.data[0].event_source_url,'https://pvlab.studio/');
  assert.equal(x.data[0].custom_data.currency,'EUR');
  assert.equal(x.data[0].custom_data.value,10);
  assert.equal(x.data[0].user_data.external_id[0].length,64);
  assert.equal(JSON.stringify(x).includes('user_Test123'),false);
});
test('Only sends to PV LAB dataset with token in bearer header',async()=>{
  let target='',options;
  const fetcher=async(url,init)=>{target=url;options=init;return {ok:true};};
  const r=await sendLabMetaPurchase({LAB_META_CAPI_ACCESS_TOKEN:'private-token'},
    {subject:'user_Test123',transactionId:'in_Ab123',amountCents:1500,consented:true},fetcher);
  assert.equal(r.sent,true);
  assert.equal(target,'https://graph.facebook.com/v25.0/1087722353874433/events');
  assert.equal(options.headers.Authorization,'Bearer private-token');
  assert.equal(JSON.stringify(JSON.parse(options.body)).includes('private-token'),false);
});

test('consented Meta browser IDs improve Purchase matching, invalid IDs are excluded',async()=>{
  const purchase={subject:'user_Test123',transactionId:'cs_live_Ab123',amountCents:1000,consented:true,
    fbp:'fb.1.1791843760000.123456789123456789',fbc:'fb.1.1791843760000.ABCdef123xyz'};
  const ok=await labMetaPurchasePayload(purchase,1791843760000);
  assert.equal(ok.data[0].user_data.fbp,purchase.fbp);
  assert.equal(ok.data[0].user_data.fbc,purchase.fbc);
  const bad=await labMetaPurchasePayload({...purchase,fbp:'unsafe',fbc:'fb.invalid'},1791843760000);
  assert.equal(Object.hasOwn(bad.data[0].user_data,'fbp'),false);
  assert.equal(Object.hasOwn(bad.data[0].user_data,'fbc'),false);
  assert.equal(await labMetaPurchasePayload({...purchase,consented:false}),null);
});

test('Meta CAPI retries temporary failure once with the same event ID',async()=>{
  const calls=[];
  const fetcher=async(url,init)=>{
    calls.push({url,body:JSON.parse(init.body)});
    return calls.length===1?{ok:false,status:503}:{ok:true,status:200};
  };
  const result=await sendLabMetaPurchase({LAB_META_CAPI_ACCESS_TOKEN:'test'},
    {subject:'user_Test123',transactionId:'cs_live_Ab123',amountCents:1000,consented:true},fetcher);
  assert.deepEqual(result,{sent:true});
  assert.equal(calls.length,2);
  assert.equal(calls[0].body.data[0].event_id,calls[1].body.data[0].event_id);
  assert.equal(calls[0].url,calls[1].url);
});

test('PV LAB checkout only forwards Meta IDs with accepted cookies',()=>{
  const files=['lab/customer-entry.js','lab/customer-wallet.js','lab/account.js'];
  // Check the three independent checkout entry points and their shared bridge.
  for(const path of files) {
    const code=readFileSync(new URL('../'+path,import.meta.url),'utf8');
    assert.match(code,/metaConsentGranted\(\)/);
    assert.match(code,/metaPixelIdentifiers\(\)/);
  }
  const billing=readFileSync(new URL('../lab-worker/customer-billing.mjs',import.meta.url),'utf8');
  assert.match(billing,/const metaFbp=metaConsent&&/);
  assert.match(billing,/const metaFbc=metaConsent&&/);
  assert.match(billing,/lab_meta_fbc/);
  assert.match(billing,/lab_meta_fbp/);
});
