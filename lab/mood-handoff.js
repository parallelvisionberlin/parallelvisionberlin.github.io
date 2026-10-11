// Ephemeral, same-origin photo handoff from Mood Creator to Image Studio.
// IndexedDB is used only until Image takes the photo, never for permanent media
// storage, public links, credentials, token caching or generation history.
const DB='pv-lab-mood-handoff-v1',STORE='one-shot';
const TTL=10*60*1000;
const MAX_BYTES=20*1024*1024;
function openHandoffDb(){
  if(typeof indexedDB==='undefined')throw Error('This browser cannot transfer photos between pages. Open Image directly and add your photo there.');
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB,1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});};
    request.onerror=()=>reject(Error('The browser could not prepare the image handoff. Please try again.'));
    request.onsuccess=()=>resolve(request.result);
  });
}
export function validateMoodHandoff({file=null,prompt=''}={}){
  if(file!==null&&(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>MAX_BYTES))
    throw Error('Choose a JPG, PNG or WebP photo up to 20 MB.');
  if(typeof prompt!=='string'||prompt.length>1400)throw Error('Use an image direction under 1,400 characters.');
  return {file,prompt:prompt.trim()};
}
export async function saveMoodHandoff({file=null,prompt=''}={}){
  const input=validateMoodHandoff({file,prompt});
  if(!input.file&&!input.prompt)return null;
  const db=await openHandoffDb(),id=crypto.randomUUID();
  try{
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
      store.clear();
      store.put({id,createdAt:Date.now(),name:input.file?.name||'',mime:input.file?.type||'',blob:input.file,prompt:input.prompt});
      tx.oncomplete=()=>resolve(id);
      tx.onerror=()=>reject(Error('This browser could not pass the photo to Image. Try opening Image and uploading there.'));
      tx.onabort=()=>reject(Error('Photo handoff was cancelled. No image was sent or generated.'));
    });
  }finally{db.close();}
}
export async function takeMoodHandoff(id){
  if(typeof id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id))
    throw Error('Invalid temporary photo handoff.');
  const db=await openHandoffDb();
  try{
    const record=await new Promise((resolve,reject)=>{
      let value=null;
      const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
      const request=store.get(id);
      request.onsuccess=()=>{value=request.result||null;store.delete(id);};
      tx.oncomplete=()=>resolve(value);
      tx.onerror=()=>reject(Error('The temporary photo handoff could not be opened.'));
    });
    if(!record||Date.now()-record.createdAt>TTL)
      throw Error('Your temporary photograph has expired. Select it again in Image.');
    const blob=record.blob;
    const file=blob instanceof Blob&&record.mime?new File([blob],String(record.name||'mood-photo.png'),{type:record.mime}):null;
    return validateMoodHandoff({file,prompt:record.prompt||''});
  }finally{db.close();}
}
