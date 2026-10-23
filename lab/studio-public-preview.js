// Present the existing approved editors without creating an authenticated session.
// The real API, uploads, quotes and generation retain their existing owner guards.
export function createStudioPublicPreview({app,gate,authorized,setTool,retouch,fashion,closeFashion}){
  const $=id=>document.getElementById(id);
  const active=()=>!authorized()&&app.hasAttribute('data-guest-preview');
  const signIn=()=>window.dispatchEvent(new Event('pv-studio-auth-required'));
  function refreshAction(){
    if(!active())return;
    const action=$('generate'),caption=app.dataset.guestPreview==='upscale'?'Upscale':'Generate';
    // This is an authentication entry point only. Capture below prevents the
    // original action handler from running, including programmatic clicks.
    if(action.disabled)action.disabled=false;
    if(action.textContent!==caption)action.textContent=caption;
    if($('upscale-model-trigger').disabled)$('upscale-model-trigger').disabled=false;
    if($('precision-generate').disabled)$('precision-generate').disabled=false;
  }
  const accountAction='#generate,#save,#upscale-check-price,#precision-generate,'+
    '#precision-review-confirm,#precision-select-approve,#precision-tool-magic,'+
    '#pack-open,#pack-save,#pack-select,#last-upload,#scene-video-open,'+
    '#scene-image-open,#upscale-model-trigger,#video-model-trigger,input[type="file"]';
  app.addEventListener('click',event=>{
    if(!active()||!event.target.closest(accountAction))return;
    event.preventDefault();event.stopImmediatePropagation();signIn();
  },true);
  for(const type of ['drop','change','submit'])app.addEventListener(type,event=>{
    if(!active()||(type==='change'&&!event.target.matches('input[type="file"]')))return;
    event.preventDefault();event.stopImmediatePropagation();signIn();
  },true);
  new MutationObserver(refreshAction).observe(app,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled']});
  return {
    async show(route){
      if(authorized()||!$('pv-guest-closed-state').hidden)return;
      if(!['video','upscale','retouch','fashion'].includes(route)){
        if(active()){
          app.removeAttribute('data-guest-preview');app.hidden=true;
          retouch.close();app.classList.remove('retouch-studio-active');closeFashion();
        }
        return;
      }
      if(app.dataset.guestPreview!==route){
        app.dataset.guestPreview=route;
        retouch.close();app.classList.remove('retouch-studio-active');closeFashion();
        if(route==='retouch'){
          setTool('image');app.classList.add('retouch-studio-active');retouch.preview();
        }else if(route==='fashion')await fashion({preview:true});
        else setTool(route);
      }
      // A sign-in or a newer route can finish while Fashion is mounting.
      if(!active()||app.dataset.guestPreview!==route)return;
      if(!gate.hidden)gate.hidden=true;
      if(app.hidden)app.hidden=false;
      refreshAction();
    }
  };
}
