import {prepareMoodPrompt} from './moods.js?v=20261012-hk-optics3&seedreamlite=1&filmRevision=4&hkContinuity=4&hkScene=5&hkCinematography=1&midnightFlashV2=1';
import {compileImagePrompt,normalizeReferenceLabel} from './reference-guidance.js?v=20261013-compact-map1&seedreamlite=1&dreamcore=7&syntheticRefs=1&raveIdentity=1';

// These are photographic treatment references, never a replacement Base.
// Stable labels also prevent adding them twice when a saved job is reopened.
const HONG_KONG_REFERENCES=Object.freeze([
  {file:'06-interior-portrait.jpg',type:'image/jpeg',note:'Skin and hair optics: natural faces, selective teal shadow, warm practical bounce. Preserve Base identity and setting; never copy people or tunnel.'},
  {file:'05-passage-diffusion.jpg',type:'image/jpeg',note:'Optical diffusion: motivated existing light through humid air, detailed nearby skin. Never copy passage or figures.'},
  {file:'02-city-haze.jpg',type:'image/jpeg',note:'Atmosphere: selective emerald depth, warm distant practicals and unlit black gaps; no flat green wash or copied city.'},
  {file:'03-shop-reflections.jpg',type:'image/jpeg',note:'Materials: wet or polished glints and warm/cool specular separation where plausible; no indoor street, taxi or signage.'}
].map(ref=>Object.freeze({...ref,url:'/lab/mood-references/hong-kong-nights/'+ref.file,
  label:Object.freeze({name:'Hong Kong Nights style - '+ref.file,role:'style',note:ref.note})})));

export function isMoodStyleReference(label){
  return label?.role==='style'&&(HONG_KONG_REFERENCES.some(ref=>ref.label.name===label.name)||['01-traffic-grain.png','04-warm-lamp.png'].some(file=>label.name==='Hong Kong Nights style - '+file));
}

export function moodReferencePlan(settings){
  if(settings?.type!=='image'||settings.mode!=='image'||settings.moodId!=='hong-kong-nights'||!['seedream','seedreamlite','gemini'].includes(settings.engine))
    return {settings,references:[]};
  const labels=(settings.referenceRoles||[]).map(normalizeReferenceLabel);
  const references=HONG_KONG_REFERENCES.filter(ref=>!labels.some(label=>label.role==='style'&&label.name===ref.label.name));
  if(labels.length+references.length>10)throw Error('Hong Kong Nights includes four Style references. Keep at most six of your own images, or choose another Mood.');
  const referenceRoles=[...labels,...references.map(ref=>({...ref.label}))];
  let prompt=settings.prompt;
  const budget=settings.engine==='seedreamlite'?3000:5000;
  if(compileImagePrompt(prompt,referenceRoles).length>budget&&typeof settings.moodOriginalPrompt==='string'){
    // Compact our own recipe, never truncate the user's direction or role notes.
    const recipe=prepareMoodPrompt(settings.moodOriginalPrompt,settings.moodId,settings.moodIntensity,{
      engine:settings.engine,referenceCount:labels.filter(label=>!isMoodStyleReference(label)).length,
      referenceMode:settings.referenceMode||'base',compact:true,filmFinish:settings.filmFinish
    });
    prompt=recipe.prompt;
    if(compileImagePrompt(prompt,referenceRoles).length>budget){
      // Last resort: shorten only our automatic art direction, never authored text or role notes.
      const small=prepareMoodPrompt(settings.moodOriginalPrompt,settings.moodId,settings.moodIntensity,{
        engine:settings.engine,referenceCount:labels.filter(label=>!isMoodStyleReference(label)).length,
        referenceMode:settings.referenceMode||'base',compact:true,ultraCompact:true,filmFinish:settings.filmFinish
      });
      prompt=small.prompt;
    }
  }
  if(compileImagePrompt(prompt,referenceRoles).length>budget)
    throw Error('Direction and reference notes are too long for this model’s '+budget.toLocaleString()+' character limit, even with the compact Mood. Shorten optional notes.');
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
