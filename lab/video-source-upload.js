// Large private videos are sent as bounded parts, never as one buffered request.
export async function uploadUpscaleVideo(file,api,onProgress=()=>{}){
  const mime=/\.mov$/i.test(file.name)||file.type==='video/quicktime'?'video/quicktime':'video/mp4';
  if(file.size<=20*1024*1024){
    return api('/api/reference-uploads',{method:'POST',headers:{'Content-Type':mime,'X-Filename':encodeURIComponent(file.name||'source.mp4')},body:file});
  }
  const session=await api('/api/video-uploads',{method:'POST',body:{mime,filename:file.name,bytes:file.size}});
  if(!session?.id||!Number.isSafeInteger(session.partBytes)||session.partBytes<5*1024*1024||session.partBytes>16*1024*1024)
    throw Error('No valid video upload session.');
  const path='/api/video-uploads/'+session.id,parts=[];
  try{
    for(let offset=0,part=1;offset<file.size;offset+=session.partBytes,part++){
      const chunk=file.slice(offset,Math.min(file.size,offset+session.partBytes));
      let uploaded;
      // Replacing one identical part is safe; this never retries a paid job.
      for(let attempt=0;attempt<2;attempt++){
        try{uploaded=await api(path+'/part/'+part,{method:'POST',timeoutMs:180000,headers:{'Content-Type':'application/octet-stream'},body:chunk});break;}
        catch(error){if(attempt||/Sign in|Session changed|credits|expired/i.test(error.message))throw error;}
      }
      if(uploaded?.partNumber!==part||typeof uploaded.etag!=='string')throw Error('The video part was not acknowledged.');
      parts.push(uploaded);onProgress(Math.round(Math.min(file.size,offset+chunk.size)/file.size*100));
    }
    // Completion is idempotent, including a lost response after saving the asset.
    try{return await api(path+'/complete',{method:'POST',timeoutMs:180000,body:{parts}});}
    catch{return await api(path+'/complete',{method:'POST',timeoutMs:180000,body:{parts}});}
  }catch(error){await api(path+'/abort',{method:'POST'}).catch(()=>{});throw error;}
}
