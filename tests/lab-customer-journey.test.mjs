import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {recordCustomerJourneyEvent,pruneCustomerJourney,validJourneyEvent} from '../lab-worker/customer-journey.mjs';

const sql=readFileSync(new URL('../lab-worker/migrations/0062-customer-journey.sql',import.meta.url),'utf8');
function fixture(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  db.exec('PRAGMA foreign_keys=ON; CREATE TABLE lab_customers(id TEXT PRIMARY KEY); CREATE TABLE lab_migrations(id TEXT PRIMARY KEY,applied_at INTEGER NOT NULL);');
  db.prepare('INSERT INTO lab_customers(id) VALUES(?)').run('user_Alpha');
  db.prepare('INSERT INTO lab_customers(id) VALUES(?)').run('user_Beta');
  db.exec(sql);
  return {db,env:{LAB_DB:{prepare(stmt){return {bind(...args){return {run:async()=>db.prepare(stmt).run(...args)}}}}}},count:()=>db.prepare('SELECT COUNT(*) n FROM lab_customer_journey').get().n};
}
function post(data,headers={}){
  return new Request('https://example.test/api/customer/journey-event',{
    method:'POST',headers:{'Content-Type':'application/json',...headers},
    body:typeof data==='string'?data:JSON.stringify(data)
  });
}
test('authenticated milestone is recorded once per day; repeat bursts are throttled',async t=>{
  const f=fixture(t),now=Date.parse('2026-11-08T13:00:00Z');
  const event={event:'studio_opened',surface:'studio'};
  assert.equal((await recordCustomerJourneyEvent(post(event),f.env,'user_Alpha',{clock:()=>now})).status,200);
  await recordCustomerJourneyEvent(post(event),f.env,'user_Alpha',{clock:()=>now+2000});
  let row=f.db.prepare('SELECT * FROM lab_customer_journey').get();
  assert.equal(row.event_count,1);assert.equal(row.first_at,now);assert.equal(row.last_at,now);
  await recordCustomerJourneyEvent(post(event),f.env,'user_Alpha',{clock:()=>now+32000});
  row=f.db.prepare('SELECT * FROM lab_customer_journey').get();
  assert.equal(row.event_count,2);assert.equal(row.last_at,now+32000);
  await recordCustomerJourneyEvent(post(event),f.env,'user_Alpha',{clock:()=>now+86400000});
  assert.equal(f.count(),2,'one row per customer, day, event, surface, detail');
});
test('customer separation and restrained model / Berlin Rave reporting',async t=>{
  const f=fixture(t),clock=()=>Date.parse('2026-11-08T16:00:00Z');
  for(const [customer,event,surface,detail] of [
    ['user_Alpha','mood_selected','moods','berlin-rave'],
    ['user_Alpha','generate_clicked','moods','none'],
    ['user_Beta','model_selected','studio','seedream'],
    ['user_Beta','checkout_clicked','billing','none']
  ])assert.equal((await recordCustomerJourneyEvent(post({event,surface,detail}),f.env,customer,{clock})).status,200);
  assert.equal(f.count(),4);
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM lab_customer_journey WHERE customer_id='user_Alpha'").get().n,2);
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM lab_customer_journey WHERE customer_id='user_Beta'").get().n,2);
  assert.ok(f.db.prepare("SELECT 1 ok FROM lab_customer_journey WHERE detail='berlin-rave'").get());
});
test('reject unknown keys, raw content, arbitrary model values and invalid requests',async t=>{
  const f=fixture(t);
  for(const value of [
    {event:'studio_opened',surface:'studio',email:'private@example.com'},
    {event:'mood_selected',surface:'moods',detail:'my private text'},
    {event:'model_selected',surface:'studio',detail:'../../files'},
    {event:'offer_viewed',surface:'studio',detail:'berlin-rave'},
    {event:'mood_selected',surface:'billing',detail:'berlin-rave'},
    {event:'purchase_verified',surface:'billing'},
    {event:'generate_clicked',surface:'video'},
    {event:'generate_clicked',surface:'studio',detail:'none',prompt:'Private prompt'},
    [1,2,3]
  ]){
    assert.equal(validJourneyEvent(value),false);
    assert.equal((await recordCustomerJourneyEvent(post(value),f.env,'user_Alpha')).status,400);
  }
  assert.equal((await recordCustomerJourneyEvent(post('{broken json'),f.env,'user_Alpha')).status,400);
  assert.equal((await recordCustomerJourneyEvent(post({event:'studio_opened',surface:'studio',extra:'a'.repeat(250)}),f.env,'user_Alpha')).status,413);
  assert.equal(f.count(),0);
});
test('DNT and GPC block collection and 90-day retention removes old milestones',async t=>{
  const f=fixture(t),now=Date.parse('2026-11-08T14:00:00Z');
  const event={event:'generate_clicked',surface:'studio'};
  for(const headers of [{DNT:'1'},{'Sec-GPC':'1'}]){
    const r=await recordCustomerJourneyEvent(post(event,headers),f.env,'user_Alpha',{clock:()=>now});
    assert.deepEqual(await r.json(),{ok:true,recorded:false});
  }
  assert.equal(f.count(),0);
  await recordCustomerJourneyEvent(post(event),f.env,'user_Alpha',{clock:()=>now-91*86400000});
  await recordCustomerJourneyEvent(post(event),f.env,'user_Alpha',{clock:()=>now-2*86400000});
  assert.equal(f.count(),2);
  await pruneCustomerJourney(f.env,{clock:()=>now});
  assert.equal(f.count(),1);
});
