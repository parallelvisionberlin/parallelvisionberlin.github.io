// App-only identity adapter. The worker validates every credential and owns access,
// credit balances and memory. No token is put in a URL, cookie or persistent store.
export const BRIDGE_REVISION = 'BRIDGE 01';
const WORKER = 'https://parallel-vision-anam-token.parallelvision.workers.dev';
const SITE = 'https://parallelvisionlabel.com';
const AUTH_TIMEOUT = 12000;

export function installNativeIdentity(win = window) {
  if (win.location.origin !== SITE || win.location.pathname !== '/nina-app.html' ||
      win.top !== win || typeof win.ReactNativeWebView?.postMessage !== 'function') {
    throw new Error('Open this live signal from the Parallel Vision app.');
  }
  const pageId = win.crypto.randomUUID();
  const pending = new Map();
  let cached = null;
  let inflight = null;
  let identity = null;
  let stopped = false;
  win.__PV_NINA_PAGE_ID__ = pageId;
  const send = (type, extra = {}) => win.ReactNativeWebView.postMessage(JSON.stringify({ type, pageId, ...extra }));
  win.__PV_NINA_TOKEN_REPLY__ = data => {
    if (!data || data.pageId !== pageId) return;
    const entry = pending.get(data.id);
    if (!entry) return;
    pending.delete(data.id);
    win.clearTimeout(entry.timer);
    if (data.error || typeof data.token !== 'string' || data.token.length > 8192) {
      entry.reject(new Error(data.error === 'signed_out'
        ? 'Your app session has ended. Return to Profile to sign in.'
        : 'Your app session could not be refreshed. Retry the signal.'));
    } else entry.resolve(data.token);
  };
  function claims(token) {
    // Used only for cache expiry and account isolation, never authorization.
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(win.atob(payload));
    } catch { throw new Error('The app returned an unreadable session. Return to Profile.'); }
  }
  async function getToken(options = {}) {
    if (stopped) throw new Error('This signal has closed.');
    if (!options.skipCache && cached && cached.until > Date.now()) return cached.token;
    if (inflight) return inflight;
    inflight = new Promise((resolve, reject) => {
      const id = win.crypto.randomUUID();
      const timer = win.setTimeout(() => {
        pending.delete(id);
        reject(new Error('The app did not answer the session request. Check that BRIDGE 01 is installed.'));
      }, AUTH_TIMEOUT);
      pending.set(id, { resolve, reject, timer });
      try { send('PV_NINA_TOKEN_REQUEST', { id, force: options.skipCache === true }); }
      catch (error) { win.clearTimeout(timer); pending.delete(id); reject(error); }
    }).then(token => {
      const value = claims(token);
      if (typeof value.sub !== 'string' || !value.sub || !Number.isFinite(value.exp) || value.exp * 1000 <= Date.now()) {
        throw new Error('The app session has expired. Retry to refresh it.');
      }
      if (identity && identity.user.id !== value.sub) throw new Error('The account changed. Close this signal and reopen Nina.');
      cached = { token, until: Math.min(Date.now() + 15000, value.exp * 1000 - 5000) };
      return token;
    }).finally(() => { inflight = null; });
    return inflight;
  }
  async function account(force = false) {
    const token = await getToken({ skipCache: force });
    const controller = new AbortController();
    const timer = win.setTimeout(() => controller.abort(), AUTH_TIMEOUT);
    let response;
    try {
      response = await win.fetch(`${WORKER}/api/account`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        cache: 'no-store', credentials: 'omit', signal: controller.signal,
      });
    } finally { win.clearTimeout(timer); }
    if (response.status === 401 && !force) { cached = null; return account(true); }
    if (!response.ok) throw new Error(response.status === 401
      ? 'The server could not verify your app session. Return to Profile or retry.'
      : `Account verification is unavailable (HTTP ${response.status}). Retry shortly.`);
    const data = await response.json();
    if (!data || typeof data.displayName !== 'string') throw new Error('The account service returned an incomplete response.');
    return { data, sub: claims(token).sub };
  }
  async function initialize() {
    if (identity) return identity;
    const { data, sub } = await account();
    const user = {
      id: sub, fullName: data.displayName, firstName: data.displayName,
      unsafeMetadata: {}, primaryEmailAddress: null,
      // This flag is cosmetic only; server balance/usage remains authoritative.
      updateMetadata: async ({ unsafeMetadata }) => { Object.assign(user.unsafeMetadata, unsafeMetadata); return user; },
      update: async input => user.updateMetadata(input),
      reload: async () => { const result = await account(); user.fullName = result.data.displayName; return user; },
    };
    identity = {
      isSignedIn: true, user, session: { user, getToken },
      openSignIn: async () => send('PV_NINA_SHOW_PROFILE'),
      openSignUp: async () => send('PV_NINA_SHOW_PROFILE'),
      closeSignIn() {}, closeSignUp() {},
    };
    // Do not mix device-local transcript caches when different accounts use the app.
    const key = `pv_app_visitor:${sub}`;
    try {
      let visitor = win.localStorage.getItem(key);
      if (!/^[0-9a-f-]{36}$/i.test(visitor || '')) {
        visitor = win.crypto.randomUUID(); win.localStorage.setItem(key, visitor);
      }
      win.localStorage.setItem('nina_fok_visitor_id_v1', visitor);
    } catch { /* Server memory still uses the verified user, not local storage. */ }
    return identity;
  }
  function dispose() {
    stopped = true; cached = null;
    for (const entry of pending.values()) { win.clearTimeout(entry.timer); entry.reject(new Error('Signal closed.')); }
    pending.clear();
    delete win.__PV_NINA_TOKEN_REPLY__;
  }
  return { initialize, getToken, send, dispose, pageId };
}
