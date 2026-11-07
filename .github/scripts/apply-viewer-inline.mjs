import {readFileSync,writeFileSync} from 'node:fs';
const edit=(path,change)=>{const source=readFileSync(path,'utf8');writeFileSync(path,change(source));};
function once(source,before,after){if(source.split(before).length!==2)throw Error('Unexpected baseline: '+before.slice(0,80));return source.replace(before,after);}
edit('lab/lab.js',source=>{
 source=once(source,'onReplace:stageViewerReplacement,notify','onPrepare:stageViewerReplacement,onResult:job=>openVideo(job,{scroll:false,detail:true}),notify');
 const first=source.indexOf('async function stageViewerReplacement(selection){'),last=source.indexOf("$('image-detail-fix-eyes').onclick",first);
 if(first<0||last<first)throw Error('Missing viewer adapter');
 source=source.slice(0,first)+readFileSync('.github/scripts/viewer-inline-adapter.txt','utf8')+source.slice(last);
 source=once(source,'image-viewer-editor.js?v=20261107-viewer-actions1','image-viewer-editor.js?v=20261107-inline-editor2');
 return once(source,'precision-edit.js?v=20261107-viewer-actions1','precision-edit.js?v=20261107-inline-editor2');
});
edit('lab/precision-edit.js',source=>{
 source=once(source,"let resultFormat='png',lastResultSourceId=null,","let resultJob=null;\n  let resultFormat='png',lastResultSourceId=null,");
 source=once(source,'pending=null;quoteFailure=false;clearTimeout(quoteTimer);quoteTimer=null;refreshButtons();\n  };',"pending=null;quoteFailure=false;clearTimeout(quoteTimer);quoteTimer=null;refreshButtons();\n    view.dispatchEvent(new Event('precision-selection-change'));\n  };");
 source=once(source,'renderMask();refreshButtons();\n  }\n  async function ensureBaseId',"renderMask();refreshButtons();\n    view.dispatchEvent(new Event('precision-selection-change'));\n  }\n  async function ensureBaseId");
 source=source.replaceAll('lastResultSourceId=null;','lastResultSourceId=null;resultJob=null;');
 source=once(source,'lastResultSourceId=final.outputId;','lastResultSourceId=final.outputId;resultJob=final;');
 source=once(source,"oc.fillStyle='rgba(214,255,0,.58)';","oc.fillStyle=view.closest('#image-lightbox')?'rgba(175,113,203,.38)':'rgba(214,255,0,.58)';");
 return once(source,'return {open,close,isOpen,setMode:','return {open,close,isOpen,result:()=>resultJob,setMode:');
});
edit('lab/studio.html',source=>{
 source=once(source,'image-viewer-editor.css?v=20261107-viewer-actions1','image-viewer-editor.css?v=20261107-inline-editor2');
 const needle='<script type="module" src="./lab.js?';if(source.split(needle).length!==2)throw Error('Unexpected Lab script');
 const start=source.indexOf(needle),end=source.indexOf('"',start+needle.length);
 return source.slice(0,end)+'&inlineViewer=20261107-inline-editor2'+source.slice(end);
});
edit('lab/image-viewer-editor.css',source=>{
 source=source.replace('#393b3c3c','#393b3c');
 source=once(source,'flex-direction:column;gap:16px;align-self:stretch','flex-direction:column;align-items:stretch;gap:16px;align-self:stretch');
 source=once(source,'.precision-bottom{display:block;margin:0;padding:0;border:0}', '.precision-bottom{display:block;margin:0;padding:0;border:0;width:100%;max-width:none}');
 source=once(source,'min-height:46px;width:100%;','min-height:46px;width:100%;max-width:none;');
 source=once(source,'.viewer-replacement-fields{display:flex;','.viewer-replacement-fields{width:100%;max-width:none;display:flex;');
 source=once(source,'font-size:10px;padding:7px;min-height:31px','font-size:12px;padding:7px;min-height:34px');
 source=once(source,'.precision-input-panel{width:100%;border:0;','.precision-input-panel{width:100%;min-height:0;border:0;');
 source=once(source,'#image-lightbox.is-viewer-editing .precision-board{order:1;flex:none;height:clamp(220px,46dvh,480px);min-height:220px}','#image-lightbox.is-viewer-editing .precision-board{order:1;flex:none;height:auto;min-height:0;max-height:52dvh}');
 return once(source,'@media(max-width:760px){','@media(max-width:760px){\n #image-lightbox.is-viewer-editing>#image-lightbox-close{display:none!important}');
});
edit('lab/image-viewer-editor.js',source=>{
 source=once(source,'let lastResult=null;','let lastResult=null, referenceRevision=0;');
 source=once(source,'function clearReference() {\n    reference=null;','function clearReference() {\n    ++referenceRevision;reference=null;');
 source=once(source,'const candidate=input.files?.[0], ticket=revision;','const candidate=input.files?.[0], ticket=revision, load=++referenceRevision;');
 source=once(source,'bitmap.close();\n      if(!active||ticket!==revision)return;','bitmap.close();\n      if(!active||ticket!==revision||load!==referenceRevision)return;');
 return once(source,'if(ticket===revision)status.textContent=error.message;','if(ticket===revision&&load===referenceRevision)status.textContent=error.message;');
});
edit('tests/lab-image-oneclick-ui.mjs',source=>source.replaceAll('#image-lightbox > #precision-workspace','.image-detail-media > #precision-workspace'));
edit('tests/lab-image-replacement-flow-ui.mjs',source=>{
 const first=source.indexOf("    page.once('dialog',dialog=>dialog.accept());",source.indexOf('// The approved sidebar actions'));
 const last=source.indexOf('    assert.deepEqual(errors, []);',first);if(first<0||last<first)throw Error('Missing old handoff assertions');
 const replacement=`    assert.equal(await page.locator('.image-detail-inspector').isVisible(),true,'Editing keeps the existing image details sidebar');
    assert.equal(await page.locator('.image-detail-media > #precision-workspace').count(),1,'Edit lives inside the existing photo pane');
    assert.equal(await page.locator('.precision-panel-label').first().isVisible(),false,'No technical Original/file-name header');
    assert.equal(await page.locator('.viewer-edit-options').getAttribute('open'),null,'Advanced tools are collapsed');
    assert.equal(submitted,1,'Preparing a viewer quote never submits a generation');
    assert.match(await page.locator('#viewer-replacement-continue').textContent(),/Generate.*35 credits/);
    const unchangedDraft=await page.evaluate(()=>({settings:window.__replacementFlow.state().settings,references:window.__replacementFlow.state().references}));
    await page.locator('#viewer-replacement-continue').click();
    await page.waitForFunction(()=>document.querySelector('#image-lightbox').open&&!document.querySelector('#image-lightbox').classList.contains('is-viewer-editing'));
    assert.equal(submitted,2,'One inline Generate click submits exactly one job');
    assert.equal(commits,2,'The inline result retains lossless exterior compositing');
    assert.equal(savedJob.settings.engine,'seedream','Inline replacement preserves the selected model');
    assert.equal(savedJob.settings.replacement.scope,'person');
    assert.deepEqual(await page.evaluate(()=>({settings:window.__replacementFlow.state().settings,references:window.__replacementFlow.state().references})),unchangedDraft,'The inline flow never overwrites the main Image draft');
    assert.equal(await page.locator('#image-detail-edit').isVisible(),true,'Result returns to the same viewer actions');
    assert.equal(page.url(),originalURL);
    assert.equal(requests.some(r=>/precision\\/(submit|quote)/.test(r.path)),false,'Reference replacement never switches to FLUX');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Inline editor fits mobile');
`;
 return source.slice(0,first)+replacement+source.slice(last);
});
edit('.github/workflows/pv-lab-precision-edit-ui.yml',source=>{
 source=source.replaceAll("      - 'lab/precision-edit.js'","      - 'lab/precision-edit.js'\n      - 'lab/image-viewer-editor.*'\n      - 'tests/lab-viewer-inline.test.mjs'");
 return once(source,'run: node --test tests/lab-precision-edit.test.mjs','run: node --test tests/lab-viewer-inline.test.mjs tests/lab-precision-edit.test.mjs');
});
console.log('Applied only the inline viewer integration, current-file cache keys and related tests.');
