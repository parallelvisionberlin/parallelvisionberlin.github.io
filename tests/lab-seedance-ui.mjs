async function imageAdvanced(page){await page.click('#tool-image');const open=await page.locator('#app').evaluate(el=>el.classList.contains('image-settings-open'));if(!open)await page.click('#image-composer-more');}
// Mock-only browser verification. No real credentials, private media or paid generations.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf("try{const {Clerk}=await import(");assert.ok(boot>0);
const testSource=source.slice(0,boot)+`clerk={isSignedIn:true,user:{id:'test'},session:{id:'synthetic-session',getToken:async()=> 'synthetic-token'},signOut:async()=>{}};owner=true;userId='test';config={enabled:true,dailyLimitUsd:10,videoEngines:['wan','seedance'],concurrency:{image:4,video:1}};applyConfig(config);$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();update();window.__labTest={lock};`;
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const path=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'text/plain');res.end(pathname==='/lab/lab.js'?testSource:readFileSync(path));});
await new Promise(r=>server.listen(4183,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const ORIGIN='http://127.0.0.1:4183',API='https://parallel-vision-lab.parallelvision.workers.dev';
let passed=0,png;const ok=name=>{passed++;console.log('PASS '+name);};
const id=n=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
const settings={type:'image',mode:'image',prompt:'A ceramic sculpture in soft daylight.',resolution:'2k',aspectRatio:'16:9',outputFormat:'png',referenceRoles:[],referenceSourceIds:[]};
async function workspace({failure='',width=1440,initial=[],quoteDelay=0}={}){
 const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true}),page=await context.newPage();
 const requests=[],errors=[],dialogs=[],jobs=[...initial],quotes=new Map(),assets=new Map();let sequence=100,accepted=0,renewed=false;
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
 await context.route('https://**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(!url.href.startsWith(API)){await route.abort();return;}
  const path=url.pathname,method=req.method(),data=req.headers()['content-type']?.startsWith('application/json')?req.postDataJSON():{};
  requests.push({path,method,data});
  const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/api/jobs'&&method==='GET')return send({jobs,activeJobs:jobs.filter(j=>['queued','running','saving','uncertain','submitting'].includes(j.status)),concurrency:{image:4,video:1},next:null});
  if(path==='/api/packs')return send({packs:[]});
  if(path==='/api/uploads'||path==='/api/reference-uploads'){const aid=id(sequence++);assets.set(aid,{mime:req.headers()['content-type'],bytes:req.postDataBuffer()});return send({id:aid},201);}
  if(path.startsWith('/api/assets/')){const a=assets.get(path.split('/').at(-1));return route.fulfill({status:200,contentType:a?.mime||'image/png',body:a?.bytes||png});}
  if(path==='/api/drafts'){const job={id:id(sequence++),sourceId:data.sourceId,settings:{...data.settings,referenceSourceIds:data.referenceSourceIds||[],lastSourceId:data.lastSourceId||null,referenceVideoIds:data.referenceVideoIds||[],referenceAudioIds:data.referenceAudioIds||[]},status:'draft',createdAt:Date.now()};jobs.unshift(job);return send({job},201);}
  if(path==='/api/quotes'){
   if(quoteDelay)await new Promise(r=>setTimeout(r,quoteDelay));
   if(failure==='quote')return send({error:'Provider quote unavailable. No generation submitted.'},502);
   const q={id:id(sequence++),estimatedUsd:0.036,maxUsd:0.036,expiresAt:Date.now()+(failure==='expired'?-1:180000),settings:{...data.settings,mode:failure==='wrong-model'?(data.settings.mode==='upscale'?'image':'upscale'):data.settings.mode,referenceSourceIds:data.referenceSourceIds||[],referenceVideoIds:data.referenceVideoIds||[],referenceAudioIds:data.referenceAudioIds||[],lastSourceId:data.lastSourceId||null,model:data.settings.engine==='seedance'?'bytedance/seedance-2.5/'+({start:'image-to-video',text:'text-to-video',reference:'reference-to-video'})[data.settings.mode]:'alibaba/wan-3.0/image-to-video',transferNotes:[]}};
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
 await page.goto(ORIGIN+'/lab/');await page.waitForFunction(()=>!!window.__labTest);
 if(!png)png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=320;const x=c.getContext('2d');x.fillStyle='#333';x.fillRect(0,0,320,320);x.fillStyle='#aaa';x.fillRect(75,75,170,170);return c.toDataURL().split(',')[1];}),'base64');
 return {page,context,requests,errors,dialogs,jobs,accepted:()=>accepted};
}
const count=(x,path,method='POST')=>x.requests.filter(r=>r.path===path&&r.method===method).length;
const ready=page=>page.waitForFunction(()=>!document.querySelector('#resolution').disabled);
async function imageForm(x){await imageAdvanced(x.page);await x.page.fill('#prompt',settings.prompt);await x.page.selectOption('#resolution','2k');await x.page.selectOption('#ratio','16:9');await x.page.selectOption('#output-format','png');}

const {execFileSync}=await import('node:child_process');
mkdirSync('test-results',{recursive:true});
if(!existsSync('test-results/seedance-motion.mp4'))execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=gray:s=320x320:r=24:d=3','-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-y','test-results/seedance-motion.mp4']);
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
