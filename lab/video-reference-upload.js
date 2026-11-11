// Upload references only after the user has attached them. This never quotes,
// submits a generation, or reserves credits. A price check and Generate reuse
// the same in-flight upload rather than sending the original twice.
export function createVideoReferenceUploader({upload,isCurrent,onChange=()=>{}}){
  const tasks=new WeakMap();
  function status(item){
    if(item.id)return {state:'ready',message:''};
    const record=tasks.get(item);
    return record?{state:record.state,message:record.message}:{state:'idle',message:''};
  }
  function start(item,{retry=false}={}){
    if(item.id)return Promise.resolve(item.id);
    const existing=tasks.get(item);
    if(existing?.state==='uploading')return existing.promise;
    if(existing?.state==='error'&&!retry)
      return Promise.reject(new Error('Reference upload failed. Select Retry on the photo before generating.'));
    const session=isCurrent.session();
    const record={state:'uploading',message:'',promise:null};
    tasks.set(item,record);
    const stillCurrent=()=>isCurrent(item,session)&&tasks.get(item)===record;
    const changed=()=>{if(stillCurrent())onChange(item);};
    const promise=Promise.resolve().then(()=>upload(item.file)).then(id=>{
      if(!id)throw new Error('The upload did not return an asset ID.');
      record.state='ready';
      if(stillCurrent()){item.id=id;changed();}
      return id;
    }).catch(error=>{
      record.state='error';
      record.message=String(error?.message||'Upload failed. Please retry.');
      changed();
      throw error;
    });
    record.promise=promise;
    changed();
    return promise;
  }
  return {start,status};
}
