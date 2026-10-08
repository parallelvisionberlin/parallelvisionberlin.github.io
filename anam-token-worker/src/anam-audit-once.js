// Temporary internal-only Anam configuration audit. No HTTP route or persona mutations.
// Results are written once to an existing D1 audit table and removed after verification.
import { promptFingerprint } from './conversation-runtime.js';

const AUDIT_ID = 'anam-config-readonly-20261008-v3';
const ORIGINAL_ID = 'a5663da5-5f5c-4600-b545-cbb58bd4e155';
const BASE = 'https://api.anam.ai';

function visibleFields(persona) {
  const brain = persona?.brain && typeof persona.brain === 'object' ? persona.brain : {};
  const systemPrompt = typeof brain.systemPrompt === 'string' ? brain.systemPrompt : '';
  return { 
    id: persona?.id || '',
    name: persona?.name || '',
    revision: persona?.revision ?? null,
    createdAt: persona?.createdAt ?? persona?.created_at ?? null,
    updatedAt: persona?.updatedAt ?? persona?.updated_at ?? persona?.modifiedAt ?? null,
    llmId: persona?.llmId ?? null,
    avatarId: persona?.avatar?.id ?? null,
    avatarModel: persona?.avatarModel ?? null,
    voiceId: persona?.voice?.id ?? null,
    languageCode: persona?.languageCode ?? null,
    systemPrompt,
    systemPromptCharacters: systemPrompt.length,
    directorNotes: persona?.directorNotes ?? null,
    stylePrompt: typeof persona?.stylePrompt === 'string' ? persona.stylePrompt : null,
    brainStylePrompt: typeof brain.stylePrompt === 'string' ? brain.stylePrompt : null,
    voiceDetectionOptions: persona?.voiceDetectionOptions ?? null,
    voiceGenerationOptions: persona?.voiceGenerationOptions ?? null,
    keys: Object.keys(persona || {}).sort(),
    brainKeys: Object.keys(brain).sort(),
    knowledge: Array.isArray(persona?.knowledge) ? persona.knowledge.map(k => ({
      id: k?.id ?? k?.knowledgeGroupId ?? null, name: k?.name ?? null, documents: Array.isArray(k?.documents) ? k.documents.length : null
    })) : [],
    tools: Array.isArray(persona?.tools) ? persona.tools.map(t => ({
      id: t?.id ?? null, name: t?.name ?? t?.config?.name ?? null,
      type: t?.type ?? null, subtype: t?.subtype ?? t?.config?.subtype ?? null,
      documentFolderIds: t?.documentFolderIds ?? t?.config?.documentFolderIds ?? null
    })) : []
  };
}

export async function recordAnamConfigAuditOnce(env) {
  if (!env?.ANAM_API_KEY || !env?.NINA_MEMORY_DB) return;
  const db = env.NINA_MEMORY_DB;
  const previous = await db.prepare('SELECT audit_id FROM nina_canon_retrieval_audits WHERE audit_id=?').bind(AUDIT_ID).first();
  if (previous) return;
  const headers = { Authorization: 'Bearer ' + env.ANAM_API_KEY, Accept: 'application/json' };
  const get = async path => {
    const response = await fetch(BASE + path, { headers, signal: AbortSignal.timeout(12000) });
    if (!response.ok) return { errorStatus: response.status };
    return { data: await response.json() };
  };
  const completed = new Date().toISOString();
  const audit = { date: completed, source: 'Anam API read only', originalPersonaId: ORIGINAL_ID };
  try {
    const current = await get('/v1/personas/' + ORIGINAL_ID);
    if (current.data) {
      audit.original = visibleFields(current.data);
      audit.original.systemPromptSha256 = await promptFingerprint(audit.original.systemPrompt);
    } else audit.originalError = current.errorStatus;
    const listings = await get('/v1/personas?perPage=100&page=1');
    if (listings.data) {
      const d = listings.data;
      const people = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.personas) ? d.personas : Array.isArray(d?.results) ? d.results : [];
      audit.listShape = { count: people.length, keys: Array.isArray(d) ? ['array'] : Object.keys(d).slice(0,16) };
      const ninaCandidates = people.filter(p => /nina|contingency/i.test(p?.name || '') || p?.id === ORIGINAL_ID);
      audit.candidates = ninaCandidates.map(p => ({id:p.id,name:p.name,llmId:p.llmId,updatedAt:p.updatedAt || p.updated_at || null}));
      const duplicate = ninaCandidates.find(p => p.id && p.id !== ORIGINAL_ID && /contingency|copy|test/i.test(p.name || '')) ||
        ninaCandidates.find(p => p.id && p.id !== ORIGINAL_ID);
      if (duplicate) {
        const remote = await get('/v1/personas/' + encodeURIComponent(duplicate.id));
        if (remote.data) {
          audit.copy = visibleFields(remote.data);
          audit.copy.systemPromptSha256 = await promptFingerprint(audit.copy.systemPrompt);
        } else audit.copyError = remote.errorStatus;
      }
    } else audit.listError = listings.errorStatus;
    // Lookup only the selected model's public configuration metadata.
    if (audit.original?.llmId) {
      const modelResult = await get('/v1/llms/' + encodeURIComponent(audit.original.llmId));
      if (modelResult.data) {
        const model = modelResult.data;
        audit.llmInfo = { id:model?.id ?? audit.original.llmId, name:model?.name ?? model?.displayName ?? null,
          provider:model?.provider ?? null, model:model?.model ?? model?.modelId ?? null,
          keys:Object.keys(model).sort() };
      } else audit.llmInfoError = modelResult.errorStatus;
    }
    const sessionIds = ['fedc15f2-819d-496f-bbda-0a0bb8e316b5', '39a4c2e5-a63e-4435-b595-1e93c5313be0'];
    audit.sessions = [];
    for (const sid of sessionIds) {
      try {
        const report = await get('/v1/sessions/' + sid + '/analytics?includeMessages=false');
        if (!report.data) { audit.sessions.push({ id:sid, errorStatus:report.errorStatus }); continue; }
        const d = report.data;
        const sessionConfig = d?.config && typeof d.config === 'object' ? d.config : {};
        const nestedConfig = sessionConfig.personaConfig && typeof sessionConfig.personaConfig === 'object'
          ? sessionConfig.personaConfig : sessionConfig;
        const savedSessionPrompt = typeof nestedConfig.systemPrompt === 'string' ? nestedConfig.systemPrompt
          : typeof nestedConfig.brain?.systemPrompt === 'string' ? nestedConfig.brain.systemPrompt : '';
        const configSnapshot = {
          configKeys: Object.keys(sessionConfig).sort(),
          nestedKeys: Object.keys(nestedConfig).sort(),
          promptLength: savedSessionPrompt.length,
          promptSha256: savedSessionPrompt ? await promptFingerprint(savedSessionPrompt) : null,
          llmId: nestedConfig.llmId ?? sessionConfig.llmId ?? null,
          llm: typeof nestedConfig.llm === 'string' ? nestedConfig.llm : null,
          voiceId: nestedConfig.voiceId ?? nestedConfig.voice?.id ?? null,
          avatarId: nestedConfig.avatarId ?? nestedConfig.avatar?.id ?? null,
          avatarModel: nestedConfig.avatarModel ?? null,
          directorNotes: nestedConfig.directorNotes ?? sessionConfig.directorNotes ?? null,
          voiceDetectionOptions: nestedConfig.voiceDetectionOptions ?? null,
          voiceGenerationOptions: nestedConfig.voiceGenerationOptions ?? null,
          initialMessage: typeof nestedConfig.initialMessage === 'string' ? nestedConfig.initialMessage.slice(0,200) : null,
          topLevelCandidates: Object.fromEntries(Object.entries(sessionConfig).filter(([key,value]) =>
            /^(?:model|modelId|llmId|brainType|personaId|voiceId|provider|engineRegion|region|sdkVersion)$/i.test(key)
            && (typeof value==='string'||typeof value==='number'||typeof value==='boolean')))
        };
        // Analytics session-level fields retained by Anam; exclude arbitrary object values.
        configSnapshot.actualHistoricalValues = {
          llmModel: typeof sessionConfig.llmModel === 'string' ? sessionConfig.llmModel : null,
          llmProvider: typeof sessionConfig.llmProvider === 'string' ? sessionConfig.llmProvider : null,
          avatarKey: typeof sessionConfig.avatarKey === 'string' ? sessionConfig.avatarKey : null,
          languageCode: typeof sessionConfig.languageCode === 'string' ? sessionConfig.languageCode : null,
          personaName: typeof sessionConfig.personaName === 'string' ? sessionConfig.personaName : null,
          ttsProvider: typeof sessionConfig.ttsProvider === 'string' ? sessionConfig.ttsProvider : null,
          ttsVoice: typeof sessionConfig.ttsVoice === 'string' ? sessionConfig.ttsVoice : null,
          transcriptsEnabled: typeof sessionConfig.transcriptsEnabled === 'boolean' ? sessionConfig.transcriptsEnabled : null
        };
        const turns = Array.isArray(d?.turns) ? d.turns : [];
        audit.sessions.push({
          id:sid,keys:Object.keys(d),configSnapshot,model:d?.llmId ?? d?.model ?? d?.llmModel ?? null,
          personaId:d?.personaId ?? null,sessionStart:d?.startTime ?? d?.startedAt ?? d?.createdAt ?? null,
          turnsCount:turns.length,
          turns:turns.slice(0,40).map(t=>({
            turnIndex:t?.turnIndex,wasInterrupted:t?.wasInterrupted,
            llmLatencySeconds:t?.llmLatencySeconds??null,
            firstAudioLatencySeconds:t?.firstAudioLatencySeconds??null,
            tools:Array.isArray(t?.toolCalls)?t.toolCalls.map(x=>({name:x?.toolName,status:x?.status,durationSeconds:x?.durationSeconds})):[],
            keys:Object.keys(t || {})
          }))
        });
      } catch (error) {audit.sessions.push({id:sid,errorName:String(error?.name||'network_error')});}
    }
  } catch (error) {
    audit.error = String(error?.name || 'Anam read unavailable').slice(0,90);
  }
  await db.prepare(
    'INSERT OR IGNORE INTO nina_canon_retrieval_audits (audit_id,status,result_json,created_at,completed_at) VALUES (?,?,?,?,?)'
  ).bind(AUDIT_ID, audit.original ? 'complete' : 'partial', JSON.stringify(audit), completed, new Date().toISOString()).run();
}
