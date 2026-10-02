// fal.ai Controlled Pose, pose preview and masked repair helpers for PV Lab.
export const FAL_CONTROLLED_POSE='fal-ai/flux-general';
export const FAL_CONTROLLED_INPAINT='fal-ai/flux-general/inpainting';
export const FAL_DWPOSE='fal-ai/dwpose';
export const FAL_PRICE_PER_MP=0.075;

const RATIOS=Object.freeze({
  '1:1':{width:1024,height:1024},
  '4:3':{width:1024,height:768},
  '3:4':{width:768,height:1024},
  '16:9':{width:1024,height:576},
  '9:16':{width:576,height:1024},
  '21:9':{width:1344,height:576}
});
const num=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const defaultFail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};

export function controlledPoseParameters(value,{fail=defaultFail}={}){
  const prompt=typeof value?.prompt==='string'?value.prompt.trim():'';
  if(!prompt||prompt.length>5000)fail(400,'Controlled Pose needs a prompt up to 5,000 characters.');
  const aspectRatio=Object.hasOwn(RATIOS,value?.aspectRatio)?value.aspectRatio:'3:4';
  const poseStrength=num(value?.poseStrength,1);
  const identityStrength=num(value?.identityStrength,0.7);
  if(poseStrength<0||poseStrength>2)fail(400,'Pose strength must be between 0 and 2.');
  if(identityStrength<0||identityStrength>2)fail(400,'Identity strength must be between 0 and 2.');
  const seed=value?.seed===''||value?.seed==null?null:Number(value.seed);
  if(seed!==null&&(!Number.isInteger(seed)||seed<0||seed>2147483647))fail(400,'Seed must be a whole number from 0 to 2147483647.');
  return {
    type:'image',provider:'fal',engine:'fal',model:FAL_CONTROLLED_POSE,mode:'controlled-pose',
    prompt,resolution:'1k',aspectRatio,outputFormat:'png',poseStrength,identityStrength,seed,
    referenceRoles:Array.isArray(value?.referenceRoles)?value.referenceRoles:[]
  };
}

export function controlledRepairParameters(value,{fail=defaultFail}={}){
  const prompt=typeof value?.prompt==='string'?value.prompt.trim():'';
  if(!prompt||prompt.length>5000)fail(400,'Repair Region needs a prompt up to 5,000 characters.');
  const strength=num(value?.strength,0.75),poseStrength=num(value?.poseStrength,0.65),identityStrength=num(value?.identityStrength,0.7);
  if(strength<0.05||strength>1)fail(400,'Repair strength must be between 0.05 and 1.');
  if(poseStrength<0||poseStrength>2||identityStrength<0||identityStrength>2)fail(400,'Repair control strengths must be between 0 and 2.');
  const width=Math.round(num(value?.sourceWidth,1024)),height=Math.round(num(value?.sourceHeight,1024));
  if(width<128||height<128||width>8192||height>8192)fail(400,'Could not read valid source image dimensions for repair.');
  const seed=value?.seed===''||value?.seed==null?null:Number(value.seed);
  if(seed!==null&&(!Number.isInteger(seed)||seed<0||seed>2147483647))fail(400,'Seed must be a whole number from 0 to 2147483647.');
  return {
    type:'image',provider:'fal',engine:'fal',model:FAL_CONTROLLED_INPAINT,mode:'controlled-repair',
    prompt,resolution:'source',aspectRatio:'source',outputFormat:'png',strength,poseStrength,identityStrength,
    sourceWidth:width,sourceHeight:height,seed,referenceRoles:Array.isArray(value?.referenceRoles)?value.referenceRoles:[]
  };
}

export function controlledPoseRefs(referenceRoles,count,{fail=defaultFail,allowEmpty=false}={}){
  if(count===0&&allowEmpty)return {pose:null,identity:[]};
  if(!Array.isArray(referenceRoles)||referenceRoles.length!==count)fail(400,'Controlled Pose reference roles must match the selected images.');
  const pose=[],identity=[],unsupported=[];
  referenceRoles.forEach((r,i)=>{
    if(r?.role==='pose')pose.push(i);
    else if(r?.role==='identity')identity.push(i);
    else unsupported.push(i);
  });
  if(pose.length!==1)fail(400,'Controlled Pose needs exactly one reference assigned the Pose role.');
  if(identity.length<1||identity.length>4)fail(400,'Controlled Pose needs 1 to 4 references assigned the Identity role.');
  if(unsupported.length)fail(400,'Controlled Pose uses only Pose and Identity references. Assign or remove every selected reference.');
  return {pose:pose[0],identity};
}

export function controlledRepairRefs(referenceRoles,count,{fail=defaultFail}={}){
  if(count===0)return {pose:null,identity:[]};
  if(!Array.isArray(referenceRoles)||referenceRoles.length!==count)fail(400,'Repair reference roles must match the selected images.');
  const pose=[],identity=[],unsupported=[];
  referenceRoles.forEach((r,i)=>{
    if(r?.role==='pose')pose.push(i);
    else if(r?.role==='identity')identity.push(i);
    else unsupported.push(i);
  });
  if(pose.length>1)fail(400,'Repair Region accepts at most one Pose reference.');
  if(identity.length>4)fail(400,'Repair Region accepts up to four Identity references.');
  if(unsupported.length)fail(400,'Repair Region reuses only Pose and Identity references.');
  return {pose:pose.length?pose[0]:null,identity};
}

export function falImageSize(aspectRatio){return RATIOS[aspectRatio]||RATIOS['3:4'];}
export function estimateImageMicros(width,height){
  const mp=Math.max(1,Math.ceil((Number(width)*Number(height))/1_000_000));
  return mp*Math.round(FAL_PRICE_PER_MP*1_000_000);
}
export function controlledPoseEstimateMicros(p){
  const size=falImageSize(p.aspectRatio);return estimateImageMicros(size.width,size.height);
}
export function controlledRepairEstimateMicros(p){return estimateImageMicros(p.sourceWidth,p.sourceHeight);}

export function buildControlledPoseInput(p,{poseMapUrl,identityUrls}){
  const easycontrols=[
    {control_method_url:'pose',scale:p.poseStrength,image_url:poseMapUrl,image_control_type:'spatial'},
    ...identityUrls.map(url=>({control_method_url:'subject',scale:p.identityStrength,image_url:url,image_control_type:'subject'}))
  ];
  const prompt=[
    'Use the pose control only for body structure, orientation and limb placement. Use the subject controls only for the same adult identity.',
    p.prompt,
    'Photographic realism, coherent anatomy, believable hands and limbs, natural skin texture.'
  ].join('\n');
  return {
    prompt,image_size:falImageSize(p.aspectRatio),num_inference_steps:28,easycontrols,
    guidance_scale:3.5,real_cfg_scale:3.5,num_images:1,enable_safety_checker:true,
    output_format:'png',scheduler:'euler',...(p.seed===null?{}:{seed:p.seed})
  };
}

export function buildRepairInput(p,{imageUrl,maskUrl,poseMapUrl=null,identityUrls=[]}){
  const easycontrols=[];
  if(poseMapUrl)easycontrols.push({control_method_url:'pose',scale:p.poseStrength,image_url:poseMapUrl,image_control_type:'spatial'});
  for(const url of identityUrls)easycontrols.push({control_method_url:'subject',scale:p.identityStrength,image_url:url,image_control_type:'subject'});
  return {
    prompt:p.prompt,image_url:imageUrl,mask_url:maskUrl,strength:p.strength,easycontrols,
    num_inference_steps:28,guidance_scale:3.5,real_cfg_scale:3.5,num_images:1,
    enable_safety_checker:true,output_format:'png',scheduler:'euler',...(p.seed===null?{}:{seed:p.seed})
  };
}

async function falJson(url,key,options={}){
  let response;
  try{
    response=await fetch(url,{...options,headers:{Authorization:'Key '+key,Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})},signal:AbortSignal.timeout(options.timeout||20000)});
  }catch{
    const e=new Error('fal.ai could not be reached. Check History before retrying a paid submission.');
    e.uncertain=options.method==='POST';throw e;
  }
  const raw=await response.text();let data=null;try{data=raw?JSON.parse(raw):null;}catch{}
  if(!response.ok){
    const rawDetail=data?.detail??data?.message??data?.error??raw??'Provider rejected the request.';
    const detail=typeof rawDetail==='string'?rawDetail:(Array.isArray(rawDetail)?rawDetail.map(item=>{
      if(typeof item==='string')return item;
      if(item&&typeof item==='object'){
        const loc=Array.isArray(item.loc)?item.loc.join('.'):'';
        const msg=typeof item.msg==='string'?item.msg:typeof item.message==='string'?item.message:'';
        const type=typeof item.type==='string'?item.type:'';
        return [loc,msg,type].filter(Boolean).join(': ');
      }
      return String(item);
    }).filter(Boolean).join(' | '):JSON.stringify(rawDetail));
    const safeDetail=String(detail||'Provider rejected the request.').replace(/[\r\n]+/g,' ').slice(0,600);
    const e=new Error('fal.ai (HTTP '+response.status+'): '+safeDetail);e.status=response.status;e.definite=options.method==='POST'&&response.status>=400&&response.status<500&&response.status!==408&&response.status!==429;throw e;
  }
  return data||{};
}
export async function falSubmit(endpoint,key,input){
  try{
    const data=await falJson('https://queue.fal.run/'+endpoint,key,{method:'POST',body:JSON.stringify(input)});
    if(typeof data.request_id!=='string'||!data.request_id)throw new Error('fal.ai did not return a request id. Check the original request before retrying.');
    return data.request_id;
  }catch(e){if(e.definite!==true)e.uncertain=true;throw e;}
}
// Match fal's official SDK: submit to the complete model route, but retrieve
// status/results from its owning application. Model subpaths are not queue paths.
// https://github.com/fal-ai/fal-js/blob/012ef177b996b9c78ac0d5baf4c430b9a249028b/libs/client/src/queue.ts
function falQueueApp(endpoint){
  const parts=String(endpoint).split('/'),count=['workflows','comfy'].includes(parts[0])?3:2;
  if(parts.length<count||parts.some(x=>!x||! /^[a-zA-Z0-9_.-]+$/.test(x)))throw new Error('Invalid fal.ai model endpoint.');
  return parts.slice(0,count).join('/');
}
export function falStatus(endpoint,key,id){return falJson('https://queue.fal.run/'+falQueueApp(endpoint)+'/requests/'+encodeURIComponent(id)+'/status?logs=1',key);}
export function falResult(endpoint,key,id){return falJson('https://queue.fal.run/'+falQueueApp(endpoint)+'/requests/'+encodeURIComponent(id),key);}
export async function falAwait(endpoint,key,input,{timeoutMs=45000,pollMs=750}={}){
  const id=await falSubmit(endpoint,key,input),started=Date.now();
  while(Date.now()-started<timeoutMs){
    const status=await falStatus(endpoint,key,id),state=String(status?.status||'').toUpperCase();
    if(state==='COMPLETED')return {requestId:id,result:await falResult(endpoint,key,id)};
    if(['FAILED','CANCELLED','CANCELED'].includes(state))throw new Error(String(status?.error||status?.detail||'fal.ai request failed.'));
    await new Promise(resolve=>setTimeout(resolve,pollMs));
  }
  const e=new Error('fal.ai pose preview is still processing. Try Preview Pose again in a moment.');e.definite=true;throw e;
}
