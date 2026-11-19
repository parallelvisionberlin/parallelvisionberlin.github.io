// SpicyAPI can return settled: true with cost null/empty, or a USD amount
// carrying more than six fractional decimal digits. A missing/unusable
// settlement must not block retrieving an already-paid video output.
// Never guess a bill when the provider has not returned a usable amount.
export function settledProviderCostMicros(value){
  if(value===null||value===undefined||value==='')return null;
  if(typeof value!=='number'&&typeof value!=='string')return null;
  const raw=String(value).trim();
  if(!/^\d{1,6}(?:\.\d{1,20})?(?:e[+-]?\d{1,2})?$/i.test(raw))return null;
  const dollars=Number(raw);
  if(!Number.isFinite(dollars)||dollars<0||dollars>999999)return null;
  const micros=Math.round(dollars*1000000);
  return Number.isSafeInteger(micros)&&micros>=0?micros:null;
}
