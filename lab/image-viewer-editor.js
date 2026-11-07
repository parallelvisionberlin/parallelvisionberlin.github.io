// Edit in the existing image viewer. Selection is local; only Generate may submit.
export function createImageViewerEditor({editor, onPrepare, onResult, notify}) {
  const $ = id => document.getElementById(id);
  const dialog = $('image-lightbox'), workspace = $('precision-workspace');
  const media = dialog.querySelector('.image-detail-media');
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
    <label class="viewer-reference-kind" hidden>Reference for <select id="viewer-replacement-scope"><option value="person">Person</option><option value="outfit">Outfit</option><option value="object">Object</option></select></label>
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
  let lastResult=null;
  function move(node, parent) { const marker=document.createComment('viewer control home'); node.before(marker); moves.push([node,marker]); parent.append(node); }
  function rename(node,text) { labels.set(node,node.textContent); node.textContent=text; }
  function mount(action) {
    media.append(workspace); workspace.setAttribute('aria-label',action==='replace'?'Replace part of this image':'Edit this image');
    title.textContent=action==='replace'?'Replace':'Edit'; tools.prepend(title);
    move(back,tools);
    move(workspace.querySelector('.precision-tool-size'),options.lastElementChild);
    move($('precision-expand'),options.lastElementChild);
    move(workspace.querySelector('.precision-strength'),options.lastElementChild);
    rename($('precision-tool-magic'),'Select'); rename($('precision-tool-brush'),'Brush'); rename($('precision-tool-erase'),'Erase');
    back.textContent='×'; back.setAttribute('aria-label','Back to image viewer'); back.title='Back to image';
    directionLabel.textContent='What do you want to change?'; prompt.placeholder='Describe the change…';
    fields.hidden=false; options.hidden=false;
  }
  function refresh() {
    if(!active)return;
    workspace.classList.toggle('has-viewer-reference',!!reference);
    kind.hidden=remove.hidden=!reference; generate.hidden=!reference;
    input.disabled=scope.disabled=remove.disabled=submitting;
    generate.disabled=submitting||quoting||uncertain||!quote||!editor.hasSelection()||editor.isBusy();
    generate.textContent=submitting?'Generating…':quote?'Generate · '+quote.label:'Generate';
  }
  function invalidate() {
    ++quoteRevision; quote=null; quoting=false; clearTimeout(quoteTimer); quoteTimer=null;
    if(!active)return;
    status.textContent=''; refresh();
    if(reference&&editor.hasSelection()&&!editor.isBusy()&&!submitting&&!uncertain)
      quoteTimer=setTimeout(()=>void prepare(),700);
  }
  async function prepare() {
    quoteTimer=null;
    if(!active||!reference||!editor.hasSelection()||editor.isBusy()||submitting||uncertain)return;
    const ticket=revision, version=quoteRevision, destination=reference, direction=prompt.value.trim(), selectedScope=scope.value;
    const current=()=>active&&ticket===revision&&version===quoteRevision&&destination===reference;
    quoting=true; refresh();
    try {
      const selection=await editor.selectionSnapshot(); if(!current())return;
      const prepared=await onPrepare({...selection,reference:destination,scope:selectedScope,direction,isCurrent:current});
      if(!current()||!selection.selectionCurrent())return;
      quote=prepared;
      clearTimeout(quoteTimer);
      quoteTimer=setTimeout(invalidate,Math.max(1000,prepared.expiresAt-Date.now()-15000));
    } catch(error) { if(current())status.textContent=error.message; }
    finally { if(current()){quoting=false;refresh();} }
  }
  function clearReference() {
    reference=null; input.value=''; preview.hidden=true; preview.removeAttribute('src');
    if(referenceURL)URL.revokeObjectURL(referenceURL); referenceURL=null;
  }
  input.addEventListener('change',async()=>{
    const candidate=input.files?.[0], ticket=revision;
    if(!candidate||submitting)return;
    try {
      if(!['image/jpeg','image/png','image/webp'].includes(candidate.type)||!candidate.size||candidate.size>20*1024*1024)
        throw Error('Choose a JPG, PNG or WebP reference up to 20 MB.');
      const bitmap=await createImageBitmap(candidate);
      const valid=Math.min(bitmap.width,bitmap.height)>=240&&Math.max(bitmap.width,bitmap.height)<=8192; bitmap.close();
      if(!active||ticket!==revision)return;
      if(!valid)throw Error('Use a reference from 240 to 8192 pixels per side.');
      clearReference(); reference=candidate; referenceURL=URL.createObjectURL(candidate); preview.src=referenceURL;preview.hidden=false;
      editor.setExternalMode(true); invalidate();
    } catch(error) { if(ticket===revision)status.textContent=error.message; }
    refresh();
  });
  remove.addEventListener('click',()=>{if(submitting)return;clearReference();editor.setExternalMode(false);invalidate();});
  scope.addEventListener('change',invalidate); prompt.addEventListener('input',invalidate);
  workspace.addEventListener('precision-selection-change',invalidate);
  generate.addEventListener('click',async()=>{
    if(generate.disabled||!quote)return;
    const prepared=quote, ticket=revision, version=quoteRevision;
    quote=null;clearTimeout(quoteTimer);quoteTimer=null;submitting=true;status.textContent='';refresh();
    try {
      const job=await prepared.submit();
      if(!job?.id)throw Error('No job was confirmed. Check Queue before retrying.');
      const result=await prepared.result(job,()=>active&&ticket===revision);
      if(result&&active&&ticket===revision&&version===quoteRevision){close();await onResult(result);}
      else if(active&&ticket===revision)status.textContent='Saved in History. Your newer selection is unchanged.';
    } catch(error) {
      if(active&&ticket===revision){uncertain=prepared.wasSubmitted();status.textContent=error.message;}
    } finally {submitting=false;if(active&&ticket===revision){refresh();}}
  });
  const resultObserver=new MutationObserver(()=>{
    if(!active||reference||$('precision-result-canvas').hidden)return;
    const result=editor.result?.();
    if(!result||result.id===lastResult)return;
    lastResult=result.id;close();void Promise.resolve(onResult(result)).catch(error=>notify(error.message,true));
  });
  resultObserver.observe($('precision-result-canvas'),{attributes:true,attributeFilter:['hidden']});
  const busyObserver=new MutationObserver(refresh);
  busyObserver.observe($('precision-clear-mask'),{attributes:true,attributeFilter:['disabled']});
  async function open({file,id,action='edit'}) {
    if(opening||submitting||editor.isBusy())throw Error('Finish the current image operation first.');
    if(!dialog.open)throw Error('Open the image before editing it.');
    if(active)close();
    opening=true;const ticket=++revision;returnFocus=document.activeElement;
    const changed=sourceId!==id;
    try {
      if(changed){clearReference();prompt.value='';scope.value='person';uncertain=false;}
      sourceId=id;active=true;lastResult=null;dialog.classList.add('is-viewer-editing');mount(action);
      editor.setExternalMode(!!reference);
      await editor.open({file,id});
      if(!active||ticket!==revision)return;
      editor.setMode(action==='replace'?'magic':'brush');
      invalidate();back.focus({preventScroll:true});
    }catch(error){close();throw error;}finally{opening=false;}
  }
  function close() {
    if(!active)return false;
    ++revision;++quoteRevision;active=false;quote=null;quoting=false;clearTimeout(quoteTimer);quoteTimer=null;
    editor.close();editor.setExternalMode(false);home.after(workspace);
    for(const [node,marker] of moves.reverse()){marker.after(node);marker.remove();}moves.length=0;
    for(const [node,text] of labels)node.textContent=text;labels.clear();title.remove();
    dialog.classList.remove('is-viewer-editing');workspace.classList.remove('has-viewer-reference');
    workspace.setAttribute('aria-label',original.title);fields.hidden=options.hidden=true;options.open=false;
    back.textContent=original.back;back.setAttribute('aria-label',original.backLabel);back.removeAttribute('title');
    directionLabel.textContent=original.label;prompt.placeholder=original.placeholder;
    if(dialog.open&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
    return true;
  }
  function reset(){close();sourceId=null;clearReference();uncertain=false;status.textContent='';}
  dialog.addEventListener('cancel',event=>{if(active){event.preventDefault();close();}});
  dialog.addEventListener('close',()=>{if(!dialog.open)close();});
  return {open,close,reset,active:()=>active};
}
