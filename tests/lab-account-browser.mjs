// Browser checks use synthetic accounts and intercepted requests only.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const {chromium}=await import(process.env.PV_PLAYWRIGHT_MODULE||'playwright');
const root=resolve('.'),artifacts=process.env.PV_ACCOUNT_ARTIFACTS||'/tmp/pv-lab-account-review';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{
  let pathname=new URL(req.url,'http://localhost').pathname;if(pathname.endsWith('/'))pathname+='index.html';if(pathname==='/lab/moods')pathname+='.html';
  const file=resolve(root,'.'+pathname);if(!file.startsWith(root+sep))return res.writeHead(403).end();
  try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,ignoreDefaultArgs:['--disable-back-forward-cache']});
const products=[{id:'topup10',type:'payment',credits:1000,priceEur:10},{id:'topup29',type:'payment',credits:3000,priceEur:29},{id:'topup75',type:'payment',credits:8000,priceEur:75},{id:'starter',type:'subscription',credits:1600,priceEur:15}];
for(const product of products)product.title='PV Lab '+product.id;
const clerkMock=`export class Clerk {
  constructor(){window.mockClerk=this;this.listeners=[];this.isSignedIn=sessionStorage.getItem('mock-auth')!=='out';this.user={id:'user_Test',fullName:'Alex Test',hasImage:false,primaryEmailAddress:{emailAddress:'alex@example.test'}};this.session=this.isSignedIn?{id:'sess_Test',getToken:async()=> 'synthetic-token'}:null;}
  async load(){} addListener(fn){this.listeners.push(fn);} async signOut(){sessionStorage.setItem('mock-auth','out');this.isSignedIn=false;this.user=null;this.session=null;this.listeners.forEach(fn=>fn());}
  openSignIn(options){window.signInOpened=true;window.signInOptions=options;} openUserProfile(){window.profileOpened=true;}
}`;
async function setup(width,customer=true,overrides={}){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}),page=await context.newPage();
  const errors=[],writes=[],reads=[];let heldSession=null,releaseSession=null,quoteId=0;let heldWallet=null,releaseWallet=null,heldCheckout=null,releaseCheckout=null,checkoutUrl='javascript:alert(1)',initialized=!overrides.newCustomer;
  page.on('pageerror',e=>errors.push(e.message));
  const session={customer,ownerId:'user_Test',balanceCredits:1234,billingReady:true,generationReady:true,products,subscription:{plan_id:null,status:'none'},config:{enabled:true,configured:true,concurrency:{image:4,video:1},videoEngines:['wan']},...overrides};
  await page.route('https://**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.hostname==='esm.sh'&&url.pathname.includes('clerk-js'))return route.fulfill({contentType:'text/javascript',body:clerkMock});
    if(url.hostname==='clerk.parallelvisionlabel.com'||url.hostname==='clerk.pvlab.studio')return route.fulfill({contentType:'text/javascript',body:''});
    if(url.hostname==='checkout.stripe.com')return route.fulfill({contentType:'text/html',body:'<h1>Intercepted checkout test</h1>'});
    if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev')return route.abort();
    if(request.method()==='GET')reads.push(url.pathname);
    if(request.method()!=='GET')writes.push({path:url.pathname,body:request.postData()});
    const send=data=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
    if(url.pathname==='/api/session'){const snapshot=structuredClone(session);if(heldSession)await heldSession;return initialized?send(snapshot):route.fulfill({status:409,headers:{'X-PV-Lab-Onboarding':'required','Access-Control-Expose-Headers':'X-PV-Lab-Onboarding'},contentType:'application/json',body:JSON.stringify({error:'Setup required.'})});}
    if(url.pathname==='/api/migration/new'&&request.method()==='POST'){
      initialized=true;return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({linked:true,kind:'customer'})});
    }
    if(url.pathname==='/api/quotes'&&overrides.previewFundingError)return route.fulfill({status:402,contentType:'application/json',body:JSON.stringify({error:'Insufficient credits.'})});
    if(url.pathname==='/api/quotes'){
      const data=request.postDataJSON();return send({id:'mock-quote-'+(++quoteId),provider:'SpicyAPI',creditCost:35,estimatedUsd:.036,maxUsd:.036,expiresAt:Date.now()+180000,settings:data.settings});
    }
    if(url.pathname==='/api/jobs'&&request.method()==='POST'){
      const data=request.postDataJSON();assert.equal(data.confirm,true);assert.match(data.quoteId,/^mock-quote-/);
      return send({job:{id:'mock-job',status:'queued',settings:{type:'image',mode:'image',model:'seedream'},createdAt:Date.now(),creditCost:35}});
    }
    if(url.pathname==='/api/customer/wallet'){
      if(heldWallet)await heldWallet;
      return send({...session,activity:[{delta_credits:-42,kind:'generation',created_at:1720000000000},{delta_credits:1000,kind:'purchase',created_at:1719000000000}]});
    }
    if(url.pathname==='/api/customer/account'&&request.method()==='DELETE'){
      if(overrides.closureRevokesSession)await page.evaluate(()=>window.mockClerk.signOut());
      return route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({accepted:true,identityDeleted:true})});
    }
    if(url.pathname==='/api/customer/account')return send({storage:{bytes:1024**3,limitBytes:20*1024**3,files:15}});
    if(url.pathname==='/api/billing/portal')return send({url:'https://evil.example/stripe.com'});
    if(url.pathname==='/api/billing/checkout'){if(heldCheckout)await heldCheckout;return send({url:checkoutUrl});}
    if(url.pathname==='/api/customer/referrals')return send({rewardsAvailable:false});
    return send({jobs:[],activeJobs:[],next:null,packs:[],characters:[],moods:[],boards:[],folders:[],models:[],configured:false});
  });
  return {context,page,errors,writes,reads,session,holdSession(){heldSession=new Promise(r=>releaseSession=r);},releaseSession(){heldSession=null;releaseSession?.();},setCheckoutUrl(url){checkoutUrl=url;},holdCheckout(){heldCheckout=new Promise(r=>releaseCheckout=r);},releaseCheckout(){heldCheckout=null;releaseCheckout?.();},holdWallet(){heldWallet=new Promise(r=>releaseWallet=r);},releaseWallet(){heldWallet=null;releaseWallet?.();}};
}
async function fits(page,label){
  const metrics=await page.evaluate(()=>({
    viewport:innerWidth,
    documentWidth:document.documentElement.scrollWidth,
    studioWidth:document.querySelector('#main')?.scrollWidth
  }));
  assert.ok(metrics.documentWidth<=metrics.viewport+1,
    label+' must not scroll horizontally: '+JSON.stringify(metrics));
}
try{
  // Purchase recovery regressions run against real local modules; Clerk, Stripe,
  // webhooks, quotes and job submissions are intercepted, never production.
  for(const width of [1440,390]){
    const rig=await setup(width,true,{balanceCredits:0,generationReady:false,trialGenerationPaused:true}),{page,session,writes,reads}=rig;
    try{
      await page.goto(origin+'/lab/studio.html?billing=success');
      await page.locator('body.lab-ready').waitFor();
      await page.fill('#image-composer-prompt','Keep my payment-return draft.');
      assert.equal(await page.locator('#lab-wallet-toggle').textContent(),'0 credits');
      // The signed webhook is late: no focus/reload/user interaction delivers it.
      session.balanceCredits=1000;session.generationReady=true;session.trialGenerationPaused=false;
      await page.waitForFunction(()=>document.getElementById('lab-wallet-toggle').textContent==='1,000 credits');
      await page.waitForFunction(()=>document.getElementById('image-composer-generate').dataset.credits==='35 credits');
      assert.equal(await page.locator('#image-composer-prompt').inputValue(),'Keep my payment-return draft.');
      assert.ok(reads.filter(x=>x==='/api/session').length>=3,'Return polls the complete authorized profile for a late webhook');
      assert.equal(writes.filter(x=>x.path==='/api/jobs').length,0,'Polling never submits a generation');
      await page.screenshot({path:artifacts+'/checkout-funded-'+width+'.png'});
      await fits(page,'funded checkout return '+width);
      const jobRequest=page.waitForRequest(r=>r.url().endsWith('/api/jobs')&&r.method()==='POST');
      await page.click('#image-composer-generate');await jobRequest;
      assert.equal(writes.filter(x=>x.path==='/api/jobs').length,1,'One explicit click submits exactly one mocked job');
      assert.equal(await page.locator('#lab-pricing-overlay').isVisible(),false,'The refreshed permission is applied without reloading Studio');
      assert.deepEqual(rig.errors,[]);
    }finally{await rig.context.close();}

    const guarded=await setup(width,true,{balanceCredits:0,generationReady:false,trialGenerationPaused:true});
    try{
      const {page,session,writes}=guarded;
      await page.goto(origin+'/lab/studio.html');await page.locator('body.lab-ready').waitFor();
      await page.fill('#image-composer-prompt','Keep this restricted draft.');
      for(const restriction of [{},{billingReview:true},{promotionReview:true},{accountClosed:{state:'requested'}}]){
        Object.assign(session,{balanceCredits:1000,generationReady:false,trialGenerationPaused:false,billingReview:false,promotionReview:false,accountClosed:false},restriction);
        const refreshed=page.waitForResponse(r=>r.url().endsWith('/api/session'));
        await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await refreshed;
        await page.waitForFunction(()=>document.getElementById('lab-wallet-toggle').textContent==='1,000 credits');
        await page.locator('#image-composer-generate').evaluate(button=>button.click());
        await page.waitForTimeout(150);
        assert.equal(writes.filter(x=>['/api/quotes','/api/jobs'].includes(x.path)).length,0,'Positive balance cannot override denied/reviewed/closed generation permission');
        assert.equal(await page.locator('#image-composer-prompt').inputValue(),'Keep this restricted draft.');
      }
      // Exercise the same handler used by a persisted pageshow, separately from
      // any claim that this browser actually restored its BFCache.
      Object.assign(session,{generationReady:true,balanceCredits:2000,accountClosed:false});
      await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
      await page.waitForFunction(()=>document.getElementById('lab-wallet-toggle').textContent==='2,000 credits');
      await page.waitForFunction(()=>/35/.test(document.getElementById('image-composer-generate').dataset.credits));
      assert.equal(await page.locator('#image-composer-prompt').inputValue(),'Keep this restricted draft.');
      assert.equal(writes.filter(x=>x.path==='/api/jobs').length,0,'BFCache lifecycle refresh cannot generate');
      assert.deepEqual(guarded.errors,[]);
    }finally{await guarded.context.close();}

    // Hold the tabs module after the cards are painted: they must not advertise
    // a usable purchase until handlers AND the requested tab are installed.
    const loading=await setup(width),{page:loadPage}=loading;let releaseTabs;
    try{
      const held=new Promise(r=>releaseTabs=r);
      await loadPage.route('**/lab/pricing-tabs.js*',async route=>{await held;await route.continue();});
      await loadPage.goto(origin+'/lab/studio.html');await loadPage.locator('body.lab-ready').waitFor();
      await loadPage.locator('#lab-wallet-toggle').evaluate(b=>b.click());
      await loadPage.locator('#lab-pricing-overlay #lab-plans-title').waitFor();
      assert.equal(await loadPage.locator('#lab-pricing-overlay [data-lab-buy]:disabled').count(),6,'No enabled purchase before module readiness');
      assert.equal(await loadPage.locator('#lab-pricing-overlay #pricing').evaluate(e=>e.inert),true);
      assert.equal(loading.writes.filter(x=>x.path==='/api/billing/checkout').length,0);
      releaseTabs();
      await loadPage.waitForFunction(()=>document.getElementById('lab-pricing-overlay-body').getAttribute('aria-busy')==='false');
      assert.equal(await loadPage.locator('#lab-pricing-overlay #lab-tab-onetime').getAttribute('aria-selected'),'true');
      await loadPage.locator('#lab-pricing-overlay [data-lab-buy="topup10"]').click();
      await loadPage.getByText('Unverified checkout link.',{exact:true}).first().waitFor();
      assert.deepEqual(loading.writes.filter(x=>x.path==='/api/billing/checkout').map(x=>JSON.parse(x.body)),[{sku:'topup10'}],'First enabled click creates exactly the selected checkout');
      assert.deepEqual(loading.errors,[]);
    }finally{releaseTabs?.();await loading.context.close();}

    for(const [entry,sku] of [['studio','topup29'],['home','creator'],['account','topup75']]){
      const returning=await setup(width),{page,writes}=returning;
      try{
        returning.setCheckoutUrl('https://checkout.stripe.com/c/pay/mock-return');
        await page.goto(origin+(entry==='studio'?'/lab/studio.html':entry==='home'?'/lab/#pricing':'/lab/account.html#balance'));
        if(entry==='studio'){
          await page.locator('body.lab-ready').waitFor();
          await page.fill('#image-composer-prompt','Preserve this exact Checkout draft.');
          await page.locator('#lab-wallet-toggle').evaluate(b=>b.click());
          await page.waitForFunction(()=>document.getElementById('lab-pricing-overlay-body').getAttribute('aria-busy')==='false');
        }else if(entry==='home')await page.locator('[data-account-phase="ready"]').waitFor();
        else await page.locator('#account-products button').first().waitFor();
        const button=page.locator('[data-lab-buy="'+sku+'"]');
        // Account products use the existing server catalog and label.
        if(entry==='account')await page.locator('#account-products button').last().click();
        else await button.click();
        await page.waitForURL('https://checkout.stripe.com/**');
        assert.equal(writes.filter(x=>x.path==='/api/billing/checkout').length,1);
        const sent=JSON.parse(writes.find(x=>x.path==='/api/billing/checkout').body).sku;
        assert.equal(sent,sku);
        await page.goto(origin+'/lab/studio.html?billing=cancel');
        await page.waitForFunction(sku=>document.activeElement?.dataset.labBuy===sku,sku);
        assert.equal(await page.locator('#lab-pricing-overlay #lab-tab-'+(sku.startsWith('topup')?'onetime':'monthly')).getAttribute('aria-selected'),'true');
        assert.equal(writes.filter(x=>x.path==='/api/billing/checkout').length,1,'Cancel restores selection and focus without creating another Checkout');
        if(entry==='studio')assert.equal(await page.locator('#image-composer-prompt').inputValue(),'Preserve this exact Checkout draft.');
        await fits(page,'cancel restored '+entry+' '+width);
        await page.screenshot({path:artifacts+'/checkout-cancel-'+entry+'-'+width+'.png'});
        await page.click('#lab-pricing-overlay-close');await page.reload();await page.locator('body.lab-ready').waitFor();
        assert.equal(await page.locator('#lab-pricing-overlay').isVisible(),false,'Consumed cancellation cannot replay after reload');
        assert.equal(writes.filter(x=>x.path==='/api/billing/checkout').length,1);
        assert.deepEqual(returning.errors,[]);
      }finally{await returning.context.close();}
    }
    console.log('PASS late webhook, denied positive balance, focus, persisted lifecycle, first ready click and Checkout cancellation at '+width+'px (mock APIs only)');
  }
  for(const width of [1440,390])for(const entry of ['home','studio']){
    const rig=await setup(width),{page,writes}=rig;
    try{
      await page.addInitScript(()=>window.addEventListener('pageshow',event=>{window.__checkoutPageshowPersisted=event.persisted;}));
      rig.setCheckoutUrl('https://checkout.stripe.com/c/pay/mock-back');
      await page.goto(origin+(entry==='home'?'/lab/#pricing':'/lab/studio.html'));
      if(entry==='home'){
        await page.locator('[data-account-phase="ready"]').waitFor();
        await page.getByRole('tab',{name:'One-time credits',exact:true}).click();
      }else{
        await page.locator('body.lab-ready').waitFor();await page.fill('#image-composer-prompt','Preserve my browser Back draft.');
        await page.locator('#lab-wallet-toggle').evaluate(b=>b.click());
        await page.waitForFunction(()=>document.getElementById('lab-pricing-overlay-body').getAttribute('aria-busy')==='false');
      }
      await page.locator('[data-lab-buy="topup29"]').click();await page.waitForURL('https://checkout.stripe.com/**');
      await page.goBack();
      await page.waitForFunction(()=>document.activeElement?.dataset.labBuy==='topup29');
      const persisted=await page.evaluate(()=>window.__checkoutPageshowPersisted);
      assert.equal(await page.locator('#lab-tab-onetime').getAttribute('aria-selected'),'true');
      assert.equal(writes.filter(x=>x.path==='/api/billing/checkout').length,1,'Browser Back never replays Checkout');
      if(entry==='studio')assert.equal(await page.locator('#image-composer-prompt').inputValue(),'Preserve my browser Back draft.');
      await page.locator('[data-lab-buy="topup29"]').click();await page.waitForURL('https://checkout.stripe.com/**');
      assert.equal(writes.filter(x=>x.path==='/api/billing/checkout').length,2,'A fresh explicit click works after browser Back');
      assert.deepEqual(rig.errors,[]);
      console.log('PASS real browser Back '+entry+' '+width+'px; pageshow.persisted='+persisted+' (persisted lifecycle also tested explicitly)');
    }finally{await rig.context.close();}
  }
  for(const change of ['logout','switch']){
    const rig=await setup(390,true,{balanceCredits:0,generationReady:false}),{page,session}=rig;
    try{
      await page.goto(origin+'/lab/studio.html');await page.locator('body.lab-ready').waitFor();
      session.balanceCredits=9000;session.generationReady=true;rig.holdSession();
      const requested=page.waitForRequest(r=>r.url().endsWith('/api/session'));
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await requested;
      await page.evaluate(()=>window.mockClerk.signOut());
      if(change==='switch'){
        Object.assign(session,{ownerId:'user_Other',balanceCredits:0,generationReady:false});
        await page.evaluate(()=>{
          const c=window.mockClerk;c.user={id:'user_Other',fullName:'Other customer'};c.session={id:'sess_Other',getToken:async()=> 'synthetic-other-token'};c.isSignedIn=true;c.listeners.forEach(fn=>fn());
        });
      }
      rig.releaseSession();
      if(change==='switch'){await page.locator('body.lab-ready').waitFor();await page.waitForFunction(()=>document.getElementById('lab-wallet-toggle').textContent==='0 credits');}
      else await page.locator('#signin').waitFor({state:'visible'});
      assert.doesNotMatch(await page.locator('#lab-wallet-toggle').textContent(),/9,000/,'An old authorized response cannot populate another account or a signed-out document');
      assert.equal(rig.writes.filter(x=>x.path==='/api/jobs').length,0);assert.deepEqual(rig.errors,[]);
    }finally{rig.releaseSession();await rig.context.close();}
  }
  console.log('PASS delayed profile responses are discarded after logout and account switch');
  // Real homepage URL, local source and synthetic Clerk/API only. Fresh setup
  // must not navigate to Studio or discard an existing pricing anchor.
  for(const width of [1440,390]){
    const rig=await setup(width,true,{newCustomer:true,balanceCredits:0}),{page,writes,errors}=rig;
    try{
      await page.route('https://pvlab.studio/**',async route=>{
        const url=new URL(route.request().url());
        const path=url.pathname.startsWith('/lab/')?url.pathname:'/lab'+url.pathname;
        return route.fulfill({response:await route.fetch({url:origin+path+url.search})});
      });
      await page.goto('https://pvlab.studio/?source=google#pricing');
      await page.locator('[data-account-phase="ready"]').waitFor();
      await page.waitForFunction(()=>document.getElementById('lab-home-credit-copy').textContent==='0');
      assert.equal(page.url(),'https://pvlab.studio/?source=google#pricing','Fresh login stays on homepage');
      assert.equal(writes.filter(x=>x.path==='/api/migration/new').length,1,'Wallet is initialized once');
      assert.deepEqual(errors,[]);
    }finally{await rig.context.close();}
  }
  console.log('PASS fresh homepage sign-in stays in place at desktop/mobile widths');
  // Homepage purchases: every arrow responds next to its product, with no real payment.
  for(const width of [1440,390]){
    for(const customer of [false,true]){
      const rig=await setup(width,customer,{billingReady:false}),{page,writes,errors}=rig;
      try{
        await page.goto(origin+'/lab/#pricing');await page.locator('.pv-account-menu>summary').waitFor({state:'visible'});
        await page.mouse.move(0,0);
        const idle=await page.locator('#lab-monthly-plans .lab-plan>button').evaluateAll(els=>els.map(el=>getComputedStyle(el).backgroundColor));
        assert.equal(idle.length,3,'All monthly plan purchase buttons render');
        assert.equal(idle[0],idle[2],'Starter and Studio share a quiet outlined button at rest');
        assert.notEqual(idle[1],idle[0],'Recommended Creator has a distinct light purchase button at rest');
        for(const [tab,panel] of [['Monthly plans','#lab-monthly-plans'],['One-time credits','#lab-one-time-credits']]){
          await page.getByRole('tab',{name:tab,exact:true}).click();
          for(const button of await page.locator(panel+' [data-lab-buy]').all()){
            await button.click();
            const note=page.locator('#'+await button.getAttribute('aria-describedby'));
            await note.getByText(customer?'Purchases are not available yet. No payment has been taken.':'You are signed in as the owner. Use a customer account to buy credits.',{exact:true}).waitFor();
            await page.waitForFunction(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;},await button.getAttribute('aria-describedby'));
            assert.equal(await page.locator('.lab-purchase-status:not([hidden])').count(),1,'Only the clicked product shows feedback');
            assert.equal(await button.getAttribute('aria-busy'),'false');
            assert.equal(await button.isDisabled(),false);
          }
        }
        assert.equal(writes.filter(x=>x.path==='/api/billing/checkout').length,0,'Owner and unavailable checkout guards remain enforced');
        await fits(page,'pricing feedback '+width);
        await page.screenshot({path:artifacts+'/pricing-feedback-'+width+'-'+(customer?'customer':'owner')+'.png'});
        assert.deepEqual(errors,[]);
      }finally{await rig.context.close();}
    }
  }
  {
    const rig=await setup(1440),{page,writes,errors,session}=rig;
    try{
      await page.goto(origin+'/lab/#pricing');await page.locator('.pv-account-menu>summary').waitFor({state:'visible'});
      const checkoutWrites=()=>writes.filter(x=>x.path==='/api/billing/checkout');
      rig.holdCheckout();
      const checkoutRequest=page.waitForRequest(request=>request.url().endsWith('/api/billing/checkout'));
      await page.locator('[data-lab-buy="creator"]').evaluate(button=>{button.click();button.click();});
      await page.waitForFunction(()=>document.querySelector('[data-lab-buy="creator"]').getAttribute('aria-busy')==='true');
      await checkoutRequest;
      assert.equal(checkoutWrites().length,1,'A double click creates only one checkout');
      assert.equal(await page.locator('#pricing [data-lab-buy]:disabled').count(),6);
      assert.deepEqual(JSON.parse(checkoutWrites()[0].body),{sku:'creator'});
      rig.releaseCheckout();await page.getByText('Unverified checkout link. Please try again.',{exact:true}).waitFor();
      assert.equal(await page.locator('#pricing [data-lab-buy]:disabled').count(),0,'Failure makes all products usable again');
      session.pilot=true;await page.reload();await page.locator('.pv-account-menu>summary').waitFor({state:'visible'});
      await page.locator('[data-lab-buy="studio"]').click();await page.getByText('This private account can choose only the €10 credit pack or €15/month Starter plan.',{exact:true}).waitFor();
      assert.equal(checkoutWrites().length,1,'Pilot restriction does not send an unavailable SKU');
      await page.getByRole('tab',{name:'One-time credits',exact:true}).click();
      rig.holdCheckout();await page.locator('[data-lab-buy="topup10"]').click();
      await page.getByText('Opening secure checkout…',{exact:true}).waitFor();
      await page.evaluate(()=>window.mockClerk.signOut());rig.releaseCheckout();
      await page.getByText('Your account changed. Select a plan again.',{exact:true}).waitFor();
      assert.ok(page.url().startsWith(origin),'Session change cannot redirect to checkout');
      assert.deepEqual(errors,[]);
    }finally{rig.releaseCheckout();await rig.context.close();}
  }
  {
    const rig=await setup(390),{page,writes,errors}=rig;
    try{
      await page.addInitScript(()=>{if(sessionStorage.getItem('mock-auth')===null)sessionStorage.setItem('mock-auth','out');});
      await page.goto(origin+'/lab/#pricing');await page.getByRole('tab',{name:'One-time credits',exact:true}).click();await page.locator('[data-lab-buy="topup29"]').click();
      await page.waitForFunction(()=>window.signInOpened===true);
      await page.getByText('Sign in to continue with this selection.',{exact:true}).waitFor();
      assert.equal(writes.filter(x=>x.path==='/api/billing/checkout').length,0);
      const destination=await page.evaluate(()=>window.signInOptions.forceRedirectUrl);
      assert.equal(new URL(destination).origin,origin);
      await page.evaluate(()=>sessionStorage.setItem('mock-auth','in'));await page.goto(destination);
      await page.getByText('Unverified checkout link. Please try again.',{exact:true}).waitFor();
      assert.equal(await page.locator('#lab-tab-onetime').getAttribute('aria-selected'),'true','Returned one-time purchase keeps the selected credits tab');
      assert.deepEqual(writes.filter(x=>x.path==='/api/billing/checkout').map(x=>JSON.parse(x.body)),[{sku:'topup29'}],'Sign-in return preserves and resumes the clicked pack exactly once');
      assert.equal(new URL(page.url()).searchParams.has('lab-checkout'),false);
      await page.reload();await page.locator('.pv-account-menu>summary').waitFor({state:'visible'});
      assert.equal(writes.filter(x=>x.path==='/api/billing/checkout').length,1,'Reload does not replay a consumed purchase');
      await page.goto(origin+'/lab/?lab-checkout=untrusted#pricing');await page.locator('.pv-account-menu>summary').waitFor({state:'visible'});
      assert.equal(writes.filter(x=>x.path==='/api/billing/checkout').length,1,'URL alone cannot initiate checkout');
      rig.setCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test_frontend');
      await page.locator('[data-lab-buy="starter"]').click();
      await page.waitForURL('https://checkout.stripe.com/c/pay/cs_test_frontend');
      assert.deepEqual(JSON.parse(writes.at(-1).body),{sku:'starter'},'An available product reaches the intercepted Stripe checkout');
      assert.deepEqual(errors,[]);
    }finally{await rig.context.close();}
  }
  console.log('PASS all homepage purchase arrows, visible feedback, idle states, sign-in selection, duplicate and session guards');
  // A newly verified customer has no free generation privilege while trials
  // are paused. They may still prepare an image, then explicitly open pricing
  // through Generate without any provider or Stripe request.
  for(const width of [1440,390])for(const generationReady of [false,true]){
    const rig=await setup(width,true,{balanceCredits:0,generationReady,trialGenerationPaused:!generationReady,billingReady:true});
    const {page,writes,errors}=rig;
    try{
      await page.goto(origin+'/lab/studio.html?tool=image');
      await page.locator('#app').waitFor({state:'visible'});
      assert.doesNotMatch(await page.locator('#lab-welcome-start').innerText(),/complimentary generation is paused/i);
      const card=page.locator('[data-welcome-mood="dream-blur"]');
      await card.click();
      await page.waitForTimeout(1000);
      assert.equal(await card.getAttribute('aria-pressed'),'true','A zero-credit account can select its Mood');
      assert.ok(await page.locator('#image-composer-prompt').inputValue(),'Mood fills the editable draft');
      assert.equal(await page.locator('#lab-pricing-overlay').evaluate(el=>el.open),false,'Mood selection never opens pricing');
      assert.equal(writes.some(x=>['/api/quotes','/api/uploads','/api/jobs','/api/billing/checkout'].includes(x.path)),false,'Preparing a zero-credit Mood does not call a paid route');
      const direction='An editorial portrait with natural film grain, quiet shadows and real fabric texture.';
      await page.locator('#image-composer-prompt').fill(direction);
      await page.waitForFunction(()=>!document.getElementById('image-composer-generate').disabled);
      await page.locator('#image-composer-generate').click();
      await page.locator('#lab-pricing-overlay[open] #lab-plans-title').waitFor();
      await page.waitForFunction(()=>document.querySelector('#lab-pricing-overlay-body').getAttribute('aria-busy')==='false');
      assert.equal(await page.locator('#lab-pricing-overlay #pricing [data-lab-buy]').count(),6);
      assert.equal(await page.locator('#lab-pricing-overlay #lab-tab-monthly').getAttribute('aria-selected'),'true','Generate starts with the compact monthly comparison');
      assert.equal(await page.locator('#image-composer-prompt').inputValue(),direction,
        "Pricing must preserve the customer's drafted creative direction");
      assert.equal(writes.some(x=>['/api/billing/checkout','/api/jobs','/api/quotes','/api/uploads'].includes(x.path)),false,
        'Paused trial Generate previews plans without a payment, generation, or upload');
      await page.locator('#lab-pricing-overlay-close').click();
      assert.equal(await page.locator('#image-composer-prompt').inputValue(),direction);
      assert.deepEqual(errors,[]);
    }finally{await rig.context.close();}
  }
  // A stale funded session can receive a funding error on its background
  // price preview. Only the later explicit Generate action may open plans.
  {
    const rig=await setup(1440,true,{previewFundingError:true}),{page,writes,errors}=rig;
    try{
      await page.goto(origin+'/lab/studio.html?tool=image');
      await page.locator('#app').waitFor({state:'visible'});
      await page.locator('[data-welcome-mood="dream-blur"]').click();
      await page.waitForFunction(()=>document.getElementById('generate').title.includes('Choose credits'),{},{timeout:15000});
      assert.ok(writes.some(x=>x.path==='/api/quotes'),'A background quote received the simulated funding error');
      assert.equal(await page.locator('#lab-pricing-overlay').evaluate(el=>el.open),false,'A failed background quote never interrupts Mood exploration');
      const draft=await page.locator('#image-composer-prompt').inputValue();
      await page.locator('#image-composer-generate').click();
      await page.locator('#lab-pricing-overlay[open] #lab-plans-title').waitFor();
      assert.equal(await page.locator('#image-composer-prompt').inputValue(),draft);
      assert.equal(writes.some(x=>['/api/jobs','/api/billing/checkout'].includes(x.path)),false,'No unpaid job or automatic checkout');
      assert.deepEqual(errors,[]);
    }finally{await rig.context.close();}
  }
  // Checkout is intercepted: verify zero-balance recovery without any real payment or generation.
  for(const width of [1440,768,390,320]){
    const rig=await setup(width,true,{balanceCredits:0}),{page,session,writes,errors}=rig;
    try{
      await page.goto(origin+'/lab/studio.html');
      await page.locator('#lab-credit-banner').waitFor({state:'visible'});
      await page.locator('#app').waitFor({state:'visible'});
      await fits(page,'zero-credit studio '+width);
      await page.screenshot({path:artifacts+'/credit-banner-'+width+'.png'});
      assert.equal(await page.locator('#lab-credit-banner-add').count(),0,'no duplicate credit CTA in the notice');
      const studioUrl=page.url();
      await page.fill('#image-composer-prompt','Keep this exact draft.');
      await page.evaluate(()=>document.getElementById('lab-wallet-toggle').click());
      await page.locator('#lab-pricing-overlay[open] #lab-plans-title').waitFor();
      assert.equal(await page.locator('#lab-pricing-overlay #pricing [data-lab-buy]').count(),6,
        'All six original homepage plans appear in Studio without navigation');
      assert.equal(await page.locator('#lab-pricing-overlay #lab-tab-onetime').getAttribute('aria-selected'),'true',
        'Empty wallet starts on one-time credits');
      assert.equal(page.url(),studioUrl,'Opening credits does not navigate through the homepage');
      await page.click('#lab-pricing-overlay-close');
      assert.equal(await page.locator('#image-composer-prompt').inputValue(),'Keep this exact draft.',
        'Pricing overlay preserves Studio draft');
      session.balanceCredits=1000;
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      await page.waitForFunction(()=>document.getElementById('lab-wallet-toggle').textContent.includes('1,000'));
      await page.evaluate(()=>document.getElementById('lab-wallet-toggle').click());
      await page.locator('#lab-pricing-overlay[open] #lab-plans-title').waitFor();
      assert.equal(await page.locator('#lab-pricing-overlay #pricing [data-lab-buy]').count(),6,
        'Funded customers see exactly the same editorial plans as zero-credit customers');
      assert.equal(await page.locator('#lab-credits-dialog').isVisible(),false,
        'The superseded compact credit-pack dialog must not replace editorial pricing');
      await fits(page,'unified pricing '+width);
      const deck=await page.locator('#lab-pricing-overlay').boundingBox();
      assert.ok(deck.x>=0&&deck.x+deck.width<=width+1);
      await page.screenshot({path:artifacts+'/unified-credit-plans-'+width+'.png'});
      await page.keyboard.press('Escape');
      await page.fill('#image-composer-prompt','Keep this exact draft.');
      await page.evaluate(()=>document.getElementById('lab-wallet-toggle').click());
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#image-composer-prompt').inputValue(),'Keep this exact draft.');
      assert.equal(writes.some(x=>x.path==='/api/billing/checkout'||x.path==='/api/jobs'||x.path==='/api/image-models/generate'),false,
        'Opening and closing either credit state never submits a payment or generation');
      session.balanceCredits=0;
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      await page.locator('#lab-credit-banner').waitFor({state:'visible'});
      await page.click('#lab-credit-banner-dismiss');
      assert.equal(await page.locator('#lab-credit-banner').isVisible(),false);
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      assert.equal(await page.locator('#lab-credit-banner').isVisible(),false,
        'Dismissal survives refresh at the same empty balance');
      session.balanceCredits=1000;
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      await page.waitForFunction(()=>document.getElementById('lab-wallet-toggle').textContent.includes('1,000'));
      await page.evaluate(()=>document.getElementById('lab-wallet-toggle').click());
      await page.locator('#lab-pricing-overlay[open] #lab-plans-title').waitFor();
      assert.equal(await page.locator('#lab-credit-banner').isVisible(),false);

      // Checkout safety is identical from the shared editorial panel.
      session.billingReady=false;
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      await page.waitForFunction(()=>document.querySelector('#lab-wallet-state').textContent.includes('Payments are not being accepted yet.'));
      await page.locator('#lab-pricing-overlay [data-lab-buy="topup10"]').click();
      await page.locator('#lab-pricing-overlay-status').getByText('Checkout is not available for this account. No payment was attempted.',{exact:true}).waitFor();
      assert.equal(writes.filter(x=>x.path==='/api/billing/checkout').length,0);

      // Re-load the verified profile before attempting checkout after its
      // billing-ready state changed. A focus event alone is asynchronous.
      session.billingReady=true;
      await page.reload();
      await page.locator('#app').waitFor({state:'visible'});
      await page.evaluate(()=>document.getElementById('lab-wallet-toggle').click());
      await page.locator('#lab-pricing-overlay[open] #lab-plans-title').waitFor();
      await page.waitForFunction(()=>document.querySelector('#lab-pricing-overlay [data-lab-buy="topup10"]')?.disabled===false);
      rig.holdCheckout();
      const checkoutStarted=page.waitForRequest(r=>r.url().endsWith('/api/billing/checkout'));
      await page.locator('#lab-pricing-overlay [data-lab-buy="topup10"]').evaluate(button=>{button.click();button.click();});
      await checkoutStarted;
      await page.waitForFunction(()=>document.querySelector('#lab-pricing-overlay-status').textContent.includes('Opening secure checkout'));
      assert.equal(writes.filter(x=>x.path==='/api/billing/checkout').length,1,'Shared checkout prevents duplicate clicks');
      assert.deepEqual(JSON.parse(writes.at(-1).body),{sku:'topup10'});
      rig.releaseCheckout();
      await page.locator('#lab-pricing-overlay-status').getByText('Unverified checkout link.',{exact:true}).waitFor();
      assert.ok(page.url().startsWith(origin),'Untrusted checkout URL cannot navigate');

      rig.holdCheckout();
      await page.locator('#lab-pricing-overlay [data-lab-buy="topup10"]').click();
      await page.evaluate(()=>window.mockClerk.signOut());
      rig.releaseCheckout();
      await page.locator('#gate').waitFor({state:'visible'});
      assert.equal(await page.locator('#lab-credit-banner').isVisible(),false);
      assert.equal(await page.locator('#lab-add-credits').isVisible(),false);
      assert.equal(await page.locator('#lab-pricing-overlay').isVisible(),false);
      assert.deepEqual(errors,[]);
      console.log('PASS credit banner, deck, real balance changes, pilot products, checkout guards and sign-out at '+width+'px');
    }finally{rig.releaseCheckout();await rig.context.close();}
  }
  // A successful deletion request signs out the same Clerk session and clears
  // the deleted customer's identity and credit balance from the homepage.
  for(const [width,closureRevokesSession] of [[1440,false],[390,false],[1440,true],[390,true]]){
    const rig=await setup(width,true,{closureRevokesSession}),{page,writes,errors}=rig;
    try{
      await page.goto(origin+'/lab/account.html#settings');
      await page.locator('#settings-close-account').waitFor({state:'visible'});
      await page.click('#settings-close-account');
      await page.fill('#account-close-confirm','DELETE MY PV LAB ACCOUNT');
      await page.click('#account-close-submit');
      await page.waitForURL(origin+'/lab/');
      await page.locator('#lab-header-signin').waitFor({state:'visible'});
      assert.equal(await page.locator('.pv-account-menu>summary').isVisible(),false,'Deleted user menu is hidden');
      assert.equal(await page.locator('#lab-home-credit-copy').textContent(),'Get credits','Deleted user balance is cleared');
      const requests=writes.filter(item=>item.path==='/api/customer/account');
      assert.equal(requests.length,1,'Account closure submitted once');
      assert.deepEqual(JSON.parse(requests[0].body),{confirmation:'DELETE MY PV LAB ACCOUNT'});
      assert.deepEqual(errors,[]);
    }finally{await rig.context.close();}
  }
  {
    const rig=await setup(1440,true,{accountClosed:{state:'requested'},balanceCredits:200}),{page,errors}=rig;
    try{
      await page.goto(origin+'/lab/');
      await page.locator('.pv-account-menu>summary').waitFor({state:'visible'});
      assert.equal(await page.locator('#lab-home-credits').isVisible(),true,'Closed accounts retain a clear status slot');
      assert.equal(await page.locator('#lab-home-credit-copy').textContent(),'Account closed');
      assert.match(await page.locator('#lab-home-credits').getAttribute('href'),/account\.html#settings/,
        'The closed-account entry leads to account settings, not a checkout');
      await page.locator('.pv-account-menu>summary').click();
      assert.equal(await page.locator('[data-account-balance]').textContent(),'Account closed','Closed-account menu never advertises credits');
      assert.deepEqual(errors,[]);
    }finally{await rig.context.close();}
  }
  console.log('PASS post-deletion sign-out and closed-account balance presentation');
  for(const width of [1440,390,320]){
    const rig=await setup(width),{page,errors,writes}=rig;
    try{
      await page.goto(origin+'/lab/account.html');await page.waitForFunction(()=>document.querySelector('#account-balance').textContent==='1,234');
      await fits(page,'account '+width);await page.locator('.account-cover img').evaluate(img=>img.decode());assert.equal(await page.locator('#account-products button').count(),3);
      await page.screenshot({path:artifacts+'/account-balance-'+width+'.png',fullPage:true});
      await page.click('[data-tab="usage"]');await page.locator('#account-activity').getByText('Generation',{exact:true}).waitFor();
      assert.match(await page.locator('#account-activity').textContent(),/-42 credits/);
      await page.click('[data-tab="billing"]');assert.equal(await page.locator('#account-plans button').count(),1);
      await page.click('#account-portal');await page.waitForFunction(()=>document.querySelector('#account-status').textContent.includes('verified billing link'));
      assert.ok(page.url().startsWith(origin));assert.equal(writes.at(-1).path,'/api/billing/portal');
      await page.click('[data-tab="balance"]');await page.locator('#account-products button').first().click();await page.waitForFunction(()=>document.querySelector('#account-status').textContent.includes('verified billing link'));
      assert.deepEqual(JSON.parse(writes.at(-1).body),{sku:'topup10'});
      await page.evaluate(()=>location.hash='settings');await page.locator('#account-edit-profile').click();assert.equal(await page.evaluate(()=>window.profileOpened),true);
      assert.match(await page.locator('#account-storage-label').textContent(),/1.00 GiB/);await fits(page,'settings '+width);
      await page.screenshot({path:artifacts+'/account-settings-'+width+'.png',fullPage:true});
      assert.equal(await page.locator('#settings-delete-row').isVisible(),true,'customer delete action is visible in Settings');
      assert.equal((await page.locator('#settings-close-account').textContent()).trim(),'Delete account');
      assert.equal(await page.locator('#account-close-dialog').isVisible(),false,'deletion requires opening the confirmation dialog');
      await page.click('#settings-close-account');assert.equal(await page.locator('#account-close-submit').isDisabled(),true);await page.fill('#account-close-confirm','DELETE');assert.equal(await page.locator('#account-close-submit').isDisabled(),true);await page.fill('#account-close-confirm','DELETE MY PV LAB ACCOUNT');assert.equal(await page.locator('#account-close-submit').isDisabled(),false);await page.keyboard.press('Escape');
      rig.holdWallet();await page.evaluate(()=>{document.querySelector('#account-refresh').click();});await page.waitForFunction(()=>!document.querySelector('#account-workspace').hidden);
      await page.evaluate(()=>window.mockClerk.signOut());rig.releaseWallet();await page.waitForFunction(()=>!document.querySelector('#account-gate').hidden);
      assert.equal(await page.locator('#account-workspace').isVisible(),false);assert.equal(await page.locator('#settings-email').textContent(),'');assert.equal(await page.locator('#account-menu').isVisible(),false);
      assert.equal(writes.some(x=>x.path.includes('/jobs')||x.path==='/api/customer/account'),false);assert.deepEqual(errors,[]);
    }finally{rig.releaseWallet();await rig.context.close();}
    for(const customer of [true,false]){
      for(const path of ['/lab/index.html','/lab/moods.html','/lab/studio.html','/lab/mood-creator.html']){
        const rig=await setup(width,customer),{page,errors}=rig;
        try{
          await page.goto(origin+path);const summary=page.locator('.pv-account-menu>summary');await summary.waitFor({state:'visible'});
          if(path==='/lab/studio.html'){
            const actions=await page.locator('#studio-header .actions').boundingBox();
            const header=await page.locator('#studio-header .wrap.top').evaluate(el=>({
              right:el.getBoundingClientRect().right,padding:parseFloat(getComputedStyle(el).paddingRight),
              border:parseFloat(getComputedStyle(el).borderRightWidth)
            }));
            const rightGap=header.right-actions.x-actions.width;
            assert.ok(Math.abs(rightGap-header.padding-header.border)<1&&actions.x>=0&&actions.x+actions.width<=width+1,
              'Studio actions align with the actual header content edge, including responsive padding: '+
              JSON.stringify({width,rightGap,actions,header}));
          }
          await summary.click();await page.locator('[data-account-name]').getByText('Alex Test',{exact:true}).waitFor();
          assert.match(await page.locator('[data-account-balance]').textContent(),customer?/1,234 credits/:/Owner workspace/,path+' '+await page.locator('body').innerText());
          if(path==='/lab/index.html'){
            assert.equal(await page.locator('#lab-home-upgrade').count(),0,'No competing Upgrade button');
            assert.equal(await page.locator('#lab-home-credits').isVisible(),true,'Credits entry remains visible for customers and owner');
            if(customer){
              assert.equal(await page.locator('#lab-home-credit-copy').textContent(),'1,234');
              assert.equal(await page.locator('#lab-home-credits').getAttribute('href'),'#pricing',
                'The active customer header leads directly to the same editorial plans');
              assert.equal(await page.locator('.pv-account-panel a[href="./account.html#balance"]').count(),1);
              assert.equal(await page.locator('.pv-account-panel a[href="./account.html"]').count(),1);
            }
          }
          const identity=page.locator('.pv-account-identity');
          assert.equal(await identity.isVisible(),true,'Authenticated identity appears beneath the approved wordmark');
          assert.equal(await identity.locator('strong').textContent(),'Alex Test');
          assert.equal(await identity.locator('.pv-account-identity-avatar').textContent(),'AT');
          assert.match(await page.locator('.pv-account-details').evaluate(el=>getComputedStyle(el,'::before').backgroundImage),/pvlab-wordmark-bold\.svg/,'Approved bold PV LAB logo is shared across account menus');
          assert.ok(await page.locator('.pv-account-panel > a .pv-account-menu-icon').count()>0,'Links retain subtle visible icons');
          const avatar=await page.locator('[data-account-avatar]').boundingBox();assert.equal(Math.round(avatar.width),32);assert.equal(Math.round(avatar.height),32);
          const panel=await page.locator('.pv-account-panel').boundingBox();assert.ok(panel.x>=0&&panel.x+panel.width<=width+1,'menu fits viewport');
          assert.equal(await page.locator('.pv-account-panel > a[href="./account.html"]').count(),1,'Each account menu contains one My account entry');
          const desiredEdgeGap=width<=480?14:24;
          assert.ok(Math.abs(width-panel.x-panel.width-desiredEdgeGap)<2,`All account menus align near the screen edge: ${path} at ${width}px, actual gap ${width-panel.x-panel.width}px, expected ${desiredEdgeGap}px`);
          if(path==='/lab/studio.html'){
            assert.equal(await page.locator('link[href*="studio-account-menu.css"]').count(),0,'Studio no longer overrides the canonical account menu');
            const metrics=await page.locator('#studio-account-menu .pv-account-panel').evaluate(el=>{
              const box=el.getBoundingClientRect(),style=getComputedStyle(el);
              const logo=getComputedStyle(el.querySelector('.pv-account-details'),'::before');
              const row=el.querySelector('a:not([hidden])');
              return {position:style.position,width:box.width,top:box.top,
                fontSize:Number.parseFloat(getComputedStyle(row).fontSize),
                logoWidth:Number.parseFloat(logo.width),background:style.backgroundColor};
            });
            assert.equal(metrics.position,'fixed','Studio menu stays aligned as header size changes');
            assert.ok(Math.abs(metrics.width-288)<1,'Studio uses the landing-page menu width');
            assert.ok(metrics.top>=avatar.y+avatar.height+12,'Studio menu clears its account avatar');
            assert.ok(metrics.fontSize>=12.5&&metrics.fontSize<=13.5,'Studio uses landing-page typography');
            assert.ok(Math.abs(metrics.logoWidth-157)<1,'Studio uses full-sized editorial wordmark');
            assert.equal(metrics.background,'rgb(17, 17, 17)','Studio uses approved deep-black surface');
            if(width<=390){
              // Match a short in-app phone browser, with the composer retained.
              await page.setViewportSize({width,height:660});
              const signout=page.locator('[data-account-signout]');
              await signout.scrollIntoViewIfNeeded();
              const hit=await signout.evaluate(el=>{
                const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
                return {inside:y>0&&y<innerHeight,
                  reachable:el.contains(document.elementFromPoint(x,y)),
                  overflow:document.documentElement.scrollWidth>innerWidth};
              });
              assert.equal(hit.inside,true,'Menu scrolls its last action into the phone viewport');
              assert.equal(hit.reachable,true,'Sign out receives taps above the retained Image deck');
              assert.equal(hit.overflow,false,'Open menu introduces no mobile horizontal overflow');
              await page.setViewportSize({width,height:950});
            }
          }else if(path==='/lab/index.html'&&width===1440){
            assert.equal(Math.round(panel.width),288,'Homepage uses the approved compact editorial menu width');
            assert.equal(await page.locator('link[href*="studio-account-menu.css"]').count(),0,'Studio-specific styling stays out of the homepage');
          }
          assert.equal(await page.locator('[data-account-referrals]').isVisible(),customer);
          await page.screenshot({path:artifacts+'/'+path.split('/').at(-1).replace('.html','')+'-'+width+'-'+(customer?'customer':'owner')+'.png'});
          await page.keyboard.press('Escape');assert.equal(await page.locator('.pv-account-menu').evaluate(el=>el.open),false);assert.equal(await summary.evaluate(el=>el===document.activeElement),true);
          await fits(page,path+' '+width);assert.deepEqual(errors,[]);
        }finally{await rig.context.close();}
      }
    }
    console.log('PASS account, shared menus, keyboard, private state and billing guards at '+width+'px');
  }
  // Empty, updated and signed-out credit states use the same authenticated session source.
  for(const width of [1440,390,320]){
    const rig=await setup(width,true,{balanceCredits:0}),{page,session,errors}=rig;
    try{
      await page.goto(origin+'/lab/');
      await page.locator('#lab-home-credits').waitFor({state:'visible'});
      // Header reserves its dimensions before the authenticated wallet loads.
      // Wait for the confirmed zero balance, not simply a visible placeholder.
      await page.waitForFunction(()=>document.getElementById('lab-home-credit-copy')?.textContent==='0');
      assert.equal(await page.locator('#lab-home-credit-copy').textContent(),'0','Empty customer wallet must show the real zero balance');
      assert.equal(await page.locator('#lab-home-credit-unit').evaluate(el=>el.hidden),false,'Balance unit remains available even when compact mobile styling hides the word');
      assert.equal(await page.locator('#lab-home-credits').getAttribute('aria-label'),'0 credits. View credits and billing');
      await fits(page,'zero balance header '+width);
      session.balanceCredits=2850;
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      await page.waitForFunction(()=>document.getElementById('lab-home-credit-copy').textContent==='2,850');
      assert.match(await page.locator('#lab-home-credits').getAttribute('aria-label'),/2,850 credits/);
      await fits(page,'refreshed balance header '+width);
      await page.evaluate(()=>window.mockClerk.signOut());
      await page.locator('#lab-header-signin').waitFor({state:'visible'});
      assert.equal(await page.locator('#lab-home-credits').isVisible(),true,'Signed-out users see the Get credits CTA');
      assert.equal(await page.locator('#lab-home-credit-copy').textContent(),'Get credits');
      await fits(page,'signed out header '+width);
      assert.deepEqual(errors,[]);
    }finally{await rig.context.close();}
  }
  for(const width of [1920,1440,768,390,320]){
    const rig=await setup(width,false);
    try{
      const page=rig.page;await page.goto(origin+'/lab/account.html');await page.locator('#owner-billing').waitFor({state:'visible'});
      assert.equal(await page.locator('[data-credit-view="balance"]').isVisible(),false);
      assert.equal(await page.locator('#account-credit-tabs').isVisible(),false,'Owner has workspace navigation instead of empty billing tabs');
      assert.equal(await page.locator('#account-referrals-link').isVisible(),false);
      assert.equal(await page.locator('#credits-title').textContent(),'Your workspace');
      assert.equal(await page.locator('#owner-billing a[href="./studio.html"]').count(),1);
      await page.locator('.account-cover img').evaluate(img=>img.decode());
      await fits(page,'owner account '+width);
      await page.screenshot({path:artifacts+'/account-owner-'+width+'.png',fullPage:true});
      await page.evaluate(()=>location.hash='settings');await page.locator('#settings-connection').waitFor({state:'visible'});
      await fits(page,'owner settings '+width);assert.deepEqual(rig.errors,[]);
    }finally{await rig.context.close();}
  }
}catch(error){console.error(error);throw error;}finally{await browser.close();await new Promise(r=>server.close(r));}
