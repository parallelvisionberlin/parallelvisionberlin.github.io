import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
let uploadCount=0,jobCount=0,quoteCount=0,quoteDelay=0,quoteTTL=300000,failSubmission=false;
const quoted=new Map(),submitted=new Set(),quotedPrompts=[];
const mockAuth="export async function loadLabAccount(){return {isSignedIn:true,session:{id:'sess-editorial-mock',getToken:async()=> 'token'},user:{id:'user-editorial-mock'},addListener(){},openSignIn(){throw Error('Sign in should not be opened in mock');}}}";
const mockSession="export function createSessionRequest(){return async (path,init)=>fetch('http://127.0.0.1:4179'+path,init)}";
const image=readFileSync('lab/visuals/hero/pvlab-industrial-fashion-20261027.jpg');
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1:4179');
 if(u.pathname==='/lab/native-account.js'){res.setHeader('Content-Type','text/javascript');res.end(mockAuth);return}
 if(u.pathname==='/lab/session-request.js'){res.setHeader('Content-Type','text/javascript');res.end(mockSession);return}
 const json=obj=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(obj));};
 if(u.pathname==='/api/session'){json({config:{enabled:true},credits:{balance:5000}});return}
 if(u.pathname==='/api/packs'){json({packs:[{name:'PVSCENE1|characters|Test Actor',refs:[{id:'saved-actor-1',name:'Saved actor front'}]}]});return}
 if(u.pathname==='/api/assets/saved-actor-1/thumbnail'){res.setHeader('Content-Type','image/jpeg');res.end(image);return}
 if(u.pathname==='/api/uploads'){for await(const _chunk of req){}json({id:'upload-'+(++uploadCount)});return}
 if(u.pathname==='/api/quotes'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const input=JSON.parse(Buffer.concat(chunks).toString());quoteCount++;
  assert.equal(input.count,1);assert.equal(input.referenceSourceIds.length,2);
  quotedPrompts.push(input.settings.prompt);
  const list=Array.from({length:input.count},(_,i)=>({id:'quote-'+quoteCount+'-'+i,settings:input.settings,expiresAt:Date.now()+quoteTTL,creditCost:input.settings.resolution==='2k'?70:35}));
  for(const q of list)quoted.set(q.id,q);
  if(quoteDelay)await new Promise(ok=>setTimeout(ok,quoteDelay));
  json({quotes:list});return;
 }
 if(u.pathname==='/api/jobs'&&req.method==='POST'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const input=JSON.parse(Buffer.concat(chunks).toString());
  assert.equal(input.confirm,true);assert.ok(quoted.has(input.quoteId));
  assert.equal(submitted.has(input.quoteId),false,'A paid quote is submitted only once');
  submitted.add(input.quoteId);jobCount++;
  if(failSubmission){res.statusCode=503;json({error:'Mock interrupted submission'});return}
  json({job:{id:'job-'+jobCount,status:'completed',outputId:'test-output-'+jobCount}});return;
 }
 if(/^\/api\/assets\/test-output-/.test(u.pathname)){res.setHeader('Content-Type','image/jpeg');res.end(image);return}
 if(/^\/api\/jobs\/job-/.test(u.pathname)){await new Promise(ok=>setTimeout(ok,400));const id=u.pathname.split('/').pop();json({job:{id,status:'completed',outputId:'test-output-'+id.slice(4)}});return}
 const path=resolve(root,'.'+u.pathname+(u.pathname.endsWith('/')?'index.html':''));
 if(!path.startsWith(root+'/')||!existsSync(path)){res.statusCode=404;res.end();return}
 res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream');
 res.end(readFileSync(path));
});
await new Promise(ok=>server.listen(4179,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('test-results/editorial',{recursive:true});
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4179/lab/full-editorial.html',{waitUntil:'domcontentloaded'});
  await page.locator('.editorial-hero-art img').evaluate(img=>img.decode().catch(()=>{}));
  await page.screenshot({path:'test-results/editorial/'+width+'-hero.png',fullPage:width===390});
  await page.locator('#editorial-start').click();
  assert.equal(await page.locator('#model-thumbs .editorial-model-card').count(),0,'Fresh casting opens without a selected model');
  assert.equal(await page.locator('#editorial-casting-controls').isVisible(),true,'Composition is visible before picking a model');
  assert.equal(await page.locator('#editorial-casting-controls').getAttribute('data-cast-state'),'empty');
  assert.equal(await page.locator('[data-cast-composition="alternating"]').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('[data-cast-composition="alternating"]').isDisabled(),true);
  assert.equal(await page.evaluate(()=>document.getElementById('step-footer').nextElementSibling?.id),'editorial-casting-controls');
   assert.equal(await page.locator('#editorial-cast-selection').isVisible(),true,'The one selected-cast dock is available at every width');
   assert.equal(await page.locator('#editorial-cast-empty').isVisible(),true,'The footer explains empty selection once');
   assert.equal(await page.locator('[data-cast-composition="mixed"]').isDisabled(),true);
   assert.equal(await page.locator('[data-cast-composition="together"]').isDisabled(),true);
   assert.equal(await page.locator('#step-next').isDisabled(),true);
   if(width>800){
    const fold=await page.locator('#editorial-composition-choices').evaluate(el=>({bottom:el.getBoundingClientRect().bottom,viewport:innerHeight}));
    assert.ok(fold.bottom<=fold.viewport-8,'Composition fully visible on initial 1440×900 viewport: '+JSON.stringify(fold));
   }
  for(const label of ['Bronze portrait','Copper portrait'])assert.equal(await page.locator('[data-sample-label="'+label+'"]').getAttribute('aria-pressed'),'false');
  const castTrack=page.locator('#editorial-cast-track');
  assert.equal(await page.locator('.editorial-cast-pinned').count(),1,'One pinned Create Character and upload card');
  assert.match(await page.locator('.editorial-create-character').getAttribute('href'),/createCharacter=1/);
  const carouselState=await castTrack.evaluate(el=>({width:el.clientWidth,full:el.scrollWidth,count:el.querySelectorAll('.atelier-reference').length}));
  assert.equal(carouselState.count,5,'All five photographic casting references remain');
  assert.ok(carouselState.full>carouselState.width+30,'The casting gallery scrolls horizontally');
  assert.equal(await page.locator('#editorial-cast-prev').isDisabled(),true);
  await page.locator('#editorial-cast-next').click();
  await page.waitForFunction(()=>document.getElementById('editorial-cast-track').scrollLeft>12);
  assert.equal(await page.locator('#casting-reference-gallery .atelier-reference[aria-pressed="true"]').count(),0,'Arrow navigation does not select a model');
  await castTrack.focus();
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(()=>document.getElementById('editorial-cast-track').scrollLeft<9);
  assert.equal(await page.locator('#casting-reference-gallery .atelier-reference[aria-pressed="true"]').count(),0,'Keyboard browsing does not change selection');

  let baselineCastSizes=null;
  if(width>800){
   baselineCastSizes=await page.evaluate(()=>{
    const r=selector=>document.querySelector(selector).getBoundingClientRect();
    return {hero:r('#panel-model .stage-visual').height,
     galleryCard:r('#casting-reference-gallery .atelier-reference').height};
   });
   const layout=await page.evaluate(()=>{
    const rect=selector=>document.querySelector(selector).getBoundingClientRect();
    const hero=rect('#panel-model .stage-visual'),header=rect('.editorial-header'),rail=rect('.editorial-flow-rail'),back=rect('.progress-top'),cards=rect('#casting-reference-gallery');
    return {heroBelowHeader:hero.top>=header.bottom,topGap:hero.top-header.bottom,heroHeight:hero.height,railHidden:getComputedStyle(document.querySelector('.editorial-flow-rail')).display==='none',backInside:back.top>=hero.top&&back.bottom<=hero.bottom,cardsVisible:cards.bottom<=innerHeight-12};
   });
   assert.equal(layout.heroBelowHeader,true,'Sticky header does not cover hero controls');
   assert.ok(layout.topGap<=13,'Hero begins immediately below the header');
   assert.ok(layout.heroHeight>=205&&layout.heroHeight<=235,'Short desktop displays hero and full Composition');
   for(const key of ['railHidden','backInside','cardsVisible'])assert.equal(layout[key],true,key);
   const emptyBounds=await page.evaluate(()=>{
    const r=selector=>document.querySelector(selector).getBoundingClientRect();
    return {footerBottom:r('#step-footer').bottom,viewportHeight:innerHeight,
     cardHeight:r('#casting-reference-gallery .atelier-reference').height,
     buttonBackground:getComputedStyle(document.getElementById('step-next')).backgroundColor};
   });
   assert.ok(emptyBounds.footerBottom<=emptyBounds.viewportHeight-8,'Empty Identity action and cast all fit on the initial desktop screen: '+JSON.stringify(emptyBounds));
   assert.ok(emptyBounds.cardHeight>=245&&emptyBounds.cardHeight<=272,'Casting images retain editorial proportions');
   const textClearance=await page.evaluate(()=>{
    const box=selector=>document.querySelector(selector).getBoundingClientRect();
    const button=document.getElementById('step-next');
    return {backBottom:box('#editorial-top-back').bottom,kickerTop:box('#panel-model .stage-index').top,
     subtitleBottom:box('#panel-model .stage-copy p').bottom,heroBottom:box('#panel-model .stage-visual').bottom,
     buttonRadius:getComputedStyle(button).borderRadius,
     disabledBackground:getComputedStyle(button).backgroundColor};
   });
   assert.ok(textClearance.kickerTop>=textClearance.backBottom+4,'Stage kicker must clear Back: '+JSON.stringify(textClearance));
   assert.ok(textClearance.subtitleBottom<=textClearance.heroBottom-15,'Subtitle clears the hero edge: '+JSON.stringify(textClearance));
   assert.equal(textClearance.buttonRadius,'0px','Continue has square corners');
   assert.notEqual(textClearance.disabledBackground,'rgb(244, 241, 234)','Disabled Continue is dark');
   assert.match(emptyBounds.buttonBackground,/rgba?\(\s*(?:0|1\d|2\d|3\d)/,'Disabled Continue uses dark editorial styling');
   await page.locator('#editorial-top-back').click();
   assert.equal(await page.locator('#editorial-hero').isVisible(),true,'Top Back returns to hero');
   await page.locator('#editorial-start').click();
  }else{
   assert.equal(await page.locator('#editorial-top-back').isVisible(),true,'Phone has one discreet Back above the compact progress');
   assert.equal(await page.locator('#step-back').isVisible(),false,'Phone Identity footer contains only selection and Continue');
   assert.equal(await page.locator('.editorial-flow-rail').isVisible(),true,'Compact phone progress remains visible');
   assert.equal(await page.locator('#panel-model .stage-copy').isVisible(),false,'No duplicate portrait hero on phone');
   assert.equal(await page.locator('#model-drop').isVisible(),true,'Pinned first card includes the photo uploader');
   for(const phoneWidth of [320,390,600]){
    await page.setViewportSize({width:phoneWidth,height:844});
    const geometry=await page.evaluate(()=>{
     const r=s=>document.querySelector(s).getBoundingClientRect();
     const cards=[...document.querySelectorAll('#casting-reference-gallery .atelier-reference')].map(e=>e.getBoundingClientRect());
     return {columns:getComputedStyle(document.querySelector('#casting-reference-gallery')).gridTemplateColumns.split(' ').length,
      headerHeight:r('.editorial-header').height,captionLeft:r('#casting-reference-gallery .atelier-reference>span').left-cards[0].left,captionRight:cards[0].right-r('#casting-reference-gallery .atelier-reference>span').right,imageBorder:getComputedStyle(document.querySelector('#casting-reference-gallery .atelier-reference img')).borderTopWidth,
      top:cards[0].top,firstLeft:cards[0].left,secondLeft:cards[1].left,thirdTop:cards[2].top,firstBottom:cards[0].bottom,
      footerBottom:r('#step-footer').bottom,footerTop:r('#step-footer').top,continue:r('#step-next').height,
      arrow:getComputedStyle(document.querySelector('#step-next'),'::after').content,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    await page.screenshot({path:'test-results/editorial/'+phoneWidth+'-casting-layout.png'});
    console.log('PHONE_CASTING',phoneWidth,JSON.stringify(geometry));
    assert.ok(geometry.headerHeight<=61,'Phone header is compact');
    assert.ok(Math.abs(geometry.captionLeft)<=2&&Math.abs(geometry.captionRight)<=2,'Caption shading reaches both card edges without an inset rectangle');
    assert.equal(geometry.imageBorder,'0px','No second border inside the portrait');
    assert.equal(geometry.columns,2,'Pinned tile and gallery make two tracks');assert.ok(geometry.secondLeft>geometry.firstLeft);
    assert.ok(Math.abs(geometry.thirdTop-geometry.top)<3,'Casting portraits remain in one horizontal row');
    assert.ok(geometry.top<320,'Real casting appears near the top: '+JSON.stringify(geometry));
    assert.ok(Math.abs(geometry.footerBottom-844)<2,'Continue stays at viewport bottom');
    assert.ok(geometry.continue>=44);assert.equal(geometry.arrow,'none');assert.equal(geometry.overflow,false);
   }
   await page.setViewportSize({width:390,height:900});
   assert.equal(await page.locator('.editorial-account .credits-link').isVisible(),false);
   assert.equal(await page.locator('.editorial-account .editorial-avatar').isVisible(),false);
   await page.locator('#editorial-mobile-menu').click();
   assert.equal(await page.locator('#editorial-menu-credits').isVisible(),true);
   assert.equal(await page.locator('#editorial-menu-account').isVisible(),true);
   assert.match(await page.locator('#editorial-menu-credits').getAttribute('href'),/account\.html#balance$/);
   await page.locator('#editorial-mobile-menu').click();
   assert.equal(await page.locator('#editorial-mobile-search').isVisible(),false,'Casting has no redundant search field');
   await page.locator('#saved-character').click();
   await page.locator('#editorial-mobile-search').click();
   await page.locator('#editorial-cast-search').fill('Test Actor');
   await page.locator('#saved-character-gallery .editorial-saved-cast').first().waitFor();
  assert.equal(await page.locator('#editorial-saved-rail').isVisible(),true);
  assert.equal(await page.locator('#editorial-saved-prev').isDisabled(),true);
  assert.equal(await page.locator('#editorial-saved-next').isDisabled(),true);

   assert.equal(await page.locator('#saved-character-gallery .editorial-saved-cast:visible').count(),1,'Private saved characters still support search');
   await page.locator('#editorial-mobile-search').click();
   await page.locator('[data-source-view="casting"]').click();
   assert.equal(await page.locator('#casting-reference-gallery .atelier-reference:visible').count(),5);
   const uploadsBeforePicker=uploadCount;const picker=page.waitForEvent('filechooser');await page.locator('#model-drop').click();await picker;
   assert.equal(uploadCount,uploadsBeforePicker,'Opening the file chooser sends no upload or paid request');
   await page.screenshot({path:'test-results/editorial/390-mobile-casting.png'});
  }
  await page.locator('#editorial-top-back').click();
  assert.equal(await page.locator('#editorial-hero').isVisible(),true,'Back returns from Identity to hero');
  assert.equal(await page.locator('#editorial-flow').isVisible(),false);
  await page.locator('#editorial-start').click();
  await page.locator('#casting-reference-gallery .atelier-reference').first().click();
  await page.locator('#model-thumbs .thumb').waitFor({state:'visible'});
  if(width>800){
   const sizes=await page.evaluate(()=>{
    const r=selector=>document.querySelector(selector).getBoundingClientRect();
    return {hero:r('#panel-model .stage-visual').height,
     galleryCard:r('#casting-reference-gallery .atelier-reference').height};
   });
   assert.ok(Object.keys(sizes).every(k=>Math.abs(sizes[k]-baselineCastSizes[k])<.5),'Selecting a model cannot resize the hero or casting portraits');
  }
  assert.equal(await page.locator('#editorial-status').textContent(),'','Model click does not add redundant below-footer copy');
   assert.equal(await page.locator('#editorial-cast-empty').isVisible(),false);
   assert.equal(await page.locator('#editorial-casting-controls').isVisible(),true,'Composition stays visible with one model');
   assert.equal(await page.locator('#editorial-casting-controls').getAttribute('data-cast-state'),'solo');
   assert.equal(await page.locator('[data-cast-composition="alternating"]').getAttribute('aria-pressed'),'true','Solo only is automatic');
   if(width<=800){
    await page.waitForFunction(()=>{
     const track=document.getElementById('editorial-composition-choices'),item=track?.querySelector('[data-cast-composition="alternating"]');
     if(!track||!item)return false;
     const t=track.getBoundingClientRect(),r=item.getBoundingClientRect();
     return r.left>=t.left-3&&r.right<=t.right+3;
    });
   }
   assert.equal(await page.locator('[data-cast-composition="mixed"]').isDisabled(),true,'One model is not multi-cast');
   assert.equal(await page.locator('#step-next').isDisabled(),false,'One model can continue');
   if(width>800){
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('#step-next')).backgroundColor==='rgb(244, 241, 234)');
    const surface=await page.locator('#step-next').evaluate(el=>({
     background:getComputedStyle(el).backgroundColor,
     border:getComputedStyle(el).borderColor,
     arrow:getComputedStyle(el,'::after').content
    }));
    assert.equal(surface.background,'rgb(244, 241, 234)','Continue becomes white after model selection');
    assert.match(surface.arrow,/→/,'Continue uses the editorial forward arrow');
   }
  await page.locator('.stage-visual--identity img').evaluate(img=>img.decode().catch(()=>{}));
  await page.screenshot({path:'test-results/editorial/'+width+'-identity.png',fullPage:width===390});
  assert.equal(await page.locator('#casting-reference-gallery .atelier-reference').first().getAttribute('aria-pressed'),'true');
  // Multiple photographs of one person remain one selected model.
  const pickExtra=page.waitForEvent('filechooser');
  await page.locator('#model-thumbs .editorial-add-view').click();
  await (await pickExtra).setFiles('lab/visuals/hero/pvlab-industrial-fashion-20261027.jpg');
  await page.waitForFunction(()=>document.querySelectorAll('#model-thumbs .editorial-model-extra-thumb').length===1);
  assert.equal(await page.locator('#model-thumbs .editorial-model-card').count(),1,'Extra identity photo does not add a person');
  await page.locator('#model-thumbs .editorial-model-extra-thumb button').click();
  await page.waitForFunction(()=>document.querySelectorAll('#model-thumbs .editorial-model-extra-thumb').length===0);
  // Selecting another casting portrait creates a distinct model, not another view.
  await page.locator('#casting-reference-gallery .atelier-reference').nth(1).click();
  await page.waitForFunction(()=>document.querySelectorAll('#model-thumbs .editorial-model-card').length===2);
  if(width>800){
   const sizes=await page.evaluate(()=>{
    const r=selector=>document.querySelector(selector).getBoundingClientRect();
    return {hero:r('#panel-model .stage-visual').height,
     galleryCard:r('#casting-reference-gallery .atelier-reference').height};
   });
   assert.ok(Object.keys(sizes).every(k=>Math.abs(sizes[k]-baselineCastSizes[k])<.5),'Two models retain the same Identity hero and portrait dimensions');
  }
  assert.equal(await page.locator('#editorial-casting-controls').isVisible(),true);
  const compositionLayout=await page.locator('#editorial-casting-controls').evaluate(root=>{
   const cards=Array.from(root.querySelectorAll('[data-cast-composition]'));
   const rects=cards.map(card=>card.getBoundingClientRect());
   const firstImg=cards[0].querySelector('.editorial-composition-art img');
   return {heights:rects.map(r=>r.height),widths:rects.map(r=>r.width),tops:rects.map(r=>r.top),
    shelfWidth:root.getBoundingClientRect().width,
    photosPosition:getComputedStyle(firstImg.parentElement).position,
    copyPosition:getComputedStyle(cards[0].querySelector('.editorial-composition-copy')).position,
    columns:getComputedStyle(root.querySelector('.editorial-composition-grid')).gridTemplateColumns,
    filter:getComputedStyle(firstImg).filter};
  });
  assert.ok(compositionLayout.heights.every(h=>Math.abs(h-(width>800?132:146))<2),'Three compact photographic Composition cards');
  assert.equal(compositionLayout.photosPosition,'absolute','Composition images fill their cards instead of flowing into columns');
  assert.equal(compositionLayout.copyPosition,'absolute','Composition labels overlay photographs');
  if(width>800){
   assert.ok(compositionLayout.shelfWidth>1100,'Composition uses full editorial width, not obsolete 650px form: '+JSON.stringify(compositionLayout));
   assert.ok(compositionLayout.widths.every(w=>w>185),'Three balanced Composition options, no narrow image strips: '+JSON.stringify(compositionLayout));
  }
  if(width>800)assert.ok(compositionLayout.tops.every(t=>Math.abs(t-compositionLayout.tops[0])<1),'Desktop choices share one row');
  assert.match(compositionLayout.filter,/brightness\(0\.83\)/,'Composition photos are brighter');
  assert.equal(await page.locator('[data-cast-composition="mixed"]').isEnabled(),true,'Second model enables composition');
  assert.equal(await page.locator('#editorial-casting-controls').getAttribute('data-cast-state'),'group');
  const compositionPreview=await page.locator('[data-cast-composition="mixed"] .editorial-composition-art img').evaluateAll(images=>images.map(img=>img.currentSrc||img.src));
  const selectedCovers=await page.locator('#model-thumbs .editorial-model-cover img').evaluateAll(images=>images.map(img=>img.currentSrc||img.src));
  assert.deepEqual(compositionPreview,selectedCovers.slice(0,2),'Composition uses selected identities');
  await page.locator('#editorial-composition-toggle').click();
  assert.equal(await page.locator('#editorial-composition-toggle').getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('#editorial-composition-choices').isVisible(),false,'Composition folds');
  await page.locator('#editorial-composition-toggle').click();
  assert.equal(await page.locator('#editorial-composition-toggle').getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('#editorial-composition-choices').isVisible(),true);

  if(width>800){
   const addSize=await page.locator('#editorial-footer-cast .editorial-footer-add').evaluate(el=>el.getBoundingClientRect().width);
   assert.ok(addSize>=42&&addSize<=46,'Footer add control stays compact, never inherits the full CTA width: '+addSize);
  }
  await page.screenshot({path:'test-results/editorial/'+width+'-two-model-composition.png',fullPage:width===390});
  assert.equal(await page.locator('#model-selection-count').textContent(),'2 models selected');
  assert.equal(await page.locator('#editorial-footer-cast img').count(),2,'Footer shows the selected models');
  assert.equal(await page.locator('.editorial-footer-add').isVisible(),width>600,'Mobile upload stays in pinned tile');
  if(width<=600){
   const selectedPicker=page.waitForEvent('filechooser');
   await page.locator('#model-drop').click();await selectedPicker;
   assert.equal(await page.locator('#model-selection-count').textContent(),'2 models selected','Opening another upload retains the cast');
  }
  assert.equal(await page.locator('[data-cast-composition="mixed"]').getAttribute('aria-pressed'),'true','Mixed editorial is the default');
  await page.locator('[data-cast-composition="alternating"]').click();
  assert.equal(await page.locator('[data-cast-composition="alternating"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-cast-composition="together"]').click();
  assert.equal(await page.locator('[data-cast-composition="together"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-cast-composition="alternating"]').click();
  await page.locator('#casting-reference-gallery .atelier-reference').nth(1).click();
  await page.waitForFunction(()=>document.querySelectorAll('#model-thumbs .editorial-model-card').length===1);
  assert.equal(await page.locator('#editorial-casting-controls').isVisible(),true,'Composition stays when removing the second model');
   assert.equal(await page.locator('#editorial-casting-controls').getAttribute('data-cast-state'),'solo');
   assert.equal(await page.locator('[data-cast-composition="alternating"]').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('[data-cast-composition="alternating"]').isDisabled(),true);
   const remainingCover=await page.locator('#model-thumbs .editorial-model-cover img').first().getAttribute('src');
   const compositionImages=await page.locator('.editorial-composition-art img').evaluateAll(els=>els.map(img=>img.getAttribute('src')));
   assert.ok(compositionImages.every(src=>src===remainingCover),'Removed model is not retained in disabled Composition photos');
   // Saved Characters is a real source tab; one saved pack produces one person.
  await page.locator('#saved-character').click();
  await page.locator('#saved-character-gallery .editorial-saved-cast').first().waitFor();
  assert.equal(await page.locator('#editorial-saved-rail').isVisible(),true);
  assert.equal(await page.locator('#editorial-saved-prev').isDisabled(),true);
  assert.equal(await page.locator('#editorial-saved-next').isDisabled(),true);

  await page.locator('#saved-character-gallery .editorial-saved-cast').first().click();
  await page.waitForFunction(()=>document.querySelectorAll('#model-thumbs .editorial-model-card').length===2);
  assert.equal(await page.locator('[data-cast-composition="alternating"]').getAttribute('aria-pressed'),'true','Composition choice survives changes to the cast');
  await page.getByRole('button',{name:'Remove Test Actor'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('#model-thumbs .editorial-model-card').length===1);
  await page.locator('[data-source-view="casting"]').click();
  await page.locator('#step-next').click();assert.equal(await page.locator('#panel-style').isVisible(),true);
  const stylingLayout=await page.evaluate(()=>{
   const hero=document.querySelector('#panel-style .stage-visual').getBoundingClientRect();
   const cards=Array.from(document.querySelectorAll('#outfit-gallery .atelier-look'));
   const first=cards[0].getBoundingClientRect(),footer=document.querySelector('#step-footer').getBoundingClientRect();
   return {heroHeight:hero.height,firstCardTop:first.top,firstCardHeight:first.height,
    cardCount:cards.length,viewportHeight:innerHeight,footerPosition:getComputedStyle(document.querySelector('#step-footer')).position,
    footerBelowCards:footer.top>=first.bottom};
  });
  assert.equal(stylingLayout.cardCount,6,'Styling keeps six original photographic wardrobe cards');
  assert.equal(stylingLayout.footerBelowCards,true,'Action footer cannot hide wardrobe photographs');
  assert.notEqual(stylingLayout.footerPosition,'sticky','Styling action rail follows its content');
  if(width>800){
   assert.ok(stylingLayout.heroHeight<=267,'Styling has the same compact stage hero as Identity');
   assert.ok(stylingLayout.firstCardTop<stylingLayout.viewportHeight-100,'Wardrobe cards begin inside the first desktop viewport');
   assert.ok(stylingLayout.firstCardHeight>=290,'Wardrobe cards retain a taller portrait format');
  }
  await page.locator('#styling-direction').fill('Architectural black leather and natural tailoring.');
  await page.locator('#outfit-files').setInputFiles('lab/visuals/hero/pvlab-industrial-fashion-20261027.jpg');
  await page.locator('.stage-visual--style img').evaluate(img=>img.decode().catch(()=>{}));
  await page.screenshot({path:'test-results/editorial/'+width+'-styling.png',fullPage:width===390});
  await page.locator('#step-next').click();assert.equal(await page.locator('#panel-mood').isVisible(),true);
  const sceneCards=await page.locator('#direction-cards .direction-card').evaluateAll(cards=>cards.map(card=>({name:card.querySelector('span')?.textContent,atlas:card.classList.contains('direction-card-atlas'),background:getComputedStyle(card).backgroundImage,position:getComputedStyle(card).backgroundPosition})));
  assert.deepEqual(sceneCards.map(card=>card.name),['Studio','Brutalist','Desert','Interior','Abstract','Urban']);
  assert.ok(sceneCards.every(card=>card.atlas&&card.background.includes('environment-material-atlas-20261105.jpg')),'Six spaces use dedicated photographic frames');
  assert.equal(new Set(sceneCards.map(card=>card.position)).size,6,'No reused environment frame');
  const atlasResponse=await page.evaluate(async()=>{const r=await fetch('./visuals/editorial-directions/environment-material-atlas-20261105.jpg');return {ok:r.ok,type:r.headers.get('content-type')};});
  assert.equal(atlasResponse.ok,true,'Atlas asset loads locally');
  assert.equal(atlasResponse.type,'image/jpeg');
  await page.locator('[data-direction-tab="material"]').click();
  const materials=await page.locator('#direction-cards .direction-card').evaluateAll(cards=>cards.map(card=>({name:card.querySelector('span')?.textContent,atlas:card.classList.contains('direction-card-atlas'),position:getComputedStyle(card).backgroundPosition,img:card.querySelector('img')?.getAttribute('src')})));
  assert.deepEqual(materials.map(x=>x.name),['Black leather','Chrome & glass','Tailoring']);
  assert.equal(materials[0].atlas,true,'Leather is a material detail');
  assert.equal(materials[2].atlas,true,'Tailoring is a different material detail');
  assert.notEqual(materials[0].position,materials[2].position,'No repeated material frame');
  assert.equal(materials[1].img,'./visuals/studio-tools/video-liquid-dress.webp','Approved Chrome stays untouched');
  await page.locator('[data-direction-tab="location"]').click();
  await page.locator('.direction-card').first().click();
  assert.match(await page.locator('#direction-summary').textContent(),/Studio/);
  await page.locator('[data-direction-tab="moods"]').click();
  await page.locator('.direction-card').first().click();
  await page.locator('[data-direction-tab="location"]').click();
  assert.equal(await page.locator('.direction-card').first().getAttribute('aria-pressed'),'true','Location remains selected after switching category');
  await page.locator('#editorial-atmosphere').selectOption('analogue');
  await page.locator('.stage-visual--world img').evaluate(img=>img.decode().catch(()=>{}));
  await page.screenshot({path:'test-results/editorial/'+width+'-world.png',fullPage:width===390});
  await page.locator('#step-next').click();assert.equal(await page.locator('#panel-generate').isVisible(),true);
  assert.match(await page.locator('#review-model-text').textContent(),/1 model \/ 1 reference photo/);
  assert.match(await page.locator('#review-outfit-text').textContent(),/1 wardrobe reference/);
  if(width<=800){
   const layout=await page.evaluate(()=>{
    const rect=id=>document.getElementById(id).getBoundingClientRect();
    const heading=rect('settings-heading'),summary=document.querySelector('.selection-summary').getBoundingClientRect(),photo=document.querySelector('.atelier-review-photo').getBoundingClientRect(),action=rect('editorial-generate');
    return {headingTop:heading.top,summaryBottom:summary.bottom,photoAfterAction:photo.top>action.bottom,titleSize:parseFloat(getComputedStyle(document.getElementById('settings-heading')).fontSize),footerPosition:getComputedStyle(document.getElementById('step-footer')).position,rows:Array.from(document.querySelectorAll('.selection-item')).map(el=>({height:el.getBoundingClientRect().height,editHeight:el.querySelector('button').getBoundingClientRect().height}))};
   });
   assert.ok(layout.headingTop<160,'Phone begins with a compact functional heading');
   assert.ok(layout.summaryBottom<650,'All three reference summaries are visible near the top');
   assert.equal(layout.photoAfterAction,true,'Inspiration stays below the functional controls');
   assert.ok(layout.titleSize<=38,'Phone Generate heading is compact');
   assert.equal(layout.footerPosition,'static','Back cannot float over reference rows');
   for(const row of layout.rows){assert.ok(row.height>=80,'Reference rows have independent spacing');assert.ok(row.editHeight>=44,'Edit remains a usable phone target')}
   for(const id of ['review-model-text','review-outfit-text','review-location-text']){
    await page.locator('#'+id).scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#'+id).evaluate(el=>{const r=el.getBoundingClientRect(),footer=document.getElementById('step-footer').getBoundingClientRect();return r.bottom>footer.top&&r.top<footer.bottom}),false,'Back does not cover '+id);
   }
   await page.setViewportSize({width:320,height:900});
   const narrow=await page.locator('#ratio-options button').evaluateAll(buttons=>buttons.map(b=>({top:b.getBoundingClientRect().top,width:b.getBoundingClientRect().width})));
   assert.ok(narrow.every(b=>Math.abs(b.top-narrow[0].top)<1&&b.width>=44),'All five ratios remain separate usable targets on one row at 320 px');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No narrow-phone horizontal overflow');
   await page.screenshot({path:'test-results/editorial/320-phone-generate.png',fullPage:true});
   await page.setViewportSize({width,height:900});
   await page.locator('#settings-heading').scrollIntoViewIfNeeded();
  }

  await page.screenshot({path:'test-results/editorial/'+width+'-review.png',fullPage:width===390});
  const before=jobCount;
  await page.waitForFunction(()=>document.getElementById('editorial-cost').textContent==='140 credits');
  assert.equal(jobCount,before,'Automatic quote preparation never submits a paid job');
  assert.equal(await page.locator('#editorial-confirm').count(),0,'No duplicate confirmation dialog');
  assert.equal(await page.locator('#step-next').isVisible(),false,'No duplicate footer Generate/review action');
  assert.match(await page.locator('#editorial-generate').textContent(),/Generate editorial/);
  const generateDesign=await page.locator('#editorial-generate').evaluate(button=>{
   const r=button.getBoundingClientRect(),style=getComputedStyle(button);
   const arrow=button.querySelector('.editorial-final-cta-icon');
   return {height:r.height,radius:style.borderRadius,display:style.display,
    arrowWidth:arrow.getBoundingClientRect().width,
    label:button.querySelector('.editorial-final-cta-label strong')?.textContent};
  });
  assert.ok(generateDesign.height>=69,'Generate has a substantial touch target');
  assert.equal(generateDesign.radius,'3px','Generate is a sharp editorial rectangle, not a pill');
  assert.equal(generateDesign.display,'flex','Generate retains its accessible action layout');
  if(width>600)assert.ok(generateDesign.arrowWidth>=42,'Desktop action layout is unchanged');
  else assert.equal(generateDesign.arrowWidth,0,'Phone Generate is text-only without a decorative arrow');
  assert.equal(generateDesign.label,'Generate editorial');
  assert.equal(await page.locator('#editorial-generation-film').getAttribute('src'),null,'Film is not loaded during setup');
  // A delayed response for old settings must never re-enable a stale purchase.
  quoteDelay=350;
  await page.locator('.atelier-generate-advanced').evaluate(el=>el.open=true);
  const staleResponse=page.waitForResponse(r=>r.url().endsWith('/api/quotes'));
  await page.locator('#editorial-resolution').selectOption('2k');
  const staleRequest=page.waitForRequest(r=>r.url().endsWith('/api/quotes'));
  await staleRequest;
  await page.locator('#editorial-resolution').selectOption('1k');
  await staleResponse;
  await page.waitForFunction(()=>document.getElementById('editorial-cost').textContent==='140 credits'&&!document.getElementById('editorial-generate').disabled);
  quoteDelay=0;
  assert.equal(jobCount,before,'Changing settings only requotes');
  // Expiry refreshes the displayed price, without ever creating a job.
  quoteTTL=700;
  await page.locator('[data-ratio="4:3"]').click();
  await page.waitForFunction(()=>document.getElementById('editorial-cost').textContent==='140 credits');
  const expiringCount=quoteCount;quoteTTL=300000;
  await page.waitForFunction(n=>document.getElementById('editorial-cost').textContent==='Checking credits…',null,{timeout:4000});
  await page.waitForFunction(()=>document.getElementById('editorial-cost').textContent==='140 credits');
  assert.ok(quoteCount>expiringCount);assert.equal(jobCount,before);
  await page.locator('.atelier-generate-advanced').evaluate(el=>el.open=false);
  await page.screenshot({path:'test-results/editorial/'+width+'-direct-generate.png',fullPage:width===390});
  await page.locator('#editorial-generate').evaluate(button=>{button.click();button.click()});
  await page.locator('#panel-progress').waitFor({state:'visible'});
  assert.equal(await page.locator('#stage-navigation').isVisible(),false,'Wizard controls disappear during cinematic generation');
  assert.equal(await page.locator('#progress-results .generation-frame').count(),4,'Four photo frames are reserved while generating');
  assert.match(await page.locator('#generation-progress').textContent(),/Preparing your photographs|Creating your photographs|photographs ready/);
  await page.screenshot({path:'test-results/editorial/'+width+'-generating.png',fullPage:width===390});
  await page.locator('#editorial-results .result-card').last().waitFor({timeout:15000});
  assert.equal(await page.locator('#progress-results .generation-frame.is-ready').count(),4,'Actual photographs fill each reserved frame');
  assert.equal(await page.locator('#editorial-results .result-card').count(),4);
  assert.equal(new Set(quotedPrompts.slice(-4)).size,4,'Four distinct prompts generate four editorial compositions');
  await page.screenshot({path:'test-results/editorial/'+width+'-results.png',fullPage:width===390});
  assert.equal(jobCount,before+4,'Double-click submits exactly four individually bound jobs');
  const geometry=await page.evaluate(()=>({font:parseFloat(getComputedStyle(document.getElementById('results-heading')).fontSize),gap:document.getElementById('editorial-results').getBoundingClientRect().top-document.getElementById('panel-results').getBoundingClientRect().top}));
  assert.ok(geometry.font<=56,'Compact results title');assert.ok(geometry.gap<230,'Photos follow a compact results header');
  assert.equal(await page.locator('#editorial-generation-film').evaluate(video=>video.paused),true,'Film stops when results appear');
  await page.locator('#create-variations').click();
  await page.waitForFunction(()=>document.getElementById('editorial-cost').textContent==='140 credits');
  assert.match(await page.locator('#editorial-batch-note').textContent(),/^$/);
  assert.equal(jobCount,before+4,'Next batch waits for a new explicit Generate click');
  await page.locator('[data-count="12"]').click();
  await page.waitForFunction(()=>document.getElementById('editorial-cost').textContent==='140 credits');
  assert.match(await page.locator('#editorial-batch-note').textContent(),/Next 4 of 8/);
  // A network-ambiguous paid submission freezes further generation and is not retried.
  failSubmission=true;
  await page.locator('#editorial-generate').click();
  await page.waitForFunction(()=>document.getElementById('editorial-status').textContent.includes('Submission was not confirmed'));
  assert.equal(jobCount,before+5,'One failed submission, no automatic retry');
  await page.locator('#editorial-top-back').evaluate(button=>{button.click();button.click()});
  assert.equal(await page.locator('#editorial-generate').isDisabled(),true,'Uncertain submission blocks another purchase');
  failSubmission=false;
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  assert.equal(overflow,false,'Full Editorial has no horizontal overflow at '+width);
  assert.deepEqual(errors,[],'No browser errors at '+width);
  await page.close();
 }
 // Guest mobile header keeps Sign in visible and billing/account reachable in the menu.
 {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const beforeGuest={uploads:uploadCount,jobs:jobCount,quotes:quoteCount};
  await page.route('**/native-account.js*',route=>route.fulfill({contentType:'text/javascript',body:"export async function loadLabAccount(){return {isSignedIn:false,session:null,addListener(){},openSignIn(){}}}"}));
  await page.goto('http://127.0.0.1:4179/lab/full-editorial.html?start=1',{waitUntil:'domcontentloaded'});
  await page.locator('#editorial-signin').waitFor({state:'visible'});
  assert.equal(await page.locator('.editorial-account .credits-link').isVisible(),false);
  assert.equal(await page.locator('.editorial-account .editorial-avatar').isVisible(),false);
  await page.locator('#editorial-mobile-menu').click();
  assert.equal(await page.locator('#editorial-menu-credits').isVisible(),true);
  assert.equal(await page.locator('#editorial-menu-account').isVisible(),true);
  const menuGap=await page.evaluate(()=>document.querySelector('#editorial-primary-nav').getBoundingClientRect().top-document.querySelector('.editorial-header').getBoundingClientRect().bottom);
  assert.ok(Math.abs(menuGap)<=1,'Mobile menu meets the compact header without a gap');
  await page.locator('#editorial-mobile-menu').click();
  await page.locator('#casting-reference-gallery img').first().evaluate(img=>img.decode());
  await page.screenshot({path:'test-results/editorial/390-guest-casting.png'});
  assert.deepEqual({uploads:uploadCount,jobs:jobCount,quotes:quoteCount},beforeGuest);
  await page.close();
 }
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const beforeEntry={uploads:uploadCount,jobs:jobCount,quotes:quoteCount};
  await page.goto('http://127.0.0.1:4179/lab/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#featured-editorial .pv-feature-button').click();
  await page.locator('#editorial-flow').waitFor({state:'visible'});
  assert.equal(await page.locator('#panel-model').isVisible(),true,'Homepage CTA opens Identity directly');
  assert.equal(await page.locator('#model-thumbs .editorial-model-card').count(),0,'Homepage also opens with an empty cast');
  assert.equal(await page.locator('#editorial-casting-controls').isVisible(),true,'Homepage Identity exposes Composition with disabled choices');
  assert.equal(await page.locator('#editorial-casting-controls').getAttribute('data-cast-state'),'empty');
  assert.equal(await page.locator('[data-cast-composition="together"]').isDisabled(),true,'Not selectable until two models');
  assert.equal(await page.locator('#editorial-hero').isVisible(),false,'No second arrival hero');
  assert.equal(new URL(page.url()).searchParams.has('start'),false,'Entry flag is consumed');
  assert.equal(await page.locator('[data-source-view="casting"]').getAttribute('aria-pressed'),'true','Casting remains the initial source');
  assert.deepEqual({uploads:uploadCount,jobs:jobCount,quotes:quoteCount},beforeEntry,'Opening Identity performs no paid preparation or generation');
  await page.locator('#editorial-top-back').click();
  assert.equal(await page.locator('#editorial-hero').isVisible(),true,'Direct entry retains Back to the arrival hero');
  await page.close();
 }
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.goto('http://127.0.0.1:4179/lab/index.html',{waitUntil:'domcontentloaded'});
  const startUploads=uploadCount,startJobs=jobCount,startQuotes=quoteCount;
  const mockPhotos=Array.from({length:7},(_,i)=>({name:'character-'+i+'.jpg',mimeType:'image/jpeg',buffer:image}));
  const uploadsBeforePicker=uploadCount;const picker=page.waitForEvent('filechooser');
  await page.locator('.lab-character-home__prompt').click();
  await (await picker).setFiles(mockPhotos.slice(0,3));
  assert.equal(await page.locator('#home-model-count').textContent(),'3/8','Clicking the card selects multiple photos without redirect');
  assert.equal(await page.locator('#home-model-thumbs .lab-character-home__thumb').count(),3);
  assert.ok(page.url().endsWith('/lab/index.html'),'Collect multiple views on the homepage before continuing');
  // Simulate a real external file drag/drop, independently of the native picker.
  await page.locator('#home-model-dropzone').evaluate(zone=>{
   const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg=='),c=>c.charCodeAt(0));
   const dt=new DataTransfer();dt.items.add(new File([bytes],'dropped.png',{type:'image/png'}));
   zone.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt}));
   zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));
  });
  assert.equal(await page.locator('#home-model-count').textContent(),'4/8','Drop appends to earlier picker photos');
  const firstCover=await page.locator('#home-model-cover').getAttribute('src');
  await page.locator('.lab-character-home__thumb-select').nth(2).click();
  assert.notEqual(await page.locator('#home-model-cover').getAttribute('src'),firstCover,'Tap/click a thumbnail to make it primary');
  const another=page.waitForEvent('filechooser');
  await page.locator('.lab-character-home__plus').click();
  await (await another).setFiles(mockPhotos.slice(3));
  assert.equal(await page.locator('#home-model-count').textContent(),'8/8');
  assert.equal(await page.locator('#home-model-thumbs .lab-character-home__thumb').count(),8);
  await page.locator('.lab-character-home__plus').click();
  assert.match(await page.locator('#home-model-status').textContent(),/8\/8/,'Maximum is explained in the card');
  assert.equal(uploadCount,startUploads,'Selecting all eight stays local');
  assert.equal(jobCount,startJobs);assert.equal(quoteCount,startQuotes);
  await page.locator('.lab-character-home__action').click();
  await page.waitForURL('**/full-editorial.html**');
  await page.locator('#model-thumbs img').first().waitFor({state:'visible'});
  assert.equal(await page.locator('#panel-model').isVisible(),true,'Explicit Create opens Identity directly');
  assert.equal(await page.locator('#editorial-hero').isVisible(),false,'Arrival hero is skipped');
  assert.equal(await page.locator('[data-source-view="casting"]').getAttribute('aria-pressed'),'true','Uploaded photos appear within the same casting workflow');
  assert.equal(await page.locator('#model-thumbs .editorial-model-card').count(),1,'Eight views are one selected character');
  assert.equal(await page.locator('#model-thumbs .editorial-model-extra-thumb').count(),7,'All eight reference photos arrive in order');
  assert.equal(new URL(page.url()).searchParams.has('modelPhoto'),false,'Consumed token removed from URL');
  await page.locator('#step-next').click();
  assert.equal(await page.locator('#panel-style').isVisible(),true,'Loaded model satisfies Identity');
  await page.locator('#step-back').click();
  assert.equal(await page.locator('#model-thumbs .editorial-model-extra-thumb').count(),7,'Back retains every view');
  assert.equal(uploadCount,startUploads,'Transfer stays local until explicit credit review');
  assert.equal(jobCount,startJobs);assert.equal(quoteCount,startQuotes);
  await page.close();
 }
 console.log('PASS Full Editorial 1440/390 steps, uploads, inline live quote, stale/expired quote guards, one-click batch, no ambiguous retries, real result assets and overflow');
}finally{await browser.close();server.close()}
