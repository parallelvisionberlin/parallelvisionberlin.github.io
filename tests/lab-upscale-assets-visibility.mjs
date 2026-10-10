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
      const tool=document.getElementById('tool-upscale');tool.classList.add('active');tool.setAttribute('aria-pressed','true');
    });
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
    assert.equal(await page.locator('.upscale-assets-shortcut').isVisible(),false,profile+': No Upscale shortcut in other tools');
    const widthCheck=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth}));
    assert.ok(widthCheck.documentWidth<=widthCheck.viewportWidth,profile+': No horizontal overflow');
    assert.deepEqual(errors,[],profile+': Browser errors');
    results.push(profile);
  }finally{await context.close();}
}
await browser.close();await new Promise(ok=>server.close(ok));
console.log('PASS Upscaler shows results; Assets retains them; Image/Video retain History; responsive: '+results.join(', '));
