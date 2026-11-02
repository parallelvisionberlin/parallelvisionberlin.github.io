// PV LAB: narrowly scoped, auditable fraud-review thumbnails.
// This handler MUST be reached only after labAdminRoute's requireOwner check.
// No original media, uploaded references, prompts, or public R2 URLs leave this route.
import {serveGalleryThumbnail} from './gallery-thumbnails.mjs';

const CUSTOMER=/^user_[A-Za-z0-9]+$/;
const JOB=/^[A-Za-z0-9_-]{8,120}$/;
const IMAGE_MIMES=['image/jpeg','image/png','image/webp'];
const MAX_IMAGES=36;
const AUDIT_RETENTION_MS=180*86400000;
const one=(env,sql,...values)=>env.LAB_DB.prepare(sql).bind(...values).first();
const many=async(env,sql,...values)=>(await env.LAB_DB.prepare(sql).bind(...values).all()).results;
const json=(payload,status=200)=>new Response(JSON.stringify(payload),{
  status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}
});
function fail(status,message){const error=new Error(message);error.status=status;throw error;}
async function eligibleCustomer(env,customerId){
  // A legitimate buyer, an unflagged account, and a closed account cannot be reviewed.
  return one(env,`SELECT c.id,p.email
    FROM lab_customers c
    JOIN lab_promo_generation_holds h ON h.customer_id=c.id
      AND h.reason='disposable-email' AND h.released_at IS NULL
    LEFT JOIN lab_customer_contacts p ON p.customer_id=c.id
    WHERE c.id=?
      AND NOT EXISTS (SELECT 1 FROM lab_account_closures x WHERE x.customer_id=c.id)
      AND NOT EXISTS (SELECT 1 FROM lab_credit_entries e WHERE e.customer_id=c.id
        AND e.kind IN ('purchase','subscription'))
    LIMIT 1`,customerId);
}
async function audit(env,ownerId,customerId,jobId,action){
  await env.LAB_DB.prepare(`INSERT INTO lab_owner_generation_review_audit
    (id,owner_id,customer_id,job_id,action,created_at) VALUES(?,?,?,?,?,?)`)
    .bind(crypto.randomUUID(),ownerId,customerId,jobId,action,Date.now()).run();
}
export async function ownerGenerationReviewRoute(request,env,ownerId){
  const url=new URL(request.url),path=url.pathname;
  if(request.method!=='GET')fail(405,'Only read-only review is available.');
  const customerId=url.searchParams.get('customerId')||'';
  if(!CUSTOMER.test(customerId))fail(400,'Invalid account ID.');
  const customer=await eligibleCustomer(env,customerId);
  if(!customer)fail(403,'Image review is limited to unpaid accounts with an active promotional-abuse hold.');

  if(path==='/api/admin/customers/review'){
    // The join is the security boundary: a customer's source/upload asset is not
    // eligible unless a completed job explicitly names it as its output.
    const [images,counts]=await Promise.all([
      many(env,`SELECT j.id AS jobId,j.updated_at AS finishedAt
        FROM jobs j
        JOIN assets a ON a.id=j.output_id AND a.owner_id=j.owner_id
        WHERE j.owner_id=? AND j.state='completed'
          AND a.mime IN ('image/png','image/jpeg','image/webp')
        ORDER BY j.updated_at DESC,j.id DESC LIMIT ?`,customerId,MAX_IMAGES),
      one(env,`SELECT
        COALESCE(SUM(CASE WHEN a.mime IN ('image/png','image/jpeg','image/webp') THEN 1 ELSE 0 END),0) AS imageCount,
        COALESCE(SUM(CASE WHEN a.mime LIKE 'video/%' THEN 1 ELSE 0 END),0) AS videoCount
        FROM jobs j JOIN assets a ON a.id=j.output_id AND a.owner_id=j.owner_id
        WHERE j.owner_id=? AND j.state='completed'`,customerId)
    ]);
    await audit(env,ownerId,customerId,null,'gallery_opened');
    return json({
      customer:{id:customer.id,email:customer.email},
      images,counts:{images:Number(counts?.imageCount)||0,videos:Number(counts?.videoCount)||0},
      limit:MAX_IMAGES,
      note:'Restricted to completed generated image outputs. Uploaded references, private prompts, full-size originals and video files are not available. All review requests are logged.'
    });
  }
  if(path==='/api/admin/customers/review-thumbnail'){
    const jobId=url.searchParams.get('jobId')||'';
    if(!JOB.test(jobId))fail(400,'Invalid job ID.');
    const asset=await one(env,`SELECT a.id,a.owner_id,a.object_key,a.kind,a.mime,a.bytes
      FROM jobs j JOIN assets a ON a.id=j.output_id AND a.owner_id=j.owner_id
      WHERE j.id=? AND j.owner_id=? AND j.state='completed'
        AND a.mime IN ('image/png','image/jpeg','image/webp') LIMIT 1`,jobId,customerId);
    if(!asset)fail(404,'Generated preview not available.');
    await audit(env,ownerId,customerId,jobId,'thumbnail_requested');
    const response=await serveGalleryThumbnail(env,asset);
    response.headers.set('X-Content-Type-Options','nosniff');
    response.headers.set('Cache-Control','private, no-store');
    response.headers.set('Referrer-Policy','no-referrer');
    return response;
  }
  fail(404,'Unknown review endpoint.');
}
export async function pruneGenerationReviewAudit(env,{clock=()=>Date.now()}={}){
  const cutoff=Number(clock())-AUDIT_RETENTION_MS;
  if(!Number.isSafeInteger(cutoff)||cutoff<0)return;
  await env.LAB_DB.prepare('DELETE FROM lab_owner_generation_review_audit WHERE created_at<?').bind(cutoff).run();
}
