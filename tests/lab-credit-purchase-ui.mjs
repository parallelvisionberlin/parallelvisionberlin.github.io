// Actual Studio modules with synthetic customers/photos and intercepted APIs.
// No real Checkout, payment, upload or provider request is permitted.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,statSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf('try{clerk=await loadLabAccount();'),tail=source.indexOf('\n// Soul composer:',boot);
assert.ok(boot>0&&tail>boot);let bootBalance=19;
const server=http.createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 const file=resolve(root,'.'+path+(path.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+sep)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[extname(file)]||'application/octet-stream');
 const injected=`
clerk={isSignedIn:true,user:{id:'credit-flow-customer',fullName:'Synthetic Customer'},session:{id:'credit-flow-session',getToken:async()=> 'mock-token'}};
owner=true;ownerAccount=false;customerMode=true;userId='credit-flow-customer';customerGenerationReady=true;customerBillingReady=true;
const creditProfile={customer:true,balanceCredits:${bootBalance},billingReady:true,generationReady:true,products:[]};
wallet.connect(creditProfile);studioAccount.update({signed:true,user:clerk.user,profile:creditProfile});
applyConfig({enabled:true,falEnabled:true,geminiEnabled:true,concurrency:{image:4,video:3},videoEngines:['seedance']});
$('app').hidden=false;$('gate').hidden=true;imageEngine='seedream';$('image-engine').value='seedream';setTool('image');moodUI.clear(true);
await loadHistory();await restoreStudioEntry();update();finishLabBoot();
window.__creditFlow={state:()=>({pending:imageSubmissionPending||customerPriceIntentPending,balance:customerCreditBalance,price:customerImagePricing.current().status,prompt:$('prompt').value,settings:settings(),references:references.map(r=>({name:r.file.name,id:r.id,role:r.role}))})};
window.__creditFlowReady=true;
`;
 res.end(path==='/lab/lab.js'?source.slice(0,boot)+injected+source.slice(tail):readFileSync(file));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});mkdirSync('test-results',{recursive:true});
try{
 for(const width of [390,1440])for(const scenario of ['low-balance','server-rejection','quote-rejection','network','checkout']){
  let walletBalance=scenario==='low-balance'||scenario==='checkout'?19:100;bootBalance=walletBalance;
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  const requests=[],quotes=new Map(),errors=[];let jobs=0,checkouts=0,uploads=0;
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('https://**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.hostname==='checkout.stripe.com')return route.fulfill({contentType:'text/html',body:'<html><body>Mock secure checkout</body></html>'});
   if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev')return route.abort();
   requests.push({path:url.pathname,method:request.method()});
   const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(url.pathname==='/api/uploads'){uploads++;return send({id:'10000000-0000-4000-8000-'+String(uploads).padStart(12,'0')});}
   if(url.pathname==='/api/quotes'){
    if(scenario==='quote-rejection')return send({error:'Insufficient PV Lab credits. Add credits before generating.'},402);
    const data=request.postDataJSON(),id='quote-'+quotes.size;
    const quote={id,provider:'SpicyAPI',creditCost:35,maxUsd:.1,estimatedUsd:.1,expiresAt:Date.now()+180000,settings:data.settings};
    quotes.set(id,{...quote,inputs:data});return send(quote);
   }
   if(url.pathname==='/api/customer/wallet')return send({customer:true,balanceCredits:walletBalance,billingReady:true,generationReady:true,products:[],storage:{bytes:0,limitBytes:1000000,files:0}});
   if(url.pathname==='/api/billing/checkout'){checkouts++;return send({url:'https://checkout.stripe.com/c/pay/mock'});}
   if(url.pathname==='/api/jobs'&&request.method()==='POST'){
    jobs++;
    if(scenario==='server-rejection'){walletBalance=19;return send({error:'Insufficient PV Lab credits. Add credits before generating.'},402);}
    if(scenario==='network')return route.abort('failed');
    const quote=quotes.get(request.postDataJSON().quoteId);assert.ok(quote);
    return send({job:{id:'accepted-job',status:'queued',createdAt:Date.now(),settings:quote.settings}});
   }
   if(url.pathname.startsWith('/api/jobs/'))return send({job:{id:'accepted-job',status:'queued',settings:{type:'image',mode:'image',engine:'seedream'}}});
   if(url.pathname==='/api/jobs')return send({jobs:[],activeJobs:[],next:null});
   if(url.pathname==='/api/packs')return send({packs:[]});
   if(url.pathname==='/api/library')return send({folders:[]});
   if(url.pathname==='/api/moodboards')return send({boards:[]});
   return send({});
  });
  await page.goto(base+'/lab/studio.html?tool=image');
  await page.waitForFunction(()=>window.__creditFlowReady).catch(error=>{
   throw new Error('Studio credit fixture did not finish booting. Page errors: '+JSON.stringify(errors),{cause:error});
  });await page.locator('#lab-boot').waitFor({state:'hidden'});
  const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=300;c.height=400;c.getContext('2d').fillRect(0,0,300,400);return c.toDataURL().split(',')[1];}),'base64');
  await page.locator('#reference-images').setInputFiles({name:'private-reference.png',mimeType:'image/png',buffer:png});
  await page.locator('#image-composer-prompt').fill('Preserve this person in a quiet editorial portrait.');
  await page.waitForFunction(()=>['ready','error'].includes(window.__creditFlow.state().price));
  const original=await page.evaluate(()=>window.__creditFlow.state());
  assert.equal(original.references.length,1);
  assert.equal(await page.locator('#lab-pricing-overlay').isVisible(),false,'Background preview cannot open pricing');
  await page.locator('#image-composer-generate').click();
  if(scenario==='network'){
   await page.waitForFunction(()=>document.querySelector('.submission-title')?.textContent==='Request not confirmed');
   assert.equal(jobs,1);assert.equal(await page.locator('#lab-pricing-overlay').isVisible(),false);
   await page.locator('#refresh').click();assert.equal(jobs,1,'History refresh never retries an unknown paid request');
  }else{
   await page.locator('#lab-pricing-overlay').waitFor({state:'visible'});
   await page.waitForFunction(()=>!window.__creditFlow.state().pending);
   assert.equal(await page.locator('[data-local-submission]').count(),0,'Credit gate leaves no failed/uncertain local card');
   assert.equal(await page.locator('#image-composer-status').evaluate(n=>n.hidden||!n.classList.contains('is-import-error')),true,'Credit gate has no error toast');
   assert.equal(jobs,scenario==='server-rejection'?1:0);
   if(scenario==='checkout'){
    await page.locator('[data-lab-buy="topup3"]').first().click();
    await page.waitForURL('https://checkout.stripe.com/c/pay/mock');assert.equal(checkouts,1);
    bootBalance=walletBalance=319;
    await page.goto(base+'/lab/studio.html?billing=success');await page.waitForFunction(()=>window.__creditFlowReady);
    const restored=await page.evaluate(()=>window.__creditFlow.state());
    assert.equal(restored.prompt,original.prompt);assert.deepEqual(restored.references,original.references);
    for(const key of ['engine','resolution','aspectRatio','prompt'])assert.equal(restored.settings[key],original.settings[key]);
    assert.equal(jobs,0,'Checkout return restores the draft without generating');
    await page.locator('#image-composer-generate').click();
    await page.waitForFunction(()=>document.querySelector('[data-job="accepted-job"]'));
    assert.equal(jobs,1,'The next explicit Generate submits once');
   }else{
    await page.locator('#lab-pricing-overlay-close').click();
    assert.equal((await page.evaluate(()=>window.__creditFlow.state())).prompt,original.prompt);
    assert.equal(await page.locator('[data-local-submission]').count(),0);
    await page.screenshot({path:`test-results/credit-purchase-${scenario}-${width}.png`});
   }
  }
  assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
  await context.close();console.log('PASS credit purchase flow '+scenario+' '+width);
 }
}finally{await browser.close();server.close();}
