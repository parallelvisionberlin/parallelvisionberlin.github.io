// Real browser, synthetic images and held downloads. No account or paid requests.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {HONG_KONG_FILM_FINISH,FILM_FINISH_OFF,FILM_FINISH_RENDER_REVISION} from '../lab/film-finish.js';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const start=source.indexOf('try{clerk=await loadLabAccount();'),end=source.indexOf('\n// Soul composer:',start);
assert.ok(start>0&&end>start);
const testSource=source.slice(0,start)+source.slice(end)+`
clerk={session:{id:'test-session',getToken:async()=> 'synthetic-token'}};
owner=true;userId='test';await deviceMediaCache.select(userId);config={enabled:true,concurrency:{image:4,video:1}};
$('app').hidden=false;$('gate').hidden=true;
await loadHistory();await restoreStudioEntry();update();finishLabBoot();
window.__filmTest={settings,select:(filmFinish)=>{moodUI.restore({moodId:'hong-kong-nights',moodIntensity:80,...(filmFinish?{filmFinish}:{})});moodUI.open();},close:()=>moodUI.close()};`;
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+pathname);
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'text/plain');
  res.end(pathname==='/lab/lab.js'?testSource:readFileSync(path));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.PV_CHROMIUM_EXECUTABLE||undefined});

try{
  mkdirSync('test-results/film-finish',{recursive:true});
  for(const width of [1440,390]){
    const context=await browser.newContext({viewport:{width,height:950},acceptDownloads:true}),page=await context.newPage();
    const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
    const original=readFileSync('lab/mood-previews/hd/night-flash-20261011.jpg');
    const finished=readFileSync('test-results/film-finish/portrait-default.png');
    let job={id:'film-job',outputId:'original',status:'completed',createdAt:Date.now(),settings:{type:'image',mode:'image',engine:'seedream',prompt:'Portrait',moodOriginalPrompt:'Portrait',moodId:'hong-kong-nights',moodIntensity:80,resolution:'1k',aspectRatio:'auto'}};
    await context.route('https://**/*',async route=>{
      const request=route.request(),u=new URL(request.url());
      if(u.origin!=='https://parallel-vision-lab.parallelvision.workers.dev')return route.abort();
      const send=data=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
      if(request.method()==='POST'){
        writes.push(u.pathname);assert.equal(u.pathname,'/api/jobs/film-job/film-finish','Only pixel processing may be submitted');
        const data=request.postDataJSON();assert.equal(data.outputId,job.outputId);assert.equal(data.settings.version,2);assert.equal(data.settings.grain,85);assert.equal(data.settings.haze,40);assert.equal(data.settings.halation,HONG_KONG_FILM_FINISH.halation);assert.equal(data.settings.film,70);
        job={...job,outputId:'finished',settings:{...job.settings,filmOriginalId:'original',filmFinish:data.settings,filmFinishStatus:'applied',filmFinishRevision:FILM_FINISH_RENDER_REVISION}};return send({job});
      }
      if(u.pathname==='/api/jobs')return send({jobs:[job],activeJobs:[],next:null});
      if(u.pathname.startsWith('/api/assets/')){const done=u.pathname.includes('/finished');return route.fulfill({contentType:done?'image/png':'image/jpeg',body:done?finished:original});}
      return send({folders:[],packs:[],souls:[],moods:[],configured:false});
    });
    await page.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=image');
    try{await page.waitForFunction(()=>!!window.__filmTest,null,{timeout:13000});}
    catch(error){
      const state=await page.evaluate(()=>({ready:document.readyState,boot:document.body.className,
        appHidden:document.getElementById('app')?.hidden,hasHeader:!!document.getElementById('studio-header'),
        moduleScripts:[...document.querySelectorAll('script[type="module"]')].map(x=>x.src).slice(-5)}));
      console.log('FILM_BROWSER_INIT_DIAGNOSTIC',JSON.stringify({width,errors,state}));
      throw error;
    }
    await page.evaluate(()=>window.__filmTest.select());
    const composer=page.locator('#composer-moods .film-finish');await composer.waitFor({state:'visible'});
    assert.deepEqual(HONG_KONG_FILM_FINISH,{version:2,grain:13,haze:100,halation:78,film:100},'New Hong Kong Nights generations use the approved preset');
    for(const [label,key] of [['Grain','grain'],['Haze','haze'],['Halation','halation'],['Film','film']]){
      assert.equal(await composer.getByRole('slider',{name:label+' intensity'}).inputValue(),String(HONG_KONG_FILM_FINISH[key]),label+' should load the approved default');
    }
    await composer.getByRole('slider',{name:'Grain intensity'}).fill('90');
    const settings=await page.evaluate(()=>window.__filmTest.settings());assert.equal(settings.filmFinish.grain,90);assert.equal(settings.moodIntensity,80);
    await page.evaluate(off=>window.__filmTest.select(off),FILM_FINISH_OFF);
    assert.deepEqual((await page.evaluate(()=>window.__filmTest.settings())).filmFinish,FILM_FINISH_OFF,'Explicit all-zero settings survive restore and prompt enrichment');
    for(const label of ['Grain','Haze','Halation','Film'])assert.equal(await composer.getByRole('slider',{name:label+' intensity'}).inputValue(),'0','Manual off remains available');
    assert.equal(await page.locator('#composer-moods').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'Mood controls fit on mobile and desktop');
    await page.screenshot({path:`test-results/film-finish/controls-${width}.png`});
    await page.evaluate(()=>window.__filmTest.close());
    await page.locator('#history .card').first().evaluate(el=>el.click());
    await page.waitForFunction(()=>!document.querySelector('#image-lightbox-download').disabled);
    const finish=page.locator('#image-film-finish');await finish.waitFor({state:'visible'});
    for(const label of ['Grain','Haze','Halation','Film'])assert.equal(await finish.getByRole('slider',{name:label+' intensity'}).inputValue(),'0','Historical results without metadata remain OFF');
    const help=finish.getByRole('button',{name:'About 35mm film finish'});
    await help.click();
    assert.equal(await finish.locator('.film-finish-explanation').isVisible(),true);
    await help.click();
    assert.equal(await finish.locator('.film-finish-explanation').isVisible(),false);
    const columnCount=await finish.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
    assert.equal(columnCount,2,'Grain/Haze and Halation/Film must use a compact two-column deck');
    await finish.getByRole('button',{name:'Apply finish',exact:true}).scrollIntoViewIfNeeded();
    await finish.getByRole('button',{name:'Download original',exact:true}).scrollIntoViewIfNeeded();
    if(width>720){
      const bounds=await page.evaluate(()=>{
        const apply=document.querySelector('#image-film-apply').getBoundingClientRect();
        const original=document.querySelector('#image-film-original').getBoundingClientRect();
        const footer=document.querySelector('#image-lightbox .image-detail-actions').getBoundingClientRect();
        return {applyBottom:apply.bottom,originalBottom:original.bottom,footerTop:footer.top};
      });
      assert.ok(bounds.applyBottom<=bounds.footerTop+2&&bounds.originalBottom<=bounds.footerTop+2,
        'Finishing actions must clear the fixed result toolbar: '+JSON.stringify(bounds));
    }

    await finish.getByRole('slider',{name:'Grain intensity'}).fill('85');await finish.getByRole('slider',{name:'Haze intensity'}).fill('40');await finish.getByRole('slider',{name:'Halation intensity'}).fill(String(HONG_KONG_FILM_FINISH.halation));await finish.getByRole('slider',{name:'Film intensity'}).fill('70');
    await finish.getByRole('button',{name:'Apply finish',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#image-film-finish').textContent.includes('Applied'));
    assert.equal(writes.length,1);assert.equal(await finish.getByRole('slider',{name:'Grain intensity'}).inputValue(),'85');
    assert.equal(await page.locator('#image-lightbox').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
    const download=page.waitForEvent('download');await finish.getByRole('button',{name:'Download original',exact:true}).click();
    assert.match((await download).suggestedFilename(),/original\.jpg$/);
    await finish.scrollIntoViewIfNeeded();await page.screenshot({path:`test-results/film-finish/result-${width}.png`});
    assert.deepEqual(errors,[]);await context.close();
    console.log(JSON.stringify({width,passed:'independent controls, no generation request, saved finish, original download, no overflow'}));
  }
}finally{await browser.close();await new Promise(r=>server.close(r));}
