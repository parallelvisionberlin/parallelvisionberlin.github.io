// Synthetic identities and intercepted API responses only. No real account calls.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const {chromium}=await import(process.env.PV_PLAYWRIGHT_MODULE||'playwright');
const workspaceSlug=process.env.PV_PARTNER_WORKSPACE==='bellini-studio'?'bellini-studio':'vitolas-studio';
const studioName=workspaceSlug==='bellini-studio'?'Bellini Studios':'Vitolas Studio';
const alias=workspaceSlug==='bellini-studio'?'bellini':'vitolas';
const adminPath='/api/admin/partners/'+workspaceSlug;
const root=resolve('.'),output=resolve('test-results/'+alias);await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!path.startsWith(root+'/'))return res.writeHead(403).end();
  try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const mock=`const listeners=[];const account={isSignedIn:true,user:{id:'user_Synthetic',fullName:'Victoria Test'},session:{id:'synthetic',getToken:async()=>'test-token'},addListener(fn){listeners.push(fn)},emit(){listeners.forEach(fn=>fn())},openSignIn(){},async signOut(){this.isSignedIn=false;this.user=null;this.session=null;listeners.forEach(fn=>fn())}};window.mockAccount=account;export async function loadLabAccount(){return account}`;
let checks=0;
async function capture(page,name){await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:output+'/'+name,fullPage:true});}
try{
  for(const width of (process.env.PV_PARTNER_WIDTHS?process.env.PV_PARTNER_WIDTHS.split(',').map(Number):[320,390,768,1440,1920])){
    const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
    const errors=[],writes=[],requests=[];let allowed=true,hold=false,release,ownerView=false,awaitingPartner=false,failCreate=false,holdGift=false,releaseGift,businessUnavailable=false,releaseSearch,manyCustomers=false,emptyWorkspace=false,manyGifts=false;
    let total=1000,issued=0;
    const sample=(code,note,used=0)=>({code,note,credits:100,maxRedemptions:1,redemptionCount:used,active:1,expiresAt:Date.now()+14*86400000,createdAt:Date.now(),url:'https://pvlab.studio/account.html?voucher='+code+'&ref=ABCDEFGH#voucher'});
    const vouchers=[sample('VT'+'A'.repeat(20),'Beauty founders / Octubre'),sample('VT'+'B'.repeat(20),'Primera imagen',1)];
    const budget=()=>{const redeemed=vouchers.reduce((sum,v)=>sum+v.credits*v.redemptionCount,0),reserved=vouchers.reduce((sum,v)=>sum+(v.active&&!v.redemptionCount?v.credits:0),0);return {total,redeemed,reserved,available:Math.max(0,total-redeemed-reserved),maxPerInvitation:500};};
    const receipts=[{reference:'invoice:renewal',email:'friend@example.test',kind:'subscription',amountCents:1500,commissionCents:300,rate:20,status:'accrued',paidAt:Date.now(),recordedAt:Date.now()},{reference:'invoice:first',email:'=formula@example.test',kind:'subscription',amountCents:1500,commissionCents:750,rate:50,status:'accrued',paidAt:Date.now()-30*86400000,recordedAt:Date.now()}];
    const commissions={totals:{revenueCents:3000,commissionCents:1050,heldCommissionCents:0,needsReconciliation:0},receipts,recentPurchases:receipts};
    const tab=name=>page.getByRole('tab',{name,exact:true});
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/native-account.js?**',route=>route.fulfill({contentType:'text/javascript',body:mock}));
    await page.route('https://parallel-vision-lab.parallelvision.workers.dev/**',async route=>{
      const req=route.request(),url=new URL(req.url());requests.push(url.pathname);if(req.method()!=='GET')writes.push(url.pathname);
      const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
      if(url.pathname==='/api/partners/'+alias+'/link')return send({url:'https://pvlab.studio/?ref=ABCDEFGH'});
      if(url.pathname==='/api/session')return send({owner:ownerView,customer:!ownerView,balanceCredits:0,partnerDashboard:allowed&&!ownerView?{slug:workspaceSlug,name:studioName}:null});
      if((url.pathname.startsWith('/api/customer/partner/')||url.pathname.startsWith(adminPath+'/'))){
        if(!allowed||(url.pathname.startsWith('/api/admin/')&&!ownerView))return send({error:'Denied'},403);
        if(req.method()==='GET'){
          if(manyGifts){const gifts=Array.from({length:43},(_,i)=>sample('VT'+String(i).padStart(20,'0'),'Invitation '+i,i<23?1:0));const claims=Array.from({length:23},(_,i)=>({code:gifts[i].code,note:gifts[i].note,credits:100,email:'recipient'+i+'@example.test',redeemedAt:Date.now()}));return send({ownerView,budget:{total:10000,available:5700,reserved:2000,redeemed:2300},vouchers:gifts,redemptions:claims});}
          return send({ownerView,budget:budget(),vouchers,redemptions:[{code:vouchers[1].code,note:'Primera imagen',credits:100,email:'friend@example.test',redeemedAt:Date.now()}]});
        }
        const data=req.postDataJSON();
        if(url.pathname.endsWith('/budget')){if(!ownerView)return send({error:'Owner only'},403);total=data.total;return send({budget:budget()});}
        if(url.pathname.endsWith('/deactivate')){vouchers.find(v=>v.code===data.code).active=0;return send({deactivated:true,budget:budget()});}
        if(failCreate)return send({error:'Presupuesto insuficiente. Actualiza el panel.'},409);
        if(holdGift)await new Promise(resolve=>{releaseGift=resolve});
        const voucher={...sample('VT'+String(++issued).padStart(20,'0'),data.note),credits:data.credits};vouchers.unshift(voucher);
        return send({voucher,budget:budget()},201);
      }
      if(['/api/customer/partner',adminPath].includes(url.pathname)){
        if(hold)await new Promise(resolve=>{release=resolve});
        if(!allowed||(url.pathname.startsWith('/api/admin/')&&!ownerView))return send({error:'Denied'},403);
        if(awaitingPartner)return send({workspace:{slug:workspaceSlug,name:studioName},ownerView:true,awaitingPartner:true});
        const q=url.searchParams.get('q')||'',filter=url.searchParams.get('filter')||'all';
        if(q==='failure')return send({error:'Search unavailable'},503);
        if(q==='hold')await new Promise(resolve=>{releaseSearch=resolve});
        let people=[{email:'friend@example.test',registeredAt:Date.now(),paid:1,subscribed:1,purchases:2,commissionCents:300,paymentReferences:['invoice:renewal']},{email:'aura@example.test',registeredAt:Date.now()-86400000,paid:1,subscribed:1,purchases:1,commissionCents:750,paymentReferences:['invoice:first']},{email:'mara@example.test',registeredAt:Date.now()-2*86400000,paid:1,subscribed:0,purchases:1,commissionCents:0,paymentReferences:[]},{email:'lina@example.test',registeredAt:Date.now()-3*86400000,paid:0,subscribed:0,purchases:0,commissionCents:0,paymentReferences:[]},{email:'nora@example.test',registeredAt:Date.now()-4*86400000,paid:0,subscribed:0,purchases:0,commissionCents:0,paymentReferences:[]}];
        if(manyCustomers)people=Array.from({length:105},(_,i)=>({email:'client'+i+'@example.test',registeredAt:Date.now(),paid:0,subscribed:0,purchases:0,commissionCents:0,paymentReferences:[]}));
        if(emptyWorkspace)people=[];
        const shown=people.filter(p=>(!q||q==='hold'||p.email.includes(q))&&(filter==='all'||filter==='registered'&&!p.paid||filter==='paying'&&p.paid||filter==='subscribed'&&p.subscribed));
        return send({workspace:{slug:workspaceSlug,name:studioName},shareUrl:'https://pvlab.studio/'+alias,referralUrl:'https://pvlab.studio/?ref=ABCDEFGH',commissions:businessUnavailable?null:emptyWorkspace?{totals:{commissionCents:0,revenueCents:0,heldCommissionCents:0,needsReconciliation:0},receipts:[],recentPurchases:[]}:commissions,totals:{registered:emptyWorkspace?0:manyCustomers?105:5,payingCustomers:emptyWorkspace||manyCustomers?0:3,activeSubscriptions:emptyWorkspace||manyCustomers?0:2,purchases:emptyWorkspace||manyCustomers?0:2},customers:shown.slice(Number(url.searchParams.get('offset')||0),Number(url.searchParams.get('offset')||0)+100),nextOffset:Number(url.searchParams.get('offset')||0)+100<shown.length?Number(url.searchParams.get('offset')||0)+100:null});
      }
      return send({});
    });
    await page.route('https://pvlab.studio/?ref=ABCDEFGH',route=>route.fulfill({contentType:'text/html',body:'<title>Synthetic referral destination</title>'}));
    await page.goto(origin+'/lab/'+alias+'.html?ref=HACK');await page.waitForURL('https://pvlab.studio/?ref=ABCDEFGH');
    assert.equal(page.url(),'https://pvlab.studio/?ref=ABCDEFGH');checks++;
    await page.goto(origin+'/lab/'+workspaceSlug+'.html');
    await page.locator('#partner-content:not([hidden])').waitFor();
    await page.goto(origin+'/lab/'+(workspaceSlug==='bellini-studio'?'vitolas-studio':'bellini-studio')+'.html');
    await page.waitForFunction(()=>document.getElementById('partner-status').textContent.includes('no tiene acceso'));
    assert.equal(await page.locator('#partner-content').isHidden(),true);checks++;
    await page.goto(origin+'/lab/'+workspaceSlug+'.html');
    await page.locator('#partner-content:not([hidden])').waitFor();
    await page.waitForFunction(()=>!document.querySelector('#partner-voucher-workspace').hidden);
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
    assert.equal(await page.locator('.partner-hero').evaluate(el=>el.getBoundingClientRect().height<=270),true);checks++;
    assert.equal(await page.locator('#partner-results').evaluate(el=>el.compareDocumentPosition(document.getElementById('partner-invitations'))&Node.DOCUMENT_POSITION_FOLLOWING?true:false),true);checks++;
    assert.equal(await page.locator('.partner-metrics').evaluate(el=>!!(el.compareDocumentPosition(document.querySelector('.partner-link'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);checks++;
    assert.equal(await page.getByRole('tab').count(),5);assert.equal(await tab('Resumen').getAttribute('aria-selected'),'true');assert.equal(await page.locator('.partner-agreement').isVisible(),true);checks+=2;checks++;
    assert.equal(await page.locator('#partner-url').inputValue(),'https://pvlab.studio/'+alias);checks++;
    assert.equal(await page.locator('#partner-commission').textContent(),new Intl.NumberFormat('es',{style:'currency',currency:'EUR'}).format(10.50));checks++;
    assert.equal(await page.locator('dialog').count(),0);checks++;
    assert.equal(await page.locator('header #partner-title').count(),1);assert.equal(await page.locator('.partner-client-avatar').count(),5);checks+=2;
    assert.equal(await page.locator('#partner-prev').isDisabled(),true);assert.equal(await page.locator('#partner-more').isDisabled(),true);checks+=2;
    if(width===1440){
      assert.ok(await page.locator('.partner-shell').evaluate(el=>el.getBoundingClientRect().width>=innerWidth*.98));
      assert.ok(await page.locator('.partner-client-identity strong').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
      assert.ok(await page.locator('#partner-commission').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=44));checks+=3;
    }
    await page.waitForFunction(()=>document.querySelector('header .lab-wordmark').complete&&document.querySelector('header .lab-wordmark').naturalWidth>0);
    assert.match(await page.locator('header .lab-wordmark').getAttribute('src'),/pvlab-wordmark-bold.svg/);assert.match(await page.locator('#partner-latest-signups').textContent(),/friend@example.test/);assert.match(await page.locator('#partner-recent-purchases').textContent(),/Tu comisión/);checks+=3;
    assert.deepEqual(await page.locator('#partner-results>div>strong').evaluateAll(nodes=>nodes.map(n=>n.id)),['partner-subscribed','partner-paying','partner-overview-revenue','partner-commission']);checks++;
    assert.ok(await page.locator('#partner-results').evaluate(el=>el.getBoundingClientRect().top<document.querySelector('.partner-link').getBoundingClientRect().top));checks++;
    await page.locator('[data-partner-overview-filter="subscribed"]').click();await page.waitForFunction(()=>document.querySelector('[data-partner-filter="subscribed"]').getAttribute('aria-pressed')==='true');assert.equal(await tab('Clientes').getAttribute('aria-selected'),'true');checks++;
    await tab('Resumen').click();await page.locator('[data-partner-overview-filter="paying"]').click();await page.waitForFunction(()=>document.querySelector('[data-partner-filter="paying"]').getAttribute('aria-pressed')==='true');assert.equal(await tab('Clientes').getAttribute('aria-selected'),'true');checks++;
    await page.locator('[data-partner-filter="all"]').click();await page.waitForFunction(()=>document.querySelectorAll('.partner-client-name').length===5);await tab('Resumen').click();
    assert.ok(await page.locator('#partner-results').evaluate(board=>[...board.querySelectorAll(':scope>div')].every(cell=>{const a=cell.querySelector('strong').getBoundingClientRect(),b=cell.querySelector('button').getBoundingClientRect();return a.bottom<=b.top||a.right<=b.left||b.right<=a.left;})));checks++;
    await capture(page,'overview-'+width+'.png');
    await tab('Guía').click();assert.equal(await page.evaluate(()=>scrollY),0);assert.ok(await page.locator('.partner-hero').evaluate(el=>el.getBoundingClientRect().top===0));checks+=2;assert.equal(await page.locator('#partner-help').isVisible(),true);assert.equal(await page.locator('.partner-help-grid article').count(),8);checks+=2;
    await tab('Guía').press('Home');await tab('Resumen').press('ArrowRight');assert.equal(await tab('Clientes').getAttribute('aria-selected'),'true');checks++;
    await tab('Clientes').click();
    await page.locator('.partner-client-name').first().click();assert.match(await page.locator('.partner-client-detail').textContent(),/Comisión:.*3,00/);checks++;
    await page.locator('.partner-client-name').first().click();assert.equal(await page.locator('.partner-client-detail').count(),0);checks++;
    assert.equal(await page.locator('.partner-help-grid article').count(),8);checks++;
    await capture(page,'clients-'+width+'.png');
    await tab('Comisiones').click();
    assert.equal(await page.locator('#partner-commission-history').isVisible(),true);assert.equal(await page.locator('#partner-commission-history').evaluate(el=>el.getBoundingClientRect().width>=innerWidth*.85),true);checks+=2;
    const downloading=page.waitForEvent('download');await page.locator('#partner-export').click();const download=await downloading;
    const csv=await readFile(await download.path(),'utf8');assert.match(csv,/Comisión EUR/);assert.match(csv,/'=formula@example.test/);checks+=2;
    await tab('Clientes').click();
    assert.equal(await page.locator('dialog').count(),0);checks++;
    const searching=page.waitForRequest(req=>new URL(req.url()).searchParams.get('q')==='aura');
    await page.locator('#partner-search').fill('aura');await searching;await page.waitForFunction(()=>document.querySelector('#partner-customer-status').textContent==='');
    assert.ok(requests.filter(path=>path==='/api/customer/partner').length>=2);assert.equal(await page.locator('#partner-rows tr').count(),1);assert.match(await page.locator('#partner-rows').textContent(),/aura@example.test/);checks+=3;
    const clearing=page.waitForRequest(req=>new URL(req.url()).pathname==='/api/customer/partner'&&!new URL(req.url()).searchParams.has('q'));
    await page.locator('#partner-search').fill('');await clearing;await page.waitForFunction(()=>document.querySelector('#partner-customer-status').textContent==='');
    if(width===1440){
      const heldSearch=page.waitForRequest(req=>new URL(req.url()).searchParams.get('q')==='hold');await page.locator('#partner-search').fill('hold');await heldSearch;
      const latestSearch=page.waitForRequest(req=>new URL(req.url()).searchParams.get('q')==='nora');await page.locator('#partner-search').fill('nora');await latestSearch;
      await page.waitForFunction(()=>document.querySelector('#partner-customer-status').textContent==='');releaseSearch();await page.waitForTimeout(100);
      assert.equal(await page.locator('#partner-rows tr').count(),1);assert.match(await page.locator('#partner-rows').textContent(),/nora@example.test/);checks+=2;
      const reset=page.waitForRequest(req=>new URL(req.url()).pathname==='/api/customer/partner'&&!new URL(req.url()).searchParams.has('q'));await page.locator('#partner-search').fill('');await reset;
      await page.waitForFunction(()=>document.querySelector('#partner-customer-status').textContent==='');
    }
    await page.locator('[data-partner-filter="subscribed"]').click();
    await page.waitForFunction(()=>document.querySelector('[data-partner-filter="subscribed"]').getAttribute('aria-pressed')==='true');
    assert.equal(requests.filter(path=>path==='/api/customer/partner').length>=2,true);checks++;
    await page.locator('[data-partner-filter="all"]').click();
    await page.waitForFunction(()=>document.querySelector('[data-partner-filter="all"]').getAttribute('aria-pressed')==='true');
    assert.deepEqual(writes,[]);checks++;
    assert.equal(await page.locator('#partner-budget-form').isVisible(),false);checks++;
    assert.equal(await page.locator('#partner-budget-available').textContent(),'800');checks++;
    await tab('Invitaciones').click();
    assert.equal(await page.locator('#partner-voucher-note').getAttribute('required'),null);checks++;
    await page.locator('#partner-voucher-credits').fill('50');await page.locator('#partner-voucher-days').selectOption('7');
    assert.equal(await page.locator('#partner-voucher-create').isEnabled(),true);assert.equal(await page.locator('[data-partner-credits][aria-pressed=true]').count(),0);checks+=2;
    await page.locator('#partner-voucher-days').selectOption('30');assert.equal(await page.locator('#partner-voucher-days').inputValue(),'30');checks++;
    await page.locator('#partner-voucher-days').selectOption('14');
    await page.locator('[data-partner-credits="200"]').click();
    assert.equal(await page.locator('#partner-voucher-credits').inputValue(),'200');checks++;
    await page.locator('#partner-voucher-note').fill('New beauty campaign');
    assert.equal(await page.locator('[data-partner-credits="200"]').getAttribute('aria-pressed'),'true');
    const beforeRenewal=requests.length;
    await page.evaluate(async()=>{for(let i=0;i<20;i++)window.mockAccount.emit();await new Promise(resolve=>setTimeout(resolve,50));});
    assert.equal(requests.length,beforeRenewal,'Same-session auth events must not reload dashboard data');
    assert.equal(await page.locator('#partner-voucher-note').inputValue(),'New beauty campaign');
    assert.equal(await page.locator('#partner-voucher-credits').inputValue(),'200');
    assert.equal(await tab('Invitaciones').getAttribute('aria-selected'),'true');checks+=4;
    await capture(page,'invite-'+width+'.png');checks++;
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
    assert.match(await page.evaluate(()=>navigator.clipboard.readText()),new RegExp('200 créditos de parte de '+studioName));checks++;
    await page.locator('#partner-invitation-history').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#partner-redemption-rows').isVisible(),true);checks++;
    assert.match(await page.locator('#partner-redemption-rows').textContent(),/friend@example.test/);checks++;
    await capture(page,'dashboard-'+width+'.png');
    await page.locator('#partner-voucher-rows tr').filter({hasText:'New beauty campaign'}).getByRole('button',{name:'Desactivar'}).click();
    await page.waitForFunction(()=>document.querySelector('#partner-voucher-status').textContent.includes('desactivada'));
    assert.equal(await page.locator('#partner-voucher-result').getAttribute('hidden'),'');checks++;
    assert.equal(await page.locator('#partner-budget-available').textContent(),'800');checks++;
    if(width===1440){
      manyCustomers=true;await page.reload();await page.waitForFunction(()=>!document.querySelector('#partner-voucher-workspace').hidden);await tab('Clientes').click();
      assert.equal(await page.locator('#partner-rows>.partner-customer-row').count(),20);assert.equal(await page.locator('#partner-page').textContent(),'1');checks+=2;
      for(let i=0;i<4;i++)await page.locator('#partner-more').click();
      assert.equal(await page.locator('#partner-page').textContent(),'5');assert.match(await page.locator('#partner-rows').textContent(),/client80@example.test/);checks+=2;
      await page.locator('#partner-more').click();await page.waitForFunction(()=>document.querySelector('#partner-page').textContent==='6');
      assert.equal(await page.locator('#partner-rows>.partner-customer-row').count(),5);assert.match(await page.locator('#partner-rows').textContent(),/client100@example.test/);assert.equal(await page.locator('#partner-more').isDisabled(),true);checks+=3;
      await page.locator('#partner-prev').click();assert.equal(await page.locator('#partner-page').textContent(),'5');assert.equal(await page.locator('#partner-rows>.partner-customer-row').count(),20);checks+=2;
      const filtering=page.waitForRequest(req=>new URL(req.url()).searchParams.get('q')==='client104');await page.locator('#partner-search').fill('client104');await filtering;
      await page.waitForFunction(()=>document.querySelector('#partner-customer-status').textContent==='');assert.equal(await page.locator('#partner-rows>.partner-customer-row').count(),1);assert.equal(await page.locator('#partner-page').textContent(),'1');assert.equal(await page.locator('#partner-prev').isDisabled(),true);checks+=3;
      const failed=page.waitForRequest(req=>new URL(req.url()).searchParams.get('q')==='failure');await page.locator('#partner-search').fill('failure');await failed;await page.waitForFunction(()=>document.querySelector('#partner-customer-status').textContent.includes('Search unavailable'));
      assert.equal(await page.locator('#partner-rows>.partner-customer-row').count(),0);assert.equal(await page.locator('#partner-prev').isDisabled(),true);assert.equal(await page.locator('#partner-more').isDisabled(),true);checks+=3;
      manyCustomers=false;
    }
    await page.evaluate(()=>window.mockAccount.signOut());
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks++;
    assert.equal(await page.evaluate(()=>{const title=document.querySelector('#partner-title').getBoundingClientRect(),signin=document.querySelector('#partner-signin').getBoundingClientRect();return title.bottom<=signin.top||signin.bottom<=title.top||title.right<=signin.left||signin.right<=title.left;}),true);checks++;
    assert.equal(await page.locator('#partner-content').isVisible(),false);checks++;
    assert.equal(await page.locator('#partner-rows').textContent(),'');checks++;
    assert.equal(await page.locator('#partner-url').inputValue(),'');checks++;
    assert.equal(await page.locator('#partner-voucher-url').inputValue(),'');checks++;
    assert.equal(await page.locator('#partner-redemption-rows').textContent(),'');checks++;
    assert.equal(await page.locator('dialog').count(),0);checks++;
    assert.equal(await page.locator('#partner-commission-rows').textContent(),'');checks++;
    for(const id of ['partner-latest-signups','partner-recent-purchases','partner-overview-budget']){assert.equal(await page.locator('#'+id).textContent(),'');checks++;}
    allowed=false;
    await page.reload();await page.waitForFunction(()=>document.querySelector('#partner-status').textContent.includes('no tiene acceso'));
    assert.equal(await page.locator('#partner-content').isVisible(),false);checks++;
    assert.equal(await page.locator('[data-account-partner]').isVisible(),false);checks++;
    await page.goto(origin+'/lab/'+workspaceSlug+'.html?view=owner');
    await page.waitForFunction(()=>document.querySelector('#partner-status').textContent.includes('no tiene acceso'));
    assert.equal(requests.includes(adminPath),false);checks++;
    ownerView=true;allowed=true;await page.reload();
    await page.locator('#partner-content:not([hidden])').waitFor();
    await tab('Invitaciones').click();
    assert.equal(await page.locator('#partner-budget-form').isVisible(),false);checks++;await page.locator('#partner-budget-toggle').click();
    await page.locator('#partner-budget-form:not([hidden])').waitFor();
    await page.locator('#partner-budget-total').fill('2000');await page.locator('#partner-budget-form button').click();
    await page.waitForFunction(()=>document.querySelector('#partner-voucher-status').textContent.includes('Presupuesto guardado'));
    assert.equal(await page.locator('#partner-budget-available').textContent(),(1800).toLocaleString('es'));checks++;
    await capture(page,'owner-invitations-'+width+'.png');
    assert.equal(requests.includes(adminPath),true);checks++;
    assert.equal(await page.locator('#partner-purchases').textContent(),'2');checks++;
    assert.equal(await page.locator('[data-account-admin]').getAttribute('hidden'),null);checks++;
    awaitingPartner=true;await page.reload();
    await page.waitForFunction(name=>document.querySelector('#partner-status').textContent.includes('La cuenta de '+name+' debe iniciar sesión'),studioName);
    assert.equal(await page.locator('#partner-content').isVisible(),false);checks++;
    assert.equal(await page.locator('#partner-url').inputValue(),'');checks++;
    ownerView=false;awaitingPartner=false;
    total=0;emptyWorkspace=true;await page.reload();await page.waitForFunction(()=>!document.querySelector('#partner-voucher-workspace').hidden);
    await tab('Invitaciones').click();
    assert.equal(await page.locator('#partner-budget-empty').isVisible(),true);checks++;
    assert.equal(await page.locator('#partner-voucher-create').isDisabled(),true);checks++;
    if(width===320||width===1440)await capture(page,'zero-budget-'+width+'.png');
    await tab('Resumen').click();assert.equal(await page.locator('#partner-start').isVisible(),true);assert.equal(await page.locator('#partner-recent-activity').isVisible(),false);assert.match(await page.locator('#partner-overview-budget').textContent(),/pendiente de asignación/);checks+=3;await capture(page,'empty-overview-'+width+'.png');
    total=2000;emptyWorkspace=false;
    if(width===1440){businessUnavailable=true;await page.reload();await page.waitForFunction(()=>!document.querySelector('#partner-voucher-workspace').hidden);assert.equal(await page.locator('#partner-commission').textContent(),'No disponible');checks++;businessUnavailable=false;}
    for(const role of [false,true]){
      ownerView=role;allowed=true;hold=true;
      const path=role?adminPath:'/api/customer/partner';
      const pending=page.waitForRequest(req=>new URL(req.url()).pathname===path);
      await page.reload();await pending;
      await page.evaluate(()=>window.mockAccount.signOut());release();
      await page.waitForTimeout(100);
      assert.equal(await page.locator('#partner-content').isVisible(),false);checks++;
      assert.equal(await page.locator('#partner-rows').textContent(),'');checks++;
    }
    hold=false;
    for(const role of [false,true]){
      ownerView=role;allowed=true;await page.reload();await page.waitForFunction(()=>!document.querySelector('#partner-voucher-workspace').hidden);
      await tab('Invitaciones').click();
      await page.locator('#partner-voucher-note').fill('Delayed invitation');holdGift=true;
      const pending=page.waitForRequest(req=>req.method()==='POST'&&new URL(req.url()).pathname.endsWith('/vouchers'));
      await page.locator('#partner-voucher-create').click();await pending;
      await page.evaluate(()=>window.mockAccount.signOut());releaseGift();await page.waitForTimeout(100);holdGift=false;
      assert.equal(await page.locator('#partner-voucher-result').isVisible(),false);checks++;
      assert.equal(await page.locator('#partner-voucher-url').inputValue(),'');checks++;
      assert.equal(await page.locator('#partner-voucher-rows').textContent(),'');checks++;
    }
    if(width===1440){
      manyGifts=true;ownerView=false;allowed=true;await page.reload();await page.waitForFunction(()=>!document.querySelector('#partner-voucher-workspace').hidden);await tab('Invitaciones').click();
      assert.equal(await page.locator('#partner-voucher-rows tr').count(),20);await page.locator('#partner-voucher-next').click();assert.match(await page.locator('#partner-voucher-page').textContent(),/21–40 de 43/);await page.locator('#partner-voucher-next').click();assert.equal(await page.locator('#partner-voucher-rows tr').count(),3);assert.equal(await page.locator('#partner-voucher-next').isDisabled(),true);checks+=4;
      await page.locator('#partner-voucher-prev').click();assert.equal(await page.locator('#partner-voucher-rows tr').count(),20);checks++;
      assert.equal(await page.locator('#partner-redemption-rows tr').count(),20);await page.locator('#partner-redemption-next').click();assert.equal(await page.locator('#partner-redemption-rows tr').count(),3);assert.match(await page.locator('#partner-redemption-page').textContent(),/21–23 de 23/);checks+=3;
      manyGifts=false;
    }
    hold=false;ownerView=true;allowed=true;
    await page.goto(origin+'/lab/owner.html');
    await page.locator('#owner-dashboard:not([hidden])').waitFor();
    assert.equal(await page.locator('[data-owner-'+alias+']').evaluateAll(links=>links.length===2&&links.every(link=>!link.hidden)),true);checks++;
    const privateLink=page.locator(width<=900?'.owner-jumpbar [data-owner-'+alias+']':'.owner-sidebar [data-owner-'+alias+']');
    assert.equal(await privateLink.isVisible(),true);checks++;
    await capture(page,'owner-navigation-'+width+'.png');
    await privateLink.click();await page.locator('#partner-content:not([hidden])').waitFor();
    assert.equal(await page.locator('#partner-purchases').textContent(),'2');checks++;
    ownerView=false;allowed=false;await page.goto(origin+'/lab/owner.html');
    await page.waitForFunction(()=>document.querySelector('#owner-status').textContent.includes('reserved'));
    assert.equal(await page.locator('[data-owner-'+alias+']').evaluateAll(links=>links.every(link=>link.hidden)),true);checks++;
    ownerView=true;allowed=true;await page.goto(origin+'/lab/owner.html');
    await page.locator('#owner-dashboard:not([hidden])').waitFor();
    await page.evaluate(()=>window.mockAccount.signOut());
    assert.equal(await page.locator('[data-owner-'+alias+']').evaluateAll(links=>links.every(link=>link.hidden)),true);checks++;
    const expectedWrites=new Set(['/api/customer/partner/vouchers','/api/customer/partner/vouchers/deactivate',adminPath+'/budget',adminPath+'/vouchers']);
    assert.deepEqual(errors,[]);assert.equal(writes.every(path=>expectedWrites.has(path)),true,JSON.stringify(writes));checks+=2;
    await context.close();
  }
  console.log(checks+' dashboard browser assertions passed');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
