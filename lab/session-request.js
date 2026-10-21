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

// The studio is the destination, not a second signup page. A verified 409
// from the authenticated Worker is the only signal for new-account setup.
const STUDIO_HOSTS=new Set(['pvlab.studio','www.pvlab.studio','pvlab-studio.pages.dev']);
function onboardingRequired(response){
  return response.status===409&&response.headers.get('X-PV-Lab-Onboarding')==='required';
}
function studioBrowser(){
  if(typeof window==='undefined'||!window.location)return null;
  const location=window.location;
  return STUDIO_HOSTS.has(location.hostname.toLowerCase())?location:null;
}
export function createSessionRequest({ baseUrl, getSession, fetchImpl = globalThis.fetch, clock = Date.now, onNewCustomer = () => {} }) {
  const base = new URL(baseUrl);
  const pendingRefreshes = new WeakMap();
  const recentRefreshes = new WeakMap();
  const pendingOnboarding = new WeakMap();
  const greetedSessions = new WeakSet();

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
      if(session.labNative===true)headers.set('X-PV-Lab-Client','mobile-v1');
      const response = await fetchImpl(url.href, { ...init, headers, redirect: 'error' });
      // Deleting the dedicated Clerk user can end this session before its
      // successful response arrives. Accept only that response while signed out;
      // every account switch and every other request still fails closed.
      const completedClosure=url.pathname==='/api/customer/account'&&
        (init.method||'GET').toUpperCase()==='DELETE'&&response.status===202&&!getSession();
      if(completedClosure){init.signal?.throwIfAborted();assertCurrent();}
      else checkSession();
      return response;
    };
    async function finishOnboarding(response) {
      if(!onboardingRequired(response))return response;
      const browser=studioBrowser();
      if(!browser)return response;
      if(browser.pathname.endsWith('/connect-account.html')||browser.pathname==='/connect-account')return response;
      // Cloudflare Pages serves studio.html at the canonical extensionless
      // /studio URL. Both forms represent the same authenticated workspace.
      // Never redirect /studio back to /studio.html on a 409.
      if(browser.pathname!=='/studio'&&browser.pathname!=='/studio.html') {
        // A customer arriving from another page goes straight into Studio.
        window.location.replace(new URL('/studio?tool=image',browser.origin).href);
        return response;
      }
      // Only the initial read-only session handshake may initialize a fresh
      // customer wallet. Never auto-create for paid jobs, checkout or uploads.
      if(url.pathname!=='/api/session'||(init.method||'GET').toUpperCase()!=='GET')return response;
      let pending=pendingOnboarding.get(session);
      if(!pending){
        pending=(async()=>{
          checkSession();
          const headers=new Headers();
          headers.set('Authorization','Bearer '+token);
          if(session.labNative===true)headers.set('X-PV-Lab-Client','mobile-v1');
          const created=await fetchImpl(new URL('/api/migration/new',base).href,{
            method:'POST',headers,redirect:'error',credentials:'omit',cache:'no-store',signal:init.signal
          });
          checkSession();
          if(!created.ok&&created.status!==409){
            const detail=await created.json().catch(()=>({}));
            throw Error(detail.error||'Unable to prepare the Studio account. Please try again.');
          }
          return created.status===201;
        })();
        pendingOnboarding.set(session,pending);
        void pending.finally(()=>{if(pendingOnboarding.get(session)===pending)pendingOnboarding.delete(session);}).catch(()=>{});
      }
      const createdNow=await waitWithAbort(pending,init.signal);
      checkSession();
      // A fresh session must be reverified by the Worker, including its
      // wallet balance. No local credit balance can authorize generation.
      const verified=await send(token);
      if(createdNow&&verified.ok){
        const profile=await verified.clone().json().catch(()=>null);
        checkSession();
        if(profile?.customer===true&&profile.owner===false&&
          Number.isSafeInteger(profile.balanceCredits)&&profile.balanceCredits>=200&&
          !greetedSessions.has(session)){
          greetedSessions.add(session);
          onNewCustomer({credits:200,ownerId:profile.ownerId,sessionId});
        }
      }
      return verified;
    }
    let response = await send(token);
    if (response.status !== 401) return finishOnboarding(response);
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
    return finishOnboarding(response);
  };
}
