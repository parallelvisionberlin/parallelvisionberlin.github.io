// Indicative display only. Checkout and credit fulfillment remain EUR-authoritative.
const ECB='https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const DAY=86400000;
const markets={
  BR:['BRL','pt-BR'],MX:['MXN','es-MX'],US:['USD','en-US'],CA:['CAD','en-CA'],
  GB:['GBP','en-GB'],CH:['CHF','de-CH'],PL:['PLN','pl-PL'],CZ:['CZK','cs-CZ'],
  RO:['RON','ro-RO'],HU:['HUF','hu-HU'],SE:['SEK','sv-SE'],NO:['NOK','nb-NO'],
  DK:['DKK','da-DK'],IS:['ISK','is-IS'],TR:['TRY','tr-TR'],AU:['AUD','en-AU'],
  NZ:['NZD','en-NZ'],JP:['JPY','ja-JP'],KR:['KRW','ko-KR'],IN:['INR','en-IN'],
  ID:['IDR','id-ID'],MY:['MYR','ms-MY'],PH:['PHP','en-PH'],SG:['SGD','en-SG'],
  TH:['THB','th-TH'],ZA:['ZAR','en-ZA'],IL:['ILS','he-IL']
};
let cached=null,pending=null,retryAfter=0;
export function parseRates(xml,time=Date.now()){
  const date=xml.match(/<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]/i)?.[1];
  const age=time-Date.parse(date+'T00:00:00Z');
  if(!date||!Number.isFinite(age)||new Date(time-age).toISOString().slice(0,10)!==date||age<0||age>7*DAY)throw Error('Exchange rates unavailable.');
  const rates={};
  for(const match of xml.matchAll(/<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g)){
    const rate=Number(match[2]);
    if(Number.isFinite(rate)&&rate>0&&rate<1000000)rates[match[1]]=rate;
  }
  if(!rates.USD||!rates.BRL||!rates.MXN)throw Error('Incomplete exchange rates.');
  return {date,rates};
}
async function exchangeRates(){
  if(cached&&Date.now()-cached.loadedAt<3600000)return cached;
  if(Date.now()<retryAfter)throw Error('Exchange rates unavailable.');
  if(!pending)pending=(async()=>{
    const response=await fetch(ECB,{redirect:'error',signal:AbortSignal.timeout(3500),cf:{cacheTtl:3600,cacheEverything:true}});
    if(!response.ok)throw Error('Exchange rates unavailable.');
    const xml=await response.text();
    if(xml.length>25000)throw Error('Invalid exchange rates.');
    cached={...parseRates(xml),loadedAt:Date.now()};return cached;
  })().catch(error=>{retryAfter=Date.now()+60000;throw error;}).finally(()=>{pending=null;});
  return pending;
}
export async function localCurrency(request,{getRates=exchangeRates}={}){
  // Cloudflare supplies country at the edge. Ignore browser headers/query overrides.
  const market=markets[String(request.cf?.country||'').toUpperCase()];
  let data={currency:'EUR',locale:'en-IE',rate:1,approximate:false};
  if(market)try{
    const {rates,date}=await getRates(),rate=rates[market[0]];
    if(Number.isFinite(rate)&&rate>0)data={currency:market[0],locale:market[1],rate,rateDate:date,approximate:true};
  }catch{/* Leave the real EUR catalog visible when fresh rates cannot be verified. */}
  return Response.json(data,{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
