import test from 'node:test';
import assert from 'node:assert/strict';
import {saveModelPhoto,takeModelPhoto,validateModelPhoto} from '../lab/editorial-model-handoff.js';
function storage(){
 const rows=new Map(),tokens=new Map();let active;
 const store={clear(){rows.clear()},put(record){rows.set(record.id,record);queueMicrotask(()=>active.oncomplete())},get(id){const req={};queueMicrotask(()=>{req.result=rows.get(id);req.onsuccess();queueMicrotask(()=>active.oncomplete())});return req},delete(id){rows.delete(id)}};
 const db={createObjectStore(){},transaction(){active={objectStore:()=>store};return active},close(){}};
 return {rows,tokens,indexedDB:{open(){const req={result:db};queueMicrotask(()=>req.onsuccess());return req}},sessionStorage:{getItem:k=>tokens.get(k),setItem:(k,v)=>tokens.set(k,v),removeItem:k=>tokens.delete(k)}};
}
test('model photo transfers original bytes once, with tab binding and expiry',async()=>{
 const oldDB=globalThis.indexedDB,oldSession=globalThis.sessionStorage;
 const fixture=storage();globalThis.indexedDB=fixture.indexedDB;globalThis.sessionStorage=fixture.sessionStorage;
 try{
  const photo=new File(['original image bytes'],'my-model.png',{type:'image/png'});
  const id=await saveModelPhoto(photo);
  const [key,token]=[...fixture.tokens.entries()][0];
  fixture.tokens.clear();await assert.rejects(takeModelPhoto(id),/Select your model/);
  fixture.tokens.set(key,token);
  const result=await takeModelPhoto(id);
  assert.equal(result.name,photo.name);assert.equal(await result.text(),'original image bytes');
  assert.equal(fixture.rows.size,0);assert.equal(fixture.tokens.size,0);
  await assert.rejects(takeModelPhoto(id),/Select your model/);
  const expired=await saveModelPhoto(photo);fixture.rows.get(expired).createdAt-=11*60*1000;
  await assert.rejects(takeModelPhoto(expired),/expired/);assert.equal(fixture.rows.size,0);
 }finally{globalThis.indexedDB=oldDB;globalThis.sessionStorage=oldSession}
});
test('model photo rejects empty, oversized and unsupported files before storage',async()=>{
 for(const file of [new File([],'empty.jpg',{type:'image/jpeg'}),new File(['x'],'unsafe.svg',{type:'image/svg+xml'}),new File([new Uint8Array(20*1024*1024+1)],'large.png',{type:'image/png'})]){
  assert.throws(()=>validateModelPhoto(file),/JPG, PNG or WebP/);
  await assert.rejects(saveModelPhoto(file),/JPG, PNG or WebP/);
 }
});
