// Synthetic accounts and intercepted APIs only. No provider or payment requests.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,statSync,mkdirSync} from 'node:fs';
import {resolve,extname,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),photo=readFileSync('lab/visuals/beauty/beauty-veil-editorial.webp');
const account=`const listeners=[];const role=window.__beautyRole||'guest';const account={isSignedIn:role!=='guest',user:{id:'user_BeautyTest',firstName:'Beauty',lastName:'Test'},session:role==='guest'?null:{id:'sess_BeautyTest',getToken:async()=> 'synthetic-token'},addListener:fn=>listeners.push(fn),openSignIn:()=>{window.__signins=(window.__signins||0)+1},signOut:async()=>{account.isSignedIn=false;account.session=null;for(const fn of listeners)fn()}};window.__beautyAccount=account;export const loadLabAccount=async()=>account;`;
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+decodeURIComponent(pathname));
 if(relative(root,path).startsWith('..')||!existsSync(path)||!statSync(path).isFile())return res.writeHead(404).end();
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.avif':'image/avif'})[extname(path)]||'application/octet-stream');
 res.end(pathname==='/lab/native-account.js'?account:readFileSync(path));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,executablePath:process.env.PV_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
mkdirSync('test-results',{recursive:true});
async function scenario({role='customer',width=1448,height=1086,malformed=false,delayed=false,submitFailure=false}={}){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();
 await context.addInitScript(value=>{window.__beautyRole=value},role);
 const calls=[],quotes=[],jobs=[],errors=[];let submits=0,uploads=0,delayOldResult=false;
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev')return route.abort();
  calls.push({path:url.pathname,method:request.method()});
  assert.equal(request.headers().authorization,'Bearer synthetic-token');
  let result={};
  if(url.pathname==='/api/session')result={owner:role==='owner',customer:role!=='owner',balanceCredits:500,generationReady:true,billingReady:true,config:{enabled:true}};
  else if(url.pathname==='/api/uploads'){uploads++;result={id:'photo-'+uploads};}
  else if(url.pathname==='/api/quotes'){
   const body=request.postDataJSON(),number=quotes.length+1;
   const quoted={id:'quote-'+number,creditCost:malformed?'23':number===1?23:31,expiresAt:Date.now()+240000,settings:{...body.settings,referenceSourceIds:body.referenceSourceIds}};quotes.push(quoted);
   if(delayed&&number===1)await new Promise(done=>setTimeout(done,1100));result=quoted;
  }else if(url.pathname==='/api/jobs'&&request.method()==='POST'){
   submits++;const body=request.postDataJSON();assert.equal(body.confirm,true);const q=quotes.find(q=>q.id===body.quoteId);assert.ok(q);
   if(submitFailure)return route.abort('failed');
   const job={id:'job-'+submits,status:'completed',outputId:'output-'+submits,createdAt:Date.now(),settings:q.settings};jobs.unshift(job);result={job};
  }else if(url.pathname==='/api/jobs')result={jobs,activeJobs:[]};
  else if(url.pathname.startsWith('/api/assets/')){if(delayOldResult&&url.pathname==='/api/assets/output-1')await new Promise(done=>setTimeout(done,1100));return route.fulfill({status:200,contentType:'image/webp',body:photo});}
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 await page.goto(base+'/lab/beauty.html');await page.waitForFunction(()=>!!window.__beautyAccount);
 if(role!=='guest')await page.locator('#beauty-account').waitFor({state:'visible'});
 return {context,page,calls,quotes,jobs,errors,delayOldResult:()=>{delayOldResult=true},get submits(){return submits},get uploads(){return uploads}};
}
const input={name:'portrait.webp',mimeType:'image/webp',buffer:photo};
try{
 for(const [width,height] of [[1920,900],[1440,800],[1366,768],[1280,720],[1024,768]]){
  const s=await scenario({role:'guest',width,height}),{page}=s;
  await page.evaluate(()=>document.fonts.ready);
  const layout=await page.evaluate(()=>{
   const bounds=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
   return {title:bounds('h1'),photo:bounds('.beauty-photo'),notes:bounds('#beauty-direction'),panel:bounds('.beauty-edit-panel'),button:bounds('#beauty-generate'),height:innerHeight,width:innerWidth,scrollWidth:document.documentElement.scrollWidth};
  });
  assert.ok(layout.button.bottom<=height-12,'Generate fits the first viewport at '+width+'x'+height+': '+JSON.stringify(layout));
  assert.ok(layout.notes.bottom+8<=layout.button.top,'Creative direction and Generate never overlap');
  assert.ok(layout.title.right+8<=layout.photo.left&&layout.photo.right+8<=layout.panel.left,'Approved layout keeps settings left, image centered and tools right');
  assert.ok(layout.panel.left>=0&&layout.panel.right<=width&&layout.scrollWidth<=width,'Workspace fits horizontally');
  await page.locator('#beauty-generate').click({trial:true});
  await page.screenshot({path:'test-results/beauty-fit-'+width+'x'+height+'.png',fullPage:true});
  await s.context.close();
 }
 // Visual shortcuts must control the native fields used by credit quotes and generation.
 {
  const s=await scenario({role:'guest',width:1448}),{page}=s;
  assert.equal(await page.locator('[data-beauty-choice]').count(),12,'Three editable categories show four visual options each');
  const src=await page.locator('.beauty-looks-list .beauty-look-photo').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')));
  assert.equal(src.length,6,'Six editorial cards are visible');
  assert.equal(new Set(src).size,6,'Editorial cards use six distinct photographic assets');
  await page.locator('[data-beauty-choice="beauty-makeup"][data-value="bold"]').click();
  assert.equal(await page.locator('#beauty-makeup').inputValue(),'bold','Makeup card changes the generation setting');
  await page.locator('#beauty-reset-look').click();
  assert.equal(await page.locator('#beauty-makeup').inputValue(),'keep','Reset returns editing settings to defaults');
  await page.locator('[data-look="night"]').click();
  assert.match(await page.locator('#beauty-direction').inputValue(),/low-key evening/i,'Editorial mood cards produce real creative directions');
  await s.context.close();
 }
 for(const width of [1448,1024,390,320]){
  const s=await scenario({role:'guest',width}),{page}=s;
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Beauty has no horizontal overflow at '+width);
  const header=page.locator('.beauty-header'),nav=header.locator('nav[aria-label="Creative tools"]');
  const navLabels=await nav.locator(':scope > a:not([hidden]), :scope > .pv-studios-menu > .pv-studios-trigger').allTextContents();
  assert.deepEqual(navLabels,['Image','Video','Upscaler','Studios','Explore Moods'],'Beauty uses the standard Studio menu, not its old standalone links');
  const headerBounds=await header.boundingBox();
  assert.equal(Math.round(headerBounds.y),0,'Global header aligns to the top edge');
  assert.equal(Math.round(headerBounds.height),width<=900?104:70,'Beauty retains Studio header proportions');
  assert.equal(await header.locator('.beauty-assets-link').getAttribute('href'),'./studio.html?tool=assets');
  assert.equal(await header.getByRole('link',{name:'Effects'}).isVisible(),false,'Effects remains owner-only');
  assert.equal(await header.getByRole('link',{name:'Pricing'}).count(),0,'No second Pricing header');
  assert.equal(await header.getByRole('link',{name:'Open studio'}).count(),0,'No duplicate Studio launch in header');
  assert.equal(await header.getByRole('link',{name:'Credits'}).count(),0,'Credit controls stay in the account menu');
  await page.locator('.pv-studios-trigger').click();
  await page.locator('.pv-studios-panel').waitFor({state:'visible'});
  assert.equal(await page.getByRole('link',{name:'Beauty Studio',exact:true}).isVisible(),true);
   assert.equal(await page.getByRole('link',{name:'Retouch Studio',exact:true}).isVisible(),true);
  assert.equal(await page.getByRole('link',{name:'Outfit Studio',exact:true}).isVisible(),true);
  const bounds=await page.locator('.pv-studios-panel').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
  await page.screenshot({path:'test-results/beauty-menu-'+width+'.png',fullPage:true});
  await page.keyboard.press('Escape');assert.equal(await page.locator('.pv-studios-panel').isVisible(),false);
  await page.locator('#beauty-photo').setInputFiles(input);await page.locator('#beauty-photo-preview').waitFor({state:'visible'});
  assert.deepEqual(s.calls,[],'Guest selects local photo without private API requests');
  await page.locator('#beauty-generate').click();await page.waitForFunction(()=>window.__signins===1);
  assert.deepEqual(s.calls,[],'Guest Generate opens sign-in without uploading, quoting or submitting');
  await page.screenshot({path:'test-results/beauty-'+width+'.png',fullPage:true});assert.deepEqual(s.errors,[]);await s.context.close();
 }
 for(const options of [{role:'customer',width:1448},{role:'owner',width:1448},{role:'customer',width:390}]){
  const s=await scenario(options),{page}=s;
  assert.equal(await page.locator('#beauty-effects-link').isVisible(),options.role==='owner','Effects matches server-verified Studio owner visibility');
  assert.equal(await page.locator('.beauty-assets-link').getAttribute('href'),'./studio.html?tool=assets');
  assert.equal(await page.locator('#beauty-account').isVisible(),true,'Signed-in account menu is visible on Beauty');
  await page.locator('#beauty-photo').setInputFiles(input);
  await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('23 credits'));
  assert.equal(s.submits,0,'Quoting does not generate');assert.equal(s.uploads,1);
  await page.evaluate(()=>{document.querySelector('#beauty-form').requestSubmit();document.querySelector('#beauty-form').requestSubmit()});
  await page.locator('#beauty-result').waitFor({state:'visible'});assert.equal(s.submits,1,'Double-click submits exactly once');
  await page.locator('#beauty-generate').click({trial:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Completed result does not widen the page');
  await page.screenshot({path:'test-results/beauty-result-'+options.role+'-'+options.width+'.png',fullPage:true});
  assert.equal(await page.locator('#beauty-download').getAttribute('href').then(v=>v.startsWith('blob:')),true);
  await page.evaluate(()=>window.__beautyAccount.signOut());
  await page.waitForFunction(()=>document.querySelector('#beauty-result').hidden&&document.querySelector('#beauty-photo-preview').hidden);
  assert.equal(await page.locator('#beauty-history').textContent(),'');assert.equal(await page.locator('#beauty-direction').inputValue(),'');assert.equal(await page.locator('#beauty-photo-preview').getAttribute('src'),null);
  assert.deepEqual(s.errors,[]);await s.context.close();
 }
 {
  const s=await scenario({malformed:true}),{page}=s;await page.locator('#beauty-photo').setInputFiles(input);
  await page.waitForFunction(()=>document.querySelector('#beauty-status').textContent.includes('credit price'));
  await page.locator('#beauty-generate').click();assert.equal(s.submits,0,'Invalid credit quote cannot generate');await s.context.close();
 }
 {
  const s=await scenario({delayed:true}),{page}=s;await page.locator('#beauty-photo').setInputFiles(input);
  await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('Checking'));
  await page.locator('#beauty-direction').fill('A different look');
  await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('31 credits'));
  await page.locator('#beauty-generate').click();await page.locator('#beauty-result').waitFor({state:'visible'});
  assert.equal(s.submits,1);assert.match(s.jobs[0].settings.prompt,/A different look/);assert.equal(s.uploads,1);await s.context.close();
 }
 {
  const s=await scenario({submitFailure:true}),{page}=s;await page.locator('#beauty-photo').setInputFiles(input);
  await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('23 credits'));
  await page.locator('#beauty-generate').click();await page.waitForFunction(()=>!document.querySelector('#beauty-check-history').hidden);
  await page.evaluate(()=>document.querySelector('#beauty-form').requestSubmit());assert.equal(s.submits,1,'Ambiguous submission is never retried automatically');
  await page.reload();await page.locator('#beauty-check-history').waitFor({state:'visible'});assert.equal(s.submits,1,'Reload cannot submit or reprice an ambiguous request');
  await s.context.close();
 }
 {
  const s=await scenario(),{page}=s;await page.locator('#beauty-photo').setInputFiles(input);
  await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('23 credits'));
  await page.locator('#beauty-generate').click();await page.locator('#beauty-result').waitFor({state:'visible'});
  await page.locator('#beauty-generate').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#beauty-generate').disabled);
  await page.locator('#beauty-direction').fill('Another look');
  await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('31 credits'));
  await page.locator('#beauty-generate').click();await page.waitForFunction(()=>document.querySelectorAll('#beauty-history button').length===2);
  await page.locator('#beauty-generate').click({trial:true});
  s.delayOldResult();await page.locator('#beauty-history button').nth(1).click();await page.locator('#beauty-history button').nth(0).click();
  await page.waitForTimeout(1300);
  assert.match(await page.locator('#beauty-download').getAttribute('download'),/job-2/,'A delayed older image cannot replace the newer selection');
  assert.equal(s.submits,2,'History selection never generates');await s.context.close();
 }
 // The homepage uses the real new menu, retaining its original Fashion URL.
 {
  const s=await scenario({role:'guest'});await s.page.goto(base+'/lab/index.html');await s.page.locator('.pv-studios-trigger').click();
  assert.match(await s.page.getByRole('link',{name:'Fashion Studio',exact:true}).getAttribute('href'),/tool=fashion/);
  assert.match(await s.page.locator('.pv-studios-character-link').getAttribute('href'),/createCharacter=1/);
  assert.match(await s.page.locator('#hero-title').textContent(),/PV LAB/);await s.context.close();
 }
 {
  const s=await scenario({role:'guest',width:390});await s.page.goto(base+'/lab/moods.html');
  await s.page.locator('.pv-studios-trigger').click();
  await s.page.getByRole('link',{name:'Beauty Studio',exact:true}).click();
  await s.page.waitForURL('**/lab/beauty.html');
  assert.equal(await s.page.locator('h1').textContent(),'Beauty Studio.');await s.context.close();
 }
 console.log('PASS Beauty: desktop/mobile, menu, guest isolation, owner/customer, exact credits, one submit, stale quotes, ambiguity and logout privacy');
}finally{await browser.close();server.close();}
