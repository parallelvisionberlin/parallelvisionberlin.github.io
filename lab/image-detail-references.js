import {isMoodStyleReference} from './mood-references.js?v=20261016-internal-moods-v2&fisheye=20261020v1&hkRefs=20261022three1';

// Public result inspector and reuse actions must never treat a preset's Style
// photographs as user inputs. Stored generation records remain untouched.
export function visibleImageReferenceIds(job){
  const settings=job?.settings||{};
  const refs=Array.isArray(settings.referenceSourceIds)?settings.referenceSourceIds:[];
  const labels=Array.isArray(settings.referenceRoles)?settings.referenceRoles:[];
  const internal=new Set(refs.filter((id,i)=>isMoodStyleReference(labels[i])));
  const ids=[job?.sourceId,...refs];
  return ids.filter((id,i)=>typeof id==='string'&&id&&!internal.has(id)&&ids.indexOf(id)===i);
}
