// Visual and behavioral regression for the homepage-derived Studio pricing
// modal. Uses a local static server and synthetic checkout callback; no live
// Clerk, Stripe or API requests and no customer wallet mutations.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {join,extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PV_PLAYWRIGHT_MODULE||'playwright');
const root=resolve(fileURLToPath(new URL('../lab/',import.meta.url)));
const sample=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="./pricing-overlay.css">
<style>html,body{margin:0;background:#111;color:#eee;font-family:Arial,sans-serif}main{padding:55px 20px}input{width:200px;padding:10px}button{cursor:pointer}</style></head>
<body><main><button id="upgrade">Upgrade</button><button id="open-onetime">Get credits</button><a id="pricing-link" href="/lab/#pricing">Pricing</a><p>Studio stays underneath.</p><input id="prompt" value="A highly specific editorial prompt"></main>
<dialog id="lab-pricing-overlay" aria-label="Choose a PV LAB plan">
<button type="button" id="lab-pricing-overlay-close" aria-label="Close pricing and return to Studio">×</button>
<div id="lab-pricing-overlay-body"><p class="lab-pricing-overlay-loading">Loading plans…</p></div>
<p id="lab-pricing-overlay-status" role="status" aria-live="polite" hidden></p>
</dialog>
<script type="module">
import {createPricingOverlay} from './pricing-overlay.js';
window.__purchases=[];window.__signed=true;window.__customer=true;window.__signins=0;
window.__modal=createPricingOverlay({
  buy:async(sku,report)=>{window.__purchases.push(sku);report('Checkout authorized');return true;},
  getAccount:()=>({signedIn:window.__signed,customer:window.__customer}),
  onSignIn:()=>{window.__signins++;}
});
document.querySelector('#upgrade').onclick=()=>window.__modal.open();
document.querySelector('#open-onetime').onclick=()=>window.__modal.open({oneTime:true});
window.__ready=true;
</script></body></html>`;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/test-overlay.html'){res.writeHead(200,{'content-type':mime['.html']});res.end(sample);return;}
  const local=pathname==='/'?'/index.html':pathname.startsWith('/lab/')?pathname.slice(4):pathname;
  const filename=resolve(root,'.'+local);
  if(!filename.startsWith(root+sep)||!existsSync(filename)||!statSync(filename).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':mime[extname(filename)]||'application/octet-stream'});
  res.end(readFileSync(filename));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=server.address();
const browser=await chromium.launch({headless:true});
try{
  for(const width of [320,390,1440,1648]){
    const page=await browser.newPage({viewport:{width,height:width>600?900:844},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+address.port+'/test-overlay.html',{waitUntil:'load'});
    await page.waitForFunction(()=>window.__ready===true);
    const url=page.url();
    await page.click('#upgrade');
    await page.locator('#lab-pricing-overlay[open] #lab-plans-title').waitFor();
    assert.equal(await page.locator('#lab-pricing-overlay #pricing button[data-lab-buy]').count(),6,'Live homepage SKUs are shown without duplicate markup');
    assert.equal(await page.locator('#lab-pricing-overlay .lab-overlay-brand').textContent(),'PV LAB','Compact Studio-only brand is present');
    assert.equal((await page.locator('#lab-pricing-overlay #lab-plans-title').innerText()).replace(/\s+/g,' ').trim(),'More room to create.','Approved headline is shown in the Studio only');
    assert.equal(await page.locator('#lab-pricing-overlay .lab-pricing-deck').isVisible(),false,'Homepage image fan is not duplicated into the Studio modal');
    assert.equal(await page.locator('#lab-pricing-overlay #lab-monthly-plans .lab-overlay-plan-note').count(),3,'Each monthly card has its short capability note');
    assert.equal(await page.locator('#lab-pricing-overlay #lab-monthly-plans .lab-overlay-icon').count(),12,'All usage and capability icons appear');
    assert.equal(await page.locator('#lab-pricing-overlay .lab-overlay-footer').count(),1,'Benefits and billing use one bottom row');
    assert.equal(await page.locator('#lab-pricing-overlay .lab-overlay-card-fineprint').count(),0,'No duplicate billing notes');
    const background=await page.locator('#lab-pricing-overlay').evaluate(el=>getComputedStyle(el,'::before').backgroundImage);
    assert.equal(background.includes('url('),false,'Modal does not use a portrait photo');
    if(width>=1440){
      const g=await page.locator('#lab-pricing-overlay').evaluate(el=>{
        const r=el.getBoundingClientRect();
        const p=[...el.querySelectorAll('#lab-monthly-plans .lab-plan')].map(x=>x.getBoundingClientRect());
        const d=el.querySelector('#lab-monthly-plans .lab-plan-description').getBoundingClientRect();
        const c=el.querySelector('#lab-monthly-plans .lab-plan-credits').getBoundingClientRect();
        return {width:r.width,height:r.height,viewport:innerWidth,plans:p.map(n=>({x:n.x,y:n.y,height:n.height})),descriptionY:d.y,creditsY:c.y};
      });
      assert.ok(g.width>g.viewport*.72,'Wide reference modal, not the narrow old one: '+JSON.stringify(g));
      assert.ok(g.height>=680,'Reference modal retains generous vertical rhythm: '+JSON.stringify(g));
      assert.ok(g.plans.every(x=>x.height>=400),'Three taller plan cards: '+JSON.stringify(g));
      assert.ok(g.descriptionY<g.creditsY,'Description is above credit details');
      console.log('REFERENCE MODAL',width,JSON.stringify(g));
    }

    if(width===1440){
      const positions=await page.locator('#lab-pricing-overlay #lab-monthly-plans .lab-plan').evaluateAll(nodes=>nodes.map(node=>({x:node.getBoundingClientRect().x,y:node.getBoundingClientRect().y,width:node.getBoundingClientRect().width})));
      assert.ok(positions[0].x<positions[1].x&&positions[1].x<positions[2].x,'Desktop modal uses three pricing columns');
      assert.ok(Math.abs(positions[0].y-positions[1].y)<3&&Math.abs(positions[1].y-positions[2].y)<3,'All three cards align along the same row');
    }

    assert.equal(await page.locator('#lab-pricing-overlay #pricing button[data-lab-buy][disabled]').count(),0,'Paid actions are available');
    assert.equal(await page.locator('#lab-pricing-overlay #lab-tab-monthly').getAttribute('aria-selected'),'true');
    await page.click('#lab-pricing-overlay #lab-tab-onetime');
    assert.equal(await page.locator('#lab-pricing-overlay #lab-tab-onetime').getAttribute('aria-selected'),'true','One-time tab uses original homepage presentation handler');
    assert.equal(await page.locator('#lab-pricing-overlay #lab-one-time-credits').isVisible(),true);
    await page.locator('#lab-pricing-overlay button[data-lab-buy="topup10"]').click();
    assert.deepEqual(await page.evaluate(()=>window.__purchases),['topup10'],'Same credit SKU passes to authenticated wallet');
    assert.match(await page.locator('#lab-pricing-overlay-status').innerText(),/Checkout authorized/);
    assert.equal(page.url(),url,'A purchase quote does not navigate to the homepage');
    const close=await page.locator('#lab-pricing-overlay-close').boundingBox();
    assert.ok(close&&close.x>=0&&close.x+close.width<=width,'Close button fits the viewport');
    const dialog=await page.locator('#lab-pricing-overlay').boundingBox();
    assert.ok(dialog&&dialog.x>=0&&dialog.x+dialog.width<=width+1,'Dialog is on-screen');
    if(width<=390){
      const safety=await page.locator('#lab-pricing-overlay').evaluate(dialog=>{
        const bounds=dialog.getBoundingClientRect();
        const elements=[...dialog.querySelectorAll('#pricing .lab-pricing-comparison, #pricing .lab-plan, #pricing .lab-plan>button[data-lab-buy]')];
        const clipped=elements.filter(el=>{
          const r=el.getBoundingClientRect();
          return r.left<bounds.left-2||r.right>bounds.right+2;
        }).map(el=>({selector:String(el.className||el.tagName),bounds:el.getBoundingClientRect().toJSON()})).slice(0,5);
        return {ok:clipped.length===0,dialog:bounds.toJSON(),clipped};
      });
      assert.equal(safety.ok,true,'Pricing checkout cards stay inside the viewport: '+JSON.stringify(safety));
    }
    await page.click('#lab-pricing-overlay-close');
    assert.equal(await page.locator('#lab-pricing-overlay').evaluate(el=>el.open),false);
    assert.equal(await page.locator('#prompt').inputValue(),'A highly specific editorial prompt','Draft survives modal close');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'upgrade','Focus returns to Upgrade');
    await page.click('#open-onetime');
    await page.locator('#lab-pricing-overlay[open] #lab-tab-onetime[aria-selected="true"]').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#lab-pricing-overlay').evaluate(el=>el.open),false,'Escape closes modal');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'open-onetime');
    await page.click('#pricing-link');
    await page.locator('#lab-pricing-overlay[open]').waitFor();
    assert.equal(page.url(),url,'Legacy homepage Pricing link opens in-place');
    await page.click('#lab-pricing-overlay-close');
    assert.deepEqual(errors,[],'No JS errors during Studio pricing flow');
    await page.close();
  }
  console.log('PASS overlay open/close, monthly and one-time, checkout SKU, focus, draft preservation, desktop and mobile');
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+address.port+'/test-overlay.html');
  await page.waitForFunction(()=>window.__ready===true);
  await page.evaluate(()=>{window.__signed=false;});
  await page.click('#upgrade');await page.locator('#lab-pricing-overlay #lab-plans-title').waitFor();
  await page.locator('#lab-pricing-overlay button[data-lab-buy="starter"]').click();
  assert.equal(await page.evaluate(()=>window.__signins),1,'Guest sign-in is requested only on purchase');
  assert.equal(await page.locator('#lab-pricing-overlay').evaluate(el=>el.open),false);
  assert.deepEqual(await page.evaluate(()=>window.__purchases),[],'No checkout without sign-in');
  await page.close();
}finally{
  await browser.close();await new Promise(resolve=>server.close(resolve));
}
