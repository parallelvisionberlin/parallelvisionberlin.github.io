import test from 'node:test';
import assert from 'node:assert/strict';
import { openSpeechMicrophone, microphoneFailure } from '../js/nina-audio-input.js';
test('missing saved device retries with unrestricted default capture', async () => {
 const calls=[]; const stream={};
 const result=await openSpeechMicrophone({getUserMedia:async c=>{calls.push(c);if(calls.length===1)throw {name:'NotFoundError'};return stream;}},'removed-device');
 assert.equal(result,stream);assert.deepEqual(calls[1],{audio:true,video:false});assert.equal(calls.length,2);
});
test('permission and hardware errors do not retry or get the same message', async()=>{
 for(const name of ['NotAllowedError','NotReadableError']){
 let calls=0;await assert.rejects(openSpeechMicrophone({getUserMedia:async()=>{calls++;throw {name};}}),e=>e.name===name);assert.equal(calls,1);
 }
 assert.notEqual(microphoneFailure({name:'NotAllowedError'}),microphoneFailure({name:'NotReadableError'}));
});
test('closing the overlay suppresses fallback after a pending device error',async()=>{
 let calls=0;await assert.rejects(openSpeechMicrophone({getUserMedia:async()=>{calls++;throw {name:'NotFoundError'};}},'old',()=>false));assert.equal(calls,1);
});
