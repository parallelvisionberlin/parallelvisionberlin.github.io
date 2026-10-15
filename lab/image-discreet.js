/* Image Studio Discreet Mode: browser-only preview visibility. */
(()=>{
  const root=document.documentElement;
  const app=document.getElementById('app');
  const button=document.getElementById('history-preview-toggle');
  const message=document.getElementById('image-discreet-message');
  if(!app||!button||!message)return;
  const key='pv-lab-image-previews-hidden-v1';
  const mode='pv-image-previews-hidden';
  const isHidden=()=>root.classList.contains(mode);
  const viewers=['image-lightbox','image-source-lightbox','input-preview-dialog']
    .map(id=>document.getElementById(id)).filter(Boolean);
  const conceal=()=>{
    if(!isHidden()||!app.classList.contains('image-studio-active'))return;
    for(const dialog of viewers)if(dialog.open&&typeof dialog.close==='function')dialog.close();
  };
  const refresh=()=>{
    const hidden=isHidden();
    button.setAttribute('aria-pressed',String(hidden));
    button.setAttribute('aria-label',hidden?'Show image previews':'Hide image previews');
    button.title=hidden?'Show previews (Discreet Mode)':'Hide previews (Discreet Mode)';
    message.setAttribute('aria-hidden',String(!hidden));
    conceal();
  };
  button.addEventListener('click',()=>{
    const hidden=!isHidden();
    root.classList.toggle(mode,hidden);
    try{localStorage.setItem(key,hidden?'1':'0');}catch{}
    refresh();
  });
  // Asynchronous results never bypass the concealed gallery.
  const observer=new MutationObserver(conceal);
  viewers.forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
  observer.observe(app,{attributes:true,attributeFilter:['class']});
  refresh();
})();
