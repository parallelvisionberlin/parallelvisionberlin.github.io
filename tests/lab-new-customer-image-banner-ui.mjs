// iPhone Image: synthetic NEW non-owner/customer empty History + zero-credit notice.
// Uses the real Studio HTML/CSS in Chromium; never signs in or calls paid APIs.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';

assert.ok(process.env.PV_PLAYWRIGHT_MODULE,'A Playwright module is required');
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css',
  '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp',
  '.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep)||!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const url='http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=image';
const browser=await chromium.launch({headless:true});

async function run(width,height){
  const context=await browser.newContext({viewport:{width,height},
    isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    // Run the original presentation and responsive header modules only.
    // The real Clerk/Worker/billing JS is intentionally not initialized.
    await page.route(/\/lab\/[^/]+\.js(?:\?.*)?$/,route=>{
      const name=new URL(route.request().url()).pathname;
      if(name.endsWith('/studio-mobile-entry.js')||
         name.endsWith('/mobile-composer-polish.js')||
         name.endsWith('/image-editorial-deck.js'))return route.continue();
      return route.fulfill({status:200,contentType:'text/javascript',body:''});
    });
    await page.route('https://**/*',route=>route.abort());
    await page.goto(url,{waitUntil:'load'});
    await page.evaluate(()=>{
      document.body.classList.remove('lab-booting');
      document.body.classList.add('lab-ready');
      document.documentElement.classList.remove('pv-studio-boot-lock','pv-studio-route-pending');
      const boot=document.getElementById('lab-boot');if(boot)boot.style.display='none';
      const gate=document.getElementById('gate');gate.hidden=true;
      const app=document.getElementById('app');
      app.hidden=false;app.classList.add('image-studio-active');
      app.classList.remove('pv-moods-discovery-open');
      document.getElementById('image-studio').hidden=false;
      document.getElementById('image-gallery-empty').hidden=false;
      document.getElementById('lab-image-empty-intro').hidden=true;
      document.getElementById('lab-welcome-start').hidden=false;
      const composer=document.getElementById('image-composer');
      composer.hidden=false;composer.classList.add('is-seedream');
      document.getElementById('image-composer-references').hidden=true;
      document.getElementById('lab-credit-banner').hidden=true;
    });
    await page.waitForFunction(()=>
      document.getElementById('studio-header').classList.contains('pv-mobile-entry-condensed'));
    await page.evaluate(()=>document.fonts.ready);
    const frame=()=>page.evaluate(()=>{
      const rect=selector=>document.querySelector(selector).getBoundingClientRect();
      const title=rect('#lab-welcome-title'),
        card=rect('#lab-welcome-presets .lab-welcome-preset'),
        deck=rect('#image-composer'),header=rect('#studio-header'),
        banner=rect('#lab-credit-banner');
      return {gap:card.top-title.bottom,cardTop:card.top,
        cardBottom:card.bottom,cardHeight:card.height,
        titleTop:title.top,deckTop:deck.top,deckBottom:deck.bottom,
        headerBottom:header.bottom,bannerTop:banner.top,
        bannerBottom:banner.bottom,
        margin:parseFloat(getComputedStyle(document.querySelector(
          '#lab-welcome-start .lab-welcome-carousel')).marginTop),
        noticePosition:getComputedStyle(document.getElementById('lab-credit-banner')).position,
        scrollY:window.scrollY,documentWidth:document.documentElement.scrollWidth};
    });
    const before=await frame();
    assert.equal(await page.locator('#history .card[data-kind="image"]').count(),0,
      'Synthetic external customer has no saved History and no Owner privileges');
    if(height>=690){
      assert.ok(Math.abs(before.margin+30)<2,
        'Only new/empty-History customer uses the compact carousel margin: '+JSON.stringify(before));
      assert.ok(before.gap>=18&&before.gap<=48,
        'Start with a feeling and photos match the approved compact first-image spacing: '+JSON.stringify(before));
      assert.ok(before.cardBottom<=before.deckTop+3,
        'Full-size photos remain above the existing fixed Generate: '+JSON.stringify(before));
    }else{
      assert.ok(before.margin>=12,'Short phones retain the original first-image spacing');
    }
    assert.ok(before.cardHeight>=185,'The original full-size photography is preserved');
    assert.ok(before.documentWidth<=width+1,'First Image adds no horizontal overflow');

    // Simulate server-VERIFIED 0-credit banner presentation. Real eligibility,
    // same-session dismissal and purchase are covered by account/browser tests.
    await page.evaluate(()=>{document.getElementById('lab-credit-banner').hidden=false;});
    const visible=await frame();
    assert.equal(visible.noticePosition,'fixed','Zero-credit notice remains a floating overlay');
    assert.ok(Math.abs(visible.bannerTop-visible.headerBottom)<=2,
      'Ivory banner begins flush beneath the compact Image header: '+JSON.stringify(visible));
    for(const key of ['titleTop','cardTop','cardHeight','deckTop','deckBottom']){
      assert.ok(Math.abs(visible[key]-before[key])<2,
        'Zero-credit notice must not move '+key+': '+JSON.stringify({before,visible}));
    }
    // Hiding the notice must not move the gallery. No real customer state
    // is simulated beyond a reversible DOM visibility change.
    await page.evaluate(()=>{document.getElementById('lab-credit-banner').hidden=true;});
    const after=await frame();
    for(const key of ['titleTop','cardTop','cardHeight','deckTop','deckBottom']){
      assert.ok(Math.abs(after[key]-before[key])<2,
        'Dismissing notice must not move '+key+': '+JSON.stringify({before,after}));
    }
    assert.ok(await page.locator('#image-composer-generate').isVisible(),
      'Generate is present in the existing fixed Image deck');

    // Opening genuine Inspiration-over-History is a distinct approved state:
    // the new first-image rule must not leak into its old positive margin.
    await page.evaluate(()=>document.getElementById('app').classList.add('pv-moods-discovery-open'));
    const historyMode=await frame();
    assert.ok(historyMode.margin>=12,
      'Existing History Inspiration keeps its own original spacing: '+JSON.stringify(historyMode));
    assert.ok(Math.abs(historyMode.cardHeight-before.cardHeight)<1,
      'The state switch does not resize photographs');
    await page.evaluate(()=>document.getElementById('app').classList.remove('pv-moods-discovery-open'));
    assert.ok(Math.abs((await frame()).cardTop-before.cardTop)<2,
      'Returning to first Image restores the exact compact geometry');
    if(height>=690){
      await page.mouse.wheel(0,500);
      assert.equal(await page.evaluate(()=>window.scrollY),0,
        'The approved mobile first-image frame remains viewport-locked');
    }
    assert.deepEqual(errors,[],'No JS exceptions in synthetic customer');
    mkdirSync('test-results',{recursive:true});
    await page.screenshot({path:'test-results/new-customer-image-'+width+'x'+height+'.png'});
    console.log('PASS_NEW_CUSTOMER_IMAGE '+JSON.stringify({width,height,firstGap:before.gap,
      cardHeight:before.cardHeight,headerBottom:visible.headerBottom,
      bannerTop:visible.bannerTop,historyMargin:historyMode.margin}));
  }finally{
    await context.close();
  }
}

try{
  for(const [width,height] of [[320,740],[390,844],[430,932],[390,600]])
    await run(width,height);
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
