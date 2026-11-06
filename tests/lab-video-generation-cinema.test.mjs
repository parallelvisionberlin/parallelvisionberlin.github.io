import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL('../lab/'+name,import.meta.url),'utf8');
const html=file('studio.html'),css=file('video-generation-cinema.css'),
  js=file('lab.js'),existing=file('video-playback-focus.css');

test('Video stage has an accessible minimal loading line while preserving genuine backend status',()=>{
  const stage=html.slice(html.indexOf('id="video-job-stage"'),html.indexOf('</div></div><div class="stagefoot">',html.indexOf('id="video-job-stage"')));
  assert.match(stage,/role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(stage,/class="pv-video-loading-line" aria-hidden="true"/,
    'the indeterminate line is decorative, not repeated to assistive technology');
  for(const id of ['video-job-stage-state','video-job-stage-title','video-job-stage-message','video-job-stage-meta']){
    assert.equal((stage.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  assert.doesNotMatch(stage,/pv-motion-|video-job-stage-motion/,
    'rejected cards, scans, glow, labels and equalizer are removed');
  assert.match(js,/stage\.dataset\.phase=phase/,'the real backend phase controls the status');
});

test('Minimal waiting screen restores the formerly hidden center only for active jobs',()=>{
  assert.match(existing,/\.video-job-stage:is\(\[data-phase="submitting"\],\[data-phase="queued"\],\[data-phase="running"\],\[data-phase="saving"\]\) \.video-job-stage-main\{[\s\S]*?clip-path:inset\(50%\)/,
    'older layout hid the central progress surface');
  assert.match(css,/\.video-job-stage:is\(\[data-phase="submitting"\],\[data-phase="queued"\],\[data-phase="running"\],\[data-phase="saving"\]\) \.video-job-stage-main\{[\s\S]*?clip-path:none!important/,
    'the newer layer restores the meaningful status for active work');
  assert.match(css,/ #video-job-stage-title\{/, 'real generated-status heading is styled by ID');
  assert.match(css,/\.video-job-stage \.pv-video-loading-line\{\s*display:none/,
    'the line is hidden for failures and saved media');
  assert.match(css,/\.video-job-stage:is\(\[data-phase="submitting"\],\[data-phase="queued"\],\[data-phase="running"\],\[data-phase="saving"\],\[data-phase="loading"\]\) \.pv-video-loading-line/,
    'it appears only for active phases');
  for(const phase of ['submitting','queued','running','saving','failed','uncertain','loading']){
    assert.match(js,new RegExp(phase.replace('-','\\-')),'backend status remains '+phase);
  }
});

test('Loading line is non-deceptive, reduced-motion friendly, and does not touch editor or History',()=>{
  assert.match(css,/@keyframes pv-video-loading-line/);
  assert.doesNotMatch(css,/pv-motion-|radial-gradient|perspective|filter:blur/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/animation:none!important/);
  assert.doesNotMatch(css,/#history|\.archive|\.workspace\.video-layout|#generate|#video-inspector|creditCost|\/api\/jobs/,
    'only the processing stage may be visually modified');
  assert.doesNotMatch(css,/progress.*[0-9]+%|estimate.*seconds|setInterval|random\(/i,
    'no fabricated percentage, countdown, or random progress can appear');
  assert.match(css,/\.video-job-stage\[hidden\]\{display:none!important\}/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('Minimal stage CSS comes after existing Video styles and is versioned',()=>{
  const previous=html.indexOf('video-composer-single-scroll.css?v=');
  const current=html.indexOf('video-generation-cinema.css?v=20261106-minimal-loading1');
  assert.ok(previous>=0&&current>previous,'waiting screen overrides prior hidden center');
  assert.equal((html.match(/video-generation-cinema\.css/g)||[]).length,1);
});
