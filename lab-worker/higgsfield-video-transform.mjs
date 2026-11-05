/* PV LAB / Seedance 2.5 Video Edit — Replace Character v1.
 * Reuses the existing private asset, quote, wallet and Higgsfield job lifecycle.
 * Does not modify Create, Reference or Extend semantics.
 */
import {creditsForJobMicros} from './job-pricing.mjs';
import {hfRequest,submitHiggsfieldJob} from './higgsfield.mjs';

export const TRANSFORM_MODEL='bytedance/seedance-2.5/video-edit';
export const TRANSFORM_MAX_ESTIMATE_MICROS=20000000; // $20 provider quote safety ceiling for v1.
const IMAGE_MIME=new Set(['image/jpeg','image/png','image/webp']);
const VIDEO_MIME=new Set(['video/mp4','video/quicktime']);

export function characterTransformPrompt(p){
  const images=p.referenceSourceIds||[],roles=p.referenceRoles||[];
  const lines=[
    'VIDEO EDIT: Replace the main visible person in the uploaded source video with the character identity shown in the attached reference images.',
    'Preserve the original video timeline, gestures, body movement, posing, camera movement, framing, lens perspective, location, background, props, wardrobe, scene lighting and editing rhythm. Keep the motion continuous and physically plausible.',
    'Use the identity references for recognizable face structure, hairstyle, skin texture and stable visible traits only. Do not import their clothing, setting, poses or lighting into the video.',
    'Do not add or remove other people, change the environment, invent a new shot, or turn the clip into a slideshow.',
    ...roles.slice(0,images.length).map((r,i)=>'Identity reference '+(i+1)+((r.elementName||r.name)?' ('+String(r.elementName||r.name).slice(0,80)+')':'')+': '+[r.note||r.elementNote||''].filter(Boolean).join(' ')).filter(Boolean),
    p.prompt?'Additional direction: '+p.prompt:''
  ];
  const result=lines.join('\n');
  if(result.length>5000)throw new Error('Transform instructions and reference notes are too long. Shorten them before the price check.');
  return result;
}

export async function prepareCharacterTransform(env,owner,data,p,d){
  const {fail,source,sources}=d;
  if(p.mode!=='transform'||p.model!==TRANSFORM_MODEL||p.engine!=='seedance'||p.transformType!=='replace-character')
    fail(400,'Choose Seedance Transform / Replace Character.');
  if(data.lastSourceId||data.transferSourceIds?.length||data.referenceAudioIds?.length||p.referenceAudio?.length)
    fail(400,'Transform accepts one source video and identity photographs, without an end frame or audio references.');
  const videos=data.referenceVideoIds||[];
  if(!Array.isArray(videos)||videos.length!==1||p.referenceVideos?.length!==1||new Set(videos).size!==1)
    fail(400,'Choose exactly one original video to transform.');
  if(data.sourceId&&data.sourceId!==videos[0])fail(400,'The original video does not match the selected source.');
  const original=await source(env,owner,videos[0]);
  if(!VIDEO_MIME.has(original.mime)||!original.bytes||original.bytes>20*1048576)
    fail(400,'Use an MP4 or MOV source video up to 20 MiB.');
  const seconds=Number(p.referenceVideos[0].seconds);
  if(!Number.isFinite(seconds)||seconds<4||seconds>30)
    fail(400,'Transform requires an original video between 4 and 30 seconds.');
  const ids=data.referenceSourceIds||[];
  if(!Array.isArray(ids)||ids.length<1||ids.length>8||new Set(ids).size!==ids.length)
    fail(400,'Add 1 to 8 different reference photographs of the replacement character.');
  const images=await sources(env,owner,ids,8);
  if(images.some(item=>!IMAGE_MIME.has(item.mime)))fail(400,'Replacement character references must be JPG, PNG or WebP.');
  if(p.referenceRoles.length&&p.referenceRoles.length!==images.length)
    fail(400,'Reference roles and photographs must match in order.');
  if(!['480p','720p','1080p'].includes(p.resolution))
    fail(400,'Choose 480p, 720p or 1080p for Seedance Video Edit.');
  p.provider='higgsfield';
  p.referenceSourceIds=images.map(x=>x.id);
  p.referenceVideoIds=[original.id];p.referenceAudioIds=[];
  p.lastSourceId=null;p.seed=null;p.aspectRatio='source';
  p.sourceDurationSeconds=seconds;p.duration=Math.max(4,Math.min(30,Math.round(seconds)));
  return {original,images};
}

export async function quoteCharacterTransform(env,owner,data,p,url,d){
  const {fail,signedInput,run,now,isLabCustomer}=d;
  if(!env.HF_CREDENTIALS)fail(503,'Higgsfield Video Edit is not connected. No generation submitted.');
  if(isLabCustomer&&await isLabCustomer(env,owner)&&env.LAB_CUSTOMER_HIGGSFIELD_ENABLED!=='true')
    fail(403,'Transform is not enabled for customer billing yet. No generation submitted.');
  const {original,images}=await prepareCharacterTransform(env,owner,data,p,d);
  let prompt;
  try{prompt=characterTransformPrompt(p);}catch(e){fail(400,e.message);}
  const input={
    video_url:await signedInput(env,url,original.id,3600),
    image_urls:await Promise.all(images.map(item=>signedInput(env,url,item.id,3600))),
    prompt,resolution:p.resolution,generate_audio:p.audio,output_format:'mp4'
  };
  const quoted=await hfRequest(env,'/estimate/'+TRANSFORM_MODEL,{input});
  const usd=Number(quoted.usd),estimate=Math.ceil(usd*1000000);
  if(!Number.isFinite(usd)||usd<=0||!Number.isSafeInteger(estimate))
    fail(502,'Higgsfield did not return a valid Video Edit estimate. Nothing submitted.');
  if(estimate>TRANSFORM_MAX_ESTIMATE_MICROS)
    fail(409,'The Video Edit provider estimate exceeds the $20 safety limit. Use a shorter source or lower resolution. Nothing submitted.');
  const creditCost=creditsForJobMicros(estimate,p),id=crypto.randomUUID(),expiresAt=now()+290000;
  await run(env,'INSERT INTO quotes(id,owner_id,source_id,params,estimate_microusd,expires_at,vendor_quote_id,expected_cost,payload) VALUES(?,?,?,?,?,?,?,?,?)',
    id,owner,original.id,JSON.stringify({...p,customerChargeCredits:creditCost}),estimate,expiresAt,
    'higgsfield-video-transform-character-v1',String(quoted.usd),JSON.stringify({model:TRANSFORM_MODEL,input}));
  return {id,settings:p,estimatedUsd:usd,maxUsd:usd,creditCost,expiresAt,
    provider:'Higgsfield',priceIsEstimate:true,requiresPriceReview:true,
    notice:'Seedance Video Edit changes the source footage and may not perfectly preserve identity, movement or background. Source and output video time can both be billable. This is a live account estimate, not a guaranteed final provider bill. No video submitted until you confirm.'};
}

export async function submitCharacterTransform(env,owner,q,p,payload,d){
  const {fail,first,source,run,now,config,isLabCustomer}=d;
  if(isLabCustomer&&await isLabCustomer(env,owner)&&env.LAB_CUSTOMER_HIGGSFIELD_ENABLED!=='true')
    fail(403,'Transform customer billing is not enabled. No job submitted.');
  if(!env.HF_CREDENTIALS||q.vendor_quote_id!=='higgsfield-video-transform-character-v1'||
     p.mode!=='transform'||p.transformType!=='replace-character'||p.model!==TRANSFORM_MODEL||
     payload.model!==TRANSFORM_MODEL||!payload.input?.video_url||
     !Array.isArray(payload.input.image_urls)||payload.input.image_urls.length!==p.referenceSourceIds?.length||
     q.estimate_microusd<1||q.estimate_microusd>TRANSFORM_MAX_ESTIMATE_MICROS)
    fail(409,'Video Transform quote is invalid or expired. Review a new estimate; no job submitted.');
  const video=await source(env,owner,q.source_id);
  if(!VIDEO_MIME.has(video.mime)||p.referenceVideoIds?.length!==1||p.referenceVideoIds[0]!==video.id)
    fail(409,'The original video changed. Review a new estimate.');
  for(const id of p.referenceSourceIds)await source(env,owner,id);
  const previous=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',q.id,owner);
  if(previous)return previous;
  const c=await config(env,owner),limit=c?.daily_limit_microusd||10000000,t=now(),id=crypto.randomUUID();
  let inserted;
  try{
    inserted=await run(env,"INSERT INTO jobs(id,owner_id,source_id,quote_id,params,state,estimate_microusd,created_at,updated_at) SELECT ?,?,?,?,?, 'submitting',?,?,? WHERE NOT EXISTS(SELECT 1 FROM jobs WHERE owner_id=? AND state='uncertain' AND json_extract(params,'$.provider')='higgsfield') AND (SELECT COUNT(*) FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','uncertain') AND json_extract(params,'$.provider')='higgsfield')<2 AND (SELECT COALESCE(SUM(estimate_microusd),0) FROM spend WHERE owner_id=? AND created_at>=?)+?<=?",
      id,owner,video.id,q.id,q.params,q.estimate_microusd,t,t,owner,owner,owner,Math.floor(t/86400000)*86400000,q.estimate_microusd,limit);
  }catch(error){
    // A concurrent confirmation may have won the unique quote_id reservation.
    // Return that one job, never submit a second provider request.
    const existing=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',q.id,owner);
    if(existing)return existing;
    throw error;
  }
  if(!inserted.meta.changes){
    const existing=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',q.id,owner);
    if(existing)return existing;
    fail(409,'Nothing submitted: an unresolved Higgsfield job, concurrency limit or daily spending limit blocks the charge. Review History.');
  }
  const job=await first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',id,owner);
  return submitHiggsfieldJob(env,job,p,payload.input,d);
}
