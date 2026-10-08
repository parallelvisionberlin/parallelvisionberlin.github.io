// Mock-only Lab UI layout verification. Never contacts paid providers.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf("try{const {Clerk}=await import(");
assert.ok(boot>0,'Expected browser bootstrap marker');
const testSource=source.slice(0,boot)+
"clerk={isSignedIn:true,user:{id:'layout-test'},session:{id:'mock',getToken:async()=> 'mock-token'},signOut:async()=>{}};owner=true;userId='layout-test';config={enabled:true,geminiEnabled:true,falEnabled:true,dailyLimitUsd:10,concurrency:{image:4,video:1}};$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();await loadSoulProIdentity();refreshCanvasImport();update();window.__layoutTest=true;";

const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  const file=resolve(root,'.'+u.pathname+(u.pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)]||'text/plain');
  res.end(u.pathname==='/lab/lab.js'?testSource:readFileSync(file));
});
await new Promise(r=>server.listen(4182,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
mkdirSync('test-results',{recursive:true});
const geometry=async page=>page.evaluate(()=>{
  const rect=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,width:r.width};};
  return {
    header:rect('header'),navigation:rect('.tool-switch'),workspace:rect('.workspace'),
    panel:rect('.controls'),scroll:rect('.controls-body'),dock:rect('.controls>.generate-zone'),
    generate:rect('#generate'),stage:rect('.stage'),canvas:rect('.canvas'),
    model:rect('#video-model-control'),modes:rect('#video-modes'),
    viewport:{width:innerWidth,height:innerHeight},
    documentWidth:document.documentElement.scrollWidth,
    scrollMode:getComputedStyle(document.querySelector('.controls-body')).overflowY,
    accent:getComputedStyle(document.querySelector('.mode-tab.active')).backgroundColor,
    heroHidden:getComputedStyle(document.querySelector('#gate')).display==='none',
    explanationCollapsed:!document.querySelector('.model-details').open
  };
});
async function open(width,height){
  const context=await browser.newContext({viewport:{width,height},acceptDownloads:true});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://**/*',async route=>{
    const u=new URL(route.request().url());
    if(!u.hostname.endsWith('parallelvision.workers.dev'))return route.abort();
    const path=u.pathname;
    const content=path==='/api/jobs'?{jobs:[],activeJobs:[],concurrency:{image:4,video:1},next:null}:path==='/api/packs'?{packs:[]}:path==='/api/soul-pro/identity'?{configured:false,count:0,refs:[]}:{};
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(content)});
  });
  await page.goto('http://127.0.0.1:4182/lab/');
  await page.waitForFunction(()=>window.__layoutTest===true);
  return {page,context,errors};
}
try{
  let x=await open(1440,900);
  let d=await geometry(x.page);
  console.log('DESKTOP_LAYOUT',JSON.stringify(d));
  assert.equal(d.heroHidden,true,'Large marketing hero must not appear in signed-in workspace');
  assert.ok(d.navigation.top-d.header.bottom<=2,'Tool tabs start directly under header');
  assert.ok(d.workspace.top-d.navigation.bottom<=3,'No second bar or giant gap before workspace');
  assert.ok(d.workspace.top<140,'Workspace must be above the fold');
  assert.ok(d.dock.height>100&&d.dock.bottom<=d.panel.bottom+2,'Generation controls must have a real fixed dock');
  assert.ok(d.generate.bottom<=d.panel.bottom+2,'Generate dock must remain inside left panel');
  const scrollState=await x.page.evaluate(()=>{window.scrollTo({top:400,behavior:'instant'});return {scroll:window.scrollY,inner:document.querySelector('.controls-body').scrollTop,bodyOverflow:getComputedStyle(document.querySelector('.controls-body')).overflowY};});
  assert.ok(scrollState.scroll>50,'The whole page must scroll');
  assert.equal(scrollState.inner,0,'Editor has no independent vertical scrollbar');
  assert.equal(scrollState.bodyOverflow,'visible');
  await x.page.evaluate(()=>window.scrollTo(0,0));
  assert.ok(d.generate.top>=d.panel.top,'Generate remains visible without scrolling the form');
  assert.equal(d.scrollMode,'visible','Desktop settings must use the page scroll, not a nested scrollbar');
  assert.ok(d.stage.height<=741&&d.canvas.height<650,'Preview never exceeds viewport cap');
  assert.ok(d.modes.top-d.model.bottom<20,'Start/reference buttons directly follow model info');
  assert.equal(d.explanationCollapsed,true);
  assert.ok(await x.page.locator('.brand-icon').evaluate(img=>img.complete&&img.naturalWidth>0),'Official PV icon must load');
  assert.ok(await x.page.locator('.brand-wordmark').evaluate(img=>img.complete&&img.naturalWidth>0),'Official PV wordmark must load');
  assert.equal(await x.page.locator('#lab-boot').isVisible(),false,'Loading screen must disappear after workspace becomes usable');
  assert.equal(await x.page.locator('#gate').isVisible(),false,'Login gate must never flash inside signed-in workspace');
  assert.notEqual(d.accent,'rgb(141, 99, 255)','No default purple selection');
  assert.ok(d.documentWidth<=d.viewport.width,'No horizontal overflow');
  await x.page.screenshot({path:'test-results/lab-workspace-desktop.png',fullPage:false});
  const fileChooser=x.page.waitForEvent('filechooser');
  await x.page.locator('#canvas-import').click();
  const chooser=await fileChooser;
  assert.ok(chooser,'Canvas imports real source files');
  await x.page.click('#tool-image');
  assert.equal(await x.page.locator('#image-model-control').isVisible(),true);
  assert.deepEqual(await x.page.locator('.tool-tab.active').evaluateAll(els=>els.map(e=>e.id)),['tool-image'],'Image tab must visually match active editor');
  assert.notEqual(await x.page.locator('#image-engine').evaluate(e=>getComputedStyle(e).borderTopColor),'rgba(141, 99, 255, 0.34)','Image model select must not retain purple border');
  const packTops=await x.page.evaluate(()=>['pack-load','pack-save','pack-delete'].map(id=>Math.round(document.getElementById(id).getBoundingClientRect().top)));
  assert.equal(new Set(packTops).size,1,'Reference pack actions stay on one aligned row');
  assert.match((await x.page.locator('#canvas-import').innerText()).replace(/\s+/g,' '),/Add references\s+↗/);
  const positions=await x.page.evaluate(()=>({
    soul:document.querySelector('#soul-launch').getBoundingClientRect().top,
    editor:document.querySelector('.workspace').getBoundingClientRect().bottom,
    navTop:document.querySelector('.tool-switch').getBoundingClientRect().top
  }));
  assert.ok(positions.soul>=positions.editor,'Soul promotional section does not block editor');
  await x.page.screenshot({path:'test-results/lab-workspace-image.png',fullPage:false});
  assert.deepEqual(x.errors,[]);
  await x.context.close();
  console.log('PASS desktop workspace, canvas import, image tab and no hero');

  // Verify branded first paint while the JS module is deliberately delayed.
  const bootContext=await browser.newContext({viewport:{width:1440,height:900}});
  const bootPage=await bootContext.newPage();
  await bootPage.route('**/lab/lab.js',async route=>{
    await new Promise(resolve=>setTimeout(resolve,1300));
    await route.continue();
  });
  await bootPage.goto('http://127.0.0.1:4182/lab/',{waitUntil:'commit'});
  await bootPage.waitForSelector('#lab-boot');
  assert.equal(await bootPage.locator('#lab-boot').isVisible(),true,'Brand loading appears before external JS');
  assert.equal(await bootPage.locator('#gate').isVisible(),false,'No half-loaded sign-in page');
  assert.match(await bootPage.locator('#lab-boot-name').innerText(),/PARALLEL VISION/);
  await bootPage.waitForFunction(()=>window.__layoutTest===true);
  assert.equal(await bootPage.locator('#lab-boot').isVisible(),false,'Boot overlay removed on mock auth resolution');
  await bootContext.close();
  console.log('PASS first paint, no broken image loading icon and delayed module');

  x=await open(390,844);
  d=await geometry(x.page);
  console.log('MOBILE_LAYOUT',JSON.stringify(d));
  assert.ok(d.documentWidth<=d.viewport.width,'Mobile must have no horizontal overflow');
  assert.ok(d.workspace.top<135,'Mobile editor appears immediately after tool navigation');
  assert.ok(d.stage.height<=620,'Preview remains bounded on mobile');
  await x.page.locator('#generate').scrollIntoViewIfNeeded();
  assert.equal(await x.page.locator('#generate').isVisible(),true);
  await x.page.screenshot({path:'test-results/lab-workspace-mobile.png',fullPage:true});
  assert.deepEqual(x.errors,[]);
  await x.context.close();
  console.log('PASS mobile responsive layout');
} finally {
  await browser.close();server.close();
}