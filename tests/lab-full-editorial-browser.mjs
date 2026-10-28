import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
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
 if(u.pathname==='/api/uploads'){json({id:'upload-'+(++uploadCount)});return}
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
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4179/lab/full-editorial.html',{waitUntil:'domcontentloaded'});
  await page.locator('#editorial-start').click();await page.locator('#model-files').setInputFiles('lab/visuals/hero/pvlab-industrial-fashion-20261027.jpg');
  await page.locator('#step-next').click();assert.equal(await page.locator('#panel-style').isVisible(),true);
  await page.locator('#styling-direction').fill('Architectural black leather and natural tailoring.');
  await page.locator('#outfit-files').setInputFiles('lab/visuals/hero/pvlab-industrial-fashion-20261027.jpg');
  await page.locator('#step-next').click();assert.equal(await page.locator('#panel-mood').isVisible(),true);
  await page.locator('.direction-card').first().click();
  await page.locator('#step-next').click();assert.equal(await page.locator('#panel-generate').isVisible(),true);
  const before=jobCount;await page.locator('#review-credits').click();
  await page.locator('#editorial-confirm').waitFor({state:'visible'});
  assert.equal(jobCount,before,'No paid job is made before explicit credit confirmation');
  assert.equal(await page.locator('#confirm-price').textContent(),'140 credits');
  await page.locator('#confirm-submit').click();
  await page.locator('#editorial-results .result-card').last().waitFor({timeout:15000});
  assert.equal(await page.locator('#editorial-results .result-card').count(),4);
  assert.equal(jobCount,before+4,'Four individually bound and confirmed jobs were submitted');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  assert.equal(overflow,false,'Full Editorial has no horizontal overflow at '+width);
  assert.deepEqual(errors,[],'No browser errors at '+width);
  await page.close();
 }
 console.log('PASS Full Editorial 1440/390 steps, uploads, bound credit quote, confirm gate, real result assets and overflow');
}finally{await browser.close();server.close()}
