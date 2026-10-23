import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('Explore Moods header links back to each Studio tool and keeps My Moods anchor',()=>{
  const page=read('lab/moods.html');
  for(const tool of ['image','retouch','video','upscale','fashion'])
    assert.match(page,new RegExp('studio\\.html\\?tool='+tool+'\\&amp;returnToDraft=1'));
  assert.match(page,/href="\.\/mood-creator\.html#my-moods">My Moods<\/a>/);
  assert.match(page,/aria-current="page">Explore Moods<\/a>/);
});
test('Mood generate is submitted only in the modal and does not redirect to Studio',()=>{
  const js=read('lab/explore-moods.js'),service=read('lab/app-mood-generation.js');
  const handler=js.split('generate.onclick=')[1].split("$('mc-look-result-download')")[0];
  assert.match(handler,/currentPrice\.submit\(\)/);
  assert.doesNotMatch(handler,/location\.assign/);
  assert.match(js,/client\.jobStatus\(id\)/);
  assert.match(js,/client\.outputBlob\(job\.outputId\)/);
  assert.match(service,/jobStatus\(id\).*?\/api\/jobs/s);
  assert.match(service,/outputBlob\(id\).*?\/api\/assets/s);
  assert.match(js,/mc-look-result-download/);
});
test('Studio Moods return is local, account scoped and restores model, images and prompt',()=>{
  const js=read('lab/lab.js'),draft=read('lab/studio-return-draft.js');
  assert.match(js,/bindExploreMoodsReturn\(\)/);
  assert.match(js,/saveImageForMoods/);
  assert.match(js,/readStudioReturnDraft\(userId\)/);
  assert.match(js,/addReferences\(chosen\.map\(storedImageFile\)/);
  assert.match(js,/moodUI\.restore/);
  assert.match(draft,/sessionStorage\.setItem\(TOKEN,id\)/);
  assert.match(draft,/record\.userId!==userId/);
  assert.doesNotMatch(draft,/fetch\(/);
});
test('Dream Blur uses exactly the other Mood-card caption style',()=>{
  const css=read('lab/explore-moods-editorial.css');
  assert.match(css,/\.mc-look-card \.mc-look-copy strong\{/);
  assert.doesNotMatch(css,/\[data-mood-id="dream-blur"\] \.mc-look-copy strong\{/);
});
test('Generate remains available while quote preparation is pending and uses the same paid submit',()=>{
  const js=read('lab/explore-moods.js'),page=read('lab/moods.html');
  assert.match(js,/generate\.disabled=!hasGenerationInput\(\)/);
  assert.match(js,/if\(priceTask\?\.stamp===stamp\)return priceTask\.promise/);
  assert.match(js,/const currentPrice=await preparePrice\(stamp\)/);
  assert.equal((js.match(/currentPrice\.submit\(\)/g)||[]).length,1);
  assert.doesNotMatch(js,/Generate ·/);
  assert.match(page,/id="mc-look-credit-note"/);
  assert.match(page,/oneClick=20261016v2/);
});

test('Generating replaces form with a bounded result stage, keeping artwork and output visible',()=>{
  const js=read('lab/explore-moods.js');
  const css=read('lab/explore-moods-nav.css');
  const markup=read('lab/moods.html');
  assert.match(js,/dialog\.classList\.add\('is-result-view'\)/);
  assert.match(js,/dialog\.classList\.remove\('is-result-view'\)/);
  assert.match(css,/\.mc-look-dialog\.is-result-view \.mc-look-dialog-media/);
  assert.match(css,/position:relative;top:auto;align-self:stretch/);
  assert.doesNotMatch(css,/position:sticky;top:0;align-self:start/);
  assert.match(css,/\.mc-look-dropzone,\.mc-look-prompt,\.mc-look-dialog-actions/);
  assert.match(css,/height:clamp\(220px,38dvh,390px\)/);
  assert.match(markup,/id="mc-look-result-again"/);
  assert.match(js,/\$\('mc-look-result-again'\)\.onclick/);
  assert.match(js,/status\.textContent=error\.message;\s*generate\.textContent='Generate'/);
  assert.equal((js.match(/currentPrice\.submit\(\)/g)||[]).length,1);
});

test('Oversized Mood uploads show an in-card error and keep the editor fixed',()=>{
  const js=read('lab/explore-moods.js');
  const page=read('lab/moods.html');
  const css=read('lab/explore-moods-editorial.css');
  assert.match(js,/showUploadError\(input,error\)/);
  assert.match(js,/input\.size>20\*1024\*1024/);
  assert.match(js,/Maximum 20 MB/);
  assert.match(js,/fileInput\.value=''/);
  const booth=read('lab/explore-moods-photobooth.css');
  assert.match(booth,/aspect-ratio:1\.19/);
  assert.match(booth,/height:clamp\(150px,23dvh,190px\)!important/);
  assert.match(js,/dialog\.style\.removeProperty\('--mc-editor-height'\)/);
  assert.match(page,/id="mc-look-upload-error"[^>]+role="alert"/);
  assert.match(page,/id="mc-look-upload-error-dismiss"/);
  assert.match(page,/id="mc-look-file-clear"[^>]*aria-label="Remove selected photo"[^>]*title="Remove photo"/);
  assert.match(css,/\.mc-look-dialog:not\(\.is-result-view\)\[open\]/);
  assert.match(css,/height:var\(--mc-editor-height,auto\)/);
  assert.match(css,/\.mc-look-upload-error\{[\s\S]*?position:absolute/);
  assert.match(css,/#mc-look-file-clear\{[\s\S]*?position:absolute/);
});

test('Mood loading uses an accessible full-frame exposure and honest job states',()=>{
  const page=read('lab/moods.html');
  const css=read('lab/explore-moods-nav.css');
  const js=read('lab/explore-moods.js');
  assert.match(page,/id="mc-look-result-loading" role="status" aria-live="polite"/);
  assert.match(page,/class="mc-look-exposure-cloud"/);
  assert.match(page,/class="mc-look-story-one">MAKING THE IMPOSSIBLE VISIBLE/);
  assert.match(page,/class="mc-look-story-finish">ALMOST READY/);
  assert.doesNotMatch(page,/mc-look-exposure-plate/);
  assert.match(css,/\.mc-look-exposure-story \.mc-look-story-two/);
  assert.match(css,/\.mc-look-result-loading\.is-finishing \.mc-look-exposure-story \.mc-look-story-finish/);
  assert.match(js,/finishing=job\.status==='saving'/);
  assert.match(js,/resultLoading\.classList\.add\('is-finishing'\)/);
  assert.match(page,/id="mc-look-result-wait-note" hidden/);
  assert.doesNotMatch(page,/mc-look-exposure-arc/);
  assert.doesNotMatch(css,/mc-look-exposure-arc/);
  assert.match(css,/#mc-look-result-wait-note\[hidden\]\{display:none\}/);
  assert.match(js,/waitNoteTimer=setTimeout\(\(\)=>\{/);
  assert.match(js,/45000/);
  assert.match(js,/clearTimeout\(waitNoteTimer\)/);
  assert.match(js,/activeJobId===job.id/);
  assert.match(page,/id="mc-look-result-progress"/);
  assert.doesNotMatch(page,/class="mc-look-result-loader"/);
  assert.match(css,/\.mc-look-result-loading\{[\s\S]*?position:absolute;inset:0/);
  assert.match(css,/\.mc-look-result-loading\[hidden\]\{display:none\}/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/\.mc-look-result-frame>img:not\(\[hidden\]\)/);
  assert.match(js,/queued:'In the generation queue…'/);
  assert.match(js,/running:'Generating your photograph…'/);
  assert.match(js,/resultLoading\.classList\.add\('is-stopped'\)/);
  assert.match(js,/resultLoading\.classList\.remove\('is-stopped','is-finishing'\)/);
  assert.equal((js.match(/currentPrice\.submit\(\)/g)||[]).length,1);
});

