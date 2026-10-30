import test from 'node:test';
import assert from 'node:assert/strict';
import {createMeasurementTransport} from '../listen/measurement-transport.mjs';
test('lost acknowledgement retries exact event UUID and payload, then stops on success',async()=>{
 const calls=[],failures=[];const client=createMeasurementTransport({fetchImpl:async(url,init)=>{calls.push(init);if(calls.length===1)throw Error('network');return new Response(null,{status:204});},wait:async()=>{},onFailure:x=>failures.push(x)});
 assert.equal(await client.send('https://test.example',{id:'same-id',event:'click'}),true);assert.equal(calls.length,2);assert.equal(calls[0].body,calls[1].body);assert.equal(calls[0].credentials,'omit');assert.deepEqual(failures,[]);
});
test('permanent rejection is reported once and never blindly retried',async()=>{
 let calls=0;const failures=[];const client=createMeasurementTransport({fetchImpl:async()=>{calls++;return new Response(null,{status:429});},onFailure:x=>failures.push(x)});
 assert.equal(await client.send('https://test.example',{id:'rate-limited'}),false);assert.equal(calls,1);assert.deepEqual(failures,[429]);
});
test('temporary failure has bounded retries and pagehide flush keeps the same receipt ID',async()=>{
 const calls=[],beacons=[];const client=createMeasurementTransport({fetchImpl:async(_,init)=>{calls.push(init.body);return new Response(null,{status:503});},wait:async()=>{},beacon:(url,blob)=>beacons.push({url,blob})});
 await client.send('https://test.example',{id:'receipt'});assert.equal(calls.length,3);client.flush();assert.equal(beacons.length,1);assert.equal(await beacons[0].blob.text(),calls[0]);
});
