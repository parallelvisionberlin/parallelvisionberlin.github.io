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
assert.ok(html.includes('lab.js?v=20261010-compact-image-prompt1'));
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
        'const $=id=>document.getElementById(id);const imageComposer=document.getElementById("image-composer");\n'+sizingHelper+
        '\nwindow.__resizePVPrompt=fitImageComposerPrompt;\n'+
        "document.getElementById('image-composer-prompt').addEventListener('input',fitImageComposerPrompt);"});
      const textbox=page.locator('#image-composer-prompt');
      await textbox.fill(lorem);
      assert.equal(await textbox.inputValue(),lorem,kind+': pasted prompt must stay intact');
      await page.evaluate(()=>window.__resizePVPrompt());
      const metrics=await page.evaluate(()=>{
        const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
        const el=document.querySelector('#image-composer-prompt'),tray=document.querySelector('#image-composer-references');
        return{
          dock:rect('#image-composer'),prompt:rect('#image-composer-prompt'),
          generate:rect('#image-composer-generate'),row:rect('.image-composer-toolbar'),
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
      assert.ok(metrics.prompt.height<=178,kind+': editor must never fill the screen');
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
