import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../lab-worker/worker.mjs';
const ORIGIN='https://parallelvisionlabel.com',BASE='https://parallel-vision-lab.parallelvision.workers.dev',KEY='sk-spicy-synthetic-test-only-not-a-real-key';
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
globalThis.fetch=async (url,options={})=>{const u=new URL(url);calls.push({url:String(url),options});if(u.pathname==='/.well-known/jwks.json')return Response.json({keys:[jwk]});
 if(u.hostname==='queue.fal.run'){
  assert.equal(new Headers(options.headers).get('authorization'),'Key fal-synthetic-test-key');
  const soulPro=u.pathname.includes('/ideogram/v4.5/edit')||u.pathname.includes('/flux-pro/kontext/max/multi');
  const h3maxVideo=u.pathname.includes('/minimax/h3-max/reference-to-video');
  if(h3maxVideo){
    if(options.method==='POST'){falSubmitCount++;const input=JSON.parse(options.body);assert.equal(input.enable_safety_checker,true);assert.ok(Array.isArray(input.reference_image_urls));return Response.json({request_id:'fal_h3max_video_1234567890'});}
    if(u.pathname.endsWith('/status'))return falVideoReject?Response.json({detail:'Provider rejected the request.'},{status:422}):Response.json({status:'IN_QUEUE'});
  }
  if(options.method==='POST'){
    falSubmitCount++;if(falSubmitMode==='timeout')throw new Error('Synthetic timeout');
    if(u.pathname.includes('flux-general'))return Response.json({request_id:'fal_repair_synthetic_1234567890'});
    if(soulPro){
      const input=JSON.parse(options.body);
      if(u.pathname.includes('/ideogram/v4.5/edit')){
        assert.equal(input.edit_precision,'high');assert.equal(input.quality,'high');assert.ok(input.image_url);assert.equal(input.reference_image_urls.length,1);assert.equal(input.num_images,1);
      }else{
        assert.equal(input.image_urls.length,2);assert.equal(input.guidance_scale,3.5);assert.equal(input.enhance_prompt,false);assert.equal(input.num_images,1);
      }
      assert.match(input.prompt,/primary source image is the structural truth/i);assert.match(input.prompt,/identity reference/i);
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
 assert.equal(u.hostname,'api.spicyapi.ai');assert.equal(options.headers.Authorization,'Bearer '+KEY);
 if(u.pathname.endsWith('/chat/credit'))return Response.json({code:200,data:{available:'10',held:'0',total:'10'}});
 if(u.pathname.endsWith('/common/upload-url')){const input=JSON.parse(options.body);return Response.json({code:200,data:{fileId:'fil_synthetic_reference',uploadUrl:'https://test.r2.cloudflarestorage.com/reference',method:'PUT',headers:{'Content-Type':input.contentType,'Content-Length':String(input.bytes)},maxBytes:10485760,expiresAt:new Date(Date.now()+1200000).toISOString()}});}
 if(u.pathname.endsWith('/files/fil_synthetic_reference/commit')){assert.equal(options.method,'POST');return Response.json({code:200,data:{fileId:'fil_synthetic_reference',status:'ready',bytes:uploadedReference.length,contentType:'image/png',sha256:Buffer.from(await crypto.subtle.digest('SHA-256',uploadedReference)).toString('hex'),uri:'spicy://f/fil_synthetic_reference',expiresAt:new Date(Date.now()+86400000).toISOString()}});}
 if(u.pathname.endsWith('/jobs/quote')){quotedRequest=JSON.parse(options.body);return Response.json({code:200,data:{quoteId:'synthetic-quote',estimatedCost:maxPrice,maxCharge:maxPrice,currency:'USD',expiresAt:new Date(Date.now()+300000).toISOString()}});}
 if(u.pathname.endsWith('/jobs/createTask')){createCount++;const payload=JSON.parse(options.body);assert.deepEqual({model:payload.model,input:payload.input},quotedRequest);assert.equal(payload.quoteId,'synthetic-quote');assert.equal(payload.expectedCost,maxPrice);assert.match(options.headers['Idempotency-Key'],/^[a-f0-9-]{36}$/);if(createMode==='timeout')throw new Error('simulated interrupted network');if(createMode==='pricechange')return Response.json({code:40901,msg:'quote changed',data:null},{status:409});return Response.json({code:200,data:{taskId:'job_synthetic',state:'queued'}},{status:202});}
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
test('Text-to-image quotes need no source; image outputs can be reused by video without losing the source',async()=>{
  createMode='ok';createCount=0;providerState='queued';const {env}=fixture();await setup(env);
  let r=await req(env,'/api/quotes',{method:'POST',data:{settings:imageSettings,referenceSourceIds:[]}});assert.equal(r.status,200);const q=await r.json();assert.equal(quotedRequest.model,'bytedance/seedream-5.0-pro/text-to-image');assert.equal(quotedRequest.input.aspect_ratio,'4:5');assert.equal(quotedRequest.input.resolution,'2k');assert.ok(!('image_urls' in quotedRequest.input));assert.equal(createCount,0);
  const j=(await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json()).job;providerState='succeeded';const done=(await(await req(env,'/api/jobs/'+j.id)).json()).job;assert.equal(done.status,'completed');assert.equal(done.sourceId,null);assert.ok(done.outputId);assert.equal((await req(env,'/api/assets/'+done.outputId)).headers.get('content-type'),'image/png');
  const draft=await req(env,'/api/drafts',{method:'POST',data:{sourceId:done.outputId,settings:p}});assert.equal(draft.status,201);assert.equal((await req(env,'/api/jobs/'+done.id,{method:'DELETE'})).status,200);assert.equal((await req(env,'/api/assets/'+done.outputId)).status,200);assert.equal(createCount,1);
});
test('Reference editing preserves source order, roles, notes and original prompt; packs pin private media',async()=>{
  const{env}=fixture();const id=await setup(env);const labels=[{name:'reference.png',role:'room',note:'Use the architecture only.'}];
  const packResponse=await req(env,'/api/packs',{method:'POST',data:{name:'Architecture / Set',referenceSourceIds:[id],referenceRoles:labels}});assert.equal(packResponse.status,201);const pack=await packResponse.json();
  const settings={...imageSettings,referenceRoles:labels};const q=await(await req(env,'/api/quotes',{method:'POST',data:{settings,referenceSourceIds:[id]}})).json();assert.equal(quotedRequest.model,'bytedance/seedream-5.0-pro/edit');assert.equal(quotedRequest.input.image_urls.length,1);assert.match(quotedRequest.input.prompt,/Reference 1.*room.*Use the architecture only/);assert.equal(q.settings.prompt,imageSettings.prompt);
  const draft=(await(await req(env,'/api/drafts',{method:'POST',data:{settings,referenceSourceIds:[id]}})).json()).job;assert.equal(draft.settings.referenceRoles[0].note,labels[0].note);assert.equal((await req(env,'/api/jobs/'+draft.id,{method:'DELETE'})).status,200);assert.equal((await req(env,'/api/assets/'+id)).status,200);assert.equal((await req(env,'/api/packs',{authToken:guest})).status,403);assert.equal((await req(env,'/api/packs/'+pack.id,{method:'DELETE'})).status,200);
  const oversized={...imageSettings,prompt:'x'.repeat(5000),referenceRoles:labels};assert.equal((await req(env,'/api/quotes',{method:'POST',data:{settings:oversized,referenceSourceIds:[id]}})).status,400);
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
  const refUpload=await req(env,'/api/uploads',{method:'POST',raw:new Uint8Array([137,80,78,71,13,10,26,10,1]),headers:{'Content-Type':'image/png','X-Filename':'identity.png'}});assert.equal(refUpload.status,201);const refId=(await refUpload.json()).id;
  let identity=await req(env,'/api/soul-pro/identity',{method:'POST',data:{referenceSourceIds:[refId]}});assert.equal(identity.status,201,await identity.clone().text());assert.equal((await identity.json()).count,1);
  const saved=await(await req(env,'/api/soul-pro/identity')).json();assert.equal(saved.configured,true);assert.equal(saved.count,1);
  const packs=await(await req(env,'/api/packs')).json();assert.equal(packs.packs.length,0,'reserved Nina identity must stay out of normal packs');
  const settings={type:'image',engine:'soulpro',mode:'identity-edit',soulProModel:'ideogram45',prompt:'',sourceWidth:512,sourceHeight:768,seed:42,referenceRoles:[]};
  const response=await req(env,'/api/fal/soul-pro',{method:'POST',data:{sourceId:id,referenceSourceIds:[],settings}});
  assert.equal(response.status,202,await response.clone().text());const job=(await response.json()).job;
  assert.equal(job.settings.engine,'soulpro');assert.equal(job.settings.soulProModel,'ideogram45');assert.deepEqual(job.settings.referenceSourceIds,[refId]);assert.equal(job.estimatedUsd,.22);assert.equal(falSubmitCount,1);
  const submit=calls.findLast(c=>c.options.method==='POST'&&c.url.includes('/ideogram/v4.5/edit'));assert.ok(submit);
  const input=JSON.parse(submit.options.body);assert.ok(input.image_url);assert.equal(input.reference_image_urls.length,1);assert.notEqual(input.image_url,input.reference_image_urls[0]);
  assert.match(input.prompt,/keep the source crop/i);assert.match(input.prompt,/do not import pose, body shape, wardrobe, room, camera angle or lighting/i);
  falState='COMPLETED';const done=(await(await req(env,'/api/jobs/'+job.id)).json()).job;assert.equal(done.status,'completed');assert.ok(done.outputId);assert.equal((await req(env,'/api/assets/'+done.outputId)).headers.get('content-type'),'image/png');
});

test('PV Soul Pro offers Kontext Max as a separate cheaper identity-edit engine without LoRA controls',async()=>{
  calls=[];falSubmitCount=0;falState='IN_QUEUE';const {env}=fixture(),id=await setup(env);
  const refUpload=await req(env,'/api/uploads',{method:'POST',raw:new Uint8Array([137,80,78,71,13,10,26,10,2]),headers:{'Content-Type':'image/png','X-Filename':'identity.png'}});assert.equal(refUpload.status,201);const refId=(await refUpload.json()).id;
  const settings={type:'image',engine:'soulpro',mode:'identity-edit',soulProModel:'kontextmax',prompt:'keep the original room',sourceWidth:768,sourceHeight:512,seed:'',referenceRoles:[{name:'identity.png',role:'identity',note:''}]};
  const response=await req(env,'/api/fal/soul-pro',{method:'POST',data:{sourceId:id,referenceSourceIds:[refId],settings}});
  assert.equal(response.status,202,await response.clone().text());const job=(await response.json()).job;
  assert.equal(job.estimatedUsd,.08);assert.equal(job.settings.soulProModel,'kontextmax');
  const submit=calls.findLast(c=>c.options.method==='POST'&&c.url.includes('/flux-pro/kontext/max/multi'));assert.ok(submit);
  const input=JSON.parse(submit.options.body);assert.equal(input.image_urls.length,2);assert.equal(input.enhance_prompt,false);assert.match(input.prompt,/User-requested change: keep the original room/);
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

const upscaleSettings={type:'image',mode:'upscale',resolution:'4k',outputFormat:'png'};
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
 const{env}=fixture(),copyId=await setup(env);createCount=0;createMode='ok';providerState='queued';
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
