// Internal quality review. labAdminRoute authenticates the owner before every call.
// Read retained creative jobs only. Never reconstruct creative data from finance.
import {serveGalleryThumbnail} from './gallery-thumbnails.mjs';

const PAGE_SIZE=24;
const IMAGE_TYPES=['image/jpeg','image/png','image/webp'];
const VIDEO_TYPES=['video/mp4','video/webm','video/quicktime'];
const resultKey=(key,owner)=>typeof key==='string'&&
  [owner+'/results/',owner+'/film-finish/'].some(prefix=>key.startsWith(prefix));
const one=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).first();
const all=async(env,sql,...args)=>(await env.LAB_DB.prepare(sql).bind(...args).all()).results;
function fail(status,message){const e=new Error(message);e.status=status;throw e;}
const headers=()=>({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin'});
const json=data=>new Response(JSON.stringify(data),{headers:{...headers(),'Content-Type':'application/json'}});
function object(raw){try{const v=JSON.parse(raw||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}}
const text=v=>typeof v==='string'?v:'';
const scalar=v=>typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v);
const FIELDS=['mode','type','engine','provider','moodId','customMoodName','moodIntensity','resolution',
  'aspectRatio','duration','seed','referenceMode','outputFormat','processing','audio','scale','topazModel',
  'upscaleEngine','videoUpscaleEngine','soulProModel','soulProQuality','fashionModel','fashionCategory',
  'generationMode','quality','strength','identityStrength','preset','count','batchCount','batchIndex',
  'moodReferenceCount','moodReferenceVersion','referenceGuidanceVersion','exactPrompt','filmFinish'];
function details(params,payload){
  const p=object(params),saved=object(payload),settings={};
  for(const key of FIELDS)if(scalar(p[key]))settings[key]=p[key];
  settings.referencesCount=Array.isArray(p.referenceSourceIds)?p.referenceSourceIds.length:0;
  if(Array.isArray(p.referenceVideoIds))settings.videoReferencesCount=p.referenceVideoIds.length;
  if(Array.isArray(p.referenceAudioIds))settings.audioReferencesCount=p.referenceAudioIds.length;
  // Saved provider inputs can contain private URLs. Extract prompt text only.
  const providerPrompt=[saved.submittedInput?.prompt,saved.input?.prompt,saved.prompt]
    .find(v=>typeof v==='string');
  return {settings,prompt:providerPrompt??text(p.prompt),
    promptSource:providerPrompt!==undefined?'saved-provider-request':'stored-job-prompt',
    storedPrompt:text(p.prompt),originalDirection:text(p.moodOriginalPrompt)};
}
const p="(CASE WHEN json_valid(j.params) THEN j.params ELSE '{}' END)";
const q="(CASE WHEN json_valid(q.payload) THEN q.payload ELSE '{}' END)";
const field=key=>`COALESCE(CASE WHEN json_type(${p},'$.${key}')='text' THEN json_extract(${p},'$.${key}') END,'')`;
const MODEL=`COALESCE(CASE WHEN json_type(${q},'$.model')='text' THEN json_extract(${q},'$.model') END,NULLIF(${field('model')},''),'')`;
const FEATURE=`CASE WHEN ${field('mode')}='upscale' THEN 'Upscaler'
  WHEN ${field('mode')} IN ('identity-edit','reinterpret') THEN 'ALTER'
  WHEN ${field('provider')}='fashn' OR ${field('fashionModel')}<>'' OR ${field('mode')} LIKE 'fashion%' THEN 'Fashion Studio'
  WHEN ${field('moodId')}<>'' THEN 'Moods'
  WHEN ${field('type')}='video' THEN 'Video Studio'
  WHEN ${field('mode')}='controlled-repair' THEN 'Retouch Studio'
  WHEN ${field('type')}='image' THEN 'Image Studio'
  ELSE COALESCE(NULLIF(${field('mode')},''),'Unrecorded') END`;
const JOIN='FROM jobs j LEFT JOIN quotes q ON q.id=j.quote_id AND q.owner_id=j.owner_id';
const FILTERS={mood:field('moodId'),feature:FEATURE,model:MODEL,status:'j.state'};
async function audit(env,owner,customer,job,action){
  // Fail closed if logging fails. No media bytes or prompt text in the audit.
  await env.LAB_DB.prepare(`INSERT INTO lab_owner_quality_review_audit
    (id,owner_id,customer_id,job_id,action,created_at) VALUES(?,?,?,?,?,?)`)
    .bind(crypto.randomUUID(),owner,customer,job,action,Date.now()).run();
}
export async function ownerQualityReviewRoute(request,env,owner){
  if(request.method!=='GET')fail(405,'Quality review is read-only.');
  const url=new URL(request.url),customerId=url.searchParams.get('customerId')||'';
  if(!/^[A-Za-z0-9_-]{4,160}$/.test(customerId))fail(400,'Invalid customer account ID.');
  const customer=await one(env,`SELECT c.id FROM lab_customers c WHERE c.id=? AND NOT EXISTS
    (SELECT 1 FROM lab_account_closures x WHERE x.customer_id=c.id)`,customerId);
  if(!customer)fail(404,'Customer unavailable or account closed.');
  if(url.pathname==='/api/admin/customers/inspect'){
    const raw=url.searchParams.get('page')||'1';
    if(!/^[1-9][0-9]{0,5}$/.test(raw))fail(400,'Invalid generation page.');
    const page=Number(raw),values=[customerId],conditions=['j.owner_id=?'];
    for(const [key,expr] of Object.entries(FILTERS)){
      const value=url.searchParams.get(key)||'';
      if(value.length>200)fail(400,'Invalid review filter.');
      if(value){conditions.push(expr+'=?');values.push(value);}
    }
    const where=' WHERE '+conditions.join(' AND ');
    const [count,facets,rows]=await Promise.all([
      one(env,'SELECT COUNT(*) AS n '+JOIN+where,...values),
      all(env,`SELECT DISTINCT ${field('moodId')} AS mood,${FEATURE} AS feature,${MODEL} AS model,j.state AS status
        ${JOIN} WHERE j.owner_id=?`,customerId),
      all(env,`SELECT j.id AS jobId,j.params,q.payload,j.state,j.created_at AS createdAt,j.updated_at AS updatedAt,
        ${MODEL} AS model,${field('provider')} AS provider,${FEATURE} AS feature,${field('moodId')} AS mood,
        j.settled_cost AS settledCostUsd,j.estimate_microusd AS estimateMicrousd,
        a.mime AS outputMime,a.bytes AS outputBytes,a.object_key AS outputKey,
        COALESCE((SELECT -SUM(e.delta_credits) FROM lab_credit_entries e WHERE e.customer_id=j.owner_id
          AND e.kind='generation' AND e.reference='job:'||j.id),0) AS chargedCredits,
        COALESCE((SELECT SUM(e.delta_credits) FROM lab_credit_entries e WHERE e.customer_id=j.owner_id
          AND e.kind='refund' AND e.reference='refund:job:'||j.id),0) AS refundedCredits
        ${JOIN} LEFT JOIN assets a ON a.id=j.output_id AND a.owner_id=j.owner_id
        ${where} ORDER BY j.created_at DESC,j.id DESC LIMIT ? OFFSET ?`,...values,PAGE_SIZE,(page-1)*PAGE_SIZE)
    ]);
    await audit(env,owner,customerId,null,'page_opened');
    const items=rows.map(({params,payload,settledCostUsd,estimateMicrousd,outputKey,...row})=>{
      const hasPreview=row.state==='completed'&&resultKey(outputKey,customerId)&&[...IMAGE_TYPES,...VIDEO_TYPES].includes(row.outputMime);
      return {...row,...details(params,payload),hasPreview,
        mediaKind:IMAGE_TYPES.includes(row.outputMime)?'image':VIDEO_TYPES.includes(row.outputMime)?'video':null,
        availability:hasPreview?'retained':row.state==='completed'?'deleted-or-unavailable':'no-completed-result',
        providerCostUsd:settledCostUsd??null,estimatedCostUsd:estimateMicrousd/1000000,
        costKind:settledCostUsd!==null?'settled':row.state==='failed'||row.state==='uncertain'?'unconfirmed':'estimate'};
    });
    return json({items,page,pageSize:PAGE_SIZE,total:Number(count.n),hasMore:page*PAGE_SIZE<Number(count.n),
      filters:Object.fromEntries(Object.keys(FILTERS).map(key=>[key,[...new Set(facets.map(v=>v[key]).filter(Boolean))].sort()])),
      note:'Internal quality assurance. Access is logged. Only retained generated results are available; uploads and deleted creative content are excluded.'});
  }
  if(!['/api/admin/customers/inspect-thumbnail','/api/admin/customers/inspect-media'].includes(url.pathname))fail(404,'Unknown quality review endpoint.');
  const jobId=url.searchParams.get('jobId')||'';
  if(!/^[A-Za-z0-9_-]{8,120}$/.test(jobId))fail(400,'Invalid generation ID.');
  const asset=await one(env,`SELECT a.id,a.owner_id,a.object_key,a.kind,a.mime,a.bytes
    FROM jobs j JOIN assets a ON a.id=j.output_id AND a.owner_id=j.owner_id
    WHERE j.id=? AND j.owner_id=? AND j.state='completed'`,jobId,customerId);
  if(!asset||![...IMAGE_TYPES,...VIDEO_TYPES].includes(asset.mime))fail(404,'Generated result deleted or unavailable.');
  // Output linkage and storage namespace both exclude source uploads, even if a
  // malformed historic row mistakenly points output_id at an uploaded reference.
  if(!resultKey(asset.object_key,customerId))fail(404,'Generated result unavailable.');
  const thumbnail=url.pathname.endsWith('thumbnail');
  if(thumbnail&&!IMAGE_TYPES.includes(asset.mime))fail(415,'Image thumbnail unavailable.');
  await audit(env,owner,customerId,jobId,thumbnail?'thumbnail_requested':'preview_requested');
  if(thumbnail){
    const response=await serveGalleryThumbnail(env,asset);
    for(const [key,value] of Object.entries(headers()))response.headers.set(key,value);
    return response;
  }
  // No redirects, signed URLs, provider fetches or public object addresses.
  const stored=await env.LAB_MEDIA.get(asset.object_key);
  if(!stored)fail(404,'Generated result deleted or unavailable.');
  return new Response(stored.body,{headers:{...headers(),'Content-Type':asset.mime,
    'Content-Length':String(stored.size),'Content-Disposition':'inline'}});
}
export async function pruneQualityReviewAudit(env,{clock=()=>Date.now()}={}){
  const cutoff=Number(clock())-180*86400000;
  if(Number.isSafeInteger(cutoff)&&cutoff>=0)
    await env.LAB_DB.prepare('DELETE FROM lab_owner_quality_review_audit WHERE created_at<?').bind(cutoff).run();
}
