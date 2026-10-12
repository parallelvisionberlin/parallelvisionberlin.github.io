const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('node:assert/strict');
const root=process.cwd();
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const rel=url.pathname.replace(/^\//,'')+(url.pathname.endsWith('/')?'index.html':'');
 const f=path.join(root,rel);
 if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));
});
(async()=>{
 await new Promise(r=>server.listen(8766,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const [width,height] of [[1440,1000],[390,844],[320,740],[768,1024]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:8766/lab/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  await page.locator('.hero-poster').evaluate(img=>img.decode());
  assert.equal(await page.locator('h1').textContent(),'PV LAB');
  assert.equal(await page.locator('.start-link').getAttribute('href'),'./studio.html?tool=image');
  assert.deepEqual(await page.locator('.studio-tool-link').evaluateAll(els=>els.map(el=>el.getAttribute('href'))),['./studio.html?tool=image','./studio.html?tool=video','./studio.html?tool=upscale']);
  assert.deepEqual(await page.locator('.landing-header nav a').allTextContents(),['Image','Video','Upscaler','Explore Moods','Pricing']);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No overflow at '+width);
  assert.equal(await page.locator('.hero-poster').evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await page.locator('#motion-toggle').count(),0);
  const current=await page.locator('.hero-poster').evaluate(el=>el.currentSrc);
  assert.ok(current.endsWith(width<=700?'/leather-editorial/hero-mobile.webp':'/leather-editorial/hero-desktop.webp'),'Approved editorial portrait matches the viewport');
  assert.equal(await page.locator('#pv-hero-motion').count(),0,'The selected still hero does not request an old hero video');
  assert.equal(await page.locator('#hero-motion-toggle').count(),0,'The still hero needs no playback control');
  await page.locator('#tools').scrollIntoViewIfNeeded();await page.locator('.studio-tool-link img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
  await page.evaluate(()=>scrollTo(0,0));
  if(width===1440||width===390)console.log('SILVER_LANDING_'+width+'='+Buffer.from(await page.screenshot({type:'jpeg',quality:75,fullPage:true})).toString('base64'));
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('http://127.0.0.1:8766/lab/',{waitUntil:'networkidle'});
 for(const card of await page.locator('.studio-tool-link').all()){
 const heading=await card.locator('.studio-tool-head h3').boundingBox(),media=await card.locator('.studio-tool-photo').boundingBox();assert.ok(heading.y+heading.height<=media.y+1,'Titles sit above photographs');
 }
 assert.deepEqual(errors,[]);console.log('PASS editorial landing: responsive portraits, reduced motion, destinations, no overflow and titles above photographs');
 await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1)});
