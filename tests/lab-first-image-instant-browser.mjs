// One-click first-image test with synthetic login, mocked quotes and zero paid providers.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const start=source.indexOf('try{clerk=await loadLabAccount();');
const end=source.indexOf('\n',start);
assert.ok(start>=0&&end>start);
const mock=source.slice(0,start)+source.slice(end+1)+`
clerk={isSignedIn:true,user:{id:'welcome-mock'},session:{id:'welcome-session',getToken:async()=> 'synthetic-token'}};
owner=true;customerMode=true;customerGenerationReady=true;userId='welcome-mock';
config={enabled:true,configured:true,geminiEnabled:true,falEnabled:true,higgsfieldEnabled:false,
  concurrency:{image:4,video:1}};
wallet.connect({customer:true,balanceCredits:200,billingReady:true,products:[]});
$('app').hidden=false;$('gate').hidden=true;
setTool('image');
await loadHistory();
showWelcomeStart({customer:true,generationReady:true,balanceCredits:200,accountClosed:false,billingReview:false});
finishLabBoot();
update();
window.__welcomeMockReady=true;
`;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[extname(file)]||'text/plain');
  res.end(pathname==='/lab/lab.js'?mock:readFileSync(file));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1536,height:864}});
const page=await context.newPage(),api='https://parallel-vision-lab.parallelvision.workers.dev';
const errors=[],requests=[],quotes=new Map();let seq=1,submissions=0;
const id=()=> '30000000-0000-4000-8000-'+String(seq++).padStart(12,'0');
page.on('pageerror',error=>errors.push(error.message));
await context.route('https://**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(!url.href.startsWith(api))return route.abort();
  const path=url.pathname,data=request.headers()['content-type']?.includes('application/json')?request.postDataJSON():{};
  requests.push({path,method:request.method(),data});
  const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/api/jobs'&&request.method()==='GET')return send({jobs:[],activeJobs:[],next:null,concurrency:{image:4,video:1}});
  if(path==='/api/packs')return send({packs:[]});
  if(path==='/api/soul-pro/identity')return send({configured:false,count:0,refs:[]});
  if(path==='/api/uploads')return send({id:id()},201);
  if(path==='/api/quotes'){
    await new Promise(done=>setTimeout(done,1400));
    const quote={id:id(),provider:'SpicyAPI',settings:{...data.settings,type:'image',mode:'image'},
      maxUsd:.04,estimatedUsd:.04,creditCost:25,expiresAt:Date.now()+180000};
    quotes.set(quote.id,quote);
    return send(quote);
  }
  if(path==='/api/jobs'&&request.method()==='POST'){
    assert.equal(data.confirm,true);
    assert.ok(quotes.has(data.quoteId),'One-click must use an authenticated bound price');
    submissions++;
    await new Promise(done=>setTimeout(done,300));
    return send({job:{id:id(),status:'queued',createdAt:Date.now(),
      settings:quotes.get(data.quoteId).settings,estimatedUsd:.04}},202);
  }
  if(path==='/api/customer/image-price')return send({kind:'server-estimate',source:'backend-model-rate',
    credits:25,count:1,expiresAt:Date.now()+120000});
  return send({error:'Unmocked '+path},404);
});
try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=image',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__welcomeMockReady===true,undefined,{timeout:20000});
  assert.equal(await page.locator('#lab-welcome-start').isVisible(),true);
  assert.equal(await page.locator('.lab-welcome-preset[aria-pressed="true"]').count(),0,
    'No card should claim selection before the user selects it');
  const button=page.locator('#image-composer-generate');
  await page.locator('[data-welcome-mood="hong-kong-nights"]').click();
  assert.match(await page.locator('#image-composer-prompt').inputValue(),/jade-green-lit corner shop/);
  assert.equal(await button.isEnabled(),true,'Green Haze must enable Generate in the same click');
  await page.locator('[data-welcome-mood="dream-blur"]').click();
  assert.match(await page.locator('#image-composer-prompt').inputValue(),/blue motion blur/);
  assert.equal(await button.isEnabled(),true,'Dream Blur must instantly enable Generate before the price');
  const heightBefore=await button.evaluate(el=>el.getBoundingClientRect().height);
  await button.click();
  assert.equal(await button.isDisabled(),true,'Second click is disabled until the first request is confirmed');
  await page.waitForFunction(()=>document.querySelector('#image-composer-status')?.textContent.includes('Preparing'),undefined,{timeout:15000});
  const timeout=Date.now()+25000;
  while(submissions<1&&Date.now()<timeout)await new Promise(done=>setTimeout(done,60));
  assert.equal(submissions,1,'One click must create exactly one paid job');
  assert.equal(requests.filter(x=>x.path==='/api/jobs'&&x.method==='POST').length,1);
  assert.equal(requests.filter(x=>x.path==='/api/quotes').length>=1,true);
  assert.ok(quotes.size>=1);
  assert.equal(await button.evaluate(el=>el.getBoundingClientRect().height),heightBefore,
    'Generate dimensions must not change while checking price or submitting');
  assert.deepEqual(errors,[]);
  console.log('FIRST_IMAGE_INSTANT_QUOTED_GENERATE_OK=1');
}finally{
  await context.close();
  await browser.close();
  await new Promise(done=>server.close(done));
}
