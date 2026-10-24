// Responsive presentation only. Generation, quotes and original control values stay untouched.
(() => {
  const setup=()=>{
    const composer=document.getElementById('image-composer');
    const button=document.getElementById('image-composer-mobile-more');
    if(!composer||!button||document.documentElement.classList.contains('pv-native-lab'))return;
    composer.classList.add('mobile-polish-ready');
    const label=button.querySelector('span');
    button.addEventListener('click',()=>{
      const expanded=button.getAttribute('aria-expanded')!=='true';
      button.setAttribute('aria-expanded',String(expanded));
      composer.dataset.mobileSettings=expanded?'open':'closed';
      if(label)label.textContent=expanded?'Less':'More';
      button.setAttribute('aria-label',expanded?'Hide secondary image settings':'Show more image settings');
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();

// Public Image uses the same phone disclosure without entering the private Studio.
(() => {
  const setup=()=>{
    const composer=document.getElementById('pv-guest-composer');
    const button=document.getElementById('pv-guest-mobile-more');
    if(!composer||!button||document.documentElement.classList.contains('pv-native-lab'))return;
    button.addEventListener('click',()=>{
      const expanded=button.getAttribute('aria-expanded')!=='true';
      button.setAttribute('aria-expanded',String(expanded));
      button.setAttribute('aria-label',expanded?'Hide secondary image settings':'Show more image settings');
      composer.dataset.mobileSettings=expanded?'open':'closed';
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
