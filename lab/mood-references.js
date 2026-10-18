import {HONG_KONG_REFERENCE_FILES,normalizeHongKongVariation} from './hong-kong-presets.js?v=20261018-analog-originals4';
import {compileImagePrompt,normalizeReferenceLabel} from './reference-guidance.js?dreamBlurBudget=20261016v1&v=20261013-compact-map2&seedreamlite=1&dreamcore=7&syntheticRefs=1&raveIdentity=1&refMode=20261014-contextual-reference1&refOnlyBudget=20261018v1';

// These are photographic treatment references, never a replacement Base.
// Stable labels also prevent adding them twice when a saved job is reopened.
const HONG_KONG_PHOTOS=Object.freeze([
  {file:'06-interior-portrait.jpg',type:'image/jpeg',note:'Natural face and cool shadow with warm/red bounce. Do not copy the reference person or pose; user identity wins.'},
  {file:'05-passage-diffusion.jpg',type:'image/jpeg',note:'Source-lit humid diffusion, practical highlights and real shadow detail. No copied passage or figures.'},
  {file:'02-city-haze.jpg',type:'image/jpeg',note:'Deep emerald nocturnal air with real warm and ruby practical lights. No copied city, cars, or composition.'},
  {file:'03-shop-reflections.jpg',type:'image/jpeg',note:'Authentic reflective glints, warm/cool separation and selective red practical reflections. Never invent wet floors or transplant shops.'},
  {file:'01-traffic-grain.png',type:'image/png',note:'OPTICS ONLY: analog traffic motion and irregular grain in real nocturnal light. No copied vehicles, scene, signage or people.'},
  {file:'greg-iii.png',type:'image/png',note:'Real 35mm neon city depth and tungsten/teal separation. Optics only, no copied city.'},
  {file:'plaza-grill.webp',type:'image/webp',note:'Photographed storefront: cyan fluorescents, real night shadows and practical bloom. Style only.'},
  {file:'greg-reds.png',type:'image/png',note:'Real ruby-red neon density against dark film shadows. Never duplicate signage or cars.'},
  {file:'young-woman-tram.webp',type:'image/webp',note:'Human lighting and natural skin within city space. Never copy this person, clothing or tram.'},
  {file:'silver-grill-cafe.jpg',type:'image/jpeg',note:'Real night cafe light and organic grain. Do not transplant its storefront or people.'},
  {file:'supervalu.jpg',type:'image/jpeg',note:'Emerald humidity, dim practical bloom and shadow density. No imported location or vehicles.'},
  {file:'greg22.png',type:'image/png',note:'Real green fluorescent contamination with amber light pockets. Never copy people or interior.'},
  {file:'sheung-wan-street.webp',type:'image/webp',note:'Optical motion of pedestrians and tram on real film. Never import daylight, signs or road.'}
].map(ref=>Object.freeze({...ref,url:'/lab/mood-references/hong-kong-nights/'+ref.file,
  label:Object.freeze({name:'Hong Kong Nights style - '+ref.file,role:'style',note:ref.note})})));
const HONG_KONG_REFERENCE_SETS=Object.freeze(Object.fromEntries(
  Object.entries(HONG_KONG_REFERENCE_FILES).map(([variation,files])=>[variation,Object.freeze(files.map(file=>{
    const photo=HONG_KONG_PHOTOS.find(ref=>ref.file===file);
    if(!photo)throw Error('Missing Hong Kong Nights photographic asset configuration: '+file);
    return photo;
  }))])
));
const HONG_KONG_REFERENCES=HONG_KONG_REFERENCE_SETS.original;

const DREAM_BLUR_REFERENCES=Object.freeze([
  {file:'01-blue-eye-light-memory.jpg',type:'image/jpeg',note:'OPTICS ONLY: broad cyan handheld streaks near eye highlights, thin warm line, uneven analog grain. Never copy face, hair or eyes.'},
  {file:'02-silhouette-blue-room.jpg',type:'image/jpeg',note:'OPTICS ONLY: moving highlights, dark silhouette and cool room exposure. Keep Base people, framing and place; never copy silhouette.'},
  {file:'03-city-light-trails.jpg',type:'image/jpeg',note:'OPTICS ONLY: imperfect handheld light trails, scattered hot cores and dark negative space. Never import city, cars or people.'},
  {file:'04-abstract-cyan-exposure.jpg',type:'image/jpeg',note:'OPTICS ONLY: cobalt/cyan exposure sweep, halation, red-orange flecks, pushed grain. Adapt to the Base, never apply a blue filter.'}
].map(ref=>Object.freeze({...ref,url:'/lab/mood-references/dream-blur/'+ref.file,
  label:Object.freeze({name:'Dream Blur style - '+ref.file,role:'style',note:ref.note})})));

export function isMoodStyleReference(label){
  return label?.role==='style'&&(DREAM_BLUR_REFERENCES.some(ref=>ref.label.name===label.name)||HONG_KONG_PHOTOS.some(ref=>ref.label.name===label.name)||['01-traffic-grain.png','04-warm-lamp.png'].some(file=>label.name==='Hong Kong Nights style - '+file));
}

export function moodReferencePlan(settings){
  if(settings?.type!=='image'||settings.mode!=='image'||!['hong-kong-nights','dream-blur'].includes(settings.moodId)||!['seedream','seedreamlite','gemini','gemini21'].includes(settings.engine))
    return {settings,references:[]};
  const labels=(settings.referenceRoles||[]).map(normalizeReferenceLabel);
  const source=settings.moodId==='dream-blur'?DREAM_BLUR_REFERENCES:HONG_KONG_REFERENCE_SETS[normalizeHongKongVariation(settings.moodVariation)];
  const moodLabel=settings.moodId==='dream-blur'?'Dream Blur':'Hong Kong Nights';
  const references=source.filter(ref=>!labels.some(label=>label.role==='style'&&label.name===ref.label.name));
  if(labels.length+references.length>10)throw Error(moodLabel+' includes four Style references. Keep at most six of your own images, or choose another Mood.');
  const referenceRoles=[...labels,...references.map(ref=>({...ref.label}))];
  // Add exactly four Style photos for the selected treatment without rewriting the subject.
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
