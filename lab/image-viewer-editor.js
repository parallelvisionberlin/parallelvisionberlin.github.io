import {REPLACEMENT_KINDS,replacementKind,viewerLibraryEntries,loadViewerReference,createViewerReferenceCache,guidanceLearned,rememberGuidance} from './viewer-replacement-library.js?v=20261108-reference-cache1';
import {CHARACTER_SCOPES,replacementScope,selectionTarget,scopeInstruction,selectionAdvisory} from './viewer-selection-scope.js?v=20261108-regions1';
// Edit in the existing image viewer. Selection is local; only Generate may submit.
export function createImageViewerEditor({editor, onPrepare, onResult, notify, getSavedReferences=async()=>[], readReference, renderReference, getReferenceLimit=()=>10, account=()=>null, session=()=>null}) {
  const $ = id => document.getElementById(id);
  const dialog = $('image-lightbox'), workspace = $('precision-workspace');
  const media = dialog.querySelector('.image-detail-media');
  const inspector = dialog.querySelector('.image-detail-inspector');
  const sidebar = document.createElement('div'); sidebar.className = 'viewer-editor-sidebar';
  const home = document.createComment('precision workspace home'); workspace.before(home);
  const tools = workspace.querySelector('.precision-tools'), buttons = workspace.querySelector('.precision-tool-buttons');
  const deck = workspace.querySelector('.precision-deck'), back = $('precision-return'), prompt = $('precision-prompt');
  const directionLabel = deck.querySelector('label[for="precision-prompt"]');
  const original = {back:back.textContent, backLabel:back.getAttribute('aria-label'), placeholder:prompt.placeholder,
    label:directionLabel.textContent, title:workspace.getAttribute('aria-label')};
  const title = document.createElement('h2'); title.className = 'viewer-editor-title'; title.textContent = 'Edit';
  const options = document.createElement('details'); options.className = 'viewer-edit-options';
  options.innerHTML = '<summary>More options</summary><div class="viewer-edit-options-body"></div>';
  const fields = document.createElement('div'); fields.className = 'viewer-replacement-fields'; fields.hidden = true;
  fields.innerHTML = `<div class="viewer-reference-row"><img class="viewer-reference-preview" alt="Replacement reference" hidden>
    <label class="viewer-reference-picker" for="viewer-replacement-reference"><span>+ Add reference</span>
      <input id="viewer-replacement-reference" type="file" accept="image/jpeg,image/png,image/webp"></label>
    <button class="viewer-reference-remove" type="button" aria-label="Remove reference" hidden>×</button></div>
    <label class="viewer-reference-kind" hidden>Reference for <select id="viewer-replacement-scope"><option value="person">Person</option><option value="outfit">Outfit</option><option value="object">Object</option><option value="location">Location</option></select></label>
    <button id="viewer-replacement-continue" type="button" disabled hidden>Generate</button>
    <p class="viewer-replacement-status" role="status" aria-live="polite"></p>`;
  const input = fields.querySelector('input'), preview = fields.querySelector('img');
  const generate = fields.querySelector('#viewer-replacement-continue'), scope = fields.querySelector('select');
  const remove = fields.querySelector('.viewer-reference-remove'), kind = fields.querySelector('.viewer-reference-kind');
  const status = fields.querySelector('.viewer-replacement-status');
  deck.querySelector('.precision-deck-copy').after(fields); deck.append(options); options.hidden = true;
  const moves = [], labels = new Map();
  let active=false, opening=false, reference=null, referenceURL=null, sourceId=null, revision=0;
  let quoteRevision=0, quote=null, quoteTimer=null, quoting=false, submitting=false, uncertain=false, returnFocus=null;
  let lastResult=null, referenceRevision=0, actionMode='edit', savedReference=null, libraryItems=[], libraryTab='saved', characterScope='face';
  const localStorage=()=>{try{return window.localStorage;}catch{return null;}};
  let libraryTicket=0, libraryOpen=false, loadingReference=false, loadingSavedReference=null, learned=false, helpOpen=true, ownerSession=null;
  const privateReferences=createViewerReferenceCache({read:readReference,account});
  const paths={person:'<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',outfit:'<path d="m8 3-6 4 3 5 3-2v12h8V10l3 2 3-5-6-4c-1 3-7 3-8 0Z"/>',object:'<path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10v10M3 7l9 5 9-5M8 4l9 5"/>',location:'<path d="m2 20 7-13 5 8 3-6 5 11H2Z"/>'};
  const icon=name=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">'+paths[name]+'</svg>';
  const guide=document.createElement('div');guide.className='viewer-selection-guide';guide.hidden=true;
  guide.innerHTML='<span class="viewer-selection-symbol" aria-hidden="true">+</span><strong>Click what you want to replace.</strong><p>Select a person, outfit or object. Use Brush for a custom area.</p>';
  $('precision-source-holder').append(guide);
  const help=document.createElement('button');help.type='button';help.className='viewer-guide-toggle';help.textContent='?';help.title='Show selection guidance';help.setAttribute('aria-label','Show selection guidance');
  const hint=document.createElement('p');hint.className='viewer-selection-hint';hint.setAttribute('role','status');hint.setAttribute('aria-live','polite');hint.hidden=true;
  const kinds=document.createElement('div');kinds.className='viewer-replacement-kinds';kinds.setAttribute('role','group');kinds.setAttribute('aria-label','Replacement type');kinds.hidden=true;
  for(const kind of REPLACEMENT_KINDS){const button=document.createElement('button');button.type='button';button.dataset.viewerKind=kind.id;button.innerHTML=icon(kind.icon)+'<span>'+kind.label+'</span>';button.addEventListener('click',()=>setKind(kind.id));kinds.append(button);}
  const characterModes=document.createElement('div');characterModes.className='viewer-character-scopes';
  characterModes.setAttribute('role','group');characterModes.setAttribute('aria-label','Character replacement area');characterModes.hidden=true;
  const characterCaption=document.createElement('span');characterCaption.textContent='Replace area';characterModes.append(characterCaption);
  for(const choice of CHARACTER_SCOPES){
    const button=document.createElement('button');button.type='button';button.dataset.viewerCharacterScope=choice.id;
    button.textContent=choice.label;button.setAttribute('aria-pressed',String(choice.id===characterScope));
    button.onclick=()=>setCharacterScope(choice.id);characterModes.append(button);
  }
  const selectionAdvice=document.createElement('div');selectionAdvice.className='viewer-selection-advice';selectionAdvice.hidden=true;
  selectionAdvice.setAttribute('role','status');
  const adviceText=document.createElement('p');selectionAdvice.append(adviceText);
  const brushExtend=document.createElement('button');brushExtend.type='button';brushExtend.textContent='Extend with Brush';
  brushExtend.onclick=()=>editor.setMode('brush');selectionAdvice.append(brushExtend);
  const reselect=document.createElement('button');reselect.type='button';reselect.textContent='Reselect person';
  reselect.onclick=()=>{editor.clearSelection();editor.setMode('magic');helpOpen=true;refresh();};selectionAdvice.append(reselect);
  const library=document.createElement('section');library.className='viewer-saved-library';library.hidden=true;
  library.innerHTML='<div class="viewer-library-tabs" role="tablist" aria-label="Saved references"><button type="button" role="tab" data-viewer-tab="saved">My Characters</button><button type="button" role="tab" data-viewer-tab="library">Library</button></div><div class="viewer-library-grid" role="tabpanel"></div><p class="viewer-library-empty"></p>';
  const chooseReference=document.createElement('button');chooseReference.type='button';chooseReference.id='viewer-choose-reference';chooseReference.className='viewer-choose-reference';chooseReference.hidden=true;
  chooseReference.setAttribute('aria-expanded','false');chooseReference.setAttribute('aria-controls','viewer-saved-references');library.id='viewer-saved-references';
  chooseReference.addEventListener('click',()=>{
    if(!isReplace()||submitting||loadingReference||editor.isBusy()||scope.value==='location')return;
    libraryOpen=!libraryOpen;library.hidden=!libraryOpen;
    if(libraryOpen){renderLibrary();void fetchLibrary();}
    refresh();
  });
  const selectedCard=document.createElement('div');selectedCard.className='viewer-selected-reference';selectedCard.hidden=true;
  selectedCard.innerHTML='<div class="viewer-selected-cover"></div><div><strong></strong><small></small></div><button type="button" aria-label="Remove replacement reference">×</button>';
  const locationNote=document.createElement('p');locationNote.className='viewer-location-note';locationNote.hidden=true;
  locationNote.textContent='Select the whole background, then review that all people are protected. Use Keep object for props. Saved location references are not supported by the current server; describe the new setting below.';
  const invert=document.createElement('button');invert.type='button';invert.className='viewer-invert';invert.textContent='Select whole background';invert.hidden=true;
  invert.addEventListener('click',()=>{if(!submitting&&!editor.isBusy())void editor.selectBackground?.();});
  const keepObject=document.createElement('button');keepObject.type='button';keepObject.className='viewer-invert';keepObject.textContent='Keep object';keepObject.hidden=true;keepObject.setAttribute('aria-pressed','false');
  keepObject.addEventListener('click',()=>{if(submitting||editor.isBusy()||!editor.hasSelection())return;const protect=editor.getSelectionTarget?.()!=='protect-object';editor.setSelectionTarget(protect?'protect-object':'background');editor.setMode('magic');status.textContent=protect?'Click an object to keep unchanged.':'Click the photo to select the whole background again.';refresh();});
  // The replacement panel follows the approved order: type, saved reference, prompt, Generate.
  directionLabel.before(hint);directionLabel.after(kinds,characterModes,selectionAdvice,chooseReference,library,selectedCard,locationNote,invert,keepObject);
  const uploadRow=fields.querySelector('.viewer-reference-row');
  const uploadHome=document.createComment('viewer upload row home');uploadRow.before(uploadHome);
  selectedCard.querySelector('button').addEventListener('click',()=>{
    if(loadingReference){
      ++referenceRevision;loadingReference=false;loadingSavedReference=null;
      editor.setExternalMode(false);clearReference();invalidate();renderLibrary();refresh();
      status.textContent='Reference loading cancelled. Nothing was charged.';
      return;
    }
    remove.click();
  });
  help.addEventListener('click',()=>{helpOpen=!helpOpen;refresh();});
  for(const button of library.querySelectorAll('[data-viewer-tab]'))button.addEventListener('click',()=>{libraryTab=button.dataset.viewerTab;renderLibrary();});
  function isReplace(){return actionMode==='replace';}
  function setCharacterScope(next){
    if(!isReplace()||scope.value!=='person'||submitting||editor.isBusy()||loadingReference||characterScope===next)return;
    characterScope=next;clearReference();editor.setExternalMode(false);
    editor.clearSelection();editor.setSelectionTarget(selectionTarget(scope.value,characterScope));
    invalidate();libraryOpen=false;library.hidden=true;refresh();
  }
  function setKind(next){
    if(submitting||editor.isBusy()||loadingReference)return;
    const changed=scope.value!==next;
    scope.value=next;
    if(changed){clearReference();editor.setExternalMode(false);editor.clearSelection?.();status.textContent='';invalidate();}
    editor.setSelectionTarget(selectionTarget(scope.value,characterScope));
    // Mode selection never doubles as opening a private library.
    if(changed){libraryOpen=false;library.hidden=true;}
    refresh();
  }
  function renderLibrary(){
    const currentKind=replacementKind(scope.value);
    library.querySelector('[data-viewer-tab="saved"]').textContent='My '+currentKind.plural;
    for(const tab of library.querySelectorAll('[data-viewer-tab]'))tab.setAttribute('aria-selected',String(libraryTab===tab.dataset.viewerTab));
    const grid=library.querySelector('.viewer-library-grid');grid.replaceChildren();
    const entries=viewerLibraryEntries(libraryItems,scope.value,libraryTab);
    for(const item of entries){
      const card=document.createElement('button');card.type='button';card.className='viewer-library-card';card.dataset.viewerSaved=item.id;card.setAttribute('aria-label',item.title+' · '+item.refs.length+' photos');
      const photo=document.createElement('span');photo.className='viewer-library-cover';const name=document.createElement('span');name.textContent=item.title;card.append(photo,name);
      card.disabled=submitting||loadingReference||scope.value==='location';
      if(scope.value==='location')card.title='Saved location references require server support. You can describe a new setting instead.';
      card.onclick=()=>void chooseSaved(item);grid.append(card);renderReference?.(photo,item.refs[0]?.id);
    }
    library.querySelector('.viewer-library-empty').textContent=entries.length?'':libraryTab==='saved'?'No saved '+currentKind.plural.toLowerCase()+' yet. Upload a reference below.':'No matching photo packs. Upload a reference below.';
  }
  async function fetchLibrary(){
    const ticket=++libraryTicket,revisionAtOpen=revision,accountAtOpen=ownerSession;
    try{const items=await getSavedReferences();if(!active||ticket!==libraryTicket||revision!==revisionAtOpen||session()!==accountAtOpen)return;libraryItems=items;renderLibrary();}
    catch(error){if(active&&ticket===libraryTicket)library.querySelector('.viewer-library-empty').textContent='Could not load saved references. '+error.message;}
  }
  async function chooseSaved(item){
    if(submitting||loadingReference||scope.value==='location')return;
    clearReference();
    const ticket=revision,load=++referenceRevision,selectedKind=scope.value;
    const current=()=>active&&ticket===revision&&load===referenceRevision&&session()===ownerSession;
    loadingReference=true;loadingSavedReference=item;editor.setExternalMode(true);invalidate();
    selectedCard.querySelector('strong').textContent=item.title;
    selectedCard.querySelector('small').textContent='Preparing '+item.refs.length+' saved photos…';
    const cover=selectedCard.querySelector('.viewer-selected-cover');
    cover.replaceChildren();renderReference?.(cover,item.refs[0]?.id);
    status.textContent='Loading saved references. Nothing has been generated or charged.';
    refresh();for(const card of library.querySelectorAll('.viewer-library-card'))card.disabled=true;
    try{
      const bundle=await loadViewerReference(item,selectedKind==='person'&&characterScope==='face'?'face':selectedKind,{
        read:privateReferences.get,limit:getReferenceLimit(),isCurrent:current,direction:prompt.value.trim(),
        onProgress:(done,total)=>{
          if(!current())return;
          selectedCard.querySelector('small').textContent='Loading '+done+' / '+total+' reference photos…';
          status.textContent='Loading '+done+' of '+total+' photos. No generation submitted.';
        }
      });
      if(!current())return;
      savedReference=bundle;reference=bundle.refs[0].file;
      selectedCard.querySelector('strong').textContent=bundle.name;
      selectedCard.querySelector('small').textContent=bundle.count+' photo'+(bundle.count===1?'':'s')+' · '+replacementKind(selectedKind).label;
      libraryOpen=false;library.hidden=true;editor.setExternalMode(true);
    }catch(error){
      if(current()){
        loadingSavedReference=null;status.textContent='Could not load the saved Character. Nothing was charged. '+error.message;
      }
    }finally{
      if(current()){
        loadingReference=false;loadingSavedReference=null;editor.setExternalMode(!!reference);
        if(reference){invalidate();status.textContent=editor.hasSelection()?'Preparing the exact credit price…':'Reference ready. Select the area to replace.';}
        refresh();if(libraryOpen)renderLibrary();
      }
    }
  }
  function markLearned(){if(isReplace()&&session()===ownerSession)rememberGuidance(localStorage(),account());}

  function move(node, parent) { const marker=document.createComment('viewer control home'); node.before(marker); moves.push([node,marker]); parent.append(node); }
  function rename(node,text) { labels.set(node,node.textContent); node.textContent=text; }
  function mount(action) {
    workspace.style.setProperty('--viewer-source-padding',getComputedStyle($('image-lightbox-stage')).padding);
    media.append(workspace); workspace.setAttribute('aria-label',action==='replace'?'Replace part of this image':'Edit this image');
    title.textContent=action==='replace'?'Replace':'Edit'; tools.prepend(title);tools.append(help);help.hidden=action!=='replace';
    move(back,tools);
    move(workspace.querySelector('.precision-tool-size'),options.lastElementChild);
    move($('precision-expand'),options.lastElementChild);
    move(workspace.querySelector('.precision-strength'),options.lastElementChild);
    inspector.append(sidebar); move(tools,sidebar); move(deck,sidebar);
    rename($('precision-tool-magic'),'Select'); rename($('precision-tool-brush'),'Brush'); rename($('precision-tool-erase'),'Erase');
    back.textContent='×'; back.setAttribute('aria-label','Back to image viewer'); back.title='Back to image';
    directionLabel.textContent='What do you want to change?'; prompt.placeholder='Describe the change…';
    fields.hidden=false; options.hidden=false;kinds.hidden=hint.hidden=!isReplace();
    scope.querySelector('[value=location]').hidden=!isReplace();if(!isReplace()&&scope.value==='location')scope.value='person';
    workspace.classList.toggle('is-guided-replace',isReplace());
    sidebar.classList.toggle('is-guided-replace',isReplace());
    if(!isReplace()){uploadHome.after(uploadRow);uploadRow.querySelector('.viewer-reference-picker span').textContent='+ Add reference';uploadRow.querySelector('label').classList.remove('is-unavailable');}else{prompt.before(uploadRow);uploadRow.querySelector('.viewer-reference-picker span')?.replaceChildren(document.createTextNode('+ Upload reference'));}
  }
  function refresh() {
    if(!active)return;
    workspace.classList.toggle('has-viewer-reference',!!reference||loadingReference);
    sidebar.classList.toggle('has-viewer-reference',!!reference||loadingReference);
    kind.hidden=isReplace()||!reference;remove.hidden=!reference||!!savedReference;generate.hidden=!reference&&!loadingReference;
    selectedCard.hidden=!savedReference&&!loadingSavedReference;preview.hidden=!reference||!!savedReference;
    chooseReference.hidden=!isReplace()||scope.value==='location';
    chooseReference.disabled=submitting||loadingReference||editor.isBusy();
    chooseReference.textContent=(libraryOpen?'Close library':(savedReference?'Change ':'Choose ')+replacementKind(scope.value).label);
    chooseReference.setAttribute('aria-expanded',String(libraryOpen));
    const chosen=editor.hasSelection(),type=replacementKind(scope.value),mode=$('precision-tool-magic').getAttribute('aria-pressed')==='true'?'magic':$('precision-tool-brush').getAttribute('aria-pressed')==='true'?'brush':'other';
    const characterMode=isReplace()&&scope.value==='person', effective=replacementScope(scope.value,characterScope), metrics=chosen?editor.selectionMetrics?.():null;
    const advisory=characterMode&&chosen?selectionAdvisory(scope.value,characterScope,metrics):null;
    // Do not offer a paid generation with a face-sized Whole person mask (or
    // an oversized Face mask). Geometry is a conservative warning, not anatomy recognition.
    const incompleteCharacterMask=Boolean(advisory);
    workspace.dataset.selectionTool=mode;workspace.classList.toggle('has-guided-selection',chosen);
    sidebar.classList.toggle('has-guided-selection',chosen);
    const protecting=isReplace()&&scope.value==='location'&&editor.getSelectionTarget?.()==='protect-object';
    guide.hidden=!isReplace()||(chosen&&!protecting)||!helpOpen||editor.isBusy();guide.classList.toggle('is-compact',learned||protecting);
    guide.querySelector('strong').textContent=protecting?'Click an object to keep unchanged.':scopeInstruction(scope.value,characterScope,mode==='brush');
    guide.querySelector('p').textContent=scope.value==='person'?(characterScope==='face'?'Only the purple face area changes.':'Use Brush or Erase to refine the complete visible silhouette.'):'The purple selection is the only area that can change.';
    characterModes.hidden=!characterMode;
    for(const b of characterModes.querySelectorAll('[data-viewer-character-scope]')){b.setAttribute('aria-pressed',String(b.dataset.viewerCharacterScope===characterScope));b.disabled=submitting||editor.isBusy()||loadingReference;}
    selectionAdvice.hidden=!advisory;adviceText.textContent=advisory?.text||'';
    brushExtend.hidden=!advisory;reselect.hidden=!advisory||advisory.kind!=='small';
    help.setAttribute('aria-expanded',String(!guide.hidden));
    if(isReplace()){
      hint.textContent=editor.isBusy()?'Selecting…':chosen?'✓ '+(characterMode?(characterScope==='face'?'Face mode':'Whole person mode'):'Selection')+' · Selection ready.':'1 · Select what to replace';hint.classList.toggle('is-ready',chosen);
      directionLabel.textContent=chosen?'Replace selected '+(effective==='face'?'face area':type.target)+' with…':'Replace with…';
      prompt.placeholder=characterMode&&characterScope==='face'?'Describe the new face…':type.placeholder;
      for(const button of kinds.children){button.setAttribute('aria-pressed',String(button.dataset.viewerKind===scope.value));button.disabled=submitting||editor.isBusy()||loadingReference;}
    }
    locationNote.hidden=invert.hidden=keepObject.hidden=!isReplace()||scope.value!=='location';invert.disabled=submitting||editor.isBusy();
    keepObject.disabled=!chosen||submitting||editor.isBusy();keepObject.setAttribute('aria-pressed',String(protecting));
    selectedCard.setAttribute('aria-busy',String(loadingReference));
    input.disabled=submitting||loadingReference||isReplace()&&scope.value==='location';
    if(isReplace())uploadRow.querySelector('label').classList.toggle('is-unavailable',scope.value==='location');
    scope.disabled=remove.disabled=submitting;
    if(!isReplace())input.disabled=submitting;
    generate.disabled=submitting||loadingReference||quoting||uncertain||!quote||!editor.hasSelection()||editor.isBusy()||incompleteCharacterMask;
    generate.textContent=submitting?'Generating…':loadingReference?'Loading references…':quoting?(/^Checking price/.test(status.textContent)?'Checking price…':'Preparing images…'):quote?'Generate · '+quote.label:'Generate';
  }
  function invalidate() {
    ++quoteRevision; quote=null; quoting=false; clearTimeout(quoteTimer); quoteTimer=null;
    if(!active)return;
    status.textContent=''; refresh();
    if(reference&&!loadingReference&&editor.hasSelection()&&!editor.isBusy()&&!submitting&&!uncertain)
      quoteTimer=setTimeout(()=>void prepare(),700);
  }
  async function prepare() {
    quoteTimer=null;
    if(!active||!reference||!editor.hasSelection()||editor.isBusy()||submitting||uncertain)return;
    const maskWarning=isReplace()&&scope.value==='person'?selectionAdvisory('person',characterScope,editor.selectionMetrics?.()):null;
    if(maskWarning){status.textContent='Refine the purple selection before paying. '+maskWarning.text;refresh();return;}
    const ticket=revision, version=quoteRevision, destination=reference, direction=prompt.value.trim(), selectedScope=replacementScope(scope.value,characterScope);
    const current=()=>active&&ticket===revision&&version===quoteRevision&&destination===reference;
    quoting=true;status.textContent='Preparing the selected image and references. No generation submitted.';refresh();
    try {
      const selection=await editor.selectionSnapshot(); if(!current())return;
      const prepared=await onPrepare({...selection,reference:destination,scope:selectedScope,direction,references:savedReference?.refs,isCurrent:current,
        onProgress:message=>{if(current()){status.textContent=message;refresh();}}});
      if(!current()||!selection.selectionCurrent())return;
      quote=prepared;
      status.textContent=selectedScope==='person'?'Price ready. Whole-person swaps in overlapping poses may show seams with this model. Check the result before reusing it.':'Price ready. Generate only when the selection looks right.';
      clearTimeout(quoteTimer);
      quoteTimer=setTimeout(invalidate,Math.max(1000,prepared.expiresAt-Date.now()-15000));
    } catch(error) { if(current())status.textContent='Could not prepare this edit. No generation was charged. '+error.message; }
    finally { if(current()){quoting=false;refresh();} }
  }
  function clearReference() {
    ++referenceRevision;savedReference=null;loadingSavedReference=null;selectedCard.hidden=true;reference=null; input.value=''; preview.hidden=true; preview.removeAttribute('src');
    if(referenceURL)URL.revokeObjectURL(referenceURL); referenceURL=null;
  }
  input.addEventListener('change',async()=>{
    const candidate=input.files?.[0], ticket=revision, load=++referenceRevision;
    if(!candidate||submitting||isReplace()&&scope.value==='location')return;
    try {
      if(!['image/jpeg','image/png','image/webp'].includes(candidate.type)||!candidate.size||candidate.size>20*1024*1024)
        throw Error('Choose a JPG, PNG or WebP reference up to 20 MB.');
      const bitmap=await createImageBitmap(candidate);
      const valid=Math.min(bitmap.width,bitmap.height)>=240&&Math.max(bitmap.width,bitmap.height)<=8192; bitmap.close();
      if(!active||ticket!==revision||load!==referenceRevision)return;
      if(!valid)throw Error('Use a reference from 240 to 8192 pixels per side.');
      clearReference(); reference=candidate; referenceURL=URL.createObjectURL(candidate); preview.src=referenceURL;preview.hidden=false;
      editor.setExternalMode(true); invalidate();
    } catch(error) { if(ticket===revision&&load===referenceRevision)status.textContent=error.message; }
    refresh();
  });
  remove.addEventListener('click',()=>{if(submitting)return;clearReference();editor.setExternalMode(false);invalidate();});
  scope.addEventListener('change',invalidate); prompt.addEventListener('input',invalidate);
  workspace.addEventListener('precision-selection-change',invalidate);
  workspace.addEventListener('precision-selection-target-change',refresh);
  workspace.addEventListener('precision-selection-busy',event=>{refresh();if(event.detail?.changed&&!editor.isBusy())invalidate();});
  generate.addEventListener('click',async()=>{
    if(generate.disabled||!quote)return;
    const prepared=quote, ticket=revision, version=quoteRevision;
    quote=null;clearTimeout(quoteTimer);quoteTimer=null;submitting=true;status.textContent='';refresh();
    try {
      const job=await prepared.submit();
      if(!job?.id)throw Error('No job was confirmed. Check Queue before retrying.');
      const result=await prepared.result(job,()=>active&&ticket===revision);
      if(result&&active&&ticket===revision&&version===quoteRevision){markLearned();close();await onResult(result);}
      else if(active&&ticket===revision)status.textContent='Saved in History. Your newer selection is unchanged.';
    } catch(error) {
      if(active&&ticket===revision){uncertain=prepared.wasSubmitted();status.textContent=error.message;}
    } finally {submitting=false;if(active&&ticket===revision){refresh();}}
  });
  const resultObserver=new MutationObserver(()=>{
    if(!active||reference||$('precision-result-canvas').hidden)return;
    const result=editor.result?.();
    if(!result||result.id===lastResult)return;
    lastResult=result.id;markLearned();close();void Promise.resolve(onResult(result)).catch(error=>notify(error.message,true));
  });
  resultObserver.observe($('precision-result-canvas'),{attributes:true,attributeFilter:['hidden']});
  const busyObserver=new MutationObserver(refresh);
  busyObserver.observe($('precision-clear-mask'),{attributes:true,attributeFilter:['disabled']});
  busyObserver.observe($('precision-tool-magic'),{attributes:true,attributeFilter:['aria-pressed']});
  busyObserver.observe($('precision-tool-brush'),{attributes:true,attributeFilter:['aria-pressed']});
  async function open({file,id,action='edit'}) {
    if(opening||submitting||editor.isBusy())throw Error('Finish the current image operation first.');
    if(!dialog.open)throw Error('Open the image before editing it.');
    if(active)close();
    opening=true;const ticket=++revision;returnFocus=document.activeElement;
    const changed=sourceId!==id;
    try {
      if(changed||ownerSession!==session()){clearReference();prompt.value='';scope.value='person';uncertain=false;libraryItems=[];}
      if(action==='replace')characterScope='face';
      actionMode=action;ownerSession=session();learned=guidanceLearned(localStorage(),account());helpOpen=true;libraryOpen=false;library.hidden=true;
      sourceId=id;active=true;lastResult=null;dialog.classList.add('is-viewer-editing');mount(action);
      editor.setExternalMode(!!reference);
      await editor.open({file,id});
      if(!active||ticket!==revision)return;
      editor.setSelectionTarget(action==='replace'?selectionTarget(scope.value,characterScope):'');
      editor.setMode(action==='replace'?'magic':'brush');
      invalidate();back.focus({preventScroll:true});
    }catch(error){close();throw error;}finally{opening=false;}
  }
  function close() {
    if(!active)return false;
    ++revision;++quoteRevision;++referenceRevision;active=false;loadingReference=false;loadingSavedReference=null;quote=null;quoting=false;clearTimeout(quoteTimer);quoteTimer=null;
    editor.close();editor.setExternalMode(false);home.after(workspace);uploadHome.after(uploadRow);
    for(const [node,marker] of moves.reverse()){marker.after(node);marker.remove();}moves.length=0;
    for(const [node,text] of labels)node.textContent=text;labels.clear();title.remove();help.remove();sidebar.remove();chooseReference.hidden=true;
    dialog.classList.remove('is-viewer-editing');workspace.classList.remove('has-viewer-reference','is-guided-replace','has-guided-selection');guide.hidden=kinds.hidden=hint.hidden=library.hidden=selectedCard.hidden=locationNote.hidden=invert.hidden=keepObject.hidden=characterModes.hidden=selectionAdvice.hidden=true;++libraryTicket;
    editor.setSelectionTarget('');
    workspace.setAttribute('aria-label',original.title);fields.hidden=options.hidden=true;options.open=false;
    back.textContent=original.back;back.setAttribute('aria-label',original.backLabel);back.removeAttribute('title');
    directionLabel.textContent=original.label;prompt.placeholder=original.placeholder;
    if(dialog.open&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
    return true;
  }
  function reset(){close();libraryItems=[];ownerSession=null;sourceId=null;clearReference();privateReferences.clear();uncertain=false;status.textContent='';}
  dialog.addEventListener('cancel',event=>{if(active){event.preventDefault();close();}});
  dialog.addEventListener('close',()=>{if(!dialog.open)close();});
  return {open,close,reset,active:()=>active};
}
