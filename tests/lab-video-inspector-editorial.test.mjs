import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL('../lab/'+name,import.meta.url),'utf8');
const html=file('studio.html');
const js=file('lab.js');
const css=file('video-inspector-editorial.css');
const history=file('video-refresh.css');

test('final Scene details stylesheet is last and scoped to the right inspector',()=>{
  assert.match(html,/video-film-dossier\.css\?v=[^"\n]+"><\/link>|video-film-dossier\.css\?v=[^"\n]+">\n<link rel="stylesheet" href="\.\/video-inspector-editorial\.css\?v=20261101-dossier-finish1"/);
  assert.match(css,/#video-inspector-selected/);
  assert.doesNotMatch(css,/#history|#generate|#video-engine|#video-feed-center|\.video-feed-center/,
    'the final layout must not touch History, Generate, model selection or player');
  assert.doesNotMatch(css,/\/api\/jobs|confirm:true|creditCost/,
    'the presentation cannot trigger generation or billing');
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('video dossier has a readable editorial hierarchy and safe small-screen behavior',()=>{
  assert.match(css,/video-detail-model\{/);
  assert.match(css,/font:550 16px\/1\.35/);
  assert.match(css,/video-detail-prompt\{/);
  assert.match(css,/font:400 13px\/1\.65/);
  assert.match(css,/pv-video-detail-reference-strip \.pv-video-ref-thumb\{/);
  assert.match(css,/flex:0 0 73px!important/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/video-detail-data dt span\{/);
  assert.match(css,/clip-path:none!important/,'technical labels are visible');
  assert.match(css,/@media\(max-width:820px\)/);
  assert.match(css,/overflow:visible!important/,'mobile details do not create a second scrolling pane');
  assert.match(css,/#video-inspector-selected\[hidden\]\{display:none!important\}/);
});

test('Video History, main editor controls and original actions are retained',()=>{
  assert.match(history,/grid-template-columns:repeat\(auto-fill,minmax\(min\(100%,245px\),1fr\)\)/);
  for(const id of ['video-detail-reuse','video-detail-download','video-detail-delete','video-detail-copy-prompt']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
    assert.ok(js.includes("$('"+id+"').onclick="),'original '+id+' click handler stays connected');
  }
  assert.match(html,/id="pv-video-primary-actions"|class="pv-video-primary-actions"/);
  assert.match(html,/id="video-model-control"/);
  assert.match(html,/id="generate"/);
});

test('Video aspect ratio comes from actual saved output dimensions when known',()=>{
  assert.match(js,/function displaySavedVideoRatio\(job\)/);
  assert.match(js,/resultId===job\.outputId&&video\?\.videoWidth>0/);
  assert.match(js,/geometry\?\.assetId===job\?\.outputId/);
  assert.match(js,/\$\('video'\)\.addEventListener\('loadedmetadata'/);
  assert.match(js,/\$\('video-detail-ratio'\)\.textContent=displaySavedVideoRatio\(job\)/);
  assert.match(js,/return String\(job\?\.settings\?\.aspectRatio\|\|'Source'\)/,
    'unknown dimensions retain the user-selected original ratio rather than inventing values');
});
