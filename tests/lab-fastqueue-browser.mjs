async function clickAdvanced(page){await page.evaluate(()=>document.querySelector('#image-composer-more').click());}
async function chooseImageModel(page,value){await page.click('#image-composer-model');await page.click('.composer-model-option[data-value="'+value+'"]');await clickAdvanced(page);}
async function imageAdvanced(page){await page.click('#tool-image');const open=await page.locator('#app').evaluate(el=>el.classList.contains('image-settings-open'));if(!open){const control=page.locator('#image-composer-more');if(await control.isVisible())await control.click();else await page.evaluate(()=>document.querySelector('#image-composer-more').click());}}
// Mock-only browser verification. No real credentials, private media or paid generations.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf("try{const {Clerk}=await import(");const bootEnd=source.indexOf("\n// Soul composer:",boot);assert.ok(boot>0&&bootEnd>boot);
const testSource=source.slice(0,boot)+source.slice(bootEnd)+`clerk={isSignedIn:true,user:{id:'test'},session:{id:'synthetic-session',getToken:async()=> 'synthetic-token'},signOut:async()=>{}};owner=true;userId='test';config={enabled:true,geminiEnabled:true,falEnabled:true,dailyLimitUsd:10,concurrency:{image:4,video:1}};$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();await loadSoulProIdentity();await restoreStudioEntry();update();window.__labTest={lock,setBusy:value=>{busy=!!value;update();},setCustomerMode:value=>{customerMode=!!value;update();}};`;
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const path=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'text/plain');res.end(pathname==='/lab/lab.js'?testSource:readFileSync(path));});
await new Promise(r=>server.listen(4179,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const ORIGIN='http://127.0.0.1:4179',API='https://parallel-vision-lab.parallelvision.workers.dev';
let passed=0,png;const ok=name=>{passed++;console.log('PASS '+name);};
const id=n=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
const settings={type:'image',mode:'image',prompt:'A ceramic sculpture in soft daylight.',resolution:'2k',aspectRatio:'16:9',outputFormat:'png',referenceRoles:[],referenceSourceIds:[]};
async function workspace({failure='',width=1440,height=1000,initial=[],savedPacks=[],quoteDelay=0,historyDelay=0}={}){
 const context=await browser.newContext({viewport:{width,height},acceptDownloads:true}),page=await context.newPage();
 const requests=[],errors=[],dialogs=[],jobs=[...initial],quotes=new Map();let sequence=100,accepted=0,renewed=false,historyGets=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
 await context.route('https://**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(!url.href.startsWith(API)){await route.abort();return;}
  const path=url.pathname,method=req.method(),data=req.headers()['content-type']?.startsWith('application/json')?req.postDataJSON():{};
  requests.push({path,method,data});
  const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/api/jobs'&&method==='GET'){historyGets++;if(historyDelay&&historyGets>1)await new Promise(r=>setTimeout(r,historyDelay));return send({jobs,activeJobs:jobs.filter(j=>['queued','running','saving','uncertain','submitting'].includes(j.status)),concurrency:{image:4,video:1},next:null});}
  if(path==='/api/jobs/bulk-delete'&&method==='POST'){const ids=data.ids||[];let deleted=0;for(let i=jobs.length-1;i>=0;i--)if(ids.includes(jobs[i].id)&&!['queued','running','saving','uncertain','submitting'].includes(jobs[i].status)){jobs.splice(i,1);deleted++;}return send({ok:true,deleted});}
  if(path.startsWith('/api/jobs/')&&path.endsWith('/recover')&&method==='POST'){const job=jobs.find(j=>path.includes('/'+j.id+'/recover'));if(!job)return send({error:'Not found.'},404);job.status='completed';job.outputId=job.id;job.error='';return send({job});}
  if(path==='/api/packs')return send({packs:savedPacks});
  if(path==='/api/soul-pro/identity'&&method==='GET')return send({configured:true,count:2,refs:[{id:id(950),name:'nina-front.png'},{id:id(951),name:'nina-three-quarter.png'}]});
  if(path==='/api/soul-pro/identity'&&method==='POST')return send({configured:true,count:(data.referenceSourceIds||[]).length||1,refs:[]},201);
  if(path==='/api/soul-pro/identity'&&method==='DELETE')return send({configured:false,count:0,refs:[]});
  if(path==='/api/uploads')return send({id:id(sequence++)},201);
  if(path.startsWith('/api/assets/'))return route.fulfill({status:200,contentType:'image/png',body:png});
  if(path==='/api/drafts'){const job={id:id(sequence++),sourceId:data.sourceId,settings:{...data.settings,referenceSourceIds:data.referenceSourceIds||[]},status:'draft',createdAt:Date.now()};jobs.unshift(job);return send({job},201);}
  if(path==='/api/fal/pose-preview'&&method==='POST')return send({assetId:id(sequence++),billingNote:'synthetic preview'},201);
  if(path==='/api/fal/soul-pro'&&method==='POST'){
    const ideogramCosts={very_low:.008,low:.03,medium:.06,high:.22};const job={id:id(sequence++),sourceId:data.sourceId,settings:{...data.settings,referenceSourceIds:data.referenceSourceIds||[]},status:'queued',createdAt:Date.now(),estimatedUsd:data.settings.soulProModel==='kontextmax'?0.08:(ideogramCosts[data.settings.soulProQuality]??.06),providerTaskId:'fal-soulpro-synthetic'};
    accepted++;jobs.unshift(job);return send({job},202);
  }
  if(path==='/api/fal/controlled-pose'&&method==='POST'){
    const job={id:id(sequence++),sourceId:data.referenceSourceIds?.[0]||null,settings:{...data.settings,referenceSourceIds:data.referenceSourceIds||[],poseMapSourceId:data.poseMapSourceId||null},status:'queued',createdAt:Date.now(),estimatedUsd:0.075,providerTaskId:'fal-synthetic'};
    accepted++;jobs.unshift(job);return send({job},202);
  }
  if(path==='/api/fal/repair'&&method==='POST'){
    const job={id:id(sequence++),sourceId:data.sourceId,settings:{...data.settings,referenceSourceIds:data.referenceSourceIds||[]},status:'queued',createdAt:Date.now(),estimatedUsd:0.075,providerTaskId:'fal-repair-synthetic'};
    accepted++;jobs.unshift(job);return send({job},202);
  }
  if(path==='/api/quotes'){
   if(quoteDelay)await new Promise(r=>setTimeout(r,quoteDelay));
   if(failure==='quote')return send({error:'Provider quote unavailable. No generation submitted.'},502);
   const makeQuote=()=>{
    const q={id:id(sequence++),estimatedUsd:0.036,maxUsd:0.036,expiresAt:Date.now()+(failure==='expired'?-1:180000),settings:{...data.settings,mode:failure==='wrong-model'?(data.settings.mode==='upscale'?'image':'upscale'):data.settings.mode,referenceSourceIds:data.referenceSourceIds||[],transferNotes:[]}};
    quotes.set(q.id,{q,data});return q;
   };
   if(data.count!==undefined){
    assert.ok(Number.isInteger(data.count)&&data.count>=2&&data.count<=4);
    return send({quotes:Array.from({length:data.count},makeQuote)});
   }
   return send(makeQuote());
  }
  if(path==='/api/jobs'&&method==='POST'){
   if(failure==='auth'&&!renewed){renewed=true;return send({error:'Sign-in expired or invalid. Please sign in again.'},401);}
   if(failure==='network')return route.abort('connectionfailed');
   if(failure==='budget')return send({error:'Daily spending limit reached. No generation submitted.'},409);
   if(failure==='server')return send({error:'Temporary server failure. Check History.'},502);
   assert.equal(data.confirm,true);const entry=quotes.get(data.quoteId);assert.ok(entry);
   const job={id:id(sequence++),sourceId:entry.data.sourceId,settings:entry.q.settings,status:'queued',createdAt:Date.now(),estimatedUsd:0.036,providerTaskId:'synthetic-job'};
   accepted++;jobs.unshift(job);return send({job},202);
  }
  if(path.startsWith('/api/jobs/')&&method==='GET'){const job=jobs.find(j=>path.endsWith('/'+j.id));return job?send({job}):send({error:'Not found.'},404);}
  return send({error:'Unmocked request '+path},404);
 });
 await page.goto(ORIGIN+'/lab/studio.html?tool=image');
 try{await page.waitForFunction(()=>!!window.__labTest,undefined,{timeout:12000});}
 catch(e){console.error('IMAGE_STUDIO_BOOT_DIAGNOSTICS',JSON.stringify({url:page.url(),title:await page.title(),errors,requests:requests.slice(0,9),scripts:await page.locator('script[src]').evaluateAll(a=>a.map(el=>el.src))}));throw e;}
 if(!png)png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=320;const x=c.getContext('2d');x.fillStyle='#333';x.fillRect(0,0,320,320);x.fillStyle='#aaa';x.fillRect(75,75,170,170);return c.toDataURL().split(',')[1];}),'base64');
 return {page,context,requests,errors,dialogs,jobs,accepted:()=>accepted};
}
const count=(x,path,method='POST')=>x.requests.filter(r=>r.path===path&&r.method===method).length;
const ready=page=>page.waitForFunction(()=>!document.querySelector('#resolution').disabled);
const waitAccepted=async(x,n)=>{const until=Date.now()+7000;while(x.accepted()<n&&Date.now()<until)await new Promise(r=>setTimeout(r,40));};
const waitRefs=(page,n)=>page.waitForFunction(expected=>document.querySelectorAll('#reference-list .reference-item').length===expected,n);
async function retouchTopAndBackButton(page){
  await page.waitForFunction(()=>window.scrollY<2);
  const state=await page.evaluate(()=>{
    const head=document.querySelector('.precision-head').getBoundingClientRect();
    const header=document.querySelector('#studio-header').getBoundingClientRect();
    const button=document.querySelector('#precision-return');
    const box=button.getBoundingClientRect(),style=getComputedStyle(button);
    return {y:window.scrollY,headTop:head.top,headHeight:head.height,
      boardTop:document.querySelector('.precision-board').getBoundingClientRect().top,
      headerBottom:header.bottom,
      backTop:box.top,backBottom:box.bottom,backHeight:box.height,backWidth:box.width,
      bg:style.backgroundColor,label:button.textContent.trim(),viewport:window.innerHeight};
  });
  assert.ok(state.y<2,'Retouch must open at scroll position zero');
  assert.ok(state.headTop>=state.headerBottom-3,'Retouch title must be visible below the sticky header');
  assert.ok(state.backTop>=state.headerBottom-3&&state.backBottom<=state.viewport,
    'Back to Image must be immediately visible without scrolling');
  assert.ok(state.backHeight>=35&&state.backHeight<=42&&state.backWidth>=125,
    'Back to Image must be a compact secondary navigation control');
  const rgb=(state.bg.match(/[\d.]+/g)||[]).map(Number);
  assert.ok(rgb.length===3&&rgb.every(v=>v>=30&&v<=75),
    'Back to Image must use a neutral dark PV Lab background: '+state.bg);
  assert.ok(state.headHeight>=75&&state.headHeight<=130&&state.boardTop-state.headerBottom<165,
    'Retouch needs a legible title while keeping the photo panels near the top: '+JSON.stringify(state));
  assert.match(state.label,/Back to Image/);
}
async function retouchPanelsAreClear(page){
  const g=await page.evaluate(()=>{
    const box=selector=>{
      const {top,bottom,height}=document.querySelector(selector).getBoundingClientRect();
      return {top,bottom,height};
    };
    return {board:box('.precision-board'),left:box('.precision-input-panel'),
      right:box('.precision-output-panel'),source:box('#precision-stage'),sourceCanvas:box('#precision-source-canvas'),
      leftFooter:box('.precision-input-footer'),rightFooter:box('.precision-compare-row'),
      toolbar:box('.precision-tools'),deck:box('.precision-deck')};
  });
  assert.ok(g.leftFooter.bottom<=g.left.bottom+1,'Photo instructions clipped inside image panel: '+JSON.stringify(g));
  assert.ok(g.rightFooter.bottom<=g.right.bottom+1,'Before/After controls clipped inside result panel: '+JSON.stringify(g));
  assert.ok(g.source.bottom<=g.leftFooter.top+1,'Photo overlaps selection instructions: '+JSON.stringify(g));
  if(g.sourceCanvas.height>0){assert.ok(g.sourceCanvas.bottom<=g.source.bottom+2,'Photo clips inside source stage: '+JSON.stringify(g));}
  assert.ok(g.leftFooter.bottom+6<=g.toolbar.top,'Toolbar overlaps selection instructions: '+JSON.stringify(g));
  assert.ok(g.rightFooter.bottom+6<=g.toolbar.top,'Toolbar overlaps Before/After controls: '+JSON.stringify(g));
  assert.ok(g.toolbar.bottom+6<=g.deck.top,'Edit directions overlap toolbar: '+JSON.stringify(g));
}
async function retouchFillsDesktop(page){
  const g=await page.evaluate(()=>{
    const box=q=>document.querySelector(q).getBoundingClientRect();
    return {width:innerWidth,height:innerHeight,boardHeight:box('.precision-board').height,
      deckBottom:box('.precision-deck').bottom,
      headingSize:parseFloat(getComputedStyle(document.querySelector('.precision-head h2')).fontSize),
      dropSize:box('.precision-drop-symbol').width,
      dropVisible:getComputedStyle(document.querySelector('#precision-drop')).display!=='none',
      horizontalOverflow:document.documentElement.scrollWidth-innerWidth};
  });
  if(g.width>900&&g.height>=810){
    assert.ok(g.boardHeight>=Math.min(400,g.height*.43),'The image panels should dominate Retouch: '+JSON.stringify(g));
    assert.ok(Math.abs(g.height-g.deckBottom)<=32,'The edit direction deck should sit at the bottom of the screen: '+JSON.stringify(g));
    assert.ok(g.headingSize>=30,'Retouch title should be visually prominent: '+JSON.stringify(g));
    if(g.dropVisible)assert.ok(g.dropSize>=78,'The empty photograph upload target should invite immediate action: '+JSON.stringify(g));
  }
  assert.ok(g.horizontalOverflow<=3,'No horizontal scroll allowed: '+JSON.stringify(g));
}
async function imageForm(x){await imageAdvanced(x.page);await x.page.fill('#prompt:visible, #image-composer-prompt:visible',settings.prompt);await x.page.selectOption('#resolution:visible, #image-composer-resolution:visible','2k');await x.page.selectOption('#ratio:visible, #image-composer-ratio:visible','16:9');await x.page.selectOption('#output-format','png');}

try{
  const x=await workspace({quoteDelay:3500});
  await x.page.fill('#image-composer-prompt','A portrait, warm evening tones.');
  await x.page.locator('#reference-images').setInputFiles({name:'base.png',mimeType:'image/png',buffer:png});
  await waitRefs(x.page,1);
  await ready(x.page);
  await x.page.locator('#image-composer-generate').click();
  await x.page.waitForFunction(()=>document.querySelectorAll('[data-local-submission]').length===1);
  assert.equal(x.accepted(),0,'A local preparation card must not imply the provider has queued a job');
  assert.equal(await x.page.locator('#image-composer-generate').isDisabled(),true,'Identical draft is guarded while its quote is preparing');
  assert.match(await x.page.locator('[data-local-submission]').first().innerText(),/preparing|uploading|checking/i);
  const firstQuote=x.requests.find(req=>req.path==='/api/quotes');
  assert.ok(firstQuote,'Provider quote request must have started without a paid submission');
  await x.page.fill('#image-composer-prompt','A portrait, cool moonlit tones.');
  await x.page.waitForFunction(()=>!document.getElementById('image-composer-generate').disabled,undefined,{timeout:2500});
  assert.equal(x.accepted(),0,'Composer unlocks before the first provider submission');
  await x.page.locator('#image-composer-generate').click();
  await x.page.waitForFunction(()=>document.querySelectorAll('[data-local-submission]').length>=2);
  assert.equal(x.accepted(),0,'Both local preparation cards precede provider acknowledgement');
  await waitAccepted(x,2);
  assert.equal(x.accepted(),2,'Two distinct requests eventually enter the real server Queue');
  const quotes=x.requests.filter(req=>req.path==='/api/quotes'&&req.method==='POST');
  assert.equal(quotes.length,2);
  assert.match(quotes[0].data.settings.prompt,/warm evening/);
  assert.match(quotes[1].data.settings.prompt,/cool moonlit/);
  assert.equal(x.requests.filter(req=>req.path==='/api/jobs'&&req.method==='POST').length,2);
  await x.page.waitForFunction(()=>!document.querySelector('#image-composer-generate').disabled,undefined,{timeout:2500});
  assert.deepEqual(x.errors,[],'No browser-side exceptions');
  console.log('FAST_IMAGE_QUEUE_BROWSER_CHECKS_PASSED=1');
  await x.context.close();
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
