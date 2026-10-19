// Non-billable PV Lab browser smoke: distinct Explore and Mood Creator experiences.
// All customer, media and Gemini requests are mocked. No provider charge.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const creatorSource=readFileSync('lab/mood-creator.js','utf8');
const begin=creatorSource.indexOf("  (async()=>{\n    try{\n      clerk=await loadLabAccount();");
const finish=creatorSource.indexOf("\n  })();",begin);
assert.ok(begin>0&&finish>begin,'Locate Mood Creator authentication bootstrap');
const token='synthetic.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature';
const localBoot="  clerk={isSignedIn:true,user:{id:'test-owner'},session:{id:'test-session',getToken:async()=> '"+token+"'},addListener:()=>{},openSignIn:()=>{},signOut:async()=>{}};\n  void syncAuth();";
const patched=creatorSource.slice(0,begin)+localBoot+creatorSource.slice(finish+"\n  })();".length);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'};
const server=http.createServer((request,response)=>{
  const requestedPath=new URL(request.url,'http://localhost').pathname;
  const path=requestedPath==='/lab/moods'?'/lab/moods.html':requestedPath;
  if(path==='/lab/studio.html'){
    response.writeHead(200,{'Content-Type':'text/html'});
    response.end('<!doctype html><title>Image handoff received</title><h1>Image Studio</h1>');
    return;
  }
  const file=resolve(root,'.'+path+(path.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+'/')||!existsSync(file)){response.writeHead(404).end();return;}
  response.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');
  response.end(path==='/lab/mood-creator.js'?patched:readFileSync(file));
});
await new Promise(resolve=>server.listen(4191,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
const origin='http://127.0.0.1:4191';
const uuid=n=>'30000000-0000-4000-8000-'+String(n).padStart(12,'0');
const boards=[],requests=[];
async function fillRoutes(context){
  await context.route('https://**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),method=req.method();
    if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev'){await route.abort();return;}
    const body=method==='POST'&&req.headers()['content-type']?.includes('json')?req.postDataJSON():null;
    requests.push({path:url.pathname,method,body});
    const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    if(url.pathname==='/api/session')return json({owner:true,ownerId:'test-owner',customer:false,config:{}});
    if(url.pathname==='/api/moodboards'&&method==='GET')return json({moodboards:boards});
    if(url.pathname==='/api/moodboards'&&method==='POST'){
      const record={id:uuid(boards.length+3),...body,createdAt:Date.now(),updatedAt:Date.now()};
      boards.unshift(record);return json({moodboard:record},201);
    }
    if(/^\/api\/moodboards\/[0-9a-f-]{36}$/.test(url.pathname)&&method==='POST'){
      const index=boards.findIndex(b=>b.id===url.pathname.split('/').at(-1));
      if(index<0)return json({error:'Not found'},404);
      boards[index]={...boards[index],...body};return json({moodboard:boards[index]});
    }
    if(url.pathname==='/api/moodboards/analyze'&&method==='POST')return json({
      name:'Liquid Memory',
      direction:'Analog-film haze, source-led pearlescent wet highlights, softly iridescent reflective materials, dimensional atmospheric depth and delicate photochemical halation with natural skin texture.',
      qualities:['wet reflections','soft halation'],palette:['#c4d7d8','#e1bec9']
    });
    return json({error:'Unexpected mocked request '+url.pathname},500);
  });
}
let successes=0;const pass=name=>{successes++;console.log('PASS '+name)};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9VAAAAABJRU5ErkJggg==','base64');
try{
  const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
  await fillRoutes(context);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto(origin+'/lab/explore-moods.html',{waitUntil:'domcontentloaded'});
  await page.waitForURL(origin+'/lab/moods');
  assert.equal(new URL(page.url()).pathname,'/lab/moods','Old Explore URL redirects to the short route');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.mc-look-card[data-mood-id]').count(),17);
  assert.equal(await page.locator('#mc-look-dialog').count(),1);
  const grid=await page.evaluate(()=>{
    const gallery=document.querySelector('.mc-look-grid'),photo=gallery.querySelector('.mc-look-photo').getBoundingClientRect();
    return {columns:getComputedStyle(gallery).gridTemplateColumns.split(' ').length,width:photo.width,height:photo.height,top:photo.top};
  });
  assert.equal(grid.columns,5);
  assert.ok(grid.width>=200&&grid.height>=150,'Mood thumbnails stay readable in the five-column editorial grid: '+JSON.stringify(grid));
  assert.ok(grid.top<900,'The first image row should be visible without scrolling');
  assert.equal(await page.locator('.mc-workspace').count(),0,'Explore has no duplicate Mood Creator workbench');
  pass('Explore Moods shows fifteen looks on a dedicated page');

  // Hold the real original indefinitely: a slow connection must never blank the tray.
  const filmOriginal='/lab/mood-bank/2026-10-11/80s-film/originals/80s-film.png';
  let releaseFilm;
  const filmGate=new Promise(resolve=>{releaseFilm=resolve;});
  await page.route('**'+filmOriginal,async route=>{await filmGate;await route.continue();});
  const filmCard=page.locator('.mc-look-card[data-mood-id="80s-film"]');
  await filmCard.scrollIntoViewIfNeeded();
  await filmCard.locator('img').evaluate(img=>img.decode());
  const originalRequest=page.waitForRequest(request=>request.url().endsWith(filmOriginal));
  await filmCard.hover();
  await originalRequest;
  await filmCard.click();
  const filmPreview=await filmCard.locator('img').getAttribute('src');
  await page.waitForFunction(src=>{
    const image=document.getElementById('mc-look-preview');
    return image.getAttribute('src')===src&&image.complete&&image.naturalWidth>=1600;
  },filmPreview);
  assert.equal(await page.locator('#mc-look-dialog').evaluate(el=>el.open),true);
  releaseFilm();
  await page.waitForFunction(src=>{
    const image=document.getElementById('mc-look-preview');
    return image.src.endsWith(src)&&image.complete&&image.naturalWidth===2048;
  },filmOriginal);
  await page.locator('#mc-look-close').click();
  pass('Slow originals keep the HD card visible and upgrade to full resolution after decoding');

  const flashOriginal='/lab/mood-bank/2026-10-11/night-flash/originals/night-flash.png';
  let releaseFlash;
  const flashGate=new Promise(resolve=>{releaseFlash=resolve;});
  await page.route('**'+flashOriginal,async route=>{await flashGate;await route.continue();});
  await page.locator('.mc-look-card[data-mood-id="night-flash"]').click();
  await page.locator('#mc-look-close').click();
  await page.locator('.mc-look-card[data-mood-id="berlin-rave"]').click();
  const ravePreview=await page.locator('#mc-look-preview').getAttribute('src');
  releaseFlash();
  await page.evaluate(async src=>{
    const image=new Image();image.src=src;await image.decode();
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  },flashOriginal);
  const currentRavePreview=await page.locator('#mc-look-preview').getAttribute('src');
  assert.match(currentRavePreview||'',/berlin-rave/i,
    'A late Night Flash original cannot replace the current Berlin Rave Mood');
  assert.doesNotMatch(currentRavePreview||'',/night-flash/i);
  // The Berlin Rave grid thumbnail may legitimately upgrade to its HD detail during this wait.
  await page.locator('#mc-look-close').click();
  await page.waitForFunction(()=>!document.getElementById('mc-look-preview').hasAttribute('src'));
  pass('Closing and switching Moods ignores late image loads');

  await page.route('**/dreamcore/originals/dreamcore-one.png',route=>route.abort());
  const failedOriginal=page.waitForEvent('requestfailed',request=>request.url().endsWith('/dreamcore/originals/dreamcore-one.png'));
  await page.locator('.mc-look-card[data-mood-id="dreamcore"]').click();
  await failedOriginal;
  assert.equal(await page.locator('#mc-look-dialog').evaluate(el=>el.open),true);
  assert.equal((await page.locator('#mc-look-title').innerText()).trim(),'Dreamcore');
  await page.waitForFunction(()=>{
    const image=document.getElementById('mc-look-preview');
    return image.src.endsWith('/dreamcore/preview.webp')&&image.complete&&image.naturalWidth>0;
  });
  pass('A failed original leaves the existing photograph visible');
  await page.locator('#mc-look-make').click();
  await page.waitForURL(u=>u.pathname.endsWith('/lab/mood-creator.html'),{timeout:16000});
  await page.waitForFunction(()=>document.getElementById('mc-signin').hidden,{timeout:18000});
  assert.equal(await page.locator('#mc-base').inputValue(),'dreamcore');
  assert.equal(await page.locator('.mc-editorial-frame img').count(),3);
  assert.equal(await page.locator('.mc-look-card').count(),0,'No curated card grid inside personal Mood Creator');
  await page.locator('#mc-name').fill('Pearl Drift');
  await page.locator('#mc-save').click();
  await page.getByRole('button',{name:/Open saved Mood Pearl Drift/}).waitFor({timeout:16000});
  assert.equal(boards[0].baseMoodId,'dreamcore');
  assert.equal(boards[0].direction,'');
  assert.ok((await page.locator('.mc-library-use').first().getAttribute('href')).includes('moodboard='+boards[0].id));
  pass('Explore Make it yours opens the editorial creator and saves to My Moods');

  await page.locator('#mc-new').click();
  const inputs=[0,1,2].map(i=>({name:'inspiration-'+i+'.png',mimeType:'image/png',buffer:png}));
  await page.locator('#mc-upload').setInputFiles(inputs);
  await page.locator('.mc-shot').nth(2).click();
  await page.locator('#mc-idea').fill('Soft pearl light, analog film melancholy');
  await page.locator('#mc-analyze').click();
  await page.waitForFunction(()=>document.getElementById('mc-direction').value.includes('Analog-film haze'),{timeout:20000});
  const analyzed=requests.filter(x=>x.path==='/api/moodboards/analyze');
  assert.equal(analyzed.length,1);
  assert.equal(analyzed[0].body.imageDataUrls.length,3);
  assert.equal(analyzed[0].body.focusIndex,2);
  assert.ok(analyzed[0].body.imageDataUrls.every(x=>x.startsWith('data:image/jpeg;base64,')));
  pass('One explicit analysis receives all three photos and the chosen visual focus');

  // The workspace must grow with references and expanded copy, without nested scroll.
  await page.locator('#mc-upload').setInputFiles(Array.from({length:9},(_,i)=>({name:'extra-'+i+'.png',mimeType:'image/png',buffer:png})));
  assert.equal(await page.locator('.mc-shot').count(),12);
  await page.locator('.mc-analysis-details').evaluate(el=>{el.open=true;});
  for(const width of [1440,1024,390,320]){
    await page.setViewportSize({width,height:900});
    const layout=await page.evaluate(()=>{
      const panel=document.querySelector('.mc-direction-main');
      const direction=document.querySelector('.mc-direction').getBoundingClientRect();
      const footer=document.querySelector('.mc-direction-footer').getBoundingClientRect();
      const board=document.querySelector('.mc-board').getBoundingClientRect();
      const column=document.querySelector('.mc-board-column').getBoundingClientRect();
      return {overflow:getComputedStyle(panel).overflowY,viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,
        footerInside:footer.bottom<=direction.bottom+1,photosInside:board.bottom<=column.bottom+1};
    });
    assert.equal(layout.overflow,'visible','Art Direction has no internal scroll at '+width);
    assert.ok(layout.pageWidth<=layout.viewport+2,'No horizontal overflow at '+width);
    assert.ok(layout.footerInside&&layout.photosInside,'All twelve references and save controls fit their panels at '+width);
  }
  await page.setViewportSize({width:1440,height:900});
  pass('Mood workspace expands with twelve photos and analysis details on desktop and mobile');

  await page.goto(origin+'/lab/explore-moods.html',{waitUntil:'domcontentloaded'});
  await page.locator('.mc-look-card[data-mood-id="hong-kong-nights"]').click();
  await page.locator('#mc-look-direction').fill('Portrait with deep cinematic shadows');
  await page.locator('#mc-look-file').setInputFiles({name:'source.png',mimeType:'image/png',buffer:png});
  assert.equal(await page.locator('#mc-look-file-clear').isVisible(),true);
  await page.route('**/lab/mood-creator.html?*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><h1>Mood Creator handoff</h1>'}));
  await page.locator('#mc-look-make').click();
  await page.waitForURL(u=>u.pathname.endsWith('/lab/mood-creator.html'),{timeout:16000});
  const url=new URL(page.url());
  assert.equal(url.searchParams.get('base'),'hong-kong-nights');
  const handoff=url.searchParams.get('handoff');
  assert.match(handoff,/^[a-f0-9-]{36}$/i);
  const transfer=await page.evaluate(async id=>{
    const {takeMoodHandoff}=await import('/lab/mood-handoff.js');
    const packet=await takeMoodHandoff(id);
    let replay=false;try{await takeMoodHandoff(id);}catch{replay=true;}
    return {name:packet.file?.name,size:packet.file?.size,prompt:packet.prompt,replay};
  },handoff);
  assert.equal(transfer.name,'source.png');
  assert.ok(transfer.size>0);
  assert.equal(transfer.prompt,'Portrait with deep cinematic shadows');
  assert.equal(transfer.replay,true);
  assert.ok(!requests.some(x=>/\/api\/(?:jobs|quotes|billing|customer\/image-price)/.test(x.path)),
    'Browsing, composing and saving a Mood must not trigger paid generation');
  assert.deepEqual(errors,[]);
  pass('Single-use photo handoff to Mood Creator does not submit or charge');

  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1});
  await fillRoutes(mobile);
  const phone=await mobile.newPage(),mobileErrors=[];
  phone.on('pageerror',error=>mobileErrors.push(error.message));
  await phone.goto(origin+'/lab/explore-moods.html',{waitUntil:'domcontentloaded'});
  const metrics=await phone.evaluate(()=>{
    const gallery=document.querySelector('.mc-look-grid'),image=gallery.querySelector('.mc-look-photo').getBoundingClientRect();
    return {columns:getComputedStyle(gallery).gridTemplateColumns.split(' ').length,width:image.width,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth};
  });
  assert.equal(metrics.columns,2);
  assert.ok(metrics.width>=145);
  assert.ok(metrics.scrollWidth<=metrics.viewport+3,'Mobile Explore has no document overflow');
  await phone.locator('.mc-look-card[data-mood-id="night-flash"]').click();
  assert.equal(await phone.locator('#mc-look-dialog').evaluate(el=>el.open),true);
  assert.deepEqual(mobileErrors,[]);
  pass('Mobile Explore and its quick photo tray work without overflow');
  await phone.goto(origin+'/lab/mood-creator.html',{waitUntil:'domcontentloaded'});
  await phone.waitForFunction(()=>document.getElementById('mc-signin').hidden);
  for(const viewport of [{width:390,height:650},{width:320,height:568}]){
    await phone.setViewportSize(viewport);
    const entry=await phone.evaluate(()=>{
      const cta=document.getElementById('mc-hero-upload').getBoundingClientRect();
      return {bottom:cta.bottom,height:innerHeight,top:cta.top,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    assert.ok(entry.top>0&&entry.bottom<entry.height,'Collage upload is visible on first mobile screen: '+JSON.stringify(viewport));
    assert.ok(entry.overflow<=2,'No horizontal overflow in mobile entry');
    const spacing=await phone.evaluate(()=>{
      const stage=document.querySelector('.mc-editorial').getBoundingClientRect();
      const card=document.querySelector('.mc-frame-three').getBoundingClientRect();
      const workspace=document.getElementById('workspace').getBoundingClientRect();
      const upload=document.getElementById('mc-drop-trigger').getBoundingClientRect();
      const heading=document.querySelector('.mc-workspace-heading').getBoundingClientRect();
      return {cardGap:stage.bottom-card.bottom,uploadOffset:upload.top-workspace.top,headingHeight:heading.height,
        hasLineIcon:!!document.querySelector('.mc-navigation a svg'),emojiArrow:/[↗↘]/u.test(document.body.textContent)};
    });
    assert.ok(spacing.cardGap>=20,'Dreamcore clears the lower border on mobile');
    assert.ok(spacing.uploadOffset<160,'Mobile workspace reaches upload without stacked introductory paragraphs');
    assert.ok(spacing.headingHeight<55,'Mobile workspace title and New Mood share one compact row');
    assert.ok(spacing.hasLineIcon&&!spacing.emojiArrow,'Navigation and saved buttons use line icons instead of emoji arrows');

  }
  assert.equal(await phone.locator('#mc-new').isVisible(),false);
  assert.equal(await phone.locator('#mc-name').isVisible(),false);
  assert.equal(await phone.locator('#mc-direction').isVisible(),false);
  assert.ok(await phone.locator('#mc-drop-trigger').evaluate(el=>el.getBoundingClientRect().height<210),'Phone upload is compact');
  assert.equal(await phone.locator('.mc-editorial-frame img').count(),3);
  const startY=await phone.evaluate(()=>scrollY);
  const canceled=phone.waitForEvent('filechooser');
  await phone.locator('#mc-hero-upload').click();
  await (await canceled).setFiles([]);
  assert.equal(await phone.evaluate(()=>scrollY),startY,'Empty file selection leaves the hero in place');
  const picked=phone.waitForEvent('filechooser');
  await phone.locator('#mc-hero-upload').click();
  await (await picked).setFiles({name:'mobile-reference.png',mimeType:'image/png',buffer:png});
  await phone.waitForFunction(()=>document.querySelectorAll('.mc-shot').length===1&&Math.abs(document.querySelector('.mc-board-column').getBoundingClientRect().top-16)<3);
  assert.equal(await phone.locator('#mc-board').evaluate(el=>document.activeElement===el),true);
  pass('Mobile collage upload is above the fold and only a selected image moves to the board');
  assert.equal(await phone.locator('#mc-new').isVisible(),true);
  assert.equal(await phone.locator('.mc-board-footnote').isVisible(),true);
  assert.equal(await phone.locator('#mc-name').isVisible(),false);
  await phone.locator('#mc-analyze').click();
  await phone.waitForFunction(()=>document.getElementById('mc-direction').value.includes('Analog-film haze'));
  assert.equal(await phone.locator('#mc-direction').isVisible(),true);
  assert.equal(await phone.locator('#mc-name').inputValue(),'Liquid Memory');
  assert.equal(await phone.locator('#mc-save').isVisible(),true);
  await phone.locator('#mc-new').click();
  assert.equal(await phone.locator('#mc-direction').isVisible(),false);
  await phone.locator('#mc-mobile-idea').click();
  assert.equal(await phone.locator('#mc-idea').evaluate(el=>document.activeElement===el),true);
  await phone.locator('#mc-idea').fill('Soft silver light and tactile film grain');
  await phone.locator('#mc-use-idea').click();
  assert.equal(await phone.locator('#mc-direction').inputValue(),'Soft silver light and tactile film grain');
  await phone.locator('#mc-new').click();
  await phone.locator('#mc-write-style').click();
  assert.equal(await phone.locator('#mc-direction').isVisible(),true);
  assert.equal(await phone.locator('#mc-name').isVisible(),true);
  assert.deepEqual(mobileErrors,[]);
  pass('Phone flow reveals results and naming after development, preserves idea/manual routes and resets cleanly');
  await mobile.close();await context.close();
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
console.log('PV Lab Explore / Mood Creator browser checks: '+successes+' passed (synthetic API).');

