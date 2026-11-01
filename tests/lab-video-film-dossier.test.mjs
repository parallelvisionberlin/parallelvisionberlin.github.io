import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL('../lab/'+name,import.meta.url),'utf8');
const html=file('studio.html');
const css=file('video-film-dossier.css');
const script=file('lab.js');

test('approved second mockup is the final Video Studio-only visual layer',()=>{
  assert.match(html,/video-playback-focus\.css[^\n]*\n<link rel="stylesheet" href="\.\/video-film-dossier\.css\?v=/,
    'film dossier stylesheet comes after older Video skins');
  assert.match(css,/#app\.video-studio-active/,'design is restricted to Video Studio');
  assert.doesNotMatch(css,/fetch\s*\(|\/api\/jobs|creditCost|confirm:true/,
    'design cannot bill or generate');
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'CSS blocks balance');
});

test('saved Video film dossier preserves real controls and accessible secondary actions',()=>{
  for(const id of ['video-detail-watch','video-detail-reuse','video-detail-download',
      'video-detail-delete','video-detail-extra','video-detail-model','video-detail-prompt',
      'video-detail-prompt-toggle','video-detail-resolution','video-detail-duration',
      'video-detail-ratio','video-detail-date']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  assert.match(html,/<details id="pv-video-scene-actions"[^>]*hidden>/,
    'the action menu stays absent until a video is selected');
  assert.match(html,/aria-label="Saved video actions"/);
  assert.match(script,/actionsMenu\.hidden=!job/,
    'menu visibility follows the actual saved selection');
  assert.match(script,/actionsMenu\.dataset\.record!==key/,
    'switching video closes the previous menu');
  assert.match(css,/\.pv-video-scene-actions:not\(\[open\]\)>\.video-inspector-actions\{display:none!important\}/,
    'closed dropdown controls are not painted');
});

test('real generated videos retain original aspect ratio and create states retain one stable stage',()=>{
  assert.match(css,/object-fit:contain!important/,'saved film is never stretched or cropped');
  assert.match(css,/--pv-video-stage-height:clamp\(/,'one stage height variable for all models');
  assert.match(css,/\.stage:has\(#empty:not\(\[hidden\]\)\)/,
    'the unloaded stage uses the same editorial shell');
  assert.match(css,/\.pv-video-create-inspector \.pv-video-scene-model img\{\s*display:none!important/,
    'draft model panel has no misleading fixed model thumbnail');
  assert.match(html,/id="video-engine"/,'native model selection remains');
  assert.match(html,/id="video-modes"/,'native mode choices remain');
  assert.match(html,/id="video-job-stage"/,'live generation state remains');
});

test('Video History becomes a genuine horizontal filmstrip without forcing full-library loads',()=>{
  assert.match(css,/grid-auto-flow:column!important/);
  assert.match(css,/overflow-x:auto!important/);
  assert.match(css,/scroll-snap-type:x proximity/);
  assert.match(css,/\.card\.is-current-video/,'selected film remains distinct');
  assert.match(html,/id="history-select"/);
  assert.match(html,/id="refresh"/);
  assert.match(html,/id="more"/);
  assert.match(script,/const desktopVideoFilmstrip=tool==='video'/);
  assert.match(script,/!desktopVideoFilmstrip/,'desktop filmstrip disables automatic bottom-edge pagination');
  assert.match(script,/\$\('more'\)\.onclick=loadEarlierHistory/,'manual older History still works');
});
