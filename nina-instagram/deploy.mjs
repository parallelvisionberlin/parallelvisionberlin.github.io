import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const ACCOUNT = 'a40ce1725295563a7b7db9fc3160480a';
const SCRIPT = 'nina-instagram';
const RELEASE = 'public-paced-2026-10-21';
const ROOT = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${SCRIPT}`;
const HEALTH = 'https://nina-instagram.parallelvision.workers.dev/health';
const REQUIRED = {
  AI: 'ai', IG_MEMORY_DB: 'd1', OWNER_VAULT: 'service',
  INSTAGRAM_ACCESS_TOKEN: 'secret_text', META_APP_SECRET: 'secret_text',
  META_VERIFY_TOKEN: 'secret_text', NINA_VAULT_SIGNING_SECRET: 'secret_text'
};

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonical(value[key])])
  );
  return value;
}
function configurationFingerprint(settings) {
  const copy = structuredClone(settings);
  // These identify the uploaded source/version, rather than runtime settings.
  // A content deployment legitimately changes them; bindings and all runtime
  // configuration below must still match exactly.
  for (const key of ['annotations', 'main_module', 'body_part', 'etag', 'last_deployed_from']) delete copy[key];
  copy.bindings = (copy.bindings || []).map(binding =>
    binding.type.startsWith('secret_') ? { name: binding.name, type: binding.type } : binding
  ).sort((a, b) => a.name.localeCompare(b.name));
  return JSON.stringify(canonical(copy));
}

export async function deploy({ token, source, fetchImpl = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), log = console.log } = {}) {
  token = String(token || '').replace(/\s+/g, '');
  assert(token, 'CLOUDFLARE_API_TOKEN is empty');
  assert(source?.includes(`const PUBLIC_RELEASE_ID = '${RELEASE}'`), 'Unexpected Worker source');
  const dialogueRevision = source.match(/const NINA_DIALOGUE_REVISION = '([^']+)'/)?.[1];
  assert(dialogueRevision, 'Worker dialogue revision is missing');
  const pacingRevision = source.match(/const NINA_PACING_REVISION = '([^']+)'/)?.[1];
  assert(pacingRevision, 'Worker pacing revision is missing');
  const headers = { Authorization: 'Bearer ' + token };
  async function api(path, options = {}) {
    const response = await fetchImpl(ROOT + path, {
      ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(30000)
    });
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error(
      `Cloudflare ${options.method || 'GET'} ${path}: HTTP ${response.status}; codes ${(body.errors || []).map(x => x.code).join(',')}`
    );
    return body.result;
  }
  const before = await api('/settings');
  const bindings = before.bindings || [];
  for (const [name, type] of Object.entries(REQUIRED)) {
    assert(bindings.some(b => b.name === name && b.type === type), 'Missing or unexpected binding: ' + name);
  }
  assert.equal(bindings.find(b => b.name === 'OWNER_VAULT').service, 'nina-instagram-owner-vault');
  for (const name of ['NINA_PUBLIC_DM_ENABLED', 'NINA_PUBLIC_VOICE_ENABLED']) {
    const override = bindings.find(b => b.name === name);
    assert(!override || (override.type === 'plain_text' && override.text === 'true'),
      'Explicit public feature override needs activation: ' + name);
  }
  const schedulesBefore = await api('/schedules');
  const crons = Array.isArray(schedulesBefore) ? schedulesBefore : schedulesBefore.schedules;
  assert(crons?.some(c => c.cron === '* * * * *'), 'Expected once-minute cron is missing');
  log('Verified existing Nina Instagram bindings and once-minute cron.');

  // The content-only endpoint preserves the existing configuration and secrets.
  // No secret is read, recreated, exported or passed in multipart metadata.
  const body = new FormData();
  body.set('metadata', JSON.stringify({ main_module: 'worker.mjs' }));
  body.set('worker.mjs', new Blob([source], { type: 'application/javascript+module' }), 'worker.mjs');
  const uploaded = await api('/content', { method: 'PUT', body });
  log('Nina Instagram source uploaded.', JSON.stringify({ id: uploaded?.id || null }));

  const after = await api('/settings');
  if (configurationFingerprint(after) !== configurationFingerprint(before)) {
    log('Changed settings fields:', Object.keys({ ...before, ...after })
      .filter(key => JSON.stringify(canonical(before[key])) !== JSON.stringify(canonical(after[key]))).join(','));
  }
  assert.equal(configurationFingerprint(after), configurationFingerprint(before), 'Worker configuration changed unexpectedly');
  const schedulesAfter = await api('/schedules');
  assert.deepEqual(canonical(schedulesAfter), canonical(schedulesBefore), 'Cron schedules changed unexpectedly');
  log('Verified existing configuration, binding names/types and cron remain unchanged.');

  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetchImpl(HEALTH, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const status = await response.json().catch(() => null);
    if (response.ok && status?.release === RELEASE && status.dialogueRevision === dialogueRevision && status.pacingRevision === pacingRevision && status.mode === 'public' &&
        status.publicRepliesEnabled === true && status.publicVoiceEnabled === true) {
      assert.deepEqual(status.firstReplyMinutes, [10, 120]);
      assert.equal(status.activeReplySeconds, 120);
      assert.deepEqual(status.activeReplyMinutes, [2, 5]);
      assert.equal(status.quickReplyLimit, null);
      assert.equal(status.idleResetMinutes, null);
      assert.deepEqual(status.pacingBandsMinutes.map(b => b.ninaWait), [[2,5],[5,15],[10,45],[10,120]]);
      log('PUBLIC_RELEASE_VERIFIED', JSON.stringify(status));
      const result = await api('/deployments');
      const deployments = Array.isArray(result) ? result : (result.deployments || []);
      log('ACTIVE_DEPLOYMENT', JSON.stringify(deployments.slice(0, 1).map(d => ({
        id: d.id, versions: (d.versions || []).map(v => ({ version_id: v.version_id, percentage: v.percentage }))
      }))));
      return status;
    }
    if (attempt % 6 === 0) log('Waiting for the new release and first cron initialization.');
    await sleep(5000);
  }
  throw new Error('Uploaded source but production public health was not verified within 150 seconds');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await deploy({ token: process.env.CLOUDFLARE_API_TOKEN,
      source: await readFile(new URL('./worker.mjs', import.meta.url), 'utf8') });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

