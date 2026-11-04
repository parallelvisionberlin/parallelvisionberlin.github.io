// Real wheel/keyboard regression with the production Studio DOM and modules.
// Synthetic owner/media only; every external request is intercepted.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf('try{clerk=await loadLabAccount();');
const tail=source.indexOf('\n// Soul composer:',boot);
assert.ok(boot>0&&tail>boot);
const injected=source.slice(0,boot)+source.slice(tail)+`
clerk={isSignedIn:true,user:{id:'video-scroll-owner'},session:{id:'mock',getToken:async()=> 'mock-token'}};
owner=true;ownerAccount=true;userId='video-scroll-owner';
config={enabled:true,falEnabled:true,videoEngines:['seedance','seedance15','wan']};
applyConfig(config);$('app').hidden=false;$('gate').hidden=true;
setTool('video');$('video-engine').value='seedance15';$('video-engine').dispatchEvent(new Event('change'));
setMode('start');await loadHistory();update();syncVideoStudioMode();window.__pvLabFinishBoot?.();
window.__videoScrollReady=true;
`;
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const path=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!path.startsWith(root+sep)||!existsSync(path)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[extname(path)]||'application/octet-stream');
 res.end(pathname==='/lab/lab.js'?injected:readFileSync(path));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true});
mkdirSync('test-results',{recursive:true});
const geometry=page=>page.evaluate(()=>{
 const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
 const panel=document.querySelector('.workspace.video-layout>.controls'),body=panel.querySelector('.controls-body');
 return {panel:rect('.workspace.video-layout>.controls'),body:rect('.controls-body'),button:rect('#generate'),
  footer:rect('.controls>.generate-zone'),output:rect('#pv-video-output-toggle'),format:rect('#resolution-control'),
  scroll:body.scrollTop,max:body.scrollHeight-body.clientHeight,panelScroll:panel.scrollTop,
  feedScroll:document.getElementById('video-feed-center').scrollTop,pageScroll:scrollY,width:document.documentElement.scrollWidth,viewport:innerWidth,viewportHeight:innerHeight};
});
const checkDock=(m,label)=>{
 assert.ok(m.button.top>=m.panel.top&&m.button.bottom<=m.panel.bottom+1,label+': Generate remains wholly inside the panel '+JSON.stringify(m));
 assert.ok(m.body.bottom<=m.footer.top+1,label+': settings never lie beneath the footer');
 assert.equal(m.panelScroll,0,label+': only settings scroll');
 assert.equal(m.feedScroll,0,label+': wheel over settings never scrolls History');
 assert.equal(m.pageScroll,0,label+': outer page stays still');
 assert.ok(m.width<=m.viewport,label+': no horizontal overflow');
 assert.ok(m.viewportHeight-m.panel.bottom>=10&&m.viewportHeight-m.panel.bottom<=14,
   label+': composer fills the window with the reserved bottom inset '+JSON.stringify(m));
};
try{
 for(const [width,height] of [[1920,830],[1440,900],[1366,768],[1440,600],[821,700],[390,844]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),jobs=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(!url.hostname.endsWith('parallelvision.workers.dev'))return route.abort();
   if(req.method()==='POST'&&url.pathname==='/api/jobs')jobs.push(req.url());
   const data=url.pathname==='/api/jobs'?{jobs:[],activeJobs:[],next:null}:url.pathname==='/api/packs'?{packs:[]}:url.pathname==='/api/uploads'?{id:'10000000-0000-4000-8000-000000000001'}:{};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=video');
  await page.waitForFunction(()=>window.__videoScrollReady&&document.querySelector('#app').classList.contains('pv-video-state-ready'));
  await page.locator('#lab-boot').waitFor({state:'hidden'});
  if(width>820){
   for(const mode of ['text','reference','start']){
    await page.locator('#mode-'+mode).click();
    checkDock(await geometry(page),width+' '+mode+' full-height composer');
   }
  }
  // Real selected image plus long editable prompt, matching the reported case.
  const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=300;c.height=400;c.getContext('2d').fillRect(0,0,300,400);return c.toDataURL().split(',')[1];}),'base64');
  await page.locator('#image').setInputFiles({name:'synthetic-start.png',mimeType:'image/png',buffer:png});
  await page.locator('#prompt').fill('A static cinematic shot. '.repeat(45));

  // Video save is intentionally absent visually, but the shared handler stays.
  assert.equal(await page.locator('#save').evaluate(el=>getComputedStyle(el).display),
    'none','Video no longer exposes the redundant Save draft action');
  // The audio glyph must track the real checkbox, including reverse toggles.
  const audioPill=page.locator('#pv-video-audio-pill');
  assert.ok(await audioPill.isVisible(),'Seedance audio toggle stays accessible');
  for(let pass=0;pass<2;pass++){
    await audioPill.click();
    await page.waitForFunction(()=>document.getElementById('pv-video-audio-pill').getAttribute('aria-pressed')===
      String(document.getElementById('audio').checked));
    const icons=await audioPill.evaluate(pill=>({
      on:getComputedStyle(pill.querySelector('.pv-audio-on')).display,
      off:getComputedStyle(pill.querySelector('.pv-audio-muted')).display,
      enabled:document.getElementById('audio').checked
    }));
    assert.equal(icons.on==='none',!icons.enabled,'Speaker wave glyph follows audio state');
    assert.equal(icons.off==='none',icons.enabled,'Crossed speaker glyph follows audio state');
  }
  // Use a DOM-only History fixture to verify styling without touching accounts.
  const marker=await page.evaluate(()=>{
    const history=document.getElementById('history'),card=document.createElement('article');
    card.className='card';card.dataset.kind='video';
    card.style.cssText='position:relative;width:240px;height:140px';
    card.innerHTML='<span class="asset-video-badge">Video</span><span class="history-video-play"><svg viewBox="0 0 24 24"><path d="M5 3 19 12 5 21z"/></svg></span>';
    history.append(card);
    const play=card.querySelector('.history-video-play'),badge=card.querySelector('.asset-video-badge');
    const result={badge:getComputedStyle(badge).display,radius:getComputedStyle(play).borderRadius,
      placement:getComputedStyle(play).transform};
    card.remove();return result;
  });
  assert.equal(marker.badge,'none','Duplicate Video badge is hidden in Video History');
  assert.ok(marker.radius.startsWith('50%')||marker.radius==='50%',
    'Play marker is a restrained circular control: '+JSON.stringify(marker));

  if(width>820){
   let initial=await geometry(page);checkDock(initial,width+' initial');
   // Exaggerated textarea resize exercises real overflow without fake spacer elements.
   await page.locator('#prompt').evaluate(el=>{el.style.setProperty('height','420px','important');});
   await page.locator('#pv-video-output-toggle').scrollIntoViewIfNeeded();
   const output=await page.locator('#pv-video-output-toggle').boundingBox();
   await page.mouse.move(output.x+output.width/2,output.y+output.height/2);
   for(const delta of [-10000,10000,-180,180]){
    await page.mouse.wheel(0,delta);await page.waitForTimeout(120);
    const m=await geometry(page);checkDock(m,width+' wheel '+delta);
    assert.ok(Math.abs(m.button.top-initial.button.top)<1,width+': scrolling never moves Generate');
   }
   await page.locator('#resolution').focus();await page.keyboard.press('Tab');
   checkDock(await geometry(page),width+' keyboard');
   await page.locator('#pv-video-output-toggle').scrollIntoViewIfNeeded();
   await page.locator('#pv-video-output-toggle').click();checkDock(await geometry(page),width+' collapsed');
   await page.locator('#pv-video-output-toggle').click();
   await page.locator('#resolution-control').scrollIntoViewIfNeeded();
   const bottom=await geometry(page);checkDock(bottom,width+' expanded bottom');
   assert.ok(bottom.format.top>=bottom.body.top-1&&bottom.format.bottom<=bottom.body.bottom+1,width+': final output setting is fully reachable');
   await page.screenshot({path:'test-results/video-generate-scroll-'+width+'.png'});
  }else{
   await page.locator('#generate').scrollIntoViewIfNeeded();
   assert.ok(await page.locator('#generate').isVisible(),'Phone retains the natural page flow');
   assert.ok((await geometry(page)).width<=width,'Phone has no horizontal overflow');
   await page.screenshot({path:'test-results/video-generate-scroll-phone.png'});
  }
  assert.equal(jobs.length,0,'Scrolling, resizing and Output settings never submit generation');
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS Video scroll dock '+width+'x'+height);
 }
}finally{await browser.close();server.close();}

