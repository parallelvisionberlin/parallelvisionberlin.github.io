// Isolated mock-only browser verification for Motion Effects.
// No provider credentials, real uploaded media, account access or paid generation.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const boot=source.indexOf("try{clerk=await loadLabAccount();");
assert.ok(boot>0,'Studio module boot was located');
const testSource=source.slice(0,boot)+source.slice(source.indexOf("\n// Soul composer:",boot))+
  `clerk={isSignedIn:true,user:{id:'effects-test'},session:{id:'mock-effects',getToken:async()=> 'mock-token'},signOut:async()=>{}};owner=true;ownerAccount=false;userId='effects-test';config={enabled:true,higgsfieldEnabled:false,dailyLimitUsd:10,videoEngines:['wan','seedance'],concurrency:{image:4,video:1}};applyConfig(config);$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();update();syncVideoStudioMode();refreshEffectsView();window.__labTest={lock,setOwnerAccess:value=>{ownerAccount=value===true;refreshEffectsView();},tryOpenEffects:()=>openEffectsView({scroll:false})};`;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const path=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');
  res.end(pathname==='/lab/lab.js'?testSource:readFileSync(path));
});
await new Promise(r=>server.listen(4198,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const api='https://parallel-vision-lab.parallelvision.workers.dev';
const still=readFileSync('lab/mood-previews/dream-blur-20261015.jpg');
const demoVideo=readFileSync('lab/visuals/flesh-zero/hero-mobile.mp4');
const assetId='30000000-0000-4000-8000-000000000081';
const imageJob={id:'30000000-0000-4000-8000-000000000080',outputId:assetId,status:'completed',createdAt:Date.now(),
  settings:{type:'image',engine:'seedream',mode:'image',prompt:'Portrait',resolution:'2k',aspectRatio:'1:1',referenceSourceIds:[]}};
try{
  for(const width of [1440,390]){
    const context=await browser.newContext({viewport:{width,height:920}});
    const page=await context.newPage(),errors=[],requests=[];
    page.on('pageerror',error=>errors.push(error.message));
    await context.route('https://**/*',async route=>{
      const req=route.request(),url=new URL(req.url());
      if(url.hostname==='v3b.fal.media')return route.fulfill({status:200,contentType:'video/mp4',headers:{'access-control-allow-origin':'*'},body:demoVideo});
      if(!url.href.startsWith(api)){await route.abort();return;}
      const path=url.pathname,method=req.method();
      requests.push({path,method});
      const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
      if(path==='/api/jobs'&&method==='GET')return send({jobs:[imageJob],next:null,activeJobs:[],concurrency:{image:4,video:1}});
      if(path==='/api/packs')return send({packs:[]});
      if(path==='/api/uploads'&&method==='POST')return send({id:assetId});
      if(path==='/api/reference-uploads'&&method==='POST')return send({id:assetId});
      if(path==='/api/assets/'+assetId||path==='/api/assets/'+assetId+'/thumbnail')
        return route.fulfill({status:200,contentType:'image/jpeg',body:still});
      if(path==='/api/quotes'&&method==='POST'){
        const data=req.postDataJSON();
        assert.equal(data.settings.engine,'seedance');
        assert.equal(data.settings.mode,'start');
        assert.equal(data.sourceId,assetId);
        assert.match(data.settings.prompt,/liquid chrome/i);
        return send({id:'30000000-0000-4000-8000-000000000090',creditCost:73,estimatedUsd:0.21,maxUsd:0.21,
          expiresAt:Date.now()+180000,settings:{...data.settings,model:'bytedance/seedance-2.5/image-to-video',
            referenceSourceIds:[],lastSourceId:null,transferNotes:[]}});
      }
      if(path==='/api/jobs'&&method==='POST')return send({error:'Mock forbids paid generation'},409);
      return send({error:'Unmocked request '+path},404);
    });
    await page.goto('http://127.0.0.1:4198/lab/studio.html?tool=video&effects=1');
    await page.waitForFunction(()=>!!window.__labTest);
    // A signed-in customer has "owner=true" in this legacy client, but not the API owner role.
    assert.equal(await page.locator('#tool-effects').isVisible(),false,'Customer sees no Effects navigation');
    assert.equal(await page.locator('#video-effects-explore').isVisible(),false,'Customer sees no Effects gallery');
    assert.equal(await page.evaluate(()=>new URLSearchParams(location.search).has('effects')),false,'Direct customer URL is cleaned');
    await page.evaluate(()=>{document.querySelector('#tool-effects').click();window.__labTest.tryOpenEffects();});
    assert.equal(await page.locator('#video-effects-explore').isVisible(),false,'Hidden tab and direct JS action cannot open Effects');
    await page.evaluate(()=>window.__labTest.setOwnerAccess(true));
    assert.equal(await page.locator('#tool-effects').isVisible(),true,'Verified owner sees Effects navigation');
    await page.click('#tool-effects');
    assert.equal(await page.locator('.video-effect-card').count(),1);
    assert.equal(await page.locator('#video-effects-explore').isVisible(),true);
    // Effects occupies its own routed page, without any Video deck/history behind it.
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('pv-effects-page')),true);
    assert.equal(await page.title(),'Effects | PV LAB');
    const visibleSiblings=await page.evaluate(()=>
      [...document.querySelector('#app').children]
        .filter(el=>el.id!=='video-effects-explore'&&el.id!=='notice')
        .filter(el=>getComputedStyle(el).display!=='none')
        .map(el=>el.id||el.className||el.tagName)
    );
    assert.deepEqual(visibleSiblings,[],'Every unrelated Studio panel is removed from the Effects layout');
    assert.equal(await page.locator('#app>.workspace').isVisible(),false,'Video workspace is hidden');
    await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
    assert.equal(await page.locator('#app>.workspace').isVisible(),false,'Scrolling cannot reveal the Video workspace');
    await page.evaluate(()=>window.scrollTo(0,0));
    assert.equal(await page.locator('[data-effect="metro-blonde"]').count(),1);
    assert.equal(requests.filter(r=>r.path==='/api/quotes').length,0);
    await page.locator('.video-effect-photo-input').setInputFiles({
      name:'identity.jpg',mimeType:'image/jpeg',buffer:still
    });
    assert.equal(await page.locator('.video-effect-card.has-identity').count(),1);
    await page.click('[data-effect="metro-blonde"] .video-effect-card-activate');
    await page.waitForFunction(()=>document.querySelector('#video-effects-explore')?.hidden===true);
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('pv-effects-page')),false);
    assert.equal(await page.locator('#app>.workspace').isVisible(),true,'Video workspace restored on template selection');
    assert.equal(await page.locator('#video-engine').inputValue(),'seedance');
    assert.equal(await page.locator('#resolution').inputValue(),'720p');
    assert.equal(await page.locator('#audio').isChecked(),false);
    assert.match(await page.locator('#prompt').inputValue(),/Replace the blonde woman/i);
    await page.waitForFunction(()=>document.querySelector('#video-reference-list')?.textContent.includes('METROBLONDE.mp4'));
    assert.equal(await page.locator('#video-effect-active').isVisible(),true);
    assert.equal(requests.filter(r=>r.path==='/api/jobs'&&r.method==='POST').length,0);
    assert.equal(requests.filter(r=>r.path==='/api/quotes'&&r.method==='POST').length,0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow at '+width);
    assert.deepEqual(errors,[],'No client runtime errors at '+width);
    await page.evaluate(()=>window.__labTest.setOwnerAccess(false));
    assert.equal(await page.locator('#tool-effects').isVisible(),false,'Removing owner access hides Effects immediately');
    assert.equal(await page.locator('#video-effect-active').isVisible(),false,'Selected effect is not exposed to customer');
    console.log('PASS owner-only Metro Blonde video + identity Transform handoff at '+width+'px, zero paid submissions');
    await context.close();
  }
}finally{
  await browser.close();
  await new Promise(r=>server.close(r));
}
