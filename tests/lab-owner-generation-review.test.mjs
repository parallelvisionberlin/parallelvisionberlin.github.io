import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {labAdminRoute} from '../lab-worker/promotions.mjs';
import {galleryThumbnailKey} from '../lab-worker/gallery-thumbnails.mjs';
import {pruneGenerationReviewAudit} from '../lab-worker/generation-review.mjs';

const WEBP=new Uint8Array([82,73,70,70,8,0,0,0,87,69,66,80,86,80,56,32,1,2,3,4]);
const ids={out:'11111111-1111-4111-8111-111111111111',uploaded:'22222222-2222-4222-8222-222222222222',
  video:'33333333-3333-4333-8333-333333333333',other:'44444444-4444-4444-8444-444444444444'};
function fixture(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  const read=p=>readFileSync(new URL('../lab-worker/'+p,import.meta.url),'utf8');
  db.exec(read('schema.sql'));
  for(const m of ['0006-customers-billing','0011-customer-lifecycle','0015-lab-promotional-credits',
    '0025-promo-generation-holds','0026-generation-review-audit'])
    db.exec(read('migrations/'+m+'.sql'));
  db.exec(read('migrations/0026-generation-review-audit.sql')); // Idempotent.
  const query=(sql,...args)=>db.prepare(sql).run(...args);
  const get=(sql,...args)=>db.prepare(sql).get(...args);
  const prepare=sql=>({bind(...args){const s=db.prepare(sql);return {
    first:async()=>s.get(...args)||null,
    all:async()=>({results:s.all(...args)}),
    run:async()=>({meta:{changes:s.run(...args).changes}})
  };}});
  const storageReads=[];
  const env={LAB_DB:{prepare},OWNER_DB:{prepare(){
    return {bind(id){return {first:async()=>id==='owner_live'?{id}:null};}};
  }},LAB_MEDIA:{
    async get(key){
      storageReads.push(key);
      if(key===galleryThumbnailKey({
        id:ids.out,owner_id:'user_FLAGGED'
      }))return {body:new Response(WEBP).body,size:WEBP.length};
      return null;
    }
  }};
  for(const id of ['user_FLAGGED','user_REGULAR','user_BUYER']){
    query('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)',
      id,id,1,1);
  }
  const asset=(id,owner,object,mime,kind='source')=>query(
    'INSERT INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,?,?,?,?,?)',
    id,owner,object,kind,mime,'private',42,1);
  asset(ids.out,'user_FLAGGED','user_FLAGGED/results/generated.png','image/png');
  asset(ids.uploaded,'user_FLAGGED','user_FLAGGED/sources/uploaded-reference.png','image/png');
  asset(ids.video,'user_FLAGGED','user_FLAGGED/results/movie.mp4','video/mp4','video');
  asset(ids.other,'user_REGULAR','user_REGULAR/results/other.png','image/png');
  const job=(id,owner,output,state='completed')=>query(
    'INSERT INTO jobs(id,owner_id,params,state,output_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',
    id,owner,JSON.stringify({prompt:'NEVER RETURN PRIVATE PROMPT',sourceUrl:'https://example.test/secret-source'}),
    state,output,10,20);
  job('job_generated_001','user_FLAGGED',ids.out);
  job('job_video_001','user_FLAGGED',ids.video);
  job('job_uploaded_reference','user_FLAGGED',ids.uploaded,'draft');
  job('job_other_customer','user_REGULAR',ids.other);
  // Backfill scenario: outputs existed before the suspicious accounts were held.
  query('INSERT INTO lab_promo_generation_holds(customer_id,reason,created_at) VALUES(?,?,?)',
    'user_FLAGGED','disposable-email',Date.now());
  query('INSERT INTO lab_promo_generation_holds(customer_id,reason,created_at) VALUES(?,?,?)',
    'user_BUYER','disposable-email',Date.now());
  const request=(path,method='GET')=>new Request('https://parallel-vision-lab.parallelvision.workers.dev'+path,{method});
  const admin=(path,subject='owner_live',method='GET')=>labAdminRoute(request(path,method),env,subject);
  return {db,env,query,get,request,admin,storageReads};
}

test('owner review lists only completed generated outputs, never uploaded references, prompts, or full URLs',async t=>{
  const f=fixture(t);
  await assert.rejects(()=>f.admin('/api/admin/customers/review?customerId=user_FLAGGED','user_FLAGGED'),
    /owner access required/);
  await assert.rejects(()=>f.admin('/api/admin/customers/review?customerId=user_REGULAR'),
    /active promotional-abuse hold/);
  await assert.rejects(()=>f.admin('/api/admin/customers/review?customerId=%27%3Bdrop'),/Invalid account ID/);
  const response=await f.admin('/api/admin/customers/review?customerId=user_FLAGGED');
  assert.equal(response.status,200);
  assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  const body=await response.json();
  assert.deepEqual(body.images.map(v=>v.jobId),['job_generated_001']);
  assert.equal(body.counts.images,1);
  assert.equal(body.counts.videos,1);
  assert.equal(JSON.stringify(body).includes('NEVER RETURN PRIVATE PROMPT'),false);
  assert.equal(JSON.stringify(body).includes(ids.uploaded),false);
  assert.equal(JSON.stringify(body).includes('results/generated.png'),false);
  assert.equal(f.get("SELECT COUNT(*) AS n FROM lab_owner_generation_review_audit WHERE action='gallery_opened'").n,1);
  assert.deepEqual(f.storageReads,[],'list view never reads even preview bytes');
});

test('thumbnail is owner-authenticated, restricted to output image, WebP-only and individually logged',async t=>{
  const f=fixture(t);
  const path='/api/admin/customers/review-thumbnail?customerId=user_FLAGGED&jobId=job_generated_001';
  await assert.rejects(()=>f.admin(path,'user_FLAGGED'),/owner access required/);
  await assert.rejects(()=>f.admin('/api/admin/customers/review-thumbnail?customerId=user_FLAGGED&jobId=job_uploaded_reference'),
    /Generated preview not available/);
  await assert.rejects(()=>f.admin('/api/admin/customers/review-thumbnail?customerId=user_FLAGGED&jobId=job_other_customer'),
    /Generated preview not available/);
  await assert.rejects(()=>f.admin('/api/admin/customers/review-thumbnail?customerId=user_FLAGGED&jobId=job_video_001'),
    /Generated preview not available/);
  const result=await f.admin(path);
  assert.equal(result.status,200);
  assert.equal(result.headers.get('content-type'),'image/webp');
  assert.equal(result.headers.get('cache-control'),'private, no-store');
  assert.equal(result.headers.get('x-content-type-options'),'nosniff');
  assert.deepEqual(new Uint8Array(await result.arrayBuffer()),WEBP);
  assert.deepEqual(f.storageReads,[galleryThumbnailKey({id:ids.out,owner_id:'user_FLAGGED'})],
    'never read full original or uploaded reference when cached thumbnail exists');
  assert.equal(f.get("SELECT COUNT(*) AS n FROM lab_owner_generation_review_audit WHERE action='thumbnail_requested'").n,1);
  assert.equal(f.get("SELECT job_id FROM lab_owner_generation_review_audit WHERE action='thumbnail_requested'").job_id,'job_generated_001');
});

test('buyers, closed accounts, and released holds are excluded; no unwarranted audit record',async t=>{
  const f=fixture(t);
  f.query("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('buy','user_BUYER',1000,'purchase','checkout:verified',1)");
  await assert.rejects(()=>f.admin('/api/admin/customers/review?customerId=user_BUYER'),/active promotional-abuse hold/);
  f.query("INSERT INTO lab_account_closures(customer_id,requested_at) VALUES('user_FLAGGED',?)",Date.now());
  await assert.rejects(()=>f.admin('/api/admin/customers/review?customerId=user_FLAGGED'),/active promotional-abuse hold/);
  f.query('DELETE FROM lab_account_closures WHERE customer_id=?','user_FLAGGED');
  f.query('UPDATE lab_promo_generation_holds SET released_at=? WHERE customer_id=?',Date.now(),'user_FLAGGED');
  await assert.rejects(()=>f.admin('/api/admin/customers/review?customerId=user_FLAGGED'),/active promotional-abuse hold/);
  assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_owner_generation_review_audit').n,0);
});

test('review audit expires after 180 days, never stores images or prompts',async t=>{
  const f=fixture(t);
  await f.admin('/api/admin/customers/review?customerId=user_FLAGGED');
  const audit=f.get('SELECT * FROM lab_owner_generation_review_audit LIMIT 1');
  assert.equal(audit.owner_id,'owner_live');
  assert.equal(audit.customer_id,'user_FLAGGED');
  assert.equal(audit.job_id,null);
  assert.equal(JSON.stringify(audit).includes('NEVER RETURN PRIVATE PROMPT'),false);
  f.query('UPDATE lab_owner_generation_review_audit SET created_at=?',Date.now()-181*86400000);
  await pruneGenerationReviewAudit(f.env);
  assert.equal(f.get('SELECT COUNT(*) AS n FROM lab_owner_generation_review_audit').n,0);
});
