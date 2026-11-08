import {falStatus} from './fal-controlled-pose.mjs';
import {findFalRequest} from './fal-recovery.mjs';

export const UPSCALE_RECOVERY_VERSION='20261108-independent1';
const MODELS=['fal-ai/seedvr/upscale/image','topaz/upscale/image/precision','topaz/upscale/image/generative'];
export const FAL_IMAGE_UPSCALE_SQL="(COALESCE(json_extract(params,'$.provider'),'')='fal' AND COALESCE(json_extract(params,'$.type'),'')='image' AND COALESCE(json_extract(params,'$.mode'),'')='upscale' AND COALESCE(json_extract(params,'$.model'),'') IN ('"+MODELS.join("','")+"'))";
export const FAL_UPSCALE_REVIEW_SQL="(state='uncertain' AND "+FAL_IMAGE_UPSCALE_SQL+")";
const PREPARATION_MS=120_000;
const REVIEW_DELAY_SQL="CASE WHEN created_at<? THEN 3600000 WHEN provider_id IS NULL THEN 300000 ELSE 60000 END";
const stmt=(env,sql,...params)=>env.LAB_DB.prepare(sql).bind(...params);
const first=(env,sql,...params)=>stmt(env,sql,...params).first();
const run=(env,sql,...params)=>stmt(env,sql,...params).run();
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const settings=job=>{try{return JSON.parse(job.params||'{}');}catch{return {};}};
const readJob=(env,job)=>first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',job.id,job.owner_id);

export function isFalImageUpscale(p){return p?.provider==='fal'&&p.type==='image'&&p.mode==='upscale'&&MODELS.includes(p.model);}
export function preparingUpscaleParams(p){
  if(!isFalImageUpscale(p))throw Error('Invalid upscale preparation.');
  // This marker is created after server-side settings and quote validation.
  // Ignore any similarly named client setting or historical quote property.
  return {...p,upscaleDispatch:{version:1,phase:'preparing'}};
}

export async function claimUpscaleDispatch(env,job,quote,payload,input,nowMs=Date.now()){
  const token=crypto.randomUUID(),saved=JSON.stringify({...payload,submittedInput:input});
  const result=await env.LAB_DB.batch([
    stmt(env,"UPDATE jobs SET params=json_set(params,'$.upscaleDispatch.phase','dispatching','$.upscaleDispatch.startedAt',?,'$.upscaleDispatch.token',?),updated_at=? WHERE id=? AND owner_id=? AND source_id=? AND quote_id=? AND state='submitting' AND provider_id IS NULL AND json_extract(params,'$.upscaleDispatch.version')=1 AND json_extract(params,'$.upscaleDispatch.phase')='preparing' AND EXISTS(SELECT 1 FROM quotes q WHERE q.id=jobs.quote_id AND q.owner_id=jobs.owner_id AND q.source_id=jobs.source_id AND q.vendor_quote_id='fal-upscale-v1' AND q.payload=?)",
      nowMs,token,nowMs,job.id,job.owner_id,job.source_id,quote.id,quote.payload),
    stmt(env,"UPDATE quotes SET payload=? WHERE id=? AND owner_id=? AND source_id=? AND EXISTS(SELECT 1 FROM jobs j WHERE j.id=? AND j.owner_id=quotes.owner_id AND j.source_id=quotes.source_id AND j.quote_id=quotes.id AND j.state='submitting' AND json_extract(j.params,'$.upscaleDispatch.token')=?)",
      saved,quote.id,job.owner_id,job.source_id,job.id,token)
  ]);
  // Both writes commit together. Cleanup either wins before this claim, or
  // sees 'dispatching' and cannot declare the request unsubmitted/refundable.
  return !!result[0]?.meta?.changes&&!!result[1]?.meta?.changes;
}

export async function failUnacceptedUpscale(env,job,message,{submitted=false,nowMs=Date.now()}={}){
  const token=crypto.randomUUID();
  return env.LAB_DB.batch([
    stmt(env,"UPDATE jobs SET state='failed',error=?,updated_at=?,params=json_set(params,'$.upscaleDispatch.phase',?,'$.upscaleDispatch.closedBy',?) WHERE id=? AND owner_id=? AND source_id=? AND quote_id=? AND state IN ('submitting','uncertain') AND provider_id IS NULL AND json_extract(params,'$.upscaleDispatch.version')=1",
      String(message).slice(0,600),nowMs,submitted?'rejected':'not-sent',token,job.id,job.owner_id,job.source_id,job.quote_id),
    stmt(env,"DELETE FROM spend WHERE job_id=? AND owner_id=? AND EXISTS(SELECT 1 FROM jobs j WHERE j.id=spend.job_id AND j.owner_id=spend.owner_id AND j.state='failed' AND j.provider_id IS NULL AND json_extract(j.params,'$.upscaleDispatch.closedBy')=?)",
      job.id,job.owner_id,token)
  ]);
}

export async function expirePreparingUpscales(env,{jobId=null,ownerId=null,nowMs=Date.now()}={}){
  const token=crypto.randomUUID();
  const scope=(jobId?' AND id=?':'')+(ownerId?' AND owner_id=?':'');
  const params=[nowMs,token,nowMs-PREPARATION_MS,...(jobId?[jobId]:[]),...(ownerId?[ownerId]:[])];
  const result=await env.LAB_DB.batch([
    stmt(env,"UPDATE jobs SET state='failed',error='The upscale stopped before submission. No generation was sent. You can start another upscale.',updated_at=?,params=json_set(params,'$.upscaleDispatch.phase','not-sent','$.upscaleDispatch.closedBy',?) WHERE id IN (SELECT id FROM jobs WHERE state IN ('submitting','uncertain') AND provider_id IS NULL AND "+FAL_IMAGE_UPSCALE_SQL+" AND created_at<=? AND json_extract(params,'$.upscaleDispatch.version')=1 AND json_extract(params,'$.upscaleDispatch.phase')='preparing'"+scope+" AND EXISTS(SELECT 1 FROM quotes q WHERE q.id=jobs.quote_id AND q.owner_id=jobs.owner_id AND q.source_id=jobs.source_id AND q.vendor_quote_id='fal-upscale-v1' AND json_extract(q.payload,'$.model')=json_extract(jobs.params,'$.model') AND json_extract(q.payload,'$.source.id')=jobs.source_id AND json_type(q.payload,'$.submittedInput') IS NULL) ORDER BY created_at,id LIMIT 50)",...params),
    // Only this transaction's successful closures release local budget. A
    // lost cleanup race must never delete a dispatched job's reservation.
    stmt(env,"DELETE FROM spend WHERE EXISTS(SELECT 1 FROM jobs j WHERE j.id=spend.job_id AND j.owner_id=spend.owner_id AND j.state='failed' AND j.provider_id IS NULL AND json_extract(j.params,'$.upscaleDispatch.closedBy')=?)",token)
  ]);
  return Number(result[0]?.meta?.changes)||0;
}

export async function recoverUpscale(env,job,{nowMs=Date.now(),clock=Date.now,findRequest=findFalRequest,readStatus=falStatus}={}){
  if(!job||!isFalImageUpscale(settings(job)))return null;
  if(['submitting','uncertain'].includes(job.state)){
    await expirePreparingUpscales(env,{jobId:job.id,ownerId:job.owner_id,nowMs});
    job=await readJob(env,job);
  }
  if(!job||job.state!=='uncertain'||!env.FAL_KEY)return null;
  // last_poll is a recovery lease/backoff, not the submission timestamp.
  // Unknown IDs get at most one history lookup per five minutes. Requests
  // older than a day back off to hourly checks, including across page reloads.
  const claimed=await run(env,"UPDATE jobs SET last_poll=? WHERE id=? AND owner_id=? AND state='uncertain' AND last_poll=? AND (last_poll=0 OR last_poll<=?-"+REVIEW_DELAY_SQL+")",
    nowMs,job.id,job.owner_id,job.last_poll,nowMs,nowMs-86400000);
  if(!claimed.meta.changes)return null;
  job=await readJob(env,job);
  if(!job||job.state!=='uncertain')return null;
  const p=settings(job);
  try{
    if(!job.provider_id){
      const quote=await first(env,'SELECT * FROM quotes WHERE id=? AND owner_id=? AND source_id=?',job.quote_id,job.owner_id,job.source_id);
      let saved;try{saved=JSON.parse(quote?.payload||'{}');}catch{return null;}
      if(quote?.vendor_quote_id!=='fal-upscale-v1'||saved.model!==p.model||saved.source?.id!==job.source_id||!object(saved.submittedInput))return null;
      const attemptedAt=p.upscaleDispatch?.version===1&&Number.isSafeInteger(p.upscaleDispatch.startedAt)?p.upscaleDispatch.startedAt:job.updated_at;
      const match=await findRequest({key:env.FAL_KEY,endpoint:p.model,input:saved.submittedInput,createdAt:job.created_at,updatedAt:attemptedAt,nowMs});
      const linked=await run(env,"UPDATE jobs SET provider_id=? WHERE id=? AND owner_id=? AND state='uncertain' AND provider_id IS NULL AND last_poll=? AND NOT EXISTS(SELECT 1 FROM jobs other WHERE other.id<>? AND other.provider_id=?)",
        match.requestId,job.id,job.owner_id,nowMs,job.id,match.requestId);
      if(!linked.meta.changes)return null;
      job=await readJob(env,job);
    }
    const status=await readStatus(p.model,env.FAL_KEY,job.provider_id);
    if(!['IN_QUEUE','IN_PROGRESS','COMPLETED','FAILED','CANCELLED','CANCELED'].includes(String(status?.status||'').toUpperCase()))return null;
    // Only a confirmed provider status restores an active slot. A 404, outage
    // or malformed response leaves the original review and credit hold intact.
    const resumedAt=Math.max(nowMs,clock());
    const resumed=await run(env,"UPDATE jobs SET state='queued',error='',updated_at=?,last_poll=? WHERE id=? AND owner_id=? AND state='uncertain' AND provider_id=? AND last_poll=?",
      resumedAt,resumedAt,job.id,job.owner_id,job.provider_id,nowMs);
    if(!resumed.meta.changes)return null;
    const current=await readJob(env,job);if(!current)return null;
    // Carry our actual CAS lease, never a newer poll's timestamp from this
    // reread. The confirmed response must not adopt another poll's authority.
    return {job:{...current,_falRecoveryLease:resumedAt},status};
  }catch{
    // No match, ambiguous history, permission error and outages all retain
    // the original transaction. Recovery never retries a paid endpoint.
    return null;
  }
}

export async function maintainUpscaleRecovery(env,{nowMs=Date.now(),clock=Date.now,onRecovered=async()=>{},findRequest=findFalRequest,readStatus=falStatus}={}){
  await expirePreparingUpscales(env,{nowMs});
  if(!env.FAL_KEY)return;
  const candidates=await stmt(env,"SELECT * FROM jobs WHERE "+FAL_UPSCALE_REVIEW_SQL+" AND (last_poll=0 OR last_poll<=?-"+REVIEW_DELAY_SQL+") ORDER BY last_poll,created_at,id LIMIT 2",nowMs,nowMs-86400000).all();
  for(const job of candidates.results||[]){
    try{
      const recovered=await recoverUpscale(env,job,{nowMs,clock,findRequest,readStatus});
      if(recovered)await onRecovered(recovered);
    }catch{/* A separate request's recovery remains independent. */}
  }
}
