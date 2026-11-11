// Real Studio modules with synthetic accounts/media. All provider requests are intercepted.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8'),boot=source.indexOf('try{clerk=await loadLabAccount();'),tail=source.indexOf('\n// Soul composer:',boot);
assert.ok(boot>0&&tail>boot);
const injected=source.slice(0,boot)+source.slice(tail)+`
clerk={isSignedIn:true,user:{id:'kling-test'},session:{id:'mock',getToken:async()=> 'synthetic'}};
owner=true;ownerAccount=true;userId='kling-test';
config={enabled:true,falEnabled:true,videoEngines:['seedance','kling3','kling4']};
applyConfig(config);$('app').hidden=false;$('gate').hidden=true;
setTool('video');$('video-engine').value='kling4';$('video-engine').dispatchEvent(new Event('change'));
await loadHistory();update();syncVideoStudioMode();window.__pvLabFinishBoot?.();
window.__kling={settings,inputs:ensureInputs,mode:setMode,clear:clearMedia,
  refs:async()=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;const blob=await new Promise(r=>canvas.toBlob(r));await addReferences(Array.from({length:6},(_,i)=>new File([blob],'view-'+i+'.png',{type:'image/png'})));},
  frame:async()=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;const blob=await new Promise(r=>canvas.toBlob(r));await setImage(new File([blob],'front.png',{type:'image/png'}));}};
`;
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+pathname);
  if(!path.startsWith(root+sep)||!existsSync(path)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[extname(path)]||'application/octet-stream');
  res.end(pathname==='/lab/lab.js'?injected:readFileSync(path));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true});mkdirSync('test-results',{recursive:true});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:950}}),errors=[],generationPosts=[];let asset=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',async route=>{
    const r=route.request(),url=new URL(r.url());
    if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev')return route.abort();
    if(url.pathname==='/api/jobs'&&r.method()==='POST')generationPosts.push(url.pathname);
    let payload=url.pathname==='/api/jobs'?{jobs:[],activeJobs:[],next:null}:url.pathname==='/api/packs'?{packs:[]}:{error:'Unexpected test request'};
    if(url.pathname==='/api/uploads')payload={id:'00000000-0000-4000-8000-'+String(++asset).padStart(12,'0')};
    if(url.pathname==='/api/quotes'){const body=r.postDataJSON();payload={id:'quote',creditCost:123,estimatedUsd:0.785,maxUsd:0.785,expiresAt:Date.now()+100000,settings:body.settings,provider:'fal.ai',priceIsEstimate:true};}
    await route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=video');
  await page.waitForFunction(()=>window.__kling);
  assert.deepEqual(errors,[],'Studio must initialize without runtime errors');
  assert.equal(await page.locator('#video-engine').inputValue(),'kling4');
  assert.equal(await page.locator('#mode-extend').isVisible(),false);
  assert.equal(await page.locator('#seed').isVisible(),false);
  assert.equal(await page.locator('#resolution option').allTextContents().then(x=>x.join(',')),'720P,1080P');
  await page.evaluate(()=>window.__kling.mode('reference'));
  await page.evaluate(()=>window.__kling.refs());
  const inputs=await page.evaluate(()=>window.__kling.inputs());assert.equal(inputs.referenceSourceIds.length,6);
  await page.locator('#prompt').fill('Follow the same character through the studio.');
  const selected=await page.evaluate(()=>window.__kling.settings());assert.equal(selected.provider,'fal');assert.equal(selected.engine,'kling4');assert.equal(selected.audio,true);
  await page.screenshot({path:'test-results/kling4-references-'+width+'.png',fullPage:true});
  await page.evaluate(()=>{window.__kling.clear();window.__kling.mode('start');});
  await page.evaluate(()=>window.__kling.frame());
  assert.ok((await page.evaluate(()=>window.__kling.inputs())).sourceId);
  await page.locator('#kling4-settings summary').click();
  assert.equal(await page.locator('#kling4-settings').evaluate(e=>getComputedStyle(e).order),'5');
  assert.equal(await page.locator('#pv-video-current-audio').textContent(),'Included');
  await page.screenshot({path:'test-results/kling4-settings-'+width+'.png',fullPage:true});
  await page.evaluate(()=>window.__kling.mode('transform'));
  assert.match(await page.locator('#mode-transform').innerText(),/Edit video/);
  assert.equal(await page.locator('#video-media-drop').isVisible(),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
  assert.deepEqual(errors,[]);assert.deepEqual(generationPosts,[]);await page.close();
 }
 console.log('Kling 4 browser checks passed at 390px and 1440px. No generation submitted.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
