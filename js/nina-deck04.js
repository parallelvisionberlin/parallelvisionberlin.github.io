// App-only presentation and a passive tap on the EXISTING capture stream.
// This module never opens a microphone, records, sends audio, or changes gain.
export function installNinaDeck({getStream, document:doc=document, window:win=window}) {
 if (win.location.pathname !== '/nina-app.html' || new URLSearchParams(win.location.search).get('pv_deck') !== '04') return {dispose(){}};
 doc.body.dataset.pvDeck='04';
 const css=doc.createElement('link'); css.rel='stylesheet'; css.href='./css/nina-deck04.css?v=04'; doc.head.appendChild(css);
 const stage=doc.querySelector('.nina-stage');
 if(!stage) return {dispose(){css.remove();delete doc.body.dataset.pvDeck;}};
 const panel=doc.createElement('div'); panel.className='pv-deck-controls'; panel.hidden=true;
 panel.innerHTML='<p class="pv-deck-connected">She’s in Berlin, 2063. You’re connected.</p><button type="button" class="pv-deck-mic" aria-label="Mute microphone" aria-pressed="false" disabled><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="12" y="3" width="8" height="17" rx="4"/><path d="M8 14v2a8 8 0 0 0 16 0v-2M16 24v5M11 29h10"/><path class="pv-mic-slash" d="M5 4l22 24"/></svg></button><span class="pv-deck-mic-label" role="status" aria-live="polite">MICROPHONE OFF</span><div class="pv-deck-level" aria-label="Microphone input level"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>';
 stage.appendChild(panel);
 const button=panel.querySelector('button'), label=panel.querySelector('.pv-deck-mic-label');
 const bars=Array.from(panel.querySelectorAll('i')); const weights=[.23,.48,.77,1,.77,.48,.23];
 let disposed=false, audio=null, analyser=null, source=null, stream=null, frame=0, last=0;
 const liveTracks=()=>{try{return (getStream()?.getAudioTracks()||[]).filter(t=>t.readyState==='live');}catch{return [];}};
 const paint=level=>bars.forEach((bar,i)=>bar.style.height=`${Math.round(2+26*weights[i]*level)}px`);
 const disconnect=()=>{if(frame)win.cancelAnimationFrame(frame);frame=0;try{source?.disconnect();analyser?.disconnect();}catch{}source=null;analyser=null;stream=null;paint(0);};
 const ensureAudio=()=>{try {const C=win.AudioContext||win.webkitAudioContext;if(!C)return;if(!audio)audio=new C();if(audio.state==='suspended')void audio.resume().catch(()=>{});}catch{/* Meter failure cannot affect the call. */}};
 const update=()=>{
  if(disposed)return;
  const active=doc.body.classList.contains('nina-call-visible')&&!doc.body.classList.contains('nina-scrim-visible');
  panel.hidden=!active;
  const tracks=active?liveTracks():[];
  button.disabled=tracks.length===0;
  const muted=tracks.length>0&&tracks.every(t=>!t.enabled);
  button.setAttribute('aria-pressed',String(muted));button.setAttribute('aria-label',muted?'Unmute microphone':'Mute microphone');
  panel.classList.toggle('is-muted',muted);
  const text=tracks.length===0?'MICROPHONE OFF':muted?'MIC MUTED':tracks.some(t=>t.muted)?'INPUT INTERRUPTED':'MIC ON';
  if(label.textContent!==text)label.textContent=text;
  if(!active||!tracks.length){disconnect();return;}
  let current;try{current=getStream();}catch{return;}
  if(current!==stream){disconnect();stream=current;try{if(audio){source=audio.createMediaStreamSource(stream);analyser=audio.createAnalyser();analyser.fftSize=256;source.connect(analyser);}}catch{analyser=null;}}
  if(!frame&&analyser){const samples=new Float32Array(analyser.fftSize);const tick=now=>{if(disposed||!analyser||panel.hidden){frame=0;return;}if(now-last>=65){last=now;let level=0;try{analyser.getFloatTimeDomainData(samples);level=Math.min(1,Math.sqrt(samples.reduce((sum,x)=>sum+x*x,0)/samples.length)*5);}catch{}paint(liveTracks().every(t=>!t.enabled)?0:level);}frame=win.requestAnimationFrame(tick);};frame=win.requestAnimationFrame(tick);}
 };
 const prepare=()=>ensureAudio();
 doc.getElementById('startNina')?.addEventListener('click',prepare,true);
 button.addEventListener('click',()=>{const tracks=liveTracks();if(!tracks.length)return;const enable=tracks.every(t=>!t.enabled);tracks.forEach(t=>{t.enabled=enable;});ensureAudio();update();});
 const observer=new win.MutationObserver(update);observer.observe(doc.body,{attributes:true,attributeFilter:['class']});
 const timer=win.setInterval(update,350);update();
 const dispose=()=>{if(disposed)return;disposed=true;win.clearInterval(timer);observer.disconnect();disconnect();doc.getElementById('startNina')?.removeEventListener('click',prepare,true);try{const pending=audio?.close();pending?.catch(()=>{});}catch{}audio=null;panel.remove();win.removeEventListener('pagehide',dispose);};
 win.addEventListener('pagehide',dispose,{once:true});
 return {dispose};
}
