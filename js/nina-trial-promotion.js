// Cosmetic account preference only. Never used for credit grants or access checks.
export function createNinaTrialPromotion({ doc = document, storage, events = window } = {}) {
  if (!storage) { try { storage = globalThis.localStorage; } catch {} }
  const key = 'pv_nina_connected:';
  const field = 'ninaHasConnected';
  const pending = new Map();
  const connectedUsers = new Set();
  let user = null;
  let resolved = false;
  let checkedUser = '';
  const cached = id => {
    try { return storage.getItem(key + id) === '1'; } catch { return false; }
  };
  const hasConnected = account => Boolean(account && (
    account.unsafeMetadata?.[field] === true || connectedUsers.has(account.id) || cached(account.id)
  ));
  function render() {
    const show = resolved && (!user || (checkedUser === user.id && !hasConnected(user)));
    doc.querySelectorAll('[data-nina-trial-offer]').forEach(node => { node.hidden = !show; });
  }
  function persist(account) {
    if (!account?.id || account.unsafeMetadata?.[field] === true || pending.has(account.id)) return;
    // updateMetadata merges keys; fallback supports earlier Clerk 6 releases.
    const write = typeof account.updateMetadata === 'function'
      ? () => account.updateMetadata({ unsafeMetadata: { [field]: true } })
      : () => account.update({ unsafeMetadata: { ...account.unsafeMetadata, [field]: true } });
    const promise = Promise.resolve().then(write).catch(() => {
      // Account-keyed local state retains this observation for retry on the next visit.
    }).finally(() => { pending.delete(account.id); });
    pending.set(account.id, promise);
  }
  function connected(account) {
    if (!account?.id) return;
    connectedUsers.add(account.id);
    try { storage.setItem(key + account.id, '1'); } catch {}
    render();
    persist(account);
  }
  function setUser(account) {
    if (user?.id !== account?.id) checkedUser = '';
    user = account;
    resolved = true;
    render();
    if (hasConnected(account)) persist(account);
  }
  function observeUsage(account, balance) {
    if (!account?.id || account.id !== user?.id) return;
    checkedUser = account.id;
    // Existing charged sessions predate this display preference.
    if (Number(balance?.lifetimeDebited) > 0) connected(account);
    render();
  }
  events.addEventListener('storage', event => {
    if (user && event.key === key + user.id) render();
  });
  // Purchase information is inserted lazily and can be translated after sign-in.
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(render).observe(doc.body, { childList: true, subtree: true });
  }
  return { setUser, connected, observeUsage, render };
}
