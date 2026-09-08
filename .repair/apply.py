"""Apply the reviewed BRIDGE 01 migration to the isolated test branch only."""
import json, pathlib, re, shutil
from bs4 import BeautifulSoup
ROOT = pathlib.Path(__file__).resolve().parents[1]
def replace_once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError('Expected one source match, got %s: %s' % (text.count(old), old[:100]))
    return text.replace(old, new, 1)

# Keep the public website on its existing authentication path. Only the app-only
# page receives the already verified native identity provider.
p = ROOT/'js/nina-access.js'; text = p.read_text()
text = replace_once(text, 'import { Clerk } from "https://esm.sh/@clerk/clerk-js@6?bundle";', '')
text = replace_once(text, 'async function initializeNinaAuth() {', '''async function initializeNinaAuth() {
  // The app uses its native session, not a second Clerk browser client.
  if (location.pathname === "/nina-app.html" && window.__PV_NINA_AUTH_PROVIDER__) {
    if (!ninaAuthInitialization) ninaAuthInitialization = window.__PV_NINA_AUTH_PROVIDER__()
      .then(clerk => { ninaClerk = clerk; updateNinaAccountControls(clerk); return clerk; })
      .catch(error => { ninaAuthInitialization = null; throw error; });
    return ninaAuthInitialization;
  }''')
text = replace_once(text, '    const ClerkUI = await loadNinaClerkUI();', '    const { Clerk } = await import("https://esm.sh/@clerk/clerk-js@6?bundle");\n    const ClerkUI = await loadNinaClerkUI();')
text = replace_once(text, '  void setupNinaMicrophones();', '  if (location.pathname !== "/nina-app.html") void setupNinaMicrophones();')
text += '''
// Explicit app integration points. No DOM click polling or duplicate sign-in UI.
export async function closeNativeNina() {
  const client = ninaClient;
  ninaClient = null;
  stopNinaMicrophone();
  ninaVideo.pause();
  ninaVideo.srcObject = null;
  await Promise.allSettled([client?.stopStreaming(), closeNinaWindow()]);
  await ninaMemorySyncPromise.catch(() => null);
}
export { routeNinaTrigger, stopNinaSession, showNinaFailure, refreshNinaEligibility };
'''
p.write_text(text)

# Generate a complete live document from the real canonical component markup,
# not by fetching/inserting a whole website at runtime.
source = BeautifulSoup((ROOT/'nina-project.html').read_text(), 'html.parser')
blocks = {}
for name in ['ninaAccountShell', 'ninaAccess', 'ninaOverlay']:
    nodes = source.select('#'+name)
    if len(nodes) != 1: raise RuntimeError('Missing or duplicate canonical component: '+name)
    blocks[name] = str(nodes[0])
head = '''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'">
<meta name="color-scheme" content="dark"><meta name="robots" content="noindex">
<title>Nina FOK / App Signal</title>
<link rel="stylesheet" href="./fashion.css?v=20260904-media-1">
<link rel="stylesheet" href="./css/nina-access.css?v=20260907-credit-type">
<link rel="stylesheet" href="./css/nina-app.css?v=bridge01">
</head><body data-pv-app-revision="bridge01">
<div id="pv-app-boot" role="status"><p id="pv-app-message">Connecting your Parallel Vision account…</p><button id="pv-app-retry" hidden>TRY AGAIN</button></div>
<button id="openNina" data-nina-open type="button" hidden></button>
<div data-native-support hidden>
'''
(ROOT/'nina-app.html').write_text(head + blocks['ninaAccountShell'] + blocks['ninaAccess'] + '\n</div>\n' + blocks['ninaOverlay'] + '\n<script type="module" src="./js/nina-app-bootstrap.js?v=bridge01"></script>\n</body></html>\n')

mobile = ROOT/'mobile-app'
for name in ['ninaBridge.js', 'NinaLiveModal.js']:
    shutil.copyfile(ROOT/'.repair/mobile'/name, mobile/'src'/name)
# Apply lifecycle review corrections to the new modules.
p = ROOT/'js/nina-app-bootstrap.js'; text = p.read_text()
text = text.replace('let bridge, engine, closing;', 'let bridge, engine, closing;\nlet isClosing = false;')
text = text.replace('function failure(text) {\n', 'function failure(text) {\n  if (isClosing) return;\n')
text = text.replace("retry.addEventListener('click', () => location.reload());", "retry.addEventListener('click', () => { if (bridge) bridge.send('PV_NINA_RETRY'); else location.reload(); });")
text = text.replace('  if (closing) return closing;\n', '  if (closing) return closing;\n  isClosing = true;\n')
text = text.replace('  const identity = await bridge.initialize();', "  const identity = await bridge.initialize();\n  if (isClosing) throw new Error('Signal closed.');")
text = text.replace("  engine = await import('./nina-access.js?v=bridge01');", "  engine = await import('./nina-access.js?v=bridge01');\n  if (isClosing) { await engine.closeNativeNina(); throw new Error('Signal closed.'); }")
p.write_text(text)
p = mobile/'src/NinaLiveModal.js'; text = p.read_text()
text = text.replace("    else if (data.type === 'PV_NINA_SHOW_PROFILE') stop('profile');", "    else if (data.type === 'PV_NINA_SHOW_PROFILE') stop('profile');\n    else if (data.type === 'PV_NINA_RETRY') stop('retry');")
p.write_text(text)

p = mobile/'App.js'; text = p.read_text()
text = replace_once(text, "import { AuthPanel } from './src/AuthPanel';", "import { AuthPanel } from './src/AuthPanel';\nimport { NinaLiveModal } from './src/NinaLiveModal';\nimport { withTimeout } from './src/ninaBridge';")
text = replace_once(text, "const liveURL = `${config.siteUrl}/nina-app.html?pv_app=1&v=20260908-login02`;", '')
start = text.index('function isLivePage(url) {'); end = text.index('function WorldScreen() {', start)
text = text[:start] + text[end:]
text = replace_once(text, 'Linking, Modal, Platform,', 'Linking, Platform,')
text = replace_once(text, 'function ProfileScreen({ pending, onCancel, onContinue })', 'function ProfileScreen({ pending, onCancel, onContinue, opening })')
text = replace_once(text, '<AuthPanel onContinue={onContinue} />', '<AuthPanel onContinue={onContinue} opening={opening} />')
text = replace_once(text, "  const [nativeToken,setNativeToken]=useState('');", '')
text = replace_once(text, '  const openingRef=useRef(false);', '  const openingRef=useRef(false);\n  const openSequence=useRef(0);\n  const signedInRef=useRef(isSignedIn); signedInRef.current=isSignedIn;')
text = replace_once(text, '    openingRef.current=true;setOpening(true);', '    openingRef.current=true;setOpening(true);\n    const sequence=++openSequence.current;')
text = replace_once(text, '      const token=await getToken();', '      const token=await withTimeout(getToken());\n      if(sequence!==openSequence.current||!signedInRef.current)return;')
text = replace_once(text, '      setNativeToken(token);setPending(false);setLive(true);', '      setPending(false);setLive(true);')
text = replace_once(text, "    }catch(error){setPending(false);Alert.alert('Unable to open Nina',error?.message||'Please try again.');}", "    }catch(error){if(sequence===openSequence.current){setPending(false);Alert.alert('Unable to open Nina',error?.message||'Please try again.');}}")
text = replace_once(text, '    finally{openingRef.current=false;setOpening(false);}', '    finally{if(sequence===openSequence.current){openingRef.current=false;setOpening(false);}}')
text = replace_once(text, "  const closeLive=useCallback(()=>{setLive(false);setNativeToken('');setTab('NINA');},[]);", "  useEffect(()=>{ if(isLoaded&&!isSignedIn) setLive(false); },[isLoaded,isSignedIn]);\n  const closeLive=useCallback(()=>{setLive(false);setTab('NINA');},[]);\n  const showProfile=useCallback(()=>{setLive(false);setTab('PROFILE');},[]);")
text = replace_once(text, "  const changeTab=next=>{setPending(false);setTab(next);};", "  const changeTab=next=>{openSequence.current++;openingRef.current=false;setOpening(false);setPending(false);setTab(next);};")
text = replace_once(text, "<ProfileScreen pending={pending} onCancel={()=>{setPending(false);setTab('NINA');}} onContinue={openLive} />", "<ProfileScreen opening={opening} pending={pending} onCancel={()=>changeTab('NINA')} onContinue={openLive} />")
text = replace_once(text, "<NinaLiveModal nativeToken={nativeToken} onClose={closeLive} onSignIn={()=>{setLive(false);setNativeToken('');setTab('PROFILE');}} />", "<NinaLiveModal getToken={getToken} onClose={closeLive} onSignIn={showProfile} />")
p.write_text(text)

p = mobile/'src/AuthPanel.js'; text = p.read_text()
text = replace_once(text, "AUTH_REVISION = 'LOGIN 02'", "AUTH_REVISION = 'LOGIN 03 / BRIDGE 01'")
text = replace_once(text, 'AuthPanel({ onContinue })', 'AuthPanel({ onContinue, opening = false })')
text = replace_once(text, '<Action onPress={onContinue}>TALK TO NINA</Action>', '<Action onPress={onContinue} busy={opening}>TALK TO NINA</Action>')
text = replace_once(text, '/redirect.*(allow|valid)|allow.*redirect/i', '/redirect.*(allow|valid|authoriz|match)|allow.*redirect|authorized.*redirect/i')
p.write_text(text)
for name in ['app.json','package.json','eas.json']:
    p=mobile/name; data=json.loads(p.read_text())
    if name=='app.json': data['expo']['version']='0.4.0'
    elif name=='package.json': data['version']='0.4.0';data['scripts']['test']='node --test tests/*.test.mjs'
    else: data['build']['preview']['autoIncrement']=True
    p.write_text(json.dumps(data,indent=2)+'\n')

(ROOT/'.easignore').write_text('''# Only the independent native app belongs in the build archive.
/*
!/mobile-app/
/mobile-app/node_modules/
/mobile-app/.expo/
/mobile-app/dist/
/mobile-app/build/
/mobile-app/ios/
/mobile-app/android/
/mobile-app/.eas-build/
/mobile-app/.env
/mobile-app/.env.*
/mobile-app/credentials.json
/mobile-app/**/*.log
/mobile-app/**/*.sql
/mobile-app/**/*.p8
/mobile-app/**/*.p12
/mobile-app/**/*.before-*
/mobile-app/**/*.backup*
''')
(mobile/'.easignore').write_text('''node_modules/
.expo/
dist/
build/
ios/
android/
*.log
*.sql
.env
.env.*
*.p8
*.p12
credentials.json
*.before-*
*.backup*
''')
(mobile/'tests').mkdir(exist_ok=True)
shutil.copyfile(ROOT/'.repair/tests/ninaBridge.test.mjs',mobile/'tests/ninaBridge.test.mjs')
print('Applied BRIDGE 01 source migration; no backend authorization, pricing or credit rules changed.')
