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
  if(width>800){
   const layout=await page.evaluate(()=>{
    const rect=selector=>document.querySelector(selector).getBoundingClientRect();
    const hero=rect('#panel-model .stage-visual'),header=rect('.editorial-header'),rail=rect('.editorial-flow-rail'),back=rect('.progress-top'),cards=rect('#casting-reference-gallery');
    return {heroBelowHeader:hero.top>=header.bottom,topGap:hero.top-header.bottom,heroHeight:hero.height,railInside:rail.top>=hero.top&&rail.bottom<=hero.bottom+1,backInside:back.top>=hero.top&&back.bottom<=hero.bottom,cardsVisible:cards.bottom<=innerHeight-12};
   });
   assert.equal(layout.heroBelowHeader,true,'Sticky header does not cover hero controls');
   assert.ok(layout.topGap<=13,'Hero begins immediately below the header');
   assert.equal(layout.heroHeight,280,'Approved compact Identity hero');
   for(const key of ['railInside','backInside','cardsVisible'])assert.equal(layout[key],true,key);
   await page.locator('#editorial-top-back').click();
   assert.equal(await page.locator('#editorial-hero').isVisible(),true,'Top Back returns to hero');
   await page.locator('#editorial-start').click();
  }else{
   assert.equal(await page.locator('.progress-top').isVisible(),false,'Mobile removes duplicate top controls');
   assert.equal(await page.locator('.editorial-flow-rail').isVisible(),false,'Mobile removes duplicate step rail');
   assert.equal(await page.locator('#panel-model .stage-index').isVisible(),true,'Step label remains inside the photograph');
  }
  await page.locator('#step-back').click();
  assert.equal(await page.locator('#editorial-hero').isVisible(),true,'Back returns from Identity to hero');
  assert.equal(await page.locator('#editorial-flow').isVisible(),false);
  await page.locator('#editorial-start').click();
  await page.locator('#casting-reference-gallery .atelier-reference').first().click();
  await page.locator('#model-thumbs .thumb').waitFor({state:'visible'});
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
  assert.equal(await page.locator('#editorial-casting-controls').isVisible(),true);
  assert.equal(await page.locator('#editorial-photograph-together').isChecked(),true,'Together is enabled by default');
  await page.locator('#editorial-photograph-together').uncheck();
  assert.equal(await page.locator('#editorial-photograph-together').isChecked(),false);
  await page.locator('#casting-reference-gallery .atelier-reference').nth(1).click();
  await page.waitForFunction(()=>document.querySelectorAll('#model-thumbs .editorial-model-card').length===1);
  assert.equal(await page.locator('#editorial-casting-controls').isVisible(),false);
  // Saved Characters is a real source tab; one saved pack produces one person.
  await page.locator('#saved-character').click();
  await page.locator('#saved-character-gallery .editorial-saved-cast').first().waitFor();
  await page.locator('#saved-character-gallery .editorial-saved-cast').first().click();
  await page.waitForFunction(()=>document.querySelectorAll('#model-thumbs .editorial-model-card').length===2);
  assert.equal(await page.locator('#editorial-photograph-together').isChecked(),false,'Composition choice survives changes to the cast');
  await page.getByRole('button',{name:'Remove Test Actor'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('#model-thumbs .editorial-model-card').length===1);
  await page.locator('[data-source-view="casting"]').click();
  await page.locator('#step-next').click();assert.equal(await page.locator('#panel-style').isVisible(),true);
  await page.locator('#styling-direction').fill('Architectural black leather and natural tailoring.');
  await page.locator('#outfit-files').setInputFiles('lab/visuals/hero/pvlab-industrial-fashion-20261027.jpg');
  await page.locator('.stage-visual--style img').evaluate(img=>img.decode().catch(()=>{}));
  await page.screenshot({path:'test-results/editorial/'+width+'-styling.png',fullPage:width===390});
  await page.locator('#step-next').click();assert.equal(await page.locator('#panel-mood').isVisible(),true);
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
  assert.equal(await page.locator('#editorial-generate').textContent(),'Generate');
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
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const beforeEntry={uploads:uploadCount,jobs:jobCount,quotes:quoteCount};
  await page.goto('http://127.0.0.1:4179/lab/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#featured-editorial .pv-feature-button').click();
  await page.locator('#editorial-flow').waitFor({state:'visible'});
  assert.equal(await page.locator('#panel-model').isVisible(),true,'Homepage CTA opens Identity directly');
  assert.equal(await page.locator('#editorial-hero').isVisible(),false,'No second arrival hero');
  assert.equal(new URL(page.url()).searchParams.has('start'),false,'Entry flag is consumed');
  assert.equal(await page.locator('[data-source-view="casting"]').getAttribute('aria-pressed'),'true','Casting remains the initial source');
  assert.deepEqual({uploads:uploadCount,jobs:jobCount,quotes:quoteCount},beforeEntry,'Opening Identity performs no paid preparation or generation');
  await page.locator('#step-back').click();
  assert.equal(await page.locator('#editorial-hero').isVisible(),true,'Direct entry retains Back to the arrival hero');
  await page.close();
 }
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.goto('http://127.0.0.1:4179/lab/index.html',{waitUntil:'domcontentloaded'});
  const startUploads=uploadCount,startJobs=jobCount,startQuotes=quoteCount;
  const picker=page.waitForEvent('filechooser');
  await page.locator('.lab-character-home__plus').click();
  await (await picker).setFiles('lab/visuals/hero/pvlab-industrial-fashion-20261027.jpg');
  await page.waitForURL('**/full-editorial.html**');
  await page.locator('#model-thumbs img').waitFor({state:'visible'});
  assert.equal(await page.locator('#panel-model').isVisible(),true,'Picker opens Identity directly');
  assert.equal(await page.locator('#editorial-hero').isVisible(),false,'Arrival hero is skipped');
  assert.equal(await page.locator('[data-source-view="casting"]').getAttribute('aria-pressed'),'true','Uploaded model appears within the same casting workflow');
  assert.equal(await page.locator('#model-thumbs .editorial-model-card').count(),1,'Handoff creates one selected model');
  assert.equal(new URL(page.url()).searchParams.has('modelPhoto'),false,'Consumed token removed from URL');
  await page.locator('#step-next').click();
  assert.equal(await page.locator('#panel-style').isVisible(),true,'Loaded model satisfies Identity');
  await page.locator('#step-back').click();
  assert.equal(await page.locator('#model-thumbs img').count(),1,'Back keeps the model photo');
  assert.equal(uploadCount,startUploads,'Transfer stays local until explicit credit review');
  assert.equal(jobCount,startJobs);assert.equal(quoteCount,startQuotes);
  await page.close();
 }
 console.log('PASS Full Editorial 1440/390 steps, uploads, inline live quote, stale/expired quote guards, one-click batch, no ambiguous retries, real result assets and overflow');
}finally{await browser.close();server.close()}
