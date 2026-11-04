import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {styleVideoHistoryCard} from '../lab/video-history-cards.js';

function fixture(status){
  const nodes=new Map();
  const doc={createElement(tag){const classes=new Set();return {tag,children:[],className:'',textContent:'',classList:{add(...names){names.forEach(n=>classes.add(n));},remove(n){classes.delete(n);},toggle(n,on){if(on)classes.add(n);else classes.delete(n);}},setAttribute(){},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},addEventListener(type,fn){this[type]=fn;}};}};
  nodes.set('.cardmeta',doc.createElement('div'));nodes.set('.history-no-result',doc.createElement('div'));
  const card=doc.createElement('article');card.ownerDocument=doc;card.querySelector=s=>nodes.get(s)||null;
  const job={status,createdAt:'2026-11-04T12:00:00Z',error:'SpicyAPI content_rejected: copyrighted audio. Turn off audio. Charge refunded.',settings:{type:'video',duration:5,resolution:'720p'}};
  return {card,job,meta:nodes.get('.cardmeta'),empty:nodes.get('.history-no-result')};
}
test('failed cards summarize rejection without duplicating raw provider instructions; details is read-only',()=>{
  const f=fixture('failed');let opened=0;
  const original=JSON.stringify(f.job);
  styleVideoHistoryCard(f.card,f.job,{modelLabel:'Seedance 2.5',openDetails(){opened++;}});
  assert.equal(f.meta.textContent,'Seedance 2.5 · 5s · 720p');
  assert.equal(f.empty.children[1].textContent,'Generation failed');
  assert.equal(f.empty.children[2].textContent,'The provider rejected this request.');
  assert.doesNotMatch(f.empty.children.map(n=>n.textContent).join(' '),/Turn off|refunded|SpicyAPI/);
  const view=f.empty.children.at(-1);assert.equal(view.textContent,'View details');
  let prevented=false,stopped=false;view.click({preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
  assert.equal(opened,1);assert.ok(prevented&&stopped);assert.equal(JSON.stringify(f.job),original);
});
test('refund notice comes only from existing account-aware credit information',()=>{
  const f=fixture('failed');styleVideoHistoryCard(f.card,f.job,{creditNotice:'Credits restored'});
  assert.equal(f.empty.children.find(n=>n.className==='pv-video-history-credit').textContent,'Credits restored');
  const uncertain=fixture('uncertain');styleVideoHistoryCard(uncertain.card,uncertain.job,{creditNotice:'Request pending review'});
  assert.equal(uncertain.empty.children.length,0,'Uncertain status keeps the existing caution, without claiming failure or refund');
});
test('all active statuses keep their phase and have no retry or refund action',()=>{
  for(const [status,title] of Object.entries({submitting:'Submitting',queued:'Queued',running:'Generating',saving:'Saving'})){
    const f=fixture(status);styleVideoHistoryCard(f.card,f.job,{});
    assert.equal(f.empty.children[1].textContent,title);
    assert.equal(f.empty.children[2].textContent,'Your video will appear here.');
    assert.equal(f.empty.children.length,3);
  }
});
test('Video-only integration leaves shared Image and Assets render paths alone',()=>{
  const lab=readFileSync('lab/lab.js','utf8');
  assert.match(lab,/if\(tool==='video'&&!assetLibrary\?\.active\(\)&&j\.settings\.type==='video'\)styleVideoHistoryCard/);
  assert.match(lab,/openDetails:\(\)=>showVideoHistoryRecord\(j,\{play:false,reveal:true\}\)/);
});
test('existing inspector can open failed and pending jobs without saved dimensions',()=>{
  const lab=readFileSync('lab/lab.js','utf8');
  const start=lab.indexOf('function displaySavedVideoRatio(job){');
  const end=lab.indexOf('\nfunction ',start+1);
  const ratio=new Script('('+lab.slice(start,end)+')').runInNewContext({$:()=>({}),resultId:null});
  for(const status of ['failed','queued','running','uncertain'])assert.equal(ratio({status,settings:{aspectRatio:'16:9'}}),'16:9');
  assert.equal(ratio({outputId:'v',settings:{aspectRatio:'auto',galleryDimensions:{assetId:'v',width:1080,height:1920}}}),'9:16');
});
