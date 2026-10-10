import test from 'node:test';
import assert from 'node:assert/strict';
import {modelImageInputIssue} from '../lab/image-model-limits.js';

const MiB = 1024 * 1024;
const image = (size, width=800, height=800, name='reference.jpg') => ({file:{size,name},width,height});

test('Flash validates combined references below the paid route', () => {
  assert.equal(modelImageInputIssue('flash',[image(9*MiB),image(6*MiB)]),'');
  assert.match(modelImageInputIssue('flash',[image(9*MiB),image(9*MiB)]),/16 MiB combined/);
  assert.match(modelImageInputIssue('flash',[image(17*MiB)]),/No generation submitted/);
});
test('Kling validates decimal file limit, resolution and ratio', () => {
  assert.equal(modelImageInputIssue('kling',[image(10000000)]),'');
  assert.match(modelImageInputIssue('kling',[image(10000001)]),/Maximum 10 MB/);
  assert.match(modelImageInputIssue('kling',[image(MiB,240,800)]),/Minimum 300/);
  assert.match(modelImageInputIssue('kling',[image(MiB,800,300)]),/aspect ratios/);
  assert.equal(modelImageInputIssue('kling',[image(MiB,500,300)]),'');
  assert.match(modelImageInputIssue('kling',[{file:{size:MiB,name:'already-loaded.jpg'},ref:{width:240,height:800}}]),/Minimum 300/);
});
test('Nano Banana Pro validates combined inline and batch limits', () => {
  assert.equal(modelImageInputIssue('gemini',[image(14*MiB)]),'');
  assert.match(modelImageInputIssue('gemini',[image(14*MiB+1)]),/14 MiB combined/);
  assert.match(modelImageInputIssue('gemini',[image(8*MiB)],{count:2,processing:'batch'}),/Google inline-batch limit/);
  assert.equal(modelImageInputIssue('gemini',[image(5*MiB)],{count:2,processing:'batch'}),'');
});
test('Other engines retain the existing 20 MiB upload limit',()=>{
  assert.equal(modelImageInputIssue('seedream',[image(19*MiB)]),'');
  assert.equal(modelImageInputIssue('soulpro',[image(19*MiB)]),'');
});
