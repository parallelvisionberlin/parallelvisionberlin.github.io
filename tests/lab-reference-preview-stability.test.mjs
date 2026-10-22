// Mock-only regression: actual Image Studio composer renderer, no account/provider requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('lab/lab.js','utf8');
const html=readFileSync('lab/studio.html','utf8');
const css=readFileSync('lab/studio.css','utf8');
const discreet=readFileSync('lab/image-discreet.css','utf8');
const begin=source.indexOf('let composerReferenceRenderKey=null;');
const finish=source.indexOf('// Keep even very long pasted prompts',begin);
assert.ok(begin>0&&finish>begin,'Actual composer renderer must be found');
const renderer=source.slice(begin,finish);
class Node {
  constructor(name){
    this.name=name;this.children=[];this.attributes={};this.events={};this.dataset={};
    this.className='';this.hidden=false;this.draggable=false;this.options=[];
    const classes=new Set();
    this.classList={
      add:n=>classes.add(n),
      remove:n=>classes.delete(n),
      toggle:(n,v)=>{if(v===undefined?!classes.has(n):v)classes.add(n);else classes.delete(n);},
      contains:n=>classes.has(n)
    };
  }
  set src(value){this._src=value;this.srcWrites=(this.srcWrites||0)+1;}
  get src(){return this._src;}
  get childElementCount(){return this.children.length;}
  setAttribute(name,value){this.attributes[name]=value;}
  hasAttribute(name){return Object.hasOwn(this.attributes,name);}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];this.rebuilds=(this.rebuilds||0)+1;}
  add(option){this.options.push(option);}
  addEventListener(event,listener){this.events[event]=listener;}
  querySelector(selector){
    const className=selector.slice(1);
    const scan=parent=>{
      for(const child of parent.children){
        if(child.className.split(/\s+/).includes(className))return child;
        const descendant=scan(child);if(descendant)return descendant;
      }
      return null;
    };
    return scan(this);
  }
}
function fixture(){
  const tray=new Node('div');
  const first={file:{name:'reference.png'},role:'base',thumbUrl:'blob:small',url:'blob:preview'};
  const ctx={
    $:id=>{assert.equal(id,'image-composer-references');return tray;},
    document:{createElement:name=>new Node(name)},
    Option:class{constructor(text,value){this.text=text;this.value=value;}},
    references:[first],sourceUrl:null,imageEngine:'seedream',imageReferenceMode:'base',
    tool:'image',busy:false,autoPreview:null,
    usesReferenceGuidance:()=>true,isSoul2:()=>false,isReinterpret:()=>false,
    referencesOnly:()=>false,REFERENCE_ROLES:[['none','General'],['identity','Identity']]
  };
  const sync=new Function('ctx',`with(ctx){${renderer}\nreturn syncImageReferences;}`)(ctx);
  return {sync,tray,ctx,first};
}
test('Composer preserves image DOM and source during repeated updates and upload locks',()=>{
  const f=fixture();f.sync();const tile=f.tray.children[0],image=tile.children[0];
  assert.equal(image.src,'blob:small');const rebuilds=f.tray.rebuilds;
  f.sync();f.ctx.busy=true;f.sync();
  assert.equal(f.tray.rebuilds,rebuilds);
  assert.strictEqual(f.tray.children[0],tile);
  assert.strictEqual(tile.children[0],image);
  assert.equal(tile.draggable,false);
  assert.equal(tile.querySelector('.composer-reference-remove').disabled,true);
  f.ctx.busy=false;f.sync();
  assert.equal(tile.draggable,true);
  assert.equal(tile.querySelector('.composer-reference-remove').disabled,false);
  assert.equal(image.srcWrites,1,'The image source was not assigned again');
  f.first.role='identity';f.sync();
  assert.ok(f.tray.rebuilds>rebuilds,'A deliberate reference edit still rebuilds controls');
});
test('Thumbnail error falls back once and ends with a readable unavailable state',()=>{
  const f=fixture();f.sync();const tile=f.tray.children[0],image=tile.children[0];
  image.events.error();assert.equal(image.src,'blob:preview');
  image.events.error();
  assert.equal(image.hidden,true);
  assert.equal(tile.classList.contains('preview-unavailable'),true);
});
test('Discreet concealment and nonblinking disabled header are preserved',()=>{
  assert.match(discreet,/#image-composer-references img/);
  assert.match(discreet,/content:'HIDDEN'/);
  assert.match(css,/#studio-header \.tool-switch \.tool-tab:disabled\{opacity:1/);
  // Require the current cache-versioned module without pinning a historical release ID.
  const modules=[...html.matchAll(/<script\b[^>]*type="module"[^>]*src="([^"]+)"/g)]
    .map(match=>new URL(match[1].replaceAll('&amp;','&'),'https://pvlab.studio/studio'))
    .filter(url=>url.pathname==='/lab.js');
  assert.equal(modules.length,1,'Studio loads the tested Lab module exactly once');
  assert.ok(modules[0].searchParams.get('v')?.trim(),'The module retains an explicit cache revision');
  assert.match(source,/composerReferenceRenderKey/,'The loaded module retains stable reference rendering');

});
