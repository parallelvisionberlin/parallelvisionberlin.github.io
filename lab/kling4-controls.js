// Additional Kling settings use the existing Video details, fields and upload styling.
export function createKling4Controls({element:$,active,busy,action,changed,upload,assetFile}){
  const panel=document.createElement('details');panel.id='kling4-settings';panel.className='model-details';panel.hidden=true;
  const summary=document.createElement('summary');summary.textContent='Kling settings';panel.append(summary);
  const body=document.createElement('div');panel.append(body);
  $('pv-video-prompt-head').before(panel);
  let frames=[],elements=[],shots=[],startFrame=null,endFrame=null,currentMode='start',revision=0;
  const voiceInput=document.createElement('input');voiceInput.type='text';voiceInput.placeholder='Optional saved voice IDs, separated by commas';voiceInput.setAttribute('aria-label','Saved Kling voice IDs');
  voiceInput.oninput=changed;
  function button(text,fn){const b=document.createElement('button');b.type='button';b.className='quiet';b.textContent=text;b.onclick=()=>{if(!busy())action(fn);};return b;}
  function field(label,node){const wrap=document.createElement('label');const title=document.createElement('span');title.className='label';title.textContent=label;wrap.append(title,node);return wrap;}
  function files(label,accept,multiple,onFiles){
    const wrap=document.createElement('div');wrap.className='kling4-upload';
    const trigger=document.createElement('button');trigger.type='button';trigger.className='drop compact-drop';trigger.textContent=label;
    const input=document.createElement('input');input.type='file';input.accept=accept;input.multiple=multiple;input.hidden=true;input.setAttribute('aria-label',label);
    trigger.onclick=()=>{if(!busy())input.click();};
    input.onchange=()=>{if(!busy())action(async()=>{try{await onFiles([...input.files]);render();changed();}finally{input.value='';}});};
    wrap.append(trigger,input);return wrap;
  }
  const frameSection=document.createElement('section'),elementSection=document.createElement('section'),shotSection=document.createElement('section');
  const frameList=document.createElement('div'),elementList=document.createElement('div'),shotList=document.createElement('div');
  const framesUpload=files('Add intermediate frames · up to 8','image/jpeg,image/png,image/webp',true,async list=>{
    if(frames.length+list.length>8)throw Error('Use up to eight intermediate frames.');
    frames.push(...list.map(file=>({file,id:null})));
  });
  const heading=(text)=>{const p=document.createElement('p');p.className='label';p.textContent=text;return p;};
  const boundarySection=document.createElement('section');
  const boundaryNames=document.createElement('small');
  boundarySection.append(heading('Optional boundary frames'),files('Choose opening frame','image/jpeg,image/png,image/webp',false,async list=>{startFrame=list[0]?{file:list[0],id:null}:null;}),files('Choose closing frame','image/jpeg,image/png,image/webp',false,async list=>{endFrame=list[0]?{file:list[0],id:null}:null;}),boundaryNames,button('Clear boundary frames',async()=>{startFrame=null;endFrame=null;render();changed();}));
  frameSection.append(heading('Intermediate frames'),framesUpload,frameList);
  elementSection.append(heading('Elements'),elementList,button('Add Element',async()=>{
    if(elements.length>=7)throw Error('Use up to seven Elements.');
    elements.push({name:'',kind:'image',voiceId:'',files:[]});render();changed();
  }));
  shotSection.append(heading('Shot sequence'),shotList,button('Add shot',async()=>{if(shots.length>=30)throw Error('Use up to thirty shots.');shots.push({prompt:'',duration:3});render();changed();}));
  const help=document.createElement('p');help.className='fine';help.setAttribute('role','note');
  body.append(boundarySection,frameSection,elementSection,field('Voices',voiceInput),shotSection,help);
  function render(){
    boundaryNames.textContent=[startFrame?.file.name,endFrame?.file.name].filter(Boolean).join(' / ');
    frameList.replaceChildren(...frames.map((f,i)=>{
      const row=document.createElement('div');row.className='reference-actions';
      const text=document.createElement('span');text.textContent=(i+1)+'. '+f.file.name;
      row.append(text,button('Remove',async()=>{frames.splice(i,1);render();changed();}));return row;
    }));
    elementList.replaceChildren(...elements.map((e,i)=>{
      const box=document.createElement('div');box.className='reference-fields';
      const name=document.createElement('input');name.placeholder='Element '+(i+1)+' name';name.setAttribute('aria-label',name.placeholder);name.value=e.name;name.oninput=()=>{e.name=name.value;changed();};
      const kind=document.createElement('select');kind.append(new Option('Photos · front + up to 3 views','image'),new Option('Video · 3–8 seconds','video'));kind.value=e.kind;
      kind.setAttribute('aria-label','Element '+(i+1)+' reference type');kind.onchange=()=>{e.kind=kind.value;e.files=[];render();changed();};
      const voice=document.createElement('input');voice.placeholder='Optional saved voice ID';voice.setAttribute('aria-label','Element '+(i+1)+' voice ID');voice.value=e.voiceId;voice.oninput=()=>{e.voiceId=voice.value.trim();changed();};
      const uploadControl=files(e.kind==='video'?'Choose Element video':'Choose front photo, then other views',e.kind==='video'?'video/mp4':'image/jpeg,image/png,image/webp',e.kind==='image',async list=>{
        if(list.length>(e.kind==='image'?4:1))throw Error('Use one front photo plus up to three views, or one video.');
        e.files=list.map(file=>({file,id:null}));
      });
      const names=document.createElement('small');names.textContent=e.files.map(f=>f.file.name).join(', ');
      box.append(heading('@Element'+(i+1)),name,kind,uploadControl,names,voice,button('Remove Element '+(i+1),async()=>{elements.splice(i,1);render();changed();}));return box;
    }));
    shotList.replaceChildren(...shots.map((shot,i)=>{
      const box=document.createElement('div');box.className='reference-fields';
      const prompt=document.createElement('textarea');prompt.rows=2;prompt.maxLength=512;prompt.placeholder='Shot '+(i+1)+' direction';prompt.setAttribute('aria-label',prompt.placeholder);prompt.value=shot.prompt;
      prompt.oninput=()=>{shot.prompt=prompt.value;changed();};
      const duration=document.createElement('input');duration.type='number';duration.min='1';duration.max='30';duration.value=shot.duration;duration.setAttribute('aria-label','Shot '+(i+1)+' duration in seconds');
      duration.oninput=()=>{shot.duration=Number(duration.value);changed();};
      box.append(field('Shot '+(i+1),prompt),field('Duration · seconds',duration),button('Remove shot '+(i+1),async()=>{shots.splice(i,1);render();changed();}));return box;
    }));
  }
  const settings=()=>({shots:currentMode==='transform'?[]:shots.map(s=>({...s})),voiceIds:['reference','transform'].includes(currentMode)?voiceInput.value.split(',').map(s=>s.trim()).filter(Boolean):[],elements:['reference','transform'].includes(currentMode)?elements.map(({name,kind,voiceId})=>({name,kind,voiceId})):[]});
  async function ensure(item){if(!item.id){const selectedRevision=revision;const id=await upload(item.file);if(selectedRevision!==revision||!active())throw Error('Studio or references changed during upload. Nothing submitted.');item.id=id;}return item.id;}
  return {
    settings,
    sync(mode){
      if(mode!==currentMode){currentMode=mode;revision++;}
      panel.hidden=!active();
      frameSection.hidden=mode==='text';
      boundarySection.hidden=!['reference','transform'].includes(mode);
      elementSection.hidden=!['reference','transform'].includes(mode);
      voiceInput.parentElement.hidden=!['reference','transform'].includes(mode);
      shotSection.hidden=mode==='transform';
      help.textContent=(['reference','transform'].includes(mode)?'Use @Image1, @Video1 and @Element1 in your prompt. Up to 15 combined references. ':'')+(mode!=='transform'?'Optional shots must total the selected duration. ':'')+'Native audio included.';
    },
    identity:()=>[startFrame?.file.name,endFrame?.file.name,frames.map(f=>f.file.name+':'+f.file.size),elements.map(e=>e.files.map(f=>f.file.name+':'+f.file.size))],
    hasElements:()=>elements.some(e=>e.files.length),
    async inputs(mode){
      const referenceMode=['reference','transform'].includes(mode);
      return {startSourceId:referenceMode&&startFrame?await ensure(startFrame):null,endSourceId:referenceMode&&endFrame?await ensure(endFrame):null,middleSourceIds:mode==='text'?[]:await Promise.all(frames.map(ensure)),elements:await Promise.all((referenceMode?elements:[]).map(async e=>{
        if(!e.files.length)throw Error('Choose media for every Element.');
        const ids=await Promise.all(e.files.map(ensure));
        return e.kind==='video'?{videoSourceId:ids[0]}:{imageSourceIds:ids};
      }))};
    },
    clear(){revision++;frames=[];elements=[];shots=[];startFrame=null;endFrame=null;voiceInput.value='';panel.open=false;render();},
    async restore(p){
      this.clear();const saved=p.kling4Media||{};
      if(saved.startSourceId)startFrame={id:saved.startSourceId,file:await assetFile(saved.startSourceId,'opening-frame')};
      if(saved.endSourceId)endFrame={id:saved.endSourceId,file:await assetFile(saved.endSourceId,'closing-frame')};
      frames=await Promise.all((saved.middleSourceIds||[]).map(async id=>({id,file:await assetFile(id,'keyframe')})));
      for(let i=0;i<(p.kling4?.elements||[]).length;i++){
        const meta=p.kling4.elements[i],media=saved.elements?.[i]||{},ids=meta.kind==='video'?[media.videoSourceId]:media.imageSourceIds||[];
        elements.push({...meta,files:await Promise.all(ids.filter(Boolean).map(async id=>({id,file:await assetFile(id,meta.name||'Element')})))});
      }
      shots=(p.kling4?.shots||[]).map(s=>({...s}));voiceInput.value=(p.kling4?.voiceIds||[]).join(', ');render();
    }
  };
}
