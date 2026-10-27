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
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp'})[extname(path)]||'application/octet-stream');
 res.end(pathname==='/lab/native-account.js'?account:readFileSync(path));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,executablePath:process.env.PV_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
mkdirSync('test-results',{recursive:true});
async function scenario({role='customer',width=1448,malformed=false,delayed=false,submitFailure=false}={}){
 const context=await browser.newContext({viewport:{width,height:1086},reducedMotion:'reduce'}),page=await context.newPage();
 await context.addInitScript(value=>{window.__beautyRole=value},role);
 const calls=[],quotes=[],jobs=[],errors=[];let submits=0,uploads=0;
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
  else if(url.pathname.startsWith('/api/assets/'))return route.fulfill({status:200,contentType:'image/webp',body:photo});
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 await page.goto(base+'/lab/beauty.html');await page.waitForFunction(()=>!!window.__beautyAccount);
 if(role!=='guest')await page.locator('#beauty-account').waitFor({state:'visible'});
 return {context,page,calls,quotes,jobs,errors,get submits(){return submits},get uploads(){return uploads}};
}
const input={name:'portrait.webp',mimeType:'image/webp',buffer:photo};
try{
 for(const width of [1448,1024,390,320]){
  const s=await scenario({role:'guest',width}),{page}=s;
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Beauty has no horizontal overflow at '+width);
  await page.locator('.pv-studios-trigger').click();
  await page.locator('.pv-studios-panel').waitFor({state:'visible'});
  assert.equal(await page.getByRole('link',{name:'Beauty Studio',exact:true}).isVisible(),true);
  const bounds=await page.locator('.pv-studios-panel').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
  await page.screenshot({path:'test-results/beauty-menu-'+width+'.png',fullPage:true});
  await page.keyboard.press('Escape');assert.equal(await page.locator('.pv-studios-panel').isVisible(),false);
  await page.locator('#beauty-photo').setInputFiles(input);await page.locator('#beauty-photo-preview').waitFor({state:'visible'});
  assert.deepEqual(s.calls,[],'Guest selects local photo without private API requests');
  await page.locator('#beauty-generate').click();await page.waitForFunction(()=>window.__signins===1);
  assert.deepEqual(s.calls,[],'Guest Generate opens sign-in without uploading, quoting or submitting');
  await page.screenshot({path:'test-results/beauty-'+width+'.png',fullPage:true});assert.deepEqual(s.errors,[]);await s.context.close();
 }
 for(const role of ['customer','owner']){
  const s=await scenario({role}),{page}=s;
  await page.locator('#beauty-photo').setInputFiles(input);
  await page.waitForFunction(()=>document.querySelector('#beauty-generate').textContent.includes('23 credits'));
  assert.equal(s.submits,0,'Quoting does not generate');assert.equal(s.uploads,1);
  await page.evaluate(()=>{document.querySelector('#beauty-form').requestSubmit();document.querySelector('#beauty-form').requestSubmit()});
  await page.locator('#beauty-result').waitFor({state:'visible'});assert.equal(s.submits,1,'Double-click submits exactly once');
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
