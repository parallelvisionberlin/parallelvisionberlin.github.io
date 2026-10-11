import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMoodAnalysisInput,normalizeMoodAnalysis,MOOD_ANALYSIS_DAILY_LIMIT,BOARD_IMAGE_BYTES_MAX} from '../lab-worker/mood-creator-service.mjs';
const fail=(code,message)=>{let error=new Error(message);error.status=code;throw error;};
test('Visual style analysis validates input and requires no public image link',()=>{
  assert.deepEqual(parseMoodAnalysisInput({concept:'Pearly rain at night'},fail),{concept:'Pearly rain at night',imageDataUrl:null});
  assert.deepEqual(parseMoodAnalysisInput({imageDataUrl:'data:image/jpeg;base64,'+'A'.repeat(120)},fail),{concept:'',imageDataUrl:'data:image/jpeg;base64,'+'A'.repeat(120)});
  assert.throws(()=>parseMoodAnalysisInput({},fail),/Add a photograph/);
  assert.throws(()=>parseMoodAnalysisInput({imageDataUrl:'https://example.net/photo.jpg'},fail),/only/);
  assert.throws(()=>parseMoodAnalysisInput({concept:'x'.repeat(1401)},fail),/1,400/);
  assert.equal(MOOD_ANALYSIS_DAILY_LIMIT,6);assert.ok(BOARD_IMAGE_BYTES_MAX<1000000);
});
test('Style response strips invalid colors and long fields',()=>{
  const v=normalizeMoodAnalysis({name:'Opal Shore',direction:'Soft pearly speculars, organic lens diffusion and realistic volumetric shadows repeat across skin, wet glass and water.',palette:['#ddeeff','#101010','not-css'],qualities:['film grain','liquid softness']},fail);
  assert.equal(v.name,'Opal Shore');assert.deepEqual(v.palette,['#ddeeff','#101010']);
  assert.deepEqual(v.qualities,['film grain','liquid softness']);
  assert.throws(()=>normalizeMoodAnalysis({name:'Short',direction:'nice'},fail),/could not describe/);
});
