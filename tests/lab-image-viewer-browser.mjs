// Real browser, synthetic images and held downloads. No account or paid requests.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const start=source.indexOf('try{clerk=await loadLabAccount();'),end=source.indexOf('\n// Soul composer:',start);
assert.ok(start>0&&end>start);
const testSource=source.slice(0,start)+source.slice(end)+`
clerk={session:{id:'test-session',getToken:async()=> 'synthetic-token'}};
owner=true;userId='test';config={enabled:true,concurrency:{image:4,video:1}};
$('app').hidden=false;$('gate').hidden=true;
await loadHistory();await restoreStudioEntry();update();finishLabBoot();
window.__viewerTest={lock,state:()=>({job:imageDetailJob?.id,result:resultId,cache:assetBlobs.size,prefetch:imageDetailPrefetchReads})};`;
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+pathname);
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'text/plain');
  res.end(pathname==='/lab/lab.js'?testSource:readFileSync(path));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.PV_CHROMIUM_EXECUTABLE||undefined});
try{
  for(const width of [1440,390]){
    const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true});
    const page=await context.newPage(),errors=[],reads=new Map(),gates=new Map(),held=new Map();
    page.on('pageerror',e=>errors.push(e.message));
    const images=await page.evaluate(()=>Array.from({length:5},(_,i)=>{
      const canvas=document.createElement('canvas');canvas.width=640+i*100;canvas.height=480;
      const ctx=canvas.getContext('2d');ctx.fillStyle=['#c44','#4c4','#44c','#cc4','#c4c'][i];ctx.fillRect(0,0,canvas.width,canvas.height);
      const full=canvas.toDataURL().split(',')[1];canvas.width=64;canvas.height=48;
      ctx.fillStyle=['#c44','#4c4','#44c','#cc4','#c4c'][i];ctx.fillRect(0,0,64,48);
      return {full,thumb:canvas.toDataURL().split(',')[1]};
    }));
    for(let i=0;i<5;i++)gates.set('out-'+i,new Promise(resolve=>held.set('out-'+i,resolve)));
    const jobs=images.map((_,i)=>({id:'job-'+i,outputId:'out-'+i,status:'completed',createdAt:Date.now()-i,
      settings:{type:'image',mode:'image',engine:'seedream',prompt:'Test '+i,resolution:'1k',aspectRatio:'auto'}}));
    await context.route('https://**/*',async route=>{
      const req=route.request(),url=new URL(req.url()),path=url.pathname;
      if(url.origin!=='https://parallel-vision-lab.parallelvision.workers.dev')return route.abort();
      assert.equal(req.method(),'GET','Viewing must not submit a generation or any write');
      const send=body=>route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
      if(path==='/api/jobs')return send({jobs,activeJobs:[],next:null});
      if(path.startsWith('/api/assets/')){
        const id=path.split('/')[3],i=Number(id.split('-')[1]),thumbnail=path.endsWith('/thumbnail');
        if(!thumbnail){reads.set(id,(reads.get(id)||0)+1);await gates.get(id);}
        try{return await route.fulfill({contentType:'image/png',body:Buffer.from(images[i][thumbnail?'thumb':'full'],'base64')});}catch{}
        return;
      }
      return send({folders:[],packs:[],souls:[],moods:[],configured:false});
    });
    await page.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=image');
    await page.waitForFunction(()=>!!window.__viewerTest);
    // Ensure all synthetic gallery previews have been observed, including mobile rows.
    for(const card of await page.locator('#history .card').all())await card.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>[...document.querySelectorAll('#history img')].every(i=>i.complete&&i.naturalWidth));
    assert.equal(reads.size,0,'Gallery does not eagerly download originals');
    await page.locator('#history .card').first().evaluate(el=>el.click());
    await page.waitForFunction(()=>document.querySelector('#image-lightbox-img').naturalWidth===64);
    assert.equal(await page.locator('#image-lightbox-img').isVisible(),true);
    assert.equal(await page.locator('#image-detail-next').isDisabled(),false);
    assert.equal(await page.locator('#image-lightbox-download').isDisabled(),true);
    await page.waitForFunction(()=>window.__viewerTest.state().prefetch===2);
    assert.ok(reads.size<=3,'Only current image and two speculative reads start');
    const navigation=await page.evaluate(()=>{
      const start=performance.now();
      document.querySelector('#image-detail-next').click();
      document.querySelector('#image-detail-next').click();
      return {ms:performance.now()-start,...window.__viewerTest.state(),src:document.querySelector('#image-lightbox-img').src};
    });
    assert.equal(navigation.job,'job-2','Rapid arrow presses work before originals finish');
    assert.ok(navigation.src.startsWith('blob:'));
    assert.ok(navigation.ms<250,'Preview selection responds without waiting on network');
    held.get('out-0')();held.get('out-1')();
    await page.waitForFunction(()=>window.__viewerTest.state().cache>=2);
    assert.equal((await page.evaluate(()=>window.__viewerTest.state())).job,'job-2','Late previous requests cannot replace current metadata');
    assert.equal((await page.evaluate(()=>window.__viewerTest.state())).result,null,'Late previous requests cannot activate stale download');
    held.get('out-2')();
    await page.waitForFunction(()=>document.querySelector('#image-lightbox-img').naturalWidth===840&&!document.querySelector('#image-lightbox-download').disabled);
    assert.equal((await page.evaluate(()=>window.__viewerTest.state())).result,'out-2');
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(()=>document.querySelector('#image-lightbox-img').naturalWidth===740&&!document.querySelector('#image-lightbox-download').disabled);
    assert.equal(reads.get('out-1'),1,'Returning to a prefetched original reuses its bytes');
    const downloading=page.waitForEvent('download');await page.click('#image-lightbox-download');
    assert.equal((await downloading).suggestedFilename(),'parallel-vision-out-1.png');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    // Close a pending selection, then allow its response to finish.
    await page.evaluate(()=>{for(let i=0;i<3;i++)document.querySelector('#image-detail-next').click();document.querySelector('#image-lightbox-close').click();});
    held.get('out-3')();held.get('out-4')();
    await page.waitForFunction(()=>window.__viewerTest.state().prefetch===0);
    assert.equal(await page.locator('#image-lightbox').evaluate(el=>el.open),false);
    assert.equal((await page.evaluate(()=>window.__viewerTest.state())).result,null);
    assert.ok([...reads.values()].every(n=>n===1),'Concurrent selection and prefetch share each request');
    await page.evaluate(()=>window.__viewerTest.lock());
    assert.equal((await page.evaluate(()=>window.__viewerTest.state())).cache,0,'Sign out clears private original cache');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({width,rapidTwoArrowMs:Math.round(navigation.ms),passed:'instant preview, nonblocking arrows, original upgrade, prefetch, stale responses, correct download, close, sign-out'}));
    await context.close();
  }
}finally{await browser.close();await new Promise(r=>server.close(r));}
