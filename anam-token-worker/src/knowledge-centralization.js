import berlin from './knowledge-migration-docs/berlin.js';
import bio from './knowledge-migration-docs/bio.js';
import culture from './knowledge-migration-docs/culture.js';
import workroom from './knowledge-migration-docs/workroom.js';
import resonance from './knowledge-migration-docs/resonance.js';
import pv from './knowledge-migration-docs/pv.js';
import alejandro from './knowledge-migration-docs/alejandro.js';

const API = 'https://api.anam.ai/v1';
const SHARED_GROUP = 'Nina - Shared Canon';
const PRIVATE_GROUP = 'Nina - Alejandro Private Canon';
const OBSOLETE_GROUPS = new Set(['Nina - Previous Combined Canon', "Nina's Knowledge"]);
const DOCUMENTS = [berlin, bio, culture, workroom, resonance, pv, alejandro];
const CORE_SHARED = [berlin, bio, culture, workroom, resonance];
const TEMP_PREFIX = '__NINA_CLEAN_V2__';
const CLEAN_MARKER = 'NINA_CLEAN_CANON_V2';
const FINALIZING_MARKER = 'NINA_CLEAN_CORE_FINALIZING_V2';

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

async function anam(env, path, init = {}) {
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.ANAM_API_KEY}`, ...(init.headers || {}) }
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`Anam ${init.method || 'GET'} ${path} failed: ${r.status} ${detail.slice(0, 240)}`);
  }
  if (r.status === 204) return null;
  return r.json();
}

function latin1(value) {
  return String(value)
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u2022\u25CF\u25E6]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '?');
}

function escapePdf(value) {
  return latin1(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapParagraph(text, width = 94) {
  const words = latin1(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if ((line + ' ' + word).length <= width) line += ' ' + word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function paginate(text) {
  const lines = [];
  for (const raw of String(text).split(/\n/)) {
    const trimmed = raw.trim();
    if (!trimmed) { lines.push(''); continue; }
    lines.push(...wrapParagraph(trimmed));
  }
  const pages = [];
  let page = [];
  for (const line of lines) {
    if (page.length >= 58) { pages.push(page); page = []; }
    page.push(line);
  }
  if (page.length || !pages.length) pages.push(page);
  return pages;
}

function bytes(s) {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 255;
  return out;
}

function makePdf(text) {
  const pages = paginate(text);
  const objects = new Map();
  const pageIds = [];
  let nextId = 4;

  for (const pageLines of pages) {
    const pageId = nextId++;
    const contentId = nextId++;
    pageIds.push(pageId);
    const commands = ['BT', '/F1 9.5 Tf', '48 800 Td', '12 TL'];
    for (const line of pageLines) commands.push(`(${escapePdf(line)}) Tj`, 'T*');
    commands.push('ET');
    const stream = commands.join('\n') + '\n';
    objects.set(pageId, `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R >> >> /MediaBox [0 0 595 842] /Contents ${contentId} 0 R >>`);
    objects.set(contentId, `<< /Length ${bytes(stream).length} >>\nstream\n${stream}endstream`);
  }

  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objects.set(2, `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  objects.set(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');

  let binary = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  const maxId = nextId - 1;
  for (let id = 1; id <= maxId; id++) {
    offsets[id] = bytes(binary).length;
    binary += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }
  const xref = bytes(binary).length;
  binary += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) binary += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  binary += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return bytes(binary);
}

async function uploadDocument(env, groupId, doc) {
  const form = new FormData();
  const data = makePdf(doc.text);
  form.append('file', new File([data], doc.filename, { type: 'application/pdf' }));
  form.append('chunkSize', '1000');
  form.append('chunkOverlap', '200');
  return anam(env, `/knowledge/groups/${groupId}/documents`, { method: 'POST', body: form });
}

export async function runKnowledgeCentralization(env) {
  try {
    if (!env.ANAM_API_KEY) return response({ ok: false, error: 'missing_anam_key' }, 503);

    const groups = await anam(env, '/knowledge/groups');
    const shared = groups.find(group => group.name === SHARED_GROUP);
    const priv = groups.find(group => group.name === PRIVATE_GROUP);
    if (!shared || !priv) return response({ ok: false, error: 'required_group_missing', groups: groups.map(g => g.name) }, 409);

    if (env.NINA_PUBLIC_KNOWLEDGE_FOLDER_ID && shared.id !== env.NINA_PUBLIC_KNOWLEDGE_FOLDER_ID)
      return response({ ok: false, error: 'shared_binding_mismatch' }, 409);
    if (env.NINA_PRIVATE_KNOWLEDGE_FOLDER_ID && priv.id !== env.NINA_PRIVATE_KNOWLEDGE_FOLDER_ID)
      return response({ ok: false, error: 'private_binding_mismatch' }, 409);

    const sharedDetail = await anam(env, `/knowledge/groups/${shared.id}`);
    const sharedDescription = String(sharedDetail?.description || shared?.description || '');

    // Core files 01-05 existed under the final names before this migration. Replace them
    // safely via READY temporary copies so there is never a period with no core canon.
    if (!sharedDescription.includes(CLEAN_MARKER)) {
      let sharedDocs = await anam(env, `/knowledge/groups/${shared.id}/documents`);
      const tempTargets = CORE_SHARED.map(doc => ({ ...doc, filename: TEMP_PREFIX + doc.filename }));
      const missingTemps = tempTargets.filter(doc => !sharedDocs.some(item => item.filename === doc.filename));
      if (missingTemps.length) {
        const uploaded = [];
        for (const doc of missingTemps) {
          const created = await uploadDocument(env, shared.id, doc);
          uploaded.push({ filename: doc.filename, status: created.status });
        }
        return response({ ok: true, phase: 'uploaded', stage: 'core_temp', uploaded });
      }

      const tempDocs = tempTargets.map(doc => sharedDocs.find(item => item.filename === doc.filename));
      const failedTemp = tempDocs.filter(doc => doc?.status === 'FAILED');
      if (failedTemp.length) {
        for (const doc of failedTemp) await anam(env, `/knowledge/documents/${doc.id}`, { method: 'DELETE' });
        return response({ ok: true, phase: 'uploaded', stage: 'core_temp_retry', deletedFailed: failedTemp.map(doc => doc.filename) });
      }
      const pendingTemp = tempDocs.filter(doc => doc?.status !== 'READY');
      if (pendingTemp.length) return response({
        ok: true, phase: 'processing', stage: 'core_temp',
        documents: pendingTemp.map(doc => ({ filename: doc.filename, status: doc.status, error: doc.errorMessage || null }))
      }, 202);

      if (!sharedDescription.includes(FINALIZING_MARKER)) {
        await anam(env, `/knowledge/groups/${shared.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: FINALIZING_MARKER })
        });
        sharedDocs = await anam(env, `/knowledge/groups/${shared.id}/documents`);
        for (const doc of CORE_SHARED) {
          const old = sharedDocs.find(item => item.filename === doc.filename);
          if (old) await anam(env, `/knowledge/documents/${old.id}`, { method: 'DELETE' });
        }
        const uploaded = [];
        for (const doc of CORE_SHARED) {
          const created = await uploadDocument(env, shared.id, doc);
          uploaded.push({ filename: doc.filename, status: created.status });
        }
        return response({ ok: true, phase: 'uploaded', stage: 'core_final', uploaded });
      }

      sharedDocs = await anam(env, `/knowledge/groups/${shared.id}/documents`);
      const finals = CORE_SHARED.map(doc => sharedDocs.find(item => item.filename === doc.filename)).filter(Boolean);
      const missingFinal = CORE_SHARED.filter(doc => !sharedDocs.some(item => item.filename === doc.filename));
      if (missingFinal.length) {
        const uploaded = [];
        for (const doc of missingFinal) {
          const created = await uploadDocument(env, shared.id, doc);
          uploaded.push({ filename: doc.filename, status: created.status });
        }
        return response({ ok: true, phase: 'uploaded', stage: 'core_final_retry', uploaded });
      }
      const failedFinal = finals.filter(doc => doc.status === 'FAILED');
      if (failedFinal.length) {
        for (const doc of failedFinal) await anam(env, `/knowledge/documents/${doc.id}`, { method: 'DELETE' });
        return response({ ok: true, phase: 'uploaded', stage: 'core_final_retry', deletedFailed: failedFinal.map(doc => doc.filename) });
      }
      const pendingFinal = finals.filter(doc => doc.status !== 'READY');
      if (pendingFinal.length) return response({
        ok: true, phase: 'processing', stage: 'core_final',
        documents: pendingFinal.map(doc => ({ filename: doc.filename, status: doc.status, error: doc.errorMessage || null }))
      }, 202);

      for (const item of sharedDocs.filter(item => item.filename.startsWith(TEMP_PREFIX))) {
        await anam(env, `/knowledge/documents/${item.id}`, { method: 'DELETE' });
      }
      await anam(env, `/knowledge/groups/${shared.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `${CLEAN_MARKER} | Public factual canon for Nina FOK: Berlin 2063, biography, culture/materials, Workroom, Resonance/intimacy, and current Parallel Vision website artists/releases.`
        })
      });
    }

    const sharedDocs = await anam(env, `/knowledge/groups/${shared.id}/documents`);
    const privateDocs = await anam(env, `/knowledge/groups/${priv.id}/documents`);
    const byGroup = new Map([[shared.id, sharedDocs], [priv.id, privateDocs]]);
    const target = DOCUMENTS.map(doc => ({ ...doc, group: doc.scope === 'shared' ? shared : priv }));

    const uploaded = [];
    for (const doc of target) {
      const docs = byGroup.get(doc.group.id) || [];
      const existing = docs.find(item => item.filename === doc.filename);
      if (existing?.status === 'FAILED') {
        await anam(env, `/knowledge/documents/${existing.id}`, { method: 'DELETE' });
      }
      if (!existing || existing.status === 'FAILED') {
        const created = await uploadDocument(env, doc.group.id, doc);
        uploaded.push({ filename: doc.filename, status: created.status });
      }
    }
    if (uploaded.length) return response({ ok: true, phase: 'uploaded', uploaded });

    const refreshedShared = await anam(env, `/knowledge/groups/${shared.id}/documents`);
    const refreshedPrivate = await anam(env, `/knowledge/groups/${priv.id}/documents`);
    const desiredNames = new Set(DOCUMENTS.map(doc => doc.filename));
    const desired = [...refreshedShared, ...refreshedPrivate].filter(doc => desiredNames.has(doc.filename));
    const missing = DOCUMENTS.filter(doc => !desired.some(item => item.filename === doc.filename));
    if (missing.length) return response({ ok: true, phase: 'missing_after_upload', missing: missing.map(doc => doc.filename) }, 202);

    const pending = desired.filter(doc => doc.status !== 'READY');
    if (pending.length) return response({
      ok: true,
      phase: 'processing',
      documents: pending.map(doc => ({ filename: doc.filename, status: doc.status, error: doc.errorMessage || null }))
    }, 202);

    const deletedDocuments = [];
    for (const item of refreshedShared) {
      if (!desiredNames.has(item.filename) && !item.filename.startsWith(TEMP_PREFIX)) {
        await anam(env, `/knowledge/documents/${item.id}`, { method: 'DELETE' });
        deletedDocuments.push(item.filename);
      }
    }
    for (const item of refreshedPrivate) {
      if (!desiredNames.has(item.filename)) {
        await anam(env, `/knowledge/documents/${item.id}`, { method: 'DELETE' });
        deletedDocuments.push(item.filename);
      }
    }

    const deletedGroups = [];
    for (const group of groups) {
      if (OBSOLETE_GROUPS.has(group.name)) {
        await anam(env, `/knowledge/groups/${group.id}`, { method: 'DELETE' });
        deletedGroups.push(group.name);
      }
    }

    const finalShared = await anam(env, `/knowledge/groups/${shared.id}/documents`);
    const finalPrivate = await anam(env, `/knowledge/groups/${priv.id}/documents`);
    const tempLeft = finalShared.filter(doc => doc.filename.startsWith(TEMP_PREFIX));
    for (const doc of tempLeft) await anam(env, `/knowledge/documents/${doc.id}`, { method: 'DELETE' });

    await anam(env, `/knowledge/groups/${priv.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Private factual canon for authenticated owner Alejandro Molinari. Never public knowledge.' })
    });

    return response({
      ok: true,
      phase: 'done',
      cleanMarker: CLEAN_MARKER,
      keptGroups: [SHARED_GROUP, PRIVATE_GROUP],
      sharedDocuments: DOCUMENTS.filter(doc => doc.scope === 'shared').map(doc => doc.filename),
      privateDocuments: DOCUMENTS.filter(doc => doc.scope === 'private').map(doc => doc.filename),
      statuses: {
        shared: finalShared.filter(doc => desiredNames.has(doc.filename)).map(doc => ({ filename: doc.filename, status: doc.status })),
        private: finalPrivate.filter(doc => desiredNames.has(doc.filename)).map(doc => ({ filename: doc.filename, status: doc.status }))
      },
      deletedDocuments,
      deletedGroups
    });
  } catch (error) {
    return response({ ok: false, error: 'migration_failed', detail: String(error?.message || error).slice(0, 500) }, 500);
  }
}
