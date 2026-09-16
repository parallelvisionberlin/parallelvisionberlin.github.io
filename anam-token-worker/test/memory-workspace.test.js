import {modelJson} from '../src/model-json.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import vm from 'node:vm';
import {saveMemoryControl,memoryControls,controlledRows,correctionContext} from '../src/memory-controls.js';
import {memoryWorkspace} from '../src/memory-workspace.js';
import {personalContext} from '../src/persona-context.js';
import {buildOwnerMemoryContext,clearUserMemory} from '../src/memory.js';
import {journalStatements,listJournal,saveJournal,journalContext} from '../src/nina-journal.js';
import {parseCatalog,lookupCatalog} from '../src/catalog.js';
import {recordSessionSetup,storeConversationEvents,conversationDiagnostics} from '../src/conversation-diagnostics.js';
import {relationshipSummary,relationshipReviewWarranted,boundedRelationshipMessages,evaluateCompletedRelationship,getOrCreateRelationshipState,RELATIONSHIP_INPUT_BUDGET} from '../src/relationship.js';
import {attachMemoryTool,authorizeToolSession} from '../src/memory-tools.js';
function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync(new URL('../migrations/', import.meta.url)).filter(name => name.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  }
  const db = {
    prepare(sql) {
      let values=[];
      return {
        bind(...args) { values=args; return this; },
        first: async () => sqlite.prepare(sql).get(...values) || null,
        all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
        run: async () => ({meta:sqlite.prepare(sql).run(...values)})
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = []; for (const stmt of statements) results.push(await stmt.run()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    }
  };
  for (const id of ['a','b']) {
    sqlite.prepare("INSERT INTO visitors VALUES (?,?,'visitor',?,?)").run(id,id,'2026-09-10','2026-09-10');
    sqlite.prepare("INSERT INTO users (id,auth_provider,auth_subject,display_name,role,memory_visitor_id,created_at,updated_at) VALUES (?,'clerk',?,?,'user',?,?,?)").run(id,`user_${id}`,id,id,'2026-09-10','2026-09-10');
    sqlite.prepare('INSERT INTO conversations VALUES (?,?,?,NULL)').run(`call-${id}`,id,'2026-09-10');
  }
  const identity = id => ({ user_id:id,visitor_id:id,account_authenticated:true,role:'user' });
  const add = (id, role, content, key, conversation = `call-${id}`) => {
    sqlite.prepare('INSERT INTO messages VALUES (?,?,?,?,?,?)').run(key,conversation,id,role,content,'2026-09-10T01:24:21.000Z');
  };
  return { sqlite, env:{NINA_MEMORY_DB:db,NINA_CONTINUITY_ENABLED:'true',NINA_WORKSPACE_ENABLED:'true',AI:{}},identity,add };
}

const user=id=>({id,memory_visitor_id:id,role:'user'});
test('private edits survive automated original updates, reject foreign rows and stale revisions',async()=>{
 const {env,sqlite}=fixture();
 sqlite.prepare("INSERT INTO pinned_memories VALUES ('pin-a','a','preference','Old value','2026-09-10','2026-09-10')").run();
 await assert.rejects(saveMemoryControl(env,user('b'),{kind:'pin',id:'pin-a',operation:'save',content:'Intrusion',revision:0}),e=>e.status===404);
 await saveMemoryControl(env,user('a'),{kind:'pin',id:'pin-a',operation:'save',content:'The corrected value',revision:0});
 sqlite.prepare("UPDATE pinned_memories SET content='Automatic old value' WHERE memory_id='pin-a'").run();
 const context=await buildOwnerMemoryContext(env,{user_id:'a',visitor_id:'a',display_name:'A',profile_type:'visitor'});
 assert.match(context.context,/The corrected value/);assert.doesNotMatch(context.context,/Automatic old value/);
 assert.doesNotMatch((await buildOwnerMemoryContext(env,{user_id:'b',visitor_id:'b',display_name:'B'})).context,/corrected value/);
 await assert.rejects(saveMemoryControl(env,user('a'),{kind:'pin',id:'pin-a',operation:'save',content:'Stale change',revision:0}),e=>e.status===409);
});
test('manual note can be removed and restored; private profile and full deletion work',async()=>{
 const {env}=fixture(),owner=user('a');
 const created=await saveMemoryControl(env,owner,{kind:'pin',operation:'save',content:'A private corrected note',revision:0});
 await saveMemoryControl(env,owner,{kind:'pin',id:created.id,operation:'hide',revision:1});
 assert.equal((await memoryWorkspace(env,owner)).pins.length,0);
 await saveMemoryControl(env,owner,{kind:'pin',id:created.id,operation:'restore',revision:2});
 assert.equal((await memoryWorkspace(env,owner)).pins[0].content,'A private corrected note');
 await saveMemoryControl(env,owner,{kind:'profile',operation:'save',content:'Private preferences for A',revision:0});
 assert.match(await personalContext(env,'a'),/Private preferences for A/);assert.equal(await personalContext(env,'b'),'');
 await clearUserMemory(env,'a');assert.equal((await memoryControls(env,'a')).length,0);
});
test('manual notes cannot fabricate agreement evidence and corrections have a fixed prompt budget',async()=>{
 const {env}=fixture();
 await assert.rejects(saveMemoryControl(env,user('a'),{kind:'agreement',id:'x',operation:'save',content:'girlfriend',revision:0}),/conversation evidence/);
 const notes=Array.from({length:450},(_,i)=>({kind:'pin',operation:'save',content:`${i} `+'x'.repeat(498)}));
 assert.ok(correctionContext(notes).length<7500);
});
test('memory workspace reports pending completed messages and the current account’s processing result',async()=>{
 const {env,sqlite,add}=fixture();
 add('a','user','An earlier message','a1');add('a','persona','A later response','a2');add('b','user','Private to B','b1');
 sqlite.prepare("UPDATE conversations SET ended_at='2026-09-13' WHERE visitor_id IN ('a','b')").run();
 sqlite.prepare("INSERT INTO memory_summaries VALUES ('a','Existing summary','2026-09-12','a1')").run();
 sqlite.prepare("INSERT INTO nina_memory_jobs (visitor_id,user_id,conversation_id,status,last_success_at,next_attempt_at,created_at,updated_at) VALUES ('a','a','call-a','error','2026-09-12T20:00:00Z','2026-09-13T20:05:00Z','2026-09-13','2026-09-13')").run();
 const a=await memoryWorkspace(env,user('a')),b=await memoryWorkspace(env,user('b'));
 assert.equal(a.processing.status,'error');assert.equal(a.processing.pending_messages,1);assert.equal(a.processing.last_success_at,'2026-09-12T20:00:00Z');
 assert.equal(b.processing.status,'not_scheduled');assert.equal(b.processing.pending_messages,1);assert.equal(b.processing.last_success_at,undefined);
});
test('private editor shows memory retry status without provider errors and clears it on sign-out',async()=>{
 const node=()=>({children:[],textContent:'',append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;this.textContent='';},setAttribute(){},addEventListener(){}});
 const root=node(),context=vm.createContext({document:{createElement:node}});
 vm.runInContext(readFileSync(new URL('../../js/nina-memory-workspace.js',import.meta.url),'utf8').replace('export function createMemoryWorkspace','function createMemoryWorkspace'),context);
 let processing={status:'invalid_extraction',pending_messages:4,last_success_at:'2026-09-12T20:00:00Z',next_attempt_at:'2026-09-13T20:05:00Z',last_error_code:'PRIVATE_PROVIDER_ERROR'};
 const editor=context.createMemoryWorkspace({root,api:async()=>({role:'user',processing,conversations:[],agreements:[],pins:[],threads:[],removed:[],journal:[],profile:{},summary:{}})});
 const copy=n=>[n.textContent,...n.children.map(copy)].join(' ');
 editor.setIdentity('a');await editor.refresh();
 assert.match(copy(root),/Last successful update:/);assert.match(copy(root),/4 messages from completed calls/);assert.match(copy(root),/automatic retry is scheduled/);assert.doesNotMatch(copy(root),/PRIVATE_PROVIDER_ERROR|invalid_extraction/);
 processing={status:'complete',pending_messages:0,last_success_at:'2026-09-13T20:06:00Z'};await editor.refresh();
 assert.match(copy(root),/All completed-call messages have been processed/);assert.doesNotMatch(copy(root),/automatic retry/);
 editor.setIdentity('');assert.equal(copy(root),'');
});
test('journal preserves sourced fiction, private scope, revisions and explicit owner publication',async()=>{
 const {env,add}=fixture();add('a','persona','I painted a red door in my imagined studio.','studio');
 const messages=[{message_id:'studio',role:'persona',content:'I painted a red door in my imagined studio.',created_at:'2026-09-10'}];
 const pins=[{category:'nina_autobiography',content:'Nina painted a red studio door.',evidence_message_ids:['studio']}];
 await env.NINA_MEMORY_DB.batch(await journalStatements(env,'a',pins,messages,'2026-09-12'));
 await env.NINA_MEMORY_DB.batch(await journalStatements(env,'a',pins,messages,'2026-09-12'));
 const [entry]=await listJournal(env,'a');assert.equal((await listJournal(env,'a')).length,1);assert.equal((await listJournal(env,'b')).length,0);
 assert.match(await journalContext(env,'a'),/Nina's own life in Berlin 2063/);
 const body={id:entry.entry_id,kind:'independent',scope:'shared',content:'Nina’s studio door is red.',status:'active',revision:1};
 await assert.rejects(saveJournal(env,user('a'),body),e=>e.status===403);
 await saveJournal(env,{...user('a'),role:'owner'},body);
 assert.equal((await listJournal(env,'b'))[0].editable,0);
 await assert.rejects(saveJournal(env,user('b'),{...body,scope:'private',revision:2}),e=>e.status===409);
});
test('catalog parses actual website cards and retains published metadata without invented links',async()=>{
 const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');const entries=parseCatalog(html);
 const stay=entries.find(e=>e.title==='Stay Low');assert.ok(stay);assert.match(stay.artist,/Nina FOK/);assert.match(stay.details,/PV013/);assert.match(stay.url,/soundcloud/);
 const results=await lookupCatalog('PV013',async()=>new Response(html));assert.equal(results.results[0].title,'Stay Low');
 assert.equal((await lookupCatalog('nonexistent-qzxy-release')).results.length,0);
});
test('diagnostic events are private and idempotent, reject raw text and explain uncertain continuations',async()=>{
 const {env}=fixture();const audioInput={revision:'noise-control01',speechEnhancementLevel:1,silenceBeforeSkipTurnSeconds:0};
 await recordSessionSetup(env,'a','call-a',{runtimeRevision:'test',privateRecallConfigured:true,audioInput});
 const event=(sequence,kind,data,elapsedMs=sequence*1000)=>({id:`e-${sequence}`,sequence,kind,data,elapsedMs});
 const events=[event(0,'user_message',{messageId:'u1',fingerprint:'a'.repeat(64)}),event(1,'persona_utterance',{messageId:'p1',utteranceId:'part1',fingerprint:'b'.repeat(64)}),event(2,'tool_completed',{toolName:'lookup_music_catalog'}),event(3,'persona_utterance',{messageId:'p1',utteranceId:'part2',fingerprint:'b'.repeat(64)})];
 await storeConversationEvents(env,user('a'),{conversationId:'call-a',events});await storeConversationEvents(env,user('a'),{conversationId:'call-a',events});
 const report=await conversationDiagnostics(env,user('a'),'call-a');assert.equal(report.events.length,4);assert.ok(report.findings.some(f=>f.kind==='possible_repeated_answer'));assert.ok(report.findings.some(f=>f.kind==='after_tool_result'));
 assert.deepEqual(report.setup.audioInput,audioInput);
 await storeConversationEvents(env,user('a'),{conversationId:'call-a',events:[event(4,'microphone',{voiceIsolation:null,autoGainControl:false,noiseSuppression:true,audioInputRevision:'noise-control01'})]});
 const microphone=(await conversationDiagnostics(env,user('a'),'call-a')).events.find(e=>e.kind==='microphone');
 assert.equal(microphone.data.voiceIsolation,null);assert.equal(microphone.data.autoGainControl,false);
 await assert.rejects(conversationDiagnostics(env,user('b'),'call-a'),e=>e.status===404);
 await assert.rejects(storeConversationEvents(env,user('a'),{conversationId:'call-a',events:[event(4,'tool_completed',{arguments:'secret'})]}),/Unsupported/);
});
test('relationship evaluator bounds growing history and records successful no-change, invalid output and retry',async()=>{
 const {env,sqlite,add}=fixture();
 for(let i=0;i<180;i++)add('a',i%2?'persona':'user',i%2?'I hear you.':'I feel comfortable being honest with you. '+'detail '.repeat(60),`m${i}`);
 sqlite.prepare("UPDATE conversations SET ended_at='2026-09-11' WHERE conversation_id='call-a'").run();
 await getOrCreateRelationshipState(env,'a');
 let result=await evaluateCompletedRelationship(env,'a','a','call-a',{runEvaluator:async({messages})=>{assert.ok(JSON.stringify(messages).length<=RELATIONSHIP_INPUT_BUDGET);assert.ok(messages.length<=120);return 'invalid JSON';}});
 assert.equal(result.reason,'invalid_extraction');
 assert.equal(sqlite.prepare("SELECT status FROM nina_relationship_evaluations WHERE user_id='a'").get().status,'invalid_extraction');
 result=await evaluateCompletedRelationship(env,'a','a','call-a',{runEvaluator:async()=>({changed:false,changes:{},summary:'',reason:'stable'})});assert.equal(result.evaluated,true);
 const attempt=sqlite.prepare("SELECT * FROM nina_relationship_evaluations WHERE user_id='a'").get();assert.equal(attempt.status,'unchanged');assert.ok(attempt.input_characters<=RELATIONSHIP_INPUT_BUDGET);
 assert.equal((await evaluateCompletedRelationship(env,'a','a','call-a')).reason,'already_processed');
 assert.equal((await evaluateCompletedRelationship(env,'b','a','call-a')).reason,'conversation_unavailable');
});
test('bounded relationship input does not clip an individual message into a different meaning',()=>{
 const messages=[{role:'user',content:'x'.repeat(16000)},{role:'user',content:'Please stop.'},{role:'persona',content:'Okay.'}];
 const bounded=boundedRelationshipMessages(messages);assert.deepEqual(bounded,messages.slice(1));
});
test('catalog and recall use the same scoped token that expires when the conversation closes',async()=>{
 const {env,identity,sqlite}=fixture();const config={};await attachMemoryTool(config,env,identity('a'),'call-a','https://worker.example');
 assert.deepEqual(config.tools.map(t=>t.name),['recall_private_memory','lookup_music_catalog']);
 for(const tool of config.tools) {
  assert.equal(tool.method,'POST');
  assert.equal(tool.headers['User-Agent'],'ParallelVision-Nina/1.0');
  assert.equal(tool.headers['Content-Type'],'application/json');
 }
 const token=config.tools[0].headers.Authorization.slice(7);assert.equal(config.tools[1].headers.Authorization,config.tools[0].headers.Authorization);
 assert.equal((await authorizeToolSession(env,token)).user_id,'a');
 sqlite.prepare("UPDATE conversations SET ended_at='2026-09-12' WHERE conversation_id='call-a'").run();assert.equal(await authorizeToolSession(env,token),null);
});

test('live Workers AI JSON shapes are accepted and truncated responses remain invalid',()=>{
 const data={changed:false,changes:{},summary:'',reason:'stable'};
 for(const output of [data,JSON.stringify(data),{response:data},{response:JSON.stringify(data)},{choices:[{finish_reason:'stop',message:{content:JSON.stringify(data)}}]}])assert.deepEqual(modelJson(output),data);
 assert.equal(modelJson({response:data,choices:[{finish_reason:'length'}]}),null);
});

test('review eligibility recognizes substantive ordinary dialogue without requiring special emotional phrases',()=>{
 const messages=Array.from({length:8},(_,i)=>({role:i%2?'persona':'user',content:i%2?'That is a fair observation.':'I wanted to understand your view of the release and why you chose that particular idea. Could you explain what interests you about it?'}));
 assert.equal(relationshipReviewWarranted(messages),true);
 assert.equal(relationshipReviewWarranted(Array.from({length:30},(_,i)=>({role:i%2?'persona':'user',content:'Another daily check-in.'}))),false);
});

test('a tone summary cannot preserve speculative claims about the visitor’s hidden motives',()=>{
 assert.equal(relationshipSummary('Nina can be warm and direct. The person is still testing Nina’s autonomy. She may slow down when uncomfortable.'),'Nina can be warm and direct. She may slow down when uncomfortable.');
});
