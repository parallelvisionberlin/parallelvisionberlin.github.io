// Presentation only: reuse the current private preview, never fetch another image.
const dialog=document.getElementById('image-lightbox');
const source=document.getElementById('image-lightbox-img');
const backdrop=document.getElementById('image-result-backdrop');
const references=document.getElementById('image-detail-reference-strip');
const referenceWrap=document.getElementById('image-detail-reference-wrap');
const referenceCount=document.getElementById('image-detail-reference-count');

function syncBackdrop(){
  const src=source.getAttribute('src');
  const visible=dialog.open&&!source.hidden&&!!src;
  backdrop.hidden=!visible;
  // Clear private image references on close, source removal and failed records.
  backdrop.style.backgroundImage=visible?`url(${JSON.stringify(source.src)})`:'';
}
function syncReferences(){
  const count=references.children.length;
  referenceCount.textContent=count===1?'1 reference':count+' references';
  referenceCount.hidden=count!==1;
  referenceWrap.classList.toggle('has-multiple-references',count>1);
}
if(dialog&&source&&backdrop){
  new MutationObserver(syncBackdrop).observe(source,{attributes:true,attributeFilter:['src','hidden']});
  new MutationObserver(syncBackdrop).observe(dialog,{attributes:true,attributeFilter:['open']});
  source.addEventListener('load',syncBackdrop);
  source.addEventListener('error',()=>{backdrop.hidden=true;backdrop.style.backgroundImage='';});
  dialog.addEventListener('close',syncBackdrop);
  syncBackdrop();
}
if(references&&referenceWrap&&referenceCount){
  new MutationObserver(syncReferences).observe(references,{childList:true});
  syncReferences();
}
