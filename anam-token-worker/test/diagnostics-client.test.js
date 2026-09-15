import assert from 'node:assert/strict';
import test from 'node:test';
import {attachConversationDiagnostics} from '../../js/nina-diagnostics.js';

test('connection diagnostics preserve reason while removing details that may contain secrets', async () => {
 const sent=[];
 const tracker=attachConversationDiagnostics({client:{addListener(){},removeListener(){}},events:{},conversationId:'c',send:async body=>{sent.push(...body.events);return true;}});
 tracker.record('media_failure',{reason:'video_stalled',phase:'playback',errorMessage:'Failed https://private.example?token=secret',transcript:'must not be sent'});
 await tracker.flush();tracker.stop();await tracker.flush();
 const failure=sent.find(e=>e.kind==='media_failure');
 assert.equal(failure.data.reason,'video_stalled');
 assert.equal(failure.data.phase,'playback');
 assert.doesNotMatch(JSON.stringify(sent),/private.example|token=secret|must not be sent/);
});
test('collector ignores replayed history, captures new utterances and never sends tool secrets',async()=>{
 const handlers=new Map(),sent=[];let clock=0;
 const names=['MESSAGE_HISTORY_UPDATED','MESSAGE_STREAM_EVENT_RECEIVED','TOOL_CALL_COMPLETED','USER_SPEECH_STARTED','USER_SPEECH_ENDED'];
 const client={addListener(name,fn){handlers.set(name,fn);},removeListener(name){handlers.delete(name);}};
 const tracker=attachConversationDiagnostics({client,events:Object.fromEntries(names.map(n=>[n,n])),conversationId:'c',now:()=>clock,send:async body=>{sent.push(...body.events);return{accepted:body.events.length};}});
 const user={id:'u',role:'user',content:'Hello'},part={id:'p',role:'persona',content:'Hello back',utterances:[{id:'one',content:'Hello back'}]};
 handlers.get('MESSAGE_HISTORY_UPDATED')([user,part]);clock=1000;handlers.get('MESSAGE_HISTORY_UPDATED')([user,part]);
 handlers.get('TOOL_CALL_COMPLETED')({toolName:'recall_private_memory',toolCallId:'t',userActionCorrelationId:'u',result:'private secret',arguments:{query:'secret'}});
 clock=2000;handlers.get('MESSAGE_HISTORY_UPDATED')([user,{...part,content:'Hello back. A second part.',utterances:[...part.utterances,{id:'two',content:'A second part.'}]}]);
 await tracker.flush();tracker.stop();await tracker.flush();
 assert.equal(sent.filter(e=>e.kind==='user_message').length,1);assert.equal(sent.filter(e=>e.kind==='persona_utterance').length,2);
 assert.doesNotMatch(JSON.stringify(sent),/private secret|A second part|Hello back|arguments/);
 assert.ok(sent.find(e=>e.kind==='persona_utterance').data.fingerprint.match(/^[a-f0-9]{64}$/));assert.equal(handlers.size,0);
});

test('tool failure keeps a useful redacted explanation and measured execution time',async()=>{
 const handlers=new Map(),sent=[];
 const tracker=attachConversationDiagnostics({client:{addListener:(n,f)=>handlers.set(n,f),removeListener:n=>handlers.delete(n)},events:{TOOL_CALL_FAILED:'failed'},conversationId:'c',send:async b=>{sent.push(...b.events);return true;}});
 handlers.get('failed')({toolName:'recall_private_memory',errorMessage:`HTTP 401 at https://secret.example?token=hidden Bearer ${'a'.repeat(64)}`,executionTime:145});
 await tracker.flush();tracker.stop();await tracker.flush();
 const error=sent.find(e=>e.kind==='tool_failed').data;assert.match(error.errorMessage,/HTTP 401/);assert.equal(error.executionTimeMs,145);
 assert.doesNotMatch(JSON.stringify(sent),/secret.example|hidden|aaaaaaaa/);
});
