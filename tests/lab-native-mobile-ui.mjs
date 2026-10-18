// Real mobile layout and native-session handshake. All API requests are fixtures.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE||resolve('mobile-app/node_modules/@playwright/test/index.mjs')).href);
const root=resolve('.'),out='/tmp/pv-lab-mobile-review';mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(readFileSync(path));});
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
  if(path==='/api/quotes'){const q={id:id(seq++),settings:{...data.settings,referenceSourceIds:data.referenceSourceIds||[]},maxUsd:.2,estimatedUsd:.2,expiresAt:Date.now()+180000};quotes.set(q.id,{q,data});return send(q);}
  if(path==='/api/jobs'&&method==='POST'){const entry=quotes.get(data.quoteId);assert.ok(entry);assert.equal(data.confirm,true);const job={id:id(seq++),sourceId:entry.data.referenceSourceIds[0],settings:entry.q.settings,status:'queued',createdAt:Date.now(),estimatedUsd:.2};jobs.unshift(job);return send({job},202);}
  if(path.startsWith('/api/jobs/'))return send({job:jobs.find(j=>path.endsWith(j.id))});
  return send({error:'Unmocked '+path},404);
 });
 await page.goto('http://127.0.0.1:4187/lab/studio.html?native=1');
 try{await page.waitForFunction(()=>window.__nativeMessages.some(m=>m.type==='PV_LAB_READY')&&!document.querySelector('#app').hidden);}catch(e){await page.screenshot({path:out+'/boot-failure.png',fullPage:true});console.error(JSON.stringify({errors,requests,body:await page.locator('body').innerText()}));throw e;}
 assert.equal(await page.locator('#lab-boot').isVisible(),true,'Native workspace waits for its initial destination');
 assert.equal(await page.locator('#mobile-add-photo').isVisible(),false,'Create must not flash before Gallery');
 await page.evaluate(()=>window.__PV_LAB_COMMAND__({action:'gallery'}));
 assert.equal(await page.locator('#assets-gallery').isVisible(),true,'Initial Gallery command opens Gallery');
 assert.equal(await page.locator('#mobile-add-photo').isVisible(),false,'Gallery keeps Create hidden');
 // Mobile Gallery must fill the actual display width, not retain measured
 // half-width justified rows from the browser/desktop image archive.
 await page.evaluate(()=>{
   const root=document.getElementById('history');
   for(const ratio of [1.8,.75,.9]){
     const card=document.createElement('article');card.className='card native-test-card';
     card.dataset.ratio=String(ratio);root.append(card);
   }
 });
 await page.waitForFunction(()=>document.querySelector('.native-test-card.native-gallery-wide'));
 const grid=await page.evaluate(()=>{
   const root=document.getElementById('history'),cards=[...root.querySelectorAll('.native-test-card')];
   const box=root.getBoundingClientRect(),items=cards.map(c=>c.getBoundingClientRect());
   return {display:getComputedStyle(root).display,width:box.width,wide:items[0].width,
     second:{x:items[1].x,y:items[1].y},third:{x:items[2].x,y:items[2].y}};
 });
 assert.equal(grid.display,'grid','Native gallery uses CSS grid rather than desktop justified rows');
 assert.ok(grid.wide>=grid.width*.95,'Landscape cards use the entire Gallery width');
 assert.ok(grid.third.x>grid.second.x&&Math.abs(grid.third.y-grid.second.y)<3,'Portrait cards form two actual columns');
 await page.locator('.native-test-card').evaluateAll(cards=>cards.forEach(c=>c.remove()));
 await page.locator('#lab-boot').waitFor({state:'hidden',timeout:2000});
 assert.equal(await page.locator('#lab-boot').isVisible(),false,'Loading screen leaves when destination is ready');
 await page.evaluate(()=>window.__PV_LAB_COMMAND__({action:'create'}));
 await page.locator('#mobile-add-photo').waitFor({state:'visible'});
 assert.equal(await page.locator('.mobile-image-deck').isVisible(),true,'Create presents an actual image workdeck');
 assert.equal(await page.locator('#image-composer-model').isVisible(),true,'Model is visible without opening advanced settings');
 assert.equal(await page.locator('#image-composer-ratio').isVisible(),true,'Aspect ratio is visible next to model');
 assert.equal(await page.locator('.image-gallery-shell').isVisible(),false,'Create never repeats the Gallery below its workdeck');
 await page.screenshot({path:out+`/create-${width}.png`,fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No horizontal page overflow');
 assert.equal(await page.locator('#composer-moods-grid .moods-card:visible').count()>5,true);
 assert.equal(requests.filter(r=>r.method==='POST').length,0,'Browsing moods must not spend or upload');
 const photo=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=480;c.height=640;const x=c.getContext('2d');x.fillStyle='#283432';x.fillRect(0,0,480,640);x.fillStyle='#b8a496';x.fillRect(150,170,180,320);return c.toDataURL().split(',')[1];}),'base64');
 // Exercise the visible Add photo button and its real file chooser.
 const chooser=page.waitForEvent('filechooser');await page.click('#mobile-add-photo');await (await chooser).setFiles({name:'source.png',mimeType:'image/png',buffer:photo});
 await page.waitForFunction(()=>document.querySelector('#image-composer-references img'));

 // Regression: Dream Blur + one uploaded photo + References Only + Studio 2K.
 await page.locator('#image-reference-mode').evaluate(select=>{
   select.value='references';
   select.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await page.getByRole('button',{name:'Select Dream Blur',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#composer-moods-summary')?.textContent==='Dream Blur');
 assert.equal(await page.locator('#image-composer-resolution').inputValue(),'2k');
 assert.equal(await page.locator('#image-composer-generate').isEnabled(),true,
   'Dream Blur References Only must not exceed prompt budget before a paid click');
 assert.doesNotMatch((await page.locator('#reference-guidance-warning').textContent())||'',
   /exceed.*5,000|characters over limit/i);
 assert.equal(requests.filter(r=>r.method==='POST'&&r.path==='/api/jobs').length,0,
   'Editing a Mood or reference mode must never generate or charge');
 await page.screenshot({path:out+`/dream-blur-ref-only-${width}.png`,fullPage:true});
 await page.locator('#image-reference-mode').evaluate(select=>{
   select.value='base';
   select.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await page.getByRole('button',{name:'Select Hong Kong Nights',exact:true}).click();
 await page.locator('#composer-moods-intensity').fill('80');
 assert.equal(await page.locator('#image-composer-generate').isEnabled(),true);
 await page.screenshot({path:out+`/photo-mood-${width}.png`,fullPage:true});
 await page.click('#mobile-advanced');
 await page.locator('#image-composer-ratio').selectOption('9:16');
 await page.locator('#image-composer-resolution').selectOption('1k');
 await page.click('#mobile-advanced');
 await page.evaluate(()=>window.__PV_LAB_COMMAND__({action:'gallery'}));
 await page.locator('#assets-workspace').waitFor({state:'visible'});
 await page.evaluate(()=>window.__PV_LAB_COMMAND__({action:'create'}));
 assert.equal(await page.locator('#image-composer-ratio').inputValue(),'9:16');
 assert.equal(await page.locator('#image-composer-resolution').inputValue(),'1k');
 assert.equal(await page.locator('#image-composer-references img').count(),1,'Switching views keeps the source image');
 assert.equal(await page.locator('#composer-moods-summary').textContent(),'Hong Kong Nights');
 await page.locator('#image-composer-generate').click();
 await page.waitForFunction(()=>document.querySelector('.card[data-state="queued"]'));
 assert.equal(requests.filter(r=>r.method==='POST'&&r.path==='/api/jobs').length,1,'One tap sends one paid job');
 const q=requests.find(r=>r.path==='/api/quotes').data;
 assert.equal(q.settings.moodId,'hong-kong-nights');assert.equal(q.settings.moodIntensity,80);assert.equal(q.referenceSourceIds.length,5);assert.deepEqual(q.settings.referenceRoles.map(r=>r.role),['base','style','style','style','style']);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:out+`/queued-${width}.png`,fullPage:true});
 await page.evaluate(()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['test-image'],{type:'image/png'}));a.download='test.png';document.body.append(a);a.click();a.remove();});
 await page.waitForFunction(()=>window.__nativeMessages.some(m=>m.type==='PV_LAB_SHARE'&&m.data.startsWith('data:image/png;base64,')));
 await page.goto('http://127.0.0.1:4187/lab/mood-creator.html?native=1');
 await page.waitForFunction(()=>document.querySelector('#mc-signin').hidden);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'My Moods fits the screen');
 await page.screenshot({path:out+`/my-moods-${width}.png`,fullPage:true});
 assert.deepEqual(errors,[]);
 total++;console.log('PASS',width,'native login, upload, mood, intensity, gallery return, one submission');
 await page.close();
}
console.log('PASS',total,'mobile widths. All API traffic mocked. No paid provider calls. Screenshots:',out);
}finally{await browser.close();server.close();}
