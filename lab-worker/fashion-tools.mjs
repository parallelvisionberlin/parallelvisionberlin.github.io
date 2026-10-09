// Owner-only PV Lab Fashion: two fal.ai routes and direct FASHN Try-On Max.
// No customer tenancy, bypass switches, background paid retries, or public credentials.
export const FASHION_MODELS = Object.freeze({
  fashn16: Object.freeze({label:'FASHN Try-On v1.6',provider:'fal',model:'fal-ai/fashn/tryon/v1.6',source:'https://fal.ai/models/fal-ai/fashn/tryon/v1.6/api'}),
  fluxvto: Object.freeze({label:'FLUX Virtual Try-On Pro',provider:'fal',model:'fal-ai/flux-pro/v1/vto',source:'https://fal.ai/models/fal-ai/flux-pro/v1/vto/api'}),
  fashnmax: Object.freeze({label:'FASHN Try-On Max',provider:'fashn',model:'tryon-max',source:'https://docs.fashn.ai/api-reference/tryon-max'})
});
const MAX_MODES = Object.freeze({fast:[1,2,3],balanced:[2,3,4],quality:[3,4,5]});
const MAX_RESOLUTIONS = Object.freeze(['1k','2k','4k']);
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function fashionParameters(data,fail) {
  const name=String(data?.model||'').trim(),definition=FASHION_MODELS[name];
  if(!definition)fail(400,'Choose a supported virtual try-on model.');
  const modelSourceId=data.modelSourceId,garmentSourceId=data.garmentSourceId;
  if(!UUID.test(modelSourceId||'')||!UUID.test(garmentSourceId||'')||modelSourceId===garmentSourceId)fail(400,'Upload two different images: person and outfit.');
  const prompt=String(data.prompt||'').trim();
  if(prompt.length>1200)fail(400,'Styling directions must be under 1,200 characters.');
  const resolution=data.resolution||'1k',generationMode=data.generationMode||'balanced';
  const quality=data.quality||'balanced',category=data.category||'auto';
  if(name==='fluxvto'&&!prompt)fail(400,'FLUX Virtual Try-On needs a styling direction.');
  if(name==='fashnmax'&&(!MAX_RESOLUTIONS.includes(resolution)||!MAX_MODES[generationMode]))fail(400,'Choose a valid FASHN Max resolution and mode.');
  if(name==='fashn16'&&(!['auto','tops','bottoms','one-pieces'].includes(category)||!['performance','balanced','quality'].includes(quality)))fail(400,'Invalid Try-On v1.6 setting.');
  return {type:'image',mode:'fashion',engine:'fashion',fashionModel:name,provider:definition.provider,model:definition.model,modelSourceId,garmentSourceId,
    referenceSourceIds:[garmentSourceId],prompt,resolution:name==='fashnmax'?resolution:'source',generationMode:name==='fashnmax'?generationMode:null,
    quality:name==='fashn16'?quality:null,category:name==='fashn16'?category:null,outputFormat:'png'};
}
export function fashionEstimateMicros(p,personPixels=1000000,garmentPixels=1000000) {
  if(p.fashionModel==='fashn16')return 75000; // Published fal.ai flat price, 2026-10-09.
  if(p.fashionModel==='fashnmax')return MAX_MODES[p.generationMode][MAX_RESOLUTIONS.indexOf(p.resolution)]*75000; // FASHN on-demand credits.
  // FLUX: first started input MP $0.0375, each extra input MP +$0.005, each output MP +$0.005.
  // Output megapixels are an estimate; reserve a conservative $0.075 cap for this owner preview.
  const inputMp=Math.ceil(personPixels/1e6)+Math.ceil(garmentPixels/1e6);
  return Math.max(75000,37500+Math.max(0,inputMp-1)*5000+Math.ceil(personPixels/1e6)*5000);
}
export function fashionInput(p,modelImageUrl,garmentImageUrl) {
  if(p.fashionModel==='fashn16')return {
    model_image:modelImageUrl,garment_image:garmentImageUrl,category:p.category,mode:p.quality,
    garment_photo_type:'auto',num_samples:1,output_format:'png'
  };
  if(p.fashionModel==='fluxvto')return {
    human_image_url:modelImageUrl,garment_image_url:garmentImageUrl,prompt:p.prompt,output_format:'png'
  };
  return {model_name:'tryon-max',inputs:{
    model_image:modelImageUrl,product_image:garmentImageUrl,prompt:p.prompt,resolution:p.resolution,
    generation_mode:p.generationMode,num_images:1,output_format:'png'
  }};
}
async function fashnCall(key,path,method='GET',payload) {
  let response;
  try {
    response=await fetch('https://api.fashn.ai/v1'+path,{
      method,redirect:'manual',headers:{'Authorization':'Bearer '+key,'Accept':'application/json',...(payload?{'Content-Type':'application/json'}:{})},
      body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(30000)
    });
  }catch {
    const error=new Error('FASHN API acknowledgement could not be confirmed. Check its dashboard before another paid submission.');
    error.uncertain=method==='POST';throw error;
  }
  if(response.status>=300&&response.status<400){
    const error=new Error('FASHN API returned an unexpected redirect. No credentials were forwarded. Check the provider before retrying.');
    error.uncertain=method==='POST';throw error;
  }
  const raw=await response.text();let value={};
  try{value=raw?JSON.parse(raw):{};}catch {
    const error=new Error('FASHN returned an unreadable response. Check its dashboard before retrying.');
    error.uncertain=method==='POST';throw error;
  }
  if(!response.ok){
    const detail=typeof value.message==='string'?value.message:typeof value.error==='string'?value.error:value.error?.message||'Provider declined the request.';
    const error=new Error('FASHN (HTTP '+response.status+'): '+String(detail).replace(/[\r\n\x00-\x1f]/g,' ').slice(0,300));
    error.definite=response.status>=400&&response.status<500&&![408,429].includes(response.status);
    error.uncertain=method==='POST'&&!error.definite;throw error;
  }
  return {value,credits:response.headers.get('x-fashn-credits-used')};
}
export async function fashionRoute(request,env,owner,url,d) {
  const {fail,body,first,run,stmt,jobView,source,signedInput,config,storedImageDimensions,falImageBytes,falSubmit}=d;
  const path=url.pathname,method=request.method;
  if(path==='/api/fashion/models'&&method==='GET'){
    return {models:Object.entries(FASHION_MODELS).map(([id,m])=>({
      id,label:m.label,provider:m.provider,source:m.source,available:m.provider==='fal'?!!env.FAL_KEY:!!env.FASHN_API_KEY
    }))};
  }
  if(path==='/api/fashion/balance'&&method==='GET'){
    // Owner-authorized, read-only API check. Never submits to /v1/run or spends generation credits.
    if(!env.FASHN_API_KEY)return {connected:false,credits:null,note:'FASHN_API_KEY is not configured in Cloudflare.'};
    try{
      const {value}=await fashnCall(env.FASHN_API_KEY,'/credits');
      const raw=value?.credits;
      if(!raw||!Number.isSafeInteger(raw.total)||raw.total<0||!Number.isSafeInteger(raw.on_demand)||raw.on_demand<0||!Number.isSafeInteger(raw.subscription)||raw.subscription<0)
        fail(502,'FASHN returned an unexpected balance. No generation submitted.');
      return {connected:true,credits:{total:raw.total,onDemand:raw.on_demand,subscription:raw.subscription}};
    }catch(e){
      if(e?.status===502)throw e;
      if(/^FASHN \(HTTP 401\)/.test(String(e?.message||'')))fail(502,'FASHN rejected the configured API key. Check the Cloudflare Secret value.');
      if(/^FASHN \(HTTP 403\)/.test(String(e?.message||'')))fail(502,'The configured FASHN key cannot access this API account.');
      fail(502,'Could not check FASHN balance right now. No generation submitted. Verify the key and credits in FASHN Developer API.');
    }
  }
  if(path==='/api/fashion/quote'&&method==='POST'){
    const data=await body(request),p=fashionParameters(data,fail);
    if(p.provider==='fal'&&!env.FAL_KEY||p.provider==='fashn'&&!env.FASHN_API_KEY)fail(503,p.provider==='fal'?'FAL_KEY is not configured.':'Set the FASHN_API_KEY Worker secret to enable Try-On Max.');
    const person=await source(env,owner,p.modelSourceId),garment=await source(env,owner,p.garmentSourceId);
    if(![person,garment].every(a=>['image/png','image/jpeg','image/webp'].includes(a.mime)))fail(400,'Use PNG, JPEG or WebP photographs.');
    let personPixels=1e6,garmentPixels=1e6;
    if(p.fashionModel==='fluxvto'){
      const dimensions=await Promise.all([person,garment].map(async a=>storedImageDimensions(await falImageBytes(env,a),a.mime)));
      personPixels=dimensions[0].width*dimensions[0].height;garmentPixels=dimensions[1].width*dimensions[1].height;
      if(personPixels>2e6||garmentPixels>1e6)fail(400,'FLUX requires a person image of at most 2 MP and a garment image of at most 1 MP. Resize a working copy, keeping your originals.');
    }
    const estimate=fashionEstimateMicros(p,personPixels,garmentPixels),id=crypto.randomUUID(),expires=Date.now()+600000;
    await run(env,'INSERT INTO quotes(id,owner_id,source_id,params,estimate_microusd,expires_at,vendor_quote_id,expected_cost,payload) VALUES(?,?,?,?,?,?,?,?,?)',
      id,owner,person.id,JSON.stringify(p),estimate,expires,'fashion-review-v1',String(estimate/1e6),JSON.stringify({garmentSourceId:garment.id}));
    return {id,estimatedUsd:estimate/1e6,priceIsEstimate:true,expiresAt:expires,model:p.fashionModel,
      sourceName:FASHION_MODELS[p.fashionModel].label,
      notice:'Published model pricing estimate, not a guaranteed charge. Your provider balance and its live billing remain authoritative. Confirmation submits ONE paid generation.'};
  }
  if(path==='/api/fashion/submit'&&method==='POST'){
    const data=await body(request);
    if(data.confirm!==true||!UUID.test(data.quoteId||''))fail(400,'Confirm one quoted generation.');
    const q=await first(env,'SELECT * FROM quotes WHERE id=? AND owner_id=?',data.quoteId,owner);
    if(!q||q.vendor_quote_id!=='fashion-review-v1')fail(404,'Fashion quote not found.');
    let prior=await first(env,'SELECT * FROM jobs WHERE owner_id=? AND quote_id=?',owner,q.id);
    if(prior)return {job:jobView(prior)};
    if(q.expires_at<=Date.now())fail(409,'Fashion quote expired. Review the estimate again.');
    const p=JSON.parse(q.params||'{}');
    if(!FASHION_MODELS[p.fashionModel]||p.model!==FASHION_MODELS[p.fashionModel].model||p.mode!=='fashion'||p.provider!==FASHION_MODELS[p.fashionModel].provider)fail(409,'Fashion quote settings are invalid.');
    if(p.provider==='fal'&&!env.FAL_KEY||p.provider==='fashn'&&!env.FASHN_API_KEY)fail(503,'Selected model API key is not configured.');
    const person=await source(env,owner,p.modelSourceId),garment=await source(env,owner,p.garmentSourceId);
    const c=await config(env,owner),limit=c?.daily_limit_microusd||10000000;
    const providerSql="COALESCE(json_extract(params,'$.provider'),'')='"+p.provider+"'";
    const now=Date.now(),day=Math.floor(now/86400000)*86400000,id=crypto.randomUUID();
    const inserted=await run(env,
      "INSERT INTO jobs(id,owner_id,source_id,quote_id,params,state,estimate_microusd,created_at,updated_at) SELECT ?,?,?,?,?,'submitting',?,?,? WHERE NOT EXISTS(SELECT 1 FROM jobs WHERE owner_id=? AND state='uncertain' AND "+providerSql+") AND (SELECT COUNT(*) FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','uncertain') AND "+providerSql+" AND json_extract(params,'$.type')='image')<10 AND (SELECT COALESCE(SUM(estimate_microusd),0) FROM spend WHERE owner_id=? AND created_at>=?)+?<=?",
      id,owner,person.id,q.id,q.params,q.estimate_microusd,now,now,owner,owner,owner,day,q.estimate_microusd,limit);
    if(!inserted.meta?.changes){
      prior=await first(env,'SELECT * FROM jobs WHERE owner_id=? AND quote_id=?',owner,q.id);
      if(prior)return {job:jobView(prior)};
      fail(409,'Submission blocked by an interrupted provider request, concurrent jobs or your daily spend limit. Check History before retrying.');
    }
    let submissionStarted=false,providerId=null;
    try{
      const modelUrl=await signedInput(env,url,person.id,86400),garmentUrl=await signedInput(env,url,garment.id,86400);
      const input=fashionInput(p,modelUrl,garmentUrl);
      // Record exact input before paid submission, including signed input identifiers for recovery review.
      await run(env,'UPDATE quotes SET payload=? WHERE id=?',JSON.stringify({model:p.model,input}),q.id);
      submissionStarted=true;
      if(p.provider==='fal')providerId=await falSubmit(p.model,env.FAL_KEY,input);
      else {
        const result=await fashnCall(env.FASHN_API_KEY,'/run','POST',input);
        providerId=result.value?.id;
        if(!/^[A-Za-z0-9_-]{8,160}$/.test(providerId||''))throw new Error('FASHN accepted the request without a valid prediction ID. Check the API dashboard.');
      }
      await run(env,"UPDATE jobs SET provider_id=?,state='queued',updated_at=? WHERE id=?",providerId,Date.now(),id);
    }catch(e){
      const uncertain=submissionStarted&&e.definite!==true,state=uncertain?'uncertain':'failed';
      await run(env,'UPDATE jobs SET state=?,provider_id=?,error=?,updated_at=? WHERE id=?',
        state,providerId,String(e?.message||'Fashion provider submission failed.').replace(/[\r\n]+/g,' ').slice(0,430)+(uncertain?' Do not resubmit until provider activity is checked.':''),Date.now(),id);
      if(!uncertain)await run(env,'DELETE FROM spend WHERE job_id=?',id);
    }
    return {job:jobView(await first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',id,owner))};
  }
  fail(404,'Fashion route not found.');
}
export async function refreshFashionJob(env,j,d) {
  const {run,stmt,copyResult,fail}=d;
  if(!env.FASHN_API_KEY){
    await run(env,'UPDATE jobs SET error=? WHERE id=?','FASHN_API_KEY is unavailable; this job cannot be checked until it is restored.',j.id);
    return;
  }
  const lock=await run(env,'UPDATE jobs SET last_poll=? WHERE id=? AND last_poll<?',Date.now(),j.id,Date.now()-8000);
  if(!lock.meta?.changes)return;
  try {
    const {value,credits}=await fashnCall(env.FASHN_API_KEY,'/status/'+encodeURIComponent(j.provider_id));
    if(value.status==='completed'){
      const output=value.output?.[0];
      if(typeof output!=='string')throw new Error('Completed FASHN request has no output image.');
      await run(env,"UPDATE jobs SET state='saving',remote_url=?,error='',updated_at=? WHERE id=?",output,Date.now(),j.id);
      await copyResult(env,j,output);
      // FASHN status includes credits consumed. Use the published on-demand credit rate only as an estimate.
      if(credits!==null&&Number.isFinite(Number(credits))&&Number(credits)>=0)await run(env,'UPDATE jobs SET settled_cost=? WHERE id=?',Number(credits)*0.075,j.id);
    }else if(value.status==='failed'){
      const detail=String(value.error?.message||value.error||'FASHN did not produce an image.').slice(0,450);
      await env.LAB_DB.batch([
        stmt(env,"UPDATE jobs SET state='failed',error=?,updated_at=? WHERE id=?",detail,Date.now(),j.id),
        stmt(env,'DELETE FROM spend WHERE job_id=?',j.id)
      ]);
    }else if(['starting','in_queue','processing'].includes(value.status)){
      await run(env,"UPDATE jobs SET state=?,error='',updated_at=? WHERE id=?",value.status==='processing'?'running':'queued',Date.now(),j.id);
    }else{
      await run(env,'UPDATE jobs SET error=? WHERE id=?','Unexpected FASHN status. Check the prediction in FASHN before another submission.',j.id);
    }
  }catch(e){
    await run(env,'UPDATE jobs SET error=? WHERE id=?',String(e.message||'FASHN status check failed.').slice(0,450),j.id);
  }
}
