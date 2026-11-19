// Video Edit quotes a 30-second worst-case hold because the supplier measures source length after acceptance.
// This estimate is explanatory only. The provider maxCharge remains the binding authorization amount.
export const SEEDANCE_EDIT_MAX_SECONDS=30;
export function transformEditQuoteEstimate(quote){
  const s=quote?.settings||{};
  if(quote?.provider!=='SpicyAPI'||s.provider!=='spicy'||s.engine!=='seedance'||
    s.mode!=='transform'||s.model!=='bytedance/seedance-2.5/video-edit')return null;
  const duration=Number(s.sourceDurationSeconds),maximum=Number(quote.maxUsd);
  if(!Number.isFinite(duration)||duration<4||duration>SEEDANCE_EDIT_MAX_SECONDS||
     !Number.isFinite(maximum)||maximum<=0)return null;
  const billedSeconds=Math.ceil(duration);
  const estimatedMicros=Math.round(Math.round(maximum*1000000)*billedSeconds/SEEDANCE_EDIT_MAX_SECONDS);
  const estimatedUsd=estimatedMicros/1000000;
  return {billedSeconds,estimatedUsd,maxUsd:maximum,
    estimatedCredits:Math.max(7,Math.ceil(estimatedMicros*160/1000000)),
    creditHold:Number.isSafeInteger(quote.creditCost)?quote.creditCost:null};
}
