// Mock-only browser checks. No customer accounts or paid AI calls.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const start=source.indexOf('try{clerk=await loadLabAccount();');
const end=source.indexOf('\n// Soul composer:',start);
assert.ok(start>0&&end>start);
const testSource=source.slice(0,start)+source.slice(end)+`
clerk={isSignedIn:true,user:{id:'hk-test'},session:{id:'hk-test-session',getToken:async()=> 'synthetic-token'}};
owner=true;userId='hk-test';await deviceMediaCache.select(userId);
config={enabled:true,geminiEnabled:true,concurrency:{image:4,video:1}};
$('app').hidden=false;$('gate').hidden=true;
await loadHistory();await restoreStudioEntry();update();finishLabBoot();
window.__hkTest={
  select:()=>{moodUI.restore({moodId:'hong-kong-nights',moodIntensity:60},true);moodUI.open();},
  active:()=>moodUI.selected(),variant:()=>moodUI.variant(),
  settings:()=>settings(),enrich:()=>moodUI.enrich('One person with existing natural lighting.',{engine:'seedream',referenceCount:1,referenceMode:'base'}),
  close:()=>moodUI.close()
};`;
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+pathname);
 if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg'})[extname(path)]||'application/octet-stream');
 res.end(pathname==='/lab/lab.js'?testSource:readFileSync(path));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
 mkdirSync('test-results/hk-variations',{recursive:true});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:950}}),page=await context.newPage();
  const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://**/*',route=>{
    const u=new URL(route.request().url());
    if(u.origin!=='https://parallel-vision-lab.parallelvision.workers.dev')return route.abort();
    if(route.request().method()!=='GET')writes.push(u.pathname);
    const data=u.pathname==='/api/jobs'?{jobs:[],activeJobs:[],next:null}:
      u.pathname==='/api/packs'?{packs:[]}:
      u.pathname==='/api/soul-pro/identity'?{configured:false,count:0,refs:[]}:
      {packs:[],moods:[],folders:[],souls:[],configured:false};
    return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=image');
  await page.waitForFunction(()=>!!window.__hkTest,{timeout:30000});
  await page.evaluate(()=>window.__hkTest.select());
  const bar=page.locator('#composer-moods .hk-variation-bar');await bar.waitFor({state:'visible'});
  const choices=bar.locator('.hk-variation-choice');assert.equal(await choices.count(),3);
  assert.deepEqual(await choices.allInnerTexts(),['Original','Deep Green','Slow Shutter']);
  const order=['original','deep-green','slow-shutter'],features=[];
  for(const [i,id] of order.entries()){
    await choices.nth(i).click();
    const snapshot=await page.evaluate(()=>({
      id:window.__hkTest.variant(),data:window.__hkTest.enrich(),
      settings:window.__hkTest.settings(),selected:[...document.querySelectorAll('.hk-variation-choice')].map(x=>x.getAttribute('aria-pressed')),
      viewport:{panel:document.querySelector('#composer-moods').getBoundingClientRect().toJSON(),window:innerWidth}
    }));
    assert.equal(snapshot.id,id);
    assert.equal(snapshot.data.metadata.moodVariant,id);
    assert.equal(snapshot.settings.moodVariant,id);
    assert.equal(snapshot.settings.moodIntensity,60);
    assert.equal(snapshot.data.error,'');
    assert.equal(snapshot.selected.filter(x=>x==='true').length,1);
    assert.equal(snapshot.selected[i],'true');
    assert.ok(snapshot.viewport.panel.right<=width+3&&snapshot.viewport.panel.left>=-3,'Panel visible '+width);
    features.push(snapshot.data.prompt);
  }
  assert.equal(new Set(features).size,3);
  const overflow=await page.locator('#composer-moods').evaluate(el=>el.scrollWidth>el.clientWidth+2);
  assert.equal(overflow,false,'No hidden horizontal overflow at '+width);
  assert.deepEqual(errors,[],'No JavaScript errors at '+width);
  assert.deepEqual(writes,[],'No paid mutation at '+width);
  await page.screenshot({path:'test-results/hk-variations/panel-'+width+'.png'});
  console.log('PASS Hong Kong Nights real-photography selector '+width+'px');
  await context.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
