import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
const code=readFileSync(new URL('../js/nina-native-bridge.js',import.meta.url),'utf8');
const {installNativeIdentity}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
function jwt(sub='user_test_A',exp=Math.floor(Date.now()/1000)+60){return 'eyJhbGciOiJSUzI1NiJ9.'+Buffer.from(JSON.stringify({sub,exp})).toString('base64url')+'.TEST_ONLY';}
function fixture({status=200,sub='user_test_A',storage=new Map()}={}){
 const messages=[],calls=[];let token=jwt(sub);
 const win={location:{origin:'https://parallelvisionlabel.com',pathname:'/nina-app.html'},crypto:{randomUUID},atob,setTimeout,clearTimeout,
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
 fetch:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({displayName:'Test account',role:'user'}),{status});}};
 win.top=win;win.ReactNativeWebView={postMessage(raw){const data=JSON.parse(raw);messages.push(data);if(data.type==='PV_NINA_TOKEN_REQUEST')queueMicrotask(()=>win.__PV_NINA_TOKEN_REPLY__({...data,token}));}};
 return {win,messages,calls,storage,setToken:v=>{token=v;}};
}
test('a native identity is not trusted until the worker validates its token',async()=>{
 const f=fixture();const bridge=installNativeIdentity(f.win);const identity=await bridge.initialize();
 assert.equal(identity.user.id,'user_test_A');assert.equal(f.calls.length,1);
 assert.match(f.calls[0].options.headers.Authorization,/^Bearer /);
 assert.equal(f.calls[0].options.credentials,'omit');assert.equal(f.messages[0].type,'PV_NINA_TOKEN_REQUEST');
 assert(!('cookie' in f.win));assert(![...f.storage.values()].some(v=>v.includes('TEST_ONLY')));
 bridge.dispose();
});
test('backend rejection is retried once with a fresh token, never bounced to Profile',async()=>{
 const f=fixture({status:401});const bridge=installNativeIdentity(f.win);
 await assert.rejects(bridge.initialize(),/could not verify/);assert.equal(f.calls.length,2);
 assert.equal(f.messages.filter(m=>m.type==='PV_NINA_TOKEN_REQUEST').length,2);
 assert(!f.messages.some(m=>m.type==='PV_NINA_SHOW_PROFILE'));bridge.dispose();
});
test('token renewal is cached briefly, refreshable and bound to one user',async()=>{
 const f=fixture();const bridge=installNativeIdentity(f.win);await bridge.initialize();
 await bridge.getToken();assert.equal(f.messages.length,1);
 await bridge.getToken({skipCache:true});assert.equal(f.messages.length,2);
 f.setToken(jwt('user_test_B'));await assert.rejects(bridge.getToken({skipCache:true}),/account changed/);bridge.dispose();
});
test('different signed-in accounts have separate local transcript keys',async()=>{
 const storage=new Map();const a=fixture({storage});const ba=installNativeIdentity(a.win);await ba.initialize();const first=storage.get('nina_fok_visitor_id_v1');ba.dispose();
 const b=fixture({storage,sub:'user_test_B'});const bb=installNativeIdentity(b.win);await bb.initialize();const second=storage.get('nina_fok_visitor_id_v1');bb.dispose();assert.notEqual(first,second);
 const a2=fixture({storage});const ba2=installNativeIdentity(a2.win);await ba2.initialize();assert.equal(storage.get('nina_fok_visitor_id_v1'),first);ba2.dispose();
});
test('an expired token is not forwarded to account verification',async()=>{
 const f=fixture();f.setToken(jwt('user_test_A',Math.floor(Date.now()/1000)-1));const bridge=installNativeIdentity(f.win);await assert.rejects(bridge.initialize(),/expired/);assert.equal(f.calls.length,0);bridge.dispose();
});
test('provider cannot initialize on an external page or iframe',()=>{
 const f=fixture();f.win.location.origin='https://evil.test';assert.throws(()=>installNativeIdentity(f.win),/Parallel Vision app/);
 const g=fixture();g.win.top={};assert.throws(()=>installNativeIdentity(g.win),/Parallel Vision app/);
});
