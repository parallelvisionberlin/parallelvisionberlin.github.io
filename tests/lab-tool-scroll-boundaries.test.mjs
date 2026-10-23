// Route-scoped visual containment. No authentication, provider, credit or media calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const retouch=read('lab/precision-edit.css');
const upscale=read('lab/upscale-studio-v5.css');
const footer=read('lab/site-footer.css');
const studio=read('lab/studio.html');
const fashion=read('lab/fashion.html');
const controller=read('lab/lab.js');

test('Retouch hides the preserved Upscaler grid and archive',()=>{
  assert.match(upscale,/#app\.upscale-studio-active:not\(\.assets-active\):not\(\.fashion-studio-active\)>\.workspace\{[\s\S]*?display:grid!important;/);
  assert.match(retouch,/#app\.retouch-studio-active\.upscale-studio-active:not\(\.assets-active\):not\(\.fashion-studio-active\) > \.workspace,[\s\S]*?#app\.retouch-studio-active > \.archive,[\s\S]*?display:none!important;/);
  assert.match(retouch,/#app\.retouch-studio-active > #video-effects-explore/);
  assert.match(controller,/retouchActive=true;\s*\$\('app'\)\.classList\.add\('retouch-studio-active'\)/);
  assert.match(controller,/function leaveRetouch\(\)/);
});

test('The Upscaler keeps its real filtered history and original editing deck',()=>{
  assert.ok(studio.includes('id="archive-rest-anchor"'));
  assert.ok(studio.includes('<section class="archive">'));
  assert.ok(studio.includes('id="upscale-canvas"'));
  assert.match(controller,/function historyJobVisible\(job\)\{return !!assetLibrary\?\.active\(\)\|\|\(tool==='upscale'\?job\.settings\?\.mode==='upscale'/);
  assert.doesNotMatch(retouch,/#app\.upscale-studio-active\s*>\s*\.archive\s*\{\s*display:none/);
});

test('Full footer is hidden only on Studio and Fashion, retaining legal links on discovery pages',()=>{
  assert.match(footer,/body:has\(#app > #precision-workspace\) > \.pv-lab-footer,\s*body:has\(#fashion-gallery\) \.pv-lab-footer\s*\{\s*display:none!important;\s*\}/);
  assert.ok(studio.includes('<footer class="pv-lab-footer"'));
  assert.ok(fashion.includes('<footer class="pv-lab-footer"'));
  assert.ok(fashion.includes('id="fashion-history"'));
  for(const path of ['lab/studio.html','lab/fashion.html']){
    const text=read(path);
    assert.ok(text.includes('/lab/terms/'),path+' retains Terms link markup');
    assert.ok(text.includes('/lab/impressum/'),path+' retains Impressum link markup');
  }
  const landing=read('lab/index.html');
  assert.ok(landing.includes('pv-lab-footer'),'Homepage footer remains present');
});
