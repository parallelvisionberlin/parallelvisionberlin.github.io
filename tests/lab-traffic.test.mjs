import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {recordLabTraffic,labTrafficReport,pruneLabTraffic} from '../lab-worker/traffic.mjs';
import {labAdminRoute} from '../lab-worker/promotions.mjs';
import {trafficAudience} from '../lab-worker/traffic-audience.mjs';

const NOW=Date.parse('2026-10-15T12:40:00Z');
function fixture(t){
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  db.exec("CREATE TABLE lab_migrations(id TEXT PRIMARY KEY, applied_at INTEGER)");
  db.exec("CREATE TABLE lab_customers(id TEXT PRIMARY KEY,created_at INTEGER NOT NULL)");
  db.exec(readFileSync(new URL('../lab-worker/migrations/0018-anonymous-traffic.sql',import.meta.url),'utf8'));
  const audienceMigration=readFileSync(new URL('../lab-worker/migrations/0058-traffic-audience.sql',import.meta.url),'utf8');
  db.exec(audienceMigration);db.exec(audienceMigration);
  const binding={prepare(sql){return {bind(...values){const statement=db.prepare(sql);return {
    async first(){return statement.get(...values)||null;},
    async run(){const result=statement.run(...values);return {meta:{changes:result.changes}};},
    async all(){return {results:statement.all(...values)};}
  };}};},async batch(statements){
    db.exec('BEGIN');
    try{const results=[];for(const statement of statements)results.push(await statement.run());db.exec('COMMIT');return results;}
    catch(error){db.exec('ROLLBACK');throw error;}
  }};
  const env={LAB_DB:binding,OWNER_DB:{prepare(){return {bind(id){return {
    async first(){return id==='owner_live'?{id}:null;}
  };}};}}};
  const send=async(data,{origin='https://parallelvisionlabel.com',ua='Mozilla/5.0',clock=()=>NOW,cf,headers={}}={})=>{
    const request=new Request('https://parallel-vision-lab.parallelvision.workers.dev/api/public/traffic',{
      method:'POST',headers:{'Origin':origin,'Content-Type':'text/plain;charset=UTF-8','User-Agent':ua,...headers},body:JSON.stringify(data)
    });
    if(cf)Object.defineProperty(request,'cf',{value:cf});
    return recordLabTraffic(request,env,{clock});
  };
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
  assert.equal(report.audience.firstTrackedDay,null);
});

test('audience stores independent categories from trusted edge metadata without account or IP data',async t=>{
  const f=fixture(t),event={page:'moods',source:'instagram',entry:true};
  const options={cf:{country:'BR',region:'São Paulo',city:'São Paulo',latitude:'-23.5',longitude:'-46.6'},
    ua:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36 Instagram 345',
    headers:{'Accept-Language':'pt-BR,pt;q=0.9','CF-Connecting-IP':'203.0.113.7'}};
  await f.send(event,options);
  await f.send({page:'studio',source:'internal',entry:false},options);
  const report=await labTrafficReport(f.env,{clock:()=>NOW}),dims=report.audience.dimensions;
  assert.equal(report.audience.firstTrackedDay,'2026-10-15');
  assert.deepEqual(dims.country.items,[{value:'BR',views:2,entrances:1}]);
  assert.equal(dims.city.items[0].value,'São Paulo, São Paulo, BR');
  for(const [key,value] of Object.entries({device:'mobile',browser:'instagram',os:'android',language:'pt',hour:'12'})){
    assert.equal(dims[key].items[0].value,value);assert.equal(dims[key].totalViews,2);assert.equal(dims[key].totalEntrances,1);
  }
  assert.equal(report.audience.age.available,false);
  const rows=f.db.prepare('SELECT * FROM lab_traffic_audience_daily').all();
  assert.equal(rows.length,8);
  assert.ok(!JSON.stringify(rows).includes('203.0.113.7'));
  assert.ok(!JSON.stringify(rows).includes('Mozilla'));
  assert.deepEqual(f.db.prepare('PRAGMA table_info(lab_traffic_audience_daily)').all().map(x=>x.name),
    ['day_utc','dimension','value','page_views','entrances']);
});
test('missing location stays unknown and client-supplied location is not trusted',async t=>{
  const f=fixture(t);
  await f.send({page:'home',source:'direct',entry:true,country:'US',city:'New York'},
    {headers:{'CF-IPCountry':'US','CF-IPCity':'New York','Accept-Language':'<script>bad</script>'}});
  const report=await labTrafficReport(f.env,{clock:()=>NOW});
  for(const dimension of ['country','region','city','device','browser','os','language']){
    assert.equal(report.audience.dimensions[dimension].items[0].value,'unknown');
  }
  const request=new Request('https://test.invalid');
  Object.defineProperty(request,'cf',{value:{country:'XX',city:'Secret',region:'Secret'}});
  assert.equal(trafficAudience(request,NOW).city,'unknown');
});
test('device families handle tablets, iOS, desktop and in-app browser precedence',()=>{
  for(const [ua,device,os,browser] of [
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Version/18.0 Safari/604.1','mobile','ios','safari'],
    ['Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) Version/18 Safari/604.1','tablet','ios','safari'],
    ['Mozilla/5.0 (Linux; Android 14) Chrome/130 Safari/537','tablet','android','chrome'],
    ['Mozilla/5.0 (Windows NT 10.0) Chrome/130 Safari/537 Edg/130','desktop','windows','edge'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Firefox/130','desktop','macos','firefox'],
    ['Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537 FBAV/123','mobile','android','facebook'],
    ['Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537 SamsungBrowser/22','mobile','android','samsung']
  ]){
    const dims=trafficAudience(new Request('https://test.invalid',{headers:{'User-Agent':ua}}),NOW);
    assert.equal(dims.device,device,ua);assert.equal(dims.os,os,ua);assert.equal(dims.browser,browser,ua);
  }
});
test('audience reporting does not backfill historical totals and prunes expired dimensions',async t=>{
  const f=fixture(t);
  f.db.prepare('INSERT INTO lab_traffic_daily VALUES(?,?,?,?,?)').run('2026-10-14','home','direct',500,100);
  let report=await labTrafficReport(f.env,{clock:()=>NOW});
  assert.equal(report.summary.views,500);assert.equal(report.audience.firstTrackedDay,null);
  await f.send({page:'home',source:'direct',entry:true},{clock:()=>NOW-92*86400000});
  await f.send({page:'home',source:'direct',entry:true});
  await pruneLabTraffic(f.env,{clock:()=>NOW});
  report=await labTrafficReport(f.env,{clock:()=>NOW});
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM lab_traffic_audience_daily').get().n,8);
  assert.equal(report.audience.firstTrackedDay,'2026-10-15');
  assert.equal(report.audience.dimensions.country.totalViews,1);
  assert.equal(report.summary.views,501);
});
test('traffic server respects privacy signals and ignores bots for all dimensions',async t=>{
  const f=fixture(t),event={page:'home',source:'direct',entry:true};
  await f.send(event,{headers:{'Sec-GPC':'1'}});await f.send(event,{headers:{DNT:'1'}});
  await f.send(event,{ua:'Googlebot/2.1'});
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM lab_traffic_audience_daily').get().n,0);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM lab_traffic_daily').get().n,0);
});
test('atomic event write rolls back legacy totals if a dimension write fails',async t=>{
  const f=fixture(t);
  f.db.exec("CREATE TRIGGER fail_dimension BEFORE INSERT ON lab_traffic_audience_daily BEGIN SELECT RAISE(ABORT,'unavailable'); END;");
  await assert.rejects(()=>f.send({page:'home',source:'direct',entry:true}),/unavailable/);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM lab_traffic_daily').get().n,0);
});
test('top lists stay bounded while preserving totals and the leaders for both metrics',async t=>{
  const f=fixture(t),insert=f.db.prepare('INSERT INTO lab_traffic_audience_daily VALUES(?,?,?,?,?)');
  for(let n=0;n<80;n++)insert.run('2026-10-15','city','City '+n,100-n,100-n);
  insert.run('2026-10-15','city','Internal page views',500,0);
  insert.run('2026-10-14','country','DE',2,1);
  insert.run('2026-09-01','country','US',1000,1000);
  const report=await labTrafficReport(f.env,{clock:()=>NOW});
  assert.ok(report.audience.dimensions.city.items.length<=100);
  assert.ok(report.audience.dimensions.city.items.some(item=>item.value==='Internal page views'));
  assert.equal(report.audience.dimensions.city.totalViews,5340);
  assert.equal(report.audience.dimensions.city.totalEntrances,4840);
  assert.deepEqual(report.audience.dimensions.country.items,[{value:'DE',views:2,entrances:1}]);
});
