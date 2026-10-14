import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {recordLabTraffic,labTrafficReport,pruneLabTraffic} from '../lab-worker/traffic.mjs';
import {labAdminRoute} from '../lab-worker/promotions.mjs';

const NOW=Date.parse('2026-10-15T12:40:00Z');
function fixture(t){
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  db.exec("CREATE TABLE lab_migrations(id TEXT PRIMARY KEY, applied_at INTEGER)");
  db.exec("CREATE TABLE lab_customers(id TEXT PRIMARY KEY,created_at INTEGER NOT NULL)");
  db.exec(readFileSync(new URL('../lab-worker/migrations/0018-anonymous-traffic.sql',import.meta.url),'utf8'));
  const binding={prepare(sql){return {bind(...values){const statement=db.prepare(sql);return {
    async first(){return statement.get(...values)||null;},
    async run(){const result=statement.run(...values);return {meta:{changes:result.changes}};},
    async all(){return {results:statement.all(...values)};}
  };}};}};
  const env={LAB_DB:binding,OWNER_DB:{prepare(){return {bind(id){return {
    async first(){return id==='owner_live'?{id}:null;}
  };}};}}};
  const send=async(data,{origin='https://parallelvisionlabel.com',ua='Mozilla/5.0',clock=()=>NOW}={})=>
    recordLabTraffic(new Request('https://parallel-vision-lab.parallelvision.workers.dev/api/public/traffic',{
      method:'POST',headers:{'Origin':origin,'Content-Type':'text/plain;charset=UTF-8','User-Agent':ua},body:JSON.stringify(data)
    }),env,{clock});
  const admin=(path,owner='owner_live')=>labAdminRoute(new Request(
    'https://parallel-vision-lab.parallelvision.workers.dev'+path,{method:'GET'}),env,owner);
  return {db,env,send,admin};
}

test('traffic captures anonymised entries, internal page loads and Reddit acquisition without visitor IDs',async t=>{
  const f=fixture(t),yesterday=NOW-86400000;
  assert.equal((await f.send({page:'home',source:'reddit',entry:true})).status,204);
  assert.equal((await f.send({page:'home',source:'reddit',entry:true})).status,204);
  await f.send({page:'studio',source:'internal',entry:false});
  await f.send({page:'moods',source:'google',entry:true},{clock:()=>yesterday});
  await f.send({page:'home',source:'direct',entry:true});
  f.db.prepare('INSERT INTO lab_customers(id,created_at) VALUES(?,?)').run('test_customer_1',NOW);
  f.db.prepare('INSERT INTO lab_customers(id,created_at) VALUES(?,?)').run('test_customer_old',NOW-19*86400000);
  const report=await labTrafficReport(f.env,{days:7,clock:()=>NOW});
  assert.equal(report.measured,true);
  assert.equal(report.firstTrackedDay,'2026-10-14');
  assert.equal(report.summary.views,5);
  assert.equal(report.summary.entrances,4);
  assert.equal(report.summary.redditEntrances,2);
  assert.equal(report.summary.newAccounts,1);
  assert.equal(report.sources.find(x=>x.source==='reddit').count,2);
  assert.equal(report.sources.some(x=>x.source==='internal'),false);
  assert.equal(report.pages.find(x=>x.page==='studio').count,1);
  assert.equal(report.trend.length,7);
  assert.equal(report.trend.at(-1).reddit,2);
  const longer=await labTrafficReport(f.env,{days:30,clock:()=>NOW});
  assert.equal(longer.summary.newAccounts,2);
  assert.equal(longer.summary.views,5);
  assert.deepEqual(f.db.prepare('PRAGMA table_info(lab_traffic_daily)').all().map(x=>x.name),
    ['day_utc','page','source','page_views','entrances']);
});
test('public traffic handler rejects unknown categories, arbitrary origins and identifiers',async t=>{
  const f=fixture(t),base={page:'home',source:'reddit',entry:true};
  await assert.rejects(()=>f.send(base,{origin:'https://attacker.example'}),/origin/i);
  await assert.rejects(()=>f.send({...base,source:'reddit.com/path?token=secret'}),/Invalid traffic event/);
  await assert.rejects(()=>f.send({...base,page:'https://another.example/?private=1'}),/Invalid traffic event/);
  await assert.rejects(()=>f.send({...base,entry:'yes'}),/Invalid traffic event/);
  await assert.rejects(()=>f.send({...base,source:'internal'}),/Invalid traffic source/);
  await assert.rejects(()=>f.send({...base,source:'reddit',entry:false}),/Invalid traffic source/);
  assert.equal((await f.send(base,{ua:'Googlebot/2.1'})).status,204);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM lab_traffic_daily').get().n,0);
  await f.send(base,{origin:'https://pvlab.studio'});
  assert.equal(f.db.prepare('SELECT page_views FROM lab_traffic_daily').get().page_views,1);
});
test('owner traffic report is private, filters the calendar window, and retains no old aggregates',async t=>{
  const f=fixture(t);
  await assert.rejects(()=>f.admin('/api/admin/traffic?days=7','customer_user'),/owner access required/);
  await assert.rejects(()=>f.admin('/api/admin/traffic?days=14'),/Choose 7 or 30 days/);
  await f.send({page:'home',source:'direct',entry:true},{clock:()=>NOW-9*86400000});
  await f.send({page:'home',source:'reddit',entry:true});
  let report=await (await f.admin('/api/admin/traffic?days=7')).json();
  // This handler uses the live clock, so assert only static properties of the protected response.
  assert.equal(typeof report.measured,'boolean');
  const direct=await labTrafficReport(f.env,{days:7,clock:()=>NOW});
  assert.equal(direct.summary.entries,undefined);
  assert.equal(direct.summary.entrances,1);
  assert.equal((await labTrafficReport(f.env,{days:30,clock:()=>NOW})).summary.entrances,2);
  const old=NOW-92*86400000;
  await f.send({page:'studio',source:'other',entry:true},{clock:()=>old});
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM lab_traffic_daily').get().n,3);
  await pruneLabTraffic(f.env,{clock:()=>NOW});
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM lab_traffic_daily').get().n,2);
});
test('report before the first tracked page explicitly says measurement has not started',async t=>{
  const f=fixture(t);
  const report=await labTrafficReport(f.env,{days:7,clock:()=>NOW});
  assert.equal(report.measured,false);
  assert.equal(report.firstTrackedDay,null);
  assert.equal(report.summary.views,0);
  assert.equal(report.summary.entrances,0);
  assert.equal(report.trend.length,7);
});
