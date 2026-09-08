"""Remove the remaining microphone override; expose bounded app-only failure details."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def replace_once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError('Expected one patch anchor: ' + old[:85])
    return text.replace(old, new, 1)

def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')

engine = (ROOT / 'js/nina-access.js').read_text(encoding='utf-8')
assert 'createAppMicrophone' not in engine
assert 'export { routeNinaTrigger, stopNinaSession, showNinaFailure, refreshNinaEligibility };' in engine
helper = '''function reportAppConnectionError(phase, error) {
  if (window.location.pathname !== "/nina-app.html") return;
  try { window.__PV_NINA_REPORT_CONNECTION_ERROR__?.(phase, error); }
  catch { /* Diagnostics cannot alter cleanup or authorization. */ }
}

'''
engine = replace_once(engine, 'async function connectNina() {', helper + 'async function connectNina() {')
engine = replace_once(engine, '  showNinaConnecting();\n  try {', '  showNinaConnecting();\n  let connectionPhase = "microphone";\n  try {')
engine = replace_once(engine, '    const restoredHistory = readNinaMemory();', '    connectionPhase = "memory";\n    const restoredHistory = readNinaMemory();')
engine = replace_once(engine, '    const session = await requestSessionToken(ninaTokenAbortController.signal, restoredHistory);', '    connectionPhase = "session";\n    const session = await requestSessionToken(ninaTokenAbortController.signal, restoredHistory);')
engine = replace_once(engine, '    const client = createClient(session.sessionToken);', '    connectionPhase = "avatar";\n    const client = createClient(session.sessionToken);')
engine = replace_once(engine, '    else await activateNinaUsage(attempt, client);', '    else { connectionPhase = "activation"; await activateNinaUsage(attempt, client); }')
engine = replace_once(engine, '    logDevelopmentError("Nina connection failed.", error);', '    logDevelopmentError("Nina connection failed.", error);\n    reportAppConnectionError(connectionPhase, error);')
for phrase in ['Unable to activate Live Nina time.', 'Unable to activate Live Nina time after user speech.']:
    old = f'      logDevelopmentError("{phrase}", error);'
    engine = replace_once(engine, old, old + '\n      reportAppConnectionError("activation", error);')
for code in ['session_unavailable', 'usage_unavailable']:
    old = f'    error.code = typeof data.code === "string" ? data.code : "{code}";'
    engine = replace_once(engine, old, old + '\n    error.status = response.status;')
write('js/nina-access.js', engine)

bootstrap = (ROOT / 'js/nina-app-bootstrap.js').read_text(encoding='utf-8')
start = bootstrap.index('function updateMicStatus(')
end = bootstrap.index('function failure(', start)
assert 'media.getUserMedia = async' in bootstrap[start:end]
bootstrap = bootstrap[:start] + bootstrap[end:]
bootstrap = replace_once(bootstrap, '  installVoiceCaptureProfile();\n', '')
bootstrap = replace_once(bootstrap, "engine = await import('./nina-access.js?v=bridge01');", "engine = await import('./nina-access.js?v=recovery01');")
diagnostics = '''const RECOVERY_REVISION = 'RECOVERY 01';
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

'''
bootstrap = replace_once(bootstrap, 'function failure(text) {', diagnostics + 'function failure(text) {')
bootstrap = replace_once(bootstrap, "  failure('The signal could not complete its request. Close Nina and try again.');", "  if (boot.hidden) failure(connectionDiagnostic('connection', event.reason));")
bootstrap = replace_once(bootstrap, "    previous = detail;\n    bridge.send('PV_NINA_STATE'", "    previous = detail;\n    if (detail === 'CONNECTION FAILED' && currentDiagnostic) { failure(currentDiagnostic); return; }\n    bridge.send('PV_NINA_STATE'")
assert 'getUserMedia' not in bootstrap
write('js/nina-app-bootstrap.js', bootstrap)

css = (ROOT / 'css/nina-app.css').read_text(encoding='utf-8')
assert 'RECOVERY 01' not in css
css += '''
/* RECOVERY 01: an error must not be covered by the pre-call portrait. */
body.nina-scrim-visible #ninaOverlay .nina-intro {visibility:hidden!important;pointer-events:none!important;}
body.nina-scrim-visible #ninaOverlay .nina-call-scrim {z-index:90!important;opacity:1!important;background:#080808!important;}
body #ninaOverlay .nina-scrim-button {min-height:52px;border:1px solid #bbb;background:#171717;color:#f2efe9!important;}
body #ninaOverlay .nina-intro #startNina {color:#f2efe9!important;}
body #ninaOverlay .nina-intro #startNina:disabled {opacity:.65;}
body #ninaOverlay .nina-mic-check {display:none!important;}
#pv-call-revision {order:5;color:#aaa;font:9px/1.4 Arial,sans-serif;letter-spacing:.14em;}
'''
write('css/nina-app.css', css)
html = (ROOT / 'nina-app.html').read_text(encoding='utf-8')
html = replace_once(html, './css/nina-app.css?v=visual02-mic01', './css/nina-app.css?v=recovery01')
html = replace_once(html, './js/nina-app-bootstrap.js?v=visual02-mic01', './js/nina-app-bootstrap.js?v=recovery01')
html = replace_once(html, 'data-pv-visual-revision="visual02-mic01"', 'data-pv-visual-revision="visual02-mic01" data-pv-call-revision="recovery01"')
write('nina-app.html', html)
print('RECOVERY 01 prepared: capture override removed; app-only errors exposed; portrait and auth retained.')
