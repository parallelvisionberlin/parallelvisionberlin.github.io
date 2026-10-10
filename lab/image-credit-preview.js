// Small, pure helpers shared by the customer-only Image price preview.
// This is presentation metadata, NOT authorization to create a paid job.
export function customerImagePriceKey({sessionEpoch,settings,count,images=[],source=null}){
  if(!Number.isInteger(count)||count<1)return '';
  return JSON.stringify({
    sessionEpoch,
    settings,
    count,
    images:images.map(x=>({
      src:x.url||'',
      name:x.file?.name||'',
      size:x.file?.size||0,
      modified:x.file?.lastModified||0,
      role:x.role||'',
      note:x.note||'',
      target:x.target||'',
      width:x.width||0,
      height:x.height||0
    })),
    source:source?{src:source.url||'',name:source.file?.name||'',size:source.file?.size||0,
      width:source.width||0,height:source.height||0}:null
  });
}
export function pricedBoundQuotes(payload,count,expectedProvider){
  const quotes=Array.isArray(payload?.quotes)?payload.quotes:payload?[payload]:[];
  if(quotes.length!==count)throw new Error('Incomplete provider price quote.');
  let credits=0,expiry=Infinity;
  const ids=new Set();
  for(const q of quotes){
    if(!q||q.provider!==expectedProvider||typeof q.id!=='string'||!q.id||
       ids.has(q.id)||!Number.isFinite(q.maxUsd)||q.maxUsd<0||!Number.isSafeInteger(q.creditCost)||q.creditCost<1||
       !Number.isFinite(q.expiresAt)||q.expiresAt<=Date.now()+20000)
      throw new Error('Price quote expired or does not match the selected image request.');
    credits+=q.creditCost;expiry=Math.min(expiry,q.expiresAt);ids.add(q.id);
  }
  return {kind:'bound',credits,count,quotes,expiresAt:expiry};
}
export function imageAutoRatio({values,reference,explicit=false,current='16:9',defaultRatio='16:9'}){
  if(explicit&&values.includes(current))return current;
  const candidate=reference&&Number(reference.width)>0&&Number(reference.height)>0?reference:null;
  if(!candidate)return values.includes(defaultRatio)?defaultRatio:values[0];
  if(values.includes('auto'))return 'auto';
  const target=candidate.width/candidate.height;
  const numeric=values.filter(value=>/^\d+:\d+$/.test(value));
  if(!numeric.length)return values[0];
  return numeric.reduce((best,v)=>{
    const diff=str=>{const [w,h]=str.split(':').map(Number);return Math.abs(Math.log(w/h/target));};
    return diff(v)<diff(best)?v:best;
  },numeric[0]);
}
