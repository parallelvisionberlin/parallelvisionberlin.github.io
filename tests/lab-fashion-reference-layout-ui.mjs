// Actual Studio + Fashion shadow root; synthetic accounts and intercepted APIs only.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,statSync,mkdirSync} from 'node:fs';
import {resolve,relative,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+decodeURIComponent(pathname));
  if(relative(root,file).startsWith('..')||!existsSync(file)||!statSync(file).isFile())return res.writeHead(404).end();
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.avif':'image/avif'})[extname(file)]||'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.PV_CHROMIUM_EXECUTABLE||undefined});
mkdirSync('test-results',{recursive:true});
const image=readFileSync('lab/visuals/fashion-replace/garment.webp');
const account=`
const listeners=[];
const signed=window.__fashionRole!=='guest';
const account={isSignedIn:signed,user:signed?{id:'user_FashionTest',firstName:'Synthetic'}:null,
 session:signed?{id:'sess_FashionTest',getToken:async()=> 'synthetic-token'}:null,
 addListener:fn=>listeners.push(fn),openSignIn:()=>{window.__fashionSignins=(window.__fashionSignins||0)+1;},
 signOut:async()=>{account.isSignedIn=false;account.user=null;account.session=null;for(const fn of listeners)fn();}};
export const isNativeLab=()=>false;
export const loadLabAccount=async()=>account;
`;
const sourceIds=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
const job={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',status:'completed',outputId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',createdAt:Date.now(),settings:{type:'image',mode:'fashion',fashionModel:'fashnmax'}};
const quoteId='33333333-3333-4333-8333-333333333333';
try{
 for(const role of ['owner','customer','guest']){
  const context=await browser.newContext({viewport:{width:1672,height:941},reducedMotion:'reduce'});
  await context.addInitScript(role=>{window.__fashionRole=role;},role);
  await context.route('**/native-account.js*',route=>route.fulfill({contentType:'text/javascript',body:account}));
  const page=await context.newPage(),errors=[],calls=[];
  let uploads=0,submits=0;
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://**/*',async route=>{
   const req=route.request(),url=new URL(req.url()),path=url.pathname;
   if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev')return route.abort();
   calls.push({path,method:req.method(),body:req.postData()});
   if(path.startsWith('/api/assets/'))return route.fulfill({contentType:'image/webp',body:image});
   const data=path==='/api/session'?{owner:role==='owner',customer:role==='customer',generationReady:true,billingReady:true,balanceCredits:500,
     config:{enabled:true,customer:role==='customer',falEnabled:true,videoEngines:['seedance','wan'],upscaleEnabled:true}}:
    path==='/api/fashion/models'?{models:['fashnmax','fashn16','fluxvto'].map(id=>({id,available:true}))}:
    path==='/api/fashion/balance'?{connected:true,credits:{total:100,onDemand:100,subscription:0}}:
    path==='/api/jobs'?{jobs:[job],next:null}:
    path==='/api/uploads'?{id:sourceIds[uploads++]}:
    path==='/api/fashion/quote'?{id:quoteId,estimatedUsd:.15,creditCost:20,expiresAt:Date.now()+600000,notice:'Confirm one generation.'}:
    path==='/api/fashion/submit'?(submits++,{job}):{items:[],jobs:[],packs:[],boards:[],models:[]};
   return route.fulfill({status:path==='/api/uploads'?201:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto(base+'/lab/studio.html?tool=fashion');
  const fashion=page.locator('#fashion-studio');
  await fashion.locator('#fashion-form').waitFor({state:'visible'});
  await page.evaluate(()=>document.fonts.ready);
  const headerBefore=await page.locator('#studio-header').evaluate(el=>({html:el.innerHTML,height:el.getBoundingClientRect().height}));
  for(const [width,height] of [[1672,900],[1672,941],[1440,900],[1024,768],[800,900],[390,844],[320,740]]){
   await page.setViewportSize({width,height});
   const layout=await fashion.evaluate(host=>{
    const root=host.shadowRoot,rect=s=>{const r=root.querySelector(s).getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
    return {overflow:document.documentElement.scrollWidth>innerWidth,title:rect('#fashion-title'),person:rect('#person-slot'),garment:rect('#garment-slot'),controls:rect('.engine-section'),
     fields:['#model-select',...(root.querySelector('#fashnmax-options').hidden?[]:['#max-resolution','#max-mode']),'#direction','#quote'].map(rect),
     photos:[...root.querySelectorAll('.slot-example,.fashion-backdrop img')].map(img=>({loaded:img.complete&&img.naturalWidth>0,src:img.getAttribute('src')})),
     resultVisible:root.querySelector('#result-stage').getBoundingClientRect().width>0};
   });
   assert.equal(layout.overflow,false,role+' no overflow at '+width);
   assert.equal(layout.photos.length,3);
   assert.ok(layout.photos.every(x=>x.loaded&&!x.src.includes('reference.svg')),role+' clean photographs load');
   assert.ok(Math.abs(layout.person.top-layout.garment.top)<1,'Paired uploads at '+width);
   assert.equal(layout.resultVisible,false,'No decorative photo is presented as a generated result');
   if(width>800){
    assert.ok(layout.person.width<width*.22,'Compact left cards');
    assert.ok(layout.person.height<=height*.4,'Reduced reference card height');
    assert.ok(Math.max(...layout.fields.map(x=>x.top))-Math.min(...layout.fields.map(x=>x.top))<2,'All controls occupy one desktop row');
    assert.ok(layout.controls.height<125,'Compact desktop control bar');
    assert.ok(layout.controls.bottom<=height,'Controls fit first desktop viewport');
    if(width===1672&&height===900){
     assert.ok(layout.person.height<=351,'1672 x 900 cards stay at the reviewed compact height');
     assert.ok(layout.controls.bottom<=height-8,'Runway dock stays inside the first desktop viewport');
     assert.ok(layout.fields[1].width>=85,'Runway dock: resolution remains usable');
     assert.ok(layout.fields[2].width>=100,'Runway dock: quality selector remains usable');
    }
   }
   if(role==='owner')await page.screenshot({path:'test-results/fashion-reference-'+width+'.png',fullPage:true});
  }
  await page.setViewportSize({width:1440,height:900});
  // Real Runway direction remains a Fashion control, not a decorative mockup.
  const design=await fashion.evaluate(host=>{
    const root=host.shadowRoot,hero=root.querySelector('.fashion-backdrop img');
    const src=root.querySelector('#person-file');
    const cards=[...root.querySelectorAll('#looks-scroller .look-card')];
    return {
      title:root.querySelector('#fashion-title').textContent,
      cards:cards.map(card=>({id:card.dataset.look,label:card.textContent.trim()})),
      plus:getComputedStyle(root.querySelector('#person-hint .slot-plus'),':after').content,
      photoOpacity:getComputedStyle(root.querySelector('.person-example')).opacity,
      heroFilter:getComputedStyle(hero).filter,
      actualUpload:src?.type,
      realResult:root.querySelector('#result-image').hidden
    };
  });
  assert.match(design.title,/Replace\s*outfit\./);
  assert.equal(design.cards.length,8,'Eight labeled editorial Looks are available');
  assert.deepEqual(new Set(design.cards.map(x=>x.id)).size,8,'No duplicate look options');
  assert.match(design.heroFilter,/brightness\(/,'Runway portrait is intentionally shadowed');
  assert.equal(design.actualUpload,'file','Original real upload is intact');
  assert.equal(design.realResult,true,'Examples never masquerade as generated results');
  await fashion.locator('[data-look="runway"]').click();
  assert.match(await fashion.locator('#direction').inputValue(),/High-fashion runway/,'Selected look modifies real prompt');
  assert.equal(await fashion.locator('[data-look="runway"]').getAttribute('aria-pressed'),'true');
  await fashion.locator('[data-look="runway"]').click();
  assert.equal(await fashion.locator('#direction').inputValue(),'','Toggling off restores a clean direction');
  assert.equal(calls.some(x=>x.path==='/api/fashion/quote'),false,'Looks alone cannot quote, upload or spend credits');
  assert.equal(await fashion.locator('#person-file').getAttribute('type'),'file');
  assert.equal(await fashion.locator('#person-file').inputValue(),'','Example photos are never upload values');
  const [picker]=await Promise.all([page.waitForEvent('filechooser'),fashion.locator('#person-slot').click()]);
  await picker.setFiles({name:'synthetic-person.webp',mimeType:'image/webp',buffer:image});
  // Drop onto the garment card uses the original production drop handler.
  await fashion.locator('#garment-slot').evaluate((slot,bytes)=>{
   const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(bytes)],'synthetic-garment.webp',{type:'image/webp'}));
   slot.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  },[...image]);
  assert.equal(await fashion.locator('#person-preview').isVisible(),true);
  assert.equal(await fashion.locator('#garment-preview').isVisible(),true);
  assert.equal(await fashion.locator('#person-hint').isVisible(),false);
  assert.equal(await fashion.locator('#garment-hint').isVisible(),false);
  if(role==='guest'){
   assert.equal(calls.length,0,'Guest previews make no private API requests');
   await fashion.locator('#quote').click();
   assert.equal(await page.evaluate(()=>window.__fashionSignins),1);
   assert.equal(calls.length,0,'Guest action requests account access before uploads or quotes');
   await context.close();continue;
  }
  assert.equal(await fashion.locator('#model-select option').count(),3);
  for(const model of ['fashnmax','fashn16','fluxvto']){
   await fashion.locator('#model-select').selectOption(model);
   await page.setViewportSize({width:390,height:844});
   const alignment=await fashion.evaluate(host=>{
    const root=host.shadowRoot,a=root.querySelector('#quote').getBoundingClientRect(),b=root.querySelector('.fashion-details summary').getBoundingClientRect();
    return {delta:Math.abs(a.bottom-b.bottom),overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.ok(alignment.delta<2,model+' mobile settings button follows the action row');
   assert.equal(alignment.overflow,false,model+' mobile controls have no overflow');
  }
  await page.setViewportSize({width:1440,height:900});
  await fashion.locator('#model-select').selectOption('fashn16');
  assert.equal(await fashion.locator('[data-look="runway"]').isDisabled(),true,'v1.6 cannot use styling prompts');
  assert.equal(await fashion.locator('#fashn16-options').isVisible(),true);
  assert.equal(await fashion.locator('#fashnmax-options').isVisible(),false);
  await page.setViewportSize({width:1900,height:900});
  await page.waitForFunction(()=>document.querySelector('#fashion-studio').shadowRoot.querySelector('#quote').textContent==='Generate · 20 credits');
  await fashion.locator('#fashn16-category').focus();
  const focusStyle=await fashion.locator('#fashn16-category').evaluate(el=>{
   const style=getComputedStyle(el);return{border:style.borderWidth,outline:style.outlineStyle,shadow:style.boxShadow};
  });
  assert.deepEqual(focusStyle,{border:'1px',outline:'none',shadow:'none'},'Focused selectors use a single border');
  if(role==='owner')await page.screenshot({path:'test-results/fashion-minimal-single-focus-desktop.png',fullPage:true});

  await fashion.locator('#model-select').selectOption('fluxvto');
  assert.equal(await fashion.locator('#quote').isEnabled(),false,'FLUX retains required direction');
  await fashion.locator('#direction').fill('Keep the silhouette.');
  await fashion.locator('#quote').waitFor({state:'visible'});
  await fashion.locator('#model-select').selectOption('fashnmax');
  await fashion.locator('#max-resolution').selectOption('2k');
  await fashion.locator('#max-mode').selectOption('quality');
  await page.waitForFunction(()=>document.querySelector('#fashion-studio').shadowRoot.querySelector('#quote').textContent==='Generate · 20 credits');
  assert.equal(await fashion.locator('#quote').isEnabled(),true);
  assert.equal(uploads,2);
  assert.equal(submits,0,'Review price does not generate');
  assert.equal(await fashion.locator('#quote').innerText(),'Generate · 20 credits');
  assert.equal(await fashion.locator('#quote-box').count(),0);
  for(const width of [1900,1440,1024,390,320]){
   await page.setViewportSize({width,height:900});
   const action=await fashion.locator('#quote').evaluate(el=>({font:getComputedStyle(el).fontSize,arrow:getComputedStyle(el,':after').content,fits:el.scrollWidth<=el.clientWidth}));
   assert.equal(action.fits,true,'The complete credit label fits at '+width+'px');
   assert.equal(action.arrow,'none','Generate matches Image with text only');
   assert.equal(action.font,width===1024?'12px':'15px');
  }

  const settings=JSON.parse(calls.filter(x=>x.path==='/api/fashion/quote').at(-1).body);
  assert.deepEqual([settings.model,settings.resolution,settings.generationMode,settings.prompt],['fashnmax','2k','quality','Keep the silhouette.']);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await fashion.locator('#quote').isVisible(),true,'Priced Generate is accessible on mobile');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(role==='owner'){
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   await page.screenshot({path:'test-results/fashion-reference-quote-mobile.png',fullPage:true});
  }
  await fashion.locator('#quote').evaluate(button=>{button.click();button.click();});
  await fashion.locator('#result-image').waitFor({state:'visible'});
  assert.equal(submits,1,'Double-clicking priced Generate submits exactly once');
  assert.deepEqual(JSON.parse(calls.find(x=>x.path==='/api/fashion/submit').body),{quoteId,confirm:true});
  assert.equal(await fashion.locator('#download').isVisible(),true);
  assert.ok(await fashion.locator('#fashion-history .history-item').count()>0);
  await fashion.locator('#fashion-history .history-item').first().click();
  assert.equal(submits,1,'History opens an existing result without generation');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:'test-results/fashion-reference-'+role+'-result-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:900});
  await fashion.locator('.fashion-details summary').click();
  assert.equal(await fashion.locator('#check-fashn').isVisible(),true,'API controls retained in disclosure');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:'test-results/fashion-reference-'+role+'-result-desktop.png',fullPage:true});
  const headerAfter=await page.locator('#studio-header').evaluate(el=>({html:el.innerHTML,height:el.getBoundingClientRect().height}));
  assert.deepEqual(headerAfter,headerBefore,'Shared header remains unchanged during Fashion operations');
  await fashion.locator('.result-actions a[href*="studio.html?tool=image"]').click();
  await page.waitForURL('**tool=image');
  await page.locator('#image-composer').waitFor({state:'visible'});
  assert.equal(submits,1,'Returning from an archived result cannot submit another generation');
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS '+role+': layout, uploads/drop, models, quote, bound confirmation, result and History');
 }
 console.log('PASS Fashion reference layout: desktop/mobile/guest; no live generation or production changes.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
