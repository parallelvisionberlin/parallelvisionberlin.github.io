import {prepareMoodPrompt} from './moods.js?v=20261012-hk-optics3&filmRevision=3&hkContinuity=4';
import {compileImagePrompt,normalizeReferenceLabel} from './reference-guidance.js?v=20261010-reference-flow2&dreamcore=7&syntheticRefs=1&raveIdentity=1';

// These are photographic treatment references, never a replacement Base.
// Stable labels also prevent adding them twice when a saved job is reopened.
const HONG_KONG_REFERENCES=Object.freeze([
  {file:'06-interior-portrait.jpg',type:'image/jpeg',note:'Primary people reference: soft skin/hair transitions, dim green light and luminous practicals. Keep Base identity, pose and scene; never copy couple or tunnel.'},
  {file:'05-passage-diffusion.jpg',type:'image/jpeg',note:'Optical reference: fluorescent light spread, soft edges and humid depth across people and setting. Never copy passage or figures.'},
  {file:'02-city-haze.jpg',type:'image/jpeg',note:'Atmosphere: emerald depth, humid diffusion, luminous highlights and dark gaps. Transfer light, never city or framing.'},
  {file:'03-shop-reflections.jpg',type:'image/jpeg',note:'Surfaces: wet reflections and warm/cool separation where suitable. Interiors stay indoors; never add street, taxi or signage.'}
].map(ref=>Object.freeze({...ref,url:'/lab/mood-references/hong-kong-nights/'+ref.file,
  label:Object.freeze({name:'Hong Kong Nights style - '+ref.file,role:'style',note:ref.note})})));

export function isMoodStyleReference(label){
  return label?.role==='style'&&(HONG_KONG_REFERENCES.some(ref=>ref.label.name===label.name)||['01-traffic-grain.png','04-warm-lamp.png'].some(file=>label.name==='Hong Kong Nights style - '+file));
}

export function moodReferencePlan(settings){
  if(settings?.type!=='image'||settings.mode!=='image'||settings.moodId!=='hong-kong-nights'||!['seedream','gemini'].includes(settings.engine))
    return {settings,references:[]};
  const labels=(settings.referenceRoles||[]).map(normalizeReferenceLabel);
  const references=HONG_KONG_REFERENCES.filter(ref=>!labels.some(label=>label.role==='style'&&label.name===ref.label.name));
  if(labels.length+references.length>10)throw Error('Hong Kong Nights includes four Style references. Keep at most six of your own images, or choose another Mood.');
  const referenceRoles=[...labels,...references.map(ref=>({...ref.label}))];
  let prompt=settings.prompt;
  if(compileImagePrompt(prompt,referenceRoles).length>5000&&typeof settings.moodOriginalPrompt==='string'){
    // Compact our own recipe, never truncate the user's direction or role notes.
    const recipe=prepareMoodPrompt(settings.moodOriginalPrompt,settings.moodId,settings.moodIntensity,{
      engine:settings.engine,referenceCount:labels.filter(label=>!isMoodStyleReference(label)).length,
      referenceMode:settings.referenceMode||'base',compact:true,filmFinish:settings.filmFinish
    });
    prompt=recipe.prompt;
  }
  if(compileImagePrompt(prompt,referenceRoles).length>5000)
    throw Error('Your direction and reference notes are too long even with the compact Mood. Shorten the direction or optional notes.');
  return {settings:{...settings,prompt,referenceRoles,
    // With text alone, a style photograph must not choose the output framing.
    aspectRatio:!labels.length&&settings.aspectRatio==='auto'?'1:1':settings.aspectRatio},references};
}

export function createMoodReferenceLoader({upload,fetchFile=fetch}){
  let session=null,uploads=new Map();
  return {
    clear(){session=null;uploads=new Map();},
    async prepare(settings,{sessionKey,check=()=>{}}={}){
      const plan=moodReferencePlan(settings);
      if(!plan.references.length)return {...plan,references:[]};
      check();
      if(sessionKey===undefined||sessionKey===null||sessionKey==='')throw Error('Sign in before preparing Mood references.');
      if(session!==sessionKey){session=sessionKey;uploads=new Map();}
      const cache=uploads,references=[];
      for(const ref of plan.references){
        check();
        let pending=cache.get(ref.url);
        if(!pending){
          pending=(async()=>{
            const response=await fetchFile(ref.url,{credentials:'omit',signal:AbortSignal.timeout(30000)});
            if(!response.ok)throw Error('A Hong Kong Nights Style reference could not load. Please try again.');
            const blob=await response.blob();
            if(!blob.size)throw Error('A Hong Kong Nights Style reference is empty. Please try again.');
            check();
            const file=new File([blob],ref.label.name,{type:ref.type});
            const result=await upload(file);
            const id=typeof result==='string'?result:result?.id;
            if(!id)throw Error('A Hong Kong Nights Style reference could not upload. Please try again.');
            return {id,file};
          })();
          cache.set(ref.url,pending);
          pending.catch(()=>{if(cache.get(ref.url)===pending)cache.delete(ref.url);});
        }
        references.push(await pending);check();
      }
      return {settings:plan.settings,references};
    }
  };
}
