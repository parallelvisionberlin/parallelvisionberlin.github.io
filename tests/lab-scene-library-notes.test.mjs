import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {suggestedSceneNote} from '../lab/scene-library.js';

const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');
const scene=readFileSync(new URL('../lab/scene-library.js',import.meta.url),'utf8');
const guidance=readFileSync(new URL('../lab/reference-guidance.js',import.meta.url),'utf8');

test('suggestions cover every Scene Library category without silent truncation',()=>{
  for(const kind of ['characters','outfits','props','locations']){
    const note=suggestedSceneNote(kind);
    assert.ok(note.length>=50,kind+' has useful direction');
    assert.ok(note.length<=120,kind+' fits the visible input limit');
  }
  assert.equal(suggestedSceneNote('unknown'),'');
});

test('notes editor explains provider use and exposes one-click assistance',()=>{
  assert.match(html,/id="scene-note-suggest"/);
  assert.match(html,/id="scene-note" maxlength="120"[^>]+aria-describedby="scene-note-help scene-note-count"/);
  assert.match(html,/id="scene-note-help"[^>]*>Added to generation prompts/);
  assert.match(html,/id="scene-note-count"/);
  assert.match(scene,/\$\('scene-note'\)\.addEventListener\('input',syncNoteUi\)/);
  assert.match(scene,/\$\('scene-note-suggest'\)\.onclick=/);
  assert.match(scene,/Replace your current note with the suggested note/);
});

test('saved note text is retained with each reference for image generation',()=>{
  assert.match(scene,/note:referenceNote\(cat,title,appearance,extra\)/);
  assert.match(scene,/note:elementReferenceNote\(item,i\)/);
  assert.match(scene,/const authored=String\(item\.refs\?\.\[selectedIndex\]\?\.note\|\|''\)/);
  assert.match(guidance,/r\.note\?' Note: '/);
});
