import { installNativeIdentity, BRIDGE_REVISION } from './nina-native-bridge.js?v=bridge01';
const boot = document.getElementById('pv-app-boot');
const message = document.getElementById('pv-app-message');
const retry = document.getElementById('pv-app-retry');
let bridge, engine, closing;
let isClosing = false;
let watchdog;

const RECOVERY_REVISION = 'RECOVERY 01';
let currentDiagnostic = '';
const safeIdentifier = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,48}$/.test(value) ? value : '';
const phaseNames = {microphone:'MICROPHONE',memory:'SAVED CONVERSATION',session:'CONNECTION SERVICE',avatar:'AVATAR STREAM',activation:'LIVE SESSION'};
function connectionDiagnostic(phase, error) {
  const where = phaseNames[phase] || 'CONNECTION';
  const name = safeIdentifier(error?.name) || 'Error';
  const code = safeIdentifier(error?.code);
  const http = Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599 ? `HTTP ${error.status}` : '';
  const constraint = safeIdentifier(error?.constraint);
  const detail = [name, code, http, constraint].filter(Boolean).join(' / ');
  let instruction = 'The call could not start. Close Nina and try again.';
  if (phase === 'microphone' && name === 'NotAllowedError') instruction = 'Microphone access was not granted. Check the app microphone permission in iPhone Settings.';
  else if (phase === 'microphone' && name === 'NotReadableError') instruction = 'The selected microphone could not start.';
  else if (phase === 'microphone' && ['NotFoundError','OverconstrainedError'].includes(name)) instruction = 'The requested microphone or setting is unavailable.';
  else if (phase === 'session') instruction = 'The connection service could not open the call.';
  else if (phase === 'avatar') instruction = 'The avatar stream could not start.';
  // Omit raw messages, request bodies, URLs, tokens and account data.
  return `${RECOVERY_REVISION} / ${where} / ${detail}. ${instruction}`;
}
window.__PV_NINA_REPORT_CONNECTION_ERROR__ = (phase, error) => {
  currentDiagnostic = connectionDiagnostic(phase, error);
  failure(currentDiagnostic);
};
const revision = document.createElement('span');
revision.id = 'pv-call-revision';
revision.textContent = RECOVERY_REVISION;
document.querySelector('.nina-intro-content')?.appendChild(revision);

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
  if (boot.hidden) failure(connectionDiagnostic('connection', event.reason));
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
  engine = await import('./nina-access.js?v=recovery01');
  if (isClosing) { await engine.closeNativeNina(); throw new Error('Signal closed.'); }
  const status = document.getElementById('ninaStatus');
  let previous = '';
  function observe() {
    const detail = status.textContent.trim();
    if (detail === previous) return;
    previous = detail;
    if (detail === 'CONNECTION FAILED' && currentDiagnostic) { failure(currentDiagnostic); return; }
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
