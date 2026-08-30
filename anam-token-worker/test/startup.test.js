import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker, {
  KNOWN_PUBLIC_GREETINGS, NINA_INTIMACY_CONTINUITY, OWNER_GREETINGS, UNKNOWN_NAME_INSTRUCTION, UNKNOWN_PUBLIC_GREETINGS,
  applyStartupGreeting, assembleSystemPrompt, authenticatedMemoryDisplayName, buildLivePersonaConfig, buildPersonaDiagnostic,
  schedulePreferredNameLearning, unknownNameInstruction
} from "../src/index.js";

const encode = value => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");

async function diagnosticAuthFixture(origin) {
  const keys = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", keys.publicKey);
  jwk.kid = "persona-diagnostic-key";
  const issuer = "https://persona-diagnostic.clerk.accounts.dev";
  return {
    issuer, jwk,
    async token(subject) {
      const header = encode({ alg: "RS256", typ: "JWT", kid: jwk.kid });
      const now = Math.floor(Date.now() / 1000);
      const payload = encode({ iss: issuer, sub: subject, azp: origin, iat: now, nbf: now, exp: now + 300 });
      const input = `${header}.${payload}`;
      const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, new TextEncoder().encode(input));
      return `${input}.${Buffer.from(signature).toString("base64url")}`;
    }
  };
}

test("authenticated Alejandro sessions use only approved uninterruptible owner greetings", () => {
  assert.equal(OWNER_GREETINGS.length, 12);
  for (let index = 0; index < 100; index += 1) {
    const personaConfig = applyStartupGreeting({ systemPrompt: "Published Nina prompt." }, {
      visitor_id: "visitor-owner", display_name: "Alejandro", profile_type: "owner"
    });
    assert.equal(OWNER_GREETINGS.includes(personaConfig.initialMessage), true);
    assert.equal(personaConfig.skipGreeting, false);
    assert.equal(personaConfig.uninterruptibleGreeting, true);
    assert.equal(personaConfig.systemPrompt, "Published Nina prompt.");
  }
});

test("unknown public users receive only approved simple interruptible greetings", () => {
  for (let index = 0; index < UNKNOWN_PUBLIC_GREETINGS.length; index += 1) {
    const personaConfig = applyStartupGreeting({ systemPrompt: "Published Nina prompt." }, null, "", () => index / UNKNOWN_PUBLIC_GREETINGS.length);
    assert.equal(UNKNOWN_PUBLIC_GREETINGS.includes(personaConfig.initialMessage), true);
    assert.equal(personaConfig.skipGreeting, false);
    assert.equal(personaConfig.uninterruptibleGreeting, false);
    assert.equal(personaConfig.systemPrompt, "Published Nina prompt.");
  }
});

test("known public users receive approved interruptible greetings with sanitized optional name interpolation", () => {
  for (let index = 0; index < KNOWN_PUBLIC_GREETINGS.length; index += 1) {
    const personaConfig = applyStartupGreeting({ systemPrompt: "Published Nina prompt." }, null, "  Vlád<script>  ", () => index / KNOWN_PUBLIC_GREETINGS.length);
    const expected = KNOWN_PUBLIC_GREETINGS[index].replace("{name}", "Vlád script");
    assert.equal(personaConfig.initialMessage, expected);
    assert.equal(personaConfig.uninterruptibleGreeting, false);
  }
});

test("unknown-name instruction exists only for authenticated non-owner users without a learned name", () => {
  assert.equal(unknownNameInstruction({ account_authenticated: true, role: "user", preferred_name: "" }), UNKNOWN_NAME_INSTRUCTION);
  assert.equal(unknownNameInstruction({ account_authenticated: true, role: "user", preferred_name: "Vlad" }), "");
  assert.equal(unknownNameInstruction({ account_authenticated: true, role: "owner", preferred_name: "" }), "");
  assert.equal(unknownNameInstruction({ account_authenticated: false, role: "user", preferred_name: "" }), "");
});

test("account display name alone never becomes Nina's conversational preferred name", () => {
  assert.equal(authenticatedMemoryDisplayName({ role: "user", display_name: "ClerkUsername" }, ""), "Visitor");
  assert.equal(authenticatedMemoryDisplayName({ role: "user", display_name: "ClerkUsername" }, "Vlad"), "Vlad");
  assert.equal(authenticatedMemoryDisplayName({ role: "owner", display_name: "Alejandro" }, ""), "Alejandro");
});

test("completed authenticated public conversations schedule preferred-name learning only once", async () => {
  const scheduled = [], calls = [];
  const ctx = { waitUntil(promise) { scheduled.push(promise); } };
  const identity = { account_authenticated: true, role: "user", user_id: "user-1", visitor_id: "visitor-1" };
  const learner = async (...args) => { calls.push(args); return { updated: true, preferredName: "Vlad" }; };
  assert.equal(schedulePreferredNameLearning(ctx, { marker: "env" }, identity, "conversation-1", true, learner), true);
  assert.equal(schedulePreferredNameLearning(ctx, {}, identity, "conversation-1", false, learner), false);
  assert.equal(schedulePreferredNameLearning(ctx, {}, { ...identity, role: "owner" }, "conversation-1", true, learner), false);
  await Promise.all(scheduled);
  assert.deepEqual(calls[0].slice(1), ["user-1", "visitor-1", "conversation-1"]);
  assert.equal(calls.length, 1);
});

test("system prompt assembly adds intimacy continuity exactly once before owner and private context", () => {
  const basePrompt = "Published Nina prompt.";
  const privateMemory = "Private memory and relationship context.";
  const publicConfig = assembleSystemPrompt({ systemPrompt: basePrompt }, null, privateMemory);
  const ownerConfig = assembleSystemPrompt({ systemPrompt: basePrompt }, { visitor_id: "visitor-owner" }, privateMemory);

  for (const systemPrompt of [publicConfig.systemPrompt, ownerConfig.systemPrompt]) {
    assert.equal(systemPrompt.split(NINA_INTIMACY_CONTINUITY).length - 1, 1);
    assert.ok(systemPrompt.startsWith(`${basePrompt}\n\n${NINA_INTIMACY_CONTINUITY}`));
    assert.ok(systemPrompt.endsWith(privateMemory));
  }

  assert.equal(publicConfig.systemPrompt, [basePrompt, NINA_INTIMACY_CONTINUITY, privateMemory].join("\n\n"));
  assert.ok(ownerConfig.systemPrompt.indexOf(NINA_INTIMACY_CONTINUITY) < ownerConfig.systemPrompt.indexOf("The current visitor is Alejandro"));
  assert.ok(ownerConfig.systemPrompt.indexOf("The current visitor is Alejandro") < ownerConfig.systemPrompt.indexOf(privateMemory));
});

test("persona diagnostic is owner-only, sanitized and never creates a Live Nina session", async () => {
  const origin = "http://127.0.0.1:4173";
  const auth = await diagnosticAuthFixture(origin);
  const users = {
    user_owner: { id: "owner-1", auth_subject: "user_owner", display_name: "Alejandro", role: "owner", memory_visitor_id: "owner-1" },
    user_member: { id: "member-1", auth_subject: "user_member", display_name: "Member", role: "user", memory_visitor_id: "member-1" }
  };
  const env = {
    ANAM_API_KEY: "anam-secret",
    NINA_KNOWLEDGE_FOLDER_ID: "knowledge-folder-1",
    CLERK_ISSUER: auth.issuer,
    NINA_MEMORY_DB: { prepare() { return { bind(subject) { return { first: async () => users[subject] || null }; } }; } }
  };
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    requests.push(String(url));
    if (String(url).includes("/.well-known/jwks.json")) return new Response(JSON.stringify({ keys: [auth.jwk] }));
    if (String(url).includes("/v1/personas/")) return new Response(JSON.stringify({
      id: "persona-nina",
      name: "Nina FOK", llmId: "current-llm", brain: { systemPrompt: "Current published prompt." },
      updatedAt: "2026-08-30T12:00:00.000Z", avatar: { id: "private-avatar" }, internal: "not returned",
      tools: [],
      knowledge: [{ id: "knowledge-1", name: "Nina PDFs", secret: "not returned", documents: [
        { id: "document-1", fileName: "nina-canon.pdf", content: "not returned" }
      ] }]
    }));
    throw new Error(`Unexpected fetch: ${url}`);
  };
  const request = async token => worker.fetch(new Request("https://worker.example/api/nina/persona-diagnostic", {
    headers: { Origin: origin, Authorization: `Bearer ${token}` }
  }), env, { waitUntil() {} });
  try {
    const memberResponse = await request(await auth.token("user_member"));
    assert.equal(memberResponse.status, 403);
    assert.equal((await memberResponse.json()).code, "owner_required");

    const ownerResponse = await request(await auth.token("user_owner"));
    assert.equal(ownerResponse.status, 200);
    assert.deepEqual(await ownerResponse.json(), {
      personaId: "persona-nina",
      name: "Nina FOK", llmId: "current-llm", brain: { systemPrompt: "Current published prompt." },
      topLevelFieldNames: ["avatar", "brain", "id", "internal", "knowledge", "llmId", "name", "tools", "updatedAt"],
      brainKnowledgeFieldNames: [],
      tools: [],
      knowledge: [{
        fieldNames: ["documents", "id", "name", "secret"], id: "knowledge-1", name: "Nina PDFs", type: "", documentCount: 1,
        documents: [{ id: "document-1", name: "nina-canon.pdf" }]
      }],
      hasKnowledgeTool: true,
      hasKnowledge: true,
      knowledgeAttachmentSource: "persona.knowledge",
      liveSessionKnowledge: {
        configured: true, hasKnowledgeTool: true, source: "worker.personaConfig.tools",
        toolName: "nina_knowledge", documentFolderIds: ["knowledge-folder-1"]
      },
      updatedAt: "2026-08-30T12:00:00.000Z"
    });
    const source = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
    assert.match(source, /if \(toolIds\.length\) config\.toolIds = toolIds/);
    assert.equal(requests.some(url => url.includes("/v1/auth/session-token")), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("persona diagnostic safely reports when knowledge metadata is absent", () => {
  const diagnostic = buildPersonaDiagnostic({ id: "persona-1", brain: { systemPrompt: "Prompt." }, tools: [] });
  assert.equal(diagnostic.hasKnowledgeTool, false);
  assert.equal(diagnostic.hasKnowledge, false);
  assert.equal(diagnostic.knowledgeAttachmentSource, "not_exposed_in_persona_api");
  assert.deepEqual(diagnostic.knowledge, []);
  assert.deepEqual(diagnostic.liveSessionKnowledge, {
    configured: false, hasKnowledgeTool: false, source: "missing_configuration", toolName: "", documentFolderIds: []
  });
});

test("live persona config injects exactly one configured knowledge tool and preserves non-knowledge tools", () => {
  const config = buildLivePersonaConfig({
    avatar: { id: "avatar-1" }, voice: { id: "voice-1" }, llmId: "gpt-5-chat", brain: { systemPrompt: "Published prompt." },
    tools: [
      { id: "tool-weather", name: "Weather", type: "client", subtype: "weather" },
      { id: "old-knowledge", name: "Old Knowledge", type: "server", subtype: "knowledge" }
    ]
  }, "existing-folder-id");
  assert.equal(config.avatarId, "avatar-1");
  assert.equal(config.voiceId, "voice-1");
  assert.equal(config.llmId, "gpt-5-chat");
  assert.equal(config.systemPrompt, "Published prompt.");
  assert.deepEqual(config.toolIds, ["tool-weather"]);
  assert.deepEqual(config.tools, [{
    type: "server", subtype: "knowledge", name: "nina_knowledge",
    description: "Search for established facts about Nina, named people, projects, Parallel Vision, Berlin 2063, releases, events and canon.",
    documentFolderIds: ["existing-folder-id"]
  }]);
});

test("live persona config fails safely when the knowledge folder is missing", () => {
  assert.throws(() => buildLivePersonaConfig({ avatar: { id: "avatar-1" }, voice: { id: "voice-1" }, llmId: "llm-1" }, ""),
    /NINA_KNOWLEDGE_FOLDER_ID is required/);
});

test("session endpoint does not create an Anam session when knowledge configuration is missing", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (...args) => { requests.push(args); throw new Error("must not fetch"); };
  try {
    const response = await worker.fetch(new Request("https://worker.example/session-token", {
      method: "POST", headers: { Origin: "http://127.0.0.1:4173", "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: "visitor-test" })
    }), { ANAM_API_KEY: "anam-secret" }, { waitUntil() {} });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "knowledge_configuration_missing");
    assert.equal(requests.length, 0);
  } finally { globalThis.fetch = originalFetch; }
});
