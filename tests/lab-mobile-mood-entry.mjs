// Mobile Image welcome: selecting a Mood must reveal Generate, not summon a keyboard.
// Uses the real published HTML, CSS and local scripts with authentication mocked away.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const studio=readFileSync('lab/studio.html','utf8');
const signed=readFileSync('lab/lab.js','utf8');
const handler=signed.slice(signed.indexOf('function useWelcomeMood(id)'),signed.indexOf("\n}\ndocument.querySelectorAll('[data-welcome-mood]')",signed.indexOf('function useWelcomeMood(id)')));
assert.match(handler,/window\.matchMedia\('\(max-width:680px\)'\)\.matches/,
  'Authenticated welcome taps must have a mobile-only no-keyboard path');
assert.match(handler,/composerField\.blur\(\)/,
  'Authenticated Mood taps dismiss any already-focused composer textarea');
assert.match(studio,/studio-mobile-entry\.js\?v=/,
  'The compact Image header controller must be loaded on the Studio route');

const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css',
  '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  const path=resolve(root,'.'+pathname);
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');
  res.end(readFileSync(path));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const url='http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=image';
const browser=await chromium.launch({headless:true});
async function openViewport(width,height){
  const context=await browser.newContext({
    viewport:{width,height},isMobile:width<=680,hasTouch:width<=680,
    reducedMotion:'reduce'
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(/\/lab\/[^/]+\.js(?:\?.*)?$/,route=>{
    const pathname=new URL(route.request().url()).pathname;
    if(pathname.endsWith('/studio-guest-image.js')||
       pathname.endsWith('/inspiration-looks.js')||
       pathname.endsWith('/inspiration-carousel.js')||
       pathname.endsWith('/studio-mobile-entry.js')||
       pathname.endsWith('/image-editorial-deck.js'))return route.continue();
    return route.fulfill({status:200,contentType:'text/javascript',body:''});
  });
  await page.route('https://**/*',route=>route.abort());
  await page.goto(url,{waitUntil:'load'});
  await page.evaluate(()=>{
    document.body.classList.add('lab-ready');
    document.documentElement.classList.remove('pv-studio-boot-lock','pv-studio-route-pending');
    document.getElementById('lab-boot').style.display='none';
    document.getElementById('gate').hidden=false;
    document.getElementById('app').hidden=true;
  });
  await page.locator('[data-guest-mood="90s-cinema"]').waitFor({state:'visible'});
  return {page,context,errors};
}
try{
  let {page,context,errors}=await openViewport(390,844);
  try{
    assert.equal(await page.locator('.pv-guest-card').count(),7);
    const height=await page.locator('.pv-guest-card').first().evaluate(e=>e.getBoundingClientRect().height);
    assert.ok(height>185&&height<216,'390px phone keeps the cards about 15% shorter: '+height);
    await page.locator('[data-guest-mood="90s-cinema"]').click();
    assert.match(await page.locator('#pv-guest-prompt').inputValue(),/vinyl records/);
    assert.equal(await page.locator('[data-guest-mood="90s-cinema"]').getAttribute('aria-pressed'),'true');
    assert.notEqual(await page.evaluate(()=>document.activeElement?.id),'pv-guest-prompt',
      'Mood selection must not focus the textarea or open the software keyboard');
    assert.equal(await page.locator('#pv-guest-composer').evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
      'On phones the selected Mood displays its multi-line prompt without keyboard focus');
    assert.ok(await page.locator('#pv-guest-prompt').evaluate(el=>el.getBoundingClientRect().height)>=99,
      'The loaded prompt should be readable on mobile');
    await page.waitForFunction(()=>window.scrollY>250,null,{timeout:4000});
    await page.waitForFunction(()=>document.getElementById('studio-header').classList.contains('pv-mobile-entry-condensed'),null,{timeout:3000});
    const state=await page.evaluate(()=>{
      const composer=document.getElementById('pv-guest-composer').getBoundingClientRect();
      const header=document.getElementById('studio-header').getBoundingClientRect();
      const generate=document.getElementById('pv-guest-generate').getBoundingClientRect();
      return {scrollY,composerTop:composer.top,generateBottom:generate.bottom,headerHeight:header.height,
        viewportHeight:innerHeight,documentWidth:document.documentElement.scrollWidth,
        focusedId:document.activeElement?.id};
    });
    assert.ok(state.composerTop>=42&&state.composerTop<300,
      'Selection brings the prompt into view below the compact header: '+JSON.stringify(state));
    assert.ok(state.generateBottom<=state.viewportHeight+2,
      'Generate must also be visible after selecting a Mood: '+JSON.stringify(state));
    assert.ok(state.headerHeight<=49&&state.headerHeight>=40,
      'PV LAB header should compact on mobile scroll: '+JSON.stringify(state));
    assert.ok(state.documentWidth<=390+1,'Mobile Image entry must not overflow horizontally');
    assert.deepEqual(errors,[],'Guest preview should not throw script errors');
    console.log('MOBILE_GUEST_MOOD_NO_KEYBOARD=1 '+JSON.stringify(state));
  }finally{await context.close();}
  ({page,context,errors}=await openViewport(1440,900));
  try{
    const oldDesktopHeight=await page.locator('.pv-guest-card').first().evaluate(e=>e.getBoundingClientRect().height);
    assert.ok(oldDesktopHeight>=275,'Desktop card geometry remains unchanged');
    await page.locator('[data-guest-mood="dream-blur"]').click();
    assert.notEqual(await page.evaluate(()=>document.activeElement?.id),'pv-guest-prompt',
      'Desktop Mood selection loads the prompt without forcing the expanded editor');
    assert.equal(await page.locator('#pv-guest-composer').evaluate(el=>getComputedStyle(el).flexDirection),'row',
      'Desktop guest deck keeps the single-row compact mockup until editing begins');
    await page.locator('#pv-guest-prompt').click();
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'pv-guest-prompt',
      'Intentional prompt click opens the actual editor');
    assert.equal(await page.locator('#pv-guest-composer').evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
      'Desktop guest prompt expands on intentional click');
    await page.locator('#pv-guest-prompt').fill('Visual poetry in an everyday street. '.repeat(45));
    assert.equal(await page.locator('#pv-guest-prompt').evaluate(el=>el.scrollHeight>el.clientHeight),true,
      'Long guest prompts scroll inside the editor');
    assert.equal(await page.locator('#studio-header').evaluate(e=>e.classList.contains('pv-mobile-entry-condensed')),false);
    assert.deepEqual(errors,[]);
    console.log('DESKTOP_WELCOME_UNCHANGED=1');
  }finally{await context.close();}
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
