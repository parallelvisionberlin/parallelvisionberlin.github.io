// Upload inputs before submitting inference, following fal-js storage.ts.
// Raw file bytes belong on the CDN, never in a multi-megabyte queue JSON body.
const INITIATE='https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3';
const FILE_TIMEOUT_MS=45000;

function uploadError(message){const e=new Error('FAL input upload: '+message+' No generation was submitted.');e.definite=true;return e;}
function cdnUrl(value){
  let u;try{u=new URL(value);}catch{throw uploadError('Invalid upload location.');}
  if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!(u.hostname==='fal.media'||u.hostname.endsWith('.fal.media')))throw uploadError('Unexpected upload location.');
  return u.href;
}

export async function falUploadImage(key,bytes,mime,{fetchImpl=fetch}={}){
  if(!(bytes instanceof Uint8Array)||!bytes.length||!['image/png','image/jpeg','image/webp'].includes(mime))throw uploadError('Invalid image.');
  const signal=AbortSignal.timeout(FILE_TIMEOUT_MS);
  try{
    const initiated=await fetchImpl(INITIATE,{method:'POST',headers:{Authorization:'Key '+key,'Content-Type':'application/json',Accept:'application/json','X-Fal-Object-Lifecycle':JSON.stringify({expiration_duration_seconds:86400})},body:JSON.stringify({content_type:mime,file_name:'pv-lab-input.'+(mime==='image/jpeg'?'jpg':mime.split('/')[1])}),redirect:'manual',signal});
    if(!initiated.ok){await initiated.body?.cancel();throw uploadError('Could not start the file transfer (HTTP '+initiated.status+').');}
    const data=await initiated.json(),uploadUrl=cdnUrl(data.upload_url),fileUrl=cdnUrl(data.file_url);
    // The signed upload URL authorizes this PUT. Never forward the API key.
    const uploaded=await fetchImpl(uploadUrl,{method:'PUT',headers:{'Content-Type':mime},body:bytes,redirect:'manual',signal});
    await uploaded.body?.cancel();
    if(!uploaded.ok)throw uploadError('File transfer failed (HTTP '+uploaded.status+').');
    return fileUrl;
  }catch(e){
    if(e.definite===true)throw e;
    throw uploadError(signal.aborted?'File transfer timed out after 45 seconds.':'The file transfer could not be completed.');
  }
}
