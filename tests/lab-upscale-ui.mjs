async function imageAdvanced(page){await page.click('#tool-image');const options=page.locator('#image-composer-more');if(await options.isVisible()){const open=await page.locator('#app').evaluate(el=>el.classList.contains('image-settings-open'));if(!open)await options.click();}}
// Isolated browser tests with synthetic media and a fully mocked API. No paid tasks.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync, existsSync, mkdirSync} from 'node:fs';
import {resolve, extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf("try{clerk=await loadLabAccount();");
const bootEnd=source.indexOf("\n// Soul composer:",boot);
assert.ok(boot>0&&bootEnd>boot,'Preserve the current image composer after replacing only Clerk bootstrap');
const testSource=source.slice(0,boot)+source.slice(bootEnd)+
  `clerk={session:{getToken:async()=> 'synthetic-token'},signOut:async()=>{}};owner=true;userId='test';config={enabled:true,falEnabled:true,concurrency:{image:4,video:1}};$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();update();window.__labTest={lock,settled:()=>!busy&&!imageSubmissionPending&&!fastImageHandoff.active()};`;
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const path=resolve('.','.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!path.startsWith(resolve('.')+'/')||!existsSync(path)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[extname(path)]||'text/plain');res.end(pathname==='/lab/lab.js'?testSource:readFileSync(path));});
await new Promise(r=>server.listen(4178,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const ORIGIN='http://127.0.0.1:4178',API='https://parallel-vision-lab.parallelvision.workers.dev';
const sourceId='10000000-0000-4000-8000-000000000001',outputId='10000000-0000-4000-8000-000000000002';
let png,passed=0;
const ok=name=>{passed++;console.log('PASS '+name);};
async function workspace(jobs=[],width=1440,{quoteTtlMs=180000,quoteMaxUsd=.012,quoteDelayMs=0,quoteTransform=null}={}){
 const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true});const page=await context.newPage();let accepted=true;const requests=[],uploads=[],quotes=new Map();let count=3,quoteCount=88,lastQuoteResponse=Promise.resolve();
 page.on('dialog',async d=>{if(accepted)await d.accept();else await d.dismiss();});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('https://**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(!url.href.startsWith(API)){await route.abort();return;}
  const path=url.pathname,method=req.method();let data={};
  if(req.headers()['content-type']?.startsWith('application/json'))data=req.postDataJSON();
  requests.push({path,method,data});let body,finishQuote;
  if(path==='/api/jobs'&&method==='GET')body={jobs,activeJobs:jobs.filter(j=>['submitting','queued','running','saving','uncertain'].includes(j.status)),concurrency:{image:4,video:1},next:null};
  else if(path==='/api/packs')body={packs:[]};
  else if(path.endsWith('/resolve')&&method==='POST'){const id=path.split('/')[3],job=jobs.find(j=>j.id===id);assert.ok(job);assert.equal(data.confirm,true);job.status='resolved';body={ok:true};}
  else if(path==='/api/uploads'){const id='10000000-0000-4000-8000-'+String(count++).padStart(12,'0');uploads.push({id,type:req.headers()['content-type'],bytes:req.postDataBuffer()?.length,name:decodeURIComponent(req.headers()['x-filename']||'')});body={id};}
  else if(path==='/api/quotes'){
   lastQuoteResponse=new Promise(resolve=>{finishQuote=resolve;});
   if(quoteDelayMs)await new Promise(r=>setTimeout(r,quoteDelayMs));
   const isFalUpscale=data.settings.mode==='upscale'&&['seedvr2','topaz-precision','topaz-wonder'].includes(data.settings.upscaleEngine),wonder=data.settings.upscaleEngine==='topaz-wonder',estimate=data.settings.upscaleEngine==='seedvr2'?(Number(data.settings.scale)===4?.002:.001):.08,scale=Number(data.settings.scale)||2;
   body={id:'10000000-0000-4000-8000-'+String(quoteCount++).padStart(12,'0'),provider:isFalUpscale?'fal.ai':'SpicyAPI',estimatedUsd:isFalUpscale?estimate:.012,maxUsd:isFalUpscale?estimate:quoteMaxUsd,expiresAt:Date.now()+quoteTtlMs,creditCost:data.settings.upscaleEngine==='seedvr2'?(scale===4?18:10):null,...(isFalUpscale?{priceIsEstimate:true,requiresPriceReview:true}:{}),settings:{...data.settings,model:isFalUpscale?(data.settings.upscaleEngine==='seedvr2'?'fal-ai/seedvr/upscale/image':'topaz/upscale/image/'+(wonder?'generative':'precision')):data.settings.mode==='upscale'?'spicyapi/image-upscaler-v1/upscale':'bytedance/seedream-5.0-pro/edit',...(isFalUpscale?{provider:'fal',engine:'upscale',sourceWidth:320,sourceHeight:320,targetWidth:320*scale,targetHeight:320*scale}:{}),referenceSourceIds:data.referenceSourceIds||[],transferNotes:[]}};
   if(quoteTransform)body=quoteTransform(body);
   quotes.set(body.id,{...body,sourceId:data.sourceId});
  }
  else if(/^\/api\/jobs\/[^/]+\/reconcile$/.test(path)&&method==='POST'){const id=path.split('/')[3],original=jobs.find(j=>j.id===id);const reconciled={...original,status:'queued',providerTaskId:'synthetic-existing-fal-request'};jobs=jobs.map(j=>j.id===id?reconciled:j);body={job:reconciled,matched:true,message:'Found the existing FAL request. No generation submitted.'};}
  else if(path==='/api/jobs'&&method==='POST'){const quote=quotes.get(data.quoteId);body={job:{id:'10000000-0000-4000-8000-000000000099',status:'queued',settings:quote?.settings||{type:'image',mode:'upscale'},sourceId:quote?.sourceId||sourceId,createdAt:Date.now()}};}
  else if(path.startsWith('/api/assets/')){await route.fulfill({status:200,contentType:'image/png',body:png});return;}
  else {await route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'Unmocked request '+path})});return;}
  try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});}finally{finishQuote?.();}
 });
 await page.goto(ORIGIN+'/lab/studio.html?tool=image');await page.waitForFunction(()=>!!window.__labTest);
 if(!png)png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=320;const x=c.getContext('2d');x.fillStyle='#353b40';x.fillRect(0,0,320,320);x.fillStyle='#aaa49a';x.fillRect(70,70,180,180);return c.toDataURL('image/png').split(',')[1];}),'base64');
 return {page,context,requests,uploads,errors,historyJobs:()=>structuredClone(jobs),decline:()=>{accepted=false;},waitForQuoteResponse:()=>lastQuoteResponse};
}
const countPaid=x=>x.requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST').length;
const quoteRequests=x=>x.requests.filter(r=>r.path==='/api/quotes');
const uploadSmall=async page=>{await page.locator('#image').setInputFiles({name:'test-scene.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>!document.querySelector('#generate').disabled);};
const openUpscaleOptions=async page=>{if(!await page.locator('#upscale-info').evaluate(el=>el.open))await page.locator('#upscale-info summary').click();};
const clickUpscaleCheck=async page=>{await openUpscaleOptions(page);await page.click('#upscale-check-price');};
const checkFalPrice=async x=>{await clickUpscaleCheck(x.page);await x.page.waitForFunction(()=>document.querySelector('#upscale-price-status').textContent.startsWith('Estimated charge:')&&!document.querySelector('#generate').disabled);return quoteRequests(x).at(-1).data;};
const assertInvalidated=async x=>{assert.equal(await x.page.locator('#generate').isDisabled(),false);assert.doesNotMatch(await x.page.locator('#upscale-price-status').innerText(),/^Estimated charge:/);assert.equal(countPaid(x),0);};

try{
 let x=await workspace();await x.page.click('#tool-upscale');
 assert.equal(await x.page.locator('#upscale-model-control').isVisible(),false);
 assert.deepEqual(await x.page.locator('#upscale-engine option').evaluateAll(options=>options.map(x=>x.value)),['seedvr2']);
 assert.equal(await x.page.locator('#upscale-scale').isVisible(),true);
 assert.equal(await x.page.locator('#resolution-control').isVisible(),false);
 assert.equal(await x.page.locator('#upscale-scale').inputValue(),'2');
 assert.equal(await x.page.locator('#settings-summary').isVisible(),false);
 await openUpscaleOptions(x.page);
 assert.match(await x.page.locator('#upscale-model-name').innerText(),/SeedVR2.*ByteDance/);
 assert.match(await x.page.locator('#upscale-published-price').innerText(),/0\.001 per output megapixel/);
 assert.equal(await x.page.locator('#upscale-content-label').innerText(),'FAL content restrictions');
 assert.equal(await x.page.locator('#empty-title').innerText(),'Upscaler');
 assert.equal(await x.page.locator('#upscale-model-display').isVisible(),true);
 assert.match(await x.page.locator('#upscale-model-display').innerText(),/ByteDance.*Premium.*SeedVR2/s);
 assert.equal(await x.page.locator('#upscale-model-display').getAttribute('open'),null);
 await x.page.locator('#upscale-model-trigger').click();
 assert.equal(await x.page.locator('#upscale-model-display').getAttribute('open'),'');
 assert.equal(await x.page.locator('#upscale-model-popup').isVisible(),true);
 assert.equal(await x.page.locator('#upscale-model-current-option').count(),1);
 assert.match(await x.page.locator('#upscale-model-current-option').innerText(),/ByteDance Premium.*SeedVR2/s);
 assert.equal(await x.page.locator('#upscale-model-current-option').getAttribute('aria-pressed'),'true');
 assert.equal(countPaid(x),0);assert.equal(quoteRequests(x).length,0);
 await x.page.locator('#upscale-model-current-option').click();
 assert.equal(await x.page.locator('#upscale-model-display').getAttribute('open'),null);
 await x.page.locator('#upscale-model-trigger').focus();
 await x.page.keyboard.press('Enter');
 assert.equal(await x.page.locator('#upscale-model-display').getAttribute('open'),'');
 await x.page.keyboard.press('Escape');
 assert.equal(await x.page.locator('#upscale-model-display').getAttribute('open'),null);
 await x.page.locator('#upscale-model-trigger').click();
 await x.page.locator('#empty-title').click();
 assert.equal(await x.page.locator('#upscale-model-display').getAttribute('open'),null);
 assert.equal(countPaid(x),0);assert.equal(quoteRequests(x).length,0);
 assert.equal(await x.page.locator('.upscale-empty-kicker').innerText(),'IMAGE ENHANCEMENT');
 assert.match(await x.page.locator('.upscale-drop-hint').innerText(),/PNG, JPG OR WEBP/);
 await x.page.locator('#upscale-info summary').click();
 await uploadSmall(x.page);
 assert.equal(await x.page.locator('#upscale-model-display').isVisible(),true);
 assert.equal(await x.page.locator('#empty-title').isVisible(),false);
 assert.equal(countPaid(x),0);
 await x.page.click('#generate:visible, #image-composer-generate:visible');
 await x.page.waitForFunction(()=>window.__labTest.settled());
 assert.equal(quoteRequests(x).length,1);
 assert.equal(quoteRequests(x)[0].data.settings.upscaleEngine,'seedvr2');
 assert.equal(quoteRequests(x)[0].data.settings.scale,2);
 assert.equal(quoteRequests(x)[0].data.settings.topazModel,undefined);
 assert.equal(countPaid(x),1);
 assert.deepEqual(x.requests.find(r=>r.path==='/api/jobs'&&r.method==='POST').data,{quoteId:'10000000-0000-4000-8000-000000000088',confirm:true});
 assert.match(await x.page.locator('#notice').innerText(),/Upscale requested/);
 assert.equal(await x.page.locator('#notice').evaluate(el=>el.parentElement.id),'upscale-notice-slot');
 assert.deepEqual(x.errors,[]);ok('Premium 2x Upscale submits one checked quote without a second provider option');
 await imageAdvanced(x.page);assert.equal(await x.page.locator('#notice').evaluate(el=>el.nextElementSibling?.id),'archive-rest-anchor');
 await x.page.click('#tool-video');assert.equal(await x.page.locator('#last-upload').isVisible(),true);
 assert.deepEqual(x.errors,[]);ok('Image and Video still work after Upscale');await x.context.close();
 if(process.env.PV_UPSCALE_NOTICE_SMOKE!=='1'){
  x=await workspace();await x.page.click('#tool-upscale');await uploadSmall(x.page);
  await clickUpscaleCheck(x.page);
  await x.page.waitForFunction(()=>document.querySelector('#upscale-price-status').textContent.startsWith('Estimated charge:'));
  assert.match(await x.page.locator('#upscale-price-status').innerText(),/\$0\.001 USD/);
  assert.equal(countPaid(x),0);assert.equal(quoteRequests(x).length,1);
  await x.page.locator('#upscale-scale').selectOption('4');
  assert.equal(countPaid(x),0);
  await checkFalPrice(x);assert.equal(quoteRequests(x).length,2);assert.equal(quoteRequests(x)[1].data.settings.scale,4);
  assert.match(await x.page.locator('#upscale-price-status').innerText(),/1280\s*×\s*1280/);
  await x.page.locator('#output-format').selectOption('jpeg');assert.equal(countPaid(x),0);
  await checkFalPrice(x);assert.equal(quoteRequests(x).length,3);assert.equal(quoteRequests(x)[2].data.settings.outputFormat,'jpeg');
  await x.page.click('#generate:visible, #image-composer-generate:visible');
  await x.page.waitForFunction(()=>window.__labTest.settled());
  assert.equal(quoteRequests(x).length,3);assert.equal(countPaid(x),1);assert.deepEqual(x.errors,[]);
  ok('4x/format changes invalidate estimates without repeat billing');await x.context.close();
  const oldJob={id:'10000000-0000-4000-8000-000000000010',status:'completed',sourceId,outputId,settings:{type:'image',mode:'upscale',upscaleEngine:'spicy',resolution:'8k',aspectRatio:'auto',outputFormat:'png',prompt:'',referenceSourceIds:[]},createdAt:Date.now(),settledUsd:.012};
  x=await workspace([oldJob]);const card=x.page.locator('.card');assert.match(await card.locator('.cardmeta').innerText(),/UPSCALE/);
  await card.click();await x.page.locator('#image-lightbox').waitFor({state:'visible'});
  const dl=x.page.waitForEvent('download');await x.page.locator('#image-lightbox-download').click();assert.match((await dl).suggestedFilename(),new RegExp(outputId));
  await x.page.locator('#image-detail-reuse').click();await x.page.waitForFunction(()=>document.querySelector('#tool-upscale').getAttribute('aria-pressed')==='true');
  assert.equal(await x.page.locator('#upscale-engine').inputValue(),'seedvr2');
  assert.equal(await x.page.locator('#upscale-scale').inputValue(),'2');assert.equal(countPaid(x),0);
  ok('Archived economical Upscale stays available but reuse switches to Premium');await x.context.close();
  for(const width of [390,1728]){
   x=await workspace([oldJob],width);await x.page.click('#tool-upscale');
   assert.ok(await x.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'No horizontal overflow');
   mkdirSync('test-results',{recursive:true});await x.page.screenshot({path:'test-results/lab-upscale-'+width+'.png',fullPage:true});
   assert.deepEqual(x.errors,[]);ok('Premium workdeck responsive at '+width+'px');await x.context.close();
  }
 }
 console.log('BROWSER_CHECKS_PASSED='+passed);
}finally{await browser.close();await new Promise(r=>server.close(r));}
