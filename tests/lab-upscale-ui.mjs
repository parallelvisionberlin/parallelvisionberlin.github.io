// Isolated browser tests with synthetic media and a fully mocked API. No paid tasks.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync, existsSync, mkdirSync} from 'node:fs';
import {resolve, extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf("try{const {Clerk}=await import(");assert.ok(boot>0);
const testSource=source.slice(0,boot)+`clerk={session:{getToken:async()=> 'synthetic-token'},signOut:async()=>{}};owner=true;userId='test';config={enabled:true,concurrency:{image:4,video:1}};$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();update();window.__labTest={lock};`;
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const path=resolve('.','.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!path.startsWith(resolve('.')+'/')||!existsSync(path)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[extname(path)]||'text/plain');res.end(pathname==='/lab/lab.js'?testSource:readFileSync(path));});
await new Promise(r=>server.listen(4178,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const ORIGIN='http://127.0.0.1:4178',API='https://parallel-vision-lab.parallelvision.workers.dev';
const sourceId='10000000-0000-4000-8000-000000000001',outputId='10000000-0000-4000-8000-000000000002';
let png,passed=0;
const ok=name=>{passed++;console.log('PASS '+name);};
async function workspace(jobs=[],width=1440){
 const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true});const page=await context.newPage();let accepted=true;const requests=[],uploads=[];let count=3;
 page.on('dialog',async d=>{if(accepted)await d.accept();else await d.dismiss();});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('https://**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(!url.href.startsWith(API)){await route.abort();return;}
  const path=url.pathname,method=req.method();let data={};
  if(req.headers()['content-type']?.startsWith('application/json'))data=req.postDataJSON();
  requests.push({path,method,data});let body;
  if(path==='/api/jobs'&&method==='GET')body={jobs,activeJobs:[],concurrency:{image:4,video:1},next:null};
  else if(path==='/api/packs')body={packs:[]};
  else if(path==='/api/uploads'){const id='10000000-0000-4000-8000-'+String(count++).padStart(12,'0');uploads.push({id,type:req.headers()['content-type'],bytes:req.postDataBuffer()?.length,name:decodeURIComponent(req.headers()['x-filename']||'')});body={id};}
  else if(path==='/api/quotes')body={id:'10000000-0000-4000-8000-000000000088',estimatedUsd:0.012,maxUsd:0.012,expiresAt:Date.now()+180000,settings:{...data.settings,referenceSourceIds:data.referenceSourceIds||[],transferNotes:[]}};
  else if(path==='/api/jobs'&&method==='POST')body={job:{id:'10000000-0000-4000-8000-000000000099',status:'queued',settings:{type:'image',mode:'upscale'},sourceId,createdAt:Date.now()}};
  else if(path.startsWith('/api/assets/')){await route.fulfill({status:200,contentType:'image/png',body:png});return;}
  else {await route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'Unmocked request '+path})});return;}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto(ORIGIN+'/lab/');await page.waitForFunction(()=>!!window.__labTest);
 if(!png)png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=320;const x=c.getContext('2d');x.fillStyle='#353b40';x.fillRect(0,0,320,320);x.fillStyle='#aaa49a';x.fillRect(70,70,180,180);return c.toDataURL('image/png').split(',')[1];}),'base64');
 return {page,context,requests,uploads,errors,decline:()=>{accepted=false;}};
}
const countPaid=x=>x.requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST').length;
const uploadSmall=async page=>{await page.locator('#image').setInputFiles({name:'test-scene.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>!document.querySelector('#generate').disabled);};
try{
 let x=await workspace();await x.page.click('#tool-upscale');assert.equal(await x.page.locator('#prompt').isVisible(),false);assert.equal(await x.page.locator('#last-upload').isVisible(),false);assert.equal(await x.page.locator('#resolution').inputValue(),'4k');await uploadSmall(x.page);ok('Upscale needs one image and no prompt');
 assert.equal(await x.page.locator('#generate').innerText(),'Upscale');await x.page.click('#generate');await x.page.waitForFunction(()=>!document.querySelector('#resolution').disabled);const q=x.requests.find(r=>r.path==='/api/quotes');assert.equal(q.data.settings.mode,'upscale');assert.equal(q.data.settings.prompt,'');assert.equal(q.data.settings.type,'image');assert.equal(x.requests.filter(r=>r.path==='/api/quotes').length,1);assert.equal(countPaid(x),1);assert.equal(await x.page.locator('#quote-dialog').isVisible(),false);ok('One click obtains a live quote and submits one upscale without review');
 const paid=x.requests.find(r=>r.path==='/api/jobs'&&r.method==='POST');assert.equal(paid.data.quoteId,'10000000-0000-4000-8000-000000000088');assert.equal(paid.data.confirm,true);assert.match(await x.page.locator('#notice').innerText(),/Upscale requested/);ok('Upscale uses the original quote ID and displays its cost');
 await x.page.click('#tool-image');assert.equal(await x.page.locator('#prompt').isVisible(),true);assert.equal(await x.page.locator('#reference-mode').isVisible(),true);assert.equal(await x.page.locator('#resolution').inputValue(),'2k');await x.page.click('#tool-video');assert.equal(await x.page.locator('#last-upload').isVisible(),true);assert.equal(await x.page.locator('#duration-control').isVisible(),true);assert.deepEqual(x.errors,[]);ok('Existing Image and Video controls still work');await x.context.close();
 const job={id:'10000000-0000-4000-8000-000000000010',status:'completed',sourceId,outputId,settings:{type:'image',mode:'upscale',resolution:'8k',aspectRatio:'auto',outputFormat:'png',prompt:'',referenceSourceIds:[]},createdAt:Date.now(),settledUsd:0.012};
 x=await workspace([job]);const card=x.page.locator('.card');assert.match(await card.locator('.cardmeta').innerText(),/UPSCALE/);const download=x.page.waitForEvent('download');await card.getByRole('button',{name:'Download image',exact:true}).click();const dl=await download;assert.match(dl.suggestedFilename(),new RegExp(outputId));assert.equal(countPaid(x),0);ok('Download addresses the result without generating');
 await card.getByRole('button',{name:'Reuse',exact:true}).click();await x.page.waitForFunction(()=>document.querySelector('#tool-upscale').getAttribute('aria-pressed')==='true'&&document.querySelector('#resolution').value==='8k'&&!document.querySelector('#resolution').disabled);assert.equal(await x.page.locator('#resolution').inputValue(),'8k');assert.equal(await x.page.locator('#output-format').inputValue(),'png');assert.equal(countPaid(x),0);ok('Reuse restores upscale source and exact settings');
 await card.getByRole('button',{name:'View image',exact:true}).click();await x.page.waitForFunction(()=>!document.querySelector('#download').hidden);assert.equal(await x.page.locator('#preview').getAttribute('alt'),'Generated image result');ok('View shows generated image with download');
 await card.getByRole('button',{name:'Upscale',exact:true}).click();await x.page.waitForTimeout(100);assert.equal(countPaid(x),0);ok('History can send a finished image into Upscale');await x.page.evaluate(()=>window.__labTest.lock());assert.equal(await x.page.locator('#app').isVisible(),false);assert.equal(await x.page.locator('.card').count(),0);ok('Sign-out clears private previews and history');await x.context.close();
 x=await workspace();await x.page.click('#tool-image');await x.page.fill('#prompt','A ceramic sculpture in a daylight studio.');const large=Buffer.concat([png,Buffer.alloc(11*1024*1024-png.length)]);await x.page.locator('#reference-images').setInputFiles({name:'large-reference.png',mimeType:'image/png',buffer:large});await x.page.waitForFunction(()=>!document.querySelector('#generate').disabled);await x.page.click('#generate');await x.page.waitForFunction(()=>!document.querySelector('#resolution').disabled);assert.equal(await x.page.locator('#quote-dialog').isVisible(),false);assert.equal(x.uploads.length,2);assert.equal(x.uploads[0].bytes,large.length);assert.equal(x.uploads[1].type,'image/webp');assert.ok(x.uploads[1].bytes<=10485760);const lq=x.requests.find(r=>r.path==='/api/quotes').data;assert.deepEqual(lq.referenceSourceIds,[x.uploads[0].id]);assert.deepEqual(lq.transferSourceIds,[x.uploads[1].id]);assert.equal(countPaid(x),1);ok('Large reference keeps original, uses working copy and submits one image without review');
 const dimensions=await x.page.evaluate(async()=>{const {providerWorkingCopy}=await import('./image-tools.js?v=20260927-2');const b=new Blob([new Uint8Array(await (await fetch(document.querySelector('.reference-item img').src)).arrayBuffer())],{type:'image/png'});const f=new File([b],'large.png',{type:'image/png'});const copy=await providerWorkingCopy(f);const img=new Image();img.src=URL.createObjectURL(copy);await img.decode();return [img.naturalWidth,img.naturalHeight];});assert.deepEqual(dimensions,[320,320]);ok('Working-copy compression keeps pixel dimensions');assert.deepEqual(x.errors,[]);await x.context.close();
 x=await workspace();await x.page.click('#tool-image');await x.page.fill('#prompt','A ceramic sculpture.');await x.page.locator('#reference-images').setInputFiles({name:'large-reference.png',mimeType:'image/png',buffer:large});await x.page.waitForFunction(()=>!document.querySelector('#generate').disabled);x.decline();await x.page.click('#generate');await x.page.waitForTimeout(100);assert.equal(x.requests.filter(r=>r.path==='/api/quotes').length,0);assert.equal(countPaid(x),0);ok('Declining preparation sends no quote or paid task');await x.context.close();
 for(const width of [390,1728]){x=await workspace([job],width);await x.page.click('#tool-upscale');assert.ok(await x.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));mkdirSync('test-results',{recursive:true});await x.page.screenshot({path:'test-results/lab-upscale-'+width+'.png',fullPage:true});assert.deepEqual(x.errors,[]);ok('No horizontal overflow at '+width+'px');await x.context.close();}
 console.log('BROWSER_CHECKS_PASSED='+passed);
}finally{await browser.close();await new Promise(r=>server.close(r));}
