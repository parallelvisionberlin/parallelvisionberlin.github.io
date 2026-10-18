// Mock-only browser regression: never signs in or calls paid providers.
// The actual Lab HTML/CSS and the exact prompt-height helper are exercised.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

assert.ok(process.env.PV_PLAYWRIGHT_MODULE,'Missing Playwright module.');
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const source=readFileSync('lab/lab.js','utf8');
const css=readFileSync('lab/higgsfield.css','utf8');
const html=readFileSync('lab/studio.html','utf8');
const fnStart=source.indexOf('function fitImageComposerPrompt(){');
const fnEnd=source.indexOf('\nfunction syncImageComposer(){',fnStart);
assert.ok(fnStart>0&&fnEnd>fnStart,'The bounded prompt sizing helper must be present.');
assert.ok(!source.includes("textbox.style.height=Math.max(42,textbox.scrollHeight)+'px'"),'No unlimited prompt auto-height.');
assert.ok(!source.includes("text.style.height=Math.max(42,text.scrollHeight)+'px'"),'No unlimited resize listener.');
assert.match(css,/#image-composer #image-composer-prompt\{[\s\S]*?max-height:min\(176px,25dvh\)/);
assert.match(css,/#image-composer #image-composer-prompt\{[\s\S]*?overflow-x:hidden;overflow-y:auto/);
assert.ok(html.includes('higgsfield.css?v=20261010-compact-image-prompt1'));
const moduleSrc=html.match(/<script\b[^>]*src="([^"\s]*\/lab\.js\?[^"\s]+)"/)?.[1];
assert.ok(moduleSrc,'Image composer loads the Lab module');
const moduleUrl=new URL(moduleSrc.replaceAll('&amp;','&'),'https://lab.test');
assert.match(moduleUrl.searchParams.get('v'),/^\d{8}-[a-z0-9-]+$/,'Lab module has a cache version');
assert.equal(moduleUrl.searchParams.get('wallet'),'1');
const sizingHelper=source.slice(fnStart,fnEnd);

const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[extname(file)]||'text/plain');
  if(['/lab/lab.js','/lab/gallery-layout.js'].includes(pathname)){res.end('export {};');return;}
  res.end(readFileSync(file));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const port=server.address().port,browser=await chromium.launch({headless:true});
mkdirSync('test-results',{recursive:true});
const lorem=Array.from({length:48},(_,i)=>[
  'IMAGE '+(i+1)+' IS THE REFERENCE: preserve fabric texture, the same adult face and pose.',
  'Keep photographic perspective, natural skin, stitching and material details.'
].join(' ')).join('\n\n');
const records=[];
let seedreamGenerateAppearance=null;
try{
  for(const {width,height,kind,refs} of [
    {width:1440,height:900,kind:'seedream',refs:14},
    {width:1100,height:700,kind:'soul',refs:5},
    {width:390,height:844,kind:'mobile',refs:4},
    {width:390,height:600,kind:'short-mobile',refs:4}
  ]){
    const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**/*',route=>route.abort());
    try{
      await page.goto('http://127.0.0.1:'+port+'/lab/studio.html?tool=image',{waitUntil:'domcontentloaded'});
      await page.evaluate(({isSoul,refs})=>{
        document.body.classList.remove('lab-booting');
        document.body.classList.add('lab-ready');
        document.getElementById('app').hidden=false;
        document.getElementById('app').classList.add('image-studio-active');
        document.getElementById('image-studio').hidden=false;
        const composer=document.getElementById('image-composer');
        composer.classList.add(isSoul?'is-pv-soul':'is-seedream');
        const tray=document.getElementById('image-composer-references');tray.hidden=false;
        for(let i=0;i<refs;i++){
          const tile=document.createElement('div');tile.className='composer-reference-tile';
          const img=document.createElement('img');img.alt='Mock photo '+i;
          img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="58" height="62"><rect width="58" height="62" fill="#424448"/></svg>');
          const close=document.createElement('button');close.className='composer-reference-remove';close.type='button';close.textContent='×';
          const marker=document.createElement('span');marker.className='composer-reference-index';marker.textContent='REF '+(i+1);
          tile.append(img,close,marker);tray.append(tile);
        }
      },{isSoul:kind==='soul',refs});
      await page.addScriptTag({content:
        'const $=id=>document.getElementById(id);const imageComposer=document.getElementById("image-composer");function effectiveImagePrompt(){return "";}\n'+sizingHelper+
        '\nwindow.__resizePVPrompt=fitImageComposerPrompt;\n'+
        "document.getElementById('image-composer-prompt').addEventListener('input',fitImageComposerPrompt);"});
      const textbox=page.locator('#image-composer-prompt');
      await textbox.fill(lorem);
      assert.equal(await textbox.inputValue(),lorem,kind+': pasted prompt must stay intact');
      await page.evaluate(()=>window.__resizePVPrompt());
      // Reference-loaded Image expands for long prompts while keeping the
      // photo strip separate from the controls. Soul and mobile are unchanged.
      if(kind==='seedream'){
        await page.waitForFunction(()=>{
          const deck=document.getElementById('image-composer'),field=document.getElementById('image-composer-prompt');
          return deck.classList.contains('pv-editorial-deck')&&
            deck.querySelectorAll('.composer-reference-tile').length===14&&
            field.getBoundingClientRect().height>=150&&field.getBoundingClientRect().height<=178;
        },null,{timeout:2500});
      }else{
        await page.waitForFunction(()=>{
          const h=document.getElementById('image-composer-prompt').getBoundingClientRect().height;
          return h>=(document.getElementById('image-composer').classList.contains('is-pv-soul')?120:innerWidth>900?154:innerWidth<=740?90:110);
        },null,{timeout:2500});
      }
      const metrics=await page.evaluate(()=>{
        const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
        const el=document.querySelector('#image-composer-prompt'),tray=document.querySelector('#image-composer-references');
        return{
          dock:rect('#image-composer'),prompt:rect('#image-composer-prompt'),references:rect('#image-composer-references'),
          generate:rect('#image-composer-generate'),row:rect('.image-composer-toolbar'),controls:rect('.composer-controls'),
          viewport:{width:innerWidth,height:innerHeight},
          textScrollHeight:el.scrollHeight,textClientHeight:el.clientHeight,
          textOverflow:getComputedStyle(el).overflowY,
          textInlineHeight:el.style.height,textComputedHeight:getComputedStyle(el).height,
          textComputedMaxHeight:getComputedStyle(el).maxHeight,
          refHeight:tray.getBoundingClientRect().height,refScrollHeight:tray.scrollHeight,
          refOverflow:getComputedStyle(tray).overflowY,
          refScrollWidth:tray.scrollWidth,refClientWidth:tray.clientWidth,
          refOverflowX:getComputedStyle(tray).overflowX,
          docWidth:document.documentElement.scrollWidth
        };
      });
      // The same rendered Generate control must be used for PV Soul and Seedream.
      // Inspect with the mock button enabled. No provider is called or charged.
      if(kind==='seedream'||kind==='soul'){
        const appearance=await page.locator('#image-composer-generate').evaluate(button=>{
          button.disabled=false;
          const css=getComputedStyle(button),box=button.getBoundingClientRect();
          const label=button.querySelector('.composer-generate-label');
          const icon=button.querySelector('.composer-generate-sparkle');
          return {
            width:Math.round(box.width),height:Math.round(box.height),
            background:css.backgroundImage,color:css.color,radius:css.borderTopLeftRadius,
            weight:css.fontWeight,display:css.display,direction:css.flexDirection,
            iconHidden:getComputedStyle(icon).display==='none',
            labelSize:parseFloat(getComputedStyle(label).fontSize)
          };
        });
        assert.equal(appearance.direction,'column',kind+': Generate action remains centered');
        assert.equal(appearance.iconHidden,true,kind+': decorative symbol is removed');
        assert.ok(appearance.labelSize>=17,kind+': primary Generate label is legible: '+appearance.labelSize);
        if(kind==='seedream')seedreamGenerateAppearance=appearance;
        else assert.deepEqual(appearance,seedreamGenerateAppearance,
          'PV Soul uses the exact Seedream Generate styling and 144×84px button area');
      }
      if(kind==='seedream'){
        const withPhotos=metrics.dock.height;
        await textbox.fill('');
        await page.evaluate(()=>{document.getElementById('image-composer-references').hidden=true;window.__resizePVPrompt();});
        await page.waitForTimeout(275);
        const empty=await page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height);
        assert.ok(empty>=115&&empty<310,
          'Clearing an engaged desktop editor keeps its floating footprint bounded: '+empty);
        assert.ok(withPhotos>empty+40 && withPhotos<440,
          'With references and a long prompt, the editor grows within bounds: '+JSON.stringify({withPhotos,empty}));
        await page.evaluate(()=>{document.getElementById('image-composer-references').hidden=false;window.__resizePVPrompt();});
        await page.waitForTimeout(150);
        const compact=await page.evaluate(()=>{
          const prompt=document.querySelector('#image-composer-prompt').getBoundingClientRect();
          const refs=document.querySelector('#image-composer-references').getBoundingClientRect();
          const controls=document.querySelector('.composer-controls').getBoundingClientRect();
          return {promptHeight:prompt.height,refsBottom:refs.bottom,promptTop:prompt.top,promptBottom:prompt.bottom,controlsTop:controls.top};
        });
        assert.ok(compact.promptHeight>=44&&compact.promptHeight<=62,
          'Empty prompt with attached images stays compact: '+JSON.stringify(compact));
        assert.ok(compact.refsBottom<=compact.promptTop+3&&compact.promptBottom<=compact.controlsTop+3,
          'Compact references, prompt and toolbar occupy separate rows: '+JSON.stringify(compact));
        await textbox.fill(lorem);
        await page.evaluate(()=>window.__resizePVPrompt());
      }
      assert.ok(metrics.prompt.height<=178,kind+': editor must never fill the screen');
      if(kind==='seedream'){
        assert.ok(metrics.prompt.height>=150&&metrics.prompt.height<=178,
          'Long reference-guided prompts use a bounded, expanded writing area: '+metrics.prompt.height);
        assert.ok(metrics.dock.height>235&&metrics.dock.height<440,
          'Reference-first dock grows vertically but stays within the viewport: '+JSON.stringify(metrics));
        assert.ok(metrics.references.bottom<=metrics.prompt.top+3,
          'Photos occupy a separate strip ABOVE the full-width prompt: '+JSON.stringify(metrics));
        assert.ok(metrics.prompt.bottom<=metrics.controls.top+3,
          'Prompt and the lower tool row must not overlap: '+JSON.stringify(metrics));
        assert.ok(metrics.prompt.width>metrics.references.width-7,
          'The prompt uses the full row instead of competing horizontally with photos: '+JSON.stringify(metrics));
        assert.ok(await page.locator('#image-composer-prompt').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))===15.5,
          'Uploaded-photo prompt uses smaller 15.5px Image typography');
        assert.ok(Math.abs(metrics.generate.bottom-metrics.controls.bottom)<=6,
          'Generate remains bottom-aligned with controls after loading references and pasting a long prompt: '+JSON.stringify(metrics));
      }
      if(width<=740)assert.ok(metrics.prompt.height<=124,kind+': mobile prompt stays smaller');
      if(kind==='soul')assert.ok(metrics.prompt.height>=120,
        'Soul reference cards must not flex-shrink a long prompt down to one visible line');
      assert.ok(metrics.textScrollHeight>metrics.textClientHeight+100,kind+': long text scrolls internally');
      assert.equal(metrics.textOverflow,'auto',kind+': text uses an independent scrollbar');
      assert.ok(metrics.dock.height<Math.min(height-60,480),kind+': floating composer remains compact');
      assert.ok(metrics.dock.top>=0&&metrics.dock.bottom<=height+2,kind+': whole composer stays visible');
      assert.ok(metrics.generate.top>=metrics.dock.top&&metrics.generate.bottom<=metrics.dock.bottom+1,
        kind+': Generate remains visible within the dock');
      assert.ok(metrics.row.bottom<=metrics.dock.bottom+1,kind+': toolbar stays visible');
      assert.ok(metrics.refHeight<=100,kind+': thumbnail tray does not become an unbounded grid');
      if(kind==='seedream'){
        assert.equal(metrics.refOverflowX,'auto','Extra references must scroll horizontally, not clip onto a new row');
        assert.ok(metrics.refScrollWidth>metrics.refClientWidth,'Long reference packs must have a usable horizontal scrollbar');
      }
      assert.ok(metrics.docWidth<=width+3,kind+': no horizontal overflow');
      await textbox.evaluate(el=>{el.scrollTop=el.scrollHeight;});
      assert.ok(await textbox.evaluate(el=>el.scrollTop)>0,kind+': last prompt lines are accessible');
      await page.evaluate(()=>{const button=document.querySelector('#image-composer-generate');button.disabled=true;button.textContent='Sending…';});
      const send=await page.locator('#image-composer-generate').boundingBox();
      assert.ok(send&&send.y>=0&&send.y+send.height<=height+2,kind+': Sending state stays visible');
      await page.screenshot({path:'test-results/pv-compact-composer-'+kind+'.png',fullPage:false});
      assert.deepEqual(errors,[],kind+': browser errors');
      records.push({kind,composerHeight:Math.round(metrics.dock.height),promptHeight:Math.round(metrics.prompt.height),
        refHeight:Math.round(metrics.refHeight),generateBottom:Math.round(metrics.generate.bottom),
        inlineHeight:metrics.textInlineHeight,computedHeight:metrics.textComputedHeight,
        maxHeight:metrics.textComputedMaxHeight});
    }finally{await context.close();}
  }
  console.log('PASS compact scrollable pasted prompts and visible Generate:',JSON.stringify(records));
}finally{
  await browser.close();await new Promise(done=>server.close(done));
}
