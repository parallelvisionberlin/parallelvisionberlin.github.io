// Real mobile layout and native-session handshake. All API requests are fixtures.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE||resolve('mobile-app/node_modules/@playwright/test/index.mjs')).href);
const root=resolve('.'),out='/tmp/pv-lab-mobile-review';mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');res.end(readFileSync(path));});
await new Promise(r=>server.listen(4187,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:chromium.executablePath()});
const id=n=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
let total=0;
try{
for(const [width,height] of [[390,730],[320,590],[768,900]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[],requests=[],jobs=[],quotes=new Map();let seq=1;
 page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});
 page.setDefaultTimeout(12000);
 page.on('console',m=>{if(m.type()==='error')console.error('PAGE CONSOLE',m.text());});
 await page.addInitScript(()=>{
  window.__PV_LAB_NATIVE__=1;window.__nativeMessages=[];
  window.ReactNativeWebView={postMessage(raw){const m=JSON.parse(raw);window.__nativeMessages.push(m);if(m.type==='PV_LAB_AUTH')setTimeout(()=>window.__PV_LAB_REPLY__({pageId:m.pageId,id:m.id,userId:'user_MobileTest',sessionId:'sess_MobileTest',token:'test.'+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+60}))+'.fixture'}),0);}};
 });
 await page.route('https://**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev'){return route.abort();}
  const path=url.pathname,method=req.method(),data=req.headers()['content-type']?.includes('application/json')?req.postDataJSON():{};
  requests.push({path,method,data});assert.equal(req.headers()['x-pv-lab-client'],'mobile-v1');
  const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/api/session')return send({owner:true,ownerId:'owner-test',config:{enabled:true,configured:true,dailyLimitUsd:10,concurrency:{image:4,video:1},geminiEnabled:true,falEnabled:false,higgsfieldEnabled:false}});
  if(path==='/api/jobs'&&method==='GET')return send({jobs,activeJobs:jobs.filter(j=>j.status==='queued'),concurrency:{image:4,video:1},next:null});
  if(path==='/api/packs')return send({packs:[]});
  if(path==='/api/soul/characters')return send({characters:[]});
  if(path==='/api/soul-pro/identity')return send({configured:false,count:0,refs:[]});
  if(path==='/api/moodboards')return send({moodboards:[]});
  if(path==='/api/folders')return send({folders:[]});
  if(path==='/api/uploads'||path==='/api/reference-uploads')return send({id:id(seq++)},201);
  if(path==='/api/quotes'){const q={id:id(seq++),settings:{...data.settings,referenceSourceIds:data.referenceSourceIds||[]},provider:'SpicyAPI',creditCost:25,maxUsd:.2,estimatedUsd:.2,expiresAt:Date.now()+180000};quotes.set(q.id,{q,data});return send(q);}
  if(path==='/api/jobs'&&method==='POST'){const entry=quotes.get(data.quoteId);assert.ok(entry);assert.equal(data.confirm,true);const job={id:id(seq++),sourceId:entry.data.referenceSourceIds[0],settings:entry.q.settings,status:'queued',createdAt:Date.now(),estimatedUsd:.2};jobs.unshift(job);return send({job},202);}
  if(path.startsWith('/api/jobs/'))return send({job:jobs.find(j=>path.endsWith(j.id))});
  return send({error:'Unmocked '+path},404);
 });
 await page.goto('http://127.0.0.1:4187/lab/app-moods.html');
 await page.waitForFunction(()=>document.querySelectorAll('.mood-card').length>10);
 assert.equal(requests.length,0,'Discovery does not request an account or call paid APIs');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await page.screenshot({path:out+`/discover-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'Explore Hong Kong Nights',exact:true}).click();
 assert.equal(await page.locator('#detail-title').innerText(),'Hong Kong Nights');
 const initialDialog=await page.locator('#mood-detail').boundingBox();
 const chooser=page.waitForEvent('filechooser');await page.click('#photo-input');
 const photo=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=480;c.height=640;c.getContext('2d').fillRect(0,0,480,640);return c.toDataURL().split(',')[1];}),'base64');
 await (await chooser).setFiles({name:'source.png',mimeType:'image/png',buffer:photo});
 await page.waitForFunction(()=>document.querySelector('#continue-create').textContent==='Generate · 25 credits');
 assert.equal(requests.filter(r=>r.method==='POST'&&r.path==='/api/jobs').length,0,'Upload and price never submit a job');
 await page.screenshot({path:out+`/mood-photo-${width}.png`,fullPage:true});
 assert.deepEqual(await page.locator('#mood-detail').boundingBox(),initialDialog,'Account initialization must not shrink the open deck');
 assert.equal(await page.locator('#mood-detail').evaluate(e=>getComputedStyle(e).outlineStyle),'none','The dialog container has no browser focus frame');
 await page.click('#continue-create');
 await page.waitForFunction(()=>document.querySelector('#continue-create').textContent==='Sent to Gallery');
 assert.equal(requests.filter(r=>r.method==='POST'&&r.path==='/api/jobs').length,1,'Generate submits exactly one quoted job');
 assert.equal(await page.locator('#disclosure').isVisible(),false,'Generating has one status message, without the repeated Gallery disclosure');
 await page.locator('#deck-form').evaluate(form=>form.requestSubmit());
 assert.equal(requests.filter(r=>r.method==='POST'&&r.path==='/api/jobs').length,1,'Duplicate submission is blocked');
 await page.click('#close-detail');
 await page.getByRole('button',{name:'Explore Dreamcore',exact:true}).click();
 assert.equal(await page.locator('#photo-preview').isVisible(),false,'New deck does not reuse the previous private photo');
 await page.click('#close-detail');
 await page.goto('http://127.0.0.1:4187/lab/mood-creator.html?native=1#my-moods');
 await page.waitForSelector('#mobile-new');
 assert.equal(await page.locator('#workspace').isVisible(),false);
 assert.equal(await page.locator('#my-moods').isVisible(),true);
 await page.click('#mobile-new');assert.equal(await page.locator('.mc-board-column').isVisible(),true);
 assert.equal(await page.locator('.mc-direction').isVisible(),false);
 await page.click('#mobile-direction');assert.equal(await page.locator('.mc-direction').isVisible(),true);
 assert.equal(await page.locator('.mc-board-column').isVisible(),false);
 await page.screenshot({path:out+`/mood-style-${width}.png`,fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 assert.deepEqual(errors,[]);total++;await page.close();
 console.log('PASS',width,'guest discovery, direct deck, quoted generation, private collection, progressive editor');
}
console.log('PASS',total,'widths. Only fixture generation requests; no real provider requests.');
}finally{await browser.close();server.close();}

