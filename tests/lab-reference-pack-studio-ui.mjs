// Dedicated private Photo Pack Studio browser regression.
// Every authenticated API response is mocked. No provider calls or paid jobs.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const script=readFileSync('lab/lab.js','utf8');
const boot=script.indexOf("try{clerk=await loadLabAccount();");
const tail=script.indexOf("\n// Soul composer:",boot);
assert.ok(boot>0&&tail>boot);
const testSource=script.slice(0,boot)+script.slice(tail)+`
clerk={isSignedIn:true,user:{id:'photo-pack-test'},session:{id:'synthetic-pack-session',getToken:async()=> 'fake-token'},signOut:async()=>{}};
owner=true;userId='photo-pack-test';
config={enabled:true,geminiEnabled:true,falEnabled:true,dailyLimitUsd:10,videoEngines:['wan'],concurrency:{image:4,video:1}};
$('app').hidden=false;$('gate').hidden=true;
await loadHistory();await loadPacks();await loadSoulProIdentity();await restoreStudioEntry();update();
window.__pvLabFinishBoot?.();window.__packTestReady=true;
`;
const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+p+(p.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[extname(file)]||'text/plain');
  res.end(p==='/lab/lab.js'?testSource:readFileSync(file));
});
await new Promise(r=>server.listen(4189,'127.0.0.1',r));

const browser=await chromium.launch({headless:true});
const apiHost='https://parallel-vision-lab.parallelvision.workers.dev';
const packs=[],requests=[];let nextId=1,PNG=null;
const uuid=()=>`30000000-0000-4000-8000-${String(nextId++).padStart(12,'0')}`;
async function workspace(width=1440,height=900){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',d=>d.accept());
  await context.route('https://**/*',async route=>{
    const req=route.request(),u=new URL(req.url());
    if(!u.href.startsWith(apiHost)){await route.abort();return;}
    const path=u.pathname,method=req.method();
    const ct=req.headers()['content-type']||'';
    const data=ct.startsWith('application/json')?req.postDataJSON():{};
    requests.push({path,method,data});
    const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/jobs'&&method==='GET')return json({jobs:[],activeJobs:[],next:null,concurrency:{image:4,video:1}});
    if(path==='/api/packs'&&method==='GET')return json({packs:[...packs]});
    if(path==='/api/packs'&&method==='POST'){
      const refs=(data.referenceSourceIds||[]).map((assetId,i)=>({
        id:assetId,name:data.referenceRoles?.[i]?.name||'reference.png',
        role:data.referenceRoles?.[i]?.role||'none',
        note:data.referenceRoles?.[i]?.note||'',target:data.referenceRoles?.[i]?.target||''
      }));
      const pack={id:uuid(),name:data.name,refs};
      packs.push(pack);return json(pack,201);
    }
    if(path.startsWith('/api/packs/')&&method==='DELETE'){
      const at=packs.findIndex(p=>p.id===path.split('/').at(-1));
      if(at<0)return json({error:'Not found'},404);
      packs.splice(at,1);return json({ok:true});
    }
    if(path==='/api/soul-pro/identity')return json({configured:false,count:0,refs:[]});
    if(path==='/api/uploads'&&method==='POST')return json({id:uuid()},201);
    if(path.startsWith('/api/assets/')&&method==='GET'&&PNG)return route.fulfill({status:200,contentType:'image/png',body:PNG});
    return json({error:'Unexpected API request: '+method+' '+path},404);
  });
  await page.goto('http://127.0.0.1:4189/lab/studio.html?tool=image');
  await page.waitForFunction(()=>window.__packTestReady===true,undefined,{timeout:18000});
  await page.locator('#lab-boot').waitFor({state:'hidden',timeout:3000});
  if(!PNG){
    PNG=Buffer.from(await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=320;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#414c4c';ctx.fillRect(0,0,320,320);
      ctx.fillStyle='#969e92';ctx.fillRect(58,42,202,230);
      return canvas.toDataURL('image/png').split(',')[1];
    }),'base64');
  }
  return {page,context,errors};
}
const noPaid=()=>assert.equal(requests.some(r=>r.method==='POST'&&['/api/quotes','/api/jobs','/api/higgsfield/generate'].includes(r.path)),false,'Pack actions never submit paid inference');
const refs=async (page,n)=>page.waitForFunction(expected=>document.querySelectorAll('#reference-list .reference-item').length===expected,n);
mkdirSync('test-results/photo-packs',{recursive:true});
try{
  let {page,context,errors}=await workspace();
  const before=await page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height);
  await page.locator('#scene-image-open').click();await page.locator('#scene-menu-packs').click();
  assert.equal(await page.locator('#pack-studio-dialog').isVisible(),true);
  const box=await page.locator('#pack-studio-dialog').evaluate(el=>{
    const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width};
  });
  assert.ok(box.left>=12&&box.right<=1428&&box.top>=12&&box.bottom<=888,'Modal fits desktop viewport: '+JSON.stringify(box));
  assert.equal(await page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height),before,'Modal must not change composer geometry');
  assert.equal(await page.locator('#pack-studio-grid .pack-studio-card-new').count(),1);
  assert.equal(await page.locator('#pack-studio-dialog .pack-studio-side-link').count(),5,
    'Photo Packs uses the same five-section library navigation as Elements');
  assert.equal(await page.locator('.pack-studio-intro').isVisible(),true);
  assert.ok((await page.locator('.pack-studio-intro').evaluate(el=>getComputedStyle(el).backgroundImage)).includes('data:image/webp'),
    'The approved water photograph must appear only inside the Photo Packs hero');
  await page.locator('#pack-studio-list-view').click();
  assert.equal(await page.locator('#pack-studio-grid').getAttribute('data-view'),'list');
  await page.locator('#pack-studio-grid-view').click();
  assert.equal(await page.locator('#pack-studio-grid').getAttribute('data-view'),'grid');

  await page.screenshot({path:'test-results/photo-packs/empty-library-desktop.png'});
  await page.locator('#pack-studio-new').click();
  assert.equal(await page.locator('#pack-studio-create-view').isVisible(),true);
  assert.equal(await page.locator('#pack-studio-from-deck').isDisabled(),true);
  await page.locator('#pack-studio-name').fill('Private editorial portraits');
  await page.locator('#pack-studio-files').setInputFiles([
    {name:'portrait-front.png',mimeType:'image/png',buffer:PNG},
    {name:'portrait-three-quarter.png',mimeType:'image/png',buffer:PNG}
  ]);
  assert.equal(await page.locator('#pack-studio-previews .pack-studio-preview').count(),2);
  assert.equal(await page.locator('#pack-studio-photo-count').textContent(),'2 / 10 photos');
  await page.screenshot({path:'test-results/photo-packs/create-pack-desktop.png'});
  await page.locator('#pack-studio-save').click();
  await page.waitForFunction(()=>document.querySelector('#pack-studio-library-status')?.textContent.includes('saved privately'));
  assert.equal(packs.length,1);
  assert.equal(requests.filter(r=>r.path==='/api/uploads'&&r.method==='POST').length,2);
  assert.deepEqual(packs[0].refs.map(r=>r.role),['none','none']);
  await page.locator('#pack-studio-grid .pack-studio-card-photo img').first().waitFor({state:'visible'});
  await page.screenshot({path:'test-results/photo-packs/saved-library-desktop.png'});
  assert.equal(await page.locator('#pack-studio-grid .pack-studio-card-count').first().textContent(),'2 photos');
  noPaid();
  await page.locator('#pack-studio-grid .pack-studio-card-select').first().click();
  await refs(page,2);
  assert.equal(await page.locator('#pack-studio-dialog').isVisible(),false);
  // The little + remains a direct OS file chooser, independently of packs.
  const chooser=page.waitForEvent('filechooser');
  await page.locator('#image-composer-add').click();
  const fileChooser=await chooser;
  await fileChooser.setFiles({name:'third-reference.png',mimeType:'image/png',buffer:PNG});
  await refs(page,3);
  await page.locator('#scene-image-open').click();await page.locator('#scene-menu-packs').click();
  await page.locator('#pack-studio-new').click();
  assert.equal(await page.locator('#pack-studio-from-deck').getAttribute('aria-pressed'),'false','A source must be chosen explicitly');
  assert.equal(await page.locator('#pack-studio-previews .pack-studio-preview').count(),0);
  assert.equal(await page.locator('#pack-studio-save').isDisabled(),true);
  await page.locator('#pack-studio-from-deck').click();
  assert.equal(await page.locator('#pack-studio-from-deck').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#pack-studio-previews .pack-studio-preview').count(),3);
  assert.match(await page.locator('#pack-studio-create-status').textContent(),/3 photos selected/);
  const cancelledChooser=page.waitForEvent('filechooser');
  await page.locator('#pack-studio-from-device').click();
  await (await cancelledChooser).setFiles([]);
  assert.equal(await page.locator('#pack-studio-from-deck').getAttribute('aria-pressed'),'true','Cancelling upload preserves current deck');
  assert.equal(await page.locator('#pack-studio-previews .pack-studio-preview').count(),3);
  await page.locator('#pack-studio-name').fill('My base and references');
  await page.locator('#pack-studio-save').click();
  await page.waitForFunction(()=>document.querySelector('#pack-studio-library-status')?.textContent.includes('saved privately'));
  assert.equal(packs.length,2);
  assert.deepEqual(packs[1].refs.map(r=>r.role),['base','none','none']);
  assert.equal(await page.locator('#reference-list .reference-item').count(),3);
  noPaid();
  const deleteBtn=page.locator('#pack-studio-grid .pack-studio-card-delete').last();
  await deleteBtn.click({force:true});
  await page.waitForFunction(()=>document.querySelectorAll('#pack-studio-grid .pack-studio-card').length===1);
  assert.equal(packs.length,1);
  noPaid();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#pack-studio-dialog').isVisible(),false);
  assert.deepEqual(errors,[],'The pack studio must not throw browser errors');
  console.log('PASS desktop gallery, covers, staged uploads, editor roles, delete, direct +, zero paid jobs');
  await context.close();

  ({page,context,errors}=await workspace(390,844));
  await page.locator('#scene-image-open').click();await page.locator('#scene-menu-packs').click();
  const mobile=await page.locator('#pack-studio-dialog').evaluate(el=>{
    const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
  });
  assert.ok(mobile.left>=0&&mobile.right<=390&&mobile.top>=0&&mobile.bottom<=844,
    'Modal should fit phones without clipping: '+JSON.stringify(mobile));
  assert.equal(await page.locator('#pack-studio-grid .pack-studio-card').count(),1);
  await page.screenshot({path:'test-results/photo-packs/saved-library-mobile.png'});
  await page.locator('#pack-studio-new').click();
  await page.locator('#pack-studio-name').fill('Mobile reference pack');
  const mobileChooser=page.waitForEvent('filechooser');
  await page.locator('#pack-studio-from-device').click();
  await (await mobileChooser).setFiles({name:'mobile-portrait.png',mimeType:'image/png',buffer:PNG});
  assert.equal(await page.locator('#pack-studio-previews .pack-studio-preview').count(),1);
  assert.equal(await page.locator('#pack-studio-save').isEnabled(),true);
  await page.screenshot({path:'test-results/photo-packs/create-pack-mobile.png'});
  console.log('PASS mobile gallery and creation stage fit within viewport');
  assert.deepEqual(errors,[]);
  await context.close();
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
console.log('PHOTO_PACK_STUDIO_BROWSER_CHECKS_PASSED=1');
