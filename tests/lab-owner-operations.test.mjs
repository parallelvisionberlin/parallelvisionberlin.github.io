import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {ownerOperationsRoute,OWNER_OPERATIONS_VERSION} from '../lab-worker/owner-operations.mjs';

const NOW=Date.UTC(2026,10,6,12),DAY=86400000;
function fixture(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  const read=path=>readFileSync(new URL('../lab-worker/'+path,import.meta.url),'utf8');
  db.exec(read('schema.sql'));
  for(const name of ['0006-customers-billing','0011-customer-lifecycle','0041-provider-settlement'])
    db.exec(read('migrations/'+name+'.sql'));
  const run=(sql,...args)=>db.prepare(sql).run(...args),get=(sql,...args)=>db.prepare(sql).get(...args);
  const statements=[];
  const env={OWNER_DB:{prepare:()=>({bind:id=>({first:async()=>id==='owner_test'?{id}:null})})},LAB_DB:{prepare(sql){
    statements.push(sql);const prepared=db.prepare(sql);return {bind(...args){return {
      first:async()=>prepared.get(...args)||null,all:async()=>({results:prepared.all(...args)})
    };}};
  }}};
  run("INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES('user_CUSTOMER','user_CUSTOMER',1,1)");
  const job=(id,state,updatedAt,owner='user_CUSTOMER')=>run(
    'INSERT INTO jobs(id,owner_id,params,state,provider_id,error,remote_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',
    id,owner,JSON.stringify({prompt:'PRIVATE PROMPT',referenceSourceIds:['PRIVATE REF'],token:'PRIVATE KEY'}),state,
    'PRIVATE PROVIDER TASK','PRIVATE ERROR','https://private.test/result?token=SECRET',updatedAt-1000,updatedAt);
  const settlement=(id,next,attempts=0,owner='user_CUSTOMER',cost=null)=>run(
    'INSERT INTO lab_provider_settlements(job_id,owner_id,provider_task_id,next_check_at,attempts,settled_cost_usd) VALUES(?,?,?,?,?,?)',
    id,owner,'PRIVATE PROVIDER TASK',next,attempts,cost);
  const request=(query='',method='GET',owner='owner_test')=>ownerOperationsRoute(
    new Request('https://lab.test/api/admin/operations'+query,{method}),env,owner,{clock:()=>NOW});
  return {env,run,get,job,settlement,request,statements};
}

test('operations authorizes the owner before LAB_DB access and rejects mutations',async()=>{
  let reads=0;
  const env={OWNER_DB:{prepare:()=>({bind:()=>({first:async()=>null})})},
    LAB_DB:{prepare(){reads++;throw Error('must not read');}}};
  for(const method of ['GET','POST','DELETE'])await assert.rejects(()=>ownerOperationsRoute(
    new Request('https://lab.test/api/admin/operations',{method}),env,'customer'),error=>error.status===403);
  assert.equal(reads,0);
  env.OWNER_DB={prepare:()=>({bind:()=>({first:async()=>({id:'owner'})})})};
  const response=await ownerOperationsRoute(new Request('https://lab.test/api/admin/operations',{method:'POST'}),env,'owner');
  assert.equal(response.status,405);assert.equal(response.headers.get('allow'),'GET');
  assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(reads,0);
});

test('counts recent failures and all unresolved uncertain/stale work without touching providers or data',async t=>{
  const f=fixture(t);
  f.job('recent_failed','failed',NOW-DAY);f.job('old_failed','failed',NOW-10*DAY);
  f.job('old_uncertain','uncertain',NOW-60*DAY);f.job('old_running','running',NOW-60*DAY);
  f.job('fresh_running','running',NOW-60*1000);f.job('boundary_stale','saving',NOW-30*60*1000);
  f.job('completed','completed',NOW);f.job('resolved','resolved',NOW);
  f.job('owner_work','submitting',NOW-DAY,'owner_test');
  f.settlement('waiting_bill',NOW-1,3);f.settlement('backoff_bill',NOW+1000,4);f.settlement('settled_bill',NOW,2,'user_CUSTOMER',.1);
  const before=f.get('SELECT COUNT(*) n FROM jobs').n;
  const response=await f.request(),raw=await response.text(),data=JSON.parse(raw);
  assert.equal(response.status,200);assert.equal(data.version,OWNER_OPERATIONS_VERSION);
  assert.equal(data.asOf,new Date(NOW).toISOString());assert.equal(data.window.days,7);
  assert.deepEqual(data.jobs.counts,{failed:1,uncertain:1,stale:3});
  assert.deepEqual(data.jobs.items.map(row=>row.reason),['uncertain','stale','stale','stale','failed']);
  assert.equal(data.jobs.items.find(row=>row.jobId==='owner_work').customerId,null);
  assert.equal(data.jobs.items.find(row=>row.jobId==='recent_failed').customerId,'user_CUSTOMER');
  assert.equal(data.settlements.pending,2);assert.equal(data.settlements.due,1);
  assert.equal(data.settlements.items[0].attempts,3);
  assert.match(data.limitations.join(' '),/not a confirmed provider failure/);
  for(const secret of ['PRIVATE','private.test','SECRET','params','provider_task_id','remote_url','error'])
    assert.equal(raw.includes(secret),false,secret+' must not be returned');
  assert.equal(f.get('SELECT COUNT(*) n FROM jobs').n,before);
  assert.ok(f.statements.every(sql=>sql.startsWith('SELECT')),'Only SELECT operations may be prepared');
  const long=await (await f.request('?days=30')).json();assert.equal(long.jobs.counts.failed,2);
});

test('excludes closed accounts and caps each list independently of complete counts',async t=>{
  const f=fixture(t);
  for(let n=0;n<27;n++){
    f.job('failure_'+String(n).padStart(2,'0'),'failed',NOW-n*1000);
    f.settlement('billing_'+String(n).padStart(2,'0'),NOW-n*1000);
  }
  f.run("INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES('user_CLOSED','user_CLOSED',1,1)");
  f.job('closed_job','uncertain',NOW,'user_CLOSED');f.settlement('closed_bill',NOW,0,'user_CLOSED');
  f.run("INSERT INTO lab_account_closures(customer_id,requested_at) VALUES('user_CLOSED',?)",NOW);
  const data=await (await f.request()).json();
  assert.deepEqual(data.jobs.counts,{failed:27,uncertain:0,stale:0});
  assert.equal(data.jobs.items.length,20);assert.equal(data.settlements.items.length,20);
  assert.equal(data.settlements.pending,27);assert.equal(data.limits.itemsPerSource,20);
  assert.equal(JSON.stringify(data).includes('user_CLOSED'),false);
});

test('unavailable sources stay unknown while the other source remains usable; raw errors never leak',async t=>{
  const f=fixture(t),prepare=f.env.LAB_DB.prepare;
  f.job('failure','failed',NOW);f.settlement('billing',NOW);
  f.env.LAB_DB.prepare=sql=>{if(sql.includes('FROM jobs j'))throw Error('PRIVATE DATABASE ERROR');return prepare(sql);};
  let data=await (await f.request()).json();
  assert.equal(data.jobs.available,false);assert.deepEqual(data.jobs.counts,{failed:null,uncertain:null,stale:null});
  assert.deepEqual(data.jobs.items,[]);assert.equal(data.settlements.available,true);assert.equal(data.settlements.pending,1);
  assert.equal(JSON.stringify(data).includes('PRIVATE'),false);
  f.env.LAB_DB.prepare=sql=>{if(sql.includes('lab_provider_settlements'))throw Error('PRIVATE DATABASE ERROR');return prepare(sql);};
  data=await (await f.request()).json();assert.equal(data.jobs.available,true);assert.equal(data.jobs.counts.failed,1);
  assert.deepEqual(data.settlements,{available:false,pending:null,due:null,items:[]});
  for(const days of ['0','365','7 OR 1=1','7.0'])assert.equal((await f.request('?days='+encodeURIComponent(days))).status,400);
});

test('Worker routes operations after authentication and before the generic admin dispatcher',()=>{
  const source=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  const route=source.indexOf("if(path==='/api/admin/operations')return ownerOperationsRoute(request,env,owner)");
  assert.ok(route>source.indexOf('const identity=await authenticate(request,env'));
  assert.ok(route<source.indexOf("if(path.startsWith('/api/admin/'))return labAdminRoute"));
});

test('public health identifies the operations capability without touching private bindings',async()=>{
  const {default:worker}=await import('../lab-worker/worker.mjs');
  const response=await worker.fetch(new Request('https://lab.test/health'),new Proxy({}, {
    get(){throw Error('Health must not read a private binding');}
  }));
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const data=await response.json();assert.equal(data.ok,true);assert.equal(data.operations,OWNER_OPERATIONS_VERSION);
  assert.equal('bindings' in data,false);assert.equal('secrets' in data,false);
});

test('production Worker Actions remains manual-only while direct Cloudflare is the release path',async()=>{
  const workflow=readFileSync(new URL('../.github/workflows/deploy-lab-worker.yml',import.meta.url),'utf8');
  const events=workflow.slice(workflow.indexOf('\non:')+4,workflow.indexOf('\npermissions:'));
  assert.match(events,/^  workflow_dispatch:/m);
  assert.doesNotMatch(events,/^  (push|pull_request|schedule|workflow_run):/m);
});
