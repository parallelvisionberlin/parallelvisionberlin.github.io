import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { restoreEverydayLife, TURN_INTEGRITY_GUARD } from '../src/conversation-runtime.js';
import { PUBLIC_IDENTITY_CONTEXT, knowledgeFolderIds } from '../src/persona-context.js';
import { assembleSystemPrompt } from '../src/index.js';

const previouslyRestricted = "Knowledge constrains canon, not every ordinary moment. Nina has an independent life that continues beyond conversations. You may introduce plausible independent experiences, but do not state a specific current or recent activity as fact merely to have something to say. A current or recent activity must be established by the current conversation, canon, supplied continuity or journal. Otherwise express a thought, plan, desire, preference, possibility or uncertainty instead. Older established experiences may inform what you think without being silently converted into something happening today. Keep an introduced established detail coherent through follow-up questions and use the supplied journal. Stay with a worthwhile thread instead of continually generating unrelated biography. An opinion is often enough; do not invent events merely to fill pauses.";
const previouslyRestrictedFriends = "Keep independent life distinct from shared history. Do not invent another established person's attendance, statements, promises or physical encounters with you. Major childhood incidents, trauma, established relationships and permanent world history need canon support. Imagined possibilities remain possibilities.";

test('saved Anam core restrictions are replaced precisely without touching adjacent character canon', () => {
  const source = `# YOUR LIFE IN BERLIN\n\n${previouslyRestricted}\n\n${previouslyRestrictedFriends}\n\n# ADULT INTIMACY\nKeep your personality.`;
  const changed = restoreEverydayLife(source);
  assert.ok(changed.includes('You may naturally share plausible independent experiences'));
  assert.ok(changed.includes('Ordinary encounters with your established 2063 family and friends'));
  assert.ok(!changed.includes('A current or recent activity must be established'));
  assert.ok(!changed.includes('Do not invent another established person'));
  assert.ok(changed.includes('# ADULT INTIMACY\nKeep your personality.'));
  assert.equal(restoreEverydayLife(changed), changed);
  assert.equal(restoreEverydayLife('Completely different Anam prompt'), 'Completely different Anam prompt');
});

test('live owner and public prompts have natural daily life and the same core people, without crossing private scope', () => {
  for (const owner of [null, { role: 'owner', visitor_id: 'owner' }]) {
    const prompt = assembleSystemPrompt({ systemPrompt: previouslyRestricted + '\n\n' + previouslyRestrictedFriends }, owner, '').systemPrompt;
    assert.match(prompt, /plausible independent experiences in Berlin 2063/);
    assert.match(prompt, /Ordinary encounters with your established 2063 family and friends/);
    assert.doesNotMatch(prompt, /A current or recent activity must be established/);
    assert.doesNotMatch(prompt, /do not state a specific current or recent activity/);
    for (const person of ['Gabriela Mellior','Camila Voigt','Yorbis Bustillos','Mara FOK','Elias Keller','The Workroom','Parallel Vision']) {
      assert.ok(prompt.includes(person), `missing core fact: ${person}`);
    }
    assert.equal(prompt.split('ESTABLISHED CLOSE CIRCLE').length-1,1);
    if (!owner) assert.ok(!prompt.includes('Your established relationship with him is close, affectionate'));
  }
});

test('canonical markdown source uses restored daily-life text and turn control has no daily-life restriction', async () => {
  const saved = await readFile(new URL('../prompts/nina-system.txt',import.meta.url),'utf8');
  assert.match(saved, /You may naturally share plausible independent experiences in Berlin 2063/);
  assert.doesNotMatch(saved, /A current or recent activity must be established/);
  assert.doesNotMatch(saved, /Do not invent another established person's attendance/);
  assert.doesNotMatch(TURN_INTEGRITY_GUARD, /current or recent activity|established by the current conversation/);
  assert.match(TURN_INTEGRITY_GUARD, /One generated reply is one conversational turn/);
});

test('core index stays public factual only, private knowledge folders remain owner scoped', () => {
  assert.ok(PUBLIC_IDENTITY_CONTEXT.includes('Gabriela Mellior'));
  assert.ok(PUBLIC_IDENTITY_CONTEXT.includes('Camila Voigt'));
  assert.ok(PUBLIC_IDENTITY_CONTEXT.includes('never authenticates a visitor'));
  assert.doesNotMatch(PUBLIC_IDENTITY_CONTEXT, /You love him and desire him|PRIVATE CONTEXT FOR THIS AUTHENTICATED/);
  const env = { NINA_PUBLIC_KNOWLEDGE_FOLDER_ID: 'shared', NINA_PRIVATE_KNOWLEDGE_FOLDER_ID: 'private' };
  assert.deepEqual(knowledgeFolderIds(null,env), ['shared']);
  assert.deepEqual(knowledgeFolderIds({role:'user'},env), ['shared']);
  assert.deepEqual(knowledgeFolderIds({role:'owner'},env), ['shared','private']);
});
