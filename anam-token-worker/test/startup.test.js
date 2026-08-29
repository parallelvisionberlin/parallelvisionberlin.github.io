import assert from "node:assert/strict";
import test from "node:test";
import { NINA_INTIMACY_CONTINUITY, applyStartupGreeting, assembleSystemPrompt } from "../src/index.js";

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
