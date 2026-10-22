import {grainPng} from '../lab-worker/film-finish.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../lab-worker/worker.mjs';
import {grantVerifiedWelcome} from '../lab-worker/welcome-guard.mjs';
import {compileImagePrompt} from '../lab/reference-guidance.js';
import {storedImageDimensions} from '../lab-worker/fal-upscale.mjs';
import {buildSoulProInput} from '../lab-worker/soul-pro.mjs';
import {BERLIN_RAVE_REFERENCES} from '../lab-worker/berlin-rave-references.mjs';
import {DREAMCORE_REFERENCES} from '../lab-worker/dreamcore-references.mjs';
import {SYNTHETIC_ROMANCE_REFERENCES} from '../lab-worker/synthetic-romance-references.mjs';
import {HONG_KONG_REFERENCES} from '../lab-worker/hong-kong-references.mjs';
import {prepareMoodPrompt} from '../lab/moods.js';
const ORIGIN='https://parallelvisionlabel.com',BASE='https://parallel-vision-lab.parallelvision.workers.dev',KEY='sk-spicy-synthetic-test-only-not-a-real-key',CUSTOMER_KEY='sk-spicy-isolated-customer-test-key-not-real';
const keypair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',keypair.publicKey);jwk.kid='test-key';
async function token(subject='user_Owner',extra={}) {const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const a=b({alg:'RS256',kid:'test-key'}),p=b({iss:'https://clerk.parallelvisionlabel.com',sub:subject,azp:ORIGIN,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,...extra});const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keypair.privateKey,new TextEncoder().encode(a+'.'+p));return a+'.'+p+'.'+Buffer.from(signature).toString('base64url');}
class DB {
 constructor(sql=''){this.db=new DatabaseSync(':memory:');this.db.exec(sql);}
 prepare(sql) {
  const db=this.db;
  return {bind(...params) {return {
   first:async()=>db.prepare(sql).get(...params)||null,
   all:async()=>({results:db.prepare(sql).all(...params)}),
   run:async()=>({meta:{changes:Number(db.prepare(sql).run(...params).changes)}})
  };}};
 }
 async batch(statements){this.db.exec('BEGIN');try{const a=[];for(const s of statements)a.push(await s.run());this.db.exec('COMMIT');return a;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
function fixture(){const db=new DB(readFileSync(new URL('../lab-worker/schema.sql',import.meta.url),'utf8')),owner=new DB("CREATE TABLE users(id TEXT,auth_provider TEXT,auth_subject TEXT,role TEXT); INSERT INTO users VALUES('owner-internal','clerk','user_Owner','owner'),('guest','clerk','user_Guest','user');");const objects=new Map();const env={LAB_DB:db,OWNER_DB:owner,LAB_SECRET:'synthetic-test-secret-do-not-use-in-production-01234567890',FAL_KEY:'fal-synthetic-test-key',LAB_MEDIA:{async put(k,value){objects.set(k,new Uint8Array(await new Response(value).arrayBuffer()));},async get(k){if(!objects.has(k))return null;const v=objects.get(k);return{body:new Response(v).body,size:v.length};},async head(k){return objects.has(k)?{size:objects.get(k).length}:null;},async delete(k){objects.delete(k);}}};return{env,objects};}
let calls=[],quotedRequest=null,createCount=0,providerState='queued',createMode='ok',maxPrice='2.700000';
let uploadedReference=null,falState='IN_QUEUE',falSubmitCount=0,falResult422=false,falSubmitMode='ok',falVideoReject=false;
let falUpscaleMode='ok',falPollError=0,falHistoryItems=[],falUploadMode='ok',falUploadCount=0;
globalThis.fetch=async (url,options={})=>{const u=new URL(url);calls.push({url:String(url),options});if(u.pathname==='/.well-known/jwks.json')return Response.json({keys:[jwk]});
 if(u.hostname==='rest.fal.ai'){
  assert.equal(options.method,'POST');assert.equal(u.pathname,'/storage/upload/initiate');
  assert.equal(new Headers(options.headers).get('authorization'),'Key fal-synthetic-test-key');
  assert.equal(options.redirect,'manual');assert.equal(JSON.parse(options.body).file_name,'pv-lab-input.png');
  const id=++falUploadCount;return Response.json({upload_url:'https://v3.fal.media/upload/'+id,file_url:'https://v3.fal.media/files/inputs/'+id+'.png'});
 }
 if(u.hostname==='v3.fal.media'&&options.method==='PUT'){
  assert.equal(new Headers(options.headers).get('authorization'),null);assert.equal(options.redirect,'manual');assert.ok(options.body instanceof Uint8Array);
  if(falUploadMode==='timeout')throw new Error('Synthetic upload timeout');
  if(falUploadMode==='rejected')return new Response('Upload failed',{status:503});
  return new Response(null,{status:200});
 }
 if(u.hostname==='api.fal.ai'){
  assert.equal(options.method,'GET');assert.equal(new Headers(options.headers).get('authorization'),'Key fal-synthetic-test-key');assert.equal(u.pathname,'/v1/models/requests/by-endpoint');assert.equal(u.searchParams.get('expand'),'payloads');return Response.json({items:falHistoryItems,has_more:false,next_cursor:null});
 }
 if(u.hostname==='queue.fal.run'){
  assert.equal(new Headers(options.headers).get('authorization'),'Key fal-synthetic-test-key');
  if(falPollError&&options.method!=='POST')return Response.json({detail:'Synthetic lookup error'},{status:falPollError});
  if(u.pathname.startsWith('/topaz/upscale/')||u.pathname.startsWith('/fal-ai/seedvr/upscale/image')){
    if(options.method==='POST'){
      falSubmitCount++;const input=JSON.parse(options.body);
      assert.match(input.image_url,/^https:\/\/v3\.fal\.media\/files\/inputs\//);
      if(u.pathname.includes('/seedvr/')){
        assert.equal(input.upscale_mode,'factor');assert.equal(input.noise_scale,0.1);
        assert.ok([2,4].includes(input.upscale_factor));assert.ok(['jpg','png'].includes(input.output_format));
        assert.deepEqual(Object.keys(input).sort(),['image_url','noise_scale','output_format','upscale_factor','upscale_mode']);
      }else{
        assert.equal(input.crop_to_fill,false);assert.equal(input.face_enhancement,false);
        assert.ok([2,4].includes(input.upscale_factor));assert.ok(['jpeg','png'].includes(input.output_format));
        assert.deepEqual(Object.keys(input).sort(),['crop_to_fill','face_enhancement','image_url','model','output_format','upscale_factor']);
      }
      if(falUpscaleMode==='timeout')throw new Error('Synthetic submission timeout');
      if(falUpscaleMode==='rejected')return Response.json({detail:'Unsupported test image.'},{status:422});
      if(falUpscaleMode==='missing-id')return Response.json({});
      return Response.json({request_id:'fal_topaz_test_1234567890'});
    }
    if(u.pathname.endsWith('/status'))return Response.json({status:falState});
    return Response.json({image:{url:'https://v3.fal.media/files/test/topaz.png',content_type:'image/png'}});
  }
  const soulPro=u.pathname.includes('/ideogram/v4.5/')||u.pathname.includes('/fal-ai/flux-pro/');
  const h3maxVideo=u.pathname.includes('/minimax/h3-max/');
  if(h3maxVideo){
    if(options.method==='POST'){falSubmitCount++;const input=JSON.parse(options.body);assert.equal(input.enable_safety_checker,true);assert.ok(Array.isArray(input.reference_image_urls));return Response.json({request_id:'fal_h3max_video_1234567890'});}
    if(u.pathname.endsWith('/status'))return Response.json({status:falVideoReject?'COMPLETED':'IN_QUEUE'});
    if(falVideoReject)return Response.json({detail:'Provider rejected the request.'},{status:422});
  }
  if(options.method==='POST'){
    falSubmitCount++;if(falSubmitMode==='timeout')throw new Error('Synthetic timeout');
    if(falSubmitMode==='missing-id')return Response.json({});
    if(u.pathname.includes('flux-general'))return Response.json({request_id:'fal_repair_synthetic_1234567890'});
    if(soulPro){
      const input=JSON.parse(options.body);
      if(u.pathname.includes('/ideogram/v4.5/edit')){
        assert.equal(input.edit_precision,'high');assert.ok(['very_low','low','medium','high'].includes(input.quality));assert.match(input.image_url,/^https:\/\/v3\.fal\.media\/files\/inputs\//);assert.equal(input.reference_image_urls.length,1);assert.match(input.reference_image_urls[0],/^https:\/\/v3\.fal\.media\/files\/inputs\//);assert.equal(input.num_images,1);
      }else{
        assert.ok(input.image_urls.length>=2&&input.image_urls.length<=4);assert.ok(input.image_urls.every(x=>/^https:\/\/v3\.fal\.media\/files\/inputs\//.test(x)));assert.equal(input.guidance_scale,3.5);assert.equal(input.enhance_prompt,false);assert.equal(input.num_images,1);
      }
      assert.match(input.prompt,/BASE SOURCE IMAGE/i);assert.match(input.prompt,/identity reference/i);
      return Response.json({request_id:u.pathname.includes('/ideogram/')?'fal_soulpro_ideogram_1234567890':'fal_soulpro_kontext_1234567890'});
    }
    const input=JSON.parse(options.body);assert.match(input.image_data_url,/\/soul-dataset\//);assert.equal(input.steps,1000);assert.equal(input.learning_rate,u.pathname.includes('z-image-trainer')?0.0001:0.0005);if(u.pathname.includes('z-image-trainer'))assert.equal(input.training_type,'content');assert.match(input.default_caption,/^photo of pv_/);return Response.json({request_id:'fal_request_synthetic_1234567890'});
  }
  if(u.pathname.endsWith('/status'))return Response.json({status:falState,logs:falState==='IN_PROGRESS'?[{message:'training step 500'}]:[]});
  if(u.pathname.includes('/requests/')&&falResult422)return Response.json({detail:'The provided image URL has expired.'},{status:422});
  if(u.pathname.includes('/requests/')&&soulPro)return Response.json({images:[{url:'https://v3.fal.media/files/test/soulpro.png',content_type:'image/png'}]});
  if(u.pathname.includes('/requests/'))return Response.json({diffusers_lora_file:{url:'https://v3b.fal.media/files/test/nina.safetensors',content_type:'application/octet-stream',file_name:'nina.safetensors',file_size:8},config_file:{url:'https://v3b.fal.media/files/test/config.json'}});
 }
 if(u.hostname==='v3.fal.media'){const bytes=new Uint8Array([137,80,78,71,13,10,26,10,0]);return new Response(bytes,{headers:{'content-type':'image/png','content-length':String(bytes.length)}});}
 if(u.hostname==='v3b.fal.media'){const bytes=new Uint8Array([1,2,3,4,5,6,7,8]);return new Response(bytes,{headers:{'content-type':'application/octet-stream','content-length':String(bytes.length)}});}
if(u.hostname==='cdn.spicyapi.ai'){assert.ok(!options.headers?.Authorization);if(u.pathname.endsWith('.png'))return new Response(new Uint8Array([137,80,78,71,13,10,26,10,0]),{headers:{'content-type':'image/png'}});return new Response(new Uint8Array([0,0,0,24,102,116,121,112,109,112,52,50]),{headers:{'content-type':'video/mp4'}});}
 if(u.hostname==='test.r2.cloudflarestorage.com'){assert.equal(options.method,'PUT');assert.equal(new Headers(options.headers).get('authorization'),null);uploadedReference=new Uint8Array(options.body);return new Response(null,{status:200});}
 assert.equal(u.hostname,'api.spicyapi.ai');assert.ok([KEY,CUSTOMER_KEY].some(key=>options.headers.Authorization==='Bearer '+key),'Only known synthetic keys may call SpicyAPI');
 if(u.pathname.endsWith('/chat/credit'))return Response.json({code:200,data:{available:'10',held:'0',total:'10'}});
 if(u.pathname.endsWith('/common/upload-url')){const input=JSON.parse(options.body);return Response.json({code:200,data:{fileId:'fil_synthetic_reference',uploadUrl:'https://test.r2.cloudflarestorage.com/reference',method:'PUT',headers:{'Content-Type':input.contentType,'Content-Length':String(input.bytes)},maxBytes:10485760,expiresAt:new Date(Date.now()+1200000).toISOString()}});}
 if(u.pathname.endsWith('/files/fil_synthetic_reference/commit')){assert.equal(options.method,'POST');return Response.json({code:200,data:{fileId:'fil_synthetic_reference',status:'ready',bytes:uploadedReference.length,contentType:'image/png',sha256:Buffer.from(await crypto.subtle.digest('SHA-256',uploadedReference)).toString('hex'),uri:'spicy://f/fil_synthetic_reference',expiresAt:new Date(Date.now()+86400000).toISOString()}});}
 if(u.pathname.endsWith('/jobs/quote')){quotedRequest=JSON.parse(options.body);return Response.json({code:200,data:{quoteId:'synthetic-quote',estimatedCost:maxPrice,maxCharge:maxPrice,currency:'USD',expiresAt:new Date(Date.now()+300000).toISOString()}});}
 if(u.pathname.endsWith('/jobs/createTask')){createCount++;const payload=JSON.parse(options.body);assert.deepEqual({model:payload.model,input:payload.input,
  ...(quotedRequest?.callBackUrl?{callBackUrl:payload.callBackUrl}:{})},quotedRequest);assert.equal(payload.quoteId,'synthetic-quote');assert.equal(payload.expectedCost,maxPrice);assert.match(options.headers['Idempotency-Key'],/^[a-f0-9-]{36}$/);if(createMode==='timeout')throw new Error('simulated interrupted network');if(createMode==='pricechange')return Response.json({code:40901,msg:'quote changed',data:null},{status:409});return Response.json({code:200,data:{taskId:'job_synthetic',state:'queued'}},{status:202});}
 if(u.pathname.endsWith('/jobs/recordInfo'))return Response.json({code:200,data:{taskId:'job_synthetic',state:providerState,settled:providerState==='succeeded',cost:'2.7',output:{assets:[(quotedRequest?.model?.includes('seedream')||quotedRequest?.model?.includes('image-upscaler')||quotedRequest?.model?.includes('lora'))?{mime:'image/png',url:'https://cdn.spicyapi.ai/test.png'}:{mime:'video/mp4',url:'https://cdn.spicyapi.ai/test.mp4'}]}}});
 throw new Error('Unmocked network request: '+url);
};
const auth=await token(),guest=await token('user_Guest');
async function req(env,path,{method='GET',data,raw,authToken=auth,headers={}}={}) {const h={Origin:ORIGIN,...(authToken?{Authorization:'Bearer '+authToken}:{}),...headers};if(data!==undefined)h['Content-Type']='application/json';return worker.fetch(new Request(BASE+path,{method,headers:h,body:data!==undefined?JSON.stringify(data):raw}),env,{waitUntil(){}});}
const p={prompt:'A sculpture rotating slowly in a studio',duration:15,resolution:'1080p',aspectRatio:'auto',seed:42,audio:true};
async function setup(env){const r=await req(env,'/api/settings',{method:'POST',data:{apiKey:KEY,enabled:true,termsConfirmed:true,dailyLimitUsd:10}});assert.equal(r.status,200);const x=await req(env,'/api/uploads',{method:'POST',raw:new Uint8Array([137,80,78,71,13,10,26,10,0]),headers:{'Content-Type':'image/png','X-Filename':'source.png'}});assert.equal(x.status,201);return(await x.json()).id;}
async function quote(env,id){const r=await req(env,'/api/quotes',{method:'POST',data:{sourceId:id,settings:p}});assert.equal(r.status,200);return r.json();}
test('Full media GET and HEAD return 200 despite R2 full-object range metadata',async()=>{
  const{env,objects}=fixture(),id=await setup(env);await quote(env,id);
  const input=new URL(quotedRequest.input.image_url),publicPath=input.pathname+input.search;
  const videoId=crypto.randomUUID(),videoKey='test/archived.mp4',videoBytes=new Uint8Array([0,0,0,24,102,116,121,112,109,112,52,50]);
  objects.set(videoKey,videoBytes);
  env.LAB_DB.db.prepare('INSERT INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,?,?,?,?,?)')
    .run(videoId,'owner-internal',videoKey,'video','video/mp4','archived.mp4',videoBytes.length,Date.now());
  const reads=[];
  env.LAB_MEDIA.get=async(k,options)=>{reads.push(options);const bytes=objects.get(k);return{body:new Response(bytes).body,size:bytes.length,range:{offset:0,length:bytes.length}};};
  env.LAB_MEDIA.head=async(k)=>{const size=objects.get(k).length;return{size,range:{offset:0,length:size}};};
  for(const[path,authToken,expected]of [[publicPath,null,[137,80,78,71,13,10,26,10,0]],['/api/assets/'+videoId,auth,[...videoBytes]]]){
    const requests=authToken?[['GET',{}]]:[['GET',{}],['HEAD',{}],['HEAD',{Range:'bytes=0-3'}]];
    for(const[method,headers]of requests){
      const r=await req(env,path,{authToken,method,headers});
      assert.equal(r.status,200);assert.equal(r.headers.get('content-length'),String(expected.length));
      assert.equal(r.headers.get('content-range'),null);assert.equal(r.headers.get('accept-ranges'),'bytes');
      assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],method==='HEAD'?[]:expected);
    }
  }
  delete env.LAB_MEDIA.head;
  const fallback=await req(env,publicPath,{authToken:null,method:'HEAD',headers:{Range:'bytes=0-3'}});
  assert.equal(fallback.status,200);assert.equal(fallback.headers.get('content-range'),null);
  assert.equal(fallback.headers.get('content-length'),'9');assert.equal((await fallback.arrayBuffer()).byteLength,0);
  assert.ok(reads.every(options=>!options.range),'Full GET and HEAD must not request an R2 range');
});
test('Explicit GET byte ranges return 206 and exact bytes for source images and archived videos',async()=>{
  const{env,objects}=fixture(),id=await setup(env);await quote(env,id);
  const input=new URL(quotedRequest.input.image_url),videoId=crypto.randomUUID(),videoKey='test/ranged.mp4';
  const videoBytes=new Uint8Array([0,0,0,24,102,116,121,112,109,112,52,50]);objects.set(videoKey,videoBytes);
  env.LAB_DB.db.prepare('INSERT INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,?,?,?,?,?)')
    .run(videoId,'owner-internal',videoKey,'video','video/mp4','ranged.mp4',videoBytes.length,Date.now());
  env.LAB_MEDIA.get=async(k,options)=>{
    assert.equal(options.range.get('range'),'bytes=2-5');const bytes=objects.get(k);
    return{body:new Response(bytes.slice(2,6)).body,size:bytes.length,range:{offset:2,length:4}};
  };
  for(const[path,authToken,size,expected]of [[input.pathname+input.search,null,9,[78,71,13,10]],['/api/assets/'+videoId,auth,12,[0,24,102,116]]]){
    const r=await req(env,path,{authToken,headers:{Range:'bytes=2-5'}});
    assert.equal(r.status,206);assert.equal(r.headers.get('content-length'),'4');
    assert.equal(r.headers.get('content-range'),`bytes 2-5/${size}`);
    assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],expected);
  }
});
test('PV Soul training ZIP preflight allows its photo-count header',async()=>{
  const{env}=fixture();
  const response=await req(env,'/api/soul/datasets',{method:'OPTIONS',authToken:null,headers:{
    'Access-Control-Request-Method':'POST',
    'Access-Control-Request-Headers':'content-type,x-photo-count'
  }});
  assert.equal(response.status,204);
  const allowed=response.headers.get('access-control-allow-headers')||'';
  assert.match(allowed,/X-Photo-Count/i);
  assert.equal(response.headers.get('access-control-allow-origin'),ORIGIN);
});
test('paused welcome credits still sync contact in background without blocking authenticated session',async()=>{
  const {env}=fixture();
  for(const migration of ['0006-customers-billing','0011-customer-lifecycle','0015-lab-promotional-credits','0023-welcome-guard'])
    env.LAB_DB.db.exec(readFileSync(new URL('../lab-worker/migrations/'+migration+'.sql',import.meta.url),'utf8'));
  Object.assign(env,{LAB_CUSTOMER_SIGNUPS_ENABLED:'true',LAB_WELCOME_CREDITS_ENABLED:'false',LAB_CLERK_SECRET_KEY:'sk_test_background'});
  const previous=globalThis.fetch;let finishLookup,started=false;
  const delayed=new Promise(resolve=>{finishLookup=resolve;});
  globalThis.fetch=async(url,options)=>{
    if(new URL(url).hostname!=='api.clerk.com')return previous(url,options);
    started=true;await delayed;
    return Response.json({id:'user_Guest',primary_email_address_id:'primary',email_addresses:[
      {id:'primary',email_address:'guest@example.com',verification:{status:'verified'}}]});
  };
  const background=[];
  try{
    const response=await worker.fetch(new Request(BASE+'/api/session',{headers:{Origin:ORIGIN,Authorization:'Bearer '+guest}}),env,{waitUntil(p){background.push(p);}});
    assert.equal(response.status,200);assert.equal((await response.json()).balanceCredits,0);
    assert.equal(background.length,1);assert.equal(started,true,'Email lookup started but is still waiting for Clerk');
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM lab_customer_contacts').get().n,0);
    finishLookup();await Promise.all(background);
    assert.equal(env.LAB_DB.db.prepare("SELECT email FROM lab_customer_contacts WHERE customer_id='user_Guest'").get().email,'guest@example.com');
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM lab_credit_entries').get().n,0,'Sync never re-enables paused gifts');
  }finally{finishLookup();await Promise.allSettled(background);globalThis.fetch=previous;}
});
test('Independent Clerk domain authenticates only after signed-in account choice and keeps original credits',async()=>{
  const {env}=fixture(),studio='https://pvlab.studio',issuer='https://clerk.pvlab.studio';
  const newToken=await token('user_New',{iss:issuer,azp:studio});
  const newRequest=(path,options={})=>req(env,path,{authToken:newToken,headers:{Origin:studio},...options});
  assert.equal((await newRequest('/api/session')).status,401,'new issuer is disabled before domain cutover');
  assert.equal((await req(env,'/api/session',{authToken:newToken})).status,401,'new issuer never authenticates on old origin');
  assert.equal((await req(env,'/api/session',{headers:{Origin:studio}})).status,401,'legacy issuer never authenticates on new origin');
  env.LAB_DB.db.exec(readFileSync(new URL('../lab-worker/migrations/0006-customers-billing.sql',import.meta.url),'utf8'));
  for(const migration of ['0011-customer-lifecycle','0015-lab-promotional-credits','0023-welcome-guard','0017-clerk-domain-links'])
    env.LAB_DB.db.exec(readFileSync(new URL('../lab-worker/migrations/'+migration+'.sql',import.meta.url),'utf8'));
  env.LAB_STUDIO_AUTH_ENABLED='true';env.LAB_CUSTOMER_SIGNUPS_ENABLED='true';env.LAB_WELCOME_CREDITS_ENABLED='true';
  const unlinked=await newRequest('/api/session');
  assert.equal(unlinked.status,409);
  assert.equal(unlinked.headers.get('x-pv-lab-onboarding'),'required');
  assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM lab_customers').get().n,0,
    'an unlinked new user cannot be silently given an independent wallet');
  assert.equal((await newRequest('/api/billing/checkout',{method:'POST',data:{sku:'topup10'}})).status,409);
  assert.equal((await req(env,'/api/session',{authToken:guest})).status,200,'old customer creates the original wallet');
  assert.equal(env.LAB_DB.db.prepare('SELECT balance_credits FROM lab_customers WHERE id=?').get('user_Guest').balance_credits,0,
    'registration never awards a trial before Clerk email is verified');
  const verifiedAt=Date.now();
  env.LAB_DB.db.prepare('INSERT INTO lab_customer_contacts(customer_id,email,verified_at,synced_at) VALUES(?,?,?,?)')
    .run('user_Guest','guest@example.com',verifiedAt,verifiedAt);
  assert.equal((await req(env,'/api/session',{authToken:guest})).status,200,'Clerk-verified customer gets welcome credits');
  assert.equal(env.LAB_DB.db.prepare('SELECT balance_credits FROM lab_customers WHERE id=?').get('user_Guest').balance_credits,200);
  const issued=await req(env,'/api/migration/issue',{method:'POST',authToken:guest});
  assert.equal(issued.status,200);
  const {code}=await issued.json();
  assert.match(code,/^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(env.LAB_DB.db.prepare('SELECT code_hash FROM lab_clerk_migration_codes').get().code_hash,code,
    'raw transfer code is never stored in D1');
  assert.equal((await newRequest('/api/migration/redeem',{method:'POST',data:{code:'invalid'}})).status,400);
  assert.equal((await newRequest('/api/migration/redeem',{method:'POST',data:{code}})).status,200);
  const linked=await newRequest('/api/session');assert.equal(linked.status,200);
  const session=await linked.json();
  assert.equal(session.customer,true);assert.equal(session.owner,false);
  assert.equal(session.ownerId,'user_Guest');
  assert.equal(session.balanceCredits,200,'existing welcome credits are retained, never reissued');
  assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM lab_customers').get().n,1);
  assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM lab_credit_entries').get().n,1);
  assert.equal((await newRequest('/api/migration/redeem',{method:'POST',data:{code}})).status,409);
  assert.equal((await req(env,'/api/session',{authToken:newToken})).status,401);
  assert.equal((await req(env,'/api/session',{authToken:auth})).status,200,'existing Nina owner remains active');
});
test('Existing owner role transfers only using one-time proof from the old owner login',async()=>{
  const {env}=fixture(),studio='https://pvlab.studio';
  env.LAB_STUDIO_AUTH_ENABLED='true';
  env.LAB_DB.db.exec(readFileSync(new URL('../lab-worker/migrations/0017-clerk-domain-links.sql',import.meta.url),'utf8'));
  const ownerFromNew=await token('user_NewOwner',{iss:'https://clerk.pvlab.studio',azp:studio});
  const userFromNew=await token('user_Owner',{iss:'https://clerk.pvlab.studio',azp:studio});
  const newCall=(authToken,path,options={})=>req(env,path,{authToken,headers:{Origin:studio},...options});
  assert.equal((await newCall(userFromNew,'/api/session')).status,409,
    'identical subject string in different issuer never inherits owner role');
  const issue=await req(env,'/api/migration/issue',{method:'POST'});
  const {code}=await issue.json();assert.match(code,/^[A-Za-z0-9_-]{43}$/);
  assert.equal((await newCall(ownerFromNew,'/api/migration/redeem',{method:'POST',data:{code}})).status,200);
  const old=await req(env,'/api/session');const modern=await newCall(ownerFromNew,'/api/session');
  assert.equal(old.status,200);assert.equal(modern.status,200);
  const state=await modern.json();assert.equal(state.owner,true);assert.equal(state.ownerId,'owner-internal');
  const attacker=await newCall(userFromNew,'/api/migration/redeem',{method:'POST',data:{code}});
  assert.notEqual(attacker.status,200,'used code does not authorize another new account');
  env.OWNER_DB.db.prepare("UPDATE users SET role='user' WHERE id='owner-internal'").run();
  assert.equal((await newCall(ownerFromNew,'/api/session')).status,403,
    'revoking original owner role immediately revokes linked new owner');
});
test('Fresh new users receive welcome credits once and expired transfer codes cannot be redeemed',async()=>{
  const {env}=fixture(),studio='https://pvlab.studio';
  env.LAB_STUDIO_AUTH_ENABLED='true';env.LAB_CUSTOMER_SIGNUPS_ENABLED='true';env.LAB_WELCOME_CREDITS_ENABLED='true';
  env.LAB_DB.db.exec(readFileSync(new URL('../lab-worker/migrations/0006-customers-billing.sql',import.meta.url),'utf8'));
  for(const migration of ['0011-customer-lifecycle','0015-lab-promotional-credits','0023-welcome-guard','0017-clerk-domain-links'])
    env.LAB_DB.db.exec(readFileSync(new URL('../lab-worker/migrations/'+migration+'.sql',import.meta.url),'utf8'));
  const newToken=await token('user_Fresh',{iss:'https://clerk.pvlab.studio',azp:studio});
  const newCall=(path,options={})=>req(env,path,{authToken:newToken,headers:{Origin:studio},...options});
  const issued=await req(env,'/api/migration/issue',{method:'POST',authToken:guest});
  const {code}=await issued.json();
  env.LAB_DB.db.prepare('UPDATE lab_clerk_migration_codes SET expires_at=?').run(Date.now()-1000);
  assert.equal((await newCall('/api/migration/redeem',{method:'POST',data:{code}})).status,400);
  assert.equal((await newCall('/api/migration/new',{method:'POST'})).status,201);
  const welcomeAt=Date.now();
  env.LAB_DB.db.prepare('INSERT INTO lab_customer_contacts(customer_id,email,verified_at,synced_at) VALUES(?,?,?,?)')
    .run('user_PvLabV2Fresh','fresh@example.com',welcomeAt,welcomeAt);
  assert.equal(await grantVerifiedWelcome(env,'user_PvLabV2Fresh'),true);
  assert.equal((await newCall('/api/migration/new',{method:'POST'})).status,409);
  const session=await(await newCall('/api/session')).json();
  assert.equal(session.owner,false);assert.equal(session.customer,true);
  assert.equal(session.ownerId,'user_PvLabV2Fresh');
  assert.equal(session.balanceCredits,200);
  assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM lab_credit_entries WHERE customer_id=?')
    .get('user_PvLabV2Fresh').n,1);
  assert.equal((await req(env,'/api/session',{authToken:auth})).status,200);
});
test('An unused V2 welcome wallet may be linked to the proven original owner without losing the owner ID',async()=>{
  const {env}=fixture(),studio='https://pvlab.studio';
  env.LAB_STUDIO_AUTH_ENABLED='true';env.LAB_CUSTOMER_SIGNUPS_ENABLED='true';env.LAB_WELCOME_CREDITS_ENABLED='true';
  env.LAB_DB.db.exec(readFileSync(new URL('../lab-worker/migrations/0006-customers-billing.sql',import.meta.url),'utf8'));
  for(const migration of ['0011-customer-lifecycle','0015-lab-promotional-credits','0023-welcome-guard','0017-clerk-domain-links'])
    env.LAB_DB.db.exec(readFileSync(new URL('../lab-worker/migrations/'+migration+'.sql',import.meta.url),'utf8'));
  const newToken=await token('user_StudioOwner',{iss:'https://clerk.pvlab.studio',azp:studio});
  const fresh=(path,options={})=>req(env,path,{authToken:newToken,headers:{Origin:studio},...options});
  assert.equal((await fresh('/api/migration/new',{method:'POST'})).status,201);
  const before=await(await fresh('/api/migration/status')).json();
  assert.equal(before.linked,true);assert.equal(before.kind,'customer');assert.equal(before.relinkEligible,true);
  const legacyCode=await(await req(env,'/api/migration/issue',{method:'POST'})).json();
  assert.equal((await fresh('/api/migration/redeem',{method:'POST',data:{code:legacyCode.code}})).status,200);
  const recovered=await(await fresh('/api/session')).json();
  assert.equal(recovered.owner,true);assert.equal(recovered.ownerId,'owner-internal');
  assert.equal(recovered.customer,undefined);
  assert.equal((await(await fresh('/api/migration/status')).json()).relinkEligible,false);
  assert.equal(env.LAB_DB.db.prepare('SELECT balance_credits FROM lab_customers WHERE id=?')
    .get('user_PvLabV2StudioOwner').balance_credits,0,
    'unused zero-credit trial wallet remains untouched and separate from original owner account');
  assert.equal((await fresh('/api/migration/redeem',{method:'POST',data:{code:legacyCode.code}})).status,409,
    'a previously redeemed owner code is never usable again');
});
test('A new customer with saved work cannot be silently relinked or lose their gallery',async()=>{
  const {env}=fixture(),studio='https://pvlab.studio';
  env.LAB_STUDIO_AUTH_ENABLED='true';env.LAB_CUSTOMER_SIGNUPS_ENABLED='true';env.LAB_WELCOME_CREDITS_ENABLED='true';
  env.LAB_DB.db.exec(readFileSync(new URL('../lab-worker/migrations/0006-customers-billing.sql',import.meta.url),'utf8'));
  for(const migration of ['0011-customer-lifecycle','0015-lab-promotional-credits','0023-welcome-guard','0017-clerk-domain-links'])
    env.LAB_DB.db.exec(readFileSync(new URL('../lab-worker/migrations/'+migration+'.sql',import.meta.url),'utf8'));
  const newToken=await token('user_WithWork',{iss:'https://clerk.pvlab.studio',azp:studio});
  const fresh=(path,options={})=>req(env,path,{authToken:newToken,headers:{Origin:studio},...options});
  assert.equal((await fresh('/api/migration/new',{method:'POST'})).status,201);
  const id='user_PvLabV2WithWork';
  env.LAB_DB.db.prepare('INSERT INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,?,?,?,?,?)')
    .run(crypto.randomUUID(),id,id+'/existing-photo','source','image/png','photo.png',124,Date.now());
  const state=await(await fresh('/api/migration/status')).json();
  assert.equal(state.relinkEligible,false);
  const code=await(await req(env,'/api/migration/issue',{method:'POST'})).json();
  assert.equal((await fresh('/api/migration/redeem',{method:'POST',data:{code:code.code}})).status,409);
  assert.equal((await(await fresh('/api/session')).json()).ownerId,id);
  assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM assets WHERE owner_id=?').get(id).n,1);
});

test('Public health works; every private operation rejects missing, non-owner and forged authentication',async()=>{const{env}=fixture();assert.equal((await req(env,'/health',{authToken:null})).status,200);for(const path of ['/api/session','/api/jobs','/api/assets/'+crypto.randomUUID()]){assert.equal((await req(env,path,{authToken:null})).status,401);assert.equal((await req(env,path,{authToken:guest})).status,403);}const bad=auth.slice(0,-5)+'aaaaa';assert.equal((await req(env,'/api/session',{authToken:bad})).status,401);assert.equal((await req(env,'/api/session',{authToken:await token('user_Owner',{exp:1})})).status,401);assert.equal((await req(env,'/api/session',{headers:{Origin:'https://evil.example'}})).status,403);});
test('API keys encrypted; drafts persist all settings; quotes are free, bounded and keep private input URLs',async()=>{calls=[];createCount=0;const{env}=fixture(),id=await setup(env);const dbKey=env.LAB_DB.db.prepare('SELECT encrypted_key FROM settings').get().encrypted_key;assert.ok(!dbKey.includes(KEY));const session=await(await req(env,'/api/session')).text();assert.ok(!session.includes(KEY));assert.ok(!session.includes(dbKey));await req(env,'/api/drafts',{method:'POST',data:{sourceId:id,settings:p}});const h=await(await req(env,'/api/jobs')).json();assert.equal(h.jobs[0].sourceId,id);assert.equal(h.jobs[0].settings.seed,42);assert.equal(h.jobs[0].settings.audio,true);const q=await quote(env,id);assert.equal(q.estimatedUsd,2.7);assert.equal(createCount,0);const input=new URL(quotedRequest.input.image_url);assert.equal((await req(env,input.pathname+input.search,{authToken:null,headers:{Origin:''}})).status,200);assert.equal((await req(env,input.pathname+'?expires=1&signature=no',{authToken:null})).status,403);assert.equal((await req(env,'/api/assets/'+id,{authToken:null})).status,401);});
test('Wan 21:9 keeps the original source, uses a prepared working crop and sends adaptive upstream',async()=>{calls=[];createCount=0;const{env}=fixture(),id=await setup(env);const upload=await req(env,'/api/uploads',{method:'POST',raw:new Uint8Array([137,80,78,71,13,10,26,10,0]),headers:{'Content-Type':'image/png','X-Filename':'wide-working.webp'}});assert.equal(upload.status,201);const copyId=(await upload.json()).id,settings={...p,aspectRatio:'21:9'};
  assert.equal((await req(env,'/api/quotes',{method:'POST',data:{sourceId:id,settings}})).status,400);
  const response=await req(env,'/api/quotes',{method:'POST',data:{sourceId:id,transferSourceIds:[copyId],settings}});assert.equal(response.status,200);const q=await response.json();
  assert.equal(q.settings.aspectRatio,'21:9');assert.deepEqual(q.settings.transferSourceIds,[copyId]);assert.equal(quotedRequest.input.aspect_ratio,'adaptive');assert.ok(new URL(quotedRequest.input.image_url).pathname.endsWith('/input/'+copyId));
  const draft=await req(env,'/api/drafts',{method:'POST',data:{sourceId:id,settings}});assert.equal(draft.status,201);
  const ref=await req(env,'/api/quotes',{method:'POST',data:{referenceSourceIds:[id],settings:{...settings,mode:'reference'}}});assert.equal(ref.status,400);
});
test('Paid submission requires confirmation, does not duplicate, archives video and keeps spending after deletion',async()=>{createCount=0;createMode='ok';providerState='queued';const{env,objects}=fixture(),id=await setup(env),q=await quote(env,id);assert.equal((await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id}})).status,400);const responses=await Promise.all([req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}}),req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})]);const j=(await responses[0].json()).job;assert.equal(createCount,1);assert.ok(j.id);providerState='succeeded';const done=await(await req(env,'/api/jobs/'+j.id)).json();assert.equal(done.job.status,'completed');assert.equal(done.job.settledUsd,2.7);assert.ok(done.job.outputId);assert.ok(objects.size===2);assert.equal((await req(env,'/api/assets/'+done.job.outputId)).status,200);assert.equal((await req(env,'/api/jobs/'+j.id,{method:'DELETE'})).status,200);assert.equal(env.LAB_DB.db.prepare('SELECT SUM(estimate_microusd) AS n FROM spend').get().n,2700000);});
test('Budget cap, invalid settings and unexpected JSON fail closed without paid requests',async()=>{createCount=0;const{env}=fixture(),id=await setup(env);for(const bad of [{...p,resolution:'__proto__'},{...p,duration:-1},{...p,seed:-5}])assert.equal((await req(env,'/api/quotes',{method:'POST',data:{sourceId:id,settings:bad}})).status,400);assert.equal((await req(env,'/api/settings',{method:'POST',data:null})).status,400);await req(env,'/api/settings',{method:'POST',data:{enabled:true,termsConfirmed:true,dailyLimitUsd:1}});const q=await quote(env,id);assert.equal((await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).status,409);assert.equal(createCount,0);});
test('Ambiguous submission blocks further spending and automatic resubmission; price changes require new confirmation',async()=>{createCount=0;createMode='timeout';const{env}=fixture(),id=await setup(env),q=await quote(env,id);const r=await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json();assert.equal(r.job.status,'uncertain');await req(env,'/api/jobs/'+r.job.id);assert.equal(createCount,1);const another=await quote(env,id);assert.equal((await req(env,'/api/jobs',{method:'POST',data:{quoteId:another.id,confirm:true}})).status,409);await req(env,'/api/jobs/'+r.job.id+'/resolve',{method:'POST',data:{confirm:true}});createMode='pricechange';const last=await quote(env,id);const failed=await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:last.id,confirm:true}})).json();assert.equal(failed.job.status,'failed');assert.equal(createCount,2);});

test('Saving retries the stored provider output directly and never consumes a SpicyAPI generation slot',async()=>{
  const oldPrice=maxPrice;maxPrice='0.093000';createMode='ok';createCount=0;providerState='queued';calls=[];
  try{
    const{env}=fixture(),sourceId=await setup(env);
    await req(env,'/api/settings',{method:'POST',data:{enabled:true,termsConfirmed:true,dailyLimitUsd:100}});
    const t=Date.now(),savingId=crypto.randomUUID();
    env.LAB_DB.db.prepare("INSERT INTO jobs(id,owner_id,source_id,params,state,provider_id,remote_url,estimate_microusd,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
      .run(savingId,'owner-internal',sourceId,JSON.stringify({...imageSettings,model:'bytedance/seedream-5.0-pro/edit'}),'saving','job_already_succeeded','https://cdn.spicyapi.ai/test.png',93000,t,t);
    const marker=calls.length,restored=(await(await req(env,'/api/jobs/'+savingId)).json()).job;
    assert.equal(restored.status,'completed');assert.ok(restored.outputId);
    assert.ok(calls.slice(marker).some(c=>c.url==='https://cdn.spicyapi.ai/test.png'));
    assert.ok(!calls.slice(marker).some(c=>new URL(c.url).pathname.endsWith('/jobs/recordInfo')));

    const savingIds=[];
    for(let i=0;i<10;i++){
      const jobId=crypto.randomUUID();savingIds.push(jobId);
      env.LAB_DB.db.prepare("INSERT INTO jobs(id,owner_id,source_id,params,state,provider_id,remote_url,estimate_microusd,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
        .run(jobId,'owner-internal',sourceId,JSON.stringify({...imageSettings,model:'bytedance/seedream-5.0-pro/edit'}),'saving','job_saved_'+i,'https://cdn.spicyapi.ai/test.png',93000,t+i+1,t+i+1);
    }
    for(let i=0;i<10;i++){
      const q=await(await req(env,'/api/quotes',{method:'POST',data:{settings:imageSettings,referenceSourceIds:[]}})).json();
      const response=await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}});
      assert.equal(response.status,202);
    }
    assert.equal(createCount,10);
    const fifth=await(await req(env,'/api/quotes',{method:'POST',data:{settings:imageSettings,referenceSourceIds:[]}})).json();
    const blocked=await req(env,'/api/jobs',{method:'POST',data:{quoteId:fifth.id,confirm:true}});
    assert.equal(blocked.status,409);
    assert.match((await blocked.json()).error,/10 \/ 10 image slots/);
    const history=await(await req(env,'/api/jobs')).json();
    assert.equal(history.activeJobs.filter(j=>j.status==='saving').length,10);
    assert.equal(history.activeJobs.filter(j=>j.status==='queued'&&j.settings.type==='image').length,10);
  }finally{maxPrice=oldPrice;createMode='ok';providerState='queued';}
});

const imageSettings={type:'image',prompt:'An architectural model on a white plinth',resolution:'2k',aspectRatio:'4:5',outputFormat:'png'};

function filmImagesFixture(){
  let renders=0;
  return {get renders(){return renders;},async info(){return {width:64,height:64};},input(){return {
    transform(){return this;},draw(){return this;},async output(){renders++;const bytes=await grainPng(64,64,15,'valid-fixture');return {response:()=>new Response(bytes,{headers:{'Content-Type':'image/png'}})};}
  };}};
}
test('automatic film finishing retains original, survives failure, adjusts without inference and isolates accounts',async()=>{
  for(const available of [true,false]){
    const {env,objects}=fixture();const settings={...imageSettings,engine:'seedream',mode:'image',moodId:'hong-kong-nights',moodIntensity:100,moodOriginalPrompt:'Portrait',filmFinish:{version:1,grain:65,glow:65}};
    const id=crypto.randomUUID(),t=Date.now();if(available)env.IMAGES=filmImagesFixture();
    env.LAB_DB.db.prepare("INSERT INTO jobs(id,owner_id,params,state,provider_id,remote_url,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'saving',?,?,48000,?,?)")
      .run(id,'owner-internal',JSON.stringify(settings),'one-existing-paid-request','https://cdn.spicyapi.ai/test.png',t,t);
    const paidBefore=createCount,spendBefore=env.LAB_DB.db.prepare('SELECT * FROM spend').all();
    let response=await req(env,'/api/jobs/'+id),job=(await response.json()).job;
    assert.equal(job.status,'completed');assert.equal(job.settings.filmOriginalId,id);
    assert.equal(job.settings.filmFinishStatus,available?'applied':'failed');
    assert.equal(job.outputId===id,!available);assert.equal(createCount,paidBefore);
    const original=Buffer.from(await (await req(env,'/api/assets/'+id)).arrayBuffer());
    assert.deepEqual([...original],[137,80,78,71,13,10,26,10,0]);
    if(!available){assert.match(job.settings.filmFinishError,/unavailable/);env.IMAGES=filmImagesFixture();}
    const route='/api/jobs/'+id+'/film-finish';
    assert.equal((await req(env,route,{method:'POST',authToken:null,data:{}})).status,401);
    env.OWNER_DB.db.prepare("INSERT INTO users VALUES('other-owner','clerk','user_Other','owner')").run();
    assert.equal((await req(env,route,{method:'POST',authToken:await token('user_Other'),data:{}})).status,404);
    response=await req(env,route,{method:'POST',data:{outputId:job.outputId,settings:{version:1,grain:100,glow:0}}});
    assert.equal(response.status,200,await response.clone().text());job=(await response.json()).job;
    const renders=env.IMAGES.renders;
    response=await req(env,route,{method:'POST',data:{outputId:job.outputId,settings:{version:1,grain:100,glow:0}}});
    assert.equal(response.status,200);assert.equal(env.IMAGES.renders,renders,'unchanged settings reuse saved pixels');
    assert.equal((await req(env,route,{method:'POST',data:{outputId:'stale',settings:{version:1,grain:0,glow:0}}})).status,409);
    response=await req(env,route,{method:'POST',data:{outputId:job.outputId,settings:{version:1,grain:0,glow:0}}});
    job=(await response.json()).job;assert.equal(job.outputId,id);assert.equal(job.settings.filmFinishStatus,'off');
    assert.equal(env.IMAGES.renders,renders,'off restores original without rendering');
    assert.deepEqual(Buffer.from(await (await req(env,'/api/assets/'+id)).arrayBuffer()),original);
    assert.equal(createCount,paidBefore);assert.deepEqual(env.LAB_DB.db.prepare('SELECT * FROM spend').all(),spendBefore);
    assert.equal((await req(env,'/api/jobs/'+id,{method:'DELETE'})).status,200);
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM assets').get().n,0);
    assert.equal(objects.size,0,'deleting the job removes unshared original and finished files');
  }
});
test('Gemini applies the same finishing pass after exactly one image generation',async()=>{
  const {env}=fixture();env.GEMINI_API_KEY='synthetic-gemini-key';env.IMAGES=filmImagesFixture();
  const previous=globalThis.fetch;let providerCalls=0;
  globalThis.fetch=async(url,options)=>{
    if(new URL(url).hostname!=='generativelanguage.googleapis.com')return previous(url,options);
    providerCalls++;return Response.json({candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:Buffer.from(pngDimensions(64,64)).toString('base64')}}]}}]});
  };
  try{
    const recipe=prepareMoodPrompt('Portrait at night','hong-kong-nights',80,{engine:'gemini',filmFinish:{version:2,grain:35,haze:50,halation:35,film:45}});
    const response=await req(env,'/api/gemini/jobs',{method:'POST',data:{count:1,referenceSourceIds:[],settings:{...imageSettings,engine:'gemini',processing:'normal',prompt:recipe.prompt,...recipe.metadata}}});
    assert.equal(response.status,202,await response.clone().text());const job=(await response.json()).jobs[0];
    assert.equal(job.status,'completed');assert.equal(job.settings.filmFinishStatus,'applied');
    assert.notEqual(job.outputId,job.settings.filmOriginalId);assert.equal(providerCalls,1);
  }finally{globalThis.fetch=previous;}
});
function seedArchive(db,owner,{files=0,jobs=0}={}){
  const asset=db.prepare("INSERT INTO assets(id,owner_id,object_key,kind,mime,filename,bytes,created_at) VALUES(?,?,?,'source','image/png','old.png',9,1)");
  for(let i=0;i<files;i++){const id=crypto.randomUUID();asset.run(id,owner,owner+'/'+id);}
  const job=db.prepare("INSERT INTO jobs(id,owner_id,params,state,created_at,updated_at) VALUES(?,?,'{}','completed',1,1)");
  for(let i=0;i<jobs;i++)job.run(crypto.randomUUID(),owner);
}
async function archiveAccount(customer){
  const {env,objects}=fixture();let owner='owner-internal',authToken=auth;
  if(customer){
    env.LAB_DB.db.exec(readFileSync(new URL('../lab-worker/migrations/0006-customers-billing.sql',import.meta.url),'utf8'));
    Object.assign(env,{LAB_CUSTOMER_SIGNUPS_ENABLED:'true',LAB_CHECKOUT_ENABLED:'true',LAB_PUBLIC_GENERATION_ENABLED:'true',LAB_CUSTOMER_SPICY_API_KEY:KEY,LAB_STRIPE_SECRET_KEY:'sk_test_archive',LAB_STRIPE_WEBHOOK_SECRET:'whsec_archive'});
    owner='user_ArchiveCustomer';authToken=await token(owner);
    const unfunded=await req(env,'/api/uploads',{method:'POST',authToken,raw:new Uint8Array([137,80,78,71,13,10,26,10,0]),headers:{'Content-Type':'image/png'}});
    assert.equal(unfunded.status,402,'Unfunded uploads still require credits');
    env.LAB_DB.db.prepare("INSERT INTO lab_credit_entries VALUES('archive-test',?,1000,'purchase','archive-test',1)").run(owner);
  }
  return {env,objects,owner,authToken};
}
test('Owner and funded public accounts can upload and retain history beyond the old record caps',async()=>{
  for(const customer of [false,true]){
    const {env,objects,owner,authToken}=await archiveAccount(customer),db=env.LAB_DB.db;
    seedArchive(db,owner,{files:1001,jobs:509});const before=createCount;
    const image=await req(env,'/api/uploads',{method:'POST',authToken,raw:new Uint8Array([137,80,78,71,13,10,26,10,0]),headers:{'Content-Type':'image/png'}});
    assert.equal(image.status,201,await image.clone().text());const sourceId=(await image.json()).id;
    const video=await req(env,'/api/reference-uploads',{method:'POST',authToken,raw:new Uint8Array([0,0,0,24,102,116,121,112,109,112,52,50]),headers:{'Content-Type':'video/mp4'}});
    assert.equal(video.status,201,await video.clone().text());
    const draft=await req(env,'/api/drafts',{method:'POST',authToken,data:{sourceId,settings:p}});
    assert.equal(draft.status,201,await draft.clone().text());
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM assets WHERE owner_id=?').get(owner).n,1003);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM jobs WHERE owner_id=?').get(owner).n,510);
    assert.equal(objects.size,2);assert.equal(createCount,before,'Uploading and drafting do not generate');
    const seen=new Set();let next=null;
    do{const page=await(await req(env,'/api/jobs'+(next?'?'+new URLSearchParams(next):''),{authToken})).json();assert.ok(page.jobs.length<=20);for(const job of page.jobs)seen.add(job.id);next=page.next;}while(next);
    assert.equal(seen.size,510,'Every old history entry remains reachable through pagination');
    if(customer)assert.equal(db.prepare('SELECT balance_credits AS n FROM lab_customers WHERE id=?').get(owner).n,1000);
  }
});
test('Both upload routes retain the per-account 20 GiB storage boundary without deleting media',async()=>{
  for(const customer of [false,true])for(const video of [false,true]){
    const {env,objects,owner,authToken}=await archiveAccount(customer),db=env.LAB_DB.db;
    const raw=video?new Uint8Array([0,0,0,24,102,116,121,112,109,112,52,50]):new Uint8Array([137,80,78,71,13,10,26,10,0]);
    seedArchive(db,owner,{files:1});seedArchive(db,'another-account',{files:1});
    db.prepare('UPDATE assets SET bytes=? WHERE owner_id=?').run(20*1024**3-raw.length,owner);
    db.prepare('UPDATE assets SET bytes=? WHERE owner_id=?').run(20*1024**3,'another-account');
    const options={method:'POST',authToken,raw,headers:{'Content-Type':video?'video/mp4':'image/png'}},path=video?'/api/reference-uploads':'/api/uploads';
    assert.equal((await req(env,path,options)).status,201,'Exact byte capacity is accepted and other accounts do not consume it');
    const saved=[...objects.entries()],blocked=await req(env,path,options);
    assert.equal(blocked.status,413);assert.match((await blocked.json()).error,/storage limit reached \(20 GiB\)/);
    assert.deepEqual([...objects.entries()],saved);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM assets WHERE owner_id=?').get(owner).n,2);
  }
});
test('Gemini batches remain available beyond 500 history entries for owners and funded customers',async()=>{
  const previous=globalThis.fetch;let submissions=0;
  globalThis.fetch=async(url,options)=>{if(new URL(url).hostname==='generativelanguage.googleapis.com'){submissions++;return Response.json({name:'batches/archive-capacity-test'});}return previous(url,options);};
  try{for(const customer of [false,true]){
    const {env,owner,authToken}=await archiveAccount(customer);env.GEMINI_API_KEY='synthetic-gemini-key';
    seedArchive(env.LAB_DB.db,owner,{jobs:509});const before=submissions;
    const result=await req(env,'/api/gemini/jobs',{method:'POST',authToken,data:{count:2,settings:{...imageSettings,engine:'gemini',processing:'batch'}}});
    assert.equal(result.status,202,await result.clone().text());const {jobs}=await result.json();
    assert.equal(jobs.length,2);assert.ok(jobs.every(j=>j.status==='queued'));assert.equal(submissions,before+1);
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM jobs WHERE owner_id=?').get(owner).n,511);
    if(customer)assert.equal(env.LAB_DB.db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE customer_id=? AND kind='generation'").get(owner).n,2);
  }}finally{globalThis.fetch=previous;}
});
test('paused customer can discover draft video models without receiving spending permission',async()=>{
  const {env}=fixture(),db=env.LAB_DB.db;
  for(const migration of ['0006-customers-billing','0011-customer-lifecycle','0015-lab-promotional-credits','0023-welcome-guard','0025-promo-generation-holds','0029-pause-welcome-promotion','0033-owner-voucher-generation'])
    db.exec(readFileSync(new URL('../lab-worker/migrations/'+migration+'.sql',import.meta.url),'utf8'));
  Object.assign(env,{LAB_CUSTOMER_SIGNUPS_ENABLED:'true',LAB_WELCOME_CREDITS_ENABLED:'false',LAB_FREE_TRIAL_PAUSED:'true',LAB_CHECKOUT_ENABLED:'true',LAB_PUBLIC_GENERATION_ENABLED:'true',LAB_CUSTOMER_SPICY_API_KEY:KEY,LAB_STRIPE_SECRET_KEY:'sk_test_synthetic',LAB_STRIPE_WEBHOOK_SECRET:'whsec_synthetic'});
  const authToken=await token('user_VideoPreparation');
  const response=await req(env,'/api/session',{authToken});
  assert.equal(response.status,200);
  const session=await response.json();
  assert.equal(session.generationReady,false);
  assert.equal(session.trialGenerationPaused,true);
  assert.equal(session.billingReady,true);
  assert.equal(session.config.enabled,false);
  assert.deepEqual(session.config.videoEngines,[]);
  assert.ok(session.config.videoPreparationEngines.includes('wan'));
  assert.ok(session.config.videoPreparationEngines.includes('seedance'));
  assert.ok(!session.config.videoPreparationEngines.includes('klinghf'),'Owner-only model stays private');
  const count=createCount;
  const quote=await req(env,'/api/quotes',{method:'POST',authToken,data:{settings:{type:'video',engine:'seedance',mode:'text',prompt:'A slow camera move.'}}});
  assert.equal(quote.status,403);
  assert.match((await quote.json()).error,/Complimentary generation is paused/);
  assert.equal(createCount,count);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,0);
});
test('new customer: signed signup, paid credits once, generation, private download, return gallery and failed-job refund',async()=>{
  const {env}=fixture(),db=env.LAB_DB.db,customer='user_LaunchQA',other='user_LaunchOther';
  for(const file of ['0006-customers-billing.sql','0007-lab-referrals.sql','0008-soul-id-launch-credits.sql','0011-customer-lifecycle.sql','0024-owner-acquisition.sql'])db.exec(readFileSync(new URL('../lab-worker/migrations/'+file,import.meta.url),'utf8'));
  Object.assign(env,{LAB_CUSTOMER_SIGNUPS_ENABLED:'true',LAB_CHECKOUT_ENABLED:'true',LAB_PUBLIC_GENERATION_ENABLED:'true',LAB_CUSTOMER_SPICY_API_KEY:KEY,LAB_STRIPE_SECRET_KEY:'sk_test_synthetic',LAB_STRIPE_WEBHOOK_SECRET:'whsec_synthetic'});
  const authToken=await token(customer),otherToken=await token(other);
  const balance=()=>db.prepare('SELECT balance_credits AS n FROM lab_customers WHERE id=?').get(customer).n;
  const initial=await req(env,'/api/session',{authToken});assert.equal(initial.status,200);assert.equal((await initial.json()).balanceCredits,0);
  assert.equal(env.OWNER_DB.db.prepare('SELECT COUNT(*) AS n FROM users').get().n,2,'Signup does not write Nina identities');
  const event={id:'evt_launchpaid',type:'checkout.session.completed',livemode:false,data:{object:{id:'cs_test_launch',customer:'cus_launch',mode:'payment',payment_status:'paid',currency:'eur',amount_total:1000,metadata:{lab_customer_id:customer,lab_sku:'topup10'},client_reference_id:customer}}};
  async function payment(){
    const raw=JSON.stringify(event),stamp=Math.floor(Date.now()/1000);
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.LAB_STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(stamp+'.'+raw))).toString('hex');
    return req(env,'/api/stripe/webhook',{method:'POST',raw,authToken:null,headers:{'Stripe-Signature':'t='+stamp+',v1='+signature}});
  }
  const paid=await Promise.all([payment(),payment()]);assert.ok(paid.every(r=>r.status===200));assert.equal(balance(),1000);
  await req(env,'/api/session',{authToken:otherToken});
  const previousPrice=maxPrice;maxPrice='0.018000';createMode='ok';providerState='queued';createCount=0;
  try{
    const quoteResponse=await req(env,'/api/quotes',{method:'POST',authToken,data:{settings:imageSettings,referenceSourceIds:[]}});assert.equal(quoteResponse.status,200);const q=await quoteResponse.json();
    const created=await req(env,'/api/jobs',{method:'POST',authToken,data:{quoteId:q.id,confirm:true}});assert.equal(created.status,202);const job=(await created.json()).job;assert.equal(balance(),991);
    assert.equal((await req(env,'/api/jobs',{method:'POST',authToken:otherToken,data:{quoteId:q.id,confirm:true}})).status,409);
    assert.equal(createCount,1,'Cross-account quote never submits another provider job');
    providerState='succeeded';const done=(await(await req(env,'/api/jobs/'+job.id,{authToken})).json()).job;assert.equal(done.status,'completed');
    const download=await req(env,'/api/assets/'+done.outputId,{authToken});assert.equal(download.status,200);assert.equal(download.headers.get('content-type'),'image/png');assert.ok((await download.arrayBuffer()).byteLength>0);
    assert.equal((await req(env,'/api/assets/'+done.outputId,{authToken:otherToken})).status,404);
    assert.equal((await req(env,'/api/jobs/'+job.id,{authToken:otherToken})).status,404);
    const returning=await token(customer);const gallery=await(await req(env,'/api/jobs',{authToken:returning})).json();assert.ok(gallery.jobs.some(j=>j.id===job.id&&j.outputId===done.outputId));assert.equal(createCount,1);
    createMode='pricechange';providerState='queued';
    const next=await(await req(env,'/api/quotes',{method:'POST',authToken,data:{settings:{...imageSettings,prompt:'Another image'},referenceSourceIds:[]}})).json();
    await req(env,'/api/jobs',{method:'POST',authToken,data:{quoteId:next.id,confirm:true}});
    assert.equal(balance(),991,'Definite provider rejection refunds its own charge');
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE customer_id=? AND kind='refund'").get(customer).n,1);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE customer_id=? AND kind='purchase'").get(customer).n,1);
    const closing=await req(env,'/api/customer/account',{method:'DELETE',authToken,data:{confirmation:'DELETE MY PV LAB ACCOUNT'}});assert.equal(closing.status,202);
    const closedSession=await req(env,'/api/session',{authToken});assert.equal(closedSession.status,200);assert.equal((await closedSession.json()).accountClosed.state,'requested');
    assert.equal((await req(env,'/api/customer/wallet',{authToken})).status,200,'Closed accounts can still read billing records');
    assert.equal((await req(env,'/api/jobs',{authToken})).status,403,'Closed accounts cannot read creative records');
  }finally{maxPrice=previousPrice;createMode='ok';providerState='queued';}
});
test('Customer SpicyAPI jobs use only the isolated key with no daily estimate cap, while owner cap stays',async()=>{
  const {env}=fixture(),db=env.LAB_DB.db,customer='user_IsolatedCustomer';
  for(const file of ['0006-customers-billing.sql','0007-lab-referrals.sql','0008-soul-id-launch-credits.sql','0011-customer-lifecycle.sql'])
    db.exec(readFileSync(new URL('../lab-worker/migrations/'+file,import.meta.url),'utf8'));
  Object.assign(env,{LAB_CUSTOMER_SIGNUPS_ENABLED:'true',LAB_CHECKOUT_ENABLED:'true',LAB_PUBLIC_GENERATION_ENABLED:'true',
    LAB_CUSTOMER_SPICY_API_KEY:CUSTOMER_KEY,LAB_STRIPE_SECRET_KEY:'sk_test_synthetic',LAB_STRIPE_WEBHOOK_SECRET:'whsec_synthetic'});
  await setup(env); // Owner stores a distinct personal provider credential and a $10/day cap.
  const encryptedOwnerKey=db.prepare('SELECT encrypted_key FROM settings WHERE owner_id=?').get('owner-internal').encrypted_key;
  const customerToken=await token(customer);
  assert.equal((await req(env,'/api/session',{authToken:customerToken})).status,200);
  // A legacy row must never override the shared customer key or reactivate a daily cap.
  db.prepare('INSERT INTO settings(owner_id,encrypted_key,enabled,terms_confirmed,daily_limit_microusd,updated_at) VALUES(?,?,?,?,?,?)')
    .run(customer,encryptedOwnerKey,1,1,1000000,Date.now());
  db.prepare('INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,?,?,?,?)')
    .run('funding:'+customer,customer,20000,'adjustment','test-wallet:'+customer,Date.now());
  const session=(await(await req(env,'/api/session',{authToken:customerToken})).json());
  assert.equal(session.config.dailyLimitUsd,null,'Customer is constrained by credit balance, not owner daily budget');
  assert.equal(session.config.enabled,true);
  const previousPrice=maxPrice;maxPrice='12.000000';createMode='ok';createCount=0;providerState='queued';calls=[];
  try{
    const qResponse=await req(env,'/api/quotes',{method:'POST',authToken:customerToken,data:{settings:imageSettings,referenceSourceIds:[]}});
    assert.equal(qResponse.status,200,await qResponse.clone().text());
    const q=await qResponse.json();assert.equal(q.maxUsd,12);
    const submitted=await req(env,'/api/jobs',{method:'POST',authToken:customerToken,data:{quoteId:q.id,confirm:true}});
    assert.equal(submitted.status,202,await submitted.clone().text());
    assert.equal((await submitted.json()).job.status,'queued');
    assert.equal(createCount,1);
    const billableCalls=calls.filter(c=>/\/jobs\/(quote|createTask)$/.test(new URL(c.url).pathname));
    assert.equal(billableCalls.length,2);
    assert.ok(billableCalls.every(c=>c.options.headers.Authorization==='Bearer '+CUSTOMER_KEY),'Customer never uses personal provider key');
    assert.equal(db.prepare('SELECT balance_credits FROM lab_customers WHERE id=?').get(customer).balance_credits,20000-q.creditCost);
    assert.equal(db.prepare('SELECT COALESCE(SUM(estimate_microusd),0) AS n FROM spend WHERE owner_id=?').get(customer).n,12000000);
    calls=[];
    const ownerResponse=await req(env,'/api/quotes',{method:'POST',data:{settings:imageSettings,referenceSourceIds:[]}});
    assert.equal(ownerResponse.status,200,await ownerResponse.clone().text());
    const ownerProviderCall=calls.find(c=>new URL(c.url).pathname.endsWith('/jobs/quote'));
    assert.equal(ownerProviderCall.options.headers.Authorization,'Bearer '+KEY);
    const ownerSession=(await(await req(env,'/api/session')).json());
    assert.equal(ownerSession.config.dailyLimitUsd,10);
  }finally{maxPrice=previousPrice;createMode='ok';providerState='queued';}
});
test('Text-to-image quotes need no source; image outputs can be reused by video without losing the source',async()=>{
  createMode='ok';createCount=0;providerState='queued';const {env}=fixture();await setup(env);
  let r=await req(env,'/api/quotes',{method:'POST',data:{settings:imageSettings,referenceSourceIds:[]}});assert.equal(r.status,200);const q=await r.json();assert.equal(quotedRequest.model,'bytedance/seedream-5.0-pro/text-to-image');assert.equal(quotedRequest.input.aspect_ratio,'4:5');assert.equal(quotedRequest.input.resolution,'2k');assert.ok(!('image_urls' in quotedRequest.input));assert.equal(createCount,0);
  const j=(await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json()).job;providerState='succeeded';const done=(await(await req(env,'/api/jobs/'+j.id)).json()).job;assert.equal(done.status,'completed');assert.equal(done.sourceId,null);assert.ok(done.outputId);assert.equal((await req(env,'/api/assets/'+done.outputId)).headers.get('content-type'),'image/png');
  const draft=await req(env,'/api/drafts',{method:'POST',data:{sourceId:done.outputId,settings:p}});assert.equal(draft.status,201);assert.equal((await req(env,'/api/jobs/'+done.id,{method:'DELETE'})).status,200);assert.equal((await req(env,'/api/assets/'+done.outputId)).status,200);assert.equal(createCount,1);
});
test('Seedream Flash uses SpicyAPI for text, reference editing and paid jobs with no OpenRouter call',async()=>{
  createMode='ok';createCount=0;providerState='queued';
  const {env}=fixture();await setup(env);
  const settings={type:'image',engine:'flash',mode:'image',prompt:'Editorial fashion portrait in natural light',resolution:'2k',aspectRatio:'auto',outputFormat:'png',referenceRoles:[]};
  let response=await req(env,'/api/quotes',{method:'POST',data:{settings,referenceSourceIds:[]}});
  assert.equal(response.status,200,await response.clone().text());
  const quote=await response.json();
  assert.equal(quote.provider,'SpicyAPI');
  assert.equal(quote.settings.provider,'spicy');
  assert.equal(quotedRequest.model,'bytedance/seedream-5.0-flash/text-to-image');
  assert.equal(quotedRequest.input.aspect_ratio,'16:9');
  assert.equal(quotedRequest.input.resolution,'2k');
  assert.ok(!('image_urls' in quotedRequest.input));
  assert.equal(createCount,0,'A price request cannot spend credits');
  const paid=await req(env,'/api/jobs',{method:'POST',data:{quoteId:quote.id,confirm:true}});
  assert.equal(paid.status,202,await paid.clone().text());
  assert.equal((await paid.json()).job.settings.model,'bytedance/seedream-5.0-flash/text-to-image');
  assert.equal(createCount,1,'A confirmed submission calls SpicyAPI once');
  const ref=await seedreamTestReference(env,'flash-identity.png',3);
  const editSettings={...settings,referenceRoles:[{name:'flash-identity.png',role:'identity',note:'Keep this face.'}]};
  response=await req(env,'/api/quotes',{method:'POST',data:{settings:editSettings,referenceSourceIds:[ref]}});
  assert.equal(response.status,200,await response.clone().text());
  const editQuote=await response.json();
  assert.equal(editQuote.settings.model,'bytedance/seedream-5.0-flash/edit');
  assert.equal(quotedRequest.model,'bytedance/seedream-5.0-flash/edit');
  assert.equal(quotedRequest.input.aspect_ratio,'auto');
  assert.equal(quotedRequest.input.image_urls.length,1);
  assert.match(quotedRequest.input.image_urls[0],/^spicy:\/\/f\//);
  assert.match(quotedRequest.input.prompt,/Keep this face/);
  const edited=await req(env,'/api/jobs',{method:'POST',data:{quoteId:editQuote.id,confirm:true}});
  assert.equal(edited.status,202,await edited.clone().text());
  assert.equal(createCount,2,'A confirmed reference edit calls SpicyAPI once');
  const before=createCount;
  const legacy=await req(env,'/api/image-models/generate',{method:'POST',data:{settings,referenceSourceIds:[]}});
  assert.equal(legacy.status,400,await legacy.clone().text());
  assert.equal(createCount,before,'Old OpenRouter route does not submit Flash');
});
test('Reference editing preserves source order, roles, notes and original prompt; packs pin private media',async()=>{
  const{env}=fixture();await setup(env);const id=await seedreamTestReference(env,'reference.png',9);const labels=[{name:'reference.png',role:'room',note:'Use the architecture only.'}];
  const packResponse=await req(env,'/api/packs',{method:'POST',data:{name:'Architecture / Set',referenceSourceIds:[id],referenceRoles:labels}});assert.equal(packResponse.status,201);const pack=await packResponse.json();
  const settings={...imageSettings,referenceRoles:labels};const q=await(await req(env,'/api/quotes',{method:'POST',data:{settings,referenceSourceIds:[id]}})).json();assert.equal(quotedRequest.model,'bytedance/seedream-5.0-pro/edit');assert.equal(quotedRequest.input.image_urls.length,1);assert.match(quotedRequest.input.prompt,/Reference 1.*Environment.*Use the architecture only/);assert.equal(q.settings.prompt,imageSettings.prompt);
  const draft=(await(await req(env,'/api/drafts',{method:'POST',data:{settings,referenceSourceIds:[id]}})).json()).job;assert.equal(draft.settings.referenceRoles[0].note,labels[0].note);assert.equal((await req(env,'/api/jobs/'+draft.id,{method:'DELETE'})).status,200);assert.equal((await req(env,'/api/assets/'+id)).status,200);assert.equal((await req(env,'/api/packs',{authToken:guest})).status,403);assert.equal((await req(env,'/api/packs/'+pack.id,{method:'DELETE'})).status,200);
  const oversized={...imageSettings,prompt:'x'.repeat(5000),referenceRoles:labels};assert.equal((await req(env,'/api/quotes',{method:'POST',data:{settings:oversized,referenceSourceIds:[id]}})).status,400);
});

async function seedreamTestReference(env,name,marker=0,width=512,height=512){
  const bytes=pngDimensions(width,height);bytes[bytes.length-1]=marker;
  const r=await req(env,'/api/uploads',{method:'POST',raw:bytes,headers:{'Content-Type':'image/png','X-Filename':name}});
  assert.equal(r.status,201);return (await r.json()).id;
}
async function uploadGuidanceReference(env,name,marker){
  return seedreamTestReference(env,name,marker);
}
test('Hong Kong 1K editing retains user Base and sends three exact real Style photos to Spicy provider',async()=>{
  const {env}=fixture();
  await setup(env);
  const source=await seedreamTestReference(env,'original-fashion.png',27,768,512);
  const recipe=prepareMoodPrompt('Keep the same person and buildings.','hong-kong-nights',60,
    {engine:'seedream',referenceCount:1,referenceMode:'base',moodVariant:'deep-green'});
  assert.equal(recipe.error,'');
  const settings={...imageSettings,engine:'seedream',mode:'image',resolution:'1k',prompt:recipe.prompt,
    ...recipe.metadata,referenceMode:'base',referenceRoles:[{name:'original-fashion.png',role:'base'}]};
  const originalFetch=globalThis.fetch,staged=new Map();let sequence=0;
  globalThis.fetch=async(url,options={})=>{
    const u=new URL(url);
    if(u.hostname==='api.spicyapi.ai'&&u.pathname.endsWith('/common/upload-url')){
      const input=JSON.parse(options.body),fileId='fil_hong_kong_reference_'+(++sequence);
      staged.set(fileId,{input});
      return Response.json({code:200,data:{fileId,uploadUrl:'https://test.r2.cloudflarestorage.com/'+fileId,method:'PUT',
        headers:{'Content-Type':input.contentType,'Content-Length':String(input.bytes)},
        maxBytes:10485760,expiresAt:new Date(Date.now()+1200000).toISOString()}});
    }
    if(u.hostname==='test.r2.cloudflarestorage.com'&&options.method==='PUT'){
      const item=staged.get(u.pathname.slice(1));assert.ok(item,'Expected staged upload');
      item.bytes=new Uint8Array(options.body);
      return new Response(null,{status:200});
    }
    if(u.hostname==='api.spicyapi.ai'&&u.pathname.endsWith('/commit')){
      const fileId=u.pathname.split('/').at(-2),item=staged.get(fileId);assert.ok(item?.bytes);
      return Response.json({code:200,data:{fileId,status:'ready',bytes:item.bytes.length,contentType:item.input.contentType,
        sha256:Buffer.from(await crypto.subtle.digest('SHA-256',item.bytes)).toString('hex'),
        uri:'spicy://f/'+fileId,expiresAt:new Date(Date.now()+86400000).toISOString()}});
    }
    return originalFetch(url,options);
  };
  try{
    const quoteResponse=await req(env,'/api/quotes',{method:'POST',data:{settings,referenceSourceIds:[source]}});
    assert.equal(quoteResponse.status,200,await quoteResponse.clone().text());
    const quote=await quoteResponse.json();
    assert.equal(quote.settings.moodId,'hong-kong-nights');
    assert.equal(quote.settings.moodVariant,'deep-green');
    assert.equal(quote.settings.referenceSourceIds.length,1);
    assert.equal(quote.settings.moodReferenceCount,3);
    assert.equal(quote.settings.resolution,'1k');
    assert.equal(quotedRequest.model,'bytedance/seedream-5.0-pro/edit');
    assert.equal(quotedRequest.input.resolution,'1k');
    assert.equal(quotedRequest.input.image_urls.length,4,'User Base followed by three actual Style inputs');
    assert.equal(staged.size,4);
    for(let i=0;i<4;i++){
      const fileId=quotedRequest.input.image_urls[i].split('/').at(-1),item=staged.get(fileId);
      assert.ok(item?.bytes,'Provider upload exists at position '+(i+1));
      if(i>0)assert.deepEqual(Buffer.from(item.bytes),Buffer.from(HONG_KONG_REFERENCES[i-1].data,'base64'),
        'Original owner photograph matches provider input '+(i+1));
    }
    assert.equal(Object.hasOwn(quotedRequest.input,'enable_thinking'),false);
    assert.match(quotedRequest.input.prompt,/EDIT IMAGE 1/);
    assert.match(quotedRequest.input.prompt,/Hong Kong Nights is a photographic light-and-air treatment/);
    assert.match(quotedRequest.input.prompt,/softly visible eyes/);
    assert.match(quotedRequest.input.prompt,/Reference 2 \[Supervalu \/ DOMINANT LOOK\]/);
    assert.match(quotedRequest.input.prompt,/Reference 3 \[Diner green-yellow \/ SECONDARY COLOR\]/);
    assert.match(quotedRequest.input.prompt,/Reference 4 \[Foggy wet street \/ SECONDARY DEPTH\]/);
  }finally{
    globalThis.fetch=originalFetch;
  }
});

test('Seedream uses SpicyAPI with ordered images, compiled properties and reusable detail metadata',async()=>{
  const{env}=fixture();await setup(env);
  const ids=await Promise.all(['base','hands','coat','identity'].map((name,i)=>uploadGuidanceReference(env,name+'.png',i+1)));
  const labels=[{name:'base.png',role:'base',note:''},{name:'hands.png',role:'detail',target:'hands',note:'Keep natural proportions.'},{name:'coat.png',role:'outfit',target:'coat',note:''},{name:'identity.png',role:'identity',note:''}];
  const settings={...imageSettings,engine:'seedream',prompt:'Keep the room.',referenceRoles:labels};
  const originalFetch=globalThis.fetch,staged=new Map();let uploadNumber=0;
  globalThis.fetch=async(url,options={})=>{
    const u=new URL(url);
    if(u.hostname==='api.spicyapi.ai'&&u.pathname.endsWith('/common/upload-url')){
      const input=JSON.parse(options.body),fileId='fil_ordered_reference_'+(++uploadNumber);staged.set(fileId,{input});
      return Response.json({code:200,data:{fileId,uploadUrl:'https://test.r2.cloudflarestorage.com/'+fileId,method:'PUT',headers:{'Content-Type':input.contentType,'Content-Length':String(input.bytes)},maxBytes:10485760,expiresAt:new Date(Date.now()+1200000).toISOString()}});
    }
    if(u.hostname==='test.r2.cloudflarestorage.com'){
      staged.get(u.pathname.slice(1)).bytes=new Uint8Array(options.body);return new Response(null,{status:200});
    }
    if(u.hostname==='api.spicyapi.ai'&&u.pathname.endsWith('/commit')){
      const fileId=u.pathname.split('/').at(-2),item=staged.get(fileId);
      return Response.json({code:200,data:{fileId,status:'ready',bytes:item.bytes.length,contentType:'image/png',sha256:Buffer.from(await crypto.subtle.digest('SHA-256',item.bytes)).toString('hex'),uri:'spicy://f/'+fileId,expiresAt:new Date(Date.now()+86400000).toISOString()}});
    }
    return originalFetch(url,options);
  };
  try{
    const before=createCount,response=await req(env,'/api/quotes',{method:'POST',data:{settings,referenceSourceIds:ids}});
    assert.equal(response.status,200,await response.clone().text());const q=await response.json();
    assert.equal(q.provider,'SpicyAPI');assert.equal(q.settings.provider,'spicy');assert.equal(q.settings.engine,'seedream');
    assert.deepEqual(quotedRequest.input.image_urls.map(uri=>staged.get(uri.split('/').at(-1)).bytes.at(-1)),[1,2,3,4]);
    assert.equal(quotedRequest.input.prompt,compileImagePrompt(settings.prompt,labels,{...settings,mode:'image'}));
    assert.match(quotedRequest.input.prompt,/IDENTITY FIRST/);
    assert.match(quotedRequest.input.prompt,/Reference 2 \[Detail \/ Hands\]/);assert.match(quotedRequest.input.prompt,/Reference 3 \[Clothing \/ Coat \/ jacket\]/);
    assert.deepEqual(q.settings.referenceSourceIds,ids);assert.deepEqual(q.settings.referenceRoles,labels);assert.equal(createCount,before);
    const general={...imageSettings,engine:'seedream',prompt:'Recreate this editorial scene in a different palette.',referenceMode:'base',referenceRoles:[{role:'base'},...ids.slice(1).map(()=>({role:'none'}))]};
    const generalResponse=await req(env,'/api/quotes',{method:'POST',data:{settings:general,referenceSourceIds:ids}});
    assert.equal(generalResponse.status,200,await generalResponse.clone().text());
    assert.deepEqual((await generalResponse.json()).settings.referenceRoles.map(r=>r.role),['base','none','none','none']);
    assert.match(quotedRequest.input.prompt,/Reference 2 \[General reference\]/);
    assert.match(quotedRequest.input.prompt,/General visual reference/);
    const only={...general,referenceMode:'references',referenceRoles:ids.map(()=>({role:'identity'}))};
    const onlyResponse=await req(env,'/api/quotes',{method:'POST',data:{settings:only,referenceSourceIds:ids}});
    assert.equal(onlyResponse.status,200,await onlyResponse.clone().text());
    assert.match(quotedRequest.input.prompt,/There is no base image/);
    assert.match(quotedRequest.input.prompt,/Reference 4 \[Identity\]/);
    const noDirection={...general,prompt:'',referenceRoles:[{role:'base'},...ids.slice(1).map(()=>({role:'none'}))]};
    const variation=await req(env,'/api/quotes',{method:'POST',data:{settings:noDirection,referenceSourceIds:ids}});
    assert.equal(variation.status,200,await variation.clone().text());
    assert.match(quotedRequest.input.prompt,/Create an intentional reinterpretation of the supplied image/);
    assert.match(quotedRequest.input.prompt,/If people are present, preserve each individual/);
    assert.match(quotedRequest.input.prompt,/without assuming a location, time of day/);
    const freeReferences=await req(env,'/api/quotes',{method:'POST',data:{settings:{...noDirection,referenceMode:'references',referenceRoles:ids.map(()=>({role:'none'}))},referenceSourceIds:ids}});
    assert.equal(freeReferences.status,200,await freeReferences.clone().text());
    assert.match(quotedRequest.input.prompt,/cohesive new image inspired by the supplied photographs/);


    const draftResponse=await req(env,'/api/drafts',{method:'POST',data:{settings,referenceSourceIds:ids}});assert.equal(draftResponse.status,201);
    assert.deepEqual((await draftResponse.json()).job.settings.referenceRoles,labels);
    const packed=await req(env,'/api/packs',{method:'POST',data:{name:'Hand and coat edit',referenceSourceIds:ids,referenceRoles:labels}});assert.equal(packed.status,201);
    const pack=await packed.json();assert.equal(pack.refs[1].target,'hands');assert.equal(pack.refs[2].target,'coat');
    const listed=await (await req(env,'/api/packs')).json();assert.deepEqual(listed.packs.find(x=>x.id===pack.id).refs,pack.refs);
  }finally{globalThis.fetch=originalFetch;}
});

test('A four-image Seedream batch accepts matching repeated provider quote IDs and submits four independent paid tasks',async()=>{
  const {env}=fixture();await setup(env);
  const previous=globalThis.fetch,keys=[];let priceChecks=0,submissions=0;
  globalThis.fetch=async(url,options={})=>{
    const u=new URL(url);
    if(u.hostname==='api.spicyapi.ai'&&u.pathname.endsWith('/jobs/quote')){
      priceChecks++;
      return Response.json({code:200,data:{quoteId:'shared-exact-price-id',estimatedCost:'0.010000',maxCharge:'0.010000',currency:'USD',expiresAt:new Date(Date.now()+300000).toISOString()}});
    }
    if(u.hostname==='api.spicyapi.ai'&&u.pathname.endsWith('/jobs/createTask')){
      submissions++;
      const body=JSON.parse(options.body),key=new Headers(options.headers).get('Idempotency-Key');
      assert.equal(body.quoteId,'shared-exact-price-id');
      assert.equal(body.expectedCost,'0.010000');
      assert.match(key,/^[a-f0-9-]{36}$/);
      keys.push(key);
      return Response.json({code:200,data:{taskId:'independent-spicy-job-'+submissions,state:'queued'}},{status:202});
    }
    return previous(url,options);
  };
  try{
    const priced=await req(env,'/api/quotes',{method:'POST',data:{settings:{...imageSettings,engine:'seedream'},count:4}});
    assert.equal(priced.status,200,await priced.clone().text());
    const {quotes}=await priced.json();
    assert.equal(quotes.length,4);
    assert.equal(priceChecks,4,'Four individually bounded price checks are still requested');
    assert.equal(new Set(quotes.map(q=>q.id)).size,4,'Each PV LAB quote must be independently confirmable');
    assert.ok(quotes.every(q=>q.maxUsd===0.01&&q.expiresAt> Date.now()));
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,0,'Pricing must not submit paid jobs');
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend').get().n,0,'Pricing must not spend funds');
    assert.deepEqual(env.LAB_DB.db.prepare('SELECT vendor_quote_id FROM quotes').all().map(q=>q.vendor_quote_id),Array(4).fill('shared-exact-price-id'));
    const jobs=[];
    for(const q of quotes){
      const created=await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}});
      assert.equal(created.status,202,await created.clone().text());
      jobs.push((await created.json()).job.id);
    }
    assert.equal(submissions,4);
    assert.equal(new Set(keys).size,4,'Each billable task uses a distinct idempotency key');
    assert.equal(new Set(jobs).size,4);
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,4);
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend').get().n,4);
    const replay=await req(env,'/api/jobs',{method:'POST',data:{quoteId:quotes[0].id,confirm:true}});
    assert.equal(replay.status,200);
    assert.equal((await replay.json()).job.id,jobs[0]);
    assert.equal(submissions,4,'Reconfirming a PV LAB quote must never submit a fifth paid task');
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend').get().n,4);
  }finally{globalThis.fetch=previous;}
});

test('A reused provider quote ID with conflicting prices is rejected before any job or spend',async()=>{
  const {env}=fixture();await setup(env);
  const previous=globalThis.fetch;let checks=0,submissions=0;
  globalThis.fetch=async(url,options={})=>{
    const u=new URL(url);
    if(u.hostname==='api.spicyapi.ai'&&u.pathname.endsWith('/jobs/quote')){
      const cost=++checks===1?'0.010000':'0.020000';
      return Response.json({code:200,data:{quoteId:'conflicting-price-id',estimatedCost:cost,maxCharge:cost,currency:'USD',expiresAt:new Date(Date.now()+300000).toISOString()}});
    }
    if(u.hostname==='api.spicyapi.ai'&&u.pathname.endsWith('/jobs/createTask'))submissions++;
    return previous(url,options);
  };
  try{
    const priced=await req(env,'/api/quotes',{method:'POST',data:{settings:{...imageSettings,engine:'seedream'},count:2}});
    assert.equal(priced.status,502,await priced.clone().text());
    assert.match((await priced.json()).error,/inconsistent amounts/);
    assert.equal(checks,2);
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM quotes').get().n,0);
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,0);
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend').get().n,0);
    assert.equal(submissions,0);
  }finally{globalThis.fetch=previous;}
});

test('A multi-image Seedream price request stages each reference only once and preserves independent quotes',async()=>{
  const {env}=fixture();await setup(env);
  const ids=await Promise.all(['body','front','profile','hair'].map((name,i)=>uploadGuidanceReference(env,name+'.png',i+1)));
  const settings={...imageSettings,engine:'seedream',referenceRoles:ids.map((_,i)=>({role:i===0?'base':'identity',name:'reference-'+i+'.png'}))};
  const prior=globalThis.fetch, staged=new Map();let stagingCount=0,priceCount=0;
  const before=createCount;
  globalThis.fetch=async(url,options={})=>{
    const u=new URL(url);
    if(u.hostname==='api.spicyapi.ai'&&u.pathname.endsWith('/common/upload-url')){
      const input=JSON.parse(options.body),fileId='fil_batch_reference_'+(++stagingCount);
      staged.set(fileId,{input});
      return Response.json({code:200,data:{fileId,uploadUrl:'https://test.r2.cloudflarestorage.com/'+fileId,method:'PUT',headers:{'Content-Type':input.contentType,'Content-Length':String(input.bytes)},maxBytes:10485760,expiresAt:new Date(Date.now()+1200000).toISOString()}});
    }
    if(u.hostname==='test.r2.cloudflarestorage.com'){
      staged.get(u.pathname.slice(1)).bytes=new Uint8Array(options.body);
      return new Response(null,{status:200});
    }
    if(u.hostname==='api.spicyapi.ai'&&u.pathname.endsWith('/commit')){
      const fileId=u.pathname.split('/').at(-2),item=staged.get(fileId);
      return Response.json({code:200,data:{fileId,status:'ready',bytes:item.bytes.length,contentType:'image/png',sha256:Buffer.from(await crypto.subtle.digest('SHA-256',item.bytes)).toString('hex'),uri:'spicy://f/'+fileId,expiresAt:new Date(Date.now()+86400000).toISOString()}});
    }
    if(u.hostname==='api.spicyapi.ai'&&u.pathname.endsWith('/jobs/quote')){
      priceCount++;
      return Response.json({code:200,data:{quoteId:'unique-seedream-quote-'+priceCount,estimatedCost:'0.010000',maxCharge:'0.010000',currency:'USD',expiresAt:new Date(Date.now()+300000).toISOString()}});
    }
    return prior(url,options);
  };
  try{
    const result=await req(env,'/api/quotes',{method:'POST',data:{settings,referenceSourceIds:ids,count:2}});
    assert.equal(result.status,200,await result.clone().text());
    const priced=await result.json();
    assert.equal(priced.quotes.length,2);
    assert.equal(stagingCount,4,'Eight-reference batch must transfer 4 refs once, not twice');
    assert.equal(priceCount,2,'Each requested image receives its own provider quote');
    assert.equal(createCount,before,'Checking both prices never submits a paid task');
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend').get().n,0);
    assert.equal(new Set(priced.quotes.map(q=>q.id)).size,2);
    assert.deepEqual(env.LAB_DB.db.prepare('SELECT vendor_quote_id FROM quotes ORDER BY vendor_quote_id').all().map(q=>q.vendor_quote_id),['unique-seedream-quote-1','unique-seedream-quote-2']);
    assert.deepEqual(priced.quotes.map(q=>q.estimatedUsd),[0.01,0.01]);
    assert.ok(priced.quotes.every(q=>q.settings.referenceSourceIds.join(',')===ids.join(',')));
    const unsupported=await req(env,'/api/quotes',{method:'POST',data:{settings,referenceSourceIds:ids,count:5}});
    assert.equal(unsupported.status,400,'Unbounded multi-image quotes are not allowed');
    assert.equal(stagingCount,4,'Invalid counts do not transfer media');
  }finally{globalThis.fetch=prior;}
});

test('Image role-only edits compile automatically; invalid mappings and oversized final prompts stop before provider quotes',async()=>{
  const{env}=fixture();await setup(env);const base=await seedreamTestReference(env,'base.png',0),detail=await uploadGuidanceReference(env,'hands.png',0);
  const labels=[{role:'base'},{role:'detail',target:'hands'}],settings={...imageSettings,engine:'seedream',prompt:'',referenceRoles:labels};
  const roleOnly=await req(env,'/api/quotes',{method:'POST',data:{settings,referenceSourceIds:[base,detail]}});assert.equal(roleOnly.status,200,await roleOnly.clone().text());
  assert.match(quotedRequest.input.prompt,/Apply the assigned reference properties to the base image/);
  const rejected=[
    {name:'duplicate',ids:[base,base],settings,match:/duplicate reference/},
    {name:'mismatched roles',ids:[base],settings,match:/roles must match/},
    {name:'unknown role',ids:[base,detail],settings:{...settings,prompt:'Edit',referenceRoles:[{role:'base'},{role:'unrecognized'}]},match:/Unknown reference role/},
    {name:'missing detail',ids:[base,detail],settings:{...settings,prompt:'Edit',referenceRoles:[{role:'base'},{role:'detail'}]},match:/Choose a detail/},
    {name:'base ordering',ids:[base,detail],settings:{...settings,prompt:'Edit',referenceRoles:[{role:'identity'},{role:'base'}]},match:/Base image to Reference 1/},
    {name:'compiled length',ids:[base,detail],settings:{...settings,prompt:'a'.repeat(4900)},match:/automatic reference instructions is too long/}
  ];
  for(const item of rejected){
    const before=calls.length,res=await req(env,'/api/quotes',{method:'POST',data:{settings:item.settings,referenceSourceIds:item.ids}});
    assert.equal(res.status,400,item.name);assert.match((await res.json()).error,item.match,item.name);
    assert.equal(calls.slice(before).filter(c=>/\/jobs\/(quote|createTask)$|\/common\/upload-url$/.test(new URL(c.url).pathname)).length,0,item.name);
  }
});

test('Reference uploads retry a transient storage error once with identical bytes and never retry a paid job',async()=>{
  const {env}=fixture();await setup(env);const id=await uploadGuidanceReference(env,'base.png',42);
  const prior=globalThis.fetch;let attempts=[],statuses=[];
  globalThis.fetch=async(url,options={})=>{
    if(new URL(url).hostname==='test.r2.cloudflarestorage.com'){
      attempts.push({url:String(url),headers:[...new Headers(options.headers)],bytes:Buffer.from(options.body).toString('base64'),redirect:options.redirect});
      const status=statuses.shift();if(status)return new Response('Storage error',{status});
    }
    return prior(url,options);
  };
  try{
    for(const testCase of [
      {statuses:[500],expected:200,attempts:2},
      {statuses:[503],expected:200,attempts:2},
      {statuses:[500,500],expected:502,attempts:2},
      {statuses:[403],expected:502,attempts:1}
    ]){
      // Each scenario tests a new upload, independently of valid cached references.
      env.LAB_DB.db.exec('DELETE FROM lab_spicy_reference_cache');
      attempts=[];statuses=[...testCase.statuses];const before=createCount,callsBefore=calls.length;
      const response=await req(env,'/api/quotes',{method:'POST',data:{referenceSourceIds:[id],settings:{...imageSettings,engine:'seedream',referenceRoles:[{role:'base'}]}}});
      assert.equal(response.status,testCase.expected,await response.clone().text());assert.equal(attempts.length,testCase.attempts);
      assert.equal(createCount,before,'A media-upload retry must never buy a generation');
      if(attempts.length===2)assert.deepEqual(attempts[0],attempts[1],'Retry only the same bytes, URL and signed headers');
      if(response.status!==200){
        assert.match((await response.json()).error,/Uploaded photo 1.*HTTP (500|403)/);
        assert.equal(calls.slice(callsBefore).filter(c=>new URL(c.url).pathname.endsWith('/jobs/quote')).length,0);
      }
    }
  }finally{globalThis.fetch=prior;}
});

for(const [moodId,refVersion,builtInRefs] of [['berlin-rave','berlin-rave-refs-v1',BERLIN_RAVE_REFERENCES],['dreamcore','dreamcore-refs-v1',DREAMCORE_REFERENCES],['synthetic-romance','synthetic-romance-refs-v1',SYNTHETIC_ROMANCE_REFERENCES]]){
test(moodId+' stages its approved photographs after user images and binds them to the quote',async()=>{
  const {env}=fixture();await setup(env);
  const ids=await Promise.all(['base','outfit'].map((name,i)=>uploadGuidanceReference(env,name+'.png',i+1)));
  const prior=globalThis.fetch,staged=new Map();let sequence=0,failBuiltIn=false,priceCount=0;
  globalThis.fetch=async(url,options={})=>{
    const u=new URL(url);
    if(u.hostname==='api.spicyapi.ai'&&u.pathname.endsWith('/common/upload-url')){
      const input=JSON.parse(options.body),fileId='fil_berlin_reference_'+(++sequence);staged.set(fileId,{input});
      return Response.json({code:200,data:{fileId,uploadUrl:'https://test.r2.cloudflarestorage.com/'+fileId,method:'PUT',headers:{'Content-Type':input.contentType,'Content-Length':String(input.bytes)},maxBytes:10485760,expiresAt:new Date(Date.now()+1200000).toISOString()}});
    }
    if(u.hostname==='test.r2.cloudflarestorage.com'){
      const item=staged.get(u.pathname.slice(1));item.bytes=new Uint8Array(options.body);
      return new Response(null,{status:failBuiltIn&&item.input.contentType==='image/jpeg'?503:200});
    }
    if(u.hostname==='api.spicyapi.ai'&&u.pathname.endsWith('/commit')){
      const fileId=u.pathname.split('/').at(-2),item=staged.get(fileId);
      return Response.json({code:200,data:{fileId,status:'ready',bytes:item.bytes.length,contentType:item.input.contentType,sha256:Buffer.from(await crypto.subtle.digest('SHA-256',item.bytes)).toString('hex'),uri:'spicy://f/'+fileId,expiresAt:new Date(Date.now()+86400000).toISOString()}});
    }
    if(u.pathname.endsWith('/jobs/quote'))priceCount++;
    return prior(url,options);
  };
  try{
    for(const referenceMode of ['base','references'])for(const userIds of [ids,[]]){
      const labels=userIds.map((_,i)=>({role:i===0&&referenceMode==='base'?'base':'outfit'}));
      const recipe=prepareMoodPrompt('One adult dancer',moodId,80,{referenceCount:userIds.length,referenceMode});
      const settings={...imageSettings,engine:'seedream',mode:'image',referenceMode,prompt:recipe.prompt,...recipe.metadata,referenceRoles:labels};
      const assetsBefore=env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM assets').get().n,before=createCount;
      const res=await req(env,'/api/quotes',{method:'POST',data:{settings,referenceSourceIds:userIds}});
      assert.equal(res.status,200,await res.clone().text());const q=await res.json();
      assert.equal(createCount,before,'Quotes do not submit a generation');
      assert.equal(q.settings.moodReferenceVersion,refVersion);
      assert.equal(q.settings.moodReferenceCount,3);
      assert.deepEqual(q.settings.referenceSourceIds,userIds);
      assert.equal(q.settings.referenceRoles.length,userIds.length);
      assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM assets').get().n,assetsBefore,'Built-ins never become gallery assets');
      const saved=env.LAB_DB.db.prepare('SELECT source_id,payload FROM quotes WHERE id=?').get(q.id),payload=JSON.parse(saved.payload);
      assert.equal(saved.source_id,userIds[0]||null);
      assert.equal(payload.model,'bytedance/seedream-5.0-pro/edit');
      assert.equal(payload.input.aspect_ratio,'4:5');
      assert.equal(payload.input.image_urls.length,userIds.length+3);
      assert.equal(payload.input.prompt,compileImagePrompt(recipe.prompt,labels,settings));
      const bytes=payload.input.image_urls.map(uri=>staged.get(uri.split('/').at(-1)).bytes);
      assert.deepEqual(bytes.slice(userIds.length).map(x=>Buffer.from(x).toString('base64')),builtInRefs.map(x=>x.data));
      if(userIds.length)assert.deepEqual(bytes.slice(0,userIds.length).map(x=>x.at(-1)),[1,2]);
      assert.doesNotMatch(JSON.stringify(q),/base64|image\/jpeg/,'Reference bytes stay on the service');
    }
    env.LAB_DB.db.exec('DELETE FROM lab_spicy_reference_cache');
    failBuiltIn=true;const before=priceCount;
    const recipe=prepareMoodPrompt('One dancer',moodId,80);
    const response=await req(env,'/api/quotes',{method:'POST',data:{referenceSourceIds:[],settings:{...imageSettings,engine:'seedream',prompt:recipe.prompt,...recipe.metadata}}});
    assert.equal(response.status,502);assert.equal(priceCount,before,'Do not quote a render missing the locked references');
  }finally{globalThis.fetch=prior;}
});

test(moodId+' rejects excessive photos and oversized final prompts before any transfer',async()=>{
  const{env}=fixture();await setup(env);
  const ids=await Promise.all(Array.from({length:8},(_,i)=>uploadGuidanceReference(env,'ref-'+i+'.png',i)));
  for(const [userIds,prompt,match] of [[ids,'A dancer',/7 uploaded photos/],[ids.slice(0,1),'x'.repeat(4500),/too long/]]){
    const before=calls.length;
    const response=await req(env,'/api/quotes',{method:'POST',data:{referenceSourceIds:userIds,settings:{...imageSettings,engine:'seedream',moodId:moodId,moodIntensity:80,moodOriginalPrompt:'A dancer',prompt,referenceRoles:userIds.map((_,i)=>({role:i?'none':'base'}))}}});
    assert.equal(response.status,400);assert.match((await response.json()).error,match);
    assert.equal(calls.slice(before).filter(c=>/\/jobs\/(quote|createTask)$|\/common\/upload-url$/.test(new URL(c.url).pathname)).length,0);
  }
});

test('Nano Banana includes '+moodId+' references in normal and batch payloads without assigning a new Base',async()=>{
  const{env,objects}=fixture();env.GEMINI_API_KEY='synthetic-gemini-key';const base=await setup(env);
  const get=env.LAB_MEDIA.get;env.LAB_MEDIA.get=async(key)=>{const obj=await get(key);return obj?{...obj,arrayBuffer:async()=>objects.get(key).slice().buffer}:null;};
  const prior=globalThis.fetch;let submitted;
  globalThis.fetch=async(url,options={})=>{
    if(new URL(url).hostname==='generativelanguage.googleapis.com'){
      submitted=JSON.parse(options.body);
      return String(url).includes(':batchGenerateContent')?Response.json({name:'batches/berlin-test'}):Response.json({candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:Buffer.from([137,80,78,71,13,10,26,10,0]).toString('base64')}}]}}]});
    }
    return prior(url,options);
  };
  try{
    for(const processing of ['normal','batch'])for(const ids of [[base],[]]){
      const labels=ids.map(()=>({role:'base'})),recipe=prepareMoodPrompt('One dancer',moodId,80,{engine:'gemini',referenceCount:ids.length});
      const settings={...imageSettings,engine:'gemini',mode:'image',processing,prompt:recipe.prompt,...recipe.metadata,referenceRoles:labels};
      const response=await req(env,'/api/gemini/jobs',{method:'POST',data:{count:1,referenceSourceIds:ids,settings}});
      assert.equal(response.status,202,await response.clone().text());const job=(await response.json()).jobs[0];
      assert.equal(job.sourceId,ids[0]||null);assert.deepEqual(job.settings.referenceSourceIds,ids);
      assert.equal(job.settings.moodReferenceCount,3);
      const request=processing==='batch'?submitted.batch.input_config.requests.requests[0].request:submitted;
      const parts=request.contents[0].parts,images=parts.filter(p=>p.inlineData);
      assert.equal(parts[0].text,compileImagePrompt(recipe.prompt,labels,settings));
      assert.equal(images.length,ids.length+3);
      assert.deepEqual(images.slice(ids.length).map(p=>p.inlineData.data),builtInRefs.map(p=>p.data));
    }
  }finally{globalThis.fetch=prior;}
});

}

test('Nano Banana accepts the same role-only guidance with image order and target metadata intact',async()=>{
  const{env,objects}=fixture();env.GEMINI_API_KEY='synthetic-gemini-key';const base=await setup(env),detail=await uploadGuidanceReference(env,'hands.png',1);
  const get=env.LAB_MEDIA.get;env.LAB_MEDIA.get=async(key)=>{const obj=await get(key);return obj?{...obj,arrayBuffer:async()=>objects.get(key).slice().buffer}:null;};
  const originalFetch=globalThis.fetch;let submitted=null;
  globalThis.fetch=async(url,options={})=>{
    if(new URL(url).hostname==='generativelanguage.googleapis.com'){
      assert.equal(options.redirect,'manual');
      submitted=JSON.parse(options.body);return Response.json({candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:Buffer.from([137,80,78,71,13,10,26,10,0]).toString('base64')}}]}}]});
    }
    return originalFetch(url,options);
  };
  try{
    const labels=[{role:'base'},{role:'detail',target:'hands'}];
    const response=await req(env,'/api/gemini/jobs',{method:'POST',data:{count:1,referenceSourceIds:[base,detail],settings:{...imageSettings,engine:'gemini',prompt:'',referenceRoles:labels}}});
    assert.equal(response.status,202,await response.clone().text());const job=(await response.json()).jobs[0];assert.equal(job.status,'completed');
    const parts=submitted.contents[0].parts;assert.equal(parts[0].text,compileImagePrompt('',labels));
    assert.deepEqual(parts.filter(x=>x.inlineData).map(x=>Buffer.from(x.inlineData.data,'base64').at(-1)),[0,1]);
    assert.deepEqual(job.settings.referenceSourceIds,[base,detail]);assert.equal(job.settings.referenceRoles[1].target,'hands');
  }finally{globalThis.fetch=originalFetch;}
});

test('Gemini rejects redirects without forwarding credentials, retrying or releasing interrupted submissions',async()=>{
  const originalFetch=globalThis.fetch;let responseStatus=302,providerCalls=0;
  globalThis.fetch=async(url,options={})=>{
    assert.notEqual(new URL(url).hostname,'redirect.invalid','provider credentials must never reach a redirect target');
    if(new URL(url).hostname!=='generativelanguage.googleapis.com')return originalFetch(url,options);
    providerCalls++;assert.equal(options.redirect,'manual');assert.equal(options.method,'POST');assert.equal(new Headers(options.headers).get('x-goog-api-key'),'synthetic-gemini-key');
    return new Response('untrusted redirect response',{status:responseStatus,headers:{Location:'https://redirect.invalid/private?key=do-not-display'}});
  };
  try{
    for(const processing of ['normal','batch'])for(const status of [301,302,303,307,308]){
      responseStatus=status;providerCalls=0;const{env}=fixture();env.GEMINI_API_KEY='synthetic-gemini-key';
      const response=await req(env,'/api/gemini/jobs',{method:'POST',data:{count:1,referenceSourceIds:[],settings:{...imageSettings,engine:'gemini',processing}}});
      assert.equal(response.status,202);const job=(await response.json()).jobs[0];assert.equal(job.status,'uncertain');assert.match(job.error,/unexpected redirect/);assert.doesNotMatch(job.error,/redirect\.invalid|do-not-display|untrusted/);
      assert.equal(providerCalls,1);assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend WHERE job_id=?').get(job.id).n,1);
      if(processing==='normal'){const blocked=await req(env,'/api/gemini/jobs',{method:'POST',data:{count:1,referenceSourceIds:[],settings:{...imageSettings,engine:'gemini',processing}}});assert.equal(blocked.status,409);assert.equal(providerCalls,1);}
    }
  }finally{globalThis.fetch=originalFetch;}
});

test('Gemini keeps status classification and queued batch reservations when manual polling rejects a redirect',async()=>{
  const originalFetch=globalThis.fetch;let responseStatus=400,providerCalls=0;
  globalThis.fetch=async(url,options={})=>{
    if(new URL(url).hostname!=='generativelanguage.googleapis.com')return originalFetch(url,options);
    providerCalls++;assert.equal(options.redirect,'manual');
    if(responseStatus===200)return Response.json({name:'batches/synthetic-test'});
    if(responseStatus===307)return new Response(null,{status:307,headers:{Location:'https://redirect.invalid/no-follow'}});
    return Response.json({error:{message:'Synthetic provider error'}},{status:responseStatus});
  };
  try{
    for(const [status,state]of [[400,'failed'],[429,'failed'],[500,'uncertain']]){
      responseStatus=status;providerCalls=0;const{env}=fixture();env.GEMINI_API_KEY='synthetic-gemini-key';
      const response=await req(env,'/api/gemini/jobs',{method:'POST',data:{count:1,referenceSourceIds:[],settings:{...imageSettings,engine:'gemini'}}});assert.equal(response.status,202);assert.equal((await response.json()).jobs[0].status,state);assert.equal(providerCalls,1);
    }
    const{env}=fixture();env.GEMINI_API_KEY='synthetic-gemini-key';responseStatus=200;providerCalls=0;
    const queued=await req(env,'/api/gemini/jobs',{method:'POST',data:{count:1,referenceSourceIds:[],settings:{...imageSettings,engine:'gemini',processing:'batch'}}});assert.equal(queued.status,202);const job=(await queued.json()).jobs[0];assert.equal(job.status,'queued');
    responseStatus=307;const refreshed=(await(await req(env,'/api/jobs/'+job.id)).json()).job;assert.equal(refreshed.status,'queued');assert.match(refreshed.error,/Gemini polling:.*unexpected redirect/);assert.equal(providerCalls,2);
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend WHERE job_id=?').get(job.id).n,1);
  }finally{globalThis.fetch=originalFetch;}
});

test('Definite H3 Max FAL rejection becomes failed and releases its Lab budget reservation',async()=>{
  calls=[];falSubmitCount=0;falVideoReject=false;const {env}=fixture(),id=await setup(env);
  const settings={type:'video',engine:'h3maxfal',mode:'reference',prompt:'Keep the referenced subject consistent.',duration:10,resolution:'1080p',aspectRatio:'16:9',referenceRoles:[{name:'subject.png',role:'identity',note:''}],referencePixels:[1048576]};
  const qr=await req(env,'/api/quotes',{method:'POST',data:{settings,referenceSourceIds:[id]}});assert.equal(qr.status,200,await qr.clone().text());const q=await qr.json();
  assert.equal(q.settings.engine,'h3maxfal');
  const jr=await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}});assert.equal(jr.status,202,await jr.clone().text());const job=(await jr.json()).job;
  assert.equal(job.status,'queued');assert.equal(falSubmitCount,1);
  assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend WHERE job_id=?').get(job.id).n,1);
  falVideoReject=true;
  try{
    const refreshed=(await(await req(env,'/api/jobs/'+job.id)).json()).job;
    assert.equal(refreshed.status,'failed');assert.match(refreshed.error,/Provider rejected the request/);
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend WHERE job_id=?').get(job.id).n,0);
  }finally{falVideoReject=false;}
});

test('PV Soul Pro saves Nina identity once and reuses it with one base image on Ideogram 4.5',async()=>{
  calls=[];falSubmitCount=0;falState='IN_QUEUE';const {env}=fixture(),id=await setup(env);
  seedArchive(env.LAB_DB.db,'owner-internal',{jobs:509});
  const refUpload=await req(env,'/api/uploads',{method:'POST',raw:new Uint8Array([137,80,78,71,13,10,26,10,1]),headers:{'Content-Type':'image/png','X-Filename':'identity.png'}});assert.equal(refUpload.status,201);const refId=(await refUpload.json()).id;
  let identity=await req(env,'/api/soul-pro/identity',{method:'POST',data:{referenceSourceIds:[refId]}});assert.equal(identity.status,201,await identity.clone().text());assert.equal((await identity.json()).count,1);
  const saved=await(await req(env,'/api/soul-pro/identity')).json();assert.equal(saved.configured,true);assert.equal(saved.count,1);
  const packs=await(await req(env,'/api/packs')).json();assert.equal(packs.packs.length,0,'reserved Nina identity must stay out of normal packs');
  const settings={type:'image',engine:'soulpro',mode:'identity-edit',soulProModel:'ideogram45',soulProQuality:'medium',prompt:'',sourceWidth:512,sourceHeight:768,seed:42,referenceRoles:[]};
  const response=await req(env,'/api/fal/soul-pro',{method:'POST',data:{sourceId:id,referenceSourceIds:[],settings}});
  assert.equal(response.status,202,await response.clone().text());const job=(await response.json()).job;
  assert.equal(job.settings.engine,'soulpro');assert.equal(job.settings.soulProModel,'ideogram45');assert.deepEqual(job.settings.referenceSourceIds,[refId]);assert.equal(job.settings.inputTransport,'fal-cdn');assert.equal(job.settings.soulProQuality,'medium');assert.equal(job.estimatedUsd,.06);assert.equal(falSubmitCount,1);
  const submit=calls.findLast(c=>c.options.method==='POST'&&c.url.includes('/ideogram/v4.5/edit'));assert.ok(submit);
  const input=JSON.parse(submit.options.body);assert.ok(input.image_url);assert.equal(input.reference_image_urls.length,1);assert.notEqual(input.image_url,input.reference_image_urls[0]);
  assert.match(input.prompt,/Preserve the base source crop/i);assert.match(input.prompt,/Do not copy pose, body shape, wardrobe, room, background, camera angle or lighting/i);assert.match(input.prompt,/Never substitute a reference image for the base source/i);
  falState='COMPLETED';const done=(await(await req(env,'/api/jobs/'+job.id)).json()).job;assert.equal(done.status,'completed');assert.ok(done.outputId);assert.equal((await req(env,'/api/assets/'+done.outputId)).headers.get('content-type'),'image/png');
});

test('PV Soul Pro Ideogram quality tiers keep Precise Edit but change the estimate',async()=>{
  calls=[];falSubmitCount=0;falState='IN_QUEUE';const {env}=fixture(),id=await setup(env);
  const refUpload=await req(env,'/api/uploads',{method:'POST',raw:new Uint8Array([137,80,78,71,13,10,26,10,3]),headers:{'Content-Type':'image/png','X-Filename':'identity.png'}});const refId=(await refUpload.json()).id;
  await req(env,'/api/soul-pro/identity',{method:'POST',data:{referenceSourceIds:[refId]}});
  for(const [quality,cost] of [['very_low',.008],['low',.03],['medium',.06],['high',.22]]){
    falState='IN_QUEUE';
    const settings={type:'image',engine:'soulpro',mode:'identity-edit',soulProModel:'ideogram45',soulProQuality:quality,prompt:'',sourceWidth:512,sourceHeight:768,seed:'',referenceRoles:[]};
    const response=await req(env,'/api/fal/soul-pro',{method:'POST',data:{sourceId:id,referenceSourceIds:[],settings}});assert.equal(response.status,202,await response.clone().text());const job=(await response.json()).job;
    assert.equal(job.estimatedUsd,cost);assert.equal(job.settings.soulProQuality,quality);
    env.LAB_DB.db.prepare("UPDATE jobs SET state='failed' WHERE id=?").run(job.id);env.LAB_DB.db.prepare('DELETE FROM spend WHERE job_id=?').run(job.id);
  }
});

test('PV Soul Pro offers Kontext Max as a separate cheaper identity-edit engine without LoRA controls',async()=>{
  calls=[];falSubmitCount=0;falState='IN_QUEUE';const {env}=fixture(),id=await setup(env);
  const refUpload=await req(env,'/api/uploads',{method:'POST',raw:new Uint8Array([137,80,78,71,13,10,26,10,2]),headers:{'Content-Type':'image/png','X-Filename':'identity.png'}});assert.equal(refUpload.status,201);const refId=(await refUpload.json()).id;
  const settings={type:'image',engine:'soulpro',mode:'identity-edit',soulProModel:'kontextmax',prompt:'keep the original room',sourceWidth:768,sourceHeight:512,seed:'',referenceRoles:[{name:'identity.png',role:'identity',note:''}]};
  const response=await req(env,'/api/fal/soul-pro',{method:'POST',data:{sourceId:id,referenceSourceIds:[refId],settings}});
  assert.equal(response.status,202,await response.clone().text());const job=(await response.json()).job;
  assert.equal(job.estimatedUsd,.08);assert.equal(job.settings.soulProModel,'kontextmax');
  const submit=calls.findLast(c=>c.options.method==='POST'&&c.url.includes('/flux-pro/kontext/max/multi'));assert.ok(submit);
  const input=JSON.parse(submit.options.body);assert.equal(input.image_urls.length,2);assert.notEqual(input.image_urls[0],input.image_urls[1]);assert.equal(input.enhance_prompt,false);assert.match(input.prompt,/IMAGE 1 IS THE BASE SOURCE IMAGE TO EDIT/);assert.match(input.prompt,/Images 2 through 2 are identity references only/);assert.match(input.prompt,/Additional user-requested change to the BASE SOURCE only: keep the original room/);
});

test('Kontext Max keeps the base as Image 1 and caps the saved Nina profile at three identity refs',async()=>{
  calls=[];falSubmitCount=0;falState='IN_QUEUE';const {env}=fixture(),baseId=await setup(env),refIds=[];
  for(let i=0;i<4;i++){
    const up=await req(env,'/api/uploads',{method:'POST',raw:new Uint8Array([137,80,78,71,13,10,26,10,20+i]),headers:{'Content-Type':'image/png','X-Filename':'identity-'+i+'.png'}});
    assert.equal(up.status,201);refIds.push((await up.json()).id);
  }
  const saved=await req(env,'/api/soul-pro/identity',{method:'POST',data:{referenceSourceIds:refIds}});assert.equal(saved.status,201,await saved.clone().text());
  const settings={type:'image',engine:'soulpro',mode:'identity-edit',soulProModel:'kontextmax',prompt:'',sourceWidth:768,sourceHeight:512,seed:'',referenceRoles:[]};
  const response=await req(env,'/api/fal/soul-pro',{method:'POST',data:{sourceId:baseId,referenceSourceIds:[],settings}});
  assert.equal(response.status,202,await response.clone().text());
  const submit=calls.findLast(c=>c.options.method==='POST'&&c.url.includes('/flux-pro/kontext/max/multi'));assert.ok(submit);
  const input=JSON.parse(submit.options.body);
  assert.equal(input.image_urls.length,4,'Kontext accepts four images total: base + three identity refs');
  assert.match(input.prompt,/IMAGE 1 IS THE BASE SOURCE IMAGE TO EDIT/);
  assert.match(input.prompt,/Images 2 through 4 are identity references only/);
  assert.ok(input.image_urls.every(x=>/^https:\/\/v3\.fal\.media\/files\/inputs\//.test(x)));
});

test('Failed FAL image jobs can recover an already-generated provider output without resubmission',async()=>{
  calls=[];falSubmitCount=0;falState='IN_QUEUE';const {env}=fixture(),id=await setup(env);
  const refUpload=await req(env,'/api/uploads',{method:'POST',raw:new Uint8Array([137,80,78,71,13,10,26,10,4]),headers:{'Content-Type':'image/png','X-Filename':'identity.png'}});const refId=(await refUpload.json()).id;
  await req(env,'/api/soul-pro/identity',{method:'POST',data:{referenceSourceIds:[refId]}});
  const settings={type:'image',engine:'soulpro',mode:'identity-edit',soulProModel:'ideogram45',soulProQuality:'medium',prompt:'',sourceWidth:512,sourceHeight:768,seed:'',referenceRoles:[]};
  const response=await req(env,'/api/fal/soul-pro',{method:'POST',data:{sourceId:id,referenceSourceIds:[],settings}});const job=(await response.json()).job;
  assert.equal(falSubmitCount,1);env.LAB_DB.db.prepare("UPDATE jobs SET state='failed',error='fal.ai: Provider rejected the request.' WHERE id=?").run(job.id);
  env.LAB_DB.db.prepare('DELETE FROM spend WHERE job_id=?').run(job.id);
  const recovered=await req(env,'/api/jobs/'+job.id+'/recover',{method:'POST'});assert.equal(recovered.status,200,await recovered.clone().text());const done=(await recovered.json()).job;
  assert.equal(done.status,'completed');assert.ok(done.outputId);assert.equal(falSubmitCount,1,'recovery must not submit a new generation');
  const spent=env.LAB_DB.db.prepare('SELECT * FROM spend WHERE job_id=?').get(job.id);assert.equal(spent.estimate_microusd,60000);assert.equal(spent.created_at,job.createdAt);assert.equal(done.settledUsd,null);
  assert.equal((await req(env,'/api/jobs/'+job.id+'/recover',{method:'POST'})).status,409);assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend WHERE job_id=?').get(job.id).n,1);
});

test('FAL queue auth, lookup and transport failures preserve existing tasks and budget reservations',async()=>{
  const{env}=fixture(),sourceId=await topazSource(env);falState='IN_QUEUE';falUpscaleMode='ok';falSubmitCount=0;
  const q=await(await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings:topazSettings}})).json();
  const job=(await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json()).job;
  try{
    for(const status of [401,403,404,422,500]){
      falPollError=status;env.LAB_DB.db.prepare('UPDATE jobs SET last_poll=0 WHERE id=?').run(job.id);
      const refreshed=(await(await req(env,'/api/jobs/'+job.id)).json()).job;
      assert.equal(refreshed.status,'queued');assert.match(refreshed.error,new RegExp('HTTP '+status));
      assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend WHERE job_id=?').get(job.id).n,1);
    }
    delete env.FAL_KEY;const configured=(await(await req(env,'/api/jobs/'+job.id)).json()).job;assert.equal(configured.status,'queued');
    assert.equal(falSubmitCount,1);assert.ok(calls.some(c=>new URL(c.url).pathname==='/topaz/upscale/requests/fal_topaz_test_1234567890/status'));
  }finally{falPollError=0;}
});

test('Interrupted Soul Pro history reconciliation requires an exact saved input and never submits another generation',async()=>{
  for(const mode of ['absent','exact','claimed']){
    const{env}=fixture(),sourceId=await setup(env);calls=[];falSubmitMode='timeout';falSubmitCount=0;falState='COMPLETED';falHistoryItems=[];
    const refUpload=await req(env,'/api/uploads',{method:'POST',raw:new Uint8Array([137,80,78,71,13,10,26,10,99]),headers:{'Content-Type':'image/png','X-Filename':'identity.png'}});const refId=(await refUpload.json()).id;
    const settings={type:'image',engine:'soulpro',mode:'identity-edit',soulProModel:'ideogram45',soulProQuality:'medium',prompt:'Keep the studio composition.',sourceWidth:512,sourceHeight:768,seed:42,referenceRoles:[]};
    try{
      const response=await req(env,'/api/fal/soul-pro',{method:'POST',data:{sourceId,referenceSourceIds:[refId],settings}});const job=(await response.json()).job;assert.equal(job.status,'uncertain');assert.equal(job.providerTaskId,null);
      const original=JSON.parse(calls.find(c=>c.options.method==='POST'&&c.url.includes('/ideogram/v4.5/edit')).options.body);
      falSubmitMode='ok';if(mode!=='absent')falHistoryItems=[{endpoint_id:'ideogram/v4.5/edit',request_id:'fal_soulpro_ideogram_1234567890',sent_at:new Date(job.createdAt).toISOString(),json_input:original}];
      if(mode==='claimed')env.LAB_DB.db.prepare('INSERT INTO jobs(id,owner_id,source_id,params,state,provider_id,estimate_microusd,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),'owner-internal',sourceId,JSON.stringify(job.settings),'completed','fal_soulpro_ideogram_1234567890',60000,job.createdAt-1000,job.createdAt);
      // A later identity-pack change must not rewrite the interrupted request.
      await req(env,'/api/soul-pro/identity',{method:'POST',data:{referenceSourceIds:[sourceId]}});
      assert.equal((await req(env,'/api/jobs/'+job.id+'/reconcile',{method:'POST',data:{},authToken:guest})).status,403);
      const checked=await req(env,'/api/jobs/'+job.id+'/reconcile',{method:'POST',data:{}});assert.equal(checked.status,mode==='exact'?200:409,await checked.clone().text());
      const stored=env.LAB_DB.db.prepare('SELECT * FROM jobs WHERE id=?').get(job.id);assert.equal(stored.state,mode==='exact'?'completed':'uncertain');assert.equal(falSubmitCount,1);
      assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend WHERE job_id=?').get(job.id).n,1);
      if(mode==='exact'){assert.ok(stored.output_id);assert.equal((await req(env,'/api/jobs/'+job.id+'/reconcile',{method:'POST',data:{}})).status,409);}
      else{assert.equal(stored.provider_id,null);assert.match((await checked.json()).error,mode==='absent'?/does not prove/:/already linked/);assert.equal(stored.updated_at,job.updatedAt);}
    }finally{falSubmitMode='ok';falHistoryItems=[];}
  }
});

test('Historical inline Soul Pro requests remain recoverable without CDN uploads or another generation',async()=>{
  const{env,objects}=fixture(),sourceId=await setup(env);falSubmitMode='timeout';falSubmitCount=0;falHistoryItems=[];falState='COMPLETED';
  try{
    const job=(await(await req(env,'/api/fal/soul-pro',{method:'POST',data:{sourceId,referenceSourceIds:[sourceId],settings:{type:'image',engine:'soulpro',mode:'identity-edit',soulProModel:'ideogram45',sourceWidth:512,sourceHeight:768}}})).json()).job;
    const old={...job.settings,inputTransport:'inline-data-uri'},asset=env.LAB_DB.db.prepare('SELECT * FROM assets WHERE id=?').get(sourceId),dataUrl='data:image/png;base64,'+Buffer.from(objects.get(asset.object_key)).toString('base64');
    env.LAB_DB.db.prepare('UPDATE jobs SET params=? WHERE id=?').run(JSON.stringify(old),job.id);
    env.LAB_DB.db.prepare("UPDATE quotes SET payload='{}' WHERE id=(SELECT quote_id FROM jobs WHERE id=?)").run(job.id);
    falHistoryItems=[{endpoint_id:old.model,request_id:'fal_soulpro_ideogram_1234567890',sent_at:new Date(job.createdAt).toISOString(),json_input:buildSoulProInput(old,{sourceUrl:dataUrl,identityUrls:[dataUrl]})}];
    const uploads=falUploadCount,response=await req(env,'/api/jobs/'+job.id+'/reconcile',{method:'POST',data:{}});
    assert.equal(response.status,200,await response.clone().text());assert.equal((await response.json()).job.status,'completed');assert.equal(falSubmitCount,1);assert.equal(falUploadCount,uploads);
  }finally{falSubmitMode='ok';falHistoryItems=[];}
});

test('Soul Pro and Topaz upload failures release the estimate without ever submitting inference',async()=>{
  for(const engine of ['soulpro','topaz'])for(const mode of ['timeout','rejected']){
    const{env}=fixture(),sourceId=engine==='topaz'?await topazSource(env):await setup(env);
    falUploadMode=mode;falSubmitCount=0;calls=[];
    try{
      let response;
      if(engine==='soulpro')response=await req(env,'/api/fal/soul-pro',{method:'POST',data:{sourceId,referenceSourceIds:[sourceId],settings:{type:'image',engine:'soulpro',mode:'identity-edit',soulProModel:'ideogram45',sourceWidth:512,sourceHeight:768}}});
      else{const q=await(await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings:topazSettings}})).json();response=await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}});}
      assert.equal(response.status,202,await response.clone().text());const job=(await response.json()).job;
      assert.equal(job.status,'failed');assert.match(job.error,/FAL input upload:.*No generation was submitted/);
      assert.equal(falSubmitCount,0);assert.ok(!calls.some(c=>c.url.includes('queue.fal.run')));
      assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend').get().n,0);
      assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM assets').get().n,1);
    }finally{falUploadMode='ok';}
  }
});

test('Multi-megabyte Soul Pro images are uploaded intact before one small, persisted queue submission',async()=>{
  const{env,objects}=fixture(),sourceId=await setup(env);const base=env.LAB_DB.db.prepare('SELECT * FROM assets WHERE id=?').get(sourceId);
  const bytes=new Uint8Array(3_642_201);bytes.set([137,80,78,71,13,10,26,10]);objects.set(base.object_key,bytes);
  env.LAB_DB.db.prepare('UPDATE assets SET bytes=? WHERE id=?').run(bytes.length,sourceId);calls=[];falSubmitCount=0;
  const response=await req(env,'/api/fal/soul-pro',{method:'POST',data:{sourceId,referenceSourceIds:[sourceId],settings:{type:'image',engine:'soulpro',mode:'identity-edit',soulProModel:'ideogram45',sourceWidth:512,sourceHeight:768}}});
  assert.equal(response.status,202);const job=(await response.json()).job;assert.equal(job.status,'queued');assert.equal(falSubmitCount,1);
  const submission=calls.find(c=>c.url.includes('queue.fal.run')&&c.options.method==='POST');assert.ok(submission.options.body.length<4000);assert.ok(!submission.options.body.includes('base64'));
  const uploads=calls.filter(c=>c.options.method==='PUT');assert.equal(uploads.length,2);assert.ok(uploads.every(c=>c.options.body.length===bytes.length));
  assert.ok(calls.indexOf(submission)>calls.indexOf(uploads.at(-1)));
  const stored=env.LAB_DB.db.prepare('SELECT q.payload FROM quotes q JOIN jobs j ON j.quote_id=q.id WHERE j.id=?').get(job.id);
  assert.deepEqual(JSON.parse(stored.payload).input,JSON.parse(submission.options.body));
});

test('Topaz can recover a lost acknowledgement from the exact persisted CDN input without re-uploading',async()=>{
  const{env}=fixture(),sourceId=await topazSource(env);calls=[];falUpscaleMode='timeout';falSubmitCount=0;falHistoryItems=[];falState='COMPLETED';
  try{
    const q=await(await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings:topazSettings}})).json();
    const job=(await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json()).job;assert.equal(job.status,'uncertain');
    const input=JSON.parse(calls.find(c=>c.url.includes('queue.fal.run')&&c.options.method==='POST').options.body),uploads=calls.filter(c=>c.options.method==='PUT').length;
    falHistoryItems=[{endpoint_id:job.settings.model,request_id:'fal_topaz_test_1234567890',sent_at:new Date(job.createdAt).toISOString(),json_input:input}];
    const recovered=await req(env,'/api/jobs/'+job.id+'/reconcile',{method:'POST',data:{}});assert.equal(recovered.status,200,await recovered.clone().text());assert.equal((await recovered.json()).job.status,'completed');
    assert.equal(falSubmitCount,1);assert.equal(calls.filter(c=>c.options.method==='PUT').length,uploads);
  }finally{falUpscaleMode='ok';falHistoryItems=[];}
});

test('Soul Pro successful response without a task ID retains its interruption and reserved budget',async()=>{
  const{env}=fixture(),sourceId=await setup(env);falSubmitMode='missing-id';falSubmitCount=0;
  try{
    const response=await req(env,'/api/fal/soul-pro',{method:'POST',data:{sourceId,referenceSourceIds:[sourceId],settings:{type:'image',engine:'soulpro',mode:'identity-edit',soulProModel:'ideogram45',sourceWidth:512,sourceHeight:768}}});
    assert.equal(response.status,202);const job=(await response.json()).job;assert.equal(job.status,'uncertain');assert.equal(job.providerTaskId,null);
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend WHERE job_id=?').get(job.id).n,1);assert.equal(falSubmitCount,1);
  }finally{falSubmitMode='ok';}
});

test('History bulk delete removes only selected inactive jobs and rejects active selections',async()=>{
  const {env}=fixture(),sourceId=await setup(env);
  const base={type:'image',engine:'seedream',mode:'image',prompt:'test',resolution:'1k',aspectRatio:'1:1',outputFormat:'png',referenceRoles:[]};
  const ids=[];
  for(let i=0;i<3;i++){const r=await req(env,'/api/drafts',{method:'POST',data:{sourceId,settings:base}});ids.push((await r.json()).job.id);}
  let response=await req(env,'/api/jobs/bulk-delete',{method:'POST',data:{ids:ids.slice(0,2)}});assert.equal(response.status,200,await response.clone().text());assert.equal((await response.json()).deleted,2);
  assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,1);
  env.LAB_DB.db.prepare("UPDATE jobs SET state='running' WHERE id=?").run(ids[2]);
  response=await req(env,'/api/jobs/bulk-delete',{method:'POST',data:{ids:[ids[2]]}});assert.equal(response.status,409);
  assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,1);
});

test('PV Soul trains once through FAL, archives weights privately and builds Qwen 2512 LoRA quotes',async()=>{
  calls=[];falState='IN_QUEUE';falSubmitCount=0;const{env}=fixture();const referenceId=await setup(env);
  const zip=new Uint8Array(40);zip.set([0x50,0x4b,0x03,0x04]);
  let response=await req(env,'/api/soul/datasets',{method:'POST',raw:zip,headers:{'Content-Type':'application/zip','X-Photo-Count':'20'}});
  assert.equal(response.status,201);const dataset=await response.json();
  response=await req(env,'/api/soul/characters',{method:'POST',data:{name:'Nina FOK',datasetId:dataset.id,confirm:true}});
  assert.equal(response.status,202);let character=(await response.json()).character;assert.equal(character.state,'queued');assert.equal(falSubmitCount,1);
  falState='COMPLETED';
  const listed=await(await req(env,'/api/soul/characters')).json();character=listed.characters.find(x=>x.id===character.id);
  assert.equal(character.state,'ready');assert.equal(character.weightsArchived,true);
  assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM soul_datasets').get().n,0);
  assert.ok(env.LAB_DB.db.prepare('SELECT lora_object_key FROM soul_characters WHERE id=?').get(character.id).lora_object_key);
  const soulSettings={type:'image',engine:'soul',mode:'image',prompt:'Editorial portrait in soft window light.',resolution:'native',aspectRatio:'3:4',outputFormat:'png',referenceRoles:[],characterId:character.id,identityStrength:1};
  const draft=await req(env,'/api/drafts',{method:'POST',data:{settings:soulSettings,referenceSourceIds:[]}});assert.equal(draft.status,201,await draft.clone().text());
  response=await req(env,'/api/quotes',{method:'POST',data:{settings:soulSettings,referenceSourceIds:[]}});
  assert.equal(response.status,200,await response.clone().text());assert.equal(quotedRequest.model,'alibaba/qwen-image-2512-lora/text-to-image');assert.equal(quotedRequest.input.aspect_ratio,'3:4');assert.equal(quotedRequest.input.loras.length,1);assert.equal(quotedRequest.input.loras[0].scale,1);assert.match(quotedRequest.input.loras[0].path,/\/soul-weight\//);assert.match(quotedRequest.input.prompt,/trained adult character identity|trained adult character/i);
  const weightUrl=new URL(quotedRequest.input.loras[0].path);const weights=await req(env,weightUrl.pathname+weightUrl.search,{method:'GET',authToken:null,headers:{Origin:''}});assert.equal(weights.status,200);assert.equal((await weights.arrayBuffer()).byteLength,8);
  const roles=[{name:'pose.png',role:'pose',note:'Keep the pose and framing.'}];
  const editSettings={...soulSettings,referenceRoles:roles};
  response=await req(env,'/api/quotes',{method:'POST',data:{settings:editSettings,referenceSourceIds:[referenceId]}});
  assert.equal(response.status,400);
  assert.match(await response.text(),/reference-conditioned identity generation is disabled|does not accept reference images/i);
  assert.equal(falSubmitCount,1);
});

test('PV Soul migration is additive and idempotent',()=>{
  const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE lab_migrations(id TEXT PRIMARY KEY,applied_at INTEGER NOT NULL);');
  const migration=readFileSync(new URL('../lab-worker/migrations/0004-pv-soul.sql',import.meta.url),'utf8');
  db.exec(migration);db.exec(migration);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('soul_datasets','soul_characters')").get().n,2);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lab_migrations WHERE id='0004-pv-soul'").get().n,1);
});

test('Atomic image migration preserves existing completed video, private media pointers, provider key and spending ledger',()=>{
  const schema=readFileSync(new URL('../lab-worker/schema.sql',import.meta.url),'utf8').replaceAll('source_id TEXT REFERENCES assets(id)','source_id TEXT NOT NULL REFERENCES assets(id)');const db=new DatabaseSync(':memory:');db.exec(schema);
  db.exec("INSERT INTO settings VALUES('owner','encrypted-key',1,1,10000000,1);INSERT INTO assets VALUES('source','owner','owner/source','source','image/png','source.png',9,1),('output','owner','owner/result','video','video/mp4','result.mp4',12,1);INSERT INTO quotes VALUES('q','owner','source','{}',2700000,1,'provider-quote','2.7','{}');INSERT INTO jobs(id,owner_id,source_id,quote_id,params,state,output_id,created_at,updated_at,estimate_microusd) VALUES('job','owner','source','q','{}','completed','output',1,1,2700000);");
  const before=db.prepare('SELECT * FROM jobs').get();db.exec('BEGIN');db.exec(readFileSync(new URL('../lab-worker/migrations/0002-images.sql',import.meta.url),'utf8'));db.exec('COMMIT');assert.deepEqual(db.prepare('SELECT * FROM jobs').get(),before);assert.equal(db.prepare('SELECT encrypted_key FROM settings').get().encrypted_key,'encrypted-key');assert.equal(db.prepare('SELECT SUM(estimate_microusd) AS n FROM spend').get().n,2700000);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);db.exec("INSERT INTO jobs(id,owner_id,source_id,params,state,created_at,updated_at) VALUES('image-job','owner',NULL,'{}','draft',2,2)");assert.equal(db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,2);
});

const upscaleSettings={type:'image',mode:'upscale',upscaleEngine:'spicy',resolution:'4k',outputFormat:'png'};
function pngDimensions(width,height){const bytes=new Uint8Array(33);bytes.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);const view=new DataView(bytes.buffer);view.setUint32(16,width);view.setUint32(20,height);bytes[24]=8;bytes[25]=2;return bytes;}
async function topazSource(env,width=2000,height=1000){const bytes=pngDimensions(width,height),response=await req(env,'/api/uploads',{method:'POST',raw:bytes,headers:{'Content-Type':'image/png','X-Filename':'upscale-test.png'}});assert.equal(response.status,201);return(await response.json()).id;}
const topazSettings={type:'image',mode:'upscale',upscaleEngine:'topaz-precision',scale:2,topazModel:'Standard V2',outputFormat:'png'};

test('SeedVR2 Premium Upscale checks original dimensions, credits and exact FAL submission once',async()=>{
 for(const [scale,format,cost,credits] of [[2,'png',.004,10],[4,'jpeg',.013,18]]){
  const{env}=fixture(),sourceId=await topazSource(env,1000,800);calls=[];falSubmitCount=0;falUpscaleMode='ok';falState='IN_QUEUE';
  const settings={type:'image',mode:'upscale',upscaleEngine:'seedvr2',scale,outputFormat:format};
  const response=await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings}});
  assert.equal(response.status,200,await response.clone().text());const q=await response.json();
  assert.equal(q.provider,'fal.ai');assert.equal(q.priceIsEstimate,true);assert.equal(q.requiresPriceReview,true);
  assert.equal(q.estimatedUsd,cost);assert.equal(q.maxUsd,cost);assert.equal(q.creditCost,credits);
  assert.equal(q.settings.model,'fal-ai/seedvr/upscale/image');assert.equal(q.settings.sourceWidth,1000);assert.equal(q.settings.sourceHeight,800);
  assert.equal(q.settings.targetWidth,1000*scale);assert.equal(q.settings.targetHeight,800*scale);assert.equal(q.settings.topazModel,undefined);
  const stored=env.LAB_DB.db.prepare('SELECT params,payload FROM quotes WHERE id=?').get(q.id);
  assert.equal(JSON.parse(stored.params).customerChargeCredits,credits);
  assert.deepEqual(JSON.parse(stored.payload).input,{upscale_mode:'factor',upscale_factor:scale,noise_scale:0.1,output_format:format==='jpeg'?'jpg':'png'});
  assert.equal(falSubmitCount,0);assert.equal((await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id}})).status,400);
  const sent=await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}});
  assert.equal(sent.status,202,await sent.clone().text());const job=(await sent.json()).job;
  assert.equal(job.status,'queued');assert.equal(job.creditCost,credits);assert.equal(falSubmitCount,1);
  const posted=calls.find(c=>c.url.includes('queue.fal.run/fal-ai/seedvr/upscale/image')&&c.options.method==='POST');
  assert.ok(posted);const input=JSON.parse(posted.options.body);assert.equal(input.upscale_factor,scale);assert.equal(input.noise_scale,0.1);
  const repeat=(await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json()).job;
  assert.equal(repeat.id,job.id);assert.equal(falSubmitCount,1);
 }
});
test('SeedVR2 rejects too-large outputs and invalid options before spending',async()=>{
 const{env}=fixture(),sourceId=await topazSource(env,2000,1500);falSubmitCount=0;
 const settings={type:'image',mode:'upscale',upscaleEngine:'seedvr2',scale:2,outputFormat:'png'};
 for(const changed of [{scale:4},{scale:8},{topazModel:'Standard V2'},{outputFormat:'webp'}]){
  const r=await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings:{...settings,...changed}}});
  assert.equal(r.status,400,await r.clone().text());
 }
 assert.equal(falSubmitCount,0);
});

test('Topaz estimates use stored dimensions, started output-megapixel blocks and no paid provider request',async()=>{
  const cases=[['topaz-precision','Standard V2',4000,1500,0.08],['topaz-precision','High Fidelity V3',4001,1500,0.16],['topaz-wonder','Wonder 3.5',2000,1000,0.08],['topaz-wonder','Wonder 3.5',2001,1000,0.16]];
  for(const[upscaleEngine,topazModel,width,height,price]of cases){
    const{env}=fixture(),sourceId=await topazSource(env,width,height);calls=[];falSubmitCount=0;
    const response=await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings:{...topazSettings,upscaleEngine,topazModel,sourceWidth:1,sourceHeight:1,targetWidth:1,targetHeight:1}}});
    assert.equal(response.status,200,await response.clone().text());const q=await response.json();
    assert.equal(q.provider,'fal.ai');assert.equal(q.priceIsEstimate,true);assert.equal(q.requiresPriceReview,true);assert.equal(q.estimatedUsd,price);
    assert.equal(q.settings.sourceWidth,width);assert.equal(q.settings.sourceHeight,height);assert.equal(q.settings.targetWidth,width*2);assert.equal(q.settings.targetHeight,height*2);assert.equal(q.settings.resolution,'2x');
    const stored=env.LAB_DB.db.prepare('SELECT * FROM quotes WHERE id=?').get(q.id),payload=JSON.parse(stored.payload);
    assert.equal(payload.source.id,sourceId);assert.match(payload.source.sha256,/^[a-f0-9]{64}$/);assert.equal(payload.input.model,topazModel);assert.ok(!stored.payload.includes('data:image/'));assert.ok(stored.payload.length<1500);
    assert.equal(falSubmitCount,0);assert.ok(!calls.some(c=>/queue\.fal\.run|api\.spicyapi\.ai/.test(c.url)));
  }
});
test('Topaz submits the checked source and settings once, archives output and keeps estimates distinct from settlement',async()=>{
  const{env,objects}=fixture(),sourceId=await topazSource(env);calls=[];falSubmitCount=0;falUpscaleMode='ok';falState='IN_QUEUE';
  const q=await(await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings:topazSettings}})).json();
  assert.equal((await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id}})).status,400);
  const responses=await Promise.all([req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true,settings:{...topazSettings,scale:4}}}),req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})]);
  assert.ok(responses.every(r=>[200,202].includes(r.status)));const jobs=await Promise.all(responses.map(r=>r.json()));assert.equal(jobs[0].job.id,jobs[1].job.id);assert.equal(falSubmitCount,1);
  const posted=JSON.parse(calls.find(c=>c.options.method==='POST'&&c.url.includes('queue.fal.run/topaz/')).options.body);
  assert.equal(posted.model,'Standard V2');assert.equal(posted.upscale_factor,2);assert.match(posted.image_url,/^https:\/\/v3\.fal\.media\/files\/inputs\//);
  assert.deepEqual(calls.find(c=>c.options.method==='PUT'&&c.url.startsWith('https://v3.fal.media/upload/')).options.body,pngDimensions(2000,1000));
  assert.deepEqual(JSON.parse(env.LAB_DB.db.prepare('SELECT payload FROM quotes WHERE id=?').get(q.id).payload).submittedInput,posted);
  falState='COMPLETED';const completed=(await(await req(env,'/api/jobs/'+jobs[0].job.id)).json()).job;
  assert.equal(completed.status,'completed');assert.ok(completed.outputId);assert.equal(completed.sourceId,sourceId);assert.equal(completed.settledUsd,null);assert.equal(completed.estimatedUsd,.08);assert.equal(objects.size,2);
  const draft=await req(env,'/api/drafts',{method:'POST',data:{sourceId,settings:completed.settings}});assert.equal(draft.status,201);assert.equal(falSubmitCount,1);
  assert.equal((await req(env,'/api/quotes',{method:'POST',authToken:guest,data:{sourceId,settings:topazSettings}})).status,403);
  falState='IN_QUEUE';
});
test('Topaz rejects changed source bytes, unsupported engines, invalid dimensions, formats, factors and expired quotes before spending',async()=>{
  const{env,objects}=fixture(),sourceId=await topazSource(env);falSubmitCount=0;
  for(const bad of [{...topazSettings,upscaleEngine:'old-unsupported'},{...topazSettings,upscaleEngine:'invented'},{...topazSettings,scale:8},{...topazSettings,topazModel:'High Fidelity V2'},{...topazSettings,outputFormat:'webp'}])assert.equal((await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings:bad}})).status,400);
  const tooLarge=await topazSource(env,5000,5000);assert.equal((await req(env,'/api/quotes',{method:'POST',data:{sourceId:tooLarge,settings:{...topazSettings,scale:4}}})).status,400);
  const truncated=await setup(env);assert.equal((await req(env,'/api/quotes',{method:'POST',data:{sourceId:truncated,settings:topazSettings}})).status,400);
  const q=await(await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings:topazSettings}})).json();
  const asset=env.LAB_DB.db.prepare('SELECT * FROM assets WHERE id=?').get(sourceId);objects.get(asset.object_key)[32]^=1;
  assert.equal((await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).status,409);
  const fresh=await(await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings:topazSettings}})).json();env.LAB_DB.db.prepare('UPDATE quotes SET expires_at=? WHERE id=?').run(Date.now()-1,fresh.id);
  assert.equal((await req(env,'/api/jobs',{method:'POST',data:{quoteId:fresh.id,confirm:true}})).status,409);assert.equal(falSubmitCount,0);
});
test('High Fidelity V3 and Wonder 3.5 keep their exact FAL model payload through one idempotent submission',async()=>{
  for(const [upscaleEngine,quality,endpoint] of [['topaz-precision','High Fidelity V3','topaz/upscale/image/precision'],['topaz-wonder','Wonder 3.5','topaz/upscale/image/generative']]){
    const{env}=fixture(),sourceId=await topazSource(env);calls=[];falSubmitCount=0;falUpscaleMode='ok';falState='IN_QUEUE';
    const quoteResponse=await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings:{...topazSettings,upscaleEngine,topazModel:quality}}});
    assert.equal(quoteResponse.status,200);const q=await quoteResponse.json();
    assert.equal(q.settings.model,endpoint);assert.equal(q.settings.topazModel,quality);assert.equal(falSubmitCount,0);
    const payload=JSON.parse(env.LAB_DB.db.prepare('SELECT payload FROM quotes WHERE id=?').get(q.id).payload);
    assert.equal(payload.input.model,quality);
    const responses=await Promise.all([req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}}),req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})]);
    assert.ok(responses.every(r=>[200,202].includes(r.status)));const jobs=await Promise.all(responses.map(r=>r.json()));
    assert.equal(jobs[0].job.id,jobs[1].job.id);assert.equal(falSubmitCount,1);
    const posted=calls.filter(c=>c.options.method==='POST'&&new URL(c.url).pathname==='/'+endpoint);
    assert.equal(posted.length,1);
    const input=JSON.parse(posted[0].options.body);
    assert.deepEqual(input,{model:quality,upscale_factor:2,output_format:'png',crop_to_fill:false,face_enhancement:false,image_url:input.image_url});
    assert.match(input.image_url,/^https:\/\/v3\.fal\.media\/files\/inputs\//);
    assert.equal(jobs[0].job.settings.topazModel,quality);assert.equal(jobs[0].job.settings.model,endpoint);
  }
});

test('Topaz shares FAL upscale interruption, image-capacity and daily-budget gates without affecting SpicyAPI',async()=>{
  for(const mode of ['uncertain','capacity','budget']){
    const{env}=fixture(),sourceId=await topazSource(env),t=Date.now();falSubmitCount=0;
    if(mode==='budget')await req(env,'/api/settings',{method:'POST',data:{apiKey:KEY,enabled:true,termsConfirmed:true,dailyLimitUsd:1}});
    else for(let i=0;i<(mode==='capacity'?10:1);i++)env.LAB_DB.db.prepare('INSERT INTO jobs(id,owner_id,source_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),'owner-internal',sourceId,JSON.stringify(mode==='uncertain'?{type:'image',provider:'fal',engine:'upscale',mode:'upscale',model:'topaz/upscale/image/precision'}:{type:'image',provider:'fal',engine:'soulpro',mode:'identity-edit',model:'ideogram/v4.5/edit'}),mode==='uncertain'?'uncertain':'running',1000,t,t);
    if(mode==='budget')env.LAB_DB.db.prepare('INSERT INTO spend(job_id,owner_id,estimate_microusd,created_at) VALUES(?,?,?,?)').run(crypto.randomUUID(),'owner-internal',950000,t);
    const quoted=await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings:topazSettings}});assert.equal(quoted.status,200);const q=await quoted.json();
    assert.equal((await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).status,409);assert.equal(falSubmitCount,0);
  }
});
test('Distinct Topaz upscales can proceed beside an uncertain Soul Pro edit without changing its job, slot or held estimate',async()=>{
  for(const block of ['none','capacity','budget']){
    const{env}=fixture(),sourceId=await topazSource(env),t=Date.now(),oldId=crypto.randomUUID();falSubmitCount=0;falUpscaleMode='ok';
    if(block==='budget')await req(env,'/api/settings',{method:'POST',data:{apiKey:KEY,enabled:true,termsConfirmed:true,dailyLimitUsd:1}});
    const oldParams=JSON.stringify({type:'image',provider:'fal',engine:'soulpro',mode:'identity-edit',model:'ideogram/v4.5/edit'}),held=block==='budget'?950000:60000;
    env.LAB_DB.db.prepare('INSERT INTO jobs(id,owner_id,source_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(oldId,'owner-internal',sourceId,oldParams,'uncertain',held,t,t);
    env.LAB_DB.db.prepare('INSERT INTO spend(job_id,owner_id,estimate_microusd,created_at) VALUES(?,?,?,?)').run(oldId,'owner-internal',held,t);
    const before=env.LAB_DB.db.prepare('SELECT * FROM jobs WHERE id=?').get(oldId);
    if(block==='capacity')for(let i=0;i<9;i++)env.LAB_DB.db.prepare('INSERT INTO jobs(id,owner_id,source_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),'owner-internal',sourceId,oldParams,'queued',1000,t,t);
    const quoteResponse=await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings:topazSettings}});assert.equal(quoteResponse.status,200);const q=await quoteResponse.json();assert.equal(falSubmitCount,0);
    const submitted=await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}});assert.equal(submitted.status,block==='none'?202:409,await submitted.clone().text());
    if(block==='none'){
      const job=(await submitted.json()).job;assert.equal(job.status,'queued');assert.notEqual(job.id,oldId);assert.equal(falSubmitCount,1);
      const repeated=(await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json()).job;assert.equal(repeated.id,job.id);assert.equal(falSubmitCount,1);
      assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend WHERE job_id=?').get(job.id).n,1);
    }else{assert.equal(falSubmitCount,0);assert.match((await submitted.json()).error,block==='capacity'?/slots are active/:/daily spending limit/);}
    assert.deepEqual(env.LAB_DB.db.prepare('SELECT * FROM jobs WHERE id=?').get(oldId),before);
    assert.equal(env.LAB_DB.db.prepare('SELECT estimate_microusd AS held FROM spend WHERE job_id=?').get(oldId).held,held);
  }
});

test('An uncertain Topaz upscale blocks fresh submissions across both engines while the original quote remains idempotent',async()=>{
  const{env}=fixture(),sourceId=await topazSource(env);falSubmitCount=0;falUpscaleMode='timeout';
  try{
    const q=await(await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings:topazSettings}})).json();
    const original=(await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json()).job;assert.equal(original.status,'uncertain');assert.equal(falSubmitCount,1);
    falUpscaleMode='ok';
    for(const upscaleEngine of ['topaz-precision','topaz-wonder']){
      const fresh=await(await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings:{...topazSettings,upscaleEngine,topazModel:upscaleEngine==='topaz-wonder'?'Wonder 3.5':'Standard V2'}}})).json();
      const blocked=await req(env,'/api/jobs',{method:'POST',data:{quoteId:fresh.id,confirm:true}});assert.equal(blocked.status,409);assert.match((await blocked.json()).error,/fal.ai upscale is interrupted/);
    }
    const repeated=(await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json()).job;assert.equal(repeated.id,original.id);assert.equal(repeated.status,'uncertain');assert.equal(falSubmitCount,1);
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,1);assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend WHERE job_id=?').get(original.id).n,1);
  }finally{falUpscaleMode='ok';}
});

test('Topaz definite rejections release budget; timeout and malformed success retain reservation without automatic retries',async()=>{
  for(const mode of ['rejected','timeout','missing-id']){
    const{env}=fixture(),sourceId=await topazSource(env);falSubmitCount=0;falUpscaleMode=mode;
    const q=await(await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings:topazSettings}})).json();
    const response=await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}});assert.equal(response.status,202);const job=(await response.json()).job;
    assert.equal(job.status,mode==='rejected'?'failed':'uncertain');assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend WHERE job_id=?').get(job.id).n,mode==='rejected'?0:1);
    await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}});assert.equal(falSubmitCount,1);
  }
  falUpscaleMode='ok';
});
test('Stored image dimension parser supports JPEG orientation and WebP headers, and rejects truncated headers',()=>{
  const jpeg=new Uint8Array([255,216,255,225,0,34,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0,255,192,0,11,8,1,44,2,88,1,1,17,0,255,217]);
  assert.deepEqual(storedImageDimensions(jpeg,'image/jpeg'),{width:300,height:600});
  const webp=new Uint8Array(30);webp.set(Buffer.from('RIFF'));new DataView(webp.buffer).setUint32(4,22,true);webp.set(Buffer.from('WEBPVP8X'),8);new DataView(webp.buffer).setUint32(16,10,true);webp[24]=255;webp[25]=3;webp[27]=255;webp[28]=1;
  assert.deepEqual(storedImageDimensions(webp,'image/webp'),{width:1024,height:512});
  assert.throws(()=>storedImageDimensions(webp.subarray(0,29),'image/webp'),/Truncated/);assert.throws(()=>storedImageDimensions(jpeg.subarray(0,20),'image/jpeg'),/Invalid JPEG segment/);
});
test('Definite SpicyAPI submission rejection releases the local budget for image and upscale retries',async()=>{
  const oldPrice=maxPrice;maxPrice='0.093000';providerState='queued';
  try{
    for(const settings of [imageSettings,upscaleSettings]){
      const{env}=fixture(),setupId=await setup(env),id=settings.mode==='upscale'?setupId:await seedreamTestReference(env,'retry-image.png',7);createCount=0;
      const data={sourceId:id,referenceSourceIds:settings.mode==='upscale'?[]:[id],settings};
      const q=await(await req(env,'/api/quotes',{method:'POST',data})).json();
      createMode='pricechange';
      const rejected=await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}}),failed=(await rejected.json()).job;
      assert.equal(rejected.status,202);assert.equal(failed.status,'failed');assert.match(failed.error,/quote expired or changed/i);
      assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend WHERE job_id=?').get(failed.id).n,0,'A definite rejection before task acceptance must not consume Lab budget');
      createMode='timeout';
      const retry=await(await req(env,'/api/quotes',{method:'POST',data})).json();
      const uncertain=(await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:retry.id,confirm:true}})).json()).job;
      assert.equal(uncertain.status,'uncertain');
      assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend WHERE job_id=?').get(uncertain.id).n,1,'An unconfirmed provider submission must retain its reservation');
      assert.equal(createCount,2);
    }
  }finally{maxPrice=oldPrice;createMode='ok';}
});
test('SpicyAPI image and upscale submissions ignore fal.ai interrupted jobs and active slots',async()=>{
  const oldPrice=maxPrice;maxPrice='0.093000';createMode='ok';providerState='queued';
  const foreignSettings=[
    {type:'image',provider:'fal',engine:'soulpro',model:'fal-ai/ideogram/v4.5/edit'},
    {type:'image',engine:'fal',model:'fal-ai/flux-general'},
    {type:'image',engine:'soulpro',model:'fal-ai/flux-pro/kontext/max/multi'},
    {type:'video',engine:'h3maxfal',model:'fal-ai/minimax/h3-max/reference-to-video'},
    {type:'video',engine:'omni',model:'fal-ai/gemini-omni-flash-1.1'},
    {type:'image',model:'fal-ai/flux-general'}
  ];
  try{
    for(const settings of [imageSettings,upscaleSettings])for(const foreign of foreignSettings){
      createCount=0;const{env}=fixture(),setupId=await setup(env),id=settings.mode==='upscale'?setupId:await seedreamTestReference(env,'spicy-reference.png',8),t=Date.now();
      for(let i=0;i<11;i++)env.LAB_DB.db.prepare('INSERT INTO jobs(id,owner_id,source_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)')
        .run(crypto.randomUUID(),'owner-internal',id,JSON.stringify(foreign),i===0?'uncertain':'queued',1000,t+i,t+i);
      const quoted=await req(env,'/api/quotes',{method:'POST',data:{sourceId:id,referenceSourceIds:settings.mode==='upscale'?[]:[id],settings}});
      assert.equal(quoted.status,200);const q=await quoted.json();
      const submitted=await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}}),result=await submitted.json();
      assert.equal(submitted.status,202,JSON.stringify({settings,foreign,result}));
      assert.equal(result.job.status,'queued');assert.equal(createCount,1);
      assert.equal(env.LAB_DB.db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE state='uncertain'").get().n,1,'Must preserve the other provider interruption for review');
    }
  }finally{maxPrice=oldPrice;}
});
test('Upscale quotes require one source but no prompt; completed image retains original and safe reuse',async()=>{
 createMode='ok';createCount=0;providerState='queued';const{env}=fixture(),id=await setup(env);
 const missing=await req(env,'/api/quotes',{method:'POST',data:{settings:upscaleSettings}});assert.equal(missing.status,400);
 const qres=await req(env,'/api/quotes',{method:'POST',data:{sourceId:id,settings:upscaleSettings}});assert.equal(qres.status,200);const q=await qres.json();
 assert.equal(quotedRequest.model,'spicyapi/image-upscaler-v1/upscale');assert.equal(quotedRequest.input.image_url,'spicy://f/fil_synthetic_reference');assert.equal(quotedRequest.input.prompt,undefined);assert.equal(quotedRequest.input.aspect_ratio,undefined);assert.equal(createCount,0);
 const job=(await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json()).job;
 providerState='succeeded';const done=(await(await req(env,'/api/jobs/'+job.id)).json()).job;assert.equal(done.status,'completed');assert.equal(done.settings.mode,'upscale');assert.equal(done.sourceId,id);assert.notEqual(done.outputId,id);
 assert.equal((await req(env,'/api/assets/'+done.outputId)).headers.get('content-type'),'image/png');
 const reuse=await req(env,'/api/drafts',{method:'POST',data:{sourceId:done.sourceId,settings:done.settings}});assert.equal(reuse.status,201);assert.equal(createCount,1);
 assert.equal((await req(env,'/api/quotes',{method:'POST',authToken:guest,data:{sourceId:id,settings:upscaleSettings}})).status,403);
});
test('Upscale rejects invented presets and unsupported formats without buying a task',async()=>{
 const{env}=fixture(),id=await setup(env);createCount=0;
 for(const bad of [{...upscaleSettings,resolution:'16k'},{...upscaleSettings,outputFormat:'exe'}])assert.equal((await req(env,'/api/quotes',{method:'POST',data:{sourceId:id,settings:bad}})).status,400);
 assert.equal(createCount,0);
});
test('Oversized originals can use a separately-owned working copy while preserving original history pointers',async()=>{
 const{env}=fixture();await setup(env);const copyId=await seedreamTestReference(env,'working-copy.png',0);createCount=0;createMode='ok';providerState='queued';
 const bytes=new Uint8Array(11*1024*1024);bytes.set([137,80,78,71,13,10,26,10]);
 const upload=await req(env,'/api/uploads',{method:'POST',raw:bytes,headers:{'Content-Type':'image/png','X-Filename':'large-source.png'}});assert.equal(upload.status,201);const id=(await upload.json()).id;
 const blocked=await req(env,'/api/quotes',{method:'POST',data:{referenceSourceIds:[id],settings:imageSettings}});assert.equal(blocked.status,400);assert.equal(createCount,0);
 const r=await req(env,'/api/quotes',{method:'POST',data:{referenceSourceIds:[id],transferSourceIds:[copyId],settings:imageSettings}});assert.equal(r.status,200);const q=await r.json();assert.deepEqual(q.settings.referenceSourceIds,[id]);assert.deepEqual(q.settings.transferSourceIds,[copyId]);assert.match(q.settings.transferNotes[0],/11.00 MiB/);
 const j=(await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json()).job;assert.equal(j.sourceId,id);assert.equal(createCount,1);
 assert.equal((await req(env,'/api/assets/'+id)).headers.get('content-length'),String(bytes.length));
 const wrong=await req(env,'/api/quotes',{method:'POST',data:{referenceSourceIds:[id],transferSourceIds:[crypto.randomUUID()],settings:imageSettings}});assert.equal(wrong.status,404);
 const mismatch=await req(env,'/api/quotes',{method:'POST',data:{referenceSourceIds:[id],transferSourceIds:[],settings:imageSettings}});assert.equal(mismatch.status,400);
});

test('Large upscale PNG output is streamed to private storage and not limited to the upload ceiling',async()=>{
 const originalFetch=globalThis.fetch;createMode='ok';providerState='queued';const{env,objects}=fixture(),id=await setup(env);
 const parts=[];let outputKey='';env.LAB_MEDIA.createMultipartUpload=async key=>{outputKey=key;return {uploadPart:async(number,bytes)=>{parts.push(new Uint8Array(bytes));return {partNumber:number,etag:'test'};},complete:async()=>{const all=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}objects.set(outputKey,all);},abort:async()=>{throw new Error('Unexpected abort');}};};
 const size=21*1024*1024+13,header=new Uint8Array([137,80,78,71,13,10,26,10]);
 try{
  const q=await(await req(env,'/api/quotes',{method:'POST',data:{sourceId:id,settings:upscaleSettings}})).json();
  const j=(await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json()).job;
  globalThis.fetch=async(url,options)=>{if(String(url)==='https://cdn.spicyapi.ai/test.png'){let sent=0;return new Response(new ReadableStream({pull(controller){if(sent===size){controller.close();return;}const n=Math.min(sent===0?4:1024*1024,size-sent),b=new Uint8Array(n);for(let i=0;i<n&&sent+i<header.length;i++)b[i]=header[sent+i];sent+=n;controller.enqueue(b);}}),{headers:{'content-type':'image/png','content-length':String(size)}});}return originalFetch(url,options);};
  providerState='succeeded';const done=(await(await req(env,'/api/jobs/'+j.id)).json()).job;
  assert.equal(done.status,'completed');assert.ok(parts.length>=3);assert.equal(objects.get(outputKey).length,size);assert.equal((await req(env,'/api/assets/'+done.outputId)).headers.get('content-type'),'image/png');
 }finally{globalThis.fetch=originalFetch;}
});

test('Provider balance and spending-cap errors remain distinct and redact private details without paid requests',async()=>{
  const originalFetch=globalThis.fetch;
  for(const [code,detail,expected] of [[40201,'Available balance is insufficient','insufficient available provider balance'],[40202,'This key has reached its daily spend cap','provider spending limit']]){
    const {env}=fixture();const id=await setup(env);createCount=0;
    try{
      globalThis.fetch=async(url,options={})=>new URL(url).pathname.endsWith('/jobs/quote')?Response.json({code,msg:detail+' sk-spicy-private-test-secret https://private.example/signed-token',data:null},{status:402}):originalFetch(url,options);
      const response=await req(env,'/api/quotes',{method:'POST',data:{sourceId:id,settings:p}});
      assert.equal(response.status,422);const text=JSON.stringify(await response.json());
      assert.ok(text.includes('['+code+']'));assert.ok(text.includes(expected));assert.ok(text.includes(detail));
      assert.ok(!text.includes('sk-spicy-private-test-secret'));assert.ok(!text.includes('private.example'));
      assert.equal(createCount,0);assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,0);
      assert.equal(env.LAB_DB.db.prepare('SELECT daily_limit_microusd AS n FROM settings').get().n,10000000);
    }finally{globalThis.fetch=originalFetch;}
  }
});

async function soulPair(env,objects,{adapter=true}={}){
 const parent=crypto.randomUUID(),child=crypto.randomUUID(),t=Date.now();
 for(const [id,name] of [[parent,'Nina'],...(adapter?[[child,'Nina / Reinterpret']]:[])]){
  const key='owner-internal/soul/weights/'+id+'.safetensors';objects.set(key,new Uint8Array([1,2,3,4]));
  env.LAB_DB.db.prepare("INSERT INTO soul_characters(id,owner_id,name,trigger_word,state,lora_object_key,created_at,updated_at) VALUES(?,?,?,?,'ready',?,?,?)").run(id,'owner-internal',name,'pv_'+id.slice(0,8),key,t,t);
 }
 if(adapter)env.LAB_DB.db.prepare('INSERT INTO soul_reinterpret_links VALUES(?,?,?,?)').run(child,parent,'z-image-turbo','fal-ai/z-image-trainer');
 return {parent,child};
}
const reSettings=characterId=>({type:'image',engine:'soul',mode:'reinterpret',characterId,preset:'photographic-real-skin',prompt:'',imageFidelity:.82,identityStrength:1.25,keepComposition:true,keepStyling:false,aspectRatio:'source',resolution:'1.5k',outputFormat:'png'});
test('Reinterpret uses only compatible child weights and one staged source; archives output and restores settings',async()=>{
 const {env,objects}=fixture(),sourceId=await setup(env),{parent,child}=await soulPair(env,objects);createMode='ok';createCount=0;providerState='queued';
 const settings=reSettings(parent),r=await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings}});assert.equal(r.status,200,await r.clone().text());const q=await r.json();
 assert.equal(quotedRequest.model,'alibaba/z-image-turbo-lora/edit');const input=quotedRequest.input;
 assert.deepEqual(Object.keys(input).sort(),['image_url','loras','output_format','prompt','resolution','strength']);
 assert.equal(input.image_url,'spicy://f/fil_synthetic_reference');assert.equal(input.strength,.18);assert.equal(input.loras[0].scale,1.25);
 assert.equal(new URL(input.loras[0].path).pathname,'/soul-weight/'+child);assert.match(input.prompt,new RegExp('pv_'+child.slice(0,8)));assert.ok(!input.prompt.includes('pv_'+parent.slice(0,8)));assert.match(input.prompt,/Lock the source camera geometry/);assert.match(input.prompt,/preset is dominant/);assert.match(input.prompt,/Do not import body shape/);assert.match(input.prompt,/body reshaping/);assert.match(input.prompt,/pores/i);
 const weight=new URL(input.loras[0].path);assert.equal((await req(env,weight.pathname+weight.search,{method:'HEAD',authToken:null,headers:{Origin:''}})).status,200);
 const job=(await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json()).job;providerState='succeeded';
 const done=(await(await req(env,'/api/jobs/'+job.id)).json()).job;assert.equal(done.status,'completed');assert.equal(done.sourceId,sourceId);assert.ok(done.outputId);assert.equal(done.settings.reinterpretAdapterId,child);
 assert.equal((await req(env,'/api/assets/'+done.outputId)).headers.get('content-type'),'image/png');
 const draft=(await(await req(env,'/api/drafts',{method:'POST',data:{sourceId,settings:done.settings}})).json()).job;
 for(const [key,value] of Object.entries(settings))assert.deepEqual(draft.settings[key],value,key);
 assert.equal(createCount,1);providerState='queued';
});
test('Reinterpret rejects missing or extra sources, incompatible identity, cross-owner assets and invalid controls before quotes',async()=>{
 const {env,objects}=fixture(),sourceId=await setup(env),{parent,child}=await soulPair(env,objects),settings=reSettings(parent);createCount=0;
 const absent=await soulPair(env,objects,{adapter:false});
 for(const data of [
  {settings}, {sourceId,referenceSourceIds:[sourceId],settings}, {sourceId,lastSourceId:sourceId,settings},
  {sourceId,settings:{...settings,characterId:absent.parent}}, {sourceId,settings:{...settings,characterId:child}},
  ...[{preset:'invented'},{imageFidelity:1},{identityStrength:4},{keepComposition:'yes'},{aspectRatio:'16:9'},{outputFormat:'webp'},{resolution:'4k'},{prompt:'x'.repeat(3001)}].map(x=>({sourceId,settings:{...settings,...x}}))
 ]){const r=await req(env,'/api/quotes',{method:'POST',data});assert.ok([400,409].includes(r.status),await r.text());}
 const foreign=crypto.randomUUID();env.LAB_DB.db.prepare('INSERT INTO assets VALUES(?,?,?,?,?,?,?,?)').run(foreign,'another-owner','foreign/source','source','image/png','source.png',9,Date.now());
 assert.equal((await req(env,'/api/quotes',{method:'POST',data:{sourceId:foreign,settings}})).status,404);
 env.LAB_DB.db.prepare("UPDATE soul_characters SET state='training' WHERE id=?").run(child);
 assert.equal((await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings}})).status,409);
 assert.equal(createCount,0);
});
test('Reinterpret live quotes obey budget, concurrency and ambiguous-submit gates without automatic retry',async()=>{
 const oldPrice=maxPrice;maxPrice='0.1';
 try{
  const {env,objects}=fixture(),sourceId=await setup(env),{parent}=await soulPair(env,objects),settings=reSettings(parent);createCount=0;createMode='timeout';
  const quoteRe=async()=>{const r=await req(env,'/api/quotes',{method:'POST',data:{sourceId,settings}});assert.equal(r.status,200);return r.json();};
  const q=await quoteRe(),res=await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}}),job=(await res.json()).job;assert.equal(job.status,'uncertain');
  const repeated=await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}});assert.equal(repeated.status,200);assert.equal((await repeated.json()).job.id,job.id);
  const q2=await quoteRe();assert.equal((await req(env,'/api/jobs',{method:'POST',data:{quoteId:q2.id,confirm:true}})).status,409);assert.equal(createCount,1);
  await req(env,'/api/jobs/'+job.id+'/resolve',{method:'POST',data:{confirm:true}});createMode='ok';
  env.LAB_DB.db.prepare('INSERT INTO spend VALUES(?,?,?,?)').run(crypto.randomUUID(),'owner-internal',10000000,Date.now());
  assert.equal((await req(env,'/api/jobs',{method:'POST',data:{quoteId:q2.id,confirm:true}})).status,409);assert.equal(createCount,1);
  env.LAB_DB.db.exec('DELETE FROM spend');
  for(let n=0;n<10;n++)env.LAB_DB.db.prepare("INSERT INTO jobs(id,owner_id,params,state,created_at,updated_at) VALUES(?,?,?,'queued',?,?)").run(crypto.randomUUID(),'owner-internal',JSON.stringify(settings),Date.now(),Date.now());
  assert.equal((await req(env,'/api/jobs',{method:'POST',data:{quoteId:q2.id,confirm:true}})).status,409);assert.equal(createCount,1);
 }finally{maxPrice=oldPrice;createMode='ok';}
});
test('Secondary identity requires paid approval and budget, trains Z-Image once, and leaves the Text identity intact',async()=>{
 const {env,objects}=fixture();await setup(env);const {parent}=await soulPair(env,objects,{adapter:false});falSubmitCount=0;falState='IN_QUEUE';
 const before=env.LAB_DB.db.prepare('SELECT * FROM soul_characters WHERE id=?').get(parent),zip=new Uint8Array(40);zip.set([0x50,0x4b,0x03,0x04]);
 const ds=await(await req(env,'/api/soul/datasets',{method:'POST',raw:zip,headers:{'Content-Type':'application/zip','X-Photo-Count':'20'}})).json();
 const data={name:'Nina / Reinterpret',datasetId:ds.id,confirm:true,reinterpretFor:parent};
 assert.equal((await req(env,'/api/soul/characters',{method:'POST',data})).status,400);
 data.confirmPaidTraining=true;
 await req(env,'/api/settings',{method:'POST',data:{enabled:true,termsConfirmed:true,dailyLimitUsd:1}});
 assert.equal((await req(env,'/api/soul/characters',{method:'POST',data})).status,409);assert.equal(falSubmitCount,0);
 await req(env,'/api/settings',{method:'POST',data:{enabled:true,termsConfirmed:true,dailyLimitUsd:10}});
 const response=await req(env,'/api/soul/characters',{method:'POST',data});assert.equal(response.status,202,await response.clone().text());const child=(await response.json()).character;
 assert.equal(falSubmitCount,1);assert.equal(env.LAB_DB.db.prepare('SELECT estimate_microusd FROM spend WHERE job_id=?').get(child.id).estimate_microusd,2260000);
 assert.ok(calls.some(c=>c.url==='https://queue.fal.run/fal-ai/z-image-trainer'&&c.options.method==='POST'));
 assert.equal((await req(env,'/api/soul/characters',{method:'POST',data})).status,409);assert.equal(falSubmitCount,1);
 falState='COMPLETED';const list=(await(await req(env,'/api/soul/characters')).json()).characters;
 assert.equal(list.find(c=>c.id===parent).reinterpret.state,'ready');assert.equal(list.find(c=>c.id===child.id).adapterFor,parent);assert.deepEqual(env.LAB_DB.db.prepare('SELECT * FROM soul_characters WHERE id=?').get(parent),before);
 const text={...imageSettings,engine:'soul',characterId:parent,identityStrength:1,resolution:'native',aspectRatio:'3:4',referenceRoles:[]};
 assert.equal((await req(env,'/api/quotes',{method:'POST',data:{settings:text}})).status,200);assert.equal(quotedRequest.model,'alibaba/qwen-image-2512-lora/text-to-image');assert.ok(quotedRequest.input.loras[0].path.includes(parent));
 assert.equal((await req(env,'/api/quotes',{method:'POST',data:{settings:{...text,characterId:child.id}}})).status,400);
 const migration=readFileSync(new URL('../lab-worker/migrations/0005-soul-reinterpret.sql',import.meta.url),'utf8');env.LAB_DB.db.exec(migration);env.LAB_DB.db.exec(migration);assert.deepEqual(env.LAB_DB.db.prepare('PRAGMA foreign_key_check').all(),[]);falState='IN_QUEUE';
});
test('FAL inputs last 24 hours, support anonymous HEAD, and definitive result 422 fails once and releases the Lab estimate',async()=>{
 const {env}=fixture(),sourceId=await setup(env);const settings={type:'image',engine:'fal',mode:'controlled-repair',prompt:'Repair natural texture',sourceWidth:512,sourceHeight:512,referenceRoles:[]};
 falSubmitCount=0;falState='IN_QUEUE';
 const res=await req(env,'/api/fal/repair',{method:'POST',data:{sourceId,maskSourceId:sourceId,settings}});assert.equal(res.status,202,await res.clone().text());const job=(await res.json()).job;
 const call=calls.findLast(c=>c.options.method==='POST'&&c.url.includes('flux-general'));assert.ok(call);const input=JSON.parse(call.options.body);
 for(const value of [input.image_url,input.mask_url]){
  const u=new URL(value),ttl=Number(u.searchParams.get('expires'))-Math.floor(Date.now()/1000);assert.ok(ttl>=86395&&ttl<=86400);
  const head=await req(env,u.pathname+u.search,{method:'HEAD',authToken:null,headers:{Origin:''}});assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),'9');assert.equal(await head.text(),'');
  u.searchParams.set('expires',String(Number(u.searchParams.get('expires'))+1));assert.equal((await req(env,u.pathname+u.search,{authToken:null,headers:{Origin:''}})).status,403);
 }
 const spent=env.LAB_DB.db.prepare('SELECT SUM(estimate_microusd) AS n FROM spend').get().n;assert.equal(spent,75000);
 falState='COMPLETED';falResult422=true;
 try{const done=(await(await req(env,'/api/jobs/'+job.id)).json()).job;assert.equal(done.status,'failed');assert.match(done.error,/expired/);await req(env,'/api/jobs/'+job.id);assert.equal(falSubmitCount,1);assert.equal(env.LAB_DB.db.prepare('SELECT SUM(estimate_microusd) AS n FROM spend').get().n,null);}
 finally{falState='IN_QUEUE';falResult422=false;}
});
test('Ambiguous secondary training never retries automatically; simultaneous approved retries claim it once',async()=>{
 const {env,objects}=fixture();await setup(env);const {parent}=await soulPair(env,objects,{adapter:false}),zip=new Uint8Array(40);zip.set([0x50,0x4b,0x03,0x04]);
 const ds=await(await req(env,'/api/soul/datasets',{method:'POST',raw:zip,headers:{'Content-Type':'application/zip','X-Photo-Count':'20'}})).json();
 falSubmitMode='timeout';falSubmitCount=0;
 try{
  const r=await req(env,'/api/soul/characters',{method:'POST',data:{name:'Nina / Reinterpret',datasetId:ds.id,confirm:true,reinterpretFor:parent,confirmPaidTraining:true}});assert.equal(r.status,202);const c=(await r.json()).character;assert.equal(c.state,'uncertain');
  await req(env,'/api/soul/characters');await req(env,'/api/soul/characters');assert.equal(falSubmitCount,1);
  assert.equal((await req(env,'/api/soul/characters/'+c.id+'/retry',{method:'POST',data:{confirm:false}})).status,400);
  falSubmitMode='ok';const attempts=await Promise.all([1,2].map(()=>req(env,'/api/soul/characters/'+c.id+'/retry',{method:'POST',data:{confirm:true}})));assert.deepEqual(attempts.map(r=>r.status).sort(),[202,409]);assert.equal(falSubmitCount,2);
  assert.equal(env.LAB_DB.db.prepare('SELECT SUM(estimate_microusd) AS n FROM spend').get().n,2260000);
 }finally{falSubmitMode='ok';}
});


test('Precision Edit binds each paid FLUX job to exactly one approved quote, even on repeated submit',async()=>{
  const {env}=fixture();await setup(env);
  const png=new Uint8Array(33),view=new DataView(png.buffer);
  png.set([137,80,78,71,13,10,26,10],0);view.setUint32(8,13);
  png.set([73,72,68,82],12);view.setUint32(16,640);view.setUint32(20,480);
  const upload=async name=>{
    const response=await req(env,'/api/uploads',{method:'POST',raw:png,headers:{'Content-Type':'image/png','X-Filename':name}});
    assert.equal(response.status,201,await response.clone().text());return (await response.json()).id;
  };
  const originalSourceId=await upload('original.png'),sourceId=await upload('working.png'),maskSourceId=await upload('mask.png');
  const details={originalSourceId,sourceId,maskSourceId,prompt:'Change only the selected clothing',strength:.75};
  const quote=await req(env,'/api/precision/quote',{method:'POST',data:details});
  assert.equal(quote.status,200,await quote.clone().text());
  const priced=await quote.json();
  assert.match(priced.quoteId,/^[a-f0-9-]{36}$/);
  assert.equal(priced.priceIsEstimate,true);
  assert.ok(priced.estimatedUsd>0);
  const submission={...details,quoteId:priced.quoteId,ticket:priced.ticket,expiresAt:priced.expiresAt};
  const before=falSubmitCount;
  const firstResponse=await req(env,'/api/precision/submit',{method:'POST',data:submission});
  assert.equal(firstResponse.status,202,await firstResponse.clone().text());
  const firstJob=(await firstResponse.json()).job;
  assert.equal(firstJob.status,'queued');
  assert.equal(firstJob.settings.precisionOriginalId,originalSourceId);
  const secondResponse=await req(env,'/api/precision/submit',{method:'POST',data:submission});
  assert.equal(secondResponse.status,202,await secondResponse.clone().text());
  assert.equal((await secondResponse.json()).job.id,firstJob.id);
  assert.equal(falSubmitCount,before+1,'Repeated approval may never create a second provider inference');
  const jobs=env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM jobs WHERE quote_id=?').get(priced.quoteId);
  assert.equal(jobs.n,1);
  const altered=await req(env,'/api/precision/submit',{method:'POST',data:{...submission,prompt:'Change the entire photograph'}});
  // The quote is already consumed, so retry returns the original job without new inference.
  assert.equal(altered.status,202);
  assert.equal((await altered.json()).job.id,firstJob.id);
  assert.equal(falSubmitCount,before+1);
  const separate=await req(env,'/api/precision/quote',{method:'POST',data:details});
  assert.equal(separate.status,200);
  const quoted=(await separate.json());
  const mismatch=await req(env,'/api/precision/submit',{method:'POST',data:{...submission,quoteId:quoted.quoteId}});
  assert.equal(mismatch.status,409,'Quote ticket cannot be reused for a different quote');
});

test('Seedream rejects >36MP input before a provider quote and accepts a separate working copy',async()=>{
  const {env}=fixture();await setup(env);
  const high=await seedreamTestReference(env,'high-resolution.png',1,7728,5152);
  const before=calls.length,created=createCount;
  const rejected=await req(env,'/api/quotes',{method:'POST',data:{settings:imageSettings,referenceSourceIds:[high]}});
  assert.equal(rejected.status,400,await rejected.clone().text());
  assert.match((await rejected.json()).error,/36 megapixels/);
  assert.equal(createCount,created);
  assert.equal(calls.slice(before).filter(x=>/\/jobs\/(quote|createTask)$/.test(new URL(x.url).pathname)).length,0);
  const safe=await seedreamTestReference(env,'sized-working-copy.png',2,7000,4700);
  const quoted=await req(env,'/api/quotes',{method:'POST',data:{settings:imageSettings,referenceSourceIds:[high],transferSourceIds:[safe]}});
  assert.equal(quoted.status,200,await quoted.clone().text());
  const q=await quoted.json();
  assert.deepEqual(q.settings.referenceSourceIds,[high]);
  assert.deepEqual(q.settings.transferSourceIds,[safe]);
  assert.equal(createCount,created,'Working-copy preparation and quotes never submit a paid task.');
});


test('authenticated thumbnail route returns cached compressed WebP, while the original GET remains full-size',async()=>{
 const{env,objects}=fixture(),id=await setup(env);
 const WEBP=new Uint8Array([82,73,70,70,8,0,0,0,87,69,66,80,86,80,56,32,1,2,3,4]);
 let transforms=0;
 env.IMAGES={input(body){
   assert.ok(body);
   return{
     transform(settings){assert.deepEqual(settings,{width:480,height:480,fit:'scale-down'});return this;},
     output(settings){
       transforms++;
       assert.deepEqual(settings,{format:'image/webp',quality:80,anim:false});
       return{response:()=>new Response(WEBP,{headers:{'content-type':'image/webp'}})};
     }
   };
 }};
 const path='/api/assets/'+id;
 const preview=await req(env,path+'/thumbnail');
 assert.equal(preview.status,200);
 assert.equal(preview.headers.get('content-type'),'image/webp');
 assert.equal(preview.headers.get('cache-control'),'no-store','Worker middleware disables all caching of private responses');
 assert.deepEqual(new Uint8Array(await preview.arrayBuffer()),WEBP);
 assert.equal(transforms,1);
 const repeat=await req(env,path+'/thumbnail');
 assert.equal(repeat.status,200);
 assert.deepEqual(new Uint8Array(await repeat.arrayBuffer()),WEBP);
 assert.equal(transforms,1,'second view reads stored WebP without transforming');
 const full=await req(env,path);
 assert.equal(full.status,200);
 assert.equal(full.headers.get('content-type'),'image/png');
 assert.deepEqual(new Uint8Array(await full.arrayBuffer()),new Uint8Array([137,80,78,71,13,10,26,10,0]));
 assert.equal((await req(env,path+'/thumbnail',{authToken:guest})).status,403,'private thumbnails require an authorized account');
 assert.equal((await req(env,'/api/assets/'+crypto.randomUUID()+'/thumbnail')).status,404);
 assert.ok([...objects.keys()].some(key=>key.includes('/thumbnails/v2-480q80/')&&key.endsWith('/'+id+'.webp')));
});

test('native Lab session keeps signature verification and explicit origin/transport restrictions',async()=>{
 const {env}=fixture();const native=await token('user_Owner',{azp:undefined,sid:'sess_MobileFixture'});
 assert.equal((await req(env,'/api/session',{authToken:native,headers:{'X-PV-Lab-Client':'mobile-v1'}})).status,200);
 assert.equal((await req(env,'/api/session',{authToken:native})).status,401);
 assert.equal((await req(env,'/api/session',{authToken:native,headers:{'X-PV-Lab-Client':'mobile-v1',Origin:'https://evil.example'}})).status,403);
 const badParty=await token('user_Owner',{azp:'https://evil.example',sid:'sess_MobileFixture'});
 assert.equal((await req(env,'/api/session',{authToken:badParty,headers:{'X-PV-Lab-Client':'mobile-v1'}})).status,401);
 const pieces=native.split('.');pieces[2]=(pieces[2][0]==='A'?'B':'A')+pieces[2].slice(1);
 assert.equal((await req(env,'/api/session',{authToken:pieces.join('.'),headers:{'X-PV-Lab-Client':'mobile-v1'}})).status,401);
 const expired=await token('user_Owner',{azp:undefined,sid:'sess_MobileFixture',exp:1});
 assert.equal((await req(env,'/api/session',{authToken:expired,headers:{'X-PV-Lab-Client':'mobile-v1'}})).status,401);
 const pending=await token('user_Owner',{azp:undefined,sid:'sess_MobileFixture',sts:'pending'});
 assert.equal((await req(env,'/api/session',{authToken:pending,headers:{'X-PV-Lab-Client':'mobile-v1'}})).status,401);
 const guest=await token('user_Guest',{azp:undefined,sid:'sess_MobileFixture'});
 assert.equal((await req(env,'/api/session',{authToken:guest,headers:{'X-PV-Lab-Client':'mobile-v1'}})).status,403);
});


test('Qwen Image 3.0 uses its real edit route, staged references and a bounded quote before generation',async()=>{
  createCount=0;createMode='ok';providerState='queued';const {env}=fixture(),id=await setup(env);
  const settings={type:'image',engine:'qwen3',mode:'image',prompt:'Keep the face, change the light to cobalt blue.',resolution:'2k',aspectRatio:'3:4',referenceRoles:[{name:'portrait.png',role:'base'}]};
  const response=await req(env,'/api/quotes',{method:'POST',data:{settings,referenceSourceIds:[id]}});
  assert.equal(response.status,200,await response.clone().text());
  const quote=await response.json();
  assert.equal(quote.settings.model,'alibaba/qwen-image-3.0/edit');
  assert.equal(quotedRequest.model,quote.settings.model);
  assert.equal(quotedRequest.input.resolution,'2k');
  assert.equal(quotedRequest.input.aspect_ratio,'3:4');
  assert.equal(quotedRequest.input.enable_prompt_expansion,false);
  assert.equal(quotedRequest.input.num_outputs,1);
  assert.equal(quotedRequest.input.image_urls.length,1);
  assert.match(quotedRequest.input.image_urls[0],/^spicy:\/\/f\//);
  assert.match(quotedRequest.input.prompt,/Keep the face/);
  assert.equal(createCount,0,'A quote is never a paid generation');
  const submitted=await req(env,'/api/jobs',{method:'POST',data:{quoteId:quote.id,confirm:true}});
  assert.equal(submitted.status,202,await submitted.clone().text());
  assert.equal(createCount,1);
  assert.equal((await submitted.json()).job.settings.engine,'qwen3');
  const second=await req(env,'/api/jobs',{method:'POST',data:{quoteId:quote.id,confirm:true}});
  assert.equal(second.status,200);
  assert.equal(createCount,1,'No duplicate paid submission');
  const rejected=await req(env,'/api/quotes',{method:'POST',data:{settings:{...settings,referenceRoles:[{role:'none'},{role:'none'},{role:'none'},{role:'none'}]},referenceSourceIds:[id,id,id,id]}});
  assert.equal(rejected.status,400,'Qwen exceeds three sources before any provider request');
});

test('Z-Image Spicy routes only text to image and never bills an unsupported reference edit',async()=>{
  createCount=0;createMode='ok';providerState='queued';const {env}=fixture(),id=await setup(env);
  const settings={type:'image',engine:'zspicy',mode:'image',prompt:'A surreal editorial portrait in a cobalt-blue studio',resolution:'1.5k',aspectRatio:'16:9',referenceRoles:[]};
  const blocked=await req(env,'/api/quotes',{method:'POST',data:{settings,referenceSourceIds:[id]}});
  assert.equal(blocked.status,400,'A Base photograph must not be silently ignored');
  assert.equal(createCount,0);
  const quoteRes=await req(env,'/api/quotes',{method:'POST',data:{settings,referenceSourceIds:[]}});
  assert.equal(quoteRes.status,200,await quoteRes.clone().text());
  const quote=await quoteRes.json();
  assert.equal(quote.settings.model,'alibaba/z-image-spicy/text-to-image');
  assert.equal(quotedRequest.model,'alibaba/z-image-spicy/text-to-image');
  assert.deepEqual(Object.keys(quotedRequest.input).sort(),['enable_prompt_expansion','height','prompt','width']);
  assert.equal(quotedRequest.input.width,1536);
  assert.equal(quotedRequest.input.height,864);
  assert.equal(quotedRequest.input.enable_prompt_expansion,false);
  assert.equal(createCount,0);
  const submitted=await req(env,'/api/jobs',{method:'POST',data:{quoteId:quote.id,confirm:true}});
  assert.equal(submitted.status,202,await submitted.clone().text());
  assert.equal(createCount,1);
  assert.equal((await submitted.json()).job.settings.engine,'zspicy');
});


test('Seedance 1.5 Motion and 2.5 4K routes quote exact provider parameters without paid generation',async()=>{
  const {env}=fixture(),id=await setup(env);
  createCount=0;maxPrice='2.700000';providerState='queued';createMode='ok';
  const motion={type:'video',engine:'seedance15',mode:'start',duration:10,resolution:'720p',
    aspectRatio:'16:9',prompt:'Camera stays fixed while the coat ripples.',audio:false,cameraFixed:true,seed:13,referenceRoles:[]};
  const one=await req(env,'/api/quotes',{method:'POST',data:{settings:motion,sourceId:id}});
  assert.equal(one.status,200,await one.clone().text());
  const a=await one.json();
  assert.equal(a.settings.model,'bytedance/seedance-1.5-pro/image-to-video');
  assert.equal(a.creditCost,810,'300 credits per quoted USD for silent 1.5 Pro 720p');
  assert.equal(quotedRequest.input.camera_fixed,true);
  assert.equal(quotedRequest.input.generate_audio,false);
  assert.equal(quotedRequest.input.duration_seconds,10);
  assert.equal(quotedRequest.input.resolution,'720p');
  assert.equal(quotedRequest.input.seed,13);
  assert.match(quotedRequest.input.image_url,/^https:\/\//);
  assert.equal(createCount,0,'A provider quote does not submit a paid job');
  const textMode=await req(env,'/api/quotes',{method:'POST',data:{settings:{...motion,mode:'text'},sourceId:null}});
  assert.equal(textMode.status,200,await textMode.clone().text());
  assert.equal(quotedRequest.model,'bytedance/seedance-1.5-pro/text-to-video');
  assert.equal((await textMode.json()).creditCost,810,'same discounted rate on silent Seedance 1.5 text-to-video');
  assert.equal(quotedRequest.input.image_url,undefined);
  const fourK={type:'video',engine:'seedance4k',mode:'start',duration:10,resolution:'4k',
    aspectRatio:'auto',prompt:'A model turns toward the lens.',audio:true,seed:'',referenceRoles:[]};
  const q=await req(env,'/api/quotes',{method:'POST',data:{settings:fourK,sourceId:id}});
  assert.equal(q.status,200,await q.clone().text());
  assert.equal((await q.json()).creditCost,513,'190 credits per quoted USD on premium 4K');
  assert.equal(quotedRequest.model,'bytedance/seedance-2.5-spicy/image-to-video');
  assert.equal(quotedRequest.input.resolution,'4k');
  assert.equal(quotedRequest.input.aspect_ratio,undefined);
  assert.equal(quotedRequest.input.camera_fixed,undefined);
  assert.equal(createCount,0);
});

test('Seedream 5 Lite quotes and submits both text and reference edit with exact 2K size presets',async()=>{
  const {env}=fixture(),id=await setup(env);
  // The legacy 9-byte PNG signature cannot pass the real pixel-limit validator.
  const image=await grainPng(8,8,40,'lite-reference');
  const row=env.LAB_DB.db.prepare('SELECT object_key FROM assets WHERE id=?').get(id);
  await env.LAB_MEDIA.put(row.object_key,image);
  env.LAB_DB.db.prepare('UPDATE assets SET bytes=? WHERE id=?').run(image.length,id);
  createCount=0;maxPrice='0.035000';providerState='queued';createMode='ok';
  const lite={type:'image',engine:'seedreamlite',mode:'image',
    prompt:'High fashion photograph with directional flash.',resolution:'2k',
    aspectRatio:'16:9',outputFormat:'png',referenceRoles:[]};
  const txt=await req(env,'/api/quotes',{method:'POST',data:{settings:lite,referenceSourceIds:[]}});
  assert.equal(txt.status,200,await txt.clone().text());
  const p=await txt.json();
  assert.equal(p.creditCost,20,'SpicyAPI image retail prices round up to five-credit steps');
  assert.equal(quotedRequest.model,'bytedance/seedream-5.0-lite/text-to-image');
  assert.equal(quotedRequest.input.size,'2848*1600');
  assert.equal(quotedRequest.input.resolution,undefined);
  assert.equal(createCount,0);
  const edit=await req(env,'/api/quotes',{method:'POST',data:{
    settings:{...lite,aspectRatio:'3:4',referenceRoles:[{role:'base'}]},
    referenceSourceIds:[id]
  }});
  assert.equal(edit.status,200,await edit.clone().text());
  const editQuote=await edit.json();
  assert.equal(quotedRequest.model,'bytedance/seedream-5.0-lite/edit');
  assert.equal(quotedRequest.input.size,'1728*2304');
  assert.equal(quotedRequest.input.image_urls.length,1);
  assert.match(quotedRequest.input.image_urls[0],/^spicy:\/\/f\//);
  const submit=await req(env,'/api/jobs',{method:'POST',data:{quoteId:editQuote.id,confirm:true}});
  assert.equal(submit.status,202,await submit.clone().text());
  assert.equal(createCount,1);
  const submittedJob=(await submit.json()).job;
  assert.equal(submittedJob.settings.engine,'seedreamlite');
  assert.equal(submittedJob.settings.customerChargeCredits,20,'Job history keeps its exact rounded quoted credits');
  assert.equal(submittedJob.creditCost,20);
  assert.equal((await req(env,'/api/jobs',{method:'POST',data:{quoteId:editQuote.id,confirm:true}})).status,200);
  assert.equal(createCount,1,'One bound quote cannot create duplicate paid jobs');
});


test('An unconfirmed Nano Banana Pro job does not strand public customers or permit silent new charges',async()=>{
  const {env,owner,authToken}=await archiveAccount(true);
  env.GEMINI_API_KEY='synthetic-gemini-key';
  const db=env.LAB_DB.db,t=Date.now(),oldId=crypto.randomUUID();
  const settings={...imageSettings,type:'image',provider:'gemini',engine:'gemini',model:'gemini-3-pro-image',processing:'normal'};
  db.prepare("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'uncertain',?,?,?)")
    .run(oldId,owner,JSON.stringify(settings),134000,t-300000,t-300000);
  const balance=()=>db.prepare('SELECT balance_credits AS n FROM lab_customers WHERE id=?').get(owner).n;
  assert.equal(balance(),938,'Old uncertain transaction retains its reserved 62 credits');
  const endpoint='/api/gemini/jobs',payload={count:1,referenceSourceIds:[],settings},previous=globalThis.fetch;
  let paidCalls=0;
  globalThis.fetch=async(url,options)=>{
    if(new URL(url).hostname==='generativelanguage.googleapis.com'){
      paidCalls++;
      throw new Error('Simulated lost Gemini acknowledgement');
    }
    return previous(url,options);
  };
  try{
    const notConfirmed=await req(env,endpoint,{method:'POST',authToken,data:payload});
    assert.equal(notConfirmed.status,409);
    assert.match((await notConfirmed.json()).error,/explicitly confirm a NEW credit charge/);
    assert.equal(paidCalls,0);
    assert.equal(balance(),938,'A denied request never charges a new image');
    const selfResolved=await req(env,'/api/jobs/'+oldId+'/resolve',{method:'POST',authToken,data:{confirm:true}});
    assert.equal(selfResolved.status,403,'A customer cannot clear an unverified paid request');
    assert.equal(db.prepare('SELECT state FROM jobs WHERE id=?').get(oldId).state,'uncertain');

    const confirmed=await req(env,endpoint,{method:'POST',authToken,data:{...payload,confirmNewCharge:true}});
    assert.equal(confirmed.status,202,await confirmed.clone().text());
    const newJob=(await confirmed.json()).jobs[0];
    assert.equal(newJob.status,'uncertain','Provider rate-limit status is preserved without a hidden retry');
    assert.notEqual(newJob.id,oldId);
    assert.equal(paidCalls,1,'One explicit new paid request means exactly one provider call');
    assert.equal(balance(),876,'Only a separately confirmed image reserves new credits');
    assert.equal(db.prepare('SELECT state FROM jobs WHERE id=?').get(oldId).state,'uncertain','Original preserved');

    const batchUnconfirmed=await req(env,endpoint,{method:'POST',authToken,data:{...payload,settings:{...settings,processing:'batch'}}});
    assert.equal(batchUnconfirmed.status,409,'Batch mode must not silently bypass an unconfirmed previous transaction');
    assert.equal(paidCalls,1);
  }finally{globalThis.fetch=previous;}
});


test('Nano Banana Pro formats size and aspect ratio using official Gemini responseFormat enums',async()=>{
  const previous=globalThis.fetch,seen=[];
  const sizes={'1k':'IMAGE_SIZE_ONE_K','2k':'IMAGE_SIZE_TWO_K','4k':'IMAGE_SIZE_FOUR_K'};
  const ratios={
    '1:1':'ASPECT_RATIO_ONE_BY_ONE','2:3':'ASPECT_RATIO_TWO_BY_THREE',
    '3:2':'ASPECT_RATIO_THREE_BY_TWO','3:4':'ASPECT_RATIO_THREE_BY_FOUR',
    '4:3':'ASPECT_RATIO_FOUR_BY_THREE','4:5':'ASPECT_RATIO_FOUR_BY_FIVE',
    '5:4':'ASPECT_RATIO_FIVE_BY_FOUR','9:16':'ASPECT_RATIO_NINE_BY_SIXTEEN',
    '16:9':'ASPECT_RATIO_SIXTEEN_BY_NINE','21:9':'ASPECT_RATIO_TWENTY_ONE_BY_NINE'
  };
  globalThis.fetch=async(url,options)=>{
    if(new URL(url).hostname!=='generativelanguage.googleapis.com')return previous(url,options);
    const body=JSON.parse(options.body);
    const image=body.generationConfig.responseFormat.image;
    assert.deepEqual(body.generationConfig.responseModalities,['IMAGE']);
    assert.equal(body.contents[0].role,'user');
    assert.ok(Array.isArray(body.contents[0].parts));
    seen.push(image);
    // This is a confirmed rejection after inspecting outgoing JSON: no image was billed.
    return Response.json({error:{message:'Synthetic input test complete.'}},{status:400});
  };
  try{
    for(const [size,enumSize]of Object.entries(sizes))
    for(const ratio of [...Object.keys(ratios),'auto']){
      const{env}=fixture();env.GEMINI_API_KEY='synthetic-gemini-key';
      const resp=await req(env,'/api/gemini/jobs',{method:'POST',data:{
        count:1,settings:{...imageSettings,engine:'gemini',resolution:size,aspectRatio:ratio}
      }});
      assert.equal(resp.status,202,await resp.clone().text());
      const job=(await resp.json()).jobs[0];
      assert.equal(job.status,'failed','Provider explicitly rejected synthetic validation request');
      assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend').get().n,0,
        'Definite input rejection releases the daily budget');
      const sent=seen.at(-1);
      assert.equal(sent.imageSize,enumSize);
      if(ratio==='auto')assert.equal(Object.hasOwn(sent,'aspectRatio'),false);
      else assert.equal(sent.aspectRatio,ratios[ratio]);
    }
    assert.equal(seen.length,33);
  }finally{globalThis.fetch=previous;}
});

test('429 RESOURCE_EXHAUSTED is a failed paid request, refunds customer exactly once and never creates a permanent Nano block',async()=>{
  const {env,owner,authToken}=await archiveAccount(true);
  env.GEMINI_API_KEY='synthetic-gemini-key';
  const previous=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url,options)=>{
    if(new URL(url).hostname!=='generativelanguage.googleapis.com')return previous(url,options);
    calls++;
    return Response.json({error:{code:429,status:'RESOURCE_EXHAUSTED',message:'Quota exceeded. Try again later.'}},{status:429});
  };
  const sql=env.LAB_DB.db,credits=()=>sql.prepare('SELECT balance_credits AS n FROM lab_customers WHERE id=?').get(owner).n;
  const data={count:1,settings:{...imageSettings,engine:'gemini',processing:'normal'}};
  try{
    for(let i=0;i<2;i++){
      const r=await req(env,'/api/gemini/jobs',{method:'POST',authToken,data});
      assert.equal(r.status,202,await r.clone().text());
      const {jobs}=await r.json();assert.equal(jobs[0].status,'failed');
      assert.match(jobs[0].error,/Quota exceeded/);
      assert.equal(credits(),1000,'A confirmed Google rejection must return all reserved credits');
      assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM spend WHERE job_id=?').get(jobs[0].id).n,0);
      assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE customer_id=? AND kind='refund'").get(owner).n,i+1);
    }
    assert.equal(calls,2,'Two explicitly requested images result in two calls, not retries');
    assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE customer_id=? AND kind='generation'").get(owner).n,2);
    // Re-reading History cannot generate, duplicate refunds or change balances.
    await req(env,'/api/jobs',{authToken});
    await req(env,'/api/jobs',{authToken});
    assert.equal(credits(),1000);
    assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE customer_id=? AND kind='refund'").get(owner).n,2);
  }finally{globalThis.fetch=previous;}
});

test('Gemini 429 batch rejection returns every reserved credit and releases all estimated spend',async()=>{
  const {env,owner,authToken}=await archiveAccount(true);
  env.GEMINI_API_KEY='synthetic-gemini-key';
  const previous=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url,options)=>{
    if(new URL(url).hostname!=='generativelanguage.googleapis.com')return previous(url,options);
    calls++;
    return Response.json({error:{message:'RESOURCE_EXHAUSTED'}},{status:429});
  };
  try{
    const r=await req(env,'/api/gemini/jobs',{method:'POST',authToken,data:{
      count:2,settings:{...imageSettings,engine:'gemini',processing:'batch'}
    }});
    assert.equal(r.status,202,await r.clone().text());
    const {jobs}=await r.json();
    assert.equal(jobs.length,2);
    assert.ok(jobs.every(j=>j.status==='failed'));
    assert.equal(env.LAB_DB.db.prepare('SELECT balance_credits FROM lab_customers WHERE id=?').get(owner).balance_credits,1000);
    assert.equal(env.LAB_DB.db.prepare('SELECT COUNT(*) AS n FROM spend').get().n,0);
    assert.equal(env.LAB_DB.db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE customer_id=? AND kind='refund'").get(owner).n,2);
    assert.equal(calls,1,'A failed batch is not resubmitted');
  }finally{globalThis.fetch=previous;}
});

test('maintenance never interrupts a Gemini job before its 180-second provider timeout and grace period',async()=>{
  const {env}=fixture(),db=env.LAB_DB.db,t=Date.now();
  const make=(provider,age)=>{
    const id=crypto.randomUUID();
    db.prepare("INSERT INTO jobs(id,owner_id,params,state,created_at,updated_at) VALUES(?,?,?,'submitting',?,?)")
      .run(id,'owner-internal',JSON.stringify({type:'image',provider,engine:provider==='gemini'?'gemini':'seedream'}),t-age,t-age);
    return id;
  };
  const youngNano=make('gemini',181000),oldNano=make('gemini',241000),oldSeedream=make('spicy',121000);
  let task;
  await worker.scheduled({},env,{waitUntil(p){task=p;}});
  if(task)await task;
  assert.equal(db.prepare('SELECT state FROM jobs WHERE id=?').get(youngNano).state,'submitting');
  assert.equal(db.prepare('SELECT state FROM jobs WHERE id=?').get(oldNano).state,'uncertain');
  assert.equal(db.prepare('SELECT state FROM jobs WHERE id=?').get(oldSeedream).state,'uncertain');
});

test('Nano Banana 2.1 submits to direct Google Interactions and archives the output in private R2',async()=>{
  const {env,objects}=fixture();env.GEMINI_API_KEY='synthetic-gemini-key';const id=await setup(env);
  const origGet=env.LAB_MEDIA.get;
  env.LAB_MEDIA.get=async k=>{const obj=await origGet(k);return obj?{...obj,arrayBuffer:async()=>objects.get(k).slice().buffer}:null;};
  const old=globalThis.fetch;let sent,number=0;
  globalThis.fetch=async(url,options={})=>{
    if(new URL(url).hostname!=='generativelanguage.googleapis.com')return old(url,options);
    number++;assert.equal(new URL(url).pathname,'/v1beta/interactions');
    assert.equal(new Headers(options.headers).get('x-goog-api-key'),'synthetic-gemini-key');
    assert.equal(options.redirect,'manual');sent=JSON.parse(options.body);
    return Response.json({model:'gemini-nano-banana-2.1',status:'completed',
      steps:[{type:'model_output',content:[{type:'image',mime_type:'image/png',
        data:Buffer.from([137,80,78,71,13,10,26,10,0]).toString('base64')}]}]});
  };
  try{
    const settings={...imageSettings,engine:'gemini21',processing:'normal',resolution:'2k',prompt:'A fashion portrait',referenceRoles:[{role:'base'}]};
    const r=await req(env,'/api/gemini/jobs',{method:'POST',data:{count:1,referenceSourceIds:[id],settings}});
    assert.equal(r.status,202,await r.clone().text());const job=(await r.json()).jobs[0];
    assert.equal(job.status,'completed');assert.equal(job.settings.model,'gemini-nano-banana-2.1');
    assert.equal(job.creditCost,10);assert.equal(job.estimatedUsd,0.0504);
    assert.equal(sent.model,'gemini-nano-banana-2.1');
    assert.deepEqual(sent.response_format,{type:'image',image_size:'2K',aspect_ratio:'4:5'});
    assert.equal(sent.store,false);
    assert.equal(sent.input[0].type,'text');assert.equal(sent.input[1].type,'text');
    assert.equal(sent.input.at(-1).type,'image');
    const asset=env.LAB_DB.db.prepare('SELECT object_key FROM assets WHERE id=?').get(job.outputId);
    assert.deepEqual([...objects.get(asset.object_key)],[137,80,78,71,13,10,26,10,0]);
    assert.equal(number,1);
  }finally{globalThis.fetch=old;}
});

test('signed Mood completion callback is task-scoped, idempotent and never buys a second image',async()=>{
  const {env}=fixture();
  env.SPICY_WEBHOOK_SECRET='synthetic-unit-test-webhook-key-not-for-production';
  await setup(env);
  const photo=await seedreamTestReference(env,'base.png',9);
  const recipe=prepareMoodPrompt('Keep the same portrait.','night-flash',70,{engine:'seedream',referenceCount:1});
  assert.equal(recipe.error,'');
  const settings={...imageSettings,engine:'seedream',mode:'image',prompt:recipe.prompt,...recipe.metadata,referenceRoles:[{role:'base'}]};
  const quoted=await req(env,'/api/quotes',{method:'POST',data:{settings,referenceSourceIds:[photo]}});
  assert.equal(quoted.status,200,await quoted.clone().text());
  const quote=await quoted.json();
  assert.equal(quote.settings.resolution,'2k');
  assert.equal(quotedRequest.input.enable_thinking,true);
  assert.equal(quotedRequest.callBackUrl,BASE+'/api/webhooks/spicy');
  const sent=await req(env,'/api/jobs',{method:'POST',data:{quoteId:quote.id,confirm:true}});
  assert.equal(sent.status,202,await sent.clone().text());
  const job=(await sent.json()).job;
  assert.equal(job.status,'queued');
  const before=createCount,task='job_synthetic',body=JSON.stringify({
    code:200,msg:'success',request_id:'whd_test_1',
    data:{taskId:task,state:'failed',settled:true,cost:'0',errorCode:'test_failure',errorMessage:'Synthetic upstream failure'}
  });
  const stamp=String(Math.floor(Date.now()/1000)),bytes=new TextEncoder().encode(body);
  const sha=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SPICY_WEBHOOK_SECRET),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(task+'.'+stamp+'.'+sha))).toString('base64');
  const deliver=(signatureValue=signature)=>worker.fetch(new Request(BASE+'/api/webhooks/spicy',{
    method:'POST',headers:{'Content-Type':'application/json','X-Webhook-Timestamp':stamp,
      'X-Webhook-Payload-Version':'2','X-Webhook-Signature':signatureValue},body
  }),env,{waitUntil(){}});
  const forged=await deliver('BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
  assert.equal(forged.status,401);
  assert.equal((await req(env,'/api/jobs/'+job.id).then(r=>r.json())).job.status,'queued');
  const valid=await deliver();assert.equal(valid.status,204);
  const replay=await deliver();assert.equal(replay.status,204);
  const after=await req(env,'/api/jobs/'+job.id);
  assert.equal((await after.json()).job.status,'failed');
  assert.equal(createCount,before);
});

test('existing LAB_SECRET activates a private Mood callback without a new Spicy signing key',async()=>{
  const {env}=fixture();
  assert.equal(env.SPICY_WEBHOOK_SECRET,undefined);
  const originalProviderState=providerState;
  try{
    providerState='queued';
    await setup(env);
    const photo=await seedreamTestReference(env,'base.png',22);
    const recipe=prepareMoodPrompt('Keep the original person and change only the atmosphere.',
      'night-flash',75,{engine:'seedream',referenceCount:1});
    assert.equal(recipe.error,'');
    const settings={...imageSettings,engine:'seedream',mode:'image',prompt:recipe.prompt,
      ...recipe.metadata,referenceRoles:[{role:'base'}]};
    const quoteResp=await req(env,'/api/quotes',{method:'POST',data:{
      settings,referenceSourceIds:[photo]
    }});
    assert.equal(quoteResp.status,200,await quoteResp.clone().text());
    const quote=await quoteResp.json();
    assert.equal(quote.settings.resolution,'2k');
    assert.equal(new URL(quotedRequest.callBackUrl).pathname,
      '/api/webhooks/spicy/wakeup/'+quote.id);
    const earlier=createCount;
    const sent=await req(env,'/api/jobs',{method:'POST',data:{quoteId:quote.id,confirm:true}});
    assert.equal(sent.status,202,await sent.clone().text());
    const job=(await sent.json()).job;
    assert.equal(createCount,earlier+1);
    const createCall=calls.filter(c=>new URL(c.url).pathname.endsWith('/jobs/createTask')).at(-1);
    const createPayload=JSON.parse(createCall.options.body);
    const callback=createPayload.callBackUrl;
    assert.ok(callback,'One bound callback was included with the accepted paid task');
    const location=new URL(callback);
    assert.equal(location.pathname,'/api/webhooks/spicy/wakeup/'+quote.id);
    assert.match(location.searchParams.get('v')||'',/^[A-Za-z0-9_-]{43}$/);
    assert.equal(createPayload.input.enable_thinking,true);
    assert.deepEqual({model:createPayload.model,input:createPayload.input,
      callBackUrl:createPayload.callBackUrl},quotedRequest,
      'The quote and paid request must carry the exact same callback');
    const pending=[];
    const fakeBody=JSON.stringify({code:200,data:{taskId:'any',state:'succeeded',
      output:{assets:[{mime:'image/png',url:'https://attacker.invalid/payload.png'}]}}});
    const deliver=async (url=callback,method='POST')=>{
      const response=await worker.fetch(new Request(url,{
        method,...(method==='POST'?{headers:{'Content-Type':'application/json'},body:fakeBody}:{})
      }),env,{waitUntil(task){pending.push(task);}});
      for(let round=0;round<5;round++){
        const current=pending.splice(0);
        if(!current.length)break;
        await Promise.allSettled(current);
      }
      return response;
    };
    const bad=new URL(callback);bad.searchParams.set('v','A'.repeat(43));
    const beforeCheck=calls.filter(c=>new URL(c.url).pathname.endsWith('/jobs/recordInfo')).length;
    assert.equal((await deliver(bad.href)).status,401,'Forged URL cannot awaken a paid task');
    assert.equal((await deliver(callback,'GET')).status,405);
    assert.equal(calls.filter(c=>new URL(c.url).pathname.endsWith('/jobs/recordInfo')).length,
      beforeCheck,'Neither invalid request can contact the provider');

    assert.equal((await deliver()).status,204);
    assert.equal((await req(env,'/api/jobs/'+job.id).then(r=>r.json())).job.status,'queued',
      'A fake webhook body never completes the job without provider confirmation');

    // The real provider completes. A callback body claiming a different
    // outcome still cannot control the final state or output URL.
    providerState='succeeded';
    env.LAB_DB.db.prepare('UPDATE jobs SET last_poll=0 WHERE id=?').run(job.id);
    assert.equal((await deliver()).status,204);
    const done=(await req(env,'/api/jobs/'+job.id).then(r=>r.json())).job;
    assert.equal(done.status,'completed');
    assert.equal(done.outputId,job.id);
    assert.equal(createCount,earlier+1,'Callbacks never create additional billed tasks');
    assert.equal((await deliver()).status,204,'Repeated provider callbacks are harmless');
  }finally{providerState=originalProviderState;}
});

test('confirmed customer DELETE waits for Clerk deletion before immediate new-account onboarding and never reports a failed deletion as success',async()=>{
 const {env}=fixture(),db=env.LAB_DB.db,origin='https://pvlab.studio';
 env.LAB_STUDIO_AUTH_ENABLED='true';env.LAB_CUSTOMER_SIGNUPS_ENABLED='true';
 env.LAB_CLERK_V2_SECRET_KEY='sk_test_studio_delete_not_real';
 for(const name of ['0006-customers-billing','0011-customer-lifecycle','0015-lab-promotional-credits','0017-clerk-domain-links','0023-welcome-guard','0030-studio-account-identity-deletion','0035-studio-identity-cleanup-attempts'])
  db.exec(readFileSync(new URL('../lab-worker/migrations/'+name+'.sql',import.meta.url),'utf8'));
 const originalFetch=globalThis.fetch;let failDelete=false,deleted=0;
 globalThis.fetch=async(url,init)=>{
  if(String(url).startsWith('https://api.clerk.com/v1/users/')){
   assert.equal(init.method,'DELETE','No ban prerequisite on confirmed deletion');
   if(failDelete)return new Response('{}',{status:503});
   deleted++;return Response.json({id:String(url).split('/').at(-1),deleted:true});
  }
  return originalFetch(url,init);
 };
 try{
  let previousId;
  for(let cycle=0;cycle<2;cycle++){
   const authToken=await token('user_RecreateNow'+cycle,{iss:'https://clerk.pvlab.studio',azp:origin});
   const call=(path,options={})=>req(env,path,{authToken,headers:{Origin:origin},...options});
   assert.equal((await call('/api/migration/new',{method:'POST'})).status,201);
   const session=await(await call('/api/session')).json();
   assert.equal(session.accountClosed,null);assert.equal(session.balanceCredits,0);
   assert.notEqual(session.ownerId,previousId);
   if(cycle===1){
    failDelete=true;
    const failed=await call('/api/customer/account',{method:'DELETE',data:{confirmation:'DELETE MY PV LAB ACCOUNT'}});
    assert.equal(failed.status,503,'An accepted closure is not successful login deletion');
    assert.match((await failed.json()).error,/not finished/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lab_clerk_identity_links WHERE canonical_id=?').get(session.ownerId).n,1);
    failDelete=false;
   }
   const response=await call('/api/customer/account',{method:'DELETE',data:{confirmation:'DELETE MY PV LAB ACCOUNT'}});
   assert.equal(response.status,202);assert.deepEqual(await response.json(),{accepted:true,identityDeleted:true});
   assert.equal(deleted,cycle+1,'Clerk deletion completed before API confirmation');
   assert.equal(db.prepare('SELECT state FROM lab_account_closures WHERE customer_id=?').get(session.ownerId).state,'requested','Media cleanup did not require cron before the next signup');
   assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lab_clerk_identity_links WHERE canonical_id=?').get(session.ownerId).n,0);
   previousId=session.ownerId;
  }
 }finally{globalThis.fetch=originalFetch;}
});
