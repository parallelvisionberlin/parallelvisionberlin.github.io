// Legacy model integration uses the retained options handler; the visible customer composer is covered separately.
async function clickAdvanced(page){const control=page.locator('#image-composer-more');if(await control.isVisible())await control.click();else await page.evaluate(()=>document.querySelector('#image-composer-more').click());}
async function imageAdvanced(page){await page.click('#tool-image');const open=await page.locator('#app').evaluate(el=>el.classList.contains('image-settings-open'));if(!open)await clickAdvanced(page);}
// Mock-only browser verification. No real credentials, private media or paid generations.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf("try{clerk=await loadLabAccount();");assert.ok(boot>0);
const testSource=source.slice(0,boot)+source.slice(source.indexOf("\n// Soul composer:",boot))+`clerk={isSignedIn:true,user:{id:'test'},session:{id:'synthetic-session',getToken:async()=> 'synthetic-token'},signOut:async()=>{}};owner=true;ownerAccount=true;userId='test';config={enabled:true,dailyLimitUsd:10,videoEngines:['wan','seedance'],concurrency:{image:4,video:1}};applyConfig(config);$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();update();syncVideoStudioMode();window.__labTest={lock};`;
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const path=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'})[extname(path)]||'application/octet-stream');res.end(pathname==='/lab/lab.js'?testSource:readFileSync(path));});
await new Promise(r=>server.listen(4183,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const ORIGIN='http://127.0.0.1:4183',API='https://parallel-vision-lab.parallelvision.workers.dev';
let passed=0,png;const ok=name=>{passed++;console.log('PASS '+name);};
const id=n=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
const settings={type:'image',mode:'image',prompt:'A ceramic sculpture in soft daylight.',resolution:'2k',aspectRatio:'16:9',outputFormat:'png',referenceRoles:[],referenceSourceIds:[]};
async function workspace({failure='',width=1440,initial=[],quoteDelay=0}={}){
 const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true}),page=await context.newPage();
 const requests=[],errors=[],dialogs=[],jobs=[...initial],quotes=new Map(),assets=new Map();let sequence=100,accepted=0,renewed=false;
 for(const entry of initial)if(entry.outputId&&entry.settings?.type==='video')assets.set(entry.outputId,{mime:'video/mp4',bytes:motion});
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});page.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
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
 await page.goto(ORIGIN+'/lab/studio.html');await page.waitForFunction(()=>!!window.__labTest);
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
const choose=async(x,mode='start')=>{await x.page.click('#tool-video');await x.page.selectOption('#video-engine','seedance');await x.page.click('#mode-'+mode);await x.page.fill('#prompt','A ceramic sculpture under soft daylight. The camera moves slowly.');};
const still=async(x,id='image')=>{await x.page.locator('#'+id).setInputFiles({name:'sculpture.png',mimeType:'image/png',buffer:png});await ready(x.page);};
try{
 for(const [width,height] of [[1920,912],[1440,900],[1440,600],[390,844],[320,730]]){
  const preview=await workspace({width});
  await preview.page.setViewportSize({width,height});
  await choose(preview,'reference');
  await preview.page.waitForFunction(()=>document.getElementById('app').classList.contains('pv-video-compact'));
  const art=()=>preview.page.locator('.canvas').evaluate(el=>({
   image:getComputedStyle(el,'::before').backgroundImage,
   visible:getComputedStyle(el,'::before').display,
   attached:document.getElementById('app').classList.contains('pv-video-has-input')
  }));
  assert.match((await art()).image,/video-subway-relaxed-approved\.png/);
  assert.equal(await preview.page.locator('#pv-video-reference-preview img').count(),0,
   'Decorative artwork never becomes a reference or History item');
  assert.equal(await preview.page.locator('#history .card').count(),0);
  assert.equal(await preview.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  async function assertInputPanelFits(){
   if(width<821||height<900)return;
   const panel=await preview.page.locator('.controls-body').evaluate(el=>({scroll:el.scrollHeight,client:el.clientHeight}));
   assert.ok(panel.scroll<=panel.client+1,'Image-input modes fit without unnecessary settings scroll: '+JSON.stringify({width,height,...panel}));
   assert.equal(Math.round((await preview.page.locator('#prompt').boundingBox()).height),104,'Fit must preserve the original input-mode prompt height');
   assert.equal(Math.round((await preview.page.locator('#video-model-control').boundingBox()).height),124,'Fit must preserve the original model banner height');
  }
  await assertInputPanelFits();
  await preview.page.click('#pv-video-output-toggle');
  assert.equal(await preview.page.locator('#duration-control').isVisible(),false,'Output disclosure still collapses the real settings');
  await preview.page.click('#pv-video-output-toggle');
  assert.equal(await preview.page.locator('#duration-control').isVisible(),true);
  // Finish the native settings scroll before opening the picker; its existing
  // scroll-dismiss behavior must remain intact at short desktop heights.
  await preview.page.locator('#video-model-control').scrollIntoViewIfNeeded();
  await preview.page.waitForTimeout(100);
  await preview.page.click('#video-model-trigger');
  await preview.page.locator('.pv-video-model-item[data-model="wan"]').click();
  assert.equal(await preview.page.locator('#video-engine').inputValue(),'wan');
  await preview.page.click('#video-model-trigger');
  await preview.page.locator('.pv-video-model-item[data-model="seedance"]').click();
  assert.equal(await preview.page.locator('#video-engine').inputValue(),'seedance');
  await preview.page.fill('#prompt','');
  await preview.page.evaluate(()=>Promise.all([...document.querySelectorAll('#studio-header img')].map(img=>img.decode())));
  assert.equal(await preview.page.locator('#pv-video-browse-library').isVisible(),width>=821,'Decorative mobile stage retains the existing responsive visibility policy');
  await preview.page.screenshot({path:`test-results/video-approved-${width}-${height}.png`,fullPage:width<821});
  await preview.page.click('#mode-start');
  await preview.page.waitForFunction(()=>document.getElementById('app').classList.contains('pv-video-mode-start'));
  await assertInputPanelFits();
  if(width>=821)assert.equal(await preview.page.locator('.pv-video-add-frame').isVisible(),true,'Keep the plus invitation for the opening-frame drop area');
  await still(preview);
  await preview.page.waitForFunction(()=>document.getElementById('app').classList.contains('pv-video-has-input'));
  assert.equal((await art()).visible,'none','Real first frame removes the background');
  await still(preview,'last-image');
  assert.equal(await preview.page.locator('#video-end-thumb').isVisible(),true);
  await preview.page.click('#mode-reference');
  await still(preview,'reference-images');
  await preview.page.waitForFunction(()=>document.querySelector('#reference-list .reference-item')&&document.getElementById('app').classList.contains('pv-video-has-input'));
  assert.equal((await art()).visible,'none','Real references remove the background');
  assert.equal(await preview.page.locator('#pv-video-reference-preview').getAttribute('data-illustrative'),'false');
  await preview.page.click('#mode-extend');
  await preview.page.locator('#video-references').setInputFiles({name:'original-motion.mp4',mimeType:'video/mp4',buffer:motion});
  await preview.page.waitForFunction(()=>document.querySelector('#video-reference-list').children.length===1);
  await preview.page.waitForFunction(()=>document.getElementById('app').classList.contains('pv-video-has-input'));
  assert.equal((await art()).visible,'none','Real Extend clips remove decoration');
  await preview.page.screenshot({path:`test-results/video-approved-extend-${width}-${height}.png`,fullPage:width<821});
  await preview.page.click('#video-create-task');
  await preview.page.click('#mode-text');
  await preview.page.fill('#prompt','One slow camera movement through a concrete station.');
  assert.equal(await preview.page.locator('#generate').isEnabled(),true);
  await preview.page.locator('#generate').scrollIntoViewIfNeeded();
  const button=await preview.page.locator('#generate').boundingBox();
  assert.ok(button.y>=0&&button.y+button.height<=height,'Generate stays reachable in the viewport');
  assert.equal(count(preview,'/api/jobs'),0,'Preparing every mode never submits a job');
  assert.deepEqual(preview.errors,[]);
  ok(`Approved original artwork, real uploads and all modes at ${width}x${height}`);
  await preview.context.close();
 }
 let x=await workspace();await choose(x);
 assert.equal(await x.page.locator('#resolution').inputValue(),'720p');assert.equal(await x.page.locator('#duration').inputValue(),'5');assert.equal(await x.page.locator('#ratio').isVisible(),false);await still(x);await still(x,'last-image');
 await x.page.click('#generate');await x.page.locator('#quote-dialog').waitFor({state:'visible'});assert.equal(count(x,'/api/jobs'),0);assert.match(await x.page.locator('#quote-settings').innerText(),/Seedance 2.5/);
 const quote=x.requests.find(r=>r.path==='/api/quotes').data;assert.equal(quote.settings.engine,'seedance');assert.equal(quote.settings.mode,'start');assert.ok(quote.sourceId);assert.ok(quote.lastSourceId);
 await x.page.click('#confirm-generation');await ready(x.page);assert.equal(x.accepted(),1);assert.equal(count(x,'/api/jobs'),1);assert.equal(await x.page.locator('#pv-video-current-model').count(),1,'Submitting preserves the Current scene inspector fields');ok('Seedance start/end frames, defaults and separate paid confirmation');
 await x.page.locator('.card').first().click();await x.page.click('#video-detail-reuse');await ready(x.page);assert.equal(await x.page.locator('#video-engine').inputValue(),'seedance');assert.match(await x.page.locator('#filemeta').innerText(),/320/);assert.match(await x.page.locator('#last-filemeta').innerText(),/320/);assert.equal(count(x,'/api/jobs'),1);ok('Reuse restores model, first/last images and exact settings without generating');assert.deepEqual(x.errors,[]);await x.context.close();
 x=await workspace();await choose(x,'text');assert.equal(await x.page.locator('#start-mode').isVisible(),false);assert.equal(await x.page.locator('#reference-mode').isVisible(),false);await x.page.selectOption('#ratio','21:9');await x.page.selectOption('#duration','12');await x.page.click('#generate');await x.page.locator('#quote-dialog').waitFor({state:'visible'});assert.equal(count(x,'/api/uploads'),0);assert.equal(x.requests.find(r=>r.path==='/api/quotes').data.sourceId,null);assert.match(await x.page.locator('#quote-settings').innerText(),/Text to Video/);assert.equal(x.accepted(),0);ok('Text-to-video sends no hidden image and supports 21:9 and whole seconds');await x.context.close();
 x=await workspace();await choose(x,'reference');await still(x,'reference-images');
 await x.page.locator('#video-references').setInputFiles({name:'motion.mp4',mimeType:'video/mp4',buffer:motion});await x.page.waitForFunction(()=>document.querySelector('#video-ref-count').textContent.startsWith('1 / 10'));assert.match(await x.page.locator('#video-ref-count').innerText(),/1 \/ 10/);
 await x.page.locator('#audio-references').setInputFiles({name:'score.wav',mimeType:'audio/wav',buffer:sound});await x.page.waitForFunction(()=>document.querySelector('#audio-ref-count').textContent.startsWith('1 / 10'));assert.match(await x.page.locator('#audio-ref-count').innerText(),/1 \/ 10/);
 // Retained media-note handlers are hidden in the approved compact Video deck.
 for(const [selector,value] of [['#video-reference-list input','Camera movement only.'],['#audio-reference-list input','Rhythm.']])
  await x.page.locator(selector).evaluate((input,note)=>{input.value=note;input.dispatchEvent(new Event('input',{bubbles:true}));},value);
 await x.page.click('#save');await ready(x.page);assert.equal(count(x,'/api/jobs'),0);assert.equal(count(x,'/api/reference-uploads'),2);
 await x.page.click('#clear');await x.page.locator('.card[data-state="draft"]').click();await x.page.click('#video-detail-reuse');await ready(x.page);
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
  await x.page.evaluate(()=>window.__labTest.lock());
  await x.page.waitForFunction(()=>document.getElementById('app').dataset.guestPreview==='video');
  assert.equal(await x.page.locator('#history .card').count(),0,'Public preview contains no private History');
  assert.equal(await x.page.locator('#reference-list .reference-item').count(),0);
  assert.equal(await x.page.locator('#video-reference-list').locator('video').count(),0);
  assert.equal(await x.page.locator('#prompt').inputValue(),'');
  assert.equal(await x.page.locator('#image').evaluate(el=>el.files.length),0);
  ok('Sign-out returns to public Video preview and clears private History, input and reference media');await x.context.close();
 }

  const completedVideo={id:id(80),outputId:id(82),sourceId:null,status:'completed',createdAt:Date.now(),
    settings:{type:'video',engine:'seedance',mode:'start',prompt:'A sculptural object slowly turning in natural light.',
      duration:5,resolution:'720p',aspectRatio:'16:9',referenceSourceIds:[]}};
  x=await workspace({initial:[completedVideo]});await x.page.click('#tool-video');
  const savedVideo=x.page.locator('#history .card[data-job="'+completedVideo.id+'"]');
  await savedVideo.waitFor({state:'visible'});
  assert.equal(count(x,'/api/assets/'+completedVideo.outputId,'GET'),0,'Opening Video does not automatically download the MP4');
  assert.equal(await x.page.locator('#video-inspector-selected').isVisible(),false,
    'Opening Video preserves the current creation scene until a History card is selected');
  await savedVideo.click();
  await x.page.waitForFunction(()=>document.querySelector('#video-detail-prompt').textContent.includes('sculptural object'));
  assert.equal(await x.page.locator('#video-inspector').isVisible(),true,'Selected Video metadata inspector stays visible');
  assert.match(await x.page.locator('#video-detail-prompt').innerText(),/sculptural object/i);
  assert.equal(await x.page.locator('#video-detail-model').innerText(),'Seedance 2.5');
  assert.equal(await x.page.locator('#video-detail-watch').isEnabled(),true);
  await x.page.waitForFunction(()=>document.querySelector('#video')?.src.startsWith('blob:')&&!document.querySelector('#video').hidden);
  assert.equal(count(x,'/api/assets/'+completedVideo.outputId,'GET'),1);
  assert.equal(x.accepted(),0);
  await x.page.screenshot({path:'test-results/lab-video-selected-result.png',fullPage:false});
  assert.deepEqual(x.errors,[]);
  ok('Video preserves the create scene, then loads explicit History selection without a paid job');
  await x.context.close();

 // Motion Effects: mock-only integration. Do not confirm or buy a generation.
 const completedStill={id:id(90),outputId:id(91),sourceId:null,status:'completed',createdAt:Date.now(),
   settings:{type:'image',engine:'seedream',mode:'image',prompt:'Fashion editorial photograph.',
     resolution:'2k',aspectRatio:'1:1',referenceSourceIds:[]}};
 x=await workspace({initial:[completedStill]});
 // Effects remains a retained route handler; the approved header hides its legacy tab.
 await x.page.locator('#tool-effects').evaluate(button=>button.click());
 await x.page.locator('#video-effects-grid .video-effect-card').first().waitFor();
 assert.equal(await x.page.locator('#video-effects-grid .video-effect-card').count(),3);
 assert.equal(await x.page.locator('#video-effects-explore').isVisible(),true);
 assert.equal(count(x,'/api/quotes'),0);
 assert.equal(count(x,'/api/jobs'),0);
 await x.page.locator('[data-effect="liquid-metal"]').click();
 assert.equal(await x.page.locator('#video-engine').inputValue(),'seedance');
 assert.equal(await x.page.locator('#duration').inputValue(),'5');
 assert.equal(await x.page.locator('#resolution').inputValue(),'720p');
 assert.equal(await x.page.locator('#audio').isChecked(),false);
 assert.match(await x.page.locator('#prompt').inputValue(),/liquid chrome/i);
 assert.equal(await x.page.locator('#video-effect-active').isVisible(),true);
 assert.equal(count(x,'/api/quotes'),0);
 await x.page.click('#video-effect-from-gallery');
 await x.page.locator('.effect-gallery-choice').first().click();
 await x.page.waitForFunction(()=>document.querySelector('#filemeta').textContent.includes('effect-start-frame'));
 assert.equal(count(x,'/api/jobs'),0);
 await x.page.click('#generate');
 await x.page.locator('#quote-dialog').waitFor({state:'visible'});
 assert.equal(count(x,'/api/quotes'),1);
 assert.equal(count(x,'/api/jobs'),0,'Selecting an effect and reviewing the price never charges the customer');
 assert.deepEqual(x.errors,[]);
 ok('Motion Effects gallery, original Gallery handoff and explicit video price review without paid request');
 await x.context.close();
 console.log('SEEDANCE_STANDARD_BROWSER_CHECKS_PASSED='+passed);
}finally{await browser.close();await new Promise(r=>server.close(r));}
