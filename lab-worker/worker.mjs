/* Parallel Vision Lab. Private owner-only workspace, no public media bucket.
   The hosted provider is opt-in; no provider key or moderation bypass in source. */
export const VERSION = 'pv-lab-2026-09-26.3';
const ORIGINS = new Set(['https://parallelvisionlabel.com','https://www.parallelvisionlabel.com']);
const ISSUER = 'https://clerk.parallelvisionlabel.com';
const VENDOR = 'https://api.spicyapi.ai/api/v1';
const MODEL_IMAGE = 'alibaba/wan-3.0/image-to-video';
const MODEL_REFERENCE = 'alibaba/wan-3.0/reference-to-video';
const DOC = 'https://spicyapi.ai/models/wan-3-0';
const RESOLUTIONS = new Set(['480p','720p','1080p']);
// No hard-coded provider price. A live, bound quote is required before each paid request.
function micros(value) {
  const text=String(value); if(!/^\d{1,6}(\.\d{1,6})?$/.test(text))fail(502,'Provider returned an invalid USD amount.');
  const [whole,fraction='']=text.split('.');return Number(whole)*1000000+Number(fraction.padEnd(6,'0'));
}
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ACTIVE = new Set(['submitting','queued','running','saving','uncertain']);
const MAX_IMAGE = 10 * 1024 * 1024, MAX_VIDEO = 150 * 1024 * 1024, MAX_STORAGE = 2 * 1024 * 1024 * 1024;
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
function publicConfig(c) {return {configured:!!c,enabled:!!(c?.enabled&&c?.terms_confirmed),dailyLimitUsd:(c?.daily_limit_microusd||10000000)/1000000,provider:'SpicyAPI',model:'Wan 3.0',documentation:DOC,pricingNote:'A live provider quote is required before every generation. No subscription is added by this Lab. Provider terms apply.'};}
async function vendorRequest(path,key,data,idempotency) {
  let r;
  try {
    r=await fetch(VENDOR+path,{method:data?'POST':'GET',headers:{Authorization:'Bearer '+key,'Accept':'application/json',...(data?{'Content-Type':'application/json'}:{}),...(idempotency?{'Idempotency-Key':idempotency}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(20000),redirect:'follow'});
  } catch {
    const e=new HttpError(502,'The Lab backend could not reach SpicyAPI. Your key was not stored and nothing was charged. Try again in a moment.');e.definite=true;throw e;
  }
  const raw=await r.text();let result=null;
  try{result=raw?JSON.parse(raw):null;}catch{}
  if(!r.ok || !result || Number(result.code)!==200){
    const code=Number(result?.code), definite=(r.status>=400&&r.status<500&&r.status!==408)||[400,401,403,40201,40202,40301,40302,40303,40901,422].includes(code);
    let message;
    if(code===40901)message='Provider quote expired or changed. Review a new price before generating.';
    else if([40201,40202].includes(code))message='Provider balance or API spending limit is insufficient. Check the provider console.';
    else if(code===40301)message='This API key is not allowed to use Wan 3.0. Add alibaba/wan-3.0/image-to-video to the key allowlist.';
    else if(code===40302)message='SpicyAPI rejected this server address. Set the API key IP allowlist to Any address.';
    else if(code===40303)message='SpicyAPI is not available from this backend region.';
    else if(code===401||r.status===401)message='SpicyAPI rejected this API key. Use the key beginning sk-spicy- and make sure it has not expired or been revoked.';
    else if(code===403||r.status===403)message='SpicyAPI refused the API request. Check email verification, key restrictions and provider account status.';
    else if(!result)message='SpicyAPI returned an unexpected response (HTTP '+r.status+'). Nothing was charged.';
    else message=typeof result.msg==='string'&&result.msg?('SpicyAPI: '+result.msg):'Provider rejected the request. Check its console for details.';
    const e=new HttpError(definite?422:502,message);e.definite=definite;throw e;
  }
  return result.data;
}
async function requireConfigured(env,owner) {
  const c=await config(env,owner);if(!c?.enabled||!c.terms_confirmed)fail(409,'Rendering is not enabled. A compatible provider and your API key are still required.');
  return {c,key:await decryptKey(env,c.encrypted_key)};
}
function parameters(value) {
  if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'Invalid settings.');
  const prompt=typeof value.prompt==='string'?value.prompt.trim():'';
  if(prompt.length>6000)fail(400,'Use no more than 6,000 prompt characters.');
  const duration=Number(value.duration),resolution=value.resolution;
  if(!Number.isInteger(duration)||duration<2||duration>30||!RESOLUTIONS.has(resolution))fail(400,'Choose 2 to 30 seconds and 480p, 720p or 1080p.');
  const ratio=value.aspectRatio||'auto';if(!['auto','16:9','9:16','1:1','4:3','3:4'].includes(ratio))fail(400,'Invalid aspect ratio.');
  const seed=value.seed==null||value.seed===''?null:Number(value.seed);
  if(seed!==null&&(!Number.isInteger(seed)||seed<0||seed>2147483647))fail(400,'Seed must be a whole number from 0 to 2147483647.');
  const mode=value.mode==='reference'?'reference':'start';
  return {model:mode==='reference'?MODEL_REFERENCE:MODEL_IMAGE,mode,prompt,duration,resolution,aspectRatio:ratio,seed,audio:value.audio!==false};
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
  try{const p=JSON.parse(row?.params||'{}');if(UUID.test(p.lastSourceId||''))ids.add(p.lastSourceId);if(Array.isArray(p.referenceSourceIds))for(const id of p.referenceSourceIds)if(UUID.test(id||''))ids.add(id);}catch{}
  return [...ids];
}
async function sourceReferenced(env,owner,id) {
  const jobs=await rows(env,'SELECT source_id,params FROM jobs WHERE owner_id=?',owner);for(const row of jobs)if(linkedSourceIds(row).includes(id))return true;
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
  for(let i=0;i<4;i++) {r=await fetch(target,{redirect:'manual',signal:AbortSignal.timeout(20000)});if(r.status>=300&&r.status<400){const next=r.headers.get('location');if(!next)throw new Error('No output location.');target=safeVideoUrl(new URL(next,target).href);continue;}break;}
  if(!r?.ok||!r.body)throw new Error('Output download unavailable.');
  const declared=Number(r.headers.get('content-length'));
  if(declared>MAX_VIDEO)throw new Error('Output exceeds the archive limit.');
  const type=r.headers.get('content-type')||'';if(!type.startsWith('video/')&&!type.startsWith('application/octet-stream'))throw new Error('Unexpected output format.');
  const stored=await first(env,'SELECT COALESCE(SUM(bytes),0) AS n FROM assets WHERE owner_id=?',j.owner_id);
  if(stored.n+(declared||MAX_VIDEO)>MAX_STORAGE)throw new Error('Private archive storage limit reached.');
  let bytes=0;
  const stream=r.body.pipeThrough(new TransformStream({transform(chunk,controller){bytes+=chunk.byteLength;if(bytes>MAX_VIDEO)throw new Error('Output exceeds archive limit.');controller.enqueue(chunk);}}));
  const objectKey=`${j.owner_id}/results/${j.id}.mp4`;
  await env.LAB_MEDIA.put(objectKey,stream,{httpMetadata:{contentType:'video/mp4'}});
  await env.LAB_DB.batch([
    stmt(env,"INSERT OR IGNORE INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,'video','video/mp4',?,?,?)",j.id,j.owner_id,objectKey,'parallel-vision-'+j.id+'.mp4',bytes,now()),
    stmt(env,"UPDATE jobs SET state='completed',output_id=?,remote_url=NULL,error='',updated_at=? WHERE id=?",j.id,now(),j.id)
  ]);
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
      const output=result.output?.assets?.find(a=>a.mime?.startsWith('video/'))?.url;
      if(typeof output!=='string')throw new Error('No video output.');
      const safe=safeVideoUrl(output);
      await run(env,"UPDATE jobs SET state='saving',remote_url=?,updated_at=? WHERE id=?",safe,now(),j.id);
      await copyResult(env,j,safe);
    }else if(['failed','cancelled','canceled','expired'].includes(result.state)){
      await run(env,"UPDATE jobs SET state='failed',error=?,updated_at=? WHERE id=?",'The provider ended this job without a downloadable result. Check its dashboard for billing details.',now(),j.id);
    }else{
      await run(env,"UPDATE jobs SET state=?,updated_at=?,error='' WHERE id=?",result.state==='running'?'running':'queued',now(),j.id);
    }
  }catch{
    await run(env,'UPDATE jobs SET error=? WHERE id=?','Status or archive retrieval is temporarily unavailable. No new generation was submitted.',j.id);
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
    const data=await body(request),p=parameters(data.settings),id=crypto.randomUUID();let primary;
    if(p.mode==='reference') {
      const refs=await sources(env,owner,data.referenceSourceIds);primary=refs[0];p.referenceSourceIds=refs.map(a=>a.id);p.lastSourceId=null;
    } else {
      primary=await source(env,owner,data.sourceId);p.referenceSourceIds=[];p.lastSourceId=data.lastSourceId?(await source(env,owner,data.lastSourceId)).id:null;
    }
    if((await first(env,'SELECT COUNT(*) AS n FROM jobs WHERE owner_id=?',owner)).n>=500)fail(409,'History limit reached. Delete old records first.');
    await run(env,"INSERT INTO jobs(id,owner_id,source_id,params,state,created_at,updated_at) VALUES(?,?,?,?,'draft',?,?)",id,owner,primary.id,JSON.stringify(p),now(),now());
    return json({job:jobView(await first(env,'SELECT * FROM jobs WHERE id=?',id))},201);
  }
  if(path==='/api/quotes'&&method==='POST') {
    const {key}=await requireConfigured(env,owner),data=await body(request),p=parameters(data.settings);let primary,input;
    if(p.mode==='reference') {
      const refs=await sources(env,owner,data.referenceSourceIds);primary=refs[0];p.referenceSourceIds=refs.map(a=>a.id);p.lastSourceId=null;
      input={reference_image_urls:await Promise.all(refs.map(a=>signedInput(env,url,a.id))),resolution:p.resolution,duration_seconds:p.duration,generate_audio:p.audio,enable_prompt_expansion:false,aspect_ratio:p.aspectRatio==='auto'?'adaptive':p.aspectRatio};
    } else {
      primary=await source(env,owner,data.sourceId);const last=data.lastSourceId?await source(env,owner,data.lastSourceId):null;p.referenceSourceIds=[];p.lastSourceId=last?.id||null;
      input={image_url:await signedInput(env,url,primary.id),resolution:p.resolution,duration_seconds:p.duration,generate_audio:p.audio,enable_prompt_expansion:false};
      if(last)input.last_image_url=await signedInput(env,url,last.id);if(p.aspectRatio!=='auto')input.aspect_ratio=p.aspectRatio;
    }
    if(p.prompt)input.prompt=p.prompt;if(p.seed!==null)input.seed=p.seed;
    const payload={model:p.model,input},q=await vendorRequest('/jobs/quote',key,payload);
    const estimate=micros(q.estimatedCost),maximum=micros(q.maxCharge),expiry=Date.parse(q.expiresAt);
    if(q.currency!=='USD'||typeof q.quoteId!=='string'||!q.quoteId||maximum<estimate||!Number.isFinite(expiry)||expiry<=now())fail(502,'Provider did not return a usable, bounded quote. Nothing submitted.');
    const id=crypto.randomUUID(),expires=Math.min(expiry,now()+290000);
    await run(env,'INSERT INTO quotes(id,owner_id,source_id,params,estimate_microusd,expires_at,vendor_quote_id,expected_cost,payload) VALUES(?,?,?,?,?,?,?,?,?)',id,owner,primary.id,JSON.stringify(p),maximum,expires,q.quoteId,String(q.estimatedCost),JSON.stringify(payload));
    return json({id,estimatedUsd:estimate/1000000,maxUsd:maximum/1000000,expiresAt:expires,settings:p,provider:'SpicyAPI',notice:'This quote is bound to your exact input. Generation starts only when you confirm. Provider terms apply; a result you dislike is still a paid generation.'});
  }
  if(path==='/api/jobs'&&method==='POST') {
    const data=await body(request);if(data.confirm!==true)fail(400,'Confirm the estimated charge.');
    const quoteId=uid(data.quoteId);
    let old=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',quoteId,owner);if(old)return json({job:jobView(old)});
    const {c,key}=await requireConfigured(env,owner),q=await first(env,'SELECT * FROM quotes WHERE id=? AND owner_id=? AND expires_at>?',quoteId,owner,now());
    if(!q)fail(409,'Quote expired. Review the cost again.');
    await source(env,owner,q.source_id);
    const id=crypto.randomUUID(),t=now(),day=Math.floor(t/86400000)*86400000;
    try {
      const inserted=await run(env,"INSERT INTO jobs(id,owner_id,source_id,quote_id,params,state,estimate_microusd,created_at,updated_at) SELECT ?,?,?,?,?,'submitting',?,?,? WHERE NOT EXISTS(SELECT 1 FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','saving','uncertain')) AND (SELECT COALESCE(SUM(estimate_microusd),0) FROM spend WHERE owner_id=? AND created_at>=?)+?<=?",id,owner,q.source_id,q.id,q.params,q.estimate_microusd,t,t,owner,owner,day,q.estimate_microusd,c.daily_limit_microusd);
      if(!inserted.meta.changes)fail(409,'An active job or your daily estimated spending limit blocks another generation.');
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
    const active=await first(env,"SELECT * FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','saving','uncertain') LIMIT 1",owner);
    return json({jobs:list.map(jobView),active:active?jobView(active):null,next:more?{before:last.created_at,afterId:last.id}:null});
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
      if(j.output_id){const a=await first(env,'SELECT * FROM assets WHERE id=? AND owner_id=?',j.output_id,owner);if(a){await env.LAB_MEDIA.delete(a.object_key);await run(env,'DELETE FROM assets WHERE id=?',a.id);}}
      for(const sourceId of linked)await pruneSource(env,owner,sourceId);
      return json({ok:true});
    }
  }
  fail(404,'Not found.');
}
async function maintenance(env) {
  await run(env,"UPDATE jobs SET state='uncertain',error='Submission was interrupted. Check the provider dashboard before retrying.',updated_at=? WHERE state='submitting' AND updated_at<?",now(),now()-120000);
  const pending=await rows(env,"SELECT * FROM jobs WHERE state IN ('queued','running','saving') ORDER BY last_poll LIMIT 3");
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
