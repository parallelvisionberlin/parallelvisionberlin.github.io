import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {modelImageInputIssue} from '../lab/image-model-limits.js';
import {QWEN_IMAGE_LIMIT,runImageTask} from '../lab/image-tools.js';
import {createSeedreamReferencePreparer,seedreamPrepKind} from '../lab/seedream-reference-prep.js';

const ref=size=>({file:{size,name:'camera.png'},width:4000,height:3000});

test('Qwen accepts oversized originals for private preparation, but still caps references at three',()=>{
  assert.equal(QWEN_IMAGE_LIMIT,10000000);
  assert.equal(modelImageInputIssue('qwen3',[ref(10000001)]),'');
  assert.equal(modelImageInputIssue('qwen3',[ref(20*1024*1024)]),'');
  assert.equal(modelImageInputIssue('qwen3',[ref(2000),ref(2000),ref(2000)]),'');
  assert.match(modelImageInputIssue('qwen3',[ref(2000),ref(2000),ref(2000),ref(2000)]),/three reference/);
});

test('Qwen prewarms only originals above decimal 10 MB, retaining original File identity',async()=>{
  const calls=[];
  const preparer=createSeedreamReferencePreparer({
    pixelCopy:async file=>file,byteCopy:async file=>{calls.push(file);return {name:'working.webp',size:5000000};},
    kindFor:item=>seedreamPrepKind(item,{pixelLimit:72000000,byteLimit:QWEN_IMAGE_LIMIT}),
    canBackground:()=>true
  });
  const small=ref(10000000),large=ref(10000001);
  assert.equal(preparer.warm(small),null);
  assert.equal(preparer.status(small),'not-needed');
  const result=await preparer.warm(large);
  assert.equal(result.size,5000000);
  assert.equal((await preparer.forSubmission(large)),result);
  assert.equal(calls.length,1);
  assert.equal(calls[0],large.file);
});

async function withMockDecoder(blobSize,callback){
  const previousBitmap=globalThis.createImageBitmap;
  const previousCanvas=globalThis.OffscreenCanvas;
  let closed=false;
  globalThis.createImageBitmap=async()=>({width:4000,height:3000,close(){closed=true;}});
  globalThis.OffscreenCanvas=class {
    constructor(w,h){this.width=w;this.height=h;}
    getContext(){return {drawImage(){},imageSmoothingEnabled:true,imageSmoothingQuality:'high'};}
    async convertToBlob(){return {type:'image/webp',size:blobSize(this.width,this.height)};}
  };
  try{return await callback(()=>closed);}
  finally{globalThis.createImageBitmap=previousBitmap;globalThis.OffscreenCanvas=previousCanvas;}
}

test('Qwen working copy preserves dimensions when compression is sufficient',async()=>{
  await withMockDecoder(()=>9400000,async closed=>{
    const output=await runImageTask('qwen-working-copy',{size:12000000,name:'camera.png'});
    assert.equal(output.outputWidth,4000);
    assert.equal(output.outputHeight,3000);
    assert.ok(output.blob.size<=QWEN_IMAGE_LIMIT);
    assert.equal(closed(),true);
  });
});

test('Qwen scales only the temporary working copy if full-resolution encoding remains above its limit',async()=>{
  await withMockDecoder((width)=>width===4000?10600000:9000000,async()=>{
    const output=await runImageTask('qwen-working-copy',{size:15000000,name:'camera.png'});
    assert.equal(output.outputWidth,3600);
    assert.equal(output.outputHeight,2700);
    assert.ok(output.blob.size<=QWEN_IMAGE_LIMIT);
  });
});

test('Qwen is wired to background preparation and model-specific upload copies before paid quotes',()=>{
  const code=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(code,/const qwenPreparer=createSeedreamReferencePreparer/);
  assert.match(code,/imageEngine==='qwen3'\?qwenPreparer/);
  assert.match(code,/selectedEngine==='qwen3'/);
  assert.match(code,/await qwenPreparer\.forSubmission\(item\)/);
  assert.match(code,/item\.file\.size<=\(qwenInput\?QWEN_IMAGE_LIMIT:PROVIDER_IMAGE_LIMIT\)/);
  assert.match(code,/qwenPreparer\.clear\(\)/);
});
