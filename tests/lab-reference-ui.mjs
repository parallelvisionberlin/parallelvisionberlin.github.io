// Legacy model integration uses the retained options handler; the visible customer composer is covered separately.
async function clickAdvanced(page){const control=page.locator('#image-composer-more');if(await control.isVisible())await control.click();else await page.evaluate(()=>document.querySelector('#image-composer-more').click());}
async function imageAdvanced(page){await page.click('#tool-image');const open=await page.locator('#app').evaluate(el=>el.classList.contains('image-settings-open'));if(!open)await clickAdvanced(page);}
async function setRetainedOutputFormat(page,value){
  // Image output format now lives in the hidden legacy settings; the current
  // visible composer is verified independently. Trigger the retained change event.
  await page.locator('#output-format').evaluate((element,next)=>{
    element.value=next;element.dispatchEvent(new Event('change',{bubbles:true}));
  },value);
}
async function saveThroughRetainedDraftHandler(page){
  // The Image Save draft button is intentionally not visible. Exercise only
  // the retained draft handler to verify original uploads, roles and order.
  // User-visible Photo Pack saving is tested in lab-image-oneclick-ui.mjs.
  await page.locator('#save').evaluate(button=>{
    if(button.disabled)throw Error('Retained draft handler disabled unexpectedly');
    button.click();
  });
}
// Synthetic media and mock authentication/API only. Does not purchase generations.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const { chromium } = await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const source = readFileSync('lab/lab.js', 'utf8'), boot = source.indexOf("try{clerk=await loadLabAccount();");
assert.ok(boot > 0);
const injected = source.slice(0, boot) + source.slice(source.indexOf("\n// Soul composer:",boot)) + `clerk={session:{getToken:async()=> 'synthetic-token'},signOut:async()=>{}};owner=true;userId='test';config={enabled:true,concurrency:{image:4,video:1}};$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();update();window.__labTest={lock,refs:()=>references.map(r=>({name:r.file.name,size:r.file.size,type:r.file.type,width:r.width,height:r.height,role:r.role,note:r.note,target:r.target})),file:()=>file};`;
const server = http.createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = resolve('.', '.' + path + (path.endsWith('/') ? 'index.html' : ''));
  if (!file.startsWith(resolve('.') + '/') || !existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', ({ '.html':'text/html', '.js':'text/javascript', '.css':'text/css' })[extname(file)] || 'text/plain');
  res.end(path === '/lab/lab.js' ? injected : readFileSync(file));
});
await new Promise(r => server.listen(4181, '127.0.0.1', r));
const browser = await chromium.launch({ headless:true });
let passed=0, input, small, output;
const pass = name => { passed++; console.log('PASS ' + name); };
const API = 'https://parallel-vision-lab.parallelvision.workers.dev';
const outputId = '30000000-0000-4000-8000-000000000002';
const job = { id:'30000000-0000-4000-8000-000000000001',sourceId:'30000000-0000-4000-8000-000000000003',outputId,status:'completed',createdAt:Date.now(),settings:{type:'image',mode:'image',engine:'seedream',model:'bytedance/seedream-5.0-pro/edit',prompt:'A ceramic sculpture.',resolution:'2k',aspectRatio:'1:1',outputFormat:'png',referenceSourceIds:[]},settledUsd:0.036 };
async function workspace({ width=1440, jobs=[], fallback=false }={}) {
  const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true});
  if(fallback)await context.addInitScript(()=>{window.Worker=undefined;});
  const page=await context.newPage(),errors=[],requests=[],uploads=[],workers=[];let sequence=10;
  page.on('pageerror',e=>errors.push(e.message));page.on('worker',w=>workers.push(w.url()));
  page.on('dialog',d=>d.accept());
  await context.route('https://**/*',async route=>{
    const r=route.request(),u=new URL(r.url());if(!u.href.startsWith(API)){await route.abort();return;}
    const path=u.pathname,method=r.method();let data={};
    if(r.headers()['content-type']?.startsWith('application/json'))data=r.postDataJSON();
    requests.push({path,method,data});let response={};
    if(path==='/api/jobs'&&method==='GET')response={jobs,activeJobs:[],concurrency:{image:4,video:1},next:null};
    else if(path==='/api/packs')response={packs:[]};
    else if(path==='/api/uploads'){
      const b=r.postDataBuffer(),id='30000000-0000-4000-8000-'+String(sequence++).padStart(12,'0');
      uploads.push({id,bytes:b.length,sha:createHash('sha256').update(b).digest('hex'),name:decodeURIComponent(r.headers()['x-filename']),type:r.headers()['content-type']});response={id};
    }else if(path==='/api/drafts')response={id:'saved-draft'};
    else if(path.startsWith('/api/assets/')){
      const bytes=path.endsWith(outputId)?output:path.endsWith('/thumbnail')?small:path===('/api/assets/'+job.sourceId)?input:small;
      await route.fulfill({status:200,contentType:'image/png',body:bytes});return;
    }
    else{await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Unexpected request '+path})});return;}
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
  });
  await page.goto('http://127.0.0.1:4181/lab/studio.html');await page.waitForFunction(()=>!!window.__labTest);
  if(!input){
    const make=async(w,h,color)=>Buffer.from(await page.evaluate(({w,h,color})=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,w,h);x.fillStyle='#cac0aa';for(let i=0;i<15;i++)x.fillRect(20+i*100,30+i*50,80,100);return c.toDataURL('image/png').split(',')[1];},{w,h,color}),'base64');
    small=await make(320,320,'#283947');output=await make(960,640,'#594c32');
    const full=await make(3072,2048,'#283947');input=Buffer.concat([full,Buffer.alloc(1048576-full.length)]);
  }
  return {page,context,errors,requests,uploads,workers};
}
const references=(count=7)=>Array.from({length:count},(_,i)=>({name:'architecture-reference-'+(i+1)+'.png',mimeType:'image/png',buffer:input}));
const ready=page=>page.waitForFunction(()=>document.querySelectorAll('.reference-item').length===7&&!document.querySelector('#prompt').disabled);
const role=(page,index)=>page.getByLabel('Role for reference '+index,{exact:true});
const target=(page,index)=>page.getByLabel('Target for reference '+index,{exact:true});
async function populatedReferenceControls(page){
  await role(page,1).selectOption('base');
  await role(page,2).selectOption('detail');await target(page,2).selectOption('hands');
  await role(page,3).selectOption('outfit');await target(page,3).selectOption('pants');
  for(const index of [4,5,6,7])await role(page,index).selectOption('identity');
}
try{
  let x=await workspace();await imageAdvanced(x.page);
  assert.equal(await x.page.locator('#output-format').inputValue(),'png');
  await setRetainedOutputFormat(x.page,'jpeg');
  assert.equal(await x.page.locator('#output-format').inputValue(),'jpeg');
  await x.page.click('#tool-upscale');assert.equal(await x.page.locator('#output-format').inputValue(),'png');
  await imageAdvanced(x.page);assert.equal(await x.page.locator('#output-format').inputValue(),'png');
  pass('New Image and Upscale default to PNG while JPEG stays available');
  await x.page.evaluate(()=>{window.framesDuringPreparation=0;const tick=()=>{window.framesDuringPreparation++;window.tick=requestAnimationFrame(tick);};tick();});
  await x.page.locator('#reference-images').setInputFiles(references());await ready(x.page);
  assert.equal(await x.page.locator('#ref-count').innerText(),'7 / 10');assert.ok(x.workers.some(u=>u.includes('image-worker.js')));
  assert.ok(await x.page.evaluate(()=>window.framesDuringPreparation>3));pass('Seven references prepare through a local worker while UI frames continue');
  const thumbnails=await x.page.locator('.reference-item img').evaluateAll(async images=>{await Promise.all(images.map(i=>i.decode()));return images.map(i=>[i.naturalWidth,i.naturalHeight]);});
  assert.ok(thumbnails.every(([w,h])=>w<=320&&h<=320));
  const originals=await x.page.evaluate(()=>window.__labTest.refs());assert.equal(originals.length,7);
  assert.ok(originals.every(r=>r.size===1048576&&r.width===3072&&r.height===2048));pass('Sidebar decodes small thumbnails while original dimensions and file sizes remain intact');
  assert.equal(await x.page.locator('#preview').isVisible(),false);assert.equal(await x.page.locator('#download').isVisible(),false);
  assert.match(await x.page.locator('#preview-label').innerText(),/Result/i);assert.match(await x.page.locator('#empty-title').innerText(),/idea a form/i);pass('Image canvas does not misrepresent the first reference as a result');
  const layout=await x.page.evaluate(()=>({
    stage:document.querySelector('.stage').getBoundingClientRect().height,
    canvas:document.querySelector('.canvas').getBoundingClientRect().height,
    trayCount:document.querySelectorAll('#image-composer-references .composer-reference-tile').length,
    width:document.documentElement.scrollWidth,viewport:innerWidth,
    deckWidth:document.querySelector('#image-composer').getBoundingClientRect().width
  }));
  assert.ok(layout.stage<=741&&layout.canvas<650,'Legacy video preview must remain bounded');
  assert.equal(layout.trayCount,7,'All seven prepared originals are represented in the current Image composer');
  assert.ok(layout.width<=layout.viewport+2,'Reference deck must not create horizontal page overflow: '+JSON.stringify(layout));
  assert.ok(layout.deckWidth<=layout.viewport+2,'Reference deck must remain within the viewport');
  pass('All seven references fit the modern bounded composer without horizontal overflow');
  await x.page.locator('#image-composer-references .composer-reference-tile').nth(6).click();await x.page.locator('#input-preview-dialog').waitFor({state:'visible'});
  assert.match(await x.page.locator('#input-preview-description').innerText(),/not a generated result/);
  const size=await x.page.locator('#input-preview-image').evaluate(async i=>{await i.decode();return [i.naturalWidth,i.naturalHeight];});assert.ok(Math.max(...size)<=1280);
  await x.page.locator('#input-preview-dialog [data-close]').click();assert.equal(await x.page.locator('#preview').isVisible(),false);pass('Input previews open separately and never replace the result canvas');
  await x.page.locator('#prompt:visible, #image-composer-prompt:visible').fill('Architectural sculpture in daylight.');
  await x.page.click('#composer-reference-intent-toggle');await x.page.click('[data-reference-intent="references"]');await imageAdvanced(x.page);
  await x.page.locator('.reference-item select').first().selectOption('room');
  await x.page.locator('.reference-item input').first().fill('Use only the architecture.');
  await saveThroughRetainedDraftHandler(x.page);await x.page.waitForFunction(()=>document.querySelector('#notice').textContent.startsWith('Saved privately'));
  assert.equal(x.uploads.length,7);const expectedHash=createHash('sha256').update(input).digest('hex');assert.ok(x.uploads.every(u=>u.sha===expectedHash&&u.bytes===input.length));
  const draft=x.requests.find(r=>r.path==='/api/drafts').data;assert.equal(draft.settings.outputFormat,'png');assert.equal(draft.referenceSourceIds.length,7);assert.equal(draft.settings.referenceRoles[0].role,'room');assert.equal(draft.settings.referenceRoles[0].note,'Use only the architecture.');
  assert.equal(x.requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST').length,0);pass('Save sends original bytes, ordered reference IDs, roles and notes, never the thumbnails');
  await x.page.locator('.reference-item').nth(1).getByText('Up',{exact:true}).click();assert.equal((await x.page.evaluate(()=>window.__labTest.refs()))[0].name,'architecture-reference-2.png');
  await x.page.locator('.reference-item').first().getByText('Remove',{exact:true}).click();assert.equal(await x.page.locator('.reference-item').count(),6);pass('Reorder and remove still operate on the correct originals');
  assert.deepEqual(x.errors,[]);await x.context.close();

  x=await workspace();await imageAdvanced(x.page);
  await x.page.locator('#reference-images').setInputFiles(references());await ready(x.page);
  await role(x.page,3).selectOption('base');
  let assigned=await x.page.evaluate(()=>window.__labTest.refs());
  assert.equal(assigned[0].name,'architecture-reference-3.png');assert.equal(assigned[0].role,'base');
  assert.deepEqual(assigned.map(r=>r.name),['architecture-reference-3.png','architecture-reference-1.png','architecture-reference-2.png','architecture-reference-4.png','architecture-reference-5.png','architecture-reference-6.png','architecture-reference-7.png']);
  await role(x.page,4).selectOption('base');assigned=await x.page.evaluate(()=>window.__labTest.refs());
  assert.equal(assigned[0].name,'architecture-reference-4.png');assert.equal(assigned[0].role,'base');
  assert.equal(assigned[1].name,'architecture-reference-3.png');assert.equal(assigned[1].role,'none');
  assert.equal(assigned.filter(r=>r.role==='base').length,1);
  assert.equal(await x.page.locator('.reference-item').nth(1).getByRole('button',{name:'Up',exact:true}).isDisabled(),true);
  pass('Choosing Base moves that original to Reference 1, clears the previous Base, and keeps it first');
  await x.page.locator('#prompt:visible, #image-composer-prompt:visible').fill('Preserve the studio lighting.');
  await role(x.page,2).selectOption('detail');
  assert.equal(await target(x.page,2).inputValue(),'');
  assert.equal(await x.page.locator('#generate').isDisabled(),true);assert.equal(await x.page.locator('#save').isDisabled(),true);
  assert.match(await x.page.locator('#reference-guidance-warning').innerText(),/Choose a detail for Reference 2/);
  await target(x.page,2).selectOption('hands');
  assert.equal(await x.page.locator('#generate').isDisabled(),false);
  await x.page.locator('#prompt:visible, #image-composer-prompt:visible').fill('');
  assert.equal(await x.page.locator('#generate').isDisabled(),false);assert.equal(await x.page.locator('#save').isDisabled(),false);
  assert.equal(await x.page.locator('#prompt-label').textContent(),'Image direction (optional)');
  pass('Detail requires a target, then Base plus Hands works with no written image direction');
  await role(x.page,3).selectOption('outfit');assert.equal(await target(x.page,3).inputValue(),'full');
  await target(x.page,3).selectOption('pants');
  assert.equal(await target(x.page,1).count(),0);
  assert.equal(await x.page.locator('#reference-guidance details').evaluate(e=>e.open),false);
  assert.match(await x.page.locator('#reference-provider').textContent(),/Seedream 5 Pro.*SpicyAPI/);
  await x.page.locator('#reference-guidance summary').click();
  const preview=await x.page.locator('#reference-guidance-text').innerText();
  assert.match(preview,/Reference 1 \[Base image\]/);assert.match(preview,/Reference 2 \[Detail \/ Hands\]/);assert.match(preview,/Reference 3 \[Clothing \/ Pants\]/);
  assert.match(preview,/Use only the hands as a localized visual reference/);assert.match(preview,/Use only the pants/);
  assert.match(preview,/REQUESTED IMAGE: Apply the assigned reference properties to the base image/);
  assert.match(await x.page.locator('#reference-guidance-count').textContent(),/\/ 5,000 characters/);
  assert.match(await x.page.locator('#composer-prompt-budget').textContent(),/left$/);
  assert.equal(await x.page.locator('#composer-prompt-budget').isVisible(),false,'Healthy counter stays out of the prompt');
  assert.match(await x.page.locator('#composer-prompt-budget').getAttribute('title'),/Mood and reference instructions/);
  assert.ok(preview.indexOf('Reference 1 [Base image]')<preview.indexOf('Reference 2 [Detail / Hands]'));
  pass('Clothing exposes Pants and the collapsed SpicyAPI preview expands into the ordered automatic instructions');
  await x.page.getByLabel('Note for reference 2',{exact:true}).fill('Keep the existing hand position.');
  await saveThroughRetainedDraftHandler(x.page);await x.page.waitForFunction(()=>document.querySelector('#notice').textContent.startsWith('Saved privately'));
  const guidedDraft=x.requests.find(r=>r.path==='/api/drafts').data;
  assert.match(guidedDraft.settings.prompt,/^Create a natural photographic variation of the base image/,
    'Blank written direction receives approved base-image variation guidance');
  assert.equal(guidedDraft.referenceSourceIds.length,7);
  assert.deepEqual(guidedDraft.settings.referenceRoles.slice(0,3).map(({role,target})=>({role,...(target===undefined?{}:{target})})),[{role:'base'},{role:'detail',target:'hands'},{role:'outfit',target:'pants'}]);
  assert.equal(guidedDraft.settings.referenceRoles[0].name,'architecture-reference-4.png');
  assert.equal(guidedDraft.settings.referenceRoles[1].note,'Keep the existing hand position.');
  assert.deepEqual(guidedDraft.referenceSourceIds,x.uploads.map(u=>u.id));
  assert.equal(x.requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST').length,0);
  pass('Draft keeps role-only direction, ordered originals, detail and clothing targets, and optional notes');
  await x.page.locator('#prompt:visible, #image-composer-prompt:visible').fill('A'.repeat(4900));
  assert.match(await x.page.locator('#reference-guidance-warning').innerText(),/exceed 5,000 characters/);
  assert.match(await x.page.locator('#composer-prompt-budget').textContent(),/characters over limit$/);
  assert.equal(await x.page.locator('#composer-prompt-budget').isVisible(),true,'Only an over-limit warning becomes visible');
  const budgetPosition=await x.page.evaluate(()=>{
    const badge=document.querySelector('#composer-prompt-budget').getBoundingClientRect();
    const editor=document.querySelector('#image-composer-prompt').getBoundingClientRect();
    return {badgeBottom:badge.bottom,editorTop:editor.top};
  });
  assert.ok(budgetPosition.badgeBottom<=budgetPosition.editorTop,
    'Over-limit warning floats above the input instead of covering written text: '+JSON.stringify(budgetPosition));
  assert.equal(await x.page.locator('#generate').isDisabled(),true);assert.equal(await x.page.locator('#save').isDisabled(),true);
  pass('The final instruction budget blocks oversized requests after automatic role text is included');
  assert.deepEqual(x.errors,[]);await x.context.close();

  x=await workspace({jobs:[job]});await imageAdvanced(x.page);await clickAdvanced(x.page);await x.page.locator('#history .card[data-kind="image"]').first().click();
  await x.page.waitForFunction(()=>document.querySelector('#image-lightbox').open);
  await x.page.locator('#image-lightbox-img').evaluate(async img=>{await img.decode();});
  const resultUrl=await x.page.locator('#image-lightbox-img').getAttribute('src');
  const detail=await x.page.evaluate(()=>{
    const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    return {dialog:rect('#image-lightbox'),stage:rect('#image-lightbox-stage'),image:rect('#image-lightbox-img'),
      right:rect('.image-detail-inspector'),viewport:{width:innerWidth,height:innerHeight},
      imageSize:[document.querySelector('#image-lightbox-img').naturalWidth,document.querySelector('#image-lightbox-img').naturalHeight]};
  });
  console.log('FULL_IMAGE_DETAIL',JSON.stringify(detail));
  assert.ok(detail.dialog.width>=detail.viewport.width-1,'Image viewer occupies full browser width');
  assert.ok(detail.dialog.height>=detail.viewport.height-1,'Image viewer occupies full browser height');
  assert.ok(detail.right.width>=300,'Right inspector is visible and usable');
  assert.ok(detail.image.right<=detail.right.left,'Complete image cannot extend beneath inspector');
  assert.ok(detail.image.width<=detail.stage.width&&detail.image.height<=detail.stage.height,'Image fits its stage without cropping');
  assert.deepEqual(detail.imageSize,[960,640],'Native image retains landscape dimensions');
  assert.equal(await x.page.locator('#image-lightbox-img').evaluate(img=>getComputedStyle(img).objectFit),'contain','The viewer preserves the original aspect ratio inside its stable image box');
  assert.equal(await x.page.locator('#image-detail-prompt').innerText(),'A ceramic sculpture.');
  assert.equal(await x.page.locator('#image-detail-model').innerText(),'Seedream 5 Pro');
  await x.page.waitForFunction(()=>document.querySelector('#image-detail-reference-thumb').naturalWidth>0
    && !document.querySelector('#image-detail-reference-wrap').hidden);
  assert.equal(await x.page.locator('#image-detail-reference-caption').innerText(),'Source image');
  assert.equal(await x.page.locator('.image-detail-reference-item').first().getAttribute('aria-haspopup'),'dialog');
  const originalThumbUrl=await x.page.locator('#image-detail-reference-thumb').getAttribute('src');
  await x.page.locator('.image-detail-reference-item').first().click();
  await x.page.waitForFunction(()=>document.querySelector('#image-source-lightbox').open&&document.querySelector('#image-source-preview').naturalWidth>0);
  assert.notEqual(await x.page.locator('#image-source-preview').getAttribute('src'),originalThumbUrl,
    'The original viewer must not upscale a compressed thumbnail');
  assert.deepEqual(await x.page.locator('#image-source-preview').evaluate(img=>[img.naturalWidth,img.naturalHeight]),[3072,2048],
    'Opening the preview restores the 3072 × 2048 source, not a 320 px thumbnail');
  await x.page.waitForFunction(()=>!document.querySelector('#image-source-download').disabled);
  const originalRequestsBefore=x.requests.filter(r=>r.path==='/api/assets/'+job.sourceId).length;
  const downloadedSource=x.page.waitForEvent('download');
  await x.page.locator('#image-source-download').click();
  const downloaded=await downloadedSource;
  assert.equal(downloaded.suggestedFilename(),'parallel-vision-source-'+job.sourceId+'.png',
    'Source download must use the original file format and a distinct name');
  assert.deepEqual(readFileSync(await downloaded.path()),input,
    'Download original must contain the exact uploaded image bytes, not WebP thumbnail bytes');
  assert.equal(x.requests.filter(r=>r.path==='/api/assets/'+job.sourceId).length,originalRequestsBefore,
    'Downloading an already-open original must not request the full file again');
  assert.equal(await x.page.locator('#image-source-fit').isEnabled(),true);
  await x.page.locator('#image-source-fit').click();
  assert.equal(await x.page.locator('#image-source-stage').evaluate(el=>el.classList.contains('is-zoomed')),true);
  await x.page.locator('#image-source-fit').click();
  assert.equal(await x.page.locator('#image-source-stage').evaluate(el=>el.classList.contains('is-zoomed')),false);
  await x.page.locator('#image-source-close').click();
  assert.equal(await x.page.locator('#image-source-lightbox').evaluate(el=>el.open),false);
  assert.equal(await x.page.locator('#image-lightbox').evaluate(el=>el.open),true);
  assert.equal(await x.page.locator('#image-lightbox-img').getAttribute('src'),resultUrl,
    'Closing the source must restore the exact generated result');
  await x.page.locator('.image-detail-reference-item').first().click();
  await x.page.keyboard.press('Escape');
  assert.equal(await x.page.locator('#image-source-lightbox').evaluate(el=>el.open),false,
    'Escape closes only the original photo');
  assert.equal(await x.page.locator('#image-lightbox').evaluate(el=>el.open),true,
    'Escape on original keeps the result viewer open');
  await x.page.locator('.image-detail-reference-item').first().click();
  await x.page.locator('#image-source-back').click();
  assert.equal(await x.page.locator('#image-lightbox').evaluate(el=>el.open),true);
  pass('Source thumbnail opens original full size, Fit/100%, X, Escape and Back return to the unchanged result');
  const polish=await x.page.evaluate(()=>{
    const close=document.querySelector('#image-lightbox-close').getBoundingClientRect();
    const topbar=document.querySelector('.image-detail-topbar').getBoundingClientRect();
    const download=document.querySelector('#image-lightbox-download').getBoundingClientRect();
    return {close:{left:close.left,right:close.right,top:close.top,bottom:close.bottom},topbar:{right:topbar.right,top:topbar.top,bottom:topbar.bottom},downloadRight:download.right,
      promptBorder:getComputedStyle(document.querySelector('.image-detail-prompt-card')).borderTopWidth,
      detailsBorder:getComputedStyle(document.querySelector('#image-detail-metadata')).borderTopWidth};
  });
  assert.ok(polish.close.right>=1420&&polish.close.right<=1440&&polish.close.top>=0&&polish.close.bottom<=64,
    'Close X is at the top-right of the complete viewer');
  assert.equal(await x.page.locator('#image-detail-pixels').innerText(),'960 × 640 px');
  assert.equal(polish.promptBorder,'0px','Prompt uses the approved flat inspector');
  assert.equal(await x.page.locator('.image-detail-utility-row #image-lightbox-download').count(),1,'Download is in the pinned utility row');
  assert.equal(polish.detailsBorder,'0px','Details uses the approved flat inspector');
  await x.page.locator('#image-detail-metadata > summary').click();
  assert.equal(await x.page.locator('#image-detail-metadata').evaluate(el=>el.open),false);
  await x.page.locator('#image-detail-metadata > summary').click();
  assert.equal(await x.page.locator('#image-detail-metadata').evaluate(el=>el.open),true);
  await x.page.locator('#image-lightbox-fit').click();
  assert.equal(await x.page.locator('#image-lightbox-stage').evaluate(e=>e.classList.contains('is-zoomed')),true,'100% zoom must be available on demand');
  await x.page.locator('#image-lightbox-fit').click();
  assert.equal(await x.page.locator('#image-lightbox-stage').evaluate(e=>e.classList.contains('is-zoomed')),false,'Fit mode restores complete uncropped image');
  mkdirSync('test-results',{recursive:true});
  await x.page.screenshot({path:'test-results/lab-image-detail-fullscreen.png',fullPage:false});
  await x.page.locator('#reference-images').setInputFiles(references());await ready(x.page);
  assert.equal(await x.page.locator('#image-lightbox-img').getAttribute('src'),resultUrl);assert.equal(await x.page.locator('#image-lightbox-img').getAttribute('alt'),'Generated image, full-size preview');
  assert.equal(await x.page.locator('#image-lightbox-download').isVisible(),true);pass('Adding references preserves the real result and visible Image viewer download');
  await x.page.evaluate(()=>window.__labTest.lock());assert.equal(await x.page.locator('#app').isVisible(),false);assert.equal(await x.page.locator('.reference-item').count(),0);assert.equal(await x.page.locator('#input-preview-image').getAttribute('src'),null);pass('Sign-out clears input previews, result previews and private reference state');await x.context.close();

  const longPrompt='SECOND IMAGE. ' + 'Architectural fashion study with natural light, a continuous narrative and original composition. '.repeat(6);
  const secondJob={...job,id:'30000000-0000-4000-8000-000000000020',
    outputId:'30000000-0000-4000-8000-000000000021',settings:{...job.settings,prompt:longPrompt}};
  x=await workspace({jobs:[job,secondJob]});
  await x.page.click('#tool-image');
  await x.page.locator('#history .card[data-kind="image"]').first().click();
  await x.page.waitForFunction(()=>document.querySelector('#image-lightbox').open);
  assert.equal(await x.page.locator('#image-lightbox-counter').innerText(),'1 / 2');
  assert.equal(await x.page.locator('#image-detail-prev').isVisible(),false);
  assert.equal(await x.page.locator('#image-detail-next').isVisible(),true);
  await x.page.waitForFunction(()=>document.querySelector('#image-detail-reference-wrap')&&!document.querySelector('#image-detail-reference-wrap').hidden);
  await x.page.locator('.image-detail-reference-item').first().click();
  await x.page.keyboard.press('ArrowRight');
  assert.equal(await x.page.locator('#image-lightbox-counter').innerText(),'1 / 2',
    'Image archive navigation must not change while viewing the original');
  await x.page.locator('#image-source-back').click();
  await x.page.locator('#image-detail-next').click();
  await x.page.waitForFunction(()=>document.querySelector('#image-detail-prompt').textContent.startsWith('SECOND IMAGE.'));
  assert.equal(await x.page.locator('#image-lightbox-counter').innerText(),'2 / 2');
  assert.equal(await x.page.locator('#image-detail-expand').isVisible(),true);
  await x.page.locator('#image-detail-expand').click();
  assert.equal(await x.page.locator('#image-detail-expand').getAttribute('aria-expanded'),'true');
  await x.page.screenshot({path:'test-results/lab-image-detail-navigation.png',fullPage:false});
  await x.page.keyboard.press('ArrowLeft');
  await x.page.waitForFunction(()=>document.querySelector('#image-lightbox-counter').textContent==='1 / 2');
  assert.equal(await x.page.locator('#image-detail-prompt').innerText(),'A ceramic sculpture.');
  await x.page.evaluate(()=>{
    const el=document.getElementById('image-lightbox-stage');
    if(typeof Touch!=='function')return;
    const start=new Touch({identifier:3,target:el,clientX:850,clientY:390});
    const end=new Touch({identifier:3,target:el,clientX:660,clientY:390});
    el.dispatchEvent(new TouchEvent('touchstart',{touches:[start],changedTouches:[start],bubbles:true}));
    el.dispatchEvent(new TouchEvent('touchend',{touches:[],changedTouches:[end],bubbles:true}));
  });
  await x.page.waitForFunction(()=>document.querySelector('#image-lightbox-counter').textContent==='2 / 2');
  await x.page.locator('#image-lightbox-close').click();
  assert.equal(await x.page.locator('#image-lightbox').evaluate(el=>el.open),false);
  assert.deepEqual(x.errors,[]);
  pass('Gallery next/previous, keyboard and swipe navigation with collapsible prompt and source');
  await x.context.close();

  const jpegJob={...job,settings:{...job.settings,outputFormat:'jpeg'}};
  x=await workspace({jobs:[jpegJob]});await x.page.click('#tool-image');await x.page.locator('#history .card[data-kind="image"]').first().click();await x.page.click('#image-detail-reuse');
  await x.page.waitForFunction(()=>document.querySelector('#prompt').value==='A ceramic sculpture.'&&!document.querySelector('#prompt').disabled);
  assert.equal(await x.page.locator('#output-format').inputValue(),'jpeg');
  assert.equal(x.requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST').length,0);
  pass('Reuse preserves an older JPEG setting and never starts a generation');await x.context.close();

  const roleOnlyJob={...job,settings:{...job.settings,prompt:'',referenceSourceIds:['30000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000006'],referenceRoles:[{name:'studio-base.png',role:'base',note:''},{name:'hand-reference.png',role:'detail',target:'hands',note:'Keep the existing hand position.'},{name:'pants-reference.png',role:'outfit',target:'pants',note:''}]}};
  x=await workspace({jobs:[roleOnlyJob]});await x.page.click('#tool-image');await x.page.locator('#history .card[data-kind="image"]').first().click();await x.page.click('#image-detail-reuse');
  await x.page.waitForFunction(()=>document.querySelectorAll('.reference-item').length===3&&!document.querySelector('#prompt').disabled);
  assert.equal(await x.page.locator('#prompt').inputValue(),'');assert.equal(await x.page.locator('#generate').isDisabled(),false);
  assert.equal(await role(x.page,1).inputValue(),'base');assert.equal(await target(x.page,2).inputValue(),'hands');assert.equal(await target(x.page,3).inputValue(),'pants');
  assert.equal(await x.page.getByLabel('Note for reference 2',{exact:true}).inputValue(),'Keep the existing hand position.');
  assert.equal(x.requests.filter(r=>r.path==='/api/assets/30000000-0000-4000-8000-000000000004').length,1);
  assert.equal(x.requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST').length,0);
  assert.deepEqual(x.errors,[]);pass('Reuse restores a role-only edit with its original Base, Hands, Pants and note without generating');await x.context.close();

  x=await workspace({fallback:true});await imageAdvanced(x.page);await x.page.locator('#reference-images').setInputFiles([{name:'fallback.png',mimeType:'image/png',buffer:small}]);
  await x.page.waitForFunction(()=>document.querySelectorAll('.reference-item').length===1&&!document.querySelector('#prompt').disabled);assert.equal(x.workers.length,0);assert.deepEqual(x.errors,[]);pass('Browsers without workers retain an operational local fallback');await x.context.close();
  for(const width of [390,1728]){
    x=await workspace({width});await imageAdvanced(x.page);await x.page.locator('#reference-images').setInputFiles(references());await ready(x.page);
    await populatedReferenceControls(x.page);
    await x.page.locator('#reference-list').evaluate(e=>e.scrollTop=0);
    assert.ok(await x.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    assert.ok(await x.page.locator('.stage').evaluate(e=>e.getBoundingClientRect().height<=740));
    mkdirSync('test-results',{recursive:true});await x.page.screenshot({path:'test-results/lab-reference-'+width+'.png',fullPage:true});
    assert.deepEqual(x.errors,[]);pass('Bounded seven-reference layout with no horizontal overflow at '+width+'px');await x.context.close();
  }
  console.log('REFERENCE_CHECKS_PASSED='+passed);
}finally{await browser.close();await new Promise(r=>server.close(r));}

