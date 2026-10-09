export function createAssetLibrary({api,notify,archive,app,selected,selectMode,reload,restoreStudio,kind,ready}){
  const $=id=>document.getElementById(id);
  let active=false,filter='all',media='all',folders=[],revision=0;
  const panel=$('assets-workspace'),sidebar=$('assets-folders'),dialog=$('asset-folder-dialog');
  const safe=fn=>async()=>{try{await fn();}catch(e){notify(e.message,true);}};
  function query(){const q=new URLSearchParams({library:'1'});const type=active?media:kind();if(['image','video'].includes(type))q.set('kind',type);if(active&&filter==='favorites')q.set('favorite','1');else if(active&&filter!=='all')q.set('folder',filter);return q;}
  function heading(){archive.querySelector('h2').textContent=active?(filter==='favorites'?'Favorites':filter==='all'?'Assets':folders.find(f=>f.id===filter)?.name||'Folder'):'History';}
  function renderFolders(){
    sidebar.replaceChildren();
    for(const f of folders){const b=document.createElement('button');b.type='button';b.className='asset-folder';b.textContent=f.name;const n=document.createElement('span');n.textContent=f.count||0;b.append(n);b.classList.toggle('active',filter===f.id);b.onclick=safe(()=>navigate(f.id));sidebar.append(b);}
    for(const id of ['all','favorites'])$('assets-'+id).classList.toggle('active',filter===id);
    $('history-remove-folder').hidden=!active||['all','favorites'].includes(filter);heading();
  }
  async function load(){const rev=revision,data=await api('/api/library');if(rev!==revision)return;folders=data.folders||[];renderFolders();}
  async function navigate(value){filter=value;selectMode(false);renderFolders();await reload();}
  async function open(){if(!ready())return;active=true;app.classList.add('assets-active');panel.hidden=false;$('assets-gallery').append(archive);$('tool-assets').classList.add('active');$('tool-assets').setAttribute('aria-pressed','true');for(const b of document.querySelectorAll('.tool-tab')){b.classList.remove('active');b.setAttribute('aria-pressed','false');}selectMode(false);heading();await Promise.all([load(),reload()]);}
  function close(){if(!active)return;active=false;panel.hidden=true;app.classList.remove('assets-active');$('tool-assets').classList.remove('active');$('tool-assets').setAttribute('aria-pressed','false');selectMode(false);heading();restoreStudio();}
  function selection(){const count=selected().size;$('history-add-folder').disabled=!count;$('history-remove-folder').disabled=!count;}
  async function chooseFolder(){await load();$('asset-folder-choices').replaceChildren(...folders.map(f=>{const b=document.createElement('button');b.type='button';b.textContent=f.name;b.onclick=safe(async()=>{await assign(f.id);dialog.close();});return b;}));$('asset-folder-title').textContent=selected().size?'Add to folder':'New folder';$('asset-folder-choices').hidden=!selected().size;$('asset-folder-name').value='';$('asset-folder-error').textContent='';dialog.showModal();}
  async function assign(id){const ids=[...selected()];if(!ids.length)return;await api('/api/library/members',{method:'POST',body:{ids,folderId:id}});selectMode(false);await load();notify(ids.length+' item'+(ids.length===1?'':'s')+' added to folder.');}
  function decorate(card,job){
    if(job.favorite===undefined)return;
    const heart=document.createElement('button');heart.type='button';heart.className='asset-heart';
    let favorite=job.favorite;
    const paint=()=>{heart.textContent=favorite?'♥':'♡';heart.classList.toggle('is-favorite',favorite);heart.setAttribute('aria-pressed',String(favorite));heart.setAttribute('aria-label',favorite?'Remove from favorites':'Add to favorites');};paint();
    heart.onclick=async e=>{e.stopPropagation();heart.disabled=true;try{await api('/api/library/members',{method:'POST',body:{ids:[job.id],favorite:!favorite}});favorite=!favorite;job.favorite=favorite;paint();if(active&&filter==='favorites')await reload();}catch(error){notify(error.message,true);}finally{heart.disabled=false;}};card.append(heart);
    if(job.settings.type==='video'){const badge=document.createElement('span');badge.className='asset-video-badge';badge.textContent='▶ Video';card.append(badge);}
  }
  $('tool-assets').onclick=safe(open);$('assets-all').onclick=safe(()=>navigate('all'));$('assets-favorites').onclick=safe(()=>navigate('favorites'));
  $('assets-kind').onchange=safe(async()=>{media=$('assets-kind').value;selectMode(false);await reload();});
  $('history-add-folder').onclick=safe(chooseFolder);$('assets-new-folder').onclick=safe(chooseFolder);
  $('asset-folder-close').onclick=()=>dialog.close();
  $('asset-folder-form').onsubmit=async e=>{e.preventDefault();const b=$('asset-folder-create');b.disabled=true;try{const name=$('asset-folder-name').value.trim();const {folder}=await api('/api/library/folders',{method:'POST',body:{name}});await assign(folder.id);await load();dialog.close();if(active)await navigate(folder.id);}catch(error){$('asset-folder-error').textContent=error.message;}finally{b.disabled=false;}};
  $('history-remove-folder').onclick=safe(async()=>{await api('/api/library/members',{method:'POST',body:{ids:[...selected()],folderId:filter,remove:true}});selectMode(false);await Promise.all([load(),reload()]);});
  return {query,selection,decorate,load,active:()=>active,close,reset(){revision++;close();folders=[];filter='all';media='all';renderFolders();}};
}
