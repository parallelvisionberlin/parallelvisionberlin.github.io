// Replacement-only prompt assembly. All saved photos and authored notes remain intact.
// Use one shared set of editing rules instead of repeating a paragraph for every photo.
export function compactReviewedReplacementPrompt(direction, roles=[], settings={}, scopeGuidance='') {
  if(!settings?.replacement) return null;
  const groups=new Map();
  for(const r of roles){
    if(!r?.elementId)continue;
    if(!groups.has(r.elementId))
      groups.set(r.elementId,{name:r.elementName||'saved element',category:r.elementCategory||'',count:0});
    groups.get(r.elementId).count++;
  }
  const groupLines=[...groups.values()].map(g=>
    g.name+' ('+g.count+' views): '+(g.category==='characters'?'one consistent person':
    g.category==='outfits'?'one consistent outfit':g.category==='props'?'one consistent object':'one consistent place')+
    ', not independent subjects.');
  const labels=roles.map((r,i)=>{
    const role=r?.role||'none';
    const name=role==='none'?'General':role.charAt(0).toUpperCase()+role.slice(1);
    const target=r?.target?' / '+r.target:'';
    return 'Reference '+(i+1)+' ['+name+target+']'+(r?.note?': '+r.note:'');
  });
  const request=String(direction||'').trim();
  const parts=[
    'REVIEWED BASE EDIT. Reference 1 is the original photograph; preserve its camera, lighting, composition, pose, contact points and other subjects. Edit only the reviewed selection.',
    ...groupLines,
    'REFERENCE MAP (same order as supplied photographs):',
    ...labels,
    'REQUESTED EDIT: '+(request||'Apply the assigned replacement within the selected region.'),
    scopeGuidance
  ];
  return parts.filter(Boolean).join('\n');
}
