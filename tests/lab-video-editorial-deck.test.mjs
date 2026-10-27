import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=(filename)=>readFileSync(new URL('../lab/'+filename,import.meta.url),'utf8');
const html=src('studio.html'), css=src('video-editorial-deck.css'), js=src('video-editorial-deck.js');

test('editorial Video UI retains the actual generation controls and every Video mode',()=>{
  for(const id of [
    'video-model-control','video-engine','mode-text','mode-start','mode-reference',
    'video-create-task','mode-extend','drop','last-drop','image','last-image',
    'reference-drop','reference-images','reference-media','video-references',
    'audio-references','scene-video-open','reference-list','prompt','duration',
    'resolution','ratio','audio','generate','save','video-feed-center','video-inspector'
  ])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,
    'Original Video control preserved exactly once: '+id);
});
test('new affordances remain separate from Image Studio and preserve original APIs',()=>{
  for(const id of ['video-motion-toggle','pv-video-output-toggle','pv-video-output-summary']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  assert.match(html,/video-editorial-deck\.css\?v=/);
  assert.match(html,/video-editorial-deck\.js\?v=/);
  assert.match(html,/Saved References<\\/span>/);
  assert.match(html,/Browse saved references<\\/button>/);
  assert.match(html,/Characters, outfits &amp; more/);
  assert.doesNotMatch(html,/Browse scene library|<span>Scene Library<\\/span>/);
  assert.match(css,/#app\.video-studio-active/);
  assert.match(css,/\.pv-video-deck-ready/,'the advanced disclosure fails open without JS');
  assert.match(css,/#generate:not\(:disabled\):hover/);
  assert.match(css,/background:#e8e9e9!important/,'the button uses PV LAB satin white, not competitor neon');
  assert.match(js,/referenceMode\.dataset\.pvMotionOpen/,'video\/audio refs use a real disclosure');
  assert.match(js,/getElementById\('video-motion-toggle'\)/);
  assert.match(js,/getElementById\('pv-video-output-toggle'\)/);
  assert.match(js,/referenceList\.querySelectorAll\('\.reference-item>img'\)/,'montage uses genuine uploaded reference thumbnails');
  assert.doesNotMatch(js,/\bfetch\s*\(|\/api\/jobs|credits\s*=|apiKey|providerKey/,'presentation must never submit paid work or change pricing');
  assert.doesNotThrow(()=>new Function(js),'client-side enhancement should parse as JavaScript');
});

test('a saved Character becomes one named Video asset, not a stack of unexplained uploads',()=>{
  const lab=src('lab.js');
  const library=src('scene-library.js');
  const videoStyles=src('video-restored-editorial.css');
  assert.match(js,/Character attached/);
  assert.match(js,/reference-element-item/);
  assert.match(lab,/name.textContent=r.elementName/);
  assert.match(lab,/saved photos/);
  assert.doesNotMatch(lab,/selected view.*of .* saved/);
  assert.match(library,/host.hidden=!selected.length\|\|getContext\(\).tool==='video'/);
  assert.match(videoStyles,/reference-item.reference-element-item/);
  assert.match(html,/<strong>Reference images <span id="pv-video-added-count">/);
});
