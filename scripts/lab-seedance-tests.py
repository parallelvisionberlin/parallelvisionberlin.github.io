from pathlib import Path
r=Path('.')
base=(r/'tests/lab-worker.test.mjs').read_text();prefix=base[:base.index("test('Public health")]
(r/'tests/lab-seedance.test.mjs').write_text(prefix+r'''
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
 const r=await req(env,'/api/quotes',{method:'POST',data:{settings:sd('reference'),referenceSourceIds:ids.slice(0,30)}});assert.equal(r.status,200);assert.equal(quotedRequest.input.reference_image_urls.length,30);
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
''')
s=(r/'tests/lab-image-oneclick-ui.mjs').read_text();s=s[:s.index("try{\n let x=await workspace()")]
s=s.replace('4179','4183')
s=s.replace("config={enabled:true,dailyLimitUsd:10,concurrency:{image:4,video:1}};", "config={enabled:true,dailyLimitUsd:10,videoEngines:['wan','seedance'],concurrency:{image:4,video:1}};applyConfig(config);")
s=s.replace("const requests=[],errors=[],dialogs=[],jobs=[...initial],quotes=new Map();", "const requests=[],errors=[],dialogs=[],jobs=[...initial],quotes=new Map(),assets=new Map();")
s=s.replace("if(path==='/api/uploads')return send({id:id(sequence++)},201);", "if(path==='/api/uploads'||path==='/api/reference-uploads'){const aid=id(sequence++);assets.set(aid,{mime:req.headers()['content-type'],bytes:req.postDataBuffer()});return send({id:aid},201);}")
s=s.replace("if(path.startsWith('/api/assets/'))return route.fulfill({status:200,contentType:'image/png',body:png});", "if(path.startsWith('/api/assets/')){const a=assets.get(path.split('/').at(-1));return route.fulfill({status:200,contentType:a?.mime||'image/png',body:a?.bytes||png});}")
s=s.replace("settings:{...data.settings,referenceSourceIds:data.referenceSourceIds||[]}", "settings:{...data.settings,referenceSourceIds:data.referenceSourceIds||[],lastSourceId:data.lastSourceId||null,referenceVideoIds:data.referenceVideoIds||[],referenceAudioIds:data.referenceAudioIds||[]}")
s=s.replace("transferNotes:[]}};", "referenceVideoIds:data.referenceVideoIds||[],referenceAudioIds:data.referenceAudioIds||[],lastSourceId:data.lastSourceId||null,model:data.settings.engine==='seedance'?'bytedance/seedance-2.5/'+({start:'image-to-video',text:'text-to-video',reference:'reference-to-video'})[data.settings.mode]:'alibaba/wan-3.0/image-to-video',transferNotes:[]}};")
s+=r'''
const motion=readFileSync('test-results/seedance-motion.mp4');
const sound=Buffer.alloc(44+8000*3*2);sound.write('RIFF');sound.writeUInt32LE(sound.length-8,4);sound.write('WAVE',8);sound.write('fmt ',12);sound.writeUInt32LE(16,16);sound.writeUInt16LE(1,20);sound.writeUInt16LE(1,22);sound.writeUInt32LE(8000,24);sound.writeUInt32LE(16000,28);sound.writeUInt16LE(2,32);sound.writeUInt16LE(16,34);sound.write('data',36);sound.writeUInt32LE(sound.length-44,40);
const choose=async(x,mode='start')=>{await x.page.selectOption('#video-engine','seedance');await x.page.click('#mode-'+mode);await x.page.fill('#prompt','A ceramic sculpture under soft daylight. The camera moves slowly.');};
const still=async(x,id='image')=>{await x.page.locator('#'+id).setInputFiles({name:'sculpture.png',mimeType:'image/png',buffer:png});await ready(x.page);};
try{
 let x=await workspace();await choose(x);
 assert.equal(await x.page.locator('#resolution').inputValue(),'720p');assert.equal(await x.page.locator('#duration').inputValue(),'5');assert.equal(await x.page.locator('#ratio').isVisible(),false);await still(x);await still(x,'last-image');
 await x.page.click('#generate');await x.page.locator('#quote-dialog').waitFor({state:'visible'});assert.equal(count(x,'/api/jobs'),0);assert.match(await x.page.locator('#quote-settings').innerText(),/Seedance 2.5/);
 const quote=x.requests.find(r=>r.path==='/api/quotes').data;assert.equal(quote.settings.engine,'seedance');assert.equal(quote.settings.mode,'start');assert.ok(quote.sourceId);assert.ok(quote.lastSourceId);
 await x.page.click('#confirm-generation');await ready(x.page);assert.equal(x.accepted(),1);assert.equal(count(x,'/api/jobs'),1);ok('Seedance start/end frames, defaults and separate paid confirmation');
 await x.page.locator('.card').getByRole('button',{name:'Reuse',exact:true}).click();await ready(x.page);assert.equal(await x.page.locator('#video-engine').inputValue(),'seedance');assert.match(await x.page.locator('#filemeta').innerText(),/320/);assert.match(await x.page.locator('#last-filemeta').innerText(),/320/);assert.equal(count(x,'/api/jobs'),1);ok('Reuse restores model, first/last images and exact settings without generating');assert.deepEqual(x.errors,[]);await x.context.close();
 x=await workspace();await choose(x,'text');assert.equal(await x.page.locator('#start-mode').isVisible(),false);assert.equal(await x.page.locator('#reference-mode').isVisible(),false);await x.page.selectOption('#ratio','21:9');await x.page.selectOption('#duration','12');await x.page.click('#generate');await x.page.locator('#quote-dialog').waitFor({state:'visible'});assert.equal(count(x,'/api/uploads'),0);assert.equal(x.requests.find(r=>r.path==='/api/quotes').data.sourceId,null);assert.match(await x.page.locator('#quote-settings').innerText(),/Text to Video/);assert.equal(x.accepted(),0);ok('Text-to-video sends no hidden image and supports 21:9 and whole seconds');await x.context.close();
 x=await workspace();await choose(x,'reference');await still(x,'reference-images');
 await x.page.locator('#video-references').setInputFiles({name:'motion.mp4',mimeType:'video/mp4',buffer:motion});await ready(x.page);assert.match(await x.page.locator('#video-ref-count').innerText(),/1 \/ 10/);
 await x.page.locator('#audio-references').setInputFiles({name:'score.wav',mimeType:'audio/wav',buffer:sound});await ready(x.page);assert.match(await x.page.locator('#audio-ref-count').innerText(),/1 \/ 10/);
 await x.page.locator('#video-reference-list input').fill('Camera movement only.');await x.page.locator('#audio-reference-list input').fill('Rhythm.');
 await x.page.click('#save');await ready(x.page);assert.equal(count(x,'/api/jobs'),0);assert.equal(count(x,'/api/reference-uploads'),2);
 await x.page.click('#clear');await x.page.locator('.card[data-state="draft"]').getByRole('button',{name:'Reuse',exact:true}).click();await ready(x.page);
 assert.match(await x.page.locator('#video-ref-count').innerText(),/1 \/ 10/);assert.match(await x.page.locator('#audio-ref-count').innerText(),/1 \/ 10/);assert.equal(await x.page.locator('#video-reference-list input').inputValue(),'Camera movement only.');assert.equal(await x.page.locator('#audio-reference-list input').inputValue(),'Rhythm.');assert.equal(count(x,'/api/jobs'),0);ok('Mixed references retain media, durations and notes through draft, clear and Reuse');
 await x.page.click('#generate');await x.page.locator('#quote-dialog').waitFor({state:'visible'});const mixed=x.requests.find(r=>r.path==='/api/quotes').data;assert.equal(mixed.referenceVideoIds.length,1);assert.equal(mixed.referenceAudioIds.length,1);assert.equal(mixed.referenceSourceIds.length,1);assert.equal(mixed.settings.referenceVideos[0].seconds,3);assert.equal(mixed.settings.referenceAudio[0].seconds,3);assert.equal(x.accepted(),0);ok('Mixed references use a quoted, not automatic, paid request');
 await x.page.click('[data-close="quote-dialog"]');await x.page.selectOption('#video-engine','wan');assert.equal(await x.page.locator('#video-engine').inputValue(),'seedance');ok('Changing models cannot silently discard unsupported media');assert.deepEqual(x.errors,[]);await x.context.close();
 x=await workspace();await choose(x,'reference');await x.page.locator('#reference-images').setInputFiles(Array.from({length:30},(_,i)=>({name:'object-'+(i+1)+'.png',mimeType:'image/png',buffer:png})));await ready(x.page);assert.match(await x.page.locator('#ref-count').innerText(),/30 \/ 30/);await x.page.selectOption('#video-engine','wan');assert.equal(await x.page.locator('#video-engine').inputValue(),'seedance');ok('Thirty image references supported and no silent truncation on model change');assert.deepEqual(x.errors,[]);await x.context.close();
 for(const failure of ['quote','expired','wrong-model','budget','server','network']){
  x=await workspace({failure});await choose(x,'text');await x.page.click('#generate');await ready(x.page);
  if(await x.page.locator('#quote-dialog').isVisible())await x.page.click('#confirm-generation');await ready(x.page);await x.page.waitForTimeout(100);
  assert.equal(x.accepted(),0);assert.equal(count(x,'/api/quotes'),1);assert.ok(count(x,'/api/jobs')<=1);ok('Seedance '+failure+': no model fallback, duplicate or automatic retry');await x.context.close();
 }
 for(const width of [390,1728]){
  x=await workspace({width});await choose(x,'reference');await still(x,'reference-images');await x.page.locator('#video-references').setInputFiles({name:'motion.mp4',mimeType:'video/mp4',buffer:motion});await ready(x.page);
  assert.ok(await x.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));mkdirSync('test-results',{recursive:true});await x.page.screenshot({path:'test-results/seedance-standard-'+width+'.png',fullPage:true});assert.deepEqual(x.errors,[]);ok('Seedance responsive reference workspace at '+width+'px');
  await x.page.evaluate(()=>window.__labTest.lock());assert.equal(await x.page.locator('#app').isVisible(),false);assert.equal(await x.page.locator('#video-reference-list').locator('video').count(),0);ok('Sign-out clears reference media from browser');await x.context.close();
 }
 console.log('SEEDANCE_STANDARD_BROWSER_CHECKS_PASSED='+passed);
}finally{await browser.close();await new Promise(r=>server.close(r));}
'''
(r/'tests/lab-seedance-ui.mjs').write_text(s)
