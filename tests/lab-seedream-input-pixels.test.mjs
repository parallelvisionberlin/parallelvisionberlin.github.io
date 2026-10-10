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
  assert.match(code,/draw\(target.width,target.height\)/);
  assert.match(code,/SEEDREAM_WORKING_TARGET_PIXELS\/pixels/);
  assert.match(lab,/resizeForSeedream=pixels>SEEDREAM_INPUT_MAX_PIXELS/);
  assert.match(lab,/const prepared=resizeForSeedream\?await seedreamWorkingCopy\(item.file\):await providerWorkingCopy\(item.file\)/);
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
