// Browser-only customer preview checks. Mocked API and synthetic images.
// No paid generation, real credentials, third-party calls or personal data.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf("try{clerk=await loadLabAccount();");
assert.ok(boot>0,'Studio bootstrap must be found');
const authEnd=source.indexOf('\n',boot);
assert.ok(authEnd>boot,'Clerk bootstrap must end before editor tool handlers');
const mocked=source.slice(0,boot)+source.slice(authEnd+1)+`
clerk={isSignedIn:true,user:{id:'user_browser'},session:{id:'test-customer-session',getToken:async()=> 'synthetic-token'}};
owner=true;customerMode=true;customerGenerationReady=true;userId='user_browser';
config={enabled:true,configured:true,geminiEnabled:true,falEnabled:true,
  higgsfieldEnabled:false,videoEngines:['wan'],concurrency:{image:10,video:3}};
wallet.connect({customer:true,balanceCredits:1000,billingReady:true,products:[],
  soulIdTrainingCredits:400,soul2ImageCredits:7});
$('app').hidden=false;$('gate').hidden=true;
await loadHistory();await loadPacks();await loadSoulProIdentity();
setTool('image');update();
const isWelcomeLink=new URLSearchParams(location.search).get('welcome')==='1';
if(isWelcomeLink){
  wallet.connect({customer:true,balanceCredits:200,billingReady:true,products:[],
    soulIdTrainingCredits:400,soul2ImageCredits:7});
}
// The normal Image route must welcome eligible first-time customers too.
showWelcomeStart({customer:true,generationReady:true,balanceCredits:isWelcomeLink?200:1000,accountClosed:false,billingReview:false});
window.__customerTest={lock};
`;
const port=4194;
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost'),pathname=u.pathname;
 const path=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[extname(path)]||'text/plain');
 res.end(pathname==='/lab/lab.js'?mocked:readFileSync(path));
});
await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1420,height:960}});
const page=await context.newPage(),errors=[],requests=[],vendorQuotes=new Map();
let number=1,paidJobs=0;
page.on('pageerror',e=>errors.push(e.message));
const id=()=> '20000000-0000-4000-8000-'+String(number++).padStart(12,'0');
await context.route('https://**/*',async route=>{
 const req=route.request(),url=new URL(req.url());if(!url.href.startsWith('https://parallel-vision-lab.parallelvision.workers.dev'))return route.abort();
 const path=url.pathname,data=req.headers()['content-type']?.includes('application/json')?req.postDataJSON():{};
 requests.push({path,data,method:req.method()});
 const send=(x,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(x)});
 if(path==='/api/jobs'&&req.method()==='GET')return send({jobs:[],activeJobs:[],next:null,concurrency:{image:10,video:3}});
 if(path==='/api/packs')return send({packs:[]});
 if(path==='/api/soul-pro/identity')return send({configured:false,count:0,refs:[]});
 if(path==='/api/uploads')return send({id:id()},201);
 if(path==='/api/quotes'){
   const price=(data.referenceSourceIds||[]).length?.08:data.settings.resolution==='2k'?.06:.036;
   const quote=()=>{
     const q={id:id(),provider:'SpicyAPI',settings:{...data.settings,type:'image',mode:'image'},
       maxUsd:price,estimatedUsd:price,creditCost:Math.max(7,Math.ceil(Math.round(price*1e6)*460/1e6)),expiresAt:Date.now()+180000};
     vendorQuotes.set(q.id,q);return q;
   };
   return send(data.count?{quotes:Array.from({length:data.count},quote)}:quote());
 }
 if(path==='/api/jobs'&&req.method()==='POST'){
   assert.equal(data.confirm,true);
   assert.ok(vendorQuotes.has(data.quoteId),'Paid job must reuse existing quoted ID');
   paidJobs++;
   await new Promise(resolve=>setTimeout(resolve,450));
   return send({job:{id:id(),status:'queued',settings:vendorQuotes.get(data.quoteId).settings,
     estimatedUsd:vendorQuotes.get(data.quoteId).maxUsd,createdAt:Date.now()}},202);
 }
 if(path==='/api/customer/image-price')return send({kind:'server-estimate',source:'backend-model-rate',
   credits:data.settings.engine==='flash'?9*data.count:62*data.count,
   count:data.count,expiresAt:Date.now()+120000});
 return send({error:'Unmocked '+path},404);
});
try{
 await page.goto('http://127.0.0.1:'+port+'/lab/studio.html?tool=image');
 await page.waitForFunction(()=>!!window.__customerTest);
assert.equal(await page.locator('#lab-welcome-start').isVisible(),true,'Default Image route must not hide first-image onboarding');
assert.equal(await page.locator('#lab-welcome-balance').textContent(),'1,000 credits');
 await page.fill('#image-composer-prompt','Photographic fashion study, natural light.');
 // Pricing can complete before the next browser animation frame. Verify the
 // final server-quoted price rather than requiring a transient status message.
 assert.equal((await page.locator('#image-composer-generate .composer-generate-label').textContent()).trim(),
   'Generate','Typing must not change Generate into an unapproved action');
 await page.waitForFunction(()=>document.querySelector('#image-composer-generate')?.getAttribute('aria-label')==='Generate · 17 credits');
 assert.equal(await page.locator('#image-composer-ratio').inputValue(),'16:9');
 assert.equal(requests.filter(x=>x.path==='/api/quotes').length,1);
 console.log('PASS text defaults to 16:9 and uses 17 backend-quoted credits');
 await page.selectOption('#image-composer-resolution','2k');
 await page.waitForFunction(()=>document.querySelector('#image-composer-generate')?.getAttribute('aria-label')==='Generate · 28 credits');
 assert.equal(requests.filter(x=>x.path==='/api/quotes').length,2);
 console.log('PASS resolution change refreshes live backend credit price');
 await page.selectOption('#image-composer-count','2');
 await page.waitForFunction(()=>document.querySelector('#image-composer-generate')?.getAttribute('aria-label')==='Generate · 56 credits');
 const quoteCalls=requests.filter(x=>x.path==='/api/quotes');
 assert.equal(quoteCalls.at(-1).data.count,2);
 console.log('PASS image count produces two bound quotes and their combined price');
 await page.click('#image-composer-generate');
 await page.waitForFunction(()=>document.querySelector('#image-composer-status')?.textContent==='Submitting…');
 assert.equal(await page.locator('#image-composer-generate').textContent(),'Generate','Submission progress must not replace Generate');
 assert.equal(await page.locator('#image-composer-generate').getAttribute('aria-busy'),'true');
 await page.waitForFunction(()=>!document.querySelector('#generate').disabled);
 assert.equal(paidJobs,2);
 const firstSubmission=requests.findIndex(x=>x.path==='/api/jobs'&&x.method==='POST');
 assert.equal(requests.slice(0,firstSubmission).filter(x=>x.path==='/api/quotes').length,3,'Generate must use the displayed quote IDs without repricing');
 assert.equal(requests.filter(x=>x.path==='/api/jobs'&&x.method==='POST').length,2);
 console.log('PASS Generate uses the bound price without a second quote or double charge');
 // Set a 3:4 base photo and verify that it follows the reference until overridden.
 const png=Buffer.from((await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=300;canvas.height=400;
   const c=canvas.getContext('2d');c.fillStyle='#999';c.fillRect(0,0,300,400);
   return canvas.toDataURL('image/png').split(',')[1];
 })),'base64');
 await page.locator('#reference-images').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:png});
 await page.waitForFunction(()=>document.querySelectorAll('.reference-item').length===1);
 await page.waitForFunction(()=>document.querySelector('#image-composer-ratio')?.value==='3:4');
 await page.waitForFunction(()=>document.querySelector('#image-composer-generate')?.getAttribute('aria-label')==='Generate · 74 credits');
 assert.equal(requests.filter(x=>x.path==='/api/quotes').at(-1).data.settings.aspectRatio,'3:4');
 console.log('PASS uploaded 3:4 Base image uses its matching concrete aspect and reprices references');
 await page.selectOption('#image-composer-ratio','1:1');
 await page.waitForFunction(()=>document.querySelector('#image-composer-generate')?.getAttribute('aria-label')==='Generate · 74 credits');
 assert.equal(await page.locator('#image-composer-ratio').inputValue(),'1:1');
 console.log('PASS explicit aspect ratio overrides Auto and remains selected');
 // The new welcome route uses the same priced composer. Presets NEVER charge on selection.
 const welcome=await context.newPage();
 welcome.on('pageerror',e=>errors.push(e.message));
 await welcome.goto('http://127.0.0.1:'+port+'/lab/studio.html?tool=image&welcome=1');
 await welcome.waitForFunction(()=>!!window.__customerTest);
 assert.equal(await welcome.locator('#lab-welcome-start').isVisible(),true);
 assert.equal(await welcome.locator('#lab-welcome-balance').textContent(),'200 credits');
 assert.equal(await welcome.locator('[data-welcome-mood]').count(),7,'The current editorial onboarding has seven curated looks');
 const beforeWelcomeSubmit=paidJobs;
 await welcome.click('[data-welcome-mood="dream-blur"]');
 assert.match(await welcome.locator('#image-composer-prompt').inputValue(),/motion blur/i);
 assert.equal(await welcome.locator('#image-engine').inputValue(),'seedream');
 assert.equal(await welcome.locator('#image-composer-resolution').inputValue(),'2k');
 assert.equal(await welcome.locator('#image-composer-count').inputValue(),'1');
 assert.equal(await welcome.locator('#image-composer-ratio').inputValue(),'16:9');
 await welcome.waitForFunction(()=>/^Generate · [\d,]+ credits$/.test(document.querySelector('#image-composer-generate')?.getAttribute('aria-label')||''));
 assert.equal(paidJobs,beforeWelcomeSubmit,'Choosing the free welcome starter must not submit or charge');
 await welcome.click('#image-composer-generate');
 await welcome.waitForFunction(()=>!document.querySelector('#generate').disabled);
 assert.equal(paidJobs,beforeWelcomeSubmit+1,'Only the explicit Generate click submits one provider job');
 console.log('PASS current Inspiration uses authenticated balance, one Seedream 2K image, bound quote and explicit submission');
 await welcome.close();
 assert.deepEqual(errors,[]);
}finally{
 await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));
}
