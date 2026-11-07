// Scope is explicit user intent; mask geometry can only suggest caution, not identify anatomy.
export const CHARACTER_SCOPES = Object.freeze([
  {id:'face',label:'Face',target:'face area',prompt:'face'},
  {id:'person',label:'Whole person',target:'person',prompt:'person'}
]);
export function selectionTarget(kind,characterScope='face') {
  if(kind==='person')return characterScope==='person'?'person':'face';
  if(kind==='outfit')return 'clothing';
  return ''; // Object and background keep point selection, not ambiguous text prompts.
}
export function replacementScope(kind,characterScope='face') {
  return kind==='person'?(characterScope==='person'?'person':'face'):kind;
}
export function scopeInstruction(kind,characterScope='face',brush=false) {
  if(brush)return 'Brush over the area you want to replace. Erase protects details.';
  if(kind==='person'&&characterScope==='face')return 'Click the face you want to replace.';
  if(kind==='person')return 'Click the person’s torso, then check that the full visible person is purple.';
  if(kind==='outfit')return 'Click the clothing you want to replace.';
  if(kind==='object')return 'Click the object you want to replace.';
  return 'Select the background to replace, keeping people outside the purple area.';
}
export function selectionAdvisory(kind,characterScope,metrics) {
  if(!metrics||kind!=='person')return null;
  if(characterScope==='person'&&metrics.boxHeight<0.42)
    return {kind:'small',text:'The purple selection looks small for a whole person. Click the torso again or expand the area with Brush. Only purple pixels can change.'};
  if(characterScope==='face'&&metrics.boxHeight>0.58)
    return {kind:'large',text:'This selection extends beyond a typical face area. Erase unwanted areas or switch to Whole person. Only purple pixels can change.'};
  return null;
}
