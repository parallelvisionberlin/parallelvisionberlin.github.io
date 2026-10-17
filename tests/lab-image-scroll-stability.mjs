// Mock-only Image Studio loading regression. No authentication, generation or paid calls.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(process.env.PV_PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href : 'playwright');
const source=readFileSync('lab/studio.html','utf8');
assert.match(source,/@media\(min-width:761px\)\{html:has\(#app\.image-studio-active\)\{scrollbar-gutter:stable\}\}/,
  'Image mode must reserve root scrollbar space while the splash is visible');
const root=resolve('.');
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
  try{
    const mime={'.html':'text/html','.css':'text/css','.svg':'image/svg+xml',
      '.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg',
      '.webp':'image/webp','.avif':'image/avif'};
    const bytes=await readFile(file);
    res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
    res.end(bytes);
  }catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const snapshot=page=>page.evaluate(()=>{
  const root=document.documentElement;
  const composer=document.getElementById('image-composer')?.getBoundingClientRect();
  const gallery=document.getElementById('image-gallery-host')?.getBoundingClientRect();
  return {
    innerWidth,clientWidth:root.clientWidth,scrollHeight:root.scrollHeight,
    scrollY:scrollY,rootOverflow:getComputedStyle(root).overflowY,
    gutter:getComputedStyle(root).scrollbarGutter,
    composerLeft:composer?.left,composerWidth:composer?.width,
    galleryLeft:gallery?.left,galleryWidth:gallery?.width
  };
});
try{
  for(const [width,height] of [[1440,900],[390,844]]){
    const context=await browser.newContext({viewport:{width,height}});
    const page=await context.newPage();
    // Real markup and CSS; prevent running Clerk, galleries and any API modules.
    await page.route(/\.js(?:\?.*)?$/,route=>route.fulfill({
      status:200,contentType:'application/javascript',body:''
    }));
    await page.route('https://**/*',route=>route.abort());
    await page.goto(origin+'/lab/studio.html?tool=image',{waitUntil:'load'});
    await page.locator('#image-gallery-host').waitFor({state:'attached'});
    await page.evaluate(()=>{
      const root=document.documentElement;
      root.classList.add('pv-studio-route-pending');
      const app=document.getElementById('app');
      app.hidden=false;app.classList.add('image-studio-active');
      document.getElementById('image-studio').hidden=false;
      const tall=document.createElement('div');
      tall.id='layout-probe-history';
      tall.style.height='1800px';
      document.getElementById('image-gallery-host').append(tall);
    });
    const locked=await snapshot(page);
    assert.equal(locked.rootOverflow,'hidden','Splash keeps document scrolling locked');
    assert.equal(locked.gutter,width>=761?'stable':'auto','Image mode reserves scrollbar space on desktop, not mobile');
    assert.ok(locked.scrollHeight>height,'Simulated Image History requires page scrolling');
    assert.equal(locked.scrollY,0,'The page starts at the top');

    await page.evaluate(()=>{
      document.documentElement.classList.remove('pv-studio-route-pending');
      window.__pvLabFinishBoot();
    });
    await page.waitForFunction(
      ()=>!document.documentElement.classList.contains('pv-studio-boot-lock'),null,{timeout:3000});
    const ready=await snapshot(page);
    assert.notEqual(ready.rootOverflow,'hidden','Normal scrolling resumes on readiness');
    assert.equal(ready.gutter,width>=761?'stable':'auto','Scrollbar treatment stays unchanged after the splash');
    for(const key of ['clientWidth','composerLeft','composerWidth','galleryLeft','galleryWidth']){
      assert.ok(Number.isFinite(locked[key])&&Number.isFinite(ready[key])&&
        Math.abs(locked[key]-ready[key])<=1,
        width+'px: '+key+' changed while boot unlocked: '+locked[key]+' -> '+ready[key]);
    }
    assert.equal(ready.scrollY,0,'Unlock does not scroll Image Studio');
    if(width<761){
      assert.ok(Math.abs(ready.composerLeft+ready.composerWidth/2-width/2)<=2,
        'On mobile the floating composer stays centered without a reserved scrollbar');
    }

    await page.evaluate(()=>{
      document.getElementById('layout-probe-history').style.height='2800px';
    });
    const filled=await snapshot(page);
    assert.ok(filled.scrollHeight>ready.scrollHeight,'History can expand after the boot');
    assert.equal(filled.clientWidth,ready.clientWidth,'Late History cannot change page width');
    assert.ok(Math.abs(filled.galleryWidth-ready.galleryWidth)<=1,
      'Late History cannot stretch the image gallery sideways');
    assert.ok(Math.abs(filled.composerLeft-ready.composerLeft)<=1,
      'Floating composer does not move while History finishes loading');
    assert.equal(filled.scrollY,0,'Late History does not automatically scroll the page');

    await page.evaluate(()=>{
      const app=document.getElementById('app');
      app.classList.remove('image-studio-active');
      app.classList.add('video-studio-active');
    });
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollbarGutter),
      width>=761?'stable':'auto',
      'Video retains the loading scrollbar gutter to prevent the preview and inspector jumping right');
    await page.evaluate(()=>{
      const app=document.getElementById('app');
      app.classList.remove('video-studio-active');
      app.classList.add('upscale-studio-active');
    });
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollbarGutter),
      'auto','Upscaler and other Studio routes keep their original scrollbar behavior');
    console.log('PASS Image Studio '+width+'x'+height+
      ': stable splash unlock, delayed History and composer geometry',JSON.stringify({locked,ready,filled}));
    await context.close();
  }
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
