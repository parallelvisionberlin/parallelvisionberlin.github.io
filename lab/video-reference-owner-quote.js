// Seedance Reference-to-Video quotes include SpicyAPI's 30-second video-input
// reservation. This is a display estimate for the OWNER, not a payable quote
// or a change to the bound provider authorization or PV LAB customer credits.
// The Worker must first have verified the uploaded source-video duration and
// the provider's current maximum against its published rate.
export function seedanceReferenceOwnerEstimate(quote){
  const s=quote?.settings||{};
  if(quote?.provider!=='SpicyAPI'||quote.priceIsEstimate===true||
     s.type!=='video'||s.engine!=='seedance'||s.mode!=='reference'||
     s.model!=='bytedance/seedance-2.5/reference-to-video'||
     s.referenceFixedChargeVersion!=='reference-seconds-v1'||
     !Array.isArray(s.referenceVideoIds)||s.referenceVideoIds.length===0||
     !Number.isInteger(s.referenceBillableVideoSeconds)||
     s.referenceBillableVideoSeconds<2||s.referenceBillableVideoSeconds>30||
     !Number.isInteger(s.duration)||s.duration<4||s.duration>30)return null;
  const maxUsd=Number(quote.maxUsd);
  if(!Number.isFinite(maxUsd)||maxUsd<=0||!Number.isSafeInteger(Math.round(maxUsd*1000000)))return null;
  const maxMicros=Math.round(maxUsd*1000000);
  const billableVideoSeconds=s.referenceBillableVideoSeconds;
  const outputSeconds=s.duration;
  // Spicy holds 30 input seconds plus output; actual input uses verified source.
  const estimatedMicros=Math.ceil(maxMicros*(billableVideoSeconds+outputSeconds)/(30+outputSeconds));
  if(estimatedMicros<=0||estimatedMicros>maxMicros)return null;
  return {
    estimatedUsd:estimatedMicros/1000000,
    maxUsd,
    estimatedReleaseUsd:(maxMicros-estimatedMicros)/1000000,
    billableVideoSeconds,outputSeconds
  };
}
