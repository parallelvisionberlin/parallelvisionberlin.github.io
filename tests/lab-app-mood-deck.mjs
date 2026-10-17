import {pathToFileURL} from 'node:url';
import http from 'node:http';import {readFileSync,existsSync,mkdirSync} from 'node:fs';import {resolve,extname} from 'node:path';import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE||resolve('mobile-app/node_modules/@playwright/test/index.mjs')).href);
const root=resolve('.'),out='/tmp/pv-lab-mobile-review/deck';mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(readFileSync(path));});await new Promise(r=>server.listen(4189,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.PV_CHROMIUM_EXECUTABLE||chromium.executablePath()});
try{for(const [width,height] of [[390,650],[320,520],[768,900],[1200,900]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[];let paid=0,quotes=0;page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__PV_LAB_NATIVE__=1;window.ReactNativeWebView={postMessage(raw){const m=JSON.parse(raw);if(m.type==='PV_LAB_AUTH')setTimeout(()=>window.__PV_LAB_REPLY__({pageId:m.pageId,id:m.id,userId:'user_Test',sessionId:'sess_Test',token:'test.'+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+120}))+'.fixture'}),0);}};});
 await page.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());
  if(url.hostname==='parallel-vision-lab.parallelvision.workers.dev'){
   const send=data=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});assert.equal(req.headers()['x-pv-lab-client'],'mobile-v1');
   if(url.pathname==='/api/session')return send({owner:true,config:{enabled:true}});
   if(url.pathname==='/api/uploads')return send({id:'20000000-0000-4000-8000-000000000001'});
   if(url.pathname==='/api/quotes'){quotes++;const data=req.postDataJSON();assert.equal(data.settings.moodId,'dreamcore');assert.equal(data.settings.referenceRoles[0].role,'base');assert.equal(data.settings.resolution,'1k','Mobile Photobooth must quote 1K by default');return send({id:'quote-test',settings:data.settings,maxUsd:.22,provider:'SpicyAPI',creditCost:25,expiresAt:Date.now()+180000});}
   if(url.pathname==='/api/jobs/job-test/performance')return send({ok:true});
   if(url.pathname==='/api/jobs'){paid++;assert.deepEqual(req.postDataJSON(),{quoteId:'quote-test',confirm:true});return send({job:{id:'job-test',status:'queued'}});}
   throw Error('Unexpected API '+url.pathname);
  }
  if(url.hostname!=='127.0.0.1')return route.abort();return route.continue();
 });
 await page.goto('http://127.0.0.1:4189/lab/app-moods.html');await page.waitForSelector('.mood-card');assert.ok(await page.locator('.mood-card').count()>10);assert.equal(paid,0);assert.equal(quotes,0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/gallery-'+width+'.png'});
 await page.getByRole('button',{name:'Explore Dreamcore',exact:true}).click();assert.equal(await page.locator('#photo-picker').isVisible(),true);const before=await page.locator('#photo-picker').boundingBox();const generate=await page.locator('#continue-create').boundingBox();assert.ok(generate.y+generate.height<=height,'Generate visible in initial deck');await page.screenshot({path:out+'/deck-'+width+'.png'});
 const photo=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=480;c.height=640;return c.toDataURL().split(',')[1];}),'base64');await page.locator('#photo-input').setInputFiles({name:'source.png',mimeType:'image/png',buffer:photo});await page.waitForFunction(()=>document.querySelector('#continue-create').textContent.includes('25 credits'));assert.equal(paid,0);assert.equal(quotes,1);assert.equal((await page.locator('#photo-picker').boundingBox()).height,before.height);
 await page.locator('#continue-create').click();await page.waitForFunction(()=>document.querySelector('#continue-create').textContent==='Sent to Gallery');assert.equal(paid,1);await page.locator('#deck-form').evaluate(form=>form.requestSubmit());assert.equal(paid,1);assert.equal(await page.locator('#continue-create').isDisabled(),true);await page.locator('#close-detail').click();await page.getByRole('button',{name:'Explore Dreamcore',exact:true}).click();assert.equal(await page.locator('#photo-preview').isVisible(),false);assert.equal(await page.locator('#continue-create').isDisabled(),true);assert.deepEqual(errors,[]);await page.close();console.log('PASS',width,'layout, direct deck, quoted generation once, reset');
}
for(const mode of ['guest','customer','disabled','uncertain']){
 const page=await browser.newPage({viewport:{width:390,height:650}});let paid=0;
 await page.addInitScript(mode=>{window.__PV_LAB_NATIVE__=1;window.ReactNativeWebView={postMessage(raw){const m=JSON.parse(raw);if(m.type==='PV_LAB_AUTH')setTimeout(()=>window.__PV_LAB_REPLY__({pageId:m.pageId,id:m.id,userId:mode==='guest'?'':'user_Test',sessionId:mode==='guest'?'':'sess_Test',token:mode==='guest'?'':'test.'+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+120}))+'.fixture'}),0);}};},mode);
 await page.route('https://**/*',async route=>{const path=new URL(route.request().url()).pathname,send=data=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 if(path==='/api/session')return send({customer:mode!=='uncertain',generationReady:mode!=='disabled',config:{enabled:true}});
 if(path==='/api/uploads')return send({id:'20000000-0000-4000-8000-000000000001'});
 if(path==='/api/quotes'){const settings=route.request().postDataJSON().settings;assert.equal(settings.resolution,'1k','Mobile Photobooth quotes 1K for all signed-in test modes');return send({id:'quote-test',provider:'SpicyAPI',creditCost:25,maxUsd:.22,expiresAt:Date.now()+180000,settings});}
 if(path==='/api/jobs/job-test/performance')return send({ok:true});
 if(path==='/api/jobs'){paid++;if(mode==='uncertain')return route.abort();return send({job:{id:'job-test',status:'queued'}});}return route.abort();});
 await page.goto('http://127.0.0.1:4189/lab/app-moods.html');await page.getByRole('button',{name:'Explore Dreamcore',exact:true}).click();
 const photo=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=480;c.height=640;return c.toDataURL().split(',')[1];}),'base64');await page.locator('#photo-input').setInputFiles({name:'source.png',mimeType:'image/png',buffer:photo});
 if(mode==='guest'){await page.waitForFunction(()=>document.querySelector('#continue-create').textContent==='Sign in to generate');assert.equal(paid,0);}
 if(mode==='disabled'){await page.waitForFunction(()=>document.querySelector('#photo-error').textContent.includes('not available'));assert.equal(paid,0);}
 if(mode==='customer'){await page.waitForFunction(()=>document.querySelector('#continue-create').textContent==='Generate · 25 credits');assert.equal(paid,0);await page.locator('#continue-create').click();await page.waitForFunction(()=>document.querySelector('#continue-create').textContent==='Sent to Gallery');assert.equal(paid,1);}
 if(mode==='uncertain'){await page.waitForFunction(()=>document.querySelector('#continue-create').textContent.includes('25 credits'));await page.locator('#continue-create').click();await page.waitForFunction(()=>document.querySelector('#continue-create').textContent==='Check Gallery');await page.locator('#deck-form').evaluate(form=>form.requestSubmit());assert.equal(paid,1);assert.equal(await page.locator('#continue-create').isDisabled(),true);}
 await page.close();console.log('PASS',mode);
}
}finally{await browser.close();server.close();}
