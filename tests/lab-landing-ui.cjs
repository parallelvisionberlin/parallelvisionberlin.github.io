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
  assert.deepEqual(await page.locator('.tool-card').evaluateAll(els=>els.map(el=>el.getAttribute('href'))),['./studio.html?tool=image','./studio.html?tool=video','./studio.html?tool=upscale']);
  assert.equal(await page.locator('nav a[href="./fashion.html"]').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No overflow at '+width);
  assert.equal(await page.locator('.hero-poster').evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await page.locator('#motion-toggle').isVisible(),false);
  const current=await page.locator('.hero-poster').evaluate(el=>el.currentSrc);assert.ok(current.includes(width<=700?'silver-daylight-mobile':'silver-daylight-hero'));
  await page.locator('#tools').scrollIntoViewIfNeeded();await page.locator('.tool-card img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
  await page.evaluate(()=>scrollTo(0,0));
  if(width===1440||width===390)console.log('SILVER_LANDING_'+width+'='+Buffer.from(await page.screenshot({type:'jpeg',quality:75,fullPage:true})).toString('base64'));
 }
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>scrollTo(0,0));
 await page.waitForFunction(()=>document.querySelector('.lab-hero').classList.contains('is-visible'));
 await page.locator('#motion-toggle').click();assert.equal(await page.locator('.hero-poster').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
 await page.locator('#motion-toggle').click();assert.equal(await page.locator('.hero-poster').evaluate(el=>getComputedStyle(el).animationPlayState),'running');
 await page.locator('#tools').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.motion-card').classList.contains('is-visible'));
 assert.equal(await page.locator('.motion-card img').evaluate(el=>getComputedStyle(el).animationPlayState),'running');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.motion-card img').evaluate(el=>getComputedStyle(el).animationName),'none');
 assert.deepEqual(errors,[]);console.log('PASS silver landing: images, three destinations, Fashion link, 4 responsive widths, reduced motion and pause control');
 await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1)});
