export function segmentPhoto(image,{signal}={}){
  signal?.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const frame=document.createElement('iframe');
    frame.hidden=true;
    frame.title='Night Flash photo processing';
    frame.setAttribute('sandbox','allow-scripts');
    frame.referrerPolicy='no-referrer';
    frame.src=new URL('./night-flash-segmentation.html?v=20261107-subject1',import.meta.url).href;
    function finish(error,value){
      clearTimeout(timeout);
      signal?.removeEventListener('abort',abort);
      window.removeEventListener('message',receive);
      frame.remove();
      if(error)reject(error);else resolve(value);
    }
    function abort(){finish(signal.reason);}
    function receive(event){
      if(event.source!==frame.contentWindow||event.origin!=='null'||event.data?.type!=='night-flash-mask')return;
      const {width,height,person,face,error}=event.data;
      if(error){finish(Error(error));return;}
      if(width!==image.width||height!==image.height||!(person instanceof Float32Array)||
         !(face instanceof Float32Array)||person.length!==width*height||face.length!==person.length){
        finish(Error('The Night Flash mask could not be read.'));return;
      }
      finish(null,{width,height,person,face});
    }
    const timeout=setTimeout(()=>finish(Error('The subject mask could not load. Try again.')),45_000);
    signal?.addEventListener('abort',abort,{once:true});
    window.addEventListener('message',receive);
    frame.onerror=()=>finish(Error('The subject mask could not load. Try again.'));
    frame.onload=()=>frame.contentWindow.postMessage({type:'night-flash-photo',image},'*',[image.data.buffer]);
    document.body.append(frame);
  });
}
