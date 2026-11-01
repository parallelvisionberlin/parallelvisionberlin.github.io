import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL('../lab/'+name,import.meta.url),'utf8');
const html=file('studio.html');
const css=file('video-composer-single-scroll.css');

test('the Video composer uses a single scrolling surface, including Generate',()=>{
  assert.match(html,/video-inspector-editorial\.css\?v=[^"\n]+">\n<link rel="stylesheet" href="\.\/video-composer-single-scroll\.css\?v=20261101-single-scroll1"/,
    'the fix must load last and override the old sticky Generate layout');
  assert.match(css,/\.workspace\.video-layout>\.controls\{[\s\S]*?overflow-y:auto!important/,
    'the full Video composer, not only controls-body, is the scrollport');
  assert.match(css,/\.workspace\.video-layout>\.controls>\.controls-body\{[\s\S]*?flex:0 0 auto!important[\s\S]*?overflow:visible!important/,
    'settings do not disappear inside a second nested scroll pane');
  assert.match(css,/\.workspace\.video-layout>\.controls>\.generate-zone\{[\s\S]*?position:relative!important[\s\S]*?bottom:auto!important/,
    'Generate moves with the other controls instead of being locked');
  assert.match(css,/scroll-padding-bottom:16px!important/,
    'the last action has comfortable scroll clearance');
});

test('the Video-only fix does not change history, the player or generation pricing',()=>{
  assert.match(css,/@media \(min-width:821px\)/,'small phone layout remains unchanged');
  assert.match(css,/#app\.video-studio-active/);
  assert.doesNotMatch(css,/#history|\.video-feed-center|#video-inspector|#video-detail|\/api\/jobs|creditCost|confirm:true/,
    'no changes to History, playback, right inspector, jobs or billing');
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
