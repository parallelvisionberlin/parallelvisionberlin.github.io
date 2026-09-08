from pathlib import Path
import json
ROOT = Path(__file__).resolve().parents[1]
def replace(text, old, new, n=1):
    actual=text.count(old)
    if actual!=n: raise RuntimeError(f'Expected {n} exact source anchors, got {actual}: {old[:100]}')
    return text.replace(old,new)
path=ROOT/'js/nina-access.js'
s=path.read_text()
s=replace(s,'const DEVELOPMENT =', 'import { createAppMicrophone } from "./nina-microphone.js?v=mic01";\n\nconst DEVELOPMENT =')
s=replace(s,'function stopNinaMicrophone() {\n  ninaMicrophoneStream?.getTracks().forEach(track => track.stop());\n  ninaMicrophoneStream = null;\n}', '''// The app owns one capture stream. The public website keeps its existing capture path.
let ninaMicCheckTimer = null;
let ninaMicCheckEpoch = 0;
let ninaMicCheckRunning = false;
const appMicrophone = location.pathname === "/nina-app.html" ? createAppMicrophone({
  mediaDevices: navigator.mediaDevices,
  AudioContextClass: window.AudioContext || window.webkitAudioContext,
  onReading: level => {
    const meter = byId("ninaMicLevel");
    if (meter) meter.value = Math.max(0, Math.min(100, (level.db + 60) / 60 * 100));
    const reading = byId("ninaMicReading");
    if (reading) reading.textContent = level.db <= -89 ? "NO INPUT DETECTED" : `${Math.round(level.db)} dBFS INPUT`;
  },
  onState: state => {
    if (state === "interrupted") setNinaMicCheckMessage("Microphone interrupted by the device. Waiting for it to resume.");
  },
  onInterrupted: () => {
    if (ninaClient || ninaConnecting) {
      void stopNinaSession().catch(() => {});
      showNinaFailure("The microphone disconnected or was interrupted. Reconnect it and try again.");
    } else {
      stopNinaMicrophone();
      setNinaMicCheckMessage("Microphone disconnected. Choose an input and test again.");
    }
  }
}) : null;
function setNinaMicCheckMessage(text) {
  const label = byId("ninaMicCheckResult");
  if (label) label.textContent = text;
}
function endNinaMicCheck(release = true) {
  clearTimeout(ninaMicCheckTimer); ninaMicCheckTimer = null;
  ninaMicCheckEpoch += 1; ninaMicCheckRunning = false;
  appMicrophone?.stopMeter();
  const button = byId("ninaMicCheck");
  if (button) { button.disabled = false; button.textContent = "TEST MICROPHONE"; }
  if (release && !ninaClient && !ninaConnecting) stopNinaMicrophone();
}
function stopNinaMicrophone() {
  clearTimeout(ninaMicCheckTimer); ninaMicCheckTimer = null;
  ninaMicCheckEpoch += 1; ninaMicCheckRunning = false;
  if (appMicrophone) appMicrophone.stop();
  else ninaMicrophoneStream?.getTracks().forEach(track => track.stop());
  ninaMicrophoneStream = null;
  const button = byId("ninaMicCheck");
  if (button) { button.disabled = false; button.textContent = "TEST MICROPHONE"; }
}
async function renderAppMicrophones() {
  if (!appMicrophone) return;
  const report = appMicrophone.report();
  const devices = await listMicrophones().catch(() => []);
  // System default is an actual selectable route, not the first enumerated device.
  ninaMicrophoneSelect.replaceChildren(new Option("System default", ""));
  devices.forEach((device, index) => ninaMicrophoneSelect.appendChild(new Option(device.label || `Microphone ${index + 1}`, device.deviceId)));
  ninaMicrophoneSelect.value = devices.some(device => device.deviceId === report.selected) ? report.selected : "";
  savePreferredMicrophone(ninaMicrophoneSelect.value);
  updateNinaMicrophoneName();
  const route = byId("ninaMicRoute");
  if (route) route.textContent = report.label;
  const settings = byId("ninaMicSettings");
  if (settings) settings.textContent = [["echoCancellation", "Echo reduction"], ["noiseSuppression", "Noise reduction"], ["autoGainControl", "Auto level"]].map(([key,label]) => `${label}: ${report.settings[key] === null ? "not reported" : report.settings[key] ? "on" : "off"}`).join(" · ");
}
async function checkNinaMicrophone() {
  if (!appMicrophone || ninaClient || ninaConnecting) return;
  if (ninaMicCheckRunning) { endNinaMicCheck(); setNinaMicCheckMessage("Test stopped. Microphone released."); return; }
  ninaMicCheckRunning = true;
  const epoch = ++ninaMicCheckEpoch;
  appMicrophone.prepareMeter(); // Prepare from the explicit tap, before waiting for permission.
  byId("ninaMicCheck").textContent = "STOP TEST";
  ninaMicrophoneSelect.disabled = true;
  setNinaMicCheckMessage("Allow the microphone, then speak at your normal distance for eight seconds.");
  try {
    await acquireNinaMicrophone(ninaMicrophoneSelect.value || readPreferredMicrophone());
    if (epoch !== ninaMicCheckEpoch || !ninaOverlay.classList.contains("is-open")) return;
    await renderAppMicrophones();
    if (epoch !== ninaMicCheckEpoch) return;
    if (!appMicrophone.startMeter()) {
      endNinaMicCheck();
      setNinaMicCheckMessage("Microphone opened, but input-level measurement is unavailable on this device. You can still try a conversation.");
      return;
    }
    setNinaMicCheckMessage("Speak normally. This measures input level only; it does not record or start a call.");
    ninaMicCheckTimer = setTimeout(() => {
      const report = appMicrophone.report();
      const result = !report.frames ? "Input level could not be measured. Try again." : report.highestPeak >= 0.98 ? "Input peaked near clipping. Move slightly farther away and test again." : report.bestDb < -42 ? "Low input during the test. Speak normally, check the selected microphone or move closer, then test again." : "Input detected. This checks level, not speech recognition or connection quality.";
      endNinaMicCheck(); setNinaMicCheckMessage(result + " Microphone released.");
    }, 8000);
  } catch (error) {
    if (epoch !== ninaMicCheckEpoch || error?.name === "AbortError") return;
    endNinaMicCheck();
    setNinaMicCheckMessage(error?.name === "NotAllowedError" ? "Microphone permission was denied. Allow it in iPhone Settings and try again." : "The microphone could not open. Check the input and try again.");
  } finally {
    if (!ninaConnecting && !ninaClient) ninaMicrophoneSelect.disabled = false;
  }
}
byId("ninaMicCheck")?.addEventListener("click", () => void checkNinaMicrophone());''')
s=replace(s,'async function acquireNinaMicrophone(deviceId = "") {\n  const stream =', '''async function acquireNinaMicrophone(deviceId = "") {
  if (appMicrophone) {
    ninaMicrophoneStream = await appMicrophone.acquire(deviceId);
    return ninaMicrophoneStream;
  }
  const stream =''')
s=replace(s,'async function refreshNinaMicrophones() {\n  if (!ninaOverlay.classList.contains("is-open") || !navigator.mediaDevices?.enumerateDevices) return;', '''async function refreshNinaMicrophones() {
  if (!ninaOverlay.classList.contains("is-open") || !navigator.mediaDevices?.enumerateDevices) return;
  if (appMicrophone) {
    // Device enumeration is permission-free. Never reopen a microphone from devicechange.
    const report = appMicrophone.report();
    const devices = await listMicrophones().catch(() => null);
    if (!devices) return;
    const gone = report.deviceId && !devices.some(device => device.deviceId === report.deviceId);
    if (appMicrophone.getStream() && (report.state === "ended" || gone)) {
      if (ninaClient || ninaConnecting) {
        void stopNinaSession().catch(() => {});
        showNinaFailure("The microphone disconnected. Reconnect it and try again.");
      } else { stopNinaMicrophone(); setNinaMicCheckMessage("Microphone changed. Test the selected input again."); }
    }
    if (!ninaClient && !ninaConnecting) await renderAppMicrophones();
    return;
  }''')
s=replace(s,'async function stopNinaSession() {\n  clearNinaLiveCountdown();','async function stopNinaSession() {\n  if (appMicrophone) stopNinaMicrophone(); // Release capture before waiting for network settlement.\n  clearNinaLiveCountdown();')
s=replace(s,'  const onClosed = () => {\n    if (attempt !== ninaAttempt || client !== ninaClient) return;', '''  const onClosed = () => {
    if (attempt !== ninaAttempt || client !== ninaClient) return;
    if (appMicrophone) {
      void stopNinaSession().catch(() => {});
      if (ninaOverlay.classList.contains("is-open")) showNinaFailure("The connection ended. Try again when you are ready.");
      return;
    }''')
s=replace(s,'  ninaConnecting = true; // Guards duplicate eligibility and connection requests.', '''  ninaConnecting = true; // Guards duplicate eligibility and connection requests.
  if (appMicrophone) {
    endNinaMicCheck(false); // Reuse a tested stream; never create a second capture for the call.
    ninaMicrophoneSelect.disabled = true;
  }''')
s=replace(s,'      await acquireNinaMicrophone(ninaMicrophoneSelect.value);','      await acquireNinaMicrophone(ninaMicrophoneSelect.value || (appMicrophone ? readPreferredMicrophone() : ""));')
s=replace(s,'    if (attempt !== ninaAttempt || !ninaOverlay.classList.contains("is-open")) return;\n    const restoredHistory', '    if (attempt !== ninaAttempt || !ninaOverlay.classList.contains("is-open")) return;\n    if (appMicrophone) void renderAppMicrophones();\n    const restoredHistory')
s=replace(s,'  if (willOpen) ninaMicrophoneSelect.focus({ preventScroll: true });','  if (willOpen) (appMicrophone ? byId("ninaMicCheck") : ninaMicrophoneSelect)?.focus({ preventScroll: true });')
s=replace(s,'ninaMicrophoneSelect.addEventListener("change", async () => {\n  const selectedId =', '''ninaMicrophoneSelect.addEventListener("change", async () => {
  if (appMicrophone) {
    if (ninaConnecting || ninaClient) return; // No detached replacement stream during a live call.
    const selected = ninaMicrophoneSelect.value;
    endNinaMicCheck(); savePreferredMicrophone(selected); updateNinaMicrophoneName();
    setNinaMicCheckMessage("Input selected. Tap TEST MICROPHONE to check it.");
    return;
  }
  const selectedId =''')
s=replace(s,'function showNinaReady(balance = ninaCreditsBalance, statusOverride = "") {','function showNinaReady(balance = ninaCreditsBalance, statusOverride = "") {\n  if (appMicrophone) ninaMicrophoneSelect.disabled = false;')
s=replace(s,'function showNinaConnecting() {', 'function showNinaConnecting() {\n  if (appMicrophone) collapseNinaMicrophonePicker();')
s=replace(s,'function showNinaFailure(message = "Please check microphone access and try again.") {','function showNinaFailure(message = "Please check microphone access and try again.") {\n  if (appMicrophone) ninaMicrophoneSelect.disabled = false;')
path.write_text(s)
# HTML changes are scoped to the app route, not to the public site's access panel.
p=ROOT/'nina-app.html';s=p.read_text();
s=replace(s,'<option value="">Requesting microphone access…</option>','<option value="">System default</option>')
s=replace(s,'<span aria-live="polite" class="nina-microphone-status" id="ninaMicrophoneStatus" role="status"></span>', '''<span aria-live="polite" class="nina-microphone-status" id="ninaMicrophoneStatus" role="status"></span>
<div class="nina-mic-check">
  <p id="ninaMicRoute">System default microphone</p>
  <button id="ninaMicCheck" type="button">TEST MICROPHONE</button>
  <meter id="ninaMicLevel" min="0" max="100" value="0" aria-label="Microphone input level"></meter>
  <span id="ninaMicReading">NOT TESTED</span>
  <p id="ninaMicCheckResult" role="status" aria-live="polite">An eight-second input check. No recording or call.</p>
  <details><summary>Audio processing</summary><p id="ninaMicSettings">Available settings appear after the test.</p></details>
</div>''')
s=replace(s,'./css/nina-app.css?v=visual02','./css/nina-app.css?v=visual02-mic01')
s=replace(s,'./js/nina-app-bootstrap.js?v=voice02','./js/nina-app-bootstrap.js?v=visual02-mic01')
s=replace(s,'data-pv-app-revision="bridge01"','data-pv-app-revision="bridge01" data-pv-visual-revision="visual02-mic01"')
p.write_text(s)
p=ROOT/'js/nina-app-bootstrap.js';s=p.read_text()
start=s.index('function updateMicStatus(');end=s.index('function failure(')
s=s[:start]+s[end:]
s=replace(s,'  installVoiceCaptureProfile();\n','')
s=replace(s,"./nina-access.js?v=bridge01","./nina-access.js?v=visual02-mic01");p.write_text(s)
# Retain the existing native design; make online/error transitions testable.
p=ROOT/'mobile-app/src/ninaBridge.js';s=p.read_text();s+='\nexport function isImmersiveNinaState(detail) {\n  return /^(NINA ONLINE|ONLINE)$/i.test(String(detail || "").trim());\n}\n';p.write_text(s)
p=ROOT/'mobile-app/src/NinaLiveModal.js';s=p.read_text();s=replace(s,'import { isNinaURL,','import { isImmersiveNinaState, isNinaURL,');
s=replace(s,"      const online = /(^|\\s)NINA ONLINE($|\\s)/i.test(detail) || /^ONLINE$/i.test(detail);\n      if (online) setImmersive(true);\n      else if (/^(VERIFYING APP SESSION|SIGNAL READY|NINA IS READY|CONNECTING TO NINA)$/i.test(detail)) setImmersive(false);",'      setImmersive(isImmersiveNinaState(detail));')
s=replace(s,'cacheEnabled={false} bounces={false} scrollEnabled={false}','cacheEnabled={false} bounces={false} scrollEnabled={false}\n          contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false}')
s=replace(s,'<StatusBar hidden={immersive}', '<StatusBar animated hidden={immersive}')
p.write_text(s)
p=ROOT/'mobile-app/App.js';s=p.read_text();s=replace(s,'NINA FOK / PRIVATE CHANNEL','NINA FOK / LIVE SIGNAL');s=replace(s,'SIGNAL AVAILABLE','BERLIN / 2063');p.write_text(s)
p=ROOT/'mobile-app/src/AuthPanel.js';s=p.read_text();s=replace(s,'LOGIN 03 / BRIDGE 01','LOGIN 03 / BRIDGE 01 · VISUAL 02 / MIC 01');p.write_text(s)
p=ROOT/'mobile-app/app.json';j=json.loads(p.read_text());j['expo']['version']='0.4.1';p.write_text(json.dumps(j,indent=2)+'\n')
for file in ['package.json','package-lock.json']:
 p=ROOT/'mobile-app'/file;j=json.loads(p.read_text());j['version']='0.4.1';
 if file=='package-lock.json':j['packages']['']['version']='0.4.1'
 p.write_text(json.dumps(j,indent=2)+'\n')
print('Applied VISUAL 02 / MIC 01. Auth provider, credits rules and backend unchanged.')
# Extend, rather than weaken, the existing browser regression harness.
s=(ROOT/'scripts/test-nina-bridge.py').read_text()
s=replace(s,"async def case(browser, name, account_status=200, account_error=False, balance=30, owner=False, reply=True, sub='user_test_A', call=False):", "async def case(browser, name, account_status=200, account_error=False, balance=30, owner=False, reply=True, sub='user_test_A', call=False, mic_mode='', height=720):")
s=replace(s,"viewport={'width':390,'height':720}","viewport={'width':390,'height':height}")
a=s.index("MEDIA='''");b=s.index("async def case",a)
s=s[:a]+'''MEDIA=\'\'\'window.micRequests=0;window.micStops=0;window.micConstraints=[];
Object.defineProperty(navigator,'mediaDevices',{value:{getSupportedConstraints(){return {echoCancellation:true,noiseSuppression:true,autoGainControl:true};},async getUserMedia(c){window.micRequests++;window.micConstraints.push(c);const track=new EventTarget();Object.assign(track,{kind:'audio',readyState:'live',enabled:true,muted:false,label:'Test input',getSettings(){return {deviceId:'test-mic',echoCancellation:true,noiseSuppression:true,autoGainControl:true};},stop(){if(this.readyState==='ended')return;this.readyState='ended';window.micStops++;}});window.lastInputTrack=track;return {getAudioTracks(){return [track];},getTracks(){return [track];}};},async enumerateDevices(){return [{kind:'audioinput',deviceId:'test-mic',label:'Test input'}];},addEventListener(){}}});
window.AudioContext=class {constructor(){this.state='running';}resume(){return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}createMediaStreamSource(stream){return {connect(){},disconnect(){}};}createAnalyser(){return {fftSize:1024,getFloatTimeDomainData(a){a.fill(.1);},disconnect(){}};}};
\'\'\'
''' +s[b:]
anchor="            if call:\n                await page.locator('#startNina').click()"
insert='''            if mic_mode:
                assert not await page.locator('#ninaReferralEntry').is_visible()
                assert 'nina-window.webp' in await page.locator('.nina-intro').evaluate('(e)=>getComputedStyle(e).backgroundImage')
                assert await page.locator('.nina-intro').evaluate('(e)=>getComputedStyle(e,"::before").display')=='none'
                assert await page.evaluate("new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i.naturalWidth>100);i.onerror=()=>resolve(false);i.src='/assets/optimized/nina-fok/nina-window.webp';})"), 'Portrait did not load'
                assert box['y']+box['height']<=height, box
                await page.screenshot(path=str(ROOT/f'precall-{os.environ.get("BROWSER","chromium")}-{height}.png'))
            if mic_mode in ('reuse','timer'):
                await page.locator('#ninaMicrophoneToggle').click()
                await page.locator('#ninaMicCheck').click()
                await page.wait_for_function("document.getElementById('ninaMicReading').textContent.includes('dBFS')")
                assert await page.locator('#ninaMicRoute').inner_text()=='Test input'
                assert await page.evaluate('micConstraints[0].audio.autoGainControl.ideal') is True
                assert not any(u.endswith('/session-token') for u,m,a in requests), 'Mic test started a paid call'
                if mic_mode=='timer':
                    await page.wait_for_function("document.getElementById('ninaMicCheckResult').textContent.includes('Microphone released')",timeout=11000)
                    assert await page.evaluate('micStops')==1
                else:
                    await page.locator('#ninaMicrophoneToggle').click()
            if call:
                await page.locator('#startNina').click()'''
s=replace(s,anchor,insert)
s=replace(s,"                await page.evaluate('window.__PV_NINA_CLOSE__()')",'''                if mic_mode=='disconnect':
                    await page.evaluate("lastInputTrack.dispatchEvent(new Event('ended'))")
                    await page.wait_for_function("document.getElementById('ninaStatus').textContent==='CONNECTION FAILED' && window.sdkStops===1")
                    assert 'microphone' in (await page.locator('#ninaScrimMessage').inner_text()).lower()
                await page.evaluate('window.__PV_NINA_CLOSE__()')''')
a=s.index('        await case(b,');b=s.index('        await b.close()',a)
s=s[:a]+'''        await case(b,'pre-call portrait, hidden promo and contained controls',mic_mode='visual')
        await case(b,'small viewport controls fit',mic_mode='visual',height=540)
        await case(b,'mic test is local and reuses one stream for the call',mic_mode='reuse',call=True)
        await case(b,'eight-second microphone test releases capture',mic_mode='timer')
        await case(b,'ended input stops capture and exposes retry without signing out',mic_mode='disconnect',call=True)
''' +s[b:]
(ROOT/'scripts/test-nina-visual-audio.py').write_text(s)
(ROOT/'mobile-app/tests/immersive.test.mjs').write_text('''import test from 'node:test';
import assert from 'node:assert/strict';
import {isImmersiveNinaState} from '../src/ninaBridge.js';
import {readFileSync} from 'node:fs';
test('only online state hides the header; failures, connecting and ready restore controls',()=>{
 for(const state of ['NINA ONLINE','online',' Nina Online '])assert.equal(isImmersiveNinaState(state),true);
 for(const state of ['NINA IS READY','CONNECTION FAILED','MICROPHONE CHECK','CONNECTING TO NINA','',undefined])assert.equal(isImmersiveNinaState(state),false);
});
test('fullscreen keeps the same keyed WebView and a safe-area close button',()=>{
 const src=readFileSync(new URL('../src/NinaLiveModal.js',import.meta.url),'utf8');
 assert.match(src,/key=\\{attempt\\}/);assert.match(src,/hidden=\\{immersive\\}/);
 assert.match(src,/!immersive && <SafeAreaView/);assert.match(src,/immersive && <SafeAreaView/);
 assert.match(src,/contentInsetAdjustmentBehavior="never"/);
});
''')
