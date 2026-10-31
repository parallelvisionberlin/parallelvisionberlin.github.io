// Visual and behavioral regression: Video must share Image Upscaler's layout
// without leaving the original Image stage visible below it. No paid calls.
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
  // Isolate layout from auth and provider traffic. The actual Video module
  // is imported below, while the normal Lab bootstrap is not executed.
  if(pathname==='/lab/lab.js'||pathname==='/lab/upscale-studio-v5.js'){res.end('// isolated mock');return;}
  res.end(readFileSync(path));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
mkdirSync('test-results',{recursive:true});
try{
 for(const [width,height,label] of [[390,844,'mobile'],[1440,900,'desktop']]){
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
      api:async()=>{throw Error('Unexpected paid API call during layout test');},
      access:()=>({signedIn:true,falEnabled:true,generationReady:true}),
      onJob:()=>{throw Error('Unexpected job');},
      onModeChange:()=>{}
    });
  });
  assert.equal(await page.locator('.workspace').isVisible(),true,label+': existing Image workspace remains visible initially');
  assert.equal(await page.locator('#pv-video-upscale-panel').isVisible(),false,label+': Video panel is initially hidden');
  await page.locator('[data-video-upscale-tab="video"]').click();
  assert.equal(await page.locator('#pv-video-upscale-panel').isVisible(),true,label+': Video panel opens');
  assert.equal(await page.locator('.workspace').isVisible(),false,label+': Image workspace is completely hidden');
  assert.equal(await page.locator('#upscale-canvas').isVisible(),false,label+': no duplicate Image source stage below Video');
  assert.equal(await page.locator('.archive').isVisible(),true,label+': private History stays accessible');
  assert.equal(await page.locator('[data-video-upscale-model]').count(),3,label+': all three model cards present');
  const style=await page.evaluate(()=>{
    const $=sel=>document.querySelector(sel);
    const box=sel=>{const r=$(sel).getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,width:r.width,height:r.height};};
    return {
      preview:box('.pv-video-upscale-preview'),
      sidebar:box('.pv-video-upscale-sidebar'),
      panel:box('#pv-video-upscale-panel'),
      photo:getComputedStyle($('#pv-video-upscale-blank'),'::before').backgroundImage,
      art:getComputedStyle($('.pv-video-upscale-model .pv-upscale-model-art')).backgroundImage,
      card:getComputedStyle($('.pv-video-upscale-model')).display,
      upload:$('#pv-video-upscale-choose').textContent.trim(),
      selected:$('.pv-video-upscale-model[aria-checked="true"]').dataset.videoUpscaleModel
    };
  });
  assert.match(style.photo,/reptare-detail\.webp/,label+': Video reuses the approved Image photographic source stage');
  assert.match(style.art,/upscaler-model-bytedance\.webp/,label+': Video uses the same editorial model-card artwork');
  assert.equal(style.card,'grid',label+': same compact grid card layout as Image');
  assert.equal(style.upload,'Upload video',label+': same image-style upload action, adapted to MP4');
  assert.equal(style.selected,'bytedance',label+': ByteDance remains the default');
  if(width<781){
    assert.ok(style.preview.top<style.sidebar.top,label+': mobile preview precedes model controls');
    assert.ok(style.preview.width>=style.sidebar.width-3,label+': mobile panels share one column');
  }else{
    assert.ok(style.preview.left>=style.sidebar.right-2,label+': desktop preview sits to the right of inspector');
    assert.ok(style.preview.width>style.sidebar.width,label+': desktop preserves wide editorial stage');
  }
  await page.screenshot({path:'test-results/upscaler-video-'+label+'.png',fullPage:true});
  await page.locator('[data-video-upscale-tab="image"]').click();
  assert.equal(await page.locator('#pv-video-upscale-panel').isVisible(),false,label+': Video panel hides on Image');
  assert.equal(await page.locator('.workspace').isVisible(),true,label+': Image workspace returns intact');
  assert.equal(await page.locator('#upscale-canvas').isVisible(),true,label+': original Image upload stage returns');
  assert.deepEqual(errors,[],label+': no JavaScript page errors');
  console.log('PASS '+label+' Upscaler parity and no duplicated workspace');
  await context.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
