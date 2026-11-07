/* ALTER Workstation: presentation and native setting adapters only.
   No account, payment, job submission or duplicate comparison engine. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const form=$('beauty-form'),source=$('beauty-photo-preview'),result=$('beauty-result');
 if(!form||!source||!result)return;
 const ids=['exposure','contrast','highlights','shadows','warmth'];
 const refreshAdvanced=()=>{
  for(const key of ids){
   const control=$('beauty-'+key),output=$('beauty-'+key+'-value');
   if(!control||!output)continue;
   const number=Number(control.value);
   output.textContent=key==='exposure'?(number>=0?'+':'')+(number/10).toFixed(1):number>0?'+'+number:String(number);
  }
 };
 for(const key of ids)$('beauty-'+key)?.addEventListener('input',refreshAdvanced);
 // Reset fine adjustments before the existing handler invalidates/refreshes the quote once.
 $('beauty-reset-look')?.addEventListener('click',()=>{
  for(const key of ids){const el=$('beauty-'+key);if(el&&!el.disabled)el.value='0';}
  refreshAdvanced();
 },{capture:true});
 form.addEventListener('reset',()=>queueMicrotask(()=>{refreshAdvanced();syncLayers();syncCompare();}));
 const openTab=id=>{
  const tab=$('beauty-tab-'+id);
  if(!tab)return;
  tab.click();tab.focus({preventScroll:true});
 };
 for(const el of document.querySelectorAll('[data-alter-tab]'))el.addEventListener('click',()=>openTab(el.dataset.alterTab));
 $('alter-choose-look')?.addEventListener('click',()=>openTab('light'));
 $('alter-layer-base')?.addEventListener('click',()=>{if(!$('beauty-photo')?.disabled)$('beauty-photo').click();});
 const base=$('alter-base-image');
 function syncLayers(){
  const look=document.querySelector('.beauty-looks-list [data-look][aria-pressed="true"]');
  const light=$('beauty-light');
  const strength=$('beauty-strength');
  const currentLabel=look?.querySelector('.beauty-look-copy strong')?.textContent?.trim();
  $('alter-look-summary').textContent=currentLabel?currentLabel+' · '+strength.value:'Look intensity · '+strength.value;
  const skin=$('beauty-skin');
  $('alter-skin-summary').textContent='Skin · '+(skin?.selectedOptions?.[0]?.textContent||'Natural');
  const url=!source.hidden?source.getAttribute('src'):'';
  const valid=!!url&&url.startsWith('blob:');
  if(valid){if(base.getAttribute('src')!==url)base.src=url;base.hidden=false;}
  else {base.hidden=true;base.removeAttribute('src');}
  $('alter-base-summary').textContent=valid?'Source photograph':'Add your photograph';
  const active=document.querySelector('[data-beauty-tab][aria-selected="true"]')?.dataset.beautyTab;
  $('alter-layer-look').classList.toggle('is-active',active&&active!=='skin');
  $('alter-layer-skin').classList.toggle('is-active',active==='skin');
 }
 const layersObserver=new MutationObserver(syncLayers);
 layersObserver.observe(source,{attributes:true,attributeFilter:['src','hidden']});
 for(const b of document.querySelectorAll('.beauty-looks-list [data-look]'))
  layersObserver.observe(b,{attributes:true,attributeFilter:['aria-pressed']});
 for(const b of document.querySelectorAll('[data-beauty-tab]'))
  layersObserver.observe(b,{attributes:true,attributeFilter:['aria-selected']});
 for(const id of ['beauty-skin','beauty-strength']){
  const el=$(id);el?.addEventListener('change',syncLayers);el?.addEventListener('input',syncLayers);
 }
 const top=$('alter-compare-top'),bottom=$('alter-compare-bottom'),resultImage=$('beauty-result-image');
 const slider=result.querySelector('.beauty-compare-handle');
 const allViewButtons=[...result.querySelectorAll('[data-alter-view]')];
 const currentSplit=()=>{
  const v=parseFloat(result.style.getPropertyValue('--beauty-split'));
  return Number.isFinite(v)?v:50;
 };
 const syncCompareButtons=()=>{
  const value=currentSplit();
  const name=value>=99?'before':value<=1?'after':'compare';
  for(const b of allViewButtons)b.setAttribute('aria-pressed',String(b.dataset.alterView===name));
 };
 function syncCompare(){
  // Never display before/after controls until the backend provides an actual
  // completed output AND its own matching source. No illustrative fake results.
  const valid=!result.hidden&&!!result.dataset.beforeUrl&&result.dataset.beforeUrl.startsWith('blob:')&&!!resultImage.getAttribute('src');
  top.hidden=bottom.hidden=!valid;
  if(valid)syncCompareButtons();
 }
 for(const b of allViewButtons)b.addEventListener('click',()=>{
  if(result.hidden||!result.dataset.beforeUrl)return;
  const split=b.dataset.alterView==='before'?100:b.dataset.alterView==='after'?0:50;
  result.style.setProperty('--beauty-split',split+'%');
  slider?.setAttribute('aria-valuenow',String(split));
  syncCompareButtons();
 });
 new MutationObserver(syncCompare).observe(result,{attributes:true,attributeFilter:['hidden','data-before-url','style']});
 new MutationObserver(syncCompare).observe(resultImage,{attributes:true,attributeFilter:['src']});
 slider?.addEventListener('pointerup',syncCompareButtons);
 slider?.addEventListener('keyup',syncCompareButtons);
 refreshAdvanced();syncLayers();syncCompare();
})();
