import test from 'node:test';
import assert from 'node:assert/strict';
import {uploadUpscaleVideo} from '../lab/video-source-upload.js';
const mib=1024*1024;

test('large video uploads use bounded parts and retry only idempotent operations',async()=>{
  const file=new File([new Uint8Array(21*mib)],'camera.mov',{type:'video/quicktime'});
  const calls=[],progress=[];let completions=0,partAttempts=0;
  const result=await uploadUpscaleVideo(file,async(path,options)=>{
    calls.push(path);
    if(path==='/api/video-uploads'){
      assert.equal(options.body.bytes,21*mib);assert.equal(options.body.mime,'video/quicktime');
      return {id:'synthetic-upload',partBytes:8*mib};
    }
    if(path.includes('/part/')){
      assert.ok(options.body instanceof Blob);assert.ok(options.body.size<=8*mib);
      const partNumber=Number(path.split('/').at(-1));
      if(partNumber===1&&partAttempts++===0)throw Error('Temporary upload interruption');
      return {partNumber,etag:'etag-'+partNumber};
    }
    if(path.endsWith('/complete')){
      assert.deepEqual(options.body.parts.map(p=>p.partNumber),[1,2,3]);
      if(completions++===0)throw Error('Completion acknowledgement lost');
      return {id:'saved-source'};
    }
    throw Error('Unexpected action '+path);
  },value=>progress.push(value));
  assert.equal(result.id,'saved-source');assert.equal(progress.at(-1),100);
  assert.equal(calls.filter(p=>p==='/api/video-uploads').length,1);
  assert.ok(calls.every(p=>!p.includes('/api/jobs')&&!p.includes('/api/quotes')));
});

test('a failed large upload aborts its reservation and never starts a job',async()=>{
  const calls=[];
  await assert.rejects(uploadUpscaleVideo(new File([new Uint8Array(21*mib)],'failed.mp4'),async(path)=>{
    calls.push(path);
    if(path==='/api/video-uploads')return {id:'synthetic-upload',partBytes:8*mib};
    if(path.endsWith('/abort'))return {ok:true};
    throw Error('Connection lost');
  }),/Connection lost/);
  assert.equal(calls.at(-1),'/api/video-uploads/synthetic-upload/abort');
  assert.ok(!calls.some(p=>p.includes('/jobs')||p.endsWith('/complete')));
});
