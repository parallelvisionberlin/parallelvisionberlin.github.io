// Synthetic identities and intercepted API responses only. No real account calls.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const {chromium}=await import(process.env.PV_PLAYWRIGHT_MODULE||'playwright');
const root=resolve('.'),output=resolve('test-results/vitolas');await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!path.startsWith(root+'/'))return res.writeHead(403).end();
  try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const mock=`const listeners=[];const account={isSignedIn:true,user:{id:'user_Synthetic',fullName:'Victoria Test'},session:{id:'synthetic',getToken:async()=>'test-token'},addListener(fn){listeners.push(fn)},openSignIn(){},async signOut(){this.isSignedIn=false;this.user=null;this.session=null;listeners.forEach(fn=>fn())}};window.mockAccount=account;export async function loadLabAccount(){return account}`;
let checks=0;
try{
  for(const width of [320,390,768,1440]){
    const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
    const errors=[],writes=[],requests=[];let allowed=true,hold=false,release,ownerView=false,awaitingPartner=false,failCreate=false,holdGift=false,releaseGift;
    let total=1000,issued=0;
    const sample=(code,note,used=0)=>({code,note,credits:100,maxRedemptions:1,redemptionCount:used,active:1,expiresAt:Date.now()+14*86400000,createdAt:Date.now(),url:'https://pvlab.studio/account.html?voucher='+code+'&ref=ABCDEFGH#voucher'});
    const vouchers=[sample('VT'+'A'.repeat(20),'Beauty founders / Octubre'),sample('VT'+'B'.repeat(20),'Primera imagen',1)];
    const budget=()=>{const redeemed=vouchers.reduce((sum,v)=>sum+v.credits*v.redemptionCount,0),reserved=vouchers.reduce((sum,v)=>sum+(v.active&&!v.redemptionCount?v.credits:0),0);return {total,redeemed,reserved,available:Math.max(0,total-redeemed-reserved),maxPerInvitation:500};};
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/native-account.js?**',route=>route.fulfill({contentType:'text/javascript',body:mock}));
    await page.route('https://parallel-vision-lab.parallelvision.workers.dev/**',async route=>{
      const req=route.request(),url=new URL(req.url());requests.push(url.pathname);if(req.method()!=='GET')writes.push(url.pathname);
      const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
      if(url.pathname==='/api/session')return send({owner:ownerView,customer:!ownerView,balanceCredits:0,partnerDashboard:allowed&&!ownerView?{slug:'vitolas-studio',name:'Vitolas Studio'}:null});
      if(/\/partner\/|\/partners\/vitolas-studio\//.test(url.pathname)){
        if(!allowed||(url.pathname.startsWith('/api/admin/')&&!ownerView))return send({error:'Denied'},403);
        if(req.method()==='GET')return send({ownerView,budget:budget(),vouchers,redemptions:[{code:vouchers[1].code,note:'Primera imagen',credits:100,email:'friend@example.test',redeemedAt:Date.now()}]});
        const data=req.postDataJSON();
        if(url.pathname.endsWith('/budget')){if(!ownerView)return send({error:'Owner only'},403);total=data.total;return send({budget:budget()});}
        if(url.pathname.endsWith('/deactivate')){vouchers.find(v=>v.code===data.code).active=0;return send({deactivated:true,budget:budget()});}
        if(failCreate)return send({error:'Presupuesto insuficiente. Actualiza el panel.'},409);
        if(holdGift)await new Promise(resolve=>{releaseGift=resolve});
        const voucher={...sample('VT'+String(++issued).padStart(20,'0'),data.note),credits:data.credits};vouchers.unshift(voucher);
        return send({voucher,budget:budget()},201);
      }
      if(['/api/customer/partner','/api/admin/partners/vitolas-studio'].includes(url.pathname)){
        if(hold)await new Promise(resolve=>{release=resolve});
        if(!allowed||(url.pathname.startsWith('/api/admin/')&&!ownerView))return send({error:'Denied'},403);
        if(awaitingPartner)return send({workspace:{slug:'vitolas-studio',name:'Vitolas Studio'},ownerView:true,awaitingPartner:true});
        return send({workspace:{slug:'vitolas-studio',name:'Vitolas Studio'},referralUrl:'https://pvlab.studio/?ref=ABCDEFGH',totals:{registered:1,payingCustomers:1,activeSubscriptions:1,purchases:2},customers:[{email:'friend@example.test',registeredAt:Date.now(),paid:1,subscribed:1,purchases:2}],nextOffset:null});
      }
      return send({});
    });
    await page.goto(origin+'/lab/vitolas-studio.html');
    await page.locator('#partner-content:not([hidden])').waitFor();
    await page.locator('#partner-voucher-workspace:not([hidden])').waitFor();
    await page.waitForFunction(()=>document.querySelector('.partner-hero-image').complete&&document.querySelector('.partner-hero-image').naturalWidth>0);
    assert.equal(await page.locator('.partner-hero-image').evaluate(image=>image.naturalWidth>=1900),true);checks++;
    assert.equal(await page.locator('#partner-title').evaluate(title=>{const hero=title.closest('.partner-hero').getBoundingClientRect(),box=title.getBoundingClientRect();return box.left>=hero.left&&box.right<=hero.right&&box.bottom<=hero.bottom}),true);checks++;
    assert.equal(await page.locator('#partner-rows').textContent().then(t=>t.includes('friend@example.test')),true);checks++;
    assert.equal(await page.locator('#partner-purchases').textContent(),'2');checks++;
    assert.equal(await page.locator('[data-account-admin]').isVisible(),false);checks++;
    await page.locator('#account-menu summary').click();
    assert.equal(await page.locator('[data-account-partner]').isVisible(),true);checks++;
    await page.locator('#account-menu summary').click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks++;
    assert.deepEqual(writes,[]);checks++;
    assert.equal(await page.locator('#partner-budget-form').isVisible(),false);checks++;
    assert.equal(await page.locator('#partner-budget-available').textContent(),'800');checks++;
    await page.locator('[data-partner-credits="200"]').click();
    assert.equal(await page.locator('#partner-preview-credits').textContent(),'200');checks++;
    await page.locator('#partner-voucher-note').fill('New beauty campaign');
    assert.equal(await page.locator('#partner-preview-note').textContent(),'New beauty campaign');checks++;
    failCreate=true;await page.locator('#partner-voucher-create').click();
    await page.waitForFunction(()=>document.querySelector('#partner-voucher-status').textContent.includes('Presupuesto insuficiente'));
    assert.equal(await page.locator('#partner-voucher-result').isVisible(),false);checks++;
    failCreate=false;await page.locator('#partner-voucher-create').click();
    await page.locator('#partner-voucher-result:not([hidden])').waitFor();
    await page.waitForFunction(()=>document.querySelector('#partner-voucher-status').textContent.includes('Invitación creada'));
    assert.match(await page.locator('#partner-voucher-url').inputValue(),/voucher=VT\d{20}&ref=ABCDEFGH#voucher/);checks++;
    assert.equal(await page.locator('#partner-budget-reserved').textContent(),'300');checks++;
    await context.grantPermissions(['clipboard-read','clipboard-write']);
    await page.locator('#partner-message-copy').click();
    assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/200 créditos de parte de Vitolas Studio/);checks++;
    await page.locator('#partner-redemption-rows').evaluate(el=>el.closest('details').open=true);
    assert.match(await page.locator('#partner-redemption-rows').textContent(),/friend@example.test/);checks++;
    await page.screenshot({path:output+'/dashboard-'+width+'.png',fullPage:true});
    await page.locator('#partner-voucher-rows tr').filter({hasText:'New beauty campaign'}).getByRole('button',{name:'Desactivar'}).click();
    await page.waitForFunction(()=>document.querySelector('#partner-voucher-status').textContent.includes('desactivada'));
    assert.equal(await page.locator('#partner-voucher-result').isVisible(),false);checks++;
    assert.equal(await page.locator('#partner-budget-available').textContent(),'800');checks++;
    await page.evaluate(()=>window.mockAccount.signOut());
    assert.equal(await page.locator('#partner-content').isVisible(),false);checks++;
    assert.equal(await page.locator('#partner-rows').textContent(),'');checks++;
    assert.equal(await page.locator('#partner-url').inputValue(),'');checks++;
    assert.equal(await page.locator('#partner-voucher-url').inputValue(),'');checks++;
    assert.equal(await page.locator('#partner-redemption-rows').textContent(),'');checks++;
    allowed=false;
    await page.reload();await page.waitForFunction(()=>document.querySelector('#partner-status').textContent.includes('no tiene acceso'));
    assert.equal(await page.locator('#partner-content').isVisible(),false);checks++;
    assert.equal(await page.locator('[data-account-partner]').isVisible(),false);checks++;
    await page.goto(origin+'/lab/vitolas-studio.html?view=owner');
    await page.waitForFunction(()=>document.querySelector('#partner-status').textContent.includes('no tiene acceso'));
    assert.equal(requests.includes('/api/admin/partners/vitolas-studio'),false);checks++;
    ownerView=true;allowed=true;await page.reload();
    await page.locator('#partner-content:not([hidden])').waitFor();
    await page.locator('#partner-budget-form:not([hidden])').waitFor();
    await page.locator('#partner-budget-total').fill('2000');await page.locator('#partner-budget-form button').click();
    await page.waitForFunction(()=>document.querySelector('#partner-voucher-status').textContent.includes('Presupuesto guardado'));
    assert.equal(await page.locator('#partner-budget-available').textContent(),(1800).toLocaleString('es'));checks++;
    await page.screenshot({path:output+'/owner-invitations-'+width+'.png',fullPage:true});
    assert.equal(requests.includes('/api/admin/partners/vitolas-studio'),true);checks++;
    assert.equal(await page.locator('#partner-purchases').textContent(),'2');checks++;
    assert.equal(await page.locator('[data-account-admin]').getAttribute('hidden'),null);checks++;
    awaitingPartner=true;await page.reload();
    await page.waitForFunction(()=>document.querySelector('#partner-status').textContent.includes('Victoria debe iniciar sesión'));
    assert.equal(await page.locator('#partner-content').isVisible(),false);checks++;
    assert.equal(await page.locator('#partner-url').inputValue(),'');checks++;
    ownerView=false;awaitingPartner=false;
    total=0;await page.reload();await page.locator('#partner-voucher-workspace:not([hidden])').waitFor();
    assert.equal(await page.locator('#partner-budget-empty').isVisible(),true);checks++;
    assert.equal(await page.locator('#partner-voucher-create').isDisabled(),true);checks++;
    total=2000;
    for(const role of [false,true]){
      ownerView=role;allowed=true;hold=true;
      const path=role?'/api/admin/partners/vitolas-studio':'/api/customer/partner';
      const pending=page.waitForRequest(req=>new URL(req.url()).pathname===path);
      await page.reload();await pending;
      await page.evaluate(()=>window.mockAccount.signOut());release();
      await page.waitForTimeout(100);
      assert.equal(await page.locator('#partner-content').isVisible(),false);checks++;
      assert.equal(await page.locator('#partner-rows').textContent(),'');checks++;
    }
    hold=false;
    for(const role of [false,true]){
      ownerView=role;allowed=true;await page.reload();await page.locator('#partner-voucher-workspace:not([hidden])').waitFor();
      await page.locator('#partner-voucher-note').fill('Delayed invitation');holdGift=true;
      const pending=page.waitForRequest(req=>req.method()==='POST'&&new URL(req.url()).pathname.endsWith('/vouchers'));
      await page.locator('#partner-voucher-create').click();await pending;
      await page.evaluate(()=>window.mockAccount.signOut());releaseGift();await page.waitForTimeout(100);holdGift=false;
      assert.equal(await page.locator('#partner-voucher-result').isVisible(),false);checks++;
      assert.equal(await page.locator('#partner-voucher-url').inputValue(),'');checks++;
      assert.equal(await page.locator('#partner-voucher-rows').textContent(),'');checks++;
    }
    hold=false;ownerView=true;allowed=true;
    await page.goto(origin+'/lab/owner.html');
    await page.locator('#owner-dashboard:not([hidden])').waitFor();
    assert.equal(await page.locator('[data-owner-vitolas]').evaluateAll(links=>links.length===2&&links.every(link=>!link.hidden)),true);checks++;
    const privateLink=page.locator(width<=900?'.owner-jumpbar [data-owner-vitolas]':'.owner-sidebar [data-owner-vitolas]');
    assert.equal(await privateLink.isVisible(),true);checks++;
    await page.screenshot({path:output+'/owner-navigation-'+width+'.png',fullPage:true});
    await privateLink.click();await page.locator('#partner-content:not([hidden])').waitFor();
    assert.equal(await page.locator('#partner-purchases').textContent(),'2');checks++;
    ownerView=false;allowed=false;await page.goto(origin+'/lab/owner.html');
    await page.waitForFunction(()=>document.querySelector('#owner-status').textContent.includes('reserved'));
    assert.equal(await page.locator('[data-owner-vitolas]').evaluateAll(links=>links.every(link=>link.hidden)),true);checks++;
    ownerView=true;allowed=true;await page.goto(origin+'/lab/owner.html');
    await page.locator('#owner-dashboard:not([hidden])').waitFor();
    await page.evaluate(()=>window.mockAccount.signOut());
    assert.equal(await page.locator('[data-owner-vitolas]').evaluateAll(links=>links.every(link=>link.hidden)),true);checks++;
    const expectedWrites=new Set(['/api/customer/partner/vouchers','/api/customer/partner/vouchers/deactivate','/api/admin/partners/vitolas-studio/budget','/api/admin/partners/vitolas-studio/vouchers']);
    assert.deepEqual(errors,[]);assert.equal(writes.every(path=>expectedWrites.has(path)),true,JSON.stringify(writes));checks+=2;
    await context.close();
  }
  console.log(checks+' dashboard browser assertions passed');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
