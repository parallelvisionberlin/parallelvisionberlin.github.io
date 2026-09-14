import {speechConstraints,appliedSpeechSettings,NINA_AUDIO_INPUT_REVISION} from './nina-audio-input.js?v=20260913-noise';
const start=document.getElementById('start'),stop=document.getElementById('stop'),download=document.getElementById('download');
const status=document.getElementById('status'),output=document.getElementById('report'),meter=document.getElementById('level');
let stream,context,timer,frame,report,running=false,cancelled=false,generation=0;
const show=()=>{output.textContent=JSON.stringify(report,null,2);download.disabled=false;};
async function release(){
  clearTimeout(timer);cancelAnimationFrame(frame);
  stream?.getTracks().forEach(track=>track.stop());stream=null;
  const old=context;context=null;
  if(old)await old.close().catch(()=>{});
  running=false;start.disabled=false;stop.disabled=true;meter.value=0;
}
function stopCheck(){if(!running)return;generation++;cancelled=true;if(report){report.completed=false;show();}status.textContent='Stopped. Microphone released.';void release();}
stop.addEventListener('click',stopCheck);
window.addEventListener('pagehide',stopCheck);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)stopCheck();});
start.addEventListener('click',async()=>{
  if(running)return;
  running=true;cancelled=false;start.disabled=true;stop.disabled=false;download.disabled=true;
  const attempt=++generation;
  output.textContent='';status.textContent='Allow microphone access to begin.';
  report={checkRevision:'phone-check01',audioInputRevision:NINA_AUDIO_INPUT_REVISION,checkedAt:new Date().toISOString(),completed:false,
    scope:'This browser only; no Anam session, recording, audio upload or native-app verification.'};
  try{
    const supported=navigator.mediaDevices?.getSupportedConstraints?.()||{};
    report.supported=Object.fromEntries(['echoCancellation','noiseSuppression','autoGainControl','voiceIsolation'].map(key=>[key,supported[key]===true]));
    report.requested=speechConstraints('',supported).audio;
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone capture is unavailable in this browser.');
    const acquired=await navigator.mediaDevices.getUserMedia({audio:report.requested,video:false});
    if(cancelled||attempt!==generation){acquired.getTracks().forEach(track=>track.stop());return;}
    stream=acquired;
    report.applied=appliedSpeechSettings(stream.getAudioTracks()[0]);
    const Audio=navigator.AudioContext||navigator.webkitAudioContext;
    if(!Audio)throw new Error('Audio metering is unavailable. Applied settings are still shown.');
    context=new Audio();await context.resume();
    if(cancelled||attempt!==generation)return;
    const analyser=context.createAnalyser();analyser.fftSize=2048;
    context.createMediaStreamSource(stream).connect(analyser);
    const buffer=new Float32Array(analyser.fftSize),quiet=[],speech=[];
    const begun=performance.now();let phase='';
    function sample(){
      if(cancelled||!running)return;
      const elapsed=performance.now()-begun;
      const next=elapsed<5000?'quiet':'speech';
      if(next!==phase){phase=next;status.textContent=phase==='quiet'?'Stay quiet for five seconds. Measuring background sound.':'Speak normally for five seconds now.';}
      analyser.getFloatTimeDomainData(buffer);
      const rms=Math.sqrt(buffer.reduce((sum,value)=>sum+value*value,0)/buffer.length);
      meter.value=Math.min(1,rms*5);(phase==='quiet'?quiet:speech).push(rms);
      frame=requestAnimationFrame(sample);
    }
    sample();
    timer=setTimeout(async()=>{
      const average=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
      const q=average(quiet),s=average(speech);
      report.levels={quietRms:q,speakingRms:s,speakingToQuietDb:q>0&&s>0?Math.round(20*Math.log10(s/q)*10)/10:null};
      report.completed=true;report.interpretation='Relative levels depend on following the two phases. This is not a speech-recognition or interruption test.';
      show();await release();status.textContent='Complete. Microphone released. Download the report and attach it to our chat.';
    },10000);
  }catch(error){
    if(attempt!==generation)return;
    report.error=error?.name==='NotAllowedError'?'Microphone permission was not granted.':error?.message||'Microphone check failed.';
    show();await release();status.textContent='Check incomplete. See the report below.';
  }
});
download.addEventListener('click',()=>{
  if(!report)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='nina-phone-microphone-check.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
