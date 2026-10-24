import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../lab/moods.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../lab/explore-moods-photobooth.css',import.meta.url),'utf8');
test('Photobooth Browse and Generate use monochrome SVG masks instead of emoji-capable text',()=>{
  assert.match(html,/Browse files <span class="mc-photobooth-arrow" aria-hidden="true"><\/span>/);
  assert.match(css,/-webkit-mask:url\("data:image\/svg\+xml/);
  assert.match(css,/mask:url\("data:image\/svg\+xml/);
  assert.match(css,/background-color:currentColor;pointer-events:none/);
  assert.match(css,/stroke-width='1\.6'/);
  assert.doesNotMatch(css,/content:\s*["']↗/);
  assert.doesNotMatch(html,/Browse files <span[^>]*>↗/);
  assert.match(css,/#mc-look-continue::after\{\s*content:"";position:absolute;right:20px;top:50%;transform:translateY\(-50%\);width:20px;height:20px/);
});
test('Only the mobile Soft Pastel editor preview gets a higher focal point',()=>{
  const mobile=css.slice(css.indexOf('@media(max-width:600px){'));
  assert.equal(css.split('[data-mood-id="soft-pastel-film"]').length-1,1);
  assert.match(mobile,/#mc-look-dialog\.mc-photobooth:not\(\.is-result-view\) #mc-look-preview\[data-mood-id="soft-pastel-film"\]\{object-position:50% 12%!important\}/);
  assert.match(mobile,/\.mc-look-dialog-media img\{object-position:50% 32%;transform:none!important\}/);
  assert.match(mobile,/\[data-mood-id="night-flash"\]\{transform:scale\(1\.65\)!important;transform-origin:50% 0%\}/);
});
test('Photobooth action semantics, text updates and fresh stylesheet loading remain intact',()=>{
  assert.match(html,/<button id="mc-look-continue" class="mc-look-continue" type="button" disabled>Generate<\/button>/);
  assert.match(html,/<label for="mc-look-file" id="mc-look-file-label">/);
  assert.match(html,/explore-moods-photobooth\.css\?v=20261023-upload-polish1&icons=20261024-vector1/);
  assert.match(css,/#mc-look-dialog\.mc-photobooth:not\(\.is-result-view\) #mc-look-continue:disabled\{cursor:not-allowed!important\}/);
});
