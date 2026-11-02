// Actual Mood editor, service and session handshake; synthetic identity and API only.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root=resolve('lab'),api='parallel-vision-lab.parallelvision.workers.dev';
const accountModule=`const account={isSignedIn:window.__returning,user:window.__returning?{id:'user_Campaign'}:null,session:window.__returning?session():null,
addListener(fn){listeners.add(fn);fn(account);return()=>listeners.delete(fn);},openSignIn(){setTimeout(()=>{account.isSignedIn=true;account.user={id:'user_Campaign'};account.session=session();for(const fn of listeners)fn(account);},0);}};
const listeners=new Set();function session(){return{id:'sess_Campaign',getToken:async()=> 'test.'+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.synthetic'};}
window.__raveAccount ||= account;export const isNativeLab=()=>false;export const loadLabAccount=async()=>window.__raveAccount;`;
const browser=await chromium.launch({headless:true,executablePath:process.env.PV_CHROMIUM_EXECUTABLE||undefined});
try{
for(const width of [390,1440])for(const returning of [false,true]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  let initialized=returning,grants=0,jobs=0,uploads=0,quotes=0;const errors=[];
  await page.addInitScript(returning=>{window.__returning=returning;localStorage.setItem('pv-lab-meta-consent','denied');},returning);
  page.on('pageerror',e=>{errors.push(e.message);console.log('BROWSER ERROR:',e.message);});
  page.on('console',m=>{if(m.type()==='error')console.log('BROWSER CONSOLE:',m.text());});
  let photo;
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    const json=(data,status=200,headers={})=>route.fulfill({status,headers:{'Access-Control-Allow-Origin':'https://pvlab.studio','Access-Control-Expose-Headers':'X-PV-Lab-Onboarding',...headers},contentType:'application/json',body:JSON.stringify(data)});
    if(url.hostname===api){
      if(url.pathname==='/api/public/traffic')return json({ok:true});
      if(url.pathname==='/api/session')return initialized?json({customer:true,owner:false,ownerId:'user_Campaign',balanceCredits:40,generationReady:true,billingReady:true,config:{enabled:true}}):json({error:'Setup required'},409,{'X-PV-Lab-Onboarding':'required'});
      if(url.pathname==='/api/migration/new'){assert.equal(req.method(),'POST');assert.equal(initialized,false);initialized=true;grants++;return json({linked:true},201);}
      if(url.pathname==='/api/uploads'){assert.ok(initialized);uploads++;return json({id:'20000000-0000-4000-8000-'+String(uploads).padStart(12,'0')});}
      if(url.pathname==='/api/quotes'){quotes++;const body=req.postDataJSON();assert.equal(body.settings.moodId,'berlin-rave');assert.equal(body.settings.resolution,'1k');assert.equal(body.settings.referenceRoles[0].role,'base');return json({id:'quote-rave',provider:'SpicyAPI',settings:body.settings,maxUsd:.036,creditCost:20,expiresAt:Date.now()+180000});}
      if(url.pathname==='/api/jobs'&&req.method()==='POST'){jobs++;assert.deepEqual(req.postDataJSON(),{quoteId:'quote-rave',confirm:true});return json({job:{id:'job-rave',status:'queued'}},202);}
      if(url.pathname==='/api/jobs/job-rave/performance')return json({ok:true});
      if(url.pathname==='/api/jobs/job-rave')return json({job:{id:'job-rave',status:'completed',outputId:'output-rave'}});
      if(url.pathname==='/api/assets/output-rave')return route.fulfill({contentType:'image/png',body:photo});
      throw Error('Unexpected API route '+url.pathname);
    }
    if(url.hostname!=='pvlab.studio')return route.abort();
    if(url.pathname==='/native-account.js')return route.fulfill({contentType:'text/javascript',body:accountModule});
    const pathname=url.pathname==='/moods'?'/moods.html':url.pathname.replace(/^\/lab\//,'/');
    const path=resolve(root,'.'+pathname);
    if(!path.startsWith(root+'/')||!existsSync(path))return route.fulfill({status:404,body:''});
    const type=({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'})[extname(path)]||'application/octet-stream';
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
  assert.equal(await page.locator('#mc-look-file').evaluate(el=>el.files[0].name),'campaign-source.png');
  assert.match(await page.locator('#mc-look-title').textContent(),/Berlin Rave/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(jobs,0);assert.equal(quotes,1);
  await page.locator('#mc-look-continue').click();
  await page.locator('#mc-look-result-download').waitFor({state:'visible'});
  assert.equal(jobs,1);assert.equal(grants,returning?0:1);assert.equal(page.url(),url);
  assert.deepEqual(errors,[]);
  console.log('PASS '+width+'px '+(returning?'returning':'new signup')+': photo, Mood, campaign URL, one mocked job');
  await context.close();
}
}finally{await browser.close();}
