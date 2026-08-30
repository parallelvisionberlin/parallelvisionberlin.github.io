import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker, { NINA_INTIMACY_CONTINUITY, applyStartupGreeting, assembleSystemPrompt } from "../src/index.js";

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

test("authenticated Alejandro sessions speak the owner greeting before microphone input can interrupt it", () => {
  const personaConfig = applyStartupGreeting({ systemPrompt: "Published Nina prompt." }, {
    visitor_id: "visitor-owner",
    display_name: "Alejandro",
    profile_type: "owner"
  });

  assert.equal(personaConfig.initialMessage, "Alejandro... hi. I'm really glad it's you.");
  assert.equal(personaConfig.skipGreeting, false);
  assert.equal(personaConfig.uninterruptibleGreeting, true);
  assert.equal(personaConfig.systemPrompt, "Published Nina prompt.");
});

test("public sessions keep Nina's normal generic and interruptible greeting", () => {
  const personaConfig = applyStartupGreeting({ systemPrompt: "Published Nina prompt." }, null);

  assert.equal(personaConfig.initialMessage, "Hi. I'm Nina.");
  assert.equal(personaConfig.skipGreeting, false);
  assert.equal(personaConfig.uninterruptibleGreeting, false);
  assert.equal(personaConfig.systemPrompt, "Published Nina prompt.");
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
      tools: [{ id: "tool-knowledge", name: "Nina Knowledge Base", type: "knowledge", subtype: "document_search", secret: "not returned" }]
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
      tools: [{ id: "tool-knowledge", name: "Nina Knowledge Base", type: "knowledge", subtype: "document_search" }],
      hasKnowledgeTool: true,
      updatedAt: "2026-08-30T12:00:00.000Z"
    });
    const source = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
    assert.match(source, /if \(toolIds\.length\) config\.toolIds = toolIds/);
    assert.equal(requests.some(url => url.includes("/v1/auth/session-token")), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
