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
   // lab.js is intentionally mocked in this test. Mirror setTool('upscale')
   // hiding of unrelated Video Studio inputs, otherwise their offscreen
   // content creates a fake scrollbar in BOTH Image and Video modes.
   for(const id of ['video-model-control','video-modes','prompt','save','generation-help','upscale-price','upscale-notice-slot']){
     document.getElementById(id)?.style.setProperty('display','none','important');
   }
   document.getElementById('upscale-model-display').hidden=false;
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
  const original=await page.evaluate(()=>{
   const rect=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   return {canvas:rect('#upscale-canvas'),action:rect('#generate'),picker:rect('#upscale-model-menu'),
    workspaceCount:document.querySelectorAll('#app>.workspace').length,
    title:document.querySelector('#empty .pv-upscale-empty-center h2').textContent};
  });
  assert.equal(original.workspaceCount,1,label+': only one Upscaler editor');
  assert.equal(original.title,'Use a source frame.',label+': original Image title');
  assert.equal(await page.locator('#upscale-canvas').isVisible(),true,label+': Image canvas visible');
  assert.equal(await page.locator('#upscale-model-menu [data-upscale-engine]').first().isVisible(),true,label+': original Image model cards');
  assert.equal(await page.locator('#upscale-model-menu [data-video-upscale-model]').first().isVisible(),false,label+': Video cards hidden in Image');
  // Empty-state parity: the original model cards do not move when the media
  // changes, and Video must not expose Image-only settings or a credit hint.
  const emptyImageScroll=await page.evaluate(()=>{
    const body=document.querySelector('#app>.workspace>.controls>.controls-body');
    return {scrollHeight:body.scrollHeight,clientHeight:body.clientHeight};
  });
  const imageCard=await page.locator('#upscale-model-menu [data-upscale-engine]').first().boundingBox();
  await page.locator('[data-video-upscale-tab="video"]').click();
  const videoCard=await page.locator('#upscale-model-menu [data-video-upscale-model]').first().boundingBox();
  assert.ok(imageCard&&videoCard,label+': both modes have a real model card');
  assert.ok(Math.abs(imageCard.y-videoCard.y)<=2,label+': model cards retain their vertical position');
  assert.ok(Math.abs(imageCard.height-videoCard.height)<=2,label+': model cards retain their height');
  assert.equal(await page.locator('.controls-body > .parameter-grid').isVisible(),false,label+': no Image enlargement row in Video');
  assert.equal(await page.locator('.controls-body > #format-control').isVisible(),false,label+': no Image format row in Video');
  assert.equal(await page.locator('.pv-video-upscale-quote').isVisible(),false,label+': no credit prompt before a source video');
  assert.equal(await page.locator('.pv-video-upscale-inline-resolution').isVisible(),true,label+': resolution replaces Image controls');
  const emptyVideo=await page.evaluate(()=>{
    const body=document.querySelector('#app>.workspace>.controls>.controls-body');
    return {scrollHeight:body.scrollHeight,clientHeight:body.clientHeight,
      overflow:getComputedStyle(body).overflowY};
  });
  const childDiag=await page.evaluate(()=>{
    const body=document.querySelector('#app>.workspace>.controls>.controls-body');
    return [...body.children].map(el=>{
      const st=getComputedStyle(el),r=el.getBoundingClientRect();
      return {tag:el.tagName,id:el.id,className:typeof el.className==='string'?el.className.slice(0,50):'',
        display:st.display,position:st.position,hidden:el.hidden,top:Math.round(r.top),bottom:Math.round(r.bottom),height:Math.round(r.height)};
    }).filter(x=>x.display!=='none'&&x.height>0);
  });
  console.log('EMPTY_IMAGE_SCROLL',label,JSON.stringify(emptyImageScroll));
  console.log('EMPTY_VIDEO_CONTROLS',label,JSON.stringify(emptyVideo));
  console.log('VIDEO_VISIBLE_CHILDREN',label,JSON.stringify(childDiag));
  if(width>780)assert.ok(emptyVideo.scrollHeight<=Math.max(emptyVideo.clientHeight,emptyImageScroll.scrollHeight)+3,label+': Video adds no unnecessary sidebar overflow');
  await page.locator('[data-video-upscale-tab="image"]').click();
  // An uploaded Image must remain untouched when switching media modes.
  await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=400;c.height=400;
   c.getContext('2d').fillRect(0,0,400,400);
   const img=document.getElementById('preview');img.src=c.toDataURL('image/png');img.hidden=false;
   document.getElementById('empty').hidden=true;
   document.getElementById('app').classList.add('pv-upscale-source-ready');
  });
  await page.locator('#preview').waitFor({state:'visible'});
  await page.locator('[data-video-upscale-tab="video"]').click();
  assert.equal(await page.locator('#upscale-canvas').isVisible(),true,label+': SAME source canvas remains');
  assert.equal(await page.locator('#app>.workspace').count(),1,label+': no second Video workspace');
  assert.equal(await page.locator('.pv-video-upscale-preview').isVisible(),false,label+': duplicate Video deck stays hidden');
  assert.equal(await page.locator('.pv-video-upscale-sidebar').isVisible(),false,label+': duplicate Video sidebar stays hidden');
  assert.equal(await page.locator('#upscale-model-menu [data-upscale-engine]').first().isVisible(),false,label+': Image model cards hidden');
  assert.equal(await page.locator('#upscale-model-menu [data-video-upscale-model]').first().isVisible(),true,label+': Video models in SAME picker');
  assert.equal(await page.locator('#upscale-model-menu [data-video-upscale-model]').count(),3,label+': three Video models');
  const resolutionDiag=await page.evaluate(()=>{
    const el=document.querySelector('.pv-video-upscale-inline-resolution');
    const st=getComputedStyle(el),rect=el.getBoundingClientRect();
    return {outer:el.outerHTML.slice(0,250),parent:el.parentElement?.className,hidden:el.hidden,
      display:st.display,visibility:st.visibility,rect:{width:rect.width,height:rect.height,top:rect.top},
      parentDisplay:getComputedStyle(el.parentElement).display,
      grandparent:el.parentElement?.parentElement?.className};
  });
  console.log('VIDEO_RESOLUTION_DIAG',label,JSON.stringify(resolutionDiag));
  assert.equal(await page.locator('.pv-video-upscale-inline-resolution').isVisible(),true,label+': Video resolution replaces Image controls');
  assert.equal(await page.locator('.controls-body > .parameter-grid').isVisible(),false,label+': Image-specific enlargement hidden');
  assert.equal(await page.locator('#empty .pv-upscale-empty-center h2').textContent(),'Insert a source video.',label+': exact Video source label');
  assert.equal(await page.locator('#pv-upscale-hero-upload span').textContent(),'Upload video',label+': SAME upload button');
  assert.equal(await page.locator('#preview').isVisible(),false,label+': saved Image preview hidden, not deleted');
  const video=await page.evaluate(()=>{
   const rect=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   return {canvas:rect('#upscale-canvas'),action:rect('#generate'),picker:rect('#upscale-model-menu'),
    photo:getComputedStyle(document.querySelector('#empty .pv-upscale-dropzone'),'::before').backgroundImage};
  });
  assert.ok(Math.abs(original.canvas.width-video.canvas.width)<=2,label+': identical source width');
  assert.ok(Math.abs(original.canvas.height-video.canvas.height)<=2,label+': identical source height');
  const stageDiag=await page.evaluate(()=>{
    const rect=sel=>{const el=document.querySelector(sel),r=el?.getBoundingClientRect();
      return {display:el?getComputedStyle(el).display:null,top:r?.top,bottom:r?.bottom,height:r?.height,scrollHeight:el?.scrollHeight};};
    return {workspace:rect('#app>.workspace'),stage:rect('#app>.workspace>.stage'),
      head:rect('#app>.workspace>.stage>.stagehead'),foot:rect('#app>.workspace>.stage>.stagefoot'),
      controls:rect('#app>.workspace>.controls'),body:rect('#app>.workspace>.controls>.controls-body'),
      canvas:rect('#upscale-canvas'),file:rect('#pv-video-upscale-file')};
  });
  console.log('ACTION_PARITY',label,JSON.stringify({image:original.action,video:video.action,stageDiag}));
  assert.ok(Math.abs(original.action.top-video.action.top)<=2,label+': same Upscale button position');
  assert.ok(Math.abs(original.picker.left-video.picker.left)<=2,label+': model cards stay in place');
  assert.match(video.photo,/upscaler-chrome-wool-option-1\.jpg/,label+': exact Image photograph remains');
  if(width>780)assert.ok(video.canvas.bottom<=height+2,label+': desktop stays within viewport');
  // Real native MP4 picker must open from the SAME image upload button.
  const chooser=page.waitForEvent('filechooser');
  await page.locator('#pv-upscale-hero-upload').click();
  const picker=await chooser;
  assert.equal(picker.isMultiple(),false,label+': single video file chooser');
  await picker.setFiles({name:'sample.mp4',mimeType:'video/mp4',buffer:Buffer.alloc(256,1)});
  assert.equal(await page.locator('#pv-video-upscale-source').isVisible(),true,label+': Video renders in original source canvas');
  assert.equal(await page.locator('#pv-upscale-hero-upload').isVisible(),false,label+': plus replaced by video preview');
  await page.screenshot({path:'test-results/upscaler-single-video-'+label+'.png',fullPage:false});
  await page.locator('[data-video-upscale-tab="image"]').click();
  assert.equal(await page.locator('#preview').isVisible(),true,label+': Image preview restored without reupload');
  assert.equal(await page.locator('#upscale-model-menu [data-upscale-engine]').first().isVisible(),true,label+': original Image models restored');
  assert.equal(await page.locator('#upscale-model-menu [data-video-upscale-model]').first().isVisible(),false,label+': Video models hidden');
  assert.equal(await page.locator('.pv-video-upscale-inline-resolution').isVisible(),false,label+': Video resolution hidden in Image');
  assert.equal(await page.locator('#empty .pv-upscale-empty-center h2').textContent(),'Use a source frame.',label+': Image title restored');
  assert.deepEqual(errors,[],label+': no page errors');
  console.log('PASS '+label+' one Upscaler DOM, stable dimensions, real MP4 upload and image preservation');
  await context.close();
 }
}finally{await browser.close();await new Promise(done=>server.close(done));}
