// Synthetic masks only. No real photos, authentication, paid calls or external network.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const studio=readFileSync('lab/studio.html','utf8'),start=studio.indexOf('<section id="precision-workspace"'),end=studio.indexOf('<section id="image-studio"',start);
assert.ok(start>0&&end>start);
const html='<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/lab/precision-edit.css"></head><body><div id="app" style="padding:12px;max-width:1400px;margin:auto">'+studio.slice(start,end)+'</div></body></html>';
const server=http.createServer((req,res)=>{
 const p=new URL(req.url,'http://localhost').pathname;
 if(p==='/test'){res.writeHead(200,{'Content-Type':'text/html'}).end(html);return;}
 const target=resolve('.',p.slice(1));if(!target.startsWith(resolve('.')+'/')||!existsSync(target)){res.writeHead(404).end();return;}
 res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.css':'text/css'}[extname(target)]||'text/plain')}).end(readFileSync(target));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,...(process.env.PV_CHROMIUM_EXECUTABLE?{executablePath:process.env.PV_CHROMIUM_EXECUTABLE}:{})});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await page.goto(base+'/test');
  await page.evaluate(async()=>{
   const {createPrecisionEditor}=await import('/lab/precision-edit.js');
   const blobs=new Map();window.requests=[];window.hold=false;window.wrongOnly=false;
   const make=async(name,rects)=>{const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,640,480);x.fillStyle='#fff';for(const r of rects)x.fillRect(...r);const b=await new Promise(r=>c.toBlob(r));blobs.set(name,b);return b;};
   await make('person-left',[[90,60,150,370]]);await make('person-right',[[370,60,150,370]]);
   await make('outfit-left',[[100,180,130,190]]);await make('outfit-right',[[380,180,130,190]]);await make('object',[[560,330,55,70]]);
   const source=await make('source',[[90,60,150,370],[370,60,150,370]]);let target='';
   const api=async(path,{method='GET',body}={})=>{
    window.requests.push({path,method,body});
    if(method==='POST'&&path==='/api/precision/segment'){
     target=body.targetPrompt||'';if(window.hold)await new Promise(r=>window.finishRequest=r);
     return {requestId:'fixture-request-123',ticket:'fixture-ticket',expires:Date.now()+90000,...(body.candidateMasks?{candidateMasks:true}:{})};
    }
    if(path.startsWith('/api/precision/segment?')){
     const ids=target==='person'?['person-right','person-left']:target==='clothing'?(window.wrongOnly?['outfit-right']:['outfit-right','outfit-left']):['object'];
     return {status:'completed',maskSourceId:ids[0],...(target?{maskSourceIds:ids}:{})};
    }
    throw Error('Unexpected request '+path);
   };
   window.editor=createPrecisionEditor({host:document.getElementById('app'),api,assetBlob:async id=>blobs.get(id),uploadAsset:async()=>{throw Error('Fixture source already owned');},notify:()=>{},owner:()=>true,falReady:()=>true,onJob:()=>{},onExit:()=>{}});
   window.editor.setExternalMode(true);await window.editor.open({file:new File([source],'fixture.png',{type:'image/png'}),id:'source'});
  });
  const photoClick=async(x,y)=>{const r=await page.locator('#precision-selection-canvas').boundingBox();await page.mouse.click(r.x+r.width*x/640,r.y+r.height*y/480);};
  const done=()=>page.waitForFunction(()=>!window.editor.isBusy());
  const pixel=(x,y)=>page.evaluate(([x,y])=>document.getElementById('precision-selection-canvas').getContext('2d').getImageData(x,y,1,1).data[3],[x,y]);
  await page.evaluate(()=>{window.editor.setSelectionTarget('clothing');window.editor.setMode('magic');window.hold=true;});
  await photoClick(150,230);
  assert.equal(await page.locator('#precision-source-holder').getAttribute('aria-busy'),'true','Busy is visible before the provider response');
  assert.equal(await page.locator('.pv-selection-feedback').isVisible(),true);assert.match(await page.locator('.pv-selection-feedback').textContent(),/Selecting/);
  assert.equal(await page.locator('.pv-selection-click-ring').isVisible(),true);
  assert.equal(await page.locator('.pv-selection-scan').isVisible(),true,'A visible in-photo sweep communicates processing');
  await photoClick(150,230);assert.equal(await page.evaluate(()=>window.requests.filter(x=>x.method==='POST').length),1,'Double clicks do not buy extra requests');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.pv-selection-click-ring').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.evaluate(()=>{window.hold=false;window.finishRequest();});await done();
  assert.ok(await pixel(150,230)>0);assert.equal(await pixel(440,230),0,'Other garment remains untouched');
  assert.equal(await page.locator('.pv-selection-feedback').isVisible(),false);
  assert.equal(await page.locator('.pv-selection-scan').isVisible(),false,'The sweep stops when selection completes');
  assert.equal(await page.locator('#precision-source-holder').getAttribute('aria-busy'),null);
  assert.equal(await page.evaluate(()=>window.requests.find(x=>x.method==='POST').body.candidateMasks),true);
  await page.evaluate(()=>{window.editor.clearSelection();window.editor.setSelectionTarget('background');});
  await photoClick(20,20);await done();
  assert.ok(await pixel(5,5)>0);assert.ok(await pixel(630,470)>0);assert.ok(await pixel(300,250)>0,'All environment regions are selected');
  assert.equal(await pixel(150,230),0);assert.equal(await pixel(440,230),0,'Both people are protected');
  const background=await page.evaluate(()=>window.requests.filter(x=>x.method==='POST').at(-1).body);
  assert.equal(background.selectBackground,true);assert.equal(background.point,undefined);assert.equal(background.targetPrompt,'person');
  await page.evaluate(()=>window.editor.setSelectionTarget('protect-object'));await photoClick(580,360);await done();
  assert.equal(await pixel(580,360),0,'Keep object subtracts the prop from the editable background');assert.ok(await pixel(5,5)>0);
  assert.equal(await pixel(150,230),0);assert.equal(await pixel(440,230),0);
  await page.evaluate(()=>{window.editor.clearSelection();window.editor.setSelectionTarget('clothing');window.wrongOnly=true;});
  await photoClick(150,230);await done();
  assert.equal(await page.evaluate(()=>window.editor.hasSelection()),false);
  assert.equal(await page.locator('.pv-selection-feedback.is-error').isVisible(),true,'A missed mask is explained on the image');
  assert.match(await page.locator('#precision-status-text').textContent(),/did not match/);
  assert.equal(await page.evaluate(()=>window.requests.filter(x=>x.method==='POST').length),4,'Exactly four explicit selection requests, no automatic retries');
  assert.equal(await page.evaluate(()=>window.requests.some(x=>/quote|submit/.test(x.path))),false);
  assert.deepEqual(errors,[]);console.log('SELECTION_REGION_UI_PASS',width);await page.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
