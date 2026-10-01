import { soulTrainingCopy } from './image-tools.js?v=20260930-soul-v05';

const ACTIVE = new Set(['submitting','queued','training','uncertain']);
const terminal = state => !ACTIVE.has(state);
const escapeText = value => String(value ?? '');

function crcTable(){
  const table=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}
  return table;
}
const CRC=crcTable();
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=CRC[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function header(size){
  const bytes=new Uint8Array(size),view=new DataView(bytes.buffer);
  return {bytes,view,u16:(o,v)=>view.setUint16(o,v,true),u32:(o,v)=>view.setUint32(o,v>>>0,true)};
}
function asciiName(index){return String(index+1).padStart(4,'0')+'.webp';}

async function zipStored(files,onProgress){
  const enc=new TextEncoder(),parts=[],central=[];let offset=0;
  for(let i=0;i<files.length;i++){
    onProgress?.('Packing '+(i+1)+' / '+files.length+'…');
    const data=new Uint8Array(await files[i].arrayBuffer()),name=enc.encode(asciiName(i)),crc=crc32(data);
    const h=header(30);
    h.u32(0,0x04034b50);h.u16(4,20);h.u16(6,0);h.u16(8,0);h.u16(10,0);h.u16(12,0);
    h.u32(14,crc);h.u32(18,data.length);h.u32(22,data.length);h.u16(26,name.length);h.u16(28,0);
    parts.push(h.bytes,name,data);
    const ch=header(46);
    ch.u32(0,0x02014b50);ch.u16(4,20);ch.u16(6,20);ch.u16(8,0);ch.u16(10,0);ch.u16(12,0);ch.u16(14,0);
    ch.u32(16,crc);ch.u32(20,data.length);ch.u32(24,data.length);ch.u16(28,name.length);ch.u16(30,0);ch.u16(32,0);
    ch.u16(34,0);ch.u16(36,0);ch.u32(38,0);ch.u32(42,offset);
    central.push(ch.bytes,name);
    offset+=30+name.length+data.length;
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  const centralOffset=offset,centralSize=central.reduce((n,p)=>n+p.byteLength,0),end=header(22);
  end.u32(0,0x06054b50);end.u16(4,0);end.u16(6,0);end.u16(8,files.length);end.u16(10,files.length);
  end.u32(12,centralSize);end.u32(16,centralOffset);end.u16(20,0);
  return new Blob([...parts,...central,end.bytes],{type:'application/zip'});
}

export function createSoulController({api,action,notify,changed,owner,modeChanged=changed}){
  let characters=[],config={},timer=null,selected='',soulMode='text';
  const strengths={text:1,reinterpret:.72};
  const $=id=>document.getElementById(id);
  const status=text=>{$('soul-train-status').textContent=text||'';};
  const readyCharacters=()=>characters.filter(c=>c.state==='ready'&&!c.adapterFor);
  const current=()=>characters.find(c=>c.id===selected&&c.state==='ready'&&!c.adapterFor)||null;

  function renderSelect(){
    const select=$('soul-character'),keep=selected||select.value;
    const ready=readyCharacters();
    select.replaceChildren(new Option(ready.length?'Choose character':'No trained characters yet',''),...ready.map(c=>new Option(c.name,c.id)));
    selected=ready.some(c=>c.id===keep)?keep:(ready[0]?.id||'');
    select.value=selected;
    $('soul-empty').hidden=!!ready.length;
    const target=$('soul-training-target'),previous=target.value;
    target.replaceChildren(new Option('New Text character',''),...ready.filter(c=>!c.reinterpret).map(c=>new Option('Reinterpret / '+c.name,c.id)));
    target.value=[...target.options].some(o=>o.value===previous)?previous:'';
    trainingPurpose();renderMode();changed();
  }
  function renderCharacters(){
    const box=$('soul-character-list');box.replaceChildren();
    if(!characters.length){
      const p=document.createElement('p');p.className='fine';p.textContent='No characters trained yet.';box.append(p);return;
    }
    for(const c of characters){
      const row=document.createElement('div');row.className='soul-character-row';
      const info=document.createElement('div'),name=document.createElement('strong'),meta=document.createElement('span');
      name.textContent=c.name;meta.textContent=(c.state||'').toUpperCase()+(c.triggerWord?' · '+c.triggerWord:'');
      info.append(name,meta);
      if(c.error){const err=document.createElement('small');err.textContent=c.error;info.append(err);}
      const controls=document.createElement('div');
      if(c.state==='ready'&&!c.adapterFor){
        const use=document.createElement('button');use.type='button';use.className='quiet';use.textContent=c.id===selected?'Selected':'Use';
        use.onclick=()=>{selected=c.id;renderSelect();renderCharacters();};
        controls.append(use);
      }
      if(c.state==='uncertain'){
        const retry=document.createElement('button');retry.type='button';retry.className='primary';retry.textContent='Retry submit';
        retry.onclick=()=>action(async()=>{
          if(!confirm('Retry this same training dataset only if FAL shows no matching request. This submits one paid training job and does not re-upload your photos.'))return;
          status('Resubmitting the existing private dataset to FAL…');
          const data=await api('/api/soul/characters/'+c.id+'/retry',{method:'POST',body:{confirm:true}});
          await load();
          status(data.character?.state==='queued'?'Training queued successfully.':'Submission status: '+(data.character?.state||'unknown'));
          notify(data.character?.state==='queued'?'PV Soul training queued in FAL.':'PV Soul retry returned '+(data.character?.state||'an unknown state')+'.');
        });
        const resolve=document.createElement('button');resolve.type='button';resolve.className='quiet';resolve.textContent='Discard';
        resolve.onclick=()=>action(async()=>{
          if(!confirm('Discard this uncertain attempt and its uploaded training dataset?'))return;
          await api('/api/soul/characters/'+c.id+'/resolve',{method:'POST',body:{confirm:true}});await load();
          notify('Uncertain PV Soul attempt discarded.');
        });
        controls.append(retry,resolve);
      }
      if(terminal(c.state)){
        const del=document.createElement('button');del.type='button';del.className='quiet';del.textContent='Delete';
        del.onclick=()=>action(async()=>{
          if(!confirm('Delete '+c.name+' and its trained weights? Existing generated images stay in History.'))return;
          await api('/api/soul/characters/'+c.id,{method:'DELETE'});if(selected===c.id)selected='';await load();
          notify('Character deleted. Existing generated results are unchanged.');
        });
        controls.append(del);
      }
      row.append(info,controls);box.append(row);
    }
  }
  function schedule(){
    clearTimeout(timer);timer=null;
    if(owner()&&characters.some(c=>ACTIVE.has(c.state)&&c.state!=='uncertain'))timer=setTimeout(()=>void load().catch(()=>{}),10000);
  }
  async function load(){
    if(!owner())return;
    const data=await api('/api/soul/characters');characters=data.characters||[];
    renderSelect();renderCharacters();schedule();
  }
  function configure(next){
    config=next||{};$('soul-training-unavailable').hidden=!!config.soulTrainingEnabled;
    const old=$('soul-preset').value,presets=config.soulPresets||[];
    $('soul-preset').replaceChildren(...presets.map(p=>new Option(p.label,p.id)));
    $('soul-preset').value=presets.some(p=>p.id===old)?old:(presets[0]?.id||'');
    renderPreset(false);renderMode();
  }
  function trainingPurpose(){
    const parent=characters.find(c=>c.id===$('soul-training-target').value),re=!!parent;
    $('soul-paid-reinterpret-label').hidden=!re;
    $('soul-training-detail').textContent=re?'Separate Z-Image Turbo identity for '+parent.name+'. Select 20–80 identity photos. The previous training photos were temporary and are not reused automatically. Published FAL price: $2.26 for 1,000 steps.':'Qwen Image 2512 text identity.';
    if(!re&&$('soul-name').readOnly)$('soul-name').value='';
    $('soul-name').readOnly=re;if(re)$('soul-name').value=parent.name+' / Reinterpret';
    $('soul-train').textContent=re?'Train Reinterpret identity · $2.26':'Train character';
  }
  function renderPreset(defaults){
    const p=(config.soulPresets||[]).find(p=>p.id===$('soul-preset').value);
    $('soul-preset-description').textContent=p?.description||'';
    if(defaults&&p){
      $('soul-fidelity').value=p.imageFidelity;
      $('soul-strength').value=p.identityStrength;
      strengths.reinterpret=p.identityStrength;
      $('soul-keep-composition').checked=p.keepComposition!==false;
      $('soul-keep-styling').checked=p.keepStyling===true;
    }
    $('soul-fidelity-value').textContent=Number($('soul-fidelity').value).toFixed(2);
    $('soul-strength-value').textContent=Number($('soul-strength').value).toFixed(2);
  }
  function renderMode(){
    const re=soulMode==='reinterpret',adapter=current()?.reinterpret;
    for(const m of ['text','reinterpret']){const b=$('soul-mode-'+m);b.classList.toggle('active',soulMode===m);b.setAttribute('aria-selected',String(soulMode===m));}
    $('soul-reinterpret-controls').hidden=!re;
    $('soul-mode-note').textContent=re?'Reinterpret uses a separate Z-Image Turbo identity trained for this Soul. Source preservation and identity quality depend on the image and strength.':'Text uses your trained Qwen Image 2512 identity.';
    $('soul-reinterpret-status').textContent=!config.soulReinterpretEnabled?'Reinterpret is not enabled on this backend.':adapter?.state==='ready'?'Reinterpret identity ready.':adapter?'Reinterpret identity: '+adapter.state+'. Check Train / manage.':'A separate Reinterpret identity must be trained before generating. Your Text identity remains available.';
    $('soul-prepare-reinterpret').hidden=!!adapter||!current()||!config.soulReinterpretEnabled;
  }
  function setMode(value){strengths[soulMode]=Number($('soul-strength').value)||1;soulMode=value==='reinterpret'?'reinterpret':'text';$('soul-strength').value=strengths[soulMode];renderPreset(false);renderMode();}
  $('soul-mode-text').onclick=()=>{setMode('text');modeChanged();};
  $('soul-mode-reinterpret').onclick=()=>{setMode('reinterpret');modeChanged();};
  $('soul-preset').onchange=()=>{renderPreset(true);changed();};
  $('soul-fidelity').oninput=()=>{renderPreset(false);changed();};
  for(const id of ['soul-keep-composition','soul-keep-styling'])$(id).onchange=changed;
  $('soul-training-target').onchange=()=>{$('soul-paid-reinterpret').checked=false;trainingPurpose();};
  $('soul-prepare-reinterpret').onclick=()=>{$('soul-training-target').value=selected;$('soul-paid-reinterpret').checked=false;trainingPurpose();$('soul-dialog').showModal();};

  function reset(){clearTimeout(timer);timer=null;characters=[];selected='';soulMode='text';renderSelect();renderCharacters();status('');$('soul-photos').value='';$('soul-photo-count').textContent='0 / 80';}

  $('soul-character').onchange=()=>{selected=$('soul-character').value;renderMode();changed();};
  $('soul-strength').oninput=()=>{$('soul-strength-value').textContent=Number($('soul-strength').value).toFixed(2);changed();};
  $('soul-manage').onclick=()=>{$('soul-dialog').showModal();void load().catch(e=>status(e.message));};
  $('soul-dialog-close').onclick=()=>$('soul-dialog').close();
  $('soul-photos').onchange=()=>{
    const n=$('soul-photos').files?.length||0;
    $('soul-photo-count').textContent=n+' / 80';
    status(n&&n<20?'Choose at least 20 photos.':n>80?'Use no more than 80 photos.':'');
  };

  $('soul-train').onclick=()=>action(async()=>{
    if(!config.soulTrainingEnabled)throw new Error('FAL training is not configured on the Worker.');
    const reinterpretFor=$('soul-training-target').value||null;
    if(reinterpretFor&&!$('soul-paid-reinterpret').checked)throw new Error('Approve the separate $2.26 Reinterpret training first.');
    const name=$('soul-name').value.trim(),files=[...($('soul-photos').files||[])];
    if(!name||name.length>80)throw new Error('Give the character a name up to 80 characters.');
    if(files.length<20||files.length>80)throw new Error('Choose 20 to 80 training photos.');
    if(!$('soul-consent').checked)throw new Error('Confirm the training-set rights and adult consent before training.');
    for(const file of files)if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Training photos must be JPG, PNG or WebP.');
    const prepared=[];
    for(let i=0;i<files.length;i++){
      status('Preparing '+(i+1)+' / '+files.length+' · '+escapeText(files[i].name));
      const copy=await soulTrainingCopy(files[i]);prepared.push(copy);
    }
    const archive=await zipStored(prepared,status);
    if(archive.size>64*1024*1024)throw new Error('The prepared training set is still above 64 MiB. Use fewer or smaller source photos.');
    status('Uploading private training set…');
    const dataset=await api('/api/soul/datasets',{method:'POST',headers:{'Content-Type':'application/zip','X-Photo-Count':String(files.length)},body:archive});
    status('Submitting 1,000-step character training…');
    const result=await api('/api/soul/characters',{method:'POST',body:{name,datasetId:dataset.id,confirm:true,...(reinterpretFor?{reinterpretFor,confirmPaidTraining:true}:{})}});
    $('soul-photos').value='';$('soul-photo-count').textContent='0 / 80';$('soul-consent').checked=false;$('soul-paid-reinterpret').checked=false;
    status(result.character.state==='uncertain'?'Submission is uncertain. Check the FAL dashboard before starting another training.':'Training queued. You can close this window; status will update automatically.');
    await load();
  });

  return {
    load,configure,reset,setMode,mode:()=>soulMode,
    reinterpretReady:()=>!!config.soulReinterpretEnabled&&current()?.reinterpret?.state==='ready',
    reinterpretSettings:()=>({mode:'reinterpret',preset:$('soul-preset').value,imageFidelity:Number($('soul-fidelity').value),keepComposition:$('soul-keep-composition').checked,keepStyling:$('soul-keep-styling').checked}),
    restore(p){setMode(p.mode);if(p.preset)$('soul-preset').value=p.preset;$('soul-fidelity').value=p.imageFidelity??.82;$('soul-keep-composition').checked=p.keepComposition!==false;$('soul-keep-styling').checked=p.keepStyling!==false;$('soul-strength').value=p.identityStrength??1;strengths[soulMode]=Number($('soul-strength').value);renderPreset(false);renderMode();},
    selectedId:()=>selected,
    strength:()=>Number($('soul-strength').value)||1,
    ready:()=>!!current(),
    character:current,
    setSelected(id){selected=id||'';renderSelect();},
    referenceLimit:()=>0
  };
}
