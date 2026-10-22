/* Upscaler editorial sidebar: upload affordance and neutral source status.
   Actual image validation, credit quotes, history and provider requests stay in lab.js. */
function installUpscaleSidebar(){
  const app=document.getElementById('app');
  const upload=document.getElementById('pv-upscale-source-upload');
  const copy=document.getElementById('pv-upscale-source-upload-title');
  const status=document.getElementById('pv-upscale-source-state');
  const input=document.getElementById('image');
  const preview=document.getElementById('preview');
  if(!app||!upload||!copy||!status||!input||!preview)return;
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
  const sync=()=>{
    const active=app.classList.contains('upscale-studio-active');
    if(!active)return;
    const selectedFile=input.files&&input.files.length?input.files[0]:null;
    const visiblePreview=!preview.hidden&&Boolean(preview.getAttribute('src'));
    // The main stage owns uploading before a source exists. Show a compact
    // Replace photo control only after a validated source/result is visible.
    app.classList.toggle('pv-upscale-source-ready',visiblePreview);
    copy.textContent=visiblePreview?'Choose another image':'Choose image';
    status.textContent=visiblePreview
      ?(selectedFile?.name||'Original ready for comparison')
      :'Your original will remain available for comparison.';
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
  new MutationObserver(sync).observe(preview,{attributes:true,attributeFilter:['hidden','src']});
  new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['class']});
  sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUpscaleSidebar,{once:true});
else installUpscaleSidebar();
