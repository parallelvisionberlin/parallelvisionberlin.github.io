// PV Director owner-only opt-in photographic art-direction preview.
// Analysis runs only when the user clicks Direct. Never auto-generates or charges image credits.
export async function directorImageDataUrl(file,{maxEdge=800,maxBytes=150000}={}){
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))
    throw Error('Director needs a JPG, PNG or WebP photograph.');
  if(file.size>20*1024*1024||!file.size)throw Error('The source image must be under 20 MB.');
  let bitmap,url;
  try{
    if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
    else{
      url=URL.createObjectURL(file);const img=new Image();
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Could not read this photo.'));img.src=url;});
      bitmap=img;
    }
    const width=bitmap.width||bitmap.naturalWidth,height=bitmap.height||bitmap.naturalHeight;
    if(!width||!height||width*height>140000000)throw Error('Director cannot analyze an excessively large image.');
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)throw Error('Image preview processing is unavailable.');
    let ratio=Math.min(1,maxEdge/Math.max(width,height)),blob=null;
    try{
      for(let attempt=0;attempt<4;attempt++){
        canvas.width=Math.max(1,Math.round(width*ratio));
        canvas.height=Math.max(1,Math.round(height*ratio));
        ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
        for(const q of [.82,.7,.56,.44]){
          blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',q));
          if(blob&&blob.size<=maxBytes)break;
        }
        if(blob&&blob.size<=maxBytes)break;
        ratio*=.75;
      }
    }finally{canvas.width=0;canvas.height=0;}
    if(!blob||blob.size>maxBytes)throw Error('Director could not prepare a small preview.');
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(Error('Unable to read the temporary image preview.'));
      reader.onload=()=>resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }finally{bitmap?.close?.();if(url)URL.revokeObjectURL(url);}
}
export function createPvDirector({button,panel,api,getState,apply,notify}){
  const close=panel.querySelector('#composer-director-close');
  const status=panel.querySelector('#composer-director-message');
  const observations=panel.querySelector('#composer-director-observations');
  const draftText={
    faithful:panel.querySelector('#composer-director-faithful'),
    editorial:panel.querySelector('#composer-director-editorial')
  };
  let busy=false,result=null,snapshot=null,revision=0;
  const isEligible=state=>!!(state?.owner&&state?.enabled&&state?.file&&state?.imageMode==='base'&&!state?.mood&&state?.engine);
  const current=()=>{
    const state=getState();
    return isEligible(state)&&snapshot&&snapshot.file===state.file&&snapshot.epoch===state.epoch&&
      snapshot.prompt===state.prompt&&snapshot.engine===state.engine&&snapshot.imageMode===state.imageMode;
  };
  function dismiss(){
    revision++;busy=false;result=null;snapshot=null;panel.hidden=true;status.textContent='';
    button.disabled=false;button.textContent='✧ Direct';
  }
  function sync(){
    const state=getState();
    const visible=isEligible(state);
    button.hidden=!visible;
    button.disabled=!visible||busy||!!state?.busy;
    if(!visible||(!busy&&result&&!current()))dismiss();
  }
  async function analyze(){
    const state=getState();
    if(!isEligible(state)||busy)return;
    snapshot={file:state.file,epoch:state.epoch,prompt:state.prompt,engine:state.engine,imageMode:state.imageMode};
    const request=++revision;busy=true;result=null;panel.hidden=false;observations.textContent='';
    status.textContent='Studying the photograph. No image generation has started.';
    for(const node of Object.values(draftText))node.textContent='';
    button.textContent='Directing…';button.disabled=true;
    try{
      const imageDataUrl=await directorImageDataUrl(state.file);
      if(request!==revision||!current())return;
      const data=await api('/api/pv-director/analyze',{
        method:'POST',body:{imageDataUrl,writtenDirection:state.prompt.slice(0,1200),referenceMode:state.imageMode}
      });
      if(request!==revision||!current())return;
      if(!data||typeof data.faithful!=='string'||typeof data.editorial!=='string')
        throw Error('Director returned an incomplete direction.');
      result=data;
      observations.textContent=data.observations||'Two directions are ready.';
      draftText.faithful.textContent=data.faithful;
      draftText.editorial.textContent=data.editorial;
      status.textContent='Choose one direction. You can edit it before Generate.';
    }catch(error){
      if(request===revision){
        status.textContent=(error?.message||'Director analysis was unavailable.')+' Your current prompt remains unchanged.';
        notify?.(status.textContent,true);
      }
    }finally{
      if(request===revision){busy=false;button.disabled=false;button.textContent='✧ Direct';}
    }
  }
  button.addEventListener('click',()=>void analyze());
  close.addEventListener('click',dismiss);
  panel.querySelectorAll('[data-director-apply]').forEach(button=>{
    button.addEventListener('click',()=>{
      const variant=button.dataset.directorApply;
      if(!result||!current()||typeof result[variant]!=='string')return;
      apply(result[variant],variant);
      dismiss();
      notify?.('PV Director direction applied. Review or edit it, then press Generate.');
    });
  });
  sync();
  return {sync,dismiss};
}
