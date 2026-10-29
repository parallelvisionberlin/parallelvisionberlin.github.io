import test from 'node:test';
import assert from 'node:assert/strict';
import {videoInputAction} from '../lab/video-input-action.js';
const ready={video:true,allowed:true,busy:false,hasPrompt:true,hasInput:false,mode:'reference'};
test('missing media becomes the corresponding picker action, never generation',()=>{
 for(const [mode,label,inputId] of [['reference','Add a reference','reference-images'],['start','Add a start frame','image'],['extend','Add a video','video-references']])
  assert.deepEqual(videoInputAction({...ready,mode}),{label,inputId});
});
test('preparation action cannot override account access, busy state, other tools or ready inputs',()=>{
 for(const patch of [{video:false},{allowed:false},{busy:true},{hasPrompt:false},{hasInput:true},{mode:'text'}])
  assert.equal(videoInputAction({...ready,...patch}),null);
});
