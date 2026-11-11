// No network, real uploads or generation. A held 48 MP Seedream working
// copy must never stall the next reference thumbnail.
import test from 'node:test';
import assert from 'node:assert/strict';
import {imageReferencePreview,seedreamWorkingCopy,cancelImagePreparation} from '../lab/image-tools.js';

test('reference thumbnail resolves while an earlier heavy working copy remains in progress',async()=>{
  const originalWorker=globalThis.Worker,originalCanvas=globalThis.OffscreenCanvas;
  const operations=[],workers=[];let finishHeavy;
  globalThis.OffscreenCanvas=class{};
  globalThis.Worker=class{
    onmessage=null;
    constructor(url){this.url=String(url);workers.push(this);}
    postMessage({id,operation}){
      operations.push(operation);
      if(operation==='seedream-working-copy'){
        finishHeavy=()=>this.onmessage?.({data:{id,result:{blob:new Blob(['prepared'],{type:'image/webp'})}}});
      }else if(operation==='reference-preview'){
        queueMicrotask(()=>this.onmessage?.({data:{id,result:{width:3072,height:2048,thumbnail:new Blob(['thumb'],{type:'image/webp'})}}}));
      }else throw Error('Unexpected operation '+operation);
    }
    terminate(){}
  };
  let heavy;
  try{
    const file=new File(['original'],'large-camera.jpg',{type:'image/jpeg'});
    heavy=seedreamWorkingCopy(file);
    for(let attempt=0;attempt<100&&!finishHeavy;attempt++)
      await new Promise(resolve=>setTimeout(resolve,1));
    assert.equal(typeof finishHeavy,'function','Heavy working copy actually started');
    const thumbnail=await Promise.race([
      imageReferencePreview(new File(['another'],'next-photo.jpg',{type:'image/jpeg'})),
      new Promise((_,reject)=>setTimeout(()=>reject(Error('Reference blocked by earlier working copy')),250))
    ]);
    assert.equal(thumbnail.width,3072);
    assert.equal(thumbnail.height,2048);
    assert.equal(thumbnail.thumbnail.type,'image/webp');
    assert.equal(workers.length,2,'Preview uses its own worker rather than the busy preparation worker');
    assert.deepEqual(operations,['seedream-working-copy','reference-preview']);
    finishHeavy();await heavy;
  }finally{
    cancelImagePreparation();
    if(originalWorker===undefined)delete globalThis.Worker;else globalThis.Worker=originalWorker;
    if(originalCanvas===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=originalCanvas;
  }
});
