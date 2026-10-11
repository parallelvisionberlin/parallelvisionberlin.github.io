// PV Lab Mood Creator masthead verification. Browser and page are local;
// no account, credits or AI provider calls are required.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const studio=readFileSync('lab/studio.html','utf8');
const start=studio.indexOf('<header id="studio-header"');
const end=studio.indexOf('</header>',start);
assert.ok(start>0&&end>start,'Real PV Lab header is present');
const header=studio.slice(start,end+'</header>'.length);
const html='<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  +'<base href="/lab/">'
  +'<link rel="stylesheet" href="/lab/lab.css"><link rel="stylesheet" href="/lab/studio.css">'
  +'<link rel="stylesheet" href="/lab/assets.css">'
  +'</head><body>'+header+'<main id="main" class="wrap"><div id="app" aria-label="Test studio"></div></main></body></html>';
const mime={'.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const root=resolve('.');
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/test'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);return;
  }
  const target=resolve(root,'.'+pathname);
  if(!target.startsWith(root+'/')||!existsSync(target)){
    res.writeHead(404).end();return;
  }
  res.writeHead(200,{'Content-Type':mime[extname(target)]||'application/octet-stream'});
  res.end(readFileSync(target));
});
await new Promise(done=>server.listen(4193,'127.0.0.1',done));
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
  await page.goto('http://127.0.0.1:4193/test',{waitUntil:'domcontentloaded'});
  // In the real studio, the Queue control appears after session setup.
  await page.evaluate(()=>document.getElementById('active').hidden=false);
  await page.waitForFunction(()=>[...document.querySelectorAll('#studio-header .brand img')].every(img=>img.complete&&img.naturalWidth>0));
  assert.deepEqual(await page.locator('#studio-header .tool-group>button').allTextContents(),
    ['Image','Retouch','Video','Upscaler','Fashion'],
    'Five text tools remain; Assets is a separate icon');
  const moodLinks=page.locator('#studio-header .tool-group>a.tool-link');
  assert.deepEqual(await moodLinks.allTextContents(),['Moods','Mood Creator']);
  assert.equal(await page.locator('#tool-explore-moods').getAttribute('href'),'./explore-moods.html');
  assert.equal(await page.locator('#tool-mood-creator').getAttribute('href'),'./mood-creator.html');
  assert.equal(await page.locator('#studio-header .studio-mood-link').count(),0,
    'Old navigation link is removed');
  const icon=page.locator('#studio-header .actions>.studio-assets-icon');
  assert.equal(await icon.count(),1,'One Assets icon appears in the right masthead');
  assert.equal(await icon.getAttribute('id'),'tool-assets');
  assert.equal(await icon.getAttribute('aria-label'),'Open Assets');
  assert.equal(await icon.locator('svg[aria-hidden="true"]').count(),1);
  await page.setViewportSize({width:1440,height:900});
  await icon.hover();await page.waitForTimeout(230);
  const tooltip=await icon.evaluate(el=>({
    text:getComputedStyle(el,'::after').content,
    opacity:Number(getComputedStyle(el,'::after').opacity)
  }));
  assert.ok(tooltip.text.includes('Assets')&&tooltip.opacity>.9,
    'Icon explains itself with a small hover label '+JSON.stringify(tooltip));
  mkdirSync('test-results',{recursive:true});
  await page.screenshot({path:'test-results/pv-mood-icon-desktop.png'});
  const sizes=[1920,1440,1100,900,899,768,390,360,320];
  for(const width of sizes){
    await page.setViewportSize({width,height:900});
    const size=await page.evaluate(()=>{
      const rect=selector=>{
        const el=document.querySelector(selector),r=el.getBoundingClientRect();
        return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
      };
      const icon=document.querySelector('.studio-assets-icon');
      const style=getComputedStyle(icon);
      return {viewport:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,
        header:rect('#studio-header'),brand:rect('#studio-header .brand'),
        nav:rect('#studio-header .tool-switch'),fashion:rect('#tool-fashion'),
        actions:rect('#studio-header .actions'),
        icon:rect('.studio-assets-icon'),moodCreator:rect('#tool-mood-creator'),queue:rect('#active>summary'),
        account:rect('#studio-header .account-menu>summary'),
        border:style.borderTopWidth,display:style.display,
        iconText:icon.innerText};
    });
    assert.ok(size.overflow<=3,'No horizontal document overflow '+width+' '+JSON.stringify(size));
    assert.ok(size.icon.width>=32&&size.icon.height>=32&&size.border!=='0px',
      'The Assets icon stays a comfortable hit target '+width+' '+JSON.stringify(size));
    assert.ok(size.display==='inline-grid'||size.display==='grid','Icon is visible in signed-in studio at '+width);
    assert.ok(size.icon.right<=size.queue.x+1&&size.queue.right<=size.account.x+1,
      'Assets stays before Queue and Account '+width+' '+JSON.stringify(size));
    assert.ok(size.actions.right<=width+2,'Account controls stay on screen at '+width);
    if(width>=900){
      assert.ok(size.nav.right<=size.actions.x+2,
        'Navigation is contained before Queue/Account at '+width+' '+JSON.stringify(size));
      if(width>1250)assert.ok(size.moodCreator.right<=size.icon.x+1,
        'Desktop Mood Creator link ends before Assets at '+width);
      assert.ok(Math.abs(size.header.height-70)<=2,'Desktop header remains 70px tall');
    }else{
      assert.ok(size.brand.right<=size.actions.x+2,
        'Brand does not overlap Mood/Queue/Account at '+width+' '+JSON.stringify(size));
      assert.ok(Math.abs(size.header.height-100)<=2,
        'Mobile two-row header retains its existing height at '+width);
    }
    if(width===390){
      await page.mouse.move(3,600);
      await page.screenshot({path:'test-results/pv-mood-icon-mobile.png'});
    }
    if(width===320){
      await page.mouse.move(3,600);
      await page.screenshot({path:'test-results/pv-mood-icon-320.png'});
    }
  }
  assert.deepEqual(errors,[],'No browser script errors');
  console.log('PASS original tools, Assets icon, two Mood destinations, and nine breakpoints');
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
