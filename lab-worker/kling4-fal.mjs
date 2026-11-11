// fal Kling 4 contracts checked 2026-11-11. Sources stay private and owner-scoped.
export const KLING4_FAL=Object.freeze({text:'kling/v4/text-to-video',start:'kling/v4/image-to-video',reference:'kling/v4/reference-to-video',transform:'kling/v4/video-to-video/edit'});
const RATIOS=['auto','16:9','9:16','1:1','21:9'];
export function kling4Parameters(value,{fail,referenceLabels}){
  const mode=value.mode||'start';
  if(!Object.hasOwn(KLING4_FAL,mode))fail(400,'Choose Text, Start frame, Reference set or Edit video for Kling 4.0.');
  if(value.provider&&value.provider!=='fal'||value.model&&value.model!==KLING4_FAL[mode])fail(400,'Kling 4.0 uses the selected fal endpoint.');
  const prompt=String(value.prompt||'').trim(),duration=Number(value.duration),resolution=value.resolution,aspectRatio=value.aspectRatio||'auto';
  if(prompt.length>26000)fail(400,'Kling 4.0 prompts are limited to 26,000 characters.');
  if(!Number.isInteger(duration)||duration<3||duration>30)fail(400,'Kling 4.0 supports 3 to 30 seconds.');
  if(!['720p','1080p'].includes(resolution)||!RATIOS.includes(aspectRatio)||mode==='start'&&aspectRatio!=='auto'||mode==='text'&&aspectRatio==='auto')fail(400,'Choose a supported Kling 4.0 resolution and aspect ratio. Frames follow the source ratio.');
  if(value.seed!==undefined&&value.seed!==null&&value.seed!=='')fail(400,'This Kling 4.0 endpoint has no manual seed.');
  if(value.referenceAudio?.length)fail(400,'Use saved voice IDs for Kling 4.0. Audio file references are unavailable.');
  const opts=value.kling4||{},shots=opts.shots||[],voiceIds=opts.voiceIds||[],elements=opts.elements||[];
  if(!Array.isArray(shots)||shots.length>30||mode==='transform'&&shots.length)fail(400,'Invalid Kling shot sequence.');
  const multiPrompt=shots.map(s=>{
    const seconds=Number(s.duration),text=String(s.prompt||'').trim();
    if(!Number.isInteger(seconds)||seconds<1||seconds>30||!text||text.length>512)fail(400,'Each shot needs 1 to 30 seconds and up to 512 prompt characters.');
    return {duration:seconds,prompt:text};
  });
  if(multiPrompt.length&&multiPrompt.reduce((n,s)=>n+s.duration,0)!==duration)fail(400,'Shot durations must add up to the selected output duration.');
  if(!prompt&&!multiPrompt.length&&mode!=='start')fail(400,'Add a prompt or shot sequence.');
  if(!Array.isArray(voiceIds)||voiceIds.length>3||voiceIds.some(id=>typeof id!=='string'||!/^[\w-]{1,200}$/.test(id)))fail(400,'Use up to three valid Kling voice IDs.');
  if(!Array.isArray(elements)||elements.length>7)fail(400,'Kling supports up to seven Elements.');
  const cleanElements=elements.map(e=>{
    if(!['image','video'].includes(e.kind))fail(400,'Choose an image or video Element.');
    if(e.voiceId&&!/^[\w-]{1,200}$/.test(e.voiceId))fail(400,'Invalid Element voice ID.');
    return {kind:e.kind,name:String(e.name||'').slice(0,100),voiceId:e.voiceId||null};
  });
  if(cleanElements.filter(e=>e.kind==='video').length>3||voiceIds.length+cleanElements.filter(e=>e.voiceId).length>3)fail(400,'Use up to three video Elements and three voices in total.');
  if(!['reference','transform'].includes(mode)&&(elements.length||voiceIds.length||value.referenceVideos?.length))fail(400,'Elements, voices and video references require Reference set or Edit video.');
  return {type:'video',provider:'fal',engine:'kling4',model:KLING4_FAL[mode],mode,prompt,duration,resolution,aspectRatio,seed:null,audio:true,referenceRoles:['reference','transform'].includes(mode)?referenceLabels(value.referenceRoles,10):[],referenceVideos:[],referenceAudio:[],kling4:{shots:multiPrompt,voiceIds:[...voiceIds],elements:cleanElements}};
}
export function kling4EstimateMicros(p){
  const seconds=p.kling4VideoSeconds||0;
  const rate=seconds?(p.resolution==='1080p'?0.141:0.094):(p.resolution==='1080p'?0.235:0.157);
  const billedSeconds=seconds?Math.max(seconds+p.duration,2*p.duration):p.duration;
  return Math.ceil(rate*billedSeconds*1000000);
}
export async function prepareKling4(env,owner,data,p,url,{fail,source,signedInput,readImage,readVideo}){
  const media=data.kling4Media||{},middle=media.middleSourceIds||[],elementMedia=media.elements||[];
  const startId=p.mode==='start'?data.sourceId:media.startSourceId,lastId=p.mode==='start'?data.lastSourceId:media.endSourceId;
  const ids=data.referenceSourceIds||[],videoIds=data.referenceVideoIds||[];
  for(const [list,max] of [[ids,10],[videoIds,p.mode==='transform'?5:5],[middle,8],[elementMedia,7]])
    if(!Array.isArray(list)||list.length>max)fail(400,'Too many Kling references or keyframes.');
  if(elementMedia.length!==p.kling4.elements.length||data.referenceAudioIds?.length)fail(400,'Kling Element media does not match the selected settings.');
  if(new Set(ids).size!==ids.length||new Set(videoIds).size!==videoIds.length)fail(400,'Remove duplicate references.');
  if(p.mode==='text'&&(data.sourceId||data.lastSourceId||ids.length||videoIds.length||middle.length||startId||lastId))fail(400,'Text mode does not accept source media.');
  if(p.mode==='start'&&(ids.length||videoIds.length||elementMedia.length))fail(400,'Use Reference set to combine frames with other media.');
  if(ids.length+middle.length+(lastId?1:0)+(startId?1:0)>10)fail(400,'Use up to ten images including start, middle and end frames.');
  const input={duration:p.duration,resolution:p.resolution};
  if(p.prompt)input.prompt=p.prompt;
  if(p.kling4.shots.length)input.multi_prompt=p.kling4.shots;
  if(p.mode!=='start')input.aspect_ratio=p.aspectRatio;
  if(p.referenceRoles.length&&p.referenceRoles.length!==ids.length)fail(400,'Reference notes must match the selected image order.');
  const imageAssets=[],videoAssets=[],videoMetadata=new Map();
  const loadImage=async id=>{
    const a=await source(env,owner,id);
    if(!['image/png','image/jpeg','image/webp'].includes(a.mime)||a.bytes>30*1048576)fail(400,'Kling images must be JPG, PNG or WebP up to 30 MiB.');
    const d=await readImage(a);
    if(d.width<300||d.height<300||d.width/d.height<0.4||d.width/d.height>2.5)fail(400,'Kling images need sides of at least 300 pixels and an aspect ratio between 0.4 and 2.5.');
    imageAssets.push(a);return url?await signedInput(env,url,a.id,86400):a.id;
  };
  let videoSeconds=0;
  const loadVideo=async(id,element=false)=>{
    const a=await source(env,owner,id);
    if(!['video/mp4','video/quicktime'].includes(a.mime)||a.bytes>20*1048576)fail(400,'Use a standard MP4 video up to 20 MiB.');
    const m=await readVideo(a);
    if(m.duration<3||m.duration>(element?8.05:30.05)||Math.min(m.width,m.height)<700||Math.max(m.width,m.height)>4553||m.width/m.height<0.4||m.width/m.height>2.5||m.fps<23.9||m.fps>60.05)fail(400,'Kling videos need at least 700 pixels per side, 24–60 fps and 3–30 seconds (3–8 for Elements).');
    videoSeconds+=m.duration;videoAssets.push(a);videoMetadata.set(a.id,m);return url?await signedInput(env,url,a.id,86400):a.id;
  };
  if(startId)input.start_image_url=await loadImage(startId);
  if(p.mode==='start'&&!startId)fail(400,'Choose an opening frame.');
  if(lastId)input.end_image_url=await loadImage(lastId);
  if(middle.length)input.middle_image_urls=await Promise.all(middle.map(loadImage));
  if(ids.length)input.image_urls=await Promise.all(ids.map(loadImage));
  if(p.mode==='transform'){
    if(!videoIds.length||data.sourceId!==videoIds[0])fail(400,'Add the source video to edit.');
    input.video_url=await loadVideo(videoIds[0]);
    if(videoIds.length>1)input.video_urls=await Promise.all(videoIds.slice(1).map(id=>loadVideo(id)));
  }else if(videoIds.length)input.video_urls=await Promise.all(videoIds.map(id=>loadVideo(id)));
  const elements=[];
  for(let i=0;i<elementMedia.length;i++){
    const refs=elementMedia[i],setting=p.kling4.elements[i],e={};
    if(!refs||typeof refs!=='object')fail(400,'Invalid Element media.');
    if(setting.kind==='video'){
      if(refs.imageSourceIds?.length)fail(400,'An Element uses either images or a video.');
      e.video_url=await loadVideo(refs.videoSourceId,true);
    }else{
      const views=refs.imageSourceIds;
      if(refs.videoSourceId||!Array.isArray(views)||views.length<1||views.length>4)fail(400,'An image Element needs a front view and up to three additional views.');
      e.frontal_image_url=await loadImage(views[0]);
      if(views.length>1)e.reference_image_urls=await Promise.all(views.slice(1).map(loadImage));
    }
    if(setting.voiceId)e.voice_id=setting.voiceId;
    elements.push(e);
  }
  if(ids.length+middle.length+(startId?1:0)+(lastId?1:0)+videoIds.length+elements.length>15||videoAssets.length>5||videoSeconds>30.05)fail(400,'Kling allows fifteen combined references and thirty seconds of input video.');
  if(p.mode==='reference'&&!imageAssets.length&&!videoAssets.length&&!elements.length)fail(400,'Add a reference image, video or Element.');
  if(elements.length)input.elements=elements;
  const notes=p.referenceRoles.map((r,i)=>'@Image'+(i+1)+(r.name?' ('+r.name+')':'')+(r.role&&r.role!=='none'?': '+r.role:'')+(r.note?' '+r.note:''));
  if(notes.length){input.prompt=[p.prompt,...notes].join('\n');if(input.prompt.length>26000)fail(400,'Prompt and reference notes exceed the Kling limit.');}
  if(p.kling4.voiceIds.length)input.voice_ids=p.kling4.voiceIds;
  p.referenceSourceIds=[...ids];p.lastSourceId=data.lastSourceId||null;p.referenceVideoIds=[...videoIds];p.referenceAudioIds=[];
  p.referenceVideos=videoIds.map((id,i)=>({name:videoAssets.find(a=>a.id===id).filename||'Video',seconds:videoMetadata.get(id).duration,note:String(data.settings?.referenceVideos?.[i]?.note||'').slice(0,300)}));
  p.kling4Media={startSourceId:media.startSourceId||null,endSourceId:media.endSourceId||null,middleSourceIds:[...middle],elements:elementMedia.map(e=>({imageSourceIds:e.imageSourceIds||[],videoSourceId:e.videoSourceId||null}))};p.kling4VideoSeconds=videoSeconds;
  return {primary:p.mode==='transform'?videoAssets[0]:imageAssets[0]||videoAssets[0]||null,input};
}
