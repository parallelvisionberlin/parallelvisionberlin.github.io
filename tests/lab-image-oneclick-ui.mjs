// Mock-only browser verification. No real credentials, private media or paid generations.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf("try{const {Clerk}=await import(");assert.ok(boot>0);
const testSource=source.slice(0,boot)+`clerk={isSignedIn:true,user:{id:'test'},session:{id:'synthetic-session',getToken:async()=> 'synthetic-token'},signOut:async()=>{}};owner=true;userId='test';config={enabled:true,geminiEnabled:true,falEnabled:true,dailyLimitUsd:10,concurrency:{image:4,video:1}};$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();await loadSoulProIdentity();update();window.__labTest={lock};`;
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const path=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'text/plain');res.end(pathname==='/lab/lab.js'?testSource:readFileSync(path));});
await new Promise(r=>server.listen(4179,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const ORIGIN='http://127.0.0.1:4179',API='https://parallel-vision-lab.parallelvision.workers.dev';
let passed=0,png;const ok=name=>{passed++;console.log('PASS '+name);};
const id=n=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
const settings={type:'image',mode:'image',prompt:'A ceramic sculpture in soft daylight.',resolution:'2k',aspectRatio:'16:9',outputFormat:'png',referenceRoles:[],referenceSourceIds:[]};
async function workspace({failure='',width=1440,initial=[],quoteDelay=0}={}){
 const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true}),page=await context.newPage();
 const requests=[],errors=[],dialogs=[],jobs=[...initial],quotes=new Map();let sequence=100,accepted=0,renewed=false;
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
 await context.route('https://**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(!url.href.startsWith(API)){await route.abort();return;}
  const path=url.pathname,method=req.method(),data=req.headers()['content-type']?.startsWith('application/json')?req.postDataJSON():{};
  requests.push({path,method,data});
  const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/api/jobs'&&method==='GET')return send({jobs,activeJobs:jobs.filter(j=>['queued','running','saving','uncertain','submitting'].includes(j.status)),concurrency:{image:4,video:1},next:null});
  if(path==='/api/packs')return send({packs:[]});
  if(path==='/api/soul-pro/identity'&&method==='GET')return send({configured:true,count:2,refs:[{id:id(950),name:'nina-front.png'},{id:id(951),name:'nina-three-quarter.png'}]});
  if(path==='/api/soul-pro/identity'&&method==='POST')return send({configured:true,count:(data.referenceSourceIds||[]).length||1,refs:[]},201);
  if(path==='/api/soul-pro/identity'&&method==='DELETE')return send({configured:false,count:0,refs:[]});
  if(path==='/api/uploads')return send({id:id(sequence++)},201);
  if(path.startsWith('/api/assets/'))return route.fulfill({status:200,contentType:'image/png',body:png});
  if(path==='/api/drafts'){const job={id:id(sequence++),sourceId:data.sourceId,settings:{...data.settings,referenceSourceIds:data.referenceSourceIds||[]},status:'draft',createdAt:Date.now()};jobs.unshift(job);return send({job},201);}
  if(path==='/api/fal/pose-preview'&&method==='POST')return send({assetId:id(sequence++),billingNote:'synthetic preview'},201);
  if(path==='/api/fal/soul-pro'&&method==='POST'){
    const job={id:id(sequence++),sourceId:data.sourceId,settings:{...data.settings,referenceSourceIds:data.referenceSourceIds||[]},status:'queued',createdAt:Date.now(),estimatedUsd:data.settings.soulProModel==='kontextmax'?0.08:0.22,providerTaskId:'fal-soulpro-synthetic'};
    accepted++;jobs.unshift(job);return send({job},202);
  }
  if(path==='/api/fal/controlled-pose'&&method==='POST'){
    const job={id:id(sequence++),sourceId:data.referenceSourceIds?.[0]||null,settings:{...data.settings,referenceSourceIds:data.referenceSourceIds||[],poseMapSourceId:data.poseMapSourceId||null},status:'queued',createdAt:Date.now(),estimatedUsd:0.075,providerTaskId:'fal-synthetic'};
    accepted++;jobs.unshift(job);return send({job},202);
  }
  if(path==='/api/fal/repair'&&method==='POST'){
    const job={id:id(sequence++),sourceId:data.sourceId,settings:{...data.settings,referenceSourceIds:data.referenceSourceIds||[]},status:'queued',createdAt:Date.now(),estimatedUsd:0.075,providerTaskId:'fal-repair-synthetic'};
    accepted++;jobs.unshift(job);return send({job},202);
  }
  if(path==='/api/quotes'){
   if(quoteDelay)await new Promise(r=>setTimeout(r,quoteDelay));
   if(failure==='quote')return send({error:'Provider quote unavailable. No generation submitted.'},502);
   const q={id:id(sequence++),estimatedUsd:0.036,maxUsd:0.036,expiresAt:Date.now()+(failure==='expired'?-1:180000),settings:{...data.settings,mode:failure==='wrong-model'?(data.settings.mode==='upscale'?'image':'upscale'):data.settings.mode,referenceSourceIds:data.referenceSourceIds||[],transferNotes:[]}};
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
async function imageForm(x){await x.page.click('#tool-image');await x.page.fill('#prompt',settings.prompt);await x.page.selectOption('#resolution','2k');await x.page.selectOption('#ratio','16:9');await x.page.selectOption('#output-format','png');}
try{
 let x=await workspace();await imageForm(x);assert.equal(await x.page.locator('#generate').innerText(),'Generate');assert.match(await x.page.locator('#generation-help').innerText(),/one paid image/);
 await x.page.click('#generate');await ready(x.page);assert.equal(x.accepted(),1);assert.equal(count(x,'/api/quotes'),1);assert.equal(count(x,'/api/jobs'),1);assert.equal(await x.page.locator('#quote-dialog').isVisible(),false);assert.deepEqual(x.dialogs,[]);
 const q=x.requests.find(r=>r.path==='/api/quotes').data;assert.equal(q.settings.prompt,settings.prompt);assert.equal(q.settings.resolution,'2k');assert.equal(q.settings.aspectRatio,'16:9');assert.equal(q.settings.outputFormat,'png');ok('Text-to-image: one click, one quote, one submission, no review modal');
 await x.page.click('#save');await ready(x.page);assert.equal(x.accepted(),1);const draft=x.page.locator('.card[data-state="draft"]');await draft.getByRole('button',{name:'Reuse',exact:true}).click();await ready(x.page);assert.equal(await x.page.locator('#prompt').inputValue(),settings.prompt);assert.equal(x.accepted(),1);ok('Saving and reusing a draft do not generate or charge');assert.deepEqual(x.errors,[]);await x.context.close();
 x=await workspace();await imageForm(x);await x.page.locator('#reference-images').setInputFiles({name:'sculpture.png',mimeType:'image/png',buffer:png});await ready(x.page);await x.page.click('#generate');await ready(x.page);const edit=x.requests.find(r=>r.path==='/api/quotes').data;assert.equal(edit.referenceSourceIds.length,1);assert.equal(edit.transferSourceIds.length,1);assert.equal(x.accepted(),1);assert.equal(await x.page.locator('#quote-dialog').isVisible(),false);ok('Reference edit submits once without review and preserves reference inputs');await x.context.close();
 x=await workspace({quoteDelay:300});await imageForm(x);await x.page.evaluate(()=>{document.querySelector('#generate').click();document.querySelector('#generate').click();});await ready(x.page);assert.equal(x.accepted(),1);assert.equal(count(x,'/api/quotes'),1);ok('Rapid repeated clicks cannot double-submit');await x.context.close();
 for(const failure of ['quote','expired','wrong-model','budget','server','network']){
  x=await workspace({failure});await imageForm(x);await x.page.click('#generate');await ready(x.page);await x.page.waitForTimeout(150);assert.equal(x.accepted(),0);assert.equal(count(x,'/api/quotes'),1);assert.equal(count(x,'/api/jobs'),['quote','expired','wrong-model'].includes(failure)?0:1);assert.equal(await x.page.locator('#quote-dialog').isVisible(),false);assert.ok((await x.page.locator('#notice').innerText()).length>0);ok(failure+': stops without another paid attempt');await x.context.close();
 }
 x=await workspace({failure:'auth'});await imageForm(x);await x.page.click('#generate');await ready(x.page);const submissions=x.requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST');assert.equal(submissions.length,2);assert.deepEqual(submissions[0].data,submissions[1].data);assert.equal(x.accepted(),1);ok('Authentication-only renewal retains the quote ID and creates one job');await x.context.close();
 const active=n=>({id:id(n),status:'running',settings,createdAt:Date.now()});
 for(const initial of [[active(1),active(2),active(3),active(4)],[{...active(5),status:'uncertain'}]]){
  x=await workspace({initial});await imageForm(x);assert.equal(await x.page.locator('#generate').isDisabled(),true);assert.equal(count(x,'/api/jobs'),0);ok('Existing capacity/uncertain-job gate still blocks Image');await x.context.close();
 }
 const saving=n=>({...active(n),status:'saving',providerTaskId:'settled-'+n,error:'Archive retry pending'});
 x=await workspace({initial:[saving(10),saving(11),saving(12),saving(13)]});await imageForm(x);
 assert.equal(await x.page.locator('#generate').isDisabled(),false);
 assert.match(await x.page.locator('#active-status').innerText(),/4 saving \(no generation slot\)/);
 await x.page.click('#generate');await ready(x.page);assert.equal(x.accepted(),1);
 ok('Archive-only saves stay visible but do not consume Image generation slots');await x.context.close();

 const geminiInterrupted={...active(20),status:'uncertain',settings:{...settings,provider:'gemini',engine:'gemini',model:'gemini-3-pro-image',processing:'normal'}};
 x=await workspace({initial:[geminiInterrupted]});await imageForm(x);
 assert.equal(await x.page.locator('#generate').isDisabled(),false);
 assert.match(await x.page.locator('#active-status').innerText(),/Nano 0 \/ 4/);assert.match(await x.page.locator('#active-status').innerText(),/1 old Nano interrupted/);
 ok('Interrupted Gemini request is labeled as old and does not look like an active Nano generation');await x.context.close();
 x=await workspace();await x.page.click('#tool-image');await x.page.selectOption('#image-engine','soulpro');await ready(x.page);
 assert.equal(await x.page.locator('#reference-mode').isVisible(),false);assert.match(await x.page.locator('#soul-pro-identity-status').innerText(),/Saved Nina identity.*2 references/);
 assert.equal(await x.page.locator('#generate').isDisabled(),true);
 await x.page.locator('#image').setInputFiles({name:'base.png',mimeType:'image/png',buffer:png});await ready(x.page);
 assert.equal(await x.page.locator('#generate').isDisabled(),false);assert.equal(await x.page.locator('#generate').innerText(),'Generate identity edit');
 assert.equal(await x.page.locator('#soul-pro-settings').isVisible(),true);assert.equal(await x.page.locator('#resolution-control').isVisible(),false);assert.equal(await x.page.locator('#ratio-control').isVisible(),false);
 assert.match(await x.page.locator('#generation-help').innerText(),/one base image only/i);assert.match(await x.page.locator('#generation-help').innerText(),/\$0\.22/);
 await x.page.click('#generate');await ready(x.page);assert.equal(count(x,'/api/fal/soul-pro'),1);assert.equal(x.accepted(),1);
 const soulPro=x.requests.find(r=>r.path==='/api/fal/soul-pro').data;assert.ok(soulPro.sourceId);assert.deepEqual(soulPro.referenceSourceIds,[]);assert.equal(soulPro.settings.engine,'soulpro');assert.equal(soulPro.settings.soulProModel,'ideogram45');assert.equal(soulPro.settings.sourceWidth,320);assert.equal(soulPro.settings.sourceHeight,320);assert.equal(soulPro.settings.prompt,'');
 ok('PV Soul Pro reuses persistent Nina identity and submits with one base image only');await x.context.close();

 x=await workspace();await x.page.click('#tool-image');await x.page.selectOption('#image-engine','soulpro');await x.page.selectOption('#soul-pro-model','kontextmax');await ready(x.page);
 assert.match(await x.page.locator('#generation-help').innerText(),/\$0\.08/);assert.match(await x.page.locator('#soul-pro-note').innerText(),/more generative/i);ok('PV Soul Pro exposes Kontext Max only as an explicit alternate engine');await x.context.close();

  x=await workspace();await x.page.click('#tool-image');await x.page.selectOption('#image-engine','fal');await x.page.fill('#prompt','Editorial portrait in a warm room.');
 await x.page.locator('#reference-images').setInputFiles([
  {name:'pose.png',mimeType:'image/png',buffer:png},
  {name:'identity.png',mimeType:'image/png',buffer:png}
 ]);await ready(x.page);
 const roles=x.page.locator('.reference-fields select');await roles.nth(0).selectOption('pose');await roles.nth(1).selectOption('identity');await ready(x.page);
 assert.equal(await x.page.locator('#generate').isDisabled(),false);assert.equal(await x.page.locator('#generate').innerText(),'Generate controlled pose');
 await x.page.click('#preview-pose');await ready(x.page);assert.equal(count(x,'/api/fal/pose-preview'),1);assert.match(await x.page.locator('#pose-preview-status').innerText(),/Pose ready/);
 await x.page.click('#generate');await ready(x.page);assert.equal(count(x,'/api/fal/controlled-pose'),1);assert.equal(count(x,'/api/gemini/jobs'),0);assert.equal(count(x,'/api/quotes'),0);assert.equal(x.accepted(),1);
 ok('Controlled Pose keeps FAL isolated from Seedream and Nano and reuses the preview pose map');await x.context.close();

 for(const tool of ['video']){
  x=await workspace();await x.page.click('#tool-'+tool);await x.page.locator('#image').setInputFiles({name:'sculpture.png',mimeType:'image/png',buffer:png});await ready(x.page);if(tool==='video')await x.page.fill('#prompt','The camera slowly moves around the sculpture.');
  assert.match(await x.page.locator('#generate').innerText(),/^Review price/);await x.page.click('#generate');await x.page.locator('#quote-dialog').waitFor({state:'visible'});assert.equal(x.accepted(),0);assert.equal(count(x,'/api/jobs'),0);await x.page.click('#confirm-generation');await ready(x.page);assert.equal(x.accepted(),1);ok(tool+': separate price confirmation remains required');await x.context.close();
 }

 // Image upscaling is one paid job per click, independent of the Image batch selector.
 const upscaleForm=async x=>{await x.page.click('#tool-upscale');await x.page.locator('#image').setInputFiles({name:'sculpture.png',mimeType:'image/png',buffer:png});await ready(x.page);};
 x=await workspace();await imageForm(x);await x.page.selectOption('#image-count','4');await upscaleForm(x);
 assert.equal(await x.page.locator('#generate').innerText(),'Upscale');assert.match(await x.page.locator('#generation-help').innerText(),/one paid upscaling job/);
 await x.page.click('#generate');await ready(x.page);assert.equal(x.accepted(),1);assert.equal(count(x,'/api/quotes'),1);assert.equal(count(x,'/api/jobs'),1);assert.equal(await x.page.locator('#quote-dialog').isVisible(),false);assert.deepEqual(x.dialogs,[]);ok('Upscale ignores Image batch count and creates one job without review');await x.context.close();
 x=await workspace({quoteDelay:300});await upscaleForm(x);await x.page.evaluate(()=>{document.querySelector('#generate').click();document.querySelector('#generate').click();});await ready(x.page);assert.equal(x.accepted(),1);assert.equal(count(x,'/api/quotes'),1);ok('Rapid repeated Upscale clicks cannot double-submit');await x.context.close();
 for(const failure of ['quote','expired','wrong-model','budget','server','network']){
  x=await workspace({failure});await upscaleForm(x);await x.page.click('#generate');await ready(x.page);await x.page.waitForTimeout(150);assert.equal(x.accepted(),0);assert.equal(count(x,'/api/quotes'),1);assert.equal(count(x,'/api/jobs'),['quote','expired','wrong-model'].includes(failure)?0:1);assert.equal(await x.page.locator('#quote-dialog').isVisible(),false);assert.ok((await x.page.locator('#notice').innerText()).length>0);ok('Upscale '+failure+': stops without automatic repricing or retry');await x.context.close();
 }
 x=await workspace({failure:'auth'});await upscaleForm(x);await x.page.click('#generate');await ready(x.page);const upscaleSubmissions=x.requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST');assert.equal(upscaleSubmissions.length,2);assert.deepEqual(upscaleSubmissions[0].data,upscaleSubmissions[1].data);assert.equal(x.accepted(),1);ok('Upscale authentication-only renewal reuses the exact quote ID');await x.context.close();
 for(const initial of [[active(1),active(2),active(3),active(4)],[{...active(5),status:'uncertain'}]]){
  x=await workspace({initial});await upscaleForm(x);assert.equal(await x.page.locator('#generate').isDisabled(),true);assert.equal(count(x,'/api/jobs'),0);ok('Capacity and interrupted-request gates still block Upscale');await x.context.close();
 }
 const failedFal={id:id(901),status:'failed',sourceId:id(902),settings:{type:'video',provider:'fal',engine:'h3maxfal',mode:'reference',model:'minimax/h3-max/reference-to-video',prompt:'test',duration:10,resolution:'1080p',aspectRatio:'16:9'},createdAt:Date.now(),estimatedUsd:1.721,error:'fal.ai: Provider rejected the request.',providerTaskId:'fal_failed'};
 const uncertainFal={id:id(903),status:'uncertain',sourceId:id(904),settings:{type:'video',provider:'fal',engine:'h3maxfal',mode:'reference',model:'minimax/h3-max/reference-to-video',prompt:'test',duration:10,resolution:'1080p',aspectRatio:'16:9'},createdAt:Date.now()-1,estimatedUsd:1.721,error:'fal.ai submission status is uncertain.',providerTaskId:'fal_uncertain'};
 x=await workspace({initial:[failedFal,uncertainFal]});
 const cards=x.page.locator('.card');
 const failedCard=cards.filter({hasText:'FAILED /'});assert.equal(await failedCard.locator('.history-no-result strong').innerText(),'Generation failed');assert.doesNotMatch(await failedCard.innerText(),/Result pending/);assert.match(await failedCard.innerText(),/Lab estimate released: \$1\.721/);
 const uncertainCard=cards.filter({hasText:'UNCERTAIN /'});assert.equal(await uncertainCard.locator('.history-no-result strong').innerText(),'Status unknown');assert.doesNotMatch(await uncertainCard.innerText(),/Result pending/);assert.match(await uncertainCard.innerText(),/provider status unknown/);
 ok('History distinguishes definite FAL failure from uncertain provider status and releases the Lab estimate label');await x.context.close();

  for(const width of [390,1728]){x=await workspace({width});await imageForm(x);assert.ok(await x.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));mkdirSync('test-results',{recursive:true});await x.page.screenshot({path:'test-results/image-oneclick-'+width+'.png',fullPage:true});assert.deepEqual(x.errors,[]);ok('Image layout without overflow at '+width+'px');await x.context.close();}
 console.log('ONECLICK_BROWSER_CHECKS_PASSED='+passed);
}finally{await browser.close();await new Promise(r=>server.close(r));}
