import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {labAdminRoute} from '../lab-worker/promotions.mjs';
import {pruneGenerationReviewAudit} from '../lab-worker/generation-review.mjs';
import {galleryThumbnailKey} from '../lab-worker/gallery-thumbnails.mjs';

const image='11111111-1111-4111-8111-111111111111',source='22222222-2222-4222-8222-222222222222',
  video='33333333-3333-4333-8333-333333333333',other='44444444-4444-4444-8444-444444444444';
const bytes=new Uint8Array([82,73,70,70,8,0,0,0,87,69,66,80,86,80,56,32,1,2,3,4]);
function fixture(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  const read=p=>readFileSync(new URL('../lab-worker/'+p,import.meta.url),'utf8');
  db.exec(read('schema.sql'));
  for(const m of ['0006-customers-billing','0011-customer-lifecycle','0015-lab-promotional-credits',
    '0028-generation-finance-ledger','0057-owner-quality-review','0057-owner-quality-review'])db.exec(read('migrations/'+m+'.sql'));
  const run=(sql,...args)=>db.prepare(sql).run(...args),get=(sql,...args)=>db.prepare(sql).get(...args);
  const prepare=sql=>({bind(...args){const s=db.prepare(sql);return {
    first:async()=>s.get(...args)||null,all:async()=>({results:s.all(...args)}),
    run:async()=>({meta:{changes:s.run(...args).changes}})
  };}});
  const reads=[];
  const media=new Map([
    ['user_PAID/results/generated.png',bytes],['user_PAID/results/movie.mp4',new Uint8Array([1,2,3,4])],
    [galleryThumbnailKey({owner_id:'user_PAID',id:image}),bytes]
  ]);
  const env={LAB_DB:{prepare},OWNER_DB:{prepare:()=>({bind:id=>({first:async()=>id==='owner_test'?{id}:null})})},
    LAB_MEDIA:{get:async key=>{reads.push(key);const value=media.get(key);return value?{body:value,size:value.length}:null;}}};
  for(const id of ['user_PAID','user_OTHER']){
    run('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,1,1)',id,id);
    run("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,1000,'purchase',?,1)",id,id,'checkout:'+id);
  }
  for(const [id,owner,key,mime] of [[image,'user_PAID','results/generated.png','image/png'],[source,'user_PAID','sources/private.png','image/png'],
    [video,'user_PAID','results/movie.mp4','video/mp4'],[other,'user_OTHER','results/other.png','image/png']])
    run('INSERT INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,?,?,?,4,1)',id,owner,owner+'/'+key,mime.startsWith('video/')?'video':'source',mime,'private');
  const params={type:'image',mode:'image',model:'seedream-v5',engine:'seedream',provider:'spicy',moodId:'berlin-rave',
    moodIntensity:80,prompt:'Stored creative direction',moodOriginalPrompt:'My original direction',
    resolution:'2k',aspectRatio:'3:4',seed:0,referenceSourceIds:[source],moodReferenceCount:8,customerChargeCredits:40};
  const job=(id,output,p=params,state='completed',owner='user_PAID',stamp=10)=>run(
    'INSERT INTO jobs(id,owner_id,params,state,output_id,estimate_microusd,created_at,updated_at) VALUES(?,?,?,?,?,36000,?,?)',
    id,owner,typeof p==='string'?p:JSON.stringify(p),state,output,stamp,stamp+1);
  job('job_image_001',image);job('job_video_001',video,{type:'video',mode:'start',model:'wan/v3',provider:'spicy',duration:5,seed:123});
  job('job_failed_001',null,params,'submitting');
  run("UPDATE jobs SET state='failed' WHERE id='job_failed_001'");
  job('job_other_001',other,params,'completed','user_OTHER');
  const admin=(path,owner='owner_test',method='GET')=>labAdminRoute(new Request('https://lab.test'+path,{method}),env,owner);
  const path='/api/admin/customers/inspect?customerId=user_PAID';
  return {db,run,get,env,reads,media,job,admin,path,params};
}

test('ordinary paying customer QA returns recorded prompts/settings/costs without consent, inputs or public URLs',async t=>{
  const f=fixture(t);
  f.run('INSERT INTO quotes(id,owner_id,params,estimate_microusd,expires_at,vendor_quote_id,expected_cost,payload) VALUES(?,?,?,?,?,?,?,?)',
    'quote_001','user_PAID','{}',36000,9999999999999,'private-quote','0.036',JSON.stringify({model:'exact/provider-model',
      input:{prompt:'Exact submitted prompt',image_urls:['https://private.test/source?token=secret']},credential:'never-return'}));
  f.run("UPDATE jobs SET quote_id='quote_001',settled_cost=0.047 WHERE id='job_image_001'");
  const response=await f.admin(f.path),data=await response.json(),row=data.items.find(x=>x.jobId==='job_image_001');
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal(row.prompt,'Exact submitted prompt');assert.equal(row.promptSource,'saved-provider-request');
  assert.equal(row.storedPrompt,f.params.prompt);assert.equal(row.originalDirection,f.params.moodOriginalPrompt);
  assert.equal(row.model,'exact/provider-model');assert.equal(row.provider,'spicy');assert.equal(row.feature,'Moods');
  assert.equal(row.settings.referencesCount,1);assert.equal(row.settings.moodReferenceCount,8);assert.equal(row.settings.seed,0);
  assert.equal(row.chargedCredits,17);assert.equal(row.refundedCredits,0);assert.equal(row.providerCostUsd,.047);assert.equal(row.costKind,'settled');
  const failed=data.items.find(x=>x.jobId==='job_failed_001');
  assert.equal(failed.refundedCredits,17);assert.equal(failed.costKind,'unconfirmed');
  assert.equal(failed.hasPreview,false);assert.equal(failed.promptSource,'stored-job-prompt');
  for(const secret of ['private.test','secret','never-return',source,'results/generated.png','provider_id','referenceSourceIds'])
    assert.equal(JSON.stringify(data).includes(secret),false,secret+' must be excluded');
  assert.equal(f.get('SELECT COUNT(*) n FROM lab_owner_quality_review_audit').n,1);
  assert.deepEqual(f.reads,[]);
});

test('all QA endpoints require server owner authorization, active account, GET and valid identifiers',async t=>{
  const f=fixture(t);
  for(const suffix of ['inspect','inspect-thumbnail','inspect-media']){
    const path='/api/admin/customers/'+suffix+'?customerId=user_PAID&jobId=job_image_001';
    for(const owner of ['user_PAID','user_OTHER',''])await assert.rejects(()=>f.admin(path,owner),/owner access required/);
    await assert.rejects(()=>f.admin(path,'owner_test','POST'),/read-only/);
  }
  await assert.rejects(()=>f.admin(f.path.replace('user_PAID',"bad%27%3B")),/Invalid customer/);
  await assert.rejects(()=>f.admin(f.path+'&page=0'),/Invalid generation page/);
  await assert.rejects(()=>f.admin(f.path+'&page=1e6'),/Invalid generation page/);
  await assert.rejects(()=>f.admin(f.path+'&model='+encodeURIComponent('a'.repeat(201))),/Invalid review filter/);
  f.run("INSERT INTO lab_account_closures(customer_id,requested_at) VALUES('user_PAID',1)");
  await assert.rejects(()=>f.admin(f.path),/account closed/);
  await assert.rejects(()=>f.admin('/api/admin/customers/inspect-media?customerId=user_PAID&jobId=job_image_001'),/account closed/);
  assert.deepEqual(f.reads,[]);assert.equal(f.get('SELECT COUNT(*) n FROM lab_owner_quality_review_audit').n,0);
});

test('filters apply before bounded pagination and malformed historical params do not break review',async t=>{
  const f=fixture(t);
  for(let n=0;n<31;n++)f.job('job_page_'+String(n).padStart(3,'0'),null,f.params,'failed','user_PAID',100+n);
  f.job('job_legacy_001',null,'{bad json','completed');
  const query=f.path+'&mood=berlin-rave&feature=Moods&model=seedream-v5&status=failed';
  const a=await(await f.admin(query)).json(),b=await(await f.admin(query+'&page=2')).json();
  assert.equal(a.total,32);assert.equal(a.items.length,24);assert.equal(a.hasMore,true);
  assert.equal(b.items.length,8);assert.equal(b.hasMore,false);
  assert.equal(new Set([...a.items,...b.items].map(x=>x.jobId)).size,32);
  assert.deepEqual(a.filters.status,['completed','failed']);assert.ok(a.filters.model.includes('wan/v3'));
  const injection=await(await f.admin(f.path+'&mood='+encodeURIComponent("' OR 1=1 --"))).json();
  assert.equal(injection.total,0);
  const all=await(await f.admin(f.path+'&page=2')).json();assert.ok(all.items.some(x=>x.jobId==='job_legacy_001'));
});

test('image/video delivery is private, individually logged, output-bound, and never reads uploaded sources',async t=>{
  const f=fixture(t),base='/api/admin/customers/';
  const thumb=await f.admin(base+'inspect-thumbnail?customerId=user_PAID&jobId=job_image_001');
  assert.equal(thumb.headers.get('content-type'),'image/webp');assert.deepEqual(new Uint8Array(await thumb.arrayBuffer()),bytes);
  const full=await f.admin(base+'inspect-media?customerId=user_PAID&jobId=job_image_001');
  assert.equal(full.headers.get('content-type'),'image/png');assert.equal(full.headers.get('cache-control'),'private, no-store');
  assert.equal(full.headers.get('x-content-type-options'),'nosniff');assert.equal(full.headers.has('location'),false);
  assert.deepEqual(new Uint8Array(await full.arrayBuffer()),bytes);
  const movie=await f.admin(base+'inspect-media?customerId=user_PAID&jobId=job_video_001');
  assert.equal(movie.headers.get('content-type'),'video/mp4');assert.equal((await movie.arrayBuffer()).byteLength,4);
  await assert.rejects(()=>f.admin(base+'inspect-thumbnail?customerId=user_PAID&jobId=job_video_001'),/thumbnail unavailable/);
  await assert.rejects(()=>f.admin(base+'inspect-media?customerId=user_PAID&jobId=job_other_001'),/deleted or unavailable/);
  f.job('job_malformed_source',source);
  await assert.rejects(()=>f.admin(base+'inspect-media?customerId=user_PAID&jobId=job_malformed_source'),/result unavailable/);
  assert.equal((await(await f.admin(f.path)).json()).items.find(x=>x.jobId==='job_malformed_source').hasPreview,false);
  assert.equal(f.reads.some(x=>x.includes('/sources/')),false);
  assert.equal(f.get("SELECT COUNT(*) n FROM lab_owner_quality_review_audit WHERE action='preview_requested'").n,2);
  assert.equal(f.get("SELECT COUNT(*) n FROM lab_owner_quality_review_audit WHERE action='thumbnail_requested'").n,1);
});

test('deleted jobs are not recovered from finance; missing media and output deletion fail without upstream fallback',async t=>{
  const f=fixture(t);
  f.run("DELETE FROM jobs WHERE id='job_image_001'");
  assert.ok(f.get("SELECT job_id FROM lab_generation_finance WHERE job_id='job_image_001'"));
  assert.equal((await(await f.admin(f.path)).json()).items.some(x=>x.jobId==='job_image_001'),false);
  await assert.rejects(()=>f.admin('/api/admin/customers/inspect-media?customerId=user_PAID&jobId=job_image_001'),/deleted or unavailable/);
  assert.deepEqual(f.reads,[],'An orphaned asset is not accessible through QA');
  f.media.delete('user_PAID/results/movie.mp4');
  await assert.rejects(()=>f.admin('/api/admin/customers/inspect-media?customerId=user_PAID&jobId=job_video_001'),/deleted or unavailable/);
  f.run("UPDATE jobs SET output_id=NULL WHERE id='job_video_001'");
  assert.equal((await(await f.admin(f.path)).json()).items.find(x=>x.jobId==='job_video_001').availability,'deleted-or-unavailable');
});

test('QA reads preserve every customer job, asset, upload, credit, quote, and financial row; audit expires at 180 days',async t=>{
  const f=fixture(t),tables=['jobs','assets','quotes','spend','lab_customers','lab_credit_entries','lab_generation_finance'];
  const snapshot=()=>tables.map(name=>[name,f.db.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()]);
  const before=snapshot();
  await f.admin(f.path);await f.admin('/api/admin/customers/inspect-media?customerId=user_PAID&jobId=job_image_001');
  assert.deepEqual(snapshot(),before);
  const audit=f.get('SELECT * FROM lab_owner_quality_review_audit LIMIT 1');
  assert.deepEqual(Object.keys(audit).sort(),['action','created_at','customer_id','id','job_id','owner_id']);
  f.run('UPDATE lab_owner_quality_review_audit SET created_at=?',Date.now()-181*86400000);
  await pruneGenerationReviewAudit(f.env);
  assert.equal(f.get('SELECT COUNT(*) n FROM lab_owner_quality_review_audit').n,0);
});

test('audit failure blocks prompt disclosure and media reads',async t=>{
  const f=fixture(t),original=f.env.LAB_DB.prepare;
  f.env.LAB_DB.prepare=sql=>{if(sql.startsWith('INSERT INTO lab_owner_quality_review_audit'))throw Error('audit offline');return original(sql);};
  await assert.rejects(()=>f.admin(f.path),/audit offline/);
  await assert.rejects(()=>f.admin('/api/admin/customers/inspect-media?customerId=user_PAID&jobId=job_image_001'),/audit offline/);
  assert.deepEqual(f.reads,[]);
});
