import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL('../lab/'+name,import.meta.url),'utf8');
const html=file('studio.html'),app=file('lab.js'),js=file('video-scene-states.js'),css=file('video-scene-states.css'),detailCss=file('video-playback-focus.css');

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

test('Start and End frame controls use identical accessible upload affordances',()=>{
  const start=html.match(/<div id="start-mode"[\s\S]*?<div id="reference-mode"/)?.[0]||'';
  assert.match(start,/<span class="label" id="start-label">Start frame<\/span><span class="micro">Required<\/span>/);
  assert.match(start,/<span class="label">End frame<\/span><span class="micro">Optional<\/span>/);
  assert.equal((start.match(/class="pv-frame-upload-icon"/g)||[]).length,2,
    'Matching upload icon in both real file inputs');
  assert.equal((start.match(/class="video-frame-label">Choose image<\/span>/g)||[]).length,2,
    'Both upload tiles use the same action copy');
  for(const id of ['image','last-image','video-start-thumb','video-end-thumb']){
    assert.equal((start.match(new RegExp('id="'+id+'"','g'))||[]).length,1,
      'retain native handler and selected-frame thumbnail '+id);
  }
  assert.match(css,/\.pv-video-start-visual \.pv-scene-frame-symbol/,
    'The center uses neutral frame artwork, not example photographs');
  assert.match(css,/#drop\.has-frame \.video-frame-label:after/,
    'Selecting a frame changes the upload affordance to Replace image');
  assert.match(css,/#last-drop\.has-frame \.video-frame-label:after/,
    'End frame uses the same replace behavior');
});

test('History opens the newest completed video and respects Clear and manual selections',()=>{
  const first=app.indexOf('function restoreLatestVideoSelection(){');
  const last=app.indexOf('\nfunction syncVideoStudioMode()',first);
  assert.ok(first>0&&last>first);
  const restore=app.slice(first,last);
  assert.match(restore,/if\(selectedVideoJob&&videoJobCache\.has\(selectedVideoJob\.id\)\)/,
    'a selected History video is retained when saved records refresh');
  assert.match(restore,/if\(historyLoading\)return/,
    'wait until the complete saved History page is available');
  assert.match(restore,/if\(!videoHistoryAutoSuppressed\)/,
    'explicit Clear and return must not instantly auto-restore the result');
  assert.match(restore,/job\.status==='completed'&&hasResult\(job\)/,
    'only a genuinely completed video with a stored output can open by default');
  assert.match(restore,/\.sort\(\(a,b\)=>/,
    'the newest video is chosen by creation date rather than gallery insertion');
  assert.match(restore,/showVideoHistoryRecord\(latest,\{play:true,reveal:false\}\)/,
    'latest saved result loads into the existing central player without page scroll');
  assert.match(restore,/assetLibrary\?\.active\(\)/,
    'Assets does not auto-open a video behind its own gallery');
  assert.match(app,/clearVideoHistorySelection\(\{reset:false,suppressAuto:true\}\)/,
    'Clear or mode change explicitly restores the editorial landing surface');
  assert.match(app,/clearVideoHistorySelection\(\{suppressAuto:true\}\)/,
    'Back to create explicitly suppresses automatic restoration');
  assert.match(app,/if\(loadId===historyLoadId\)\{historyLoading=false;updateHistoryPagination\(\);if\(owner&&tool==='video'/,
    'the final restored result is chosen once loading has finished');
  assert.match(app,/showVideoHistoryRecord\(j,\{play:true,reveal:true\}\)/,
    'clicking another real History result still replaces the main player');
  assert.doesNotMatch(restore,/\/api\/jobs|submitQuotedGeneration|confirm:true/,
    'restoring a saved video must not create a paid request');
});

test('live Scene details and empty-state illustration are not fake generated results',()=>{
  for(const id of ['pv-video-history-back','pv-video-start-visual','pv-video-text-visual',
    'video-inspector-empty','pv-video-current-model','pv-video-current-prompt',
    'pv-video-current-references','pv-video-current-duration',
    'pv-video-current-resolution','pv-video-current-ratio','pv-video-current-audio']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  assert.doesNotMatch(
    html.slice(html.indexOf('id="pv-video-start-visual"'),html.indexOf('id="pv-video-text-visual"')),
    /<img[^>]*src=/,
    'Empty Start and End frames use neutral editorial placeholders, never unrelated invented photographs'
  );
  assert.match(html,/Illustrative PV LAB moods/);
  assert.match(js,/const history=app\.classList\.contains\('pv-video-history-selected'\)/);
  assert.match(js,/if\(!visible\)return/,'example visuals disappear when viewing History or uploads');
  assert.match(js,/referenceList\.querySelectorAll\('\.reference-item'\)/);
  assert.match(js,/img\.src=item\.src/,'current references use the already attached real images');
  assert.doesNotMatch(app,/\$\('video-inspector-empty'\)\.textContent\s*=/,
    'sending status must preserve the current-scene child controls');
  assert.match(app,/const sceneFoot=\$\('video-inspector-empty'\)\.querySelector\('\.pv-video-sidebar-footnote'\)/,
    'the actual live scene inspector is not wiped on null selection');
  assert.doesNotMatch(js,/fetch\s*\(|\/api\/jobs|\/api\/quotes|confirm:|creditCost|apiKey/,
    'presentation never initiates generation, billing or private API access');
  assert.doesNotThrow(()=>new Function(js));
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('Saved result details use expandable prompts and verified metadata chips',()=>{
  assert.match(html,/id="video-detail-prompt-toggle"[^>]*aria-controls="video-detail-prompt"[^>]*aria-expanded="false"[^>]*hidden/,
    'prompt disclosure is a real accessible control, closed by default');
  assert.match(app,/function syncVideoDetailPromptToggle\(\)/,
    'disclosure is updated from actual overflow');
  assert.match(app,/prompt\.scrollHeight>prompt\.clientHeight\+2/,
    'short prompts do not get a meaningless expand button');
  assert.match(app,/videoDetailPromptExpanded=!videoDetailPromptExpanded/,
    'the Show more control toggles existing saved text');
  assert.match(app,/if\(promptKey!==videoDetailPromptKey\)/,
    'selecting another saved video resets expansion');
  assert.match(detailCss,/video-detail-prompt:not\(\.is-expanded\)/,
    'saved prompts are visually shortened without truncating their source');
  assert.match(detailCss,/max-height:7\.75em/,
    'the collapsed prompt uses approximately five lines');
  for(const id of ['video-detail-resolution','video-detail-duration','video-detail-ratio']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,
      'the existing saved-video data field remains uniquely bound: '+id);
  }
  assert.match(detailCss,/video-detail-data>div/,
    'metadata is rendered as small chips');
  assert.match(html,/class="video-detail-created"/,
    'the original saved date remains accessible at the foot of the details');
  assert.doesNotMatch(detailCss,/\/api\/jobs|creditCost|confirm:true/,
    'presentation changes cannot generate or bill');
});
