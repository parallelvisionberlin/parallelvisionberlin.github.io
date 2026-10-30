import {API,SERVICES,slugify,releaseUrl,validateLinks,newId} from './shared.mjs';
import {renderRelease} from './release-view.mjs';
import {loadLabAccount} from '../lab/native-account.js?v=20261012-unified-header1&studioAuth=20261015-1';
import {createSessionRequest} from '../lab/session-request.js?v=20260927-auth1&studioAuth=20261015-1';
const $=id=>document.getElementById(id),form=$('release-form'),editor=$('editor');
const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
const format=n=>Number(n||0).toLocaleString('en-GB');
let clerk=null,sessionId='',generation=0,records=[],settings=null,editing=null,createId='',slugEdited=false,saving=false,uploading=false,fetchSerial=0;
const request=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});
async function call(path,{method='GET',data,headers,body}={}){
  const revision=generation;
  const current=()=>{if(revision!==generation)throw Error('Your account changed. Please sign in again.');};
  const response=await request('/api/music/admin'+path,{method,headers:headers||(data?{'Content-Type':'application/json'}:undefined),body:data?JSON.stringify(data):body},current);
  const result=await response.json().catch(()=>({}));current();
  if(!response.ok)throw Error(result.error||'The music workspace could not complete this request.');return result;
}
function notice(message){$('status').textContent=message;}
function field(name){return form.elements.namedItem(name);}
for(const service of SERVICES){const label=el('label','',service.name),input=el('input');input.name='service-'+service.id;input.type='url';input.maxLength=2048;input.placeholder='https://…';label.append(input);$('platform-fields').append(label);}
function draft(){return {id:editing?.id||createId,title:field('title').value.trim(),artist:field('artist').value.trim(),slug:field('slug').value.trim(),catalogue:field('catalogue').value.trim(),description:field('description').value.trim(),artworkUrl:field('artworkUrl').value.trim(),audioUrl:field('audioUrl').value.trim(),releaseDate:field('releaseDate').value,pixelId:field('pixelId').value.trim(),status:field('status').value,revision:editing?.revision,links:SERVICES.map(s=>({service:s.id,url:field('service-'+s.id).value.trim()})).filter(l=>l.url)};}
function preview(){const data=draft();for(const key of ['artworkUrl','audioUrl'])if(data[key]&&!/^https:\/\//i.test(data[key]))data[key]='';renderRelease($('release-preview'),data,{preview:true});}
function controls(){const busy=saving||uploading;$('save-release').disabled=busy;$('save-draft').disabled=busy;$('close-editor').disabled=busy;$('artwork-file').disabled=busy;$('audio-file').disabled=busy;}
function openEditor(record=null){
  if(saving||uploading)return;editing=record;createId=newId();slugEdited=!!record;form.reset();
  for(const name of ['title','artist','slug','catalogue','description','artworkUrl','audioUrl','releaseDate','pixelId','status'])field(name).value=record?.[name]||(name==='status'?'draft':'');
  for(const link of record?.links||[])field('service-'+link.service).value=link.url;
  field('slug').readOnly=!!record;$('editor-title').textContent=record?'Edit smart link.':'New smart link.';
  $('slug-note').textContent=record?'This address is fixed so your existing links keep working.':'Choose a short name. Saved links stay fixed for your adverts.';
  $('save-status').textContent='';$('upload-status').textContent='';$('saved-link').hidden=true;
  $('save-release').textContent='Save smart link';preview();if(!editor.open)editor.showModal();
}
function closeEditor(){if(saving||uploading)return;editor.close();editing=null;}
$('new-release').addEventListener('click',()=>openEditor());$('close-editor').addEventListener('click',closeEditor);
editor.addEventListener('cancel',event=>{if(saving||uploading)event.preventDefault();});
form.addEventListener('input',event=>{
  if(event.target.name==='slug')slugEdited=true;
  if(event.target.name==='title'&&!slugEdited)field('slug').value=slugify(field('title').value);
  if(event.target.name==='status')$('save-release').textContent=field('status').value==='published'?'Publish smart link':'Save smart link';
  preview();
});
form.addEventListener('change',()=>{preview();$('save-release').textContent=field('status').value==='published'?'Publish smart link':'Save smart link';});
async function upload(input,kind){
  const file=input.files?.[0];if(!file)return;
  const isArtwork=kind==='artwork',max=(isArtwork?6:12)*1024*1024;
  if(file.size>max||!(isArtwork?['image/jpeg','image/png','image/webp'].includes(file.type):file.type==='audio/mpeg'||/\.mp3$/i.test(file.name))){$('upload-status').textContent=isArtwork?'Choose a JPG, PNG or WebP smaller than 6 MB.':'Choose an MP3 smaller than 12 MB.';input.value='';return;}
  uploading=true;controls();$('upload-status').textContent=isArtwork?'Uploading artwork…':'Uploading audio preview…';
  try{const result=await call('/media',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});field(isArtwork?'artworkUrl':'audioUrl').value=result.url;preview();$('upload-status').textContent=isArtwork?'Artwork uploaded.':'Audio preview uploaded.';}
  catch(error){$('upload-status').textContent=error.message;}finally{uploading=false;input.value='';controls();}
}
$('artwork-file').addEventListener('change',event=>void upload(event.target,'artwork'));
$('audio-file').addEventListener('change',event=>void upload(event.target,'audio'));
async function copy(value,button){try{await navigator.clipboard.writeText(value);button.textContent='Copied';setTimeout(()=>{if(button.isConnected)button.textContent='Copy link';},1800);}catch{notice('Copy this link: '+value);}}
function syncFilters(){document.querySelectorAll('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===$('filter').value)));}
function renderRecords(){
  const rows=$('release-rows');rows.replaceChildren();const query=$('search').value.trim().toLowerCase(),filter=$('filter').value;syncFilters();
  const filtered=records.filter(r=>(filter==='all'||filter==='active'&&r.status!=='archived'||r.status===filter)&&(!query||(r.title+' '+r.artist+' '+r.catalogue).toLowerCase().includes(query)));
  for(const release of filtered.slice(0,200)){
    const row=el('article','smart-link-row');row.setAttribute('aria-label',release.title+' by '+release.artist);
    const art=el('div','release-artwork');
    if(release.artworkUrl){const image=el('img','release-thumb');image.src=release.artworkUrl;image.alt=release.title+' artwork';image.width=144;image.height=144;image.loading='lazy';image.referrerPolicy='no-referrer';art.append(image);}
    else art.append(el('span','artwork-placeholder','PV'));
    const names=el('div','release-identity');names.append(el('span','badge '+release.status,release.status),el('h2','',release.title),el('p','release-artist-name',release.artist));
    if(release.catalogue)names.append(el('p','release-catalogue',release.catalogue));
    const platforms=el('div','release-services');
    for(const link of release.links||[]){const service=SERVICES.find(s=>s.id===link.service);if(service){const item=el('span','service '+service.id,service.name);platforms.append(item);}}
    if(!platforms.children.length)platforms.append(el('span','no-platforms','No platform links yet'));names.append(platforms);
    const metrics=el('dl','row-metrics');
    for(const [label,value] of [['Page visits',format(release.views)],['Platform clicks',format(release.clicks)],['Clicks / visits',(release.views?100*release.clicks/release.views:0).toLocaleString('en-GB',{maximumFractionDigits:1})+'%']]){const item=el('div');item.append(el('dt','',label),el('dd','',value));metrics.append(item);}
    const group=el('div','row-actions'),edit=el('button','primary','Edit');edit.type='button';edit.setAttribute('aria-label','Edit '+release.title);edit.addEventListener('click',()=>openEditor(release));group.append(edit);
    if(release.status==='published'){const button=el('button','secondary','Copy link');button.type='button';button.setAttribute('aria-label','Copy link for '+release.title);button.addEventListener('click',()=>void copy(release.url,button));const link=el('a','secondary','Open');link.href=release.url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','Open '+release.title);group.append(button,link);}
    row.append(art,names,metrics,group);rows.append(row);
  }
  if(!filtered.length)rows.append(el('p','empty-row',records.length?'No smart links match this view.':'Create your first smart link to start.'));
  $('release-count').textContent=filtered.length>200?'Showing the newest 200 matches. Search by title, artist or catalogue to find an older smart link.':format(filtered.length)+(filtered.length===1?' smart link':' smart links');
}
function updatePixelState(){const configured=!!settings?.pixelId;$('pixel-state').textContent=configured?'Configured':'Not configured';$('pixel-state').classList.toggle('configured',configured);}
const views={
  'smart-links':['Smart Links.','Your music. One destination.'],
  performance:['Performance.','See where your listeners go.'],
  tracking:['Tracking.','Your music. Your audience.'],
  settings:['Settings.','Your Parallel Vision workspace.']
};
function navigate(){const key=Object.hasOwn(views,location.hash.slice(1))?location.hash.slice(1):'smart-links';document.querySelectorAll('[data-view]').forEach(section=>section.hidden=section.dataset.view!==key);document.querySelectorAll('[data-nav]').forEach(link=>{if(link.dataset.nav===key)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});$('view-title').textContent=views[key][0];$('view-intro').textContent=views[key][1];$('new-release').hidden=key!=='smart-links';}
window.addEventListener('hashchange',navigate);navigate();
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{$('filter').value=button.dataset.filter;renderRecords();}));

function report(root,items,label,value,empty){root.replaceChildren();if(!items.length){root.append(el('p','empty',empty));return;}
  for(const item of items){const row=el('div','report-row');row.append(el('span','',label(item)),el('small','',value(item)));root.append(row);}}
async function refresh(){
  const serial=++fetchSerial;notice('Refreshing smart link performance…');$('refresh').disabled=true;
  try{const data=await call('/dashboard?days='+$('days').value);if(serial!==fetchSerial)return;records=data.releases;settings=data.settings;updatePixelState();
    $('visits').textContent=format(data.summary.views);$('clicks').textContent=format(data.summary.clicks);$('published').textContent=format(data.summary.published);
    $('rate').textContent=(data.summary.views?100*data.summary.clicks/data.summary.views:0).toLocaleString('en-GB',{maximumFractionDigits:1})+'%';
    $('pixel-id').value=settings.pixelId;$('click-event').value=settings.clickEvent;renderRecords();
    report($('platforms'),data.platforms,item=>SERVICES.find(s=>s.id===item.service)?.name||item.service,item=>format(item.count)+' clicks','Platform clicks will appear when someone uses your smart links.');
    report($('sources'),data.sources,item=>item.source==='meta'?'Meta Ads':item.source[0].toUpperCase()+item.source.slice(1),item=>format(item.views)+' visits / '+format(item.clicks)+' clicks','Visitor sources will appear here.');
    report($('campaigns'),data.campaigns,item=>item.campaign,item=>format(item.views)+' visits / '+format(item.clicks)+' clicks','No tagged campaign activity yet.');
    $('gate').hidden=true;$('dashboard').hidden=false;$('new-release').disabled=false;notice('Updated '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+'.');
  }catch(error){if(serial===fetchSerial)notice(error.message);}finally{if(serial===fetchSerial)$('refresh').disabled=false;}
}
form.addEventListener('submit',async event=>{
  event.preventDefault();if(saving||uploading)return;const data=draft();if(event.submitter?.value==='draft')data.status='draft';
  try{data.links=validateLinks(data.links);}catch(error){$('save-status').textContent=error.message;return;}
  saving=true;controls();$('save-status').textContent='Saving your smart link…';const revision=generation;
  try{const result=await call(editing?'/releases/'+editing.id:'/releases',{method:'POST',data});if(revision!==generation)return;
    editing=result.release;field('status').value=editing.status;field('slug').readOnly=true;slugEdited=true;$('editor-title').textContent='Edit smart link.';
    $('save-status').textContent=editing.status==='published'?'Your smart link is live.':editing.status==='archived'?'Smart link archived. The public page is unavailable.':'Draft saved. Only owners can see it.';
    $('saved-link').hidden=editing.status!=='published';$('saved-url').value=releaseUrl(editing.slug);$('open-saved').href=releaseUrl(editing.slug);await refresh();
  }catch(error){if(revision===generation)$('save-status').textContent=error.message;}
  finally{saving=false;controls();}
});
$('copy-saved').addEventListener('click',()=>void copy($('saved-url').value,$('copy-saved')));
$('tracking-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;$('tracking-status').textContent='Saving…';
  try{const result=await call('/settings',{method:'POST',data:{pixelId:$('pixel-id').value.trim(),clickEvent:$('click-event').value,revision:settings.revision}});settings=result.settings;updatePixelState();$('tracking-status').textContent='Tracking settings saved.';}
  catch(error){$('tracking-status').textContent=error.message;}finally{button.disabled=false;}
});
$('refresh').addEventListener('click',()=>void refresh());$('days').addEventListener('change',()=>void refresh());$('search').addEventListener('input',renderRecords);$('filter').addEventListener('change',renderRecords);
$('signin').addEventListener('click',()=>clerk?.openSignIn());$('signout').addEventListener('click',()=>void clerk?.signOut());
function authChanged(){
  const next=clerk?.session?.id||'';if(next===sessionId)return;sessionId=next;generation++;fetchSerial++;records=[];settings=null;editing=null;
  $('dashboard').hidden=true;$('gate').hidden=false;$('new-release').disabled=true;$('release-rows').replaceChildren();$('signout').hidden=!next;editor.close();
  if(!next){notice('Sign in to manage your smart links.');return;}void refresh();
}
try{clerk=await loadLabAccount();$('signin').disabled=false;clerk.addListener(authChanged);if(clerk.session)authChanged();else notice('Sign in to manage your smart links.');}
catch{notice('Sign-in could not load. Reload this page to try again.');}
