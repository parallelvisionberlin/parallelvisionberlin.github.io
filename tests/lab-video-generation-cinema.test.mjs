import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL('../lab/'+name,import.meta.url),'utf8');
const html=file('studio.html'),css=file('video-generation-cinema.css'),
  js=file('lab.js'),existing=file('video-playback-focus.css');

test('Video stage has accessible film artwork while preserving genuine backend status',()=>{
  const stage=html.slice(html.indexOf('id="video-job-stage"'),html.indexOf('</div></div><div class="stagefoot">',html.indexOf('id="video-job-stage"')));
  assert.match(stage,/role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(stage,/class="pv-motion-visual" aria-hidden="true"/,
    'animated film artwork is decorative, not repeated to assistive technology');
  for(const id of ['video-job-stage-state','video-job-stage-title','video-job-stage-message','video-job-stage-meta']){
    assert.equal((stage.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  assert.equal((stage.match(/pv-motion-frame pv-motion-frame-/g)||[]).length,3,
    'the artwork shows three abstract frames, not fabricated generated output');
  assert.match(js,/stage\.dataset\.phase=phase/,'the real backend phase controls the artwork');
});

test('Cinema restores the formerly hidden center only for active jobs',()=>{
  assert.match(existing,/\.video-job-stage:is\(\[data-phase="submitting"\],\[data-phase="queued"\],\[data-phase="running"\],\[data-phase="saving"\]\) \.video-job-stage-main\{[\s\S]*?clip-path:inset\(50%\)/,
    'older layout hid the central progress surface');
  assert.match(css,/\.video-job-stage:is\(\[data-phase="submitting"\],\[data-phase="queued"\],\[data-phase="running"\],\[data-phase="saving"\]\) \.video-job-stage-main\{[\s\S]*?clip-path:none!important/,
    'the newer layer restores the meaningful status for active work');
  assert.match(css,/ #video-job-stage-title\\{/, 'real generated-status heading is styled by ID');
  assert.match(css,/\.video-job-stage \.pv-motion-visual\{\s*display:none/,
    'the artwork is hidden for failures and saved media');
  assert.match(css,/\.video-job-stage:is\(\[data-phase="submitting"\],\[data-phase="queued"\],\[data-phase="running"\],\[data-phase="saving"\]\) \.pv-motion-visual/,
    'it appears only for active phases');
  for(const phase of ['submitting','queued','running','saving','failed','uncertain','loading']){
    assert.match(js,new RegExp(phase.replace('-','\\-')),'backend status remains '+phase);
  }
});

test('Film animation is non-deceptive, reduced-motion friendly, and does not touch editor or History',()=>{
  assert.match(css,/@keyframes pv-motion-exposure-sweep/);
  assert.match(css,/@keyframes pv-motion-layer-center/);
  assert.match(css,/@keyframes pv-motion-scan/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/animation:none!important/);
  assert.doesNotMatch(css,/#history|\.archive|\.workspace\.video-layout|#generate|#video-inspector|creditCost|\/api\/jobs/,
    'only the processing stage may be visually modified');
  assert.doesNotMatch(css,/progress.*[0-9]+%|estimate.*seconds|setInterval|random\(/i,
    'no fabricated percentage, countdown, or random progress can appear');
  assert.match(css,/\.video-job-stage\[hidden\]\{display:none!important\}/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('Cinematic stage CSS comes after existing Video styles and is versioned',()=>{
  const previous=html.indexOf('video-composer-single-scroll.css?v=');
  const current=html.indexOf('video-generation-cinema.css?v=20261101-motion-film2');
  assert.ok(previous>=0&&current>previous,'cinema layer overrides prior hidden center');
  assert.equal((html.match(/video-generation-cinema\.css/g)||[]).length,1);
});
