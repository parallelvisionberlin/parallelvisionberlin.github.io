// Shared by the image UI and Worker so the preview matches the submitted prompt.
export const REFERENCE_ROLES = Object.freeze([
  ['none','General reference'],['base','Base image'],['composition','Composition'],
  ['pose','Pose only'],['identity','Identity'],['body','Body'],['detail','Detail'],
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
export function supportsReferenceGuidance(p){
  return p?.type==='image' && p.mode==='image' && (!p.engine || ['seedream','gemini','flash','kling'].includes(p.engine));
}
export function normalizeReferenceLabel(x){
  const role=REFERENCE_ROLES.some(([id])=>id===x?.role)?x.role:'none';
  const label={name:String(x?.name||'').replace(/[\r\n]/g,' ').slice(0,180),role,note:String(x?.note||'').trim().slice(0,300)};
  if(REFERENCE_TARGETS[role])label.target=REFERENCE_TARGETS[role].some(([id])=>id===x?.target)?x.target:(role==='outfit'?'full':'');
  return label;
}
export function referenceGuidanceError(labels){
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
export function compileImagePrompt(direction,labels=[]){
  const prompt=String(direction||'').trim();
  if(!labels.length)return prompt;
  const hasBase=labels.some(r=>r.role==='base');
  if(!hasBase)return ['REFERENCE MAP (same order as the attached images). Create a new image, not an edit of any one reference. There is no base image. Image order does not assign priority or composition. Honor each explicitly assigned property; treat General references as optional visual guidance only where relevant to the request. Identity defines facial features; Body defines physique and proportions, not pose. Compose the new scene, pose, clothing, framing and lighting according to the prompt unless a reference is explicitly assigned that property. Keep one consistent subject when the references show the same person.',...labels.map(referenceInstruction),'REQUESTED IMAGE: '+(prompt||'Create one cohesive new image inspired by the supplied photographs. Use their relevant details and aesthetics as visual guidance, preserving any consistently depicted person when applicable. Compose the new scene independently.')].join('\n');
  const rules='REFERENCE MAP (same order as the attached images). Respect explicitly assigned properties. General references supply only cues relevant to the request; the Base supplies everything else; other roles change only their assigned property. A separate Pose role changes posture only. Identity references define the person; detail, clothing and object references do not replace that identity. Match the final lighting consistently. Follow explicit requested changes.';
  return [rules,...labels.map(referenceInstruction),'REQUESTED IMAGE: '+(prompt||'Create a thoughtful variation of the Base photograph with the main subject recognizable and the overall composition coherent. Integrate the relevant cues from other reference images without arbitrarily replacing the subject or scene.')].join('\n');
}

