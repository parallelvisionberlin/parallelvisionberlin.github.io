// Google Gemini image integration for Parallel Vision Lab. The API key stays server-side.
export const GEMINI_MODEL='gemini-3-pro-image';
export const GEMINI_NORMAL_MAX=4;
export const GEMINI_BATCH_MAX=20;
export const GEMINI_RATIOS=new Set(['auto','1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9']);
const API='https://generativelanguage.googleapis.com';
const FILE_NAME=/^files\/[A-Za-z0-9._-]{1,240}$/;
const BATCH_NAME=/^batches\/[A-Za-z0-9._-]{1,240}$/;

function problem(status,message,definite=true){const e=new Error(message);e.status=status;e.definite=definite;return e;}
function clean(value){
  return String(value||'')
    .replace(/https?:\/\/[^\s"'<>]+/gi,'[redacted URL]')
    .replace(/AIza[A-Za-z0-9_-]{20,}/g,'[redacted credential]')
    .replace(/[\u0000-\u001f\u007f]+/g,' ').trim().slice(0,600);
}
function googleErrorMessage(data,status){
  const detail=clean(data?.error?.message||data?.message||'');
  return detail?('Google Gemini API: '+detail):('Google Gemini API request failed (HTTP '+status+').');
}
export function geminiParameters(value,{fail,referenceLabels}){
  const prompt=typeof value?.prompt==='string'?value.prompt.trim():'';
  const resolution=String(value?.resolution||'').toLowerCase();
  const aspectRatio=value?.aspectRatio||'auto';
  const delivery=value?.delivery==='batch'?'batch':'normal';
  if(!prompt||prompt.length>5000)fail(400,'Nano Banana Pro needs a prompt up to 5,000 characters.');
  if(!['1k','2k','4k'].includes(resolution)||!GEMINI_RATIOS.has(aspectRatio))fail(400,'Choose 1K, 2K or 4K and a supported Nano Banana Pro aspect ratio.');
  return {type:'image',model:GEMINI_MODEL,mode:'image',imageEngine:'nano-banana-pro',delivery,prompt,resolution,aspectRatio,outputFormat:'auto',referenceRoles:referenceLabels(value?.referenceRoles)};
}
export function geminiEstimatedMicros(p,referenceCount=0){
  const batch=p.delivery==='batch';
  const output=p.resolution==='4k'?(batch?120000:240000):(batch?67000:134000);
  const imageInput=Math.max(0,Number(referenceCount)||0)*(batch?600:1100);
  const estimatedTextTokens=Math.ceil((p.prompt||'').length/4);
  const textInput=estimatedTextTokens*(batch?1:2);
  return output+imageInput+textInput;
}
export function buildGenerateRequest(p,files=[],prompt=p.prompt){
  const parts=[{text:prompt}];
  for(const file of files){
    if(!file?.uri||!file?.mimeType)throw problem(502,'Google did not return a usable reference file.');
    parts.push({fileData:{mimeType:file.mimeType,fileUri:file.uri}});
  }
  const image={imageSize:p.resolution.toUpperCase()};
  if(p.aspectRatio!=='auto')image.aspectRatio=p.aspectRatio;
  return {contents:[{parts}],generationConfig:{responseModalities:['IMAGE'],responseFormat:{image}}};
}
export function buildBatchJsonl(jobs,request){
  const batchRequest={contents:request.contents,generation_config:request.generationConfig};
  return jobs.map(j=>JSON.stringify({key:j.id,request:batchRequest})).join('\n')+'\n';
}
export function extractInlineImage(response){
  for(const candidate of response?.candidates||[]){
    for(const part of candidate?.content?.parts||[]){
      const data=part?.inlineData||part?.inline_data;
      if(data?.data)return {data:data.data,mimeType:data.mimeType||data.mime_type||''};
    }
  }
  return null;
}
export function geminiResponseFailure(response){
  const finish=(response?.candidates||[]).map(c=>c?.finishReason||c?.finish_reason).filter(Boolean).join(', ');
  const feedback=response?.promptFeedback?.blockReason||response?.prompt_feedback?.block_reason;
  return 'Google returned no generated image'+(feedback?' ('+clean(feedback)+')':finish?' ('+clean(finish)+')':'')+'.';
}
export function batchState(data){return data?.state||data?.metadata?.state||'';}
export function batchOutputFile(data){return data?.dest?.fileName||data?.dest?.file_name||data?.response?.responsesFile||data?.response?.responses_file||data?.metadata?.output?.responsesFile||data?.metadata?.output?.responses_file||'';}
export function validBatchName(value){return BATCH_NAME.test(value||'');}
export function validFileName(value){return FILE_NAME.test(value||'');}

export async function googleJson(path,key,{method='GET',body,paid=false,timeout=30000}={}){
  let response;
  try{
    response=await fetch(API+path,{method,headers:{'x-goog-api-key':key,'Accept':'application/json',...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(timeout),redirect:'error'});
  }catch{
    throw problem(502,paid?'Google generation submission could not be confirmed. Check Google AI Studio billing/history before retrying.':'Google Gemini API could not be reached. No generation was submitted by this request.',!paid);
  }
  const raw=await response.text();let data=null;
  try{data=raw?JSON.parse(raw):null;}catch{}
  if(!response.ok){
    const definite=!paid||(response.status>=400&&response.status<500&&response.status!==408&&response.status!==429);
    throw problem(definite?422:502,googleErrorMessage(data,response.status),definite);
  }
  if(!data||typeof data!=='object')throw problem(502,'Google Gemini API returned an unexpected response.',!paid);
  return data;
}
function safeUploadUrl(value){
  let url;try{url=new URL(value);}catch{throw problem(502,'Google returned an invalid upload URL.');}
  if(url.protocol!=='https:'||url.hostname!=='generativelanguage.googleapis.com'||url.username||url.password||(url.port&&url.port!=='443'))throw problem(502,'Google returned an unexpected upload location.');
  return url.href;
}
export async function googleUpload(key,bytes,mimeType,displayName='pv-lab-input'){
  const size=bytes?.byteLength??bytes?.length??0;
  if(!size||size>64*1024*1024)throw problem(400,'Google upload input is empty or too large.');
  let start;
  try{
    start=await fetch(API+'/upload/v1beta/files',{
      method:'POST',
      headers:{
        'x-goog-api-key':key,
        'X-Goog-Upload-Protocol':'resumable',
        'X-Goog-Upload-Command':'start',
        'X-Goog-Upload-Header-Content-Length':String(size),
        'X-Goog-Upload-Header-Content-Type':mimeType,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({file:{display_name:String(displayName).slice(0,100)}}),
      signal:AbortSignal.timeout(30000),
      redirect:'error'
    });
  }catch{throw problem(502,'Google File API could not start the upload. No generation was submitted.');}
  if(!start.ok){let d=null;try{d=await start.json();}catch{}throw problem(502,googleErrorMessage(d,start.status));}
  await start.body?.cancel();
  const uploadUrl=safeUploadUrl(start.headers.get('X-Goog-Upload-URL')||start.headers.get('x-goog-upload-url'));
  let finish;
  try{
    finish=await fetch(uploadUrl,{
      method:'POST',
      headers:{'Content-Length':String(size),'X-Goog-Upload-Offset':'0','X-Goog-Upload-Command':'upload, finalize'},
      body:bytes,
      signal:AbortSignal.timeout(60000),
      redirect:'error'
    });
  }catch{throw problem(502,'Google File API upload was interrupted. No generation was submitted.');}
  const raw=await finish.text();let data=null;try{data=raw?JSON.parse(raw):null;}catch{}
  if(!finish.ok||!data?.file||!FILE_NAME.test(data.file.name||''))throw problem(502,googleErrorMessage(data,finish.status));
  if(data.file.uri){
    let uri;try{uri=new URL(data.file.uri);}catch{throw problem(502,'Google returned an invalid file URI.');}
    if(uri.protocol!=='https:'||uri.hostname!=='generativelanguage.googleapis.com')throw problem(502,'Google returned an unexpected file URI.');
  }
  return data.file;
}
export async function googleDownload(fileName,key){
  if(!FILE_NAME.test(fileName||''))throw problem(502,'Google returned an invalid batch output file.');
  let response;
  try{
    response=await fetch(API+'/download/v1beta/'+fileName+':download?alt=media',{headers:{'x-goog-api-key':key},signal:AbortSignal.timeout(60000),redirect:'error'});
  }catch{throw problem(502,'Google batch output could not be downloaded yet.');}
  if(!response.ok){let d=null;try{d=await response.clone().json();}catch{}throw problem(502,googleErrorMessage(d,response.status));}
  return response;
}
