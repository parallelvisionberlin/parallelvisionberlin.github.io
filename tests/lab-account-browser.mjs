// Browser checks use synthetic accounts and intercepted requests only.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const {chromium}=await import(process.env.PV_PLAYWRIGHT_MODULE||'playwright');
const root=resolve('.'),artifacts='/tmp/pv-lab-account-review';await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{
  let pathname=new URL(req.url,'http://localhost').pathname;if(pathname.endsWith('/'))pathname+='index.html';if(pathname==='/lab/moods')pathname+='.html';
  const file=resolve(root,'.'+pathname);if(!file.startsWith(root+'/'))return res.writeHead(403).end();
  try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const products=[{id:'topup10',type:'payment',credits:1000,priceEur:10},{id:'topup29',type:'payment',credits:3000,priceEur:29},{id:'topup75',type:'payment',credits:8000,priceEur:75},{id:'starter',type:'subscription',credits:1600,priceEur:15}];
for(const product of products)product.title='PV Lab '+product.id;
const clerkMock=`export class Clerk {
  constructor(){window.mockClerk=this;this.listeners=[];this.isSignedIn=sessionStorage.getItem('mock-auth')!=='out';this.user={id:'user_Test',fullName:'Alex Test',hasImage:false,primaryEmailAddress:{emailAddress:'alex@example.test'}};this.session=this.isSignedIn?{id:'sess_Test',getToken:async()=> 'synthetic-token'}:null;}
  async load(){} addListener(fn){this.listeners.push(fn);} async signOut(){sessionStorage.setItem('mock-auth','out');this.isSignedIn=false;this.user=null;this.session=null;this.listeners.forEach(fn=>fn());}
  openSignIn(options){window.signInOpened=true;window.signInOptions=options;} openUserProfile(){window.profileOpened=true;}
}`;
async function setup(width,customer=true,overrides={}){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}),page=await context.newPage();
  const errors=[],writes=[];let heldWallet=null,releaseWallet=null,heldCheckout=null,releaseCheckout=null,checkoutUrl='javascript:alert(1)';
  page.on('pageerror',e=>errors.push(e.message));
  const session={customer,ownerId:'user_Test',balanceCredits:1234,billingReady:true,generationReady:true,products,subscription:{plan_id:null,status:'none'},config:{enabled:true,configured:true,concurrency:{image:4,video:1},videoEngines:['wan']},...overrides};
  await page.route('https://**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.hostname==='esm.sh'&&url.pathname.includes('clerk-js'))return route.fulfill({contentType:'text/javascript',body:clerkMock});
    if(url.hostname==='clerk.parallelvisionlabel.com')return route.fulfill({contentType:'text/javascript',body:''});
    if(url.hostname==='checkout.stripe.com')return route.fulfill({contentType:'text/html',body:'<h1>Intercepted checkout test</h1>'});
    if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev')return route.abort();
    if(request.method()!=='GET')writes.push({path:url.pathname,body:request.postData()});
    const send=data=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
    if(url.pathname==='/api/session')return send(session);
    if(url.pathname==='/api/customer/wallet'){
      if(heldWallet)await heldWallet;
      return send({...session,activity:[{delta_credits:-42,kind:'generation',created_at:1720000000000},{delta_credits:1000,kind:'purchase',created_at:1719000000000}]});
    }
    if(url.pathname==='/api/customer/account'&&request.method()==='DELETE')return route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({accepted:true})});
    if(url.pathname==='/api/customer/account')return send({storage:{bytes:1024**3,limitBytes:20*1024**3,files:15}});
    if(url.pathname==='/api/billing/portal')return send({url:'https://evil.example/stripe.com'});
    if(url.pathname==='/api/billing/checkout'){if(heldCheckout)await heldCheckout;return send({url:checkoutUrl});}
    if(url.pathname==='/api/customer/referrals')return send({rewardsAvailable:false});
    return send({jobs:[],activeJobs:[],next:null,packs:[],characters:[],moods:[],boards:[],folders:[],models:[],configured:false});
  });
  return {context,page,errors,writes,session,setCheckoutUrl(url){checkoutUrl=url;},holdCheckout(){heldCheckout=new Promise(r=>releaseCheckout=r);},releaseCheckout(){heldCheckout=null;releaseCheckout?.();},holdWallet(){heldWallet=new Promise(r=>releaseWallet=r);},releaseWallet(){heldWallet=null;releaseWallet?.();}};
}
async function fits(page,label){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,label+' horizontal overflow');}
try{
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
      await page.locator('#lab-credits-dialog[open]').waitFor();
      assert.equal(await page.locator('#lab-credit-products button').count(),3);
      assert.equal(await page.locator('#lab-credit-products').getByText('€29',{exact:true}).count(),1);
      await fits(page,'credit deck '+width);
      const deck=await page.locator('#lab-credits-dialog').boundingBox();assert.ok(deck.x>=0&&deck.x+deck.width<=width+1);
      await page.screenshot({path:artifacts+'/credit-deck-'+width+'.png'});
      await page.keyboard.press('Escape');
      await page.fill('#image-composer-prompt','Keep this exact draft.');
      await page.evaluate(()=>document.getElementById('lab-wallet-toggle').click());await page.keyboard.press('Escape');
      assert.equal(await page.locator('#image-composer-prompt').inputValue(),'Keep this exact draft.');
      assert.equal(writes.some(x=>x.path==='/api/billing/checkout'||x.path==='/api/jobs'||x.path==='/api/image-models/generate'),false,'opening/closing the credit deck never submits a payment or generation');
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
      await page.locator('#lab-credits-dialog[open]').waitFor();
      await page.click('#lab-credit-refresh');
      await page.waitForFunction(()=>document.querySelector('#lab-credit-balance').textContent==='1,000 credits');
      assert.equal(await page.locator('#lab-credit-banner').isVisible(),false);
      session.balanceCredits=0;await page.click('#lab-credit-refresh');
      await page.locator('#lab-credit-banner').waitFor({state:'visible'});
      session.billingReady=false;await page.click('#lab-credit-refresh');
      await page.waitForFunction(()=>document.querySelector('#lab-credit-products button').disabled);
      assert.equal(await page.locator('#lab-credit-products button:not([disabled])').count(),0);
      session.billingReady=true;session.products=products.filter(p=>p.id==='topup10');session.pilot=true;
      await page.click('#lab-credit-refresh');await page.waitForFunction(()=>document.querySelectorAll('#lab-credit-products button').length===1&&!document.querySelector('#lab-credit-products button').disabled);
      assert.equal(await page.locator('#lab-credit-invite').isVisible(),false,'private pilot does not advertise referrals');
      rig.holdCheckout();
      await page.locator('#lab-credit-products button').evaluate(button=>{button.click();button.click();});
      await page.waitForFunction(()=>document.querySelector('#lab-wallet-state').textContent.includes('Opening secure checkout'));
      assert.equal(writes.filter(x=>x.path==='/api/billing/checkout').length,1,'one checkout request while pending');
      assert.deepEqual(JSON.parse(writes.at(-1).body),{sku:'topup10'});
      rig.releaseCheckout();await page.waitForFunction(()=>document.querySelector('#lab-wallet-state').textContent.includes('Unverified checkout link'));
      assert.ok(page.url().startsWith(origin),'untrusted checkout cannot navigate');
      rig.holdCheckout();await page.locator('#lab-credit-products button').click();
      await page.evaluate(()=>window.mockClerk.signOut());rig.releaseCheckout();
      await page.locator('#gate').waitFor({state:'visible'});
      assert.equal(await page.locator('#lab-credit-banner').isVisible(),false);
      assert.equal(await page.locator('#lab-add-credits').isVisible(),false);
      assert.equal(await page.locator('#lab-credits-dialog').isVisible(),false);
      assert.equal(await page.locator('#lab-credit-products button').count(),0);
      assert.deepEqual(errors,[]);
      console.log('PASS credit banner, deck, real balance changes, pilot products, checkout guards and sign-out at '+width+'px');
    }finally{rig.releaseCheckout();await rig.context.close();}
  }
  // A successful deletion request signs out the same Clerk session and clears
  // the deleted customer's identity and credit balance from the homepage.
  for(const width of [1440,390]){
    const rig=await setup(width,true),{page,writes,errors}=rig;
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
      assert.equal(await page.locator('#lab-home-credits').isVisible(),false,'Closed accounts do not advertise spendable credits');
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
            const contentRight=await page.locator('#studio-header .wrap.top').evaluate(el=>el.getBoundingClientRect().right);
            assert.ok(Math.abs(contentRight-actions.x-actions.width-(width<=640?10:16))<1,'Studio controls align to the usable page edge even with a reserved Image scrollbar');
          }
          await summary.click();await page.locator('[data-account-name]').getByText('Alex Test',{exact:true}).waitFor();
          assert.match(await page.locator('[data-account-balance]').textContent(),customer?/1,234 credits/:/Owner workspace/,path+' '+await page.locator('body').innerText());
          if(path==='/lab/index.html'){
            assert.equal(await page.locator('#lab-home-upgrade').count(),0,'No competing Upgrade button');
            assert.equal(await page.locator('#lab-home-credits').isVisible(),true,'Credits entry remains visible for customers and owner');
            if(customer){
              assert.equal(await page.locator('#lab-home-credit-copy').textContent(),'1,234');
              assert.equal(await page.locator('#lab-home-credits').getAttribute('href'),'#pricing');
              assert.equal(await page.locator('.pv-account-panel a[href="#pricing"]').count(),1);
              assert.equal(await page.locator('.pv-account-panel a[href="./account.html"]').count(),1);
            }
          }
          const identity=page.locator('.pv-account-identity');
          assert.equal(await identity.isVisible(),true,'Authenticated identity appears beneath the original wordmark');
          assert.equal(await identity.locator('strong').textContent(),'Alex Test');
          assert.equal(await identity.locator('.pv-account-identity-avatar').textContent(),'AT');
          assert.match(await page.locator('.pv-account-details').evaluate(el=>getComputedStyle(el,'::before').backgroundImage),/pvlab-wordmark\.svg/,'Existing PV LAB logo asset is retained');
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
      await page.waitForFunction(()=>document.getElementById('lab-home-credit-copy')?.textContent==='Get credits');
      assert.equal(await page.locator('#lab-home-credit-copy').textContent(),'Get credits');
      assert.equal(await page.locator('#lab-home-credit-unit').isVisible(),false);
      assert.equal(await page.locator('#lab-home-credits').getAttribute('aria-label'),'Get credits');
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
