import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectUpscaleMp4,videoUpscaleParameters,quotedVideoUpscale,
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
test('MP4 metadata refuses fragmented or invalid containers, overlong duration and unbounded FPS',()=>{
  assert.throws(()=>inspectUpscaleMp4(new Uint8Array(200)),/valid.*MP4|unfragmented MP4/i);
  assert.throws(()=>inspectUpscaleMp4(fixture({fragmented:true})),/readable video index/);
  assert.throws(()=>inspectUpscaleMp4(fixture({frames:1000})),/30 seconds/);
  assert.throws(()=>inspectUpscaleMp4(fixture({timescale:30000,delta:100})),/8 to 60/);
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
  assert.throws(()=>quotedVideoUpscale({...p,resolution:'4k'},metadata,{fail}),/over 4/);
  assert.throws(()=>quotedVideoUpscale(p,{...metadata,width:1920,height:1080},{fail}),/higher resolution/);
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
  assert.match(js,/\/api\/reference-uploads/);
  assert.match(js,/\/api\/quotes/);assert.match(js,/\/api\/jobs/);assert.match(js,/confirm:true/);
  assert.match(core,/createVideoUpscaler/);assert.match(core,/historyJobVisible/);
  assert.match(worker,/fal-video-upscale-v1/);assert.match(worker,/inspectUpscaleMp4/);
});
