// Customer video price presentation. This is a credit-pack *equivalent*, not
// a EUR charge or a currency conversion of the provider's USD cost.
// The Worker alone calculates and debits the quoted number of PV credits.
export const STANDARD_PACK_CREDITS = 1000;
export const STANDARD_PACK_EUR = 10;
export function euroEquivalentFromCredits(credits) {
  if (!Number.isSafeInteger(credits) || credits < 0) return null;
  return new Intl.NumberFormat('en-IE', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(credits * STANDARD_PACK_EUR / STANDARD_PACK_CREDITS);
}
export function videoCustomerQuoteLabels(credits) {
  const euro = euroEquivalentFromCredits(credits);
  if (!euro) return null;
  const creditsLabel = credits.toLocaleString('en-GB') + ' PV credits';
  return {
    primary: '≈ ' + euro + ' equivalent',
    detail: creditsLabel + ' reserved. Equivalent based on the €10 / 1,000-credit pack. Other packs and plans have different effective prices; free credits require no new payment.',
    confirm: 'Generate · ' + creditsLabel
  };
}
