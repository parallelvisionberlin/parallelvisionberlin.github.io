// Synthetic accounts and intercepted APIs only. No provider or payment requests.
import assert from 'node:assert/strict';
import {beautyAutoRatio} from '../lab/beauty-settings.js';
import http from 'node:http';
import {readFileSync,existsSync,statSync,mkdirSync} from 'node:fs';
import {resolve,extname,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),photo=readFileSync('lab/visuals/beauty/beauty-veil-editorial.webp');
const account=`const listeners=[];const role=window.__beautyRole||'guest';const account={isSignedIn:role!=='guest',user:{id:'user_BeautyTest',firstName:'Beauty',lastName:'Test'},session:role==='guest'?null:{id:'sess_BeautyTest',getToken:async()=> 'synthetic-token'},addListener:fn=>listeners.push(fn),openSignIn:()=>{window.__signins=(window.__signins||0)+1},signOut:async()=>{account.isSignedIn=false;account.session=null;for(const fn of listeners)fn()}};window.__beautyAccount=account;export const loadLabAccount=async()=>account;`;
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+decodeURIComponent(pathname));
 if(relative(root,path).startsWith('..')||!existsSync(path)||!statSync(path).isFile())return res.writeHead(404).end();
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.avif':'image/avif'})[extname(path)]||'application/octet-stream');
 res.end(pathname==='/lab/native-account.js'?account:readFileSync(path));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,executablePath:process.env.PV_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
mkdirSync('test-results',{recursive:true});
async function scenario({role='customer',width=1448,height=1086,malformed=false,delayed=false,submitFailure=false,motion='reduce'}={}){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<=390,reducedMotion:motion}),page=await context.newPage();
 page.setDefaultTimeout(10000);
 await context.addInitScript(value=>{window.__beautyRole=value},role);
 const calls=[],quotes=[],jobs=[],errors=[],sources=new Map(),missingSources=new Set();let submits=0,uploads=0,delayOldResult=false;
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev')return route.abort();
  // Public homepage currency/traffic calls are not private Studio requests.
  // Only these exact endpoints/methods are mocked; every other Worker call
  // still requires the synthetic token and is counted for guest isolation.
  if(url.pathname==='/api/public/local-currency'&&request.method()==='GET'){
   assert.equal(request.headers().authorization,undefined,'Public currency must not carry private credentials');
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({currency:'EUR',rate:1,approximate:true,locale:'de-DE'})});
  }
  if(url.pathname==='/api/public/traffic'&&request.method()==='POST'){
   assert.equal(request.headers().authorization,undefined,'Public traffic must not carry private credentials');
   return route.fulfill({status:204,body:''});
  }
  calls.push({path:url.pathname,method:request.method()});
  assert.equal(request.headers().authorization,'Bearer synthetic-token',request.method()+' '+url.pathname+' requires session authorization');
  let result={};
  if(url.pathname==='/api/session')result={owner:role==='owner',customer:role!=='owner',balanceCredits:500,generationReady:true,billingReady:true,config:{enabled:true}};
  else if(url.pathname==='/api/uploads'){uploads++;result={id:'photo-'+uploads};sources.set(result.id,{body:request.postDataBuffer(),contentType:request.headers()['content-type']});}
  else if(url.pathname==='/api/quotes'){
   const body=request.postDataJSON(),number=quotes.length+1;
   const quoted={id:'quote-'+number,creditCost:malformed?'23':number===1?23:31,expiresAt:Date.now()+240000,settings:{...body.settings,aspectRatio:body.settings.referenceMode==='references'&&body.settings.aspectRatio==='auto'?'16:9':body.settings.aspectRatio,referenceSourceIds:body.referenceSourceIds}};quotes.push(quoted);
   if(delayed&&number===1)await new Promise(done=>setTimeout(done,1100));result=quoted;
  }else if(url.pathname==='/api/jobs'&&request.method()==='POST'){
   submits++;const body=request.postDataJSON();assert.equal(body.confirm,true);const q=quotes.find(q=>q.id===body.quoteId);assert.ok(q);
   if(submitFailure)return route.abort('failed');
   const job={id:'job-'+submits,status:'completed',outputId:'output-'+submits,createdAt:Date.now(),settings:q.settings};jobs.unshift(job);result={job};
  }else if(url.pathname==='/api/jobs')result={jobs,activeJobs:[]};
  else if(url.pathname.startsWith('/api/assets/')){
   const id=url.pathname.split('/').pop();
   if(delayOldResult&&id==='photo-1')await new Promise(done=>setTimeout(done,1100));
   if(missingSources.has(id))return route.fulfill({status:404,contentType:'application/json',body:'{}'});
   return route.fulfill({status:200,...(sources.get(id)||{contentType:'image/webp',body:photo})});
  }
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 await page.goto(base+'/lab/beauty.html');await page.waitForFunction(()=>!!window.__beautyAccount);
 if(role!=='guest')await page.locator('#beauty-account').waitFor({state:'visible'});
 return {context,page,calls,quotes,jobs,errors,missingSources,delayOldResult:()=>{delayOldResult=true},get submits(){return submits},get uploads(){return uploads}};
}
const input={name:'portrait.webp',mimeType:'image/webp',buffer:photo};
async function testPhoto(page,width,height,colour){
 const data=await page.evaluate(({width,height,colour})=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle=colour;ctx.fillRect(0,0,width,height);return canvas.toDataURL('image/png').split(',')[1];},{width,height,colour});
 return {name:`source-${width}x${height}.png`,mimeType:'image/png',buffer:Buffer.from(data,'base64')};
}
try{
 for(const [width,height] of [[1920,900],[1440,800],[1366,768],[1280,720],[1024,768]]){
  const s=await scenario({role:'guest',width,height}),{page}=s;
  await page.evaluate(()=>document.fonts.ready);
  const layout=await page.evaluate(()=>{
   const bounds=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
   return {title:bounds('h1'),photo:bounds('.beauty-photo'),notes:bounds('#beauty-direction'),panel:bounds('.beauty-edit-panel'),ratio:bounds('#beauty-ratio'),button:bounds('#beauty-generate'),height:innerHeight,width:innerWidth,scrollWidth:document.documentElement.scrollWidth};
  });
  assert.ok(layout.button.bottom<=height-12,'Generate fits the first viewport at '+width+'x'+height+': '+JSON.stringify(layout));
  assert.ok(layout.button.top>=layout.panel.top+8&&layout.button.bottom<=layout.panel.bottom-5,'Generate remains inside the visible Edit Look panel at '+width+'x'+height+': '+JSON.stringify(layout));
  assert.ok(layout.ratio.bottom<=layout.photo.bottom-8,'Aspect ratio stays visible above the bottom of the hero at '+width+'x'+height+': '+JSON.stringify(layout));
  assert.ok(layout.notes.bottom+8<=layout.button.top,'Creative direction and Generate never overlap at '+width+'x'+height+': '+JSON.stringify(layout));
  assert.ok(layout.title.right+8<=layout.photo.left&&layout.photo.right+8<=layout.panel.left,'Approved layout keeps settings left, image centered and tools right');
  assert.ok(layout.panel.left>=0&&layout.panel.right<=width&&layout.scrollWidth<=width,'Workspace fits horizontally');

  // The finished composition must be visibly different from the old boxed layout
  // while keeping the exact approved image and full-size editing controls.
  const editorial=await page.evaluate(()=>{
   const grid=document.querySelector('.beauty-editor-grid');
   const pseudo=getComputedStyle(grid,'::before');
   const panel=document.querySelector('.beauty-edit-panel').getBoundingClientRect();
   const cards=[...document.querySelectorAll('.beauty-looks-list [data-look]')];
   const track=document.querySelector('.beauty-looks-list').getBoundingClientRect();
   const previews=[...document.querySelectorAll('.beauty-preset-group:not([hidden]) .beauty-choice-photo')];
   return {
    hero:pseudo.backgroundImage,
    mask:pseudo.maskImage||pseudo.webkitMaskImage,
    background:getComputedStyle(grid).backgroundColor,
    overflow:getComputedStyle(grid).overflowX,
    panelWidth:panel.width,
    thumbnails:previews.length,
    minThumbHeight:Math.min(...previews.map(el=>el.getBoundingClientRect().height)),
    titleSize:parseFloat(getComputedStyle(document.querySelector('.beauty-editorial-heading h1')).fontSize),
    lookCount:cards.length,
    fullDeck:cards.every(el=>{const r=el.getBoundingClientRect();return r.left>=track.left-2&&r.right<=track.right+2;})
   };
  });
  assert.match(editorial.hero,/atelier\/hero\.webp/,'Approved mock photograph is the new hero asset');
  assert.equal(editorial.lookCount,20,'All 20 editorial directions render');
  if(width>=1350){
   const spread=await page.locator('#beauty-looks-list').evaluate(track=>{
    const viewport=track.getBoundingClientRect();
    return [...track.querySelectorAll('[data-look]')].slice(0,5).map(card=>{
     const box=card.getBoundingClientRect();
     const visible=Math.max(0,Math.min(box.right,viewport.right)-Math.max(box.left,viewport.left));
     return visible/box.width;
    });
   });
   assert.equal(spread.length,5);
   assert.ok(spread.slice(0,4).every(v=>v>.98),'First four Editorial Looks are fully visible at '+width+': '+spread);
   assert.ok(spread[4]>.10&&spread[4]<.37,'A glimpse of the fifth look signals scrolling at '+width+': '+spread);
  }

  if(width>1000){
   assert.match(editorial.mask,/gradient/,'Hero has a real photographic fade into the archive');
   assert.equal(editorial.background,'rgba(0, 0, 0, 0)','Hero no longer has the hard gray rectangle');
   assert.equal(editorial.overflow,'visible','Hero is not clipped at its former hard bottom');
   assert.ok(editorial.panelWidth>=(width>=1366?365:330),'Edit Look panel remains full-size: '+width+'px '+editorial.panelWidth);
   assert.equal(editorial.thumbnails,9,'Active tab shows nine large photographic controls');
   assert.ok(editorial.minThumbHeight>=80,'Right-hand visual presets are readable, not tiny');
   assert.equal(editorial.fullDeck,false,'Archive has true horizontal overflow instead of squeezing six cards');
   if(width>=1440)assert.ok(editorial.titleSize>=70,'Desktop ALTER title has the approved editorial scale');
  }
  // The wider desktop panel must leave the original photographic hero untouched.
  if(width>=1366){
   const review=await page.evaluate(async()=>{
    const link=document.querySelector('link[href*="beauty-panel-widen-20261107.css"]');
    if(!link)return null;
    const snapshot=()=>{
     const grid=document.querySelector('.beauty-editor-grid');
     const hero=getComputedStyle(grid,'::before');
     const rect=el=>{const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom)};};
     return {grid:rect(grid),photo:rect(document.querySelector('.beauty-photo')),
       panel:rect(document.querySelector('.beauty-edit-panel')),
       look:rect(document.querySelector('.beauty-looks-heading')),
       archiveCard:rect(document.querySelector('#beauty-looks-list [data-look]')),
       thumb:rect(document.querySelector('#beauty-panel-makeup [data-value="natural"] .beauty-choice-photo')),
       bg:[hero.backgroundImage,hero.backgroundPosition,hero.backgroundSize,hero.maskImage,hero.opacity],
       title:rect(document.querySelector('.beauty-editorial-heading h1'))};
    };
    const improved=snapshot();link.disabled=true;
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const original=snapshot();link.disabled=false;
    await new Promise(resolve=>requestAnimationFrame(resolve));
    return {improved,original};
   });
   assert.ok(review,'Wider Edit Look stylesheet is loaded');
   const {improved,original}=review;
   assert.deepEqual(improved.bg,original.bg,'Hero image, position, size, fade and opacity remain unchanged');
   assert.deepEqual(improved.grid,original.grid,'Hero background canvas geometry remains unchanged');
   assert.deepEqual(improved.title,original.title,'Original ALTER heading geometry remains unchanged');
   assert.equal(improved.archiveCard.h,original.archiveCard.h,'Editorial archive card height stays unchanged');
   assert.ok(improved.panel.w>=Math.min(590,Math.max(460,width*.35))-1,'Edit Look is deliberately wider');
   assert.ok(improved.thumb.w>=original.thumb.w+15,'Presets gain at least 15px of photo width');
   assert.ok(improved.thumb.h>=original.thumb.h+5,'Presets gain photographic height');
   assert.ok(improved.panel.bottom<=improved.look.y+1,'The bigger editor cannot overlap the archive heading');
  }
  await page.locator('.beauty-breadcrumb button').click({trial:true});
  assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'),'./branding/pv-mark.png');
  await page.locator('#beauty-generate').click({trial:true});
  await page.screenshot({path:'test-results/beauty-fit-'+width+'x'+height+'.png',fullPage:true});
  await s.context.close();
 }
 // Visual shortcuts must control the native fields used by credit quotes and generation.
 {
  const s=await scenario({role:'guest',width:1448}),{page}=s;
  assert.equal(await page.locator('[data-beauty-choice]').count(),45,'Five independent categories each have nine working options');
  const src=await page.locator('.beauty-looks-list .beauty-look-photo').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')));
  assert.equal(src.length,20,'Twenty editorial cards are in the archive');
  assert.equal(new Set(src).size,20,'Every editorial direction has a distinct photographic asset');

  // Explicitly approved redesign: new photo assets, five tabs, continuous archive.
  const hero=await page.locator('.beauty-editor-grid').evaluate(el=>getComputedStyle(el,'::before').backgroundImage);
  assert.match(hero,/atelier\/hero\.webp/,'The approved mock photograph is the background');
  assert.equal(await page.locator('.beauty-looks-arrow').count(),0,'Removed arrow controls are absent, including from keyboard focus');
  // Larger cards intentionally overflow; keyboard/arrows must reach every card.
  const fit=await page.locator('.beauty-looks-list').evaluate(track=>{
   const rect=track.getBoundingClientRect();
   return [...track.querySelectorAll('[data-look]')].every(card=>{
    const r=card.getBoundingClientRect();
    return r.left>=rect.left-1&&r.right<=rect.right+1;
   });
  });
  assert.equal(fit,false,'The archive is a continuous scrollable track, not a forced six-column grid');
  const originalDirection=await page.locator('#beauty-direction').inputValue();
  await page.locator('.beauty-looks-heading strong').hover();
  await page.mouse.wheel(0,160);
  await page.waitForFunction(()=>document.querySelector('#beauty-looks-list').scrollLeft>0);
  assert.equal(await page.locator('#beauty-direction').inputValue(),originalDirection,'Wheel scrolling over the heading does not select a look');
  await page.locator('[data-look="natural"]').focus();
  assert.equal(await page.locator('#beauty-direction').inputValue(),originalDirection,'Browsing does not apply a look');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('[data-look="editorial"]').evaluate(el=>document.activeElement===el),true,'Left key moves focus back');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  assert.match(await page.locator('#beauty-direction').inputValue(),/natural light/i,'Enter applies the focused look');
  await page.locator('[data-beauty-choice="beauty-makeup"][data-value="bold"]').click();
  assert.equal(await page.locator('#beauty-makeup').inputValue(),'bold','Makeup card changes the generation setting');
  await page.locator('#beauty-reset-look').click();
  assert.equal(await page.locator('#beauty-makeup').inputValue(),'keep','Reset returns editing settings to defaults');
  await page.locator('[data-look="night"]').click();
  assert.match(await page.locator('#beauty-direction').inputValue(),/low-key evening/i,'Editorial mood cards produce real creative directions');
  await page.locator('[data-look="goldenhour"]').click();
  assert.equal(await page.locator('#beauty-color').inputValue(),'warm','Golden Hour applies warm colour');
  assert.equal(await page.locator('#beauty-light').inputValue(),'window','Golden Hour applies window light');
  await page.locator('[data-look="silverhalo"]').click();
  assert.equal(await page.locator('#beauty-color').inputValue(),'mono','Silver Halo applies monochrome');
  assert.equal(await page.locator('#beauty-light').inputValue(),'rim','Silver Halo applies rim lighting');

  await s.context.close();
 }

 // Approved three-row editor, real bidirectional wheel/trackpad/drag/touch navigation.
 for(const width of [1440,390]){
  const s=await scenario({role:'guest',width,height:900}),{page}=s;
  const unchanged=()=>page.evaluate(()=>({values:['makeup','hair','skin','light','color','strength','direction'].map(k=>document.getElementById('beauty-'+k).value),selected:[...document.querySelectorAll('[data-look]')].map(n=>n.getAttribute('aria-pressed'))}));
  const initial=await unchanged();
  for(const tab of ['makeup','hair','skin','light','color']){
   await page.locator('#beauty-tab-'+tab).click();
   const geometry=await page.locator('#beauty-panel-'+tab+' .beauty-choice-list').evaluate(el=>{
    const buttons=[...el.children];const rects=buttons.map(n=>n.getBoundingClientRect());
    return {count:buttons.length,rows:new Set(rects.map(r=>Math.round(r.top))).size,cols:new Set(rects.map(r=>Math.round(r.left))).size,clipped:rects.some(r=>r.bottom>el.getBoundingClientRect().bottom+1)};
   });
   assert.deepEqual(geometry,{count:9,rows:3,cols:3,clipped:false});
  }
  await page.locator('#beauty-tab-makeup').click();
  const track=page.locator('#beauty-looks-list');await track.scrollIntoViewIfNeeded();
  const offset=()=>track.evaluate(el=>el.scrollLeft);
  await page.locator('.beauty-looks-heading strong').hover();await page.mouse.wheel(0,140);
  await page.waitForFunction(()=>document.getElementById('beauty-looks-list').scrollLeft>20);
  const forward=await offset();await page.mouse.wheel(0,-90);
  await page.waitForFunction(x=>document.getElementById('beauty-looks-list').scrollLeft<x,forward);
  await track.hover();const beforeHorizontal=await offset();await page.mouse.wheel(90,0);
  await page.waitForFunction(x=>document.getElementById('beauty-looks-list').scrollLeft>x,beforeHorizontal);
  // Ctrl-wheel is browser zoom, never captured by the archive.
  assert.equal(await track.evaluate(el=>{const e=new WheelEvent('wheel',{deltaY:90,ctrlKey:true,bubbles:true,cancelable:true});el.dispatchEvent(e);return e.defaultPrevented;}),false);
  await track.evaluate(el=>el.scrollLeft=0);
  const box=await track.boundingBox();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.5);await page.mouse.down();
  await page.mouse.move(box.x+box.width*.25,box.y+box.height*.5,{steps:8});await page.mouse.up();
  assert.ok(await offset()>30,'Mouse dragging scrolls the archive');
  assert.deepEqual(await unchanged(),initial,'Browsing does not apply presets or change generation fields');
  assert.equal(s.submits,0);assert.equal(s.quotes.length,0);
  await track.focus();await page.keyboard.press('End');
  assert.equal(await page.locator('[data-look="windblown"]').evaluate(el=>el===document.activeElement),true);
  const visible=await page.locator('[data-look="windblown"]').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return a.right<=b.right+2&&a.left>=b.left-2;});assert.equal(visible,true);
  if(width===390){
   await track.evaluate(el=>el.scrollLeft=0);const r=await track.boundingBox();
   const client=await page.context().newCDPSession(page),x=r.x+r.width*.85,y=r.y+r.height*.5;
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let step=1;step<=6;step++){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-step*30,y}]});await page.waitForTimeout(16);}
   await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForFunction(()=>document.getElementById('beauty-looks-list').scrollLeft>50);
   assert.deepEqual(await unchanged(),initial,'A native touch swipe does not select a card');await client.detach();
  }
  await page.locator('#beauty-tab-makeup').scrollIntoViewIfNeeded();
  await page.screenshot({path:'test-results/beauty-flow-'+width+'.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await s.context.close();
 }

 // Verify visible choices, quotes and preset/manual precedence use the same reviewed contract.
 for(const width of [1440,390]){
  const s=await scenario({role:'customer',width,height:900}),{page}=s;
  await page.locator('#beauty-photo').setInputFiles(input);
  await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('23 credits'));
  const catalog=(await import('../lab/beauty-look-catalog.js')).beautyLookCatalog;
  for(const [category,options] of Object.entries(catalog)){
   await page.locator('#beauty-tab-'+category).click();
   for(const option of options){
    const control=page.locator('[data-beauty-choice="beauty-'+category+'"][data-value="'+option.id+'"]');
    assert.equal(await control.locator('.beauty-choice-name').innerText(),option.label);
    assert.equal(await control.locator('.beauty-choice-name').evaluate(el=>getComputedStyle(el).opacity),'1','Labels stay readable without hover');
    const before=await page.evaluate(()=>Object.fromEntries(['makeup','hair','skin','light','color'].map(k=>[k,document.getElementById('beauty-'+k).value])));
    await control.click();
    const after=await page.evaluate(()=>Object.fromEntries(['makeup','hair','skin','light','color'].map(k=>[k,document.getElementById('beauty-'+k).value])));
    assert.equal(after[category],option.id);
    for(const other of Object.keys(before))if(other!==category)assert.equal(after[other],before[other],'A category never changes another category');
   }
  }
  assert.equal(s.submits,0,'Every option selection remains non-generating');
  await page.locator('[data-look="night"]').click();
  assert.equal(await page.locator('#beauty-light').inputValue(),'low-key','Night recipe is reflected in the actual Light field');
  await page.locator('#beauty-tab-light').click();
  await page.locator('[data-beauty-choice="beauty-light"][data-value="keep"]').click();
  assert.equal(await page.locator('#beauty-direction').inputValue(),'','Old automatic low-key instruction cannot override Original');
  await page.locator('#beauty-direction').fill('Keep my jacket exactly as uploaded.');
  await page.locator('[data-beauty-choice="beauty-light"][data-value="flash"]').click();
  assert.equal(await page.locator('#beauty-direction').inputValue(),'Keep my jacket exactly as uploaded.','Manual writing is never erased');
  assert.equal(await page.locator('[data-beauty-original].has-source').count(),5,'Original thumbnails use the current uploaded photo');
  await page.locator('#beauty-reset-look').click();
  for(const tab of ['makeup','hair','skin','light','color']){
   await page.locator('#beauty-tab-'+tab).click();
   await page.screenshot({path:'test-results/beauty-category-'+tab+'-'+width+'.png',fullPage:true});
  }
  await page.evaluate(()=>window.__beautyAccount.signOut());
  await page.waitForFunction(()=>document.querySelector('#beauty-photo-preview').hidden);
  assert.equal(await page.locator('[data-beauty-original].has-source').count(),0,'Sign-out removes every private source preview');
  assert.deepEqual(s.errors,[]);await s.context.close();
 }
 // Tab state, native generation settings, reset and busy controls remain connected.
 for(const width of [1440,390]){
  const s=await scenario({role:'customer',width,height:900}),{page}=s;
  const defaults=()=>page.evaluate(()=>Object.fromEntries(['makeup','hair','skin','light','color','strength'].map(k=>[k,document.getElementById('beauty-'+k).value])));
  assert.deepEqual(await defaults(),{makeup:'keep',hair:'keep',skin:'natural',light:'keep',color:'keep',strength:'50'});
  await page.locator('#beauty-photo').setInputFiles(input);
  await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('23 credits'));
  const buttonGeometry=()=>page.locator('#beauty-generate').evaluate(button=>{const a=button.getBoundingClientRect(),b=button.closest('.beauty-edit-panel').getBoundingClientRect();return {x:a.left-b.left,y:a.top-b.top,width:a.width,height:a.height};});
  const quoted=s.quotes.length,buttonBefore=await buttonGeometry();
  for(const tab of ['hair','skin','light','color','makeup'])await page.locator('#beauty-tab-'+tab).click();
  await page.waitForTimeout(500);
  assert.equal(s.quotes.length,quoted,'Tab browsing does not invalidate or reprice a quote');
  assert.equal(s.submits,0,'Tab browsing cannot generate');
  assert.deepEqual(await buttonGeometry(),buttonBefore,'Generate placement stays stable across tabs');
  for(const [tab,value] of [['makeup','metallic'],['hair','wet'],['skin','matte'],['light','flash'],['color','warm']]){
   await page.locator('#beauty-tab-'+tab).click();
   await page.locator(`[data-beauty-choice="beauty-${tab}"][data-value="${value}"]`).click();
  }
  await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('31 credits'));
  assert.deepEqual(await defaults(),{makeup:'metallic',hair:'wet',skin:'matte',light:'flash',color:'warm',strength:'50'});
  const prompt=s.quotes.at(-1).settings.prompt;
  for(const pattern of [/metallic fashion/,/wet-look/,/matte finish/,/on-camera flash/,/warm colour/])assert.match(prompt,pattern);
  assert.equal(s.submits,0,'Selecting look options only prepares a price');
  await page.locator('#beauty-tab-makeup').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#beauty-tab-hair').getAttribute('aria-selected'),'true');
  await page.keyboard.press('End');assert.equal(await page.locator('#beauty-tab-color').getAttribute('aria-selected'),'true');
  await page.evaluate(()=>document.querySelector('#beauty-color').disabled=true);
  await page.waitForFunction(()=>document.querySelector('[data-beauty-choice="beauty-color"]').disabled);
  assert.equal(await page.locator('[data-beauty-choice="beauty-color"][data-value="cool"]').isDisabled(),true,'Native busy state disables visual choices');
  await page.evaluate(()=>document.querySelector('#beauty-color').disabled=false);
  await page.locator('#beauty-reset-look').click();
  assert.deepEqual(await defaults(),{makeup:'keep',hair:'keep',skin:'natural',light:'keep',color:'keep',strength:'50'});
  await page.locator('[data-look="editorial"]').focus();await page.keyboard.press('End');
  const visible=await page.locator('[data-look="windblown"]').evaluate(card=>{const a=card.getBoundingClientRect(),b=card.parentElement.getBoundingClientRect();return a.left>=b.left-3&&a.right<=b.right+3;});
  assert.equal(visible,true,'Last archive card is fully reachable by keyboard');
  assert.equal(await page.locator('#beauty-direction').inputValue(),'','Archive keyboard navigation does not apply the focused preset');
  await page.evaluate(()=>window.__beautyAccount.signOut());
  await page.waitForFunction(()=>document.querySelector('#beauty-photo-preview').hidden);
  assert.deepEqual(await defaults(),{makeup:'keep',hair:'keep',skin:'natural',light:'keep',color:'keep',strength:'50'});
  assert.equal(await page.locator('#beauty-tab-makeup').getAttribute('aria-selected'),'true','Sign-out resets visible tab');
  assert.equal(await page.locator('[data-beauty-choice="beauty-makeup"][data-value="keep"]').getAttribute('aria-pressed'),'true');
  assert.deepEqual(s.errors,[]);await s.context.close();
 }
 for(const width of [1448,1024,390,320]){
  const s=await scenario({role:'guest',width}),{page}=s;
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Beauty has no horizontal overflow at '+width);
  const header=page.locator('.beauty-header'),nav=header.locator('nav[aria-label="Creative tools"]');
  const navLabels=await nav.locator(':scope > a:not([hidden]), :scope > .pv-studios-menu > .pv-studios-trigger').allTextContents();
  assert.deepEqual(navLabels,['Image','Video','Upscaler','Studios','Moods'],'Beauty uses the standard Studio menu, not its old standalone links');
  const headerBounds=await header.boundingBox();
  assert.equal(Math.round(headerBounds.y),0,'Global header aligns to the top edge');
  assert.equal(Math.round(headerBounds.height),width<=900?104:70,'Beauty retains Studio header proportions');
  assert.equal(await header.locator('.beauty-assets-link').getAttribute('href'),'./studio.html?tool=assets');
  assert.equal(await header.getByRole('link',{name:'Effects'}).isVisible(),false,'Effects remains owner-only');
  assert.equal(await header.getByRole('link',{name:'Pricing'}).count(),0,'No second Pricing header');
  assert.equal(await header.getByRole('link',{name:'Open studio'}).count(),0,'No duplicate Studio launch in header');
  assert.equal(await header.getByRole('link',{name:'Credits'}).count(),0,'Credit controls stay in the account menu');
  await page.locator('.pv-studios-trigger').click();
  await page.locator('.pv-studios-panel').waitFor({state:'visible'});
  assert.equal(await page.getByRole('link',{name:'Alter',exact:true}).isVisible(),true);
   assert.equal(await page.getByRole('link',{name:'Retouch Studio',exact:true}).isVisible(),true);
  assert.equal(await page.getByRole('link',{name:'Outfit Studio',exact:true}).count(),0);
  assert.equal(await page.locator('.pv-studios-tile').count(),4);
  const bounds=await page.locator('.pv-studios-panel').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
  await page.screenshot({path:'test-results/beauty-menu-'+width+'.png',fullPage:true});
  await page.keyboard.press('Escape');assert.equal(await page.locator('.pv-studios-panel').isVisible(),false);
  await page.locator('#beauty-photo').setInputFiles(input);await page.locator('#beauty-photo-preview').waitFor({state:'visible'});
  assert.deepEqual(s.calls,[],'Guest selects local photo without private API requests');
  await page.locator('#beauty-generate').click();await page.waitForFunction(()=>window.__signins===1);
  assert.deepEqual(s.calls,[],'Guest Generate opens sign-in without uploading, quoting or submitting');
  await page.screenshot({path:'test-results/beauty-'+width+'.png',fullPage:true});assert.deepEqual(s.errors,[]);await s.context.close();
 }
 for(const options of [{role:'customer',width:1448},{role:'owner',width:1448},{role:'customer',width:390}]){
  const s=await scenario(options),{page}=s;
  assert.equal(await page.locator('#beauty-effects-link').isVisible(),options.role==='owner','Effects matches server-verified Studio owner visibility');
  assert.equal(await page.locator('.beauty-assets-link').getAttribute('href'),'./studio.html?tool=assets');
  assert.equal(await page.locator('#beauty-account').isVisible(),true,'Signed-in account menu is visible on Beauty');
  await page.locator('#beauty-photo').setInputFiles(input);
  await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('23 credits'));
  const dims=await page.locator('#beauty-photo-preview').evaluate(el=>({width:el.naturalWidth,height:el.naturalHeight}));
   assert.equal(s.quotes[0].settings.aspectRatio,beautyAutoRatio(dims.width,dims.height),'Auto quotes the uploaded photo\'s closest supported aspect ratio');
   assert.match(await page.locator('#beauty-ratio option[value="auto"]').textContent(),new RegExp(beautyAutoRatio(dims.width,dims.height).replace(':','\\:')));
  assert.equal(await page.locator('#beauty-ratio').inputValue(),'auto','Auto remains selected in the approved UI');
  assert.equal(s.submits,0,'Quoting does not generate');assert.equal(s.uploads,1);
  await page.evaluate(()=>{document.querySelector('#beauty-form').requestSubmit();document.querySelector('#beauty-form').requestSubmit()});
  await page.locator('#beauty-result').waitFor({state:'visible'});assert.equal(s.submits,1,'Double-click submits exactly once');
  await page.locator('#beauty-generate').click({trial:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Completed result does not widen the page');
  await page.screenshot({path:'test-results/beauty-result-'+options.role+'-'+options.width+'.png',fullPage:true});
  assert.equal(await page.locator('#beauty-download').getAttribute('href').then(v=>v.startsWith('blob:')),true);

  const resultSrc=await page.locator('#beauty-result-image').getAttribute('src');
  await page.locator('#beauty-zoom-open').click();
  const viewer=page.locator('#beauty-zoom-dialog');
  assert.equal(await viewer.evaluate(el=>el.open),true,'Completed result opens the full-size viewer');
  assert.equal(await page.locator('#beauty-zoom-image').getAttribute('src'),resultSrc,'Zoom uses the exact private generated result');
  await page.locator('#beauty-zoom-image').evaluate(image=>image.decode());
  await page.waitForFunction(()=>document.querySelector('#beauty-zoom-image').style.width!=='');
  await page.locator('#beauty-zoom-in').click();
  await page.locator('#beauty-zoom-in').click();
  assert.equal(await page.locator('#beauty-zoom-level').textContent(),'150%','Zoom increases above native size');
  await page.locator('#beauty-zoom-fit').click();
  assert.equal(await page.locator('#beauty-zoom-level').textContent(),'Fit','Fit restores full composition');
  assert.equal(await page.locator('#beauty-zoom-download').getAttribute('href'),await page.locator('#beauty-download').getAttribute('href'),'Full-size viewer downloads the original output');
  await page.keyboard.press('Escape');
  assert.equal(await viewer.evaluate(el=>el.open),false,'Escape closes the viewer');
  assert.equal(s.submits,1,'Zoom and close do not request another generation');
   assert.equal(await page.locator('#beauty-result').getAttribute('data-before-source-id'),'photo-1','Before image belongs to the actual generated job source');
  await page.locator('#beauty-zoom-open').click();
  assert.equal(await page.locator('#beauty-zoom-dialog').evaluate(el=>el.open),true,'Zoom can be opened from a saved result');
  await page.evaluate(()=>window.__beautyAccount.signOut());
  await page.waitForFunction(()=>!document.querySelector('#beauty-zoom-dialog').open);
  assert.equal(await page.locator('#beauty-zoom-image').getAttribute('src'),null,'Sign-out removes private zoom image');
  await page.waitForFunction(()=>document.querySelector('#beauty-result').hidden&&document.querySelector('#beauty-photo-preview').hidden);
  assert.equal(await page.locator('#beauty-history').textContent(),'');assert.equal(await page.locator('#beauty-direction').inputValue(),'');assert.equal(await page.locator('#beauty-photo-preview').getAttribute('src'),null);
  assert.deepEqual(s.errors,[]);await s.context.close();
 }
 {
  const s=await scenario({malformed:true}),{page}=s;await page.locator('#beauty-photo').setInputFiles(input);
  await page.waitForFunction(()=>document.querySelector('#beauty-status').textContent.includes('credit price'));
  await page.locator('#beauty-generate').click();assert.equal(s.submits,0,'Invalid credit quote cannot generate');await s.context.close();
 }
 {
  const s=await scenario({delayed:true}),{page}=s;
  // Checking begins during upload too. Exercise a genuinely in-flight stale quote.
  const pendingQuote=page.waitForRequest(request=>new URL(request.url()).pathname==='/api/quotes'&&request.method()==='POST');
  await page.locator('#beauty-photo').setInputFiles(input);
  await pendingQuote;
  assert.equal(s.submits,0,'Pending quote cannot submit automatically');
  await page.locator('#beauty-direction').fill('A different look');
  await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('31 credits'));
  await page.locator('#beauty-generate').click();await page.locator('#beauty-result').waitFor({state:'visible'});
  assert.equal(s.submits,1);assert.match(s.jobs[0].settings.prompt,/A different look/);assert.equal(s.uploads,1);await s.context.close();
 }
 {
  const s=await scenario({submitFailure:true}),{page}=s;await page.locator('#beauty-photo').setInputFiles(input);
  await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('23 credits'));
  await page.locator('#beauty-generate').click();await page.waitForFunction(()=>!document.querySelector('#beauty-check-history').hidden);
  await page.evaluate(()=>document.querySelector('#beauty-form').requestSubmit());assert.equal(s.submits,1,'Ambiguous submission is never retried automatically');
  await page.reload();await page.locator('#beauty-check-history').waitFor({state:'visible'});assert.equal(s.submits,1,'Reload cannot submit or reprice an ambiguous request');
  await s.context.close();
 }
 for(const width of [1448,390]){
  console.log('ALTER comparison checks at '+width+'px');
  const s=await scenario({width,height:844}),{page}=s;
  const portrait=await testPhoto(page,600,900,'#a52020'),landscape=await testPhoto(page,900,600,'#206030');
  await page.locator('#beauty-photo').setInputFiles(portrait);
  await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('23 credits'));
  assert.equal(s.quotes.at(-1).settings.aspectRatio,'2:3');
  assert.deepEqual(await page.locator('#beauty-model option').allTextContents(),['Seedream 5 Pro','Seedream Flash']);
  const illustrative=page.getByText('Illustrative directions. Actual results may vary.',{exact:true});
  await illustrative.scrollIntoViewIfNeeded();assert.equal(await illustrative.isVisible(),true);
  await page.locator('#beauty-generate').click();await page.locator('#beauty-result').waitFor({state:'visible'});
  const originalUrl=await page.locator('.beauty-before-image').getAttribute('src');
  assert.notEqual(originalUrl,await page.locator('#beauty-photo-preview').getAttribute('src'),'Comparison owns a URL independent of the upload tile');
  await page.locator('.beauty-before-image').evaluate(image=>image.decode());
  const slider=page.getByRole('slider',{name:'Before and after image comparison'});
  await slider.press('End');assert.equal(await slider.getAttribute('aria-valuenow'),'100');
  await slider.press('Home');await slider.press('ArrowRight');assert.equal(await slider.getAttribute('aria-valuenow'),'5');
  if(width===390){
   const box=await page.locator('#beauty-result').boundingBox();
   const handle=await slider.boundingBox(),cdp=await page.context().newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:handle.x+handle.width/2,y:box.y+20}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.75,y:box.y+20}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.ok(Math.abs(Number(await slider.getAttribute('aria-valuenow'))-75)<=1,'Touch comparison uses the image position');
  }
  await page.locator('#beauty-generate').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#beauty-generate').disabled);
  await page.locator('#beauty-photo').setInputFiles(landscape);
  await page.locator('#beauty-photo-preview').waitFor({state:'visible'});
  assert.equal(await page.evaluate(async url=>(await fetch(url)).ok,originalUrl),true,'New upload must not revoke the displayed job original');
  await page.locator('#beauty-direction').fill('Another look');
  const secondQuoted=await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('31 credits'),null,{timeout:8000}).then(()=>true).catch(()=>false);
  if(!secondQuoted){
   const debug=await page.evaluate(()=>({button:document.querySelector('#beauty-generate').textContent,disabled:document.querySelector('#beauty-generate').disabled,status:document.querySelector('#beauty-status').textContent,photoSrc:document.querySelector('#beauty-photo-preview').getAttribute('src')?.slice(0,45),inputValue:document.querySelector('#beauty-photo').value,ratio:document.querySelector('#beauty-ratio').value,direction:document.querySelector('#beauty-direction').value}));
   console.error('ALTER second-quote debug',JSON.stringify({debug,calls:s.calls,quotes:s.quotes.map(q=>({id:q.id,ratio:q.settings.aspectRatio,sourceIds:q.settings.referenceSourceIds})),uploads:s.uploads,submits:s.submits,errors:s.errors}));
  }
  assert.equal(secondQuoted,true,'Second source quote should settle after uploading a new photograph');
  assert.equal(s.quotes.at(-1).settings.aspectRatio,'3:2');
  await page.locator('#beauty-model').selectOption('flash');
  await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('31 credits'));
  assert.equal(s.quotes.at(-1).settings.engine,'flash','Visible Flash choice selects the Flash engine');
  await page.locator('#beauty-ratio').selectOption('1:1');
  await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('31 credits'));
  assert.equal(s.quotes.at(-1).settings.aspectRatio,'1:1','Explicit ratio overrides the photo shape');
  await page.locator('#beauty-generate').click();await page.waitForFunction(()=>document.querySelectorAll('#beauty-history button').length===2);
  await page.locator('#beauty-generate').click({trial:true});
  await page.locator('#beauty-history button').nth(1).click();
  await page.waitForFunction(()=>document.querySelector('#beauty-result').dataset.beforeSourceId==='photo-1');
  assert.equal(await page.locator('#beauty-photo-preview').evaluate(image=>image.naturalWidth),900,'History must not replace the current upload');
  await page.locator('.beauty-before-image').evaluate(image=>image.decode());
  assert.deepEqual(await page.locator('.beauty-before-image').evaluate(image=>[image.naturalWidth,image.naturalHeight]),[600,900],'History fetches the actual original photograph');
  const oldSourceRequest=page.waitForRequest('**/api/assets/photo-1');
  s.delayOldResult();await page.locator('#beauty-history button').nth(1).click();await oldSourceRequest;
  await page.locator('#beauty-history button').nth(0).click();
  await page.waitForTimeout(1300);
  assert.match(await page.locator('#beauty-download').getAttribute('download'),/job-2/,'A delayed older image cannot replace the newer selection');
   assert.equal(await page.locator('#beauty-result').getAttribute('data-before-source-id'),'photo-2','History comparison must keep the new job original rather than the previously selected job original');
  s.missingSources.add('photo-1');
  await page.locator('#beauty-history button').nth(1).click();
  await page.waitForFunction(()=>document.querySelector('#beauty-download').download.includes('job-1'));
  assert.equal(await slider.isVisible(),false,'Unavailable original hides the comparison without substituting another person');
  assert.equal(await page.locator('#beauty-result-image').isVisible(),true,'Saved output remains available without its original');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'test-results/beauty-missing-original-'+width+'.png',fullPage:true});
  assert.equal(s.submits,2,'History selection never generates');await s.context.close();
 }
 // The homepage uses the real new menu, retaining its original Fashion URL.
 {
  const s=await scenario({role:'guest'});await s.page.goto(base+'/lab/index.html');await s.page.locator('.pv-studios-trigger').click();
  assert.match(await s.page.getByRole('link',{name:'Fashion Studio',exact:true}).getAttribute('href'),/tool=fashion/);
  assert.match(await s.page.locator('.pv-studios-character-link').getAttribute('href'),/createCharacter=1/);
  assert.match(await s.page.locator('#hero-title').textContent(),/PV LAB/);await s.context.close();
 }
 {
  const s=await scenario({role:'guest',width:390});await s.page.goto(base+'/lab/moods.html');
  await s.page.locator('.pv-studios-trigger').click();
  await s.page.getByRole('link',{name:'Alter',exact:true}).click();
  await s.page.waitForURL('**/lab/beauty.html');
  assert.equal(await s.page.locator('h1').textContent(),'ALTER Studio.');await s.context.close();
 }
 console.log('PASS Beauty: desktop/mobile, menu, guest isolation, owner/customer, exact credits, one submit, stale quotes, ambiguity and logout privacy');
}finally{await browser.close();server.close();}
