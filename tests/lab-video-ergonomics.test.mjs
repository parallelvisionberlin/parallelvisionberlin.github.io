import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=name=>readFileSync(new URL('../lab/'+name,import.meta.url),'utf8');
const html=source('studio.html'),app=source('lab.js'),
  css=source('video-restored-editorial.css'),editor=source('video-editorial-deck.js'),
  models=source('video-models.js');

test('the approved editorial deck replaces the superseded compact layer',()=>{
  assert.match(html,/video-restored-editorial\.css\?v=20261018-approved-restoration1/);
  assert.doesNotMatch(html,/<link[^>]*video-ergonomics\.css/);
  assert.doesNotMatch(html,/<script[^>]*video-ergonomics\.js/);
  assert.match(css,/grid-template-columns:clamp\(398px,28vw,484px\) minmax\(0,1fr\) clamp\(245px,16\.5vw,282px\)/);
  assert.match(css,/#app\.video-studio-active>.workspace\.video-layout/,'final track widths apply in the very first render');
  assert.match(css,/#app\.video-studio-active\.pv-video-approved-ready\.pv-video-state-ready/,
    'the restored visual rules override earlier design layers');
  assert.match(css,/min-height:41px!important;height:41px!important/,
    'Create and Extend remain usable while slightly more compact');
  assert.match(css,/min-height:41px!important;height:41px!important/,
    'Text, Start frame and Reference set remain equally legible');
  assert.match(css,/font-size:14px!important;line-height:1\.62!important/,
    'Prompt remains readable, not condensed to 13px');
});

test('the model capability matrix and credit/generation controls are unchanged',()=>{
  for(const id of ['video-create-task','mode-extend','mode-text','mode-start',
    'mode-reference','reference-mode','start-mode','reference-drop','image',
    'last-image','video-references','audio-references','scene-video-open',
    'pv-video-model-pill','duration','ratio','resolution','audio','generate']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,
      'real production model input remains: '+id);
  }
  assert.match(models,/modes: \['start', 'reference', 'text', 'extend'\]/,
    'Seedance retains all independent native Start, Reference, Text, Extend routes');
  assert.match(models,/wan: Object\.freeze\(\{[\s\S]*?modes: \['start', 'reference'\]/);
  assert.match(html,/id="video-create-task"[\s\S]*?<\/svg>Create<\/button>/);
  assert.match(html,/id="mode-extend"[\s\S]*?<\/svg>Extend<\/button>/);
  assert.match(css,/#video-modes \.mode-tab:not\(\[hidden\]\)/);
  assert.match(css,/\.video-extend-active #reference-mode #video-media-drop/);
  assert.match(app,/lastVideoCreateMode/);
  assert.match(css,/#reference-list \.reference-fields>select/,
    'Identity/outfit/location roles remain editable');
  assert.match(css,/#reference-mode #start-frame-maker:not\(\[hidden\]\)/,
    'Wan opening-frame creation remains compact and separate from video pricing');
});
test('the empty video invitation uses one approved Fashion After Fabric still, not train imagery',()=>{
  const start=html.slice(html.indexOf('id="pv-video-start-visual"'),
    html.indexOf('id="pv-video-text-visual"'));
  assert.match(start,/class="pv-video-start-editorial"/);
  assert.doesNotMatch(start,/<img[^>]*src=/,
    'the Start invitation does not contain fake beginning/ending photographs');
  assert.match(css,/\.pv-video-start-editorial/);
  assert.match(css,/visuals\/invite-after-fabric-user-approved-20261014\.webp/);
  assert.match(editor,/const examples=\['\.\/visuals\/invite-after-fabric-user-approved-20261014\.webp'\]/,
    'the same single PV LAB still is shown before references are added');
  assert.doesNotMatch(editor,/dreamcore-train-20261010\.webp/);
  assert.match(editor,/const visuals=showingExample\?examples:thumbnails/,
    'real attached photographs replace the illustrative still');
  assert.match(editor,/collage\.dataset\.illustrative=String\(showingExample\)/,
    'the UI distinguishes saved reference images from the illustration');
  assert.doesNotMatch(editor,/fetch\s*\(|\/api\/jobs|\/api\/quotes|creditCost/);
  assert.doesNotThrow(()=>new Function(editor));
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
test('Video first-paint width and scrollbar gutter stay stable without affecting Image',()=>{
  assert.match(html,/html:has\(#app\.image-studio-active\)\{scrollbar-gutter:stable\}/);
  assert.match(html,/html:has\(#app\.video-studio-active\)\{scrollbar-gutter:stable\}/);
  assert.match(css,/transition-property:none!important/);
  assert.match(css,/scrollbar-gutter:stable!important/);
  assert.match(app,/\$\('app'\)\.classList\.toggle\('pv-video-ergonomic',videoMode\)/,
    'Video route is established before the overlay finishes');
});


test('mode naming, compact Video rail and mode-specific preview copy are Video-only',()=>{
  const scene=source('video-scene-states.js');
  assert.match(html,/id="pv-mode-reference-label">Reference set<\/span>/);
  assert.equal((html.match(/<h3>Attached images<\/h3>/g)||[]).length,2);
  assert.match(app,/isVideo\?'Upload images':'Add identity, wardrobe or set references'/);
  assert.match(app,/isVideo\?'Reference set':'References'/);
  assert.match(app,/title:'Guide the motion with references'/);
  assert.match(app,/title:'Describe the scene'/);
  assert.match(scene,/text:\['Describe the scene'/);
  assert.match(scene,/reference:\['Guide the motion with references'/);
  assert.match(editor,/textContent='Guide the motion with references'/);
  assert.match(css,/content:"Upload images"!important/);
  assert.match(css,/grid-template-columns:clamp\(360px,29\.5vw,400px\)/);
  assert.match(css,/grid-template-columns:clamp\(304px,31vw,348px\)/);
  assert.match(css,/@media\(min-width:821px\) and \(max-width:1299px\)/);
  assert.match(css,/@media\(min-width:821px\) and \(max-width:1040px\)/);
  assert.match(app,/mode==='extend'/,'Extend remains an independent native flow');
  assert.match(html,/<span class="label" id="start-label">Start frame<\/span><span class="micro">Required<\/span>/);
  assert.match(html,/<span class="label">End frame<\/span><span class="micro">Optional<\/span>/);
  assert.match(html,/id="scene-video-open"/);
  assert.match(html,/id="video-motion-toggle"/);
});
