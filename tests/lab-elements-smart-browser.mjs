// Focused, mock-only Elements browser test. No generation, training or spending.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('.');
const source=readFileSync('lab/lab.js','utf8');
const start=source.indexOf("try{clerk=await loadLabAccount();");
const end=source.indexOf("\n// Soul composer:",start);
assert.ok(start>0&&end>start,'Expected tested account bootstrap');
const testSource=source.slice(0,start)+source.slice(end)+
  "clerk={isSignedIn:true,user:{id:'elements-test'},session:{id:'mock',getToken:async()=> 'mock-token'},signOut:async()=>{}};owner=true;userId='elements-test';config={enabled:true,geminiEnabled:true,falEnabled:true,dailyLimitUsd:10,concurrency:{image:4,video:1}};$('app').hidden=false;$('gate').hidden=true;await loadHistory();await loadPacks();await loadSoulProIdentity();refreshCanvasImport();update();syncVideoStudioMode();window.__pvLabFinishBoot?.();window.__elementsBrowserReady=true;";
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  const file=resolve(root,'.'+u.pathname+(u.pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp'})[extname(file)]||'text/plain');
  res.end(u.pathname==='/lab/lab.js'?testSource:readFileSync(file));
});
await new Promise(ok=>server.listen(4189,'127.0.0.1',ok));
const id=n=>'ad4b7111-39f4-47a9-898b-'+String(n).padStart(12,'0');
const room={id:id(1),name:'PVSCENE1|locations|MyRoom',created_at:Date.now(),
  refs:[{id:id(101),name:'room-a.webp',role:'room',note:'Preserve the real room'},
        {id:id(102),name:'room-b.webp',role:'room',note:'Preserve the real room'},
        {id:id(103),name:'room-c.webp',role:'room',note:'Preserve the real room'},
        {id:id(104),name:'room-d.webp',role:'room',note:'Preserve the real room'}],
  profile:{version:1,category:'locations',summary:'One real room with a wooden door, bookshelf and window.',
    signature:'Preserve the same floor plan, room dimensions, furnishings and spatial landmarks.',
    landmarks:['door','bookshelf','window'],
    shots:[{index:0,description:'door view',keywords:['door']},
           {index:1,description:'bed view',keywords:['bed']},
           {index:2,description:'window view',keywords:['window']},
           {index:3,description:'wide view',keywords:['wide']}]}
};
const nina={id:id(2),name:'PVSCENE1|characters|Nina FOK',created_at:Date.now(),
  refs:[{id:id(201),name:'nina-front.webp',role:'identity',note:'Nina face'},
        {id:id(202),name:'nina-side.webp',role:'identity',note:'Nina face'},
        {id:id(203),name:'nina-back.webp',role:'identity',note:'Nina face'},
        {id:id(204),name:'nina-three-quarter.webp',role:'identity',note:'Nina face'}],
  profile:{version:1,category:'characters',summary:'One consistent female editorial portrait subject with dark hair.',
    signature:'Preserve the facial geometry, hairline, eye spacing and distinctive facial structure.',
    landmarks:['dark hair'],shots:[0,1,2,3].map(i=>({index:i,description:'portrait angle',keywords:['portrait']}))}
};
const media=readFileSync('lab/scene-hero-art/locations.webp');
const savedPacks=[room,nina];
let nextUpload=20000,saveCount=0;
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage();
const errors=[];
page.on('pageerror',err=>errors.push(err.message));
await page.route('https://**/*',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  if(!url.hostname.endsWith('parallelvision.workers.dev'))return route.abort();
  if(path.startsWith('/api/assets/'))return route.fulfill({
    status:200,contentType:'image/webp',body:media
  });
  if(path==='/api/jobs')return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({jobs:[],activeJobs:[],next:null,concurrency:{image:4,video:1}})});
  if(path==='/api/uploads'&&route.request().method()==='POST')
    return route.fulfill({status:201,contentType:'application/json',
      body:JSON.stringify({id:id(nextUpload++)})});
  if(path==='/api/packs'&&route.request().method()==='POST'){
    const request=route.request().postDataJSON();
    const record={id:id(30000+saveCount++),name:request.name,created_at:Date.now(),
      refs:request.referenceSourceIds.map((assetId,i)=>({id:assetId,...request.referenceRoles[i]}))};
    savedPacks.push(record);
    return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({id:record.id})});
  }
  if(path==='/api/packs')return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({packs:savedPacks})});
  if(path==='/api/soul-pro/identity')return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({configured:false,count:0,refs:[]})});
  return route.fulfill({status:200,contentType:'application/json',body:'{}'});
});
try{
  await page.goto('http://127.0.0.1:4189/lab/studio.html?tool=image');
  await page.waitForFunction(()=>window.__elementsBrowserReady===true,{timeout:30000});
  await page.locator('#lab-boot').waitFor({state:'hidden',timeout:5000});
  await page.locator('#tool-image').click();
  const text=page.locator('#image-composer-prompt');
  await text.fill('Nina posing by the window in @My');
  await page.locator('#scene-element-suggestions .scene-element-choice').filter({hasText:'@MyRoom'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('#image-composer-references .composer-element-tile').length===1&&
    document.querySelectorAll('#reference-list .reference-element-item').length===1,{timeout:20000});
  await page.waitForFunction(()=>document.getElementById('scene-done')?.disabled===false,null,{timeout:20000});
  assert.equal(await page.locator('#scene-element-suggestions').isVisible(),false,
    'Selecting @MyRoom closes the suggestion list without waiting for more typing');
  assert.match(await text.inputValue(),/@MyRoom$/,'The selected @mention remains in the prompt');
  await text.press('End');
  await text.type(' ');
  assert.equal(await page.locator('#scene-element-suggestions').isVisible(),false,
    'Typing after a committed @MyRoom must not reopen its own suggestion');
  await text.type('and @Ni');
  assert.equal(await page.locator('#scene-element-suggestions .scene-element-choice').filter({hasText:'@Nina FOK'}).isVisible(),true,
    'A new @mention opens a fresh list, even when another Element was selected');
  assert.equal(await page.locator('#image-composer-references .composer-reference-role').count(),0,
    'One Element should not show repeated Environment selectors');
  assert.match(await page.locator('.composer-element-tile .composer-reference-index').innerText(),/@MyRoom/);
  assert.match(await page.locator('#composer-reference-intent-toggle').innerText(),/References only/i);
  await text.fill('Nina sitting on the bed inside @Nina');
  await page.locator('#scene-element-suggestions .scene-element-choice').filter({hasText:'@Nina FOK'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('#image-composer-references .composer-element-tile').length===2,{
    timeout:20000
  });
  await page.waitForFunction(()=>document.getElementById('scene-done')?.disabled===false,null,{timeout:20000});
  assert.equal(await page.locator('#scene-element-suggestions').isVisible(),false,
    'Selecting @Nina FOK also closes suggestions while keeping both Element thumbnails');
  assert.equal(await page.locator('#reference-list .reference-element-item').count(),2,
    'Two Elements have two grouped advanced entries');
  assert.equal(await page.locator('#image-composer-references .composer-reference-role').count(),0);
  const compiled=await page.locator('#reference-guidance-text').textContent();
  assert.match(compiled,/ELEMENT CONTINUITY/);
  assert.match(compiled,/@MyRoom/);
  assert.match(compiled,/@Nina FOK/);
  await page.locator('.composer-element-tile').first().locator('.composer-reference-remove').click();
  await page.waitForFunction(()=>document.querySelectorAll('.composer-element-tile').length===1);
  assert.match(await page.locator('.composer-element-tile').first().innerText(),/@Nina FOK/);
  // A Scene Library card must close the modal only after the Element is fully
  // attached, leaving the original Image prompt and history/deck flow intact.
  const preservedDirection='A photographic portrait inside the same room';
  await text.fill(preservedDirection);
  await page.locator('#scene-image-open').click();
  await page.locator('#scene-menu-elements').click();
  await page.locator('#scene-image-menu [data-scene-target="locations"]').click();
  await page.locator('#scene-library-dialog[open]').waitFor();
  // The long technical note lives behind the compact About Elements control.
  assert.equal(await page.locator('#scene-library-footnote').count(),0,
    'Do not show the legacy technical paragraph at the bottom of the browser');
  assert.equal(await page.locator('#scene-browser-foot').isVisible(),false,
    'A browser without a status message has no empty footer or border');
  const info=page.locator('#scene-elements-info');
  assert.equal(await info.isVisible(),false);
  await page.locator('#scene-elements-info-toggle').click();
  assert.equal(await info.isVisible(),true);
  assert.equal(await page.locator('#scene-elements-info-toggle').getAttribute('aria-expanded'),'true');
  assert.match(await info.innerText(),/reusable visual references/);
  assert.match(await info.innerText(),/Google Gemini/);
  await page.keyboard.press('Escape');
  assert.equal(await info.isVisible(),false,'Escape dismisses the info panel');
  assert.equal(await page.locator('#scene-library-dialog').evaluate(node=>node.open),true,
    'Escape must not close Elements while the info panel is open');
  await page.locator('#scene-elements-info-toggle').click();
  await page.locator('#scene-tabs .scene-category-tab.is-selected').click();
  assert.equal(await info.isVisible(),false,'Clicking outside the panel dismisses it');
  await page.setViewportSize({width:390,height:820});
  assert.equal(await page.locator('#scene-elements-info-toggle-mobile').isVisible(),true,
    'About Elements remains accessible on mobile');
  await page.locator('#scene-elements-info-toggle-mobile').click();
  assert.equal(await info.isVisible(),true);
  await page.locator('#scene-elements-info-toggle-mobile').click();
  assert.equal(await info.isVisible(),false);
  await page.setViewportSize({width:1440,height:900});
  await page.locator('#scene-grid .scene-card').filter({hasText:'MyRoom'}).locator('.scene-use').click();
  await page.waitForFunction(()=>{
    const dialog=document.getElementById('scene-library-dialog');
    return !dialog.open&&!!document.querySelector('#image-composer-references .composer-element-tile')
      &&Array.from(document.querySelectorAll('#image-composer-references .composer-reference-index'))
        .some(marker=>marker.textContent==='@MyRoom');
  },null,{timeout:20000});
  assert.equal(await page.locator('#image-composer').isVisible(),true,
    'Use in scene returns to the original floating Image deck');
  assert.equal(await text.inputValue(),preservedDirection,
    'The saved @MyRoom Element must not overwrite or inject literal text into the prompt');
  assert.equal(await page.locator('#reference-list .reference-element-item').count(),2,
    'Both saved Elements remain grouped and the original one is preserved');
  // Switching categories from an unsaved Element must never silently erase it
  // or leave the Create view stranded beneath a newly selected sidebar tab.
  await page.locator('#scene-image-open').click();
  await page.locator('#scene-menu-elements').click();
  await page.locator('#scene-image-menu [data-scene-target="characters"]').click();
  await page.locator('#scene-new').click();
  await page.locator('#scene-name').fill('Unsaved Nina Draft');
  await page.locator('#scene-tabs .scene-category-tab').filter({hasText:'Locations'}).click();
  assert.equal(await page.locator('#scene-leave-confirm').isVisible(),true,
    'Switching categories with an unsaved name offers save/discard/stay');
  assert.equal(await page.locator('#scene-name').inputValue(),'Unsaved Nina Draft');
  await page.locator('#scene-leave-stay').click();
  assert.equal(await page.locator('#scene-leave-confirm').isVisible(),false);
  assert.equal(await page.locator('#scene-create').isVisible(),true);
  assert.equal(await page.locator('#scene-name').inputValue(),'Unsaved Nina Draft',
    'Keep editing must preserve the entire draft');
  await page.locator('#scene-tabs .scene-category-tab').filter({hasText:'Locations'}).click();
  await page.locator('#scene-leave-save').click();
  assert.equal(await page.locator('#scene-create').isVisible(),true,
    'Invalid Save & continue must not leave an incomplete character draft');
  assert.equal(await page.locator('#scene-toast').isVisible(),true,
    'A failed save validation is visible without scrolling');
  assert.match(await page.locator('#scene-toast-message').innerText(),/at least one photograph/i);
  await page.locator('#scene-toast-dismiss').click();
  await page.locator('#scene-tabs .scene-category-tab').filter({hasText:'Locations'}).click();
  await page.locator('#scene-leave-discard').click();
  assert.equal(await page.locator('#scene-library-title').innerText(),'Locations');
  assert.equal(await page.locator('#scene-browser').isVisible(),true);
  assert.equal(await page.locator('#scene-create').isVisible(),false);
  assert.equal(savedPacks.length,2,'Discard must not upload or save anything');

  await page.locator('#scene-new').click();
  await page.locator('#scene-name').fill('New Room Test');
  const ninePhotos=Array.from({length:9},(_,i)=>({
    name:'room-angle-'+(i+1)+'.webp',mimeType:'image/webp',buffer:media
  }));
  await page.locator('#scene-files').setInputFiles(ninePhotos);
  assert.equal(await page.locator('#scene-toast').isVisible(),true,
    'An eight-image limit should be a visible notification, not a footer message');
  assert.match(await page.locator('#scene-toast-message').innerText(),/up to eight images/i);
  assert.equal(await page.locator('#scene-photos .scene-photo').count(),0,
    'Too many incoming images are rejected as a batch');
  const toastLocation=await page.locator('#scene-toast').evaluate(element=>{
    const r=element.getBoundingClientRect();
    return {top:r.top,bottom:r.bottom,viewport:innerHeight};
  });
  assert.ok(toastLocation.top>=0&&toastLocation.bottom<=toastLocation.viewport,
    'The notification must remain inside the visible viewport even when the form can scroll: '+JSON.stringify(toastLocation));
  await page.locator('#scene-toast-dismiss').click();
  assert.equal(await page.locator('#scene-toast').isVisible(),false,
    'The toast X dismisses it immediately');
  assert.equal(await page.locator('#scene-create').isVisible(),true);
  await page.setViewportSize({width:390,height:820});
  await page.locator('#scene-files').setInputFiles(ninePhotos);
  const mobileToast=await page.locator('#scene-toast').evaluate(element=>{
    const r=element.getBoundingClientRect();
    return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight};
  });
  assert.ok(mobileToast.left>=0&&mobileToast.right<=mobileToast.width
    &&mobileToast.top>=0&&mobileToast.bottom<=mobileToast.height,
    'The dismissible notification must remain visible at 390px: '+JSON.stringify(mobileToast));
  await page.locator('#scene-toast-dismiss').click();
  await page.setViewportSize({width:1440,height:900});

  // Valid Save & continue stores the draft once, then switches to the chosen
  // category. No generation job is submitted.
  await page.locator('#scene-files').setInputFiles([{
    name:'single-room.webp',mimeType:'image/webp',buffer:media
  }]);
  await page.locator('#scene-smart-analyze').uncheck();
  await page.locator('#scene-tabs .scene-category-tab').filter({hasText:'Outfits'}).click();
  assert.equal(await page.locator('#scene-leave-confirm').isVisible(),true);
  await page.locator('#scene-leave-save').click();
  await page.waitForFunction(()=>document.querySelector('#scene-library-title')?.textContent==='Outfits'
    &&document.getElementById('scene-create').hidden===true,null,{timeout:20000});
  assert.equal(await page.locator('#scene-library-title').innerText(),'Outfits');
  assert.equal(await page.locator('#scene-browser').isVisible(),true);
  assert.equal(savedPacks.length,3,'Save & continue creates the saved Element exactly once');
  assert.equal(savedPacks[2].name,'PVSCENE1|locations|New Room Test');

  // Closing another unsaved draft, including Escape, uses the same guard.
  await page.locator('#scene-new').click();
  await page.locator('#scene-name').fill('Unsaved Outfit');
  await page.locator('#scene-close').click();
  assert.equal(await page.locator('#scene-leave-confirm').isVisible(),true);
  await page.locator('#scene-leave-stay').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#scene-leave-confirm').isVisible(),true);
  await page.locator('#scene-leave-discard').click();
  assert.equal(await page.locator('#scene-library-dialog').isVisible(),false);
  assert.equal(savedPacks.length,3,'Dismissed drafts must not be saved');

  assert.deepEqual(errors,[]);
  console.log('PASS Elements unsaved draft navigation, save/discard/keep and visible eight-image toast');
  console.log('PASS two saved Elements attach as two compact chips, no repeated roles or provider jobs');
}finally{
  await context.close();
  await browser.close();
  await new Promise(done=>server.close(done));
}
