/* PV LAB: short-lived, same-tab Image workspace return from Explore Moods.
   The original photos remain local in IndexedDB, never in URL parameters.
   A Clerk user id and tab-scoped token are both needed to restore. */
const DB='pv-lab-studio-return-v1',STORE='drafts',TOKEN='pv-lab-studio-return-token-v1';
const AGE=12*60*60*1000;
function database(){
  if(typeof indexedDB==='undefined')throw Error('Private draft storage is unavailable in this browser.');
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});
    };
    request.onerror=()=>reject(Error('Could not open private draft storage.'));
    request.onsuccess=()=>resolve(request.result);
  });
}
async function transaction(mode,operation){
  const db=await database();
  try{
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,mode);
      const store=tx.objectStore(STORE);
      const req=operation(store);
      let value;
      req.onsuccess=()=>{value=req.result;};
      tx.oncomplete=()=>resolve(value);
      tx.onerror=()=>reject(Error('Could not save your Image workspace in this browser.'));
      tx.onabort=()=>reject(Error('Image workspace storage was interrupted.'));
    });
  }finally{db.close();}
}
function tabToken(){
  try{return sessionStorage.getItem(TOKEN)||null;}
  catch{return null;}
}
export async function saveStudioReturnDraft(userId,state){
  if(typeof userId!=='string'||!userId||!state||typeof state!=='object')
    throw Error('Sign in to preserve your Image workspace.');
  const id=crypto.randomUUID();
  await transaction('readwrite',store=>store.put({id,userId,createdAt:Date.now(),state}));
  try{sessionStorage.setItem(TOKEN,id);}
  catch{await transaction('readwrite',store=>store.delete(id));throw Error('This browser blocked private draft storage. Keep Studio open to preserve your work.');}
  return id;
}
export async function readStudioReturnDraft(userId){
  const id=tabToken();
  if(!id||!userId)return null;
  const record=await transaction('readonly',store=>store.get(id));
  if(!record||record.userId!==userId||!Number.isFinite(record.createdAt)||Date.now()-record.createdAt>AGE||record.createdAt>Date.now()+60000)return null;
  return record.state||null;
}
export async function clearStudioReturnDraft(){
  const id=tabToken();
  if(!id)return;
  await transaction('readwrite',store=>store.delete(id));
  try{sessionStorage.removeItem(TOKEN);}catch{}
}
export function storedImageFile(record){
  if(!record?.file||!record.name||!record.type||!['image/jpeg','image/png','image/webp'].includes(record.type))
    throw Error('A saved reference image could not be restored.');
  return new File([record.file],record.name,{type:record.type,lastModified:record.lastModified||Date.now()});
}
