import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {creditsForJobUsd,creditsPerUsdForJob} from '../lab-worker/job-pricing.mjs';
import {seedanceVariantParameters,prepareSeedanceVariant,SEEDANCE15,SEEDANCE_4K} from '../lab-worker/seedance-variants.mjs';
import {seedreamLiteParameters,seedreamLiteInput,SEEDREAM_LITE_TEXT,SEEDREAM_LITE_EDIT,LITE_SIZES} from '../lab-worker/seedream-lite.mjs';

const fail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};
function video(engine,changes={}){
  return seedanceVariantParameters({engine,mode:'start',resolution:engine==='seedance4k'?'4k':'720p',
    duration:10,aspectRatio:engine==='seedance4k'?'auto':'16:9',prompt:'A fashion subject turns slowly',audio:engine!=='seedance15',...changes},{fail});
}
function still(changes={},references=[]){
  return seedreamLiteParameters({type:'image',mode:'image',engine:'seedreamlite',
    prompt:'A fashion editorial portrait in a studio',aspectRatio:'16:9',
    resolution:'2k',outputFormat:'png',...changes},{fail,referenceRoles:references});
}
test('tiered customer pricing checks engine AND model and preserves generic charges',()=>{
 const base=video('seedance15'),normal={type:'video',engine:'seedance',model:'bytedance/seedance-2.5/image-to-video'},
       fourk=video('seedance4k');
 assert.equal(creditsPerUsdForJob(base),320);
 assert.equal(creditsPerUsdForJob(normal),160);
 assert.equal(creditsPerUsdForJob(fourk),190);
 assert.equal(creditsPerUsdForJob({...base,model:'made-up'}),460);
 assert.equal(creditsPerUsdForJob({...fourk,provider:'higgsfield'}),460);
 assert.equal(creditsPerUsdForJob({...fourk,type:'image'}),460);
 assert.equal(creditsForJobUsd(.23,base),74);
 assert.equal(creditsForJobUsd(2.31,normal),370);
 assert.equal(creditsForJobUsd(21.6,fourk),4104);
 assert.equal(creditsForJobUsd(.035,still()),17);
 assert.equal(creditsForJobUsd(.018,still()),9);
 assert.throws(()=>creditsForJobUsd(-1,base),/Invalid/);
});
test('Seedance Motion and 4K models respect provider capabilities',()=>{
 assert.equal(video('seedance15').model,SEEDANCE15.start);
 assert.equal(video('seedance15',{mode:'text'}).model,SEEDANCE15.text);
 assert.equal(video('seedance4k').model,SEEDANCE_4K);
 assert.throws(()=>video('seedance15',{duration:13}),/duration/);
 assert.throws(()=>video('seedance15',{resolution:'1080p',seed:17}),/seed/);
 assert.throws(()=>video('seedance15',{mode:'reference'}),/Start frame or Text/);
 assert.throws(()=>video('seedance4k',{mode:'text'}),/start frame/);
 assert.throws(()=>video('seedance4k',{resolution:'1080p'}),/upscaled 4K/);
 assert.throws(()=>video('seedance4k',{aspectRatio:'16:9'}),/aspect ratio/);
});
test('Seedance Motion input exposes camera lock without leaking settings to 4K route',async()=>{
 const ref={id:'start-id',mime:'image/png'},last={id:'last-id',mime:'image/png'};
 const map=new Map([[ref.id,ref],[last.id,last]]);
 const d={fail,source:async(_e,_o,id)=>map.get(id)||fail(404,'Missing image'),
   sources:async(_e,_o,ids)=>ids.map(id=>map.get(id)),
   signedInput:async(_e,_u,id)=>'https://example.org/private/'+id};
 const p=video('seedance15',{cameraFixed:true,audio:false});
 const a=await prepareSeedanceVariant({},'user', {sourceId:ref.id,lastSourceId:last.id},p,'https://example.org/api/quotes',d);
 assert.equal(a.input.camera_fixed,true);
 assert.equal(a.input.generate_audio,false);
 assert.match(a.input.image_url,/start-id$/);
 assert.match(a.input.last_image_url,/last-id$/);
 await assert.rejects(()=>prepareSeedanceVariant({},'user',{sourceId:ref.id,lastSourceId:last.id},video('seedance15',{resolution:'1080p'}),'https://example.org',d),/ending frame/);
 const k=await prepareSeedanceVariant({},'user',{sourceId:ref.id},video('seedance4k'),'https://example.org',d);
 assert.equal(k.input.resolution,'4k');
 assert.equal(k.input.camera_fixed,undefined);
 assert.equal(k.input.aspect_ratio,undefined);
 assert.equal(k.input.image_url,'https://example.org/private/start-id');
 await assert.rejects(()=>prepareSeedanceVariant({},'user',{sourceId:ref.id,referenceSourceIds:['other']},video('seedance4k'),'https://example.org',d),/multi-reference/);
});
test('Seedream Lite uses exact named 2K size and image edit routes',()=>{
 const p=still(),input=seedreamLiteInput(p);
 assert.equal(p.model,SEEDREAM_LITE_TEXT);
 assert.deepEqual(input,{size:'2848*1600',output_format:'png',prompt:p.prompt});
 assert.equal(SEEDREAM_LITE_EDIT,'bytedance/seedream-5.0-lite/edit');
 assert.equal(Object.keys(LITE_SIZES).length,8);
 assert.equal(seedreamLiteInput(still({aspectRatio:'9:16'})).size,'1600*2848');
 const edited=still({prompt:''},[{role:'base'}]);
 assert.equal(edited.prompt,'');
 assert.match(seedreamLiteInput(edited,{prompt:'Edit the face, preserve original framing.',referenceUrls:['spicy://f/safe-reference']}).image_urls[0],/^spicy:\/\/f\//);
 assert.throws(()=>still({resolution:'4k'}),/one 2K/);
 assert.throws(()=>still({prompt:'X'.repeat(3001)}),/3,000/);
 assert.throws(()=>still({},Array.from({length:11},()=>({role:'none'}))),/ten reference/);
});
test('future customer jobs use new SQLite pricing trigger; failures refund and owner remains free',t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 for(const file of ['../lab-worker/schema.sql','../lab-worker/migrations/0006-customers-billing.sql',
  '../lab-worker/migrations/0008-soul-id-launch-credits.sql','../lab-worker/migrations/0012-video-tiered-pricing.sql']){
   const sql=readFileSync(new URL(file,import.meta.url),'utf8');db.exec(sql);
 }
 db.exec(readFileSync(new URL('../lab-worker/migrations/0012-video-tiered-pricing.sql',import.meta.url),'utf8'));
 const now=Date.now(),user='user_NewTierBuyer';
 db.prepare('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)').run(user,user,now,now);
 db.prepare("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('paid',?,10000,'purchase','checkout:old',?)").run(user,now);
 const put=(id,owner,p,micro)=>db.prepare("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'queued',?,?,?)").run(id,owner,JSON.stringify(p),micro,now,now);
 const debit=id=>db.prepare("SELECT delta_credits AS n FROM lab_credit_entries WHERE reference='job:'||?").get(id)?.n;
 const motion=video('seedance15'),standard={type:'video',engine:'seedance',model:'bytedance/seedance-2.5/image-to-video'};
 const k=video('seedance4k');
 put('motion',user,motion,230000);put('normal',user,standard,2310000);
 put('fourk',user,k,21600000);put('still',user,still(),35000);
 assert.equal(debit('motion'),-74);assert.equal(debit('normal'),-532);
 assert.equal(debit('fourk'),-4104);assert.equal(debit('still'),-17);
 put('owner', 'private-owner', k,21600000);assert.equal(debit('owner'),undefined);
 assert.equal(db.prepare("SELECT balance_credits AS n FROM lab_customers WHERE id=?").get(user).n,5273);
 db.prepare("UPDATE jobs SET state='failed' WHERE id='normal'").run();
 assert.equal(db.prepare("SELECT balance_credits AS n FROM lab_customers WHERE id=?").get(user).n,5805);
 db.prepare("UPDATE jobs SET state='failed' WHERE id='normal'").run();
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference='refund:job:normal'").get().n,1);
});

test('current D1 migration cuts only future standard Seedance 2.5 jobs to 160 credits per USD',t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 for(const file of ['../lab-worker/schema.sql','../lab-worker/migrations/0006-customers-billing.sql',
  '../lab-worker/migrations/0008-soul-id-launch-credits.sql','../lab-worker/migrations/0012-video-tiered-pricing.sql',
  '../lab-worker/migrations/0013-nano-banana-21-pricing.sql','../lab-worker/migrations/0014-premium-upscale-credits.sql',
  '../lab-worker/migrations/0019-video-value-pricing.sql']) {
  db.exec(readFileSync(new URL(file,import.meta.url),'utf8'));
 }
 const now=Date.now(),user='user_SeedanceValueTest';
 db.prepare('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)').run(user,user,now,now);
 db.prepare("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('funded',?,10000,'purchase','checkout:funded',?)").run(user,now);
 const put=(id,owner,p,micro)=>db.prepare("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'queued',?,?,?)").run(id,owner,JSON.stringify(p),micro,now,now);
 const debit=id=>db.prepare("SELECT delta_credits AS n FROM lab_credit_entries WHERE reference='job:'||?").get(id)?.n;
 const normal={type:'video',engine:'seedance',provider:'spicy',model:'bytedance/seedance-2.5/image-to-video'};
 const motion=video('seedance15'),fourk=video('seedance4k');
 put('discount',user,normal,2310000);
 put('motion',user,motion,230000);
 put('fourk',user,fourk,21600000);
 put('still',user,still(),35000);
 assert.equal(debit('discount'),-370);
 assert.equal(debit('motion'),-74);
 assert.equal(debit('fourk'),-4104);
 assert.equal(debit('still'),-17);
 put('owner','private-owner',normal,2310000);
 assert.equal(debit('owner'),undefined);
 assert.equal(db.prepare('SELECT balance_credits AS n FROM lab_customers WHERE id=?').get(user).n,5435);
 db.prepare("UPDATE jobs SET state='failed' WHERE id='discount'").run();
 assert.equal(db.prepare('SELECT balance_credits AS n FROM lab_customers WHERE id=?').get(user).n,5805);
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference='refund:job:discount'").get().n,1);
});

test('Premium Upscale charges 10 or 18 credits with exact route validation and refunds',t=>{
 const p={type:'image',mode:'upscale',provider:'fal',engine:'upscale',upscaleEngine:'seedvr2',model:'fal-ai/seedvr/upscale/image',scale:2};
 assert.equal(creditsForJobUsd(.004,p),10);assert.equal(creditsForJobUsd(.013,{...p,scale:4}),18);
 assert.equal(creditsForJobUsd(.013,{...p,scale:8}),7);
 assert.equal(creditsForJobUsd(.013,{...p,provider:'spicy'}),7);
 assert.equal(creditsForJobUsd(.013,{...p,model:'topaz/upscale/image/precision'}),7);
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 for(const file of ['../lab-worker/schema.sql','../lab-worker/migrations/0006-customers-billing.sql',
 '../lab-worker/migrations/0008-soul-id-launch-credits.sql',
 '../lab-worker/migrations/0012-video-tiered-pricing.sql',
 '../lab-worker/migrations/0013-nano-banana-21-pricing.sql',
 '../lab-worker/migrations/0014-premium-upscale-credits.sql'])db.exec(readFileSync(new URL(file,import.meta.url),'utf8'));
 const now=Date.now(),customer='user_Premium';
 db.prepare('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)').run(customer,customer,now,now);
 db.prepare("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('premium-wallet',?,1000,'purchase','topup',?)").run(customer,now);
 const put=(id,owner,settings,cost)=>db.prepare("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'queued',?,?,?)").run(id,owner,JSON.stringify(settings),cost,now,now);
 const debit=id=>db.prepare('SELECT delta_credits AS n FROM lab_credit_entries WHERE reference=?').get('job:'+id)?.n;
 put('seed2',customer,p,4000);put('seed4',customer,{...p,scale:4},13000);
 put('topaz',customer,{...p,upscaleEngine:'topaz-precision',model:'topaz/upscale/image/precision'},80000);
 put('owner','owner-private',p,4000);
 assert.equal(debit('seed2'),-10);assert.equal(debit('seed4'),-18);
 assert.equal(debit('topaz'),-37);assert.equal(debit('owner'),undefined);
 assert.equal(db.prepare('SELECT balance_credits AS n FROM lab_customers WHERE id=?').get(customer).n,935);
 db.prepare("UPDATE jobs SET state='failed' WHERE id='seed4'").run();
 assert.equal(db.prepare('SELECT balance_credits AS n FROM lab_customers WHERE id=?').get(customer).n,953);
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference='refund:job:seed4'").get().n,1);
});
