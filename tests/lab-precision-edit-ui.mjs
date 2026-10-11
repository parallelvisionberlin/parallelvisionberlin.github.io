// Browser-only mock regression for Precision Edit. No fal.ai requests, credentials or paid jobs.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const studio=readFileSync('lab/studio.html','utf8');
const start=studio.indexOf('<section id="precision-workspace"');
const end=studio.indexOf('<section id="image-studio"',start);
assert.ok(start>0&&end>start,'Real Precision Edit markup must be present in the studio');
const html='<html><head><meta name="viewport" content="width=device-width,initial-scale=1">'
  +'<link rel="stylesheet" href="/lab/precision-edit.css"></head>'
  +'<body style="background:#101114;margin:0;color:white"><div id="app" class="retouch-studio-active" style="display:block;padding:12px;max-width:1400px;margin:auto">'
  +studio.slice(start,end)+'</div></body></html>';
const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname;
  if(p==='/test'){res.writeHead(200,{'Content-Type':'text/html'}).end(html);return;}
  const target=resolve('.',p.slice(1));
  if(!target.startsWith(resolve('.')+'/')||!existsSync(target)){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.css':'text/css'}[extname(target)]||'text/plain')}).end(readFileSync(target));
});
await new Promise(resolve=>server.listen(4189,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
try{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4189/test');
  await page.evaluate(async()=>{
    const {createPrecisionEditor}=await import('/lab/precision-edit.js');
    const blobs=new Map();let seq=0;window.pvRequests=[];window.pvJobs=[];window.pvExits=0;
    const make=async(kind)=>{
      const c=document.createElement('canvas');c.width=640;c.height=480;
      const x=c.getContext('2d');x.fillStyle=kind==='original'?'#456a82':kind==='raw'?'#f04422':'#000';
      x.fillRect(0,0,c.width,c.height);
      if(kind==='original'){x.fillStyle='#1e2227';x.fillRect(230,100,190,280);}
      if(kind==='mask'){x.fillStyle='#fff';x.fillRect(230,100,190,280);}
      return new Promise(r=>c.toBlob(r,'image/png'));
    };
    const original=await make('original'),raw=await make('raw'),magic=await make('mask');
    window.pvOriginal=original;window.pvComposite=null;
    const store=async file=>{const id='uploaded-'+(++seq);blobs.set(id,file);return id;};
    const api=async(path,{method='GET',body}={})=>{
      window.pvRequests.push({path,method,body});
      if(path==='/api/precision/segment'&&method==='POST')
        return {requestId:'synthetic-request',ticket:'synthetic-ticket',expires:Date.now()+3600000};
      if(path.startsWith('/api/precision/segment?'))return {status:'completed',maskSourceId:'magic-mask'};
      if(path==='/api/precision/quote')return {quoteId:'e38e4a07-4564-491a-9e1b-d2fd3a167411',ticket:'safe-quote',expiresAt:Date.now()+120000,estimatedUsd:.15,priceIsEstimate:true};
      if(path==='/api/precision/submit')
        return {job:{id:'job-one',status:'queued',outputId:null,settings:{precisionEdit:true,precisionOriginalId:window.pvBaseId,maskSourceId:body.maskSourceId}}};
      if(path==='/api/jobs/job-one')
        return {job:{id:'job-one',status:'completed',outputId:'raw-result',settings:{precisionEdit:true,precisionOriginalId:window.pvBaseId,maskSourceId:window.pvMaskId}}};
      if(path==='/api/precision/commit'){
        window.pvComposite=blobs.get(body.compositeSourceId);
        return {job:{id:'job-one',status:'completed',outputId:body.compositeSourceId,settings:{precisionEdit:true,precisionFinalized:true,precisionOriginalId:window.pvBaseId,maskSourceId:window.pvMaskId}}};
      }
      throw new Error('Unexpected mock endpoint: '+path);
    };
    const assetBlob=async id=>{
      if(id==='magic-mask')return magic;
      if(id==='raw-result')return raw;
      if(id===window.pvBaseId)return original;
      if(id===window.pvMaskId)return blobs.get(id);
      if(blobs.has(id))return blobs.get(id);
      throw new Error('Unknown asset '+id);
    };
    const editor=createPrecisionEditor({host:document.querySelector('#app'),api,assetBlob,
      uploadAsset:async file=>{const id=await store(file);if(file.name==='editorial.png')window.pvBaseId=id;if(file.name==='precision-selection.png')window.pvMaskId=id;return id;},
      notify:()=>{},owner:()=>true,falReady:()=>true,onExit:()=>{window.pvExits++;editor.close();},onJob:job=>window.pvJobs.push(job)});
    const file=new File([original],'editorial.png',{type:'image/png'});
    await editor.open({file});
    window.pvEditor=editor;
  });
  assert.equal(await page.locator('#precision-workspace').isVisible(),true);
  assert.equal(await page.locator('#precision-source-holder').isVisible(),true);
  assert.equal(await page.locator('#precision-output-empty').isVisible(),true);
  assert.equal(await page.locator('#precision-generate').isDisabled(),true);
  assert.equal(await page.locator('#precision-tool-magic').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>window.pvRequests.length),0,'Opening must not charge or submit any inference');
  assert.equal(await page.locator('#precision-zoom-controls').isVisible(),true,'Loaded photo exposes zoom and pan tools');
  const fit=await page.locator('#precision-zoom-value').textContent();assert.equal(fit,'Fit');
  await page.locator('#precision-zoom-in').click();
  assert.notEqual(await page.locator('#precision-zoom-value').textContent(),'Fit','Zoom must change the working view');
  await page.locator('#precision-tool-pan').click();
  const panBox=await page.locator('#precision-selection-canvas').boundingBox();
  await page.mouse.move(panBox.x+panBox.width/2,panBox.y+panBox.height/2);
  await page.mouse.down();await page.mouse.move(panBox.x+panBox.width/2-45,panBox.y+panBox.height/2,{steps:4});await page.mouse.up();
  await page.locator('#precision-zoom-fit').click();
  assert.equal(await page.locator('#precision-zoom-value').textContent(),'Fit');
  await page.locator('#precision-tool-magic').click();
  const source=page.locator('#precision-selection-canvas');
  const rect=await source.boundingBox();assert.ok(rect?.width>200&&rect?.height>100);
  await page.mouse.click(rect.x+rect.width*330/640,rect.y+rect.height*200/480);
  await page.locator('#precision-select-consent').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>window.pvRequests.filter(r=>r.path==='/api/precision/segment'&&r.method==='POST').length),0,
    'Magic Select must never call the metered provider before explicit approval');
  await page.locator('#precision-select-approve').click();
  await page.waitForFunction(()=>document.querySelector('#precision-status-text').textContent.includes('Object selected'));
  assert.equal(await page.evaluate(()=>window.pvRequests.filter(r=>r.path==='/api/precision/segment'&&r.method==='POST').length),1);
  assert.equal(await page.locator('#precision-generate').isDisabled(),true,'Prompt is still required');
  await page.locator('#precision-tool-brush').click();
  assert.equal(await page.locator('#precision-tool-brush').getAttribute('aria-pressed'),'true');
  await page.locator('#precision-expand').click();
  assert.equal(await page.locator('#precision-undo').isEnabled(),true);
  await page.locator('#precision-undo').click();
  await page.locator('#precision-prompt').fill('Change the selected dark garment to a vivid red material.');
  await page.locator('#precision-generate').click();
  await page.locator('#precision-price-review').waitFor({state:'visible'});
  assert.match(await page.locator('#precision-review-body').textContent(),/estimated \$0\.150 USD/);
  assert.equal(await page.evaluate(()=>window.pvRequests.filter(r=>r.path==='/api/precision/submit').length),0,
    'Pricing does not authorize inference');
  await page.locator('#precision-review-confirm').click();
  await page.waitForFunction(()=>window.pvJobs.length>0,{timeout:10000});
  assert.equal(await page.locator('#precision-tool-brush').isEnabled(),true,
    'Paid submission must release the editing controls while the job is in Queue');
  assert.match(await page.locator('#precision-status-text').textContent(),/Queued/i);
  await page.waitForFunction(()=>!!window.pvComposite,{timeout:18000});
  await page.locator('#precision-result-canvas').waitFor({state:'visible',timeout:10000});
  assert.equal(await page.locator('#precision-result-canvas').isVisible(),true);
  assert.equal(await page.locator('#precision-download').isEnabled(),true);
  const colors=await page.evaluate(async()=>{
    const toPixels=async blob=>{const bit=await createImageBitmap(blob),c=document.createElement('canvas');c.width=bit.width;c.height=bit.height;const x=c.getContext('2d');x.drawImage(bit,0,0);return x;};
    const orig=await toPixels(window.pvOriginal),composed=await toPixels(window.pvComposite);
    const at=(ctx,x,y)=>Array.from(ctx.getImageData(x,y,1,1).data);
    return {beforeOutside:at(orig,40,40),afterOutside:at(composed,40,40),inside:at(composed,300,200)};
  });
  assert.deepEqual(colors.afterOutside,colors.beforeOutside,'Outside the selection must remain pixel-identical');
  assert.ok(colors.inside[0]>180&&colors.inside[2]<80,'Selected region must contain the generated edit');
  await page.locator('#precision-compare').evaluate(el=>{el.value='20';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('#precision-compare').inputValue(),'20');
  mkdirSync('test-results',{recursive:true});
  await page.screenshot({path:'test-results/pv-precision-desktop.png',fullPage:false});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'test-results/pv-precision-mobile.png',fullPage:true});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3);
  assert.equal(overflow,false,'Precision Edit may not overflow horizontally on mobile');
  const priorRequests=await page.evaluate(()=>window.pvRequests.length);
  await page.locator('#precision-return').click();
  assert.equal(await page.locator('#precision-workspace').isVisible(),false);
  assert.equal(await page.evaluate(()=>window.pvExits),1,'Back delegates to the parent studio');
  await page.evaluate(()=>window.pvEditor.open());
  assert.equal(await page.locator('#precision-workspace').isVisible(),true,'Returning opens the Retouch workspace');
  assert.match(await page.locator('#precision-source-meta').textContent(),/editorial\.png/);
  assert.match(await page.locator('#precision-prompt').inputValue(),/vivid red material/);
  assert.equal(await page.evaluate(()=>window.pvRequests.length),priorRequests,'Returning does not resubmit paid work');
  assert.deepEqual(errors,[]);
  console.log('PASS Retouch V2: zoom/pan, paid-selection consent, mask edit, quote and nonblocking queue, exact PNG pixels, mobile controls');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
