import test from 'node:test';
import assert from 'node:assert/strict';
import {startHomeMood} from '../lab/mood-home.js';

const photo=new File(['photograph'],'reference.png',{type:'image/png'});
const handoffId='19b30af6-c009-4f46-b86c-e1afc7b4f429';

test('a photo reaches the creator only after its local handoff finishes',async()=>{
  let finishSave,received,visited;
  const saving=new Promise(resolve=>{finishSave=resolve;});
  const task=startHomeMood([photo],{
    save:input=>{received=input;return saving;},
    navigate:destination=>{visited=destination;}
  });
  assert.equal(visited,undefined);
  assert.equal(received.file,photo);
  assert.equal(received.prompt,'');
  assert.equal(received.generation,undefined,'dropping an image never authorizes generation');
  finishSave(handoffId);
  const destination=await task;
  assert.equal(visited,destination);
  const url=new URL(destination,'https://parallelvisionlabel.com/lab/');
  assert.equal(url.pathname,'/lab/mood-creator.html');
  assert.equal(url.searchParams.get('handoff'),handoffId);
  assert.equal(url.searchParams.has('base'),false,'a personal Mood needs no curated base');
  assert.equal(url.hash,'#workspace');
});

test('invalid and multiple files stay on the homepage without saving anything',async()=>{
  const never=()=>assert.fail('Invalid input must not be stored or navigate');
  const dependencies={save:never,navigate:never};
  for(const files of [[],[photo,photo],[new File(['video'],'clip.mp4',{type:'video/mp4'})],
    [new File([],'empty.jpg',{type:'image/jpeg'})],[{type:'image/png',size:20*1024*1024+1}]]){
    await assert.rejects(startHomeMood(files,dependencies));
  }
});

test('a failed transfer keeps the visitor and photograph on the current page',async()=>{
  await assert.rejects(startHomeMood([photo],{
    save:async()=>{throw Error('Storage unavailable');},
    navigate:()=>assert.fail('Must not navigate after a failed handoff')
  }),/Storage unavailable/);
  await assert.rejects(startHomeMood([photo],{
    save:async()=>null,navigate:()=>assert.fail('Must not navigate without a handoff')
  }),/could not be prepared/);
});
