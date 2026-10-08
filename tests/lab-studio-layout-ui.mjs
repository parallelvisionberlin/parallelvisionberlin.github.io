// Mock-only Lab UI layout verification. Never contacts paid providers.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf("try{const {Clerk}=await import(");
assert.ok(boot>0,'Expected browser bootstrap marker');
const testSource=source.slice(0,boot)+
"clerk={isSignedIn:true,user:{id:'layout-test'},session:{id:'mock',getToken:async()=> 'mock-token'},signOut:async()=>{}};owner=true;userId='layout-test';config={enabled:true,geminiEnabled:true,falEnabled:true,dailyLimitUsd:10,concurrency:{image:4,video:1}};$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();await loadSoulProIdentity();refreshCanvasImport();update();syncVideoStudioMode();window.__queueTestSetActiveJobs=setActiveJobs;window.__layoutTest=true;";

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
    generate:rect('#generate'),stage:rect('.stage'),canvas:rect('.canvas'),
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
  await page.goto('http://127.0.0.1:4182/lab/');
  await page.waitForFunction(()=>window.__layoutTest===true);
  return {page,context,errors};
}
try{
  let x=await open(1440,900);
  let d=await geometry(x.page);
  console.log('DESKTOP_LAYOUT',JSON.stringify(d));
  assert.equal(d.heroHidden,true,'Large marketing hero must not appear in signed-in workspace');
  assert.ok(d.navigation.top-d.header.bottom<=2,'Tool tabs start directly under header');
  assert.ok(d.workspace.top-d.navigation.bottom<=3,'No second bar or giant gap before workspace');
  assert.ok(d.workspace.top<140,'Workspace must be above the fold');
  assert.ok(d.dock.height>100&&d.dock.bottom<=d.panel.bottom+2,'Generation controls must have a real fixed dock');
  assert.ok(d.generate.bottom<=d.panel.bottom+2,'Generate dock must remain inside left panel');
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
  assert.equal(await x.page.locator('#active').evaluate(el=>el.closest('.tool-switch')!==null),true,
    'Live Queue belongs to tool bar instead of below editor');
  assert.equal(await x.page.locator('#active').evaluate(el=>el.open),false,'Queue details collapsed by default');
  assert.match(await x.page.locator('#queue-count').innerText(),/2 to review/);
  assert.equal(await x.page.locator('#resolve').isVisible(),false,'Resolve action hidden until user opens Queue');
  await x.page.locator('#active summary').click();
  assert.equal(await x.page.locator('#resolve').isVisible(),true,'Provider recovery remains accessible in Queue');
  assert.match(await x.page.locator('#active-detail').innerText(),/Check status before retrying/);
  await x.page.screenshot({path:'test-results/lab-video-queue-popover.png',fullPage:false});
  await x.page.keyboard.press('Escape');
  assert.equal(await x.page.locator('#active').evaluate(el=>el.open),false,'Escape dismisses Queue');
  await x.page.locator('#active summary').click();
  await x.page.locator('.tool-caption').click();
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
  assert.ok(d.modes.top-d.model.bottom<20,'Start/reference buttons directly follow model info');
  assert.equal(d.explanationCollapsed,true);
  const images=await x.page.locator('.brand img').evaluateAll(async nodes=>Promise.all(nodes.map(async img=>{try{await img.decode()}catch{}return {src:img.getAttribute('src'),complete:img.complete,width:img.naturalWidth}})));
  console.log('BRAND_IMAGES',JSON.stringify(images));
  assert.ok(images[0].complete&&images[0].width>0,'Official PV icon must load');
  assert.ok(images[1].complete&&images[1].width>0,'Official PV wordmark must load');
  assert.equal(await x.page.locator('#lab-boot').isVisible(),false,'Loading screen must disappear after workspace becomes usable');
  assert.equal(await x.page.locator('#gate').isVisible(),false,'Login gate must never flash inside signed-in workspace');
  assert.notEqual(d.accent,'rgb(141, 99, 255)','No default purple selection');
  assert.ok(await x.page.locator('#empty-title').innerText().then(t=>/next scene/i.test(t)),'Video opens with an inviting scene direction');
  assert.ok(await x.page.locator('#canvas-secondary').isVisible(),'Video offers an alternate entry into Image');
  assert.equal(await x.page.locator('.canvas').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(21, 22, 25)','Video playback uses a neutral dark canvas');
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
  await x.page.screenshot({path:'test-results/lab-image-model-popup.png',fullPage:false});
  await x.page.fill('#image-composer-model-search','banana');
  await x.page.locator('.composer-model-option[data-value="gemini"]').click();
  assert.equal(await x.page.locator('#image-engine').inputValue(),'gemini','Model menu changes actual provider selection');
  await x.page.click('#image-composer-model');
  await x.page.fill('#image-composer-model-search','seedream');
  await x.page.locator('.composer-model-option[data-value="seedream"]').click();
  assert.equal(await x.page.locator('#image-engine').inputValue(),'seedream');

  const floatingChooser=x.page.waitForEvent('filechooser');
  await x.page.click('#image-composer-add');
  const imageChooser=await floatingChooser;
  assert.ok(imageChooser,'Plus button opens reference input from same bar');
  const referencePng=await x.page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=320;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#65788a';ctx.fillRect(0,0,320,320);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await imageChooser.setFiles({name:'reference-photo.png',mimeType:'image/png',buffer:Buffer.from(referencePng,'base64')});
  await x.page.waitForFunction(()=>document.querySelectorAll('#image-composer-references .composer-reference-tile').length===1);
  assert.equal(await x.page.locator('.composer-reference-tile img').count(),1,'Reference thumbnail lives inside floating bar');
  assert.equal(await x.page.locator('.composer-reference-index').innerText(),'1');
  const inlineGeometry=await x.page.evaluate(()=>{
    const ref=document.querySelector('.composer-reference-tile').getBoundingClientRect();
    const prompt=document.querySelector('#image-composer-prompt').getBoundingClientRect();
    return {refLeft:ref.left,refWidth:ref.width,promptLeft:prompt.left};
  });
  assert.ok(inlineGeometry.refLeft+inlineGeometry.refWidth<inlineGeometry.promptLeft,
    'Higgsfield-like reference thumbnail sits to the left of the prompt in one composer');
  await x.page.screenshot({path:'test-results/lab-image-inline-reference.png',fullPage:false});
  await x.page.click('.composer-reference-remove');
  await x.page.waitForFunction(()=>document.querySelectorAll('.composer-reference-tile').length===0);
  assert.equal(await x.page.locator('#ref-count').textContent().then(t=>t.includes('0')),true,'Removing in-bar thumbnail updates true reference list');
  await x.page.locator('#image-composer-prompt').fill('A sculptural, atmospheric photographic still.');
  assert.equal(await x.page.locator('#prompt').inputValue(),'A sculptural, atmospheric photographic still.','Prompt is synchronized with real Image form');
  assert.equal(await x.page.locator('#image-composer-generate').isDisabled(),false,'Image generation button enables from floating prompt');
  const generateUi=await x.page.locator('#image-composer-generate').evaluate(el=>{
    const css=getComputedStyle(el);return {color:css.color,background:css.backgroundImage,font:css.fontFamily,weight:css.fontWeight};
  });
  assert.equal(generateUi.color,'rgb(24, 20, 14)','Available Image Generate uses dark text on amber');
  await x.page.selectOption('#image-composer-ratio','16:9');
  assert.equal(await x.page.locator('#ratio').inputValue(),'16:9','Floating aspect ratio updates backend settings');
  await x.page.click('#image-composer-more');
  assert.equal(await x.page.locator('#composer-options').isVisible(),true,'Options expand inside the composer');
  assert.equal(await x.page.locator('.workspace').isVisible(),false,'Image options never reopen the duplicate side form');
  assert.equal(await x.page.locator('#output-format').isVisible(),true,'Existing output settings remain available inline');
  await x.page.click('#image-composer-more');
  const galleryLayout=await x.page.locator('#history').evaluate(el=>{
    const c=getComputedStyle(el);return {display:c.display,columns:c.gridTemplateColumns.split(' ').length};
  });
  assert.ok(galleryLayout.columns>=3,'Images use gallery grid with multiple columns');
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

  // Regression for the exact owner complaint: duration, resolution and aspect ratio
  // must be visible ABOVE the Generate dock without page scrolling on a desktop.
  for(const [width,height] of [[1440,768],[1440,820],[1728,820]]){
    const compact=await open(width,height);
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
      assert.ok(parts[id].bottom<=parts.dock.top-4,id+' must be fully above the Generate dock');
      assert.ok(parts[id].bottom<height,id+' must fit inside the viewport');
    }
    assert.ok(parts.generate.bottom<height,'Generate button must also be visible on first view');
    await compact.page.screenshot({path:'test-results/lab-compact-video-'+width+'.png',fullPage:false});
    assert.deepEqual(compact.errors,[]);
    await compact.context.close();
  }
  console.log('PASS video settings + Generate fit without scrolling at 768px and 820px desktop heights');

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
  await bootPage.goto('http://127.0.0.1:4182/lab/',{waitUntil:'commit'});
  await bootPage.waitForSelector('#lab-boot');
  assert.equal(await bootPage.locator('#lab-boot').isVisible(),true,'Brand loading appears before external JS');
  assert.equal(await bootPage.locator('#gate').isVisible(),false,'No half-loaded sign-in page');
  assert.match(await bootPage.locator('#lab-boot-name').innerText(),/PARALLEL VISION/);
  const loaderLogo=bootPage.locator('#lab-boot-wordmark');
  await bootPage.waitForFunction(()=>document.getElementById('lab-boot-wordmark')?.classList.contains('is-ready'),{timeout:8000});
  assert.ok(await loaderLogo.evaluate(img=>img.complete&&img.naturalWidth>0),'Original PV wordmark loads while Lab module is still pending');
  assert.equal(await loaderLogo.isVisible(),true,'Brand image is visibly rendered on loading screen');
  const loadingCdp=await bootContext.newCDPSession(bootPage);
  const loadingCapture=await loadingCdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
  writeFileSync('test-results/lab-branded-loading.png',Buffer.from(loadingCapture.data,'base64'));
  await loadingCdp.detach();
  releaseLabScript();
  await bootPage.waitForFunction(()=>window.__layoutTest===true);
  assert.equal(await bootPage.locator('#lab-boot').isVisible(),false,'Boot overlay removed on mock auth resolution');
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
  const compactComposer=await x.page.locator('#image-composer').evaluate(el=>{
    const r=el.getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,width:r.width};
  });
  assert.ok(compactComposer.left>=0&&compactComposer.right<=390,'Floating Image bar fits on mobile');
  assert.ok(await x.page.locator('#image-composer-add').isVisible(),'Mobile Image bar keeps in-bar reference action');
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