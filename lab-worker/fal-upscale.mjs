// fal.ai video enhancement helpers. Pure validation/pricing plus queue transport.
export const FAL_ENDPOINTS=Object.freeze({
  bytedance:'fal-ai/bytedance-upscaler/upscale/video',
  precision:'topaz/upscale/video/precision',
  starlight:'topaz/upscale/video/generative'
});
const BYTE_RES=['1080p','2k','4k','6k','8k'];
const BYTE_FAL_30=Object.freeze({1080p:0.0072,'2k':0.0144,'4k':0.0288});
const BYTEPLUS_30=Object.freeze({'6k':3.3056/60,'8k':6.6112/60});
const TOPAZ_PRECISION=Object.freeze({fhd:0.02,uhd:0.06});
const STARLIGHT=Object.freeze({fhd:0.12,uhd:0.26});
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
export function videoUpscaleParameters(value,{fail=(s,m)=>{const e=new Error(m);e.status=s;throw e;}}={}) {
  const engine=['bytedance','precision','starlight'].includes(value?.upscaleEngine)?value.upscaleEngine:'bytedance';
  const duration=num(value?.sourceDuration);
  const sourceWidth=Math.round(num(value?.sourceWidth)),sourceHeight=Math.round(num(value?.sourceHeight));
  if(duration<=0||duration>60)fail(400,'Video Enhance accepts clips up to 60 seconds.');
  if(sourceWidth<16||sourceHeight<16||sourceWidth>16384||sourceHeight>16384)fail(400,'Could not read the source video dimensions.');
  const fps=value?.targetFps==='source'?null:Number(value?.targetFps||0);
  if(fps!==null&&![24,25,30,50,60].includes(fps))fail(400,'Choose source FPS, 24, 25, 30, 50 or 60.');
  const base={type:'video',mode:'video-upscale',provider:'fal',upscaleEngine:engine,prompt:'',sourceDuration:Math.round(duration*1000)/1000,sourceWidth,sourceHeight,targetFps:fps,referenceRoles:[]};
  if(engine==='bytedance'){
    const targetResolution=BYTE_RES.includes(value?.targetResolution)?value.targetResolution:'1080p';
    const tier=['standard','pro'].includes(value?.enhancementTier)?value.enhancementTier:'standard';
    const fidelity=['high','medium'].includes(value?.fidelity)?value.fidelity:'high';
    const bitDepth=Number(value?.bitDepth||8);
    if(![8,10,12].includes(bitDepth)||tier!=='pro'&&bitDepth!==8)fail(400,'10-bit and 12-bit ByteDance output require Pro.');
    return {...base,model:FAL_ENDPOINTS.bytedance,targetResolution,enhancementTier:tier,fidelity,bitDepth};
  }
  if(engine==='precision'){
    const precisionModel=['Proteus','Proteus Natural','Iris'].includes(value?.precisionModel)?value.precisionModel:'Proteus';
    return {...base,model:FAL_ENDPOINTS.precision,precisionModel,upscaleFactor:2};
  }
  const softness=Math.max(1,Math.min(5,num(value?.softness,3)));
  return {...base,model:FAL_ENDPOINTS.starlight,starlightModel:'Starlight Precise 2.6',upscaleFactor:2,softness};
}
function fpsMultiplier(p){return p.targetFps&&p.targetFps>30?2:1;}
function outputPixels(p){return p.sourceWidth*p.sourceHeight*(p.upscaleFactor||2)**2;}
export function estimateFalQuote(p){
  const seconds=p.sourceDuration;
  if(p.upscaleEngine==='bytedance'){
    let perSecond=BYTE_FAL_30[p.targetResolution],basis='fal public 30fps rate';
    if(perSecond==null){
      // fal does not publish 6K/8K figures on the model page. Reserve 10% above BytePlus direct public pricing.
      perSecond=BYTEPLUS_30[p.targetResolution]*1.10;basis='BytePlus public 30fps rate + 10% safety reserve';
    }
    perSecond*=fpsMultiplier(p)*(p.enhancementTier==='pro'?10:1);
    return {usd:Math.ceil(seconds*perSecond*1000000)/1000000,basis};
  }
  const uhd=outputPixels(p)>1920*1080;
  const perSecond=(p.upscaleEngine==='precision'?(uhd?TOPAZ_PRECISION.uhd:TOPAZ_PRECISION.fhd):(uhd?STARLIGHT.uhd:STARLIGHT.fhd))*fpsMultiplier(p);
  return {usd:Math.ceil(seconds*perSecond*1000000)/1000000,basis:p.upscaleEngine==='precision'?'fal Topaz Precision public rate':'fal Starlight public rate'};
}
export function buildFalInput(p,videoUrl){
  if(p.upscaleEngine==='bytedance'){
    return {video_url:videoUrl,target_resolution:p.targetResolution,...(p.targetFps?{target_fps:p.targetFps}:{}),enhancement_preset:'aigc',enhancement_tier:p.enhancementTier,fidelity:p.fidelity,bit_depth:p.bitDepth};
  }
  if(p.upscaleEngine==='precision'){
    return {video_url:videoUrl,model:p.precisionModel,upscale_factor:2,...(p.targetFps?{target_fps:p.targetFps}:{}),H264_output:false};
  }
  return {video_url:videoUrl,model:'Starlight Precise 2.6',upscale_factor:2,...(p.targetFps?{target_fps:p.targetFps}:{}),softness:p.softness,H264_output:false};
}
async function falJson(url,key,options={}){
  let r;
  try{r=await fetch(url,{...options,headers:{Authorization:'Key '+key,Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})},signal:AbortSignal.timeout(20000)});}
  catch{const e=new Error('fal.ai could not be reached. Check History before retrying a paid submission.');e.uncertain=options.method==='POST';throw e;}
  const raw=await r.text();let data=null;try{data=raw?JSON.parse(raw):null;}catch{}
  if(!r.ok){const detail=String(data?.detail||data?.message||data?.error||raw||'Provider rejected the request.').replace(/[\r\n]+/g,' ').slice(0,240);const e=new Error('fal.ai: '+detail);e.status=r.status;throw e;}
  return data||{};
}
export async function falSubmit(endpoint,key,input){
  const data=await falJson('https://queue.fal.run/'+endpoint,key,{method:'POST',body:JSON.stringify(input)});
  if(typeof data.request_id!=='string'||!data.request_id)throw new Error('fal.ai did not return a request id.');
  return data.request_id;
}
export function falStatus(endpoint,key,id){return falJson('https://queue.fal.run/'+endpoint+'/requests/'+encodeURIComponent(id)+'/status',key);}
export function falResult(endpoint,key,id){return falJson('https://queue.fal.run/'+endpoint+'/requests/'+encodeURIComponent(id),key);}
