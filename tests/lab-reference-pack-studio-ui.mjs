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
  assert.equal(await page.locator('.pack-studio-collection-heading #pack-studio-new').count(),0,
    'New photo pack lives inside the gallery, not above its toolbar');
  assert.equal(await page.locator('#pack-studio-dialog .pack-studio-view-button:visible').count(),1,
    'Grid and list share one contextual layout toggle, not two competing buttons');
  assert.equal(await page.locator('#pack-studio-library-count').textContent(),'0 saved');

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
  await page.locator('#pack-studio-search').fill('no matching collection');
  assert.equal(await page.locator('#pack-studio-grid .pack-studio-card').count(),0,
    'Search shows no unrelated collections');
  await page.locator('#pack-studio-search').fill('Private editorial');
  assert.equal(await page.locator('#pack-studio-grid .pack-studio-card').count(),1,
    'Search finds an existing saved collection');
  await page.locator('#pack-studio-search').fill('');
  const rects=selector=>page.locator(selector).evaluateAll(nodes=>nodes.map(node=>{
    const r=node.getBoundingClientRect();
    return {x:r.x,y:r.y,width:r.width,height:r.height};
  }));
  const photoNavBefore=await rects('#pack-studio-dialog .pack-studio-side-link');
  await page.locator('#pack-studio-dialog [data-pack-element="characters"]').click();
  assert.equal(await page.locator('#scene-library-dialog').isVisible(),true,
    'Characters opens from the matching Photo Packs sidebar');
  assert.equal(await page.locator('#pack-studio-dialog').isVisible(),false);
  const elementNav=await rects('#scene-tabs .scene-category-tab');
  assert.equal(elementNav.length,5);
  for(let i=0;i<5;i++){
    for(const metric of ['x','y','width','height'])
      assert.ok(Math.abs(photoNavBefore[i][metric]-elementNav[i][metric])<=1.5,
        'Sidebar position should not jump for menu item '+i+' '+metric+': '+JSON.stringify({photo:photoNavBefore[i],elements:elementNav[i]}));
  }
  await page.locator('#scene-tabs .scene-photo-packs-link').click();
  assert.equal(await page.locator('#pack-studio-dialog').isVisible(),true,
    'Photo Packs reopens from Elements without losing the collection');
  const photoNavAfter=await rects('#pack-studio-dialog .pack-studio-side-link');
  for(let i=0;i<5;i++)assert.ok(Math.abs(photoNavBefore[i].y-photoNavAfter[i].y)<=1,
    'Returning to Photo Packs must not move any sidebar icon');
  assert.equal(await page.locator('#pack-studio-grid .pack-studio-card').count(),1);

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

  // Exercise the full two-row capacity with API-mocked collections, never
  // inserting demonstration packs into production accounts.
  const originalPackCount=packs.length;
  for(let i=0;i<9;i++)packs.push({
    id:uuid(),name:'Viewport study '+i,
    refs:[{id:uuid(),name:'study.png',role:'none',note:'',target:''}]
  });
  ({page,context,errors}=await workspace(1440,900));
  await page.locator('#scene-image-open').click();
  await page.locator('#scene-menu-packs').click();
  assert.equal(await page.locator('#pack-studio-grid .pack-studio-card').count(),10);
  assert.equal(await page.locator('#pack-studio-grid .pack-studio-card-new').count(),0,
    'A full two-row gallery avoids an eleventh tile');
  assert.equal(await page.locator('.pack-studio-collection-title #pack-studio-new').count(),1,
    'Creation remains accessible as one discreet + beside the collection count');

  const fullLayout=await page.evaluate(()=>{
    const dialog=document.getElementById('pack-studio-dialog').getBoundingClientRect();
    const main=document.querySelector('#pack-studio-dialog .pack-studio-main');
    const grid=document.getElementById('pack-studio-grid');
    const cards=[...grid.querySelectorAll('.pack-studio-card')].map(el=>el.getBoundingClientRect());
    const hero=document.querySelector('#pack-studio-dialog .pack-studio-intro');
    return {centerY:(dialog.top+dialog.bottom)/2,bottom:dialog.bottom,
      rows:new Set(cards.map(rect=>Math.round(rect.top))).size,
      cols:getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      bottomOfCards:Math.max(...cards.map(rect=>rect.bottom)),
      contentScroll:main.scrollHeight-main.clientHeight,
      overflowY:getComputedStyle(main).overflowY,
      heroHeight:hero.getBoundingClientRect().height,
      headingClip:getComputedStyle(document.querySelector('#pack-studio-dialog .pack-studio-heading-copy')).clipPath};
  });
  assert.ok(Math.abs(fullLayout.centerY-450)<=8,'Photo Packs must be centered: '+JSON.stringify(fullLayout));
  assert.equal(fullLayout.rows,2,'Ten library cards use exactly two visible rows: '+JSON.stringify(fullLayout));
  assert.equal(fullLayout.cols,5,'Five desktop columns preserve the approved layout');
  assert.ok(fullLayout.heroHeight<=123,'The Photo Packs hero must stay compact');
  assert.ok(fullLayout.bottomOfCards<fullLayout.bottom-6,'No second row should be clipped');
  assert.equal(fullLayout.overflowY,'hidden','Two fully visible desktop rows should not expose a needless scrollbar: '+JSON.stringify(fullLayout));
  assert.equal(fullLayout.headingClip,'inset(50%)','Do not repeat Photo Packs above its hero');
  await page.screenshot({path:'test-results/photo-packs/two-rows-centered-desktop.png'});
  await context.close();
  packs.splice(originalPackCount);

  ({page,context,errors}=await workspace(390,844));
  await page.locator('#scene-image-open').click();await page.locator('#scene-menu-packs').click();
  const mobile=await page.locator('#pack-studio-dialog').evaluate(el=>{
    const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
  });
  assert.ok(mobile.left>=0&&mobile.right<=390&&mobile.top>=0&&mobile.bottom<=844,
    'Modal should fit phones without clipping: '+JSON.stringify(mobile));
  assert.equal(await page.locator('#pack-studio-grid .pack-studio-card').count(),1);
  const mobileShell=await page.evaluate(()=>{
    const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();
      return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const title=rect('#pack-studio-heading'),close=rect('#pack-studio-close'),search=rect('#pack-studio-search');
    const selected=rect('#pack-studio-nav-packs'),side=rect('.pack-studio-sidebar');
    const sort=document.getElementById('pack-studio-sort');
    const controls=rect('#pack-studio-dialog .pack-studio-view-controls');
    return {title,close,search,selected,side,sortAria:sort.getAttribute('aria-label'),
      heading:rect('#pack-studio-dialog .pack-studio-collection-heading'),controls};
  });
  assert.ok(mobileShell.selected.left>=mobileShell.side.left-1&&mobileShell.selected.right<=mobileShell.side.right+1,
    'Active Photo Packs tab must not be cropped on phone: '+JSON.stringify(mobileShell));
  assert.ok(Math.abs((mobileShell.close.top+mobileShell.close.bottom)/2-(mobileShell.search.top+mobileShell.search.bottom)/2)<10,
    'Close button aligns next to search instead of obscuring it: '+JSON.stringify(mobileShell));
  assert.equal(mobileShell.sortAria,'Sort photo packs',
    'Sorting keeps an accessible name without a visible extra caption');
  assert.ok(mobileShell.controls.right<=384,
    'Sort and grid/list controls fit within the phone viewport: '+JSON.stringify(mobileShell));

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
