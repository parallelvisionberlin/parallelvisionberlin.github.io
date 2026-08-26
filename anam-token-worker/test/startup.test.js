import assert from "node:assert/strict";
import test from "node:test";
import { applyStartupGreeting } from "../src/index.js";

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
