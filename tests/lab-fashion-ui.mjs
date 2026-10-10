// Mock-only browser regression of PV Lab Fashion. No live providers or paid generations.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const playwrightPath=process.env.PV_PLAYWRIGHT_MODULE;
assert.ok(playwrightPath,'Install Playwright and set PV_PLAYWRIGHT_MODULE.');
const {chromium}=await import(pathToFileURL(playwrightPath).href);
const root=resolve('.');
const source=readFileSync('lab/fashion.js','utf8');
const autoStart="if(document.getElementById('fashion-form'))createFashionStudio();";
assert.ok(source.includes(autoStart),'Expected current Fashion studio startup marker.');
// Keep the whole production module intact and inject the synthetic owner via the
// supported studio factory. Cutting the older inline Clerk bootstrap leaves an
// unterminated module after the studio was refactored to createFashionStudio().
const testSource=source.replace(autoStart,
  "if(document.getElementById('fashion-form')){"+
  "const studio=createFashionStudio(document,{sessionClient:{isSignedIn:true,user:{id:'synthetic-owner'},session:{id:'mock-session',getToken:async()=> 'mock.jwt.token'},signOut:async()=>{}}});"+
  "studio.ready.then(()=>{window.__fashionTestReady=true;}).catch(e=>{window.__fashionTestError=String(e);});"+
  "}");
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),path=resolve(root,'.'+url.pathname);
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');
  res.end(url.pathname==='/lab/fashion.js'?testSource:readFileSync(path));
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const port=server.address().port,browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
const page=await context.newPage(),errors=[],calls=[];
const imageIds=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
let uploaded=0;
const fakePng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xfy8AAAAASUVORK5CYII=','base64');
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
  if(path.startsWith('/api/assets/')&&request.method()==='GET'){
    return route.fulfill({status:200,contentType:'image/png',body:fakePng});
  }
  const data=path==='/api/session'?{owner:true,config:{enabled:true}}:
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
    {error:'Unexpected test request '+path};
  if(data.error)throw new Error(data.error);
  return route.fulfill({status:path==='/api/uploads'?201:200,contentType:'application/json',body:JSON.stringify(data)});
});
try{
  await page.goto('http://127.0.0.1:'+port+'/lab/fashion.html',{waitUntil:'domcontentloaded'});
  try{
    await page.waitForFunction(()=>window.__fashionTestReady===true,null,{timeout:15000});
  }catch(e){
    const debug=await page.evaluate(()=>({
      authStatus:document.getElementById('auth-status')?.textContent,
      startupError:window.__fashionTestError||null,
      htmlLoaded:!!document.getElementById('fashion-form')
    })).catch(()=>({}));
    throw new Error('Fashion mock session did not initialize: '+JSON.stringify({debug,pageErrors:errors,apiCalls:calls})+'; '+e.message);
  }
  assert.equal(await page.locator('#workspace').isVisible(),true);
  assert.equal(await page.locator('#gate').isVisible(),false);
  // The Fashion gallery lives below the editor and receives real private image
  // blobs; mixed image/video job types must not leak into this view.
  await page.waitForFunction(()=>document.querySelectorAll('#fashion-history .history-item').length===5);
  assert.equal(await page.locator('#fashion-history .history-item').count(),5);
  assert.equal(await page.locator('#fashion-more').isVisible(),false,'Exhausted gallery needs no extra paging control');
  assert.equal(await page.locator('#fashion-gallery-count').innerText(),'5 shown');
  assert.equal(await page.locator('#fashion-history .history-status-detail').count(),1,
    'Failed jobs should show a brief diagnostic, not a long scrollable text log');
  assert.equal(await page.locator('#fashion-history .history-state[data-status="failed"]').count(),1);
  assert.equal(await page.locator('#fashion-history .history-state[data-status="queued"]').count(),1);
  await page.waitForFunction(()=>document.querySelectorAll('#fashion-history .history-media img').length===3);
  assert.equal(await page.locator('#fashion-history .history-media img').count(),3,
    'Completed Fashion jobs render image thumbnails from the private asset endpoint');
  assert.equal(await page.locator('.recent-work').count(),0,'Remove the old right-column micro archive');
  const galleryLayout=await page.evaluate(()=>{
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
  assert.equal(await page.locator('#fashion-history button[aria-pressed="true"]').count(),0);
  assert.match(await page.locator('#fashn-api-state').innerText(),/Connected · 100 credits/);
  assert.equal(calls.filter(c=>c.path==='/api/fashion/balance').length,1);
  await page.locator('#check-fashn').click();
  await page.waitForFunction(()=>document.querySelector('#fashn-api-state').textContent.includes('100 credits'));
  assert.equal(calls.filter(c=>c.path==='/api/fashion/balance').length,2);
  assert.equal(await page.locator('#model-select option').count(),3);
  assert.equal(await page.locator('#model-select').inputValue(),'fashnmax','Purchased FASHN Max is selected by default.');
  assert.equal(await page.locator('#fashnmax-options').isVisible(),true);
  assert.equal(await page.locator('#fashn16-options').isVisible(),false);
  assert.match(await page.locator('#fashion-title').innerText(),/replace outfit/i);
  assert.equal(await page.locator('#editorial-reference').count(),0,'No unrelated fashion image masquerading as an output.');
  const icons=await page.evaluate(()=>{
    const find=id=>{
      const svg=document.querySelector('#'+id+' svg.empty-art');
      if(!svg)return null;
      const style=getComputedStyle(svg);
      return {role:svg.getAttribute('aria-hidden'),width:svg.getBoundingClientRect().width,
        height:svg.getBoundingClientRect().height,opacity:parseFloat(style.opacity),
        strokeWidth:parseFloat(style.strokeWidth),radius:parseFloat(style.borderTopLeftRadius),
        paths:[...svg.querySelectorAll('path')].map(path=>path.getAttribute('d'))};
    };
    return {person:find('person-hint'),garment:find('garment-hint'),result:find('result-placeholder')};
  });
  for(const [kind,spec] of Object.entries(icons)){
    assert.ok(spec,'Missing ghost icon for '+kind);
    assert.equal(spec.role,'true',kind+' artwork must remain decorative for screen readers');
    assert.ok(spec.width>=70,kind+' ghost icon needs a visible editorial footprint');
    assert.equal(spec.radius,0,kind+' icon should not have a circular medallion; only the large image boxes should be rounded');
    assert.ok(spec.opacity>=.18&&spec.opacity<=.32,kind+' icon must remain a low-opacity outline');
    assert.ok(spec.strokeWidth<=1.4,kind+' icon must use a delicate stroke');
    assert.ok(spec.paths.length>=2,kind+' icon needs recognizable vector geometry');
  }
  assert.notDeepEqual(icons.person.paths,icons.garment.paths,'Person and garment need distinct fashion-specific artwork');
  assert.notDeepEqual(icons.garment.paths,icons.result.paths,'Result needs a distinct transformation/artwork frame');
  assert.equal(await page.locator('#result-placeholder svg.empty-art-result rect[rx="8"]').count(),0,
    'Revert unintended icon rounding; the three large image boxes are the intended change');
  assert.equal(await page.locator('.upload-icon').count(),0,'Generic oversized plus glyphs must be replaced');
  assert.match(await page.locator('#person-hint').innerText(),/Portrait or full-body photo/);
  assert.match(await page.locator('#garment-hint').innerText(),/Flat garment or outfit reference/);
  assert.equal(await page.locator('#result-placeholder').isVisible(),true,'Empty result prompt stays visible before rendering');
  const desktop=await page.evaluate(()=>{
    const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width}};
    return{
      bodyWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,
      background:getComputedStyle(document.body).backgroundColor,
      foreground:getComputedStyle(document.body).color,
      headerBackground:getComputedStyle(document.querySelector('.site-header')).backgroundColor,
      photoBackground:getComputedStyle(document.querySelector('#person-slot')).backgroundColor,
      resultBackground:getComputedStyle(document.querySelector('#result-stage')).backgroundColor,
      dropdownBackground:getComputedStyle(document.querySelector('#model-select')).backgroundColor,
      markFilter:getComputedStyle(document.querySelector('.wordmark img')).filter,
      colorScheme:getComputedStyle(document.documentElement).colorScheme,
      themeColor:document.querySelector('meta[name="theme-color"]').content,
      boxStyles:['#person-slot','#garment-slot','#result-stage'].map(selector=>{
        const style=getComputedStyle(document.querySelector(selector));
        return {radius:parseFloat(style.borderTopLeftRadius),overflow:style.overflow};
      }),
      quote:rect('#quote'),preview:rect('#result-stage'),person:rect('#person-slot'),
      garment:rect('#garment-slot'),controls:rect('.engine-section'),title:rect('#fashion-title')
    };
  });
  assert.ok(desktop.bodyWidth<=desktop.viewportWidth,'Desktop Fashion has no horizontal overflow.');
  assert.ok(desktop.quote.top<900,'Price action starts within the desktop viewport.');
  assert.equal(desktop.background,'rgb(16, 17, 20)','Fashion shares the Video Studio graphite background.');
  assert.equal(desktop.foreground,'rgb(241, 242, 245)','Fashion retains readable near-white text.');
  assert.equal(desktop.headerBackground,'rgba(18, 19, 21, 0.96)','Fashion header matches the Video Studio surface.');
  assert.equal(desktop.colorScheme,'dark','Dark native inputs and scrollbar match the Studio.');
  assert.equal(desktop.themeColor,'#101114','Browser chrome matches PV Lab Video.');
  assert.equal(desktop.markFilter,'none','PV Lab logo uses the same source colors as Video.');
  assert.equal(desktop.photoBackground,'rgb(25, 26, 27)','Upload image wells remain graphite.');
  assert.equal(desktop.resultBackground,'rgb(25, 26, 27)','Result well remains graphite.');
  assert.equal(desktop.dropdownBackground,'rgb(26, 28, 33)','No white form fields remain.');
  assert.deepEqual(desktop.boxStyles,Array.from({length:3},()=>({radius:14,overflow:'hidden'})),
    'The actual Person, Garment and Result image boxes should have matching 14px rounded corners and clip media');
  assert.ok(desktop.title.top<125,'Fashion header does not push the work area down.');
  assert.ok(desktop.preview.width>500,'Result window is large enough for examining details.');
  assert.ok(desktop.person.width>=250&&desktop.garment.width>=250,'Both drop zones are large.');
  assert.ok(Math.abs(desktop.person.top-desktop.garment.top)<3,'Uploads are side by side.');
  assert.ok(desktop.preview.left>desktop.garment.right,'Result sits to the right of both upload zones.');
  assert.ok(desktop.person.top<200&&desktop.preview.top<200,'Image work starts near the top.');
  assert.ok(desktop.controls.top>desktop.person.bottom,'Advanced controls stay below the work imagery.');
  assert.ok(Math.abs(desktop.preview.bottom-desktop.person.bottom)<2 &&
    Math.abs(desktop.preview.bottom-desktop.garment.bottom)<2,
    'Person, Garment, and Result photo wells finish on the same horizontal line.');
  assert.ok(desktop.quote.bottom<900,'Full direction and Create controls fit the desktop working deck.');
  await page.setViewportSize({width:1759,height:832});
  const compactDeck=await page.evaluate(()=>{
    const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom};};
    return {person:rect('#person-slot'),garment:rect('#garment-slot'),result:rect('#result-stage'),
      direction:rect('.engine-section'),create:rect('#quote'),viewport:innerHeight};
  });
  assert.ok(Math.abs(compactDeck.person.bottom-compactDeck.garment.bottom)<2 &&
    Math.abs(compactDeck.person.bottom-compactDeck.result.bottom)<2,
    'Fashion deck keeps the three working images vertically aligned on wide monitors.');
  assert.ok(compactDeck.direction.top>compactDeck.result.bottom &&
    compactDeck.create.bottom<compactDeck.viewport,
    '03 / Direction and Create stay visible at 1759 × 832 without moving the top bar.');
  await page.setViewportSize({width:1440,height:900});
  mkdirSync('test-results',{recursive:true});
  await page.screenshot({path:'test-results/pv-fashion-editorial-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('#person-hint svg.empty-art').isVisible(),true,'Person ghost image remains visible on mobile');
  assert.equal(await page.locator('#garment-hint svg.empty-art').isVisible(),true,'Garment ghost image remains visible on mobile');
  assert.equal(await page.locator('#result-placeholder svg.empty-art').isVisible(),true,'Result icon remains visible on mobile');
  const mobileBoxes=await page.locator('#person-slot, #garment-slot, #result-stage').evaluateAll(items=>items.map(el=>({
    radius:parseFloat(getComputedStyle(el).borderTopLeftRadius),
    overflow:getComputedStyle(el).overflow
  })));
  assert.deepEqual(mobileBoxes,Array.from({length:3},()=>({radius:14,overflow:'hidden'})),
    'All three large image boxes keep their rounded corners and image clipping on mobile');
  const mobileIcons=await page.locator('svg.empty-art').evaluateAll(items=>items.map(el=>
    parseFloat(getComputedStyle(el).borderTopLeftRadius)));
  assert.deepEqual(mobileIcons,[0,0,0],'Mobile ghost icons remain the original plain line drawings');
  await page.screenshot({path:'test-results/pv-fashion-ghost-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:900});
  await page.locator('#model-select').selectOption('fashnmax');
  assert.equal(await page.locator('#quote').isEnabled(),false);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xfy8AAAAASUVORK5CYII=','base64');
  await page.setInputFiles('#person-file',{name:'synthetic-person.png',mimeType:'image/png',buffer:png});
  await page.setInputFiles('#garment-file',{name:'synthetic-jacket.png',mimeType:'image/png',buffer:png});
  assert.equal(await page.locator('#person-hint').isVisible(),false,'Person ghost artwork disappears after upload');
  assert.equal(await page.locator('#garment-hint').isVisible(),false,'Garment ghost artwork disappears after upload');
  assert.equal(await page.locator('#person-preview').isVisible(),true);
  assert.equal(await page.locator('#garment-preview').isVisible(),true);
  assert.equal(await page.locator('#quote').isEnabled(),true);
  await page.locator('#quote').click();
  await page.waitForFunction(()=>!document.querySelector('#quote-box').hidden);
  assert.match(await page.locator('#quote-price').innerText(),/\$0\.15/);
  assert.match(await page.locator('#quote-price').innerText(),/2 credits/);
  assert.equal(await page.locator('#confirm').isEnabled(),true);
  assert.equal(calls.filter(c=>c.path==='/api/uploads').length,2);
  assert.equal(calls.filter(c=>c.path==='/api/fashion/quote').length,1);
  assert.equal(calls.some(c=>c.path==='/api/fashion/submit'),false,'Price review must not buy a generation.');
  await page.setViewportSize({width:390,height:844});
  const mobile=await page.evaluate(()=>{
    const a=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{top:r.top,left:r.left,right:r.right,width:r.width}};
    return{bodyWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,person:a('#person-slot'),garment:a('#garment-slot'),preview:a('#result-stage'),controls:a('.engine-section')};
  });
  assert.ok(mobile.bodyWidth<=mobile.viewportWidth,'Mobile Fashion has no horizontal overflow.');
  assert.ok(Math.abs(mobile.person.top-mobile.garment.top)<3,'Mobile retains paired upload tiles.');
  assert.ok(mobile.preview.top>mobile.controls.top,'Mobile controls appear before the result.');
  const mobileGallery=await page.evaluate(()=>{
    const g=document.getElementById('fashion-gallery').getBoundingClientRect(), 
          controls=document.querySelector('.engine-section').getBoundingClientRect(),
          result=document.querySelector('.result-panel').getBoundingClientRect();
    return {top:g.top,width:g.width,controlsEnd:controls.bottom,resultEnd:result.bottom,
      cols:getComputedStyle(document.getElementById('fashion-history')).gridTemplateColumns.split(' ').length};
  });
  assert.ok(mobileGallery.top>=mobileGallery.resultEnd,
    'Mobile gallery appears after the result preview, without overlapping the editor');
  assert.equal(mobileGallery.cols,2,'Mobile Fashion uses two readable image columns');
  assert.equal(await page.locator('#quote-box').isVisible(),true);
  assert.equal(await page.locator('#result-stage').isVisible(),true);
  await page.screenshot({path:'test-results/pv-fashion-editorial-mobile.png',fullPage:true});
  // Opening a completed generation places the actual stored image in the
  // Result panel. It must not trigger an additional paid generation.
  await page.setViewportSize({width:1440,height:900});
  await page.locator('#fashion-history .history-item').first().click();
  await page.waitForFunction(()=>!document.getElementById('result-image').hidden);
  assert.equal(await page.locator('#result-image').isVisible(),true,'Clicking a gallery thumbnail opens the image result');
  assert.equal(await page.locator('#download').isVisible(),true);
  assert.equal(await page.locator('#fashion-history [aria-pressed="true"]').count(),1);
  assert.ok(calls.some(c=>c.path.startsWith('/api/assets/')&&c.method==='GET'),'Private asset fetch is used for gallery previews');
  assert.equal(calls.some(c=>c.path==='/api/fashion/submit'),false,'Gallery viewing must never submit a paid job');
  assert.deepEqual(errors,[]);
  console.log('PASS full-width Fashion thumbnail gallery below controls, responsive grid, pagination, real private previews, and no paid calls.');
}finally{
  await browser.close();await new Promise(ok=>server.close(ok));
}
