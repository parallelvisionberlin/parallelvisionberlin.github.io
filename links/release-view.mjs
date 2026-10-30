import {SERVICES,safeUrl} from './shared.mjs';
const node=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e;};
function artwork(value){try{return safeUrl(value||'');}catch{return '';}}
function serviceIcon(service){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.classList.add('service-icon');
  const shape=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))e.setAttribute(key,value);svg.append(e);};
  if(service==='spotify'){
    shape('circle',{cx:12,cy:12,r:12,fill:'#1ed760'});
    for(const [d,width] of [['M5.5 8.7c4.5-1.3 8.8-.9 13 1.3',2],['M6.3 12.1c3.8-1 7.5-.6 10.9 1.2',1.7],['M7 15.3c3.1-.8 6.1-.4 9 1',1.5]])shape('path',{d,fill:'none',stroke:'#111','stroke-width':width,'stroke-linecap':'round'});
  }else if(service==='youtube'){
    shape('rect',{x:0,y:3,width:24,height:18,rx:5,fill:'#ff0033'});shape('path',{d:'m10 8 7 4-7 4Z',fill:'#fff'});
  }else{
    shape('path',{d:'M10 8.5A6 6 0 0 1 21.4 10 4 4 0 0 1 20 18H10Z',fill:'#f60'});
    for(const [x,y] of [[1,13],[4,10],[7,8]])shape('path',{d:`M${x} ${y}V18`,stroke:'#f60','stroke-width':1.8,'stroke-linecap':'round'});
  }
  return svg;
}
export function renderRelease(root,release,{onClick=()=>{},preview=false}={}) {
  root.replaceChildren();
  const mode=['artwork','blur','black'].includes(release.background)?release.background:'artwork';
  const frame=node('article','release-frame background-'+mode),url=artwork(release.artworkUrl);
  const backdrop=node('div','release-backdrop');backdrop.setAttribute('aria-hidden','true');
  if(url&&mode!=='black'){const image=node('img');image.src=url;image.alt='';image.decoding='async';image.referrerPolicy='no-referrer';backdrop.append(image);}
  frame.append(backdrop);
  const art=node('div','release-art');
  if(url){const image=node('img');image.src=url;image.alt=(release.title||'Release')+' artwork';image.width=800;image.height=800;image.decoding='async';image.referrerPolicy='no-referrer';art.append(image);}
  else art.append(node('span','art-placeholder','PARALLEL\nVISION'));
  frame.append(art);
  const copy=node('div','release-copy');
  copy.append(node('p','eyebrow','PARALLEL VISION'));
  copy.append(node(preview?'h2':'h1','release-title',release.title||'Release title'));
  copy.append(node('p','release-artist',release.artist||'Artist name'));
  if(release.description)copy.append(node('p','release-description',release.description));
  const metadata=node('div','release-metadata');
  if(release.catalogue)metadata.append(node('span','release-catalogue',release.catalogue));
  if(release.releaseDate){const future=Date.parse(release.releaseDate+'T00:00:00Z')>Date.now();metadata.append(node('span','release-date',(future?'OUT ':'RELEASED ')+new Date(release.releaseDate+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})));}
  copy.append(metadata);
  if(release.audioUrl){const audio=node('audio','release-audio');audio.controls=true;audio.preload='none';audio.src=release.audioUrl;audio.setAttribute('aria-label','Preview '+(release.title||'this release'));copy.append(audio);}
  frame.append(copy);
  const dock=node('section','listening-dock');dock.setAttribute('aria-label','Listen to '+(release.title||'this release'));dock.append(node('p','dock-label','Choose where to listen'));
  const list=node('div','platform-list');list.setAttribute('aria-label','Music platforms');
  for(const link of release.links||[]){const service=SERVICES.find(s=>s.id===link.service);if(!service)continue;
    const button=node(preview?'button':'a','platform-button platform-'+service.id);
    if(preview){button.type='button';button.setAttribute('aria-label','Preview button for '+service.name);}
    else{button.href=link.url;button.rel='noopener noreferrer';button.target='_blank';button.addEventListener('click',()=>onClick(link.service));}
    const name=node('span','platform-identity');name.append(serviceIcon(service.id),node('span','platform-name',service.name));
    button.append(name,node('span','platform-action',service.action));list.append(button);
  }
  if(!list.children.length)list.append(node('p','release-description','Add your music platform links.'));
  dock.append(list);frame.append(dock);root.append(frame);
}
