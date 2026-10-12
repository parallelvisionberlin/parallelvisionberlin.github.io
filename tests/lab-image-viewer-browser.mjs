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
owner=true;userId='test';await deviceMediaCache.select(userId);config={enabled:true,concurrency:{image:4,video:1}};
$('app').hidden=false;$('gate').hidden=true;
await loadHistory();await restoreStudioEntry();update();finishLabBoot();
window.__viewerTest={lock,flush:async()=>{await Promise.allSettled([...assetReads.values(),...thumbnailReads.values()]);await deviceMediaCache.select(userId);},customer:()=>wallet.connect({customer:true,balanceCredits:1000,billingReady:false,products:[]}),state:()=>({job:imageDetailJob?.id,result:resultId,cache:assetBlobs.size,prefetch:imageDetailPrefetchReads})};`;
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+pathname);
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'text/plain');
  res.end(pathname==='/lab/lab.js'?testSource:readFileSync(path));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.PV_CHROMIUM_EXECUTABLE||undefined});
const paintedFrame=page=>page.evaluate(()=>{
  const img=document.querySelector('#image-lightbox-img'),stage=document.querySelector('#image-lightbox-stage');
  const box=img.getBoundingClientRect(),space=stage.getBoundingClientRect(),style=getComputedStyle(stage);
  const availableWidth=space.width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
  const availableHeight=space.height-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
  const scale=Math.min(box.width/img.naturalWidth,box.height/img.naturalHeight);
  const width=img.naturalWidth*scale,height=img.naturalHeight*scale;
  return {x:box.x+(box.width-width)/2,y:box.y+(box.height-height)/2,width,height,availableWidth,availableHeight,
    imageWidth:box.width,imageHeight:box.height,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight};
});
const assertFitted=frame=>assert.ok(Math.abs(frame.width-frame.availableWidth)<2||Math.abs(frame.height-frame.availableHeight)<2,
  'Preview must fill the available width or height immediately: '+JSON.stringify(frame));
try{
  for(const width of [1440,390])for(const shape of ['landscape','portrait','square']){
    const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true});
    const page=await context.newPage(),errors=[],reads=new Map(),gates=new Map(),held=new Map();
    page.on('pageerror',e=>errors.push(e.message));
    const images=await page.evaluate(shape=>Array.from({length:5},(_,i)=>{
      const canvas=document.createElement('canvas');canvas.width=640+i*100;
      canvas.height=shape==='portrait'?1200:shape==='square'?canvas.width:480;
      const ctx=canvas.getContext('2d');ctx.fillStyle=['#c44','#4c4','#44c','#cc4','#c4c'][i];ctx.fillRect(0,0,canvas.width,canvas.height);
      const full=canvas.toDataURL().split(',')[1];canvas.width/=10;canvas.height/=10;
      ctx.fillStyle=['#c44','#4c4','#44c','#cc4','#c4c'][i];ctx.fillRect(0,0,canvas.width,canvas.height);
      return {full,thumb:canvas.toDataURL().split(',')[1]};
    }),shape);
    for(let i=0;i<5;i++)gates.set('out-'+i,new Promise(resolve=>held.set('out-'+i,resolve)));
    const jobs=images.map((_,i)=>({id:'job-'+i,outputId:'out-'+i,status:'completed',createdAt:Date.now()-i,
      settings:{type:'image',mode:'image',engine:'seedream',prompt:'Test '+i,resolution:'1k',aspectRatio:'auto'}}));
    await context.route('https://**/*',async route=>{
      const req=route.request(),url=new URL(req.url()),path=url.pathname;
      if(url.origin!=='https://parallel-vision-lab.parallelvision.workers.dev')return route.abort();
      assert.equal(req.method(),'GET','Viewing must not submit a generation or any write');
      const send=body=>route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
      if(path==='/api/jobs')return send({jobs,activeJobs:[],next:null});
      if(path==='/api/customer/account')return send({storage:{bytes:1024**3,files:5,limitBytes:20*1024**3}});
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
    assertFitted(await paintedFrame(page));
    assert.equal(await page.locator('#image-detail-next').isDisabled(),false);
    assert.equal(await page.locator('#image-lightbox-download').isDisabled(),true);
    await page.waitForFunction(()=>window.__viewerTest.state().prefetch===1);
    assert.ok(reads.size<=2,'Only current image and one speculative read start');
    const navigation=await page.evaluate(()=>{
      const start=performance.now();
      document.querySelector('#image-detail-next').click();
      document.querySelector('#image-detail-next').click();
      return {ms:performance.now()-start,...window.__viewerTest.state(),src:document.querySelector('#image-lightbox-img').src};
    });
    assert.equal(navigation.job,'job-2','Rapid arrow presses work before originals finish');
    assert.ok(navigation.src.startsWith('blob:'));
    assert.ok(navigation.ms<250,'Preview selection responds without waiting on network');
    await page.waitForFunction(()=>document.querySelector('#image-lightbox-img').naturalWidth===84);
    const previewFrame=await paintedFrame(page);assertFitted(previewFrame);
    held.get('out-0')();held.get('out-1')();
    await page.waitForFunction(()=>window.__viewerTest.state().cache>=2);
    assert.equal((await page.evaluate(()=>window.__viewerTest.state())).job,'job-2','Late previous requests cannot replace current metadata');
    assert.equal((await page.evaluate(()=>window.__viewerTest.state())).result,null,'Late previous requests cannot activate stale download');
    held.get('out-2')();
    await page.waitForFunction(()=>document.querySelector('#image-lightbox-img').naturalWidth===840&&!document.querySelector('#image-lightbox-download').disabled);
    assert.equal((await page.evaluate(()=>window.__viewerTest.state())).result,'out-2');
    const fullFrame=await paintedFrame(page);assertFitted(fullFrame);
    for(const key of ['x','y','width','height'])assert.ok(Math.abs(previewFrame[key]-fullFrame[key])<2,
      'Original must replace preview without moving or resizing: '+JSON.stringify({key,previewFrame,fullFrame}));
    await page.click('#image-lightbox-fit');
    const zoom=await paintedFrame(page);
    assert.equal(zoom.imageWidth,zoom.naturalWidth,'100% zoom must retain original pixel width');
    assert.equal(zoom.imageHeight,zoom.naturalHeight,'100% zoom must retain original pixel height');
    await page.click('#image-lightbox-fit');assertFitted(await paintedFrame(page));
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
    await page.evaluate(()=>window.__viewerTest.flush());
    const beforeReload=[...reads.entries()];
    await page.reload();await page.waitForFunction(()=>!!window.__viewerTest);
    await page.locator('#history .card').nth(1).evaluate(el=>el.click());
    await page.waitForFunction(()=>!document.querySelector('#image-lightbox-download').disabled);
    assert.deepEqual([...reads.entries()],beforeReload,'Returning to the gallery reuses originals across a page reload');
    await page.click('#image-lightbox-close');
    await page.evaluate(()=>window.__viewerTest.customer());await page.click('#lab-wallet-toggle');
    // Storage and account closure now live on the account page; lab-account-browser covers both.
    assert.equal(await page.locator('#lab-credits-dialog a').getAttribute('href'),'./account.html#billing','The compact purchase deck keeps account management reachable');
    assert.equal(await page.locator('#lab-credits-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'Credit controls fit the dialog');
    await page.click('#lab-credits-close');
    await page.evaluate(()=>window.__viewerTest.lock());
    assert.equal((await page.evaluate(()=>window.__viewerTest.state())).cache,0,'Sign out clears private original cache');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({width,shape,previewWidth:Math.round(previewFrame.width),fullWidth:Math.round(fullFrame.width),rapidTwoArrowMs:Math.round(navigation.ms),passed:'stable fitted preview, unchanged frame on original upgrade, native zoom, nonblocking arrows, prefetch, stale responses, correct download, close, sign-out'}));
    await context.close();
  }
}finally{await browser.close();await new Promise(r=>server.close(r));}
