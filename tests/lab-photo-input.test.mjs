import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePhotoInput} from '../lab/photo-input.js';
const jpeg=new Uint8Array([255,216,255,224,0,2]);
test('accepts a 7.2 MB JPEG with missing or nonstandard iPhone MIME without changing bytes',async()=>{
  for(const type of ['', 'image/jpg','application/octet-stream']){
    const file=new File([jpeg,new Uint8Array(7200000-jpeg.length)],'IMG_7409.JPG',{type});
    const result=await preparePhotoInput(file);
    assert.equal(result.type,'image/jpeg');assert.equal(result.size,7200000);
    assert.deepEqual(new Uint8Array(await result.slice(0,6).arrayBuffer()),jpeg);
  }
});
test('keeps an already supported original unchanged',async()=>{
  const file=new File([jpeg],'photo.jpg',{type:'image/jpeg'});
  assert.equal(await preparePhotoInput(file),file);
});
test('gives separate errors for empty files, byte limit and unsupported content',async()=>{
  await assert.rejects(preparePhotoInput(new File([],'photo.jpg')),/empty/);
  await assert.rejects(preparePhotoInput(new File([jpeg],'photo.jpg'),{maxBytes:4}),/too large/);
  await assert.rejects(preparePhotoInput(new File(['not an image'],'photo.jpg',{type:'image/jpeg'})),/JPG, PNG, WebP or iPhone HEIC/);
});
test('recognizes PNG and WebP bytes independently of filename',async()=>{
  for(const [bytes,type] of [[new Uint8Array([137,80,78,71,13,10,26,10]),'image/png'],['RIFF0000WEBPVP8 ','image/webp']]){
    const result=await preparePhotoInput(new File([bytes],'photo',{type:''}));assert.equal(result.type,type);
  }
});
test('HEIC is actually decoded and encoded, and decoder failure gives a useful error',async()=>{
  const previousImage=globalThis.Image,previousDocument=globalThis.document;
  const heic=new File(['0000ftypheic0000mif1'],'iphone.heic',{type:'image/heic'});
  let drawn=false,decoded=false,fail=false,canvas;
  globalThis.Image=class{naturalWidth=4032;naturalHeight=3024;async decode(){decoded=true;if(fail)throw Error('decode');}removeAttribute(){}};
  globalThis.document={createElement(){return canvas={width:0,height:0,getContext(){return {drawImage(image,x,y,w,h){drawn=true;assert.equal(w,4032);assert.equal(h,3024);}}},toBlob(cb,type){assert.ok(decoded&&drawn);assert.equal(type,'image/jpeg');cb(new Blob([jpeg],{type}));}};}};
  try{
    const result=await preparePhotoInput(heic);assert.equal(result.type,'image/jpeg');assert.equal(result.name,'iphone.jpg');assert.equal(result.size,jpeg.length);assert.equal(canvas.width,0);
    fail=true;await assert.rejects(preparePhotoInput(heic),/Safari on your iPhone/);
  }finally{globalThis.Image=previousImage;globalThis.document=previousDocument;}
});
