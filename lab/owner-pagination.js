// Compact Owner table pagination. No external dependencies or customer data storage.
export function renderOwnerPagination(root,{page=1,pageSize=20,total=0,onPage}={}){
  root.replaceChildren();
  const count=Number.isSafeInteger(Number(total))?Math.max(0,Number(total)):0;
  const size=Number.isSafeInteger(Number(pageSize))?Math.max(1,Number(pageSize)):20;
  const pages=Math.max(1,Math.ceil(count/size));
  const current=Math.min(Math.max(1,Number(page)||1),pages);
  const from=count?(current-1)*size+1:0,to=Math.min(current*size,count);
  const summary=document.createElement('span');
  summary.className='owner-pagination-summary';
  summary.textContent=count?'Showing '+from+'–'+to+' of '+count.toLocaleString('en-GB'):'No accounts';
  root.append(summary);
  if(pages===1)return;
  const nav=document.createElement('nav');
  nav.className='owner-pagination-pages';nav.setAttribute('aria-label','Pages');
  function add(label,target,disabled=false,active=false){
    const button=document.createElement('button');
    button.type='button';button.textContent=label;
    button.disabled=disabled;button.className='owner-pagination-button';
    if(active)button.setAttribute('aria-current','page');
    button.setAttribute('aria-label',typeof target==='number'&&/^\\d+$/.test(label)?'Page '+target:label);
    button.addEventListener('click',()=>{if(!button.disabled)onPage(target);});
    nav.append(button);
  }
  add('Previous',current-1,current===1);
  const start=Math.max(1,Math.min(current-2,pages-4));
  const end=Math.min(pages,start+4);
  for(let p=start;p<=end;p++)add(String(p),p,p===current,p===current);
  add('Next',current+1,current===pages);
  root.append(nav);
}
