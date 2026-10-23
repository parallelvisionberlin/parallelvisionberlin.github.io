// Synthetic identities and intercepted API responses only; never buys credits.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
const {chromium}=await import(process.env.PV_PLAYWRIGHT_MODULE||'playwright');
const root=resolve('.'),artifacts=resolve(process.env.PV_UI_ARTIFACTS||'test-results/home-credit-banner');
await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+sep))return res.writeHead(403).end();
  try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}
  catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const clerkMock=`export class Clerk {
  constructor(){window.mockClerk=this;this.listeners=[];this.isSignedIn=true;this.user={id:'user_Test',fullName:'Test Creator',hasImage:false};this.session={id:'sess_Test',getToken:async()=> 'synthetic-token'};}
  async load(){} addListener(fn){this.listeners.push(fn);}
  async signOut(){this.isSignedIn=false;this.session=null;this.listeners.forEach(fn=>fn());}
  openSignIn(){throw Error('Banner must not start authentication');}
}`;
const selectors=['.landing-header--home','.landing-header--home nav','#main','.lab-hero','.hero-poster','.hero-copy','.hero-copy h1','.hero-copy h2','.hero-description','.hero-actions','.hero-bottom','#mood-creator','#pricing','.pv-lab-footer'];
async function geometry(page){
  return page.evaluate(selectors=>({
    boxes:Object.fromEntries(selectors.map(selector=>{
      const element=document.querySelector(selector),r=element.getBoundingClientRect(),s=getComputedStyle(element);
      return [selector,{x:r.x,y:r.y,width:r.width,height:r.height,font:s.font,letterSpacing:s.letterSpacing}];
    })),
    pageHeight:document.documentElement.scrollHeight,bodyHeight:document.body.scrollHeight,
    pageWidth:document.documentElement.scrollWidth,scrollX,scrollY,
    photo:document.querySelector('.hero-poster').currentSrc
  }),selectors);
}
const settle=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
try{
  for(const [width,height] of [[1920,1080],[1440,950],[768,1024],[390,844],[320,740]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',isMobile:width<500,hasTouch:width<500});
    const page=await context.newPage(),errors=[],writes=[];
    page.on('pageerror',e=>errors.push(e.message));
    let profile={customer:true,owner:false,ownerId:'user_Test',balanceCredits:0,billingReady:true};
    let releaseSession,sessionGate=new Promise(r=>releaseSession=r),failure=false;
    await page.route('https://**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.hostname==='esm.sh')return route.fulfill({contentType:'text/javascript',body:clerkMock});
      if(url.hostname.startsWith('clerk.'))return route.fulfill({contentType:'text/javascript',body:'window.__internal_ClerkUICtor=class{};'});
      if(url.hostname==='parallel-vision-lab.parallelvision.workers.dev'&&url.pathname==='/api/session'){
        const data=profile,bad=failure;
        if(sessionGate)await sessionGate;
        await route.fulfill({status:bad?503:200,contentType:'application/json',body:JSON.stringify(bad?{error:'Test session unavailable'}:data)});
        return;
      }
      if(request.method()!=='GET')writes.push(url.pathname);
      return route.abort();
    });
    const banner=page.locator('#lab-credit-banner');
    const refresh=async()=>{
      const signed=await page.evaluate(()=>window.mockClerk.isSignedIn);
      const response=signed?page.waitForResponse(r=>new URL(r.url()).pathname==='/api/session'):null;
      await page.evaluate(()=>window.mockClerk.listeners.forEach(fn=>fn()));
      if(response)await response;
      await page.waitForFunction(()=>document.querySelector('.landing-header--home').dataset.accountPhase==='ready');
      await settle(page);
    };
    try{
      await page.goto(origin+'/lab/',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>!!window.mockClerk);
      await page.evaluate(()=>document.fonts.ready);await settle(page);
      assert.equal(await banner.isVisible(),false,'Pending wallet never shows a zero-credit notice');
      const initial=await geometry(page);
      sessionGate=null;releaseSession();
      await banner.waitFor({state:'visible'});await settle(page);
      assert.deepEqual(await geometry(page),initial,`${width}: showing the notice causes zero layout movement`);
      assert.equal((await banner.innerText()).replace(/\s+/g,' ').trim(),'i Your credits are empty. Choose a plan to keep creating. ×');
      const overlay=await banner.evaluate(el=>{
        const b=el.getBoundingClientRect(),h=document.querySelector('.landing-header--home').getBoundingClientRect(),s=getComputedStyle(el);
        return {top:b.top,headerBottom:h.bottom,left:b.left,right:b.right,position:s.position,background:s.backgroundColor};
      });
      assert.equal(overlay.top,overlay.headerBottom,'Banner sits exactly below navigation');
      assert.equal(overlay.position,'absolute','Reuse the Video overlay positioning');
      assert.equal(overlay.background,'rgb(234, 232, 226)','Reuse the Studio white banner');
      assert.equal(overlay.left,0);assert.equal(overlay.right,width);
      assert.ok(initial.pageWidth<=width,'No horizontal overflow');
      await page.screenshot({path:resolve(artifacts,`home-credit-visible-${width}.png`)});

      // The notice belongs to the initial hero, never to the viewport while scrolling.
      await page.evaluate(()=>window.scrollTo({top:500,behavior:'instant'}));await settle(page);
      const scrolled=await banner.evaluate(el=>({top:el.getBoundingClientRect().top,scrollY}));
      assert.equal(scrolled.top,overlay.top-scrolled.scrollY,'Notice scrolls away with the document');
      await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await settle(page);

      // The header menu must remain above the banner and keep its tap targets.
      await page.locator('#lab-account-strip>summary').click();
      assert.equal(await page.locator('#lab-account-strip a[href="./account.html"]').evaluate(el=>{
        const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));
      }),true,'Banner does not obstruct the account menu');
      await page.locator('#lab-account-strip>summary').click();
      await banner.locator('a').click();
      assert.equal(new URL(page.url()).hash,'#pricing','Plan link opens the existing homepage pricing flow');
      assert.equal(await page.locator('#pricing').isVisible(),true);
      await page.evaluate(()=>{history.replaceState(null,'',location.pathname);window.scrollTo({top:0,behavior:'instant'});});await settle(page);
      const beforeDismiss=await geometry(page);
      await page.locator('#lab-credit-banner-dismiss').click();await settle(page);
      assert.equal(await banner.isVisible(),false);
      assert.deepEqual(await geometry(page),beforeDismiss,`${width}: dismissal moves/resizes nothing and preserves page height/scroll`);
      await page.screenshot({path:resolve(artifacts,`home-credit-dismissed-${width}.png`)});
      await refresh();assert.equal(await banner.isVisible(),false,'Dismissal survives account refresh');
      await page.reload({waitUntil:'networkidle'});
      assert.equal(await banner.isVisible(),false,'Dismissal survives same-session reload');

      // A new verified login session is eligible again, even in this browser tab.
      await page.evaluate(()=>{window.mockClerk.session.id='sess_Next';});
      await refresh();assert.equal(await banner.isVisible(),true,'A new login session resets dismissal');
      for(const [label,overrides] of [
        ['funded',{balanceCredits:20}],['missing balance',{balanceCredits:undefined}],
        ['null balance',{balanceCredits:null}],['string zero',{balanceCredits:'0'}],
        ['negative balance',{balanceCredits:-1}],['owner',{customer:false,owner:true}],
        ['owner with customer flag',{customer:true,owner:true}],['admin',{admin:true}],
        ['unconfirmed customer',{customer:undefined}],['closed',{accountClosed:true}],['billing review',{billingReview:true}]
      ]){
        profile={customer:true,owner:false,balanceCredits:0,...overrides};
        await refresh();assert.equal(await banner.isVisible(),false,`${width}: no notice for ${label}`);
      }
      profile={customer:true,owner:false,balanceCredits:0};await refresh();
      assert.equal(await banner.isVisible(),true,'Confirmed zero balance is eligible');
      sessionGate=new Promise(r=>releaseSession=r);
      await page.evaluate(()=>window.mockClerk.listeners.forEach(fn=>fn()));await settle(page);
      assert.equal(await banner.isVisible(),false,'Refreshing wallet hides stale zero balance');
      sessionGate=null;releaseSession();await banner.waitFor({state:'visible'});
      failure=true;await refresh();
      assert.equal(await banner.isVisible(),false,'Failed session request cannot imply zero');
      failure=false;await refresh();await banner.waitFor({state:'visible'});
      await page.evaluate(()=>window.mockClerk.signOut());await settle(page);
      assert.equal(await banner.isVisible(),false,'Signing out hides the notice immediately');
      await refresh();assert.equal(await banner.isVisible(),false,'Logged-out visitor never sees the notice');
      assert.deepEqual(writes,[],'No billing, account, credit or generation writes');
      assert.deepEqual(errors,[]);
      console.log(`PASS home credit banner ${width}x${height}: eligibility, pricing, session dismissal, zero layout movement and overflow`);
    }finally{await context.close();}
  }
}finally{await browser.close();await new Promise(r=>server.close(r));}
