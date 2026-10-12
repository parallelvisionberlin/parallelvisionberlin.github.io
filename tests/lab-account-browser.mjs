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
const clerkMock=`export class Clerk {
  constructor(){window.mockClerk=this;this.listeners=[];this.isSignedIn=true;this.user={id:'user_Test',fullName:'Alex Test',hasImage:false,primaryEmailAddress:{emailAddress:'alex@example.test'}};this.session={id:'sess_Test',getToken:async()=> 'synthetic-token'};}
  async load(){} addListener(fn){this.listeners.push(fn);} async signOut(){this.isSignedIn=false;this.user=null;this.session=null;this.listeners.forEach(fn=>fn());}
  openSignIn(){window.signInOpened=true;} openUserProfile(){window.profileOpened=true;}
}`;
async function setup(width,customer=true){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}),page=await context.newPage();
  const errors=[],writes=[];let heldWallet=null,releaseWallet=null;
  page.on('pageerror',e=>errors.push(e.message));
  const session={customer,ownerId:'user_Test',balanceCredits:1234,billingReady:true,generationReady:true,products,subscription:{plan_id:null,status:'none'},config:{enabled:true,configured:true,concurrency:{image:4,video:1},videoEngines:['wan']}};
  await page.route('https://**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.hostname==='esm.sh'&&url.pathname.includes('clerk-js'))return route.fulfill({contentType:'text/javascript',body:clerkMock});
    if(url.hostname==='clerk.parallelvisionlabel.com')return route.fulfill({contentType:'text/javascript',body:''});
    if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev')return route.abort();
    if(request.method()!=='GET')writes.push({path:url.pathname,body:request.postData()});
    const send=data=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
    if(url.pathname==='/api/session')return send(session);
    if(url.pathname==='/api/customer/wallet'){
      if(heldWallet)await heldWallet;
      return send({...session,activity:[{delta_credits:-42,kind:'generation',created_at:1720000000000},{delta_credits:1000,kind:'purchase',created_at:1719000000000}]});
    }
    if(url.pathname==='/api/customer/account')return send({storage:{bytes:1024**3,limitBytes:20*1024**3,files:15}});
    if(url.pathname==='/api/billing/portal')return send({url:'https://evil.example/stripe.com'});
    if(url.pathname==='/api/billing/checkout')return send({url:'javascript:alert(1)'});
    if(url.pathname==='/api/customer/referrals')return send({rewardsAvailable:false});
    return send({jobs:[],activeJobs:[],next:null,packs:[],characters:[],moods:[],boards:[],folders:[],models:[],configured:false});
  });
  return {context,page,errors,writes,holdWallet(){heldWallet=new Promise(r=>releaseWallet=r);},releaseWallet(){heldWallet=null;releaseWallet?.();}};
}
async function fits(page,label){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,label+' horizontal overflow');}
try{
  for(const width of [1440,390,320]){
    const rig=await setup(width),{page,errors,writes}=rig;
    try{
      await page.goto(origin+'/lab/account.html');await page.waitForFunction(()=>document.querySelector('#account-balance').textContent==='1,234');
      await fits(page,'account '+width);assert.equal(await page.locator('#account-products button').count(),3);
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
      await page.click('#settings-close-account');assert.equal(await page.locator('#account-close-submit').isDisabled(),true);await page.fill('#account-close-confirm','DELETE');assert.equal(await page.locator('#account-close-submit').isDisabled(),true);await page.keyboard.press('Escape');
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
          await summary.click();await page.locator('[data-account-name]').getByText('Alex Test',{exact:true}).waitFor();
          assert.match(await page.locator('[data-account-balance]').textContent(),customer?/1,234 credits/:/Owner workspace/);
          const avatar=await page.locator('[data-account-avatar]').boundingBox();assert.equal(Math.round(avatar.width),32);assert.equal(Math.round(avatar.height),32);
          const panel=await page.locator('.pv-account-panel').boundingBox();assert.ok(panel.x>=0&&panel.x+panel.width<=width+1,'menu fits viewport');
          assert.equal(await page.locator('[data-account-referrals]').isVisible(),customer);
          await page.screenshot({path:artifacts+'/'+path.split('/').at(-1).replace('.html','')+'-'+width+'-'+(customer?'customer':'owner')+'.png'});
          await page.keyboard.press('Escape');assert.equal(await page.locator('.pv-account-menu').evaluate(el=>el.open),false);assert.equal(await summary.evaluate(el=>el===document.activeElement),true);
          await fits(page,path+' '+width);assert.deepEqual(errors,[]);
        }finally{await rig.context.close();}
      }
    }
    console.log('PASS account, shared menus, keyboard, private state and billing guards at '+width+'px');
  }
  const rig=await setup(1440,false);
  try{await rig.page.goto(origin+'/lab/account.html');await rig.page.locator('#owner-billing').waitFor({state:'visible'});assert.equal(await rig.page.locator('[data-credit-view="balance"]').isVisible(),false);assert.equal(await rig.page.locator('#account-referrals-link').isVisible(),false);assert.deepEqual(rig.errors,[]);}finally{await rig.context.close();}
}catch(error){console.error(error);throw error;}finally{await browser.close();await new Promise(r=>server.close(r));}
