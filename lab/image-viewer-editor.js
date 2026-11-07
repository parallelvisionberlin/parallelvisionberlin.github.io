// Contextual entry to the existing precision editor. No generation API here.
export function createImageViewerEditor({editor, onReplace, notify}) {
  const $ = id => document.getElementById(id);
  const dialog = $('image-lightbox'), workspace = $('precision-workspace');
  const anchor = document.createComment('precision workspace home');
  workspace.before(anchor);
  let active = false, opening = false, mode = 'edit', reference = null, referenceURL = null;
  let sourceId = null, revision = 0, handoffBusy = false, returnFocus = null;
  const title = workspace.querySelector('.precision-head h2');
  const heading = workspace.querySelector('.precision-eyebrow');
  const back = $('precision-return'), prompt = $('precision-prompt');
  const original = {title:title.textContent, heading:heading.textContent, back:back.textContent,
    backLabel:back.getAttribute('aria-label'), placeholder:prompt.placeholder};
  const fields = document.createElement('div');
  fields.className = 'viewer-replacement-fields'; fields.hidden = true;
  fields.innerHTML = `<label for="viewer-replacement-scope">Replace</label>
    <select id="viewer-replacement-scope"><option value="person">Person</option><option value="outfit">Outfit</option><option value="object">Object</option></select>
    <label class="viewer-reference-picker" for="viewer-replacement-reference"><img alt="Replacement reference" hidden><span>Add reference photo</span>
      <input id="viewer-replacement-reference" type="file" accept="image/jpeg,image/png,image/webp"></label>
    <button id="viewer-replacement-continue" type="button" disabled>Use selection in Image</button>
    <p>Keep your selected model. Review the credit price and press Generate in the Image deck.</p>
    <p class="viewer-replacement-status" role="status" aria-live="polite"></p>`;
  workspace.querySelector('.precision-deck').append(fields);
  const input = fields.querySelector('input'), preview = fields.querySelector('img');
  const continueButton = $('viewer-replacement-continue'), scope = $('viewer-replacement-scope');
  const status = fields.querySelector('.viewer-replacement-status');
  function refresh() {
    continueButton.disabled = handoffBusy || !reference || !editor.hasSelection() || editor.isBusy();
    input.disabled = scope.disabled = handoffBusy;
    continueButton.textContent = handoffBusy ? 'Preparing selection…' : 'Use selection in Image';
    workspace.classList.toggle('has-viewer-result', !$('precision-result-canvas').hidden);
  }
  const observer = new MutationObserver(refresh);
  observer.observe($('precision-clear-mask'), {attributes:true, attributeFilter:['disabled']});
  observer.observe($('precision-result-canvas'), {attributes:true, attributeFilter:['hidden']});
  function clearReference() {
    reference = null; input.value = ''; preview.hidden = true; preview.removeAttribute('src');
    if (referenceURL) URL.revokeObjectURL(referenceURL);
    referenceURL = null; fields.querySelector('.viewer-reference-picker span').textContent = 'Add reference photo';
  }
  input.addEventListener('change', async () => {
    const candidate = input.files?.[0], ticket = revision;
    if (!candidate) return;
    status.textContent = '';
    try {
      if (!['image/jpeg','image/png','image/webp'].includes(candidate.type) || !candidate.size || candidate.size > 20*1024*1024)
        throw Error('Choose a JPG, PNG or WebP reference up to 20 MB.');
      const bitmap = await createImageBitmap(candidate);
      const valid = Math.min(bitmap.width, bitmap.height) >= 240 && Math.max(bitmap.width, bitmap.height) <= 8192;
      bitmap.close();
      if (!active || ticket !== revision) return;
      if (!valid) throw Error('Use a reference from 240 to 8192 pixels per side.');
      clearReference(); reference = candidate;
      referenceURL = URL.createObjectURL(candidate); preview.src = referenceURL; preview.hidden = false;
      fields.querySelector('.viewer-reference-picker span').textContent = candidate.name;
    } catch (error) { if (ticket === revision) status.textContent = error.message; }
    refresh();
  });
  continueButton.addEventListener('click', async () => {
    if (continueButton.disabled) return;
    const ticket = revision, destination = reference, selectedScope = scope.value, direction = prompt.value.trim();
    handoffBusy = true; status.textContent = ''; refresh();
    try {
      const selection = await editor.selectionSnapshot();
      if (!active || ticket !== revision) return;
      const accepted = await onReplace({...selection, reference:destination, scope:selectedScope, direction,
        isCurrent:()=>active && ticket===revision});
      if (accepted && active && ticket === revision) { close(); dialog.close(); }
    } catch (error) {
      if (ticket === revision) status.textContent = error.message;
    } finally { handoffBusy = false; refresh(); }
  });
  async function open({file, id, action='edit'}) {
    if (opening || handoffBusy || editor.isBusy()) throw Error('Finish the current selection operation first.');
    if (!dialog.open) throw Error('Open the image before editing it.');
    opening = true; const ticket = ++revision;
    returnFocus = document.activeElement;
    mode = action === 'replace' ? 'replace' : 'edit';
    const changed = sourceId !== id;
    try {
      if (changed) { clearReference(); prompt.value = ''; scope.value = 'person'; }
      sourceId = id; active = true;
      dialog.classList.add('is-viewer-editing');
      dialog.append(workspace);
      workspace.classList.toggle('is-viewer-replace', mode === 'replace');
      fields.hidden = mode !== 'replace'; status.textContent = '';
      title.textContent = mode === 'replace' ? 'Replace' : 'Edit';
      heading.textContent = 'PV LAB / IMAGE';
      back.textContent = 'Back to image'; back.setAttribute('aria-label','Back to image viewer');
      prompt.placeholder = mode === 'replace' ? 'Any details to preserve or change? (optional)' : original.placeholder;
      editor.setExternalMode(mode === 'replace');
      await editor.open({file, id});
      if (!active || ticket !== revision) { editor.close(); return; }
      editor.setMode(mode === 'replace' ? 'magic' : 'brush');
      refresh(); back.focus({preventScroll:true});
    } catch (error) { close(); throw error; }
    finally { opening = false; }
  }
  function close() {
    if (!active) return false;
    ++revision; active = false; editor.close(); editor.setExternalMode(false);
    anchor.after(workspace);
    dialog.classList.remove('is-viewer-editing');
    workspace.classList.remove('is-viewer-replace','has-viewer-result');
    fields.hidden = true;
    title.textContent = original.title; heading.textContent = original.heading;
    back.textContent = original.back; back.setAttribute('aria-label',original.backLabel);
    prompt.placeholder = original.placeholder;
    if (dialog.open && returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
    return true;
  }
  function reset() { close(); ++revision; sourceId = null; clearReference(); status.textContent = ''; }
  dialog.addEventListener('cancel', event => { if (active) { event.preventDefault(); close(); } });
  dialog.addEventListener('close', () => { if (!dialog.open) close(); });
  return {open, close, reset, active:()=>active};
}
