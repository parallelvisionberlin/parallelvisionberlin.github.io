import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../js/nina-access.js',import.meta.url),'utf8');
const source=code.slice(code.indexOf('let ninaMicrophoneSwitch ='),code.indexOf('\nasync function handleNinaMicrophoneInterruption'));
function setup(change){
 const calls=[];const context={ninaClient:{changeAudioInputDevice:change},ninaAttempt:1,ninaMicrophoneStatus:{},ninaMicrophoneCleanup:()=>calls.push('detach'),listMicrophones:async()=>[{deviceId:'default',label:'Computer'}],withNinaDeadline:p=>p,ninaMicrophoneStream:{getTracks:()=>[{stop:()=>calls.push('stop-old')}]},savePreferredMicrophone:id=>calls.push(id),renderMicrophones:()=>{},logDevelopmentError:()=>{},stopNinaSession:async()=>calls.push('hangup'),ninaOverlay:{classList:{contains:()=>true}},showNinaFailure:()=>calls.push('failure')};
 vm.createContext(context);vm.runInContext(source,context);return {context,calls};
}
test('successful fallback preserves the session and transfers capture to SDK',async()=>{
 const selected=[];const {context,calls}=setup(async id=>selected.push(id));await context.switchLiveNinaMicrophone();assert.deepEqual(selected,['default']);assert.ok(!calls.includes('hangup'));assert.equal(context.ninaMicrophoneStream,null);assert.equal(context.ninaMicrophoneStatus.textContent,'MICROPHONE READY');
});
test('concurrent device events perform one switch',async()=>{
 let resolve,count=0;const {context}=setup(()=>{count++;return new Promise(r=>resolve=r);});const a=context.switchLiveNinaMicrophone();const b=context.switchLiveNinaMicrophone();await new Promise(r=>setImmediate(r));resolve();await Promise.all([a,b]);assert.equal(count,1);
});
test('failed replacement ends the session instead of charging indefinitely without input',async()=>{
 const {context,calls}=setup(async()=>{throw new Error('unavailable');});await context.switchLiveNinaMicrophone();assert.ok(calls.includes('hangup'));assert.ok(calls.includes('failure'));
});
test('late failure cannot close a newer call',async()=>{
 let reject;const {context,calls}=setup(()=>new Promise((r,j)=>reject=j));const p=context.switchLiveNinaMicrophone();await new Promise(r=>setImmediate(r));context.ninaAttempt++;reject(new Error('late'));await p;assert.ok(!calls.includes('hangup'));
});
