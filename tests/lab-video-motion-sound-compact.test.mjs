import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../lab/video-motion-sound-compact.css',import.meta.url),'utf8');
const media=readFileSync(new URL('../lab/media-references.js',import.meta.url),'utf8');

test('video and audio are one compact expandable group with the original inputs',()=>{
  assert.match(html,/id="video-motion-toggle"[^>]*aria-controls="reference-media"/);
  assert.match(html,/id="reference-media" hidden/);
  for(const id of ['video-references','audio-references','video-reference-list','audio-reference-list','video-ref-count','audio-ref-count']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' must be unique');
  }
  assert.match(html,/pv-media-ref-group-video/);
  assert.match(html,/pv-media-ref-group-audio/);
  assert.match(html,/id="video-references" type="file" multiple/);
  assert.match(html,/id="audio-references" type="file" multiple/);
  assert.match(html,/video-motion-sound-compact\.css\?v=/);
});

test('empty reference rows are compact without touching the separate Extend upload',()=>{
  assert.match(css,/reference-media:not\(\[hidden\]\)/);
  assert.match(css,/min-height:48px!important;/);
  assert.match(css,/height:48px!important;/);
  assert.match(css,/reference-media \.reference-media-list:empty/);
  assert.match(css,/video-extend-active.*pv-media-ref-group-video/);
  assert.match(css,/video-extend-active.*pv-media-ref-group-audio/);
  assert.match(css,/display:contents!important/);
  assert.match(css,/display:none!important/);
});

test('drop targets forward original files to the same validated media reference controller',()=>{
  assert.match(media,/input\.onchange=e=>action\(async\(\)=>/);
  assert.match(media,/drop\.addEventListener\('drop'/);
  assert.match(media,/e\.preventDefault\(\);e\.stopPropagation\(\)/);
  assert.match(media,/await add\(files,kind\)/);
  assert.match(media,/if\(groups\[kind\]\.length\+list\.length>10\)/);
  assert.match(media,/Combined '\+kind\+' references must not exceed 30 seconds/);
  assert.doesNotMatch(media,/api\/jobs|generate\(|quote\(/);
});
