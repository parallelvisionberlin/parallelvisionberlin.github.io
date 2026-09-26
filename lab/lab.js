// Local preparation only. No API keys, provider calls or generated media.
const $ = id => document.getElementById(id);
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
let file = null, previewUrl = null, draftUrls = [], database = null, busy = false;
let imageRevision = 0, archiveRevision = 0;
function notify(text) { $('notice').textContent = text; }
function controls() { $('save').disabled = !database || !file || busy; $('clear').disabled = !file; }
function summary() { $('settings').textContent = `${$('duration').value} seconds / ${$('resolution').value}`; }
function clearImage() {
  imageRevision++;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  file = null; previewUrl = null;
  $('image').value = ''; $('preview').removeAttribute('src'); $('preview').hidden = true;
  $('empty').hidden = false; $('filemeta').textContent = 'Your source stays on this device in this preview.';
  controls();
}
async function setImage(candidate) {
  if (!candidate || !allowedTypes.has(candidate.type)) throw new Error('Choose a JPG, PNG or WebP image.');
  if (candidate.size === 0 || candidate.size > 15 * 1024 * 1024) throw new Error('Choose an image smaller than 15 MB.');
  const revision = ++imageRevision, url = URL.createObjectURL(candidate);
  const probe = new Image(); probe.src = url;
  try { await probe.decode(); } catch { URL.revokeObjectURL(url); throw new Error('This image could not be opened. Try another file.'); }
  if (revision !== imageRevision) { URL.revokeObjectURL(url); return false; }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = url; file = candidate;
  $('preview').src = url; $('preview').hidden = false; $('empty').hidden = true;
  $('filemeta').textContent = `${candidate.name || 'Source image'} / ${probe.naturalWidth} × ${probe.naturalHeight} / ${(candidate.size / 1048576).toFixed(1)} MB`;
  controls(); return true;
}
function openDatabase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('parallel-vision-lab-local-v1', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('drafts', { keyPath: 'id' });
    req.onerror = () => reject(req.error);
    req.onblocked = () => notify('Close another Lab tab to finish opening local storage.');
    req.onsuccess = () => resolve(req.result);
  });
}
function store(method, value) {
  return new Promise((resolve, reject) => {
    const tx = database.transaction('drafts', method === 'getAll' ? 'readonly' : 'readwrite');
    const objectStore = tx.objectStore('drafts');
    const req = value === undefined ? objectStore[method]() : objectStore[method](value);
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error || req.error);
    tx.onabort = () => reject(tx.error || new Error('Storage transaction aborted.'));
  });
}
async function renderDrafts() {
  const revision = ++archiveRevision;
  const drafts = await store('getAll');
  if (revision !== archiveRevision) return;
  draftUrls.forEach(url => URL.revokeObjectURL(url)); draftUrls = [];
  $('drafts').replaceChildren(); $('emptyarchive').hidden = drafts.length > 0;
  drafts.sort((a, b) => b.createdAt - a.createdAt);
  for (const draft of drafts) {
    const card = document.createElement('article'); card.className = 'draft';
    const thumb = document.createElement('img'); thumb.alt = 'Saved draft source'; thumb.loading = 'lazy';
    const url = URL.createObjectURL(draft.image); draftUrls.push(url); thumb.src = url;
    const body = document.createElement('div'); body.className = 'draftbody';
    const meta = document.createElement('div'); meta.className = 'draftmeta';
    meta.textContent = `${new Date(draft.createdAt).toLocaleString()} / ${draft.duration}s / ${draft.resolution}`;
    const prompt = document.createElement('p'); prompt.textContent = draft.prompt || 'No prompt saved.';
    const actions = document.createElement('div'); actions.className = 'draftactions';
    const reuse = document.createElement('button'); reuse.type = 'button'; reuse.className = 'quiet'; reuse.textContent = 'Reuse image + settings';
    reuse.addEventListener('click', async () => {
      try {
        const restored = await setImage(new File([draft.image], draft.filename, { type: draft.image.type }));
        if (!restored) return;
        $('prompt').value = draft.prompt; $('duration').value = draft.duration; $('resolution').value = draft.resolution;
        $('image').value = ''; summary(); notify('Draft restored. Edit it without changing your saved original.');
        $('prompt').focus();
      } catch { notify('The saved image could not be restored. Your draft has not been deleted.'); }
    });
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'quiet'; remove.textContent = 'Delete';
    remove.addEventListener('click', async () => {
      if (!confirm('Delete this draft and its stored source image from this browser?')) return;
      remove.disabled = true;
      try { await store('delete', draft.id); await renderDrafts(); notify('Draft deleted from this browser.'); }
      catch { remove.disabled = false; notify('Could not delete this draft. Try again.'); }
    });
    actions.append(reuse, remove); body.append(meta, prompt, actions); card.append(thumb, body); $('drafts').append(card);
  }
}
$('image').addEventListener('change', async event => {
  const candidate = event.target.files[0]; if (!candidate) return;
  try { if (await setImage(candidate)) notify('Image ready. Add your motion direction.'); }
  catch (error) { notify(error.message); }
});
for (const name of ['dragenter', 'dragover']) $('drop').addEventListener(name, event => { event.preventDefault(); $('drop').classList.add('drag'); });
for (const name of ['dragleave', 'drop']) $('drop').addEventListener(name, event => { event.preventDefault(); $('drop').classList.remove('drag'); });
$('drop').addEventListener('drop', async event => {
  try { if (await setImage(event.dataTransfer.files[0])) { $('image').value = ''; notify('Image ready. Add your motion direction.'); } }
  catch (error) { notify(error.message); }
});
$('clear').addEventListener('click', () => { clearImage(); notify('Source cleared. Saved drafts are unchanged.'); });
$('duration').addEventListener('change', summary); $('resolution').addEventListener('change', summary);
$('save').addEventListener('click', async () => {
  if (!file || !database || busy) return;
  busy = true; controls();
  try {
    await store('put', { id: crypto.randomUUID(), createdAt: Date.now(), image: file, filename: file.name || 'source.png', prompt: $('prompt').value.trim(), duration: $('duration').value, resolution: $('resolution').value });
    await renderDrafts(); notify('Draft saved in this browser. No generation or charge.');
  } catch { notify('Could not save locally. Browser storage may be full or unavailable. Keep your original image.'); }
  finally { busy = false; controls(); }
});
try {
  database = await openDatabase();
  database.onversionchange = () => { database.close(); database = null; controls(); notify('Storage changed in another tab. Refresh to continue.'); };
  controls(); await renderDrafts();
} catch { notify('Local storage is unavailable. You can preview an image, but drafts cannot be saved in this browser.'); }
