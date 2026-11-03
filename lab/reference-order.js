// A saved Element supplies reference properties; a separate photo is the Base.
function restoreRole(ref){
  if(ref.role!=='base')return;
  ref.role=ref.nonBaseRole&&ref.nonBaseRole!=='base'?ref.nonBaseRole:
    ({characters:'identity',outfits:'outfit',locations:'room',props:'object'}[ref.elementCategory]||'none');
}
export function normalizeImageReferenceOrder(refs,mode){
  if(mode==='references'){
    refs.forEach(restoreRole);
    return mode;
  }
  const base=refs.find(ref=>!ref.elementId&&ref.role==='base')||refs.find(ref=>!ref.elementId);
  if(!base){refs.forEach(restoreRole);return 'references';}
  for(const ref of refs)if(ref!==base)restoreRole(ref);
  if(base.role!=='base')base.nonBaseRole=base.role||'none';
  base.role='base';
  const index=refs.indexOf(base);
  if(index>0){refs.splice(index,1);refs.unshift(base);}
  return 'base';
}
export function assignImageBase(refs,base){
  if(!refs.includes(base)||base.elementId)return false;
  refs.forEach(restoreRole);
  base.nonBaseRole=base.role||'none';
  base.role='base';
  normalizeImageReferenceOrder(refs,'base');
  return true;
}
