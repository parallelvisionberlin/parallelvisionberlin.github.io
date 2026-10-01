// Direct fal.ai video integrations for PV Lab.
// Provider safety settings stay enabled; no filter-bypass options are exposed.
export const FAL_H3_MAX_REFERENCE='minimax/h3-max/reference-to-video';
export const FAL_OMNI=Object.freeze({
  start:'google/gemini-omni-flash/v1.1/image-to-video',
  reference:'google/gemini-omni-flash/v1.1/reference-to-video',
  text:'google/gemini-omni-flash/v1.1/text-to-video'
});

const H3_RATES=Object.freeze({'480p':0.05,'768p':0.08,'1080p':0.16});
const OMNI_RATES=Object.freeze({'360p':0.03,'720p':0.10,'1080p':0.15,'4k':0.30});

export function falVideoParameters(value,{fail,referenceLabels}){
  const prompt=typeof value.prompt==='string'?value.prompt.trim():'';
  if(prompt.length<1||prompt.length>6000)fail(400,'Video prompts must be 1 to 6,000 characters.');
  const duration=Number(value.duration),mode=value.mode==='reference'?'reference':value.mode==='text'?'text':'start';
  const referencePixels=Array.isArray(value.referencePixels)?value.referencePixels.map(Number):[];
  if(value.engine==='h3maxfal'){
    if(mode!=='reference')fail(400,'H3 Max Reference on fal.ai uses Reference mode.');
    if(!Number.isInteger(duration)||duration<5||duration>15)fail(400,'H3 Max Reference supports 5 to 15 seconds.');
    const resolution=value.resolution;
    if(!Object.hasOwn(H3_RATES,resolution))fail(400,'Choose 480p, 768p or 1080p for H3 Max Reference.');
    const aspectRatio=value.aspectRatio||'auto';
    if(!['auto','21:9','16:9','4:3','1:1','3:4','9:16'].includes(aspectRatio))fail(400,'Choose a supported H3 Max Reference aspect ratio.');
    if(referencePixels.length>12||referencePixels.some(n=>!Number.isFinite(n)||n<1||n>64000000))fail(400,'Invalid H3 Max reference dimensions.');
    return {type:'video',provider:'fal',engine:'h3maxfal',model:FAL_H3_MAX_REFERENCE,mode:'reference',prompt,duration,resolution,aspectRatio,seed:null,audio:true,referenceRoles:referenceLabels(value.referenceRoles,12),referencePixels};
  }
  if(value.engine==='omni'){
    if(!Object.hasOwn(FAL_OMNI,mode))fail(400,'Unsupported Gemini Omni Flash video mode.');
    if(!Number.isInteger(duration)||duration<3||duration>10)fail(400,'Gemini Omni Flash supports 3 to 10 second clips in this Lab.');
    const resolution=value.resolution;
    if(!Object.hasOwn(OMNI_RATES,resolution))fail(400,'Choose 360p, 720p, 1080p or 4K for Gemini Omni Flash.');
    const aspectRatio=value.aspectRatio||'16:9';
    if(!['16:9','9:16'].includes(aspectRatio))fail(400,'Gemini Omni Flash supports 16:9 or 9:16.');
    return {type:'video',provider:'fal',engine:'omni',model:FAL_OMNI[mode],mode,prompt,duration,resolution,aspectRatio,seed:null,audio:true,referenceRoles:referenceLabels(value.referenceRoles,10)};
  }
  fail(400,'Unknown fal.ai video model.');
}

export function falVideoEstimateMicros(p){
  let usd;
  if(p.engine==='h3maxfal'){
    usd=p.duration*H3_RATES[p.resolution];
    const pixels=(p.referencePixels||[]).reduce((sum,n)=>sum+n,0);
    const tokens=pixels/1024;
    usd+=Math.max(0,tokens-4096)/1000*0.02;
  }else if(p.engine==='omni')usd=p.duration*OMNI_RATES[p.resolution];
  else throw new Error('Unknown fal.ai video model.');
  return Math.ceil(usd*1000000);
}

export function buildFalVideoInput(p,{imageUrls=[],imageUrl=null,endImageUrl=null}={}){
  if(p.engine==='h3maxfal'){
    return {
      prompt:p.prompt,
      duration:p.duration,
      resolution:p.resolution.toUpperCase(),
      aspect_ratio:p.aspectRatio==='auto'?'adaptive':p.aspectRatio,
      prompt_expansion_mode:'disabled',
      enable_safety_checker:true,
      reference_image_urls:imageUrls
    };
  }
  const input={prompt:p.prompt,aspect_ratio:p.aspectRatio,resolution:p.resolution,duration:p.duration};
  if(p.mode==='start'){input.image_url=imageUrl;if(endImageUrl)input.end_image_url=endImageUrl;}
  if(p.mode==='reference')input.image_urls=imageUrls;
  return input;
}
