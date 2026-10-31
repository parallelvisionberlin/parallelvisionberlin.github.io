// Temporary local photo transfer. No network upload, account change or generation.
const DB='pv-lab-editorial-model-v1',STORE='photo',TOKEN='pv-lab-editorial-model-token-v1';
const TTL=10*60*1000;
export function validateModelPhoto(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>20*1024*1024)
  throw Error('Choose a JPG, PNG or WebP photograph up to 20 MB.');
 return file;
}
function open(){return new Promise((resolve,reject)=>{
 if(typeof indexedDB==='undefined'){reject(Error('Photo transfer is unavailable. Open Full Editorial and upload your photograph there.'));return}
 const request=indexedDB.open(DB,1);
 request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});
 request.onerror=()=>reject(Error('Could not prepare your photograph. Please try again.'));
 request.onsuccess=()=>resolve(request.result);
})}
export async function saveModelPhoto(file){
 validateModelPhoto(file);
 const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=[...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');
 const id=[hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
 // The token binds this private transfer to the current browser tab.
 sessionStorage.setItem(TOKEN,id);
 const db=await open();
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
  store.clear();store.put({id,file,createdAt:Date.now()});
  tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(Error('Could not keep your photograph for the next page. Please try again.'));
 });return id;}finally{db.close()}
}
export async function takeModelPhoto(id){
 if(!/^[a-f0-9-]{36}$/i.test(id||'')||sessionStorage.getItem(TOKEN)!==id)
  throw Error('Select your model photograph again using Upload photos.');
 sessionStorage.removeItem(TOKEN);
 const db=await open();
 try{
  const record=await new Promise((resolve,reject)=>{
   let value;const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),request=store.get(id);
   request.onsuccess=()=>{value=request.result;store.delete(id)};
   tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(Error('Could not open your model photograph. Please upload it again.'));
  });
  if(!record||!Number.isFinite(record.createdAt)||Date.now()-record.createdAt>TTL||record.createdAt>Date.now()+60000)
   throw Error('Your temporary photograph expired. Please upload it again.');
  return validateModelPhoto(record.file);
 }finally{db.close()}
}
