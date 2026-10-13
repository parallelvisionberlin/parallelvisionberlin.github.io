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
  assert.equal(await page.locator('.start-link').getAttribute('href'),'./studio.html?tool=image');
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
      rowHeights:rows.map(row=>row.getBoundingClientRect().height),
      inviteBg:getComputedStyle(invite).backgroundImage,
      inviteText:getComputedStyle(invite).color,
      inviteParagraph:getComputedStyle(invite.querySelector('.lab-invite-promo__description')).color,
      overflow:document.documentElement.scrollWidth>innerWidth
    };
  });
  assert.ok(details.sectionHeight>=details.visibleHeight-1,'Pricing occupies at least one viewport');
  assert.match(details.inviteBg,/gradient/,'Referral promotion keeps its new editorial gradient');
  assert.equal(details.inviteText,'rgb(245, 241, 234)','Referral typography remains readable');
  assert.equal(details.inviteParagraph,'rgb(216, 209, 198)','Referral description has contrast on dark background');
  if(width>760){
    assert.equal(details.deckMargin,'20px','Desktop image collection is balanced lower by 20px');
    assert.ok(details.rowHeights.every(n=>n>=110&&n<=114),'Desktop pricing rows have relaxed 112px rhythm');
    if(width>=1200){
      assert.ok(Math.abs(details.topSpace-details.bottomSpace)<=3,'Pricing composition centers in its viewport');
      assert.ok(details.headlineSize>=47,'Desktop pricing heading has hero-scale typography');
      assert.ok(layout.cardGap>=60,'Mood images have room before the pricing text');
    }
  }else{
    assert.equal(details.deckMargin,'0px','Mobile photography keeps original compact position');
  }
  if(width>760)assert.ok(layout.collection.right<=layout.comparison.x,'Desktop prices sit beside the image collection');
  else assert.ok(layout.collection.bottom<=layout.comparison.y+1,'Mobile prices follow the compact image collection');
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
