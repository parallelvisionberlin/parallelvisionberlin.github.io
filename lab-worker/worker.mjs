import {quoteVideoExtension,submitVideoExtension} from './higgsfield-video.mjs';
import {ensureCustomer,isLabCustomer,customerSession,customerRoute,stripeWebhook} from './customer-billing.mjs';
import {fashionRoute,refreshFashionJob} from './fashion-tools.mjs';
import {IMAGE_PRICES,IMAGE_RATIOS,imageModelParameters,buildImageModelInput,requestFlash} from './image-models.mjs';
import {ensureGalleryDimensions} from './gallery-dimensions.mjs';
import {libraryRoute,libraryJobs} from './asset-library.mjs';
import {higgsfieldRoute,refreshHiggsfield,SOUL2_PRICES,soul2Parameters} from './higgsfield.mjs';
import {publicSoulPresets} from './soul-presets.mjs';
import {reinterpretParameters,buildReinterpretInput} from './soul-reinterpret.mjs';
/* Parallel Vision Lab. Private owner-only workspace, no public media bucket.
   The hosted provider is opt-in; no provider key or moderation bypass in source. */
import {seedanceParameters, prepareSeedance, REFERENCE_MIME, sniffReference} from './seedance.mjs';
import {FAL_CONTROLLED_POSE,FAL_CONTROLLED_INPAINT,FAL_DWPOSE,controlledPoseParameters,controlledRepairParameters,controlledPoseRefs,controlledRepairRefs,controlledPoseEstimateMicros,controlledRepairEstimateMicros,buildControlledPoseInput,buildRepairInput,falSubmit,falStatus,falResult,falAwait} from './fal-controlled-pose.mjs';
import {falVideoParameters,falVideoEstimateMicros,buildFalVideoInput} from './fal-video.mjs';
import {falUpscaleParameters,storedImageDimensions,setFalUpscaleDimensions,falUpscaleEstimateMicros,buildFalUpscaleInput} from './fal-upscale.mjs';
import {SOUL_PRO_MODELS,soulProParameters,soulProEstimateMicros,buildSoulProInput} from './soul-pro.mjs';
import {findFalRequest} from './fal-recovery.mjs';
import {falUploadImage} from './fal-storage.mjs';
import {REFERENCE_ROLES,normalizeReferenceLabel,supportsReferenceGuidance,compileImagePrompt,canUseReferenceGuidance,referenceGuidanceError} from '../lab/reference-guidance.js';
import {characterPreview as soulCharacterPreview,SOUL_TEXT_MODEL,readyReinterpretCharacter,listCharacters as listSoulCharacters,createDataset as createSoulDataset,createCharacter as createSoulCharacter,deleteCharacter as deleteSoulCharacter,resolveCharacter as resolveSoulCharacter,retryCharacter as retrySoulCharacter,publicDataset as publicSoulDataset,publicWeight as publicSoulWeight,readyCharacter as readySoulCharacter,weightUrl as soulWeightUrl,maintenance as soulMaintenance} from './soul.mjs';
export const VERSION = 'pv-lab-2026-10-10.3-soul-live-quote';
// Production redeploy sync: PV Soul frontend/backend.
const UPSCALER = 'spicyapi/image-upscaler-v1/upscale';
const CONCURRENCY = Object.freeze({image:10,video:3});
const ORIGINS = new Set(['https://parallelvisionlabel.com','https://www.parallelvisionlabel.com']);
const ISSUER = 'https://clerk.parallelvisionlabel.com';
const VENDOR = 'https://api.spicyapi.ai/api/v1';
const MODEL_IMAGE = 'alibaba/wan-3.0/image-to-video';
const MODEL_REFERENCE = 'alibaba/wan-3.0/reference-to-video';
const STILL_TEXT = 'bytedance/seedream-5.0-pro/text-to-image';
const STILL_EDIT = 'bytedance/seedream-5.0-pro/edit';
const GEMINI_MODEL = 'gemini-3-pro-image';
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_RATIOS = ['auto','1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9'];
const RATIOS = ['auto','1:1','4:3','3:4','16:9','9:16','3:2','2:3','4:5','5:4','21:9','9:21','2:1','1:2','3:1','1:3'];
const MODEL = MODEL_IMAGE; // Stable encryption context for existing stored provider keys.
const DOC = 'https://spicyapi.ai/models/wan-3-0';
const RESOLUTIONS = new Set(['480p','720p','1080p']);
const SOUL_PRO_IDENTITY_PACK='__pv_soul_pro_nina__';
// No hard-coded provider price. A live, bound quote is required before each paid request.
function micros(value) {
  const text=String(value); if(!/^\d{1,6}(\.\d{1,6})?$/.test(text))fail(502,'Provider returned an invalid USD amount.');
  const [whole,fraction='']=text.split('.');return Number(whole)*1000000+Number(fraction.padEnd(6,'0'));
}
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ACTIVE = new Set(['submitting','queued','running','saving','uncertain']);
const MAX_IMAGE = 20 * 1024 * 1024, MAX_VIDEO = 150 * 1024 * 1024, MAX_STORAGE = 20 * 1024 * 1024 * 1024;
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
const hfDeps = () => ({fail,now,body,first,run,rows,config,source,sources,signedInput,jobView,copyResult,safeVideoUrl,storedImageDimensions});
const soulDeps = () => ({fail,now,body,limitedBody,first,run,rows,uid,derived,base,unbase});
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
  if(owner)return owner.id;
  // Existing private Lab remains owner-only until public registration is explicitly enabled.
  if(env.LAB_CUSTOMER_SIGNUPS_ENABLED!=='true')fail(403,'PV Lab registration is not enabled.');
  // Verified Clerk users have new Lab records, never Nina user records.
  return ensureCustomer(env,p.sub);
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
async function config(env,owner) {
  const original=await first(env,'SELECT * FROM settings WHERE owner_id=?',owner);
  if(original)return original;
  if(env.LAB_PUBLIC_GENERATION_ENABLED!=='true'||!env.LAB_CUSTOMER_SPICY_API_KEY||!await isLabCustomer(env,owner))return null;
  return {owner_id:owner,encrypted_key:await encryptKey(env,env.LAB_CUSTOMER_SPICY_API_KEY),enabled:1,terms_confirmed:1,daily_limit_microusd:10000000};
}
function publicConfig(c,falEnabled=false) {return {concurrency:CONCURRENCY,configured:!!c,enabled:!!(c?.enabled&&c?.terms_confirmed),dailyLimitUsd:(c?.daily_limit_microusd||10000000)/1000000,provider:'SpicyAPI',videoEngines:['wan','wanprime','h3','h3max','h3spicy','seedance',...(falEnabled?['h3maxfal','omni']:[])],model:'Wan 3.0 / Wan Prime / MiniMax H3 / H3 Max / H3 Spicy / H3 Max Reference FAL / Gemini Omni Flash 1.1 / Seedance 2.5 / Seedream 5.0 Pro / Image Upscaler',documentation:DOC,pricingNote:'SpicyAPI videos use a live bound quote. fal.ai video routes use the current published per-second estimate shown before confirmation. Provider billing remains authoritative.'};}
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
    else if(code===40201)message='SpicyAPI [40201]: insufficient available provider balance for this request. Check Billing, including funds held for pending jobs. '+cleanProviderDetail(result?.msg)+' This is separate from your Lab daily budget. No new generation was submitted.';
    else if(code===40202)message='SpicyAPI [40202]: a provider spending limit was reached. '+cleanProviderDetail(result?.msg)+' Check the named limit in API Keys or Team; a platform limit can only reset. This is separate from your Lab daily budget. No new generation was submitted.';
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
function referenceLabels(value,max=10) {
  if(value==null)return [];
  if(!Array.isArray(value)||value.length>max)fail(400,'Use up to '+max+' reference labels.');
  return value.map(x=>{
    if(x?.role&&!REFERENCE_ROLES.some(([role])=>role===x.role))fail(400,'Unknown reference role. Reload the Lab and choose a supported role.');
    return normalizeReferenceLabel(x);
  });
}
function parameters(value) {
  if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'Invalid settings.');
  if(value.type==='image'&&value.mode==='upscale'){
    const upscaleEngine=value.upscaleEngine??'spicy';
    if(upscaleEngine!=='spicy')return falUpscaleParameters(value,{fail});
    if(!['2k','4k','8k'].includes(value.resolution)||!['jpeg','png','webp'].includes(value.outputFormat||'jpeg'))fail(400,'Choose 2K, 4K or 8K and JPEG, PNG or WebP.');
    return {type:'image',provider:'spicy',upscaleEngine:'spicy',model:UPSCALER,mode:'upscale',prompt:'',resolution:value.resolution,aspectRatio:'auto',outputFormat:value.outputFormat||'jpeg',referenceRoles:[]};
  }
  if(value.type!=='image'&&['h3maxfal','omni'].includes(value.engine))return falVideoParameters(value,{fail,referenceLabels});
  if(value.type!=='image'&&value.engine==='seedance')return seedanceParameters(value,{fail,referenceLabels});
  if(value.engine&&!['wan','wanprime','h3','h3max','h3spicy'].includes(value.engine)&&value.type!=='image')fail(400,'Unknown video model.');
  const prompt=typeof value.prompt==='string'?value.prompt.trim():'';
  const referenceMode=value.referenceMode==='references'?'references':'base';
  const referenceRoles=referenceLabels(value.referenceRoles,value.type==='image'&&value.engine==='flash'?14:10);
  if(value.type==='image'&&['seedream','gemini','flash','kling'].includes(value.engine)&&referenceMode==='references'){
    for(const r of referenceRoles)if(r.role==='base')r.role='none';
    if(!value.aspectRatio||value.aspectRatio==='auto')value={...value,aspectRatio:'16:9'};
  }
  if(value.type==='image'&&['flash','kling'].includes(value.engine))return imageModelParameters({...value,referenceMode},{fail,referenceRoles});
  if(value.type==='image'&&value.engine==='soulpro'&&value.soulProModel==='soul2')return soul2Parameters(value,fail);
  if(value.type==='image'&&value.engine==='soulpro')return soulProParameters({...value,referenceRoles},{fail,referenceLabels});
  if(value.type==='image'&&value.engine==='fal')return value.mode==='controlled-repair'?controlledRepairParameters({...value,referenceRoles},{fail}):controlledPoseParameters({...value,referenceRoles},{fail});
  if(value.type==='image'&&value.engine==='soul'){
    if(value.mode==='reinterpret')return reinterpretParameters(value,{fail});
    if(prompt.length<1||prompt.length>4700)fail(400,'PV Soul prompts must be 1 to 4,700 characters.');
    if(referenceRoles.length)fail(400,'PV Soul v0.1 uses the trained identity in text-to-image mode. Reference-conditioned identity generation is disabled until a matching edit-model trainer is verified.');
    const strength=Number(value.identityStrength),ratio=value.aspectRatio||'1:1';
    const soulRatios=['1:1','16:9','9:16','4:3','3:4','3:2','2:3','21:9','9:21'];
    if(!UUID.test(value.characterId||''))fail(400,'Choose a trained PV Soul character.');
    if(!Number.isFinite(strength)||strength<0.25||strength>1.75)fail(400,'Identity strength must be between 0.25 and 1.75.');
    if(!soulRatios.includes(ratio)||!['png','jpeg'].includes(value.outputFormat||'jpeg'))fail(400,'Choose a supported PV Soul aspect ratio and PNG or JPEG.');
    return {type:'image',provider:'spicy',engine:'soul',model:SOUL_TEXT_MODEL,mode:'image',prompt,characterId:value.characterId,identityStrength:strength,resolution:'native',aspectRatio:ratio,outputFormat:value.outputFormat||'jpeg',referenceRoles};
  }
  if(value.type==='image'&&value.engine==='gemini'){
    const processing=value.processing==='batch'?'batch':'normal',ratio=value.aspectRatio||'auto';
    if(prompt.length>5000||!['1k','2k','4k'].includes(value.resolution)||!GEMINI_RATIOS.includes(ratio))fail(400,'Nano Banana Pro supports 1K, 2K or 4K and the listed image ratios. Maximum prompt length is 5,000.');
    return {type:'image',provider:'gemini',engine:'gemini',processing,referenceMode,model:GEMINI_MODEL,mode:'image',prompt,resolution:value.resolution,aspectRatio:ratio,outputFormat:'auto',referenceRoles};
  }
  if(value.type==='image'){
    if(prompt.length>5000||!['1k','2k'].includes(value.resolution)||!RATIOS.includes(value.aspectRatio||'1:1'))fail(400,'Choose 1K or 2K and a supported image ratio. Maximum prompt length is 5,000.');
    if(!['png','jpeg'].includes(value.outputFormat||'jpeg'))fail(400,'Choose PNG or JPEG.');
    return {type:'image',provider:'spicy',engine:'seedream',referenceMode,model:STILL_TEXT,mode:'image',prompt,resolution:value.resolution,aspectRatio:value.aspectRatio||'1:1',outputFormat:value.outputFormat||'jpeg',referenceRoles};
  }
  if(prompt.length>6000)fail(400,'Use no more than 6,000 prompt characters.');
  const duration=Number(value.duration),resolution=value.resolution;
  const isH3=['h3','h3max','h3spicy'].includes(value.engine);
  if(!Number.isInteger(duration)||duration<2||duration>30||(!isH3&&!RESOLUTIONS.has(resolution)))fail(400,'Choose a supported duration and resolution.');
  const mode=value.mode==='reference'?'reference':value.mode==='text'?'text':'start',ratio=value.aspectRatio||'auto';
  const videoRatios=mode==='start'?['auto','16:9','9:16','1:1','4:3','3:4','21:9']:['auto','16:9','9:16','1:1','4:3','3:4'];
  if(!videoRatios.includes(ratio))fail(400,'Invalid video aspect ratio.');
  const seed=value.seed==null||value.seed===''?null:Number(value.seed);
  if(seed!==null&&(!Number.isInteger(seed)||seed<0||seed>2147483647))fail(400,'Seed must be a whole number from 0 to 2147483647.');
  if(['h3','h3max','h3spicy'].includes(value.engine)){
    const h3=value.engine,limits=h3==='h3'?{min:4,max:15,res:['480p','768p','2k'],modes:['start','reference','text']}:
      h3==='h3max'?{min:5,max:15,res:['768p'],modes:['start','text']}:{min:3,max:15,res:['480p','540p','768p','1080p'],modes:['start']};
    const hmode=value.mode==='reference'?'reference':value.mode==='text'?'text':'start';
    if(!limits.modes.includes(hmode))fail(400,'This MiniMax H3 variant does not support that video mode.');
    if(!Number.isInteger(duration)||duration<limits.min||duration>limits.max||!limits.res.includes(resolution))fail(400,'Choose a supported MiniMax H3 duration and resolution.');
    const endpoint=h3==='h3'?('minimax/h3/'+(hmode==='reference'?'reference-to-video':hmode==='text'?'text-to-video':'image-to-video')):
      h3==='h3max'?('minimax/h3-max/'+(hmode==='text'?'text-to-video':'image-to-video')):'minimax/h3-spicy/image-to-video';
    return {type:'video',engine:h3,model:endpoint,mode:hmode,prompt,duration,resolution,aspectRatio:ratio,seed:null,audio:true,referenceRoles};
  }
  const prime=value.engine==='wanprime';
  return {type:'video',engine:prime?'wanprime':'wan',model:prime?(mode==='reference'?'alibaba/wan-3.0-prime/reference-to-video':'alibaba/wan-3.0-prime/image-to-video'):(mode==='reference'?MODEL_REFERENCE:MODEL_IMAGE),mode,prompt,duration,resolution,aspectRatio:ratio,seed,audio:value.audio!==false,referenceRoles};
}
function assembledPrompt(p) {
  if(supportsReferenceGuidance(p)){
    const count=p.referenceSourceIds?.length||0,labels=p.referenceRoles||[];
    if(labels.length&&labels.length!==count)fail(400,'Reference roles must match the selected images in order.');
    p.referenceRoles=Array.from({length:count},(_,i)=>normalizeReferenceLabel(labels[i]));
    const error=referenceGuidanceError(p.referenceRoles);if(error)fail(400,error);
    const prompt=compileImagePrompt(p.prompt,p.referenceRoles);
    if(prompt.length>5000)fail(400,'Prompt plus automatic reference instructions is too long. Shorten the direction or reference notes.');
    return prompt;
  }
  const labels=(p.referenceRoles||[]).slice(0,p.referenceSourceIds?.length||0).map((r,i)=>r.role!=='none'||r.note?'Reference '+(i+1)+(r.name?' ('+r.name+')':'')+': '+(r.role!=='none'?r.role+'. ':'')+r.note:'').filter(Boolean);
  if(p.engine==='seedance')for(let i=0;i<labels.length;i++)labels[i]=labels[i].replace(/^Reference (\d+)/,'@Image$1');
  else if(p.engine==='h3maxfal')for(let i=0;i<labels.length;i++)labels[i]=labels[i].replace(/^Reference (\d+)/,'Image $1');
  else if(p.engine==='omni')for(let i=0;i<labels.length;i++)labels[i]=labels[i].replace(/^Reference (\d+)/,(_,n)=>'<IMAGE_REF_'+(Number(n)-1)+'>');
  const mediaLabels=p.engine==='seedance'?['referenceVideos','referenceAudio'].flatMap((key,k)=>(p[key]||[]).slice(0,p[k===0?'referenceVideoIds':'referenceAudioIds']?.length||0).map((r,i)=>'@'+(k===0?'Video':'Audio')+(i+1)+(r.name?' ('+r.name+')':'')+(r.note?': '+r.note:''))):[];
  const prompt=[p.prompt,...labels,...mediaLabels].join('\n');
  if(prompt.length>(p.type==='image'||p.engine==='seedance'?5000:6000))fail(400,'Prompt plus reference notes is too long. Shorten the notes.');
  return prompt;
}
async function prepareInput(env,owner,data,p,url) {
  if(['flash','kling'].includes(p.engine)){if(url)fail(400,'Use the image model generation route.');const ids=data.referenceSourceIds||[],refs=ids.length?await sources(env,owner,ids,p.engine==='flash'?14:1):[];p.referenceSourceIds=refs.map(a=>a.id);return {primary:refs[0]||null,input:{}};}
  if(p.provider==='higgsfield'&&p.mode==='extend'){const primary=await source(env,owner,data.sourceId);if(!['video/mp4','video/quicktime'].includes(primary.mime))fail(400,'Choose a video to extend.');p.referenceVideoIds=[primary.id];return {primary,input:{}};}
  if(p.provider==='higgsfield'){if(url)fail(400,'Use the Soul 2 generation route.');const primary=await source(env,owner,data.sourceId);return {primary,input:{}};}
  if(p.mode==='upscale'&&p.provider==='fal'){
    if(data.lastSourceId||data.referenceSourceIds?.length||data.transferSourceIds?.length)fail(400,'Topaz uses one original source image and no extra references or compressed working copies.');
    const prepared=await readFalUpscaleSource(env,owner,data.sourceId);
    setFalUpscaleDimensions(p,prepared.dimensions,{fail});
    return {primary:prepared.asset,input:buildFalUpscaleInput(p),prepared};
  }
  if(p.engine==='seedance'){
    const prepared=await prepareSeedance(env,owner,data,p,url,{fail,source,sources,signedInput});
    if(p.prompt)prepared.input.prompt=assembledPrompt(p);return prepared;
  }
  if(p.provider==='fal'&&['h3maxfal','omni'].includes(p.engine)){
    let primary=null,imageUrls=[],imageUrl=null,endImageUrl=null;
    p.referenceSourceIds=[];p.lastSourceId=null;
    if(p.mode==='reference'){
      const max=p.engine==='h3maxfal'?12:10,refs=await sources(env,owner,data.referenceSourceIds,max);
      primary=refs[0];p.referenceSourceIds=refs.map(a=>a.id);p.referenceRoles=(p.referenceRoles||[]).slice(0,refs.length);
      if(p.engine==='h3maxfal'){
        if(p.referencePixels.length&&p.referencePixels.length!==refs.length)fail(400,'H3 Max reference dimensions must match the selected images.');
        if(!p.referencePixels.length)p.referencePixels=refs.map(()=>1048576);
      }
      if(url)imageUrls=await Promise.all(refs.map(a=>signedInput(env,url,a.id,86400)));
    }else if(p.mode==='start'){
      if(data.referenceSourceIds?.length)fail(400,'Start-frame mode cannot be combined with reference mode.');
      primary=await source(env,owner,data.sourceId);const last=data.lastSourceId?await source(env,owner,data.lastSourceId):null;p.lastSourceId=last?.id||null;p.referenceRoles=[];
      if(url){imageUrl=await signedInput(env,url,primary.id,86400);if(last)endImageUrl=await signedInput(env,url,last.id,86400);}
    }else{
      if(data.sourceId||data.lastSourceId||data.referenceSourceIds?.length)fail(400,'Text-to-video does not accept source images.');
      p.referenceRoles=[];
    }
    const prompt=p.mode==='reference'?assembledPrompt(p):p.prompt;
    const input=buildFalVideoInput({...p,prompt},{imageUrls,imageUrl,endImageUrl});
    return {primary,input};
  }
  if(p.engine==='h3'&&p.mode==='reference'){
    const refs=await sources(env,owner,data.referenceSourceIds,9);p.referenceSourceIds=refs.map(a=>a.id);p.lastSourceId=null;
    const input={resolution:p.resolution,duration_seconds:p.duration,aspect_ratio:p.aspectRatio==='auto'?'16:9':p.aspectRatio};
    if(url)input.reference_image_urls=await Promise.all(refs.map(a=>signedInput(env,url,a.id)));
    if(p.prompt)input.prompt=assembledPrompt(p).replace(/^Reference (\d+)/gm,'Picture $1');
    return {primary:refs[0],input};
  }
  if(p.provider==='fal'&&p.engine==='soulpro'){
    if(data.lastSourceId)fail(400,'PV Soul Pro does not use a last frame.');
    const primary=await source(env,owner,data.sourceId);
    if(!primary.mime?.startsWith('image/'))fail(400,'PV Soul Pro base must be an image.');
    const refs=await sources(env,owner,data.referenceSourceIds,4);
    if(refs.some(a=>!a.mime?.startsWith('image/')))fail(400,'PV Soul Pro identity references must be images.');
    p.referenceSourceIds=refs.map(a=>a.id);p.referenceRoles=(p.referenceRoles||[]).slice(0,refs.length);p.lastSourceId=null;
    const input=url?buildSoulProInput(p,{
      sourceUrl:await signedInput(env,url,primary.id,86400),
      identityUrls:await Promise.all(refs.map(a=>signedInput(env,url,a.id,86400)))
    }):{};
    return {primary,input};
  }
  if(p.provider==='fal'||p.engine==='fal'){
    const refs=data.referenceSourceIds?.length?await sources(env,owner,data.referenceSourceIds,5):[];
    if(p.mode==='controlled-pose'){
      const roles=controlledPoseRefs(p.referenceRoles,refs.length,{fail});
      p.referenceSourceIds=refs.map(a=>a.id);p.referenceRoles=p.referenceRoles.slice(0,refs.length);p.lastSourceId=null;
      return {primary:refs[roles.pose],input:{}};
    }
    if(p.mode==='controlled-repair'){
      p.referenceSourceIds=refs.map(a=>a.id);p.referenceRoles=p.referenceRoles.slice(0,refs.length);p.maskSourceId=uid(data.maskSourceId);p.repairSourceId=uid(data.sourceId);p.lastSourceId=null;
      return {primary:await source(env,owner,data.sourceId),input:{}};
    }
  }
  let primary=null,input;
  if(p.type==='image'&&p.mode==='upscale'){
    primary=await source(env,owner,data.sourceId);p.referenceSourceIds=[];p.lastSourceId=null;
    input={resolution:p.resolution,output_format:p.outputFormat};
    if(url)input.image_url=await signedInput(env,url,primary.id);
  }else if(p.type==='image'&&p.engine==='soul'&&p.mode==='reinterpret'){
    if(data.referenceSourceIds?.length||data.lastSourceId)fail(400,'Reinterpret needs exactly one base image and no other references.');
    primary=await source(env,owner,data.sourceId);
    const character=await readyReinterpretCharacter(env,owner,p.characterId,soulDeps());
    p.referenceSourceIds=[];p.lastSourceId=null;p.reinterpretAdapterId=character.id;
    input=buildReinterpretInput(p,{triggerWord:character.trigger_word,weightsUrl:url?await soulWeightUrl(env,url,character,soulDeps()):null,imageUrl:url?await signedInput(env,url,primary.id):null});
  }else if(p.type==='image'&&p.engine==='soul'){
    if(await first(env,'SELECT * FROM soul_reinterpret_links WHERE adapter_id=?',p.characterId))fail(400,'Use this secondary identity through its original Soul in Reinterpret mode.');
    const character=await readySoulCharacter(env,owner,p.characterId,soulDeps());
    if(data.referenceSourceIds?.length)fail(400,'PV Soul v0.1 does not accept reference images. Use the trained character with a text prompt, or switch to Seedream / Nano Banana for reference editing.');
    primary=null;p.referenceSourceIds=[];p.lastSourceId=null;p.model=SOUL_TEXT_MODEL;p.triggerWord=character.trigger_word;
    const direction=assembledPrompt(p);
    const prefix='The subject is the trained adult character '+character.trigger_word+'. Preserve that trained identity.';
    const finalPrompt=prefix+'\n'+direction;if(finalPrompt.length>5000)fail(400,'PV Soul prompt plus identity instruction is too long.');
    input={prompt:finalPrompt,output_format:p.outputFormat,aspect_ratio:p.aspectRatio};
    if(url){const weights=await soulWeightUrl(env,url,character,soulDeps());input.loras=[{path:weights,scale:p.identityStrength}];}
  }else if(p.type==='image'){
    const refs=data.referenceSourceIds?.length?await sources(env,owner,data.referenceSourceIds):[];
    primary=refs[0]||null;p.referenceSourceIds=refs.map(a=>a.id);p.lastSourceId=null;p.model=refs.length?STILL_EDIT:STILL_TEXT;
    input={resolution:p.resolution,aspect_ratio:p.aspectRatio==='auto'&&!refs.length?'1:1':p.aspectRatio,output_format:p.outputFormat};
    if(refs.length&&url)input.image_urls=await Promise.all(refs.map(a=>signedInput(env,url,a.id)));
  }else if(['h3','h3max','h3spicy'].includes(p.engine)){
    p.referenceSourceIds=[];p.lastSourceId=null;
    input={resolution:p.resolution,duration_seconds:p.duration};
    if(p.mode==='text'){
      primary=null;
      if(p.aspectRatio!=='auto')input.aspect_ratio=p.aspectRatio;
    }else{
      primary=await source(env,owner,data.sourceId);
      const last=data.lastSourceId?await source(env,owner,data.lastSourceId):null;p.lastSourceId=last?.id||null;
      if(url){input.image_url=await signedInput(env,url,primary.id);if(last)input.last_image_url=await signedInput(env,url,last.id);}
    }
  }else if(p.mode==='reference'){
    const refs=await sources(env,owner,data.referenceSourceIds);primary=refs[0];p.referenceSourceIds=refs.map(a=>a.id);p.lastSourceId=null;
    input={resolution:p.resolution,duration_seconds:p.duration,generate_audio:p.audio,enable_prompt_expansion:false,aspect_ratio:p.aspectRatio==='auto'?'adaptive':p.aspectRatio};
    if(url)input.reference_image_urls=await Promise.all(refs.map(a=>signedInput(env,url,a.id)));
  }else{
    primary=await source(env,owner,data.sourceId);const last=data.lastSourceId?await source(env,owner,data.lastSourceId):null;p.referenceSourceIds=[];p.lastSourceId=last?.id||null;
    input={resolution:p.resolution,duration_seconds:p.duration,generate_audio:p.audio,enable_prompt_expansion:false};
    if(url&&p.aspectRatio==='21:9'){
      const ids=data.transferSourceIds;
      const expected=last?2:1;
      if(!Array.isArray(ids)||ids.length!==expected||new Set(ids).size!==ids.length)fail(400,'Wan 21:9 needs the Lab-prepared 21:9 working frame'+(last?'s':'')+'. Review the price again.');
      const transfers=await sources(env,owner,ids);p.transferSourceIds=transfers.map(a=>a.id);
      p.transferNotes=['Wan 21:9 uses a private local center crop as the provider working frame; your original upload is retained unchanged.'];
      input.image_url=await signedInput(env,url,transfers[0].id);if(last)input.last_image_url=await signedInput(env,url,transfers[1].id);
      input.aspect_ratio='adaptive';
    }else{
      if(url){input.image_url=await signedInput(env,url,primary.id);if(last)input.last_image_url=await signedInput(env,url,last.id);}
      if(p.aspectRatio!=='auto'&&p.aspectRatio!=='21:9')input.aspect_ratio=p.aspectRatio;
    }
  }
  if((p.prompt||supportsReferenceGuidance(p))&&p.engine!=='soul')input.prompt=assembledPrompt(p);if(p.type!=='image'&&p.seed!==null)input.seed=p.seed;
  return {primary,input};
}
async function source(env,owner,id) {
  const a=await first(env,"SELECT * FROM assets WHERE id=? AND owner_id=? AND kind='source'",uid(id),owner);
  if(!a)fail(404,'Source image not found. Upload it again.');return a;
}
async function sources(env,owner,ids,max=10) {
  if(!Array.isArray(ids)||ids.length<1||ids.length>max)fail(400,'Reference mode needs 1 to '+max+' images.');
  const validIds=ids.map(uid);if(new Set(validIds).size!==validIds.length)fail(400,'The same source image is listed more than once. Remove the duplicate reference so image roles stay aligned.');
  const out=[];
  for(const id of validIds)out.push(await source(env,owner,id));
  if(!out.length)fail(400,'Add at least one reference image.');return out;
}
function linkedSourceIds(row) {
  const ids=new Set();if(row?.source_id&&UUID.test(row.source_id))ids.add(row.source_id);
  try{const p=JSON.parse(row?.params||'{}');for(const key of ['lastSourceId','maskSourceId','repairSourceId','poseMapSourceId'])if(UUID.test(p[key]||''))ids.add(p[key]);for(const key of ['referenceSourceIds','transferSourceIds','referenceVideoIds','referenceAudioIds'])if(Array.isArray(p[key]))for(const id of p[key])if(UUID.test(id||''))ids.add(id);}catch{}
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
async function signedInput(env,url,id,ttl=1800) {
  const expires=Math.floor(now()/1000)+ttl,key=await derived(env,'input-url',{name:'HMAC',hash:'SHA-256'},['sign']);
  const sig=base(await crypto.subtle.sign('HMAC',key,enc.encode(id+':'+expires)));
  return url.origin+'/input/'+id+'?expires='+expires+'&signature='+sig;
}
async function publicInput(request,env,url) {
  const id=uid(url.pathname.split('/')[2]),expires=Number(url.searchParams.get('expires')),signature=url.searchParams.get('signature')||'';
  if(!Number.isInteger(expires)||expires<Math.floor(now()/1000)||expires>Math.floor(now()/1000)+86405||!signature||signature.length>100)fail(403,'Expired input link.');
  const key=await derived(env,'input-url',{name:'HMAC',hash:'SHA-256'},['verify']);let valid=false;
  try{valid=await crypto.subtle.verify('HMAC',key,unbase(signature),enc.encode(id+':'+expires));}catch{}
  if(!valid)fail(403,'Invalid input link.');
  const a=await first(env,"SELECT * FROM assets WHERE id=? AND kind='source'",id);if(!a)fail(404,'Not found.');
  const owner=await env.OWNER_DB.prepare("SELECT id FROM users WHERE id=? AND role='owner' AND auth_provider='clerk'").bind(a.owner_id).first();
  if(!owner&&!await isLabCustomer(env,a.owner_id))fail(403,'Access revoked.');return media(request,env,a);
}
async function media(request,env,a) {
  const rangeRequested=request.method==='GET'&&request.headers.has('range');
  const obj=request.method==='HEAD'&&env.LAB_MEDIA.head?await env.LAB_MEDIA.head(a.object_key):await env.LAB_MEDIA.get(a.object_key,rangeRequested?{range:request.headers}:{});
  if(!obj)fail(404,'Stored file is unavailable.');
  // R2 may describe the full object with range metadata even for an ordinary GET.
  // Only an explicit ranged GET may produce a partial-content HTTP response.
  const partial=rangeRequested&&obj.range;
  const h=new Headers({'Content-Type':a.mime,'Accept-Ranges':'bytes','Content-Disposition':`inline; filename="${a.kind==='video'?'parallel-vision-'+a.id+'.mp4':'source-'+a.id+'.'+(a.mime==='image/jpeg'?'jpg':a.mime.split('/')[1])}"`});
  h.set('Content-Length',String(partial?partial.length:obj.size));
  if(partial)h.set('Content-Range',`bytes ${partial.offset}-${partial.offset+partial.length-1}/${obj.size}`);
  return new Response(request.method==='HEAD'?null:obj.body,{status:partial?206:200,headers:h});
}
function jobView(j) {return {id:j.id,sourceId:j.source_id,settings:JSON.parse(j.params),status:j.state,outputId:j.output_id,estimatedUsd:j.estimate_microusd>0?j.estimate_microusd/1000000:null,settledUsd:j.settled_cost,providerTaskId:j.provider_id,error:j.error,createdAt:j.created_at,updatedAt:j.updated_at};}
function safeVideoUrl(value) {
  const u=new URL(value);const host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!(host==='spicyapi.ai'||host.endsWith('.spicyapi.ai')||host==='higgsfield.ai'||host.endsWith('.higgsfield.ai')||host==='fal.media'||host.endsWith('.fal.media')||host==='cdn.fashn.ai'||host==='media.fashn.ai'||host.endsWith('.r2.cloudflarestorage.com')||host.endsWith('.cloudfront.net')))throw new Error('Unexpected provider output location.');
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
  if(stored.n>=MAX_STORAGE||(declared>0&&stored.n+declared>MAX_STORAGE))throw new Error('Private archive storage limit reached.');
  const objectKey=`${j.owner_id}/results/${j.id}.${ext}`;let bytes=0;
  if(declared>0&&declared<=16*1024*1024||!env.LAB_MEDIA.createMultipartUpload){
    const buffer=await limitedBody(r,Math.min(limit,16*1024*1024));bytes=buffer.length;
    if(!bytes||isImage&&!sniff(buffer,mime))throw new Error('Invalid image output.');
    if(declared&&bytes!==declared)throw new Error('Incomplete output download.');
    if(stored.n+bytes>MAX_STORAGE)throw new Error('Private archive storage limit reached.');
    await env.LAB_MEDIA.put(objectKey,buffer,{httpMetadata:{contentType:finalMime}});
  }else{
    const upload=await env.LAB_MEDIA.createMultipartUpload(objectKey,{httpMetadata:{contentType:finalMime}});
    const reader=r.body.getReader(),parts=[],prefix=new Uint8Array(12);let prefixUsed=0,verified=!isImage;
    let buffer=new Uint8Array(8*1024*1024),used=0,part=1;
    try{
      while(true){
        const item=await reader.read();if(item.done)break;
        const chunk=item.value;bytes+=chunk.length;if(bytes>limit)throw new Error('Output exceeds archive limit.');if(stored.n+bytes>MAX_STORAGE)throw new Error('Private archive storage limit reached.');
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
  if(isImage)await ensureGalleryDimensions(env,{...j,output_id:j.id});
}
async function storeRemoteImage(env,owner,url,prefix='fal-image'){
  let target=safeVideoUrl(url),response;
  for(let i=0;i<4;i++){
    response=await fetch(target,{redirect:'manual',signal:AbortSignal.timeout(30000)});
    if(response.status>=300&&response.status<400){const next=response.headers.get('location');if(!next)throw new Error('No image output location.');target=safeVideoUrl(new URL(next,target).href);continue;}break;
  }
  if(!response?.ok)throw new Error('Image output download failed.');
  const mime=(response.headers.get('content-type')||'').split(';')[0];
  if(!['image/png','image/jpeg','image/webp'].includes(mime))throw new Error('Unexpected pose preview format.');
  const bytes=await limitedBody(response,MAX_IMAGE);
  if(!bytes.length||!sniff(bytes,mime))throw new Error('Invalid pose preview image.');
  const stored=await first(env,'SELECT COALESCE(SUM(bytes),0) AS n FROM assets WHERE owner_id=?',owner);
  if(stored.n+bytes.length>MAX_STORAGE)throw new Error('Private archive storage limit reached.');
  const id=crypto.randomUUID(),ext=mime==='image/jpeg'?'jpg':mime.split('/')[1],objectKey=`${owner}/sources/${id}.${ext}`;
  await env.LAB_MEDIA.put(objectKey,bytes,{httpMetadata:{contentType:mime}});
  try{await run(env,"INSERT INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,'source',?,?,?,?)",id,owner,objectKey,mime,prefix+'-'+id+'.'+ext,bytes.length,now());}
  catch(e){await env.LAB_MEDIA.delete(objectKey);throw e;}
  return id;
}
async function createFalPoseMap(env,owner,url,poseAsset,existingId=null){
  if(existingId){
    const existing=await source(env,owner,existingId);if(!existing.mime.startsWith('image/'))fail(400,'Pose map must be an image.');return existing;
  }
  const poseUrl=await signedInput(env,url,poseAsset.id,86400);
  const completed=await falAwait(FAL_DWPOSE,env.FAL_KEY,{image_url:poseUrl,draw_mode:'full-pose'},{timeoutMs:45000,pollMs:750});
  const output=completed.result?.image?.url;if(typeof output!=='string'||!output)throw new Error('fal.ai DWPose completed without a pose image.');
  const id=await storeRemoteImage(env,owner,output,'dwpose');
  return source(env,owner,id);
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
async function stageImageReferences(env,owner,ids,key,max=10) {
  const assets=await sources(env,owner,ids,max);
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
    if(!owner&&!await isLabCustomer(env,job.owner_id))continue;
    try{
      const c=await config(env,job.owner_id);if(!c)continue;
      const result=await vendorRequest('/jobs/recordInfo?taskId='+encodeURIComponent(job.provider_id),await decryptKey(env,c.encrypted_key));
      if(['failed','cancelled','canceled','expired'].includes(result.state))await run(env,"UPDATE jobs SET error=? WHERE id=? AND state='failed'",providerFailure(result),job.id);
    }catch{}
  }
}


function geminiEstimateMicros(p){
  const standard=p.resolution==='4k'?240000:134000;
  return p.processing==='batch'?Math.ceil(standard/2):standard;
}
function standardBase64(bytes){
  let out='';const a=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  for(let i=0;i<a.length;i+=0x8000)out+=String.fromCharCode(...a.subarray(i,Math.min(i+0x8000,a.length)));
  return btoa(out);
}
async function falImageBytes(env,a){
  if(!['image/jpeg','image/png','image/webp'].includes(a.mime))fail(400,'FAL image inputs must be JPG, PNG or WebP.');
  const obj=await env.LAB_MEDIA.get(a.object_key);if(!obj)fail(404,'A FAL input image is missing from private storage.');
  const bytes=new Uint8Array(await new Response(obj.body).arrayBuffer());if(bytes.length!==a.bytes||!sniff(bytes,a.mime))fail(409,'A stored FAL input image failed verification.');
  return bytes;
}
async function falImageDataUri(env,a){
  const bytes=await falImageBytes(env,a);
  return {url:'data:'+a.mime+';base64,'+standardBase64(bytes),bytes:bytes.length};
}
async function readFalUpscaleSource(env,owner,id){
  const asset=await source(env,owner,id);
  if(!['image/jpeg','image/png','image/webp'].includes(asset.mime)||asset.bytes<=0||asset.bytes>MAX_IMAGE)fail(400,'Topaz needs one PNG, JPEG or WebP source up to 20 MiB.');
  const object=await env.LAB_MEDIA.get(asset.object_key);if(!object)fail(404,'The upscale source is missing from private storage.');
  const bytes=await limitedBody(new Response(object.body),MAX_IMAGE);
  if(bytes.length!==asset.bytes||!sniff(bytes,asset.mime))fail(409,'The stored upscale source failed verification. Upload it again.');
  let dimensions;try{dimensions=storedImageDimensions(bytes,asset.mime);}catch(e){fail(400,e.message);}
  const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  return {asset,bytes,dimensions,sha256};
}
function geminiImagePart(response){
  const candidates=response?.candidates||[];
  for(const candidate of candidates)for(const part of candidate?.content?.parts||[]){
    const d=part.inlineData||part.inline_data;
    if(d?.data&&typeof d.data==='string'&&/^image\/(png|jpeg|webp)$/i.test(d.mimeType||d.mime_type||''))return {data:d.data,mime:(d.mimeType||d.mime_type).toLowerCase()};
  }
  return null;
}
async function geminiFetch(env,path,{method='GET',body:payload,timeout=60000}={}){
  if(!env.GEMINI_API_KEY)fail(503,'Gemini API key is not configured on this Worker.');
  let r;
  try{
    // Workers supports manual/follow redirects, but rejects redirect:'error'
    // before any network request. Never forward the provider key to a redirect.
    r=await fetch(GEMINI_API+path,{method,headers:{'x-goog-api-key':env.GEMINI_API_KEY,'Accept':'application/json',...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(timeout),redirect:'manual'});
  }catch{
    const e=new HttpError(502,'Gemini request could not be confirmed. Check Google AI Studio usage before retrying to avoid a duplicate charge.');e.definite=false;throw e;
  }
  if(r.status>=300&&r.status<400){
    await r.body?.cancel().catch(()=>{});
    const e=new HttpError(502,'Gemini API returned an unexpected redirect. It was not followed. Check Google AI Studio usage before retrying to avoid a duplicate charge.');e.definite=false;throw e;
  }
  const raw=await r.text();let data=null;try{data=raw?JSON.parse(raw):{};}catch{}
  if(!r.ok||!data){
    const detail=String(data?.error?.message||('HTTP '+r.status)).replace(/[\r\n]+/g,' ').slice(0,500);
    const e=new HttpError(r.status>=400&&r.status<500?422:502,'Gemini API: '+detail);e.definite=r.status>=400&&r.status<500&&r.status!==408&&r.status!==429;throw e;
  }
  return data;
}
async function geminiParts(env,owner,p,referenceSourceIds=[]){
  const ids=Array.isArray(referenceSourceIds)?referenceSourceIds:[];
  if(ids.length>10)fail(400,'Nano Banana Pro accepts up to 10 image references in this Lab.');
  const refs=ids.length?await sources(env,owner,ids):[];p.referenceSourceIds=refs.map(a=>a.id);
  const parts=[{text:assembledPrompt(p)}];
  let total=0;
  for(let i=0;i<refs.length;i++){
    const a=refs[i];if(!['image/jpeg','image/png','image/webp'].includes(a.mime))fail(400,'Nano Banana Pro references must be JPG, PNG or WebP.');
    total+=a.bytes;if(total>14*1024*1024)fail(413,'Nano Banana Pro references exceed the 14 MiB inline-input limit for this Lab. Use fewer or smaller reference images.');
    const obj=await env.LAB_MEDIA.get(a.object_key);if(!obj)fail(404,'A reference image is missing from private storage.');
    const bytes=new Uint8Array(await obj.arrayBuffer());if(bytes.length!==a.bytes||!sniff(bytes,a.mime))fail(409,'A stored reference image failed verification.');
    const label=p.referenceRoles?.[i],note=[label?.role&&label.role!=='none'?label.role:'',label?.note||''].filter(Boolean).join('. ');
    if(note)parts.push({text:'Reference '+(i+1)+': '+note});
    parts.push({inlineData:{mimeType:a.mime,data:standardBase64(bytes)}});
  }
  return {parts,refs,totalBytes:total};
}
function geminiGenerateRequest(p,parts){
  const image={imageSize:p.resolution.toUpperCase()};
  if(p.aspectRatio&&p.aspectRatio!=='auto')image.aspectRatio=p.aspectRatio;
  return {contents:[{role:'user',parts}],generationConfig:{responseModalities:['IMAGE'],responseFormat:{image}}};
}
async function saveGeminiImage(env,j,response){
  const part=geminiImagePart(response);if(!part)throw new Error('Gemini completed without an image output.');
  let bytes;try{bytes=Uint8Array.from(atob(part.data),x=>x.charCodeAt(0));}catch{throw new Error('Gemini returned invalid image data.');}
  if(!bytes.length||bytes.length>MAX_IMAGE||!sniff(bytes,part.mime))throw new Error('Gemini returned an invalid or oversized image.');
  const stored=await first(env,'SELECT COALESCE(SUM(bytes),0) AS n FROM assets WHERE owner_id=?',j.owner_id);
  if(stored.n+bytes.length>MAX_STORAGE)throw new Error('Private archive storage limit reached.');
  const ext=part.mime==='image/jpeg'?'jpg':part.mime.split('/')[1],objectKey=`${j.owner_id}/results/${j.id}.${ext}`;
  await env.LAB_MEDIA.put(objectKey,bytes,{httpMetadata:{contentType:part.mime}});
  await env.LAB_DB.batch([
    stmt(env,'INSERT OR REPLACE INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,?,?,?,?,?)',j.id,j.owner_id,objectKey,'source',part.mime,'parallel-vision-'+j.id+'.'+ext,bytes.length,now()),
    stmt(env,"UPDATE jobs SET state='completed',output_id=?,error='',updated_at=? WHERE id=?",j.id,now(),j.id)
  ]);
}
async function refreshGeminiJob(env,j,p){
  if(p.processing!=='batch'||!j.provider_id)return;
  const lock=await run(env,'UPDATE jobs SET last_poll=? WHERE id=? AND last_poll<?',now(),j.id,now()-8000);if(!lock.meta.changes)return;
  let status;
  try{status=await geminiFetch(env,'/'+j.provider_id,{timeout:20000});}
  catch(e){await run(env,'UPDATE jobs SET error=? WHERE id=?','Gemini polling: '+String(e.message).slice(0,300),j.id);return;}
  const state=status?.metadata?.state||status?.state||'JOB_STATE_PENDING';
  if(state==='JOB_STATE_SUCCEEDED'){
    const responses=status?.response?.inlinedResponses||status?.dest?.inlinedResponses||[];
    const siblings=await rows(env,"SELECT * FROM jobs WHERE owner_id=? AND provider_id=? AND state IN ('queued','running','saving') ORDER BY created_at,id",j.owner_id,j.provider_id);
    for(let i=0;i<siblings.length;i++){
      const row=siblings[i],idx=Number(JSON.parse(row.params||'{}').batchIndex??i),entry=responses[idx];
      try{
        if(entry?.error)throw new Error(entry.error.message||JSON.stringify(entry.error));
        await saveGeminiImage(env,row,entry?.response||entry);
      }catch(e){await run(env,"UPDATE jobs SET state='failed',error=?,updated_at=? WHERE id=?",String(e.message||'Gemini batch image failed.').slice(0,500),now(),row.id);}
    }
    return;
  }
  if(['JOB_STATE_FAILED','JOB_STATE_CANCELLED','JOB_STATE_EXPIRED'].includes(state)){
    const msg=String(status?.error?.message||('Gemini batch ended with '+state)).slice(0,500);
    await run(env,"UPDATE jobs SET state='failed',error=?,updated_at=? WHERE owner_id=? AND provider_id=? AND state IN ('queued','running','saving')",msg,now(),j.owner_id,j.provider_id);return;
  }
  await run(env,"UPDATE jobs SET state=?,error='',updated_at=? WHERE owner_id=? AND provider_id=? AND state IN ('queued','running')",state==='JOB_STATE_RUNNING'?'running':'queued',now(),j.owner_id,j.provider_id);
}

function falOutputUrl(result,isVideo){
  return isVideo?(result?.video?.url||result?.videos?.find?.(x=>typeof x?.url==='string'&&x.url)?.url):(result?.images?.find?.(x=>typeof x?.url==='string'&&x.url)?.url||result?.image?.url);
}
async function recoverFalOutput(env,j,p){
  if(!env.FAL_KEY||!j.provider_id)return false;
  const endpoint=p.model||FAL_CONTROLLED_POSE;
  const result=await falResult(endpoint,env.FAL_KEY,j.provider_id),output=falOutputUrl(result,p.type==='video');
  if(typeof output!=='string'||!output)return false;
  const safe=safeVideoUrl(output);
  await env.LAB_DB.batch([
    stmt(env,"UPDATE jobs SET state='saving',remote_url=?,error='',updated_at=? WHERE id=?",safe,now(),j.id),
    stmt(env,'INSERT OR IGNORE INTO spend(job_id,owner_id,estimate_microusd,created_at) VALUES(?,?,?,?)',j.id,j.owner_id,j.estimate_microusd,j.created_at)
  ]);
  await copyResult(env,j,safe);
  return true;
}
async function deleteJobRecord(env,owner,j){
  if(ACTIVE.has(j.state))fail(409,'Active or uncertain jobs cannot be deleted.');
  const linked=linkedSourceIds(j);
  await run(env,'DELETE FROM jobs WHERE id=? AND owner_id=?',j.id,owner);
  if(j.quote_id)await run(env,'DELETE FROM quotes WHERE id=?',j.quote_id);
  if(j.output_id){
    const a=await first(env,'SELECT * FROM assets WHERE id=? AND owner_id=?',j.output_id,owner);
    if(a){
      if(a.kind==='source')await pruneSource(env,owner,a.id);
      else{await env.LAB_MEDIA.delete(a.object_key);await run(env,'DELETE FROM assets WHERE id=?',a.id);}
    }
  }
  for(const sourceId of linked)await pruneSource(env,owner,sourceId);
}
async function refreshFalJob(env,j,p){
  let resultPhase=false;
  if(!env.FAL_KEY){await run(env,"UPDATE jobs SET error=?,updated_at=? WHERE id=?",'fal.ai is not configured on the Lab backend. The existing request remains active.',now(),j.id);return;}
  const lock=await run(env,'UPDATE jobs SET last_poll=? WHERE id=? AND last_poll<?',now(),j.id,now()-8000);if(!lock.meta.changes)return;
  try{
    const endpoint=p.model||FAL_CONTROLLED_POSE,status=await falStatus(endpoint,env.FAL_KEY,j.provider_id),state=String(status?.status||'').toUpperCase();
    if(state==='COMPLETED'){
      resultPhase=true;
      const result=await falResult(endpoint,env.FAL_KEY,j.provider_id),isVideo=p.type==='video';
      const output=falOutputUrl(result,isVideo);
      if(typeof output!=='string'||!output)throw new Error('fal.ai completed without a compatible '+(isVideo?'video':'image')+' output.');
      const safe=safeVideoUrl(output);
      await run(env,"UPDATE jobs SET state='saving',remote_url=?,error='',updated_at=? WHERE id=?",safe,now(),j.id);
      await copyResult(env,j,safe);return;
    }
    if(['FAILED','CANCELLED','CANCELED'].includes(state)){
      try{if(await recoverFalOutput(env,j,p))return;}catch{}
      const bits=[];
      const rawDetail=status?.error??status?.detail??status?.message;
      if(rawDetail){
        const detail=typeof rawDetail==='string'?rawDetail:(Array.isArray(rawDetail)?rawDetail.map(item=>typeof item==='string'?item:item&&typeof item==='object'?[Array.isArray(item.loc)?item.loc.join('.'):'',item.msg||item.message||'',item.type||''].filter(Boolean).join(': '):String(item)).filter(Boolean).join(' | '):JSON.stringify(rawDetail));
        if(detail)bits.push(String(detail));
      }
      if(Array.isArray(status?.logs))for(const item of status.logs){
        const msg=typeof item==='string'?item:item?.message||item?.msg;
        if(typeof msg==='string'&&msg.trim()&&!bits.includes(msg.trim()))bits.push(msg.trim());
      }
      if(!bits.length||bits.every(x=>/provider rejected the request/i.test(x))){
        try{await falResult(endpoint,env.FAL_KEY,j.provider_id);}
        catch(resultError){
          const msg=String(resultError?.message||'').replace(/^fal\.ai:\s*/,'').trim();
          if(msg&&!bits.includes(msg))bits.push(msg);
        }
      }
      const prefix=p.engine==='soulpro'?'Soul Pro / '+(p.soulProModel==='ideogram45'?'Ideogram 4.5':'FLUX Kontext Max')+': ':'fal.ai: ';
      const message=(prefix+(bits.filter(Boolean).join(' | ')||'Provider ended the request without an output.')).replace(/[\r\n]+/g,' ').slice(0,900);
      await env.LAB_DB.batch([
        stmt(env,"UPDATE jobs SET state='failed',error=?,updated_at=? WHERE id=?",message,now(),j.id),
        stmt(env,'DELETE FROM spend WHERE job_id=?',j.id)
      ]);return;
    }
    await run(env,"UPDATE jobs SET state=?,error='',updated_at=? WHERE id=?",state==='IN_PROGRESS'?'running':'queued',now(),j.id);
  }catch(e){
    const raw=String(e?.message||'fal.ai polling error').replace(/[\r\n]+/g,' ').slice(0,400);
    const detail=/^fal\.ai(?:\s|:)/.test(raw)?raw:'fal.ai: '+raw;
    // A queue lookup/auth/routing error says nothing about the paid job's outcome.
    // Only a completed request's explicit result rejection is terminal here.
    if(resultPhase&&e.status===422){
      await env.LAB_DB.batch([
        stmt(env,"UPDATE jobs SET state='failed',error=?,updated_at=? WHERE id=?",detail,now(),j.id),
        stmt(env,'DELETE FROM spend WHERE job_id=?',j.id)
      ]);
      return;
    }
    await run(env,'UPDATE jobs SET error=?,updated_at=? WHERE id=?',detail,now(),j.id);
  }
}

async function refreshJob(env,j) {
  if(!['queued','running','saving'].includes(j.state)||!j.provider_id)return;
  const params=JSON.parse(j.params||'{}');if(params.provider==='openrouter'){if(j.state==='saving'){const lock=await run(env,'UPDATE jobs SET last_poll=? WHERE id=? AND last_poll<?',now(),j.id,now()-8000);if(lock.meta.changes)try{await saveFlashResult(env,j);}catch(e){await run(env,'UPDATE jobs SET error=? WHERE id=?','Archive retry: '+String(e.message).slice(0,300),j.id);}}return;}if(params.provider==='gemini')return refreshGeminiJob(env,j,params);
  if(j.state==='saving'&&j.remote_url){
    const saveLock=await run(env,'UPDATE jobs SET last_poll=? WHERE id=? AND last_poll<?',now(),j.id,now()-8000);if(!saveLock.meta.changes)return;
    try{await copyResult(env,j,j.remote_url);}
    catch(e){const detail=String(e?.message||'temporary archive error').replace(/[\r\n]/g,' ').slice(0,220);await run(env,'UPDATE jobs SET error=?,updated_at=? WHERE id=?','Archive retry: '+detail+' The provider result is safe; generation slots are released while saving retries.',now(),j.id);}
    return;
  }
  if(params.provider==='higgsfield')return refreshHiggsfield(env,j,params,hfDeps());
  if(params.provider==='fal')return refreshFalJob(env,j,params);
  if(params.provider==='fashn')return refreshFashionJob(env,j,{run,stmt,copyResult});
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
    await run(env,'UPDATE jobs SET error=?,updated_at=? WHERE id=?','Archive retry: '+detail+' The provider result is safe; generation slots are released while saving retries.',now(),j.id);
  }
}
async function reserveFalImageJob(env,owner,sourceId,p,estimate){
  if((await first(env,'SELECT COUNT(*) AS n FROM jobs WHERE owner_id=?',owner)).n>=500)fail(409,'History limit reached. Delete old records first.');
  const c=await config(env,owner),limit=c?.daily_limit_microusd||10000000,t=now(),day=Math.floor(t/86400000)*86400000,id=crypto.randomUUID(),quoteId=crypto.randomUUID();
  await run(env,'INSERT INTO quotes(id,owner_id,source_id,params,estimate_microusd,expires_at,vendor_quote_id,expected_cost,payload) VALUES(?,?,?,?,?,?,?,?,?)',
    quoteId,owner,sourceId||null,JSON.stringify(p),estimate,t+600000,p.provider+'-direct',String(estimate/1000000),'{}');
  const provider=p.provider==='openrouter'?'openrouter':'fal',falSql="COALESCE(json_extract(params,'$.provider'),'')='"+provider+"'";
  const inserted=await run(env,"INSERT INTO jobs(id,owner_id,source_id,quote_id,params,state,estimate_microusd,created_at,updated_at) SELECT ?,?,?,?,?, 'submitting',?,?,? WHERE NOT EXISTS(SELECT 1 FROM jobs WHERE owner_id=? AND state='uncertain' AND "+falSql+") AND (SELECT COUNT(*) FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','uncertain') AND "+falSql+" AND json_extract(params,'$.type')='image')<? AND (SELECT COALESCE(SUM(estimate_microusd),0) FROM spend WHERE owner_id=? AND created_at>=?)+?<=?",
    id,owner,sourceId||null,quoteId,JSON.stringify(p),estimate,t,t,owner,owner,CONCURRENCY.image,owner,day,estimate,limit);
  if(!inserted.meta.changes){
    await run(env,'DELETE FROM quotes WHERE id=?',quoteId);
    const uncertain=(await first(env,"SELECT COUNT(*) AS n FROM jobs WHERE owner_id=? AND state='uncertain' AND "+falSql,owner)).n;
    const active=(await first(env,"SELECT COUNT(*) AS n FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','uncertain') AND "+falSql+" AND json_extract(params,'$.type')='image'",owner)).n;
    const spent=(await first(env,'SELECT COALESCE(SUM(estimate_microusd),0) AS n FROM spend WHERE owner_id=? AND created_at>=?',owner,day)).n;
    if(uncertain)fail(409,'No generation submitted: a provider request is interrupted. Resolve that provider request before retrying.');
    if(active>=CONCURRENCY.image)fail(409,'No generation submitted: '+active+' / '+CONCURRENCY.image+' image slots are already active.');
    if(spent+estimate>limit)fail(409,'No generation submitted: this image request would exceed your Lab daily spending limit.');
    fail(409,'No generation submitted because capacity changed. Refresh History and try again.');
  }
  return first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',id,owner);
}
async function submitReservedFalJob(env,j,p,input){
  let providerAccepted=false,requestId=null,submissionStarted=false;
  try{
    if(typeof input==='function')input=await input();
    // Persist the exact submitted input so a lost acknowledgement can be matched
    // to provider history even after the identity pack or source changes.
    await run(env,'UPDATE quotes SET payload=? WHERE id=?',JSON.stringify({model:p.model,input}),j.quote_id);
    submissionStarted=true;
    requestId=await falSubmit(p.model,env.FAL_KEY,input);providerAccepted=true;
    await run(env,"UPDATE jobs SET provider_id=?,state='queued',updated_at=? WHERE id=?",requestId,now(),j.id);
  }catch(e){
    const uncertain=providerAccepted||submissionStarted&&e?.definite!==true,state=uncertain?'uncertain':'failed';
    const detail=String(e?.message||'fal.ai request failed.').replace(/[\r\n]+/g,' ').slice(0,500);
    const msg=uncertain?detail+' Check FAL status in History before retrying; no generation will be resubmitted automatically.':detail;
    if(uncertain)await run(env,'UPDATE jobs SET state=?,provider_id=COALESCE(provider_id,?),error=?,updated_at=? WHERE id=?',state,requestId,msg,now(),j.id);
    else await env.LAB_DB.batch([
      stmt(env,'UPDATE jobs SET state=?,error=?,updated_at=? WHERE id=?',state,msg,now(),j.id),
      stmt(env,'DELETE FROM spend WHERE job_id=?',j.id)
    ]);
  }
  return first(env,'SELECT * FROM jobs WHERE id=?',j.id);
}

async function submitFalUpscaleQuote(env,owner,q,p,payload){
  if(!env.FAL_KEY)fail(503,'fal.ai upscaling is not configured on this Worker.');
  if(q.vendor_quote_id!=='fal-upscale-v1'||payload?.model!==p.model||payload?.source?.id!==q.source_id)fail(409,'Review a new upscale estimate. Nothing was submitted.');
  const verified=await readFalUpscaleSource(env,owner,q.source_id);
  if(verified.sha256!==payload.source.sha256||verified.asset.mime!==payload.source.mime||verified.bytes.length!==payload.source.bytes)fail(409,'The source changed since its estimate. Review the price again. Nothing was submitted.');
  if(q.expires_at<=now())fail(409,'Quote expired. Review the cost again.');
  const input={...payload.input};
  const c=await config(env,owner),limit=c?.daily_limit_microusd||10000000,id=crypto.randomUUID(),t=now(),day=Math.floor(t/86400000)*86400000;
  const falSql="(COALESCE(json_extract(params,'$.provider'),'')='fal' OR COALESCE(json_extract(params,'$.engine'),'') IN ('fal','soulpro','h3maxfal','omni') OR COALESCE(json_extract(params,'$.model'),'') LIKE 'fal-ai/%' OR COALESCE(json_extract(params,'$.model'),'') LIKE 'topaz/%')";
  // A distinct upscale cannot retry an interrupted identity edit. Keep unknown
  // upscale submissions blocked across Topaz engines; all FAL jobs still count
  // toward the shared image capacity and every held estimate still counts spend.
  const uncertainUpscaleSql=falSql+" AND COALESCE(json_extract(params,'$.mode'),'')='upscale'";
  try{
    const inserted=await run(env,"INSERT INTO jobs(id,owner_id,source_id,quote_id,params,state,estimate_microusd,created_at,updated_at) SELECT ?,?,?,?,?,'submitting',?,?,? WHERE NOT EXISTS(SELECT 1 FROM jobs WHERE owner_id=? AND state='uncertain' AND "+uncertainUpscaleSql+") AND (SELECT COUNT(*) FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','uncertain') AND "+falSql+" AND json_extract(params,'$.type')='image')<? AND (SELECT COALESCE(SUM(estimate_microusd),0) FROM spend WHERE owner_id=? AND created_at>=?)+?<=?",
      id,owner,q.source_id,q.id,q.params,q.estimate_microusd,t,t,owner,owner,CONCURRENCY.image,owner,day,q.estimate_microusd,limit);
    if(!inserted.meta.changes){
      const old=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',q.id,owner);if(old)return old;
      const uncertain=(await first(env,"SELECT COUNT(*) AS n FROM jobs WHERE owner_id=? AND state='uncertain' AND "+uncertainUpscaleSql,owner)).n;
      const active=(await first(env,"SELECT COUNT(*) AS n FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','uncertain') AND "+falSql+" AND json_extract(params,'$.type')='image'",owner)).n;
      const spent=(await first(env,'SELECT COALESCE(SUM(estimate_microusd),0) AS n FROM spend WHERE owner_id=? AND created_at>=?',owner,day)).n;
      if(uncertain)fail(409,'No upscale submitted: a fal.ai upscale is interrupted. Check that upscale in History before retrying.');
      if(active>=CONCURRENCY.image)fail(409,'No upscale submitted: all '+CONCURRENCY.image+' fal.ai image slots are active.');
      if(spent+q.estimate_microusd>limit)fail(409,'No upscale submitted: this estimate would exceed your Lab daily spending limit.');
      fail(409,'No upscale submitted because capacity changed. Refresh History and try again.');
    }
  }catch(e){const old=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',q.id,owner);if(old)return old;throw e;}
  let providerAccepted=false,requestId=null,submissionStarted=false;
  try{
    input.image_url=await falUploadImage(env.FAL_KEY,verified.bytes,verified.asset.mime);
    await run(env,'UPDATE quotes SET payload=? WHERE id=?',JSON.stringify({...payload,submittedInput:input}),q.id);
    submissionStarted=true;
    requestId=await falSubmit(p.model,env.FAL_KEY,input);providerAccepted=true;
    await run(env,"UPDATE jobs SET provider_id=?,state='queued',updated_at=? WHERE id=?",requestId,now(),id);
  }catch(e){
    if((!submissionStarted||e.definite===true)&&!providerAccepted)await env.LAB_DB.batch([
      stmt(env,"UPDATE jobs SET state='failed',error=?,updated_at=? WHERE id=?",String(e.message||'fal.ai rejected this upscale.').slice(0,600),now(),id),
      stmt(env,'DELETE FROM spend WHERE job_id=?',id)
    ]);
    else await run(env,"UPDATE jobs SET state='uncertain',provider_id=COALESCE(provider_id,?),error=?,updated_at=? WHERE id=?",requestId,String(e?.message||'fal.ai upscale acknowledgement was lost.').slice(0,500)+' Check History and the provider before retrying; nothing will be resubmitted automatically.',now(),id);
  }
  return first(env,'SELECT * FROM jobs WHERE id=?',id);
}

async function saveFlashResult(env,j){
  const key=j.owner_id+'/pending-images/'+j.id+'.json',cached=await env.LAB_MEDIA.get(key);
  if(!cached)throw new Error('OpenRouter result archive is missing. Check provider activity before retrying.');
  const result=await cached.json(),image=result.data[0],mime=image.media_type||'image/png';
  if(!['image/png','image/jpeg','image/webp'].includes(mime))throw new Error('Unsupported OpenRouter image format.');
  await saveGeminiImage(env,j,{candidates:[{content:{parts:[{inlineData:{mimeType:mime,data:image.b64_json}}]}}]});
  if(Number.isFinite(result.usage?.cost)&&result.usage.cost>=0)await run(env,'UPDATE jobs SET settled_cost=? WHERE id=?',result.usage.cost,j.id);
  await env.LAB_MEDIA.delete(key);
}

async function route(request,env,ctx) {
  const url=new URL(request.url),origin=request.headers.get('origin')||'';
  if(origin&&!ORIGINS.has(origin))fail(403,'Origin not allowed.');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Methods':'GET,HEAD,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type,X-Filename,X-Photo-Count,Range','Access-Control-Max-Age':'600'}});
  if(url.pathname==='/health'&&request.method==='GET')return json({ok:true,version:VERSION});

  if(url.pathname.startsWith('/input/')&&(request.method==='GET'||request.method==='HEAD'))return publicInput(request,env,url);
  if(url.pathname.startsWith('/soul-dataset/')&&request.method==='GET')return publicSoulDataset(request,env,url,soulDeps());
  if(url.pathname.startsWith('/soul-weight/')&&(request.method==='GET'||request.method==='HEAD'))return publicSoulWeight(request,env,url,soulDeps());
  if(url.pathname==='/api/stripe/webhook'&&request.method==='POST')return stripeWebhook(request,env);
  if(!url.pathname.startsWith('/api/'))fail(404,'Not found.');
  const owner=await authenticate(request,env),path=url.pathname,method=request.method;
  const customer=await isLabCustomer(env,owner);
  if(path.startsWith('/api/customer/')||path.startsWith('/api/billing/')){
    if(!customer)fail(403,'Only customer accounts use the PV Lab credit wallet.');
    return customerRoute(request,env,owner);
  }
  // Until payment/webhooks and shared vendor credentials have been tested, customer
  // accounts are read-only. Do not accidentally spend admin provider balances.
  const billable=method==='POST'&&(
    ['/api/jobs','/api/quotes','/api/gemini/jobs','/api/image-models/generate'].includes(path)||
    path.startsWith('/api/higgsfield/')||path.startsWith('/api/fal/')||
    path.startsWith('/api/fashion/')||
    path.startsWith('/api/soul/characters/')||
    ['/api/soul/datasets','/api/soul/characters'].includes(path)
  );
  if(customer&&billable&&env.LAB_PUBLIC_GENERATION_ENABLED!=='true')
    fail(503,'Customer generation will open after payment and model billing verification. No job submitted.');
  // Dataset training and the metered pose-preview route have no job-wallet charge yet.
  if(customer&&method==='POST'&&(
    path==='/api/soul/datasets'||path==='/api/soul/characters'||
    path.endsWith('/retry')&&path.startsWith('/api/soul/characters/')||
    path==='/api/fal/pose-preview'))
    fail(403,'This feature is not yet enabled for customer billing.');
  // Unfunded trial accounts must not consume unbounded private R2 storage.
  if(customer&&method==='POST'&&['/api/uploads','/api/reference-uploads'].includes(path)){
    const wallet=await first(env,'SELECT balance_credits FROM lab_customers WHERE id=?',owner);
    if(!wallet?.balance_credits)fail(402,'Add PV Lab credits before uploading files.');
  }
  if(path==='/api/library'||path.startsWith('/api/library/'))return json(await libraryRoute(request,env,owner,url,{body,uid,fail,rows,first,run}));
  // FASHN balance reports our wholesale API account balance, not the customer's credits.
  if(customer&&path==='/api/fashion/balance'&&method==='GET')return json({connected:!!env.FASHN_API_KEY,credits:null,note:'Your generation allowance is shown in your PV Lab credit wallet.'});
  if(path.startsWith('/api/fashion/'))return json(await fashionRoute(request,env,owner,url,{fail,body,first,run,stmt,jobView,source,signedInput,config,storedImageDimensions,falImageBytes,falSubmit}),path==='/api/fashion/submit'?202:200);
  if(path.startsWith('/api/higgsfield/'))return json(await higgsfieldRoute(request,env,owner,url,hfDeps()),request.method==='POST'?202:200);
  if(path==='/api/session'&&method==='GET'){
    if(customer){
      const account=await customerSession(env,owner);
      const c=await config(env,owner);
      const ready=account.generationReady;
      return json({...account,owner:false,ownerId:owner,version:VERSION,config:{...publicConfig(c,ready&&!!env.FAL_KEY),enabled:ready,configured:ready,customer:true,videoEngines:ready?publicConfig(c,!!env.FAL_KEY).videoEngines:[],higgsfieldEnabled:ready&&!!env.HF_CREDENTIALS,geminiEnabled:ready&&!!env.GEMINI_API_KEY,openrouterEnabled:ready&&!!env.OPENROUTER_API_KEY,soulTrainingEnabled:false,soulReinterpretEnabled:false,soulPresets:publicSoulPresets(),falEnabled:ready&&!!env.FAL_KEY}});
    }
    await run(env,"DELETE FROM spend WHERE owner_id=? AND job_id IN (SELECT id FROM jobs WHERE owner_id=? AND state='failed' AND COALESCE(json_extract(params,'$.provider'),'')='fal')",owner,owner);
    const c=await config(env,owner),spent=await first(env,'SELECT COALESCE(SUM(estimate_microusd),0) AS n FROM spend WHERE owner_id=? AND created_at>=?',owner,Math.floor(now()/86400000)*86400000);
    return json({owner:true,ownerId:owner,version:VERSION,config:{...publicConfig(c,!!env.FAL_KEY),higgsfieldEnabled:!!env.HF_CREDENTIALS,higgsfieldPrices:SOUL2_PRICES,geminiEnabled:!!env.GEMINI_API_KEY,openrouterEnabled:!!env.OPENROUTER_API_KEY,soulTrainingEnabled:!!env.FAL_KEY,soulReinterpretEnabled:true,soulPresets:publicSoulPresets(),falEnabled:!!env.FAL_KEY},estimatedSpentToday:spent.n/1000000});
  }
  if(path==='/api/soul-pro/identity'&&method==='GET'){
    const pack=await first(env,'SELECT id,refs,created_at FROM packs WHERE owner_id=? AND name=? ORDER BY created_at DESC LIMIT 1',owner,SOUL_PRO_IDENTITY_PACK);
    const refs=pack?JSON.parse(pack.refs):[];
    return json({configured:refs.length>0,count:refs.length,refs:refs.map(r=>({id:r.id,name:r.name}))});
  }
  if(path==='/api/soul-pro/identity'&&method==='POST'){
    const data=await body(request);let refs=[];
    if(data.packId){
      const pack=await first(env,'SELECT refs FROM packs WHERE owner_id=? AND id=?',owner,uid(data.packId));if(!pack)fail(404,'Reference pack not found.');
      refs=JSON.parse(pack.refs).slice(0,4);
    }else{
      const ids=Array.isArray(data.referenceSourceIds)?data.referenceSourceIds:[];
      const assets=await sources(env,owner,ids,4);
      refs=assets.map(a=>({id:a.id,name:a.filename,role:'identity',note:''}));
    }
    if(refs.length<1||refs.length>4)fail(400,'Choose 1 to 4 Nina identity images.');
    const assets=await sources(env,owner,refs.map(r=>r.id),4);if(assets.some(a=>!a.mime.startsWith('image/')))fail(400,'Nina identity references must be images.');
    await run(env,'DELETE FROM packs WHERE owner_id=? AND name=?',owner,SOUL_PRO_IDENTITY_PACK);
    const id=crypto.randomUUID();await run(env,'INSERT INTO packs(id,owner_id,name,refs,created_at) VALUES(?,?,?,?,?)',id,owner,SOUL_PRO_IDENTITY_PACK,JSON.stringify(refs),now());
    return json({configured:true,count:refs.length,refs:refs.map(r=>({id:r.id,name:r.name}))},201);
  }
  if(path==='/api/soul-pro/identity'&&method==='DELETE'){
    await run(env,'DELETE FROM packs WHERE owner_id=? AND name=?',owner,SOUL_PRO_IDENTITY_PACK);return json({configured:false,count:0,refs:[]});
  }
  if(path==='/api/soul/characters'&&method==='GET')return json({characters:await listSoulCharacters(env,owner,soulDeps())});
  if(path==='/api/soul/datasets'&&method==='POST')return json(await createSoulDataset(request,env,owner,soulDeps()),201);
  if(path==='/api/soul/characters'&&method==='POST')return json({character:await createSoulCharacter(request,env,owner,url,soulDeps())},202);
  if(path.startsWith('/api/soul/characters/')){
    const parts=path.split('/'),id=parts[4];
    if(parts[5]==='preview'&&method==='GET')return soulCharacterPreview(env,owner,id,soulDeps());
    if(parts[5]==='retry'&&method==='POST')return json({character:await retrySoulCharacter(request,env,owner,id,url,soulDeps())},202);
    if(parts[5]==='resolve'&&method==='POST')return json(await resolveSoulCharacter(request,env,owner,id,soulDeps()));
    if(method==='DELETE')return json(await deleteSoulCharacter(env,owner,id,soulDeps()));
  }
  if(path==='/api/settings'&&method==='POST') {
    if(customer)fail(403,'API provider settings are managed by PV Lab.');
    const data=await body(request),old=await config(env,owner);
    const limit=Number(data.dailyLimitUsd??10);if(!Number.isFinite(limit)||limit<1||limit>100)fail(400,'Daily estimate limit must be between $1 and $100.');
    if(data.enabled===true&&data.termsConfirmed!==true)fail(400,'Confirm provider suitability and terms before enabling paid generation.');
    const active=await first(env,"SELECT id FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','uncertain')",owner);
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
    return json({config:publicConfig(await config(env,owner),!!env.FAL_KEY)});
  }
  if(path==='/api/settings'&&method==='DELETE') {
    if(customer)fail(403,'API provider settings are managed by PV Lab.');
    if(await first(env,"SELECT id FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','uncertain')",owner))fail(409,'Wait for or resolve the active job before removing its API key.');
    await run(env,'DELETE FROM settings WHERE owner_id=?',owner);return json({config:publicConfig(null,!!env.FAL_KEY)});
  }
  if(path==='/api/packs'&&method==='GET'){
    const list=await rows(env,'SELECT id,name,refs,created_at FROM packs WHERE owner_id=? AND name<>? ORDER BY name',owner,SOUL_PRO_IDENTITY_PACK);
    return json({packs:list.map(p=>({...p,refs:JSON.parse(p.refs)}))});
  }
  if(path==='/api/packs'&&method==='POST'){
    const data=await body(request),name=String(data.name||'').trim().slice(0,100);
    if(!name)fail(400,'Give the pack a name.');
    if((await first(env,'SELECT COUNT(*) AS n FROM packs WHERE owner_id=?',owner)).n>=40)fail(409,'Keep up to 40 reference packs.');
    const max=data.engine==='seedance'?30:10;const list=await sources(env,owner,data.referenceSourceIds,max),labels=referenceLabels(data.referenceRoles,max);
    if(list.some(a=>!a.mime.startsWith('image/')))fail(400,'Reference packs contain images only.');
    if(labels.length&&labels.length!==list.length)fail(400,'Reference roles must match the selected images in order.');
    const refs=list.map((a,i)=>({id:a.id,...normalizeReferenceLabel({...labels[i],name:a.filename})}));
    const id=crypto.randomUUID();await run(env,'INSERT INTO packs(id,owner_id,name,refs,created_at) VALUES(?,?,?,?,?)',id,owner,name,JSON.stringify(refs),now());
    return json({id,name,refs},201);
  }
  if(path.startsWith('/api/packs/')&&method==='DELETE'){
    const id=uid(path.split('/')[3]),pack=await first(env,'SELECT refs FROM packs WHERE id=? AND owner_id=?',id,owner);
    if(!pack)fail(404,'Pack not found.');await run(env,'DELETE FROM packs WHERE id=? AND owner_id=?',id,owner);
    for(const a of JSON.parse(pack.refs))await pruneSource(env,owner,a.id);return json({ok:true});
  }
  if(path==='/api/reference-uploads'&&method==='POST') {
    const mime=request.headers.get('content-type')?.split(';')[0];
    if(!REFERENCE_MIME.has(mime))fail(415,'Choose an MP4/MOV video or MP3/WAV audio reference.');
    const bytes=await limitedBody(request,mime.startsWith('audio/')?15*1024*1024:MAX_IMAGE);
    if(!bytes.length||!sniffReference(bytes,mime))fail(400,'Reference file contents do not match the selected media type.');
    const usage=await first(env,'SELECT COALESCE(SUM(bytes),0) AS n,COUNT(*) AS count FROM assets WHERE owner_id=?',owner);
    if(usage.n+bytes.length>MAX_STORAGE||usage.count>=1000)fail(413,'Private archive limit reached.');
    const id=crypto.randomUUID(),objectKey=`${owner}/sources/${id}`;let filename='reference';
    try{filename=decodeURIComponent(request.headers.get('x-filename')||filename).replace(/[\r\n\x00-\x1f]/g,'').slice(0,180);}catch{}
    await env.LAB_MEDIA.put(objectKey,bytes,{httpMetadata:{contentType:mime}});
    try{await run(env,"INSERT INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,'source',?,?,?,?)",id,owner,objectKey,mime,filename,bytes.length,now());}catch(e){await env.LAB_MEDIA.delete(objectKey);throw e;}
    return json({id,filename,bytes:bytes.length},201);
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
  if(path==='/api/image-models/generate'&&method==='POST'){
    const data=await body(request),p=parameters(data.settings);
    if(!['flash','kling'].includes(p.engine))fail(400,'Choose Seedream Flash or Kling.');
    if(p.engine==='flash'&&!env.OPENROUTER_API_KEY)fail(503,'Add OPENROUTER_API_KEY as a Secret in the parallel-vision-lab Worker, then deploy.');
    if(p.engine==='kling'&&!env.FAL_KEY)fail(503,'FAL API is not connected.');
    const ids=data.referenceSourceIds||[];if(!Array.isArray(ids))fail(400,'Invalid image references.');
    const refs=ids.length?await sources(env,owner,ids,p.engine==='flash'?14:1):[];
    p.referenceSourceIds=refs.map(a=>a.id);p.referenceRoles=p.referenceRoles.slice(0,refs.length);
    if(refs.reduce((n,a)=>n+a.bytes,0)>16*1024*1024)fail(413,'Use smaller reference images: this route accepts up to 16 MiB combined.');
    const verified=[];
    for(const ref of refs){
      const bytes=await falImageBytes(env,ref),dimensions=storedImageDimensions(bytes,ref.mime);
      if(p.engine==='kling'&&(bytes.length>10000000||dimensions.width<300||dimensions.height<300||dimensions.width/dimensions.height<0.4||dimensions.width/dimensions.height>2.5))fail(400,'Kling needs a PNG, JPEG or WebP under 10 MB, at least 300 × 300 pixels, with a ratio between 0.4 and 2.5.');
      verified.push({ref,bytes,dimensions});
    }
    if(p.aspectRatio==='auto'){
      const first=p.referenceMode==='base'?verified[0]?.dimensions:null;
      p.aspectRatio=first?IMAGE_RATIOS.reduce((a,b)=>{const d=r=>Math.abs(Math.log(r.split(':')[0]/r.split(':')[1]/(first.width/first.height)));return d(b)<d(a)?b:a;},'16:9'):'16:9';
    }
    const prompt=assembledPrompt(p);
    if(p.engine==='kling'&&prompt.length>2500)fail(400,'Kling prompt plus reference instructions exceeds 2,500 characters. Shorten the direction or notes.');
    if(p.engine==='kling')p.model='fal-ai/kling-image/v3/'+(refs.length?'image-to-image':'text-to-image');
    // Validate all input before reserving or sending a paid request.
    buildImageModelInput(p,refs.map(()=>''),prompt);
    const reserved=await reserveFalImageJob(env,owner,refs[0]?.id||null,p,IMAGE_PRICES[p.engine]);
    if(p.engine==='kling'){
      const job=await submitReservedFalJob(env,reserved,p,async()=>{
        const urls=await Promise.all(verified.map(({ref,bytes})=>falUploadImage(env.FAL_KEY,bytes,ref.mime)));
        return buildImageModelInput(p,urls,prompt);
      });
      return json({job:jobView(job)},202);
    }
    let accepted=false,started=false,cached=false;
    try{
      const urls=verified.map(({ref,bytes})=>'data:'+ref.mime+';base64,'+standardBase64(bytes));
      const input=buildImageModelInput(p,urls,prompt);started=true;
      const result=await requestFlash(env.OPENROUTER_API_KEY,input);accepted=true;
      await env.LAB_MEDIA.put(owner+'/pending-images/'+reserved.id+'.json',JSON.stringify(result),{httpMetadata:{contentType:'application/json'}});cached=true;
      await run(env,"UPDATE jobs SET state='saving',provider_id='openrouter-image',updated_at=? WHERE id=?",now(),reserved.id);
      await saveFlashResult(env,reserved);
    }catch(e){
      const state=cached?'saving':accepted||started&&e.definite!==true?'uncertain':'failed';
      await run(env,'UPDATE jobs SET state=?,provider_id=COALESCE(?,provider_id),error=?,updated_at=? WHERE id=?',state,cached?'openrouter-image':null,String(e.message||'OpenRouter image request failed.').slice(0,500),now(),reserved.id);
      if(state==='failed')await run(env,'DELETE FROM spend WHERE job_id=?',reserved.id);
    }
    return json({job:jobView(await first(env,'SELECT * FROM jobs WHERE id=?',reserved.id))},202);
  }
  if(path==='/api/gemini/jobs'&&method==='POST') {
    if(!env.GEMINI_API_KEY)fail(503,'Gemini API key is not configured on this Worker.');
    const data=await body(request),p=parameters(data.settings);
    if(p.provider!=='gemini'||p.engine!=='gemini'||(!p.prompt&&!canUseReferenceGuidance(p.referenceRoles)))fail(400,'Choose Nano Banana Pro and add a direction, or assign a Base image and the properties to copy.');
    const count=Number(data.count||1),max=p.processing==='batch'?20:1;
    if(!Number.isInteger(count)||count<1||count>max)fail(400,p.processing==='batch'?'Batch supports 1 to 20 images.':'Normal mode submits one Nano Banana Pro image per request.');
    if(p.processing==='normal'){
      const geminiSql="(COALESCE(json_extract(params,'$.provider'),'')='gemini' OR COALESCE(json_extract(params,'$.engine'),'')='gemini' OR COALESCE(json_extract(params,'$.model'),'') LIKE 'gemini-%')";
      const interrupted=(await first(env,"SELECT COUNT(*) AS n FROM jobs WHERE owner_id=? AND state='uncertain' AND "+geminiSql,owner)).n;
      if(interrupted)fail(409,'No generation submitted: a Gemini request is interrupted. Resolve that Gemini request after checking Google AI Studio. Seedream and SpicyAPI remain available.');
      const active=(await first(env,"SELECT COUNT(*) AS n FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','uncertain') AND "+geminiSql+" AND COALESCE(json_extract(params,'$.processing'),'normal')!='batch'",owner)).n;
      if(active>=CONCURRENCY.image)fail(409,'No generation submitted: '+active+' / '+CONCURRENCY.image+' Nano Banana Pro slots are already active. Saving results do not use generation slots.');
    }
    if((await first(env,'SELECT COUNT(*) AS n FROM jobs WHERE owner_id=?',owner)).n+count>500)fail(409,'History limit reached. Delete old records first.');
    const c=await config(env,owner),limit=c?.daily_limit_microusd||10000000,t=now(),day=Math.floor(t/86400000)*86400000,estimate=geminiEstimateMicros(p),totalEstimate=estimate*count;
    const spent=(await first(env,'SELECT COALESCE(SUM(estimate_microusd),0) AS n FROM spend WHERE owner_id=? AND created_at>=?',owner,day)).n;
    if(spent+totalEstimate>limit)fail(409,'No generation submitted: this Nano Banana Pro request would exceed your Lab daily spending limit.');
    const prepared=await geminiParts(env,owner,p,data.referenceSourceIds||[]),primary=prepared.refs[0]||null;
    if(p.processing==='batch'&&prepared.totalBytes*count*1.38>18*1024*1024)fail(413,'This Batch would exceed Google inline batch size because the reference images are repeated for each request. Use fewer images, fewer references, or Normal mode.');
    const ids=Array.from({length:count},()=>crypto.randomUUID());
    for(let i=0;i<count;i++){
      const params={...p,referenceSourceIds:prepared.refs.map(a=>a.id),batchIndex:i,batchCount:count};
      await run(env,"INSERT INTO jobs(id,owner_id,source_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,?, 'submitting',?,?,?)",ids[i],owner,primary?.id||null,JSON.stringify(params),estimate,t+i,t+i);
      await run(env,'INSERT INTO spend(job_id,owner_id,estimate_microusd,created_at) VALUES(?,?,?,?)',ids[i],owner,estimate,t+i);
    }
    if(p.processing==='normal'){
      const id=ids[0],j=await first(env,'SELECT * FROM jobs WHERE id=?',id);
      try{
        const response=await geminiFetch(env,'/models/'+GEMINI_MODEL+':generateContent',{method:'POST',body:geminiGenerateRequest(p,prepared.parts),timeout:180000});
        await run(env,"UPDATE jobs SET provider_id='gemini-standard',state='saving',updated_at=? WHERE id=?",now(),id);
        await saveGeminiImage(env,{...j,provider_id:'gemini-standard'},response);
      }catch(e){await run(env,'UPDATE jobs SET state=?,error=?,updated_at=? WHERE id=?',e.definite===false?'uncertain':'failed',String(e.message||'Gemini generation failed.').slice(0,500),now(),id);}
      return json({jobs:[jobView(await first(env,'SELECT * FROM jobs WHERE id=?',id))]},202);
    }
    const requests=ids.map((id,i)=>({request:geminiGenerateRequest(p,prepared.parts),metadata:{key:id,index:i}}));
    try{
      const created=await geminiFetch(env,'/models/'+GEMINI_MODEL+':batchGenerateContent',{method:'POST',body:{batch:{display_name:'PV Lab '+new Date(t).toISOString(),input_config:{requests:{requests}}}},timeout:30000});
      const name=created?.name;if(typeof name!=='string'||!/^batches\/[A-Za-z0-9._-]+$/.test(name))throw new Error('Gemini did not return a valid batch job name.');
      await run(env,"UPDATE jobs SET provider_id=?,state='queued',updated_at=? WHERE owner_id=? AND id IN ("+ids.map(()=>'?').join(',')+")",name,now(),owner,...ids);
    }catch(e){
      const state=e.definite===false?'uncertain':'failed',msg=String(e.message||'Gemini batch submission failed.').slice(0,500);
      for(const id of ids)await run(env,'UPDATE jobs SET state=?,error=?,updated_at=? WHERE id=?',state,msg,now(),id);
    }
    const jobs=[];for(const id of ids)jobs.push(jobView(await first(env,'SELECT * FROM jobs WHERE id=?',id)));
    return json({jobs},202);
  }

  if(path==='/api/fal/pose-preview'&&method==='POST'){
    if(!env.FAL_KEY)fail(503,'fal.ai is not configured on this Worker.');
    const data=await body(request),pose=await source(env,owner,data.poseSourceId);
    const map=await createFalPoseMap(env,owner,url,pose,null);
    return json({assetId:map.id,billingNote:'DWPose preview uses fal.ai metered compute and is billed by fal.ai separately from the Lab image estimate.'},201);
  }
  if(path==='/api/fal/soul-pro'&&method==='POST'){
    if(!env.FAL_KEY)fail(503,'fal.ai is not configured on this Worker.');
    const data=await body(request),p=parameters(data.settings);
    if(p.provider!=='fal'||p.engine!=='soulpro'||p.mode!=='identity-edit')fail(400,'Choose PV Soul Pro Identity Edit.');
    const base=await source(env,owner,data.sourceId);
    if(!base.mime?.startsWith('image/'))fail(400,'PV Soul Pro base must be an image.');
    let identityIds=Array.isArray(data.referenceSourceIds)&&data.referenceSourceIds.length?data.referenceSourceIds:null;
    if(!identityIds){
      const pack=await first(env,'SELECT refs FROM packs WHERE owner_id=? AND name=? ORDER BY created_at DESC LIMIT 1',owner,SOUL_PRO_IDENTITY_PACK);
      if(pack)identityIds=JSON.parse(pack.refs).map(r=>r.id);
    }
    if(!identityIds?.length)fail(409,'Set the persistent Nina identity once before using PV Soul Pro.');
    const refs=await sources(env,owner,identityIds,4);
    if(refs.some(a=>!a.mime?.startsWith('image/')))fail(400,'PV Soul Pro identity references must be images.');
    p.referenceSourceIds=refs.map(a=>a.id);p.referenceRoles=refs.map(a=>({name:a.filename,role:'identity',note:''}));
    if([base,...refs].reduce((n,a)=>n+a.bytes,0)>14*1024*1024)fail(413,'PV Soul Pro inputs exceed the 14 MiB total-input limit. Use smaller identity images.');
    p.inputTransport='fal-cdn';
    const estimate=soulProEstimateMicros(p),reserved=await reserveFalImageJob(env,owner,base.id,p,estimate);
    const job=await submitReservedFalJob(env,reserved,p,async()=>{
      const assets=[base,...(p.soulProModel==='kontextmax'?refs.slice(0,3):refs)];
      const uploaded=await Promise.allSettled(assets.map(async a=>falUploadImage(env.FAL_KEY,await falImageBytes(env,a),a.mime)));
      const failed=uploaded.find(r=>r.status==='rejected');if(failed)throw failed.reason;
      const urls=uploaded.map(r=>r.value);
      return buildSoulProInput(p,{sourceUrl:urls[0],identityUrls:urls.slice(1)});
    });
    return json({job:jobView(job)},202);
  }
  if(path==='/api/fal/controlled-pose'&&method==='POST'){
    if(!env.FAL_KEY)fail(503,'fal.ai is not configured on this Worker.');
    const data=await body(request),p=parameters(data.settings);
    if(p.provider!=='fal'||p.engine!=='fal'||p.mode!=='controlled-pose')fail(400,'Choose Controlled Pose and add a prompt.');
    const refs=await sources(env,owner,data.referenceSourceIds,5),roles=controlledPoseRefs(p.referenceRoles,refs.length,{fail});
    p.referenceSourceIds=refs.map(a=>a.id);p.referenceRoles=p.referenceRoles.slice(0,refs.length);
    const pose=refs[roles.pose],identity=roles.identity.map(i=>refs[i]);
    const poseMap=await createFalPoseMap(env,owner,url,pose,data.poseMapSourceId||null);p.poseMapSourceId=poseMap.id;
    const poseMapUrl=await signedInput(env,url,poseMap.id,86400),identityUrls=await Promise.all(identity.map(a=>signedInput(env,url,a.id,86400)));
    const input=buildControlledPoseInput(p,{poseMapUrl,identityUrls}),estimate=controlledPoseEstimateMicros(p);
    const reserved=await reserveFalImageJob(env,owner,pose.id,p,estimate),job=await submitReservedFalJob(env,reserved,p,input);
    return json({job:jobView(job)},202);
  }
  if(path==='/api/fal/repair'&&method==='POST'){
    if(!env.FAL_KEY)fail(503,'fal.ai is not configured on this Worker.');
    const data=await body(request),p=parameters(data.settings);
    if(p.provider!=='fal'||p.engine!=='fal'||p.mode!=='controlled-repair')fail(400,'Choose Repair Region and add a prompt.');
    const image=await source(env,owner,data.sourceId),mask=await source(env,owner,data.maskSourceId);
    p.repairSourceId=image.id;p.maskSourceId=mask.id;
    const refs=Array.isArray(data.referenceSourceIds)&&data.referenceSourceIds.length?await sources(env,owner,data.referenceSourceIds,5):[];
    p.referenceSourceIds=refs.map(a=>a.id);p.referenceRoles=(p.referenceRoles||[]).slice(0,refs.length);
    const roles=controlledRepairRefs(p.referenceRoles,refs.length,{fail});
    let poseMap=null;
    if(roles.pose!==null){poseMap=await createFalPoseMap(env,owner,url,refs[roles.pose],data.poseMapSourceId||null);p.poseMapSourceId=poseMap.id;}
    const identity=roles.identity.map(i=>refs[i]),identityUrls=await Promise.all(identity.map(a=>signedInput(env,url,a.id,86400)));
    const input=buildRepairInput(p,{imageUrl:await signedInput(env,url,image.id,86400),maskUrl:await signedInput(env,url,mask.id,86400),poseMapUrl:poseMap?await signedInput(env,url,poseMap.id,86400):null,identityUrls});
    const estimate=controlledRepairEstimateMicros(p),reserved=await reserveFalImageJob(env,owner,image.id,p,estimate),job=await submitReservedFalJob(env,reserved,p,input);
    return json({job:jobView(job)},202);
  }

  if(path==='/api/quotes'&&method==='POST') {
    const data=await body(request),p=parameters(data.settings);
    if(!['upscale','reinterpret'].includes(p.mode)&&!p.prompt&&!(supportsReferenceGuidance(p)&&canUseReferenceGuidance(p.referenceRoles)))fail(400,'Add a prompt before generating, or assign a Base image and the properties to copy.');
    if(p.provider==='higgsfield'&&p.mode==='extend')return json(await quoteVideoExtension(env,owner,data,p,url,hfDeps()));
    if(p.provider==='fal'&&p.mode==='upscale'){
      if(!env.FAL_KEY)fail(503,'fal.ai upscaling is not configured on this Worker.');
      const {primary,input,prepared}=await prepareInput(env,owner,data,p,url),estimate=falUpscaleEstimateMicros(p),id=crypto.randomUUID(),expires=now()+290000;
      const payload={model:p.model,input,source:{id:primary.id,mime:primary.mime,bytes:prepared.bytes.length,sha256:prepared.sha256}};
      await run(env,'INSERT INTO quotes(id,owner_id,source_id,params,estimate_microusd,expires_at,vendor_quote_id,expected_cost,payload) VALUES(?,?,?,?,?,?,?,?,?)',id,owner,primary.id,JSON.stringify(p),estimate,expires,'fal-upscale-v1',String(estimate/1000000),JSON.stringify(payload));
      return json({id,estimatedUsd:estimate/1000000,maxUsd:estimate/1000000,expiresAt:expires,settings:p,provider:'fal.ai',priceIsEstimate:true,requiresPriceReview:true,notice:'Estimated from the verified source dimensions and published Topaz output-megapixel pricing. The Lab reserves this estimate only when you submit; it is not a provider price cap. fal.ai billing remains authoritative. No upscale was submitted.'});
    }
    if(p.provider==='fal'&&p.type==='video'){
      if(!env.FAL_KEY)fail(503,'fal.ai video is not configured on this Worker.');
      const {primary,input}=await prepareInput(env,owner,data,p,url),estimate=falVideoEstimateMicros(p),id=crypto.randomUUID(),expires=now()+290000,payload={model:p.model,input};
      await run(env,'INSERT INTO quotes(id,owner_id,source_id,params,estimate_microusd,expires_at,vendor_quote_id,expected_cost,payload) VALUES(?,?,?,?,?,?,?,?,?)',id,owner,primary?.id||null,JSON.stringify(p),estimate,expires,'fal-direct-video',String(estimate/1000000),JSON.stringify(payload));
      return json({id,estimatedUsd:estimate/1000000,maxUsd:estimate/1000000,expiresAt:expires,settings:p,provider:'fal.ai',priceIsEstimate:true,notice:'fal.ai does not return a bound preflight quote for this route. This is the current pricing estimate for the selected duration, resolution and supplied references; fal.ai billing remains authoritative.'});
    }
    const {key}=await requireConfigured(env,owner);
    const {primary,input}=await prepareInput(env,owner,data,p,url);
    if(p.type==='video'&&Array.isArray(input.reference_image_urls)&&p.referenceSourceIds?.length){
      const ids=data.transferSourceIds??p.referenceSourceIds;
      if(!Array.isArray(ids)||ids.length!==p.referenceSourceIds.length||new Set(ids).size!==ids.length)fail(400,'Prepared video references must match the selected images in order.');
      const transfers=await sources(env,owner,ids,p.engine==='seedance'?30:10);
      p.transferSourceIds=transfers.map(a=>a.id);
      input.reference_image_urls=await stageImageReferences(env,owner,p.transferSourceIds,key,p.engine==='seedance'?30:10);
    }
    if(p.type==='image'){
      const originals=['upscale','reinterpret'].includes(p.mode)?[primary.id]:p.referenceSourceIds;
      if(originals.length){
        const ids=data.transferSourceIds??originals;
        if(!Array.isArray(ids)||ids.length!==originals.length||new Set(ids).size!==ids.length)fail(400,'Working copies must match the original images in order.');
        const transfers=await sources(env,owner,ids);
        const originalsData=await sources(env,owner,originals);
        p.transferSourceIds=transfers.map(a=>a.id);
        p.transferNotes=transfers.map((a,i)=>a.id===originals[i]?'':originalsData[i].filename+': original '+(originalsData[i].bytes/1048576).toFixed(2)+' MiB; provider working copy '+(a.bytes/1048576).toFixed(2)+' MiB.').filter(Boolean);
        const uris=await stageImageReferences(env,owner,p.transferSourceIds,key);
        if(['upscale','reinterpret'].includes(p.mode))input.image_url=uris[0];else input.image_urls=uris;
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
    const q=await first(env,'SELECT * FROM quotes WHERE id=? AND owner_id=? AND expires_at>?',quoteId,owner,now());
    if(!q)fail(409,'Quote expired. Review the cost again.');
    const params=JSON.parse(q.params||'{}'),savedPayload=JSON.parse(q.payload);
    if(params.provider==='higgsfield'&&params.mode==='extend')return json({job:jobView(await submitVideoExtension(env,owner,q,params,savedPayload,hfDeps()))},202);
    if(params.provider==='fal'&&params.mode==='upscale')return json({job:jobView(await submitFalUpscaleQuote(env,owner,q,params,savedPayload))},202);
    if(params.provider==='fal'&&params.type==='video'){
      if(!env.FAL_KEY)fail(503,'fal.ai video is not configured on this Worker.');
      for(const assetId of linkedSourceIds(q))await source(env,owner,assetId);
      const c=await config(env,owner),limit=c?.daily_limit_microusd||10000000,id=crypto.randomUUID(),t=now(),day=Math.floor(t/86400000)*86400000;
      const falSql="COALESCE(json_extract(params,'$.provider'),'')='fal'";
      const inserted=await run(env,"INSERT INTO jobs(id,owner_id,source_id,quote_id,params,state,estimate_microusd,created_at,updated_at) SELECT ?,?,?,?,?,'submitting',?,?,? WHERE NOT EXISTS(SELECT 1 FROM jobs WHERE owner_id=? AND state='uncertain' AND "+falSql+") AND (SELECT COUNT(*) FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','uncertain') AND "+falSql+" AND CASE WHEN json_extract(params,'$.type')='image' THEN 'image' ELSE 'video' END='video')<? AND (SELECT COALESCE(SUM(estimate_microusd),0) FROM spend WHERE owner_id=? AND created_at>=?)+?<=?",id,owner,q.source_id,q.id,q.params,q.estimate_microusd,t,t,owner,owner,CONCURRENCY.video,owner,day,q.estimate_microusd,limit);
      if(!inserted.meta.changes){
        const uncertain=(await first(env,"SELECT COUNT(*) AS n FROM jobs WHERE owner_id=? AND state='uncertain' AND "+falSql,owner)).n;
        const active=(await first(env,"SELECT COUNT(*) AS n FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','uncertain') AND "+falSql+" AND CASE WHEN json_extract(params,'$.type')='image' THEN 'image' ELSE 'video' END='video'",owner)).n;
        const spent=(await first(env,'SELECT COALESCE(SUM(estimate_microusd),0) AS n FROM spend WHERE owner_id=? AND created_at>=?',owner,day)).n;
        if(uncertain)fail(409,'No generation submitted: a fal.ai request is interrupted. Resolve it in History before retrying.');
        if(active>=CONCURRENCY.video)fail(409,'No generation submitted: '+active+' / '+CONCURRENCY.video+' fal.ai video slots are already active.');
        if(spent+q.estimate_microusd>limit)fail(409,'No generation submitted: this fal.ai video estimate would exceed your Lab daily spending limit.');
        fail(409,'No generation submitted because fal.ai video capacity changed. Refresh History and try again.');
      }
      try{
        const requestId=await falSubmit(params.model,env.FAL_KEY,savedPayload.input);
        await run(env,"UPDATE jobs SET provider_id=?,state='queued',updated_at=? WHERE id=?",requestId,now(),id);
      }catch(e){
        const uncertain=e?.uncertain===true||e?.definite===false,state=uncertain?'uncertain':'failed';
        const msg=uncertain?'fal.ai submission status is uncertain. Check the fal dashboard before retrying to avoid a duplicate charge.':String(e?.message||'fal.ai rejected the video request.').slice(0,500);
        if(uncertain)await run(env,'UPDATE jobs SET state=?,error=?,updated_at=? WHERE id=?',state,msg,now(),id);
        else await env.LAB_DB.batch([
          stmt(env,'UPDATE jobs SET state=?,error=?,updated_at=? WHERE id=?',state,msg,now(),id),
          stmt(env,'DELETE FROM spend WHERE job_id=?',id)
        ]);
      }
      return json({job:jobView(await first(env,'SELECT * FROM jobs WHERE id=?',id))},202);
    }
    const {c,key}=await requireConfigured(env,owner);
    if(savedPayload.model===STILL_EDIT&&(!Array.isArray(savedPayload.input?.image_urls)||!savedPayload.input.image_urls.length||savedPayload.input.image_urls.some(uri=>!FILE_URI.test(uri))))
      fail(409,'This image quote uses the old reference transfer. Review a fresh price to verify your images before generating. Nothing was submitted.');
    if(savedPayload.model===UPSCALER&&!FILE_URI.test(savedPayload.input?.image_url||''))fail(409,'Review a fresh upscale quote to verify the input file. Nothing was submitted.');
    for(const assetId of linkedSourceIds(q))await source(env,owner,assetId);
    const id=crypto.randomUUID(),t=now(),day=Math.floor(t/86400000)*86400000;
    try {
      const kind=JSON.parse(q.params).type==='image'?'image':'video';
      // Reserve both a per-kind slot and spending atomically. Concurrent tabs cannot overbook.
      // Other providers do not consume SpicyAPI slots or block them with interrupted jobs, including legacy rows without a provider field.
      const spicySql="NOT (COALESCE(json_extract(params,'$.provider'),'') IN ('gemini','fal','higgsfield') OR COALESCE(json_extract(params,'$.engine'),'') IN ('gemini','fal','soulpro','h3maxfal','omni') OR COALESCE(json_extract(params,'$.model'),'') LIKE 'gemini-%' OR COALESCE(json_extract(params,'$.model'),'') LIKE 'fal-ai/%')";
      const inserted=await run(env,"INSERT INTO jobs(id,owner_id,source_id,quote_id,params,state,estimate_microusd,created_at,updated_at) SELECT ?,?,?,?,?,'submitting',?,?,? WHERE NOT EXISTS(SELECT 1 FROM jobs WHERE owner_id=? AND state='uncertain' AND "+spicySql+") AND (SELECT COUNT(*) FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','uncertain') AND "+spicySql+" AND CASE WHEN json_extract(params,'$.type')='image' THEN 'image' ELSE 'video' END=?)<? AND (SELECT COALESCE(SUM(estimate_microusd),0) FROM spend WHERE owner_id=? AND created_at>=?)+?<=?",id,owner,q.source_id,q.id,q.params,q.estimate_microusd,t,t,owner,owner,kind,CONCURRENCY[kind],owner,day,q.estimate_microusd,c.daily_limit_microusd);
      if(!inserted.meta.changes){
        const uncertain=(await first(env,"SELECT COUNT(*) AS n FROM jobs WHERE owner_id=? AND state='uncertain' AND "+spicySql,owner)).n;
        const active=(await first(env,"SELECT COUNT(*) AS n FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','uncertain') AND "+spicySql+" AND CASE WHEN json_extract(params,'$.type')='image' THEN 'image' ELSE 'video' END=?",owner,kind)).n;
        const spent=(await first(env,'SELECT COALESCE(SUM(estimate_microusd),0) AS n FROM spend WHERE owner_id=? AND created_at>=?',owner,day)).n;
        if(uncertain)fail(409,'No generation submitted: a SpicyAPI request is interrupted. Resolve that SpicyAPI request in History before retrying.');
        if(active>=CONCURRENCY[kind])fail(409,'No generation submitted: '+active+' / '+CONCURRENCY[kind]+' '+kind+' slots are already active on SpicyAPI.');
        if(spent+q.estimate_microusd>c.daily_limit_microusd)fail(409,'No generation submitted: your Lab daily spending limit would be exceeded. Increase the daily limit or wait for the UTC reset.');
        fail(409,'No generation submitted because capacity changed while the request was being reserved. Refresh History and try once more.');
      }
    }catch(e){old=await first(env,'SELECT * FROM jobs WHERE quote_id=? AND owner_id=?',quoteId,owner);if(old)return json({job:jobView(old)});throw e;}
    // Reuse the exact input URL and settings covered by the quote, never silently reprice.
    const payload={...JSON.parse(q.payload),quoteId:q.vendor_quote_id,expectedCost:q.expected_cost};
    let providerAccepted=false;
    try {
      const result=await vendorRequest('/jobs/createTask',key,payload,id);
      providerAccepted=true;
      if(typeof result.taskId!=='string'||!result.taskId||result.taskId.length>200)throw new Error('Missing provider task ID.');
      await run(env,"UPDATE jobs SET provider_id=?,state='queued',updated_at=? WHERE id=?",result.taskId,now(),id);
    }catch(e){
      const rejected=e.definite===true&&!providerAccepted;
      if(rejected)await env.LAB_DB.batch([
        stmt(env,"UPDATE jobs SET state='failed',error=?,updated_at=? WHERE id=?",e.message,now(),id),
        stmt(env,'DELETE FROM spend WHERE job_id=?',id)
      ]);
      else await run(env,"UPDATE jobs SET state='uncertain',error=?,updated_at=? WHERE id=?",'Submission status is uncertain. Do not resubmit: first check the provider console to avoid a duplicate charge.',now(),id);
    }
    return json({job:jobView(await first(env,'SELECT * FROM jobs WHERE id=?',id))},202);
  }
  if(path==='/api/jobs'&&method==='GET'&&url.searchParams.get('library')==='1'){
    const data=await libraryJobs(env,owner,url,{rows,uid,fail,jobView});
    const active=await rows(env,"SELECT * FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','saving','uncertain') ORDER BY created_at,id",owner);
    const activeJobs=active.map(jobView);return json({...data,activeJobs,active:activeJobs[0]||null,concurrency:CONCURRENCY});
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
  if(path==='/api/jobs/bulk-delete'&&method==='POST'){
    const data=await body(request),ids=Array.isArray(data.ids)?[...new Set(data.ids)]:[];
    if(ids.length<1||ids.length>100)fail(400,'Select between 1 and 100 History items.');
    const jobs=[];
    for(const value of ids){const id=uid(value),j=await first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',id,owner);if(!j)fail(404,'One selected History item no longer exists. Refresh History.');if(ACTIVE.has(j.state))fail(409,'Active or uncertain jobs cannot be bulk deleted.');jobs.push(j);}
    for(const j of jobs)await deleteJobRecord(env,owner,j);
    return json({ok:true,deleted:jobs.length});
  }
  if(path.startsWith('/api/jobs/')) {
    const id=uid(path.split('/')[3]);let j=await first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',id,owner);if(!j)fail(404,'Job not found.');
    if(path.endsWith('/reconcile')&&method==='POST'){
      const p=JSON.parse(j.params||'{}');
      const soulPro=p.engine==='soulpro'&&['inline-data-uri','fal-cdn'].includes(p.inputTransport)&&Object.hasOwn(SOUL_PRO_MODELS,p.soulProModel)&&SOUL_PRO_MODELS[p.soulProModel].id===p.model;
      const upscale=p.mode==='upscale'&&['topaz/upscale/image/precision','topaz/upscale/image/generative'].includes(p.model);
      if(j.state!=='uncertain'||j.provider_id||p.provider!=='fal'||!soulPro&&!upscale)fail(409,'Only interrupted Soul Pro or Topaz requests without a provider task can be checked here.');
      if(!env.FAL_KEY)fail(503,'fal.ai is not configured on this Worker.');
      let input,match;
      if(p.inputTransport==='fal-cdn'||upscale){
        const q=await first(env,'SELECT payload FROM quotes WHERE id=? AND owner_id=?',j.quote_id,owner),saved=JSON.parse(q?.payload||'{}');
        input=upscale?saved.submittedInput:saved.input;
        if(saved.model!==p.model||!input||typeof input!=='object'||Array.isArray(input))fail(409,'The original FAL submission input is unavailable. The request remains interrupted.');
      }else{
        if(!Array.isArray(p.referenceSourceIds)||p.referenceSourceIds.length<1||p.referenceSourceIds.length>4||new Set(p.referenceSourceIds).size!==p.referenceSourceIds.length)fail(409,'The original identity references are unavailable. The request remains interrupted.');
        // Keep reconciliation for historical inline requests. Never re-upload or
        // rebuild a new request from the current identity pack during recovery.
        const base=await source(env,owner,j.source_id),refs=await sources(env,owner,p.referenceSourceIds,4);
        const preparedBase=await falImageDataUri(env,base),identityUrls=[];let inlineBytes=preparedBase.bytes;
        for(const ref of refs){const prepared=await falImageDataUri(env,ref);inlineBytes+=prepared.bytes;if(inlineBytes>14*1024*1024)fail(413,'The original input is too large to verify safely. The request remains interrupted.');identityUrls.push(prepared.url);}
        input=buildSoulProInput(p,{sourceUrl:preparedBase.url,identityUrls});
      }
      try{match=await findFalRequest({key:env.FAL_KEY,endpoint:p.model,input,createdAt:j.created_at,updatedAt:j.updated_at,nowMs:now()});}
      catch(e){if(e?.code?.startsWith('history_'))fail(e.status,e.message);throw e;}
      // A paid provider request may be claimed by only one local job, including
      // when another history item submitted identical input around the same time.
      await run(env,"UPDATE jobs SET provider_id=?,state='queued',error='',updated_at=? WHERE id=? AND owner_id=? AND state='uncertain' AND provider_id IS NULL AND NOT EXISTS(SELECT 1 FROM jobs other WHERE other.id<>? AND other.provider_id=?)",match.requestId,now(),id,owner,id,match.requestId);
      j=await first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',id,owner);
      if(j.state==='uncertain'&&!j.provider_id)fail(409,'That FAL request is already linked to another History item. This request remains interrupted.');
      await refreshJob(env,j);
      return json({job:jobView(await first(env,'SELECT * FROM jobs WHERE id=? AND owner_id=?',id,owner))});
    }
    if(path.endsWith('/resolve')&&method==='POST') {
      const data=await body(request);if(j.state!=='uncertain'||data.confirm!==true)fail(409,'Confirm you checked the provider dashboard first.');
      await run(env,"UPDATE jobs SET state='resolved',updated_at=?,error=? WHERE id=?",now(),'Owner resolved the interrupted request. No generation was resubmitted.',id);return json({ok:true});
    }
    if(path.endsWith('/recover')&&method==='POST'){
      const p=JSON.parse(j.params||'{}');if(j.state!=='failed'||p.provider!=='fal'||!j.provider_id)fail(409,'Only failed fal.ai jobs with a provider task can be recovered.');
      try{if(!await recoverFalOutput(env,j,p))fail(409,'fal.ai has no downloadable output for this task.');}
      catch(e){if(e instanceof HttpError)throw e;const detail=String(e?.message||'fal.ai output could not be recovered.').replace(/[\r\n]+/g,' ').slice(0,700);fail(409,detail);}
      return json({job:jobView(await first(env,'SELECT * FROM jobs WHERE id=?',id))});
    }
    if(method==='GET') {await refreshJob(env,j);return json({job:jobView(await first(env,'SELECT * FROM jobs WHERE id=?',id))});}
    if(method==='DELETE') {await deleteJobRecord(env,owner,j);return json({ok:true});}
  }
  fail(404,'Not found.');
}
async function maintenance(env) {
  await backfillFailureDetails(env);
  await soulMaintenance(env,soulDeps());
  await run(env,"UPDATE jobs SET state='uncertain',error='Submission was interrupted. Check the provider dashboard before retrying.',updated_at=? WHERE state='submitting' AND updated_at<?",now(),now()-120000);
  const pending=await rows(env,"SELECT * FROM jobs WHERE state IN ('queued','running','saving') ORDER BY last_poll LIMIT 5");
  for(const j of pending){const owner=await env.OWNER_DB.prepare("SELECT id FROM users WHERE id=? AND role='owner' AND auth_provider='clerk'").bind(j.owner_id).first();if(owner||await isLabCustomer(env,j.owner_id))await refreshJob(env,j);}
  await run(env,'DELETE FROM quotes WHERE expires_at<? AND NOT EXISTS(SELECT 1 FROM jobs WHERE jobs.quote_id=quotes.id)',now());
  const unused=await rows(env,"SELECT * FROM assets WHERE kind='source' AND created_at<? ORDER BY created_at LIMIT 30",now()-86400000);
  for(const a of unused)await pruneSource(env,a.owner_id,a.id);
}
export default {
  async fetch(request,env,ctx) {
    let response;try{response=await route(request,env,ctx);}catch(e){const depleted=/Insufficient PV Lab credits/.test(String(e?.message||''));response=json({error:depleted?'Insufficient PV Lab credits. Add credits before generating.':e instanceof HttpError?e.message:'The Lab could not finish this request. Your stored work is unchanged.'},depleted?402:e instanceof HttpError?e.status:500);}
    return decorate(response,request.headers.get('origin')||'');
  },
  async scheduled(event,env,ctx) {ctx.waitUntil(maintenance(env));}
};


