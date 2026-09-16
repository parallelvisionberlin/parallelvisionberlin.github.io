import assert from 'node:assert/strict';
import test from 'node:test';
import { personalContinuityMessages } from '../src/nina-meta-context.js';
import { buildOwnerMemoryContext } from '../src/memory.js';

const message = (role, content, extra = {}) => ({role, content, conversation_id:'call-a', memory_segment:0, ...extra});

for (const correction of [
  "Where did that come from? That shit doesn't exist. Who told you to invent things?",
  "That link doesn't exist.",
  'You made that up.',
  'This is fabricated.',
  'Eso no existe.'
]) test(`explicit factual rejection excludes the preceding claim: ${correction}`, () => {
  const rows = [message('user','Send the recording.'), message('persona','Here is my recording: https://example.invalid/invented'), message('user',correction), message('persona','I cannot verify a recording.')];
  assert.deepEqual(personalContinuityMessages(rows), [rows[0], rows[2], rows[3]]);
  assert.equal(rows.length, 4); // Audit input is unchanged.
});

test('criticism, preference and a report about someone else do not retract facts', () => {
  const rows = [message('persona','The group practices attention.'), message('user',"I don't like that answer. My friend said that doesn't exist."), message('persona','I like this track.'), message('user',"I don't like it. You sound rehearsed.")];
  assert.deepEqual(personalContinuityMessages(rows), rows);
});

for (const boundary of [{conversation_id:'call-b'}, {memory_segment:12}]) test(`rejections do not cross context boundaries: ${JSON.stringify(boundary)}`, () => {
  const rows = [message('persona','An earlier, unrelated statement.'), message('user',"That doesn't exist.",boundary)];
  assert.deepEqual(personalContinuityMessages(rows), rows);
});

test('successive complaints exclude only the disputed reply, preserving earlier history and a replacement', () => {
  const rows = [message('persona','We agreed to meet tomorrow.'), message('user','Yes.'), message('persona','The address is 1 Example Street.'), message('user','You invented that.'), message('user',"That doesn't exist."), message('persona','The meeting location changes.'), message('user','Yes, that is right.')];
  assert.deepEqual(personalContinuityMessages(rows), rows.filter((_,index)=>index!==2));
});

test('a disputed implementation statement still establishes its technical boundary', () => {
  const rows = [message('user','Are you human?'),message('persona',"I'm an AI."),message('user','Why?'),message('persona','The model behind me generates words.'),message('user','You invented that.')];
  assert.deepEqual(personalContinuityMessages(rows), [rows[4]]);
});

test('startup context cannot recycle an explicitly rejected recording as recent history', async () => {
  const rows = [message('persona','Here is my recording: https://example.invalid/invented'),message('user',"That shit doesn't exist. Who told you to invent things?"),message('user','I prefer short answers.')];
  const db = {prepare(sql){return {bind(){return this;},all:async()=>({results:sql.includes('FROM nina_personal_messages')?[...rows].reverse():[]}),first:async()=>null};}};
  const result = await buildOwnerMemoryContext({NINA_MEMORY_DB:db},{visitor_id:'test-visitor',display_name:'Test',profile_type:'owner'});
  assert.doesNotMatch(result.context,/example\.invalid\/invented/);
  assert.match(result.context,/I prefer short answers/);
  assert.equal(result.diagnostics.restoredRecentMessages, 2);
});
