// PV LAB one-workspace regression. Browser is isolated from Clerk and providers.
// Both modes use one .workspace and preserve the original image editor state.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const path=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!path.startsWith(root+sep)||!existsSync(path)){res.writeHead(404).end();return;}
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
 res.setHeader('Content-Type',mime[extname(path)]||'text/plain');
 if(pathname==='/lab/lab.js'||pathname==='/lab/upscale-studio-v5.js'){res.end('// isolated mock');return;}
 res.end(readFileSync(path));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true});
mkdirSync('test-results',{recursive:true});
try{
 for(const [width,height,label] of [[1440,900,'desktop'],[390,844,'mobile']]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<781,isMobile:width<781});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**/*',route=>route.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=upscale',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{
    document.body.classList.add('lab-ready');
    const app=document.getElementById('app');app.hidden=false;
    document.getElementById('gate').hidden=true;
    app.classList.add('upscale-studio-active');
    document.getElementById('upscale-model-menu').hidden=false;
    const {createVideoUpscaler}=await import('/lab/video-upscale.js');
    window.__videoLayoutTest=createVideoUpscaler({
      api:async()=>{throw Error('Unexpected provider request during layout test');},
      access:()=>({signedIn:true,falEnabled:true,generationReady:true}),
      onJob:()=>{throw Error('Unexpected paid job');},
      onModeChange:()=>{}
    });
    window.__videoLayoutTest.sync();
  });
  const initial=await page.evaluate(()=>{
    const app=document.getElementById('app'),ws=app.querySelector(':scope > .workspace');
    const controls=ws.querySelector(':scope > .controls'),stage=ws.querySelector(':scope > .stage');
    const b=el=>{const r=el.getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    return {workspace:b(ws),stage:b(stage),controls:b(controls),bar:b(document.getElementById('pv-video-upscale-mode')),
      single:app.querySelectorAll(':scope > .workspace').length,
      barInside:ws.contains(document.getElementById('pv-video-upscale-mode')),
      sidebarInside:controls.contains(document.querySelector('.pv-video-upscale-sidebar')),
      videoInside:stage.contains(document.querySelector('.pv-video-upscale-preview'))};
  });
  assert.equal(initial.single,1,label+': exactly one Upscaler workspace');
  assert.equal(initial.barInside,true,label+': media switch is inside the workspace');
  assert.equal(initial.sidebarInside,true,label+': video model cards reuse original inspector');
  assert.equal(initial.videoInside,true,label+': video preview reuses original stage');
  const diag=await page.evaluate(()=>{
    const x=sel=>{const el=document.querySelector(sel);const r=el?.getBoundingClientRect();return {display:el?getComputedStyle(el).display:null,visibility:el?getComputedStyle(el).visibility:null,hidden:el?.hidden,rect:r?{top:r.top,bottom:r.bottom,height:r.height,width:r.width}:null};};
    return {classes:document.getElementById('app').className,workspace:x('#app>.workspace'),stage:x('#app>.workspace>.stage'),canvas:x('#upscale-canvas'),controls:x('#app>.workspace>.controls'),body:x('.controls-body'),bar:x('#pv-video-upscale-mode'),preview:x('.pv-video-upscale-preview')};
  });
  console.log('LAYOUT_DIAG',label,JSON.stringify(diag));
  assert.equal(await page.locator('.controls-body').isVisible(),true,label+': Image controls initially visible');
  assert.equal(await page.locator('#upscale-canvas').isVisible(),true,label+': Image preview initially visible');
  assert.equal(await page.locator('.pv-video-upscale-preview').isVisible(),false,label+': Video stage hidden initially');
  if(width>780){
    assert.ok(initial.workspace.bottom<=height+2,label+': original editor fits browser viewport');
    assert.ok(initial.controls.bottom<=height+2,label+': image inspector fits viewport');
    assert.ok(initial.stage.bottom<=height+2,label+': image stage fits viewport');
    assert.ok(initial.bar.left<initial.controls.right,label+': switch stays in left inspector');
  }else assert.ok(initial.bar.bottom<=initial.stage.top+3,label+': phone switch appears before preview');
  // Upload simulation: keep the real image editor source and verify no
  // vertical expansion or aspect-ratio cropping of the original.
  await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=1254;c.height=1254;
    const ctx=c.getContext('2d');ctx.fillStyle='#282a2f';ctx.fillRect(0,0,1254,1254);
    const img=document.getElementById('preview');img.src=c.toDataURL('image/png');
    img.hidden=false;document.getElementById('empty').hidden=true;
    document.getElementById('app').classList.add('pv-upscale-source-ready');
  });
  await page.locator('#preview').waitFor({state:'visible'});
  if(width>780){
    const loaded=await page.evaluate(()=>{
      const rect=selector=>document.querySelector(selector).getBoundingClientRect();
      return {workspace:rect('#app>.workspace'),stage:rect('#app>.workspace>.stage'),
        canvas:rect('#upscale-canvas'),image:rect('#preview'),imageFit:getComputedStyle(document.getElementById('preview')).objectFit};
    });
    assert.ok(loaded.workspace.bottom<=height+2,label+': uploaded image does not extend workspace below viewport');
    assert.ok(loaded.stage.bottom<=height+2,label+': uploaded image does not extend stage below viewport');
    assert.ok(loaded.canvas.bottom<=height+2,label+': loaded canvas remains contained');
    assert.equal(loaded.imageFit,'contain',label+': original image stays uncropped');
  }
  await page.screenshot({path:'test-results/upscaler-shared-image-'+label+'.png',fullPage:false});
  await page.locator('[data-video-upscale-tab="video"]').click();
  assert.equal(await page.locator('#app>.workspace').isVisible(),true,label+': Video uses SAME visible workspace');
  assert.equal(await page.locator('.controls-body').isVisible(),false,label+': Image settings hidden in Video');
  assert.equal(await page.locator('#upscale-canvas').isVisible(),false,label+': original Image stage hidden in Video');
  assert.equal(await page.locator('.pv-video-upscale-sidebar').isVisible(),true,label+': Video model cards visible');
  assert.equal(await page.locator('.pv-video-upscale-preview').isVisible(),true,label+': Video preview visible');
  assert.equal(await page.locator('#pv-video-upscale-panel').isVisible(),false,label+': old separate Video deck stays unmounted');
  assert.equal(await page.locator('.archive').isVisible(),true,label+': private History remains available');
  assert.equal(await page.locator('[data-video-upscale-model]').count(),3,label+': all three Video models remain');
  const video=await page.evaluate(()=>{
    const b=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    return {workspace:b('#app>.workspace'),preview:b('.pv-video-upscale-preview'),sidebar:b('.pv-video-upscale-sidebar'),
      photo:getComputedStyle(document.querySelector('#pv-video-upscale-blank'),'::before').backgroundImage,
      art:getComputedStyle(document.querySelector('.pv-video-upscale-model .pv-upscale-model-art')).backgroundImage,
      modelLayout:getComputedStyle(document.querySelector('.pv-video-upscale-model')).display,
      upload:document.querySelector('#pv-video-upscale-choose').textContent.trim(),
      action:document.querySelector('#pv-video-upscale-action').textContent.trim()};
  });
  assert.match(video.photo,/upscaler-chrome-wool-option-1\.jpg/,label+': Video uses original Image photo');
  assert.match(video.art,/upscaler-model-bytedance\.webp/,label+': same model-card art');
  assert.equal(video.modelLayout,'grid',label+': same model-card layout');
  assert.equal(video.upload,'Upload video',label+': only stage has video upload CTA');
  assert.equal(video.action,'Upscale',label+': disabled generation CTA matches Image');
  const chooser=page.waitForEvent('filechooser');
  await page.locator('#pv-video-upscale-choose').click();
  assert.equal((await chooser).isMultiple(),false,label+': Video stage opens native single-file MP4 picker');

  if(width>780){
    assert.ok(video.workspace.bottom<=height+2,label+': Video stage fits browser viewport');
    assert.ok(video.preview.left>=video.sidebar.right-2,label+': same desktop side-by-side columns');
  }else assert.ok(video.preview.top<video.sidebar.top,label+': phone preview before settings');
  await page.screenshot({path:'test-results/upscaler-shared-video-'+label+'.png',fullPage:false});
  await page.locator('[data-video-upscale-tab="image"]').click();
  assert.equal(await page.locator('#preview').isVisible(),true,label+': original uploaded image survives mode switch');
  assert.equal(await page.locator('.pv-video-upscale-preview').isVisible(),false,label+': Video preview hidden again');
  assert.equal(await page.locator('.controls-body').isVisible(),true,label+': Image settings return without remount');
  assert.deepEqual(errors,[],label+': no JavaScript page errors');
  console.log('PASS '+label+' single Upscaler workspace, switch, source retention and viewport');
  await context.close();
 }
}finally{await browser.close();await new Promise(done=>server.close(done));}
