/* PV LAB / One Upscaler workspace, two media modes.
   Video shares the Image editor's real control and preview columns. The
   existing image controls stay mounted, preserving their inputs and results.
   One server quote, one explicit payment confirmation, no automatic retries. */
export function createVideoUpscaler({api,access,onJob,onModeChange}){
 const $=id=>document.getElementById(id),app=$('app'),bar=$('pv-video-upscale-mode'),panel=$('pv-video-upscale-panel');
 if(!bar||!panel)throw Error('Video Upscaler markup missing.');
 const workspace=app.querySelector(':scope > .workspace');
 const controls=workspace?.querySelector(':scope > .controls'),stageShell=workspace?.querySelector(':scope > .stage');
 const sidebar=panel.querySelector('.pv-video-upscale-sidebar');
 const controlBody=controls?.querySelector(':scope > .controls-body');
 const canvas=stageShell?.querySelector('#upscale-canvas');
 const picker=document.getElementById('upscale-model-menu');
 const originalEmpty=document.getElementById('empty');
 const imagePreview=document.getElementById('preview');
 const originalHero=document.getElementById('pv-upscale-hero-upload');
 const sharedGenerate=document.getElementById('generate');
 const sharedClear=document.getElementById('clear');
 if(!controls||!stageShell||!sidebar||!controlBody||!canvas||!picker||!originalEmpty||!originalHero||!sharedGenerate||!sharedClear)
   throw Error('Shared Upscaler editor is unavailable.');
 // There is ONE source stage and ONE model picker. Video inserts only the
 // controls that actually differ. Image nodes remain mounted and untouched.
 workspace.prepend(bar);
 const videoCards=[...sidebar.querySelectorAll('[data-video-upscale-model]')];
 for(const card of videoCards)picker.append(card);
 const resolutionField=sidebar.querySelector('.pv-video-upscale-resolution')||sidebar.querySelector('label.pv-video-upscale-field');
 const quoteField=sidebar.querySelector('.pv-video-upscale-quote');
 const messageField=sidebar.querySelector('#pv-video-upscale-message');
 if(!resolutionField||!quoteField||!messageField)throw Error('Video Upscaler options are unavailable.');
 resolutionField.classList.add('pv-video-upscale-inline-resolution');
 controlBody.querySelector('.parameter-grid')?.after(resolutionField);
 resolutionField.after(quoteField,messageField);
 const preview=panel.querySelector('.pv-video-upscale-preview');
 for(const id of ['pv-video-upscale-source','pv-video-upscale-result','pv-video-upscale-working'])
   canvas.append(document.getElementById(id));
 const stageHead=stageShell.querySelector('.stagehead');
 for(const id of ['pv-video-upscale-original-button','pv-video-upscale-result-button','pv-video-upscale-download'])
   stageHead.append(document.getElementById(id));
 const filePicker=panel.querySelector('#pv-video-upscale-file');
 if(!filePicker)throw Error('Video source picker unavailable.');
 stageShell.append(filePicker);
 panel.hidden=true;
 const heroTitle=originalEmpty.querySelector('.pv-upscale-empty-center h2');
 const heroDescription=originalEmpty.querySelector('.pv-upscale-empty-center p');
 const heroButtonText=originalHero.querySelector('span');
 const heroHint=originalEmpty.querySelector('.pv-upscale-drop-hint');
 const sourceControl=document.querySelector('.pv-upscale-source-control');
 const sourceControlTitle=document.getElementById('pv-upscale-source-upload-title');
 const sourceControlFilename=document.getElementById('pv-upscale-source-filename');
 const sourceControlLabel=sourceControl?.querySelector('.pv-upscale-field-label');
 const originalCopy={title:heroTitle?.textContent,description:heroDescription?.textContent,
   button:heroButtonText?.textContent,hint:heroHint?.textContent,
   sourceTitle:sourceControlTitle?.textContent,sourceFilename:sourceControlFilename?.textContent,
   sourceLabel:sourceControlLabel?.textContent};
 let imageEmptyHidden=originalEmpty.hidden;
 const pick=$('pv-video-upscale-file'),src=$('pv-video-upscale-source'),result=$('pv-video-upscale-result');
 const stage=canvas,blank=originalEmpty,price=$('pv-video-upscale-price');
 const action=$('pv-video-upscale-action'),message=$('pv-video-upscale-message'),res=$('pv-video-upscale-resolution');
 const clear=sharedClear,download=$('pv-video-upscale-download');
 const variants={bytedance:{name:'ByteDance Standard',allowed:['1080p','2k','4k']},
   proteus:{name:'Topaz Proteus',allowed:['1080p','4k']},
   starlight:{name:'Topaz Starlight',allowed:['1080p','4k']}};
 let media='image',model='bytedance',file=null,assetId=null,sourceURL=null,resultURL=null,quote=null;
 let currentJob=null,loading=false,revision=0,showResult=false,submissionUncertain=false;
 let lastSyncedMode='image';
 const revoke=url=>{if(url)URL.revokeObjectURL(url);};
 const notice=(s,error=false)=>{message.textContent=s||'';message.classList.toggle('error',error);};
 const ready=()=>{const a=access();return !!a.signedIn&&!!a.falEnabled&&!!a.generationReady;};
 const stale=()=>{revision++;quote=null;};
 function sync(){
   const active=app.classList.contains('upscale-studio-active')&&!app.classList.contains('assets-active')&&!app.classList.contains('fashion-studio-active');
   bar.hidden=!active;panel.hidden=true;
   const videoMode=active&&media==='video';
   app.classList.toggle('video-upscale-active',videoMode);
   if(lastSyncedMode!==media){
     if(media==='video')imageEmptyHidden=originalEmpty.hidden;
     else originalEmpty.hidden=imageEmptyHidden;
     lastSyncedMode=media;
   }
   if(videoMode){
     heroTitle.textContent='Insert a source video.';
     heroDescription.textContent='Upload a video to begin the upscale process.';
     heroButtonText.textContent='Upload video';
     heroHint.textContent='MP4 · up to 30 seconds · 20 MB';
     originalHero.setAttribute('aria-label','Upload a source video for upscaling');
     if(sourceControlLabel)sourceControlLabel.textContent='Source video';
     if(sourceControlTitle)sourceControlTitle.textContent=file?'Replace video':'Choose video';
     if(sourceControlFilename)sourceControlFilename.textContent=file?file.name:'MP4 · up to 30 seconds · 20 MB';
     originalEmpty.hidden=!!file||!!resultURL;
   }else{
     heroTitle.textContent=originalCopy.title;
     heroDescription.textContent=originalCopy.description;
     heroButtonText.textContent=originalCopy.button;
     heroHint.textContent=originalCopy.hint;
     originalHero.setAttribute('aria-label','Upload an image to upscale');
     if(sourceControlLabel)sourceControlLabel.textContent=originalCopy.sourceLabel;
     // The Image sidebar controller owns its source filename and thumbnail.
   }
   for(const tab of bar.querySelectorAll('[data-video-upscale-tab]')){const yes=tab.dataset.videoUpscaleTab===media;tab.setAttribute('aria-selected',String(yes));tab.tabIndex=yes?0:-1;}
   for(const b of videoCards){b.setAttribute('aria-checked',String(b.dataset.videoUpscaleModel===model));b.disabled=loading;}
   for(const option of res.options)option.disabled=!variants[model].allowed.includes(option.value);
   res.disabled=loading;pick.disabled=loading;
   if(videoMode){clear.disabled=!file||loading;clear.textContent='Clear';}
   src.hidden=!videoMode||!file||showResult;result.hidden=!videoMode||!showResult||!resultURL;
   $('pv-video-upscale-working').hidden=!videoMode||!currentJob||!['submitting','queued','running','saving'].includes(currentJob.status);
   $('pv-video-upscale-original-button').hidden=!videoMode||!resultURL;
   $('pv-video-upscale-result-button').hidden=!videoMode||!resultURL;
   download.hidden=!videoMode||!resultURL;
   $('pv-video-upscale-info').textContent=file?file.name+' · '+(file.size/1048576).toFixed(1)+' MB':'Original media is preserved.';
   if(quote&&quote.expiresAt<=Date.now()){stale();notice('The estimate expired. Review credits again.',true);}
   if(!file){price.textContent='Select a video to calculate credits.';action.textContent='Upscale';action.disabled=true;}
   else if(!ready()){price.textContent='Generation unavailable.';action.textContent='Provider unavailable';action.disabled=true;}
   else if(loading){action.textContent='Processing…';action.disabled=true;}
   else if(submissionUncertain){price.textContent='The last submission is unconfirmed. Check History before starting another paid job.';action.textContent='Review submission in History';action.disabled=true;}
   else if(currentJob&&['submitting','queued','running','saving','uncertain'].includes(currentJob.status)){price.textContent='See this request in private History.';action.textContent='Processing in History';action.disabled=true;}
   else if(quote){price.textContent='Estimated price: '+quote.creditCost+' credits · '+quote.settings.duration.toFixed(1)+'s. Provider billing may differ.';action.textContent='Confirm & upscale · '+quote.creditCost+' credits';action.disabled=false;}
   else{price.textContent='Review credits before the paid request.';action.textContent='Review credits';action.disabled=false;}
   if(videoMode){
     sharedGenerate.textContent=action.textContent;
     sharedGenerate.disabled=action.disabled;
     if(sourceControlTitle)sourceControlTitle.textContent=file?'Replace video':'Choose video';
     if(sourceControlFilename)sourceControlFilename.textContent=file?file.name:'MP4 · up to 30 seconds · 20 MB';
   }
 }
 function changeTab(name){if(!['image','video'].includes(name)||media===name||loading)return;media=name;sync();onModeChange?.();}
 for(const tab of bar.querySelectorAll('[data-video-upscale-tab]'))tab.addEventListener('click',()=>changeTab(tab.dataset.videoUpscaleTab));
 function resetSource(){
   stale();revoke(sourceURL);revoke(resultURL);sourceURL=null;resultURL=null;file=null;assetId=null;currentJob=null;showResult=false;submissionUncertain=false;
   for(const video of [src,result]){video.pause();video.removeAttribute('src');video.load();}
 }
 function chooseFile(candidate,id=null){
   if(!candidate||candidate.size<128||candidate.size>20*1024*1024||candidate.type!=='video/mp4'&&!/\.mp4$/i.test(candidate.name))
     throw Error('Choose a standard MP4 no larger than 20 MB.');
   resetSource();file=candidate;assetId=id;sourceURL=URL.createObjectURL(candidate);src.src=sourceURL;media='video';
   src.onloadedmetadata=()=>{if(file!==candidate)return;if(src.duration>30||src.duration<0.5)notice('Use a video between 0.5 and 30 seconds.',true);sync();};
   sync();
 }
 const choose=()=>{if(!loading)pick.click();};
 $('pv-video-upscale-choose').onclick=choose;
 pick.onchange=()=>{const f=pick.files?.[0];pick.value='';if(!f)return;try{chooseFile(f);onModeChange?.();}catch(e){notice(e.message,true);}};
 for(const b of videoCards)b.onclick=()=>{
   if(loading||model===b.dataset.videoUpscaleModel)return;
   model=b.dataset.videoUpscaleModel;if(!variants[model].allowed.includes(res.value))res.value='1080p';stale();notice('');sync();
 };
 res.onchange=()=>{stale();notice('');sync();};
 clear.addEventListener('click',event=>{
   if(media!=='video'||!app.classList.contains('upscale-studio-active'))return;
   event.preventDefault();event.stopImmediatePropagation();
   if(loading)return;resetSource();notice('');sync();
 },true);
 stage.addEventListener('dragover',e=>{
   if(media!=='video'||!app.classList.contains('upscale-studio-active'))return;
   e.preventDefault();e.stopImmediatePropagation();
   if(e.dataTransfer?.types?.includes('Files')&&!loading)stage.classList.add('dragging');
 },true);
 stage.addEventListener('dragleave',()=>stage.classList.remove('dragging'),true);
 stage.addEventListener('drop',e=>{
   if(media!=='video'||!app.classList.contains('upscale-studio-active'))return;
   e.preventDefault();e.stopImmediatePropagation();stage.classList.remove('dragging');
   if(loading||!e.dataTransfer?.files?.length)return;
   try{chooseFile(e.dataTransfer.files[0]);onModeChange?.();}catch(error){notice(error.message,true);}
 },true);
 // The existing Upscale button remains the only action in both modes.
 // Capture before the Image handler so a Video click can never submit an
 // Image quote using the wrong media type.
 sharedGenerate.addEventListener('click',event=>{
   if(media!=='video'||!app.classList.contains('upscale-studio-active'))return;
   event.preventDefault();event.stopImmediatePropagation();
   if(!action.disabled)void action.onclick();
 },true);
 const routePicker=event=>{
   if(media!=='video'||!app.classList.contains('upscale-studio-active'))return;
   event.preventDefault();event.stopImmediatePropagation();choose();
 };
 originalHero.addEventListener('click',routePicker,true);
 document.getElementById('pv-upscale-source-upload')?.addEventListener('click',routePicker,true);
 document.getElementById('pv-upscale-dropzone')?.addEventListener('click',event=>{
   if(media!=='video'||!app.classList.contains('upscale-studio-active'))return;
   if(event.target.closest('button'))return;
   routePicker(event);
 },true);
 action.onclick=async()=>{
   if(!file){choose();return;}if(loading||!ready())return;
   const token=revision,original=file;loading=true;sync();
   try{
     if(!quote){
       if(Number.isFinite(src.duration)&&(src.duration>30||src.duration<0.5))throw Error('Video must be between 0.5 and 30 seconds.');
       notice('Checking source and credit estimate…');
       if(!assetId){
         const uploaded=await api('/api/reference-uploads',{method:'POST',headers:{'Content-Type':'video/mp4','X-Filename':encodeURIComponent(original.name||'upscale-source.mp4')},body:original});
         if(token!==revision||file!==original)throw Error('Source changed during upload.');
         assetId=uploaded.id;
       }
       const q=await api('/api/quotes',{method:'POST',body:{sourceId:assetId,settings:{type:'video',engine:'video-upscale',mode:'upscale',videoUpscaleEngine:model,resolution:res.value}}});
       if(token!==revision||file!==original)throw Error('Source or settings changed during quote.');
       if(!q?.id||q.provider!=='fal.ai'||q.settings?.engine!=='video-upscale'||q.settings.videoUpscaleEngine!==model||
           q.settings.resolution!==res.value||!Number.isSafeInteger(q.creditCost)||q.creditCost<1||
           !Number.isFinite(q.expiresAt)||q.expiresAt<=Date.now()||q.priceIsEstimate!==true||q.requiresPriceReview!==true)
         throw Error('No valid bound upscaling price. No job submitted.');
       quote=q;notice('Credits checked. Confirm to start one paid enhancement.');
     }else{
       const approved=quote;quote=null;submissionUncertain=true;notice('Submitting the confirmed job…');
       const submitted=await api('/api/jobs',{method:'POST',body:{quoteId:approved.id,confirm:true}});
       if(!submitted?.job)throw Error('Submission acknowledgement missing. Check History before retrying.');
       submissionUncertain=false;currentJob=submitted.job;onJob?.(currentJob);
       notice(currentJob.status==='uncertain'?'Status uncertain. Check the provider in History before retrying.':'Enhancement queued in History.',currentJob.status==='uncertain');
     }
   }catch(error){if(token===revision){notice(submissionUncertain?'Submission response unconfirmed. Check History before starting another job. '+(error.message||''):error.message||'Upscaling could not be started.',true);if(/expired/i.test(error.message||''))quote=null;}}
   finally{loading=false;sync();}
 };
 function viewOriginal(){showResult=false;result.pause();sync();}
 function viewResult(){if(!resultURL)return;showResult=true;src.pause();sync();}
 $('pv-video-upscale-original-button').onclick=viewOriginal;
 $('pv-video-upscale-result-button').onclick=viewResult;
 download.onclick=()=>{if(!resultURL)return;const a=document.createElement('a');a.href=resultURL;a.download='pv-lab-upscaled-'+(currentJob?.id||'video')+'.mp4';document.body.append(a);a.click();a.remove();};
 async function openJob(job){
   if(job?.settings?.engine!=='video-upscale'||job.status!=='completed'||!job.outputId)throw Error('Choose a completed video upscale result.');
   // Keep Original/Result comparison bound to the SAME History source clip.
   if(job.sourceId&&assetId!==job.sourceId){
     const original=await api('/api/assets/'+job.sourceId,{blob:true});
     if(original.type==='video/mp4'&&original.size)
       chooseFile(new File([original],'source-'+job.sourceId+'.mp4',{type:'video/mp4'}),job.sourceId);
   }
   const token=++revision;media='video';currentJob=job;quote=null;sync();
   const blob=await api('/api/assets/'+job.outputId,{blob:true});
   if(token!==revision)return;
   if(blob.type!=='video/mp4'||!blob.size)throw Error('Saved result is not an MP4.');
   revoke(resultURL);resultURL=URL.createObjectURL(blob);result.src=resultURL;showResult=true;sync();
 }
 async function restore(job){
   if(job?.settings?.engine!=='video-upscale'||!job.sourceId)throw Error('No original video available for reuse.');
   const token=++revision;media='video';model=variants[job.settings.videoUpscaleEngine]?job.settings.videoUpscaleEngine:'bytedance';
   res.value=variants[model].allowed.includes(job.settings.resolution)?job.settings.resolution:'1080p';
   const blob=await api('/api/assets/'+job.sourceId,{blob:true});if(token!==revision)return;
   chooseFile(new File([blob],'source-'+job.sourceId+'.mp4',{type:'video/mp4'}),job.sourceId);onModeChange?.();
 }
 return {mode:()=>media,sync,openJob,restore,
   onJob(job){
     if(!job||job.id!==currentJob?.id)return;currentJob=job;
     if(job.status==='completed'&&job.outputId&&!resultURL&&media==='video')void openJob(job).catch(e=>notice('Saved in History. '+e.message,true));
     else if(job.status==='failed')notice(job.error||'Video upscaling failed. View History.',true);
     sync();
   },
   reset(){resetSource();media='image';sync();}
 };
}
