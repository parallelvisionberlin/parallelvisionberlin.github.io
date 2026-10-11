import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMoodHandoff,saveMoodHandoff,takeMoodHandoff} from '../lab/mood-handoff.js';

function fakeIndexedDB(){
  const rows=new Map();
  const store={clear(){rows.clear();},put(record){rows.set(record.id,record);queueMicrotask(()=>active.oncomplete?.());},get(id){
    const result={result:null,onsuccess:null};
    queueMicrotask(()=>{result.result=rows.get(id)||null;result.onsuccess?.();queueMicrotask(()=>active.oncomplete?.());});
    return result;
  },delete(id){rows.delete(id);}};
  let active=null;
  const db={
    objectStoreNames:{contains:()=>true},
    createObjectStore:()=>store,
    transaction(){active={objectStore:()=>store,oncomplete:null,onerror:null,onabort:null};return active;},
    close(){}
  };
  return {open(){const request={result:db,onupgradeneeded:null,onsuccess:null,onerror:null};
    queueMicrotask(()=>request.onsuccess?.());
    return request;
  }};
}
test('Private Mood image transfer keeps original file and is consumed only once',async()=>{
  const old=globalThis.indexedDB;
  globalThis.indexedDB=fakeIndexedDB();
  try{
    const original=new File([new Uint8Array([137,80,78,71,13,10,26,10,0])],'my-photo.png',{type:'image/png'});
    const token=await saveMoodHandoff({file:original,prompt:'Realistic emerald wet film light'});
    assert.match(token,/^[a-f0-9-]{36}$/i);
    const retrieved=await takeMoodHandoff(token);
    assert.equal(retrieved.prompt,'Realistic emerald wet film light');
    assert.equal(retrieved.file.name,'my-photo.png');
    assert.equal(retrieved.file.type,'image/png');
    assert.equal(retrieved.file.size,9);
    await assert.rejects(()=>takeMoodHandoff(token),/expired|again/);
  }finally{if(old===undefined)delete globalThis.indexedDB;else globalThis.indexedDB=old;}
});
test('Bad file types and overlong directions are rejected without storing private data',()=>{
  assert.throws(()=>validateMoodHandoff({file:new File(['x'],'fake.svg',{type:'image/svg+xml'})}),/JPG/);
  assert.throws(()=>validateMoodHandoff({prompt:'x'.repeat(1401)}),/1,400/);
  assert.equal(validateMoodHandoff({prompt:'  A dream image  '}).prompt,'A dream image');
});
