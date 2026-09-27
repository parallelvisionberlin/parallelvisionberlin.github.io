from pathlib import Path

def replace(s, old, new):
    assert s.count(old)==1, 'Unexpected patch context: '+old[:100]
    return s.replace(old,new)

def function(s, start, end, value):
    a=s.index(start);b=s.index(end,a)
    return s[:a]+value+'\n'+s[b:]

p=Path('lab/lab.js');s=p.read_text()
s=replace(s,"imageDimensions, providerWorkingCopy } from './image-tools.js?v=20260927-2'", "imageDimensions, providerWorkingCopy, imagePreview, cancelImagePreparation } from './image-tools.js?v=20260927-preview1'")
s=function(s,'function resetPreview(){','function clearMedia(){',r'''function resetPreview(){
  clearResult();
  // Image generation has a result-only canvas. Inputs remain in the reference list.
  const item=tool==='image'?null:(tool==='upscale'||mode==='start')?
    (sourceUrl?{url:sourceUrl,label:tool==='upscale'?'Upscale input':'Start frame'}:null):
    (references[0]?{url:references[0].url,label:'Reference 1 / input'}:null);
  $('preview').alt='Uploaded source image, not a generated result';
  if(item){$('preview').src=item.url;$('preview').hidden=false;$('empty').hidden=true;$('preview-label').textContent=item.label+' / not a result';}
  else{
    $('preview').removeAttribute('src');$('preview').hidden=true;$('empty').hidden=false;
    $('preview-label').textContent=tool==='image'?'Result / Image':'Source / preview';
    $('empty').querySelector('p').textContent=tool==='image'?'Your generated image will appear here.':'Start with your own frame.';
    $('empty').querySelector('small').textContent=tool==='image'?'Input references stay on the left. Nothing generated yet.':'Your source and result appear here.';
  }
}
function refreshInputPreview(){autoPreview=null;if(tool!=='image'||!resultUrl)resetPreview();}
function releaseReference(item){release(item.url);release(item.thumbUrl);}
function closeInputPreview(){const dialog=$('input-preview-dialog');if(dialog.open)dialog.close();$('input-preview-image').removeAttribute('src');}
function viewReference(item,index){
  if(!owner)return;
  $('input-preview-title').textContent='Reference '+(index+1)+' / Input';
  $('input-preview-description').textContent=item.file.name+' / '+item.width+' × '+item.height+' pixels in the original. Display preview only, not a generated result.';
  $('input-preview-image').src=item.url;
  $('input-preview-dialog').showModal();
}
$('input-preview-dialog').addEventListener('close',()=>{$('input-preview-image').removeAttribute('src');});
''')
s=replace(s,'function clearMedia(){imageRevision++;','function clearMedia(){cancelImagePreparation();closeInputPreview();$(\'reference-progress\').textContent=\'\';imageRevision++;')
s=s.replace('for(const r of references)release(r.url);','for(const r of references)releaseReference(r);')
s=s.replace('references.forEach(r=>release(r.url));','references.forEach(releaseReference);')
s=function(s,'async function inspectImage(candidate){','async function setImage(candidate,id=null){',r'''async function inspectImage(candidate){
  if(!candidate||!['image/jpeg','image/png','image/webp'].includes(candidate.type)||!candidate.size||candidate.size>20*1024*1024)throw new Error('Choose a JPG, PNG or WebP image up to 20 MB.');
  const maxSide=tool==='upscale'?16000:8000;
  const prepared=await imagePreview(candidate),{width,height}=prepared;
  if(Math.min(width,height)<240||Math.max(width,height)>maxSide||Math.max(width/height,height/width)>8)throw new Error('Use an image at least 240 pixels per side, no wider than 8:1, up to '+maxSide.toLocaleString()+' pixels per side.');
  return {file:candidate,id:null,url:URL.createObjectURL(prepared.preview),thumbUrl:URL.createObjectURL(prepared.thumbnail),width,height};
}
''')
# Start/last-frame preview uses only the medium display copy; release its unused thumbnail.
s=replace(s,'item=await inspectImage(candidate);if(revision!==imageRevision||!owner){release(item.url);return false;}', 'item=await inspectImage(candidate);release(item.thumbUrl);if(revision!==imageRevision||!owner){release(item.url);return false;}')
s=replace(s,'item=await inspectImage(candidate);if(e!==epoch||!owner){release(item.url);return false;}', 'item=await inspectImage(candidate);release(item.thumbUrl);if(e!==epoch||!owner){release(item.url);return false;}')
s=function(s,'function renderReferences(){','function setMode(nextMode){',r'''function renderReferences(){
  const box=$('reference-list'),scroll=box.scrollTop,fragment=document.createDocumentFragment();
  references.forEach((r,i)=>{
    const item=document.createElement('div');item.className='reference-item';
    const img=document.createElement('img');img.src=r.thumbUrl;img.alt='Input reference '+(i+1);img.width=68;img.height=82;img.decoding='async';
    img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Preview input reference '+(i+1));
    img.onclick=()=>{if(!busy)viewReference(r,i);};img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();img.click();}};
    const fields=document.createElement('div');fields.className='reference-fields';
    const title=document.createElement('strong');title.textContent='Reference '+(i+1)+' / '+r.file.name;title.title=title.textContent;
    const role=document.createElement('select');role.setAttribute('aria-label','Role for reference '+(i+1));
    for(const name of ['none','identity','outfit','room','pose','object','style','lighting','custom'])role.add(new Option(name==='none'?'No assigned role':name,name));
    role.value=r.role||'none';role.disabled=busy;role.onchange=()=>{r.role=role.value;autoPreview=null;};
    const note=document.createElement('input');note.type='text';note.maxLength=300;note.placeholder='Use only the outfit, keep the room…';note.setAttribute('aria-label','Note for reference '+(i+1));note.value=r.note||'';note.disabled=busy;
    note.oninput=()=>{r.note=note.value;autoPreview=null;};fields.append(title,role,note);
    const controls=document.createElement('div');controls.className='reference-actions';
    const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.onclick=()=>{if(busy)return;closeInputPreview();releaseReference(r);references.splice(i,1);renderReferences();refreshInputPreview();update();};
    const up=document.createElement('button');up.type='button';up.textContent='Up';up.disabled=i===0;up.onclick=()=>{if(busy||i===0)return;closeInputPreview();[references[i-1],references[i]]=[references[i],references[i-1]];renderReferences();refreshInputPreview();update();};
    controls.append(up,remove);item.append(img,fields,controls);fragment.append(item);
  });
  box.replaceChildren(fragment);box.scrollTop=scroll;$('ref-count').textContent=`${references.length} / 10`;
}
async function addReferences(list,ids=[],labels=[]){
  const e=epoch,incoming=[...list];if(references.length+incoming.length>10)throw new Error('Reference mode supports up to 10 images.');
  autoPreview=null;$('reference-list').setAttribute('aria-busy','true');let added=0;
  try{
    for(let i=0;i<incoming.length;i++){
      $('reference-progress').textContent='Preparing reference '+(i+1)+' of '+incoming.length+'…';
      const item=await inspectImage(incoming[i]);
      if(e!==epoch||!owner){releaseReference(item);return;}
      item.id=ids[i]||null;item.role=labels[i]?.role||'none';item.note=labels[i]?.note||'';references.push(item);added++;
      renderReferences();refreshInputPreview();update();
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }finally{
    if(e===epoch){$('reference-list').setAttribute('aria-busy','false');$('reference-progress').textContent=added?added+' reference'+(added===1?'':'s')+' ready. Originals kept unchanged.':'';}
  }
}
''')
s=replace(s,"async function ensureReferences(){if(!references.length)throw new Error('Add at least one reference image.');for(const r of references)if(!r.id)r.id=await uploadAsset(r.file);return references.map(r=>r.id);}",r'''async function ensureReferences(){
  if(!references.length)throw new Error('Add at least one reference image.');
  for(let i=0;i<references.length;i++){const r=references[i];if(!r.id){notify('Uploading original reference '+(i+1)+' of '+references.length+'…');r.id=await uploadAsset(r.file);}}
  return references.map(r=>r.id);
}''')
p.write_text(s)

p=Path('lab/index.html');s=p.read_text()
s=replace(s,'./lab.js?v=20260927-image-oneclick','./lab.js?v=20260927-preview1')
s=replace(s,'./lab.css?v=20260926-4','./lab.css?v=20260927-preview1')
s=replace(s,'<div id="reference-list" class="reference-list"></div>','<p id="reference-progress" class="fine" role="status" aria-live="polite"></p>\n<div id="reference-list" class="reference-list" role="region" aria-label="Input references" tabindex="0"></div>')
s=replace(s,'</body>', '''<dialog id="input-preview-dialog" aria-labelledby="input-preview-title"><div class="dialoghead"><h2 id="input-preview-title">Input reference</h2><button class="quiet" data-close="input-preview-dialog" type="button">Close</button></div><p id="input-preview-description" class="fine"></p><img id="input-preview-image" alt="Uploaded input reference, not a generated result"></dialog>
</body>''')
p.write_text(s)

p=Path('lab/lab.css');s=p.read_text();s+='''
/* Reference lists must not determine the height or position of the result canvas. */
.workspace{align-items:start}
.reference-list{max-height:350px;overflow-y:auto;overflow-x:hidden;overscroll-behavior-y:contain;scrollbar-gutter:stable;padding-right:4px}
.reference-item{flex:none}
.reference-item>img{cursor:zoom-in}
.reference-fields strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#reference-progress:empty{display:none}
#reference-progress{min-height:15px;margin:8px 0}
.stage{align-self:start;position:sticky;top:16px;display:grid;grid-template-rows:auto minmax(0,1fr) auto;height:clamp(380px,calc(100dvh - 48px),740px);width:100%;overflow:hidden}
.canvas{min-height:0;min-width:0;height:100%;padding:20px}
.canvas img,.canvas video{width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;box-shadow:none}
#input-preview-dialog{width:min(1000px,calc(100vw - 32px));max-width:1000px}
#input-preview-image{display:block;max-width:100%;max-height:65dvh;object-fit:contain;margin:auto}
#input-preview-description{overflow-wrap:anywhere}
@media(max-width:820px){.stage{position:relative;top:auto;align-self:stretch;height:clamp(320px,65dvh,580px)}.reference-list{max-height:310px}}
@media(max-width:560px){.canvas{min-height:0;padding:14px}.reference-list{max-height:290px}.stage{height:clamp(300px,60dvh,500px)}}
''';p.write_text(s)

p=Path('lab/README.md');s=p.read_text();s+='''

## Reference preparation and result layout (2026-09-27)

The reference list is a bounded scrolling panel, independent of the fixed-height, sticky desktop result panel. Image mode never automatically places its first reference in the result canvas. The canvas stays empty until an actual result is opened or completed. Clicking an input thumbnail opens a separately labelled input-preview dialog. Adding, removing or reordering references does not replace an already displayed Image result.

Input display previews have a longest edge of at most 1,280 pixels; sidebar thumbnails at most 320 pixels. Originals retain their bytes, dimensions, file names, roles and order for uploads, History and Reuse. Display copies are never sent as model inputs. The existing explicit permission step for a provider working copy above 10 MiB remains unchanged.

Decoding, thumbnail preparation and approved large-file compression run sequentially in a browser-local Web Worker where supported, with a fallback for other browsers. Progress is visible per input. Decoded bitmaps/canvases are released after each task; object URLs and pending work are cleared on sign-out or clearing the editor. No provider, price, server-side policy, account or database changes.
''';p.write_text(s)
print('Applied reference/layout changes only to Lab frontend and its documentation.')
