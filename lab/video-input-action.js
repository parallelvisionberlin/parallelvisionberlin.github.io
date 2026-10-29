// A missing media requirement is a preparation action, never permission to bill.
export function videoInputAction({video,allowed,busy,hasPrompt,hasInput,mode}){
  if(!video||!allowed||busy||!hasPrompt||hasInput)return null;
  if(mode==='reference')return {label:'Add a reference',inputId:'reference-images'};
  if(mode==='start')return {label:'Add a start frame',inputId:'image'};
  if(mode==='extend')return {label:'Add a video',inputId:'video-references'};
  return null;
}
