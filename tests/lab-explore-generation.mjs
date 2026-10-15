// Actual dialog and Studio entry handlers, with mocked account/Worker calls.
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
try{for(const scenario of ['desktop','mobile','small','guest','text','changed','expired','account','blocked','failure','draft']){
 const page=await browser.newPage({viewport:{width:scenario==='small'?320:scenario==='mobile'?390:1440,height:scenario==='small'?640:900}});
 let paid=0,quotes=0,uploads=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(scenario==='expired')await page.addInitScript(()=>window.testExpired=true);
 if(scenario==='account')await page.addInitScript(()=>window.testUser='user_Other');
 if(scenario==='blocked')await page.addInitScript(()=>window.testBlocked=true);
 await page.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());
  if(url.pathname==='/lab/native-account.js')return route.fulfill({contentType:'text/javascript',body:accountSource(scenario==='guest')});
  if(url.hostname==='parallel-vision-lab.parallelvision.workers.dev'){
   const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(url.pathname==='/api/session')return send({customer:scenario!=='desktop',generationReady:true,config:{enabled:true}});
   if(url.pathname==='/api/uploads')return send({id:'20000000-0000-4000-8000-'+String(++uploads).padStart(12,'0')});
   if(url.pathname==='/api/quotes'){quotes++;const data=req.postDataJSON();assert.equal(data.settings.moodId,'hong-kong-nights');assert.equal(data.settings.resolution,'1k');assert.equal(data.settings.aspectRatio,scenario==='text'?'16:9':'3:4','The first customer photo, not four internal mood photos, determines the output ratio');assert.equal(data.referenceSourceIds.length,scenario==='text'?4:5);assert.equal(new Set(data.referenceSourceIds).size,data.referenceSourceIds.length);assert.deepEqual(data.transferSourceIds,data.referenceSourceIds);assert.deepEqual(data.settings.referenceRoles.map(r=>r.role),[...(scenario==='text'?[]:['base']),'style','style','style','style']);return send({id:'quote-'+quotes,provider:'SpicyAPI',settings:data.settings,maxUsd:.22,creditCost:4,expiresAt:Date.now()+180000});}
   if(url.pathname==='/api/jobs'){paid++;assert.deepEqual(req.postDataJSON(),{quoteId:'quote-'+quotes,confirm:true});if(scenario==='failure')return send({error:'Not enough credits.'},402);return send({job:{id:'job-test',status:'queued'}});}
   throw Error('Unexpected API '+url.pathname);
  }
  if(url.hostname!=='127.0.0.1')return route.abort();return route.continue();
 });
 await page.goto(base+'/lab/explore-moods.html');await page.locator('[data-mood-id="hong-kong-nights"]').click();
 const button=page.locator('#mc-look-continue');assert.equal(await button.textContent(),'Generate');assert.equal(await button.isDisabled(),true);assert.equal(paid,0);assert.equal(quotes,0);
 if(scenario==='text')await page.locator('#mc-look-direction').fill('A red car in rain');
 else{const photo=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=480;c.height=640;return c.toDataURL().split(',')[1];}),'base64');await page.locator('#mc-look-file').setInputFiles({name:'source.png',mimeType:'image/png',buffer:photo});}
 if(scenario==='guest'){await page.waitForFunction(()=>document.querySelector('#mc-look-continue').textContent==='Sign in to generate');assert.equal(quotes,0);await button.click();await page.locator('#mock-signin').click();}
 await page.waitForFunction(()=>document.querySelector('#mc-look-continue').textContent.includes(' · '));assert.equal(paid,0);assert.equal(quotes,1);
 if(scenario==='changed'){await page.locator('#mc-look-direction').fill('Sharper flash');assert.equal(await button.isDisabled(),true);await page.waitForFunction(()=>document.querySelector('#mc-look-continue').textContent.includes(' · '));assert.equal(quotes,2);}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#mc-look-dialog').evaluate(el=>el.scrollWidth>el.clientWidth),false);
 if(['desktop','mobile','small'].includes(scenario))await page.screenshot({path:out+'/'+scenario+'.png'});
 if(scenario==='draft'){await page.route('**/lab/mood-creator.html?*',route=>route.fulfill({contentType:'text/html',body:'<p>Creator</p>'}));await page.locator('#mc-look-make').click();await page.waitForURL('**/lab/mood-creator.html?*');assert.equal(paid,0);}
 else{await button.evaluate(el=>{el.click();el.click();});await page.waitForURL('**/lab/studio.html?*');await page.waitForFunction(()=>window.entryFinished);assert.equal(paid,['expired','account','blocked'].includes(scenario)?0:1);assert.equal(new URL(page.url()).searchParams.has('handoff'),false);if(scenario!=='text')assert.equal(await page.evaluate(()=>window.restoredFile),'source.png');if(scenario==='failure')assert.match(await page.locator('#notice').textContent(),/Not enough credits/);const before=paid;await page.reload();await page.waitForFunction(()=>window.entryFinished);assert.equal(paid,before,'refresh never repeats generation');}
 assert.deepEqual(errors,[]);await page.close();console.log('PASS',scenario);
}}finally{await browser.close();server.close();}
