import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";
import { MetaCapiError, NINA_META_EVENT_NAMES, sendNinaMetaEvent } from "../src/meta-capi.js";

test("Meta CAPI allowlist contains only the five Nina funnel events", () => {
  assert.deepEqual([...NINA_META_EVENT_NAMES], [
    "TalkToNinaClicked", "NinaAuthModalOpened", "NinaSignupStarted", "NinaAuthCompleted", "TalkToNina"
  ]);
});

test("Meta CAPI sends the approved Nina event shape without raw email", async () => {
  let outgoing;
  const result = await sendNinaMetaEvent({ META_CAPI_ACCESS_TOKEN: "secret-token" }, {
    eventName: "TalkToNina",
    eventSourceUrl: "https://parallelvisionlabel.com/nina-project.html",
    clientUserAgent: "Test browser",
    clientIpAddress: "203.0.113.10",
    fbp: "fb.1.123.456",
    fbc: "fb.1.123.click",
    testEventCode: "TEST14543",
    email: " Nina@Example.com "
  }, async (url, options) => {
    outgoing = { url, options };
    return new Response("{}", { status: 200 });
  });
  assert.deepEqual(result, { accepted: true });
  assert.equal(outgoing.url, "https://graph.facebook.com/v25.0/1746851780072706/events");
  assert.equal(outgoing.options.headers.Authorization, "Bearer secret-token");
  const payload = JSON.parse(outgoing.options.body);
  assert.equal(payload.data.length, 1);
  assert.equal(payload.test_event_code, "TEST14543");
  assert.deepEqual({ ...payload.data[0], event_time: 0 }, {
    event_name: "TalkToNina",
    event_time: 0,
    action_source: "website",
    event_source_url: "https://parallelvisionlabel.com/nina-project.html",
    user_data: {
      client_user_agent: "Test browser",
      client_ip_address: "203.0.113.10",
      fbp: "fb.1.123.456",
      fbc: "fb.1.123.click",
      em: ["cec43edb6a1681336ab87fa21ea576e83450826e3cc05f2ca73128e7fd69745f"]
    }
  });
  assert.doesNotMatch(outgoing.options.body, /Nina@Example\.com/i);
  assert.doesNotMatch(outgoing.url + outgoing.options.body, /secret-token/);
});

test("Meta CAPI rejects non-allowlisted events and requires its Worker secret", async () => {
  await assert.rejects(() => sendNinaMetaEvent({ META_CAPI_ACCESS_TOKEN: "secret" }, {
    eventName: "Purchase", eventSourceUrl: "https://parallelvisionlabel.com/"
  }), error => error instanceof MetaCapiError && error.code === "invalid_event_name");
  await assert.rejects(() => sendNinaMetaEvent({}, {
    eventName: "TalkToNinaClicked", eventSourceUrl: "https://parallelvisionlabel.com/"
  }), error => error instanceof MetaCapiError && error.code === "meta_capi_unavailable");
});

test("Meta endpoint reuses origin protection and forwards guest request metadata", async () => {
  const originalFetch = globalThis.fetch;
  let outgoing;
  globalThis.fetch = async (url, options) => {
    outgoing = { url: String(url), options };
    return new Response("{}", { status: 200 });
  };
  try {
    const response = await worker.fetch(new Request("https://worker.example/api/nina/meta-event", {
      method: "POST",
      headers: {
        Origin: "https://parallelvisionlabel.com",
        "Content-Type": "application/json",
        "User-Agent": "Test browser",
        "CF-Connecting-IP": "203.0.113.10"
      },
      body: JSON.stringify({
        eventName: "NinaAuthModalOpened",
        eventSourceUrl: "https://parallelvisionlabel.com/nina-project.html",
        testEventCode: "TEST14543"
      })
    }), { META_CAPI_ACCESS_TOKEN: "secret-token" }, { waitUntil() {} });
    assert.equal(response.status, 202);
    const payload = JSON.parse(outgoing.options.body);
    assert.equal(payload.data[0].event_name, "NinaAuthModalOpened");
    assert.equal(payload.test_event_code, "TEST14543");

    const rejected = await worker.fetch(new Request("https://worker.example/api/nina/meta-event", {
      method: "POST",
      headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
      body: JSON.stringify({ eventName: "TalkToNinaClicked", eventSourceUrl: "https://evil.example/" })
    }), { META_CAPI_ACCESS_TOKEN: "secret-token" }, { waitUntil() {} });
    assert.equal(rejected.status, 403);
  } finally { globalThis.fetch = originalFetch; }
});
