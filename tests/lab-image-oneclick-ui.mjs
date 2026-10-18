async function clickAdvanced(page){await page.evaluate(()=>document.querySelector('#image-composer-more').click());}
// Preserve coverage for saved FAL identities; the public Soul entry now defaults to Higgsfield Soul 2.
async function chooseImageModel(page,value){await page.click('#image-composer-model');await page.click('.composer-model-option[data-value="'+value+'"]');if(value==='soulpro'){await page.evaluate(()=>{const model=document.querySelector('#soul-pro-model');model.value='ideogram45';model.dispatchEvent(new Event('change',{bubbles:true}));});}await clickAdvanced(page);}
async function imageAdvanced(page){await page.click('#tool-image');const open=await page.locator('#app').evaluate(el=>el.classList.contains('image-settings-open'));if(!open){const control=page.locator('#image-composer-more');if(await control.isVisible())await control.click();else await page.evaluate(()=>document.querySelector('#image-composer-more').click());}}
// Mock-only browser verification. No real credentials, private media or paid generations.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf("try{clerk=await loadLabAccount();");const bootEnd=source.indexOf("\n// Soul composer:",boot);assert.ok(boot>0&&bootEnd>boot);
const testSource=source.slice(0,boot)+source.slice(bootEnd)+`clerk={isSignedIn:true,user:{id:'test'},session:{id:'synthetic-session',getToken:async()=> 'synthetic-token'},signOut:async()=>{}};owner=true;userId='test';config={enabled:true,geminiEnabled:true,falEnabled:true,dailyLimitUsd:10,videoEngines:['wan','seedance'],concurrency:{image:4,video:1}};$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();await loadSoulProIdentity();await restoreStudioEntry();update();window.__labTest={lock,settled:()=>!busy&&!imageSubmissionPending&&!fastImageHandoff.active(),setBusy:value=>{busy=!!value;update();},setCustomerMode:value=>{customerMode=!!value;update();}};`;
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const path=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'text/plain');res.end(pathname==='/lab/lab.js'?testSource:readFileSync(path));});
await new Promise(r=>server.listen(4179,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const ORIGIN='http://127.0.0.1:4179',API='https://parallel-vision-lab.parallelvision.workers.dev';
let passed=0,png;const ok=name=>{passed++;console.log('PASS '+name);};
const id=n=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
const settings={type:'image',mode:'image',prompt:'A ceramic sculpture in soft daylight.',resolution:'2k',aspectRatio:'16:9',outputFormat:'png',referenceRoles:[],referenceSourceIds:[]};
async function workspace({failure='',width=1440,height=1000,initial=[],savedPacks=[],quoteDelay=0,historyDelay=0,packPreviewGate=null,brokenPreviewAssets=[]}={}){
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
  if(path==='/api/packs'&&method==='GET')return send({packs:savedPacks});
  if(path==='/api/packs'&&method==='POST'){
    const refs=(data.referenceSourceIds||[]).map((assetId,index)=>({
      id:assetId,name:data.referenceRoles?.[index]?.name||('source-'+index+'.png'),
      role:data.referenceRoles?.[index]?.role||'none',note:data.referenceRoles?.[index]?.note||''
    }));
    const pack={id:id(sequence++),name:data.name,refs};
    savedPacks.push(pack);return send(pack,201);
  }
  if(path.startsWith('/api/packs/')&&method==='DELETE'){
    const target=path.split('/').at(-1),index=savedPacks.findIndex(pack=>pack.id===target);
    if(index<0)return send({error:'Pack not found'},404);
    savedPacks.splice(index,1);return send({ok:true});
  }
  if(path==='/api/soul-pro/identity'&&method==='GET')return send({configured:true,count:2,refs:[{id:id(950),name:'nina-front.png'},{id:id(951),name:'nina-three-quarter.png'}]});
  if(path==='/api/soul-pro/identity'&&method==='POST')return send({configured:true,count:(data.referenceSourceIds||[]).length||1,refs:[]},201);
  if(path==='/api/soul-pro/identity'&&method==='DELETE')return send({configured:false,count:0,refs:[]});
  if(path==='/api/uploads')return send({id:id(sequence++)},201);
  if(path.startsWith('/api/assets/')){
   if(path.endsWith('/thumbnail')&&packPreviewGate)await packPreviewGate;
   if(brokenPreviewAssets.some(id=>path.includes('/'+id)))return send({error:'Preview unavailable'},404);
   return route.fulfill({status:200,contentType:'image/png',body:png});
  }
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
    const premiumUpscale=data.settings.mode==='upscale'&&data.settings.upscaleEngine==='seedvr2';
     const upscaleSize=320*(Number(data.settings.scale)||2);
     const q={id:id(sequence++),estimatedUsd:premiumUpscale?.001:0.036,maxUsd:premiumUpscale?.001:0.036,expiresAt:Date.now()+(failure==='expired'?-1:180000),...(premiumUpscale?{provider:'fal.ai',priceIsEstimate:true,requiresPriceReview:true,creditCost:Number(data.settings.scale)===4?18:10}:{}),settings:{...data.settings,...(data.settings.type==='video'?{model:'bytedance/seedance-2.5/'+({start:'image-to-video',text:'text-to-video',reference:'reference-to-video'})[data.settings.mode]}:{}),...(premiumUpscale?{model:'fal-ai/seedvr/upscale/image',type:'image',mode:'upscale',sourceWidth:320,sourceHeight:320,targetWidth:upscaleSize,targetHeight:upscaleSize}:{}),mode:failure==='wrong-model'?(data.settings.mode==='upscale'?'image':'upscale'):data.settings.mode,referenceSourceIds:data.referenceSourceIds||[],transferNotes:[]}};
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
const ready=page=>page.waitForFunction(()=>!document.querySelector('#resolution').disabled&&window.__labTest.settled());
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
async function setLegacyOutputFormat(page,value){
  // Legacy output controls are hidden behind the modern Image composer.
  // Exercise the retained change handler without treating the select as visible UI.
  await page.locator('#output-format').evaluate((element,next)=>{
    element.value=next;element.dispatchEvent(new Event('change',{bubbles:true}));
  },value);
}
async function imageForm(x){
  await imageAdvanced(x.page);
  await x.page.fill('#prompt:visible, #image-composer-prompt:visible',settings.prompt);
  // Web mobile puts resolution and image count behind More; open it as a user would.
  const mobileMore=x.page.locator('#image-composer-mobile-more');
  if(await mobileMore.isVisible()&&!await x.page.locator('#image-composer-resolution').isVisible())await mobileMore.click();
  await x.page.selectOption('#resolution:visible, #image-composer-resolution:visible','2k');
  await x.page.selectOption('#ratio:visible, #image-composer-ratio:visible','16:9');
  await setLegacyOutputFormat(x.page,'png');
}
try{
 let x;
 // Retouch is a true route, not an overlay that forgets Image settings.
 {
  x=await workspace();
  await x.page.fill('#image-composer-prompt','A soft gray studio portrait.');
  await x.page.locator('#reference-images').setInputFiles({name:'retouch-base.png',mimeType:'image/png',buffer:png});
  await waitRefs(x.page,1);await ready(x.page);
  const before=await x.page.evaluate(()=>({
    prompt:document.querySelector('#image-composer-prompt').value,
    ratio:document.querySelector('#image-composer-ratio').value,
    model:document.querySelector('#image-composer-model-label').textContent.trim(),
    role:document.querySelector('#reference-list .reference-item select')?.value||''
  }));
  // Reproduce the old bug by starting from an already scrolled Image page.
  await x.page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  await x.page.click('#image-composer-edit-area');
  await x.page.waitForFunction(()=>document.getElementById('app').classList.contains('retouch-studio-active')&&
    !document.getElementById('precision-source-holder').hidden);
  await retouchTopAndBackButton(x.page);
  await retouchPanelsAreClear(x.page);
  await retouchFillsDesktop(x.page);
  assert.match(x.page.url(),/tool=retouch/);
  assert.equal(await x.page.locator('#tool-retouch').getAttribute('aria-pressed'),'true');
  assert.equal(await x.page.locator('#tool-image').getAttribute('aria-pressed'),'false');
  assert.equal(await x.page.locator('#precision-source-holder').isVisible(),true);
  assert.match(await x.page.locator('#precision-source-meta').innerText(),/retouch-base\.png/);
  assert.equal(count(x,'/api/uploads'),0,'Opening Retouch must reuse the local image without uploading it');
  await x.page.goBack();
  await x.page.waitForFunction(()=>!document.getElementById('app').classList.contains('retouch-studio-active'));
  assert.match(x.page.url(),/tool=image/);
  assert.equal(await x.page.locator('#image-composer').isVisible(),true);
  assert.deepEqual(await x.page.evaluate(()=>({
    prompt:document.querySelector('#image-composer-prompt').value,
    ratio:document.querySelector('#image-composer-ratio').value,
    model:document.querySelector('#image-composer-model-label').textContent.trim(),
    role:document.querySelector('#reference-list .reference-item select')?.value||''
  })),before,'Image sources, prompt, model and ratio must remain untouched');
  await x.page.click('#tool-retouch');
  assert.match(x.page.url(),/tool=retouch/);
  await retouchTopAndBackButton(x.page);
  await x.page.click('#precision-return');
  await x.page.waitForFunction(()=>new URL(location.href).searchParams.get('tool')==='image');
  assert.equal(await x.page.locator('#tool-image').getAttribute('aria-pressed'),'true');
  assert.equal(count(x,'/api/jobs'),0,'Navigation must not authorize a paid generation');
  assert.equal(count(x,'/api/precision/segment'),0,'Navigation must not start Magic Select');
  // Direct Retouch URLs must not rely on a previous Image navigation entry.
  await x.page.goto(ORIGIN+'/lab/studio.html?tool=retouch');
  await x.page.waitForFunction(()=>document.getElementById('app').classList.contains('retouch-studio-active'));
  await retouchTopAndBackButton(x.page);
  await retouchFillsDesktop(x.page);
  assert.equal(await x.page.locator('#precision-drop').isVisible(),true);
  // A new file after an empty Retouch view changes the board height. Even
  // when previously scrolled, the editor must reset and keep footers clear.
  await x.page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  await x.page.locator('#precision-photo-input').setInputFiles({name:'imported-in-retouch.png',mimeType:'image/png',buffer:png});
  await x.page.waitForFunction(()=>document.getElementById('precision-source-meta').textContent.includes('imported-in-retouch.png'));
  await x.page.waitForTimeout(100);
  await retouchTopAndBackButton(x.page);
  await retouchPanelsAreClear(x.page);
  // Real 3:2 source dimensions must grow the board, not overlap its footers.
  await x.page.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=2200;canvas.height=1450;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#34323b';ctx.fillRect(0,0,2200,1450);
    ctx.fillStyle='#e6d4c2';ctx.fillRect(500,250,1100,900);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    const transfer=new DataTransfer();
    transfer.items.add(new File([blob],'large-landscape-reference.png',{type:'image/png'}));
    const input=document.querySelector('#precision-photo-input');
    input.files=transfer.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await x.page.waitForFunction(()=>document.querySelector('#precision-source-meta').textContent.includes('large-landscape-reference.png'));
  await x.page.waitForTimeout(120);
  await retouchTopAndBackButton(x.page);
  await retouchPanelsAreClear(x.page);
  await retouchFillsDesktop(x.page);
  for(const viewport of [{width:1800,height:828},{width:1440,height:900}]){
    await x.page.setViewportSize(viewport);
    await x.page.waitForTimeout(80);
    await retouchFillsDesktop(x.page);
    await retouchPanelsAreClear(x.page);
  }
  await x.page.setViewportSize({width:1440,height:1000});
  await x.page.click('#precision-return');
  assert.match(x.page.url(),/tool=image/);
  // Public customers can inspect Retouch, but no metered service is enabled.
  await x.page.evaluate(()=>window.__labTest.setCustomerMode(true));
  await x.page.click('#tool-retouch');
  assert.equal(await x.page.locator('#precision-access-note').isVisible(),true);
  assert.equal(await x.page.locator('#precision-tool-magic').isDisabled(),true);
  assert.equal(await x.page.locator('#precision-generate').isDisabled(),true);
  assert.equal(count(x,'/api/precision/segment'),0);
  await x.page.click('#precision-return');
  await x.page.evaluate(()=>window.__labTest.setCustomerMode(false));
  ok('Retouch route, native Back, direct URL and customer preview preserve safe Image state');
  assert.deepEqual(x.errors,[]);await x.context.close();
 }
 // A completed-image viewer must open Retouch even while the source asset is fetched.
 // This catches an accidental busy-state guard that makes the shortcut do nothing.
 {
  const completed={id:id(880),status:'completed',sourceId:id(881),outputId:id(882),
    settings:{type:'image',provider:'spicy',engine:'seedream',mode:'image',prompt:'Editorial still.',
      resolution:'1k',aspectRatio:'1:1',referenceSourceIds:[],referenceRoles:[]},
    createdAt:Date.now(),estimatedUsd:.02};
  x=await workspace({initial:[completed]});
  await x.page.locator('#history .card[data-state="completed"]').first().click();
  await x.page.locator('#image-detail-extra summary').click();
  await x.page.locator('#image-detail-edit-area').click();
  await x.page.waitForFunction(()=>document.getElementById('app').classList.contains('retouch-studio-active')&&
    !document.getElementById('precision-source-holder').hidden);
  await x.page.waitForTimeout(100);
  await retouchTopAndBackButton(x.page);
  await retouchPanelsAreClear(x.page);
  assert.match(x.page.url(),/tool=retouch/);
  assert.match(await x.page.locator('#precision-source-meta').textContent(),/retouch-original/);
  assert.equal(count(x,'/api/precision/submit'),0);
  assert.equal(count(x,'/api/uploads'),0);
  await x.page.click('#precision-return');
  await x.page.waitForFunction(()=>new URL(location.href).searchParams.get('tool')==='image');
  ok('Completed image opens in Retouch without uploading twice or paying');
  assert.deepEqual(x.errors,[]);await x.context.close();
 }
 if(!process.env.PV_RETOUCH_NAV_ONLY){
 // Upload preparation must not grow a temporary third status row in the deck.
 {
  x=await workspace({width:1440});
  await x.page.fill('#image-composer-prompt','Soft pastel film portrait.');
  const dock=x.page.locator('#image-composer');
  const idleHeight=await dock.evaluate(el=>el.getBoundingClientRect().height);
  await x.page.evaluate(()=>window.__labTest.setBusy(true));
  assert.equal(await x.page.locator('#composer-generation-block').isVisible(),false,'Preparation must not add a status row');
  const busyHeight=await dock.evaluate(el=>el.getBoundingClientRect().height);
  assert.ok(Math.abs(busyHeight-idleHeight)<1,'Deck must remain the same height while a photo is prepared');
  await x.page.evaluate(()=>window.__labTest.setBusy(false));
  await x.page.locator('#reference-images').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:png});
  await waitRefs(x.page,1);await ready(x.page);
  assert.equal(await x.page.locator('#composer-generation-block').isVisible(),false,'Loaded reference must not leave preparation status inside the deck');
  await x.page.evaluate(()=>window.__labTest.setBusy(true));
  assert.equal(await x.page.locator('#composer-generation-block').isVisible(),false,'Repeat preparation must not grow the loaded deck');
  await x.page.evaluate(()=>window.__labTest.setBusy(false));
  ok('Image deck keeps its geometry during upload preparation');
  assert.deepEqual(x.errors,[]);await x.context.close();
 }
 if(!process.env.PV_REFERENCE_FLOW_ONLY){
 x=await workspace();await imageForm(x);assert.equal(await x.page.locator('#generate').innerText(),'Generate');assert.match(await x.page.locator('#generation-help').innerText(),/one paid image/);
 await clickAdvanced(x.page);await x.page.click('#image-composer-generate');await ready(x.page);assert.equal(x.accepted(),1);assert.equal(count(x,'/api/quotes'),1);assert.equal(count(x,'/api/jobs'),1);assert.equal(await x.page.locator('#quote-dialog').isVisible(),false);assert.deepEqual(x.dialogs,[]);
 const q=x.requests.find(r=>r.path==='/api/quotes').data;assert.equal(q.settings.prompt,settings.prompt);assert.equal(q.settings.resolution,'2k');assert.equal(q.settings.aspectRatio,'16:9');assert.equal(q.settings.outputFormat,'png');ok('Text-to-image: one click, one quote, one submission, no review modal');
 await clickAdvanced(x.page);await x.page.click('#save');await ready(x.page);assert.equal(x.accepted(),1);const draft=x.page.locator('.card[data-state="draft"]');await clickAdvanced(x.page);await draft.click();await x.page.click('#image-detail-reuse');await ready(x.page);await clickAdvanced(x.page);assert.equal(await x.page.locator('#prompt').inputValue(),settings.prompt);assert.equal(x.accepted(),1);ok('Saving and reusing a draft do not generate or charge');assert.deepEqual(x.errors,[]);await x.context.close();

  x=await workspace();await imageForm(x);
  await x.page.selectOption('#image-composer-count','2');
  await x.page.click('#image-composer-generate');await waitAccepted(x,2);await ready(x.page);
  if(x.accepted()!==2)console.error('BATCH_IMAGE_DIAG',JSON.stringify({accepted:x.accepted(),requests:x.requests.filter(r=>['/api/quotes','/api/jobs'].includes(r.path)),errors:x.errors,notice:await x.page.locator('#notice').innerText(),disabled:await x.page.locator('#image-composer-generate').isDisabled(),count:await x.page.locator('#image-composer-count').inputValue()}));
  assert.equal(x.accepted(),2,'Two images require two independent paid submissions');
  assert.equal(count(x,'/api/quotes'),1,'Two Seedream images use one provider reference staging');
  assert.equal(count(x,'/api/jobs'),2);
  assert.equal(x.requests.find(r=>r.path==='/api/quotes').data.count,2);
  assert.equal(new Set(x.requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST').map(r=>r.data.quoteId)).size,2);
  ok('Two Seedream images share one price-check request and each use a distinct price');assert.deepEqual(x.errors,[]);await x.context.close();
 x=await workspace({historyDelay:1200});await imageForm(x);const releaseStarted=Date.now();await x.page.click('#generate:visible, #image-composer-generate:visible');await x.page.waitForFunction(()=>!document.querySelector('#resolution').disabled,undefined,{timeout:700});assert.ok(Date.now()-releaseStarted<900);await x.page.waitForFunction(()=>document.querySelector('.card[data-state="queued"]'),undefined,{timeout:700});assert.equal(x.accepted(),1);assert.equal(await x.page.locator('.card[data-state="queued"]').count(),1);ok('Image submission releases the editor before the background History refresh finishes');assert.deepEqual(x.errors,[]);await x.context.close();
 x=await workspace();await imageForm(x);await x.page.locator('#reference-images').setInputFiles({name:'sculpture.png',mimeType:'image/png',buffer:png});await ready(x.page);await x.page.click('#generate:visible, #image-composer-generate:visible');await ready(x.page);const edit=x.requests.find(r=>r.path==='/api/quotes').data;assert.equal(edit.referenceSourceIds.length,1);assert.equal(edit.transferSourceIds.length,1);assert.equal(x.accepted(),1);assert.equal(await x.page.locator('#quote-dialog').isVisible(),false);ok('Reference edit submits once without review and preserves reference inputs');await x.context.close();


 // Oversized deck drops must report the size limit without creating paid requests.
 {
  x=await workspace();await imageForm(x);
  await x.page.evaluate(()=>{
    const oversized=new File([new Uint8Array(20*1024*1024+1)],'too-large.png',{type:'image/png'});
    const transfer=new DataTransfer();transfer.items.add(oversized);
    const event=new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer});
    document.getElementById('image-composer').dispatchEvent(event);
  });
  const importError=x.page.locator('#image-composer-status');
  await importError.waitFor({state:'visible'});
  assert.match(await importError.innerText(),/Image too large.*20 MB/is);
  assert.match(await importError.innerText(),/MIN 240 × 240 PX/);
  assert.match(await importError.innerText(),/MAX 20 MB/);
  assert.equal(await importError.locator('.import-toast-title').innerText(),'Image too large');
  assert.equal(await importError.locator('.import-toast-filename').innerText(),'too-large.png');
  assert.equal(await x.page.locator('#image-composer-references .composer-reference-tile').count(),0);
  assert.equal(count(x,'/api/uploads'),0);
  assert.equal(count(x,'/api/quotes'),0);
  await importError.getByRole('button',{name:'Dismiss PV Lab notification'}).click();
  assert.equal(await importError.isVisible(),false);
  await x.page.locator('#reference-images').setInputFiles({name:'valid.png',mimeType:'image/png',buffer:png});
  await ready(x.page);
  await x.page.waitForFunction(()=>document.querySelectorAll('#image-composer-references .composer-reference-tile').length===1);
  assert.equal(await importError.isVisible(),false);
  ok('Oversized deck drop shows a clear error; subsequent valid import works');
  assert.deepEqual(x.errors,[]);await x.context.close();
 }


 // Undersized photos must explain the minimum resolution, rather than the maximum file size.
 {
  x=await workspace();await imageForm(x);
  await x.page.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=239;canvas.height=320;
    const context=canvas.getContext('2d');context.fillStyle='#555';context.fillRect(0,0,239,320);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    const file=new File([blob],'too-small.png',{type:'image/png'});
    const transfer=new DataTransfer();transfer.items.add(file);
    document.getElementById('image-composer').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  });
  const error=x.page.locator('#image-composer-status');await error.waitFor({state:'visible'});
  assert.equal(await error.locator('.import-toast-title').innerText(),'Image too small');
  assert.equal(await error.locator('.import-toast-filename').innerText(),'too-small.png');
  assert.match(await error.innerText(),/MIN 240 × 240 PX/);
  assert.match(await error.innerText(),/239 × 320 px/);
  assert.equal(count(x,'/api/quotes'),0);
  ok('Undersized photograph shows the minimum dimensions and never generates');
  assert.deepEqual(x.errors,[]);await x.context.close();
 }

 }
 {
  x=await workspace();await imageForm(x);
  const refPhotos=[{name:'front.png',mimeType:'image/png',buffer:png},{name:'side.png',mimeType:'image/png',buffer:png},{name:'back.png',mimeType:'image/png',buffer:png}];
  assert.equal(await x.page.locator('#composer-reference-intent-toggle').isVisible(),true);
  await x.page.locator('#reference-images').setInputFiles(refPhotos);await waitRefs(x.page,3);await ready(x.page);
  assert.equal(await x.page.locator('#composer-reference-intent').isVisible(),false,'Upload must not open a compulsory chooser');
  assert.match(await x.page.locator('#composer-reference-intent-toggle').innerText(),/Base image/);
  await x.page.click('#composer-reference-intent-toggle');
  assert.match(await x.page.locator('#composer-reference-intent').innerText(),/How would you like to create/);
  assert.equal(await x.page.locator('#composer-reference-intent .reference-intent-choice').count(),2);
  assert.equal(await x.page.locator('#composer-reference-intent').getByText('Same person').count(),0);
  await x.page.click('#composer-reference-intent-close');
  assert.equal(await x.page.locator('.composer-reference-index').first().innerText(),'BASE');
  assert.equal(await x.page.locator('#image-composer-references .role-general').count(),2);
  assert.deepEqual(await x.page.locator('#image-composer-references .composer-reference-role').evaluateAll(a=>a.map(el=>el.value)),['none','none']);
  assert.equal(await x.page.locator('#image-composer-generate').isDisabled(),false);
  await x.page.click('#image-composer-generate');await waitAccepted(x,1);await ready(x.page);
  assert.deepEqual(x.requests.find(req=>req.path==='/api/quotes').data.settings.referenceRoles.map(ref=>ref.role),['base','none','none']);
  assert.equal(x.accepted(),1);ok('Upload immediately works with Base and General references');assert.deepEqual(x.errors,[]);await x.context.close();
  x=await workspace();await imageForm(x);await x.page.locator('#reference-images').setInputFiles(refPhotos);await waitRefs(x.page,3);await ready(x.page);
  await x.page.fill('#image-composer-prompt','');
  assert.equal(await x.page.locator('#image-composer-generate').isDisabled(),false,'No prompt and unassigned roles must be allowed');
  assert.equal(await x.page.locator('#image-composer-generate').innerText(),'Generate','Base-image generation uses the universal image button label');
  await x.page.click('#image-composer-generate');await waitAccepted(x,1);await ready(x.page);
  assert.match(x.requests.find(req=>req.path==='/api/quotes').data.settings.prompt,/^Make a controlled, natural variation of the supplied Base image/,
    'A blank text field uses the default photographic variation direction for the base image');
  assert.deepEqual(x.requests.find(req=>req.path==='/api/quotes').data.settings.referenceRoles.map(ref=>ref.role),['base','none','none']);
  assert.equal(x.accepted(),1);ok('No prompt + no roles creates a labeled variation without guessing an edit');assert.deepEqual(x.errors,[]);await x.context.close();


  x=await workspace();await imageForm(x);await x.page.locator('#reference-images').setInputFiles(refPhotos);await waitRefs(x.page,3);await ready(x.page);
  await clickAdvanced(x.page);
  assert.equal(await x.page.locator('#composer-reference-same-person').isVisible(),true);
  await x.page.click('#composer-reference-same-person');
  assert.equal(await x.page.locator('#image-reference-mode').inputValue(),'base');
  assert.deepEqual(await x.page.locator('.composer-reference-role').evaluateAll(a=>a.map(el=>el.value)),['identity','identity']);
  await x.page.click('#image-composer-generate');await waitAccepted(x,1);await ready(x.page);
  assert.deepEqual(x.requests.find(req=>req.path==='/api/quotes').data.settings.referenceRoles.map(ref=>ref.role),['base','identity','identity']);
  assert.equal(x.accepted(),1);ok('Same person presets reference roles without dropping the base');assert.deepEqual(x.errors,[]);await x.context.close();

  x=await workspace();await imageForm(x);await x.page.locator('#reference-images').setInputFiles(refPhotos);await waitRefs(x.page,3);await ready(x.page);
  await x.page.click('#composer-reference-intent-toggle');await x.page.click('[data-reference-intent="references"]');
  assert.equal(await x.page.locator('#image-reference-mode').inputValue(),'references');
  assert.equal(await x.page.locator('.composer-reference-role').count(),3);
  await x.page.locator('.composer-reference-role').nth(0).selectOption('pose');
  await x.page.locator('.composer-reference-role').nth(1).selectOption('lighting');
  await clickAdvanced(x.page);
  await x.page.click('#reference-guidance summary');
  assert.match(await x.page.locator('#reference-guidance-text').innerText(),/Reference 1 \[Pose only\]/);
  assert.match(await x.page.locator('#reference-guidance-text').innerText(),/REQUESTED IMAGE/);
  await x.page.click('#composer-reference-intent-toggle');await x.page.click('[data-reference-intent="base"]');
  assert.equal(await x.page.locator('.composer-reference-index').first().innerText(),'BASE');
  assert.equal(await x.page.locator('.composer-reference-role').first().inputValue(),'lighting');
  await x.page.click('#composer-reference-intent-toggle');await x.page.click('[data-reference-intent="references"]');
  assert.equal(await x.page.locator('.composer-reference-role').first().inputValue(),'pose','Original role restored');
  await x.page.click('#image-composer-generate');await waitAccepted(x,1);await ready(x.page);
  assert.deepEqual(x.requests.find(req=>req.path==='/api/quotes').data.settings.referenceRoles.map(ref=>ref.role),['pose','lighting','none']);
  assert.equal(x.accepted(),1);ok('Switching modes preserves roles and preview matches settings');assert.deepEqual(x.errors,[]);await x.context.close();

  x=await workspace();await imageForm(x);await x.page.locator('#reference-images').setInputFiles(refPhotos.slice(0,2));await waitRefs(x.page,2);await ready(x.page);
  await x.page.click('#composer-reference-intent-toggle');await x.page.click('[data-reference-intent="references"]');
  await clickAdvanced(x.page);await x.page.click('#composer-reference-same-person');
  assert.deepEqual(await x.page.locator('.composer-reference-role').evaluateAll(a=>a.map(el=>el.value)),['identity','identity']);
  assert.match(await x.page.locator('#composer-reference-intent-toggle').innerText(),/References only/,'Explicit References only stays active within the draft');
  assert.equal(await x.page.evaluate(()=>localStorage.getItem('pvlab:image-reference-mode:v1')),null,'Reference mode should not leak into new Image drafts');
  await x.page.click('#image-composer-generate');await waitAccepted(x,1);await ready(x.page);
  assert.deepEqual(x.requests.find(req=>req.path==='/api/quotes').data.settings.referenceRoles.map(ref=>ref.role),['identity','identity']);
  assert.equal(x.accepted(),1);ok('Same person preset works in References only');assert.deepEqual(x.errors,[]);await x.context.close();
  x=await workspace();await imageForm(x);await x.page.locator('#reference-images').setInputFiles(refPhotos.slice(0,2));await waitRefs(x.page,2);await ready(x.page);
  assert.match(await x.page.locator('#composer-reference-intent-toggle').innerText(),/Base image/,'New Image workspace must start with Base image');
  await x.page.click('#composer-reference-intent-toggle');await x.page.click('[data-reference-intent="references"]');
  await x.page.fill('#image-composer-prompt','');
  assert.equal(await x.page.locator('#image-composer-generate').isDisabled(),false);
  assert.equal(await x.page.locator('#image-composer-generate').innerText(),'Generate','References-only uses the same button label');
  await x.page.click('#image-composer-generate');await waitAccepted(x,1);await ready(x.page);
  assert.equal(x.requests.find(req=>req.path==='/api/quotes').data.settings.prompt,'');
  assert.deepEqual(x.requests.find(req=>req.path==='/api/quotes').data.settings.referenceRoles.map(ref=>ref.role),['none','none']);
  assert.equal(x.accepted(),1);ok('No prompt + no roles can create a new composition in References only');assert.deepEqual(x.errors,[]);await x.context.close();

 }

 if(!process.env.PV_REFERENCE_FLOW_ONLY){
 x=await workspace({quoteDelay:300});await imageForm(x);await x.page.evaluate(()=>{document.querySelector('#generate').click();document.querySelector('#generate').click();});await ready(x.page);assert.equal(x.accepted(),1);assert.equal(count(x,'/api/quotes'),1);ok('Rapid repeated clicks cannot double-submit');await x.context.close();
 for(const failure of ['quote','expired','wrong-model','budget','server','network']){
  x=await workspace({failure});await imageForm(x);await x.page.click('#generate:visible, #image-composer-generate:visible');await ready(x.page);await x.page.waitForTimeout(150);assert.equal(x.accepted(),0);assert.equal(count(x,'/api/quotes'),1);assert.equal(count(x,'/api/jobs'),['quote','expired','wrong-model'].includes(failure)?0:1);assert.equal(await x.page.locator('#quote-dialog').isVisible(),false);assert.ok((await x.page.locator('#notice').innerText()).length>0);ok(failure+': stops without another paid attempt');await x.context.close();
 }
 x=await workspace({failure:'auth'});await imageForm(x);await x.page.click('#generate:visible, #image-composer-generate:visible');await ready(x.page);const submissions=x.requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST');assert.equal(submissions.length,2);assert.deepEqual(submissions[0].data,submissions[1].data);assert.equal(x.accepted(),1);ok('Authentication-only renewal retains the quote ID and creates one job');await x.context.close();
 const active=n=>({id:id(n),status:'running',settings,createdAt:Date.now()});
 for(const initial of [[active(1),active(2),active(3),active(4)],[{...active(5),status:'uncertain'}]]){
  x=await workspace({initial});await imageForm(x);assert.equal(await x.page.locator('#generate').isDisabled(),true);assert.equal(count(x,'/api/jobs'),0);ok('Existing capacity/uncertain-job gate still blocks Image');await x.context.close();
 }
 const saving=n=>({...active(n),status:'saving',providerTaskId:'settled-'+n,error:'Archive retry pending'});
 x=await workspace({initial:[saving(10),saving(11),saving(12),saving(13)]});await imageForm(x);
 assert.equal(await x.page.locator('#generate').isDisabled(),false);
 await x.page.locator('#active summary').click();assert.match(await x.page.locator('#active-status').innerText(),/4 saving \(no generation slot\)/);await x.page.locator('#active summary').click();
 await x.page.click('#generate:visible, #image-composer-generate:visible');await ready(x.page);assert.equal(x.accepted(),1);
 ok('Archive-only saves stay visible but do not consume Image generation slots');await x.context.close();

 const geminiInterrupted={...active(20),status:'uncertain',settings:{...settings,provider:'gemini',engine:'gemini',model:'gemini-3-pro-image',processing:'normal'}};
 x=await workspace({initial:[geminiInterrupted]});await imageForm(x);
 assert.equal(await x.page.locator('#generate').isDisabled(),false);
 await x.page.locator('#active summary').click();assert.match(await x.page.locator('#active-status').innerText(),/Nano 0 \/ 4/);assert.match(await x.page.locator('#active-status').innerText(),/1 old Nano interrupted/);await x.page.locator('#active summary').click();
 ok('Interrupted Gemini request is labeled as old and does not look like an active Nano generation');await x.context.close();
 // A slow pack must show loading thumbnails, never a broken browser image glyph.
 let releasePhotoReads;
 const packPreviewGate=new Promise(resolve=>{releasePhotoReads=resolve;});
 const goodId=id(981),badId=id(983);
 const slowPacks=[
  {id:id(980),name:'Delayed Editorial',refs:[{id:goodId,name:'editorial.png',role:'none',note:''}]},
  {id:id(982),name:'Missing Photo',refs:[{id:badId,name:'missing.png',role:'identity',note:''}]}
 ];
 x=await workspace({savedPacks:slowPacks,packPreviewGate,brokenPreviewAssets:[badId]});
 const originalDeckHeight=await x.page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height);
 await x.page.click('#scene-image-open');await x.page.click('#scene-menu-packs');
 assert.equal(await x.page.locator('#pack-studio-dialog').isVisible(),true,'The Photo Packs menu opens the existing reference library modal');
 assert.equal(await x.page.locator('#pack-studio-heading').textContent(),'Photo packs');
 assert.equal(await x.page.locator('#composer-library').isVisible(),false,'No legacy oversized popover competes with the modal');
 assert.equal(await x.page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height),originalDeckHeight,
   'Opening photo packs must not resize the compact Image composer');
 const photos=x.page.locator('#pack-studio-grid .pack-studio-card-media');
 assert.equal(await photos.count(),2);
 assert.equal(await photos.locator('img').count(),0,'Do not insert a blank img while the preview request is pending');
 assert.equal(await photos.first().getAttribute('aria-busy'),'true');
 assert.equal(await photos.last().getAttribute('aria-busy'),'true');
 assert.doesNotMatch(await x.page.locator('#pack-studio-grid').innerText(),/Saved identity preview/);
 releasePhotoReads();
 await x.page.waitForFunction(()=>document.querySelectorAll('#pack-studio-grid .pack-studio-card-media.is-photo-loading').length===0);
 assert.equal(await photos.first().locator('img').count(),1,'Available preview replaces shimmer with photo');
 assert.equal(await photos.first().locator('img').evaluate(i=>i.naturalWidth>0),true);
 assert.equal(await photos.last().locator('img').count(),0,'Missing image never shows browser broken icon');
 assert.equal(await photos.last().locator('.composer-photo-fallback').count(),1,'Fallback uses PV LAB icon');
 assert.equal(await photos.last().getAttribute('title'),'Preview unavailable');
 assert.deepEqual(x.errors,[]);
 ok('Saved photo packs: delayed thumbnails and missing previews remain clean');
 await x.context.close();

 // Non-billable Photo Pack creation mirrors Soul's library → create workflow.
 // It must not touch the generation quote/submit routes or reset the Image deck.
 x=await workspace();
 await x.page.click('#scene-image-open');await x.page.click('#scene-menu-packs');
 await x.page.click('#pack-studio-new');
 assert.equal(await x.page.locator('#pack-studio-create-view').isVisible(),true);
 assert.equal(await x.page.locator('#pack-studio-from-deck').isDisabled(),true);
 await x.page.fill('#pack-studio-name','Nina / Quiet portraits');
 await x.page.locator('#pack-studio-files').setInputFiles([{name:'nina-front.png',mimeType:'image/png',buffer:png},
    {name:'nina-profile.png',mimeType:'image/png',buffer:png}]);
 await x.page.waitForFunction(()=>document.querySelectorAll('#pack-studio-previews .pack-studio-preview').length===2);
 assert.equal(await x.page.locator('#pack-studio-photo-count').innerText(),'2 / 10 photos');
 await x.page.click('#pack-studio-save');
 await x.page.waitForFunction(()=>document.querySelector('#pack-studio-library-status')?.textContent.includes('saved privately'));
 const savedRequest=x.requests.find(r=>r.path==='/api/packs'&&r.method==='POST');
 assert.equal(savedRequest.data.name,'Nina / Quiet portraits');
 assert.equal(savedRequest.data.referenceSourceIds.length,2);
 assert.deepEqual(savedRequest.data.referenceRoles.map(r=>r.role),['none','none']);
 assert.equal(count(x,'/api/uploads'),2);
 assert.equal(count(x,'/api/quotes'),0);
 assert.equal(count(x,'/api/jobs'),0);
 assert.equal(await x.page.locator('#pack-studio-grid .pack-studio-card').count(),1);
 await x.page.locator('#pack-studio-grid .pack-studio-card-select').click();
 await waitRefs(x.page,2);
 assert.equal(await x.page.locator('#pack-studio-dialog').isVisible(),false);
 assert.equal(count(x,'/api/jobs'),0);
 ok('PV Soul-style creation saves device photos then loads packs with no generation');assert.deepEqual(x.errors,[]);await x.context.close();

 x=await workspace();await x.page.locator('#reference-images').setInputFiles(refPhotos);await waitRefs(x.page,3);
 await x.page.click('#scene-image-open');await x.page.click('#scene-menu-packs');await x.page.click('#pack-studio-new');
 assert.equal(await x.page.locator('#pack-studio-from-deck').getAttribute('aria-pressed'),'false');
 assert.equal(await x.page.locator('#pack-studio-previews .pack-studio-preview').count(),0);
 await x.page.click('#pack-studio-from-deck');
 assert.equal(await x.page.locator('#pack-studio-from-deck').getAttribute('aria-pressed'),'true');
 assert.equal(await x.page.locator('#pack-studio-previews .pack-studio-preview').count(),3);
 await x.page.fill('#pack-studio-name','My preserved base and identities');
 await x.page.click('#pack-studio-save');
 await x.page.waitForFunction(()=>document.querySelector('#pack-studio-library-status')?.textContent.includes('saved privately'));
 const preserved=x.requests.findLast(r=>r.path==='/api/packs'&&r.method==='POST');
 assert.deepEqual(preserved.data.referenceRoles.map(r=>r.role),['base','none','none'],
   'Current deck roles are saved in their exact order');
 assert.equal(count(x,'/api/jobs'),0,'Saving current references must never generate or charge');
 assert.equal(await x.page.locator('#reference-list .reference-item').count(),3,'The editor remains untouched');
 await x.page.keyboard.press('Escape');
 assert.equal(await x.page.locator('#pack-studio-dialog').isVisible(),false);
 ok('Current deck photo packs retain original order and roles without billing');assert.deepEqual(x.errors,[]);await x.context.close();

 const manyPack={id:id(940),name:'Nina Master 8',refs:Array.from({length:8},(_,i)=>({id:id(960+i),name:'nina-'+(i+1)+'.png',role:'identity',note:''}))};
 x=await workspace({savedPacks:[manyPack]});await imageAdvanced(x.page);await chooseImageModel(x.page,'soulpro');await ready(x.page);await x.page.click('#composer-character');await x.page.click('#composer-library-create');
 const packText=await x.page.locator('#soul-pro-pack-select').innerText();assert.match(packText,/Nina Master 8/);assert.match(packText,/8 refs/);
 await x.page.selectOption('#soul-pro-pack-select',manyPack.id);await ready(x.page);
 const packItems=x.page.locator('.soul-pro-pack-item');assert.equal(await packItems.count(),8);assert.equal(await x.page.locator('.soul-pro-pack-item input:checked').count(),4);
 await packItems.nth(0).locator('input').uncheck();await packItems.nth(4).locator('input').check();assert.equal(await x.page.locator('.soul-pro-pack-item input:checked').count(),4);
 await x.page.click('#soul-pro-save-identity');await ready(x.page);
 const identityPost=x.requests.findLast(r=>r.path==='/api/soul-pro/identity'&&r.method==='POST').data;
 assert.deepEqual(identityPost.referenceSourceIds,[id(961),id(962),id(963),id(964)]);
 ok('Soul Pro Save Nina identity saves the exact four checked pack images');await x.context.close();

  x=await workspace();await imageAdvanced(x.page);await chooseImageModel(x.page,'soulpro');await ready(x.page);
 assert.equal(await x.page.locator('#reference-mode').isVisible(),false);assert.match(await x.page.locator('#soul-pro-identity-status').innerText(),/Saved Nina identity.*2 references/);
 assert.equal(await x.page.locator('#generate').isDisabled(),true);
 await x.page.locator('#image').setInputFiles({name:'base.png',mimeType:'image/png',buffer:png});await ready(x.page);
 assert.equal(await x.page.locator('#generate').isDisabled(),false);assert.equal(await x.page.locator('#generate').innerText(),'Generate');
 assert.equal(await x.page.locator('#soul-pro-settings').isVisible(),true);assert.equal(await x.page.locator('#resolution-control').isVisible(),false);assert.equal(await x.page.locator('#ratio-control').isVisible(),false);
 assert.match(await x.page.locator('#generation-help').innerText(),/one base image only/i);assert.match(await x.page.locator('#generation-help').innerText(),/\$0\.06/);
 await x.page.click('#generate:visible, #image-composer-generate:visible');await ready(x.page);assert.equal(count(x,'/api/fal/soul-pro'),1);assert.equal(x.accepted(),1);
 const soulPro=x.requests.find(r=>r.path==='/api/fal/soul-pro').data;assert.ok(soulPro.sourceId);assert.deepEqual(soulPro.referenceSourceIds,[]);assert.equal(soulPro.settings.engine,'soulpro');assert.equal(soulPro.settings.soulProModel,'ideogram45');assert.equal(soulPro.settings.soulProQuality,'medium');assert.equal(soulPro.settings.sourceWidth,320);assert.equal(soulPro.settings.sourceHeight,320);assert.equal(soulPro.settings.prompt,'');
 ok('PV Soul Pro reuses persistent Nina identity and submits with one base image only');await x.context.close();

 x=await workspace();await imageAdvanced(x.page);await chooseImageModel(x.page,'soulpro');await x.page.selectOption('#soul-pro-quality','high');await ready(x.page);assert.match(await x.page.locator('#generation-help').innerText(),/\$0\.22/);await x.page.selectOption('#soul-pro-model','kontextmax');await ready(x.page);
 assert.match(await x.page.locator('#generation-help').innerText(),/\$0\.08/);assert.equal(await x.page.locator('#soul-pro-quality-row').isVisible(),false);ok('PV Soul Pro keeps $0.22 High optional and exposes Kontext Max at $0.08');await x.context.close();

  x=await workspace();await imageAdvanced(x.page);await chooseImageModel(x.page,'fal');await x.page.fill('#prompt:visible, #image-composer-prompt:visible','Editorial portrait in a warm room.');
 await x.page.locator('#reference-images').setInputFiles([
  {name:'pose.png',mimeType:'image/png',buffer:png},
  {name:'identity.png',mimeType:'image/png',buffer:png}
 ]);await ready(x.page);
 const roles=x.page.locator('.reference-fields select');await roles.nth(0).selectOption('pose');await roles.nth(1).selectOption('identity');await ready(x.page);
 assert.equal(await x.page.locator('#generate').isDisabled(),false);assert.equal(await x.page.locator('#generate').innerText(),'Generate','Controlled Pose uses the same button label');
 await x.page.click('#preview-pose');await ready(x.page);assert.equal(count(x,'/api/fal/pose-preview'),1);assert.match(await x.page.locator('#pose-preview-status').innerText(),/Pose ready/);
 await x.page.click('#generate:visible, #image-composer-generate:visible');await ready(x.page);assert.equal(count(x,'/api/fal/controlled-pose'),1);assert.equal(count(x,'/api/gemini/jobs'),0);assert.equal(count(x,'/api/quotes'),0);assert.equal(x.accepted(),1);
 ok('Controlled Pose keeps FAL isolated from Seedream and Nano and reuses the preview pose map');await x.context.close();

 for(const tool of ['video']){
  x=await workspace();await x.page.click('#tool-'+tool);if(tool==='image')await clickAdvanced(x.page);await x.page.locator('#image').setInputFiles({name:'sculpture.png',mimeType:'image/png',buffer:png});await ready(x.page);if(tool==='video')await x.page.fill('#prompt:visible, #image-composer-prompt:visible','The camera slowly moves around the sculpture.');
  assert.equal(await x.page.locator('#generate').innerText(),'Generate');await x.page.click('#generate:visible, #image-composer-generate:visible');await x.page.locator('#quote-dialog').waitFor({state:'visible'});assert.equal(x.accepted(),0);assert.equal(count(x,'/api/jobs'),0);await x.page.click('#confirm-generation');await ready(x.page);assert.equal(x.accepted(),1);ok(tool+': separate price confirmation remains required');await x.context.close();
 }

 // Image upscaling is one paid job per click, independent of the Image batch selector.
 const upscaleForm=async x=>{await x.page.click('#tool-upscale');await x.page.locator('#image').setInputFiles({name:'sculpture.png',mimeType:'image/png',buffer:png});await ready(x.page);};
 x=await workspace();await imageForm(x);await x.page.selectOption('#image-count:visible, #image-composer-count:visible','4');await upscaleForm(x);
 assert.equal(await x.page.locator('#generate').innerText(),'Upscale');assert.match(await x.page.locator('#generation-help').innerText(),/one paid upscaling job/);
 await x.page.click('#generate:visible, #image-composer-generate:visible');await ready(x.page);assert.equal(x.accepted(),1);assert.equal(count(x,'/api/quotes'),1);assert.equal(count(x,'/api/jobs'),1);assert.equal(await x.page.locator('#quote-dialog').isVisible(),false);assert.deepEqual(x.dialogs,[]);ok('Upscale ignores Image batch count and creates one job without review');await x.context.close();
 x=await workspace({quoteDelay:300});await upscaleForm(x);await x.page.evaluate(()=>{document.querySelector('#generate').click();document.querySelector('#generate').click();});await ready(x.page);assert.equal(x.accepted(),1);assert.equal(count(x,'/api/quotes'),1);ok('Rapid repeated Upscale clicks cannot double-submit');await x.context.close();
 for(const failure of ['quote','expired','wrong-model','budget','server','network']){
  x=await workspace({failure});await upscaleForm(x);await x.page.click('#generate:visible, #image-composer-generate:visible');await ready(x.page);await x.page.waitForTimeout(150);assert.equal(x.accepted(),0);assert.equal(count(x,'/api/quotes'),1);assert.equal(count(x,'/api/jobs'),['quote','expired','wrong-model'].includes(failure)?0:1);assert.equal(await x.page.locator('#quote-dialog').isVisible(),false);assert.ok((await x.page.locator('#notice').innerText()).length>0);ok('Upscale '+failure+': stops without automatic repricing or retry');await x.context.close();
 }
 x=await workspace({failure:'auth'});await upscaleForm(x);await x.page.click('#generate:visible, #image-composer-generate:visible');await ready(x.page);const upscaleSubmissions=x.requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST');assert.equal(upscaleSubmissions.length,2);assert.deepEqual(upscaleSubmissions[0].data,upscaleSubmissions[1].data);assert.equal(x.accepted(),1);ok('Upscale authentication-only renewal reuses the exact quote ID');await x.context.close();
 const activeUpscale=n=>({...active(n),settings:{type:'image',provider:'fal',engine:'upscale',mode:'upscale',upscaleEngine:'seedvr2',model:'fal-ai/seedvr/upscale/image'}});
 for(const initial of [[activeUpscale(1),activeUpscale(2),activeUpscale(3),activeUpscale(4)],[{...activeUpscale(5),status:'uncertain'}]]){
  x=await workspace({initial});await upscaleForm(x);assert.equal(await x.page.locator('#generate').isDisabled(),true);assert.equal(count(x,'/api/jobs'),0);ok('Capacity and interrupted-request gates still block Upscale');await x.context.close();
 }
 const failedFal={id:id(901),status:'failed',sourceId:id(902),settings:{type:'video',provider:'fal',engine:'h3maxfal',mode:'reference',model:'minimax/h3-max/reference-to-video',prompt:'test',duration:10,resolution:'1080p',aspectRatio:'16:9'},createdAt:Date.now(),estimatedUsd:1.721,error:'fal.ai: Provider rejected the request.',providerTaskId:'fal_failed'};
 const uncertainFal={id:id(903),status:'uncertain',sourceId:id(904),settings:{type:'video',provider:'fal',engine:'h3maxfal',mode:'reference',model:'minimax/h3-max/reference-to-video',prompt:'test',duration:10,resolution:'1080p',aspectRatio:'16:9'},createdAt:Date.now()-1,estimatedUsd:1.721,error:'fal.ai submission status is uncertain.',providerTaskId:'fal_uncertain'};
 x=await workspace({initial:[failedFal,uncertainFal]});await x.page.click('#tool-video');
 const cards=x.page.locator('.card');
 const failedCard=cards.filter({hasText:'FAILED /'});assert.equal(await failedCard.locator('.history-no-result strong').innerText(),'Generation failed');assert.doesNotMatch(await failedCard.innerText(),/Result pending/);assert.match(await failedCard.textContent(),/Lab estimate released: \$1\.721/);
 const uncertainCard=cards.filter({hasText:'UNCERTAIN /'});assert.equal(await uncertainCard.locator('.history-no-result strong').innerText(),'Status unknown');assert.doesNotMatch(await uncertainCard.innerText(),/Result pending/);assert.match(await uncertainCard.textContent(),/provider status unknown/);
 await failedCard.click();await x.page.locator('#video-detail-extra summary').click();assert.equal(await x.page.locator('#video-detail-extra-list').getByRole('button',{name:'Recover FAL output'}).count(),1);
 ok('History distinguishes definite FAL failure from uncertain provider status and offers FAL recovery');await x.context.close();


 // Provider content refusals must use the same editorial card for EVERY model.
 // These are synthetic historic jobs: no keys, credits, uploads or new generations.
 const moderatedImageErrors=[
  {engine:'flash',provider:'openrouter',error:'OpenRouter (HTTP 400): Seedream blocked this request through content moderation.'},
  {engine:'seedream',provider:'spicy',error:'SpicyAPI: content policy violation.'},
  {engine:'gemini',provider:'gemini',error:'Google blocked this prompt by a safety filter.'},
  {engine:'kling',provider:'fal',error:'fal.ai flagged by content checker.'},
  {engine:'soulpro',provider:'higgsfield',soulProModel:'soul2',error:'Higgsfield safety policy rejected this request.'}
 ];
 const technicalImageErrors=[
  'OpenRouter (HTTP 429): Rate limit exceeded.',
  'fal.ai: Provider rejected the request.',
  'Upload blocked: unsupported content-type.'
 ];
 const moderatedJobs=moderatedImageErrors.map((entry,i)=>({
  id:id(1200+i),status:'failed',settings:{...settings,engine:entry.engine,provider:entry.provider,...(entry.soulProModel?{soulProModel:entry.soulProModel}:{}) ,prompt:'Keep my editorial portrait '+entry.engine},
  createdAt:Date.now()-i,estimatedUsd:.05,error:entry.error
 }));
 const technicalJobs=technicalImageErrors.map((error,i)=>({
  id:id(1250+i),status:'failed',settings:{...settings,engine:'flash',provider:'openrouter',prompt:'Technical issue '+i},
  createdAt:Date.now()-10-i,error
 }));
 x=await workspace({initial:[...moderatedJobs,...technicalJobs]});
 for(const record of moderatedJobs){
  const card=x.page.locator('#history .card[data-job="'+record.id+'"]');
  assert.equal(await card.locator('.history-no-result.is-content-restricted strong').innerText(),'Not with this model.');
  assert.equal(await card.locator('button.content-restriction-edit').count(),1);
  assert.equal(await card.locator('.cardactions button').filter({hasText:'Download image'}).isDisabled(),true);
  assert.doesNotMatch(await card.innerText(),/OpenRouter \(HTTP 400\)|content policy violation|flagged by content checker/i);
 }
 for(const record of technicalJobs){
  const card=x.page.locator('#history .card[data-job="'+record.id+'"]');
  assert.equal(await card.locator('.history-no-result strong').innerText(),'Generation failed');
  assert.equal(await card.locator('.is-content-restricted').count(),0);
  assert.match(await card.innerText(),/OpenRouter|Provider rejected|content-type/);
 }
 const rejectedFlash=x.page.locator('#history .card[data-job="'+moderatedJobs[0].id+'"]');
 await rejectedFlash.click();
 await x.page.locator('#image-lightbox-content-notice').waitFor({state:'visible'});
 assert.equal(await x.page.locator('#image-lightbox-content-notice h2').innerText(),'Not with this model.');
 assert.equal(await x.page.locator('#image-detail-status').innerText(),'Restricted');
 assert.equal(await x.page.locator('#image-lightbox-unavailable').isVisible(),false);
 await x.page.click('#image-lightbox-close');
 await rejectedFlash.locator('.content-restriction-edit').click();await ready(x.page);
 assert.equal(await x.page.locator('#prompt').inputValue(),'Keep my editorial portrait flash');
 assert.equal(await x.page.locator('#image-engine').inputValue(),'flash');
 assert.equal(x.accepted(),0,'Reuse must not submit a paid request');
 assert.deepEqual(x.errors,[]);
 ok('Seedream Flash, Seedream Pro, Nano, Kling and Soul use the editorial moderation card; technical failures stay distinct');await x.context.close();

 const moderatedVideos=[
  {id:id(1300),status:'failed',settings:{type:'video',engine:'seedance',provider:'spicy',mode:'start',model:'bytedance/seedance-2.5/image-to-video',prompt:'Slow camera push toward the room.',duration:10,resolution:'1080p',aspectRatio:'16:9'},createdAt:Date.now(),error:'Seedance content moderation rejected the request.'},
  {id:id(1301),status:'failed',settings:{type:'video',engine:'h3maxfal',provider:'fal',mode:'start',model:'minimax/h3-max/image-to-video',prompt:'Slow camera orbit.',duration:10,resolution:'1080p',aspectRatio:'16:9'},createdAt:Date.now()-1,error:'fal.ai: requested content was flagged by a content filter.'}
 ];
 x=await workspace({initial:moderatedVideos});await x.page.click('#tool-video');
 for(const record of moderatedVideos){
  const card=x.page.locator('#history .card[data-job="'+record.id+'"]');
  assert.equal(await card.locator('.history-no-result.is-content-restricted strong').innerText(),'Not with this model.');
  assert.equal(await card.locator('.content-restriction-edit').count(),1);
  assert.equal(await card.locator('.cardactions button').filter({hasText:'Download video'}).isDisabled(),true);
 }
 const seedanceCard=x.page.locator('#history .card[data-job="'+moderatedVideos[0].id+'"]');
 assert.match(await seedanceCard.innerText(),/Seedance/i,'Guidance must name the video model, not an image model');
 await seedanceCard.click();
 assert.equal(await x.page.locator('#video-detail-status').innerText(),'Restricted');
 await seedanceCard.locator('.content-restriction-edit').click();await ready(x.page);
 assert.equal(await x.page.locator('#prompt').inputValue(),'Slow camera push toward the room.');
 assert.equal(x.accepted(),0,'Video prompt reuse must not submit a paid request');
 assert.deepEqual(x.errors,[]);
 ok('Seedance and FAL video refusals use the same card and restore the original prompt without generation');await x.context.close();

 const inactive=n=>({id:id(1000+n),status:'failed',sourceId:id(1100+n),settings:{type:'image',provider:'fal',engine:'soulpro',mode:'identity-edit',soulProModel:'ideogram45',soulProQuality:'medium',resolution:'source',prompt:''},createdAt:Date.now()-n,estimatedUsd:.06,error:'test failure',providerTaskId:'fal-'+n});
 x=await workspace({initial:[inactive(1),inactive(2),inactive(3),active(1040)]});await x.page.click('#tool-image');
 await x.page.click('#history-select');assert.equal(await x.page.locator('#history-selection').isVisible(),true);
 const checks=x.page.locator('.history-select-box input');assert.equal(await checks.count(),3);
 const selectable=x.page.locator('.card[data-deletable="true"]');
 await selectable.nth(0).click();assert.equal(await checks.nth(0).isChecked(),true);assert.match(await x.page.locator('#history-selection-count').innerText(),/1 selected/i);
 await selectable.nth(1).click();assert.equal(await checks.nth(1).isChecked(),true);assert.match(await x.page.locator('#history-selection-count').innerText(),/2 selected/i);
 await x.page.click('#history-delete-selected');await ready(x.page);
 const bulk=x.requests.findLast(r=>r.path==='/api/jobs/bulk-delete'&&r.method==='POST');assert.equal(bulk.data.ids.length,2);assert.equal(await x.page.locator('.card').count(),2);
 ok('History multi-select deletes several inactive items in one compact bulk action');await x.context.close();

  for(const width of [390,1728]){x=await workspace({width});await imageForm(x);assert.ok(await x.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));mkdirSync('test-results',{recursive:true});await x.page.screenshot({path:'test-results/image-oneclick-'+width+'.png',fullPage:true});assert.deepEqual(x.errors,[]);ok('Image layout without overflow at '+width+'px');await x.context.close();}
 }
 }
 console.log('ONECLICK_BROWSER_CHECKS_PASSED='+passed);
}finally{await browser.close();await new Promise(r=>server.close(r));}

