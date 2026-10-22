// One-click first-image test with synthetic login, mocked quotes and zero paid providers.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.'),source=readFileSync('lab/lab.js','utf8');
const start=source.indexOf('try{clerk=await loadLabAccount();');
const end=source.indexOf('\n',start);
assert.ok(start>=0&&end>start);
const mock=source.slice(0,start)+source.slice(end+1)+`
clerk={isSignedIn:true,user:{id:'welcome-mock'},session:{id:'welcome-session',getToken:async()=> 'synthetic-token'}};
const mockRole=new URL(location.href).searchParams.get('mockRole')||'customer';
const mockBalance=mockRole==='new'?0:200;
owner=true;ownerAccount=mockRole==='owner';customerMode=!ownerAccount;customerGenerationReady=true;userId='welcome-mock';
config={enabled:true,configured:true,geminiEnabled:true,falEnabled:true,higgsfieldEnabled:false,
  concurrency:{image:4,video:1}};
wallet.connect({customer:customerMode,balanceCredits:mockBalance,billingReady:true,products:[]});
$('app').hidden=false;$('gate').hidden=true;
setTool('image');
await loadHistory();
showWelcomeStart({customer:customerMode,generationReady:true,balanceCredits:mockBalance,accountClosed:false,billingReview:false});
finishLabBoot();
update();
if(mockRole==='guest'){
  owner=false;customerMode=false;
  $('app').hidden=true;$('gate').hidden=false;
}
// Test-only trigger for transitioning from an empty customer welcome to
// one saved image without making any paid request or changing production APIs.
window.__welcomeMockGalleryChanged=()=>syncImageGalleryEmpty();
window.__welcomeMockInspiration=open=>setMoodDiscoveryOpen(open);
window.__welcomeMockSubmissionPending=()=>imageSubmissionPending;
window.__welcomeMockReady=true;
`;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[extname(file)]||'text/plain');
  res.end(pathname==='/lab/lab.js'?mock:readFileSync(file));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1536,height:864}});
const page=await context.newPage(),api='https://parallel-vision-lab.parallelvision.workers.dev';
const errors=[],requests=[],quotes=new Map();let seq=1,submissions=0;
const id=()=> '30000000-0000-4000-8000-'+String(seq++).padStart(12,'0');
page.on('pageerror',error=>errors.push(error.message));
await context.route('https://**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(!url.href.startsWith(api))return route.abort();
  const path=url.pathname,data=request.headers()['content-type']?.includes('application/json')?request.postDataJSON():{};
  requests.push({path,method:request.method(),data});
  const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/api/jobs'&&request.method()==='GET')return send({jobs:[],activeJobs:[],next:null,concurrency:{image:4,video:1}});
  if(path==='/api/packs')return send({packs:[]});
  if(path==='/api/soul-pro/identity')return send({configured:false,count:0,refs:[]});
  if(path==='/api/uploads')return send({id:id()},201);
  if(path==='/api/quotes'){
    await new Promise(done=>setTimeout(done,1400));
    // Model resolution must flow all the way into the bound provider quote.
    const twoK=data.settings.resolution==='2k',cost=twoK?.06:.04;
    const quote={id:id(),provider:'SpicyAPI',settings:{...data.settings,type:'image',mode:'image'},
      maxUsd:cost,estimatedUsd:cost,creditCost:twoK?30:20,expiresAt:Date.now()+180000};
    quotes.set(quote.id,quote);
    return send(quote);
  }
  if(path==='/api/jobs'&&request.method()==='POST'){
    assert.equal(data.confirm,true);
    assert.ok(quotes.has(data.quoteId),'One-click must use an authenticated bound price');
    submissions++;
    await new Promise(done=>setTimeout(done,300));
    return send({job:{id:id(),status:'queued',createdAt:Date.now(),
      settings:quotes.get(data.quoteId).settings,estimatedUsd:.04}},202);
  }
  if(path==='/api/customer/image-price')return send({kind:'server-estimate',source:'backend-model-rate',
    credits:25,count:1,expiresAt:Date.now()+120000});
  return send({error:'Unmocked '+path},404);
});
try{
  // A flow-height change must not reframe the public artwork on editor focus.
  // Compare actual painted pixels away from text/cards at two desktop sizes.
  for(const viewport of [{width:1920,height:900},{width:1280,height:720}]){
    const c=await browser.newContext({viewport,reducedMotion:'reduce'}),p=await c.newPage();
    await c.route('https://**/*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({jobs:[],packs:[],activeJobs:[],products:[]})}));
    try{
      await p.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=image&mockRole=guest');
      await p.waitForFunction(()=>window.__welcomeMockReady===true);
      await p.evaluate(async()=>{
        await document.fonts.ready;
        const src=getComputedStyle(document.getElementById('gate'),'::before').backgroundImage.match(/url\("?([^"\)]+)"?\)/)?.[1];
        const image=new Image();image.src=src;await image.decode();
      });
      const art=await p.locator('#gate').evaluate(el=>getComputedStyle(el,'::before').backgroundImage);
      assert.match(art,/\/visuals\/pvlab-subtle-cinematic-background-20261017\.webp/,'Public entrance uses the approved cobalt/copper artwork');
      async function entranceGeometry(guest){
        return p.evaluate(guest=>{
          const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
          return {title:rect(document.querySelector(guest?'#gate h1':'#lab-welcome-start h2')),
            cards:[...document.querySelectorAll(guest?'.pv-guest-card':'.lab-welcome-preset')].map(rect),
            scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight};
        },guest);
      }
      const publicGeometry=await entranceGeometry(true);
      const clip={x:16,y:110,width:Math.floor(viewport.width/4),height:120},options={clip,animations:'disabled',caret:'hide'};
      const before=await p.screenshot(options);
      async function assertBackdropStill(label){
        const after=await p.screenshot(options);
        const difference=await p.evaluate(async({before,after})=>{
          async function pixels(bytes){
            const image=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'}));
            const canvas=new OffscreenCanvas(image.width,image.height),ctx=canvas.getContext('2d');
            ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,image.width,image.height).data;image.close();return data;
          }
          const a=await pixels(before),b=await pixels(after);let max=0,total=0;
          for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);max=Math.max(max,d);total+=d;}
          return {max,mean:total/a.length};
        },{before:[...before],after:[...after]});
        // Small raster/compositing rounding is allowed, not a shifted image.
        assert.ok(difference.max<=4&&difference.mean<=.25,label+' at '+viewport.width+': '+JSON.stringify(difference));
      }
      const field=p.locator('#pv-guest-prompt');
      const frame=()=>p.locator('#pv-guest-composer').evaluate(el=>{
        const r=el.getBoundingClientRect();
        return {x:r.x,y:r.y,width:r.width,radius:getComputedStyle(el).borderRadius};
      });
      const closedFrame=await frame();
      await field.evaluate(el=>el.focus({preventScroll:true}));
      await p.waitForFunction(()=>document.getElementById('pv-guest-composer').classList.contains('pv-deck-expanded'));
      assert.deepEqual(await frame(),closedFrame,'Public bar keeps its left, right, top and corner shape while opening at '+viewport.width+'px');
      assert.equal(await p.evaluate(()=>scrollY),0,'Focus comparison excludes browser scrolling');
      await assertBackdropStill('Opening the public bar leaves the backdrop fixed');
      await field.evaluate(el=>el.blur());
      await p.waitForFunction(()=>!document.getElementById('pv-guest-composer').classList.contains('pv-deck-expanded'));
      assert.deepEqual(await frame(),closedFrame,'Public bar keeps its frame when closing at '+viewport.width+'px');
      await assertBackdropStill('Closing the public bar leaves the backdrop fixed');
      await p.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=image&mockRole=new');
      await p.waitForFunction(()=>window.__welcomeMockReady===true);
      await p.evaluate(()=>document.fonts.ready);
      await assertBackdropStill('Public and signed-in entrances paint the same approved backdrop');
      assert.deepEqual(await entranceGeometry(false),publicGeometry,
        'Public title, every card and page bounds match the approved signed-in entrance at '+viewport.width);
    }finally{await c.close();}
  }
  console.log('PASS approved public backdrop and unchanged pixels on focus/blur at 1920px and 1280px');
  // Direct visual comparison, rather than independently allowing each skin.
  // Both surfaces must share slot geometry, control sizing, type and color.
  const parity=[];
  for(const role of ['new','returning','owner','guest']){
    const context=await browser.newContext({viewport:{width:1920,height:1000},reducedMotion:'reduce'});
    const p=await context.newPage();
    await context.route('https://**/*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({jobs:[],packs:[],activeJobs:[],products:[]})}));
    try{
      await p.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=image&mockRole='+role);
      await p.waitForFunction(()=>window.__welcomeMockReady===true);
      await p.evaluate(()=>document.fonts.ready);
      const prefix=role==='guest'?'pv-guest':'image-composer';
      const field=p.locator('#'+prefix+'-prompt'),bar=p.locator(role==='guest'?'#pv-guest-composer':'#image-composer');
      assert.equal(await p.locator('#image-composer:visible,#pv-guest-composer:visible').count(),1,
        role+' has one visible Image editor, not a separate role-specific copy');
      if(role!=='guest')assert.equal(await p.locator('#tool-retouch').isVisible(),true,
        role+' retains Retouch in the shared tool navigation');
      const states={};
      async function capture(state){
        states[state]=await bar.evaluate(el=>{
          const outer=el.getBoundingClientRect(),css=getComputedStyle(el);
          const stage=el.closest('#gate')||document.querySelector('#app .image-gallery-shell'),art=getComputedStyle(stage,'::before');
          const rect=node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node),visible=r.width>0&&r.height>0;return {x:visible?r.x-outer.x:0,y:visible?r.y-outer.y:0,w:r.width,h:r.height,font:s.fontSize,weight:s.fontWeight,line:s.lineHeight,color:s.color,background:s.backgroundColor,radius:s.borderRadius};};
          const guest=el.id==='pv-guest-composer';
          const cardNodes=[...document.querySelectorAll(guest?'#pv-guest-cards .pv-guest-card':'#lab-welcome-presets .lab-welcome-preset')];
          return {x:outer.x,y:outer.y,w:outer.width,h:outer.height,background:css.backgroundImage,radius:css.borderRadius,
            backdrop:{image:art.backgroundImage,filter:art.filter,opacity:art.opacity,shade:getComputedStyle(stage,'::after').backgroundImage},
            entrance:{stage:rect(stage),title:rect(document.querySelector(guest?'#gate h1':'#lab-welcome-start h2')),
              cards:cardNodes.map(card=>({frame:rect(card),label:rect(card.querySelector(guest?'span':'strong')),
                crop:getComputedStyle(card.querySelector('img')).objectPosition,shade:getComputedStyle(card,'::after').backgroundImage})),
              framing:{size:art.backgroundSize,position:art.backgroundPosition,attachment:art.backgroundAttachment,transform:art.transform}},
            prompt:rect(el.querySelector('textarea')),
            controls:Object.fromEntries([...el.querySelectorAll('[data-deck-control]')].filter(n=>getComputedStyle(n).display!=='none'&&n.getBoundingClientRect().width>0).map(n=>[n.dataset.deckControl,rect(n)])),
            generate:rect(el.querySelector('[data-deck-slot="generate"]')),
            generateLabel:rect(el.querySelector('[data-deck-slot="generate"]').querySelector('.composer-generate-label,strong')),
            modelIcon:el.querySelector('[data-deck-control="model"] img')?.getAttribute('src')};
        });
      }
      await capture('idle');
      await field.click();await capture('focus');
      if(role==='guest'){
        await p.keyboard.press('Tab');
        await p.waitForTimeout(30);
        assert.equal(await bar.evaluate(el=>el.classList.contains('pv-deck-expanded')&&el.contains(document.activeElement)),true,
          'Public lower tools remain open while tabbing from the prompt');
      }
      await field.fill('hola como esta?');await capture('short');
      await field.fill('');
      assert.equal(await bar.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,role+' stays open while clearing focused text');
      await p.getByRole('heading',{name:'Start with a feeling.',exact:true}).filter({visible:true}).click();
      await p.waitForFunction(id=>!document.getElementById(id).classList.contains('pv-deck-expanded'),role==='guest'?'pv-guest-composer':'image-composer');
      await capture('cleared');
      for(const state of ['focus','short','cleared']){
        for(const key of ['x','y','w'])assert.ok(Math.abs(states[state][key]-states.idle[key])<2,
          role+' keeps the same outer '+key+' when '+state+': '+JSON.stringify({idle:states.idle,state:states[state]}));
        assert.equal(states[state].radius,states.idle.radius,role+' keeps the same outer corner shape when '+state);
      }
      assert.equal(states.idle.h,74,role+' starts with the approved compact row');
      for(const tool of ['add','library','model','moods','base','ratio','resolution','count','exact'])
        assert.ok(states.idle.controls[tool]?.w>0,role+' keeps '+tool+' visible while compact');
      assert.equal(states.idle.generate.w,128,role+' keeps Generate visible while compact');
      assert.equal(states.idle.generate.h,52,role+' retains the compact Generate proportions');
      assert.ok(states.focus.h===142&&states.focus.generate.w===144&&states.focus.generate.h===84,
        role+' opens the approved Owner 142px deck and Generate proportions');
      if(role!=='guest')assert.equal(await p.locator('#image-composer-edit-area').isDisabled(),role!=='owner',
        role+' retains the existing Retouch eligibility while sharing its layout');
      parity.push({role,states});
    }finally{await context.close();}
  }
  for(const state of ['idle','focus','short','cleared']){
    for(const entry of parity.slice(1)){
      const a=parity[0].states[state],b=entry.states[state],label=state+' new/'+entry.role;
      assert.deepEqual(Object.keys(a.controls).sort(),Object.keys(b.controls).sort(),label+' same visible controls');
      for(const key of ['x','y','w','h'])assert.ok(Math.abs(a[key]-b[key])<2,label+' same deck '+key+': '+JSON.stringify({a,b}));
      assert.equal(a.background,b.background,label+' same graphite surface');assert.equal(a.radius,b.radius);
      assert.match(a.backdrop.image,/\/visuals\/pvlab-subtle-cinematic-background-20261017\.webp/,label+' uses approved entrance art');
      assert.deepEqual(a.backdrop,b.backdrop,label+' entrance artwork and treatment match');
      for(const name of ['stage','title'])for(const key of ['x','y','w','h','font','weight','line','color','radius'])
        assert.equal(a.entrance[name][key],b.entrance[name][key],label+' canonical '+name+' '+key);
      assert.deepEqual(a.entrance.framing,b.entrance.framing,label+' uses the signed-in background crop');
      assert.deepEqual(a.entrance.cards,b.entrance.cards,label+' uses the signed-in card frames, labels and photograph crops');
      assert.equal(a.modelIcon,'./branding/bytedance.svg',label+' uses the real model asset');
      assert.equal(a.modelIcon,b.modelIcon,label+' same model icon');
      for(const name of ['prompt','generate','generateLabel',...Object.keys(a.controls)]){
        const one=a[name]||a.controls[name],two=b[name]||b.controls[name];
        assert.ok(two,label+' also exposes '+name);
        for(const key of ['x','y','w','h'])assert.ok(Math.abs(one[key]-two[key])<2,label+' '+name+' same '+key+': '+JSON.stringify({one,two}));
        for(const key of ['font','weight','line','radius'])assert.equal(one[key],two[key],label+' '+name+' same '+key);
        if(!name.startsWith('generate'))for(const key of ['color','background'])assert.equal(one[key],two[key],label+' '+name+' same '+key);
      }
    }
  }
  console.log('PASS direct new/returning/owner/public parity: same controls, slots, typography and backdrop in all four writing states');
  // All account ages/roles use one real editor, including Inspiration opened
  // over existing History. Account state may change eligibility, never layout.
  const roleGeometry=new Map();
  for(const role of ['new','returning','owner']){
    const roleContext=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    const rolePage=await roleContext.newPage();
    await roleContext.route('https://**/*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({jobs:[],packs:[],activeJobs:[],products:[]})}));
    try{
      await rolePage.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=image&mockRole='+role);
      await rolePage.waitForFunction(()=>window.__welcomeMockReady===true&&document.getElementById('image-composer').classList.contains('pv-welcome-deck'));
      const roleDeck=rolePage.locator('#image-composer'),roleField=rolePage.locator('#image-composer-prompt');
      for(const viewport of role==='new'?[{width:1920,height:911},{width:1440,height:900},{width:1280,height:720},{width:1280,height:680}]:role==='owner'?[{width:1440,height:900},{width:1180,height:800}]:[{width:1440,height:900}]){
        await rolePage.setViewportSize(viewport);
        let noticeGeometry;
        for(const banner of role==='new'?[true,false]:[false]){
          if(role==='new'&&!banner)await rolePage.getByRole('button',{name:'Dismiss credit notice',exact:true}).click();
          else await rolePage.evaluate(show=>{document.getElementById('lab-credit-banner').hidden=!show;},banner);
          await rolePage.waitForTimeout(80);
          const geometry=await rolePage.evaluate(()=>{
            const selectors=['#studio-header','#main','.image-gallery-shell','.archivehead','#lab-welcome-start','#lab-welcome-presets','#lab-welcome-presets .lab-welcome-preset','#image-composer','#refresh','#history-preview-toggle'];
            return Object.fromEntries(selectors.map(selector=>{
              const r=document.querySelector(selector).getBoundingClientRect();
              return [selector,{x:r.x,y:r.y,w:r.width,h:r.height}];
            }));
          });
          roleGeometry.set(role+'-'+viewport.width+'x'+viewport.height+'-'+(banner?'notice':'plain'),geometry);
          if(role==='new'){
            if(banner)noticeGeometry=geometry;
            else{
              assert.deepEqual(geometry,noticeGeometry,'Closing the credit notice keeps the page, cards, deck, backdrop frame and History controls fixed at '+viewport.width+'x'+viewport.height);
              assert.equal(await rolePage.locator('#lab-credit-banner').isVisible(),false,'Dismissed notice is not painted');
              assert.equal(await rolePage.getByRole('button',{name:'Dismiss credit notice',exact:true}).count(),0,'Dismissed notice leaves the accessibility tree');
            }
            if(banner){
              const notice=await rolePage.locator('#lab-credit-banner').evaluate(el=>{
                const r=el.getBoundingClientRect(),style=getComputedStyle(el),deck=document.getElementById('image-composer').getBoundingClientRect();
                return {position:style.position,top:r.top,bottom:r.bottom,height:r.height,viewport:innerHeight,deckBottom:deck.bottom};
              });
              assert.equal(notice.position,'fixed','The zero-credit notice floats outside the canonical Owner layout');
              assert.ok(Math.abs(notice.bottom-notice.viewport)<2,'The notice sits at the viewport edge');
              assert.ok(notice.top>notice.deckBottom,'The notice does not cover the prompt deck');
            }
            assert.ok(await rolePage.evaluate(()=>['refresh','history-preview-toggle'].every(id=>{
              const el=document.getElementById(id),r=el.getBoundingClientRect();
              return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
            })),'The credit notice never covers Refresh or the eye');
          }
          const before=await roleDeck.boundingBox(),photos=await rolePage.locator('#lab-welcome-presets').boundingBox();
          assert.ok(before.height>=73&&before.height<=75,role+' gets the approved compact toolbar row');
          const contained=await roleDeck.evaluate(el=>{
            const bar=el.getBoundingClientRect(),prompt=el.querySelector('textarea').getBoundingClientRect();
            return bar.left>=0&&bar.right<=innerWidth&&prompt.left>=bar.left&&prompt.right<=bar.right;
          });
          assert.ok(contained,role+' controls remain contained at '+viewport.width+'px');
          assert.ok(Math.abs(before.y-(viewport.height-172))<2,
            role+' compact bar keeps the original History top: '+JSON.stringify({viewport,banner,before}));
          assert.ok(before.y-photos.y-photos.height>=20,role+' cards remain above the shared deck origin');
          await roleField.click();
          const opened=await roleDeck.boundingBox();
          for(const key of ['x','width'])assert.ok(Math.abs(opened[key]-before[key])<2,
            role+' keeps its side borders while opening at '+viewport.width+'px: '+JSON.stringify({before,opened}));
          assert.ok(opened.height>before.height+40&&Math.abs(opened.y-before.y)<2,
            role+' opens down, never toward the cards: '+JSON.stringify({before,opened}));
          assert.ok(opened.y+opened.height<=viewport.height-8,
            role+' Generate and tools fit the viewport: '+JSON.stringify({viewport,banner,opened}));
          await rolePage.locator('#lab-welcome-start h2').click();
          await rolePage.waitForFunction(()=>!document.getElementById('image-composer').classList.contains('pv-deck-expanded'));
          assert.ok(Math.abs((await roleDeck.boundingBox()).height-before.height)<3,role+' closes on outside click');
        }
      }
      await rolePage.setViewportSize({width:1440,height:900});
      await rolePage.evaluate(()=>{
        const card=document.createElement('article');card.className='card';card.dataset.kind='image';
        document.getElementById('history').append(card);
        document.getElementById('lab-welcome-start').hidden=true;
        window.__welcomeMockGalleryChanged();
      });
      await rolePage.waitForFunction(()=>!document.getElementById('image-composer').classList.contains('pv-welcome-deck'));
      if(role==='owner')assert.equal(await rolePage.locator('#image-composer-edit-area').isVisible(),true,
        'Owner History retains its existing Retouch shortcut');
      const historyDeck=await roleDeck.boundingBox();
      const slotGeometry=el=>{const r=el.getBoundingClientRect();return Object.fromEntries([...el.querySelectorAll('[data-deck-slot], [data-deck-control]')].filter(n=>n.getBoundingClientRect().width>0&&n.dataset.deckSlot!=='controls').map(n=>{const b=n.getBoundingClientRect();return [n.dataset.deckControl||n.dataset.deckSlot,{x:b.x-r.x,y:b.y-r.y,w:b.width,h:b.height}];}));};
      const historySlots=await roleDeck.evaluate(slotGeometry);
      await roleDeck.evaluate(el=>window.__originalImageDeck=el);
      await roleField.click();
      assert.ok(Math.abs((await roleDeck.boundingBox()).height-historyDeck.height)<3,
        role+' History retains its locked two-row deck on focus');
      assert.ok(Math.abs(900-historyDeck.y-historyDeck.height-30)<3,role+' History keeps its bottom anchor');
      await rolePage.locator('#history-moods-toggle').click();
      await rolePage.waitForFunction(()=>document.getElementById('image-composer').classList.contains('pv-welcome-deck'));
      assert.ok(Math.abs((await roleDeck.boundingBox()).height-74)<2,role+' Inspiration reopens the same compact toolbar');
      assert.equal(await roleDeck.evaluate(el=>el===window.__originalImageDeck),true,role+' Inspiration retains the original History editor element');
      assert.ok(Math.abs((await roleDeck.boundingBox()).y-historyDeck.y)<2,role+' compact Inspiration starts at the exact History top');
      await roleField.click();
      const inspirationDeck=await roleDeck.boundingBox();
      assert.deepEqual(inspirationDeck,historyDeck,role+' expanded Inspiration is the original History frame at the same position');
      assert.deepEqual(await roleDeck.evaluate(slotGeometry),historySlots,role+' expanded Inspiration retains every original History slot');
      assert.equal(await rolePage.locator('#image-composer:visible,#pv-guest-composer:visible').count(),1,
        role+' exposes exactly one Image bar');
    }finally{await roleContext.close();}
  }
  const ownerCanonical=roleGeometry.get('owner-1440x900-plain');
  for(const key of ['new-1440x900-notice','new-1440x900-plain','returning-1440x900-plain'])
    assert.deepEqual(roleGeometry.get(key),ownerCanonical,key+' uses the exact Owner Inspiration geometry');
  console.log('PASS shared new/returning/owner card bar, downward focus/blur, credit banner and locked History');
  await page.goto('http://127.0.0.1:'+server.address().port+'/lab/studio.html?tool=image',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__welcomeMockReady===true,undefined,{timeout:20000});
  assert.equal(await page.locator('#lab-welcome-start').isVisible(),true);
  await page.evaluate(()=>{window.__welcomeMockInspiration(true);window.__welcomeMockInspiration(false);});
  assert.equal(await page.locator('#lab-welcome-start').isVisible(),true,
    'Returning to empty History keeps the approved card entrance');
  assert.equal(await page.locator('#lab-image-empty-intro').isVisible(),false,
    'Returning to empty History cannot revive the obsolete landscape and quick actions');
  assert.equal(await page.locator('.lab-welcome-preset[aria-pressed="true"]').count(),0,
    'No card should claim selection before the user selects it');
  const button=page.locator('#image-composer-generate');
  const deck=page.locator('#image-composer');
  const field=page.locator('#image-composer-prompt');
  await page.waitForFunction(()=>document.querySelector('#image-composer')?.classList.contains('pv-editorial-deck'));
  assert.equal(await deck.evaluate(el=>el.classList.contains('pv-deck-expanded')),false,
    'Empty Image deck must start collapsed, like the approved compact reference');
  assert.equal(await deck.evaluate(el=>getComputedStyle(el).display),'grid',
    'Desktop welcome keeps one true Image composer, using a grid instrument');
  const idleLayout=await page.evaluate(()=>{
    const get=s=>document.querySelector(s).getBoundingClientRect();
    const dock=get('#image-composer'),prompt=get('#image-composer-prompt'),
      controls=get('#image-composer .composer-controls'),
      generate=get('#image-composer-generate');
    return {height:dock.height,bottom:dock.bottom,
      promptRight:prompt.right,controlsLeft:controls.left,controlsRight:controls.right,
      generateLeft:generate.left,generateRight:generate.right,
      rows:getComputedStyle(document.querySelector('#image-composer')).gridTemplateRows,
      viewportWidth:innerWidth,documentWidth:document.documentElement.scrollWidth};
  });
  assert.ok(idleLayout.height>=73&&idleLayout.height<=75,
    'Empty Image welcome keeps the compact prompt and tools visible: '+JSON.stringify(idleLayout));
  assert.equal(await page.locator('#image-composer .composer-controls').isVisible(),true,
    'Compact toolbar remains visible');
  assert.equal(await button.isVisible(),true,'Generate remains visible in the compact row');
  assert.ok(idleLayout.promptRight<=idleLayout.controlsLeft+1&&idleLayout.controlsRight<=idleLayout.generateLeft,
    'Compact prompt, controls and Generate fit without overlap: '+JSON.stringify(idleLayout));
  assert.ok(idleLayout.generateRight<=idleLayout.viewportWidth-12 &&
    idleLayout.documentWidth<=idleLayout.viewportWidth+3,
    'Compact deck must not introduce horizontal overflow: '+JSON.stringify(idleLayout));
  const initialDeck=await deck.boundingBox();
  const availableWidth=await page.evaluate(()=>document.documentElement.clientWidth);
  const centerError=Math.abs(initialDeck.x+initialDeck.width/2-availableWidth/2);
  assert.ok(centerError<18,
    'The restored Image deck must stay horizontally centered: '+
      JSON.stringify({initialDeck,availableWidth,centerError}));
  const initialCards=await page.locator('#lab-welcome-presets').boundingBox();
  assert.ok(initialDeck.y-initialCards.y-initialCards.height>=20,
    'The entrance bar belongs just below the cards: '+JSON.stringify({initialDeck,initialCards}));
  assert.ok(864-initialDeck.y-initialDeck.height>80,
    'The compact entrance reserves downward writing room instead of touching the bottom');
  assert.equal(await page.locator('#app').evaluate(el=>el.classList.contains('pv-welcome-deck-resting')),false,
    'No welcome floating state may move the cards or hide image controls');
  await field.click();
  assert.equal(await page.locator('#image-composer-resolution-wrap').isVisible(),true,
    'Opening the lower portion reveals the existing resolution control');
  const emptyPriceButton=await button.evaluate(el=>{
    const rect=el.getBoundingClientRect();
    const label=el.querySelector('.composer-generate-label').getBoundingClientRect();
    const pricePseudo=getComputedStyle(el,'::after');
    return {price:el.dataset.credits||'',centerX:label.x+label.width/2-rect.x-rect.width/2,
      centerY:label.y+label.height/2-rect.y-rect.height/2,
      pseudoContent:pricePseudo.content,pseudoDisplay:pricePseudo.display};
  });
  assert.equal(emptyPriceButton.price,'','Initial welcome has no quoted price before typing');
  assert.ok(Math.abs(emptyPriceButton.centerX)<1.5&&Math.abs(emptyPriceButton.centerY)<1.5,
    'Generate lettering must be precisely centered when no price is available: '+JSON.stringify(emptyPriceButton));
  assert.ok(emptyPriceButton.pseudoContent==='none'||emptyPriceButton.pseudoDisplay==='none',
    'Empty credit placeholder must not offset the Generate label: '+JSON.stringify(emptyPriceButton));
  await page.locator('#lab-welcome-start h2').click();
  await page.waitForFunction(()=>!document.getElementById('image-composer').classList.contains('pv-deck-expanded'));
  const welcomeSurface=await page.evaluate(()=>{
    const shell=document.querySelector('.image-gallery-shell'),footer=document.querySelector('body>footer.pv-lab-footer');
    const backdrop=getComputedStyle(shell,'::before');
    return {
      shellHeight:shell.getBoundingClientRect().height,
      backgroundHeight:parseFloat(backdrop.height),
      opacity:backdrop.opacity,
      filter:backdrop.filter,
      image:backdrop.backgroundImage,
      gradient:getComputedStyle(shell,'::after').backgroundImage,
      footer:getComputedStyle(footer).display,
      documentHeight:document.documentElement.scrollHeight,
      viewportHeight:innerHeight,
      overflow:getComputedStyle(document.documentElement).overflowY
    };
  });
  assert.equal(welcomeSurface.footer,'none',
    'Empty Image Studio must not scroll into the marketing/footer sections');
  assert.equal(welcomeSurface.overflow,'hidden',
    'First-image welcome should be a single non-scrolling desktop viewport');
  assert.ok(welcomeSurface.documentHeight<=welcomeSurface.viewportHeight+3,
    'The empty Image Studio must have no unwanted lower section: '+JSON.stringify(welcomeSurface));
  assert.ok(Math.abs(welcomeSurface.backgroundHeight-welcomeSurface.shellHeight)<3,
    'The photographic background must cover the full welcome viewport: '+JSON.stringify(welcomeSurface));
  assert.ok(Number(welcomeSurface.opacity)>=.99 && welcomeSurface.filter==='none',
    'Clean blue/copper plate must not have a heavily blurred saturation filter: '+JSON.stringify(welcomeSurface));
  assert.ok(welcomeSurface.image.includes('pvlab-subtle-cinematic-background-20261017.webp'),
    'Welcome must use its own clean 01/Subtle & Cinematic backdrop, not a complete UI screenshot');
  assert.ok(existsSync(resolve(root,'lab/visuals/pvlab-subtle-cinematic-background-20261017.webp')),
    'The clean background asset must ship with the deployed site');
  const moodCard=page.locator('[data-welcome-mood="dream-blur"]');
  const idleShadow=await moodCard.evaluate(el=>getComputedStyle(el).boxShadow);
  const oldMoodGeometry=await moodCard.evaluate(el=>{
    const card=el.getBoundingClientRect(),image=el.querySelector('img').getBoundingClientRect();
    return {cardX:card.x,cardY:card.y,cardW:card.width,cardH:card.height,
      imageX:image.x,imageY:image.y,imageW:image.width,imageH:image.height};
  });
  await moodCard.hover();
  await page.waitForTimeout(270);
  const hovered=await moodCard.evaluate(el=>{
    const card=el.getBoundingClientRect(),image=el.querySelector('img').getBoundingClientRect();
    return {cardX:card.x,cardY:card.y,cardW:card.width,cardH:card.height,
      imageX:image.x,imageY:image.y,imageW:image.width,imageH:image.height,
      cardTransform:getComputedStyle(el).transform,
      imageTransform:getComputedStyle(el.querySelector('img')).transform,
      boxShadow:getComputedStyle(el).boxShadow};
  });
  for(const key of Object.keys(oldMoodGeometry))
    assert.ok(Math.abs(oldMoodGeometry[key]-hovered[key])<1,
      'Mood hover must not zoom or lift photographs: '+JSON.stringify({key,oldMoodGeometry,hovered}));
  assert.equal(hovered.cardTransform,'none');
  assert.equal(hovered.imageTransform,'none');
  assert.notEqual(hovered.boxShadow,idleShadow,
    'Mood hover keeps a thin feedback border without image animation');
  assert.ok(!hovered.boxShadow.includes('0.87')&&!hovered.boxShadow.includes('0.33'),
    'The earlier overbright halo must be removed: '+hovered.boxShadow);
  await page.mouse.move(2,2);
  assert.equal(await page.locator('.lab-welcome-preset').count(),8,
    'All six original welcome cards and Chrome Couture remain mounted');
  // Navigate the real gallery before submitting a job, so queue callbacks
  // cannot close the Inspiration view during the click regression.
  const welcomeNext=page.locator('.lab-welcome-carousel .inspiration-nav-next');
  const welcomePrev=page.locator('.lab-welcome-carousel .inspiration-nav-prev');
  await welcomeNext.waitFor({state:'visible'});
  assert.equal(await welcomePrev.isVisible(),true,'Both gallery arrows remain in place');
  assert.equal(await welcomePrev.isDisabled(),true,'At the first look, previous is dimmed');
  await welcomeNext.click();
  await page.waitForFunction(()=>document.getElementById('lab-welcome-presets').scrollLeft>30);
  await welcomeNext.click();
  await page.waitForFunction(()=>{
    const track=document.getElementById('lab-welcome-presets');
    return track.scrollWidth-track.clientWidth>30&&
      track.scrollLeft>=track.scrollWidth-track.clientWidth-4;
  });
  assert.equal(await welcomePrev.isEnabled(),true,'Previous becomes usable after advancing');
  const welcomeHit=await welcomePrev.evaluate(prev=>{
    const r=prev.getBoundingClientRect();
    const target=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return {hit:target?.tagName,hitClass:target?.className,
      rect:{x:r.x,y:r.y,width:r.width,height:r.height},viewport:{width:innerWidth,height:innerHeight},
      within:target===prev||prev.contains(target)};
  });
  assert.ok(welcomeHit.within,'Carousel back arrow must receive pointer events: '+JSON.stringify(welcomeHit));
  await welcomePrev.click();
  await page.waitForFunction(()=>{const track=document.getElementById('lab-welcome-presets');return track.scrollLeft<track.scrollWidth-track.clientWidth-30;});
  await welcomePrev.click();
  await page.waitForFunction(()=>document.getElementById('lab-welcome-presets').scrollLeft<4);
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>document.getElementById('lab-welcome-presets').scrollLeft>30);
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(()=>document.getElementById('lab-welcome-presets').scrollLeft<.4);
  const placement=await page.evaluate(()=>{
    const carousel=document.querySelector('.lab-welcome-carousel');
    const first=carousel.querySelector('.lab-welcome-preset').getBoundingClientRect();
    const sixth=carousel.querySelectorAll('.lab-welcome-preset')[5].getBoundingClientRect();
    const prev=carousel.querySelector('.inspiration-nav-prev').getBoundingClientRect();
    const next=carousel.querySelector('.inspiration-nav-next').getBoundingClientRect();
    return {leftOutside:prev.right<=first.left+4,rightOutside:next.left>=sixth.right-4,
      firstLeft:first.left,prevRight:prev.right,sixthRight:sixth.right,nextLeft:next.left,
      trackScroll:carousel.querySelector('.lab-welcome-presets').scrollLeft};
  });
  assert.ok(placement.leftOutside&&placement.rightOutside,
    'On desktop the arrow buttons belong to the outside gutters, not over the photographs: '+JSON.stringify(placement));

  // An empty CUSTOMER Image welcome has no selectable image jobs.
  // Do not advertise History Select or expose a useless "0 selected" toolbar.
  assert.equal(await page.locator('#history-select').isVisible(),false,
    'An empty customer welcome hides Select until an image actually exists');
  assert.equal(await page.locator('#history-selection').isVisible(),false);
  const welcomePosition=await page.locator('#lab-welcome-title').evaluate(el=>el.getBoundingClientRect().top);
  // A stale programmatic click cannot force the selection overlay back open.
  await page.locator('#history-select').dispatchEvent('click');
  assert.equal(await page.locator('#history-selection').isVisible(),false,
    'Empty customer selection is guarded in JavaScript, not just hidden by CSS');
  assert.equal(await page.locator('#history-select').isVisible(),false);
  assert.ok(Math.abs((await page.locator('#lab-welcome-title').evaluate(el=>el.getBoundingClientRect().top))-welcomePosition)<2,
    'Trying Select on an empty customer gallery must not move welcome content');
  // Discreet Mode remains a separate user-visible control, available even
  // before the customer's first image and unaffected by selection changes.
  const eye=page.locator('#history-preview-toggle');
  await eye.click();
  assert.equal(await eye.getAttribute('aria-pressed'),'true',
    'Customer can independently activate Discreet Mode');
  assert.equal(await page.locator('#history-selection').isVisible(),false);
  await eye.click();
  assert.equal(await eye.getAttribute('aria-pressed'),'false',
    'Customer can return to the same eight-look welcome');
  assert.equal(await page.locator('#history-select').isVisible(),false);
  const cardY=await page.locator('.lab-welcome-preset').first().evaluate(el=>el.getBoundingClientRect().top+window.scrollY);
  await field.click();
  await page.keyboard.press('ArrowRight');
  assert.ok(await page.locator('#lab-welcome-presets').evaluate(track=>track.scrollLeft)<4,
    'Keyboard arrows must edit the prompt caret, not move the gallery, while a text field is focused');
  assert.equal(await deck.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
    'Clicking the empty card-view prompt opens the same two-row deck');
  const focusedDeck=await deck.boundingBox();
  assert.ok(focusedDeck.height>idleLayout.height+40&&Math.abs(focusedDeck.y-initialDeck.y)<2,
    'The card-view deck expands downward from a stable top: '+JSON.stringify({initialDeck,focusedDeck}));
  await page.locator('#lab-welcome-start h2').click();
  await page.waitForFunction(()=>!document.getElementById('image-composer').classList.contains('pv-deck-expanded'));
  const blurredDeck=await deck.boundingBox();
  assert.ok(Math.abs(blurredDeck.height-idleLayout.height)<3&&Math.abs(blurredDeck.y-initialDeck.y)<2,
    'Clicking outside restores the same small bar');
  await field.click();
  await field.fill('A quiet editorial portrait.');
  assert.equal(await deck.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
    'The card-view input remains open while deliberately editing a short prompt');
  await field.fill(('Realistic editorial atmosphere and tactile photographic details. ').repeat(18));
  await page.waitForFunction(()=>document.querySelector('#image-composer').getBoundingClientRect().height>105);
  assert.ok(await deck.evaluate(el=>el.classList.contains('pv-deck-expanded')),
    'Long writing expands the same working Image deck only when space is required');
  // The editorial deck intentionally animates its height over 230ms.
  // Wait for that expansion before asserting the final readable geometry.
  await page.waitForFunction(()=>document.getElementById('image-composer-prompt')
    ?.getBoundingClientRect().height>=100,null,{timeout:3000});
  const expanded=await page.evaluate(()=>{
    const field=document.getElementById('image-composer-prompt');
    const deck=document.getElementById('image-composer');
    const prompt=field.getBoundingClientRect(),controls=deck.querySelector('.composer-controls').getBoundingClientRect();
    const generate=document.getElementById('image-composer-generate').getBoundingClientRect();
    return {promptHeight:prompt.height,promptScrollHeight:field.scrollHeight,promptClientHeight:field.clientHeight,
      controlsTop:controls.top,promptBottom:prompt.bottom,generateBottom:generate.bottom,
      viewportHeight:innerHeight,deckHeight:deck.getBoundingClientRect().height};
  });
  assert.ok(expanded.promptHeight>=100&&expanded.promptHeight<=190,
    'Expanded prompt remains scrollable without taking over the gallery: '+JSON.stringify(expanded));
  assert.ok(expanded.promptScrollHeight>expanded.promptClientHeight,
    'Long prompts must scroll inside the textarea rather than enlarge the entire deck');
  assert.ok(expanded.controlsTop>=expanded.promptBottom-3,
    'Image controls remain attached below the expanded prompt: '+JSON.stringify(expanded));
  assert.ok(expanded.generateBottom<=expanded.viewportHeight,
    'Generate must remain visible when typing long prompts: '+JSON.stringify(expanded));
  const enteredText=await field.inputValue();
  await page.locator('[data-welcome-mood="hong-kong-nights"]').click();
  assert.equal(await deck.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
    'Choosing a Mood keeps the opened deck permanently expanded after blur');
  const bottomAfterMood=await deck.boundingBox();
  assert.ok(Math.abs(864-bottomAfterMood.y-bottomAfterMood.height-30)<2,
    'Long text retains the original History bottom clearance while the empty deck opens downward');
  const newCardY=await page.locator('.lab-welcome-preset').first().evaluate(el=>el.getBoundingClientRect().top+window.scrollY);
  assert.ok(Math.abs(newCardY-cardY)<8,
    'Opening the docked deck must keep the six Mood cards stable in document coordinates: '+
      JSON.stringify({cardY,newCardY,delta:newCardY-cardY,scrollY:await page.evaluate(()=>scrollY)}));
  assert.equal((await field.inputValue()).trimEnd(),enteredText.trimEnd(),'Selecting a Mood preserves the user text');
  assert.equal(await page.locator('#image-composer-resolution').inputValue(),'1k',
    'Applying a Mood to existing customer text does not override image resolution');
  assert.equal(await button.isEnabled(),true,'Green Haze must enable Generate in the same click');
  await page.locator('[data-welcome-mood="dream-blur"]').click();
  assert.equal((await field.inputValue()).trimEnd(),enteredText.trimEnd(),'Changing Moods preserves the user text');
  assert.equal(await page.locator('#image-composer-resolution').inputValue(),'1k',
    'Switching Moods preserves a compatible current resolution');
  assert.doesNotMatch(await button.getAttribute('data-credits')||'',/Confirming credits/i,
    'The preflight must not put Confirming credits inside Generate');
  assert.equal(await deck.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
    'Switching selected Moods must not collapse the Image deck');
  // The previous Mood's asynchronous bound price may still be settling.
  // Wait for the new Mood's preflight before submitting the single paid job.
  await page.waitForFunction(()=>!document.querySelector('#image-composer-generate')?.disabled,null,{timeout:9000});
  assert.equal(await button.isEnabled(),true,'Dream Blur must become ready without a second click');
  const heightBefore=await button.evaluate(el=>el.getBoundingClientRect().height);
  await button.click();
  assert.equal(await button.isDisabled(),true,'Second click is disabled until the first request is confirmed');
  await page.waitForFunction(()=>document.querySelector('#image-composer-status')?.textContent.includes('Preparing'),undefined,{timeout:15000});
  const timeout=Date.now()+25000;
  while(submissions<1&&Date.now()<timeout)await new Promise(done=>setTimeout(done,60));
  assert.equal(submissions,1,'One click must create exactly one paid job');
  assert.equal(requests.filter(x=>x.path==='/api/jobs'&&x.method==='POST').length,1);
  // Counting the mock request is earlier than its delayed 202 response. Do
  // not reopen Inspiration until the real completion handler has finished.
  await page.waitForFunction(()=>window.__welcomeMockSubmissionPending()===false);
  const submission=requests.find(x=>x.path==='/api/jobs'&&x.method==='POST');
  assert.equal(quotes.get(submission.data.quoteId)?.settings.resolution,'1k',
    'Paid submission must reuse the exact customer resolution from its bound quote');
  assert.equal(quotes.get(submission.data.quoteId)?.creditCost,20,
    'Mock credit cost must come from the 1K bound quote without repricing');
  assert.equal(requests.filter(x=>x.path==='/api/quotes').length>=1,true);
  assert.ok(quotes.size>=1);
  assert.equal(await deck.evaluate(el=>el.classList.contains('pv-deck-expanded')),true,
    'Submitting Generate must preserve the open editing deck');
  assert.equal(await button.evaluate(el=>el.getBoundingClientRect().height),heightBefore,
    'Generate dimensions must not change while checking price or submitting');
  // Simulate the first result becoming visible, without a paid provider call.
  // After the first result, History regains natural vertical scrolling.
  // The marketing footer remains outside Image Studio in both views.
  const historyRelease=await page.evaluate(()=>{
    document.getElementById('lab-welcome-start').hidden=true;
    document.getElementById('image-gallery-empty').hidden=true;
    const history=document.getElementById('history');
    const thumb=document.createElement('article');
    thumb.className='card';thumb.dataset.kind='image';thumb.dataset.deletable='true';
    history.append(thumb);
    window.__welcomeMockGalleryChanged();
    return {footer:getComputedStyle(document.querySelector('body>footer.pv-lab-footer')).display,
      overflow:getComputedStyle(document.documentElement).overflowY};
  });
  assert.equal(historyRelease.footer,'none',
    'Populated Image History must not expose the marketing footer');
  assert.notEqual(historyRelease.overflow,'hidden',
    'After first-image transition, the cascading gallery scroll is restored');
  assert.equal(await page.locator('#history-select').isVisible(),true,
    'After the first saved image, the customer gains the normal History Select action');
  await page.locator('#history-select').click();
  assert.equal(await page.locator('#history-selection').isVisible(),true);
  assert.notEqual(await page.locator('.image-gallery-shell').evaluate(el=>getComputedStyle(el).display),'grid',
    'Populated History retains its existing selection flow, never the welcome-only grid');
  await page.locator('#history-cancel-select').click();
  assert.equal(await page.locator('#history-selection').isVisible(),false);
  // The same six Mood cards reappear through Inspiration after a real History
  // result. Their background must be identical to the original welcome.
  await page.evaluate(()=>window.__welcomeMockInspiration(true));
  assert.equal(await page.locator('#lab-welcome-start').isVisible(),true);
  const inspirationSurface=await page.locator('.image-gallery-shell').evaluate(shell=>{
    const back=getComputedStyle(shell,'::before');
    const overlay=getComputedStyle(shell,'::after');
    return {image:back.backgroundImage,opacity:back.opacity,
      filter:back.filter,gradient:overlay.backgroundImage};
  });
  assert.equal(inspirationSurface.image,welcomeSurface.image,
    'Inspiration must use the same blue/copper background as first-image welcome');
  assert.equal(inspirationSurface.filter,'none','Inspiration must not restore the saturated/blurred wallpaper');
  assert.equal(inspirationSurface.opacity,'1');
  assert.equal(inspirationSurface.gradient,welcomeSurface.gradient,
    'Inspiration and welcome must use the same legibility overlay');
  const inspirationArrows=page.locator('.lab-welcome-carousel .inspiration-nav');
  await page.locator('.lab-welcome-carousel .inspiration-nav-next').waitFor({state:'visible'});
  const inspirationViewport=await page.evaluate(()=>{
    const prev=document.querySelector('.lab-welcome-carousel .inspiration-nav-prev');
    const next=document.querySelector('.lab-welcome-carousel .inspiration-nav-next');
    const track=document.getElementById('lab-welcome-presets');
    return {footer:getComputedStyle(document.querySelector('body>footer.pv-lab-footer')).display,
      viewportHeight:innerHeight,documentHeight:document.documentElement.scrollHeight,
      viewportWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,
      verticalOverflow:getComputedStyle(document.documentElement).overflowY,
      prevDisabled:prev.disabled,nextDisabled:next.disabled,
      controlsConnected:prev.getAttribute('aria-controls')===track.id&&next.getAttribute('aria-controls')===track.id};
  });
  assert.equal(inspirationViewport.footer,'none','Inspiration must not reveal the marketing footer');
  assert.equal(inspirationViewport.verticalOverflow,'hidden','Inspiration remains a static desktop workspace');
  assert.ok(inspirationViewport.documentHeight<=inspirationViewport.viewportHeight+3,
    'Inspiration must not add a second vertical section: '+JSON.stringify(inspirationViewport));
  assert.ok(inspirationViewport.documentWidth<=inspirationViewport.viewportWidth+3,
    'Inspiration background and cards must not create document horizontal scrolling: '+JSON.stringify(inspirationViewport));
  assert.equal(await inspirationArrows.count(),2,'A gallery has left and right controls');
  assert.ok(inspirationViewport.controlsConnected&&inspirationViewport.prevDisabled&&!inspirationViewport.nextDisabled,
    'Left arrow is visible but disabled at the start; next is actionable: '+JSON.stringify(inspirationViewport));

  // Discreet Mode is a distinct intentional backdrop and must win over the
  // Inspiration artwork while images are hidden.
  await page.locator('#history-preview-toggle').click();
  const privateBackground=await page.locator('.image-gallery-shell').evaluate(shell=>getComputedStyle(shell,'::before').backgroundImage);
  assert.match(privateBackground,/open-atmosphere-hd\.jpg/,
    'Discreet Mode keeps the original private-preview background');
  await page.locator('#history-preview-toggle').click();
  await page.evaluate(()=>window.__welcomeMockInspiration(false));
  assert.equal(await page.locator('#history').isVisible(),true,
    'Returning to populated History must restore the actual gallery');
  // Mobile regression: Inspiration must not appear below an empty, viewport-sized History.
  await page.setViewportSize({width:390,height:844});
  // History and first-image Inspiration must share the SAME compact editor,
  // without changing History scrolling, generated results or quote behavior.
  const historyCompact=await page.evaluate(()=>{
    const dock=document.getElementById('image-composer');
    const controls=dock.querySelector('.composer-controls');
    const names=['.composer-add-wrap','.scene-image-library-wrap','.composer-model-wrap','.composer-mood-control','.composer-mobile-more'];
    return {
      deckHeight:dock.getBoundingClientRect().height,
      row:names.map(name=>{
        const el=controls.querySelector(name);
        return {name,display:getComputedStyle(el).display,top:el.getBoundingClientRect().top};
      }),
      retouch:getComputedStyle(document.getElementById('image-composer-edit-area')).display,
      htmlOverflow:getComputedStyle(document.documentElement).overflowY,
      historyVisible:getComputedStyle(document.getElementById('history')).display
    };
  });
  // A deliberately expanded prompt retains its full 102px editing area;
  // the tools still occupy only one row, and long text is never clipped.
  assert.ok(historyCompact.deckHeight<305,
    'History must use the compact controls without collapsing an expanded prompt: '+JSON.stringify(historyCompact));
  assert.ok(historyCompact.row.every(x=>x.display!=='none'),
    'All essential History tools must remain visible: '+JSON.stringify(historyCompact));
  assert.ok(Math.max(...historyCompact.row.map(x=>x.top))-Math.min(...historyCompact.row.map(x=>x.top))<8,
    'History toolbar must fit one horizontal row: '+JSON.stringify(historyCompact));
  assert.equal(historyCompact.retouch,'none',
    'Retouch belongs under the same compact Options menu in History');
  assert.notEqual(historyCompact.htmlOverflow,'hidden',
    'Image History must remain vertically scrollable');
  const historyOptions=page.locator('#image-composer-mobile-more');
  await historyOptions.click();
  assert.equal(await historyOptions.getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('#image-composer-ratio').isVisible(),true,
    'History options must expose aspect ratio without replacing its value');
  await historyOptions.click();
  assert.equal(await historyOptions.getAttribute('aria-expanded'),'false');
  const mobileInspire=await page.locator('#history-moods-toggle').evaluate(button=>({
    width:button.getBoundingClientRect().width,
    visible:button.getBoundingClientRect().height>0,
    label:getComputedStyle(button.querySelector('.mood-view-label'),'::after').content
  }));
  assert.ok(mobileInspire.visible&&mobileInspire.width>=72,
    'Mobile History keeps an identifiable Inspiration button: '+JSON.stringify(mobileInspire));
  assert.equal(mobileInspire.label,'"Inspire"','The mobile sparkle carries its visible Inspire label');
  await page.locator('#history-moods-toggle').click();
  assert.equal(await page.locator('#lab-welcome-start').isVisible(),true);
  const mobileDiscovery=await page.evaluate(()=>{
    const r=id=>document.querySelector(id).getBoundingClientRect();
    return {
      headBottom:r('.image-studio .archivehead').bottom,
      welcomeTop:r('#lab-welcome-start').top,
      cardTop:r('#lab-welcome-start .lab-welcome-preset').top,
      dockTop:r('#image-composer').top,
      archivePadding:getComputedStyle(document.querySelector('.image-studio .archive')).paddingBottom,
      selectHidden:getComputedStyle(document.getElementById('history-select')).display==='none',
      refreshHidden:getComputedStyle(document.getElementById('refresh')).display==='none'
    };
  });
  if(mobileDiscovery.archivePadding!=='0px'){
    const inspect=await page.evaluate(()=>{
      const app=document.getElementById('app'),archive=document.querySelector('.image-studio .archive');
      const css=Array.from(document.styleSheets).find(s=>s.href?.includes('image-moods-return.css'));
      return {appClass:app.className,selectorMatch:archive.matches('#app.image-studio-active.pv-moods-discovery-open .image-studio .archive'),
        rect:archive.getBoundingClientRect().toJSON(),cssLoaded:!!css,cssHref:css?.href,
        open:!document.getElementById('lab-welcome-start').hidden,
        selectStyle:getComputedStyle(document.getElementById('history-select')).display,
        pointer:document.elementFromPoint(93,104)?.outerHTML?.slice(0,180)};
    });
    console.log('CHROME_INSPIRATION_DIAGNOSTIC',JSON.stringify(inspect),JSON.stringify(mobileDiscovery));
  }
  assert.equal(mobileDiscovery.archivePadding,'0px','Moods cannot retain History bottom spacer');
  assert.ok(mobileDiscovery.welcomeTop-mobileDiscovery.headBottom>=-5&&
    mobileDiscovery.welcomeTop-mobileDiscovery.headBottom<65,
    'Inspiration heading follows the toolbar without a black viewport: '+JSON.stringify(mobileDiscovery));
  assert.ok(mobileDiscovery.cardTop<mobileDiscovery.dockTop,
    'The first Mood images must be immediately visible above the floating composer: '+JSON.stringify(mobileDiscovery));
  assert.ok(mobileDiscovery.selectHidden&&mobileDiscovery.refreshHidden,
    'Hidden History cannot offer unusable Select or Refresh controls');
  const mobileSurface=await page.evaluate(()=>{
    const shell=document.querySelector('.image-gallery-shell');
    const archive=shell.querySelector('.image-gallery-host > .archive');
    const welcome=shell.querySelector('#image-gallery-empty');
    const backdrop=getComputedStyle(shell,'::before');
    return {shellHeight:shell.getBoundingClientRect().height,
      contentHeight:archive.getBoundingClientRect().height+welcome.getBoundingClientRect().height,
      minHeight:getComputedStyle(shell).minHeight,
      backgroundImage:backdrop.backgroundImage,
      backgroundSize:backdrop.backgroundSize,
      backdropHeight:parseFloat(backdrop.height),
      footer:getComputedStyle(document.querySelector('body>footer.pv-lab-footer')).display};
  });
  assert.ok(mobileSurface.minHeight==='0px',
    'Mobile Inspiration must not reserve the old viewport + 200px height: '+JSON.stringify(mobileSurface));
  assert.ok(mobileSurface.shellHeight<=mobileSurface.contentHeight+8,
    'Gallery height must follow actual visible content, without a black trailing void: '+JSON.stringify(mobileSurface));
  assert.match(mobileSurface.backgroundImage,/pvlab-subtle-cinematic-background-20261017\.webp/,
    'Keep the approved original photographic plate');
  assert.match(mobileSurface.backgroundSize,/100% 100%/,
    'On narrow phones show the complete cobalt/copper image, not the black center crop');
  assert.ok(Math.abs(mobileSurface.backdropHeight-mobileSurface.shellHeight)<4,
    'Mobile backdrop must cover the whole actual gallery: '+JSON.stringify(mobileSurface));
  assert.equal(mobileSurface.footer,'none',
    'Browsing Inspiration must not scroll into the marketing footer');
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  const mobileBottom=await page.evaluate(()=>{
    const last=document.querySelector('#lab-welcome-start .lab-welcome-preset');
    const dock=document.getElementById('image-composer');
    return {cardBottom:last.getBoundingClientRect().bottom,
      dockTop:dock.getBoundingClientRect().top,
      viewportHeight:innerHeight,
      scrollY:window.scrollY,
      documentHeight:document.documentElement.scrollHeight,
      documentWidth:document.documentElement.scrollWidth};
  });
  const visualGap=mobileBottom.dockTop-mobileBottom.cardBottom;
  assert.ok(visualGap<125,
    'No huge empty strip should separate last card and fixed Generate: '+JSON.stringify({visualGap,mobileBottom}));
  assert.ok(mobileBottom.documentWidth<=391,
    'The mobile background must not create horizontal scrolling');
  // The approved mobile deck has one tools row, a stable header and a real
  // secondary-options expander. No paid requests are made in this check.
  await page.waitForFunction(()=>document.getElementById('studio-header')?.classList.contains('pv-mobile-entry-condensed'));
  const compact=await page.evaluate(()=>{
    document.activeElement?.blur?.();
    const r=s=>document.querySelector(s).getBoundingClientRect();
    const css=s=>getComputedStyle(document.querySelector(s));
    const dock=r('#image-composer');
    const controls=document.querySelector('#image-composer .composer-controls');
    const essential=['.composer-add-wrap','.scene-image-library-wrap','.composer-model-wrap','.composer-mood-control','.composer-mobile-more'];
    return {headerHeight:r('#studio-header').height,dockHeight:dock.height,dockTop:dock.top,
      cardBottom:r('#lab-welcome-start .lab-welcome-preset').bottom,
      cardHeight:r('#lab-welcome-start .lab-welcome-preset').height,
      titleTop:r('#lab-welcome-start h2').top,
      essential:essential.map(s=>({selector:s,display:getComputedStyle(controls.querySelector(s)).display,
        top:controls.querySelector(s).getBoundingClientRect().top})),
      retouch:css('#image-composer-edit-area').display,
      ratio:css('#image-composer-ratio').display,
      lock:getComputedStyle(document.documentElement).overflowY};
  });
  assert.ok(compact.headerHeight>=76&&compact.headerHeight<=80,
    'Mobile welcome header must stay stable and compact: '+JSON.stringify(compact));
  assert.equal(compact.essential.every(x=>x.display!=='none'),true,
    'Upload, saved elements, model, Moods and Options must all remain visible');
  assert.ok(Math.max(...compact.essential.map(x=>x.top))-Math.min(...compact.essential.map(x=>x.top))<8,
    'Welcome tools must fit a single row: '+JSON.stringify(compact));
  assert.equal(compact.retouch,'none','Retouch is accessible through Options at rest');
  assert.equal(compact.lock,'hidden','Resting welcome must not bounce vertically');
  assert.ok(compact.cardHeight>=240,
    'Recovered toolbar space should enlarge the original mood photographs: '+JSON.stringify(compact));
  assert.ok(compact.cardBottom<compact.dockTop-5,
    'Both Mood photographs and their titles must clear the compact deck: '+JSON.stringify(compact));
  const mobileMore=page.locator('#image-composer-mobile-more');
  await mobileMore.click();
  assert.equal(await mobileMore.getAttribute('aria-expanded'),'true');
  const expandedControls=await page.evaluate(()=>{
    const deck=document.getElementById('image-composer');
    const retouch=document.getElementById('image-composer-edit-area');
    const ratio=document.getElementById('image-composer-ratio');
    return {state:deck.dataset.mobileSettings,
      retouchHidden:retouch.hidden,retouchDisplay:getComputedStyle(retouch).display,
      retouchRect:retouch.getBoundingClientRect().toJSON(),
      ratioHidden:ratio.hidden,ratioDisplay:getComputedStyle(ratio).display};
  });
  assert.equal(await page.locator('#image-composer-edit-area').isVisible(),!expandedControls.retouchHidden,
    'Expanded Options must respect whether Retouch is available for this model/source: '+JSON.stringify(expandedControls));
  assert.equal(await page.locator('#image-composer-ratio').isVisible(),true,
    'Aspect ratio must be accessible in expanded Options');
  assert.notEqual(await page.evaluate(()=>getComputedStyle(document.documentElement).overflowY),'hidden',
    'Options expansion must release the page scroll lock');
  await mobileMore.click();
  await page.evaluate(()=>document.activeElement?.blur?.());
  assert.equal(await mobileMore.getAttribute('aria-expanded'),'false');
  await page.locator('#history-moods-toggle').click();
  assert.equal(await page.locator('#history').isVisible(),true,
    'Mobile History resumes after closing Inspiration without losing results');
  assert.deepEqual(errors,[]);
  console.log('FIRST_IMAGE_INSTANT_QUOTED_GENERATE_OK=1');
}finally{
  await context.close();
  await browser.close();
  await new Promise(done=>server.close(done));
}
