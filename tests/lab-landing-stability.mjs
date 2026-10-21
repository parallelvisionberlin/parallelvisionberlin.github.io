import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';

const {chromium}=await import(process.env.PV_PLAYWRIGHT_MODULE||'playwright');
const root=resolve('.'),artifacts=resolve(process.env.PV_UI_ARTIFACTS||'/tmp/pv-landing-stability');
await mkdir(artifacts,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.mp4':'video/mp4','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+'/'))return res.writeHead(403).end();
  try{res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));}
  catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const clerkMock=`export class Clerk {
  constructor(){this.isSignedIn=false;this.session={getToken:async()=> 'mock-token'};}
  async load(){await new Promise(resolve=>{
    window.releaseTestAccount=()=>{this.isSignedIn=true;resolve();};
    window.releaseTestGuest=()=>{this.isSignedIn=false;resolve();};
  });}
  addListener(fn){this.listener=fn;}
  async signOut(){this.isSignedIn=false;this.listener?.();}
  openSignIn(options){window.testSignInOpened=true;window.testSignInOptions=options;}
}`;
const selectors=['.landing-header','.landing-header .lab-brand','.landing-header nav','.landing-header .studio-link','.hero-poster','.hero-copy h1','.hero-copy h2','.hero-description','.start-link','.hero-moods-link'];
async function geometry(page){
  return page.evaluate(selectors=>Object.fromEntries(selectors.map(selector=>{
    const el=document.querySelector(selector),box=el.getBoundingClientRect();
    const metrics={x:box.x,y:box.y,width:box.width,height:box.height};
    // Only compare persistent visible copy, not changing account-menu contents.
    if(el.matches('h1,h2,p,a,nav')){
      const range=document.createRange();range.selectNodeContents(el);
      const text=range.getBoundingClientRect();
      Object.assign(metrics,{textWidth:text.width,textHeight:text.height});
    }
    return [selector,metrics];
  })),selectors);
}
function sameFootprint(before,after,label){
  assert.ok(before&&after,label+': missing action geometry');
  for(const key of ['x','y','width','height'])
    assert.ok(Math.abs(before[key]-after[key])<1,
      label+': '+key+' moved from '+before[key]+' to '+after[key]);
}
function stable(before,after,label){
  for(const selector of selectors)for(const key of Object.keys(before[selector])){
    // Hero wording and geometry must stay identical through authorization.
    assert.ok(Math.abs(before[selector][key]-after[selector][key])<.5,`${label}: ${selector} ${key} moved from ${before[selector][key]} to ${after[selector][key]}`);
  }
}
try{
  for(const [width,height] of [[1912,912],[1440,1000],[768,1024],[390,844],[320,740]]){
    for(const slowFont of [true,false]){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      let releaseFonts;
      const fontGate=slowFont?new Promise(r=>releaseFonts=r):Promise.resolve();
      const holdCustomerSession=width===1440&&!slowFont;
      let releaseSession;
      const customerSessionGate=holdCustomerSession?new Promise(r=>releaseSession=r):null;
      await page.route('**/*.woff2',async route=>{
        await fontGate;
        await route.fulfill({contentType:'font/woff2',body:await readFile(resolve(root,'.'+new URL(route.request().url()).pathname))});
      });
      await page.route('https://**/*',async route=>{
        const url=new URL(route.request().url());
        if(url.hostname==='esm.sh')return route.fulfill({contentType:'text/javascript',body:clerkMock});
        if(url.hostname==='clerk.parallelvisionlabel.com')return route.fulfill({contentType:'text/javascript',body:'window.__internal_ClerkUICtor=class{};'});
        if(url.hostname==='parallel-vision-lab.parallelvision.workers.dev'&&url.pathname==='/api/session'){
          if(customerSessionGate)await customerSessionGate;
          return route.fulfill({contentType:'application/json',body:JSON.stringify({customer:true,ownerId:'test-owner',balanceCredits:1200,billingReady:false})});
        }
        return route.abort();
      });
      await page.goto(origin+'/lab/',{waitUntil:'domcontentloaded'});
      assert.equal(await page.locator('#lab-header-signin').isVisible(),false,'Sign-in does not flash before identity is known');
      assert.equal(await page.locator('.lab-home-credit-placeholder').count(),1,'Neutral credit slot starts in the static HTML');
      assert.equal(await page.locator('.lab-home-avatar-placeholder').count(),1,'Neutral avatar slot starts in the static HTML');
      assert.equal(await page.locator('.lab-home-credit-placeholder').isVisible(),true,'Credit placeholder is visible during Clerk loading');
      assert.equal(await page.locator('.lab-home-avatar-placeholder').isVisible(),true,'Avatar placeholder is visible during Clerk loading');
      assert.equal(await page.locator('#lab-home-credits').isVisible(),false,'Get credits must not flash before we know the user');
      assert.equal(await page.locator('#lab-account-strip').isVisible(),false,'Real account cannot appear before authentication');
      assert.equal(await page.locator('[data-lab-signin]').isVisible(),false,'Google sign-in stays hidden on initial render');
      await page.waitForFunction(()=>typeof window.releaseTestAccount==='function');
      await page.waitForFunction(()=>performance.getEntriesByName('first-contentful-paint').length>0);
      // Let the optional font's short initial block expire before releasing it.
      if(slowFont)await page.waitForTimeout(250);
      else await page.evaluate(()=>document.fonts.ready);
      const initial=await geometry(page);
      const pendingCredit=await page.locator('.lab-home-credit-placeholder').boundingBox();
      const pendingAvatar=await page.locator('.lab-home-avatar-placeholder').boundingBox();
      if(slowFont){
        releaseFonts();
        await page.evaluate(()=>document.fonts.ready);
        await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
        stable(initial,await geometry(page),`${width}: delayed font`);
      }
      assert.ok(await page.evaluate(()=>[...document.fonts].some(font=>font.family==='DM Sans'&&font.status==='loaded')),'Bundled font decoded successfully');
      assert.equal(await page.locator('[data-lab-signin]').isVisible(),false,'Google sign-in stays hidden while the account is loading');
      await page.evaluate(()=>window.releaseTestAccount());
      if(holdCustomerSession){
        // A signed-in identity is not a verified wallet. Keep the neutral
        // outline and never flash Credits or Get credits before the API responds.
        assert.equal(await page.locator('#lab-account-strip').isVisible(),false,'Account menu waits for verified session');
        assert.equal(await page.locator('#lab-home-credits').isVisible(),false,'Credit CTA waits for verified session');
        assert.equal(await page.locator('.lab-home-credit-placeholder').isVisible(),true,'Credit placeholder stays stable during wallet load');
        assert.equal(await page.locator('.lab-home-avatar-placeholder').isVisible(),true,'Avatar slot stays stable during wallet load');
        releaseSession();
      }
      await page.locator('#lab-account-strip').waitFor({state:'visible'});
      await page.locator('#lab-home-credits').waitFor({state:'visible'});
      assert.equal(await page.locator('.lab-home-credit-placeholder').isVisible(),false,'Placeholder disappears only when real credit UI is ready');
      assert.equal(await page.locator('.lab-home-avatar-placeholder').isVisible(),false,'Placeholder disappears only when real avatar is ready');
      sameFootprint(pendingCredit,await page.locator('#lab-home-credits').boundingBox(),width+': balance slot remains fixed');
      sameFootprint(pendingAvatar,await page.locator('#lab-account-strip').boundingBox(),width+': avatar slot remains fixed');
      const actionWeights=await page.evaluate(()=>({
        studio:Number.parseInt(getComputedStyle(document.querySelector('.landing-header--home .studio-link')).fontWeight,10),
        credits:Number.parseInt(getComputedStyle(document.querySelector('.landing-header--home .lab-home-credits')).fontWeight,10)
      }));
      assert.ok(actionWeights.studio>=600&&actionWeights.credits>=600,'Home actions use true semi-bold weights');
      // The avatar and actual balance become ready together.
      await page.waitForFunction(()=>document.querySelector('#lab-home-credit-copy')?.textContent==='1,200',null,{timeout:10000});
      assert.equal(await page.locator('#lab-home-credit-copy').textContent(),'1,200');
      assert.equal(await page.locator('#lab-home-credit-unit').isVisible(),width>560);
      assert.equal(await page.locator('#lab-home-credits').getAttribute('href'),'#pricing');
      assert.equal(await page.locator('#lab-home-upgrade').count(),0);
      assert.equal(await page.locator('[data-lab-signin]').isVisible(),false);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: signed-in header fits viewport`);
      if(!slowFont&&(width===1440||width===390))await page.screenshot({path:resolve(artifacts,`landing-signed-${width}.png`)});
      stable(initial,await geometry(page),`${width}: account recovery`);
      await page.locator('#lab-account-strip>summary').click();
      await page.getByRole('button',{name:'Sign out',exact:true}).click();
      await page.locator('#lab-header-signin').waitFor({state:'visible'});
      assert.equal(await page.locator('.lab-home-credit-placeholder').isVisible(),false,'Guest credit CTA replaces placeholder without moving its slot');
      assert.equal(await page.locator('.lab-home-avatar-placeholder').isVisible(),false,'Guest sign-in replaces placeholder without moving its slot');
      sameFootprint(pendingCredit,await page.locator('#lab-home-credits').boundingBox(),width+': guest credit slot remains fixed');
      sameFootprint(pendingAvatar,await page.locator('#lab-header-signin').boundingBox(),width+': guest sign-in slot remains fixed');
      assert.equal(await page.locator('#lab-home-credits').isVisible(),true,'Guests have a Get credits CTA in the same header slot');
      assert.equal(await page.locator('#lab-home-credit-copy').textContent(),'Get credits');
      assert.equal(await page.locator('.lab-hero [data-lab-signin]').count(),0,'No separate Google button in the hero');
      assert.equal(await page.locator('.hero-welcome').count(),0,'Home no longer advertises welcome credits');
      assert.equal(await page.locator('.lab-pricing-welcome').count(),0,'Promotional pricing block is hidden');
      assert.equal(await page.locator('[data-lab-welcome-start]').count(),0);
      assert.equal(await page.locator('.start-link').textContent(),'Start creating','Hero CTA never changes with login state');
      stable(initial,await geometry(page),`${width}: sign out`);
      await page.locator('#lab-header-signin').click();
      assert.equal(await page.evaluate(()=>window.testSignInOpened),true);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: no horizontal overflow`);
      const heading=await page.locator('#hero-title').boundingBox(),header=await page.locator('.landing-header').boundingBox();
      assert.ok(heading.y>=header.y+header.height,`${width}: heading clears the navigation`);
      assert.equal(await page.evaluate(()=>window.testSignInOptions.forceRedirectUrl),undefined,'Header sign-in stays on the current page');
      assert.deepEqual(errors,[]);
      if(!slowFont&&(width===1440||width===390))await page.screenshot({path:resolve(artifacts,`landing-${width}.png`)});
      // The Studio entries stay legible and actionable at every tested viewport.
      const toolsSection=page.locator('#tools.studio-tools');
      const toolCards=toolsSection.locator('.studio-tool');
      assert.equal(await toolCards.count(),3);
      if(width>=1000){
        const layout=await toolsSection.evaluate(el=>{
          const style=getComputedStyle(el),card=el.querySelector('.studio-tool').getBoundingClientRect();
          return {height:card.height,top:parseFloat(style.paddingTop),bottom:parseFloat(style.paddingBottom)};
        });
        assert.ok(layout.height<=620&&layout.top>=32&&layout.bottom>=40,`${width}: compact cards leave room above and below`);
      }
      for(const [i,tool] of ['image','video','upscale'].entries()){
        const card=toolCards.nth(i);
        await card.scrollIntoViewIfNeeded();
        await card.locator('img').evaluate(img=>img.complete&&img.naturalWidth>0?Promise.resolve():new Promise((resolve,reject)=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',reject,{once:true});}));
        assert.equal(await card.locator('.studio-tool-link').getAttribute('href'),`./studio.html?tool=${tool}`);
        const boxes=await card.evaluate(el=>{
          const card=el.getBoundingClientRect();
          return ['h3','.studio-tool-cta'].map(selector=>{
            const box=el.querySelector(selector).getBoundingClientRect();
            return box.left>=card.left&&box.right<=card.right&&box.top>=card.top&&box.bottom<=card.bottom;
          });
        });
        assert.ok(boxes.every(Boolean),`${width}: tool ${tool} title and action stay within the card`);
      }
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: Studio section has no horizontal overflow`);
      if(!slowFont){
        const detail=toolsSection.locator('[data-detail-zoom]');
        const detailPhoto=toolsSection.locator('.studio-tool--upscale img');
        const beforeZoom=await detailPhoto.boundingBox();
        await detail.focus();await detail.press('End');
        const afterZoom=await detailPhoto.boundingBox();
        assert.ok(afterZoom.width>beforeZoom.width*1.2,`${width}: detail control magnifies the photograph`);
        await detail.press('Home');
        assert.equal(await detail.getAttribute('aria-valuetext'),'1.0 times magnification');
        await detail.evaluate(el=>{el.value=el.defaultValue;el.dispatchEvent(new Event('input',{bubbles:true}));});
        if(width===1440||width===390)await toolsSection.screenshot({path:resolve(artifacts,`studio-tools-${width}.png`)});
        if(width===1440){
          const motionVideo=toolsSection.locator('.studio-tool-video');
          assert.equal(await motionVideo.getAttribute('src'),null,'Reduced motion does not download the video');
          await page.emulateMedia({reducedMotion:'no-preference'});
          await page.waitForFunction(()=>{const v=document.querySelector('.studio-tool-video');return v.readyState>=2&&!v.paused&&v.currentTime>.1;});
          assert.equal(await motionVideo.evaluate(v=>v.videoHeight),1080,'Fashion preview retains HD detail');
          assert.equal(await toolsSection.locator('.studio-motion-toggle').getAttribute('aria-pressed'),'true');
          await toolsSection.getByRole('button',{name:'Pause motion preview'}).click();
          assert.equal(await motionVideo.evaluate(v=>v.paused),true);
          assert.equal(await toolsSection.locator('.studio-motion-toggle').getAttribute('aria-pressed'),'false');
          await toolsSection.getByRole('button',{name:'Play motion preview'}).click();
          await page.waitForFunction(()=>!document.querySelector('.studio-tool-video').paused);
          assert.equal(await motionVideo.evaluate(v=>v.muted&&v.loop&&v.playsInline),true);
          await page.emulateMedia({reducedMotion:'reduce'});
          await page.waitForFunction(()=>document.querySelector('.studio-tool-video').paused);
          assert.equal(await motionVideo.evaluate(v=>v.paused),true);
        }
      }
      // A guest can reach the real Image presentation before signing in.
      // The private app, generation API and wallet remain behind verified auth.
      await page.locator('.start-link').click();
      await page.waitForURL(/\/lab\/studio\.html\?tool=image&welcome=1/);
      await page.waitForFunction(()=>typeof window.releaseTestGuest==='function');
      await page.evaluate(()=>window.releaseTestGuest());
      await page.locator('#gate.pv-guest-image').waitFor({state:'visible'});
      await page.locator('#signin').waitFor({state:'visible'});
      assert.deepEqual(await page.locator('#pv-guest-cards .pv-guest-card').evaluateAll(cards=>cards.map(card=>card.dataset.guestMood)),
        ['dream-blur','90s-cinema','fashion-editorial','fisheye-2000','chrome-couture','hong-kong-nights','dreamcore','80s-film'],
        'Guest Image Studio retains the eight approved looks, including Fisheye 2000');
      assert.equal(await page.locator('#app').isVisible(),false,'Private workspace remains closed');
      assert.match(await page.locator('#pv-guest-title').innerText(),/Start with a feeling/i);
      await page.locator('[data-guest-mood="dream-blur"]').click();
      assert.match(await page.locator('#pv-guest-prompt').inputValue(),/motion blur/i,
        'Dream Blur should provide a real motion-blur photographic direction even when its curated wording rotates');
      assert.equal(await page.locator('[data-guest-mood="dream-blur"]').getAttribute('aria-pressed'),'true');
      await page.locator('#pv-guest-generate').click();
      assert.equal(await page.evaluate(()=>window.testSignInOpened),true,
        'Only Generate or explicit Sign in opens Clerk');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
        `${width}: guest Image page stays within viewport`);
      if(!slowFont&&(width===1440||width===390))
        await page.screenshot({path:resolve(artifacts,`image-public-${width}.png`),fullPage:true});
      console.log(`PASS ${width}x${height}: ${slowFont?'delayed':'ready'} font, account recovery, sign out, navigation and hero geometry`);
      await context.close();
    }
  }
}catch(error){
  const page=browser.contexts().at(-1)?.pages().at(-1);
  if(page)await page.screenshot({path:resolve(artifacts,'failure.png'),timeout:1500}).catch(()=>{}); // Do not conceal the real assertion if fonts are still blocked.
  throw error;
}finally{await browser.close();await new Promise(r=>server.close(r));}


