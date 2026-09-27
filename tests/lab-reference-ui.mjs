// Synthetic media and mock authentication/API only. Does not purchase generations.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const { chromium } = await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const source = readFileSync('lab/lab.js', 'utf8'), boot = source.indexOf("try{const {Clerk}=await import(");
assert.ok(boot > 0);
const injected = source.slice(0, boot) + `clerk={session:{getToken:async()=> 'synthetic-token'},signOut:async()=>{}};owner=true;userId='test';config={enabled:true,concurrency:{image:4,video:1}};$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();update();window.__labTest={lock,refs:()=>references.map(r=>({name:r.file.name,size:r.file.size,type:r.file.type,width:r.width,height:r.height,role:r.role,note:r.note})),file:()=>file};`;
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
const job = { id:'30000000-0000-4000-8000-000000000001',sourceId:'30000000-0000-4000-8000-000000000003',outputId,status:'completed',createdAt:Date.now(),settings:{type:'image',mode:'image',prompt:'A ceramic sculpture.',resolution:'2k',aspectRatio:'1:1',outputFormat:'png',referenceSourceIds:[]},settledUsd:0.036 };
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
    else if(path.startsWith('/api/assets/')){await route.fulfill({status:200,contentType:'image/png',body:path.endsWith(outputId)?output:small});return;}
    else{await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Unexpected request '+path})});return;}
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
  });
  await page.goto('http://127.0.0.1:4181/lab/');await page.waitForFunction(()=>!!window.__labTest);
  if(!input){
    const make=async(w,h,color)=>Buffer.from(await page.evaluate(({w,h,color})=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,w,h);x.fillStyle='#cac0aa';for(let i=0;i<15;i++)x.fillRect(20+i*100,30+i*50,80,100);return c.toDataURL('image/png').split(',')[1];},{w,h,color}),'base64');
    small=await make(320,320,'#283947');output=await make(640,640,'#594c32');
    const full=await make(3072,2048,'#283947');input=Buffer.concat([full,Buffer.alloc(1048576-full.length)]);
  }
  return {page,context,errors,requests,uploads,workers};
}
const references=(count=7)=>Array.from({length:count},(_,i)=>({name:'architecture-reference-'+(i+1)+'.png',mimeType:'image/png',buffer:input}));
const ready=page=>page.waitForFunction(()=>document.querySelectorAll('.reference-item').length===7&&!document.querySelector('#prompt').disabled);
try{
  let x=await workspace();await x.page.click('#tool-image');
  assert.equal(await x.page.locator('#output-format').inputValue(),'png');
  await x.page.locator('#output-format').selectOption('jpeg');
  assert.equal(await x.page.locator('#output-format').inputValue(),'jpeg');
  await x.page.click('#tool-upscale');assert.equal(await x.page.locator('#output-format').inputValue(),'png');
  await x.page.click('#tool-image');assert.equal(await x.page.locator('#output-format').inputValue(),'png');
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
  assert.match(await x.page.locator('#preview-label').innerText(),/Result/i);assert.match(await x.page.locator('#empty').innerText(),/generated image/);pass('Image canvas does not misrepresent the first reference as a result');
  const layout=await x.page.evaluate(()=>({stage:document.querySelector('.stage').getBoundingClientRect().height,list:document.querySelector('#reference-list').clientHeight,scroll:document.querySelector('#reference-list').scrollHeight,canvas:document.querySelector('.canvas').getBoundingClientRect().height}));
  assert.ok(layout.stage<=741&&layout.canvas<650);assert.ok(layout.list<=351&&layout.scroll>layout.list);pass('Reference scrolling is bounded and cannot stretch the result canvas');
  await x.page.locator('.reference-item img').nth(6).click();await x.page.locator('#input-preview-dialog').waitFor({state:'visible'});
  assert.match(await x.page.locator('#input-preview-description').innerText(),/not a generated result/);
  const size=await x.page.locator('#input-preview-image').evaluate(async i=>{await i.decode();return [i.naturalWidth,i.naturalHeight];});assert.ok(Math.max(...size)<=1280);
  await x.page.locator('#input-preview-dialog [data-close]').click();assert.equal(await x.page.locator('#preview').isVisible(),false);pass('Input previews open separately and never replace the result canvas');
  await x.page.locator('#prompt').fill('Architectural sculpture in daylight.');
  await x.page.locator('.reference-item select').first().selectOption('room');
  await x.page.locator('.reference-item input').first().fill('Use only the architecture.');
  await x.page.locator('#save').click();await x.page.waitForFunction(()=>document.querySelector('#notice').textContent.startsWith('Saved privately'));
  assert.equal(x.uploads.length,7);const expectedHash=createHash('sha256').update(input).digest('hex');assert.ok(x.uploads.every(u=>u.sha===expectedHash&&u.bytes===input.length));
  const draft=x.requests.find(r=>r.path==='/api/drafts').data;assert.equal(draft.settings.outputFormat,'png');assert.equal(draft.referenceSourceIds.length,7);assert.equal(draft.settings.referenceRoles[0].role,'room');assert.equal(draft.settings.referenceRoles[0].note,'Use only the architecture.');
  assert.equal(x.requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST').length,0);pass('Save sends original bytes, ordered reference IDs, roles and notes, never the thumbnails');
  await x.page.locator('.reference-item').nth(1).getByText('Up',{exact:true}).click();assert.equal((await x.page.evaluate(()=>window.__labTest.refs()))[0].name,'architecture-reference-2.png');
  await x.page.locator('.reference-item').first().getByText('Remove',{exact:true}).click();assert.equal(await x.page.locator('.reference-item').count(),6);pass('Reorder and remove still operate on the correct originals');
  assert.deepEqual(x.errors,[]);await x.context.close();

  x=await workspace({jobs:[job]});await x.page.click('#tool-image');await x.page.getByRole('button',{name:'View image',exact:true}).click();
  await x.page.waitForFunction(()=>!document.querySelector('#download').hidden);const resultUrl=await x.page.locator('#preview').getAttribute('src');
  await x.page.locator('#reference-images').setInputFiles(references());await ready(x.page);
  assert.equal(await x.page.locator('#preview').getAttribute('src'),resultUrl);assert.equal(await x.page.locator('#preview').getAttribute('alt'),'Generated image result');
  assert.equal(await x.page.locator('#download').isVisible(),true);pass('Adding references preserves an already displayed real result and its Download button');
  await x.page.evaluate(()=>window.__labTest.lock());assert.equal(await x.page.locator('#app').isVisible(),false);assert.equal(await x.page.locator('.reference-item').count(),0);assert.equal(await x.page.locator('#input-preview-image').getAttribute('src'),null);pass('Sign-out clears input previews, result previews and private reference state');await x.context.close();

  const jpegJob={...job,settings:{...job.settings,outputFormat:'jpeg'}};
  x=await workspace({jobs:[jpegJob]});await x.page.getByRole('button',{name:'Reuse',exact:true}).click();
  await x.page.waitForFunction(()=>document.querySelector('#prompt').value==='A ceramic sculpture.'&&!document.querySelector('#prompt').disabled);
  assert.equal(await x.page.locator('#output-format').inputValue(),'jpeg');
  assert.equal(x.requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST').length,0);
  pass('Reuse preserves an older JPEG setting and never starts a generation');await x.context.close();

  x=await workspace({fallback:true});await x.page.click('#tool-image');await x.page.locator('#reference-images').setInputFiles([{name:'fallback.png',mimeType:'image/png',buffer:small}]);
  await x.page.waitForFunction(()=>document.querySelectorAll('.reference-item').length===1&&!document.querySelector('#prompt').disabled);assert.equal(x.workers.length,0);assert.deepEqual(x.errors,[]);pass('Browsers without workers retain an operational local fallback');await x.context.close();
  for(const width of [390,1728]){
    x=await workspace({width});await x.page.click('#tool-image');await x.page.locator('#reference-images').setInputFiles(references());await ready(x.page);
    assert.ok(await x.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    assert.ok(await x.page.locator('.stage').evaluate(e=>e.getBoundingClientRect().height<=740));
    mkdirSync('test-results',{recursive:true});await x.page.screenshot({path:'test-results/lab-reference-'+width+'.png',fullPage:true});
    assert.deepEqual(x.errors,[]);pass('Bounded seven-reference layout with no horizontal overflow at '+width+'px');await x.context.close();
  }
  console.log('REFERENCE_CHECKS_PASSED='+passed);
}finally{await browser.close();await new Promise(r=>server.close(r));}
