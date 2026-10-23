// Mobile Image welcome: selecting a Mood must reveal Generate, not summon a keyboard.
// Uses the real published HTML, CSS and local scripts with authentication mocked away.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
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
  if(!path.startsWith(root+sep)||!existsSync(path)){res.writeHead(404).end();return;}
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
    assert.equal(await page.locator('.pv-guest-card').count(),8);
    const height=await page.locator('.pv-guest-card').first().evaluate(e=>e.getBoundingClientRect().height);
    assert.ok(height>185&&height<216,'390px phone keeps the cards about 15% shorter: '+height);
    const forward=page.locator('#gate .inspiration-nav-next');
    await forward.waitFor({state:'visible'});
    await forward.click();
    await page.waitForFunction(()=>document.getElementById('pv-guest-cards').scrollLeft>30);
    await page.locator('#gate .inspiration-nav-prev').click();
    await page.waitForFunction(()=>document.getElementById('pv-guest-cards').scrollLeft<5);
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
    assert.ok(state.composerTop>=76&&state.composerTop<300,
      'Selection brings the prompt into view below the compact header: '+JSON.stringify(state));
    assert.ok(state.generateBottom<=state.viewportHeight+2,
      'Generate must also be visible after selecting a Mood: '+JSON.stringify(state));
    assert.ok(state.headerHeight<=80&&state.headerHeight>=76,
      'The compact mobile header retains its existing tool navigation: '+JSON.stringify(state));
    assert.ok(state.documentWidth<=390+1,'Mobile Image entry must not overflow horizontally');
    assert.deepEqual(errors,[],'Guest preview should not throw script errors');
    console.log('MOBILE_GUEST_MOOD_NO_KEYBOARD=1 '+JSON.stringify(state));
  }finally{await context.close();}
  ({page,context,errors}=await openViewport(1440,900));
  try{
    const oldDesktopHeight=await page.locator('.pv-guest-card').first().evaluate(e=>e.getBoundingClientRect().height);
    assert.ok(oldDesktopHeight>=275,'Desktop card geometry remains unchanged');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(()=>document.getElementById('pv-guest-cards').scrollLeft>30);
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(()=>document.getElementById('pv-guest-cards').scrollLeft<4);
    const guest=page.locator('#pv-guest-composer');
    const field=page.locator('#pv-guest-prompt');
    for(const id of ['tool-image','tool-video','tool-upscale','tool-retouch','tool-fashion','tool-explore-moods'])
      assert.equal(await page.locator('#'+id).isVisible(),true,'The original public navigation stays visible: '+id);
    const originalFrame=await guest.boundingBox();
    await page.evaluate(()=>{window.__navSignIns=0;document.getElementById('signin').addEventListener('click',()=>window.__navSignIns++);});
    await page.locator('#tool-video').click();
    assert.equal(new URL(page.url()).searchParams.get('tool'),'video');
    assert.equal(await page.locator('#pv-guest-title').innerText(),'Video Studio');
    assert.equal(await page.locator('#pv-guest-selected-tool').isVisible(),false,
      'The Image-only fixture must never reintroduce the generic gate; full tool decks are covered in lab-public-studio-ui');
    assert.equal(await page.locator('#pv-guest-composer').isVisible(),false,'Video must never reuse the Image deck');
    assert.equal(await page.evaluate(()=>window.__navSignIns),0,'Examining another tool does not force sign in');
    await page.locator('#tool-image').click();
    assert.equal(await page.locator('#pv-guest-title').innerText(),'Start with a feeling.');
    assert.deepEqual(await guest.boundingBox(),originalFrame,'Returning through the original menu preserves the approved Image deck');
    assert.equal(await page.locator('#auth-status').innerText(),'','Remove the default sign-in sentence, retaining the status element for actual errors');

    assert.equal(await guest.evaluate(el=>el.classList.contains('pv-deck-expanded')),false,
      'Signed-out first paint keeps the small approved prompt');
    for(const id of ['pv-guest-library','pv-guest-base','pv-guest-resolution'])
      assert.equal(await page.locator('#'+id).isVisible(),true,'Compact guest keeps its visible tool '+id);
    await field.click();
    assert.equal(await guest.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
      'Clicking a guest prompt opens the full two-row editor without an inner frame');
    for(const id of ['pv-guest-library','pv-guest-base','pv-guest-resolution'])
      assert.equal(await page.locator('#'+id).isVisible(),true,'Opening the lower portion exposes '+id);
    const emptyFocus=await field.evaluate(el=>{
      const input=getComputedStyle(el),box=el.getBoundingClientRect();
      return {outline:input.outlineStyle,border:input.borderTopWidth,
        shadow:input.boxShadow,height:box.height};
    });
    assert.equal(emptyFocus.outline,'none','Guest caret needs no nested focus rectangle');
    assert.equal(emptyFocus.border,'0px','Guest textarea must not draw an interior border');
    assert.equal(emptyFocus.shadow,'none');
    assert.ok(emptyFocus.height>=50&&emptyFocus.height<=150,
      'Expanded empty input is useful, never an oversized empty inner box: '+JSON.stringify(emptyFocus));
    await field.fill('A quiet portrait in Berlin');
    assert.equal(await guest.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
      'An edited brief prompt retains the genuine two-row instrument');
    await field.fill('');
    const beforeMoodUrl=page.url();
    await page.locator('#pv-guest-moods').click();
    assert.equal(page.url(),beforeMoodUrl,'Moods must stay on the guest page, not navigate away');
    assert.equal(await page.evaluate(()=>document.activeElement?.dataset.guestMood),'dream-blur',
      'The Moods control should point to the existing Inspiration cards');
    await page.locator('[data-guest-mood="dream-blur"]').click();
    assert.notEqual(await page.evaluate(()=>document.activeElement?.id),'pv-guest-prompt',
      'Picking a guest Mood must not force text focus or the virtual keyboard');
    assert.equal(await guest.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
      'Real multi-line Mood content opens the matching two-row editor');
    const grid=await page.evaluate(()=>{
      const get=id=>document.getElementById(id).getBoundingClientRect();
      const deck=get('pv-guest-composer'),editor=get('pv-guest-prompt'),
        settings=document.querySelector('.pv-guest-settings').getBoundingClientRect(),
        generate=get('pv-guest-generate');
      return {display:getComputedStyle(document.getElementById('pv-guest-composer')).display,
        height:deck.height,promptRight:editor.right,generateLeft:generate.left,
        settingsTop:settings.top,editorBottom:editor.bottom,settingsRight:settings.right,
        generateBottom:generate.bottom,deckBottom:deck.bottom,
        maxScroll:document.documentElement.scrollWidth-innerWidth};
    });
    assert.equal(grid.display,'grid','The public long prompt uses the real two-row deck layout');
    assert.ok(grid.height>=105&&grid.height<260,
      'Expanded guest deck must fit its prompt, not create an oversized blank box: '+JSON.stringify(grid));
    assert.ok(grid.promptRight<grid.generateLeft&&
      grid.editorBottom<=grid.settingsTop+3&&
      grid.settingsRight<grid.generateLeft&&grid.generateBottom<=grid.deckBottom+2,
      'Guest prompt, toolbar and Generate must occupy real nonoverlapping rows: '+JSON.stringify(grid));
    assert.ok(grid.maxScroll<=3,'Expanded guest dock must not introduce horizontal overflow');
    await field.click();
    await page.keyboard.press('ArrowRight');
    assert.ok(await page.locator('#pv-guest-cards').evaluate(el=>el.scrollLeft)<4,
      'Arrow keys edit guest text without moving the photo carousel');
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'pv-guest-prompt');
    await field.fill('Visual poetry in an everyday street. '.repeat(45));
    assert.equal(await field.evaluate(el=>el.scrollHeight>el.clientHeight),true,
      'Long guest prompts scroll inside the writing area, not an extra nested box');
    await field.fill('');
    assert.equal(await guest.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
      'Desktop public editor follows the same focused-empty state as the real editor');
    await page.locator('#pv-guest-title').click();
    await page.waitForFunction(()=>!document.getElementById('pv-guest-composer').classList.contains('pv-deck-expanded'));
    await field.fill('A long portrait instruction. '.repeat(12));
    await page.evaluate(()=>{
      const signIn=document.getElementById('signin');
      signIn.disabled=false;
      window.__guestSignInClicks=0;
      signIn.addEventListener('click',()=>window.__guestSignInClicks++);
    });
    const photoInput=page.locator('#pv-guest-image-file');
    await photoInput.setInputFiles({
      name:'guest-preview.png',mimeType:'image/png',
      buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/mAAAAABJRU5ErkJggg==','base64')
    });
    assert.equal(await page.evaluate(()=>window.__guestSignInClicks),0,
      'Selecting a local photo never triggers sign in or upload');
    assert.equal(await page.locator('#pv-guest-attachments .pv-guest-photo').count(),1,
      'Guest image preview is visible above the composer tools');
    assert.equal(await guest.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
      'A chosen photograph opens the expanded composer without hiding its toolbar');
    for(const id of ['pv-guest-library','pv-guest-model','pv-guest-retouch','pv-guest-ratio','pv-guest-resolution','pv-guest-count','pv-guest-exact']){
      const before=await page.evaluate(()=>window.__guestSignInClicks);
      await page.locator('#'+id).click();
      assert.equal(await page.evaluate(()=>window.__guestSignInClicks),before+1,
        id+' must invoke the shared real sign-in entry');
      assert.equal(page.url(),beforeMoodUrl,'Account tools must not redirect into unrelated pages');
    }
    await page.evaluate(()=>window.__guestSignInClicks=0);
    await page.locator('#pv-guest-generate').click();
    assert.equal(await page.evaluate(()=>window.__guestSignInClicks),1,
      'Only Generate from the guest deck requests sign-in; no paid request');
    assert.equal(await page.locator('#studio-header').evaluate(e=>e.classList.contains('pv-mobile-entry-condensed')),false);
    assert.deepEqual(errors,[]);
    console.log('DESKTOP_WELCOME_UNCHANGED=1');
  }finally{await context.close();}
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
