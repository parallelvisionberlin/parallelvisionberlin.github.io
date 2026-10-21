// Real browser with synthetic authentication and photos; no paid requests.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const start=source.indexOf('try{clerk=await loadLabAccount();'),end=source.indexOf('\n// Soul composer:',start);
assert.ok(start>0&&end>start);
const testSource=source.slice(0,start)+source.slice(end)+`
clerk={session:{getToken:async()=> 'synthetic-token'}};owner=true;userId='test';
config={enabled:true,concurrency:{image:4,video:1}};$('app').hidden=false;$('gate').hidden=true;
await loadHistory();update();finishLabBoot();
if(new URL(location.href).searchParams.has('guest')){owner=false;$('app').hidden=true;$('gate').hidden=false;}
window.__fisheyeTest={moodUI,imageGuidance,referenceLimit,openInspiration:()=>setMoodDiscoveryOpen(true),restoreGuestImageDraft,selection:()=>({...settings(),inspirationMoodId}),refs:()=>references.map(r=>r.file.name)};`;
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+pathname);
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'text/plain');
  res.end(pathname==='/lab/lab.js'?testSource:readFileSync(path));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.PV_CHROMIUM_EXECUTABLE||undefined});
try{
  for(const width of [1440,390]){
    const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    await context.route('https://**/*',async route=>{
      const req=route.request(),url=new URL(req.url());
      if(url.origin!=='https://parallel-vision-lab.parallelvision.workers.dev')return route.abort();
      requests.push({path:url.pathname,method:req.method()});
      const data=url.pathname==='/api/jobs'?{jobs:[],activeJobs:[],concurrency:{image:4,video:1}}:{packs:[],moodboards:[]};
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    });
    await page.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html');
    await page.waitForFunction(()=>!!window.__fisheyeTest);
    await page.evaluate(()=>document.querySelector('#tool-image').click());
    const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=320;c.getContext('2d').fillRect(0,0,320,320);return c.toDataURL().split(',')[1];}),'base64');
    await page.locator('#reference-images').setInputFiles([{name:'my-base.png',mimeType:'image/png',buffer:png}]);
    await page.waitForFunction(()=>document.querySelectorAll('.reference-item').length===1&&!document.querySelector('#prompt').disabled);
    await page.locator('#image-composer-moods').click();
    await page.getByRole('button',{name:'Select Fisheye 2000',exact:true}).click();
    const state=await page.evaluate(()=>({refs:window.__fisheyeTest.refs(),guidance:window.__fisheyeTest.imageGuidance(),limit:window.__fisheyeTest.referenceLimit(),overflow:document.documentElement.scrollWidth>innerWidth}));
    assert.deepEqual(state.refs,['my-base.png']);assert.equal(state.limit,8);assert.equal(state.guidance.error,'');
    assert.match(state.guidance.prompt,/15mm fisheye/);assert.match(state.guidance.prompt,/USER PHOTO FIRST/);assert.ok(state.guidance.prompt.length<5000);
    assert.equal(await page.locator('#ref-count').textContent(),'1 / 8');assert.equal(state.overflow,false);
    await page.evaluate(()=>window.__fisheyeTest.moodUI.clear());
    assert.equal(await page.locator('#ref-count').textContent(),'1 / 10');
    assert.doesNotMatch(await page.evaluate(()=>window.__fisheyeTest.imageGuidance().prompt),/FISHEYE 2000/);
    // The newly requested Inspiration card selects the exact same recipe,
    // preserving custom text, the Base and the two approved hidden references.
    await page.evaluate(()=>{
      const field=document.getElementById('prompt');field.value='Keep my face and my own street.';
      field.dispatchEvent(new Event('input',{bubbles:true}));
      window.__fisheyeTest.openInspiration();
    });
    const inspiration=page.locator('[data-welcome-mood="fisheye-2000"]');
    await inspiration.click();
    assert.equal(await inspiration.getAttribute('aria-pressed'),'true');
    assert.match(await inspiration.locator('img').getAttribute('src'),/01-analog-daylight.webp$/);
    await page.waitForFunction(()=>document.querySelector('[data-welcome-mood="fisheye-2000"] img').naturalWidth>0);
    const look=await page.evaluate(()=>window.__fisheyeTest.imageGuidance());
    const chosen=await page.evaluate(()=>window.__fisheyeTest.selection());
    assert.equal(chosen.moodId,'fisheye-2000');assert.equal(chosen.moodIntensity,75);
    assert.equal(chosen.inspirationMoodId,null);
    assert.match(look.prompt,/Keep my face and my own street/);assert.match(look.prompt,/USER PHOTO FIRST/);
    assert.equal(await page.locator('#prompt').inputValue(),'Keep my face and my own street.');
    assert.deepEqual(await page.evaluate(()=>window.__fisheyeTest.refs()),['my-base.png']);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:'/tmp/fisheye-inspiration-'+width+'.png'});
    // Public sign-in handoff also retains the same 75% recipe and reference plan.
    await page.evaluate(()=>{
      document.getElementById('prompt').value='';
      sessionStorage.setItem('pv-lab-guest-image-draft-v1',JSON.stringify({prompt:'Keep my portrait.',mood:'fisheye-2000',at:Date.now()}));
      window.__fisheyeTest.restoreGuestImageDraft();
    });
    const handoff=await page.evaluate(()=>window.__fisheyeTest.selection());
    assert.equal(handoff.moodId,'fisheye-2000');assert.equal(handoff.moodIntensity,75);
    assert.equal(handoff.inspirationMoodId,null);

    await page.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html?guest=1');
    await page.waitForFunction(()=>!!window.__fisheyeTest);
    const guestCard=page.locator('[data-guest-mood="fisheye-2000"]');
    await guestCard.click();
    assert.equal(await guestCard.getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('#pv-guest-prompt').inputValue(),/15mm fisheye/);
    assert.match(await guestCard.locator('img').getAttribute('src'),/01-analog-daylight.webp$/);
    await page.waitForFunction(()=>document.querySelector('[data-guest-mood="fisheye-2000"] img').naturalWidth>0);
    const draft=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('pv-lab-guest-image-draft-v1')));
    assert.equal(draft.mood,'fisheye-2000');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:'/tmp/fisheye-guest-'+width+'.png'});
    assert.deepEqual(errors,[]);assert.ok(!requests.some(r=>r.method==='POST'),'Selecting a mood never uploads its references or generates in the browser');
    console.log('PASS Fisheye 2000 hidden references and mood switching at '+width+'px');
    await context.close();
  }
}finally{await browser.close();await new Promise(r=>server.close(r));}
