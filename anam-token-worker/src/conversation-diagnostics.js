import { sanitizeToolError } from '../../js/nina-tool-errors.js';
import { MemoryEditError, workspaceEnabled } from './memory-controls.js';

const KINDS=new Set(['session_ready','speech_start','speech_end','user_message','persona_message','persona_utterance','tool_started','tool_completed','tool_failed','interrupted','microphone','client_end']);
const STRING_FIELDS=new Set(['messageId','utteranceId','correlationId','toolName','toolCallId','fingerprint','anamSessionId']);
const BOOL_FIELDS=new Set(['echoCancellation','noiseSuppression','autoGainControl','interrupted']);
export async function recordSessionSetup(env,userId,conversationId,setup) {
  if(!workspaceEnabled(env)||!conversationId||!userId)return;
  const safe={runtimeRevision:setup.runtimeRevision,systemTools:setup.systemTools,privateRecallConfigured:setup.privateRecallConfigured===true,catalogConfigured:setup.catalogConfigured===true};
  const now=new Date().toISOString();
  await env.NINA_MEMORY_DB.prepare(`INSERT OR IGNORE INTO nina_session_diagnostics(conversation_id,user_id,setup_json,created_at,updated_at)
    VALUES (?,?,?,?,?)`).bind(conversationId,userId,JSON.stringify(safe),now,now).run();
}
async function ownConversation(env,user,id) {
  if(typeof id!=='string'||id.length>100)throw new MemoryEditError('Invalid conversation.');
  const row=await env.NINA_MEMORY_DB.prepare('SELECT conversation_id,ended_at FROM conversations WHERE conversation_id=? AND visitor_id=?')
    .bind(id,user.memory_visitor_id).first();
  if(!row)throw new MemoryEditError('Conversation not found.',404);
  return row;
}
export async function storeConversationEvents(env,user,body) {
  const row=await ownConversation(env,user,body?.conversationId);
  if(row.ended_at&&Date.now()-Date.parse(row.ended_at)>3600000)throw new MemoryEditError('This conversation is closed.',409);
  if(!Array.isArray(body.events)||!body.events.length||body.events.length>40)throw new MemoryEditError('Send 1 to 40 events.');
  const statements=[];
  for(const event of body.events) {
    if(!event||typeof event.id!=='string'||!/^[\w-]{1,100}$/.test(event.id)||!KINDS.has(event.kind)
      ||!Number.isSafeInteger(event.sequence)||event.sequence<0||event.sequence>=2000
      ||!Number.isSafeInteger(event.elapsedMs)||event.elapsedMs<0||event.elapsedMs>86400000)throw new MemoryEditError('Invalid diagnostic event.');
    const data={};
    for(const [key,value] of Object.entries(event.data||{})) {
      if(key==='errorMessage'&&typeof value==='string')data[key]=sanitizeToolError(value);
      else if(key==='executionTimeMs'&&Number.isSafeInteger(value)&&value>=0&&value<=86400000)data[key]=value;
      else if(STRING_FIELDS.has(key)&&typeof value==='string'&&value.length<=180)data[key]=value;
      else if(BOOL_FIELDS.has(key)&&(typeof value==='boolean'||value===null))data[key]=value;
      else if(key==='characters'&&Number.isSafeInteger(value)&&value>=0&&value<=100000)data[key]=value;
      else throw new MemoryEditError('Unsupported diagnostic field.');
    }
    if(data.fingerprint&&!/^[a-f0-9]{64}$/.test(data.fingerprint))throw new MemoryEditError('Invalid event fingerprint.');
    statements.push(env.NINA_MEMORY_DB.prepare(`INSERT OR IGNORE INTO nina_conversation_events(conversation_id,event_id,sequence,kind,elapsed_ms,data_json)
      VALUES (?,?,?,?,?,?)`).bind(body.conversationId,event.id,event.sequence,event.kind,event.elapsedMs,JSON.stringify(data)));
    if(event.kind==='session_ready'&&/^[a-f0-9-]{36}$/i.test(data.anamSessionId||''))statements.push(env.NINA_MEMORY_DB.prepare(`UPDATE nina_session_diagnostics SET anam_session_id=?,updated_at=?
      WHERE conversation_id=? AND user_id=?`).bind(data.anamSessionId,new Date().toISOString(),body.conversationId,user.id));
  }
  await env.NINA_MEMORY_DB.batch(statements);
  return {accepted:body.events.length};
}
export function analyzeConversationEvents(events) {
  const findings=[];let user=null,lastSpeechEnd=null,lastPersona=null,lastTool=null;
  const utterances=new Set(),userIds=new Set();
  for(const e of events) {
    const d=e.data||{};
    if(e.kind==='speech_end')lastSpeechEnd=e;
    if(e.kind==='user_message'&&!userIds.has(d.messageId)) {
      userIds.add(d.messageId);
      if(user&&d.fingerprint&&d.fingerprint===user.data.fingerprint&&e.elapsedMs-user.elapsedMs<15000)
        findings.push({kind:'possible_duplicate_input',at:e.elapsedMs,detail:'Different user message IDs contain the same text within 15 seconds. This can also be an intentional repetition.'});
      user=e;lastPersona=null;lastTool=null;
    }
    if(e.kind==='tool_completed')lastTool=e;
    if(e.kind==='persona_utterance') {
      const key=d.utteranceId||d.messageId;if(utterances.has(key))continue;utterances.add(key);
      if(lastPersona) {
        const repeated=d.fingerprint&&d.fingerprint===lastPersona.data.fingerprint;
        findings.push({kind:repeated?'possible_repeated_answer':'multiple_spoken_parts',at:e.elapsedMs,
          detail:repeated?'A different utterance repeated the same text without a new user message.':'More than one spoken part followed the same user turn. This can be a normal multi-part answer.'});
        if(lastTool&&lastTool.elapsedMs>=lastPersona.elapsedMs)findings.push({kind:'after_tool_result',at:e.elapsedMs,detail:'The next spoken part followed a completed tool call without a new user message.'});
        else if(e.elapsedMs-lastPersona.elapsedMs>8000&&(!lastSpeechEnd||lastSpeechEnd.elapsedMs<lastPersona.elapsedMs))
          findings.push({kind:'continuation_after_gap',at:e.elapsedMs,detail:'Speech continued after a gap with no new recorded input. The SDK does not confirm a silence trigger.'});
      }
      lastPersona=e;
    }
  }
  return findings.slice(0,100);
}
export async function conversationDiagnostics(env,user,id) {
  await ownConversation(env,user,id);
  const [setup,records,toolRecords]=await Promise.all([
    env.NINA_MEMORY_DB.prepare('SELECT anam_session_id,setup_json FROM nina_session_diagnostics WHERE conversation_id=? AND user_id=?').bind(id,user.id).first(),
    env.NINA_MEMORY_DB.prepare('SELECT sequence,kind,elapsed_ms,data_json FROM nina_conversation_events WHERE conversation_id=? ORDER BY sequence LIMIT 2000').bind(id).all(),
    env.NINA_MEMORY_DB.prepare('SELECT diagnostic_json,created_at FROM nina_tool_diagnostics WHERE conversation_id=? AND user_id=? ORDER BY created_at LIMIT 100').bind(id,user.id).all()
  ]);
  const events=(records.results||[]).map(e=>({sequence:e.sequence,kind:e.kind,elapsedMs:e.elapsed_ms,data:JSON.parse(e.data_json)}));
  return {conversationId:id,anamSessionId:setup?.anam_session_id||null,setup:setup?JSON.parse(setup.setup_json):null,events,toolRequests:(toolRecords.results||[]).map(r=>({...JSON.parse(r.diagnostic_json),createdAt:r.created_at})),findings:analyzeConversationEvents(events),
    note:events.length?'Events show timing and correlations; findings are candidates, not a confirmed cause.':'No event trace was captured for this conversation. New website calls will record diagnostics.'};
}
