// Small, testable protocol shared by the native modal and its regression tests.
export const NINA_REVISION = 'BRIDGE 01';
export const NINA_ORIGIN = 'https://parallelvisionlabel.com';
export const NINA_URL = `${NINA_ORIGIN}/nina-app.html?pv_app=1&v=bridge01`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isNinaURL(input) {
  try { const url = new URL(input); return url.origin === NINA_ORIGIN && url.pathname === '/nina-app.html'; }
  catch { return false; }
}
export function readBridgeMessage(event) {
  if (!isNinaURL(event?.url) || typeof event.data !== 'string' || event.data.length > 4096) return null;
  try {
    const data = JSON.parse(event.data);
    if (!data || typeof data.type !== 'string' || !UUID.test(data.pageId || '')) return null;
    if (data.type === 'PV_NINA_TOKEN_REQUEST' && !UUID.test(data.id || '')) return null;
    return data;
  } catch { return null; }
}
export function tokenReplyScript(data) {
  return `if(window.top===window&&location.origin===${JSON.stringify(NINA_ORIGIN)}&&location.pathname==='/nina-app.html'&&window.__PV_NINA_PAGE_ID__===${JSON.stringify(data.pageId)}){window.__PV_NINA_TOKEN_REPLY__?.(${JSON.stringify(data)});}true;`;
}
export function withTimeout(promise, ms = 10000) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Account request timed out. Please retry.')), ms);
  })]).finally(() => clearTimeout(timer));
}

export function isImmersiveNinaState(detail) {
  return /^(NINA ONLINE|ONLINE)$/i.test(String(detail || "").trim());
}
