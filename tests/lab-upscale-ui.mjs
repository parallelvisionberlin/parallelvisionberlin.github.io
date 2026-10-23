async function imageAdvanced(page){await page.click('#tool-image');const options=page.locator('#image-composer-more');if(await options.isVisible()){const open=await page.locator('#app').evaluate(el=>el.classList.contains('image-settings-open'));if(!open)await options.click();}}
// Isolated browser tests with synthetic media and a fully mocked API. No paid tasks.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync, existsSync, mkdirSync} from 'node:fs';
import {resolve, extname, sep} from 'node:path';
import {falUpscaleParameters,setFalUpscaleDimensions,falUpscaleEstimateMicros,buildFalUpscaleInput} from '../lab-worker/fal-upscale.mjs';
import {creditsForJobMicros} from '../lab-worker/job-pricing.mjs';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf("try{clerk=await loadLabAccount();");
const bootEnd=source.indexOf("\n// Soul composer:",boot);
assert.ok(boot>0&&bootEnd>boot,'Preserve the current image composer after replacing only Clerk bootstrap');
const testSource=source.slice(0,boot)+source.slice(bootEnd)+
  `clerk={session:{getToken:async()=> 'synthetic-token'},signOut:async()=>{}};owner=true;customerMode=new URLSearchParams(location.search).has('customer');ownerAccount=!customerMode;customerGenerationReady=true;customerBillingReady=true;customerCreditBalance=1000;userId='test';if(customerMode)wallet.connect({customer:true,balanceCredits:1000,billingReady:true});config={enabled:true,falEnabled:true,concurrency:{image:4,video:1}};$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();update();window.__labTest={lock,settled:()=>!busy&&!imageSubmissionPending&&!fastImageHandoff.active()};`;
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const path=resolve('.','.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!path.startsWith(resolve('.')+sep)||!existsSync(path)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2'})[extname(path)]||'text/plain');res.end(pathname==='/lab/lab.js'?testSource:readFileSync(path));});
await new Promise(r=>server.listen(4178,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const ORIGIN='http://127.0.0.1:4178',API='https://parallel-vision-lab.parallelvision.workers.dev';
const sourceId='10000000-0000-4000-8000-000000000001',outputId='10000000-0000-4000-8000-000000000002';
let png,passed=0;
const ok=name=>{passed++;console.log('PASS '+name);};
async function workspace(jobs=[],width=1440,{quoteTtlMs=180000,quoteDelayMs=0,quoteTransform=null,customer=false,submitMode='ok'}={}){
 const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<781,isMobile:width<781,acceptDownloads:true});const page=await context.newPage();const requests=[],uploads=[],quotes=new Map(),quoteResponses=[];let count=3,quoteCount=88;
 page.on('dialog',async d=>{await d.accept();});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('https://**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(!url.href.startsWith(API)){await route.abort();return;}
  const path=url.pathname,method=req.method();let data={};
  if(req.headers()['content-type']?.startsWith('application/json'))data=req.postDataJSON();
  requests.push({path,method,data});let body;
  if(path==='/api/jobs'&&method==='GET')body={jobs,activeJobs:jobs.filter(j=>['submitting','queued','running','saving','uncertain'].includes(j.status)),concurrency:{image:4,video:1},next:null};
  else if(path==='/api/packs')body={packs:[]};
  else if(path==='/api/customer/wallet'&&method==='GET')body={balanceCredits:1000,billingReady:true,products:[]};
  else if(path.endsWith('/resolve')&&method==='POST'){const id=path.split('/')[3],job=jobs.find(j=>j.id===id);assert.ok(job);assert.equal(data.confirm,true);job.status='resolved';body={ok:true};}
  else if(path==='/api/uploads'){const id='10000000-0000-4000-8000-'+String(count++).padStart(12,'0');uploads.push({id,type:req.headers()['content-type'],bytes:req.postDataBuffer()?.length,name:decodeURIComponent(req.headers()['x-filename']||'')});body={id};}
  else if(path==='/api/quotes'){
   if(quoteDelayMs)await new Promise(r=>setTimeout(r,quoteDelayMs));
   const parameters=falUpscaleParameters(data.settings,{fail:(status,message)=>{throw Error(message);}});
   setFalUpscaleDimensions(parameters,{width:320,height:320},{fail:(status,message)=>{throw Error(message);}});
   const micros=falUpscaleEstimateMicros(parameters);
   body={id:'10000000-0000-4000-8000-'+String(quoteCount++).padStart(12,'0'),provider:'fal.ai',estimatedUsd:micros/1000000,maxUsd:micros/1000000,expiresAt:Date.now()+quoteTtlMs,creditCost:creditsForJobMicros(micros,parameters),priceIsEstimate:true,requiresPriceReview:true,settings:parameters};
   if(quoteTransform)body=quoteTransform(body);
   quotes.set(body.id,{...body,sourceId:data.sourceId});quoteResponses.push(structuredClone(body));
  }
  else if(/^\/api\/jobs\/[^/]+\/reconcile$/.test(path)&&method==='POST'){const id=path.split('/')[3],original=jobs.find(j=>j.id===id);const reconciled={...original,status:'queued',providerTaskId:'synthetic-existing-fal-request'};jobs=jobs.map(j=>j.id===id?reconciled:j);body={job:reconciled,matched:true,message:'Found the existing FAL request. No generation submitted.'};}
  else if(path==='/api/jobs'&&method==='POST'){
   const quote=quotes.get(data.quoteId);assert.ok(quote,'Submission must use a quote returned to this context');assert.deepEqual(data,{quoteId:quote.id,confirm:true});
   assert.ok(quote.expiresAt>Date.now(),'No expired quote may be submitted');
   if(submitMode==='network'){await route.abort();return;}
   if(submitMode==='rejected'){await route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({error:'Synthetic provider rejected this photograph'})});return;}
   body={job:{id:'10000000-0000-4000-8000-'+String(90+requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST').length).padStart(12,'0'),status:submitMode==='failed'?'failed':'queued',error:submitMode==='failed'?'Synthetic provider rejected this photograph':undefined,settings:quote.settings,sourceId:quote.sourceId,createdAt:Date.now()}};
  }
  else if(path.startsWith('/api/assets/')){await route.fulfill({status:200,contentType:'image/png',body:png});return;}
  else {await route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'Unmocked request '+path})});return;}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto(ORIGIN+'/lab/studio.html?tool=image'+(customer?'&customer=1':''));await page.waitForFunction(()=>!!window.__labTest);
 if(!png)png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=320;const x=c.getContext('2d');x.fillStyle='#353b40';x.fillRect(0,0,320,320);x.fillStyle='#aaa49a';x.fillRect(70,70,180,180);return c.toDataURL('image/png').split(',')[1];}),'base64');
 return {page,context,requests,uploads,quotes:quoteResponses,errors,historyJobs:()=>structuredClone(jobs)};
}
const countPaid=x=>x.requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST').length;
const quoteRequests=x=>x.requests.filter(r=>r.path==='/api/quotes');
const uploadSmall=async page=>{
 const chooser=page.waitForEvent('filechooser');
 await page.getByRole('button',{name:'Upload an image to upscale',exact:true}).click();
 await (await chooser).setFiles({name:'test-scene.png',mimeType:'image/png',buffer:png});
 await page.waitForFunction(()=>!document.querySelector('#generate').disabled);
 assert.equal(await page.locator('#preview').isVisible(),true);
 assert.match(await page.locator('#filemeta').innerText(),/320 × 320/);
};
const selectModel=async(page,name)=>{
 await page.getByRole('button',{name:/Choose upscale model/}).click();
 const option=page.getByRole('menuitemradio',{name});
 assert.equal(await option.isVisible(),true,'Model is selected through the approved visible popup');
 const engine=await option.getAttribute('data-upscale-engine');
 const quality=await option.getAttribute('data-upscale-quality');
 await option.click();
 assert.equal(await page.locator(quality?'[data-upscale-quality="'+quality+'"]':'[data-upscale-engine="'+engine+'"]').getAttribute('aria-checked'),'true');
 assert.equal(await page.locator('#upscale-model-menu').isVisible(),false);
 assert.equal(await page.locator('#upscale-price-status').isVisible(),false,'Model and quality selection stay quiet');
 assert.equal(await page.locator('#upscale-price-status').textContent(),'','No replacement diagnostic after selection');
};
const selectQuality=async(page,quality,{touch=false}={})=>{
 await page.getByRole('button',{name:/Choose upscale model/}).click();
 const choice=page.locator('[data-upscale-quality="'+quality+'"]');
 assert.equal(await choice.isVisible(),true);
 if(touch)await choice.tap();else await choice.click();
 assert.equal(await page.locator('#upscale-model-menu').isVisible(),false);
 assert.equal(await page.locator('#upscale-price-status').isVisible(),false,'Model and quality selection stay quiet');
 assert.equal(await page.locator('#upscale-price-status').textContent(),'','No replacement diagnostic after selection');
 assert.equal(await page.locator('#upscale-engine').inputValue(),'topaz-precision');
 assert.equal(await page.locator('#upscale-topaz-model').inputValue(),quality);
 assert.equal(await page.locator('#upscale-model-id').innerText(),quality);
 assert.equal(await page.locator('#upscale-model-trigger').getAttribute('aria-label'),'Choose upscale model, currently Topaz Precision '+quality);
 assert.equal(await page.locator('#upscale-model-menu [aria-checked="true"]').count(),1,'Exactly one concrete option is selected');
 for(const q of ['Standard V2','High Fidelity V3'])assert.equal(await page.locator('[data-upscale-quality="'+q+'"]').getAttribute('aria-checked'),String(q===quality));
};
const workspaceGeometry=page=>page.evaluate(()=>{
 const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};};
 return ['#app>.workspace','#app>.workspace>.controls','#upscale-canvas','#upscale-model-trigger','#upscale-scale','#output-format','#generate'].map(rect);
});
const upscale=async x=>{
 const before=countPaid(x),quotesBefore=quoteRequests(x).length;
 await x.page.getByRole('button',{name:'Upscale',exact:true}).click();
 await x.page.waitForFunction(()=>window.__labTest.settled());
 assert.equal(quoteRequests(x).length,quotesBefore+1,'One visible action obtains one bound quote');
 assert.equal(countPaid(x),before+1,'One visible action submits once');
 assert.deepEqual(x.requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST').at(-1).data,{quoteId:x.quotes.at(-1).id,confirm:true});
 assert.equal(await x.page.locator('#quote-dialog').evaluate(el=>el.open),false,'Upscale retains its existing click-to-submit workflow');
 return x.quotes.at(-1);
};
const assertQuoted=(q,{engine,model,quality,scale=2,format='png',credits})=>{
 assert.equal(q.provider,'fal.ai');assert.equal(q.priceIsEstimate,true);assert.equal(q.requiresPriceReview,true);
 assert.equal(q.settings.upscaleEngine,engine);assert.equal(q.settings.model,model);assert.equal(q.settings.topazModel,quality);
 assert.equal(q.settings.scale,scale);assert.equal(q.settings.outputFormat,format);
 assert.equal(q.settings.sourceWidth,320);assert.equal(q.settings.sourceHeight,320);
 assert.equal(q.settings.targetWidth,320*scale);assert.equal(q.settings.targetHeight,320*scale);
 assert.equal(q.creditCost,credits);assert.equal(q.maxUsd,q.estimatedUsd);
 if(engine==='seedvr2')assert.deepEqual(buildFalUpscaleInput(q.settings),{upscale_mode:'factor',upscale_factor:scale,noise_scale:0.1,output_format:format==='jpeg'?'jpg':'png'});
 else assert.deepEqual(buildFalUpscaleInput(q.settings),{model:quality,upscale_factor:scale,output_format:format,crop_to_fill:false,face_enhancement:false});
};
const openHistory=async(x,id)=>{
 await x.page.locator('.card[data-job="'+id+'"]').click();
 await x.page.locator('#image-lightbox').waitFor({state:'visible'});
};
const seedModel={engine:'seedvr2',model:'fal-ai/seedvr/upscale/image',credits:10};
const precisionModel={engine:'topaz-precision',model:'topaz/upscale/image/precision',quality:'Standard V2',credits:37};
const wonderModel={engine:'topaz-wonder',model:'topaz/upscale/image/generative',quality:'Wonder 3.5',credits:37};

try{
 let x=await workspace();await x.page.click('#tool-upscale');
 assert.equal(await x.page.locator('#upscale-model-control').isVisible(),false);
 assert.deepEqual(await x.page.locator('#upscale-engine option').evaluateAll(options=>options.map(x=>x.value)),['seedvr2','topaz-precision','topaz-wonder']);
 assert.equal(await x.page.locator('#upscale-scale').isVisible(),true);
 assert.equal(await x.page.locator('#resolution-control').isVisible(),false);
 assert.equal(await x.page.locator('#upscale-scale').inputValue(),'2');
 assert.equal(await x.page.locator('#settings-summary').isVisible(),false);
 assert.equal(await x.page.locator('#upscale-info summary').isVisible(),false,'Do not restore More options');
 assert.match(await x.page.locator('#upscale-model-name').textContent(),/SeedVR2.*ByteDance/);
 assert.match(await x.page.locator('#upscale-published-price').textContent(),/0\.001 per output megapixel/);
 assert.equal(await x.page.locator('#upscale-content-label').textContent(),'FAL content restrictions');
 assert.equal(await x.page.locator('#empty-title').textContent(),'Upscaler');
 assert.equal(await x.page.locator('#upscale-model-display').isVisible(),true);
 assert.match(await x.page.locator('#upscale-model-display').innerText(),/ByteDance Premium.*SeedVR2/s);
 await x.page.locator('#upscale-model-trigger').click();
 assert.equal(await x.page.locator('#upscale-model-menu').isVisible(),true);
 assert.equal(await x.page.locator('#upscale-model-trigger').getAttribute('aria-expanded'),'true');
 assert.deepEqual(await x.page.locator('[data-upscale-engine]').evaluateAll(items=>items.map(x=>x.dataset.upscaleEngine)),['seedvr2','topaz-wonder']);
 assert.equal(await x.page.getByRole('menuitemradio').count(),4,'Four concrete options without a parent or nested menu');
 await x.page.getByRole('menuitemradio',{name:/Topaz Standard V2/}).click();
 assert.equal(await x.page.locator('#upscale-model-menu').isVisible(),false);
 assert.equal(await x.page.locator('#upscale-engine').inputValue(),'topaz-precision');
 assert.equal(await x.page.locator('#upscale-topaz-model').inputValue(),'Standard V2','Fresh Precision keeps the existing default');
 await selectModel(x.page,/Topaz Wonder 3.5/);
 assert.equal(await x.page.locator('#upscale-engine').inputValue(),'topaz-wonder');
 assert.equal(await x.page.locator('#upscale-topaz-control').isVisible(),false);
 assert.match(await x.page.locator('#upscale-model-trigger').innerText(),/Topaz Wonder.*3.5/s);
 await selectModel(x.page,/ByteDance Premium/);
 assert.equal(await x.page.locator('#upscale-engine').inputValue(),'seedvr2');
 assert.equal(countPaid(x),0);assert.equal(quoteRequests(x).length,0);
 assert.equal(await x.page.locator('.upscale-empty-kicker').textContent(),'IMAGE ENHANCEMENT');
 assert.match(await x.page.locator('.upscale-drop-hint').textContent(),/PNG, JPG OR WEBP/);
 await uploadSmall(x.page);
 assert.equal(await x.page.locator('#upscale-model-display').isVisible(),true);
 assert.equal(await x.page.locator('#empty-title').isVisible(),false);
 assert.equal(countPaid(x),0);assert.equal(quoteRequests(x).length,0);
 assertQuoted(await upscale(x),seedModel);
 assert.equal(quoteRequests(x)[0].data.settings.topazModel,undefined);
 assert.equal(x.uploads.length,1);assert.equal(x.uploads[0].type,'image/png');assert.equal(x.uploads[0].bytes,png.length);
 assert.match(await x.page.locator('#notice').textContent(),/Upscale requested/);
 assert.equal(await x.page.locator('#notice').evaluate(el=>el.parentElement.id),'upscale-notice-slot');
 assert.equal(await x.page.locator('#upscale-notice-slot').isVisible(),false,'Routine messages remain visually quiet');
 assert.deepEqual(x.errors,[]);ok('Premium 2x Upscale submits one checked quote through the visible action');
 await imageAdvanced(x.page);assert.equal(await x.page.locator('#notice').evaluate(el=>el.nextElementSibling?.id),'archive-rest-anchor');
 await x.page.click('#tool-video');assert.equal(await x.page.locator('#last-upload').isVisible(),true);
 assert.deepEqual(x.errors,[]);ok('Image and Video still work after Upscale');await x.context.close();
 if(process.env.PV_UPSCALE_NOTICE_SMOKE!=='1'){
  x=await workspace();await x.page.click('#tool-upscale');await uploadSmall(x.page);
  let q=await upscale(x);assertQuoted(q,seedModel);assert.equal(q.estimatedUsd,.001);
  await x.page.locator('#upscale-scale').selectOption('4');
  assert.equal(countPaid(x),1);assert.equal(quoteRequests(x).length,1,'Changing size alone makes no quote or paid request');
  q=await upscale(x);assertQuoted(q,{...seedModel,scale:4,credits:18});assert.equal(q.estimatedUsd,.002);
  await x.page.locator('#output-format').selectOption('jpeg');
  assert.equal(countPaid(x),2);assert.equal(quoteRequests(x).length,2,'Changing format alone never submits');
  q=await upscale(x);assertQuoted(q,{...seedModel,scale:4,format:'jpeg',credits:18});
  assert.equal(new Set(x.quotes.map(q=>q.id)).size,3);assert.equal(x.uploads.length,1);assert.deepEqual(x.errors,[]);
  ok('4x and format changes obtain fresh bound estimates only on the next explicit action');await x.context.close();

  x=await workspace();await x.page.click('#tool-upscale');await uploadSmall(x.page);
  for(const [name,expected] of [[/ByteDance Premium/,seedModel],[/Topaz Standard V2/,precisionModel],[/Topaz Wonder 3.5/,wonderModel]]){
   const paid=countPaid(x),quotes=quoteRequests(x).length;
   await selectModel(x.page,name);
   assert.equal(await x.page.locator('#preview').isVisible(),true,'Model selection preserves the photo');
   assert.equal(countPaid(x),paid);assert.equal(quoteRequests(x).length,quotes,'Selecting a model has no paid side effect');
   assert.doesNotMatch(await x.page.locator('#upscale-price-status').textContent(),/^Estimated charge:/);
   assertQuoted(await upscale(x),expected);
  }
  assert.equal(x.uploads.length,1);assert.deepEqual(x.errors,[]);
  ok('All three visible models bind their actual endpoint, quality, output and credit amount');await x.context.close();

  const oldJob={id:'10000000-0000-4000-8000-000000000010',status:'completed',sourceId,outputId,settings:{type:'image',mode:'upscale',upscaleEngine:'spicy',resolution:'8k',aspectRatio:'auto',outputFormat:'png',prompt:'',referenceSourceIds:[]},createdAt:Date.now(),settledUsd:.012};
  x=await workspace([oldJob]);assert.match(await x.page.locator('.card .cardmeta').innerText(),/UPSCALE/);
  await openHistory(x,oldJob.id);
  const dl=x.page.waitForEvent('download');await x.page.locator('#image-lightbox-download').click();assert.match((await dl).suggestedFilename(),new RegExp(outputId));
  await x.page.locator('#image-detail-reuse').click();await x.page.waitForFunction(()=>document.querySelector('#tool-upscale').getAttribute('aria-pressed')==='true');
  assert.equal(await x.page.locator('#upscale-engine').inputValue(),'seedvr2');
  assert.equal(await x.page.locator('#upscale-scale').inputValue(),'2');assert.equal(countPaid(x),0);assert.equal(quoteRequests(x).length,0);
  ok('Archived economical Upscale downloads and Reuse switches to Premium without charge');await x.context.close();

  for(const width of [1440,390])for(const customer of [false,true])for(const quality of ['Standard V2','High Fidelity V3']){
   const oldTopaz={...oldJob,id:'10000000-0000-4000-8000-000000000012',settings:{type:'image',provider:'fal',engine:'upscale',mode:'upscale',upscaleEngine:'topaz-precision',model:'topaz/upscale/image/precision',scale:4,topazModel:quality,outputFormat:'png'}};
   x=await workspace([oldTopaz],width,{customer});await openHistory(x,oldTopaz.id);await x.page.locator('#image-detail-reuse').click();
   await x.page.waitForFunction(()=>document.querySelector('#upscale-engine').value==='topaz-precision');
   assert.equal(await x.page.locator('#upscale-topaz-model').inputValue(),quality);
   assert.match(await x.page.locator('#upscale-model-trigger').innerText(),new RegExp(quality));
   assert.equal(await x.page.locator('#upscale-scale').inputValue(),'4');assert.equal(countPaid(x),0);assert.equal(quoteRequests(x).length,0);
   assert.equal(await x.page.locator('[data-upscale-quality="'+quality+'"]').getAttribute('aria-checked'),'true','History synchronizes the visible menu quality');
   assertQuoted(await upscale(x),{...precisionModel,quality,scale:4});
   await selectModel(x.page,/ByteDance Premium/);await selectModel(x.page,/Topaz Standard V2/);
   assert.equal(await x.page.locator('#upscale-topaz-model').inputValue(),'Standard V2','Newly selecting Precision returns to its approved default');
   assert.equal(countPaid(x),1);assert.equal(quoteRequests(x).length,1,'Engine reselection makes no additional quote or submission');
   assert.equal(x.uploads.length,0,'History reuses the original source');assert.deepEqual(x.historyJobs(),[oldTopaz]);assert.deepEqual(x.errors,[]);
   ok('History restores and submits '+quality+' at '+width+'px for '+(customer?'Customer':'Owner')+'; new engine selection defaults to Standard V2');await x.context.close();
  }

  for(const customer of [false,true]){
   for(const [name,expected] of [[/ByteDance Premium/,seedModel],[/Topaz Standard V2/,precisionModel],[/Topaz Wonder 3.5/,wonderModel]]){
    x=await workspace([],1440,{customer});await x.page.click('#tool-upscale');await uploadSmall(x.page);await selectModel(x.page,name);
    assertQuoted(await upscale(x),expected);assert.deepEqual(x.errors,[]);await x.context.close();
   }
   ok((customer?'Customer':'Owner')+' uses server-bound credits for all three engines, without changing retail prices');
  }

  for(const [name,options,engine,quality] of [
   ['wrong endpoint',{quoteTransform:q=>({...q,settings:{...q.settings,model:'unrelated/model'}})},null],
   ['wrong Precision quality',{quoteTransform:q=>({...q,settings:{...q.settings,topazModel:'High Fidelity V3'}})},/Topaz Standard V2/],
   ['wrong High Fidelity quality',{quoteTransform:q=>({...q,settings:{...q.settings,topazModel:'Standard V2'}})},/Topaz Standard V2/,'High Fidelity V3'],
   ['wrong output format',{quoteTransform:q=>({...q,settings:{...q.settings,outputFormat:'jpeg'}})},null],
   ['expired quote',{quoteTtlMs:-1},null],
   ['missing review flag',{quoteTransform:q=>({...q,requiresPriceReview:false})},null],
   ['invalid customer credits',{customer:true,quoteTransform:q=>({...q,creditCost:0})},null]
  ]){
   x=await workspace([],1440,options);await x.page.click('#tool-upscale');await uploadSmall(x.page);if(engine)await selectModel(x.page,engine);if(quality)await selectQuality(x.page,quality);
   await x.page.getByRole('button',{name:'Upscale',exact:true}).click();await x.page.waitForFunction(()=>window.__labTest.settled());
   assert.equal(quoteRequests(x).length,1);assert.equal(countPaid(x),0);assert.match(await x.page.locator('#notice').textContent(),/No usable upscale quote/);
   assert.equal(await x.page.locator('#notice').isVisible(),true,'Quote failures remain visible in the approved workspace');
   assert.deepEqual(x.errors,[]);ok('Rejects '+name+' without a paid submission or automatic retry');await x.context.close();
  }

  for(const submitMode of ['rejected','network','failed']){
   x=await workspace([],1440,{submitMode});await x.page.click('#tool-upscale');await uploadSmall(x.page);
   await upscale(x);assert.equal(countPaid(x),1);assert.equal(quoteRequests(x).length,1);
   assert.match(await x.page.locator('#notice').textContent(),submitMode==='network'?/network|fetch|connection|request|History/i:/rejected/);
   assert.equal(await x.page.locator('#notice').evaluate(el=>el.classList.contains('error')),true);
   assert.equal(await x.page.locator('#notice').isVisible(),true,'Submission failures are visible to the user');
   assert.deepEqual(x.errors,[]);ok('Submission '+submitMode+' reports failure without retrying or quoting again');await x.context.close();
  }

  x=await workspace([],1440,{quoteDelayMs:180});await x.page.click('#tool-upscale');await uploadSmall(x.page);
  await x.page.getByRole('button',{name:'Upscale',exact:true}).dblclick();await x.page.waitForFunction(()=>window.__labTest.settled());
  assert.equal(quoteRequests(x).length,1);assert.equal(countPaid(x),1);assert.deepEqual(x.errors,[]);
  ok('Rapid repeated visible action cannot double-submit');await x.context.close();

  x=await workspace();await x.page.click('#tool-upscale');
  const chooser=x.page.waitForEvent('filechooser');await x.page.getByRole('button',{name:'Upload an image to upscale',exact:true}).click();
  await (await chooser).setFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('This is not image data')});
  await x.page.waitForFunction(()=>document.querySelector('#notice').classList.contains('error'));
  assert.equal(await x.page.getByRole('button',{name:'Upscale',exact:true}).isDisabled(),true);
  assert.equal(await x.page.locator('#notice').isVisible(),true,'Invalid input receives a visible error');
  assert.equal(x.uploads.length,0);assert.equal(quoteRequests(x).length,0);assert.equal(countPaid(x),0);assert.deepEqual(x.errors,[]);
  ok('Invalid upload is rejected through the visible chooser before quotes or paid requests');await x.context.close();

  for(const width of [390,1728]){
   x=await workspace([oldJob],width);await x.page.click('#tool-upscale');
   assert.ok(await x.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'No horizontal overflow');
   mkdirSync('test-results',{recursive:true});await x.page.screenshot({path:'test-results/upscaler-functional-'+width+'.png',fullPage:true});
   await selectModel(x.page,/Topaz Standard V2/);assert.equal(await x.page.locator('#upscale-model-display').isVisible(),true);
   await selectQuality(x.page,'High Fidelity V3',{touch:width===390});
   await x.page.locator('#upscale-model-trigger').click();
   await x.page.screenshot({path:'test-results/upscaler-precision-empty-'+width+'.png',fullPage:true});
   assert.equal(countPaid(x),0);assert.equal(quoteRequests(x).length,0);
   assert.deepEqual(x.errors,[]);ok('Approved responsive workdeck and real model popup at '+width+'px');await x.context.close();
  }

  // Both qualities are actual visible actions for fresh accounts, not hidden-select manipulation.
  for(const width of [1440,390])for(const customer of [false,true]){
   x=await workspace([],width,{customer});await x.page.click('#tool-upscale');await uploadSmall(x.page);
   assert.equal(await x.page.locator('#upscale-engine').inputValue(),'seedvr2','ByteDance remains the fresh default');
   await selectModel(x.page,/Topaz Standard V2/);
   assert.equal(await x.page.locator('#upscale-topaz-model').inputValue(),'Standard V2');
   for(const quality of ['High Fidelity V3','Standard V2']){
    const beforePaid=countPaid(x),beforeQuotes=quoteRequests(x).length,geometry=await workspaceGeometry(x.page);
    await selectQuality(x.page,quality,{touch:width===390});
    assert.equal(countPaid(x),beforePaid);assert.equal(quoteRequests(x).length,beforeQuotes,'Quality selection alone cannot upload, quote or submit');
    assert.deepEqual(await workspaceGeometry(x.page),geometry,'Quality choices preserve the approved page, photo and control dimensions');
    assert.equal(await x.page.locator('#upscale-info').isVisible(),false,'No More options or extra panel');
    assertQuoted(await upscale(x),{...precisionModel,quality});
    assert.equal(x.quotes.at(-1).estimatedUsd,.08,'Both modes retain the existing authoritative estimate for this source size');
    assert.equal(quoteRequests(x).at(-1).data.settings.topazModel,quality);
   }
   assert.equal(new Set(x.quotes.map(q=>q.id)).size,2,'Each changed quality obtains its own bound quote');assert.equal(x.uploads.length,1);
   for(const name of [/Topaz Wonder 3.5/,/ByteDance Premium/,/Topaz Standard V2/])await selectModel(x.page,name);
   assert.equal(await x.page.locator('#upscale-topaz-model').inputValue(),'Standard V2');
   assert.equal(countPaid(x),2);assert.equal(quoteRequests(x).length,2,'All three engines remain accessible on each role/viewport without selection side effects');
   await x.page.getByRole('button',{name:/Choose upscale model/}).click();
   assert.equal(await x.page.getByRole('menuitemradio').count(),4);
   assert.ok(await x.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Open quality popup has no mobile overflow');
   const menu=await x.page.locator('#upscale-model-menu').boundingBox();
   const last=await x.page.locator('[data-upscale-engine="topaz-wonder"]').boundingBox();
   assert.ok(last.y+last.height<=menu.y+menu.height,'Wonder stays fully inside the popup below both qualities');
   for(const quality of ['Standard V2','High Fidelity V3'])assert.ok((await x.page.locator('[data-upscale-quality="'+quality+'"]').boundingBox()).height>=44,'Quality touch targets remain at least 44px');
   await x.page.screenshot({path:'test-results/upscaler-precision-access-'+width+'-'+(customer?'customer':'owner')+'.png',fullPage:true});
   assert.deepEqual(x.errors,[]);ok((customer?'Customer':'Owner')+' selects and submits both fresh qualities with bound credits and unchanged geometry at '+width+'px');await x.context.close();
  }

  x=await workspace();await x.page.click('#tool-upscale');
  const trigger=x.page.locator('#upscale-model-trigger');
  await trigger.focus();await trigger.press('ArrowDown');
  const focused=()=>x.page.evaluate(()=>document.activeElement.dataset.upscaleQuality||document.activeElement.dataset.upscaleEngine||document.activeElement.id);
  assert.equal(await focused(),'seedvr2');
  await x.page.keyboard.press('ArrowDown');assert.equal(await focused(),'Standard V2');
  await x.page.keyboard.press('ArrowDown');assert.equal(await focused(),'High Fidelity V3');
  await x.page.keyboard.press('Enter');
  assert.equal(await x.page.locator('#upscale-model-id').innerText(),'High Fidelity V3');assert.equal(await focused(),'upscale-model-trigger');
  await trigger.press('ArrowUp');assert.equal(await focused(),'High Fidelity V3','Reopening focuses the saved selection');
  await x.page.keyboard.press('Home');assert.equal(await focused(),'seedvr2');
  await x.page.keyboard.press('ArrowUp');assert.equal(await focused(),'topaz-wonder','Arrow navigation wraps');
  await x.page.keyboard.press('End');assert.equal(await focused(),'topaz-wonder');
  await x.page.keyboard.press('ArrowUp');await x.page.keyboard.press('ArrowUp');assert.equal(await focused(),'Standard V2');
  await x.page.keyboard.press('Space');assert.equal(await x.page.locator('#upscale-model-id').innerText(),'Standard V2');
  await trigger.press('ArrowDown');await x.page.keyboard.press('Escape');
  assert.equal(await focused(),'upscale-model-trigger');assert.equal(await trigger.getAttribute('aria-expanded'),'false');
  await trigger.press('ArrowDown');await x.page.keyboard.press('Tab');
  assert.equal(await x.page.locator('#upscale-model-menu').isVisible(),false);assert.notEqual(await focused(),'upscale-model-trigger','Tab continues to the next control');
  await trigger.click();await x.page.locator('.pv-upscale-workspace-intro h2').click();assert.equal(await x.page.locator('#upscale-model-menu').isVisible(),false);
  assert.equal(x.uploads.length,0);assert.equal(countPaid(x),0);assert.equal(quoteRequests(x).length,0);assert.deepEqual(x.errors,[]);
  ok('Keyboard selects both qualities, preserves focus, wraps, escapes and exits without API side effects');await x.context.close();
 }
 console.log('BROWSER_CHECKS_PASSED='+passed);
}finally{await browser.close();await new Promise(r=>server.close(r));}

