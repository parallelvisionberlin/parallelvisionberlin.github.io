// Shared by the image UI and Worker so the preview matches the submitted prompt.
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
  base:'Base photograph: preserve its framing, camera, pose, scene and lighting except explicit edits or assigned reference changes.',
  composition:'Use framing, perspective and layout only; not identity, clothing or visual style.',
  pose:'Use pose and limb placement only; not face, clothing, camera or background.',
  identity:'Match the subject’s facial identity and features; not pose, clothing, framing, light or background.',
  body:'Match body proportions and build only; not facial identity, pose, clothing or scene.',
  room:'Use architecture and environment only; not people, identity, pose or clothing.',
  style:'Use photographic treatment, palette and texture only; not people, pose, clothing or layout.',
  lighting:'Use light direction, softness and color only; not identity, pose or background.',
  custom:'Follow only the attached custom instruction.',
  none:'General visual cues only where relevant; never override the Base, specified roles or requested edit.'
});
export function supportsReferenceGuidance(p){
  return p?.type==='image' && p.mode==='image' && (!p.engine || ['seedream','seedreamlite','gemini','flash','kling','qwen3'].includes(p.engine));
}
export function normalizeReferenceLabel(x){
  const role=REFERENCE_ROLES.some(([id])=>id===x?.role)?x.role:'none';
  const label={name:String(x?.name||'').replace(/[\r\n]/g,' ').slice(0,180),role,note:String(x?.note||'').trim().slice(0,300)};
  if(REFERENCE_TARGETS[role])label.target=REFERENCE_TARGETS[role].some(([id])=>id===x?.target)?x.target:(role==='outfit'?'full':'');
  return label;
}
export function builtInMoodReferenceCount(settings={}){
  return settings.type==='image'&&settings.mode==='image'&&['berlin-rave','dreamcore','synthetic-romance'].includes(settings.moodId)&&['seedream','seedreamlite','gemini'].includes(settings.engine)?3:0;
}
export function referenceGuidanceError(labels,settings={}){
  if(builtInMoodReferenceCount(settings)&&labels.length>7)return ({'dreamcore':'Dreamcore','synthetic-romance':'Synthetic Romance','berlin-rave':'Berlin Rave'}[settings.moodId])+' accepts up to 7 uploaded photos. Remove a photo or choose another mood.';
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
  if(r.role==='detail')instruction='Use only the '+(target||'selected detail').toLowerCase()+' as a localized visual reference; match camera and lighting. Do not copy the wearer, overall pose, outfit or scene.';
  if(r.role==='outfit')instruction='Use only the '+(target||'full outfit').toLowerCase()+'; fit it to the target subject and pose. Do not copy the wearer, face, body, camera or background.';
  if(r.role==='object')instruction='Use only the '+(target||'object').toLowerCase()+' and its shape/materials; match perspective and lighting. Do not copy people or scene.';
  return 'Reference '+(index+1)+' ['+(REFERENCE_ROLES.find(([id])=>id===r.role)?.[1]||r.role)+(target?' / '+target:'')+']: '+instruction+(r.note?' Note: '+r.note:'');
}
export function compileImagePrompt(direction,labels=[],settings={}){
  const prompt=compileUserImagePrompt(direction,labels);
  const count=builtInMoodReferenceCount(settings);
  if(!count)return prompt;
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
  if(!hasBase){
    const rules='REFERENCE MAP (attached image order). There is no base image. Create a new composition from the direction. Each role provides only its assigned property; General images offer optional cues. Identity defines the face, Body defines body proportions, Pose defines posture. Keep one consistent subject across matching identity references; never import unrelated people or scenes.';
    return [rules,...labels.map(referenceInstruction),'REQUESTED IMAGE: '+(prompt||'Create one coherent new image from the assigned roles; compose the scene independently.')].join('\n');
  }
  const rules='REFERENCE MAP (attached image order). Base supplies everything else. Each supporting role changes only its named property: Identity sets the face, Body sets proportions, Pose sets posture. General references are optional cues. Respect explicit user edits and match the final perspective and light.';
  const hasExplicitRoles=labels.slice(1).some(ref=>ref.role&&ref.role!=='none'&&ref.role!=='base');
  const defaultDirection=hasExplicitRoles?'Apply the assigned reference properties to the base image; preserve everything else.':'Create a thoughtful variation of the Base photograph; keep its subject and scene recognizable and borrow only relevant reference cues.';
  return [rules,...labels.map(referenceInstruction),'REQUESTED IMAGE: '+(prompt||defaultDirection)].join('\n');
}
