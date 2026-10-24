// Real browser, synthetic images and held downloads. No account or paid requests.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync,statSync} from 'node:fs';
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
window.__viewerTest={lock,emptyVideo:()=>{clearVideoHistorySelection();clearMedia();setMode('reference');update();},seedVideo:()=>{const job={id:'older-video',status:'completed',outputId:'older-output',settings:{type:'video',engine:'seedance',prompt:'OLDER VIDEO PROMPT'}};videoJobCache.set(job.id,job);selectedVideoJob=job;},refreshVideo:restoreLatestVideoSelection,showVideoState:status=>{
  const job={id:'synthetic-video',status,createdAt:Date.now(),settings:{
    type:'video',engine:'seedance15',mode:'start',prompt:'A slow handheld move',
    duration:8,resolution:'720p',aspectRatio:'16:9'}};
  videoJobCache.set(job.id,job);showVideoHistoryRecord(job,{play:false});
},openAssets:()=>assetLibrary.open(),selectHistory:setHistorySelectMode,createVideoGallery:()=>{
  const jobs=Array.from({length:4},(_,i)=>({
    id:'archive-video-'+i,status:'completed',favorite:false,createdAt:Date.now()-i,
    outputId:'video-out-'+i,sourceId:'ref-0',settings:{type:'video',
      engine:'seedance15',mode:'start',prompt:'Synthetic video '+i,
      duration:8,resolution:'720p',aspectRatio:'16:9'}
  }));
  renderCards(jobs,{upsert:false});
  restoreLatestVideoSelection();
},flush:async()=>{await Promise.allSettled([...assetReads.values(),...thumbnailReads.values()]);await deviceMediaCache.select(userId);},customer:()=>wallet.connect({customer:true,balanceCredits:1000,billingReady:false,products:[]}),state:()=>({job:imageDetailJob?.id,result:resultId,cache:assetBlobs.size,prefetch:imageDetailPrefetchReads,tool,mode,sourceId,hasFile:!!file,prompt:$('prompt').value})};`;
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+pathname);
  if(!path.startsWith(root+'/')||!existsSync(path)||!statSync(path).isFile()){res.writeHead(404).end();return;}
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
    let releaseVideoFile;
    const videoFileGate=new Promise(resolve=>{releaseVideoFile=resolve;});
    const writes=[];
    const jobs=images.map((_,i)=>({id:'job-'+i,outputId:'out-'+i,status:'completed',favorite:false,createdAt:Date.now()-i,sourceId:i===1?'ref-0':undefined,
      settings:{type:'image',mode:'image',engine:'seedream',prompt:'Editorial portrait by the window. Warm lamplight, natural texture, quiet atmosphere. Preserve the existing composition and lighting, with understated styling and a photographic finish. Image '+i,resolution:'1k',aspectRatio:'auto',referenceSourceIds:i===1?Array.from({length:6},(_,n)=>'ref-'+n):[]}}));
    // Regression: original Mood Style assets never appear in completed results.
    jobs[2].sourceId='ref-0';
    jobs[2].settings.moodId='dream-blur';
    jobs[2].settings.referenceSourceIds=Array.from({length:5},(_,n)=>'ref-'+n);
    jobs[2].settings.referenceRoles=[{name:'source-photo.jpg',role:'base'},
      ...['01-blue-eye-light-memory.jpg','02-silhouette-blue-room.jpg','03-city-light-trails.jpg','04-abstract-cyan-exposure.jpg']
        .map(name=>({name:'Dream Blur style - '+name,role:'style',note:'OPTICS ONLY'}))];
    jobs[3].sourceId='ref-1';
    jobs[3].settings.moodId='dream-blur';
    jobs[3].settings.referenceSourceIds=['ref-1','ref-2','ref-3','ref-4'];
    jobs[3].settings.referenceRoles=jobs[2].settings.referenceRoles.slice(1);
    await context.route('https://**/*',async route=>{
      const req=route.request(),url=new URL(req.url()),path=url.pathname;
      if(url.origin!=='https://parallel-vision-lab.parallelvision.workers.dev')return route.abort();
      if(path==='/api/library/members'&&req.method()==='POST'){
        const body=req.postDataJSON();writes.push(body);
        for(const job of jobs)if(body.ids.includes(job.id))job.favorite=body.favorite;
        return route.fulfill({contentType:'application/json',body:'{}'});
      }
      assert.equal(req.method(),'GET','Viewer actions must not submit a generation');
      const send=body=>route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
      if(path==='/api/jobs')return send({jobs,activeJobs:[],next:null});
      if(path==='/api/customer/account')return send({storage:{bytes:1024**3,files:5,limitBytes:20*1024**3}});
      if(path.startsWith('/api/assets/')){
        if(path==='/api/assets/video-out-0'){
          reads.set('video-out-0',(reads.get('video-out-0')||0)+1);
          await videoFileGate;
          return route.fulfill({contentType:'video/mp4',body:Buffer.from('synthetic video content')});
        }
        const id=path.split('/')[3],i=Number(id.split('-')[1]),thumbnail=path.endsWith('/thumbnail');
        if(!thumbnail){reads.set(id,(reads.get(id)||0)+1);await gates.get(id);}
        try{return await route.fulfill({contentType:'image/png',body:Buffer.from(images[i%images.length][thumbnail?'thumb':'full'],'base64')});}catch{}
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
    if(shape==='landscape'){
      const thumbnails=page.locator('.image-detail-reference-item');
      await page.waitForFunction(()=>document.querySelectorAll('.image-detail-reference-item img:not([hidden])').length===6);
      assert.equal(await thumbnails.count(),6,'Source and references deduplicate into six ordered thumbnails');
      assert.equal(await page.locator('#image-detail-reference-caption').innerText(),'References · 6');
      assert.equal(await page.locator('#image-detail-pixels').innerText(),'740 × 480 px','Details use the original dimensions');
      assert.ok(![...reads.keys()].some(id=>id.startsWith('ref-')),'Thumbnails do not eagerly download reference originals');
      for(let i=0;i<6;i++){
        await thumbnails.nth(i).click();
        await page.waitForFunction(()=>document.querySelector('#image-source-lightbox').open&&!document.querySelector('#image-source-download').disabled);
        assert.equal(await page.locator('#image-source-title').innerText(),'Reference '+(i+1)+' of 6');
        const download=page.waitForEvent('download');await page.click('#image-source-download');
        const original=await download;
        assert.equal(original.suggestedFilename(),'parallel-vision-source-ref-'+i+'.png');
        assert.deepEqual(readFileSync(await original.path()),Buffer.from(images[i%images.length].full,'base64'),'Each thumbnail downloads its own original bytes');
        await page.click('#image-source-back');
      }
      await page.locator('#image-detail-reference-strip').evaluate(el=>{el.scrollLeft=0;});
      assert.equal(await page.locator('.image-detail-utility-row #image-lightbox-download').count(),1);
      assert.equal(await page.locator('.image-detail-media-actions #image-lightbox-download').count(),0);
      await page.click('#image-detail-favorite');
      await page.waitForFunction(()=>document.querySelector('#image-detail-favorite').getAttribute('aria-pressed')==='true'&&!document.querySelector('#image-detail-favorite').disabled);
      assert.deepEqual(writes,[{ids:['job-1'],favorite:true}]);
      assert.equal(await page.locator('#history [data-job="job-1"] .asset-heart').getAttribute('aria-pressed'),'true');
      await page.click('#image-detail-extra summary');
      assert.equal(await page.locator('#image-detail-repair').isVisible(),true);
      assert.equal(await page.locator('#image-detail-edit-area').isVisible(),true);
      assert.equal(await page.locator('#image-detail-delete').isVisible(),true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#image-detail-extra').evaluate(el=>el.open),false);
      assert.equal(await page.locator('#image-lightbox').evaluate(el=>el.open),true);
      await page.click('#image-detail-favorite');
      await page.waitForFunction(()=>document.querySelector('#image-detail-favorite').getAttribute('aria-pressed')==='false'&&!document.querySelector('#image-detail-favorite').disabled);
      if(width===1440){
        mkdirSync('test-results/result-deck',{recursive:true});
        for(const layoutWidth of [1920,1440,768,390,320]){
          await page.setViewportSize({width:layoutWidth,height:1000});
          await page.locator('#image-detail-video').scrollIntoViewIfNeeded();
          const layout=await page.evaluate(()=>{
            const panel=document.querySelector('.image-detail-layout');
            const actions=document.querySelector('.image-detail-actions');
            const main=document.querySelector('#image-detail-video');
            const buttons=[...actions.querySelectorAll(':scope>button,.image-detail-action-grid>button,.image-detail-mood-actions>button,.image-detail-utility-row>button,.image-detail-utility-row summary')];
            const close=document.querySelector('#image-lightbox-close').getBoundingClientRect();
            return {closeFits:close.right<=innerWidth&&close.right>=innerWidth-16&&close.top>=0&&close.bottom<=64, fits:panel.scrollWidth<=panel.clientWidth+1,buttonFits:buttons.every(b=>{const r=b.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth+1&&r.height>=42;}),color:getComputedStyle(main).backgroundColor};
          });
          await page.screenshot({path:'test-results/result-deck/result-'+layoutWidth+'.png'});
          assert.equal(layout.closeFits,true,'Close remains at the complete viewer top-right at '+layoutWidth);
          assert.equal(layout.fits,true,'Result viewer fits '+layoutWidth);
          assert.equal(layout.buttonFits,true,'All deck actions remain reachable at '+layoutWidth);
          assert.equal(layout.color,'rgb(237, 236, 229)','Primary action matches the approved warm ivory');
        }
        await page.setViewportSize({width,height:1000});
      }
    }

    await page.click('#image-lightbox-close');
    if(shape==='landscape'){
      await page.locator('#history .card').nth(2).evaluate(el=>el.click());
      await page.waitForFunction(()=>document.querySelector('#image-lightbox').open&&
        document.querySelectorAll('.image-detail-reference-item').length===1);
      assert.equal(await page.locator('#image-detail-reference-caption').innerText(),'Source image');
      await page.click('#image-lightbox-close');
      await page.locator('#history .card').nth(3).evaluate(el=>el.click());
      await page.waitForFunction(()=>document.querySelector('#image-lightbox').open&&
        document.querySelector('#image-detail-reference-wrap').hidden);
      assert.equal(await page.locator('.image-detail-reference-item').count(),0,
        'Text-only Mood Style photos never appear as a fake source image');
      await page.click('#image-lightbox-close');
    }
    await page.evaluate(()=>{window.__viewerTest.customer();document.getElementById('lab-wallet-toggle').click();}); // Mobile hides the header balance; account-browser separately tests its visible entry.
    // Customer pricing now shares the approved full editorial overlay;
    // generation and viewer state must survive opening and closing it.
    await page.locator('#lab-pricing-overlay[open] #lab-plans-title').waitFor();
    assert.equal(await page.locator('#lab-pricing-overlay #pricing [data-lab-buy]').count(),6,
      'The unified customer pricing overlay contains every actual plan');
    assert.equal(await page.locator('#lab-credits-dialog').isVisible(),false,
      'The superseded small credit pack panel cannot obscure the viewer');
    await page.click('#lab-pricing-overlay-close');
    await page.locator('#history .card').nth(1).evaluate(el=>el.click());
    await page.waitForFunction(()=>!document.querySelector('#image-detail-video').disabled);
    await page.evaluate(()=>window.__viewerTest.seedVideo());
    await page.click('#image-detail-video');
    await page.waitForFunction(()=>window.__viewerTest.state().tool==='video'&&window.__viewerTest.state().hasFile);
    const handoff=await page.evaluate(()=>window.__viewerTest.state());
    assert.equal(handoff.mode,'start');assert.equal(handoff.sourceId,'out-1');assert.equal(handoff.prompt,'');
    await page.evaluate(()=>window.__viewerTest.refreshVideo());
    assert.equal(await page.locator('#notice').textContent(),'','Successful handoff leaves no persistent overlay');
    assert.equal(await page.locator('#video-inspector-selected').isVisible(),false,'A start frame does not inherit an older video record');
    assert.match(await page.locator('#video-inspector-empty').textContent(),/Start frame ready/);
    assert.equal(new URL(page.url()).searchParams.get('tool'),'video');
    assert.equal(await page.locator('#image-lightbox').evaluate(el=>el.open),false);
    assert.equal(await page.locator('#preview').isVisible(),true,'Before generation the original start frame is shown');
    await page.evaluate(()=>window.__viewerTest.showVideoState('queued'));
    assert.equal(await page.locator('#video-job-stage').isVisible(),true,'Queued video owns the main preview');
    assert.equal(await page.locator('#preview').isVisible(),false,'The source photo no longer fills the video stage');
    assert.equal(await page.locator('#video-start-thumb').isVisible(),true,'Original frame stays in the left editor');
    assert.match(await page.locator('#video-job-stage-title').textContent(),/Video queued/);
    assert.match(await page.locator('#video-detail-status').textContent(),/Queued/);
    await page.evaluate(()=>window.__viewerTest.showVideoState('running'));
    assert.match(await page.locator('#video-job-stage-title').textContent(),/Generating video/);
    await page.evaluate(()=>window.__viewerTest.showVideoState('failed'));
    assert.match(await page.locator('#video-job-stage-title').textContent(),/failed/);
    assert.equal(await page.locator('#video-start-thumb').isVisible(),true,'Failure must not discard the original frame');
    await page.evaluate(()=>window.__viewerTest.createVideoGallery());
    const tiles=page.locator('#history .card[data-kind="video"]');
    assert.equal(await tiles.count(),4,'Four completed video thumbnails render in History');
    const tileRects=await tiles.evaluateAll(nodes=>nodes.map(el=>({
      y:el.getBoundingClientRect().y,
      width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height
    })));
    assert.ok(tileRects.every(rect=>Math.abs(rect.width-tileRects[0].width)<2&&Math.abs(rect.height-tileRects[0].height)<2),
      'Video archive cards stay equal width and height');
    assert.equal(new Set(tileRects.map(rect=>Math.round(rect.y))).size,width===390?4:2,
      'Small screens use one video per row, desktop shows a compact multi-column grid');
    assert.equal(await page.locator('.history-video-play').count(),4,
      'Completed video source thumbnails display a clear Play Video affordance');
    assert.equal(await page.locator('.history-video-play svg').count(),4,'Play affordances use monochrome SVG icons');
    assert.equal(await page.locator('.asset-video-badge svg').count(),4,'Video labels use the same monochrome icon treatment');
    const cardControls=await tiles.first().evaluate(card=>{
      const rect=selector=>{const r=card.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
      return {media:rect('.history-media'),heart:rect('.asset-heart'),download:rect('.result-download')};
    });
    assert.equal(await tiles.first().locator('.history-video-play').isVisible(),true,'The thumbnail retains one clear Play Video affordance');
    assert.equal(await tiles.first().locator('.asset-video-badge').isVisible(),width>640,'Only phone cards hide the redundant Video badge');
    if(width<=640){
      assert.ok(cardControls.heart.bottom<cardControls.download.top,'Favorite and Download do not overlap');
      assert.ok(Math.abs(cardControls.download.bottom-cardControls.media.bottom)<3,'Download sits at the image/text boundary, not the bottom of the whole card');
    }else{
      assert.ok(cardControls.download.top-cardControls.media.top<10,'Desktop keeps its existing Download position');
    }
    if(shape==='landscape'){
      await tiles.first().scrollIntoViewIfNeeded();
      await page.screenshot({path:`test-results/video-card-controls-${width}.png`,fullPage:false});
    }
    // This saved file is held: selecting a thumbnail must reveal Loading and
    // return to the top of the player before any result bytes arrive.
    await tiles.first().scrollIntoViewIfNeeded();
    await page.evaluate(()=>{const center=document.querySelector('#video-feed-center');center.scrollTop=center.scrollHeight;});
    await tiles.first().evaluate(el=>el.click());
    assert.equal(await page.locator('#video-job-stage').isVisible(),true,'Video click opens the central loading surface');
    assert.match(await page.locator('#video-job-stage-title').innerText(),/Opening video/);
    assert.equal(await page.locator('#video-detail-status').innerText(),'Completed',
      'Job inspector truthfully retains the backend state');
    assert.equal(await page.locator('#video-job-stage-state').innerText(),'Loading',
      'The player does not report Ready before video data arrives');
    if(width===1440)assert.equal(await page.locator('#video-feed-center').evaluate(el=>el.scrollTop),0,
      'Selecting a History card reveals the large desktop player');
    releaseVideoFile();
    await page.waitForFunction(()=>!!document.querySelector('#video').getAttribute('src')&&!document.querySelector('#video').hidden);
    assert.equal(reads.get('video-out-0'),1,'One video download for one click, no paid generation');
    assert.equal(await page.locator('#video-job-stage').isVisible(),false,'Loaded video replaces the processing card');
    assert.equal(await page.locator('#video').isVisible(),true,'A real video remains visible on desktop and phone');
    await page.evaluate(()=>window.__viewerTest.emptyVideo());
    await page.waitForFunction(()=>{
      const app=document.querySelector('#app'),preview=document.querySelector('#pv-video-reference-preview');
      return app.classList.contains('pv-video-mode-reference')&&!app.classList.contains('pv-video-has-input')&&
        !document.querySelector('#empty').hidden&&preview?.hidden&&preview.dataset.illustrative==='false';
    });
    assert.equal(await page.locator('#pv-video-reference-preview img').count(),0,
      'An empty Video canvas never invents attached reference thumbnails');
    assert.match(await page.locator('.canvas').evaluate(el=>getComputedStyle(el,'::before').backgroundImage),
      /video-subway-relaxed-approved\.png/,'The approved original is empty-canvas decoration only');
    assert.equal(await page.locator('#video-feed-center>.stage').isVisible(),width>820,
      'The decorative empty stage remains on desktop and disappears only on phones');
    if(shape==='landscape')await page.screenshot({path:`test-results/video-mobile-quiet-${width}.png`,fullPage:false});
    // Native gallery skin used by the production Assets route.
    await page.addStyleTag({path:'lab/native-create-gallery.css'});
    await page.evaluate(()=>document.documentElement.classList.add('pv-native-lab'));
    await page.evaluate(()=>window.__viewerTest.openAssets());
    await page.evaluate(()=>window.__viewerTest.createVideoGallery());
    const assetDownload=page.locator('#assets-gallery #history .card[data-kind="video"] .history-video-download').first();
    assert.equal(await assetDownload.isVisible(),true,'Assets video download survives hidden metadata on desktop and phone');
    const assetControls=await assetDownload.evaluate(el=>{
      const r=el.getBoundingClientRect(),heart=el.closest('.card').querySelector('.asset-heart').getBoundingClientRect();
      return {width:r.width,height:r.height,top:r.top,heartBottom:heart.bottom,opacity:getComputedStyle(el).opacity};
    });
    assert.equal(assetControls.opacity,'1','Assets downloads are visible without hover');
    assert.equal(assetControls.width,width<=640?30:34,'Only phone downloads shrink');
    assert.ok(assetControls.top>=assetControls.heartBottom,'Download does not overlap Favorite');
    const readsBeforeAssetDownload=reads.get('video-out-0');
    await assetDownload.scrollIntoViewIfNeeded();
    if(shape==='landscape')await page.screenshot({path:`test-results/assets-video-download-${width}.png`,fullPage:false});
    const readsBeforeAssetPlayback=await page.locator('#video').getAttribute('src');
    const assetSaved=page.waitForEvent('download');
    await assetDownload.click();
    assert.match((await assetSaved).suggestedFilename(),/video-out-0\.mp4$/,'Assets downloads the original video, not its source image');
    assert.equal(reads.get('video-out-0'),readsBeforeAssetDownload+1,'One authenticated original request per Assets download');
    assert.equal(await page.locator('#video').getAttribute('src'),readsBeforeAssetPlayback,'Download does not open playback');
    await page.evaluate(()=>window.__viewerTest.selectHistory(true));
    assert.equal(await assetDownload.isVisible(),false,'Selection mode hides the download overlay');
    await page.evaluate(()=>window.__viewerTest.lock());
    assert.equal((await page.evaluate(()=>window.__viewerTest.state())).cache,0,'Sign out clears private original cache');
    assert.equal(await page.locator('.image-detail-reference-item').count(),0,'Sign out clears all private reference thumbnails');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({width,shape,previewWidth:Math.round(previewFrame.width),fullWidth:Math.round(fullFrame.width),rapidTwoArrowMs:Math.round(navigation.ms),passed:'stable fitted preview, unchanged frame on original upgrade, native zoom, nonblocking arrows, prefetch, stale responses, correct download, close, sign-out'}));
    await context.close();
  }
}finally{await browser.close();await new Promise(r=>server.close(r));}
