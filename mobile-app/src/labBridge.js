export const LAB_ORIGIN='https://parallelvisionlabel.com';
export const LAB_STUDIO=LAB_ORIGIN+'/lab/studio.html?tool=image&native=1&app=2';
export const LAB_MOODS=LAB_ORIGIN+'/lab/mood-creator.html?native=1&app=2#my-moods';
export const LAB_DISCOVER=LAB_ORIGIN+'/lab/app-moods.html?v=2';
const paths=new Set(['/lab/studio.html','/lab/mood-creator.html','/lab/app-moods.html']);
export function isLabURL(value){try{const u=new URL(value);return u.origin===LAB_ORIGIN&&!u.username&&!u.password&&paths.has(u.pathname);}catch{return false;}}
export function readLabMessage(event){
  if(!isLabURL(event?.url)||typeof event.data!=='string'||event.data.length>36*1024*1024)return null;
  try{
    const m=JSON.parse(event.data);
    if(m.type==='PV_LAB_AUTH')return typeof m.id==='string'&&/^\d{1,8}$/.test(m.id)&&typeof m.pageId==='string'&&/^[a-f0-9-]{36}$/i.test(m.pageId)?m:null;
    return ['PV_LAB_READY','PV_LAB_SIGN_IN','PV_LAB_SIGN_OUT','PV_LAB_SHARE','PV_LAB_NOTICE'].includes(m.type)?m:null;
  }catch{return null;}
}
export const nativeLabFlag="window.__PV_LAB_NATIVE__=1;true;";
export function labReplyScript(reply){return `if(location.origin===${JSON.stringify(LAB_ORIGIN)}&&${JSON.stringify([...paths])}.includes(location.pathname)){window.__PV_LAB_REPLY__?.(${JSON.stringify(reply).replace(/</g,'\\u003c')});}true;`;}
export function labCommandScript(command){return `if(location.origin===${JSON.stringify(LAB_ORIGIN)}&&location.pathname==='/lab/studio.html'){window.__PV_LAB_COMMAND__?.(${JSON.stringify(command).replace(/</g,'\\u003c')});}true;`;}
export function moodCommand(url){
  if(!isLabURL(url))return null;const u=new URL(url);if(u.pathname!=='/lab/studio.html')return null;
  const mood=u.searchParams.get('mood'),moodboard=u.searchParams.get('moodboard'),handoff=u.searchParams.get('handoff');
  const extra=handoff&&/^[a-f0-9-]{36}$/i.test(handoff)?{handoff}:{};
  if(moodboard&&/^[a-f0-9-]{36}$/i.test(moodboard))return {action:'mood',moodboard,...extra};
  if(mood&&/^[a-z0-9-]{1,80}$/.test(mood))return {action:'mood',mood,...extra};
  return {action:'create'};
}
export function sharePayload(message){
  const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]*={0,2})$/.exec(message?.data||'');
  if(!match||!match[2]||match[2].length>35*1024*1024)throw Error('This image cannot be shared from the app.');
  return {base64:match[2],extension:match[1]==='jpeg'?'jpg':match[1],mime:'image/'+match[1]};
}
