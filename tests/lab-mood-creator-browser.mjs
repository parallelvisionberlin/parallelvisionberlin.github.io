// Non-billable Mood Creator browser smoke. All account/media/API calls are mocked.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const source=readFileSync('lab/mood-creator.js','utf8');
const start=source.indexOf("  (async()=>{\n    try{\n      const {Clerk}=await import(");
const end=source.indexOf("\n  })();",start);
assert.ok(start>0&&end>start,'Locate Mood Creator authentication bootstrap');
const token='synthetic.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature';
const simulatedBoot="  clerk={isSignedIn:true,user:{id:'test-owner'},session:{id:'test-session',getToken:async()=> '"+token+"'},addListener:()=>{},openSignIn:()=>{},signOut:async()=>{}};\n  void syncAuth();";
const patched=source.slice(0,start)+simulatedBoot+source.slice(end+"\n  })();".length);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'};
const server=http.createServer((req,res)=>{
  const pathName=new URL(req.url,'http://localhost').pathname;
  if(pathName==='/lab/studio.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Image handoff received</title><h1>Image Studio</h1>');return;}
  const file=resolve(root,'.'+pathName+(pathName.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');
  res.end(pathName==='/lab/mood-creator.js'?patched:readFileSync(file));
});
await new Promise(resolve=>server.listen(4191,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
const origin='http://127.0.0.1:4191';
const uuid=n=>'30000000-0000-4000-8000-'+String(n).padStart(12,'0');
const boards=[],requests=[];
async function fillRoutes(context){
  await context.route('https://**/*',async route=>{
    const r=route.request(),u=new URL(r.url()),method=r.method();
    if(u.hostname!=='parallel-vision-lab.parallelvision.workers.dev'){await route.abort();return;}
    requests.push({path:u.pathname,method,body:method==='POST'&&r.headers()['content-type']?.includes('json')?r.postDataJSON():null});
    const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    if(u.pathname==='/api/session')return json({owner:true,ownerId:'test-owner',customer:false,config:{}});
    if(u.pathname==='/api/moodboards'&&method==='GET')return json({moodboards:boards});
    if(u.pathname==='/api/moodboards'&&method==='POST'){
      const data=r.postDataJSON(),record={id:uuid(boards.length+3),...data,createdAt:Date.now(),updatedAt:Date.now()};
      boards.unshift(record);return json({moodboard:record},201);
    }
    if(/^\/api\/moodboards\/[0-9a-f-]{36}$/.test(u.pathname)&&method==='POST'){
      const idx=boards.findIndex(x=>x.id===u.pathname.split('/').at(-1));
      if(idx<0)return json({error:'Not found'},404);
      boards[idx]={...boards[idx],...r.postDataJSON()};
      return json({moodboard:boards[idx]});
    }
    if(u.pathname==='/api/moodboards/analyze'&&method==='POST')return json({
      name:'Liquid Memory',
      direction:'Analog-film haze, source-led pearlescent wet highlights, softly iridescent reflective materials, dimensional atmospheric depth and delicate photochemical halation with natural skin texture.',
      qualities:['wet reflections','soft halation'],palette:['#c4d7d8','#e1bec9']
    });
    return json({error:'Unexpected private test request '+u.pathname},500);
  });
}
let passed=0;
const ok=name=>{passed++;console.log('PASS '+name);};
try{
  const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
  await fillRoutes(context);
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/lab/mood-creator.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('mc-signin').hidden,{timeout:20000});
  assert.equal(await page.locator('.mc-look-card[data-mood-id]').count(),11);
  const layout=await page.evaluate(()=>{
    const grid=document.querySelector('.mc-look-grid'),card=grid.querySelector('.mc-look-card');
    const image=card.querySelector('.mc-look-photo').getBoundingClientRect();
    return {columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,width:image.width,height:image.height,top:image.top};
  });
  assert.equal(layout.columns,4);
  assert.ok(layout.width>=200&&layout.height>=250,'Large curated look card '+JSON.stringify(layout));
  assert.ok(layout.top<900,'First row visible without scrolling');
  ok('Eleven large curated Moods appear immediately');

  await page.locator('.mc-look-card[data-mood-id="dreamcore"]').click();
  assert.equal(await page.locator('#mc-look-dialog').evaluate(el=>el.open),true);
  assert.equal((await page.locator('#mc-look-title').innerText()).trim(),'Dreamcore');
  await page.locator('#mc-look-make').click();
  assert.equal(await page.locator('#mc-base').inputValue(),'dreamcore');
  await page.locator('#mc-name').fill('Pearl Drift');
  await page.locator('#mc-save').click();
  await page.getByRole('button',{name:/Open saved Mood Pearl Drift/}).waitFor();
  assert.equal(boards[0].baseMoodId,'dreamcore');
  assert.equal(boards[0].direction,'');
  assert.equal(boards[0].imageIds.length,0);
  assert.ok((await page.locator('.mc-library-use').getAttribute('href')).includes('moodboard='+boards[0].id));
  ok('Make it yours saves a personal Mood and creates an Image shortcut');

  await page.locator('.mc-look-card[data-mood-id="hong-kong-nights"]').click();
  await page.locator('#mc-look-direction').fill('Portrait with deep cinematic shadows');
  await page.locator('#mc-look-file').setInputFiles({
    name:'source.png',mimeType:'image/png',
    buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9VAAAAABJRU5ErkJggg==','base64')
  });
  assert.equal(await page.locator('#mc-look-file-clear').isVisible(),true);
  await page.locator('#mc-look-continue').click();
  await page.waitForURL(url=>url.pathname.endsWith('/lab/studio.html'),{timeout:16000});
  const next=new URL(page.url());
  assert.equal(next.searchParams.get('mood'),'hong-kong-nights');
  const token=next.searchParams.get('handoff');
  assert.match(token,/^[a-f0-9-]{36}$/i);
  const transfer=await page.evaluate(async id=>{
    const {takeMoodHandoff}=await import('/lab/mood-handoff.js');
    const packet=await takeMoodHandoff(id);
    let replay=false;try{await takeMoodHandoff(id);}catch{replay=true;}
    return {name:packet.file?.name,size:packet.file?.size,prompt:packet.prompt,replay};
  },token);
  assert.equal(transfer.name,'source.png');
  assert.ok(transfer.size>0);
  assert.equal(transfer.prompt,'Portrait with deep cinematic shadows');
  assert.equal(transfer.replay,true);
  assert.ok(!requests.some(x=>/\/api\/(?:jobs|quotes|billing|customer\/image-price)/.test(x.path)));
  ok('Photo and prompt hand off privately once, without billable requests');
  assert.deepEqual(errors,[]);
  await context.close();

  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1});
  await fillRoutes(mobile);
  const phone=await mobile.newPage();
  const mobileErrors=[];phone.on('pageerror',error=>mobileErrors.push(error.message));
  await phone.goto(origin+'/lab/mood-creator.html',{waitUntil:'domcontentloaded'});
  await phone.waitForFunction(()=>document.getElementById('mc-signin').hidden,{timeout:20000});
  const metrics=await phone.evaluate(()=>{
    const grid=document.querySelector('.mc-look-grid');
    const item=grid.querySelector('.mc-look-photo').getBoundingClientRect();
    return {columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,width:item.width,screenWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth};
  });
  assert.equal(metrics.columns,2);
  assert.ok(metrics.width>=145,'Readable mobile cards '+JSON.stringify(metrics));
  assert.ok(metrics.scrollWidth<=metrics.screenWidth+3,'No horizontal overflow '+JSON.stringify(metrics));
  await phone.locator('.mc-look-card[data-mood-id="night-flash"]').click();
  assert.equal(await phone.locator('#mc-look-dialog').evaluate(el=>el.open),true);
  assert.deepEqual(mobileErrors,[]);
  ok('Mobile gallery and quick Mood tray work without horizontal overflow');
  await mobile.close();
}finally{await browser.close();server.close();}
console.log('Mood Creator browser checks: '+passed+' passed; all provider responses synthetic.');
