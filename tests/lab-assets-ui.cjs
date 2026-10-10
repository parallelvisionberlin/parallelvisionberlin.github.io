const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const root=process.cwd();let source=fs.readFileSync('lab/lab.js','utf8');const a=source.indexOf("try{const {Clerk}=await import("),b=source.indexOf('// Soul composer:',a);source=source.slice(0,a)+`clerk={session:{getToken:async()=> 'test'}};owner=true;userId='test';config={enabled:true,higgsfieldEnabled:true,openrouterEnabled:true,falEnabled:true,videoEngines:['seedance','wan'],concurrency:{image:10,video:3}};$('app').hidden=false;$('gate').hidden=true;hf.configure(true);await loadHistory();await restoreStudioEntry();update();finishLabBoot();window.__lockTest=lock;window.__assetCacheSize=()=>assetBlobs.size;window.__referenceSettings=()=>settings();window.__setTestJobs=setActiveJobs;window.__surfaceTestJob=surfaceHistoryJob;window.__ready=true;\n`+source.slice(b);
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),rel=url.pathname.replace(/^\//,'')+(url.pathname.endsWith('/')?'index.html':'');const f=['.'].map(x=>path.join(root,x,rel)).find(fs.existsSync);if(!f){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(f)]||'text/plain');res.end(rel==='lab/lab.js'?source:fs.readFileSync(f));});
(async()=>{await new Promise(r=>server.listen(8765,'127.0.0.1',r));const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}});const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=900;c.height=600;const x=c.getContext('2d');x.fillStyle='#454b50';x.fillRect(0,0,900,600);x.fillStyle='#9b9489';x.fillRect(240,80,400,450);return c.toDataURL().split(',')[1];}),'base64');const errors=[];page.on('pageerror',e=>errors.push(e.message));let releaseImages;const imagesReady=new Promise(r=>releaseImages=r);let folders=[],members={},favorites=new Set();let jobs=Array.from({length:6},(_,i)=>({id:'job-'+i,sourceId:'source-'+i,outputId:'out-'+i,status:'completed',createdAt:Date.now()-i*100,settings:{galleryDimensions:{assetId:'out-'+i,width:900,height:600},type:i<4?'image':'video',mode:i<4?'image':'start',engine:i<4?'seedream':'wan',resolution:'1k',prompt:'A quiet room',aspectRatio:'16:9',duration:5}}));
await page.route('https://**/*',async route=>{const req=route.request(),u=new URL(req.url());if(!u.href.includes('parallel-vision-lab.parallelvision.workers.dev'))return route.abort();let result={};const d=req.method()==='POST'?req.postDataJSON():{};if(u.pathname==='/api/jobs'){let list=jobs.filter(j=>(u.searchParams.get('unfiled')!=='1'||u.searchParams.get('folder')||u.searchParams.get('favorite')||!Object.values(members).some(ids=>ids.includes(j.id)))&&(!u.searchParams.get('kind')||j.settings.type===u.searchParams.get('kind'))&&(!u.searchParams.get('mode')||j.settings.mode===u.searchParams.get('mode'))&&(!u.searchParams.get('favorite')||favorites.has(j.id))&&(!u.searchParams.get('folder')||(members[u.searchParams.get('folder')]||[]).includes(j.id)));result={jobs:list.map(j=>({...j,favorite:favorites.has(j.id)})),next:null,activeJobs:[]};}else if(u.pathname==='/api/library')result={folders:folders.map(f=>({...f,count:(members[f.id]||[]).length}))};else if(u.pathname==='/api/library/folders'){const folder={id:'folder-'+folders.length,name:d.name};folders.push(folder);result={folder};}else if(u.pathname==='/api/library/archive'){let folder=folders.find(f=>f.name==='Archive');if(!folder){folder={id:'archive',name:'Archive'};folders.push(folder);}members[folder.id]=[...new Set([...(members[folder.id]||[]),...d.ids])];}else if(u.pathname==='/api/library/members'){for(const id of d.ids){if(typeof d.favorite==='boolean'){d.favorite?favorites.add(id):favorites.delete(id);}else{const m=new Set(members[d.folderId]||[]);d.remove?m.delete(id):m.add(id);members[d.folderId]=[...m];}}}else if(u.pathname==='/api/jobs/bulk-delete'){jobs=jobs.filter(j=>!d.ids.includes(j.id));result={deleted:d.ids.length};}else if(u.pathname.startsWith('/api/assets/')){await imagesReady;return route.fulfill({contentType:/out-[45]$/.test(u.pathname)?'video/mp4':'image/png',body:/out-[45]$/.test(u.pathname)?Buffer.from('mock video bytes'):png});}return route.fulfill({contentType:'application/json',body:JSON.stringify(result)});});
await page.emulateMedia({reducedMotion:'reduce'});
await page.goto('http://127.0.0.1:8765/lab/',{waitUntil:'domcontentloaded'});
assert.equal(await page.locator('h1').textContent(),'PV LAB');
assert.equal(await page.locator('.start-link').getAttribute('href'),'./studio.html?tool=image');
assert.deepEqual(await page.locator('.tool-card').evaluateAll(els=>els.map(el=>el.getAttribute('href'))),['./studio.html?tool=image','./studio.html?tool=video','./studio.html?tool=upscale']);
await page.locator('.hero-poster').evaluate(img=>img.decode());
assert.equal(await page.locator('.video-card').count(),1);assert.equal((await page.locator('.hero-poster').boundingBox()).y,0,'Hero remains full bleed behind navigation');
assert.equal(await page.locator('.hero-poster').evaluate(el=>getComputedStyle(el).animationName),'none','Reduced motion preserves still hero');
console.log('LAB_HERO_DESKTOP='+Buffer.from(await page.screenshot({type:'jpeg',quality:80,fullPage:true})).toString('base64'));
await page.setViewportSize({width:390,height:844});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Landing fits mobile');
console.log('LAB_HERO_MOBILE='+Buffer.from(await page.screenshot({type:'jpeg',quality:80,fullPage:true})).toString('base64'));
await page.click('.tool-card[href="./studio.html?tool=upscale"]');await page.waitForFunction(()=>window.__ready);
assert.equal(await page.locator('#tool-upscale').getAttribute('aria-pressed'),'true','Landing card opens Upscaler directly');
await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
console.log('PASS public fashion hero, accessible reduced motion, three destinations, direct Upscaler entry and mobile layout');


await page.goto('http://127.0.0.1:8765/lab/studio.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__ready);assert.deepEqual(errors,[]);
await page.waitForFunction(()=>document.querySelector('#history').classList.contains('justified-gallery'));
await page.waitForFunction(()=>document.querySelector('#history .card')?.style.width);
const beforeImages=await page.locator('#history .card').evaluateAll(cards=>cards.map(c=>({x:c.offsetLeft,y:c.offsetTop,w:c.offsetWidth,h:c.offsetHeight})));

assert.equal(await page.locator('#history .history-media img').evaluateAll(imgs=>imgs.length>0&&imgs.every(i=>getComputedStyle(i).visibility==='hidden')),true,'Image placeholders hide native broken-file graphics');
await page.click('#tool-assets');
await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===6);
assert.equal(await page.locator('#history .history-media img').evaluateAll(imgs=>imgs.length>0&&imgs.every(i=>getComputedStyle(i).visibility==='hidden')),true,'Assets uses the same loading treatment');
assert.equal(await page.locator('#history .history-media').first().evaluate(el=>getComputedStyle(el,'::after').backgroundImage.includes('pv-mark.png')),true,'Loading uses PV mark');
await page.click('#tool-image');
await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===4);
await page.waitForFunction(()=>document.querySelector('#history .card')?.style.width);
releaseImages();await page.waitForFunction(()=>[...document.querySelectorAll('#history .history-media img')].every(i=>i.naturalWidth>0));
// A loaded gallery output opens without downloading it again.
const reads=new Map();
const trackAssets=request=>{const u=new URL(request.url());if(u.pathname.startsWith('/api/assets/'))reads.set(u.pathname,(reads.get(u.pathname)||0)+1);};
page.on('request',trackAssets);
await page.locator('#history .card[data-job="job-0"]').click();
await page.waitForFunction(()=>document.querySelector('#image-lightbox-img').naturalWidth>0);
assert.equal(reads.get('/api/assets/out-0')||0,0,'Gallery and viewer reuse the original image bytes');
assert.equal(await page.locator('#tool-video').isEnabled(),true,'Viewing never locks studio navigation');
await page.keyboard.press('Escape');
// No full video fetch on entry; an explicit slow view must not lock navigation.
let releaseVideo;
const slowVideo=new Promise(resolve=>releaseVideo=resolve);
await page.route('**/api/assets/out-4',async route=>{await slowVideo;await route.fulfill({contentType:'video/mp4',body:Buffer.from('mock video bytes')});});
await page.click('#tool-video');
await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===2);
assert.equal(reads.get('/api/assets/out-4')||0,0,'Entering Video does not download or autoplay a previous MP4');
const explicitVideo=page.waitForRequest('**/api/assets/out-4');
await page.locator('#history .card[data-job="job-4"]').click();await explicitVideo;
assert.equal(await page.locator('#tool-image').isEnabled(),true,'Slow video playback does not disable tabs');
await page.click('#tool-image');
const videoFinished=page.waitForResponse('**/api/assets/out-4');releaseVideo();await videoFinished;
await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===4);
assert.equal(await page.locator('#video').getAttribute('src'),null,'Late MP4 cannot replace the new section');
await page.unroute('**/api/assets/out-4');
for(const section of ['upscale','image','video','assets']){
  await page.click('#tool-'+section);
  assert.equal(new URL(page.url()).searchParams.get('tool'),section);
  await page.reload();await page.waitForFunction(()=>window.__ready);
  assert.equal(await page.locator('#tool-'+section).getAttribute('aria-pressed'),'true','Reload restores '+section);
}
await page.click('#tool-image');
await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===4&&[...document.querySelectorAll('#history img')].every(i=>i.naturalWidth>0));
page.off('request',trackAssets);
console.log('PASS section URLs and reloads, shared gallery bytes, no Video auto-download and nonblocking slow playback');
for(const width of [1920,1440,900,899,821,768,390,320]){
  await page.setViewportSize({width,height:1000});
  const header=await page.locator('.studio-header').boundingBox();
  const nav=await page.locator('.studio-header .tool-switch').boundingBox();
  const brand=await page.locator('.studio-header .brand').boundingBox();
  const account=await page.locator('.account-menu').boundingBox();
  assert.equal(header.height,width>=900?64:100,'Shared header height');
  if(width>=900){
    assert.ok(Math.abs(brand.y+brand.height/2-(nav.y+nav.height/2))<1,'Brand and navigation share one row');
    assert.ok(brand.x+brand.width<nav.x&&nav.x+nav.width<=account.x,'Navigation fits between brand and account');
  }
  let baseline;
  for(const tool of ['image','video','upscale','assets','image']){
    await page.click('#tool-'+tool);
    assert.equal(new URL(page.url()).searchParams.get('tool'),tool,'URL follows active section');
    const boxes=await page.locator('.tool-switch .tool-group > *').evaluateAll(els=>els.map(el=>{
      const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};
    }));
    if(!baseline)baseline=boxes;
    boxes.forEach((box,i)=>Object.keys(box).forEach(k=>assert.ok(Math.abs(box[k]-baseline[i][k])<1,'Navigation '+k+' stays fixed: '+width+' '+tool+' '+JSON.stringify({box,baseline:baseline[i]}))));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Studio fits viewport '+width+' '+tool);
    const selected=await page.locator('.studio-header button[aria-pressed="true"]').evaluate(el=>({
      border:getComputedStyle(el).borderWidth,background:getComputedStyle(el).backgroundColor,
      underline:getComputedStyle(el,'::after').opacity,shadow:getComputedStyle(el).boxShadow
    }));
    assert.deepEqual(selected,{border:'0px',background:'rgba(0, 0, 0, 0)',underline:'1',shadow:'none'},'Only a fine underline marks the current section');
    if(tool==='video'&&width>820){
      const work=await page.locator('#main').boundingBox();
      assert.equal(Math.round(work.y+work.height),1000,'Video workspace fits below the shared header');
    }
  }
}
await page.setViewportSize({width:1440,height:1000});
console.log('PASS single-row desktop header, consistent active treatment and stable navigation at eight widths');
const navBeforeQueue=await page.locator('.tool-switch').boundingBox();
await page.evaluate(()=>window.__setTestJobs([{id:'header-queue',status:'uncertain',settings:{type:'image',engine:'flash',provider:'openrouter'}}]));
assert.deepEqual(await page.locator('.tool-switch').boundingBox(),navBeforeQueue,'Queue arrival does not move navigation');
await page.locator('.account-menu>summary').click();
assert.equal(await page.locator('.account-options').isVisible(),true);
await page.locator('.account-menu>summary').click();
await page.locator('#active>summary').click();
assert.equal(await page.locator('.queue-popover-panel').isVisible(),true);
await page.locator('#active>summary').click();
console.log('EDITORIAL_HEADER_DESKTOP='+Buffer.from(await page.screenshot({type:'jpeg',quality:80})).toString('base64'));
await page.setViewportSize({width:320,height:844});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Queue and account fit narrow mobile');
const mobileBrand=await page.locator('.brand').boundingBox(),mobileActions=await page.locator('.actions').boundingBox();
assert.ok(mobileBrand.x+mobileBrand.width<=mobileActions.x,'Brand and account never overlap');
console.log('EDITORIAL_HEADER_MOBILE='+Buffer.from(await page.screenshot({type:'jpeg',quality:80})).toString('base64'));
await page.evaluate(()=>window.__setTestJobs([]));
await page.setViewportSize({width:1440,height:1000});
await page.evaluate(()=>document.querySelector('#app').hidden=true);
assert.equal(await page.locator('.studio-header .tool-switch').isVisible(),false,'Tools are hidden without an authenticated workspace');
await page.evaluate(()=>document.querySelector('#app').hidden=false);
await page.click('#tool-image');
const afterImages=await page.locator('#history .card').evaluateAll(cards=>cards.map(c=>({x:c.offsetLeft,y:c.offsetTop,w:c.offsetWidth,h:c.offsetHeight})));
assert.deepEqual(afterImages,beforeImages,'Images retain identical positions and sizes before and after decoding');console.log('PASS zero gallery movement while image bytes load');
const preview=page.locator('#history .history-media img').first();
const previewBounds=await preview.boundingBox();
await preview.evaluate(img=>img.dispatchEvent(new Event('error')));
assert.equal(await preview.evaluate(img=>getComputedStyle(img).visibility),'hidden','Decode errors never show broken-file icon');
assert.equal(await page.locator('#history .history-preview-unavailable').first().textContent(),'Preview unavailable');
assert.equal(await preview.evaluate(img=>getComputedStyle(img.closest('figure'),'::after').animationName),'none','Failed preview stops loading animation');
await preview.evaluate(img=>img.dispatchEvent(new Event('load')));
assert.equal(await preview.evaluate(img=>getComputedStyle(img).visibility),'visible','Successful retry reveals preview');
assert.equal(await page.locator('#history .history-preview-unavailable').count(),0,'Successful retry removes fallback');
assert.deepEqual(await preview.boundingBox(),previewBounds,'Loading and failure do not change image geometry');
console.log('PASS shared image and assets loaders, PV mark, decode failure and retry');

const bounds=await page.locator('#history').boundingBox();assert.equal(bounds.x,0,'Image gallery reaches left edge');assert.equal(bounds.width,1440,'Image gallery reaches right edge');assert.ok(bounds.y<=135,'Compact top chrome');
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile image view has no horizontal overflow');await page.setViewportSize({width:1440,height:1000});
await page.locator('#history .card').first().hover();await page.getByRole('button',{name:'Add to favorites',exact:true}).first().click();assert.equal(favorites.size,1);
await page.click('#history-select');await page.locator('#history .card').nth(0).click();await page.locator('#history .card').nth(1).click();await page.click('#history-add-folder');await page.fill('#asset-folder-name','Berlin 2063');await page.click('#asset-folder-create');await page.waitForFunction(()=>!document.querySelector('#asset-folder-dialog').open);assert.equal(members['folder-0'].length,2);assert.equal(await page.locator('#history .card').count(),2,'Filed images leave Image grid immediately');
await page.click('#tool-assets');await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===6);assert.equal(await page.locator('#assets-folders button').count(),1);await page.locator('#history .card[data-kind="video"]').first().click();await page.locator('#asset-video-dialog').waitFor({state:'visible'});await page.click('#asset-video-close');await page.locator('#history .card[data-kind="image"]').first().click();await page.locator('#image-lightbox').waitFor({state:'visible'});await page.keyboard.press('Escape');await page.click('#assets-favorites');await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===1);await page.click('#assets-all');await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===6);
await page.click('#history-select');await page.locator('#history .card[data-kind="video"]').first().click();await page.click('#history-add-folder');await page.locator('#asset-folder-choices button').first().click();await page.waitForFunction(()=>!document.querySelector('#asset-folder-dialog').open);assert.equal(members['folder-0'].length,3);assert.equal(await page.locator('#history .card').count(),6,'All assets retains filed videos');await page.locator('#assets-folders button').first().click();await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===3);
await page.waitForFunction(()=>[...document.querySelectorAll('#history .history-media img')].every(i=>i.naturalWidth>0));console.log('ASSETS_DESKTOP='+Buffer.from(await page.screenshot({type:'jpeg',quality:65})).toString('base64'));await page.click('#history-select');await page.locator('#history .card').first().click();await page.click('#history-remove-folder');await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===2);
await page.reload();await page.waitForFunction(()=>window.__ready);await page.click('#tool-assets');await page.locator('#assets-folders button').first().click();await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===2);await page.setViewportSize({width:390,height:844});console.log('ASSETS_MOBILE='+Buffer.from(await page.screenshot({type:'jpeg',quality:65})).toString('base64'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);await page.click('#tool-image');await page.waitForFunction(()=>!document.querySelector('#app').classList.contains('assets-active'));await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===3);await page.click('#history-select');await page.locator('#history .card').first().click();await page.click('#history-archive-selected');await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===2);await page.click('#tool-assets');await page.click('#assets-all');await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===6);await page.locator('#assets-folders button').filter({hasText:'Archive'}).click();await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===1);console.log('PASS dedicated Archive button, disappearance from Image and retention in All assets');console.log('PASS favorites, multi-select, create/add folders, video membership, reload persistence, removal, mobile overflow and return to Image');await page.click('#tool-image');
await page.waitForFunction(()=>document.querySelectorAll('#history .card').length>0);
const beforeModel=await page.locator('#history .card').first().elementHandle();let modelReloads=0;const trackModel=r=>{if(r.url().includes('/api/jobs?')||r.url().includes('/api/assets/'))modelReloads++;};
await page.waitForFunction(()=>[...document.querySelectorAll('#history img')].every(i=>i.complete));page.on('request',trackModel);
await page.click('#image-composer-model');await page.locator('.composer-model-option[data-value="soulpro"]').click();
await page.click('#image-composer-model');await page.locator('.composer-model-option[data-value="seedream"]').click();
assert.equal(await beforeModel.evaluate(el=>el.isConnected),true,'Switching models preserves existing gallery cards');assert.equal(modelReloads,0,'Model switching does not reload History or images');page.off('request',trackModel);
await page.setViewportSize({width:1440,height:1000});
const compactDockHeight=(await page.locator('#image-composer').boundingBox()).height;assert.equal(await page.locator('#composer-character').isVisible(),false,'Seedream has no duplicate right-side plus');
const generateBeforeRefs=await page.locator('#image-composer-generate').boundingBox();
await page.locator('#reference-images').setInputFiles([{name:'face.png',mimeType:'image/png',buffer:png},{name:'body.png',mimeType:'image/png',buffer:png}]);
await page.waitForFunction(()=>document.querySelectorAll('.composer-reference-tile').length===2);
assert.equal((await page.locator('#image-composer-generate').boundingBox()).height,generateBeforeRefs.height,'Generate stays the same height after adding images');
assert.match(await page.locator('#image-composer-ratio option:checked').textContent(),/^\d+:\d+$/,'Automatic ratio displays dimensions only');
await page.selectOption('#image-reference-mode','references');
assert.equal(await page.locator('.composer-reference-role').count(),2,'Every reference has a role without a base');
await page.selectOption('[aria-label="Role for image 1"]','identity');await page.selectOption('[aria-label="Role for image 2"]','body');
await page.selectOption('#image-composer-ratio','2:3');
await page.fill('#image-composer-prompt','Create a new full-body fashion portrait');
const refsSettings=await page.evaluate(()=>window.__referenceSettings());assert.equal(refsSettings.referenceMode,'references');assert.equal(refsSettings.aspectRatio,'2:3');assert.deepEqual(refsSettings.referenceRoles.map(r=>r.role),['identity','body']);
assert.match(await page.locator('#reference-guidance-text').textContent(),/There is no base image/);
await page.selectOption('#image-reference-mode','base');await page.selectOption('#image-reference-mode','references');
assert.deepEqual(await page.evaluate(()=>window.__referenceSettings().referenceRoles.map(r=>r.role)),['identity','body'],'Toggle restores assigned roles');
await page.locator('.composer-reference-tile').nth(1).focus();await page.keyboard.press('Alt+ArrowLeft');
assert.deepEqual(await page.evaluate(()=>window.__referenceSettings().referenceRoles.map(r=>r.role)),['body','identity'],'Reordering does not assign a base');
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'References mode fits mobile');await page.setViewportSize({width:1440,height:1000});
await page.locator('.composer-reference-remove').first().click();await page.locator('.composer-reference-remove').first().click();await page.fill('#image-composer-prompt','');
console.log('PASS reference-only roles, settings, prompt, toggle, reorder and mobile layout');
await page.click('#image-composer-model');await page.locator('.composer-model-option[data-value="soulpro"]').click();

assert.equal((await page.locator('#image-composer').boundingBox()).height,compactDockHeight,'Empty Soul has the same height as empty Seedream');
const soulGenerateHeight=(await page.locator('#image-composer-generate').boundingBox()).height;
await page.locator('#soul-base-image').setInputFiles({name:'scene.png',mimeType:'image/png',buffer:png});
await page.waitForFunction(()=>document.querySelector('#image-composer').classList.contains('has-soul-source'));
assert.ok((await page.locator('#image-composer').boundingBox()).height>compactDockHeight,'Soul grows only to show attached photo row');
assert.equal((await page.locator('#image-composer-generate').boundingBox()).height,soulGenerateHeight);
assert.equal(await page.locator('#hf-bar-source').isVisible(),false,'Loaded source appears once in the reference row');
await page.locator('.composer-reference-remove').click();
assert.equal((await page.locator('#image-composer').boundingBox()).height,compactDockHeight,'Removing photo restores compact Soul');
assert.equal(await page.locator('#hf-bar-ratio option:checked').textContent(),'16:9');
await page.click('#composer-character');
assert.equal(await page.locator('#composer-library-title').textContent(),'MAKE YOUR OWN CHARACTER');
assert.equal(await page.locator('#composer-character-create').isVisible(),true);assert.ok((await page.locator('#composer-character-create').boundingBox()).width>=190,'Create character has room for its label');
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Character panel fits mobile');await page.setViewportSize({width:1440,height:1000});
await page.click('#composer-character-create');await page.waitForFunction(()=>document.querySelector('#hf-dialog').open&&document.activeElement.id==='hf-training-name');await page.click('#hf-close');
console.log('PASS fixed Generate geometry, numeric ratio label and character creation entry');
assert.equal(await page.locator('#image-composer-generate').isEnabled(),false,'Empty Soul cannot submit');
await page.fill('#image-composer-prompt','A quiet concrete room in daylight');
assert.equal(await page.locator('#image-composer-generate').isEnabled(),true,'Prompt alone enables Soul');
let soulPaidSubmissions=0;
await page.route('**/api/higgsfield/quote',route=>{
  const payload=route.request().postDataJSON();
  return route.fulfill({contentType:'application/json',body:JSON.stringify({id:'ab000000-0000-4000-8000-000000000001',provider:'Higgsfield',sourceId:payload.sourceId,settings:{...payload.settings,aspectRatio:'16:9',provider:'higgsfield'},estimatedUsd:0.006,maxUsd:0.006,priceIsEstimate:true,expiresAt:Date.now()+300000,notice:'NO SOUL ID SELECTED. Generic image, Nina identity is not preserved.'})});
});
await page.route('**/api/higgsfield/generate',route=>{
  soulPaidSubmissions++;
  return route.fulfill({contentType:'application/json',body:JSON.stringify({job:{id:'ab000000-0000-4000-8000-000000000002',status:'queued',createdAt:Date.now(),settings:{type:'image',provider:'higgsfield',engine:'soulpro',mode:'image',prompt:'A quiet concrete room in daylight'}}})});
});
const outgoingQuote=page.waitForRequest(r=>r.url().endsWith('/api/higgsfield/quote')&&r.method()==='POST');
await page.click('#image-composer-generate');
const quotedPayload=(await outgoingQuote).postDataJSON();
assert.equal(quotedPayload.sourceId,null);assert.equal(quotedPayload.settings.prompt,'A quiet concrete room in daylight');
await page.locator('#quote-dialog').waitFor({state:'visible'});
assert.equal(soulPaidSubmissions,0,'Checking the PV Soul price does not start a paid generation');
assert.match(await page.locator('#quote-notice').innerText(),/NO SOUL ID/);
const outgoingGeneration=page.waitForRequest(r=>r.url().endsWith('/api/higgsfield/generate')&&r.method()==='POST');
await page.click('#confirm-generation');
const paidPayload=(await outgoingGeneration).postDataJSON();
assert.equal(paidPayload.quoteId,'ab000000-0000-4000-8000-000000000001');
assert.equal(paidPayload.confirm,true);assert.equal(soulPaidSubmissions,1);
await page.locator('#quote-dialog').waitFor({state:'hidden'});
assert.ok(await page.locator('.composer-model-symbol img').getAttribute('src').then(x=>x.endsWith('pv-mark.png')));console.log('PASS Soul text-only Generate and request without image upload');
await page.route('**/api/image-models/generate',route=>{const payload=route.request().postDataJSON();return route.fulfill({contentType:'application/json',body:JSON.stringify({job:{id:'new-'+payload.settings.engine,status:'queued',createdAt:Date.now(),settings:{...payload.settings,provider:payload.settings.engine==='flash'?'openrouter':'fal'}}})});});
for(const engine of ['flash','kling']){
  await page.click('#image-composer-model');await page.locator('.composer-model-option[data-value="'+engine+'"]').click();
  await page.fill('#image-composer-prompt','Editorial architecture in daylight');
  await page.selectOption('#image-composer-count','1');
  assert.equal(await page.locator('#resolution').inputValue(),'1k');
  assert.equal(await page.locator('#composer-character').isVisible(),false,'No redundant plus in the new models');
  const send=page.waitForRequest(r=>r.url().endsWith('/api/image-models/generate')&&r.method()==='POST');
  await page.click('#image-composer-generate');const payload=(await send).postDataJSON();
  assert.equal(payload.settings.engine,engine);assert.equal(payload.settings.outputFormat,'png');assert.deepEqual(payload.referenceSourceIds,[]);
  await page.waitForFunction(()=>!document.querySelector('#image-composer-generate').disabled);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.setViewportSize({width:1440,height:1000});
}
await page.click('#image-composer-model');await page.locator('.composer-model-option[data-value="flash"]').click();
await page.evaluate(()=>window.__setTestJobs([{id:'interrupted-flash',status:'uncertain',settings:{type:'image',engine:'flash',provider:'openrouter'}}]));
assert.equal(await page.locator('#image-composer-generate').isEnabled(),false);
assert.equal(await page.locator('#composer-generation-reason').isVisible(),true);
assert.match(await page.locator('#composer-generation-reason').textContent(),/previous request/);
await page.click('#composer-review-queue');assert.equal(await page.locator('#active').getAttribute('open'),'');
await page.evaluate(()=>window.__setTestJobs([{id:'unrelated-gemini',status:'uncertain',settings:{type:'image',engine:'gemini',provider:'gemini'}}]));
assert.equal(await page.locator('#image-composer-generate').isEnabled(),true,'Unrelated Gemini interruption never blocks Flash');
console.log('PASS interrupted Flash explains blocking and opens review; unrelated interruptions do not block Flash');
assert.deepEqual(errors,[]);console.log('PASS Flash/Kling selection, default 1K, PNG, text-only submission and mobile geometry');
await page.evaluate(()=>window.__setTestJobs([]));
await page.click('#tool-upscale');
assert.equal(await page.locator('#canvas-import').isVisible(),true);
assert.equal(await page.locator('#empty-title').textContent(),'Upscale');
assert.equal(await page.locator('#upscale-info').getAttribute('open'),null);
console.log('UPSCALE_DESKTOP='+Buffer.from(await page.screenshot({type:'jpeg',quality:75})).toString('base64'));
const canvasBox=await page.locator('.stage').boundingBox(), controlsBox=await page.locator('.controls').boundingBox();
assert.ok(controlsBox.y>=canvasBox.y+canvasBox.height,'Upscaler controls sit below the central canvas');
assert.equal(await page.locator('.controls>.generate-zone').evaluate(el=>getComputedStyle(el).position),'static','Actions never overlap settings');
await page.setViewportSize({width:390,height:844});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Upscaler fits mobile');
console.log('UPSCALE_MOBILE='+Buffer.from(await page.screenshot({type:'jpeg',quality:75})).toString('base64'));
await page.setViewportSize({width:1440,height:1000});
await page.click('#tool-image');await page.click('#history-select');
assert.equal(await page.locator('#history-selection-count').evaluate(el=>getComputedStyle(el).textTransform),'none');
assert.equal(await page.locator('#history-select-all').evaluate(el=>getComputedStyle(el).fontSize),'14px');
console.log('PASS centered Upscaler, compact details, mobile layout and cohesive selection typography');
await page.goto('http://127.0.0.1:8765/lab/studio.html?tool=video',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__ready);
assert.equal(await page.locator('#video-engine').inputValue(),'seedance','Video starts with Seedance');
assert.equal(await page.locator('#duration').inputValue(),'5');assert.equal(await page.locator('#resolution').inputValue(),'720p');
const videoFrame=fs.readFileSync('assets/optimized/liquid-metal-hero.webp');
await page.setInputFiles('#image',{name:'editorial-frame.webp',mimeType:'image/webp',buffer:videoFrame});
await page.waitForFunction(()=>!document.querySelector('#video-start-thumb').hidden);
await page.setInputFiles('#last-image',{name:'ending-frame.webp',mimeType:'image/webp',buffer:videoFrame});
await page.waitForFunction(()=>!document.querySelector('#video-end-thumb').hidden);
await page.fill('#prompt','A slow camera move across the garment, with natural fabric movement.');
assert.equal(await page.locator('#generate').textContent(),'Generate');assert.equal(await page.locator('#generate').isEnabled(),true);
assert.equal(await page.locator('#video-detail-prompt').evaluate(el=>getComputedStyle(el).fontSize),'14px');
assert.ok((await page.locator('#video-model-control').boundingBox()).y<(await page.locator('#prompt').boundingBox()).y,'Model precedes references and prompt');
await page.click('#mode-extend');assert.equal(await page.locator('#video-media-drop').isVisible(),true);assert.equal(await page.locator('#start-mode').isVisible(),false);assert.equal(await page.locator('#reference-drop').isVisible(),false);assert.equal(await page.locator('#generate').isDisabled(),true);await page.click('#video-create-task');await page.click('#mode-start');assert.equal(await page.evaluate(()=>window.__referenceSettings().mode),'start');assert.equal(await page.locator('#mode-start').getAttribute('aria-selected'),'true');assert.equal(await page.locator('#generate').isEnabled(),true);
console.log('VIDEO_REFRESH_DESKTOP='+Buffer.from(await page.screenshot({type:'jpeg',quality:75})).toString('base64'));
await page.selectOption('#video-engine','wan');assert.equal(await page.locator('#video-engine').inputValue(),'wan');
await page.click('#tool-image');await page.click('#tool-video');assert.equal(await page.locator('#video-engine').inputValue(),'wan','Explicit model choice persists between tools');
await page.selectOption('#video-engine','seedance');await page.setViewportSize({width:390,height:844});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Video editor fits mobile');
console.log('VIDEO_REFRESH_MOBILE='+Buffer.from(await page.screenshot({type:'jpeg',quality:75,fullPage:true})).toString('base64'));
await page.click('#clear');assert.equal(await page.locator('#video-start-thumb').isVisible(),false);assert.equal(await page.locator('#video-end-thumb').isVisible(),false);
assert.deepEqual(errors,[]);console.log('PASS Seedance defaults, real frame thumbnails, model choice preservation, typography and mobile Video layout');
await page.click('#mode-extend');
await page.setInputFiles('#video-references','assets/optimized/video/fashion-after-fabric/artists/elorian/multionetwo-mobile.mp4');
await page.waitForFunction(()=>document.querySelectorAll('#video-reference-list video').length===1);
await page.fill('#prompt','Continue the slow movement through the room.');
assert.equal(await page.locator('#generate').isEnabled(),true,'An uploaded video enables extension');
assert.equal(await page.evaluate(()=>window.__referenceSettings().provider),'higgsfield');assert.equal(await page.locator('#preview-label').textContent(),'Video to extend');
assert.equal(await page.evaluate(()=>window.__referenceSettings().referenceVideos.length),1);
assert.equal(await page.locator('#ratio-control').isVisible(),false,'Extension follows the input framing');
console.log('VIDEO_EXTEND_MOBILE='+Buffer.from(await page.screenshot({type:'jpeg',quality:75,fullPage:true})).toString('base64'));
await page.setViewportSize({width:1440,height:1000});
console.log('VIDEO_EXTEND_DESKTOP='+Buffer.from(await page.screenshot({type:'jpeg',quality:75})).toString('base64'));
await page.click('#video-create-task');await page.click('#mode-extend');
assert.equal(await page.locator('#video-reference-list video').count(),1,'Changing task keeps the uploaded video');
await page.click('#clear');assert.equal(await page.locator('#generate').isDisabled(),true);
assert.deepEqual(errors,[]);console.log('PASS extension upload, provider selection, preserved inputs and clearing');

let fashionQuotes=0,fashionSubmits=0,fashionUploads=0,quotedFashion=null;
await page.route('https://parallel-vision-lab.parallelvision.workers.dev/api/fashion/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let result={};
  if(path==='/api/fashion/models')result={models:['fashn16','fashnmax','fluxvto'].map(id=>({id,label:id,available:true}))};
  else if(path==='/api/fashion/balance')result={connected:true,credits:{total:40,onDemand:40,subscription:0}};
  else if(path==='/api/fashion/quote'){fashionQuotes++;quotedFashion=route.request().postDataJSON();result={id:'fashion-test-quote',estimatedUsd:.15,notice:'Test quote.',expiresAt:Date.now()+60000};}
  else if(path==='/api/fashion/submit'){fashionSubmits++;result={job:{id:'fashion-test-job',status:'queued',settings:{mode:'fashion',fashionModel:'fashnmax'}}};}
  return route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
});
await page.route('https://parallel-vision-lab.parallelvision.workers.dev/api/uploads',route=>{
  fashionUploads++;return route.fulfill({contentType:'application/json',body:JSON.stringify({id:'fashion-input-'+fashionUploads})});
});
await page.setViewportSize({width:1440,height:1000});
await page.click('#tool-image');await page.fill('#image-composer-prompt','Keep this image direction when visiting Fashion.');
const studioUrl=page.url();await page.evaluate(()=>window.__fashionDocument='same-studio');
const navGeometry=await page.locator('.tool-switch .tool-group > *').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
await page.click('#tool-fashion');
const fashion=page.locator('#fashion-studio');
await fashion.locator('#workspace').waitFor({state:'visible'});
assert.equal(new URL(page.url()).searchParams.get('tool'),'fashion','Fashion updates the section URL');assert.equal(new URL(page.url()).pathname,new URL(studioUrl).pathname,'Fashion stays in the same document');
assert.equal(await page.evaluate(()=>window.__fashionDocument),'same-studio');
assert.equal(await page.locator('#tool-fashion').getAttribute('aria-pressed'),'true');
assert.deepEqual(await page.locator('.tool-switch .tool-group > *').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})),navGeometry,'Fashion preserves navigation geometry');
assert.equal(await page.locator('#image-composer').isVisible(),false);
assert.equal(await fashion.locator('.site-header').count(),0,'No second Fashion header');
assert.equal(fashionSubmits,0,'Opening Fashion never generates');
await fashion.locator('#person-file').setInputFiles({name:'person.png',mimeType:'image/png',buffer:png});
await fashion.locator('#garment-file').setInputFiles({name:'garment.png',mimeType:'image/png',buffer:png});
await fashion.locator('#direction').fill('Preserve the pose and natural fabric texture.');
await fashion.locator('#person-preview').evaluate(img=>img.decode());
await fashion.locator('#garment-preview').evaluate(img=>img.decode());
const person=await fashion.locator('#person-preview').getAttribute('src');
await page.click('#tool-video');await page.click('#tool-fashion');
assert.equal(await fashion.locator('#direction').inputValue(),'Preserve the pose and natural fabric texture.');
assert.equal(await fashion.locator('#person-preview').getAttribute('src'),person,'Fashion uploads persist across sections');
await fashion.locator('#quote').click();await fashion.locator('#quote-box').waitFor({state:'visible'});
assert.equal(fashionQuotes,1);assert.equal(fashionSubmits,0,'Price review requires a separate paid confirmation');
assert.equal(quotedFashion.model,'fashnmax');assert.equal(quotedFashion.modelSourceId,'fashion-input-1');assert.equal(quotedFashion.garmentSourceId,'fashion-input-2');
assert.ok((await fashion.locator('#result-stage').boundingBox()).x>(await fashion.locator('#person-slot').boundingBox()).x,'Result remains beside source images');
console.log('FASHION_IN_STUDIO_DESKTOP='+Buffer.from(await page.screenshot({type:'jpeg',quality:75})).toString('base64'));
for(const width of [768,390,320]){
  await page.setViewportSize({width,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Fashion fits viewport '+width+' '+JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *'),...document.querySelector('#fashion-studio').shadowRoot.querySelectorAll('*')].map(el=>({tag:el.tagName,id:el.id,class:el.className,x:el.getBoundingClientRect().x,right:el.getBoundingClientRect().right,w:el.getBoundingClientRect().width})).filter(r=>r.w&&r.right>innerWidth+1).slice(0,18))));
}
assert.ok((await page.locator('#tool-fashion').boundingBox()).x+(await page.locator('#tool-fashion').boundingBox()).width<=320,'All five tabs fit the narrow mobile viewport');
console.log('FASHION_IN_STUDIO_MOBILE='+Buffer.from(await page.screenshot({type:'jpeg',quality:75,fullPage:true})).toString('base64'));
await page.setViewportSize({width:1440,height:1000});
await page.click('#tool-assets');
assert.equal(await fashion.isVisible(),false);assert.equal(await page.locator('#tool-assets').getAttribute('aria-pressed'),'true');
await page.click('#tool-fashion');await fashion.locator('.result-actions a').click();
assert.equal(await page.locator('#image-composer-prompt').inputValue(),'Keep this image direction when visiting Fashion.');
assert.equal(await fashion.isVisible(),false);assert.equal(page.url(),studioUrl,'Image Studio return stays in the same document');
assert.equal(fashionSubmits,0);assert.deepEqual(errors,[]);
console.log('PASS integrated Fashion: stable shell, shared session, preserved inputs, quotation gate and responsive design');

await page.reload();await page.waitForFunction(()=>window.__ready);
assert.equal(await page.locator('#tool-image').getAttribute('aria-pressed'),'true');
await page.click('#tool-fashion');
await page.reload();await page.waitForFunction(()=>window.__ready);
assert.equal(await page.locator('#tool-fashion').getAttribute('aria-pressed'),'true','Reload restores embedded Fashion');
await page.click('#tool-image');
let releaseCold;const coldReady=new Promise(resolve=>releaseCold=resolve);let coldReads=0;
await page.route('**/api/assets/cold-output',async route=>{coldReads++;await coldReady;await route.fulfill({contentType:'image/png',body:png});});
const coldRequested=page.waitForRequest('**/api/assets/cold-output');
await page.evaluate(()=>window.__surfaceTestJob({id:'cold-image',outputId:'cold-output',status:'completed',createdAt:Date.now(),settings:{type:'image',mode:'image',engine:'seedream',aspectRatio:'16:9',prompt:'Loading test'}}));
await coldRequested;
await page.locator('#history .card[data-job="cold-image"]').click();
assert.equal(await page.locator('#image-lightbox').isVisible(),true,'Viewer opens before a slow image finishes loading');
assert.equal(await page.locator('#image-lightbox-stage').getAttribute('aria-busy'),'true');
assert.equal(await page.locator('#tool-video').isEnabled(),true,'Slow image viewing never locks the studio');
assert.equal(coldReads,1,'Pending gallery and viewer share one asset read');
await page.keyboard.press('Escape');
const coldFinished=page.waitForResponse('**/api/assets/cold-output');releaseCold();await coldFinished;
await page.waitForFunction(()=>document.querySelector('[data-job="cold-image"] img')?.naturalWidth>0);
assert.equal(await page.locator('#image-lightbox').isVisible(),false,'Late image response cannot reopen a closed viewer');
await page.locator('#history .card[data-job="cold-image"]').click();
await page.waitForFunction(()=>document.querySelector('#image-lightbox-img').naturalWidth>0);
assert.equal(coldReads,1,'Reopening the same output needs no download');
await page.keyboard.press('Escape');
assert.ok(await page.evaluate(()=>window.__assetCacheSize())>0);
await page.evaluate(()=>window.__lockTest());
assert.equal(await page.evaluate(()=>window.__assetCacheSize()),0,'Sign-out removes private cached image bytes');
assert.equal(await page.locator('#image-lightbox').isVisible(),false);
console.log('PASS direct Fashion refresh, immediate image viewer, pending-read deduplication, safe close and session cache clearing');



jobs=[
  {id:'up-spicy',sourceId:'up-source-1',outputId:'up-out-1',status:'completed',createdAt:Date.now(),settings:{type:'image',mode:'upscale',engine:'spicy',resolution:'4k',outputFormat:'png',aspectRatio:'16:9'}},
  {id:'up-fal',sourceId:'up-source-2',outputId:'up-out-2',status:'completed',createdAt:Date.now()-1,settings:{type:'image',mode:'upscale',provider:'fal',upscaleModel:'topaz',resolution:'4k',outputFormat:'png',aspectRatio:'16:9'}},
  {id:'regular-image',outputId:'regular-out',status:'completed',createdAt:Date.now()-2,settings:{type:'image',mode:'image',engine:'seedream',resolution:'1k',aspectRatio:'16:9'}},
  {id:'regular-video',outputId:'video-out',status:'completed',createdAt:Date.now()-3,settings:{type:'video',mode:'start',engine:'seedance',resolution:'720p',duration:5,aspectRatio:'16:9'}}
];
let lastUpscaleQuery=null;
page.on('request',request=>{if(request.url().includes('/api/jobs?'))lastUpscaleQuery=new URL(request.url()).searchParams;});
await page.goto('http://127.0.0.1:8765/lab/studio.html?tool=upscale',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.__ready);
assert.equal(lastUpscaleQuery.get('kind'),'image');assert.equal(lastUpscaleQuery.get('mode'),'upscale');
assert.equal(await page.locator('.archive h2').textContent(),'Upscaled images');
assert.deepEqual(await page.locator('#history .card').evaluateAll(els=>els.map(el=>el.dataset.job)),['up-spicy','up-fal']);
const upscalePromptless=await page.locator('#history .card[data-job="up-spicy"] img').first();
await upscalePromptless.scrollIntoViewIfNeeded();
await page.waitForFunction(()=>document.querySelector('#history .card[data-job="up-spicy"] img')?.naturalWidth>0);
await page.locator('#history .card[data-job="up-spicy"]').click();
await page.locator('#image-lightbox').waitFor({state:'visible'});
assert.equal(await page.locator('#image-lightbox-download').isEnabled(),true);
await page.click('#image-detail-next');
await page.waitForFunction(()=>document.querySelector('#image-lightbox-counter').textContent==='2 / 2');
await page.keyboard.press('Escape');
for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(()=>window.scrollTo(0,0));
  assert.equal(await page.locator('#history .cardbody').first().isVisible(),false,'Gallery keeps controls inside the image detail view');
  const deck=await page.locator('.workspace').boundingBox(),gallery=await page.locator('.archive').boundingBox();
  assert.ok(gallery.y>=deck.y+deck.height,'Upscaled work sits below the entire deck at '+width);
  assert.equal(await page.locator('.archive').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Upscale gallery fits '+width);
  if(width!==320)console.log('UPSCALE_FILTERED_'+width+'='+Buffer.from(await page.screenshot({type:'jpeg',quality:75,fullPage:true})).toString('base64'));
}
await page.evaluate(()=>window.__surfaceTestJob({id:'late-image',outputId:'late-image-out',status:'completed',createdAt:Date.now(),settings:{type:'image',mode:'image',engine:'seedream',aspectRatio:'16:9',resolution:'1k'}}));
assert.equal(await page.locator('#history .card').count(),2,'Unrelated image completions do not enter Upscaler');
await page.evaluate(()=>window.__surfaceTestJob({id:'late-upscale',outputId:'late-upscale-out',status:'completed',createdAt:Date.now(),settings:{type:'image',mode:'upscale',resolution:'4k',aspectRatio:'16:9'}}));
assert.equal(await page.locator('#history .card[data-job="late-upscale"]').count(),1,'New upscales appear immediately');
await page.click('#tool-assets');await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===4);
assert.equal(lastUpscaleQuery.has('mode'),false,'Assets removes the upscale filter');
assert.equal(await page.locator('#history .card[data-job="regular-video"]').count(),1);
await page.click('#tool-upscale');await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===2);
await page.click('#history-select');await page.locator('#history .card[data-job="up-spicy"]').click();await page.click('#history-archive-selected');
await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===1);
assert.equal(await page.locator('#history .card').getAttribute('data-job'),'up-fal','Archived upscale leaves working grid');
await page.click('#tool-assets');await page.click('#assets-all');await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===4);
assert.equal(await page.locator('#history .card[data-job="up-spicy"]').count(),1,'Archived upscale remains in Assets');
jobs=jobs.filter(j=>j.settings.mode!=='upscale');
await page.click('#tool-upscale');await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===0);
await page.waitForFunction(()=>document.querySelector('#emptyarchive').textContent==='Your upscaled images will appear here.');
assert.equal(await page.locator('#emptyarchive').textContent(),'Your upscaled images will appear here.');
assert.deepEqual(errors,[]);
console.log('PASS restored Upscaler gallery: only upscales, below deck, immediate results, archive behavior, full Assets and mobile');

// Mixed portrait, landscape and video thumbnails fill the proportional cards.
const layoutSizes=[[900,1200],[1600,900],[900,1600],[1200,900],[1200,1200],[800,1200]];
const layoutImages=await page.evaluate(sizes=>sizes.map(([width,height],i)=>{
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.fillStyle=['#b8b0a2','#615c58','#979384','#b9a88f','#777e7b','#8f8881'][i];ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#28282a';ctx.fillRect(width*.25,height*.12,width*.5,height*.77);
  return canvas.toDataURL().split(',')[1];
}),layoutSizes);
jobs=layoutSizes.map(([width,height],i)=>({id:'layout-'+i,sourceId:'layout-source-'+i,outputId:'layout-output-'+i,status:'completed',createdAt:Date.now()-i*100,settings:{type:i===5?'video':'image',mode:i===5?'start':i===4?'upscale':'image',engine:'seedream',aspectRatio:width+':'+height,galleryDimensions:{assetId:'layout-output-'+i,width,height},resolution:'1k',prompt:'Mixed gallery proportions'}}));
let releaseLayout;const layoutReady=new Promise(resolve=>releaseLayout=resolve);
await page.route('**/api/assets/layout-*',async route=>{
  await layoutReady;const i=Number(new URL(route.request().url()).pathname.split('-').at(-1));
  return route.fulfill({contentType:'image/png',body:Buffer.from(layoutImages[i],'base64')});
});
await page.setViewportSize({width:1911,height:1000});
await page.goto('http://127.0.0.1:8765/lab/studio.html?tool=assets');await page.waitForFunction(()=>window.__ready);
await page.waitForFunction(()=>document.querySelectorAll('#history .card').length===6&&[...document.querySelectorAll('#history .card')].every(c=>c.style.width));
const mediaGeometry=()=>page.locator('#history .card').evaluateAll(cards=>cards.filter(c=>c.querySelector(':scope>.history-media img')).map(card=>{
  const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  const figure=card.querySelector(':scope>.history-media'),img=figure.querySelector('img');
  return {id:card.dataset.job,card:rect(card),figure:rect(figure),image:rect(img),ratio:Number(card.dataset.ratio),naturalRatio:img.naturalWidth/img.naturalHeight};
}));
const assertFills=(items,label)=>{
  assert.ok(items.length>0,label+' has thumbnails');
  for(const item of items){
    for(const child of ['figure','image'])for(const key of ['x','y','width','height'])
      assert.ok(Math.abs(item[child][key]-item.card[key])<.75,label+' '+item.id+' '+child+' '+key+' fills card: '+JSON.stringify(item));
    assert.ok(Math.abs(item.card.width/item.card.height-item.ratio)<.005,label+' preserves each asset aspect ratio');
  }
};
const pendingGeometry=await mediaGeometry();assertFills(pendingGeometry,'Loading Assets');
assert.equal(await page.locator('#history img').evaluateAll(imgs=>imgs.every(img=>getComputedStyle(img).visibility==='hidden')),true);
releaseLayout();
await page.waitForFunction(()=>[...document.querySelectorAll('#history .history-media img')].every(i=>i.naturalWidth>0));
assert.deepEqual((await mediaGeometry()).map(({card})=>card),pendingGeometry.map(({card})=>card),'Decoding does not move or resize cards');
for(const width of [1911,1440,390,320]){
  await page.setViewportSize({width,height:1000});
  for(const section of ['assets','image','upscale']){
    await page.click('#tool-'+section);
    const count=section==='assets'?6:section==='image'?5:1;
    await page.waitForFunction(n=>document.querySelectorAll('#history .card').length===n&&[...document.querySelectorAll('#history .history-media img')].every(i=>i.naturalWidth>0),count);
    await page.waitForFunction(()=>[...document.querySelectorAll('#history .card')].every(c=>c.style.width));
    const geometry=await mediaGeometry();assertFills(geometry,section+' at '+width);
    assert.ok(geometry.every(g=>Math.abs(g.card.width/g.card.height-g.naturalRatio)<.005),'Full original image fits without cropping or empty image-size bands');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No overflow '+section+' at '+width);
    if(section==='assets'&&(width===1911||width===390))console.log('ASSETS_MEDIA_FIT_'+width+'='+Buffer.from(await page.screenshot({type:'jpeg',quality:75,fullPage:true})).toString('base64'));
  }
}
assert.deepEqual(errors,[]);
console.log('PASS mixed-ratio Assets, Image and Upscaler: thumbnails fill their cards before and after decode at desktop and mobile widths');

// Generate must paint a local card before uploads, pricing or provider acceptance.
await page.route('**/api/jobs/feedback-*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({job:jobs.find(j=>j.id===new URL(route.request().url()).pathname.split('/').at(-1))})}));
await page.setViewportSize({width:1440,height:1000});
await page.goto('http://127.0.0.1:8765/lab/studio.html?tool=image');await page.waitForFunction(()=>window.__ready);
const largePng=Buffer.concat([png,Buffer.alloc(11*1024*1024)]);
const referenceFiles=Array.from({length:5},(_,i)=>({name:'submit-ref-'+i+'.png',mimeType:'image/png',buffer:i<2?largePng:png}));
await page.locator('#reference-images').setInputFiles(referenceFiles);
await page.waitForFunction(()=>document.querySelectorAll('.composer-reference-tile').length===5);
await page.fill('#image-composer-prompt','Capture this exact direction before upload.');
const capturedImageSettings=await page.evaluate(()=>window.__referenceSettings());
let releaseUploads,releaseQuote,releaseSubmit,uploadsStarted;
const threeUploadsStarted=new Promise(r=>uploadsStarted=r);
const uploadsGate=new Promise(r=>releaseUploads=r),quoteGate=new Promise(r=>releaseQuote=r),submitGate=new Promise(r=>releaseSubmit=r);
let uploadCount=0,inflightUploads=0,maxInflight=0,quoteCount=0,submitCount=0,dialogs=0,failQuote=false,interruptSubmit=false;
const originalNames=[],copyNames=[],quotes=new Map();
const noPopup=async dialog=>{dialogs++;await dialog.dismiss();};page.on('dialog',noPopup);
await page.route('**/api/uploads',async route=>{
  const request=route.request(),name=decodeURIComponent(request.headers()['x-filename']);uploadCount++;inflightUploads++;maxInflight=Math.max(maxInflight,inflightUploads);if(inflightUploads===3)uploadsStarted();
  await uploadsGate;
  if(name.endsWith('.png')){
    originalNames.push(name);assert.ok(request.postDataBuffer().equals(referenceFiles.find(f=>f.name===name).buffer),'Original bytes stay unchanged');
  }else{copyNames.push(name);assert.equal(request.headers()['content-type'],'image/webp');assert.ok(request.postDataBuffer().length<10*1024*1024,'Working copy meets the transfer limit');}
  inflightUploads--;return route.fulfill({contentType:'application/json',body:JSON.stringify({id:'uploaded-'+name})});
});
await page.route('**/api/quotes',async route=>{
  quoteCount++;await quoteGate;
  if(failQuote)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Price temporarily unavailable.'})});
  const payload=route.request().postDataJSON(),id='feedback-quote-'+quoteCount;
  quotes.set(id,payload);return route.fulfill({contentType:'application/json',body:JSON.stringify({id,settings:payload.settings,expiresAt:Date.now()+60000,maxUsd:.1,estimatedUsd:.1})});
});
await page.route('**/api/jobs',async route=>{
  if(route.request().method()!=='POST')return route.fallback();
  submitCount++;await submitGate;
  if(interruptSubmit)return route.abort('failed');
  const payload=route.request().postDataJSON();assert.equal(payload.confirm,true);
  const quoted=quotes.get(payload.quoteId);assert.ok(quoted);
  const job={id:'feedback-job-'+submitCount,status:'queued',createdAt:Date.now(),sourceId:quoted.sourceId,settings:quoted.settings};jobs.unshift(job);
  return route.fulfill({contentType:'application/json',body:JSON.stringify({job})});
});
await page.click('#image-composer-generate');
await page.waitForFunction(()=>document.querySelector('.submission-title')?.textContent==='Uploading references');
assert.equal(await page.locator('[data-local-submission]').count(),1,'Card appears before any upload completes');
assert.equal(submitCount,0);assert.equal(quoteCount,0);
await page.waitForFunction(()=>document.querySelector('.submission-detail')?.textContent==='0 / 5');
// The upload routes are already held open; allow their request handlers to run.
await threeUploadsStarted;
assert.equal(maxInflight,3,'Three references upload concurrently');
assert.equal(await page.locator('#tool-video').isEnabled(),true);
await page.evaluate(()=>{document.querySelector('#generate').onclick();document.querySelector('#generate').onclick();});
assert.equal(await page.locator('[data-local-submission]').count(),1,'Repeated clicks do not create duplicate submissions');
await page.fill('#image-composer-prompt','This edit belongs to the next image.');
await page.click('#tool-video');assert.equal(await page.locator('[data-local-submission]').count(),0);
await page.click('#tool-image');await page.waitForFunction(()=>document.querySelectorAll('[data-local-submission]').length===1);
await page.setViewportSize({width:390,height:844});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Pending card fits mobile');
console.log('IMAGE_SUBMISSION_PROGRESS='+Buffer.from(await page.screenshot({type:'jpeg',quality:75})).toString('base64'));
await page.setViewportSize({width:1440,height:1000});
releaseUploads();
await page.waitForFunction(()=>document.querySelector('.submission-title')?.textContent==='Preparing provider files');
assert.equal(dialogs,0,'Automatic working copies do not interrupt Generate with a confirmation');
assert.equal(originalNames.length,5);assert.equal(copyNames.length,2);assert.equal(uploadCount,7);
releaseQuote();
await page.waitForFunction(()=>document.querySelector('.submission-title')?.textContent==='Submitting');
assert.equal(await page.locator('[data-local-submission][data-state="queued"]').count(),0,'Unaccepted request is never labelled queued');
const captured=quotes.values().next().value;
assert.deepEqual(captured.settings,capturedImageSettings,'The request keeps the captured direction, roles and settings');
assert.deepEqual(captured.referenceSourceIds,referenceFiles.map(f=>'uploaded-'+f.name),'Parallel uploads preserve reference order');
assert.deepEqual(captured.transferSourceIds,referenceFiles.map((f,i)=>'uploaded-'+(i<2?f.name.replace('.png','-working-copy.webp'):f.name)));
releaseSubmit();
await page.waitForFunction(()=>document.querySelector('[data-job="feedback-job-1"]')?.dataset.state==='queued'&&!document.querySelector('[data-local-submission]')).catch(async error=>{console.log('SUBMISSION_HANDOFF_DEBUG='+JSON.stringify({submitCount,quoteCount,jobs:jobs.map(j=>({id:j.id,status:j.status})),errors,ui:await page.evaluate(()=>({notice:document.querySelector('#notice').textContent,cards:[...document.querySelectorAll('#history .card')].map(c=>({job:c.dataset.job,state:c.dataset.state,local:c.dataset.localSubmission,text:c.innerText.slice(0,250)})),tool:location.search}))}));throw error;});
assert.equal(await page.locator('[data-job="feedback-job-1"]').count(),1,'Real job replaces the local card once');assert.equal(submitCount,1);
await page.click('#image-composer-generate');
await page.waitForFunction(()=>document.querySelector('[data-job="feedback-job-2"]')?.dataset.state==='queued'&&!document.querySelector('[data-local-submission]'));
assert.equal(uploadCount,7,'Second generation reuses originals and prepared working copies');assert.equal(dialogs,0);assert.equal(submitCount,2);
failQuote=true;await page.click('#image-composer-generate');
await page.waitForFunction(()=>document.querySelector('.submission-title')?.textContent==='Could not prepare');
assert.equal(submitCount,2,'Pricing failure never submits a paid request');
await page.locator('.submission-dismiss').click();assert.equal(await page.locator('[data-local-submission]').count(),0);
failQuote=false;interruptSubmit=true;await page.click('#image-composer-generate');
await page.waitForFunction(()=>document.querySelector('.submission-title')?.textContent==='Request not confirmed');
assert.equal(submitCount,3,'Interrupted paid request is not automatically retried');
await page.click('#refresh');assert.equal(submitCount,3,'History refresh does not repeat the generation');
await page.evaluate(()=>window.__lockTest());assert.equal(await page.locator('[data-local-submission]').count(),0,'Sign-out clears local submission state');
page.off('dialog',noPopup);assert.deepEqual(errors,[]);
console.log('PASS immediate submission cards, bounded parallel uploads, immutable snapshots, automatic cached working copies, provider handoff, failures and no duplicate paid requests');

await browser.close();server.close();})().catch(e=>{console.error(e);server.close();process.exit(1)});
