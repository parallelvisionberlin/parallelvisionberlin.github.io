import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectUpscaleMp4,inspectUpscaleVideoRanges,videoUpscaleParameters,quotedVideoUpscale,
  videoUpscaleEstimateMicros,buildVideoUpscaleInput,VIDEO_UPSCALERS} from '../lab-worker/video-upscale.mjs';

const fail=(status,message)=>{const error=new Error(message);error.status=status;throw error;};
const ascii=text=>new Uint8Array([...text].map(c=>c.charCodeAt(0)));
function u32(n){return new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]);}
function join(...parts){const arrays=parts.map(x=>x instanceof Uint8Array?x:new Uint8Array(x));const out=new Uint8Array(arrays.reduce((n,x)=>n+x.length,0));let at=0;for(const part of arrays){out.set(part,at);at+=part.length;}return out;}
function box(kind,...contents){const b=join(...contents);return join(u32(b.length+8),ascii(kind),b);}
function fixture({frames=300,timescale=30000,delta=1000,width=640,height=360,fragmented=false}={}){
  const mdhd=box('mdhd',new Uint8Array(12),u32(timescale),u32(frames*delta),new Uint8Array(4));
  const hdlr=box('hdlr',new Uint8Array(8),ascii('vide'),new Uint8Array(8));
  const stts=box('stts',u32(0),u32(1),u32(frames),u32(delta));
  const stbl=box('stbl',stts);
  const minf=box('minf',stbl);
  const mdia=box('mdia',mdhd,hdlr,minf);
  const tkhd=box('tkhd',new Uint8Array(76),u32(width*65536),u32(height*65536));
  const trak=box('trak',tkhd,mdia);
  const moov=box('moov',trak,...(fragmented?[box('mvex',new Uint8Array(8))]:[]));
  return join(box('ftyp',ascii('isom'),u32(0),ascii('isom')),moov);
}
test('MP4 server validation reads authoritative duration, fps, geometry and frames',()=>{
  const input=fixture(),info=inspectUpscaleMp4(input);
  assert.deepEqual(info,{duration:10,fps:30,width:640,height:360,frames:300});
});
test('MP4 metadata rejects malformed containers while retaining long-clip timing',()=>{
  assert.throws(()=>inspectUpscaleMp4(new Uint8Array(200)),/valid.*MP4|unfragmented MP4/i);
  assert.throws(()=>inspectUpscaleMp4(fixture({fragmented:true})),/readable.*index/);
  assert.equal(inspectUpscaleMp4(fixture({frames:18000})).duration,600);
  assert.equal(inspectUpscaleMp4(fixture({timescale:30000,delta:250})).fps,120);
});
test('server-side allowlist rejects spoofed modes, models, resolutions and references',()=>{
  const base={type:'video',engine:'video-upscale',mode:'upscale',videoUpscaleEngine:'bytedance',resolution:'1080p'};
  assert.equal(videoUpscaleParameters(base,{fail}).model,VIDEO_UPSCALERS.bytedance.endpoint);
  assert.throws(()=>videoUpscaleParameters({...base,videoUpscaleEngine:'other'},{fail}),/supported/);
  assert.throws(()=>videoUpscaleParameters({...base,videoUpscaleEngine:'proteus',resolution:'2k'},{fail}),/unavailable/);
  assert.throws(()=>videoUpscaleParameters({...base,referenceSourceIds:['x']},{fail}),/one original/);
  assert.throws(()=>videoUpscaleParameters({...base,prompt:'ignore safety checks'},{fail}),/without extra references or prompts/);
});
test('quotes enforce real upscaling, max factor and server-controlled prices',()=>{
  const metadata=inspectUpscaleMp4(fixture());
  const p=videoUpscaleParameters({videoUpscaleEngine:'bytedance',resolution:'1080p'},{fail});
  const q=quotedVideoUpscale(p,metadata,{fail});
  assert.equal(q.duration,10);assert.equal(q.sourceWidth,640);assert.equal(q.sourceHeight,360);
  assert.equal(q.scale,3);assert.equal(q.sourceFrames,300);assert.equal(q.targetFps,30);
  assert.equal(videoUpscaleEstimateMicros(q),Math.ceil(7200*10*1.15));
  assert.equal(quotedVideoUpscale({...p,resolution:'8k'},metadata,{fail}).scale,12);
  assert.equal(quotedVideoUpscale(p,{...metadata,width:1920,height:1080},{fail}).scale,1);
  assert.throws(()=>quotedVideoUpscale({...p,videoUpscaleEngine:'proteus',resolution:'4k'},metadata,{fail}),/over 4/);
  assert.throws(()=>quotedVideoUpscale({...p,videoUpscaleEngine:'proteus'},{...metadata,duration:301},{fail}),/5 minutes/);
});
test('fal inputs match documented model API schemas and keep safety checker enabled',()=>{
  const meta=inspectUpscaleMp4(fixture());
  const url='https://private.example/input/asset?expires=123&signature=valid';
  const bytedance=buildVideoUpscaleInput(quotedVideoUpscale(videoUpscaleParameters({videoUpscaleEngine:'bytedance',resolution:'1080p'},{fail}),meta,{fail}),url);
  assert.deepEqual(bytedance,{video_url:url,target_resolution:'1080p',target_fps:30,
    enhancement_preset:'aigc',enhancement_tier:'standard',fidelity:'high',bit_depth:8});
  const topaz=quotedVideoUpscale(videoUpscaleParameters({videoUpscaleEngine:'proteus',resolution:'1080p'},{fail}),meta,{fail});
  assert.deepEqual(buildVideoUpscaleInput(topaz,url),{video_url:url,model:'Proteus',upscale_factor:3,H264_output:true,enable_safety_checker:true});
  const starlight=quotedVideoUpscale(videoUpscaleParameters({videoUpscaleEngine:'starlight',resolution:'1080p'},{fail}),meta,{fail});
  assert.deepEqual(buildVideoUpscaleInput(starlight,url),{video_url:url,model:'Starlight Precise 2.6',upscale_factor:3,H264_output:true,enable_safety_checker:true});
  assert.throws(()=>buildVideoUpscaleInput(topaz,'http://not-private'),/private HTTPS/);
});
test('website has Video tab, three API providers and distinct private upload + quote/confirm',()=>{
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/video-upscale.js',import.meta.url),'utf8');
  const core=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  const worker=readFileSync(new URL('../lab-worker/worker.mjs',import.meta.url),'utf8');
  for(const name of ['bytedance','proteus','starlight'])assert.match(html,new RegExp('data-video-upscale-model="'+name+'"'));
  assert.match(html,/data-video-upscale-tab="video"/);
  assert.match(readFileSync(new URL('../lab/video-source-upload.js',import.meta.url),'utf8'),/\/api\/video-uploads/);
  assert.match(js,/\/api\/quotes/);assert.match(js,/\/api\/jobs/);assert.match(js,/confirm:true/);
  assert.match(core,/createVideoUpscaler/);assert.match(core,/historyJobVisible/);
  assert.match(worker,/fal-video-upscale-v1/);assert.match(worker,/inspectUpscaleMp4/);
});

test('real QuickTime MOV uses the same authoritative timing and quote as MP4',()=>{
  const mp4=inspectUpscaleMp4(readFileSync(new URL('./fixtures/video-upscale/valid-1s.mp4',import.meta.url)));
  const mov=inspectUpscaleMp4(readFileSync(new URL('./fixtures/video-upscale/valid-1s.mov',import.meta.url)));
  assert.deepEqual(mov,mp4);
  const p=videoUpscaleParameters({videoUpscaleEngine:'proteus',resolution:'1080p'},{fail});
  assert.deepEqual(quotedVideoUpscale(p,mov,{fail}),quotedVideoUpscale(p,mp4,{fail}));
});

test('20 GB source metadata is read using bounded ranges without reading media payload',async()=>{
 const original=fixture({frames:9000}),prefix=original.slice(0,20),moov=original.slice(20);
 const size=20*1024*1024*1024,mdatSize=size-prefix.length-moov.length;
 const mdat=join(u32(1),ascii('mdat'),u32(Math.floor(mdatSize/4294967296)),u32(mdatSize%4294967296));
 const moovAt=prefix.length+mdatSize,calls=[];
 const info=await inspectUpscaleVideoRanges(size,async(offset,length)=>{
   calls.push([offset,length]);assert.ok(length<1024,'Metadata only');
   if(offset===0)return prefix.slice(0,length);
   if(offset===prefix.length)return mdat.slice(0,length);
   if(offset===moovAt)return moov.slice(0,length);
   throw Error('Attempted to read the media payload');
 });
 assert.equal(info.duration,300);assert.equal(info.frames,9000);
 assert.ok(calls.reduce((n,x)=>n+x[1],0)<1024);
});
test('all documented ByteDance resolutions and FPS billing buckets are priced before confirmation',()=>{
 const meta=inspectUpscaleMp4(fixture({frames:18000}));
 for(const [resolution,rate] of [['6k',57400],['8k',114800]]){
   for(const [fps,multiplier] of [[30,1],[31,2],[60,2],[120,4]]){
     const p=videoUpscaleParameters({videoUpscaleEngine:'bytedance',resolution},{fail});
     const q=quotedVideoUpscale(p,{...meta,fps},{fail});
     assert.equal(videoUpscaleEstimateMicros(q),Math.ceil(rate*600*multiplier*1.15));
   }
 }
});
