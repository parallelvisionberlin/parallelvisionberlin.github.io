// Mock-only Generate appearance regression. No Lab API, sign-in or generation.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

assert.ok(process.env.PV_PLAYWRIGHT_MODULE,'PV_PLAYWRIGHT_MODULE is required');
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const html=readFileSync('lab/studio.html','utf8');
assert.match(html,/studio-finish-v2\.css\?v=20261016-hide-empty-generate1/,'Studio must reload the updated stylesheet');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[extname(file)]||'text/plain');
  // Color checks don't boot auth or call the real backend.
  res.end(extname(file)==='.js'?'export {};':readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
function rgb(value){return value.match(/\d+/g)?.slice(0,3).map(Number)||[]}
try{
  for(const {width,height,model} of [
    {width:1440,height:900,model:'seedream'},
    {width:390,height:844,model:'seedream'},
    {width:1440,height:900,model:'soul'}
  ]){
    const context=await browser.newContext({viewport:{width,height}});
    const page=await context.newPage();
    await page.route('https://**/*',route=>route.abort());
    try{
      await page.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=image',{waitUntil:'load'});
      const css=await page.evaluate(model=>{
        document.documentElement.classList.remove('pv-studio-boot-lock');
        document.body.classList.remove('lab-booting');
        document.body.classList.add('lab-ready');
        const app=document.getElementById('app');
        app.hidden=false;app.classList.add('image-studio-active');
        document.getElementById('image-studio').hidden=false;
        const composer=document.getElementById('image-composer');
        composer.hidden=false;
        composer.classList.toggle('is-pv-soul',model==='soul');
        const button=document.getElementById('image-composer-generate');
        button.disabled=true;
        const initiallyEmpty=getComputedStyle(button);
        const empty={visibility:initiallyEmpty.visibility,
          width:button.getBoundingClientRect().width,height:button.getBoundingClientRect().height};
        const prompt=document.getElementById('image-composer-prompt');
        prompt.value='A photographic image.';
        const blockedWithPrompt=getComputedStyle(button).visibility;
        prompt.value='';
        const photo=document.createElement('div');photo.className='composer-reference-tile';
        document.getElementById('image-composer-references').append(photo);
        const blockedWithPhoto=getComputedStyle(button).visibility;
        photo.remove();
        prompt.value='A photographic image.';
        const disabled=getComputedStyle(button);
        const off={background:disabled.backgroundColor,image:disabled.backgroundImage,color:disabled.color,
          width:button.getBoundingClientRect().width,height:button.getBoundingClientRect().height};
        button.disabled=false;
        const active=getComputedStyle(button);
        const on={background:active.backgroundColor,image:active.backgroundImage,
          width:button.getBoundingClientRect().width,height:button.getBoundingClientRect().height};
        return {empty,blockedWithPrompt,blockedWithPhoto,off,on};
      },model);
      assert.equal(css.empty.visibility,model==='soul'?'visible':'hidden',
        model+' '+width+': empty Image Generate has no ghost tile');
      assert.equal(css.blockedWithPrompt,'visible',model+' '+width+': blocked Generate remains visible with text');
      assert.equal(css.blockedWithPhoto,'visible',model+' '+width+': blocked Generate remains visible with photo');
      assert.equal(css.empty.width,css.off.width,model+' '+width+': Generate space remains stable');
      assert.equal(css.empty.height,css.off.height,model+' '+width+': Generate height remains stable');
      assert.ok(rgb(css.off.background).length===3&&rgb(css.off.background).every(c=>c<85),
        model+' '+width+': disabled Generate must be dark graphite: '+css.off.background);
      assert.ok(rgb(css.off.color).length===3&&rgb(css.off.color).every(c=>c>125),
        model+' '+width+': disabled Generate label must remain legible: '+css.off.color);
      assert.equal(css.off.image,'none',model+' '+width+': disabled background has no bright gradient');
      assert.match(css.on.image,/linear-gradient/,model+' '+width+': enabled Generate regains pearl finish');
      assert.equal(css.off.width,css.on.width,model+' '+width+': no width jump between states');
      assert.equal(css.off.height,css.on.height,model+' '+width+': no height jump between states');
      console.log('PASS '+model+' '+width+' empty hidden / blocked visible / pearl enabled');
    }finally{await context.close()}
  }
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
console.log('LAB_GENERATE_DISABLED_APPEARANCE_OK=1');
