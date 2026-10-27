import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareElementPhoto} from '../lab/photo-input.js';

function withCanvas(width,height,run){
  const originals={bitmap:globalThis.createImageBitmap,canvas:globalThis.OffscreenCanvas};
  const output=[];
  globalThis.createImageBitmap=async()=>({width,height,close(){}});
  globalThis.OffscreenCanvas=class{
    constructor(w,h){this.width=w;this.height=h;output.push(this);}
    getContext(){return {drawImage(){},imageSmoothingEnabled:false,imageSmoothingQuality:'low'};}
    async convertToBlob(){return new Blob(['working copy'],{type:'image/webp'});}
  };
  return Promise.resolve().then(()=>run(output)).finally(()=>{
    if(originals.bitmap===undefined)delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap=originals.bitmap;
    if(originals.canvas===undefined)delete globalThis.OffscreenCanvas;
    else globalThis.OffscreenCanvas=originals.canvas;
  });
}
test('ordinary character photos keep original file bytes and identity',async()=>withCanvas(3000,4500,async()=>{
  const file=new File(['sample'],'original.jpg',{type:'image/jpeg'});
  assert.strictEqual(await prepareElementPhoto(file),file);
}));
test('a 4912 x 7360 reference becomes a private 6000px WebP working copy',async()=>withCanvas(4912,7360,async output=>{
  const file=new File(['photo'],'_FSR9731.jpg',{type:'image/jpeg'});
  const result=await prepareElementPhoto(file,{maxSide:6000,maxBytes:10*1024*1024});
  assert.notStrictEqual(result,file);
  assert.equal(file.name,'_FSR9731.jpg');
  assert.equal(result.type,'image/webp');
  assert.equal(result.name,'_FSR9731-ready.webp');
  assert.equal(output.at(-1).height,6000);
  assert.equal(output.at(-1).width,Math.floor(4912*6000/7360));
}));
test('oversized but decodable alternate photos are converted for private Elements',async()=>withCanvas(5000,5000,async()=>{
  const file=new File(['photo'],'source.avif',{type:'image/avif'});
  const result=await prepareElementPhoto(file);
  assert.equal(result.type,'image/webp');
  assert.equal(file.type,'image/avif');
}));
