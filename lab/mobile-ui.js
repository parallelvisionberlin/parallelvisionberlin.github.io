// This layout is only enabled by the native app, never by a public query string.
import {isNativeLab} from './native-account.js?v=1';
export function initLabMobileUI(){
  if(!isNativeLab()||document.documentElement.classList.contains('pv-native-lab'))return;
  document.documentElement.classList.add('pv-native-lab');
  const css=document.createElement('link');css.rel='stylesheet';css.href='./mobile-app.css?v=1';document.head.append(css);
  const $=id=>document.getElementById(id),send=(type,extra={})=>window.ReactNativeWebView.postMessage(JSON.stringify({type,...extra}));
  const composer=$('image-composer');
  if(composer){
    const intro=document.createElement('div');intro.className='mobile-create-intro';
    intro.innerHTML='<span>PV LAB / MOODS</span><h1>Your photo.<br>A different world.</h1>';
    const photo=document.createElement('section');photo.className='mobile-photo';photo.setAttribute('aria-label','Your source photograph');
    const add=document.createElement('button');add.type='button';add.className='mobile-add-photo';add.id='mobile-add-photo';
    add.innerHTML='<span aria-hidden="true">＋</span><strong>Add your photo</strong><small>JPG, PNG or WebP · up to 10 MB</small>';
    add.onclick=()=>{const button=$('image-composer-add');if(!button.disabled)button.click();};
    photo.append(add,$('image-composer-references'));
    composer.prepend(intro,photo);
    const advanced=document.createElement('button');advanced.type='button';advanced.className='mobile-advanced';advanced.id='mobile-advanced';advanced.textContent='More controls';advanced.setAttribute('aria-expanded','false');
    advanced.onclick=()=>{const open=composer.classList.toggle('mobile-show-advanced');advanced.setAttribute('aria-expanded',String(open));advanced.textContent=open?'Fewer controls':'More controls';};
    composer.insertBefore(advanced,composer.querySelector('.image-composer-toolbar'));
    $('image-composer-prompt').placeholder='Anything else? Add a direction (optional)';
    const grid=$('composer-moods-grid'),moods=$('composer-moods');
    // The inline selector stays logically closed, so its modal focus trap and
    // outside-click handler never swallow an upload or generation tap.
    const sync=()=>{
      photo.classList.toggle('has-photo',!!$('image-composer-references')?.querySelector('img'));
      if(add.disabled!==$('image-composer-add').disabled)add.disabled=$('image-composer-add').disabled;
      const assets=$('app').classList.contains('assets-active');
      document.documentElement.classList.toggle('mobile-gallery',assets);
    };
    new MutationObserver(sync).observe($('app'),{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','disabled']});sync();
    if(grid&&moods)moods.removeAttribute('role');
  }
  document.addEventListener('click',async event=>{
    const a=event.target.closest('a[download]');
    if(!a||!a.href.startsWith('blob:'))return;
    event.preventDefault();
    try{
      const blob=await fetch(a.href).then(r=>r.blob());
      if(!/^image\/(png|jpeg|webp)$/.test(blob.type)||blob.size>25*1024*1024)throw Error('Use the web studio to download this file.');
      const reader=new FileReader();reader.onload=()=>send('PV_LAB_SHARE',{data:String(reader.result),filename:a.download||'pv-lab-image'});reader.readAsDataURL(blob);
    }catch(error){send('PV_LAB_NOTICE',{message:error.message});}
  },true);
  if(!composer)send('PV_LAB_READY');
}
