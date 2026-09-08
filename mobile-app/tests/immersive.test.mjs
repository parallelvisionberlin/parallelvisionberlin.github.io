import test from 'node:test';
import assert from 'node:assert/strict';
import {isImmersiveNinaState} from '../src/ninaBridge.js';
import {readFileSync} from 'node:fs';
test('only online state hides the header; failures, connecting and ready restore controls',()=>{
 for(const state of ['NINA ONLINE','online',' Nina Online '])assert.equal(isImmersiveNinaState(state),true);
 for(const state of ['NINA IS READY','CONNECTION FAILED','MICROPHONE CHECK','CONNECTING TO NINA','',undefined])assert.equal(isImmersiveNinaState(state),false);
});
test('fullscreen keeps the same keyed WebView and a safe-area close button',()=>{
 const src=readFileSync(new URL('../src/NinaLiveModal.js',import.meta.url),'utf8');
 assert.match(src,/key=\{attempt\}/);assert.match(src,/hidden=\{immersive\}/);
 assert.match(src,/!immersive && <SafeAreaView/);assert.match(src,/immersive && <SafeAreaView/);
 assert.match(src,/contentInsetAdjustmentBehavior="never"/);
});
