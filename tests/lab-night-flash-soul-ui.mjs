// Production Studio/controller, synthetic sessions and mocked provider boundaries.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {soul2Parameters,SOUL2_TEXT_MODEL} from '../lab-worker/higgsfield.mjs';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const start=source.indexOf('try{clerk=await loadLabAccount();'),end=source.indexOf('\n',start);
assert.ok(start>=0&&end>start);
const mock=source.slice(0,start)+source.slice(end+1)+`
clerk={isSignedIn:true,user:{id:'night-flash-mock'},session:{id:'night-flash-session',getToken:async()=> 'synthetic-token'}};
owner=true;ownerAccount=new URL(location.href).searchParams.get('mockRole')!=='customer';customerMode=!ownerAccount;
customerGenerationReady=true;customerBillingReady=true;customerCreditBalance=1000;userId='night-flash-mock';
wallet.connect({customer:customerMode,balanceCredits:1000,billingReady:true,products:[]});
applyConfig({enabled:true,configured:true,geminiEnabled:true,falEnabled:true,higgsfieldEnabled:true,concurrency:{image:4,video:1}});
$('app').hidden=false;$('gate').hidden=true;setTool('image');await loadHistory();finishLabBoot();update();
window.__nightFlashRead=()=>({settings:settings(),source:!!file,mood:moodUI.selected(),pending:imageSubmissionPending});
window.__nightFlashGate=value=>applyConfig({soulNightFlashEnabled:value});
window.__nightFlashReuse=job=>restore(job);
window.__nightFlashChoosePro=model=>{soulProModel=model;$('soul-pro-model').value=model;$('image-engine').value='soulpro';$('image-engine').dispatchEvent(new Event('change',{bubbles:true}));updateSoulProModelUi();update();};
window.__nightFlashReady=true;
`;
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep)||!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[extname(file)]||'text/plain');res.end(pathname==='/lab/lab.js'?mock:readFileSync(file));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PV_CHROMIUM_EXECUTABLE||undefined});mkdirSync('test-results',{recursive:true});
try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}])for(const role of ['owner','customer']){
    const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage();
    const errors=[],quotes=new Map(),jobs=new Map(),requests=[];let generated=0,seq=1,failQuote=false;
    const id=()=> '30000000-0000-4000-8000-'+String(seq++).padStart(12,'0');
    const characterId=id(),pendingId=id(),portraitId=id();
    page.on('pageerror',e=>errors.push(e.message));
    await context.route('https://**/*',async route=>{
      const req=route.request(),url=new URL(req.url());
      if(url.origin!=='https://parallel-vision-lab.parallelvision.workers.dev')return route.abort();
      const path=url.pathname,data=req.headers()['content-type']?.includes('application/json')?req.postDataJSON():{};
      requests.push({path,method:req.method(),data});
      const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
      if(path==='/api/jobs'&&req.method()==='GET')return send({jobs:[],activeJobs:[],next:null,concurrency:{image:4,video:1}});
      if(path==='/api/packs')return send({packs:[]});
      if(path==='/api/moodboards')return send({moodboards:[]});
      if(path==='/api/soul-pro/identity')return send({configured:false,count:0,refs:[]});
      if(path==='/api/higgsfield/characters')return send({characters:[{id:characterId,name:'Fixture identity',state:'completed',portraitAssetId:portraitId},{id:pendingId,name:'Still training',state:'queued',portraitAssetId:portraitId}]});
      if(path.startsWith('/api/assets/'))return route.fulfill({contentType:'image/jpeg',body:readFileSync('lab/mood-previews/hd/night-flash-20261011.jpg')});
      if(path==='/api/uploads')return send({id:id()},201);
      if(path==='/api/higgsfield/quote'){
        if(failQuote)return send({error:'Fixture provider estimate unavailable'},503);
        if(role==='owner')await new Promise(done=>setTimeout(done,100));
        const p=soul2Parameters(data.settings,(status,message)=>{throw new Error(message);},{hasBase:!!data.sourceId});
        if(!data.sourceId){p.model=SOUL2_TEXT_MODEL;p.mode='image';}
        if(p.aspectRatio==='source')p.aspectRatio='3:4';
        const q={id:id(),provider:'Higgsfield',sourceId:data.sourceId||null,settings:p,estimatedUsd:.0057,maxUsd:.0057,creditCost:7,expiresAt:Date.now()+300000};
        quotes.set(q.id,q);return send(q);
      }
      if(path==='/api/higgsfield/generate'){
        assert.equal(data.confirm,true);assert.ok(quotes.has(data.quoteId));generated++;
        const q=quotes.get(data.quoteId),job={id:id(),status:'queued',settings:q.settings,sourceId:q.sourceId,createdAt:Date.now(),estimatedUsd:.0057};jobs.set(job.id,job);return send({job},202);
      }
      if(path.startsWith('/api/jobs/'))return send({job:jobs.get(path.split('/')[3])});
      return send({error:'Unmocked '+path},404);
    });
    try{
      await page.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=image&mockRole='+role);
      await page.waitForFunction(()=>window.__nightFlashReady===true);
      const shell=()=>page.locator('#image-composer').evaluate(el=>{
        const b=el.querySelector('#image-composer-generate').getBoundingClientRect(),d=el.getBoundingClientRect();
        return {width:d.width,height:d.height,buttonWidth:b.width,buttonHeight:b.height,buttonBottom:b.bottom,radius:getComputedStyle(el).borderRadius};
      });
      const normal=await shell();
      if(role==='owner'){
        await page.evaluate(()=>window.__nightFlashChoosePro('kontextmax'));
        const pro=await shell();
        for(const key of ['width','buttonWidth','buttonHeight','buttonBottom','radius'])assert.equal(pro[key],normal[key],'Soul Pro keeps normal '+key);
        assert.equal(await page.locator('#composer-generation-block').isVisible(),false,'Missing Pro setup stays in accessible help, not a new deck row');
        assert.equal(await page.locator('.composer-controls > #composer-character').count(),1,'Pro identity uses the shared toolbar');
        await page.evaluate(()=>window.__nightFlashChoosePro('soul2'));
      }
      await page.locator('#image-composer-model').click();
      await page.locator('.composer-model-option[data-value="soulpro"]').click();
      assert.equal(await page.locator('#image-composer-generate').isEnabled(),false,'Empty Soul needs a prompt or Base, not a mandatory Soul ID');
      assert.match(await page.locator('#image-composer-generate').getAttribute('title'),/Add a Base image or describe/);
      assert.equal(await page.locator('#composer-generation-block').isVisible(),false,'Missing-input help does not add a row to the deck');
      await page.locator('#image-composer-prompt').fill('A woman arriving at a club.');
      assert.equal(await page.locator('#image-composer-generate').isEnabled(),true,'Text alone enables Soul with no Soul ID selected');
      await page.locator('#image-composer-moods').click();
      await page.getByRole('button',{name:'Select Night Flash',exact:true}).click();
      await page.locator('#composer-moods-intensity').press('End');
      await page.locator('#composer-moods-done').click();
      let state=await page.evaluate(()=>window.__nightFlashRead());
      assert.equal(state.settings.provider,'higgsfield');assert.equal(state.settings.moodId,'night-flash');
      assert.equal(state.settings.moodIntensity,100);assert.equal(state.settings.moodOriginalPrompt,'A woman arriving at a club.');
      assert.match(state.settings.prompt,/subject and setting described by the user/);
      assert.equal(generated,0,'Selecting a Mood never generates');
      const palettes=await page.evaluate(()=>{
        const deck=document.getElementById('image-composer'),mood=document.getElementById('image-composer-moods'),clear=document.getElementById('image-composer-moods-clear');
        const s=getComputedStyle(mood);
        return {soul:{color:s.color,clear:getComputedStyle(clear).color},legacyLayout:deck.classList.contains('is-pv-soul'),identityInToolbar:deck.querySelector('.composer-controls').contains(document.getElementById('composer-character'))};
      });
      assert.equal(palettes.legacyLayout,false,'Soul uses the normal web deck');
      assert.equal(palettes.identityInToolbar,true,'Identity stays in the normal toolbar');
      assert.equal(palettes.soul.color,'rgb(220, 255, 0)','Mood text remains legible on the dark control');
      assert.equal(palettes.soul.clear,palettes.soul.color,'Clear action remains legible too');

      if(role==='customer'){
        assert.equal(await page.locator('#image-composer-generate').isEnabled(),false,'Night Flash customer gate defaults closed');
        assert.equal(requests.filter(r=>r.path==='/api/higgsfield/quote'&&r.data.settings?.moodId==='night-flash').length,0,'Closed gate does not request a Mood quote');
        await page.evaluate(()=>window.__nightFlashGate(true)); // Fixture-only future launch state.
      }
      await page.locator('#image-composer-moods').click();
      await page.getByRole('button',{name:'Select Dreamcore',exact:true}).click();
      assert.equal(await page.locator('#image-composer-generate').isEnabled(),false,'Unsupported Soul Mood blocks generation');
      await page.getByRole('button',{name:'Select Night Flash',exact:true}).click();
      await page.locator('#composer-moods-done').click();
      const sourceChooser=page.waitForEvent('filechooser');
      await page.locator('#image-composer-add').click();
      await (await sourceChooser).setFiles(resolve('lab/mood-previews/hd/night-flash-20261011.jpg'));
      await page.waitForFunction(()=>window.__nightFlashRead().source===true);
      await page.locator('#image-composer-moods').click();
      const finishCard=page.getByRole('button',{name:'Select Night Flash · Photo Finish',exact:true});
      assert.equal(await finishCard.isVisible(),role==='owner');
      if(role==='owner'){
        const beforeRequests=requests.length;
        await finishCard.click();
        const finishDialog=page.locator('#owner-photo-finish-dialog');
        const finishImage=finishDialog.locator('img');
        await page.waitForFunction(()=>document.querySelector('#owner-photo-finish-image').naturalWidth>0);
        const original=await finishImage.evaluate(img=>[img.src,img.naturalWidth,img.naturalHeight]);
        await finishDialog.getByRole('button',{name:'Apply finish'}).click();
        await finishDialog.getByRole('link',{name:'Download'}).waitFor();
        await page.waitForFunction(src=>{
          const image=document.querySelector('#owner-photo-finish-image');
          return image.src!==src&&image.complete&&image.naturalWidth>0;
        },original[0]);
        const result=await finishImage.evaluate(img=>[img.naturalWidth,img.naturalHeight]);
        assert.deepEqual(result,original.slice(1),'Photo Finish preserves original dimensions');
        assert.equal(await finishDialog.evaluate(el=>el.getBoundingClientRect().width<innerWidth),true);
        await finishDialog.getByRole('button',{name:'View original'}).click();
        assert.equal(await finishImage.getAttribute('src'),original[0]);
        await finishDialog.getByRole('button',{name:'Close',exact:true}).click();
        assert.equal(await finishDialog.isVisible(),false);
        assert.equal(requests.slice(beforeRequests).some(r=>r.method==='POST'),false,'No upload, quote or generation');
        assert.equal(await page.evaluate(()=>window.__nightFlashRead().mood),'night-flash','Generative selection is retained');
      }else await page.locator('#composer-moods-done').click();

      await page.locator('#image-composer-prompt').fill('Keep the expression.');
      state=await page.evaluate(()=>window.__nightFlashRead());
      assert.match(state.settings.prompt,/Relight the existing subject/);
      assert.equal(state.settings.moodOriginalPrompt,'Keep the expression.');
      assert.equal(await page.locator('#image-composer-generate').isEnabled(),true);
      await page.locator('#composer-character').click();
      assert.equal(await page.locator('#composer-library-cards').getByRole('button',{name:/Still training/}).isEnabled(),false);
      await page.locator('#composer-library-cards').getByRole('button',{name:/Fixture identity/}).click();
      await page.locator('#composer-library-close').click();
      if(viewport.width<=899&&!await page.locator('#image-composer-more').isVisible())await page.locator('#image-composer-mobile-more').click();
      await page.locator('#image-composer-more').click();
      await page.locator('#hf-strength').press('Home');
      await page.locator('#hf-strength').press('ArrowRight');
      await page.locator('#composer-options-close').click();
      state=await page.evaluate(()=>window.__nightFlashRead());
      assert.equal(state.settings.characterId,characterId);assert.equal(state.settings.identityStrength,.05);
      const geometry=await page.evaluate(()=>{
        const ids=['image-composer','image-composer-generate','image-composer-prompt'];
        return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,boxes:ids.map(id=>({id,...document.getElementById(id).getBoundingClientRect().toJSON()}))};
      });
      assert.equal(geometry.overflow,false);
      for(const box of geometry.boxes)assert.ok(box.width>0&&box.height>0&&box.x>=0&&box.right<=viewport.width+1&&box.bottom<=viewport.height+2,JSON.stringify({role,viewport,geometry}));
      await page.screenshot({path:'test-results/night-flash-soul-'+role+'-'+viewport.width+'.png'});
      if(role==='owner'){
        // Two rapid clicks while the live quote is pending must submit only once.
        const accepted=page.waitForResponse(r=>r.url().endsWith('/api/higgsfield/generate'));
        await page.evaluate(()=>{const button=document.getElementById('image-composer-generate');button.click();button.click();});
        await accepted;
        await page.waitForFunction(()=>!window.__nightFlashRead().pending);
        assert.equal(generated,1,'Owner Generate checks the price and submits exactly once');
        assert.equal(await page.locator('#quote-dialog').isVisible(),false,'No second owner price confirmation');
      }else{
        await page.locator('#image-composer-generate').click();
        await page.locator('#quote-dialog').waitFor({state:'visible'});
        assert.equal(generated,0,'Customer live-price dialog does not submit or charge');
        assert.match(await page.locator('#quote-price').innerText(),/7\s*credits/);
        await page.locator('[data-close="quote-dialog"]').click();
        assert.equal(generated,0,'Cancelling the customer quote never submits');
        await page.locator('#image-composer-generate').click();
        await page.locator('#quote-dialog').waitFor({state:'visible'});
        await page.locator('#confirm-generation').click();
        await page.waitForFunction(()=>!document.getElementById('quote-dialog').open);
        assert.equal(generated,1,'Customer confirmation submits exactly once');
      }
      const selectedQuote=[...quotes.values()].at(-1);
      assert.equal(selectedQuote.settings.moodId,'night-flash');assert.ok(selectedQuote.sourceId);
      assert.equal(selectedQuote.settings.moodOriginalPrompt,'Keep the expression.');
      assert.equal(selectedQuote.settings.characterId,characterId);assert.equal(selectedQuote.settings.identityStrength,.05);
      assert.equal(requests.filter(r=>r.path==='/api/higgsfield/characters'&&r.method==='POST').length,0,'No training');
      const job=[...jobs.values()].at(-1);
      await page.evaluate(job=>window.__nightFlashReuse(job),job);
      state=await page.evaluate(()=>window.__nightFlashRead());
      assert.equal(state.settings.characterId,characterId);assert.equal(state.settings.identityStrength,.05);
      assert.equal(state.settings.moodIntensity,selectedQuote.settings.moodIntensity,'Reuse restores the reviewed intensity');assert.equal(state.settings.moodOriginalPrompt,'Keep the expression.');
      await page.locator('#image-composer-moods').click();
      const ownerCard=page.getByRole('button',{name:'Select Won Kar Night',exact:true});
      if(role==='customer')assert.equal(await ownerCard.count(),0,'Owner experiment never enters the customer catalogue DOM');
      else{
        // Starting on another model proves the private card explicitly selects PV Soul.
        await page.locator('#composer-moods-done').click();
        await page.locator('#image-composer-model').click();
        await page.locator('.composer-model-option[data-value="seedream"]').click();
        await page.locator('#image-composer-moods').click();
        await ownerCard.click();
        await page.locator('#composer-moods-done').click();
        state=await page.evaluate(()=>window.__nightFlashRead());
        assert.equal(state.settings.provider,'higgsfield');assert.equal(state.settings.moodId,'won-kar-night');
        assert.equal(state.settings.moodIntensity,75);assert.match(state.settings.prompt,/emerald/i);
        assert.equal(generated,1,'Selecting the private card never generates');
        await page.screenshot({path:'test-results/night-flash-soul-won-kar-night-'+viewport.width+'.png'});
        const switchModel=async()=>{
          await page.locator('#image-composer-model').click();
          await page.locator('.composer-model-option[data-value="gemini"]').click();
          await page.locator('#soul-mood-dialog').waitFor({state:'visible'});
          assert.equal(await page.locator('#composer-generation-block').isVisible(),false,'Compatibility help never adds a deck row');
          assert.equal(await page.locator('#image-composer-generate').isEnabled(),false,'Incompatible Mood stays blocked');
          assert.equal(generated,1,'Opening compatibility popup never submits');
        };
        await switchModel();
        const popup=await page.locator('#soul-mood-dialog').boundingBox();
        assert.ok(popup.x>=0&&popup.x+popup.width<=viewport.width&&popup.y>=0&&popup.y+popup.height<=viewport.height,'Popup fits the viewport');
        await page.screenshot({path:'test-results/night-flash-soul-model-choice-'+viewport.width+'.png'});
        await page.locator('#soul-mood-use').click();
        state=await page.evaluate(()=>window.__nightFlashRead());
        assert.equal(state.settings.provider,'higgsfield');assert.equal(state.mood,'won-kar-night');
        assert.equal(state.source,true,'Use PV Soul preserves Base');
        await switchModel();
        await page.keyboard.press('Escape');
        state=await page.evaluate(()=>window.__nightFlashRead());
        assert.equal(state.settings.provider,'higgsfield');assert.equal(state.mood,'won-kar-night','Escape keeps the original compatible combination');
        failQuote=true;
        const failed=page.waitForResponse(r=>r.url().endsWith('/api/higgsfield/quote')&&r.status()===503);
        await page.locator('#image-composer-generate').click();await failed;
        await page.waitForFunction(()=>!window.__nightFlashRead().pending);
        assert.equal(generated,1,'A failed live quote never generates or retries');
        failQuote=false;
        await switchModel();
        const blockedDeck=await page.locator('#image-composer').boundingBox();
        await page.locator('#soul-mood-remove').click();
        state=await page.evaluate(()=>window.__nightFlashRead());
        assert.equal(state.settings.engine,'gemini');assert.equal(state.mood,null);assert.equal(state.source,true);
        assert.equal(state.settings.prompt,'Keep the expression.','Remove mood preserves authored direction');
        assert.equal(await page.locator('#soul-mood-dialog').isVisible(),false);
        const resolvedDeck=await page.locator('#image-composer').boundingBox();
        assert.equal(Math.round(blockedDeck.height),Math.round(resolvedDeck.height),'Resolving compatibility does not add/remove a status row');
        assert.equal(generated,1,'Both popup choices and Escape never generate');

      }
      assert.deepEqual(errors,[]);
      console.log('PASS Won Kar Night owner visibility, Soul selection and no automatic generation '+role+' '+viewport.width+'px');
      console.log('PASS Soul Night Flash '+role+' '+viewport.width+'px: selection, text/base, unsupported Mood, geometry, bound quote, owner one-click/customer confirmation and compatibility popup');
    }finally{await context.close();}
  }
}finally{await browser.close();await new Promise(done=>server.close(done));}
