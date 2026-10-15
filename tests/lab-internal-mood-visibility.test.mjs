import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {visibleImageReferenceIds} from '../lab/image-detail-references.js';

const base='user-base',style=(name)=>({name,role:'style',note:'OPTICS ONLY'});
const dream=['01-blue-eye-light-memory.jpg','02-silhouette-blue-room.jpg','03-city-light-trails.jpg','04-abstract-cyan-exposure.jpg']
  .map(file=>style('Dream Blur style - '+file));
const hk=style('Hong Kong Nights style - 06-interior-portrait.jpg');

test('existing Dream Blur results show only source, never the four internal Style photos',()=>{
  const ids=['mood-1','mood-2','mood-3','mood-4'];
  const job={sourceId:base,settings:{moodId:'dream-blur',referenceSourceIds:[base,...ids],
    referenceRoles:[{name:'portrait.jpg',role:'base'},...dream]}};
  assert.deepEqual(visibleImageReferenceIds(job),[base]);
  const withUser={...job,settings:{...job.settings,
    referenceSourceIds:[base,'user-pose',...ids],
    referenceRoles:[{name:'portrait.jpg',role:'base'},{name:'pose.jpg',role:'pose'},...dream]}};
  assert.deepEqual(visibleImageReferenceIds(withUser),[base,'user-pose']);
});
test('no uploaded Base means internal Mood references never appear as a fake Source image',()=>{
  const ids=['built-in-1','built-in-2','built-in-3','built-in-4'];
  assert.deepEqual(visibleImageReferenceIds({sourceId:ids[0],settings:{
    moodId:'dream-blur',referenceSourceIds:ids,referenceRoles:dream}}),[]);
});
test('Hong Kong Nights also hides internal optics while normal customer image references stay visible',()=>{
  const jobs=[
    {sourceId:'base',settings:{moodId:'hong-kong-nights',referenceSourceIds:['base','hk'],referenceRoles:[{name:'base',role:'base'},hk]}},
    {sourceId:'base',settings:{referenceSourceIds:['base','user-1','user-2'],
      referenceRoles:[{role:'base'},{role:'identity'},{role:'pose'}]}}
  ];
  assert.deepEqual(visibleImageReferenceIds(jobs[0]),['base']);
  assert.deepEqual(visibleImageReferenceIds(jobs[1]),['base','user-1','user-2']);
});
test('image detail and Reuse use the shared user-only inputs, not a legacy HK-only exception',()=>{
  const js=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
  assert.match(js,/return visibleImageReferenceIds\(job\)/);
  assert.match(js,/\.filter\(ref=>!isMoodStyleReference\(ref\.label\)\)/);
  assert.doesNotMatch(js,/p\.moodId!==\x27hong-kong-nights\x27\|\|/);
});
