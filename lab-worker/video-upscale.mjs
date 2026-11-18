/* PV LAB video upscaling. Server-owned model allowlist and estimates.
 * fal.ai API schemas checked 2026-10-31:
 * https://fal.ai/models/fal-ai/bytedance-upscaler/upscale/video/api
 * https://fal.ai/models/topaz/upscale/video/precision/api
 * https://fal.ai/models/topaz/upscale/video/generative/api
 * Prices are estimates, not fal.ai's final settlement.
 */
export const VIDEO_UPSCALERS=Object.freeze({
  bytedance:{endpoint:'fal-ai/bytedance-upscaler/upscale/video',label:'ByteDance Standard',rates:{'1080p':7200,'2k':14400,'4k':28800,'6k':57400,'8k':114800}},
  proteus:{endpoint:'topaz/upscale/video/precision',label:'Topaz Proteus',rates:{'1080p':20000,'4k':60000}},
  starlight:{endpoint:'topaz/upscale/video/generative',label:'Topaz Starlight Precise 2.6',rates:{'1080p':120000,'4k':260000}}
});

const LONG_EDGES=Object.freeze({'1080p':1920,'2k':2560,'4k':3840,'6k':5760,'8k':7680});
import {inspectUpscaleMp4,inspectUpscaleVideoRanges,VIDEO_UPSCALE_MAX_SECONDS,VIDEO_UPSCALE_MAX_BYTES} from '../lab/video-upscale-metadata.js';
export {inspectUpscaleMp4,inspectUpscaleVideoRanges,VIDEO_UPSCALE_MAX_SECONDS,VIDEO_UPSCALE_MAX_BYTES};

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


export function quotedVideoUpscale(p,metadata,{fail}){
  const sourceLong=Math.max(metadata.width,metadata.height),targetLong=LONG_EDGES[p.resolution];
  const scale=targetLong/sourceLong;
  if(scale<1)fail(400,'Choose the source resolution or a higher output size.');
  if(p.videoUpscaleEngine!=='bytedance'&&metadata.duration>VIDEO_UPSCALE_MAX_SECONDS)fail(400,'Topaz accepts videos up to 5 minutes.');
  if(p.videoUpscaleEngine!=='bytedance'&&scale>4)fail(400,'This video needs over 4× enlargement. Choose a lower output size.');
  const roundedFps=Math.min(120,Math.max(24,Math.round(metadata.fps)));
  return {...p,duration:Math.round(metadata.duration*1000)/1000,sourceFps:Math.round(metadata.fps*100)/100,
    targetFps:roundedFps,sourceWidth:metadata.width,sourceHeight:metadata.height,
    scale:Math.round(scale*100000)/100000,sourceFrames:metadata.frames};
}
export function videoUpscaleEstimateMicros(p){
  const chosen=VIDEO_UPSCALERS[p.videoUpscaleEngine];
  const rate=chosen?.rates[p.resolution];
  if(!rate||!(p.duration>=0.5&&(p.videoUpscaleEngine==='bytedance'||p.duration<=VIDEO_UPSCALE_MAX_SECONDS))||
     !(p.sourceFps>0&&Number.isFinite(p.sourceFps)))throw Error('Verified video metadata is required for price calculation.');
  // USD micros per second; 15% conservative allowance for provider rounding.
  // Quote is a retail reservation, not an exact provider settlement.
  const fpsRatio=p.videoUpscaleEngine==='bytedance'?(p.targetFps>60?4:p.targetFps>30?2:1):Math.max(1,p.sourceFps/30);
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
