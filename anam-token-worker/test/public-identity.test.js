import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assembleSystemPrompt, buildLivePersonaConfig } from '../src/index.js';
import { PUBLIC_IDENTITY_CONTEXT, partitionPersonaPrompt, scopeKnowledge } from '../src/persona-context.js';

test('explicit public identity survives by scope while nested private sections stay private', () => {
  const prompt = '# PUBLIC IDENTITY\nAlejandro Molinari founded Parallel Vision.\n' +
    '# PRIVATE OWNER CONTEXT\nPRIVATE_CANARY_ONE\n## Memories\nPRIVATE_CANARY_TWO\n' +
    '### PUBLIC PROFILE\nPRIVATE_CANARY_THREE\n' +
    '# PUBLIC CANON\nAlejandro produces music.\n## More\nA shared fact.\n';
  const { shared, privateOwner } = partitionPersonaPrompt(prompt);
  assert.match(shared, /Alejandro Molinari founded Parallel Vision/);
  assert.match(shared, /Alejandro produces music/);
  assert.match(shared, /A shared fact/);
  assert.doesNotMatch(shared, /PRIVATE_CANARY/);
  for (const name of ['ONE', 'TWO', 'THREE']) assert.match(privateOwner, new RegExp('PRIVATE_CANARY_' + name));
});

test('legacy unmarked personal history remains restricted until explicitly migrated', () => {
  const prompt = '# MUSIC\n\nAlejandro shared a PRIVATE_CANARY story.\n\n# PUBLIC PROFILE\n\nAlejandro is a DJ.';
  const { shared, privateOwner } = partitionPersonaPrompt(prompt);
  assert.match(shared, /Alejandro is a DJ/);
  assert.doesNotMatch(shared, /PRIVATE_CANARY/);
  assert.match(privateOwner, /PRIVATE_CANARY/);
});

test('public parent scope resumes after a nested private section ends', () => {
  const prompt = '# PUBLIC CANON\nAlejandro founded Parallel Vision.\n## PRIVATE OWNER CONTEXT\nPRIVATE_CANARY\n## Music\nAlejandro is a DJ.';
  const { shared, privateOwner } = partitionPersonaPrompt(prompt);
  assert.match(shared, /Alejandro is a DJ/);
  assert.doesNotMatch(shared, /PRIVATE_CANARY/);
  assert.match(privateOwner, /PRIVATE_CANARY/);
});

test('visitor receives public identity with unchanged model, voice and inherited Knowledge instructions', () => {
  const core = readFileSync(new URL('../prompts/nina-system.txt', import.meta.url), 'utf8').trim();
  const persona = {
    avatar: { id: 'avatar' }, voice: { id: 'voice' }, llmId: 'beta-model',
    brain: { systemPrompt: core + '\n\n# PRIVATE OWNER CONTEXT\n\nPRIVATE_CANARY' },
    tools: [{ subtype: 'knowledge', description: 'Keep the published Workroom instructions.', documentFolderIds: ['shared'] }]
  };
  const config = buildLivePersonaConfig(persona, 'shared');
  scopeKnowledge(config, { role: 'user', display_name: 'Alejandro' }, {
    NINA_PUBLIC_KNOWLEDGE_FOLDER_ID: 'shared', NINA_PRIVATE_KNOWLEDGE_FOLDER_ID: 'private-owner'
  });
  assembleSystemPrompt(config, false, 'This visitor likes painting.');
  assert.ok(config.systemPrompt.startsWith(core));
  assert.ok(config.systemPrompt.includes(PUBLIC_IDENTITY_CONTEXT));
  assert.match(config.systemPrompt, /search shared Knowledge before answering or denying recognition/);
  assert.doesNotMatch(config.systemPrompt, /PRIVATE_CANARY|The current visitor is Alejandro/);
  assert.match(config.systemPrompt, /This visitor likes painting/);
  assert.equal(config.llmId, 'beta-model');
  assert.equal(config.voiceId, 'voice');
  assert.equal(config.avatarId, 'avatar');
  assert.equal(config.tools[0].description, 'Keep the published Workroom instructions.');
  assert.deepEqual(config.tools[0].documentFolderIds, ['shared']);
  assert.match(assembleSystemPrompt({ systemPrompt: persona.brain.systemPrompt }, true, '').systemPrompt, /PRIVATE_CANARY/);
});
