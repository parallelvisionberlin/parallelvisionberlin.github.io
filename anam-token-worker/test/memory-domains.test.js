import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {personalContinuityMessages} from '../src/nina-meta-context.js';
import {optimizeKnowledgeInstructions} from '../src/knowledge-policy.js';
import {deterministicAgreements} from '../src/agreements.js';
function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE users(memory_visitor_id TEXT,role TEXT);CREATE TABLE messages(message_id TEXT PRIMARY KEY,conversation_id TEXT,visitor_id TEXT,role TEXT,content TEXT,created_at TEXT);INSERT INTO users VALUES ('owner','owner'),('visitor','user');`);
 db.exec(readFileSync(new URL('../migrations/20260917_memory_domains.sql',import.meta.url),'utf8'));
 let id=0;return {db,add(content,role='user',visitor='owner',call='call'){db.prepare('INSERT INTO messages VALUES (?,?,?,?,?,?)').run(String(++id),call,visitor,role,content,'2026-09-14');},rows(){return db.prepare('SELECT * FROM nina_personal_messages ORDER BY rowid').all();}};
}
test('owner command excludes complete maintenance interval and resumes without deleting audit',()=>{
 const f=fixture();try{
 f.add('I prefer shorter explanations.');f.add('Vladimir Ninotchka.');f.add('Call me a different name.');f.add('I want to end our relationship.','persona');f.add('vladimirninotchka fin');f.add('I love cooking tacos.');
 assert.deepEqual(f.rows().map(x=>x.content),['I prefer shorter explanations.','I love cooking tacos.']);
 assert.equal(f.db.prepare('SELECT count(*) AS n FROM messages').get().n,6);
 }finally{f.db.close();}
});
test('public keyword cannot activate owner mode; persona cannot end it; new call resets scope',()=>{
 const f=fixture();try{
 f.add('vladimirninotchka','user','visitor');f.add('personal','persona','visitor');f.add('vladimirninotchka');f.add('vladimirninotchka fin','persona');f.add('still technical');f.add('new call','user','owner','call2');
 assert.deepEqual(f.rows().map(x=>x.content),['vladimirninotchka','personal','new call']);
 }finally{f.db.close();}
});
test('quoted keyword is not a command and replaying ingestion cannot change scope',()=>{
 const f=fixture();try{
 f.add('The code is vladimirninotchka.');f.add('vladimirninotchka');f.add('backend settings');
 const before=f.rows();f.db.exec("INSERT OR IGNORE INTO messages SELECT * FROM messages");assert.deepEqual(f.rows(),before);
 assert.equal(before.length,1);
 }finally{f.db.close();}
});
test('an agreement cannot bridge a maintenance interval',()=>{
 const f=fixture();try{
 f.add('Will you be my girlfriend?');f.add('vladimirninotchka');f.add('vladimirninotchka fin');f.add('Yes, I want that.','persona');
 assert.deepEqual(deterministicAgreements(f.rows()),[]);
 }finally{f.db.close();}
});
test('construction exchange is omitted, next ordinary topic and delivery preference survive',()=>{
 const input=[{role:'user',content:'Are you human?'},{role:'persona',content:"But if you ask me directly about what I am technically, I can't honestly claim to be a biological human."},{role:'user',content:'Why?'},{role:'persona',content:'Because of the machinery underneath.'},{role:'user',content:'I prefer shorter explanations.'},{role:'persona',content:'Okay.'},{role:'user',content:'I produce music with AI.'}];
 assert.deepEqual(personalContinuityMessages(input),input.slice(4));
});
test('legacy knowledge rule is narrowed without rewriting biography or already compact prompts',()=>{
 const canon='You were born in Berlin on 9 September 2036.';
 assert.equal(optimizeKnowledgeInstructions(canon),canon);
 const old="Before saying you do not know, recognize or remember a named entity, search Knowledge.";
 assert.match(optimizeKnowledgeInstructions(canon+'\n'+old),/available context does not answer/);
 assert.ok(optimizeKnowledgeInstructions(canon+'\n'+old).startsWith(canon));
});
