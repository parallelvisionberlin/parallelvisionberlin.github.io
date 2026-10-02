// Read-only reconciliation for an existing fal.ai submission whose request ID was lost.
// A missing or ambiguous history entry never proves that no paid request was submitted.
const HISTORY_URL='https://api.fal.ai/v1/models/requests/by-endpoint';
const SKEW_MS=120_000,MAX_PAGES=25,MAX_PAGE_BYTES=24*1024*1024,MAX_TOTAL_BYTES=64*1024*1024;
const REQUEST_TIMEOUT_MS=10_000,TOTAL_TIMEOUT_MS=25_000;

function recoveryError(code,message,status=409){
  const error=new Error(message);error.code=code;error.status=status;return error;
}
function timestamp(value){
  if(typeof value==='number')return Number.isFinite(value)&&Number.isFinite(new Date(value).getTime())?value:NaN;
  return typeof value==='string'&&value.trim()?Date.parse(value):NaN;
}
function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function sameJson(a,b,depth=0){
  if(depth>64)return false;
  if(a===b)return a===null||typeof a==='string'||typeof a==='boolean'||(typeof a==='number'&&Number.isFinite(a));
  if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  if(Array.isArray(a))return a.length===b.length&&a.every((value,i)=>sameJson(value,b[i],depth+1));
  const keys=Object.keys(a);
  return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&sameJson(a[key],b[key],depth+1));
}
async function readPage(response,budget,signal){
  const declared=Number(response.headers.get('content-length'));
  if(Number.isFinite(declared)&&declared>Math.min(MAX_PAGE_BYTES,budget.remaining)){
    await response.body?.cancel().catch(()=>{});
    throw recoveryError('history_too_large','FAL history is too large to verify safely. The request remains interrupted.');
  }
  if(!response.body)throw recoveryError('history_invalid','FAL history did not include a readable response. The request remains interrupted.',502);
  const reader=response.body.getReader(),decoder=new TextDecoder(),chunks=[];
  let bytes=0;
  try{
    while(true){
      if(signal.aborted)throw recoveryError('history_timeout','FAL history verification timed out. The request remains interrupted.',502);
      const chunk=await reader.read();if(chunk.done)break;
      bytes+=chunk.value.byteLength;budget.remaining-=chunk.value.byteLength;
      if(bytes>MAX_PAGE_BYTES||budget.remaining<0)throw recoveryError('history_too_large','FAL history is too large to verify safely. The request remains interrupted.');
      chunks.push(decoder.decode(chunk.value,{stream:true}));
    }
    chunks.push(decoder.decode());
    try{return JSON.parse(chunks.join(''));}
    catch{throw recoveryError('history_invalid','FAL history returned an invalid response. The request remains interrupted.',502);}
  }finally{
    await reader.cancel().catch(()=>{});
    reader.releaseLock();
  }
}
async function fetchPage(url,key,fetchImpl,budget,timeoutMs){
  const controller=new AbortController();let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{
    controller.abort();reject(recoveryError('history_timeout','FAL history verification timed out. The request remains interrupted.',502));
  },timeoutMs);});
  try{
    return await Promise.race([timeout,(async()=>{
      const response=await fetchImpl(url.toString(),{method:'GET',headers:{Authorization:'Key '+key,Accept:'application/json'},redirect:'error',cache:'no-store',signal:controller.signal});
      if(!response.ok){
        await response.body?.cancel().catch(()=>{});
        const access=response.status===401||response.status===403;
        throw recoveryError(access?'history_access':'history_http',access?'The connected FAL key cannot read request history. The request remains interrupted.':'FAL request history is unavailable. The request remains interrupted.',502);
      }
      return readPage(response,budget,controller.signal);
    })()]);
  }catch(error){
    if(error?.code?.startsWith('history_'))throw error;
    throw recoveryError('history_unavailable','FAL request history could not be reached. The request remains interrupted.',502);
  }finally{clearTimeout(timer);}
}

/**
 * Find exactly one existing request from its full JSON input and submission window.
 * This helper never submits, cancels or retries a generation, and returns no payloads.
 * Dates may be millisecond timestamps or ISO strings. A non-match always throws.
 */
export async function findFalRequest({key,endpoint,input,createdAt,updatedAt,nowMs=Date.now()}={},fetchImpl=fetch){
  const created=timestamp(createdAt),updated=timestamp(updatedAt),now=timestamp(nowMs);
  if(typeof key!=='string'||!key.trim()||typeof endpoint!=='string'||!/^[-\w]+(?:\/[\w.-]+)+$/.test(endpoint)||!object(input)||!Number.isFinite(created)||!Number.isFinite(updated)||!Number.isFinite(now)||created<=0||updated<created||now<created||updated>now+SKEW_MS){
    throw recoveryError('history_arguments','The original FAL request cannot be reconstructed safely.',400);
  }
  const start=created-SKEW_MS,end=updated+SKEW_MS,deadline=Date.now()+TOTAL_TIMEOUT_MS;
  const base=new URL(HISTORY_URL);
  base.searchParams.set('endpoint_id',endpoint);
  base.searchParams.set('start',new Date(start).toISOString());
  // History may be filtered by completion time. Retrieve through now, then check sent_at locally.
  base.searchParams.set('end',new Date(now).toISOString());
  base.searchParams.set('expand','payloads');base.searchParams.set('limit','1');
  const matches=new Map(),seenCursors=new Set(),budget={remaining:MAX_TOTAL_BYTES};
  let cursor=null,incompletePayload=false;
  for(let page=0;page<MAX_PAGES;page++){
    const remaining=deadline-Date.now();
    if(remaining<=0)throw recoveryError('history_timeout','FAL history verification timed out. The request remains interrupted.',502);
    const url=new URL(base);if(cursor!==null)url.searchParams.set('cursor',cursor);
    const data=await fetchPage(url,key,fetchImpl,budget,Math.min(REQUEST_TIMEOUT_MS,remaining));
    if(!object(data)||!Array.isArray(data.items)||typeof data.has_more!=='boolean'||!(data.next_cursor===null||typeof data.next_cursor==='string')||data.has_more!==Boolean(data.next_cursor)){
      throw recoveryError('history_invalid','FAL history returned an incomplete response. The request remains interrupted.',502);
    }
    for(const item of data.items){
      if(!object(item)||typeof item.endpoint_id!=='string'||typeof item.request_id!=='string'||!item.request_id.trim()||item.request_id.length>200||!Number.isFinite(timestamp(item.sent_at))){
        throw recoveryError('history_invalid','FAL history returned an incomplete request record. The request remains interrupted.',502);
      }
      const sent=timestamp(item.sent_at);
      if(item.endpoint_id!==endpoint||sent<start||sent>end)continue;
      if(!Object.hasOwn(item,'json_input')||!object(item.json_input)){incompletePayload=true;continue;}
      if(sameJson(input,item.json_input))matches.set(item.request_id,{requestId:item.request_id,endpointId:item.endpoint_id,sentAt:item.sent_at});
    }
    if(!data.has_more){
      if(matches.size>1)throw recoveryError('history_ambiguous','Several FAL requests have the same input. The original request cannot be identified safely.');
      if(incompletePayload)throw recoveryError('history_payload_missing','FAL history is missing original input data. The request remains interrupted.');
      if(matches.size===0)throw recoveryError('history_not_found','No exact FAL history match was found. This does not prove the request was never submitted; it remains interrupted.');
      return matches.values().next().value;
    }
    if(data.next_cursor.length>2048||seenCursors.has(data.next_cursor))throw recoveryError('history_incomplete','FAL history pagination could not be verified. The request remains interrupted.');
    cursor=data.next_cursor;seenCursors.add(cursor);
  }
  throw recoveryError('history_incomplete','FAL history exceeds the verification limit. The request remains interrupted.');
}
