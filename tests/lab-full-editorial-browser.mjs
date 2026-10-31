import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
let uploadCount=0,jobCount=0,quoteCount=0;
const mockAuth="export async function loadLabAccount(){return {isSignedIn:true,session:{id:'sess-editorial-mock',getToken:async()=> 'token'},user:{id:'user-editorial-mock'},addListener(){},openSignIn(){throw Error('Sign in should not be opened in mock');}}}";
const mockSession="export function createSessionRequest(){return async (path,init)=>fetch('http://127.0.0.1:4179'+path,init)}";
const image=readFileSync('lab/visuals/hero/pvlab-industrial-fashion-20261027.jpg');
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1:4179');
 if(u.pathname==='/lab/native-account.js'){res.setHeader('Content-Type','text/javascript');res.end(mockAuth);return}
 if(u.pathname==='/lab/session-request.js'){res.setHeader('Content-Type','text/javascript');res.end(mockSession);return}
 const json=obj=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(obj));};
 if(u.pathname==='/api/session'){json({config:{enabled:true},credits:{balance:5000}});return}
 if(u.pathname==='/api/uploads'){for await(const _chunk of req){}json({id:'upload-'+(++uploadCount)});return}
 if(u.pathname==='/api/quotes'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const input=JSON.parse(Buffer.concat(chunks).toString());quoteCount++;
  assert.equal(input.count,4);assert.equal(input.referenceSourceIds.length,2);
  const list=Array.from({length:input.count},(_,i)=>({id:'quote-'+quoteCount+'-'+i,settings:input.settings,expiresAt:Date.now()+300000,creditCost:35}));
  json({quotes:list});return;
 }
 if(u.pathname==='/api/jobs'&&req.method==='POST'){jobCount++;json({job:{id:'job-'+jobCount,status:'completed',outputId:'test-output-'+jobCount}});return}
 if(/^\/api\/assets\/test-output-/.test(u.pathname)){res.setHeader('Content-Type','image/jpeg');res.end(image);return}
 if(/^\/api\/jobs\/job-/.test(u.pathname)){const id=u.pathname.split('/').pop();json({job:{id,status:'completed',outputId:'test-output-'+id.slice(4)}});return}
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
    const hero=rect('#panel-model .stage-visual'),header=rect('.editorial-header'),rail=rect('.editorial-flow-rail'),back=rect('.progress-top'),title=rect('#panel-model .atelier-section-top h3'),description=rect('#panel-model .atelier-section-top>p'),cards=rect('#casting-reference-gallery');
    return {heroBelowHeader:hero.top>=header.bottom,topGap:hero.top-header.bottom,heroHeight:hero.height,railInside:rail.top>=hero.top&&rail.bottom<=hero.bottom+1,backInside:back.top>=hero.top&&back.bottom<=hero.bottom,descriptionBeside:description.left>title.right&&description.top<title.bottom,descriptionGap:description.left-title.right,cardsVisible:cards.bottom<=innerHeight-12};
   });
   assert.equal(layout.heroBelowHeader,true,'Sticky header does not cover hero controls');
   assert.ok(layout.topGap<=13,'Hero begins immediately below the header');
   assert.equal(layout.heroHeight,280,'Approved compact Identity hero');
   assert.ok(layout.descriptionGap<=190,'Description stays beside the heading');
   for(const key of ['railInside','backInside','descriptionBeside','cardsVisible'])assert.equal(layout[key],true,key);
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
  assert.match(await page.locator('#review-model-text').textContent(),/1 model photograph/);
  assert.match(await page.locator('#review-outfit-text').textContent(),/1 wardrobe reference/);
  await page.screenshot({path:'test-results/editorial/'+width+'-review.png',fullPage:width===390});
  const before=jobCount;await page.locator('#review-credits').click();
  try{await page.locator('#editorial-confirm').waitFor({state:'visible',timeout:5500})}
  catch(error){
   const diagnostics=await page.evaluate(()=>({status:document.getElementById('editorial-status')?.textContent,profile:document.getElementById('editorial-balance')?.textContent,buttonDisabled:document.getElementById('review-credits')?.disabled,body:document.getElementById('panel-generate')?.innerText?.slice(0,550)}));
   console.error('EDITORIAL_QUOTE_DIAGNOSTICS',JSON.stringify({uploadCount,quoteCount,jobCount,width,diagnostics}));
   throw error;
  }
  assert.equal(jobCount,before,'No paid job is made before explicit credit confirmation');
  assert.equal(await page.locator('#confirm-price').textContent(),'140 credits');
  await page.locator('#confirm-submit').click();
  await page.locator('#editorial-results .result-card').last().waitFor({timeout:15000});
  assert.equal(await page.locator('#editorial-results .result-card').count(),4);
  await page.screenshot({path:'test-results/editorial/'+width+'-results.png',fullPage:width===390});
  assert.equal(jobCount,before+4,'Four individually bound and confirmed jobs were submitted');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  assert.equal(overflow,false,'Full Editorial has no horizontal overflow at '+width);
  assert.deepEqual(errors,[],'No browser errors at '+width);
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
  assert.equal(await page.locator('[data-source-view="upload"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#model-thumbs img').getAttribute('alt'),'pvlab-industrial-fashion-20261027.jpg');
  assert.equal(new URL(page.url()).searchParams.has('modelPhoto'),false,'Consumed token removed from URL');
  await page.locator('#step-next').click();
  assert.equal(await page.locator('#panel-style').isVisible(),true,'Loaded model satisfies Identity');
  await page.locator('#step-back').click();
  assert.equal(await page.locator('#model-thumbs img').count(),1,'Back keeps the model photo');
  assert.equal(uploadCount,startUploads,'Transfer stays local until explicit credit review');
  assert.equal(jobCount,startJobs);assert.equal(quoteCount,startQuotes);
  await page.close();
 }
 console.log('PASS Full Editorial 1440/390 steps, uploads, bound credit quote, confirm gate, real result assets and overflow');
}finally{await browser.close();server.close()}
