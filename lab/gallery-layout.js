// Image history uses the selected responsive card size, preserving proportions.
// Assets and Upscale retain their existing target-height justified rows.
const gallery=document.getElementById('history');
const view=document.getElementById('image-gallery-view');
const sizeKey='pv.lab.imageGallery.cardSize.v1';
const sizes=['small','medium','large'];
let cardSize='medium';
try{const saved=localStorage.getItem(sizeKey);if(sizes.includes(saved))cardSize=saved;}catch{}
let pending=false;
function schedule(){if(!pending){pending=true;requestAnimationFrame(layout);}}
function syncSize(){
  gallery.dataset.cardSize=cardSize;
  view?.querySelectorAll('[data-gallery-size]').forEach(button=>{
    button.setAttribute('aria-pressed',String(button.dataset.gallerySize===cardSize));
  });
  schedule();
}
view?.addEventListener('click',event=>{
  const button=event.target.closest('[data-gallery-size]');
  if(!button||!sizes.includes(button.dataset.gallerySize))return;
  cardSize=button.dataset.gallerySize;
  try{localStorage.setItem(sizeKey,cardSize);}catch{}
  syncSize();view.open=false;
  view.querySelector('summary').focus({preventScroll:true});
});
view?.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&view.open){
    event.preventDefault();view.open=false;view.querySelector('summary').focus({preventScroll:true});
  }
});
if(view)document.addEventListener('pointerdown',event=>{if(!view.contains(event.target))view.open=false;});
function layout(){
  pending=false;
  const native=document.documentElement.classList.contains('pv-native-lab');
  if(view&&(native||!gallery.closest('.image-studio')||document.getElementById('app').classList.contains('pv-moods-discovery-open')))view.open=false;
  const enabled=!native&&!!gallery.closest('.image-studio,#assets-gallery,#app.upscale-studio-active');
  gallery.classList.toggle('justified-gallery',enabled);
  const cards=[...gallery.children];
  if(native){
    // The iPhone gallery is a responsive grid. Old measured inline widths
    // were left aligned, while panoramas must span both columns.
    gallery.classList.add('native-gallery-grid');
    for(const card of cards){
      card.style.removeProperty('width');card.style.removeProperty('height');
      const raw=Number(card.dataset.ratio),ratio=Number.isFinite(raw)&&raw>0?raw:1;
      const wide=ratio>=1.38;
      card.classList.toggle('native-gallery-wide',wide);
      card.style.setProperty('--native-gallery-ratio',String(Math.max(wide?1.38:.74,Math.min(wide?2.35:1.2,ratio))));
    }
    return;
  }
  gallery.classList.remove('native-gallery-grid');
  if(!enabled){for(const card of cards){card.style.removeProperty('width');card.style.removeProperty('height');}return;}
  // Browser zoom can make the real row fractional; clientWidth rounds up and
  // forces the final card onto another flex line. Stay inside the measured row.
  const width=Math.floor(gallery.getBoundingClientRect().width);if(!width)return;
  const counts=width<=740?[3,2,1]:width<=1020?[4,3,2]:[6,4,3];
  const imageColumns=gallery.closest('.image-studio')?counts[sizes.indexOf(cardSize)]:0;
  const gap=2,target=width<640?160:Math.min(320,width/5.8);
  let row=[],sum=0;
  const place=(full)=>{
    const rowHeight=(width-gap*(row.length-1))/sum;
    // A partial last row keeps normal tile widths instead of enlarging its
    // remaining images to fill the screen.
    const partialHeight=imageColumns?((width-gap*(imageColumns-1))/imageColumns)*row.length/sum:target;
    const height=full?rowHeight:Math.min(partialHeight,rowHeight);
    for(const {card,ratio} of row){card.style.width=`${ratio*height}px`;card.style.height=`${height}px`;}
    row=[];sum=0;
  };
  for(const card of cards){
    if(getComputedStyle(card).display==='none')continue;
    const ratio=Number(card.dataset.ratio)||16/9;
    if(imageColumns){
      row.push({card,ratio});sum+=ratio;
      if(row.length===imageColumns)place(true);
      continue;
    }
    // End the row nearest the target height, without stretching a lone portrait.
    if(row.length&&sum*target+gap*(row.length-1)<width&&(sum+ratio)*target+gap*row.length>=width){
      const before=(width-gap*(row.length-1))/sum;
      const after=(width-gap*row.length)/(sum+ratio);
      if(row.length>1&&Math.abs(before-target)<Math.abs(after-target))place(true);
    }
    row.push({card,ratio});sum+=ratio;
    if(sum*target+gap*(row.length-1)>=width)place(true);
  }
  if(row.length)place(false);
}
new ResizeObserver(schedule).observe(gallery);
new MutationObserver(schedule).observe(gallery,{childList:true});
new MutationObserver(schedule).observe(document.getElementById('app'),{attributes:true,attributeFilter:['class']});
new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
// Image decoding never changes geometry. The API supplies stored dimensions.
syncSize();
