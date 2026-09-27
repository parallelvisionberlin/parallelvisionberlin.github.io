/* Parallel Vision Lab. Private owner-only workspace, no public media bucket.
   The hosted provider is opt-in; no provider key or moderation bypass in source. */
export const VERSION = 'pv-lab-2026-09-27.2';
const UPSCALER = 'spicyapi/image-upscaler-v1/upscale';
const CONCURRENCY = Object.freeze({image:4,video:1});
const ORIGINS = new Set(['https://parallelvisionlabel.com','https://www.parallelvisionlabel.com']);
const ISSUER = 'https://clerk.parallelvisionlabel.com';
const VENDOR = 'https://api.spicyapi.ai/api/v1';
const MODEL_IMAGE = 'alibaba/wan-3.0/image-to-video';
const MODEL_REFERENCE = 'alibaba/wan-3.0/reference-to-video';
const STILL_TEXT = 'bytedance/seedream-5.0-pro/text-to-image';
const STILL_EDIT = 'bytedance/seedream-5.0-pro/edit';
const RATIOS = ['auto','1:1','4:3','3:4','16:9','9:16','3:2','2:3','4:5','5:4','21:9','9:21','2:1','1:2','3:1','1:3'];
const MODEL = MODEL_IMAGE; // Stable encryption context for existing stored provider keys.
const DOC = 'https://spicyapi.ai/models/wan-3-0';
const RESOLUTIONS = new Set(['480p','720p','1080p']);
// No hard-coded provider price. A live, bound quote is required before each paid request.
function micros(value) {
  const text=String(value); if(!/^\d{1,6}(\.\d{1,6})?$/.test(text))fail(502,'Provider returned an invalid USD amount.');
  const [whole,fraction='']=text.split('.');return Number(whole)*1000000+Number(fraction.padEnd(6,'0'));
}
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ACTIVE = new Set(['submitting','queued','running','saving','uncertain']);
const MAX_IMAGE = 20 * 1024 * 1024, MAX_VIDEO = 150 * 1024 * 1024, MAX_STORAGE = 2 * 1024 * 1024 * 1024;
const enc = new TextEncoder(), dec = new TextDecoder();
let jwksCache = { keys: [], at: 0 };
class HttpError extends Error { constructor(status,message) { super(message); this.status=status; } }
const fail = (status,message) => { throw new HttpError(status,message); };
const now = () => Date.now();
const json = (x,status=200) => new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json'}});
const stmt = (env,sql,...p) => env.LAB_DB.prepare(sql).bind(...p);
const first = (env,sql,...p) => stmt(env,sql,...p).first();
const run = (env,sql,...p) => stmt(env,sql,...p).run();
const rows = async (env,sql,...p) => (await stmt(env,sql,...p).all()).results;
const uid = value => UUID.test(value || '') ? value : fail(400,'Invalid record identifier.');
function unbase(s) { return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0)); }
function base(b) { let s=''; for(const n of new Uint8Array(b))s+=String.fromCharCode(n); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
async function limitedBody(request,max) {
  const length=Number(request.headers.get('content-length'));
  if(length>max)fail(413,'File or request is too large.');
  const reader=request.body?.getReader(); if(!reader)return new Uint8Array();
  const parts=[]; let total=0;
  while(true){ const {done,value}=await reader.read(); if(done)break; total+=value.byteLength;
    if(total>max){await reader.cancel();fail(413,'File or request is too large.');} parts.push(value); }
  const all=new Uint8Array(total);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}return all;
}
async function body(request) {
  if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Send JSON.');
  try{const value=JSON.parse(dec.decode(await limitedBody(request,32000)));if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'Send a JSON object.');return value;}catch(e){if(e instanceof HttpError)throw e;fail(400,'Invalid JSON.');}
}
function decorate(response,origin) {
  const h=new Headers(response.headers);
  h.set('Cache-Control','no-store'); h.set('X-Content-Type-Options','nosniff');h.set('Referrer-Policy','no-referrer');h.set('X-Robots-Tag','noindex, nofollow, noarchive');
  h.set('Vary','Origin'); if(ORIGINS.has(origin)){h.set('Access-Control-Allow-Origin',origin);h.set('Access-Control-Expose-Headers','Content-Disposition, Content-Length, Content-Range');}
  return new Response(response.body,{status:response.status,headers:h});
}
async function getJwks(refresh=false) {
  if(!refresh && now()-jwksCache.at<600000)return jwksCache.keys;
  const r=await fetch(ISSUER+'/.well-known/jwks.json',{signal:AbortSignal.timeout(10000)});
  if(!r.ok)fail(503,'Sign-in verification is temporarily unavailable.');
  const data=await r.json();if(!Array.isArray(data.keys))fail(503,'Sign-in verification is temporarily unavailable.');
  jwksCache={keys:data.keys,at:now()};return data.keys;
}
async function authenticate(request,env) {
  const header=request.headers.get('authorization') || '';
  if(!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(header) || header.length>10000)fail(401,'Sign in with your Parallel Vision owner account.');
  const token=header.slice(7), [a,b,c]=token.split('.');let h,p;
  try{h=JSON.parse(dec.decode(unbase(a)));p=JSON.parse(dec.decode(unbase(b)));}catch{fail(401,'Invalid sign-in token.');}
  const t=Math.floor(now()/1000);
  if(h.alg!=='RS256'||typeof h.kid!=='string'||p.iss!==ISSUER||!/^user_[A-Za-z0-9]+$/.test(p.sub||'')||!ORIGINS.has(p.azp)||!Number.isFinite(p.exp)||p.exp<=t||!Number.isFinite(p.iat)||p.iat>t+5||(p.nbf!==undefined&&(!Number.isFinite(p.nbf)||p.nbf>t+5)))fail(401,'Sign-in expired or invalid. Please sign in again.');
  let key=(await getJwks()).find(k=>k.kid===h.kid&&k.kty==='RSA');
  if(!key)key=(await getJwks(true)).find(k=>k.kid===h.kid&&k.kty==='RSA');
  if(!key)fail(401,'Unknown sign-in key.');
  let valid=false;
  try{const k=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',k,unbase(c),enc.encode(a+'.'+b));}catch{}
  if(!valid)fail(401,'Invalid sign-in signature.');
  // Read only: never changes Nina's identity, memory or account tables.
  const owner=await env.OWNER_DB.prepare("SELECT id FROM users WHERE auth_provider='clerk' AND auth_subject=? AND role='owner' LIMIT 1").bind(p.sub).first();
  if(!owner)fail(403,'This Lab is private. Only the Parallel Vision owner has access.');
  return owner.id;
}
async function derived(env,label,algorithm,usages) {
  if(!env.LAB_SECRET || env.LAB_SECRET.length<40)fail(503,'Private storage is not configured.');
  const bytes=await crypto.subtle.digest('SHA-256',enc.encode(label+':'+env.LAB_SECRET));
  return crypto.subtle.importKey('raw',bytes,algorithm,false,usages);
}
async function encryptKey(env,key) {
  const k=await derived(env,'credential','AES-GCM',['encrypt']),iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(MODEL)},k,enc.encode(key));
  return base(iv)+'.'+base(cipher);
}
async function decryptKey(env,value) {
  const [iv,cipher]=value.split('.');const key=await derived(env,'credential','AES-GCM',['decrypt']);
  return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase(iv),additionalData:enc.encode(MODEL)},key,unbase(cipher)));
}
async function config(env,owner) {return first(env,'SELECT * FROM settings WHERE owner_id=?',owner);}
function publicConfig(c) {return {concurrency:CONCURRENCY,configured:!!c,enabled:!!(c?.enabled&&c?.terms_confirmed),dailyLimitUsd:(c?.daily_limit_microusd||10000000)/1000000,provider:'SpicyAPI',model:'Wan 3.0 / Seedream 5.0 Pro / Image Upscaler',documentation:DOC,pricingNote:'A live provider quote is required before every generation. No subscription is added by this Lab. Provider terms apply.'};}
async function vendorRequest(path,key,data,idempotency,method=data?'POST':'GET') {
  let r;
  try {
    r=await fetch(VENDOR+path,{method,headers:{Authorization:'Bearer '+key,'Accept':'application/json',...(data?{'Content-Type':'application/json'}:{}),...(idempotency?{'Idempotency-Key':idempotency}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(20000),redirect:'follow'});
  } catch {
    const paid=path==='/jobs/createTask';
    const e=new HttpError(502,paid?'Submission could not be confirmed. Check history and the provider before retrying.':'The provider could not be reached. No generation was submitted by this request.');e.definite=!paid;throw e;
  }
  const raw=await r.text();let result=null;
  try{result=raw?JSON.parse(raw):null;}catch{}
  if(!r.ok || !result || Number(result.code)!==200){
    const code=Number(result?.code), definite=(r.status>=400&&r.status<500&&r.status!==408)||[400,401,403,40201,40202,40301,40302,40303,40901,422].includes(code);
    let message;
    if(code===40901)message='Provider quote expired or changed. Review a new price before generating.';
    else if([40201,40202].includes(code))message='Provider balance or API spending limit is insufficient. Check the provider console.';
    else if(code===40301)message='This API key is not allowed to use the selected model. Enable that model route in your provider API-key settings.';
    else if(code===40302)message='SpicyAPI rejected this server address. Set the API key IP allowlist to Any address.';
    else if(code===40303)message='SpicyAPI is not available from this backend region.';
    else if(code===401||r.status===401)message='SpicyAPI rejected this API key. Use the key beginning sk-spicy- and make sure it has not expired or been revoked.';
    else if(code===403||r.status===403)message='SpicyAPI refused the API request. Check email verification, key restrictions and provider account status.';
    else if(!result)message='SpicyAPI returned an unexpected response (HTTP '+r.status+'). Check the request status before retrying.';
    else message=typeof result.msg==='string'&&result.msg?('SpicyAPI: '+result.msg):'Provider rejected the request. Check its console for details.';
    const e=new HttpError(definite?422:502,message);e.definite=definite;throw e;
  }
  return result.data;
}
async function requireConfigured(env,owner) {
  const c=await config(env,owner);if(!c?.enabled||!c.terms_confirmed)fail(409,'Rendering is not enabled. A compatible provider and your API key are still required.');
  return {c,key:await decryptKey(env,c.encrypted_key)};
}
function sniff(bytes,mime) {
  if(mime==='image/png')return bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  if(mime==='image/jpeg')return bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  return mime==='image/webp'&&bytes.length>=12&&dec.decode(bytes.slice(0,4))==='RIFF'&&dec.decode(bytes.slice(8,12))==='WEBP';
}
function referenceLabels(value) {
  if(value==null)return [];
  if(!Array.isArray(value)||value.length>10)fail(400,'Use up to ten reference labels.');
  const allowed=['none','identity','outfit','room','pose','object','style','lighting','custom'];
  return value.map(x=>({name:String(x?.name||'').replace(/[\r\n]/g,' ').slice(0,180),role:allowed.includes(x?.role)?x.role:'none',note:String(x?.note||'').trim().slice(0,300)}));
}
function parameters(value) {
  if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'Invalid settings.');
  const prompt=typeof value.prompt==='string'?value.prompt.trim():'';
  const referenceRoles=referenceLabels(value.referenceRoles);
  if(value.type==='image'&&value.mode==='upscale'){
    if(!['2k','4k','8k'].includes(value.resolution)||!['jpeg','png','webp'].includes(value.outputFormat||'jpeg'))fail(400,'Choose 2K, 4K or 8K and JPEG, PNG or WebP.');
    return {type:'image',model:UPSCALER,mode:'upscale',prompt:'',resolution:value.resolution,aspectRatio:'auto',outputFormat:value.outputFormat||'jpeg',referenceRoles:[]};
  }
  if(value.type==='image'){
    if(prompt.length>5000||!['1k','2k'].includes(value.resolution)||!RATIOS.includes(value.aspectRatio||'1:1'))fail(400,'Choose 1K or 2K and a supported image ratio. Maximum prompt length is 5,000.');
    if(!['png','jpeg'].includes(value.outputFormat||'jpeg'))fail(400,'Choose PNG or JPEG.');
    return {type:'image',model:STILL_TEXT,mode:'image',prompt,resolution:value.resolution,aspectRatio:value.aspectRatio||'1:1',outputFormat:value.outputFormat||'jpeg',referenceRoles};
  }
  if(prompt.length>6000)fail(400,'Use no more than 6,000 prompt characters.');
  const duration=Number(value.duration),resolution=value.resolution;
  if(!Number.isInteger(duration)||duration<2||duration>30||!RESOLUTIONS.has(resolution))fail(400,'Choose 2 to 30 seconds and 480p, 720p or 1080p.');
  const ratio=value.aspectRatio||'auto';if(!['auto','16:9','9:16','1:1','4:3','3:4'].includes(ratio))fail(400,'Invalid video aspect ratio.');
  const seed=value.seed==null||value.seed===''?null:Number(value.seed);
  if(seed!==null&&(!Number.isInteger(seed)||seed<0||seed>2147483647))fail(400,'Seed must be a whole number from 0 to 2147483647.');
  const mode=value.mode==='reference'?'reference':'start';
  return {type:'video',model:mode==='reference'?MODEL_REFERENCE:MODEL_IMAGE,mode,prompt,duration,resolution,aspectRatio:ratio,seed,audio:value.audio!==false,referenceRoles};
}
function assembledPrompt(p) {
  const labels=(p.referenceRoles||[]).slice(0,p.referenceSourceIds?.length||0).map((r,i)=>r.role!=='none'||r.note?'Reference '+(i+1)+(r.name?' ('+r.name+')':'')+': '+(r.role!=='none'?r.role+'. ':'')+r.note:'').filter(Boolean);
  const prompt=[p.prompt,...labels].join('\n');
  if(prompt.length>(p.type==='image'?5000:6000))fail(400,'Prompt plus reference notes is too long. Shorten the notes.');
  return prompt;
}
async function prepareInput(env,owner,data,p,url) {
  let primary=null,input;
  if(p.type==='image'&&p.mode==='upscale'){
    primary=await source(env,owner,data.sourceId);p.referenceSourceIds=[];p.lastSourceId=null;
    input={resolution:p.resolution,output_format:p.outputFormat};
    if(url)input.image_url=await signedInput(env,url,primary.id);
  }else if(p.type==='image'){
    const refs=data.referenceSourceIds?.length?await sources(env,owner,data.referenceSourceIds):[];
    primary=refs[0]||null;p.referenceSourceIds=refs.map(a=>a.id);p.lastSourceId=null;p.model=refs.length?STILL_EDIT:STILL_TEXT;
    input={resolution:p.resolution,aspect_ratio:p.aspectRatio==='auto'&&!refs.length?'1:1':p.aspectRatio,output_format:p.outputFormat};
    if(refs.length&&url)input.image_urls=await Promise.all(refs.map(a=>signedInput(env,url,a.id)));
  }else if(p.mode==='reference'){
    const refs=await sources(env,owner,data.referenceSourceIds);primary=refs[0];p.referenceSourceIds=refs.map(a=>a.id);p.lastSourceId=null;
    input={resolution:p.resolution,duration_seconds:p.duration,generate_audio:p.audio,enable_prompt_expansion:false,aspect_ratio:p.aspectRatio==='auto'?'adaptive':p.aspectRatio};
    if(url)input.reference_image_urls=await Promise.all(refs.map(a=>signedInput(env,url,a.id)));
  }else{
    primary=await source(env,owner,data.sourceId);const last=data.lastSourceId?await source(env,owner,data.lastSourceId):null;p.referenceSourceIds=[];p.lastSourceId=last?.id||null;
    input={resolution:p.resolution,duration_seconds:p.duration,generate_audio:p.audio,enable_prompt_expansion:false};
    if(url){input.image_url=await signedInput(env,url,primary.id);if(last)input.last_image_url=await signedInput(env,url,last.id);}
    if(p.aspectRatio!=='auto')input.aspect_ratio=p.aspectRatio;
  }
  if(p.prompt)input.prompt=assembledPrompt(p);if(p.type!=='image'&&p.seed!==null)input.seed=p.seed;
  return {primary,input};
}
async function source(env,owner,id) {
  const a=await first(env,"SELECT * FROM assets WHERE id=? AND owner_id=? AND kind='source'",uid(id),owner);
  if(!a)fail(404,'Source image not found. Upload it again.');return a;
}
async function sources(env,owner,ids) {
  if(!Array.isArray(ids)||ids.length<1||ids.length>10)fail(400,'Reference mode needs 1 to 10 images.');
  const out=[],seen=new Set();
  for(const value of ids){const id=uid(value);if(seen.has(id))continue;seen.add(id);out.push(await source(env,owner,id));}
  if(!out.length)fail(400,'Add at least one reference image.');return out;
}
function linkedSourceIds(row) {
  const ids=new Set();if(row?.source_id&&UUID.test(row.source_id))ids.add(row.source_id);
  try{const p=JSON.parse(row?.params||'{}');if(UUID.test(p.lastSourceId||''))ids.add(p.lastSourceId);for(const key of ['referenceSourceIds','transferSourceIds'])if(Array.isArray(p[key]))for(const id of p[key])if(UUID.test(id||''))ids.add(id);}catch{}
  return [...ids];
}
async function sourceReferenced(env,owner,id) {
  const jobs=await rows(env,'SELECT source_id,output_id,params FROM jobs WHERE owner_id=?',owner);for(const row of jobs)if(row.output_id===id||linkedSourceIds(row).includes(id))return true;
  const packs=await rows(env,'SELECT refs FROM packs WHERE owner_id=?',owner);for(const pack of packs)if(JSON.parse(pack.refs).some(r=>r.id===id))return true;
  const quotes=await rows(env,'SELECT source_id,params FROM quotes WHERE owner_id=?',owner);for(const row of quotes)if(linkedSourceIds(row).includes(id))return true;
  return false;
}
async function pruneSource(env,owner,id) {
  if(await sourceReferenced(env,owner,id))return;
  const a=await first(env,"SELECT * FROM assets WHERE id=? AND owner_id=? AND kind='source'",id,owner);if(!a)return;
  await env.LAB_MEDIA.delete(a.object_key);await run(env,'DELETE FROM assets WHERE id=? AND owner_id=?',id,owner);
}
async function signedInput(env,url,id) {
  const expires=Math.floor(now()/1000)+1800,key=await derived(env,'input-url',{name:'HMAC',hash:'SHA-256'},['sign']);
  const sig=base(await crypto.subtle.sign('HMAC',key,enc.encode(id+':'+expires)));
  return url.origin+'/input/'+id+'?expires='+expires+'&signature='+sig;
}
async function publicInput(request,env,url) {
  const id=uid(url.pathname.split('/')[2]),expires=Number(url.searchParams.get('expires')),signature=url.searchParams.get('signature')||'';
  if(!Number.isInteger(expires)||expires<Math.floor(now()/1000)||expires>Math.floor(now()/1000)+1805||!signature||signature.length>100)fail(403,'Expired input link.');
  const key=await derived(env,'input-url',{name:'HMAC',hash:'SHA-256'},['verify']);let valid=false;
  try{valid=await crypto.subtle.verify('HMAC',key,unbase(signature),enc.encode(id+':'+expires));}catch{}
  if(!valid)fail(403,'Invalid input link.');
  const a=await first(env,"SELECT * FROM assets WHERE id=? AND kind='source'",id);if(!a)fail(404,'Not found.');
  const owner=await env.OWNER_DB.prepare("SELECT id FROM users WHERE id=? AND role='owner' AND auth_provider='clerk'").bind(a.owner_id).first();
  if(!owner)fail(403,'Access revoked.');return media(request,env,a);
}
async function media(request,env,a) {
  const obj=await env.LAB_MEDIA.get(a.object_key,request.headers.has('range')?{range:request.headers}:{});
  if(!obj)fail(404,'Stored file is unavailable.');
  const h=new Headers({'Content-Type':a.mime,'Accept-Ranges':'bytes','Content-Disposition':`inline; filename="${a.kind==='video'?'parallel-vision-'+a.id+'.mp4':'source-'+a.id+'.'+(a.mime==='image/jpeg'?'jpg':a.mime.split('/')[1])}"`});
  h.set('Content-Length',String(obj.range?.length??obj.size));
  if(obj.range)h.set('Content-Range',`bytes ${obj.range.offset}-${obj.range.offset+obj.range.length-1}/${obj.size}`);
  return new Response(obj.body,{status:obj.range?206:200,headers:h});
}
function jobView(j) {return {id:j.id,sourceId:j.source_id,settings:JSON.parse(j.params),status:j.state,outputId:j.output_id,estimatedUsd:j.quote_id?j.estimate_microusd/1000000:null,settledUsd:j.settled_cost,providerTaskId:j.provider_id,error:j.error,createdAt:j.created_at,updatedAt:j.updated_at};}
function safeVideoUrl(value) {
  const u=new URL(value);const host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!(host==='spicyapi.ai'||host.endsWith('.spicyapi.ai')||host.endsWith('.r2.cloudflarestorage.com')||host.endsWith('.cloudfront.net')))throw new Error('Unexpected provider output location.');
  return u.href;
}
async function copyResult(env,j,url) {
  let target=safeVideoUrl(url),r;
  for(let i=0;i<4;i++){
    r=await fetch(target,{redirect:'manual',signal:AbortSignal.timeout(30000)});
    if(r.status>=300&&r.status<400){const next=r.headers.get('location');if(!next)throw new Error('No output location.');target=safeVideoUrl(new URL(next,target).href);continue;}break;
  }
  if(!r?.ok)throw new Error('Output download failed.');
  const params=JSON.parse(j.params),isImage=params.type==='image';
  const mime=(r.headers.get('content-type')||'').split(';')[0];
  if(isImage?!['image/png','image/jpeg','image/webp'].includes(mime):!['video/mp4','application/octet-stream'].includes(mime))throw new Error('Unexpected output format.');
  const finalMime=isImage?mime:'video/mp4',ext=isImage?({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[mime]):'mp4';
  const limit=params.mode==='upscale'?256*1024*1024:isImage?MAX_IMAGE:MAX_VIDEO;
  const declared=Number(r.headers.get('content-length')||0);
  if(!Number.isSafeInteger(declared)||declared<0||declared>limit)throw new Error('Output exceeds the archive limit.');
  const stored=await first(env,'SELECT COALESCE(SUM(bytes),0) AS n FROM assets WHERE owner_id=?',j.owner_id);
  if(stored.n+(declared||limit)>MAX_STORAGE)throw new Error('Private archive storage limit reached.');
  const objectKey=`${j.owner_id}/results/${j.id}.${ext}`;let bytes=0;
  if(declared>0&&declared<=16*1024*1024||!env.LAB_MEDIA.createMultipartUpload){
    const buffer=await limitedBody(r,Math.min(limit,16*1024*1024));bytes=buffer.length;
    if(!bytes||isImage&&!sniff(buffer,mime))throw new Error('Invalid image output.');
    if(declared&&bytes!==declared)throw new Error('Incomplete output download.');
    await env.LAB_MEDIA.put(objectKey,buffer,{httpMetadata:{contentType:finalMime}});
  }else{
    const upload=await env.LAB_MEDIA.createMultipartUpload(objectKey,{httpMetadata:{contentType:finalMime}});
    const reader=r.body.getReader(),parts=[],prefix=new Uint8Array(12);let prefixUsed=0,verified=!isImage;
    let buffer=new Uint8Array(8*1024*1024),used=0,part=1;
    try{
      while(true){
        const item=await reader.read();if(item.done)break;
        const chunk=item.value;bytes+=chunk.length;if(bytes>limit)throw new Error('Output exceeds archive limit.');
        if(!verified){const n=Math.min(prefix.length-prefixUsed,chunk.length);prefix.set(chunk.subarray(0,n),prefixUsed);prefixUsed+=n;if(prefixUsed===12){if(!sniff(prefix,mime))throw new Error('Invalid image output.');verified=true;}}
        let offset=0;while(offset<chunk.length){const n=Math.min(buffer.length-used,chunk.length-offset);buffer.set(chunk.subarray(offset,offset+n),used);used+=n;offset+=n;if(used===buffer.length){parts.push(await upload.uploadPart(part++,buffer));used=0;}}
      }
      if(!bytes||!verified&&!sniff(prefix.subarray(0,prefixUsed),mime))throw new Error('Invalid or empty output.');
      if(declared&&bytes!==declared)throw new Error('Incomplete output download.');
      if(used)parts.push(await upload.uploadPart(part,buffer.slice(0,used)));
      await upload.complete(parts);
    }catch(e){await reader.cancel().catch(()=>{});await upload.abort().catch(()=>{});throw e;}
  }
  await env.LAB_DB.batch([
    stmt(env,'INSERT OR IGNORE INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,?,?,?,?,?)',j.id,j.owner_id,objectKey,isImage?'source':'video',finalMime,'parallel-vision-'+j.id+'.'+ext,bytes,now()),
    stmt(env,"UPDATE jobs SET state='completed',output_id=?,remote_url=NULL,error='',updated_at=? WHERE id=?",j.id,now(),j.id)
  ]);
}
// Stage original image bytes with the provider before quoting. No generation here.
const MAX_PROVIDER_IMAGE = 10 * 1024 * 1024;
const FILE_URI = /^spicy:\/\/f\/fil_[A-Za-z0-9_-]{8,128}$/;
function validUploadUrl(value) {
  let u;try{u=new URL(value);}catch{throw new Error('Invalid upload ticket URL.');}
  const host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||
    !(host.endsWith('.r2.cloudflarestorage.com')||host==='spicyapi.ai'||host.endsWith('.spicyapi.ai')))
    throw new Error('Unexpected provider upload location.');
  return u.href;
}
async function stageImageReferences(env,owner,ids,key) {
  const assets=await sources(env,owner,ids);
  // Validate the entire batch before any transfer. Keep the private originals unchanged.
  for(const a of assets)if(!['image/jpeg','image/png','image/webp'].includes(a.mime)||a.bytes<=0||a.bytes>MAX_PROVIDER_IMAGE)
    fail(400,'SpicyAPI image uploads are limited to 10 MiB per file. Prepare a working copy in the Lab before requesting a price. Your original remains unchanged. No generation was submitted.');
  const result=new Array(assets.length);let cursor=0,stopped=false;
  const work=async()=>{
    while(!stopped){
      const i=cursor++;if(i>=assets.length)return;
      try{
        const a=assets[i],object=await env.LAB_MEDIA.get(a.object_key);
        if(!object)throw new Error('Stored reference image is unavailable.');
        const bytes=await limitedBody(new Response(object.body),MAX_PROVIDER_IMAGE);
        if(bytes.length!==a.bytes||!sniff(bytes,a.mime))throw new Error('Stored reference image failed verification.');
        const ticket=await vendorRequest('/common/upload-url',key,{contentType:a.mime,bytes:bytes.length});
        if(!ticket||!/^fil_[A-Za-z0-9_-]{8,128}$/.test(ticket.fileId||'')||ticket.method!=='PUT'||
          !Number.isSafeInteger(ticket.maxBytes)||ticket.maxBytes<bytes.length||
          !Number.isFinite(Date.parse(ticket.expiresAt))||Date.parse(ticket.expiresAt)<=now()+30000)
          throw new Error('Provider did not return a usable upload ticket.');
        const target=validUploadUrl(ticket.uploadUrl),headers=new Headers(ticket.headers);
        if(headers.has('authorization')||headers.has('cookie')||headers.get('content-type')!==a.mime||
          headers.get('content-length')!==String(bytes.length))throw new Error('Provider upload headers do not match the reference file.');
        const put=await fetch(target,{method:'PUT',headers,body:bytes,redirect:'manual',signal:AbortSignal.timeout(20000)});
        if(!put.ok)throw new Error('Reference transfer was rejected (HTTP '+put.status+').');
        await put.body?.cancel();
        const committed=await vendorRequest('/files/'+encodeURIComponent(ticket.fileId)+'/commit',key,undefined,undefined,'POST');
        if(!committed||committed.status!=='ready'||committed.fileId!==ticket.fileId||
          committed.bytes!==bytes.length||committed.contentType!==a.mime||!FILE_URI.test(committed.uri||'')||
          committed.uri!=='spicy://f/'+ticket.fileId||!Number.isFinite(Date.parse(committed.expiresAt))||
          Date.parse(committed.expiresAt)<=now()+600000)throw new Error('Provider has not verified a usable reference upload.');
        const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
        if(typeof committed.sha256!=='string'||committed.sha256.toLowerCase()!==digest)
          throw new Error('Provider reference checksum does not match the original image.');
        result[i]=committed.uri;
      }catch(e){stopped=true;throw e;}
    }
  };
  const attempts=await Promise.allSettled(Array.from({length:Math.min(2,assets.length)},()=>work()));
  const failure=attempts.find(r=>r.status==='rejected');
  if(failure)fail(502,'Reference preparation failed: '+cleanProviderDetail(failure.reason?.message||'Upload timed out.')+' No generation was submitted.');
  return result;
}
function cleanProviderDetail(value) {
  return (typeof value==='string'||typeof value==='number')?String(value)
    .replace(/https?:\/\/[^\s"'<>]+/gi,'[redacted URL]')
    .replace(/Bearer\s+\S+|sk-spicy-[A-Za-z0-9_-]+/gi,'[redacted credential]')
    .replace(/[\u0000-\u001f\u007f]+/g,' ').trim().slice(0,600):'';
}
function providerFailure(result) {
  const code=cleanProviderDetail(result?.errorCode??result?.error_code??result?.failCode??result?.error?.code);
  const message=cleanProviderDetail(result?.errorMessage??result?.error_message??result?.failMsg??result?.error?.message??(typeof result?.error==='string'?result.error:''));
  const requestId=cleanProviderDetail(result?.request_id??result?.requestId);
  return 'SpicyAPI reported '+cleanProviderDetail(result?.state||'failed')+(code?' ['+code+']':'')+': '+
    (message||'No specific failure reason was supplied by the provider.')+(requestId?' Request: '+requestId:'')+
    ' | No new generation was submitted.';
}
async function backfillFailureDetails(env) {
  const jobs=await rows(env,"SELECT * FROM jobs WHERE state='failed' AND provider_id IS NOT NULL AND error=? AND created_at>? ORDER BY created_at DESC LIMIT 3",'The provider ended this job without a downloadable result. Check its dashboard for billing details.',now()-86400000);
  for(const job of jobs){
    const owner=await env.OWNER_DB.prepare("SELECT id FROM users WHERE id=? AND role='owner' AND auth_provider='clerk'").bind(job.owner_id).first();
    if(!owner)continue;
    try{
      const c=await config(env,job.owner_id);if(!c)continue;
      const result=await vendorRequest('/jobs/recordInfo?taskId='+encodeURIComponent(job.provider_id),await decryptKey(env,c.encrypted_key));
      if(['failed','cancelled','canceled','expired'].includes(result.state))await run(env,"UPDATE jobs SET error=? WHERE id=? AND state='failed'",providerFailure(result),job.id);
    }catch{}
  }
}

async function refreshJob(env,j) {
  if(!['queued','running','saving'].includes(j.state)||!j.provider_id)return;
  const lock=await run(env,'UPDATE jobs SET last_poll=? WHERE id=? AND last_poll<?',now(),j.id,now()-8000);
  if(!lock.meta.changes)return;
  try {
    const c=await config(env,j.owner_id);if(!c)return;
    const key=await decryptKey(env,c.encrypted_key);
    const result=await vendorRequest('/jobs/recordInfo?taskId='+encodeURIComponent(j.provider_id),key);
    if(result.settled===true&&result.cost!==undefined){const cost=micros(result.cost);await run(env,'UPDATE jobs SET settled_cost=? WHERE id=?',cost/1000000,j.id);}
    if(result.state==='succeeded') {
      const kind=JSON.parse(j.params).type==='image'?'image/':'video/';
      const asset=result.output?.assets?.find(a=>a.mime?.startsWith(kind)&&a.url);
      if(!asset&&result.output?.assets?.some(a=>a.pending===true)){await run(env,"UPDATE jobs SET state='running',error='Provider is preparing the output file.',updated_at=? WHERE id=?",now(),j.id);return;}
      const output=asset?.url;if(typeof output!=='string')throw new Error('No compatible output file yet.');
      const safe=safeVideoUrl(output);
      await run(env,"UPDATE jobs SET state='saving',remote_url=?,updated_at=? WHERE id=?",safe,now(),j.id);
      await copyResult(env,j,safe);
    }else if(['failed','cancelled','canceled','expired'].includes(result.state)){
      await run(env,"UPDATE jobs SET state='failed',error=?,updated_at=? WHERE id=?",providerFailure(result),now(),j.id);
    }else{
      await run(env,"UPDATE jobs SET state=?,updated_at=?,error='' WHERE id=?",result.state==='running'?'running':'queued',now(),j.id);
    }
  }catch(e){
    const detail=String(e?.message||'temporary provider/archive error').replace(/[\r\n]/g,' ').slice(0,220);
    await run(env,'UPDATE jobs SET error=? WHERE id=?','Archive retry: '+detail+' No new generation was submitted.',j.id);
  }
}
async function route(request,env,ctx) {
  const url=new URL(request.url),origin=request.headers.get('origin')||'';
  if(origin&&!ORIGINS.has(origin))fail(403,'Origin not allowed.');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type,X-Filename,Range','Access-Control-Max-Age':'600'}});
  if(url.pathname==='/health'&&request.method==='GET')return json({ok:true,version:VERSION});
  if(url.pathname.startsWith('/input/')&&request.method==='GET')return publicInput(request,env,url);
  if(!url.pathname.startsWith('/api/'))fail(404,'Not found.');
  const owner=await authenticate(request,env),path=url.pathname,method=request.method;
  if(path==='/api/session'&&method==='GET'){
    const c=await config(env,owner),spent=await first(env,'SELECT COALESCE(SUM(estimate_microusd),0) AS n FROM spend WHERE owner_id=? AND created_at>=?',owner,Math.floor(now()/86400000)*86400000);
    return json({owner:true,ownerId:owner,version:VERSION,config:publicConfig(c),estimatedSpentToday:spent.n/1000000});
  }
  if(path==='/api/settings'&&method==='POST') {
    const data=await body(request),old=await config(env,owner);
    const limit=Number(data.dailyLimitUsd??10);if(!Number.isFinite(limit)||limit<1||limit>100)fail(400,'Daily estimate limit must be between $1 and $100.');
    if(data.enabled===true&&data.termsConfirmed!==true)fail(400,'Confirm provider suitability and terms before enabling paid generation.');
    const active=await first(env,"SELECT id FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','saving','uncertain')",owner);
    if(data.apiKey&&active)fail(409,'Wait for or resolve the active job before changing the API account.');
    let encrypted=old?.encrypted_key;
    if(typeof data.apiKey==='string'&&data.apiKey.trim()) {
      const key=data.apiKey.trim();if(key.length<16||key.length>512||/\s/.test(key))fail(400,'Invalid API key format.');
      // Read-only credential check. This never generates or purchases anything.
      await vendorRequest('/chat/credit',key);
      encrypted=await encryptKey(env,key);
    }
    if(!encrypted)fail(400,'Enter your provider API key.');
    await run(env,'INSERT INTO settings(owner_id,encrypted_key,enabled,terms_confirmed,daily_limit_microusd,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(owner_id) DO UPDATE SET encrypted_key=excluded.encrypted_key,enabled=excluded.enabled,terms_confirmed=excluded.terms_confirmed,daily_limit_microusd=excluded.daily_limit_microusd,updated_at=excluded.updated_at',owner,encrypted,data.enabled===true?1:0,data.termsConfirmed===true?1:0,Math.round(limit*1000000),now());
    return json({config:publicConfig(await config(env,owner))});
  }
  if(path==='/api/settings'&&method==='DELETE') {
    if(await first(env,"SELECT id FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','saving','uncertain')",owner))fail(409,'Wait for or resolve the active job before removing its API key.');
    await run(env,'DELETE FROM settings WHERE owner_id=?',owner);return json({config:publicConfig(null)});
  }
  if(path==='/api/packs'&&method==='GET'){
    const list=await rows(env,'SELECT id,name,refs,created_at FROM packs WHERE owner_id=? ORDER BY name',owner);
    return json({packs:list.map(p=>({...p,refs:JSON.parse(p.refs)}))});
  }
  if(path==='/api/packs'&&method==='POST'){
    const data=await body(request),name=String(data.name||'').trim().slice(0,100);
    if(!name)fail(400,'Give the pack a name.');
    if((await first(env,'SELECT COUNT(*) AS n FROM packs WHERE owner_id=?',owner)).n>=40)fail(409,'Keep up to 40 reference packs.');
    const list=await sources(env,owner,data.referenceSourceIds),labels=referenceLabels(data.referenceRoles);
    const refs=list.map((a,i)=>({id:a.id,name:a.filename,role:labels[i]?.role||'none',note:labels[i]?.note||''}));
    const id=crypto.randomUUID();await run(env,'INSERT INTO packs(id,owner_id,name,refs,created_at) VALUES(?,?,?,?,?)',id,owner,name,JSON.stringify(refs),now());
    return json({id,name,refs},201);
  }
  if(path.startsWith('/api/packs/')&&method==='DELETE'){
    const id=uid(path.split('/')[3]),pack=await first(env,'SELECT refs FROM packs WHERE id=? AND owner_id=?',id,owner);
    if(!pack)fail(404,'Pack not found.');await run(env,'DELETE FROM packs WHERE id=? AND owner_id=?',id,owner);
    for(const a of JSON.parse(pack.refs))await pruneSource(env,owner,a.id);return json({ok:true});
  }
  if(path==='/api/uploads'&&method==='POST') {
    const mime=request.headers.get('content-type')?.split(';')[0];if(!['image/jpeg','image/png','image/webp'].includes(mime))fail(415,'Choose a JPG, PNG or WebP image.');
    const bytes=await limitedBody(request,MAX_IMAGE);if(!bytes.length||!sniff(bytes,mime))fail(400,'File contents do not match a supported image.');
    const usage=await first(env,'SELECT COALESCE(SUM(bytes),0) AS n,COUNT(*) AS count FROM assets WHERE owner_id=?',owner);
    if(usage.n+bytes.length>MAX_STORAGE||usage.count>=1000)fail(413,'Private archive limit reached. Delete old records first.');
    const id=crypto.randomUUID(),key=`${owner}/sources/${id}`;let filename='source.'+(mime==='image/jpeg'?'jpg':mime.split('/')[1]);
    try{filename=decodeURIComponent(request.headers.get('x-filename')||filename).replace(/[\r\n\x00-\x1f]/g,'').slice(0,180);}catch{}
    await env.LAB_MEDIA.put(key,bytes,{httpMetadata:{contentType:mime}});
    try{await run(env,"INSERT INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,'source',?,?,?,?)",id,owner,key,mime,filename,bytes.length,now());}catch(e){await env.LAB_MEDIA.delete(key);throw e;}
    return json({id,filename,bytes:bytes.length},201);
  }
  if(path.startsWith('/api/assets/')&&method==='GET') {
    const a=await first(env,'SELECT * FROM assets WHERE id=? AND owner_id=?',uid(path.split('/')[3]),owner);if(!a)fail(404,'File not found.');return media(request,env,a);
  }
  if(path==='/api/drafts'&&method==='POST') {
    const data=await body(request),p=parameters(data.settings),id=crypto.randomUUID();
    const {primary}=await prepareInput(env,owner,data,p,null);
    if((await first(env,'SELECT COUNT(*) AS n FROM jobs WHERE owner_id=?',owner)).n>=500)fail(409,'History limit reached. Delete old records first.');
    await run(env,"INSERT INTO jobs(id,owner_id,source_id,params,state,created_at,updated_at) VALUES(?,?,?,?,'draft',?,?)",id,owner,primary?.id||null,JSON.stringify(p),now(),now());
    return json({job:jobView(await first(env,'SELECT * FROM jobs WHERE id=?',id))},201);
  }
  if(path==='/api/quotes'&&method==='POST') {
    const {key}=await requireConfigured(env,owner),data=await body(request),p=parameters(data.settings);
    if(p.mode!=='upscale'&&!p.prompt)fail(400,'Add a prompt before generating.');
    const {primary,input}=await prepareInput(env,owner,data,p,url);
    if(p.type==='image'){
      const originals=p.mode==='upscale'?[primary.id]:p.referenceSourceIds;
      if(originals.length){
        const ids=data.transferSourceIds??originals;
        if(!Array.isArray(ids)||ids.length!==originals.length||new Set(ids).size!==ids.length)fail(400,'Working copies must match the original images in order.');
        const transfers=await sources(env,owner,ids);
        const originalsData=await sources(env,owner,originals);
        p.transferSourceIds=transfers.map(a=>a.id);
        p.transferNotes=transfers.map((a,i)=>a.id===originals[i]?'':originalsData[i].filename+': original '+(originalsData[i].bytes/1048576).toFixed(2)+' MiB; provider working copy '+(a.bytes/1048576).toFixed(2)+' MiB.').filter(Boolean);
        const uris=await stageImageReferences(env,owner,p.transferSourceIds,key);
        if(p.mode==='upscale')input.image_url=uris[0];else input.image_urls=uris;
      }
    }
    const payload={model:p.model,input},q=await vendorRequest('/jobs/quote',key,payload);
    const estimate=micros(q.estimatedCost),maximum=micros(q.maxCharge),expiry=Date.parse(q.expiresAt);
    if(q.currency!=='USD'||typeof q.quoteId!=='string'||!q.quoteId||maximum<estimate||!Number.isFinite(expiry)||expiry<=now())fail(502,'Provider did not return a usable, bounded quote. Nothing submitted.');
    const id=crypto.randomUUID(),expires=Math.min(expiry,now()+290000);
    await run(env,'INSERT INTO quotes(id,owner_id,source_id,params,estimate_microusd,expires_at,vendor_quote_id,expected_cost,payload) VALUES(?,?,?,?,?,?,?,?,?)',id,owner,primary?.id||null,JSON.stringify(p),maximum,expires,q.quoteId,String(q.estimatedCost),JSON.stringify(payload));
    return json({id,estimatedUsd:estimate/1000000,maxUsd:maximum/1000000,expiresAt:expires,settings:p,provider:'SpicyAPI',notice:'This quote is bound to your exact input. Generation starts only when you confirm. Provider terms apply; a result you dislike is still a paid generation.'});
  }
  if(path==='/api/jobs'&&method==='POST') {
    const data=await body(request);if(data.confirm!==true)fail(400,'Confirm the estimated charge.');
    const quoteId=uid(data.quoteId);
    let old=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',quoteId,owner);if(old)return json({job:jobView(old)});
    const {c,key}=await requireConfigured(env,owner),q=await first(env,'SELECT * FROM quotes WHERE id=? AND owner_id=? AND expires_at>?',quoteId,owner,now());
    if(!q)fail(409,'Quote expired. Review the cost again.');
    const savedPayload=JSON.parse(q.payload);
    if(savedPayload.model===STILL_EDIT&&(!Array.isArray(savedPayload.input?.image_urls)||!savedPayload.input.image_urls.length||savedPayload.input.image_urls.some(uri=>!FILE_URI.test(uri))))
      fail(409,'This image quote uses the old reference transfer. Review a fresh price to verify your images before generating. Nothing was submitted.');
    if(savedPayload.model===UPSCALER&&!FILE_URI.test(savedPayload.input?.image_url||''))fail(409,'Review a fresh upscale quote to verify the input file. Nothing was submitted.');
    for(const assetId of linkedSourceIds(q))await source(env,owner,assetId);
    const id=crypto.randomUUID(),t=now(),day=Math.floor(t/86400000)*86400000;
    try {
      const kind=JSON.parse(q.params).type==='image'?'image':'video';
      // Reserve both a per-kind slot and spending atomically. Concurrent tabs cannot overbook.
      // An uncertain charge still stops ALL new submissions until explicitly resolved.
      const inserted=await run(env,"INSERT INTO jobs(id,owner_id,source_id,quote_id,params,state,estimate_microusd,created_at,updated_at) SELECT ?,?,?,?,?,'submitting',?,?,? WHERE NOT EXISTS(SELECT 1 FROM jobs WHERE owner_id=? AND state='uncertain') AND (SELECT COUNT(*) FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','saving','uncertain') AND CASE WHEN json_extract(params,'$.type')='image' THEN 'image' ELSE 'video' END=?)<? AND (SELECT COALESCE(SUM(estimate_microusd),0) FROM spend WHERE owner_id=? AND created_at>=?)+?<=?",id,owner,q.source_id,q.id,q.params,q.estimate_microusd,t,t,owner,owner,kind,CONCURRENCY[kind],owner,day,q.estimate_microusd,c.daily_limit_microusd);
      if(!inserted.meta.changes)fail(409,'No generation submitted: the '+kind+' limit ('+CONCURRENCY[kind]+' active), an uncertain request, or your daily spending limit blocks this request.');
    }catch(e){old=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',quoteId,owner);if(old)return json({job:jobView(old)});throw e;}
    // Reuse the exact input URL and settings covered by the quote, never silently reprice.
    const payload={...JSON.parse(q.payload),quoteId:q.vendor_quote_id,expectedCost:q.expected_cost};
    try {
      const result=await vendorRequest('/jobs/createTask',key,payload,id);
      if(typeof result.taskId!=='string'||!result.taskId||result.taskId.length>200)throw new Error('Missing provider task ID.');
      await run(env,"UPDATE jobs SET provider_id=?,state='queued',updated_at=? WHERE id=?",result.taskId,now(),id);
    }catch(e){await run(env,'UPDATE jobs SET state=?,error=?,updated_at=? WHERE id=?',e.definite?'failed':'uncertain',e.definite?e.message:'Submission status is uncertain. Do not resubmit: first check the provider console to avoid a duplicate charge.',now(),id);}
    return json({job:jobView(await first(env,'SELECT * FROM jobs WHERE id=?',id))},202);
  }
  if(path==='/api/jobs'&&method==='GET') {
    const before=Number(url.searchParams.get('before')||now()+1),afterId=url.searchParams.get('afterId')||'~';
    if(!Number.isSafeInteger(before)||before<0||afterId.length>40)fail(400,'Invalid history cursor.');
    const list=await rows(env,'SELECT * FROM jobs WHERE owner_id=? AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT 21',owner,before,before,afterId);
    const more=list.length>20;if(more)list.pop();const last=list.at(-1);
    const active=await rows(env,"SELECT * FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','saving','uncertain') ORDER BY created_at,id",owner);
    const activeJobs=active.map(jobView);
    // Keep the previous field for old cached clients; new clients track every active job.
    return json({jobs:list.map(jobView),active:activeJobs[0]||null,activeJobs,concurrency:CONCURRENCY,next:more?{before:last.created_at,afterId:last.id}:null});
  }
  if(path.startsWith('/api/jobs/')) {
    const id=uid(path.split('/')[3]);let j=await first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',id,owner);if(!j)fail(404,'Job not found.');
    if(path.endsWith('/resolve')&&method==='POST') {
      const data=await body(request);if(j.state!=='uncertain'||data.confirm!==true)fail(409,'Confirm you checked the provider dashboard first.');
      await run(env,"UPDATE jobs SET state='resolved',updated_at=?,error=? WHERE id=?",now(),'Owner resolved the interrupted request. No generation was resubmitted.',id);return json({ok:true});
    }
    if(method==='GET') {await refreshJob(env,j);return json({job:jobView(await first(env,'SELECT * FROM jobs WHERE id=?',id))});}
    if(method==='DELETE') {
      if(ACTIVE.has(j.state))fail(409,'Active or uncertain jobs cannot be deleted.');
      const linked=linkedSourceIds(j);
      await run(env,'DELETE FROM jobs WHERE id=? AND owner_id=?',id,owner);
      if(j.quote_id)await run(env,'DELETE FROM quotes WHERE id=?',j.quote_id);
      if(j.output_id){const a=await first(env,'SELECT * FROM assets WHERE id=? AND owner_id=?',j.output_id,owner);if(a){if(a.kind==='source')await pruneSource(env,owner,a.id);else{await env.LAB_MEDIA.delete(a.object_key);await run(env,'DELETE FROM assets WHERE id=?',a.id);}}}
      for(const sourceId of linked)await pruneSource(env,owner,sourceId);
      return json({ok:true});
    }
  }
  fail(404,'Not found.');
}
async function maintenance(env) {
  await backfillFailureDetails(env);
  await run(env,"UPDATE jobs SET state='uncertain',error='Submission was interrupted. Check the provider dashboard before retrying.',updated_at=? WHERE state='submitting' AND updated_at<?",now(),now()-120000);
  const pending=await rows(env,"SELECT * FROM jobs WHERE state IN ('queued','running','saving') ORDER BY last_poll LIMIT 5");
  for(const j of pending){const owner=await env.OWNER_DB.prepare("SELECT id FROM users WHERE id=? AND role='owner' AND auth_provider='clerk'").bind(j.owner_id).first();if(owner)await refreshJob(env,j);}
  await run(env,'DELETE FROM quotes WHERE expires_at<? AND NOT EXISTS(SELECT 1 FROM jobs WHERE jobs.quote_id=quotes.id)',now());
  const unused=await rows(env,"SELECT * FROM assets WHERE kind='source' AND created_at<? ORDER BY created_at LIMIT 30",now()-86400000);
  for(const a of unused)await pruneSource(env,a.owner_id,a.id);
}
export default {
  async fetch(request,env,ctx) {
    let response;try{response=await route(request,env,ctx);}catch(e){response=json({error:e instanceof HttpError?e.message:'The Lab could not finish this request. Your stored work is unchanged.'},e instanceof HttpError?e.status:500);}
    return decorate(response,request.headers.get('origin')||'');
  },
  async scheduled(event,env,ctx) {ctx.waitUntil(maintenance(env));}
};
