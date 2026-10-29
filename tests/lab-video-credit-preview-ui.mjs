// Mocked quote previews only. No real account, payment or generation.
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
clerk={isSignedIn:true,user:{id:'user_VideoPrice'},session:{id:'price-test',getToken:async()=> 'synthetic-token'}};
owner=true;ownerAccount=true;userId='user_VideoPrice';
customerMode=new URLSearchParams(location.search).get('role')==='customer';
customerGenerationReady=true;customerCreditBalance=1000;
config={enabled:true,videoEngines:['wan','seedance']};
applyConfig(config);$('app').hidden=false;$('gate').hidden=true;
setTool('video');setMode('text');await loadHistory();update();window.__videoPriceTest=true;
`;
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+pathname);
 if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');
 res.end(pathname==='/lab/lab.js'?injected:readFileSync(path));
});
await new Promise(r=>server.listen(4198,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
mkdirSync('test-results',{recursive:true});
try{
 for(const width of [1440,390])for(const role of ['owner','customer']){
  const context=await browser.newContext({viewport:{width,height:950}}),page=await context.newPage(),quotes=[],jobs=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev')return route.abort();
   let payload=url.pathname==='/api/jobs'?{jobs:[],activeJobs:[],next:null}:url.pathname==='/api/packs'?{packs:[]}:{error:'Unexpected request'};
   if(req.method()==='POST'&&url.pathname==='/api/jobs')jobs.push(url.pathname);
   if(url.pathname==='/api/quotes'){
    const body=req.postDataJSON();quotes.push(body);
    payload={id:'quote-'+quotes.length,settings:{...body.settings,model:'bytedance/seedance-2.5/text-to-video'},creditCost:body.settings.prompt==='Reject quote'?0:body.settings.duration*10+(body.settings.audio?5:0),expiresAt:Date.now()+290000,estimatedUsd:1,maxUsd:1};
   }
   return route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.goto('http://127.0.0.1:4198/lab/studio.html?tool=video&role='+role);
  await page.waitForFunction(()=>window.__videoPriceTest);
  await page.locator('#prompt').fill('A quiet train moving through rain.');
  await page.waitForFunction(()=>document.getElementById('generate').dataset.credits);
  assert.equal(quotes.length,1);
  const first=await page.locator('#generate').getAttribute('data-credits');
  const options=await page.locator('#duration').evaluate(el=>[...el.options].map(o=>o.value));
  const current=await page.locator('#duration').inputValue();
  await page.locator('#duration').selectOption(options.find(v=>v!==current));
  await page.waitForFunction(old=>{const n=document.getElementById('generate').dataset.credits;return n&&n!==old;},first);
  assert.equal(quotes.length,2);
  // The preview is consumed, not priced again. Confirmation is still required.
  await page.locator('#generate').dblclick();
  await page.locator('#quote-dialog').waitFor({state:'visible'});
  assert.equal(quotes.length,2);
  assert.equal(jobs.length,0);
  assert.equal(await page.locator('#confirm-generation').isEnabled(),true);
  if(role==='customer')assert.match(await page.locator('#quote-price').innerText(),/PV credits/);
  await page.keyboard.press('Escape');
  await page.locator('#prompt').fill('');
  await page.waitForFunction(()=>!document.getElementById('generate').dataset.credits);
  const geometry=await page.locator('#generate').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {right:r.right,width:r.width,radius:s.borderRadius,after:getComputedStyle(el,'::after').maskImage};});
  assert.ok(geometry.right<=width+1&&geometry.width>100);
  assert.equal(geometry.radius,'16px');assert.equal(geometry.after,'none');
  assert.deepEqual(errors,[]);
  const beforeFailure=quotes.length;
  await page.locator('#prompt').fill('Reject quote');
  await page.locator('#generate').click();
  await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('Could not verify the video credit price'));
  assert.equal(quotes.length,beforeFailure+1,'Failed preflight never falls back to a duplicate quote');
  assert.equal(await page.locator('#quote-dialog').isVisible(),false);
  assert.equal(jobs.length,0);
  await page.locator('#prompt').fill('A cinematic train scene.');
  await page.waitForFunction(()=>document.getElementById('generate').dataset.credits);
  await page.screenshot({path:'test-results/video-credit-button-'+width+'-'+role+'.png'});
  await page.getByRole('button',{name:'Image',exact:true}).click();
  assert.equal(await page.locator('#generate').getAttribute('data-video-credit-preview'),null);
  assert.equal(await page.locator('#generate').getAttribute('data-credits'),null);
  console.log('VIDEO_CREDIT_PREVIEW_PASS width='+width+' role='+role);
  await context.close();
 }
}finally{await browser.close();server.close();}
