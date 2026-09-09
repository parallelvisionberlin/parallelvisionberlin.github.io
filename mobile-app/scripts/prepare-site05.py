from pathlib import Path
import subprocess, json, hashlib
ROOT=Path(__file__).resolve().parents[2]
APP=ROOT/'mobile-app'
SOURCE='ee75bcd7e921df14187ed0de5743741bf97d1a9a'
subprocess.run(['git','fetch','origin',SOURCE,'--depth=1'],cwd=ROOT,check=True)
DEST=APP/'assets/site05';DEST.mkdir(parents=True,exist_ok=True)
media={
 'city.mp4':'assets/optimized/video/2063/darkharmonyhero-mobile.mp4',
 'nina-room.mp4':'assets/optimized/video/nina-fok/ninaloophero-mobile.mp4',
 'city-source.webp':'assets/optimized/thecitysuperhd1.webp',
 'fashion-source.webp':'assets/optimized/fashion-hero.webp',
 'stay-low-source.webp':'assets/optimized/artworks/staylowart.webp',
}
manifest={'sourceCommit':SOURCE,'files':{}}
for name,path in media.items():
 data=subprocess.check_output(['git','show',f'{SOURCE}:{path}'],cwd=ROOT)
 assert len(data)>1000,path
 (DEST/name).write_bytes(data)
 manifest['files'][name]={'source':path,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
for video,poster in [('city.mp4','city-poster.jpg'),('nina-room.mp4','nina-poster.jpg')]:
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss','1','-i',str(DEST/video),'-frames:v','1','-vf','scale=900:-1','-q:v','3',str(DEST/poster)],check=True)
for base in ['city','fashion','stay-low']:
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(DEST/(base+'-source.webp')),'-vf','scale=1000:-1','-frames:v','1','-q:v','3',str(DEST/(base+'.jpg'))],check=True)
 (DEST/(base+'-source.webp')).unlink()
for p in DEST.glob('*.jpg'):
 manifest['files'][p.name]={'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'derivedFrom':'Original website media; frame extraction or format conversion only'}
(APP/'src/site05Assets.js').write_text("// Original website media, bundled for startup and offline fallback.\nexport const siteAssets = {\n"+''.join(f"  {key}: require('../assets/site05/{name}'),\n" for key,name in [('cityVideo','city.mp4'),('ninaVideo','nina-room.mp4'),('cityPoster','city-poster.jpg'),('ninaPoster','nina-poster.jpg'),('city','city.jpg'),('fashion','fashion.jpg'),('stayLow','stay-low.jpg')])+"};\n")
(DEST/'provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Align only the obsolete art assertion. The three call/bridge tests stay unchanged.
p=APP/'tests/immersive.test.mjs';text=p.read_text();marker="test('native artwork is bundled and Home uses the existing Berlin road film'"
assert marker in text
text=text[:text.index(marker)]+'''test('canonical website films and posters are bundled, with no generated portrait dependency',()=>{
 const assets=readFileSync(new URL('../src/site05Assets.js',import.meta.url),'utf8');
 const media=readFileSync(new URL('../src/SiteMedia.js',import.meta.url),'utf8');
 const screens=readFileSync(new URL('../src/DeckScreens.js',import.meta.url),'utf8');
 assert.match(assets,/city.mp4/); assert.match(assets,/nina-room.mp4/);
 assert.match(assets,/city-poster.jpg/); assert.match(assets,/nina-poster.jpg/);
 assert.doesNotMatch(screens,/deck04\\/nina-portrait/);
 assert.match(media,/nativeControls=\\{false\\}/);
 assert.match(media,/onFirstFrameRender/);
 assert.match(media,/mixWithOthers/);
 for(const name of ['DeckHome','DeckNina','Deck2063','DeckMusic','DeckNav'])assert.match(screens,new RegExp('export function '+name));
});
'''
p.write_text(text)
print('Original website media prepared. No generated artwork or Worker changes.')
