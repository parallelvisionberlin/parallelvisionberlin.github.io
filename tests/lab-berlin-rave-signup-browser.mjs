// Actual Mood editor, service and session handshake; synthetic identity and API only.
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
mkdirSync('/tmp/pv-rave-conversion',{recursive:true});
const root=resolve('lab'),api='parallel-vision-lab.parallelvision.workers.dev';
const accountModule=`const account={isSignedIn:window.__returning,user:window.__returning?{id:'user_Campaign'}:null,session:window.__returning?session():null,
addListener(fn){listeners.add(fn);fn(account);return()=>listeners.delete(fn);},openSignIn(){setTimeout(()=>{account.isSignedIn=true;account.user={id:'user_Campaign'};account.session=session();for(const fn of listeners)fn(account);},0);}};
const listeners=new Set();function session(){return{id:'sess_Campaign',getToken:async()=> 'test.'+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.synthetic'};}
window.__raveAccount ||= account;export const isNativeLab=()=>false;export const loadLabAccount=async()=>window.__raveAccount;`;
const browser=await chromium.launch({headless:true,executablePath:process.env.PV_CHROMIUM_EXECUTABLE||undefined});
try{
for(const width of [320,390,1440])for(const returning of [false,true]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390}),page=await context.newPage();
  let initialized=returning,grants=0,jobs=0,uploads=0,quotes=0,balance=40;const errors=[];
  await page.addInitScript(returning=>{window.__returning=returning;localStorage.setItem('pv-lab-meta-consent','denied');},returning);
  page.on('pageerror',e=>{errors.push(e.message);console.log('BROWSER ERROR:',e.message);});
  let photo;
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    const json=(data,status=200,headers={})=>route.fulfill({status,headers:{'Access-Control-Allow-Origin':'https://pvlab.studio','Access-Control-Expose-Headers':'X-PV-Lab-Onboarding',...headers},contentType:'application/json',body:JSON.stringify(data)});
    if(url.hostname===api){
      if(url.pathname==='/api/public/local-currency')return json({currency:'EUR',rate:1,approximate:true});
      if(url.pathname==='/api/public/traffic')return json({ok:true});
      if(url.pathname==='/api/session')return initialized?json({customer:true,owner:false,ownerId:'user_Campaign',balanceCredits:balance,generationReady:balance>0,trialGenerationPaused:balance===0,billingReady:true,config:{enabled:true}}):json({error:'Setup required'},409,{'X-PV-Lab-Onboarding':'required'});
      if(url.pathname==='/api/migration/new'){assert.equal(req.method(),'POST');if(initialized)return json({error:'Already linked'},409);initialized=true;grants++;return json({linked:true},201);}
      if(url.pathname==='/api/uploads'){assert.ok(initialized);assert.equal(decodeURIComponent(req.headers()['x-filename']),'campaign-source.png');assert.deepEqual(req.postDataBuffer(),photo);uploads++;return json({id:'20000000-0000-4000-8000-'+String(uploads).padStart(12,'0')});}
      if(url.pathname==='/api/quotes'){quotes++;const body=req.postDataJSON();assert.equal(body.settings.moodId,'berlin-rave');assert.equal(body.settings.resolution,'1k');assert.equal(body.settings.referenceRoles[0].role,'base');return json({id:'quote-rave',provider:'SpicyAPI',settings:body.settings,maxUsd:.036,creditCost:20,expiresAt:Date.now()+180000});}
      if(url.pathname==='/api/jobs'&&req.method()==='POST'){assert.ok(balance>=20,'no generation beyond balance');balance-=20;jobs++;assert.deepEqual(req.postDataJSON(),{quoteId:'quote-rave',confirm:true});return json({job:{id:'job-rave-'+jobs,status:'queued'}},202);}
      if(/^\/api\/jobs\/job-rave-\d+\/performance$/.test(url.pathname))return json({ok:true});
      if(/^\/api\/jobs\/job-rave-\d+$/.test(url.pathname))return json({job:{id:url.pathname.split('/').at(-1),status:'completed',outputId:'output-rave'}});
      if(url.pathname==='/api/assets/output-rave')return route.fulfill({contentType:'image/png',body:photo});
      throw Error('Unexpected API route '+url.pathname);
    }
    if(url.hostname!=='pvlab.studio')return route.abort();
    if(url.pathname==='/account.html')return route.fulfill({contentType:'text/html',body:'<h1>Synthetic account destination</h1>'});
    if(url.pathname==='/native-account.js')return route.fulfill({contentType:'text/javascript',body:accountModule});
    const pathname=url.pathname==='/moods'?'/moods.html':url.pathname.replace(/^\/lab\//,'/');
    const path=resolve(root,'.'+pathname);
    if(!path.startsWith(root+'/')||!existsSync(path))return route.fulfill({status:404,body:''});
    const type=({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream';
    return route.fulfill({contentType:type,body:readFileSync(path)});
  });
  const url='https://pvlab.studio/moods?mood=berlin-rave&campaign=berlin-rave';
  await page.goto(url);
  await page.locator('#mc-look-dialog').waitFor({state:'visible'});
  photo=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=480;c.height=640;return c.toDataURL().split(',')[1];}),'base64');
  await page.locator('#mc-look-file').setInputFiles({name:'campaign-source.png',mimeType:'image/png',buffer:photo});
  if(!returning){
    await page.waitForFunction(()=>document.querySelector('#mc-look-status').textContent.includes('Sign in')).catch(async error=>{console.log('Signup test state:',await page.locator('#mc-look-status').textContent());console.log('File:',await page.locator('#mc-look-file').evaluate(e=>e.files[0]?.name));throw error;});
    assert.equal(uploads,0);assert.equal(jobs,0);
    await page.locator('#mc-look-continue').click();
  }
  await page.waitForFunction(()=>document.querySelector('#mc-look-credit-note').textContent.includes('20 credits')).catch(async error=>{console.log('Prepared quote state:',await page.locator('#mc-look-status').textContent(),{grants,uploads,quotes,jobs});throw error;});
  assert.equal(page.url(),url);assert.equal(grants,returning?0:1);
  assert.equal(await page.locator('#mc-look-file-label-text').textContent(),'campaign-source.png');
  assert.equal(await page.locator('#mc-look-file-preview').isVisible(),true);assert.equal(uploads,1);
  assert.match(await page.locator('#mc-look-title').textContent(),/Berlin Rave/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(jobs,0);assert.equal(quotes,1);
  await page.locator('#mc-look-continue').click();
  await page.locator('#mc-look-result-download').waitFor({state:'visible'});
  assert.equal(jobs,1);assert.equal(grants,returning?0:1);assert.equal(page.url(),url);
  await page.waitForFunction(()=>document.querySelector('#mc-look-result-balance').textContent==='20 credits left');
  assert.equal(await page.locator('#mc-look-result-pack').isVisible(),false);
  await page.locator('#mc-look-result-again').click();
  await page.waitForFunction(()=>document.querySelector('#mc-look-credit-note').textContent.includes('20 credits'));
  assert.equal(jobs,1,'Make another only prepares; Generate requires a click');
  await page.locator('#mc-look-continue').click();
  await page.locator('#mc-look-result-pack').waitFor({state:'visible'});
  assert.equal(jobs,2);assert.equal(balance,0);assert.equal(uploads,1,'Original photo is retained');
  assert.equal(await page.locator('#mc-look-pack-count').textContent(),'15 more images.','300 / actual 20-credit quote, not a hardcoded 12');
  assert.equal(await page.locator('#mc-look-pack-context').textContent(),'Berlin Rave · 1K resolution');
  assert.match(await page.locator('.mc-credit-terms').textContent(),/One-time payment.*No subscription/s);
  assert.equal(await page.locator('#mc-look-result-again').isVisible(),false,'One primary pack action after exhaustion');
  assert.equal(await page.locator('.mc-look-dialog-media').isVisible(),false,'Do not repeat the Mood poster above the finished photo');
  assert.equal(await page.locator('.mc-credit-plans').getAttribute('href'),'./#pricing');
  await page.locator('.mc-photobooth-header img').waitFor({state:'visible'});
  assert.ok(await page.locator('.mc-photobooth-header img').evaluate(el=>el.complete&&el.naturalWidth>0),'Canonical logo loads in exhausted-credit view');
  const layout=await page.locator('#mc-look-dialog').evaluate(d=>{
    const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};};
    return {dialog:box(d),art:box(d.querySelector('.mc-look-result-artwork')),offer:box(d.querySelector('#mc-look-result-pack')),overflow:d.scrollWidth>d.clientWidth+1};
  });
  assert.equal(layout.overflow,false,'No horizontal offer overflow');
  assert.ok(layout.dialog.x>=0&&layout.dialog.right<=width,'Dialog stays in viewport');
  assert.ok(width>700?layout.offer.x>=layout.art.right:layout.offer.y>=layout.art.bottom,'Desktop side by side, phone stacked');
  const resultBefore=await page.locator('#mc-look-result-image').getAttribute('src');
  const popupPromise=page.waitForEvent('popup');
  await page.locator('.mc-credit-buy').click();
  const popup=await popupPromise;await popup.waitForLoadState();
  assert.equal(popup.url(),'https://pvlab.studio/account.html?pack=topup3#balance');
  assert.equal(page.url(),url);assert.equal(jobs,2,'No automatic checkout or generation');
  assert.equal(await page.locator('#mc-look-result-image').getAttribute('src'),resultBefore);
  assert.equal(await page.locator('#mc-look-file-label-text').textContent(),'campaign-source.png');
  const reject=page.getByRole('button',{name:'Reject',exact:true});
  if(await reject.isVisible())await reject.click();
  await page.screenshot({path:'/tmp/pv-rave-conversion/result-'+width+'-'+returning+'.png'});
  // Simulate a completed external purchase in the wallet, not a payment request.
  balance=300;await popup.close();await page.bringToFront();
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(()=>document.querySelector('#mc-look-result-balance').textContent==='300 credits left');
  assert.equal(await page.locator('#mc-look-result-image').getAttribute('src'),resultBefore);
  assert.equal(await page.locator('#mc-look-result-pack').isVisible(),false);
  await page.locator('#mc-look-result-again').click();
  await page.waitForFunction(()=>document.querySelector('#mc-look-credit-note').textContent.includes('20 credits'));
  assert.equal(jobs,2,'Returning after purchase still requires Generate');
  assert.equal(await page.locator('#mc-look-file-label-text').textContent(),'campaign-source.png');
  assert.deepEqual(errors,[]);
  console.log('PASS '+width+'px '+(returning?'returning':'new signup')+': full grant, focused pack tab, retained result/photo, purchase return, explicit Generate');
  await context.close();
}
}finally{await browser.close();}
