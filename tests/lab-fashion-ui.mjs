// Mock-only browser regression of PV Lab Fashion. No live providers or paid generations.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';

const playwrightPath=process.env.PV_PLAYWRIGHT_MODULE;
assert.ok(playwrightPath,'Install Playwright and set PV_PLAYWRIGHT_MODULE.');
const {chromium}=await import(pathToFileURL(playwrightPath).href);
const root=resolve('.');
mkdirSync('test-results',{recursive:true});
// Instrument only readiness; use the production canonical loader and session path.
const source=readFileSync('lab/fashion.js','utf8');
const readyMarker='return {ready,sync,lock};';
assert.ok(source.includes(readyMarker),'The production Fashion controller exposes readiness and lock');
const testSource=source.replace(readyMarker,
  "window.__fashionRoot=root;ready.then(()=>{window.__fashionTestReady=true;}).catch(e=>{window.__fashionTestError=String(e);});"+readyMarker);
const account=`
const listeners=[];
const account={isSignedIn:true,user:{id:'synthetic-owner'},session:{id:'mock-session',getToken:async()=> 'mock.jwt.token'},
  addListener:fn=>listeners.push(fn),openSignIn:()=>{window.__fashionSignins=(window.__fashionSignins||0)+1;},
  signOut:async()=>{account.isSignedIn=false;account.user=null;account.session=null;for(const fn of listeners)fn();}};
export const isNativeLab=()=>false;
export const loadLabAccount=async()=>account;
`;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),pathname=url.pathname==='/lab/studio'?'/lab/studio.html':url.pathname,path=resolve(root,'.'+pathname);
  if(!path.startsWith(root+sep)||!existsSync(path)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');
  res.end(pathname==='/lab/native-account.js'?account:pathname==='/lab/fashion.js'?testSource:readFileSync(path));
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const port=server.address().port,browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
const page=await context.newPage(),editor=page.locator('#fashion-studio'),errors=[],calls=[];
const imageIds=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
let uploaded=0;
let releaseSecondary;
const secondaryHeld=new Promise(resolve=>{releaseSecondary=resolve;});
const fakePng=Buffer.from(await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=360;canvas.height=480;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#444957';ctx.fillRect(0,0,360,480);
  return canvas.toDataURL('image/png').split(',')[1];
}),'base64');
const completedFashion=(id,outputId,model='fashnmax')=>({
  id,status:'completed',outputId,createdAt:Date.now()-3600000,
  settings:{type:'image',mode:'fashion',fashionModel:model}
});
const baseJobs=[
  completedFashion('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  completedFashion('cccccccc-cccc-4ccc-8ccc-cccccccccccc','dddddddd-dddd-4ddd-8ddd-dddddddddddd','fashn16'),
  {id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',status:'failed',error:'Provider declined the image',createdAt:Date.now()-7200000,settings:{type:'image',mode:'fashion',fashionModel:'fashn16'}},
  {id:'ffffffff-ffff-4fff-8fff-ffffffffffff',status:'queued',createdAt:Date.now()-8600000,settings:{type:'image',mode:'fashion',fashionModel:'fashnmax'}},
  {id:'11111111-2222-4333-8444-555555555555',status:'completed',createdAt:Date.now(),settings:{type:'video',mode:'start',engine:'wan'}}
];
const olderFashion=[completedFashion('12345678-1234-4234-8234-123456789abc','22222222-3333-4333-8333-222222222222')];
page.on('pageerror',e=>errors.push(e.message));
await page.route('https://**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;calls.push({path,method:request.method()});
  if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev')return route.abort();
  if(!path.startsWith('/api/public/'))assert.equal(request.headers().authorization,'Bearer mock.jwt.token','Private Fashion and Studio requests require the verified synthetic session');
  if(request.method()==='GET'&&(path==='/api/jobs'||path==='/api/fashion/balance'))await secondaryHeld;
  if(path.startsWith('/api/assets/')&&request.method()==='GET'){
    return route.fulfill({status:200,contentType:'image/png',body:fakePng});
  }
  const data=path==='/api/session'?{owner:true,customer:false,config:{enabled:true,falEnabled:true,videoEngines:['seedance','wan']}}:
    path==='/api/fashion/models'?{models:[
      {id:'fashn16',provider:'fal',label:'FASHN v1.6',available:true},
      {id:'fashnmax',provider:'fashn',label:'FASHN Max',available:true},
      {id:'fluxvto',provider:'fal',label:'FLUX VTO',available:true}
    ]}:path==='/api/fashion/balance'?{connected:true,credits:{total:100,onDemand:100,subscription:0}}:
    path==='/api/jobs'?(url.searchParams.has('before')?
      {jobs:olderFashion,next:null}:
      {jobs:baseJobs,next:{before:Date.now()-9500000,afterId:'ffffffff-ffff-4fff-8fff-ffffffffffff'}}):
    path==='/api/uploads'?{id:imageIds[uploaded++]}:
    path==='/api/fashion/quote'?{id:'33333333-3333-4333-8333-333333333333',
      estimatedUsd:0.15,expiresAt:Date.now()+600000,notice:'One generation after confirmation.'}:
    path==='/api/packs'?{packs:[]}:path==='/api/moods'?{boards:[]}:
    path.startsWith('/api/jobs/')?{job:baseJobs.find(j=>j.id===path.split('/').at(-1))}:
    request.method()==='GET'?{items:[],models:[],characters:[]}:
    {error:'Unexpected test mutation '+path};
  if(data.error)throw new Error(data.error);
  return route.fulfill({status:path==='/api/uploads'?201:200,contentType:'application/json',body:JSON.stringify(data)});
});
try{
  await page.goto('http://127.0.0.1:'+port+'/lab/fashion.html?fixture=canonical',{waitUntil:'domcontentloaded'});
  try{
    await page.waitForFunction(()=>window.__fashionTestReady===true&&document.body.classList.contains('lab-ready'),null,{timeout:15000});
  }catch(e){
    const debug=await page.evaluate(()=>({
      authStatus:document.getElementById('auth-status')?.textContent,
      startupError:window.__fashionTestError||null,
      htmlLoaded:!!document.getElementById('fashion-form')
    })).catch(()=>({}));
    throw new Error('Fashion mock session did not initialize: '+JSON.stringify({debug,pageErrors:errors,apiCalls:calls})+'; '+e.message);
  }
  assert.equal(new URL(page.url()).pathname,'/lab/studio','Legacy Fashion document enters the canonical Studio');
  assert.equal(new URL(page.url()).searchParams.get('fixture'),'canonical','Redirect preserves the requested context');
  assert.equal(new URL(page.url()).searchParams.get('tool'),'fashion');
  assert.equal(await page.locator('#studio-header').isVisible(),true,'Fashion uses the real shared Studio masthead');
  await page.locator('#studio-header .lab-wordmark').evaluate(img=>img.decode());
  assert.ok(await page.locator('#studio-header .lab-wordmark').evaluate(img=>img.naturalWidth>0),'The shared PV LAB wordmark decodes through the real asset route');
  assert.equal(await page.locator('#tool-fashion').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.site-header').count(),0,'The obsolete standalone header is not mounted');
  assert.equal(await editor.locator('#workspace').isVisible(),true);
  assert.equal(await editor.locator('#gate').isVisible(),false);
  assert.equal(await editor.locator('#model-select').isVisible(),true,
    'Fashion editor opens before secondary gallery and balance responses');
  assert.equal(await editor.locator('#fashion-history .history-item').count(),0,
    'The gallery remains pending while the main editor is usable');
  releaseSecondary();
  // The Fashion gallery lives below the editor and receives real private image
  // blobs; mixed image/video job types must not leak into this view.
  await page.waitForFunction(()=>window.__fashionRoot.querySelectorAll('#fashion-history .history-item').length===5);
  assert.equal(await editor.locator('#fashion-history .history-item').count(),5);
  assert.equal(await editor.locator('#fashion-more').isVisible(),false,'Exhausted gallery needs no extra paging control');
  assert.equal(await editor.locator('#fashion-gallery-count').innerText(),'5 shown');
  assert.equal(await editor.locator('#fashion-history .history-status-detail').count(),1,
    'Failed jobs should show a brief diagnostic, not a long scrollable text log');
  assert.equal(await editor.locator('#fashion-history .history-state[data-status="failed"]').count(),1);
  assert.equal(await editor.locator('#fashion-history .history-state[data-status="queued"]').count(),1);
  await page.waitForFunction(()=>window.__fashionRoot.querySelectorAll('#fashion-history .history-media img').length===3);
  assert.equal(await editor.locator('#fashion-history .history-media img').count(),3,
    'Completed Fashion jobs render image thumbnails from the private asset endpoint');
  assert.equal(await editor.locator('.recent-work').count(),0,'Remove the old right-column micro archive');
  const galleryLayout=await page.evaluate(()=>{
    const document=window.__fashionRoot;
    const r=selector=>{const el=document.querySelector(selector),b=el.getBoundingClientRect();
      return{top:b.top,bottom:b.bottom,left:b.left,right:b.right,width:b.width};
    };
    const style=getComputedStyle(document.getElementById('fashion-history'));
    return{gallery:r('#fashion-gallery'),controls:r('.engine-section'),result:r('.result-panel'),
      main:r('.fashion-workspace'),columns:style.gridTemplateColumns.split(' ').length,
      overflow:style.overflowY,maxHeight:style.maxHeight};
  });
  assert.ok(galleryLayout.gallery.top>=galleryLayout.controls.bottom,
    'Fashion generations belong below the model and styling controls');
  assert.ok(galleryLayout.gallery.width>=galleryLayout.main.width-2,
    'The gallery spans the full Fashion workspace');
  assert.ok(galleryLayout.columns>=4,'Desktop renders a multi-column photo gallery');
  assert.equal(galleryLayout.overflow,'visible','No tiny gallery scrollbar');
  assert.equal(galleryLayout.maxHeight,'none','No 110px gallery limit');
  assert.equal(await editor.locator('#fashion-history button[aria-pressed="true"]').count(),0);
  await page.waitForFunction(()=>window.__fashionRoot.getElementById('fashn-api-state').textContent.includes('Connected · 100 credits'));
  assert.match(await editor.locator('#fashn-api-state').innerText(),/Connected · 100 credits/);
  assert.equal(calls.filter(c=>c.path==='/api/fashion/balance').length,1);
  await editor.locator('#check-fashn').click();
  await page.waitForFunction(()=>window.__fashionRoot.querySelector('#fashn-api-state').textContent.includes('100 credits'));
  assert.equal(calls.filter(c=>c.path==='/api/fashion/balance').length,2);
  assert.equal(await editor.locator('#model-select option').count(),3);
  assert.equal(await editor.locator('#model-select').inputValue(),'fashnmax','Purchased FASHN Max is selected by default.');
  assert.equal(await editor.locator('#fashnmax-options').isVisible(),true);
  assert.equal(await editor.locator('#fashn16-options').isVisible(),false);
  assert.match(await editor.locator('#fashion-title').innerText(),/replace outfit/i);
  assert.equal(await editor.locator('#editorial-reference').count(),0,'No unrelated fashion image masquerading as an output.');
  const icons=await page.evaluate(()=>{
    const document=window.__fashionRoot;
    const find=id=>{
      const svg=document.querySelector('#'+id+' svg.empty-art');
      if(!svg)return null;
      const style=getComputedStyle(svg);
      return {role:svg.getAttribute('aria-hidden'),width:parseFloat(style.width),
        height:parseFloat(style.height),opacity:parseFloat(style.opacity),
        strokeWidth:parseFloat(style.strokeWidth),radius:parseFloat(style.borderTopLeftRadius),
        paths:[...svg.querySelectorAll('path')].map(path=>path.getAttribute('d'))};
    };
    return {person:find('person-hint'),garment:find('garment-hint'),result:find('result-placeholder')};
  });
  for(const [kind,spec] of Object.entries(icons)){
    assert.ok(spec,'Missing ghost icon for '+kind);
    assert.equal(spec.role,'true',kind+' artwork must remain decorative for screen readers');
    assert.equal(spec.width,kind==='result'?100:62,kind+' retains its approved editorial icon width');
    assert.equal(spec.height,kind==='result'?118:72,kind+' retains its approved editorial icon height');
    assert.equal(spec.radius,0,kind+' icon should not have a circular medallion; only the large image boxes should be rounded');
    assert.equal(spec.opacity,kind==='result'?.24:.62,kind+' preserves the approved outline opacity in its current state');
    assert.ok(spec.strokeWidth<=1.4,kind+' icon must use a delicate stroke');
    assert.ok(spec.paths.length>=2,kind+' icon needs recognizable vector geometry');
  }
  assert.notDeepEqual(icons.person.paths,icons.garment.paths,'Person and garment need distinct fashion-specific artwork');
  assert.notDeepEqual(icons.garment.paths,icons.result.paths,'Result needs a distinct transformation/artwork frame');
  assert.equal(await editor.locator('#result-placeholder svg.empty-art-result rect[rx="8"]').count(),0,
    'Revert unintended icon rounding; the three large image boxes are the intended change');
  assert.equal(await editor.locator('.upload-icon').count(),0,'Generic oversized plus glyphs must be replaced');
  assert.match(await editor.locator('#person-hint').innerText(),/Portrait or full-body photo/);
  assert.match(await editor.locator('#garment-hint').innerText(),/Flat garment or outfit reference/);
  assert.equal(await editor.locator('#result-placeholder').isVisible(),false,'The approved empty composition hides the output placeholder');
  assert.equal(await editor.locator('.result-panel').isVisible(),false,'No output panel is shown before a real stored result is selected');
  assert.equal(await editor.locator('#result-image').getAttribute('src'),null,'The approved atmospheric photograph is never used as a generated result');
  const approvedEmpty=await page.screenshot({path:'test-results/pv-fashion-empty-desktop.png',fullPage:true,animations:'disabled',caret:'hide'});
  const loadedStyle=await page.evaluate(()=>{
    const style=window.__fashionRoot.querySelector('style'),text=style.textContent;
    const start=text.indexOf('/* Keep a real History result');
    const end=text.indexOf('\n:host{display:block}#content',start);
    if(start<0||end<=start)throw new Error('Loaded-state containment block or scoped host boundary missing');
    style.textContent=text.slice(0,start)+text.slice(end);
    return text;
  });
  const withoutLoadedFix=await page.screenshot({fullPage:true,animations:'disabled',caret:'hide'});
  await page.evaluate(text=>{window.__fashionRoot.querySelector('style').textContent=text;},loadedStyle);
  assert.ok(approvedEmpty.equals(withoutLoadedFix),'The loaded-result repair leaves every pixel of the approved empty composition unchanged');
  await editor.locator('#fashion-history .history-item').first().click();
  await page.waitForFunction(()=>!window.__fashionRoot.getElementById('result-image').hidden);
  assert.equal(await editor.locator('#result-stage').isVisible(),true,'Selecting History reveals the actual stored output');
  assert.equal(calls.some(c=>c.path==='/api/fashion/submit'),false,'Opening the stored output never generates');
  await page.evaluate(()=>window.scrollTo(0,0));
  const desktop=await page.evaluate(()=>{
    const document=window.__fashionRoot;
    const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width}};
    return{
      bodyWidth:window.document.documentElement.scrollWidth,viewportWidth:innerWidth,
      background:getComputedStyle(document.host).backgroundColor,
      foreground:getComputedStyle(document.host).color,
      headerBackground:getComputedStyle(window.document.getElementById('studio-header')).backgroundColor,
      photoBackground:getComputedStyle(document.querySelector('#person-slot')).backgroundColor,
      photoImage:getComputedStyle(document.querySelector('#person-slot')).backgroundImage,
      resultBackground:getComputedStyle(document.querySelector('#result-stage')).backgroundColor,
      dropdownBackground:getComputedStyle(document.querySelector('#model-select')).backgroundColor,
      markFilter:getComputedStyle(window.document.querySelector('#studio-header .brand')).filter,
      colorScheme:getComputedStyle(document.host).colorScheme,
      headerBottom:window.document.getElementById('studio-header').getBoundingClientRect().bottom,
      themeColor:window.document.querySelector('meta[name="theme-color"]')?.content||null,
      boxStyles:['#person-slot','#garment-slot','#result-stage'].map(selector=>{
        const style=getComputedStyle(document.querySelector(selector));
        return {radius:parseFloat(style.borderTopLeftRadius),overflow:style.overflow};
      }),
      quote:rect('#quote'),preview:rect('#result-stage'),person:rect('#person-slot'),
      garment:rect('#garment-slot'),controls:rect('.engine-section'),title:rect('#fashion-title')
    };
  });
  assert.ok(desktop.bodyWidth<=desktop.viewportWidth,'Desktop Fashion has no horizontal overflow.');
  assert.ok(desktop.quote.top>=desktop.controls.top&&desktop.quote.bottom<=desktop.controls.bottom,'Price action belongs to the visible Direction controls.');
  assert.equal(desktop.background,'rgb(16, 17, 20)','Fashion shares the Video Studio graphite background.');
  assert.equal(desktop.foreground,'rgb(241, 242, 245)','Fashion retains readable near-white text.');
  assert.equal(desktop.headerBackground,'rgba(12, 13, 12, 0.92)','Fashion header matches the Video Studio surface.');
  assert.equal(desktop.colorScheme,'dark','Dark native inputs and scrollbar match the Studio.');
  assert.equal(desktop.themeColor,'#101114','Browser chrome matches PV Lab Video.');
  assert.equal(desktop.markFilter,'none','PV Lab logo uses the same source colors as Video.');
  assert.equal(desktop.photoBackground,'rgba(0, 0, 0, 0)','The approved source well uses its photographic CSS layer.');
  assert.match(desktop.photoImage,/fashion-editorial-reference\.svg/,'The approved reference photograph remains in the source area only');
  assert.equal(desktop.resultBackground,'rgb(25, 26, 27)','Result well remains graphite.');
  assert.equal(desktop.dropdownBackground,'rgba(32, 33, 38, 0.867)','No white form fields remain.');
  assert.deepEqual(desktop.boxStyles,Array.from({length:3},()=>({radius:12,overflow:'hidden'})),
    'The actual Person, Garment and Result image boxes should have matching approved 12px rounded corners and clip media');
  assert.ok(Math.abs(desktop.title.top-desktop.headerBottom-32)<=1,'Fashion intro follows the single shared Studio header.');
  assert.ok(Math.abs(desktop.preview.bottom-desktop.preview.top-(Math.min(310,Math.max(228,900*.26))-68))<=1,'Stored output fills the approved result row after its unchanged 31px header and 37px actions');
  assert.ok(desktop.preview.width>500,'Result window is large enough for examining details.');
  assert.ok(desktop.person.width>=250&&desktop.garment.width>=250,'Both drop zones are large.');
  assert.ok(Math.abs(desktop.person.top-desktop.garment.top)<3,'Uploads are side by side.');
  assert.ok(desktop.preview.left>desktop.garment.right,'Result sits to the right of both upload zones.');
  assert.ok(desktop.person.top>desktop.title.bottom&&desktop.preview.top>desktop.title.bottom,'The editorial source and result follow the approved intro.');
  await page.screenshot({path:'test-results/pv-fashion-loaded-desktop.png',fullPage:true});
  assert.ok(desktop.controls.top>desktop.person.bottom,'Advanced controls stay below the work imagery: '+JSON.stringify(desktop));
  assert.ok(Math.abs(desktop.person.bottom-desktop.garment.bottom)<2&&Math.max(desktop.person.bottom,desktop.garment.bottom,desktop.preview.bottom)<desktop.controls.top,
    'The paired source wells and stored output must not overlap Direction controls: '+JSON.stringify(desktop));
  await editor.locator('#quote').scrollIntoViewIfNeeded();
  const action=await editor.locator('#quote').boundingBox();
  assert.ok(action.y>=0&&action.y+action.height<=900,'Normal page scrolling exposes the full Create action');
  await page.setViewportSize({width:1759,height:832});
  await page.evaluate(()=>window.scrollTo(0,0));
  const compactDeck=await page.evaluate(()=>{
    const document=window.__fashionRoot;
    const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom};};
    return {person:rect('#person-slot'),garment:rect('#garment-slot'),result:rect('#result-stage'),
      direction:rect('.engine-section'),create:rect('#quote'),viewport:innerHeight};
  });
  assert.ok(Math.abs(compactDeck.person.bottom-compactDeck.garment.bottom)<2&&Math.max(compactDeck.person.bottom,compactDeck.result.bottom)<compactDeck.direction.top,
    'Wide monitors retain paired sources and a stored output without overlapping Direction: '+JSON.stringify(compactDeck));
  assert.ok(compactDeck.direction.top>compactDeck.result.bottom &&
    compactDeck.create.bottom<=compactDeck.direction.bottom,
    '03 / Direction and Create stay together below the imagery at 1759 × 832 without moving the top bar.');
  await page.setViewportSize({width:1440,height:900});
  mkdirSync('test-results',{recursive:true});
  await page.screenshot({path:'test-results/pv-fashion-editorial-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await editor.locator('#person-hint svg.empty-art').isVisible(),true,'Person ghost image remains visible on mobile');
  assert.equal(await editor.locator('#garment-hint svg.empty-art').isVisible(),true,'Garment ghost image remains visible on mobile');
  assert.equal(await editor.locator('#result-placeholder svg.empty-art').isVisible(),false,'A selected real result replaces its decorative mobile placeholder');
  assert.equal(await editor.locator('#result-image').isVisible(),true,'The real stored output remains visible on mobile');
  const mobileBoxes=await editor.locator('#person-slot, #garment-slot, #result-stage').evaluateAll(items=>items.map(el=>({
    radius:parseFloat(getComputedStyle(el).borderTopLeftRadius),
    overflow:getComputedStyle(el).overflow
  })));
  assert.deepEqual(mobileBoxes,Array.from({length:3},()=>({radius:12,overflow:'hidden'})),
    'All three large image boxes keep their rounded corners and image clipping on mobile');
  const mobileIcons=await editor.locator('svg.empty-art').evaluateAll(items=>items.map(el=>
    parseFloat(getComputedStyle(el).borderTopLeftRadius)));
  assert.deepEqual(mobileIcons,[0,0,0],'Mobile ghost icons remain the original plain line drawings');
  await page.screenshot({path:'test-results/pv-fashion-ghost-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:900});
  await editor.locator('#model-select').selectOption('fashnmax');
  assert.equal(await editor.locator('#quote').isEnabled(),false);
  const png=fakePng;
  await editor.locator('#person-file').setInputFiles({name:'synthetic-person.png',mimeType:'image/png',buffer:png});
  await editor.locator('#garment-file').setInputFiles({name:'synthetic-jacket.png',mimeType:'image/png',buffer:png});
  assert.equal(await editor.locator('#person-hint').isVisible(),false,'Person ghost artwork disappears after upload');
  assert.equal(await editor.locator('#garment-hint').isVisible(),false,'Garment ghost artwork disappears after upload');
  assert.equal(await editor.locator('#person-preview').isVisible(),true);
  assert.equal(await editor.locator('#garment-preview').isVisible(),true);
  assert.equal(await editor.locator('#quote').isEnabled(),true);
  await editor.locator('#quote').click();
  await page.waitForFunction(()=>!window.__fashionRoot.querySelector('#quote-box').hidden);
  assert.match(await editor.locator('#quote-price').innerText(),/\$0\.15/);
  assert.match(await editor.locator('#quote-price').innerText(),/2 credits/);
  assert.equal(await editor.locator('#confirm').isEnabled(),true);
  assert.equal(calls.filter(c=>c.path==='/api/uploads').length,2);
  assert.equal(calls.filter(c=>c.path==='/api/fashion/quote').length,1);
  assert.equal(calls.some(c=>c.path==='/api/fashion/submit'),false,'Price review must not buy a generation.');
  await page.setViewportSize({width:390,height:844});
  const mobile=await page.evaluate(()=>{
    const document=window.__fashionRoot;
    const a=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{top:r.top,left:r.left,right:r.right,width:r.width}};
    return{bodyWidth:window.document.documentElement.scrollWidth,viewportWidth:innerWidth,person:a('#person-slot'),garment:a('#garment-slot'),preview:a('#result-stage'),controls:a('.engine-section')};
  });
  assert.ok(mobile.bodyWidth<=mobile.viewportWidth,'Mobile Fashion has no horizontal overflow.');
  assert.ok(Math.abs(mobile.person.top-mobile.garment.top)<3,'Mobile retains paired upload tiles.');
  assert.ok(mobile.preview.top<mobile.controls.top&&mobile.preview.top>mobile.person.top,'With a stored output, the approved mobile order is sources, result, Direction.');
  const mobileGallery=await page.evaluate(()=>{
    const document=window.__fashionRoot;
    const g=document.getElementById('fashion-gallery').getBoundingClientRect(), 
          controls=document.querySelector('.engine-section').getBoundingClientRect(),
          result=document.querySelector('.result-panel').getBoundingClientRect();
    return {top:g.top,width:g.width,controlsEnd:controls.bottom,resultEnd:result.bottom,
      cols:getComputedStyle(document.getElementById('fashion-history')).gridTemplateColumns.split(' ').length};
  });
  assert.ok(mobileGallery.top>=Math.max(mobileGallery.resultEnd,mobileGallery.controlsEnd),
    'Mobile gallery appears after the result preview, without overlapping the editor');
  assert.equal(mobileGallery.cols,2,'Mobile Fashion uses two readable image columns');
  assert.equal(await editor.locator('#quote-box').isVisible(),true);
  assert.equal(await editor.locator('#result-stage').isVisible(),true);
  await page.screenshot({path:'test-results/pv-fashion-editorial-mobile.png',fullPage:true});
  // Opening a completed generation places the actual stored image in the
  // Result panel. It must not trigger an additional paid generation.
  await page.setViewportSize({width:1440,height:900});
  await editor.locator('#fashion-history .history-item').first().click();
  await page.waitForFunction(()=>!window.__fashionRoot.getElementById('result-image').hidden);
  assert.equal(await editor.locator('#result-image').isVisible(),true,'Clicking a gallery thumbnail opens the image result');
  assert.equal(await editor.locator('#download').isVisible(),true);
  assert.equal(await editor.locator('#fashion-history [aria-pressed="true"]').count(),1);
  assert.ok(calls.some(c=>c.path.startsWith('/api/assets/')&&c.method==='GET'),'Private asset fetch is used for gallery previews');
  assert.equal(calls.some(c=>c.path==='/api/fashion/submit'),false,'Gallery viewing must never submit a paid job');
  // The fetched HTML remains an inert complete template; the real mount removes
  // its footer and standalone header without replacing the form/controller.
  const embedded=await page.evaluate(async()=>{
    const host=document.getElementById('fashion-studio');
    const template=new DOMParser().parseFromString(await (await fetch('./fashion.html')).text(),'text/html');
    return {
      templateFooters:template.querySelectorAll('footer.pv-lab-footer').length,
      nestedFooters:host.shadowRoot.querySelectorAll('footer.pv-lab-footer').length,
      globalFooters:document.querySelectorAll('footer.pv-lab-footer').length,
      hasEditor:!!host.shadowRoot.querySelector('#fashion-form'),
      hasGallery:!!host.shadowRoot.querySelector('#fashion-history')
    };
  });
  assert.deepEqual(embedded,{templateFooters:1,nestedFooters:0,globalFooters:1,hasEditor:true,hasGallery:true},
    'The complete Fashion template mounts its editor and gallery while Studio owns the only footer');
  const retainedForm=await editor.locator('#fashion-form').elementHandle();
  await editor.locator('a[href*="studio.html?tool=image"]').click();
  await page.waitForFunction(()=>document.getElementById('tool-image').getAttribute('aria-pressed')==='true');
  await page.locator('#tool-fashion').click();
  await editor.locator('#workspace').waitFor({state:'visible'});
  assert.equal(await retainedForm.evaluate(el=>el.isConnected),true,'Returning through the real result link retains the original Fashion form');
  assert.equal(await editor.locator('#person-preview').isVisible(),true,'Private source survives tool navigation within the verified session');
  const writesBeforeLogout=calls.filter(c=>c.method!=='GET').length;
  await page.locator('.pv-account-menu>summary').click();
  await page.locator('#logout').click();
  await page.waitForFunction(()=>document.getElementById('app').dataset.guestPreview==='fashion');
  assert.equal(await editor.locator('#fashion-history .history-item').count(),0,'Logout removes private Fashion History');
  assert.equal(await editor.locator('#direction').inputValue(),'','Logout clears the private direction');
  assert.equal(await editor.locator('#person-preview').getAttribute('src'),null,'Logout releases the private person image');
  assert.equal(await editor.locator('#garment-preview').getAttribute('src'),null,'Logout releases the private garment image');
  await editor.locator('#quote').click();
  assert.equal(await page.evaluate(()=>window.__fashionSignins),1,'Guest Create requests authentication');
  assert.equal(calls.filter(c=>c.method!=='GET').length,writesBeforeLogout,'Guest Create performs no paid or upload request');
  assert.deepEqual(errors,[]);
  console.log('PASS canonical Fashion loader, shared masthead, editorial desktop/mobile, private History, quotes without submission and safe logout.');
}finally{
  await browser.close();await new Promise(ok=>server.close(ok));
}
