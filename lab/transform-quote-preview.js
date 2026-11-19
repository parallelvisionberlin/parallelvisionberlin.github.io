// Presentation-only preview for the documented SpicyAPI 30-second Video Edit hold.
// Never change the bound vendor quote, amount reserved, credit debit or confirmation.
const RATES_USD_PER_SECOND=Object.freeze({'480p':0.204,'720p':0.456,'1080p':1.14});
export function transformVideoEditPreview(quote){
  const p=quote?.settings;
  if(quote?.provider!=='SpicyAPI'||p?.type!=='video'||p.engine!=='seedance'||
     p.mode!=='transform'||p.model!=='bytedance/seedance-2.5/video-edit')return null;
  const rate=RATES_USD_PER_SECOND[p.resolution];
  const duration=Number(p.sourceDurationSeconds),cap=Number(quote.maxUsd);
  if(!rate||!Number.isFinite(duration)||duration<4||duration>30||
     !Number.isFinite(cap)||cap<=0||Math.abs(cap-rate*30)>0.01)return null;
  const seconds=Math.ceil(duration);if(seconds>=30)return null;
  const estimateMicros=Math.round(rate*seconds*1000000);
  return {seconds,estimatedUsd:estimateMicros/1000000,estimatedCredits:Math.max(7,Math.ceil(estimateMicros*160/1000000)),maxUsd:cap};
}
