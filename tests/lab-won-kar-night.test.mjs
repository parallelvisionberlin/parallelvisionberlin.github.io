import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {MOODS,OWNER_MOODS,moodById,prepareMoodPrompt,imageHistoryCaption} from '../lab/moods.js';
import {prepareWonKarNight} from '../lab/won-kar-night.js';
import {soulNightFlashQuoteMatches} from '../lab/night-flash-soul.js';
import {higgsfieldRoute,soul2Input,soul2Parameters} from '../lab-worker/higgsfield.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const settings={type:'image',moodId:'won-kar-night',moodIntensity:75,moodOriginalPrompt:'Keep this person and outfit.',resolution:'1080p'};

test('Won Kar Night is outside the unchanged public catalogue and reuses the existing road-couple cover',()=>{
 assert.equal(MOODS.length,17);assert.equal(MOODS.some(m=>m.id==='won-kar-night'),false);
 assert.equal(OWNER_MOODS.length,1);assert.equal(moodById('won-kar-night').name,'Won Kar Night');
 assert.equal(OWNER_MOODS[0].ownerOnly,true);
 assert.deepEqual(readFileSync(new URL('../lab/mood-previews/won-kar-night.png',import.meta.url)),readFileSync(new URL('../wonkarwai1.png',import.meta.url)));
});
test('Soul compiles the bounded cinematic recipe, preserves direction and never sends the cover',()=>{
 for(const hasBase of [true,false])for(const intensity of [1,50,75,100]){
  const p=soul2Parameters({...settings,moodIntensity:intensity,prompt:'untrusted'},fail,{hasBase});
  assert.equal(p.prompt,prepareWonKarNight(settings.moodOriginalPrompt,intensity,{hasBase}).prompt);
  assert.ok(p.prompt.length<3500);assert.equal(p.moodIntensity,intensity);
  const input=soul2Input(p,hasBase?'https://example.com/user-base.jpg':null);
  assert.equal(input.prompt,p.prompt);assert.equal(input.style_id,undefined);assert.equal(input.image_url,hasBase?'https://example.com/user-base.jpg':undefined);
  assert.doesNotMatch(JSON.stringify(input),/won-kar-night\.png|wonkarwai1/);
 }
 assert.match(imageHistoryCaption(settings),/^Won Kar Night/);
 assert.match(prepareMoodPrompt('A portrait','won-kar-night',75,{engine:'seedream'}).error,/Choose PV Soul/);
 assert.match(prepareMoodPrompt('A portrait','won-kar-night',75,{engine:'soul2',referenceCount:2}).error,/one Base/);
 assert.throws(()=>soul2Parameters({...settings,moodOriginalPrompt:'x'.repeat(3500)},fail),/3,500/);
 assert.throws(()=>soul2Parameters({...settings,moodOriginalPrompt:''},fail,{hasBase:false}),/Describe a subject/);
 for(const patch of [{moodId:'night-flash'},{moodIntensity:50},{moodOriginalPrompt:'Changed'}])assert.equal(soulNightFlashQuoteMatches(settings,{...settings,...patch}),false);
});
test('customers cannot quote or submit Won Kar Night even with every customer launch flag enabled',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../lab-worker/schema.sql',import.meta.url),'utf8'));
 let customer=false,estimates=0,submissions=0;const user='won-kar-owner';
 const deps={fail,body:r=>r.json(),first:async(e,sql,...a)=>db.prepare(sql).get(...a),run:async(e,sql,...a)=>({meta:{changes:db.prepare(sql).run(...a).changes}}),now:()=>Date.now(),isLabCustomer:async()=>customer,jobView:j=>j,config:async()=>({daily_limit_microusd:10000000})};
 const env={HF_CREDENTIALS:'mock:secret',LAB_CUSTOMER_HIGGSFIELD_ENABLED:'true',LAB_CUSTOMER_SOUL_NIGHT_FLASH_ENABLED:'true'};
 const call=(path,data)=>higgsfieldRoute(new Request('https://lab.example'+path,{method:'POST',body:JSON.stringify(data)}),env,user,new URL('https://lab.example'+path),deps);
 const previous=globalThis.fetch;globalThis.fetch=async(url,options)=>{
  if(String(url).includes('/estimate/')){estimates++;return Response.json({usd:'0.006'});}
  submissions++;const id='30000000-0000-4000-8000-000000000001';return Response.json({request_id:id,status_url:'https://api.higgsfield.ai/requests/'+id+'/status'});
 };
 try{
  const quote=await call('/api/higgsfield/quote',{settings});assert.equal(quote.settings.moodId,'won-kar-night');assert.equal(estimates,1);assert.equal(submissions,0);
  customer=true;
  await assert.rejects(()=>call('/api/higgsfield/quote',{settings}),e=>e.status===403&&/owner only/.test(e.message));
  await assert.rejects(()=>call('/api/higgsfield/generate',{quoteId:quote.id,confirm:true}),e=>e.status===403);
  assert.equal(estimates,1);assert.equal(submissions,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM spend').get().n,0);
  customer=false;
  await assert.rejects(()=>call('/api/higgsfield/generate',{quoteId:quote.id}),/explicitly confirm/);
  const first=await call('/api/higgsfield/generate',{quoteId:quote.id,confirm:true});
  assert.equal(submissions,1);assert.equal(JSON.parse(first.job.params).moodId,'won-kar-night');
  assert.equal((await call('/api/higgsfield/generate',{quoteId:quote.id,confirm:true})).job.id,first.job.id);assert.equal(submissions,1);
 }finally{globalThis.fetch=previous;db.close();}
});
