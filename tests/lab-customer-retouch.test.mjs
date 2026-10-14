import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {precisionEditRoute,PRECISION_SEGMENT_CUSTOMER_CREDITS,precisionCustomerCredits} from '../lab-worker/precision-edit.mjs';

const path='https://parallel-vision-lab.parallelvision.workers.dev/api/precision/segment';
const sourceId='bd30e7a6-cc71-470f-a0ae-f11de70e9090';
const selectionId='bd30e7a6-cc71-470f-a0ae-f11de70e9091';
const owner='user_RetouchCustomer';
const requestId='sam_customer_request_0123456789';
function fixture(initialCredits=50){
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE lab_migrations(id TEXT PRIMARY KEY,applied_at INTEGER); CREATE TABLE jobs(id TEXT PRIMARY KEY,owner_id TEXT,params TEXT,state TEXT,estimate_microusd INTEGER,created_at INTEGER,updated_at INTEGER); CREATE TABLE spend(job_id TEXT PRIMARY KEY,owner_id TEXT,estimate_microusd INTEGER,created_at INTEGER); CREATE TABLE assets(id TEXT PRIMARY KEY,owner_id TEXT);');
  db.exec(readFileSync(new URL('../lab-worker/migrations/0006-customers-billing.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../lab-worker/migrations/0016-retouch-selection-credits.sql',import.meta.url),'utf8'));
  db.prepare('INSERT INTO lab_customers(id,clerk_subject,balance_credits,created_at,updated_at) VALUES(?,?,0,1,1)').run(owner,owner);
  if(initialCredits)db.prepare("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('funding',?,?, 'purchase','checkout:synthetic',1)").run(owner,initialCredits);
  const env={FAL_KEY:'synthetic-key',LAB_SECRET:'synthetic-signing-secret',LAB_CUSTOMER_RETOUCH_ENABLED:'true'};
  let submitted=0;
  const d={
    customer:true,customerGenerationReady:true,
    body:req=>req.json(),json:(data,status=200)=>new Response(JSON.stringify(data),{status}),
    fail:(status,message)=>{const e=new Error(message);e.status=status;throw e;},
    source:async(_env,_owner,id)=>({id,mime:'image/png',bytes:100}),
    falImageBytes:async()=>new Uint8Array([1]),
    storedImageDimensions:()=>({width:512,height:512}),
    config:async()=>({daily_limit_microusd:1000000}),
    first:async(_env,sql,...args)=>db.prepare(sql).get(...args),
    run:async(_env,sql,...args)=>({meta:{changes:db.prepare(sql).run(...args).changes}}),
    signedInput:async()=> 'https://parallel-vision-lab.parallelvision.workers.dev/input/mock',
    falSubmit:async()=>{submitted++;return requestId;},
    falStatus:async()=>({status:'IN_PROGRESS'})
  };
  const post=(selection=selectionId)=>new Request(path,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({sourceId,point:{x:20,y:30},selectionId:selection})});
  const get=(data)=>new Request(path+'?'+new URLSearchParams({
    sourceId,requestId:data.requestId,expires:String(data.expires),ticket:data.ticket}),{method:'GET'});
  const route=req=>precisionEditRoute(req,env,owner,new URL(req.url),d);
  return {db,env,d,route,post,get,submitted:()=>submitted,
    balance:()=>db.prepare('SELECT balance_credits FROM lab_customers WHERE id=?').get(owner).balance_credits,
    count:(kind)=>db.prepare('SELECT COUNT(*) AS n FROM lab_credit_entries WHERE customer_id=? AND kind=?').get(owner,kind).n};
}
test('Retouch credit pricing matches customer wallet and provider estimate',()=>{
  assert.equal(PRECISION_SEGMENT_CUSTOMER_CREDITS,7);
  assert.equal(precisionCustomerCredits(5000),7);
  assert.equal(precisionCustomerCredits(225000),104);
});
test('Retouch is gated when public release disabled before any paid call',async()=>{
  const f=fixture(30);f.env.LAB_CUSTOMER_RETOUCH_ENABLED='false';
  await assert.rejects(f.route(f.post()),e=>e.status===403&&/not enabled/.test(e.message));
  assert.equal(f.submitted(),0);assert.equal(f.balance(),30);
});
test('Magic Select debits once before provider call and replays without duplicate vendor billing',async()=>{
  const f=fixture(25);
  const first=await (await f.route(f.post())).json();
  assert.equal(first.credits,7);
  assert.equal(first.requestId,requestId);
  assert.equal(f.submitted(),1);
  assert.equal(f.balance(),18);
  const replay=await (await f.route(f.post())).json();
  assert.equal(replay.requestId,first.requestId);
  assert.equal(replay.ticket,first.ticket);
  assert.equal(f.submitted(),1);
  assert.equal(f.balance(),18);
  assert.equal(f.count('generation'),1);
});
test('No credit balance prevents any paid SAM request',async()=>{
  const f=fixture(0);
  await assert.rejects(f.route(f.post()),e=>e.status===402&&/Nothing was submitted/.test(e.message));
  assert.equal(f.submitted(),0);assert.equal(f.balance(),0);
});
test('Definite SAM submission rejection returns selection credits exactly once',async()=>{
  const f=fixture(20);
  f.d.falSubmit=async()=>{const e=new Error('provider declined');e.definite=true;throw e;};
  await assert.rejects(f.route(f.post()),/provider declined/);
  assert.equal(f.balance(),20);assert.equal(f.count('refund'),1);
  const state=f.db.prepare('SELECT state FROM lab_precision_selections WHERE id=?').get(selectionId).state;
  assert.equal(state,'failed');
  await assert.rejects(f.route(f.post()),e=>e.status===409);
  assert.equal(f.balance(),20);assert.equal(f.count('refund'),1);
});
test('Uncertain SAM submission remains reserved and is never resubmitted automatically',async()=>{
  const f=fixture(20);
  f.d.falSubmit=async()=>{const e=new Error('network uncertain');e.uncertain=true;throw e;};
  await assert.rejects(f.route(f.post()),/network uncertain/);
  assert.equal(f.balance(),13);assert.equal(f.count('refund'),0);
  assert.equal(f.db.prepare('SELECT state FROM lab_precision_selections').get().state,'uncertain');
  await assert.rejects(f.route(f.post()),e=>e.status===409);
});
test('Failed SAM queue result refunds the original selection once',async()=>{
  const f=fixture(20);
  const created=await (await f.route(f.post())).json();
  f.d.falStatus=async()=>({status:'FAILED'});
  await assert.rejects(f.route(f.get(created)),e=>e.status===422);
  assert.equal(f.balance(),20);assert.equal(f.count('refund'),1);
  await assert.rejects(f.route(f.get(created)),e=>e.status===422);
  assert.equal(f.balance(),20);assert.equal(f.count('refund'),1);
});
