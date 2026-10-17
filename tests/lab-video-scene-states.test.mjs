import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL('../lab/'+name,import.meta.url),'utf8');
const html=file('studio.html'),app=file('lab.js'),js=file('video-scene-states.js'),css=file('video-scene-states.css');

test('all four Video modes keep the production inputs and original two-frame interaction',()=>{
  for(const id of ['mode-text','mode-start','mode-reference','mode-extend',
    'video-engine','image','last-image','drop','last-drop','reference-images',
    'video-references','audio-references','scene-video-open','prompt',
    'duration','resolution','ratio','audio','generate']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,
      'real existing input remains: '+id);
  }
  assert.match(css,/pv-video-mode-start #start-mode \.frame-pair\{\s*display:grid!important;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(css,/#last-upload:not\(\[hidden\]\)/,'do not show an unsupported end-frame input');
  assert.match(css,/#last-drop \.video-frame-thumb:not\(\[hidden\]\)/,'existing end-frame image preview is reused');
  assert.match(css,/pv-video-mode-text.*textarea#prompt/,'Text mode gets its own prompt size');
  assert.match(css,/video-studio-active/,'styles never override Image, Retouch or Upscaler');
});

test('History loads records without automatically selecting or replacing the create stage',()=>{
  const first=app.indexOf('function restoreLatestVideoSelection(){');
  const last=app.indexOf('\nfunction syncVideoStudioMode()',first);
  assert.ok(first>0&&last>first);
  const restore=app.slice(first,last);
  assert.doesNotMatch(restore,/showVideoHistoryRecord\(available\[0\]/,
    'history loading must never auto-select the first saved video');
  assert.match(restore,/if\(selectedVideoJob&&videoJobCache\.has\(selectedVideoJob\.id\)\)/,
    'explicit selections survive ordinary History refresh');
  assert.match(restore,/updateVideoInspector\(null\)/,'without selection show real current scene');
  assert.match(app,/pv-video-history-back'\)\.onclick/,'explicit History selection has a return action');
  assert.match(app,/function clearVideoHistorySelection/);
  assert.match(app,/function showVideoHistoryRecord\(job/,'manual History viewing is still supported');
  assert.match(app,/showVideoHistoryRecord\(j,\{play:true,reveal:true\}\)/,
    'click on a real History video still loads the existing player');
});

test('live Scene details and empty-state illustration are not fake generated results',()=>{
  for(const id of ['pv-video-history-back','pv-video-start-visual','pv-video-text-visual',
    'video-inspector-empty','pv-video-current-model','pv-video-current-prompt',
    'pv-video-current-references','pv-video-current-duration',
    'pv-video-current-resolution','pv-video-current-ratio','pv-video-current-audio']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  assert.match(html,/Illustrative PV LAB frames/);
  assert.match(html,/Illustrative PV LAB moods/);
  assert.match(js,/const history=app\.classList\.contains\('pv-video-history-selected'\)/);
  assert.match(js,/if\(!visible\)return/,'example visuals disappear when viewing History or uploads');
  assert.match(js,/referenceList\.querySelectorAll\('\.reference-item'\)/);
  assert.match(js,/img\.src=item\.src/,'current references use the already attached real images');
  assert.match(app,/const sceneFoot=\$\('pv-video-sidebar-footnote'\)/,
    'the actual live scene inspector is not wiped on null selection');
  assert.doesNotMatch(js,/fetch\s*\(|\/api\/jobs|\/api\/quotes|confirm:|creditCost|apiKey/,
    'presentation never initiates generation, billing or private API access');
  assert.doesNotThrow(()=>new Function(js));
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
