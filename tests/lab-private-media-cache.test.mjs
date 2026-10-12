import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateMediaCache} from '../lab/private-media-cache.js';

function storage(){
  const buckets=new Map();
  return {buckets,keys:async()=>[...buckets.keys()],delete:async name=>buckets.delete(name),async open(name){
    if(!buckets.has(name))buckets.set(name,new Map());const data=buckets.get(name),id=x=>typeof x==='string'?x:x.url;
    return {keys:async()=>[...data.keys()],match:async key=>data.get(id(key))?.clone(),delete:async key=>data.delete(id(key)),put:async(key,value)=>data.set(id(key),value.clone())};
  }};
}
const image=text=>new Blob([text],{type:'image/png'});
test('a return visit reuses private original bytes without fetching them again',async()=>{
  const disk=storage(),first=createPrivateMediaCache({storage:disk});await first.select('user_A');
  await first.put('original:one',image('original bytes'));
  const reopened=createPrivateMediaCache({storage:disk});await reopened.select('user_A');
  assert.equal(await(await reopened.get('original:one')).text(),'original bytes');
  assert.equal(await reopened.get('preview:one'),null,'previews never substitute for originals');
});
test('account switches and signout remove private cached media, including pending writes',async()=>{
  const disk=storage(),cache=createPrivateMediaCache({storage:disk});await cache.select('user_A');
  const pending=cache.put('original:one',image('A'));
  await cache.select('user_B');await pending;
  assert.equal(await cache.get('original:one'),null);
  assert.ok([...disk.buckets.keys()].every(x=>!x.endsWith(':user_A')));
  await cache.put('original:one',image('B'));await cache.signOut();
  assert.equal(disk.buckets.size,0);assert.equal(await cache.get('original:one'),null);
});
test('device storage stays bounded, expires, and never stores credentials or non-images',async()=>{
  let time=10;const cache=createPrivateMediaCache({storage:storage(),clock:()=>time,maxBytes:8,maxEntries:2,ttl:100});
  await cache.select('user_A');
  await cache.put('one',image('12345'));await cache.put('two',image('56789'));
  assert.equal(await cache.get('one'),null);assert.ok(await cache.get('two'));
  await cache.put('token',new Blob(['secret'],{type:'application/json'}));assert.equal(await cache.get('token'),null);
  time=111;assert.equal(await cache.get('two'),null);
});
test('unavailable device storage is a cache miss, never a broken gallery',async()=>{
  const cache=createPrivateMediaCache({storage:{keys:async()=>{throw Error('blocked')},open:async()=>{throw Error('blocked')}}});
  await cache.select('user_A');assert.equal(await cache.get('one'),null);await cache.put('one',image('ok'));await cache.clear();
});
