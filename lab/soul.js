import { soulTrainingCopy } from './image-tools.js?v=20260929-soul1';

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

export function createSoulController({api,action,notify,changed,owner}){
  let characters=[],config={},timer=null,selected='';
  const $=id=>document.getElementById(id);
  const status=text=>{$('soul-train-status').textContent=text||'';};
  const readyCharacters=()=>characters.filter(c=>c.state==='ready');
  const current=()=>characters.find(c=>c.id===selected&&c.state==='ready')||null;

  function renderSelect(){
    const select=$('soul-character'),keep=selected||select.value;
    const ready=readyCharacters();
    select.replaceChildren(new Option(ready.length?'Choose character':'No trained characters yet',''),...ready.map(c=>new Option(c.name,c.id)));
    selected=ready.some(c=>c.id===keep)?keep:(ready[0]?.id||'');
    select.value=selected;
    $('soul-empty').hidden=!!ready.length;
    changed();
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
      if(c.state==='ready'){
        const use=document.createElement('button');use.type='button';use.className='quiet';use.textContent=c.id===selected?'Selected':'Use';
        use.onclick=()=>{selected=c.id;renderSelect();renderCharacters();};
        controls.append(use);
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
  function configure(next){config=next||{};$('soul-training-unavailable').hidden=!!config.soulTrainingEnabled;}
  function reset(){clearTimeout(timer);timer=null;characters=[];selected='';renderSelect();renderCharacters();status('');$('soul-photos').value='';$('soul-photo-count').textContent='0 / 80';}

  $('soul-character').onchange=()=>{selected=$('soul-character').value;changed();};
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
    const result=await api('/api/soul/characters',{method:'POST',body:{name,datasetId:dataset.id,confirm:true}});
    $('soul-photos').value='';$('soul-photo-count').textContent='0 / 80';$('soul-consent').checked=false;
    status(result.character.state==='uncertain'?'Submission is uncertain. Check the FAL dashboard before starting another training.':'Training queued. You can close this window; status will update automatically.');
    await load();
  });

  return {
    load,configure,reset,
    selectedId:()=>selected,
    strength:()=>Number($('soul-strength').value)||1,
    ready:()=>!!current(),
    character:current,
    setSelected(id){selected=id||'';renderSelect();},
    referenceLimit:()=>3
  };
}
