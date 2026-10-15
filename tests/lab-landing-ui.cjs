const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('node:assert/strict');
const root=process.cwd();
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const rel=url.pathname.replace(/^\//,'')+(url.pathname.endsWith('/')?'index.html':'');
 const f=path.join(root,rel);
 if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));
});
(async()=>{
 await new Promise(r=>server.listen(8766,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const [width,height] of [[1440,1000],[390,844],[320,740],[768,1024]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:8766/lab/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  await page.locator('.hero-poster').evaluate(img=>img.decode());
  assert.equal(await page.locator('h1').textContent(),'PV LAB');
  assert.match(await page.locator('.hero-welcome').textContent(),/200 free credits/);
  assert.match(await page.locator('.lab-pricing-welcome').textContent(),/No purchase required/);
  assert.equal(await page.locator('.start-link').getAttribute('href'),'./studio.html?tool=image&welcome=1');
  assert.deepEqual(await page.locator('.studio-tool-link').evaluateAll(els=>els.map(el=>el.getAttribute('href'))),['./studio.html?tool=image','./studio.html?tool=video','./studio.html?tool=upscale']);
  assert.deepEqual(await page.locator('.landing-header nav a').allTextContents(),['Image','Video','Upscaler','Explore Moods','Pricing']);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No overflow at '+width);
  assert.equal(await page.locator('.hero-poster').evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await page.locator('#motion-toggle').count(),0);
  const current=await page.locator('.hero-poster').evaluate(el=>el.currentSrc);
  assert.ok(current.endsWith(width<=700?'/leather-editorial/hero-mobile.webp':'/leather-editorial/hero-desktop.webp'),'Approved editorial portrait matches the viewport');
  assert.equal(await page.locator('#pv-hero-motion').count(),0,'The selected still hero does not request an old hero video');
  assert.equal(await page.locator('#hero-motion-toggle').count(),0,'The still hero needs no playback control');
  await page.locator('#tools').scrollIntoViewIfNeeded();await page.locator('.studio-tool-link img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
  await page.locator('#pricing').scrollIntoViewIfNeeded();
  await page.locator('.lab-pricing-mood img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
  assert.equal(await page.locator('.lab-pricing-mood').count(),3,'Three approved mood cards');
  assert.equal(await page.locator('#pricing [data-lab-buy] svg.pv-arrow-svg').count(),6,'Every pricing CTA uses a vector arrow');
  assert.equal(await page.locator('#pricing [data-lab-buy]').evaluateAll(buttons=>buttons.every(b=>!b.textContent.includes('↗'))),true,'No emoji arrows inside pricing actions');
  if(width<=560)assert.equal(await page.locator('#lab-home-upgrade').isVisible(),false,'Mobile header keeps Upgrade out of the crowded top row');
  assert.deepEqual(await page.locator('#pricing [data-lab-buy]').evaluateAll(els=>els.map(el=>el.dataset.labBuy)),['starter','creator','studio','topup10','topup29','topup75'],'All existing checkout products remain connected');
  assert.equal(await page.locator('#pricing .lab-credits-guide').count(),0,'Removed the disconnected credit explanation below the price rows');
  assert.equal(await page.locator('#pricing .lab-pricing-footnote').count(),1,'Billing clarification lives directly below the selected prices');
  assert.equal(await page.locator('#lab-pricing-billing-copy').innerText(),'Renews monthly until cancelled.');
  assert.equal(await page.locator('#pricing .lab-pricing-footnote a').getAttribute('href'),'/lab/terms/');
  assert.ok((await page.locator('#pricing .lab-plans-intro').innerText()).startsWith('One credit balance'),'Credit explanation is integrated into pricing introduction');
  for(const button of await page.locator('#lab-monthly-plans [data-lab-buy]').all())await button.click({trial:true});
  const layout=await page.locator('#pricing').evaluate(section=>{
   const collection=section.querySelector('.lab-pricing-collection').getBoundingClientRect();
   const comparison=section.querySelector('.lab-pricing-comparison').getBoundingClientRect();
   const title=section.querySelector('h2');
   const cardRight=Math.max(...[...section.querySelectorAll('.lab-pricing-mood')].map(card=>card.getBoundingClientRect().right));
   return {collection:{right:collection.right,bottom:collection.bottom},comparison:{x:comparison.x,y:comparison.y},cardGap:comparison.x-cardRight,weight:getComputedStyle(title).fontWeight,background:getComputedStyle(section).backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.equal(layout.overflow,false,'Pricing does not overflow at '+width);
  assert.equal(layout.weight,'300','Pricing reuses the light hero typography');
  assert.equal(layout.background,'rgb(13, 13, 13)','Neutral black pricing background');
  const details=await page.evaluate(()=>{
    const pricing=document.querySelector('#pricing');
    const deck=document.querySelector('.lab-pricing-deck');
    const rows=[...document.querySelectorAll('#lab-monthly-plans .lab-plan')];
    const invite=document.querySelector('.lab-invite-promo');
    return {
      sectionHeight:pricing.getBoundingClientRect().height,
      topPadding:parseFloat(getComputedStyle(pricing).paddingTop),
      topSpace:pricing.querySelector('.lab-plans-inner').getBoundingClientRect().top-pricing.getBoundingClientRect().top,
      bottomSpace:pricing.getBoundingClientRect().bottom-pricing.querySelector('.lab-plans-inner').getBoundingClientRect().bottom,
      headlineSize:parseFloat(getComputedStyle(pricing.querySelector('h2')).fontSize),
      visibleHeight:innerHeight,
      deckMargin:getComputedStyle(deck).marginTop,
      deckLeft:deck.getBoundingClientRect().left,
      columnLeft:pricing.querySelector('.lab-pricing-collection').getBoundingClientRect().left,
      innerPosition:getComputedStyle(pricing.querySelector('.lab-plans-inner')).position,
      innerTop:getComputedStyle(pricing.querySelector('.lab-plans-inner')).top,
      rowHeights:rows.map(row=>row.getBoundingClientRect().height),
      inviteBg:getComputedStyle(invite).backgroundImage,
      inviteText:getComputedStyle(invite).color,
      inviteParagraph:getComputedStyle(invite.querySelector('.lab-invite-promo__description')).color,
      overflow:document.documentElement.scrollWidth>innerWidth
    };
  });
  assert.ok(details.sectionHeight>=details.visibleHeight-1,'Pricing occupies at least one viewport');
  assert.match(details.inviteBg,/(?:invite-wet-editorial\.webp|invite-after-fabric-exact\.avif|invite-after-fabric-user-approved-20261014\.webp)/,'Referral promotion uses an approved photographic editorial');
  if(width<=760)assert.match(details.inviteBg,/gradient/,'Mobile adds a readable gradient over the editorial photo');
  const textRGB=(details.inviteText.match(/\d+/g)||[]).slice(0,3).map(Number);
  const paragraphRGB=(details.inviteParagraph.match(/\d+/g)||[]).slice(0,3).map(Number);
  assert.equal(textRGB.length,3,'Referral typography uses a valid color');
  assert.ok(textRGB.every(n=>n>=225),'Referral typography stays light enough over the dark editorial');
  assert.equal(paragraphRGB.length,3,'Referral description uses a valid color');
  assert.ok(paragraphRGB.every(n=>n>=180),'Referral description retains contrast on dark photography');
  if(width>760){
    assert.ok(details.rowHeights.every(n=>n>=145&&n<=195),'Editorial rows include readable model examples');
    assert.ok(layout.collection.right<=layout.comparison.x,'Desktop prices sit beside the film collection');
    assert.ok(layout.cardGap>=0,'Film deck does not hide the checkout column');
    assert.ok(details.headlineSize>=37,'Editorial pricing heading stays prominent');
  }else{
    assert.ok(layout.collection.bottom>layout.comparison.y,'Mobile places checkout before the decorative film collection');
    assert.ok(details.rowHeights.every(n=>n>=145),'Mobile purchase options include usable detail');
  }
  assert.equal(await page.locator('#pricing .lab-pricing-collection .lab-pricing-welcome').count(),1,'Welcome offer sits below photography');
  assert.equal(await page.locator('#pricing .lab-pricing-welcome [data-lab-welcome-start]').count(),1,'Welcome CTA keeps original sign-in flow');
  assert.equal(await page.locator('#lab-monthly-plans .lab-plan-usage').count(),3,'Monthly pricing shows example model usage');
  assert.equal(await page.locator('#lab-one-time-credits .lab-plan-usage').count(),3,'One-time pricing shows example model usage');
  const tabFont=await page.locator('#lab-tab-onetime').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  assert.ok(tabFont>=14,'Purchase type tabs are readable at '+width);
  await page.getByRole('tab',{name:'One-time credits',exact:true}).click();
  assert.equal(await page.locator('#lab-one-time-credits').isVisible(),true,'One-time packs are visible');
  assert.equal(await page.locator('#lab-monthly-plans').isVisible(),false,'Monthly plans are hidden');
  assert.equal(await page.locator('#lab-pricing-billing-copy').innerText(),'Pay once. No recurring charge.','One-time terms match selected packs');
  for(const button of await page.locator('#lab-one-time-credits [data-lab-buy]').all())await button.click({trial:true});
  await page.getByRole('tab',{name:'Monthly plans',exact:true}).click();
  assert.equal(await page.locator('#lab-monthly-plans').isVisible(),true,'Monthly plans are restored');
  assert.equal(await page.locator('#lab-pricing-billing-copy').innerText(),'Renews monthly until cancelled.','Monthly terms return with the selected plans');
  await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(0,0);
  if(width===1440||width===390)console.log('PRICING_CARDS_'+width+'='+Buffer.from(await page.locator('#pricing').screenshot({type:'jpeg',quality:85})).toString('base64'));
  await page.evaluate(()=>scrollTo(0,0));
  if(width===1440||width===390)console.log('SILVER_LANDING_'+width+'='+Buffer.from(await page.screenshot({type:'jpeg',quality:75,fullPage:true})).toString('base64'));
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('http://127.0.0.1:8766/lab/',{waitUntil:'networkidle'});
 for(const card of await page.locator('.studio-tool-link').all()){
 const heading=await card.locator('.studio-tool-head h3').boundingBox(),media=await card.locator('.studio-tool-photo').boundingBox();
 assert.ok(heading.x>=media.x&&heading.y>=media.y&&heading.x+heading.width<=media.x+media.width+1&&heading.y+heading.height<=media.y+media.height+1,'Studio titles remain inside their photographs');
 const layers=await card.evaluate(el=>({heading:Number(getComputedStyle(el.querySelector('.studio-tool-head')).zIndex),photo:Number(getComputedStyle(el.querySelector('.studio-tool-photo')).zIndex)}));
 assert.ok(layers.heading>layers.photo,'Studio titles remain visible above the photo layer');
 }
 assert.deepEqual(errors,[]);console.log('PASS editorial landing: responsive portraits, reduced motion, destinations, pricing cards, checkout hit targets, no overflow and titles inside photographs');
 await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1)});
