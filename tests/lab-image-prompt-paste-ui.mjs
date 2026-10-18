// Mock-only browser check: no Clerk login, generation or provider requests.
// Exercises the production Studio styles and the actual prompt sizing/input handlers.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

assert.ok(process.env.PV_PLAYWRIGHT_MODULE,'Playwright module is required');
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const source=readFileSync('lab/lab.js','utf8');
const html=readFileSync('lab/studio.html','utf8');
const sizingStart=source.indexOf('function fitImageComposerPrompt(){');
const sizingEnd=source.indexOf('\nfunction syncImageComposer(){',sizingStart);
assert.ok(sizingStart>0&&sizingEnd>sizingStart);
const handlerStart=source.indexOf("$('image-composer-prompt').addEventListener('input',");
const handlerEnd=source.indexOf('\nfor(const [copy,real]',handlerStart);
assert.ok(handlerStart>0&&handlerEnd>handlerStart);
const sizing=source.slice(sizingStart,sizingEnd);
const handler=source.slice(handlerStart,handlerEnd);
assert.match(handler,/inputType==='insertFromPaste'/);
assert.match(html,/image-composer-stable\.css\?v=\d{8}-[a-z0-9-]+/);
const stable=readFileSync('lab/image-composer-stable.css','utf8');
assert.match(stable,/font-size:15\.5px!important/);
assert.doesNotMatch(stable,/height:54px!important;min-height:54px!important/);
assert.match(stable,/grid-template-rows:minmax\(64px,max-content\) 41px!important/);

const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+p);
  if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[extname(file)]||'text/plain');
  if(p==='/lab/lab.js'||p==='/lab/gallery-layout.js'){res.end('export {};');return;}
  res.end(readFileSync(file));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const port=server.address().port;
const browser=await chromium.launch({headless:true});
const longPrompt=Array.from({length:52},(_,i)=>
  'Frame '+(i+1)+': faithful photographic detail, composition, skin texture, soft lighting and material precision.'
).join('\n');
const checks=[];
try{
  for(const viewport of [{width:1440,height:900},{width:1100,height:700},{width:390,height:844},{width:390,height:600}]){
    const context=await browser.newContext({viewport});
    const page=await context.newPage();
    try{
      await page.route('https://**/*',route=>route.abort());
      await page.goto('http://127.0.0.1:'+port+'/lab/studio.html?tool=image',{waitUntil:'domcontentloaded'});
      await page.evaluate(()=>{
        document.body.classList.remove('lab-booting');
        document.body.classList.add('lab-ready');
        const app=document.getElementById('app');
        app.hidden=false;
        app.classList.add('image-studio-active');
        document.getElementById('image-studio').hidden=false;
        document.getElementById('image-composer').classList.add('is-seedream');
        document.getElementById('image-composer-references').hidden=true;
      });
      await page.addScriptTag({content:
        "const $=id=>document.getElementById(id);const busy=false;const imageComposer=$('image-composer');function effectiveImagePrompt(){return '';}" +
        sizing+'\n'+handler+
        "\n$('prompt').addEventListener('input',fitImageComposerPrompt);fitImageComposerPrompt();"
      });
      const editor=page.locator('#image-composer-prompt');
      const empty=await page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height);
      await editor.evaluate((el,text)=>{
        el.focus({preventScroll:true});
        document.getElementById('image-composer').classList.add('pv-deck-expanded');
        el.value=text;
        el.setSelectionRange(text.length,text.length);
        el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste',data:text}));
      },longPrompt);
      // Wait for the actual deck height transition before sampling the completed layout.
      await page.waitForFunction(()=>{
        const h=document.getElementById('image-composer-prompt').getBoundingClientRect().height;
        return h>=(innerWidth>899?150:95);
      },null,{timeout:2500});
      const result=await page.evaluate(()=>{
        const rect=selector=>{
          const r=document.querySelector(selector).getBoundingClientRect();
          return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};
        };
        const editor=document.getElementById('image-composer-prompt');
        return {
          composer:rect('#image-composer'),field:rect('#image-composer-prompt'),
          generate:rect('#image-composer-generate'),controls:rect('.composer-controls'),
          viewport:{w:innerWidth,h:innerHeight},
          scrollTop:editor.scrollTop,scrollMax:editor.scrollHeight-editor.clientHeight,
          overflow:getComputedStyle(editor).overflowY,
          value:editor.value,fontSize:parseFloat(getComputedStyle(editor).fontSize),docWidth:document.documentElement.scrollWidth
        };
      });
      assert.equal(result.value,longPrompt,'Pasted text is preserved');
      if(viewport.width>=741)assert.equal(result.fontSize,15.5,'Desktop Image prompt is reduced to 15.5px');
      else assert.ok(result.fontSize<15.5,'Mobile font remains unchanged');
      assert.equal(result.overflow,'auto','Long prompt scrolls in its own field');
      assert.ok(result.scrollMax>140,'The input must contain hidden text beyond the visible area');
      assert.ok(result.scrollTop>=result.scrollMax-3,'Pasting at end shows the final lines');
      assert.ok(result.field.height>= (viewport.width>899?150:95),'Prompt expands beyond one strip: '+JSON.stringify(result));
      assert.ok(result.field.height<= (viewport.width>899?178:124),'Prompt remains bounded');
      assert.ok(result.composer.height>empty+(viewport.width>899?70:40),'Composer grows only when needed');
      assert.ok(result.composer.height<Math.min(viewport.height-40,410),'Composer cannot cover the gallery');
      assert.ok(result.composer.top>=0&&result.composer.bottom<=viewport.height+2,'Composer stays in view');
      assert.ok(result.generate.top>=result.composer.top&&result.generate.bottom<=result.composer.bottom+1,'Generate stays in the dock');
      assert.ok(result.controls.bottom<=result.composer.bottom+1,'Toolbar stays in the dock');
      assert.ok(result.docWidth<=viewport.width+3,'No horizontal overflow');
      // Pasting within the prompt must not force the reader back down to the end.
      await editor.evaluate(el=>{
        el.scrollTop=0;
        el.setSelectionRange(25,25);
        el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste',data:'X'}));
      });
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.ok((await editor.evaluate(el=>el.scrollTop))<10,'Editing earlier lines keeps existing scroll');
      await editor.fill('');
      if(viewport.width<=899)await editor.blur();
      await page.waitForTimeout(275);
      const cleared=await page.locator('#image-composer').evaluate(el=>el.getBoundingClientRect().height);
      if(viewport.width>899){
        assert.equal(await page.locator('#image-composer').evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
          'Desktop editor stays in its engaged state after clearing text');
        assert.ok(cleared>=120&&cleared<310,
          'The open desktop editor remains bounded: '+JSON.stringify({cleared,empty}));
      }else assert.ok(cleared>=90&&cleared<Math.min(viewport.height-40,350),
        'Mobile Image composer remains bounded after blur: '+JSON.stringify({cleared,empty}));
      checks.push({viewport,promptHeight:Math.round(result.field.height),dockHeight:Math.round(result.composer.height),scrollMax:result.scrollMax});
    }finally{await context.close();}
  }
  console.log('PASS image prompt paste expansion, scroll, Generate/toolbar stability: '+JSON.stringify(checks));
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
