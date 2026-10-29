// Full Studio History with synthetic auth and intercepted APIs only. No paid requests.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf('try{clerk=await loadLabAccount();'),tail=source.indexOf('\n// Soul composer:',boot);
assert.ok(boot>0&&tail>boot);
const mock=source.slice(0,boot)+source.slice(tail)+`
clerk={isSignedIn:true,user:{id:'history-account'},session:{id:'synthetic',getToken:async()=> 'synthetic-token'},signOut:async()=>{}};
owner=true;ownerAccount=true;userId='history-account';
config={enabled:true,dailyLimitUsd:10,concurrency:{image:4,video:1}};
$('app').hidden=false;$('gate').hidden=true;
await loadHistory();update();finishLabBoot();
window.__historyBrowser={lock};window.__historyBrowserReady=true;
`;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.end(pathname==='/lab/lab.js'?mock:readFileSync(file));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true});
const origin='http://127.0.0.1:'+server.address().port;
const cursor={before:100,afterId:'image-23'};
const job=(id,type='image')=>({id,outputId:'out-'+id,status:'completed',createdAt:100,
  settings:{type,mode:type==='image'?'image':'start',engine:type==='image'?'seedream':'wan',prompt:'Synthetic History fixture',aspectRatio:'1:1',resolution:'1k'}});
const initial=Array.from({length:24},(_,i)=>job('image-'+i));
const pageData=(jobs,next=null)=>({jobs,next,activeJobs:[]});
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4uoAAAAASUVORK5CYII=','base64');
try{
  for(const width of [1440,390]){
    const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
    const reads=[],errors=[],writes=[],readWaiters=new Map();
    page.on('pageerror',e=>errors.push(e.message));
    await context.addInitScript(()=>{
      window.__historyPreviewEvents=[];
      document.addEventListener('pv-image-preview-account',e=>window.__historyPreviewEvents.push(e.detail));
    });
    await context.route('https://**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.origin!=='https://parallel-vision-lab.parallelvision.workers.dev')return route.abort();
      if(request.method()!=='GET'){writes.push(url.pathname);return route.abort();}
      if(url.pathname==='/api/jobs'){
        const entry={url};reads.push(entry);
        if(reads.length===1)return route.fulfill({contentType:'application/json',body:JSON.stringify(pageData(initial,cursor))});
        const pending=new Promise(resolve=>{entry.reply=resolve;});
        readWaiters.get(reads.length)?.();
        const response=await pending;
        return route.fulfill({status:response.status||200,contentType:'application/json',body:JSON.stringify(response.body)}).catch(()=>{});
      }
      if(url.pathname.startsWith('/api/assets/'))return route.fulfill({contentType:'image/png',body:png});
      return route.fulfill({contentType:'application/json',body:JSON.stringify(url.pathname==='/api/packs'?{packs:[]}:{})});
    });
    const waitRead=count=>reads.length===count?Promise.resolve():new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Expected History request '+count)),15000);
      readWaiters.set(count,()=>{clearTimeout(timer);resolve();});
    });
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.goto(origin+'/lab/studio.html?tool=image');
    await page.waitForFunction(()=>window.__historyBrowserReady===true);
    assert.equal(await page.locator('#history .card').count(),24);
    assert.deepEqual(await page.evaluate(()=>window.__historyPreviewEvents),[{userId:'history-account',hasHistory:true}]);

    const older=waitRead(2);await page.locator('#more').scrollIntoViewIfNeeded();await older;
    assert.equal(reads[1].url.searchParams.get('before'),'100');
    assert.equal(reads[1].url.searchParams.get('afterId'),'image-23');
    await settle();assert.equal(reads.length,2,'one cursor request while in flight');
    reads[1].reply({status:503,body:{error:'Synthetic offline page'}});
    await page.getByRole('button',{name:'Retry loading earlier work',exact:true}).waitFor();
    await settle();assert.equal(reads.length,2,'failed pages must not loop automatically');
    const retry=waitRead(3);await page.getByRole('button',{name:'Retry loading earlier work',exact:true}).click();await retry;
    assert.equal(reads[2].url.href,reads[1].url.href,'manual retry retains the exact cursor');
    reads[2].reply({body:pageData([job('older-image')])});
    await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===25);
    assert.equal(await page.locator('#more').isVisible(),false);
    assert.equal(await page.locator('[data-job="image-0"]').count(),1,'earlier page preserves existing work');
    assert.equal((await page.evaluate(()=>window.__historyPreviewEvents)).length,1,'append never republishes the initial preference');

    const changed=waitRead(4);await page.locator('#tool-video').click();await changed;
    const filtered=waitRead(5);await page.locator('#tool-image').click();await filtered;
    assert.equal(await page.locator('#history .card').count(),0);
    const staleResponse=page.waitForResponse(response=>response.url()===reads[3].url.href);
    reads[3].reply({body:pageData([job('stale-video','video')],cursor)});await staleResponse;await settle();
    assert.equal(await page.locator('[data-job="stale-video"]').count(),0);
    assert.equal((await page.evaluate(()=>window.__historyPreviewEvents)).length,1);
    reads[4].reply({body:pageData([])});
    await page.waitForFunction(()=>window.__historyPreviewEvents.length===2);
    assert.deepEqual(await page.evaluate(()=>window.__historyPreviewEvents.at(-1)),{userId:'history-account',hasHistory:false});

    const pending=waitRead(6);await page.locator('#refresh').click();await pending;
    await page.evaluate(()=>window.__historyBrowser.lock());
    reads[5].reply({body:pageData([job('private-stale-image')],cursor)});await settle();
    assert.equal(await page.locator('#history .card').count(),0);
    assert.equal(await page.locator('#more').isVisible(),false);
    assert.deepEqual(await page.evaluate(()=>window.__historyPreviewEvents.at(-1)),{userId:''});
    assert.deepEqual(writes,[],'History verification makes no uploads, quotes, generation or billing writes');
    assert.deepEqual(errors,[],'full Studio has no browser exceptions');
    console.log('PASS History '+width+'px: real publisher, cursor pagination, retained cards, guarded retry, stale filters and sign-out, zero writes');
    await context.close();
  }
}finally{
  await browser.close();await new Promise(done=>server.close(done));
}
