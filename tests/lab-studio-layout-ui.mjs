// Mock-only Lab UI layout verification. Never contacts paid providers.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf("try{clerk=await loadLabAccount();");
const bootEnd=source.indexOf("\n// Soul composer:",boot);
assert.ok(boot>0&&bootEnd>boot,'Expected distinct auth bootstrap and Soul composer tail');
const authSync=source.slice(source.indexOf('async function sync(){'),source.indexOf("$('studio-invite-friends').onclick"));
const requestedAt=authSync.indexOf('await restoreStudioEntry(requestedRoute)');
const revealedAt=authSync.indexOf('finishLabBoot();');
const historyAt=authSync.indexOf('const historyReady=loadHistory()',requestedAt);
const historyGrace=authSync.indexOf('await Promise.race([historyReady,',historyAt);
assert.ok(requestedAt>=0&&historyAt>requestedAt&&historyGrace>historyAt&&revealedAt>historyGrace,
  'Restore the requested Studio route, then allow a bounded private History grace period before showing the verified workspace');
assert.ok(authSync.includes('if(historyResolved)showWelcomeStart(data)')&&authSync.includes("document.body.classList.contains('lab-ready'))showWelcomeStart(data)"),
  'Show welcome Moods only once private History has actually settled, including a late response');
assert.ok(authSync.includes("document.documentElement.classList.add('pv-studio-route-pending')"),'Protect the loader during authenticated initialization');
assert.ok(source.includes("document.documentElement.classList.remove('pv-studio-route-pending')"),'Boot release clears its route guard');
assert.ok(source.includes("document.documentElement.classList.add('pv-studio-boot-lock')"),'In-place sign-in reactivates the loading scrollbar lock');
const studioHtml=readFileSync('lab/studio.html','utf8');
const accountSdk=readFileSync('lab/native-account.js','utf8');
assert.match(accountSdk,/boundedSetup\(Promise\.all\(\[sdk,ui\]\),12000/,'Clerk resources cannot load indefinitely');
assert.match(accountSdk,/boundedSetup\(clerk\.load\(/,'Signed-in Clerk initialization has a deadline');
assert.match(studioHtml,/window\.__pvLabBootRecover=/,'Early loader provides an independent recovery action');
assert.match(studioHtml,/window\.setTimeout\(window\.__pvLabBootRecover,22000\)/,'A stalled Studio cannot hide behind the splash indefinitely');
assert.match(studioHtml,/document\.addEventListener\('click',event=>/,'Reload works before DOMContentLoaded');
assert.match(studioHtml,/recoveryTimer=window.setTimeout\(window.__pvLabBootRecover,22000\)/,
  'A stalled account handshake gets a bounded recovery independently of Studio modules');
assert.match(studioHtml,/<html lang="en" class="pv-studio-boot-lock">/,'Initial HTML locks scroll before any route renders');
assert.match(studioHtml,/html\.pv-studio-boot-lock\{scroll-behavior:auto!important\}/,'Boot overrides smooth scrolling while locked');
assert.match(studioHtml,/@media\(min-width:761px\)\{html\.pv-studio-boot-lock\{scrollbar-gutter:stable\}\}/,
  'Classic scrollbar gutter is reserved on the HTML root before the Image route initializes');
assert.match(studioHtml,/@media\(min-width:761px\)\{html:has\(#app\.image-studio-active\)\{scrollbar-gutter:stable\}\}/,
  'Image route retains the same gutter once the loading lock is removed');
assert.match(studioHtml,/#lab-boot\{position:fixed;inset:0;width:100vw;/,
  'Splash keeps true viewport width even when the Image route adds a scrollbar gutter');
assert.doesNotMatch(studioHtml, /lab-boot-architecture|pv-architecture-reveal|lab-boot-fluid|pv-fluid-/,
  'Restore the original quiet loading screen without geometric or fluid decoration');
assert.match(studioHtml, /<div id="lab-boot"[^>]*>\s*<div class="lab-boot-content">/,
  'The original centered brand and progress line are the only visible boot content');
assert.match(studioHtml, /animation:pv-boot-dismiss \.24s ease-out both/,
  'Retain the approved 240ms exit fade without modification');
assert.match(studioHtml, /@keyframes pv-boot-out\{0%,12%\{opacity:1;filter:blur\(0\);transform:none\}55%\{opacity:\.82;filter:blur\(3px\);transform:none\}100%\{opacity:0;filter:blur\(9px\);transform:none\}\}/,
  'The PV LAB logo fades and blurs on exit, without horizontal translation or scaling');
assert.match(studioHtml, /@keyframes pv-boot-trail-out\{0%,17%\{opacity:0;filter:blur\(0\);transform:none\}56%\{opacity:\.46;filter:blur\(5px\);transform:none\}100%\{opacity:0;filter:blur\(12px\);transform:none\}\}/,
  'The duplicate blur trail also stays at fixed coordinates during fade-out');
assert.match(studioHtml, /\.lab-boot-wordmark::before\{[^}]*background:url\("\.\/branding\/pvlab-wordmark-bold\.svg\?v=20261022-bold1"\) center\/100% 100% no-repeat;/,
  'Blur trail uses the exact approved logo asset rather than the outdated thin text');
const loaderSvg=studioHtml.match(/<span class="lab-boot-wordmark" id="lab-boot-name" role="img" aria-label="PV LAB">(<svg[\s\S]*?<\/svg>)<\/span>/)?.[1]||'';
const canonicalSvg=readFileSync('lab/branding/pvlab-wordmark-bold.svg','utf8');
assert.ok(loaderSvg.includes('viewBox="0 0 5588 1761"'),'Inline SVG uses the approved bold wordmark dimensions');
assert.equal(loaderSvg.match(/<path d="([^"]+)"/)?.[1],canonicalSvg.match(/<path d="([^"]+)"/)?.[1],
  'Loader displays the exact same outlined logo path as the live Studio header');
assert.match(studioHtml,/history\.scrollRestoration='manual';/,'All direct routes opt out of stale Chrome scroll restoration');
assert.match(studioHtml,/new MutationObserver\(scheduleBootUnlock\)/,'Native route completion can release the boot scroll lock');
const splashWordmark=studioHtml.match(/\.lab-boot-wordmark\{([^}]*)\}/)?.[1]||'';
assert.match(splashWordmark,/aspect-ratio:5588\/1761;/,'Loader reserves the new vector logo aspect ratio on first paint');
assert.doesNotMatch(splashWordmark,/font-family|letter-spacing|padding-left/,'No legacy thin-text styling remains on the wordmark');

// Replace only remote Clerk bootstrap. Preserve all remaining local Studio helpers.
const testSource=source.slice(0,boot)+source.slice(bootEnd)+
"clerk={isSignedIn:true,user:{id:'layout-test'},session:{id:'mock',getToken:async()=> 'mock-token'},signOut:async()=>{}};owner=true;userId='layout-test';config={enabled:true,geminiEnabled:true,falEnabled:true,dailyLimitUsd:10,concurrency:{image:4,video:1}};$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();await loadSoulProIdentity();refreshCanvasImport();update();syncVideoStudioMode();window.__pvLabFinishBoot?.();window.__queueTestSetActiveJobs=setActiveJobs;window.__layoutTest=true;";

const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  const file=resolve(root,'.'+u.pathname+(u.pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp'})[extname(file)]||'text/plain');
  res.end(u.pathname==='/lab/lab.js'?testSource:readFileSync(file));
});
await new Promise(r=>server.listen(4182,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
mkdirSync('test-results',{recursive:true});
const geometry=async page=>page.evaluate(()=>{
  const rect=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,width:r.width};};
  return {
    header:rect('header'),navigation:rect('.tool-switch'),workspace:rect('.workspace'),
    panel:rect('.controls'),scroll:rect('.controls-body'),dock:rect('.controls>.generate-zone'),
    generate:rect('#generate'),stage:rect('.stage'),inspector:rect('#video-inspector'),canvas:rect('.canvas'),
    model:rect('#video-model-control'),modes:rect('#video-modes'),
    viewport:{width:innerWidth,height:innerHeight},
    documentWidth:document.documentElement.scrollWidth,
    scrollMode:getComputedStyle(document.querySelector('.controls-body')).overflowY,
    accent:getComputedStyle(document.querySelector('.mode-tab.active')).backgroundColor,
    heroHidden:getComputedStyle(document.querySelector('#gate')).display==='none',
    explanationCollapsed:!document.querySelector('.model-details').open
  };
});
async function open(width,height,packFixtures=[]){
  const context=await browser.newContext({viewport:{width,height},acceptDownloads:true});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://**/*',async route=>{
    const u=new URL(route.request().url());
    if(!u.hostname.endsWith('parallelvision.workers.dev'))return route.abort();
    const path=u.pathname;
    if(packFixtures.length&&path.startsWith('/api/assets/')){
      // Photographs are private mock bytes. The first image is portrait,
      // later ones are landscape, so the cover chooser has a real comparison.
      const portrait='iVBORw0KGgoAAAANSUhEUgAAAAUAAAAICAIAAAC+k6JsAAAAFElEQVR42mPsOfGMAQkwMaACWvMBHMECSiMsnzcAAAAASUVORK5CYII=';
      const landscape='iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAIAAAD38zoCAAAAFUlEQVR42mPsOfGMARtgYsABqCgBABSBAkSB+D7tAAAAAElFTkSuQmCC';
      const isPortrait=path.includes('a101');
      return route.fulfill({status:200,contentType:'image/png',body:Buffer.from(isPortrait?portrait:landscape,'base64')});
    }
    const content=path==='/api/jobs'?{jobs:[],activeJobs:[],concurrency:{image:4,video:1},next:null}:path==='/api/packs'?{packs:packFixtures}:path==='/api/soul-pro/identity'?{configured:false,count:0,refs:[]}:{};
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(content)});
  });
  await page.goto('http://127.0.0.1:4182/lab/studio.html?tool=video');
  await page.waitForFunction(()=>window.__layoutTest===true,{timeout:30000}).catch(e=>{console.error('STUDIO_BOOT_DIAGNOSTICS',JSON.stringify({errors,body:page.url()}));throw e;});
  await page.locator('#lab-boot').waitFor({state:'hidden',timeout:2000});
  return {page,context,errors};
}
try{
  let x=await open(1440,900);
  let d=await geometry(x.page);
  console.log('DESKTOP_LAYOUT',JSON.stringify(d));
  assert.equal(d.heroHidden,true,'Large marketing hero must not appear in signed-in workspace');
  assert.ok(d.navigation.top>=d.header.top&&d.navigation.bottom<=d.header.bottom,'Tool tabs stay inside the shared header');
  assert.ok(Math.abs(d.workspace.top-d.header.bottom)<=3,'Workspace starts directly below the shared header');
  assert.ok(d.workspace.top<140,'Workspace must be above the fold');
  assert.equal(d.dock.height,64,'Approved relaxed Generate dock retains its fixed 64px track');
  assert.ok(d.dock.bottom<=d.panel.bottom+2,'Generation controls remain inside their panel');
  assert.ok(d.generate.bottom<=d.panel.bottom+2,'Generate dock must remain inside left panel');
  assert.ok(Math.abs(d.stage.top-d.inspector.top)<2&&Math.abs(d.stage.bottom-d.inspector.bottom)<2,'Video preview and right inspector share their top and bottom edges');
  await x.page.waitForFunction(()=>document.querySelector('#app').classList.contains('pv-video-state-ready'));
  assert.equal(await x.page.locator('#video-job-stage').isVisible(),false,
    'The video creation page never autoselects a completed history record');
  assert.equal(await x.page.locator('#video-inspector-empty').isVisible(),true,
    'The default inspector shows real current scene information');
  assert.match(await x.page.locator('#video-inspector-empty').innerText(),/CURRENT SCENE/);
  await x.page.click('#mode-text');
  await x.page.waitForFunction(()=>document.querySelector('#app').classList.contains('pv-video-mode-text'));
  assert.ok((await x.page.locator('#prompt').evaluate(el=>el.getBoundingClientRect().height))>=190,
    'Text mode uses an expanded writing surface');
  await x.page.locator('#prompt').fill('Gentle camera movement.');
  assert.equal(await x.page.locator('#generate').isEnabled(),true);
  await x.page.waitForFunction(()=>{
    const style=getComputedStyle(document.querySelector('#generate'));
    // Owner-approved flat white Video Generate, including its ready-state override.
    return style.backgroundColor==='rgb(255, 255, 255)'&&style.backgroundImage==='none';
  },{},{timeout:3000});
  await x.page.screenshot({path:'test-results/lab-video-white-generate.png',fullPage:false});
  await x.page.locator('#prompt').fill('');
  await x.page.click('#mode-start');
  await x.page.waitForFunction(()=>document.querySelector('#app').classList.contains('pv-video-mode-start'));
  const pair=await x.page.evaluate(()=>{
    const start=document.getElementById('drop').getBoundingClientRect();
    const end=document.getElementById('last-drop').getBoundingClientRect();
    return {startTop:start.top,endTop:end.top,startRight:start.right,endLeft:end.left,
      startWidth:start.width,endWidth:end.width};
  });
  assert.ok(Math.abs(pair.startTop-pair.endTop)<12&&pair.startRight<pair.endLeft&&
    pair.startWidth>110&&pair.endWidth>110,
    'Start and optional End frames appear in two balanced upload boxes: '+JSON.stringify(pair));
  assert.equal(await x.page.locator('#pv-video-start-visual').isVisible(),true,
    'Empty Start frame mode has its own illustrated create state');
  const videoLayout=await x.page.evaluate(()=>{
    const workspace=document.querySelector('.workspace'),feed=document.querySelector('#video-feed-center');
    const editor=document.querySelector('.controls'),panel=document.querySelector('#video-inspector');
    const fake=document.createElement('div');fake.style.height='1100px';fake.style.flex='0 0 1100px';feed.append(fake);
    feed.scrollTop=260;
    const positionBefore=editor.getBoundingClientRect().top;
    const result={mode:workspace.classList.contains('video-layout'),feedOverflow:getComputedStyle(feed).overflowY,
      feedScroll:feed.scrollTop,panelVisible:getComputedStyle(panel).display!=='none',
      editorPositionAfter:editor.getBoundingClientRect().top,editorPositionBefore:positionBefore,
      stageParent:document.querySelector('.stage').parentElement.id,
      historyParent:document.querySelector('#history').closest('.video-feed-center')?.id};
    fake.remove();feed.scrollTop=0;
    return result;
  });
  console.log('VIDEO_WORKSPACE',JSON.stringify(videoLayout));
  assert.equal(videoLayout.mode,true,'Video has its dedicated three-column workspace');
  assert.equal(videoLayout.stageParent,'video-feed-center','Existing video stage lives inside results feed');
  assert.equal(videoLayout.historyParent,'video-feed-center','Existing private History lives inside results feed');
  assert.ok(videoLayout.feedScroll>100,'Results feed scrolls independently of left creation panel');
  assert.equal(videoLayout.panelVisible,true,'Right video details panel is visible');
  // Central/header wheel input reaches History. The whole editor and inspector
  // retain their own scrolling, including at either boundary.
  await x.page.evaluate(()=>{
    const filler=document.createElement('div');filler.id='video-wheel-test';
    filler.style.cssText='height:1800px;flex:0 0 1800px';
    document.getElementById('video-feed-center').append(filler);
    document.querySelector('.controls-body').scrollTop=10000;
  });
  for(const selector of ['#studio-header','.stage']){
    await x.page.evaluate(()=>document.getElementById('video-feed-center').scrollTop=0);
    const box=await x.page.locator(selector).boundingBox();
    await x.page.mouse.move(box.x+box.width/2,box.y+Math.min(24,box.height/2));
    await x.page.mouse.wheel(0,350);
    await x.page.waitForFunction(()=>document.getElementById('video-feed-center').scrollTop>100);
    await x.page.mouse.wheel(0,-350);
    await x.page.waitForFunction(()=>document.getElementById('video-feed-center').scrollTop<2);
  }
  await x.page.evaluate(()=>{
    const filler=document.createElement('div');filler.id='video-controls-wheel-test';
    filler.style.cssText='height:1800px;flex:0 0 1800px';
    const controls=document.querySelector('.controls-body');controls.append(filler);controls.scrollTop=0;
  });
  const controlsBox=await x.page.locator('.controls-body').boundingBox();
  await x.page.mouse.move(controlsBox.x+12,controlsBox.y+12);
  await x.page.mouse.wheel(0,250);
  await x.page.waitForFunction(()=>document.querySelector('.controls-body').scrollTop>100);
  assert.equal(await x.page.locator('#video-feed-center').evaluate(el=>el.scrollTop),0,
    'Scrollable settings retain native wheel priority over History');
  await x.page.evaluate(()=>{document.querySelector('.controls-body').scrollTop=100000;document.getElementById('video-feed-center').scrollTop=0;});
  await x.page.mouse.wheel(0,350);
  await x.page.waitForTimeout(150);
  assert.equal(await x.page.locator('#video-feed-center').evaluate(el=>el.scrollTop),0,
    'Settings bottom never hands wheel input to History');
  assert.ok(await x.page.locator('.controls-body').evaluate(el=>Math.abs(el.scrollHeight-el.clientHeight-el.scrollTop)<2),
    'Settings stay at their bottom boundary');
  await x.page.evaluate(()=>{document.querySelector('.controls-body').scrollTop=0;document.getElementById('video-feed-center').scrollTop=350;});
  await x.page.mouse.wheel(0,-350);
  await x.page.waitForTimeout(150);
  assert.equal(await x.page.locator('#video-feed-center').evaluate(el=>el.scrollTop),350,
    'Settings top never hands wheel input to History');
  for(const selector of ['.controls>.generate-zone','#video-inspector']){
    const box=await x.page.locator(selector).boundingBox();
    await x.page.mouse.move(box.x+box.width/2,box.y+Math.min(24,box.height/2));
    for(const delta of [350,-350]){
      await x.page.mouse.wheel(0,delta);
      await x.page.waitForTimeout(150);
      assert.equal(await x.page.locator('#video-feed-center').evaluate(el=>el.scrollTop),350,
        selector+' never redirects wheel input to History');
    }
  }
  await x.page.evaluate(()=>{
    const prompt=document.getElementById('prompt');
    prompt.value='Scroll isolation test\n'.repeat(100);prompt.dispatchEvent(new Event('input',{bubbles:true}));
    prompt.scrollIntoView({block:'center'});
  });
  const promptBox=await x.page.locator('#prompt').boundingBox();
  await x.page.mouse.move(promptBox.x+20,promptBox.y+20);
  await x.page.mouse.wheel(0,200);
  await x.page.waitForFunction(()=>document.getElementById('prompt').scrollTop>50);
  for(const [edge,delta] of [[100000,350],[0,-350]]){
    const panelTop=await x.page.evaluate(edge=>{
      document.getElementById('prompt').scrollTop=edge;
      return document.querySelector('.controls-body').scrollTop;
    },edge);
    await x.page.mouse.wheel(0,delta);
    await x.page.waitForTimeout(150);
    assert.equal(await x.page.locator('.controls-body').evaluate(el=>el.scrollTop),panelTop,
      'Prompt boundary does not move its containing controls');
    assert.equal(await x.page.locator('#video-feed-center').evaluate(el=>el.scrollTop),350,
      'Prompt boundary does not move History');
  }
  await x.page.locator('#prompt').fill('');
  await x.page.evaluate(()=>document.getElementById('video-feed-center').scrollTop=0);

  await x.page.evaluate(()=>{
    document.getElementById('video-wheel-test').remove();
    document.getElementById('video-controls-wheel-test').remove();
    document.querySelector('.controls-body').scrollTop=0;
  });
  console.log('PASS Video center/header reach History; deck, dock, inspector and prompt stay isolated at both edges');
  await x.page.screenshot({path:'test-results/lab-video-feed-desktop.png',fullPage:false});

  // The old Live Queue was a full-width slab *below* Video, introducing unwanted
  // document scrolling and hiding provider warnings far from the workspace.
  const overflow=await x.page.evaluate(()=>{
    window.scrollTo({top:5000,behavior:'instant'});
    return {windowY:window.scrollY,documentHeight:document.documentElement.scrollHeight,
      viewportHeight:innerHeight,bodyOverflow:getComputedStyle(document.body).overflow,
      mainOverflow:getComputedStyle(document.getElementById('main')).overflow};
  });
  console.log('VIDEO_OUTER_SCROLL',JSON.stringify(overflow));
  assert.equal(overflow.windowY,0,'Desktop Video must not scroll outside the center results feed');
  assert.equal(overflow.bodyOverflow,'hidden','Desktop Video locks the outer page scroll');
  assert.equal(overflow.mainOverflow,'hidden','Video main workspace does not push to footer');
  await x.page.evaluate(()=>window.__queueTestSetActiveJobs([
    {id:'11111111-1111-4111-8111-111111111111',status:'uncertain',
     settings:{type:'image',engine:'gemini',mode:'image'},error:'Provider response needs checking.'},
    {id:'22222222-2222-4222-8222-222222222222',status:'uncertain',
     settings:{type:'image',engine:'fal',mode:'image'},error:'Check status before retrying.'}
  ]));
  assert.equal(await x.page.locator('#active').isVisible(),true,'Queue status is visible when jobs need review');
  assert.equal(await x.page.locator('#active').evaluate(el=>el.closest('#studio-header')!==null),true,
    'Live Queue belongs to Studio header instead of below editor');
  assert.equal(await x.page.locator('#active').evaluate(el=>el.open),false,'Queue details collapsed by default');
  assert.match(await x.page.locator('#queue-count').textContent(),/2 to review/);
  assert.equal(await x.page.locator('#resolve').isVisible(),false,'Resolve action hidden until user opens Queue');
  await x.page.locator('#active summary').click();
  assert.equal(await x.page.locator('#resolve').isVisible(),true,'Provider recovery remains accessible in Queue');
  assert.match(await x.page.locator('#active-detail').innerText(),/Check status before retrying/);
  await x.page.screenshot({path:'test-results/lab-video-queue-popover.png',fullPage:false});
  await x.page.keyboard.press('Escape');
  assert.equal(await x.page.locator('#active').evaluate(el=>el.open),false,'Escape dismisses Queue');
  await x.page.locator('#active summary').click();
  await x.page.locator('#video-feed-center').click({position:{x:40,y:40}});
  assert.equal(await x.page.locator('#active').evaluate(el=>el.open),false,'Outside click dismisses Queue');
  await x.page.evaluate(()=>window.__queueTestSetActiveJobs([]));
  assert.equal(await x.page.locator('#active').isVisible(),false,'Queue chip disappears when there are no jobs');
  assert.equal(await x.page.evaluate(()=>window.scrollY),0,'Queue does not introduce body scrolling');

  assert.ok(d.generate.top>=d.panel.top,'Generate remains visible without scrolling the form');
  assert.equal(d.scrollMode,'auto','Video creation controls may scroll separately if a chosen model has extra settings');
  const videoTypography=await x.page.locator('#prompt').evaluate(el=>{
    const style=getComputedStyle(el);
    return {size:parseFloat(style.fontSize),family:style.fontFamily,color:style.color};
  });
  assert.equal(videoTypography.size,14,'Approved relaxed Video motion prompt uses 14px type');
  assert.match(videoTypography.family,/DM Sans/,'PV Lab uses its own editorial UI typography');
  assert.equal(d.stage.height,744,'Approved relaxed desktop stage leaves room for real History');
  assert.equal(d.canvas.height,d.stage.height-2,'Empty artwork fills the bordered preview');
  assert.ok(d.modes.top-d.model.bottom<110,'Start/reference buttons remain near model info');
  assert.equal(d.explanationCollapsed,true);
  assert.equal(await x.page.locator('#studio-header .lab-brand').innerText(),'PV LAB','Studio uses the same PV LAB identity as the public pages');
  assert.equal(await x.page.locator('#studio-header .lab-brand').getAttribute('href'),'./','The brand returns to the Lab homepage');
  assert.equal(await x.page.locator('#lab-boot').isVisible(),false,'Loading screen must disappear after workspace becomes usable');
  assert.equal(await x.page.locator('#gate').isVisible(),false,'Login gate must never flash inside signed-in workspace');
  assert.notEqual(d.accent,'rgb(141, 99, 255)','No default purple selection');
  assert.ok(await x.page.locator('#empty-title').innerText().then(t=>/next scene/i.test(t)),'Video opens with an inviting scene direction');
  assert.ok(await x.page.locator('#canvas-secondary').isVisible(),'Video offers an alternate entry into Image');
  assert.equal(await x.page.locator('.canvas').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(13, 14, 16)','Video playback uses the intended near-black #0d0e10 canvas, without a colored overlay');
  const palette=await x.page.evaluate(()=>{
    const style=getComputedStyle(document.documentElement);
    return {
      bg:style.getPropertyValue('--bg').trim(),
      canvas:style.getPropertyValue('--canvas').trim(),
      image:getComputedStyle(document.querySelector('.canvas')).backgroundImage,
      pageTheme:document.querySelector('meta[name="theme-color"]').content
    };
  });
  assert.equal(palette.bg,'#101114','Workspace uses black graphite');
  assert.equal(palette.pageTheme,palette.bg,'Browser chrome and studio background agree');
  assert.ok(palette.image==='none'||palette.image.includes('210, 214, 225'),'Video playback must not have a colored overlay');
  assert.ok(!palette.image.includes('181, 145, 115')&&!palette.image.includes('145, 129, 126'),'Former bronze and brown halos are absent');
  assert.equal(await x.page.locator('.empty-wordmark').count(),0,'Canvas should not repeat the brand logo');
  assert.ok(d.documentWidth<=d.viewport.width,'No horizontal overflow');
  await x.page.screenshot({path:'test-results/lab-workspace-desktop.png',fullPage:false});
  const fileChooser=x.page.waitForEvent('filechooser');
  await x.page.locator('#canvas-import').click();
  const chooser=await fileChooser;
  assert.ok(chooser,'Canvas imports real source files');
  await x.page.click('#tool-image');
  assert.equal(await x.page.locator('#image-composer').isVisible(),true,'Image floating composer must appear');
  assert.equal(await x.page.locator('.workspace').isVisible(),false,'Video editor must not occupy Image mode');
  assert.equal(await x.page.locator('#history').evaluate(e=>e.closest('#image-gallery-host')!==null),true,'Existing History gallery must move to Image workspace');
  assert.equal(await x.page.locator('.tool-tab.active').evaluateAll(els=>els.map(e=>e.id)).then(a=>a.join(',')),'tool-image');
  const composerGeometry=await x.page.locator('#image-composer').evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {top:r.top,bottom:r.bottom,width:r.width,height:r.height,radius:getComputedStyle(el).borderTopLeftRadius};
  });
  assert.ok(Math.abs(composerGeometry.height-74)<2&&composerGeometry.width>900,
    'Empty Image opens with the approved compact prompt, tools and Generate: '+JSON.stringify(composerGeometry));
  assert.ok(parseFloat(composerGeometry.radius)>=19,'Composer must have generously rounded corners');
  assert.equal(await x.page.locator('#image-gallery-empty').isVisible(),true,'Empty gallery must not invent images');
  assert.equal(await x.page.locator('.empty-wordmark').count(),0,'Do not repeat central PV logo in gallery mode');

  await x.page.click('#image-composer-prompt');
  assert.equal(await x.page.locator('#image-composer-model').isVisible(),true,
    'Clicking the upper prompt reveals the Owner toolbar before choosing a model');
  await x.page.click('#image-composer-model');
  assert.equal(await x.page.locator('#image-composer-model-menu').isVisible(),true,'Model popup opens above floating bar');
  const menuGeometry=await x.page.locator('#image-composer-model-menu').evaluate(el=>{
    const r=el.getBoundingClientRect(),head=document.getElementById('studio-header').getBoundingClientRect();
    const items=el.querySelector('.composer-model-items'),list=items.getBoundingClientRect();
    const rows=[...items.querySelectorAll('.composer-model-option')].map(row=>row.getBoundingClientRect());
    const search=el.querySelector('.composer-model-search').getBoundingClientRect();
    const trigger=document.getElementById('image-composer-model').getBoundingClientRect();
    const overflow=items.scrollHeight>items.clientHeight+2;
    return {width:r.width,height:r.height,top:r.top,bottom:r.bottom,headerBottom:head.bottom,triggerTop:trigger.top,
      available:Math.max(0,Math.floor(trigger.top-Math.max(0,head.bottom)-24)),overflow,
      itemsScroll:items.scrollHeight,itemsClient:items.clientHeight,rows:rows.length,
      rowHeight:rows[0]?.height||0,
      titleSize:parseFloat(getComputedStyle(items.querySelector('.composer-model-info strong')).fontSize),
      descriptionWhiteSpace:getComputedStyle(items.querySelector('.composer-model-info small')).whiteSpace,
      partialBottomRow:rows.some(row=>row.top<list.bottom-1&&row.bottom>list.bottom+2),
      emptyTail:rows.length?list.bottom-rows.at(-1).bottom:0,
      searchTop:search.top,searchBottom:search.bottom,
      limit:getComputedStyle(el).maxHeight};
  });
  assert.ok(menuGeometry.width>=438&&menuGeometry.width<=442,'Model menu should have its refined 440px desktop width: '+JSON.stringify(menuGeometry));
  assert.ok(menuGeometry.height<=menuGeometry.available+2&&menuGeometry.height>350,'Model dropdown should grow naturally without covering navigation: '+JSON.stringify(menuGeometry));
  assert.ok(menuGeometry.top>=menuGeometry.headerBottom+14,'Model dropdown must preserve a visible gap below navigation: '+JSON.stringify(menuGeometry));
  assert.ok(menuGeometry.rowHeight>=57&&menuGeometry.titleSize>=12.5&&menuGeometry.descriptionWhiteSpace==='nowrap',
    'Model rows must have breathing room and one-line descriptions: '+JSON.stringify(menuGeometry));
  assert.ok(menuGeometry.searchTop>=menuGeometry.top&&menuGeometry.searchBottom<=menuGeometry.bottom+1,'Model search stays inside menu: '+JSON.stringify(menuGeometry));
  assert.equal(await x.page.locator('#image-composer-train,.composer-model-footer').count(),0,'Legacy character-management footer must not appear in model menu');
  assert.equal(menuGeometry.partialBottomRow,false,'Only complete model rows should show initially: '+JSON.stringify(menuGeometry));
  if(!menuGeometry.overflow)assert.ok(menuGeometry.emptyTail<7,'No large blank area after the last model: '+JSON.stringify(menuGeometry));
  assert.ok(menuGeometry.itemsClient>=250,'Model list stays usable before scrolling: '+JSON.stringify(menuGeometry));
  assert.equal(await x.page.locator('.composer-model-option[data-value="qwen3"] img').getAttribute('src'),'./branding/qwen.svg?v=20261013-mono1','Qwen uses refreshed local icon');
  // Simulate future models: the menu must clip at a full row and never insert
  // a large empty zone beneath the final visible model.
  await x.page.locator('#image-composer-model-items').evaluate(list=>{
    const model=list.querySelector('.composer-model-option');
    for(let i=0;i<6;i++){
      const extra=model.cloneNode(true);
      extra.dataset.value='test-extra-model-'+i;
      extra.setAttribute('aria-selected','false');
      extra.classList.add('test-overflow-model');
      list.append(extra);
    }
    window.dispatchEvent(new Event('resize'));
  });
  const expandedMenu=await x.page.locator('#image-composer-model-menu').evaluate(el=>{
    const list=el.querySelector('.composer-model-items'),viewport=list.getBoundingClientRect();
    const rows=[...list.querySelectorAll('.composer-model-option')].map(row=>row.getBoundingClientRect());
    return {height:el.getBoundingClientRect().height,maxHeight:parseFloat(getComputedStyle(el).maxHeight),
      scrollable:list.scrollHeight>list.clientHeight+2,snap:getComputedStyle(list).scrollSnapType,
      partial:rows.some(row=>row.top<viewport.bottom-1&&row.bottom>viewport.bottom+2)};
  });
  assert.ok(expandedMenu.scrollable,'Additional models should scroll within the list: '+JSON.stringify(expandedMenu));
  assert.ok(expandedMenu.height<=expandedMenu.maxHeight+2,'Expanded model list must not cover navigation: '+JSON.stringify(expandedMenu));
  assert.equal(expandedMenu.partial,false,'Overflow must stop after a full row, not cut a model: '+JSON.stringify(expandedMenu));
  assert.equal(expandedMenu.snap,'y mandatory','Scrolling should settle at a complete model row');
  await x.page.locator('#image-composer-model-items').evaluate(list=>{
    list.querySelectorAll('.test-overflow-model').forEach(row=>row.remove());
    window.dispatchEvent(new Event('resize'));
  });
  await x.page.screenshot({path:'test-results/lab-image-model-popup.png',fullPage:false});
  await x.page.fill('#image-composer-model-search','banana');
  const filteredMenu=await x.page.locator('#image-composer-model-menu').evaluate(el=>{
    const list=el.querySelector('.composer-model-items');
    return {height:el.getBoundingClientRect().height,listScroll:list.scrollHeight,listClient:list.clientHeight};
  });
  assert.ok(filteredMenu.height<menuGeometry.height,'Filtered list should shrink the menu instead of preserving empty space: '+JSON.stringify(filteredMenu));
  await x.page.locator('.composer-model-option[data-value="gemini"]').click();
  assert.equal(await x.page.locator('#image-engine').inputValue(),'gemini','Model menu changes actual provider selection');
  assert.equal(await x.page.locator('#image-composer-model').isVisible(),true,
    'Choosing a model keeps the lower tools open even when its menu rebuilds');
  await x.page.click('#image-composer-model');
  await x.page.fill('#image-composer-model-search','seedream');
  await x.page.locator('.composer-model-option[data-value="seedream"]').click();
  assert.equal(await x.page.locator('#image-engine').inputValue(),'seedream');
  assert.equal(await x.page.locator('#image-composer-prompt').getAttribute('placeholder'),'What do you imagine?');
  const compactImageHeight=await x.page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height);
  assert.ok(compactImageHeight>=105&&compactImageHeight<170,
    'The empty Image deck must keep its original compact proportions: '+compactImageHeight);

  assert.equal(await x.page.locator('#image-composer-add').getAttribute('aria-label'),'Upload images',
    'The + button opens the real photo input directly');
  assert.equal(await x.page.locator('#image-composer-add .composer-add-plus').textContent(),'+');
  assert.equal(await x.page.locator('#composer-add-saved-toggle').isVisible(),false,
    'Standard Image uses one grid library button, not a separate saved-packs arrow');
  assert.equal(await x.page.locator('#scene-image-open').isVisible(),true,
    'Circular Elements / Photo Packs button is present beside the unchanged upload +');
  assert.equal(await x.page.locator('#composer-reference-intent-toggle').isVisible(),true,
    'Composition mode stays available before photos are uploaded');
  assert.equal(await x.page.locator('#image-composer-more').isVisible(),false,
    'Standard Seedream has no unnecessary Options menu');
  assert.equal(await x.page.locator('#composer-exact-prompt-option').isVisible(),true,
    'Exact Prompt stays available as a tiny inline switch');
  assert.equal(await x.page.locator('#composer-exact-prompt').isChecked(),false,
    'Automatic prompt enhancement remains enabled by default');
  const exactMetrics=await x.page.evaluate(()=>{
    const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {top:r.top,right:r.right,left:r.left,width:r.width};};
    const exact=document.getElementById('composer-exact-prompt-option'),count=document.getElementById('image-composer-count-wrap');
    const generate=document.getElementById('image-composer-generate');
    return {exact:rect('composer-exact-prompt-option'),count:rect('image-composer-count-wrap'),
      generate:rect('image-composer-generate'),deck:rect('image-composer'),
      inControls:exact.parentElement.classList.contains('composer-controls'),
      afterCount:!!(count.compareDocumentPosition(exact)&Node.DOCUMENT_POSITION_FOLLOWING),
      inPromptRow:document.querySelector('.image-composer-top').contains(exact),
      generateVisibility:getComputedStyle(generate).visibility,generateDisabled:generate.disabled};
  });
  assert.ok(exactMetrics.inControls&&exactMetrics.afterCount&&!exactMetrics.inPromptRow,
    'Exact must sit in the control row after image count, never floating in the prompt: '+JSON.stringify(exactMetrics));
  assert.ok(exactMetrics.exact.width<=40&&Math.abs(exactMetrics.exact.top-exactMetrics.count.top)<15,
    'Exact is switch-only and remains aligned in the toolbar: '+JSON.stringify(exactMetrics));
  const exactSurface=await x.page.locator('#composer-exact-prompt-option').evaluate(el=>{
    const style=getComputedStyle(el),help=el.querySelector('.composer-exact-tooltip'),tipStyle=getComputedStyle(help);
    return {border:style.borderTopWidth,background:style.backgroundColor,
      tooltipText:help?.textContent,tooltipVisibility:tipStyle.visibility,
      tooltipWidth:help.getBoundingClientRect().width,
      paddingTop:tipStyle.paddingTop,paddingLeft:tipStyle.paddingLeft,rowGap:tipStyle.rowGap,
      titleFontSize:getComputedStyle(help.querySelector('strong')).fontSize,
      descriptionFontSize:getComputedStyle(help.querySelector('small')).fontSize};
  });
  assert.equal(exactSurface.border,'0px','No chip border around Exact');
  assert.equal(exactSurface.background,'rgba(0, 0, 0, 0)','Exact background is transparent');
  assert.equal(exactSurface.tooltipVisibility,'hidden','Hover explanation is hidden by default');
  assert.match(exactSurface.tooltipText,/Exact Prompt.*No automatic prompt improvements/);
  assert.ok(exactSurface.tooltipWidth<=225&&exactSurface.paddingTop==='6px'&&exactSurface.paddingLeft==='8px'&&exactSurface.rowGap==='3px',
    'Exact tooltip should fit the copy with a tight photographic-deck border: '+JSON.stringify(exactSurface));
  assert.equal(exactSurface.titleFontSize,'12px','Exact title typography must stay unchanged');
  assert.equal(exactSurface.descriptionFontSize,'11px','Exact explanation typography must stay unchanged');
  await x.page.locator('#composer-exact-prompt-option').hover();
  await x.page.waitForFunction(()=>getComputedStyle(document.querySelector('.composer-exact-tooltip')).visibility==='visible');
  await x.page.locator('#image-composer-model').hover();
  await x.page.waitForFunction(()=>getComputedStyle(document.querySelector('.composer-exact-tooltip')).visibility==='hidden');
  assert.equal(exactMetrics.generateVisibility,'visible','Empty Generate must remain visible');
  assert.equal(exactMetrics.generateDisabled,true,'Empty Generate must remain disabled');
  assert.ok(exactMetrics.generate.left>exactMetrics.exact.right&&Math.abs(exactMetrics.generate.right-exactMetrics.deck.right)<36,
    'Generate stays in the original right-hand position: '+JSON.stringify(exactMetrics));
  assert.equal(await x.page.locator('#save').isVisible(),false,
    'Save draft stays out of the Image creation flow');
  assert.equal(await x.page.locator('#clear').isVisible(),false,
    'Misleading Reset editor is removed from Image creation');
  await x.page.locator('#composer-exact-prompt').check();
  assert.equal(await x.page.locator('#composer-exact-prompt').isChecked(),true);
  await x.page.locator('#composer-exact-prompt').uncheck();
  assert.equal(await x.page.locator('#composer-exact-prompt').isChecked(),false);
  assert.ok(Math.abs((await x.page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height))-compactImageHeight)<3,
    'The inline Exact switch cannot resize the compact Generate deck');

  assert.equal(await x.page.locator('#composer-character').isVisible(),false,'No duplicate right-side references tile');
  await x.page.locator('#scene-characters-open').click();
  assert.equal(await x.page.locator('#scene-library-dialog').isVisible(),true,'Person shortcut opens the private Characters library directly');
  assert.equal(await x.page.locator('#scene-library-title').textContent(),'Characters');
  assert.equal(await x.page.locator('#scene-image-menu').isVisible(),false,'Person shortcut skips the category menu');
  await x.page.locator('#scene-close').click();

  await x.page.click('#scene-image-open');
  assert.equal(await x.page.locator('#scene-image-menu').isVisible(),true);
  const menuPlacement=await x.page.evaluate(()=>{
    const menu=document.getElementById('scene-image-menu').getBoundingClientRect();
    const trigger=document.getElementById('scene-image-open').getBoundingClientRect();
    return {menuBottom:menu.bottom,triggerTop:trigger.top};
  });
  assert.ok(menuPlacement.menuBottom<=menuPlacement.triggerTop+2,
    'Compact library opens above the circular trigger: '+JSON.stringify(menuPlacement));
  assert.equal(await x.page.locator('#scene-image-menu-categories').isVisible(),true,'Four-square icon opens Elements directly');
  assert.equal(await x.page.locator('#scene-image-menu-home').isVisible(),false,'Do not require an Elements submenu click');
  assert.equal(await x.page.locator('#scene-image-menu [data-scene-target]').count(),4);
  await x.page.click('#scene-image-menu [data-scene-target="characters"]');
  assert.equal(await x.page.locator('#scene-library-dialog').isVisible(),true);
  assert.equal(await x.page.locator('#scene-library-title').innerText(),'Characters');
  assert.equal(await x.page.locator('#scene-tabs .scene-category-tab').count(),5);
  for(const label of ['Characters','Outfits','Props','Locations']){
    await x.page.locator('#scene-tabs .scene-category-tab').filter({hasText:label}).click();
    const hero=await x.page.locator('#scene-category-hero').evaluate(el=>{
      const r=el.getBoundingClientRect(),dialog=document.getElementById('scene-library-dialog').getBoundingClientRect();
      return {visible:r.width>0&&r.height>0,height:r.height,title:el.querySelector('h3')?.textContent,
        background:getComputedStyle(el).backgroundImage,
        centered:Math.abs((dialog.top+dialog.bottom)/2-innerHeight/2)<=8,
        contentScroll:document.querySelector('#scene-library-dialog .scene-main').scrollHeight-
          document.querySelector('#scene-library-dialog .scene-main').clientHeight};
    });
    assert.ok(hero.visible&&hero.height>=40&&hero.height<=100,'Compact '+label+' uses a fitted text heading: '+JSON.stringify(hero));
    assert.equal(hero.title,label);
    assert.equal(hero.background,'none','The approved F library has no photographic category banner');
    assert.equal(hero.centered,true,'Elements modal is vertically centered for '+label);
    assert.ok(hero.contentScroll<=3,'Empty Elements should not scroll: '+JSON.stringify(hero));
  }
  // All Elements categories use Photo Packs' collection controls and frame.
  assert.equal(await x.page.locator('#scene-library-count').textContent(),'0 saved');
  assert.equal(await x.page.locator('#scene-empty-heading').textContent(),'No locations yet');
  assert.equal(await x.page.locator('#scene-new').getAttribute('aria-label'),'New location');
  assert.equal(await x.page.locator('#scene-new').isVisible(),true,
    'New location lives next to the saved-count label, not in an oversized tile');
  assert.equal(await x.page.locator('#scene-grid .scene-create-tile').count(),0,
    'Do not leave the old giant creation tile in empty categories');
  const sceneLayout=await x.page.evaluate(()=>{
    const rect=id=>{
      const r=document.querySelector(id).getBoundingClientRect();
      return {top:r.top,left:r.left,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
    };
    return {dialog:rect('#scene-library-dialog'),search:rect('#scene-search'),
      close:rect('#scene-close'),hero:rect('#scene-category-hero'),
      heading:rect('.scene-library-meta'),add:rect('#scene-new')};
  });
  assert.ok(sceneLayout.search.width>150&&sceneLayout.search.height>=30,
    'Elements has the same visible search input as Photo Packs');
  assert.ok(Math.abs(sceneLayout.search.top-sceneLayout.close.top)<=3,
    'Search and close share a common top row');
  assert.ok(sceneLayout.add.top>=sceneLayout.heading.top-2&&
    sceneLayout.add.bottom<=sceneLayout.heading.bottom+2,'New button is inline in the collection header');
  await x.page.locator('#scene-sort').selectOption('name-desc');
  assert.equal(await x.page.locator('#scene-sort').inputValue(),'name-desc',
    'Elements sort follows Photo Packs and is usable');
  await x.page.click('#scene-list-view');
  assert.equal(await x.page.locator('#scene-grid').getAttribute('data-view'),'list');
  await x.page.click('#scene-grid-view');
  assert.equal(await x.page.locator('#scene-grid').getAttribute('data-view'),'grid');
  await x.page.click('#scene-new');
  assert.equal(await x.page.locator('#scene-create').isVisible(),true,
    'Inline New location opens the original private upload form');
  await x.page.click('#scene-back');
  assert.equal(await x.page.locator('#scene-browser').isVisible(),true);
  await x.page.click('#scene-close');
  await x.page.click('#image-composer-prompt');
  await x.page.click('#scene-image-open');
  await x.page.click('#scene-menu-back');
  await x.page.click('#scene-menu-packs');
  assert.equal(await x.page.locator('#pack-studio-heading').textContent(),'Photo packs');
  assert.equal(await x.page.locator('#pack-studio-dialog').isVisible(),true,'Saved packs open the matching Elements-style Photo Packs library');
  const packDialog=await x.page.locator('#pack-studio-dialog').evaluate(el=>{
    const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width};
  });
  assert.ok(packDialog.width<=1220&&packDialog.top>=12&&packDialog.bottom<=890,
    'Library is centered and contained inside the viewport: '+JSON.stringify(packDialog));
  assert.ok(sceneLayout.dialog.width<=1040&&sceneLayout.dialog.height<=600,
    'F keeps the Elements box compact without changing the existing Photo Packs browser');
  const packLayout=await x.page.evaluate(()=>{
    const rect=selector=>{
      const r=document.querySelector(selector).getBoundingClientRect();
      return {top:r.top,left:r.left,width:r.width};
    };
    return {search:rect('#pack-studio-search'),close:rect('#pack-studio-close'),
      hero:rect('#pack-studio-dialog .pack-studio-intro')};
  });
  assert.ok(packLayout.search.width>150&&Math.abs(packLayout.search.top-packLayout.close.top)<=3,
    'Existing Photo Packs search and close remain aligned');
  assert.ok(packLayout.hero.width>400,'The separate Photo Packs browser keeps its existing collection content');
  await x.page.click('#pack-studio-close');
  await x.page.click('#image-composer-prompt');
  const floatingChooser=x.page.waitForEvent('filechooser');
  await x.page.click('#image-composer-add');
  const imageChooser=await floatingChooser;
  assert.ok(imageChooser,'Upload photos opens the original reference input');
  const referencePng=await x.page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=320;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#65788a';ctx.fillRect(0,0,320,320);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await imageChooser.setFiles({name:'reference-photo.png',mimeType:'image/png',buffer:Buffer.from(referencePng,'base64')});
  await x.page.waitForFunction(()=>document.querySelectorAll('#image-composer-references .composer-reference-tile').length===1);
  assert.equal(await x.page.locator('.composer-reference-tile img').count(),1,'Reference thumbnail lives inside floating bar');
  assert.equal(await x.page.locator('.composer-reference-index').innerText(),'BASE','First reference defaults to Base in Seedream base-image mode');
  assert.equal(await x.page.locator('#image-composer-references .composer-add-tile').count(),0,
    'The thumbnail tray has no redundant plus tile');
  assert.equal(await x.page.locator('#image-composer-prompt').getAttribute('placeholder'),'What would you like to change?',
    'A selected Base image must retain the approved contextual placeholder after layout sizing');
  const photoImageHeight=await x.page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height);
  assert.ok(photoImageHeight>=compactImageHeight+28&&photoImageHeight<=compactImageHeight+72,
    'Adding a photo reveals one compact reference strip while preserving the prompt and controls: '+JSON.stringify({compactImageHeight,photoImageHeight}));
  // Controlled Pose may need more references, but its instructional hint
  // must never expand the dock or shift the Generate button below its row.
  await x.page.click('#image-composer-model');
  await x.page.locator('.composer-model-option[data-value="fal"]').click();
  assert.equal(await x.page.locator('#image-engine').inputValue(),'fal');
  assert.equal(await x.page.locator('#composer-generation-block').isVisible(),false,
    'Controlled Pose hint never adds a third deck row');
  const poseModelHint=await x.page.locator('#image-composer-model').getAttribute('title');
  assert.match(poseModelHint||'',/Pose photo.*Identity photos/i,
    'Controlled Pose instructions remain available in the model tooltip');
  assert.match(await x.page.locator('#image-composer-model').getAttribute('aria-description')||'',/Pose photo/,
    'Controlled Pose guidance stays accessible to screen readers');
  const poseImageHeight=await x.page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height);
  assert.ok(Math.abs(poseImageHeight-photoImageHeight)<14,
    'Switching to Controlled Pose must keep the same photo-loaded deck dimensions: '+
    JSON.stringify({photoImageHeight,poseImageHeight}));
  await x.page.click('#image-composer-model');
  await x.page.locator('.composer-model-option[data-value="seedream"]').click();
  assert.equal(await x.page.locator('#image-engine').inputValue(),'seedream');
  assert.equal(await x.page.locator('#image-composer-model').getAttribute('title'),null,
    'Controlled Pose help does not leak into other models');
  assert.equal(await x.page.locator('#image-composer-references .composer-reference-tile').count(),1,
    'Changing the model does not remove the uploaded photograph');
  const inlineGeometry=await x.page.evaluate(()=>{
    const ref=document.querySelector('.composer-reference-tile').getBoundingClientRect();
    const prompt=document.querySelector('#image-composer-prompt').getBoundingClientRect();
    return {refLeft:ref.left,refRight:ref.right,refTop:ref.top,refBottom:ref.bottom,
      promptLeft:prompt.left,promptRight:prompt.right,promptTop:prompt.top};
  });
  assert.ok(Math.abs(inlineGeometry.refLeft-inlineGeometry.promptLeft)<=16 &&
    inlineGeometry.refBottom<inlineGeometry.promptTop &&
    inlineGeometry.promptTop-inlineGeometry.refBottom<=22,
    'The uploaded thumbnail occupies one compact row above the prompt, aligned to the text: '+JSON.stringify(inlineGeometry));
  await x.page.screenshot({path:'test-results/lab-image-inline-reference.png',fullPage:false});
  await x.page.click('.composer-reference-remove');
  await x.page.waitForFunction(()=>document.querySelectorAll('.composer-reference-tile').length===0);
  assert.equal(await x.page.locator('#ref-count').textContent().then(t=>t.includes('0')),true,'Removing in-bar thumbnail updates true reference list');
  assert.equal(await x.page.locator('#image-composer-prompt').getAttribute('placeholder'),'What do you imagine?');
  const resetImageHeight=await x.page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height);
  assert.ok(Math.abs(resetImageHeight-compactImageHeight)<7,
    'Removing the photo must restore the original compact Image deck height: '+JSON.stringify({compactImageHeight,resetImageHeight}));
  await x.page.locator('#image-composer-prompt').fill('A sculptural, atmospheric photographic still.');
  assert.equal(await x.page.locator('#prompt').inputValue(),'A sculptural, atmospheric photographic still.','Prompt is synchronized with real Image form');
  assert.equal(await x.page.locator('#image-composer-generate').isDisabled(),false,'Image generation button enables from floating prompt');
  const generateUi=await x.page.locator('#image-composer-generate').evaluate(el=>{
    const css=getComputedStyle(el);return {color:css.color,background:css.backgroundImage,font:css.fontFamily,weight:css.fontWeight,labelPx:parseFloat(getComputedStyle(el.querySelector('.composer-generate-label')).fontSize)};
  });
  const darkText=generateUi.color.match(/[0-9]+/g)?.map(Number);
  assert.ok(darkText?.length===3&&darkText.every(channel=>channel<60),
    'Available Image Generate retains dark, legible text when its exact RGB token changes');
  assert.equal(generateUi.labelPx,15,'Generate preserves the approved Owner type size');
  const ratioOptions=await x.page.locator('#image-composer-ratio option').evaluateAll(options=>options.map(o=>({value:o.value,label:o.textContent})));
  assert.match(ratioOptions.find(o=>o.value==='auto').label,/^Auto · /,
    'Automatic framing has a distinct visible label and cannot be confused with fixed 16:9');
  assert.equal(ratioOptions.find(o=>o.value==='16:9').label,'16:9',
    'Fixed 16:9 remains a separate explicit choice');
  await x.page.selectOption('#image-composer-ratio',{value:'16:9'});
  assert.equal(await x.page.locator('#ratio').inputValue(),'16:9','Floating aspect ratio updates backend settings');
  await x.page.selectOption('#image-composer-ratio',{value:'auto'});
  assert.equal(await x.page.locator('#ratio').inputValue(),'auto','Auto framing stays available as an intentional separate choice');
  await x.page.selectOption('#image-composer-ratio',{value:'16:9'});
  assert.equal(await x.page.locator('#ratio').inputValue(),'16:9','Selecting fixed ratio after Auto is preserved');
  assert.equal(await x.page.locator('#image-composer-more').isVisible(),false,
    'No Options button returns after removing the final reference');
  assert.equal(await x.page.locator('#image-composer-ratio').isVisible(),true,
    'Seedream aspect ratio is always accessible in the composer');
  assert.equal(await x.page.locator('#image-composer-resolution').isVisible(),true,
    'Seedream resolution is always accessible in the composer');
  assert.equal(await x.page.locator('.workspace').isVisible(),false,
    'Seedream inline options never reopen a duplicate side form');
  assert.equal(await x.page.locator('#history').evaluate(el=>!!el.closest('#image-gallery-host')),true,
    'The private History grid is mounted in the Image gallery workspace');
  assert.equal(await x.page.locator('#history .card').count(),0,
    'An empty mock account has no invented image cards');
  assert.equal(await x.page.locator('#image-gallery-empty').isVisible(),true,
    'Empty Image history shows its designed gallery placeholder');
  assert.ok(await x.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
    'Empty Image gallery does not overflow desktop');
  await x.page.screenshot({path:'test-results/lab-workspace-image.png',fullPage:false});
  await x.page.click('#tool-video');
  await x.page.click('#mode-reference');
  assert.equal(await x.page.locator('#empty-title').innerText(),'Animate your references',
    'Reference set shows the requested mode-specific invitation');
  assert.match((await x.page.locator('#canvas-import').innerText()).replace(/\s+/g,' '),/Upload images/);
  assert.equal(await x.page.locator('#pv-mode-reference-label').innerText(),'Reference set');
  assert.equal(await x.page.locator('#reference-drop>span').innerText(),'Upload images');
  assert.equal(await x.page.locator('#video-inspector-empty .pv-video-sidebar-section:nth-of-type(2) h3').innerText(),'Attached images');
  await x.page.locator('#pv-video-browse-library').click();
  assert.equal(await x.page.locator('#scene-library-dialog').isVisible(),true,'Approved central action opens the real Scene library');
  await x.page.keyboard.press('Escape');
  await x.page.locator('#prompt').click();
  assert.equal(await x.page.evaluate(()=>document.activeElement.id),'prompt','Motion direction remains directly editable');
  const outputFit=await x.page.evaluate(()=>{
    const ids=['duration-control','ratio-control','resolution-control','pv-video-audio-pill'];
    const nodes=ids.map(id=>document.getElementById(id));
    if(nodes.some(el=>!el||el.hidden||getComputedStyle(el).display==='none'))return {ready:false};
    const rects=nodes.map(el=>el.getBoundingClientRect());
    const rail=document.querySelector('.workspace.video-layout>.controls').getBoundingClientRect();
    return {ready:true,tops:rects.map(r=>r.top),right:Math.max(...rects.map(r=>r.right)),
      railRight:rail.right,widths:rects.map(r=>r.width),audioInsidePrompt:document.getElementById('pv-video-prompt-box').contains(nodes[3]),
      audioFitsPrompt:rects[3].bottom<=document.getElementById('pv-video-prompt-box').getBoundingClientRect().bottom};
  });
  assert.equal(outputFit.ready,true,'Reference mode has all four actual output settings');
  assert.equal(await x.page.locator('#video-model-trigger').isVisible(),true,'The original top model selector remains accessible');
  assert.equal(await x.page.locator('#pv-video-model-pill').isVisible(),false,'Only the duplicated model shortcut is removed from Output');
  assert.ok(Math.max(...outputFit.tops.slice(0,3))-Math.min(...outputFit.tops.slice(0,3))<3,
    'Approved duration, ratio and resolution stay on one row: '+JSON.stringify(outputFit));
  assert.equal(outputFit.audioInsidePrompt,true,'Audio is inside the owner-approved prompt surface');
  assert.equal(outputFit.audioFitsPrompt,true,'Compact audio control fits inside the prompt border');
  assert.ok(outputFit.tops[3]<outputFit.tops[0],'Prompt audio sits above output settings');
  assert.ok(outputFit.right<=outputFit.railRight-8,
    'Video settings cannot overflow the right edge of the editor: '+JSON.stringify(outputFit));
  assert.ok(outputFit.widths.every(w=>w>=48),
    'Duration, ratio, resolution and audio remain usable; the main model selector stays above');
  await x.page.screenshot({path:'test-results/lab-workspace-reference.png',fullPage:false});
  assert.deepEqual(x.errors,[]);
  await x.context.close();
  console.log('PASS desktop workspace, canvas import, image tab and no hero');

  // Start-frame modes follow their source ratio. Text mode exposes an explicit
  // ratio; its controls must be reachable inside the independently scrolling
  // form while Generate stays fixed and the document does not scroll.
  for(const [width,height] of [[1440,600],[1440,768],[1440,820],[1728,820]]){
    const compact=await open(width,height);
    assert.equal(await compact.page.locator('#mode-reference').getAttribute('aria-selected'),'true',
      'Seedance opens Create in Reference set, not an unrequested Start frame');
    await compact.page.click('#mode-start');
    assert.equal(await compact.page.locator('#ratio-control').isVisible(),false,
      'Explicit Opening frame mode inherits the image source ratio');
    await compact.page.click('#mode-text');
    await compact.page.locator('#ratio-control').scrollIntoViewIfNeeded();
    const parts=await compact.page.evaluate(()=>{
      const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
      return {duration:rect('#duration-control'),resolution:rect('#resolution-control'),ratio:rect('#ratio-control'),
        dock:rect('.controls>.generate-zone'),generate:rect('#generate'),stage:rect('.stage'),
        viewport:innerHeight,scrollY:window.scrollY,
        visible:[...document.querySelectorAll('#duration-control,#resolution-control,#ratio-control')].every(x=>getComputedStyle(x).display!=='none')
      };
    });
    console.log('COMPACT_VIDEO',width,height,JSON.stringify(parts));
    assert.equal(parts.scrollY,0,'No scrolling required before viewing controls');
    assert.equal(parts.visible,true,'Video parameters must be shown');
    for(const id of ['duration','resolution','ratio']){
      assert.ok(parts[id].top>=70&&parts[id].bottom<=parts.dock.top+1,id+' must be fully above the Generate dock');
      assert.ok(parts[id].bottom<height,id+' must fit inside the viewport');
    }
    assert.ok(parts.generate.bottom<height,'Generate button must also be visible on first view');
    await compact.page.screenshot({path:'test-results/lab-compact-video-'+width+'.png',fullPage:false});
    assert.deepEqual(compact.errors,[]);
    await compact.context.close();
  }
  console.log('PASS mode-specific video settings remain reachable with a fixed Generate dock at 768px and 820px heights');

  // Verify branded first paint while the JS module is deliberately delayed.
  const bootContext=await browser.newContext({viewport:{width:1440,height:900}});
  await bootContext.route('https://**/*',async route=>{
    const url=new URL(route.request().url());
    if(!url.hostname.endsWith('parallelvision.workers.dev'))return route.abort();
    const path=url.pathname;
    const response=path==='/api/jobs'?{jobs:[],activeJobs:[],concurrency:{image:4,video:1},next:null}:path==='/api/packs'?{packs:[]}:path==='/api/soul-pro/identity'?{configured:false,count:0,refs:[]}:{};
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
  });
  const bootPage=await bootContext.newPage();
  let releaseLabScript;
  const labScriptHeld=new Promise(resolve=>{releaseLabScript=resolve;});
  await bootPage.route(/\/lab\/lab\.js(?:\?.*)?$/,async route=>{
    await labScriptHeld;
    await route.continue();
  });
  await bootPage.goto('http://127.0.0.1:4182/lab/studio.html',{waitUntil:'commit'});
  await bootPage.waitForSelector('#lab-boot');
  assert.equal(await bootPage.locator('#lab-boot').isVisible(),true,'Brand loading appears before external JS');
  assert.equal(await bootPage.locator('#gate').isVisible(),false,'No half-loaded sign-in page');
  const loaderLogo=bootPage.locator('#lab-boot-name');
  assert.equal(await loaderLogo.getAttribute('aria-label'),'PV LAB','Loader names the approved PV LAB wordmark accessibly');
  assert.equal(await loaderLogo.locator('svg path').count(),1,'The actual approved SVG is present in the first HTML response');
  assert.equal(await bootPage.locator('.lab-boot-sub').innerText(),'BY PARALLEL VISION','Brand attribution is understated');
  assert.equal(await loaderLogo.isVisible(),true,'Brand is present without downloading an image');
  assert.equal(await loaderLogo.evaluate(el=>getComputedStyle(el).animationName),'none','PV LAB appears crisp at first paint');
  assert.equal(await loaderLogo.evaluate(el=>getComputedStyle(el).filter),'none','Brand is not blurred during loading');
  const duplicateAlignment=await loaderLogo.evaluate(el=>{
    const mark=el.getBoundingClientRect();
    const vector=el.querySelector('svg').getBoundingClientRect();
    const ghost=getComputedStyle(el,'::before');
    return {dx:Math.abs(vector.x-mark.x),dy:Math.abs(vector.y-mark.y),
      dw:Math.abs(vector.width-mark.width),dh:Math.abs(vector.height-mark.height),
      ghostSizing:ghost.boxSizing,ghostImage:ghost.backgroundImage,ghostSize:ghost.backgroundSize};
  });
  assert.ok(Math.max(duplicateAlignment.dx,duplicateAlignment.dy,duplicateAlignment.dw,duplicateAlignment.dh)<.2,
    'Approved SVG exactly fills the motion-stable loading wordmark box');
  assert.equal(duplicateAlignment.ghostSizing,'border-box','Ghost fills the exact same box');
  assert.match(duplicateAlignment.ghostImage,/pvlab-wordmark-bold\.svg/,'Ghost uses the same bold logo asset');
  assert.equal(duplicateAlignment.ghostSize,'100% 100%','Blur ghost has the same vector dimensions');
  const splashAtStart=await bootPage.evaluate(()=>{
    const root=document.documentElement;
    return {overflow:getComputedStyle(root).overflowY,scrollY:window.scrollY,
      gutter:getComputedStyle(root).scrollbarGutter,
      locked:root.classList.contains('pv-studio-boot-lock'),font:getComputedStyle(document.getElementById('lab-boot-name')).fontFamily};
  });
  assert.equal(splashAtStart.overflow,'hidden','Full-screen splash has no document scrollbar');
  assert.equal(splashAtStart.locked,true,'Splash maintains the initial scroll lock');
  assert.equal(splashAtStart.gutter,'stable',
    'Desktop loading reserves scrollbar gutter from its first frame, before Image activates');
  assert.equal(splashAtStart.scrollY,0,'Startup begins at the top instead of a restored scroll position');
  assert.match(splashAtStart.font,/Helvetica Neue|Arial/,'Loader never uses an asynchronously swapped font');
  assert.equal(await bootPage.locator('#lab-boot').locator('.lab-boot-content').count(),1,
    'Original loader renders its centered content once');
  assert.equal(await bootPage.locator('#lab-boot > *').count(),1,
    'No decorative panels, artwork, or other visible loading elements remain');
  const logoBefore=await loaderLogo.boundingBox();
  assert.ok(Math.abs(logoBefore.x+logoBefore.width/2-720)<1,
    'Brand is centered within the complete 1440px viewport, not the reduced scroll area');
  const stableExit=await bootPage.evaluate(()=>{
    const mark=document.getElementById('lab-boot-name');
    const before=mark.getBoundingClientRect();
    // Seek the exact production keyframes while the real Studio script is held.
    // This proves the exit does not shift or resize the text, even at mid-fade.
    mark.style.animation='pv-boot-out .24s linear both paused';
    const exit=mark.getAnimations().find(a=>a.effect?.target===mark);
    if(exit)exit.currentTime=130;
    const mid=mark.getBoundingClientRect();
    const transform=getComputedStyle(mark).transform;
    mark.style.removeProperty('animation');
    return {hasAnimation:!!exit,dx:mid.x-before.x,dy:mid.y-before.y,
      dw:mid.width-before.width,transform};
  });
  assert.equal(stableExit.hasAnimation,true,'Loading wordmark exit has testable keyframes');
  assert.ok(Math.abs(stableExit.dx)<.2&&Math.abs(stableExit.dy)<.2&&Math.abs(stableExit.dw)<.2,
    'Refreshing must not shift or stretch the PV LAB wordmark while it fades out');
  assert.equal(stableExit.transform,'none','The mid-exit frame has no transform');
  await bootPage.evaluate(()=>document.getElementById('app').classList.add('image-studio-active'));
  const logoAfterImageInit=await loaderLogo.boundingBox();
  assert.ok(Math.abs(logoAfterImageInit.x-logoBefore.x)<1&&Math.abs(logoAfterImageInit.y-logoBefore.y)<1,
    'Image route scrollbar gutter must not shift the centered PV LAB logo');
  assert.equal(Math.round((await bootPage.locator('#lab-boot').boundingBox()).width),1440,
    'Boot splash continues to cover the entire viewport after Image initializes');
  await bootPage.evaluate(()=>document.getElementById('app').classList.remove('image-studio-active'));
  // Reproduce classic Windows scrollbars: a percent-sized fixed overlay would
  // previously move 7.5px left when the Image route reserved its 15px gutter.
  // The real overlay stays 100vw, but this checks the root layout independently.
  const classicScrollbar=await bootPage.evaluate(()=>{
    const root=document.documentElement;
    const app=document.getElementById('app');
    const overlay=document.getElementById('lab-boot');
    const logo=document.getElementById('lab-boot-name');
    const center=()=>{const r=logo.getBoundingClientRect();return r.left+r.width/2;};
    overlay.style.width='100%';
    const before={center:center(),rootWidth:root.getBoundingClientRect().width,
      gutter:getComputedStyle(root).scrollbarGutter};
    app.classList.add('image-studio-active');
    const after={center:center(),rootWidth:root.getBoundingClientRect().width,
      gutter:getComputedStyle(root).scrollbarGutter};
    app.classList.remove('image-studio-active');
    overlay.style.removeProperty('width');
    return {before,after};
  });
  assert.equal(classicScrollbar.before.gutter,'stable');
  assert.equal(classicScrollbar.after.gutter,'stable');
  assert.ok(Math.abs(classicScrollbar.after.center-classicScrollbar.before.center)<.25,
    'Classic scrollbar activation must not move the logo, even with a percent-sized overlay');
  assert.ok(Math.abs(classicScrollbar.after.rootWidth-classicScrollbar.before.rootWidth)<.25,
    'The available document width cannot shrink partway through Studio loading');
  await bootPage.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await loaderLogo.evaluate(el=>getComputedStyle(el).animationName),'none',
    'Reduced-motion mode leaves the original loader mark static');
  await bootPage.emulateMedia({reducedMotion:'no-preference'});
  await bootPage.mouse.wheel(0,820);
  await bootPage.waitForTimeout(500);
  assert.equal(await bootPage.evaluate(()=>window.scrollY),0,'Wheel input cannot scroll the hidden workspace during boot');
  const bootGeometry=await loaderLogo.boundingBox();
  assert.ok(Math.abs(bootGeometry.x-logoBefore.x)<1&&Math.abs(bootGeometry.y-logoBefore.y)<1,
    'Brand stays at identical coordinates during the entire loading state');
  await bootPage.evaluate(()=>{
    document.getElementById('lab-boot-status').classList.add('is-slow');
    document.getElementById('lab-boot-retry').hidden=false;
  });
  const delayedLogo=await loaderLogo.boundingBox();
  assert.ok(Math.abs(delayedLogo.x-logoBefore.x)<1&&Math.abs(delayedLogo.y-logoBefore.y)<1,
    'Even a delayed-load notice and Reload button cannot move the centered brand');
  await bootPage.evaluate(()=>{
    document.getElementById('lab-boot-status').classList.remove('is-slow');
    document.getElementById('lab-boot-retry').hidden=true;
  });
  assert.ok(bootGeometry&&bootGeometry.x>=0&&bootGeometry.x+bootGeometry.width<=1440,'Brand stays inside the desktop viewport');
  await bootPage.setViewportSize({width:390,height:844});
  const mobileBootGeometry=await loaderLogo.boundingBox();
  assert.ok(mobileBootGeometry&&mobileBootGeometry.x>=0&&mobileBootGeometry.x+mobileBootGeometry.width<=390,'Brand stays inside the mobile viewport');
  assert.equal(await bootPage.evaluate(()=>getComputedStyle(document.documentElement).scrollbarGutter),'auto',
    'Narrow mobile view does not reserve a desktop scrollbar gutter');
  assert.equal(await loaderLogo.locator('svg').count(),1,'Mobile keeps the exact same embedded brand vector');
  const loadingCdp=await bootContext.newCDPSession(bootPage);
  const loadingCapture=await loadingCdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
  writeFileSync('test-results/lab-branded-loading.png',Buffer.from(loadingCapture.data,'base64'));
  await loadingCdp.detach();
  // Simulate the exact customer-facing failure: an unresolved module import.
  // DOMContentLoaded cannot fire, yet the recovery must still expose a safe page.
  const stalledPage=await bootContext.newPage();
  await stalledPage.clock.install();
  await stalledPage.route(/\/lab\/lab\.js(?:\?.*)?$/,async()=>await new Promise(()=>{}));
  await stalledPage.goto('http://127.0.0.1:4182/lab/studio.html?tool=image',{waitUntil:'commit'});
  await stalledPage.waitForSelector('#lab-boot');
  await stalledPage.clock.fastForward(23000);
  const stalled=await stalledPage.evaluate(()=>({
    recovered:document.body.classList.contains('lab-ready'),
    publicGate:!document.getElementById('gate').hidden,
    appPrivate:document.getElementById('app').hidden,
    retry:!document.getElementById('auth-retry').hidden,
    status:document.getElementById('auth-status').textContent,
    bootLock:document.documentElement.classList.contains('pv-studio-boot-lock')
  }));
  assert.equal(stalled.recovered,true,'A held JS module cannot leave the splash running indefinitely');
  assert.equal(stalled.publicGate,true,'A stalled signed-in check must expose safe public recovery');
  assert.equal(stalled.appPrivate,true,'Recovery must never expose unverified private Studio');
  assert.equal(stalled.retry,true,'Reload remains available without DOMContentLoaded');
  assert.equal(stalled.bootLock,false,'A stalled loader releases the page scroll lock');
  assert.match(stalled.status,/Reload to retry/);
  await stalledPage.close();

  releaseLabScript();
  await bootPage.waitForFunction(()=>window.__layoutTest===true);
  assert.equal(await loaderLogo.evaluate(el=>getComputedStyle(el).animationName),'pv-boot-out','Blur happens after Studio becomes ready');
  await bootPage.locator('#lab-boot').waitFor({state:'hidden',timeout:2000});
  await bootPage.waitForFunction(()=>!document.documentElement.classList.contains('pv-studio-boot-lock'),{timeout:2000});
  assert.equal(await bootPage.locator('#lab-boot').isVisible(),false,'Boot overlay finishes its exit on mock auth resolution');
  assert.equal(await bootPage.locator('#lab-welcome-start').isVisible(),true,
    'Resolved empty Image uses its intentional fixed card entrance after splash exit');
  await bootPage.click('#tool-upscale');
  assert.notEqual(await bootPage.evaluate(()=>getComputedStyle(document.documentElement).overflowY),'hidden',
    'Leaving the fixed Image entrance releases document scrolling without a stale splash lock');
  // A slow Fashion entry cannot expose the default Image workspace even if
  // authentication has already unhidden #app before Fashion's assets arrive.
  const routePage=await bootContext.newPage();
  await routePage.route('**/lab/lab.js*',async()=>await new Promise(()=>{}));
  await routePage.goto('http://127.0.0.1:4182/lab/studio.html?tool=fashion',{waitUntil:'commit'});
  await routePage.waitForSelector('#lab-boot');
  await routePage.evaluate(()=>{
    document.documentElement.classList.add('pv-studio-route-pending');
    document.body.classList.remove('lab-ready');
    document.getElementById('app').hidden=false;
    document.getElementById('image-studio').hidden=false;
  });
  const covered=await routePage.evaluate(()=>{
    const overlay=document.getElementById('lab-boot'),r=overlay.getBoundingClientRect();
    return getComputedStyle(overlay).visibility!=='hidden'&&
      overlay.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));
  });
  assert.equal(covered,true,'Fashion direct URL stays covered until its editor is prepared');
  assert.equal(await routePage.evaluate(()=>getComputedStyle(document.documentElement).overflowY),'hidden',
    'Fashion direct loads cannot show a scrollbar behind the splash');
  await routePage.evaluate(()=>{
    document.getElementById('image-studio').hidden=true;
    document.getElementById('fashion-studio').hidden=false;
    document.documentElement.classList.remove('pv-studio-route-pending');
    window.__pvLabFinishBoot?.();
  });
  await routePage.locator('#lab-boot').waitFor({state:'hidden',timeout:2000});
  await routePage.waitForFunction(()=>!document.documentElement.classList.contains('pv-studio-boot-lock'),{timeout:2000});
  assert.equal(await routePage.locator('#fashion-studio').isVisible(),true,'Fashion is the first exposed route');
  assert.equal(await routePage.locator('#image-studio').isVisible(),false,'Image remains hidden on Fashion entry');
  await routePage.close();
  console.log('PASS Fashion direct URL avoids the Image first-paint flash');

  await bootContext.close();
  console.log('PASS first paint, no broken image loading icon and delayed module');

  x=await open(390,844);
  d=await geometry(x.page);
  console.log('MOBILE_LAYOUT',JSON.stringify(d));

  await x.page.evaluate(()=>window.__queueTestSetActiveJobs([
    {id:'33333333-3333-4333-8333-333333333333',status:'uncertain',
     settings:{type:'video',engine:'wan',mode:'start'},error:'Check provider account.'}
  ]));
  const mobileQueue=await x.page.locator('#active summary').evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
  });
  assert.ok(mobileQueue.left>=0&&mobileQueue.right<=390,'Compact queue button must fit in mobile toolbar');
  await x.page.locator('#active summary').click();
  assert.equal(await x.page.locator('#resolve').isVisible(),true,'Mobile user can inspect interrupted jobs');
  await x.page.locator('#active summary').click();
  await x.page.evaluate(()=>window.__queueTestSetActiveJobs([]));

  assert.ok(d.documentWidth<=d.viewport.width,'Mobile must have no horizontal overflow');
  assert.ok(d.workspace.top<135,'Mobile editor appears immediately after tool navigation');
  assert.ok(d.stage.height<=620,'Preview remains bounded on mobile');
  await x.page.click('#tool-image');
  await x.page.click('#image-composer-model');
  const mobileModelMenu=await x.page.locator('#image-composer-model-menu').evaluate(el=>{
    const r=el.getBoundingClientRect(),head=document.getElementById('studio-header').getBoundingClientRect();
    return {top:r.top,left:r.left,right:r.right,bottom:r.bottom,headerBottom:head.bottom,height:r.height};
  });
  assert.ok(mobileModelMenu.top>=mobileModelMenu.headerBottom+14,'Model menu must have a clear mobile navigation gap: '+JSON.stringify(mobileModelMenu));
  assert.ok(mobileModelMenu.left>=12&&mobileModelMenu.right<=378,'Model menu must keep 12px mobile side margins: '+JSON.stringify(mobileModelMenu));
  await x.page.keyboard.press('Escape');
  const compactComposer=await x.page.locator('#image-composer').evaluate(el=>{
    const r=el.getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,width:r.width};
  });
  assert.ok(compactComposer.left>=0&&compactComposer.right<=390,'Floating Image bar fits on mobile');
  assert.ok(await x.page.locator('#image-composer-add').isVisible(),'Mobile Image bar keeps in-bar reference action');
  assert.ok(await x.page.locator('#image-composer-mobile-more').isVisible(),'Mobile secondary settings have an explicit More disclosure');
  // The approved compact Image toolbar uses one row where it fits, never a third.
  const mobileRows=async()=>x.page.evaluate(()=>{
    const ids=['image-composer-add','scene-image-open','image-composer-model',
      'image-composer-moods','image-composer-edit-area','image-composer-ratio',
      'image-composer-mobile-more','composer-reference-intent-toggle',
      'composer-exact-prompt-option'];
    const controls=ids.map(id=>document.getElementById(id))
      .filter(el=>el&&!el.hidden&&el.getClientRects().length&&getComputedStyle(el).display!=='none')
      .map(el=>({id:el.id,top:el.getBoundingClientRect().top,
        left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right}));
    const rows=[];
    for(const control of controls){
      const row=rows.find(r=>Math.abs(r.top-control.top)<4);
      if(row)row.items.push(control.id);
      else rows.push({top:control.top,items:[control.id]});
    }
    return {rows,controls,viewport:innerWidth};
  });
  let controlGeometry=await mobileRows();
  assert.ok(controlGeometry.rows.length>=1&&controlGeometry.rows.length<=2,'390px Image toolbar must never force a third row: '+JSON.stringify(controlGeometry));
  assert.ok(controlGeometry.rows[0].items.includes('scene-image-open'),'Library icon belongs beside upload, not row three');
  assert.ok(controlGeometry.rows[0].items.includes('image-composer-add'),'Upload stays in the first row');
  assert.ok(controlGeometry.controls.every(c=>c.left>=8&&c.right<=controlGeometry.viewport-8),
    'All mobile controls fit inside the viewport: '+JSON.stringify(controlGeometry));
  await x.page.locator('#scene-image-open').click();
  const libraryMenu=await x.page.locator('#scene-image-menu').evaluate(el=>{
    const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
  });
  assert.ok(libraryMenu.left>=8&&libraryMenu.right<=382,
    'Elements categories menu must remain entirely visible on the phone: '+JSON.stringify(libraryMenu));
  assert.equal(await x.page.locator('#scene-image-menu-categories').isVisible(),true);
  const categoriesMenu=await x.page.locator('#scene-image-menu').evaluate(el=>{
    const r=el.getBoundingClientRect();return {left:r.left,right:r.right};
  });
  assert.ok(categoriesMenu.left>=8&&categoriesMenu.right<=382,'Elements categories must fit inside the viewport');
  await x.page.locator('#scene-image-open').click();


  assert.equal(await x.page.locator('#image-composer-resolution').isVisible(),false,'Secondary resolution is collapsed initially');
  await x.page.locator('#image-composer-mobile-more').click();
  assert.equal(await x.page.locator('#image-composer-resolution').isVisible(),true,'More exposes the original resolution select');
  assert.equal(await x.page.locator('#image-composer-count').isVisible(),true,'More exposes the original image count select');
  const extras=await x.page.evaluate(()=>{
    const composer=document.getElementById('image-composer').getBoundingClientRect();
    const labels=['image-composer-resolution-wrap','image-composer-count-wrap']
      .map(id=>document.getElementById(id).getBoundingClientRect());
    return {deckTop:composer.top,deckBottom:composer.bottom,
      extras:labels.map(r=>({top:r.top,bottom:r.bottom,left:r.left,right:r.right}))};
  });
  // The approved 2026-10-19 iPhone layout opens Options as a SECOND
  // row inside the composer, not a separate Safari-clipped floating overlay.
  assert.ok(extras.extras.every(rect=>rect.top>=extras.deckTop-1&&
      rect.bottom<=extras.deckBottom+1&&rect.left>=8&&rect.right<=382),
    'Expanded More controls must stay inside the two-row deck, not outside the viewport: '+JSON.stringify(extras));
  assert.ok((await mobileRows()).rows.length<=3,
    'Opening More may wrap the optional controls at narrow widths, but may not overflow the bounded composer');


  await x.page.locator('#image-composer-mobile-more').click();
  assert.equal(await x.page.locator('#image-composer-resolution').isVisible(),false,'More collapses without changing selected values');
  assert.equal(await x.page.locator('#image-composer-generate').evaluate(el=>Math.round(el.getBoundingClientRect().width)),await x.page.locator('#image-composer .image-composer-toolbar').evaluate(el=>Math.round(el.getBoundingClientRect().width)),'Generate is a full-width action underneath the controls');
  await x.page.setViewportSize({width:320,height:730});
  const narrowRows=await mobileRows();
  assert.ok(narrowRows.rows.length>=1&&narrowRows.rows.length<=2,'320px toolbar must not create a third row: '+JSON.stringify(narrowRows));
  assert.ok(narrowRows.controls.every(c=>c.left>=7&&c.right<=313),
    '320px toolbar must not clip controls: '+JSON.stringify(narrowRows));
  await x.page.setViewportSize({width:390,height:844});

  await x.page.screenshot({path:'test-results/lab-image-floating-mobile.png',fullPage:false});
  await x.page.click('#tool-video');
  assert.ok(await x.page.locator('.empty-actions').evaluate(el=>el.getBoundingClientRect().width<=document.querySelector('.canvas').getBoundingClientRect().width),'Empty actions must fit the mobile preview');
  await x.page.locator('#generate').scrollIntoViewIfNeeded();
  assert.equal(await x.page.locator('#generate').isVisible(),true);
  await x.page.screenshot({path:'test-results/lab-workspace-mobile.png',fullPage:true});
  assert.deepEqual(x.errors,[]);
  await x.context.close();
  console.log('PASS mobile responsive layout');
  // Regression: saving MyRoom must not replace the editorial Locations hero.
  // The reference image helper requires a DIV host and decodes private bytes.
  const fixture=[{
    id:'ad4b7111-39f4-47a9-898b-45a1cf07a030',
    name:'PVSCENE1|locations|MyRoom',
    created_at:'2026-10-18T00:05:00Z',
    refs:[
      {id:'ad4b7111-39f4-47a9-898b-45a1cf07a101',name:'portrait.png',role:'room'},
      {id:'ad4b7111-39f4-47a9-898b-45a1cf07a102',name:'room-landscape.png',role:'room'},
      {id:'ad4b7111-39f4-47a9-898b-45a1cf07a103',name:'room-detail.png',role:'room'},
      {id:'ad4b7111-39f4-47a9-898b-45a1cf07a104',name:'room-angle.png',role:'room'}
    ]
  }];
  const coverTest=await open(1440,900,fixture);
  await coverTest.page.click('#tool-image');
  await coverTest.page.click('#image-composer-prompt');
  await coverTest.page.click('#scene-image-open');
  await coverTest.page.click('#scene-image-menu [data-scene-target="locations"]');
  assert.equal(await coverTest.page.locator('#scene-category-hero').isVisible(),true,'Saved Locations preserve their editorial hero');
  assert.equal(await coverTest.page.locator('#scene-feature').isVisible(),false,'Saving an item does not hijack the hero with a selected feature');
  assert.equal(await coverTest.page.locator('#scene-category-hero').evaluate(el=>getComputedStyle(el).backgroundImage),'none','F keeps Location inputs in their cards, without a category photograph');
  assert.equal(await coverTest.page.locator('#scene-grid .scene-card-select').count(),1);
  await coverTest.page.waitForFunction(()=>{
    const img=document.querySelector('#scene-grid .scene-card-image img');
    return img?.complete&&img.naturalWidth===8&&img.naturalHeight===5;
  },null,{timeout:12000});
  const imgRules=await coverTest.page.locator('#scene-grid .scene-card-image img').evaluate(img=>({
    fit:getComputedStyle(img).objectFit,width:img.getBoundingClientRect().width,
    parentWidth:img.parentElement.getBoundingClientRect().width
  }));
  assert.equal(imgRules.fit,'cover','Saved Location card scales and crops the chosen photo');
  assert.ok(Math.abs(imgRules.width-imgRules.parentWidth)<2,'Location card photo fills its frame');
  await coverTest.page.click('#scene-grid .scene-card-select');
  assert.equal(await coverTest.page.locator('#scene-category-hero').isVisible(),false,'Selecting a Location hides unrelated category artwork');
  await coverTest.page.waitForFunction(()=>{
    const image=document.querySelector('.scene-feature-cover img');
    return image?.complete&&image.naturalWidth>0;
  },null,{timeout:12000});
  assert.equal(await coverTest.page.locator('#scene-feature').isVisible(),true,'A saved Element opens a dedicated detail workspace');
  assert.equal(await coverTest.page.locator('#scene-grid').isVisible(),false,'The overview grid does not duplicate the selected item');
  assert.equal(await coverTest.page.locator('.scene-feature-photos .scene-feature-shot').count(),4,'All saved photographs are immediately accessible');
  await coverTest.page.waitForFunction(()=>[...document.querySelectorAll('.scene-feature-shot img')].every(img=>img.complete&&img.naturalWidth>0),null,{timeout:12000});
  await coverTest.page.locator('.scene-feature-shot').nth(1).click();
  assert.equal(await coverTest.page.locator('.scene-feature-shot[aria-pressed="true"]').count(),1,'Only one displayed photo is selected');
  await coverTest.page.click('.scene-detail-back');
  assert.equal(await coverTest.page.locator('#scene-category-hero').isVisible(),true,'Back returns to the collection');
  assert.equal(await coverTest.page.locator('#scene-grid').isVisible(),true);
  await coverTest.page.click('#scene-list-view');
  assert.equal(await coverTest.page.locator('#scene-category-hero').isVisible(),true);
  // A list toggle re-renders the card. Private images decode asynchronously:
  // wait for the photo, not for an immediate DOM <img> count on that frame.
  await coverTest.page.waitForFunction(()=>{
    const image=document.querySelector('#scene-grid .scene-card-image img');
    return image?.complete&&image.naturalWidth===8&&image.naturalHeight===5;
  },null,{timeout:12000});
  await coverTest.page.setViewportSize({width:390,height:844});
  await coverTest.page.click('#scene-grid .scene-card-select');
  assert.equal(await coverTest.page.locator('#scene-category-hero').isVisible(),false,'Mobile selected Location shows its own photo, not static artwork');
  assert.equal(await coverTest.page.locator('.scene-feature-photos .scene-feature-shot').count(),4);
  assert.ok(await coverTest.page.locator('#scene-library-dialog').evaluate(el=>el.getBoundingClientRect().width<=window.innerWidth),
    'Saved Locations modal does not overflow mobile horizontally');
  await coverTest.page.screenshot({path:'test-results/lab-elements-saved-location.png',fullPage:false});
  assert.deepEqual(coverTest.errors,[],'Saved Elements must not throw page errors');
  await coverTest.context.close();
  console.log('PASS saved Elements cover and persistent category hero');
} finally {
  await browser.close();server.close();
}
