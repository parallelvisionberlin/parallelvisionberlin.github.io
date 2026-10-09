// Justified rows preserve media proportions and chronological order.
const gallery=document.getElementById('history');
let pending=false;
function schedule(){if(!pending){pending=true;requestAnimationFrame(layout);}}
function layout(){
  pending=false;
  const enabled=!!gallery.closest('.image-studio,#assets-gallery');
  gallery.classList.toggle('justified-gallery',enabled);
  const cards=[...gallery.children];
  if(!enabled){for(const card of cards){card.style.removeProperty('width');card.style.removeProperty('height');}return;}
  const width=gallery.clientWidth;if(!width)return;
  const gap=2,target=width<640?160:Math.min(320,width/5.8);
  let row=[],sum=0;
  const place=(full)=>{
    const height=full?(width-gap*(row.length-1))/sum:Math.min(target,(width-gap*(row.length-1))/sum);
    for(const {card,ratio} of row){card.style.width=`${ratio*height}px`;card.style.height=`${height}px`;}
    row=[];sum=0;
  };
  for(const card of cards){
    if(getComputedStyle(card).display==='none')continue;
    const img=card.querySelector('.history-media.is-result img');
    const ratio=img?.naturalWidth&&img.naturalHeight?img.naturalWidth/img.naturalHeight:Number(card.dataset.ratio)||16/9;
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
gallery.addEventListener('load',schedule,true);
schedule();
