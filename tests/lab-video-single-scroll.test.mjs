import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL('../lab/'+name,import.meta.url),'utf8');
const html=file('studio.html');
const css=file('video-composer-single-scroll.css');

test('the Video composer reserves its action outside the settings scrollport',()=>{
  assert.match(html,/video-inspector-editorial\.css\?v=[^"\n]+">\n<link rel="stylesheet" href="\.\/video-composer-single-scroll\.css\?v=20261103-video-polish2"/,
    'the reviewed fix must load after the older composer styles');
  assert.match(css,/\.workspace\.video-layout>\.controls\{[\s\S]*?overflow-y:hidden!important/,
    'scrolling settings cannot move the whole panel and its action');
  assert.match(css,/\.workspace\.video-layout>\.controls>\.controls-body\{[\s\S]*?flex:1 1 0!important[\s\S]*?min-height:0!important[\s\S]*?overflow-y:auto!important/,
    'settings shrink into the available track and remain natively scrollable');
  assert.match(css,/\.workspace\.video-layout>\.controls>\.generate-zone\{[\s\S]*?position:relative!important[\s\S]*?bottom:auto!important/,
    'Generate reserves normal-flow space instead of overlaying settings');
  assert.match(css,/\.generate-zone\{[\s\S]*?flex:0 0 auto!important[\s\S]*?height:auto!important/,
    'the action track fits Generate and an available Save draft action');
  assert.match(css,/scroll-padding-block:12px!important/,
    'focused settings retain scroll clearance');
});

test('the Video-only fix does not change history, the player or generation pricing',()=>{
  assert.match(css,/@media \(min-width:821px\)/,'small phone layout remains unchanged');
  assert.match(css,/#app\.video-studio-active/);
  assert.doesNotMatch(css,/#video-inspector|#video-detail|\/api\/jobs|creditCost|confirm:true/,
    'Video polish does not alter inspectors, providers, jobs or billing');
  assert.match(css,/#app\.video-studio-active \.video-feed-center #history \.card\[data-kind="video"\]>.asset-video-badge/,
    'History changes must remain strictly Video-scoped presentation');
  assert.doesNotMatch(css,/#generate\{/,
    'the button style itself is not modified');
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('the composer leaves expanded settings and the prompt in normal order',()=>{
  const controls=html.indexOf('<div class="controls-body">');
  const prompt=html.indexOf('id="prompt"',controls);
  const output=html.indexOf('id="pv-video-output-toggle"',prompt);
  const grid=html.indexOf('<div class="parameter-grid">',output);
  const footer=html.indexOf('<div class="generate-zone">',grid);
  assert.ok(controls>=0&&prompt>controls&&output>prompt&&grid>output&&footer>grid,
    'Output settings must come before the normal-flow Generate footer');
  assert.match(css,/#pv-video-prompt-box\{[\s\S]*?flex:0 0 auto!important/,
    'long prompt remains an accessible normal-height editor');
  assert.match(css,/textarea#prompt\{[\s\S]*?resize:vertical!important/,
    'the text area keeps its native resize behavior');
});

test('Video UI hides redundant actions without affecting shared functionality',()=>{
  assert.match(css,/#app\.video-studio-active \.workspace\.video-layout>\.controls>\.generate-zone>#save\{[\s\S]*?display:none!important/);
  assert.match(css,/#app\.video-studio-active \.video-feed-center #history \.card\[data-kind="video"\]>.asset-video-badge\{[\s\S]*?display:none!important/);
  assert.match(css,/history-video-play\{[\s\S]*?border-radius:50%!important/);
  assert.match(html,/class="pv-audio-on"/);
  assert.match(html,/class="pv-audio-muted"/);
  assert.match(css,/\[aria-pressed="false"\] \.pv-audio-on\{display:none\}/);
  assert.match(css,/\[aria-pressed="false"\] \.pv-audio-muted\{display:block\}/);
  assert.match(css,/\.controls-body>#video-modes/);
  assert.match(css,/\.controls-body>#pv-video-prompt-box/);
  assert.match(css,/scroll-behavior:auto!important/);
  assert.match(css,/textarea#prompt\{[\s\S]*?overscroll-behavior-y:contain!important/);
  assert.doesNotMatch(css,/#[a-z]+\s*\{[^}]*?\/api\/jobs/);
});
