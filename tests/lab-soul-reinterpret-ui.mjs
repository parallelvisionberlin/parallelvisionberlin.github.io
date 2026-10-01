// Mock-only browser verification. No real credentials, private media or paid generations.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
import {publicSoulPresets} from '../lab-worker/soul-presets.mjs';
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf("try{const {Clerk}=await import(");assert.ok(boot>0);
const testSource=source.slice(0,boot)+`clerk={isSignedIn:true,user:{id:'test'},session:{id:'synthetic-session',getToken:async()=> 'synthetic-token'},signOut:async()=>{}};owner=true;userId='test';config={enabled:true,geminiEnabled:true,falEnabled:true,soulTrainingEnabled:true,soulReinterpretEnabled:true,soulPresets:${JSON.stringify(publicSoulPresets())},dailyLimitUsd:10,concurrency:{image:10,video:3}};soul.configure(config);await soul.load();$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();update();window.__labTest={lock};`;
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const path=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'text/plain');res.end(pathname==='/lab/lab.js'?testSource:readFileSync(path));});
await new Promise(r=>server.listen(4184,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const ORIGIN='http://127.0.0.1:4184',API='https://parallel-vision-lab.parallelvision.workers.dev';
let passed=0,png;const ok=name=>{passed++;console.log('PASS '+name);};
const id=n=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
const settings={type:'image',mode:'image',prompt:'A ceramic sculpture in soft daylight.',resolution:'2k',aspectRatio:'16:9',outputFormat:'png',referenceRoles:[],referenceSourceIds:[]};
async function workspace({failure='',width=1440,initial=[],quoteDelay=0,adapterReady=true}={}){
 const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true}),page=await context.newPage();
 const requests=[],errors=[],dialogs=[],jobs=[...initial],quotes=new Map();let sequence=100,accepted=0,renewed=false;
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
 await context.route('https://**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(!url.href.startsWith(API)){await route.abort();return;}
  const path=url.pathname,method=req.method(),data=req.headers()['content-type']?.startsWith('application/json')?req.postDataJSON():{};
  requests.push({path,method,data});
  const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/api/jobs'&&method==='GET')return send({jobs,activeJobs:jobs.filter(j=>['queued','running','saving','uncertain','submitting'].includes(j.status)),concurrency:{image:4,video:1},next:null});
  if(path==='/api/soul/characters')return send({characters:[{id:id(1),name:'Nina FOK',state:'ready',reinterpret:adapterReady?{id:id(2),state:'ready',baseModel:'z-image-turbo'}:null}]});
  if(path==='/api/packs')return send({packs:[]});
  if(path==='/api/uploads')return send({id:id(sequence++)},201);
  if(path.startsWith('/api/assets/'))return route.fulfill({status:200,contentType:'image/png',body:png});
  if(path==='/api/gemini/jobs'&&method==='POST'){accepted++;return send({jobs:[{id:id(sequence++),status:'queued',settings:{...data.settings,provider:'gemini'},createdAt:Date.now()}]},202);}
  if(path==='/api/drafts'){const job={id:id(sequence++),sourceId:data.sourceId,settings:{...data.settings,referenceSourceIds:data.referenceSourceIds||[]},status:'draft',createdAt:Date.now()};jobs.unshift(job);return send({job},201);}
  if(path==='/api/fal/pose-preview'&&method==='POST')return send({assetId:id(sequence++),billingNote:'synthetic preview'},201);
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
   const q={id:id(sequence++),estimatedUsd:0.036,maxUsd:0.036,expiresAt:Date.now()+(failure==='expired'?-1:180000),settings:{...data.settings,mode:failure==='wrong-model'?(data.settings.mode==='upscale'?'image':'upscale'):data.settings.mode,referenceSourceIds:data.referenceSourceIds||[],presetLabel:'Night Hotel',transferNotes:[]}};
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
async function soulForm(x){await x.page.click('#tool-image');await x.page.selectOption('#image-engine','soul');}
async function reForm(x){await soulForm(x);await x.page.click('#soul-mode-reinterpret');}
async function baseImage(x){await x.page.locator('#soul-base-image').setInputFiles({name:'base.png',mimeType:'image/png',buffer:png});await ready(x.page);}
try{
 let x=await workspace();await soulForm(x);assert.equal(await x.page.locator('#soul-mode-text').getAttribute('aria-selected'),'true');assert.equal(await x.page.locator('#soul-reinterpret-controls').isVisible(),false);await x.page.fill('#prompt','Nina in soft light.');await x.page.click('#generate');await ready(x.page);const text=x.requests.find(r=>r.path==='/api/quotes').data;assert.equal(text.settings.engine,'soul');assert.equal(text.settings.mode,'image');assert.equal(text.sourceId,null);assert.equal(x.accepted(),1);assert.deepEqual(x.errors,[]);ok('PV Soul Text remains the default and submits its own identity');await x.context.close();
 x=await workspace();await reForm(x);assert.equal(await x.page.locator('#generate').innerText(),'Reinterpret with Soul');assert.equal(await x.page.locator('#generate').isDisabled(),true);assert.equal(await x.page.locator('#soul-preset option').count(),8);assert.equal(await x.page.locator('#ratio').inputValue(),'source');assert.equal(await x.page.locator('#soul-fidelity').inputValue(),'0.7');assert.equal(await x.page.locator('#soul-strength').inputValue(),'0.75');assert.equal(await x.page.locator('#soul-keep-styling').isChecked(),true);
 await baseImage(x);assert.equal(await x.page.locator('#generate').isDisabled(),false);assert.equal(await x.page.locator('#soul-base-preview').isVisible(),true);assert.equal(await x.page.locator('#prompt').inputValue(),'');
 await x.page.fill('#prompt','Warmer bedside lamp.');await x.page.selectOption('#soul-preset','night-hotel');assert.equal(await x.page.locator('#prompt').inputValue(),'Warmer bedside lamp.');assert.equal(await x.page.locator('#soul-fidelity').inputValue(),'0.47');assert.equal(await x.page.locator('#soul-strength').inputValue(),'0.65');assert.equal(await x.page.locator('#soul-keep-composition').isChecked(),true);assert.equal(await x.page.locator('#soul-keep-styling').isChecked(),false);
 await x.page.locator('#soul-fidelity').fill('0.65');await x.page.locator('#soul-strength').fill('1.25');await x.page.uncheck('#soul-keep-styling');await x.page.selectOption('#resolution','1k');await x.page.selectOption('#output-format','jpeg');
 await x.page.click('#generate');await ready(x.page);assert.equal(x.accepted(),1);const request=x.requests.find(r=>r.path==='/api/quotes').data;
 assert.ok(request.sourceId);assert.deepEqual(request.referenceSourceIds,[]);assert.equal(request.settings.mode,'reinterpret');assert.equal(request.settings.characterId,id(1));assert.equal(request.settings.preset,'night-hotel');assert.equal(request.settings.imageFidelity,.65);assert.equal(request.settings.identityStrength,1.25);assert.equal(request.settings.keepComposition,true);assert.equal(request.settings.keepStyling,false);assert.equal(request.settings.resolution,'1k');assert.equal(request.settings.outputFormat,'jpeg');assert.equal(request.settings.aspectRatio,'source');assert.equal(count(x,'/api/gemini/jobs'),0);assert.equal(count(x,'/api/fal/controlled-pose'),0);
 assert.match(await x.page.locator('.cardmeta').first().innerText(),/PV SOUL \/ REINTERPRET \/ NIGHT HOTEL/);ok('Reinterpret selects one base, backend preset and mapped controls with one Spicy quote/submission');
 await x.page.click('#soul-mode-text');await x.page.fill('#prompt','Changed');await x.page.locator('.card').first().getByRole('button',{name:'Reuse',exact:true}).click();await ready(x.page);
 assert.equal(await x.page.locator('#soul-mode-reinterpret').getAttribute('aria-selected'),'true');assert.equal(await x.page.locator('#soul-character').inputValue(),id(1));assert.equal(await x.page.locator('#soul-preset').inputValue(),'night-hotel');assert.equal(await x.page.locator('#prompt').inputValue(),'Warmer bedside lamp.');assert.equal(await x.page.locator('#soul-fidelity').inputValue(),'0.65');assert.equal(await x.page.locator('#soul-strength').inputValue(),'1.25');assert.equal(await x.page.locator('#soul-keep-styling').isChecked(),false);assert.equal(await x.page.locator('#soul-keep-composition').isChecked(),true);assert.equal(await x.page.locator('#resolution').inputValue(),'1k');assert.equal(await x.page.locator('#output-format').inputValue(),'jpeg');assert.equal(await x.page.locator('#soul-base-preview').isVisible(),true);assert.equal(x.accepted(),1);assert.deepEqual(x.errors,[]);ok('History Reuse restores identity, image, mode, preset, prompt, sliders, toggles and output');await x.context.close();
 x=await workspace({adapterReady:false});await reForm(x);await baseImage(x);assert.equal(await x.page.locator('#generate').isDisabled(),true);await x.page.click('#soul-prepare-reinterpret');assert.equal(await x.page.locator('#soul-training-target').inputValue(),id(1));assert.equal(await x.page.locator('#soul-paid-reinterpret-label').isVisible(),true);await x.page.click('#soul-train');await ready(x.page);assert.match(await x.page.locator('#notice').innerText(),/Approve.*2.26/);assert.equal(count(x,'/api/soul/datasets'),0);assert.equal(count(x,'/api/soul/characters'),0);ok('Missing secondary identity blocks generation and requires explicit paid-training approval');await x.context.close();
 for(const failure of ['quote','expired','wrong-model','network','budget']){
  x=await workspace({failure});await reForm(x);await baseImage(x);await x.page.click('#generate');await ready(x.page);assert.equal(x.accepted(),0);assert.equal(count(x,'/api/quotes'),1);assert.equal(count(x,'/api/jobs'),['network','budget'].includes(failure)?1:0);ok('Reinterpret '+failure+' stops without paid retries');await x.context.close();
 }
 x=await workspace();await reForm(x);await x.page.selectOption('#image-engine','gemini');await x.page.fill('#prompt','Natural portrait');await x.page.click('#generate');await ready(x.page);assert.equal(count(x,'/api/gemini/jobs'),1);assert.equal(count(x,'/api/quotes'),0);assert.equal(x.accepted(),1);ok('Switching from Soul to Nano submits only Gemini');await x.context.close();
 const completed={id:id(50),sourceId:id(51),outputId:id(52),status:'completed',createdAt:Date.now(),settings:{...settings,engine:'soul',mode:'reinterpret',characterId:id(1),preset:'night-hotel',presetLabel:'Night Hotel',aspectRatio:'source',resolution:'1.5k',imageFidelity:.74,identityStrength:1,keepComposition:true,keepStyling:true}};
 x=await workspace({initial:[completed]});for(const name of ['Repair','Upscale','Use in Video','Download image'])assert.equal(await x.page.locator('.card').getByRole('button',{name,exact:true}).count(),1,name);ok('Completed Reinterpret output retains Repair, Upscale, Video and Download actions');await x.context.close();
 for(const width of [390,1440]){x=await workspace({width});await reForm(x);await baseImage(x);assert.ok(await x.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));mkdirSync('test-results',{recursive:true});await x.page.screenshot({path:'test-results/soul-reinterpret-'+width+'.png',fullPage:true});assert.deepEqual(x.errors,[]);ok('Reinterpret layout has no overflow at '+width+'px');await x.context.close();}
 console.log('SOUL_REINTERPRET_BROWSER_CHECKS_PASSED='+passed);
}finally{await browser.close();await new Promise(r=>server.close(r));}
