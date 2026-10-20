// Read-only browser regression for restored Upscaler results and shared Assets.
// No Clerk sign-in, live network providers, private records, or generation calls.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const main=readFileSync('lab/lab.js','utf8');
const html=readFileSync('lab/studio.html','utf8');
const css=readFileSync('lab/assets.css','utf8');
const lib=readFileSync('lab-worker/asset-library.mjs','utf8');
assert.ok(main.includes("app').classList.toggle('upscale-studio-active',upscale)"),'Upscaler mode must flag the root app');
assert.ok(main.includes('historyJobVisible'),'Live results respect the Upscaler-only history filter');
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
  if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404).end();return;}
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
    const chooserPromise=page.waitForEvent('filechooser');
    await page.locator('#pv-upscale-source-upload').click();
    const chooser=await chooserPromise;
    assert.equal(chooser.isMultiple(),false,profile+': editorial source button opens the existing single-image input');
    const geometry=await page.evaluate(()=>{
      const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height};};
      return {
        canvas:rect('#upscale-canvas'),deck:rect('#app .workspace>.controls'),results:rect('.archive'),
        options:rect('#upscale-info summary'),size:rect('#upscale-scale'),imageLoaded:false
      };
    });
    if(profile==='desktop'){
      assert.ok(geometry.deck.right+7<=geometry.canvas.left,'Desktop controls sit to the left of the photographic stage');
      assert.ok(Math.abs(geometry.deck.top-geometry.canvas.top)<55,'Desktop studio panels share a top baseline');
      assert.ok(geometry.canvas.height>=540&&geometry.canvas.height<=821,'Desktop preview is a full photographic stage');
      assert.ok(geometry.results.top>=geometry.canvas.bottom,'Upscaled results follow the preview');
      assert.ok(geometry.results.left>=geometry.canvas.left-5,'Results align with the image stage, not the sidebar');
      assert.ok(geometry.options.left>=geometry.deck.left&&geometry.options.right<=geometry.deck.right,'More options stays inside the left deck');
    }else{
      assert.ok(geometry.deck.top>=geometry.canvas.bottom+7,'Mobile shows the image before the settings deck');
      assert.ok(geometry.canvas.height>=415&&geometry.canvas.height<=425,'Narrow mobile preview remains a usable 420px stage');
      assert.ok(geometry.results.top>=geometry.deck.bottom,'Mobile result gallery follows settings');
    }
    assert.equal(await page.locator('.pv-upscale-workspace-intro').isVisible(),true,'Upscale has the editorial settings header');
    assert.equal(await page.locator('.pv-upscale-editorial-blank').isVisible(),true,'PV LAB editorial macro replaces generic model photo');
    assert.equal(await page.locator('.pv-upscale-example-note').isVisible(),false,'Old generic illustration copy is hidden');
    const material=page.locator('.pv-upscale-material-photo img');
    assert.equal(await material.getAttribute('src'),'./visuals/studio-tools/upscale-golden-macro-source.webp');
    await material.evaluate(image=>image.decode());
    assert.equal(await material.evaluate(image=>image.naturalWidth),1672,'Approved PV LAB macro source loads');
    // Temporary visual audit of the two other existing PV LAB textile assets.
    // This changes no site content and restores the original before continuing.
    if(profile==='mobile'){
      for(const [asset,name] of [['upscale-golden-weave.webp','weave'],['upscale-skin-and-collar.webp','collar']]){
        await material.evaluate(async (img,url)=>{
          img.style.setProperty('width','100%','important');
          img.style.setProperty('height','100%','important');
          img.style.setProperty('left','0','important');
          img.style.setProperty('top','0','important');
          img.style.setProperty('object-fit','cover','important');
          img.src=url;await img.decode();
        },'./visuals/studio-tools/'+asset);
        await page.screenshot({path:'test-results/upscaler-candidate-'+name+'.png',fullPage:false});
      }
      await material.evaluate(async img=>{
        img.removeAttribute('style');
        img.src='./visuals/studio-tools/upscale-golden-macro-source.webp';
        await img.decode();
      });
    }
    assert.equal(await page.locator('.pv-upscale-blank-footer').isVisible(),true,'Editorial original is labeled as not upscaled');
    if(profile==='mobile'){
      const mobileEditorial=await page.evaluate(()=>{
        const bounds=selector=>{
          const x=document.querySelector(selector).getBoundingClientRect();
          return {top:x.top,bottom:x.bottom,left:x.left,right:x.right,width:x.width};
        };
        return {
          columns:getComputedStyle(document.querySelector('.pv-upscale-editorial-blank')).gridTemplateColumns,
          canvas:bounds('#upscale-canvas'),
          title:bounds('.pv-upscale-blank-copy h2'),
          photo:bounds('.pv-upscale-material-photo'),
          button:bounds('#pv-upscale-hero-upload'),
          footer:bounds('.pv-upscale-blank-footer'),
          settingsTitleSize:parseFloat(getComputedStyle(document.querySelector('.pv-upscale-workspace-intro h2')).fontSize)
        };
      });
      assert.equal(mobileEditorial.columns.trim().split(/\s+/).length,1,'Mobile editorial has one real grid column');
      assert.ok(mobileEditorial.photo.width>=mobileEditorial.canvas.width*.78,'Mobile shows a wide material photograph');
      assert.ok(mobileEditorial.title.bottom<=mobileEditorial.photo.top,'Mobile title sits fully above photograph');
      assert.ok(mobileEditorial.photo.bottom<=mobileEditorial.button.top,'Photo and upload action do not overlap');
      assert.ok(mobileEditorial.button.bottom<=mobileEditorial.footer.top+2,'Editorial source label follows upload action');
      assert.ok(mobileEditorial.title.right<=mobileEditorial.canvas.right-10,'Mobile headline fits within preview');
      assert.ok(mobileEditorial.settingsTitleSize<=22,'Mobile settings heading stays compact');
    }
    const heroChooser=page.waitForEvent('filechooser');
    await page.locator('#pv-upscale-hero-upload').click();
    assert.equal((await heroChooser).isMultiple(),false,'Editorial button opens original single-image input');
    const emptyCanvasHeight=geometry.canvas.height;
    await page.evaluate(()=>{
      const preview=document.getElementById('preview'),empty=document.getElementById('empty');
      preview.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140"><rect width="100" height="140" fill="#4c5360"/></svg>');
      preview.hidden=false;empty.hidden=true;
    });
    const filledCanvasHeight=await page.locator('#upscale-canvas').evaluate(el=>el.getBoundingClientRect().height);
    assert.ok(Math.abs(filledCanvasHeight-emptyCanvasHeight)<=2,'Source preview remains equally spacious before and after upload');
    await page.evaluate(()=>{document.getElementById('preview').hidden=true;document.getElementById('empty').hidden=false;});
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
    assert.equal(await page.locator('#upscale-price').isVisible(),false,'Optional pricing is initially hidden');
    await page.locator('#upscale-info summary').click();
    assert.equal(await page.locator('#upscale-price').isVisible(),true,'More options exposes live price check');
    assert.equal(await page.locator('#upscale-technical-summary').isVisible(),false,'Customer More options must not show provider diagnostics');
    await page.evaluate(()=>{for(const diagnostic of document.querySelectorAll('#upscale-info [data-upscale-owner-only]'))diagnostic.hidden=false;});
    assert.equal(await page.locator('#upscale-technical-summary').isVisible(),true,'Verified owner can inspect provider diagnostics');
    await page.evaluate(()=>{for(const diagnostic of document.querySelectorAll('#upscale-info [data-upscale-owner-only]'))diagnostic.hidden=true;});
    await page.locator('#upscale-info summary').click();
    assert.equal(await page.locator('#upscale-price').isVisible(),false,'More options can collapse');
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
