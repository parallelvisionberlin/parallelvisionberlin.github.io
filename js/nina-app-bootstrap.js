import { installNativeIdentity, BRIDGE_REVISION } from './nina-native-bridge.js?v=bridge01';
const boot = document.getElementById('pv-app-boot');
const message = document.getElementById('pv-app-message');
const retry = document.getElementById('pv-app-retry');
// MIC 01 is paused during recovery. Keep the original input selector.
document.querySelectorAll('.nina-mic-check').forEach(panel => { panel.hidden = true; });
let bridge, engine, closing;
let isClosing = false;
let watchdog;

function failure(text) {
  if (isClosing) return;
  clearTimeout(watchdog);
  boot.hidden = false;
  message.textContent = text;
  retry.hidden = false;
  bridge?.send('PV_NINA_ERROR', { detail: text, revision: BRIDGE_REVISION });
}
retry.addEventListener('click', () => { if (bridge) bridge.send('PV_NINA_RETRY'); else location.reload(); });
window.addEventListener('unhandledrejection', event => {
  event.preventDefault();
  failure('The signal could not complete its request. Close Nina and try again.');
});
async function close() {
  if (closing) return closing;
  isClosing = true;
  clearTimeout(watchdog);
  closing = (async () => {
    try { await engine?.closeNativeNina(); }
    finally { bridge?.send('PV_NINA_CLOSED'); bridge?.dispose(); }
  })();
  return closing;
}
window.__PV_NINA_CLOSE__ = close;
window.addEventListener('pagehide', () => { void close(); });
try {
  bridge = installNativeIdentity();
  bridge.send('PV_NINA_STATE', { detail: 'VERIFYING APP SESSION', revision: BRIDGE_REVISION });
  const identity = await bridge.initialize();
  if (isClosing) throw new Error('Signal closed.');
  window.__PV_NINA_AUTH_PROVIDER__ = async () => identity;
  engine = await import('./nina-access.js?v=connection-restore01');
  if (isClosing) { await engine.closeNativeNina(); throw new Error('Signal closed.'); }
  const status = document.getElementById('ninaStatus');
  let previous = '';
  function observe() {
    const detail = status.textContent.trim();
    if (detail === previous) return;
    previous = detail;
    bridge.send('PV_NINA_STATE', { detail, revision: BRIDGE_REVISION });
    clearTimeout(watchdog);
    if (detail === 'CONNECTING TO NINA') watchdog = setTimeout(async () => {
      await engine.stopNinaSession();
      engine.showNinaFailure('Connection timed out. Check your internet connection and try again.');
    }, 35000);
  }
  new MutationObserver(observe).observe(status, { childList: true, subtree: true, characterData: true });
  await engine.routeNinaTrigger(document.getElementById('openNina'));
  boot.hidden = true;
  observe();
  document.getElementById('ninaAccessCancel')?.addEventListener('click', () => bridge.send('PV_NINA_SHOW_PROFILE'));
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a');
    if (!link) return;
    event.preventDefault();
    const url = new URL(link.href, location.href);
    if (url.origin === location.origin && /\/account(?:\.html)?$/.test(url.pathname)) bridge.send('PV_NINA_SHOW_PROFILE');
  }, true);
} catch (error) {
  failure(error?.message || 'Nina could not open. Please retry.');
}
