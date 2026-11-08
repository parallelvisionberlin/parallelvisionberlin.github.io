// UI-only feedback. Never starts a request or paints a predicted selection.
export function createSelectionFeedback({holder,stage}){
  if(!holder||!stage)throw Error('Selection feedback needs an image holder and stage.');
  if(!document.getElementById('pv-selection-feedback-style')){
    const style=document.createElement('style');style.id='pv-selection-feedback-style';
    style.textContent=`
      .pv-selection-feedback[hidden],.pv-selection-click-ring[hidden]{display:none!important}
      .pv-selection-feedback{position:absolute;z-index:9;top:14px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:9px;max-width:calc(100% - 28px);box-sizing:border-box;padding:9px 13px;border:1px solid #ffffff26;border-radius:8px;background:#141416ed;color:#f4f1f5;font:550 12px/1.4 inherit;pointer-events:none;box-shadow:0 3px 18px #0003}
      .pv-selection-feedback>i{width:13px;height:13px;flex:0 0 13px;border:1.5px solid #ffffff40;border-top-color:#e1d4f1;border-radius:50%;animation:pv-selection-spin .85s linear infinite}
      .pv-selection-feedback.is-error{border-color:#c6a5a56b}
      .pv-selection-feedback.is-error>i{display:none}
      .pv-selection-click-ring{position:absolute;z-index:8;width:28px;height:28px;box-sizing:border-box;border:1.5px solid #e1d4f1;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 0 4px #e1d4f11f;pointer-events:none;animation:pv-selection-pulse 1.15s ease-in-out infinite}
      #precision-source-holder[aria-busy=true] .viewer-selection-guide{display:none!important}
      @keyframes pv-selection-spin{to{transform:rotate(360deg)}}
      @keyframes pv-selection-pulse{50%{opacity:.55;box-shadow:0 0 0 9px #e1d4f100}}
      @media(prefers-reduced-motion:reduce){.pv-selection-feedback>i,.pv-selection-click-ring{animation:none}}
    `;
    document.head.append(style);
  }
  const badge=document.createElement('div');badge.className='pv-selection-feedback';badge.hidden=true;
  badge.setAttribute('role','status');badge.setAttribute('aria-live','polite');badge.setAttribute('aria-atomic','true');
  const spinner=document.createElement('i');spinner.setAttribute('aria-hidden','true');
  const label=document.createElement('span');badge.append(spinner,label);holder.append(badge);
  const ring=document.createElement('span');ring.className='pv-selection-click-ring';ring.hidden=true;ring.setAttribute('aria-hidden','true');stage.append(ring);
  let timer=null;
  function clear(){clearTimeout(timer);timer=null;badge.hidden=ring.hidden=true;holder.removeAttribute('aria-busy');}
  function start({point=null,width=1,height=1,message='Selecting…'}={}){
    clear();badge.classList.remove('is-error');label.textContent=message;badge.hidden=false;holder.setAttribute('aria-busy','true');
    if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&width>0&&height>0){
      ring.style.left=Math.max(0,Math.min(100,point.x/width*100))+'%';ring.style.top=Math.max(0,Math.min(100,point.y/height*100))+'%';ring.hidden=false;
    }
  }
  function error(message='Selection not found. Use Brush to refine the area.'){
    clear();badge.classList.add('is-error');label.textContent=message;badge.hidden=false;timer=setTimeout(clear,5000);
  }
  return {start,clear,error};
}
