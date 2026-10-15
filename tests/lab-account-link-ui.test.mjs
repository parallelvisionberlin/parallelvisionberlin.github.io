import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSessionRequest} from '../lab/session-request.js';
const token='synthetic.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.only';
const session={id:'sess_fixture',getToken:async()=>token};
const response=()=>Response.json({error:'Setup required.'},{status:409,headers:{'X-PV-Lab-Onboarding':'required'}});
const browser=(hostname,pathname='/studio.html')=>{
 const calls=[];
 const window={location:{hostname,pathname,search:'?tool=image',hash:'',origin:'https://'+hostname,
   replace(url){calls.push(url);}}};
 return {window,calls};
};
async function check(hostname,pathname){
 const original=globalThis.window;
 const current=browser(hostname,pathname);
 try{
  globalThis.window=current.window;
  const request=createSessionRequest({baseUrl:'https://lab.example',getSession:()=>session,fetchImpl:async()=>response()});
  const result=await request('/api/session');
  assert.equal(result.status,409);
  return current.calls;
 }finally{if(original===undefined)delete globalThis.window;else globalThis.window=original;}
}
test('Only PV LAB new hosts redirect unlinked users to the first-login welcome',async()=>{
 for(const host of ['pvlab.studio','www.pvlab.studio','pvlab-studio.pages.dev']){
   const urls=await check(host);
   assert.equal(urls.length,1);
   const target=new URL(urls[0]);assert.equal(target.hostname,host);
   assert.equal(target.pathname,'/welcome.html');
   assert.equal(target.searchParams.get('next'),'/studio.html?tool=image');
 }
 for(const host of ['parallelvisionlabel.com','www.parallelvisionlabel.com','evil.pvlab.studio'])
   assert.equal((await check(host)).length,0);
 assert.equal((await check('pvlab.studio','/connect-account.html')).length,0);
 assert.equal((await check('pvlab.studio','/welcome.html')).length,0);
});
test('The account-transfer page copies a one-use code but never stores it in URL parameters',()=>{
 const page=readFileSync(new URL('../lab/connect-account.html',import.meta.url),'utf8');
 const code=readFileSync(new URL('../lab/connect-account.js',import.meta.url),'utf8');
 assert.match(page,/Keep your work/);
 assert.match(page,/Generate transfer code/);
 assert.match(page,/Link existing account/);
 assert.match(page,/Create a new PV LAB account/);
 assert.match(code,/api\/migration\/issue/);
 assert.match(code,/api\/migration\/redeem/);
 assert.match(code,/api\/migration\/new/);
 assert.match(code,/navigator\.clipboard\.writeText/);
 assert.doesNotMatch(code,/localStorage\.(setItem|getItem)/);
 assert.doesNotMatch(code,/searchParams\.set\(['"]code/);
});

test('Welcome screen grants credits only after explicit entry, with a safe legacy recovery link',()=>{
 const page=readFileSync(new URL('../lab/welcome.html',import.meta.url),'utf8');
 const logic=readFileSync(new URL('../lab/welcome.js',import.meta.url),'utf8');
 assert.match(page,/Welcome to PV LAB\./);
 assert.match(page,/YOUR WELCOME GIFT/);
 assert.match(page,/200\s*<span>credits<\/span>/);
 assert.match(page,/Enter the Studio/);
 assert.match(page,/connect-account\.html/);
 assert.match(page,/welcome credits are added when you enter/i);
 assert.match(page,/prefers-reduced-motion/);
 assert.match(logic,/api\/migration\/status/);
 assert.match(logic,/api\/migration\/new/);
 assert.match(logic,/api\/session/);
 assert.match(logic,/new Set\(\['pvlab\.studio'/);
 assert.match(logic,/!created\.linked\|\|created\.kind!=='customer'/);
 assert.doesNotMatch(logic,/localStorage\.(setItem|getItem)/);
 assert.doesNotMatch(logic,/searchParams\.set\(['"]code/);
});
