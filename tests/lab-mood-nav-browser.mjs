// PV Lab Mood Creator masthead verification. Browser and page are local;
// no account, credits or AI provider calls are required.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const studio=readFileSync('lab/studio.html','utf8');
const start=studio.indexOf('<header id="studio-header"');
const end=studio.indexOf('</header>',start);
assert.ok(start>0&&end>start,'Real PV Lab header is present');
const header=studio.slice(start,end+'</header>'.length);
const html='<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  +'<base href="/lab/">'
  +[...studio.matchAll(/<link rel="stylesheet"[^>]+>/g)].map(match=>match[0]).join('')
  +'</head><body>'+header+'<main id="main" class="wrap"><div id="app" aria-label="Test studio"></div><section id="gate" class="pv-guest-image" hidden></section></main></body></html>';
const mime={'.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const root=resolve('.');
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(['/landing-header','/moods-header'].includes(pathname)){
    const source=readFileSync(pathname==='/landing-header'?'lab/index.html':'lab/moods.html','utf8');
    const styles=[...source.matchAll(/<link rel="stylesheet"[^>]+>/g)].map(match=>match[0]).join('');
    const bodyTag=source.match(/<body\b[^>]*>/)[0];
    if(pathname==='/moods-header')assert.match(bodyTag,/mc-explore-page/,'Explore fixture retains its approved page-scoped styles');
    const masthead=source.match(/<header class="landing-header[\s\S]*?<\/header>/)[0];
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/lab/">'+styles+'</head>'+bodyTag+masthead+'</body></html>');return;
  }
  if(pathname==='/test'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);return;
  }
  const target=resolve(root,'.'+pathname);
  if(!target.startsWith(root+sep)||!existsSync(target)){
    res.writeHead(404).end();return;
  }
  res.writeHead(200,{'Content-Type':mime[extname(target)]||'application/octet-stream'});
  res.end(readFileSync(target));
});
await new Promise(done=>server.listen(4193,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PV_CHROMIUM_EXECUTABLE||chromium.executablePath()});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
  await page.goto('http://127.0.0.1:4193/test',{waitUntil:'domcontentloaded'});
  // In the real studio, Queue and the account control appear after session setup.
  await page.evaluate(()=>{document.getElementById('active').hidden=false;document.getElementById('studio-account-menu').hidden=false;});
  assert.equal(await page.locator('#studio-header .brand').innerText(),'PV LAB');
  await page.locator('#studio-header .lab-wordmark').evaluate(img=>img.decode());
  assert.equal(await page.locator('#studio-header .lab-wordmark').getAttribute('src'),
    './branding/pvlab-wordmark-bold.svg?v=20261022-bold1','Studio reuses the approved homepage logo');
  await page.evaluate(()=>document.fonts.ready);
  assert.deepEqual(await page.locator('#studio-header .tool-group>button').allTextContents(),
    ['Image','Video','Effects','Upscaler','Retouch','Fashion'],
    'Six text tools include Effects; Assets stays a separate icon');
  const moodLinks=page.locator('#studio-header .tool-group>a.tool-link');
  assert.deepEqual(await moodLinks.allTextContents(),['Explore Moods']);
  assert.equal(await page.locator('#tool-explore-moods').getAttribute('href'),'./moods');
  assert.equal(await page.locator('#tool-mood-creator').count(),0);
  assert.equal(await page.locator('#studio-header .studio-mood-link').count(),0,
    'Old navigation link is removed');
  const icon=page.locator('#studio-header .actions>.studio-assets-icon');
  assert.equal(await icon.count(),1,'One Assets icon appears in the right masthead');
  assert.equal(await icon.getAttribute('id'),'tool-assets');
  assert.equal(await icon.getAttribute('aria-label'),'Open Assets');
  assert.equal(await icon.locator('svg[aria-hidden="true"]').count(),1);
  await page.setViewportSize({width:1440,height:900});
  await icon.hover();await page.waitForTimeout(230);
  const tooltip=await icon.evaluate(el=>({
    text:getComputedStyle(el,'::after').content,
    opacity:Number(getComputedStyle(el,'::after').opacity)
  }));
  assert.ok(tooltip.text.includes('Assets')&&tooltip.opacity>.9,
    'Icon explains itself with a small hover label '+JSON.stringify(tooltip));
  mkdirSync('test-results',{recursive:true});
  await page.screenshot({path:'test-results/pv-mood-icon-desktop.png'});
  const studioGeometry=new Map();
  const sizes=[1920,1440,1270,1100,901,900,899,768,560,390,360,320];
  for(const width of sizes){
    await page.setViewportSize({width,height:900});
    const size=await page.evaluate(()=>{
      const rect=selector=>{
        const el=document.querySelector(selector),r=el.getBoundingClientRect();
        return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
      };
      const icon=document.querySelector('.studio-assets-icon');
      const style=getComputedStyle(icon);
      return {viewport:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,
        header:rect('#studio-header'),brand:rect('#studio-header .brand'),wordmark:rect('#studio-header .lab-wordmark'),
         firstNav:rect('#tool-image'),firstNavWeight:getComputedStyle(document.getElementById('tool-image')).fontWeight,
        nav:rect('#studio-header .tool-switch'),fashion:rect('#tool-fashion'),
        actions:rect('#studio-header .actions'),
        icon:rect('.studio-assets-icon'),exploreMoods:rect('#tool-explore-moods'),queue:rect('#active>summary'),
        account:rect('#studio-header .pv-account-menu>summary'),
        border:style.borderTopWidth,display:style.display,
        iconText:icon.innerText};
    });
    studioGeometry.set(width,size);
    assert.ok(size.overflow<=3,'No horizontal document overflow '+width+' '+JSON.stringify(size));
    assert.ok(size.wordmark.width>40&&size.wordmark.height>15,
      'The approved logo remains visible on desktop and mobile '+width+' '+JSON.stringify(size));
    assert.ok(size.icon.width>=32&&size.icon.height>=32&&size.border!=='0px',
      'The Assets icon stays a comfortable hit target '+width+' '+JSON.stringify(size));
    assert.ok(size.display==='inline-grid'||size.display==='grid','Icon is visible in signed-in studio at '+width);
    assert.ok(size.icon.right<=size.queue.x+1&&size.queue.right<=size.account.x+1,
      'Assets stays before Queue and Account '+width+' '+JSON.stringify(size));
    assert.ok(size.actions.right<=width+2,'Account controls stay on screen at '+width);
    if(width>900){
      assert.ok(size.nav.right<=size.actions.x+2,
        'Navigation is contained before Queue/Account at '+width+' '+JSON.stringify(size));
      if(width>1250)assert.ok(size.exploreMoods.right<=size.icon.x+1,
        'Desktop Explore Moods link ends before Assets at '+width);
      assert.ok(Math.abs(size.header.height-82)<=2,'Desktop header matches the public 82px masthead');
    }else{
      assert.ok(size.brand.right<=size.actions.x+2,
        'Brand does not overlap Mood/Queue/Account at '+width+' '+JSON.stringify(size));
      assert.ok(Math.abs(size.header.height-(width<=560?102:109))<=2,
        'Mobile header matches the public masthead at '+width);
    }
    // A customer sees a credit balance as well as Queue and Account.
    await page.evaluate(()=>{const wallet=document.getElementById('lab-wallet-toggle');wallet.hidden=false;wallet.textContent='120,000 credits';});
    const customer=await page.evaluate(()=>{
      const brand=document.querySelector('#studio-header .brand').getBoundingClientRect();
      const actions=document.querySelector('#studio-header .actions').getBoundingClientRect();
      return {brandRight:brand.right,actionsLeft:actions.left,actionsRight:actions.right,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    assert.ok(customer.overflow<=1&&customer.actionsRight<=width+1&&customer.brandRight<=customer.actionsLeft,
      'Customer wallet and account remain accessible at '+width+' '+JSON.stringify(customer));
    await page.evaluate(()=>document.getElementById('lab-wallet-toggle').hidden=true);
    if(width===390){
      await page.mouse.move(3,600);
      await page.screenshot({path:'test-results/pv-mood-icon-mobile.png'});
    }
    if(width===320){
      await page.mouse.move(3,600);
      await page.screenshot({path:'test-results/pv-mood-icon-320.png'});
    }
  }
  // The same original masthead is available before account setup. Only private
  // Assets/Queue controls remain gated; no second navigation is introduced.
  await page.evaluate(()=>{
    document.getElementById('app').hidden=true;document.getElementById('gate').hidden=false;
    document.getElementById('active').hidden=true;document.getElementById('studio-account-menu').hidden=true;
    document.getElementById('signin').hidden=false;
  });
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});
    await page.locator('#studio-header').evaluate((el,small)=>el.classList.toggle('pv-mobile-entry-condensed',small),width<=680);
    for(const id of ['tool-image','tool-video','tool-upscale','tool-retouch','tool-fashion','tool-explore-moods'])
      assert.equal(await page.locator('#'+id).isVisible(),true,'Signed-out users retain the original '+id+' at '+width);
    assert.equal(await page.locator('.studio-assets-icon').isVisible(),false,'Private Assets remains gated');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=3,'Signed-out navigation fits at '+width);
  }
  for(const route of ['landing','moods']){
    await page.goto('http://127.0.0.1:4193/'+route+'-header');
    assert.deepEqual(await page.locator('.landing-header nav a').allTextContents(),route==='landing'
      ?['Image','Video','Upscaler','Retouch','Fashion','Explore Moods','Pricing']:['Image','Video','Upscaler','Retouch','Fashion','Explore Moods']);
    if(route==='landing'){
      const paths=await page.locator('.landing-header nav a').evaluateAll(els=>els.map(el=>new URL(el.href).pathname+new URL(el.href).search));
      assert.ok(paths[3].endsWith('/studio.html?tool=retouch'),'Retouch goes to the existing Studio tool');
      assert.ok(paths[4].endsWith('/studio.html?tool=fashion'),'Fashion goes to the existing Studio tool');
      const pricing=page.locator('.landing-header nav a.lab-nav-pricing');
      assert.equal(await pricing.count(),1,'Pricing has its own quiet utility treatment');
      assert.equal(await pricing.getAttribute('href'),'#pricing','Pricing still scrolls to plans');
      const divider=await pricing.evaluate(el=>({
        content:getComputedStyle(el,'::before').content,
        width:getComputedStyle(el,'::before').width
      }));
      assert.notEqual(divider.content,'none','Pricing divider is present');
      assert.equal(divider.width,'1px','Pricing divider is a fine hairline');
    }
    if(route==='moods'){
      assert.equal(await page.getByRole('link',{name:'My Moods',exact:true}).getAttribute('href'),'./mood-creator.html#my-moods');
      assert.equal(await page.locator('.pv-moods-create').getAttribute('href'),'./mood-creator.html');
    }
    for(const width of sizes){
      await page.setViewportSize({width,height:900});
      const geometry=await page.evaluate(()=>{
        const header=document.querySelector('.landing-header').getBoundingClientRect();
        const brand=document.querySelector('.lab-brand').getBoundingClientRect();
        const firstLink=document.querySelector('.landing-header nav a');
        return {height:header.height,brandX:brand.x,overflow:document.documentElement.scrollWidth-innerWidth,
          firstNavX:firstLink.getBoundingClientRect().x,firstNavWeight:getComputedStyle(firstLink).fontWeight};
      });
      const studio=studioGeometry.get(width);
      assert.ok(geometry.overflow<=1,route+' stays inside viewport at '+width);
      assert.ok(Math.abs(geometry.height-studio.header.height)<=1&&Math.abs(geometry.brandX-studio.brand.x)<=1,
        route+' shares Studio header height and logo alignment at '+width+' '+JSON.stringify(geometry));
      if(route==='landing'){
        const spacing=await page.evaluate(()=>{
          const nav=document.querySelector('.landing-header nav');
          const links=nav.querySelectorAll('a');
          const before=links[links.length-2].getBoundingClientRect();
          const pricing=links[links.length-1].getBoundingClientRect();
          return {gap:parseFloat(getComputedStyle(nav).gap),actual:pricing.left-before.right};
        });
        assert.ok(Math.abs(spacing.gap-spacing.actual)<2,
          'Pricing marker does not shift the shared navigation at '+width+' '+JSON.stringify(spacing));
      }
      if(route==='landing'&&width>900){
        assert.ok(Math.abs(geometry.firstNavX-studio.firstNav.x)<=6,
          'Home Image tab keeps the same horizontal starting position as Studio at '+width);
        assert.equal(geometry.firstNavWeight,studio.firstNavWeight,
          'Home creative menu typography matches Studio on desktop');
      }
      if(width===1440||width===390)await page.screenshot({path:'test-results/pv-mood-icon-'+route+'-'+width+'.png'});
    }
  }
  assert.deepEqual(errors,[],'No browser script errors');
  console.log('PASS Studio tools, Assets, Queue, customer credits and shared masthead at twelve breakpoints');
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
