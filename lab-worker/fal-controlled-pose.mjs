// fal.ai Controlled Pose helpers for PV Lab. No browser credentials.
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
const number=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;

export function controlledPoseParameters(value,{fail=(status,message)=>{const e=new Error(message);e.status=status;throw e;}}={}){
  const prompt=typeof value?.prompt==='string'?value.prompt.trim():'';
  if(!prompt||prompt.length>5000)fail(400,'Controlled Pose needs a prompt up to 5,000 characters.');
  const aspectRatio=Object.hasOwn(RATIOS,value?.aspectRatio)?value.aspectRatio:'3:4';
  const poseStrength=number(value?.poseStrength,1);
  const identityStrength=number(value?.identityStrength,0.7);
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
export function controlledPoseRefs(referenceRoles,count,{fail=(status,message)=>{const e=new Error(message);e.status=status;throw e;}}={}){
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
export function falImageSize(aspectRatio){return RATIOS[aspectRatio]||RATIOS['3:4'];}
export function controlledPoseEstimateMicros(p){
  const size=falImageSize(p.aspectRatio),mp=size.width*size.height/1_000_000;
  return Math.ceil(mp)*Math.round(FAL_PRICE_PER_MP*1_000_000);
}
export function buildControlledPoseInput(p,{poseUrl,identityUrls}){
  const easycontrols=[
    {control_method_url:'pose',scale:p.poseStrength,image_url:poseUrl,image_control_type:'spatial'},
    ...identityUrls.map(url=>({control_method_url:'subject',scale:p.identityStrength,image_url:url,image_control_type:'subject'}))
  ];
  const prompt=[
    'Use the spatial control only for body pose and orientation. Use the subject controls only for the same adult identity.',
    p.prompt,
    'Photographic realism, believable anatomy, coherent hands and limbs, natural skin texture.'
  ].join('\n');
  return {
    prompt,image_size:falImageSize(p.aspectRatio),num_inference_steps:28,easycontrols,
    guidance_scale:3.5,num_images:1,enable_safety_checker:true,output_format:'png',
    ...(p.seed===null?{}:{seed:p.seed})
  };
}
export function buildRepairInput(p,{imageUrl,maskUrl,poseUrl,identityUrls=[]}){
  const easycontrols=[];
  if(poseUrl)easycontrols.push({control_method_url:'pose',scale:p.poseStrength,image_url:poseUrl,image_control_type:'spatial'});
  for(const url of identityUrls)easycontrols.push({control_method_url:'subject',scale:p.identityStrength,image_url:url,image_control_type:'subject'});
  return {
    prompt:p.prompt,image_url:imageUrl,mask_url:maskUrl,strength:number(p.strength,0.75),
    easycontrols,num_inference_steps:28,guidance_scale:3.5,num_images:1,
    enable_safety_checker:true,output_format:'png',...(p.seed===null?{}:{seed:p.seed})
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
    const detail=String(data?.detail||data?.message||data?.error||raw||'Provider rejected the request.').replace(/[\r\n]+/g,' ').slice(0,300);
    const e=new Error('fal.ai: '+detail);e.status=response.status;e.definite=response.status>=400&&response.status<500&&response.status!==408&&response.status!==429;throw e;
  }
  return data||{};
}
export async function falSubmit(endpoint,key,input){
  const data=await falJson('https://queue.fal.run/'+endpoint,key,{method:'POST',body:JSON.stringify(input)});
  if(typeof data.request_id!=='string'||!data.request_id)throw new Error('fal.ai did not return a request id.');
  return data.request_id;
}
export function falStatus(endpoint,key,id){return falJson('https://queue.fal.run/'+endpoint+'/requests/'+encodeURIComponent(id)+'/status',key);}
export function falResult(endpoint,key,id){return falJson('https://queue.fal.run/'+endpoint+'/requests/'+encodeURIComponent(id),key);}
