import test from 'node:test';
import assert from 'node:assert/strict';
import {
  precisionPoint,precisionOutputSize,precisionPrice,precisionFinalMetadata,
  precisionEditRoute,PRECISION_SEGMENT_MODEL,PRECISION_SEGMENT_ESTIMATE_MICROS,PRECISION_LARGE_IMAGE_PIXELS,PRECISION_COMPOSITE_LIMIT
} from '../lab-worker/precision-edit.mjs';
import {controlledRepairParameters} from '../lab-worker/fal-controlled-pose.mjs';

test('Magic Select uses the verified SAM 3 endpoint and the current published estimate',()=>{
  assert.equal(PRECISION_SEGMENT_MODEL,'fal-ai/sam-3/image');
  assert.equal(PRECISION_SEGMENT_ESTIMATE_MICROS,5000);
  assert.deepEqual(precisionPoint({x:27.4,y:43.1},500,300),{x:27,y:43,label:1,object_id:1});
  for(const point of [{x:-1,y:20},{x:500,y:1},{x:1,y:300},{x:NaN,y:0},{x:'12',y:2},null])
    assert.throws(()=>precisionPoint(point,500,300),/inside the photograph/);
});
test('Precision edits only accept supported, reasonable original dimensions',()=>{
  const size=precisionOutputSize(new Uint8Array([1]),'image/png',()=>({width:1600,height:1200}));
  assert.deepEqual(size,{width:1600,height:1200});
  assert.throws(()=>precisionOutputSize(new Uint8Array([1]),'image/gif',()=>({width:800,height:800})),/Unsupported/);
  assert.throws(()=>precisionOutputSize(new Uint8Array([1]),'image/jpeg',()=>({width:8193,height:500})),/between 240 and 8192/);
  assert.throws(()=>precisionOutputSize(new Uint8Array([1]),'image/png',()=>({width:100,height:500})),/between 240 and 8192/);
});
test('Precision FLUX quote uses the existing estimated output-megapixel pricing',()=>{
  const p=controlledRepairParameters({prompt:'Change only the selected shirt',sourceWidth:1800,sourceHeight:1200,strength:.75});
  assert.equal(p.model,'fal-ai/flux-general/inpainting');
  assert.equal(p.mode,'controlled-repair');
  assert.equal(precisionPrice(p),225000);
});
test('Retouch lossless/JPEG policies are explicit and bound to source approval',()=>{
  assert.equal(PRECISION_LARGE_IMAGE_PIXELS,5000000);
  assert.equal(PRECISION_COMPOSITE_LIMIT,20*1024*1024);
  const settings={precisionEdit:true,precisionOriginalId:'original',precisionFinalized:false,
    precisionAllowJpegFallback:true};
  const jpeg=precisionFinalMetadata(settings,'original','image/jpeg');
  assert.equal(jpeg.precisionOutputFormat,'jpeg');
  assert.equal(jpeg.precisionFinalized,true);
  assert.equal(settings.precisionFinalized,false);
  const png=precisionFinalMetadata({...settings,precisionAllowJpegFallback:false},'original','image/png');
  assert.equal(png.precisionOutputFormat,'png');
  assert.throws(()=>precisionFinalMetadata({...settings,precisionAllowJpegFallback:false},'original','image/jpeg'),/not authorized/);
  assert.throws(()=>precisionFinalMetadata(settings,'original','image/webp'),/Unsupported/);
});
test('Only a pending Precision Edit of the specified original can be finalized',()=>{
  const original='a';const settings={precisionEdit:true,precisionFinalized:false,precisionOriginalId:original,prompt:'test'};
  assert.deepEqual(precisionFinalMetadata(settings,original),{...settings,precisionFinalized:true});
  assert.equal(settings.precisionFinalized,false);
  assert.throws(()=>precisionFinalMetadata({...settings,precisionFinalized:true},original),/not a pending/);
  assert.throws(()=>precisionFinalMetadata(settings,'b'),/not a pending/);
  assert.throws(()=>precisionFinalMetadata({...settings,precisionEdit:false},original),/not a pending/);
});
test('Precision routes deny unverified customer spending before touching storage or providers',async()=>{
  let accessed=false;
  const d={customer:true,fail:(status,msg)=>{const error=new Error(msg);error.status=status;throw error;},
    source:()=>{accessed=true;}};
  const request=new Request('https://parallel-vision-lab.parallelvision.workers.dev/api/precision/segment',{method:'POST'});
  await assert.rejects(precisionEditRoute(request,{FAL_KEY:'synthetic-fal-key',LAB_SECRET:'synthetic-signing-secret'},'customer-1',new URL(request.url),d),
    e=>e.status===403&&/owner-only/.test(e.message));
  assert.equal(accessed,false);
});
