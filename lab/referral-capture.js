// Preserve an invitation across Clerk sign-in redirects and Lab page navigation.
// Only an 8-character referral code is stored, never an auth token or user data.
const KEY = 'pv-lab-referral-v1';
const PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;
export function captureReferralCode(search = location.search, storage = sessionStorage) {
  const raw = new URLSearchParams(search).get('ref');
  const code = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (!PATTERN.test(code)) return '';
  try { storage.setItem(KEY, code); } catch {}
  return code;
}
export async function claimReferral(sendClaim, storage = sessionStorage) {
  let code;
  try { code = storage.getItem(KEY); } catch { return false; }
  if (!PATTERN.test(code || '')) return false;
  try {
    await sendClaim(code);
    storage.removeItem(KEY);
    return true;
  } catch (error) {
    // Invalid/expired/self referrals are final. Network and service errors
    // keep the invite in this browser session for a safe retry.
    if (/referral code not found|cannot refer yourself|only when first joining|before your first purchase|invalid referral/i.test(error?.message || '')) {
      try { storage.removeItem(KEY); } catch {}
    }
    return false;
  }
}
