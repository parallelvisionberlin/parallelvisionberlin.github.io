from pathlib import Path
import hashlib, re, subprocess, urllib.request, shutil
from PIL import Image, ImageDraw

APP_BASE='aaa379524baf4f3dd28c69ea8cf56543a60d5386'
subprocess.run(['git','fetch','--depth=1','origin',APP_BASE],check=True)
subprocess.run(['git','restore','--source='+APP_BASE,'--staged','--worktree','--','mobile-app'],check=True)
app=Path('mobile-app'); assets=app/'assets/deck04'; assets.mkdir(parents=True,exist_ok=True)
url='https://d2ol7oe51mr4n9.cloudfront.net/user_36QWljeNVgnwNMkZtgtVQjVUBoW/cc51faf0-c080-4c49-a6d4-530aa28bfb55.png'
raw=urllib.request.urlopen(url,timeout=30).read()
assert hashlib.sha256(raw).hexdigest()=='a71e3eaf904cb0809844c5a095b2e1a5854ea6f1049405626914bceab81d2e3e','Approved mockup checksum mismatch'
import io
im=Image.open(io.BytesIO(raw)); w,h=im.size
im.crop((int(w*.252),int(h*.162),int(w*.831),int(h*.573))).convert('RGB').save(assets/'nina-portrait.jpg',quality=92,optimize=True)
webassets=Path('assets/app/deck04'); webassets.mkdir(parents=True,exist_ok=True)
shutil.copyfile(assets/'nina-portrait.jpg',webassets/'nina-portrait.jpg')
for name in ['home','nina','world','music','profile','mic']:
 image=Image.new('RGBA',(96,96)); d=ImageDraw.Draw(image); c=(239,242,234,255); stroke=4
 def line(points):d.line(points,fill=c,width=stroke,joint='curve')
 if name=='home':
  line([(14,44),(48,14),(82,44),(82,81),(59,81),(59,58),(37,58),(37,81),(14,81),(14,44)])
 elif name=='nina':
  d.ellipse((15,15,81,81),outline=c,width=stroke); d.ellipse((30,30,66,66),outline=c,width=stroke)
 elif name=='world':
  d.rounded_rectangle((30,13,83,65),radius=5,outline=c,width=stroke); d.rounded_rectangle((13,30,66,83),radius=5,outline=c,width=stroke)
 elif name=='music':
  line([(37,67),(37,23),(78,13),(78,57)]);d.ellipse((13,58,37,77),outline=c,width=stroke);d.ellipse((54,48,78,67),outline=c,width=stroke)
 elif name=='profile':
  d.ellipse((33,13,63,43),outline=c,width=stroke);d.arc((14,47,82,106),180,360,fill=c,width=stroke)
 else:
  d.rounded_rectangle((37,10,59,62),radius=11,outline=c,width=stroke);d.arc((24,30,72,74),0,180,fill=c,width=stroke);line([(24,39),(24,52)]);line([(72,39),(72,52)]);line([(48,74),(48,88)]);line([(35,88),(61,88)])
 image.resize((72,72),Image.Resampling.LANCZOS).save(assets/(name+'.png'))
shutil.copyfile('scripts/deck04/DeckScreens.js',app/'src/DeckScreens.js')

def replace(text,old,new,count=1):
 assert text.count(old)==count, 'Source changed: '+old[:90]
 return text.replace(old,new)
p=app/'App.js';s=p.read_text()
s=replace(s,"import { NinaLiveModal } from './src/NinaLiveModal';","import { NinaLiveModal } from './src/NinaLiveModal';\nimport { DeckHome, DeckNina, DeckNav } from './src/DeckScreens';")
s=replace(s,"screen=<NinaScreen onTalk={openLive} busy={opening} />;","screen=<DeckNina onTalk={openLive} busy={opening} setTab={changeTab} />;")
s=replace(s,"screen=<HomeScreen setTab={changeTab} onTalk={openLive} busy={opening} paused={live} />;","screen=<DeckHome setTab={changeTab} onTalk={openLive} busy={opening} paused={live} />;")
start=s.index('    <View style={styles.nav}>{tabs.map(');end=s.index('    {live && <NinaLiveModal',start)
s=s[:start]+"    <DeckNav tab={tab} onChange={changeTab} />\n"+s[end:]
s=replace(s,'{sectionCodes[tab]}','PV / 2063')
s=replace(s,'      <AuthPanel onContinue={onContinue} opening={opening} />','      <AuthPanel onContinue={onContinue} opening={opening} />\n      <Text style={{color:"#899087",fontSize:10,letterSpacing:2,marginTop:24}}>DECK 04</Text>')
p.write_text(s)
p=app/'src/ninaBridge.js';s=p.read_text();s=replace(s,'/nina-app.html?pv_app=1&v=bridge01','/nina-app.html?pv_app=1&v=deck04&pv_deck=04');p.write_text(s)
p=app/'src/NinaLiveModal.js';s=p.read_text();s=replace(s,'hidden={immersive}','hidden={false}')
s=replace(s,'{!immersive && <SafeAreaView style={styles.safeHeader}>','<SafeAreaView style={styles.safeHeader}>')
s=replace(s,'      </SafeAreaView>}','      </SafeAreaView>')
s=replace(s,'      <View style={styles.stage}>','      <View style={styles.deck}>')
start=s.index('      {immersive && <SafeAreaView');end=s.index('    </View>\n  </Modal>',start)
s=s[:start]+s[end:]
s=replace(s,'const styles = StyleSheet.create({',"const styles = StyleSheet.create({\n  deck:{flex:1,marginHorizontal:9,marginBottom:24,marginTop:4,borderWidth:StyleSheet.hairlineWidth,borderColor:'#414940',borderRadius:5,overflow:'hidden',backgroundColor:'#020303'},")
p.write_text(s)
# No existing capture, stream, authentication or Worker code is replaced.
p=Path('js/nina-access.js');s=p.read_text();assert 'function getNinaDeckStream' not in s
s+='\n// Read-only stream access for the opt-in native presentation. Capture ownership stays here.\nexport function getNinaDeckStream() {\n  return window.location.pathname === "/nina-app.html" && new URLSearchParams(window.location.search).get("pv_deck") === "04" ? ninaMicrophoneStream : null;\n}\n';p.write_text(s)
p=Path('js/nina-app-bootstrap.js');s=p.read_text();s=replace(s,'let bridge, engine, closing;','let bridge, engine, closing, deck;')
s=replace(s,"import('./nina-access.js?v=recovery01')","import('./nina-access.js?v=recovery01-deck04')")
s=replace(s,'  engine = importedEngine;','  engine = importedEngine;\n  if (new URLSearchParams(location.search).get("pv_deck") === "04") {\n    try {\n      const ui = await import("./nina-deck04.js?v=04");\n      if (!isClosing) deck = ui.installNinaDeck({ getStream: () => engine.getNinaDeckStream() });\n    } catch { /* Presentation must not block a working call. */ }\n  }')
s=replace(s,'  isClosing = true;','  isClosing = true;\n  deck?.dispose();')
p.write_text(s)
p=Path('nina-app.html');s=p.read_text();s,n=re.subn(r'(<script type="module" src="\./js/nina-app-bootstrap.js\?v=)[^"\s]+',r'\g<1>deck04',s);assert n==1
s=replace(s,'<body ','<body data-pv-deck-release="04" ');p.write_text(s)
# A visible design revision and immutable sources will be used by the build script.
print('DECK 04 prepared: approved cropped portrait, Berlin film, native screens, opt-in live deck, existing-stream mic controls.')
