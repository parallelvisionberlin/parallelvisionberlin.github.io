// Model-policy visibility is a presentation preference only.
// Scoped to the signed-in Clerk user in this browser. Never changes provider policy,
// moderation, generation parameters, model access or payments.
export const MODEL_POLICY_STORAGE_PREFIX = 'pv-lab-model-policy-details-v1:';
export function readProviderPolicyDetails(userId) {
  if (!userId || typeof localStorage === 'undefined') return false;
  try { return localStorage.getItem(MODEL_POLICY_STORAGE_PREFIX + userId) === '1'; }
  catch { return false; }
}
export function setProviderPolicyDetails(userId, enabled) {
  if (!userId || typeof localStorage === 'undefined') return false;
  try {
    if (enabled) localStorage.setItem(MODEL_POLICY_STORAGE_PREFIX + userId, '1');
    else localStorage.removeItem(MODEL_POLICY_STORAGE_PREFIX + userId);
    return true;
  } catch { return false; }
}
