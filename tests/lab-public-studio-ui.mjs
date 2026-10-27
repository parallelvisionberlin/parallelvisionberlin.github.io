// Real Studio bootstrap with synthetic Clerk/Worker boundaries; no paid requests.
import assert from 'node:assert/strict';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync,statSync,mkdirSync} from 'node:fs';
import {resolve,relative,extname,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const {PNG}=(await import(pathToFileURL(resolve(dirname(process.env.PV_PLAYWRIGHT_MODULE),'../pngjs/lib/png.js')).href)).default;
const root=resolve('.');
const headerGutterOnly=process.env.PV_HEADER_GUTTER_ONLY==='1';
// Approved source before this fix, including the later locked Image and V28 Upscaler.
const approvedRef='ac33d20c50bdd88e71547e96a70781efae4b5a11';
const approvedFiles=new Map(['lab/lab.js','lab/studio.html','lab/studio-guest-image.js','lab/studio-guest-image.css','lab/precision-edit.js','lab/fashion-studio.js','lab/fashion.js'].map(path=>[path,execFileSync('git',['show',approvedRef+':'+path]) ]));
// Owner-approved Dream Blur cover replacement, PR #521. Update only the two
// Image card image URLs in the independent baseline; retain every layout byte
// and the original wallpaper. Pixel comparison still protects all other UI.
const approvedImageHtml=approvedFiles.get('lab/studio.html').toString('utf8');
const originalDreamBlurCard='src="./mood-previews/dream-blur-20261015.jpg"';
assert.equal(approvedImageHtml.split(originalDreamBlurCard).length,3,'Approved public and signed-in Dream Blur card anchors remain identifiable');
approvedFiles.set('lab/studio.html',Buffer.from(approvedImageHtml.replaceAll(
  originalDreamBlurCard,'src="./mood-previews/dream-blur-cover-20261024.webp"'
)));
// Explicit owner approval, October 27: add the direct Characters shortcut
// beside All references. Freeze only that button and its responsive slot rules
// in the independent Image baseline; retain all pixel comparison tolerances.
const approvedCharacterButton='<button id="pv-guest-characters" data-deck-control="characters" class="pv-guest-setting pv-guest-icon pv-guest-expanded-only" type="button" data-guest-signin title="Characters" aria-label="Sign in to open saved characters"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="7.5" r="3.5"/><path d="M5 20v-2.2c0-3.8 14-3.8 14 0V20Z"/></svg></button>';
const approvedCharacterStyles=`
#gate.pv-guest-image #pv-guest-characters{display:flex;align-items:center;justify-content:center;width:38px;height:38px;padding:0;border-radius:50%;border:1px solid #686b6c;background:transparent}
#gate.pv-guest-image #pv-guest-characters svg{width:17px;height:17px}
#gate.pv-guest-image .scene-image-library-wrap{display:flex;gap:5px}
@media(max-width:760px){
html:not(.pv-native-lab) #gate.pv-guest-image .scene-image-library-wrap{display:flex!important;flex:0 0 auto!important;min-width:0!important;width:auto!important;gap:4px}
#gate.pv-guest-image #pv-guest-characters{flex:0 0 35px;width:35px;min-width:35px;height:35px;min-height:35px}
}
@media(max-width:360px){#gate.pv-guest-image #pv-guest-characters{flex-basis:33px;width:33px;min-width:33px;height:33px;min-height:33px}}
`;
const approvedCharacterAnchor='<div class="scene-image-library-wrap"><button id="pv-guest-library"';
const approvedCharacterHtml=approvedFiles.get('lab/studio.html').toString();
assert.equal(approvedCharacterHtml.split(approvedCharacterAnchor).length,2,'Original library slot remains unique');
approvedFiles.set('lab/studio.html',Buffer.from(approvedCharacterHtml
  .replace(approvedCharacterAnchor,'<div class="scene-image-library-wrap">'+approvedCharacterButton+'<button id="pv-guest-library"')
  .replace('</head>','<style>'+approvedCharacterStyles+'</style></head>')));
// Owner-approved Fashion #494, including caption spacing and the Generate label.
// Keep the independent Image/Video/Upscaler/Retouch baseline unchanged.
const fashionApprovedRef='a84f9ec2ead1c57288e91fec18cd7e06bb3bf2e1';
const fashionApprovedFiles=new Map(['lab/fashion.html','lab/fashion.css','lab/fashion-studio.js','lab/fashion.js','lab/lab.js','lab/studio.html','lab/studio-guest-image.css','lab/studio-guest-image.js','lab/studio-public-preview.js'].map(path=>[path,execFileSync('git',['show',fashionApprovedRef+':'+path])]));
// Preserve the approved Fashion layout reference while updating ONLY the
// deliberate October 24 model-photo swap. Both baseline and actual load the
// same new illustrative photos; full pixel comparisons still catch all UI drift.
const fashionApprovedHtml=fashionApprovedFiles.get('lab/fashion.html').toString('utf8');
const originalFashionHero='<img src="./visuals/fashion-replace/hero.webp" alt="" width="1672" height="941" fetchpriority="high" decoding="async">';
const originalFashionPerson='<img class="slot-example person-example" src="./visuals/fashion-replace/hero.webp" alt="" width="1672" height="941" decoding="async">';
assert.ok(fashionApprovedHtml.includes(originalFashionHero)&&fashionApprovedHtml.includes(originalFashionPerson),'Approved Fashion photo anchors still exist');
const newFashionHero='<img src="./visuals/fashion-replace/hero-model-oct24.jpg" alt="" width="1672" height="941" fetchpriority="high" decoding="async">';
const newFashionPerson='<img class="slot-example person-example" src="./visuals/fashion-replace/person-before-jacket-oct25.jpg" alt="" width="760" height="806" decoding="async">';
fashionApprovedFiles.set('lab/fashion.html',Buffer.from(fashionApprovedHtml.replace(originalFashionHero,newFashionHero).replace(originalFashionPerson,newFashionPerson)));
// Fashion-only approved hero crop: update the expected photograph positioning,
// while keeping every other pixel comparison and component baseline unchanged.
const approvedFashionCss=fashionApprovedFiles.get('lab/fashion.css').toString('utf8');
const oldFashionHeroCrop='transform:scale(1.2);transform-origin:72% 12%';
const newFashionHeroCrop='transform:translateX(6%) scale(1.12);transform-origin:72% 12%';
assert.equal(approvedFashionCss.split(oldFashionHeroCrop).length,2,'Approved Fashion framing selector remains unique');
// Explicit October 26 approval: Image deck typography and one focus border.
// All other independent baseline regions and comparison thresholds stay fixed.
const approvedFashionDeckPolish="\n/* Owner-approved Image deck typography and single-border Fashion focus. */\n.engine-section .field-title{font:400 12px/1.2 'DM Sans',Arial,sans-serif;letter-spacing:0;color:#b7b8bc}\n.engine-section select,.engine-section textarea{border-radius:9px;box-shadow:none}\n.engine-section select{font:550 12px/1.5 'DM Sans',Arial,sans-serif;letter-spacing:normal}\n.engine-section #model-select{font-size:14px;font-weight:610;line-height:1.2}\n.engine-section textarea{font:420 15.5px/1.48 'DM Sans',Arial,sans-serif;letter-spacing:-.019em}\n.engine-section select:focus,.engine-section select:focus-visible,.engine-section textarea:focus,.engine-section textarea:focus-visible{outline:none;box-shadow:none;border-color:#ffffff80}\n.engine-section .action-primary{font:600 15px/1.17 'DM Sans',Arial,sans-serif;letter-spacing:-.015em;padding:10px 12px;gap:0}\n#quote>span[aria-hidden=\"true\"]:empty{display:none}\n#quote:after{content:none}\n@media(min-width:1101px){\n .engine-grid{grid-template-columns:minmax(155px,248fr) minmax(240px,402fr) minmax(180px,627fr) minmax(190px,185fr)}\n}\n@media(min-width:801px) and (max-width:1100px){\n .engine-grid{grid-template-columns:minmax(135px,1.1fr) minmax(185px,1.5fr) minmax(130px,1.3fr) minmax(155px,.9fr)}\n .engine-section #model-select{font-size:12px}\n .engine-section .action-primary{font-size:12px}\n}\n@media(max-width:800px){\n .engine-section select,.engine-section #model-select,.engine-section textarea{font-size:16px}\n}\n";
fashionApprovedFiles.set('lab/fashion.css',Buffer.from(approvedFashionCss.replace(oldFashionHeroCrop,newFashionHeroCrop)+approvedFashionDeckPolish));


// The owner approved a new Video-only design in #496. Freeze that implemented
// reference while retaining the original pixel baselines for every other tool.
const approvedVideoRef='c65079e33a4c5be35cb36ceda963120787998fcf';
const approvedVideoFiles=new Map(['lab/lab.js','lab/studio.html','lab/video-compact-studio.css','lab/video-relaxed-studio.css','lab/video-editorial-deck.js','lab/video-scene-states.js'].map(path=>[path,execFileSync('git',['show',approvedVideoRef+':'+path])]));
// Owner-approved follow-up: the same original plus also invites Reference and
// Extend uploads. Keep every other byte of the independent Video visual source,
// including the original Start plus, photograph, typography and dimensions.
const approvedVideoState=approvedVideoFiles.get('lab/video-scene-states.js').toString();
const approvedPlusRule="startArt.hidden=!(visible&&mode==='start');";
assert.equal(approvedVideoState.split(approvedPlusRule).length,2,'Original plus visibility fixture remains identifiable');
approvedVideoFiles.set('lab/video-scene-states.js',Buffer.from(approvedVideoState.replace(
  approvedPlusRule,"startArt.hidden=!(visible&&['start','reference','extend'].includes(mode));"
)));


// Approved Reference-only copy/spacing follow-up. Original Start and other tools
// retain their independent source and exact pixel tolerances.
const referenceInvitation="reference:['Guide the motion with references','Upload images or choose saved elements, then describe how they move and interact.']";
const referenceState=approvedVideoFiles.get('lab/video-scene-states.js').toString();
assert.equal(referenceState.split(referenceInvitation).length,2,'Original Reference invitation fixture remains identifiable');
approvedVideoFiles.set('lab/video-scene-states.js',Buffer.from(referenceState.replace(referenceInvitation,"reference:['Animate your references','']")));
// Match the same approved copy in both retained presentation writers.
for(const path of ['lab/lab.js','lab/video-editorial-deck.js']){
 const original=approvedVideoFiles.get(path).toString();
 assert.equal(original.split('Guide the motion with references').length,2,'Reference heading anchor: '+path);
 assert.equal(original.split('Upload images or choose saved elements, then describe how they move and interact.').length,2,'Reference description anchor: '+path);
 approvedVideoFiles.set(path,Buffer.from(original.replace('Guide the motion with references','Animate your references').replace('Upload images or choose saved elements, then describe how they move and interact.','')));
}
const referenceInvitationStyles=`
html body #app.video-studio-active.pv-video-approved-ready.pv-video-state-ready.pv-video-compact.pv-video-mode-reference .video-feed-center .pv-video-start-visual:not([hidden]){margin-bottom:24px!important}
html body #app.video-studio-active.pv-video-approved-ready.pv-video-state-ready.pv-video-compact.pv-video-mode-reference .video-feed-center .empty-title{margin-top:0!important;opacity:.9}
html body #app.video-studio-active.pv-video-approved-ready.pv-video-state-ready.pv-video-compact.pv-video-mode-reference .video-feed-center .empty-description{display:none!important}
html body #app.video-studio-active.pv-video-approved-ready.pv-video-state-ready.pv-video-compact.pv-video-mode-reference .video-feed-center .empty-actions{margin-top:24px!important;gap:16px!important}
html body #app.video-studio-active.pv-video-approved-ready.pv-video-state-ready.pv-video-compact.pv-video-mode-reference .video-feed-center .empty-actions>button{height:48px!important;min-height:48px!important;padding:12px 24px!important}
`;
approvedVideoFiles.set('lab/video-relaxed-studio.css',Buffer.concat([approvedVideoFiles.get('lab/video-relaxed-studio.css'),Buffer.from(referenceInvitationStyles)]));

const account=`
const state=window.__publicAccount||=(()=>{
  const listeners=[];
  const account={isSignedIn:false,user:null,session:null,
    addListener:fn=>listeners.push(fn),
    openSignIn:options=>{state.signins.push(options);},
    signOut:async()=>{sessionStorage.removeItem('pv-test-role');account.isSignedIn=false;account.user=null;account.session=null;for(const fn of listeners)fn();}
  };
  const state={account,signins:[],authorize:async(role='customer')=>{
    sessionStorage.setItem('pv-test-role',role);state.role=role;account.isSignedIn=true;account.user={id:'user_PublicTest',firstName:'Synthetic'};
    account.session={id:'sess_PublicTest',getToken:async()=> 'synthetic-token'};
    for(const fn of listeners)fn();
  }};return state;
})();
export const isNativeLab=()=>false;
export const loadLabAccount=async()=>{const role=window.__publicInitialRole||sessionStorage.getItem('pv-test-role');if(role&&!state.account.isSignedIn)await state.authorize(role);return state.account;};
`;
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const requestedPath=pathname==='/lab/moods'?'/lab/moods.html':pathname;
  const path=resolve(root,'.'+decodeURIComponent(requestedPath));
  if(relative(root,path).startsWith('..')||!existsSync(path)||!statSync(path).isFile())return res.writeHead(404).end();
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif'})[extname(path)]||'application/octet-stream');
  res.end(pathname==='/lab/native-account.js'?account:
    req.headers['x-pv-approved-fashion']==='1'&&fashionApprovedFiles.has(requestedPath.slice(1))?fashionApprovedFiles.get(requestedPath.slice(1)):
    req.headers['x-pv-approved-video']==='1'&&approvedVideoFiles.has(requestedPath.slice(1))?approvedVideoFiles.get(requestedPath.slice(1)):
    req.headers['x-pv-approved-baseline']==='1'&&approvedFiles.has(requestedPath.slice(1))?approvedFiles.get(requestedPath.slice(1)):readFileSync(path));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.PV_CHROMIUM_EXECUTABLE||undefined});
mkdirSync('test-results',{recursive:true});
const surfaces={image:'#pv-guest-composer',video:'#video-model-trigger',upscale:'#pv-upscale-dropzone',retouch:'#precision-demo',fashion:'#fashion-studio #fashion-form'};
async function settled(page,route,signed=false){
  await page.waitForFunction(({route,signed})=>{
    const app=document.getElementById('app'),gate=document.getElementById('gate');
    return document.body.classList.contains('lab-ready')&&
      (signed?!app.hidden&&!app.hasAttribute('data-guest-preview')&&gate.hidden:
        route==='image'?!gate.hidden&&gate.dataset.guestTool==='image':!app.hidden&&app.dataset.guestPreview===route);
  },{route,signed});
  await page.locator(surfaces[route]).waitFor({state:'visible'});
  await page.evaluate(()=>document.fonts.ready);
}
function compareVisual(actual,expected,label){
  const a=PNG.sync.read(actual),b=PNG.sync.read(expected);
  assert.deepEqual([a.width,a.height],[b.width,b.height],label+' dimensions');
  let changed=0,maxDelta=0;
  for(let offset=0;offset<a.data.length;offset+=4){
    let delta=0;
    for(let channel=0;channel<4;channel++)delta=Math.max(delta,Math.abs(a.data[offset+channel]-b.data[offset+channel]));
    if(delta)changed++;maxDelta=Math.max(maxDelta,delta);
  }
  // Chromium may round a fractional crop border by one channel level. This
  // permits only that measured edge noise, never changed text, imagery or size.
  assert.ok(maxDelta<=1&&changed<=Math.max(1,a.width*a.height*.001),label+': '+JSON.stringify({changed,maxDelta,pixels:a.width*a.height}));
}
async function fullPage(page,path){
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path,fullPage:true,animations:'disabled'});
}
async function capture(page,selector,path){
  await page.mouse.move(0,0);
  await page.locator(selector).waitFor({state:'visible'});
  await page.evaluate(async()=>{
    await document.fonts.ready;
    await Promise.all([...document.images].filter(img=>img.offsetWidth&&(img.loading!=='lazy'||img.complete)).map(img=>img.decode().catch(()=>{})));
  });
  return page.locator(selector).screenshot({path,animations:'disabled',caret:'hide',style:'#studio-header{visibility:hidden!important}'});
}
try{
  for(const width of [1440,390,320]){
    const context=await browser.newContext({viewport:{width,height:950},isMobile:width<700,hasTouch:width<700,reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[],requests=[],writes=[];
    page.on('pageerror',e=>errors.push(e.message));
    await context.route('https://**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev')return route.abort();
      requests.push(url.pathname);
      if(request.method()!=='GET')writes.push({path:url.pathname,signed:request.headers().authorization==='Bearer synthetic-token'});
      const owner=await page.evaluate(()=>window.__publicAccount?.role==='owner');
      const payload=url.pathname==='/api/session'?{
        owner,customer:!owner,generationReady:true,billingReady:true,balanceCredits:500,
        config:{enabled:true,customer:!owner,videoEngines:['seedance','wan'],falEnabled:true,upscaleEnabled:true}
      }:url.pathname==='/api/fashion/models'?{models:[{id:'fashnmax',available:true}]}:
        url.pathname==='/api/fashion/balance'?{connected:false}:url.pathname==='/api/jobs'?{jobs:[],nextCursor:null}:
        url.pathname==='/api/packs'?{packs:[]}:url.pathname==='/api/moods'?{boards:[]}:{items:[],jobs:[],models:[]};
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
    });
    // All public tools have one shared Sign in and no private Assets shortcut.
    let imageSignInRightInset=null;
    // Every public direct URL must expose its own approved deck, never a gate or Image stand-in.
    if(!headerGutterOnly){
    for(const route of Object.keys(surfaces)){
      await page.goto(base+'/lab/studio.html?tool='+route);
      await settled(page,route);
      assert.equal(await page.locator('#tool-assets').isVisible(),false,route+' guest must not see private Assets');
      assert.equal(await page.locator('#studio-header #signin').isVisible(),true,route+' retains the shared Sign in control');
      assert.equal(await page.locator('#studio-header #signin').count(),1,route+' must not duplicate the masthead Sign in');
      const signInBox=await page.locator('#studio-header #signin').boundingBox();
      const signInRightInset=width-(signInBox.x+signInBox.width);
      if(route==='image')imageSignInRightInset=signInRightInset;
      else assert.ok(Math.abs(signInRightInset-imageSignInRightInset)<=1,
        route+' Sign in aligns with Image at '+width+'px: '+JSON.stringify({signInRightInset,imageSignInRightInset}));
      assert.equal(await page.getByText(/^Sign in to open /).isVisible(),false,route+' generic gate');
      assert.equal(await page.locator('#pv-guest-selected-tool').isVisible(),false);
      assert.equal(await page.locator('#pv-guest-composer').isVisible(),route==='image');
      assert.equal(await page.locator('.archive').isVisible(),false,'private History');
      assert.equal(await page.locator('#studio-account-menu').isVisible(),false,'account');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,route+' overflow');
      assert.equal(await page.evaluate(()=>window.__publicAccount.signins.length),0,'browse without auth');
      if(route==='image')assert.equal(await page.locator('#pv-guest-characters').isVisible(),true,
        'The approved Characters shortcut is directly accessible');
      assert.deepEqual(requests,[],'guests must make no private API requests');
      // Compare the actual editorial regions with the approved implementation
      // recovered from Git, independently booted through its original auth path.
      const baseline=await browser.newContext({viewport:{width,height:950},isMobile:width<700,hasTouch:width<700,reducedMotion:'reduce',extraHTTPHeaders:route==='video'?{'x-pv-approved-video':'1'}:{'x-pv-approved-baseline':'1',...(route==='fashion'?{'x-pv-approved-fashion':'1'}:{})}});
      if(route!=='image'&&route!=='fashion')await baseline.addInitScript(()=>{window.__publicInitialRole='owner';});
      const reference=await baseline.newPage();
      await baseline.route('https://**/*',async intercepted=>{
        const request=intercepted.request(),url=new URL(request.url());
        if(url.hostname!=='parallel-vision-lab.parallelvision.workers.dev')return intercepted.abort();
        assert.equal(request.method(),'GET','baseline is read-only');
        const payload=url.pathname==='/api/session'?{owner:true,customer:false,config:{enabled:true,videoEngines:['seedance','wan'],falEnabled:true}}:
          url.pathname==='/api/fashion/models'?{models:[{id:'fashnmax',available:true}]}:
          url.pathname==='/api/jobs'?{jobs:[],nextCursor:null}:url.pathname==='/api/packs'?{packs:[]}:{items:[],jobs:[],models:[]};
        await intercepted.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
      });
      await reference.goto(base+'/lab/studio.html?tool='+route);
      await reference.locator(surfaces[route]).waitFor({state:'visible'});
      if(route==='video'){
        // Both approved modes are independent of PR #443's fresh Start default.
        await page.locator('#mode-start').click();await reference.locator('#mode-start').click();
        if(width>=700){
          const actual=await capture(page,'.canvas',`test-results/visual-video-start-${width}-actual.png`);
          const expected=await capture(reference,'.canvas',`test-results/visual-video-start-${width}-approved.png`);
          compareVisual(actual,expected,'Approved original subway Video Start canvas');
        }else{
          assert.equal(await page.locator('#pv-video-start-visual').isVisible(),false,'Approved compact phone Video omits the empty stage');
          assert.equal(await reference.locator('#pv-video-start-visual').isVisible(),false);
        }
        await page.locator('#mode-reference').click();await reference.locator('#mode-reference').click();
      }
      if(route==='fashion'){
        for(const inspected of [page,reference]){
          assert.equal(await inspected.locator('#fashion-studio .result-panel').isVisible(),false,'An empty Fashion view never presents a decorative photo as a result');
          assert.equal(await inspected.locator('#fashion-studio .slot-example').count(),2,'Both approved upload photographs remain');
        }
      }
      // Phone Image deck parity is exercised in lab-mobile-mood-entry; keep independent pixel protection for the unchanged entrance photographs/title.
      const regions={image:width<=680?['#pv-guest-title','#pv-guest-cards']:['#gate'],video:width>=700?['#video-model-control','.canvas']:['#video-model-control','#video-modes','#reference-drop','#prompt'],upscale:['.pv-upscale-workspace-intro','#pv-upscale-dropzone'],retouch:['.precision-board'],fashion:['#fashion-studio .page-intro','#fashion-studio .image-pair','#fashion-studio .engine-section']};
      for(const [index,selector] of regions[route].entries()){
        const actual=await capture(page,selector,`test-results/visual-${route}-${width}-${index}-actual.png`);
        const expected=await capture(reference,selector,`test-results/visual-${route}-${width}-${index}-approved.png`);
        compareVisual(actual,expected,`Approved ${route} visual at ${width}px: ${selector}`);
      }
      await baseline.close();
      await fullPage(page,`test-results/studio-public-${route}-${width}.png`);
      const action=route==='image'?'#pv-guest-generate':route==='fashion'?'#fashion-studio #quote':route==='retouch'?'#precision-generate':'#generate';
      await page.locator(action).click();
      await page.waitForFunction(()=>window.__publicAccount.signins.length===1);
      const options=await page.evaluate(()=>window.__publicAccount.signins[0]);
      assert.equal(options.forceRedirectUrl,page.url());
      assert.equal(options.signUpForceRedirectUrl,page.url());
      assert.deepEqual(requests,[],'auth action cannot submit or upload');
      if(route==='image'){
        await page.locator('#pv-guest-prompt').fill('A character study');
        await page.locator('#pv-guest-characters').waitFor({state:'visible'});
        await page.locator('#pv-guest-characters').click();
        await page.waitForFunction(()=>window.__publicAccount.signins.length===2);
        assert.equal(await page.locator('#scene-library-dialog').isVisible(),false,
          'The public Characters shortcut authenticates before opening private references');
        assert.deepEqual(requests,[],'The guest character entry cannot fetch private data');
      }
      if(route==='video'){
        await page.locator('#scene-video-open').click();
        await page.waitForFunction(()=>window.__publicAccount.signins.length===2);
        assert.equal(await page.locator('#scene-library-dialog').isVisible(),false,'Private Scene Library stays closed');
      }
      if(route==='upscale'){
        assert.equal(await page.locator('#upscale-model-menu').isVisible(),true,'Guests can see the real model cards');
        const originalEngine=await page.locator('#upscale-engine').inputValue();
        await page.locator('#upscale-model-trigger').click();
        await page.waitForFunction(()=>window.__publicAccount.signins.length===2);
        await page.locator('#upscale-precision-trigger').click();
        await page.waitForFunction(()=>window.__publicAccount.signins.length===3);
        await page.locator('[data-upscale-engine="topaz-wonder"]').click();
        await page.waitForFunction(()=>window.__publicAccount.signins.length===4);
        assert.equal(await page.locator('#upscale-engine').inputValue(),originalEngine,'Public cards cannot silently change provider selection');
        assert.equal(await page.locator('#upscale-precision-options').isVisible(),false,'Guest cannot open paid Precision settings');
      }
      assert.deepEqual(requests,[],'private controls cannot upload, quote or fetch files');
    }
    // Assets has no public preview: browsing cannot reveal its private files.
    await page.goto(base+'/lab/studio.html?tool=assets');
    await page.locator('#pv-guest-selected-tool').waitFor({state:'visible'});
    assert.equal(await page.locator('#app').isVisible(),false);
    assert.equal(await page.locator('#history').textContent(),'');
    assert.equal(await page.evaluate(()=>window.__publicAccount.signins.length),0);
    assert.deepEqual(requests,[]);
    await page.locator('#pv-guest-selected-tool button').click();
    await page.waitForFunction(()=>window.__publicAccount.signins.length===1);
    assert.equal(new URL(await page.evaluate(()=>window.__publicAccount.signins[0].forceRedirectUrl)).searchParams.get('tool'),'assets');
    // Visible tabs, Back/Forward, canceled authentication and draft preservation.
    await page.goto(base+'/lab/studio.html?tool=image');await settled(page,'image');
    await page.locator('#pv-guest-prompt').fill('Keep my public Image draft.');
    for(const route of ['video','upscale','retouch','fashion','image']){
      if(route==='fashion')await page.locator('.pv-studios-trigger').click();
      await page.locator('#tool-'+route).click();await settled(page,route);
      assert.equal(new URL(page.url()).searchParams.get('tool'),route);
    }
    assert.equal(await page.locator('#pv-guest-prompt').inputValue(),'Keep my public Image draft.');
    await page.goBack();await settled(page,'fashion');
    await page.goForward();await settled(page,'image');
    await page.locator('#tool-retouch').click();await settled(page,'retouch');
    await page.locator('#precision-return').click();await settled(page,'image');
    await page.locator('.pv-studios-trigger').click();
    await page.locator('#tool-fashion').click();await settled(page,'fashion');
    assert.equal(await page.locator('#fashion-studio .result-actions a[href*="studio.html?tool=image"]').isVisible(),false,
      'The approved empty Fashion result keeps result-only actions hidden');
    // Public empty Fashion returns through the shared tab. The authenticated
    // archived-result link is exercised by lab-fashion-reference-layout-ui.mjs.
    await page.locator('#tool-image').click();await settled(page,'image');
    await page.locator('#tool-explore-moods').click();
    await page.waitForURL('**/lab/moods');
    await page.getByRole('heading',{name:/Explore Moods/}).waitFor({state:'visible'});
    await page.goBack();await settled(page,'image');
    // Guest upload entry must authenticate before the shared uploader sees a File.
    await page.locator('#tool-upscale').click();await settled(page,'upscale');
    await page.locator('#pv-upscale-hero-upload').click();
    await page.waitForFunction(()=>window.__publicAccount.signins.length===1);
    assert.deepEqual(requests,[]);
    }
    // Actual sync() restores the requested destination for customers and owners.
    for(const role of ['customer','owner']){
      for(const route of (headerGutterOnly?['retouch']:['video','upscale','retouch','fashion'])){
        await page.goto(base+'/lab/studio.html?tool='+route);await settled(page,route);
        await page.evaluate(role=>window.__publicAccount.authorize(role),role);
        await settled(page,route,true);
        assert.equal(await page.locator('#tool-assets').isVisible(),true,
          role+' signed-in '+route+' keeps the original private Assets control');
        assert.equal(new URL(page.url()).searchParams.get('tool'),route);
        assert.equal(await page.locator('#tool-'+route).getAttribute('aria-pressed'),'true');
        await page.locator('#tool-image').click();
        await page.locator('#image-composer').waitFor({state:'visible'});
        const headerPositions=()=>page.evaluate(()=>({
          clientWidth:document.documentElement.clientWidth,
          controls:['tool-assets','lab-wallet-toggle','lab-add-credits','studio-account-menu'].map(id=>{
            const el=document.getElementById(id);if(!el.getClientRects().length)return null;
            const r=el.getBoundingClientRect();return {id,x:r.x,width:r.width,right:r.right};
          })
        }));
        const imageHeader=route==='retouch'?await headerPositions():null;
        if(route==='fashion')await page.locator('.pv-studios-trigger').click();
        await page.locator('#tool-'+route).click();await settled(page,route,true);
        if(route==='retouch'&&width>=761){
          const retouchHeader=await headerPositions();
          assert.equal(retouchHeader.clientWidth,imageHeader.clientWidth,role+' Retouch keeps the Image scrollbar reservation at '+width);
          for(let i=0;i<imageHeader.controls.length;i++){
            const before=imageHeader.controls[i],after=retouchHeader.controls[i];
            assert.equal(!!after,!!before,'Header control visibility stays unchanged');
            if(before)for(const key of ['x','width','right'])
              assert.ok(Math.abs(before[key]-after[key])<0.5,role+' '+before.id+' '+key+' remains static entering Retouch at '+width);
          }
          await page.locator('#tool-image').click();await page.locator('#image-composer').waitFor({state:'visible'});
          assert.deepEqual(await headerPositions(),imageHeader,'Returning to Image restores the same header positions');
          await page.locator('#tool-retouch').click();await settled(page,'retouch',true);
        }
        await fullPage(page,`test-results/studio-${role}-${route}-${width}.png`);
        if(route==='upscale'){
          await page.locator('#tool-explore-moods').click();await page.waitForURL('**/lab/moods');
          await page.getByRole('heading',{name:/Explore Moods/}).waitFor({state:'visible'});
          await page.goBack();await settled(page,route,true);
        }
        const privateField={video:'#prompt',retouch:'#precision-prompt',fashion:'#fashion-studio #direction'}[route];
        const privateText='PRIVATE SESSION '+role+' '+route+' '+width;
        if(route==='retouch')await page.locator('#precision-try-sample').click();
        if(privateField)await page.locator(privateField).fill(privateText);
        await page.evaluate(()=>window.__publicAccount.account.signOut());
        await settled(page,route);
        if(privateField)assert.equal(await page.locator(privateField).inputValue(),'','logout clears private direction before public preview');
        assert.equal(await page.getByText(privateText,{exact:true}).isVisible(),false,'No private direction remains visible in the public inspector');
        assert.equal(await page.locator('.archive').isVisible(),false,'logout hides History');
        assert.equal(await page.locator('#history').textContent(),'','logout clears History');
      }
    }
    assert.ok(writes.every(write=>write.signed&&write.path==='/api/quotes'),'Only existing authenticated automatic quote previews are permitted; no guest writes, uploads, generation, billing or provider mutations: '+JSON.stringify(writes));
    assert.deepEqual(errors,[]);
    console.log(headerGutterOnly?`PASS Customer/Owner Retouch ${width}px: desktop header alignment when applicable, navigation, logout and API isolation`:`PASS public/signed-in Studio ${width}px: five approved decks, auth returns, tabs, Back/Forward, logout, API isolation`);
    await context.close();
  }
}finally{await browser.close();server.close();}
