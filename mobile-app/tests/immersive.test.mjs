import test from 'node:test';
import assert from 'node:assert/strict';
import {isImmersiveNinaState, NINA_URL} from '../src/ninaBridge.js';
import {readFileSync} from 'node:fs';
test('online-state classification still excludes ready, connecting and failed states',()=>{
 for(const state of ['NINA ONLINE','online',' Nina Online '])assert.equal(isImmersiveNinaState(state),true);
 for(const state of ['NINA IS READY','CONNECTION FAILED','MICROPHONE CHECK','CONNECTING TO NINA','',undefined])assert.equal(isImmersiveNinaState(state),false);
});
test('approved deck keeps one stable WebView and persistent safe-area close in every call state',()=>{
 const src=readFileSync(new URL('../src/NinaLiveModal.js',import.meta.url),'utf8');
 assert.equal((src.match(/<WebView\b/g)||[]).length,1);
 assert.match(src,/key=\{attempt\}/);
 assert.match(src,/hidden=\{false\}/);
 assert.match(src,/<SafeAreaView style=\{styles.safeHeader\}>/);
 assert.doesNotMatch(src,/!?immersive && <SafeAreaView/);
 assert.match(src,/accessibilityLabel="Close Nina"/);
 assert.match(src,/onPress=\{\(\) => stop\('close'\)\}/);
 assert.match(src,/contentInsetAdjustmentBehavior="never"/);
 assert.match(src,/<View style=\{styles.deck\}>/);
 assert.match(src,/page.current !== data.pageId/);
 assert.match(src,/epoch === generation.current/);
});
test('new deck is an explicit opt-in on the same trusted live document',()=>{
 const url=new URL(NINA_URL);
 assert.equal(url.origin,'https://parallelvisionlabel.com');
 assert.equal(url.pathname,'/nina-app.html');
 assert.equal(url.searchParams.get('pv_deck'),'04');
});
test('canonical website films and posters stay visible until native playback actually advances',()=>{
 const assets=readFileSync(new URL('../src/site05Assets.js',import.meta.url),'utf8');
 const media=readFileSync(new URL('../src/SiteMedia.js',import.meta.url),'utf8');
 const screens=readFileSync(new URL('../src/DeckScreens.js',import.meta.url),'utf8');
 assert.match(assets,/city.mp4/); assert.match(assets,/nina-room.mp4/);
 assert.match(assets,/city-poster.jpg/); assert.match(assets,/nina-poster.jpg/);
 assert.doesNotMatch(screens,/deck04\/nina-portrait/);
 assert.match(media,/nativeControls=\{false\}/);
 assert.match(media,/player\.currentTime/);
 assert.match(media,/videoReady\?1:0/);
 assert.match(media,/mixWithOthers/);
 assert.match(media,/<Image pointerEvents="none" source=\{poster\}/);
 for(const name of ['DeckHome','DeckNina','Deck2063','DeckMusic','DeckNav'])assert.match(screens,new RegExp('export function '+name));
});
