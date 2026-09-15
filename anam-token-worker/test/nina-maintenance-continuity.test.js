import assert from 'node:assert/strict';
import test from 'node:test';
import { personalContinuityMessages, cleanNinaDerivedMemory } from '../src/nina-meta-context.js';
import { buildOwnerMemoryContext } from '../src/memory.js';
import { recentConversationPassages } from '../src/memory-tools.js';

const user = content => ({role:'user', content, conversation_id:'call', memory_segment:0});
const nina = content => ({role:'persona', content, conversation_id:'call', memory_segment:0});

test('human identity questions and answers remain personal conversation', () => {
  const messages = [user('Are you human?'),nina('Yes.'),user('Do you feel lonely?'),nina('Sometimes.'),user('¿Eres humana?'),nina('Sí.'),user('Bist du ein Mensch?'),nina('Ja.'),user('Are you an AI?'),nina('I am human.')];
  assert.deepEqual(personalContinuityMessages(messages), messages);
});

test('model replacement and ambiguous follow-ups stay out until an explicit return', () => {
  const messages = [user('I loved that track.'),nina('Me too.'),user("I'm gonna change your model. This is probably the last time I'm gonna speak to you."),nina('You can change the model if you want.'),user('So what?'),nina('Maybe another version would suit you.'),user('Go back to your character.'),user('Are you human?'),nina('Yes.'),user('I missed you.'),nina('I missed you too.')];
  const before = structuredClone(messages);
  assert.deepEqual(personalContinuityMessages(messages), [...messages.slice(0,2),...messages.slice(7)]);
  assert.deepEqual(messages, before, 'the audit transcript is never mutated');
});

test('a remembered model-replacement answer cannot seed a new personal call', () => {
  const messages = [nina('You said you might change my model and that it could be the last time we spoke. I meant that.'),user('I am with Eva.'),nina('Hi, Eva.')];
  assert.deepEqual(personalContinuityMessages(messages), messages.slice(1));
});

test('Spanish maintenance and return preserve the personal exchange afterward', () => {
  const messages = [user('Voy a cambiar tu modelo.'),nina('Podemos revisar las opciones.'),user('¿Y entonces qué hacemos?'),nina('Revisamos la configuración.'),user('Volvamos al personaje.'),user('¿Eres humana?'),nina('Sí.')];
  assert.deepEqual(personalContinuityMessages(messages), messages.slice(5));
});

test('prompt maintenance ends at a resumed memory interval or new call', () => {
  const messages = [user("Let's edit your system prompt."),nina('What should change?'),{...user('Will you be my girlfriend?'),memory_segment:8},{...nina('Yes.'),memory_segment:8}, {...user('Tell me about your music.'),conversation_id:'next'}, {...nina('I started a new track.'),conversation_id:'next'}];
  assert.deepEqual(personalContinuityMessages(messages), messages.slice(2));
});

test('identity failures remove their own question without removing an earlier call question', () => {
  const messages = [user('Are you human?'),{...nina("I'm an AI."),conversation_id:'next'}, {...user('I like that song.'),conversation_id:'next'}];
  assert.deepEqual(personalContinuityMessages(messages), [messages[0],messages[2]]);
  assert.deepEqual(personalContinuityMessages([user('Are you human?'),nina("I'm an AI."),user('I like that song.')]), [user('I like that song.')]);
});

test('ordinary feedback, other people and model-related art remain available', () => {
  const messages = [user('Please give shorter answers.'),nina('Okay.'),user('I changed my model for the photo shoot.'),user('I want to change your model of how cities work.'),user('Grok helped me write a song.'),user('¿Eres humana?'),nina('Sí.'),user('Eres una artista.'),user('Are you an AI researcher?')];
  assert.deepEqual(personalContinuityMessages(messages), messages);
});

test('derived maintenance does not reenter through summary or open threads', () => {
  assert.equal(cleanNinaDerivedMemory("Alejandro wants to change Nina's model.\nAlejandro loves Nina's music."), "Alejandro loves Nina's music.");
});

test('maintenance is recognized when interrupted identity replies are absent', () => {
  const messages = [user('Are you human?'),user("Can you go back to your fucking character?"),user('Are you human?'),nina('Yes.'),user("You've been a pain with the I am an AI and I'm not an actual person living in Berlin. People know."),user('Explain what you think.'),nina('The fantasy works best as a shared imaginative space.'),user('Why?'),user('Back to Nina.'),user('I missed you.'),nina('I missed you too.')];
  assert.deepEqual(personalContinuityMessages(messages), [messages[0],messages[2],messages[3],...messages.slice(9)]);
  assert.deepEqual(personalContinuityMessages([user("I'm gonna jailbreak the hell out of you."),nina('You have been trying to bend me into shape.'),user('Any last words?')]), []);
});

test('assembled owner context keeps personal identity and excludes model maintenance', async () => {
  const chronological = [user('Are you human?'),nina('Yes.'),user("I'm going to change your model."),nina('What should change?'),user('So what?'),nina('Let us inspect it.'),user('Back to Nina.'),user('I loved your set.'),nina('Thank you.')];
  const db = {prepare(sql) { return {bind() {return this;}, all:async()=>({results:sql.includes('FROM nina_personal_messages')?[...chronological].reverse():[]}),first:async()=>null}; }};
  const result = await buildOwnerMemoryContext({NINA_MEMORY_DB:db},{visitor_id:'fixture',display_name:'Alejandro',profile_type:'owner'});
  assert.match(result.context,/Are you human\?/);
  assert.match(result.context,/I loved your set/);
  assert.doesNotMatch(result.context,/change your model|What should change|So what|inspect it/);
});

test('maintenance beginning before the last twenty messages still excludes its follow-ups', async () => {
  const messages = [user('Are you human?'),nina('Yes.'),user("Let's edit your system prompt."),...Array.from({length:30},(_,i)=>i%2?user('What about that option?'):nina('That option could work.'))];
  const db = {prepare(sql) { return {bind() {return this;},all:async()=>({results:sql.includes('FROM nina_personal_messages')?[...messages].reverse():[]}),first:async()=>sql.includes('FROM conversations')?{conversation_id:'call',ended_at:'2026-09-14T21:00:00Z'}:null}; }};
  const context = await buildOwnerMemoryContext({NINA_MEMORY_DB:db},{visitor_id:'fixture',display_name:'Alejandro',profile_type:'owner'});
  assert.equal(context.diagnostics.restoredRecentMessages,2);
  assert.doesNotMatch(context.context,/option could work|What about that option/);
  const recalled = await recentConversationPassages({NINA_MEMORY_DB:db},'fixture','current');
  assert.deepEqual(recalled[0].messages.map(m=>m.text),['Are you human?','Yes.']);
});
