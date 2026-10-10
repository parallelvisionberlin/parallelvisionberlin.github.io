// Official Soul 2 / Soul ID API. Credentials stay in the Worker secret HF_CREDENTIALS.
export const SOUL2_MODEL='higgsfield-ai/soul/v2/image-to-image';
export const SOUL2_TEXT_MODEL='higgsfield-ai/soul/v2/standard';
export const SOUL2_PRICES={training:2500000,'720p':3200,'1080p':5700}; // Published estimates, not a billing ceiling.
const SOUL2_MAX_QUOTE_MICROS=250000; // Owner/editor abnormal-price guard.
export const SOUL2_CUSTOMER_MAX_QUOTE_MICROS=15000; // At 460 credits/USD, any eligible Soul 2 image costs exactly 7 credits.
const ORIGIN='https://api.higgsfield.ai';
const ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const RATIOS=['16:9','9:16','4:3','3:4','1:1','2:3','3:2'];
const TRAIN='soul-id-training';
export function soul2Ratio(width,height){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return '16:9';
  return RATIOS.reduce((best,r)=>{const value=x=>{const [w,h]=x.split(':').map(Number);return Math.abs(Math.log((w/h)/(width/height)));};return value(r)<value(best)?r:best;},RATIOS[0]);
}
export function soul2Parameters(value,fail){
  if(!value||value.type!=='image')fail(400,'Choose an image generation.');
  const prompt=String(value.prompt||'').trim(),strength=Number(value.identityStrength??1),resolution=value.resolution||'1080p';
  if(prompt.length>3500)fail(400,'Use an instruction of up to 3,500 characters.');
  if(!Number.isFinite(strength)||strength<0||strength>1)fail(400,'Soul 2 identity strength must be between 0 and 1.');
  if(!['720p','1080p'].includes(resolution))fail(400,'Choose 720p or 1080p.');
  if(value.characterId&&!ID.test(value.characterId))fail(400,'Choose a completed Higgsfield Soul ID.');
  const seed=value.seed===''||value.seed==null?null:Number(value.seed);
  if(seed!==null&&(!Number.isInteger(seed)||seed<1||seed>1000000))fail(400,'Soul 2 seed must be between 1 and 1,000,000.');
  return {type:'image',provider:'higgsfield',engine:'soulpro',soulProModel:'soul2',mode:'identity-edit',model:SOUL2_MODEL,prompt,identityStrength:strength,characterId:value.characterId,resolution,aspectRatio:RATIOS.includes(value.aspectRatio)?value.aspectRatio:'source',outputFormat:'png',seed,referenceRoles:[]};
}
export function soul2Input(p,imageUrl,referenceId){
  if(referenceId&&!ID.test(referenceId))throw new Error('Choose a valid Soul ID.');
  if(!imageUrl&&!p.prompt)throw new Error('Write a prompt or add a photograph.');
  return {...(imageUrl?{image_url:imageUrl}:{}),...(referenceId?{custom_reference_id:referenceId,custom_reference_strength:p.identityStrength}:{}),
    prompt:imageUrl?((referenceId?'Reinterpret the supplied photograph with the selected character identity. Preserve the source outfit, accessories, body pose, framing, camera angle, background and lighting. Change the person’s identity to the trained character. Natural photographic skin and fabric texture.':'Reinterpret the supplied photograph with natural photographic detail. Preserve its subject, outfit, pose, composition, background and lighting unless directed otherwise. Natural skin and fabric texture.')+(p.prompt?' Additional direction: '+p.prompt:'')):p.prompt,
    resolution:p.resolution,aspect_ratio:p.aspectRatio==='source'?'16:9':p.aspectRatio,batch_size:1,enhance_prompt:true,...(p.seed===null?{}:{seed:p.seed})};
}
export function higgsfieldApiUrl(path){
  const u=new URL(path,ORIGIN);
  if(u.origin!==ORIGIN||u.username||u.password||u.hash)throw new Error('Unexpected Higgsfield API location.');
  return u.href;
}
export async function hfRequest(env,path,{input,idempotencyKey}={}){
  if(!env.HF_CREDENTIALS){const e=new Error('Connect the Higgsfield API in the Worker secret HF_CREDENTIALS first.');e.definite=true;throw e;}
  const headers={'Authorization':'Key '+env.HF_CREDENTIALS,'Content-Type':'application/json'};
  if(idempotencyKey)headers['Idempotency-Key']=idempotencyKey;
  const r=await fetch(higgsfieldApiUrl(path),{method:input?'POST':'GET',headers,body:input?JSON.stringify(input):undefined,redirect:'manual',signal:AbortSignal.timeout(25000)});
  if(r.status>=300&&r.status<400){const e=new Error('Higgsfield returned an unexpected redirect.');e.definite=true;throw e;}
  if(!r.ok){
    // Do not echo provider response bodies, which can include signed media URLs.
    const messages={401:'API credentials were rejected.',402:'Add API credit in Higgsfield.',403:'This API account does not have access.',422:'Higgsfield rejected the input. Check the model settings.',429:'Higgsfield capacity is full. Try again later.'};
    const e=new Error('Higgsfield: '+(messages[r.status]||'Request failed (HTTP '+r.status+').'));
    e.definite=r.status>=400&&r.status<500&&r.status!==408&&r.status!==409;e.status=r.status;throw e;
  }
  return r.json();
}
async function reserve(env,owner,sourceId,p,estimate,d,approvedQuote=null){
  const {first,run,fail,now,config}=d,t=now(),id=crypto.randomUUID(),quoteId=approvedQuote?.id||crypto.randomUUID(),c=await config(env,owner),limit=c?.daily_limit_microusd||10000000;
  if(!approvedQuote)await run(env,'INSERT INTO quotes(id,owner_id,source_id,params,estimate_microusd,expires_at,vendor_quote_id,expected_cost,payload) VALUES(?,?,?,?,?,?,?,?,?)',quoteId,owner,sourceId,JSON.stringify(p),estimate,t+600000,'higgsfield-direct',String(estimate/1000000),'{}');
  const inserted=await run(env,"INSERT INTO jobs(id,owner_id,source_id,quote_id,params,state,estimate_microusd,created_at,updated_at) SELECT ?,?,?,?,?, 'submitting',?,?,? WHERE (SELECT COUNT(*) FROM quotes WHERE id=? AND owner_id=? AND expires_at>?)=1 AND NOT EXISTS(SELECT 1 FROM jobs WHERE quote_id=?) AND NOT EXISTS(SELECT 1 FROM jobs WHERE owner_id=? AND state='uncertain' AND json_extract(params,'$.provider')='higgsfield') AND (SELECT COUNT(*) FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','uncertain') AND json_extract(params,'$.provider')='higgsfield')<2 AND (SELECT COUNT(*) FROM jobs WHERE owner_id=?)<500 AND (SELECT COALESCE(SUM(estimate_microusd),0) FROM spend WHERE owner_id=? AND created_at>=?)+?<=?",id,owner,sourceId,quoteId,JSON.stringify(p),estimate,t,t,quoteId,owner,t,quoteId,owner,owner,owner,owner,Math.floor(t/86400000)*86400000,estimate,limit);
  if(!inserted.meta.changes){
    if(!approvedQuote)await run(env,'DELETE FROM quotes WHERE id=?',quoteId);
    fail(409,'Nothing submitted: the price review expired, the quote was already used, a Higgsfield request is interrupted, two generation slots are full, or your daily spending limit was reached. Review History or request a fresh quote.');
  }
  return first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',id,owner);
}
export async function submitHiggsfieldJob(env,j,p,input,d){
  const {run,first,now}=d;let started=false,accepted=false,providerId=null;
  try{
    await run(env,'UPDATE quotes SET payload=? WHERE id=?',JSON.stringify({input,model:p.model}),j.quote_id);
    started=true;
    const r=await hfRequest(env,p.mode===TRAIN?'/v1/custom-references':'/'+p.model,{input,...(p.mode===TRAIN?{}:{idempotencyKey:j.id})});
    accepted=true;providerId=p.mode===TRAIN?r.id:r.request_id;
    if(!ID.test(providerId||''))throw new Error('Higgsfield returned no usable request ID.');
    if(p.mode!==TRAIN){p.statusUrl=higgsfieldApiUrl(r.status_url);if(new URL(p.statusUrl).pathname!=='/requests/'+providerId+'/status')throw new Error('Unexpected Higgsfield status URL.');}
    await run(env,"UPDATE jobs SET provider_id=?,params=?,state='queued',updated_at=? WHERE id=?",providerId,JSON.stringify(p),now(),j.id);
  }catch(e){
    const uncertain=accepted||started&&e.definite!==true;
    await run(env,'UPDATE jobs SET state=?,provider_id=?,error=?,updated_at=? WHERE id=?',uncertain?'uncertain':'failed',ID.test(providerId||'')?providerId:null,String(e.message).slice(0,300)+(uncertain?' Submission unconfirmed. Check Higgsfield before retrying. No automatic resubmission.':''),now(),j.id);
    if(!uncertain)await run(env,'DELETE FROM spend WHERE job_id=?',j.id);
  }
  return first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',j.id,j.owner_id);
}
export async function refreshHiggsfield(env,j,p,d){
  const {run,now}=d;
  const lock=await run(env,'UPDATE jobs SET last_poll=? WHERE id=? AND last_poll<?',now(),j.id,now()-8000);if(!lock.meta.changes)return;
  try{
    const r=await hfRequest(env,p.mode===TRAIN?'/v1/custom-references/'+j.provider_id:p.statusUrl),state=String(r.status||'');
    if(state==='completed'){
      if(p.mode===TRAIN){await run(env,"UPDATE jobs SET state='completed',error='',updated_at=? WHERE id=?",now(),j.id);return;}
      const output=p.type==='video'?(r.video?.url||r.videos?.[0]?.url):r.images?.[0]?.url;if(!output)throw new Error('Higgsfield completed without the expected media.');
      const safe=d.safeVideoUrl(output);
      await run(env,"UPDATE jobs SET state='saving',remote_url=?,error='',updated_at=? WHERE id=?",safe,now(),j.id);
      await d.copyResult(env,j,safe);return;
    }
    if(['failed','nsfw','canceled','cancelled'].includes(state)){
      await run(env,"UPDATE jobs SET state='failed',error=?,updated_at=? WHERE id=?",'Higgsfield ended this '+(p.mode===TRAIN?'training':'generation')+' with status '+state+'. Check provider billing for the final charge.',now(),j.id);
      // Documented generation failures are refunded; training billing is separate.
      if(p.mode!==TRAIN)await run(env,'DELETE FROM spend WHERE job_id=?',j.id);
      return;
    }
    if(!['queued','not_ready','in_progress'].includes(state))throw new Error('Unrecognized Higgsfield status.');
    await run(env,"UPDATE jobs SET state=?,error='',updated_at=? WHERE id=?",state==='in_progress'?'running':'queued',now(),j.id);
  }catch(e){await run(env,'UPDATE jobs SET error=?,updated_at=? WHERE id=?',String(e.message).slice(0,400),now(),j.id);}
}
export async function higgsfieldRoute(request,env,owner,url,d){
  const {fail,body,rows,first,source,sources,signedInput,jobView}=d,path=url.pathname;
  if(path==='/api/higgsfield/characters'&&request.method==='GET'){
    const list=await rows(env,"SELECT * FROM jobs WHERE owner_id=? AND json_extract(params,'$.provider')='higgsfield' AND json_extract(params,'$.mode')=? ORDER BY created_at DESC",owner,TRAIN);
    for(const j of list.filter(j=>['queued','running'].includes(j.state)).slice(0,3))await refreshHiggsfield(env,j,JSON.parse(j.params),d);
    const latest=await rows(env,"SELECT * FROM jobs WHERE owner_id=? AND json_extract(params,'$.provider')='higgsfield' AND json_extract(params,'$.mode')=? ORDER BY created_at DESC",owner,TRAIN);
    return {characters:latest.map(j=>({id:j.id,name:JSON.parse(j.params).characterName,state:j.state,portraitAssetId:j.source_id,error:j.error,photoCount:JSON.parse(j.params).referenceSourceIds.length}))};
  }
  if(!env.HF_CREDENTIALS)fail(503,'Higgsfield API is not connected. Add HF_CREDENTIALS to the Cloudflare Worker secrets.');
  if(path==='/api/higgsfield/characters'&&request.method==='POST'){
    const data=await body(request),name=String(data.name||'').trim();
    if(!name||name.length>100)fail(400,'Name your Soul ID using 1–100 characters.');
    if(data.confirmTraining!==true)fail(400,'Confirm the $2.50 Soul ID training estimate.');
    const refs=await sources(env,owner,data.referenceSourceIds,100);
    if(!refs.length||refs.some(a=>!['image/jpeg','image/png','image/webp'].includes(a.mime)))fail(400,'Use 1–100 JPG, PNG or WebP identity photos.');
    const input={name,model_version:'v2',input_images:await Promise.all(refs.map(async a=>({type:'image_url',image_url:await signedInput(env,url,a.id,86400)})))};
    const p={provider:'higgsfield',engine:'soulpro',soulProModel:'soul2',type:'image',mode:TRAIN,model:'soul-id',characterName:name,referenceSourceIds:refs.map(a=>a.id),resolution:'training',aspectRatio:'source',prompt:'Train Soul ID: '+name};
    const j=await reserve(env,owner,refs[0].id,p,SOUL2_PRICES.training,d);
    return {job:jobView(await submitHiggsfieldJob(env,j,p,input,d))};
  }
  // A Soul 2 price check is read-only with respect to generation and spending.
  if(path==='/api/higgsfield/quote'&&request.method==='POST'){
    const data=await body(request),p=soul2Parameters(data.settings,fail);
    if(data.referenceSourceIds?.length)fail(400,'PV Soul accepts one base image plus a trained Soul ID, not multiple identity photos. Use Seedream for multi-reference editing.');
    const character=p.characterId?await first(env,"SELECT * FROM jobs WHERE id=? AND owner_id=? AND state='completed' AND json_extract(params,'$.provider')='higgsfield' AND json_extract(params,'$.mode')=?",p.characterId,owner,TRAIN):null;
    if(p.characterId&&!character?.provider_id)fail(409,'Choose a completed Soul 2 identity created in this Lab.');
    if(!data.sourceId&&!p.prompt)fail(400,'Write a prompt or add a base photograph.');
    let base=null,imageUrl=null;
    if(data.sourceId){
      base=await source(env,owner,data.sourceId);
      if(!['image/jpeg','image/png','image/webp'].includes(base.mime))fail(400,'Add a JPG, PNG or WebP base image.');
      const object=await env.LAB_MEDIA.get(base.object_key);if(!object)fail(404,'Base image is missing.');
      const dimensions=d.storedImageDimensions(new Uint8Array(await object.arrayBuffer()),base.mime);
      if(p.aspectRatio==='source')p.aspectRatio=soul2Ratio(dimensions.width,dimensions.height);
      imageUrl=await signedInput(env,url,base.id,86400);
    }else{
      p.model=SOUL2_TEXT_MODEL;p.mode='image';
      if(p.aspectRatio==='source')p.aspectRatio='16:9';
    }
    if(character)p.characterName=JSON.parse(character.params).characterName;
    const input=soul2Input(p,imageUrl,character?.provider_id);
    const estimateReply=await hfRequest(env,'/estimate/'+p.model,{input});
    if(!/^\d{1,6}(\.\d{1,6})?$/.test(String(estimateReply.usd)))fail(502,'Higgsfield did not return a valid USD estimate. Nothing generated.');
    const estimate=Math.round(Number(estimateReply.usd)*1000000);
    if(!Number.isSafeInteger(estimate)||estimate<=0)fail(502,'Higgsfield did not return a positive image price. Nothing generated.');
    if(estimate>SOUL2_MAX_QUOTE_MICROS)fail(409,'Higgsfield estimates 
    p.accountEstimateUsd=estimate/1000000;
    const id=crypto.randomUUID(),expiresAt=d.now()+300000;
    await d.run(env,'INSERT INTO quotes(id,owner_id,source_id,params,estimate_microusd,expires_at,vendor_quote_id,expected_cost,payload) VALUES(?,?,?,?,?,?,?,?,?)',id,owner,base?.id||null,JSON.stringify(p),estimate,expiresAt,'higgsfield-soul2-quote-v1',String(estimateReply.usd),JSON.stringify({model:p.model,input}));
    return {id,provider:'Higgsfield',sourceId:base?.id||null,settings:p,estimatedUsd:estimate/1000000,maxUsd:estimate/1000000,priceIsEstimate:true,expiresAt,
      notice:character?'Soul ID: '+p.characterName+'. The quoted image will use this saved identity and '+(base?'your base photograph.':'your text prompt.'):'NO SOUL ID SELECTED. This is a generic generation and will not preserve Nina. Choose a trained character before confirming if identity matters.'};
  }
  if(path==='/api/higgsfield/generate'&&request.method==='POST'){
    const data=await body(request);
    if(data.confirm!==true)fail(400,'Review the live price and explicitly confirm the Higgsfield charge before generating.');
    if(!ID.test(data.quoteId||''))fail(400,'A valid live Higgsfield quote is required. Nothing submitted.');
    const existing=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',data.quoteId,owner);
    if(existing)return {job:jobView(existing)}; // A replay cannot create a second paid request.
    const quote=await first(env,'SELECT * FROM quotes WHERE id=? AND owner_id=?',data.quoteId,owner);
    if(!quote||quote.vendor_quote_id!=='higgsfield-soul2-quote-v1')fail(409,'Review a new Higgsfield price. No generation submitted.');
    if(quote.expires_at<=d.now())fail(409,'Higgsfield price review expired. No generation submitted; review again.');
    const p=JSON.parse(quote.params),payload=JSON.parse(quote.payload||'{}');
    if(p.provider!=='higgsfield'||p.soulProModel!=='soul2'||payload.model!==p.model||!payload.input||quote.estimate_microusd<=0||quote.estimate_microusd>SOUL2_MAX_QUOTE_MICROS)fail(409,'Invalid Higgsfield quote; review the price again.');
    if(quote.source_id)await source(env,owner,quote.source_id);
    let j;
    try{j=await reserve(env,owner,quote.source_id,p,quote.estimate_microusd,d,quote);}
    catch(e){const replay=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',quote.id,owner);if(replay)return {job:jobView(replay)};throw e;}
    return {job:jobView(await submitHiggsfieldJob(env,j,p,payload.input,d))};
  }
  fail(404,'Unknown Higgsfield route.');
}
+estimateReply.usd+', above the independent $0.25/image safety ceiling. Nothing submitted or charged.');
    if(d.isLabCustomer&&await d.isLabCustomer(env,owner)&&estimate>SOUL2_CUSTOMER_MAX_QUOTE_MICROS)
      fail(409,'Soul 2 is temporarily above the 7-credit launch price. No generation or credit charge was made. The live provider quote needs review before this model can be sold at the advertised rate.');
    p.accountEstimateUsd=estimate/1000000;
    const id=crypto.randomUUID(),expiresAt=d.now()+300000;
    await d.run(env,'INSERT INTO quotes(id,owner_id,source_id,params,estimate_microusd,expires_at,vendor_quote_id,expected_cost,payload) VALUES(?,?,?,?,?,?,?,?,?)',id,owner,base?.id||null,JSON.stringify(p),estimate,expiresAt,'higgsfield-soul2-quote-v1',String(estimateReply.usd),JSON.stringify({model:p.model,input}));
    return {id,provider:'Higgsfield',sourceId:base?.id||null,settings:p,estimatedUsd:estimate/1000000,maxUsd:estimate/1000000,priceIsEstimate:true,expiresAt,
      notice:character?'Soul ID: '+p.characterName+'. The quoted image will use this saved identity and '+(base?'your base photograph.':'your text prompt.'):'NO SOUL ID SELECTED. This is a generic generation and will not preserve Nina. Choose a trained character before confirming if identity matters.'};
  }
  if(path==='/api/higgsfield/generate'&&request.method==='POST'){
    const data=await body(request);
    if(data.confirm!==true)fail(400,'Review the live price and explicitly confirm the Higgsfield charge before generating.');
    if(!ID.test(data.quoteId||''))fail(400,'A valid live Higgsfield quote is required. Nothing submitted.');
    const existing=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',data.quoteId,owner);
    if(existing)return {job:jobView(existing)}; // A replay cannot create a second paid request.
    const quote=await first(env,'SELECT * FROM quotes WHERE id=? AND owner_id=?',data.quoteId,owner);
    if(!quote||quote.vendor_quote_id!=='higgsfield-soul2-quote-v1')fail(409,'Review a new Higgsfield price. No generation submitted.');
    if(quote.expires_at<=d.now())fail(409,'Higgsfield price review expired. No generation submitted; review again.');
    const p=JSON.parse(quote.params),payload=JSON.parse(quote.payload||'{}');
    if(p.provider!=='higgsfield'||p.soulProModel!=='soul2'||payload.model!==p.model||!payload.input||quote.estimate_microusd<=0||quote.estimate_microusd>SOUL2_MAX_QUOTE_MICROS)fail(409,'Invalid Higgsfield quote; review the price again.');
    if(quote.source_id)await source(env,owner,quote.source_id);
    let j;
    try{j=await reserve(env,owner,quote.source_id,p,quote.estimate_microusd,d,quote);}
    catch(e){const replay=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',quote.id,owner);if(replay)return {job:jobView(replay)};throw e;}
    return {job:jobView(await submitHiggsfieldJob(env,j,p,payload.input,d))};
  }
  fail(404,'Unknown Higgsfield route.');
}
