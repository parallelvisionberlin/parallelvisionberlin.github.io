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
const requestedAt=authSync.indexOf('await restoreStudioEntry()');
const revealedAt=authSync.indexOf('finishLabBoot();');
const historyAt=authSync.indexOf('const historyReady=loadHistory()',requestedAt);
const historyAwaited=authSync.indexOf('await historyReady;',historyAt);
assert.ok(requestedAt>=0&&historyAt>requestedAt&&historyAwaited>historyAt&&revealedAt>historyAwaited,
  'Restore the requested Studio route and first private gallery history before removing the loading overlay');
assert.ok(authSync.includes("document.documentElement.classList.add('pv-studio-route-pending')"),'Protect the loader during authenticated initialization');
assert.ok(source.includes("document.documentElement.classList.remove('pv-studio-route-pending')"),'Boot release clears its route guard');
assert.ok(source.includes("document.documentElement.classList.add('pv-studio-boot-lock')"),'In-place sign-in reactivates the loading scrollbar lock');
const studioHtml=readFileSync('lab/studio.html','utf8');
assert.match(studioHtml,/<html lang="en" class="pv-studio-boot-lock">/,'Initial HTML locks scroll before any route renders');
assert.match(studioHtml,/html\.pv-studio-boot-lock\{scroll-behavior:auto!important\}/,'Boot overrides smooth scrolling while locked');
assert.match(studioHtml,/history\.scrollRestoration='manual';/,'All direct routes opt out of stale Chrome scroll restoration');
assert.match(studioHtml,/new MutationObserver\(scheduleBootUnlock\)/,'Native route completion can release the boot scroll lock');
const splashWordmark=studioHtml.match(/\.lab-boot-wordmark\{([^}]*)\}/)?.[1]||'';
assert.match(splashWordmark,/font-family:"Helvetica Neue",Arial,sans-serif/,'Splash wordmark uses immediately available system typography');
assert.doesNotMatch(splashWordmark,/Space Grotesk|DM Sans/,'Splash typography cannot shift when web fonts load');

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
async function open(width,height){
  const context=await browser.newContext({viewport:{width,height},acceptDownloads:true});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://**/*',async route=>{
    const u=new URL(route.request().url());
    if(!u.hostname.endsWith('parallelvision.workers.dev'))return route.abort();
    const path=u.pathname;
    const content=path==='/api/jobs'?{jobs:[],activeJobs:[],concurrency:{image:4,video:1},next:null}:path==='/api/packs'?{packs:[]}:path==='/api/soul-pro/identity'?{configured:false,count:0,refs:[]}:{};
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
  assert.ok(d.dock.height>=64&&d.dock.bottom<=d.panel.bottom+2,'Generation controls must have a real fixed dock');
  assert.ok(d.generate.bottom<=d.panel.bottom+2,'Generate dock must remain inside left panel');
  assert.ok(Math.abs(d.stage.top-d.inspector.top)<2&&Math.abs(d.stage.bottom-d.inspector.bottom)<2,'Video preview and right inspector share their top and bottom edges');
  await x.page.click('#mode-text');
  await x.page.locator('#prompt').fill('Gentle camera movement.');
  assert.equal(await x.page.locator('#generate').isEnabled(),true);
  await x.page.waitForFunction(()=>{
    const style=getComputedStyle(document.querySelector('#generate'));
    // Owner-approved satin-white gradient replaces the old flat cream finish.
    return style.backgroundColor==='rgb(237, 236, 229)'||
      (style.backgroundImage.includes('linear-gradient')&&
       style.backgroundImage.includes('252, 252, 253')&&
       style.backgroundImage.includes('230, 232, 235'));
  },{},{timeout:3000});
  await x.page.screenshot({path:'test-results/lab-video-white-generate.png',fullPage:false});
  await x.page.locator('#prompt').fill('');
  await x.page.click('#mode-start');
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
  assert.ok(videoTypography.size>=14,'Video motion prompt is readable at desktop size');
  assert.match(videoTypography.family,/DM Sans/,'PV Lab uses its own editorial UI typography');
  assert.ok(d.stage.height<=741&&d.canvas.height<650,'Preview never exceeds viewport cap');
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
    return {top:r.top,bottom:r.bottom,width:r.width,radius:getComputedStyle(el).borderTopLeftRadius};
  });
  assert.ok(composerGeometry.bottom>=850 && composerGeometry.width>900,'Composer floats near bottom at desktop width');
  assert.ok(parseFloat(composerGeometry.radius)>=19,'Composer must have generously rounded corners');
  assert.equal(await x.page.locator('#image-gallery-empty').isVisible(),true,'Empty gallery must not invent images');
  assert.equal(await x.page.locator('.empty-wordmark').count(),0,'Do not repeat central PV logo in gallery mode');

  await x.page.click('#image-composer-model');
  assert.equal(await x.page.locator('#image-composer-model-menu').isVisible(),true,'Model popup opens above floating bar');
  const menuGeometry=await x.page.locator('#image-composer-model-menu').evaluate(el=>{
    const r=el.getBoundingClientRect(),head=document.getElementById('studio-header').getBoundingClientRect();
    const items=el.querySelector('.composer-model-items'),list=items.getBoundingClientRect();
    const rows=[...items.querySelectorAll('.composer-model-option')].map(row=>row.getBoundingClientRect());
    const search=el.querySelector('.composer-model-search').getBoundingClientRect();
    const footer=el.querySelector('.composer-model-footer').getBoundingClientRect();
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
      searchTop:search.top,searchBottom:search.bottom,footerTop:footer.top,footerBottom:footer.bottom,
      limit:getComputedStyle(el).maxHeight};
  });
  assert.ok(menuGeometry.width>=438&&menuGeometry.width<=442,'Model menu should have its refined 440px desktop width: '+JSON.stringify(menuGeometry));
  assert.ok(menuGeometry.height<=menuGeometry.available+2&&menuGeometry.height>350,'Model dropdown should grow naturally without covering navigation: '+JSON.stringify(menuGeometry));
  assert.ok(menuGeometry.top>=menuGeometry.headerBottom+14,'Model dropdown must preserve a visible gap below navigation: '+JSON.stringify(menuGeometry));
  assert.ok(menuGeometry.rowHeight>=57&&menuGeometry.titleSize>=12.5&&menuGeometry.descriptionWhiteSpace==='nowrap',
    'Model rows must have breathing room and one-line descriptions: '+JSON.stringify(menuGeometry));
  assert.ok(menuGeometry.searchTop>=menuGeometry.top&&menuGeometry.footerBottom<=menuGeometry.bottom+1,'Search and character shortcut stay inside menu: '+JSON.stringify(menuGeometry));
  assert.equal(menuGeometry.partialBottomRow,false,'Only complete model rows should show initially: '+JSON.stringify(menuGeometry));
  if(!menuGeometry.overflow)assert.ok(menuGeometry.emptyTail<7,'No large blank area after the last model: '+JSON.stringify(menuGeometry));
  assert.ok(menuGeometry.itemsClient>=250,'Model list stays usable before scrolling: '+JSON.stringify(menuGeometry));
  assert.equal(await x.page.locator('.composer-model-option[data-value="qwen3"] img').getAttribute('src'),'./branding/qwen.svg?v=20261013-mono1','Qwen uses refreshed local icon');
  // Simulate future models: the menu must clip at a full row and never insert
  // a large empty zone between the final visible card and the fixed footer.
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
  assert.equal(await x.page.locator('#composer-add-saved-toggle').isVisible(),true,
    'Saved packs have their own small arrow beside +');
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
    const style=getComputedStyle(el),help=el.querySelector('.composer-exact-tooltip');
    return {border:style.borderTopWidth,background:style.backgroundColor,
      tooltipText:help?.textContent,tooltipVisibility:getComputedStyle(help).visibility};
  });
  assert.equal(exactSurface.border,'0px','No chip border around Exact');
  assert.equal(exactSurface.background,'rgba(0, 0, 0, 0)','Exact background is transparent');
  assert.equal(exactSurface.tooltipVisibility,'hidden','Hover explanation is hidden by default');
  assert.match(exactSurface.tooltipText,/Exact Prompt.*No automatic prompt improvements/);
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
  await x.page.click('#composer-add-saved-toggle');
  assert.equal(await x.page.locator('#pack-studio-heading').textContent(),'Photo packs.');
  assert.equal(await x.page.locator('#pack-studio-dialog').isVisible(),true,'Saved packs open an independent Soul-inspired library');
  const packDialog=await x.page.locator('#pack-studio-dialog').evaluate(el=>{
    const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width};
  });
  assert.ok(packDialog.width<=980&&packDialog.top>=12&&packDialog.bottom<=890,
    'Library is centered and contained inside the viewport: '+JSON.stringify(packDialog));
  await x.page.click('#pack-studio-close');
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
  assert.match(await x.page.locator('#image-composer-prompt').getAttribute('placeholder')||'',/variation of this image/i,
    'A selected base image offers an editable variation without an extra prompt row');
  const photoImageHeight=await x.page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height);
  assert.ok(Math.abs(photoImageHeight-compactImageHeight)<=4,
    'Adding a photo must not resize the fixed Image deck: '+JSON.stringify({compactImageHeight,photoImageHeight}));
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
  assert.ok(inlineGeometry.refRight<=inlineGeometry.promptLeft+12 &&
    inlineGeometry.refBottom>inlineGeometry.promptTop+10 &&
    inlineGeometry.refTop<inlineGeometry.promptTop+48,
    'Thumbnails remain beside the prompt, not in a separate row: '+JSON.stringify(inlineGeometry));
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
  assert.ok(generateUi.labelPx>=17,'Generate has clear primary-action type size: '+generateUi.labelPx);
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
  assert.match(await x.page.locator('#empty-title').innerText(),/references/i);
  assert.match((await x.page.locator('#canvas-import').innerText()).replace(/\s+/g,' '),/Add references/);
  await x.page.locator('#canvas-secondary').click();
  assert.equal(await x.page.evaluate(()=>document.activeElement.id),'prompt','Reference secondary action focuses motion direction');
  await x.page.screenshot({path:'test-results/lab-workspace-reference.png',fullPage:false});
  assert.deepEqual(x.errors,[]);
  await x.context.close();
  console.log('PASS desktop workspace, canvas import, image tab and no hero');

  // Start-frame modes follow their source ratio. Text mode exposes an explicit
  // ratio; its controls must be reachable inside the independently scrolling
  // form while Generate stays fixed and the document does not scroll.
  for(const [width,height] of [[1440,768],[1440,820],[1728,820]]){
    const compact=await open(width,height);
    assert.equal(await compact.page.locator('#ratio-control').isVisible(),false,'Start-frame mode inherits the source ratio');
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
  assert.equal(await loaderLogo.innerText(),'PV LAB','Loader uses the PV LAB wordmark');
  assert.equal(await bootPage.locator('.lab-boot-sub').innerText(),'BY PARALLEL VISION','Brand attribution is understated');
  assert.equal(await loaderLogo.isVisible(),true,'Brand is present without downloading an image');
  assert.equal(await loaderLogo.evaluate(el=>getComputedStyle(el).animationName),'none','PV LAB appears crisp at first paint');
  assert.equal(await loaderLogo.evaluate(el=>getComputedStyle(el).filter),'none','Brand is not blurred during loading');
  const splashAtStart=await bootPage.evaluate(()=>{
    const root=document.documentElement;
    return {overflow:getComputedStyle(root).overflowY,scrollY:window.scrollY,
      locked:root.classList.contains('pv-studio-boot-lock'),font:getComputedStyle(document.getElementById('lab-boot-name')).fontFamily};
  });
  assert.equal(splashAtStart.overflow,'hidden','Full-screen splash has no document scrollbar');
  assert.equal(splashAtStart.locked,true,'Splash maintains the initial scroll lock');
  assert.equal(splashAtStart.scrollY,0,'Startup begins at the top instead of a restored scroll position');
  assert.match(splashAtStart.font,/Helvetica Neue|Arial/,'Loader never uses an asynchronously swapped font');
  const logoBefore=await loaderLogo.boundingBox();
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
  assert.equal(await bootPage.locator('#lab-boot-wordmark').count(),0,'Loader no longer waits for the old brand image');
  const loadingCdp=await bootContext.newCDPSession(bootPage);
  const loadingCapture=await loadingCdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
  writeFileSync('test-results/lab-branded-loading.png',Buffer.from(loadingCapture.data,'base64'));
  await loadingCdp.detach();
  releaseLabScript();
  await bootPage.waitForFunction(()=>window.__layoutTest===true);
  assert.equal(await loaderLogo.evaluate(el=>getComputedStyle(el).animationName),'pv-boot-out','Blur happens after Studio becomes ready');
  await bootPage.locator('#lab-boot').waitFor({state:'hidden',timeout:2000});
  await bootPage.waitForFunction(()=>!document.documentElement.classList.contains('pv-studio-boot-lock'),{timeout:2000});
  assert.equal(await bootPage.locator('#lab-boot').isVisible(),false,'Boot overlay finishes its exit on mock auth resolution');
  assert.notEqual(await bootPage.evaluate(()=>getComputedStyle(document.documentElement).overflowY),'hidden',
    'Document scrolling becomes available after splash exit');
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
  assert.equal(await x.page.locator('#image-composer-resolution').isVisible(),false,'Secondary resolution is collapsed initially');
  await x.page.locator('#image-composer-mobile-more').click();
  assert.equal(await x.page.locator('#image-composer-resolution').isVisible(),true,'More exposes the original resolution select');
  assert.equal(await x.page.locator('#image-composer-count').isVisible(),true,'More exposes the original image count select');
  await x.page.locator('#image-composer-mobile-more').click();
  assert.equal(await x.page.locator('#image-composer-resolution').isVisible(),false,'More collapses without changing selected values');
  assert.equal(await x.page.locator('#image-composer-generate').evaluate(el=>Math.round(el.getBoundingClientRect().width)),await x.page.locator('#image-composer .image-composer-toolbar').evaluate(el=>Math.round(el.getBoundingClientRect().width)),'Generate is a full-width action underneath the controls');
  await x.page.screenshot({path:'test-results/lab-image-floating-mobile.png',fullPage:false});
  await x.page.click('#tool-video');
  assert.ok(await x.page.locator('.empty-actions').evaluate(el=>el.getBoundingClientRect().width<=document.querySelector('.canvas').getBoundingClientRect().width),'Empty actions must fit the mobile preview');
  await x.page.locator('#generate').scrollIntoViewIfNeeded();
  assert.equal(await x.page.locator('#generate').isVisible(),true);
  await x.page.screenshot({path:'test-results/lab-workspace-mobile.png',fullPage:true});
  assert.deepEqual(x.errors,[]);
  await x.context.close();
  console.log('PASS mobile responsive layout');
} finally {
  await browser.close();server.close();
}
