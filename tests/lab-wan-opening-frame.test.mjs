import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  openingFrameSettings,
  attachVideoReferenceBrowserDrop,
  createVideoStartFrameMaker
} from '../lab/video-start-frame-maker.js';

test('opening-frame settings are Seedream references, not a Wan combined request',()=>{
  const settings=openingFrameSettings('Editorial opening portrait','9:16',[
    {name:'look.jpg',role:'base',note:'',target:''},
    {name:'coat.png',role:'outfit',note:'Use black leather'}
  ]);
  assert.equal(settings.type,'image');
  assert.equal(settings.engine,'seedream');
  assert.equal(settings.mode,'image');
  assert.equal(settings.referenceMode,'references');
  assert.equal(settings.aspectRatio,'9:16');
  assert.equal(settings.referenceRoles.length,2);
  assert.equal(settings.referenceRoles[0].role,'none');
  assert.equal(settings.referenceRoles[1].role,'outfit');
  assert.equal(settings.prompt,'Editorial opening portrait');
  assert.equal(settings.resolution,'1k');
  assert.throws(()=>openingFrameSettings('', '16:9',[]),/Add 1 to 10/);
  assert.throws(()=>openingFrameSettings('x'.repeat(5001),'16:9',[{name:'a',role:'none'}]),/5,000/);
  assert.throws(()=>openingFrameSettings('', 'source',[{name:'a',role:'none'}]),/aspect ratio/);
});

function node(){
  const handlers=new Map();
  const classes=new Set();
  return {
    value:'',hidden:false,disabled:false,textContent:'',open:false,
    classList:{
      add:key=>classes.add(key),remove:key=>classes.delete(key),
      contains:key=>classes.has(key),toggle:(key,val)=>val?classes.add(key):classes.delete(key)
    },
    addEventListener:(type,listener)=>handlers.set(type,listener),
    dispatch:(type,event={})=>handlers.get(type)?.(event),
    contains(el){return el===this;},
    setAttribute(name,value){this[name]=value;},
    removeAttribute(name){delete this[name];},
    showModal(){this.open=true;},
    close(){this.open=false;this.dispatch('close');},
    click(){this.onclick?.();}
  };
}
function flush(){return new Promise(done=>setTimeout(done,15));}

test('Wan browser drop accepts files outside the label, not duplicates inside',()=>{
  const doc=node(),target=node(),input=node();
  doc.body={classList:node().classList};
  doc.defaultView=node();
  let opened=0;input.click=()=>opened++;
  const file={name:'coat.jpg',type:'image/jpeg'};
  const files=[],dragTypes=['Files'];
  const events={};
  doc.addEventListener=(name,handler)=>{events[name]=handler;};
  const drop=attachVideoReferenceBrowserDrop({
    doc,target,input,enabled:()=>true,onFiles:list=>files.push(...list)
  });
  let prevented=0;
  const event={dataTransfer:{types:dragTypes,files:[file]},
    target:{},preventDefault(){prevented++;}};
  events.dragover(event);
  assert.ok(doc.body.classList.contains('pv-video-reference-browser-drag'));
  events.drop(event);
  assert.equal(prevented,2);
  assert.deepEqual(files,[file]);
  assert.equal(doc.body.classList.contains('pv-video-reference-browser-drag'),false);
  target.contains=el=>el===target;
  events.drop({...event,target});
  assert.equal(files.length,1,'the existing label handler handles drops directly on the label');
  target.dispatch('keydown',{target,key:'Enter',preventDefault(){}});
  assert.equal(opened,1,'keyboard works as click-to-browse');
  drop.clear();
});

test('Seedream quote requires explicit confirmation; approved image switches to Wan Start mode',async()=>{
  const ids=[
    'start-frame-dialog','create-start-frame','start-frame-direction','start-frame-aspect',
    'start-frame-review','start-frame-quote-info','start-frame-price',
    'start-frame-price-note','start-frame-confirm','start-frame-status',
    'start-frame-result','start-frame-result-image','start-frame-apply',
    'start-frame-close'
  ];
  const nodes=Object.fromEntries(ids.map(id=>[id,node()]));
  nodes['start-frame-aspect'].value='16:9';
  nodes['start-frame-result'].hidden=true;
  const calls=[],accepted=[],used=[];
  const refs=[{
    file:{name:'outfit.jpg',size:1000,lastModified:1},
    url:'blob:outfit',role:'outfit',note:'Use the garment',
    target:'full',width:1200,height:800
  }];
  const api=async(path,options)=>{
    calls.push({path,options});
    if(path==='/api/quotes')return {
      id:'quote1',expiresAt:Date.now()+100000,creditCost:30,maxUsd:.2,
      settings:{type:'image',engine:'seedream',mode:'image',referenceSourceIds:['ref1']}
    };
    if(path==='/api/jobs')return {job:{id:'job1',status:'queued',settings:{type:'image'}}};
    throw Error('Unexpected API call '+path);
  };
  const maker=createVideoStartFrameMaker({
    element:id=>nodes[id],
    context:()=>({
      engine:'wan',references:refs,allowed:true,providerReady:true,busy:false,aspectRatio:'16:9'
    }),
    session:()=>1,active:v=>v===1,
    action:async fn=>{await fn();},
    ensureReferences:async()=>['ref1'],
    prepareQuoteInputs:async i=>i,
    referenceRoles:()=>[{name:'outfit.jpg',role:'outfit',note:'Use garment',target:'full'}],
    compilePrompt:p=>p.prompt||'Editorial opening with the attached reference.',
    validateReferences:()=>'',api,
    onAccepted:job=>accepted.push(job.id),
    loadPreview:async()=>new Blob(['preview'],{type:'image/png'}),
    useFrame:async job=>used.push(job.outputId),
    imageQueueAvailable:()=>true,
    describePrice:q=>q.creditCost+' credits'
  });
  nodes['create-start-frame'].click();
  assert.equal(nodes['start-frame-dialog'].open,true);
  assert.equal(nodes['start-frame-direction'].value,'','Video motion direction is not copied to the Seedream image prompt');
  nodes['start-frame-direction'].value='Black leather runway opening';
  nodes['start-frame-direction'].dispatch('input');
  nodes['start-frame-review'].click();
  await flush();
  assert.deepEqual(calls.map(c=>c.path),['/api/quotes'],'price check must not start a paid job');
  assert.equal(calls[0].options.body.settings.engine,'seedream');
  assert.equal(calls[0].options.body.settings.referenceMode,'references');
  assert.equal(calls[0].options.body.settings.prompt,'Black leather runway opening');
  assert.equal(nodes['start-frame-price'].textContent,'30 credits');
  nodes['start-frame-confirm'].click();
  await flush();
  assert.deepEqual(calls.map(c=>c.path),['/api/quotes','/api/jobs']);
  assert.deepEqual(accepted,['job1']);
  assert.equal(nodes['start-frame-result'].hidden,true);
  maker.onJob({id:'job1',status:'completed',outputId:'seedream-img1',settings:{type:'image'}});
  await flush();
  assert.equal(nodes['start-frame-result'].hidden,false);
  assert.match(nodes['start-frame-result-image'].src,/^blob:/);
  nodes['start-frame-apply'].click();
  await flush();
  assert.deepEqual(used,['seedream-img1']);
  assert.equal(nodes['start-frame-dialog'].open,false);
  assert.equal(calls.length,2,'Wan generation must never happen automatically');
  maker.clear();
});

test('Studio includes a real visible drop-and-browse input and a separate price confirmation',()=>{
  const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(html,/id="reference-drop"[^>]*>.*<span>Upload images<\/span>/);
  assert.match(html,/id="reference-images" type="file" multiple/);
  assert.match(html,/id="start-frame-quote-info"/);
  assert.match(html,/id="start-frame-confirm"/);
  assert.match(html,/id="start-frame-apply"/);
  assert.match(js,/frameMaker=createVideoStartFrameMaker/);
  assert.match(js,/frameMaker\?\.onJob\(job\)/);
  assert.match(js,/attachVideoReferenceBrowserDrop/);
  assert.match(js,/tool==='image'&&imageEngine==='zspicy'/);
  assert.match(js,/setMode\('start'\)/);
});
