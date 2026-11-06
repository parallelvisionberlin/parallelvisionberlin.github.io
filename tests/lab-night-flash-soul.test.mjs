import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {prepareMoodPrompt,userFacingImagePrompt,imageHistoryCaption} from '../lab/moods.js';
import {prepareSoulNightFlash,soulNightFlashQuoteMatches} from '../lab/night-flash-soul.js';
import {higgsfieldRoute,soul2Parameters,soul2Input,SOUL2_MODEL,SOUL2_TEXT_MODEL} from '../lab-worker/higgsfield.mjs';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const settings={type:'image',engine:'soulpro',soulProModel:'soul2',moodId:'night-flash',moodIntensity:80,moodOriginalPrompt:'Keep the expression.',resolution:'1080p'};

test('Night Flash cannot reuse a price bound to another mood, intensity or authored direction',()=>{
  assert.equal(soulNightFlashQuoteMatches(settings,{...settings}),true);
  for(const patch of [{moodId:undefined},{moodId:'dreamcore'},{moodIntensity:60},{moodOriginalPrompt:'A different direction'}])
    assert.equal(soulNightFlashQuoteMatches(settings,{...settings,...patch}),false);
  assert.equal(soulNightFlashQuoteMatches({},settings),false);
  assert.equal(soulNightFlashQuoteMatches({},{}),true);
});

test('the actual Studio settings compiler sends Night Flash through the Higgsfield route',()=>{
  const source=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const compiler=source.slice(source.indexOf('function settings(){'),source.indexOf('\nfunction hasInput(){'));
  const options=source.slice(source.indexOf('function imageMoodOptions(){'),source.indexOf('\nfunction imageMoodArguments(){'));
  for(const hasBase of [false,true]){
    const raw=hasBase?'':'A woman arriving at a club';
    const fields={prompt:{value:raw},'soul-pro-seed':{value:'42'},'hf-bar-ratio':{value:'3:4'}};
    const selected=runInNewContext(options+'\n'+compiler+'\nsettings()',{
      tool:'image',file:hasBase?{}:null,isSoul2:()=>true,$:id=>fields[id],
      hf:{parameters:()=>({characterId:'',identityStrength:.8,resolution:'1080p'})},
      moodUI:{enrich:(prompt,opts)=>prepareMoodPrompt(prompt,'night-flash',80,opts)}
    });
    assert.equal(selected.provider,'higgsfield');assert.equal(selected.engine,'soulpro');
    assert.equal(selected.soulProModel,'soul2');assert.equal(selected.moodId,'night-flash');
    assert.equal(selected.moodOriginalPrompt,raw);assert.equal(selected.seed,'42');
    assert.equal(selected.prompt,prepareSoulNightFlash(raw,80,{hasBase}).prompt);
  }
});

test('Soul Night Flash supports one base or a described subject, and only this built-in Mood',()=>{
  for(const intensity of [1,34,35,69,70,100]){
    const r=prepareMoodPrompt('Keep the expression.','night-flash',intensity,{engine:'soul2',referenceCount:1});
    assert.equal(r.error,'');assert.equal(r.metadata.moodIntensity,intensity);
    assert.match(r.prompt,/Relight the existing subject/);assert.match(r.prompt,/exact outfit and skin coverage/);
    assert.match(r.prompt,/Explicit user-authored changes take priority/);
    assert.equal(r.prompt,prepareSoulNightFlash('Keep the expression.',intensity,{hasBase:true}).prompt);
  }
  assert.match(prepareMoodPrompt('','night-flash',80,{engine:'soul2'}).error,/Describe a subject/);
  assert.equal(prepareMoodPrompt('','night-flash',80,{engine:'soul2',referenceCount:1}).error,'');
  assert.match(prepareMoodPrompt('A woman arriving at a club','night-flash',80,{engine:'soul2'}).prompt,/subject and setting described by the user/);
  assert.match(prepareMoodPrompt('Keep this','night-flash',80,{engine:'soul2',referenceCount:2}).error,/one base/);
  assert.match(prepareMoodPrompt('Keep this','night-flash',80,{engine:'soul2',referenceCount:1,referenceMode:'references'}).error,/one base/);
  assert.match(prepareMoodPrompt('Portrait','dreamcore',80,{engine:'soul2'}).error,/supports Night Flash/);
  assert.notEqual(prepareMoodPrompt('','night-flash',10,{engine:'soul2',referenceCount:1}).prompt,prepareMoodPrompt('','night-flash',100,{engine:'soul2',referenceCount:1}).prompt);
});

test('Worker rebuilds Night Flash and preserves authored direction for History and Reuse',()=>{
  const p=soul2Parameters({...settings,prompt:'untrusted client recipe'},fail);
  assert.equal(p.prompt,prepareSoulNightFlash(settings.moodOriginalPrompt,80,{hasBase:true}).prompt);
  assert.equal(p.moodOriginalPrompt,settings.moodOriginalPrompt);
  assert.equal(userFacingImagePrompt(p),'Keep the expression.');
  assert.equal(imageHistoryCaption(p),'Night Flash · 80% · Keep the expression.');
  const input=soul2Input(p,'https://example.com/base.png');
  assert.equal(input.prompt,p.prompt);assert.equal(input.image_url,'https://example.com/base.png');
  assert.equal(input.style_id,undefined);assert.equal(input.custom_reference_id,undefined);
  assert.doesNotMatch(input.prompt,/background and lighting unless directed/);
  assert.match(soul2Input(soul2Parameters({type:'image'},fail),'https://example.com/base.png').prompt,/background and lighting unless directed/);
  for(const patch of [{moodId:'dreamcore'},{moodId:'custom'},{moodOriginalPrompt:null},{moodIntensity:0},{moodIntensity:101},{moodIntensity:1.5},{moodIntensity:'80'}])
    assert.throws(()=>soul2Parameters({...settings,...patch},fail));
  const original='Never truncate this. '.repeat(300);
  const prepared=prepareSoulNightFlash(original,80,{hasBase:true});
  assert.match(prepared.error,/3,500/);assert.ok(prepared.prompt.startsWith(original.trim()));
  assert.throws(()=>soul2Parameters({...settings,moodOriginalPrompt:original},fail),/3,500/);
});

test('Night Flash quote binds source, identity, recipe and price without submitting; explicit replay submits once',async()=>{
  const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../lab-worker/schema.sql',import.meta.url),'utf8'));
  const owner='night-flash-owner',asset='b0f563e2-97ee-4b12-931f-0307400c7381',character='c0f563e2-97ee-4b12-931f-0307400c7381',providerCharacter='d0f563e2-97ee-4b12-931f-0307400c7381',providerJob='e0f563e2-97ee-4b12-931f-0307400c7381';
  db.prepare('INSERT INTO assets VALUES(?,?,?,?,?,?,?,?)').run(asset,owner,'base.png','source','image/png','base.png',100,Date.now());
  db.prepare("INSERT INTO jobs(id,owner_id,params,state,provider_id,created_at,updated_at) VALUES(?,?,?,'completed',?,1,1)").run(character,owner,JSON.stringify({provider:'higgsfield',mode:'soul-id-training',characterName:'Test identity'}),providerCharacter);
  const first=async(e,sql,...args)=>db.prepare(sql).get(...args),run=async(e,sql,...args)=>({meta:{changes:db.prepare(sql).run(...args).changes}});
  const deps={first,run,fail,now:()=>Date.now(),config:async()=>({daily_limit_microusd:10000000}),body:r=>r.json(),jobView:j=>j,
    source:async(e,o,id)=>{const a=await first(e,'SELECT * FROM assets WHERE id=? AND owner_id=?',id,o);if(!a)fail(404,'source');return a;},
    signedInput:async()=> 'https://lab.example/private-input',storedImageDimensions:()=>({width:900,height:1200})};
  const env={HF_CREDENTIALS:'test:secret',LAB_MEDIA:{get:async()=>({arrayBuffer:async()=>new ArrayBuffer(1)})}};
  const invoke=(path,data)=>higgsfieldRoute(new Request('https://lab.example'+path,{method:'POST',body:JSON.stringify(data)}),env,owner,new URL('https://lab.example'+path),deps);
  const previous=globalThis.fetch;let estimates=0,submissions=0,lastInput;
  globalThis.fetch=async(url,options)=>{
    lastInput=JSON.parse(options.body);
    if(String(url).includes('/estimate/')){estimates++;return Response.json({usd:'0.006'});}
    submissions++;return Response.json({request_id:providerJob,status_url:'https://api.higgsfield.ai/requests/'+providerJob+'/status'});
  };
  try{
    const quoted=await invoke('/api/higgsfield/quote',{sourceId:asset,settings:{...settings,characterId:character}});
    assert.equal(quoted.settings.model,SOUL2_MODEL);assert.equal(quoted.sourceId,asset);assert.equal(quoted.settings.aspectRatio,'3:4');
    assert.equal(quoted.settings.moodId,'night-flash');assert.equal(quoted.settings.moodIntensity,80);
    assert.equal(lastInput.custom_reference_id,providerCharacter);assert.match(lastInput.prompt,/Night Flash/);
    assert.equal(estimates,1);assert.equal(submissions,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM spend').get().n,0);
    const payload=JSON.parse(db.prepare('SELECT payload FROM quotes WHERE id=?').get(quoted.id).payload);
    await assert.rejects(()=>invoke('/api/higgsfield/generate',{quoteId:quoted.id}),/explicitly confirm/);
    const {job}=await invoke('/api/higgsfield/generate',{quoteId:quoted.id,confirm:true});
    assert.deepEqual(lastInput,payload.input);assert.equal(submissions,1);
    assert.equal(JSON.parse(job.params).moodOriginalPrompt,'Keep the expression.');
    assert.equal((await invoke('/api/higgsfield/generate',{quoteId:quoted.id,confirm:true})).job.id,job.id);assert.equal(submissions,1);
    const text=await invoke('/api/higgsfield/quote',{settings:{...settings,moodOriginalPrompt:'A woman arriving at a club'}});
    assert.equal(text.settings.model,SOUL2_TEXT_MODEL);assert.equal(text.sourceId,null);
    assert.match(text.settings.prompt,/subject and setting described by the user/);assert.equal(lastInput.image_url,undefined);
    const count=estimates;
    await assert.rejects(()=>invoke('/api/higgsfield/quote',{settings:{...settings,moodOriginalPrompt:''}}),/Describe a subject/);
    await assert.rejects(()=>invoke('/api/higgsfield/quote',{sourceId:asset,referenceSourceIds:[asset],settings}),/one base image/);
    assert.equal(estimates,count);assert.equal(submissions,1);
  }finally{globalThis.fetch=previous;db.close();}
});
