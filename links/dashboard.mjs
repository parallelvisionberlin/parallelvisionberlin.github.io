import {initWorkspaceTools,reportQuery,renderWorkspaceReports,resetWorkspaceTools} from './workspace-tools.mjs?v=20261103-clean2';
import {API,SERVICES,slugify,releaseUrl,validateLinks,newId,validatePresave,PLAYLIST_CATALOGUE,contentTypeOf} from './shared.mjs?v=20261120-playlists1';
import {renderRelease} from './release-view.mjs?v=20261120-playlists1';
import {loadLabAccount} from '../lab/native-account.js?v=20261012-unified-header1&studioAuth=20261015-1';
import {createSessionRequest} from '../lab/session-request.js?v=20260927-auth1&studioAuth=20261015-1';
const $=id=>document.getElementById(id),form=$('release-form'),editor=$('editor');
const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
const format=n=>Number(n||0).toLocaleString('en-GB');
function pixelInput(){const input=field('pixelId');input.value=input.value.replace(/[\s\u200b-\u200d\ufeff]/g,'').trim();return input.value;}
function syncPixelInfo(){
  const value=field('pixelId').value.trim(),workspace=settings?.pixelId||'';
  $('link-pixel-active').textContent=value?'Custom pixel '+value:workspace?'Parallel Vision · '+workspace:'Workspace default (no pixel configured)';
  $('link-pixel-details').open=!!value;
}
let clerk=null,sessionId=null,generation=0,records=[],settings=null,editing=null,createId='',slugEdited=false,saving=false,uploading=false,fetchSerial=0;
let analyticsData=null;
const request=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});
async function call(path,{method='GET',data,headers,body}={}){
  const revision=generation;
  const current=()=>{if(revision!==generation)throw Error('Your account changed. Please sign in again.');};
  const response=await request('/api/music/admin'+path,{method,headers:headers||(data?{'Content-Type':'application/json'}:undefined),body:data?JSON.stringify(data):body},current);
  const result=await response.json().catch(()=>({}));current();
  if(!response.ok){const error=Error(result.error||'The music workspace could not complete this request.');error.status=response.status;throw error;}return result;
}
function notice(message){$('status').textContent=message;}
function field(name){return form.elements.namedItem(name);}
for(const service of SERVICES){const label=el('label','',service.name),input=el('input');label.dataset.service=service.id;input.name='service-'+service.id;input.type='url';input.maxLength=2048;input.placeholder='https://…';label.append(input);$('platform-fields').append(label);}
function syncContentType(){
  const playlist=field('contentType').value==='playlist';
  document.querySelectorAll('[data-release-only]').forEach(node=>{node.hidden=playlist;});
  document.querySelectorAll('#platform-fields [data-service]').forEach(node=>{node.hidden=playlist&&node.dataset.service!=='spotify';});
  $('creator-details-title').textContent=playlist?'01 / The playlist':'01 / The release';
  $('title-label').querySelector('.field-name').textContent=playlist?'Playlist title':'Release title';
  $('artist-label').querySelector('.field-name').textContent=playlist?'Curated by':'Artist';
  $('platforms-legend').textContent=playlist?'03 / Playlist destination':'03 / Music platforms';
  $('playlist-help').hidden=!playlist;$('release-platform-help').hidden=playlist;
  field('service-spotify').placeholder=playlist?'https://open.spotify.com/playlist/…':'https://…';
}
function draft(){const playlist=field('contentType').value==='playlist';return {contentType:playlist?'playlist':'release',presave:playlist?{mode:'off',url:''}:{mode:field('presaveMode').value,url:field('presaveUrl').value.trim()},id:editing?.id||createId,background:field('background').value,title:field('title').value.trim(),artist:field('artist').value.trim(),slug:field('slug').value.trim(),catalogue:playlist?PLAYLIST_CATALOGUE:field('catalogue').value.trim(),description:field('description').value.trim(),artworkUrl:field('artworkUrl').value.trim(),audioUrl:playlist?'':field('audioUrl').value.trim(),releaseDate:playlist?'':field('releaseDate').value,pixelId:pixelInput(),status:field('status').value,revision:editing?.revision,links:SERVICES.map(s=>({service:s.id,url:field('service-'+s.id).value.trim()})).filter(l=>l.url&&(!playlist||l.service==='spotify'))};}
function preview(){const data=draft();for(const key of ['artworkUrl','audioUrl'])if(data[key]&&!/^https:\/\//i.test(data[key]))data[key]='';renderRelease($('release-preview'),data,{preview:true});}
function controls(){const busy=saving||uploading;$('save-release').disabled=busy;$('save-draft').disabled=busy;$('close-editor').disabled=busy;$('artwork-file').disabled=busy;$('audio-file').disabled=busy;}
function openEditor(record=null){
  if(saving||uploading)return;editing=record;createId=newId();slugEdited=!!record;form.reset();
  field('contentType').value=contentTypeOf(record);
  for(const name of ['title','artist','slug','catalogue','description','artworkUrl','audioUrl','releaseDate','pixelId','status','background'])field(name).value=name==='catalogue'&&contentTypeOf(record)==='playlist'?'':record?.[name]||(name==='status'?'draft':name==='background'?'blur':'');
  syncContentType();syncPixelInfo();
  field('presaveMode').value=record?.presave?.mode||'off';field('presaveUrl').value=record?.presave?.url||'';
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
  if(event.target.name==='contentType')syncContentType();
  if(event.target.name==='pixelId')syncPixelInfo();
  preview();
});
form.addEventListener('change',()=>{syncContentType();syncPixelInfo();preview();$('save-release').textContent=field('status').value==='published'?'Publish smart link':'Save smart link';});
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
    const names=el('div','release-identity'),title=el('h2');
    if(release.status==='published'){
      const link=el('a','smart-link-title-link',release.title);link.href=release.url||releaseUrl(release.slug);
      link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','Open '+release.title+' landing page');
      title.append(link);
    }else title.textContent=release.title;
    names.append(el('span','badge '+release.status,release.status),title,el('p','release-artist-name',release.artist));
    if(contentTypeOf(release)==='playlist')names.append(el('p','release-catalogue','SPOTIFY PLAYLIST'));else if(release.catalogue)names.append(el('p','release-catalogue',release.catalogue));
    const platforms=el('div','release-services');
    for(const link of release.links||[]){const service=SERVICES.find(s=>s.id===link.service);if(service){const item=el('span','service '+service.id,service.name);platforms.append(item);}}
    if(release.presave?.mode!=='off'&&release.presave?.url)platforms.append(el('span','service presave','Pre-save'));
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
function navigate(){
 const legacy=location.hash==='#experiments';if(legacy){history.replaceState(null,'','#performance');$('notes-panel').open=true;}
 const key=Object.hasOwn(views,location.hash.slice(1))?location.hash.slice(1):'smart-links';
 document.querySelectorAll('[data-view]').forEach(section=>section.hidden=section.dataset.view!==key);
 document.querySelectorAll('[data-nav]').forEach(link=>{if(link.dataset.nav===key)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
 $('view-title').textContent=views[key][0];$('view-intro').textContent=views[key][1];$('new-release').hidden=key!=='smart-links';
 $('days').querySelector('option[value="custom"]').hidden=key!=='performance';
 $('custom-range').hidden=key!=='performance'||$('days').value!=='custom';
 if(key==='smart-links'&&analyticsData&&($('report-release').value||$('report-source').value||$('days').value==='custom')){
  $('report-release').value='';$('report-source').value='';if($('days').value==='custom')$('days').value='30';void refresh();
 }
}
window.addEventListener('hashchange',navigate);navigate();
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{$('filter').value=button.dataset.filter;renderRecords();}));

function report(root,items,label,value,empty){root.replaceChildren();if(!items.length){root.append(el('p','empty',empty));return;}
  for(const item of items){const row=el('div','report-row');row.append(el('span','',label(item)),el('small','',value(item)));root.append(row);}}
function analyticsTable(root,labels,rows){
 root.replaceChildren();if(!rows.length){root.append(el('p','empty','No data yet for this selection.'));return;}
 const table=el('table','analytics-table'),head=el('tr');for(const label of labels)head.append(el('th','',label));table.append(head);
 for(const cells of rows){const row=el('tr');for(const value of cells)row.append(el('td','',String(value)));table.append(row);}root.append(table);
}
function renderAnalytics(data){
 const a=data.analytics||{},metrics=r=>[format(r.views),format(r.clicks),(r.views?100*r.clicks/r.views:0).toFixed(1)+'%'];
 const keys={countries:r=>r.country,regions:r=>r.region+' / '+r.country,cities:r=>r.city+' / '+r.region+' / '+r.country,devices:r=>r.device,browsers:r=>r.browser,systems:r=>r.os,ads:r=>[r.source,r.medium,r.campaign,r.content,r.term].map(x=>x||'Not tagged').join(' / '),delays:r=>r.delay_bucket};
 for(const [key,label] of Object.entries(keys))if(key==='delays')analyticsTable($('analytics-'+key),['Time before click','Clicks'],(a[key]||[]).map(r=>[label(r),format(r.clicks)]));else analyticsTable($('analytics-'+key),[key==='ads'?'Source / Medium / Campaign / Ad / Ad set':'Breakdown','Visits','Clicks','Clicks / visits'],(a[key]||[]).map(r=>[label(r),...metrics(r)]));
 $('audio-previews').textContent=format(a.coverage?.previews)+' preview plays';
 $('analytics-coverage').textContent='Detailed analytics: '+format(a.coverage?.views)+' visits and '+format(a.coverage?.clicks)+' clicks'+(a.coverage?.since?' since '+a.coverage.since.replace('T',' ')+':00 UTC':' from new activity')+'. Location is approximate. Earlier visits have no location or device data.';
 const hourly=$('timeline-mode').value==='hourly';let rows;
 if(hourly)rows=(a.hours||[]).slice().reverse().map(r=>({label:r.hour_utc.replace('T',' ')+':00',...r}));
 else rows=(data.trend||[]).map(r=>({label:r.day,...r}));
 const chart=$('activity-chart');chart.replaceChildren();const peak=Math.max(1,...rows.map(r=>Number(r.views)));
 for(const row of rows.slice(-90)){const bar=el('div','activity-column');bar.title=row.label+': '+row.views+' visits / '+row.clicks+' clicks';const fill=el('span','activity-bar');fill.style.height=(Number(row.views)/peak*100)+'%';bar.append(fill);chart.append(bar);}
 chart.setAttribute('aria-label','Page visits over time. Full counts in Timeline data.');
 analyticsTable($('timeline-data'),[hourly?'Hour (UTC)':'Day (UTC)','Visits','Clicks'],rows.map(r=>[r.label,format(r.views),format(r.clicks)]));
}
$('report-release').addEventListener('change',()=>void refresh());$('timeline-mode').addEventListener('change',()=>{if(analyticsData)renderAnalytics(analyticsData);});
async function refresh(){
  let query;try{query=reportQuery();}catch(error){notice(error.message);return;}
  const serial=++fetchSerial;notice('Refreshing smart link performance…');$('refresh').disabled=true;
  try{const data=await call('/dashboard?'+query);if(serial!==fetchSerial)return;records=data.releases;settings=data.settings;analyticsData=data;
    const selection=$('report-release').value;$('report-release').replaceChildren();const all=el('option','','All smart links');all.value='';$('report-release').append(all);for(const r of data.availableReleases||data.releases){const option=el('option','',r.title+' / '+r.artist);option.value=r.id;$('report-release').append(option);}$('report-release').value=selection;renderAnalytics(data);renderWorkspaceReports(data);updatePixelState();
    $('visits').textContent=format(data.summary.views);$('clicks').textContent=format(data.summary.clicks);$('published').textContent=format(data.summary.published);
    $('rate').textContent=(data.summary.views?100*data.summary.clicks/data.summary.views:0).toLocaleString('en-GB',{maximumFractionDigits:1})+'%';syncPixelInfo();
    $('pixel-id').value=settings.pixelId;$('click-event').value=settings.clickEvent;renderRecords();
    report($('platforms'),data.platforms,item=>SERVICES.find(s=>s.id===item.service)?.name||item.service,item=>format(item.count)+' clicks','Platform clicks will appear when someone uses your smart links.');
    report($('sources'),data.sources,item=>item.source==='meta'?'Meta Ads':item.source[0].toUpperCase()+item.source.slice(1),item=>format(item.views)+' visits / '+format(item.clicks)+' clicks','Visitor sources will appear here.');

    $('gate').hidden=true;$('dashboard').hidden=false;$('new-release').disabled=false;notice('Updated '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+'.');
  }catch(error){if(serial===fetchSerial){notice(error.message);$('gate').hidden=false;$('gate').querySelector('h2').textContent='Your workspace could not load.';$('gate').querySelector('p:not(.eyebrow)').textContent='You are signed in. Retry loading your smart links.';$('signin').textContent='Retry';}}finally{if(serial===fetchSerial)$('refresh').disabled=false;}
}
form.addEventListener('submit',async event=>{
  event.preventDefault();if(saving||uploading)return;const data=draft();if(event.submitter?.value==='draft')data.status='draft';
  const closeAfterPublish=event.submitter?.id==='save-release'&&data.status==='published';
  try{
    if(data.pixelId&&!/^\d{8,20}$/.test(data.pixelId))throw Error('Meta Pixel ID must be 8–20 digits, or leave it blank to use the Parallel Vision pixel.');
    data.links=validateLinks(data.links);data.presave=validatePresave(data.presave);
    if(data.contentType==='playlist'){
      const spotify=data.links.find(link=>link.service==='spotify')?.url||'';
      if(data.status==='published'&&!spotify)throw Error('Add a Spotify playlist URL before publishing.');
      if(spotify&&!/^https:\/\/open\.spotify\.com\/playlist\/[^/?#]+(?:[?#].*)?$/.test(spotify))throw Error('Use the direct open.spotify.com/playlist/ link, not a track or Hypeddit link.');
    }
  }catch(error){$('save-status').textContent=error.message;return;}
  saving=true;controls();$('save-status').textContent='Saving your smart link…';const revision=generation;
  try{const result=await call(editing?'/releases/'+editing.id:'/releases',{method:'POST',data});if(revision!==generation)return;
    editing=result.release;field('status').value=editing.status;field('slug').readOnly=true;slugEdited=true;$('editor-title').textContent='Edit smart link.';
    $('save-status').textContent=editing.status==='published'?'Your smart link is live.':editing.status==='archived'?'Smart link archived. The public page is unavailable.':'Draft saved. Only your account can see it.';
    $('saved-link').hidden=editing.status!=='published';$('saved-url').value=releaseUrl(editing.slug);$('open-saved').href=releaseUrl(editing.slug);await refresh();
    if(closeAfterPublish&&revision===generation&&editor.open){editor.close();editing=null;notice('Published '+result.release.title+'.');}
  }catch(error){if(revision===generation)$('save-status').textContent=error.message;}
  finally{saving=false;controls();}
});
$('copy-saved').addEventListener('click',()=>void copy($('saved-url').value,$('copy-saved')));
$('tracking-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;$('tracking-status').textContent='Saving…';
  try{const result=await call('/settings',{method:'POST',data:{pixelId:$('pixel-id').value.trim(),clickEvent:$('click-event').value,revision:settings.revision}});settings=result.settings;updatePixelState();$('tracking-status').textContent='Tracking settings saved.';}
  catch(error){$('tracking-status').textContent=error.message;}finally{button.disabled=false;}
});
initWorkspaceTools({call,getData:()=>analyticsData,refresh});
$('refresh').addEventListener('click',()=>void refresh());$('days').addEventListener('change',()=>{if($('days').value!=='custom')void refresh();});$('search').addEventListener('input',renderRecords);$('filter').addEventListener('change',renderRecords);
$('signin').addEventListener('click',()=>{if(clerk?.session){void refresh();}else clerk?.openSignIn();});$('signout').addEventListener('click',()=>void clerk?.signOut());
function authChanged(){
  const next=clerk?.session?.id||'';if(next===sessionId)return;sessionId=next;generation++;fetchSerial++;analyticsData=null;resetWorkspaceTools();$('report-source').value='';$('report-release').value='';records=[];settings=null;editing=null;
  $('dashboard').hidden=true;$('gate').hidden=!!next;$('signin').textContent='Sign in';$('new-release').disabled=true;$('release-rows').replaceChildren();$('signout').hidden=!next;editor.close();
  if(!next){$('gate').querySelector('h2').textContent='Your smart links live here.';$('gate').querySelector('p:not(.eyebrow)').textContent='Sign in with your Parallel Vision account to create pages and see their performance.';notice('Sign in to manage your smart links.');return;}void refresh();
}
try{clerk=await loadLabAccount();$('signin').disabled=false;clerk.addListener(authChanged);authChanged();}
catch{notice('Sign-in could not load. Reload this page to try again.');}
