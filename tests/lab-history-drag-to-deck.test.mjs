// Mock-only test of the real Studio drag handlers. No accounts, uploads or paid jobs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync('lab/lab.js','utf8');
const html=readFileSync('lab/studio.html','utf8');
const start=source.indexOf("const HISTORY_IMAGE_DRAG_TYPE='application/x-pvlab-history-asset';");
const end=source.indexOf("$('image-composer-prompt').addEventListener('paste',e=>{",start);
assert.ok(start>0&&end>start,'History drag and composer drop handlers must exist');
const handlersSource=source.slice(start,end);
const assetId='43f0e1ea-cbb4-4ad5-a460-c2454794adca';

function fixture({model='seedream',available=true}={}){
  const listeners={},calls={references:[],sources:[],assets:[],notifications:[],updates:0};
  const original={name:'original.png',type:'image/png',width:1536,height:512,size:123456};
  const preview={name:'preview.webp',type:'image/webp',width:480,height:160,size:3456};
  let pending=Promise.resolve();
  const deck={classList:{add(){},remove(){}},addEventListener(name,fn){listeners[name]=fn;},
    contains(){return false;}};
  const $=id=>{
    assert.equal(id,'history');
    return {querySelectorAll(){return available?[{dataset:{asset:assetId,result:'true'}}]:[];}};
  };
  const notify=message=>calls.notifications.push(message);
  const action=fn=>{pending=Promise.resolve().then(fn);};
  const assetFile=async(id,name)=>{calls.assets.push([id,name]);return original;};
  const setImage=async(file,id)=>{calls.sources.push([file,id]);};
  const addReferences=async(files,ids)=>{calls.references.push([files,ids]);};
  const syncImageComposer=()=>{calls.updates++;};
  const bind=new Function('imageComposer','$','window','owner','busy','tool','imageEngine',
    'epoch','notify','action','assetFile','setImage','addReferences','syncImageComposer',handlersSource);
  bind(deck,$,{__PV_LAB_NATIVE__:0},true,false,'image',model,0,
    notify,action,assetFile,setImage,addReferences,syncImageComposer);
  const transfer=({internal=false}={})=>({
    types:internal?['Files','application/x-pvlab-history-asset']:['Files'],
    files:[preview],
    getData(type){return internal&&type==='application/x-pvlab-history-asset'?assetId:'';},
    dropEffect:'none'
  });
  const fire=(type,dataTransfer)=>{
    let prevented=false;
    listeners[type]({dataTransfer,preventDefault(){prevented=true;},relatedTarget:null});
    return prevented;
  };
  return {listeners,calls,original,preview,transfer,fire,settle:()=>pending};
}

test('Dragging History result prioritizes original over the 480 x 160 WebP',async()=>{
  const f=fixture(),dt=f.transfer({internal:true});
  assert.equal(f.fire('dragover',dt),true);
  assert.equal(dt.dropEffect,'copy');
  assert.equal(f.fire('drop',dt),true);
  await f.settle();
  assert.deepEqual(f.calls.assets,[[assetId,'history-image']]);
  assert.deepEqual(f.calls.references,[[[f.original],[assetId]]]);
  assert.equal(f.calls.updates,1);
  assert.equal(f.calls.references[0][0][0].width,1536);
});

test('Normal external image drops still enter the existing validation path',async()=>{
  const f=fixture(),dt=f.transfer();
  f.fire('drop',dt);
  await f.settle();
  assert.deepEqual(f.calls.assets,[]);
  assert.deepEqual(f.calls.references,[[[f.preview],undefined]]);
});

test('Unrecognized History IDs do not use previews or fetch originals',async()=>{
  const f=fixture({available:false});
  f.fire('drop',f.transfer({internal:true}));
  await f.settle();
  assert.deepEqual(f.calls.assets,[]);
  assert.deepEqual(f.calls.references,[]);
  assert.match(f.calls.notifications[0],/Refresh the gallery/);
});

test('Soul Pro receives the saved full-resolution base and its existing asset ID',async()=>{
  const f=fixture({model:'soulpro'});
  f.fire('drop',f.transfer({internal:true}));
  await f.settle();
  assert.deepEqual(f.calls.sources,[[f.original,assetId]]);
  assert.deepEqual(f.calls.references,[]);
});

test('Gallery has dragstart with saved ID and the Studio HTML loads the revised script',()=>{
  assert.match(source,/figure\.addEventListener\('dragstart',event=>\{/);
  assert.match(source,/event\.dataTransfer\.setData\(HISTORY_IMAGE_DRAG_TYPE,j\.outputId\)/);
  assert.match(html,/historyOriginalDrag=20261014-1/);
});
