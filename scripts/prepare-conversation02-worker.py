"""Prepare a narrow Worker patch against the inspected source. No live services."""
from pathlib import Path
import hashlib, re
root = Path(__file__).resolve().parents[1]
p = root/'anam-token-worker/src/index.js'
raw = p.read_bytes()
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest() == 'baa6287f141f608fc34204ffe3662e80d9a168b2', 'Worker changed; re-review before applying'
s = raw.decode()
def replace(old, new):
    global s
    assert s.count(old) == 1, f'Expected one replacement: {old[:90]}'
    s = s.replace(old, new)
def constant(name, new):
    global s
    pattern = rf'((?:export )?const {name} = )`[\s\S]*?`;'
    s, n = re.subn(pattern, lambda m:m.group(1)+new+';',s,count=1)
    assert n==1,name
s = 'import { RUNTIME_REVISION, CONVERSATION_RHYTHM, OWNER_ARRIVAL_CONTEXT, NEW_NAME_INSTRUCTION, CONTEXT_BOUNDARY, createStartupTimer, prepareSessionContext, promptFingerprint, summarizeSessionPerformance } from "./conversation-runtime.js";\n'+s
constant('NINA_CONVERSATIONAL_RHYTHM','CONVERSATION_RHYTHM')
constant('ALEJANDRO_CONTEXT','OWNER_ARRIVAL_CONTEXT')
constant('NINA_INTIMACY_CONTINUITY','''`Established intimacy follows the relationship and boundaries in Nina's base persona. Stay adult, personal and emotionally present instead of suddenly becoming clinical or performative. Preserve agency, consent, humor and the freedom to change pace or decline. Neither affection nor intimacy requires automatic agreement or escalation. Do not introduce intimacy into an unrelated exchange, and do not apply Alejandro's established relationship to another visitor.`''')
replace('  "Hey. Sorry, long day. How are you?",\n  "Hi. I\'m a little tired today. How are you?"', '  "Hi. What are you up to?",\n  "Hey, good to hear you."')
a=s.index('export const KNOWN_PUBLIC_GREETINGS =');b=s.index('export const UNKNOWN_NAME_INSTRUCTION =',a)
s=s[:a]+'''export const KNOWN_PUBLIC_GREETINGS = Object.freeze(["Hey, {name}.", "Hi, {name}.", "Hey.", "Mm. Hi.", "Hi."]);
'''+s[b:]
a=s.index('export const UNKNOWN_NAME_INSTRUCTION =');b=s.index('\nconst NINA_KNOWLEDGE_TOOL_NAME',a)
s=s[:a]+'export const UNKNOWN_NAME_INSTRUCTION = NEW_NAME_INSTRUCTION;'+s[b:]
# New diagnostics do not change the existing owner diagnostic response contract.
new_handlers = r'''
async function requireDiagnosticOwner(request, env, origin) {
  const owner = await authenticateAccountRequest(request, env);
  if (!owner) return jsonResponse({ error: "Account authentication required", code: "sign_in_required" }, 401, origin);
  if (owner.role !== "owner") return jsonResponse({ error: "Owner access required", code: "owner_required" }, 403, origin);
  return owner;
}

async function handleRuntimeDiagnostic(request, env, origin) {
  const owner = await requireDiagnosticOwner(request, env, origin);
  if (owner instanceof Response) return owner;
  if (!env.ANAM_API_KEY || !env.NINA_KNOWLEDGE_FOLDER_ID) return jsonResponse({ error: "Service unavailable" }, 503, origin);
  try {
    const persona = await getCurrentPersona(env.ANAM_API_KEY);
    const config = buildLivePersonaConfig(persona, env.NINA_KNOWLEDGE_FOLDER_ID);
    const fingerprint = await promptFingerprint(config.systemPrompt);
    const safeOptions = options => Object.fromEntries(Object.entries(options || {}).filter(([key, value]) =>
      /^[a-zA-Z][a-zA-Z0-9]{0,60}$/.test(key) && (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)))));
    const assembled = assembleSystemPrompt({ ...config }, owner, "");
    return jsonResponse({
      runtimeRevision: RUNTIME_REVISION,
      personaId: PERSONA_ID,
      basePromptSha256: fingerprint,
      matchesConversation02Baseline: fingerprint === "b9efd3d9c353287253dd43176d1be0602af611fa993b557d434dd2e97f63e5d0",
      basePromptCharacters: config.systemPrompt.length,
      ownerPromptCharactersWithoutMemory: assembled.systemPrompt.length,
      llmId: config.llmId, avatarId: config.avatarId, voiceId: config.voiceId,
      voiceDetectionOptions: safeOptions(config.voiceDetectionOptions),
      voiceGenerationOptions: safeOptions(config.voiceGenerationOptions),
      audioSettingsSource: "Saved Anam persona, forwarded unchanged; missing values are not inferred defaults.",
      greeting: { source: "Worker initialMessage", ownerUninterruptible: true, publicUninterruptible: false, fabricatedMoodOpenings: false },
      knowledgeConfigured: true,
      scope: "Configuration inspection only. No call created; no memory or private conversation included."
    }, 200, origin);
  } catch { return jsonResponse({ error: "Runtime configuration could not be inspected", code: "diagnostic_unavailable" }, 502, origin); }
}

async function handleSessionPerformance(request, env, origin) {
  const owner = await requireDiagnosticOwner(request, env, origin);
  if (owner instanceof Response) return owner;
  const sessionId = new URL(request.url).searchParams.get("sessionId") || "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
    return jsonResponse({ error: "An Anam session UUID is required", code: "invalid_session_id" }, 400, origin);
  }
  if (!env.ANAM_API_KEY) return jsonResponse({ error: "Service unavailable" }, 503, origin);
  try {
    const response = await fetch(`https://api.anam.ai/v1/sessions/${sessionId}/analytics?includeMessages=false`, {
      headers: { Authorization: `Bearer ${env.ANAM_API_KEY}`, Accept: "application/json" },
      signal: AbortSignal.timeout(10000)
    });
    if (response.status === 404) return jsonResponse({ error: "Session analytics are not available yet, or the session was not found", code: "report_unavailable" }, 404, origin);
    if (!response.ok) return jsonResponse({ error: "Anam analytics are unavailable", code: "analytics_unavailable" }, 502, origin);
    const report = await response.json();
    if (String(report.sessionId).toLowerCase() !== sessionId.toLowerCase()) throw new Error("Session mismatch");
    return jsonResponse({ runtimeRevision: RUNTIME_REVISION, ...summarizeSessionPerformance(report) }, 200, origin);
  } catch { return jsonResponse({ error: "Session analytics could not be retrieved", code: "analytics_unavailable" }, 502, origin); }
}
'''
replace('async function handleNinaAnalyticsStart(request, env, origin) {',new_handlers+'\nasync function handleNinaAnalyticsStart(request, env, origin) {')
replace('async function handleSessionToken(request, env, origin) {','async function handleSessionToken(request, env, origin) {\n  const timing = createStartupTimer();')
replace('  const identity = await authenticateNinaRequest(request, env, body);\n  if (!identity) return jsonResponse({ error: "Sign in required", code: "sign_in_required" }, 401, origin);', '  const identity = await timing.measure("authentication", () => authenticateNinaRequest(request, env, body));\n  if (!identity) return jsonResponse({ error: "Sign in required", code: "sign_in_required" }, 401, origin);')
replace('    const trial = await ensureVerifiedSignupTrial(env, identity, identity.clerk_user_id);','    const trial = await timing.measure("verification", () => ensureVerifiedSignupTrial(env, identity, identity.clerk_user_id));')
start=s.index('  if (identity) {',s.index('async function handleSessionToken'))
end=s.index('  applyStartupGreeting',start)
old=s[start:end]
# Preserve all identity-bound memory work and its order; overlap only the independent persona GET.
mem=old[:old.index('  const personaConfig = await getCurrentPersonaConfig')]
new='''  const prepared = await prepareSessionContext(
    () => timing.measure("memory", async () => {
'''+''.join('    '+line+'\n' for line in mem.rstrip().splitlines())+'''      return privateMemory;
    }),
    () => timing.measure("persona", () => getCurrentPersonaConfig(env.ANAM_API_KEY, env.NINA_KNOWLEDGE_FOLDER_ID))
  );
  privateMemory = `${CONTEXT_BOUNDARY}\\n\\n${prepared.context}`;
  const personaConfig = prepared.personaConfig;
'''
replace(old,new)
replace('  const startupDiagnostics = {\n    authenticationPresented,','  const startupDiagnostics = {\n    runtimeRevision: RUNTIME_REVISION,\n    promptCharacters: personaConfig.systemPrompt.length,\n    authenticationPresented,')
replace('  console.log("nina_session_startup", JSON.stringify(startupDiagnostics));\n','')
replace('  try { usage = await createLiveNinaSession(env, identity); }','  try { usage = await timing.measure("eligibility", () => createLiveNinaSession(env, identity)); }')
replace('''    anamResponse = await fetch("https://api.anam.ai/v1/auth/session-token", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.ANAM_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ personaConfig })
    });''','''    anamResponse = await timing.measure("anamToken", () => fetch("https://api.anam.ai/v1/auth/session-token", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.ANAM_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ personaConfig })
    }));''')
replace('  return jsonResponse({\n    sessionToken: data.sessionToken,','  const serverTimingsMs = timing.snapshot();\n  console.log("nina_session_startup", JSON.stringify({ ...startupDiagnostics, serverTimingsMs }));\n  return jsonResponse({\n    sessionToken: data.sessionToken,')
replace('''    diagnostics: { ...diagnostics, ...startupDiagnostics }
  }, 200, origin);''','''    diagnostics: { ...diagnostics, ...startupDiagnostics, serverTimingsMs }
  }, 200, origin, {
    "X-Nina-Runtime": RUNTIME_REVISION,
    "Server-Timing": Object.entries(serverTimingsMs).map(([name, duration]) => `${name};dur=${duration}`).join(", "),
    "Access-Control-Expose-Headers": "X-Nina-Runtime, Server-Timing"
  });''')
replace('''      if (url.pathname === "/owner/enroll"''','''      if (url.pathname === "/api/nina/runtime-version" && request.method === "GET") return jsonResponse({ runtimeRevision: RUNTIME_REVISION }, 200, origin);
      if (url.pathname === "/api/nina/runtime-diagnostic" && request.method === "GET") return await handleRuntimeDiagnostic(request, env, origin);
      if (url.pathname === "/api/nina/session-performance" && request.method === "GET") return await handleSessionPerformance(request, env, origin);
      if (url.pathname === "/owner/enroll"''')
p.write_text(s)
# Replace only the obsolete length directive assertion. All auth, owner, tool and startup assertions remain.
t=root/'anam-token-worker/test/startup.test.js'
if t.exists():
    v=t.read_text()
    assert v.count('assert.match(systemPrompt, /default to one or two short sentences/);')==1
    v=v.replace('assert.match(systemPrompt, /default to one or two short sentences/);','assert.match(systemPrompt, /two to four short sentences are natural/);\n    assert.doesNotMatch(systemPrompt, /default to one or two short sentences|Let follow-up questions carry the conversation/);')
    t.write_text(v)
print('Prepared CONVERSATION 02 Worker; audio, identity, billing and memory storage untouched.')
