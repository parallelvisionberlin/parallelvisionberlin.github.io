import test from 'node:test';
import assert from 'node:assert/strict';
import {createVideoReferenceUploader} from '../lab/video-reference-upload.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const session=()=>1;
test('the attached original uploads ahead of Generate, and concurrent quote and Generate reuse it',async()=>{
  let calls=0,changes=0;
  const gate=deferred(),ref={file:{name:'original.webp'},id:null};
  const uploader=createVideoReferenceUploader({upload:()=>{calls++;return gate.promise;},isCurrent:Object.assign(()=>true,{session}),onChange:()=>{changes++;}});
  const a=uploader.start(ref),b=uploader.start(ref);
  assert.equal(a,b);
  await Promise.resolve();
  assert.equal(calls,1);
  assert.equal(uploader.status(ref).state,'uploading');
  gate.resolve('asset-1');assert.equal(await a,'asset-1');
  assert.equal(ref.id,'asset-1');
  assert.equal(uploader.status(ref).state,'ready');
  assert.equal(await uploader.start(ref),'asset-1');
  assert.equal(calls,1);
  assert.ok(changes>=2);
});
test('failure is visible and retry is explicit, with no duplicate automatic uploads',async()=>{
  let calls=0;
  const ref={file:{name:'bad.jpg'}};
  const uploader=createVideoReferenceUploader({
    upload:async()=>{calls++;if(calls===1)throw Error('Network error');return 'asset-2';},
    isCurrent:Object.assign(()=>true,{session})
  });
  await assert.rejects(uploader.start(ref),/Network error/);
  assert.equal(uploader.status(ref).state,'error');
  assert.match(uploader.status(ref).message,/Network error/);
  await assert.rejects(uploader.start(ref),/Select Retry/);
  assert.equal(calls,1);
  assert.equal(await uploader.start(ref,{retry:true}),'asset-2');
  assert.equal(calls,2);
});
test('removed references and stale sessions never receive returned asset IDs',async()=>{
  let active=true,stamp=1,changes=0;
  const gate=deferred(),ref={file:{name:'orphan.jpg'}};
  const uploader=createVideoReferenceUploader({
    upload:()=>gate.promise,
    isCurrent:Object.assign((item,session)=>active&&session===stamp,{session:()=>stamp}),
    onChange:()=>changes++
  });
  const waiting=uploader.start(ref);active=false;stamp=2;
  gate.resolve('orphan-id');await waiting;
  assert.equal(ref.id,undefined);
  assert.equal(changes,1);
});
