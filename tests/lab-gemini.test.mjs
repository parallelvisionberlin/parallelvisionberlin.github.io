import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GEMINI_MODEL,geminiParameters,geminiEstimatedMicros,buildGenerateRequest,buildBatchJsonl,
  extractInlineImage,batchState,batchOutputFile,googleJson,googleUpload,googleDownload
} from '../lab-worker/gemini.mjs';

const fail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};
const referenceLabels=value=>Array.isArray(value)?value:[];
test('Nano Banana Pro settings keep Normal and Batch distinct with official base pricing',()=>{
  const normal=geminiParameters({prompt:'Editorial portrait',resolution:'2k',aspectRatio:'4:5',delivery:'normal',referenceRoles:[]},{fail,referenceLabels});
  const batch=geminiParameters({...normal,delivery:'batch'},{fail,referenceLabels});
  assert.equal(normal.model,GEMINI_MODEL);assert.equal(normal.imageEngine,'nano-banana-pro');assert.equal(normal.outputFormat,'auto');
  assert.equal(geminiEstimatedMicros(normal,1),135100+Math.ceil(normal.prompt.length/4)*2);
  assert.equal(geminiEstimatedMicros(batch,1),67600+Math.ceil(batch.prompt.length/4));
  assert.throws(()=>geminiParameters({...normal,aspectRatio:'1:2'},{fail,referenceLabels}),/supported Nano Banana Pro aspect ratio/);
});
test('GenerateContent and JSONL requests preserve prompt, references, size and ratio',()=>{
  const p=geminiParameters({prompt:'Keep the face, change the room',resolution:'4k',aspectRatio:'16:9',delivery:'batch',referenceRoles:[]},{fail,referenceLabels});
  const request=buildGenerateRequest(p,[{uri:'https://generativelanguage.googleapis.com/v1beta/files/ref123',mimeType:'image/png'}],p.prompt);
  assert.deepEqual(request.generationConfig.responseModalities,['IMAGE']);
  assert.equal(request.generationConfig.responseFormat.image.imageSize,'4K');
  assert.equal(request.generationConfig.responseFormat.image.aspectRatio,'16:9');
  assert.equal(request.contents[0].parts[1].fileData.mimeType,'image/png');
  const jsonl=buildBatchJsonl([{id:'11111111-1111-4111-8111-111111111111'},{id:'22222222-2222-4222-8222-222222222222'}],request).trim().split('\n').map(JSON.parse);
  assert.equal(jsonl.length,2);assert.equal(jsonl[0].key,'11111111-1111-4111-8111-111111111111');
  assert.equal(jsonl[0].request.generation_config.responseFormat.image.imageSize,'4K');
});
test('Google requests keep the API key in headers and parse direct/batch responses',async()=>{
  const original=globalThis.fetch,calls=[];
  globalThis.fetch=async(url,options={})=>{calls.push({url:String(url),options});return Response.json({candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:'iVBORw0KGgo='}}]}}]});};
  try{
    const data=await googleJson('/v1beta/models/gemini-3-pro-image:generateContent','synthetic-google-key',{method:'POST',body:{hello:'world'},paid:true});
    assert.equal(extractInlineImage(data).mimeType,'image/png');assert.ok(!calls[0].url.includes('synthetic-google-key'));
    assert.equal(new Headers(calls[0].options.headers).get('x-goog-api-key'),'synthetic-google-key');
    assert.equal(batchState({state:'JOB_STATE_RUNNING'}),'JOB_STATE_RUNNING');
    assert.equal(batchOutputFile({dest:{fileName:'files/out123'}}),'files/out123');
  }finally{globalThis.fetch=original;}
});
test('File API uses resumable upload and batch download without putting the key in the URL',async()=>{
  const original=globalThis.fetch,calls=[];
  globalThis.fetch=async(url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).endsWith('/upload/v1beta/files'))return new Response(null,{status:200,headers:{'X-Goog-Upload-URL':'https://generativelanguage.googleapis.com/upload/v1beta/files?upload_id=test'}});
    if(String(url).includes('upload_id=test'))return Response.json({file:{name:'files/ref123',uri:'https://generativelanguage.googleapis.com/v1beta/files/ref123',mimeType:'image/png'}});
    if(String(url).includes('/download/v1beta/files/out123:download'))return new Response('{"key":"x"}\n',{status:200});
    throw new Error('unexpected '+url);
  };
  try{
    const file=await googleUpload('synthetic-google-key',new Uint8Array([137,80,78,71]),'image/png','ref');
    assert.equal(file.name,'files/ref123');
    const download=await googleDownload('files/out123','synthetic-google-key');assert.equal(await download.text(),'{"key":"x"}\n');
    assert.ok(calls.every(c=>!c.url.includes('synthetic-google-key')));
    assert.equal(new Headers(calls[0].options.headers).get('x-goog-api-key'),'synthetic-google-key');
  }finally{globalThis.fetch=original;}
});
