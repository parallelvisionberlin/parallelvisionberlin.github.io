// Mocked customer Video journeys. No real account, checkout or provider calls.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf('try{clerk=await loadLabAccount();');
assert.ok(boot>0);
const injected=source.slice(0,boot)+source.slice(source.indexOf('\n// Soul composer:',boot))+`
clerk={isSignedIn:true,user:{id:'user_VideoTest'},session:{id:'video-test',getToken:async()=> 'synthetic-token'}};
owner=true;customerMode=true;userId='user_VideoTest';
const scenario=new URLSearchParams(location.search).get('scenario')||'trial';
customerGenerationReady=scenario==='zero';customerTrialGenerationPaused=scenario==='trial';
customerBillingReady=!['review','unavailable','closed'].includes(scenario);
customerVideoProfile={customer:true,billingReview:scenario==='review',accountClosed:scenario==='closed',promotionReview:scenario==='promo'};
config={enabled:customerGenerationReady,customer:true,videoEngines:customerGenerationReady?['wan','seedance']:[],videoPreparationEngines:['wan','seedance']};
wallet.connect({...customerVideoProfile,balanceCredits:0,billingReady:customerBillingReady,trialGenerationPaused:customerTrialGenerationPaused});
applyConfig(config);$('app').hidden=false;$('gate').hidden=true;
setTool('video');await loadHistory();update();window.__videoCustomerTest=true;
`;
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+pathname);
 if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');
 res.end(pathname==='/lab/lab.js'?injected:readFileSync(path));
});
await new Promise(r=>server.listen(4197,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
mkdirSync('test-results',{recursive:true});
try{
 for(const width of [1440,390])for(const scenario of ['trial','zero','review','unavailable','closed','promo']){
  const context=await browser.newContext({viewport:{width,height:950}}),page=await context.newPage(),posts=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev')return route.abort();
   if(req.method()==='POST')posts.push(url.pathname);
   const payload=url.pathname==='/api/jobs'?{jobs:[],activeJobs:[],next:null}:url.pathname==='/api/packs'?{packs:[]}:{error:'Unexpected request'};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.goto(`http://127.0.0.1:4197/lab/studio.html?tool=video&scenario=${scenario}`);
  await page.waitForFunction(()=>window.__videoCustomerTest);
  await page.click('#video-model-trigger');
  const model=page.locator('.pv-video-model-item[data-model="seedance"]');
  assert.equal(await model.isEnabled(),true,'Account eligibility must not prevent draft model selection');
  await model.click();
  await page.click('#mode-start');
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=512;c.height=512;c.getContext('2d').fillRect(0,0,512,512);return c.toDataURL().split(',')[1];});
  await page.setInputFiles('#image',{name:'synthetic-frame.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  const prompt='A slow camera move across a sculptural coat.';
  await page.fill('#prompt',prompt);
  assert.doesNotMatch(await page.locator('#generate').textContent(),/connect|API/i);
  if(scenario==='trial'){
   assert.equal(await page.locator('#generation-help').isVisible(),false,'No credit-pack note below Generate');
   assert.equal(await page.locator('#generation-help').textContent(),'');
  }
  if(['trial','zero'].includes(scenario)){
   assert.equal(await page.locator('#generate').isEnabled(),true);
   await page.click('#generate');
   await page.waitForFunction(()=>document.querySelector('#lab-pricing-overlay').open);
   assert.equal(await page.locator('#prompt').inputValue(),prompt);
   assert.equal(await page.locator('#video-engine').inputValue(),'seedance');
   assert.equal(await page.locator('#image').evaluate(el=>el.files[0]?.name),'synthetic-frame.png');
   assert.deepEqual(posts,[],'Pricing must open before uploads, provider quotes, jobs or checkout');
   if(scenario==='trial')await page.screenshot({path:`test-results/video-customer-pricing-${width}.png`});
  }else{
   assert.equal(await page.locator('#generate').isEnabled(),false);
   assert.equal(await page.locator('#generation-help').isVisible(),true);
   const message=await page.locator('#generation-help').textContent();
   assert.match(message,scenario==='review'?/refund or dispute/:scenario==='closed'?/account is closed/:scenario==='promo'?/support for a review/:/currently unavailable/);
   assert.deepEqual(posts,[]);
  }
  assert.deepEqual(errors,[]);
  console.log(`PASS customer Video ${scenario} at ${width}px`);
  await context.close();
 }
}finally{await browser.close();server.close();}
