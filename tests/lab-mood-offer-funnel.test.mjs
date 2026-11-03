import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {recordMoodOfferEvent} from '../lab-worker/mood-offer-funnel.mjs';

function fixture(){
  const db=new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON; CREATE TABLE lab_customers(id TEXT PRIMARY KEY); CREATE TABLE lab_migrations(id TEXT PRIMARY KEY,applied_at INTEGER); CREATE TABLE lab_generation_finance(customer_id TEXT,tool_kind TEXT,last_state TEXT);');
  db.exec(readFileSync(new URL('../lab-worker/migrations/0059-mood-offer-funnel.sql',import.meta.url),'utf8'));
  db.prepare('INSERT INTO lab_customers(id) VALUES(?)').run('user_test');
  db.prepare("INSERT INTO lab_generation_finance(customer_id,tool_kind,last_state) VALUES(?,'image','completed')").run('user_test');
  const env={LAB_DB:{prepare(sql){return {bind(...args){return {first:async()=>db.prepare(sql).get(...args)||null,run:async()=>db.prepare(sql).run(...args)};}}}};
  const post=(event,extras={},subject='user_test')=>recordMoodOfferEvent(new Request('https://example.test/api/customer/mood-offer-event',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event,...extras})}),env,subject);
  return {db,post};
}

test('tracks authenticated offer view/click once, without charging or saving browser identity',async()=>{
  const {db,post}=fixture();
  assert.equal((await post('offer_viewed')).status,200);
  assert.equal((await post('offer_viewed')).status,200);
  assert.equal((await post('offer_clicked')).status,200);
  const rows=db.prepare('SELECT customer_id,event,source FROM lab_mood_offer_funnel ORDER BY event').all();
  assert.deepEqual(rows,[
    {customer_id:'user_test',event:'offer_clicked',source:'moods_result'},
    {customer_id:'user_test',event:'offer_viewed',source:'moods_result'}
  ]);
});

test('rejects invented events and clients claiming a different account',async()=>{
  const {db,post}=fixture();
  assert.equal((await post('purchase')).status,400);
  assert.equal((await post('offer_viewed',{customerId:'user_someoneelse'})).status,400);
  assert.equal((await post('offer_viewed',{},'user_unknown')).status,409);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM lab_mood_offer_funnel').get().n,0);
});
