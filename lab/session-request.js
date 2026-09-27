// Short-lived Clerk tokens are renewed, never extended or accepted without server verification.
// This module does not persist tokens, modify the editor, or change owner authorization.
const AUTH_ERRORS = new Set([
  'Sign in with your Parallel Vision owner account.',
  'Invalid sign-in token.',
  'Sign-in expired or invalid. Please sign in again.',
  'Unknown sign-in key.',
  'Invalid sign-in signature.'
]);

export class LabSignInError extends Error {
  constructor() {
    super('Your sign-in could not be renewed. Sign in again, then review the price before generating.');
    this.name = 'LabSignInError';
    this.code = 'LAB_SIGN_IN_REQUIRED';
  }
}

function nearExpiry(token, now) {
  // Decoding is a freshness hint only. The Worker still verifies every signature and claim.
  try {
    const part = token.split('.')[1];
    const claims = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')
      .padEnd(Math.ceil(part.length / 4) * 4, '=')));
    return !Number.isFinite(claims.exp) || claims.exp * 1000 - now < 20000;
  } catch { return true; }
}

async function waitWithAbort(promise, signal) {
  if (!signal) return promise;
  signal.throwIfAborted();
  let cancel;
  const aborted = new Promise((_, reject) => {
    cancel = () => reject(signal.reason || new DOMException('Request aborted.', 'AbortError'));
    signal.addEventListener('abort', cancel, { once: true });
  });
  try { return await Promise.race([promise, aborted]); }
  finally { signal.removeEventListener('abort', cancel); }
}

export function createSessionRequest({ baseUrl, getSession, fetchImpl = globalThis.fetch, clock = Date.now }) {
  const base = new URL(baseUrl);
  const pendingRefreshes = new WeakMap();
  const recentRefreshes = new WeakMap();

  async function refresh(session, rejectedToken) {
    const recent = recentRefreshes.get(session);
    // Concurrent History thumbnails may all arrive with the same old token.
    if (recent && recent.previous === rejectedToken && clock() - recent.at < 10000 &&
        recent.token !== rejectedToken && !nearExpiry(recent.token, clock())) return recent.token;
    const pending = pendingRefreshes.get(session);
    if (pending) return pending;
    const promise = Promise.resolve().then(async () => {
      const token = await session.getToken({ skipCache: true });
      if (typeof token !== 'string' || !token) throw new LabSignInError();
      recentRefreshes.set(session, { previous: rejectedToken, token, at: clock() });
      return token;
    });
    pendingRefreshes.set(session, promise);
    try { return await promise; }
    finally { if (pendingRefreshes.get(session) === promise) pendingRefreshes.delete(session); }
  }

  return async function sessionRequest(path, init = {}, assertCurrent = () => {}) {
    const url = new URL(path, base);
    if (url.origin !== base.origin || !url.pathname.startsWith('/api/') || url.username || url.password)
      throw new Error('Invalid private API destination.');
    init.signal?.throwIfAborted();
    assertCurrent();
    const session = getSession();
    if (!session || typeof session.getToken !== 'function') throw new LabSignInError();
    const sessionId = session.id;
    function checkSession() {
      init.signal?.throwIfAborted();
      assertCurrent();
      const current = getSession();
      if (!current || (sessionId ? current.id !== sessionId : current !== session))
        throw new Error('Session changed. The request was stopped.');
    }
    let token = await waitWithAbort(Promise.resolve().then(() => session.getToken()), init.signal);
    checkSession();
    if (typeof token !== 'string' || !token) throw new LabSignInError();
    if (nearExpiry(token, clock())) {
      token = await waitWithAbort(refresh(session, token), init.signal);
      checkSession();
    }
    const send = async currentToken => {
      checkSession();
      const headers = new Headers(init.headers);
      headers.set('Authorization', 'Bearer ' + currentToken);
      const response = await fetchImpl(url.href, { ...init, headers, redirect: 'error' });
      checkSession();
      return response;
    };
    let response = await send(token);
    if (response.status !== 401) return response;
    const data = await response.clone().json().catch(() => ({}));
    checkSession();
    // Only these Lab authentication responses occur BEFORE route handling and paid submission.
    // Do not replay timeouts, network errors, 5xx, 403, or unrelated provider responses.
    if (!AUTH_ERRORS.has(data.error)) return response;
    if (typeof ReadableStream !== 'undefined' && init.body instanceof ReadableStream)
      throw new LabSignInError();
    await response.body?.cancel();
    token = await waitWithAbort(refresh(session, token), init.signal);
    checkSession();
    response = await send(token); // At most one replay, with the same body and quote identifier.
    if (response.status === 401) {
      await response.body?.cancel();
      throw new LabSignInError();
    }
    return response;
  };
}
