import {compileImagePrompt,normalizeReferenceLabel} from './reference-guidance.js?dreamBlurBudget=20261016v1&v=20261013-compact-map2&seedreamlite=1&dreamcore=7&syntheticRefs=1&raveIdentity=1&refMode=20261014-contextual-reference1';

// These are photographic treatment references, never a replacement Base.
// Stable labels also prevent adding them twice when a saved job is reopened.
const HONG_KONG_REFERENCES=Object.freeze([
  {file:'06-interior-portrait.jpg',type:'image/jpeg',note:'Skin and hair optics: natural faces, selective teal shadow, warm practical bounce. Preserve Base identity and setting; never copy people or tunnel.'},
  {file:'05-passage-diffusion.jpg',type:'image/jpeg',note:'Optical diffusion: motivated existing light through humid air, detailed nearby skin. Never copy passage or figures.'},
  {file:'02-city-haze.jpg',type:'image/jpeg',note:'Atmosphere: selective emerald depth, warm distant practicals and unlit black gaps; no flat green wash or copied city.'},
  {file:'03-shop-reflections.jpg',type:'image/jpeg',note:'Materials: wet or polished glints and warm/cool specular separation where plausible; no indoor street, taxi or signage.'}
].map(ref=>Object.freeze({...ref,url:'/lab/mood-references/hong-kong-nights/'+ref.file,
  label:Object.freeze({name:'Hong Kong Nights style - '+ref.file,role:'style',note:ref.note})})));


const DREAM_BLUR_REFERENCES=Object.freeze([
  {file:'01-blue-eye-light-memory.jpg',type:'image/jpeg',note:'OPTICS ONLY: broad cyan handheld streaks near eye highlights, thin warm line, uneven analog grain. Never copy face, hair or eyes.'},
  {file:'02-silhouette-blue-room.jpg',type:'image/jpeg',note:'OPTICS ONLY: moving highlights, dark silhouette and cool room exposure. Keep Base people, framing and place; never copy silhouette.'},
  {file:'03-city-light-trails.jpg',type:'image/jpeg',note:'OPTICS ONLY: imperfect handheld light trails, scattered hot cores and dark negative space. Never import city, cars or people.'},
  {file:'04-abstract-cyan-exposure.jpg',type:'image/jpeg',note:'OPTICS ONLY: cobalt/cyan exposure sweep, halation, red-orange flecks, pushed grain. Adapt to the Base, never apply a blue filter.'}
].map(ref=>Object.freeze({...ref,url:'/lab/mood-references/dream-blur/'+ref.file,
  label:Object.freeze({name:'Dream Blur style - '+ref.file,role:'style',note:ref.note})})));

export function isMoodStyleReference(label){
  return label?.role==='style'&&(DREAM_BLUR_REFERENCES.some(ref=>ref.label.name===label.name)||HONG_KONG_REFERENCES.some(ref=>ref.label.name===label.name)||['01-traffic-grain.png','04-warm-lamp.png'].some(file=>label.name==='Hong Kong Nights style - '+file));
}

export function moodReferencePlan(settings){
  if(settings?.type!=='image'||settings.mode!=='image'||!['hong-kong-nights','dream-blur'].includes(settings.moodId)||!['seedream','seedreamlite','gemini','gemini21'].includes(settings.engine))
    return {settings,references:[]};
  const labels=(settings.referenceRoles||[]).map(normalizeReferenceLabel);
  const source=settings.moodId==='dream-blur'?DREAM_BLUR_REFERENCES:HONG_KONG_REFERENCES;
  const moodLabel=settings.moodId==='dream-blur'?'Dream Blur':'Hong Kong Nights';
  const references=source.filter(ref=>!labels.some(label=>label.role==='style'&&label.name===ref.label.name));
  if(labels.length+references.length>10)throw Error(moodLabel+' includes four Style references. Keep at most six of your own images, or choose another Mood.');
  const referenceRoles=[...labels,...references.map(ref=>({...ref.label}))];
  // Add the four canonical Style photos without rewriting the selected Mood.
  // Check the full provider prompt, including the full/compact role map.
  const budget=settings.engine==='seedreamlite'?3000:5000;
  const compiled=compileImagePrompt(settings.prompt,referenceRoles,{...settings,referenceRoles});
  const over=compiled.length-budget;
  if(over>0)
    throw Error('Direction, Mood and reference instructions exceed '+budget.toLocaleString()+' characters by '+over.toLocaleString()+'. The Mood stays unchanged; shorten your direction or optional reference notes.');
  return {settings:{...settings,referenceRoles,
    // With text alone, a style photograph must not choose the output framing.
    aspectRatio:!labels.length&&settings.aspectRatio==='auto'?'16:9':settings.aspectRatio},references};
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
      const cache=uploads;
      // First download all missing public Style photographs in parallel.
      // Do not upload any if one is absent or the account/prompt changed.
      const staged=await Promise.all(plan.references.map(async ref=>{
        check();
        if(cache.has(ref.url))return null;
        const response=await fetchFile(ref.url,{credentials:'omit',signal:AbortSignal.timeout(30000)});
        if(!response.ok)throw Error('A '+(ref.label.name.startsWith('Dream Blur')?'Dream Blur':'Hong Kong Nights')+' Style reference could not load. Please try again.');
        const blob=await response.blob();
        if(!blob.size)throw Error('A '+(ref.label.name.startsWith('Dream Blur')?'Dream Blur':'Hong Kong Nights')+' Style reference is empty. Please try again.');
        check();
        return new File([blob],ref.label.name,{type:ref.type});
      }));
      check();
      // Upload in parallel, retaining the original Style order for the provider.
      // Cache pending promises by account session to avoid repeats when editing text.
      const references=await Promise.all(plan.references.map((ref,i)=>{
        check();
        let pending=cache.get(ref.url);
        if(!pending){
          pending=(async()=>{
            const file=staged[i],result=await upload(file);
            const id=typeof result==='string'?result:result?.id;
            if(!id)throw Error('A '+(ref.label.name.startsWith('Dream Blur')?'Dream Blur':'Hong Kong Nights')+' Style reference could not upload. Please try again.');
            return {id,file};
          })();
          cache.set(ref.url,pending);
          pending.catch(()=>{if(cache.get(ref.url)===pending)cache.delete(ref.url);});
        }
        return pending;
      }));
      check();
      return {settings:plan.settings,references};
    }
  };
}
