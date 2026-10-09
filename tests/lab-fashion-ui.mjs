// Mock-only browser regression of PV Lab Fashion. No live providers or paid generations.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const playwrightPath=process.env.PV_PLAYWRIGHT_MODULE;
assert.ok(playwrightPath,'Install Playwright and set PV_PLAYWRIGHT_MODULE.');
const {chromium}=await import(pathToFileURL(playwrightPath).href);
const root=resolve('.');
const source=readFileSync('lab/fashion.js','utf8');
const boot=source.indexOf("try{\n  const {Clerk}=await import(");
assert.ok(boot>0,'Fashion client owner bootstrap marker must be present.');
const testSource=source.slice(0,boot)+
  "clerk={isSignedIn:true,user:{id:'synthetic-owner'},session:{id:'mock-session',getToken:async()=> 'mock.jwt.token'},signOut:async()=>{}};await sync();window.__fashionTestReady=true;\n";
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),path=resolve(root,'.'+url.pathname);
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');
  res.end(url.pathname==='/lab/fashion.js'?testSource:readFileSync(path));
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const port=server.address().port,browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
const page=await context.newPage(),errors=[],calls=[];
const imageIds=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
let uploaded=0;
page.on('pageerror',e=>errors.push(e.message));
await page.route('https://**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;calls.push({path,method:request.method()});
  if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev')return route.abort();
  const data=path==='/api/session'?{owner:true,config:{enabled:true}}:
    path==='/api/fashion/models'?{models:[
      {id:'fashn16',provider:'fal',label:'FASHN v1.6',available:true},
      {id:'fashnmax',provider:'fashn',label:'FASHN Max',available:true},
      {id:'fluxvto',provider:'fal',label:'FLUX VTO',available:true}
    ]}:path==='/api/fashion/balance'?{connected:true,credits:{total:100,onDemand:100,subscription:0}}:
    path==='/api/jobs'?{jobs:[]}:path==='/api/uploads'?{id:imageIds[uploaded++]}:
    path==='/api/fashion/quote'?{id:'33333333-3333-4333-8333-333333333333',
      estimatedUsd:0.15,expiresAt:Date.now()+600000,notice:'One generation after confirmation.'}:
    {error:'Unexpected test request '+path};
  if(data.error)throw new Error(data.error);
  return route.fulfill({status:path==='/api/uploads'?201:200,contentType:'application/json',body:JSON.stringify(data)});
});
try{
  await page.goto('http://127.0.0.1:'+port+'/lab/fashion.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__fashionTestReady===true,{timeout:12000});
  assert.equal(await page.locator('#workspace').isVisible(),true);
  assert.equal(await page.locator('#gate').isVisible(),false);
  assert.match(await page.locator('#fashn-api-state').innerText(),/Connected · 100 credits/);
  assert.equal(calls.filter(c=>c.path==='/api/fashion/balance').length,1);
  await page.locator('#check-fashn').click();
  await page.waitForFunction(()=>document.querySelector('#fashn-api-state').textContent.includes('100 credits'));
  assert.equal(calls.filter(c=>c.path==='/api/fashion/balance').length,2);
  assert.equal(await page.locator('#model-select option').count(),3);
  assert.equal(await page.locator('#model-select').inputValue(),'fashnmax','Purchased FASHN Max is selected by default.');
  assert.equal(await page.locator('#fashnmax-options').isVisible(),true);
  assert.equal(await page.locator('#fashn16-options').isVisible(),false);
  assert.match(await page.locator('#fashion-title').innerText(),/look, reimagined/i);
  const desktop=await page.evaluate(()=>{
    const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width}};
    return{bodyWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,quote:rect('#quote'),preview:rect('#result-stage'),person:rect('#person-slot'),garment:rect('#garment-slot')};
  });
  assert.ok(desktop.bodyWidth<=desktop.viewportWidth,'Desktop Fashion has no horizontal overflow.');
  assert.ok(desktop.quote.top<900,'Price action starts within the desktop viewport.');
  assert.ok(desktop.preview.width>350,'Editorial output has a meaningful desktop preview area.');
  assert.ok(desktop.person.top<desktop.garment.top,'Source images have a deliberate stacked editorial layout on desktop.');
  mkdirSync('test-results',{recursive:true});
  await page.screenshot({path:'test-results/pv-fashion-editorial-desktop.png',fullPage:true});
  await page.locator('#model-select').selectOption('fashnmax');
  assert.equal(await page.locator('#quote').isEnabled(),false);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xfy8AAAAASUVORK5CYII=','base64');
  await page.setInputFiles('#person-file',{name:'synthetic-person.png',mimeType:'image/png',buffer:png});
  await page.setInputFiles('#garment-file',{name:'synthetic-jacket.png',mimeType:'image/png',buffer:png});
  assert.equal(await page.locator('#quote').isEnabled(),true);
  await page.locator('#quote').click();
  await page.waitForFunction(()=>!document.querySelector('#quote-box').hidden);
  assert.match(await page.locator('#quote-price').innerText(),/\$0\.15/);
  assert.match(await page.locator('#quote-price').innerText(),/2 credits/);
  assert.equal(await page.locator('#confirm').isEnabled(),true);
  assert.equal(calls.filter(c=>c.path==='/api/uploads').length,2);
  assert.equal(calls.filter(c=>c.path==='/api/fashion/quote').length,1);
  assert.equal(calls.some(c=>c.path==='/api/fashion/submit'),false,'Price review must not buy a generation.');
  await page.setViewportSize({width:390,height:844});
  const mobile=await page.evaluate(()=>({bodyWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth}));
  assert.ok(mobile.bodyWidth<=mobile.viewportWidth,'Mobile Fashion has no horizontal overflow.');
  assert.equal(await page.locator('#quote-box').isVisible(),true);
  assert.equal(await page.locator('#result-stage').isVisible(),true);
  await page.screenshot({path:'test-results/pv-fashion-editorial-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS Fashion editorial desktop/mobile, FASHN credit balance, default Max, and no-cost price review.');
}finally{
  await browser.close();await new Promise(ok=>server.close(ok));
}
