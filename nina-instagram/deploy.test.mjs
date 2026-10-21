import assert from 'node:assert/strict';
import test from 'node:test';
import { deploy } from './deploy.mjs';

const source = "const PUBLIC_RELEASE_ID = 'public-paced-2026-10-21'; export default {};";
const required = [
  { name: 'AI', type: 'ai' }, { name: 'IG_MEMORY_DB', type: 'd1', id: 'test-database' },
  { name: 'OWNER_VAULT', type: 'service', service: 'nina-instagram-owner-vault' },
  ...['INSTAGRAM_ACCESS_TOKEN', 'META_APP_SECRET', 'META_VERIFY_TOKEN', 'NINA_VAULT_SIGNING_SECRET']
    .map(name => ({ name, type: 'secret_text' }))
];
const status = { release: 'public-paced-2026-10-21', mode: 'public',
  publicRepliesEnabled: true, publicVoiceEnabled: true, firstReplyMinutes: [10, 120],
  activeReplySeconds: 120, quickReplyLimit: 6, idleResetMinutes: 30 };

function fixture(bindings = required, mutateAfter = false) {
  const calls = []; let uploaded = false;
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (String(url).endsWith('/health')) return Response.json(status);
    if (String(url).endsWith('/settings')) return Response.json({ success: true,
      result: { compatibility_date: '2026-10-01', bindings: mutateAfter === true && uploaded ? bindings.slice(1) : bindings,
        ...(mutateAfter === 'annotations' ? { annotations: { 'workers/message': uploaded ? 'New version' : 'Previous version' },
          last_deployed_from: uploaded ? 'api' : 'dash' } : {}) } });
    if (String(url).endsWith('/schedules')) return Response.json({ success: true, result: { schedules: [{ cron: '* * * * *' }] } });
    if (String(url).endsWith('/content')) { uploaded = true; return Response.json({ success: true, result: { id: 'nina-instagram' } }); }
    if (String(url).endsWith('/deployments')) return Response.json({ success: true, result: { deployments: [] } });
    throw new Error('Unexpected request');
  };
  return { calls, fetchImpl };
}

test('deploy only writes Nina source and preserves metadata and secrets', async () => {
  const f = fixture();
  const result = await deploy({ token: 'test-token', source, fetchImpl: f.fetchImpl, log() {} });
  assert.deepEqual(result, status);
  const writes = f.calls.filter(x => x.options.method && x.options.method !== 'GET');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].options.method, 'PUT');
  assert.equal(writes[0].url, 'https://api.cloudflare.com/client/v4/accounts/a40ce1725295563a7b7db9fc3160480a/workers/scripts/nina-instagram/content');
  assert.deepEqual(JSON.parse(writes[0].options.body.get('metadata')), { main_module: 'worker.mjs' });
  assert.equal(await writes[0].options.body.get('worker.mjs').text(), source);
  assert(!f.calls.some(x => x.url.includes('/secrets')));
  assert(f.calls.filter(x => x.url.includes('api.cloudflare.com')).every(x => x.options.headers.Authorization === 'Bearer test-token'));
  assert(!f.calls.find(x => x.url.endsWith('/health')).options.headers?.Authorization);
});

test('an unexpected binding or a disabled public override fails before any upload', async () => {
  for (const bindings of [required.slice(1), [...required, { name: 'NINA_PUBLIC_DM_ENABLED', type: 'plain_text', text: 'false' }]]) {
    const f = fixture(bindings);
    await assert.rejects(deploy({ token: 'test-token', source, fetchImpl: f.fetchImpl, log() {} }));
    assert(!f.calls.some(x => x.options.method === 'PUT'));
  }
});

test('deployment never reports success if configuration changes', async () => {
  const f = fixture(required, true);
  await assert.rejects(deploy({ token: 'test-token', source, fetchImpl: f.fetchImpl, log() {} }), /configuration changed/);
});

test('version annotations can change while runtime configuration remains identical', async () => {
  const f = fixture(required, 'annotations');
  const result = await deploy({ token: 'test-token', source, fetchImpl: f.fetchImpl, log() {} });
  assert.deepEqual(result, status);
});
