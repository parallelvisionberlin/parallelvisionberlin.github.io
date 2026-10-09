import {hfRequest,submitHiggsfieldJob} from './higgsfield.mjs';
export const EXTEND_MODEL='bytedance/seedance-2.5/video-extend';
export async function quoteVideoExtension(env,owner,data,p,url,d){
  const {fail,source,signedInput,run,now}=d;
  if(!env.HF_CREDENTIALS)fail(503,'Higgsfield API is not configured.');
  if(p.model!==EXTEND_MODEL||p.mode!=='extend'||!p.prompt)fail(400,'Choose Extend video and describe what happens next.');
  const ids=data.referenceVideoIds||[];
  if(ids.length!==1||p.referenceVideos.length!==1||data.referenceSourceIds?.length||data.referenceAudioIds?.length||data.lastSourceId)fail(400,'Choose exactly one video to extend.');
  if(data.sourceId&&data.sourceId!==ids[0])fail(400,'The source must match the video to extend.');
  const video=await source(env,owner,ids[0]);if(!['video/mp4','video/quicktime'].includes(video.mime))fail(400,'Choose an MP4 or MOV video.');
  p.provider='higgsfield';p.referenceVideoIds=[video.id];p.referenceAudioIds=[];p.referenceSourceIds=[];p.referenceRoles=[];p.lastSourceId=null;p.seed=null;p.aspectRatio='source';
  const input={video_url:await signedInput(env,url,video.id,3600),prompt:p.prompt,duration:p.duration,resolution:p.resolution,generate_audio:p.audio,output_format:'mp4'};
  const quote=await hfRequest(env,'/estimate/'+EXTEND_MODEL,{input});
  if(!/^\d{1,6}(\.\d{1,6})?$/.test(String(quote.usd))||Number(quote.usd)<=0)fail(502,'Higgsfield did not return a valid estimate. Nothing generated.');
  const estimate=Math.ceil(Number(quote.usd)*1000000),id=crypto.randomUUID(),expires=now()+290000;
  await run(env,'INSERT INTO quotes(id,owner_id,source_id,params,estimate_microusd,expires_at,vendor_quote_id,expected_cost,payload) VALUES(?,?,?,?,?,?,?,?,?)',id,owner,video.id,JSON.stringify(p),estimate,expires,'higgsfield-video-extend',String(quote.usd),JSON.stringify({model:EXTEND_MODEL,input}));
  return {id,settings:p,estimatedUsd:estimate/1000000,maxUsd:estimate/1000000,expiresAt:expires,provider:'Higgsfield',priceIsEstimate:true,notice:'Higgsfield account estimate. Input and generated video may both be billed. Final provider billing applies. Nothing generated yet.'};
}
export async function submitVideoExtension(env,owner,q,p,payload,d){
  const {fail,first,source,run,now,config}=d;
  if(!env.HF_CREDENTIALS)fail(503,'Higgsfield API is not configured.');
  if(q.vendor_quote_id!=='higgsfield-video-extend'||p.model!==EXTEND_MODEL||payload.model!==EXTEND_MODEL||p.mode!=='extend')fail(409,'Review a new extension estimate.');
  await source(env,owner,q.source_id);
  const old=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',q.id,owner);if(old)return old;
  const c=await config(env,owner),limit=c?.daily_limit_microusd||10000000,t=now(),id=crypto.randomUUID();
  let inserted;
  try{inserted=await run(env,"INSERT INTO jobs(id,owner_id,source_id,quote_id,params,state,estimate_microusd,created_at,updated_at) SELECT ?,?,?,?,?, 'submitting',?,?,? WHERE NOT EXISTS(SELECT 1 FROM jobs WHERE owner_id=? AND state='uncertain' AND json_extract(params,'$.provider')='higgsfield') AND (SELECT COUNT(*) FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','uncertain') AND json_extract(params,'$.provider')='higgsfield')<2 AND (SELECT COUNT(*) FROM jobs WHERE owner_id=?)<500 AND (SELECT COALESCE(SUM(estimate_microusd),0) FROM spend WHERE owner_id=? AND created_at>=?)+?<=?",id,owner,q.source_id,q.id,q.params,q.estimate_microusd,t,t,owner,owner,owner,owner,Math.floor(t/86400000)*86400000,q.estimate_microusd,limit);}catch(e){const existing=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',q.id,owner);if(existing)return existing;throw e;}
  if(!inserted.meta.changes)fail(409,'Nothing submitted: check Higgsfield pending requests and your daily spending limit.');
  const job=await first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',id,owner);
  return submitHiggsfieldJob(env,job,p,payload.input,d);
}
