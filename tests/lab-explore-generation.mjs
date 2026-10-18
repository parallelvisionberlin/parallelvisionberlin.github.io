// Explore Moods single confirmed job, inline preview/download and optional Studio handoff, with mocked account/Worker calls.
// No paid request reaches a real provider.
import {pathToFileURL} from 'node:url';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE||resolve('mobile-app/node_modules/@playwright/test/index.mjs')).href);
const root=resolve('.'),out='/tmp/pv-explore-generation';mkdirSync(out,{recursive:true});
const lab=readFileSync('lab/lab.js','utf8');
const entry=lab.slice(lab.indexOf('async function restoreStudioEntry()'),lab.indexOf('let sourceUrl=null'));
const submit=lab.slice(lab.indexOf('async function submitQuotedGeneration('),lab.indexOf("$('generate').onclick="));
const harness=`<!doctype html><div id="notice"></div><input id="prompt"><input id="image-engine"><input id="resolution"><input id="image-count"><input id="ratio"><dialog id="quote-dialog"></dialog><script type="module">
import {takeMoodHandoff as readMoodHandoff,moodGenerationQuote} from './mood-handoff.js';
async function takeMoodHandoff(id){const packet=await readMoodHandoff(id);if(window.testExpired&&packet.generation)packet.generation.quote.expiresAt=Date.now()-1;return packet;}
import {moodById} from './moods.js';
let owner=true,config={enabled:true},customerMode=false,customerGenerationReady=true,userId=window.testUser||'user_Test',epoch=1,busy=false,imageSubmissionPending=false,imageSubmissionStage='',references=[],imageEngine='',imageProcessing='',imageReferenceMode='',tool='image',previewRevision=0,autoPreview=null;
const $=id=>document.getElementById(id),studioRoute=()=>new URLSearchParams(location.search).get('tool')||'image',setTool=t=>tool=t,syncStudioRoute=()=>{},clearMedia=()=>references=[],update=()=>{},notify=s=>$('notice').textContent=s,submissionBlocked=()=>window.testBlocked||false;
const moodUI={restore(value){window.restoredMood=value}},beginImageFeedback=()=>({phase(){},finish(){},fail(e){window.failure=e.message}});
async function addReferences(files,ids){references=files.map((file,i)=>({file,id:ids?.[i],width:480,height:640}));window.restoredFile=files[0]?.name;}
const resetPreview=()=>{},setActive=j=>window.job=j,surfaceHistoryJob=()=>{},refreshHistorySoon=()=>{},money=n=>'$'+n;
const syncDefaultRatio=()=>{$('ratio').value=references[0]?.width===480&&references[0]?.height===640?'3:4':'16:9';};
async function api(path,{body}){const r=await fetch('https://parallel-vision-lab.parallelvision.workers.dev'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error((await r.json()).error);return r.json();}
${entry}\n${submit}\nawait restoreStudioEntry();window.entryFinished=true;</script>`;
const server=http.createServer((req,res)=>{const requestedPath=new URL(req.url,'http://localhost').pathname;const pathname=requestedPath==='/lab/moods'?'/lab/moods.html':requestedPath;if(pathname==='/lab/studio.html'){res.setHeader('Content-Type','text/html');res.end(harness);return;}const path=resolve(root,'.'+pathname);if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'})[extname(path)]||'application/octet-stream');res.end(readFileSync(path));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.PV_CHROMIUM_EXECUTABLE||chromium.executablePath()});
const accountSource=guest=>`const callbacks=[];const account={isSignedIn:${!guest},user:${guest?'null':"{id:'user_Test'}"},session:{id:'sess_Test',getToken:async()=> 'test.'+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+120}))+'.fixture'},addListener(fn){callbacks.push(fn);fn(account);return()=>{}},openSignIn(){const button=document.createElement('button');button.id='mock-signin';button.textContent='Complete sign-in';button.style='position:fixed;inset:30%;z-index:999999;background:white;color:black';button.onclick=()=>{account.isSignedIn=true;account.user={id:'user_Test'};callbacks.forEach(fn=>fn(account));button.remove();};document.body.append(button);}};export async function loadLabAccount(){return account;}`;
try{for(const scenario of ['desktop','mobile','small','guest','text','changed','failure','draft','studio','slowquote','saving','compact','phone','card-oversize','paused','review']){
 const page=await browser.newPage({viewport:{
  width:scenario==='small'?320:['mobile','phone'].includes(scenario)?390:scenario==='compact'?1280:1440,
  height:scenario==='small'?640:scenario==='compact'?720:scenario==='phone'?700:900
 }});
 let paid=0,quotes=0,uploads=0,jobStatusChecks=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());
  if(url.pathname==='/lab/native-account.js')return route.fulfill({contentType:'text/javascript',body:accountSource(scenario==='guest')});
  if(url.hostname==='parallel-vision-lab.parallelvision.workers.dev'){
   const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(url.pathname==='/api/session')return send(scenario==='paused'
     ?{customer:true,generationReady:false,trialGenerationPaused:true,billingReady:true,config:{enabled:false}}
     :scenario==='review'
       ?{customer:true,generationReady:false,promotionReview:true,billingReady:true,config:{enabled:false}}
       :{customer:scenario!=='desktop',generationReady:true,config:{enabled:true}});
   if(url.pathname==='/api/uploads')return send({id:'20000000-0000-4000-8000-'+String(++uploads).padStart(12,'0')});
   if(url.pathname==='/api/quotes'){quotes++;if(scenario==='slowquote')await new Promise(resolve=>setTimeout(resolve,1100));const data=req.postDataJSON();assert.equal(data.settings.moodId,'hong-kong-nights');assert.equal(data.settings.resolution,'1k','Photobooth quotes the fast 1K resolution for web and mobile');assert.equal(data.settings.aspectRatio,scenario==='text'?'16:9':'3:4','The first customer photo, not four internal mood photos, determines the output ratio');assert.equal(data.referenceSourceIds.length,scenario==='text'?4:5);assert.equal(new Set(data.referenceSourceIds).size,data.referenceSourceIds.length);assert.deepEqual(data.transferSourceIds,data.referenceSourceIds);assert.deepEqual(data.settings.referenceRoles.map(r=>r.role),[...(scenario==='text'?[]:['base']),'style','style','style','style']);return send({id:'quote-'+quotes,provider:'SpicyAPI',settings:data.settings,maxUsd:.22,creditCost:4,expiresAt:Date.now()+180000});}
   if(url.pathname==='/api/jobs'&&req.method()==='POST'){
     paid++;assert.deepEqual(req.postDataJSON(),{quoteId:'quote-'+quotes,confirm:true});
     if(scenario==='failure')return send({error:'Not enough credits.'},402);
     return send({job:{id:'job-test',status:'queued'}});
   }
   if(url.pathname==='/api/jobs/job-test/performance'&&req.method()==='POST'){
     assert.ok(req.postDataJSON().clientPreparationMs>=0);
     return send({ok:true});
   }
   if(url.pathname==='/api/jobs/job-test/preview'&&req.method()==='GET'){
     const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRmsAAAAASUVORK5CYII=','base64');
     return route.fulfill({status:200,contentType:'image/png',body:png});
   }
   if(url.pathname==='/api/jobs/job-test'&&req.method()==='GET'){
     if(scenario==='saving'&&++jobStatusChecks===1)return send({job:{id:'job-test',status:'saving'}});
     return send({job:{id:'job-test',status:'completed',outputId:'result-1'}});
   }
   if(url.pathname==='/api/assets/result-1'&&req.method()==='GET'){
     // One-pixel PNG fixture, returned via the same authenticated asset path.
     const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRmsAAAAASUVORK5CYII=','base64');
     return route.fulfill({status:200,contentType:'image/png',body:png});
   }
   throw Error('Unexpected API '+url.pathname);
  }
  if(url.hostname!=='127.0.0.1')return route.abort();return route.continue();
 });
 await page.goto(base+'/lab/explore-moods.html');
 if(scenario==='card-oversize'){
   const card=page.locator('[data-mood-id="hong-kong-nights"]');
   await card.click();
   const baseHeight=await page.locator('#mc-look-dialog').evaluate(el=>el.getBoundingClientRect().height);
   await page.locator('#mc-look-close').click();
   await page.evaluate(()=>{
     const dt=new DataTransfer();
     const file=new File([new Uint8Array(21*1024*1024)],'oversize-card.png',{type:'image/png'});
     dt.items.add(file);
     document.querySelector('[data-mood-id="hong-kong-nights"]').dispatchEvent(
       new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt})
     );
   });
   await page.locator('#mc-look-upload-error').waitFor({state:'visible'});
   assert.match(await page.locator('#mc-look-upload-error-title').textContent(),/Image too large/);
   assert.match(await page.locator('#mc-look-upload-error-detail').textContent(),/21\.0 MB selected\. Maximum 20 MB/);
   const after=await page.locator('#mc-look-dialog').evaluate(el=>el.getBoundingClientRect().height);
   assert.ok(Math.abs(after-baseHeight)<2,'Dropping an oversized photo never resizes a Mood dialog');
   assert.equal(await page.locator('#mc-look-continue').isDisabled(),true);
   assert.equal(paid,0);assert.equal(quotes,0);
   await page.screenshot({path:out+'/oversize-card.png'});
   await page.locator('#mc-look-upload-error-dismiss').click();
   assert.equal(await page.locator('#mc-look-upload-error').isVisible(),false);
   await page.locator('#mc-look-close').click();
   assert.deepEqual(errors,[]);
   await page.close();console.log('PASS',scenario);
   continue;
 }
 await page.locator('[data-mood-id="hong-kong-nights"]').click();
 const editorHeight=await page.locator('#mc-look-dialog').evaluate(el=>el.getBoundingClientRect().height);
 const button=page.locator('#mc-look-continue');assert.equal(await button.textContent(),'Generate');assert.equal(await button.isDisabled(),true);assert.equal(paid,0);assert.equal(quotes,0);
 if(scenario==='text')await page.locator('#mc-look-direction').fill('A red car in rain');
 else{const photo=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=480;c.height=640;return c.toDataURL().split(',')[1];}),'base64');await page.locator('#mc-look-file').setInputFiles({name:'source.png',mimeType:'image/png',buffer:photo});}
 // Uploading and pricing must never keep Generate disabled.
 const uploadedHeight=await page.locator('#mc-look-dialog').evaluate(el=>el.getBoundingClientRect().height);
 assert.ok(Math.abs(uploadedHeight-editorHeight)<2,
   scenario+': selecting a photo cannot resize the expanded Mood card');
 assert.equal(await button.textContent(),'Generate');
 assert.equal(await button.isDisabled(),false,'Generate is available as soon as photo or direction is present');
 assert.equal(paid,0);
 if(scenario==='paused'||scenario==='review'){
   await page.waitForFunction(()=>document.querySelector('#mc-look-dialog').classList.contains('is-generation-blocked'));
   const action=page.locator('#mc-look-access-action');
   assert.equal(await button.isDisabled(),true,'Blocked accounts cannot trigger an unusable Generate action');
   assert.equal(await action.isVisible(),true,'Blocked users see a next step');
   assert.equal(await action.getAttribute('target'),'_blank','Credits open separately, preserving the original uploaded photo');
   assert.match(await action.textContent(),scenario==='paused'?/Add credits/:/Contact support/);
   assert.match(await page.locator('#mc-look-status').textContent(),scenario==='paused'?/Complimentary generations/:/account review/);
   assert.equal(await page.locator('#mc-look-result').isVisible(),false);
   assert.equal(quotes,0,'Blocked customer is rejected before quoting');
   assert.equal(uploads,0,'Blocked customer is rejected before original or style upload');
   assert.equal(paid,0,'Blocked account never submits a paid job');
   await page.screenshot({path:out+'/blocked-'+scenario+'.png'});
   assert.deepEqual(errors,[]);await page.close();console.log('PASS',scenario);
   continue;
 }
 if(scenario==='guest'){
   await page.waitForFunction(()=>document.querySelector('#mc-look-status').textContent.includes('Sign in'));
   assert.equal(quotes,0);await button.click();await page.locator('#mock-signin').click();
 }
 if(scenario!=='slowquote'){
   await page.waitForFunction(()=>document.querySelector('#mc-look-credit-note').hidden===false);
   assert.equal(await button.textContent(),'Generate','The button never displays a credit cost');
   assert.match(await page.locator('#mc-look-credit-note').textContent(),/credits per image/);
   assert.equal(paid,0);assert.equal(quotes,1);
 }
 if(scenario==='desktop'){
   const oversized=Buffer.alloc(21*1024*1024);
   await page.locator('#mc-look-file').setInputFiles({
     name:'too-big.png',mimeType:'image/png',buffer:oversized
   });
   await page.locator('#mc-look-upload-error').waitFor({state:'visible'});
   assert.equal(await page.locator('#mc-look-upload-error-title').textContent(),'Image too large');
   assert.match(await page.locator('#mc-look-upload-error-detail').textContent(),/21\.0 MB selected\. Maximum 20 MB/);
   assert.equal(await button.isDisabled(),true,'Rejected photo temporarily blocks Generate');
   assert.equal(await page.locator('#mc-look-file-preview').count(),1,
     'A previously selected valid photo is not silently deleted');
   assert.ok(Math.abs((await page.locator('#mc-look-dialog').evaluate(el=>el.getBoundingClientRect().height))-editorHeight)<2,
     'The oversize message stays inside the upload area');
   assert.equal(paid,0,'An oversize error never triggers an AI request');
   await page.screenshot({path:out+'/oversize-file-picker.png'});
   await page.locator('#mc-look-upload-error-dismiss').click();
   assert.equal(await page.locator('#mc-look-upload-error').isVisible(),false);
   assert.equal(await button.isDisabled(),false,'Dismissing restores the previous valid photo');
 }
 if(scenario==='changed'){
   await page.locator('#mc-look-direction').fill('Sharper flash');
   assert.equal(await button.isDisabled(),false,'Editing the direction also keeps Generate clickable');
   assert.equal(await button.textContent(),'Generate');
   await page.waitForFunction(()=>document.querySelector('#mc-look-credit-note').hidden===false);
   assert.equal(quotes,2);
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#mc-look-dialog').evaluate(el=>el.scrollWidth>el.clientWidth),false);
 if(['desktop','mobile','small'].includes(scenario))await page.screenshot({path:out+'/'+scenario+'.png'});
 if(scenario==='draft'){
   await page.route('**/lab/mood-creator.html?*',route=>route.fulfill({contentType:'text/html',body:'<p>Creator</p>'}));
   await page.locator('#mc-look-make').click();
   await page.waitForURL('**/lab/mood-creator.html?*');
   assert.equal(paid,0);
 }else{
   await button.evaluate(el=>{el.click();el.click();});
   await page.waitForFunction(()=>document.querySelector('#mc-look-result')?.hidden===false);
   assert.equal(await page.locator('#mc-look-dialog').getAttribute('class'), 'mc-look-dialog is-result-view',
     'Generation should switch to a compact result view, not append underneath the full form');
   assert.equal(await page.locator('#mc-look-dropzone').isVisible(),false);
   assert.equal(await page.locator('.mc-look-prompt').isVisible(),false);
   assert.equal(await page.locator('.mc-look-dialog-actions').isVisible(),false);
   assert.equal(await page.locator('#mc-look-result-wait-note').isVisible(),false,
     'Long-wait guidance must not appear immediately on Generate');
   if(['desktop','mobile','small','compact','phone'].includes(scenario)){
     const layout=await page.evaluate(()=>{
       const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();
         return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,width:r.width};};
       return {
         viewport:{width:innerWidth,height:innerHeight},
         dialog:rect('#mc-look-dialog'),
         media:rect('.mc-look-dialog-media'),
         artwork:rect('#mc-look-preview'),
         frame:rect('#mc-look-result-frame'),
         output:rect('.mc-look-dialog-body')
       };
     });
     assert.ok(layout.dialog.bottom<=layout.viewport.height+2&&layout.dialog.top>=-2,
       'Entire modal stays within visible screen '+JSON.stringify(layout));
     if(layout.viewport.width>600){
       assert.ok(Math.abs(layout.media.bottom-layout.dialog.bottom)<3,
         'Mood artwork fills modal height with no dead strip '+JSON.stringify(layout));
       assert.ok(layout.frame.bottom<=layout.dialog.bottom+2,
         'Result loading/preview is not clipped beneath modal '+JSON.stringify(layout));
     }
     await page.screenshot({path:out+'/generating-'+scenario+'.png'});
   }
   if(scenario==='slowquote'){
     const stage=await page.locator('#mc-look-result-frame').boundingBox();
     const exposure=await page.locator('#mc-look-result-loading').boundingBox();
     assert.ok(stage&&exposure&&Math.abs(stage.width-exposure.width)<3&&Math.abs(stage.height-exposure.height)<3,
       'The exposure fills the complete result frame, not a narrow center strip');
     assert.equal(await page.locator('.mc-look-exposure-cloud').isVisible(),true);
     assert.equal(await page.locator('.mc-look-exposure-story').isVisible(),true);
     assert.equal(await page.locator('.mc-look-exposure-plate').count(),0);
     await page.waitForFunction(()=>document.querySelector('#mc-look-result').classList.contains('is-visible'));
     await page.waitForTimeout(250);
     await page.screenshot({path:out+'/living-light-desktop.png'});
     assert.equal(await button.textContent(),'Preparing…','First click starts preparation immediately');
     assert.equal(await button.isDisabled(),true,'Repeated clicks are blocked after the first click');
     assert.equal(paid,0,'No paid request starts before the server quote');
   }
   assert.equal(new URL(page.url()).pathname,'/lab/moods','Generating keeps the modal on Explore Moods');
   if(scenario==='saving'){
     await page.waitForFunction(()=>document.querySelector('#mc-look-result-loading').classList.contains('is-finishing'));
     assert.equal(await page.locator('#mc-look-result-progress').textContent(),'Saving your photograph…');
     assert.equal(await page.locator('.mc-look-story-finish').textContent(),'ALMOST READY');
     await page.waitForTimeout(780);
     await page.screenshot({path:out+'/living-light-almost-ready.png'});
     assert.equal(paid,1,'Finalizing state never submits another generation');
   }
   if(scenario==='failure'){
     await page.waitForFunction(()=>document.querySelector('#mc-look-result-progress').textContent.includes('Not enough credits.'));
     assert.equal(paid,1,'One confirmed attempt, no automatic retry');
     assert.equal(await page.locator('#mc-look-result-actions').isVisible(),false);
     assert.equal(await page.locator('#mc-look-result-wait-note').isVisible(),false,
       'A failed submission never displays a misleading continue-waiting hint');
     assert.equal(await page.locator('#mc-look-result-loading').getAttribute('class'),'mc-look-result-loading is-stopped',
       'A failed submission must not keep animating as if it were running');
   }else{
     await page.locator('#mc-look-result-image').waitFor({state:'visible'});
     await page.locator('#mc-look-result-actions').waitFor({state:'visible'});
     assert.equal(paid,1,'One explicit click submits exactly one paid job');
     assert.equal(await page.locator('#mc-look-result-actions').isVisible(),true);
     assert.equal(await page.locator('#mc-look-result-wait-note').isVisible(),false,
       'A completed job never keeps the long-wait hint visible');
     assert.equal(await page.locator('#mc-look-result-again').isVisible(),true);
     const downloadEvent=page.waitForEvent('download');
     await page.locator('#mc-look-result-download').click();
     const saved=await downloadEvent;
     assert.match(saved.suggestedFilename(),/^pvlab-hong-kong-nights-result-1\.png$/);
     if(scenario==='studio'){
       await page.locator('#mc-look-result-studio').click();
       await page.waitForURL('**/lab/studio.html?*');
       await page.waitForFunction(()=>window.entryFinished);
       assert.equal(new URL(page.url()).searchParams.has('handoff'),false);
       assert.equal(await page.evaluate(()=>window.restoredFile),'pvlab-hong-kong-nights.png');
       assert.equal(paid,1,'Opening Studio never repeats a job');
     }else{
       if(scenario==='desktop'){
         await page.locator('#mc-look-result-again').click();
         assert.equal(await page.locator('#mc-look-result').isVisible(),false,
           'Make another returns to the editor with no extra paid job');
         assert.equal(await page.locator('#mc-look-dropzone').isVisible(),true);
         assert.equal(await page.locator('#mc-look-dialog').getAttribute('class'),'mc-look-dialog');
         assert.equal(paid,1,'Make another must not submit a new job automatically');
         const remove=page.locator('#mc-look-file-clear');
         assert.equal(await remove.isVisible(),true);
         assert.equal(await remove.getAttribute('aria-label'),'Remove selected photo');
         assert.equal(await remove.getAttribute('title'),'Remove photo');
         assert.equal(await remove.locator('svg').count(),1,
           'The photo has a clear icon control, not a tiny text link');
         await remove.click();
         assert.equal(await page.locator('#mc-look-file-preview').count(),0);
         assert.equal(await button.isDisabled(),true);
         assert.ok(Math.abs((await page.locator('#mc-look-dialog').evaluate(el=>el.getBoundingClientRect().height))-editorHeight)<2,
           'Removing the photo leaves the card dimensions untouched');
         assert.equal(paid,1,'Remove photo does not start another paid generation');
       }
       await page.locator('#mc-look-close').click();
       assert.equal(await page.locator('#mc-look-dialog').isVisible(),false);
     }
   }
 }
 assert.deepEqual(errors,[]);await page.close();console.log('PASS',scenario);
}}finally{await browser.close();server.close();}
