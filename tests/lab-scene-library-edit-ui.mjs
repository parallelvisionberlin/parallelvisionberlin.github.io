// Dedicated private Scene Library editable Elements browser regression.
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
    if(path.startsWith('/api/packs/')&&method==='PATCH'){
      const at=packs.findIndex(p=>p.id===path.split('/').at(-1));
      if(at<0)return json({error:'Not found'},404);
      const pack=packs[at];
      if(pack.name!==data.expectedName||JSON.stringify(pack.refs)!==JSON.stringify(data.expectedRefs))
        return json({error:'This Element changed elsewhere.'},409);
      const refs=data.referenceSourceIds.map((id,i)=>({
        id,name:data.referenceRoles[i]?.name||'reference.png',
        role:data.referenceRoles[i]?.role||'none',
        note:data.referenceRoles[i]?.note||'',target:data.referenceRoles[i]?.target||''
      }));
      packs[at]={...pack,name:data.name,refs};
      return json(packs[at]);
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
mkdirSync('test-results/scene-elements-edit',{recursive:true});
try{
  const sourceIds=[uuid(),uuid()];
  const prefix='Location @MyRoom: use this setting, without copying incidental people.';
  const original={id:uuid(),name:'PVSCENE1|locations|MyRoom',refs:sourceIds.map((id,i)=>({
    id,name:'original-room-'+(i+1)+'.png',role:'room',note:prefix+' Keep lamp exactly.',target:''
  }))};
  packs.push(original);
  let {page,context,errors}=await workspace();
  await page.locator('#scene-image-open').click();
  await page.locator('#scene-menu-elements').click();
  await page.locator('[data-scene-target="locations"]').click();
  await page.locator('#scene-grid .scene-card').first().waitFor();
  assert.equal(await page.locator('#scene-grid .scene-card').count(),1);
  await page.locator('#scene-grid [data-scene-menu]').click();
  assert.equal(await page.locator('#scene-grid [data-scene-edit]').isVisible(),true);
  assert.equal(await page.locator('#scene-grid [data-scene-delete]').isVisible(),true);
  await page.locator('#scene-grid [data-scene-edit]').click();
  assert.equal(await page.locator('#scene-create').isVisible(),true);
  assert.equal(await page.locator('#scene-create-heading-title').textContent(),'Edit element');
  assert.equal(await page.locator('#scene-name').inputValue(),'MyRoom');
  assert.equal(await page.locator('#scene-photo-count').textContent(),'2 / 8 images');
  assert.equal(await page.locator('#scene-note').inputValue(),'Keep lamp exactly.');
  assert.equal(await page.locator('#scene-photo').count(),0,'Legacy preview ID must not appear');
  assert.equal(await page.locator('#scene-photos .scene-photo').count(),2);
  await page.screenshot({path:'test-results/scene-elements-edit/edit-location-desktop.png'});
  await page.locator('#scene-name').fill('MyRoom v2');
  await page.locator('#scene-note').fill('Preserve the real doors, furniture and musical instruments.');
  await page.locator('#scene-photos .scene-photo-remove').first().click();
  assert.equal(await page.locator('#scene-photo-count').textContent(),'1 / 8 images');
  await page.locator('#scene-files').setInputFiles({name:'window-new.png',mimeType:'image/png',buffer:PNG});
  assert.equal(await page.locator('#scene-photo-count').textContent(),'2 / 8 images');
  await page.locator('#scene-photos [aria-label="Move photo 2 earlier"]').click();
  await page.locator('#scene-save').click();
  await page.waitForFunction(()=>document.querySelector('#scene-library-status')?.textContent.includes('updated.'));
  assert.equal(packs.length,1,'Editing updates a saved record, it never creates a duplicate');
  assert.equal(packs[0].id,original.id,'Existing Element ID must remain stable');
  assert.equal(packs[0].name,'PVSCENE1|locations|MyRoom v2');
  assert.equal(packs[0].refs.length,2);
  assert.equal(packs[0].refs[1].id,sourceIds[1]);
  assert.ok(packs[0].refs.every(r=>r.note.includes('Preserve the real doors')));
  assert.equal(requests.filter(r=>r.path==='/api/packs'&&r.method==='POST').length,0);
  assert.equal(requests.filter(r=>r.path.endsWith(original.id)&&r.method==='PATCH').length,1);
  noPaid();
  await page.locator('#scene-grid [data-scene-menu]').click();
  await page.locator('#scene-grid [data-scene-edit]').click();
  assert.equal(await page.locator('#scene-name').inputValue(),'MyRoom v2');
  assert.equal(await page.locator('#scene-photos .scene-photo').count(),2);
  await page.locator('#scene-name').fill('Uncommitted name');
  await page.locator('#scene-cancel').click();
  assert.equal(packs[0].name,'PVSCENE1|locations|MyRoom v2','Cancel must not modify the saved record');
  assert.deepEqual(errors,[],'Element edit should not throw errors in Chromium');
  await context.close();

  ({page,context,errors}=await workspace(390,844));
  await page.locator('#scene-image-open').click();
  await page.locator('#scene-menu-elements').click();
  await page.locator('[data-scene-target="locations"]').click();
  await page.locator('#scene-grid [data-scene-menu]').click();
  await page.locator('#scene-grid [data-scene-edit]').click();
  const bounds=await page.locator('#scene-library-dialog').evaluate(el=>{
    const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
  });
  assert.ok(bounds.left>=0&&bounds.right<=390&&bounds.top>=0&&bounds.bottom<=844,
    'Edit modal stays within mobile viewport: '+JSON.stringify(bounds));
  assert.equal(await page.locator('#scene-save').isVisible(),true);
  await page.screenshot({path:'test-results/scene-elements-edit/edit-location-mobile.png'});
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('SCENE_LIBRARY_EDIT_BROWSER_CHECKS_PASSED=1');
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
