// Shared by the image UI and Worker so the preview matches the submitted prompt.
import {imageQualityGuidance,referenceRoleAdvisories} from './prompt-quality.js';
import {hongKongReferenceCount,hongKongReferenceError,hongKongReferenceGuidance} from './hong-kong-reference-policy.js';
export {referenceRoleAdvisories};
// Universal fallback for Base photos with no typed prompt and no Mood.
// This is art direction, not upscaling or a lock on the original composition.
export const AUTO_IMAGE_REINTERPRET_PROMPT = "Create an intentional reinterpretation of the supplied image, making it more compelling through clear art direction and a visibly different result. Respond to what is actually depicted; choose suitable framing, composition, lighting, color, atmosphere and detail without assuming a location, time of day or specific aesthetic. If people are present, preserve each individual as the same recognizable person, including distinctive facial features, skin tone, apparent age and defining physical traits; do not swap, merge or generically beautify identities. If no people are present, retain the defining characteristics of the main subject or object. You may change viewpoint, pose, styling, wardrobe, environment and mood where that meaningfully improves the result, while keeping the central subject and idea coherent. Honor explicitly assigned reference roles and user directions. Keep anatomy, optics, physical detail and textures convincing wherever relevant. Avoid generic AI gloss, artificial over-sharpening, unrelated subjects and sloppy reconstruction. Deliver a purposeful reinterpretation, not a near-identical copy.";
export const REFERENCE_ROLES = Object.freeze([
  ['none','General reference'],['base','Base image'],['identity','Identity'],
  ['pose','Pose only'],['body','Body'],['composition','Composition'],['detail','Detail'],
  ['outfit','Clothing'],['object','Object'],['room','Environment'],
  ['style','Style'],['lighting','Lighting'],['custom','Custom instruction']
]);
export const REFERENCE_TARGETS = Object.freeze({
  detail: [['hands','Hands'],['feet','Feet'],['hair','Hair'],['face','Face detail'],['skin','Skin texture']],
  outfit: [['full','Full outfit'],['top','Top'],['pants','Pants'],['dress','Dress'],['coat','Coat / jacket'],['shoes','Shoes'],['accessory','Accessory']],
  object: [['product','Product'],['furniture','Furniture'],['prop','Prop'],['accessory','Accessory']]
});
const descriptions = Object.freeze({
  base:'Use as the base photograph. Preserve its framing, camera, pose, scene and lighting except for properties explicitly changed by the other assigned roles or the requested edit.',
  composition:'Use only the spatial composition, perspective and framing. Do not copy subject identity, clothing or visual style.',
  pose:'Use only the body pose and limb placement. Do not copy identity, clothing, camera, lighting or background.',
  identity:'Use for the subject identity and consistent facial features. Do not copy pose, clothing, framing, lighting or background.',
  body:'Use only the subject body proportions, build and anatomy consistently. Do not copy facial identity, pose, clothing, framing, lighting or background.',
  room:'Use only the environment and architecture. Do not copy people, their identity, pose or clothing.',
  style:'Use only the photographic treatment, palette and texture. Do not copy subjects, pose, clothing or scene layout.',
  lighting:'Use only the light direction, softness and color. Do not copy identity, pose, clothing or background.',
  custom:'Use only for the specific instruction below.',
  none:'General visual reference. Use only details relevant to the requested image or its specific reference note. Do not replace the base identity, composition, clothing, pose or environment unless the prompt explicitly asks for that change.'
});
const compactDescriptions = Object.freeze({
  base:'Base photograph: preserve its framing, camera, pose, scene and lighting except explicit edits or assigned reference changes.',
  composition:'Use framing, perspective and layout only; not identity, clothing or visual style.',
  pose:'Use pose and limb placement only; not face, clothing, camera or background.',
  identity:'Match the subject’s facial identity and features; not pose, clothing, framing, light or background.',
  body:'Match body proportions and build only; not facial identity, pose, clothing or scene.',
  room:'Use architecture and environment only; not people, identity, pose or clothing.',
  style:'Use photographic treatment, palette and texture only; not people, pose, clothing or layout.',
  lighting:'Use light direction, softness and color only; not identity, pose or background.',
  custom:'Follow only the attached custom instruction.',
  none:'General visual reference: optional cues only; never override the Base, specified roles or requested edit.'
});
export function supportsReferenceGuidance(p){
  return p?.type==='image' && p.mode==='image' && (!p.engine || ['seedream','seedreamlite','gemini','gemini21','flash','kling','qwen3','krea3'].includes(p.engine));
}
export function normalizeReferenceLabel(x){
  const role=REFERENCE_ROLES.some(([id])=>id===x?.role)?x.role:'none';
  const label={name:String(x?.name||'').replace(/[\r\n]/g,' ').slice(0,180),role,note:String(x?.note||'').trim().slice(0,300)};
  // Persist the grouped Element's ID through provider quotes and History.
  if(/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(x?.elementId||''))){
    label.elementId=String(x.elementId).slice(0,40);
    label.elementName=String(x.elementName||'').replace(/[\r\n<>]/g,' ').trim().slice(0,70);
    if(['characters','locations','outfits','props'].includes(x.elementCategory))
      label.elementCategory=x.elementCategory;
    if(Number.isInteger(x.elementView)&&x.elementView>=0&&x.elementView<8)
      label.elementView=x.elementView;
    if(Number.isInteger(x.elementCount)&&x.elementCount>=1&&x.elementCount<=8)
      label.elementCount=x.elementCount;
  }
  if(REFERENCE_TARGETS[role])label.target=REFERENCE_TARGETS[role].some(([id])=>id===x?.target)?x.target:(role==='outfit'?'full':'');
  return label;
}
export function builtInMoodReferenceCount(settings={}){
  if(settings.moodId==='hong-kong-nights')return hongKongReferenceCount(settings);
  return settings.type==='image'&&settings.mode==='image'&&['berlin-rave','dreamcore','synthetic-romance'].includes(settings.moodId)&&['seedream','seedreamlite','gemini','gemini21'].includes(settings.engine)?3:0;
}
export function referenceGuidanceError(labels,settings={}){
  const hkError=hongKongReferenceError(settings,labels.length);if(hkError)return hkError;
  if(settings.moodId!=='hong-kong-nights'&&builtInMoodReferenceCount(settings)&&labels.length>7)return ({'dreamcore':'Dreamcore','synthetic-romance':'Synthetic Romance','berlin-rave':'Berlin Rave'}[settings.moodId])+' accepts up to 7 uploaded photos. Remove a photo or choose another mood.';
  if(labels.filter(r=>r.role==='base').length>1)return 'Choose one Base image. Assign the other references only the properties to copy.';
  if(labels.findIndex(r=>r.role==='base')>0)return 'Move the Base image to Reference 1. The first image also controls the automatic aspect ratio.';
  // General references are valid without manual labels. Explicit roles remain available for precision.
  for(let i=0;i<labels.length;i++){
    const r=labels[i];
    if(r.role==='detail'&&!r.target)return 'Choose a detail for Reference '+(i+1)+'.';
    if(r.role==='custom'&&!r.note?.trim())return 'Add a custom instruction for Reference '+(i+1)+'.';
  }
  return '';
}
export function canUseReferenceGuidance(labels){
  return !referenceGuidanceError(labels) && labels[0]?.role==='base' && labels.slice(1).some(r=>(r.role!=='none'&&r.role!=='base')||r.note?.trim());
}
export function referenceInstruction(raw,index){
  const r=normalizeReferenceLabel(raw),target=REFERENCE_TARGETS[r.role]?.find(([id])=>id===r.target)?.[1];
  let instruction=descriptions[r.role];
  if(r.role==='detail')instruction='Use only the '+(target||'selected detail').toLowerCase()+' as a localized visual reference. Match it to the final composition perspective and lighting. Do not copy the reference person, overall pose, clothing or background.';
  if(r.role==='outfit')instruction='Use only the '+(target||'full outfit').toLowerCase()+'. Fit it to the target subject and pose. Do not copy the wearer, face, body, camera or background.';
  if(r.role==='object')instruction='Use only the '+(target||'object').toLowerCase()+', including its shape and material. Match the target perspective and lighting. Do not copy people or background.';
  return 'Reference '+(index+1)+' ['+(REFERENCE_ROLES.find(([id])=>id===r.role)?.[1]||r.role)+(target?' / '+target:'')+']: '+instruction+(r.note?' Note: '+r.note:'');
}
function compactReferenceInstruction(raw,index){
  const r=normalizeReferenceLabel(raw),target=REFERENCE_TARGETS[r.role]?.find(([id])=>id===r.target)?.[1];
  // Curated Dream Blur Style notes already say OPTICS ONLY; don't repeat the generic instruction.
  if(r.role==='style'&&r.name.startsWith('Dream Blur style - '))
    return 'Reference '+(index+1)+' [Style optics / '+r.name.slice('Dream Blur style - '.length)+']: '+r.note;
  if(r.role==='style'&&r.name.startsWith('Fisheye 2000 style - '))
    return 'Reference '+(index+1)+' [Style optics / '+r.name.slice('Fisheye 2000 style - '.length)+']: '+r.note;
  let instruction=compactDescriptions[r.role];
  if(r.role==='detail')instruction='Use only the '+(target||'selected detail').toLowerCase()+' as a localized visual reference; match camera and lighting. Do not copy the wearer, overall pose, outfit or scene.';
  if(r.role==='outfit')instruction='Use only the '+(target||'full outfit').toLowerCase()+'. Fit it to the target subject and pose. Do not copy the wearer, face, body, camera or background.';
  if(r.role==='object')instruction='Use only the '+(target||'object').toLowerCase()+' and its shape/materials; match perspective and lighting. Do not copy people or scene.';
  return 'Reference '+(index+1)+' ['+(REFERENCE_ROLES.find(([id])=>id===r.role)?.[1]||r.role)+(target?' / '+target:'')+']: '+instruction+(r.note?' Note: '+r.note:'');
}
// Multiple photographs from one Element are viewpoints of one subject, not
// independent scene or identity requests. This is not trained LoRA fidelity.
export function elementContinuityGuidance(labels=[]){
  const groups=new Map();
  for(const label of labels){
    if(!label?.elementId)continue;
    const entry=groups.get(label.elementId);
    if(entry){entry.count++;continue;}
    groups.set(label.elementId,{name:label.elementName||'Element',
      category:label.elementCategory||'',count:1});
  }
  if(!groups.size)return '';
  return 'ELEMENT CONTINUITY: '+[...groups.values()].map(group=>{
    const subject=group.category==='locations'?'ONE actual place with consistent physical architecture and fixed furniture':
      group.category==='characters'?'ONE consistent person, facial identity and hair':
      group.category==='outfits'?'ONE outfit with consistent garments and materials':
      'ONE consistent object with fixed shape and markings';
    return '@'+group.name+': the '+group.count+' selected viewpoint'+(group.count===1?'':'s')+
      ' describe '+subject+'. Do not average different angles into a hybrid object, person or room.';
  }).join(' ');
}
function elementReferenceInstructions(labels,compact=false){
  const continuity=elementContinuityGuidance(labels);
  return [...(continuity?[continuity]:[]),
    ...labels.map((ref,index)=>compact?compactReferenceInstruction(ref,index):referenceInstruction(ref,index))];
}
export function compileImagePrompt(direction,labels=[],settings={}){
  // Keep authored Mood and user direction intact. Base edits use the established
  // concise role map. Text-only Dream Blur also needs that map for its four
  // automatic Style photographs, or the verbose no-Base wrapper alone can push
  // the complete provider prompt beyond 5,000 characters.
  // Custom references-only workflows keep their detailed role map.
  const roles=labels.map(normalizeReferenceLabel);
  // Also use the concise role map when a user supplies General/Identity photos
  // in References Only along with the four canonical Dream Blur optical photos.
  // Every custom role/note and the complete authored Mood are preserved.
  const curatedDreamBlurStyles=settings?.moodId==='dream-blur'&&
    roles.some(ref=>ref.role==='style'&&ref.name.startsWith('Dream Blur style - '));
  const curatedFisheyeStyles=settings?.moodId==='fisheye-2000'&&
    roles.some(ref=>ref.role==='style'&&ref.name.startsWith('Fisheye 2000 style - '));
  const compact=Boolean(settings?.moodId&&
    (hongKongReferenceCount(settings)||(settings.referenceMode!=='references'&&roles.some(ref=>ref.role==='base'))||curatedDreamBlurStyles||curatedFisheyeStyles));
  const original=compact?compileCompactUserImagePrompt(direction,labels):compileUserImagePrompt(direction,labels);
  let hkGuidance=hongKongReferenceCount(settings)?hongKongReferenceGuidance(labels.length,settings.engine==='seedreamlite'):'';
  const quality=imageQualityGuidance(direction,labels,settings,original.length+hkGuidance.length);
  const prompt=quality?[original,quality].filter(Boolean).join('\n\n'):original;
  const count=builtInMoodReferenceCount(settings);
  if(!count)return prompt;
  if(settings.moodId==='hong-kong-nights'){
    const limit=settings.engine==='seedreamlite'?3000:5000;
    if([prompt,hkGuidance].filter(Boolean).join('\n\n').length>limit)
      hkGuidance=hongKongReferenceGuidance(labels.length,true);
    return [prompt,hkGuidance].filter(Boolean).join('\n\n');
  }
  const numbers=Array.from({length:count},(_,i)=>labels.length+i+1).join(', ');
  const source=labels.some(r=>r.role==='base')
    ?'The user Base controls identity, body, pose, subject count, framing and location; honor explicitly requested changes.'
    :'These are not Base or identity images. Compose the requested subject and scene independently; user references retain their assigned roles.';
  if(settings.moodId==='synthetic-romance')return [prompt,'SYNTHETIC ROMANCE BUILT-IN REFERENCES '+numbers+': Anatomy, materials and film atmosphere only. Borrow articulated black-chrome anatomy, connected mechanisms, narrow optical reflections, fine 35mm grain, red practicals, cold-white spill, spatial haze and human tenderness. Apply the selected morphology and intensity to the requested subject. User Base and assigned roles control facial identity, subject count, proportions, pose, crop and camera; allow the mood-requested body reconstruction. These are not Base or identity images. Never import their faces, couple, kiss, embrace, poses, duplicated silhouettes or corridor layout. Follow explicit user direction and Lock Identity.'].filter(Boolean).join('\n\n');
  if(settings.moodId==='dreamcore')return [prompt,'DREAMCORE BUILT-IN REFERENCES '+numbers+': Style, optical diffusion and atmospheric materials only. Borrow luminous depth, broad soft halation, pearly reflections and physical mist; apply coherently to skin, clothing AND environment at selected intensity. Rough concrete stays rough. User sources and assigned roles control identity and camera, while the mood may recolor garments and rebuild incompatible local supports. Do not copy trains, pools, furniture, clouds, people or layouts. User instructions and assigned roles take priority.'].filter(Boolean).join('\n\n');
  return [prompt,'BERLIN RAVE BUILT-IN REFERENCES '+numbers+': outfit construction, compatible hair styling and flash ONLY, never identity. '+source+' At every intensity, even 100%, retain source face, skin tone, proportions and human/robot/cyborg anatomy. Dress the source body: robot plating, joints, cables and mechanical limbs remain; never turn them into skin. Match source presentation, not reference gender. Hair cues preserve hairline, texture and character design. Keep the main pose. Never import reference faces, bodies, characters, poses or DJ equipment. Explicit user instructions and assigned reference roles take priority.'].filter(Boolean).join('\n\n');
}
function compileUserImagePrompt(direction,labels=[]){
  const prompt=String(direction||'').trim();
  if(!labels.length)return prompt;
  const hasBase=labels.some(r=>r.role==='base');
  if(!hasBase)return ['REFERENCE MAP (same order as the attached images). Create a new image, not an edit of any one reference. There is no base image. Image order does not assign priority or composition. Honor each explicitly assigned property; treat General references as optional visual guidance only where relevant to the request. Identity defines facial features; Body defines physique and proportions, not pose. Compose the new scene, pose, clothing, framing and lighting according to the prompt unless a reference is explicitly assigned that property. Keep one consistent subject when the references show the same person.',...elementReferenceInstructions(labels),'REQUESTED IMAGE: '+(prompt||'Create one cohesive new image inspired by the supplied photographs. Use their relevant details and aesthetics as visual guidance, preserving any consistently depicted person when applicable. Compose the new scene independently.')].join('\n');
  const rules='REFERENCE MAP (same order as the attached images). Respect explicitly assigned properties. General references supply only cues relevant to the request; the Base supplies everything else; other roles change only their assigned property. A separate Pose role changes posture only. Identity references define the person; detail, clothing and object references do not replace that identity. Match the final lighting consistently. Follow explicit requested changes.';
  const hasExplicitRoles=labels.slice(1).some(ref=>ref.role&&ref.role!=='none'&&ref.role!=='base');
  const defaultDirection=hasExplicitRoles?'Apply the assigned reference properties to the base image, preserving everything else.':AUTO_IMAGE_REINTERPRET_PROMPT;
  return [rules,...elementReferenceInstructions(labels),'REQUESTED IMAGE: '+(prompt||defaultDirection)].join('\n');
}

function compileCompactUserImagePrompt(direction,labels=[]){
  const prompt=String(direction||'').trim();
  if(!labels.length)return prompt;
  const hasBase=labels.some(r=>r.role==='base');
  if(!hasBase){
    const rules='REFERENCE MAP (attached image order). There is no base image. Create a new composition from the direction. Each role provides only its assigned property; General images offer optional cues. Identity defines the face, Body defines body proportions, Pose defines posture. Keep one consistent subject across matching identity references; never import unrelated people or scenes.';
    return [rules,...elementReferenceInstructions(labels,true),'REQUESTED IMAGE: '+(prompt||'Create a cohesive new image inspired by the supplied photographs; follow assigned roles and compose the scene independently.')].join('\n');
  }
  const rules='REFERENCE MAP (attached image order). Base supplies everything else. Each supporting role changes only its named property: Identity sets the face, Body sets proportions, Pose sets posture. General references are optional cues. Respect explicit user edits and match the final perspective and light.';
  const hasExplicitRoles=labels.slice(1).some(ref=>ref.role&&ref.role!=='none'&&ref.role!=='base');
  const defaultDirection=hasExplicitRoles?'Apply the assigned reference properties to the base image; preserve everything else.':AUTO_IMAGE_REINTERPRET_PROMPT;
  return [rules,...elementReferenceInstructions(labels,true),'REQUESTED IMAGE: '+(prompt||defaultDirection)].join('\n');
}
