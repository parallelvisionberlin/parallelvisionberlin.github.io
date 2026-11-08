import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {preparingUpscaleParams,claimUpscaleDispatch,failUnacceptedUpscale,expirePreparingUpscales,recoverUpscale,maintainUpscaleRecovery,FAL_UPSCALE_REVIEW_SQL} from '../lab-worker/upscale-recovery.mjs';

const now=Date.UTC(2026,10,8,18),customer='user_UpscaleRecovery',other='user_OtherRecovery';
const p={type:'image',mode:'upscale',provider:'fal',upscaleEngine:'seedvr2',model:'fal-ai/seedvr/upscale/image',scale:2,customerChargeCredits:10};
const input={image_url:'https://v3.fal.media/files/inputs/original.png',upscale_factor:2,output_format:'png'};
const sqlFile=name=>readFileSync(new URL('../lab-worker/'+name,import.meta.url),'utf8');
function fixture(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec(sqlFile('schema.sql'));
  db.exec(sqlFile('migrations/0006-customers-billing.sql'));
  db.exec('CREATE TABLE lab_customer_contacts(customer_id TEXT PRIMARY KEY,email TEXT,verified_at INTEGER)');
  for(const name of ['0025-promo-generation-holds','0028-generation-finance-ledger','0029-pricing-debit-parity'])db.exec(sqlFile('migrations/'+name+'.sql'));
  for(const owner of [customer,other]){
    db.prepare('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)').run(owner,owner,now,now);
    db.prepare("INSERT INTO lab_credit_entries VALUES(?,?,1000,'purchase',?,?)").run('fund:'+owner,owner,'fund:'+owner,now);
    db.prepare("INSERT INTO assets VALUES(?,?,?,'source','image/png','original.png',40,?)").run('source:'+owner,owner,owner+'/source.png',now);
  }
  const make=(sql,params=[])=>({sql,params,bind(...values){return make(sql,values);},async first(){return db.prepare(sql).get(...params)||null;},async all(){return {results:db.prepare(sql).all(...params)};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...params).changes)}};}});
  const env={FAL_KEY:'synthetic-test-key',LAB_DB:{prepare:sql=>make(sql),async batch(statements){db.exec('BEGIN');try{const results=statements.map(s=>({meta:{changes:Number(db.prepare(s.sql).run(...s.params).changes)}}));db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}}};
  let number=0;
  const add=({owner=customer,state='submitting',phase='preparing',createdAt=now-180000,providerId=null,savedInput=false,legacy=false}={})=>{
    const id='job-'+(++number),source='source:'+owner,params=legacy?{...p}:preparingUpscaleParams(p);
    if(!legacy){params.upscaleDispatch.phase=phase;if(phase==='dispatching')params.upscaleDispatch.startedAt=createdAt+1000;}
    const payload={model:p.model,source:{id:source},input:{upscale_factor:2,output_format:'png'},...(savedInput?{submittedInput:input}:{})};
    db.prepare("INSERT INTO quotes VALUES(?,?,?,?,?,?,?,'0.007',?)").run('quote:'+id,owner,source,JSON.stringify(p),7000,now+300000,'fal-upscale-v1',JSON.stringify(payload));
    db.prepare('INSERT INTO jobs(id,owner_id,source_id,quote_id,params,state,provider_id,estimate_microusd,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,owner,source,'quote:'+id,JSON.stringify(params),state,providerId,7000,createdAt,createdAt+2000);
    return get(id);
  };
  const get=id=>db.prepare('SELECT * FROM jobs WHERE id=?').get(id);
  const quote=job=>db.prepare('SELECT * FROM quotes WHERE id=?').get(job.quote_id);
  const balance=(owner=customer)=>db.prepare('SELECT balance_credits AS n FROM lab_customers WHERE id=?').get(owner).n;
  const held=job=>db.prepare('SELECT COUNT(*) AS n FROM spend WHERE job_id=?').get(job.id).n;
  return {db,env,add,get,quote,balance,held};
}

test('Server preparation overwrites a forged marker and preserves the validated credit price',()=>{
  const marked=preparingUpscaleParams({...p,upscaleDispatch:{version:1,phase:'not-sent',startedAt:1}});
  assert.deepEqual(marked.upscaleDispatch,{version:1,phase:'preparing'});assert.equal(marked.customerChargeCredits,10);
  assert.throws(()=>preparingUpscaleParams({...p,provider:'spicy'}),/Invalid upscale/);
});

test('Only stale, proven unsent preparations fail; wallet refunds once and retains finance and original media',async t=>{
  const f=fixture(t),stale=f.add(),fresh=f.add({createdAt:now-1000}),legacy=f.add({state:'uncertain',legacy:true}),dispatched=f.add({state:'uncertain',phase:'dispatching',savedInput:true}),someoneElse=f.add({owner:other});
  assert.equal(f.balance(),960);
  assert.equal(await expirePreparingUpscales(f.env,{ownerId:customer,nowMs:now}),1);
  assert.equal(f.get(stale.id).state,'failed');assert.equal(f.balance(),970);assert.equal(f.held(stale),0);
  for(const job of [fresh,legacy,dispatched,someoneElse]){assert.equal(f.get(job.id).state,job.state);assert.equal(f.held(job),1);}
  assert.equal(f.db.prepare('SELECT last_state FROM lab_generation_finance WHERE job_id=?').get(stale.id).last_state,'failed');
  assert.ok(f.quote(stale));assert.ok(f.db.prepare('SELECT * FROM assets WHERE id=?').get(stale.source_id));
  assert.equal(await expirePreparingUpscales(f.env,{jobId:stale.id,ownerId:customer,nowMs:now+1000}),0);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference=?").get('refund:job:'+stale.id).n,1);
});

test('Cleanup wins the race: a delayed upload cannot claim dispatch or charge again',async t=>{
  const f=fixture(t),job=f.add(),q=f.quote(job);
  await expirePreparingUpscales(f.env,{nowMs:now});
  assert.equal(await claimUpscaleDispatch(f.env,job,q,JSON.parse(q.payload),input,now),false);
  assert.equal(f.get(job.id).state,'failed');assert.equal(f.balance(),1000);assert.equal(f.held(job),0);
  assert.equal(JSON.parse(f.quote(job).payload).submittedInput,undefined);
});

test('Dispatch wins the race: exact input and claim commit together, cleanup cannot refund, replay cannot dispatch',async t=>{
  const f=fixture(t),job=f.add(),q=f.quote(job);
  assert.equal(await claimUpscaleDispatch(f.env,job,q,JSON.parse(q.payload),input,now),true);
  assert.deepEqual(JSON.parse(f.quote(job).payload).submittedInput,input);
  assert.equal(JSON.parse(f.get(job.id).params).upscaleDispatch.phase,'dispatching');
  assert.equal(await expirePreparingUpscales(f.env,{nowMs:now+600000}),0);assert.equal(f.balance(),990);assert.equal(f.held(job),1);
  assert.equal(await claimUpscaleDispatch(f.env,job,q,JSON.parse(q.payload),input,now+1),false);
});

test('A failed atomic input write rolls back the dispatch claim and cannot send a request',async t=>{
  const f=fixture(t),job=f.add(),q=f.quote(job);
  f.db.exec("CREATE TRIGGER reject_payload BEFORE UPDATE OF payload ON quotes BEGIN SELECT RAISE(ABORT,'test persistence failure'); END");
  await assert.rejects(claimUpscaleDispatch(f.env,job,q,JSON.parse(q.payload),input,now),/test persistence failure/);
  assert.equal(JSON.parse(f.get(job.id).params).upscaleDispatch.phase,'preparing');assert.equal(JSON.parse(f.quote(job).payload).submittedInput,undefined);
  assert.equal(await expirePreparingUpscales(f.env,{nowMs:now}),1);assert.equal(f.balance(),1000);
});

test('Cleanup refuses missing, mismatched or already submitted original quote evidence',async t=>{
  const f=fixture(t);
  for(const change of ['submitted','null-input','model','source']){
    const job=f.add(),q=f.quote(job),payload=JSON.parse(q.payload);
    if(change==='submitted')payload.submittedInput=input;
    if(change==='null-input')payload.submittedInput=null;
    if(change==='model')payload.model='other/model';
    if(change==='source')payload.source.id='another-source';
    f.db.prepare('UPDATE quotes SET payload=? WHERE id=?').run(JSON.stringify(payload),q.id);
    assert.equal(await expirePreparingUpscales(f.env,{jobId:job.id,nowMs:now}),0,change);
    assert.equal(f.get(job.id).state,'submitting');assert.equal(f.held(job),1);
  }
});

test('Late submission errors cannot downgrade completed, resolved or provider-linked work or release its money',async t=>{
  const f=fixture(t);
  for(const options of [{state:'completed',phase:'dispatching'},{state:'resolved',phase:'dispatching'},{state:'uncertain',phase:'dispatching',providerId:'accepted-task'}]){
    const job=f.add(options),before=f.balance();
    await failUnacceptedUpscale(f.env,job,'Late error',{submitted:true,nowMs:now});
    assert.equal(f.get(job.id).state,options.state);assert.equal(f.balance(),before);assert.equal(f.held(job),1);
  }
});

test('Definite pre-acceptance failure releases only its own reservation exactly once',async t=>{
  const f=fixture(t),job=f.add(),otherJob=f.add({owner:other});
  await failUnacceptedUpscale(f.env,job,'Upload failed',{nowMs:now});
  await failUnacceptedUpscale(f.env,job,'Repeated failure',{nowMs:now+100});
  assert.equal(f.get(job.id).state,'failed');assert.equal(f.balance(),1000);assert.equal(f.balance(other),990);assert.equal(f.held(otherJob),1);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE kind='refund'").get().n,1);
});

test('Known provider tasks recover through status GET without searching or submitting; outage remains a review',async t=>{
  const f=fixture(t),job=f.add({state:'uncertain',phase:'dispatching',providerId:'existing-task',savedInput:true});let polls=0;
  const findRequest=async()=>assert.fail('A known request must not search history');
  const unavailable={nowMs:now,findRequest,readStatus:async(...args)=>{polls++;assert.deepEqual(args,[p.model,f.env.FAL_KEY,'existing-task']);throw Error('HTTP 404');}};
  assert.equal(await recoverUpscale(f.env,job,unavailable),null);assert.equal(f.get(job.id).state,'uncertain');assert.equal(f.get(job.id).updated_at,job.updated_at);assert.equal(f.held(job),1);
  assert.equal(await recoverUpscale(f.env,f.get(job.id),{...unavailable,nowMs:now+30000}),null);assert.equal(polls,1);
  const recovered=await recoverUpscale(f.env,f.get(job.id),{...unavailable,nowMs:now+60001,readStatus:async()=>{polls++;return {status:'IN_PROGRESS'};}});
  assert.equal(recovered.status.status,'IN_PROGRESS');assert.equal(recovered.job.state,'queued');assert.equal(recovered.job.id,job.id);assert.equal(f.balance(),990);assert.equal(polls,2);
});

test('Lost acknowledgement matches only saved exact input and original dispatch window, then resumes the same job',async t=>{
  const f=fixture(t),job=f.add({state:'uncertain',phase:'dispatching',savedInput:true});let found=0;
  const recovered=await recoverUpscale(f.env,job,{nowMs:now,findRequest:async options=>{
    found++;assert.deepEqual(options.input,input);assert.equal(options.endpoint,p.model);assert.equal(options.createdAt,job.created_at);
    assert.equal(options.updatedAt,JSON.parse(job.params).upscaleDispatch.startedAt);
    return {requestId:'original-task'};
  },readStatus:async()=>({status:'COMPLETED'})});
  assert.equal(found,1);assert.equal(recovered.job.provider_id,'original-task');assert.equal(recovered.job.id,job.id);assert.equal(recovered.status.status,'COMPLETED');assert.equal(f.balance(),990);assert.equal(f.held(job),1);
});

test('A slow recovery takes a fresh polling lease after the external reads finish',async t=>{
  const f=fixture(t),job=f.add({state:'uncertain',phase:'dispatching',savedInput:true});let clock=now;
  const result=await recoverUpscale(f.env,job,{nowMs:now,clock:()=>clock,
    findRequest:async()=>{clock+=25000;return {requestId:'original-task'};},
    readStatus:async()=>{clock+=45000;return {status:'IN_PROGRESS'};}});
  assert.equal(result.job.last_poll,now+70000);assert.equal(result.job.updated_at,now+70000);
  assert.equal(JSON.parse(result.job.params).upscaleDispatch.startedAt,JSON.parse(job.params).upscaleDispatch.startedAt);
});

test('Empty, ambiguous or unavailable history never refunds and remains on a five-minute persistent backoff',async t=>{
  const f=fixture(t);
  for(const reason of ['history_not_found','history_ambiguous','history_access']){
    const job=f.add({state:'uncertain',phase:'dispatching',savedInput:true});let searches=0;
    const options={nowMs:now,findRequest:async()=>{searches++;throw Object.assign(Error(reason),{code:reason});},readStatus:async()=>assert.fail('No confirmed provider task')};
    assert.equal(await recoverUpscale(f.env,job,options),null);
    assert.equal(await recoverUpscale(f.env,f.get(job.id),{...options,nowMs:now+299999}),null);assert.equal(searches,1);
    assert.equal(await recoverUpscale(f.env,f.get(job.id),{...options,nowMs:now+300000}),null);assert.equal(searches,2);
    assert.equal(f.get(job.id).state,'uncertain');assert.equal(f.get(job.id).provider_id,null);assert.equal(f.get(job.id).updated_at,job.updated_at);assert.equal(f.held(job),1);
  }
  assert.equal(f.balance(),970);assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE kind='refund'").get().n,0);
});

test('A legacy interruption without original input remains reviewable without provider searches or refund',async t=>{
  const f=fixture(t),job=f.add({state:'uncertain',legacy:true});
  assert.equal(await recoverUpscale(f.env,job,{nowMs:now,findRequest:async()=>assert.fail('No authoritative input'),readStatus:async()=>assert.fail('No provider ID')}),null);
  assert.equal(f.get(job.id).state,'uncertain');assert.equal(f.held(job),1);assert.equal(f.balance(),990);
});

test('A matching task already claimed by another owner cannot be attached or read again',async t=>{
  const f=fixture(t),job=f.add({state:'uncertain',phase:'dispatching',savedInput:true}),claimed=f.add({owner:other,state:'completed',phase:'dispatching',providerId:'taken-task'});
  assert.equal(await recoverUpscale(f.env,job,{nowMs:now,findRequest:async()=>({requestId:'taken-task'}),readStatus:async()=>assert.fail('Task belongs to another History record')}),null);
  assert.equal(f.get(job.id).provider_id,null);assert.equal(f.get(claimed.id).state,'completed');assert.equal(f.held(job),1);
});

test('Concurrent automatic checks share a lease and cannot overwrite a later terminal result',async t=>{
  const f=fixture(t),job=f.add({state:'uncertain',phase:'dispatching',providerId:'existing-task'});let polls=0;
  const options={nowMs:now,readStatus:async()=>{polls++;f.db.prepare("UPDATE jobs SET state='completed' WHERE id=?").run(job.id);return {status:'IN_PROGRESS'};}};
  await Promise.all([recoverUpscale(f.env,job,options),recoverUpscale(f.env,job,options)]);
  assert.equal(polls,1);assert.equal(f.get(job.id).state,'completed');assert.equal(f.held(job),1);assert.equal(f.balance(),990);
});

test('Cron selects at most two due reviews fairly, while all safe preparation closures are independent',async t=>{
  const f=fixture(t),stale=f.add(),jobs=Array.from({length:3},()=>f.add({state:'uncertain',phase:'dispatching',savedInput:true}));let searches=0;
  const options={nowMs:now,findRequest:async()=>{searches++;throw Error('No confirmed match');}};
  await maintainUpscaleRecovery(f.env,options);assert.equal(searches,2);assert.equal(f.get(stale.id).state,'failed');
  assert.equal(jobs.filter(job=>f.get(job.id).last_poll===now).length,2);
  await maintainUpscaleRecovery(f.env,options);assert.equal(searches,3);assert.ok(jobs.every(job=>f.get(job.id).last_poll===now));
  await maintainUpscaleRecovery(f.env,options);assert.equal(searches,3);assert.equal(f.balance(),970);
});

test('Old reviews back off hourly and only image FAL upscales are detached from active slot queries',async t=>{
  const f=fixture(t),job=f.add({state:'uncertain',phase:'dispatching',createdAt:now-86400001,savedInput:true});let searches=0;
  const options={nowMs:now,findRequest:async()=>{searches++;throw Error('No match');}};
  await recoverUpscale(f.env,job,options);
  await recoverUpscale(f.env,f.get(job.id),{...options,nowMs:now+300001});assert.equal(searches,1);
  await recoverUpscale(f.env,f.get(job.id),{...options,nowMs:now+3600001});assert.equal(searches,2);
  const running=f.add({state:'running',phase:'dispatching'}),different=f.add({state:'uncertain',legacy:true});
  f.db.prepare('UPDATE jobs SET params=? WHERE id=?').run(JSON.stringify({...p,mode:'identity-edit',model:'ideogram/v4.5/edit'}),different.id);
  const detached=f.db.prepare('SELECT id FROM jobs WHERE '+FAL_UPSCALE_REVIEW_SQL).all().map(x=>x.id);
  assert.deepEqual(detached,[job.id]);assert.ok(!detached.includes(running.id));assert.ok(!detached.includes(different.id));
});
