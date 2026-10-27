/* Upscaler editorial sidebar: upload affordance and neutral source status.
   Actual image validation, credit quotes, history and provider requests stay in lab.js. */
function installUpscaleSidebar(){
  const app=document.getElementById('app');
  const upload=document.getElementById('pv-upscale-source-upload');
  const copy=document.getElementById('pv-upscale-source-upload-title');
  const status=document.getElementById('pv-upscale-source-state');
  const input=document.getElementById('image');
  const thumb=document.getElementById('pv-upscale-source-thumb');
  const filename=document.getElementById('pv-upscale-source-filename');
  if(!app||!upload||!copy||!status||!input||!thumb||!filename)return;
  // Upload actions and the dashed drop area all use the same original file input.
  // File validation, drag/drop, jobs and credit quoting remain in lab.js.
  for(const button of [upload,document.getElementById('pv-upscale-hero-upload')].filter(Boolean)){
    button.addEventListener('click',()=>{
      if(!app.classList.contains('upscale-studio-active'))return;
      input.click();
    });
  }
  const zone=document.getElementById('pv-upscale-dropzone');
  zone?.addEventListener('click',event=>{
    if(!app.classList.contains('upscale-studio-active')||
      event.target.closest('button,.pv-upscale-benefits'))return;
    input.click();
  });
  // Visual feedback only. Existing drop/upload validation remains in lab.js.
  const canvas=document.getElementById('upscale-canvas');
  if(zone&&canvas){
    const isPhotoDrag=event=>Array.from(event.dataTransfer?.types||[]).includes('Files');
    zone.addEventListener('dragenter',event=>{
      if(app.classList.contains('upscale-studio-active')&&isPhotoDrag(event))
        canvas.classList.add('pv-upscale-drag-hover');
    });
    zone.addEventListener('dragover',event=>{
      if(app.classList.contains('upscale-studio-active')&&isPhotoDrag(event))
        canvas.classList.add('pv-upscale-drag-hover');
    });
    zone.addEventListener('dragleave',event=>{
      if(!zone.contains(event.relatedTarget))
        canvas.classList.remove('pv-upscale-drag-hover');
    });
    zone.addEventListener('drop',()=>canvas.classList.remove('pv-upscale-drag-hover'));
    document.addEventListener('dragend',()=>canvas.classList.remove('pv-upscale-drag-hover'));
    window.addEventListener('blur',()=>canvas.classList.remove('pv-upscale-drag-hover'));
  }
  const sync=()=>{
    const active=app.classList.contains('upscale-studio-active');
    if(!active)return;
    // The actual selected source is owned by lab.js, not by the result image
    // (which changes to an upscale output after generation).
    const hasSource=!thumb.hidden&&Boolean(thumb.getAttribute('src'));
    app.classList.toggle('pv-upscale-source-ready',hasSource);
    copy.textContent=hasSource?'Replace image':'Choose image';
    filename.textContent=hasSource
      ?(thumb.dataset.filename||'Original image')+(thumb.dataset.dimensions?' · '+thumb.dataset.dimensions:'')
      :'PNG, JPEG or WebP · up to 20 MB';
    upload.setAttribute('aria-label',hasSource?'Replace source image for upscaling':'Choose source image for upscaling');
    status.textContent=hasSource?'Original retained for comparison.':'Your original will remain available for comparison.';
  };
  // Keep the actual accessible action label consistent with the approved UI.
  // Only runs for the Upscaler; the existing click handler and disabled state stay intact.
  const generate=document.getElementById('generate');
  if(generate){
    const syncActionLabel=()=>{
      if(!app.classList.contains('upscale-studio-active'))return;
      if(generate.getAttribute('aria-label')!=='Upscale')generate.setAttribute('aria-label','Upscale');
    };
    new MutationObserver(syncActionLabel).observe(app,{attributes:true,attributeFilter:['class']});
    syncActionLabel();
  }
  input.addEventListener('change',sync);
  new MutationObserver(sync).observe(thumb,{attributes:true,attributeFilter:['hidden','src','data-filename','data-dimensions']});
  new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['class']});
  sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUpscaleSidebar,{once:true});
else installUpscaleSidebar();
