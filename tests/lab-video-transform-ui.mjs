// Seedance Transform mock-only browser verification. No real credentials, private media or paid generations.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf("try{clerk=await loadLabAccount();");assert.ok(boot>0);
const testSource=source.slice(0,boot)+source.slice(source.indexOf("\n// Soul composer:",boot))+`clerk={isSignedIn:true,user:{id:'test'},session:{id:'synthetic-session',getToken:async()=> 'synthetic-token'},signOut:async()=>{}};owner=true;ownerAccount=true;userId='test';config={enabled:true,dailyLimitUsd:10,videoEngines:['wan','seedance'],higgsfieldEnabled:true,concurrency:{image:4,video:1}};applyConfig(config);$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();update();syncVideoStudioMode();window.__labTest={lock,setCustomer:()=>{customerMode=true;ownerAccount=false;customerGenerationReady=true;config.customer=true;wallet.connect({customer:true,balanceCredits:1000,billingReady:true});update();}};`;
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const path=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'})[extname(path)]||'application/octet-stream');res.end(pathname==='/lab/lab.js'?testSource:readFileSync(path));});
await new Promise(r=>server.listen(4193,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.PV_CHROMIUM_EXECUTABLE?{executablePath:process.env.PV_CHROMIUM_EXECUTABLE}:{})});
const ORIGIN='http://127.0.0.1:4193',API='https://parallel-vision-lab.parallelvision.workers.dev';
let passed=0,png;const ok=name=>{passed++;console.log('PASS '+name);};
const id=n=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
const character={id:id(1),name:'PVSCENE1|characters|Alma',profile:{signature:'Copper hair, freckles, green eyes.'},refs:Array.from({length:8},(_,i)=>({id:id(i+2),name:'alma-view-'+(i+1)+'.png',role:'identity'}))};
const settings={type:'image',mode:'image',prompt:'A ceramic sculpture in soft daylight.',resolution:'2k',aspectRatio:'16:9',outputFormat:'png',referenceRoles:[],referenceSourceIds:[]};
async function workspace({failure='',width=1440,initial=[],quoteDelay=0}={}){
 const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true}),page=await context.newPage();
 const requests=[],errors=[],dialogs=[],jobs=[...initial],quotes=new Map(),assets=new Map();let sequence=100,accepted=0,renewed=false;
 for(const entry of initial)if(entry.outputId&&entry.settings?.type==='video'){assets.set(entry.outputId,{mime:'video/mp4',bytes:motion});if(entry.sourceId)assets.set(entry.sourceId,{mime:'video/mp4',bytes:motion});}
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});page.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
 await context.route('https://**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(!url.href.startsWith(API)){await route.abort();return;}
  const path=url.pathname,method=req.method(),data=req.headers()['content-type']?.startsWith('application/json')?req.postDataJSON():{};
  requests.push({path,method,data});
  const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/api/jobs'&&method==='GET')return send({jobs,activeJobs:jobs.filter(j=>['queued','running','saving','uncertain','submitting'].includes(j.status)),concurrency:{image:4,video:1},next:null});
  if(path==='/api/packs')return send({packs:[character]});
  if(path==='/api/uploads'||path==='/api/reference-uploads'){const aid=id(sequence++);assets.set(aid,{mime:req.headers()['content-type'],bytes:req.postDataBuffer()});return send({id:aid},201);}
  if(path.startsWith('/api/assets/')){const a=assets.get(path.split('/').at(-1));return route.fulfill({status:200,contentType:a?.mime||'image/png',body:a?.bytes||png});}
  if(path==='/api/drafts'){const job={id:id(sequence++),sourceId:data.sourceId,settings:{...data.settings,referenceSourceIds:data.referenceSourceIds||[],lastSourceId:data.lastSourceId||null,referenceVideoIds:data.referenceVideoIds||[],referenceAudioIds:data.referenceAudioIds||[]},status:'draft',createdAt:Date.now()};jobs.unshift(job);return send({job},201);}
  if(path==='/api/quotes'){
   if(quoteDelay)await new Promise(r=>setTimeout(r,quoteDelay));
   if(failure==='quote')return send({error:'Provider quote unavailable. No generation submitted.'},502);
   const q={id:id(sequence++),creditCost:222,estimatedUsd:0.036,maxUsd:0.036,expiresAt:Date.now()+(failure==='expired'?-1:180000),settings:{...data.settings,mode:failure==='wrong-model'?(data.settings.mode==='upscale'?'image':'upscale'):data.settings.mode,referenceSourceIds:data.referenceSourceIds||[],referenceVideoIds:data.referenceVideoIds||[],referenceAudioIds:data.referenceAudioIds||[],lastSourceId:data.lastSourceId||null,model:data.settings.engine==='seedance'?'bytedance/seedance-2.5/'+({start:'image-to-video',text:'text-to-video',reference:'reference-to-video',extend:'video-extend',transform:'video-edit'})[data.settings.mode]:'alibaba/wan-3.0/image-to-video',transferNotes:[]}};
   quotes.set(q.id,{q,data});return send(q);
  }
  if(path==='/api/jobs'&&method==='POST'){
   if(failure==='auth'&&!renewed){renewed=true;return send({error:'Sign-in expired or invalid. Please sign in again.'},401);}
   if(failure==='network')return route.abort('connectionfailed');
   if(failure==='budget')return send({error:'Daily spending limit reached. No generation submitted.'},409);
   if(failure==='server')return send({error:'Temporary server failure. Check History.'},502);
   assert.equal(data.confirm,true);const entry=quotes.get(data.quoteId);assert.ok(entry);
   const job={id:id(sequence++),sourceId:entry.data.sourceId,settings:entry.q.settings,status:'queued',createdAt:Date.now(),estimatedUsd:0.036,providerTaskId:'synthetic-job'};
   accepted++;jobs.unshift(job);return send({job},202);
  }
  if(path.startsWith('/api/jobs/')&&method==='GET'){const job=jobs.find(j=>path.endsWith('/'+j.id));return job?send({job}):send({error:'Not found.'},404);}
  return send({error:'Unmocked request '+path},404);
 });
 await page.goto(ORIGIN+'/lab/studio.html');await page.waitForFunction(()=>!!window.__labTest);
 if(!png)png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=320;const x=c.getContext('2d');x.fillStyle='#333';x.fillRect(0,0,320,320);x.fillStyle='#aaa';x.fillRect(75,75,170,170);return c.toDataURL().split(',')[1];}),'base64');
 return {page,context,requests,errors,dialogs,jobs,accepted:()=>accepted};
}
const count=(x,path,method='POST')=>x.requests.filter(r=>r.path===path&&r.method===method).length;
const ready=page=>page.waitForFunction(()=>!document.querySelector('#resolution').disabled);
async function imageForm(x){await imageAdvanced(x.page);await x.page.fill('#prompt',settings.prompt);await x.page.selectOption('#resolution','2k');await x.page.selectOption('#ratio','16:9');await x.page.selectOption('#output-format','png');}

const {execFileSync}=await import('node:child_process');
mkdirSync('test-results',{recursive:true});
if(!existsSync('test-results/seedance-motion.mp4'))execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=gray:s=320x320:r=24:d=6','-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-y','test-results/seedance-motion.mp4']);
const motion=readFileSync('test-results/seedance-motion.mp4');
const sound=Buffer.alloc(44+8000*3*2);sound.write('RIFF');sound.writeUInt32LE(sound.length-8,4);sound.write('WAVE',8);sound.write('fmt ',12);sound.writeUInt32LE(16,16);sound.writeUInt16LE(1,20);sound.writeUInt16LE(1,22);sound.writeUInt32LE(8000,24);sound.writeUInt32LE(16000,28);sound.writeUInt16LE(2,32);sound.writeUInt16LE(16,34);sound.write('data',36);sound.writeUInt32LE(sound.length-44,40);
const choose=async(x,mode='start')=>{await x.page.click('#tool-video');await x.page.selectOption('#video-engine','seedance');await x.page.click('#mode-'+mode);await x.page.fill('#prompt','A ceramic sculpture under soft daylight. The camera moves slowly.');};
const still=async(x,id='image')=>{await x.page.locator('#'+id).setInputFiles({name:'sculpture.png',mimeType:'image/png',buffer:png});await ready(x.page);};
try{
 for(const width of [390,1440]){
  const x=await workspace({width});const {page}=x;
  await choose(x,'transform');
  assert.equal(await page.locator('#mode-transform').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#app').evaluate(el=>el.classList.contains('video-transform-active')),true);
  assert.equal(await page.locator('#transform-help').count(),0);
  assert.equal(await page.locator('#duration-control').isVisible(),true,'Original duration field is retained');
  assert.equal(await page.locator('#pv-transform-source-duration').isVisible(),true,'Source duration is read-only');
  assert.equal(await page.locator('#duration').isVisible(),false,'Duration cannot be independently changed in an edit');
  assert.equal(await page.locator('#resolution-control').isVisible(),true);
  assert.equal((await page.locator('#generate').innerText()).trim(),'Generate');
  assert.equal(await page.locator('#generate').isDisabled(),true);
  assert.equal(await page.locator('#generate').evaluate(el=>el.classList.contains('is-input-action')),false);
  assert.deepEqual(await page.locator('#resolution option').evaluateAll(nodes=>nodes.map(n=>n.value)),['480p','720p','1080p']);
  assert.equal(await page.locator('#reference-media').isVisible(),true,'one source-video picker visible');
  assert.equal(await page.locator('#reference-drop').isVisible(),true,'replacement identity uploader visible');
  assert.equal(await page.locator('#scene-video-open').isVisible(),true,'existing saved Elements library is available');
  assert.equal((await page.locator('#scene-video-open span').innerText()).trim(),'Add Element');
  assert.match(await page.locator('#scene-video-open small').innerText(),/Characters, objects & looks/);
  const dropSizes=await page.evaluate(()=>Object.fromEntries(['video-media-drop','reference-drop','scene-video-open'].map(id=>{
    const box=document.getElementById(id).getBoundingClientRect();return [id,{height:box.height,width:box.width}];
  })));
  assert.ok(dropSizes['video-media-drop'].height>=88,'source video has a visible, usable drop target');
  assert.ok(dropSizes['reference-drop'].height>=70,'upload images tile is large enough for dragging files');
  assert.ok(dropSizes['scene-video-open'].height>=70,'library tile aligns with upload images');
  assert.equal(await page.locator('#history').evaluate(el=>!!el.closest('.video-feed-center')),true,'the existing History remains in its center feed');
  await page.locator('#video-references').setInputFiles({name:'original.mp4',mimeType:'video/mp4',buffer:motion});
  await page.waitForFunction(()=>document.querySelector('#video-reference-list').children.length===1);
  await page.waitForFunction(()=>document.querySelector('#pv-transform-source-duration')?.textContent?.includes('6'));
  assert.equal((await page.locator('#generate').innerText()).trim(),'Generate');
  assert.equal(await page.locator('#generate').isDisabled(),true,'Identity references are still required');
  await page.click('#scene-video-open');
  await page.locator('#scene-grid .scene-card-select').first().click();
  await page.locator('.scene-feature-attach').click();
  await page.waitForFunction(()=>document.querySelector('#reference-list .reference-element-item')?.textContent.includes('Alma'));
  await page.waitForFunction(()=>Number(document.querySelector('#ref-count')?.textContent?.split('/')[0]?.trim())===8);
  await page.waitForFunction(()=>document.querySelectorAll('#pv-transform-reference-strip img').length===4);
  assert.match(await page.locator('#pv-transform-inspector-original').innerText(),/original\.mp4/);
  assert.equal(await page.locator('#pv-transform-inspector-count').innerText(),'8 photographs');
  assert.equal(await page.locator('#pv-transform-inspector-character').innerText(),'Alma');
  assert.equal(await page.locator('#scene-video-open span').innerText(),'Add Element');
  assert.equal(await page.locator('#history').evaluate(el=>!!el.closest('.video-feed-center')),true,'existing History remains in the same central deck');
  assert.equal(await page.locator('#mode-transform').getAttribute('aria-selected'),'true');
  await page.fill('#prompt','');
  await ready(page);
  assert.equal(await page.locator('#generate').isEnabled(),true,'character replacement does not require a typed direction');
  await page.click('#generate');await page.locator('#quote-dialog').waitFor({state:'visible'});
  const request=x.requests.filter(r=>r.path==='/api/quotes').at(-1).data;
  assert.equal(request.settings.mode,'transform');
  assert.equal(request.settings.transformType,'replace-character');
  assert.deepEqual(request.referenceSourceIds,character.refs.map(ref=>ref.id),'all eight photos are quoted');
  assert.equal(request.referenceVideoIds.length,1);
  assert.equal(request.sourceId,request.referenceVideoIds[0]);
  assert.equal(count(x,'/api/jobs'),0,'provider job cannot start before payment confirmation');
  await page.click('#confirm-generation');await ready(page);
  assert.equal(count(x,'/api/jobs'),1,'exactly one mock job after explicit confirmation');
  await page.locator('#history .card').first().click();await page.click('#video-detail-reuse');await ready(page);
  assert.equal(await page.locator('#mode-transform').getAttribute('aria-selected'),'true','Reuse restores Transform');
  assert.equal(await page.locator('#video-reference-list video').count(),1,'Reuse restores original video');
  assert.equal(await page.locator('#reference-list .reference-element-item').count(),1,'Reuse restores saved Character');
  await page.click('#video-create-task');
  assert.equal(await page.locator('#video-create-task').getAttribute('aria-selected'),'true','Create remains usable');
  await page.click('#mode-extend');
  assert.equal(await page.locator('#mode-extend').getAttribute('aria-selected'),'true','Extend remains usable');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no mobile overflow');
  assert.deepEqual(x.errors,[]);
  await page.screenshot({path:'test-results/seedance-transform-'+width+'.png',fullPage:true});
  console.log('PASS: Transform 8-photo Character, quote, History, Reuse, Create and Extend at '+width+'px');
  await x.context.close();
 }
 const originalId=id(900),outputId=id(901);
 const completed={id:id(902),outputId,sourceId:originalId,status:'completed',createdAt:Date.now(),
   settings:{type:'video',provider:'higgsfield',engine:'seedance',mode:'transform',transformType:'replace-character',
    model:'bytedance/seedance-2.5/video-edit',prompt:'Preserve motion, replace character',duration:6,
    resolution:'720p',aspectRatio:'source',sourceDurationSeconds:6,referenceSourceIds:character.refs.map(r=>r.id),
    referenceVideoIds:[originalId],referenceAudioIds:[]}};
 const y=await workspace({initial:[completed]});
 await y.page.click('#tool-video');
 await y.page.locator('#history .card').first().click();
 await y.page.waitForFunction(()=>!document.querySelector('#video-transform-compare').hidden);
 await y.page.click('#video-transform-original');
 await y.page.waitForFunction(()=>document.querySelector('#video-transform-original').getAttribute('aria-pressed')==='true');
 await y.page.click('#video-transform-result');
 await y.page.waitForFunction(()=>document.querySelector('#video-transform-result').getAttribute('aria-pressed')==='true');
 assert.equal(count(y,'/api/jobs'),0,'comparison never submits a paid job');
 assert.deepEqual(y.errors,[]);
 console.log('PASS: original/result comparison uses the real stored source/output without any paid request');
 await y.context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
