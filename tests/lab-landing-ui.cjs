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
 for(const [width,height] of [[1440,1000],[1753,832],[1440,800],[390,844],[320,740],[768,1024]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:8766/lab/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  await page.locator('.hero-poster').evaluate(img=>img.decode());
  assert.equal(await page.locator('h1').textContent(),'PV LAB');
  assert.equal(await page.locator('.hero-welcome').count(),0,'Free credits banner is removed from the hero');
  assert.equal(await page.locator('.lab-pricing-welcome').count(),0,'Free credits offer is removed from pricing');
  assert.equal(await page.locator('.start-link').getAttribute('href'),'./studio.html?tool=image&welcome=1');
  assert.deepEqual(await page.locator('.studio-tool-link').evaluateAll(els=>els.map(el=>el.getAttribute('href'))),['./studio.html?tool=image','./studio.html?tool=video','./studio.html?tool=upscale']);
  assert.deepEqual(await page.locator('.landing-header nav a').allTextContents(),['Image','Video','Upscaler','Retouch','Fashion','Explore Moods','Pricing']);
  assert.equal(await page.locator('.landing-header nav a').nth(3).getAttribute('href'),'./studio.html?tool=retouch');
  assert.equal(await page.locator('.landing-header nav a').nth(4).getAttribute('href'),'./studio.html?tool=fashion');
  assert.equal(await page.locator('.landing-header nav a.lab-nav-pricing').getAttribute('href'),'#pricing');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No overflow at '+width);
  assert.equal(await page.locator('.hero-poster').evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await page.locator('#motion-toggle').count(),0);
  const current=await page.locator('.hero-poster').evaluate(el=>el.currentSrc);
  assert.ok(current.endsWith(width<=700?'/leather-editorial/hero-mobile-editorial-20261017.jpg':'/leather-editorial/hero-desktop.webp'),'Approved responsive editorial portrait matches the viewport');
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
  assert.match(details.inviteBg,/(?:invite-wet-editorial\.webp|invite-after-fabric-exact\.avif|invite-after-fabric-user-approved-20261014\.webp|invite-liquid-chrome-20261015\.jpg|invite-black-satin-20261015\.jpg)/,'Referral promotion uses an approved photographic editorial');
  if(width<=760)assert.match(details.inviteBg,/gradient/,'Mobile adds a readable gradient over the editorial photo');
  const textRGB=(details.inviteText.match(/\d+/g)||[]).slice(0,3).map(Number);
  const paragraphRGB=(details.inviteParagraph.match(/\d+/g)||[]).slice(0,3).map(Number);
  assert.equal(textRGB.length,3,'Referral typography uses a valid color');
  assert.ok(textRGB.every(n=>n>=225),'Referral typography stays light enough over the dark editorial');
  assert.equal(paragraphRGB.length,3,'Referral description uses a valid color');
  assert.ok(paragraphRGB.every(n=>n>=180),'Referral description retains contrast on dark photography');
  if(width>760){
    assert.ok(details.rowHeights.every(n=>n>=(width<=1250?195:(height<=940?115:160))&&n<=260),'Editorial purchase cards are appropriately sized for the viewport');
    assert.ok(layout.collection.right<=layout.comparison.x,'Desktop prices sit beside the film collection');
    assert.ok(layout.cardGap>=0,'Film deck does not hide the checkout column');
    assert.ok(details.headlineSize>=(width<=1000?34:37),'Desktop and tablet pricing headings retain their established type scale');
  }else{
    // Mobile keeps the original film strip and subscription tabs,
    // without a promotion banner between them.
    const mobile=await page.locator('#pricing').evaluate(section=>{
      const pos=selector=>{
        const r=section.querySelector(selector).getBoundingClientRect();
        return {top:r.top,bottom:r.bottom,width:r.width,height:r.height};
      };
      return {
        headline:pos('h2'),
        intro:pos('.lab-plans-intro'),
        deck:pos('.lab-pricing-deck'),
        tabs:pos('.lab-pricing-options'),
        starter:pos('#lab-monthly-plans .lab-plan:first-child'),
        creator:pos('#lab-monthly-plans .lab-plan:nth-child(2)'),
        studio:pos('#lab-monthly-plans .lab-plan:last-child'),
        creatorPhoto:getComputedStyle(section.querySelector('.lab-plan--recommended'),'::before').backgroundImage
      };
    });
    assert.ok(details.headlineSize>=27&&details.headlineSize<=34,'Mobile heading is compact and editorial: '+JSON.stringify(mobile));
    assert.ok(mobile.headline.bottom<=mobile.deck.top&&mobile.intro.bottom<=mobile.deck.top,'Photography follows the introduction');
    assert.ok(mobile.deck.height>=100&&mobile.deck.height<=140,'Mobile uses a shallow photographic strip');
    assert.ok(mobile.deck.bottom<=mobile.tabs.top,'Photography precedes purchase tabs without a free-trial banner');
    assert.ok(mobile.tabs.bottom<=mobile.starter.top,'Subscriptions follow the tab switch');
    assert.ok(mobile.starter.bottom<=mobile.creator.top&&mobile.creator.bottom<=mobile.studio.top,'All three plans remain visible in order');
    assert.ok(mobile.starter.height>=90&&mobile.starter.height<=155,'Starter is compact instead of a tall text card: '+JSON.stringify(mobile));
    assert.ok(mobile.studio.height>=90&&mobile.studio.height<=155,'Studio is compact instead of a tall text card: '+JSON.stringify(mobile));
    assert.ok(mobile.creator.height>=155&&mobile.creator.height<=225,'Creator has a distinct photographic layout: '+JSON.stringify(mobile));
    assert.ok(mobile.creator.height>mobile.starter.height+25,'Creator has stronger visual hierarchy');
    assert.match(mobile.creatorPhoto,/leather-editorial\/hero-desktop\.webp/,'Creator uses the existing fashion photograph');
    assert.equal(await page.locator('#pricing .lab-pricing-mood img').count(),3,'Original photographic deck remains the only deck');
    console.log('PV_LAB_MOBILE_PRICING_'+width+'='+JSON.stringify(mobile));
  }
  if(width>=1001&&height<=940){
    const fold=await page.locator('#pricing').evaluate(section=>{
      const sectionBox=section.getBoundingClientRect();
      const billing=section.querySelector('.lab-pricing-footnote').getBoundingClientRect();
      const lastPlan=section.querySelector('#lab-monthly-plans .lab-plan:last-child').getBoundingClientRect();
      return {sectionTop:sectionBox.top,sectionHeight:sectionBox.height,billingBottom:billing.bottom,lastPlanBottom:lastPlan.bottom,viewport:innerHeight};
    });
    assert.ok(fold.sectionHeight<=height+2,'Entire pricing section fits without scrolling on '+width+'x'+height+': '+JSON.stringify(fold));
    assert.ok(fold.billingBottom<=fold.sectionTop+height-12,'Billing information stays visible on '+width+'x'+height+': '+JSON.stringify(fold));
    console.log('PRICING_FOLD_METRICS_'+width+'_'+height+'='+JSON.stringify(fold));
  }

  if(width>=1400){
    const glamour=await page.locator('#pricing').evaluate(section=>{
      const collection=section.querySelector('.lab-pricing-collection').getBoundingClientRect();
      const comparison=section.querySelector('.lab-pricing-comparison').getBoundingClientRect();
      const cards=[...section.querySelectorAll('.lab-pricing-mood')].map(c=>c.getBoundingClientRect());
      return {
        collectionX:collection.x,comparisonX:comparison.x,
        centerCardWidth:cards[2].width,
        viewport:innerWidth
      };
    });
    assert.ok(glamour.collectionX<=width*.11,'Editorial photographs expand toward the left edge: '+JSON.stringify(glamour));
    assert.ok(glamour.comparisonX>=width*.52&&glamour.comparisonX<=width*.63,'Pricing sits in its own spacious right column: '+JSON.stringify(glamour));
  }
  assert.equal(await page.locator('#pricing .lab-pricing-welcome').count(),0,'Paid pricing has no free-credit banner');
  assert.equal(await page.locator('#lab-monthly-plans .lab-plan-usage').count(),3,'Monthly pricing shows example model usage');
  assert.equal(await page.locator('#lab-one-time-credits .lab-plan-usage').count(),3,'One-time pricing shows example model usage');
  assert.equal(await page.locator('#pricing .lab-pricing-usage-note').count(),0,'No small model-rate paragraph under plans');
  assert.equal(await page.locator('#pricing .lab-estimate-details').count(),6,'All purchase rows explain estimate rates on demand');

  assert.equal(await page.locator('#lab-monthly-plans .lab-plan-tag').count(),1,'One editorial recommendation distinguishes the Creator plan');
  assert.equal(await page.locator('#lab-one-time-credits .lab-plan-tag').count(),0,'One-time packs are neutrally presented');
  assert.equal(await page.locator('#pricing .lab-buy-label').count(),6,'Every plan offers a visible purchase action');
  assert.equal(await page.locator('#pricing .lab-pricing-benefits').count(),1,'Common capabilities are shown once below the plans');
  assert.equal(await page.locator('#pricing .lab-plan-usage-stats').first().getByText('Upscaling available').count(),0,'Upscaling is not repeated inside each plan');
  const infoAtEnd=await page.locator('#pricing .lab-plan-usage-stats').evaluateAll(rows=>rows.every(row=>row.lastElementChild?.classList.contains('lab-estimate-details')));
  assert.equal(infoAtEnd,true,'Estimate info icon follows images, videos and upscaling on all six options');
  const statsStyle=await page.locator('#lab-monthly-plans .lab-plan-usage-stats').first().evaluate(el=>({
    size:parseFloat(getComputedStyle(el).fontSize),
    weight:parseFloat(getComputedStyle(el).fontWeight),
    color:getComputedStyle(el).color
  }));
  assert.ok(statsStyle.size>=(width>760&&width<=1000?11:11.5),'Image and video estimates retain the established mobile/tablet type scale at '+width+': '+JSON.stringify(statsStyle));
  assert.ok(statsStyle.weight>=400,'Usage figures are legible without relying on thin typography');
  if(width>760){
    const row=page.locator('#lab-monthly-plans .lab-plan').first();
    const before=await row.boundingBox();
    await row.locator('button[data-lab-buy]').hover();
    const after=await row.boundingBox();
    const rowBackground=await row.evaluate(el=>getComputedStyle(el).backgroundColor);
    assert.ok(rowBackground!=='rgba(0, 0, 0, 0)'&&rowBackground!=='transparent','Pricing row gives a subtle purchase hover response: '+rowBackground);
    assert.ok(before&&after&&Math.abs(before.height-after.height)<1,'Hover does not shift plan layout');
    // Only one checkout CTA is light at a time: Creator by default, otherwise
    // whichever monthly card receives the pointer. Preserve the Creator label.
    const waitForLightButtons=expected=>page.waitForFunction(expected=>{
      const buttons=[...document.querySelectorAll('#lab-monthly-plans .lab-plan>button[data-lab-buy]')];
      return buttons.length===3&&buttons.every((button,i)=>{
        const channels=getComputedStyle(button).backgroundColor.match(/[\d.]+/g);
        return channels&&((Number(channels[0])>=200)===expected[i]);
      });
    },expected,{timeout:4000});
    await page.mouse.move(0,0);
    await waitForLightButtons([false,true,false]);
    await page.locator('#lab-monthly-plans [data-lab-buy="starter"]').hover();
    await waitForLightButtons([true,false,false]);
    await page.locator('#lab-monthly-plans [data-lab-buy="studio"]').hover();
    await waitForLightButtons([false,false,true]);
    await page.mouse.move(0,0);
    await waitForLightButtons([false,true,false]);
  }

  const estimate=page.locator('#lab-monthly-plans .lab-estimate-details').first();
  const estimateButton=estimate.locator('.lab-estimate-toggle');
  const estimatePopover=estimate.locator('.lab-estimate-popover');
  assert.equal(await estimatePopover.isVisible(),false,'Explanation hidden until the icon is activated');
  await estimateButton.hover();
  assert.equal(await estimatePopover.isVisible(),true,'Hovering information icon reveals the full rate explanation');
  assert.match(await estimatePopover.textContent(),/Actual costs are shown before generation/);
  const bubble=await estimatePopover.boundingBox();
  assert.ok(bubble&&bubble.x>=0&&bubble.x+bubble.width<=width+1,'Explanation popover stays in viewport width '+width);
  await page.mouse.move(0,0);
  assert.equal(await estimatePopover.isVisible(),false,'Hover explanation closes when pointer leaves');
  await estimateButton.focus();
  assert.equal(await estimatePopover.isVisible(),true,'Keyboard focus opens the explanation');
  await estimateButton.evaluate(button=>button.blur());
  assert.equal(await estimatePopover.isVisible(),false,'Focus explanation closes on blur');
  await estimateButton.click();
  assert.equal(await estimateButton.getAttribute('aria-expanded'),'true','Click/tap opens estimate popover');
  assert.equal(await estimatePopover.isVisible(),true,'Tapped estimate explanation stays visible');
  await estimateButton.click();
  assert.equal(await estimateButton.getAttribute('aria-expanded'),'false','Second click closes the estimate hint');
  assert.equal(await estimatePopover.isVisible(),false,'Popover stays hidden even while the button remains hovered or focused');
  await estimateButton.click();
  assert.equal(await estimateButton.getAttribute('aria-expanded'),'true','Third click opens the estimate hint again');
  assert.equal(await estimatePopover.isVisible(),true);
  await page.locator('#pricing .lab-plans-kicker').first().click();
  assert.equal(await estimateButton.getAttribute('aria-expanded'),'false','Click outside dismisses estimate popover');
  assert.equal(await estimatePopover.isVisible(),false,'Dismissed explanation stays hidden');
  assert.equal(await page.locator('#pricing .lab-purchase-status:not([hidden])').count(),0,'Estimate button never triggers purchase');
  const tabFont=await page.locator('#lab-tab-onetime').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  assert.ok(tabFont>=14,'Purchase type tabs are readable at '+width);
  await page.getByRole('tab',{name:'One-time credits',exact:true}).click();
  assert.equal(await page.locator('#lab-one-time-credits').isVisible(),true,'One-time packs are visible');
  const packEstimate=page.locator('#lab-one-time-credits .lab-estimate-toggle').first();
  await packEstimate.hover();
  assert.equal(await page.locator('#lab-one-time-credits .lab-estimate-popover').first().isVisible(),true,'One-time purchase rates also have a hover explanation');
  await page.mouse.move(0,0);
  assert.equal(await page.locator('#lab-monthly-plans').isVisible(),false,'Monthly plans are hidden');
  assert.equal(await page.locator('#lab-pricing-billing-copy').innerText(),'Pay once. No recurring charge.','One-time terms match selected packs');
  for(const button of await page.locator('#lab-one-time-credits [data-lab-buy]').all())await button.click({trial:true});
  await page.getByRole('tab',{name:'Monthly plans',exact:true}).click();
  assert.equal(await page.locator('#lab-monthly-plans').isVisible(),true,'Monthly plans are restored');
  assert.equal(await page.locator('#lab-pricing-billing-copy').innerText(),'Renews monthly until cancelled.','Monthly terms return with the selected plans');
  await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(0,0);
  if(width===1440||width===390||width===1753)console.log('PRICING_CARDS_'+width+'_'+height+'='+Buffer.from(await page.locator('#pricing').screenshot({type:'jpeg',quality:82})).toString('base64'));
  await page.evaluate(()=>scrollTo(0,0));
  if(width===1440&&height===1000||width===390)console.log('SILVER_LANDING_'+width+'='+Buffer.from(await page.screenshot({type:'jpeg',quality:75,fullPage:true})).toString('base64'));
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
