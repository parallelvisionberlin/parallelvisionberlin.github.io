// Reviewed local edits keep the selected Image model and bind their sources to
// the ordinary price quote/job. Final composition reuses the paid raw result.
const UUID=/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const SCOPES=new Set(['face','person','garment','outfit','object']);
const ENGINES=new Set(['seedream','seedreamlite','gemini','gemini21','flash','qwen3','krea3']);
const defaultFail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const imageMimes=new Set(['image/png','image/jpeg','image/webp']);

export function normalizeImageReplacement(value,p,fail=defaultFail){
  if(value==null)return null;
  if(!value||Array.isArray(value)||value.version!==1||!SCOPES.has(value.scope))fail(400,'Review a valid replacement area before generating.');
  if(p.type!=='image'||p.mode!=='image'||p.referenceMode!=='base'||!ENGINES.has(p.engine))
    fail(400,'This replacement needs Base image editing with a supported Image model.');
  if(!UUID.test(value.originalSourceId||'')||!UUID.test(value.maskSourceId||'')||value.originalSourceId===value.maskSourceId)
    fail(400,'Replacement needs an original photograph and a separate reviewed selection.');
  const refs=value.referenceSourceIds;
  if(!Array.isArray(refs)||!refs.length||refs.length>9||refs.some(id=>!UUID.test(id||'')||id===value.originalSourceId||id===value.maskSourceId)||new Set(refs).size!==refs.length)
    fail(400,'Choose the replacement references for the reviewed area.');
  return {version:1,originalSourceId:value.originalSourceId,maskSourceId:value.maskSourceId,
    scope:value.scope,referenceSourceIds:[...refs]};
}

function imageSize(bytes,mime,d){
  const size=d.storedImageDimensions(bytes,mime);
  if(!size||!Number.isInteger(size.width)||!Number.isInteger(size.height)||size.width<240||size.height<240||size.width>8192||size.height>8192)
    d.fail(400,'Replacement photographs must be between 240 and 8192 pixels per side.');
  return size;
}

export async function validateImageReplacement(env,owner,data,p,d){
  if(!p.replacement)return;
  const replacement=p.replacement,ids=data.referenceSourceIds;
  if(!Array.isArray(ids)||ids[0]!==replacement.originalSourceId||
      replacement.referenceSourceIds.some(id=>!ids.slice(1).includes(id)))
    d.fail(409,'The Base or replacement references changed. Review the selection again.');
  const labels=p.referenceRoles||[];
  if(labels.length!==ids.length||labels[0]?.role!=='base')
    d.fail(409,'The reviewed replacement needs the same Base and reference roles.');
  const category=replacement.scope==='object'?'props':['garment','outfit'].includes(replacement.scope)?'outfits':'characters';
  const allowed=category==='props'?['object']:category==='outfits'?['outfit']:replacement.scope==='face'?['identity']:['identity','body'];
  for(const id of replacement.referenceSourceIds){
    const label=labels[ids.indexOf(id)];
    if(!allowed.includes(label?.role)&&label?.elementCategory!==category)
      d.fail(409,'Replacement references do not match the reviewed edit. Choose the matching Character, Clothing or Object.');
    const reference=await d.source(env,owner,id);
    if(!imageMimes.has(reference.mime))d.fail(400,'Replacement references must be photographs.');
  }
  const original=await d.source(env,owner,replacement.originalSourceId);
  const mask=await d.source(env,owner,replacement.maskSourceId);
  if(!imageMimes.has(original.mime)||mask.mime!=='image/png')d.fail(400,'Replacement needs a photograph and a PNG selection.');
  if(mask.bytes>20*1024*1024)d.fail(413,'The reviewed selection exceeds 20 MB.');
  const originalSize=imageSize(await d.falImageBytes(env,original),original.mime,d);
  const maskSize=imageSize(await d.falImageBytes(env,mask),mask.mime,d);
  if(p.aspectRatio!=='auto'){
    const [width,height]=String(p.aspectRatio||'').split(':').map(Number);
    if(!width||!height||Math.abs((width/height)/(originalSize.width/originalSize.height)-1)>.01)
      d.fail(400,'Choose the Base aspect ratio before generating this replacement.');
  }
  if(maskSize.width>originalSize.width||maskSize.height>originalSize.height||
      Math.abs(maskSize.width/maskSize.height-originalSize.width/originalSize.height)>.006)
    d.fail(400,'The selection must preserve the Base photograph dimensions and aspect ratio.');
  p.replacementFinalized=false;
}

export async function imageReplacementRoute(request,env,owner,url,d){
  if(url.pathname!=='/api/replacement/commit'||request.method!=='POST')d.fail(404,'Replacement route not found.');
  const data=await d.body(request);
  for(const id of [data.jobId,data.compositeSourceId,data.expectedOutputId])if(!UUID.test(id||''))d.fail(400,'Invalid replacement result identifier.');
  const job=await d.first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',data.jobId,owner);
  if(!job)d.fail(404,'Replacement job not found.');
  const p=JSON.parse(job.params||'{}');
  if(!p.replacement||p.type!=='image'||job.state!=='completed'||!job.output_id)
    d.fail(409,'Wait for the replacement result before finishing the original photograph.');
  if(p.replacementFinalized){
    if(job.output_id!==data.compositeSourceId)d.fail(409,'This replacement was already finished. Refresh History.');
    return d.json({job:d.jobView(job)});
  }
  if(job.output_id!==data.expectedOutputId)d.fail(409,'The result changed. Refresh History before finishing this replacement.');
  const original=await d.source(env,owner,p.replacement.originalSourceId);
  const composite=await d.source(env,owner,data.compositeSourceId);
  if(composite.mime!=='image/png')d.fail(415,'Replacement exports require lossless PNG to preserve the original photograph.');
  const a=imageSize(await d.falImageBytes(env,original),original.mime,d);
  const b=imageSize(await d.falImageBytes(env,composite),composite.mime,d);
  if(a.width!==b.width||a.height!==b.height)d.fail(400,'The finished replacement must match the original photograph dimensions.');
  const updated={...p,replacementFinalized:true,replacementRawOutputId:job.output_id};
  const result=await d.run(env,"UPDATE jobs SET output_id=?,params=?,updated_at=? WHERE id=? AND owner_id=? AND state='completed' AND output_id=?",
    composite.id,JSON.stringify(updated),Date.now(),job.id,owner,data.expectedOutputId);
  if(!result.meta?.changes)d.fail(409,'The result changed while finishing. Refresh History.');
  return d.json({job:d.jobView(await d.first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',job.id,owner))});
}

export async function replacementUploadContext(env,owner,jobId,mime,d){
  if(!UUID.test(jobId||''))d.fail(400,'Invalid replacement job identifier.');
  if(mime!=='image/png')d.fail(415,'Finish a replacement using lossless PNG.');
  const job=await d.first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',jobId,owner);
  if(!job)d.fail(404,'Replacement job not found.');
  const p=JSON.parse(job.params||'{}');
  if(!p.replacement||p.replacementFinalized||job.state!=='completed'||!UUID.test(job.output_id||''))
    d.fail(409,'Only a completed replacement waiting for its original photograph can upload a final PNG.');
  const original=await d.source(env,owner,p.replacement.originalSourceId);
  const dimensions=imageSize(await d.falImageBytes(env,original),original.mime,d);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('replacement-upload-v1:'+owner+':'+job.id+':'+job.output_id)));
  digest[6]=(digest[6]&15)|64;digest[8]=(digest[8]&63)|128;
  const hex=Array.from(digest.slice(0,16),byte=>byte.toString(16).padStart(2,'0')).join('');
  const id=[hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
  return {id,jobId:job.id,rawOutputId:job.output_id,dimensions};
}

export async function storeReplacementUpload(env,owner,context,bytes,d){
  const size=imageSize(bytes,'image/png',d);
  if(size.width!==context.dimensions.width||size.height!==context.dimensions.height)
    d.fail(400,'The finished replacement must match the original photograph dimensions.');
  // One deterministic source per paid raw result bounds free finalization
  // uploads and makes duplicate requests reuse the same private asset.
  const old=await d.first(env,'SELECT * FROM assets WHERE id=? AND owner_id=?',context.id,owner);
  if(old)return {id:old.id,filename:old.filename,bytes:old.bytes};
  const key=owner+'/sources/'+context.id,filename='replacement-finished.png';
  const reserved=await d.run(env,"INSERT OR IGNORE INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,'source','image/png',?,?,?)",
    context.id,owner,key,filename,bytes.length,Date.now());
  if(!reserved.meta?.changes)return {id:context.id,filename,bytes:bytes.length};
  try{await env.LAB_MEDIA.put(key,bytes,{httpMetadata:{contentType:'image/png'}});}
  catch(error){await d.run(env,'DELETE FROM assets WHERE id=? AND owner_id=?',context.id,owner);throw error;}
  return {id:context.id,filename,bytes:bytes.length};
}
