import test from 'node:test';
import assert from 'node:assert/strict';
import { speechConstraints, inputLevel, createAppMicrophone } from '../js/nina-microphone.js';
function fixture() {
  const track = new EventTarget();
  Object.assign(track,{readyState:'live',enabled:true,muted:false,label:'Test microphone',stops:0,stop(){this.stops++;this.readyState='ended';},getSettings(){return {echoCancellation:true,deviceId:'mic-1'};}});
  return {track, stream:{getTracks:()=>[track],getAudioTracks:()=>[track]}};
}
test('requests supported speech processing as ideal constraints, not forced gain or sample rate',()=>{
  assert.deepEqual(speechConstraints('mic',{echoCancellation:true,autoGainControl:true}),{audio:{deviceId:{exact:'mic'},echoCancellation:{ideal:true},autoGainControl:{ideal:true}},video:false});
  assert.deepEqual(speechConstraints('',{}),{audio:true,video:false});
});
test('meter measures level and peaks without claiming intelligibility',()=>{
  assert.equal(inputLevel([0,0,0]).db,-90);
  assert.ok(Math.abs(inputLevel([0.1,-0.1]).db+20)<1e-7);
  assert.equal(inputLevel([0,1]).peak,1);
  assert.ok(Number.isFinite(inputLevel([NaN]).db));
});
test('parallel requests share one microphone and reuse the same live track',async()=>{
  const f=fixture();let calls=0;const mic=createAppMicrophone({mediaDevices:{getUserMedia:async()=>{calls++;return f.stream;}}});
  const streams=await Promise.all([mic.acquire(),mic.acquire()]);
  assert.equal(calls,1);assert.equal(streams[0],streams[1]);assert.equal(await mic.acquire(),f.stream);assert.equal(calls,1);mic.stop();assert.equal(f.track.stops,1);
});
test('close while permission is pending immediately disposes any late stream',async()=>{
  const f=fixture();let resolve;const mic=createAppMicrophone({mediaDevices:{getUserMedia:()=>new Promise(r=>resolve=r)}});
  const p=mic.acquire();mic.stop();resolve(f.stream);await assert.rejects(p,{name:'AbortError'});assert.equal(f.track.stops,1);assert.equal(mic.getStream(),null);
});
test('unavailable saved route falls back once and records actual system-default selection',async()=>{
  const f=fixture();let calls=0;const mic=createAppMicrophone({mediaDevices:{getUserMedia:async()=>{if(++calls===1)throw Object.assign(new Error(),{name:'NotFoundError'});return f.stream;}}});
  await mic.acquire('missing');assert.equal(calls,2);assert.equal(mic.report().selected,'');assert.equal(mic.report().label,'Test microphone');assert.equal(mic.report().settings.noiseSuppression,null);mic.stop();
});
test('permission denial is not retried or misreported as a missing microphone',async()=>{
  let calls=0;const mic=createAppMicrophone({mediaDevices:{getUserMedia:async()=>{calls++;throw Object.assign(new Error(),{name:'NotAllowedError'});}}});
  await assert.rejects(mic.acquire('saved'),{name:'NotAllowedError'});assert.equal(calls,1);
});
test('ended track triggers one interruption; intentional close triggers none',async()=>{
  const f=fixture();let interruptions=0;const mic=createAppMicrophone({mediaDevices:{getUserMedia:async()=>f.stream},onInterrupted:()=>interruptions++});
  await mic.acquire();f.track.dispatchEvent(new Event('ended'));f.track.dispatchEvent(new Event('ended'));assert.equal(interruptions,1);mic.stop();f.track.dispatchEvent(new Event('ended'));assert.equal(interruptions,1);
});
test('brief hardware interruption recovers, prolonged mute is surfaced',async()=>{
  const f=fixture();let interruptions=0;const mic=createAppMicrophone({mediaDevices:{getUserMedia:async()=>f.stream},muteTimeoutMs:10,onInterrupted:()=>interruptions++});
  await mic.acquire();f.track.muted=true;f.track.dispatchEvent(new Event('mute'));f.track.muted=false;f.track.dispatchEvent(new Event('unmute'));await new Promise(r=>setTimeout(r,20));assert.equal(interruptions,0);
  f.track.muted=true;f.track.dispatchEvent(new Event('mute'));await new Promise(r=>setTimeout(r,20));assert.equal(interruptions,1);mic.stop();
});
test('unavailable level meter cannot prevent capture and silence is never treated as disconnection',async()=>{
  const f=fixture();const mic=createAppMicrophone({mediaDevices:{getUserMedia:async()=>f.stream}});await mic.acquire();assert.equal(mic.startMeter(),false);assert.equal(f.track.readyState,'live');mic.stop();
});
test('analyser observes the original stream, never connects audio to a speaker, and closes',async()=>{
  const f=fixture();let captured,closed=0,disconnected=0,readings=[];
  class Context {
    state='running';
    resume(){return Promise.resolve();}
    createMediaStreamSource(stream){captured=stream;return {connect:destination=>assert.equal(destination,this.analyser),disconnect:()=>disconnected++};}
    createAnalyser(){return this.analyser={fftSize:1024,getFloatTimeDomainData:a=>a.fill(0.1),disconnect:()=>disconnected++};}
    close(){closed++;this.state='closed';return Promise.resolve();}
  }
  const mic=createAppMicrophone({mediaDevices:{getUserMedia:async()=>f.stream},AudioContextClass:Context,onReading:v=>readings.push(v)});
  await mic.acquire();assert.equal(mic.startMeter(),true);await new Promise(r=>setTimeout(r,120));
  assert.equal(captured,f.stream);assert.ok(readings.length>0);assert.ok(Math.abs(mic.report().bestDb+20)<0.01);
  mic.stopMeter();assert.equal(closed,1);assert.equal(disconnected,2);assert.equal(f.track.stops,0);mic.stop();assert.equal(f.track.stops,1);
});
