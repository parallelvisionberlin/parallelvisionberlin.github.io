from pathlib import Path
import subprocess

expected={
 'lab/image-viewer-editor.js':'c942e54ea6e35ca060f419a3813a922f82efe256',
 'lab/selection-feedback.js':'41ee14ddf3e21fbc972982559f0cb7e0dd4f4a2a',
 'lab/lab.js':'25ded965bd2f29147fbbb384e5f5b61d41203095',
 'lab/viewer-guided-replace.css':'f12715653ce051371fbc56e5d1b7fde463484b90',
 'tests/lab-image-replacement-flow-ui.mjs':'b90b50e597461d8d2964bf379484d22407ac0c3b'
}
for p,sha in expected.items():
 assert subprocess.check_output(['git','hash-object',p],text=True).strip()==sha,'Baseline changed: '+p

def once(s,a,b):
 assert s.count(a)==1,'Expected exactly one match: '+a[:140]
 return s.replace(a,b)
def save(p,s):Path(p).write_text(s)

p='lab/image-viewer-editor.js';s=Path(p).read_text()
s=once(s,"  const selectedCard=document.createElement('div');selectedCard.className='viewer-selected-reference';selectedCard.hidden=true;", "  const chooseReference=document.createElement('button');chooseReference.type='button';chooseReference.id='viewer-choose-reference';chooseReference.className='viewer-choose-reference';chooseReference.hidden=true;\n  chooseReference.setAttribute('aria-expanded','false');chooseReference.setAttribute('aria-controls','viewer-saved-references');library.id='viewer-saved-references';\n  chooseReference.addEventListener('click',()=>{\n    if(!isReplace()||submitting||loadingReference||editor.isBusy()||scope.value==='location')return;\n    libraryOpen=!libraryOpen;library.hidden=!libraryOpen;\n    if(libraryOpen){renderLibrary();void fetchLibrary();}\n    refresh();\n  });\n  const selectedCard=document.createElement('div');selectedCard.className='viewer-selected-reference';selectedCard.hidden=true;")
s=once(s,'directionLabel.after(kinds,characterModes,selectionAdvice,library,selectedCard,locationNote,invert,keepObject);','directionLabel.after(kinds,characterModes,selectionAdvice,chooseReference,library,selectedCard,locationNote,invert,keepObject);')
s=once(s,"    libraryOpen=true;library.hidden=false;renderLibrary();void fetchLibrary();refresh();", "    // Mode selection never doubles as opening a private library.\n    if(changed){libraryOpen=false;library.hidden=true;}\n    refresh();")
s=once(s,'    selectedCard.hidden=!savedReference&&!loadingSavedReference;preview.hidden=!reference||!!savedReference;', '    selectedCard.hidden=!savedReference&&!loadingSavedReference;preview.hidden=!reference||!!savedReference;\n    chooseReference.hidden=!isReplace()||scope.value===\'location\';\n    chooseReference.disabled=submitting||loadingReference||editor.isBusy();\n    chooseReference.textContent=(libraryOpen?\'Close library\':(savedReference?\'Change \':\'Choose \')+replacementKind(scope.value).label);\n    chooseReference.setAttribute(\'aria-expanded\',String(libraryOpen));')
s=once(s,"    generate.textContent=submitting?'Generating…':loadingReference?'Loading references…':quoting?'Checking price…':quote?'Generate · '+quote.label:'Generate';", "    generate.textContent=submitting?'Generating…':loadingReference?'Loading references…':quoting?(/^Checking price/.test(status.textContent)?'Checking price…':'Preparing images…'):quote?'Generate · '+quote.label:'Generate';")
s=once(s,"    quoting=true;status.textContent='Validating the selection and checking the credit price…';refresh();", "    quoting=true;status.textContent='Preparing the selected image and references. No generation submitted.';refresh();")
s=once(s,"        onProgress:message=>{if(current())status.textContent=message;}});", "        onProgress:message=>{if(current()){status.textContent=message;refresh();}}});")
s=once(s,"labels.clear();title.remove();help.remove();sidebar.remove();", "labels.clear();title.remove();help.remove();sidebar.remove();chooseReference.hidden=true;")
save(p,s)

p='lab/viewer-guided-replace.css';s=Path(p).read_text();s+='''
/* Saved references are a separate action, never hidden in the active mode tile. */
#image-lightbox .viewer-choose-reference[hidden]{display:none!important}
#image-lightbox .viewer-choose-reference{display:block;width:100%;min-height:44px;padding:11px 14px;border:1px solid #655b70;border-radius:8px;background:#25212b;color:#f1eaf9;text-align:left;font:600 13px/1.4 'DM Sans',sans-serif;cursor:pointer}
#image-lightbox .viewer-choose-reference:hover{background:#302a38;border-color:#a08bb7}
#image-lightbox .viewer-choose-reference:focus-visible{outline:2px solid #e1d4f1;outline-offset:2px}
#image-lightbox .viewer-choose-reference:disabled{opacity:.5;cursor:default}
''';save(p,s)

p='lab/selection-feedback.js';s=Path(p).read_text()
s=once(s,'.pv-selection-feedback[hidden],.pv-selection-click-ring[hidden]', '.pv-selection-feedback[hidden],.pv-selection-click-ring[hidden],.pv-selection-scan[hidden]')
s=once(s,'top:14px;left:50%;','top:auto;bottom:24px;left:50%;')
s=once(s,'padding:9px 13px;','padding:13px 18px;')
s=once(s,'font-size:12px;','font-size:14px;')
s=once(s,'width:28px;height:28px;','width:38px;height:38px;')
s=once(s,'      #precision-source-holder[aria-busy=true]', '''      .pv-selection-scan{position:absolute;inset:0;z-index:7;overflow:hidden;pointer-events:none;border-radius:inherit}
      .pv-selection-scan::after{content:'';position:absolute;inset:-28% 0 auto;height:28%;background:linear-gradient(transparent,#e1d4f10d 78%,#e1d4f17d 99%,transparent);animation:pv-selection-sweep 2.25s ease-in-out infinite}
      @keyframes pv-selection-sweep{0%{top:-28%;opacity:0}12%{opacity:1}88%{opacity:1}100%{top:100%;opacity:0}}
      #precision-source-holder[aria-busy=true]''')
s=once(s,'.pv-selection-feedback>i,.pv-selection-click-ring{animation:none}', '.pv-selection-feedback>i,.pv-selection-click-ring,.pv-selection-scan::after{animation:none}.pv-selection-scan{display:none}')
s=once(s,"  let timer=null;", "  const scan=document.createElement('span');scan.className='pv-selection-scan';scan.hidden=true;scan.setAttribute('aria-hidden','true');stage.append(scan);\n  let timer=null;")
s=once(s,'badge.hidden=ring.hidden=true;', 'badge.hidden=ring.hidden=scan.hidden=true;')
s=once(s,"clear();badge.classList.remove('is-error');label.textContent=message;badge.hidden=false;", "clear();badge.classList.remove('is-error');label.textContent=message;badge.hidden=false;scan.hidden=false;")
save(p,s)

p='lab/lab.js';s=Path(p).read_text()
s="import {prepareViewerReferenceImages} from './viewer-reference-preparation.js?v=20261108-picker1';\n"+s
s=once(s,'{originals,engine:selected.engine,onProgress:s.onProgress,detached:!!s.onProgress}', '{originals,engine:selected.engine,onProgress:s.onProgress,detached:!!s.onProgress,viewerReplacement:s.viewerReplacement===true,checkCurrent:check}')
s=once(s,"      if(!inputs)throw new Error('Price checking was cancelled. Nothing was charged.');\n      const reply=await api('/api/quotes'", "      if(!inputs)throw new Error('Price checking was cancelled. Nothing was charged.');\n      s.onProgress?.('Checking price','Images ready; requesting the confirmed price. No generation submitted.');\n      const reply=await api('/api/quotes'")
s=once(s,'settings:selected,count:1,chosen,sourceMode:false,provider,disableAutoMoodReferences:true,', 'settings:selected,count:1,chosen,sourceMode:false,provider,disableAutoMoodReferences:true,viewerReplacement:true,')
a=s.index('async function prepareQuoteInputs(');b=s.index('async function upscaleImage(',a);section=s[a:b]
needle='  const transferSourceIds=[];\n  for(const item of originals){\n    // Dimensions'
section=once(section,needle,"  const transferSourceIds=[];\n  const checkPreparation=()=>{if(epoch!==sessionEpoch||!owner)throw new Error('Session changed.');snapshot?.checkCurrent?.();};\n  const prepareOne=async(item)=>{\n    checkPreparation();\n    // Dimensions")
section=once(section,'      transferSourceIds.push(item.id);continue;','      checkPreparation();return item.id;')
section=once(section,"      if(epoch!==sessionEpoch||!owner)throw new Error('Session changed.');\n      const id=await uploadAsset(prepared);copy={id,at:Date.now()};", "      checkPreparation();\n      const id=await uploadAsset(prepared);checkPreparation();copy={id,at:Date.now()};")
section=once(section,"    transferSourceIds.push(copy.id);\n  }\n  if(epoch!==sessionEpoch||!owner)throw new Error('Session changed.');\n  return {...inputs,transferSourceIds};", "    checkPreparation();return copy.id;\n  };\n  if(snapshot?.viewerReplacement){\n    transferSourceIds.push(...await prepareViewerReferenceImages(originals,prepareOne,{check:checkPreparation,onProgress:snapshot.onProgress}));\n  }else{\n    for(const item of originals)transferSourceIds.push(await prepareOne(item));\n  }\n  checkPreparation();\n  return {...inputs,transferSourceIds};")
s=s[:a]+section+s[b:]
s=once(s,'./image-viewer-editor.js?v=20261108-regions1','./image-viewer-editor.js?v=20261108-picker1')
save(p,s)
p='lab/precision-edit.js';s=Path(p).read_text();s=once(s,'./selection-feedback.js?v=20261108-regions1','./selection-feedback.js?v=20261108-picker1');save(p,s)
p='lab/lab.js';s=Path(p).read_text();s=once(s,'./precision-edit.js?v=20261108-regions1','./precision-edit.js?v=20261108-picker1');save(p,s)
p='lab/studio.html';s=Path(p).read_text();s=once(s,'viewer-guided-replace.css?v=20261107-face-whole1','viewer-guided-replace.css?v=20261108-picker1');s=once(s,'&selectionRegions=20261108-regions1','&selectionRegions=20261108-regions1&replacePicker=20261108-picker1');save(p,s)

p='tests/lab-image-replacement-flow-ui.mjs';s=Path(p).read_text()
s=once(s,"    await page.locator('[data-viewer-kind=\"person\"]').click();\n    await page.locator('[data-viewer-saved=\"20000000-0000-4000-8000-000000000088\"]').waitFor", "    await page.locator('[data-viewer-kind=\"person\"]').click();\n    assert.equal(await page.locator('.viewer-saved-library').isVisible(),false,'Mode tile no longer hides a library action');\n    assert.equal(await page.locator('#viewer-choose-reference').textContent(),'Choose Character');\n    await page.locator('#viewer-choose-reference').click();\n    assert.equal(await page.locator('#viewer-choose-reference').getAttribute('aria-expanded'),'true');\n    await page.locator('[data-viewer-saved=\"20000000-0000-4000-8000-000000000088\"]').waitFor")
s=once(s,"    assert.match(await page.locator('.viewer-selected-reference').textContent(),/Alma Eight.*8 photos/s);", "    assert.match(await page.locator('.viewer-selected-reference').textContent(),/Alma Eight.*8 photos/s);\n    assert.equal(await page.locator('#viewer-choose-reference').textContent(),'Change Character');\n    assert.equal(await page.locator('.viewer-saved-library').isVisible(),false,'Selecting a Character closes only the reference chooser');")
save(p,s)
p='tests/lab-selection-regions-ui.mjs';s=Path(p).read_text();s=once(s,"  assert.equal(await page.locator('.pv-selection-click-ring').isVisible(),true);", "  assert.equal(await page.locator('.pv-selection-click-ring').isVisible(),true);\n  assert.equal(await page.locator('.pv-selection-scan').isVisible(),true,'A visible in-photo sweep communicates processing');")
s=once(s,"  assert.equal(await page.locator('.pv-selection-feedback').isVisible(),false);", "  assert.equal(await page.locator('.pv-selection-feedback').isVisible(),false);\n  assert.equal(await page.locator('.pv-selection-scan').isVisible(),false,'The sweep stops when selection completes');")
save(p,s)
print('Scoped picker/progress patches applied. No provider, pricing, compositor, backend, or database changes.')
