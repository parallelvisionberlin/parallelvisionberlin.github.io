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
function fixture(){const db=new DB(readFileSync(new URL('../lab-worker/schema.sql',import.meta.url),'utf8')),owner=new DB("CREATE TABLE users(id TEXT,auth_provider TEXT,auth_subject TEXT,role TEXT); INSERT INTO users VALUES('owner-internal','clerk','user_Owner','owner'),('guest','clerk','user_Guest','user');");const objects=new Map();const env={LAB_DB:db,OWNER_DB:owner,LAB_SECRET:'synthetic-test-secret-do-not-use-in-production-01234567890',LAB_MEDIA:{async put(k,value){objects.set(k,new Uint8Array(await new Response(value).arrayBuffer()));},async get(k){if(!objects.has(k))return null;const v=objects.get(k);return{body:new Response(v).body,size:v.length};},async delete(k){objects.delete(k);}}};return{env,objects};}
let calls=[],quotedRequest=null,createCount=0,providerState='queued',createMode='ok',maxPrice='2.700000';
let uploadedReference=null;
globalThis.fetch=async (url,options={})=>{const u=new URL(url);calls.push({url:String(url),options});if(u.pathname==='/.well-known/jwks.json')return Response.json({keys:[jwk]});if(u.hostname==='cdn.spicyapi.ai'){assert.ok(!options.headers?.Authorization);if(u.pathname.endsWith('.png'))return new Response(new Uint8Array([137,80,78,71,13,10,26,10,0]),{headers:{'content-type':'image/png'}});return new Response(new Uint8Array([0,0,0,24,102,116,121,112,109,112,52,50]),{headers:{'content-type':'video/mp4'}});}
 if(u.hostname==='test.r2.cloudflarestorage.com'){assert.equal(options.method,'PUT');assert.equal(new Headers(options.headers).get('authorization'),null);uploadedReference=new Uint8Array(options.body);return new Response(null,{status:200});}
 assert.equal(u.hostname,'api.spicyapi.ai');assert.equal(options.headers.Authorization,'Bearer '+KEY);
 if(u.pathname.endsWith('/chat/credit'))return Response.json({code:200,data:{available:'10',held:'0',total:'10'}});
 if(u.pathname.endsWith('/common/upload-url')){const input=JSON.parse(options.body);return Response.json({code:200,data:{fileId:'fil_synthetic_reference',uploadUrl:'https://test.r2.cloudflarestorage.com/reference',method:'PUT',headers:{'Content-Type':input.contentType,'Content-Length':String(input.bytes)},maxBytes:10485760,expiresAt:new Date(Date.now()+1200000).toISOString()}});}
 if(u.pathname.endsWith('/files/fil_synthetic_reference/commit')){assert.equal(options.method,'POST');return Response.json({code:200,data:{fileId:'fil_synthetic_reference',status:'ready',bytes:uploadedReference.length,contentType:'image/png',sha256:Buffer.from(await crypto.subtle.digest('SHA-256',uploadedReference)).toString('hex'),uri:'spicy://f/fil_synthetic_reference',expiresAt:new Date(Date.now()+86400000).toISOString()}});}
 if(u.pathname.endsWith('/jobs/quote')){quotedRequest=JSON.parse(options.body);return Response.json({code:200,data:{quoteId:'synthetic-quote',estimatedCost:maxPrice,maxCharge:maxPrice,currency:'USD',expiresAt:new Date(Date.now()+300000).toISOString()}});}
 if(u.pathname.endsWith('/jobs/createTask')){createCount++;const payload=JSON.parse(options.body);assert.deepEqual({model:payload.model,input:payload.input},quotedRequest);assert.equal(payload.quoteId,'synthetic-quote');assert.equal(payload.expectedCost,maxPrice);assert.match(options.headers['Idempotency-Key'],/^[a-f0-9-]{36}$/);if(createMode==='timeout')throw new Error('simulated interrupted network');if(createMode==='pricechange')return Response.json({code:40901,msg:'quote changed',data:null},{status:409});return Response.json({code:200,data:{taskId:'job_synthetic',state:'queued'}},{status:202});}
 if(u.pathname.endsWith('/jobs/recordInfo'))return Response.json({code:200,data:{taskId:'job_synthetic',state:providerState,settled:providerState==='succeeded',cost:'2.7',output:{assets:[(quotedRequest?.model?.includes('seedream')||quotedRequest?.model?.includes('image-upscaler'))?{mime:'image/png',url:'https://cdn.spicyapi.ai/test.png'}:{mime:'video/mp4',url:'https://cdn.spicyapi.ai/test.mp4'}]}}});
 throw new Error('Unmocked network request: '+url);
};
const auth=await token(),guest=await token('user_Guest');
async function req(env,path,{method='GET',data,raw,authToken=auth,headers={}}={}) {const h={Origin:ORIGIN,...(authToken?{Authorization:'Bearer '+authToken}:{}),...headers};if(data!==undefined)h['Content-Type']='application/json';return worker.fetch(new Request(BASE+path,{method,headers:h,body:data!==undefined?JSON.stringify(data):raw}),env,{waitUntil(){}});}
const p={prompt:'A sculpture rotating slowly in a studio',duration:15,resolution:'1080p',aspectRatio:'auto',seed:42,audio:true};
async function setup(env){const r=await req(env,'/api/settings',{method:'POST',data:{apiKey:KEY,enabled:true,termsConfirmed:true,dailyLimitUsd:10}});assert.equal(r.status,200);const x=await req(env,'/api/uploads',{method:'POST',raw:new Uint8Array([137,80,78,71,13,10,26,10,0]),headers:{'Content-Type':'image/png','X-Filename':'source.png'}});assert.equal(x.status,201);return(await x.json()).id;}
async function quote(env,id){const r=await req(env,'/api/quotes',{method:'POST',data:{sourceId:id,settings:p}});assert.equal(r.status,200);return r.json();}

const sd=(mode='start')=>({...p,type:'video',engine:'seedance',mode,duration:5,resolution:'720p',referenceVideos:[],referenceAudio:[]});
const mp4=new Uint8Array([0,0,0,20,102,116,121,112,105,115,111,109,0,0,0,0]);
const wav=new Uint8Array([82,73,70,70,0,0,0,0,87,65,86,69,0,0,0,0]);
async function reference(env,kind='video',authToken=auth){const response=await req(env,'/api/reference-uploads',{method:'POST',authToken,raw:kind==='video'?mp4:wav,headers:{'Content-Type':kind==='video'?'video/mp4':'audio/wav','X-Filename':kind==='video'?'camera.mp4':'music.wav'}});assert.equal(response.status,201);return(await response.json()).id;}
test('Standard Seedance routes each mode explicitly and omits unsupported fields',async()=>{
 const{env}=fixture(),id=await setup(env);createCount=0;
 for(const mode of ['start','text','reference']){
  const settings=sd(mode),data={settings,sourceId:mode==='start'?id:null,referenceSourceIds:mode==='reference'?[id]:[]};
  const response=await req(env,'/api/quotes',{method:'POST',data});assert.equal(response.status,200,await response.clone().text());
  const q=await response.json();assert.equal(q.settings.engine,'seedance');assert.equal(q.settings.mode,mode);
  assert.equal(quotedRequest.model,'bytedance/seedance-2.5/'+({start:'image-to-video',text:'text-to-video',reference:'reference-to-video'})[mode]);
  assert.equal(quotedRequest.input.aspect_ratio,'adaptive');assert.equal(quotedRequest.input.duration_seconds,5);assert.equal(quotedRequest.input.enable_prompt_expansion,undefined);assert.equal(quotedRequest.input.enable_safety_checker,undefined);
  if(mode==='text'){assert.equal(q.settings.lastSourceId,null);assert.equal(quotedRequest.input.image_url,undefined);assert.equal(quotedRequest.input.reference_image_urls,undefined);}
 }
 assert.equal(createCount,0);
});
test('Start and end frames remain signed private URLs and exact quotes submit once',async()=>{
 const{env}=fixture(),id=await setup(env);createCount=0;createMode='ok';providerState='queued';
 const response=await req(env,'/api/quotes',{method:'POST',data:{sourceId:id,lastSourceId:id,settings:sd()}}),q=await response.json();
 for(const key of ['image_url','last_image_url']){const u=new URL(quotedRequest.input[key]);assert.equal((await req(env,u.pathname+u.search,{authToken:null,headers:{Origin:''}})).status,200);}
 const results=await Promise.all([req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}}),req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})]);
 assert.equal(createCount,1);assert.equal((await results[0].json()).job.settings.engine,'seedance');
});
test('Thirty image references supported without widening Wan or Image limits',async()=>{
 const{env}=fixture(),first=await setup(env),ids=[first];
 for(let i=1;i<31;i++){const r=await req(env,'/api/uploads',{method:'POST',raw:new Uint8Array([137,80,78,71,13,10,26,10,0]),headers:{'Content-Type':'image/png'}});ids.push((await r.json()).id);}
 createCount=0;
 const r=await req(env,'/api/quotes',{method:'POST',data:{settings:sd('reference'),referenceSourceIds:ids.slice(0,30)}});assert.equal(r.status,200,await r.clone().text());assert.equal(quotedRequest.input.reference_image_urls.length,30);
 for(const settings of [sd('reference'),{...p,mode:'reference'}]){const n=settings.engine==='seedance'?31:11;assert.equal((await req(env,'/api/quotes',{method:'POST',data:{settings,referenceSourceIds:ids.slice(0,n)}})).status,400);}
 assert.equal(createCount,0);
});
test('Audio and video references retain metadata and private signed URLs through History',async()=>{
 const{env}=fixture(),id=await setup(env),v=await reference(env),a=await reference(env,'audio');createCount=0;
 const settings={...sd('reference'),referenceRoles:[{name:'sculpture.png',role:'object',note:'Use the silhouette.'}],referenceVideos:[{name:'camera.mp4',seconds:4,note:'Camera movement.'}],referenceAudio:[{name:'music.wav',seconds:3,note:'Rhythm only.'}]};
 const data={sourceId:id,referenceSourceIds:[id],referenceVideoIds:[v],referenceAudioIds:[a],settings};
 const draft=await req(env,'/api/drafts',{method:'POST',data});assert.equal(draft.status,201);const j=(await draft.json()).job;
 assert.deepEqual(j.settings.referenceVideoIds,[v]);assert.deepEqual(j.settings.referenceAudioIds,[a]);
 const q=await req(env,'/api/quotes',{method:'POST',data});assert.equal(q.status,200,await q.clone().text());
 assert.match(quotedRequest.input.prompt,/@Image1/);assert.match(quotedRequest.input.prompt,/@Video1/);assert.match(quotedRequest.input.prompt,/@Audio1/);
 for(const key of ['reference_video_urls','reference_audio_urls']){const u=new URL(quotedRequest.input[key][0]);assert.equal((await req(env,u.pathname+u.search,{authToken:null,headers:{Origin:''}})).status,200);assert.equal((await req(env,u.pathname,{authToken:null})).status,403);}
 assert.equal(createCount,0);assert.equal((await req(env,'/api/assets/'+v,{authToken:guest})).status,403);
 const onlyAudio={sourceId:null,referenceSourceIds:[],referenceAudioIds:[a],settings:{...sd('reference'),referenceAudio:settings.referenceAudio}};
 const ar=await req(env,'/api/quotes',{method:'POST',data:onlyAudio});assert.equal(ar.status,200);assert.equal((await ar.json()).settings.referenceSourceIds.length,0);
});
test('Invalid media, mixed modes, wrong model, unknown engine and duration fail before pricing',async()=>{
 const{env}=fixture(),id=await setup(env),v=await reference(env);createCount=0;calls=[];
 const invalid=[{sourceId:id,settings:{...sd(),duration:3}},{sourceId:id,settings:{...sd(),aspectRatio:'16:9'}},{sourceId:id,settings:{...sd(),model:'unapproved/model'}},{sourceId:id,settings:{...p,engine:'unknown'}},{sourceId:id,settings:sd('text')},{sourceId:id,referenceSourceIds:[id],settings:sd()},{referenceSourceIds:[v],settings:sd('reference')},{referenceVideoIds:[v],settings:{...sd('reference'),referenceVideos:[{seconds:31}]}},{referenceVideoIds:[v],settings:sd('reference')}];
 for(const data of invalid)assert.equal((await req(env,'/api/quotes',{method:'POST',data})).status,400);
 assert.equal(calls.filter(c=>c.url.endsWith('/jobs/quote')).length,0);assert.equal(createCount,0);
 assert.equal((await req(env,'/api/reference-uploads',{method:'POST',raw:mp4,headers:{'Content-Type':'audio/wav'}})).status,400);
 assert.equal((await req(env,'/api/reference-uploads',{method:'POST',authToken:null,raw:mp4,headers:{'Content-Type':'video/mp4'}})).status,401);
});
test('Standard Seedance respects daily limits, expiry and uncertain-submission locks',async()=>{
 const{env}=fixture(),id=await setup(env);createCount=0;
 const response=await req(env,'/api/quotes',{method:'POST',data:{sourceId:id,settings:sd()}}),q=await response.json();
 env.LAB_DB.db.prepare('UPDATE settings SET daily_limit_microusd=1000000').run();assert.equal((await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).status,409);assert.equal(createCount,0);
 env.LAB_DB.db.prepare('UPDATE settings SET daily_limit_microusd=10000000').run();createMode='timeout';
 const failed=await(await req(env,'/api/jobs',{method:'POST',data:{quoteId:q.id,confirm:true}})).json();assert.equal(failed.job.status,'uncertain');assert.equal(createCount,1);
 const q2=await(await req(env,'/api/quotes',{method:'POST',data:{sourceId:id,settings:sd()}})).json();assert.equal((await req(env,'/api/jobs',{method:'POST',data:{quoteId:q2.id,confirm:true}})).status,409);assert.equal(createCount,1);createMode='ok';
});
test('Reference media survive shared drafts and are removed only when unreferenced',async()=>{
 const{env}=fixture(),id=await setup(env),a=await reference(env,'audio');
 const data={referenceAudioIds:[a],settings:{...sd('reference'),referenceAudio:[{seconds:3,name:'music.wav'}]}};
 const j1=(await(await req(env,'/api/drafts',{method:'POST',data})).json()).job,j2=(await(await req(env,'/api/drafts',{method:'POST',data})).json()).job;
 assert.equal((await req(env,'/api/jobs/'+j1.id,{method:'DELETE'})).status,200);assert.equal((await req(env,'/api/assets/'+a)).status,200);
 assert.equal((await req(env,'/api/jobs/'+j2.id,{method:'DELETE'})).status,200);assert.equal((await req(env,'/api/assets/'+a)).status,404);
});
