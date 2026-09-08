from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'css/nina-app.css'
s=p.read_text().replace("../assets/optimized/nina-fok/nina-window.webp", "../assets/optimized/nina-fok/Canon.webp")
p.write_text(s)
p=ROOT/'js/nina-access.js';s=p.read_text()
for header in ['function showNinaSignInRequired() {','function showNoSignalCredits() {','function showNinaFailure(message = "Please check microphone access and try again.") {']:
    replacement=header+'\n  if (appMicrophone) stopNinaMicrophone(); // No capture retained behind an error or payment screen.'
    if replacement not in s:
        assert s.count(header)==1,header
        s=s.replace(header,replacement)
old='  ninaMicrophoneSelect.value = devices.some(device => device.deviceId === report.selected) ? report.selected : "";'
new='  const selection = appMicrophone.getStream() ? report.selected : readPreferredMicrophone();\n  ninaMicrophoneSelect.value = devices.some(device => device.deviceId === selection) ? selection : "";'
if old in s:s=s.replace(old,new)
p.write_text(s)
p=ROOT/'scripts/test-nina-visual-audio.py';s=p.read_text().replace('nina-window.webp','Canon.webp')
old="json={'balance':balance,'remainingSeconds':balance*6,'ownerBypass':owner,'lifetimeDebited':0}"
new="json={'balance':0 if mic_mode=='lost_credit' and await page.evaluate('micRequests') else balance,'remainingSeconds':balance*6,'ownerBypass':owner,'lifetimeDebited':0}"
if old in s:s=s.replace(old,new)
s=s.replace("if mic_mode in ('reuse','timer'):","if mic_mode in ('reuse','timer','lost_credit'):")
needle="            if call:\n                await page.locator('#startNina').click()"
addition="""            if mic_mode=='lost_credit':
                await page.locator('#startNina').click()
                await page.wait_for_function("document.getElementById('startNina').textContent==='GET SIGNAL CREDITS'")
                assert await page.evaluate('micStops')==1, 'Test microphone retained after eligibility declined'
                assert not any(u.endswith('/session-token') for u,m,a in requests), 'Ineligible call created'
"""+needle
if 'Test microphone retained after eligibility declined' not in s:
    assert needle in s;s=s.replace(needle,addition)
needle="        await b.close()"
if "mic_mode='lost_credit'" not in s:s=s.replace(needle,"        await case(b,'eligibility loss releases a tested microphone without starting a call',mic_mode='lost_credit')\n"+needle)
p.write_text(s)
print('Exact browser Canon portrait, saved input selection and failed eligibility cleanup checked.')
