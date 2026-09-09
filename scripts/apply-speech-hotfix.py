from pathlib import Path
root=Path.cwd()
p=root/'js/nina-access.js'
s=p.read_text()
old='''  if (NINA_WEB_FLOW && ninaTrialActivationPending &&
      (!ninaWebAudio?.confirmed() || !ninaWebProgress?.hasSpeech())) return false;'''
new='''  // Completed user speech starts the trial. Output-audio help is never an activation gate.
  if (NINA_WEB_FLOW && ninaTrialActivationPending && !ninaWebProgress?.hasSpeech()) return false;'''
assert s.count(old)==1, 'Activation guard changed upstream; stop rather than overwrite.'
s=s.replace(old,new)
old='''    onConfirmed: async () => {
      if (current() && ninaTrialActivationPending && ninaWebProgress?.hasSpeech()) await activateNinaUsage(attempt, client);
    },
'''
assert s.count(old)==1
s=s.replace(old,'')
s=s.replace('nina-web-flow.js?v=20260909-conversion','nina-web-flow.js?v=20260910-speech-first')
s=s.replace('The sound check timed out before the trial began. Check your sound and microphone, then try again. No trial credits were used by this attempt.','Trial setup could not finish. Check your microphone and try again. No trial credits were used by this attempt.')
p.write_text(s)
for name in ['index.html','nina-project.html']:
 p=root/name;s=p.read_text();old='js/nina-access.js?v=20260909-web-conversion';assert s.count(old)==1,name
 p.write_text(s.replace(old,'js/nina-access.js?v=20260910-speech-first'))
p=root/'anam-token-worker/test/live-usage.test.js'
s=p.read_text()
s=s.replace(r'\s*else await activateNinaUsage', r'\s*else\s*\{\s*connectionPhase = "activation";\s*await activateNinaUsage')
s=s.replace(r'ownerBypass: user\.role',r'ownerBypass: identity\.user\.role')
p.write_text(s)
p=root/'scripts/test-nina-web-browser.py';s=p.read_text()
s=s.replace("source=source.replace('export async function','async function');", "source=source.replace('export async function','async function').replace('export function','function');")
old='''  page.wait_for_timeout(100);assert page.evaluate("requests.filter(x=>x.url.includes('/live/activate')).length")==0
  page.wait_for_timeout(1200);page.screenshot(path=str(out/f'nina-sound-check-{width}.png'))
  page.evaluate('window.failPlay=true');page.locator('[data-nina-heard]').click(force=True);page.wait_for_timeout(100)
  assert page.evaluate("requests.filter(x=>x.url.includes('/live/activate')).length")==0
  page.evaluate('window.failPlay=false');page.locator('[data-nina-heard]').click(force=True);page.wait_for_timeout(150)
  assert page.evaluate("requests.filter(x=>x.url.includes('/live/activate')).length")==1'''
new='''  page.wait_for_timeout(150)
  assert page.evaluate("requests.filter(x=>x.url.includes('/live/activate')).length")==1
  page.evaluate("testClient.emit('history',[{id:'greet',role:'persona',content:'Hi'},{id:'u1',role:'user',content:'Hello'},{id:'u2',role:'user',content:'Are you from Berlin?'}])")
  page.wait_for_timeout(100)
  assert page.evaluate("requests.filter(x=>x.url.includes('/live/activate')).length")==1
  assert page.locator('[data-nina-heard]').count()==0
  page.wait_for_timeout(1200);page.screenshot(path=str(out/f'nina-speech-first-{width}.png'))
  # Playback assistance stays optional and cannot issue another activation.
  page.evaluate('window.failPlay=true');page.locator('[data-nina-enable-sound]').click(force=True);page.wait_for_timeout(100)
  assert page.evaluate("requests.filter(x=>x.url.includes('/live/activate')).length")==1
  page.evaluate('window.failPlay=false');page.locator('[data-nina-enable-sound]').click(force=True);page.wait_for_timeout(150)
  assert page.evaluate("requests.filter(x=>x.url.includes('/live/activate')).length")==1'''
assert s.count(old)==1
s=s.replace(old,new).replace("'no billing before output confirmation','rejected play does not bill','activation once after confirmation and speech'", "'no billing before speech','first speech activates without any confirmation click','duplicate speech and audio help never double-activate'")
p.write_text(s)
