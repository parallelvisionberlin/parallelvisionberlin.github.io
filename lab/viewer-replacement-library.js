// Read-only adapters for the existing private Elements/photo-pack library.
// No analysis, training, provider generation or Image-deck mutation.
import {elementAttachmentIndices,elementReferenceNote} from './scene-library.js?v=20261107-guided-replace1';
export const REPLACEMENT_KINDS=Object.freeze([
  {id:'person',category:'characters',label:'Character',plural:'Characters',target:'person',role:'identity',icon:'person',placeholder:'Describe the new person…'},
  {id:'outfit',category:'outfits',label:'Outfit',plural:'Outfits',target:'outfit',role:'outfit',icon:'outfit',placeholder:'Describe the new outfit…'},
  {id:'object',category:'props',label:'Object',plural:'Objects',target:'object',role:'object',icon:'object',placeholder:'Describe the new object…'},
  {id:'location',category:'locations',label:'Location',plural:'Locations',target:'background',role:'room',icon:'location',placeholder:'Describe the new setting…'}
]);
export const replacementKind=id=>REPLACEMENT_KINDS.find(kind=>kind.id===id)||REPLACEMENT_KINDS[0];
export function viewerLibraryEntries(items,kindId,tab='saved'){
  const kind=replacementKind(kindId);
  return (Array.isArray(items)?items:[]).flatMap(item=>{
    if(!item||!Array.isArray(item.refs))return [];
    const scene=/^PVSCENE1\|(characters|outfits|props|locations)\|(.+)$/.exec(item.name||'');
    const category=item.category||scene?.[1];
    if(tab==='saved'){
      if(category!==kind.category)return [];
      return [{...item,category,title:item.title||scene?.[2]||item.name,refs:item.refs.filter(ref=>ref?.id)}];
    }
    if(category)return [];
    const roles=kindId==='person'?['identity','body']:[kind.role];
    const refs=item.refs.filter(ref=>ref?.id&&roles.includes(ref.role));
    return refs.length?[{...item,category:kind.category,title:item.name||'Saved references',refs,legacyPack:true}]:[];
  }).filter(item=>item.refs.length);
}
export async function loadViewerReference(item,kindId,{read,limit,isCurrent,direction=''}){
  const kind=replacementKind(kindId);
  if(item?.category!==kind.category)throw Error('Choose a matching saved reference.');
  const capacity=Math.max(0,limit-1); // The original photo always occupies the first slot.
  const indices=elementAttachmentIndices(item,direction,capacity);
  if(!indices.length)throw Error('This model has no space for a replacement reference.');
  const refs=[];
  // Bounded sequential reads: no burst of eight full-size private image downloads.
  for(const i of indices){
    if(!isCurrent())throw Error('The image session changed.');
    const ref=item.refs[i],file=await read(ref.id,(item.title||'Reference')+'-'+(i+1));
    if(!isCurrent())throw Error('The image session changed.');
    refs.push({file,id:ref.id,label:{...ref,name:ref.name||item.title,
      role:kindId==='person'&&ref.role==='body'?'body':kind.role,
      elementId:item.id,elementName:item.title,elementCategory:kind.category,elementView:i,elementCount:item.refs.length,
      note:elementReferenceNote(item,i)}});
  }
  return {name:item.title,kind:kindId,count:refs.length,total:item.refs.length,refs};
}
export function guidedHelpKey(account){return 'pv:replace-guidance:v1:'+String(account||'guest');}
export function guidanceLearned(storage,account){try{return storage?.getItem(guidedHelpKey(account))==='1';}catch{return false;}}
export function rememberGuidance(storage,account){try{storage?.setItem(guidedHelpKey(account),'1');}catch{}}
