import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.AGENCY_TEST_BASE||'http://127.0.0.1:8799';
const api='https://parallel-vision-lab.parallelvision.workers.dev';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
await mkdir('agency-test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  for(const width of [1440,390,320]){
    const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
    await page.route(api+'/**',route=>route.fulfill({status:204,headers:cors,body:''}));
    await page.goto(base+'/agency/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!document.querySelector('#project-brief button[type=submit]').disabled);
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('h1').innerText(),'Fashion\ncampaigns.\nFilms.\nDigital worlds.');
    assert.ok(!/[↗→]/.test(await page.locator('body').innerText()),'Agency must not render Unicode arrow glyphs on mobile/desktop');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'agency overflow at '+width);
    assert.equal(await page.locator('iframe').count(),0,'YouTube must not load before interaction');
    assert.equal(await page.locator('.case-notes').count(),5);
    assert.equal(await page.locator('#motion figure').count(),2);
    assert.equal(await page.locator('#flesh-zero-film').count(),1);
    assert.equal(await page.locator('#featured-film').count(),1);
    assert.match(await page.locator('#work .project-image--reptare img').getAttribute('src'),/reptare-look-02-development-sheet\.webp$/);
    assert.ok(await page.evaluate(()=>{
      const hero=document.querySelector('.hero'),featured=document.querySelector('#featured-film'),work=document.querySelector('#work'),motion=document.querySelector('#motion');
      return hero.compareDocumentPosition(featured)&Node.DOCUMENT_POSITION_FOLLOWING &&
             featured.compareDocumentPosition(work)&Node.DOCUMENT_POSITION_FOLLOWING &&
             work.compareDocumentPosition(motion)&Node.DOCUMENT_POSITION_FOLLOWING;
    }),'Agency section order must be Hero → Flesh Zero → Selected Work → Work in motion');
    assert.match(await page.locator('#flesh-zero-film').getAttribute('poster'),/flesh-zero-film-one-poster\.webp$/);
    assert.ok(await page.locator('#featured-film .motion-poster').isVisible(),'Featured Flesh Zero cover must be visible before playback');
    const featuredBox=await page.locator('#featured-film .featured-film-frame').boundingBox();
    assert.ok(featuredBox && Math.abs((featuredBox.width/featuredBox.height)-2)<0.04,'Featured Flesh Zero frame must preserve the 2:1 film ratio');
    const playBox=await page.locator('#featured-film .featured-film-play').boundingBox();
    assert.ok(playBox && Math.abs((playBox.x+playBox.width/2)-(featuredBox.x+featuredBox.width/2))<3 && Math.abs((playBox.y+playBox.height/2)-(featuredBox.y+featuredBox.height/2))<3,'Featured Flesh Zero play button must be centered');
    assert.equal(await page.locator('#featured-film').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(247, 247, 247)');
    assert.ok(await page.locator('.featured-film-play').isVisible(),'Featured film play control must be visible');
    assert.ok(await page.locator('.featured-film-play').evaluate(el=>{
      const r=el.getBoundingClientRect(),frame=el.closest('.featured-film-frame').getBoundingClientRect();
      return Math.abs((r.left+r.width/2)-(frame.left+frame.width/2))<2 && Math.abs((r.top+r.height/2)-(frame.top+frame.height/2))<2;
    }),'Featured film play control must be centered');
    await page.locator('img').evaluateAll(async images=>{
      const local=images.filter(image=>new URL(image.src,location.href).origin===location.origin);
      local.forEach(image=>image.loading='eager');
      await Promise.all(local.map(image=>image.decode().catch(()=>{})));
    });
    assert.deepEqual(await page.locator('img').evaluateAll(images=>images.filter(image=>new URL(image.src,location.href).origin===location.origin&&!image.naturalWidth).map(image=>image.getAttribute('src'))),[],'agency local artwork failed to load');
    await page.waitForFunction(()=>document.querySelector('#featured-film .motion-poster')?.naturalWidth>0,{timeout:10000});
    await page.waitForFunction(()=>document.querySelector('#work .project-image--reptare img')?.naturalWidth>0,{timeout:10000});
    await page.locator('#work .project-image--reptare img').evaluate(async image=>{
      await Promise.race([image.decode(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Reptare decode timeout')),10000))]);
    });
    await page.screenshot({path:'agency-test-artifacts/agency-'+width+'.png',fullPage:true});
    const sends=[];let fail=true;
    await page.route(api+'/api/public/agency/enquiries',async route=>{
      if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors,body:''});
      const data=route.request().postDataJSON();sends.push(data);
      await route.fulfill({status:fail?503:201,headers:cors,contentType:'application/json',body:JSON.stringify(fail?{error:'Temporary test failure. Your brief is still here.'}:{ok:true,id:data.id})});
    });
    await page.locator('#brief-name').fill('Browser test');await page.locator('#brief-email').fill('browser@example.com');await page.locator('#brief-message').fill('An editorial fashion film with sculptural materials.');
    assert.ok(await page.locator('#brief-email').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16),'no iOS input zoom');
    await page.locator('#project-brief button[type=submit]').click();await page.waitForSelector('#brief-status[data-state=error]');
    assert.equal(await page.locator('#brief-name').inputValue(),'Browser test');
    fail=false;await page.locator('#project-brief button[type=submit]').click();await page.waitForSelector('#brief-status[data-state=success]');
    assert.equal(sends.length,2);assert.equal(sends[0].id,sends[1].id);assert.equal(await page.locator('#brief-name').inputValue(),'');
    assert.ok(!/[↗→]/.test(await page.locator('body').innerText()),'Agency must remain free of Unicode arrow glyphs after form interaction');
    await page.goto(base+'/',{waitUntil:'domcontentloaded'});
    const toggle=page.locator('#homeMobileMenuToggle');if(await toggle.isVisible())await toggle.click();
    assert.equal(await page.locator('#homePrimaryLinks .home-agency-link').getAttribute('href'),'./agency/');
    assert.ok(await page.locator('#homePrimaryLinks .home-agency-link').isVisible(),'agency navigation not visible at '+width);
    if(await toggle.isVisible())await toggle.click();
    await page.locator('#agency').scrollIntoViewIfNeeded();
    await page.locator('#agency img').evaluate(image=>image.decode());
    assert.ok(await page.locator('#agency').evaluate(el=>el.getBoundingClientRect().right<=innerWidth+1),'homepage feature overflow');
    await page.locator('#agency').screenshot({path:'agency-test-artifacts/home-feature-'+width+'.png'});
    await context.close();console.log('PASS public agency and homepage '+width+'px');
  }
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
  await page.route('**/lab/native-account.js*',route=>route.fulfill({contentType:'text/javascript',body:`export async function loadLabAccount(){window.__agencyTestClerk={session:null,addListener(fn){this.listener=fn;},openSignIn(){}};return window.__agencyTestClerk;}`}));
  await page.goto(base+'/agency/inbox.html',{waitUntil:'domcontentloaded'});await page.waitForSelector('#inbox-signin:not([hidden])');
  assert.ok(await page.locator('#inbox-content').isHidden());assert.equal(await page.locator('.enquiry').count(),0);
  console.log('PASS signed-out owner inbox contains no private records');await context.close();
}finally{await browser.close();}
