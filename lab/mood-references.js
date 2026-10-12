import {compileImagePrompt,normalizeReferenceLabel} from './reference-guidance.js?v=20261010-reference-flow2&dreamcore=7&syntheticRefs=1&raveIdentity=1';

// These are photographic treatment references, never a replacement Base.
// Stable labels also prevent adding them twice when a saved job is reopened.
const HONG_KONG_REFERENCES=Object.freeze([
  {file:'01-traffic-grain.png',type:'image/png',note:'Borrow irregular grain structure and glowing small lights. Scale grain and contrast to the selected Mood intensity.'},
  {file:'02-city-haze.jpg',type:'image/jpeg',note:'Borrow emerald depth, dark silhouettes and luminous diffused highlights. Keep depth and contrast through the haze.'},
  {file:'03-shop-reflections.jpg',type:'image/jpeg',note:'Borrow luminous reflections and strong warm/cool light separation, adapted to the requested scene.'},
  {file:'04-warm-lamp.png',type:'image/png',note:'Borrow the blurred light-source halo, not an orange rim on people. Ignore screenshot arrows, buttons and interface marks.'}
].map(ref=>Object.freeze({...ref,url:'/lab/mood-references/hong-kong-nights/'+ref.file,
  label:Object.freeze({name:'Hong Kong Nights style - '+ref.file,role:'style',note:ref.note})})));

export function isMoodStyleReference(label){
  return label?.role==='style'&&HONG_KONG_REFERENCES.some(ref=>ref.label.name===label.name);
}

export function moodReferencePlan(settings){
  if(settings?.type!=='image'||settings.mode!=='image'||settings.moodId!=='hong-kong-nights'||!['seedream','gemini'].includes(settings.engine))
    return {settings,references:[]};
  const labels=(settings.referenceRoles||[]).map(normalizeReferenceLabel);
  const references=HONG_KONG_REFERENCES.filter(ref=>!labels.some(label=>label.role==='style'&&label.name===ref.label.name));
  if(labels.length+references.length>10)throw Error('Hong Kong Nights includes four Style references. Keep at most six of your own images, or choose another Mood.');
  const referenceRoles=[...labels,...references.map(ref=>({...ref.label}))];
  if(compileImagePrompt(settings.prompt,referenceRoles).length>5000)
    throw Error('Direction, Mood and Style references exceed 5,000 characters. Shorten the direction or optional notes.');
  return {settings:{...settings,referenceRoles,
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
