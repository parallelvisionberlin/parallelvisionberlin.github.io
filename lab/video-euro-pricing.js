// Customer creation uses PV credits. Euro prices belong in billing and pricing.
// The Worker alone calculates and debits the quoted number of PV credits.
export function videoCustomerQuoteLabels(credits) {
  if (!Number.isSafeInteger(credits) || credits < 0) return null;
  const creditsLabel = credits.toLocaleString('en-GB') + ' PV credits';
  return {
    primary: creditsLabel,
    detail: 'Reserved from your balance when you confirm.',
    confirm: 'Generate · ' + creditsLabel
  };
}

// Only the server quote supplies credits; reject prices for different settings.
export function videoCreditPreview(q,selected){
  if(!q?.id||q.settings?.type!=='video'||
     ['engine','mode','duration','resolution','audio','prompt'].some(key=>q.settings[key]!==selected[key])||
     !Number.isSafeInteger(q.creditCost)||q.creditCost<1)
    throw new Error('Could not verify the video credit price.');
  return {credits:q.creditCost,expiresAt:q.expiresAt,quote:q,estimated:q.priceIsEstimate===true};
}
