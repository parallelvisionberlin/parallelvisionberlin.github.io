export const API = 'https://parallel-vision-lab.parallelvision.workers.dev';
export const PUBLIC_ORIGIN = 'https://parallelvisionlabel.com';
export const MUSIC_PIXEL = '1746851780072706';
export const BACKGROUNDS = ['artwork','blur','black'];
export const CLICK_EVENTS = ['MusicLinkClick'];
export const SERVICES = [
  {id:'spotify',name:'Spotify',action:'Listen',hosts:['open.spotify.com','spotify.com','www.spotify.com','spotify.link']},
  {id:'soundcloud',name:'SoundCloud',action:'Listen',hosts:['soundcloud.com','www.soundcloud.com','on.soundcloud.com']},
  {id:'youtube',name:'YouTube',action:'Watch',hosts:['youtube.com','www.youtube.com','music.youtube.com','youtu.be']}
];
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function newId(){
  if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
  const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const h=[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
}
export function releaseUrl(slug) { return PUBLIC_ORIGIN+'/listen/?release='+encodeURIComponent(slug); }
export function slugify(value) { return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80).replace(/-$/,''); }
export function safeUrl(value,{optional=true}={}) {
  if(optional&&!value)return '';
  if(typeof value!=='string'||value.length>2048||/[\x00-\x20]/.test(value))throw Error('Use a valid HTTPS link.');
  let url;try{url=new URL(value);}catch{throw Error('Use a valid HTTPS link.');}
  if(url.protocol!=='https:'||url.username||url.password||url.port)throw Error('Use a valid HTTPS link.');
  return url.href;
}
export function validateLinks(input) {
  if(!Array.isArray(input)||input.length>SERVICES.length)throw Error('Check the music platform links.');
  const seen=new Set();
  return input.filter(x=>x?.url).map(item=>{
    const service=SERVICES.find(x=>x.id===item.service);
    if(!service||seen.has(item.service))throw Error('Choose each music platform only once.');
    const url=safeUrl(item.url,{optional:false}),host=new URL(url).hostname;
    if(!service.hosts.includes(host)&&!(service.suffix&&host.endsWith(service.suffix)))throw Error('Use a '+service.name+' link for its button.');
    seen.add(item.service);return {service:item.service,url};
  });
}
export function metaDetails(release,service='') {
  return {content_name:release.title,content_ids:[release.id],content_type:'music',artist:release.artist,track:release.title,
    ...(service?{music_service:service}:{})};
}
