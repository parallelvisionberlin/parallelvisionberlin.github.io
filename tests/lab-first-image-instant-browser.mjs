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
window.__welcomeMockReady=true;
`;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml'};
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
    'Desktop Image deck must use the original two-row composer, not a horizontal strip');
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
  assert.ok(Number(welcomeSurface.opacity)>=.95 && welcomeSurface.filter.includes('saturate(1.7)'),
    'The original blue/copper photographic atmosphere must be vivid: '+JSON.stringify(welcomeSurface));
  assert.ok(welcomeSurface.image.includes('dream-blur-20261015.jpg'),
    'Use the approved Dream Blur photograph, not the reference screenshot as an asset');
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
  assert.equal(await page.locator('.lab-welcome-preset').count(),6,
    'All six original welcome cards remain mounted');
  const cardY=await page.locator('.lab-welcome-preset').first().evaluate(el=>el.getBoundingClientRect().top+window.scrollY);
  await field.click();
  assert.equal(await deck.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
    'Clicking the prompt opens its multi-line editor');
  await field.fill(('Realistic editorial atmosphere and tactile photographic details. ').repeat(35));
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
  assert.match(await page.locator('#image-composer-prompt').inputValue(),/jade-green-lit corner shop/);
  assert.equal(await page.locator('#image-composer-resolution').inputValue(),'2k',
    'The first Mood selection must use Seedream 2K, not the generic Studio 1K default');
  assert.equal(await button.isEnabled(),true,'Green Haze must enable Generate in the same click');
  await page.locator('[data-welcome-mood="dream-blur"]').click();
  assert.match(await page.locator('#image-composer-prompt').inputValue(),/blue motion blur/);
  assert.equal(await page.locator('#image-composer-resolution').inputValue(),'2k',
    'Switching welcome Moods must retain the agreed 2K default');
  assert.doesNotMatch(await button.getAttribute('data-credits')||'',/Confirming credits/i,
    'The preflight must not put Confirming credits inside Generate');
  assert.equal(await deck.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
    'Switching selected Moods must not collapse the Image deck');
  assert.equal(await button.isEnabled(),true,'Dream Blur must instantly enable Generate before the price');
  const heightBefore=await button.evaluate(el=>el.getBoundingClientRect().height);
  await button.click();
  assert.equal(await button.isDisabled(),true,'Second click is disabled until the first request is confirmed');
  await page.waitForFunction(()=>document.querySelector('#image-composer-status')?.textContent.includes('Preparing'),undefined,{timeout:15000});
  const timeout=Date.now()+25000;
  while(submissions<1&&Date.now()<timeout)await new Promise(done=>setTimeout(done,60));
  assert.equal(submissions,1,'One click must create exactly one paid job');
  assert.equal(requests.filter(x=>x.path==='/api/jobs'&&x.method==='POST').length,1);
  const submission=requests.find(x=>x.path==='/api/jobs'&&x.method==='POST');
  assert.equal(quotes.get(submission.data.quoteId)?.settings.resolution,'2k',
    'Paid submission must reuse the exact 2K quote selected by the customer');
  assert.equal(quotes.get(submission.data.quoteId)?.creditCost,30,
    'Mock 2K price must be taken from the verified quote, not the 1K amount');
  assert.equal(requests.filter(x=>x.path==='/api/quotes').length>=1,true);
  assert.ok(quotes.size>=1);
  assert.equal(await deck.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
    'Submitting Generate must preserve the open editing deck');
  assert.equal(await button.evaluate(el=>el.getBoundingClientRect().height),heightBefore,
    'Generate dimensions must not change while checking price or submitting');
  // Simulate the first result becoming visible, without a paid provider call.
  // Only the welcome presentation relaxes: the actual cascade and footer
  // regain their ordinary scroll styles after first-image transition.
  const historyRelease=await page.evaluate(()=>{
    document.getElementById('lab-welcome-start').hidden=true;
    document.getElementById('image-gallery-empty').hidden=true;
    const host=document.getElementById('image-gallery-host');
    const thumb=document.createElement('article');
    thumb.className='card';thumb.dataset.kind='image';host.append(thumb);
    return {footer:getComputedStyle(document.querySelector('body>footer.pv-lab-footer')).display,
      overflow:getComputedStyle(document.documentElement).overflowY};
  });
  assert.notEqual(historyRelease.footer,'none',
    'After an image exists, normal History page/footer accessibility returns');
  assert.notEqual(historyRelease.overflow,'hidden',
    'After first-image transition, the cascading gallery scroll is restored');
  assert.deepEqual(errors,[]);
  console.log('FIRST_IMAGE_INSTANT_QUOTED_GENERATE_OK=1');
}finally{
  await context.close();
  await browser.close();
  await new Promise(done=>server.close(done));
}
