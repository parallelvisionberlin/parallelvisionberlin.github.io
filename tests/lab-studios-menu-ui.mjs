import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
// Use the actual homepage header/styles and actual menu module, without account or generation runtimes.
const fixture=readFileSync('lab/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script defer src="./studios-menu.js"></script></body>');
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1');
 if(u.pathname==='/lab/menu-fixture.html'){res.setHeader('Content-Type','text/html');res.end(fixture);return}
 const path=resolve(root,'.'+u.pathname);
 if(!path.startsWith(root+'/')||!existsSync(path)){res.statusCode=404;res.end();return}
 try{res.setHeader('Content-Type',({'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream');res.end(readFileSync(path))}catch{res.statusCode=404;res.end()}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('test-results',{recursive:true});
try{
 for(const [width,height,visibleHeight] of [[390,844,666],[320,700,520],[768,1024,820],[1440,900,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<=900,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',route=>route.abort());
  // Reproduce iOS chrome leaving a smaller visual viewport than window.innerHeight.
  await context.addInitScript(value=>{
   const viewport=new EventTarget();Object.assign(viewport,{height:value,offsetTop:0});
   Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
   window.__resizeMenuViewport=(height,offsetTop=0)=>{Object.assign(viewport,{height,offsetTop});viewport.dispatchEvent(new Event('resize'))};
  },visibleHeight);
  await page.goto(base+'/lab/menu-fixture.html',{waitUntil:'domcontentloaded'});
  const trigger=page.getByRole('button',{name:'Studios',exact:true});
  await trigger.click();
  const panel=page.locator('.pv-studios-panel');await panel.waitFor({state:'visible'});
  const measure=()=>panel.evaluate(el=>{
   const box=node=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}};
   return {panel:box(el),scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,head:getComputedStyle(el.querySelector('.pv-studios-panel-head')).display,tiles:[...el.querySelectorAll('.pv-studios-tile')].map(tile=>({tile:box(tile),title:box(tile.querySelector('strong')),caption:box(tile.querySelector('.pv-studios-foot-label'))}))};
  });
  const assertFit=(layout,bottom)=>{
   assert.ok(layout.panel.bottom<=bottom-11,'Panel stays above the visible browser edge at '+width);
   assert.ok(layout.panel.left>=0&&layout.panel.right<=width,'No horizontal menu overflow');
   for(const [i,tile] of layout.tiles.entries()){
    for(const key of ['tile','title','caption']){
     assert.ok(tile[key].top>=layout.panel.top-1&&tile[key].bottom<=layout.panel.bottom+1,'Card '+i+' '+key+' is fully visible at '+width);
    }
   }
   if(width<=900){assert.equal(layout.head,'none');assert.ok(layout.scrollHeight<=layout.clientHeight+1,'Both rows fit without internal scrolling')}
   else{assert.equal(layout.head,'flex');assert.ok(layout.tiles.every(t=>t.tile.height>=365),'Approved tall desktop cards remain')}
  };
  assertFit(await measure(),visibleHeight);
  assert.equal(await page.locator('.pv-studios-tile').count(),4);
  assert.deepEqual(await page.locator('.pv-studios-tile strong').allTextContents(),['ALTER','FashionStudio','FullEditorial','RetouchStudio']);
  if(width<=900){
   const shorter=visibleHeight-100;
   await page.evaluate(height=>window.__resizeMenuViewport(height),shorter);
   assertFit(await measure(),shorter);
   await page.evaluate(height=>window.__resizeMenuViewport(height,24),visibleHeight);
   assertFit(await measure(),visibleHeight+24);
   await page.evaluate(height=>window.__resizeMenuViewport(height),visibleHeight);
  }
  await page.screenshot({path:'test-results/beauty-studios-menu-'+width+'.png'});
  await page.keyboard.press('Escape');assert.equal(await panel.isVisible(),false);
  await trigger.focus();await page.keyboard.press('ArrowDown');
  assert.equal(await panel.isVisible(),true);
  assert.equal(await page.locator('.pv-studios-beauty a').evaluate(el=>el===document.activeElement),true,'Keyboard opens at first photo destination');
  await page.keyboard.press('Escape');assert.equal(await panel.isVisible(),false);
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS Studios menu '+width+'x'+height+', visual viewport '+visibleHeight+': all four cards/labels visible, resize, keyboard and no overflow');
 }
}finally{await browser.close();server.close()}
