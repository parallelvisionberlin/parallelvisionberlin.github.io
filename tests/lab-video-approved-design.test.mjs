import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=(name)=>readFileSync(new URL('../lab/'+name,import.meta.url),'utf8');
const html=source('studio.html');
const css=source('video-approved-design.css');
const editor=source('video-editorial-deck.js');
const app=source('lab.js');

test('approved Video layout is constrained to Video Studio and retains real modes',()=>{
  for(const id of ['mode-text','mode-start','mode-reference','mode-extend','reference-images',
    'video-references','audio-references','image','last-image','video-model-trigger',
    'scene-video-open','generate','duration','resolution','ratio','audio']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,
      'preserve one real working '+id);
  }
  assert.match(html,/video-approved-design\.css\?v=/);
  assert.match(css,/#app\.video-studio-active\.pv-video-approved-ready/);
  assert.match(css,/grid-template-columns:clamp\(406px,30\.4vw,516px\)/);
  assert.doesNotMatch(css,/#app\.image-studio-active/);
  assert.doesNotMatch(css,/#app\.upscale-studio-active/);
});

test('selected references remain editable and previews remain authentic',()=>{
  for(const id of ['pv-video-ref-title','pv-video-added-count','pv-video-clear-refs',
    'pv-video-prompt-head','pv-video-prompt-count','pv-video-model-pill',
    'pv-video-model-pill-label','pv-video-audio-pill','pv-video-audio-pill-label',
    'pv-video-detail-references','pv-video-detail-reference-strip']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  assert.match(editor,/referenceList\.querySelectorAll\('\.reference-item>img'\)/);
  assert.match(editor,/collage\.dataset\.illustrative=String\(showingExample\)/,
    'a single editorial still is explicitly marked as illustrative');
  assert.match(editor,/Fashion After Fabric editorial image, not a video or uploaded reference/,
    'the fallback never claims to be a generated result or actual user reference');
  assert.match(editor,/modelPill\?\.addEventListener\('click'/);
  assert.match(editor,/audioPill\?\.addEventListener\('click'/);
  assert.match(app,/updateVideoInspectorReferences\(job\)/);
  assert.match(app,/composerAssetPhoto\(tile,ids\[i\]\)/,'private authenticated thumbnails only');
  assert.match(app,/pvStrip\.replaceChildren\(\)/,'private reference thumbnails cleared at sign-out');
});

test('white Generate remains priced/disabled by original generation flow',()=>{
  assert.match(css,/background:linear-gradient\(180deg,#fcfcfd 0%,#e6e8eb 96%\)!important/);
  assert.match(css,/generate:disabled/);
  assert.doesNotMatch(editor,/\/api\/jobs|\/api\/quotes|fetch\s*\(|submitQuotedGeneration/);
  assert.doesNotThrow(()=>new Function(editor));
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
