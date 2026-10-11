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
  assert.ok(state.backHeight>=43&&state.backHeight<=55&&state.backWidth>=155,
    'Back to Image must be easy to find and click without becoming a bright primary button');
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
    const font=q=>parseFloat(getComputedStyle(document.querySelector(q)).fontSize);
    return {width:innerWidth,height:innerHeight,boardHeight:box('.precision-board').height,
      deckHeight:box('.precision-deck').height,deckBottom:box('.precision-deck').bottom,
      headingSize:font('.precision-head h2'),panelLabelSize:font('#precision-source-title'),
      controlsSize:font('#precision-tool-brush'),promptSize:font('#precision-prompt'),
      footerSize:font('#precision-price-note'),
      dropSize:box('.precision-drop-symbol').width,
      dropVisible:getComputedStyle(document.querySelector('#precision-drop')).display!=='none',
      horizontalOverflow:document.documentElement.scrollWidth-innerWidth};
  });
  if(g.width>=1200&&g.height>=810){
    assert.ok(g.boardHeight>=g.height*.46,'The image panels must dominate the workspace: '+JSON.stringify(g));
    assert.ok(g.deckHeight<=126,'The edit direction deck must be compact, not a second large panel: '+JSON.stringify(g));
    assert.ok(Math.abs(g.height-g.deckBottom)<=32,'The edit deck must rest near the screen bottom: '+JSON.stringify(g));
    assert.ok(g.headingSize>=30,'Retouch title should remain prominent: '+JSON.stringify(g));
    if(g.dropVisible)assert.ok(g.dropSize>=78,'The empty photograph upload target must invite immediate action: '+JSON.stringify(g));
    assert.ok(g.panelLabelSize>=11.5&&g.controlsSize>=11.5&&g.promptSize>=13.5&&g.footerSize>=11,
      'Controls, captions and pricing should be readable and consistent with PV Lab: '+JSON.stringify(g));
  }
  assert.ok(g.horizontalOverflow<=3,'No horizontal scroll allowed: '+JSON.stringify(g));
}
async function imageForm(x){await imageAdvanced(x.page);await x.page.fill('#prompt:visible, #image-composer-prompt:visible',settings.prompt);await x.page.selectOption('#resolution:visible, #image-composer-resolution:visible','2k');await x.page.selectOption('#ratio:visible, #image-composer-ratio:visible','16:9');await x.page.selectOption('#output-format','png');}

try{
  const x=await workspace({width:1240,height:900});
  await x.page.locator('#reference-images').setInputFiles({name:'base.png',mimeType:'image/png',buffer:png});
  await waitRefs(x.page,1);
  await x.page.click('#image-composer-moods');
  const beforeMood=await x.page.evaluate(()=>{
    const modal=document.querySelector('#composer-moods');
    const card=document.querySelector('.moods-card-media');
    const footer=document.querySelector('.moods-footer');
    const slider=document.querySelector('#composer-moods-intensity');
    const action=document.querySelector('#composer-moods-done');
    const box=modal.getBoundingClientRect(),photo=card.getBoundingClientRect();
    return {top:box.top,modalHeight:box.height,footerHeight:footer.getBoundingClientRect().height,
      photoRatio:photo.width/photo.height,sliderHeight:slider.getBoundingClientRect().height,actionHeight:action.getBoundingClientRect().height};
  });
  assert.ok(beforeMood.top>=20,'Moods window must not touch the upper viewport border: '+JSON.stringify(beforeMood));
  assert.ok(Math.abs(beforeMood.photoRatio-1.25)<0.025,'Thumbnails should have taller 5:4 editorial framing: '+JSON.stringify(beforeMood));
  assert.ok(beforeMood.footerHeight<=113,'Footer should not dominate the gallery: '+JSON.stringify(beforeMood));
  assert.ok(beforeMood.sliderHeight>=25&&beforeMood.actionHeight>=40,'Intensity and main button must not shrink: '+JSON.stringify(beforeMood));
  assert.equal(await x.page.locator('#composer-moods-selection').isHidden(),true,'No redundant Select a mood row on open');
  assert.equal(await x.page.locator('#composer-moods-about').isVisible(),true,'About icon must be visible in the header');
  assert.ok(beforeMood.actionHeight>=46,'Main action must be larger: '+JSON.stringify(beforeMood));
  const hongKong=x.page.locator('.moods-card[aria-label="Select Hong Kong Nights"]');
  await hongKong.click();
  assert.equal(await x.page.locator('#composer-moods-selection').isVisible(),true);
  assert.equal(await x.page.locator('#composer-moods-summary').innerText(),'Hong Kong Nights');
  assert.equal(await hongKong.getAttribute('aria-pressed'),'true');
  await hongKong.click();
  assert.equal(await hongKong.getAttribute('aria-pressed'),'false','Clicking the selected mood again deselects it.');
  assert.equal(await x.page.locator('#composer-moods-selection').isHidden(),true);
  assert.equal(await x.page.locator('#composer-moods-summary').textContent(),'');
  assert.equal(await x.page.locator('#composer-moods-done').isDisabled(),true);
  await hongKong.click();
  await x.page.locator('#composer-moods-done').click();
  assert.equal(await x.page.locator('#image-composer-moods-clear').isVisible(),true,'Active mood must have a direct removal control');
  await x.page.evaluate(()=>{const el=document.querySelector('#image-engine');el.value='gemini';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await x.page.waitForFunction(()=>document.querySelector('#image-composer-model-label')?.textContent.includes('Nano'));
  const state=await x.page.evaluate(()=>{
    const controls=document.querySelector('.composer-controls'),box=controls.getBoundingClientRect();
    const ids=['image-composer-add','image-composer-model','image-composer-edit-area','image-composer-moods','composer-reference-intent-toggle','image-composer-ratio','image-composer-resolution','image-composer-count','image-composer-more'];
    const visible=ids.map(id=>document.getElementById(id)).filter(el=>el&&!el.hidden&&el.getClientRects().length);
    const rects=visible.map(el=>({id:el.id,left:el.getBoundingClientRect().left,top:el.getBoundingClientRect().top,right:el.getBoundingClientRect().right}));
    const generate=document.getElementById('image-composer-generate');
    return {rects,right:box.right,disabled:generate.disabled,title:generate.title,reason:document.getElementById('composer-generation-reason').textContent};
  });
  console.log('NANO_MOOD_LAYOUT_DIAGNOSTICS='+JSON.stringify(state));
  assert.equal(state.disabled,false,'An idle workspace with one base and a supported mood must enable Nano: '+JSON.stringify(state));
  assert.ok(state.rects.every(rect=>Math.abs(rect.top-state.rects[0].top)<4),'Nano controls wrapped: '+JSON.stringify(state));
  assert.ok(state.rects.every(rect=>rect.right<=state.right+3),'Nano controls overflowed: '+JSON.stringify(state));
  await x.page.click('#image-composer-moods-clear');
  assert.equal(await x.page.locator('#image-composer-moods-clear').isVisible(),false);
  assert.equal(await x.page.locator('#image-composer-moods').innerText(),'✦ Moods');
  assert.equal(await x.page.locator('#reference-list .reference-item').count(),1,'Clearing mood must keep base');
  assert.equal(await x.page.locator('#image-composer-generate').isEnabled(),true);
  await x.context.close();

  const y=await workspace({width:1240,height:900,quoteDelay:2600});
  await y.page.locator('#reference-images').setInputFiles({name:'base.png',mimeType:'image/png',buffer:png});
  await waitRefs(y.page,1);
  await y.page.fill('#image-composer-prompt','A portrait on a velvet sofa.');
  const before=await y.page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height);
  await y.page.click('#image-composer-generate');
  await y.page.waitForFunction(()=>document.getElementById('image-composer-generate')?.disabled===true);
  const during=await y.page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height);
  assert.equal(await y.page.locator('#composer-generation-block').isHidden(),true,'Duplicate warning must not add a new row');
  assert.ok(Math.abs(during-before)<=3,'Composer resized while request prepared: '+JSON.stringify({before,during}));
  await waitAccepted(y,1);
  const after=await y.page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height);
  assert.ok(Math.abs(after-before)<=3,'Composer resized after job was queued: '+JSON.stringify({before,during,after}));
  assert.deepEqual([...x.errors,...y.errors],[],'No browser-side exceptions');
  console.log('COMPOSER_MOOD_LAYOUT_BROWSER_CHECKS_PASSED=1');
  await y.context.close();
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
