from pathlib import Path

root = Path(__file__).resolve().parents[1]
access = root / 'js/nina-access.js'
s = access.read_text(encoding='utf-8')

anchor = '''function setupNinaWebSession(attempt, client) {'''
helper = '''function setNinaTrialMicrophoneEnabled(enabled) {
  if (!NINA_WEB_FLOW || ninaOwnerBypass || !ninaMicrophoneStream) return;
  for (const track of ninaMicrophoneStream.getAudioTracks()) {
    if (track.readyState === "live") track.enabled = Boolean(enabled);
  }
}

'''
if helper not in s:
    assert anchor in s, 'setupNinaWebSession anchor missing'
    s = s.replace(anchor, helper + anchor, 1)

old_confirm = '''    onConfirmed: async () => {
      if (current() && ninaTrialActivationPending && ninaWebProgress?.hasSpeech()) await activateNinaUsage(attempt, client);
    },'''
new_confirm = '''    onConfirmed: async () => {
      if (!current()) return;
      if (ninaTrialActivationPending) setNinaTrialMicrophoneEnabled(true);
      if (ninaTrialActivationPending && ninaWebProgress?.hasSpeech()) await activateNinaUsage(attempt, client);
    },'''
assert old_confirm in s, 'onConfirmed block missing'
s = s.replace(old_confirm, new_confirm, 1)

old_grace = '''  markNinaOnline();
  if (NINA_WEB_FLOW) ninaWebAudio?.show(true);
  if (!ninaTrialGraceTimer) {
    ninaTrialGraceTimer = setTimeout(async () => {'''
new_grace = '''  markNinaOnline();
  if (NINA_WEB_FLOW) ninaWebAudio?.show(true);
  if (!ninaTrialGraceTimer) {
    // The sound check is genuinely pre-trial: Nina can speak, but user input is
    // disabled until the listener confirms output audio. This prevents a full
    // conversation from running inside the free 60-second setup window.
    if (NINA_WEB_FLOW) setNinaTrialMicrophoneEnabled(false);
    ninaTrialGraceTimer = setTimeout(async () => {'''
assert old_grace in s, 'trial grace block missing'
s = s.replace(old_grace, new_grace, 1)

access.write_text(s, encoding='utf-8')

flow = root / 'js/nina-web-flow.js'
f = flow.read_text(encoding='utf-8')
old_copy = 'When you hear Nina, confirm below, then say hello. Your trial has not started.'
new_copy = 'When you hear Nina, confirm below. Your microphone stays off until then. After that, say hello. Your trial starts when Nina receives your voice.'
assert old_copy in f, 'audio-check copy missing'
f = f.replace(old_copy, new_copy, 1)
flow.write_text(f, encoding='utf-8')

test = root / 'anam-token-worker/test/web-conversion.test.js'
t = test.read_text(encoding='utf-8')
needle = '''  assert.match(source,/if \\(NINA_WEB_FLOW && ninaTrialActivationPending/);\n  assert.match(source,/ninaWebAudio\\?\\.confirmed\\(\\)/);'''
replacement = '''  assert.match(source,/if \\(NINA_WEB_FLOW && ninaTrialActivationPending/);\n  assert.match(source,/ninaWebAudio\\?\\.confirmed\\(\\)/);\n  assert.match(source,/function setNinaTrialMicrophoneEnabled\\(enabled\\)/);\n  assert.match(source,/if \\(NINA_WEB_FLOW\\) setNinaTrialMicrophoneEnabled\\(false\\)/);\n  assert.match(source,/if \\(ninaTrialActivationPending\\) setNinaTrialMicrophoneEnabled\\(true\\)/);'''
assert needle in t, 'web conversion assertion anchor missing'
t = t.replace(needle, replacement, 1)
test.write_text(t, encoding='utf-8')
