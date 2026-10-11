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
const begin=creatorSource.indexOf("  (async()=>{\n    try{\n      const {Clerk}=await import(");
const finish=creatorSource.indexOf("\n  })();",begin);
assert.ok(begin>0&&finish>begin,'Locate Mood Creator authentication bootstrap');
const token='synthetic.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature';
const localBoot="  clerk={isSignedIn:true,user:{id:'test-owner'},session:{id:'test-session',getToken:async()=> '"+token+"'},addListener:()=>{},openSignIn:()=>{},signOut:async()=>{}};\n  void syncAuth();";
const patched=creatorSource.slice(0,begin)+localBoot+creatorSource.slice(finish+"\n  })();".length);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'};
const server=http.createServer((request,response)=>{
  const path=new URL(request.url,'http://localhost').pathname;
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
  assert.equal(await page.locator('.mc-look-card[data-mood-id]').count(),12);
  assert.equal(await page.locator('#mc-look-dialog').count(),1);
  const grid=await page.evaluate(()=>{
    const gallery=document.querySelector('.mc-look-grid'),photo=gallery.querySelector('.mc-look-photo').getBoundingClientRect();
    return {columns:getComputedStyle(gallery).gridTemplateColumns.split(' ').length,width:photo.width,height:photo.height,top:photo.top};
  });
  assert.equal(grid.columns,4);
  assert.ok(grid.width>=200&&grid.height>=250);
  assert.ok(grid.top<900,'The first image row should be visible without scrolling');
  assert.equal(await page.locator('.mc-workspace').count(),0,'Explore has no duplicate Mood Creator workbench');
  pass('Explore Moods shows twelve big looks on a dedicated page');

  await page.locator('.mc-look-card[data-mood-id="dreamcore"]').click();
  assert.equal(await page.locator('#mc-look-dialog').evaluate(el=>el.open),true);
  assert.equal((await page.locator('#mc-look-title').innerText()).trim(),'Dreamcore');
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

  await page.goto(origin+'/lab/explore-moods.html',{waitUntil:'domcontentloaded'});
  await page.locator('.mc-look-card[data-mood-id="hong-kong-nights"]').click();
  await page.locator('#mc-look-direction').fill('Portrait with deep cinematic shadows');
  await page.locator('#mc-look-file').setInputFiles({name:'source.png',mimeType:'image/png',buffer:png});
  assert.equal(await page.locator('#mc-look-file-clear').isVisible(),true);
  await page.locator('#mc-look-continue').click();
  await page.waitForURL(u=>u.pathname.endsWith('/lab/studio.html'),{timeout:16000});
  const url=new URL(page.url());
  assert.equal(url.searchParams.get('mood'),'hong-kong-nights');
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
  pass('Single-use photo handoff to Image does not submit or charge');

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
  await mobile.close();await context.close();
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
console.log('PV Lab Explore / Mood Creator browser checks: '+successes+' passed (synthetic API).');
