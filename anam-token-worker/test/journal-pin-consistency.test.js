import assert from 'node:assert/strict';
import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {journalStatements,listJournal,journalContext,saveJournal} from '../src/nina-journal.js';
import {saveMemoryControl,memoryControls,controlledRows} from '../src/memory-controls.js';

const migration='20260915_journal_pin_links.sql';
const user=id=>({id,memory_visitor_id:id,role:'user'});
function fixture({legacy=false}={}) {
 const sqlite=new DatabaseSync(':memory:');
 for(const name of readdirSync(new URL('../migrations/',import.meta.url)).filter(n=>n.endsWith('.sql')&&(!legacy||n!==migration)).sort())sqlite.exec(readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8'));
 const db={prepare(sql){let params=[];return {bind(...args){params=args;return this;},first:async()=>sqlite.prepare(sql).get(...params)||null,all:async()=>({results:sqlite.prepare(sql).all(...params)}),run:async()=>({meta:sqlite.prepare(sql).run(...params)})};},async batch(statements){if(db.beforeBatch)await db.beforeBatch();sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 for(const id of ['a','b']) {
  sqlite.prepare("INSERT INTO visitors VALUES (?,?,'visitor','2026-09-13','2026-09-13')").run(id,id);
  sqlite.prepare("INSERT INTO users (id,auth_provider,auth_subject,display_name,role,memory_visitor_id,created_at,updated_at) VALUES (?,'clerk',?,?,'user',?,'2026-09-13','2026-09-13')").run(id,id,id,id);
  sqlite.prepare("INSERT INTO conversations VALUES (?,?, '2026-09-13', '2026-09-13')").run(`call-${id}`,id);
 }
 const env={NINA_MEMORY_DB:db,NINA_WORKSPACE_ENABLED:'true'};
 function pin(id,content='Nina has a red studio door.',visitor='a') {sqlite.prepare("INSERT INTO pinned_memories VALUES (?,?,'nina_autobiography',?,'2026-09-13','2026-09-13')").run(id,visitor,content);}
 async function extract(id,content='Nina has a red studio door.',source='source-1') {
  sqlite.prepare("INSERT OR IGNORE INTO messages VALUES (?,'call-a','a','persona',?,'2026-09-13')").run(source,content);
  await db.batch(await journalStatements(env,'a',[{memory_id:id,category:'nina_autobiography',content,evidence_message_ids:[source]}],[{message_id:source,role:'persona',content,created_at:'2026-09-13'}],'2026-09-13'));
 }
 return {sqlite,env,pin,extract,db};
}
const body=(entry,changes={})=>({id:entry.entry_id,kind:entry.kind,scope:entry.scope,content:entry.content,status:entry.status,revision:entry.revision,...changes});
async function visiblePins(f,id='a') {return controlledRows(f.sqlite.prepare('SELECT * FROM pinned_memories WHERE visitor_id=?').all(id),await memoryControls(f.env,id,id),'pin','memory_id');}

test('journal corrections and removal update the linked pin and survive transcript replay',async()=>{
 const f=fixture();f.pin('pin-a');await f.extract('pin-a');let [entry]=await listJournal(f.env,'a');
 await saveJournal(f.env,user('a'),body(entry,{content:'Nina has a blue studio door.'}));
 assert.equal((await visiblePins(f))[0].content,'Nina has a blue studio door.');
 await f.extract('pin-a','Nina has a red studio door.','source-2');
 assert.equal((await listJournal(f.env,'a')).length,1);assert.match(await journalContext(f.env,'a'),/blue studio door/);assert.doesNotMatch(await journalContext(f.env,'a'),/red studio door/);
 [entry]=await listJournal(f.env,'a');await saveJournal(f.env,user('a'),body(entry,{status:'hidden'}));
 await f.extract('pin-a','Nina has a red studio door.','source-3');
 assert.equal((await visiblePins(f)).length,0);assert.equal(await journalContext(f.env,'a'),'');assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM nina_journal_entries').get().n,1);
 assert.equal((await listJournal(f.env,'b')).length,0);
});

test('pin edits and hides synchronize journals and reject a stale journal editor',async()=>{
 const f=fixture();f.pin('pin-a');await f.extract('pin-a');const [original]=await listJournal(f.env,'a');
 await saveMemoryControl(f.env,user('a'),{kind:'pin',id:'pin-a',operation:'save',category:'nina_autobiography',content:'Nina has a green studio door.',revision:0});
 let [entry]=await listJournal(f.env,'a');assert.equal(entry.content,'Nina has a green studio door.');assert.equal(entry.revision,original.revision+1);
 await assert.rejects(saveJournal(f.env,user('a'),body(original,{content:'Stale change'})),e=>e.status===409);
 await saveMemoryControl(f.env,user('a'),{kind:'pin',id:'pin-a',operation:'hide',revision:1});
 assert.equal(await journalContext(f.env,'a'),'');await f.extract('pin-a','Nina has a red studio door.','source-2');assert.equal(await journalContext(f.env,'a'),'');
 await saveMemoryControl(f.env,user('a'),{kind:'pin',id:'pin-a',operation:'restore',revision:2});
 [entry]=await listJournal(f.env,'a');assert.equal(entry.content,'Nina has a red studio door.');
});

test('automatic updates replace the linked journal version and its evidence without creating a second active fact',async()=>{
 const f=fixture();f.pin('pin-a');await f.extract('pin-a');
 f.sqlite.prepare("UPDATE pinned_memories SET content='Nina has a yellow studio door.' WHERE memory_id='pin-a'").run();
 await f.extract('pin-a','Nina has a yellow studio door.','source-2');
 const entries=await listJournal(f.env,'a');assert.equal(entries.length,1);assert.equal(entries[0].content,'Nina has a yellow studio door.');assert.equal(entries[0].source_message_id,'source-2');assert.equal(entries[0].revision,2);
});

test('private corrections never publish through a previously shared journal entry',async()=>{
 const f=fixture();f.pin('pin-a');await f.extract('pin-a');
 f.sqlite.prepare("UPDATE nina_journal_entries SET scope='shared'").run();
 assert.equal((await listJournal(f.env,'b')).length,1);
 f.sqlite.prepare("UPDATE pinned_memories SET content='Nina keeps a private blue room.' WHERE memory_id='pin-a'").run();
 await f.extract('pin-a','Nina keeps a private blue room.','source-2');
 assert.equal((await listJournal(f.env,'a'))[0].scope,'private');assert.equal((await listJournal(f.env,'b')).length,0);
 const [entry]=await listJournal(f.env,'a');
 await saveJournal(f.env,{...user('a'),role:'owner'},body(entry,{scope:'shared'}));
 assert.equal((await listJournal(f.env,'b')).length,1);
 await saveMemoryControl(f.env,user('a'),{kind:'pin',id:'pin-a',operation:'save',category:'nina_autobiography',content:'Nina keeps a second private room.',revision:1});
 assert.equal((await listJournal(f.env,'b')).length,0);
});

test('journal edit cannot overwrite a concurrent linked pin correction',async()=>{
 const f=fixture();f.pin('pin-a');await f.extract('pin-a');const [entry]=await listJournal(f.env,'a');
 f.db.beforeBatch=async()=>{f.db.beforeBatch=null;await saveMemoryControl(f.env,user('a'),{kind:'pin',id:'pin-a',operation:'save',category:'nina_autobiography',content:'Nina has a black studio door.',revision:0});};
 await assert.rejects(saveJournal(f.env,user('a'),body(entry,{content:'Nina has a white studio door.'})),e=>e.status===409);
 assert.equal((await visiblePins(f))[0].content,'Nina has a black studio door.');assert.equal((await listJournal(f.env,'a'))[0].content,'Nina has a black studio door.');
});

test('pin links and edits are confined to their owning account',async()=>{
 const f=fixture();f.pin('pin-a');f.pin('pin-b','Nina has a red studio door.','b');await f.extract('pin-a');const [entry]=await listJournal(f.env,'a');
 await assert.rejects(saveJournal(f.env,user('b'),body(entry)),e=>e.status===409);
 assert.throws(()=>f.sqlite.prepare("UPDATE nina_journal_entries SET pin_memory_id='pin-b' WHERE entry_id=?").run(entry.entry_id),/another account/);
 await saveJournal(f.env,user('a'),body(entry,{content:'Nina has a purple studio door.'}));assert.equal((await visiblePins(f,'b'))[0].content,'Nina has a red studio door.');
});

test('migration links only exact account-owned legacy copies and applies existing hidden pin controls',async()=>{
 const f=fixture({legacy:true});f.pin('pin-a');f.pin('pin-b','Nina has a red studio door.','b');
 f.sqlite.prepare("INSERT INTO nina_journal_entries(entry_id,user_id,visitor_id,kind,content,origin,recorded_at,updated_at) VALUES ('old','a','a','independent','Nina has a red studio door.','conversation','2026-09-13','2026-09-13')").run();
 await saveMemoryControl(f.env,user('a'),{kind:'pin',id:'pin-a',operation:'hide',revision:0});
 f.sqlite.exec(readFileSync(new URL(`../migrations/${migration}`,import.meta.url),'utf8'));
 const entry=f.sqlite.prepare("SELECT * FROM nina_journal_entries WHERE entry_id='old'").get();assert.equal(entry.pin_memory_id,'pin-a');assert.equal(entry.status,'hidden');assert.equal(await journalContext(f.env,'b'),'');
});

test('hidden entries do not consume the active journal context limit',async()=>{
 const f=fixture();for(let i=0;i<170;i++)f.sqlite.prepare("INSERT INTO nina_journal_entries(entry_id,user_id,visitor_id,kind,content,status,origin,recorded_at,updated_at) VALUES (?,'a','a','independent','Hidden fact','hidden','editor','2026-09-13','2026-09-14')").run(`hidden-${i}`);
 f.pin('pin-a');await f.extract('pin-a');assert.equal((await listJournal(f.env,'a')).length,1);
});
