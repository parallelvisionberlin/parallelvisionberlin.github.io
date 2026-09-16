#!/usr/bin/env node
// Creates an ephemeral test configuration. It never edits the stored persona or D1.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  'persona-id': { type: 'string', default: 'a5663da5-5f5c-4600-b545-cbb58bd4e155' },
  'shared-folder-id': { type: 'string', default: 'a70c1f61-4245-4759-83ac-aa5cc4d35892' },
  prompt: { type: 'string' }, model: { type: 'string' }, out: { type: 'string' }
}});
if (!process.env.ANAM_API_KEY || !values.out) throw new Error('ANAM_API_KEY and --out are required. Keep the output outside the repository.');
const output = resolve(values.out);
if (output.startsWith(resolve(import.meta.dirname, '..') + '/')) throw new Error('The session token must not be saved inside the repository.');
async function request(path, body) {
  const response = await fetch(`https://api.anam.ai/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${process.env.ANAM_API_KEY}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`Anam returned HTTP ${response.status}.`);
  return response.json();
}
const persona = await request(`personas/${encodeURIComponent(values['persona-id'])}`);
const systemPrompt = values.prompt ? await readFile(values.prompt, 'utf8') : persona.brain?.systemPrompt;
if (!systemPrompt || !persona.avatar?.id || !persona.voice?.id || !persona.llmId) throw new Error('Incomplete persona configuration.');
const sharedId = values['shared-folder-id'];
const knowledge = (persona.tools || []).find(t => Array.isArray(t.documentFolderIds) && t.documentFolderIds.includes(sharedId));
const personaConfig = {
  name: 'Nina isolated conversation test',
  avatarId: persona.avatar.id, voiceId: persona.voice.id,
  llmId: values.model || persona.llmId, systemPrompt,
  skipGreeting: true, maxSessionLengthSeconds: 180,
  tools: [{ type: 'server', subtype: 'knowledge', name: 'nina_knowledge',
    description: knowledge?.description || 'Search Nina\'s established shared canon before answering a missing factual question about her life and world.',
    documentFolderIds: [sharedId] }]
};
for (const key of ['avatarModel', 'languageCode', 'directorNotes', 'voiceDetectionOptions', 'voiceGenerationOptions']) {
  if (persona[key] !== undefined) personaConfig[key] = persona[key];
}
const result = await request('auth/session-token', { personaConfig });
if (typeof result.sessionToken !== 'string' || !result.sessionToken) throw new Error('Anam did not return a session token.');
await writeFile(output, JSON.stringify({ sessionToken: result.sessionToken, personaConfig }, null, 2), { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ saved: output, llmId: personaConfig.llmId, promptCharacters: systemPrompt.length, sharedFolderCount: 1, privateMemory: false }));
