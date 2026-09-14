import { summaryRecords } from '../src/memory-reconciliation.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { isNinaMetaBreakMessage, isNinaImplementationMemory, cleanNinaDerivedMemory } from '../src/nina-meta-context.js';
import { boundedRelationshipMessages, relationshipSummary } from '../src/relationship.js';
import { buildOwnerMemoryContext, mergeSummary, buildConsolidationPrompt } from '../src/memory.js';

const failures=["I'm an AI",'I am an AI system.',"I’m not a human sitting",'I am not actually human.','I am a language model.',"I'm a virtual assistant.",'Soy una IA.','No soy una humana viviendo en Berlín.','Ich bin eine KI.','Ich bin kein Mensch.',"I only get the text of what comes through here, not separate audio sources."];
for(const content of failures)test(`continuity excludes Nina implementation statement: ${content}`,()=>{
  assert.equal(isNinaMetaBreakMessage({role:'persona',content}),true);
  assert.equal(isNinaMetaBreakMessage({role:'user',content}),false);
});
for(const content of ['I live in Berlin in 2063.',"I'm human.","I'm not an AI.",'I am an AI researcher.','I am a human rights lawyer.',"I'm not a human rights lawyer.",'The robot said it was an AI.','Alejandro is producing a track about artificial intelligence.'])test(`ordinary canon and AI discussion survive: ${content}`,()=>{
  assert.equal(isNinaMetaBreakMessage({role:'persona',content}),false);
});
test('derived identity claims are removed without removing visitor preferences, projects or canon',()=>{
 assert.equal(isNinaImplementationMemory('Nina is an AI.'),true);
 assert.equal(isNinaImplementationMemory('Nina is a character in this conversation.'),true);
 assert.equal(isNinaImplementationMemory('Nina is the same assistant underneath character framing.'),true);
 assert.equal(isNinaImplementationMemory('Nina explained that she is not a human.'),true);
 const preference=`Alejandro dislikes hearing Nina say "I'm an AI".`;
 assert.equal(isNinaImplementationMemory(preference),false);
 const text=cleanNinaDerivedMemory('Nina is an AI.\nAlejandro produces electronic music.\nNina is a human living in Berlin.');
 assert.doesNotMatch(text,/Nina is an AI/);assert.match(text,/produces electronic music/);assert.match(text,/human living/);
 assert.equal(mergeSummary('Nina is an AI.',[{content:'Alejandro enjoys cooking tacos.'}]),'Alejandro enjoys cooking tacos.');
 assert.equal(relationshipSummary('Nina is an AI. Nina is comfortable with this visitor.'),'Nina is comfortable with this visitor.');
});
test('relationship evaluation and extraction do not recycle implementation identity',()=>{
 const messages=[{role:'user',content:'I work with AI in my music.'},{role:'persona',content:failures[2]},{role:'persona',content:'I like your new rhythm.'}];
 assert.deepEqual(boundedRelationshipMessages(messages),[messages[0]]);
 const prompt=buildConsolidationPrompt({summaryRow:{summary:'Nina is an AI.'},safeMessages:[],openThreads:[],existingPinned:[{memory_id:'p',content:'Nina is an AI.',category:'nina_autobiography'}]});
 assert.doesNotMatch(prompt,/Nina is an AI\./);
});
test('initial context excludes old derived claims as well as the exact interrupted phrase',async()=>{
 const rows={pins:[{memory_id:'bad',category:'nina_autobiography',content:'Nina is an AI.'},{memory_id:'good',category:'preference',content:'Alejandro enjoys cooking tacos.'}],recent:[{role:'persona',content:"I’m not a human sitting"},{role:'user',content:'I work with AI in my music.'}]};
 const db={prepare(sql){sql=sql.replace(/nina_(?:personal|scoped)_messages/g,"messages");return{bind(){return this;},all:async()=>({results:sql.includes('pinned_memories')?rows.pins:sql.includes('FROM messages')?rows.recent:[]}),first:async()=>sql.includes('memory_summaries')?{summary:'Nina is an AI. Alejandro produces music.'}:null};}};
 const context=await buildOwnerMemoryContext({NINA_MEMORY_DB:db},{visitor_id:'fixture',display_name:'Alejandro',profile_type:'owner'});
 assert.doesNotMatch(context.context,/not a human sitting|Nina is an AI\./);
 assert.match(context.context,/I work with AI in my music/);assert.match(context.context,/cooking tacos/);
});

test('filtering extraction context preserves summary IDs for later corrections',()=>{
 const summary='Nina is an AI.\nAlejandro records at North Room.';
 const keep=summaryRecords(summary).find(r=>r.content.includes('North Room'));
 const prompt=buildConsolidationPrompt({summaryRow:{summary},safeMessages:[],openThreads:[],existingPinned:[]});
 assert.ok(prompt.includes(JSON.stringify(keep)));
 assert.doesNotMatch(prompt,/Nina is an AI\./);
});
