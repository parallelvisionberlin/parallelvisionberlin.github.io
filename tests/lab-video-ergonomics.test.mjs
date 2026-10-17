import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../lab/'+path,import.meta.url),'utf8');
const html=read('studio.html'),app=read('lab.js'),
  js=read('video-ergonomics.js'),css=read('video-ergonomics.css'),
  models=read('video-models.js');

test('Seedance Create/Extend labels remove duplicate References without removing Start',()=>{
  for(const id of ['video-create-task','mode-extend','mode-text','mode-start',
    'mode-reference','reference-mode','start-mode','reference-drop','image',
    'last-image','video-references','audio-references','scene-video-open']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,
      'original native model or input remains exactly once: '+id);
  }
  assert.match(html,/id="video-create-task"[\s\S]*?<\/svg>Create<\/button>/);
  assert.match(html,/id="mode-extend"[\s\S]*?<\/svg>Extend<\/button>/);
  assert.match(html,/id="pv-mode-start-label">Start frame<\/span>/);
  assert.match(html,/id="pv-mode-reference-label">References<\/span>/);
  assert.match(js,/seedance\?'Reference set':'References'/);
  assert.match(js,/seedance\?'Opening frame':'Start frame'/);
  assert.match(css,/\.pv-video-seedance #video-modes/);
  assert.match(models,/modes: \['start', 'reference', 'text', 'extend'\]/,
    'the real Seedance provider routes must not be removed');
  assert.match(models,/image-to-video'.*reference:/,'opening image and reference routing remain separate');
});
test('Wan and reference opening-frame composer stay available without misleading combined modes',()=>{
  assert.match(models,/wan: Object\.freeze\(\{[\s\S]*?modes: \['start', 'reference'\]/);
  assert.match(html,/id="create-start-frame"[^>]*>Create opening image<\/button>/);
  assert.match(html,/Seedream image credits charged separately after review/);
  assert.equal((html.match(/id="start-frame-maker"/g)||[]).length,1);
  assert.match(css,/#reference-mode #start-frame-maker:not\(\[hidden\]\)/);
  assert.match(css,/\.video-extend-active #reference-mode #video-media-drop/);
  assert.match(css,/\.video-extend-active #reference-mode>\.scene-video-access/);
  assert.match(js,/const wan=video&&\['wan','wanprime'\]\.includes\(engine\.value\)/);
  assert.match(app,/lastVideoCreateMode/, 'Create returns to the previous submode');
  assert.match(app,/if\(mode!=='extend'&&\['text','start','reference'\]\.includes\(mode\)\)lastVideoCreateMode=mode/);
});
test('reference UI is compact but still includes the existing selected reference roles',()=>{
  assert.match(css,/#reference-list \.reference-item>img/);
  assert.match(css,/#reference-list \.reference-fields>select/);
  assert.match(css,/#reference-mode #video-motion-toggle/);
  assert.match(css,/\.video-extend-active #reference-list/);
  assert.match(css,/\.video-extend-active \.audio-media-drop/);
  assert.match(html,/video-ergonomics\.css\?v=/);
  assert.match(html,/video-ergonomics\.js\?v=/);
  assert.match(html,/&videoErgonomics=20261017-1/);
  assert.doesNotMatch(js,/fetch\s*\(|\/api\/jobs|\/api\/quotes|billing|creditCost|providerKey/,
    'UI helper never submits generation or alters credit billing');
  assert.doesNotThrow(()=>new Function(js));
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
test('Video navigation does not lose the scrollbar gutter after login finishes',()=>{
  assert.match(html,/html:has\(#app\.image-studio-active\)\{scrollbar-gutter:stable\}/);
  assert.match(html,/html:has\(#app\.video-studio-active\)\{scrollbar-gutter:stable\}/);
  assert.match(css,/grid-template-columns:clamp\(352px,26vw,395px\) minmax\(0,1fr\)/);
  assert.match(css,/\.video-feed-center\{\s*min-width:0!important;scrollbar-gutter:stable!important;/);
  assert.match(css,/transition-property:none!important/);
  assert.match(app,/\$\('app'\)\.classList\.toggle\('pv-video-ergonomic',videoMode\)/,
    'final grid columns are active before the Studio is first revealed');
  assert.match(app,/\$\('app'\)\.classList\.toggle\('pv-video-seedance',isVideo&&engine==='seedance'\)/,
    'model switching should never wait for an animation frame to update the layout');
});
