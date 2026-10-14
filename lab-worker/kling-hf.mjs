import {hfRequest,submitHiggsfieldJob} from './higgsfield.mjs';

// Kling 3.0 Pro through Higgsfield. Owner trial only.
// Pro API does not expose a writable resolution parameter.
// Native Soul Elements require separately verified element identifiers.
export const KLING_HF_PRO=Object.freeze({
  start:'kling-video/v3.0/pro/image-to-video',
  text:'kling-video/v3.0/pro/text-to-video'
});
const MAX_QUOTE_MICROS=5000000;
const RATIOS=['16:9','9:16','1:1'];
export function klingHfParameters(value,{fail}){
  if(value?.type!=='video'||value.engine!=='klinghf'||!Object.hasOwn(KLING_HF_PRO,value.mode))
    fail(400,'Choose Kling 3.0 Pro Text or Start frame.');
  const prompt=typeof value.prompt==='string'?value.prompt.trim():'';
  if(!prompt||prompt.length>5000)fail(400,'Write a Kling motion prompt of up to 5,000 characters.');
  const duration=Number(value.duration),mode=value.mode,ratio=value.aspectRatio||'auto';
  if(!Number.isInteger(duration)||duration<3||duration>15)fail(400,'Kling Pro supports 3 to 15 seconds.');
  if(value.resolution!=='1080p')fail(400,'Kling Pro has one HD output profile.');
  if(value.model&&value.model!==KLING_HF_PRO[mode])fail(400,'Kling model does not match the selected mode.');
  if(mode==='text'&&!RATIOS.includes(ratio))fail(400,'Choose 16:9, 9:16 or 1:1 for Kling text video.');
  if(mode==='start'&&ratio!=='auto')fail(400,'Kling start-frame mode follows the source framing.');
  if(value.seed!==undefined&&value.seed!==null&&value.seed!=='')fail(400,'Kling Pro does not accept a manual seed.');
  if(value.referenceVideos?.length||value.referenceAudio?.length||value.referenceRoles?.length||value.elements?.length)
    fail(400,'Kling Pro currently accepts one start image and an optional last frame, not additional references or Elements.');
  return {type:'video',engine:'klinghf',provider:'higgsfield',mode,model:KLING_HF_PRO[mode],
    prompt,duration,resolution:'1080p',aspectRatio:ratio,audio:value.audio===true,seed:null,
    referenceRoles:[],referenceSourceIds:[],referenceVideoIds:[],referenceAudioIds:[],lastSourceId:null};
}
export function klingHfInput(p,{imageUrl=null,lastImageUrl=null}={}){
  if(p?.engine!=='klinghf'||p.model!==KLING_HF_PRO[p.mode]||!p.prompt||
    !Number.isInteger(p.duration)||p.duration<3||p.duration>15)throw new Error('Invalid Kling 3.0 Pro settings.');
  const input={prompt:p.prompt,duration:p.duration,sound:p.audio?'on':'off',cfg_scale:0.5,multi_shots:false};
  if(p.mode==='start'){
    if(!imageUrl||!/^https:\/\//.test(imageUrl))throw new Error('Kling needs an HTTPS start frame.');
    input.image_url=imageUrl;
    if(lastImageUrl){
      if(!/^https:\/\//.test(lastImageUrl))throw new Error('Kling needs an HTTPS last frame.');
      input.last_image_url=lastImageUrl;
    }
  }else{
    if(imageUrl||lastImageUrl||!RATIOS.includes(p.aspectRatio))throw new Error('Text-to-video does not accept a start frame.');
    input.aspect_ratio=p.aspectRatio;
  }
  return input;
}
export async function quoteKlingHf(env,owner,data,p,url,d){
  const {fail,source,signedInput,run,now}=d;
  if(!env.HF_CREDENTIALS)fail(503,'Higgsfield API is not configured.');
  if(p.engine!=='klinghf'||p.provider!=='higgsfield'||p.model!==KLING_HF_PRO[p.mode])
    fail(400,'Choose Higgsfield Kling 3.0 Pro.');
  if(data.referenceSourceIds?.length||data.referenceVideoIds?.length||data.referenceAudioIds?.length||data.transferSourceIds?.length)
    fail(400,'Kling Pro cannot combine extra image, video or audio references.');
  let primary=null,last=null,imageUrl=null,lastImageUrl=null;
  if(p.mode==='start'){
    if(!data.sourceId)fail(400,'Add a start frame for Kling image-to-video.');
    primary=await source(env,owner,data.sourceId);
    if(!['image/jpeg','image/png','image/webp'].includes(primary.mime))fail(400,'Kling needs a JPG, PNG or WebP start frame.');
    if(data.lastSourceId){
      last=await source(env,owner,data.lastSourceId);
      if(!['image/jpeg','image/png','image/webp'].includes(last.mime))fail(400,'Kling needs a JPG, PNG or WebP end frame.');
    }
    imageUrl=await signedInput(env,url,primary.id,86400);
    if(last)lastImageUrl=await signedInput(env,url,last.id,86400);
    p.lastSourceId=last?.id||null;
  }else if(data.sourceId||data.lastSourceId)fail(400,'Text-to-video does not use start or end photographs.');
  const input=klingHfInput(p,{imageUrl,lastImageUrl});
  const estimateReply=await hfRequest(env,'/estimate/'+p.model,{input});
  if(!/^\d{1,6}(\.\d{1,6})?$/.test(String(estimateReply.usd))||Number(estimateReply.usd)<=0)
    fail(502,'Higgsfield did not return a valid Kling estimate. No video submitted.');
  const estimate=Math.ceil(Number(estimateReply.usd)*1000000);
  if(!Number.isSafeInteger(estimate)||estimate>MAX_QUOTE_MICROS)
    fail(409,'Kling price exceeds the $5 owner-trial guard. No video submitted.');
  const id=crypto.randomUUID(),expiresAt=now()+290000;
  await run(env,'INSERT INTO quotes(id,owner_id,source_id,params,estimate_microusd,expires_at,vendor_quote_id,expected_cost,payload) VALUES(?,?,?,?,?,?,?,?,?)',
    id,owner,primary?.id||null,JSON.stringify(p),estimate,expiresAt,'higgsfield-kling3-pro',String(estimateReply.usd),JSON.stringify({model:p.model,input}));
  return {id,settings:p,estimatedUsd:estimate/1000000,maxUsd:estimate/1000000,expiresAt,
    provider:'Higgsfield',priceIsEstimate:true,
    notice:'Live Higgsfield account estimate. The Kling Pro API does not expose an exact resolution parameter. Nothing has been generated yet.'};
}
export async function submitKlingHf(env,owner,q,p,payload,d){
  const {fail,first,source,run,now,config}=d;
  if(!env.HF_CREDENTIALS)fail(503,'Higgsfield API is not configured.');
  if(q.vendor_quote_id!=='higgsfield-kling3-pro'||p.type!=='video'||p.engine!=='klinghf'||p.provider!=='higgsfield'||
    !Object.hasOwn(KLING_HF_PRO,p.mode)||p.model!==KLING_HF_PRO[p.mode]||payload.model!==p.model||!payload.input||
    q.estimate_microusd<=0||q.estimate_microusd>MAX_QUOTE_MICROS)
    fail(409,'Review a fresh Higgsfield Kling Pro estimate.');
  const old=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',q.id,owner);
  if(old)return old;
  if(p.mode==='start'){
    if(!q.source_id)fail(409,'The quoted Kling start frame is missing.');
    await source(env,owner,q.source_id);
    if(p.lastSourceId)await source(env,owner,p.lastSourceId);
  }else if(q.source_id||p.lastSourceId)fail(409,'Text-to-video quote unexpectedly contains source media.');
  const c=await config(env,owner),limit=c?.daily_limit_microusd||10000000,t=now(),id=crypto.randomUUID();
  let inserted;
  try{
    inserted=await run(env,"INSERT INTO jobs(id,owner_id,source_id,quote_id,params,state,estimate_microusd,created_at,updated_at) SELECT ?,?,?,?,?, 'submitting',?,?,? WHERE NOT EXISTS(SELECT 1 FROM jobs WHERE owner_id=? AND state='uncertain' AND json_extract(params,'$.provider')='higgsfield') AND (SELECT COUNT(*) FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','uncertain') AND json_extract(params,'$.provider')='higgsfield')<2 AND (SELECT COALESCE(SUM(estimate_microusd),0) FROM spend WHERE owner_id=? AND created_at>=?)+?<=?",id,owner,q.source_id||null,q.id,q.params,q.estimate_microusd,t,t,owner,owner,owner,Math.floor(t/86400000)*86400000,q.estimate_microusd,limit);
  }catch(e){
    const existing=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',q.id,owner);
    if(existing)return existing;
    throw e;
  }
  if(!inserted.meta.changes)fail(409,'Nothing submitted: check Higgsfield pending jobs, available slots and daily budget.');
  const job=await first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',id,owner);
  return submitHiggsfieldJob(env,job,p,payload.input,d);
}
