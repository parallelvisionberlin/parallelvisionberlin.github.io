// Browser regression: attaching a real File uploads before Generate or a paid quote.
// Private API responses are mocked; there is no production auth or provider charge.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf('try{clerk=await loadLabAccount();');
assert.ok(boot>0);
const injected=source.slice(0,boot)+source.slice(source.indexOf('\n// Soul composer:',boot))+`
clerk={isSignedIn:true,user:{id:'user_VideoUpload'},session:{id:'upload-test',getToken:async()=> 'synthetic-token'}};
owner=true;ownerAccount=true;userId='user_VideoUpload';
customerMode=new URLSearchParams(location.search).has('customer');
customerGenerationReady=true;customerCreditBalance=1000;
config={enabled:true,videoEngines:['wan','seedance']};
applyConfig(config);$('app').hidden=false;$('gate').hidden=true;
setTool('video');setMode('reference');await loadHistory();update();window.__videoUploadTest=true;
`;
const server=http.createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+path);
 if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');
 res.end(path==='/lab/lab.js'?injected:readFileSync(file));
});
await new Promise(ok=>server.listen(4227,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true});
const input=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xf4kAAAAASUVORK5CYII=','base64');
const photo=async page=>Buffer.from(await page.evaluate(()=>{
 const c=document.createElement('canvas');c.width=480;c.height=640;
 c.getContext('2d').fillRect(0,0,480,640);return c.toDataURL('image/png').split(',')[1];
}),'base64');
try{
 for(const scenario of ['pending','retry']){
  const context=await browser.newContext({viewport:{width:scenario==='pending'?1440:390,height:900}});
  const page=await context.newPage(),errors=[],uploads=[],quotes=[],jobs=[];
  page.on('pageerror',e=>errors.push(e.message));
  let releaseUpload=null;
  await context.route('https://**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname;
    if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev')return route.abort();
    const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    if(path==='/api/uploads'){
      uploads.push({auth:req.headers().authorization,mime:req.headers()['content-type'],bytes:req.postDataBuffer()?.length||0});
      if(scenario==='pending'&&uploads.length===1)await new Promise(resolve=>{releaseUpload=resolve;});
      if(scenario==='retry'&&uploads.length===1)return send({error:'Private upload temporarily unavailable'},503);
      return send({id:'30000000-0000-4000-8000-000000000001'},201);
    }
    if(path==='/api/quotes'){
      const body=req.postDataJSON();quotes.push(body);
      return send({id:'quote-test-'+quotes.length,
        settings:{...body.settings,model:'bytedance/seedance-2.5/reference-to-video'},
        creditCost:178,expiresAt:Date.now()+290000,estimatedUsd:1,maxUsd:1});
    }
    if(path==='/api/jobs'&&req.method()==='POST')jobs.push(path);
    return send(path==='/api/jobs'?{jobs:[],activeJobs:[],next:null}:path==='/api/packs'?{packs:[]}:{});
  });
  await page.goto('http://127.0.0.1:4227/lab/studio.html?tool=video'+(scenario==='retry'?'&customer=1':''));
  await page.waitForFunction(()=>window.__videoUploadTest);
  assert.equal(await page.locator('#prompt').inputValue(),'');
  const png=await photo(page);
  await page.locator('#reference-images').setInputFiles({name:'camera.png',mimeType:'image/png',buffer:png});
  await page.waitForFunction(()=>document.getElementById('reference-list').children.length>0);
  if(scenario==='pending'){
    await page.waitForFunction(()=>document.getElementById('reference-progress').textContent.includes('Uploading'));
    assert.equal(uploads.length,1);
    assert.equal(await page.locator('#generate').isDisabled(),true);
    assert.match(await page.locator('#generate').textContent(),/Uploading references/);
    assert.equal(quotes.length,0,'No quote before the original is uploaded');
    assert.equal(jobs.length,0,'No provider job was submitted');
    assert.equal(await page.locator('#reference-upload-meter').isVisible(),true);
    assert.equal(uploads[0].auth,'Bearer synthetic-token');
    assert.equal(uploads[0].mime,'image/png');
    assert.ok(uploads[0].bytes>100);
    releaseUpload();
  }else{
    await page.getByRole('button',{name:/Retry upload/i}).waitFor();
    assert.equal(uploads.length,1);
    assert.equal(await page.locator('#generate').isDisabled(),true);
    assert.match(await page.locator('#generate').textContent(),/Retry reference upload/);
    assert.equal(quotes.length,0);
    await page.getByRole('button',{name:/Retry upload/i}).click();
  }
  await page.waitForFunction(()=>document.getElementById('reference-progress').textContent.includes('All 1 references uploaded'));
  assert.equal(uploads.length,scenario==='pending'?1:2);
  assert.equal(quotes.length,0);
  await page.locator('#prompt').fill('Subtle cinematic motion in soft daylight.');
  await page.waitForFunction(()=>!!document.getElementById('generate').dataset.credits);
  assert.equal(await page.locator('#generate').isEnabled(),true);
  assert.equal(quotes.length,1);
  assert.equal(uploads.length,scenario==='pending'?1:2,'Quote must reuse the attached private source ID');
  assert.deepEqual(quotes[0].referenceSourceIds,['30000000-0000-4000-8000-000000000001']);
  await page.locator('#generate').click();
  await page.locator('#quote-dialog').waitFor({state:'visible'});
  assert.equal(jobs.length,0,'Price review never authorizes or submits a paid generation');
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('VIDEO_REFERENCE_PREUPLOAD_PASS '+scenario);
 }
}finally{await browser.close();server.close();}
