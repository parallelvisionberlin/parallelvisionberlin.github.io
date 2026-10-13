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
