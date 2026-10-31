/* PV LAB video upscaling. Server-owned model allowlist and estimates.
 * fal.ai API schemas checked 2026-10-31:
 * https://fal.ai/models/fal-ai/bytedance-upscaler/upscale/video/api
 * https://fal.ai/models/topaz/upscale/video/precision/api
 * https://fal.ai/models/topaz/upscale/video/generative/api
 * Prices are estimates, not fal.ai's final settlement.
 */
export const VIDEO_UPSCALERS=Object.freeze({
  bytedance:{endpoint:'fal-ai/bytedance-upscaler/upscale/video',label:'ByteDance Standard',rates:{'1080p':7200,'2k':14400,'4k':28800}},
  proteus:{endpoint:'topaz/upscale/video/precision',label:'Topaz Proteus',rates:{'1080p':20000,'4k':60000}},
  starlight:{endpoint:'topaz/upscale/video/generative',label:'Topaz Starlight Precise 2.6',rates:{'1080p':120000,'4k':260000}}
});
export const VIDEO_UPSCALE_MAX_BYTES=20*1024*1024;
export const VIDEO_UPSCALE_MAX_SECONDS=30;
const LONG_EDGES=Object.freeze({'1080p':1920,'2k':2560,'4k':3840});
const text4=(a,p)=>String.fromCharCode(a[p],a[p+1],a[p+2],a[p+3]);

export function videoUpscaleParameters(value,{fail}){
  const engine=String(value.videoUpscaleEngine||'');
  if(!Object.hasOwn(VIDEO_UPSCALERS,engine))fail(400,'Choose a supported video upscaling model.');
  const resolution=String(value.resolution||'1080p').toLowerCase();
  if(!Object.hasOwn(VIDEO_UPSCALERS[engine].rates,resolution))fail(400,'This resolution is unavailable for the selected video model.');
  if(value.referenceSourceIds?.length||value.lastSourceId||value.transferSourceIds?.length||value.prompt)
    fail(400,'Video upscaling takes one original video, without extra references or prompts.');
  return {type:'video',provider:'fal',engine:'video-upscale',mode:'upscale',videoUpscaleEngine:engine,
    model:VIDEO_UPSCALERS[engine].endpoint,resolution,aspectRatio:'source',prompt:'',
    referenceSourceIds:[],referenceRoles:[]};
}

// MP4 containers contain authoritative video duration, sample timing and
// dimensions. Do not price an arbitrary client-provided duration or frame rate.
// Reject unsupported/fragmented media instead of guessing and undercharging.
export function inspectUpscaleMp4(data){
  const bytes=data instanceof Uint8Array?data:new Uint8Array(data);
  if(bytes.byteLength<128||text4(bytes,4)!=='ftyp')throw Error('Use a valid, unfragmented MP4 video.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const u32=p=>view.getUint32(p);
  const boxes=(from,to)=>{
    const out=[];let p=from;
    while(p+8<=to){
      let size=u32(p),header=8;
      if(size===1){if(p+16>to)throw Error('Invalid MP4 box.');const hi=u32(p+8),lo=u32(p+12);
        size=hi*4294967296+lo;header=16;}
      else if(size===0)size=to-p;
      if(!Number.isSafeInteger(size)||size<header||p+size>to)throw Error('Invalid MP4 box dimensions.');
      out.push({type:text4(bytes,p+4),start:p+header,end:p+size});
      p+=size;
    }
    return out;
  };
  const inside=(parent,type)=>parent?boxes(parent.start,parent.end).find(b=>b.type===type):null;
  const root=boxes(0,bytes.length),moov=root.find(b=>b.type==='moov');
  if(!moov||inside(moov,'mvex'))throw Error('This MP4 has no readable video index. Export as a standard MP4 (H.264).');
  let found=null;
  for(const trak of boxes(moov.start,moov.end).filter(b=>b.type==='trak')){
    const mdia=inside(trak,'mdia'),hdlr=inside(mdia,'hdlr');
    if(!hdlr||hdlr.start+12>hdlr.end||text4(bytes,hdlr.start+8)!=='vide')continue;
    const mdhd=inside(mdia,'mdhd'),tkhd=inside(trak,'tkhd');
    const minf=inside(mdia,'minf'),stbl=inside(minf,'stbl'),stts=inside(stbl,'stts');
    if(!mdhd||!tkhd||!stts||mdhd.start+20>mdhd.end||stts.start+8>stts.end)
      throw Error('MP4 timing metadata is incomplete. Export a standard H.264 MP4.');
    const version=bytes[mdhd.start],scaleAt=mdhd.start+(version===1?20:12);
    if(scaleAt+4>mdhd.end)throw Error('Invalid MP4 time scale.');
    const timescale=u32(scaleAt);
    const count=u32(stts.start+4);
    if(!timescale||count===0||count>100000||stts.start+8+count*8>stts.end)
      throw Error('Invalid MP4 frame timing.');
    let samples=0,ticks=0;
    for(let k=0;k<count;k++){
      const n=u32(stts.start+8+k*8),delta=u32(stts.start+12+k*8);
      if(!n||!delta)throw Error('Invalid MP4 frame rate.');
      samples+=n;ticks+=n*delta;
    }
    const duration=ticks/timescale,fps=samples/duration;
    const width=u32(tkhd.end-8)/65536,height=u32(tkhd.end-4)/65536;
    found={duration,fps,width:Math.round(width),height:Math.round(height),frames:samples};
    break;
  }
  if(!found||!Number.isFinite(found.duration)||found.duration<0.5||found.duration>VIDEO_UPSCALE_MAX_SECONDS||
    !Number.isFinite(found.fps)||found.fps<8||found.fps>60.1||found.frames>2000||
    !Number.isInteger(found.width)||!Number.isInteger(found.height)||
    found.width<160||found.height<160||found.width>7680||found.height>7680)
    throw Error('Choose an MP4 between 0.5 and 30 seconds, 8 to 60 fps, with a valid video track.');
  return found;
}

export function quotedVideoUpscale(p,metadata,{fail}){
  const sourceLong=Math.max(metadata.width,metadata.height),targetLong=LONG_EDGES[p.resolution];
  const scale=targetLong/sourceLong;
  if(scale<1.09)fail(400,'The selected output resolution must enlarge the source. Choose a higher resolution.');
  if(scale>4)fail(400,'This video needs over 4× enlargement. Choose a lower output size.');
  const roundedFps=Math.min(60,Math.max(8,Math.round(metadata.fps)));
  return {...p,duration:Math.round(metadata.duration*1000)/1000,sourceFps:Math.round(metadata.fps*100)/100,
    targetFps:roundedFps,sourceWidth:metadata.width,sourceHeight:metadata.height,
    scale:Math.round(scale*100000)/100000,sourceFrames:metadata.frames};
}
export function videoUpscaleEstimateMicros(p){
  const chosen=VIDEO_UPSCALERS[p.videoUpscaleEngine];
  const rate=chosen?.rates[p.resolution];
  if(!rate||!(p.duration>=0.5&&p.duration<=VIDEO_UPSCALE_MAX_SECONDS)||
     !(p.sourceFps>=8&&p.sourceFps<=60.1))throw Error('Verified video metadata is required for price calculation.');
  // USD micros per second; 15% conservative allowance for provider rounding.
  // Quote is a retail reservation, not an exact provider settlement.
  const fpsRatio=Math.max(1,(p.videoUpscaleEngine==='bytedance'?p.targetFps:p.sourceFps)/30);
  return Math.ceil(rate*p.duration*fpsRatio*1.15);
}
export function buildVideoUpscaleInput(p,videoUrl){
  if(!/^https:\/\//.test(videoUrl))throw Error('A private HTTPS input URL is required.');
  if(p.videoUpscaleEngine==='bytedance')return {
    video_url:videoUrl,target_resolution:p.resolution,target_fps:p.targetFps,
    enhancement_preset:'aigc',enhancement_tier:'standard',fidelity:'high',bit_depth:8
  };
  return {video_url:videoUrl,model:p.videoUpscaleEngine==='proteus'?'Proteus':'Starlight Precise 2.6',
    upscale_factor:p.scale,H264_output:true,enable_safety_checker:true};
}
