// Navigation regression: public routes must not show Image, and signed-in
// Video/Upscaler links must not fall back to Image during studio restoration.
// All accounts and API requests are synthetic. No generation or checkout.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf('try{clerk=await loadLabAccount();');
const end=source.indexOf('\n// Soul composer:',boot);
assert.ok(boot>0&&end>boot);
const injected=source.slice(0,boot)+source.slice(end)+[
 "clerk={isSignedIn:true,user:{id:'synthetic-routing'},session:{id:'routing-test',getToken:async()=> 'synthetic-token'}};",
 "$('app').hidden=true;$('gate').hidden=false;finishLabBoot();",
 "window.__routingTest={",
 "  authorize:async()=>{",
 "    const requested=studioRoute();",
 "    owner=true;customerMode=true;userId='synthetic-routing';$('app').removeAttribute('data-guest-preview');",
 "    config={enabled:true,customer:true,videoEngines:['seedance','wan'],falEnabled:false};",
 "    $('gate').hidden=true;$('app').hidden=false;",
 "    await restoreStudioEntry(requested);",
 "    finishLabBoot();return requested;",
 "  },",
 "  fallback:()=>{",
 "    imageEngine='fal';$('image-engine').value='fal';",
 "    applyConfig({customer:true,enabled:true,videoEngines:['seedance','wan'],falEnabled:false});",
 "  },",
 "  state:()=>({tool,route:studioRoute(),video:$('app').classList.contains('video-studio-active'),upscale:$('app').classList.contains('upscale-studio-active'),image:$('app').classList.contains('image-studio-active')})",
 "};"
].join('\n');
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+pathname);
 if(!path.startsWith(root+sep)||!existsSync(path)||!statSync(path).isFile()){
   res.writeHead(404).end();return;
 }
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream');
 res.end(pathname==='/lab/lab.js'?injected:readFileSync(path));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const port=server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.PV_CHROMIUM_EXECUTABLE||undefined});
try{
 for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:880}});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('https://**/*',route=>route.abort());
   // The public landing page routes are direct links; guest navigation tabs
   // may be intentionally condensed. Test the actual entry URLs instead.
   const guestRoutes=[
     ['image','Start with a feeling.'],['video','Video Studio'],
     ['retouch','Retouch'],['fashion','Fashion Studio'],['upscale','Upscaler']
   ];
   for(const [route,heading] of guestRoutes){
     await page.goto('http://127.0.0.1:'+port+'/lab/studio.html?tool='+route);
     await page.waitForFunction(expected=>document.querySelector('#gate')?.dataset.guestTool===expected&&!!window.__routingTest,route);
     assert.equal(await page.locator('#pv-guest-title').textContent(),heading);
     assert.equal(new URL(page.url()).searchParams.get('tool'),route);
     assert.equal(await page.locator('#pv-guest-composer').isVisible(),route==='image');
     assert.equal(await page.locator('#pv-guest-selected-tool').isVisible(),false);
     assert.equal(await page.locator('#app').isVisible(),route!=='image');
   }
   // After the guest selects Upscaler, sign-in restores exactly that route.
   await page.evaluate(()=>window.__routingTest.authorize());
   let state=await page.evaluate(()=>window.__routingTest.state());
   assert.deepEqual([state.route,state.tool,state.upscale],['upscale','upscale',true]);
   // Previously, reconciling an unavailable Image engine changed routes.
   await page.evaluate(()=>window.__routingTest.fallback());
   state=await page.evaluate(()=>window.__routingTest.state());
   assert.deepEqual([state.route,state.tool,state.upscale],['upscale','upscale',true]);
   for(const [route,active] of [['video','video'],['image','image'],['upscale','upscale']]){
     await page.locator('#tool-'+route).click();
     state=await page.evaluate(()=>window.__routingTest.state());
     assert.equal(state.route,route);
     assert.equal(state.tool,route);
     assert.equal(state[active],true);
   }
   // Retouch Studio in the shared menu uses the existing in-page tool handler.
    await page.locator('.pv-studios-trigger').click();
    assert.match(await page.locator('.pv-studios-retouch-link').getAttribute('href'),/tool=retouch$/);
    await page.locator('.pv-studios-retouch-link').click();
    await page.waitForFunction(()=>window.__routingTest.state().tool==='retouch');
    state=await page.evaluate(()=>window.__routingTest.state());
    assert.deepEqual([state.route,state.tool],['retouch','retouch']);
    assert.equal(await page.locator('.pv-studios-panel').isVisible(),false);
    assert.deepEqual(errors,[],'No JS crashes during guest and signed-in route changes');
   console.log('PASS PV LAB tool routing at '+width+'px: guests, login, config fallback, tabs');
   await context.close();
 }
}finally{
 await browser.close();
 server.close();
}
