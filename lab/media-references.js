// Local reference-media preparation. No generation calls and no public media uploads.
export function createMediaReferences({element,owner,busy,epoch,action,changed,upload,assetFile}) {
  const groups={video:[],audio:[]};
  const limits={video:20*1048576,audio:15*1048576};
  const types={video:['video/mp4','video/quicktime'],audio:['audio/mpeg','audio/wav','audio/x-wav']};
  const release=item=>{if(item.url)URL.revokeObjectURL(item.url);};
  function render(kind){
    const box=element(kind+'-reference-list');box.replaceChildren();
    groups[kind].forEach((item,i)=>{
      const row=document.createElement('div');row.className='reference-media-item';
      const media=document.createElement(kind);media.controls=true;media.preload='metadata';media.src=item.url;if(kind==='video')media.playsInline=true;
      const label=document.createElement('strong');label.textContent='@'+(kind==='video'?'Video':'Audio')+(i+1)+' / '+item.file.name+' / '+item.seconds.toFixed(2)+'s';
      const note=document.createElement('input');note.type='text';note.maxLength=300;note.placeholder=kind==='video'?'Motion, camera or pacing guidance':'Music, atmosphere or voice guidance';note.value=item.note;note.setAttribute('aria-label','Note for '+kind+' reference '+(i+1));note.oninput=()=>{item.note=note.value;changed();};
      const controls=document.createElement('div');controls.className='reference-actions';
      for(const [text,fn] of [['Up',()=>{if(i){[groups[kind][i-1],groups[kind][i]]=[item,groups[kind][i-1]];}}],['Remove',()=>{release(item);groups[kind].splice(i,1);}]] ){
        const b=document.createElement('button');b.type='button';b.textContent=text;b.disabled=text==='Up'&&i===0;b.onclick=()=>{if(busy())return;fn();render(kind);changed();};controls.append(b);
      }
      row.append(label,media,note,controls);box.append(row);
    });
    element(kind+'-ref-count').textContent=groups[kind].length+' / 10 · '+groups[kind].reduce((n,r)=>n+r.seconds,0).toFixed(1)+' / 30s';
  }
  async function inspect(file,kind){
    if(!types[kind].includes(file.type)||!file.size||file.size>limits[kind])throw new Error(kind==='video'?'Use MP4 or MOV references up to 20 MiB each.':'Use MP3 or WAV references up to 15 MiB each.');
    const url=URL.createObjectURL(file),media=document.createElement(kind);media.preload='metadata';
    try{
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cleanup();reject(new Error('Reference metadata could not load. Use a browser-compatible file.'));},15000);const cleanup=()=>{clearTimeout(timer);media.onloadedmetadata=null;media.onerror=null;};media.onloadedmetadata=()=>{cleanup();resolve();};media.onerror=()=>{cleanup();reject(new Error('Cannot read this reference. For video, use MP4 with H.264 encoding.'));};media.src=url;});
      const seconds=media.duration;
      if(!Number.isFinite(seconds)||seconds<2||seconds>30)throw new Error('Each reference must be between 2 and 30 seconds.');
      if(kind==='video'&&(Math.min(media.videoWidth,media.videoHeight)<300||Math.max(media.videoWidth,media.videoHeight)>6000))throw new Error('Video references must be between 300 and 6,000 pixels per side.');
      return {file,id:null,url,seconds,note:''};
    }catch(e){URL.revokeObjectURL(url);throw e;}finally{media.removeAttribute('src');media.load();}
  }
  async function add(files,kind,ids=[],labels=[]){
    const start=epoch(),list=[...files];
    if(groups[kind].length+list.length>10)throw new Error('Use at most ten '+kind+' references.');
    for(let i=0;i<list.length;i++){
      const item=await inspect(list[i],kind);
      if(!owner()||start!==epoch()){release(item);throw new Error('Session changed.');}
      if(groups[kind].reduce((n,r)=>n+r.seconds,0)+item.seconds>30.05){release(item);throw new Error('Combined '+kind+' references must not exceed 30 seconds.');}
      item.id=ids[i]||null;item.note=labels[i]?.note||'';groups[kind].push(item);render(kind);changed();
    }
  }
  for(const kind of ['video','audio']){
    element(kind+'-references').onchange=e=>action(async()=>{try{await add(e.target.files,kind);}finally{e.target.value='';}});
  }
  return {
    firstVideo:()=>groups.video[0]||null,
    count:()=>groups.video.length+groups.audio.length,
    labels:kind=>groups[kind].map(r=>({name:r.file.name,seconds:r.seconds,note:r.note})),
    clear(){for(const kind of ['video','audio']){groups[kind].forEach(release);groups[kind]=[];element(kind+'-references').value='';render(kind);}},
    async inputs(){const result={};for(const [kind,key] of [['video','referenceVideoIds'],['audio','referenceAudioIds']]){for(const item of groups[kind])if(!item.id)item.id=await upload(item.file);result[key]=groups[kind].map(r=>r.id);}return result;},
    async restore(settings){for(const [kind,key,label] of [['video','referenceVideoIds','referenceVideos'],['audio','referenceAudioIds','referenceAudio']]){const ids=settings[key]||[];for(let i=0;i<ids.length;i++){const file=await assetFile(ids[i],(settings[label]?.[i]?.name||kind+'-'+(i+1)).replace(/\.[^.]+$/,''));await add([file],kind,[ids[i]],[settings[label]?.[i]||{}]);}}}
  };
}
