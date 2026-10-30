// Retry identical UUID payloads, allowing server receipts to deduplicate lost acknowledgements.
export function createMeasurementTransport({fetchImpl=globalThis.fetch,beacon=(url,body)=>globalThis.navigator?.sendBeacon?.(url,body),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),onFailure=()=>{}}={}){
 const pending=new Map();
 async function send(url,payload){
  const key=payload.id;if(pending.has(key))return;
  const body=JSON.stringify(payload);pending.set(key,{url,body});
  for(let attempt=0;attempt<3;attempt++){
   try{
    const response=await fetchImpl(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body,keepalive:true,credentials:'omit',signal:AbortSignal.timeout(6000)});
    if(response.ok){pending.delete(key);return true;}
    if(response.status<500&&response.status!==408){pending.delete(key);onFailure(response.status);return false;}
   }catch{}
   if(attempt<2)await wait(400*(attempt+1));
  }
  // Retain in memory for a final pagehide beacon. No persistent visitor identifier.
  onFailure('delivery');return false;
 }
 function flush(){for(const {url,body} of pending.values())beacon(url,new Blob([body],{type:'text/plain;charset=UTF-8'}));}
 return {send,flush};
}
