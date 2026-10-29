import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
const sync=source.slice(source.indexOf('function syncReferenceRemovalState(){'),source.indexOf('function renderReferences(){'));
const render=source.slice(source.indexOf('function renderReferences(){'),source.indexOf('async function addReferences('));
test('a character inserted during loading becomes removable when loading finishes and removes all its views only',()=>{
  class Element{
    constructor(){this.children=[];this.dataset={};this.scrollTop=0;}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(fragment){this.children=fragment.children;}
    setAttribute(name,value){this[name]=value;}
  }
  const box=new Element(),count=new Element(),released=[];
  const document={createElement:()=>new Element(),createDocumentFragment:()=>new Element(),
    querySelectorAll:()=>box.children.map(item=>item.children[2].children[0])};
  const fixture=new Function('document','$','released',`
    let busy=true,imageReferenceMode='references';
    const references=[{elementId:'jenn',elementName:'Jenn',elementCategory:'characters'},
      {elementId:'jenn',elementName:'Jenn',elementCategory:'characters'},
      {elementId:'other',elementName:'Other',elementCategory:'characters'}];
    const referenceLimit=()=>10,usesReferenceGuidance=()=>false,syncDefaultRatio=()=>{},sceneLibrary={renderSelected(){}},
      closeInputPreview=()=>{},preferredImageReferenceMode=()=> 'base',closeReferenceIntent=()=>{},
      refreshInputPreview=()=>{},update=()=>{},releaseReference=r=>released.push(r.elementId);
    ${sync}\n${render}
    renderReferences();
    return {references,finish(){busy=false;syncReferenceRemovalState();}};
  `)(document,id=>id==='reference-list'?box:count,released);
  assert.equal(box.children.length,2);
  assert.equal(box.children[0].children[2].children[0].disabled,true);
  fixture.finish();
  const remove=box.children[0].children[2].children[0];
  assert.equal(remove.disabled,false,'Completion must re-enable the existing button without another render');
  assert.equal(remove['aria-label'],'Remove Character Jenn');
  remove.onclick();
  assert.deepEqual(fixture.references.map(r=>r.elementId),['other']);
  assert.deepEqual(released,['jenn','jenn']);
  assert.equal(box.children.length,1);
});
