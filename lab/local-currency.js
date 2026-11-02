// Shared by homepage, Studio pricing and account. Never sends prices to checkout.
const endpoint='https://parallel-vision-lab.parallelvision.workers.dev/api/public/local-currency';
let loading;
export function loadLocalCurrency(){
  if(!loading)loading=fetch(endpoint,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(4500)})
    .then(response=>response.ok?response.json():null)
    .then(value=>value&&/^[A-Z]{3}$/.test(value.currency)&&Number.isFinite(value.rate)&&value.rate>0&&value.rate<1000000&&value.approximate===true?value:null)
    .catch(()=>null);
  return loading;
}
function format(value,local){
  return '≈ '+new Intl.NumberFormat(local.locale,{style:'currency',currency:local.currency,maximumFractionDigits:2}).format(value*local.rate);
}
function style(){
  if(document.querySelector('link[data-local-currency-style]'))return;
  const link=document.createElement('link');link.rel='stylesheet';link.dataset.localCurrencyStyle='';
  link.href=new URL('./local-currency.css?v=20261102-1',import.meta.url).href;document.head.append(link);
}
export async function localizePrices(root=document){
  const local=await loadLocalCurrency();
  if(!local||local.currency==='EUR'||!root.isConnected&&root!==document)return;
  style();
  let changed=false;
  for(const element of root.querySelectorAll('[data-price-eur]')){
    const euros=Number(element.dataset.priceEur);
    if(!Number.isFinite(euros)||euros<=0||element.dataset.localCurrency===local.currency)continue;
    const text=element.firstChild;
    if(!text||text.nodeType!==Node.TEXT_NODE)continue;
    // Keep monthly suffixes and the original EUR amount; avoid changing any purchase handlers.
    const original=text.textContent.trim();
    text.textContent=format(euros,local)+(element.dataset.priceSuffix||'')+' ';
    const base=document.createElement('small');base.className='lab-price-base';base.textContent=original;
    element.append(base);element.dataset.localCurrency=local.currency;changed=true;
  }
  if(changed&&!root.querySelector('.lab-local-currency-note')){
    const note=document.createElement('p');note.className='lab-local-currency-note';
    note.textContent='Local prices are estimates. Your final amount and currency are confirmed at checkout.';
    (root.querySelector('.lab-pricing-footnote')||root.querySelector('#account-checkout-state')?.parentElement||root).append(note);
  }
}
const pricing=document.querySelector('#pricing');
if(pricing)void localizePrices(pricing);
