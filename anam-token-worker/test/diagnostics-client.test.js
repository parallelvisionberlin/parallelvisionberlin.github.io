import assert from 'node:assert/strict';
import test from 'node:test';
import {attachConversationDiagnostics} from '../../js/nina-diagnostics.js';
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
