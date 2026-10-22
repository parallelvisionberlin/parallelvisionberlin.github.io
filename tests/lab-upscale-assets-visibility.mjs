// Read-only browser regression for restored Upscaler results and shared Assets.
// No Clerk sign-in, live network providers, private records, or generation calls.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const main=readFileSync('lab/lab.js','utf8');
const html=readFileSync('lab/studio.html','utf8');
const css=readFileSync('lab/assets.css','utf8');
const lib=readFileSync('lab-worker/asset-library.mjs','utf8');
assert.ok(main.includes("app').classList.toggle('upscale-studio-active',upscale)"),'Upscaler mode must flag the root app');
assert.ok(main.includes('historyJobVisible'),'Live results respect the Upscaler-only history filter');
assert.ok(main.includes("bindDrop('upscale-canvas'"),'Drop requests retain the existing signed-in upload handler');
assert.ok(main.includes("diagnostic.hidden=!ownerAccount"),'Upscaler provider diagnostics require the verified owner session');
assert.equal((html.match(/data-upscale-owner-only hidden/g)||[]).length,5,'All five provider diagnostic elements are hidden before authentication');
assert.ok(main.includes("Upscaled images below and Assets"),'Upscaler completion points to its results and Assets');
assert.ok(!html.includes('id="upscale-view-assets"'),'Results replace the former Assets-only shortcut');
assert.ok(!css.includes('.archive{display:none!important}'),'Upscaler archive remains visible');
assert.ok(lib.includes("const clauses=['j.owner_id=?'"),'Assets selection must remain owner-scoped');
assert.ok(lib.includes("if(url.searchParams.get('unfiled')==='1'"),'Assets retains the entire library when unfiled is absent');
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  const file=resolve(root,'.'+u.pathname+(u.pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+sep)||!existsSync(file)){res.writeHead(404).end();return;}
  const extension=extname(file);
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'})[extension]||'text/plain');
  // We test the production HTML+CSS with mock DOM states to avoid a real owner session.
  if(u.pathname==='/lab/lab.js'||u.pathname==='/lab/gallery-layout.js'){res.end('// Mock-only: no provider or Clerk calls');return;}
  res.end(readFileSync(file));
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const port=server.address().port,browser=await chromium.launch({headless:true});
mkdirSync('test-results',{recursive:true});
const results=[];
for(const [width,height,profile] of [[1440,900,'desktop'],[390,844,'mobile']]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**/*',route=>route.abort());
  try{
    await page.goto('http://127.0.0.1:'+port+'/lab/studio.html?tool=upscale',{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>{
      document.body.classList.add('lab-ready');
      const app=document.getElementById('app');app.hidden=false;
      document.getElementById('gate').hidden=true;
      const archive=document.querySelector('.archive');
      const card=document.createElement('article');card.className='card';card.dataset.kind='image';card.dataset.job='mock-upscale';
      card.textContent='Completed upscale result';document.getElementById('history').append(card);
      // A real finished job hides the empty-gallery placeholder.
      document.getElementById('emptyarchive').hidden=true;
      app.classList.add('upscale-studio-active');
      // Match the authenticated Upscaler view for the isolated mock page.
      document.getElementById('empty-title').textContent='Upscaler';
      document.getElementById('empty-description').textContent='Restore fine detail and resolution while keeping your original composition.';
      document.getElementById('canvas-import').textContent='Upload image';
      document.getElementById('canvas-secondary').hidden=true;
      document.getElementById('generate').textContent='Upscale · 10 credits';
      document.getElementById('emptyarchive').textContent='No upscaled images yet';
      const tool=document.getElementById('tool-upscale');tool.classList.add('active');tool.setAttribute('aria-pressed','true');
      // Set the same visibility flags the authenticated Upscaler uses, without providers.
      for(const id of ['upscale-model-display','upscale-scale-control','upscale-info','upscale-price','format-control']){
        document.getElementById(id).hidden=false;
      }
      for(const id of ['duration-control','image-processing-control','image-count-control','ratio-control','prompt','prompt-label','video-model-control','video-modes','video-task-switch','video-utilities','soul-controls','start-mode','resolution-control','upscale-model-control']){
        const el=document.getElementById(id);if(el)el.hidden=true;
      }
    });
    const deck=await page.evaluate(()=>{
      const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,width:r.width};};
      // Compare the actual input surfaces, not the model wrapper that also contains its label.
      return {model:rect('.upscale-model-readout'),size:rect('#upscale-scale'),format:rect('#output-format'),generate:rect('#generate')};
    });
    assert.ok(deck.model.width>0&&deck.generate.width>0,profile+': Upscale settings remain usable');
    assert.ok(deck.model.top<deck.size.top&&deck.format.top>=deck.size.top-2,profile+': model is above the output controls');
    assert.ok(Math.abs(deck.size.top-deck.format.top)<5,profile+': enlargement and format share one readable row');
    assert.ok(deck.generate.top>deck.size.top,profile+': paid Upscale action is distinct from settings');
    assert.equal(await page.locator('.pv-upscale-source-control').isVisible(),false,'Empty Upscaler uses the stage upload before showing Replace photo');
    assert.equal(await page.locator('.pv-upscale-output-heading').isVisible(),false,'Unwanted OUTPUT section heading is hidden');
    assert.equal(await page.locator('.pv-upscale-workspace-intro h2').innerText(),'Upscale.','Approved current heading retained');
    const initialLayout=await page.evaluate(()=>{
      const controls=document.querySelector('#app.upscale-studio-active>.workspace>.controls').getBoundingClientRect();
      const model=document.querySelector('#upscale-model-display').getBoundingClientRect();
      const output=document.querySelector('.pv-upscale-output-heading').getBoundingClientRect();
      return {height:controls.height,modelBottom:model.bottom,outputTop:output.top};
    });
    if(profile==='desktop')assert.ok(initialLayout.height>=630,'Approved desktop settings deck matches the full reference');
    else assert.ok(initialLayout.height>=300,'Mobile settings remain comfortably usable');
    const geometry=await page.evaluate(()=>{
      const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height};};
      return {
        canvas:rect('#upscale-canvas'),deck:rect('#app .workspace>.controls'),results:rect('.archive'),
        options:rect('#upscale-info summary'),size:rect('#upscale-scale'),imageLoaded:false
      };
    });
    if(profile==='desktop'){
      assert.ok(Math.abs(geometry.deck.right-geometry.canvas.left)<=1,'Desktop sidebar and photographic stage meet at the approved shared edge');
      assert.ok(Math.abs(geometry.deck.top-geometry.canvas.top)<55,'Desktop studio panels share a top baseline');
      assert.ok(Math.abs(geometry.canvas.height-Math.max(690,Math.min(height-77,1050)))<=2,'Desktop empty preview retains its full-screen viewport height');
      assert.ok(geometry.results.top>=geometry.canvas.bottom,'Upscaled results follow the preview');
      assert.ok(geometry.results.left>=geometry.canvas.left-5,'Results align with the image stage, not the sidebar');
      assert.equal(await page.locator('#upscale-info').isVisible(),false,'Approved main hides the advanced technical disclosure');
      const galleryPeek=await page.evaluate(()=>{
        const archive=document.querySelector('#app>.archive').getBoundingClientRect();
        const card=document.querySelector('#history .card').getBoundingClientRect();
        const preview=document.getElementById('upscale-canvas').getBoundingClientRect();
        const benefits=document.querySelector('.pv-upscale-benefits').getBoundingClientRect();
        const center=document.querySelector('.pv-upscale-empty-center').getBoundingClientRect();
        return {archiveTop:archive.top,cardTop:card.top,previewHeight:preview.height,
          centerBottom:center.bottom,benefitsTop:benefits.top,viewportHeight:innerHeight};
      });
      assert.ok(galleryPeek.archiveTop>galleryPeek.viewportHeight-70,'Approved fullscreen preview prioritizes the workspace');
      assert.ok(galleryPeek.cardTop>galleryPeek.archiveTop,'The real result gallery remains below the editor');
      assert.equal(await page.locator('.pv-upscale-benefits').isVisible(),false,'Approved fullscreen mockup hides extra feature icons');
      assert.ok(galleryPeek.previewHeight>=650&&galleryPeek.previewHeight<=850,'Approved full-screen photographic canvas height');
    }else{
      assert.ok(geometry.deck.top>=geometry.canvas.bottom+7,'Mobile shows the image before the settings deck');
      assert.ok(Math.abs(geometry.canvas.height-450)<=2,'Narrow mobile preview retains the approved 450px stage');
      assert.ok(geometry.results.top>=geometry.deck.bottom,'Mobile result gallery follows settings');
    }
    assert.equal(await page.locator('.pv-upscale-workspace-intro').isVisible(),true,'Upscale has the editorial settings header');
    assert.equal(await page.locator('.pv-upscale-empty-drop').isVisible(),true,'Approved upload-first empty state is visible');
    assert.equal(await page.locator('.pv-upscale-editorial-blank').count(),0,'Old editorial gallery layout is removed');
    assert.equal(await page.locator('.pv-upscale-empty-center h2').innerText(),'Use a source frame.','Exact approved headline');
    assert.equal(await page.locator('#pv-upscale-hero-upload').innerText(),'Upload image','Exact approved CTA');
    assert.deepEqual(await page.locator('.pv-upscale-benefit span').allInnerTexts(),['Bigger resolution','Richer textures','More clarity'],'Existing benefit markup is retained without showing decorative icons');
    const dropGeometry=await page.evaluate(()=>{
      const zone=document.getElementById('pv-upscale-dropzone'),r=zone.getBoundingClientRect();
      return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,
        border:getComputedStyle(zone).borderStyle,
        background:getComputedStyle(zone,'::before').backgroundImage};
    });
    assert.equal(dropGeometry.border,'none','Approved full-screen backdrop has a floating dashed upload card');
    assert.ok(dropGeometry.background.includes('upscaler-chrome-wool-option-1.jpg'),'Existing PV LAB material image appears only as atmospheric background');
    assert.ok(dropGeometry.left>=geometry.canvas.left&&dropGeometry.right<=geometry.canvas.right+1,'Full-screen backdrop fills the preview');
    if(profile==='mobile'){
      assert.equal(await page.locator('.pv-upscale-benefits').isVisible(),false,'Mobile emphasizes upload without cramped feature icons');
      const mobile=await page.evaluate(()=>{
        const bounds=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
        return {title:bounds('.pv-upscale-empty-center h2'),
          button:bounds('#pv-upscale-hero-upload'),canvas:bounds('#upscale-canvas')};
      });
      assert.ok(mobile.title.bottom<mobile.button.top,'Mobile title and CTA do not overlap');
      assert.ok(mobile.button.bottom<mobile.canvas.bottom-8,'Mobile upload CTA stays inside preview');
      assert.ok(mobile.button.left>=mobile.canvas.left&&mobile.button.right<=mobile.canvas.right,'Mobile upload CTA fits screen');
    }else{
      assert.equal(await page.locator('.pv-upscale-benefits').isVisible(),false,'Fullscreen design hides extra feature icons');
    }
    const heroChooser=page.waitForEvent('filechooser');
    await page.locator('#pv-upscale-hero-upload').click();
    assert.equal((await heroChooser).isMultiple(),false,'Primary CTA uses the original one-image upload input');
    const areaChooser=page.waitForEvent('filechooser');
    await page.locator('#pv-upscale-dropzone').click({position:{x:12,y:12}});
    assert.equal((await areaChooser).isMultiple(),false,'Clicking inside the large drop area opens the same upload input');
    const emptyCanvasHeight=geometry.canvas.height;
    await page.evaluate(()=>{
      const preview=document.getElementById('preview'),empty=document.getElementById('empty');
      preview.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140"><rect width="100" height="140" fill="#4c5360"/></svg>');
      preview.hidden=false;empty.hidden=true;
    });
    const filledCanvasHeight=await page.locator('#upscale-canvas').evaluate(el=>el.getBoundingClientRect().height);
    const expectedFilledHeight=profile==='desktop'?Math.max(660,Math.min(height-100,900)):emptyCanvasHeight;
    assert.ok(Math.abs(filledCanvasHeight-expectedFilledHeight)<=2,'Source preview retains the approved responsive loaded-image height');
    await page.waitForFunction(()=>document.getElementById('app').classList.contains('pv-upscale-source-ready'));
    assert.equal(await page.locator('.pv-upscale-source-control').isVisible(),true,'Source image remains available after upload');
    const secondaryChooser=page.waitForEvent('filechooser');
    await page.locator('#pv-upscale-source-upload').click();
    assert.equal((await secondaryChooser).isMultiple(),false,'Replace source uses the original single-image chooser');
    await page.evaluate(()=>{document.getElementById('preview').hidden=true;document.getElementById('empty').hidden=false;});
    await page.waitForFunction(()=>!document.getElementById('app').classList.contains('pv-upscale-source-ready'));
    assert.equal(await page.locator('.pv-upscale-source-control').isVisible(),false,'Clearing the source restores the stage upload without a duplicate source selector');
    assert.equal(await page.locator('.stagefoot').isVisible(),false,'Empty Upscaler does not show a technical footer');
    assert.equal(await page.locator('#settings-summary').isVisible(),false,'Redundant technical text is hidden on Upscaler');
    await page.evaluate(()=>{document.querySelector('#download').hidden=false;});
    assert.equal(await page.locator('.stagefoot').isVisible(),false,'Upscale relies on the existing result toolbar instead of a duplicate footer');
    await page.evaluate(()=>{document.querySelector('#download').hidden=true;});
    await page.evaluate(()=>{
      const card=document.querySelector('#history .card'),figure=document.createElement('figure');
      figure.className='history-media';figure.setAttribute('aria-busy','true');
      const img=document.createElement('img');img.className='history-asset-loading';
      figure.append(img);card.prepend(figure);
    });
    const loadingState=await page.locator('#history .history-media').evaluate(el=>({
      name:getComputedStyle(el,'::before').animationName,
      hidden:getComputedStyle(el.querySelector('img')).visibility==='hidden'
    }));
    assert.ok(loadingState.name.includes('pv-upscale-image-shimmer'),'Actual loading thumbnails have a subtle shimmer');
    assert.equal(loadingState.hidden,true,'Unloaded image elements stay hidden until decoded');
    await page.locator('#history .history-media').evaluate(el=>{
      el.classList.add('has-image');el.setAttribute('aria-busy','false');el.querySelector('img').classList.remove('history-asset-loading');
    });
    assert.equal(await page.locator('#history .history-media').evaluate(el=>getComputedStyle(el,'::before').animationName),'none','Shimmer ends when the image loads');
    // Main's approved V22/V23 presentation hides this disclosure for every role.
    // Keep price-confirmation and paid-request coverage in lab-upscale-ui.mjs unchanged.
    assert.equal(await page.locator('#upscale-info').isVisible(),false,'Technical disclosure stays hidden in the current approved inspector');
    assert.equal(await page.locator('#upscale-price').isVisible(),false,'Hidden disclosure does not expose the standalone price checker');
    assert.equal(await page.locator('#upscale-technical-summary').isVisible(),false,'Customer view does not expose provider diagnostics');
    await page.evaluate(()=>{for(const diagnostic of document.querySelectorAll('#upscale-info [data-upscale-owner-only]'))diagnostic.hidden=false;});
    assert.equal(await page.locator('#upscale-technical-summary').isVisible(),false,'Approved inspector also keeps owner diagnostics visually hidden');
    await page.evaluate(()=>{for(const diagnostic of document.querySelectorAll('#upscale-info [data-upscale-owner-only]'))diagnostic.hidden=true;});
    await page.screenshot({path:'test-results/upscaler-options-'+profile+'.png',fullPage:true});
    assert.equal(await page.locator('#upscale-info summary').isVisible(),false,'Removed More options is not an interactive customer control');
    assert.equal(await page.locator('.archive').isVisible(),true,profile+': Upscaler shows its results');
    assert.equal(await page.locator('.card').isVisible(),true,profile+': Upscaled result is visible beneath deck');
    await page.screenshot({path:'test-results/upscaler-results-'+profile+'.png',fullPage:true});
    await page.evaluate(()=>{
      const app=document.getElementById('app'),panel=document.getElementById('assets-workspace');
      app.classList.add('assets-active');panel.hidden=false;
      document.getElementById('assets-gallery').append(document.querySelector('.archive'));
    });
    assert.equal(await page.locator('.archive').isVisible(),true,profile+': Assets must reveal the shared archive');
    assert.equal(await page.locator('.card').isVisible(),true,profile+': Upscaled result record remains in Assets');
    assert.equal(await page.locator('.upscale-assets-shortcut').isVisible(),false,profile+': Shortcut hidden while Assets open');
    await page.screenshot({path:'test-results/upscaler-shared-assets-'+profile+'.png',fullPage:false});
    await page.evaluate(()=>{
      const app=document.getElementById('app');
      app.classList.remove('assets-active','upscale-studio-active');
      document.getElementById('archive-rest-anchor').after(document.querySelector('.archive'));
      document.getElementById('assets-workspace').hidden=true;
    });
    assert.equal(await page.locator('.archive').isVisible(),true,profile+': Image and Video History remain available');
    assert.ok(main.includes("tool==='upscale'?'No upscaled images yet'"),'Empty Upscaler response uses a true no-results label');
    assert.equal(await page.locator('.upscale-assets-shortcut').isVisible(),false,profile+': No Upscale shortcut in other tools');
    assert.equal(await page.locator('.pv-upscale-editorial-blank').isVisible(),false,'Upscaler artwork stays isolated from Image and Video');
    const widthCheck=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth}));
    assert.ok(widthCheck.documentWidth<=widthCheck.viewportWidth,profile+': No horizontal overflow');
    assert.deepEqual(errors,[],profile+': Browser errors');
    results.push(profile);
  }finally{await context.close();}
}
await browser.close();await new Promise(ok=>server.close(ok));
console.log('PASS Upscaler shows results; Assets retains them; Image/Video retain History; responsive: '+results.join(', '));
