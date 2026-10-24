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
