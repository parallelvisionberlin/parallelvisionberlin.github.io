// Layout-only fixtures: no login, paid generation or provider requests.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const source=readFileSync('lab/lab.js','utf8');
const sizing=source.slice(source.indexOf('function fitImageComposerPrompt(){'),source.indexOf('\nfunction syncImageComposer(){'));
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

mkdirSync('test-results',{recursive:true});
const checks=[];
try {
  for (const viewport of [{width:1920,height:1080},{width:1440,height:900},{width:1100,height:700},{width:390,height:844},{width:320,height:640}]) {
    const page=await browser.newPage({viewport});
    await page.route('https://**/*',route=>route.abort());
    await page.goto('http://127.0.0.1:'+port+'/lab/studio.html?tool=image');
    await page.evaluate(()=>{
      document.body.classList.remove('lab-booting');document.body.classList.add('lab-ready');
      document.getElementById('gate').hidden=true;
      const app=document.getElementById('app');app.hidden=false;app.classList.add('image-studio-active');
      document.getElementById('image-studio').hidden=false;document.getElementById('image-gallery-empty').hidden=true;
      document.getElementById('image-composer-references').hidden=true;
      document.getElementById('composer-character').hidden=true;
      document.getElementById('image-composer').classList.add('is-seedream');
    });
    await page.addScriptTag({content:"const $=id=>document.getElementById(id);const imageComposer=$('image-composer');"+sizing});
    const geometry=()=>page.evaluate(()=>{
      const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
      return {deck:rect('image-composer'),generate:rect('image-composer-generate'),prompt:rect('image-composer-prompt'),character:rect('composer-character'),controls:document.querySelector('.composer-controls').getBoundingClientRect().toJSON(),radius:getComputedStyle(document.getElementById('image-composer')).borderRadius,overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    const standard=await geometry();
    await page.evaluate(()=>{
      const deck=document.getElementById('image-composer');deck.classList.remove('is-seedream');deck.classList.add('is-pv-soul');
      document.getElementById('composer-character').hidden=false;document.getElementById('composer-character-name').textContent='NO SOUL ID';
      document.getElementById('hf-bar-source').hidden=false;
      document.querySelectorAll('.hf-bar-control').forEach(el=>el.hidden=false);
      document.getElementById('image-composer-model-label').textContent='PV Soul';
      for(const id of ['image-composer-ratio','image-composer-resolution','image-composer-count'])document.getElementById(id).parentElement.hidden=true;
      document.getElementById('composer-exact-prompt-option').hidden=true;document.getElementById('composer-more-anchor').hidden=true;
      document.getElementById('composer-reference-intent-toggle').hidden=true;
      fitImageComposerPrompt();
    });
    for(const attached of [false,true]) {
      await page.evaluate(attached=>{
        const deck=document.getElementById('image-composer');deck.classList.toggle('has-soul-source',attached);
        document.getElementById('hf-bar-source').hidden=attached;
        const tray=document.getElementById('image-composer-references');tray.hidden=!attached;
        tray.innerHTML=attached?'<div class="composer-reference-tile">Photo</div>':'';
        fitImageComposerPrompt();
      },attached);
      for(const long of [false,true]) {
        await page.locator('#image-composer-prompt').evaluate((el,long)=>{el.value=long?'A photographic direction with texture, framing and light. '.repeat(100):'';el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));fitImageComposerPrompt()},long);
        if(long)await page.waitForFunction(()=>document.getElementById('image-composer-prompt').getBoundingClientRect().height>=(innerWidth>=900?150:95));
        else await page.waitForFunction(()=>document.getElementById('image-composer-prompt').getBoundingClientRect().height<=65);
        const g=await geometry();
        assert.equal(g.overflow,false,'No horizontal overflow '+JSON.stringify({viewport,attached,long,g}));
        assert.ok(g.deck.y>=0&&g.deck.bottom<=viewport.height+2,'Dock remains in viewport');
        for(const box of [g.generate,g.character,g.prompt,g.controls])assert.ok(box.x>=g.deck.x&&box.right<=g.deck.right+1&&box.bottom<=g.deck.bottom+1,'All controls remain in deck '+JSON.stringify({viewport,attached,long,g}));
        assert.ok(g.controls.right<=g.character.x+1||g.controls.bottom<=g.character.y+1,'Soul ID never overlaps toolbar');
        if(viewport.width>=1160&&!attached&&!long){assert.equal(g.deck.height,standard.deck.height,'Same compact shell height');assert.equal(g.generate.height,standard.generate.height,'Same Generate height');assert.equal(g.deck.y,standard.deck.y,'Same baseline');assert.equal(g.radius,standard.radius,'Same corners');}
        checks.push({viewport,attached,long,height:g.deck.height});
        if(attached&&!long&&[1440,390].includes(viewport.width))await page.screenshot({path:'test-results/lab-soul-deck-'+viewport.width+'.png'});
      }
    }
    await page.close();
  }
  console.log('PASS Soul deck parity: '+JSON.stringify(checks));
} finally {await browser.close();server.close();}
