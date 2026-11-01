import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSessionRequest} from '../lab/session-request.js';

const token='synthetic.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.only';
const session={id:'sess_fixture',getToken:async()=>token};
const needsSetup=()=>Response.json({error:'Setup required.'},{status:409,headers:{'X-PV-Lab-Onboarding':'required'}});
function browser(hostname,pathname='/studio.html'){
 const replaced=[];
 return {location:{hostname,pathname,search:'?tool=image',hash:'',origin:'https://'+hostname,replace(url){replaced.push(url);}},replaced};
}
async function inBrowser(hostname,pathname,run){
 const previous=globalThis.window,current=browser(hostname,pathname);
 try{globalThis.window=current;return await run(current);}
 finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
}
test('Fresh homepage sign-ins finish setup in place and preserve the current URL',async()=>{
 for(const host of ['pvlab.studio','www.pvlab.studio','pvlab-studio.pages.dev']){
  for(const pathname of ['/','/index.html'])await inBrowser(host,pathname,async current=>{
   current.location.search='?source=google';current.location.hash='#pricing';
   let initialized=false;const calls=[];
   const request=createSessionRequest({baseUrl:'https://lab.example',getSession:()=>session,fetchImpl:async(url,init)=>{
    const path=new URL(url).pathname;calls.push(path);
    if(path==='/api/migration/new'){assert.equal(init.method,'POST');initialized=true;return Response.json({linked:true},{status:201});}
    return initialized?Response.json({customer:true,owner:false,balanceCredits:0,accountClosed:null}):needsSetup();
   }});
   const response=await request('/api/session');assert.equal(response.status,200);
   assert.deepEqual(await response.json(),{customer:true,owner:false,balanceCredits:0,accountClosed:null});
   assert.deepEqual(calls,['/api/session','/api/migration/new','/api/session']);
   assert.deepEqual(current.replaced,[]);
   assert.equal(current.location.pathname,pathname);assert.equal(current.location.search,'?source=google');assert.equal(current.location.hash,'#pricing');
  });
 }
});
test('Berlin Rave campaign signs up in place and keeps the Mood and photo editor',async()=>{
 for(const pathname of ['/moods','/moods/'])await inBrowser('pvlab.studio',pathname,async current=>{
  current.location.search='?mood=berlin-rave&campaign=berlin-rave';
  let initialized=false;const calls=[];
  const fetchImpl=async(url,init)=>{
   const route=new URL(url).pathname;calls.push(route);
   if(route==='/api/migration/new'){assert.equal(init.method,'POST');initialized=true;return Response.json({linked:true},{status:201});}
   if(route==='/api/session')return initialized
    ? Response.json({customer:true,owner:false,balanceCredits:40,generationReady:true,ownerId:'user_PvLabV2Campaign'})
    :needsSetup();
   throw Error('Unexpected route '+route);
  };
  const request=createSessionRequest({baseUrl:'https://lab.example',getSession:()=>session,fetchImpl});
  const result=await request('/api/session');
  assert.equal(result.status,200);
  assert.equal((await result.json()).balanceCredits,40);
  assert.deepEqual(calls,['/api/session','/api/migration/new','/api/session']);
  assert.deepEqual(current.replaced,[],'must not redirect to Studio and lose the selected photograph');
  assert.equal(current.location.search,'?mood=berlin-rave&campaign=berlin-rave');
 });
});

test('Other account pages retain Studio setup routing, while unrelated hosts cannot auto-provision',async()=>{
 for(const pathname of ['/account','/account.html'])await inBrowser('pvlab.studio',pathname,async current=>{
  const request=createSessionRequest({baseUrl:'https://lab.example',getSession:()=>session,fetchImpl:async()=>needsSetup()});
  assert.equal((await request('/api/session')).status,409);assert.equal(new URL(current.replaced[0]).pathname,'/studio');
 });
 for(const host of ['parallelvisionlabel.com','www.parallelvisionlabel.com','evil.pvlab.studio'])await inBrowser(host,'/',async current=>{
  let calls=0;
  const request=createSessionRequest({baseUrl:'https://lab.example',getSession:()=>session,fetchImpl:async()=>{calls++;return needsSetup();}});
  assert.equal((await request('/api/session')).status,409);assert.equal(calls,1);assert.deepEqual(current.replaced,[]);
 });
});
test('Both /studio and /studio.html initialize a verified new account in place, without navigation',async()=>{
 for(const pathname of ['/studio','/studio.html']){
 await inBrowser('pvlab.studio',pathname,async current=>{
  let initialized=false;const calls=[],grants=[];
  const fetchImpl=async(url,options)=>{
   const path=new URL(url).pathname;calls.push(path);
   if(path==='/api/session')return initialized
     ? Response.json({customer:true,owner:false,balanceCredits:200,ownerId:'user_PvLabV2Fresh'})
     : needsSetup();
   if(path==='/api/migration/new'){assert.equal(options.method,'POST');initialized=true;return Response.json({linked:true,kind:'customer'},{status:201});}
   throw Error('Unexpected fetch '+path);
  };
  const request=createSessionRequest({baseUrl:'https://lab.example',getSession:()=>session,fetchImpl,onNewCustomer:grant=>grants.push(grant)});
  const first=await request('/api/session');
  assert.equal(first.status,200);
  assert.equal((await first.json()).balanceCredits,200);
  assert.deepEqual(calls,['/api/session','/api/migration/new','/api/session']);
  assert.equal(grants.length,1);
  assert.deepEqual(grants[0],{credits:200,ownerId:'user_PvLabV2Fresh',sessionId:'sess_fixture'});
  await request('/api/session');assert.equal(grants.length,1,'second login never repeats welcome');
  assert.deepEqual(current.replaced,[],pathname+': canonical Studio never redirects during setup');
 });
 }
});
test('Extensionless Studio handles already-created accounts and concurrent 409 without redirect loops',async()=>{
 await inBrowser('pvlab.studio','/studio',async current=>{
  const calls=[],grants=[];
  let initialized=false;
  const fetchImpl=async(url,options)=>{
   const path=new URL(url).pathname;calls.push(path);
   if(path==='/api/session')return initialized
     ? Response.json({customer:true,owner:false,balanceCredits:200,ownerId:'user_PvLabV2New'})
     : needsSetup();
   if(path==='/api/migration/new'){initialized=true;return Response.json({error:'Already linked.'},{status:409});}
   throw Error('Unexpected API path');
  };
  const request=createSessionRequest({baseUrl:'https://lab.example',getSession:()=>session,fetchImpl,onNewCustomer:grant=>grants.push(grant)});
  const response=await request('/api/session');
  assert.equal(response.status,200,'another tab finishing setup is not a sign-out');
  assert.equal((await response.json()).balanceCredits,200);
  assert.deepEqual(calls,['/api/session','/api/migration/new','/api/session']);
  assert.equal(grants.length,0,'a pre-existing wallet does not receive a second welcome');
  assert.deepEqual(current.replaced,[],'canonical Studio must never redirect on onboarding conflicts');
 });
});
test('Legacy account transfer does not auto-provision a second customer wallet',async()=>{
 for(const pathname of ['/connect-account','/connect-account.html']){
  await inBrowser('pvlab.studio',pathname,async current=>{
   const calls=[];
   const request=createSessionRequest({baseUrl:'https://lab.example',getSession:()=>session,fetchImpl:async(url)=>{calls.push(new URL(url).pathname);return needsSetup();}});
   assert.equal((await request('/api/session')).status,409);
   assert.deepEqual(calls,['/api/session']);
   assert.deepEqual(current.replaced,[]);
  });
 }
});
test('Do not create a wallet for paid endpoints or from unmarked 409s',async()=>{
 for(const pathname of ['/','/studio'])await inBrowser('pvlab.studio',pathname,async()=>{
  let count=0;
  const request=createSessionRequest({baseUrl:'https://lab.example',getSession:()=>session,fetchImpl:async()=>{
   count++;return needsSetup();
  }});
  assert.equal((await request('/api/billing/checkout',{method:'POST'})).status,409);
  assert.equal(count,1);
  const unmarked=createSessionRequest({baseUrl:'https://lab.example',getSession:()=>session,fetchImpl:async()=>Response.json({error:'Other conflict'},{status:409})});
  assert.equal((await unmarked('/api/session')).status,409);
 });
});
test('Browser leaves the retired /welcome page directly for Studio and preserves the old-account recovery page',()=>{
 const page=readFileSync(new URL('../lab/welcome.html',import.meta.url),'utf8');
 assert.match(page,/location\.replace\('\.\/studio\.html\?tool=image'\)/);
 assert.doesNotMatch(page,/YOUR ACCOUNT IS READY|Enter the Studio|id="credit-toast"/);
 const recovery=readFileSync(new URL('../lab/connect-account.html',import.meta.url),'utf8');
 const code=readFileSync(new URL('../lab/connect-account.js',import.meta.url),'utf8');
 assert.match(recovery,/Generate transfer code/);
 assert.match(code,/api\/migration\/redeem/);
 assert.doesNotMatch(code,/localStorage\.(setItem|getItem)/);
});
test('Old public PV LAB landing redirects to the same fashion hero at the new domain',()=>{
 const html=readFileSync(new URL('../lab/index.html',import.meta.url),'utf8');
 assert.match(html,/location\.replace\('https:\/\/pvlab\.studio\/'\+location\.search\+location\.hash\)/);
 assert.match(html,/<link rel="canonical" href="https:\/\/pvlab\.studio\/">/);
 assert.match(html,/visuals\/leather-editorial\/hero-desktop\.webp/);
 assert.match(html,/Fashion\. <br>Reimagined\./);
 assert.doesNotMatch(html,/<a href="\.\/connect-account\.html">Move account to pvlab\.studio<\/a>/);
 assert.match(html,/href="\/lab\/connect-account\.html">Keep your existing PV LAB account<\/a>/);
});
test('Credit success is a short toast inside the authenticated Studio, never a page or guessed balance',()=>{
 const page=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
 const script=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
 const style=readFileSync(new URL('../lab/studio-credit-toast.css',import.meta.url),'utf8');
 assert.match(page,/id="pv-credit-toast" class="pv-credit-toast" role="status"/);
 assert.match(page,/Credits ready/);
 assert.match(page,/Ready to create/);
 assert.match(script,/onNewCustomer:grant/);
 assert.match(script,/showFirstCreditToast\(data\)/);
 assert.match(script,/grant\.ownerId!==profile\.ownerId/);
 assert.match(script,/profile\.balanceCredits<200/);
 assert.match(style,/backdrop-filter:blur\(25px\)/);
 assert.match(style,/prefers-reduced-motion/);
 assert.doesNotMatch(page,/YOUR WELCOME GIFT/);
});
