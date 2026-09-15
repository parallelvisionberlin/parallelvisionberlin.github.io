import { sanitizeToolError } from './nina-tool-errors.js?v=20260913-recall';
import { appliedSpeechSettings, NINA_AUDIO_INPUT_REVISION } from './nina-audio-input.js?v=20260913-noise';
// Metadata only: no audio, transcripts, tool arguments or tool results leave this collector.
export function attachConversationDiagnostics({client,events,conversationId,send,active=()=>true,stream,now=()=>performance.now()}) {
  const start=now(),salt=crypto.randomUUID(),seen=new Set(),chunks=new Map(),listeners=[],pending=new Set();
  let sequence=0,queue=[],flushing=false,stopped=false;
  const elapsed=()=>Math.max(0,Math.round(now()-start));
  const safe=value=>typeof value==='string'?value.slice(0,180):'';
  function emit(kind,data={},at=elapsed()) {
    if(sequence>=2000||queue.length>=160)return;
    queue.push({id:crypto.randomUUID(),sequence:sequence++,kind,elapsedMs:at,data});
  }
  function textEvent(kind,id,content,extra={}) {
    if(typeof id!=='string'||!id||typeof content!=='string'||!content.trim())return;
    const key=`${kind}:${id}`;if(seen.has(key))return;seen.add(key);
    if(sequence>=2000)return;
    const event={id:crypto.randomUUID(),sequence:sequence++,kind,elapsedMs:elapsed(),data:{...extra,characters:content.length}};
    const normalized=content.trim().toLowerCase().replace(/\s+/g,' ');
    const work=crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${salt}:${normalized}`)).then(bytes=>{
      event.data.fingerprint=[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
      if(queue.length<160)queue.push(event);
    }).catch(()=>{});
    pending.add(work);work.finally(()=>pending.delete(work));
  }
  async function flush() {
    if(flushing)return;flushing=true;
    try {
      await Promise.all([...pending]);
      queue.sort((a,b)=>a.sequence-b.sequence);
      while(queue.length) {
        const batch=queue.slice(0,40);
        const result=await send({conversationId,events:batch});
        if(!result)break;
        const ids=new Set(batch.map(e=>e.id));queue=queue.filter(e=>!ids.has(e.id));
      }
    }catch{/* Keep the bounded batch for the next retry. */}finally{flushing=false;}
  }
  function on(name,handler) {
    if(!events?.[name])return;
    const wrapped=value=>{if(!stopped&&active()){try{handler(value);}catch{/* Diagnostics never interrupt a call. */}}};
    client.addListener(events[name],wrapped);listeners.push([events[name],wrapped]);
  }
  function microphone(value) {
    emit('microphone',{...appliedSpeechSettings(value?.getAudioTracks?.()[0]),audioInputRevision:NINA_AUDIO_INPUT_REVISION});
  }
  on('SESSION_READY',id=>emit('session_ready',{anamSessionId:safe(id)}));
  on('USER_SPEECH_STARTED',id=>emit('speech_start',{correlationId:safe(id)}));
  on('USER_SPEECH_ENDED',id=>emit('speech_end',{correlationId:safe(id)}));
  on('TALK_STREAM_INTERRUPTED',id=>emit('interrupted',{correlationId:safe(id)}));
  on('INPUT_AUDIO_STREAM_STARTED',microphone);
  for(const [name,kind] of [['TOOL_CALL_STARTED','tool_started'],['TOOL_CALL_COMPLETED','tool_completed'],['TOOL_CALL_FAILED','tool_failed']])
    on(name,e=>emit(kind,{toolName:safe(e.toolName),toolCallId:safe(e.toolCallId),correlationId:safe(e.userActionCorrelationId),...(kind==='tool_failed'?{errorMessage:sanitizeToolError(e.errorMessage)}:{}),...(Number.isFinite(e.executionTime)&&e.executionTime>=0&&e.executionTime<=86400000?{executionTimeMs:Math.round(e.executionTime)}:{})}));
  on('MESSAGE_STREAM_EVENT_RECEIVED',e=>{
    if(e?.role!=='persona'||typeof e.id!=='string')return;
    const id=e.utteranceId||e.id,key=`${e.id}:${id}`;
    if(seen.has(`persona_utterance:${key}`))return;
    chunks.set(key,((chunks.get(key)||'')+(e.content||'')).slice(0,100000));
    if(e.endOfSpeech){textEvent('persona_utterance',key,chunks.get(key),{messageId:safe(e.id),utteranceId:safe(id),interrupted:Boolean(e.interrupted)});chunks.delete(key);}
    if(chunks.size>80)chunks.delete(chunks.keys().next().value);
  });
  on('MESSAGE_HISTORY_UPDATED',history=>{
    for(const m of Array.isArray(history)?history:[]) {
      if(!['user','persona'].includes(m?.role))continue;
      textEvent(`${m.role}_message`,m.id,m.content,{messageId:safe(m.id),interrupted:Boolean(m.interrupted)});
      if(m.role==='persona')for(const u of m.utterances?.length?m.utterances:[{id:m.id,content:m.content}])
        textEvent('persona_utterance',`${m.id}:${u.id}`,u.content,{messageId:safe(m.id),utteranceId:safe(u.id),interrupted:Boolean(m.interrupted)});
    }
  });
  if(stream)microphone(stream);
  const timer=setInterval(()=>void flush(),5000);
  return {flush,record(kind, data = {}) {
    if (stopped || !active()) return;
    if (!['connection_opened', 'video_started', 'connection_closed', 'media_failure'].includes(kind)) return;
    const metadata = {};
    if (typeof data.reason === 'string') metadata.reason = safe(data.reason);
    if (typeof data.phase === 'string') metadata.phase = safe(data.phase);
    if (typeof data.errorMessage === 'string') metadata.errorMessage = sanitizeToolError(data.errorMessage);
    emit(kind, metadata);
  },stop(){if(stopped)return;emit('client_end');stopped=true;clearInterval(timer);for(const [event,handler]of listeners)client.removeListener(event,handler);void flush();}};
}
