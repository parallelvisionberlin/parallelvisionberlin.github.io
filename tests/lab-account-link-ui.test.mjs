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
test('Only PV LAB new hosts redirect unlinked users to secure account choice',async()=>{
 for(const host of ['pvlab.studio','www.pvlab.studio','pvlab-studio.pages.dev']){
   const urls=await check(host);
   assert.equal(urls.length,1);
   const target=new URL(urls[0]);assert.equal(target.hostname,host);
   assert.equal(target.pathname,'/connect-account.html');
   assert.equal(target.searchParams.get('next'),'/studio.html?tool=image');
 }
 for(const host of ['parallelvisionlabel.com','www.parallelvisionlabel.com','evil.pvlab.studio'])
   assert.equal((await check(host)).length,0);
 assert.equal((await check('pvlab.studio','/connect-account.html')).length,0);
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
