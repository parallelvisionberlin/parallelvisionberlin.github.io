import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const code=readFileSync(new URL('../src/ninaBridge.js',import.meta.url),'utf8');
const {isNinaURL,readBridgeMessage,tokenReplyScript,withTimeout}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const pageId='00000000-0000-4000-8000-000000000001';
const id='00000000-0000-4000-8000-000000000002';
const url='https://parallelvisionlabel.com/nina-app.html?v=bridge01';
test('only the exact trusted HTTPS live page is accepted',()=>{
 assert(isNinaURL(url));
 for(const bad of ['http://parallelvisionlabel.com/nina-app.html','https://parallelvisionlabel.com.evil/nina-app.html','https://evil.test/nina-app.html','https://parallelvisionlabel.com/index.html','https://parallelvisionlabel.com/nina-app.html/extra','javascript:alert(1)'])assert.equal(isNinaURL(bad),false,bad);
});
test('malformed and oversized messages are rejected',()=>{
 assert.equal(readBridgeMessage({url,data:'bad'}),null);
 assert.equal(readBridgeMessage({url,data:'x'.repeat(4097)}),null);
 assert.equal(readBridgeMessage({url,data:JSON.stringify({type:'PV_NINA_TOKEN_REQUEST',pageId,id:'bad'})}),null);
 assert.equal(readBridgeMessage({url:'https://evil.test',data:JSON.stringify({type:'PV_NINA_TOKEN_REQUEST',pageId,id})}),null);
 assert.equal(readBridgeMessage({url,data:JSON.stringify({type:'PV_NINA_TOKEN_REQUEST',pageId,id})}).id,id);
});
test('token response only enters the intended document and main frame',()=>{
 const data={id,pageId,token:'TEST_ONLY',error:''};
 function check(origin,currentId,iframe=false){
  let received;const w={__PV_NINA_PAGE_ID__:currentId,__PV_NINA_TOKEN_REPLY__:d=>{received=d;}};w.top=iframe?{}:w;
  vm.runInNewContext(tokenReplyScript(data),{window:w,location:{origin,pathname:'/nina-app.html'}});return received;
 }
 assert.equal(check('https://parallelvisionlabel.com',pageId).token,'TEST_ONLY');
 assert.equal(check('https://evil.test',pageId),undefined);
 assert.equal(check('https://parallelvisionlabel.com','old-document'),undefined);
 assert.equal(check('https://parallelvisionlabel.com',pageId,true),undefined);
});
test('account timeout rejects rather than leaving the button stuck',async()=>{
 await assert.rejects(withTimeout(new Promise(()=>{}),10),/timed out/);
 assert.equal(await withTimeout(Promise.resolve('ok'),100),'ok');
});
