// Synthetic two-person scene. No credentials, customer photos or provider requests.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const studio=readFileSync('lab/studio.html','utf8'),start=studio.indexOf('<section id="precision-workspace"'),end=studio.indexOf('<section id="image-studio"',start);
assert.ok(start>0&&end>start);
const html='<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/lab/precision-edit.css"></head><body><div id="app" style="display:block;padding:12px;max-width:1400px;margin:auto">'+studio.slice(start,end)+'</div></body></html>';
const server=http.createServer((req,res)=>{
 const p=new URL(req.url,'http://localhost').pathname;
 if(p==='/test'){res.writeHead(200,{'Content-Type':'text/html'}).end(html);return;}
 const target=resolve('.',p.slice(1));
 if(!target.startsWith(resolve('.')+'/')||!existsSync(target)){res.writeHead(404).end();return;}
 res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.css':'text/css'}[extname(target)]||'text/plain')}).end(readFileSync(target));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,...(process.env.PV_CHROMIUM_EXECUTABLE?{executablePath:process.env.PV_CHROMIUM_EXECUTABLE}:{})});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await page.goto(base+'/test');
  await page.evaluate(async()=>{
   const {createPrecisionEditor}=await import('/lab/precision-edit.js');
   const blobs=new Map();let seq=0;window.clickRequests=[];window.noCandidate=false;window.legacy=false;
   const make=async(name,rects)=>{
    const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');
    x.fillStyle='#000';x.fillRect(0,0,640,480);x.fillStyle='#fff';
    for(const r of rects)x.fillRect(...r);
    const b=await new Promise(r=>c.toBlob(r,'image/png'));blobs.set(name,b);return b;
   };
   await make('face-left',[[110,70,90,90]]);await make('face-right',[[400,70,90,90]]);
   await make('person-left',[[90,60,150,370]]);await make('person-right',[[370,60,150,370]]);
   await make('outfit',[[100,180,130,190]]);await make('object',[[560,330,55,70]]);
   const source=await make('source',[[90,60,150,370],[370,60,150,370]]);
   let scope='';const api=async(path,{method='GET',body}={})=>{
    window.clickRequests.push({path,method,body});
    if(path==='/api/precision/segment'&&method==='POST'){
     scope=body.targetPrompt||'';
     return {requestId:'fixture-id-1234',ticket:'fixture-ticket',expires:Date.now()+90000,...(body.candidateMasks&&!window.legacy?{candidateMasks:true}:{})};
    }
    if(path.startsWith('/api/precision/segment?')){
     if(['face','person'].includes(scope)){
      const right=scope+'-right',left=scope+'-left';
      return {status:'completed',maskSourceId:right,...(!window.legacy?{maskSourceIds:window.noCandidate?[right]:[right,left]}:{})};
     }
     return {status:'completed',maskSourceId:scope==='clothing'?'outfit':'object'};
    }
    throw Error('Unexpected request '+path);
   };
   const editor=createPrecisionEditor({host:document.getElementById('app'),api,assetBlob:async id=>{if(!blobs.has(id))throw Error('Unknown fixture');return blobs.get(id);},
    uploadAsset:async f=>{const id='upload-'+(++seq);blobs.set(id,f);return id;},notify:()=>{},owner:()=>true,falReady:()=>true,onJob:()=>{},onExit:()=>{}});
   editor.setExternalMode(true);await editor.open({file:new File([source],'two-people.png',{type:'image/png'}),id:'source'});window.editor=editor;
  });
  const click=async(scope,x,y)=>{
   await page.evaluate(scope=>{window.editor.clearSelection();window.editor.setSelectionTarget(scope);window.editor.setMode('magic');},scope);
   const c=page.locator('#precision-selection-canvas'),r=await c.boundingBox();
   await page.mouse.click(r.x+r.width*x/640,r.y+r.height*y/480);
   await page.waitForFunction(()=>!window.editor.isBusy()&&window.clickRequests.length>0);
  };
  const pixel=async(x,y)=>page.evaluate(([x,y])=>document.getElementById('precision-selection-canvas').getContext('2d').getImageData(x,y,1,1).data[3],[x,y]);
  await click('face',150,110);
  assert.ok(await pixel(150,110)>0,'Left click selects left face even when provider puts right face first');
  assert.equal(await pixel(445,110),0,'The other face remains unselected');assert.equal(await pixel(5,5),0);
  assert.equal(await page.evaluate(()=>window.clickRequests.find(x=>x.method==='POST').body.point.x),150);
  assert.equal(await page.evaluate(()=>window.clickRequests.find(x=>x.method==='POST').body.candidateMasks),true);
  await click('face',445,110);assert.ok(await pixel(445,110)>0);assert.equal(await pixel(150,110),0);
  await click('person',150,110);assert.ok(await pixel(150,350)>0,'A face click in Whole person selects the complete matching person candidate');
  assert.equal(await pixel(445,350),0);assert.equal(await pixel(5,5),0);
  await page.evaluate(()=>{window.editor.clearSelection();window.editor.setSelectionTarget('face');window.noCandidate=true;});
  await click('face',150,110);assert.equal(await page.evaluate(()=>window.editor.hasSelection()),false);
  assert.match(await page.locator('#precision-status-text').textContent(),/did not match your click/);
  assert.equal(await pixel(5,5),0,'Miss never turns the background purple');
  await page.evaluate(()=>{window.legacy=true;window.noCandidate=false;});
  await click('face',150,110);assert.equal(await page.evaluate(()=>window.editor.hasSelection()),false,'An old single-mask server fails safely on the wrong face');
  await page.evaluate(()=>{window.legacy=false;});
  await click('clothing',160,230);assert.ok(await pixel(160,230)>0);assert.equal(await pixel(150,110),0);
  await click('',580,360);assert.ok(await pixel(580,360)>0);assert.equal(await pixel(445,110),0);
  await page.evaluate(()=>{window.editor.clearSelection();window.editor.setSelectionTarget('face');});
  await page.locator('#precision-zoom-in').click();
  await click('face',445,110);assert.ok(await pixel(445,110)>0,'Zoomed canvas coordinates still select the clicked face');
  assert.equal(await pixel(150,110),0);
  assert.equal(await page.evaluate(()=>window.clickRequests.filter(x=>x.method==='POST').length),8,'One inference per explicit click, no automatic retry');
  assert.equal(await page.evaluate(()=>window.clickRequests.some(x=>/quote|submit/.test(x.path))),false,'Selection does not purchase a generation');
  assert.deepEqual(errors,[]);console.log('SAM_CLICK_BROWSER_PASS',width);await page.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}

await import('./lab-selection-regions-ui.mjs');
