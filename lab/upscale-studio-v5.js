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
  upload.addEventListener('click',()=>{
    if(!app.classList.contains('upscale-studio-active'))return;
    input.click();
  });
  const sync=()=>{
    const active=app.classList.contains('upscale-studio-active');
    if(!active)return;
    const selectedFile=input.files&&input.files.length?input.files[0]:null;
    const visiblePreview=!preview.hidden&&Boolean(preview.getAttribute('src'));
    copy.textContent=selectedFile||visiblePreview?'Choose another image':'Choose image';
    status.textContent=selectedFile?selectedFile.name:
      visiblePreview?'An image is loaded in your preview.':
      'Your original will remain available for comparison.';
  };
  input.addEventListener('change',sync);
  new MutationObserver(sync).observe(preview,{attributes:true,attributeFilter:['hidden','src']});
  new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['class']});
  sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUpscaleSidebar,{once:true});
else installUpscaleSidebar();
