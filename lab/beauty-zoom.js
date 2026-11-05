/* ALTER completed-result viewer. Uses the existing private output blob URL only. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const result=$('beauty-result'),resultImage=$('beauty-result-image'),open=$('beauty-zoom-open');
 const dialog=$('beauty-zoom-dialog'),image=$('beauty-zoom-image'),stage=$('beauty-zoom-stage');
 const inputDownload=$('beauty-download'),modalDownload=$('beauty-zoom-download');
 const zoomIn=$('beauty-zoom-in'),zoomOut=$('beauty-zoom-out'),fit=$('beauty-zoom-fit'),levelText=$('beauty-zoom-level');
 if(!result||!resultImage||!open||!dialog||!image||!stage||!inputDownload||!modalDownload||!zoomIn||!zoomOut||!fit||!levelText)return;
 const levels=[0,1,1.5,2,3];let level=0;
 const applyZoom=()=>{
  if(!dialog.open||!image.naturalWidth||!image.naturalHeight)return;
  const scale=level===0?Math.min(1,stage.clientWidth/image.naturalWidth,stage.clientHeight/image.naturalHeight):levels[level];
  image.style.width=Math.max(1,Math.round(image.naturalWidth*scale))+'px';
  image.style.height='auto';
  levelText.textContent=level===0?'Fit':Math.round(levels[level]*100)+'%';
  zoomOut.disabled=level===0;zoomIn.disabled=level===levels.length-1;
  requestAnimationFrame(()=>{
   if(!dialog.open)return;
   stage.scrollLeft=Math.max(0,(stage.scrollWidth-stage.clientWidth)/2);
   stage.scrollTop=Math.max(0,(stage.scrollHeight-stage.clientHeight)/2);
  });
 };
 const setLevel=value=>{level=Math.max(0,Math.min(levels.length-1,value));applyZoom();};
 open.addEventListener('click',()=>{
  if(result.hidden||!resultImage.getAttribute('src')||!inputDownload.getAttribute('href'))return;
  level=0;
  image.src=resultImage.src;modalDownload.href=inputDownload.href;modalDownload.download=inputDownload.download;
  dialog.showModal();
  const original=image.src;
  image.decode().then(()=>{if(dialog.open&&image.src===original)applyZoom();}).catch(()=>{
   if(dialog.open&&image.src===original)dialog.close();
  });
 });
 zoomIn.addEventListener('click',()=>setLevel(level+1));
 zoomOut.addEventListener('click',()=>setLevel(level-1));
 fit.addEventListener('click',()=>setLevel(0));
 $('beauty-zoom-close')?.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener('keydown',event=>{
  if(event.target instanceof HTMLButtonElement && (event.key===' '||event.key==='Enter'))return;
  if(event.key==='+'||event.key==='='){event.preventDefault();setLevel(level+1);}
  if(event.key==='-'){event.preventDefault();setLevel(level-1);}
  if(event.key==='0'){event.preventDefault();setLevel(0);}
 });
 dialog.addEventListener('close',()=>{
  image.removeAttribute('src');image.style.removeProperty('width');
  modalDownload.removeAttribute('href');modalDownload.removeAttribute('download');
  if(open.isConnected&&!result.hidden)open.focus({preventScroll:true});
 });
 // Account sign-out or result replacement immediately closes the private viewer.
 const keepCurrent=()=>{
  if(dialog.open&&(result.hidden||!resultImage.getAttribute('src')||resultImage.src!==image.src))dialog.close();
 };
 new MutationObserver(keepCurrent).observe(result,{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(keepCurrent).observe(resultImage,{attributes:true,attributeFilter:['src']});
 window.addEventListener('resize',()=>{if(dialog.open)applyZoom();});
})();
