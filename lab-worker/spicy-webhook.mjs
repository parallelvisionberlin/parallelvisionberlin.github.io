// Private SpicyAPI task callback verifier. Pure Web Crypto; no provider credentials.
const encoder=new TextEncoder();
const decode=new TextDecoder();
export async function readBoundedCallback(request,limit=256*1024){
  const declared=Number(request.headers.get('content-length')||0);
  if(!Number.isSafeInteger(declared)||declared<0||declared>limit)throw Error('Webhook body too large.');
  const chunks=[];let bytes=0;
  if(!request.body)return new Uint8Array();
  const reader=request.body.getReader();
  try{
    for(;;){
      const {done,value}=await reader.read();if(done)break;
      bytes+=value.byteLength;
      if(bytes>limit)throw Error('Webhook body too large.');
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const raw=new Uint8Array(bytes);let offset=0;
  for(const chunk of chunks){raw.set(chunk,offset);offset+=chunk.byteLength;}
  return raw;
}
function equalBytes(a,b){
  if(a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
  return diff===0;
}
export async function verifySpicyCallback(request,secret,{now=Date.now}={}){
  if(typeof secret!=='string'||secret.length<16)throw Error('Webhook signing is not configured.');
  if(request.method!=='POST'||request.headers.get('x-webhook-payload-version')!=='2')
    throw Error('Unsupported callback version.');
  const stamp=request.headers.get('x-webhook-timestamp');
  const signature=request.headers.get('x-webhook-signature');
  if(!/^\d{10}$/.test(stamp||'')||!Number.isFinite(Number(stamp))||
    Math.abs(now()/1000-Number(stamp))>300||
    !/^[A-Za-z0-9+/]{40,48}={0,2}$/.test(signature||''))throw Error('Invalid callback signature metadata.');
  const raw=await readBoundedCallback(request);
  let envelope;try{envelope=JSON.parse(decode.decode(raw));}catch{throw Error('Invalid webhook JSON.');}
  const task=envelope?.data?.taskId;
  if(typeof task!=='string'||task.length<3||task.length>220||envelope?.code!==200)
    throw Error('Invalid webhook task.');
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',raw));
  const hex=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
  const signed=encoder.encode(task+'.'+stamp+'.'+hex);
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const expected=new Uint8Array(await crypto.subtle.sign('HMAC',key,signed));
  let received;try{received=Uint8Array.from(atob(signature),c=>c.charCodeAt(0));}catch{throw Error('Invalid webhook signature.');}
  if(!equalBytes(expected,received))throw Error('Webhook HMAC mismatch.');
  if(!['succeeded','failed','cancelled','canceled','expired'].includes(envelope.data.state))
    throw Error('Webhook does not describe a terminal task.');
  return {taskId:task,event:envelope.data,deliveryId:typeof envelope.request_id==='string'?envelope.request_id:''};
}


// Authenticated wake-up URL for accounts with no retrievable provider
// signing secret. This URL only permits a fresh lookup on SpicyAPI using the
// existing server-side credential. Its callback body is never trusted.
export async function spicyWakeToken(existingLabSecret,jobId,quoteId){
  if(typeof existingLabSecret!=='string'||existingLabSecret.length<24)
    throw Error('Server authentication key is unavailable.');
  if(typeof jobId!=='string'||typeof quoteId!=='string')
    throw Error('Invalid callback binding.');
  const key=await crypto.subtle.importKey('raw',encoder.encode(existingLabSecret),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signed=encoder.encode('pvlab-spicy-wakeup-v1\0'+jobId+'\0'+quoteId);
  const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,signed));
  return btoa(String.fromCharCode(...digest)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function equalWakeToken(expected,received){
  if(typeof expected!=='string'||typeof received!=='string'||expected.length!==43||received.length!==43)
    return false;
  let difference=0;
  for(let i=0;i<43;i++)difference|=expected.charCodeAt(i)^received.charCodeAt(i);
  return difference===0;
}
