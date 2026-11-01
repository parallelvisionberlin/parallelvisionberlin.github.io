import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL('../lab/'+name,import.meta.url),'utf8');
const html=file('studio.html');
const css=file('video-film-dossier.css');
const script=file('lab.js');

test('approved second mockup is the final Video Studio-only visual layer',()=>{
  assert.match(html,/video-playback-focus\.css[^\n]*\n<link rel="stylesheet" href="\.\/video-film-dossier\.css\?v=/,
    'film dossier stylesheet comes after older Video skins');
  assert.match(css,/#app\.video-studio-active/,'design is restricted to Video Studio');
  assert.doesNotMatch(css,/fetch\s*\(|\/api\/jobs|creditCost|confirm:true/,
    'design cannot bill or generate');
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'CSS blocks balance');
});

test('saved Video film dossier preserves real controls and accessible secondary actions',()=>{
  for(const id of ['video-detail-watch','video-detail-reuse','video-detail-download',
      'video-detail-delete','video-detail-extra','video-detail-model','video-detail-prompt',
      'video-detail-prompt-toggle','video-detail-resolution','video-detail-duration',
      'video-detail-ratio','video-detail-date']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  assert.match(html,/<details id="pv-video-scene-actions"[^>]*hidden>/,
    'the action menu stays absent until a video is selected');
  assert.match(html,/aria-label="Saved video actions"/);
  assert.match(script,/actionsMenu\.hidden=!job/,
    'menu visibility follows the actual saved selection');
  assert.match(script,/actionsMenu\.dataset\.record!==key/,
    'switching video closes the previous menu');
  assert.match(css,/\.pv-video-scene-actions:not\(\[open\]\)>\.video-inspector-actions\{display:none!important\}/,
    'closed dropdown controls are not painted');
});

test('real generated videos retain original aspect ratio and create states retain one stable stage',()=>{
  assert.match(css,/object-fit:contain!important/,'saved film is never stretched or cropped');
  assert.match(css,/--pv-video-stage-height:clamp\(/,'one stage height variable for all models');
  assert.match(css,/\.stage:has\(#empty:not\(\[hidden\]\)\)/,
    'the unloaded stage uses the same editorial shell');
  assert.match(css,/\.pv-video-create-inspector \.pv-video-scene-model img\{\s*display:none!important/,
    'draft model panel has no misleading fixed model thumbnail');
  assert.match(html,/id="video-engine"/,'native model selection remains');
  assert.match(html,/id="video-modes"/,'native mode choices remain');
  assert.match(html,/id="video-job-stage"/,'live generation state remains');
});

test('original Video History gallery stays a wrapped card grid without horizontal scrolling',()=>{
  const originalGrid=file('video-refresh.css');
  assert.match(originalGrid,/grid-template-columns:repeat\(auto-fill,minmax\(min\(100%,245px\),1fr\)\)/,
    'original responsive grid and thumbnail sizing remain');
  assert.doesNotMatch(css,/grid-auto-flow:column!important|grid-auto-columns:|scroll-snap-type:x|overflow-x:auto!important/,
    'Film Dossier does not replace the gallery with a horizontal filmstrip');
  assert.match(css,/Preserve the original Video History grid/,
    'the new editorial style explicitly leaves the original gallery alone');
  assert.match(html,/id="history-select"/);
  assert.match(html,/id="refresh"/);
  assert.match(html,/id="more"/);
  assert.doesNotMatch(script,/desktopVideoFilmstrip|pv-film-duration/,
    'old automatic History pagination and original card markup are restored');
  assert.match(script,/\$\('more'\)\.onclick=loadEarlierHistory/,'manual older History still works');
});

test('Reuse settings and Download remain permanently visible beneath selected film details',()=>{
  const selected=html.slice(html.indexOf('<div id="video-inspector-selected"'),html.indexOf('</aside>',html.indexOf('<div id="video-inspector-selected"')));
  const menu=selected.indexOf('id="pv-video-scene-actions"');
  assert.equal(menu,-1,'the action menu stays outside selected film body');
  const footer=selected.indexOf('class="pv-video-primary-actions"');
  assert.ok(footer>=0,'a persistent, visibly styled footer exists in the saved-film panel');
  assert.ok(selected.indexOf('id="video-detail-download"')>footer);
  assert.ok(selected.indexOf('id="video-detail-reuse"')>footer);
  assert.ok(selected.indexOf('id="video-detail-date"')<footer,'buttons appear below the created date');
  assert.match(css,/\.pv-video-primary-actions\{\s*display:grid!important/,
    'the visible action footer has a proper layout');
  assert.match(css,/\.pv-video-primary-actions #video-detail-reuse\{/,
    'the reusable settings action remains primary');
  assert.match(css,/\.pv-video-primary-actions #video-detail-download\{/,
    'download is independently visible');
  assert.match(script,/\$\('video-detail-reuse'\)\.onclick=/,
    'the original Reuse settings click handler remains connected');
  assert.match(script,/\$\('video-detail-download'\)\.onclick=/,
    'the authenticated download handler remains connected');
});

test('scene metadata is typography-led with no generic status icons',()=>{
  const area=html.slice(html.indexOf('<dl class="video-detail-data"'),html.indexOf('</dl>',html.indexOf('<dl class="video-detail-data"')));
  assert.doesNotMatch(area,/<svg|<img/,'video specs do not use generic pictogram icons');
  for(const value of ['Resolution','Duration','Aspect ratio']){
    assert.match(area,new RegExp('<span>'+value+'</span>'),'spec values retain accessible labels');
  }
  assert.match(css,/\.video-detail-data>div\+div\{\s*border-left:1px solid/,
    'hairline separators replace badges');
  assert.match(css,/\.video-detail-data>div\{[\s\S]*?background:transparent!important/,
    'technical spec cells have a quiet editorial finish');
});

test('Video composer fits laptop height without forcing an unnecessary scrollbar',()=>{
  assert.match(css,/Desktop composer fit, 2026-11-01/,
    'the compact desktop fix is in the final Video layer');
  assert.match(css,/#pv-video-prompt-box\{\s*flex:1 1 0!important/,
    'the prompt container can shrink rather than forcing panel overflow');
  assert.match(css,/#pv-video-prompt-box textarea#prompt\{\s*flex:1 1 0!important/,
    'only the writing area uses spare height');
  assert.match(css, /\.workspace\.video-layout #generate\{\s*height:45px!important/,
    'Generate is no longer oversized');
  assert.match(css, /\.controls-body::-webkit-scrollbar\{display:none!important\}/,
    'desktop controls do not show a persistent scrollbar rail');
  assert.match(css,/overflow-y:auto!important/,
    'smaller windows and populated reference lists can still scroll');
  assert.match(html,/video-film-dossier\.css\?v=20261101-scene-utilities\d+/,
    'the browser gets an updated stylesheet URL');
});

test('Saved video prompt has a hover and keyboard copy action for its full source',()=>{
  assert.equal((html.match(/id="video-detail-copy-prompt"/g)||[]).length,1);
  assert.match(html,/class="pv-video-saved-prompt" aria-label="Saved motion prompt"/);
  assert.match(html,/id="video-detail-copy-prompt"[^>]+aria-label="Copy prompt"/);
  assert.match(script,/fullPrompt=job\?\.settings\?\.prompt/);
  assert.match(script,/navigator\.clipboard\.writeText\(fullPrompt\)/);
  assert.match(script,/control\.dataset\.tip='Copied'/);
  assert.match(script,/if\(selectedVideoJob\?\.id!==job\.id\)return/);
  assert.match(css,/\.pv-video-saved-prompt:hover \.pv-video-copy-prompt/);
  assert.match(css,/\.pv-video-saved-prompt:focus-within \.pv-video-copy-prompt/);
  assert.match(css,/@media\(hover:none\)/,'touch devices can always access Copy');
});
test('Saved video model and actions are lightweight and Delete is not red',()=>{
  const footer=html.slice(html.indexOf('class="pv-video-primary-actions"'),html.indexOf('</div>',html.indexOf('class="pv-video-primary-actions"')));
  assert.equal((footer.match(/id="video-detail-delete"/g)||[]).length,1);
  assert.match(footer,/aria-label="Delete video record"/);
  assert.match(footer,/id="video-detail-reuse"[^>]*aria-label="Reuse saved video settings"[^>]*[\s\S]*?<span>Reuse<\/span>/);
  assert.match(footer,/id="video-detail-download"[^>]*[\s\S]*?<span>Download<\/span>/);
  assert.match(css,/\.video-detail-model:before\{/);
  assert.match(css,/\.pv-video-primary-actions #video-detail-reuse\{\s*justify-self:start!important/);
  assert.match(css,/\.pv-video-primary-actions #video-detail-delete\{[\s\S]*?color:#a9adb3!important/);
  assert.match(css,/\.pv-video-primary-actions #video-detail-delete:hover:not\(:disabled\)\{[\s\S]*?color:#e2e3e5!important/);
  assert.doesNotMatch(footer,/class="(primary|detail-primary)"/);
  assert.match(script,/\$\('video-detail-delete'\)\.onclick/,'original confirmed deletion survives');
});
