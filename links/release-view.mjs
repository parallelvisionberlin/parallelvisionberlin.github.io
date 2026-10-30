import {SERVICES} from './shared.mjs';
const node=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e;};
export function renderRelease(root,release,{onClick=()=>{},preview=false}={}) {
  root.replaceChildren();
  const frame=node('article','release-frame');
  const art=node('div','release-art');
  if(release.artworkUrl){const image=node('img');image.src=release.artworkUrl;image.alt=release.title+' artwork';image.width=800;image.height=800;image.decoding='async';image.referrerPolicy='no-referrer';art.append(image);}
  else art.append(node('span','art-placeholder','PARALLEL\nVISION'));
  frame.append(art);
  const copy=node('div','release-copy');
  copy.append(node('p','eyebrow',release.catalogue?'PARALLEL VISION / '+release.catalogue:'PARALLEL VISION / RELEASE'));
  copy.append(node(preview?'h2':'h1','release-title',release.title||'Release title'));
  copy.append(node('p','release-artist',release.artist||'Artist name'));
  if(release.description)copy.append(node('p','release-description',release.description));
  if(release.releaseDate){const future=Date.parse(release.releaseDate+'T00:00:00Z')>Date.now();copy.append(node('p','release-date',(future?'OUT ':'RELEASED ')+new Date(release.releaseDate+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})));}
  if(release.audioUrl){const audio=node('audio','release-audio');audio.controls=true;audio.preload='none';audio.src=release.audioUrl;audio.setAttribute('aria-label','Preview '+(release.title||'this release'));copy.append(audio);}
  const list=node('div','platform-list');list.setAttribute('aria-label','Listen and buy');
  for(const link of release.links||[]){const service=SERVICES.find(s=>s.id===link.service);if(!service)continue;
    const button=node(preview?'button':'a','platform-button');
    if(preview){button.type='button';button.setAttribute('aria-label','Preview button for '+service.name);}
    else{button.href=link.url;button.rel='noopener noreferrer';button.target='_blank';button.addEventListener('click',()=>onClick(link.service));}
    button.append(node('span','platform-name',service.name),node('span','platform-action',service.action));list.append(button);
  }
  if(!list.children.length)list.append(node('p','release-description','Add your music platform links.'));
  copy.append(list);frame.append(copy);root.append(frame);
}
