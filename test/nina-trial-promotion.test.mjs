import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const code = await readFile(new URL('../js/nina-trial-promotion.js', import.meta.url), 'utf8');
const { createNinaTrialPromotion } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
function setup() {
 const nodes=[{hidden:true},{hidden:true}];const values=new Map();
 const api=createNinaTrialPromotion({doc:{querySelectorAll:()=>nodes},storage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},events:{addEventListener(){}}});
 return {api,nodes,values};
}
test('new account shows offer only after eligibility load; connection hides and persists once',async()=>{
 const {api,nodes}=setup();let calls=0;const user={id:'a',unsafeMetadata:{other:42},updateMetadata:async payload=>{calls++;assert.deepEqual(payload,{unsafeMetadata:{ninaHasConnected:true}})}};
 api.setUser(user);assert.ok(nodes.every(n=>n.hidden));api.observeUsage(user,{lifetimeDebited:0});assert.ok(nodes.every(n=>!n.hidden));
 api.connected(user);api.connected(user);assert.ok(nodes.every(n=>n.hidden));await new Promise(r=>setImmediate(r));assert.equal(calls,1);
});
test('account metadata suppresses promotion on another device; switching accounts resets state',()=>{
 const {api,nodes}=setup();api.setUser({id:'a',unsafeMetadata:{ninaHasConnected:true}});assert.ok(nodes.every(n=>n.hidden));
 const other={id:'b',unsafeMetadata:{}};api.setUser(other);api.observeUsage(other,{lifetimeDebited:0});assert.ok(nodes.every(n=>!n.hidden));api.setUser(null);assert.ok(nodes.every(n=>!n.hidden));
});
test('old credit usage is recognised; stale account response cannot affect new account',async()=>{
 const {api,nodes}=setup();const a={id:'a',updateMetadata:async()=>{}};const b={id:'b',updateMetadata:async()=>{}};
 api.setUser(a);api.observeUsage(a,{lifetimeDebited:1});assert.ok(nodes.every(n=>n.hidden));api.setUser(b);api.observeUsage(b,{lifetimeDebited:0});api.observeUsage(a,{lifetimeDebited:3});assert.ok(nodes.every(n=>!n.hidden));
});
test('failed metadata write retains local state and retries next visit',async()=>{
 const {api,nodes,values}=setup();let calls=0;const a={id:'a',updateMetadata:async()=>{calls++;throw Error('offline')}};
 api.setUser(a);api.connected(a);await new Promise(r=>setImmediate(r));assert.equal(values.get('pv_nina_connected:a'),'1');assert.ok(nodes.every(n=>n.hidden));api.setUser(a);await new Promise(r=>setImmediate(r));assert.equal(calls,2);
});
