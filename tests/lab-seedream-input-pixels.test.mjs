import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SEEDREAM_INPUT_MAX_PIXELS,SEEDREAM_WORKING_TARGET_PIXELS,seedreamWorkingDimensions} from '../lab/image-tools.js';
const src=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('39.8 MP History output is scaled to a safe Seedream input without cropping',()=>{
  assert.equal(SEEDREAM_INPUT_MAX_PIXELS,36000000);
  assert.equal(SEEDREAM_WORKING_TARGET_PIXELS,34000000);
  for(const [w,h] of [[7728,5152],[5152,7728]]){
    const scaled=seedreamWorkingDimensions(w,h);
    assert.ok(scaled.width*scaled.height<=34000000);
    assert.ok(scaled.width*scaled.height>33000000);
    assert.ok(Math.abs(scaled.width/scaled.height-w/h)<0.001);
    assert.ok(scaled.width<w && scaled.height<h);
  }
  assert.deepEqual(seedreamWorkingDimensions(1024,1024),{width:1024,height:1024});
  assert.deepEqual(seedreamWorkingDimensions(6000,6000),{width:6000,height:6000});
});

test('Invalid dimensions are rejected before a paid request',()=>{
  for(const dims of [[0,100],[100,0],[Infinity,100],[100.2,30],[-1,800]])
    assert.throws(()=>seedreamWorkingDimensions(...dims),/Invalid source image/);
});

test('Pixel-limited working copy is independent of the file size limit',()=>{
  const code=src('../lab/image-tools.js'),lab=src('../lab/lab.js');
  assert.match(code,/seedream-working-copy/);
  assert.match(code,/draw\(outputWidth,outputHeight\)/);
  assert.match(code,/SEEDREAM_WORKING_TARGET_PIXELS\/pixels/);
  assert.match(lab,/resizeForSeedream=pixels>SEEDREAM_INPUT_MAX_PIXELS/);
  assert.match(lab,/await seedreamPreparer.forSubmission\(item\)/);
  assert.match(lab,/cacheKey=resizeForSeedream\?'seedream-pixels:'/);
  assert.match(lab,/originals\[index\]=\{id,file:item.file,width:item.width,height:item.height\}/);
  assert.match(lab,/originals.push\(\{id,file:item.file,width:item.width,height:item.height\}\)/);
  assert.match(lab,/prepareQuoteInputs\(inputs,\{originals,engine:selected.engine\}\)/);
});

test('Worker rejects >36 MP Seedream inputs before asking for a paid quote',()=>{
  const backend=src('../lab-worker/worker.mjs');
  assert.match(backend,/stageImageReferences\(env,owner,p.transferSourceIds,key,10,p.engine==='seedream'\?36000000:0\)/);
  assert.match(backend,/dimensions.width\*dimensions.height>maxPixels/);
  const validation=backend.indexOf('dimensions.width*dimensions.height>maxPixels');
  const ticket=backend.indexOf("vendorRequest('/common/upload-url',key");
  assert.ok(validation>=0 && validation<ticket);
  assert.match(backend,/No paid generation was submitted/);
});

test('Seedream temporary copy falls back to a smaller canvas when 34MP still exceeds 10 MiB',async()=>{
  const {runImageTask}=await import('../lab/image-tools.js');
  const previousBitmap=globalThis.createImageBitmap,previousCanvas=globalThis.OffscreenCanvas;
  const requested=[];
  globalThis.createImageBitmap=async()=>({width:7728,height:5152,close(){}});
  globalThis.OffscreenCanvas=class{
    constructor(width,height){this.width=width;this.height=height;}
    getContext(){return {drawImage(){},imageSmoothingEnabled:false,imageSmoothingQuality:'low'};}
    async convertToBlob({type}){
      const pixels=this.width*this.height;requested.push(pixels);
      return {type,size:pixels>27000000?11*1024*1024:2*1024*1024};
    }
  };
  try{
    const result=await runImageTask('seedream-working-copy',{name:'synthetic-photo.png'});
    assert.ok(requested.length>=4,'A too-large encoding should trigger a smaller canvas.');
    assert.ok(result.outputWidth*result.outputHeight<27000000);
    assert.ok(result.outputWidth*result.outputHeight<=SEEDREAM_WORKING_TARGET_PIXELS);
    assert.equal(result.blob.size,2*1024*1024);
  }finally{
    if(previousBitmap===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=previousBitmap;
    if(previousCanvas===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=previousCanvas;
  }
});
