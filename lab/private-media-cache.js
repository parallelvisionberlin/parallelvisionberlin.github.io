// Device cache for authenticated images only. No tokens, provider URLs or API credentials.
// Account selection happens only after /api/session succeeds. Private browsing or
// a storage failure simply falls back to the authenticated network request.
export function createPrivateMediaCache({storage=globalThis.caches,origin=globalThis.location?.origin||'https://parallelvisionlabel.com',clock=Date.now,maxBytes=128*1048576,maxEntries=120,ttl=86400000}={}){
  const prefix='pv-lab-private-media-v1:';
  let account='',revision=0,queue=Promise.resolve();
  const enqueue=fn=>{queue=queue.then(fn,fn).catch(()=>{});return queue;};
  const key=id=>origin+'/__pv_lab_device_cache__/'+encodeURIComponent(id);
  const current=(who,rev)=>!!who&&who===account&&rev===revision;
  async function select(who){
    account=String(who||'');const rev=++revision,next=account;
    return enqueue(async()=>{
      if(!storage)return;
      for(const name of await storage.keys())if(name.startsWith(prefix)&&name!==prefix+next)await storage.delete(name);
      if(!current(next,rev))return;
    });
  }
  async function get(id){
    const who=account,rev=revision;if(!who||!storage)return null;
    try{
      const cache=await storage.open(prefix+who),response=await cache.match(key(id));
      if(!response||!current(who,rev))return null;
      if(clock()-Number(response.headers.get('X-PV-Stored'))>=ttl){await cache.delete(key(id));return null;}
      const blob=await response.blob();
      return current(who,rev)&&blob.type.startsWith('image/')&&blob.size>0?blob:null;
    }catch{return null;}
  }
  function put(id,blob){
    const who=account,rev=revision;
    if(!who||!storage||!blob?.type?.startsWith('image/')||!blob.size||blob.size>32*1048576)return Promise.resolve();
    return enqueue(async()=>{
      if(!current(who,rev))return;
      const cache=await storage.open(prefix+who);
      if(!current(who,rev))return;
      await cache.delete(key(id));
      await cache.put(key(id),new Response(blob,{headers:{'Content-Type':blob.type,'Content-Length':String(blob.size),'X-PV-Stored':String(clock())}}));
      if(!current(who,rev)){await cache.delete(key(id));return;}
      const keys=await cache.keys(),items=[];let bytes=0;
      for(const request of keys){
        const response=await cache.match(request);if(!response)continue;
        const size=Number(response.headers.get('Content-Length'))||0;
        if(clock()-Number(response.headers.get('X-PV-Stored'))>=ttl){await cache.delete(request);continue;}
        items.push({request,size});bytes+=size;
      }
      while(items.length>maxEntries||bytes>maxBytes){const item=items.shift();bytes-=item.size;await cache.delete(item.request);}
    });
  }
  function clear(){
    const who=account;++revision;
    return enqueue(async()=>{if(storage&&who)await storage.delete(prefix+who);});
  }
  return {select,get,put,clear,signOut:()=>select('')};
}
