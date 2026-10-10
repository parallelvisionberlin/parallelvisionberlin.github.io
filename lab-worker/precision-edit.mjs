// Precision Edit: owner-only SAM 3 object selection and masked FLUX editing.
// Both provider credentials and private source media remain on the Worker.
import {FAL_CONTROLLED_INPAINT,controlledRepairParameters,controlledRepairEstimateMicros,buildRepairInput,falSubmit,falStatus,falResult} from './fal-controlled-pose.mjs';

export const PRECISION_SEGMENT_MODEL='fal-ai/sam-3/image';
export const PRECISION_SEGMENT_ESTIMATE_MICROS=5000; // fal.ai published $0.005/request, not a bound quote.

export function precisionPoint(value,width,height){
  if(!value||!Number.isFinite(value.x)||!Number.isFinite(value.y)
      ||value.x<0||value.y<0||value.x>=width||value.y>=height)
    throw new Error('Click a point inside the photograph.');
  return {x:Math.round(value.x),y:Math.round(value.y),label:1,object_id:1};
}
export function precisionOutputSize(bytes,mime,dimensions){
  if(!['image/png','image/jpeg','image/webp'].includes(mime))throw new Error('Unsupported edit source image.');
  const size=dimensions(bytes,mime);
  if(!Number.isInteger(size.width)||!Number.isInteger(size.height)||size.width<240||size.height<240||size.width>8192||size.height>8192)
    throw new Error('Precision Edit needs an image between 240 and 8192 pixels per side.');
  return size;
}
export function precisionPrice(p){return controlledRepairEstimateMicros(p);}
export function precisionFinalMetadata(params,sourceId){
  if(!params.precisionEdit||params.precisionFinalized||params.precisionOriginalId!==sourceId)
    throw new Error('This is not a pending Precision Edit of that original.');
  return {...params,precisionFinalized:true};
}
const failDefault=(status,message)=>{const e=new Error(message);e.status=status;throw e;};
const uuid=/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const requestPattern=/^[a-zA-Z0-9_-]{12,128}$/;
function verifyUuid(id,fail){if(!uuid.test(id||''))fail(400,'Invalid source identifier.');return id;}
function verifyRequestId(id,fail){if(!requestPattern.test(id||''))fail(400,'Invalid selection request.');return id;}
async function signTicket(env,data){
  const raw=new TextEncoder().encode('precision-edit-v1:'+env.LAB_SECRET);
  const digest=await crypto.subtle.digest('SHA-256',raw);
  const key=await crypto.subtle.importKey('raw',digest,{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=new TextEncoder().encode(data);
  const signature=await crypto.subtle.sign('HMAC',key,bytes);
  return Array.from(new Uint8Array(signature),x=>x.toString(16).padStart(2,'0')).join('');
}
function allowedAssetUrl(value){
  const url=new URL(value);
  const host=url.hostname.toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||!(host==='fal.media'||host.endsWith('.fal.media')))
    throw new Error('Unexpected segmentation output location.');
  return url.href;
}
async function deterministicMaskId(owner,requestId){
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('precision-mask:'+owner+':'+requestId)));
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes.slice(0,16),x=>x.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}
async function quotedEdit(request,env,owner,d){
  const data=await d.body(request);
  const original=await d.source(env,owner,verifyUuid(data.originalSourceId,d.fail));
  const working=await d.source(env,owner,verifyUuid(data.sourceId,d.fail));
  const mask=await d.source(env,owner,verifyUuid(data.maskSourceId,d.fail));
  if(original.mime.indexOf('image/')!==0||working.mime!=='image/png'||mask.mime!=='image/png')d.fail(400,'Precision Edit needs a photograph, a PNG working image and a PNG selection.');
  if(working.bytes>20*1024*1024||mask.bytes>20*1024*1024)d.fail(413,'Precision Edit files exceed the private media limit.');
  const originalSize=precisionOutputSize(await d.falImageBytes(env,original),original.mime,d.storedImageDimensions);
  const workingSize=precisionOutputSize(await d.falImageBytes(env,working),working.mime,d.storedImageDimensions);
  const maskSize=precisionOutputSize(await d.falImageBytes(env,mask),mask.mime,d.storedImageDimensions);
  if(workingSize.width!==maskSize.width||workingSize.height!==maskSize.height)d.fail(400,'The selection must match the working image dimensions.');
  if(workingSize.width>originalSize.width||workingSize.height>originalSize.height)d.fail(400,'The working image cannot be larger than its source.');
  if(Math.abs(workingSize.width/workingSize.height-originalSize.width/originalSize.height)>.006)
    d.fail(400,'The working image must preserve the original aspect ratio.');
  const p=controlledRepairParameters({prompt:data.prompt,sourceWidth:workingSize.width,sourceHeight:workingSize.height,strength:data.strength??.77},{fail:d.fail});
  const price=precisionPrice(p);
  const expires=Date.now()+2*60*1000;
  const originalInput=[owner,original.id,working.id,mask.id,p.prompt,p.strength,p.sourceWidth,p.sourceHeight,expires].join(':');
  const ticket=await signTicket(env,originalInput);
  return {original,working,mask,p,price,expires,ticket};
}
export async function precisionEditRoute(request,env,owner,url,d){
  const path=url.pathname,method=request.method;
  if(d.customer)d.fail(403,'Precision Edit is currently owner-only until selection and FLUX credit billing are verified.');
  if(!env.FAL_KEY)d.fail(503,'Magic Select and Precision Edit require the existing FAL_KEY Worker secret.');
  if(!env.LAB_SECRET)d.fail(503,'Precision Edit private signing is not configured.');
  if(path==='/api/precision/segment'&&method==='POST'){
    const data=await d.body(request);
    const source=await d.source(env,owner,verifyUuid(data.sourceId,d.fail));
    if(!['image/png','image/jpeg','image/webp'].includes(source.mime))d.fail(400,'Magic Select needs an image source.');
    const bytes=await d.falImageBytes(env,source);
    const dimensions=precisionOutputSize(bytes,source.mime,d.storedImageDimensions);
    let point;try{point=precisionPoint(data.point,dimensions.width,dimensions.height);}
    catch(e){d.fail(400,e.message);}
    const settings=await d.config(env,owner);
    const used=await d.first(env,'SELECT COALESCE(SUM(estimate_microusd),0) AS n FROM spend WHERE owner_id=? AND created_at>=?',owner,Math.floor(Date.now()/86400000)*86400000);
    if((used?.n||0)+PRECISION_SEGMENT_ESTIMATE_MICROS>(settings?.daily_limit_microusd||10000000))
      d.fail(409,'Magic Select would exceed your daily spending limit.');
    const requestId=verifyRequestId(await falSubmit(PRECISION_SEGMENT_MODEL,env.FAL_KEY,{
      image_url:await d.signedInput(env,url,source.id,86400),
      point_prompts:[point],prompt:'',apply_mask:false,output_format:'png',
      return_multiple_masks:false,max_masks:1
    }),d.fail);
    const expires=Math.floor(Date.now()/1000)+3600;
    const ticket=await signTicket(env,[owner,source.id,requestId,expires].join(':'));
    // Owner-only published-price estimate. No customer-wallet debit or automated retry.
    await d.run(env,'INSERT OR IGNORE INTO spend(job_id,owner_id,estimate_microusd,created_at) VALUES(?,?,?,?)',
      'precision-segment:'+requestId,owner,PRECISION_SEGMENT_ESTIMATE_MICROS,Date.now());
    return d.json({status:'queued',requestId,sourceId:source.id,expires,ticket,publishedEstimateUsd:.005},202);
  }
  if(path==='/api/precision/segment'&&method==='GET'){
    const sourceId=verifyUuid(url.searchParams.get('sourceId'),d.fail);
    const requestId=verifyRequestId(url.searchParams.get('requestId'),d.fail);
    const expires=Number(url.searchParams.get('expires'));
    const ticket=url.searchParams.get('ticket')||'';
    if(!Number.isInteger(expires)||expires<Math.floor(Date.now()/1000)||expires>Math.floor(Date.now()/1000)+3601||!(/^[a-f0-9]{64}$/.test(ticket)))
      d.fail(403,'Magic Select access has expired.');
    if(await signTicket(env,[owner,sourceId,requestId,expires].join(':') )!==ticket)d.fail(403,'Invalid Magic Select ticket.');
    await d.source(env,owner,sourceId);
    const maskId=await deterministicMaskId(owner,requestId);
    const old=await d.first(env,'SELECT id FROM assets WHERE id=? AND owner_id=?',maskId,owner);
    if(old)return d.json({status:'completed',maskSourceId:maskId});
    const state=await falStatus(PRECISION_SEGMENT_MODEL,env.FAL_KEY,requestId),value=String(state?.status||'').toUpperCase();
    if(value==='FAILED'||value==='CANCELLED'||value==='CANCELED')d.fail(422,'Magic Select could not segment this object. Try another point or use the brush.');
    if(value!=='COMPLETED')return d.json({status:value==='IN_PROGRESS'?'running':'queued'},202);
    const result=await falResult(PRECISION_SEGMENT_MODEL,env.FAL_KEY,requestId);
    const masks=result?.masks;
    if(!Array.isArray(masks)||!masks[0]?.url)d.fail(502,'SAM 3 returned no segmentation mask.');
    const remote=allowedAssetUrl(masks[0].url),response=await fetch(remote,{redirect:'manual',signal:AbortSignal.timeout(25000)});
    if(!response.ok||response.status>=300&&response.status<400)d.fail(502,'Could not retrieve SAM 3 mask from fal.ai.');
    const contentType=(response.headers.get('content-type')||'').split(';')[0];
    if(contentType!=='image/png')d.fail(502,'Magic Select returned an unsupported mask.');
    const bytes=await d.limitedBody(response,20*1024*1024);
    if(!bytes.length||!d.sniff(bytes,'image/png'))d.fail(502,'Magic Select returned invalid PNG data.');
    const key=owner+'/sources/'+maskId;
    await env.LAB_MEDIA.put(key,bytes,{httpMetadata:{contentType:'image/png'}});
    await d.run(env,"INSERT OR IGNORE INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,'source','image/png',?,?,?)",
      maskId,owner,key,'magic-selection-'+maskId+'.png',bytes.length,Date.now());
    return d.json({status:'completed',maskSourceId:maskId});
  }
  if(path==='/api/precision/quote'&&method==='POST'){
    const q=await quotedEdit(request,env,owner,d),quoteId=crypto.randomUUID();
    const payload={originalSourceId:q.original.id,sourceId:q.working.id,maskSourceId:q.mask.id,
      prompt:q.p.prompt,strength:q.p.strength,sourceWidth:q.p.sourceWidth,sourceHeight:q.p.sourceHeight,ticket:q.ticket};
    await d.run(env,'INSERT INTO quotes(id,owner_id,source_id,params,estimate_microusd,expires_at,vendor_quote_id,expected_cost,payload) VALUES(?,?,?,?,?,?,?,?,?)',
      quoteId,owner,q.working.id,JSON.stringify(q.p),q.price,q.expires,'fal-precision-edit',String(q.price/1000000),JSON.stringify(payload));
    return d.json({quoteId,ticket:q.ticket,expiresAt:q.expires,estimatedUsd:q.price/1000000,
      priceIsEstimate:true,model:FAL_CONTROLLED_INPAINT,notice:'Published fal.ai estimate, not a live bound quote. No generation submitted.'});
  }
  if(path==='/api/precision/submit'&&method==='POST'){
    const data=await d.body(request);
    const quoteId=verifyUuid(data.quoteId,d.fail);
    const previous=await d.first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',quoteId,owner);
    if(previous)return d.json({job:d.jobView(previous)},202);
    const approved=await d.first(env,"SELECT * FROM quotes WHERE id=? AND owner_id=? AND expires_at>? AND vendor_quote_id='fal-precision-edit'",quoteId,owner,Date.now());
    if(!approved)d.fail(409,'Precision Edit quote expired. Check the price again.');
    const stored=JSON.parse(approved.payload||'{}');
    const sourceData={originalSourceId:data.originalSourceId,sourceId:data.sourceId,maskSourceId:data.maskSourceId,
      prompt:data.prompt,strength:data.strength,sourceWidth:stored.sourceWidth,sourceHeight:stored.sourceHeight,ticket:data.ticket};
    for(const field of ['originalSourceId','sourceId','maskSourceId','prompt','strength','sourceWidth','sourceHeight','ticket'])
      if(sourceData[field]!==stored[field])d.fail(409,'Precision Edit inputs changed since price approval. Check the price again.');
    if(Number(data.expiresAt)!==approved.expires_at||data.ticket!==stored.ticket)
      d.fail(409,'Precision Edit price approval has changed. Check price again.');
    const serialized=new Request(request.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const q=await quotedEdit(serialized,env,owner,d);
    const payload=[owner,q.original.id,q.working.id,q.mask.id,q.p.prompt,q.p.strength,q.p.sourceWidth,q.p.sourceHeight,approved.expires_at].join(':');
    if(q.price!==approved.estimate_microusd||await signTicket(env,payload)!==data.ticket)
      d.fail(409,'Precision Edit quote no longer matches the images. Check price again.');
    const p={...q.p,precisionEdit:true,precisionFinalized:false,precisionOriginalId:q.original.id,
      precisionWorkingId:q.working.id,maskSourceId:q.mask.id,repairSourceId:q.working.id,
      precisionPriceEstimateUsd:q.price/1000000};
    // jobs.quote_id is UNIQUE. Reusing one quote never triggers a second inference.
    const reserved=await d.reserveFalImageJob(env,owner,q.working.id,p,q.price,quoteId);
    if(reserved._precisionReused)return d.json({job:d.jobView(reserved)},202);
    const input=buildRepairInput(p,{imageUrl:await d.signedInput(env,url,q.working.id,86400),
      maskUrl:await d.signedInput(env,url,q.mask.id,86400)});
    const job=await d.submitReservedFalJob(env,reserved,p,input);
    return d.json({job:d.jobView(job)},202);
  }
  if(path==='/api/precision/commit'&&method==='POST'){
    const data=await d.body(request),id=verifyUuid(data.jobId,d.fail),composedId=verifyUuid(data.compositeSourceId,d.fail);
    const job=await d.first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',id,owner);
    if(!job)d.fail(404,'Precision Edit job not found.');
    const params=JSON.parse(job.params||'{}');
    if(!params.precisionEdit||job.state!=='completed'||!job.output_id)d.fail(409,'Wait for the Precision Edit result before compositing.');
    const original=await d.source(env,owner,params.precisionOriginalId);
    const composed=await d.source(env,owner,composedId);
    if(composed.mime!=='image/png')d.fail(415,'Upload the completed PNG composite.');
    const a=precisionOutputSize(await d.falImageBytes(env,original),original.mime,d.storedImageDimensions);
    const b=precisionOutputSize(await d.falImageBytes(env,composed),composed.mime,d.storedImageDimensions);
    if(a.width!==b.width||a.height!==b.height)d.fail(400,'The final image must match original source dimensions.');
    if(params.precisionFinalized){
      if(job.output_id!==composedId)d.fail(409,'This Precision Edit was already finalized.');
      return d.json({job:d.jobView(job)});
    }
    const updated=precisionFinalMetadata(params,original.id);
    const oldId=verifyUuid(data.expectedOutputId,d.fail);
    const result=await d.run(env,
      "UPDATE jobs SET output_id=?,params=?,updated_at=? WHERE id=? AND owner_id=? AND state='completed' AND output_id=?",
      composedId,JSON.stringify(updated),Date.now(),id,owner,oldId);
    if(!result.meta?.changes)d.fail(409,'The output changed while finalizing. Refresh History.');
    return d.json({job:d.jobView(await d.first(env,'SELECT * FROM jobs WHERE id=?',id))});
  }
  d.fail(404,'Precision Edit route not found.');
}
