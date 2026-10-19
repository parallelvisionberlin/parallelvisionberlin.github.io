import {compileImagePrompt,normalizeReferenceLabel} from './reference-guidance.js?dreamBlurBudget=20261016v1&v=20261013-compact-map2&seedreamlite=1&dreamcore=7&syntheticRefs=1&raveIdentity=1&refMode=20261014-contextual-reference1&refOnlyBudget=20261018v1&fisheye=20261020v1';
import {HONG_KONG_VARIANTS,hongKongVariant} from './hong-kong-variants.js?v=20261018-user-originals2&hkRestore=20261018v1';

// These are photographic treatment references, never a replacement Base.
// Stable labels also prevent adding them twice when a saved job is reopened.
const HONG_KONG_PHOTO_NOTES=Object.freeze({
  '01-person-interior.jpg':'REAL FILM / subject with interior: authentic dimensional ambient exposure on people and room, individual skin and hair tonality. Do not copy people, room or gestures.',
  '02-person-street.jpg':'REAL FILM / human portrait in an actual environment: natural skin response and believable shadows. Do not copy woman, outfit or tram.',
  '03-red-night.jpg':'REAL FILM / glowing red and amber practicals: luminous night color and deep black intervals. Do not copy street, signage, cars or figures.',
  '04-golden-lion.jpg':'REAL FILM / warm nocturnal practical-light separation, optical glow and real shadow. Do not copy bar, cars or people.',
  '05-club-gold-star.jpg':'REAL FILM / rich red/amber nightclub lights in actual night space, dense blacks and tactile negative. Do not copy venue or people.',
  '06-sheung-wan.jpg':'REAL FILM / architecture, ambient material color and spatial separation. Do not copy objects or location.',
  'greg-iii.png':'True photographed night city: layered neon, teal and amber practicals, natural black. Never copy location.',
  'plaza-grill.webp':'Real café storefront; turquoise fluorescent light and dark tungsten street. Optics only.',
  'young-woman-tram.webp':'Photographed human subject and available-light skin; never copy person, outfit or tram.',
  'greg-reds.png':'Saturated photographed ruby-red neon and black density. Never copy venue, text or cars.',
  'greg22.png':'True green practicals, deep natural film shadow, amber highlights; do not copy people or scene.',
  'supervalu.jpg':'Photochemical petrol-green haze and isolated ruby practicals; keep customer location.',
  'silver-grill-cafe.jpg':'Warm café light in real nighttime scene, cyan-green depth and grain; no transplanted street.',
  'sheung-wan-street.webp':'Real handheld street motion optics; never transfer daytime, vehicles or composition.'
});
const HONG_KONG_REFERENCES=Object.freeze(Object.fromEntries(
  Object.entries(HONG_KONG_VARIANTS).map(([name,variant])=>[name,Object.freeze(variant.files.map(file=>Object.freeze({
    file,type:file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg',note:HONG_KONG_PHOTO_NOTES[file],url:'/lab/mood-references/hong-kong-nights/'+file,
    label:Object.freeze({name:'Hong Kong Nights style - '+file,role:'style',note:HONG_KONG_PHOTO_NOTES[file]})
  })))]))
);
const HONG_KONG_REFERENCE_LABELS=new Set([
  ...Object.values(HONG_KONG_REFERENCES).flat().map(ref=>ref.label.name),
  ...['01-person-interior.jpg','02-person-street.jpg','03-red-night.jpg','04-golden-lion.jpg','05-club-gold-star.jpg','06-sheung-wan.jpg'].map(file=>'Hong Kong Nights style - '+file),
  ...['06-interior-portrait.jpg','05-passage-diffusion.jpg','02-city-haze.jpg','03-shop-reflections.jpg',
      '01-traffic-grain.png','04-warm-lamp.png'].map(file=>'Hong Kong Nights style - '+file)
]);

const DREAM_BLUR_REFERENCES=Object.freeze([
  {file:'01-blue-eye-light-memory.jpg',type:'image/jpeg',note:'OPTICS ONLY: broad cyan handheld streaks near eye highlights, thin warm line, uneven analog grain. Never copy face, hair or eyes.'},
  {file:'02-silhouette-blue-room.jpg',type:'image/jpeg',note:'OPTICS ONLY: moving highlights, dark silhouette and cool room exposure. Keep Base people, framing and place; never copy silhouette.'},
  {file:'03-city-light-trails.jpg',type:'image/jpeg',note:'OPTICS ONLY: imperfect handheld light trails, scattered hot cores and dark negative space. Never import city, cars or people.'},
  {file:'04-abstract-cyan-exposure.jpg',type:'image/jpeg',note:'OPTICS ONLY: cobalt/cyan exposure sweep, halation, red-orange flecks, pushed grain. Adapt to the Base, never apply a blue filter.'}
].map(ref=>Object.freeze({...ref,url:'/lab/mood-references/dream-blur/'+ref.file,
  label:Object.freeze({name:'Dream Blur style - '+ref.file,role:'style',note:ref.note})})));

const FISHEYE_2000_REFERENCES=Object.freeze([
  {file:'01-analog-daylight.webp',note:'OPTICS ONLY: credible early-2000s overcast Japanese street exposure, fine embedded negative grain, muted real color, human skin and deep street perspective. Never copy the models, outfit, signs or place.'},
  {file:'02-fisheye-flash.webp',note:'OPTICS ONLY: real circular-edge 15mm fisheye near/far scale, naturally curved urban edges, stark direct flash with deep ambient falloff. Never copy the faces, gesture, wardrobe or location.'}
].map(ref=>Object.freeze({...ref,type:'image/webp',url:'/lab/mood-references/fisheye-2000/'+ref.file,
  label:Object.freeze({name:'Fisheye 2000 style - '+ref.file,role:'style',note:ref.note})})));

export function isMoodStyleReference(label){
  return label?.role==='style'&&(DREAM_BLUR_REFERENCES.some(ref=>ref.label.name===label.name)||FISHEYE_2000_REFERENCES.some(ref=>ref.label.name===label.name)||HONG_KONG_REFERENCE_LABELS.has(label.name));
}

export function moodReferencePlan(settings){
  if(settings?.type!=='image'||settings.mode!=='image'||!['hong-kong-nights','dream-blur','fisheye-2000'].includes(settings.moodId)||!['seedream','seedreamlite','gemini','gemini21'].includes(settings.engine))
    return {settings,references:[]};
  const labels=(settings.referenceRoles||[]).map(normalizeReferenceLabel);
  const isHongKong=settings.moodId==='hong-kong-nights';
  // The original October 10 Hong Kong Nights treatment used its creative
  // text direction and only user-supplied photographs. Auto-injecting four
  // unrelated scene photographs changed the input conditioning model.
  // Restore the original behavior for Base, References-only and text-only.
  // Preserve saved historical style labels for History and Reuse filtering.
  if(isHongKong){
    const budget=settings.engine==='seedreamlite'?3000:5000;
    const compiled=compileImagePrompt(settings.prompt,labels,{...settings,referenceRoles:labels});
    const over=compiled.length-budget;
    if(over>0)throw Error('Direction, Mood and reference instructions exceed '+budget.toLocaleString()+' characters by '+over.toLocaleString()+'. The Mood stays unchanged; shorten your direction or optional reference notes.');
    return {settings,references:[]};
  }
  const isFisheye=settings.moodId==='fisheye-2000';
  const source=isHongKong?HONG_KONG_REFERENCES[hongKongVariant(settings.moodVariant)]:isFisheye?FISHEYE_2000_REFERENCES:DREAM_BLUR_REFERENCES;
  const moodLabel=isHongKong?'Hong Kong Nights':isFisheye?'Fisheye 2000':'Dream Blur';
  // Saved older jobs retain their original four Style sources. Never silently
  // append another pack of four to a reused result or duplicate user uploads.
  const preservedHistoricStyle=isHongKong&&labels.some(label=>label.role==='style'&&HONG_KONG_REFERENCE_LABELS.has(label.name));
  const references=preservedHistoricStyle?[]:source.filter(ref=>!labels.some(label=>label.role==='style'&&label.name===ref.label.name));
  if(labels.length+references.length>10)throw Error(moodLabel+' includes '+source.length+' Style references. Keep at most '+(isFisheye?'8':'six')+' of your own images, or choose another Mood.');
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
        if(!response.ok)throw Error('A '+(ref.label.name.startsWith('Dream Blur')?'Dream Blur':ref.label.name.startsWith('Fisheye 2000')?'Fisheye 2000':'Hong Kong Nights')+' Style reference could not load. Please try again.');
        const blob=await response.blob();
        if(!blob.size)throw Error('A '+(ref.label.name.startsWith('Dream Blur')?'Dream Blur':ref.label.name.startsWith('Fisheye 2000')?'Fisheye 2000':'Hong Kong Nights')+' Style reference is empty. Please try again.');
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
            if(!id)throw Error('A '+(ref.label.name.startsWith('Dream Blur')?'Dream Blur':ref.label.name.startsWith('Fisheye 2000')?'Fisheye 2000':'Hong Kong Nights')+' Style reference could not upload. Please try again.');
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
