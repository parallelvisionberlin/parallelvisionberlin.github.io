import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seedreamWorkingDimensions,SEEDREAM_INPUT_MAX_PIXELS} from '../lab/image-tools.js';

const src=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
const begin=src.indexOf('async function inspectImage(candidate){');
const end=src.indexOf('\nasync function setImage(',begin);
assert.ok(begin>=0&&end>begin,'Use the actual Image Studio upload validator, not a replica');
const inspectorSource=src.slice(begin,end);

function inspectFor(tool='image',imageEngine='seedream',engine='seedance'){
  const ctx={
    window:{__PV_LAB_NATIVE__:0},tool,imageEngine,engine,
    imagePreview:async file=>({width:file.width,height:file.height,preview:{},thumbnail:{}}),
    prepareElementPhoto:async (file,{maxSide})=>Math.max(file.width,file.height)>maxSide
      ?{...file,width:Math.floor(file.width*maxSide/Math.max(file.width,file.height)),height:Math.floor(file.height*maxSide/Math.max(file.width,file.height)),size:4*1024*1024}:file,
    modelImageInputIssue:()=>null,
    URL:{createObjectURL:()=> 'blob:preview'},
    preparePhotoInput:()=>{throw Error('Native input not expected here');}
  };
  return new Function('ctx','with(ctx){'+inspectorSource+';return inspectImage;}')(ctx);
}
const phonePhoto=()=>({name:'IMG_8786.jpeg',type:'image/jpeg',size:8*1024*1024,width:6048,height:8064});

test('Image deck accepts 6048 x 8064 under 20 MB without changing source bytes',async()=>{
  const original=phonePhoto(),prepared=await inspectFor()(original);
  assert.strictEqual(prepared.file,original,'Original is retained, never silently recompressed on upload');
  assert.equal(prepared.width,6048);
  assert.equal(prepared.height,8064);
  assert.equal(6048*8064,48771072);
  assert.ok(6048*8064<72000000,'Uses existing safe preview pixel budget');
  assert.ok(SEEDREAM_INPUT_MAX_PIXELS<6048*8064,'Seedream must use existing bounded working copy');
  const converted=seedreamWorkingDimensions(6048,8064);
  assert.ok(converted.width*converted.height<=34000000);
  assert.ok(Math.abs(converted.width/converted.height-(6048/8064))<0.001);
});

test('Real Image validator retains 12K dimension ceiling, 20MB file ceiling and safety errors',async()=>{
  const inspect=inspectFor();
  await assert.rejects(()=>inspect({...phonePhoto(),width:12001,height:4000}),/Image dimensions too large:.*Maximum 12,000 pixels per side/);
  await assert.rejects(()=>inspect({...phonePhoto(),size:20*1024*1024+1}),/Image too large:/);
  await assert.rejects(()=>inspect({...phonePhoto(),width:120,height:130}),/Image too small:/);
  await assert.rejects(()=>inspect({...phonePhoto(),width:12000,height:1000}),/Unsupported image proportions/);
  assert.match(src,/dimensions\?'Each side must be '\+dimensionsLimit\+' px or smaller/,'Dimension error must report actual model limit');
});

test('Video silently prepares an oversized working copy, while Upscaler preserves its source',async()=>{
  const original=phonePhoto(),video=await inspectFor('video','seedream','seedance')(original);
  assert.notStrictEqual(video.file,original);
  assert.ok(Math.max(video.width,video.height)<=6000);
  assert.equal(original.height,8064,'The chosen original is untouched');
  const upscale=await inspectFor('upscale')(original);
  assert.strictEqual(upscale.file,original);
});
