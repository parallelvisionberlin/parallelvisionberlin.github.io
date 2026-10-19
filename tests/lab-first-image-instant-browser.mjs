// One-click first-image test with synthetic login, mocked quotes and zero paid providers.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const start=source.indexOf('try{clerk=await loadLabAccount();');
const end=source.indexOf('\n',start);
assert.ok(start>=0&&end>start);
const mock=source.slice(0,start)+source.slice(end+1)+`
clerk={isSignedIn:true,user:{id:'welcome-mock'},session:{id:'welcome-session',getToken:async()=> 'synthetic-token'}};
owner=true;customerMode=true;customerGenerationReady=true;userId='welcome-mock';
config={enabled:true,configured:true,geminiEnabled:true,falEnabled:true,higgsfieldEnabled:false,
  concurrency:{image:4,video:1}};
wallet.connect({customer:true,balanceCredits:200,billingReady:true,products:[]});
$('app').hidden=false;$('gate').hidden=true;
setTool('image');
await loadHistory();
showWelcomeStart({customer:true,generationReady:true,balanceCredits:200,accountClosed:false,billingReview:false});
finishLabBoot();
update();
// Test-only trigger for transitioning from an empty customer welcome to
// one saved image without making any paid request or changing production APIs.
window.__welcomeMockGalleryChanged=()=>syncImageGalleryEmpty();
window.__welcomeMockInspiration=open=>setMoodDiscoveryOpen(open);
window.__welcomeMockReady=true;
`;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[extname(file)]||'text/plain');
  res.end(pathname==='/lab/lab.js'?mock:readFileSync(file));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1536,height:864}});
const page=await context.newPage(),api='https://parallel-vision-lab.parallelvision.workers.dev';
const errors=[],requests=[],quotes=new Map();let seq=1,submissions=0;
const id=()=> '30000000-0000-4000-8000-'+String(seq++).padStart(12,'0');
page.on('pageerror',error=>errors.push(error.message));
await context.route('https://**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(!url.href.startsWith(api))return route.abort();
  const path=url.pathname,data=request.headers()['content-type']?.includes('application/json')?request.postDataJSON():{};
  requests.push({path,method:request.method(),data});
  const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/api/jobs'&&request.method()==='GET')return send({jobs:[],activeJobs:[],next:null,concurrency:{image:4,video:1}});
  if(path==='/api/packs')return send({packs:[]});
  if(path==='/api/soul-pro/identity')return send({configured:false,count:0,refs:[]});
  if(path==='/api/uploads')return send({id:id()},201);
  if(path==='/api/quotes'){
    await new Promise(done=>setTimeout(done,1400));
    // Model resolution must flow all the way into the bound provider quote.
    const twoK=data.settings.resolution==='2k',cost=twoK?.06:.04;
    const quote={id:id(),provider:'SpicyAPI',settings:{...data.settings,type:'image',mode:'image'},
      maxUsd:cost,estimatedUsd:cost,creditCost:twoK?30:20,expiresAt:Date.now()+180000};
    quotes.set(quote.id,quote);
    return send(quote);
  }
  if(path==='/api/jobs'&&request.method()==='POST'){
    assert.equal(data.confirm,true);
    assert.ok(quotes.has(data.quoteId),'One-click must use an authenticated bound price');
    submissions++;
    await new Promise(done=>setTimeout(done,300));
    return send({job:{id:id(),status:'queued',createdAt:Date.now(),
      settings:quotes.get(data.quoteId).settings,estimatedUsd:.04}},202);
  }
  if(path==='/api/customer/image-price')return send({kind:'server-estimate',source:'backend-model-rate',
    credits:25,count:1,expiresAt:Date.now()+120000});
  return send({error:'Unmocked '+path},404);
});
try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=image',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__welcomeMockReady===true,undefined,{timeout:20000});
  assert.equal(await page.locator('#lab-welcome-start').isVisible(),true);
  assert.equal(await page.locator('.lab-welcome-preset[aria-pressed="true"]').count(),0,
    'No card should claim selection before the user selects it');
  const button=page.locator('#image-composer-generate');
  const deck=page.locator('#image-composer');
  const field=page.locator('#image-composer-prompt');
  await page.waitForFunction(()=>document.querySelector('#image-composer')?.classList.contains('pv-editorial-deck'));
  assert.equal(await deck.evaluate(el=>el.classList.contains('pv-deck-expanded')),false,
    'Empty Image deck must start collapsed, like the approved compact reference');
  assert.equal(await deck.evaluate(el=>getComputedStyle(el).display),'grid',
    'Desktop welcome keeps one true Image composer, using a grid instrument');
  const idleLayout=await page.evaluate(()=>{
    const get=s=>document.querySelector(s).getBoundingClientRect();
    const dock=get('#image-composer'),prompt=get('#image-composer-prompt'),
      controls=get('#image-composer .composer-controls'),
      generate=get('#image-composer-generate');
    return {height:dock.height,bottom:dock.bottom,
      promptRight:prompt.right,controlsLeft:controls.left,controlsRight:controls.right,
      generateLeft:generate.left,generateRight:generate.right,
      rows:getComputedStyle(document.querySelector('#image-composer')).gridTemplateRows,
      viewportWidth:innerWidth,documentWidth:document.documentElement.scrollWidth};
  });
  assert.ok(idleLayout.height>=70&&idleLayout.height<=78,
    'Empty Image welcome starts as a restrained single-row, ~74px deck: '+JSON.stringify(idleLayout));
  assert.ok(idleLayout.promptRight<=idleLayout.controlsLeft+2 &&
    idleLayout.controlsRight<=idleLayout.generateLeft+2,
    'Compact prompt, controls and Generate must sit side by side without overlap: '+JSON.stringify(idleLayout));
  assert.ok(idleLayout.generateRight<=idleLayout.viewportWidth-12 &&
    idleLayout.documentWidth<=idleLayout.viewportWidth+3,
    'Compact deck must not introduce horizontal overflow: '+JSON.stringify(idleLayout));
  const initialDeck=await deck.boundingBox();
  const availableWidth=await page.evaluate(()=>document.documentElement.clientWidth);
  const centerError=Math.abs(initialDeck.x+initialDeck.width/2-availableWidth/2);
  assert.ok(centerError<18,
    'The restored Image deck must stay horizontally centered: '+
      JSON.stringify({initialDeck,availableWidth,centerError}));
  assert.ok(Math.abs(864-initialDeck.y-initialDeck.height)<32,
    'The first-image deck must be fixed at the bottom, never floated above the Moods: '+
      JSON.stringify(initialDeck));
  assert.equal(await page.locator('#app').evaluate(el=>el.classList.contains('pv-welcome-deck-resting')),false,
    'No welcome floating state may move the cards or hide image controls');
  assert.equal(await page.locator('#image-composer-resolution-wrap').isVisible(),true,
    'Resolution is available on the initial bottom-locked deck');
  const emptyPriceButton=await button.evaluate(el=>{
    const rect=el.getBoundingClientRect();
    const label=el.querySelector('.composer-generate-label').getBoundingClientRect();
    const pricePseudo=getComputedStyle(el,'::after');
    return {price:el.dataset.credits||'',centerX:label.x+label.width/2-rect.x-rect.width/2,
      centerY:label.y+label.height/2-rect.y-rect.height/2,
      pseudoContent:pricePseudo.content,pseudoDisplay:pricePseudo.display};
  });
  assert.equal(emptyPriceButton.price,'','Initial welcome has no quoted price before typing');
  assert.ok(Math.abs(emptyPriceButton.centerX)<1.5&&Math.abs(emptyPriceButton.centerY)<1.5,
    'Generate lettering must be precisely centered when no price is available: '+JSON.stringify(emptyPriceButton));
  assert.ok(emptyPriceButton.pseudoContent==='none'||emptyPriceButton.pseudoDisplay==='none',
    'Empty credit placeholder must not offset the Generate label: '+JSON.stringify(emptyPriceButton));
  const welcomeSurface=await page.evaluate(()=>{
    const shell=document.querySelector('.image-gallery-shell'),footer=document.querySelector('body>footer.pv-lab-footer');
    const backdrop=getComputedStyle(shell,'::before');
    return {
      shellHeight:shell.getBoundingClientRect().height,
      backgroundHeight:parseFloat(backdrop.height),
      opacity:backdrop.opacity,
      filter:backdrop.filter,
      image:backdrop.backgroundImage,
      gradient:getComputedStyle(shell,'::after').backgroundImage,
      footer:getComputedStyle(footer).display,
      documentHeight:document.documentElement.scrollHeight,
      viewportHeight:innerHeight,
      overflow:getComputedStyle(document.documentElement).overflowY
    };
  });
  assert.equal(welcomeSurface.footer,'none',
    'Empty Image Studio must not scroll into the marketing/footer sections');
  assert.equal(welcomeSurface.overflow,'hidden',
    'First-image welcome should be a single non-scrolling desktop viewport');
  assert.ok(welcomeSurface.documentHeight<=welcomeSurface.viewportHeight+3,
    'The empty Image Studio must have no unwanted lower section: '+JSON.stringify(welcomeSurface));
  assert.ok(Math.abs(welcomeSurface.backgroundHeight-welcomeSurface.shellHeight)<3,
    'The photographic background must cover the full welcome viewport: '+JSON.stringify(welcomeSurface));
  assert.ok(Number(welcomeSurface.opacity)>=.99 && welcomeSurface.filter==='none',
    'Clean blue/copper plate must not have a heavily blurred saturation filter: '+JSON.stringify(welcomeSurface));
  assert.ok(welcomeSurface.image.includes('pvlab-subtle-cinematic-background-20261017.webp'),
    'Welcome must use its own clean 01/Subtle & Cinematic backdrop, not a complete UI screenshot');
  assert.ok(existsSync(resolve(root,'lab/visuals/pvlab-subtle-cinematic-background-20261017.webp')),
    'The clean background asset must ship with the deployed site');
  const moodCard=page.locator('[data-welcome-mood="dream-blur"]');
  const idleShadow=await moodCard.evaluate(el=>getComputedStyle(el).boxShadow);
  const oldMoodGeometry=await moodCard.evaluate(el=>{
    const card=el.getBoundingClientRect(),image=el.querySelector('img').getBoundingClientRect();
    return {cardX:card.x,cardY:card.y,cardW:card.width,cardH:card.height,
      imageX:image.x,imageY:image.y,imageW:image.width,imageH:image.height};
  });
  await moodCard.hover();
  await page.waitForTimeout(270);
  const hovered=await moodCard.evaluate(el=>{
    const card=el.getBoundingClientRect(),image=el.querySelector('img').getBoundingClientRect();
    return {cardX:card.x,cardY:card.y,cardW:card.width,cardH:card.height,
      imageX:image.x,imageY:image.y,imageW:image.width,imageH:image.height,
      cardTransform:getComputedStyle(el).transform,
      imageTransform:getComputedStyle(el.querySelector('img')).transform,
      boxShadow:getComputedStyle(el).boxShadow};
  });
  for(const key of Object.keys(oldMoodGeometry))
    assert.ok(Math.abs(oldMoodGeometry[key]-hovered[key])<1,
      'Mood hover must not zoom or lift photographs: '+JSON.stringify({key,oldMoodGeometry,hovered}));
  assert.equal(hovered.cardTransform,'none');
  assert.equal(hovered.imageTransform,'none');
  assert.notEqual(hovered.boxShadow,idleShadow,
    'Mood hover keeps a thin feedback border without image animation');
  assert.ok(!hovered.boxShadow.includes('0.87')&&!hovered.boxShadow.includes('0.33'),
    'The earlier overbright halo must be removed: '+hovered.boxShadow);
  await page.mouse.move(2,2);
  assert.equal(await page.locator('.lab-welcome-preset').count(),7,
    'All six original welcome cards and Chrome Couture remain mounted');
  // An empty CUSTOMER Image welcome has no selectable image jobs.
  // Do not advertise History Select or expose a useless "0 selected" toolbar.
  assert.equal(await page.locator('#history-select').isVisible(),false,
    'An empty customer welcome hides Select until an image actually exists');
  assert.equal(await page.locator('#history-selection').isVisible(),false);
  const welcomePosition=await page.locator('#lab-welcome-title').evaluate(el=>el.getBoundingClientRect().top);
  // A stale programmatic click cannot force the selection overlay back open.
  await page.locator('#history-select').dispatchEvent('click');
  assert.equal(await page.locator('#history-selection').isVisible(),false,
    'Empty customer selection is guarded in JavaScript, not just hidden by CSS');
  assert.equal(await page.locator('#history-select').isVisible(),false);
  assert.ok(Math.abs((await page.locator('#lab-welcome-title').evaluate(el=>el.getBoundingClientRect().top))-welcomePosition)<2,
    'Trying Select on an empty customer gallery must not move welcome content');
  // Discreet Mode remains a separate user-visible control, available even
  // before the customer's first image and unaffected by selection changes.
  const eye=page.locator('#history-preview-toggle');
  await eye.click();
  assert.equal(await eye.getAttribute('aria-pressed'),'true',
    'Customer can independently activate Discreet Mode');
  assert.equal(await page.locator('#history-selection').isVisible(),false);
  await eye.click();
  assert.equal(await eye.getAttribute('aria-pressed'),'false',
    'Customer can return to the same seven-look welcome');
  assert.equal(await page.locator('#history-select').isVisible(),false);
  const cardY=await page.locator('.lab-welcome-preset').first().evaluate(el=>el.getBoundingClientRect().top+window.scrollY);
  await field.click();
  assert.equal(await deck.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
    'Clicking the prompt opens its multi-line editor');
  await page.waitForFunction(()=>document.querySelector('#image-composer').getBoundingClientRect().height>105);
  assert.ok(await deck.evaluate(el=>el.getBoundingClientRect().height)>idleLayout.height+30,
    'The same bottom-fixed compact deck must become the full editing deck after first focus');
  await field.fill(('Realistic editorial atmosphere and tactile photographic details. ').repeat(18));
  // The editorial deck intentionally animates its height over 230ms.
  // Wait for that expansion before asserting the final readable geometry.
  await page.waitForFunction(()=>document.getElementById('image-composer-prompt')
    ?.getBoundingClientRect().height>=100,null,{timeout:3000});
  const expanded=await page.evaluate(()=>{
    const field=document.getElementById('image-composer-prompt');
    const deck=document.getElementById('image-composer');
    const prompt=field.getBoundingClientRect(),controls=deck.querySelector('.composer-controls').getBoundingClientRect();
    const generate=document.getElementById('image-composer-generate').getBoundingClientRect();
    return {promptHeight:prompt.height,promptScrollHeight:field.scrollHeight,promptClientHeight:field.clientHeight,
      controlsTop:controls.top,promptBottom:prompt.bottom,generateBottom:generate.bottom,
      viewportHeight:innerHeight,deckHeight:deck.getBoundingClientRect().height};
  });
  assert.ok(expanded.promptHeight>=100&&expanded.promptHeight<=190,
    'Expanded prompt remains scrollable without taking over the gallery: '+JSON.stringify(expanded));
  assert.ok(expanded.promptScrollHeight>expanded.promptClientHeight,
    'Long prompts must scroll inside the textarea rather than enlarge the entire deck');
  assert.ok(expanded.controlsTop>=expanded.promptBottom-3,
    'Image controls remain attached below the expanded prompt: '+JSON.stringify(expanded));
  assert.ok(expanded.generateBottom<=expanded.viewportHeight,
    'Generate must remain visible when typing long prompts: '+JSON.stringify(expanded));
  const enteredText=await field.inputValue();
  await page.locator('[data-welcome-mood="hong-kong-nights"]').click();
  assert.equal(await deck.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
    'Choosing a Mood keeps the opened deck permanently expanded after blur');
  const bottomAfterMood=await deck.boundingBox();
  assert.ok(Math.abs(864-bottomAfterMood.y-bottomAfterMood.height)<32,
    'The engaged deck remains fixed at the same bottom edge after Mood selection');
  const newCardY=await page.locator('.lab-welcome-preset').first().evaluate(el=>el.getBoundingClientRect().top+window.scrollY);
  assert.ok(Math.abs(newCardY-cardY)<8,
    'Opening the docked deck must keep the six Mood cards stable in document coordinates: '+
      JSON.stringify({cardY,newCardY,delta:newCardY-cardY,scrollY:await page.evaluate(()=>scrollY)}));
  assert.equal((await field.inputValue()).trimEnd(),enteredText.trimEnd(),'Selecting a Mood preserves the user text');
  assert.equal(await page.locator('#image-composer-resolution').inputValue(),'1k',
    'Applying a Mood to existing customer text does not override image resolution');
  assert.equal(await button.isEnabled(),true,'Green Haze must enable Generate in the same click');
  await page.locator('[data-welcome-mood="dream-blur"]').click();
  assert.equal((await field.inputValue()).trimEnd(),enteredText.trimEnd(),'Changing Moods preserves the user text');
  assert.equal(await page.locator('#image-composer-resolution').inputValue(),'1k',
    'Switching Moods preserves a compatible current resolution');
  assert.doesNotMatch(await button.getAttribute('data-credits')||'',/Confirming credits/i,
    'The preflight must not put Confirming credits inside Generate');
  assert.equal(await deck.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
    'Switching selected Moods must not collapse the Image deck');
  // The previous Mood's asynchronous bound price may still be settling.
  // Wait for the new Mood's preflight before submitting the single paid job.
  await page.waitForFunction(()=>!document.querySelector('#image-composer-generate')?.disabled,null,{timeout:9000});
  assert.equal(await button.isEnabled(),true,'Dream Blur must become ready without a second click');
  const heightBefore=await button.evaluate(el=>el.getBoundingClientRect().height);
  await button.click();
  assert.equal(await button.isDisabled(),true,'Second click is disabled until the first request is confirmed');
  await page.waitForFunction(()=>document.querySelector('#image-composer-status')?.textContent.includes('Preparing'),undefined,{timeout:15000});
  const timeout=Date.now()+25000;
  while(submissions<1&&Date.now()<timeout)await new Promise(done=>setTimeout(done,60));
  assert.equal(submissions,1,'One click must create exactly one paid job');
  assert.equal(requests.filter(x=>x.path==='/api/jobs'&&x.method==='POST').length,1);
  const submission=requests.find(x=>x.path==='/api/jobs'&&x.method==='POST');
  assert.equal(quotes.get(submission.data.quoteId)?.settings.resolution,'1k',
    'Paid submission must reuse the exact customer resolution from its bound quote');
  assert.equal(quotes.get(submission.data.quoteId)?.creditCost,20,
    'Mock credit cost must come from the 1K bound quote without repricing');
  assert.equal(requests.filter(x=>x.path==='/api/quotes').length>=1,true);
  assert.ok(quotes.size>=1);
  assert.equal(await deck.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
    'Submitting Generate must preserve the open editing deck');
  assert.equal(await button.evaluate(el=>el.getBoundingClientRect().height),heightBefore,
    'Generate dimensions must not change while checking price or submitting');
  // Simulate the first result becoming visible, without a paid provider call.
  // After the first result, History regains natural vertical scrolling.
  // The marketing footer remains outside Image Studio in both views.
  const historyRelease=await page.evaluate(()=>{
    document.getElementById('lab-welcome-start').hidden=true;
    document.getElementById('image-gallery-empty').hidden=true;
    const history=document.getElementById('history');
    const thumb=document.createElement('article');
    thumb.className='card';thumb.dataset.kind='image';thumb.dataset.deletable='true';
    history.append(thumb);
    window.__welcomeMockGalleryChanged();
    return {footer:getComputedStyle(document.querySelector('body>footer.pv-lab-footer')).display,
      overflow:getComputedStyle(document.documentElement).overflowY};
  });
  assert.equal(historyRelease.footer,'none',
    'Populated Image History must not expose the marketing footer');
  assert.notEqual(historyRelease.overflow,'hidden',
    'After first-image transition, the cascading gallery scroll is restored');
  assert.equal(await page.locator('#history-select').isVisible(),true,
    'After the first saved image, the customer gains the normal History Select action');
  await page.locator('#history-select').click();
  assert.equal(await page.locator('#history-selection').isVisible(),true);
  assert.notEqual(await page.locator('.image-gallery-shell').evaluate(el=>getComputedStyle(el).display),'grid',
    'Populated History retains its existing selection flow, never the welcome-only grid');
  await page.locator('#history-cancel-select').click();
  assert.equal(await page.locator('#history-selection').isVisible(),false);
  // The same six Mood cards reappear through Inspiration after a real History
  // result. Their background must be identical to the original welcome.
  await page.evaluate(()=>window.__welcomeMockInspiration(true));
  assert.equal(await page.locator('#lab-welcome-start').isVisible(),true);
  const inspirationSurface=await page.locator('.image-gallery-shell').evaluate(shell=>{
    const back=getComputedStyle(shell,'::before');
    const overlay=getComputedStyle(shell,'::after');
    return {image:back.backgroundImage,opacity:back.opacity,
      filter:back.filter,gradient:overlay.backgroundImage};
  });
  assert.equal(inspirationSurface.image,welcomeSurface.image,
    'Inspiration must use the same blue/copper background as first-image welcome');
  assert.equal(inspirationSurface.filter,'none','Inspiration must not restore the saturated/blurred wallpaper');
  assert.equal(inspirationSurface.opacity,'1');
  assert.equal(inspirationSurface.gradient,welcomeSurface.gradient,
    'Inspiration and welcome must use the same legibility overlay');
  const inspirationArrows=page.locator('.lab-welcome-carousel .inspiration-nav');
  await page.locator('.lab-welcome-carousel .inspiration-nav-next').waitFor({state:'visible'});
  const inspirationViewport=await page.evaluate(()=>{
    const prev=document.querySelector('.lab-welcome-carousel .inspiration-nav-prev');
    const next=document.querySelector('.lab-welcome-carousel .inspiration-nav-next');
    const track=document.getElementById('lab-welcome-presets');
    return {footer:getComputedStyle(document.querySelector('body>footer.pv-lab-footer')).display,
      viewportHeight:innerHeight,documentHeight:document.documentElement.scrollHeight,
      viewportWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,
      verticalOverflow:getComputedStyle(document.documentElement).overflowY,
      prevDisabled:prev.disabled,nextDisabled:next.disabled,
      controlsConnected:prev.getAttribute('aria-controls')===track.id&&next.getAttribute('aria-controls')===track.id};
  });
  assert.equal(inspirationViewport.footer,'none','Inspiration must not reveal the marketing footer');
  assert.equal(inspirationViewport.verticalOverflow,'hidden','Inspiration remains a static desktop workspace');
  assert.ok(inspirationViewport.documentHeight<=inspirationViewport.viewportHeight+3,
    'Inspiration must not add a second vertical section: '+JSON.stringify(inspirationViewport));
  assert.ok(inspirationViewport.documentWidth<=inspirationViewport.viewportWidth+3,
    'Inspiration background and cards must not create document horizontal scrolling: '+JSON.stringify(inspirationViewport));
  assert.equal(await inspirationArrows.count(),2,'A gallery has left and right controls');
  assert.ok(inspirationViewport.controlsConnected&&inspirationViewport.prevDisabled&&!inspirationViewport.nextDisabled,
    'Left arrow is visible but disabled at the start; next is actionable: '+JSON.stringify(inspirationViewport));
  await page.locator('.lab-welcome-carousel .inspiration-nav-next').click();
  await page.waitForFunction(()=>document.getElementById('lab-welcome-presets').scrollLeft>30);
  assert.equal(await page.locator('.lab-welcome-carousel .inspiration-nav-prev').isEnabled(),true);
  await page.locator('.lab-welcome-carousel .inspiration-nav-prev').click();
  await page.waitForFunction(()=>document.getElementById('lab-welcome-presets').scrollLeft<4);

  // Discreet Mode is a distinct intentional backdrop and must win over the
  // Inspiration artwork while images are hidden.
  await page.locator('#history-preview-toggle').click();
  const privateBackground=await page.locator('.image-gallery-shell').evaluate(shell=>getComputedStyle(shell,'::before').backgroundImage);
  assert.match(privateBackground,/open-atmosphere-hd\.jpg/,
    'Discreet Mode keeps the original private-preview background');
  await page.locator('#history-preview-toggle').click();
  await page.evaluate(()=>window.__welcomeMockInspiration(false));
  assert.equal(await page.locator('#history').isVisible(),true,
    'Returning to populated History must restore the actual gallery');
  // Mobile regression: Inspiration must not appear below an empty, viewport-sized History.
  await page.setViewportSize({width:390,height:844});
  const mobileInspire=await page.locator('#history-moods-toggle').evaluate(button=>({
    width:button.getBoundingClientRect().width,
    visible:button.getBoundingClientRect().height>0,
    label:getComputedStyle(button.querySelector('.mood-view-label'),'::after').content
  }));
  assert.ok(mobileInspire.visible&&mobileInspire.width>=72,
    'Mobile History keeps an identifiable Inspiration button: '+JSON.stringify(mobileInspire));
  assert.equal(mobileInspire.label,'"Inspire"','The mobile sparkle carries its visible Inspire label');
  await page.locator('#history-moods-toggle').click();
  assert.equal(await page.locator('#lab-welcome-start').isVisible(),true);
  const mobileDiscovery=await page.evaluate(()=>{
    const r=id=>document.querySelector(id).getBoundingClientRect();
    return {
      headBottom:r('.image-studio .archivehead').bottom,
      welcomeTop:r('#lab-welcome-start').top,
      cardTop:r('#lab-welcome-start .lab-welcome-preset').top,
      dockTop:r('#image-composer').top,
      archivePadding:getComputedStyle(document.querySelector('.image-studio .archive')).paddingBottom,
      selectHidden:getComputedStyle(document.getElementById('history-select')).display==='none',
      refreshHidden:getComputedStyle(document.getElementById('refresh')).display==='none'
    };
  });
  if(mobileDiscovery.archivePadding!=='0px'){
    const inspect=await page.evaluate(()=>{
      const app=document.getElementById('app'),archive=document.querySelector('.image-studio .archive');
      const css=Array.from(document.styleSheets).find(s=>s.href?.includes('image-moods-return.css'));
      return {appClass:app.className,selectorMatch:archive.matches('#app.image-studio-active.pv-moods-discovery-open .image-studio .archive'),
        rect:archive.getBoundingClientRect().toJSON(),cssLoaded:!!css,cssHref:css?.href,
        open:!document.getElementById('lab-welcome-start').hidden,
        selectStyle:getComputedStyle(document.getElementById('history-select')).display,
        pointer:document.elementFromPoint(93,104)?.outerHTML?.slice(0,180)};
    });
    console.log('CHROME_INSPIRATION_DIAGNOSTIC',JSON.stringify(inspect),JSON.stringify(mobileDiscovery));
  }
  assert.equal(mobileDiscovery.archivePadding,'0px','Moods cannot retain History bottom spacer');
  assert.ok(mobileDiscovery.welcomeTop-mobileDiscovery.headBottom>=-5&&
    mobileDiscovery.welcomeTop-mobileDiscovery.headBottom<65,
    'Inspiration heading follows the toolbar without a black viewport: '+JSON.stringify(mobileDiscovery));
  assert.ok(mobileDiscovery.cardTop<mobileDiscovery.dockTop,
    'The first Mood images must be immediately visible above the floating composer: '+JSON.stringify(mobileDiscovery));
  assert.ok(mobileDiscovery.selectHidden&&mobileDiscovery.refreshHidden,
    'Hidden History cannot offer unusable Select or Refresh controls');
  const mobileSurface=await page.evaluate(()=>{
    const shell=document.querySelector('.image-gallery-shell');
    const archive=shell.querySelector('.image-gallery-host > .archive');
    const welcome=shell.querySelector('#image-gallery-empty');
    const backdrop=getComputedStyle(shell,'::before');
    return {shellHeight:shell.getBoundingClientRect().height,
      contentHeight:archive.getBoundingClientRect().height+welcome.getBoundingClientRect().height,
      minHeight:getComputedStyle(shell).minHeight,
      backgroundImage:backdrop.backgroundImage,
      backgroundSize:backdrop.backgroundSize,
      backdropHeight:parseFloat(backdrop.height),
      footer:getComputedStyle(document.querySelector('body>footer.pv-lab-footer')).display};
  });
  assert.ok(mobileSurface.minHeight==='0px',
    'Mobile Inspiration must not reserve the old viewport + 200px height: '+JSON.stringify(mobileSurface));
  assert.ok(mobileSurface.shellHeight<=mobileSurface.contentHeight+8,
    'Gallery height must follow actual visible content, without a black trailing void: '+JSON.stringify(mobileSurface));
  assert.match(mobileSurface.backgroundImage,/pvlab-subtle-cinematic-background-20261017\.webp/,
    'Keep the approved original photographic plate');
  assert.match(mobileSurface.backgroundSize,/100% 100%/,
    'On narrow phones show the complete cobalt/copper image, not the black center crop');
  assert.ok(Math.abs(mobileSurface.backdropHeight-mobileSurface.shellHeight)<4,
    'Mobile backdrop must cover the whole actual gallery: '+JSON.stringify(mobileSurface));
  assert.equal(mobileSurface.footer,'none',
    'Browsing Inspiration must not scroll into the marketing footer');
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  const mobileBottom=await page.evaluate(()=>{
    const last=document.querySelector('#lab-welcome-start .lab-welcome-preset');
    const dock=document.getElementById('image-composer');
    return {cardBottom:last.getBoundingClientRect().bottom,
      dockTop:dock.getBoundingClientRect().top,
      viewportHeight:innerHeight,
      scrollY:window.scrollY,
      documentHeight:document.documentElement.scrollHeight,
      documentWidth:document.documentElement.scrollWidth};
  });
  const visualGap=mobileBottom.dockTop-mobileBottom.cardBottom;
  assert.ok(visualGap<125,
    'No huge empty strip should separate last card and fixed Generate: '+JSON.stringify({visualGap,mobileBottom}));
  assert.ok(mobileBottom.documentWidth<=391,
    'The mobile background must not create horizontal scrolling');
  // The approved mobile deck has one tools row, a stable header and a real
  // secondary-options expander. No paid requests are made in this check.
  await page.waitForFunction(()=>document.getElementById('studio-header')?.classList.contains('pv-mobile-entry-condensed'));
  const compact=await page.evaluate(()=>{
    document.activeElement?.blur?.();
    const r=s=>document.querySelector(s).getBoundingClientRect();
    const css=s=>getComputedStyle(document.querySelector(s));
    const dock=r('#image-composer');
    const controls=document.querySelector('#image-composer .composer-controls');
    const essential=['.composer-add-wrap','.scene-image-library-wrap','.composer-model-wrap','.composer-mood-control','.composer-mobile-more'];
    return {headerHeight:r('#studio-header').height,dockHeight:dock.height,dockTop:dock.top,
      cardBottom:r('#lab-welcome-start .lab-welcome-preset').bottom,
      cardHeight:r('#lab-welcome-start .lab-welcome-preset').height,
      titleTop:r('#lab-welcome-start h2').top,
      essential:essential.map(s=>({selector:s,display:getComputedStyle(controls.querySelector(s)).display,
        top:controls.querySelector(s).getBoundingClientRect().top})),
      retouch:css('#image-composer-edit-area').display,
      ratio:css('#image-composer-ratio').display,
      lock:getComputedStyle(document.documentElement).overflowY};
  });
  assert.ok(compact.headerHeight>=76&&compact.headerHeight<=80,
    'Mobile welcome header must stay stable and compact: '+JSON.stringify(compact));
  assert.equal(compact.essential.every(x=>x.display!=='none'),true,
    'Upload, saved elements, model, Moods and Options must all remain visible');
  assert.ok(Math.max(...compact.essential.map(x=>x.top))-Math.min(...compact.essential.map(x=>x.top))<8,
    'Welcome tools must fit a single row: '+JSON.stringify(compact));
  assert.equal(compact.retouch,'none','Retouch is accessible through Options at rest');
  assert.equal(compact.lock,'hidden','Resting welcome must not bounce vertically');
  assert.ok(compact.cardHeight>=240,
    'Recovered toolbar space should enlarge the original mood photographs: '+JSON.stringify(compact));
  assert.ok(compact.cardBottom<compact.dockTop-5,
    'Both Mood photographs and their titles must clear the compact deck: '+JSON.stringify(compact));
  const mobileMore=page.locator('#image-composer-mobile-more');
  await mobileMore.click();
  assert.equal(await mobileMore.getAttribute('aria-expanded'),'true');
  const expandedControls=await page.evaluate(()=>{
    const deck=document.getElementById('image-composer');
    const retouch=document.getElementById('image-composer-edit-area');
    const ratio=document.getElementById('image-composer-ratio');
    return {state:deck.dataset.mobileSettings,
      retouchHidden:retouch.hidden,retouchDisplay:getComputedStyle(retouch).display,
      retouchRect:retouch.getBoundingClientRect().toJSON(),
      ratioHidden:ratio.hidden,ratioDisplay:getComputedStyle(ratio).display};
  });
  assert.equal(await page.locator('#image-composer-edit-area').isVisible(),!expandedControls.retouchHidden,
    'Expanded Options must respect whether Retouch is available for this model/source: '+JSON.stringify(expandedControls));
  assert.equal(await page.locator('#image-composer-ratio').isVisible(),true,
    'Aspect ratio must be accessible in expanded Options');
  assert.notEqual(await page.evaluate(()=>getComputedStyle(document.documentElement).overflowY),'hidden',
    'Options expansion must release the page scroll lock');
  await mobileMore.click();
  await page.evaluate(()=>document.activeElement?.blur?.());
  assert.equal(await mobileMore.getAttribute('aria-expanded'),'false');
  await page.locator('#history-moods-toggle').click();
  assert.equal(await page.locator('#history').isVisible(),true,
    'Mobile History resumes after closing Inspiration without losing results');
  assert.deepEqual(errors,[]);
  console.log('FIRST_IMAGE_INSTANT_QUOTED_GENERATE_OK=1');
}finally{
  await context.close();
  await browser.close();
  await new Promise(done=>server.close(done));
}
