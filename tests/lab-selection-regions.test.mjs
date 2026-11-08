import test from 'node:test';
import assert from 'node:assert/strict';
import {samForegroundCandidate,samBackgroundCandidate,samClickCandidate,preferSamCandidate} from '../lab/sam-click-mask.js';
const w=100,h=80;
function pixels(rects){const d=new Uint8ClampedArray(w*h*4);for(let i=3;i<d.length;i+=4)d[i]=255;for(const [x,y,ww,hh] of rects)for(let yy=y;yy<y+hh;yy++)for(let xx=x;xx<x+ww;xx++){const i=(yy*w+xx)*4;d[i]=d[i+1]=d[i+2]=255;}return d;}
const person=r=>samForegroundCandidate(pixels(r),w,h,{scope:'person'});
test('Location selects the complete environment while protecting both people, not just one wall',()=>{
 const left=person([[12,10,25,65]]),right=person([[60,10,27,65]]);
 const b=samBackgroundCandidate([left,right]);
 for(const [x,y] of [[0,0],[99,79],[50,30],[5,70]])assert.equal(b.values[y*w+x],255,'all background surfaces are editable');
 for(const [x,y] of [[25,25],[25,60],[70,25],[70,60]])assert.equal(b.values[y*w+x],0,'each detected person is protected');
});
test('Explicit background composition retains the environment visible through foreground holes',()=>{
 const d=pixels([[12,10,25,65]]);for(let y=30;y<40;y++)for(let x=20;x<25;x++){const i=(y*w+x)*4;d[i]=d[i+1]=d[i+2]=0;}
 const b=samBackgroundCandidate([samForegroundCandidate(d,w,h,{scope:'person'})]);
 assert.equal(b.values[35*w+22],255);assert.equal(b.values[20*w+22],0);
});
test('Location refuses missing, truncated, full or mismatched people masks instead of selecting over people',()=>{
 const p=person([[12,10,25,65]]);
 assert.throws(()=>samBackgroundCandidate([]),/safely identify/);
 assert.throws(()=>samBackgroundCandidate([p,null]),/safely identify/);
 assert.throws(()=>samBackgroundCandidate(Array(8).fill(p)),/safely identify/);
 assert.throws(()=>samBackgroundCandidate([p,{...p,width:90}]),/match/);
 assert.equal(samForegroundCandidate(pixels([[0,0,w,h]]),w,h,{scope:'person'}),null);
});
test('Outfit resolves the clicked silver-top region even when another garment arrives first',()=>{
 const right=pixels([[60,20,27,50]]),left=pixels([[12,30,25,25]]),click={x:25,y:40};
 let best=null;for(const d of [right,left])best=preferSamCandidate(best,samClickCandidate(d,w,h,click,{scope:'clothing'}));
 assert.ok(best);assert.equal(best.values[40*w+25],255);assert.equal(best.values[40*w+70],0);
 assert.equal(best.values[0],0);
});
